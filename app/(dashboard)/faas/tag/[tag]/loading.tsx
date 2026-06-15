import { TableSkeleton } from "@/src/components/shared/skeletons/PageSkeletons"
import { Skeleton } from "@/src/components/ui/skeleton"

export default function Loading() {
  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-9 w-56" />
        <TableSkeleton rows={10} columns={6} />
      </div>
    </>
  )
}
