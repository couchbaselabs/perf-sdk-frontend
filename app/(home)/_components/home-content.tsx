"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from "next/navigation"
import AppLayout from "@/src/components/layout/app-layout"
import { getSdkVersionById } from "@/src/lib/sdk-version-service"
import { DEFAULT_CLUSTERS } from '@/src/lib/config/defaults'
import { useRefreshHandler } from '@/src/shared/hooks/use-common-handlers'
import { logger } from '@/src/lib/utils/logger'
import { apiClient } from '@/src/lib/api-client-unified'

// Import centralized constants
import {
  CORE_OPERATIONS,
  SCALING_OPERATIONS,
  SYSTEM_METRICS,
  TRANSACTION_OPERATIONS,
  API_COMPARISON_OPERATIONS,
  ALL_OPERATIONS,
  AVAILABLE_METRICS
} from '@/src/lib/config/constants'

// Import shared chart utilities
import { sortVersions, calculateMetricValue, aggregateHomeChartData } from '@/src/shared/charts'

// Import new sections
import { HeaderSection } from './sections/HeaderSection'
import { FiltersSection } from './sections/FiltersSection'
import { TabsSection } from './sections/TabsSection'

interface HomeContentProps {
  initialData: {
    availableMetrics: string[]
    availableVersions: string[]
    clusterVersions: any[]
    sdkVersions: any[]
    defaultClusters: string[]
  }
}

