import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseService } from '@/src/lib/database-connection-pool'
import { logger } from '@/src/lib/utils/logger'

async function getRunMetrics(id: string) {
  if (!id) {
    return NextResponse.json({ error: 'Run ID is required' }, { status: 400 })
  }

  try {
    const database = await getDatabaseService()
    logger.info(`Getting metrics for run`, { id })

    const metrics = await database.getMetricsByRunId(id)

    return NextResponse.json({ success: true, data: metrics })
  } catch (error) {
    logger.error('Error in /api/runs/[id]/metrics', error)
    return NextResponse.json({ error: 'Failed to fetch metrics for run' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const id = context?.params?.id
  return getRunMetrics(id)
}
