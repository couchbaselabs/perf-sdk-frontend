"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/src/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table"
import { Badge } from "@/src/components/ui/badge"
import { ChevronLeft, ArrowRight, Clock, Globe, ExternalLink, Info } from "lucide-react"
import Link from "next/link"
import AppLayout from "@/src/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import { SituationalRun } from "@/src/types/entities"
import { getStatusColor, getEnvironmentBadgeVariant, getScoreBadgeColor } from "@/src/lib/utils/status"
import { getSdkColorByLanguage } from "@/src/lib/sdk-version-service"
import { MixedProperty } from "@/app/situational/ui-helpers"
import {
  UnifiedBadge,
  SdkBadge,
  VersionBadge,
  EnvironmentBadge,
  ScoreBadge,
  StatusBadge,
  CspBadge,
  ClusterBadge,
  PrivateLinkBadge
} from "@/src/components/shared/BadgeSystem"
import JsonViewer from "@/src/components/shared/json-viewer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { generateS3ConsoleUrl, S3_CONFIG } from "@/src/lib/utils/s3-utils"
import React from "react"


/**
 * Normalize SDK values from DB format to sidebar language keys.
 * E.g., "COLUMNAR_SDK_GO" → "go", "java-sdk" → "java", "Go" → "go"
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

export default function SituationalRunDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle both Promise and regular params for Next.js compatibility
  const resolvedParams = React.useMemo(() => {
    if (params instanceof Promise) {
      throw new Error('Promise params not supported in this React version. Use async component instead.')
    }
    return params
  }, [params])
  const [runs, setRuns] = useState<any[]>([])
  const [situationalRun, setSituationalRun] = useState<SituationalRun | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Remove mock generation; fetch real runs for this situational id

  useEffect(() => {
    let cancelled = false
    const fetchDetails = async () => {
      try {
        setIsLoading(true)
        const [runsRes] = await Promise.all([
          fetch(`/api/situational/${resolvedParams.id}/runs`, { cache: 'no-store' }),
        ])

        const runsPayload = runsRes.ok ? await runsRes.json() : { data: [] as any[] }
        if (cancelled) return
        const runsData = Array.isArray(runsPayload) ? runsPayload : (runsPayload?.data ?? [])
        setRuns(runsData)

        // Derive situationalRun summary from the runs
        const sdkValues: string[] = Array.from(new Set(runsData.map((r: any) => r.sdk).filter(Boolean)))
        const versionValues: string[] = Array.from(new Set(runsData.map((r: any) => r.version).filter(Boolean)))
        const cspValues: string[] = Array.from(new Set(runsData.map((r: any) => r.csp).filter(Boolean)))
        const clusterValues: string[] = Array.from(new Set(runsData.map((r: any) => r.clusterVersion).filter(Boolean)))
        const envValues: string[] = Array.from(new Set(runsData.map((r: any) => r.environment).filter(Boolean)))
        const started = runsData[0]?.started || new Date().toISOString()
        const score = runsData.length ? Math.round(runsData.reduce((a: number, r: any) => a + (r.score ?? 0), 0) / runsData.length) : 0

        const summary: SituationalRun = {
          id: resolvedParams.id,
          started,
          datetime: started,
          score,
          runs: runsData.length,
          sdk: sdkValues.length <= 1 ? (sdkValues[0] || 'unknown') : sdkValues,
          version: versionValues.length <= 1 ? (versionValues[0] || 'unknown') : versionValues,
          description: `Run details for ${resolvedParams.id}`,
          csp: cspValues.length <= 1 ? (cspValues[0] || 'Unknown') : cspValues,
          privateLink: '',
          pl: false,
          clusterVersion: clusterValues.length <= 1 ? (clusterValues[0] || 'unknown') : clusterValues,
          environment: envValues[0] || 'Development',
        }
        setSituationalRun(summary)

        // Add SDK to URL if not already present (for sidebar highlighting)
        const detectedSdk = Array.isArray(summary.sdk) ? summary.sdk[0] : summary.sdk
        const normalizedSdk = normalizeDetectedSdk(detectedSdk || '')
        const currentUrlSdk = searchParams?.get('sdk') || ''
        if (normalizedSdk && normalizedSdk !== currentUrlSdk) {
          // Use replace to avoid adding to history
          router.replace(`/situational/${resolvedParams.id}?sdk=${normalizedSdk}`)
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to load situational run details:', e)
          setRuns([])
          setSituationalRun({
            id: resolvedParams.id,
            started: new Date().toISOString(),
            datetime: new Date().toISOString(),
            score: 0,
            runs: 0,
            sdk: 'unknown',
            version: 'unknown',
            description: `Run details for ${resolvedParams.id}`,
            csp: 'Unknown',
            privateLink: '',
            pl: false,
            clusterVersion: 'unknown',
            environment: 'Development',
          })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchDetails()
    return () => { cancelled = true }
  }, [resolvedParams.id, searchParams, router])

  // (Removed legacy mock-based effect)


  // Using shared getScoreBadgeColor from @/lib/utils/status


  // renderMixedProperty and isMixedProperty functions removed - using MixedProperty component from ui-helpers.tsx instead

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

  if (!situationalRun) {
    return <AppLayout>Situational Run not found.</AppLayout>
  }

  const startedDate = new Date(situationalRun.started)
  const now = new Date()
  const timeDifference = now.getTime() - startedDate.getTime()
  const hours = Math.floor(timeDifference / (1000 * 60 * 60))
  const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <AppLayout>
      <div className="container mx-auto py-10">
        <div className="mb-4">
          <Link href="/situational">
            <Button variant="ghost">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Situational Runs
            </Button>
          </Link>
        </div>

        {/* Observability Box */}
        <Card className="mb-6 border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 to-indigo-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-600" />
              Observability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-slate-600">Access detailed observability data for this situational run.</p>
              <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300" asChild>
                <a
                  href={generateS3ConsoleUrl(resolvedParams.id, S3_CONFIG.DEFAULT_BUCKET, S3_CONFIG.DEFAULT_REGION)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View in AWS S3 <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full border-slate-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
            <CardTitle className="text-2xl font-bold text-slate-800">{`Situational Run ${situationalRun.id}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {/* 
                <div className="mb-4">
                  <p className="text-gray-500 mb-2">Environment:</p>
                  <EnvironmentBadge value={situationalRun.environment} />
                </div>
                */}
                <div className="mb-4">
                  <p className="text-gray-500 mb-2">Score:</p>
                  <ScoreBadge value={situationalRun.score} size="lg" />
                </div>

                {/* SDK & Version section */}
                <div className="mb-4">
                  <p className="text-gray-500 mb-2">SDK:</p>
                  <MixedProperty value={situationalRun.sdk} asBadge badgeType="sdk" />
                </div>

                <div className="mb-4">
                  <p className="text-gray-500 mb-2">Version:</p>
                  <MixedProperty value={situationalRun.version} asBadge badgeType="version" />
                </div>

                {/* 
                <div className="mb-4">
                  <p className="text-gray-500 mb-2">CSP:</p>
                  <MixedProperty value={situationalRun.csp} asBadge badgeType="csp" />
                </div>
                */}
              </div>

              <div>
                {/* Cluster Version section */}
                <div className="mb-4">
                  <p className="text-gray-500 mb-2">Cluster Version:</p>
                  <MixedProperty value={situationalRun.clusterVersion} asBadge badgeType="cluster" />
                </div>

                <div className="mb-4">
                  <p className="text-gray-500 mb-2">Runs: {situationalRun.runs}</p>
                </div>

                <div className="mb-4">
                  <p className="text-gray-500 mb-2">Private Link:</p>
                  <PrivateLinkBadge value={situationalRun.pl} />
                </div>

                <div className="mb-4">
                  <p className="text-gray-500 mb-2">
                    Started: {startedDate.toLocaleDateString()} {startedDate.toLocaleTimeString()}
                  </p>
                  <p className="text-gray-500 text-sm">
                    <Clock className="inline-block h-3 w-3 mr-1" />
                    {hours}h {minutes}m ago
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Individual Runs</h2>
          {runs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Started</TableHead>
                  {/* <TableHead>Environment</TableHead> */}
                  <TableHead>SDK</TableHead>
                  <TableHead>Version</TableHead>
                  {/* <TableHead>CSP</TableHead> */}
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run: any) => {
                  const runStartedDate = new Date(run.started)
                  return (
                    <TableRow key={run.id} className="hover:bg-slate-50">
                      <TableCell>{run.description}</TableCell>
                      <TableCell>
                        {runStartedDate.toLocaleDateString()} {runStartedDate.toLocaleTimeString()}
                      </TableCell>
                      {/* 
                      <TableCell>
                        <EnvironmentBadge value={run.environment} />
                      </TableCell>
                      */}
                      <TableCell>
                        <SdkBadge value={run.sdk} />
                      </TableCell>
                      <TableCell>
                        <VersionBadge value={run.version} />
                      </TableCell>
                      {/* 
                      <TableCell>
                        <CspBadge value={run.csp} />
                      </TableCell>
                      */}
                      <TableCell>
                        <StatusBadge value={run.status} />
                      </TableCell>
                      <TableCell>
                        <ScoreBadge value={run.score} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/situational/${resolvedParams.id}/run/${run.id}`}>
                          <Button size="sm">
                            View Details
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-md">
              <p className="text-gray-500">No individual runs found for this situational run.</p>
            </div>
          )}
        </div>

        {/* Configuration Tab */}
        <div className="mt-8">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="formatted" className="w-full">
                <TabsList className="w-full grid grid-cols-2 h-12 p-1 bg-slate-50 rounded-md mb-6">
                  <TabsTrigger
                    value="formatted"
                    className="text-sm py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    Formatted View
                  </TabsTrigger>
                  <TabsTrigger
                    value="raw"
                    className="text-sm py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    Raw JSON
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="formatted" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Run Information</h3>
                      <dl className="grid grid-cols-1 gap-3">
                        <div className="flex flex-col">
                          <dt className="text-sm text-muted-foreground">Run ID</dt>
                          <dd className="font-mono text-sm">{situationalRun.id}</dd>
                        </div>
                        {/* 
                        <div className="flex flex-col">
                          <dt className="text-sm text-muted-foreground">Environment</dt>
                          <dd>
                            <EnvironmentBadge value={situationalRun.environment} />
                          </dd>
                        </div>
                        */}
                        <div className="flex flex-col">
                          <dt className="text-sm text-muted-foreground">Score</dt>
                          <dd>
                            <ScoreBadge value={situationalRun.score} />
                          </dd>
                        </div>
                        <div className="flex flex-col">
                          <dt className="text-sm text-muted-foreground">SDK</dt>
                          <dd><MixedProperty value={situationalRun.sdk} asBadge badgeType="sdk" /></dd>
                        </div>
                        <div className="flex flex-col">
                          <dt className="text-sm text-muted-foreground">Version</dt>
                          <dd><MixedProperty value={situationalRun.version} asBadge badgeType="version" /></dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
                      <dl className="grid grid-cols-1 gap-3">
                        {/* 
                        <div className="flex flex-col">
                          <dt className="text-sm text-muted-foreground">CSP</dt>
                          <dd><MixedProperty value={situationalRun.csp} asBadge badgeType="csp" /></dd>
                        </div>
                        */}
                        <div className="flex flex-col">
                          <dt className="text-sm text-muted-foreground">Cluster Version</dt>
                          <dd><MixedProperty value={situationalRun.clusterVersion} asBadge badgeType="cluster" /></dd>
                        </div>
                        <div className="flex flex-col">
                          <dt className="text-sm text-muted-foreground">Runs</dt>
                          <dd>{situationalRun.runs}</dd>
                        </div>
                        <div className="flex flex-col">
                          <dt className="text-sm text-muted-foreground">Private Link</dt>
                          <dd>
                            <PrivateLinkBadge value={situationalRun.pl} />
                          </dd>
                        </div>
                        <div className="flex flex-col">
                          <dt className="text-sm text-muted-foreground">Started</dt>
                          <dd>
                            {startedDate.toLocaleDateString()} {startedDate.toLocaleTimeString()}
                            <p className="text-gray-500 text-sm">
                              <Clock className="inline-block h-3 w-3 mr-1" />
                              {hours}h {minutes}m ago
                            </p>
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="raw" className="mt-0">
                  <JsonViewer
                    data={situationalRun}
                    title="Situational Run Configuration"
                    downloadFileName={`situational-run-${situationalRun.id}.json`}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}