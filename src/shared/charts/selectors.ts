// Chart data transformation and selection utilities
// Centralized logic for all chart components

export type ChartDataPoint = {
  name: string
  value: number
  runCount: number
  runIds: string[]
  sdkVersion: string
  sdkName: string
  sdkColor: string
  clusterVersion: string
  clusterName: string
  clusterColor: string
  color: string
  runId: string
  datetime: string
  originalVersion: string
  totalRuns: number
  completedRuns: number
  failedRuns: number
}

export type MetricValue = {
  avg: number
  min: number
  max: number
  p50: number
  p95: number
  p99: number
}

export type RunMetrics = {
  throughput: number
  latency: MetricValue
  operations: {
    total: number
    success: number
    failed: number
  }
  memHeapUsedMB: number
  threadCount: number
  processCpu: number
}

// Version sorting utility
export function sortVersions(data: ChartDataPoint[]): ChartDataPoint[] {
  return data.sort((a, b) => {
    const versionA = a.originalVersion || a.name
    const versionB = b.originalVersion || b.name
    
    // Parse version components
    const parseVersion = (version: string) => {
      const isSnapshot = version.includes('-')
      let baseVersion = version
      let timestamp = ''
      
      if (isSnapshot) {
        const parts = version.split('-')
        baseVersion = parts[0]
        timestamp = parts[1] // The timestamp part
      }
      
      // Parse semantic version (e.g., "3.0.7" -> [3, 0, 7])
      const versionParts = baseVersion.split('.').map(Number)
      
      return {
        major: versionParts[0] || 0,
        minor: versionParts[1] || 0,
        patch: versionParts[2] || 0,
        isSnapshot,
        timestamp,
        original: version
      }
    }
    
    const parsedA = parseVersion(versionA)
    const parsedB = parseVersion(versionB)
    
    // First sort by semantic version
    if (parsedA.major !== parsedB.major) return parsedA.major - parsedB.major
    if (parsedA.minor !== parsedB.minor) return parsedA.minor - parsedB.minor
    if (parsedA.patch !== parsedB.patch) return parsedA.patch - parsedB.patch
    
    // For same base version, stable comes before snapshots
    if (parsedA.isSnapshot !== parsedB.isSnapshot) {
      return parsedA.isSnapshot ? 1 : -1
    }
    
    // For snapshots of same base version, sort by timestamp
    if (parsedA.isSnapshot && parsedB.isSnapshot) {
      return parsedA.timestamp.localeCompare(parsedB.timestamp)
    }
    
    return 0
  })
}

// Metric value extraction
export function calculateMetricValue(
  run: { metrics: RunMetrics },
  selectedMetric: string,
): number {
  switch (selectedMetric) {
    case 'duration_average_us':
      return run.metrics.latency.avg
    case 'duration_min_us':
      return run.metrics.latency.min
    case 'duration_max_us':
      return run.metrics.latency.max
    case 'duration_p50_us':
      return run.metrics.latency.p50
    case 'duration_p95_us':
      return run.metrics.latency.p95
    case 'duration_p99_us':
      return run.metrics.latency.p99
    case 'operations_total':
      return run.metrics.operations.total
    case 'operations_success':
      return run.metrics.operations.success
    case 'operations_failed':
      return run.metrics.operations.failed
    default:
      return run.metrics.latency.avg
  }
}

// Chart data aggregation
/**
 * Specialized aggregation for home dashboard with operations support
 */
