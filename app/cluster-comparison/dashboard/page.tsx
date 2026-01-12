"use client"

import { useState } from "react"
import AppLayout from "@/src/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import ClusterVersionMatrix from "@/src/components/shared/cluster-version-matrix"
import PerformanceBarChart from "@/src/components/shared/performance-bar-chart"

// Sample data for the matrix view
const MATRIX_DATA = {
  sdkVersions: ["3.0.5", "3.0.6", "3.0.7", "3.0.8", "3.0.9"],
  clusterVersions: ["7.1.1-3175-enterprise", "7.6.0-9487-enterprise", "7.6.4-9634-enterprise"],
  metrics: {
    "3.0.5": {
      "7.1.1-3175-enterprise": { value: 105.23, unit: "μs" },
      "7.6.0-9487-enterprise": { value: 98.76, unit: "μs", improvement: true },
      "7.6.4-9634-enterprise": { value: 92.45, unit: "μs", improvement: true },
    },
    "3.0.6": {
      "7.1.1-3175-enterprise": { value: 102.78, unit: "μs" },
      "7.6.0-9487-enterprise": { value: 96.32, unit: "μs", improvement: true },
      "7.6.4-9634-enterprise": { value: 90.18, unit: "μs", improvement: true },
    },
    "3.0.7": {
      "7.1.1-3175-enterprise": { value: 98.45, unit: "μs" },
      "7.6.0-9487-enterprise": { value: 93.21, unit: "μs", improvement: true },
      "7.6.4-9634-enterprise": { value: 87.65, unit: "μs", improvement: true },
    },
    "3.0.8": {
      "7.1.1-3175-enterprise": { value: 97.12, unit: "μs" },
      "7.6.0-9487-enterprise": { value: 91.87, unit: "μs", improvement: true },
      "7.6.4-9634-enterprise": { value: 85.43, unit: "μs", improvement: true },
    },
    "3.0.9": {
      "7.1.1-3175-enterprise": { value: 95.78, unit: "μs" },
      "7.6.0-9487-enterprise": { value: 89.45, unit: "μs", improvement: true },
      "7.6.4-9634-enterprise": { value: 83.21, unit: "μs", improvement: true },
    },
  },
}

// Sample data for throughput matrix
const THROUGHPUT_MATRIX_DATA = {
  sdkVersions: ["3.0.5", "3.0.6", "3.0.7", "3.0.8", "3.0.9"],
  clusterVersions: ["7.1.1-3175-enterprise", "7.6.0-9487-enterprise", "7.6.4-9634-enterprise"],
  metrics: {
    "3.0.5": {
      "7.1.1-3175-enterprise": { value: 9850, unit: "ops/sec" },
      "7.6.0-9487-enterprise": { value: 11250, unit: "ops/sec", improvement: true },
      "7.6.4-9634-enterprise": { value: 12450, unit: "ops/sec", improvement: true },
    },
    "3.0.6": {
      "7.1.1-3175-enterprise": { value: 10120, unit: "ops/sec" },
      "7.6.0-9487-enterprise": { value: 11580, unit: "ops/sec", improvement: true },
      "7.6.4-9634-enterprise": { value: 12780, unit: "ops/sec", improvement: true },
    },
    "3.0.7": {
      "7.1.1-3175-enterprise": { value: 10450, unit: "ops/sec" },
      "7.6.0-9487-enterprise": { value: 11920, unit: "ops/sec", improvement: true },
      "7.6.4-9634-enterprise": { value: 13150, unit: "ops/sec", improvement: true },
    },
    "3.0.8": {
      "7.1.1-3175-enterprise": { value: 10780, unit: "ops/sec" },
      "7.6.0-9487-enterprise": { value: 12350, unit: "ops/sec", improvement: true },
      "7.6.4-9634-enterprise": { value: 13580, unit: "ops/sec", improvement: true },
    },
    "3.0.9": {
      "7.1.1-3175-enterprise": { value: 11120, unit: "ops/sec" },
      "7.6.0-9487-enterprise": { value: 12780, unit: "ops/sec", improvement: true },
      "7.6.4-9634-enterprise": { value: 14050, unit: "ops/sec", improvement: true },
    },
  },
}

