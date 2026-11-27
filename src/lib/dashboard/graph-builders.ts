import {
  Input,
  MultipleResultsHandling,
  VerticalAxisBucketsColumn,
  VerticalAxisMetric,
  HorizontalAxisDynamic,
  MergingAlgorithm,
} from '@/src/lib/dashboard/dashboard-query-types'
import { COMMIT_GROUPING_SQL } from '@/src/lib/core-ui-utilities'

export const NUMERIC_JSON_VALUE_PATTERN = String.raw`^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$`
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const SQL_IDENTIFIER_PATTERN = /^[A-Za-z0-9_]+$/
const VALID_GROUP_BY_SQL_PATTERN = /^params(?:::jsonb)?(?:->'[A-Za-z0-9_]+')*->>'[A-Za-z0-9_]+'$/

export function buildSafeJsonbFloatSql(jsonTextExpr: string, patternSqlExpr: string): string {
  return `CASE WHEN (${jsonTextExpr}) ~ ${patternSqlExpr} THEN CAST(${jsonTextExpr} AS FLOAT) END`
}

function isValidGroupBySql(expr: string): boolean {
  return expr === COMMIT_GROUPING_SQL || VALID_GROUP_BY_SQL_PATTERN.test(expr)
}

export const VALID_BUCKET_METRIC_COLUMNS: ReadonlySet<string> = new Set([
  'duration_average_us',
  'duration_min_us',
  'duration_max_us',
  'duration_p50_us',
  'duration_p95_us',
  'duration_p99_us',
  'operations_total',
  'operations_success',
  'operations_failed',
])

function formatValidatedUuidInList(runIds: readonly string[]): string {
  const valid = runIds.filter((id) => UUID_PATTERN.test(id))
  if (valid.length === 0) {
    throw new Error('No valid UUID run IDs provided')
  }
  return `'${valid.join("','")}'`
}

export interface AggregatedChartResultLike {
  data?: {
    labels?: readonly unknown[] | null
    datasets?: ReadonlyArray<{ data?: readonly unknown[] | null }> | null
    runIds?: readonly unknown[] | null
  } | null
}

export function extractChartAggregatedValue(
  chartData: AggregatedChartResultLike | null | undefined,
  label: string,
  targetRunIds?: readonly string[]
): number | null {
  const labels = chartData?.data?.labels || []
  const dataset = chartData?.data?.datasets?.[0]?.data || []
  let index = -1

  if (targetRunIds && targetRunIds.length > 0) {
    const wanted = new Set(targetRunIds.map((id) => String(id).trim().toLowerCase()).filter(Boolean))
    if (wanted.size > 0 && Array.isArray(chartData?.data?.runIds)) {
      index = chartData.data.runIds.findIndex((ids: unknown) => {
        if (!Array.isArray(ids)) return false
        const barSet = new Set(ids.map((id) => String(id).trim().toLowerCase()).filter(Boolean))
        if (barSet.size !== wanted.size) return false
        return Array.from(wanted).every((id) => barSet.has(id))
      })
    }
  } else {
    index = labels.findIndex((l) => l === label)
  }

  const candidate = index >= 0 ? dataset[index] : undefined
  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return candidate
  }
  return null
}

export function mapMerging(merging: MergingAlgorithm): 'avg' | 'max' | 'min' | 'sum' {
  if (merging === (global as any).MergingAlgorithm?.AVERAGE || String(merging) === 'Average') return 'avg'
  if (merging === (global as any).MergingAlgorithm?.MAXIMUM || String(merging) === 'Maximum') return 'max'
  if (merging === (global as any).MergingAlgorithm?.MINIMUM || String(merging) === 'Minimum') return 'min'
  if (merging === (global as any).MergingAlgorithm?.SUM || String(merging) === 'Sum') return 'sum'
  return 'avg'
}

