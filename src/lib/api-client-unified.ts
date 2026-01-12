/**
 * UNIFIED API CLIENT
 * Replaces all 7 redundant data services with a single, clean interface
 */

import { ApiResponse, PaginatedResponse, RunSummary, SituationalRun, FaasJob, PerformanceMetrics } from '@/src/types'
import { fetchJson } from '@/src/lib/api/fetcher'

// Base API configuration
const API_BASE = '/api'
const DEFAULT_TIMEOUT = 30000

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Unified API Client - Single source of truth for all data operations
 */
export class UnifiedApiClient {
  private baseUrl: string
  private timeout: number

  constructor(baseUrl = API_BASE, timeout = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl
    this.timeout = timeout
  }

  /**
   * Generic fetch wrapper with error handling and timeout
   */
  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return fetchJson<T>(endpoint, options, { baseUrl: this.baseUrl, timeoutMs: this.timeout })
  }

  // ==========================================
  // PERFORMANCE RUNS API
  // ==========================================

  async getRuns(params?: {
    limit?: number
    offset?: number
    sdk?: string
    version?: string
    status?: string
  }): Promise<ApiResponse<PaginatedResponse<RunSummary>>> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())
    if (params?.sdk) searchParams.set('sdk', params.sdk)
    if (params?.version) searchParams.set('version', params.version)
    if (params?.status) searchParams.set('status', params.status)

    // Use the existing API endpoint structure
    const response = await this.fetch(`/performance/runs?${searchParams}`)
    
    // Transform the response to match expected format
    if (response.success && Array.isArray(response.data)) {
      return {
        ...response,
        data: {
          data: response.data,
          total: response.data.length,
          page: 1,
          limit: params?.limit || 50,
          hasMore: false
        }
      }
    }
    
    return response as ApiResponse<PaginatedResponse<RunSummary>>
  }

  async getRunById(id: string): Promise<ApiResponse<RunSummary>> {
    return this.fetch(`/runs/${id}`)
  }

  /**
   * Get multiple runs by IDs
   */
  async getRunsByIds(runIds: string[]): Promise<ApiResponse<RunSummary[]>> {
    return this.fetch('/runs/multiple', {
      method: 'POST',
      body: JSON.stringify({ runIds })
    })
  }

  async getRunMetrics(runId: string): Promise<ApiResponse<PerformanceMetrics>> {
    return this.fetch(`/runs/${runId}/metrics`)
  }

  async getRunBuckets(runId: string): Promise<ApiResponse<any[]>> {
    return this.fetch(`/runs/${runId}/buckets`)
  }

  // ==========================================
  // SITUATIONAL RUNS API  
  // ==========================================

  async getSituationalRuns(params?: {
    limit?: number
    offset?: number
  }): Promise<ApiResponse<PaginatedResponse<SituationalRun>>> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())

    return this.fetch(`/situational/runs?${searchParams}`)
  }

  async getSituationalRunById(id: string): Promise<ApiResponse<SituationalRun>> {
    return this.fetch(`/situational/${id}`)
  }

  async getSituationalRunRuns(
    situationalId: string, 
    runId: string
  ): Promise<ApiResponse<any>> {
    return this.fetch(`/situational/${situationalId}/run/${runId}`)
  }

  // ==========================================
  // FAAS JOBS API
  // ==========================================

  async getFaasJobs(params?: {
    limit?: number
    offset?: number
    tag?: string
  }): Promise<ApiResponse<PaginatedResponse<FaasJob>>> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())
    if (params?.tag) searchParams.set('tag', params.tag)

    return this.fetch(`/faas/jobs?${searchParams}`)
  }

  async getFaasJobById(id: string): Promise<ApiResponse<FaasJob>> {
    return this.fetch(`/faas/job/${id}`)
  }

  // ==========================================
  // DASHBOARD API
  // ==========================================

  async getDashboardMetrics(query: any): Promise<ApiResponse<any>> {
    return this.fetch('/dashboard/metrics', {
      method: 'POST',
      body: JSON.stringify(query)
  })
  }

  async getDashboardQuery(query: any): Promise<ApiResponse<any>> {
    return this.fetch('/dashboard/query', {
      method: 'POST', 
      body: JSON.stringify(query)
    })
  }

  async getFilteredOptions(): Promise<ApiResponse<any>> {
    return this.fetch('/dashboard/filtered')
  }

  async getGroupByOptions(): Promise<ApiResponse<string[]>> {
    return this.fetch('/dashboard/groupByOptions')
  }

  // Additional methods for compatibility with existing hooks
  async getRunEvents(runId: string): Promise<ApiResponse<any[]>> {
    return this.fetch(`/runs/${runId}/events`)
  }

  async getGraphData(query: any): Promise<ApiResponse<any>> {
    return this.fetch('/dashboard/graph', {
      method: 'POST',
      body: JSON.stringify(query)
    })
  }

  async getErrorSummaries(runIds: string[]): Promise<ApiResponse<any[]>> {
    return this.fetch('/dashboard/errors', {
      method: 'POST',
      body: JSON.stringify({ runIds })
    })
  }

  async getMetricAlerts(runIds: string[]): Promise<ApiResponse<any[]>> {
    return this.fetch('/dashboard/alerts', {
      method: 'POST',
      body: JSON.stringify({ runIds })
    })
  }

  async getAvailableMetrics(): Promise<ApiResponse<string[]>> {
    return this.fetch('/dashboard/metrics/available')
  }

  /**
   * Get available versions
   */
  async getVersions(includeSnapshots = false): Promise<ApiResponse<string[]>> {
    return this.fetch(`/performance/runs?action=versions&includeSnapshots=${includeSnapshots}`)
  }

  /**
   * Get available clusters
   */
  async getClusters(): Promise<ApiResponse<string[]>> {
    return this.fetch('/performance/runs?action=clusters')
  }

  async getFiltered(hAxis: any): Promise<ApiResponse<any>> {
    return this.fetch('/dashboard/filtered', {
      method: 'POST',
      body: JSON.stringify({ hAxis })
    })
  }
}

// Export singleton instance
export const apiClient = new UnifiedApiClient()
