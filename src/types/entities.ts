/**
 * ENTITY TYPE DEFINITIONS
 * Single source of truth for all business entities - consolidates duplicated entity definitions
 */

import { BaseEntity, PerformanceMetrics } from './core'

// ==========================================
// RUN TYPES
// ==========================================

export interface Run extends BaseEntity {
  status: 'completed' | 'running' | 'failed'
  duration?: number
  sdk: string
  version: string
  clusterVersion: string
  workload: string
  metrics?: PerformanceMetrics
  params: {
    faas?: {
      cloud: string
      jobId: string
      server: string
      sbxDetails: string
      environment: string
      situationalRunId: string
      performerLogLevel: string
      enablePrivateEndpoint: string
    }
    cluster?: {
      version: string
      nodes: number
    }
    impl?: {
      language: string
      version: string
      sdk: string
    }
    workload?: {
      name: string
      type: string
      operations: number
      situational?: string
    }
    debug?: {
      ciUrl: string
      cbDinoClusterId: string
    }
    vars?: Record<string, any>
  }
}

export interface RunSummary extends Run {
  language: string
}

// ==========================================
// SITUATIONAL RUN TYPES
// ==========================================

export interface SituationalRun extends BaseEntity {
  situational_id?: string
  started: string
  finished?: string
  duration?: number
  score?: number
  runs?: number
  status?: 'completed' | 'running' | 'failed'
  sdk?: string | string[]
  version?: string | string[]
  description?: string
  csp?: string | string[]
  privateLink?: string
  pl?: boolean
  clusterVersion?: string | string[]
  environment?: string
}

export interface SituationalRunJoin {
  situational_run_id: string
  run_id: string
  params: Record<string, any>
}

export interface IndividualRun extends BaseEntity {
  situational_id?: string
  started: string
  finished: string
  duration: number
  status: 'completed' | 'running' | 'failed'
  sdk: string
  version: string
  csp: string
  privateLink: string
  pl: boolean
  clusterVersion: string
  environment: string
  metrics: PerformanceMetrics
}

// ==========================================
// FAAS TYPES
// ==========================================

export interface FaasJob extends BaseEntity {
  job_type: 'performance' | 'situational' | string
  config: Record<string, any> | null
  tags: string[] | null
  status?: 'completed' | 'running' | 'failed'
  created_at?: string
  sdks?: string[]
  workloads?: string[]
  server_versions?: string[]
  performance_runs?: number
  situational_runs?: number
  description?: string
}

export interface FaasRun extends BaseEntity {
  job_id: string
  run_type: 'performance' | 'situational'
  sdk: string
  workload: string
  server_version: string
  started_at: string
  completed_at: string | null
  status: 'completed' | 'running' | 'failed'
  duration_ms?: number
  duration?: number
  metrics?: PerformanceMetrics
}

// ==========================================
// DATA BUCKET TYPES (from database layer)
// ==========================================

export interface Bucket {
  time: string
  run_id: string
  operations_total: number
  operations_success: number
  operations_failed: number
  duration_min_us: number
  duration_max_us: number
  duration_average_us: number
  duration_p50_us: number
  duration_p95_us: number
  duration_p99_us: number
  errors: Record<string, any> | null
  time_offset_secs: number
}

export interface Metric {
  initiated: string
  run_id: string
  metrics: Record<string, any>
  time_offset_secs: number
}

export interface RunEvent {
  run_id: string
  datetime: string
  event?: Record<string, any>
  params?: Record<string, any>
  time_offset_secs?: number
}

// ==========================================
// LEGACY TYPE ALIASES (for backward compatibility)
// ==========================================

/** @deprecated Use Run instead */
export type RunData = Run

/** @deprecated Use FaasJob instead */
export type FaasJobData = FaasJob

/** @deprecated Use FaasRun instead */
export type FaasRunData = FaasRun

// ==========================================
// ADDITIONAL RUN DATA TYPES (consolidated from lib/api.ts)
// ==========================================

export interface QueryInput {
  hAxis?: {
    type: string
    databaseField: string
    resultType?: string
  }
  yAxes: Array<{
    type: string
    column?: string
    metric?: string
    yAxisID?: string
  }>
  databaseCompare?: {
    cluster: any
    impl: any
    workload: any
    vars: any
  }
  graphType?: string
  multipleResultsHandling?: string
  mergingType?: string
  trimmingSeconds?: number
  bucketiseSeconds?: number
  excludeSnapshots?: boolean
  excludeGerrit?: boolean
  filterRuns?: string
  runId?: string
  annotations?: any[]
}
