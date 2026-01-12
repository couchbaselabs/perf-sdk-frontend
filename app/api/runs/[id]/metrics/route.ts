import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseService } from '@/src/lib/database-connection-pool'
import { logger } from '@/src/lib/utils/logger'

async function getRunMetrics(id: string) {
  const database = await getDatabaseService()

  if (!id) {
    return NextResponse.json({ error: 'Run ID is required' }, { status: 400 })
  }

  logger.info(`Getting metrics for run`, { id })

  const metrics = await database.getMetricsByRunId(id)
  
  // Metrics endpoint can return empty data without it being an error
  // (some runs might not have detailed metrics)
  return NextResponse.json({ success: true, data: metrics })
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const id = context?.params?.id
  return getRunMetrics(id)
}
