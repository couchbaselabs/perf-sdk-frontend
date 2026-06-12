import { Suspense } from "react"
import AppLayout from "@/src/components/layout/app-layout"
import HomeLoader from "./(home)/_components/HomeLoader"
import {
  MetricCardsSkeleton,
  ChartSkeleton,
} from "@/src/components/shared/skeletons/PageSkeletons"

export default function Home() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="container mx-auto py-10 space-y-6">
            <MetricCardsSkeleton count={4} />
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </AppLayout>
      }
    >
      <HomeLoader />
    </Suspense>
  )
}
