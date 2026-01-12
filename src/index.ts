// src/index.ts - Top-level exports for clean src/ structure

// Component exports
export * from './components/shared'
export * from './components/ui'

// Shared hooks
export * from './shared/hooks'

// Chart utilities (specific exports to avoid conflicts)
export {
  ChartColorManager,
  getChartColors,
  createChartColors,
  generateColorForSdk,
  defaultColorManager,
  chartColorUtils
} from './shared/charts/colors'

export {
  formatValue,
  CustomLegend,
  CustomTooltip
} from './shared/charts'

// Data transformation
export { DataTransformers } from './shared/data/transformers'

// Utilities (specific exports to avoid conflicts)
export { formatDate, formatDateShort } from './lib/utils/formatting'
// API middleware is available directly from ./lib/api/middleware

// Type exports
export * from './types'

// Configuration
export * from './lib/config/constants'