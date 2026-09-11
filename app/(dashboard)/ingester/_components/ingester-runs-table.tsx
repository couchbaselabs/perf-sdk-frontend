"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, CircleSlash, Loader2, XCircle } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"
import { cn } from "@/src/lib/core-ui-utilities"
import type { DatabaseIngesterRun } from "@/src/types/database"

interface IngestedRunDetail {
  sit: string
  run: string
  kind?: string
  outcome: "ingested" | "failed" | "deferred"
  movedTo?: string
  error?: string
  rows?: { buckets: number; metrics: number; events: number }
}

// A run stuck in 'running' longer than this is presumed dead (the timer fires
// every 5 minutes with a 30 minute timeout).
const STALE_RUNNING_MS = 35 * 60 * 1000

function statusBadge(run: DatabaseIngesterRun) {
  const stale = run.status === "running" && Date.now() - new Date(run.started).getTime() > STALE_RUNNING_MS
  if (stale) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> died
      </Badge>
    )
  }
  switch (run.status) {
    case "running":
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> running
        </Badge>
      )
    case "success":
      return (
        <Badge className="gap-1 bg-green-600 hover:bg-green-600 text-white">
          <CheckCircle2 className="h-3 w-3" /> success
        </Badge>
      )
    case "partial":
      return (
        <Badge className="gap-1 bg-amber-500 hover:bg-amber-500 text-white">
          <AlertTriangle className="h-3 w-3" /> partial
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" /> failed
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="gap-1">
          <CircleSlash className="h-3 w-3" /> nothing to do
        </Badge>
      )
  }
}

function duration(run: DatabaseIngesterRun): string {
  if (!run.finished) return "-"
  const secs = Math.round((new Date(run.finished).getTime() - new Date(run.started).getTime()) / 1000)
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`
}

function outcomeClass(outcome: string): string {
  if (outcome === "ingested") return "text-green-600 dark:text-green-500"
  if (outcome === "failed") return "text-red-600 dark:text-red-500"
  return "text-muted-foreground"
}

export function IngesterRunsTable({ runs }: { runs: DatabaseIngesterRun[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (runs.length === 0) {
    return <p className="text-muted-foreground">No ingester runs recorded yet.</p>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ingested</TableHead>
            <TableHead className="text-right">Failed</TableHead>
            <TableHead className="text-right">Deferred</TableHead>
            <TableHead className="text-right">Failed backlog</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const details: IngestedRunDetail[] = run.details?.runs ?? []
            const rawStrayKeys = run.details?.strayKeys
            const strayKeys: string[] = Array.isArray(rawStrayKeys) ? rawStrayKeys : []
            const hasDetails = details.length > 0 || run.details?.error || run.details?.strayKeys
            const isExpanded = expanded === run.id
            return (
              <Fragment key={run.id}>
                <TableRow
                  className={cn(hasDetails && "cursor-pointer")}
                  onClick={() => hasDetails && setExpanded(isExpanded ? null : run.id)}
                >
                  <TableCell>
                    {hasDetails &&
                      (isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{new Date(run.started).toLocaleString()}</TableCell>
                  <TableCell>{duration(run)}</TableCell>
                  <TableCell>{statusBadge(run)}</TableCell>
                  <TableCell className="text-right">{run.runs_ingested}</TableCell>
                  <TableCell className={cn("text-right", run.runs_failed > 0 && "text-red-600 font-medium")}>
                    {run.runs_failed}
                  </TableCell>
                  <TableCell className="text-right">{run.runs_deferred}</TableCell>
                  <TableCell
                    className={cn("text-right", (run.failed_backlog ?? 0) > 0 && "text-amber-600 font-medium")}
                  >
                    {run.failed_backlog ?? "-"}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="bg-muted/30 p-4">
                      <div className="space-y-2 text-sm">
                        {run.details?.error && (
                          <p className="text-red-600">Ingester error: {String(run.details.error)}</p>
                        )}
                        {details.map((d, i) => (
                          <div key={i} className="flex flex-wrap items-baseline gap-x-2">
                            <span className={cn("font-medium", outcomeClass(d.outcome))}>{d.outcome}</span>
                            {d.kind && <Badge variant="outline">{d.kind}</Badge>}
                            <Link
                              href={`/situational/${d.sit}/run/${d.run}`}
                              className="font-mono text-xs underline underline-offset-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {d.sit.slice(0, 8)}/{d.run.slice(0, 8)}
                            </Link>
                            {d.rows && (
                              <span className="text-muted-foreground text-xs">
                                {d.rows.buckets} buckets, {d.rows.metrics} metrics, {d.rows.events} events
                              </span>
                            )}
                            {d.error && <span className="text-red-600 text-xs">{d.error}</span>}
                          </div>
                        ))}
                        {strayKeys.length > 0 && (
                          <p className="text-muted-foreground text-xs">
                            Stray keys in incoming/: {strayKeys.join(", ")}
                          </p>
                        )}
                        {run.details?.version && (
                          <p className="text-muted-foreground text-xs">Ingester v{String(run.details.version)}</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
