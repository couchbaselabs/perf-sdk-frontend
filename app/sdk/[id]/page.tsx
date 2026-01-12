import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import PerformanceGraph from "@/src/components/shared/performance-graph"
import { Button } from "@/src/components/ui/button"
import { ChevronDown, ChevronLeft, RefreshCw, Clock } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import Sidebar from "@/src/components/layout/sdk-navigation-sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"

export default function SdkPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar mode="performance" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-10 border-b bg-white/90 dark:bg-slate-900/90 backdrop-blur">
          <div className="flex h-16 items-center px-6">
            <div className="flex items-center gap-2 font-medium">
              <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <Select defaultValue="duration">
                <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800">
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="duration">duration_average_us</SelectItem>
                  <SelectItem value="operations">operations_total</SelectItem>
                  <SelectItem value="memory">memory_usage_mb</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto py-6 px-6 max-w-7xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight capitalize">{params.id} Performance</h1>
                <p className="text-muted-foreground mt-1">Performance metrics and analysis</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm py-1 px-3">
                  Version 3.0.1
                </Badge>
                <Badge variant="outline" className="text-sm py-1 px-3">
                  20 threads
                </Badge>
              </div>
            </div>

            <Tabs defaultValue="kv-get" className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-white dark:bg-slate-800">
                  <TabsTrigger value="kv-get">KV Get</TabsTrigger>
                  <TabsTrigger value="kv-replace">KV Replace</TabsTrigger>
                  <TabsTrigger value="kv-insert">KV Insert</TabsTrigger>
                </TabsList>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-primary" defaultChecked />
                  <span>Exclude snapshots</span>
                </label>
              </div>

              <TabsContent value="kv-get" className="space-y-8 mt-0">
                <Card className="overflow-hidden border-none shadow-sm bg-white dark:bg-slate-800">
                  <CardHeader className="bg-white dark:bg-slate-800 pb-2">
                    <CardTitle className="text-xl font-semibold">
                      Performance Over Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[300px]">
                      <PerformanceGraph
                        runId={""}
                        title="KV Get Performance"
                        data={[]}
                        height={300}
                      />
                    </div>
                    <div className="flex items-center justify-between px-6 py-3 border-t bg-slate-50 dark:bg-slate-900/50">
                      <div className="text-sm text-muted-foreground">
                        Average: <span className="font-medium text-foreground">156.7 μs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 gap-1">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Reload
                        </Button>
                        <Button variant="outline" size="sm" className="h-8">
                          Show runs (104)
                          <ChevronDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white dark:bg-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Recent Runs</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Link
                          href={`/run/${i}abc-${i}def-${i}ghi`}
                          key={i}
                          className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <div>
                              <p className="font-medium">Run {i + 1}</p>
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                {i}abc-{i}def-{i}ghi-{i}jkl-{i}mno
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{150 + i * 2} μs</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3" />
                              <span>2023-04-0{i + 1} 12:13:10</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="kv-replace">
                <Card className="overflow-hidden border-none shadow-sm bg-white dark:bg-slate-800">
                  <CardHeader className="bg-white dark:bg-slate-800 pb-2">
                    <CardTitle className="text-xl font-semibold">Performance Over Time</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[300px]">
                      <PerformanceGraph
                        runId={""}
                        title="KV Replace Performance"
                        data={[]}
                        height={300}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="kv-insert">
                <Card className="overflow-hidden border-none shadow-sm bg-white dark:bg-slate-800">
                  <CardHeader className="bg-white dark:bg-slate-800 pb-2">
                    <CardTitle className="text-xl font-semibold">Performance Over Time</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                      No data available for this operation
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
