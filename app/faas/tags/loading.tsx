import AppLayout from "@/src/components/layout/app-layout"
import { TableSkeleton } from "@/src/components/shared/skeletons/PageSkeletons"
import { Skeleton } from "@/src/components/ui/skeleton"

export default function Loading() {
  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-9 w-48" />
        <TableSkeleton rows={10} columns={4} />
      </div>
    </AppLayout>
  )
}
