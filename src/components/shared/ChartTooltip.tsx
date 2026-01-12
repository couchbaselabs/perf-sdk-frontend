/**
 * SHARED CUSTOM TOOLTIP COMPONENT
 * Consolidates 4 duplicate CustomTooltip implementations across chart components
 * Provides flexible, reusable tooltip for Recharts visualizations
 */

import React from 'react'

// ==========================================
// TOOLTIP INTERFACES
// ==========================================

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
}

interface PayloadEntry {
  name: string
  value: any
  color: string
  payload?: any
}

// ==========================================
// MAIN TOOLTIP COMPONENT
// ==========================================

/**
 * Flexible CustomTooltip component that replaces 4 duplicate implementations
 * Used by: performance-chart, performance-bar-chart, performance-line-chart, comparative-performance-chart
 */
export const CustomTooltip: React.FC<TooltipProps> = ({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  showRunCount = true,
  showClusterInfo = false,
  showSDKInfo = false,
  metricUnit = "μs"
}) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-white p-3 border rounded-md shadow-md max-w-xs">
      {label && (
        <p className="font-medium">
          {labelFormatter ? labelFormatter(label) : `Version ${label}`}
        </p>
      )}
      
      {payload
        .filter((entry: PayloadEntry) => {
          // CRITICAL FIX: Filter out zero, null, undefined values to prevent "0" showing in tooltips
          const value = entry.value
          return value !== null && value !== undefined && value !== 0 && value !== ''
        })
        .map((entry: PayloadEntry, index: number) => {
        const item = entry.payload || {}
        
        return (
          <div key={index} className="mt-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-medium">{entry.name}</span>
            </div>
            
            <div className="text-sm mt-1">
              {formatter 
                ? formatter(entry.value, entry.name, entry)[0]
                : `${entry.value} ${metricUnit}`
              }
            </div>

            {/* SDK Info */}
            {showSDKInfo && item.sdkName && (
              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: item.sdkColor }} />
                <span>SDK {item.sdkName}</span>
              </div>
            )}

            {/* Cluster Info */}
            {showClusterInfo && item.clusterName && (
              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: item.clusterColor }} />
                <span>Cluster {item.clusterName}</span>
              </div>
            )}

            {/* Run Count */}
            {showRunCount && item.runCount && (
              <p className="text-xs text-muted-foreground mt-1">
                {item.runCount} run{item.runCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ==========================================
// SPECIALIZED TOOLTIP VARIANTS
// ==========================================

/**
 * Simple tooltip for basic charts (replaces performance-chart.tsx CustomTooltip)
 */
export const SimpleTooltip: React.FC<Omit<TooltipProps, 'showClusterInfo' | 'showSDKInfo'>> = (props) => (
  <CustomTooltip 
    {...props} 
    showClusterInfo={false} 
    showSDKInfo={false} 
  />
)

/**
 * Performance tooltip with cluster info (replaces performance-bar-chart.tsx CustomTooltip)
 */
export const PerformanceTooltip: React.FC<Omit<TooltipProps, 'showClusterInfo' | 'showSDKInfo'>> = (props) => (
  <CustomTooltip 
    {...props} 
    showClusterInfo={true} 
    showSDKInfo={true} 
  />
)

/**
 * Line chart tooltip for time series data (replaces performance-line-chart.tsx CustomTooltip)
 */
export const LineChartTooltip: React.FC<TooltipProps> = (props) => (
  <CustomTooltip 
    {...props}
    labelFormatter={(label) => `Time Offset: ${label}s`}
    showRunCount={false}
  />
)

/**
 * Comparative tooltip with baseline info (replaces comparative-performance-chart.tsx CustomTooltip)
 */
export const ComparativeTooltip: React.FC<TooltipProps> = (props) => (
  <CustomTooltip 
    {...props}
    showClusterInfo={true}
    showSDKInfo={true}
    showRunCount={false}
  />
)

// Export default as the main component
// No default export to avoid duplicate export names
