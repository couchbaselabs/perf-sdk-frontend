"use client"

/**
 * Route-shaped skeleton building blocks, composed from the shadcn `Skeleton`
 * primitive. Used by the App Router `loading.tsx` boundaries so that clicking a
 * link gives instant, layout-matching feedback while the destination streams in.
 *
 * Guard: none of these may call `useSearchParams` at the top level — they render
 * inside `loading.tsx` (a Suspense fallback) and must never themselves suspend.
 */

import { Skeleton } from "@/src/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/src/components/ui/card"

/**
 * Table placeholder matching the runs/jobs tables (header row + N body rows).
 */
export function TableSkeleton({
  rows = 8,
  columns = 6,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="w-full overflow-hidden rounded-md border border-slate-200">
      {/* Header row */}
      <div
        className="grid gap-4 border-b bg-slate-50 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-3/4" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-4 border-b px-4 py-4 last:border-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-5 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Chart placeholder matching `PerformanceGraph` (default 400px tall).
 */
export function ChartSkeleton({ height = 400 }: { height?: number }) {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  )
}

/**
 * Grid of metric cards (e.g. Status / Environment / SDK / Score summary).
 */
export function MetricCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Detail-page header: title line + a row of badges.
 */
export function DetailHeaderSkeleton() {
  return (
    <div className="mb-6 space-y-3">
      {/* Back button */}
      <Skeleton className="h-9 w-40" />
      {/* Title */}
      <Skeleton className="h-9 w-64" />
      {/* Badges row */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  )
}
