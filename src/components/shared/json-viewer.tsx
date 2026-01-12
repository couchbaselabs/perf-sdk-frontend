"use client"

import { useState } from "react"
import { Button } from "@/src/components/ui/button"
import { Copy, Check, Download } from "lucide-react"
import { cn } from "@/src/lib/core-ui-utilities"
import { copyJSONToClipboard, downloadJSON } from "@/src/lib/utils/exports"

interface JsonViewerProps {
  data: any
  title?: string
  className?: string
  downloadFileName?: string
}

export default function JsonViewer({ data, title, className, downloadFileName = "config.json" }: JsonViewerProps) {
  const [copied, setCopied] = useState(false)
  const jsonString = JSON.stringify(data, null, 2)

  const handleCopyToClipboard = async () => {
    const success = await copyJSONToClipboard(data)
    if (success !== undefined) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadJson = () => {
    downloadJSON(data, downloadFileName)
  }

  return (
    <div className={cn("rounded-md border", className)}>
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyToClipboard} className="h-8 gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadJson} className="h-8 gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </Button>
          </div>
        </div>
      )}
      <pre className="p-4 text-xs font-mono overflow-auto bg-slate-50 rounded-b-md max-h-[500px]">{jsonString}</pre>
    </div>
  )
}
