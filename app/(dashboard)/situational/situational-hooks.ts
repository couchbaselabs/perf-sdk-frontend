import { useState, useEffect, useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { SituationalRun } from "@/src/types/entities"
import { apiClient } from "@/src/lib/api-client-unified"
import { applyFilters, sortRuns, extractUniqueValues, calculateColumnRanges } from "./filtering-and-sorting-utils"

/**
 * Check if an SDK value from the DB matches the selected language.
 * Handles actual DB patterns: COLUMNAR_SDK_GO, java-sdk, go, Go, rust, Rust, scala, etc.
 */
function sdkMatchesLanguage(sdkValue: string, languageLower: string, languageUpper: string): boolean {
  const v = sdkValue.toLowerCase()
  const vUpper = sdkValue.toUpperCase()

  // Direct match (case-insensitive): go, Go, GO
  if (v === languageLower) return true

  // COLUMNAR_SDK_* pattern: COLUMNAR_SDK_GO, COLUMNAR_SDK_JAVA
  if (vUpper === `COLUMNAR_SDK_${languageUpper}`) return true

  // language-sdk pattern: java-sdk
  if (v === `${languageLower}-sdk`) return true

  // Handle Node.js special cases
  if (languageLower === 'node') {
    if (v === 'nodejs' || vUpper === 'COLUMNAR_SDK_NODE' || vUpper === 'COLUMNAR_SDK_NODEJS') return true
  }

  // Handle .NET special cases  
  if (languageLower === 'dotnet') {
    if (v === '.net' || v === 'csharp' || v === 'c#' ||
      vUpper === 'COLUMNAR_SDK_.NET' || vUpper === 'COLUMNAR_SDK_DOTNET') return true
  }

  return false
}

interface UseSituationalDataProps {
  runs: SituationalRun[]
  selectedSdk?: string
}

interface UseSituationalDataReturn {
  filteredRuns: SituationalRun[]
  paginatedRuns: SituationalRun[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  activeFilters: Record<string, any>
  setActiveFilters: (filters: Record<string, any>) => void
  sortColumn: string
  setSortColumn: (column: string) => void
  sortDirection: 'asc' | 'desc'
  setSortDirection: (direction: 'asc' | 'desc') => void
  currentPage: number
  setCurrentPage: (page: number) => void
  itemsPerPage: number
  setItemsPerPage: (items: number) => void
  totalPages: number
  uniqueValues: Record<string, string[]>
  columnRanges: Record<string, { min: number; max: number }>
  handleFilterChange: (column: string, value: any) => void
  handleSort: (column: string) => void
  clearAllFilters: () => void
}

export function useSituationalData({ runs, selectedSdk = "" }: UseSituationalDataProps): UseSituationalDataReturn {
  // State for filtering, sorting, and pagination
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [sortColumn, setSortColumn] = useState("started")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  // Calculate unique values for filter options
  const uniqueValues = useMemo(() => {
    const columns = ['sdk', 'version', 'situational_id']
    const values: Record<string, string[]> = {}

    columns.forEach(column => {
      values[column] = extractUniqueValues(runs, column)
    })

    // If a sidebar SDK is selected, restrict the SDK options in the dropdown
    if (selectedSdk) {
      const sdkLower = selectedSdk.toLowerCase()
      const sdkUpper = selectedSdk.toUpperCase()
      values.sdk = values.sdk.filter(val => sdkMatchesLanguage(val, sdkLower, sdkUpper))
    }

    return values
  }, [runs, selectedSdk])

  // Calculate ranges for numeric columns
  const columnRanges = useMemo(() => {
    return calculateColumnRanges(runs)
  }, [runs])

  // Apply filters and sorting
  const filteredRuns = useMemo(() => {
    let filtered = applyFilters(runs, activeFilters, searchQuery)
    // Apply sidebar SDK filter if present
    if (selectedSdk) {
      const sdkLower = selectedSdk.toLowerCase()
      const sdkUpper = selectedSdk.toUpperCase()
      filtered = filtered.filter((run) => {
        const value = (run as any).sdk
        if (!value) return false
        if (Array.isArray(value)) {
          return value.some((v) => sdkMatchesLanguage(String(v), sdkLower, sdkUpper))
        }
        return sdkMatchesLanguage(String(value), sdkLower, sdkUpper)
      })
    }
    return sortRuns(filtered, sortColumn, sortDirection)
  }, [runs, activeFilters, searchQuery, sortColumn, sortDirection, selectedSdk])

  // Apply pagination
  const paginatedRuns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredRuns.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredRuns, currentPage, itemsPerPage])

  // Calculate total pages
  const totalPages = Math.ceil(filteredRuns.length / itemsPerPage)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilters, searchQuery, sortColumn, sortDirection])

  // Handlers
  const handleFilterChange = (column: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [column]: value
    }))
  }

  const handleSort = (column: string) => {
    // Normalize column keys used for dates
    const normalized = column === 'Started' ? 'started' : column
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(normalized)
      setSortDirection('asc')
    }
  }

  const clearAllFilters = () => {
    setActiveFilters({})
    setSearchQuery("")
  }

  return {
    filteredRuns,
    paginatedRuns,
    searchQuery,
    setSearchQuery,
    activeFilters,
    setActiveFilters,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    uniqueValues,
    columnRanges,
    handleFilterChange,
    handleSort,
    clearAllFilters
  }
}

