"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, RefreshCw, Clock, Download, Share2, Info, Check, Copy, AlertTriangle, ExternalLink } from "lucide-react"
import { toPng } from 'html-to-image'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table"
import AppLayout from "@/src/components/layout/app-layout"
import PerformanceGraph from "@/src/components/shared/performance-graph"
import ObservabilityBox from "@/src/components/shared/observability-box"
import JsonViewer from "@/src/components/shared/json-viewer"
import { formatDate } from "@/src/lib/utils/formatting"
import { RunSummary } from "@/src/types"
import { SdkBadge, ClusterBadge, VersionBadge } from "@/src/components/shared/BadgeSystem"

interface RunDetailClientProps {
  runData: any
  runMetrics: any
  runBuckets: any
}

export default function RunDetailClient({ runData, runMetrics, runBuckets }: RunDetailClientProps) {
  const searchParams = useSearchParams()
  const metric = searchParams.get("metric") || "duration_average_us"
  const sdk = searchParams.get("sdk") || "kotlin"

  const [activeTab, setActiveTab] = useState("overview")
  const [currentUrl, setCurrentUrl] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  // Handle URL on client side to avoid SSR issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  const refreshData = () => {
    window.location.reload()
  }

  const triggerDownload = (filename: string, data: string, mime = 'text/plain') => {
    const blob = new Blob([data], { type: mime })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportJson = () => {
    triggerDownload(`run-${runData.id}.json`, JSON.stringify(runData, null, 2), 'application/json')
  }

  const downloadGraphImage = () => {
    const node = document.getElementById('runGraph')
    if (!node) return
    toPng(node as HTMLElement, { cacheBust: true }).then((dataUrl: string) => {
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `run-${runData.id}-graph.png`
      link.click()
    }).catch(err => console.error('Failed to export graph', err))
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-1">
                  <h4 className="font-medium">Export & Share</h4>
                  <p className="text-sm text-muted-foreground">Select an action</p>
                  <Button size="sm" className="w-full mt-2" onClick={() => copyToClipboard(currentUrl)}>
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" onClick={exportJson}>
                    Export as JSON
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" onClick={downloadGraphImage}>
                    Download Graph Image
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={refreshData} className="gap-1">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh run data</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Run Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Run Details
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Run ID: {runData.run_id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {formatDate(runData.datetime)}
                </Badge>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Share this run</h4>
                      <p className="text-sm text-muted-foreground">
                        Copy the link below to share this run with others:
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={currentUrl}
                          className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                        />
                        <Button
                          size="sm"
                          onClick={() => copyToClipboard(currentUrl)}
                          className="gap-1"
                        >
                          {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedLink ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">SDK Language</p>
                <SdkBadge value={runData.params?.impl?.language || 'Unknown'} size="lg" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">SDK Version</p>
                <VersionBadge value={runData.params?.impl?.version || 'Unknown'} size="lg" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Cluster Version</p>
                <ClusterBadge value={runData.params?.cluster?.version || runData.params?.cluster_version || 'Unknown'} size="lg" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Duration</p>
                <Badge variant="outline" className="text-lg font-semibold px-3 py-1">
                  {runData.params?.vars?.forSeconds || 'Unknown'}s
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Graph - Always Visible */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Performance Graph</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceGraph
              runId={runData.id}
              title="Performance Metrics"
              showAllMetrics={false}
              graphId="runGraph"
            />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white dark:bg-slate-800 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance-runs"> Run Details</TabsTrigger>
            <TabsTrigger value="observability">Observability</TabsTrigger>
            <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Run Parameters</CardTitle>
                </CardHeader>
                <CardContent>
                  <JsonViewer data={runData.params} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Execution Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Started</p>
                      <p className="text-sm">{formatDate(runData.datetime)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Completed
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance-runs">
            <Card>
              <CardHeader>
                <CardTitle>Performance Run Data</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Detailed view of run configuration and parameters
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Display Impl</TableHead>
                        <TableHead>Cluster</TableHead>
                        <TableHead>Workload</TableHead>
                        <TableHead>Vars</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono text-sm">
                          <Link
                            href={`/run/${runData.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {runData.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(runData.datetime)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Version:</p>
                              <VersionBadge value={runData.params?.impl?.version || 'N/A'} />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Language:</p>
                              <SdkBadge value={runData.params?.impl?.language || 'N/A'} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div><strong>Type:</strong> {runData.params?.cluster?.type || 'N/A'}</div>
                            <div><strong>Memory:</strong> {runData.params?.cluster?.memory || 'N/A'}</div>
                            <div><strong>Storage:</strong> {runData.params?.cluster?.storage || 'N/A'}</div>
                            <div>
                              <strong>Version:</strong>
                              <div className="mt-1">
                                <ClusterBadge value={runData.params?.cluster?.version || 'N/A'} />
                              </div>
                            </div>
                            <div><strong>CPU Count:</strong> {runData.params?.cluster?.cpuCount || 'N/A'}</div>
                            <div><strong>Instance:</strong> {runData.params?.cluster?.instance || 'N/A'}</div>
                            <div><strong>Replicas:</strong> {runData.params?.cluster?.replicas || 'N/A'}</div>
                            <div><strong>Topology:</strong> {runData.params?.cluster?.topology || 'N/A'}</div>
                            <div><strong>Node Count:</strong> {runData.params?.cluster?.nodeCount || 'N/A'}</div>
                            <div><strong>Compaction:</strong> {runData.params?.cluster?.compaction || 'N/A'}</div>
                            <div><strong>Connection:</strong> {runData.params?.cluster?.connectionString || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div><strong>Operations:</strong></div>
                            {runData.params?.vars?.operations?.map((op: any, idx: number) => (
                              <div key={idx} className="ml-2">
                                <div><strong>Op:</strong> {op.op || 'N/A'}</div>
                                <div><strong>Bounds:</strong> {JSON.stringify(op.bounds) || 'N/A'}</div>
                                <div><strong>Doc Location:</strong> {JSON.stringify(op.docLocation) || 'N/A'}</div>
                              </div>
                            )) || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div><strong>API:</strong> {runData.params?.vars?.api || 'N/A'}</div>
                            <div><strong>Pool Size:</strong> {runData.params?.vars?.poolSize || 'N/A'}</div>
                            <div><strong>Driver Pool:</strong> {runData.params?.vars?.driverPool || 'N/A'}</div>
                            <div><strong>For Seconds:</strong> {runData.params?.vars?.forSeconds || 'N/A'}</div>
                            <div><strong>Perf Config:</strong> {runData.params?.vars?.perfConfig || 'N/A'}</div>
                            <div><strong>Horizontal Scaling:</strong> {runData.params?.vars?.horizontalScaling || 'N/A'}</div>
                            <div><strong>Concurrency:</strong> {runData.params?.vars?.concurrencyMechanism || 'N/A'}</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="observability">
            <Card>
              <CardHeader>
                <CardTitle>System Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ObservabilityBox runId={runData.run_id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="raw-data">
            <Card>
              <CardHeader>
                <CardTitle>Raw Data</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Complete run data including parameters, metrics, and bucket information
                </p>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="run-data" className="w-full">
                  <TabsList>
                    <TabsTrigger value="run-data">Run Data</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="buckets">Buckets</TabsTrigger>
                  </TabsList>
                  <TabsContent value="run-data">
                    <JsonViewer data={runData} />
                  </TabsContent>
                  <TabsContent value="metrics">
                    <JsonViewer data={runMetrics} />
                  </TabsContent>
                  <TabsContent value="buckets">
                    <JsonViewer data={runBuckets} />
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
