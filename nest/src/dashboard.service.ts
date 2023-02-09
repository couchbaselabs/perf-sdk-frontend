import { Injectable } from '@nestjs/common';
import {DatabaseService, Run, RunPlus} from './database.service';
import { Filtered } from './app.controller';
import {v4 as uuidv4} from 'uuid';
import {run} from "jest";
import Any = jasmine.Any;

export class Panel {
  // cluster
  viewing: string;
  // [{"env":"AWS","disk":"ssd","nodes":3,"node_size":"m4"},{"env":"GCP","disk":"ssd","nodes":4,"node_size":"x2"}]
  params: Array<Record<string, unknown>>;
}

export class Single {
  runid: string;
  display: string; // latency_average_us
  trimming_seconds: number;
  include_metrics: boolean;
  merging_type: string;
  bucketise_seconds?: number;
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

// The main search class from the frontend.  There are a number of different graphs displayed and they are all
// represented through here.
export class Input {
  inputs: Array<Panel>;

  // What to display on the x-axis.  E.g. what we're grouping the database results by.
  // Supported options:
  // * "cluster.version"
  // * "variables.<some_tunable>" e.g. "variables.com.couchbase.protostellar.executorMaxThreadCount"
  // This really wants refactoring into two fields: what 'sort of thing' we're grouping by (e.g. versions, or tunables),
  // and then what exactly we're grouping by ("cluster.version" or "com.couchbase.protostellar.executorMaxThreadCount").
  group_by: string;

  // What to display on the y-axis.
  display: string; // latency_average_us

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

  // "Simplified" (aggregated bar chart) or "Full" (line chart showing each run over time)
  graph_type: string;

  // If in Simplified mode (bar chart) and we have multiple results for a particular bar, how to display them.
  // e.g. "Side-by-Side", or "Average"ing the results.  (Though "Average" is a misnomer, it's actually controlled by
  // merging_type).
  grouping_type: string;

  // If in Simplified mode (bar chart) and we have multiple results for a particular bar, and grouping_type = "Average",
  // how do we actually merge them.  "Average", "Sum", "Maximum", "Minimum".
  merging_type: string;

  // How many seconds of data to trim off the start of each run, to account for e.g. JVM warmup and general settling.
  trimming_seconds: number;

  // Whether the metrics table data should be fetched and included.
  include_metrics: boolean;

  // It's too expensive to draw large line graphs of 1 second buckets, so re-bucketise into larger buckets if this is
  // set.
  bucketise_seconds?: number;

  // Whether to exclude interim/snapshot versions ("3.4.0-20221020.123751-26")
  exclude_snapshots: boolean;

  // Whether to exclude Gerrit versions ("refs/changes/19/183619/30")
  exclude_gerrit: boolean;

  // Supported:
  // * "All" (or missing, e.g. default): don't filter runs.
  // * "Latest": if the database returns results for 1.1.0, 1.1.1 and 1.1.2 for SDK A, and 3.0.3, 3.0.4 and 3.0.5 for SDK B,
  //    will keep results for 1.1.2 for SDK A and 3.0.5 for SDK B.
  //    It's based on the results for this particular input.  E.g. if the real current latest version of SDK A is 1.1.3,
  //    will still keep results for 1.1.2.
  //    Only non-snapshot and non-Gerrit versions will get included in this mode.
  //    Snapshot versions are too hard to compare for some SDKs...
  filter_runs: string;

  group_by_1(): string {
    return `params->'${this.group_by.replace('.', "'->>'")}'`;
  }

