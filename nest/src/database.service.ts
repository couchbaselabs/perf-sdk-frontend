import { Injectable } from '@nestjs/common';
import { Client } from 'pg';
import {Metrics, MetricsQuery} from "./dashboard.service";

const semver = require('semver');

export class Run {
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
    datetime: string,
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

/**
 * For when the database output is multiple buckets for each run.
 */
class RunBucketPair {
  run_id: string;
  datetime: string;
  time_offset_secs: number;
  value: number;
  metrics?: string;

  constructor(
    run_id: string,
    datetime: string,
    time_offset_secs: number,
    value: number,
    metrics?: string
  ) {
    this.run_id = run_id;
    this.datetime = datetime;
    this.time_offset_secs = time_offset_secs;
    this.value = value;
    this.metrics = metrics;
  }
}

export interface RunPlus extends Run {
  groupedBy: string; // "7.0.0-3756"
  color: string; // '#E2F0CB'
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
        x.datetime,
      );
    });
    return ret;
  }

  async get_runs_by_id(runIds: Array<string>): Promise<Array<Run>> {
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
                WHERE id in ('${runIds.join("','")}')`;
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
          x.datetime,
      );
    });
    return ret;
  }

  /**
   * Returns all runs that match, together with the bucket data for each.
   * Used for building the Full line graph.
   */
  async get_runs_with_buckets(
    run_ids: string[],
    display: string,
    trimming_seconds: number,
    include_metrics: boolean,
    merging: string,
    bucketise_seconds?: number): Promise<Array<RunBucketPair>> {
    let st;
    if (bucketise_seconds != null && bucketise_seconds > 1) {
      // Not sure how to group the metrics, would require some complex JSON processing
      include_metrics = false
      const mergingOp = this.mapMerging(merging)
      st = `
        SELECT buckets.run_id,
               time_bucket('${bucketise_seconds} seconds', time) as datetime,
               min(buckets.time_offset_secs)                     as time_offset_secs,
               ${mergingOp}(${display}) as value 
               ${include_metrics ? `, metrics.metrics` : ""}
        FROM buckets
          ${include_metrics ? "LEFT OUTER JOIN metrics ON buckets.run_id = metrics.run_id AND buckets.time_offset_secs = metrics.time_offset_secs" : ""}
        WHERE buckets.run_id in ('${run_ids.join("','")}')
          AND buckets.time_offset_secs >= ${trimming_seconds}
        GROUP BY run_id, datetime
        ORDER BY datetime ASC;`
    }
    else {
      st = `
        SELECT buckets.run_id,
               time as datetime,
                buckets.time_offset_secs,
               ${display} as value 
               ${include_metrics ? `, metrics.metrics` : ""}
        FROM buckets
          ${include_metrics ? "LEFT OUTER JOIN metrics ON buckets.run_id = metrics.run_id AND buckets.time_offset_secs = metrics.time_offset_secs" : ""}
        WHERE buckets.run_id in ('${run_ids.join("','")}')
          AND buckets.time_offset_secs >= ${trimming_seconds}
        ORDER BY datetime ASC;`
    }

    console.info(st);
    const result = await this.client.query(st);
    return result.map((x) => {
      return new RunBucketPair(
        x.run_id,
        x.datetime,
        parseInt(x.time_offset_secs),
        x.value,
        x.metrics
      );
    });
  }

  async get_runs_raw(): Promise<Array<Object>> {
    const st = `SELECT params::json
                    FROM runs`;
    return await this.client.query(st);
  }

  private mapMerging(merging: string): string {
    let mergingOp;
    if (merging == 'Average') {
      mergingOp = 'avg';
    } else if (merging == 'Maximum') {
      mergingOp = 'max';
    } else if (merging == 'Minimum') {
      mergingOp = 'min';
    } else if (merging == 'Sum') {
      mergingOp = 'sum';
    } else {
      throw new Error('Unknown merging type ' + merging);
    }
    return mergingOp;
  }

  /**
   * The Simplified display.
   */
  async get_groupings(
    groupBy1: string,
    run_ids: Array<string>,
    display: string,
    grouping_type: string,
    merging: string,
    trimming_seconds: number): Promise<Array<Result>> {
    const mergingOp = this.mapMerging(merging)

    let st;
    if (grouping_type == 'Side-by-side') {
      st = `SELECT runs.id,
                   sub.value,
                   ${groupBy1} as grouping
            FROM (SELECT run_id,
                         ${mergingOp}(buckets.${display}) as value
                  FROM buckets join runs
                  on buckets.run_id = runs.id
                  WHERE run_id in ('${run_ids.join("','")}')
                    AND buckets.time_offset_secs >= ${trimming_seconds}
                  GROUP BY run_id) as sub
                   JOIN runs ON sub.run_id = runs.id
            ORDER BY grouping, datetime asc`;
    } else if (grouping_type == 'Average') {
      st = `SELECT avg(sub.value) as value,
                   ${groupBy1} as grouping
            FROM (SELECT run_id,
                        ${mergingOp}(buckets.${display}) as value
                  FROM buckets join runs
                  on buckets.run_id = runs.id
                  WHERE run_id in ('${run_ids.join("','")}')
                    AND buckets.time_offset_secs >= ${trimming_seconds}
                  GROUP BY run_id) as sub
                   JOIN runs ON sub.run_id = runs.id
            GROUP BY grouping
            ORDER BY grouping`;
    } else {
      throw new Error('Unknown grouping_type ' + grouping_type);
    }
    console.info(st);
    const result = await this.client.query(st);
    const rows = result;
    return rows.map((x) => new Result(x.grouping, x.value));
  }

  // cast (metrics::json->>'threadCount' as integer) > 100
  // 'Excessive thread count, max=' || max (cast (metrics::json->>'threadCount' as integer))
  async get_metrics_alerts(input: MetricsQuery, metrics: Metrics, table: string) {
    // datetime >= '2022-07-30 00:00:00.000000' below is because there was a driver bug fixed around there that was not
    // closing connections.
    const st = `select run_id,
                       datetime,
                       sub.message,
                       params::jsonb->'impl'->>'version' as version
                from
                  (
                  select run_id,
                  (${metrics.message}) as message
                  from ${table}
                  where ${metrics.whereClause}
                  group by run_id
                  ) as sub
                  join runs
                on runs.id = sub.run_id
                where params::jsonb->'impl'->>'language' = '${input.language}'
                and datetime >= '2022-07-30 00:00:00.000000'
                order by string_to_array(params::jsonb->'impl'->>'version', '.')::text[] desc;`

    console.info(st);
    const result = await this.client.query(st);
    const rows = result;
    console.info(`Got ${rows.length} alerts`)
    return rows.map((x) => new MetricsResult(x.run_id, x.datetime, x.message, x.version, input.language));
  }
}

class MetricsResult {
  runId: string;
  datetime: string;
  message: string;
  version: string;
  language: string;


  constructor(runId: string, datetime: string, message: string, version: string, language: string) {
    this.runId = runId;
    this.datetime = datetime;
    this.message = message;
    this.version = version;
    this.language = language;
  }
}
