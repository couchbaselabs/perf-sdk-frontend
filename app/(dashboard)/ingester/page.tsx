import { getIngesterRuns } from "./_lib/server-actions"
import { IngesterRunsTable } from "./_components/ingester-runs-table"

export const dynamic = "force-dynamic"

export default async function IngesterPage() {
  const runs = await getIngesterRuns()

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ingester</h1>
        <p className="text-muted-foreground mt-1">
          History of the job that moves FIT/SIT results from S3 into this database. Runs every 5 minutes.
        </p>
      </div>
      <IngesterRunsTable runs={runs} />
    </div>
  )
}
