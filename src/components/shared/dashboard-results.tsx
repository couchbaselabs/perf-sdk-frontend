"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert"
import { Skeleton } from "@/src/components/ui/skeleton"
import { RefreshCw, ChevronDown, ChevronUp, AlertTriangle, ExternalLink, Info, Copy, Check } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import { SdkBadge, VersionBadge } from "@/src/components/shared/BadgeSystem"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import PerformanceBarChart from "@/src/components/shared/performance-bar-chart"
import { DataTransformers } from '@/src/shared/data/transformers'
import PerformanceGraph from "@/src/components/shared/performance-graph"
import { DashboardInput } from '@/src/lib/dashboard-service'
import { apiClient } from '@/src/lib/api-client-unified'
import { AVAILABLE_METRICS } from '@/src/lib/config/constants'
import { formatDate } from '@/src/lib/utils/formatting'

// Types that were in dashboard-client.ts
interface SingleRunInput {
  runId: string
  yAxes: any[]
}

interface DashboardResponse {
  success: boolean
  data?: any
  message?: string
}
import Link from "next/link"

interface DashboardResultsProps {
  input: DashboardInput | SingleRunInput
  title: string
  description?: string
  keyProp?: string // For React key prop to force re-renders
  selectedMetric?: string // Current selected metric for refetching
  threads?: number // Thread count for dynamic badge display
}

/**
 * JSON Popup Component - Clean popup for displaying JSON data
 */
