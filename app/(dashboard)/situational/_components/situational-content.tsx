"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { useSituationalData, useLoadSituationalRuns, SITUATIONAL_PAGE_SIZE } from "../situational-hooks"
import { TableSkeleton } from "@/src/components/shared/skeletons/PageSkeletons"
import { HeaderSection } from "./sections/HeaderSection"
import { FiltersSection } from "./sections/FiltersSection"
import { RunsTable } from "./sections/RunsTable"

/**
 * Build SDK matching patterns based on the language selected in sidebar.
 * Matches actual DB values: COLUMNAR_SDK_*, java-sdk, go, Go, rust, Rust, scala, etc.
 */
function buildSdkMatchPatterns(language: string): string[] {
  if (!language) return []
  const base = language.toLowerCase()
  const upper = base.toUpperCase()
  const capitalized = base.charAt(0).toUpperCase() + base.slice(1)

  const patterns = [
    base,                           // go, java, python, etc.
    capitalized,                    // Go, Java, Python, etc.
    upper,                          // GO, JAVA, PYTHON, etc.
    `COLUMNAR_SDK_${upper}`,        // COLUMNAR_SDK_GO, COLUMNAR_SDK_JAVA
    `${base}-sdk`,                  // java-sdk
  ]

  // Handle special cases
  if (base === 'node') {
    patterns.push('COLUMNAR_SDK_NODE', 'COLUMNAR_SDK_NODEJS', 'nodejs', 'Node')
  }
  if (base === 'dotnet') {
    patterns.push('COLUMNAR_SDK_.NET', 'COLUMNAR_SDK_DOTNET', '.net', '.NET', 'csharp', 'C#')
  }

  return Array.from(new Set(patterns))
}

export function SituationalContent() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Read SDK filter from URL params
  const selectedSdk = searchParams?.get('sdk') || ""

  // Server paginates by `selectedSdk` and returns 50 at a time; pages accumulate
  // here and `fetchMore` pulls the next 50. Filtering/search/sort below run over
  // whatever has been loaded so far.
  const { runs, loading, error, refetch, fetchMore, hasMore, isFetchingMore } =
    useLoadSituationalRuns(selectedSdk)

  const {
    filteredRuns,
    searchQuery,
    setSearchQuery,
    activeFilters: columnFilters,
    setActiveFilters: setColumnFilters,
    sortColumn,
    sortDirection,
    uniqueValues,
    columnRanges: ranges,
    handleFilterChange,
    handleSort,
    clearAllFilters: clearAllFiltersFromHook,
  } = useSituationalData({ runs, selectedSdk })

  // Clear all filters and reset URL
  const clearAllFilters = () => {
    clearAllFiltersFromHook()
    setColumnFilters({})
    setSearchQuery("")
    // Clear SDK from URL
    router.push('/situational')
  }

  // Handle refresh
  const handleRefresh = () => {
    setIsLoading(true)
    refetch()
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }

  // Count active filters
  const activeFilterCount = Object.keys(columnFilters).length + (searchQuery ? 1 : 0)

  // The page chrome (header, description, search/filter bar) is static and renders
  // immediately. Only the runs table depends on the awaited data, so while that is
  // loading we show a table skeleton in its place rather than blanking the page.
  return (
    <div className="container mx-auto py-6 px-6 max-w-7xl">
      <HeaderSection />

      <FiltersSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilterCount={activeFilterCount}
        clearAllFilters={clearAllFilters}
        handleRefresh={handleRefresh}
        isLoading={isLoading}
        loading={loading}
      />

      {error ? (
        <div className="border border-red-200 rounded-lg p-6">
          <h2 className="text-red-600 font-semibold mb-4">Error Loading Data</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={refetch} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            Retry
          </button>
        </div>
      ) : loading ? (
        <TableSkeleton rows={10} columns={6} />
      ) : (
        <>
          <RunsTable
            currentRuns={filteredRuns}
            activeFilterCount={activeFilterCount}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            columnFilters={columnFilters}
            uniqueValues={uniqueValues}
            ranges={ranges}
            handleSort={handleSort}
            handleFilterChange={handleFilterChange}
          />

          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {activeFilterCount > 0
                ? `Showing ${filteredRuns.length} of ${runs.length} loaded runs`
                : `${runs.length} run${runs.length === 1 ? "" : "s"} loaded`}
            </p>
            {hasMore && (
              <Button variant="outline" onClick={fetchMore} disabled={isFetchingMore}>
                {isFetchingMore ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load ${SITUATIONAL_PAGE_SIZE} more`
                )}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
