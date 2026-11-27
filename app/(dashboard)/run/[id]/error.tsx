"use client"

import { startTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent } from "@/src/components/ui/card"
import { ErrorDisplay } from "@/src/components/shared/LoadingStates"

export default function RunDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  const handleRetry = () => {
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  return (
    <div className="container mx-auto py-6 px-6 max-w-7xl">
      <Card>
        <CardContent className="py-8 flex flex-col items-center gap-3">
          <ErrorDisplay
            message="Failed to load run details."
            details={error.message || "Storage error while loading run telemetry."}
          />
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
