import type { Pool } from "pg"
import { SYSTEM_METRICS, SDK_SYSTEM_METRICS, getSystemMetricInfo } from "@/src/lib/config/constants"
import { HorizontalAxisDynamicUtil } from "@/src/lib/dashboard/axis"
import {
  createSystemMetricInput,
  createKVOperationInput,
  createHorizontalScalingInput,
  createTransactionInput,
  createTransactionReadOnlyInput,
  createReactiveAPIInput,
  createHorizontalScalingReactiveInput,
} from "@/src/lib/dashboard/queries"
import {
  buildRunsWithBucketsQuery,
  buildRunsWithMetricsQuery,
  buildSafeJsonbFloatSql,
  buildSimplifiedGraphQuery,
  buildSimplifiedMetricQuery,
  extractChartAggregatedValue,
  NUMERIC_JSON_VALUE_PATTERN,
} from "@/src/lib/dashboard/graph-builders"
import { buildDashboardInputForVersion } from "@/src/lib/dashboard/query-factory"
import {
  ResultType,
  type DatabaseCompare,
  type HorizontalAxisDynamic,
  type Input,
  type VerticalAxisBucketsColumn,
  type VerticalAxisMetric,
} from "@/src/lib/dashboard/dashboard-query-types"
import { DatabaseService } from "@/src/lib/database-service"
import { DataTransformers } from "@/src/shared/data/transformers"
import {
  applyQueryTypeSearchParams,
  getQueryTypeFromInput,
  isNonVersionGroupingQueryType,
} from "@/src/shared/charts/query-intent"
import { resolveBarClusterVersion } from "@/src/shared/charts/use-performance-bar-chart"

const RUN_PRESENT = "11111111-1111-4111-8111-111111111111"
const RUN_ZERO = "22222222-2222-4222-8222-222222222222"
const RUN_MISSING = "33333333-3333-4333-8333-333333333333"
const RUN_EXTRA = "44444444-4444-4444-8444-444444444444"

