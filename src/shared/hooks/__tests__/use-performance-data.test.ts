import type { Pool } from "pg"
import { DatabaseService } from "@/src/lib/database-service"
import {
  buildDefaultActiveMetrics,
  fetchPerformanceData,
  normalizeChartDataPoints,
  reconcileActiveMetrics,
  type SelectableMetricDefinition,
} from "@/src/shared/hooks/use-performance-data"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

const VALID_RUN_ID = "5afa0ffd-f83a-4f44-8b13-bc9195129421"

const TEST_METRICS: SelectableMetricDefinition[] = [
  { id: "duration_average_us" },
  { id: "duration_max_us" },
  { id: "duration_p95_us", optional: true },
  { id: "operations_total" },
  { id: "operations_failed" },
  { id: "processCpu", isSystemMetric: true },
  { id: "processCpuTotal", optional: true, isSystemMetric: true },
  { id: "memRssUsedMB", optional: true, isSystemMetric: true },
]

describe("fetchPerformanceData", () => {
  test("merges bucket samples with 1s-offset metric samples", async () => {
    const fakeFetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/buckets")) {
        return jsonResponse({
          success: true,
          data: [
            { datetime: "2026-11-26T10:00:05.000Z", time: 5, duration_average_us: 120, operations_total: 500 },
          ],
        })
      }
      return jsonResponse({
        success: true,
        data: [
          { time_offset_secs: null, initiated: "2026-11-26T10:00:06.000Z", processCpu: 14.5, processCpuTotal: 232 },
          { time_offset_secs: "5", processCpu: 99.0, processCpuTotal: 999 },
        ],
      })
    }) as typeof fetch

    const result = await fetchPerformanceData(VALID_RUN_ID, fakeFetch)
    expect(result.buckets).toHaveLength(1)
    expect(result.metrics).toHaveLength(2)
    expect(result.merged).toEqual([
      {
        datetime: "2026-11-26T10:00:05.000Z",
        time: 5,
        timeLabel: 5,
        duration_average_us: 120,
        operations_total: 500,
        processCpu: 14.5,
        processCpuTotal: 232,
      },
    ])
  })

  test("builds sorted metric-only chart points when buckets return 404 and scalar metrics exist", async () => {
    const fakeFetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/buckets")) {
        return jsonResponse({ error: "No bucket data found for this run" }, 404)
      }
      return jsonResponse({
        success: true,
        data: [
          { time_offset_secs: "4", processCpu: 18.0, coresCpu: [30, 70] },
          { time_offset_secs: "2", processCpu: 14.5, coresCpu: [25, 75] },
        ],
      })
    }) as typeof fetch

    const result = await fetchPerformanceData(VALID_RUN_ID, fakeFetch)
    expect(result.buckets).toEqual([])
    expect(result.metrics).toHaveLength(2)
    expect(result.merged).toEqual([
      { time: 2, timeLabel: 2, processCpu: 14.5, coresCpu: [25, 75] },
      { time: 4, timeLabel: 4, processCpu: 18.0, coresCpu: [30, 70] },
    ])

    // Non-plotted metadata (logicalCpuCount) and array-only metrics keep merged empty while preserving raw metrics.
    const arrayOnlyFetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/buckets")) {
        return jsonResponse({ error: "No bucket data found for this run" }, 404)
      }
      return jsonResponse({
        success: true,
        data: [{ time_offset_secs: "2", logicalCpuCount: 16, coresCpu: [25, 75] }],
      })
    }) as typeof fetch
    const arrayOnly = await fetchPerformanceData(VALID_RUN_ID, arrayOnlyFetch)
    expect(arrayOnly.merged).toEqual([])
    expect(arrayOnly.metrics).toEqual([{ time_offset_secs: "2", logicalCpuCount: 16, coresCpu: [25, 75] }])

    // Legacy null-offset metric samples derive elapsed seconds from initiated timestamps and skip untimed rows.
    const initiatedFetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/buckets")) {
        return jsonResponse({ error: "No bucket data found for this run" }, 404)
      }
      return jsonResponse({
        success: true,
        data: [
          { time_offset_secs: null, initiated: "2026-11-26T10:00:25.000Z", processCpu: 22.0 },
          { time_offset_secs: null, processCpu: 99.0 },
          { time_offset_secs: null, initiated: "2026-11-26T10:00:10.000Z", processCpu: 11.5 },
        ],
      })
    }) as typeof fetch
    const fromInitiated = await fetchPerformanceData(VALID_RUN_ID, initiatedFetch)
    expect(fromInitiated.merged).toEqual([
      { time: 0, timeLabel: 0, processCpu: 11.5 },
      { time: 15, timeLabel: 15, processCpu: 22.0 },
    ])
  })

  test("throws on non-404 bucket or metric failures and propagates database errors", async () => {
    const bucketErrFetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/buckets")) {
        return jsonResponse({ error: "Database unavailable" }, 500)
      }
      return jsonResponse({ success: true, data: [] })
    }) as typeof fetch

    await expect(fetchPerformanceData(VALID_RUN_ID, bucketErrFetch)).rejects.toThrow(
      "Failed to fetch buckets: 500"
    )

    const metricErrFetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/buckets")) {
        return jsonResponse({ error: "No bucket data found for this run" }, 404)
      }
      return jsonResponse({ error: "Database unavailable" }, 500)
    }) as typeof fetch

    await expect(fetchPerformanceData(VALID_RUN_ID, metricErrFetch)).rejects.toThrow(
      "Failed to fetch metrics: 500"
    )

    const failingPool = {
      query: async () => {
        throw new Error("connection refused")
      },
    } as unknown as Pool
    const db = new DatabaseService(failingPool)
    await expect(db.getBucketsByRunId("non-uuid-slug")).resolves.toEqual([])
    await expect(db.getMetricsByRunId("non-uuid-slug")).resolves.toEqual([])
    await expect(db.getFirstBucketTime("non-uuid-slug")).resolves.toBeUndefined()
    await expect(db.getBucketsByRunId(VALID_RUN_ID)).rejects.toThrow("connection refused")
    await expect(db.getMetricsByRunId(VALID_RUN_ID)).rejects.toThrow("connection refused")
    await expect(db.getFirstBucketTime(VALID_RUN_ID)).rejects.toThrow("connection refused")

    const capturedSql: string[] = []
    const eventPool = {
      query: async (sql: string) => {
        capturedSql.push(sql)
        if (sql.includes("SELECT COALESCE")) {
          return { rows: [{ first_time: "2026-11-26T10:00:00.000Z" }] }
        }
        return {
          rows: [{ datetime: "2026-11-26T10:00:15.200Z", params: { type: "rebalance" } }],
        }
      },
    } as unknown as Pool
    const eventDb = new DatabaseService(eventPool)
    const originMs = await eventDb.getFirstBucketTime(VALID_RUN_ID)
    expect(capturedSql[0]).toContain("MIN(time - (COALESCE(time_offset_secs, 0) * INTERVAL '1 second'))")
    expect(capturedSql[0]).toContain("time_offset_secs IS NOT NULL")
    expect(originMs).toBe(Date.parse("2026-11-26T10:00:00.000Z"))
    const withOrigin = await eventDb.getEvents(VALID_RUN_ID, originMs, true)
    expect(withOrigin[0]?.timeOffsetSecs).toBe(15)
    const withDateOrigin = await eventDb.getEvents(VALID_RUN_ID, new Date("2026-11-26T10:00:00.000Z"), true)
    expect(withDateOrigin[0]?.timeOffsetSecs).toBe(15)
    const withIsoOrigin = await eventDb.getEvents(VALID_RUN_ID, "2026-11-26T10:00:00.000Z", true)
    expect(withIsoOrigin[0]?.timeOffsetSecs).toBe(15)
    const withoutOrigin = await eventDb.getEvents(VALID_RUN_ID, undefined, true)
    expect(withoutOrigin[0]?.timeOffsetSecs).toBeNull()
  })
})