export function buildSimplifiedGraphQuery(
  groupByDbField: string,
  runIds: readonly string[],
  input: Input,
  yAxis: VerticalAxisBucketsColumn
): string {
  if (!isValidGroupBySql(groupByDbField)) {
    throw new Error(`Invalid groupBy expression: ${groupByDbField}`)
  }
  const mergingOp = mapMerging(input.mergingType as unknown as MergingAlgorithm)
  const columnName = yAxis.column
  if (!VALID_BUCKET_METRIC_COLUMNS.has(columnName)) {
    throw new Error(`Invalid bucket metric column: ${columnName}`)
  }
  const runIdList = formatValidatedUuidInList(runIds)
  const trimmingSecs = Number.isFinite(Number(input.trimmingSeconds)) ? Number(input.trimmingSeconds) : 0

  if (input.multipleResultsHandling === MultipleResultsHandling.SIDE_BY_SIDE) {
    // Side-by-side (currently unused by our UI but kept for parity)
    return `SELECT runs.id,
                   sub.value,
                   ${groupByDbField} as grouping
            FROM (SELECT run_id,
                         ${mergingOp}(buckets.${columnName}) as value
                  FROM buckets join runs
                  on buckets.run_id = runs.id
                  WHERE run_id in (${runIdList})
                    AND buckets.time_offset_secs >= ${trimmingSecs}
                  GROUP BY run_id) as sub
                   JOIN runs ON sub.run_id = runs.id
            ORDER BY grouping, datetime asc`
  }

  // Merged
  return `SELECT array_agg(run_id) as run_ids,
                 avg(sub.value) as value,
                 ${groupByDbField} as grouping
          FROM (SELECT run_id,
                       ${mergingOp}(buckets.${columnName}) as value
                FROM buckets join runs
                on buckets.run_id = runs.id
                WHERE run_id in (${runIdList})
                  AND buckets.time_offset_secs >= ${trimmingSecs}
                GROUP BY run_id) as sub
                 JOIN runs ON sub.run_id = runs.id
          GROUP BY grouping
          ORDER BY grouping`
}

export function buildSimplifiedMetricQuery(
  runIds: readonly string[],
  _hAxis: HorizontalAxisDynamic,
  yAxis: VerticalAxisMetric,
  input: Input
): string {
  const mergingOp = mapMerging(input.mergingType as unknown as MergingAlgorithm)

  if (input.multipleResultsHandling === MultipleResultsHandling.SIDE_BY_SIDE) {
    // Side-by-side support not implemented in original; keep identical behavior
    throw 'Unsupported currently'
  }

  if (!SQL_IDENTIFIER_PATTERN.test(yAxis.metric)) {
    throw new Error(`Invalid metric name: ${yAxis.metric}`)
  }
  const runIdList = formatValidatedUuidInList(runIds)
  const trimmingSecs = Number.isFinite(Number(input.trimmingSeconds)) ? Number(input.trimmingSeconds) : 0
  const trimClause = trimmingSecs > 0 ? ` AND metrics.time_offset_secs >= ${trimmingSecs}` : ''
  const metricTextExpr = `metrics.metrics::jsonb->>'${yAxis.metric}'`
  const safeMetricFloatSql = buildSafeJsonbFloatSql(metricTextExpr, `'${NUMERIC_JSON_VALUE_PATTERN}'`)

  return `WITH 
    r AS (SELECT * FROM runs WHERE id in (${runIdList})),
    joined AS (SELECT ${COMMIT_GROUPING_SQL} AS groupBy, r.id AS run_id, ${safeMetricFloatSql} AS metric FROM metrics JOIN r ON metrics.run_id = r.id WHERE metrics.metrics::jsonb ? '${yAxis.metric}' AND (${metricTextExpr}) ~ '${NUMERIC_JSON_VALUE_PATTERN}'${trimClause})
    SELECT groupBy AS grouping, ${mergingOp}(metric) AS value, array_agg(DISTINCT run_id) AS run_ids FROM joined WHERE metric IS NOT NULL GROUP BY groupBy;`
}

