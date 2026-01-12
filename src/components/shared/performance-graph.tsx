"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Download, RefreshCw, HelpCircle, LineChartIcon, AreaChart, ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import { Slider } from "@/src/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import {
  LineChart,
  Line,
  ReferenceLine,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Label,
} from "recharts"
// Import shared chart utilities
import { formatDuration, CustomLegend, CustomTooltip, formatTimeOffset } from "@/src/shared/charts"
import { mergeBucketsAndMetrics } from "@/src/shared/charts/data-merge"
import { usePerformanceData } from '@/src/shared/hooks/use-performance-data'

// Use unified color management
import { ChartColorManager } from '@/src/shared/charts/colors'

// Create color manager instance
const colorManager = new ChartColorManager()

// Define metric categories with simplified color assignment
const metricCategories = {
  durations: [
    { id: "duration_average_us", name: "Average Duration", color: colorManager.getColor('duration'), unit: "μs", axis: "left" },
    { id: "duration_min_us", name: "Min Duration", color: colorManager.next(), unit: "μs", axis: "left" },
    { id: "duration_max_us", name: "Max Duration", color: colorManager.next(), unit: "μs", axis: "left" },
  ],
  throughput: [
    { id: "operations_total", name: "Total Operations", color: colorManager.getColor('operations'), unit: "ops", axis: "right" },
    { id: "operations_success", name: "Successful Operations", color: colorManager.getColor('success'), unit: "ops", axis: "right" },
    { id: "operations_failed", name: "Failed Operations", color: colorManager.getColor('errors'), unit: "ops", axis: "right" },
  ],
  metrics: [
    { id: "memDirectMaxMB", name: "Direct Memory Max", color: colorManager.getColor('memory'), unit: "MB", axis: "right" },
    { id: "memDirectUsedMB", name: "Direct Memory Used", color: colorManager.next(), unit: "MB", axis: "right" },
    { id: "memHeapMaxMB", name: "Heap Memory Max", color: colorManager.next(), unit: "MB", axis: "right" },
    { id: "memHeapUsedMB", name: "Heap Memory Used", color: colorManager.next(), unit: "MB", axis: "right" },
    { id: "freeSwapSizeMB", name: "Free Swap Size", color: colorManager.next(), unit: "MB", axis: "right" },
    { id: "processCpu", name: "Process CPU", color: colorManager.getColor('cpu'), unit: "%", axis: "right" },
    { id: "systemCpu", name: "System CPU", color: colorManager.next(), unit: "%", axis: "right" },
    { id: "threadCount", name: "Thread Count", color: colorManager.next(), unit: "", axis: "right" },
    { id: "gc0Count", name: "GC Count", color: colorManager.next(), unit: "", axis: "right" },
    { id: "gc0AccTimeMs", name: "GC Accumulated Time", color: colorManager.next(), unit: "ms", axis: "right" },
    { id: "errors", name: "Errors", color: colorManager.getColor('errors'), unit: "", axis: "right" },
  ],
}

// Get all metrics from categories
const getAllMetrics = () => {
  return Object.values(metricCategories).flat()
}

interface PerformanceGraphProps {
  runId: string
  title: string
  description?: string
  showAllMetrics?: boolean
  height?: number
  data?: any
  events?: Array<{ timeOffsetSecs: number | null; datetime: string; params: { type: string; description?: string; displayOnGraph?: boolean } }>
  graphId?: string
}

