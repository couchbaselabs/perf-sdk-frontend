import { NextRequest, NextResponse } from 'next/server'
import {
  handleFilteredGet,
  handleGroupByOptionsGet,
  handleMetricsGet,
  handleSituationalRunsGet,
  handleQueryPost,
  handleSinglePost,
  handleSituationalRunPost,
  handleSituationalRunRunPost,
  handleSituationalRunRunErrorsSummaryPost,
  handleSituationalRunRunEventsPost,
  handleMetricsPost
} from '../_handlers'
import { logger } from '@/src/lib/utils/logger'

/**
 * CONSOLIDATED DASHBOARD API ROUTES
 * 
 * This dynamic route consolidates all dashboard API endpoints into a single file
 * while preserving all original functionality and comments from individual routes.
 */

/**
 * GET /api/dashboard/[action]
 * Handles all GET dashboard endpoints based on the action parameter
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { action: string } }
) {
  const { action } = params

  try {
    switch (action) {
      case 'filtered':
        return handleFilteredGet(request)
      case 'groupByOptions':
        return handleGroupByOptionsGet()
      case 'metrics':
        return handleMetricsGet()
      case 'situationalRuns':
        return handleSituationalRunsGet()
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 404 })
    }
  } catch (error) {
    logger.error(`Error in /api/dashboard/${action}:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/dashboard/[action]
 * Handles all POST dashboard endpoints based on the action parameter
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { action: string } }
) {
  const { action } = params

  try {
    switch (action) {
      case 'query':
        return handleQueryPost(request)
      case 'single':
        return handleSinglePost(request)
      case 'situationalRun':
        return handleSituationalRunPost(request)
      case 'situationalRunRun':
        return handleSituationalRunRunPost(request)
      case 'situationalRunRunErrorsSummary':
        return handleSituationalRunRunErrorsSummaryPost(request)
      case 'situationalRunRunEvents':
        return handleSituationalRunRunEventsPost(request)
      case 'metrics':
        return handleMetricsPost(request)
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 404 })
    }
  } catch (error) {
    logger.error(`Error in /api/dashboard/${action}:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
