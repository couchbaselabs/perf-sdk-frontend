import React from 'react'
import { ExternalLink, GitPullRequest, ArrowRight } from 'lucide-react'
import { formatDate } from '@/src/lib/utils/formatting'
import { parsePerformerImage, describeChangeLink } from '@/src/lib/performer-image'

// Up to 2 decimals with thousands separators (e.g. 170.3536 -> "170.35").
function formatMetricValue(value: unknown): string {
  const n = Number(value)
  if (!isFinite(n)) return String(value)
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

// Strip a trailing "(unit)" from the label so the unit isn't shown twice.
function stripUnitSuffix(name: unknown): string {
  return typeof name === 'string' ? name.replace(/\s*\([^)]*\)\s*$/, '') : ''
}

// Compact build date, e.g. "Jun 23, 2026, 4:23 PM".
function formatBuiltDate(value: unknown): string {
  try {
    const d = new Date(String(value))
    if (!isFinite(d.getTime())) return formatDate(value)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return formatDate(value)
  }
}

interface TooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatter?: (value: any, name: string, props: any) => [string, string]
  labelFormatter?: (label: string) => string
  showRunCount?: boolean
  showClusterInfo?: boolean
  showSDKInfo?: boolean
  metricUnit?: string
  onPointerEnter?: () => void
  onPointerLeave?: () => void
  // When provided, renders a "Run details" button (wired to the bar-click handler).
  onRunDetails?: () => void
}

export const CustomTooltip: React.FC<TooltipProps> = ({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  showRunCount = true,
  showClusterInfo = false,
  showSDKInfo = false,
  metricUnit = "μs",
  onPointerEnter,
  onPointerLeave,
  onRunDetails,
}) => {
  if (!active || !payload || !payload.length) return null

  // All series for a bar share the same data point; read image metadata once.
  const dataPoint = payload[0]?.payload || {}
  const image = parsePerformerImage(dataPoint.image)
  const change = image ? describeChangeLink(image.pr) : null

  const entries = payload.filter((entry: any) => {
    const value = entry.value
    return value !== null && value !== undefined && value !== 0 && value !== ''
  })
  const multiSeries = entries.length > 1

  return (
    <div
      className="bg-white px-3 py-2.5 border rounded-lg shadow-md max-w-[260px] text-foreground"
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      {label && (() => {
        const text = labelFormatter ? labelFormatter(label) : `Version ${label}`
        return (
          <p className="text-sm font-semibold leading-tight truncate" title={text}>
            {text}
          </p>
        )
      })()}

      {entries.map((entry: any, index: number) => {
        const item = entry.payload || {}
        const formatted = formatter
          ? formatter(entry.value, entry.name, entry)[0]
          : null
        return (
          <div key={index} className="mt-2">
            {/* metric name */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground leading-tight">
              {multiSeries && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              )}
              <span className="truncate">{stripUnitSuffix(entry.name)}</span>
            </div>
            {/* value */}
            <div className="flex items-baseline gap-1 leading-tight">
              {formatted ? (
                <span className="text-lg font-semibold tabular-nums">{formatted}</span>
              ) : (
                <>
                  <span className="text-lg font-semibold tabular-nums">{formatMetricValue(entry.value)}</span>
                  <span className="text-xs text-muted-foreground">{metricUnit}</span>
                </>
              )}
            </div>

            {showSDKInfo && item.sdkName && (
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.sdkColor }} />
                <span>SDK {item.sdkName}</span>
              </div>
            )}
            {showClusterInfo && item.clusterName && (
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.clusterColor }} />
                <span>Cluster {item.clusterName}</span>
              </div>
            )}
            {showRunCount && item.runCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.runCount} run{item.runCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )
      })}

      {/* Performer image metadata, when present. */}
      {image && (change || image.created) && (
        <div className="mt-2 pt-2 border-t space-y-1">
          {image.created && (
            <p className="text-xs text-muted-foreground">
              Built {formatBuiltDate(image.created)}
            </p>
          )}
          {change && (
            <a
              href={change.url}
              target="_blank"
              rel="noopener noreferrer"
              title={change.url}
              className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900 hover:underline"
            >
              <GitPullRequest className="h-3 w-3" />
              {change.label}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {onRunDetails && (
        <button
          type="button"
          onClick={onRunDetails}
          className="mt-2 pt-2 border-t w-full flex items-center justify-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
        >
          Run details
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
