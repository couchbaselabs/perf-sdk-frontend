import { getDatabaseService } from '@/src/lib/database-connection-pool'
import { DEFAULT_CLUSTERS } from '@/src/lib/config/defaults'
import { getAvailableClusterVersions } from '@/src/lib/cluster-version-service'
import { getAvailableSdkVersions } from '@/src/lib/sdk-version-service'

export async function getInitialDashboardData() {
  try {
    // Initialize services
    const databaseService = await getDatabaseService()
    
    // Fetch initial data in parallel
    const [clusterVersions, sdkVersions] = await Promise.all([
      getAvailableClusterVersions(),
      getAvailableSdkVersions(),
    ])

    return {
      availableMetrics: [
        "duration_average_us",
        "duration_min_us",
        "duration_max_us",
        "duration_p50_us",
        "duration_p95_us",
        "duration_p99_us",
        "operations_total",
        "operations_success",
        "operations_failed"
      ],
      availableVersions: clusterVersions,
      clusterVersions,
      sdkVersions,
      defaultClusters: DEFAULT_CLUSTERS,
    }
  } catch (error) {
    console.error('Failed to fetch initial dashboard data:', error)
    return {
      availableMetrics: [],
      availableVersions: [],
      clusterVersions: [],
      sdkVersions: [],
      defaultClusters: DEFAULT_CLUSTERS,
    }
  }
}
