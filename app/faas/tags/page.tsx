"use client"

import { useState, useEffect } from "react"
import { formatDateShort } from "@/src/lib/utils/formatting"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { Input } from "@/src/components/ui/input"
import { Search } from "lucide-react"
import Link from "next/link"
import AppLayout from "@/src/components/layout/app-layout"
import { apiClient } from '@/src/lib/api-client-unified'

interface TagSummary {
  tag: string
  jobCount: number
  lastUpdated: string
  sdk: string
}

export default function FaasTagsPage() {
  const [tags, setTags] = useState<TagSummary[]>([])
  const [filteredTags, setFilteredTags] = useState<TagSummary[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTags = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Use unified API client
        const response = await apiClient.getFaasJobs({ limit: 1000 })
        if (response.success && response.data.data) {
          // Aggregate tags from jobs
          const tagMap = new Map<string, TagSummary>()
          response.data.data.forEach(job => {
            if (job.tags) {
              job.tags.forEach(tag => {
                if (tagMap.has(tag)) {
                  const existing = tagMap.get(tag)!
                  existing.jobCount++
                if (job.created_at && job.created_at > existing.lastUpdated) {
                  existing.lastUpdated = job.created_at
                  }
                } else {
                  tagMap.set(tag, {
                    tag,
                    jobCount: 1,
                    lastUpdated: job.created_at || new Date().toISOString(),
                    sdk: job.sdks?.[0] || 'unknown'
                  })
                }
              })
            }
          })
          const tagData = Array.from(tagMap.values())
          setTags(tagData)
          setFilteredTags(tagData)
        } else {
          setTags([])
          setFilteredTags([])
        }
      } catch (err) {
        console.error('Error loading tags:', err)
        setError('Failed to load tags from database')
      } finally {
        setIsLoading(false)
      }
    }

    loadTags()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = tags.filter(tag =>
        tag.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tag.sdk.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTags(filtered)
    } else {
      setFilteredTags(tags)
    }
  }, [searchQuery, tags])

  const getSDKColor = (sdk: string) => {
    const colors = {
      'Java': 'bg-orange-100 text-orange-700',
      'Python': 'bg-blue-100 text-blue-700',
      'Node.js': 'bg-green-100 text-green-700',
      'Go': 'bg-cyan-100 text-cyan-700',
      '.NET': 'bg-purple-100 text-purple-700',
      'Kotlin': 'bg-indigo-100 text-indigo-700',
      'Ruby': 'bg-red-100 text-red-700',
      'Scala': 'bg-yellow-100 text-yellow-700',
      'C++': 'bg-gray-100 text-gray-700',
      'Rust': 'bg-orange-200 text-orange-800',
      'Unknown': 'bg-gray-100 text-gray-700'
    }
    return colors[sdk as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }


  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-lg font-medium">Loading tags from database...</div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-lg font-medium text-red-600">Error</div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">FaaS Tags</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Browse FaaS jobs by tags - generated from actual performance test runs
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {filteredTags.length} Tags
          </Badge>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by tag, description, or SDK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tags Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTags.map((tag) => (
            <Card key={tag.tag} className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href={`/faas/tag/${tag.tag}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-mono">
                      {tag.tag}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getSDKColor(tag.sdk)} variant="secondary">
                        {tag.sdk}
                      </Badge>
                      <Badge variant="secondary">
                        {tag.jobCount} run{tag.jobCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    Generated from performance test runs with {tag.sdk} SDK
                  </p>
                  <p className="text-xs text-gray-500">
                    Last updated: {formatDateShort(tag.lastUpdated)}
                  </p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>

        {filteredTags.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-lg font-medium text-gray-900 dark:text-gray-100">No tags found</div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {searchQuery ? 'Try adjusting your search criteria' : 'No performance test data available'}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
} 