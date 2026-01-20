"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/src/components/ui/button"
import { useCallback } from "react"
import { Badge } from "@/src/components/ui/badge"
import { ChevronLeft, Clock, Download, Share2, HelpCircle, Info, RefreshCw, Code, Copy, Check, AlertTriangle, ExternalLink } from "lucide-react"
import { toPng } from 'html-to-image'
import Link from "next/link"
import AppLayout from "@/src/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/src/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import PerformanceGraph from "@/src/components/shared/performance-graph"
import ObservabilityBox from "@/src/components/shared/observability-box"
import JsonViewer from "@/src/components/shared/json-viewer"
import { getStatusColor, getEnvironmentBadgeVariant, getScoreBadgeColor } from "@/src/lib/utils/status"
import { getSdkColorByLanguage } from "@/src/lib/sdk-version-service"
import { SdkBadge, VersionBadge, EnvironmentBadge, ScoreBadge, StatusBadge } from "@/src/components/shared/BadgeSystem"
import { formatDate } from "@/src/lib/utils/formatting"
// Remove all mock generators and use real DB-backed API

import { generateUuid } from "@/src/lib/core-ui-utilities"

// Using shared getScoreBadgeColor from @/src/lib/utils/status

/**
 * Normalize SDK values from DB format to sidebar language keys.
 */
function normalizeDetectedSdk(sdkValue: string): string {
  if (!sdkValue || sdkValue === 'unknown') return ''
  const v = sdkValue.toUpperCase()
  if (v.startsWith('COLUMNAR_SDK_')) {
    const lang = v.replace('COLUMNAR_SDK_', '').toLowerCase()
    return lang === 'nodejs' ? 'node' : lang
  }
  if (sdkValue.endsWith('-sdk')) {
    return sdkValue.replace('-sdk', '').toLowerCase()
  }
  return sdkValue.toLowerCase()
}

