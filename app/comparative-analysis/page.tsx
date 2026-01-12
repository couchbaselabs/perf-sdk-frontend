"use client"

import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import ComparativeAnalysisControls from "@/src/components/shared/comparative-analysis-controls"
import ComparativePerformanceChart from "@/src/components/shared/comparative-performance-chart"
import AppLayout from "@/src/components/layout/app-layout"

// Sample data for cluster versions
const AVAILABLE_CLUSTER_VERSIONS = [
  "7.1.1-3175-enterprise",
  "7.2.0-4127-enterprise",
  "7.6.0-9487-enterprise",
  "7.6.4-9634-enterprise",
]

// Sample data for SDK versions
const AVAILABLE_SDK_VERSIONS = [
  "3.0.0",
  "3.0.1",
  "3.0.2",
  "3.0.3",
  "3.0.4",
  "3.0.5",
  "3.0.6",
  "3.0.7",
  "3.0.8",
  "3.0.9",
]

// Generate sample data for comparative analysis
const generateSampleData = (
  selectedClusterVersions: string[],
  selectedSdkVersions: string[],
  baselineClusterVersion: string,
  baselineSdkVersion: string,
  operation: string,
) => {
  const data: any[] = []

  selectedSdkVersions.forEach((sdkVersion, sdkIndex) => {
    selectedClusterVersions.forEach((clusterVersion, clusterIndex) => {
      // Generate a base value that increases with SDK version
      let baseValue = 0
      const sdkVersionNum = Number.parseFloat(sdkVersion.replace("3.0.", "")) * 10

      if (operation === "KV Get") {
        baseValue = 100 + sdkVersionNum * 2
      } else if (operation === "KV Replace") {
        baseValue = 150 + sdkVersionNum * 3
      } else if (operation === "KV Insert") {
        baseValue = 180 + sdkVersionNum * 3.5
      } else {
        baseValue = 120 + sdkVersionNum * 2.5
      }

      // Adjust based on cluster version - newer clusters are faster
      const clusterVersionNum = Number.parseFloat(clusterVersion.split("-")[0].split(".").slice(0, 2).join("."))
      const clusterMultiplier = 1 - (clusterVersionNum - 7.1) * 0.1

      // Add some randomness
      const randomFactor = 0.9 + Math.random() * 0.2

      // Calculate final value
      const value = baseValue * clusterMultiplier * randomFactor

      // Determine if this is a baseline
      const isBaseline = sdkVersion === baselineSdkVersion && clusterVersion === baselineClusterVersion

      // Determine if this has a different cluster version than baseline
      const hasDifferentClusterVersion = clusterVersion !== baselineClusterVersion

      data.push({
        name: `${sdkVersion}`,
        sdkVersion,
        clusterVersion,
        value: Math.round(value * 100) / 100,
        isBaseline,
        hasDifferentClusterVersion,
        runCount: Math.floor(Math.random() * 5) + 1,
      })
    })
  })

  return data
}

