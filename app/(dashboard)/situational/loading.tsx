import { TableSkeleton } from "@/src/components/shared/skeletons/PageSkeletons"
import { Skeleton } from "@/src/components/ui/skeleton"

export default function Loading() {
  return (
    <>
      <div className="container mx-auto py-10 space-y-6">
        <Skeleton className="h-9 w-72" />
        <TableSkeleton rows={10} columns={8} />
      </div>
    </>
  )
}
