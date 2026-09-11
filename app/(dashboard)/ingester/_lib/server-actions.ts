import { getDatabaseService } from '@/src/lib/database-connection-pool'
import type { DatabaseIngesterRun } from '@/src/types/database'

export async function getIngesterRuns(opts?: { limit?: number; offset?: number }): Promise<DatabaseIngesterRun[]> {
  const databaseService = await getDatabaseService()
  const runs = await databaseService.getIngesterRuns(opts)
  // Plain objects for Next.js serialization
  return JSON.parse(JSON.stringify(runs))
}

export async function getIngesterRunsCount(): Promise<number> {
  const databaseService = await getDatabaseService()
  return databaseService.getIngesterRunsCount()
}
