/**
 * Unified Chart Color Management System
 * 
 * This module provides centralized color management for all charts in the application.
 * It replaces scattered color managers with a single, consistent system.
 */
import { baseVersion, classifyVersion, versionCompare } from '@/src/lib/core-ui-utilities'

// Chart color constants
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

// Distinct colors for non-release version bars. branch-snapshot (e.g. 3.11.x) and
// main are "moving" tags shown at the end of the chart; gerrit/PR bars are shown
// inline (ordered by build date) and get their own color so they stand out.
// Each branch gets its own color from BRANCH_BAR_COLORS (see snapshotBarColors).
export const SNAPSHOT_BAR_COLORS = {
  main: '#8B5CF6',   // Purple
  gerrit: '#EC4899', // Pink
} as const

// One per branch snapshot in a chart. Kept clear of the release bars' green,
// main's purple and gerrit's pink.
export const BRANCH_BAR_COLORS = [
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#64748B', // Slate
  '#A16207', // Brown
] as const

/**
 * The snapshot color of each non-release bar in a chart, keyed by bar name
 * ("main@a1b2c3d", "3.12.x@a1b2c3d", "refs-..."). main is always purple. Each
 * branch present gets a pool color in version order, shared by all of that
 * branch's commit bars, so branches are distinct within the chart (the pool only
 * wraps beyond six branches). Release bars are absent: they use the chart color.
 * `branches` lists each branch with its color, for the legend.
 */
export function snapshotBarColors(names: readonly unknown[]): {
  byName: Map<string, string>
  branches: Array<{ branch: string; color: string }>
} {
  const labels = names.filter((n): n is string => typeof n === 'string')
  const branchNames = Array.from(
    new Set(labels.filter((n) => classifyVersion(n) === 'branch-snapshot').map(baseVersion)),
  ).sort(versionCompare)
  const branches = branchNames.map((branch, i) => ({ branch, color: BRANCH_BAR_COLORS[i % BRANCH_BAR_COLORS.length] }))
  const branchColor = new Map(branches.map((b) => [b.branch, b.color]))

  const byName = new Map<string, string>()
  for (const name of labels) {
    const kind = classifyVersion(name)
    const color =
      kind === 'main' ? SNAPSHOT_BAR_COLORS.main
      : kind === 'gerrit' ? SNAPSHOT_BAR_COLORS.gerrit
      : kind === 'branch-snapshot' ? branchColor.get(baseVersion(name))
      : undefined
    if (color) byName.set(name, color)
  }
  return { byName, branches }
}

// Semantic colors for common metric types
const SEMANTIC_COLORS = {
  errors: '#EF4444',        // Red
  success: '#10B981',       // Green
  duration: '#3B82F6',      // Blue
  memory: '#8B5CF6',        // Purple
  cpu: '#84CC16',          // Lime
  operations: '#06B6D4',    // Cyan
} as const

/**
 * Chart Color Manager Class
 * 
 * Provides consistent color assignment for chart elements.
 * Supports both sequential and semantic color assignment.
 */
export class ChartColorManager {
  private index = 0
  next(): string { return CHART_COLORS[this.index++ % CHART_COLORS.length] }
  getColor(type?: keyof typeof SEMANTIC_COLORS): string { return type && SEMANTIC_COLORS[type] ? SEMANTIC_COLORS[type] : this.next() }
  getByIndex(index: number): string { return CHART_COLORS[index % CHART_COLORS.length] }
  reset(): void { this.index = 0 }
}

/**
 * Get all available chart colors
 */
export function getChartColors(): string[] {
  return [...CHART_COLORS]
}

/**
 * Create a color mapping for a list of items
 */
export function createChartColors(
  items: string[], 
  semanticTypes?: (keyof typeof SEMANTIC_COLORS)[]
): { [key: string]: string } {
  const colorManager = new ChartColorManager()
  const result: { [key: string]: string } = {}
  
  items.forEach((item, index) => {
    const semanticType = semanticTypes?.[index]
    result[item] = colorManager.getColor(semanticType)
  })
  
  return result
}

/**
 * Generate a consistent color for SDK names
 */
export function generateColorForSdk(sdkName: string): string {
  const colors = getChartColors()
  const hash = sdkName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  return colors[Math.abs(hash) % colors.length]
}

// Export color constants
export const chartColors = CHART_COLORS
export const semanticColors = SEMANTIC_COLORS

// Export a default instance for convenience
export const defaultColorManager = new ChartColorManager()

// Type definitions
export type ChartColor = typeof CHART_COLORS[number]
export type SemanticColorType = keyof typeof SEMANTIC_COLORS
export type ColorMapping = { [key: string]: string }

// Convenience object for easy access
export const chartColorUtils = {
  ChartColorManager,
  getChartColors,
  createChartColors,
  generateColorForSdk,
  defaultColorManager,
  createManager: () => new ChartColorManager(),
  colorByIndex: (i: number) => CHART_COLORS[i % CHART_COLORS.length],
}
