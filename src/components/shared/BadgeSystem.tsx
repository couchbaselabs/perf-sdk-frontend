"use client"

import { Badge } from "@/src/components/ui/badge"
import { getSdkColorByLanguage } from "@/src/lib/sdk-version-service"

// Simple className utility
function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export type BadgeType = 
  | "sdk" 
  | "version" 
  | "environment" 
  | "score" 
  | "status" 
  | "csp" 
  | "cluster" 
  | "private-link"
  | "default"

interface UnifiedBadgeProps {
  type: BadgeType
  value: string | number | boolean | undefined
  className?: string
  size?: "sm" | "md" | "lg"
}

/**
 * Unified Badge System
 * Consolidates all badge styling logic with consistent TypeScript support
 */
export function UnifiedBadge({ type, value, className, size = "md" }: UnifiedBadgeProps) {
  const displayValue = String(value ?? '')
  
  // Size classes
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-xs font-semibold",
    lg: "px-3 py-1 text-sm font-semibold"
  }
  
  // Base classes for all badges
  const baseClasses = "inline-flex items-center rounded-md border-2 shadow-sm transition-all duration-200"
  
  // Consolidated status color logic
  const getStatusStyles = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed': 
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'running': 
      case 'ongoing': 
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'failed': 
        return 'bg-red-100 text-red-800 border-red-300'
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }
  
  // Consolidated environment color logic
  const getEnvironmentStyles = (environment: string): string => {
    switch (environment.toLowerCase()) {
      case 'production': 
      case 'prod':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'staging': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'development': 
      case 'dev':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'sandbox (capella)': 
      case 'sandbox': 
        return 'bg-purple-100 text-purple-800 border-purple-300'
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }
  
  // Consolidated score color logic
  const getScoreStyles = (score: number): string => {
    if (score >= 90) return 'bg-emerald-500 text-white border-emerald-400'
    if (score >= 80) return 'bg-amber-500 text-white border-amber-400'
    if (score >= 70) return 'bg-orange-500 text-white border-orange-400'
    if (score >= 60) return 'bg-red-500 text-white border-red-400'
    if (score < 0) return 'bg-red-600 text-white border-red-500'
    return 'bg-slate-500 text-white border-slate-400'
  }
  
  // Type-specific styling with consolidated logic
  const getTypeStyles = (): string => {
    switch (type) {
      case "sdk":
        return `text-white border-opacity-80`
      
      case "version":
        return "bg-purple-100 text-purple-800 border-purple-300"
      
      case "environment":
        return getEnvironmentStyles(displayValue)
      
      case "score":
        return getScoreStyles(Number(value))
      
      case "status":
        return getStatusStyles(displayValue)
      
      case "csp":
        return "bg-green-100 text-green-800 border-green-300"
      
      case "cluster":
        return "bg-indigo-100 text-indigo-800 border-indigo-300"
      
      case "private-link":
        if (value === true || displayValue.toLowerCase() === 'yes') {
          return "bg-emerald-100 text-emerald-700 border-emerald-300"
        } else {
          return "bg-slate-100 text-slate-600 border-slate-300"
        }
      
      default:
        return "bg-slate-100 text-slate-700 border-slate-300"
    }
  }
  
  const typeStyles = getTypeStyles()
  
  // For SDK badges, we need to apply the background color via style
  if (type === "sdk") {
    const sdkColor = getSdkColorByLanguage(displayValue)
    return (
      <Badge 
        className={cn(baseClasses, sizeClasses[size], typeStyles, className)}
        style={{ 
          backgroundColor: sdkColor,
          borderColor: sdkColor + '80' // Add transparency to border
        }}
      >
        {displayValue}
      </Badge>
    )
  }
  
  return (
    <Badge className={cn(baseClasses, sizeClasses[size], typeStyles, className)}>
      {displayValue}
    </Badge>
  )
}

/**
 * Badge System - Factory functions for common badge types
 * Provides type-safe, convenient badge creation
 */
