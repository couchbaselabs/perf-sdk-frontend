import {Injectable} from '@nestjs/common';
import {Client} from 'pg';
import {DatabaseCompare, MultipleResultsHandling, MergingAlgorithm, Metrics, MetricsQuery, Input, HorizontalAxisType, HorizontalAxisDynamic} from "./dashboard.service";
import {versionCompare} from "./versions";

export class Run {
  params: Record<string, unknown>;
  cluster: string;
  impl: Record<string, unknown>;
  workload: string;
  vars: string;
  other: string;
  id: string;
  datetime: string;

  constructor(
    params: Record<string, unknown>,
    cluster: string,
    impl: Record<string, unknown>,
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
  runId: string;
  datetime: string;
  timeOffsetSecs: number;
  value: number;
  metrics?: string;

  constructor(
    runId: string,
    datetime: string,
    timeOffsetSecs: number,
    value: number,
    metrics?: string
  ) {
    this.runId = runId;
    this.datetime = datetime;
    this.timeOffsetSecs = timeOffsetSecs;
    this.value = value;
    this.metrics = metrics;
  }
}

export interface RunPlus extends Run {
  groupedBy: string; // "7.0.0-3756"
  color: string; // '#E2F0CB'
}

export class Result {
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
  json: Record<string, unknown>;

  constructor(language: string, version: string, semver: any, json: Record<string, unknown>) {
    this.language = language;
    this.version = version;
    this.semver = semver;
    this.json = json;
  }
}

@Injectable()
export class DatabaseService {
  constructor(private client: Client) {}