describe("system metric queries and bar transformations", () => {
  test("buildSimplifiedMetricQuery filters missing JSON keys and aggregates run_ids", () => {
    const input = createSystemMetricInput("C++", "processCpuTotal")
    expect(input.trimmingSeconds).toBe(0)
    const sql = buildSimplifiedMetricQuery(
      [RUN_PRESENT, RUN_ZERO],
      input.hAxis as unknown as HorizontalAxisDynamic,
      input.yAxes[0] as unknown as VerticalAxisMetric,
      input as unknown as Input
    )
    expect(sql).toContain("metrics.metrics::jsonb ? 'processCpuTotal'")
    expect(sql).toContain(NUMERIC_JSON_VALUE_PATTERN)
    const metricKey = (input.yAxes[0] as unknown as VerticalAxisMetric).metric
    expect(sql).toContain("WHERE metric IS NOT NULL")
    expect(sql).toContain(
      buildSafeJsonbFloatSql(`metrics.metrics::jsonb->>'${metricKey}'`, `'${NUMERIC_JSON_VALUE_PATTERN}'`)
    )
    expect(sql).toContain("array_agg(DISTINCT run_id) AS run_ids")
    expect(sql).not.toContain("time_offset_secs >=")

    const unbucketisedMetricsSql = buildRunsWithMetricsQuery(input as unknown as Input, "processCpu")
    expect(unbucketisedMetricsSql).toContain(
      buildSafeJsonbFloatSql("metrics.metrics::jsonb->>'processCpu'", `'${NUMERIC_JSON_VALUE_PATTERN}'`)
    )
    expect(unbucketisedMetricsSql).toContain(
      `AND (metrics.metrics::jsonb->>'processCpu') ~ '${NUMERIC_JSON_VALUE_PATTERN}'`
    )

    const bucketisedMetricsSql = buildRunsWithMetricsQuery(
      { ...input, bucketiseSeconds: 10 } as unknown as Input,
      "processCpu"
    )
    expect(bucketisedMetricsSql).toContain(
      `avg(${buildSafeJsonbFloatSql("metrics.metrics::jsonb->>'processCpu'", `'${NUMERIC_JSON_VALUE_PATTERN}'`)})`
    )
    expect(bucketisedMetricsSql).toContain(
      `AND (metrics.metrics::jsonb->>'processCpu') ~ '${NUMERIC_JSON_VALUE_PATTERN}'`
    )

    const trimmedSql = buildSimplifiedMetricQuery(
      [RUN_PRESENT],
      input.hAxis as unknown as HorizontalAxisDynamic,
      input.yAxes[0] as unknown as VerticalAxisMetric,
      { ...input, trimmingSeconds: 20 } as unknown as Input
    )
    expect(trimmedSql).toContain("AND metrics.time_offset_secs >= 20")

    expect(() =>
      buildSimplifiedMetricQuery(
        [RUN_PRESENT],
        input.hAxis as unknown as HorizontalAxisDynamic,
        { type: "metric", metric: "bad'); DROP TABLE runs;--", yAxisID: "y" },
        input as unknown as Input
      )
    ).toThrow("Invalid metric name")

    expect(() =>
      buildSimplifiedGraphQuery(
        "params->'impl'->>'version'",
        [RUN_PRESENT],
        input as unknown as Input,
        { type: "buckets", column: "duration_average_us) FROM buckets;--", yAxisID: "y" } as VerticalAxisBucketsColumn
      )
    ).toThrow("Invalid bucket metric column")

    expect(() =>
      buildSimplifiedGraphQuery(
        "params->'impl'->>'version'); DROP TABLE runs;--",
        [RUN_PRESENT],
        input as unknown as Input,
        { type: "buckets", column: "duration_average_us", yAxisID: "y" } as VerticalAxisBucketsColumn
      )
    ).toThrow("Invalid groupBy expression")

    expect(
      HorizontalAxisDynamicUtil.databaseRepresentation1({
        type: "dynamic",
        databaseField: "privateEndpointsEnabled",
        resultType: ResultType.STRING,
      })
    ).toBe("params->>'privateEndpointsEnabled'")
    expect(
      HorizontalAxisDynamicUtil.databaseRepresentation2({
        type: "dynamic",
        databaseField: "privateEndpointsEnabled",
        resultType: ResultType.STRING,
      })
    ).toBe("{privateEndpointsEnabled}")
    expect(
      buildSimplifiedGraphQuery(
        "params->>'privateEndpointsEnabled'",
        [RUN_PRESENT],
        input as unknown as Input,
        { type: "buckets", column: "duration_average_us", yAxisID: "y" } as VerticalAxisBucketsColumn
      )
    ).toContain("params->>'privateEndpointsEnabled' as grouping")
    expect(
      HorizontalAxisDynamicUtil.databaseRepresentation1({
        type: "dynamic",
        databaseField: "vars.horizontalScaling",
        resultType: ResultType.INTEGER,
      })
    ).toBe("params->'vars'->>'horizontalScaling'")
    expect(() =>
      HorizontalAxisDynamicUtil.databaseRepresentation1({
        type: "dynamic",
        databaseField: "impl.version'); DROP TABLE runs;--",
        resultType: ResultType.VERSION_SEMVER,
      })
    ).toThrow("Invalid axis databaseField")
    expect(() =>
      HorizontalAxisDynamicUtil.databaseRepresentation2({
        type: "dynamic",
        databaseField: "impl.version}",
        resultType: ResultType.VERSION_SEMVER,
      })
    ).toThrow("Invalid axis databaseField")
  })

  test("DatabaseService.getRuns parameterizes comparison JSON and groupBy path", async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = []
    const fakePool = {
      query: async (sql: string, params: unknown[]) => {
        calls.push({ sql, params })
        return { rows: [] }
      },
    } as unknown as Pool

    const db = new DatabaseService(fakePool)
    const untrustedCluster = "7.1.1'}) OR true --"
    const compare: DatabaseCompare = {
      cluster: { version: untrustedCluster },
      impl: { language: "C++" },
    }
    await db.getRuns(compare, "{impl,version}")

    expect(calls).toHaveLength(1)
    expect(calls[0]?.sql).toContain("where (params) @> ($1::jsonb #- $2::text[])")
    expect(calls[0]?.sql).not.toContain(untrustedCluster)
    expect(calls[0]?.params).toEqual([
      JSON.stringify({ cluster: { version: untrustedCluster }, impl: { language: "C++" } }),
      "{impl,version}",
    ])
  })

  test("DatabaseService.getRunSystemMetricValues uses UUID array predicate and omits missing runs", async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = []
    const fakePool = {
      query: async (sql: string, params: unknown[]) => {
        calls.push({ sql, params })
        return {
          rows: [
            { run_id: RUN_PRESENT, value: "230.46" },
            { run_id: RUN_ZERO, value: 0 },
            { run_id: RUN_EXTRA, value: null },
          ],
        }
      },
    } as unknown as Pool

    const db = new DatabaseService(fakePool)
    const avgValues = await db.getRunSystemMetricValues(
      [RUN_PRESENT, RUN_ZERO, RUN_MISSING, "not-a-uuid"],
      "processCpuTotal",
      "Average"
    )
    const expectedSafeFloatParamSql = buildSafeJsonbFloatSql("metrics.metrics::jsonb->>$2", "$3")
    expect(calls[0]?.sql).toContain(`AVG(${expectedSafeFloatParamSql})`)
    expect(calls[0]?.sql).toContain("WHERE run_id = ANY($1::uuid[])")
    expect(calls[0]?.params).toEqual([
      [RUN_PRESENT, RUN_ZERO, RUN_MISSING],
      "processCpuTotal",
      NUMERIC_JSON_VALUE_PATTERN,
      0,
    ])
    expect(avgValues).toEqual({ [RUN_PRESENT]: 230.46, [RUN_ZERO]: 0 })
    expect(avgValues[RUN_MISSING]).toBeUndefined()

    await db.getRunSystemMetricValues([RUN_PRESENT], "memRssUsedMB", "Maximum", 20)
    expect(calls[1]?.sql).toContain(`MAX(${expectedSafeFloatParamSql})`)
    expect(calls[1]?.params?.[3]).toBe(20)

    const rejectedMetric = await db.getRunSystemMetricValues([RUN_PRESENT], "bad'name", "Average")
    expect(rejectedMetric).toEqual({})
    const rejectedIds = await db.getRunSystemMetricValues(["invalid-id"], "processCpuTotal", "Average")
    expect(rejectedIds).toEqual({})
    expect(calls).toHaveLength(2)

    const failingDb = new DatabaseService({
      query: async () => {
        throw new Error("db unavailable")
      },
    } as unknown as Pool)
    await expect(
      failingDb.getRunSystemMetricValues([RUN_PRESENT], "processCpuTotal", "Average")
    ).rejects.toThrow("db unavailable")

    const cohortCalls: Array<{ sql: string; params: unknown[] }> = []
    const cohortDb = new DatabaseService({
      query: async (sql: string, params: unknown[]) => {
        cohortCalls.push({ sql, params })
        return { rows: [{ value: "187.5" }] }
      },
    } as unknown as Pool)
    const sysInput = createSystemMetricInput("C++", "processCpu") as unknown as Input
    await expect(cohortDb.getCohortAggregatedValue([RUN_PRESENT, RUN_ZERO], sysInput)).resolves.toBe(187.5)
    expect(cohortCalls[0]?.sql).toContain(`AVG(${expectedSafeFloatParamSql})`)
    expect(cohortCalls[0]?.params).toEqual([
      [RUN_PRESENT, RUN_ZERO],
      "processCpu",
      NUMERIC_JSON_VALUE_PATTERN,
      0,
    ])

    const kvInput = createKVOperationInput("C++", "get", false, true, "duration_p95_us") as unknown as Input
    await expect(cohortDb.getCohortAggregatedValue([RUN_PRESENT], kvInput)).resolves.toBe(187.5)
    expect(cohortCalls[1]?.sql).toContain("AVG(buckets.duration_p95_us)")
    expect(cohortCalls[1]?.params).toEqual([[RUN_PRESENT], 20])
    await expect(cohortDb.getCohortAggregatedValue([], kvInput)).resolves.toBeNull()
    await expect(cohortDb.getCohortAggregatedValue(["bad-id"], kvInput)).resolves.toBeNull()
    await expect(failingDb.getCohortAggregatedValue([RUN_PRESENT], sysInput)).rejects.toThrow("db unavailable")

    const bucketCalls: Array<{ sql: string; params: unknown[] }> = []
    const bucketDb = new DatabaseService({
      query: async (sql: string, params: unknown[]) => {
        bucketCalls.push({ sql, params })
        return {
          rows: [
            { run_id: RUN_PRESENT, value: "4200.5" },
            { run_id: RUN_ZERO, value: 0 },
          ],
        }
      },
    } as unknown as Pool)
    const bucketValues = await bucketDb.getRunBucketMetricValues(
      [RUN_PRESENT, RUN_ZERO, "invalid-id"],
      "operations_total",
      "Average",
      20
    )
    expect(bucketCalls[0]?.sql).toContain("AVG(buckets.operations_total)")
    expect(bucketCalls[0]?.params).toEqual([[RUN_PRESENT, RUN_ZERO], 20])
    expect(bucketValues).toEqual({ [RUN_PRESENT]: 4200.5, [RUN_ZERO]: 0 })
    await expect(
      bucketDb.getRunBucketMetricValues([RUN_PRESENT], "bad_col", "Average", 20)
    ).rejects.toThrow("Invalid bucket metric column")
    await expect(
      failingDb.getRunBucketMetricValues([RUN_PRESENT], "duration_p95_us", "Average", 20)
    ).rejects.toThrow("db unavailable")

    const neverCalledDb = new DatabaseService({
      query: async () => {
        throw new Error("pool should not be queried for empty cohorts")
      },
    } as unknown as Pool)
    await expect(
      neverCalledDb.getSimplifiedGraph(
        "params->'impl'->>'version'",
        [],
        kvInput,
        kvInput.yAxes[0] as VerticalAxisBucketsColumn
      )
    ).resolves.toEqual([])
    await expect(
      neverCalledDb.getRunsWithBuckets([], kvInput, "duration_average_us", false, false)
    ).resolves.toEqual([])
    await expect(
      neverCalledDb.getRunsWithBuckets([], kvInput, "", false, true)
    ).resolves.toEqual([])
    await expect(
      neverCalledDb.getRunsWithMetrics([], sysInput, "processCpu")
    ).resolves.toEqual([])
    await expect(
      neverCalledDb.getRunsWithBuckets(["not-a-uuid"], kvInput, "duration_average_us", false, false)
    ).rejects.toThrow("No valid UUID run IDs provided")
    await expect(
      neverCalledDb.getRunsWithMetrics(["not-a-uuid"], sysInput, "processCpu")
    ).rejects.toThrow("No valid UUID run IDs provided")

    const unbucketisedBucketsSql = buildRunsWithBucketsQuery(
      [RUN_PRESENT],
      kvInput,
      "duration_average_us",
      false,
      false
    )
    expect(unbucketisedBucketsSql).toContain("buckets.run_id = ANY($1::uuid[])")
    expect(unbucketisedBucketsSql).toContain("buckets.time_offset_secs >= $2::bigint")

    const bucketisedBucketsSql = buildRunsWithBucketsQuery(
      [RUN_PRESENT],
      { ...kvInput, bucketiseSeconds: 10 } as unknown as Input,
      "",
      false,
      true
    )
    expect(bucketisedBucketsSql).toContain("buckets.run_id = ANY($1::uuid[])")
    expect(bucketisedBucketsSql).toContain("buckets.time_offset_secs >= $2::bigint")

    const fullBucketCalls: Array<{ sql: string; params: unknown[] }> = []
    const fullBucketDb = new DatabaseService({
      query: async (sql: string, params: unknown[]) => {
        fullBucketCalls.push({ sql, params })
        return {
          rows: [
            {
              run_id: RUN_PRESENT,
              datetime: "2026-11-26T18:00:20.000Z",
              time_offset_secs: "20",
              value: 145,
              errors: null,
              metrics: null,
            },
          ],
        }
      },
    } as unknown as Pool)
    const fullPairs = await fullBucketDb.getRunsWithBuckets(
      [RUN_PRESENT, "not-a-uuid"],
      kvInput,
      "duration_average_us",
      false,
      false
    )
    expect(fullBucketCalls[0]?.params).toEqual([[RUN_PRESENT], 20])
    expect(fullPairs).toHaveLength(1)
  })

  test("extractChartAggregatedValue requires exact run-ID cohort match when targetRunIds are supplied", () => {
    const chartData = {
      data: {
        labels: ["main", "main@34173e4"],
        datasets: [{ data: [180.25, 230.46] }],
        runIds: [
          [RUN_PRESENT, RUN_EXTRA],
          [RUN_ZERO, RUN_MISSING, RUN_ZERO],
        ],
      },
    }

    expect(extractChartAggregatedValue(chartData, "main")).toBe(180.25)
    expect(extractChartAggregatedValue(chartData, "main", [RUN_MISSING, RUN_ZERO])).toBe(230.46)
    expect(
      extractChartAggregatedValue(chartData, "main", [
        RUN_MISSING.toUpperCase(),
        RUN_ZERO.toUpperCase(),
      ])
    ).toBe(230.46)
    expect(extractChartAggregatedValue(chartData, "main", [RUN_PRESENT])).toBeNull()
    expect(extractChartAggregatedValue(chartData, "main", [RUN_ZERO, RUN_EXTRA])).toBeNull()
  })

  test("DataTransformers.toBarChartFromDashboard omits null and empty values while keeping numeric 0", () => {
    const transformed = DataTransformers.toBarChartFromDashboard(
      {
        results: [
          { grouping: "1.0.0", value: null, runIds: ["r1"] },
          { grouping: "1.1.0", value: undefined, runIds: ["r2"] },
          { grouping: "1.1.1", value: "", runIds: ["r2b"] },
          { grouping: "1.2.0", value: 0, runIds: ["r3"] },
          { grouping: "main@34173e4", value: 230.46, runIds: ["r4"] },
        ],
      },
      "C++"
    )

    expect(transformed.map((d) => ({ name: d.name, value: d.value }))).toEqual([
      { name: "1.2.0", value: 0 },
      { name: "main@34173e4", value: 230.46 },
    ])

    const fromDatasets = DataTransformers.toBarChartFromDashboard(
      {
        data: {
          labels: ["1.0.0", "1.2.0", "main@34173e4"],
          datasets: [{ data: [null, 0, 14.75] }],
          runIds: [["r1"], ["r2"], ["r3"]],
        },
      },
      "C++"
    )

    expect(fromDatasets.map((d) => ({ name: d.name, value: d.value }))).toEqual([
      { name: "1.2.0", value: 0 },
      { name: "main@34173e4", value: 14.75 },
    ])
  })
})