// Sample data for error rate matrix
const ERROR_RATE_MATRIX_DATA = {
  sdkVersions: ["3.0.5", "3.0.6", "3.0.7", "3.0.8", "3.0.9"],
  clusterVersions: ["7.1.1-3175-enterprise", "7.6.0-9487-enterprise", "7.6.4-9634-enterprise"],
  metrics: {
    "3.0.5": {
      "7.1.1-3175-enterprise": { value: 0.12, unit: "%" },
      "7.6.0-9487-enterprise": { value: 0.1, unit: "%", improvement: true },
      "7.6.4-9634-enterprise": { value: 0.08, unit: "%", improvement: true },
    },
    "3.0.6": {
      "7.1.1-3175-enterprise": { value: 0.09, unit: "%" },
      "7.6.0-9487-enterprise": { value: 0.08, unit: "%", improvement: true },
      "7.6.4-9634-enterprise": { value: 0.06, unit: "%", improvement: true },
    },
    "3.0.7": {
      "7.1.1-3175-enterprise": { value: 0.08, unit: "%" },
      "7.6.0-9487-enterprise": { value: 0.07, unit: "%", improvement: true },
      "7.6.4-9634-enterprise": { value: 0.05, unit: "%", improvement: true },
    },
    "3.0.8": {
      "7.1.1-3175-enterprise": { value: 0.07, unit: "%" },
      "7.6.0-9487-enterprise": { value: 0.06, unit: "%", improvement: true },
      "7.6.4-9634-enterprise": { value: 0.04, unit: "%", improvement: true },
    },
    "3.0.9": {
      "7.1.1-3175-enterprise": { value: 0.06, unit: "%" },
      "7.6.0-9487-enterprise": { value: 0.05, unit: "%", improvement: true },
      "7.6.4-9634-enterprise": { value: 0.03, unit: "%", improvement: true },
    },
  },
}

// Sample data for single SDK version across cluster versions
const SINGLE_SDK_DATA = {
  kvGet: [
    {
      name: "7.1.1",
      value: 98.45,
      runCount: 3,
      clusterVersion: "7.1.1-3175-enterprise",
      isBaseline: true,
      sdkVersion: "3.0.7",
    },
    {
      name: "7.2.0",
      value: 93.21,
      runCount: 4,
      clusterVersion: "7.2.0-4127-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
    },
    {
      name: "7.6.0",
      value: 89.76,
      runCount: 2,
      clusterVersion: "7.6.0-9487-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
    },
    {
      name: "7.6.4",
      value: 87.65,
      runCount: 5,
      clusterVersion: "7.6.4-9634-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
    },
  ],
  throughput: [
    {
      name: "7.1.1",
      value: 10450,
      runCount: 3,
      clusterVersion: "7.1.1-3175-enterprise",
      isBaseline: true,
      sdkVersion: "3.0.7",
      metricUnit: "ops/sec",
    },
    {
      name: "7.2.0",
      value: 11250,
      runCount: 4,
      clusterVersion: "7.2.0-4127-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
      metricUnit: "ops/sec",
    },
    {
      name: "7.6.0",
      value: 11920,
      runCount: 2,
      clusterVersion: "7.6.0-9487-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
      metricUnit: "ops/sec",
    },
    {
      name: "7.6.4",
      value: 13150,
      runCount: 5,
      clusterVersion: "7.6.4-9634-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
      metricUnit: "ops/sec",
    },
  ],
  errorRate: [
    {
      name: "7.1.1",
      value: 0.08,
      runCount: 3,
      clusterVersion: "7.1.1-3175-enterprise",
      isBaseline: true,
      sdkVersion: "3.0.7",
      metricUnit: "%",
    },
    {
      name: "7.2.0",
      value: 0.07,
      runCount: 4,
      clusterVersion: "7.2.0-4127-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
      metricUnit: "%",
    },
    {
      name: "7.6.0",
      value: 0.06,
      runCount: 2,
      clusterVersion: "7.6.0-9487-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
      metricUnit: "%",
    },
    {
      name: "7.6.4",
      value: 0.05,
      runCount: 5,
      clusterVersion: "7.6.4-9634-enterprise",
      hasDifferentClusterVersion: true,
      sdkVersion: "3.0.7",
      metricUnit: "%",
    },
  ],
}

