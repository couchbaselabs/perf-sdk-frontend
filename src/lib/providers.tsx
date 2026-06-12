'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Performance data for a given run/version is immutable, so we cache it.
// Cached results are served instantly on revisits; only genuinely new
// selections hit the network.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute: reuse results instead of refetching on every interaction
      gcTime: 1000 * 60 * 5, // 5 minutes
      refetchOnMount: true, // refetch only when stale, not on every mount
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