export default function SituationalRunDetailPage({
  params,
}: {
  params: { id: string; runId: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resolvedParams = params
  const [runData, setRunData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [copiedLink, setCopiedLink] = useState(false)

  // No local mock data

  useEffect(() => {
    // Fetch real run details timeseries and events
    const fetchRunDetails = async () => {
      setIsLoading(true)

      try {
        const res = await fetch(`/api/situational/${resolvedParams.id}/run/${resolvedParams.runId}`, { cache: 'no-store' })
        const payload = res.ok ? await res.json() : { success: false, data: { runDetails: { runs: [] }, events: [], errorsSummary: [] } }
        const data = payload?.data || { runDetails: { runs: [] }, events: [], errorsSummary: [] }

        // Extract run details from the API response (matches Vue structure)
        const runDetails = data.runDetails?.runs?.[0]
        const runParams = runDetails?.runParams || {}
        const srjParams = runDetails?.srjParams || {}

        // Compose runData object using actual API data
        const transformed: any[] = []

        setRunData({
          id: resolvedParams.runId,
          description: runParams?.workload?.situational || `Run details for ${resolvedParams.runId}`,
          started: runDetails?.started || runDetails?.datetime || new Date().toISOString(),
          environment: runParams?.vars?.environment || runParams?.debug?.environment || 'Unknown',
          sdk: runParams?.impl?.language || 'unknown',
          version: runParams?.impl?.version || 'unknown',
          csp: runParams?.vars?.csp || runParams?.debug?.csp || 'Unknown',
          status: 'completed',
          score: Number(srjParams?.score) || 0,
          scoreReasons: srjParams?.reasons || [],
          transformedMetrics: transformed,
          metrics: {},
          cluster: runParams?.cluster || {},
          workload: runParams?.workload || {},
          events: data.events || [],
          errorsSummary: data.errorsSummary || [],
          ciUrl: runParams?.debug?.ciUrl,
          openShiftProject: runParams?.debug?.openShiftProject,
          situationalRunId: resolvedParams.id,
        })

        // Add SDK to URL if not already present (for sidebar highlighting)
        const detectedSdk = runParams?.impl?.language || ''
        const normalizedSdk = normalizeDetectedSdk(detectedSdk)
        const currentUrlSdk = searchParams?.get('sdk') || ''
        if (normalizedSdk && normalizedSdk !== currentUrlSdk) {
          router.replace(`/situational/${resolvedParams.id}/run/${resolvedParams.runId}?sdk=${normalizedSdk}`)
        }
      } catch (error) {
        console.error("Error fetching run details:", error)
        // Create a minimal fallback run data object
        setRunData({
          id: resolvedParams.runId,
          description: "Error loading run details",
          started: new Date().toISOString(),
          environment: "Unknown",
          sdk: "Unknown",
          version: "Unknown",
          status: "unknown",
          score: 0,
          metrics: {},
          cluster: {},
          workload: {},
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchRunDetails()
  }, [resolvedParams.id, resolvedParams.runId])

  // Format date for display

  // Get status color


  // Prepare clean JSON data for display (remove circular references and internal properties)
  const getCleanJsonData = () => {
    if (!runData) return {}

    // Create a deep copy of the run data
    const cleanData = JSON.parse(JSON.stringify(runData))

    // Remove internal properties we don't want to show in the raw JSON view
    delete cleanData.transformedMetrics

    // If detailedMetrics exists and is large, summarize it
    if (cleanData.detailedMetrics) {
      const metricKeys = Object.keys(cleanData.detailedMetrics)
      metricKeys.forEach((key) => {
        if (Array.isArray(cleanData.detailedMetrics[key]) && cleanData.detailedMetrics[key].length > 10) {
          // Keep only first 3 and last 3 items for readability
          const originalLength = cleanData.detailedMetrics[key].length
          cleanData.detailedMetrics[key] = [
            ...cleanData.detailedMetrics[key].slice(0, 3),
            { x: "...", y: "..." },
            ...cleanData.detailedMetrics[key].slice(originalLength - 3),
          ]
        }
      })
    }

    return cleanData
  }

  // Handler to copy current page URL to clipboard
  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error('Failed to copy link', err)
    }
  }

  // Utility to trigger a browser download for a given filename + data string
  const triggerDownload = (filename: string, data: string, mime = "text/plain") => {
    const blob = new Blob([data], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export run data as JSON
  const exportJson = () => {
    const jsonStr = JSON.stringify(getCleanJsonData(), null, 2)
    triggerDownload(`run-${runData.id}.json`, jsonStr, "application/json")
  }

  // Download graph image using html-to-image
  const downloadGraphImage = () => {
    const node = document.getElementById('runGraph')
    if (!node) return
    toPng(node as HTMLElement, { cacheBust: true })
      .then((dataUrl: string) => {
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `run-${runData.id}-graph.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
      .catch((err: unknown) => console.error('Failed to export graph image', err))
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-10">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!runData) {
    return <AppLayout>Run not found.</AppLayout>
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-6 max-w-7xl">
        {/* Header with navigation and actions */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/situational/${resolvedParams.id}`}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Situational Run
              </Link>
            </Button>
            <div className="flex items-center gap-2">

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-1">
                    <h4 className="font-medium">Share Run</h4>
                    <p className="text-sm text-muted-foreground">Copy link to this run</p>
                    <Button size="sm" className="w-full mt-2" onClick={handleCopyLink}>
                      {copiedLink ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-1">
                    <h4 className="font-medium">Export Data</h4>
                    <p className="text-sm text-muted-foreground">Download run data in various formats</p>
                    <div className="flex flex-col gap-2 mt-2">
                      <Button size="sm" variant="outline" className="w-full" onClick={exportJson}>
                        Export as JSON
                      </Button>
                      <Button size="sm" variant="outline" className="w-full" onClick={downloadGraphImage}>
                        Download Graph Image
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Run Details</h1>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <span className="font-mono">{runData.id}</span>
              <VersionBadge value={`v${runData.version}`} />
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDate(runData.started)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key metrics summary */}
        <div className={`grid grid-cols-1 gap-4 mb-6 ${runData.environment === 'Unknown' ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(runData.status)}>{runData.status}</Badge>
            </CardContent>
          </Card>

          {runData.environment !== 'Unknown' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Environment</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={`${getEnvironmentBadgeVariant(runData.environment)} shadow-sm`} variant="secondary">
                  {runData.environment}
                </Badge>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">SDK</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <SdkBadge value={runData.sdk} />
                <VersionBadge value={runData.version} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Score</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`font-mono text-lg px-4 py-2 border-2 transition-all duration-200 ${getScoreBadgeColor(runData.score)}`}>
                {runData.score}
              </Badge>
              {runData.scoreReasons && runData.scoreReasons.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Scoring Details:</p>
                  <ul className="text-sm space-y-1">
                    {runData.scoreReasons.map((reason: string, index: number) => (
                      <li key={index} className="text-muted-foreground">• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Debug Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Situational Run ID:</span>{" "}
                  <span className="font-mono text-muted-foreground">{runData.situationalRunId}</span>
                </div>
                <div>
                  <span className="font-medium">Run ID:</span>{" "}
                  <span className="font-mono text-muted-foreground">{runData.id}</span>
                </div>
                {runData.ciUrl && runData.ciUrl !== 'not-available' && (
                  <div>
                    <span className="font-medium">CI Job:</span>{" "}
                    <a href={runData.ciUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      View CI Job
                    </a>
                  </div>
                )}
                {runData.openShiftProject && (
                  <div>
                    <span className="font-medium">OpenShift Project:</span>{" "}
                    <span className="font-mono text-muted-foreground">{runData.openShiftProject}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Errors Summary */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Errors Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {runData.errorsSummary && runData.errorsSummary.length > 0 ? (
                <div className="space-y-3">
                  {runData.errorsSummary.map((error: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-red-50 border-red-200">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="destructive" className="text-xs">
                          Count: {error.count}
                        </Badge>
                      </div>
                      <div className="relative">
                        <div className="max-h-64 overflow-auto bg-red-100 rounded-md p-3 border border-red-200">
                          <pre className="text-xs text-red-700 whitespace-pre-wrap break-words leading-relaxed">
                            {JSON.stringify(error.first, null, 2)}
                          </pre>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-200"
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(error.first, null, 2))
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-green-600 font-medium">No errors detected!</p>
                  <p className="text-sm text-muted-foreground mt-1">This run completed successfully without any errors.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Graph: let component fetch real buckets+metrics by runId; default to 3 metrics */}
        <PerformanceGraph
          runId={runData.id}
          title="Performance Over Time"
          description="Visualize key metrics over the duration of the run"
          events={runData.events}
          showAllMetrics={false}
          height={400}
          graphId="runGraph"
        />

        {/* Tabs for additional information */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="w-full grid grid-cols-3 h-12 p-0 bg-slate-50 rounded-md">
            <TabsTrigger
              value="overview"
              className="rounded-none data-[state=active]:bg-white data-[state=active]:shadow-none h-12 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="rounded-none data-[state=active]:bg-white data-[state=active]:shadow-none h-12 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Events
            </TabsTrigger>
            <TabsTrigger
              value="configuration"
              className="rounded-none data-[state=active]:bg-white data-[state=active]:shadow-none h-12 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Run Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <dt className="text-sm text-muted-foreground">Run ID</dt>
                      <dd className="font-mono text-sm">{runData.id}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-sm text-muted-foreground">Description</dt>
                      <dd>{runData.description}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-sm text-muted-foreground">Date & Time</dt>
                      <dd>{formatDate(runData.started)}</dd>
                    </div>
                    {runData.environment !== 'Unknown' && (
                      <div className="flex flex-col">
                        <dt className="text-sm text-muted-foreground">Environment</dt>
                        <dd>
                          <Badge className={`${getEnvironmentBadgeVariant(runData.environment)} shadow-sm`} variant="secondary">
                            {runData.environment}
                          </Badge>
                        </dd>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <dt className="text-sm text-muted-foreground">SDK</dt>
                      <dd>
                        <SdkBadge value={runData.sdk} />
                      </dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-sm text-muted-foreground">Version</dt>
                      <dd>
                        <VersionBadge value={runData.version} />
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <ObservabilityBox
                runId={runData.id}
                situationalRunId={runData.situationalRunId}
              />
            </div>
          </TabsContent>

          {/* Metrics tab removed */}

          <TabsContent value="events" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Run Events</CardTitle>
                {/* Export Events button removed */}
              </CardHeader>
              <CardContent>
                {runData.events && runData.events.length > 0 ? (
                  <EventsTable events={runData.events} />
                ) : (
                  <div className="text-center p-8 text-muted-foreground">No events recorded for this run.</div>
                )}
              </CardContent>
              <CardFooter className="bg-slate-50 border-t">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Info className="h-4 w-4 mr-2" />
                  Events are recorded automatically during the run
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="configuration" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
                <CardDescription>View the configuration details for this run</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="formatted" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 mb-4">
                    <TabsTrigger value="formatted">Formatted View</TabsTrigger>
                    <TabsTrigger value="raw-json">Raw JSON</TabsTrigger>
                  </TabsList>

                  <TabsContent value="formatted">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium mb-4">Cluster Configuration</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="font-medium">{runData.cluster?.type || "unmanaged"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Version:</span>
                            <span className="font-medium">{runData.cluster?.version || "7.1.1-3175-enterprise"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Nodes:</span>
                            <span className="font-medium">{runData.cluster?.nodeCount || 4}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Memory:</span>
                            <span className="font-medium">{runData.cluster?.memory || 28000} MB</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">CPU Count:</span>
                            <span className="font-medium">{runData.cluster?.cpuCount || 16}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Storage:</span>
                            <span className="font-medium">{runData.cluster?.storage || "couchstore"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Replicas:</span>
                            <span className="font-medium">{runData.cluster?.replicas || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium mb-4">Workload Configuration</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Operation:</span>
                            <span className="font-medium">{runData.workload?.operations?.[0]?.op || "get"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-medium">
                              {runData.workload?.variables?.forSeconds || 300} seconds
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Pool Size:</span>
                            <span className="font-medium">{runData.workload?.variables?.poolSize || 10000}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Pool Strategy:</span>
                            <span className="font-medium">
                              {runData.workload?.operations?.[0]?.docLocation?.poolSelectionStrategy || "randomUniform"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">API:</span>
                            <span className="font-medium">{runData.workload?.variables?.api || "DEFAULT"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Horizontal Scaling:</span>
                            <span className="font-medium">{runData.workload?.variables?.horizontalScaling || 20}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Driver Version:</span>
                            <span className="font-medium">{runData.workload?.variables?.driverVer || 6}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="raw-json">
                    <div className="flex items-center gap-2 mb-4">
                      <Code className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-sm font-medium">Raw JSON Configuration</h3>
                    </div>
                    <JsonViewer
                      data={getCleanJsonData()}
                      title="Run Configuration"
                      downloadFileName={`run-${runData.id}.json`}
                      className="max-h-[600px]"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

// Helper component for events table
function EventsTable({ events }: { events: any[] }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const toggle = useCallback((idx: number) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }, [])

  const colorForType = (t?: string) => {
    if (!t) return 'bg-gray-400'
    if (t.includes('error')) return 'bg-red-500'
    if (t.includes('start')) return 'bg-green-500'
    if (t.includes('resolve') || t.includes('complete')) return 'bg-blue-500'
    if (t.includes('checkpoint')) return 'bg-amber-500'
    return 'bg-slate-400'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Time</th>
            <th className="py-2 pr-4">+Secs</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2">Details</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, idx) => {
            const type = e?.params?.type || e?.params?.event || 'event'
            return (
              <>
                <tr
                  key={idx}
                  className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
                  onClick={() => toggle(idx)}
                >
                  <td className="py-2 pr-4 whitespace-nowrap font-mono">{new Date(e.datetime).toISOString()}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{e.timeOffsetSecs ?? ''}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full inline-block ${colorForType(type)}`} />
                      {type}
                    </div>
                  </td>
                  <td className="py-2 text-muted-foreground">{expanded[idx] ? 'Click to collapse' : 'Click to expand'}</td>
                </tr>
                {expanded[idx] && (
                  <tr key={`details-${idx}`} className="border-b last:border-0 bg-slate-50">
                    <td colSpan={4} className="py-2 px-4">
                      <pre className="whitespace-pre-wrap break-words leading-relaxed text-xs max-w-full">
                        {JSON.stringify(e.params, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
