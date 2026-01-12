import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseService } from '@/src/lib/database-connection-pool'
import { logger } from '@/src/lib/utils/logger'

// Clean business logic focused on data transformation
async function getRunById(database: any, id: string) {

  if (!id) {
    return NextResponse.json({ error: 'Run ID is required' }, { status: 400 })
  }

  logger.info(`Getting run by ID`, { id });
  
  // Get run data and metrics in parallel
  const [runs, metrics] = await Promise.all([
    database.getRunsById([id]),
    database.getRunMetrics([id])
  ]);

  if (runs.length === 0) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  const run = runs[0];
  const params_data = run.params as any; // Cast to any to access nested properties
  
  // Transform to the format expected by the frontend
  const runSummary = {
    id: run.id,
    datetime: run.datetime,
    status: 'completed' as const,
    params: run.params,
    language: params_data?.impl?.language || '',
    version: params_data?.impl?.version || '',
    sdk: params_data?.impl?.language || '',
    clusterVersion: params_data?.cluster?.version || '',
    workload: params_data?.workload?.operations?.[0]?.op || '',
    duration: metrics[run.id]?.latency?.avg || 0,
    metrics: metrics[run.id] || {
      throughput: 0,
      latency: { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 },
      operations: { total: 0, success: 0, failed: 0 }
    }
  };
  
  // Return in the format expected by the frontend: { run: ... }
  return NextResponse.json({ run: runSummary })
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const database = await getDatabaseService()
  const id = context?.params?.id
  return getRunById(database, id)
}