export default function PerformanceGraph({
  runId,
  title,
  description,
  showAllMetrics = false,
  height = 400,
  data: initialData,
  events = [],
  graphId,
}: PerformanceGraphProps) {
  const { data: queryData, isLoading, isFetching, error, refetch } = usePerformanceData(runId)
  const [chartData, setChartData] = useState<any[]>(initialData || queryData || [])
  
  const allMetrics = getAllMetrics()
  
  // Check which metrics have data available
  const metricsWithData = useMemo(() => {
    const availableMetrics = new Set<string>()
    if (chartData && chartData.length > 0) {
      chartData.forEach(point => {
        Object.keys(point).forEach(key => {
          if (point[key] !== undefined && point[key] !== null && key !== 'time' && key !== 'datetime' && key !== 'timeLabel') {
            availableMetrics.add(key)
          }
        })
      })
    }
    return availableMetrics
  }, [chartData])
  
  // ---------------------------------------------------------------------------
  // Simplified metric visibility state
  //   • activeMetrics  – list of metric ids currently displayed
  //   • axisOverrides  – user-chosen axis overrides (defaults come from metric definition)
  // ---------------------------------------------------------------------------

  const defaultActive = useMemo(() => (
    showAllMetrics
      ? allMetrics.map((m) => m.id)
      : ["duration_average_us", "operations_total", "operations_failed"]
  ), [showAllMetrics])

  const [activeMetrics, setActiveMetrics] = useState<string[]>(defaultActive)

  const [axisOverrides, setAxisOverrides] = useState<Record<string, "left" | "right">>({})

  // Helper to get current axis for a metric (definition → overrides)
  const getAxis = useCallback(
    (metricId: string): "left" | "right" =>
      axisOverrides[metricId] ?? (allMetrics.find((m) => m.id === metricId)?.axis as "left" | "right" || "right"),
    [axisOverrides],
  )

  const [zoomLevel, setZoomLevel] = useState(100)
  const [chartType, setChartType] = useState<"line" | "area">("line")
  const [selectedTimeRange, setSelectedTimeRange] = useState<[number, number] | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState<number | null>(null)
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null)
  const [showLegend, setShowLegend] = useState(true)
  const [brushKey, setBrushKey] = useState(0)
  const [chartKey, setChartKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafPendingRef = useRef(false)

  // Adaptive time formatter based on current visible span
  const formatSeconds = (totalSeconds: number) => {
    if (!selectedTimeRange) return formatTimeOffset(totalSeconds)
    const span = selectedTimeRange[1] - selectedTimeRange[0]
    if (span <= 120) {
      // Less than 2 minutes – show raw seconds
      return `${Math.round(totalSeconds)}s`
    }
    if (span <= 7200) {
      // Less than 2 hours – show MM:SS
      return formatTimeOffset(totalSeconds)
    }
    // Large span – show HH:MM
    const s = Math.floor(totalSeconds)
    const hours = Math.floor(s / 3600)
    const minutes = Math.floor((s % 3600) / 60)
    return `${hours}h${String(minutes).padStart(2,'0')}m`
  }

  // Compute full range from data + events
  const fullRange = useMemo<[number, number] | null>(() => {
    if (!chartData || chartData.length === 0) return null
    const dataMin = Number(chartData[0]?.time ?? 0)
    const dataMax = Number(chartData[chartData.length - 1]?.time ?? chartData.length - 1)
    const eventTimes = (events || [])
      .map(e => (typeof e?.timeOffsetSecs === 'number' && Number.isFinite(e.timeOffsetSecs) ? Number(e.timeOffsetSecs) : null))
      .filter((v): v is number => v !== null)
    const evtMin = eventTimes.length ? Math.min(...eventTimes) : dataMin
    const evtMax = eventTimes.length ? Math.max(...eventTimes) : dataMax
    return [Math.min(dataMin, evtMin), Math.max(dataMax, evtMax)]
  }, [chartData, events])

  const rangesEqual = (a: [number, number] | null, b: [number, number] | null) =>
    !!a && !!b && a[0] === b[0] && a[1] === b[1]

  // Initialize selectedTimeRange to fullRange once data/events resolve
  useEffect(() => {
    if (fullRange && selectedTimeRange === null) setSelectedTimeRange(fullRange)
  }, [fullRange])

  // Apply zoom changes only when zoomLevel or dataset changes; do NOT react to
  // selectedTimeRange updates triggered by drag-selection, otherwise we would
  // immediately overwrite the user's manual range.
  useEffect(() => {
    if (!fullRange) return

    // If zoom is at 100% (show full) and user already defined a custom range,
    // skip automatic override so drag-selection is preserved.
    if (zoomLevel === 100 && selectedTimeRange !== null) return

    const [fullMin, fullMax] = fullRange
    const fullLen = Math.max(1, fullMax - fullMin)

    let fraction = 100 / zoomLevel
    if (fraction > 1) fraction = 1
    const desiredSpan = fullLen * fraction

    const current = selectedTimeRange ?? fullRange
    const center = (current[0] + current[1]) / 2

    let newMin = center - desiredSpan / 2
    let newMax = center + desiredSpan / 2

    if (newMin < fullMin) {
      newMax += fullMin - newMin
      newMin = fullMin
    }
    if (newMax > fullMax) {
      newMin -= newMax - fullMax
      newMax = fullMax
    }

    const next: [number, number] = [
      Math.max(fullMin, Math.round(newMin)),
      Math.min(fullMax, Math.round(newMax)),
    ]

    if (!rangesEqual(selectedTimeRange, next)) {
      setSelectedTimeRange(next)
    }
  }, [zoomLevel, fullRange, selectedTimeRange])

  // Whenever selectedTimeRange changes (via drag or zoom), force a fresh LineChart remount so Recharts recalculates axes
  useEffect(() => {
    setChartKey((k) => k + 1)
  }, [selectedTimeRange])

  // Load real data from database
  useEffect(() => {
    if (initialData) {
      setChartData(initialData)
    } else if (queryData && queryData.length) {
      setChartData(queryData)
    }
  }, [initialData, queryData])

  // Ensure at least one duration metric is visible when data arrives and disable metrics with no data
  useEffect(() => {
    if (chartData && chartData.length) {
      const hasDuration = chartData.some((p: any) => typeof p.duration_average_us === 'number' && p.duration_average_us > 0)
      
      // Update activeMetrics based on data availability
      setActiveMetrics((prev) => {
        const updated = [...prev]
        
        // Ensure at least one duration metric is visible if available
        if (hasDuration && !updated.includes("duration_average_us")) {
          updated.push("duration_average_us")
        }
        
        // Disable any active metrics that have no data
        updated.forEach(metricId => {
          if (updated.includes(metricId) && !metricsWithData.has(metricId)) {
            const index = updated.indexOf(metricId)
            updated.splice(index, 1)
          }
        })
        
        return updated
      })
    }
  }, [chartData, metricsWithData]) // Update when data or available metrics change

  const loadRealData = useCallback(() => { refetch() }, [refetch])

  // Helper: snap a numeric time to the closest actual bucket time present in chartData
  const snapTime = useCallback((val: number) => {
    if (!chartData || chartData.length === 0) return val
    let best = chartData[0].time as number
    let bestDiff = Math.abs(best - val)
    for (const p of chartData) {
      const t = Number(p.time)
      const d = Math.abs(t - val)
      if (d < bestDiff) {
        best = t
        bestDiff = d
      }
      if (bestDiff === 0) break
    }
    return best
  }, [chartData])

  // Ensure we have valid chart data
  if (isLoading) {
    return (
      <Card className="mb-6 border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-medium">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[400px]">
          <div className="text-muted-foreground flex flex-col items-center">
            <RefreshCw className="h-8 w-8 animate-spin mb-4" />
            <p>Loading performance data from database...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mb-6 border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-medium">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[400px]">
          <div className="text-muted-foreground flex flex-col items-center">
            <HelpCircle className="h-8 w-8 mb-4 text-red-500" />
            <p className="text-red-600">Error: {error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadRealData}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="mb-6 border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-medium">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[400px]">
          <p className="text-muted-foreground">No performance data available for this run</p>
        </CardContent>
      </Card>
    )
  }

  // Toggle metric visibility
  const toggleMetric = (metricId: string) => {
    if (!metricsWithData.has(metricId)) {
      console.warn(`Cannot toggle metric ${metricId}: no data available`)
      return
    }
    setActiveMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId],
    )
  }

  // Toggle metric axis
  const toggleMetricAxis = (metricId: string) => {
    setAxisOverrides((prev) => {
      const current: "left" | "right" = prev[metricId] ?? (allMetrics.find((m) => m.id === metricId)?.axis as "left" | "right" || "left")
      const next: "left" | "right" = current === "left" ? "right" : "left"
      return { ...prev, [metricId]: next }
    })
  }

  // Handle zoom in/out
  const handleZoomIn = () => { setZoomLevel((z) => Math.min(z + 20, 200)) }

  const handleZoomOut = () => { setZoomLevel((z) => Math.max(z - 20, 50)) }

  // Handle refresh
  const handleRefresh = () => {
    loadRealData()
  }

  // Reset zoom helper
  const resetZoom = () => {
    if (fullRange) {
      setSelectedTimeRange(fullRange)
      setZoomLevel(100)
      setBrushKey(prev => prev + 1)
    }
  }

  // Handle time range selection
  const handleTimeRangeChange = (range: [number, number]) => {
    setSelectedTimeRange(range)
  }

  // Filter data for rendering
  // For reliability, always render the full dataset. The Brush is kept for UI only.
  const SLICE_MAX = 2000
  const baseSlice = chartData
  const step = Math.max(1, Math.ceil(baseSlice.length / SLICE_MAX))
  const sliced = step === 1 ? baseSlice : baseSlice.filter((_, i) => i % step === 0)
  // Apply explicit time-range filtering so "Show Full Run" and future range UIs are effective
  const visibleData = selectedTimeRange
    ? sliced.filter(p => typeof p?.time === 'number' && Number.isFinite(p.time) && p.time >= selectedTimeRange[0] && p.time <= selectedTimeRange[1])
    : sliced
  
  // Simple debug logging without hooks
  console.log(`DEBUG: chartData.length=${chartData?.length}, selectedTimeRange=${selectedTimeRange ? `[${selectedTimeRange[0]}, ${selectedTimeRange[1]}]` : 'null'}, visibleData.length=${visibleData?.length}`)
  if (visibleData && visibleData.length > 0) {
    console.log(`DEBUG: visibleData time range: ${visibleData[0]?.time} to ${visibleData[visibleData.length - 1]?.time} seconds`)
    console.log(`DEBUG: First 3 data points:`, visibleData.slice(0, 3).map(d => ({ time: d.time, timeLabel: d.timeLabel })))
    console.log(`DEBUG: Last 3 data points:`, visibleData.slice(-3).map(d => ({ time: d.time, timeLabel: d.timeLabel })))
  }

  // Tooltip formatters
  const tooltipFormatter = (value: any, name: string) => {
    const metric = allMetrics.find((m) => m.id === name)
    const unit = metric?.unit || ""
    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0
    return [`${numValue.toFixed(2)}${unit}`, metric?.name || name]
  }

  const tooltipLabelFormatter = (label: string) => `Time: ${label}`

  // Count metrics on each axis
  const leftAxisMetrics = activeMetrics.filter((id) => getAxis(id) === "left").length

  const rightAxisMetrics = activeMetrics.filter((id) => getAxis(id) === "right").length

  // Helper to map pixel X (page) to time value using the true plot area bounds
  const pageXToTime = (pageX: number, svgRect: DOMRect, domain: [number, number]) => {
    // Prefer the CartesianGrid group bounding rect because it perfectly matches the
    // inner plotting area (excluding axes & labels). Fallback to the svg rect.
    const grid = containerRef.current?.querySelector('.recharts-cartesian-grid') as SVGGElement | null
    const plotRect = grid ? grid.getBoundingClientRect() : svgRect

    const clampedX = Math.max(plotRect.left, Math.min(plotRect.right, pageX))
    const perc = (clampedX - plotRect.left) / (plotRect.right - plotRect.left)
    const [dMin, dMax] = domain
    return dMin + perc * (dMax - dMin)
  }

  // Compute selection overlay JSX
  const selectionOverlay = (() => {
    if (!isDragging || dragStartX === null || dragCurrentX === null) return null
    const svg = containerRef.current?.querySelector('svg') as SVGSVGElement | null
    if (!svg) return null
    const rectSvg = svg.getBoundingClientRect()
    const grid = containerRef.current?.querySelector('.recharts-cartesian-grid') as SVGGElement | null
    const plotRect = grid ? grid.getBoundingClientRect() : rectSvg
    const selStart = Math.max(plotRect.left, Math.min(plotRect.right, Math.min(dragStartX, dragCurrentX)))
    const selEnd = Math.max(plotRect.left, Math.min(plotRect.right, Math.max(dragStartX, dragCurrentX)))
    const leftPx = selStart - rectSvg.left
    const widthPx = selEnd - selStart
    return (
      <div
        className="absolute top-0 h-full bg-blue-500/20 pointer-events-none z-10"
        style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
      />
    )
  })()

  return (
    <Card className="mb-6 border shadow-sm">
      <CardHeader className="pb-4 space-y-4">
        {/* Row 1: title & description */}
        <div>
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          {description && <CardDescription className="text-sm text-muted-foreground mt-1">{description}</CardDescription>}
        </div>

        {/* Row 2: tip callout & controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tip callout */}
          <div className="bg-muted/40 rounded-md px-3 py-2 text-xs text-muted-foreground leading-relaxed max-w-2xl">
            Drag across the chart to select a time window and zoom in. Press
            “Reset Zoom” to return to the full run.
          </div>

          {/* Control buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
                    <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh data from database</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={resetZoom}>
                    Reset Zoom
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset view to show complete run duration</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Tabs value={chartType} onValueChange={(value) => setChartType(value as "line" | "area")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="line" className="flex items-center gap-1">
                  <LineChartIcon className="h-3 w-3" />
                  Line
                </TabsTrigger>
                <TabsTrigger value="area" className="flex items-center gap-1">
                  <AreaChart className="h-3 w-3" />
                  Area
                </TabsTrigger>
              </TabsList>
            </Tabs>

          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-hidden relative">
        <div className="flex flex-col md:flex-row overflow-hidden">
          {/* Main chart area */}
          <div
            className="flex-1 p-4 min-w-0 relative"
            ref={containerRef}
            id={graphId}
            style={{ height: `${height}px` }}
            onMouseDown={(e) => {
              const svg = containerRef.current?.querySelector('svg')
              if (!svg) return
              setIsDragging(true)
              setDragStartX(e.clientX)
              setDragCurrentX(null)
            }}
          >
            {/* Interaction overlay */}
            <div
              className="absolute inset-0 z-20"
              style={{ cursor: isDragging ? 'grabbing' : 'crosshair', pointerEvents: isDragging ? 'auto' : 'none' }}
              onMouseMove={(e) => {
                if (!isDragging || dragStartX === null) return
                if (rafPendingRef.current) return
                rafPendingRef.current = true
                const clientX = e.clientX
                requestAnimationFrame(() => {
                  setDragCurrentX(clientX)
                  rafPendingRef.current = false
                })
              }}
              onMouseUp={(e) => {
                if (!isDragging || dragStartX === null) {
                  setIsDragging(false)
                  return
                }
                const svg = containerRef.current?.querySelector('svg')
                if (!svg) {
                  setIsDragging(false)
                  return
                }
                const plotRect = svg.getBoundingClientRect()
                const endPageX = dragCurrentX !== null ? dragCurrentX : e.clientX
                const diffPx = Math.abs(endPageX - dragStartX)
                setIsDragging(false)
                setDragCurrentX(null)
                if (diffPx < 10) return // ignore tiny drags

                const domain = selectedTimeRange || fullRange
                if (!domain) return

                const timeStartRaw = pageXToTime(Math.min(dragStartX, endPageX), plotRect, domain)
                const timeEndRaw = pageXToTime(Math.max(dragStartX, endPageX), plotRect, domain)
                const timeStart = Math.max(domain[0], Math.floor(timeStartRaw))
                const timeEnd = Math.min(domain[1], Math.ceil(timeEndRaw))

                // Snap to nearest actual bucket time for precision
                const snappedStart = snapTime(timeStart)
                const snappedEnd = snapTime(timeEnd)
                if (snappedEnd - snappedStart >= 1) {
                  setSelectedTimeRange([snappedStart, snappedEnd])
                }
                console.log('Drag selection', { timeStart: snappedStart, timeEnd: snappedEnd, domain })
              }}
              onDoubleClick={() => resetZoom()}
            />
            {selectedTimeRange ? (
              <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <LineChart key={chartKey} data={visibleData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={selectedTimeRange ? [selectedTimeRange[0], selectedTimeRange[1]] : ["dataMin", "dataMax"]}
                    allowDecimals={false}
                    tickFormatter={(value) => formatSeconds(Number(value))}
                    label={{ value: "Time (seconds)", position: "insideBottomRight", offset: -10 }}
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    yAxisId="left"
                    label={{ value: "Duration (μs)", angle: -90, position: "insideLeft" }}
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                    hide={leftAxisMetrics === 0}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{ value: "Count / Value", angle: -90, position: "insideRight" }}
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                    hide={rightAxisMetrics === 0}
                  />
                  <RechartsTooltip
                    formatter={tooltipFormatter}
                    labelFormatter={tooltipLabelFormatter}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
                  />
                  <Legend />

                  {/* Zoom brush removed to avoid numeric/lexicographic issues causing capping */}

                  {/* Render all active metrics */}
                  {allMetrics
                    .filter((metric) => {
                      const isActive = activeMetrics.includes(metric.id)
                      if (isActive) {
                        // Check if data exists for this metric
                        const hasData = chartData.some(point => point[metric.id] !== undefined && point[metric.id] !== null)
                        if (!hasData) {
                          console.warn(`Metric ${metric.id} is active but no data found in chartData`)
                        }
                      }
                      return isActive
                    })
                    .map((metric) => (
                      <Line
                        key={metric.id}
                        yAxisId={getAxis(metric.id)}
                        type="monotone"
                        dataKey={metric.id}
                        stroke={metric.color}
                        strokeWidth={2}
                        dot={false}
                        name={metric.name}
                        connectNulls={true}
                      />
                    ))}

                  {/* Event markers */}
                  {events?.filter(e => typeof e?.timeOffsetSecs === 'number' && Number.isFinite(e.timeOffsetSecs)).map((e, i) => (
                    <ReferenceLine
                      key={`evt-${i}`}
                      yAxisId="left"
                      x={Number(e.timeOffsetSecs)}
                      stroke={(e.params?.description || e.params?.type || 'Event').includes('resolves') ? '#111827' : '#ef4444'}
                      strokeWidth={3}
                      strokeDasharray={(e.params?.description || e.params?.type || 'Event').includes('resolves') ? "6 3" : "6 2"}
                    >
                      <Label value={e.params?.description || e.params?.type || 'Event'} position="insideTop" fill="#111827" fontSize={12} />
                    </ReferenceLine>
                  ))}
                </LineChart>
              ) : (
                <RechartsAreaChart key={chartKey} data={visibleData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={selectedTimeRange ? [selectedTimeRange[0], selectedTimeRange[1]] : ["dataMin", "dataMax"]}
                    allowDecimals={false}
                    tickFormatter={(value) => formatSeconds(Number(value))}
                    label={{ value: "Time (seconds)", position: "insideBottomRight", offset: -10 }}
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    yAxisId="left"
                    label={{ value: "Duration (μs)", angle: -90, position: "insideLeft" }}
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                    hide={leftAxisMetrics === 0}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{ value: "Count / Value", angle: -90, position: "insideRight" }}
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                    hide={rightAxisMetrics === 0}
                  />
                  <RechartsTooltip
                    formatter={tooltipFormatter}
                    labelFormatter={tooltipLabelFormatter}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
                  />
                  <Legend />

                  {/* Zoom brush removed to avoid numeric/lexicographic issues causing capping */}

                  {/* Render all active metrics as areas */}
                  {allMetrics
                    .filter((metric) => {
                      const isActive = activeMetrics.includes(metric.id)
                      if (isActive) {
                        // Check if data exists for this metric
                        const hasData = chartData.some(point => point[metric.id] !== undefined && point[metric.id] !== null)
                        if (!hasData) {
                          console.warn(`Metric ${metric.id} is active but no data found in chartData`)
                        }
                      }
                      return isActive
                    })
                    .map((metric) => (
                      <Area
                        key={metric.id}
                        yAxisId={getAxis(metric.id)}
                        type="monotone"
                        dataKey={metric.id}
                        stroke={metric.color}
                        fill={`${metric.color}20`}
                        strokeWidth={2}
                        name={metric.name}
                        connectNulls={true}
                      />
                    ))}

                  {/* Event markers */}
                  {events?.filter(e => typeof e?.timeOffsetSecs === 'number' && Number.isFinite(e.timeOffsetSecs)).map((e, i) => (
                    <ReferenceLine
                      key={`evt-${i}`}
                      yAxisId="left"
                      x={Number(e.timeOffsetSecs)}
                      stroke={(e.params?.description || e.params?.type || 'Event').includes('resolves') ? '#111827' : '#ef4444'}
                      strokeWidth={3}
                      strokeDasharray={(e.params?.description || e.params?.type || 'Event').includes('resolves') ? "6 3" : "6 2"}
                    >
                      <Label value={e.params?.description || e.params?.type || 'Event'} position="insideTop" fill="#111827" fontSize={12} />
                    </ReferenceLine>
                  ))}
                </RechartsAreaChart>
              )}
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p>Loading chart data...</p>
                  <p className="text-sm">Initializing time range</p>
                </div>
              </div>
            )}
            {selectionOverlay}
          </div>

          {/* Legend/Controls sidebar */}
          {showLegend && (
            <div className="w-full md:w-64 p-4 border-l bg-slate-50 dark:bg-slate-900/50 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Metrics</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLegend(false)}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Data availability summary */}
                <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <div className="font-medium mb-1">Data Availability:</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Available:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {metricsWithData.size} metrics
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Missing:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {allMetrics.length - metricsWithData.size} metrics
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {Object.entries(metricCategories).map(([categoryKey, metrics]) => (
                  <div key={categoryKey} className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {categoryKey}
                    </h5>
                    <div className="space-y-1">
                      {metrics.map((metric) => {
                        const hasData = metricsWithData.has(metric.id)
                        const isActive = activeMetrics.includes(metric.id)
                        
                        return (
                          <div key={metric.id} className="flex items-center space-x-2">
                            <div
                              className={`w-3 h-3 rounded-full border cursor-pointer ${!hasData ? 'opacity-50' : ''}`}
                              style={{
                                backgroundColor: isActive ? metric.color : "transparent",
                                borderColor: metric.color,
                                borderStyle: hasData ? "solid" : "dashed",
                              }}
                              onClick={() => hasData && toggleMetric(metric.id)}
                              title={hasData ? "Click to toggle" : "No data available"}
                            />
                            <span
                              className={`text-xs cursor-pointer flex-1 ${
                                !hasData 
                                  ? "text-red-400 line-through opacity-60"
                                  : isActive 
                                    ? "text-foreground" 
                                    : "text-muted-foreground"
                              }`}
                              onClick={() => hasData && toggleMetric(metric.id)}
                              title={hasData ? "Click to toggle" : "No data available for this metric"}
                            >
                              {metric.name}
                              {!hasData && (
                                <span className="ml-1 text-[10px] text-red-500 font-medium">
                                  (No Data)
                                </span>
                              )}
                            </span>
                            {isActive && hasData && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 text-xs"
                                onClick={() => toggleMetricAxis(metric.id)}
                              >
                                {getAxis(metric.id) === "left" ? "L" : "R"}
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Show legend toggle when hidden */}
        {!showLegend && (
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => setShowLegend(true)}
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
            Show Legend
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