export const BadgeSystem = {
  sdk: (value: string | undefined, props?: Omit<UnifiedBadgeProps, "type" | "value">) => 
    <UnifiedBadge type="sdk" value={value} {...props} />,
    
  version: (value: string | undefined, props?: Omit<UnifiedBadgeProps, "type" | "value">) => 
    <UnifiedBadge type="version" value={value} {...props} />,
    
  environment: (value: string | undefined, props?: Omit<UnifiedBadgeProps, "type" | "value">) => 
    <UnifiedBadge type="environment" value={value} {...props} />,
    
  score: (value: number | undefined, props?: Omit<UnifiedBadgeProps, "type" | "value">) => 
    <UnifiedBadge type="score" value={value} {...props} />,
    
  status: (value: string | undefined, props?: Omit<UnifiedBadgeProps, "type" | "value">) => 
    <UnifiedBadge type="status" value={value} {...props} />,
    
  csp: (value: string | undefined, props?: Omit<UnifiedBadgeProps, "type" | "value">) => 
    <UnifiedBadge type="csp" value={value} {...props} />,
    
  cluster: (value: string | undefined, props?: Omit<UnifiedBadgeProps, "type" | "value">) => 
    <UnifiedBadge type="cluster" value={value} {...props} />,
    
  privateLink: (value: boolean | string | undefined, props?: Omit<UnifiedBadgeProps, "type" | "value">) => 
    <UnifiedBadge type="private-link" value={value} {...props} />,
}

// Convenience components for common badge types (backward compatibility)
export const SdkBadge = ({ value, ...props }: Omit<UnifiedBadgeProps, "type">) => 
  <UnifiedBadge type="sdk" value={value} {...props} />

export const VersionBadge = ({ value, ...props }: Omit<UnifiedBadgeProps, "type">) => 
  <UnifiedBadge type="version" value={value} {...props} />

export const EnvironmentBadge = ({ value, ...props }: Omit<UnifiedBadgeProps, "type">) => 
  <UnifiedBadge type="environment" value={value} {...props} />

export const ScoreBadge = ({ value, ...props }: Omit<UnifiedBadgeProps, "type">) => 
  <UnifiedBadge type="score" value={value} {...props} />

export const StatusBadge = ({ value, ...props }: Omit<UnifiedBadgeProps, "type">) => 
  <UnifiedBadge type="status" value={value} {...props} />

export const CspBadge = ({ value, ...props }: Omit<UnifiedBadgeProps, "type">) => 
  <UnifiedBadge type="csp" value={value} {...props} />

export const ClusterBadge = ({ value, ...props }: Omit<UnifiedBadgeProps, "type">) => 
  <UnifiedBadge type="cluster" value={value} {...props} />

export const PrivateLinkBadge = ({ value, ...props }: Omit<UnifiedBadgeProps, "type">) => 
  <UnifiedBadge type="private-link" value={value} {...props} />

// Status color utilities (for non-badge usage)
export const statusColors = {
  getStatusColor: (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed': 
        return 'bg-green-100 text-green-800 border-green-200'
      case 'running': 
      case 'ongoing': 
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'failed': 
        return 'bg-red-100 text-red-800 border-red-200'
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  },

  getEnvironmentBadgeVariant: (environment: string): string => {
    switch (environment?.toLowerCase()) {
      case 'production': 
        return 'bg-blue-500 text-white font-medium'
      case 'development': 
        return 'bg-emerald-500 text-white font-medium'
      case 'staging': 
        return 'bg-amber-500 text-white font-medium'
      case 'sandbox (capella)': 
      case 'sandbox': 
        return 'bg-purple-500 text-white font-medium'
      default: 
        return 'bg-slate-500 text-white font-medium'
    }
  },

    getScoreBadgeColor: (score: number): string => {
    if (score >= 90) return 'bg-emerald-500 text-white shadow-sm'
    if (score >= 80) return 'bg-amber-500 text-white shadow-sm'
    if (score >= 70) return 'bg-orange-500 text-white shadow-sm'
    if (score >= 60) return 'bg-red-500 text-white shadow-sm'
    if (score < 0) return 'bg-red-600 text-white shadow-sm'
    return 'bg-slate-500 text-white shadow-sm'
  },

  getAggregateScoreBadgeClass: (score: number | string, runs: number | string): string => {
    const totalScore = Number(score)
    const numRuns = Number(runs)
    if (!Number.isFinite(totalScore) || !Number.isFinite(numRuns) || numRuns <= 0) {
      return "bg-slate-500 text-white border-slate-400 border-2"
    }
    // Aggregate score is per-run total; treat perfect as runs*100
    if (totalScore === numRuns * 100) return "bg-emerald-500 text-white border-emerald-400 border-2"
    // Any non-perfect, including negative, shows red
    return "bg-red-500 text-white border-red-400 border-2"
  }
}

// Legacy exports for backward compatibility
export const getStatusColor = statusColors.getStatusColor
export const getEnvironmentBadgeVariant = statusColors.getEnvironmentBadgeVariant  
export const getScoreBadgeColor = statusColors.getScoreBadgeColor
export const getAggregateScoreBadgeClass = statusColors.getAggregateScoreBadgeClass
