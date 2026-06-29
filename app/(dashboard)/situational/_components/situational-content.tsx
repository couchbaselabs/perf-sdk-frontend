"use client"

import { useState, useMemo, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/src/components/ui/alert"
import { useSituationalData, useLoadSituationalRuns, useSituationalRunSearch, SITUATIONAL_PAGE_SIZE } from "../situational-hooks"
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
  // `searchQuery` is the live textbox value (instant local filtering); `searchTerm`
  // is its debounced echo that drives the server-side ID search. Debouncing happens
  // in the change handler via a timer ref, so no effect is needed to derive it.
  const [searchQuery, setSearchQuery] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // Clear immediately on empty so server matches drop without a 300ms lag.
    if (!value) {
      setSearchTerm("")
      return
    }
    debounceRef.current = setTimeout(() => setSearchTerm(value), 300)
  }

  // Read SDK filter from URL params
  const selectedSdk = searchParams?.get('sdk') || ""

  // Server paginates by `selectedSdk` and returns 50 at a time; pages accumulate
  // here and `fetchMore` pulls the next 50. Filtering/search/sort below run over
  // whatever has been loaded so far.
  const { runs, loading, error, refetch, fetchMore, hasMore, isFetchingMore } =
    useLoadSituationalRuns(selectedSdk)

  // A search also hits the server so a run id that hasn't been paged in yet can
  // still be found across the whole dataset. Matches are merged into the loaded
  // runs (deduped by id) before client-side filtering/sorting runs over them.
  const { matches: searchMatches, isSearching, error: searchError } = useSituationalRunSearch(searchTerm, selectedSdk)

  const combinedRuns = useMemo(() => {
    if (searchMatches.length === 0) return runs
    const loadedIds = new Set(runs.map((r) => r.id))
    return [...runs, ...searchMatches.filter((r) => !loadedIds.has(r.id))]
  }, [runs, searchMatches])

  const {
    filteredRuns,
    activeFilters: columnFilters,
    setActiveFilters: setColumnFilters,
    sortColumn,
    sortDirection,
    uniqueValues,
    columnRanges: ranges,
    handleFilterChange,
    handleSort,
    clearAllFilters: clearAllFiltersFromHook,
  } = useSituationalData({ runs: combinedRuns, selectedSdk, searchQuery })

  // Clear all filters and reset URL
  const clearAllFilters = () => {
    clearAllFiltersFromHook()
    setColumnFilters({})
    handleSearchChange("")
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
        setSearchQuery={handleSearchChange}
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
          {searchError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Search failed</AlertTitle>
              <AlertDescription>
                Could not search across all runs ({searchError}). Showing only the runs loaded so far.
              </AlertDescription>
            </Alert>
          )}
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
              {isSearching
                ? "Searching all runs..."
                : activeFilterCount > 0
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
