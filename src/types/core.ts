/**
 * CORE API TYPE DEFINITIONS
 * Single source of truth for shared API types - eliminates duplication across multiple files
 */

// ==========================================
// BASE API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ==========================================
// PERFORMANCE METRICS (Core definition)
// ==========================================

export interface PerformanceMetrics {
  throughput: number
  latency: {
    avg: number
    p50: number
    p95: number
    p99: number
    min: number
    max: number
  }
  errors: {
    total: number
    rate: number
    breakdown: Record<string, number>
  }
  operations: {
    total: number
    success: number
    failed: number
  }
  // Optional metrics for enhanced reporting
  memHeapUsedMB?: number
  cpuUsage?: number
  threadCount?: number
}

// ==========================================
// BASE ENTITY TYPES
// ==========================================

export interface BaseEntity {
  id: string
  datetime: string
}

// ==========================================
// ERROR AND ALERT TYPES
// ==========================================

export interface ErrorSummary {
  errorType: string
  count: number
  percentage: number
  firstOccurrence: string
  lastOccurrence: string
  affectedRuns: string[]
  message?: string
}

export interface MetricAlert {
  id: string
  metric: string
  threshold: number
  value: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  runId: string
  timestamp: string
  type?: 'warning' | 'error' | 'info'
}

// ==========================================
// TIME SERIES AND GRAPH DATA
// ==========================================

export interface TimeSeriesData {
  timestamp: string
  value: number
  runId: string
}

export interface GraphData {
  datasets: {
    label: string
    data: number[]
    backgroundColor: string
    borderColor: string
    borderWidth: number
  }[]
  labels: string[]
}

export interface ChartDataPoint {
  x: number
  y: number
}
