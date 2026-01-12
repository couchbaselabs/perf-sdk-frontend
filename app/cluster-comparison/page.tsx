"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import PerformanceBarChart from "@/src/components/shared/performance-bar-chart"
import AppLayout from "@/src/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert"
import { InfoIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"

// Removed sample data; we derive charts from real runs on the main dashboard.

// More comprehensive sample data with multiple SDK versions across different cluster versions
const COMPREHENSIVE_SAMPLE_DATA = {
  kvGet: [
    // SDK 3.0.5 across different cluster versions
    { name: "3.0.5", value: 105.23, runCount: 3, clusterVersion: "7.1.1-3175-enterprise", isBaseline: true },
    {
      name: "3.0.5",
      value: 98.76,
      runCount: 2,
      clusterVersion: "7.6.0-9487-enterprise",
      hasDifferentClusterVersion: true,
    },
    {
      name: "3.0.5",
      value: 92.45,
      runCount: 4,
      clusterVersion: "7.6.4-9634-enterprise",
      hasDifferentClusterVersion: true,
    },

    // SDK 3.0.6 across different cluster versions
    { name: "3.0.6", value: 102.78, runCount: 4, clusterVersion: "7.1.1-3175-enterprise" },
    {
      name: "3.0.6",
      value: 96.32,
      runCount: 3,
      clusterVersion: "7.6.0-9487-enterprise",
      hasDifferentClusterVersion: true,
    },
    {
      name: "3.0.6",
      value: 90.18,
      runCount: 5,
      clusterVersion: "7.6.4-9634-enterprise",
      hasDifferentClusterVersion: true,
    },

    // SDK 3.0.7 across different cluster versions
    { name: "3.0.7", value: 98.45, runCount: 2, clusterVersion: "7.1.1-3175-enterprise" },
    {
      name: "3.0.7",
      value: 93.21,
      runCount: 3,
      clusterVersion: "7.6.0-9487-enterprise",
      hasDifferentClusterVersion: true,
    },
    {
      name: "3.0.7",
      value: 87.65,
      runCount: 4,
      clusterVersion: "7.6.4-9634-enterprise",
      hasDifferentClusterVersion: true,
    },
  ],
}

// Sample data for a single SDK version across multiple cluster versions
const SINGLE_SDK_MULTI_CLUSTER = {
  kvGet: [
    {
      name: "7.1.1",
      value: 105.23,
      runCount: 3,
      clusterVersion: "7.1.1-3175-enterprise",
      isBaseline: true,
      sdkVersion: "3.0.7",
    },
    {
      name: "7.2.0",
      value: 102.78,
      runCount: 4,
      clusterVersion: "7.2.0-4127-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
    },
    {
      name: "7.6.0",
      value: 98.45,
      runCount: 2,
      clusterVersion: "7.6.0-9487-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
    },
    {
      name: "7.6.4",
      value: 95.32,
      runCount: 5,
      clusterVersion: "7.6.4-9634-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
    },
  ],
  kvReplace: [
    {
      name: "7.1.1",
      value: 157.89,
      runCount: 3,
      clusterVersion: "7.1.1-3175-enterprise",
      isBaseline: true,
      sdkVersion: "3.0.7",
    },
    {
      name: "7.2.0",
      value: 153.42,
      runCount: 4,
      clusterVersion: "7.2.0-4127-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
    },
    {
      name: "7.6.0",
      value: 149.76,
      runCount: 2,
      clusterVersion: "7.6.0-9487-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
    },
    {
      name: "7.6.4",
      value: 142.18,
      runCount: 5,
      clusterVersion: "7.6.4-9634-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
    },
  ],
}

export default function ClusterComparisonPage() {
  const [activeTab, setActiveTab] = useState("standard")
  const [selectedView, setSelectedView] = useState("standard")
  const [isLoading, setIsLoading] = useState(false)

  // Handle view change
  const handleViewChange = (value: string) => {
    setSelectedView(value)
  }

  // This page now serves as a shell; charts on the main dashboard use real data
  const currentData = { kvGet: [], kvReplace: [], kvInsert: [], throughput: [], errorRate: [], memoryUsage: [] } as any

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cluster Version Comparison</h1>
            <p className="text-muted-foreground mt-1">
              Performance metrics across different Couchbase cluster versions
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>About This Demo</CardTitle>
            <CardDescription>
              This page demonstrates how the performance charts visually differentiate between different Couchbase
              cluster versions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Sample Data</AlertTitle>
              <AlertDescription>
                This page contains sample data to demonstrate how the charts handle different cluster versions. The data
                is designed to show performance variations across cluster versions 7.1.1, 7.6.0, and 7.6.4.
              </AlertDescription>
            </Alert>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Select View Mode:</label>
              <Select value={selectedView} onValueChange={handleViewChange}>
                <SelectTrigger className="w-full md:w-[300px]">
                  <SelectValue placeholder="Select view mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard View (Multiple SDK Versions)</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive View (SDK x Cluster Matrix)</SelectItem>
                  <SelectItem value="single-sdk">Single SDK Across Cluster Versions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white dark:bg-slate-800">
              <TabsTrigger value="standard">Performance</TabsTrigger>
              <TabsTrigger value="throughput">Throughput</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="standard" className="mt-0">
            <PerformanceBarChart
              title="KV Get Latency"
              description="Average duration for KV Get operations across SDK versions and cluster versions"
              metric="duration_average_us"
              metricLabel="Average Duration"
              metricUnit="μs"
              color="rgba(16, 185, 129, 0.7)"
              borderColor="rgb(16, 185, 129)"
              data={currentData.kvGet}
              isLoading={isLoading}
              baselineClusterVersion="7.1.1-3175-enterprise"
            />

            <PerformanceBarChart
              title="KV Replace Latency"
              description="Average duration for KV Replace operations across SDK versions and cluster versions"
              metric="duration_average_us"
              metricLabel="Average Duration"
              metricUnit="μs"
              color="rgba(79, 70, 229, 0.7)"
              borderColor="rgb(79, 70, 229)"
              data={(currentData.kvReplace || [])}
              isLoading={isLoading}
              baselineClusterVersion="7.1.1-3175-enterprise"
            />

            <PerformanceBarChart
              title="KV Insert Latency"
              description="Average duration for KV Insert operations across SDK versions and cluster versions"
              metric="duration_average_us"
              metricLabel="Average Duration"
              metricUnit="μs"
              color="rgba(245, 158, 11, 0.7)"
              borderColor="rgb(245, 158, 11)"
              data={(currentData.kvInsert || [])}
              isLoading={isLoading}
              baselineClusterVersion="7.1.1-3175-enterprise"
            />
          </TabsContent>

          <TabsContent value="throughput">
            <PerformanceBarChart
              title="Operations Throughput"
              description="Operations per second across SDK versions and cluster versions"
              metric="operations_per_second"
              metricLabel="Throughput"
              metricUnit="ops/sec"
              color="rgba(59, 130, 246, 0.7)"
              borderColor="rgb(59, 130, 246)"
              data={(currentData.throughput || [])}
              isLoading={isLoading}
              baselineClusterVersion="7.1.1-3175-enterprise"
            />
          </TabsContent>

          <TabsContent value="system">
            <PerformanceBarChart
              title="Error Rate"
              description="Percentage of operations that resulted in errors"
              metric="error_rate"
              metricLabel="Error Rate"
              metricUnit="%"
              color="rgba(239, 68, 68, 0.7)"
              borderColor="rgb(239, 68, 68)"
              data={(currentData.errorRate || [])}
              isLoading={isLoading}
              baselineClusterVersion="7.1.1-3175-enterprise"
            />

            <PerformanceBarChart
              title="Memory Usage"
              description="Memory consumption during operations"
              metric="memory_usage"
              metricLabel="Memory Usage"
              metricUnit="MB"
              color="rgba(139, 92, 246, 0.7)"
              borderColor="rgb(139, 92, 246)"
              data={(currentData.memoryUsage || [])}
              isLoading={isLoading}
              baselineClusterVersion="7.1.1-3175-enterprise"
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