// Hook for loading situational runs data
export const SITUATIONAL_PAGE_SIZE = 50

interface UseLoadSituationalRunsReturn {
  runs: SituationalRun[]
  loading: boolean
  error: string | null
  refetch: () => void
  fetchMore: () => void
  hasMore: boolean
  isFetchingMore: boolean
}

/**
 * Loads situational runs a page at a time (most recent first) via React Query's
 * infinite query. The server applies the limit/offset and the SDK filter, so we
 * only download the rows we show. Pages accumulate in the cache and stay cached
 * until refresh; `fetchMore` pulls the next page. Changing `selectedSdk` starts
 * a fresh paginated query for that SDK.
 */
export function useLoadSituationalRuns(selectedSdk = ""): UseLoadSituationalRunsReturn {
  const query = useInfiniteQuery({
    queryKey: ['situational', 'runs', selectedSdk],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await apiClient.getSituationalRuns({
        limit: SITUATIONAL_PAGE_SIZE,
        offset: pageParam as number,
        sdk: selectedSdk || undefined,
      })
      // fetchJson wraps the response body, so the runs array sits at res.data.data
      return ((res.data as any)?.data ?? []) as SituationalRun[]
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === SITUATIONAL_PAGE_SIZE ? allPages.flat().length : undefined,
  })

  return {
    runs: (query.data?.pages.flat() as SituationalRun[]) ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: () => { query.refetch() },
    fetchMore: () => { query.fetchNextPage() },
    hasMore: !!query.hasNextPage,
    isFetchingMore: query.isFetchingNextPage,
  }
}

// Hook for managing visible columns
interface UseVisibleColumnsReturn {
  visibleColumns: Record<string, boolean>
  toggleColumn: (column: string) => void
  showAllColumns: () => void
  hideAllColumns: () => void
}

export function useVisibleColumns(initialColumns: string[]): UseVisibleColumnsReturn {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    initialColumns.forEach(col => {
      initial[col] = true
    })
    return initial
  })

  const toggleColumn = (column: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }))
  }

  const showAllColumns = () => {
    setVisibleColumns(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(key => {
        updated[key] = true
      })
      return updated
    })
  }

  const hideAllColumns = () => {
    setVisibleColumns(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(key => {
        updated[key] = false
      })
      return updated
    })
  }

  return {
    visibleColumns,
    toggleColumn,
    showAllColumns,
    hideAllColumns
  }
}
