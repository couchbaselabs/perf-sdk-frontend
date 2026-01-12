/**
 * UNIFIED DATA TRANSFORMATION UTILITIES
 * Consolidates scattered data transformation logic across components
 */

import { AVAILABLE_METRICS } from '@/src/lib/config/constants'

export interface TransformOptions {
  sdk?: string
  normalizeData?: boolean
  baseline?: {
    clusterVersion?: string
    sdkVersion?: string
  }
}

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: any
}

export interface GroupedChartData {
  name: string
  [key: string]: any // Dynamic keys for grouped data
}

/**
 * Data Transformers - Centralized data transformation logic
 */
export const DataTransformers = {
  /**
   * Transform raw API data to chart format
   */
  toChart: (
    rawData: any[], 
    options: TransformOptions = {}
  ): ChartDataPoint[] => {
    if (!rawData || rawData.length === 0) return []

    return rawData.map((item, index) => ({
      name: item.name || item.label || `Item ${index + 1}`,
      value: typeof item.value === 'number' ? item.value : 0,
      ...item // Include all other properties
    }))
  },

  /**
   * Transform data for grouped charts (SDK versions as groups)
   */
  toGroupedChart: (
    rawData: any[],
    groupBy: 'sdk' | 'cluster' = 'sdk'
  ): GroupedChartData[] => {
    if (!rawData || rawData.length === 0) return []

    const groupKey = groupBy === 'sdk' ? 'sdkVersion' : 'clusterVersion'
    const valueKey = groupBy === 'sdk' ? 'clusterVersion' : 'sdkVersion'

    // Get unique groups and values
    const groups = Array.from(new Set(rawData.map(item => item[groupKey])))
    const values = Array.from(new Set(rawData.map(item => item[valueKey])))

    return groups.map(group => {
      const result: GroupedChartData = { name: group }

      values.forEach(value => {
        const item = rawData.find(d => d[groupKey] === group && d[valueKey] === value)
        result[value] = item ? item.value : 0
        result[`${value}_original`] = item || null
      })

      return result
    })
  },

  /**
   * Transform data for comparative analysis
   */
  toComparative: (
    rawData: any[],
    options: TransformOptions = {}
  ): any[] => {
    if (!rawData || rawData.length === 0) return []

    let transformedData = [...rawData]

    // Apply normalization if requested
    if (options.normalizeData && options.baseline) {
      const baseline = rawData.find(item => 
        item.clusterVersion === options.baseline?.clusterVersion &&
        item.sdkVersion === options.baseline?.sdkVersion
      )

      if (baseline && baseline.value > 0) {
        transformedData = rawData.map(item => ({
          ...item,
          value: (item.value / baseline.value) * 100,
          originalValue: item.value,
          isNormalized: true
        }))
      }
    }

    return transformedData
  },

  /**
   * Transform data for performance metrics
   */
  toPerformanceChart: (
    rawData: any[],
    metricId: string = 'duration_average_us'
  ): ChartDataPoint[] => {
    if (!rawData || rawData.length === 0) return []

    const metricInfo = AVAILABLE_METRICS.find(m => m.id === metricId) || 
                     { label: "Performance", unit: "units" }

    return rawData.map((item, index) => ({
      name: item.name || item.sdkVersion || `Item ${index + 1}`,
      value: item[metricId] || item.value || 0,
      metricLabel: metricInfo.label,
      metricUnit: metricInfo.unit,
      ...item
    }))
  },

  /**
   * Transform situational run data
   */
  toSituationalData: (rawData: any[]): any[] => {
    if (!rawData || rawData.length === 0) return []

    return rawData.map(run => ({
      ...run,
      formattedScore: run.score ? `${run.score}/100` : 'N/A',
      statusColor: run.status?.toLowerCase() === 'completed' ? 'green' : 
                   run.status?.toLowerCase() === 'running' ? 'blue' : 'red',
      environmentType: run.environment?.toLowerCase().includes('prod') ? 'production' :
                      run.environment?.toLowerCase().includes('staging') ? 'staging' : 'development'
    }))
  },

  /**
   * Aggregate home chart data
   */
  aggregateHomeData: (
    rawData: any[],
    operation: string,
    metric: string = 'duration_average_us'
  ): ChartDataPoint[] => {
    if (!rawData || rawData.length === 0) return []

    // Group by SDK version and calculate aggregates
    const grouped = rawData.reduce((acc, item) => {
      const key = item.sdkVersion || item.sdk || 'Unknown'
      if (!acc[key]) {
        acc[key] = {
          name: key,
          values: [],
          operation,
          metric
        }
      }
      
      const value = item[metric] || item.value || 0
      if (typeof value === 'number' && value > 0) {
        acc[key].values.push(value)
      }
      
      return acc
    }, {} as Record<string, any>)

    // Calculate averages
    return Object.values(grouped).map((group: any) => ({
      name: group.name,
      value: group.values.length > 0 
        ? group.values.reduce((sum: number, val: number) => sum + val, 0) / group.values.length
        : 0,
      count: group.values.length,
      operation: group.operation,
      metric: group.metric
    }))
  },

  /**
   * Transform Chart.js-style dashboard response into PerformanceBarChart data.
   * Uses results array when available to preserve grouping→runIds mapping.
   */
  toBarChartFromDashboard: (chartData: any, sdkLanguage: string = 'Java'): ChartDataPoint[] => {
    if (!chartData) return []
    if (chartData?.results && Array.isArray(chartData.results)) {
      return chartData.results
        .map((result: any) => {
          const runIdsArray = Array.isArray(result.runIds)
            ? result.runIds
            : (result.runIds ? [result.runIds] : [])
          return {
            name: result.grouping,
            value: Number(result.value) || 0,
            runIds: runIdsArray,
            runCount: runIdsArray.length,
            clusterName: '7.1.1',
            clusterColor: 'rgb(16, 185, 129)',
            sdkName: sdkLanguage,
            sdkColor: 'rgb(16, 185, 129)'
          }
        })
        .filter((item: any) => !isNaN(item.value) && item.name)
    }

    if (chartData?.data?.labels && chartData?.data?.datasets?.[0]?.data) {
      const labels = chartData.data.labels
      const data = chartData.data.datasets[0].data
      const runIds = chartData.data.runIds || []
      return labels
        .map((label: string, index: number) => {
          const associatedRunIds = runIds[index] || []
          const runIdsArray = Array.isArray(associatedRunIds)
            ? associatedRunIds
            : (associatedRunIds ? [associatedRunIds] : [])
          return {
            name: label,
            value: Number(data[index]) || 0,
            runIds: runIdsArray,
            runCount: runIdsArray.length,
            clusterName: '7.1.1',
            clusterColor: 'rgb(16, 185, 129)',
            sdkName: sdkLanguage,
            sdkColor: 'rgb(16, 185, 129)'
          }
        })
        .filter((item: any) => !isNaN(item.value))
    }

    return []
  }
}

