import { getIngesterRuns, getIngesterRunsCount } from "./_lib/server-actions"
import { IngesterRunsTable } from "./_components/ingester-runs-table"
import { IngesterPagination } from "./_components/ingester-pagination"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 50

export default async function IngesterPage({
  searchParams,
}: {
  searchParams?: { page?: string }
}) {
  const total = await getIngesterRunsCount()
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const requested = Number(searchParams?.page) || 1
  const page = Math.min(Math.max(1, requested), totalPages)
  const runs = await getIngesterRuns({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ingester</h1>
        <p className="text-muted-foreground mt-1">
          History of the job that moves FIT/SIT results from S3 into this database. Runs every 5 minutes.
        </p>
      </div>
      <IngesterRunsTable runs={runs} />
      <IngesterPagination page={page} totalPages={totalPages} />
    </div>
  )
}
