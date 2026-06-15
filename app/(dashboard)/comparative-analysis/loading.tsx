import { ChartSkeleton, MetricCardsSkeleton } from "@/src/components/shared/skeletons/PageSkeletons"
import { Skeleton } from "@/src/components/ui/skeleton"

export default function Loading() {
  return (
    <>
      <div className="container mx-auto py-10 space-y-6">
        <Skeleton className="h-9 w-72" />
        <MetricCardsSkeleton count={3} />
        <ChartSkeleton />
      </div>
    </>
  )
}
