"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import Link from "next/link"
import { ArrowUpDown, ExternalLink } from "lucide-react"
import { formatDate } from "@/src/lib/utils/formatting"

interface RunRow {
  id: string
  datetime: string
  status: 'completed' | 'running' | 'failed' | 'pending'
  version: string
  params: any
  workload?: string
  metricValue?: number | null
}

interface VersionRunsTableProps {
  runs: RunRow[]
  metricLabel: string
  metricUnit: string
  sortColumn: string
  sortDirection: 'asc' | 'desc'
  onSort: (col: string) => void
}

export default function VersionRunsTable({ runs, metricLabel, metricUnit, sortColumn, sortDirection, onSort }: VersionRunsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[180px]">
            <Button variant="ghost" size="sm" onClick={() => onSort("datetime")} className="flex items-center">
              Date & Time
              <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" size="sm" onClick={() => onSort("id")} className="flex items-center">
              Run ID
              <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          </TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead>Workload</TableHead>
          <TableHead className="text-right">
            <Button variant="ghost" size="sm" onClick={() => onSort("metricValue")} className="flex items-center">
              {metricLabel}
              <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          </TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              No runs found for this version
            </TableCell>
          </TableRow>
        ) : (
          runs.map((run) => (
            <TableRow key={run.id} className="hover:bg-slate-50">
              <TableCell className="font-medium">{formatDate(run.datetime)}</TableCell>
              <TableCell className="font-mono text-xs">{run.id}</TableCell>
              <TableCell>
                <Badge variant={run.status === 'completed' ? 'default' : 'destructive'}>
                  {run.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {run.version}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {run.params?.cluster?.version}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {run.workload || (Array.isArray(run.params?.workload?.operations) ? run.params.workload.operations[0]?.op : undefined) || 'N/A'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-medium">
                  {run.metricValue !== null && run.metricValue !== undefined
                    ? `${Number(run.metricValue).toFixed(2)} ${metricUnit}`
                    : 'N/A'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/run/${run.id}`}>
                    View Details
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}


