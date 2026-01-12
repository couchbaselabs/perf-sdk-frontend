// Shared chart components and utilities
// Consolidated from components/shared/ChartLegend.tsx and ChartTooltip.tsx

import React from 'react'

// Re-export unified components
export { CustomLegend } from "./custom-legend"
export { CustomTooltip } from "./custom-tooltip"

// Re-export formatters and utilities from the dedicated formatters module
export { formatValue, formatDuration, formatPercentage, formatTimeOffset, getChartColors, generateColorForSdk, ChartColorManager, createChartColors } from "./formatters"

// Loading and error states for charts
export function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  )
}

export function ChartError({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center h-64 border border-red-200 rounded bg-red-50">
      <div className="text-center">
        <div className="text-red-600 font-medium">Chart Error</div>
        <div className="text-red-500 text-sm mt-1">{error}</div>
      </div>
    </div>
  )
}

export function ChartEmpty({ message = "No data available" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-64 border border-gray-200 rounded bg-gray-50">
      <div className="text-center">
        <div className="text-gray-600 font-medium">No Data</div>
        <div className="text-gray-500 text-sm mt-1">{message}</div>
      </div>
    </div>
  )
}
