import { Injectable } from '@nestjs/common';
import { Client } from 'pg';
import { not } from 'rxjs/internal-compatibility';

const semver = require('semver');
const semverParse = require('semver/functions/parse');
const SemVer = require('semver/classes/semver');

class Run {
  params: Object;
  cluster: string;
  impl: string;
  workload: string;
  vars: string;
  other: string;
  id: string;
  datetime: string;

  constructor(
    params: Object,
    cluster: string,
    impl: string,
    workload: string,
    vars: string,
    other: string,
    id: string,
    datetime: string
  ) {
    this.params = params;
    this.cluster = cluster;
    this.impl = impl;
    this.workload = workload;
    this.vars = vars;
    this.other = other;
    this.id = id;
    this.datetime = datetime;
  }
}

export interface RunPlus extends Run {
  groupedBy: string; // "7.0.0-3756"
  color: string; // '#E2F0CB'
}

class ResultRaw {
  time: number;
  value: number;

  constructor(time: number, value: number) {
    this.time = time;
    this.value = value;
  }
}

class Result {
  grouping: string;
  value: number;

  constructor(grouping: string, value: number) {
    this.grouping = grouping;
    this.value = value;
  }
}

class Impl {
  language: string;
  version: string;
  semver: any;
  json: object;

  constructor(language: string, version: string, semver: any, json: object) {
    this.language = language;
    this.version = version;
    this.semver = semver;
    this.json = json;
  }
}

@Injectable()
export class DatabaseService {
  constructor(private client: Client) {}

  async get_cluster_versions(): Promise<Array<string>> {
    const res = await this.client.query(
      "select params::jsonb->'cluster'->>'version' as v from runs group by (v);",
    );
    return res.map((v) => v.v);
  }

  async get_clusters(): Promise<Array<object>> {
    const res = await this.client.query(
      "select params::jsonb->'cluster' as v from runs group by (v);",
    );
    return res;
  }

  async get_implementations(): Promise<Array<Impl>> {
    const res = await this.client.query(
      "select params::jsonb->'impl' as v from runs group by (v);",
    );
    return res.map(
      (row) =>
        new Impl(
          row.v.language,
          row.v.version,
          semver.parse(row.v.version),
          row.v,
        ),
    );
  }

  async get_latest_implementations(): Promise<{ [name: string]: Impl }> {
    const impls = await this.get_implementations();
    const latest: { [name: string]: Impl } = {};

    impls.forEach((impl) => {
      if (!latest.hasOwnProperty(impl.language)) {
        latest[impl.language] = impl;
      } else if (
        semver.compare(impl.version, latest[impl.language].version) == 1
      ) {
        latest[impl.language] = impl;
      }
    });

    return latest;
  }

  async get_workloads(): Promise<Array<string>> {
    const res = await this.client.query(
      "select params::jsonb->'workload'->>'description' as v from runs group by (v);",
    );
    return res;
  }

  async get_vars(): Promise<Array<string>> {
    const res = await this.client.query(
      "select params->'vars' as v from runs group by (v);",
    );
    return res;
  }

  async get_runs(compared_json: Object, group_by: string): Promise<Array<Run>> {
    const st = `SELECT
                        params as params,
                        params->'cluster' as cluster,
                        params->'impl' as impl,
                        params->'workload' as workload,
                        params->'vars' as vars,
                        params->'other' as other,
                        id as run_id,
                        datetime
                      FROM runs
                      where (params) @>
                        ('${JSON.stringify(
                          compared_json,
                        )}'::jsonb #- '${group_by}')`;
    console.info(st);
    const result = await this.client.query(st);
    const rows = result;
    const ret = rows.map((x) => {
      return new Run(
        x.params,
        x.cluster,
        x.impl,
        x.workload,
        x.vars,
        x.other,
        x.run_id,
        x.datetime
      );
    });
    return ret;
  }