export default function ClusterComparisonDashboard() {
  const [activeTab, setActiveTab] = useState("matrix")

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cluster Version Comparison Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive view of performance metrics across different Couchbase cluster versions
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Performance Across Cluster Versions</CardTitle>
            <CardDescription>
              This dashboard provides a comprehensive view of how SDK performance varies across different Couchbase
              cluster versions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              The data shows that newer cluster versions (7.6.0 and 7.6.4) generally provide better performance across
              all SDK versions, with the most significant improvements seen in throughput metrics.
            </p>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white dark:bg-slate-800">
              <TabsTrigger value="matrix">Matrix View</TabsTrigger>
              <TabsTrigger value="charts">Chart View</TabsTrigger>
              <TabsTrigger value="single-sdk">Single SDK Analysis</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="matrix" className="mt-0">
            <ClusterVersionMatrix
              title="KV Get Latency (μs)"
              description="Average duration for KV Get operations across SDK and cluster versions"
              data={MATRIX_DATA}
            />

            <ClusterVersionMatrix
              title="Throughput (operations/sec)"
              description="Operations per second across SDK and cluster versions"
              data={THROUGHPUT_MATRIX_DATA}
            />

            <ClusterVersionMatrix
              title="Error Rate (%)"
              description="Percentage of operations that resulted in errors"
              data={ERROR_RATE_MATRIX_DATA}
            />
          </TabsContent>

          <TabsContent value="charts" className="mt-0">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Performance Charts</CardTitle>
                <CardDescription>
                  Visual representation of performance metrics across different cluster versions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  These charts show how performance varies across SDK versions and cluster versions. Bars with patterns
                  represent different cluster versions than the baseline (7.1.1).
                </p>
              </CardContent>
            </Card>

            <PerformanceBarChart
              title="KV Get Latency"
              description="Average duration for KV Get operations across SDK versions and cluster versions"
              metric="duration_average_us"
              metricLabel="Average Duration"
              metricUnit="μs"
              color="rgba(16, 185, 129, 0.7)"
              borderColor="rgb(16, 185, 129)"
              data={[
                {
                  name: "3.0.5",
                  value: 105.23,
                  runCount: 3,
                  clusterVersion: "7.1.1-3175-enterprise",
                  isBaseline: true,
                },
                { name: "3.0.6", value: 102.78, runCount: 4, clusterVersion: "7.1.1-3175-enterprise" },
                { name: "3.0.7", value: 98.45, runCount: 2, clusterVersion: "7.1.1-3175-enterprise" },
                { name: "3.0.8", value: 97.12, runCount: 3, clusterVersion: "7.1.1-3175-enterprise" },
                { name: "3.0.9", value: 95.78, runCount: 5, clusterVersion: "7.1.1-3175-enterprise" },
                {
                  name: "3.0.5",
                  value: 98.76,
                  runCount: 2,
                  clusterVersion: "7.6.0-9487-enterprise",
                  hasDifferentClusterVersion: true,
                },
                {
                  name: "3.0.6",
                  value: 96.32,
                  runCount: 3,
                  clusterVersion: "7.6.0-9487-enterprise",
                  hasDifferentClusterVersion: true,
                },
                {
                  name: "3.0.7",
                  value: 93.21,
                  runCount: 4,
                  clusterVersion: "7.6.0-9487-enterprise",
                  hasDifferentClusterVersion: true,
                },
                {
                  name: "3.0.8",
                  value: 91.87,
                  runCount: 3,
                  clusterVersion: "7.6.0-9487-enterprise",
                  hasDifferentClusterVersion: true,
                },
                {
                  name: "3.0.9",
                  value: 89.45,
                  runCount: 5,
                  clusterVersion: "7.6.0-9487-enterprise",
                  hasDifferentClusterVersion: true,
                },
              ]}
              baselineClusterVersion="7.1.1-3175-enterprise"
            />

            <PerformanceBarChart
              title="Throughput"
              description="Operations per second across SDK versions and cluster versions"
              metric="operations_per_second"
              metricLabel="Throughput"
              metricUnit="ops/sec"
              color="rgba(59, 130, 246, 0.7)"
              borderColor="rgb(59, 130, 246)"
              data={[
                { name: "3.0.5", value: 9850, runCount: 3, clusterVersion: "7.1.1-3175-enterprise", isBaseline: true },
                { name: "3.0.6", value: 10120, runCount: 4, clusterVersion: "7.1.1-3175-enterprise" },
                { name: "3.0.7", value: 10450, runCount: 2, clusterVersion: "7.1.1-3175-enterprise" },
                { name: "3.0.8", value: 10780, runCount: 3, clusterVersion: "7.1.1-3175-enterprise" },
                { name: "3.0.9", value: 11120, runCount: 5, clusterVersion: "7.1.1-3175-enterprise" },
                {
                  name: "3.0.5",
                  value: 11250,
                  runCount: 2,
                  clusterVersion: "7.6.0-9487-enterprise",
                  hasDifferentClusterVersion: true,
                },
                {
                  name: "3.0.6",
                  value: 11580,
                  runCount: 3,
                  clusterVersion: "7.6.0-9487-enterprise",
                  hasDifferentClusterVersion: true,
                },
                {
                  name: "3.0.7",
                  value: 11920,
                  runCount: 4,
                  clusterVersion: "7.6.0-9487-enterprise",
                  hasDifferentClusterVersion: true,
                },
                {
                  name: "3.0.8",
                  value: 12350,
                  runCount: 3,
                  clusterVersion: "7.6.0-9487-enterprise",
                  hasDifferentClusterVersion: true,
                },
                {
                  name: "3.0.9",
                  value: 12780,
                  runCount: 5,
                  clusterVersion: "7.6.0-9487-enterprise",
                  hasDifferentClusterVersion: true,
                },
              ]}
              baselineClusterVersion="7.1.1-3175-enterprise"
            />
          </TabsContent>

          <TabsContent value="single-sdk" className="mt-0">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Single SDK Version Analysis</CardTitle>
                <CardDescription>
                  Performance of SDK version 3.0.7 across different Couchbase cluster versions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This view isolates a single SDK version (3.0.7) and shows how its performance varies across different
                  cluster versions. This helps identify the impact of cluster upgrades on a specific SDK version.
                </p>
              </CardContent>
            </Card>

            <PerformanceBarChart
              title="KV Get Latency (SDK 3.0.7)"
              description="Average duration for KV Get operations with SDK 3.0.7 across cluster versions"
              metric="duration_average_us"
              metricLabel="Average Duration"
              metricUnit="μs"
              color="rgba(16, 185, 129, 0.7)"
              borderColor="rgb(16, 185, 129)"
              data={SINGLE_SDK_DATA.kvGet}
              baselineClusterVersion="7.1.1-3175-enterprise"
            />

            <PerformanceBarChart
              title="Throughput (SDK 3.0.7)"
              description="Operations per second with SDK 3.0.7 across cluster versions"
              metric="operations_per_second"
              metricLabel="Throughput"
              metricUnit="ops/sec"
              color="rgba(59, 130, 246, 0.7)"
              borderColor="rgb(59, 130, 246)"
              data={SINGLE_SDK_DATA.throughput}
              baselineClusterVersion="7.1.1-3175-enterprise"
            />

            <PerformanceBarChart
              title="Error Rate (SDK 3.0.7)"
              description="Percentage of operations that resulted in errors with SDK 3.0.7 across cluster versions"
              metric="error_rate"
              metricLabel="Error Rate"
              metricUnit="%"
              color="rgba(239, 68, 68, 0.7)"
              borderColor="rgb(239, 68, 68)"
              data={SINGLE_SDK_DATA.errorRate}
              baselineClusterVersion="7.1.1-3175-enterprise"
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
