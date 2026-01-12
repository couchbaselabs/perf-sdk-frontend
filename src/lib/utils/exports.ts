/**
 * UNIFIED EXPORT UTILITIES
 * Consolidates CSV and JSON export functionality across the application
 */

/**
 * Export data to CSV file
 * Provides consistent CSV export functionality across charts and tables
 */
export const exportToCSV = (
  data: any[], 
  filename: string, 
  headers?: string[]
): void => {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  try {
    let csvContent = "data:text/csv;charset=utf-8,"
    
    // Auto-generate headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0])
    csvContent += csvHeaders.join(",") + "\n"
    
    // Add data rows
    data.forEach((item) => {
      const row = csvHeaders.map(header => {
        const value = item[header]
        // Handle commas and quotes in data
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value ?? ""
      }).join(",")
      csvContent += row + "\n"
    })
    
    // Create and trigger download
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${filename}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
  } catch (error) {
    console.error('Error exporting CSV:', error)
    throw new Error('Failed to export CSV file')
  }
}

/**
 * Clean JSON data by removing circular references and internal properties
 */
export const getCleanJsonData = (data: any): any => {
  if (!data) return {}
  
  // Create a deep copy and remove circular references
  const cleanData = JSON.parse(JSON.stringify(data, (key, value) => {
    // Remove internal React/Next.js properties
    if (key.startsWith('_') || key.startsWith('$')) return undefined
    // Remove function properties
    if (typeof value === 'function') return undefined
    // Remove undefined values
    if (value === undefined) return undefined
    return value
  }))
  
  return cleanData
}

/**
 * Download JSON data as a file
 */
export const downloadJSON = (
  data: any,
  filename: string,
  prettify: boolean = true
): void => {
  try {
    const cleanData = getCleanJsonData(data)
    const jsonString = prettify 
      ? JSON.stringify(cleanData, null, 2)
      : JSON.stringify(cleanData)
    
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading JSON:', error)
    throw new Error('Failed to download JSON file')
  }
}

/**
 * Export chart data specifically - handles chart data structure
 */
export const exportChartData = (
  chartData: any[],
  filename: string,
  format: 'csv' | 'json' = 'csv'
): void => {
  if (!chartData || chartData.length === 0) {
    console.warn('No chart data to export')
    return
  }

  if (format === 'csv') {
    // For chart data, create meaningful headers
    const sampleItem = chartData[0]
    const headers = Object.keys(sampleItem).filter(key => 
      !key.startsWith('_') && 
      typeof sampleItem[key] !== 'function'
    )
    
    exportToCSV(chartData, filename, headers)
  } else {
    downloadJSON(chartData, filename)
  }
}

/**
 * Export table data with custom formatting
 */
export const exportTableData = (
  tableData: any[],
  filename: string,
  options: {
    format?: 'csv' | 'json'
    columnMap?: Record<string, string> // Map internal keys to display names
    excludeColumns?: string[]
  } = {}
): void => {
  const { format = 'csv', columnMap = {}, excludeColumns = [] } = options

  if (!tableData || tableData.length === 0) {
    console.warn('No table data to export')
    return
  }

  // Filter out excluded columns
  const filteredData = tableData.map(row => {
    const filteredRow: any = {}
    Object.keys(row).forEach(key => {
      if (!excludeColumns.includes(key)) {
        const displayKey = columnMap[key] || key
        filteredRow[displayKey] = row[key]
      }
    })
    return filteredRow
  })

  if (format === 'csv') {
    exportToCSV(filteredData, filename)
  } else {
    downloadJSON(filteredData, filename)
  }
}

/**
 * Utilities for data preparation before export
 */
export const exportHelpers = {
  /**
   * Flatten nested objects for CSV export
   */
  flattenObject: (obj: any, prefix: string = ''): any => {
    const flattened: any = {}
    
    Object.keys(obj).forEach(key => {
      const value = obj[key]
      const newKey = prefix ? `${prefix}.${key}` : key
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, exportHelpers.flattenObject(value, newKey))
      } else {
        flattened[newKey] = value
      }
    })
    
    return flattened
  },

  /**
   * Convert array data to CSV-friendly format
   */
  prepareForCSV: (data: any[]): any[] => {
    return data.map(item => {
      const prepared: any = {}
      
      Object.keys(item).forEach(key => {
        const value = item[key]
        
        if (Array.isArray(value)) {
          prepared[key] = value.join('; ')
        } else if (value && typeof value === 'object' && !(value instanceof Date)) {
          prepared[key] = JSON.stringify(value)
        } else {
          prepared[key] = value
        }
      })
      
      return prepared
    })
  },

  /**
   * Generate filename with timestamp
   */
  generateTimestampedFilename: (baseName: string): string => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    return `${baseName}_${timestamp}`
  }
}

/**
 * Copy JSON data to clipboard
 */
export const copyJSONToClipboard = async (data: any): Promise<void> => {
  try {
    const cleanData = getCleanJsonData(data)
    const jsonString = JSON.stringify(cleanData, null, 2)
    await navigator.clipboard.writeText(jsonString)
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    throw new Error('Failed to copy JSON to clipboard')
  }
}

/**
 * Export chart to CSV - specific chart export function
 */
export const exportChartToCSV = (data: any[], filename: string): void => {
  exportToCSV(data, filename)
}

// Legacy exports for backward compatibility
// Remove duplicate alias; prefer the canonical name