describe("reconcileActiveMetrics", () => {
  test("preserves user-hidden metrics across refreshes and recovers series after temporary data gaps", () => {
    const initialDefaults = buildDefaultActiveMetrics({
      allMetrics: TEST_METRICS,
      showAllMetrics: true,
    })
    expect(initialDefaults).not.toContain("processCpuTotal")

    const firstLoad = reconcileActiveMetrics({
      userOverrides: {},
      visibleMetricIds: ["duration_average_us", "operations_total", "processCpu", "processCpuTotal"],
      metricsWithData: new Set(["duration_average_us", "operations_total", "processCpu", "processCpuTotal"]),
      hasPositiveDuration: true,
      showAllMetrics: true,
      allMetrics: TEST_METRICS,
    })
    expect(firstLoad).toEqual([
      "duration_average_us",
      "operations_total",
      "processCpu",
      "processCpuTotal",
    ])

    // Temporary metrics gap: only bucket metrics are present, then metrics recover on next refresh.
    const duringGap = reconcileActiveMetrics({
      userOverrides: {},
      visibleMetricIds: ["duration_average_us", "operations_total", "processCpu"],
      metricsWithData: new Set(["duration_average_us", "operations_total"]),
      hasPositiveDuration: true,
      showAllMetrics: true,
      allMetrics: TEST_METRICS,
    })
    expect(duringGap).toEqual(["duration_average_us", "operations_total"])

    const afterRecovery = reconcileActiveMetrics({
      userOverrides: {},
      visibleMetricIds: ["duration_average_us", "operations_total", "processCpu", "processCpuTotal"],
      metricsWithData: new Set(["duration_average_us", "operations_total", "processCpu", "processCpuTotal"]),
      hasPositiveDuration: true,
      showAllMetrics: true,
      allMetrics: TEST_METRICS,
    })
    expect(afterRecovery).toContain("processCpu")
    expect(afterRecovery).toContain("processCpuTotal")

    // User hides processCpuTotal in the legend, then data refreshes and memRssUsedMB appears.
    const afterUserHide = reconcileActiveMetrics({
      userOverrides: { processCpuTotal: false },
      visibleMetricIds: [
        "duration_average_us",
        "operations_total",
        "processCpu",
        "processCpuTotal",
        "memRssUsedMB",
      ],
      metricsWithData: new Set([
        "duration_average_us",
        "operations_total",
        "processCpu",
        "processCpuTotal",
        "memRssUsedMB",
      ]),
      hasPositiveDuration: true,
      showAllMetrics: true,
      allMetrics: TEST_METRICS,
    })

    expect(afterUserHide).not.toContain("processCpuTotal")
    expect(afterUserHide).toContain("memRssUsedMB")
  })

  test("activates URL-selected initialMetric, falls back when absent, and selects scalar fallback on bucketless runs", () => {
    const defaultsWithCpu = buildDefaultActiveMetrics({
      allMetrics: TEST_METRICS,
      showAllMetrics: false,
      initialMetric: "processCpuTotal",
    })
    expect(defaultsWithCpu).toEqual(["duration_average_us", "processCpuTotal"])

    const loadedWithCpu = reconcileActiveMetrics({
      userOverrides: {},
      visibleMetricIds: ["duration_average_us", "operations_total", "processCpuTotal"],
      metricsWithData: new Set(["duration_average_us", "operations_total", "processCpuTotal"]),
      hasPositiveDuration: true,
      showAllMetrics: false,
      initialMetric: "processCpuTotal",
      allMetrics: TEST_METRICS,
    })
    expect(loadedWithCpu).toEqual(["duration_average_us", "processCpuTotal"])

    const loadedWithoutCpu = reconcileActiveMetrics({
      userOverrides: {},
      visibleMetricIds: ["duration_average_us", "operations_total", "operations_failed"],
      metricsWithData: new Set(["duration_average_us", "operations_total", "operations_failed"]),
      hasPositiveDuration: true,
      showAllMetrics: false,
      initialMetric: "processCpuTotal",
      allMetrics: TEST_METRICS,
    })
    expect(loadedWithoutCpu).toEqual([
      "duration_average_us",
      "operations_total",
      "operations_failed",
    ])

    const bucketless = reconcileActiveMetrics({
      userOverrides: {},
      visibleMetricIds: ["duration_average_us", "operations_total", "processCpu", "memRssUsedMB"],
      metricsWithData: new Set(["processCpu", "memRssUsedMB"]),
      hasPositiveDuration: false,
      showAllMetrics: false,
      allMetrics: TEST_METRICS,
    })
    expect(bucketless).toEqual(["processCpu"])

    const p95Defaults = buildDefaultActiveMetrics({
      allMetrics: TEST_METRICS,
      showAllMetrics: false,
      initialMetric: "duration_p95_us",
    })
    expect(p95Defaults).toContain("duration_p95_us")
    const p95Loaded = reconcileActiveMetrics({
      userOverrides: {},
      visibleMetricIds: ["duration_average_us", "duration_p95_us", "operations_total", "operations_failed"],
      metricsWithData: new Set(["duration_average_us", "duration_p95_us", "operations_total", "operations_failed"]),
      hasPositiveDuration: true,
      showAllMetrics: false,
      initialMetric: "duration_p95_us",
      allMetrics: TEST_METRICS,
    })
    expect(p95Loaded).toContain("duration_p95_us")

    expect(normalizeChartDataPoints({ datasets: [], annotations: [] })).toEqual([])
    expect(normalizeChartDataPoints(null)).toEqual([])
    expect(normalizeChartDataPoints(undefined)).toEqual([])
    expect(normalizeChartDataPoints([{ time: 0, duration_average_us: 120 }, null])).toEqual([
      { time: 0, duration_average_us: 120 },
    ])
  })
})
