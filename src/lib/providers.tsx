'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// CRITICAL FIX: Configure QueryClient to prevent stale data issues
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Ensure fresh data on navigation and component mount
      staleTime: 0,
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </NextThemesProvider>
  )
}
