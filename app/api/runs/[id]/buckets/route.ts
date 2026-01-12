import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseService } from '@/src/lib/database-connection-pool'
import { logger } from '@/src/lib/utils/logger'

async function getRunBuckets(id: string) {
  const database = await getDatabaseService()

  if (!id) {
    return NextResponse.json({ error: 'Run ID is required' }, { status: 400 })
  }

  logger.info(`Getting buckets for run`, { id })

  const buckets = await database.getBucketsByRunId(id)
  
  if (buckets.length === 0) {
    return NextResponse.json({ error: 'No bucket data found for this run' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: buckets })
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const id = context?.params?.id
  return getRunBuckets(id)
}
