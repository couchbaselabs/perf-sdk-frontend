import { logger } from '@/src/lib/utils/logger'
import type { ApiResponse } from '@/src/types'

const DEFAULT_BASE = '/api'
const DEFAULT_TIMEOUT_MS = 30000

export class ApiError extends Error {
  status?: number
  code?: string
  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function fetchJson<T>(
  endpoint: string,
  options: RequestInit = {},
  cfg: { baseUrl?: string; timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<ApiResponse<T>> {
  const baseUrl = cfg.baseUrl ?? DEFAULT_BASE
  const timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  // Link an external signal (e.g. React Query's) to our controller so that
  // navigating away or switching SDKs aborts the in-flight request instead of
  // letting it run to completion against the database.
  const externalSignal = cfg.signal
  const onExternalAbort = () => controller.abort()
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', onExternalAbort)
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`.replace(/\?$|\?&$/, ''), {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })

    if (!response.ok) {
      const text = await safeText(response)
      logger.warn(`fetchJson non-OK response: ${response.status} ${response.statusText}`, { endpoint, text })
      throw new ApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status
      )
    }

    const data = (await response.json()) as T
    return { data, success: true, message: 'Request successful' }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      // Caller-initiated cancellation: rethrow so React Query treats it as a
      // cancelled query rather than a failed one.
      if (externalSignal?.aborted) throw error
      logger.error(`fetchJson timeout after ${timeoutMs}ms`, error, { endpoint })
      throw new ApiError(`Request timeout after ${timeoutMs}ms`)
    }
    logger.error('fetchJson error', error, { endpoint })
    if (error instanceof ApiError) throw error
    throw new ApiError(error instanceof Error ? error.message : 'Unknown error occurred')
  } finally {
    clearTimeout(timeoutId)
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort)
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}


