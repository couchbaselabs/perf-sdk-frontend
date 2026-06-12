import AppLayout from "@/src/components/layout/app-layout"
import {
  DetailHeaderSkeleton,
  TableSkeleton,
} from "@/src/components/shared/skeletons/PageSkeletons"

export default function Loading() {
  return (
    <AppLayout>
      <div className="container mx-auto py-10 space-y-6">
        <DetailHeaderSkeleton />
        <TableSkeleton rows={10} columns={6} />
      </div>
    </AppLayout>
  )
}
