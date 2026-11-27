import { useQuery } from '@tanstack/react-query'

export type PerformanceRow = Record<string, unknown>

export interface PerformanceDataPayload {
  buckets: PerformanceRow[]
  metrics: PerformanceRow[]
  merged: PerformanceRow[]
}

export interface UsePerformanceDataResult {
  data: PerformanceRow[]
  buckets: PerformanceRow[]
  metrics: PerformanceRow[]
  hasLoaded: boolean
  isLoading: boolean
  isFetching: boolean
  error: string | null
  refetch: () => void
}

const EMPTY_PERFORMANCE_ROWS: PerformanceRow[] = []

export function normalizeChartDataPoints(raw: unknown): PerformanceRow[] {
  if (!Array.isArray(raw)) {
    return EMPTY_PERFORMANCE_ROWS
  }
  return raw.filter(
    (entry): entry is PerformanceRow => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
  )
}

export interface SelectableMetricDefinition {
  id: string
  optional?: boolean
  isSystemMetric?: boolean
}

export function buildDefaultActiveMetrics(options: {
  allMetrics: ReadonlyArray<SelectableMetricDefinition>
  showAllMetrics: boolean
  initialMetric?: string
}): string[] {
  const { allMetrics, showAllMetrics, initialMetric } = options
  if (showAllMetrics) {
    return allMetrics.filter((m) => !m.optional).map((m) => m.id)
  }
  const matchedInitial = initialMetric ? allMetrics.find((m) => m.id === initialMetric) : undefined
  if (matchedInitial?.isSystemMetric) {
    return ['duration_average_us', matchedInitial.id]
  }
  const base = ['duration_average_us', 'operations_total', 'operations_failed']
  if (matchedInitial && !base.includes(matchedInitial.id)) {
    return [...base, matchedInitial.id]
  }
  return base
}

export function reconcileActiveMetrics(options: {
  userOverrides: Readonly<Record<string, boolean>>
  visibleMetricIds: readonly string[]
  metricsWithData: ReadonlySet<string>
  hasPositiveDuration: boolean
  showAllMetrics: boolean
  initialMetric?: string
  allMetrics: ReadonlyArray<SelectableMetricDefinition>
}): string[] {
  const {
    userOverrides,
    visibleMetricIds,
    metricsWithData,
    hasPositiveDuration,
    showAllMetrics,
    initialMetric,
    allMetrics,
  } = options

  const desired = new Set<string>()

  if (showAllMetrics) {
    for (const metricId of visibleMetricIds) {
      if (metricsWithData.has(metricId)) {
        desired.add(metricId)
      }
    }
  } else {
    const matchedInitial = initialMetric ? allMetrics.find((m) => m.id === initialMetric) : undefined
    if (matchedInitial && matchedInitial.isSystemMetric && metricsWithData.has(matchedInitial.id)) {
      desired.add('duration_average_us')
      desired.add(matchedInitial.id)
    } else {
      desired.add('duration_average_us')
      desired.add('operations_total')
      desired.add('operations_failed')
      if (matchedInitial && metricsWithData.has(matchedInitial.id)) {
        desired.add(matchedInitial.id)
      }
    }
  }

  if (hasPositiveDuration) {
    desired.add('duration_average_us')
  }

  const hasAnyDefaultData = Array.from(desired).some((id) => metricsWithData.has(id))
  if (!hasAnyDefaultData) {
    for (const metricId of visibleMetricIds) {
      if (metricsWithData.has(metricId)) {
        desired.add(metricId)
        break
      }
    }
  }

  for (const [metricId, enabled] of Object.entries(userOverrides)) {
    if (enabled) {
      desired.add(metricId)
    } else {
      desired.delete(metricId)
    }
  }

  const ordered: string[] = []
  for (const metricId of visibleMetricIds) {
    if (desired.has(metricId) && metricsWithData.has(metricId)) {
      ordered.push(metricId)
    }
  }
  for (const metricId of Array.from(desired)) {
    if (!ordered.includes(metricId) && metricsWithData.has(metricId)) {
      ordered.push(metricId)
    }
  }
  return ordered
}

