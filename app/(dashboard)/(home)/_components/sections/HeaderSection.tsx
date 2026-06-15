"use client"

import { BarChart4, RefreshCw, Download } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import { Button } from "@/src/components/ui/button"

interface HeaderSectionProps {
  title: string
  onRefresh: () => void
  onExport: () => void
}

export function HeaderSection({ title, onRefresh, onExport }: HeaderSectionProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onExport} className="gap-1">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export all data as CSV</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh all data</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