  /**
   * Used for both the Simplified and Full graphs.
   */
  async getRuns(compare: DatabaseCompare, groupBy: string): Promise<Array<Run>> {
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
                          compare, null, 2
                        )}'::jsonb #- '${groupBy}')`;
    console.info(st);
    const rows = await this.client.query(st);
    return rows.map((x) => {
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
  }

  async getRunsById(runIds: Array<string>): Promise<Array<Run>> {
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
    return result.map((x) => {
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
  }

  /**
   * Returns all runs that match `runIds`, together with the bucket data for each.
   * Used for building the Full line graph.
   * `input.databaseCompare` is NOT used here.
   */
  async getRunsWithBuckets(
    runIds: Array<string>,
    input: Input): Promise<Array<RunBucketPair>> {
    let st;
    let includeMetrics = input.includeMetrics
    if (input.bucketiseSeconds > 1) {
      // Not sure how to group the metrics, would require some complex JSON processing
      includeMetrics = false
      const mergingOp = this.mapMerging(input.mergingType)
      st = `
        SELECT buckets.run_id,
               time_bucket('${input.bucketiseSeconds} seconds', time) as datetime,
               min(buckets.time_offset_secs)                     as time_offset_secs,
               ${mergingOp}(${input.display}) as value 
               ${includeMetrics ? `, metrics.metrics` : ""}
        FROM buckets
          ${includeMetrics ? "LEFT OUTER JOIN metrics ON buckets.run_id = metrics.run_id AND buckets.time_offset_secs = metrics.time_offset_secs" : ""}
        WHERE buckets.run_id in ('${runIds.join("','")}')
          AND buckets.time_offset_secs >= ${input.trimmingSeconds}
        GROUP BY run_id, datetime
        ORDER BY datetime ASC;`
    }
    else {
      st = `
        SELECT buckets.run_id,
               time as datetime,
                buckets.time_offset_secs,
               ${input.display} as value 
               ${includeMetrics ? `, metrics.metrics` : ""}
        FROM buckets
          ${includeMetrics ? "LEFT OUTER JOIN metrics ON buckets.run_id = metrics.run_id AND buckets.time_offset_secs = metrics.time_offset_secs" : ""}
        WHERE buckets.run_id in ('${runIds.join("','")}')
          AND buckets.time_offset_secs >= ${input.trimmingSeconds}
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

  async getRunsRaw(): Promise<Array<Record<string, unknown>>> {
    const st = `SELECT params::json FROM runs`;
    return await this.client.query(st);
  }

  private mapMerging(merging: MergingAlgorithm): string {
    let mergingOp;
    if (merging == MergingAlgorithm.AVERAGE) {
      mergingOp = 'avg';
    } else if (merging == MergingAlgorithm.MAXIMUM) {
      mergingOp = 'max';
    } else if (merging == MergingAlgorithm.MINIMUM) {
      mergingOp = 'min';
    } else if (merging == MergingAlgorithm.SUM) {
      mergingOp = 'sum';
    } else {
      throw new Error('Unknown merging type ' + merging);
    }
    return mergingOp;
  }

  /**
   * The Simplified display.
   */
  async getSimplifiedGraph(
    groupBy1: string,
    runIds: Array<string>,
    input: Input): Promise<Array<Result>> {
    const mergingOp = this.mapMerging(input.mergingType)

    let st;
    if (input.multipleResultsHandling == MultipleResultsHandling.SIDE_BY_SIDE) {
      st = `SELECT runs.id,
                   sub.value,
                   ${groupBy1} as grouping
            FROM (SELECT run_id,
                         ${mergingOp}(buckets.${input.display}) as value
                  FROM buckets join runs
                  on buckets.run_id = runs.id
                  WHERE run_id in ('${runIds.join("','")}')
                    AND buckets.time_offset_secs >= ${input.trimmingSeconds}
                  GROUP BY run_id) as sub
                   JOIN runs ON sub.run_id = runs.id
            ORDER BY grouping, datetime asc`;
    } else if (input.multipleResultsHandling == MultipleResultsHandling.MERGED) {
      st = `SELECT avg(sub.value) as value,
                   ${groupBy1} as grouping
            FROM (SELECT run_id,
                        ${mergingOp}(buckets.${input.display}) as value
                  FROM buckets join runs
                  on buckets.run_id = runs.id
                  WHERE run_id in ('${runIds.join("','")}')
                    AND buckets.time_offset_secs >= ${input.trimmingSeconds}
                  GROUP BY run_id) as sub
                   JOIN runs ON sub.run_id = runs.id
            GROUP BY grouping
            ORDER BY grouping`;
    } else {
      throw new Error('Unknown grouping_type ' + input.multipleResultsHandling);
    }
    console.info(st);
    const result = await this.client.query(st);
    return DatabaseService.sort(result.map((x) => new Result(x.grouping, x.value)), input)
  }

  private static sort(results: Result[], input: Input): Result[] {
    let resultType: HorizontalAxisType
    if (input.hAxis.type == 'dynamic') {
      const ha = input.hAxis as HorizontalAxisDynamic
      resultType = ha.resultType
    }

    results.sort((x, y) => {
      const a = x.grouping
      const b = y.grouping
      let out
      if (resultType == HorizontalAxisType.INTEGER) {
        out = Number.parseInt(a) - Number.parseInt(b)
      }
      else if (resultType == HorizontalAxisType.STRING) {
        out = (a as string).localeCompare(b as string)
      }
      else if (resultType == HorizontalAxisType.VERSION_SEMVER) {
        out = versionCompare(a as string, b as string)
      }

      console.info(`${a} vs ${b} with ${resultType} = ${out}`)

      return out
    })

    // results.forEach(v => console.info(`Post-sort: ${v.grouping} = ${v.value}`))

    return results
  }

  // cast (metrics::json->>'threadCount' as integer) > 100
  // 'Excessive thread count, max=' || max (cast (metrics::json->>'threadCount' as integer))
  async getMetricsAlerts(input: MetricsQuery, metrics: Metrics, table: string) {
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
    console.info(`Got ${result.length} alerts`)
    return result.map((x) => new MetricsResult(x.run_id, x.datetime, x.message, x.version, input.language));
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