  // async get_runs(cluster, impl, vars, other, group_by: string): Promise<Array<Run>> {
  //
  //     const compared_json = {
  //         "cluster": cluster,
  //         "impl": impl,
  //         "vars": vars,
  //         "other": other
  //     }
  //
  //     const st = `SELECT
  //                     params->'cluster' as cluster,
  //                     params->'impl' as impl,
  //                     params->'workload' as workload,
  //                     params->'vars' as vars,
  //                     params->'other' as other,
  //                     id as run_id
  //                   FROM runs
  //                   where (params) @>
  //                     ('${JSON.stringify(compared_json)}'::jsonb #- '${group_by}')`
  //     const result = await this.client.query(st)
  //     const rows = result
  //     const ret = rows.map(x => {
  //         return new Run(x.cluster, x.impl, x.workload, x.vars, x.other, x.run_id)
  //     })
  //     return ret
  // }
  async get_runs_raw(): Promise<Array<Object>> {
    const st = `SELECT params::json
                    FROM runs`;
    return await this.client.query(st);
  }

  /**
   * The Simplified display.
   */
  async get_groupings(
    groupBy1: string,
    run_ids: Array<string>,
    display: string,
    grouping_type: string): Promise<Array<Result>> {
    let st;
    if (grouping_type == 'Side-by-side') {
      st = `SELECT runs.id,
                   sub.value,
                   ${groupBy1} as grouping
            FROM (SELECT run_id,
                         avg(buckets.${display}) as value
                  FROM buckets join runs
                  on buckets.run_id = runs.id
                  WHERE run_id in ('${run_ids.join("','")}')
                  GROUP BY run_id) as sub
                   JOIN runs ON sub.run_id = runs.id
            ORDER BY grouping, datetime asc`;
    }
    else if (grouping_type == 'Average') {
      st = `SELECT avg(sub.value) as value,
                   ${groupBy1} as grouping
            FROM (SELECT run_id,
                         avg(buckets.${display}) as value
                  FROM buckets join runs
                  on buckets.run_id = runs.id
                  WHERE run_id in ('${run_ids.join("','")}')
                  GROUP BY run_id) as sub
                   JOIN runs ON sub.run_id = runs.id
            GROUP BY grouping
            ORDER BY grouping`;
    }
    else {
      throw new Error("Unknown grouping_type " + grouping_type);
    }
    console.info(st);
    const result = await this.client.query(st);
    const rows = result;
    return rows.map((x) => new Result(x.grouping, x.value));
  }

  async get_buckets(
    groupBy1: string,
    run_ids: Array<string>,
    display: string,
  ): Promise<Array<Result>> {
    // select buckets.time,buckets.run_id,buckets.latency_p95_us FROM buckets join runs on buckets.run_id = runs.id where runs.id = 'e4ffbd00-56f3-4c83-8939-49350f5e3e68';
    const st = `SELECT
                    buckets.time,
                    buckets.run_id,
                    buckets.${display}
                      FROM buckets join runs on buckets.run_id = runs.id
                      WHERE run_id in ('${run_ids.join("','")}')`;
    console.info(st);
    const result = await this.client.query(st);
    return result.map((x) => new Result(x.grouping, x.value));
  }

  async get_buckets_for_run(
    groupBy1: string,
    run_id: string,
    display: string,
  ): Promise<Array<ResultRaw>> {
    // select buckets.time,buckets.run_id,buckets.latency_p95_us FROM buckets join runs on buckets.run_id = runs.id where runs.id = 'e4ffbd00-56f3-4c83-8939-49350f5e3e68';
    const st = `SELECT
                    extract(epoch from (buckets.time)) - extract(epoch from runs.datetime) as time,
                    buckets.${display} as value
                      FROM buckets join runs on buckets.run_id = runs.id
                      WHERE run_id = '${run_id}' 
                      ORDER BY time`;
    console.info(st);
    const result = await this.client.query(st);
    return result.map((x) => new ResultRaw(x.time, x.value));
  }
}
