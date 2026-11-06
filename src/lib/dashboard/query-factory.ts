import {
  createKVOperationInput,
  createSystemMetricInput,
  createHorizontalScalingInput,
  createTransactionInput,
  createTransactionReadOnlyInput,
  createReactiveAPIInput
} from '@/src/lib/dashboard/queries'
import type { DashboardInput } from '@/src/lib/dashboard/queries'
import { withObservability, type ObservabilityMode } from '@/src/lib/dashboard/observability'
import type { Input } from '@/src/lib/dashboard/dashboard-query-types'

export type VersionQueryParams = {
  sdk: string
  metric: string
  horizontalScaling?: string | null
  systemMetric?: string | null
  transactionThreads?: string | null
  reactiveAPI?: string | null
  observability?: ObservabilityMode
}

// The dashboard input for a drilldown, selecting the same observability mode's runs as the
// chart it came from.
export function buildDashboardInputForVersion(params: VersionQueryParams): Input {
  return withObservability(baseInputForVersion(params) as unknown as DashboardInput, params.observability ?? 'tracing') as unknown as Input
}

function baseInputForVersion(params: VersionQueryParams): Input {
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


