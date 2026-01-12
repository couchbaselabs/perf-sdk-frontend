import React from "react"

// Common legend props interface
interface CustomLegendProps {
  payload?: Array<{
    clusterVersion?: string
    clusterName?: string
    payload?: {
      clusterName?: string
      clusterColor?: string
    }
    color?: string
  }>
  type?: "cluster" | "version"
}

/**
 * Shared CustomLegend component for charts
 * Replaces duplicate implementations in comparative-performance-chart.tsx and performance-bar-chart.tsx
 */
export function CustomLegend({ payload, type = "cluster" }: CustomLegendProps) {
  if (!payload || payload.length === 0) return null

  // Group by cluster version or name
  const groups: Record<string, any[]> = {}
  
  payload.forEach((entry: any) => {
    let key: string
    
    if (type === "version") {
      key = entry.clusterVersion || "Unknown"
    } else {
      key = entry.payload?.clusterName || entry.clusterName || "Unknown"
    }
    
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(entry)
  })

  return (
    <div className="flex flex-wrap gap-4 justify-center mt-2 px-4">
      {Object.entries(groups).map(([key, entries]) => (
        <div key={key} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ 
              backgroundColor: entries[0]?.payload?.clusterColor || entries[0]?.color || "#000"
            }} 
          />
          <span className="text-xs">
            {type === "version" ? `Cluster ${key}` : `Cluster ${key}`}
          </span>
        </div>
      ))}
    </div>
  )
}
