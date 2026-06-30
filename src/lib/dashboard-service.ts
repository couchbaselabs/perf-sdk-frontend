// PRESERVED NESTJS COMMENTS: Main dashboard service handling all performance data queries.
// This service mirrors the NestJS DashboardService functionality exactly, including:
// - Graph generation for both simplified (bar) and full (line) charts  
// - Single run analysis with detailed metrics
// - Situational run handling for grouped test executions
// - Error summary and metrics alerts generation
// All business logic, filtering, and data transformation preserved from NestJS implementation.

import {
  DatabaseService,
  Result,
  Run,
  RunEvent,
  RunPlus,
  SituationalRun,
  SituationalRunResults
} from './database-service';
import { 
  Filtered,
  Input,
  Single,
  MetricsQuery,
  Metrics,
  ErrorSummary,
  SituationalRunQuery,
  SituationalRunAndRunQuery,
  GraphType,
  FilterRuns,
  HorizontalAxisDynamic,
  VerticalAxisBucketsColumn,
  VerticalAxisMetric,
  VerticalAxisMetrics,
  VerticalAxisErrors,
  ResultType,
  AnnotationsRunEvents,
  YAxis
} from './dashboard/dashboard-query-types';
import { versionCompare, ShadeProvider, classifyVersion, isMovingVersion, isMoreRecentVersion } from './core-ui-utilities';
import { v4 as uuidv4 } from 'uuid';

// Import consolidated utilities
import { HorizontalAxisDynamicUtil } from './dashboard/axis';
import { DashboardMappers } from './dashboard/mappers';

// Helper functions for creating dashboard inputs (moved from dashboard-client.ts)
// Import centralized cluster configuration to eliminate duplication
import { DEFAULT_CLUSTER } from '@/src/lib/config/defaults'

// Import the corrected constants from the centralized location
import { 
  DEFAULT_VARS_WITHOUT_HORIZONTAL_SCALING,
  DEFAULT_QUERY_VARS,
  DEFAULT_WORKLOAD_GET,
  DEFAULT_WORKLOAD_REPLACE,
  DEFAULT_WORKLOAD_INSERT
} from './dashboard/queries'

import { logger } from '@/src/lib/utils/logger'

// Input builder functions moved to lib/dashboard/queries.ts
// Re-export them for backward compatibility  
export { 
  createKVOperationInput, 
  createSystemMetricInput, 
  createHorizontalScalingInput
} from './dashboard/queries'
export type { DashboardInput } from './dashboard/queries'