export function aggregateHomeChartData(
  runs: any[],
  clusterVersions: string[],
  currentSdk: string,
  selectedMetric: string,
  allVersions: string[],
  operations: any[],
  getSdkVersionById: (id: string) => any
): Record<string, any[]> {
  const allData: Record<string, any[]> = {}
  
  // Initialize data structure for all operations
  operations.forEach((operation) => {
    allData[operation.id] = []
  })

  clusterVersions.forEach((clusterVersion) => {
    const clusterRuns = runs.filter(run => 
      run.params.cluster?.version === clusterVersion &&
      (run.params.impl?.language?.toLowerCase?.() || run.sdk?.toLowerCase?.())?.includes(currentSdk.toLowerCase())
    )

    operations.forEach((operation) => {
      const runsByVersion = clusterRuns.reduce((acc, run) => {
        const version = run.params.impl?.version || 'Unknown'
        if (!acc[version]) {
          acc[version] = []
        }
        acc[version].push(run)
        return acc
      }, {} as Record<string, typeof clusterRuns>)

      Object.entries(runsByVersion).forEach(([version, versionRuns]) => {
        const typedVersionRuns = versionRuns as any[]
        if (typedVersionRuns.length === 0) return

        const sdkInfo = getSdkVersionById(currentSdk)
        const versionIndex = allVersions.indexOf(version)
        
        // Calculate average metrics across all runs for this version
        const avgMetrics = typedVersionRuns.reduce((sum: number, run: any) => {
          const metricValue = calculateMetricValue(run, selectedMetric)
          return sum + metricValue
        }, 0)

        const avgValue = avgMetrics / typedVersionRuns.length
        const mostRecentRun = typedVersionRuns.sort((a: any, b: any) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())[0]
        const runIds = typedVersionRuns.map((r: any) => r.id)

        const dataPoint = {
          name: version,
          value: Math.round(avgValue * 100) / 100,
          runCount: typedVersionRuns.length,
          runIds,
          sdkVersion: currentSdk,
          sdkName: sdkInfo?.name || currentSdk,
          sdkColor: sdkInfo?.color || "rgb(100, 100, 100)",
          runId: mostRecentRun.id,
          datetime: mostRecentRun.datetime,
          originalVersion: version,
          clusterVersion,
          versionOrder: versionIndex !== -1 ? versionIndex : 999,
          operationId: operation.id,
          metric: selectedMetric
        }

        allData[operation.id].push(dataPoint)
      })
    })
  })

  // Sort each operation's data by version order
  Object.keys(allData).forEach(operationId => {
    allData[operationId] = sortVersions(allData[operationId])
  })

  return allData
}

export function aggregateChartData(
  runs: any[],
  clusterVersions: string[],
  currentSdk: string,
  selectedMetric: string,
  allVersions: string[],
  getSdkVersionById: (id: string) => any,
  getClusterVersionById: (id: string) => any
): Record<string, ChartDataPoint[]> {
  const allData: Record<string, ChartDataPoint[]> = {}
  
  clusterVersions.forEach((clusterVersion) => {
    // Filter runs for this specific cluster version
    const clusterRuns = runs.filter(run => 
      run.params.cluster?.version === clusterVersion &&
      (run.params.impl?.language?.toLowerCase?.() || run.sdk?.toLowerCase?.())?.includes(currentSdk.toLowerCase())
    )

    // Group runs by version
    const runsByVersion = clusterRuns.reduce((acc, run) => {
      const version = run.params.impl?.version || 'Unknown'
      if (!acc[version]) {
        acc[version] = []
      }
      acc[version].push(run)
      return acc
    }, {} as Record<string, typeof clusterRuns>)

    Object.entries(runsByVersion).forEach(([version, versionRuns]) => {
      const typedVersionRuns = versionRuns as any[]
      if (typedVersionRuns.length === 0) return

      const sdkInfo = getSdkVersionById(currentSdk)
      const clusterInfo = getClusterVersionById(clusterVersion)
      
      // Calculate average metrics across all runs for this version
      const avgMetrics = typedVersionRuns.reduce((sum: number, run: any) => {
        const metricValue = calculateMetricValue(run, selectedMetric)
        return sum + metricValue
      }, 0)

      const avgValue = avgMetrics / typedVersionRuns.length
      const mostRecentRun = typedVersionRuns.sort((a: any, b: any) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())[0]
      const runIds = typedVersionRuns.map((r: any) => r.id)

      const dataPoint: ChartDataPoint = {
        name: version,
        value: Math.round(avgValue * 100) / 100,
        runCount: typedVersionRuns.length,
        runIds,
        sdkVersion: currentSdk,
        sdkName: sdkInfo?.name || currentSdk,
        sdkColor: sdkInfo?.color || "rgb(100, 100, 100)",
        clusterVersion: clusterVersion,
        clusterName: clusterInfo?.name || clusterVersion,
        clusterColor: clusterInfo?.color || "rgb(100, 100, 100)",
        color: clusterInfo?.color || "rgb(100, 100, 100)",
        runId: mostRecentRun.id,
        datetime: mostRecentRun.datetime,
        originalVersion: version,
        totalRuns: typedVersionRuns.length,
        completedRuns: typedVersionRuns.filter((r: any) => r.status === 'completed').length,
        failedRuns: typedVersionRuns.filter((r: any) => r.status === 'failed').length
      }

      if (!allData[clusterVersion]) {
        allData[clusterVersion] = []
      }
      allData[clusterVersion].push(dataPoint)
    })
  })

  // Sort all chart data by version
  Object.keys(allData).forEach(operationId => {
    allData[operationId] = sortVersions(allData[operationId])
  })

  return allData
}
