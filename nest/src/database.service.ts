import {Injectable} from '@nestjs/common';
import {Client} from 'pg';
import {
  DatabaseCompare,
  MultipleResultsHandling,
  MergingAlgorithm,
  Metrics,
  MetricsQuery,
  Input,
  ResultType,
  HorizontalAxisDynamic,
  VerticalAxisMetric, VerticalAxisBucketsColumn, SituationalRunQuery, SituationalRunAndRunQuery
} from "./dashboard.service";
import {versionCompare} from "./versions";

export class Run {
  params: Record<string, unknown>;
  cluster: Record<string, unknown>;
  impl: Record<string, unknown>;
  workload: Record<string, unknown>;
  vars: Record<string, unknown>;
  other: string;
  id: string;
  datetime: string;

  constructor(
    params: Record<string, unknown>,
    cluster: Record<string, unknown>,
    impl: Record<string, unknown>,
    workload: Record<string, unknown>,
    vars: Record<string, unknown>,
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
  value?: number;
  // Format: {"document_exists (105)": 4, "unambiguous_timeout (14)": 19}
  errors?: Record<string, unknown>;
  metrics?: string;

  constructor(
    runId: string,
    datetime: string,
    timeOffsetSecs: number,
    value: number,
    errors?: Record<string, unknown>,
    metrics?: string
  ) {
    this.runId = runId;
    this.datetime = datetime;
    this.timeOffsetSecs = timeOffsetSecs;
    this.value = value;
    this.errors = errors;
    this.metrics = metrics;
  }
}

export interface RunPlus extends Run {
  groupedBy: string; // "7.0.0-3756"
  color: string; // '#E2F0CB'
}

// Represents a bar on a barchart.
export class Result {
  // The x-axis.
  grouping: string;
  // The y-axis.
  value: number;
  // ['a6921d60-7f9a-44b5-8513-67697ce706d8']
  runIds: string[] | undefined;

  constructor(grouping: string, value: number, runIds: string[] = undefined) {
    this.grouping = grouping;
    this.value = value;
    this.runIds = runIds
  }
}

// This class holds the keys of the fields which runs should not have (i.e. Runs which have these fields will be exluded)
// Currently we use the value `null' to mark fields that should be excluded. This could change in the future.
class ExcludedDatabaseCompareFields {
  // An array containing the names of the cluster fields to be excluded
  cluster?: Array<string>;

  // An array containing the names of the implementation fields to be excluded
  impl?: Array<string>;

  // An array containing the names of the workload fields ot be excluded
  workload?: Array<string>;

  // An array containing the names of the variables to be excluded
  vars?: Array<string>;
}

@Injectable()
export class DatabaseService {
  constructor(private client: Client) {}

