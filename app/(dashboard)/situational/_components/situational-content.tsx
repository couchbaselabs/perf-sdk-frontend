"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSituationalData, useLoadSituationalRuns } from "../situational-hooks"
import { HeaderSection } from "./sections/HeaderSection"
import { FiltersSection } from "./sections/FiltersSection"
import { RunsTable } from "./sections/RunsTable"
import { PaginationSection } from "./sections/PaginationSection"

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
  const { runs, loading, error, refetch } = useLoadSituationalRuns()
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Read SDK filter from URL params
  const selectedSdk = searchParams?.get('sdk') || ""

  const {
    filteredRuns,
    paginatedRuns,
    searchQuery,
    setSearchQuery,
    activeFilters: columnFilters,
    setActiveFilters: setColumnFilters,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
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
    setCurrentPage(1)
    // Clear SDK from URL
    router.push('/situational')
  }

  // SDK filtering is now handled via URL params - no sync effects needed

  // Reset page if filtered list shrinks below current window
  useEffect(() => {
    if (currentPage > 1 && filteredRuns.length <= (currentPage - 1) * itemsPerPage) {
      setCurrentPage(1)
    }
  }, [columnFilters, searchQuery, selectedSdk, filteredRuns, currentPage, itemsPerPage, setCurrentPage])

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

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin mx-auto mb-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            <p>Loading situational runs...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-6 max-w-7xl">
        <div className="border border-red-200 rounded-lg p-6">
          <h2 className="text-red-600 font-semibold mb-4">Error Loading Data</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={refetch} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            Retry
          </button>
        </div>
      </div>
    )
  }

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

      <RunsTable
        currentRuns={paginatedRuns}
        activeFilterCount={activeFilterCount}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        columnFilters={columnFilters}
        uniqueValues={uniqueValues}
        ranges={ranges}
        handleSort={handleSort}
        handleFilterChange={handleFilterChange}
      />

      <PaginationSection
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />
    </div>
  )
}
