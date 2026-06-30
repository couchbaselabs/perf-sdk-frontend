"use client"

import Link from "next/link"
import { Badge } from "@/src/components/ui/badge"
import { ExternalLink, GitPullRequest, CalendarClock, PlayCircle, FolderGit2 } from "lucide-react"
import { formatDate } from "@/src/lib/utils/formatting"
import {
  parsePerformerImage,
  describeChangeLink,
  type PerformerImage,
} from "@/src/lib/performer-image"

/**
 * Badge-style link to the change under test (Gerrit review / GitHub PR).
 * Matches the SDK/cluster/version badge row. Renders nothing without a `pr`.
 */
export function ChangeLinkBadge({ pr, className }: { pr: string | null | undefined; className?: string }) {
  const change = describeChangeLink(pr)
  if (!change) return null
  return (
    <Link
      href={change.url}
      target="_blank"
      rel="noopener noreferrer"
      title={change.url}
      className={className}
    >
      <Badge
        variant="outline"
        className="gap-1 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
      >
        <GitPullRequest className="h-3 w-3" />
        {change.label}
        <ExternalLink className="h-3 w-3" />
      </Badge>
    </Link>
  )
}

/**
 * Performer-image metadata block for the run detail card (change, build date,
 * CI run, source repo). Renders nothing when no image metadata is present.
 */
export default function PerformerImageInfo({ image: raw }: { image: unknown }) {
  const image: PerformerImage | null = parsePerformerImage(raw)
  if (!image) return null

  const change = describeChangeLink(image.pr)

  return (
    <div className="mt-4 border-t pt-4">
      <p className="text-sm font-medium text-muted-foreground mb-3">Performer Image</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        {change && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Change:</span>
            <ChangeLinkBadge pr={image.pr} />
          </div>
        )}

        {image.created && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>Built:</span>
            <span className="text-foreground">{formatDate(image.created)}</span>
          </div>
        )}

        {image.ciRun && (
          <Link
            href={image.ciRun}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            CI build
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}

        {image.source && (
          <Link
            href={image.source}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <FolderGit2 className="h-3.5 w-3.5" />
            Source repo
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  )
}
