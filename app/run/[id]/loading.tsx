import AppLayout from "@/src/components/layout/app-layout"
import {
  DetailHeaderSkeleton,
  MetricCardsSkeleton,
  ChartSkeleton,
} from "@/src/components/shared/skeletons/PageSkeletons"

export default function Loading() {
  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-6 max-w-7xl space-y-6">
        <DetailHeaderSkeleton />
        <MetricCardsSkeleton count={4} />
        <ChartSkeleton />
      </div>
    </AppLayout>
  )
}
