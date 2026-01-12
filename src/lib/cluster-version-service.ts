// Types for cluster version data
export interface ClusterVersion {
  id: string
  name: string
  color: string
  releaseDate: string
  isActive: boolean
  description?: string
}

import { getClusterVersionColor as getColorFromUtils } from './core-ui-utilities'

// Cache for cluster versions
let cachedClusterVersions: ClusterVersion[] | null = null

// Function to get all available cluster versions from database
export async function getAvailableClusterVersions(): Promise<ClusterVersion[]> {
  // Return cached data if available
  if (cachedClusterVersions) {
    return cachedClusterVersions
  }

  try {
    // For server-side calls, import and use the database service directly
    // This avoids the fetch() issue during SSR
    let clusterIds: string[]
    
    if (typeof window === 'undefined') {
      // Server-side: use database service directly
      const { getDatabaseService } = await import('@/src/lib/database-connection-pool')
      const databaseService = await getDatabaseService()
      
      const query = `
        SELECT DISTINCT 
          COALESCE(params->>'cluster_version', 'unknown') as cluster_version
        FROM runs 
        WHERE params->>'cluster_version' IS NOT NULL
          AND params->>'cluster_version' != ''
        ORDER BY cluster_version
      `
      
      const results = await databaseService.pool.query(query, [])
      clusterIds = results.rows.map((row: any) => row.cluster_version)
    } else {
      // Client-side: use fetch as before
      const response = await fetch('/api/performance/runs?action=clusters')
      if (!response.ok) {
        throw new Error('Failed to fetch cluster versions')
      }
      clusterIds = await response.json()
    }
    
    // Transform database cluster IDs into ClusterVersion objects
    const clusterVersions: ClusterVersion[] = clusterIds.map((id, index) => {
      // Extract version number from ID (e.g., "7.1.1-3175-enterprise" -> "7.1.1")
      const versionMatch = id.match(/^(\d+\.\d+\.\d+)/)
      const versionName = versionMatch ? versionMatch[1] : id
      
      return {
        id: id,
        name: versionName,
        color: getColorFromUtils(id), // Use centralized color assignment
        releaseDate: "2023-01-01", // Default date - could be enhanced with real release dates
        isActive: true,
        description: `Cluster version ${versionName} from performance database`
      }
    })
    
    // Cache the results
    cachedClusterVersions = clusterVersions
    return clusterVersions
    
  } catch (error) {
    console.error('Error fetching cluster versions:', error)
    
    // Fallback to default versions if API fails
    const fallbackVersions: ClusterVersion[] = [
      {
        id: "7.1.1-3175-enterprise",
        name: "7.1.1",
        color: getColorFromUtils("7.1.1-3175-enterprise"),
        releaseDate: "2021-09-15",
        isActive: true,
        description: "Baseline version with standard performance",
      },
      {
        id: "7.1.2-3454-enterprise",
        name: "7.1.2",
        color: getColorFromUtils("7.1.2-3454-enterprise"),
        releaseDate: "2022-02-10",
        isActive: true,
        description: "Performance improvements for KV operations",
      }
    ]
    
    cachedClusterVersions = fallbackVersions
    return fallbackVersions
  }
}

// Function to get a specific cluster version by ID
export function getClusterVersionById(id: string): ClusterVersion | undefined {
  // If we have cached data, use it
  if (cachedClusterVersions) {
    return cachedClusterVersions.find((version) => version.id === id)
  }
  
  // Fallback: create a temporary cluster version object if data isn't loaded yet
  const versionMatch = id.match(/^(\d+\.\d+\.\d+)/)
  const versionName = versionMatch ? versionMatch[1] : id
  
  return {
    id: id,
    name: versionName,
    color: getColorFromUtils(id), // Use centralized color assignment
    releaseDate: "2023-01-01",
    isActive: true,
    description: `Cluster version ${versionName}`
  }
}

// Function to get a color for a specific cluster version
export function getClusterVersionColor(id: string): string {
  // Use the centralized color assignment from utils
  return getColorFromUtils(id)
}

// Function to generate a performance factor based on cluster version
// Newer versions generally perform better
export function getClusterVersionPerformanceFactor(id: string): number {
  const version = getClusterVersionById(id)
  if (!version) return 1.0

  // Extract major and minor version numbers
  const versionMatch = version.name.match(/(\d+)\.(\d+)\.(\d+)/)
  if (!versionMatch) return 1.0

  const major = Number.parseInt(versionMatch[1], 10)
  const minor = Number.parseInt(versionMatch[2], 10)
  const patch = Number.parseInt(versionMatch[3], 10)

  // Calculate a performance factor based on version numbers
  // Newer versions perform better (lower latency)
  const baseFactor = 1.0
  const majorFactor = (major - 7) * 0.15 // 15% improvement per major version
  const minorFactor = minor * 0.05 // 5% improvement per minor version
  const patchFactor = patch * 0.01 // 1% improvement per patch version

  // Invert the factor (lower is better for latency)
  return Math.max(0.6, baseFactor - majorFactor - minorFactor - patchFactor)
}
