// Shared chart formatters (re-exported from unified utilities to avoid duplication)
export {
  formatTimeOffset,
  formatValue,
  formatDuration,
  formatPercentage
} from '@/src/lib/utils/formatting'

/**
 * Simplified Chart Color System
 * 
 * Usage Examples:
 * 
 * 1. Simple sequential colors:
 *    const colorManager = new ChartColorManager()
 *    const color1 = colorManager.next()
 *    const color2 = colorManager.next()
 * 
 * 2. Semantic colors:
 *    const errorColor = colorManager.getColor('errors')
 *    const successColor = colorManager.getColor('success')
 * 
 * 3. Bulk assignment:
 *    const colors = createChartColors(['metric1', 'metric2'], ['duration', 'memory'])
 */
const CHART_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red  
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F472B6', // Rose
  '#A855F7', // Violet
] as const

// Semantic colors for common metric types
const SEMANTIC_COLORS = {
  errors: '#EF4444',        // Red
  success: '#10B981',       // Green
  duration: '#3B82F6',      // Blue
  memory: '#8B5CF6',        // Purple
  cpu: '#84CC16',          // Lime
  operations: '#06B6D4',    // Cyan
} as const

// Delegate color management to centralized module
import { ChartColorManager } from './colors'
export { ChartColorManager }

// Legacy exports for backward compatibility
export function getChartColors(): string[] {
  return [...CHART_COLORS]
}

// Convenience function for quick color assignment
export function createChartColors(items: string[], semanticTypes?: (keyof typeof SEMANTIC_COLORS)[]): { [key: string]: string } {
  const colorManager = new ChartColorManager()
  const result: { [key: string]: string } = {}
  
  items.forEach((item, index) => {
    const semanticType = semanticTypes?.[index]
    result[item] = colorManager.getColor(semanticType)
  })
  
  return result
}

export function generateColorForSdk(sdkName: string): string {
  const colors = getChartColors()
  const hash = sdkName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  return colors[Math.abs(hash) % colors.length]
}


