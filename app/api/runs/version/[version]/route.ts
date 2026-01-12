import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseService, getDashboardService } from '@/src/lib/database-connection-pool'
import { logger } from '@/src/lib/utils/logger'
import { buildDashboardInputForVersion } from '@/src/lib/dashboard/query-factory'

/**
 * GET /api/runs/version/[version]
 * 
 * Returns performance runs for a specific version using the unified facade.
 * This ensures data consistency between chart and table by using the same
 * dashboard query and aggregated values.
 * 
 * Query Parameters:
 * - sdk: The SDK language (e.g., 'Java', 'Python')
 * - metric: The metric to aggregate (default: 'duration_average_us')
 * - runIds: Comma-separated list of specific run IDs (optional)
 * 
 * Returns:
 * - runs: Array of run details
 * - aggregatedValue: The aggregated metric value for this version (same as chart)
 * - version: The version string
 * - metric: The metric that was aggregated
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { version: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const version = decodeURIComponent(params.version)
    const sdk = searchParams.get('sdk') || 'Java'
    const metric = searchParams.get('metric') || 'duration_average_us'
    const runIdsParam = searchParams.get('runIds')
    
    // CRITICAL FIX: Detect query type from URL parameters 
    const horizontalScaling = searchParams.get('horizontalScaling')
    const systemMetric = searchParams.get('systemMetric')
    const transactionThreads = searchParams.get('transactionThreads')
    const reactiveAPI = searchParams.get('reactiveAPI')
    
    const runIds = runIdsParam 
      ? Array.from(new Set(runIdsParam.split(',').map(s => s.trim()).filter(Boolean)))
      : undefined

    logger.info(`Getting runs for version`, {
      version,
      sdk,
      metric,
      runIds: runIds?.length || 'all',
      queryType: horizontalScaling ? 'horizontalScaling' : systemMetric ? 'systemMetric' : transactionThreads ? 'transaction' : reactiveAPI ? 'reactiveAPI' : 'kvOperation'
    })

    const baseInput = buildDashboardInputForVersion({
      sdk,
      metric,
      horizontalScaling,
      systemMetric,
      transactionThreads,
      reactiveAPI
    })
    
    const dashboardService = await getDashboardService()

    // Helper to extract aggregated value for a label from chart data
    const extractAggregatedValue = (chartData: any, label: string): number | null => {
      const labels: string[] = chartData?.data?.labels || []
      const dataset = chartData?.data?.datasets?.[0]?.data || []
      const index = labels.findIndex(l => l === label)
      if (index >= 0 && typeof dataset[index] === 'number') {
        return dataset[index] as number
      }
      return null
    }

    // CRITICAL FIX: When specific runIds are provided, fetch them directly from database
    let chartResult: any
    let selectedRuns: any[]
    
    if (runIds && runIds.length > 0) {
      logger.debug(`Specific runIds requested - fetching directly from database`, { runIds })
      
      // Get runs directly from database instead of relying on dashboard query
      const databaseService = await getDatabaseService()
      const dbRuns = await databaseService.getRunsById(runIds)
      
      // Transform database runs to match expected format
      selectedRuns = dbRuns.map((run: any) => ({
        id: run.id,
        datetime: run.datetime,
        params: run.params,
        impl: run.params?.impl || {},
        cluster: run.params?.cluster || {},
        workload: run.params?.workload || {}
      }))
      
      // Still run dashboard query for aggregated value calculation
      chartResult = await dashboardService.genGraph(baseInput)
      
      logger.info(`Found ${selectedRuns.length} runs directly from database`)
    } else {
      // Constrain by version for version-specific view
      const versionInput = {
        ...baseInput,
        databaseCompare: {
          ...baseInput.databaseCompare,
          impl: {
            ...baseInput.databaseCompare.impl,
            version: version
          }
        }
      } as any
      chartResult = await dashboardService.genGraph(versionInput)
      
      const allRuns: any[] = Array.isArray(chartResult?.runs) ? chartResult.runs : []
      selectedRuns = allRuns
    }

    const aggregatedValue = extractAggregatedValue(chartResult, version)

    // Get individual run metrics from the database service with the same trimming as chart
    // (databaseService already initialized above for runIds case)
    let databaseService = await getDatabaseService()
    const runIdsArray = selectedRuns.map((run: any) => run.id)
    const trimmingSeconds = baseInput.trimmingSeconds
    const individualMetrics = await databaseService.getRunMetrics(runIdsArray, trimmingSeconds)
    
    // Helper function to get the metric value based on the selected metric
    const getMetricValue = (runId: string, metricName: string): number | null => {
      const runMetric = individualMetrics[runId]
      if (!runMetric) return null
      
      switch (metricName) {
        case 'duration_average_us':
          return runMetric.latency.avg
        case 'duration_min_us':
          return runMetric.latency.min
        case 'duration_max_us':
          return runMetric.latency.max
        case 'duration_p50_us':
          return runMetric.latency.p50
        case 'duration_p95_us':
          return runMetric.latency.p95
        case 'duration_p99_us':
          return runMetric.latency.p99
        case 'operations_total':
          return runMetric.operations.total
        case 'operations_success':
          return runMetric.operations.success
        case 'operations_failed':
          return runMetric.operations.failed
        default:
          return runMetric.latency.avg // fallback to average
      }
    }

    // Transform runs to the expected format for the table
    const formattedRuns = selectedRuns.map((run: any) => ({
      id: run.id,
      datetime: run.datetime,
      status: 'completed' as const,
      params: run.params,
      language: run.impl?.language || sdk,
      version: run.impl?.version || version,
      sdk: run.impl?.language || sdk,
      clusterVersion: run.cluster?.version || '',
      workload: run.workload?.operations?.[0]?.op || '',
      metricValue: getMetricValue(run.id, metric) // Add the metric value for this run
    }))

    // Debug: Verify consistency between chart aggregation and individual values
    const individualValues = formattedRuns
      .map(run => run.metricValue)
      .filter(val => val !== null) as number[]
    
    const calculatedAverage = individualValues.length > 0 
      ? individualValues.reduce((sum, val) => sum + val, 0) / individualValues.length
      : null

    logger.debug(`Consistency check`, {
      version,
      chartAggregatedValue: aggregatedValue,
      individualValuesAverage: calculatedAverage,
      difference: aggregatedValue && calculatedAverage 
        ? Math.abs(aggregatedValue - calculatedAverage) 
        : 'N/A',
      trimmingSeconds,
      individualCount: individualValues.length
    })

    return NextResponse.json({
      runs: formattedRuns,
      aggregatedValue: aggregatedValue,
      version,
      metric,
      count: formattedRuns.length,
      debug: {
        chartAggregated: aggregatedValue,
        individualAverage: calculatedAverage,
        trimmingApplied: trimmingSeconds
      }
    })

  } catch (error) {
    logger.error(`Error in /api/runs/version/[version]`, error)
    return NextResponse.json(
      { error: 'Failed to fetch runs for version' }, 
      { status: 500 }
    )
  }
}
