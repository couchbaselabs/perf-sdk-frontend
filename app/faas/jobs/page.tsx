"use client"

import { useState, useEffect, useMemo, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Badge } from '@/src/components/ui/badge'
import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/src/components/ui/dropdown-menu'
import { Label } from '@/src/components/ui/label'
import { Search, Calendar, Code, Layers, BarChart3, TestTube, Filter, RefreshCw, X, ExternalLink, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AppLayout from "@/src/components/layout/app-layout"
import { formatDateShort } from "@/src/lib/utils/formatting"

// Real database interface
interface DatabaseFaasJob {
  id: string
  job_type: 'performance' | 'situational'
  datetime: string
  config: any
  tags: string[]
}

// Helper function to determine SDK from tags
import { getSDKFromTags } from '@/src/lib/utils/sdk'

function FaasJobsPageContent() {
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<DatabaseFaasJob[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>(searchParams.get('tag') || 'all')
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/faas/jobs')
        if (!response.ok) {
          throw new Error(`Failed to fetch FaaS jobs: ${response.status}`)
        }
        const jobData = await response.json()
        setJobs(jobData)
      } catch (error) {
        console.error('Error loading FaaS jobs:', error)
        setJobs([])
      } finally {
        setIsLoading(false)
      }
    }

    loadJobs()
  }, [])

  // Extract unique values for filters
  const uniqueValues = useMemo(() => {
    return {
      tags: [...new Set(jobs.flatMap(job => job.tags))].sort(),
      types: [...new Set(jobs.map(job => job.job_type))].sort(),
      sdks: [...new Set(jobs.map(job => getSDKFromTags(job.tags)))].filter(sdk => sdk !== 'Unknown').sort()
    }
  }, [jobs])

  const clearAllFilters = () => {
    setSearchQuery("")
    setTypeFilter("all")
    setTagFilter("all")
    setCurrentPage(1)
  }

  const jobsData = useMemo(() => {
    let filtered = jobs

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        getSDKFromTags(job.tags).toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(job => job.job_type === typeFilter)
    }

    // Tag filter  
    if (tagFilter !== 'all') {
      filtered = filtered.filter(job => job.tags.includes(tagFilter))
    }

    return filtered.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
  }, [jobs, searchQuery, typeFilter, tagFilter])

  // Pagination
  const totalPages = Math.ceil(jobsData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentJobs = jobsData.slice(startIndex, endIndex)

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'performance': return 'bg-green-100 text-green-800 border-green-200'
      case 'situational': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }


  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/faas/jobs')
      const jobData = await response.json()
      setJobs(jobData)
    } catch (error) {
      console.error('Error refreshing FaaS jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Statistics
  const totalJobs = jobs.length
  const performanceJobs = jobs.filter(job => job.job_type === 'performance').length
  const situationalJobs = jobs.filter(job => job.job_type === 'situational').length

  const activeFilterCount = (searchQuery ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0) + (tagFilter !== 'all' ? 1 : 0)

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading FaaS jobs from database...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
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
                <h1 className="text-3xl font-bold">FaaS Jobs</h1>
                <p className="text-muted-foreground mt-1">
                  Function-as-a-Service experimental test jobs from real database
                  {tagFilter !== 'all' && ` • Filtered by tag: ${tagFilter}`}
                </p>
              </div>
              <Badge variant="outline" className="text-sm">
                {jobsData.length} of {jobs.length} Jobs
              </Badge>
            </div>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">{totalJobs}</p>
                </div>
                <TestTube className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Performance</p>
                  <p className="text-2xl font-bold text-gray-900">{performanceJobs}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Situational</p>
                  <p className="text-2xl font-bold text-gray-900">{situationalJobs}</p>
                </div>
                <TestTube className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Tags</p>
                  <p className="text-2xl font-bold text-gray-900">{uniqueValues.tags.length}</p>
                </div>
                <Code className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by ID, tags, or SDK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Type: {typeFilter === 'all' ? 'All' : typeFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                  All Types
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('performance')}>
                  Performance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('situational')}>
                  Situational
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tag Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Tag: {tagFilter === 'all' ? 'All' : tagFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-60 overflow-y-auto">
                <DropdownMenuItem onClick={() => setTagFilter('all')}>
                  All Tags
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {uniqueValues.tags.map((tag) => (
                  <DropdownMenuItem key={tag} onClick={() => setTagFilter(tag)}>
                    {tag}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4" />
                Clear ({activeFilterCount})
              </Button>
            )}

            {/* Refresh */}
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* FaaS Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              FaaS Jobs ({jobsData.length})
            </CardTitle>
            <CardDescription>
              Function-as-a-Service experimental test jobs with real database data
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Job ID</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="font-semibold">SDK</TableHead>
                    <TableHead className="font-semibold">Tags</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentJobs.map((job) => (
                    <TableRow key={job.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium">
                        <Link href={`/faas/job/${job.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {job.id}
                        </Link>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={`${getTypeColor(job.job_type)} text-xs`}>
                          {job.job_type}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{formatDateShort(job.datetime)}</span>
                          <span className="text-xs text-gray-500">{formatTime(job.datetime)}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getSDKFromTags(job.tags)}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {job.tags.slice(0, 3).map((tag) => (
                            <Link key={tag} href={`/faas/tag/${encodeURIComponent(tag)}`}>
                              <Badge variant="outline" className="text-xs hover:bg-blue-50 cursor-pointer transition-colors">
                                {tag}
                              </Badge>
                            </Link>
                          ))}
                          {job.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs text-gray-600">
                              +{job.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <Link href={`/faas/job/${job.id}`}>
                          <Button size="sm" className="gap-1">
                            View Details
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, jobsData.length)} of {jobsData.length} jobs
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function FaasJobsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading FaaS jobs...</p>
          </div>
        </div>
      </div>
    }>
      <FaasJobsPageContent />
    </Suspense>
  )
} 