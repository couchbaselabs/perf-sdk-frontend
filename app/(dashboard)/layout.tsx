import type React from "react"
import AppLayout from "@/src/components/layout/app-layout"

/**
 * Persistent shell for all dashboard routes. AppLayout (sidebar + header) lives
 * here so it mounts once and survives navigations — only the `children` content
 * area swaps (and shows the route's `loading.tsx` skeleton) when navigating.
 *
 * Routes that need bespoke chrome (e.g. `app/sdk`, `app/graph`) deliberately sit
 * OUTSIDE this group and render their own layout.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
