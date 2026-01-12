"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import { Skeleton } from "@/src/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import { ChevronDown, ExternalLink, Info, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { getClusterVersionColor } from "@/src/lib/core-ui-utilities"
import { CustomTooltip, CustomLegend, formatValue } from "@/src/shared/charts"
import { getSdkColorByLanguage } from "@/src/lib/sdk-version-service"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  LabelList,
} from "recharts"


// Using shared CustomLegend component

interface ComparativePerformanceChartProps {
  title: string
  description?: string
  metric: string
  metricLabel: string
  metricUnit: string
  data?: any[]
  isLoading?: boolean
  onRefresh?: () => void
  chartType: "bar" | "grouped" | "stacked"
  normalizeData?: boolean
  baselineClusterVersion?: string
  baselineSdkVersion?: string
  threads?: number // Thread count for dynamic badge display
}

export default function ComparativePerformanceChart({
  title,
  description,
  metric,
  metricLabel,
  metricUnit,
  data,
  isLoading = false,
  onRefresh,
  chartType = "bar",
  normalizeData = false,
  baselineClusterVersion = "7.1.1-3175-enterprise",
  baselineSdkVersion = "3.0.5",
  threads = 20,
}: ComparativePerformanceChartProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Process data for the chart based on chart type
  const processChartData = () => {
    if (!data || data.length === 0) return []

    if (chartType === "bar") {
      // Standard bar chart - each bar is a separate entity
      return data
    } else if (chartType === "grouped") {
      // Group by SDK version, with cluster versions as series
      const sdkVersions = Array.from(new Set(data.map((item) => item.sdkVersion)))
      const clusterVersions = Array.from(new Set(data.map((item) => item.clusterVersion)))

      return sdkVersions.map((sdk) => {
        const result: any = { name: sdk }

        clusterVersions.forEach((cluster) => {
          const item = data.find((d) => d.sdkVersion === sdk && d.clusterVersion === cluster)
          result[`${cluster}`] = item ? item.value : 0
          result[`${cluster}_original`] = item ? item : null
        })

        return result
      })
    } else if (chartType === "stacked") {
      // Group by cluster version, with SDK versions stacked
      const clusterVersions = Array.from(new Set(data.map((item) => item.clusterVersion)))
      const sdkVersions = Array.from(new Set(data.map((item) => item.sdkVersion)))

      return clusterVersions.map((cluster) => {
        const result: any = { name: cluster }

        sdkVersions.forEach((sdk) => {
          const item = data.find((d) => d.clusterVersion === cluster && d.sdkVersion === sdk)
          result[`${sdk}`] = item ? item.value : 0
          result[`${sdk}_original`] = item ? item : null
        })

        return result
      })
    }

    return data
  }



  // Use unified SDK color system
  const getSdkVersionColor = (version: string): string => {
    return getSdkColorByLanguage(version)
  }

  // Get bar color based on version
  const getBarColor = (item: any) => {
    if (chartType === "bar") {
      if (item.hasDifferentClusterVersion) {
        // Use a different color shade for different cluster versions
        return getClusterVersionColor(item.clusterVersion)
      }
      // Use the default color for the baseline cluster version
      return item.sdkVersion === baselineSdkVersion ? "rgb(16, 185, 129)" : getSdkVersionColor(item.sdkVersion)
    }
    return "rgb(16, 185, 129)"
  }

  // Get bar pattern based on cluster version
  const getBarPattern = (item: any) => {
    if (item.hasDifferentClusterVersion) {
      return {
        id: `pattern-${item.clusterVersion.replace(/\./g, "-")}`,
        path: item.isBaseline
          ? "M 0,0 L 10,10 M 10,0 L 0,10" // Different cluster + baseline: diagonal crosses
          : "M 0,5 L 10,5 M 5,0 L 5,10", // Different cluster: grid pattern
        width: 10,
        height: 10,
        stroke: getBarColor(item),
        strokeWidth: 1,
        fill: "none",
      }
    }
    return null
  }

  // Check if we have mixed cluster versions
  const hasMixedClusterVersions = data && data.some((item) => item.hasDifferentClusterVersion)

  // Calculate average value
  const averageValue = data?.length ? data.reduce((sum, item) => sum + item.value, 0) / data.length : 0

  // Prepare chart data
  const chartData = processChartData()

  // Get unique cluster versions for patterns
  const uniqueClusterVersions = data ? Array.from(new Set(data.map((item) => item.clusterVersion))).filter(Boolean) : []

  // Get unique SDK versions for the legend
  const uniqueSdkVersions = data ? Array.from(new Set(data.map((item) => item.sdkVersion))).filter(Boolean) : []

  // Prepare legend items
  const legendItems = []

  if (chartType === "bar") {
    // For bar chart, show both cluster and SDK versions
    data?.forEach((item) => {
      legendItems.push({
        value: item.sdkVersion,
        type: "rect",
        color: getBarColor(item),
        clusterVersion: item.clusterVersion,
        fillPattern: item.hasDifferentClusterVersion
          ? `url(#pattern-${item.clusterVersion.replace(/\./g, "-")})`
          : undefined,
      })
    })
  } else if (chartType === "grouped") {
    // For grouped chart, show cluster versions
    uniqueClusterVersions.forEach((version) => {
      legendItems.push({
        value: version,
        type: "rect",
        color: getClusterVersionColor(version),
        clusterVersion: version,
      })
    })
  } else if (chartType === "stacked") {
    // For stacked chart, show SDK versions
    uniqueSdkVersions.forEach((version) => {
      legendItems.push({
        value: version,
        type: "rect",
        color: getSdkVersionColor(version),
        sdkVersion: version,
      })
    })
  }

  if (isLoading) {
    return (
      <Card className="mb-6 border shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="p-6">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="mb-6 border shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[300px]">
          <div className="text-center">
            <p className="text-muted-foreground">No data available</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6 border shadow-sm">
      <CardHeader className="pb-2 border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-6">
              {threads} thread{threads !== 1 ? 's' : ''}
            </Badge>

          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {hasMixedClusterVersions && (
          <div className="px-6 pt-4">
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cluster Version Difference</AlertTitle>
              <AlertDescription>
                This chart contains data from different Couchbase cluster versions. Bars with patterns represent
                different versions than the baseline ({baselineClusterVersion}).
              </AlertDescription>
            </Alert>
          </div>
        )}
        <div className="p-6" style={{ height: "400px" }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                {/* Define patterns for different cluster versions */}
                <defs>
                  {uniqueClusterVersions.map((version) => {
                    const patternId = `pattern-${version.replace(/\./g, "-")}`
                    return (
                      <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width={10} height={10}>
                        <path
                          d="M 0,5 L 10,5 M 5,0 L 5,10"
                          stroke={getClusterVersionColor(version)}
                          strokeWidth={1}
                          fill="none"
                        />
                      </pattern>
                    )
                  })}
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                  // Add a second line of text for cluster version if it's different
                  tickFormatter={(value, index) => {
                    const item = chartData[index]
                    if (item?.hasDifferentClusterVersion) {
                      return `${value}*`
                    }
                    return value
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend type="version" />} />
                <Bar
                  dataKey="value"
                  name={metricLabel}
                  stroke="#000"
                  strokeWidth={0.5}
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer"
                  // Improved hover effect that only applies to the bar
                  activeBar={{ stroke: "rgb(16, 185, 129)", strokeWidth: 2 }}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.hasDifferentClusterVersion
                          ? `url(#pattern-${entry.clusterVersion.replace(/\./g, "-")})`
                          : getBarColor(entry)
                      }
                      stroke={entry.hasDifferentClusterVersion ? getClusterVersionColor(entry.clusterVersion) : "#000"}
                      strokeWidth={entry.isBaseline ? 2 : 0.5}
                    />
                  ))}
                  <LabelList
                    dataKey="clusterLabel"
                    position="top"
                    style={{ fontSize: "10px", fill: "#888888" }}
                    content={(props) => {
                      const { x, y, width } = props as any
                      const entry = (props as any)?.payload
                      if (!entry?.hasDifferentClusterVersion) return null

                      // Only show short version for cluster version
                      const shortVersion = String(entry.clusterVersion || "").split("-")[0]

                      return (
                        <text
                          x={Number(x) + Number(width) / 2}
                          y={Number(y) - 8}
                          textAnchor="middle"
                          fill="#888888"
                          fontSize={10}
                        >
                          {shortVersion}
                        </text>
                      )
                    }}
                  />
                </Bar>
              </BarChart>
            ) : chartType === "grouped" ? (
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend type="version" />} />

                {uniqueClusterVersions.map((version) => (
                  <Bar
                    key={`bar-${version}`}
                    dataKey={version}
                    name={version}
                    fill={getClusterVersionColor(version)}
                    stroke="#000"
                    strokeWidth={0.5}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend type="version" />} />

                {uniqueSdkVersions.map((version, index) => (
                  <Bar
                    key={`bar-${version}`}
                    dataKey={version}
                    name={version}
                    fill={getSdkVersionColor(version)}
                    stroke="#000"
                    strokeWidth={0.5}
                    radius={[4, 4, 0, 0]}
                    stackId="stack"
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        <CardFooter className="flex items-center justify-between px-6 py-3 border-t bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 cursor-help">
                    <Info className="h-4 w-4" />
                    Average:{" "}
                    <span className="font-medium text-foreground">
                      {averageValue.toFixed(2)} {metricUnit}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Average value across all versions</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
              Reload
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? "Hide details" : "Show details"}
              <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </CardFooter>
        {showDetails && (
          <div className="px-6 py-4 border-t">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">SDK Version</th>
                    <th className="text-left py-2 px-2">Cluster Version</th>
                    <th className="text-right py-2 px-2">
                      {metricLabel} ({metricUnit})
                    </th>
                    <th className="text-left py-2 px-2">Baseline</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, i) => (
                    <tr key={i} className={`border-b ${item.isBaseline ? "bg-primary/5" : ""}`}>
                      <td className="py-2 px-2">{item.sdkVersion}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center">
                          {item.clusterVersion}
                          {item.hasDifferentClusterVersion && (
                            <Badge
                              variant="outline"
                              className="ml-2 bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                            >
                              Different
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-2 px-2 font-medium">{item.value.toFixed(2)}</td>
                      <td className="py-2 px-2">
                        {item.isBaseline && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                            Baseline
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
