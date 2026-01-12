/**
 * UNIFIED FORMATTING UTILITIES
 * Consolidates all formatting functions into focused modules
 */

/**
 * Date formatting utilities - consolidated from lib/utils/date.ts
 */
export const dateFormatters = {
  /**
   * Formats a date string to locale string (most common pattern)
   * Replaces duplicate formatDate functions across the codebase
   */
  formatDate: (dateInput: any): string => {
    try {
      const raw = ((): any => {
        if (typeof dateInput === 'string' || typeof dateInput === 'number') return dateInput
        if (!dateInput) return undefined
        // Common wrappers coming from DB libs
        return (dateInput as any).date ?? (dateInput as any).started ?? (dateInput as any).value ?? (dateInput as any).defined ?? String(dateInput)
      })()
      const d = new Date(String(raw))
      return Number.isFinite(d.getTime()) ? d.toLocaleString() : String(raw ?? 'Invalid date')
    } catch (e) {
      return String(dateInput ?? 'Invalid date')
    }
  },

  /**
   * Formats date in short format (Month DD, YYYY)
   */
  formatDateShort: (dateInput: any): string => {
    try {
      const d = new Date(dateInput)
      return Number.isFinite(d.getTime()) 
        ? d.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })
        : 'Invalid date'
    } catch (e) {
      return 'Invalid date'
    }
  },

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  formatRelativeTime: (dateInput: any): string => {
    try {
      const date = new Date(dateInput)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins} minutes ago`
      if (diffHours < 24) return `${diffHours} hours ago`
      if (diffDays < 7) return `${diffDays} days ago`
      
      return dateFormatters.formatDateShort(date)
    } catch (e) {
      return 'Unknown time'
    }
  }
}

/**
 * Duration and time formatting utilities
 */
export const timeFormatters = {
  /**
   * Format time offset in HH:MM:SS or MM:SS format
   */
  formatTimeOffset: (seconds: number): string => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0))
    const hours = Math.floor(s / 3600)
    const minutes = Math.floor((s % 3600) / 60)
    const sec = s % 60
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    }
    return `${minutes}:${String(sec).padStart(2, '0')}`
  },

  /**
   * Format duration from microseconds to human readable
   */
  formatDuration: (microseconds: number): string => {
    if (microseconds < 1000) {
      return `${Math.round(microseconds)}μs`
    } else if (microseconds < 1000000) {
      return `${Math.round(microseconds / 1000)}ms`
    } else {
      return `${Math.round(microseconds / 1000000)}s`
    }
  },

  /**
   * Format milliseconds to human readable
   */
  formatMilliseconds: (ms: number): string => {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`
    } else if (ms < 60000) {
      return `${Math.round(ms / 1000)}s`
    } else {
      const minutes = Math.floor(ms / 60000)
      const seconds = Math.round((ms % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }
  }
}

/**
 * Number and value formatting utilities
 */
export const numberFormatters = {
  /**
   * Format value with unit and thousands separators
   */
  formatValue: (value: number, unit: string = ""): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return "N/A"
    }
    
    // Format large numbers with thousands separators
    if (Math.abs(value) >= 1000) {
      return value.toLocaleString() + (unit ? ` ${unit}` : "")
    }
    
    // Round to 2 decimal places for small numbers
    return (Math.round(value * 100) / 100).toString() + (unit ? ` ${unit}` : "")
  },

  /**
   * Format percentage values
   */
  formatPercentage: (value: number, decimals: number = 2): string => {
    return `${(Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals))}%`
  },

  /**
   * Format large numbers with K, M, B suffixes
   */
  formatCompactNumber: (value: number): string => {
    if (value === null || value === undefined || isNaN(value)) return "N/A"
    
    const abs = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`
    
    return value.toString()
  },

  /**
   * Format bytes to human readable format
   */
  formatBytes: (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }
}

/**
 * Text formatting utilities
 */
export const textFormatters = {
  /**
   * Capitalize first letter of string
   */
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  },

  /**
   * Convert camelCase to Title Case
   */
  camelToTitle: (str: string): string => {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (match) => match.toUpperCase())
      .trim()
  },

  /**
   * Truncate text with ellipsis
   */
  truncate: (str: string, length: number = 100): string => {
    if (str.length <= length) return str
    return str.substring(0, length) + '...'
  },

  /**
   * Format SDK name consistently
   */
  formatSdkName: (sdk: string): string => {
    const sdkMap: Record<string, string> = {
      'java': 'Java',
      'python': 'Python',
      'go': 'Go',
      'node': 'Node.js',
      'nodejs': 'Node.js',
      'dotnet': '.NET',
      'csharp': 'C#',
      'cpp': 'C++',
      'kotlin': 'Kotlin',
      'ruby': 'Ruby',
      'scala': 'Scala',
      'rust': 'Rust'
    }
    
    return sdkMap[sdk.toLowerCase()] || textFormatters.capitalize(sdk)
  }
}

// Re-export all formatters as a unified object
export const formatters = {
  ...dateFormatters,
  ...timeFormatters,
  ...numberFormatters,
  ...textFormatters
}

// Legacy exports for backward compatibility
export const { formatDate, formatDateShort } = dateFormatters
export const { formatTimeOffset, formatDuration } = timeFormatters
export const { formatValue, formatPercentage } = numberFormatters

// Removed legacy alias exports that duplicate names to reduce dead exports
