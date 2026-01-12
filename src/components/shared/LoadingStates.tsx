"use client"

import React from "react"
import { Skeleton } from "@/src/components/ui/skeleton"
import { AlertCircle, BarChart4 } from "lucide-react"

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center h-full min-h-[150px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
        <p className="mt-2 text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  className?: string;
}

export function LoadingSkeleton({ count = 1, height = "h-8", className = "" }: LoadingSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${height} w-full ${className}`} />
      ))}
    </div>
  )
}

interface ErrorDisplayProps {
  message?: string;
  details?: string;
}

export function ErrorDisplay({ message = "Failed to load data.", details }: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-red-500 dark:text-red-400 p-4">
      <AlertCircle className="h-10 w-10 mb-3" />
      <p className="text-lg font-semibold">{message}</p>
      {details && <p className="text-sm text-muted-foreground mt-1">{details}</p>}
    </div>
  )
}

interface EmptyStateProps {
  message?: string;
  description?: string;
}

export function EmptyState({ message = "No data available.", description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-muted-foreground p-4">
      <BarChart4 className="h-10 w-10 mb-3" />
      <p className="text-lg font-semibold">{message}</p>
      {description && <p className="text-sm text-center mt-1">{description}</p>}
    </div>
  )
}