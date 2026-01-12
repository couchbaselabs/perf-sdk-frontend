import { SituationalRun } from "@/src/types/entities"

// Utility functions for situational runs

// renderMixedProperty function removed - use MixedProperty component from ui-helpers.tsx instead


export function applyFilters(runs: SituationalRun[], activeFilters: Record<string, any>, searchQuery: string): SituationalRun[] {
  let filtered = runs

  // Apply text search first
  if (searchQuery) {
    filtered = filtered.filter(run => {
      const searchLower = searchQuery.toLowerCase()
      
      // Search in all text fields
      const fields = [
        run.id,
        run.situational_id,
        run.started,
        run.finished,
        run.sdk,
        run.version,
        run.csp,
        run.environment
      ]
      
      return fields.some(field => 
        field?.toString().toLowerCase().includes(searchLower)
      )
    })
  }

  // Apply column filters
  Object.entries(activeFilters).forEach(([column, filterValue]) => {
    if (!filterValue) return

    filtered = filtered.filter(run => {
      const runValue = (run as any)[column]
      
      if (!runValue) return false

      // Handle different filter types
      if (Array.isArray(filterValue)) {
        // Multi-select filter
        return filterValue.some(fv => 
          Array.isArray(runValue) 
            ? runValue.some(rv => rv.toLowerCase() === fv.toLowerCase())
            : runValue.toLowerCase() === fv.toLowerCase()
        )
      } else if (typeof filterValue === 'object' && filterValue.min !== undefined) {
        // Number range filter
        const numValue = parseFloat(runValue)
        return !isNaN(numValue) && numValue >= filterValue.min && numValue <= filterValue.max
      } else if (typeof filterValue === 'object' && (filterValue.from || filterValue.to)) {
        // Date range filter
        const runDate = new Date(runValue)
        if (filterValue.from && runDate < filterValue.from) return false
        if (filterValue.to && runDate > filterValue.to) return false
        return true
      } else {
        // Simple equality filter
        return runValue.toLowerCase() === filterValue.toLowerCase()
      }
    })
  })

  return filtered
}

export function sortRuns(runs: SituationalRun[], sortColumn: string, sortDirection: 'asc' | 'desc'): SituationalRun[] {
  return [...runs].sort((a, b) => {
    let aVal = (a as any)[sortColumn]
    let bVal = (b as any)[sortColumn]

    // Handle null/undefined values
    if (!aVal && !bVal) return 0
    if (!aVal) return sortDirection === 'asc' ? 1 : -1
    if (!bVal) return sortDirection === 'asc' ? -1 : 1

    // Handle arrays (join for comparison)
    if (Array.isArray(aVal)) aVal = aVal.join(', ')
    if (Array.isArray(bVal)) bVal = bVal.join(', ')

    // Handle dates robustly (parse ISO or locale strings; fallback to timestamp numbers)
    if (sortColumn.includes('started') || sortColumn.includes('finished')) {
      // Coerce nested structures (e.g., {empty, defined}) to primitive first
      const normalize = (v: any) => {
        if (v == null) return NaN
        if (typeof v === 'number') return v
        if (typeof v === 'string') return new Date(v).getTime()
        // Some backends may wrap values; try common keys
        const candidate = (v as any).value ?? (v as any).date ?? (v as any).started ?? (v as any).defined ?? v
        return typeof candidate === 'string' || typeof candidate === 'number'
          ? new Date(String(candidate)).getTime()
          : NaN
      }
      const aTime = normalize(aVal)
      const bTime = normalize(bVal)
      const safeA = Number.isFinite(aTime) ? aTime : -Infinity
      const safeB = Number.isFinite(bTime) ? bTime : -Infinity
      return sortDirection === 'asc' ? safeA - safeB : safeB - safeA
    }

    // Handle numbers
    const aNum = parseFloat(aVal)
    const bNum = parseFloat(bVal)
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
    }

    // Handle strings
    const aStr = aVal.toString().toLowerCase()
    const bStr = bVal.toString().toLowerCase()
    
    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr)
    } else {
      return bStr.localeCompare(aStr)
    }
  })
}

export function extractUniqueValues(runs: SituationalRun[], column: string): string[] {
  const values = new Set<string>()
  
  runs.forEach(run => {
    const value = (run as any)[column]
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => values.add(v.toString()))
      } else {
        values.add(value.toString())
      }
    }
  })
  
  return Array.from(values).sort()
}

export function calculateColumnRanges(runs: SituationalRun[]): Record<string, { min: number; max: number }> {
  const numericColumns = ['score', 'runs', 'duration']
  const ranges: Record<string, { min: number; max: number }> = {}
  
  numericColumns.forEach(column => {
    const values = runs
      .map(run => parseFloat((run as any)[column]))
      .filter(val => !isNaN(val))
    
    if (values.length > 0) {
      ranges[column] = {
        min: Math.min(...values),
        max: Math.max(...values)
      }
    }
  })
  
  return ranges
}
