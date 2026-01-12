// Shared chart interfaces for performance components

export interface ChartDataPoint {
  name: string
  value: number
  clusterVersion?: string
  sdkVersion?: string
  runIds?: string[]
  datetime?: string
}

export interface ChartMetric {
  id: string
  label: string
  color: string
  unit?: string
  axis?: "left" | "right"
}

// ==========================================
// CONSOLIDATED CHART DATA TYPES (from lib/api.ts)
// ==========================================

export interface MetricData {
  id: string
  text: string
}

export interface ChartData {
  type: "bar" | "line"
  data: any
  runs: any[]
  annotations?: any[]
}

export interface BaseChartProps {
  title: string
  description?: string
  data: ChartDataPoint[]
  isLoading?: boolean
  onRefresh?: () => void
  className?: string
}

export interface PerformanceChartProps extends BaseChartProps {
  metric: string
  metricLabel: string
  metricUnit?: string
  color?: string
  borderColor?: string
}

export interface ComparativeChartProps extends PerformanceChartProps {
  chartType?: "bar" | "grouped" | "stacked"
  normalizeData?: boolean
  baselineClusterVersion?: string
  baselineSdkVersion?: string
}

export interface LineChartDataset {
  label: string
  data: Array<{
    x: number
    y: number
    nested?: {
      datetime: string
      runid: string
    }
  }>
  borderColor: string
  backgroundColor?: string
  yAxisID: string
  fill?: boolean
  pointRadius?: number
  borderWidth?: number
}

export interface LineChartData {
  datasets: LineChartDataset[]
  annotations?: Record<string, any>
}


// Common chart configurations
export const DEFAULT_CHART_CONFIG = {
  height: 300,
  margin: { top: 5, right: 30, left: 20, bottom: 5 },
  animationDuration: 300
} as const
