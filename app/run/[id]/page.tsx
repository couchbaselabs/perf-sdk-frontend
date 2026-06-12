import { Suspense } from "react"
import { getRunData } from "./_lib/server-actions"
import RunDetailLoader from "./_components/RunDetailLoader"
import AppLayout from "@/src/components/layout/app-layout"
import {
  DetailHeaderSkeleton,
  MetricCardsSkeleton,
  ChartSkeleton,
} from "@/src/components/shared/skeletons/PageSkeletons"

interface RunDetailPageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params
  const runId = resolvedParams.id

  // Kick off the fetch but DON'T await here — pass the promise into an async
  // child inside the Suspense boundary so the shell + skeleton stream first.
  const dataPromise = getRunData(runId)

  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="container mx-auto py-6 px-6 max-w-7xl space-y-6">
            <DetailHeaderSkeleton />
            <MetricCardsSkeleton count={4} />
            <ChartSkeleton />
          </div>
        </AppLayout>
      }
    >
      <RunDetailLoader dataPromise={dataPromise} />
    </Suspense>
  )
}