  group_by_2(): string {
    const split = this.group_by.split('.');
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
  private version_compare(version1, version2){
    const regExStrip0 = /(\.0+)+$/;
    const segmentsA = version1.replace(regExStrip0, '').split('.');
    const segmentsB = version2.replace(regExStrip0, '').split('.');

    if(segmentsA > segmentsB) {
      return 1
    } else if (segmentsA< segmentsB) {
      return -1
    } else{
      return 0
    }
  }
  /**
   * Takes runs from the database and filters them against the requested Input.
   */
  private filter_runs(runs: Run[], input: Input): Run[] {
    const latestForEachLanguage = new Map<string, string>()

    if (input.filter_runs == "Latest") {
      runs.forEach(run => {
        const sdk = run.impl["language"] as string
        const version = run.impl["version"] as string
        const isGerrit = version.startsWith("refs/")
        const isSnapshot = version.includes("-")
        const currentLatest = latestForEachLanguage.get(sdk)

        if (!isGerrit && !isSnapshot) {
          if (currentLatest === undefined) {
            latestForEachLanguage.set(sdk, version)
          }
          else {
            if (this.version_compare(version, currentLatest) > 0) {
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
      if (input.exclude_gerrit && isGerrit) {
        return false
      }
      if (input.exclude_snapshots && isSnapshot) {
        return false
      }

      if (input.filter_runs == "Latest") {
        return latestForEachLanguage.get(sdk) == version
      }

      return true
    })
  }

  /**
   * Builds the Simplified bar graph
   */
  private async add_graph_bar(
    compared_json: Record<string, unknown>,
    input: Input,
  ): Promise<any> {
    const labels = [];
    const values = [];
    const runs = this.filter_runs(await this.database.get_runs(
      compared_json,
      input.group_by_2(),
    ), input);
    const run_ids = runs.map((v) => v.id);

    if (run_ids.length != 0) {
      let buckets
      if (input.group_by.startsWith("variables.")) {
        buckets = await this.database.get_groupings_for_variables(
            input.group_by_1(),
            input.group_by.replace("variables.", ""),
            run_ids,
            input.display,
            input.grouping_type,
            input.merging_type,
            input.trimming_seconds);
      }
      else {
        buckets = await this.database.get_groupings(
            input.group_by_1(),
            run_ids,
            input.display,
            input.grouping_type,
            input.merging_type,
            input.trimming_seconds);
        buckets.sort((a, b) => a.grouping.localeCompare(b.grouping));
      }
      buckets.forEach((b) => {
        labels.push(b.grouping);
        values.push(b.value);
      });
    }

    return {
      uuid: uuidv4(),
      type: 'bar',
      runs: runs,
      chosen: compared_json,
      // "chosen": {
      //     "cluster": params.cluster,
      //     "workload": params.workload,
      //     "other": params.other,
      //     "vars": params.vars,
      //     "impl": params.impl.json
      // },
      data: {
        labels: labels,
        datasets: [
          // For Frappe charts (Svelte)
          { values: values },
          // For Charts.js (Vue)
          {
            // "color": "red",
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
  private async add_graph_line(
      compared_json: Record<string, unknown>,
      input: Input,
  ): Promise<any> {
    const runs = this.filter_runs(await this.database.get_runs(
        compared_json,
        input.group_by_2(),
    ), input);

    return this.add_graph_line_shared(runs, input.display, input.trimming_seconds, input.group_by, input.include_metrics, input.merging_type, input.bucketise_seconds);
  }

  /**
   * Builds the Full line graph for a single run.
   */
  private async add_graph_line_single(
      input: Single,
  ): Promise<any> {
    const runs = await this.database.get_runs_by_id([input.runid]);

    // TODO fix this hardcoding
    return this.add_graph_line_shared(runs, input.display, input.trimming_seconds, "impl.version", input.include_metrics, input.merging_type, input.bucketise_seconds);
  }


  /**
   * Builds the Full line graph for both multiple runs, and single.
   */
  private async add_graph_line_shared(
    runs: Array<Run>,
    display: string,
    trimming_seconds: number,
    groupBy: string,
    includeMetrics: boolean,
    merging: string,
    bucketiseSeconds?: number
  ): Promise<any> {
    const datasets = [];
    const runIds = runs.map((v) => v.id);


    const runsWithBuckets = await this.database.get_runs_with_buckets(
        runIds,
        display,
        trimming_seconds,
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
      run.groupedBy = DashboardService.parse_from(run.params, groupedBy);
      const shade = shades[shadeIdx % shades.length];
      shadeIdx++;
      run.color = shade;
      return run;
    });

    for (const run of runsPlus) {
      const bucketsForRun = runsWithBuckets.filter((v) => v.run_id == run.id);

      // console.info(`For run ${run.id} buckets ${bucketsForRun.length}`);

      const data = [];
      const dataMetrics = {};

      bucketsForRun.forEach((b) => {
        data.push({
          x: b.time_offset_secs,
          y: b.value,
          nested: {
            datetime: b.datetime,
            runid: b.run_id,
          },
        });

        if (b.metrics) {
          //console.info(b.metrics)
          //console.info(typeof b.metrics)
          const metricsJson = b.metrics;
          const keys = Object.keys(metricsJson);
          keys.forEach(key => {
            // const x = b.run_id + "_" + key;
            // It's not useful to have multiple runs with metrics on same screen
            const x = key;
            const data = {
              x: b.time_offset_secs,
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
      // console.info(dataMetrics)

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
      uuid: uuidv4(),
      type: 'line',
      runs: runsPlus,
      //chosen: compared_json,
      // "chosen": {
      //     "cluster": params.cluster,
      //     "workload": params.workload,
      //     "other": params.other,
      //     "vars": params.vars,
      //     "impl": params.impl.json
      // },
      data: {
        datasets: datasets,
      },
    };
  }

  async gen_dashboard_wrapper(inputs: Input): Promise<any> {
    return {
      panels: await this.gen_panels(
        inputs,
        inputs.inputs[0],
        inputs.inputs.splice(1),
      ),
    };
  }

  public async get_filtered(group_by: string): Promise<Filtered> {
    const runs = await this.database.get_runs_raw();

    const clusters = new Set<string>();
    const impls = new Set<string>();
    const workloads = new Set<string>();
    const vars_all = new Set<string>();
    const vars_by_workload = new Map<string, Set<string>>();

    const group_by_split = group_by.split('.');

    runs.forEach((run_raw) => {
      const run = run_raw['params'] as Record<string, unknown>;

      DashboardService.remove_display_by_if_needed(run, group_by_split);

      const cluster = JSON.stringify(run['cluster']);
      clusters.add(cluster);

      const impl = JSON.stringify(run['impl']);
      impls.add(impl);

      const workload = JSON.stringify(run['workload']);
      workloads.add(workload);

      const vars = JSON.stringify(run['vars']);
      vars_all.add(vars);
      if (!vars_by_workload.has(workload)) {
        vars_by_workload[workload] = new Set(vars);
      } else {
        vars_by_workload[workload].add(vars);
      }
    });

    return new Filtered(
      [...clusters.values()],
      [...workloads.values()],
      [...impls.values()],
      [...vars_all.values()],
      vars_by_workload,
    );
  }

  static parse_from(input: Record<string, unknown>, groupBy: Array<string>): string {
    const looking_for = groupBy[0];
    const keys = Object.keys(input);

    if (keys.includes(looking_for)) {
      if (groupBy.length == 1) {
        return input[looking_for] as string;
      } else {
        const next = input[looking_for] as Record<string, unknown>;
        return this.parse_from(next, groupBy.splice(1));
      }
    }
  }

  static remove_display_by_if_needed(
    input: Record<string, unknown>,
    display: Array<string>,
  ): void {
    const to_remove = display[0];
    const keys = Object.keys(input);

    if (keys.includes(to_remove)) {
      if (display.length == 1) {
        delete input[to_remove];
      } else {
        const next = input[to_remove] as Record<string, unknown>;
        this.remove_display_by_if_needed(next, display.slice(1));
      }
    }
  }

  async get_group_by(): Promise<Array<string>> {
    const runs = await this.database.get_runs_raw();
    const keys = new Set<string>();
    runs.forEach((run) => {
      const props = DashboardService.gen_strings('', run['params'] as Record<string, unknown>);
      props.forEach((p) => keys.add(p));
    });
    return [...keys.values()];
  }

  static gen_strings(input_key: string, input: Record<string, unknown>): Array<string> {
    let out = [];
    const keys = Object.keys(input);
    const next_key = input_key.length == 0 ? '' : input_key + '.';

    keys.forEach((key) => {
      const v = input[key];
      if (v == null) {
        console.warn(`Found null value ${key} in ${JSON.stringify(input)}`);
      } else if (typeof v === 'object') {
        const next = this.gen_strings(next_key + key, v as Record<string, unknown>);
        out = out.concat(next);
      } else {
        out.push(next_key + key);
      }
    });

    return out;
  }

  private async gen_panels(
    input: Input,
    panel: Panel,
    remaining: Array<Panel>,
  ): Promise<Array<Record<string, unknown>>> {
    const panels = [];

    for (const key in panel.params) {
      const param = panel.params[key];
      const graphs = [];
      let sub_panels = [];

      if (input.inputs.length == 1) {
        const compared_json = {
          cluster: input.cluster,
          impl: input.impl,
          workload: input.workload,
          vars: input.vars,
        };

        switch (panel.viewing) {
          case 'cluster':
            compared_json.cluster = param;
            break;
          case 'impl':
            compared_json.cluster = param;
            break;
          case 'workload':
            compared_json.workload = param;
            break;
          case 'vars':
            compared_json.vars = param;
            break;
        }

        if (input.graph_type == 'Simplified') {
          const graph = await this.add_graph_bar(compared_json, input);
          graphs.push(graph);
        } else {
          const graph = await this.add_graph_line(compared_json, input);
          graphs.push(graph);
        }
      } else {
        sub_panels = await this.gen_panels(
          input,
          remaining[0],
          remaining.splice(1),
        );
      }

      panels.push({
        uuid: uuidv4(),
        title: `${panel.viewing} ${JSON.stringify(param)}`,
        graphs: graphs,
        panels: sub_panels,
      });
    }

    return panels;
  }

  public async gen_single(
      input: Single
  ) {
    return {
      panels: [{
        uuid: uuidv4(),
        graphs: [await this.add_graph_line_single(input)],
      }]
    };
  }

  public async gen_metrics(input: MetricsQuery) {
    let out = []
    const excessiveThreads = new Metrics("cast (metrics::json->>'threadCount' as integer) > 100",
        "'Excessive thread count, max=' || max (cast (metrics::json->>'threadCount' as integer))")
    const excessiveHeap = new Metrics("cast(metrics::json->>'memHeapUsedMB' as float) > 500",
        "'Excessive heap usage, max=' || max(cast(metrics::json->>'memHeapUsedMB' as float))")
    const excessiveProcessCpu = new Metrics("cast(metrics::json->>'processCpu' as float) > 90",
        "'Excessive process CPU usage, max=' || max(cast(metrics::json->>'processCpu' as float))")

    out = out.concat(await this.database.get_metrics_alerts(input, excessiveThreads, "metrics"))
    out = out.concat(await this.database.get_metrics_alerts(input, excessiveHeap, "metrics"))
    out = out.concat(await this.database.get_metrics_alerts(input, excessiveProcessCpu, "metrics"))

    const anyFailures = new Metrics("operations_failed > 0",
        "'Operations failed, sum=' || sum(operations_failed)")

    out = out.concat(await this.database.get_metrics_alerts(input, anyFailures, "buckets"))

    console.info(`${out.length} total alerts`)

    return out
  }
}
