import { AVAILABLE_METRICS, getSystemMetricInfo } from '@/src/lib/config/constants'
import {
  createKVOperationInput,
  createSystemMetricInput,
  createHorizontalScalingInput,
  createHorizontalScalingReactiveInput,
  createTransactionInput,
  createTransactionReadOnlyInput,
  createReactiveAPIInput
} from '@/src/lib/dashboard/queries'
import type { Input } from '@/src/lib/dashboard/dashboard-query-types'

export type VersionQueryParams = {
  sdk: string
  metric: string
  cluster?: string | null
  horizontalScaling?: string | null
  systemMetric?: string | null
  transactionThreads?: string | null
  transactionReadonly?: string | null
  reactiveAPI?: string | null
  kvOperation?: string | null
}

export function buildDashboardInputForVersion(params: VersionQueryParams): Input {
  const {
    sdk,
    metric,
    cluster,
    horizontalScaling,
    systemMetric,
    transactionThreads,
    transactionReadonly,
    reactiveAPI,
    kvOperation,
  } = params
  const clusterVersion = cluster || undefined
  const bucketMetric = AVAILABLE_METRICS.some((m) => m.id === metric)
    ? metric
    : 'duration_average_us'
  const resolvedKvOp: 'get' | 'replace' | 'insert' =
    kvOperation === 'replace' || kvOperation === 'insert' ? kvOperation : 'get'

  if (horizontalScaling) {
    const scalingInput =
      reactiveAPI === 'ASYNC'
        ? createHorizontalScalingReactiveInput(sdk, false, true, clusterVersion, bucketMetric)
        : createHorizontalScalingInput(sdk, false, true, bucketMetric, clusterVersion)
    return { ...scalingInput, annotations: [] } as unknown as Input
  }

  const effectiveSystemMetric =
    systemMetric && getSystemMetricInfo(systemMetric)
      ? systemMetric
      : !metric.includes('duration_') && !metric.includes('operations_') && getSystemMetricInfo(metric)
        ? metric
        : null

  if (effectiveSystemMetric) {
    if (metric.includes('duration_') || metric.includes('operations_')) {
      return { ...createKVOperationInput(sdk, resolvedKvOp, false, true, bucketMetric, clusterVersion), annotations: [] } as unknown as Input
    }
    return { ...createSystemMetricInput(sdk, effectiveSystemMetric, false, true, clusterVersion), annotations: [] } as unknown as Input
  }

  if (transactionThreads) {
    const parsedThreads = Number.parseInt(transactionThreads, 10)
    const safeThreads = Number.isFinite(parsedThreads) && parsedThreads > 0 ? parsedThreads : 1
    const isReadOnly =
      transactionReadonly === 'true' ||
      transactionReadonly === '1' ||
      transactionReadonly === 'readonly'
    return { ...(isReadOnly
      ? createTransactionReadOnlyInput(sdk, safeThreads, false, true, clusterVersion, bucketMetric)
      : createTransactionInput(sdk, safeThreads, false, true, clusterVersion, bucketMetric)), annotations: [] } as unknown as Input
  }

  if (reactiveAPI) {
    const apiType = reactiveAPI === 'ASYNC' ? 'ASYNC' : 'DEFAULT'
    return { ...createReactiveAPIInput(sdk, apiType, false, true, clusterVersion, bucketMetric), annotations: [] } as unknown as Input
  }

  return { ...createKVOperationInput(sdk, resolvedKvOp, false, true, bucketMetric, clusterVersion), annotations: [] } as unknown as Input
}