describe("C++ extended system metrics configuration", () => {
  test("documents processCpu as the Java OperatingSystemMXBean.getProcessCpuLoad()*100 equivalent", () => {
    const processCpu = SYSTEM_METRICS.find((m) => m.id === "processCpu")
    expect(processCpu?.metric).toBe("processCpu")
    expect(processCpu?.description).toContain("getProcessCpuLoad")
  })

  test("defines C++ extended system metrics and defaultVisible flags", () => {
    expect(SDK_SYSTEM_METRICS.cpp.map((m) => ({ metric: m.metric, defaultVisible: m.defaultVisible }))).toEqual([
      { metric: "processCpuTotal", defaultVisible: true },
      { metric: "processCpuUser", defaultVisible: false },
      { metric: "processCpuSys", defaultVisible: false },
      { metric: "maxThreadCpu", defaultVisible: true },
      { metric: "maxCoreCpu", defaultVisible: false },
      { metric: "memRssUsedMB", defaultVisible: true },
    ])
  })

  test("getSystemMetricInfo resolves labels and units for standard and C++ extended metrics", () => {
    expect(getSystemMetricInfo("processCpu")).toEqual({ label: "Process CPU", unit: "%" })
    expect(getSystemMetricInfo("processCpuTotal")).toEqual({ label: "Process CPU (Cumulative)", unit: "%" })
    expect(getSystemMetricInfo("processCpuUser")).toEqual({ label: "Process CPU (User)", unit: "%" })
    expect(getSystemMetricInfo("processCpuSys")).toEqual({ label: "Process CPU (Kernel)", unit: "%" })
    expect(getSystemMetricInfo("maxThreadCpu")).toEqual({ label: "Busiest Thread CPU", unit: "%" })
    expect(getSystemMetricInfo("maxCoreCpu")).toEqual({ label: "Hottest Host Core CPU", unit: "%" })
    expect(getSystemMetricInfo("systemCpuSteal")).toEqual({ label: "System CPU Steal", unit: "%" })
    expect(getSystemMetricInfo("systemCpuIoWait")).toEqual({ label: "System CPU I/O Wait", unit: "%" })
    expect(getSystemMetricInfo("memRssUsedMB")).toEqual({ label: "RSS Memory Used", unit: "MB" })
    expect(getSystemMetricInfo("memVmsMB")).toEqual({ label: "VMS Memory", unit: "MB" })
    expect(getSystemMetricInfo("threadCount")).toEqual({ label: "Thread Count", unit: "" })
    expect(getSystemMetricInfo("duration_average_us")).toBeNull()
    expect(getSystemMetricInfo("constructor")).toBeNull()
    expect(getSystemMetricInfo("toString")).toBeNull()
    expect(getSystemMetricInfo("__proto__")).toBeNull()
  })

  test("uses Average merging for CPU percentages, Maximum for memory/threads, and preserves drill-down metric", () => {
    for (const cpuMetric of [
      "processCpu",
      "systemCpu",
      "processCpuTotal",
      "processCpuUser",
      "processCpuSys",
      "maxThreadCpu",
      "maxCoreCpu",
      "systemCpuSteal",
      "systemCpuIoWait",
    ]) {
      const input = createSystemMetricInput("C++", cpuMetric)
      expect(input.mergingType).toBe("Average")
      expect(input.yAxes[0]).toEqual({ type: "metric", metric: cpuMetric, yAxisID: "y" })

      const versionInput = buildDashboardInputForVersion({
        sdk: "C++",
        metric: cpuMetric,
        systemMetric: cpuMetric,
      })
      expect(versionInput.yAxes[0]).toEqual({ type: "metric", metric: cpuMetric, yAxisID: "y" })

      const tileInput = buildDashboardInputForVersion({
        sdk: "cpp",
        metric: cpuMetric,
        cluster: "7.1.1-3175-enterprise",
      })
      expect(tileInput.yAxes[0]).toEqual({ type: "metric", metric: cpuMetric, yAxisID: "y" })
      expect(tileInput.databaseCompare.impl?.language).toBe("C++")
      expect(tileInput.databaseCompare.cluster?.version).toBe("7.1.1-3175-enterprise")
    }

    const untrustedSystemMetric = buildDashboardInputForVersion({
      sdk: "cpp",
      metric: "duration_average_us",
      systemMetric: "bad')--",
    })
    expect(untrustedSystemMetric.yAxes[0]).toEqual({
      type: "buckets",
      column: "duration_average_us",
      yAxisID: "y",
    })

    const inheritedKeyMetric = buildDashboardInputForVersion({
      sdk: "cpp",
      metric: "constructor",
      systemMetric: "toString",
    })
    expect(inheritedKeyMetric.yAxes[0]).toEqual({
      type: "buckets",
      column: "duration_average_us",
      yAxisID: "y",
    })

    const craftedScalingMetric = buildDashboardInputForVersion({
      sdk: "cpp",
      metric: "duration_average_us) FROM buckets;--",
      horizontalScaling: "20",
    })
    expect(craftedScalingMetric.yAxes[0]).toEqual({
      type: "buckets",
      column: "duration_average_us",
      yAxisID: "y",
    })

    const txOpsInput = buildDashboardInputForVersion({
      sdk: "cpp",
      metric: "operations_total",
      transactionThreads: "20",
    })
    expect(txOpsInput.yAxes[0]).toEqual({
      type: "buckets",
      column: "operations_total",
      yAxisID: "y",
    })

    const reactiveOpsInput = buildDashboardInputForVersion({
      sdk: "cpp",
      metric: "operations_success",
      reactiveAPI: "ASYNC",
    })
    expect(reactiveOpsInput.yAxes[0]).toEqual({
      type: "buckets",
      column: "operations_success",
      yAxisID: "y",
    })
    expect((reactiveOpsInput.databaseCompare.vars as Record<string, unknown>)?.api).toBe("ASYNC")
    expect(
      createReactiveAPIInput("C++", "DEFAULT", false, true, undefined, "duration_p95_us").yAxes[0]
    ).toEqual({
      type: "buckets",
      column: "duration_p95_us",
      yAxisID: "y",
    })
    expect(
      createHorizontalScalingReactiveInput("C++", false, true, undefined, "duration_p99_us").yAxes[0]
    ).toEqual({
      type: "buckets",
      column: "duration_p99_us",
      yAxisID: "y",
    })

    expect(resolveBarClusterVersion({}, createSystemMetricInput("C++", "processCpuTotal", false, true, "8.0.0-3777-enterprise"))).toBe(
      "8.0.0-3777-enterprise"
    )
    expect(
      resolveBarClusterVersion(
        { clusterVersion: "7.6.6" },
        createSystemMetricInput("C++", "processCpuTotal", false, true, "8.0.0-3777-enterprise")
      )
    ).toBe("7.6.6")

    for (const maxMetric of ["memHeapUsedMB", "memRssUsedMB", "memVmsMB", "threadCount"]) {
      expect(createSystemMetricInput("C++", maxMetric).mergingType).toBe("Maximum")
    }
  })

  test("classifies metric yAxes, preserves precedence, and falls back for non-system columns", () => {
    expect(getQueryTypeFromInput(createSystemMetricInput("C++", "processCpuTotal"))).toEqual({
      type: "systemMetric",
      metric: "processCpuTotal",
    })
    expect(getQueryTypeFromInput(createSystemMetricInput("C++", "maxThreadCpu"))).toEqual({
      type: "systemMetric",
      metric: "maxThreadCpu",
    })
    expect(getQueryTypeFromInput({ yAxes: [{ column: "memRssUsedMB" }] })).toEqual({
      type: "systemMetric",
      metric: "memRssUsedMB",
    })
    expect(
      getQueryTypeFromInput({
        vars: { horizontalScaling: 20, experimentName: "horizontalScaling" },
        yAxes: [{ type: "metric", metric: "processCpuTotal" }],
      })
    ).toBe("horizontalScaling")
    expect(getQueryTypeFromInput({ yAxes: [{ column: "duration_average_us" }] })).toBe("kvOperation")

    // KV, blocking API, reactive API, and horizontal scaling with operations_total must not misclassify as transactions
    const kvOpsTotal = createKVOperationInput("Java", "get", false, true, "operations_total")
    expect(getQueryTypeFromInput(kvOpsTotal)).toBe("kvOperation")
    expect(isNonVersionGroupingQueryType(getQueryTypeFromInput(kvOpsTotal))).toBe(false)

    const blockingOpsTotal = createReactiveAPIInput("Java", "DEFAULT", false, true, undefined, "operations_total")
    const blockingType = getQueryTypeFromInput(blockingOpsTotal)
    expect(blockingType).toEqual({ type: "reactiveAPI", api: "DEFAULT" })
    expect(isNonVersionGroupingQueryType(blockingType)).toBe(false)
    const blockingParams = new URLSearchParams()
    applyQueryTypeSearchParams(blockingParams, blockingType)
    expect(Object.fromEntries(blockingParams.entries())).toEqual({ reactiveAPI: "DEFAULT" })
    const blockingRebuilt = buildDashboardInputForVersion({
      sdk: "java",
      metric: "operations_total",
      reactiveAPI: blockingParams.get("reactiveAPI"),
    })
    expect((blockingRebuilt.databaseCompare.vars as Record<string, unknown>)?.api).toBe("DEFAULT")
    expect((blockingRebuilt.databaseCompare.vars as Record<string, unknown>)?.poolSize).toBe(10000)
    expect(blockingRebuilt.yAxes[0]).toEqual({ type: "buckets", column: "operations_total", yAxisID: "y" })

    const reactiveOpsTotal = createReactiveAPIInput("Java", "ASYNC", false, true, undefined, "operations_total")
    const reactiveType = getQueryTypeFromInput(reactiveOpsTotal)
    expect(reactiveType).toBe("reactiveAPI")
    expect(isNonVersionGroupingQueryType(reactiveType)).toBe(false)
    const reactiveParams = new URLSearchParams()
    applyQueryTypeSearchParams(reactiveParams, reactiveType)
    expect(Object.fromEntries(reactiveParams.entries())).toEqual({ reactiveAPI: "ASYNC" })

    const scalingOpsTotal = createHorizontalScalingInput("Java", false, true, "operations_total")
    const scalingType = getQueryTypeFromInput(scalingOpsTotal)
    expect(scalingType).toBe("horizontalScaling")
    expect(isNonVersionGroupingQueryType(scalingType)).toBe(true)
    const scalingParams = new URLSearchParams()
    applyQueryTypeSearchParams(scalingParams, scalingType, "20")
    expect(Object.fromEntries(scalingParams.entries())).toEqual({ horizontalScaling: "20" })

    const reactiveScalingOpsTotal = createHorizontalScalingReactiveInput(
      "Java",
      false,
      true,
      undefined,
      "operations_total"
    )
    const reactiveScalingType = getQueryTypeFromInput(reactiveScalingOpsTotal)
    expect(reactiveScalingType).toEqual({ type: "horizontalScaling", api: "ASYNC" })
    expect(isNonVersionGroupingQueryType(reactiveScalingType)).toBe(true)
    const reactiveScalingParams = new URLSearchParams()
    applyQueryTypeSearchParams(reactiveScalingParams, reactiveScalingType, "20")
    expect(Object.fromEntries(reactiveScalingParams.entries())).toEqual({
      horizontalScaling: "20",
      reactiveAPI: "ASYNC",
    })
    const reactiveScalingRebuilt = buildDashboardInputForVersion({
      sdk: "java",
      metric: "operations_total",
      horizontalScaling: reactiveScalingParams.get("horizontalScaling"),
      reactiveAPI: reactiveScalingParams.get("reactiveAPI"),
    })
    expect((reactiveScalingRebuilt.hAxis as { databaseField?: string }).databaseField).toBe(
      "vars.horizontalScaling"
    )
    expect((reactiveScalingRebuilt.databaseCompare.vars as Record<string, unknown>)?.api).toBe("ASYNC")
    expect((reactiveScalingRebuilt.databaseCompare.vars as Record<string, unknown>)?.experimentName).toBe(
      "horizontalScaling"
    )
    expect(reactiveScalingRebuilt.yAxes[0]).toEqual({
      type: "buckets",
      column: "operations_total",
      yAxisID: "y",
    })

    expect(getQueryTypeFromInput(createTransactionInput("Java", 20, false, true, undefined, "operations_total"))).toEqual({
      type: "transaction",
      threads: 20,
    })
    const txWrite1Duration = createTransactionInput("Java", 1, false, true, undefined, "duration_average_us")
    const txWrite1Type = getQueryTypeFromInput(txWrite1Duration)
    expect(txWrite1Type).toEqual({ type: "transaction", threads: 1 })
    expect(isNonVersionGroupingQueryType(txWrite1Type)).toBe(false)
    const txWrite1Params = new URLSearchParams()
    applyQueryTypeSearchParams(txWrite1Params, txWrite1Type)
    expect(Object.fromEntries(txWrite1Params.entries())).toEqual({ transactionThreads: "1" })
    const txWrite1Rebuilt = buildDashboardInputForVersion({
      sdk: "java",
      metric: "duration_average_us",
      transactionThreads: txWrite1Params.get("transactionThreads"),
      transactionReadonly: txWrite1Params.get("transactionReadonly"),
    })
    expect((txWrite1Rebuilt.databaseCompare.vars as Record<string, unknown>)?.horizontalScaling).toBe(1)
    expect(
      ((txWrite1Rebuilt.databaseCompare.workload as { operations?: Array<{ transaction?: { ops?: unknown[] } }> })
        .operations?.[0]?.transaction?.ops ?? []).length
    ).toBe(2)
    expect(txWrite1Rebuilt.yAxes[0]).toEqual({ type: "buckets", column: "duration_average_us", yAxisID: "y" })

    const txReadonlyInput = createTransactionReadOnlyInput("Java", 1, false, true, undefined, "duration_p95_us")
    const txReadonlyType = getQueryTypeFromInput(txReadonlyInput)
    expect(txReadonlyType).toEqual({
      type: "transaction",
      threads: 1,
      readonly: true,
    })
    const txReadonlyParams = new URLSearchParams()
    applyQueryTypeSearchParams(txReadonlyParams, txReadonlyType)
    expect(Object.fromEntries(txReadonlyParams.entries())).toEqual({
      transactionThreads: "1",
      transactionReadonly: "true",
    })
    const txReadonlyRebuilt = buildDashboardInputForVersion({
      sdk: "java",
      metric: "duration_p95_us",
      transactionThreads: txReadonlyParams.get("transactionThreads"),
      transactionReadonly: txReadonlyParams.get("transactionReadonly"),
    })
    expect((txReadonlyRebuilt.databaseCompare.vars as Record<string, unknown>)?.horizontalScaling).toBe(1)
    expect(
      ((txReadonlyRebuilt.databaseCompare.workload as { operations?: Array<{ transaction?: { ops?: Array<{ op?: string }> } }> })
        .operations?.[0]?.transaction?.ops ?? []).map((o) => o.op)
    ).toEqual(["get"])
    expect(txReadonlyRebuilt.yAxes[0]).toEqual({ type: "buckets", column: "duration_p95_us", yAxisID: "y" })

    const kvReplaceInput = createKVOperationInput("C++", "replace", false, true, "operations_total")
    const kvReplaceType = getQueryTypeFromInput(kvReplaceInput)
    expect(kvReplaceType).toEqual({ type: "kvOperation", operation: "replace" })
    const kvReplaceParams = new URLSearchParams()
    applyQueryTypeSearchParams(kvReplaceParams, kvReplaceType)
    expect(Object.fromEntries(kvReplaceParams.entries())).toEqual({ kvOperation: "replace" })
    const kvReplaceRebuilt = buildDashboardInputForVersion({
      sdk: "cpp",
      metric: "operations_total",
      kvOperation: kvReplaceParams.get("kvOperation"),
    })
    expect(
      (kvReplaceRebuilt.databaseCompare.workload as { operations?: Array<{ op?: string }> }).operations?.[0]?.op
    ).toBe("replace")
  })
})
