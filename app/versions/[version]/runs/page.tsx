"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, RefreshCw, ExternalLink, ArrowUpDown, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu"
import { Skeleton } from "@/src/components/ui/skeleton"
import AppLayout from "@/src/components/layout/app-layout"
import { RunSummary } from "@/src/types"
import { AVAILABLE_METRICS } from "@/src/lib/config/constants"

// Extended RunSummary to include metric value for table display
interface ExtendedRunSummary extends RunSummary {
  metricValue?: number | null
}
import { formatDate } from "@/src/lib/utils/formatting"
import VersionRunsHeader from "@/src/components/shared/version-runs/version-runs-header"
import VersionRunsTable from "@/src/components/shared/version-runs/version-runs-table"
import { apiClient } from "@/src/lib/api-client-unified"
import { useRefreshHandler, useSortHandler } from "@/src/shared/hooks/use-common-handlers"

// Available metrics for dropdown imported from centralized constants

export default function VersionRunsPage({ params }: { params: { version: string } }) {
  const resolvedParams = params
  const router = useRouter()
  const searchParams = useSearchParams()
  const metric = searchParams.get("metric") || "duration_average_us"
  const sdk = searchParams.get("sdk") || "kotlin"
  const clusterVersion = searchParams.get("cluster") || ""
  const runIdsParam = searchParams.get("runIds") || ""
  const decodedVersion = decodeURIComponent(resolvedParams.version)
  
  // CRITICAL FIX: Extract query type parameters
  const horizontalScaling = searchParams.get("horizontalScaling")
  const systemMetric = searchParams.get("systemMetric")
  const transactionThreads = searchParams.get("transactionThreads")
  const reactiveAPI = searchParams.get("reactiveAPI")

  const [isLoading, setIsLoading] = useState(true)
  const [allRuns, setAllRuns] = useState<ExtendedRunSummary[]>([])
  const [dashboardData, setDashboardData] = useState<any>(null)

  // CRITICAL FIX: Determine correct metric unit based on query type AND selected metric
  const getMetricInfo = () => {
    // For system metric queries, check what specific metric is selected
    if (systemMetric) {
      // Check if user selected a duration metric within system metric context
      const durationMetric = AVAILABLE_METRICS.find(m => m.id === metric)
      if (durationMetric) {
        return durationMetric // Use the selected duration metric
      }
      
      // Otherwise use the system metric type
      switch (systemMetric) {
        case 'processCpu':
        case 'systemCpu':
          return { label: `${systemMetric === 'processCpu' ? 'Process' : 'System'} CPU`, unit: '%' }
        case 'memHeapUsedMB':
        case 'memHeapMaxMB':
        case 'memDirectUsedMB':
        case 'memDirectMaxMB':
          return { label: 'Memory', unit: 'MB' }
        case 'threadCount':
          return { label: 'Thread Count', unit: '' }
      }
    }
    
    // Transaction metrics  
    if (transactionThreads) {
      // Check if user selected a specific metric within transaction context
      const selectedMetric = AVAILABLE_METRICS.find(m => m.id === metric)
      return selectedMetric || { label: 'Total Operations', unit: 'ops' }
    }
    
    // Horizontal scaling and other metrics use duration
    return AVAILABLE_METRICS.find(m => m.id === metric) || { label: metric, unit: 'μs' }
  }

  const metricInfo = getMetricInfo()

  // Extract loadRuns function to be reusable
  const loadRuns = async () => {
    setIsLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      params.set('sdk', sdk)
      params.set('metric', metric)
      if (runIdsParam) {
        params.set('runIds', runIdsParam)
      }
      
      // CRITICAL FIX: Pass query type context to API
      if (horizontalScaling) {
        params.set('horizontalScaling', horizontalScaling)
      }
      if (systemMetric) {
        params.set('systemMetric', systemMetric)
      }
      if (transactionThreads) {
        params.set('transactionThreads', transactionThreads)
      }
      if (reactiveAPI) {
        params.set('reactiveAPI', reactiveAPI)
      }
      
      // Use the unified API that ensures chart/table consistency
      const response = await fetch(`/api/runs/version/${encodeURIComponent(decodedVersion)}?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch runs from unified API')
      }
      
      const result = await response.json()
      
      // Store the aggregated value for consistency checking
      setDashboardData({
        aggregatedValue: result.aggregatedValue,
        version: result.version,
        metric: result.metric
      })
      
      // Transform to ExtendedRunSummary format
      const summaries: ExtendedRunSummary[] = result.runs.map((run: any) => ({
        id: run.id,
        datetime: run.datetime,
        status: (run.status || 'completed') as 'completed' | 'running' | 'failed' | 'pending',
        params: run.params,
        language: run.language,
        version: run.version,
        sdk: run.sdk,
        clusterVersion: run.clusterVersion,
        workload: run.workload,
        duration: 0, // Not used in table display
        metricValue: run.metricValue, // Add the metric value from the API
        metrics: {
          throughput: 0,
          latency: { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 },
          operations: { total: 0, success: 0, failed: 0 }
        }
      }))
      
      setAllRuns(summaries)
      
      console.log(`✅ Loaded ${summaries.length} runs for version ${decodedVersion}`, {
        aggregatedValue: result.aggregatedValue,
        metric: result.metric,
        firstRun: summaries[0]?.id
      })
      
    } catch (error) {
      console.error('❌ Error loading runs:', error)
      setAllRuns([])
      setDashboardData(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Load runs using the unified API to ensure consistency with chart data
  useEffect(() => {
    loadRuns()
  }, [sdk, decodedVersion, runIdsParam, metric, horizontalScaling, systemMetric, transactionThreads, reactiveAPI])

  // Filter runs for this specific version and cluster
  const versionRuns = useMemo(() => {
    if (runIdsParam) return allRuns
    return allRuns.filter((run: ExtendedRunSummary) => 
      run.params?.impl?.version === decodedVersion &&
      (!clusterVersion || run.params?.cluster?.version === clusterVersion)
    )
  }, [allRuns, decodedVersion, clusterVersion, runIdsParam])

  useEffect(() => {
    // No longer need this simulation since we have real async loading
  }, [decodedVersion, metric, sdk, clusterVersion])

  const { handleRefresh } = useRefreshHandler(() => {
    // CRITICAL FIX: Actually refetch data instead of using fake timeout
    console.log('🔄 Refreshing runs data for version:', decodedVersion)
    loadRuns()
  })

  const { handleSort, sortColumn, sortDirection } = useSortHandler("datetime", "desc")

  const sortedRuns = [...versionRuns].sort((a, b) => {
    let comparison = 0

    if (sortColumn === "datetime") {
      comparison = new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    } else if ((sortColumn as string) === "duration") {
      comparison = (a.duration || 0) - (b.duration || 0)
    } else if ((sortColumn as string) === "metricValue") {
      comparison = (a.metricValue || 0) - (b.metricValue || 0)
    } else if ((sortColumn as string) === "id") {
      comparison = a.id.localeCompare(b.id)
    } else {
      comparison = 0
    }

    return sortDirection === "asc" ? comparison : -comparison
  })


  // Metric values are now fetched from the API and displayed in the table
  // This ensures consistency with chart aggregated values

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-6 max-w-7xl">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <VersionRunsHeader
          version={decodedVersion}
          runIdsParam={runIdsParam || undefined}
          clusterVersion={clusterVersion || undefined}
          sdk={sdk || undefined}
          metricInfo={metricInfo}
          availableMetrics={AVAILABLE_METRICS}
          currentMetric={metric}
          onSelectMetric={(metricId) => {
            const params = new URLSearchParams(searchParams.toString())
            params.set('metric', metricId)
            router.push(`/versions/${resolvedParams.version}/runs?${params.toString()}`)
          }}
          onRefresh={handleRefresh}
          dashboardAggregatedValue={dashboardData?.aggregatedValue}
          horizontalScaling={horizontalScaling}
          systemMetric={systemMetric}
          transactionThreads={transactionThreads}
          reactiveAPI={reactiveAPI}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Run Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Individual run metadata
              {dashboardData?.aggregatedValue && (
                <span className="block mt-1 text-blue-600 font-medium">
                  These runs aggregate to: {dashboardData.aggregatedValue.toFixed(2)} {metricInfo.unit}
                </span>
              )}
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <VersionRunsTable
                runs={sortedRuns as any}
                metricLabel={metricInfo.label}
                metricUnit={metricInfo.unit}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort as any}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

