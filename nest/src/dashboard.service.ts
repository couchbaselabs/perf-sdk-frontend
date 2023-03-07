import { Injectable } from '@nestjs/common';
import {DatabaseService, Run, RunPlus} from './database.service';
import { Filtered } from './app.controller';

// Query for a single run
export class Single {
  runId: string;
  display: string; // latency_average_us
  trimmingSeconds: number;
  includeMetrics: boolean;
  mergingType: MergingAlgorithm;
  bucketiseSeconds?: number;
}

export class MetricsQuery {
  language: string;
}

export class Metrics {
  // cast (metrics::json->>'threadCount' as integer) > 100
  whereClause: string;
  // 'Excessive thread count, max=' || max (cast (metrics::json->>'threadCount' as integer))
  message: string;

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
export enum GroupingType {
  SIDE_BY_SIDE = "Side-by-Side",

  // ("Average" is a misnomer, but is what the frontend is sending)
  MERGED = "Average"
}

// If in Simplified mode (bar chart) and we have multiple results for a particular bar, and groupingType = MERGED,
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

// The main search class from the frontend.  There are a number of different graphs displayed and they are all
// represented through here.
export class Input {
  // What to display on the x-axis.  E.g. what we're grouping the database results by.
  // Supported options:
  // * "cluster.version"
  // * "variables.<some_tunable>" e.g. "variables.com.couchbase.protostellar.executorMaxThreadCount"
  // This really wants refactoring into two fields: what 'sort of thing' we're grouping by (e.g. versions, or tunables),
  // and then what exactly we're grouping by ("cluster.version" or "com.couchbase.protostellar.executorMaxThreadCount").
  groupBy: string;

  // What to display on the y-axis.
  display: string; // "latency_average_us"

  // These next fields are used for apples-to-apples comparisons.  We're very careful to only compare results that make
  // sense to.  E.g. if we ran Java 3.3.4 against cluster A but Java 3.3.5 against cluster B, we don't want those to
  // be appearing on the same graph.
  // This is handled by taking these fields, which are JSON, and comparing them directly against the JSON blobs in the
  // database.  The database blobs must contain these input blobs (which also usually come originally from those database
  // blobs).
  // This approach allows us and the UI to be (somewhat) agnostic to what's in the database.  E.g. there's not much
  // code that 'knows' we're dealing with a cluster, or variables, or whatever.  It's handled fairly generically based
  // on the JSON.
  cluster?: Record<string, unknown>;
  impl?: Record<string, unknown>;
  workload?: Record<string, unknown>;
  vars?: Record<string, unknown>;

  graphType: GraphType;
  groupingType: GroupingType;
  mergingType: MergingAlgorithm;

  // How many seconds of data to trim off the start of each run, to account for e.g. JVM warmup and general settling.
  trimmingSeconds: number;

  // Whether the metrics table data should be fetched and included.
  includeMetrics: boolean;

  // It's too expensive to draw large line graphs of 1 second buckets, so re-bucketise into larger buckets if this is
  // set.
  bucketiseSeconds?: number;

  // Whether to exclude interim/snapshot versions ("3.4.0-20221020.123751-26")
  excludeSnapshots: boolean;

  // Whether to exclude Gerrit versions ("refs/changes/19/183619/30")
  excludeGerrit: boolean;

  // Whether to filter matched runs.  The default is ALL (no filtering).
  filterRuns: FilterRuns;

  // groupBy1 and groupBy2 turn `groupBy` into a form that can be used directly against the database JSON.
  groupBy1(): string {
    return `params->'${this.groupBy.replace('.', "'->>'")}'`;
  }

  groupBy2(): string {
    const split = this.groupBy.split('.');
    return `{${split.join(',')}}`;
  }
}

export class Params {
  impl: any;
  cluster: any;
  workload: any;
  vars: any;
  other: any;

