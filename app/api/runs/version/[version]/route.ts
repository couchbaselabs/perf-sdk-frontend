import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseService, getDashboardService } from '@/src/lib/database-connection-pool'
import { getSystemMetricInfo } from '@/src/lib/config/constants'
import { extractChartAggregatedValue, UUID_PATTERN } from '@/src/lib/dashboard/graph-builders'
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
    const cluster = searchParams.get('cluster')
    const runIdsParam = searchParams.get('runIds')
    
    // CRITICAL FIX: Detect query type from URL parameters 
    const horizontalScaling = searchParams.get('horizontalScaling')
    const rawSystemMetric = searchParams.get('systemMetric')
    const systemMetric =
      rawSystemMetric && getSystemMetricInfo(rawSystemMetric)
        ? rawSystemMetric
        : !metric.includes('duration_') && !metric.includes('operations_') && getSystemMetricInfo(metric)
          ? metric
          : null
    const transactionThreads = searchParams.get('transactionThreads')
    const transactionReadonly = searchParams.get('transactionReadonly')
    const reactiveAPI = searchParams.get('reactiveAPI')
    const kvOperation = searchParams.get('kvOperation')
    
    const hasExplicitRunIds = runIdsParam !== null && runIdsParam.trim() !== ''
    const runIds = hasExplicitRunIds
      ? Array.from(new Set(runIdsParam.split(',').map(s => s.trim()).filter(s => UUID_PATTERN.test(s))))
      : undefined

    logger.info(`Getting runs for version`, {
      version,
      sdk,
      metric,
      runIds: hasExplicitRunIds ? (runIds?.length ?? 0) : 'all',
      queryType: horizontalScaling ? 'horizontalScaling' : systemMetric ? 'systemMetric' : transactionThreads ? 'transaction' : reactiveAPI ? 'reactiveAPI' : 'kvOperation'
    })

    const baseInput = buildDashboardInputForVersion({
      sdk,
      metric,
      cluster,
      horizontalScaling,
      systemMetric,
      transactionThreads,
      transactionReadonly,
      reactiveAPI,
      kvOperation,
    })
    
    const databaseService = await getDatabaseService()

    // CRITICAL FIX: When specific runIds are provided, fetch them directly from database
    let chartResult: any = null
    let selectedRuns: any[]
    
    if (hasExplicitRunIds && (!runIds || runIds.length === 0)) {
      selectedRuns = []
    } else if (runIds && runIds.length > 0) {
      logger.debug(`Specific runIds requested - fetching directly from database`, { runIds })
      
      // Get runs directly from database instead of relying on dashboard query
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
      
      logger.info(`Found ${selectedRuns.length} runs directly from database`)
    } else {
      const dashboardService = await getDashboardService()
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
      selectedRuns = horizontalScaling
        ? allRuns.filter((run: any) => String(run?.params?.vars?.horizontalScaling ?? '') === horizontalScaling)
        : allRuns
    }

    // Get individual run metrics from the database service with the same trimming as chart
    const runIdsArray = selectedRuns.map((run: any) => run.id)
    const chartGroupingLabel = horizontalScaling || version
    const aggregatedValue = hasExplicitRunIds
      ? await databaseService.getCohortAggregatedValue(runIdsArray, baseInput)
      : extractChartAggregatedValue(chartResult, chartGroupingLabel)
    const trimmingSeconds = baseInput.trimmingSeconds
    const isSystemMetricSelection =
      Boolean(systemMetric) && !metric.includes('duration_') && !metric.includes('operations_')
    const targetSystemMetric = isSystemMetricSelection ? (systemMetric as string) : null
    const primaryAxis = baseInput.yAxes?.[0] as { type?: string; column?: string } | undefined
    const bucketColumn =
      primaryAxis?.type === 'buckets' && typeof primaryAxis.column === 'string'
        ? primaryAxis.column
        : 'duration_average_us'

    const perRunMetricValues = targetSystemMetric
      ? await databaseService.getRunSystemMetricValues(
          runIdsArray,
          targetSystemMetric,
          String(baseInput.mergingType),
          trimmingSeconds
        )
      : await databaseService.getRunBucketMetricValues(
          runIdsArray,
          bucketColumn,
          String(baseInput.mergingType),
          trimmingSeconds
        )

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
      metricValue: perRunMetricValues[run.id] ?? null
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
