"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { ExternalLink, FileText } from "lucide-react"
import Link from "next/link"
import { Button } from "@/src/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { generateS3ConsoleUrl, S3_CONFIG } from "@/src/lib/utils/s3-utils"

interface ObservabilityBoxProps {
  faasJobId?: string
  ciUrl?: string
  date?: string
  s3Bucket?: string
  s3Region?: string
}

export default function ObservabilityBox({
  faasJobId,
  ciUrl,
  date,
  s3Bucket = S3_CONFIG.DEFAULT_BUCKET,
  s3Region = S3_CONFIG.DEFAULT_REGION,
}: ObservabilityBoxProps) {
  // FaaS runs store their logs in S3 under the faas job id, so we link there when a
  // job id is present. Runs without one keep their logs at the CI run, so we fall back
  // to ciUrl, and use it only when it is a real http(s) URL because it is sometimes a
  // placeholder like "not-available".
  const s3Url = faasJobId ? generateS3ConsoleUrl(faasJobId, s3Bucket, s3Region, date) : null
  const ciHref = ciUrl && /^https?:\/\//i.test(ciUrl) ? ciUrl : null
  const logsUrl = s3Url ?? ciHref
  return (
    <Card className="mb-6 border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Observability</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="w-full grid grid-cols-1 h-12 p-1 bg-slate-50 rounded-none border-b">
            <TabsTrigger
              value="logs"
              className="text-sm py-2.5 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              <span>Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-50 p-2 rounded-md">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium mb-1">Access Detailed Logs</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {logsUrl
                      ? 'View complete execution logs for this run, including debug information and error traces.'
                      : 'No execution logs were collected for this run.'}
                  </p>
                </div>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {logsUrl ? (
                      <Button variant="outline" className="w-full gap-2 justify-center" asChild>
                        <Link href={logsUrl} target="_blank" rel="noopener noreferrer">
                          <span>View Logs</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full gap-2 justify-center" disabled>
                        <span>No logs available</span>
                      </Button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{s3Url ? 'Open logs in AWS S3' : ciHref ? 'Open the CI run' : 'No logs for this run'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </TabsContent>

          {/* Metrics tab removed */}

        </Tabs>
      </CardContent>
    </Card>
  )
}
