import React from 'react'

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
        .filter((entry: any) => {
          const value = entry.value
          return value !== null && value !== undefined && value !== 0 && value !== ''
        })
        .map((entry: any, index: number) => {
          const item = entry.payload || {}
          return (
            <div key={index} className="mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm font-medium">{entry.name}</span>
              </div>
              <div className="text-sm mt-1">
                {formatter ? formatter(entry.value, entry.name, entry)[0] : `${entry.value} ${metricUnit}`}
              </div>
              {showSDKInfo && item.sdkName && (
                <div className="flex items-center mt-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: item.sdkColor }} />
                  <span>SDK {item.sdkName}</span>
                </div>
              )}
              {showClusterInfo && item.clusterName && (
                <div className="flex items-center mt-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: item.clusterColor }} />
                  <span>Cluster {item.clusterName}</span>
                </div>
              )}
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


