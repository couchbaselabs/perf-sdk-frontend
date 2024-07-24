import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  Result,
  Run,
  RunEvent,
  RunPlus,
  SituationalRun,
  SituationalRunResults
} from './database.service';
import { Filtered } from './app.controller';
import { versionCompare } from './versions';
import {ShadeProvider} from "./shade_provider";
import { v4 as uuidv4 } from 'uuid';

// Query for a single run
export class Single {
  readonly runId: string;
  readonly yAxes: Array<YAxis>;
  readonly trimmingSeconds: number;
  readonly mergingType: MergingAlgorithm;
  readonly bucketiseSeconds?: number;
  readonly annotations: Array<AnnotationsRunEvents>;
}

export class MetricsQuery {
  readonly language: string;
}

export class Metrics {
  // cast (metrics::json->>'threadCount' as integer) > 100
  readonly whereClause: string;
  // 'Excessive thread count, max=' || max (cast (metrics::json->>'threadCount' as integer))
  readonly message: string;

  constructor(whereClause: string, message: string) {
    this.whereClause = whereClause;
    this.message = message;
  }
}

export enum GraphType {
  // A bar chart, generally with an aggregated view of the bucketised data
  SIMPLIFIED = "Simplified",

  // A line chart, generally showing the raw bucketised data over time
  FULL = "Full"
}

// If in Simplified mode (bar chart) and we have multiple results for a particular bar, how to display them.
export enum MultipleResultsHandling {
  SIDE_BY_SIDE = "Side-by-Side",

  // How they are merged is controlled by MergingAlgorithm.
  MERGED = "Merged"
}

// If in Simplified mode (bar chart) and we have multiple results for a particular bar, and MultipleResultsHandling = MERGED,
// how do we actually merge them.
export enum MergingAlgorithm {
  AVERAGE = "Average",
  SUM = "Sum",
  MAXIMUM = "Maximum",
  MINIMUM = "Minimum"
}

// Any filtering that should be done on matched runs.
export enum FilterRuns {
  // Include all matched runs (no filtering).
  ALL = "All",

  // If the database returns results for 1.1.0, 1.1.1 and 1.1.2 for SDK A, and 3.0.3, 3.0.4 and 3.0.5 for SDK B,
  // will keep results for 1.1.2 for SDK A and 3.0.5 for SDK B.
  // It's based on the results for this particular input.  E.g. if the real current latest version of SDK A is 1.1.3,
  // will still keep results for 1.1.2.
  // Gerrit versions are automatically excluded.
  LATEST = "Latest",

  // Same as "Latest" except it will also ignore snapshot releases.
  LATEST_NON_SNAPSHOT = "LatestNonSnapshot"
}

type YAxis = VerticalAxisBucketsColumn | VerticalAxisMetric | VerticalAxisMetrics | VerticalAxisErrors;


// The main search class from the frontend.  There are a number of different graphs displayed and they are all
// represented through here.
export class Input {
  // What to display on the x-axis, e.g. SDK versions.
  readonly hAxis: HorizontalAxisDynamic;

  // What to display on the y-axis, e.g. operation duration or throughput.
  // This might be more correctly named "datasets" or similar.
  readonly yAxes: Array<YAxis>;

  // What runs to look for.  This will control what ends up on h-axis.
  readonly databaseCompare: DatabaseCompare;

  // Currently the whole graph is bar (simplified) or line (full) - we can't have different yAxes (datasets) displaying
  // different graph types.
  readonly graphType: GraphType;

  // These two only apply if graphType == SIMPLIFIED
  readonly multipleResultsHandling: MultipleResultsHandling;
  readonly mergingType: MergingAlgorithm;

  // How many seconds of data to trim off the start of each run, to account for e.g. JVM warmup and general settling.
  readonly trimmingSeconds: number;

  // It's too expensive to draw large line graphs of 1 second buckets, so re-bucketise into larger buckets if this is
  // set.
  readonly bucketiseSeconds?: number;

  // Whether to exclude interim/snapshot versions ("3.4.0-20221020.123751-26")
  readonly excludeSnapshots: boolean;

  // Whether to exclude Gerrit versions ("refs/changes/19/183619/30")
  readonly excludeGerrit: boolean;

  // Whether to filter matched runs.  The default is ALL (no filtering).
  readonly filterRuns: FilterRuns;

