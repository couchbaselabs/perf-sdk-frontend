import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseService } from '@/src/lib/database-connection-pool'
import { logger } from '@/src/lib/utils/logger'

// Clean business logic for getting multiple runs  
async function getMultipleRuns(database: any, body: { runIds: string[] }) {
  const { runIds } = body;
  
  if (!runIds || !Array.isArray(runIds)) {
    return NextResponse.json({ error: 'runIds array is required' }, { status: 400 })
  }

  if (runIds.length === 0) {
    return NextResponse.json({ error: 'runIds array cannot be empty' }, { status: 400 })
  }

  logger.info(`Getting ${runIds.length} runs by ID`, { runIds })
  
  // Get run data and metrics in parallel
  const [runs, metrics] = await Promise.all([
    database.getRunsById(runIds),
    database.getRunMetrics(runIds)
  ]);
  
  // Transform to the format expected by the frontend
  const runSummaries = runs.map((run: any) => {
    const params = run.params as any; // Cast to any to access nested properties
    
    const summary = {
      id: run.id,
      datetime: run.datetime,
      status: 'completed' as const,
      params: run.params,
      language: params?.impl?.language || '',
      version: params?.impl?.version || '',
      sdk: params?.impl?.language || '',
      clusterVersion: params?.cluster?.version || '',
      workload: params?.workload?.operations?.[0]?.op || '',
      duration: metrics[run.id]?.latency?.avg || 0,
      metrics: metrics[run.id] || {
        throughput: 0,
        latency: { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 },
        operations: { total: 0, success: 0, failed: 0 }
      }
    };
    
    // DEBUG: Show EXACT metrics table value for comparison with buckets table
    if (summary.version === '3.8.1') {
      logger.debug(`METRICS TABLE - 3.8.1 (Run ${run.id})`, {
        duration_average_us: summary.duration,
        durationType: typeof summary.duration,
        source: 'metrics.latency.avg',
        rawMetrics: metrics[run.id]
      })
    }
    
    return summary;
  });
  
  return NextResponse.json(runSummaries)
}

export async function POST(request: NextRequest) {
  try {
    const database = await getDatabaseService()
    const body = await request.json()
    return getMultipleRuns(database, body)
  } catch (error) {
    logger.error('Error in /api/runs/multiple', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
