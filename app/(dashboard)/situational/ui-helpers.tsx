"use client"

import { Badge } from "@/src/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import { Info } from "lucide-react"
import { UnifiedBadge, BadgeType } from "@/src/components/shared/BadgeSystem"

export function getIdLinkColor() {
  return "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors duration-200"
}

export function isMixedProperty(property: any): boolean {
  return Array.isArray(property) && property.length > 1
}

export function MixedProperty({ 
  value, 
  asBadge = false, 
  badgeType = "default" 
}: { 
  value: string | string[] | number | boolean | Record<string, any> | null | undefined; 
  asBadge?: boolean;
  badgeType?: BadgeType;
}) {
  const mixed = isMixedProperty(value)
  const rawDisplay = mixed ? "Mixed" : Array.isArray(value) ? value[0] : value
  const displayValue = typeof rawDisplay === 'object' ? (rawDisplay == null ? '' : (() => {
    try { return JSON.stringify(rawDisplay) } catch { return String(rawDisplay) }
  })()) : String(rawDisplay ?? '')

  if (!mixed) {
    return asBadge ? (
      <UnifiedBadge type={badgeType} value={displayValue} />
    ) : (
      <span className="text-xs font-mono">{displayValue}</span>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 cursor-help">
            {asBadge ? (
              <Badge variant="secondary" className="bg-orange-500 text-white font-medium border-2 shadow-sm">
                {displayValue}
              </Badge>
            ) : (
              <span className="text-xs font-mono text-orange-600 font-medium">{displayValue}</span>
            )}
            <Info className="h-3.5 w-3.5 text-orange-600" aria-hidden="true" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-3 max-w-xs">
          <div className="space-y-2">
            <p className="text-xs font-semibold">All values:</p>
            <ul className="list-disc pl-4 text-xs space-y-1">
              {Array.isArray(value) && value.map((v, i) => {
                const text = typeof v === 'object' ? (() => { try { return JSON.stringify(v) } catch { return String(v) } })() : String(v)
                return <li key={i}>{text}</li>
              })}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}


