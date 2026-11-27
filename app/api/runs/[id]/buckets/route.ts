import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseService } from '@/src/lib/database-connection-pool'
import { logger } from '@/src/lib/utils/logger'

async function getRunBuckets(id: string) {
  if (!id) {
    return NextResponse.json({ error: 'Run ID is required' }, { status: 400 })
  }

  try {
    const database = await getDatabaseService()
    logger.info(`Getting buckets for run`, { id })

    const buckets = await database.getBucketsByRunId(id)

    if (buckets.length === 0) {
      return NextResponse.json({ error: 'No bucket data found for this run' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: buckets })
  } catch (error) {
    logger.error('Error in /api/runs/[id]/buckets', error)
    return NextResponse.json({ error: 'Failed to fetch buckets for run' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const id = context?.params?.id
  return getRunBuckets(id)
}
