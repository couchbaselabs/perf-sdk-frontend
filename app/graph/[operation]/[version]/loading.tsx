import { ChartSkeleton } from "@/src/components/shared/skeletons/PageSkeletons"
import { Skeleton } from "@/src/components/ui/skeleton"

// Mirrors the bespoke chrome of app/graph/[operation]/[version]/page.tsx
// (header-only, no Sidebar), NOT AppLayout.
export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-10 border-b bg-white/90 dark:bg-slate-900/90 backdrop-blur">
        <div className="flex h-16 items-center px-6">
          <Skeleton className="h-5 w-32" />
          <div className="ml-auto flex items-center gap-4">
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-6 max-w-7xl space-y-6">
          <Skeleton className="h-9 w-64" />
          <ChartSkeleton />
        </div>
      </main>
    </div>
  )
}
