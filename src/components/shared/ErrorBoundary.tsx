"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/src/components/ui/card"
import { AlertCircle } from "lucide-react"
import { logger } from "@/src/lib/utils/logger"

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Uncaught error in ErrorBoundary:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-100">
              <AlertCircle className="h-5 w-5" /> Something went wrong.
            </CardTitle>
            <CardDescription className="text-red-600 dark:text-red-300">
              An unexpected error occurred. Please try again or contact support.
            </CardDescription>
          </CardHeader>
          {this.state.error && (
            <CardContent className="text-sm text-red-500 dark:text-red-400">
              <p className="font-semibold">Error Details:</p>
              <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded-md overflow-auto max-h-40">
                <code>{this.state.error.message}</code>
              </pre>
            </CardContent>
          )}
        </Card>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary