import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get a consistent color for cluster versions
 * Used across charts and components for cluster version visualization
 */
export function getClusterVersionColor(version: string): string {
  // Generate consistent colors based on version string
  const colors = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#f97316', // orange-500
    '#ec4899', // pink-500
    '#6b7280', // gray-500
  ]
  
  // Simple hash function to consistently map version strings to colors
  let hash = 0
  for (let i = 0; i < version.length; i++) {
    const char = version.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

/**
 * Generate a UUID v4
 * Used for creating unique identifiers
 */
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// formatDateTime moved to lib/utils/date.ts for centralized date formatting

// ==========================================
// CONSOLIDATED UTILITIES FROM MICRO-FILES
// ==========================================

/**
 * Version comparison utilities (from versions.ts)
 * Consolidating 14-line file into main utils
 */
const semver = require('semver')

export function versionCompare(version1: string, version2: string) {
  return semver.compare(normalizeVersion(version1), normalizeVersion(version2))
}

/**
 * Normalizes a version string to make it compatible with semver.
 * E.g. handles "1.0.3-20241025.022106+960bdda", where the ".0" is illegal.
 */
function normalizeVersion(version: string): string {
  return version.replace(/\.0(\d{5})/, '-$1')
}

/**
 * Color shade provider for charts (from shade-provider.ts)
 * Consolidating 15-line file into main utils
 */
export class ShadeProvider {
  private shades = [
    '#E2F0CB',
    '#B5EAD7', 
    '#C7CEEA',
    '#FF9AA2',
    '#FFB7B2',
    '#FFDAC1',
  ]
  private shadeIdx = 0

  nextShade(): string {
    return this.shades[this.shadeIdx++ % this.shades.length]
  }
}
