export const MAX_PER_CORE_TIMELINE_POINTS = 2000

export interface CoreSummaryItem {
  coreIndex: number
  label: string
  key: string
  average: number
  peak: number
}

export interface PerCoreCpuData {
  coreCount: number
  topologyChanged: boolean
  segmentStartTime: number
  summaries: CoreSummaryItem[]
  hottestCoreKeys: string[]
  timeSeries: Array<Record<string, number>>
}

export type PerCoreMetricsInput =
  | ReadonlyArray<Record<string, unknown>>
  | { readonly data?: ReadonlyArray<Record<string, unknown>> | null }
  | null
  | undefined

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed === "") {
      return NaN
    }
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : NaN
  }
  return NaN
}

function unwrapMetricsRows(
  input: PerCoreMetricsInput
): ReadonlyArray<Record<string, unknown>> | null {
  if (!input) {
    return null
  }
  if (Array.isArray(input)) {
    return input
  }
  if (typeof input === "object" && "data" in input && Array.isArray(input.data)) {
    return input.data
  }
  return null
}

function getRawCoresField(row: Record<string, unknown>): unknown {
  if (Object.prototype.hasOwnProperty.call(row, "coresCpu")) {
    return row.coresCpu
  }
  if (row.metrics && typeof row.metrics === "object" && !Array.isArray(row.metrics)) {
    const nested = row.metrics as Record<string, unknown>
    if (Object.prototype.hasOwnProperty.call(nested, "coresCpu")) {
      return nested.coresCpu
    }
  }
  return undefined
}

function getRowLogicalCpuCount(row: Record<string, unknown>): number | null {
  const raw =
    Object.prototype.hasOwnProperty.call(row, "logicalCpuCount")
      ? row.logicalCpuCount
      : row.metrics && typeof row.metrics === "object" && !Array.isArray(row.metrics)
        ? (row.metrics as Record<string, unknown>).logicalCpuCount
        : undefined
  const parsed = toFiniteNumber(raw)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null
}

const ISO_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}/

function parseRowTimestampMs(row: Record<string, unknown>): number {
  const raw = row.initiated ?? row.datetime ?? row.timestamp
  if (raw instanceof Date) {
    const ms = raw.getTime()
    return Number.isFinite(ms) ? ms : NaN
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (ISO_DATE_PREFIX_PATTERN.test(trimmed)) {
      const ms = Date.parse(trimmed)
      return Number.isFinite(ms) ? ms : NaN
    }
  }
  return NaN
}