  // Annotations are lines, labels etc. that are overlaid on the chart.  They are only supported if graphType==FULL.
  readonly annotations: Array<AnnotationsRunEvents>;
}

// This class is a little hard to explain...
//
// The original goal was that the backend and to a degree the frontend would have very little idea what specifically
// was in the json blob that are stored with each run.  The only info that was held is that the JSON contained a few
// top-level fields - "cluster", "vars", "impl" and "workload".
// Both backend and frontend would dynamically inspect and display what was in that JSON.  This would allow displaying
// many sorts of graphs - how the Java SDK performs against multiple versions of the cluster.  How the Kotlin SDK
// perf changed over various versions of that SDK.  Etc.  And all without having to have multiple endpoints for each of
// those graphs.
//
// This approach does work, to an extent.  As we try and display more complex graphs we may hit against its limits,
// which could be handled with a new HorizontalAxis type.
export interface HorizontalAxisDynamic {
  readonly type: "dynamic";

  // Can be any database field, though some fields are more likely than others to produce useful results:
  // "impl.version" - displays SDK versions.  Most useful if the query is limited with `Compare` to one SDK language.
  // "impl.language" - displays SDK languages: "Kotlin", "Scala", etc.
  // Some fields that _might_ work but haven't been used yet:
  // "cluster.version" - displays cluster versions: "7.0.0" etc.  Could be useful for seeing how an SDK's performance
  //       has changed over time vs cluster versions.
  readonly databaseField: string;

  // Gives some indication what type the results are, which helps with ordering them correctly.
  readonly resultType: ResultType
}

// Displays any at-time annotations from the run_events table for any of the runs displayed.
export interface AnnotationsRunEvents {
  readonly type: "run-events";
}

export interface VerticalAxis {
  // The ChartJS y-axis to plot this on
  yAxisID: string
}

// Allows displaying a column from the `buckets` table.
export interface VerticalAxisBucketsColumn extends VerticalAxis {
  readonly type: "buckets";

  // "latency_average_us"
  readonly column: string;
}

// Allows displaying a specific metric from the metrics table.
export interface VerticalAxisMetric extends VerticalAxis {
  readonly type: "metric";

  // "systemCPU"
  readonly metric: string;
}

// Allows displaying all available metrics for these run(s) from the metrics table.
export interface VerticalAxisMetrics extends VerticalAxis {
  readonly type: "metrics";
}

// Allows displaying errors from the `buckets` table.
export interface VerticalAxisErrors extends VerticalAxis {
  readonly type: "errors";
}


export enum ResultType {
  // A string version number following semver ordering rules
  VERSION_SEMVER = "VersionSemver",

  INTEGER = "Integer",

  STRING = "String"
}

class HorizontalAxisDynamicUtil {
  // Turns `databaseField` into a form we can use in a SQL query.
  static databaseRepresentation1(input: HorizontalAxisDynamic): string {
    return `params->'${input.databaseField.replace('.', "'->>'")}'`;
  }

  // Turns `databaseField` into a form we can use in a SQL query... but different!
  static databaseRepresentation2(input: HorizontalAxisDynamic): string {
    const split = input.databaseField.split('.');
    return `{${split.join(',')}}`;
  }
}

// These fields are used for apples-to-apples comparisons.  We're very careful to only compare results that make
// sense to.  E.g. if we ran Java 3.3.4 against cluster A but Java 3.3.5 against cluster B, we don't want those to
// be appearing on the same graph.
//
// This is handled by taking these fields, which are JSON, and comparing them directly against the JSON blobs in the
// database.  The database blobs must be a superset of these input blobs.
//
// This approach allows us and the UI to be (somewhat) agnostic to what's in the database.  E.g. there's not much
// code that 'knows' we're dealing with a cluster, or variables, or whatever.  It's handled fairly generically based
// on the JSON.
export class DatabaseCompare {
  // A JSON blob containing info about the cluster that was used for this run.
  readonly cluster?: Record<string, unknown>;

  // A JSON blob containing info about the SDK that was used for this run - language, version, etc.
  readonly impl?: Record<string, unknown>;

  // A JSON blob containing info about the workload that was run - KV inserts, etc.
  readonly workload?: Record<string, unknown>;

