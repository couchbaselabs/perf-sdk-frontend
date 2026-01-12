import { NextRequest, NextResponse } from 'next/server'
import { getDashboardService } from '@/src/lib/database-connection-pool'
import { 
  Input, 
  Single, 
  MetricsQuery, 
  SituationalRunQuery, 
  SituationalRunAndRunQuery 
} from '@/src/lib/dashboard/dashboard-query-types'

/**
 * GET /api/dashboard/filtered
 * Returns what's available filtered by display option.
 * Used to get available clusters, workloads, impls, vars based on the horizontal axis selection.
 * 
 * @param hAxis - The horizontal axis field to filter by (e.g., "impl.version", "impl.language")
 * @returns Filtered object containing available options for the specified axis
 */
export async function handleFilteredGet(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const hAxis = searchParams.get('hAxis')

  if (!hAxis || typeof hAxis !== 'string' || hAxis.trim().length === 0) {
    return NextResponse.json({ 
      message: 'Validation failed',
      error: 'Bad Request',
      statusCode: 400,
      details: ['hAxis parameter is required and must be a non-empty string']
    }, { status: 400 })
  }

  const dashboardService = await getDashboardService()
  const result = await dashboardService.getFiltered(hAxis.trim())
  return NextResponse.json(result)
}

/**
 * GET /api/dashboard/groupByOptions
 * Returns available grouping options for dashboard queries.
 * Used by the frontend to populate dropdown menus for grouping selections.
 */
export async function handleGroupByOptionsGet() {
  const dashboardService = await getDashboardService()
  const result = await dashboardService.getGroupBy()
  return NextResponse.json(result)
}

/**
 * GET /api/dashboard/metrics
 * Returns available metrics that can be queried from the metrics table.
 */
export async function handleMetricsGet() {
  const dashboardService = await getDashboardService()
  const result = await dashboardService.getAvailableMetrics()
  return NextResponse.json(result)
}

/**
 * GET /api/dashboard/situationalRuns
 * Returns a list of all available situational runs.
 * Situational runs are grouped test executions for comparative analysis.
 * Used to populate the situational runs listing page.
 * 
 * @returns Array of SituationalRun objects with basic metadata
 */
export async function handleSituationalRunsGet() {
  const dashboardService = await getDashboardService()
  const result = await dashboardService.genSituationalRuns()
  return NextResponse.json(result)
}

/**
 * POST /api/dashboard/query
 * Generates performance graphs. Accepts Input object and returns chart data.
 */
export async function handleQueryPost(request: NextRequest) {
  const dashboardService = await getDashboardService()
  const query = await request.json()

  if (!query || typeof query !== 'object') {
    return NextResponse.json({ 
      message: 'Validation failed', error: 'Bad Request', statusCode: 400,
      details: ['Request body must be a valid Input object']
    }, { status: 400 })
  }

  const errors: string[] = []
  if (!query.hAxis) errors.push('hAxis is required')
  if (!query.yAxes || !Array.isArray(query.yAxes) || query.yAxes.length === 0) errors.push('yAxes must be a non-empty array')
  if (!query.databaseCompare) errors.push('databaseCompare is required')
  if (!query.graphType) errors.push('graphType is required')
  if (typeof query.trimmingSeconds !== 'number') errors.push('trimmingSeconds must be a number')

  if (errors.length > 0) {
    return NextResponse.json({ 
      message: 'Validation failed', error: 'Bad Request', statusCode: 400, details: errors
    }, { status: 400 })
  }

  const input = query as Input
  const result = await dashboardService.genGraph(input)
  return NextResponse.json(result)
}

/**
 * POST /api/dashboard/single - detailed performance data for one run.
 */
export async function handleSinglePost(request: NextRequest) {
  const dashboardService = await getDashboardService()
  const query = await request.json()
  const input = query as Single
  const result = await dashboardService.genSingle(input)
  return NextResponse.json(result)
}

/**
 * POST /api/dashboard/situationalRun - results for a specific situational run by ID.
 */
export async function handleSituationalRunPost(request: NextRequest) {
  const dashboardService = await getDashboardService()
  const body = await request.json()
  const query = body as SituationalRunQuery
  const result = await dashboardService.genSituationalRun(query)
  return NextResponse.json(result)
}

/**
 * POST /api/dashboard/situationalRunRun - detailed results for a specific run within a situational run.
 */
export async function handleSituationalRunRunPost(request: NextRequest) {
  const dashboardService = await getDashboardService()
  const body = await request.json()
  const query: SituationalRunAndRunQuery = { situationalRunId: body.situationalRunId, runId: body.runId }
  const result = await dashboardService.genSituationalRunRun(query)
  return NextResponse.json(result)
}

/**
 * POST /api/dashboard/situationalRunRunErrorsSummary - aggregated error summary for a specific run.
 */
export async function handleSituationalRunRunErrorsSummaryPost(request: NextRequest) {
  const dashboardService = await getDashboardService()
  const body = await request.json()
  const query: SituationalRunAndRunQuery = { situationalRunId: body.situationalRunId, runId: body.runId }
  const result = await dashboardService.genSituationalRunRunErrorsSummary(query)
  return NextResponse.json(result)
}

/**
 * POST /api/dashboard/situationalRunRunEvents - detailed event log data for a specific run.
 */
export async function handleSituationalRunRunEventsPost(request: NextRequest) {
  const dashboardService = await getDashboardService()
  const body = await request.json()
  const query: SituationalRunAndRunQuery = { situationalRunId: body.situationalRunId, runId: body.runId }
  const result = await dashboardService.genSituationalRunRunEvents(query)
  return NextResponse.json(result)
}

/**
 * POST /api/dashboard/metrics - generates performance metrics alerts.
 */
export async function handleMetricsPost(request: NextRequest) {
  const dashboardService = await getDashboardService()
  const body = await request.json()
  const query = body as MetricsQuery
  const result = await dashboardService.genMetrics(query)
  return NextResponse.json(result)
}


