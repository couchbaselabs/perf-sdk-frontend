/**
 * UNIFIED DATA HOOKS
 * Replaces 15+ scattered hooks with clean, performant data fetching
 */

import { useMemo, useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/src/lib/api-client-unified'
import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, PaginatedResponse, PerformanceMetrics } from '@/src/types/core'
import type { RunSummary, SituationalRun, FaasJob } from '@/src/types/entities'
import type { RunsQuery, SituationalRunsQuery } from '@/src/types/queries'

// ==========================================
// GENERIC DATA HOOK
// ==========================================

export interface UseDataOptions<T> {
  enabled?: boolean
  refetchOnMount?: boolean
  cacheTime?: number
}

export interface UseDataReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useData<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  dependencies: any[] = [],
  options: UseDataOptions<T> = {}
): UseDataReturn<T> {
  const { enabled = true, refetchOnMount = true } = options
  const queryKey = useMemo(() => ['useData', ...dependencies], [dependencies])

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetcher()
      return response
    },
    enabled,
    refetchOnMount
  })

  return {
    data: (query.data?.data as T) ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: async () => { await query.refetch() }
  }
}

// ==========================================
// PERFORMANCE RUNS HOOKS
// ==========================================

export function useRuns(query: RunsQuery = {}) {
  const queryString = useMemo(() => JSON.stringify(query), [query])
  return useData(
    () => apiClient.getRuns({
      limit: query.limit,
      offset: query.offset,
      sdk: query.sdk ?? query.impl?.language,
      version: query.version ?? query.impl?.version,
      status: Array.isArray(query.status) ? query.status.join(',') : query.status,
    } as any),
    [queryString]
  )
}

export function useRun(id: string) {
  return useData(
    () => apiClient.getRunById(id),
    [id],
    { enabled: !!id }
  )
}

export function useRunMetrics(runId: string) {
  return useData(
    () => apiClient.getRunMetrics(runId),
    [runId],
    { enabled: !!runId }
  )
}

export function useRunBuckets(runId: string) {
  return useData(
    () => apiClient.getRunBuckets(runId),
    [runId],
    { enabled: !!runId }
  )
}

// ==========================================
// SITUATIONAL RUNS HOOKS
// ==========================================

export function useSituationalRuns(query: SituationalRunsQuery = {}) {
  const queryString = useMemo(() => JSON.stringify(query), [query])
  return useData(
    () => apiClient.getSituationalRuns(query),
    [queryString]
  )
}

export function useSituationalRun(id: string) {
  return useData(
    () => apiClient.getSituationalRunById(id),
    [id],
    { enabled: !!id }
  )
}

/**
 * Individual runs within a situational run group.
 * Hits the consolidated /api/situational/[id]/runs route (same URL the page
 * previously fetched by hand) but caches the result via React Query, so
 * back/forward and revisits within the staleTime window are instant.
 * Returns the runs array directly as `data`.
 */
export function useSituationalRunsList(situationalId: string) {
  return useQuery({
    queryKey: ['situational', situationalId, 'runs'],
    queryFn: async (): Promise<any[]> => {
      const res = await fetch(`/api/situational/${situationalId}/runs`)
      const payload = res.ok ? await res.json() : { data: [] as any[] }
      return Array.isArray(payload) ? payload : (payload?.data ?? [])
    },
    enabled: !!situationalId,
  })
}

/**
 * Detailed data (runDetails, events, errorsSummary) for a specific run within
 * a situational run. Mirrors the page's former hand-rolled fetch + fallback,
 * now cached via React Query. Returns the API `data` payload as `data`.
 */
export function useSituationalRunDetail(situationalId: string, runId: string) {
  return useQuery({
    queryKey: ['situational', situationalId, 'run', runId],
    queryFn: async (): Promise<any> => {
      const res = await fetch(`/api/situational/${situationalId}/run/${runId}`)
      const fallback = { runDetails: { runs: [] }, events: [], errorsSummary: [] }
      const payload = res.ok ? await res.json() : { success: false, data: fallback }
      return payload?.data || fallback
    },
    enabled: !!situationalId && !!runId,
  })
}

// ==========================================
// FAAS HOOKS
// ==========================================

export function useFaasJobs(params?: { limit?: number; tag?: string }) {
  const paramsString = useMemo(() => JSON.stringify(params), [params])
  return useData(
    () => apiClient.getFaasJobs(params),
    [paramsString]
  )
}

export function useFaasJob(id: string) {
  return useData(
    () => apiClient.getFaasJobById(id),
    [id],
    { enabled: !!id }
  )
}

// ==========================================
// DASHBOARD HOOKS
// ==========================================

export function useDashboardMetrics(query: any) {
  const queryString = useMemo(() => JSON.stringify(query), [query])
  return useData(
    () => apiClient.getDashboardMetrics(query),
    [queryString],
    { enabled: !!query }
  )
}

export function useFilterOptions() {
  return useData(
    () => apiClient.getFilteredOptions(),
    []
  )
}

export function useGroupByOptions() {
  return useData(
    () => apiClient.getGroupByOptions(),
    []
  )
}

// ==========================================
// UTILITY HOOKS
// ==========================================

export function usePagination(initialPage = 1, initialLimit = 50) {
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)

  const reset = useCallback(() => {
    setPage(1)
  }, [])

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit)
    setPage(1) // Reset to first page when changing limit
  }, [])

  return {
    page,
    limit,
    setPage: goToPage,
    setLimit: changeLimit,
    reset
  }
}

export function useFilters<T extends Record<string, any>>(initialFilters: T = {} as T) {
  const [filters, setFilters] = useState<T>(initialFilters)

  const updateFilter = useCallback((key: keyof T, value: any) => {
    setFilters((prev: T) => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const removeFilter = useCallback((key: keyof T) => {
    setFilters((prev: T) => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).length > 0
  }, [filters])

  return {
    filters,
    updateFilter,
    removeFilter,
    clearFilters,
    hasActiveFilters
  }
}

// ==========================================
// SEARCH HOOK
// ==========================================

export function useSearch<T>(
  items: T[],
  searchFields: (keyof T)[],
  initialQuery = ''
) {
  const [query, setQuery] = useState(initialQuery)

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items

    const lowercaseQuery = query.toLowerCase()
    
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field]
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowercaseQuery)
        }
        if (Array.isArray(value)) {
          return value.some(v => 
            typeof v === 'string' && v.toLowerCase().includes(lowercaseQuery)
          )
        }
        return false
      })
    )
  }, [items, searchFields, query])

  return {
    query,
    setQuery,
    filteredItems,
    clearSearch: () => setQuery('')
  }
}