// Build query for runs with buckets (used by full line graph)
export function buildRunsWithBucketsQuery(
  runIds: readonly string[],
  input: Input,
  includeDataColumn: string | null,
  includeMetrics: boolean,
  includeErrors: boolean
): string {
  if (includeDataColumn && !VALID_BUCKET_METRIC_COLUMNS.has(includeDataColumn)) {
    throw new Error(`Invalid bucket metric column: ${includeDataColumn}`)
  }
  formatValidatedUuidInList(runIds)
  if (input.bucketiseSeconds && input.bucketiseSeconds > 1) {
    const bucketSecs = Math.max(1, Math.floor(Number(input.bucketiseSeconds)))
    const mergingOp = mapMerging(input.mergingType as unknown as MergingAlgorithm)
    return `
        SELECT buckets.run_id,
               time_bucket('${bucketSecs} seconds', time) as datetime,
               min(buckets.time_offset_secs)                     as time_offset_secs
               ${includeDataColumn ? `, ${mergingOp}(${includeDataColumn}) as value` : ""} 
               ${includeErrors ? `, SUM(CASE WHEN jsonb_typeof(buckets.errors) = 'object' THEN (value::int) ELSE 0 END) as errors` : ""}
        FROM buckets
          /* In the original NestJS query, metrics are not joined in the bucketised branch */
          LEFT JOIN LATERAL jsonb_each_text(CASE WHEN jsonb_typeof(buckets.errors) = 'object' THEN buckets.errors ELSE '{}'::jsonb END) ON TRUE
        WHERE buckets.run_id = ANY($1::uuid[])
          AND buckets.time_offset_secs >= $2::bigint
        GROUP BY run_id, datetime
        ORDER BY datetime ASC;`
  }

  return `
        SELECT buckets.run_id,
               time as datetime,
                buckets.time_offset_secs
               ${includeDataColumn ? `, ${includeDataColumn} as value` : ""}
               ${includeErrors ? `, errors` : ""}
               ${includeMetrics ? `, metrics.metrics` : ""}
        FROM buckets
          ${includeMetrics ? "LEFT OUTER JOIN metrics ON buckets.run_id = metrics.run_id AND buckets.time_offset_secs = metrics.time_offset_secs" : ""}
        WHERE buckets.run_id = ANY($1::uuid[])
          AND buckets.time_offset_secs >= $2::bigint
        ORDER BY datetime ASC;`
}

// Build query for runs with metrics (used to overlay/aggregate metrics alongside buckets)
export function buildRunsWithMetricsQuery(
  input: Input,
  metricName: string
): string {
  if (!SQL_IDENTIFIER_PATTERN.test(metricName)) {
    throw new Error(`Invalid metric name: ${metricName}`)
  }
  const trimmingSecs = Number.isFinite(Number(input.trimmingSeconds)) ? Number(input.trimmingSeconds) : 0
  const metricTextExpr = `metrics.metrics::jsonb->>'${metricName}'`
  const safeMetricFloatSql = buildSafeJsonbFloatSql(metricTextExpr, `'${NUMERIC_JSON_VALUE_PATTERN}'`)
  if (input.bucketiseSeconds && input.bucketiseSeconds > 1) {
    const bucketSecs = Math.max(1, Math.floor(Number(input.bucketiseSeconds)))
    const mergingOp = mapMerging(input.mergingType as unknown as MergingAlgorithm)
    return `
      SELECT 
        metrics.run_id,
        time_bucket('${bucketSecs} seconds', initiated) as datetime,
        min(metrics.time_offset_secs) as time_offset_secs,
        ${mergingOp}(${safeMetricFloatSql}) as value,
        jsonb_agg(metrics.metrics::jsonb) as metrics
      FROM 
        metrics
      WHERE 
        run_id = ANY($1::uuid[])
        AND time_offset_secs >= ${trimmingSecs}
        AND metrics.metrics::jsonb ? '${metricName}'
        AND (${metricTextExpr}) ~ '${NUMERIC_JSON_VALUE_PATTERN}'
      GROUP BY 
        run_id, time_bucket('${bucketSecs} seconds', initiated)
      ORDER BY 
        datetime ASC;`
  }

  return `
      SELECT 
        run_id,
        initiated as datetime,
        time_offset_secs,
        ${safeMetricFloatSql} as value,
        metrics.metrics::jsonb as metrics
      FROM 
        metrics
      WHERE 
        run_id = ANY($1::uuid[])
        AND time_offset_secs >= ${trimmingSecs}
        AND metrics.metrics::jsonb ? '${metricName}'
        AND (${metricTextExpr}) ~ '${NUMERIC_JSON_VALUE_PATTERN}'
      ORDER BY 
        datetime ASC;`
}


