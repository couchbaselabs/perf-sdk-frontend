/**
 * QUERY TYPE DEFINITIONS
 * Single source of truth for all API query interfaces - consolidates query duplicates
 */

// ==========================================
// RUN QUERIES
// ==========================================

export interface RunsQuery {
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  dateFrom?: string
  dateTo?: string
  status?: string | string[]
  sdk?: string
  version?: string
  cluster?: {
    version?: string
    nodes?: number
  }
  impl?: {
    language?: string
    version?: string
    sdk?: string
  }
  workload?: {
    name?: string
    type?: string
  }
}

export interface MetricsQuery {
  runId: string
  startTime?: string
  endTime?: string
  metrics?: string[]
  timeRange?: {
    start: string
    end: string
  }
}

// ==========================================
// SITUATIONAL RUN QUERIES
// ==========================================

export interface SituationalRunsQuery {
  limit?: number
  offset?: number
  situational_id?: string
  status?: string
  startDate?: string
  endDate?: string
}

export interface SituationalRunQuery {
  readonly situationalRunId: string
}

export interface SituationalRunAndRunQuery {
  readonly situationalRunId: string
  readonly runId: string
}

// ==========================================
// GRAPH AND VISUALIZATION QUERIES
// ==========================================

export interface GraphQuery {
  runIds: string[]
  metric: string
  groupBy?: 'time' | 'run' | 'operation'
  aggregation?: 'avg' | 'min' | 'max' | 'sum' | 'p50' | 'p95' | 'p99'
  bucketSize?: number // seconds
  timeRange?: {
    start: string
    end: string
  }
}

// ==========================================
// DASHBOARD QUERIES
// ==========================================

export interface DatabaseCompare {
  cluster?: Record<string, unknown>
  impl?: Record<string, unknown>
  workload?: Record<string, unknown>
  vars?: Record<string, unknown>
}

export interface HorizontalAxisDynamic {
  type: "dynamic"
}

// ==========================================
// UI STATE QUERIES
// ==========================================

export interface FilterState {
  [key: string]: any
}

export interface ColumnConfig {
  key: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum'
  sortable?: boolean
  filterable?: boolean
  options?: string[]
  range?: { min: number; max: number }
}

export interface PaginationState {
  page: number
  limit: number
  total: number
}
