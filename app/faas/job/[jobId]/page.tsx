"use client"

import React, { useEffect, useState, use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Badge } from '@/src/components/ui/badge'
import { Button } from '@/src/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table'
import { Alert, AlertDescription } from '@/src/components/ui/alert'
import { ArrowLeft, Calendar, Code, Layers, BarChart3, TestTube, ExternalLink, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import AppLayout from "@/src/components/layout/app-layout"
import { FaasJob, Run as PerformanceRun, SituationalRun } from '@/src/types'
import { apiClient } from '@/src/lib/api-client-unified'
import { formatDateShort } from '@/src/lib/utils/formatting'
import { getSDKFromTags } from '@/src/lib/utils/sdk'

// Helper function to determine SDK from tags

export default function FaasJobDetailPage({ params }: { params: Promise<{ jobId: string }> | { jobId: string } }) {
  const resolvedParams = params instanceof Promise ? use(params) : params
  const { jobId } = resolvedParams
  const [faasJob, setFaasJob] = useState<FaasJob | null>(null)
  const [performanceRuns, setPerformanceRuns] = useState<PerformanceRun[]>([])
  const [situationalRuns, setSituationalRuns] = useState<SituationalRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadJobDetails = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch FaaS job metadata
        const faasResponse = await fetch('/api/faas/jobs')
        if (!faasResponse.ok) {
          throw new Error('Failed to fetch FaaS jobs')
        }
        const faasJobs = await faasResponse.json()
        const job = faasJobs.find((j: any) => j.id === jobId)
        
        if (!job) {
          throw new Error('FaaS job not found')
        }
        
        setFaasJob(job)

        // Fetch related runs using the proper database relationships
        const runsResponse = await fetch(`/api/faas/jobs/${jobId}/runs`)
        if (runsResponse.ok) {
          const runsData = await runsResponse.json()
          setPerformanceRuns(runsData.performanceRuns || [])
          setSituationalRuns(runsData.situationalRuns || [])
        } else {
          console.warn('No runs found for this FaaS job or API not available')
        }

      } catch (err) {
        console.error('Error loading job details:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    loadJobDetails()
  }, [jobId])


  const getTypeColor = (type: string) => {
    switch (type) {
      case 'performance': return 'bg-green-100 text-green-800 border-green-200'
      case 'situational': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getOperationSummary = (params: any) => {
    try {
      const operations = params?.workload?.operations || []
      if (operations.length === 0) return 'No operations defined'
      if (operations.length === 1) return operations[0].op || 'Unknown operation'
      return `${operations[0].op} +${operations.length - 1} more`
    } catch (e) {
      return 'Unknown operations'
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading FaaS job details...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !faasJob) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/faas/jobs">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Jobs
              </Button>
            </Link>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'FaaS job not found'}. Please check the job ID and try again.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-6">
          <Link href="/faas/jobs">
            <Button variant="outline" size="sm" className="mt-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">FaaS Job Details</h1>
                <p className="text-muted-foreground mt-1">
                  {faasJob.id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${getTypeColor(faasJob.job_type)} text-sm`}>
                  {faasJob.job_type}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {getSDKFromTags(faasJob.tags || [])}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Job Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{formatDateShort(faasJob.datetime as any)}</p>
                <p className="text-sm text-muted-foreground">{new Date(faasJob.datetime as any).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-4 w-4" />
                SDK & Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">SDK</p>
                  <Badge variant="outline">{getSDKFromTags(faasJob.tags || [])}</Badge>
                </div>
                {(faasJob.tags ?? []).length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {(faasJob.tags ?? []).map((tag) => (
                        <Link key={tag} href={`/faas/tag/${encodeURIComponent(tag)}`}>
                          <Badge variant="outline" className="text-xs hover:bg-blue-50 cursor-pointer">
                            {tag}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Run Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Performance Runs:</span>
                  <span className="font-semibold">{performanceRuns.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Situational Runs:</span>
                  <span className="font-semibold">{situationalRuns.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Runs:</span>
                  <span className="font-semibold">{performanceRuns.length + situationalRuns.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Runs */}
        {performanceRuns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Runs ({performanceRuns.length})
              </CardTitle>
              <CardDescription>
                Performance test runs associated with this FaaS job
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Run ID</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold">SDK Version</TableHead>
                      <TableHead className="font-semibold">Operations</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceRuns.map((run) => (
                      <TableRow key={run.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium">
                          <Link href={`/run/${run.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                            {run.id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{formatDateShort(run.datetime as any)}</span>
                            <span className="text-xs text-gray-500">{new Date(run.datetime as any).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {(run as any).params?.impl?.version || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getOperationSummary((run as any).params)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/run/${run.id}`}>
                            <Button size="sm" className="gap-1">
                              View Run
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Situational Runs */}
        {situationalRuns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Situational Runs ({situationalRuns.length})
              </CardTitle>
              <CardDescription>
                Situational test runs associated with this FaaS job
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Run ID</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold">SDK Version</TableHead>
                      <TableHead className="font-semibold">Operations</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {situationalRuns.map((run) => (
                      <TableRow key={run.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium">
                          <Link href={`/situational/run/${run.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                            {run.id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{formatDateShort(run.datetime as any)}</span>
                            <span className="text-xs text-gray-500">{new Date(run.datetime as any).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {(run as any).params?.impl?.version || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getOperationSummary((run as any).params)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/situational/run/${run.id}`}>
                            <Button size="sm" className="gap-1">
                              View Run
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Runs Found */}
        {performanceRuns.length === 0 && situationalRuns.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No performance or situational runs found associated with this FaaS job. This may be a metadata-only job or the runs may be stored in a different timeframe.
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Details */}
        {faasJob.config && Object.keys(faasJob.config).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Configuration
              </CardTitle>
              <CardDescription>
                FaaS job configuration details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(faasJob.config, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
} 