  constructor(impl: any, cluster: any, workload: any, vars: any, other: any) {
    this.impl = impl;
    this.cluster = cluster;
    this.workload = workload;
    this.vars = vars;
    this.other = other;
  }
}

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  // credit: https://stackoverflow.com/questions/6832596/how-can-i-compare-software-version-number-using-javascript-only-numbers
  private versionCompare(version1: string, version2: string){
    const regExStrip0 = /(\.0+)+$/;
    const segmentsA = version1.replace(regExStrip0, '').split('.');
    const segmentsB = version2.replace(regExStrip0, '').split('.');

    if(segmentsA > segmentsB) {
      return 1
    } else if (segmentsA < segmentsB) {
      return -1
    } else{
      return 0
    }
  }
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
            if (this.versionCompare(version, currentLatest) > 0) {
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
  private async addGraphBar(
    comparedJson: Record<string, unknown>,
    input: Input,
  ): Promise<any> {
    const isVariablesQuery = input.groupBy.startsWith("variables.")
    const labels = [];
    const values = [];
    const runs = this.filterRuns(await this.database.getRuns(
      comparedJson,
      input.groupBy2(),
    ), input);
    const runIds = runs.map((v) => v.id);

    if (runIds.length != 0) {
      let buckets
      if (isVariablesQuery) {
        buckets = await this.database.getGroupingsForVariables(
            input.groupBy1(),
            input.groupBy.replace("variables.", ""),
            runIds,
            input.display,
            input.groupingType,
            input.mergingType,
            input.trimmingSeconds);
      }
      else {
        buckets = await this.database.getGroupings(
            input.groupBy1(),
            runIds,
            input.display,
            input.groupingType,
            input.mergingType,
            input.trimmingSeconds);
        buckets.sort((a, b) => a.grouping.localeCompare(b.grouping));
      }
      buckets.forEach((b) => {
        labels.push(b.grouping);
        values.push(b.value);
      });
    }

    return {
      type: 'bar',
      runs: runs,
      chosen: comparedJson,
      data: {
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
  private async addGraphLine(
      comparedJson: Record<string, unknown>,
      input: Input,
  ): Promise<any> {
    const runs = this.filterRuns(await this.database.getRuns(
        comparedJson,
        input.groupBy2(),
    ), input);

    return this.addGraphLineShared(runs, input.display, input.trimmingSeconds, input.groupBy, input.includeMetrics, input.mergingType, input.bucketiseSeconds);
  }

  /**
   * Builds the Full line graph for a single run.
   */
  private async addGraphLineSingle(
      input: Single,
  ): Promise<any> {
    const runs = await this.database.getRunsById([input.runId]);

    // TODO fix this hardcoding
    return this.addGraphLineShared(runs, input.display, input.trimmingSeconds, "impl.version", input.includeMetrics, input.mergingType, input.bucketiseSeconds);
  }


  /**
   * Builds the Full line graph for both multiple runs, and single.
   */
  private async addGraphLineShared(
    runs: Array<Run>,
    display: string,
    trimmingSeconds: number,
    groupBy: string,
    includeMetrics: boolean,
    merging: MergingAlgorithm,
    bucketiseSeconds?: number
  ): Promise<any> {
    const datasets = [];
    const runIds = runs.map((v) => v.id);

    const runsWithBuckets = await this.database.getRunsWithBuckets(
        runIds,
        display,
        trimmingSeconds,
        includeMetrics,
        merging,
        bucketiseSeconds
    );

    const shades = [
      '#E2F0CB',
      '#B5EAD7',
      '#C7CEEA',
      '#FF9AA2',
      '#FFB7B2',
      '#FFDAC1',
    ];
    let shadeIdx = 0;

    const runsPlus: Array<RunPlus> = runs.map((run: RunPlus) => {
      const groupedBy = groupBy.split('.');
      run.groupedBy = DashboardService.parseFrom(run.params, groupedBy);
      const shade = shades[shadeIdx % shades.length];
      shadeIdx++;
      run.color = shade;
      return run;
    });

    for (const run of runsPlus) {
      const bucketsForRun = runsWithBuckets.filter((v) => v.runId == run.id);

      // console.info(`For run ${run.id} buckets ${bucketsForRun.length}`);

      const data = [];
      const dataMetrics = {};

      bucketsForRun.forEach((b) => {
        data.push({
          x: b.timeOffsetSecs,
          y: b.value,
          nested: {
            datetime: b.datetime,
            runid: b.runId,
          },
        });

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
            }
            else {
              dataMetrics[x] = [data];
            }
          })
        }
      });

      datasets.push({
        label: run.groupedBy,
        data: data,
        fill: false,
        backgroundColor: run.color,
        borderColor: run.color,
      });

      for (const [k, v] of Object.entries(dataMetrics)) {
        datasets.push({
          label: k,
          data: v,
          hidden: true,
          fill: false,
          borderColor: shades[(shadeIdx++) % shades.length]
        });
      }
    }

    return {
      type: 'line',
      runs: runsPlus,
      data: {
        datasets: datasets,
      },
    };
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
    const comparedJson = {
      cluster: input.cluster,
      impl: input.impl,
      workload: input.workload,
      vars: input.vars,
    };

    if (input.graphType == GraphType.SIMPLIFIED) {
      return await this.addGraphBar(comparedJson, input);
    } else {
      return await this.addGraphLine(comparedJson, input);
    }
  }

  public async genSingle(
      input: Single
  ) {
    return await this.addGraphLineSingle(input);
  }

  public async genMetrics(input: MetricsQuery) {
    let out = []
    const excessiveThreads = new Metrics("cast (metrics::json->>'threadCount' as integer) > 100",
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
}
