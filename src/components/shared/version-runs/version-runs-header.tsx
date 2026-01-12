"use client"

import { Button } from "@/src/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu"
import { ChevronDown, RefreshCw } from "lucide-react"

interface MetricOption { id: string; label: string }

interface VersionRunsHeaderProps {
  version: string
  runIdsParam?: string
  clusterVersion?: string
  sdk?: string
  metricInfo: { label: string; unit: string }
  availableMetrics: ReadonlyArray<MetricOption>
  currentMetric: string
  onSelectMetric: (metricId: string) => void
  onRefresh: () => void
  dashboardAggregatedValue?: number | null
  horizontalScaling?: string | null
  systemMetric?: string | null
  transactionThreads?: string | null
  reactiveAPI?: string | null
}

export default function VersionRunsHeader({
  version,
  runIdsParam,
  clusterVersion,
  sdk,
  metricInfo,
  availableMetrics,
  currentMetric,
  onSelectMetric,
  onRefresh,
  dashboardAggregatedValue,
  horizontalScaling,
  systemMetric,
  transactionThreads,
  reactiveAPI,
}: VersionRunsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Version {version} Runs</h1>
        <p className="text-muted-foreground mt-1">
          {runIdsParam
            ? `Showing selected run(s)`
            : `Showing all performance runs for version ${version}${clusterVersion ? ` on cluster ${clusterVersion}` : ''}${sdk ? ` with SDK ${sdk}` : ''}`}
          {horizontalScaling && (
            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
              Horizontal Scaling: {horizontalScaling}
            </span>
          )}
          {systemMetric && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
              System Metric: {systemMetric}
            </span>
          )}
          {transactionThreads && (
            <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
              Transaction Threads: {transactionThreads}
            </span>
          )}
          {reactiveAPI && (
            <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-medium">
              Reactive API: {reactiveAPI}
            </span>
          )}
          {typeof dashboardAggregatedValue === 'number' && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
              Chart Value: {dashboardAggregatedValue.toFixed(2)} {metricInfo.unit}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Metric: {metricInfo.label}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableMetrics.map((m) => (
              <DropdownMenuItem key={m.id} onClick={() => onSelectMetric(m.id)}>
                {m.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  )
}


