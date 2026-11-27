import { getDatabaseService } from '@/src/lib/database-connection-pool'
import { notFound } from 'next/navigation'

function serializeForClient<T>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

export async function getRunData(runId: string) {
  const databaseService = await getDatabaseService()

  const [runData, runMetrics, runBuckets] = await Promise.all([
    databaseService.getRunsById([runId]).then((r) => r[0] ?? null),
    databaseService.getMetricsByRunId(runId),
    databaseService.getBucketsByRunId(runId),
  ])

  if (!runData) {
    notFound()
  }

  return {
    runData: serializeForClient(runData),
    runMetrics: serializeForClient(runMetrics),
    runBuckets: serializeForClient(runBuckets),
  }
}
