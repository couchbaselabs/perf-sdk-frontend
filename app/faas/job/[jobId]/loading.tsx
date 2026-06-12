import AppLayout from "@/src/components/layout/app-layout"
import {
  DetailHeaderSkeleton,
  TableSkeleton,
} from "@/src/components/shared/skeletons/PageSkeletons"

export default function Loading() {
  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <DetailHeaderSkeleton />
        <TableSkeleton rows={8} columns={5} />
      </div>
    </AppLayout>
  )
}
