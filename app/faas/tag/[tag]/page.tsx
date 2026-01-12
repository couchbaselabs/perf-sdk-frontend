"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { Input } from "@/src/components/ui/input"
import { Search } from "lucide-react"
import Link from "next/link"
import AppLayout from "@/src/components/layout/app-layout"
import { FaasJob } from '@/src/types'
import { formatDateShort } from "@/src/lib/utils/formatting"
import { getStatusColor } from "@/src/components/shared/BadgeSystem"
import { getSDKFromTags } from "@/src/lib/utils/sdk"
import { apiClient } from '@/src/lib/api-client-unified'
import { Button } from '@/src/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table'
import { Alert, AlertDescription } from '@/src/components/ui/alert'
import { ArrowLeft, Calendar, Code, Layers, BarChart3, TestTube, Clock, ExternalLink, TrendingUp } from 'lucide-react'

interface TagStats {
  totalJobs: number
  totalPerformanceRuns: number
  totalSituationalRuns: number
  uniqueSDKs: string[]
  uniqueWorkloads: string[]
  jobStatuses: Record<string, number>
  latestJobDate: string
  averagePerformanceRuns: number
  averageSituationalRuns: number
}

// Updated interface to match actual database structure
interface DatabaseFaasJob {
  id: string
  job_type: string
  datetime: string
  config: any
  tags: string[]
}

// Helper function to determine SDK from tags

export default function FaasTagPage({ params }: { params: Promise<{ tag: string }> | { tag: string } }) {
  const resolvedParams = params instanceof Promise ? React.use(params) : params
  const tag = decodeURIComponent(resolvedParams.tag)
  const [jobs, setJobs] = useState<DatabaseFaasJob[]>([])
  const [tagStats, setTagStats] = useState<TagStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadTagData = async () => {
      try {
        setIsLoading(true)
        // Use real database data service with proper async call
        const response = await apiClient.getFaasJobs({ tag, limit: 1000 })
        const filteredJobs = response.success ? response.data.data : []
        
        // Calculate comprehensive stats from the actual database structure
        const stats: TagStats = {
          totalJobs: filteredJobs.length,
          totalPerformanceRuns: filteredJobs.filter(job => (job as any).job_type === 'performance').length,
          totalSituationalRuns: filteredJobs.filter(job => (job as any).job_type === 'situational').length,
          uniqueSDKs: [], // Will be populated from tag prefixes
          uniqueWorkloads: [], // Will be extracted from config if available
          jobStatuses: filteredJobs.reduce((acc, job) => {
            // Assume completed status for existing jobs
            acc['completed'] = (acc['completed'] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          latestJobDate: filteredJobs.length > 0 ? 
            filteredJobs.sort((a, b) => new Date((b as any).datetime || b.created_at).getTime() - new Date((a as any).datetime || a.created_at).getTime())[0]?.created_at || (filteredJobs[0] as any).datetime : '',
          averagePerformanceRuns: 0, // Not applicable with current structure
          averageSituationalRuns: 0 // Not applicable with current structure
        }

        // Extract SDKs from tags
        const sdks = new Set<string>()
        filteredJobs.forEach(job => {
          (job.tags || []).forEach(jobTag => {
            const sdk = getSDKFromTags([jobTag])
            if (sdk !== 'Unknown') {
              sdks.add(sdk)
            }
          })
        })
        stats.uniqueSDKs = Array.from(sdks)

        setJobs(filteredJobs as any)
        setTagStats(stats)
      } catch (error) {
        console.error('Error loading tag data:', error)
        setJobs([])
        setTagStats(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadTagData()
  }, [tag])



  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading tag data...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-start gap-6">
          <Link href="/faas/tags">
            <Button variant="outline" size="sm" className="mt-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tags
            </Button>
          </Link>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  {tag}
                  <Badge variant="outline" className="text-sm">
                    {getSDKFromTags([tag])}
                  </Badge>
                </h1>
                <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Last activity: {formatDateShort(jobs[0]?.datetime || '')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TestTube className="h-4 w-4" />
                    <span>{jobs.length} FaaS jobs • {jobs.filter(j => j.job_type === 'performance').length + jobs.filter(j => j.job_type === 'situational').length} total runs</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Link href={`/faas/jobs?tag=${encodeURIComponent(tag)}`}>
                  <Button className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    View All Jobs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {jobs.length === 0 ? (
          <Alert>
            <AlertDescription>
              No FaaS jobs found for tag "{tag}".
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Statistics Dashboard */}
            {tagStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">FaaS Jobs</p>
                        <p className="text-2xl font-bold text-gray-900">{tagStats.totalJobs}</p>
                      </div>
                      <TestTube className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Performance Runs</p>
                        <p className="text-2xl font-bold text-gray-900">{tagStats.totalPerformanceRuns}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Situational Runs</p>
                        <p className="text-2xl font-bold text-gray-900">{tagStats.totalSituationalRuns}</p>
                      </div>
                      <TestTube className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">SDK Versions</p>
                        <p className="text-2xl font-bold text-gray-900">{tagStats.uniqueSDKs.length}</p>
                      </div>
                      <Code className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* FaaS Jobs Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  FaaS Jobs for {tag}
                </CardTitle>
                <CardDescription>
                  All FaaS jobs associated with this tag, each containing multiple Performance and Situational runs
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Job ID</TableHead>
                        <TableHead className="font-semibold">Created</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">SDK</TableHead>
                        <TableHead className="font-semibold">Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="font-medium">
                            <Link href={`/faas/job/${job.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                              {job.id}
                            </Link>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{formatDateShort((job as any).datetime || (job as any).created_at || '')}</span>
                              <span className="text-xs text-gray-500">{formatTime((job as any).datetime || (job as any).created_at || '')}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge className={`${getStatusColor((job as any).job_type || 'completed')} text-xs`}>
                              {(job as any).job_type || 'completed'}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getSDKFromTags(job.tags)}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {job.tags.filter(t => t !== tag).slice(0, 3).map((otherTag) => (
                                <Link key={otherTag} href={`/faas/tag/${encodeURIComponent(otherTag)}`}>
                                  <Badge variant="outline" className="text-xs hover:bg-blue-50 cursor-pointer transition-colors">
                                    {otherTag}
                                  </Badge>
                                </Link>
                              ))}
                              {job.tags.filter(t => t !== tag).length > 3 && (
                                <Badge variant="outline" className="text-xs text-gray-600">
                                  +{job.tags.filter(t => t !== tag).length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            {tagStats && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      SDK Versions Tested
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {tagStats.uniqueSDKs.map((sdk) => (
                        <Badge key={sdk} variant="outline" className="text-sm">
                          {sdk}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Test Workloads
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {tagStats.uniqueWorkloads.map((workload) => (
                        <Badge key={workload} variant="secondary" className="text-sm">
                          {workload}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
} 