function JsonPopup({ data, title, triggerText }: { data: any, title: string, triggerText: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!data) return null

  // Count the number of fields in the object
  const fieldCount = typeof data === 'object' ? Object.keys(data).length : 0
  const jsonString = JSON.stringify(data, null, 2)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs font-normal bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md shadow-sm text-blue-700 hover:text-blue-800"
        >
          <Info className="h-3 w-3 mr-1" />
          {triggerText}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[700px] max-h-[600px] overflow-hidden p-0 shadow-2xl border border-gray-300 bg-white rounded-lg"
        align="start"
        side="top"
      >
        {/* Title bar with copy button */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs"
          >
            {copied ? (
              <Check className="h-3 w-3 mr-1 text-green-600" />
            ) : (
              <Copy className="h-3 w-3 mr-1" />
            )}
            {copied ? 'Copied!' : 'Copy JSON'}
          </Button>
        </div>

        {/* JSON content */}
        <div className="p-6">
          <div className="max-h-[450px] overflow-y-auto bg-gray-50 p-4 rounded-md border">
            <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800 leading-relaxed">
              {jsonString}
            </pre>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Transform Chart.js format data into PerformanceBarChart format
 * SIMPLIFIED: Always use the results array from dashboard service for correct version-to-runIds mapping
 */
const transformChartData = (chartData: any, sdkLanguage: string = 'Java') =>
  DataTransformers.toBarChartFromDashboard(chartData, sdkLanguage)

/**
 * Dashboard Results Component - Mirrors Vue Results.vue functionality
 * Handles both bar charts (Simplified) and line charts (Full) with identical data flow
 */
export default function DashboardResults({ input, title, description, keyProp, selectedMetric = "duration_average_us", threads }: DashboardResultsProps) {
  const [results, setResults] = useState<DashboardResponse | null>(null)
  const [errors, setErrors] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showRuns, setShowRuns] = useState(false)
  const [versionPick, setVersionPick] = useState<string | null>(null)

  // Tracks which input the data in `results` belongs to. When the SDK (or any
  // other input) changes, the current `results` are for the old selection, so we
  // can show a skeleton instead of stale data until the new data arrives.
  const resultsInputKeyRef = useRef<string | null>(null)


  // Use ref to track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Determine if this is a single run input
  const isSingleRun = 'runId' in input

  // Extract SDK language from input for dynamic props
  const sdkLanguage = !isSingleRun && 'databaseCompare' in input
    ? String((input as DashboardInput).databaseCompare?.impl?.language || 'Java')
    : 'Java'

  // Version dropdown (LATEST charts only). The server reports the versions that
  // have data and the one it chose by default (latest release). A user pick is
  // validated against the current options, so a pick that no longer applies
  // (e.g. after an SDK switch) falls back to the server default with no effect.
  const responseData = results?.data
  const availableVersions: string[] = responseData?.availableVersions ?? []
  const serverSelectedVersion: string | undefined = responseData?.selectedVersion
  const activeVersion = versionPick && availableVersions.includes(versionPick) ? versionPick : null
  const shownVersion = activeVersion ?? serverSelectedVersion ?? ''

  const effectiveInput = useMemo(
    () => (!isSingleRun && activeVersion
      ? { ...(input as DashboardInput), selectedVersion: activeVersion }
      : input),
    [input, isSingleRun, activeVersion]
  )

  // Memoize input serialization to prevent unnecessary re-renders
  // This is the key fix - we serialize the input object to detect actual changes
  const inputKey = useMemo(() => {
    return JSON.stringify(effectiveInput)
  }, [effectiveInput])

  const query = useQuery({
    // CRITICAL FIX: Include title in queryKey to prevent cache conflicts between different chart types
    // This ensures each chart maintains its own cache and doesn't interfere with others
    queryKey: ['dashboardResults', inputKey, selectedMetric, title],
    queryFn: async ({ signal }): Promise<DashboardResponse> => {
      if (isSingleRun) {
        const singleInput = input as SingleRunInput
        return apiClient.getRunMetrics(singleInput.runId, signal)
      }
      return apiClient.getDashboardQuery(effectiveInput, signal)
    },
    // Inherit cache settings from the global QueryClient (providers.tsx) so
    // results are reused across tab switches and revisits instead of refetched.
    refetchOnWindowFocus: false, // Prevent unwanted refetches
    retry: 2,
    retryDelay: 1000
  })

  useEffect(() => {
    if (query.isFetching) setIsLoading(true)
    else setIsLoading(false)
  }, [query.isFetching])

  useEffect(() => {
    if (query.error) setErrors((query.error as Error).message)
    else setErrors(null)
  }, [query.error])

  useEffect(() => {
    if (query.data && isMountedRef.current) {
      setResults(query.data)
      resultsInputKeyRef.current = inputKey
    }
  }, [query.data, inputKey])

  // CRITICAL FIX: Simplified data fetching logic - React Query handles this automatically
  // Only manually refetch when keyProp changes (for SDK selection refresh)
  // FIXED: Remove 'query' from dependencies to prevent infinite loop
  useEffect(() => {
    if (keyProp) {
      console.log("DashboardResults: Refreshing due to keyProp change", { title, keyProp })
      // Don't clear results - keep displaying existing data until new data arrives
      // Setting results to null caused a race condition where "No data available" would flash
      setErrors(null)
      query.refetch()
    }
  }, [keyProp]) // FIXED: Only depend on keyProp, not the entire query object

  // REMOVED: The inputKey useEffect that was causing double fetches
  // React Query automatically handles refetching when queryKey changes

  const handleRefresh = () => { query.refetch() }

  const toggleShowRuns = () => {
    setShowRuns(!showRuns)
  }

  // Get metric info - MUST be before any conditional returns to follow Rules of Hooks
  const getMetricInfo = useCallback(() => {
    // First check if it's a system metric or bucket metric query
    if ('yAxes' in input && input.yAxes && input.yAxes.length > 0) {
      const yAxis = input.yAxes[0]
      // System metrics use yAxis.metric (type: "metric"), bucket metrics use yAxis.column (type: "buckets")
      const metricKey = yAxis.column || yAxis.metric
      switch (metricKey) {
        case 'processCpu':
          return { label: "Process CPU", unit: "%" }
        case 'systemCpu':
          return { label: "System CPU", unit: "%" }
        case 'memHeapUsedMB':
          return { label: "Heap Memory Used", unit: "MB" }
        case 'memHeapMaxMB':
          return { label: "Heap Memory Max", unit: "MB" }
        case 'memDirectUsedMB':
          return { label: "Direct Memory Used", unit: "MB" }
        case 'memDirectMaxMB':
          return { label: "Direct Memory Max", unit: "MB" }
        case 'memRssUsedMB':
          return { label: "RSS Memory Used", unit: "MB" }
        case 'memVmsMB':
          return { label: "VMS Memory", unit: "MB" }
        case 'freeSwapSizeMB':
          return { label: "Free Swap Size", unit: "MB" }
        case 'threadCount':
          return { label: "Thread Count", unit: "" }
        case 'gc0AccTimeMs':
          return { label: "GC Accumulated Time", unit: "ms" }
        case 'gc0Count':
          return { label: "GC Collection Count", unit: "" }
        case 'operations_total':
          return { label: "Total Operations", unit: "ops" }
        case 'operations_success':
          return { label: "Successful Operations", unit: "ops" }
        case 'operations_failed':
          return { label: "Failed Operations", unit: "ops" }
      }
    }

    // Fallback to AVAILABLE_METRICS for duration-based metrics
    return AVAILABLE_METRICS.find(m => m.id === selectedMetric) ||
      { label: "Performance", unit: "units" }
  }, [input, selectedMetric])

  const metricInfo = getMetricInfo()

  // Show the skeleton whenever the data on screen doesn't match the current input
  // (e.g. right after an SDK switch) as well as on the very first load. A new query
  // is always in flight in that window, so this resolves as soon as it returns.
  const showingStaleData = !!results && resultsInputKeyRef.current !== inputKey

  // Rendered above the chart on version-collapsed charts (horizontal scaling).
  // Kept visible across the reload so switching versions does not make it vanish.
  const versionSelector = availableVersions.length > 1 ? (
    <div className="flex items-center justify-end gap-2 mb-2">
      <span className="text-sm text-muted-foreground">Version</span>
      <Select value={shownVersion} onValueChange={setVersionPick}>
        <SelectTrigger className="w-[200px] h-8">
          <SelectValue placeholder="Select version" />
        </SelectTrigger>
        <SelectContent>
          {availableVersions.map((v) => (
            <SelectItem key={v} value={v}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null

  if ((isLoading && !results) || showingStaleData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {versionSelector}
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (errors) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errors}</AlertDescription>
          </Alert>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // DEBUG: Check why charts show "No data available"
  console.log('🔍 DashboardResults condition check:', {
    title,
    hasResults: !!results,
    resultsKeys: results ? Object.keys(results) : 'N/A',
    hasResultsData: !!results?.data,
    resultsData: results?.data,
    resultsType: (results as any)?.type
  })

  if (!results || !results.data) {
    console.log('❌ Returning "No data available" because:', {
      title,
      noResults: !results,
      noResultsData: !results?.data,
      results
    })
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full space-y-4">
      {versionSelector}
      {/* Chart rendering - matches Vue Results.vue */}
      <div className="graph relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 z-10 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-md border">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm text-muted-foreground">Refreshing...</span>
            </div>
          </div>
        )}
        {results.data?.type === 'bar' && (
          <PerformanceBarChart
            title={title}
            description={description}
            metric={selectedMetric}
            metricLabel={metricInfo.label}
            metricUnit={metricInfo.unit}
            color="#3b82f6"
            borderColor="#1d4ed8"
            data={(() => {
              console.log('🔍 About to call transformChartData with:', {
                title,
                resultsData: results.data,
                hasResultsData: !!results.data,
                resultsDataType: typeof results.data,
                resultsDataKeys: results.data ? Object.keys(results.data) : 'N/A',
                sdkLanguage
              })
              return transformChartData(results.data, sdkLanguage)
            })()}
            onRefresh={() => query.refetch()}
            sdkVersion={sdkLanguage}
            sdkName={`${sdkLanguage} SDK`}
            queryInput={input}
            threads={threads}
          />
        )}
        {results.data?.type === 'line' && (
          <>
            <PerformanceGraph
              runId={""}
              data={results.data?.data as any}
              title={title}
              description={description}
              height={400}
            />
            <div className="text-sm text-muted-foreground mt-2">
              Time: All runs are shown starting from time '0' to allow them to be displayed together.
              Mouseover points to see the wallclock times.
            </div>
          </>
        )}
      </div>

      {/* Action buttons - matches Vue Results.vue */}
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
              title="Mainly to debug the backend"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Reloading...' : 'Reload'}
            </Button>

            {results.data?.runs && results.data.runs.length > 0 && (
              <Button
                onClick={toggleShowRuns}
                variant={showRuns ? "default" : "outline"}
                size="sm"
              >
                {showRuns ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide runs
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show runs ({results.data.runs.length})
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Run details table - improved version */}
          {showRuns && results.data?.runs && results.data.runs.length > 0 && (
            <div className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Matched Runs ({results.data.runs.length}):</h4>
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-[140px]">Date & Time</TableHead>
                        <TableHead className="w-[120px]">Run ID</TableHead>
                        <TableHead className="w-[120px]">SDK Version</TableHead>
                        <TableHead className="w-[150px]">Cluster</TableHead>
                        <TableHead className="w-[150px]">Workload</TableHead>
                        <TableHead className="w-[150px]">Vars</TableHead>
                        <TableHead className="text-right w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.data.runs
                        .sort((a: any, b: any) => {
                          // Sort by datetime in descending order (most recent first)
                          const dateA = new Date(a.datetime).getTime()
                          const dateB = new Date(b.datetime).getTime()
                          return dateB - dateA
                        })
                        .map((run: any, index: number) => {
                          const runId = run.run_id || run.id || `Run ${index + 1}`
                          const formatDate = (dateStr: string) => {
                            try {
                              return new Date(dateStr).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZoneName: 'short'
                              })
                            } catch {
                              return dateStr
                            }
                          }

                          return (
                            <TableRow key={runId} className="hover:bg-muted/50">
                              <TableCell className="font-medium text-sm">{formatDate(run.datetime)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {runId.length > 8 ? `${runId.slice(0, 8)}...` : runId}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {run.params?.impl && (
                                  <div className="space-y-1">
                                    <SdkBadge value={run.params.impl.language} />
                                    <VersionBadge
                                      value={run.params.impl.version?.length > 12
                                        ? `${run.params.impl.version.slice(0, 12)}...`
                                        : run.params.impl.version}
                                    />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="p-2">
                                <JsonPopup
                                  data={run.params?.cluster}
                                  title="Cluster Configuration"
                                  triggerText="Cluster"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <JsonPopup
                                  data={run.params?.workload}
                                  title="Workload Configuration"
                                  triggerText="Workload"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <JsonPopup
                                  data={run.params?.vars}
                                  title="Variables Configuration"
                                  triggerText="Variables"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/run/${runId}?metric=${encodeURIComponent(selectedMetric)}`}>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
