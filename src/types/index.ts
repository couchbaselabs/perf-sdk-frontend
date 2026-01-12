// Central barrel for `@/src/types` - single source of truth
export * from './core'
export * from './entities'
export * from './components'
export type { FilterState as QueryFilterState, PaginationState as QueryPaginationState } from './queries'
export type { ChartDataPoint as ChartsChartDataPoint } from './charts'

// Narrow interfaces for API contracts
export interface SituationalRunSummary {
  id: string
  started: string
  score: number
  sdk?: string
  version?: string
  csp?: string
  pl?: boolean
  clusterVersion?: string
  environment?: string
  description?: string | null
  status?: 'completed' | 'running' | 'failed' | 'unknown'
}

export interface SituationalRunDetailEvent {
  timeOffsetSecs: number | null
  datetime: string
  params: { type: string; description?: string; displayOnGraph?: boolean }
}

export interface SituationalRunDetailResponse {
  runDetails: any
  events: SituationalRunDetailEvent[]
  errorsSummary: any[]
}

