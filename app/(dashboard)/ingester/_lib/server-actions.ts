import { getDatabaseService } from '@/src/lib/database-connection-pool'
import type { DatabaseIngesterRun } from '@/src/types/database'

export async function getIngesterRuns(limit = 100): Promise<DatabaseIngesterRun[]> {
  const databaseService = await getDatabaseService()
  const runs = await databaseService.getIngesterRuns({ limit })
  // Plain objects for Next.js serialization
  return JSON.parse(JSON.stringify(runs))
}
