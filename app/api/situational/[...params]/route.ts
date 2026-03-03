import { NextRequest, NextResponse } from 'next/server'
import { getDashboardService, getDatabaseService } from '@/src/lib/database-connection-pool'
import { logger } from '@/src/lib/utils/logger'
import { SituationalRunQuery, SituationalRunAndRunQuery } from '@/src/lib/dashboard/dashboard-query-types'
import type { ApiResponse } from '@/src/types'
import type { SituationalRunSummary, SituationalRunDetailResponse } from '@/src/types'

/**
 * CONSOLIDATED SITUATIONAL API ROUTES
 * 
 * This dynamic route consolidates all situational API endpoints into a single file
 * while preserving all original functionality and comments from individual routes.
 * 
 * Routes handled:
 * - GET /api/situational/runs - Get all situational runs
 * - GET /api/situational/[id]/runs - Get runs for a specific situational run
 * - GET /api/situational/[id]/run/[runId] - Get detailed data for a specific run
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> | { params: string[] } }
) {
  try {
    const resolved = params instanceof Promise ? await params : params
    const pathSegments = resolved.params || []

    // Route: /api/situational/runs
    if (pathSegments.length === 1 && pathSegments[0] === 'runs') {
      /**
       * GET /api/situational/runs
       * Returns a list of all available situational runs with normalized metadata.
       * Situational runs are grouped test executions for comparative analysis.
       * 
       * @param limit - Optional query parameter to limit the number of results
       * @returns Array of SituationalRun objects with UI-normalized data
       */
      return handleAllSituationalRuns(request)
    }

    // Route: /api/situational/[id]/runs
    if (pathSegments.length === 2 && pathSegments[1] === 'runs') {
      /**
       * GET /api/situational/[id]/runs
       * Gets all individual runs within a specific situational run group.
       * Returns normalized run data for UI consumption.
       * 
       * @param id - The situational run ID
       * @returns Array of normalized run objects with performance scores and metadata
       */
      const situationalRunId = pathSegments[0]
      return handleSituationalRunsList(request, situationalRunId)
    }

    // Route: /api/situational/[id]/run/[runId]
    if (pathSegments.length === 3 && pathSegments[1] === 'run') {
      /**
       * GET /api/situational/[id]/run/[runId]
       * Gets comprehensive details for a specific run within a situational run.
       * Includes run details, events timeline, and error summary.
       * 
       * @param id - The situational run ID
       * @param runId - The specific run ID within the situational run
       * @returns Combined object with runDetails, events, and errorsSummary
       */
      const situationalRunId = pathSegments[0]
      const runId = pathSegments[2]
      return handleSpecificRunDetails(request, situationalRunId, runId)
    }

    return NextResponse.json({ error: 'Invalid route' }, { status: 404 })
  } catch (error) {
    logger.error('Error in /api/situational/[...params]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Handler for GET /api/situational/runs
 * Clean, focused business logic without boilerplate
 */
async function handleAllSituationalRuns(request: NextRequest) {
  const database = await getDatabaseService()
  const url = new URL(request.url)
  const params = url.searchParams

  const rows = await database.getSituationalRuns()

  // Normalize to the front-end SituationalRun shape
  const runs = rows.map((row: any) => {
    // Database service currently returns a SituationalRun class; coerce fields for UI
    const id = (row as any).situationalRunId || (row as any).id || (row as any).situational_run_id
    const started = (row as any).started || (row as any).datetime
    const score = (row as any).score
    const numRuns = (row as any).numRuns || (row as any).num_runs
    const details = (row as any).detailsOfAnyRun || (row as any).details_of_any_run || {}
    const sdk = details?.impl?.language ?? undefined
    const version = details?.impl?.version ?? undefined
    // Some older rows may not have these fields; default to '-'
    const csp = details?.vars?.csp ?? details?.debug?.csp ?? '-'
    const pl = Boolean(details?.vars?.pl || details?.privateLink || details?.pl)
    const environment = details?.vars?.environment ?? details?.debug?.environment ?? '-'
    const description = details?.workload?.situational ?? details?.workload?.name ?? null
    const clusterVersion = details?.cluster?.version ?? details?.clusterVersion ?? details?.vars?.clusterVersion ?? '-'

    const ciUrl = details?.debug?.ciUrl ?? undefined

    return {
      id,
      started,
      score: Number(score) || 0,
      runs: numRuns,
      sdk,
      version,
      csp,
      pl,
      environment,
      clusterVersion,
      description,
      ciUrl,
    }
  })

  // Optional limit param
  const limitParam = params.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : undefined
  const data = Number.isFinite(limit as number) ? runs.slice(0, limit as number) : runs

  const resp: ApiResponse<SituationalRunSummary[]> = { success: true, data }
  return NextResponse.json(resp)
}

/**
 * Handler for GET /api/situational/[id]/runs
 * Gets normalized runs for a specific situational run
 */
async function handleSituationalRunsList(request: NextRequest, situationalRunId: string) {
  const database = await getDatabaseService()
  const input: SituationalRunQuery = { situationalRunId }
  const results = await database.getSituationalRun(input)

  // results is SituationalRunResults { situationalRunId, runs: RunAndSituationalScore[] }
  const rows = (results as any)?.runs ?? []

  const normalized = rows.map((row: any) => {
    const params = row.runParams || row.run_params || {}
    const srj = row.srjParams || row.srj_params || {}
    return {
      id: row.runId || row.id,
      started: row.started || row.datetime || new Date().toISOString(),
      description: params?.workload?.situational || params?.workload?.name || '-',
      score: Number(srj?.score ?? 0) || 0,
      sdk: params?.impl?.language ?? '-',
      version: params?.impl?.version ?? '-',
      csp: params?.vars?.csp ?? '-',
      pl: Boolean(params?.vars?.pl || params?.privateLink),
      clusterVersion: params?.cluster?.version ?? '-',
      environment: params?.vars?.environment ?? '-',
      status: 'completed' as const,
      ciUrl: params?.debug?.ciUrl ?? undefined,
    }
  })

  const resp: ApiResponse<SituationalRunSummary[]> = { success: true, data: normalized }
  return NextResponse.json(resp)
}

/**
 * Handler for GET /api/situational/[id]/run/[runId]
 * Gets comprehensive details including events and error summary
 */
async function handleSpecificRunDetails(request: NextRequest, situationalRunId: string, runId: string) {
  const query: SituationalRunAndRunQuery = {
    situationalRunId,
    runId
  }

  logger.info('Getting situational run-run details', query)
  const dashboardService = await getDashboardService()
  const databaseService = await getDatabaseService()

  // Get the run details first
  const runDetails = await dashboardService.genSituationalRunRun(query)

  // Get buckets to determine first bucket time for correct event timing
  const buckets = await databaseService.getBucketsByRunId(runId)
  // The first bucket time should be the datetime of the first bucket data point
  let firstBucketTime: number | undefined = undefined
  if (buckets.length > 0 && buckets[0].datetime) {
    firstBucketTime = new Date(buckets[0].datetime).getTime()
    logger.debug('First bucket time computed', { datetime: buckets[0].datetime, firstBucketTime })
  }

  // Get events with correct timing and error summary
  const [rawEvents, errorsSummary] = await Promise.all([
    databaseService.getEvents(runId, firstBucketTime, false),
    dashboardService.genSituationalRunRunErrorsSummary(query)
  ])

  // Normalize event params to include a string 'type' for API contract
  const events = (rawEvents || []).map((e: any) => ({
    timeOffsetSecs: (typeof e?.timeOffsetSecs === 'number' && Number.isFinite(e.timeOffsetSecs)) ? e.timeOffsetSecs : null,
    datetime: e?.datetime,
    params: e?.params ?? {}
  }))

  const resp: ApiResponse<SituationalRunDetailResponse> = { success: true, data: { runDetails, events, errorsSummary } }
  return NextResponse.json(resp)
}
