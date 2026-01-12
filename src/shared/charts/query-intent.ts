export type QueryType = 'kvOperation' | 'horizontalScaling' | 'reactiveAPI' | { type: 'systemMetric', metric: string } | { type: 'transaction', threads: number }

export function getQueryTypeFromInput(queryInput: any, title?: string): QueryType {
  if (!queryInput) {
    return 'kvOperation'
  }

  const workload = queryInput.workload || queryInput.databaseCompare?.workload
  const vars = queryInput.vars || queryInput.databaseCompare?.vars
  const yAxes = queryInput.yAxes || []

  if (vars?.horizontalScaling && vars?.experimentName === 'horizontalScaling') {
    return 'horizontalScaling'
  }

  const hasSystemMetric = yAxes.some((axis: any) =>
    axis.column === 'processCpu' ||
    axis.column === 'memHeapUsedMB' ||
    axis.column === 'threadCount'
  )
  if (hasSystemMetric) {
    const systemMetricColumn = yAxes.find((axis: any) =>
      axis.column === 'processCpu' ||
      axis.column === 'memHeapUsedMB' ||
      axis.column === 'threadCount'
    )?.column
    return { type: 'systemMetric', metric: systemMetricColumn || 'processCpu' }
  }

  const hasTransactionWorkload = workload?.operations?.some((op: any) => op.transaction?.ops)
  const hasOperationsTotal = yAxes.some((axis: any) => axis.column === 'operations_total')
  if (hasTransactionWorkload || hasOperationsTotal) {
    const threads = vars?.horizontalScaling || 1
    return { type: 'transaction', threads }
  }

  if (vars?.api === 'ASYNC') {
    return 'reactiveAPI'
  }

  // Fallbacks using title
  const t = (title || '').toLowerCase()
  if (t.includes('transaction')) {
    const match = (title || '').match(/(\d+)\s*thread/i)
    const threads = match ? parseInt(match[1]) : 1
    return { type: 'transaction', threads }
  }
  if (t.includes('horizontal') || t.includes('scaling')) {
    return 'horizontalScaling'
  }
  if (t.includes('cpu') || t.includes('memory') || t.includes('thread')) {
    const metric = t.includes('cpu') ? 'processCpu' : (t.includes('memory') ? 'memHeapUsedMB' : 'threadCount')
    return { type: 'systemMetric', metric }
  }

  return 'kvOperation'
}