export function computeSampleOriginMs(rows: ReadonlyArray<Record<string, unknown>>): number {
  let minImpliedOrigin = Infinity
  let minTimestamp = Infinity
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue
    }
    const tsMs = parseRowTimestampMs(row)
    if (!Number.isFinite(tsMs)) {
      continue
    }
    if (tsMs < minTimestamp) {
      minTimestamp = tsMs
    }
    if (row.time_offset_secs != null || row.time != null) {
      const explicitSecs = toFiniteNumber(row.time_offset_secs ?? row.time)
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

interface TimelineSampleRow {
  time: number
  cores: number[] | null
  logicalCpuCount: number | null
  omittedCores: boolean
}

export function extractPerCoreCpuData(
  runMetrics: PerCoreMetricsInput,
  topCount: number = 4,
  maxTimelinePoints: number = MAX_PER_CORE_TIMELINE_POINTS,
  originMs?: number
): PerCoreCpuData | null {
  const rows = unwrapMetricsRows(runMetrics)
  if (!rows || rows.length === 0) {
    return null
  }

  const resolvedOriginMs =
    typeof originMs === "number" && Number.isFinite(originMs)
      ? originMs
      : computeSampleOriginMs(rows)
  const timelineRows: TimelineSampleRow[] = []

  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue
    }
    const hasExplicitTime = row.time_offset_secs != null || row.time != null
    const rowTsMs = parseRowTimestampMs(row)
    const parsedTime = hasExplicitTime
      ? toFiniteNumber(row.time_offset_secs ?? row.time)
      : Number.isFinite(rowTsMs) && Number.isFinite(resolvedOriginMs)
        ? Math.round((rowTsMs - resolvedOriginMs) / 1000)
        : NaN
    if (!Number.isFinite(parsedTime)) {
      continue
    }

    const logicalCpuCount = getRowLogicalCpuCount(row)
    const rawCores = getRawCoresField(row)
    if (rawCores === undefined || rawCores === null) {
      timelineRows.push({
        time: parsedTime,
        cores: null,
        logicalCpuCount,
        omittedCores: true,
      })
      continue
    }

    if (!Array.isArray(rawCores) || rawCores.length === 0) {
      continue
    }
    const cores: number[] = rawCores.map((v: unknown) => toFiniteNumber(v))
    if (cores.some((v: number) => !Number.isFinite(v) || v < 0)) {
      continue
    }

    timelineRows.push({
      time: parsedTime,
      cores,
      logicalCpuCount,
      omittedCores: false,
    })
  }

  if (timelineRows.length === 0) {
    return null
  }

  timelineRows.sort((a, b) => a.time - b.time)

  let segmentEnd = timelineRows.length - 1
  while (segmentEnd >= 0 && timelineRows[segmentEnd].cores === null) {
    segmentEnd--
  }
  if (segmentEnd < 0) {
    return null
  }

  // Keep the latest contiguous valid segment; omitted coresCpu intervals mark topology swaps or skipped deltas.
  const coreCount = (timelineRows[segmentEnd].cores as number[]).length
  let segmentStart = segmentEnd
  while (
    segmentStart > 0 &&
    timelineRows[segmentStart - 1].cores !== null &&
    (timelineRows[segmentStart - 1].cores as number[]).length === coreCount
  ) {
    segmentStart--
  }

  const segmentRows = timelineRows
    .slice(segmentStart, segmentEnd + 1)
    .map((r) => ({ time: r.time, cores: r.cores as number[] }))

  const hadPriorTopologySegment = timelineRows
    .slice(0, segmentStart)
    .some(
      (r) =>
        r.cores !== null ||
        (r.logicalCpuCount !== null && r.logicalCpuCount !== coreCount) ||
        (r.omittedCores && r.logicalCpuCount !== null)
    )
  const hadTrailingTopologyChange = timelineRows
    .slice(segmentEnd + 1)
    .some((r) => r.logicalCpuCount !== null && r.logicalCpuCount !== coreCount)
  const topologyChanged = hadPriorTopologySegment || hadTrailingTopologyChange
  const segmentStartTime = round2(segmentRows[0].time)

  const sums = new Array<number>(coreCount).fill(0)
  const peaks = new Array<number>(coreCount).fill(0)

  for (const { cores } of segmentRows) {
    for (let i = 0; i < coreCount; i++) {
      const val = round2(cores[i])
      sums[i] += val
      if (val > peaks[i]) {
        peaks[i] = val
      }
    }
  }

  const safeTopCount = Number.isFinite(topCount) ? Math.max(1, Math.floor(topCount)) : 4
  const limit = Number.isFinite(maxTimelinePoints)
    ? Math.max(2, Math.floor(maxTimelinePoints))
    : MAX_PER_CORE_TIMELINE_POINTS
  const sampledRows =
    segmentRows.length <= limit
      ? segmentRows
      : Array.from({ length: limit }, (_, idx) => {
          const rowIndex = Math.round((idx * (segmentRows.length - 1)) / (limit - 1))
          return segmentRows[rowIndex]
        })

  const timeSeries = sampledRows.map(({ time, cores }) => {
    const point: Record<string, number> = { time: round2(time) }
    for (let i = 0; i < coreCount; i++) {
      point[`core_${i}`] = round2(cores[i])
    }
    return point
  })

  const summaries: CoreSummaryItem[] = []
  for (let i = 0; i < coreCount; i++) {
    summaries.push({
      coreIndex: i,
      label: `Slot ${i}`,
      key: `core_${i}`,
      average: round2(sums[i] / segmentRows.length),
      peak: round2(peaks[i]),
    })
  }

  const hottestCoreKeys = [...summaries]
    .sort((a, b) => {
      if (b.average !== a.average) return b.average - a.average
      if (b.peak !== a.peak) return b.peak - a.peak
      return a.coreIndex - b.coreIndex
    })
    .slice(0, Math.min(safeTopCount, coreCount))
    .map((item) => item.key)

  return {
    coreCount,
    topologyChanged,
    segmentStartTime,
    summaries,
    hottestCoreKeys,
    timeSeries,
  }
}
