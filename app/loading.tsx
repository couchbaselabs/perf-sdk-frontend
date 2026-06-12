import AppLayout from "@/src/components/layout/app-layout"
import {
  MetricCardsSkeleton,
  ChartSkeleton,
} from "@/src/components/shared/skeletons/PageSkeletons"

export default function Loading() {
  return (
    <AppLayout>
      <div className="container mx-auto py-10 space-y-6">
        <MetricCardsSkeleton count={4} />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </AppLayout>
  )
}
