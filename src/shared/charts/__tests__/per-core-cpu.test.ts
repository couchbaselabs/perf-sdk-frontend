import {
  computeSampleOriginMs,
  extractPerCoreCpuData,
  MAX_PER_CORE_TIMELINE_POINTS,
} from "@/src/shared/charts/per-core-cpu"

describe("extractPerCoreCpuData", () => {
  test("returns null when metrics are null, undefined, empty, or lack valid coresCpu", () => {
    expect(extractPerCoreCpuData(null)).toBeNull()
    expect(extractPerCoreCpuData(undefined)).toBeNull()
    expect(extractPerCoreCpuData([])).toBeNull()
    expect(
      extractPerCoreCpuData([
        { time_offset_secs: "2", processCpu: 15.0, threadCount: 66 },
        { time_offset_secs: "3", processCpu: 15.2, threadCount: 66 },
      ])
    ).toBeNull()
  })

  test("computes per-core averages, peaks, hottest cores, and sorted time series", () => {
    const rows = [
      { time_offset_secs: "4", coresCpu: [20, 90, 50, 10] },
      { time_offset_secs: "2", coresCpu: [10, 80, 30, 10] },
      { time_offset_secs: "3", coresCpu: [30, 100, 40, 10] },
    ]

    const extracted = extractPerCoreCpuData(rows, 2)
    expect(extracted).not.toBeNull()
    expect(extracted?.coreCount).toBe(4)
    expect(extracted?.topologyChanged).toBe(false)
    expect(extracted?.segmentStartTime).toBe(2)

    expect(extracted?.summaries).toEqual([
      { coreIndex: 0, label: "Slot 0", key: "core_0", average: 20, peak: 30 },
      { coreIndex: 1, label: "Slot 1", key: "core_1", average: 90, peak: 100 },
      { coreIndex: 2, label: "Slot 2", key: "core_2", average: 40, peak: 50 },
      { coreIndex: 3, label: "Slot 3", key: "core_3", average: 10, peak: 10 },
    ])

    expect(extracted?.hottestCoreKeys).toEqual(["core_1", "core_2"])

    expect(extracted?.timeSeries).toEqual([
      { time: 2, core_0: 10, core_1: 80, core_2: 30, core_3: 10 },
      { time: 3, core_0: 30, core_1: 100, core_2: 40, core_3: 10 },
      { time: 4, core_0: 20, core_1: 90, core_2: 50, core_3: 10 },
    ])
  })

  test("rejects malformed core entries without coercing invalid values to 0", () => {
    const rows = [
      { time_offset_secs: "1", processCpu: 10.0 },
      { time_offset_secs: "2", coresCpu: [40, null, 20, 10] },
      { time_offset_secs: "3", coresCpu: [40, "", 20, 10] },
      { time_offset_secs: "4", coresCpu: [40, false, 20, 10] },
      { time_offset_secs: "5", coresCpu: [40, -5, 20, 10] },
      { time_offset_secs: "6", coresCpu: ["12.346", 50, "0", 25] },
      { time_offset_secs: "8", coresCpu: [20, 50, 40, 25] },
    ]

    const extracted = extractPerCoreCpuData(rows, 3)
    expect(extracted).not.toBeNull()
    expect(extracted?.coreCount).toBe(4)
    expect(extracted?.topologyChanged).toBe(false)
    expect(extracted?.timeSeries).toEqual([
      { time: 6, core_0: 12.35, core_1: 50, core_2: 0, core_3: 25 },
      { time: 8, core_0: 20, core_1: 50, core_2: 40, core_3: 25 },
    ])
  })

  test("retains the latest contiguous CPU-count segment after CPU hotplug", () => {
    const rows = [
      { time_offset_secs: "1", coresCpu: [40, 60, 20, 10] },
      { time_offset_secs: "2", coresCpu: [50, 70, 30, 10] },
      { time_offset_secs: "3", processCpu: 25.0 },
      { time_offset_secs: "4", coresCpu: [80, 30] },
      { time_offset_secs: "5", coresCpu: [90, 50] },
    ]

    const extracted = extractPerCoreCpuData(rows, 4)
    expect(extracted).not.toBeNull()
    expect(extracted?.coreCount).toBe(2)
    expect(extracted?.topologyChanged).toBe(true)
    expect(extracted?.segmentStartTime).toBe(4)
    expect(extracted?.summaries).toEqual([
      { coreIndex: 0, label: "Slot 0", key: "core_0", average: 85, peak: 90 },
      { coreIndex: 1, label: "Slot 1", key: "core_1", average: 40, peak: 50 },
    ])
    expect(extracted?.timeSeries).toEqual([
      { time: 4, core_0: 80, core_1: 30 },
      { time: 5, core_0: 90, core_1: 50 },
    ])
  })

  test("splits same-count core swaps when an omitted coresCpu row marks a topology transition", () => {
    const rows = [
      { time_offset_secs: "1", logicalCpuCount: 4, coresCpu: [10, 20, 30, 90] },
      { time_offset_secs: "2", logicalCpuCount: 4, coresCpu: [10, 20, 30, 90] },
      // Same-count core swap ({0,1,2,3} -> {0,1,2,4}): accumulator omits coresCpu for one sample.
      { time_offset_secs: "3", logicalCpuCount: 4, processCpuTotal: 150.0 },
      { time_offset_secs: "4", logicalCpuCount: 4, coresCpu: [50, 60, 40, 10] },
      { time_offset_secs: "5", logicalCpuCount: 4, coresCpu: [70, 80, 20, 30] },
    ]

    const extracted = extractPerCoreCpuData(rows, 2)
    expect(extracted).not.toBeNull()
    expect(extracted?.coreCount).toBe(4)
    expect(extracted?.topologyChanged).toBe(true)
    expect(extracted?.segmentStartTime).toBe(4)
    expect(extracted?.summaries).toEqual([
      { coreIndex: 0, label: "Slot 0", key: "core_0", average: 60, peak: 70 },
      { coreIndex: 1, label: "Slot 1", key: "core_1", average: 70, peak: 80 },
      { coreIndex: 2, label: "Slot 2", key: "core_2", average: 30, peak: 40 },
      { coreIndex: 3, label: "Slot 3", key: "core_3", average: 20, peak: 30 },
    ])

    const initialTransition = extractPerCoreCpuData([
      { time_offset_secs: "1", logicalCpuCount: 4, processCpuTotal: 110.0 },
      { time_offset_secs: "2", logicalCpuCount: 4, coresCpu: [25, 35, 45, 55] },
    ])
    expect(initialTransition?.topologyChanged).toBe(true)
    expect(initialTransition?.segmentStartTime).toBe(2)

    const trailingOmitted = extractPerCoreCpuData([
      { time_offset_secs: "1", logicalCpuCount: 4, coresCpu: [20, 30, 40, 50] },
      { time_offset_secs: "2", logicalCpuCount: 4, coresCpu: [30, 40, 50, 60] },
      { time_offset_secs: "3", logicalCpuCount: 4, processCpuTotal: 90.0 },
    ])
    expect(trailingOmitted?.topologyChanged).toBe(false)
    expect(trailingOmitted?.timeSeries).toHaveLength(2)
  })

  test("caps timeline points while computing summaries across all samples", () => {
    const rows = Array.from({ length: 2500 }, (_, idx) => ({
      time_offset_secs: idx + 1,
      coresCpu: [idx === 1234 ? 99 : 20, 40],
    }))

    const extracted = extractPerCoreCpuData(rows, 2)
    expect(extracted).not.toBeNull()
    expect(extracted?.timeSeries).toHaveLength(MAX_PER_CORE_TIMELINE_POINTS)
    expect(extracted?.timeSeries[0]?.time).toBe(1)
    expect(extracted?.timeSeries[MAX_PER_CORE_TIMELINE_POINTS - 1]?.time).toBe(2500)
    expect(extracted?.summaries[0]?.peak).toBe(99)
    expect(extracted?.summaries[0]?.average).toBe(20.03)

    const fallbackBounds = extractPerCoreCpuData(rows, Number.NaN, Number.POSITIVE_INFINITY)
    expect(fallbackBounds?.hottestCoreKeys).toHaveLength(2)
    expect(fallbackBounds?.timeSeries).toHaveLength(MAX_PER_CORE_TIMELINE_POINTS)
  })

  test("supports { data: [...] } wrapper, nested metrics.coresCpu, and deterministic tie-breaking", () => {
    const wrapped = {
      data: [
        { time_offset_secs: 1, metrics: { coresCpu: [30, 50, 20, 50] } },
        { time_offset_secs: 2, metrics: { coresCpu: [30, 10, 40, 10] } },
      ],
    }

    const extracted = extractPerCoreCpuData(wrapped, 4)
    expect(extracted?.hottestCoreKeys).toEqual(["core_1", "core_3", "core_2", "core_0"])

    // Out-of-order legacy rows with null offsets derive chronological seconds from initiated timestamps.
    const fromInitiated = extractPerCoreCpuData([
      { time_offset_secs: null, initiated: "2026-11-26T10:00:25.000Z", coresCpu: [60, 40] },
      { time_offset_secs: null, initiated: "2026-11-26T10:00:15.000Z", coresCpu: [20, -1] },
      { time_offset_secs: null, initiated: "2026-11-26T10:00:05.000Z", coresCpu: [10, 20, 30, 40] },
      { time_offset_secs: null, initiated: "2026-11-26T10:00:35.000Z", coresCpu: [80, 20] },
      { time_offset_secs: null, coresCpu: [99, 99] },
    ])
    expect(fromInitiated?.coreCount).toBe(2)
    expect(fromInitiated?.topologyChanged).toBe(true)
    expect(fromInitiated?.segmentStartTime).toBe(20)
    expect(fromInitiated?.timeSeries).toEqual([
      { time: 20, core_0: 60, core_1: 40 },
      { time: 30, core_0: 80, core_1: 20 },
    ])

    // Shared bucket origin aligns timestamp-only metric samples with non-zero first-metric timestamps.
    const bucketOriginMs = computeSampleOriginMs([
      { datetime: "2026-11-26T10:00:05.000Z", time: 5 },
    ])
    expect(bucketOriginMs).toBe(Date.parse("2026-11-26T10:00:00.000Z"))
    const withSharedOrigin = extractPerCoreCpuData(
      [
        { time_offset_secs: null, initiated: "2026-11-26T10:00:12.000Z", coresCpu: [45, 55] },
        { time_offset_secs: null, initiated: "2026-11-26T10:00:18.000Z", coresCpu: [65, 35] },
      ],
      2,
      undefined,
      bucketOriginMs
    )
    expect(withSharedOrigin?.segmentStartTime).toBe(12)
    expect(withSharedOrigin?.timeSeries).toEqual([
      { time: 12, core_0: 45, core_1: 55 },
      { time: 18, core_0: 65, core_1: 35 },
    ])
  })
})