  // A JSON blob containing the runtime variables that affected this run.  Number of docs, length of run, etc.
  readonly vars?: Record<string, unknown>;
}

// Getting top-level results page for a particular situational run.
export class SituationalRunQuery {
  readonly situationalRunId: string;
}

// Getting top-level results page for a particular run inside a situational run.
export class SituationalRunAndRunQuery {
  readonly situationalRunId: string;
  readonly runId: string;
}

export class ErrorSummary {
  readonly first: Record<string, unknown>;
  readonly count: number;

  constructor(first: Record<string, unknown>, count: number) {
    this.first = first;
    this.count = count;
  }
}

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Takes runs from the database and filters them against the requested Input.
   */
  private filterRuns(runs: Run[], input: Input): Run[] {
    const latestForEachLanguage = new Map<string, string>()

    if (input.filterRuns == FilterRuns.LATEST || input.filterRuns == FilterRuns.LATEST_NON_SNAPSHOT) {
      runs.forEach(run => {
        const sdk = run.impl["language"] as string
        const version = run.impl["version"] as string
        const isGerrit = version.startsWith("refs/")
        const isSnapshot = version.includes("-")
        const currentLatest = latestForEachLanguage.get(sdk)
        let skip = isGerrit

        if (isSnapshot && input.filterRuns == FilterRuns.LATEST_NON_SNAPSHOT) {
          skip = true
        }

        if (!skip) {
          if (currentLatest === undefined) {
            latestForEachLanguage.set(sdk, version)
          }
          else {
            if (versionCompare(version, currentLatest) > 0) {
              latestForEachLanguage.set(sdk, version)
            }
          }
        }
      })

      latestForEachLanguage.forEach((version, sdk) => console.info(`Latest for ${sdk} = ${version}`))
    }

    return runs.filter(run => {
      const sdk = run.impl["language"] as string
      const version = run.impl["version"] as string
      const isGerrit = version.startsWith("refs/")
      const isSnapshot = version.includes("-")
      if (input.excludeGerrit && isGerrit) {
        return false
      }
      if (input.excludeSnapshots && isSnapshot) {
        return false
      }

      if (input.filterRuns == FilterRuns.LATEST || input.filterRuns == FilterRuns.LATEST_NON_SNAPSHOT) {
        return latestForEachLanguage.get(sdk) == version
      }

      return true
    })
  }

  /**
   * Builds the Simplified bar graph
   */
  private async addGraphBar(input: Input): Promise<any> {
    const labels = [];
    const values = [];
    const runIds = [];
    let runs: Run[];
    let results: Result[] = [];

    if (input.hAxis.type == 'dynamic') {
      const ha = input.hAxis as HorizontalAxisDynamic;

      if (input.yAxes.length != 1) {
        throw Error("Only one yaxis dataset is supported on Simplified graphs")
      }

      const yAxis = input.yAxes[0];

      if (yAxis.type == 'buckets') {
        const va = yAxis as VerticalAxisBucketsColumn;

        const initial = await this.database.getRuns(
            input.databaseCompare,
            HorizontalAxisDynamicUtil.databaseRepresentation2(ha),
        )
        runs = this.filterRuns(initial, input)

        console.info(`Matched ${initial.length} runs, filtered to ${runs.length}`)

        const runIds = runs.map((v) => v.id);

        if (runIds.length > 0) {
          results = await this.database.getSimplifiedGraph(
              HorizontalAxisDynamicUtil.databaseRepresentation1(ha),
              runIds,
              input,
              va);
        }
      } else if (yAxis.type == 'metric') {
        const va = yAxis as VerticalAxisMetric;

        runs = this.filterRuns(await this.database.getRuns(input.databaseCompare, "{}",), input)

        console.info(`Matched ${runs.length} runs`)

        const runIds = runs.map((v) => v.id);

        if (runIds.length > 0) {
          results = await this.database.getSimplifiedGraphForMetric(runIds, ha, va, input);
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

    results.forEach((b) => {
      labels.push(b.grouping);
      values.push(b.value);
      runIds.push(b.runIds);
    });

    return {
      type: 'bar',
      runs: runs,
      chosen: JSON.stringify(input.databaseCompare),
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
      databaseCompare: undefined,
      excludeGerrit: false,
      excludeSnapshots: false,
      filterRuns: FilterRuns.ALL,
      multipleResultsHandling: undefined
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
    const datasets = [];
    const annotations = {};
    const sp = new ShadeProvider()
    let firstBucketTime = undefined

    if (input.hAxis.type == 'dynamic') {
      const ha = input.hAxis as HorizontalAxisDynamic;

      const runsPlus: Array<RunPlus> = runs.map((run: RunPlus) => {
        const groupedBy = ha.databaseField.split('.');
        run.groupedBy = DashboardService.parseFrom(run.params, groupedBy);
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
            firstBucketTime = ds[0]?.data[0]?.nested?.datetime
            console.info("Found first bucket time: ", firstBucketTime)
            ds.forEach(d => datasets.push(d))
          }))
        } else if (yAxis.type == "metrics") {
          const va = yAxis as VerticalAxisMetrics;
          promiseArray.push(await this.getVerticalAxisMetrics(runsPlus, input, va, sp).then(ds =>
              ds.forEach(d => datasets.push(d))))
        } else if (yAxis.type == "errors") {
          const va = yAxis as VerticalAxisErrors;
          promiseArray.push(await this.getVerticalAxisErrors(runsPlus, input, va, sp).then(ds =>
              ds.forEach(d => datasets.push(d))))
        }
        // VerticalAxisMetric _could_ be supported, but doesn't seem that useful when VerticalAxisMetrics is a superset of it
        else throw Error(`Unsupported yAxis type ${yAxis}`)
      }

      await Promise.all(promiseArray);

      for (const ann of input.annotations) {
        if (ann.type == 'run-events') {
          for (const run of runs) {
            const events = await this.database.getEvents(run.id, firstBucketTime, true)
            for (let i = 0; i < events.length; i++){
              const event = events[i];
              const x = event.timeOffsetSecs;

              annotations[uuidv4()] = {
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

      // console.info(`For run ${run.id} buckets ${bucketsForRun.length}`);

      const data = [];

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

    const dataErrors = [];

    const runsWithBuckets = await this.database.getRunsWithBuckets(runIds, input, undefined, false, true);

    for (const run of runs) {
      const bucketsForRun = runsWithBuckets.filter((v) => v.runId == run.id);

      bucketsForRun.forEach((b) => {
        const tooltip = b.timeOffsetSecs + "s " + new Date(b.datetime).toISOString()

        if (b.errors) {
          let totalErrors = 0;
          Object.keys(b.errors).forEach(errorName => {
            const errorCount = b.errors[errorName] as number
            totalErrors += errorCount
          })

          dataErrors.push({
            x: b.timeOffsetSecs,
            y: totalErrors,
            tooltip: tooltip + " " + JSON.stringify(b.errors)
          });
        } else {
          dataErrors.push({
            x: b.timeOffsetSecs,
            y: 0,
            tooltip: tooltip
          });
        }
      })

      datasets.push({
        yAxisID: va.yAxisID,
        label: run.groupedBy + " errors",
        data: dataErrors,
        fill: false,
        backgroundColor: '#e88873',
        borderColor: '#e88873',
      });
    }

    return datasets;
  }

  private async getVerticalAxisMetrics(runs: Array<RunPlus>,
                                       input: Input,
                                       va: VerticalAxisMetrics,
                                       sp: ShadeProvider): Promise<Array<Record<string, unknown>>> {
    const runIds = runs.map((v) => v.id);
    const datasets = [];

    const dataMetrics = {};

    const runsWithBuckets = await this.database.getRunsWithBuckets(runIds, input, undefined, true, false);

    for (const run of runs) {
      const bucketsForRun = runsWithBuckets.filter((v) => v.runId == run.id);

      // console.info(`For run ${run.id} buckets ${bucketsForRun.length}`);

      bucketsForRun.forEach((b) => {
        const tooltip = b.timeOffsetSecs + "s " + new Date(b.datetime).toISOString()

        if (b.metrics) {
          const metricsJson = b.metrics;
          const keys = Object.keys(metricsJson);
          keys.forEach(key => {
            // const x = b.run_id + "_" + key;
            // It's not useful to have multiple runs with metrics on same screen
            const x = key;
            const data = {
              x: b.timeOffsetSecs,
              y: metricsJson[key]
            }
            if (x in dataMetrics) {
              dataMetrics[x].push(data);
            } else {
              dataMetrics[x] = [data];
            }
          })
        }
      })
    }

    for (const [k, v] of Object.entries(dataMetrics)) {
      datasets.push({
        yAxisID: va.yAxisID,
        label: k,
        data: v,
        hidden: true,
        fill: false,
        borderColor: sp.nextShade()
      });
    }

    return datasets;
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

      DashboardService.removeDisplayByIfNeeded(run, groupBySplit);

      const cluster = JSON.stringify(run['cluster']);
      clusters.add(cluster);

      const impl = JSON.stringify(run['impl']);
      impls.add(impl);

      const workload = JSON.stringify(run['workload']);
      workloads.add(workload);

      const vars = JSON.stringify(run['vars']);
      varsAll.add(vars);
      if (!varsByWorkload.has(workload)) {
        varsByWorkload[workload] = new Set(vars);
      } else {
        varsByWorkload[workload].add(vars);
      }
    });

    return new Filtered(
      [...clusters.values()],
      [...workloads.values()],
      [...impls.values()],
      [...varsAll.values()],
      varsByWorkload,
    );
  }

  static parseFrom(input: Record<string, unknown>, groupBy: Array<string>): string {
    const lookingFor = groupBy[0];
    const keys = Object.keys(input);

    if (keys.includes(lookingFor)) {
      if (groupBy.length == 1) {
        return input[lookingFor] as string;
      } else {
        const next = input[lookingFor] as Record<string, unknown>;
        return this.parseFrom(next, groupBy.splice(1));
      }
    }
  }

  static removeDisplayByIfNeeded(
    input: Record<string, unknown>,
    display: Array<string>,
  ): void {
    const toRemove = display[0];
    const keys = Object.keys(input);

    if (keys.includes(toRemove)) {
      if (display.length == 1) {
        delete input[toRemove];
      } else {
        const next = input[toRemove] as Record<string, unknown>;
        this.removeDisplayByIfNeeded(next, display.slice(1));
      }
    }
  }

  async getGroupBy(): Promise<Array<string>> {
    const runs = await this.database.getRunsRaw();
    const keys = new Set<string>();
    runs.forEach((run) => {
      const props = DashboardService.genStrings('', run['params'] as Record<string, unknown>);
      props.forEach((p) => keys.add(p));
    });
    return [...keys.values()];
  }

  static genStrings(input_key: string, input: Record<string, unknown>): Array<string> {
    let out = [];
    const keys = Object.keys(input);
    const next_key = input_key.length == 0 ? '' : input_key + '.';

    keys.forEach((key) => {
      const v = input[key];
      if (v == null) {
        console.warn(`Found null value ${key} in ${JSON.stringify(input)}`);
      } else if (typeof v === 'object') {
        const next = this.genStrings(next_key + key, v as Record<string, unknown>);
        out = out.concat(next);
      } else {
        out.push(next_key + key);
      }
    });

    return out;
  }

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
    let out = []
    const excessiveThreads = new Metrics("cast (metrics::json->>'threadCount' as integer) > 200",
        "'Excessive thread count, max=' || max (cast (metrics::json->>'threadCount' as integer))")
    const excessiveHeap = new Metrics("cast(metrics::json->>'memHeapUsedMB' as float) > 500",
        "'Excessive heap usage, max=' || max(cast(metrics::json->>'memHeapUsedMB' as float))")
    const excessiveProcessCpu = new Metrics("cast(metrics::json->>'processCpu' as float) > 90",
        "'Excessive process CPU usage, max=' || max(cast(metrics::json->>'processCpu' as float))")

    out = out.concat(await this.database.getMetricsAlerts(input, excessiveThreads, "metrics"))
    out = out.concat(await this.database.getMetricsAlerts(input, excessiveHeap, "metrics"))
    out = out.concat(await this.database.getMetricsAlerts(input, excessiveProcessCpu, "metrics"))

    const anyFailures = new Metrics("operations_failed > 0",
        "'Operations failed, sum=' || sum(operations_failed)")

    out = out.concat(await this.database.getMetricsAlerts(input, anyFailures, "buckets"))

    console.info(`${out.length} total alerts`)

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
    for (const key of errorMap) {
      out.push(new ErrorSummary(key[1][0], key[1][1]))
    }
    return out
  }
}