export default function ComparativeAnalysisPage() {
  // State for selected versions and chart options
  const [selectedClusterVersions, setSelectedClusterVersions] = useState<string[]>([
    "7.1.1-3175-enterprise",
    "7.6.4-9634-enterprise",
  ])
  const [selectedSdkVersions, setSelectedSdkVersions] = useState<string[]>(["3.0.5", "3.0.7", "3.0.9"])
  const [baselineClusterVersion, setBaselineClusterVersion] = useState<string>("7.1.1-3175-enterprise")
  const [baselineSdkVersion, setBaselineSdkVersion] = useState<string>("3.0.5")
  const [normalizeData, setNormalizeData] = useState<boolean>(false)
  const [chartType, setChartType] = useState<"bar" | "grouped" | "stacked">("bar")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>("kv-operations")

  // State for chart data
  const [kvGetData, setKvGetData] = useState<any[]>([])
  const [kvReplaceData, setKvReplaceData] = useState<any[]>([])
  const [kvInsertData, setKvInsertData] = useState<any[]>([])
  const [throughputData, setThroughputData] = useState<any[]>([])
  const [errorRateData, setErrorRateData] = useState<any[]>([])

  // Memoize dependencies to prevent unnecessary re-renders
  const dependenciesKey = useMemo(() => {
    return JSON.stringify({
      selectedClusterVersions,
      selectedSdkVersions,
      baselineClusterVersion,
      baselineSdkVersion,
      normalizeData,
      chartType,
    })
  }, [selectedClusterVersions, selectedSdkVersions, baselineClusterVersion, baselineSdkVersion, normalizeData, chartType])

  // Load data when selections change
  useEffect(() => {
    loadData()
  }, [dependenciesKey]) // Use memoized key to prevent unnecessary re-renders

  // Function to load data
  const loadData = async () => {
    setIsLoading(true)

    // Simulate API call delay
    setTimeout(() => {
      // Generate sample data for each chart
      const kvGet = generateSampleData(
        selectedClusterVersions,
        selectedSdkVersions,
        baselineClusterVersion,
        baselineSdkVersion,
        "KV Get",
      )

      const kvReplace = generateSampleData(
        selectedClusterVersions,
        selectedSdkVersions,
        baselineClusterVersion,
        baselineSdkVersion,
        "KV Replace",
      )

      const kvInsert = generateSampleData(
        selectedClusterVersions,
        selectedSdkVersions,
        baselineClusterVersion,
        baselineSdkVersion,
        "KV Insert",
      )

      // Generate throughput data (operations per second)
      const throughput = selectedSdkVersions.flatMap((sdkVersion) => {
        return selectedClusterVersions.map((clusterVersion) => {
          const sdkVersionNum = Number.parseFloat(sdkVersion.replace("3.0.", "")) * 10
          const clusterVersionNum = Number.parseFloat(clusterVersion.split("-")[0].split(".").slice(0, 2).join("."))

          // Newer clusters and SDKs have higher throughput
          const baseValue = 5000 + sdkVersionNum * 100
          const clusterMultiplier = 1 + (clusterVersionNum - 7.1) * 0.2
          const randomFactor = 0.9 + Math.random() * 0.2

          const value = baseValue * clusterMultiplier * randomFactor

          return {
            name: `${sdkVersion}`,
            sdkVersion,
            clusterVersion,
            value: Math.round(value),
            isBaseline: sdkVersion === baselineSdkVersion && clusterVersion === baselineClusterVersion,
            hasDifferentClusterVersion: clusterVersion !== baselineClusterVersion,
            runCount: Math.floor(Math.random() * 5) + 1,
          }
        })
      })

      // Generate error rate data (percentage)
      const errorRate = selectedSdkVersions.flatMap((sdkVersion) => {
        return selectedClusterVersions.map((clusterVersion) => {
          const sdkVersionNum = Number.parseFloat(sdkVersion.replace("3.0.", "")) * 10
          const clusterVersionNum = Number.parseFloat(clusterVersion.split("-")[0].split(".").slice(0, 2).join("."))

          // Newer versions have lower error rates
          const baseValue = 2.5 - sdkVersionNum * 0.05
          const clusterMultiplier = 1 - (clusterVersionNum - 7.1) * 0.15
          const randomFactor = 0.8 + Math.random() * 0.4

          const value = Math.max(0.1, baseValue * clusterMultiplier * randomFactor)

          return {
            name: `${sdkVersion}`,
            sdkVersion,
            clusterVersion,
            value: Math.round(value * 100) / 100,
            isBaseline: sdkVersion === baselineSdkVersion && clusterVersion === baselineClusterVersion,
            hasDifferentClusterVersion: clusterVersion !== baselineClusterVersion,
            runCount: Math.floor(Math.random() * 5) + 1,
          }
        })
      })

      // Update state with the generated data
      setKvGetData(kvGet)
      setKvReplaceData(kvReplace)
      setKvInsertData(kvInsert)
      setThroughputData(throughput)
      setErrorRateData(errorRate)
      setIsLoading(false)
    }, 800)
  }

  // Handle refresh
  const handleRefresh = () => {
    loadData()
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Comparative Analysis</h1>
            <p className="text-muted-foreground mt-1">
              Compare performance metrics across different Couchbase cluster versions and SDK versions
            </p>
          </div>
        </div>

        {/* Controls for comparative analysis */}
        <ComparativeAnalysisControls
          onClusterVersionsChange={setSelectedClusterVersions}
          onSdkVersionsChange={setSelectedSdkVersions}
          onBaselineClusterChange={setBaselineClusterVersion}
          onBaselineSdkChange={setBaselineSdkVersion}
          onNormalizeDataChange={setNormalizeData}
          onChartTypeChange={setChartType}
          onRefresh={handleRefresh}
          selectedClusterVersions={selectedClusterVersions}
          selectedSdkVersions={selectedSdkVersions}
          baselineClusterVersion={baselineClusterVersion}
          baselineSdkVersion={baselineSdkVersion}
          normalizeData={normalizeData}
          chartType={chartType}
          availableClusterVersions={AVAILABLE_CLUSTER_VERSIONS}
          availableSdkVersions={AVAILABLE_SDK_VERSIONS}
          isLoading={isLoading}
        />

        {/* Tabs for different metric categories */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white dark:bg-slate-800 mb-6">
            <TabsTrigger value="kv-operations">KV Operations</TabsTrigger>
            <TabsTrigger value="throughput">Throughput</TabsTrigger>
            <TabsTrigger value="error-rates">Error Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="kv-operations" className="mt-0">
            <ComparativePerformanceChart
              title="KV Get"
              metric="duration_average_us"
              metricLabel="Average Duration"
              metricUnit="μs"
              data={kvGetData}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              chartType={chartType}
              normalizeData={normalizeData}
              baselineClusterVersion={baselineClusterVersion}
              baselineSdkVersion={baselineSdkVersion}
            />

            <ComparativePerformanceChart
              title="KV Replace"
              metric="duration_average_us"
              metricLabel="Average Duration"
              metricUnit="μs"
              data={kvReplaceData}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              chartType={chartType}
              normalizeData={normalizeData}
              baselineClusterVersion={baselineClusterVersion}
              baselineSdkVersion={baselineSdkVersion}
            />

            <ComparativePerformanceChart
              title="KV Insert"
              metric="duration_average_us"
              metricLabel="Average Duration"
              metricUnit="μs"
              data={kvInsertData}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              chartType={chartType}
              normalizeData={normalizeData}
              baselineClusterVersion={baselineClusterVersion}
              baselineSdkVersion={baselineSdkVersion}
            />
          </TabsContent>

          <TabsContent value="throughput">
            <ComparativePerformanceChart
              title="Operations Per Second"
              metric="ops_per_second"
              metricLabel="Operations"
              metricUnit="ops/sec"
              data={throughputData}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              chartType={chartType}
              normalizeData={normalizeData}
              baselineClusterVersion={baselineClusterVersion}
              baselineSdkVersion={baselineSdkVersion}
            />
          </TabsContent>

          <TabsContent value="error-rates">
            <ComparativePerformanceChart
              title="Error Rate"
              metric="error_rate"
              metricLabel="Error Rate"
              metricUnit="%"
              data={errorRateData}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              chartType={chartType}
              normalizeData={normalizeData}
              baselineClusterVersion={baselineClusterVersion}
              baselineSdkVersion={baselineSdkVersion}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
