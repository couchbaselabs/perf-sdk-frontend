import { getSystemMetricInfo } from '@/src/lib/config/constants'

export type QueryType =
  | 'kvOperation'
  | { type: 'kvOperation'; operation: 'replace' | 'insert' }
  | 'horizontalScaling'
  | { type: 'horizontalScaling'; api: 'ASYNC' }
  | 'reactiveAPI'
  | { type: 'reactiveAPI'; api: 'DEFAULT' | 'ASYNC' }
  | { type: 'systemMetric'; metric: string }
  | { type: 'transaction'; threads: number; readonly?: boolean }

interface QueryIntentAxis {
  type?: string
  metric?: string
  column?: string
}

interface QueryIntentTransactionInnerOp {
  op?: string
}

interface QueryIntentWorkloadOp {
  op?: string
  transaction?: {
    ops?: readonly QueryIntentTransactionInnerOp[] | unknown
  } | null
}

interface QueryIntentWorkload {
  operations?: readonly QueryIntentWorkloadOp[] | null
}

interface QueryIntentVars {
  horizontalScaling?: number
  experimentName?: string | null
  api?: string
  poolSize?: number
}

export interface QueryIntentInput {
  hAxis?: {
    databaseField?: string
  } | null
  workload?: QueryIntentWorkload | null
  vars?: QueryIntentVars | null
  databaseCompare?: {
    workload?: QueryIntentWorkload | null
    vars?: QueryIntentVars | null
  } | null
  yAxes?: readonly QueryIntentAxis[] | null
}

export function isNonVersionGroupingQueryType(queryType: QueryType): boolean {
  return (
    queryType === 'horizontalScaling' ||
    (typeof queryType === 'object' && queryType.type === 'horizontalScaling')
  )
}

export function applyQueryTypeSearchParams(
  params: URLSearchParams,
  queryType: QueryType,
  horizontalScalingValue?: string
): void {
  if (
    queryType === 'horizontalScaling' ||
    (typeof queryType === 'object' && queryType.type === 'horizontalScaling')
  ) {
    if (horizontalScalingValue) {
      params.set('horizontalScaling', horizontalScalingValue)
    }
    if (typeof queryType === 'object' && queryType.api) {
      params.set('reactiveAPI', queryType.api)
    }
    return
  }

  if (queryType === 'reactiveAPI') {
    params.set('reactiveAPI', 'ASYNC')
    return
  }

  if (typeof queryType === 'object') {
    if (queryType.type === 'kvOperation') {
      params.set('kvOperation', queryType.operation)
      return
    }
    if (queryType.type === 'reactiveAPI') {
      params.set('reactiveAPI', queryType.api)
      return
    }
    if (queryType.type === 'systemMetric') {
      params.set('systemMetric', queryType.metric || 'processCpu')
      return
    }
    if (queryType.type === 'transaction') {
      params.set('transactionThreads', String(queryType.threads))
      if (queryType.readonly) {
        params.set('transactionReadonly', 'true')
      }
    }
  }
}

export function getQueryTypeFromInput(
  queryInput: QueryIntentInput | null | undefined,
  title?: string
): QueryType {
  if (!queryInput) {
    return 'kvOperation'
  }

  const hAxis = queryInput.hAxis
  const workload = queryInput.workload || queryInput.databaseCompare?.workload
  const vars = queryInput.vars || queryInput.databaseCompare?.vars
  const yAxes = queryInput.yAxes || []

  if (
    hAxis?.databaseField === 'vars.horizontalScaling' ||
    vars?.experimentName === 'horizontalScaling'
  ) {
    if (vars?.api === 'ASYNC') {
      return { type: 'horizontalScaling', api: 'ASYNC' }
    }
    return 'horizontalScaling'
  }

  const systemAxis = yAxes.find(
    (axis) =>
      axis.type === 'metric' ||
      Boolean(getSystemMetricInfo(axis.metric)) ||
      Boolean(getSystemMetricInfo(axis.column))
  )
  if (systemAxis) {
    return {
      type: 'systemMetric',
      metric: systemAxis.metric || systemAxis.column || 'processCpu',
    }
  }

  const transactionOp = workload?.operations?.find((op) => Boolean(op.transaction?.ops))
  if (transactionOp) {
    const threads = vars?.horizontalScaling || 1
    const txOps = transactionOp.transaction?.ops
    const isReadonly =
      Array.isArray(txOps) &&
      txOps.length > 0 &&
      txOps.every(
        (innerOp) =>
          Boolean(innerOp) &&
          typeof innerOp === 'object' &&
          (innerOp as QueryIntentTransactionInnerOp).op === 'get'
      )
    return isReadonly ? { type: 'transaction', threads, readonly: true } : { type: 'transaction', threads }
  }

  if (vars?.api === 'ASYNC') {
    return 'reactiveAPI'
  }

  if (vars?.api === 'DEFAULT' && vars?.poolSize !== undefined) {
    return { type: 'reactiveAPI', api: 'DEFAULT' }
  }

  const firstWorkloadOp = workload?.operations?.[0]?.op
  if (firstWorkloadOp === 'replace' || firstWorkloadOp === 'insert') {
    return { type: 'kvOperation', operation: firstWorkloadOp }
  }

  const t = (title || '').toLowerCase()
  if (t.includes('transaction')) {
    const match = (title || '').match(/(\d+)\s*thread/i)
    const threads = match ? parseInt(match[1], 10) : 1
    const isReadonly = t.includes('readonly') || t.includes('read-only')
    return isReadonly ? { type: 'transaction', threads, readonly: true } : { type: 'transaction', threads }
  }
  if (t.includes('horizontal') || t.includes('scaling')) {
    if (t.includes('reactive')) {
      return { type: 'horizontalScaling', api: 'ASYNC' }
    }
    return 'horizontalScaling'
  }
  if (t.includes('reactive')) {
    return 'reactiveAPI'
  }
  if (t.includes('blocking api')) {
    return { type: 'reactiveAPI', api: 'DEFAULT' }
  }
  if (t.includes('cpu') || t.includes('memory') || t.includes('thread')) {
    const metric = t.includes('cpu')
      ? 'processCpu'
      : t.includes('memory')
        ? 'memHeapUsedMB'
        : 'threadCount'
    return { type: 'systemMetric', metric }
  }

  return 'kvOperation'
}


