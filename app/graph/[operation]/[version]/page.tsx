"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import PerformanceGraph from "@/src/components/shared/performance-graph"

export default function GraphPage({ params }: { params: Promise<{ operation: string; version: string }> | { operation: string; version: string } }) {
  const resolvedParams = params instanceof Promise ? use(params) : params
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Decode the operation name from URL format
  const operation = decodeURIComponent(resolvedParams.operation)
  const version = decodeURIComponent(resolvedParams.version)

  // For detailed graph, expect a concrete run selection; fall back to latest run via querystring if present
  const runId = `${operation.toLowerCase().replace(/\s+/g, "-")}-${version}`

  const handleRefresh = () => {
    // PerformanceGraph fetches real data internally
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 300)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-10 border-b bg-white/90 dark:bg-slate-900/90 backdrop-blur">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-2 font-medium">
            <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{operation}</h1>
              <p className="text-muted-foreground mt-1">Performance metrics for version {version}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm py-1 px-3">
                Version {version}
              </Badge>
              <Badge variant="outline" className="text-sm py-1 px-3">
                20 threads
              </Badge>
            </div>
          </div>

          <Card className="overflow-hidden border-none shadow-sm bg-white dark:bg-slate-800 mb-6">
            <CardHeader className="bg-white dark:bg-slate-800 pb-2">
              <CardTitle className="text-xl font-semibold">
                Performance Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <PerformanceGraph
                 runId={runId}
                 title={`${operation} Performance`}
                 description={`Detailed metrics for ${operation} operation`}
                 showAllMetrics={true}
               />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Run Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Configuration</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">SDK Version:</dt>
                      <dd className="text-sm font-medium">{version}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Operation:</dt>
                      <dd className="text-sm font-medium">{operation}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Threads:</dt>
                      <dd className="text-sm font-medium">20</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Run ID:</dt>
                      <dd className="text-sm font-medium font-mono">{runId}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Performance Summary</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Average Duration:</dt>
                      <dd className="text-sm font-medium">156.7 μs</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">P95 Duration:</dt>
                      <dd className="text-sm font-medium">187.4 μs</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Total Operations:</dt>
                      <dd className="text-sm font-medium">120,000</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Error Rate:</dt>
                      <dd className="text-sm font-medium">0.02%</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
