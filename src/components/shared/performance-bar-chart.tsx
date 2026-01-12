"use client"

import { useState } from "react"
import { Skeleton } from "@/src/components/ui/skeleton"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import { RefreshCw, ChevronDown, ExternalLink, Info, Download, BarChart3 } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/src/components/ui/card"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert"
// cluster version mapping handled inside hook
import { CustomTooltip, CustomLegend } from "@/src/shared/charts"
import { exportChartToCSV } from "@/src/lib/utils/exports"
import { usePerformanceBarChart } from '@/src/shared/charts/use-performance-bar-chart'


// Using shared CustomLegend component

interface PerformanceBarChartProps {
  title: string
  description?: string
  metric: string
  metricLabel: string
  metricUnit: string
  color: string
  borderColor: string
  data?: any[]
  isLoading?: boolean
  onRefresh?: () => void
  clusterVersions?: string[]
  multiClusterMode?: boolean
  sdkVersion?: string
  sdkName?: string
  baselineClusterVersion?: string
  queryInput?: any // CRITICAL FIX: Add original query input to determine chart type
  threads?: number // Thread count for dynamic badge display
}

export default function PerformanceBarChart({
  title,
  description,
  metric,
  metricLabel,
  metricUnit,
  color,
  borderColor,
  data,
  isLoading = false,
  onRefresh,
  clusterVersions = [],
  multiClusterMode = false,
  sdkVersion,
  sdkName,
  queryInput,
  threads = 20,
}: PerformanceBarChartProps) {


  const [showDetails, setShowDetails] = useState(false)
  const {
    chartType,
    toggleChartType,
    processedData,
    averageValue,
    hasMultipleClusterVersions,
    uniqueClusterVersions,
    handleBarClick,
  } = usePerformanceBarChart({ title, metric, data, queryInput, clusterVersions, multiClusterMode, sdkVersion })

  // data processing handled by hook: processedData



  // Show all bars to match Vue.js behavior - no artificial limits

  // average value handled by hook

  // cluster versions handled by hook: uniqueClusterVersions

  // toggleChartType provided by hook

  // Export data as CSV using shared utility
  const exportData = () => {
    if (!processedData) return
    exportChartToCSV(processedData, title)
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

  if (!processedData || processedData.length === 0) {
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
            {hasMultipleClusterVersions && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8" onClick={toggleChartType}>
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span className="sr-only">Toggle chart type</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle between standard and grouped view</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {hasMultipleClusterVersions && (
          <div className="px-6 pt-4">
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Multiple Cluster Versions</AlertTitle>
              <AlertDescription>
                This chart displays performance data across multiple Couchbase cluster versions.
                {chartType === "standard"
                  ? " Each bar is color-coded according to its cluster version."
                  : " Data is grouped by SDK version with different colors for each cluster version."}
              </AlertDescription>
            </Alert>
          </div>
        )}
        <div className="p-6" style={{ height: "300px" }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "grouped" && hasMultipleClusterVersions ? (
              // Grouped chart for multiple cluster versions
              <BarChart
                data={processedData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  stroke="#94a3b8" 
                  label={{ value: metricUnit, angle: -90, position: 'insideLeft' }}
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border rounded-md shadow-md">
                          <p className="font-medium">Version {label}</p>
                          {payload
                            .filter((entry) => {
                              // CRITICAL FIX: Filter out zero, null, undefined values to prevent "0" showing in tooltips
                              const value = entry.value
                              return value !== null && value !== undefined && value !== 0 && value !== ''
                            })
                            .map((entry, index) => {
                            // Extract cluster name from the dataKey
                            const clusterKey = entry.dataKey as string
                            const clusterName = clusterKey.replace("cluster_", "").replace(/_/g, ".")
                            return (
                              <div key={index} className="flex items-center mt-1">
                                <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: entry.color }} />
                                <span className="text-sm">
                                  Cluster {clusterName}: {entry.value} {metricUnit}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend
                  content={({ payload }) => {
                    if (!payload) return null
                    return (
                      <div className="flex flex-wrap gap-4 justify-center mt-2 px-4">
                        {uniqueClusterVersions.map((version) => (
                          <div key={version.id} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: version.color }} />
                            <span className="text-xs">Cluster {version.name}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                {uniqueClusterVersions.map((version) => (
                  <Bar
                    key={version.id}
                    dataKey={version.key}
                    name={`Cluster ${version.name}`}
                    fill={version.color}
                    stroke={version.color}
                    strokeWidth={1}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : (
              // Standard bar chart
                   <BarChart
                 data={processedData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  stroke="#94a3b8" 
                  label={{ value: metricUnit, angle: -90, position: 'insideLeft' }}
                />
                <RechartsTooltip content={<CustomTooltip metricUnit={metricUnit} />} />
                {hasMultipleClusterVersions && <Legend content={<CustomLegend type="cluster" />} />}
                <Bar
                  dataKey="value"
                  name={metricLabel}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer"
                  onClick={(data) => handleBarClick(data)}
                  // Improved hover effect that only applies to the bar
                  activeBar={{ stroke: "rgb(16, 185, 129)", strokeWidth: 2 }}
                >
                  {Array.isArray(processedData) && processedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry?.clusterColor || color}
                      stroke={
                        entry?.clusterColor && typeof entry.clusterColor === "string"
                          ? entry.clusterColor.replace("0.7", "1")
                          : borderColor
                      }
                    />
                  ))}
                  {multiClusterMode && (
                    <LabelList
                      dataKey="clusterName"
                      position="top"
                      style={{ fontSize: "10px", fill: "#888888" }}
                      content={(props) => {
                        const { x, y, width } = props as any
                        if (!Array.isArray(processedData)) return null
                        // Recharts does not pass index reliably to content renderer; use payload instead
                        const entry = (props as any)?.payload
                        if (!entry) return null

                        // Only show if we have multiple cluster versions
                        if (!hasMultipleClusterVersions) return null

                        return (
                          <text
                            x={Number(x) + Number(width) / 2}
                            y={Number(y) - 8}
                            textAnchor="middle"
                            fill="#888888"
                            fontSize={10}
                          >
                            {entry.clusterName}
                          </text>
                        )
                      }}
                    />
                  )}
                </Bar>
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {chartType === "grouped" && hasMultipleClusterVersions
                ? // Grouped view details
                  processedData.map((item: any, i) => (
                    <div key={i} className="flex flex-col p-3 rounded-md border hover:bg-slate-50 transition-colors">
                      <span className="text-sm font-medium">{item.name}</span>
                      <div className="mt-2 space-y-1">
                        {uniqueClusterVersions.map((version) => (
                          <div key={version.id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: version.color }} />
                              <span className="text-xs text-muted-foreground">{version.name}:</span>
                            </div>
                            <span className="text-xs font-medium">
                              {item[version.key]?.toFixed(2) || "N/A"} {metricUnit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                : // Standard view details
                  processedData.map((item, i) => (
                    <Link
                      href={`/versions/${encodeURIComponent(item.name)}/runs?metric=${encodeURIComponent(metric)}&sdk=${encodeURIComponent(sdkVersion || "")}`}
                      key={i}
                      className="flex flex-col items-center p-3 rounded-md border hover:bg-slate-50 transition-colors"
                      style={{ borderColor: multiClusterMode ? item.clusterColor.replace("0.7", "0.3") : undefined }}
                    >
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        {item.value.toFixed(2)} {metricUnit}
                      </span>
                      {multiClusterMode && (
                        <div className="flex items-center mt-2 text-xs">
                          <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: item.clusterColor }} />
                          <span className="text-muted-foreground">{item.clusterName}</span>
                        </div>
                      )}
                    </Link>
                  ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