export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  // "Exclude snapshots" hides the noisy legacy per-commit builds ("3.8.0-<sha>"),
  // which classify as `release` but carry a "-<timestamp+sha>" suffix. Gerrit/PR
  // and on-demand builds also contain "-" but have their own toggle, and moving
  // tags (main, 3.11.x) are headline bars shown regardless of this toggle, so
  // restrict the snapshot toggle to release-kind versions only.
  private passesExclusions(run: Run, input: Input): boolean {
    const version = run.impl["version"] as string
    const kind = classifyVersion(version)
    if (input.excludeGerrit && kind === 'gerrit') return false
    const isLegacySnapshot = kind === 'release' && version.includes("-")
    if (input.excludeSnapshots && isLegacySnapshot) return false
    return true
  }

  // For a LATEST query, the single version to keep per SDK. Defaults to the
  // newest release (see isMoreRecentVersion), but an explicit selectedVersion
  // pins the choice when that version actually has matching runs.
  private resolveLatestVersions(runs: Run[], input: Input): Map<string, string> {
    const latest = new Map<string, string>()
    if (input.filterRuns != FilterRuns.LATEST && input.filterRuns != FilterRuns.LATEST_NON_SNAPSHOT) {
      return latest
    }

    for (const run of runs) {
      const sdk = run.impl["language"] as string
      const version = run.impl["version"] as string
      if (classifyVersion(version) === 'gerrit') continue
      const isSnapshot = isMovingVersion(version) || version.includes("-")
      if (isSnapshot && input.filterRuns == FilterRuns.LATEST_NON_SNAPSHOT) continue

      const current = latest.get(sdk)
      if (current === undefined || isMoreRecentVersion(version, current)) {
        latest.set(sdk, version)
      }
    }

    const pinned = input.selectedVersion
    if (pinned) {
      runs.forEach(run => {
        if ((run.impl["version"] as string) === pinned && this.passesExclusions(run, input)) {
          latest.set(run.impl["language"] as string, pinned)
        }
      })
    }

    latest.forEach((version, sdk) => logger.info(`Latest for ${sdk} = ${version}`))
    return latest
  }

  // Moving tags (main, 3.11.x) overwrite their docker image on every build, so
  // runs accumulate under the same version. Keep only the newest run per logical
  // data point. The data point is language+version on version-grouped charts, but
  // also includes the grouping value (e.g. horizontalScaling) elsewhere so a
  // scaling chart keeps one run per scaling factor rather than collapsing to one.
  private collapseMovingRuns(runs: Run[], groupingField: string): Run[] {
    const latestMoving = new Map<string, Run>()
    for (const run of runs) {
      if (!isMovingVersion(run.impl["version"] as string)) continue
      const key = this.movingRunKey(run, groupingField)
      const existing = latestMoving.get(key)
      if (!existing || Date.parse(run.datetime) > Date.parse(existing.datetime)) {
        latestMoving.set(key, run)
      }
    }
    if (latestMoving.size === 0) return runs

    return runs.filter(run => {
      if (!isMovingVersion(run.impl["version"] as string)) return true
      return latestMoving.get(this.movingRunKey(run, groupingField)) === run
    })
  }

  private movingRunKey(run: Run, groupingField: string): string {
    const grouping = DashboardMappers.parseFrom(run.params, groupingField.split('.'))
    return `${run.impl["language"]}|${run.impl["version"]}|${grouping}`
  }

  private groupingField(input: Input): string {
    return input.hAxis?.type == 'dynamic'
      ? (input.hAxis as HorizontalAxisDynamic).databaseField
      : 'impl.version'
  }

  /**
   * Takes runs from the database and filters them against the requested Input.
   */
  private filterRuns(runs: Run[], input: Input): Run[] {
    const isLatest = input.filterRuns == FilterRuns.LATEST || input.filterRuns == FilterRuns.LATEST_NON_SNAPSHOT
    const latest = this.resolveLatestVersions(runs, input)

    const filtered = runs.filter(run => {
      if (!this.passesExclusions(run, input)) return false
      if (isLatest) {
        return latest.get(run.impl["language"] as string) == (run.impl["version"] as string)
      }
      return true
    })

    return this.collapseMovingRuns(filtered, this.groupingField(input))
  }

  // The versions a LATEST chart could display, newest first, alongside the one
  // currently selected. Used to populate the per-chart version dropdown. This is
  // the reverse of the X-axis order, so main and the newest releases sort first.
  private versionOptions(runs: Run[], input: Input): { availableVersions: string[], selectedVersion?: string } {
    if (input.filterRuns != FilterRuns.LATEST && input.filterRuns != FilterRuns.LATEST_NON_SNAPSHOT) {
      return { availableVersions: [] }
    }
    const distinct = new Set<string>()
    runs.forEach(run => {
      const version = run.impl["version"] as string
      if (classifyVersion(version) === 'gerrit') return
      if (this.passesExclusions(run, input)) distinct.add(version)
    })
    const availableVersions = Array.from(distinct).sort((a, b) => versionCompare(b, a))
    const selected = this.resolveLatestVersions(runs, input)
    const selectedVersion = selected.size > 0 ? Array.from(selected.values())[0] : undefined
    return { availableVersions, selectedVersion }
  }

  /**
   * Builds the Simplified bar graph
   */
  private async addGraphBar(input: Input): Promise<any> {
    const labels: string[] = [];
    const values: number[] = [];
    const runIds: string[][] = [];
    let runs: Run[];
    let matched: Run[] = [];
    let results: Result[] = [];

    if (input.hAxis.type == 'dynamic') {
      const ha = input.hAxis as HorizontalAxisDynamic;
      

      if (input.yAxes.length != 1) {
        throw Error("Only one yaxis dataset is supported on Simplified graphs")
      }

      const yAxis = input.yAxes[0];

      if (yAxis.type == 'buckets') {
        const va = yAxis as VerticalAxisBucketsColumn;
        const dbRep2 = HorizontalAxisDynamicUtil.databaseRepresentation2(ha)
        const dbRep1 = HorizontalAxisDynamicUtil.databaseRepresentation1(ha)

        // Select the matching runs first, then aggregate their buckets by an
        // explicit run-id list. The explicit list lets the planner use the
        // buckets run_id index; aggregating via a CTE join instead makes it
        // seq-scan the whole buckets hypertable (orders of magnitude slower on
        // high-volume workloads like KV get).
        const initial = await this.database.getRuns(input.databaseCompare, dbRep2)
        matched = initial
        runs = this.filterRuns(initial, input)
        logger.info(`Matched ${initial.length} runs, filtered to ${runs.length}`)

        const runIdsArray = runs.map((v) => v.id);
        if (runIdsArray.length > 0) {
          results = await this.database.getSimplifiedGraph(dbRep1, runIdsArray, input, va);
        }
      } else if (yAxis.type == 'metric') {
        const va = yAxis as VerticalAxisMetric;

        matched = await this.database.getRuns(input.databaseCompare, "{}",)
        runs = this.filterRuns(matched, input)

        logger.info(`Matched ${runs.length} runs`)

        const runIdsArray = runs.map((v) => v.id);

        if (runIdsArray.length > 0) {
          results = await this.database.getSimplifiedGraphForMetric(runIdsArray, ha, va, input);
        }
      }
      else {
        // Not all yAxes make sense in Simplified mode - e.g. displaying all metrics
        throw Error(`Unsupported yAxis type ${JSON.stringify(yAxis)}`)
      }
    }
    else {
      throw Error(`Unknown hAxis type ${input.hAxis}`)
    }

    // Enforce the canonical X-axis order for version groupings:
    // releases (semver) -> gerrit -> on-demand -> branch snapshot -> main.
    // Other groupings (e.g. horizontalScaling) are left untouched.
    const isVersionGrouping =
      input.hAxis.type == 'dynamic' &&
      (input.hAxis as HorizontalAxisDynamic).resultType == ResultType.VERSION_SEMVER;

    if (isVersionGrouping) {
      results.sort((a, b) => versionCompare(a.grouping, b.grouping));
    }

    // Attach performer-image metadata (params.impl.image) per grouping, using
    // the first matching run's image. Left undefined when no run carries it.
    if (runs!.length > 0) {
      const imageByVersion = new Map<string, Record<string, unknown>>();
      for (const run of runs!) {
        const version = run.impl?.["version"];
        const image = run.impl?.["image"];
        if (typeof version === "string" && image && typeof image === "object" && !imageByVersion.has(version)) {
          imageByVersion.set(version, image as Record<string, unknown>);
        }
      }
      if (imageByVersion.size > 0) {
        results.forEach((b) => {
          b.image = imageByVersion.get(b.grouping) ?? null;
        });
      }
    }

    results.forEach((b) => {
      labels.push(b.grouping);
      values.push(b.value);
      // Preserve pre-migration shape: an array of arrays, one per grouping
      if (Array.isArray(b.runIds)) {
        runIds.push(b.runIds);
      } else {
        runIds.push([]);
      }
    });

    const { availableVersions, selectedVersion } = this.versionOptions(matched, input)

    return {
      type: 'bar',
      runs: runs,
      chosen: JSON.stringify(input.databaseCompare),
      results: results,
      availableVersions,
      selectedVersion,
      data: {
        runIds: runIds,
        labels: labels,
        datasets: [
          {
            backgroundColor: '#D7ECD9',
            data: values,
          },
        ],
      },
    };
  }

  /**
   * Builds the Full line graph for multiple runs.
   */
  private async addGraphLine(input: Input): Promise<any> {
    if (input.hAxis.type == 'dynamic') {
      const ha = input.hAxis as HorizontalAxisDynamic;

      const runs = this.filterRuns(await this.database.getRuns(
          input.databaseCompare,
          HorizontalAxisDynamicUtil.databaseRepresentation2(ha),
      ), input);

      return this.addGraphLineShared(runs, input);
    }
    else {
      throw Error(`Unknown hAxis type ${input.hAxis}`)
    }
  }

  /**
   * Builds the Full line graph for a single run.
   */
  private async addGraphLineSingle(
      input: Single,
  ): Promise<any> {
    const runs = await this.database.getRunsById([input.runId]);
    if (runs.length === 0) {
      // Throw an error to indicate that the request cannot be fulfilled
      throw Error(`Run with ID ${input.runId} not found.`);
    }
    const i: Input = {
      ...input,
      hAxis: {
        type: "dynamic",
        databaseField: "impl.version",
        resultType: ResultType.VERSION_SEMVER
      },
      graphType: GraphType.FULL,
      databaseCompare: {} as any,
      excludeGerrit: false,
      excludeSnapshots: false,
      filterRuns: FilterRuns.ALL,
      multipleResultsHandling: undefined as any
    }

    return this.addGraphLineShared(runs, i)
  }

  /**
   * Builds the Full line graph for both multiple runs, and single.
   */
  private async addGraphLineShared(
    runs: Array<Run>,
    input: Input
  ): Promise<any> {
    let datasets: any[] = [];
    const annotations = {};
    const sp = new ShadeProvider()
    let firstBucketTime: number | undefined = undefined

    if (input.hAxis.type == 'dynamic') {
      const ha = input.hAxis as HorizontalAxisDynamic;

      const runsPlus: Array<RunPlus> = runs.map((run: any) => {
        const groupedBy = ha.databaseField.split('.');
        run.groupedBy = DashboardMappers.parseFrom(run.params, groupedBy);
        run.color = sp.nextShade();
        return run;
      });

      const promiseArray = [];

      for (const yAxis of input.yAxes) {
        // Note this isn't the most efficient way of hitting the database, especially for the single-chart
        // display.  This will hit the database multiple times for the same run.  But, it's efficient
        // enough, and makes the logic easier to follow.
        if (yAxis.type == 'buckets') {
          const va = yAxis as VerticalAxisBucketsColumn;
          promiseArray.push(this.getVerticalAxisBucketsColumn(runsPlus, input, va, sp).then(ds => {
            firstBucketTime = (ds[0] as any)?.data[0]?.nested?.datetime
            logger.info("Found first bucket time", { firstBucketTime })
            ds.forEach(d => datasets.push(d))
          }))
        } else if (yAxis.type == "metric") {
            const metricAxis = yAxis as VerticalAxisMetric;
            promiseArray.push(this.getVerticalAxisMetrics(runsPlus, input, metricAxis, sp).then(ds =>
                datasets = [...datasets, ...ds]));
        } else if (yAxis.type == "errors") {
          const va = yAxis as VerticalAxisErrors;
          promiseArray.push(this.getVerticalAxisErrors(runsPlus, input, va, sp).then(ds =>
              ds.forEach(d => datasets.push(d))))
        } 
        else throw Error(`Unsupported yAxis type ${yAxis}`)
      }

      await Promise.all(promiseArray);

      for (const ann of input.annotations) {
        if (ann.type == 'run-events') {
          // Fetch events for all runs in parallel: one round-trip per run otherwise serializes against AWS latency.
          const eventsPerRun = await Promise.all(
            runs.map((run) => this.database.getEvents(run.id, firstBucketTime, true))
          )
          for (const events of eventsPerRun) {
            for (let i = 0; i < events.length; i++){
              const event = events[i];
              const x = event.timeOffsetSecs;

              (annotations as any)[uuidv4()] = {
                type: "line",
                label: {
                  display: true,
                  content: event.params.description ?? event.params.type,
                  yAdjust: i * 40
                },
                xMin: x,
                xMax: x
              }
            }
          }

        }
        else throw Error(`Unsupported annotation type ${JSON.stringify(ann)}`)
      }

      return {
        type: 'line',
        runs: runsPlus,
        data: {
          datasets: datasets,
          annotations: annotations,
        },
      };
    }
    else {
      throw Error(`Unknown hAxis type ${input.hAxis}`)
    }
  }

  private async getVerticalAxisBucketsColumn(runs: Array<RunPlus>,
                                             input: Input,
                                             va: VerticalAxisBucketsColumn,
                                             sp: ShadeProvider): Promise<Array<Record<string, unknown>>> {
    const runIds = runs.map((v) => v.id);
    const datasets = [];

    const runsWithBuckets = await this.database.getRunsWithBuckets(runIds, input, va.column, false, false);

    for (const run of runs) {
      const bucketsForRun = runsWithBuckets.filter((v) => v.runId == run.id);

      // logger.debug(`For run ${run.id} buckets ${bucketsForRun.length}`)

      const data: any[] = [];

      bucketsForRun.forEach((b) => {
        data.push({
          x: b.timeOffsetSecs,
          y: b.value,
          nested: {
            datetime: b.datetime,
            runid: b.runId,
          },
        });

      });

      datasets.push({
        yAxisID: va.yAxisID,
        label: run.groupedBy + " " + va.column,
        data: data,
        fill: false,
        borderColor: sp.nextShade(),
      });
    }

    return datasets;
  }

  private async getVerticalAxisErrors(runs: Array<RunPlus>,
                                      input: Input,
                                      va: VerticalAxisErrors,
                                      sp: ShadeProvider): Promise<Array<Record<string, unknown>>> {
    const runIds = runs.map((v) => v.id);
    const datasets = [];

    const runsWithBuckets = await this.database.getRunsWithBuckets(runIds, input, '', false, true);

    for (const run of runs) {
      const bucketsForRun = runsWithBuckets.filter((v) => v.runId == run.id);
      const data: any[] = [];

      bucketsForRun.forEach((b) => {
        let totalErrors = 0;
        if (b.errors) {
          Object.keys(b.errors).forEach(errorName => {
            const errorCount = (b.errors || {})[errorName] as number;
            totalErrors += errorCount;
          });
        }

        data.push({
          x: b.timeOffsetSecs,
          y: totalErrors,
          nested: {
            datetime: b.datetime,
            runid: b.runId,
            errors: b.errors || {}
          }
        });
      });

      datasets.push({
        yAxisID: va.yAxisID,
        label: run.groupedBy + " errors",
        data: data,
        fill: false,
        backgroundColor: '#e88873',
        borderColor: '#e88873',
      });
    }

    return datasets;
  }

  private async getVerticalAxisMetrics(runs: Array<RunPlus>,
    input: Input,
    va: VerticalAxisMetric,
    sp: ShadeProvider): Promise<Array<Record<string, unknown>>> {
    const runIds = runs.map((v) => v.id);
    const datasets = [];

    try {
      const metricsData = await this.database.getRunsWithMetrics(runIds, input, va.metric);
      
      for (const run of runs) {
        const metricsForRun = metricsData.filter((v) => v.runId === run.id);
        const data: any[] = [];

        // logger.debug(`Metrics for run ${run.id}: ${JSON.stringify(metricsForRun)}`)

        metricsForRun.forEach((m) => {
          // logger.debug(`Metric: ${JSON.stringify(m)}`)
          data.push({
            x: m.timeOffsetSecs,
            y: m.value,
            nested: {
              datetime: m.datetime,
              runid: m.runId,
            },
          });
        });

        if (data.length > 0) {
          datasets.push({
            yAxisID: va.yAxisID,
            label: `${run.groupedBy} ${va.metric}`,
            data: data,
            fill: false,
            borderColor: sp.nextShade(),
            pointRadius: 2,
            pointHoverRadius: 5,
            borderWidth: 2,
            source: { ...va, type: 'metric' }
          });
        }
      }

      return datasets;
    } catch (error) {
      return datasets;
    }
  }

  public async getFiltered(groupBy: string): Promise<Filtered> {
    const runs = await this.database.getRunsRaw();

    const clusters = new Set<string>();
    const impls = new Set<string>();
    const workloads = new Set<string>();
    const varsAll = new Set<string>();
    const varsByWorkload = new Map<string, Set<string>>();

    const groupBySplit = groupBy.split('.');

    runs.forEach((runRaw) => {
      const run = runRaw['params'] as Record<string, unknown>;

      DashboardMappers.removeDisplayByIfNeeded(run, groupBySplit);

      const cluster = JSON.stringify(run['cluster']);
      clusters.add(cluster);

      const impl = JSON.stringify(run['impl']);
      impls.add(impl);

      const workload = JSON.stringify(run['workload']);
      workloads.add(workload);

      const vars = JSON.stringify(run['vars']);
      varsAll.add(vars);
      if (!varsByWorkload.has(workload)) {
        varsByWorkload.set(workload, new Set([vars]));
      } else {
        varsByWorkload.get(workload)?.add(vars);
      }
    });

    return new Filtered(
      Array.from(clusters.values()),
      Array.from(workloads.values()),
      Array.from(impls.values()),
      Array.from(varsAll.values()),
      varsByWorkload,
    );
  }

  // parseFrom and removeDisplayByIfNeeded methods moved to DashboardMappers

  async getGroupBy(): Promise<Array<string>> {
    const runs = await this.database.getRunsRaw();
    const keys = new Set<string>();
    runs.forEach((run) => {
      const props = DashboardMappers.genStrings('', run['params'] as Record<string, unknown>);
      props.forEach((p) => keys.add(p));
    });
    return Array.from(keys.values());
  }

  // genStrings method moved to DashboardMappers

  public async genGraph(
    input: Input,
  ): Promise<any> {
    if (input.graphType == GraphType.SIMPLIFIED) {
      return await this.addGraphBar(input);
    } else {
      return await this.addGraphLine(input);
    }
  }

  public async genSingle(
      input: Single
  ) {
    return await this.addGraphLineSingle(input);
  }

  public async genMetrics(input: MetricsQuery) {
    let out: any[] = []
    const excessiveThreads = new Metrics("cast (metrics::json->>'threadCount' as integer) > 200",
        "'Excessive thread count, max=' || max (cast (metrics::json->>'threadCount' as integer))")
    const excessiveHeap = new Metrics("cast(metrics::json->>'memHeapUsedMB' as float) > 500",
        "'Excessive heap usage, max=' || max(cast(metrics::json->>'memHeapUsedMB' as float))")
    const excessiveProcessCpu = new Metrics("cast(metrics::json->>'processCpu' as float) > 90",
        "'Excessive process CPU usage, max=' || max(cast(metrics::json->>'processCpu' as float))")

    const anyFailures = new Metrics("operations_failed > 0",
        "'Operations failed, sum=' || sum(operations_failed)")

    // Run all alert queries in parallel: each is an independent DB round-trip to AWS.
    const alertResults = await Promise.all([
      this.database.getMetricsAlerts(input, excessiveThreads, "metrics"),
      this.database.getMetricsAlerts(input, excessiveHeap, "metrics"),
      this.database.getMetricsAlerts(input, excessiveProcessCpu, "metrics"),
      this.database.getMetricsAlerts(input, anyFailures, "buckets"),
    ])
    for (const result of alertResults) {
      out = out.concat(result)
    }

    logger.info(`${out.length} total alerts`)

    return out
  }

  public async genSituationalRuns(): Promise<SituationalRun[]> {
    return await this.database.getSituationalRuns()
  }

  public async genSituationalRun(input: SituationalRunQuery): Promise<SituationalRunResults> {
    return await this.database.getSituationalRun(input)
  }

  public async genSituationalRunRun(input: SituationalRunAndRunQuery): Promise<SituationalRunResults> {
    return await this.database.getSituationalRunRun(input)
  }

  public async genSituationalRunRunEvents(input: SituationalRunAndRunQuery): Promise<RunEvent[]> {
    return await this.database.getEvents(input.runId, undefined, false)
  }

  public async genSituationalRunRunErrorsSummary(input: SituationalRunAndRunQuery): Promise<ErrorSummary[]> {
    const events = await this.database.getEvents(input.runId, undefined, false)
    const errors = events.filter(event => event.params["type"] == "situation-sdk-error")
    const errorMap = new Map<string, [any, number]>()
    errors.forEach(error => {
      const name = error.params["name"] as string
      const v = errorMap.get(name)
      if (v != undefined) {
        v[1] += 1
      }
      else {
        errorMap.set(name, [error.params["exception"], 1])
      }
    })
    const out: ErrorSummary[] = []
    Array.from(errorMap.entries()).forEach(([key, value]) => {
      out.push(new ErrorSummary(value[0], value[1]))
    })
    return out
  }

  public async getAvailableMetrics(): Promise<string[]> {
    return await this.database.getAllMetricNames();
  }
}

