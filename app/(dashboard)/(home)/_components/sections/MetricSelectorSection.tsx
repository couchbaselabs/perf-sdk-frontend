"use client"

import { Badge } from "@/src/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { AVAILABLE_METRICS } from '@/src/lib/config/constants'

interface MetricSelectorSectionProps {
  selectedMetric: string
  onMetricChange: (metric: string) => void
}

export function MetricSelectorSection({ selectedMetric, onMetricChange }: MetricSelectorSectionProps) {
  return (
    <div className="mb-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Display Metric</CardTitle>
          <CardDescription>Select which metric to display across all charts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_METRICS.map((metric) => (
              <Badge
                key={metric.id}
                variant={selectedMetric === metric.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => onMetricChange(metric.id)}
              >
                {metric.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
