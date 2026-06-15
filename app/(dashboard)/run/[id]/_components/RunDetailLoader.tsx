import RunDetailClient from "./RunDetailClient"
import type { getRunData } from "../_lib/server-actions"

type RunData = Awaited<ReturnType<typeof getRunData>>

/**
 * Async RSC that awaits the run-data promise inside the page's Suspense
 * boundary, so the route shell + skeleton can stream immediately while the DB
 * query resolves. `getRunData` calls `notFound()` itself when the run is
 * missing, so no extra guard is needed here.
 */
export default async function RunDetailLoader({
  dataPromise,
}: {
  dataPromise: Promise<RunData>
}) {
  const { runData, runMetrics, runBuckets } = await dataPromise

  return (
    <RunDetailClient
      runData={runData}
      runMetrics={runMetrics}
      runBuckets={runBuckets}
    />
  )
}
