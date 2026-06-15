import {Pool} from 'pg';
import {
  DatabaseCompare,
  MultipleResultsHandling,
  MergingAlgorithm,
  Metrics,
  MetricsQuery,
  Input,
  ResultType,
  HorizontalAxisDynamic,
  VerticalAxisMetric, 
  VerticalAxisBucketsColumn, 
  SituationalRunQuery, 
  SituationalRunAndRunQuery
} from "./dashboard/dashboard-query-types";
import { versionCompare } from "./core-ui-utilities";
import { buildSimplifiedGraphQuery, buildSimplifiedMetricQuery, buildRunsWithBucketsQuery, buildRunsWithMetricsQuery } from '@/src/lib/dashboard/graph-builders'
import { logger } from '@/src/lib/utils/logger'

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

  constructor(grouping: string, value: number, runIds?: string[]) {
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

export class RunMetricPair {
  runId: string;
  datetime: string;
  timeOffsetSecs: number;
  value: number;
  metrics: Record<string, any>;

  constructor(
    runId: string,
    datetime: string,
    timeOffsetSecs: number,
    metricValue: number,
    metrics: Record<string, any>
  ) {
    this.runId = runId;
    this.datetime = datetime;
    this.timeOffsetSecs = timeOffsetSecs;
    this.value = metricValue;
    this.metrics = metrics;
  }
}

interface MetricsData {
  timeOffset: number;
  timestamp: Date;
  [key: string]: any;
}

export class DatabaseService {
  constructor(public pool: Pool) {}

  // Short-lived cache for getRuns results. The performance dashboard fires ~14
  // chart queries per SDK switch and several of them request the exact same run
  // set (same SDK, cluster and grouping). Caching the in-flight promise both
  // de-duplicates those concurrent calls (single-flight) and serves repeats for a
  // few seconds. Run data is append-only history, so brief staleness is harmless.
  // Keyed on the compare object as received, before null fields are stripped.
  private getRunsCache = new Map<string, { expires: number; promise: Promise<Array<Run>> }>()
  private static readonly GET_RUNS_CACHE_TTL_MS = 30_000

  /**
   * Used for both the Simplified and Full graphs. Thin caching and
   * de-duplicating wrapper around getRunsUncached.
   */
  async getRuns(compare: DatabaseCompare, groupBy: string): Promise<Array<Run>> {
    const key = `${JSON.stringify(compare)}|${groupBy}`
    const now = Date.now()

    const cached = this.getRunsCache.get(key)
    if (cached && cached.expires > now) {
      logger.debug(`getRuns cache hit`, { key })
      return cached.promise
    }

    const promise = this.getRunsUncached(compare, groupBy)
    this.getRunsCache.set(key, { expires: now + DatabaseService.GET_RUNS_CACHE_TTL_MS, promise })

    // Never cache a failure: drop the entry on rejection so the next call retries.
    promise.catch(() => {
      const current = this.getRunsCache.get(key)
      if (current && current.promise === promise) {
        this.getRunsCache.delete(key)
      }
    })

    return promise
  }

  private async getRunsUncached(compare: DatabaseCompare, groupBy: string): Promise<Array<Run>> {
    logger.debug(`getRuns called with:`, {
      compare: JSON.stringify(compare, null, 2),
      groupBy: groupBy
    })
    
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
    
    logger.debug(`getRuns SQL:`, st)
    
    const label = "getRuns: " + st
    logger.time(label);
    const rows = await this.pool.query(st);
    logger.timeEnd(label)
    
    let runs = rows.rows.map((x: any) => {
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

    const filteredRuns = runs.filter((x) => {return !this.containsExcludedFields(x, excludedFields)});
    
    logger.info(`getRuns returned ${filteredRuns.length} runs, first few:`, filteredRuns.slice(0, 5).map(r => ({
      id: r.id,
      version: (r.impl as any)?.version,
      language: (r.impl as any)?.language,
      datetime: r.datetime
    })))
    
    return filteredRuns;
  }

  async getRunsById(runIds: Array<string>): Promise<Array<Run>> {
    const st = `SELECT
                        params as params,
                        id as run_id,
                        datetime
                      FROM runs
                WHERE id in ('${runIds.join("','")}')`;
    const label = "getRunsById: " + st
    logger.time(label);
    const result = await this.pool.query(st);
    logger.timeEnd(label)

    return result.rows.map((x: any) => {
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

  async getRunsRaw(): Promise<Array<Record<string, unknown>>> {
    const st = `SELECT params::json FROM runs`;
    const result = await this.pool.query(st);
    return result.rows;
  }

  async getRunsComplete(): Promise<Array<Record<string, unknown>>> {
    const st = `SELECT id, params::json as params, datetime FROM runs`;
    const result = await this.pool.query(st);
    return result.rows;
  }

  // Optimized filtered runs query to avoid in-memory filtering in API route
  async getRunsFiltered(options: {
    sdk?: string
    excludeSnapshots?: boolean
    excludeGerrit?: boolean
    limit?: number
  }): Promise<Array<{ id: string; datetime: string; params: any }>> {
    const conditions: string[] = []
    const params: any[] = []

    if (options.sdk) {
      params.push(options.sdk)
      conditions.push(`params->'impl'->>'language' = $${params.length}`)
    }
    if (options.excludeSnapshots) {
      conditions.push(`NOT (params->'impl'->>'version' LIKE '%-%')`)
    }
    if (options.excludeGerrit) {
      conditions.push(`NOT (params->'impl'->>'version' LIKE 'refs/%')`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = options.limit && Number.isFinite(options.limit) ? `LIMIT ${Number(options.limit)}` : ''

    const st = `
      SELECT id, params::json as params, datetime
      FROM runs
      ${whereClause}
      ORDER BY datetime DESC
      ${limitClause}
    `

    const result = await this.pool.query(st, params)
    return result.rows
  }

  // Optimized method to get distinct SDK versions without loading all data
  async getDistinctSdkVersions(excludeSnapshots: boolean = false, excludeGerrit: boolean = false): Promise<string[]> {
    const conditions: string[] = ["params->'impl'->>'version' IS NOT NULL"];
    
    if (excludeSnapshots) {
      conditions.push("NOT (params->'impl'->>'version' LIKE '%-%')");
    }
    if (excludeGerrit) {
      conditions.push("NOT (params->'impl'->>'version' LIKE 'refs/%')");
    }

    const st = `
      SELECT DISTINCT params->'impl'->>'version' as version 
      FROM runs 
      WHERE ${conditions.join(' AND ')}
      ORDER BY version
    `;
    
    const result = await this.pool.query(st);
    return result.rows.map(row => row.version).filter(v => v);
  }

  // Optimized method to get distinct cluster versions without loading all data  
  async getDistinctClusterVersions(): Promise<string[]> {
    const st = `
      SELECT DISTINCT params->'cluster'->>'version' as version 
      FROM runs 
      WHERE params->'cluster'->>'version' IS NOT NULL
      ORDER BY version
    `;
    
    const result = await this.pool.query(st);
    return result.rows.map(row => row.version).filter(v => v);
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
    const st = buildSimplifiedGraphQuery(groupBy1, runIds, input, yAxis)
    
    const label = "getSimplifiedGraph: " + st
    logger.time(label);
    const result = await this.pool.query(st);
    logger.timeEnd(label);

    return DatabaseService.sort(result.rows.map((x: any) => new Result(x.grouping, x.value, x.run_ids)), input)
  }

  /**
   * Combined run-selection + Simplified bar aggregation in a single query.
   *
   * For the common filterRuns="All" buckets path the run selection is purely
   * row-level (containment + gerrit/snapshot/excluded-field filters), so the bar
   * aggregation can filter inline via a CTE instead of waiting for getRuns to
   * return run ids in a separate round-trip. This is only equivalent for "All";
   * the semver "latest" filtering stays in the two-query getRuns path.
   */
  async getSimplifiedGraphAll(
    compareInput: DatabaseCompare,
    groupByPath: string,
    groupByDbField: string,
    input: Input,
    yAxis: VerticalAxisBucketsColumn): Promise<Array<Result>> {
    // Clone so we never mutate the caller's compare (getRuns may use it in parallel).
    const compare: DatabaseCompare = JSON.parse(JSON.stringify(compareInput))
    const excluded = this.findAndRemoveExcluded(compare)

    const mergingOp = this.mapMerging(input.mergingType as unknown as MergingAlgorithm)
    const columnName = yAxis.column

    // Row-level filters mirroring filterRuns() for the "All" case.
    const filters: string[] = []
    if (input.excludeGerrit) filters.push(`NOT (params->'impl'->>'version' LIKE 'refs/%')`)
    if (input.excludeSnapshots) filters.push(`NOT (params->'impl'->>'version' LIKE '%-%')`)
    const addExcluded = (section: string, keys?: string[]) =>
      (keys || []).forEach(k => filters.push(`NOT COALESCE(params->'${section}' ? '${k}', false)`))
    addExcluded('cluster', excluded.cluster)
    addExcluded('impl', excluded.impl)
    addExcluded('vars', excluded.vars)
    addExcluded('workload', excluded.workload)
    const filterClause = filters.length ? ` AND ${filters.join(' AND ')}` : ''

    const st = `
        WITH matched AS (
          SELECT id, params
          FROM runs
          WHERE params @> ('${JSON.stringify(compare)}'::jsonb #- '${groupByPath}')${filterClause}
        )
        SELECT array_agg(run_id) as run_ids,
               avg(sub.value) as value,
               ${groupByDbField} as grouping
        FROM (SELECT run_id, ${mergingOp}(buckets.${columnName}) as value
              FROM buckets JOIN matched ON buckets.run_id = matched.id
              WHERE buckets.time_offset_secs >= ${input.trimmingSeconds}
              GROUP BY run_id) as sub
        JOIN matched ON sub.run_id = matched.id
        GROUP BY grouping
        ORDER BY grouping`

    const label = "getSimplifiedGraphAll"
    logger.time(label);
    const result = await this.pool.query(st);
    logger.timeEnd(label);

    return DatabaseService.sort(result.rows.map((x: any) => new Result(x.grouping, x.value, x.run_ids)), input)
  }

  async getSimplifiedGraphForMetric(runIds: readonly string[],
                                    hAxis: HorizontalAxisDynamic,
                                    yAxis: VerticalAxisMetric,
                                    input: Input): Promise<Array<Result>> {
    const st = buildSimplifiedMetricQuery(runIds, hAxis, yAxis, input)
    const label = "getSimplifiedGraphForMetric: " + st
    logger.time(label);
    const result = await this.pool.query(st);
    logger.timeEnd(label);

    return DatabaseService.sort(result.rows.map((x: any) => new Result(x.grouping, x.value)), input);
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
    const st = buildRunsWithBucketsQuery(runIds, input, includeDataColumn, includeMetrics, includeErrors)

    const label = "getRunsWithBuckets: " + st
    logger.time(label);
    try {
      const result = await this.pool.query(st, [runIds, input.trimmingSeconds]);
      logger.timeEnd(label);

      return result.rows.map((x: any) => {
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
       logger.error(`Query ${st} failed`, err)
      throw err
    }
  }

  async getRunsWithMetrics(
    runIds: Array<string>,
    input: Input,
    metricName: string
  ): Promise<Array<RunMetricPair>> {
    const st = buildRunsWithMetricsQuery(input, metricName)

    try {
      const result = await this.pool.query(st, [runIds]);
      return result.rows.map((x: any) => {
        return new RunMetricPair(
          x.run_id,
          x.datetime,
          parseInt(x.time_offset_secs),
          parseFloat(x.value),
          x.metrics
        );
      });
    } catch (err) {
      logger.error(`Query ${st} failed`, err)
      throw err;
    }
  }

  async getEventsCount(runId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM run_events WHERE run_id = $1`,
      [runId]
    )
    return parseInt(result.rows[0].count, 10)
  }

  async getEvents(runId: string, firstBucketTime: any, displayOnGraphOnly: boolean, limit?: number, offset?: number): Promise<RunEvent[]> {
    const paginate = typeof limit === 'number'
    const graphFilter = displayOnGraphOnly ? `AND cast(params::jsonb->>'displayOnGraph' as bool) = true` : ''
    const pagination = paginate ? 'LIMIT $2 OFFSET $3' : ''
    const params = paginate ? [runId, limit, offset ?? 0] : [runId]

    const st = `
        SELECT r.datetime,
               r.params
        FROM run_events AS r
        WHERE r.run_id = $1 ${graphFilter}
        ORDER BY r.datetime ASC, r.ctid ASC ${pagination}`

    const label = "getEvents: " + st
    logger.time(label);
    const result = await this.pool.query(st, params);
    logger.timeEnd(label);

    return result.rows.map((x: any) => {
      const dtMs = new Date(x.datetime).getTime()
      const base = (typeof firstBucketTime === 'number' && Number.isFinite(firstBucketTime)) ? firstBucketTime : NaN
      let offsetSecs = (Number.isFinite(dtMs) && Number.isFinite(base)) ? ((dtMs - base) / 1000) : 0
      // Allow negative offsets (events before first bucket); round to nearest second
      if (!Number.isFinite(offsetSecs)) offsetSecs = 0
      else offsetSecs = Math.round(offsetSecs)
      return new RunEvent(x.datetime, offsetSecs, x.params)
    })
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
    logger.time(label);
    const result = await this.pool.query(st);
    logger.timeEnd(label)
    return result.rows.map((x: any) => new MetricsResult(x.run_id, x.datetime, x.message, x.version, input.language));
  }

  async getSituationalRuns(opts?: { limit?: number; offset?: number; language?: string }): Promise<SituationalRun[]> {
    const values: any[] = []

    // Optional server-side SDK filter, mirroring the client sdkMatchesLanguage()
    // logic so the dropdown/sidebar SDK selection narrows the query itself
    // instead of downloading every SDK's runs and filtering in the browser.
    let where = ''
    if (opts?.language) {
      values.push(opts.language)
      const p = `$${values.length}`
      const lang = `details_of_any_run->'impl'->>'language'`
      const conds = [
        `lower(${lang}) = lower(${p})`,                              // go, Go, GO
        `upper(${lang}) = 'COLUMNAR_SDK_' || upper(${p})`,           // COLUMNAR_SDK_GO
        `lower(${lang}) = lower(${p}) || '-sdk'`,                    // java-sdk
      ]
      const low = opts.language.toLowerCase()
      if (low === 'node') {
        conds.push(`lower(${lang}) = 'nodejs'`)
        conds.push(`upper(${lang}) in ('COLUMNAR_SDK_NODE','COLUMNAR_SDK_NODEJS')`)
      }
      if (low === 'dotnet') {
        conds.push(`lower(${lang}) in ('.net','csharp','c#')`)
        conds.push(`upper(${lang}) in ('COLUMNAR_SDK_.NET','COLUMNAR_SDK_DOTNET')`)
      }
      where = `WHERE (${conds.join(' OR ')})`
    }

    let limitOffset = ''
    if (typeof opts?.limit === 'number') {
      values.push(opts.limit)
      limitOffset += ` LIMIT $${values.length}`
    }
    if (typeof opts?.offset === 'number' && opts.offset > 0) {
      values.push(opts.offset)
      limitOffset += ` OFFSET $${values.length}`
    }

    const st = `
        WITH
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
                    GROUP BY j.situational_run_id)

        SELECT *
        FROM out
        ${where}
        ORDER BY started DESC${limitOffset};
    `

    const label = "getSituationalRuns"
    logger.time(label);
    const result = await this.pool.query(st, values);
    logger.timeEnd(label);

    return result.rows.map((x: any) => new SituationalRun(x.situational_run_id, x.started, x.score, x.num_runs, x.details_of_any_run))
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
    logger.time(label);
    const result = await this.pool.query(st);
    logger.timeEnd(label);

    const mapped = result.rows.map((x: any) => new RunAndSituationalScore(x.id, x.datetime, x.run_params, x.srj_params))
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
    const result = await this.pool.query(st);
    console.timeEnd(label);

    const mapped = result.rows.map((x: any) => new RunAndSituationalScore(x.id, x.datetime, x.run_params, x.srj_params))
    return new SituationalRunResults(query.situationalRunId, mapped);
  }

  async getAllMetricNames(): Promise<string[]> {
    const query = `
      SELECT DISTINCT jsonb_object_keys(metrics::jsonb) as metric_name
      FROM metrics
      WHERE metrics IS NOT NULL;
    `;

    try {
      const result = await this.pool.query(query);
      
      if (!result || result.rows.length === 0) {
        logger.info('No metrics found')
        return [];
      }

      // Extract metric names and filter out non-metric fields
      const metricNames = result.rows
        .map((row: any) => row.metric_name)
        .filter((name: string) => 
          name !== 'timeOffset' && 
          name !== 'timestamp' && 
          name !== 'time_offset_secs' && 
          name !== 'initiated'
        );
      return metricNames;

    } catch (error) {
      return [];
    }
  }

  // Calculate metrics for specific run IDs with trimming (consistent with chart logic)
  async getRunMetrics(runIds: string[], trimmingSeconds: number = 20): Promise<Record<string, any>> {
    const query = `
      SELECT 
        run_id,
        AVG(duration_average_us) as duration_avg,
        MIN(duration_average_us) as duration_min,
        MAX(duration_average_us) as duration_max,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_average_us) as duration_p50,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_average_us) as duration_p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_average_us) as duration_p99,
        SUM(operations_total) as operations_total,
        SUM(operations_success) as operations_success,
        SUM(operations_failed) as operations_failed,
        AVG(operations_total / NULLIF(time_offset_secs, 0)) as throughput
      FROM buckets
      WHERE run_id IN ('${runIds.join("','")}')
        AND time_offset_secs >= ${trimmingSeconds}
      GROUP BY run_id;
    `;

    try {
      const result = await this.pool.query(query);
      const metrics: Record<string, any> = {};
      
      result.rows.forEach((row: any) => {
        metrics[row.run_id] = {
          latency: {
            avg: parseFloat(row.duration_avg || 0),
            min: parseFloat(row.duration_min || 0),
            max: parseFloat(row.duration_max || 0),
            p50: parseFloat(row.duration_p50 || 0),
            p95: parseFloat(row.duration_p95 || 0),
            p99: parseFloat(row.duration_p99 || 0),
          },
          operations: {
            total: parseInt(row.operations_total || 0),
            success: parseInt(row.operations_success || 0),
            failed: parseInt(row.operations_failed || 0),
          },
          throughput: parseFloat(row.throughput || 0),
        };
      });

      return metrics;
    } catch (error) {
      logger.error('Error calculating run metrics:', error);
      return {};
    }
  }

  // Get bucket data for a specific run ID (for performance graphs)
  async getBucketsByRunId(runId: string): Promise<any[]> {
    const query = `
      SELECT 
        time as datetime,
        CAST(time_offset_secs AS INT) as time,
        CONCAT(FLOOR(time_offset_secs / 60), 'm ', time_offset_secs % 60, 's') as timeLabel,
        duration_average_us,
        duration_min_us,
        duration_max_us,
        operations_total,
        operations_success,
        operations_failed,
        errors
      FROM buckets
      WHERE run_id = $1
      ORDER BY time_offset_secs ASC;
    `;

    try {
      const result = await this.pool.query(query, [runId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching buckets for run:', error);
      return [];
    }
  }

  async getFirstBucketTime(runId: string): Promise<number | undefined> {
    try {
      const result = await this.pool.query(
        `SELECT MIN(time) as first_time FROM buckets WHERE run_id = $1`,
        [runId]
      )
      const val = result.rows[0]?.first_time
      return val != null ? new Date(val).getTime() : undefined
    } catch (error) {
      logger.error('Error fetching first bucket time:', error)
      return undefined
    }
  }

  // Get metrics data for a specific run ID (for performance graphs)
  async getMetricsByRunId(runId: string): Promise<any[]> {
    const query = `
      SELECT 
        time_offset_secs,
        metrics::jsonb as metrics_data
      FROM metrics
      WHERE run_id = $1
      ORDER BY time_offset_secs ASC;
    `;

    try {
      const result = await this.pool.query(query, [runId]);
      
      // Flatten the metrics JSON for easier access in the frontend
      const flattenedRows = result.rows.map(row => {
        const flattened: any = {
          time_offset_secs: row.time_offset_secs
        };
        
        if (row.metrics_data) {
          // Flatten all metrics properties to the top level
          Object.assign(flattened, row.metrics_data);
        }
        
        return flattened;
      });
      
      return flattenedRows;
    } catch (error) {
      logger.error('Error fetching metrics for run:', error);
      return [];
    }
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