interface ApiListResponse {
  success?: boolean
  error?: string
  data?: PerformanceRow[]
}

function parseFiniteMetricValue(val: unknown): number {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : NaN
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val)
    return Number.isFinite(parsed) ? parsed : NaN
  }
  return NaN
}

export const SUPPORTED_PERFORMANCE_GRAPH_METRIC_IDS: ReadonlySet<string> = new Set([
  'duration_average_us',
  'duration_min_us',
  'duration_max_us',
  'duration_p50_us',
  'duration_p95_us',
  'duration_p99_us',
  'operations_total',
  'operations_success',
  'operations_failed',
  'memDirectMaxMB',
  'memDirectUsedMB',
  'memHeapMaxMB',
  'memHeapUsedMB',
  'memRssUsedMB',
  'memVmsMB',
  'freeSwapSizeMB',
  'processCpu',
  'processCpuTotal',
  'processCpuUser',
  'processCpuSys',
  'maxThreadCpu',
  'maxCoreCpu',
  'systemCpu',
  'systemCpuSteal',
  'systemCpuIoWait',
  'threadCount',
  'gc0Count',
  'gc0AccTimeMs',
  'errors',
])

function hasScalarMetricField(row: PerformanceRow): boolean {
  for (const key of Object.keys(row)) {
    if (!SUPPORTED_PERFORMANCE_GRAPH_METRIC_IDS.has(key)) {
      continue
    }
    if (Number.isFinite(parseFiniteMetricValue(row[key]))) {
      return true
    }
  }
  return false
}

const ISO_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}/

export function parseSampleTimestampMs(row: Record<string, unknown>): number {
  const raw = row.initiated ?? row.datetime ?? row.timestamp
  if (raw instanceof Date) {
    const ms = raw.getTime()
    return Number.isFinite(ms) ? ms : NaN
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (ISO_DATE_PREFIX_PATTERN.test(trimmed)) {
      const ms = Date.parse(trimmed)
      return Number.isFinite(ms) ? ms : NaN
    }
  }
  return NaN
}

export function computeMetricSampleOriginMs(
  rows: ReadonlyArray<Record<string, unknown>>
): number {
  let minImpliedOrigin = Infinity
  let minTimestamp = Infinity
  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      continue
    }
    const tsMs = parseSampleTimestampMs(row)
    if (!Number.isFinite(tsMs)) {
      continue
    }
    if (tsMs < minTimestamp) {
      minTimestamp = tsMs
    }
    if (row.time_offset_secs != null || row.time != null) {
      const explicitSecs = parseFiniteMetricValue(row.time_offset_secs ?? row.time)
      if (Number.isFinite(explicitSecs)) {
        const implied = tsMs - explicitSecs * 1000
        if (implied < minImpliedOrigin) {
          minImpliedOrigin = implied
        }
      }
    }
  }
  if (Number.isFinite(minImpliedOrigin)) {
    return minImpliedOrigin
  }
  if (Number.isFinite(minTimestamp)) {
    return minTimestamp
  }
  return NaN
}

export function resolveMetricSampleTimeSecs(
  row: Record<string, unknown>,
  originMs: number
): number {
  if (row.time_offset_secs != null || row.time != null) {
    return parseFiniteMetricValue(row.time_offset_secs ?? row.time)
  }
  const tsMs = parseSampleTimestampMs(row)
  if (Number.isFinite(tsMs) && Number.isFinite(originMs)) {
    return Math.round((tsMs - originMs) / 1000)
  }
  return NaN
}

