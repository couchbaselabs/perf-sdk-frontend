import {Injectable} from '@nestjs/common';
import {Client} from 'pg';
import {DatabaseCompare, MultipleResultsHandling, MergingAlgorithm, Metrics, MetricsQuery} from "./dashboard.service";

const semver = require('semver');

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
   * Returns all runs that match, together with the bucket data for each.
   * Used for building the Full line graph.
   */
  async getRunsWithBuckets(
    runIds: Array<string>,
    display: string,
    trimmingSeconds: number,
    includeMetrics: boolean,
    merging: MergingAlgorithm,
    bucketiseSeconds?: number): Promise<Array<RunBucketPair>> {
    let st;
    if (bucketiseSeconds != null && bucketiseSeconds > 1) {
      // Not sure how to group the metrics, would require some complex JSON processing
      includeMetrics = false
      const mergingOp = this.mapMerging(merging)
      st = `
        SELECT buckets.run_id,
               time_bucket('${bucketiseSeconds} seconds', time) as datetime,
               min(buckets.time_offset_secs)                     as time_offset_secs,
               ${mergingOp}(${display}) as value 
               ${includeMetrics ? `, metrics.metrics` : ""}
        FROM buckets
          ${includeMetrics ? "LEFT OUTER JOIN metrics ON buckets.run_id = metrics.run_id AND buckets.time_offset_secs = metrics.time_offset_secs" : ""}
        WHERE buckets.run_id in ('${runIds.join("','")}')
          AND buckets.time_offset_secs >= ${trimmingSeconds}
        GROUP BY run_id, datetime
        ORDER BY datetime ASC;`
    }
    else {
      st = `
        SELECT buckets.run_id,
               time as datetime,
                buckets.time_offset_secs,
               ${display} as value 
               ${includeMetrics ? `, metrics.metrics` : ""}
        FROM buckets
          ${includeMetrics ? "LEFT OUTER JOIN metrics ON buckets.run_id = metrics.run_id AND buckets.time_offset_secs = metrics.time_offset_secs" : ""}
        WHERE buckets.run_id in ('${runIds.join("','")}')
          AND buckets.time_offset_secs >= ${trimmingSeconds}
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
  async getGroupings(
    groupBy1: string,
    runIds: Array<string>,
    display: string,
    multipleResultsHandling: MultipleResultsHandling,
    merging: MergingAlgorithm,
    trimming_seconds: number): Promise<Array<Result>> {
    const mergingOp = this.mapMerging(merging)

    let st;
    if (multipleResultsHandling == MultipleResultsHandling.SIDE_BY_SIDE) {
      st = `SELECT runs.id,
                   sub.value,
                   ${groupBy1} as grouping
            FROM (SELECT run_id,
                         ${mergingOp}(buckets.${display}) as value
                  FROM buckets join runs
                  on buckets.run_id = runs.id
                  WHERE run_id in ('${runIds.join("','")}')
                    AND buckets.time_offset_secs >= ${trimming_seconds}
                  GROUP BY run_id) as sub
                   JOIN runs ON sub.run_id = runs.id
            ORDER BY grouping, datetime asc`;
    } else if (multipleResultsHandling == MultipleResultsHandling.MERGED) {
      st = `SELECT avg(sub.value) as value,
                   ${groupBy1} as grouping
            FROM (SELECT run_id,
                        ${mergingOp}(buckets.${display}) as value
                  FROM buckets join runs
                  on buckets.run_id = runs.id
                  WHERE run_id in ('${runIds.join("','")}')
                    AND buckets.time_offset_secs >= ${trimming_seconds}
                  GROUP BY run_id) as sub
                   JOIN runs ON sub.run_id = runs.id
            GROUP BY grouping
            ORDER BY grouping`;
    } else {
      throw new Error('Unknown grouping_type ' + multipleResultsHandling);
    }
    console.info(st);
    const result = await this.client.query(st);
    return result.map((x) => new Result(x.grouping, x.value));
  }

  /**
   * The Simplified display for group_by = variables.com.couchbase.protostellar.executorMaxThreadCount.
   *
   * params.workload.settings.variables is an array so we have to do some non-trivial JSON fiddling to find the specific variable.
   * Would be easier if it was an object and might make that change in future.
   * That could also possibly allow removing this special case get_groupings_for_variables.
   */
  async getGroupingsForVariables(
      groupBy1: string,
      groupBy: string,
      runIds: Array<string>,
      display: string,
      multipleResultsHandling: MultipleResultsHandling,
      merging: MergingAlgorithm,
      trimmingSeconds: number): Promise<Array<Result>> {
    const mergingOp = this.mapMerging(merging)

    let st;
    if (multipleResultsHandling == MultipleResultsHandling.SIDE_BY_SIDE) {
      // Can get it working later if needed
      throw "Unsupported currently"
    } else if (multipleResultsHandling == MultipleResultsHandling.MERGED) {
      st = `WITH 

        /* We've already found the relevant runs */
        relevant_runs AS (SELECT * FROM runs WHERE id in ('${runIds.join("','")}')),
        
        /* Expand the variables array */
        expanded_variables AS (SELECT id, json_array_elements(params::json->'workload'->'settings'->'variables') AS var FROM relevant_runs),
        
        /* Find the correct variable from the variables array */
        correct_variable_selected AS (SELECT id, var from expanded_variables WHERE var->>'name'='${groupBy}'),
        
        /* Extract the value */
        extracted_value AS (SELECT id, var->>'value' as value FROM correct_variable_selected),
        
        /* Join with buckets */
        joined_with_buckets AS (SELECT ${mergingOp}(buckets.${display}) AS value,
                                /* Handle true/false tests, convert to int */
                                (CASE WHEN extracted_value.value = 'true' THEN 1
                                    WHEN extracted_value.value = 'false' THEN 0
                                    ELSE extracted_value.value::integer
                                END) AS grouping
                          FROM buckets JOIN extracted_value ON buckets.run_id = extracted_value.id
                          WHERE buckets.time_offset_secs >= ${trimmingSeconds}
                          GROUP BY value, grouping)

        /* Cannot group by ::int as it breaks on true/false tests */
        SELECT * from joined_with_buckets ORDER BY grouping::int;
        `
    } else {
      throw new Error('Unknown grouping_type ' + multipleResultsHandling);
    }
    console.info(st);
    const result = await this.client.query(st);
    return result.map((x) => new Result(x.grouping, x.value));
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