export default function HomeContent({ initialData }: HomeContentProps) {
  const searchParams = useSearchParams()
  
  const [activeTab, setActiveTab] = useState("classic")
  const [excludeSnapshots, setExcludeSnapshots] = useState(true)
  const [selectedClusterVersions, setSelectedClusterVersions] = useState<string[]>([...DEFAULT_CLUSTERS])
  const [visibleOperations, setVisibleOperations] = useState<string[]>(CORE_OPERATIONS.slice(0, 3).map((op) => op.id))
  const [visibleScaling, setVisibleScaling] = useState<string[]>(SCALING_OPERATIONS.map((op) => op.id))
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(SYSTEM_METRICS.map((op) => op.id))
  const [visibleTransactions, setVisibleTransactions] = useState<string[]>(TRANSACTION_OPERATIONS.map((op) => op.id))
  const [visibleApiComparisons, setVisibleApiComparisons] = useState<string[]>(API_COMPARISON_OPERATIONS.map((op) => op.id))
  const [selectedMetric, setSelectedMetric] = useState("duration_average_us")
  const [currentSdk, setCurrentSdk] = useState<string>(() => {
    const urlSdk = searchParams?.get('sdk')
    return urlSdk || "java"
  })

  // Derived from queries
  const [allVersions, setAllVersions] = useState<string[]>([])
  const [allClusters, setAllClusters] = useState<string[]>(['7.1.1-3175-enterprise'])
  const [reloadTrigger, setReloadTrigger] = useState(0)

  // Load versions and clusters with React Query
  const includeSnapshots = !excludeSnapshots
  const versionsQuery = useQuery({
    queryKey: ['versions', includeSnapshots],
    queryFn: async () => apiClient.getVersions(includeSnapshots),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  })
  const clustersQuery = useQuery({
    queryKey: ['clusters'],
    queryFn: async () => apiClient.getClusters(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  // Runs query (refetch every time the page becomes active)
  const runsQuery = useQuery({
    queryKey: ['runs', currentSdk, excludeSnapshots],
    queryFn: async () => {
      const url = `/api/performance/runs?sdk=${currentSdk}&limit=200&excludeSnapshots=${excludeSnapshots}&excludeGerrit=true`
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) throw new Error(`API call failed: ${response.status} ${response.statusText}`)
      const data = await response.json()
      const transformedData: any[] = data.map((run: any) => ({
        id: run.id,
        datetime: run.datetime,
        status: run.status || 'completed',
        params: run.params || {},
        language: run.language || run.sdk,
        version: run.version,
        sdk: run.sdk || run.language,
        clusterVersion: run.clusterVersion,
        workload: run.workload || 'default',
        duration: run.duration || 0,
        metrics: run.metrics || {
          throughput: 0,
          latency: { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 },
          operations: { total: 0, success: 0, failed: 0 },
          memHeapUsedMB: 0,
          threadCount: 0,
          processCpu: 0
        }
      }))
      return transformedData
    },
    placeholderData: (previousData) => previousData as any[] | undefined,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  useEffect(() => {
    if (versionsQuery.data?.success) {
      setAllVersions(versionsQuery.data.data)
      logger.debug('Loaded versions:', { count: versionsQuery.data.data.length, includeSnapshots })
    }
  }, [versionsQuery.data, includeSnapshots])

  useEffect(() => {
    if (clustersQuery.data?.success) {
      setAllClusters(clustersQuery.data.data)
      logger.debug('Loaded clusters:', { count: clustersQuery.data.data.length })
      if (!selectedClusterVersions || selectedClusterVersions.length === 0) {
        const defaults = DEFAULT_CLUSTERS.filter((c) => clustersQuery.data!.data.includes(c))
        if (defaults.length > 0) {
          setSelectedClusterVersions(defaults)
        }
      }
    }
  }, [clustersQuery.data])

  // SDK change logging
  useEffect(() => {
    logger.debug('SDK state changed:', { currentSdk })
  }, [currentSdk])

  const isLoading = runsQuery.isLoading
  const runsData = (runsQuery.data as any[]) || []

  // Listen for URL parameter changes  
  useEffect(() => {
    const urlSdk = searchParams?.get('sdk')
    if (urlSdk && urlSdk !== currentSdk) {
      logger.debug('SDK from URL parameter:', { urlSdk })
      setCurrentSdk(urlSdk)
    }
  }, [searchParams?.get('sdk'), currentSdk])

  // Listen for SDK changes from AppLayout
  useEffect(() => {
    const handleSdkChange = (event: CustomEvent<string>) => {
      const newSdk = event.detail
      logger.debug('SDK changed via event:', { newSdk })
      setCurrentSdk(newSdk)
      setReloadTrigger(prev => prev + 1)
    }

    window.addEventListener('sdkChange', handleSdkChange as EventListener)
    return () => {
      window.removeEventListener('sdkChange', handleSdkChange as EventListener)
    }
  }, [])

  // Filtered runs
  const filteredRuns = useMemo(() => {
    if (isLoading || !runsData || (runsData as any[]).length === 0) {
      return []
    }
    
    let relevantRuns = (runsData as any[]).filter((run: any) => {
      const clusterVersion = run.params?.cluster?.version || ''
      const statusMatch = run.status === 'completed'
      const clusterMatch = selectedClusterVersions.length === 0 || selectedClusterVersions.includes(clusterVersion)
      const version: string = run.params?.impl?.version || ''
      const isGerrit = version.startsWith('refs/')
      return clusterMatch && statusMatch && !isGerrit
    })

    if (excludeSnapshots) {
      relevantRuns = relevantRuns.filter(run => 
        !run.params.impl?.version?.includes('-')
      )
    }

    return relevantRuns
  }, [runsData, selectedClusterVersions, excludeSnapshots, isLoading])

  // Chart data using shared utilities
  const chartData = useMemo(() => {
    return aggregateHomeChartData(
      filteredRuns,
      selectedClusterVersions,
      currentSdk,
      selectedMetric,
      allVersions,
      [...ALL_OPERATIONS],
      getSdkVersionById
    )
  }, [filteredRuns, selectedClusterVersions, currentSdk, selectedMetric, allVersions])

  // Event handlers
  const handleExcludeSnapshotsChange = (checked: boolean) => setExcludeSnapshots(checked)
  const { handleRefresh } = useRefreshHandler(() => setReloadTrigger(prev => prev + 1))
  const handleClusterVersionsChange = useCallback((versions: string[]) => setSelectedClusterVersions(versions), [])

  const toggleOperation = useCallback((operationId: string) => {
    if (visibleOperations.includes(operationId)) {
      setVisibleOperations(visibleOperations.filter((id) => id !== operationId))
    } else {
      setVisibleOperations([...visibleOperations, operationId])
    }
  }, [visibleOperations])

  const toggleScaling = useCallback((operationId: string) => {
    if (visibleScaling.includes(operationId)) {
      setVisibleScaling(visibleScaling.filter((id) => id !== operationId))
    } else {
      setVisibleScaling([...visibleScaling, operationId])
    }
  }, [visibleScaling])

  const toggleMetric = useCallback((operationId: string) => {
    if (visibleMetrics.includes(operationId)) {
      setVisibleMetrics(visibleMetrics.filter((id) => id !== operationId))
    } else {
      setVisibleMetrics([...visibleMetrics, operationId])
    }
  }, [visibleMetrics])

  const toggleTransaction = useCallback((operationId: string) => {
    if (visibleTransactions.includes(operationId)) {
      setVisibleTransactions(visibleTransactions.filter((id) => id !== operationId))
    } else {
      setVisibleTransactions([...visibleTransactions, operationId])
    }
  }, [visibleTransactions])

  const toggleApiComparison = useCallback((operationId: string) => {
    if (visibleApiComparisons.includes(operationId)) {
      setVisibleApiComparisons(visibleApiComparisons.filter((id) => id !== operationId))
    } else {
      setVisibleApiComparisons([...visibleApiComparisons, operationId])
    }
  }, [visibleApiComparisons])

  const generateTitle = useCallback(() => {
    const sdkInfo = getSdkVersionById(currentSdk)
    const clusterCount = selectedClusterVersions.length

    if (clusterCount === 1) {
      return `${sdkInfo?.name || "SDK"} Performance: Cluster ${selectedClusterVersions[0]}`
    } else {
      return `${sdkInfo?.name || "SDK"} Performance: Multiple Clusters`
    }
  }, [currentSdk, selectedClusterVersions])

  const exportAllData = useCallback(() => {
    if (!chartData) return

    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "Category,Operation,SDK,SDK Version,Cluster Version,Metric,Value,Run Count,Run ID,DateTime\n"

    const allOperations = [
      ...CORE_OPERATIONS.map(op => ({ ...op, category: 'Core Operations' })),
      ...SCALING_OPERATIONS.map(op => ({ ...op, category: 'Horizontal Scaling' })),
      ...SYSTEM_METRICS.map(op => ({ ...op, category: 'System Metrics' })),
      ...TRANSACTION_OPERATIONS.map(op => ({ ...op, category: 'Transactions' })),
      ...API_COMPARISON_OPERATIONS.map(op => ({ ...op, category: 'API Comparisons' }))
    ]

    Object.entries(chartData).forEach(([operationId, data]) => {
      const operation = allOperations.find((op) => op.id === operationId)
      const sdkInfo = getSdkVersionById(currentSdk)
      const selectedMetricInfo = AVAILABLE_METRICS.find(m => m.id === selectedMetric)

      data.forEach((item) => {
        csvContent += `${operation?.category || 'Unknown'},${operation?.title || operationId},${sdkInfo?.name || currentSdk},${item.name},${item.clusterName || 'Unknown'},${selectedMetricInfo?.label || selectedMetric},${item.value},${item.runCount},${item.runId},${item.datetime}\n`
      })
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "comprehensive_performance_data.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [chartData, currentSdk, selectedMetric])

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-6 max-w-7xl overflow-x-hidden">
        {/* Use the new HeaderSection */}
        <HeaderSection 
          title={generateTitle()}
          onRefresh={handleRefresh}
          onExport={exportAllData}
        />

        {/* Use the new FiltersSection */}
        <FiltersSection
          selectedClusterVersions={selectedClusterVersions}
          onClusterVersionsChange={handleClusterVersionsChange}
          excludeSnapshots={excludeSnapshots}
          onExcludeSnapshotsChange={handleExcludeSnapshotsChange}
        />

        {/* Use the new TabsSection */}
        <TabsSection
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
          currentSdk={currentSdk}
          excludeSnapshots={excludeSnapshots}
          reloadTrigger={reloadTrigger}
          visibleOperations={visibleOperations}
          toggleOperation={toggleOperation}
          visibleScaling={visibleScaling}
          toggleScaling={toggleScaling}
          visibleMetrics={visibleMetrics}
          toggleMetric={toggleMetric}
          visibleTransactions={visibleTransactions}
          toggleTransaction={toggleTransaction}
          visibleApiComparisons={visibleApiComparisons}
          toggleApiComparison={toggleApiComparison}
        />
      </div>
    </AppLayout>
  )
}