/**
 * Chart Data Validators
 */
export const DataValidators = {
  /**
   * Validate chart data structure
   */
  isValidChartData: (data: any): data is ChartDataPoint[] => {
    return Array.isArray(data) && 
           data.every(item => 
             typeof item === 'object' && 
             item !== null && 
             'name' in item && 
             'value' in item
           )
  },

  /**
   * Validate grouped chart data
   */
  isValidGroupedData: (data: any): data is GroupedChartData[] => {
    return Array.isArray(data) && 
           data.every(item => 
             typeof item === 'object' && 
             item !== null && 
             'name' in item
           )
  },

  /**
   * Check if data has required metric
   */
  hasMetric: (data: any[], metric: string): boolean => {
    return Array.isArray(data) && 
           data.length > 0 && 
           data.some(item => metric in item)
  }
}

/**
 * Data Aggregators
 */
export const DataAggregators = {
  /**
   * Calculate metric value with fallbacks
   */
  calculateMetricValue: (item: any, metric: string): number => {
    // Direct property access
    if (item[metric] !== undefined && typeof item[metric] === 'number') {
      return item[metric]
    }
    
    // Fallback to 'value' property
    if (item.value !== undefined && typeof item.value === 'number') {
      return item.value
    }
    
    // Fallback to nested data
    if (item.data && item.data[metric] !== undefined) {
      return typeof item.data[metric] === 'number' ? item.data[metric] : 0
    }
    
    return 0
  },

  /**
   * Sort versions consistently
   */
  sortVersions: (versions: string[]): string[] => {
    return versions.sort((a, b) => {
      // Simple version comparison - can be enhanced with semver
      const aParts = a.split('.').map(Number)
      const bParts = b.split('.').map(Number)
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0
        const bPart = bParts[i] || 0
        
        if (aPart !== bPart) {
          return aPart - bPart
        }
      }
      
      return 0
    })
  },

  /**
   * Group data by property
   */
  groupBy: <T>(array: T[], property: keyof T): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const key = String(item[property])
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(item)
      return groups
    }, {} as Record<string, T[]>)
  }
}

// Types exported above
