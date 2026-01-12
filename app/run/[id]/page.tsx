import { Suspense } from "react"
import { getRunData } from "./_lib/server-actions"
import RunDetailClient from "./_components/RunDetailClient"
import AppLayout from "@/src/components/layout/app-layout"
import { LoadingSpinner } from "@/src/components/shared/LoadingStates"

interface RunDetailPageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params
  const runId = resolvedParams.id

  // Fetch run data on the server
  const { runData, runMetrics, runBuckets } = await getRunData(runId)

    return (
    <Suspense fallback={
      <AppLayout>
        <LoadingSpinner message="Loading run details..." />
      </AppLayout>
    }>
      <RunDetailClient 
        runData={runData}
        runMetrics={runMetrics}
        runBuckets={runBuckets}
      />
    </Suspense>
  )
}
