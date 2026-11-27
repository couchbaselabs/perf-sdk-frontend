"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { badgeVariants } from "@/src/components/ui/badge"
import { cn } from "@/src/lib/core-ui-utilities"
import {
  computeSampleOriginMs,
  extractPerCoreCpuData,
  type PerCoreMetricsInput,
} from "@/src/shared/charts/per-core-cpu"
import { usePerformanceData } from "@/src/shared/hooks/use-performance-data"

const CORE_PALETTE = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#059669",
  "#ea580c",
  "#9333ea",
  "#0284c7",
  "#65a30d",
  "#e11d48",
  "#0d9488",
  "#ca8a04",
]

const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  borderColor: "hsl(var(--border))",
  color: "hsl(var(--popover-foreground))",
  borderRadius: "6px",
}

const TOOLTIP_LABEL_STYLE = {
  color: "hsl(var(--popover-foreground))",
}

function formatPercentTooltip(value: unknown, name: unknown): [string, string] {
  const numeric = typeof value === "number" ? value : Number(value)
  const formatted = Number.isFinite(numeric) ? `${numeric.toFixed(2)}%` : "N/A"
  return [formatted, String(name ?? "")]
}

interface PerCoreCpuChartProps {
  metrics?: PerCoreMetricsInput
  buckets?: ReadonlyArray<Record<string, unknown>> | null
  runId?: string
}

export default function PerCoreCpuChart({ metrics, buckets, runId }: PerCoreCpuChartProps) {
  const fetchRunId = runId || ""
  const { buckets: liveBuckets, metrics: liveMetrics, hasLoaded } = usePerformanceData(fetchRunId)
  const useLive = Boolean(fetchRunId) && hasLoaded
  const effectiveMetrics: PerCoreMetricsInput =
    useLive ? liveMetrics : metrics !== undefined ? metrics : liveMetrics
  const effectiveBuckets =
    useLive ? liveBuckets : buckets !== undefined ? buckets : liveBuckets
  const bucketOriginMs = useMemo(() => {
    if (!Array.isArray(effectiveBuckets) || effectiveBuckets.length === 0) {
      return undefined
    }
    const computed = computeSampleOriginMs(effectiveBuckets)
    return Number.isFinite(computed) ? computed : undefined
  }, [effectiveBuckets])
  const data = useMemo(
    () => extractPerCoreCpuData(effectiveMetrics, 4, undefined, bucketOriginMs),
    [effectiveMetrics, bucketOriginMs]
  )
  const [showAllCores, setShowAllCores] = useState(false)

  if (!data) {
    return null
  }

  const hasCoreFilterToggle = data.coreCount > data.hottestCoreKeys.length
  const displayedKeys =
    showAllCores || !hasCoreFilterToggle
      ? data.summaries.map((s) => s.key)
      : data.hottestCoreKeys

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <CardTitle>Per-Core CPU Utilization ({data.coreCount} Logical CPUs)</CardTitle>
            <CardDescription>
              Non-idle CPU share per online logical CPU slot (0–100% each, ordered by OS CPU ID).
              {data.topologyChanged
                ? ` Showing latest contiguous segment from ${data.segmentStartTime}s.`
                : ""}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="summary">Core Summary (Avg &amp; Peak)</TabsTrigger>
            <TabsTrigger value="timeline">Over Time</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.summaries} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    formatter={formatPercentTooltip}
                  />
                  <Legend />
                  <Bar dataKey="average" name="Average %" fill="#2563eb" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="peak" name="Peak %" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            {hasCoreFilterToggle && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground">Displayed cores:</span>
                <button
                  type="button"
                  aria-pressed={!showAllCores}
                  className={cn(
                    badgeVariants({ variant: !showAllCores ? "default" : "outline" }),
                    "cursor-pointer"
                  )}
                  onClick={() => setShowAllCores(false)}
                >
                  Top {data.hottestCoreKeys.length} Hottest Cores
                </button>
                <button
                  type="button"
                  aria-pressed={showAllCores}
                  className={cn(
                    badgeVariants({ variant: showAllCores ? "default" : "outline" }),
                    "cursor-pointer"
                  )}
                  onClick={() => setShowAllCores(true)}
                >
                  All {data.coreCount} Cores
                </button>
              </div>
            )}
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeSeries} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    allowDecimals={false}
                    tickFormatter={(v) => `${v}s`}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    labelFormatter={(v) => `Time: ${v}s`}
                    formatter={formatPercentTooltip}
                  />
                  <Legend />
                  {data.summaries
                    .filter((core) => displayedKeys.includes(core.key))
                    .map((core) => (
                      <Line
                        key={core.key}
                        type="monotone"
                        dataKey={core.key}
                        name={core.label}
                        stroke={CORE_PALETTE[core.coreIndex % CORE_PALETTE.length]}
                        dot={false}
                        strokeWidth={1.75}
                        isAnimationActive={false}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
