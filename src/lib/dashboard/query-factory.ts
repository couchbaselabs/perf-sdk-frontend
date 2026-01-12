import {
  createKVOperationInput,
  createSystemMetricInput,
  createHorizontalScalingInput,
  createTransactionInput,
  createTransactionReadOnlyInput,
  createReactiveAPIInput
} from '@/src/lib/dashboard/queries'
import type { DashboardInput } from '@/src/lib/dashboard/queries'
import type { Input } from '@/src/lib/dashboard/dashboard-query-types'

export type VersionQueryParams = {
  sdk: string
  metric: string
  horizontalScaling?: string | null
  systemMetric?: string | null
  transactionThreads?: string | null
  reactiveAPI?: string | null
}

export function buildDashboardInputForVersion(params: VersionQueryParams): Input {
  const { sdk, metric, horizontalScaling, systemMetric, transactionThreads, reactiveAPI } = params

  if (horizontalScaling) {
    return { ...createHorizontalScalingInput(sdk, false, true), annotations: [] } as unknown as Input
  }

  if (systemMetric) {
    if (metric.includes('duration_') || metric.includes('operations_')) {
      return { ...createKVOperationInput(sdk, 'get', false, true, metric), annotations: [] } as unknown as Input
    }
    return { ...createSystemMetricInput(sdk, systemMetric, false), annotations: [] } as unknown as Input
  }

  if (transactionThreads) {
    if (metric.includes('duration_')) {
      return { ...createKVOperationInput(sdk, 'get', false, true, metric), annotations: [] } as unknown as Input
    }
    const isReadOnly = metric.includes('operations')
    return { ...(isReadOnly
      ? createTransactionReadOnlyInput(sdk, parseInt(transactionThreads), false)
      : createTransactionInput(sdk, parseInt(transactionThreads), false)), annotations: [] } as unknown as Input
  }

  if (reactiveAPI) {
    return { ...createReactiveAPIInput(sdk, 'DEFAULT', false), annotations: [] } as unknown as Input
  }

  return { ...createKVOperationInput(sdk, 'get', false, true, metric), annotations: [] } as unknown as Input
}


