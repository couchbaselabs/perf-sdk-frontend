import { getDatabaseService } from '@/src/lib/database-connection-pool'
import { notFound } from 'next/navigation'

// Helper function to convert class instances to plain objects for serialization
function serializeForClient<T>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

export async function getRunData(runId: string) {
  try {
    const databaseService = await getDatabaseService()
    
    // Fetch run data in parallel
    const [runData, runMetrics, runBuckets] = await Promise.all([
      databaseService.getRunsById([runId]).then(r => r[0] ?? null),
      // getRunMetrics expects a single run id in this codebase; we can use helper if needed
      databaseService.getMetricsByRunId(runId),
      databaseService.getBucketsByRunId(runId),
    ])

    if (!runData) {
      notFound()
    }

    // Convert class instances to plain objects for Next.js serialization
    return {
      runData: serializeForClient(runData),
      runMetrics: serializeForClient(runMetrics),
      runBuckets: serializeForClient(runBuckets),
    }
  } catch (error) {
    console.error('Failed to fetch run data:', error)
    notFound()
  }
}
