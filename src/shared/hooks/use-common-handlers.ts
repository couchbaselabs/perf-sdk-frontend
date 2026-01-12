/**
 * COMMON HANDLER HOOKS
 * Consolidates duplicate handler patterns across components
 */

import { useState, useCallback } from 'react'

/**
 * Refresh handler hook - consolidates 4 duplicate handleRefresh patterns
 * Provides consistent loading state management across components
 */
export const useRefreshHandler = (callback?: () => void | Promise<void>) => {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    try {
      if (callback) {
        await callback()
      }
    } catch (error) {
      console.error('Refresh error:', error)
    } finally {
      // Small delay to show loading state even for fast operations
      setTimeout(() => setIsLoading(false), 200)
    }
  }, [callback])
  
  return { handleRefresh, isLoading, setIsLoading }
}

/**
 * Sort handler hook - consolidates 3 duplicate handleSort patterns
 * Provides consistent sorting logic across tables and lists
 */
export const useSortHandler = (initialColumn?: string, initialDirection: 'asc' | 'desc' = 'asc') => {
  const [sortColumn, setSortColumn] = useState(initialColumn || '')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialDirection)
  
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }, [sortColumn])
  
  const resetSort = useCallback(() => {
    setSortColumn('')
    setSortDirection('asc')
  }, [])
  
  return { 
    sortColumn, 
    sortDirection, 
    handleSort, 
    resetSort,
    setSortColumn,
    setSortDirection
  }
}

/**
 * Clear filters hook - consolidates 3 duplicate clearAllFilters patterns
 * Provides consistent filter clearing across different components
 */
export const useClearFilters = () => {
  const [resetCallbacks, setResetCallbacks] = useState<(() => void)[]>([])
  
  const registerResetCallback = useCallback((callback: () => void) => {
    setResetCallbacks(prev => [...prev, callback])
    // Return unregister function
    return () => {
      setResetCallbacks(prev => prev.filter(cb => cb !== callback))
    }
  }, [])
  
  const clearAllFilters = useCallback(() => {
    resetCallbacks.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Error clearing filter:', error)
      }
    })
  }, [resetCallbacks])
  
  return { clearAllFilters, registerResetCallback }
}

/**
 * Search handler hook - common pattern for search functionality
 * Provides debounced search with loading state
 */
export const useSearchHandler = (onSearch?: (query: string) => void | Promise<void>, delay = 300) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    
    if (!onSearch) return
    
    setIsSearching(true)
    try {
      // Debounce the search
      await new Promise(resolve => setTimeout(resolve, delay))
      await onSearch(query)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [onSearch, delay])
  
  const clearSearch = useCallback(() => {
    setSearchQuery('')
    if (onSearch) {
      onSearch('')
    }
  }, [onSearch])
  
  return {
    searchQuery,
    isSearching,
    handleSearch,
    clearSearch,
    setSearchQuery
  }
}

/**
 * Pagination handler hook - common pagination patterns
 */
export const usePaginationHandler = (initialPage = 1, initialLimit = 50) => {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  const [total, setTotal] = useState(0)
  
  const totalPages = Math.ceil(total / limit)
  const hasNext = currentPage < totalPages
  const hasPrev = currentPage > 1
  
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }, [totalPages])
  
  const nextPage = useCallback(() => {
    if (hasNext) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasNext])
  
  const prevPage = useCallback(() => {
    if (hasPrev) {
      setCurrentPage(prev => prev - 1)
    }
  }, [hasPrev])
  
  const resetPagination = useCallback(() => {
    setCurrentPage(initialPage)
  }, [initialPage])
  
  return {
    currentPage,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    setCurrentPage,
    setLimit,
    setTotal,
    goToPage,
    nextPage,
    prevPage,
    resetPagination
  }
}
