import {
  Input,
  MultipleResultsHandling,
  VerticalAxisBucketsColumn,
  VerticalAxisMetric,
  HorizontalAxisDynamic,
  MergingAlgorithm,
} from '@/src/lib/dashboard/dashboard-query-types'

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
  const mergingOp = mapMerging(input.mergingType as unknown as MergingAlgorithm)
  const columnName = yAxis.column

  if (input.multipleResultsHandling === MultipleResultsHandling.SIDE_BY_SIDE) {
    // Side-by-side (currently unused by our UI but kept for parity)
    return `SELECT runs.id,
                   sub.value,
                   ${groupByDbField} as grouping
            FROM (SELECT run_id,
                         ${mergingOp}(buckets.${columnName}) as value
                  FROM buckets join runs
                  on buckets.run_id = runs.id
                  WHERE run_id in ('${runIds.join("','")}')
                    AND buckets.time_offset_secs >= ${input.trimmingSeconds}
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
                WHERE run_id in ('${runIds.join("','")}')
                  AND buckets.time_offset_secs >= ${input.trimmingSeconds}
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

  return `WITH 
    r AS (SELECT * FROM runs WHERE id in ('${runIds.join("','")}')),
    joined AS (SELECT params::jsonb->'impl'->>'version' AS groupBy, CAST(metrics.metrics::jsonb->>'${yAxis.metric}' AS FLOAT) AS metric FROM metrics JOIN r ON metrics.run_id = r.id)
    SELECT groupBy AS grouping, ${mergingOp}(metric) AS value FROM joined GROUP BY groupBy;`
}

// Build query for runs with buckets (used by full line graph)
export function buildRunsWithBucketsQuery(
  runIds: readonly string[],
  input: Input,
  includeDataColumn: string | null,
  includeMetrics: boolean,
  includeErrors: boolean
): string {
  if (input.bucketiseSeconds && input.bucketiseSeconds > 1) {
    const mergingOp = mapMerging(input.mergingType as unknown as MergingAlgorithm)
    return `
        SELECT buckets.run_id,
               time_bucket('${input.bucketiseSeconds} seconds', time) as datetime,
               min(buckets.time_offset_secs)                     as time_offset_secs
               ${includeDataColumn ? `, ${mergingOp}(${includeDataColumn}) as value` : ""} 
               ${includeErrors ? `, SUM(CASE WHEN jsonb_typeof(buckets.errors) = 'object' THEN (value::int) ELSE 0 END) as errors` : ""}
        FROM buckets
          /* In the original NestJS query, metrics are not joined in the bucketised branch */
          LEFT JOIN LATERAL jsonb_each_text(CASE WHEN jsonb_typeof(buckets.errors) = 'object' THEN buckets.errors ELSE '{}'::jsonb END) ON TRUE
        WHERE buckets.run_id in ('${runIds.join("','")}')
          AND buckets.time_offset_secs >= ${input.trimmingSeconds}
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
        WHERE buckets.run_id in ('${runIds.join("','")}')
          AND buckets.time_offset_secs >= ${input.trimmingSeconds}
        ORDER BY datetime ASC;`
}

// Build query for runs with metrics (used to overlay/aggregate metrics alongside buckets)
export function buildRunsWithMetricsQuery(
  input: Input,
  metricName: string
): string {
  if (input.bucketiseSeconds && input.bucketiseSeconds > 1) {
    const mergingOp = mapMerging(input.mergingType as unknown as MergingAlgorithm)
    return `
      SELECT 
        metrics.run_id,
        time_bucket('${input.bucketiseSeconds} seconds', initiated) as datetime,
        min(metrics.time_offset_secs) as time_offset_secs,
        ${mergingOp}(CAST(metrics.metrics::jsonb->>'${metricName}' AS FLOAT)) as value,
        jsonb_agg(metrics.metrics::jsonb) as metrics
      FROM 
        metrics
      WHERE 
        run_id = ANY($1::uuid[])
        AND time_offset_secs >= ${input.trimmingSeconds}
        AND metrics::jsonb ? '${metricName}'
      GROUP BY 
        run_id, time_bucket('${input.bucketiseSeconds} seconds', initiated)
      ORDER BY 
        datetime ASC;`
  }

  return `
      SELECT 
        run_id,
        initiated as datetime,
        time_offset_secs,
        CAST(metrics.metrics::jsonb->>'${metricName}' AS FLOAT) as value,
        metrics::jsonb as metrics
      FROM 
        metrics
      WHERE 
        run_id = ANY($1::uuid[])
        AND time_offset_secs >= ${input.trimmingSeconds}
        AND metrics::jsonb ? '${metricName}'
      ORDER BY 
        datetime ASC;`
}


