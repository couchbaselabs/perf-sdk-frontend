"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Sidebar from "@/src/components/layout/sdk-navigation-sidebar"

interface AppLayoutProps {
  children: React.ReactNode
}

/**
 * Normalize SDK values from DB format to sidebar language keys.
 * E.g., "COLUMNAR_SDK_GO" → "go", "java-sdk" → "java", "Go" → "go"
 */
function normalizeDetectedSdk(sdkValue: string): string {
  if (!sdkValue || sdkValue === 'unknown') return ''

  const v = sdkValue.toUpperCase()

  // Handle COLUMNAR_SDK_* pattern
  if (v.startsWith('COLUMNAR_SDK_')) {
    const lang = v.replace('COLUMNAR_SDK_', '').toLowerCase()
    // Map NODEJS → node
    if (lang === 'nodejs') return 'node'
    return lang
  }

  // Handle language-sdk pattern (e.g., java-sdk)
  if (sdkValue.endsWith('-sdk')) {
    return sdkValue.replace('-sdk', '').toLowerCase()
  }

  // Handle direct language names (go, Go, GO, java, etc.)
  return sdkValue.toLowerCase()
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [mode, setMode] = useState<"performance" | "situational" | "faas">(() => {
    if (pathname?.includes("/faas")) return "faas"
    if (pathname?.includes("/situational")) return "situational"
    return "performance"
  })
  const [activeSdk, setActiveSdk] = useState(() => {
    // Initialize from URL parameter if available
    const urlSdk = searchParams?.get('sdk')
    return urlSdk || "java"
  })
  const [selectedSituationalSdk, setSelectedSituationalSdk] = useState("")

  // Update mode when pathname changes
  useEffect(() => {
    let newMode: "performance" | "situational" | "faas" = "performance"
    if (pathname?.includes("/faas")) {
      newMode = "faas"
    } else if (pathname?.includes("/situational")) {
      newMode = "situational"
    }
    setMode(newMode)
  }, [pathname])

  // Listen for URL parameter changes for SDK
  useEffect(() => {
    const urlSdk = searchParams?.get('sdk')
    if (urlSdk && urlSdk !== activeSdk) {
      console.log('AppLayout: SDK from URL parameter:', urlSdk)
      setActiveSdk(urlSdk)
      // Event will be dispatched automatically by useEffect when activeSdk changes
    }
  }, [searchParams?.get('sdk'), activeSdk]) // Fixed: Use specific param value instead of entire searchParams object

  // Dispatch initial SDK selection on mount and when activeSdk changes
  useEffect(() => {
    console.log('AppLayout: Dispatching SDK change event for:', activeSdk)
    if (typeof window !== "undefined") {
      // Add a small delay to ensure all components are mounted
      setTimeout(() => {
        const event = new CustomEvent("sdkChange", { detail: activeSdk })
        window.dispatchEvent(event)
        console.log('AppLayout: Dispatched sdkChange event with:', activeSdk)
      }, 100)
    }
  }, [activeSdk]) // Depend on activeSdk to dispatch when it changes

  // Situational SDK: Always read from URL params (single source of truth)
  useEffect(() => {
    if (mode === 'situational') {
      const urlSdk = searchParams?.get('sdk') || ''
      if (urlSdk !== selectedSituationalSdk) {
        setSelectedSituationalSdk(urlSdk)
      }
    }
  }, [searchParams, mode, selectedSituationalSdk])

  const handleModeChange = (newMode: "performance" | "situational" | "faas") => {
    setMode(newMode)
  }

  const handleSdkChange = (sdk: string) => {
    console.log('AppLayout: handleSdkChange called with SDK:', sdk)
    // Use Next.js router which is basePath-aware; this becomes /results/?sdk=...
    router.push(`/?sdk=${sdk}`)

    setActiveSdk(sdk)
    // Always dispatch event, even if SDK hasn't changed, to ensure components update
    if (typeof window !== "undefined") {
      setTimeout(() => {
        const event = new CustomEvent("sdkChange", { detail: sdk })
        window.dispatchEvent(event)
        console.log('AppLayout: Force dispatched sdkChange event with:', sdk)
      }, 100)
    }
  }

  const handleSituationalSdkChange = (sdk: string) => {
    setSelectedSituationalSdk(sdk)

    // Navigate to /situational with SDK as URL param
    // This works from any page - detail pages redirect back to list with filter
    const searchParams = new URLSearchParams()
    if (sdk) {
      searchParams.set('sdk', sdk)
    }
    const url = searchParams.toString() ? `/situational?${searchParams.toString()}` : '/situational'
    router.push(url)
  }

  // Map faas mode to performance for the sidebar since sidebar doesn't have faas mode
  const sidebarMode = mode === "faas" ? "performance" : mode

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 w-screen overflow-x-hidden">
      <Sidebar
        activeSdk={activeSdk}
        onSdkChange={handleSdkChange}
        mode={sidebarMode}
        selectedSituationalSdk={selectedSituationalSdk}
        onSituationalSdkChange={handleSituationalSdkChange}
        onModeChange={handleModeChange}
      />
      <div className="flex-1 flex flex-col overflow-hidden max-w-full">
        <header className="sticky top-0 z-10 border-b bg-white/90 dark:bg-slate-900/90 backdrop-blur">
          <div className="flex h-16 items-center px-6 max-w-full overflow-x-hidden">
            <div className="ml-auto flex items-center gap-4">{/* Header actions can go here */}</div>
          </div>
        </header>

        <main className="flex-1 overflow-auto max-w-full">{children}</main>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 w-screen overflow-x-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading layout...</p>
          </div>
        </div>
      </div>
    }>
      <AppLayoutContent>{children}</AppLayoutContent>
    </Suspense>
  )
}