  /**
   * Used for both the Simplified and Full graphs.
   */
  async getRuns(compare: DatabaseCompare, groupBy: string): Promise<Array<Run>> {
    let excludedFields = this.findAndRemoveExcluded(compare);

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
    const label = "getRuns: " + st
    console.time(label);
    const rows = await this.client.query(st);
    console.timeEnd(label)

    let runs = rows.map((x) => {
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

    return runs.filter((x) => {return !this.containsExcludedFields(x, excludedFields)});
  }

  async getRunsById(runIds: Array<string>): Promise<Array<Run>> {
    const st = `SELECT
                        params as params,
                        id as run_id,
                        datetime
                      FROM runs
                WHERE id in ('${runIds.join("','")}')`;
    const label = "getRunsById: " + st
    console.time(label);
    const result = await this.client.query(st);
    console.timeEnd(label)

    return result.map((x) => {
      return new Run(
          x.params,
          x.params.cluster,
          x.params.impl,
          x.params.workload,
          x.params.vars,
          x.params.other,
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
    input: Input,
    includeDataColumn: string,
    includeMetrics: boolean,
    includeErrors: boolean): Promise<Array<RunBucketPair>> {
    let st;
    if (input.bucketiseSeconds > 1) {
      // Metrics could be grouped now, see the error handling
      includeMetrics = false
      const mergingOp = this.mapMerging(input.mergingType)
      st = `
        SELECT buckets.run_id,
               time_bucket('${input.bucketiseSeconds} seconds', time) as datetime,
               min(buckets.time_offset_secs)                     as time_offset_secs
               ${includeDataColumn ? `, ${mergingOp}(${includeDataColumn}) as value` : ""} 
               ${includeErrors ? `, SUM(CASE WHEN jsonb_typeof(buckets.errors) = 'object' THEN (value::int) ELSE 0 END) as errors` : ""}
               ${includeMetrics ? `, metrics.metrics` : ""}
        FROM buckets
          ${includeMetrics ? "LEFT OUTER JOIN metrics ON buckets.run_id = metrics.run_id AND buckets.time_offset_secs = metrics.time_offset_secs" : ""}
        LEFT JOIN LATERAL jsonb_each_text(CASE WHEN jsonb_typeof(buckets.errors) = 'object' THEN buckets.errors ELSE '{}'::jsonb END) ON TRUE
        WHERE buckets.run_id in ('${runIds.join("','")}')
          AND buckets.time_offset_secs >= ${input.trimmingSeconds}
        GROUP BY run_id, datetime
        ORDER BY datetime ASC;`
    }
    else {
      st = `
        SELECT buckets.run_id,
               time as datetime,
                buckets.time_offset_secs
               ${includeDataColumn ? `, ${includeDataColumn} as value` : ""}
               ${includeErrors ? `, errors` : ""}
               ${includeMetrics ? `, metrics.metrics` : ""}
        FROM buckets
          ${includeMetrics ? "LEFT OUTER JOIN metrics ON buckets.run_id = metrics.run_id AND buckets.time_offset_secs = metrics.time_offset_secs" : ""}
        WHERE buckets.run_id in ('${runIds.join("','")}')
          AND buckets.time_offset_secs >= ${input.trimmingSeconds}
        ORDER BY datetime ASC;`
    }

    const label = "getRunsWithBuckets: " + st
    console.time(label);
    try {
      const result = await this.client.query(st);
      console.timeEnd(label);

      return result.map((x) => {
        return new RunBucketPair(
            x.run_id,
            x.datetime,
            parseInt(x.time_offset_secs),
            x.value,
            x.errors,
            x.metrics
        );
      });
    }
    catch (err) {
      console.error(`Query ${st} failed with: ${err}`)
      throw err
    }
  }

  async getRunsRaw(): Promise<Array<Record<string, unknown>>> {
    const st = `SELECT params::json FROM runs`;
    return await this.client.query(st);
  }

  /**
   * Given a record, it finds all entries where the value is null, removes them and returns
   * an array containing the keys of those entries
   */
  private findAndRemoveNull(record: Record<string, unknown>): Array<string> {
    let res = []
    for (let key in record) {
      if (record[key] === null) {
        res.push(key)
      }
    }
    res.forEach((key) => {delete record[key]})
    return res
  }

  /**
   * Finds and removes the fields that are required to be excluded
   */
  private findAndRemoveExcluded(compare: DatabaseCompare): ExcludedDatabaseCompareFields {
    let res = new ExcludedDatabaseCompareFields()

    if (compare?.cluster) {
      res.cluster = this.findAndRemoveNull(compare.cluster)
    }
    if (compare?.impl) {
      res.impl = this.findAndRemoveNull(compare.impl)
    }
    if (compare?.vars) {
      res.vars = this.findAndRemoveNull(compare.vars)
    }
    if (compare?.workload) {
      res.workload = this.findAndRemoveNull(compare.workload)
    }
    return res
  }

  /**
   * Checks if the given run contains any of the excluded fields
   */
  private containsExcludedFields(run: Run, excluded: ExcludedDatabaseCompareFields): boolean {
    if (excluded?.cluster && this.containsAnyKey(run.cluster, excluded.cluster)) {
      return true
    }
    if (excluded?.impl && this.containsAnyKey(run.impl, excluded.impl)) {
      return true
    }
    if (excluded?.vars && this.containsAnyKey(run.vars, excluded.vars)) {
      return true
    }
    if (excluded?.workload && this.containsAnyKey(run.workload, excluded.workload)) {
      return true
    }

    return false
  }

  /**
   * Checks if the record contains any of the keys in the given array
   */
  private containsAnyKey(record: Record<string, unknown>, keys: Array<string>) {
    return keys.some((k) => k in record)
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
   * The Simplified display (bar graph).
   */
  async getSimplifiedGraph(
    groupBy1: string,
    runIds: Array<string>,
    input: Input,
    yAxis: VerticalAxisBucketsColumn): Promise<Array<Result>> {
    const mergingOp = this.mapMerging(input.mergingType)

    let st;
    if (input.multipleResultsHandling == MultipleResultsHandling.SIDE_BY_SIDE) {
      st = `SELECT runs.id,
                   sub.value,
                   ${groupBy1} as grouping
            FROM (SELECT run_id,
                         ${mergingOp}(buckets.${yAxis.column}) as value
                  FROM buckets join runs
                  on buckets.run_id = runs.id
                  WHERE run_id in ('${runIds.join("','")}')
                    AND buckets.time_offset_secs >= ${input.trimmingSeconds}
                  GROUP BY run_id) as sub
                   JOIN runs ON sub.run_id = runs.id
            ORDER BY grouping, datetime asc`;
    } else if (input.multipleResultsHandling == MultipleResultsHandling.MERGED) {
      st = `SELECT array_agg(run_id) as run_ids,
                   avg(sub.value) as value,
                   ${groupBy1} as grouping
            FROM (SELECT run_id,
                        ${mergingOp}(buckets.${yAxis.column}) as value
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
    const label = "getSimplifiedGraph: " + st
    console.time(label);
    const result = await this.client.query(st);
    console.timeEnd(label);

    return DatabaseService.sort(result.map((x) => new Result(x.grouping, x.value, x.run_ids)), input)
  }

  async getSimplifiedGraphForMetric(runIds: readonly string[],
                                    hAxis: HorizontalAxisDynamic,
                                    yAxis: VerticalAxisMetric,
                                    input: Input): Promise<Array<Result>> {
    const mergingOp = this.mapMerging(input.mergingType)

    let st;
    if (input.multipleResultsHandling == MultipleResultsHandling.SIDE_BY_SIDE) {
      // Can get it working later if needed
      throw "Unsupported currently"
    } else if (input.multipleResultsHandling == MultipleResultsHandling.MERGED) {
      st = `WITH 

        /* We've already found the relevant runs */
        r AS (SELECT * FROM runs WHERE id in ('${runIds.join("','")}')),

        /* Join with metrics.  Should really be driven by hAxis but have just hardcoded it to return SDK versions for now. */
        joined AS (SELECT params::jsonb->'impl'->>'version' AS groupBy, CAST(metrics.metrics::jsonb->>'${yAxis.metric}' AS FLOAT) AS metric FROM metrics JOIN r ON metrics.run_id = r.id)

        /* Group for the h-axis */
        SELECT groupBy AS grouping, ${mergingOp}(metric) AS value FROM joined GROUP BY groupBy;
        `
    } else {
      throw new Error('Unknown grouping_type ' + input.multipleResultsHandling);
    }
    const label = "getSimplifiedGraphForMetric: " + st
    console.time(label);
    const result = await this.client.query(st);
    console.timeEnd(label);

    return DatabaseService.sort(result.map((x) => new Result(x.grouping, x.value)), input);
  }

  private static sort(results: Result[], input: Input): Result[] {
    let resultType: ResultType
    if (input.hAxis.type == 'dynamic') {
      const ha = input.hAxis as HorizontalAxisDynamic
      resultType = ha.resultType
    }

    results.sort((x, y) => {
      const a = x.grouping
      const b = y.grouping
      let out
      if (resultType == ResultType.INTEGER) {
        out = Number.parseInt(a) - Number.parseInt(b)
      }
      else if (resultType == ResultType.STRING) {
        out = (a as string).localeCompare(b as string)
      }
      else if (resultType == ResultType.VERSION_SEMVER) {
        out = versionCompare(a as string, b as string)
      }

      // console.info(`${a} vs ${b} with ${resultType} = ${out}`)

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

    const label = "getMetricsAlerts: " + st
    console.time(label);
    const result = await this.client.query(st);
    console.timeEnd(label)
    return result.map((x) => new MetricsResult(x.run_id, x.datetime, x.message, x.version, input.language));
  }

  async getSituationalRuns(): Promise<SituationalRun[]> {
    const st = `
        WITH

            /* Get all situational runs */
            sr AS (SELECT id, datetime FROM situational_runs),

            /* Join the situational runs with its runs.  So this table will have multiple rows per situational run */
            joined AS (SELECT srj.situational_run_id,
                              srj.params as situational_run_params,
                              r.id       as run_id,
                              r.datetime,
                              r.params   as run_params
                       FROM runs AS r
                                JOIN situational_run_join AS srj ON srj.run_id = r.id),


            /* Get the number of runs for each situational run, and details of any one of those runs.
               We only need one of the runs for most things as most info should be the same - SDK, version, etc. */
            out AS (SELECT j.situational_run_id,
                           min(j.datetime)                 as started,
                           count(*)                        as num_runs,
                           min(cast(j.run_params as text))::jsonb as details_of_any_run,
                           SUM(cast(situational_run_params::jsonb->>'score' as integer)) as score
                    FROM joined AS j
                    GROUP BY j.situational_run_id
                    ORDER BY started DESC)

        SELECT *
        FROM out;
    `

    const label = "getSituationalRuns: " + st
    console.time(label);
    const result = await this.client.query(st);
    console.timeEnd(label);

    return result.map(x => new SituationalRun(x.situational_run_id, x.started, x.score, x.num_runs, x.details_of_any_run))
  }

  async getSituationalRun(query: SituationalRunQuery): Promise<SituationalRunResults> {
    const st = `
        SELECT r.id,
               r.datetime,
               r.params as run_params,
               srj.params as srj_params
        FROM runs AS r
                 LEFT OUTER JOIN situational_run_join AS srj ON srj.run_id = r.id
        WHERE srj.situational_run_id = '${query.situationalRunId}';    `

    const label = "getSituationalRun: " + st
    console.time(label);
    const result = await this.client.query(st);
    console.timeEnd(label);

    const mapped = result.map(x => new RunAndSituationalScore(x.id, x.datetime, x.run_params, x.srj_params))
    return new SituationalRunResults(query.situationalRunId, mapped);
  }

  async getSituationalRunRun(query: SituationalRunAndRunQuery): Promise<SituationalRunResults> {
    const st = `
        SELECT r.id,
               r.datetime,
               r.params as run_params,
               srj.params as srj_params
        FROM runs AS r
                 LEFT OUTER JOIN situational_run_join AS srj ON srj.run_id = r.id
        WHERE srj.situational_run_id = '${query.situationalRunId}'
        AND r.id = '${query.runId}';    `

    const label = "getSituationalRunRun: " + st
    console.time(label);
    const result = await this.client.query(st);
    console.timeEnd(label);

    const mapped = result.map(x => new RunAndSituationalScore(x.id, x.datetime, x.run_params, x.srj_params))
    return new SituationalRunResults(query.situationalRunId, mapped);
  }

  async getEvents(runId: string, firstBucketTime, displayOnGraphOnly: boolean): Promise<RunEvent[]> {
    const st = `
        SELECT r.datetime,
               r.params
        FROM run_events AS r
        WHERE r.run_id = '${runId}'
            ${displayOnGraphOnly ? ` AND cast(params::jsonb->>'displayOnGraph' as bool) = true` : ''};`

    const label = "getEvents: " + st
    console.time(label);
    const result = await this.client.query(st);
    console.timeEnd(label);

    return result.map(x => {
      return new RunEvent(x.datetime, (x.datetime - firstBucketTime) / 1000, x.params)
    })
  }
}

export class RunEvent {
  readonly datetime: string;
  readonly timeOffsetSecs: number;
  readonly params: Record<string, unknown>;

  constructor(datetime: string, timeOffsetSecs: number, params: Record<string, unknown>) {
    this.datetime = datetime;
    this.timeOffsetSecs = timeOffsetSecs;
    this.params = params;
  }
}

export class SituationalRun {
  readonly situationalRunId: string;
  readonly started: string;
  readonly score: number;
  readonly numRuns: number;
  readonly detailsOfAnyRun: Record<string, unknown>;

  constructor(situationalRunId: string, started: string, score: number, numRuns: number, detailsOfAnyRun: Record<string, unknown>) {
    this.situationalRunId = situationalRunId;
    this.started = started;
    this.score = score;
    this.numRuns = numRuns;
    this.detailsOfAnyRun = detailsOfAnyRun;
  }
}

class RunAndSituationalScore {
  readonly runId: string;
  readonly started: string;
  // Params related to the run, e.g. "{"impl": {"version": "3.4.4", "language": "Java"}"
  readonly runParams: Record<string, unknown>;
  // Params related to this run+situational run, e.g. {"score": 100}
  readonly srjParams: Record<string, unknown>;

  constructor(runId: string, started: string, runParams: Record<string, unknown>, srjParams: Record<string, unknown>) {
    this.runId = runId;
    this.started = started;
    this.runParams = runParams;
    this.srjParams = srjParams;
  }
}

export class SituationalRunResults {
  readonly situationalRunId: string;
  readonly runs: RunAndSituationalScore[];

  constructor(situationalRunId: string, runs: RunAndSituationalScore[]) {
    this.situationalRunId = situationalRunId;
    this.runs = runs;
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