export async function fetchPerformanceData(
  runId: string,
  fetchImpl: typeof fetch = fetch
): Promise<PerformanceDataPayload> {
  if (!runId) {
    return { buckets: [], metrics: [], merged: [] }
  }

  const [bucketsRes, metricsRes] = await Promise.all([
    fetchImpl(`/api/runs/${runId}/buckets`, { cache: 'no-store' }),
    fetchImpl(`/api/runs/${runId}/metrics`, { cache: 'no-store' }),
  ])

  let buckets: PerformanceRow[] = []
  if (bucketsRes.status !== 404) {
    if (!bucketsRes.ok) {
      throw new Error(`Failed to fetch buckets: ${bucketsRes.status}`)
    }
    const bucketsJson = (await bucketsRes.json()) as ApiListResponse
    if (!bucketsJson.success) {
      throw new Error(bucketsJson.error || 'Failed to load buckets')
    }
    buckets = Array.isArray(bucketsJson.data) ? bucketsJson.data : []
  }

  let metrics: PerformanceRow[] = []
  if (metricsRes.status !== 404) {
    if (!metricsRes.ok) {
      throw new Error(`Failed to fetch metrics: ${metricsRes.status}`)
    }
    const metricsJson = (await metricsRes.json()) as ApiListResponse
    if (metricsJson.success === false) {
      throw new Error(metricsJson.error || 'Failed to load metrics')
    }
    metrics = Array.isArray(metricsJson.data) ? metricsJson.data : []
  }

  const metricOriginMs = computeMetricSampleOriginMs(metrics)
  let merged: PerformanceRow[] = []
  if (buckets.length > 0) {
    const bucketOriginMs = computeMetricSampleOriginMs(buckets)
    const mergeOriginMs = Number.isFinite(bucketOriginMs) ? bucketOriginMs : metricOriginMs

    const firstMetricIndexByTime = new Map<number, number>()
    for (let i = 0; i < metrics.length; i++) {
      const metricTimeNum = resolveMetricSampleTimeSecs(metrics[i], mergeOriginMs)
      if (Number.isFinite(metricTimeNum) && !firstMetricIndexByTime.has(metricTimeNum)) {
        firstMetricIndexByTime.set(metricTimeNum, i)
      }
    }

    // Merge buckets and metrics; metrics timestamps may lag bucket timestamps by 1s.
    merged = buckets.map((b) => {
      const bucketTimeNum = Number(b.time)
      const bucketTime = Number.isFinite(bucketTimeNum) ? bucketTimeNum : 0

      const exactIdx = firstMetricIndexByTime.get(bucketTime)
      const nextIdx = firstMetricIndexByTime.get(bucketTime + 1)
      const matchedIdx =
        exactIdx !== undefined && (nextIdx === undefined || exactIdx < nextIdx)
          ? exactIdx
          : nextIdx
      const matchedMetric = matchedIdx !== undefined ? metrics[matchedIdx] : undefined

      const baseObj: PerformanceRow = {
        ...b,
        time: bucketTime,
        timeLabel: bucketTime,
      }

      if (matchedMetric) {
        const metricData = { ...matchedMetric }
        delete metricData.time_offset_secs
        delete metricData.initiated
        delete metricData.timestamp
        return { ...baseObj, ...metricData }
      }

      return baseObj
    })
  } else if (metrics.some((row) => hasScalarMetricField(row))) {
    merged = metrics
      .map((mm) => {
        const metricTime = resolveMetricSampleTimeSecs(mm, metricOriginMs)
        if (!Number.isFinite(metricTime)) {
          return null
        }
        const point: PerformanceRow = {
          ...mm,
          time: metricTime,
          timeLabel: metricTime,
        }
        delete point.time_offset_secs
        delete point.initiated
        delete point.timestamp
        return point
      })
      .filter((point): point is PerformanceRow => point !== null)
      .sort((a, b) => Number(a.time) - Number(b.time))
  }

  return { buckets, metrics, merged }
}

export function usePerformanceData(runId: string): UsePerformanceDataResult {
  const query = useQuery({
    queryKey: ['performanceData', runId],
    queryFn: () => fetchPerformanceData(runId),
    enabled: !!runId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  return {
    data: query.data?.merged ?? EMPTY_PERFORMANCE_ROWS,
    buckets: query.data?.buckets ?? EMPTY_PERFORMANCE_ROWS,
    metrics: query.data?.metrics ?? EMPTY_PERFORMANCE_ROWS,
    hasLoaded: query.data !== undefined,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    refetch: () => {
      void query.refetch()
    },
  }
}
