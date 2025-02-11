// Import required Vue composition API functions
import { ref, Ref } from 'vue'

/**
 * Core interface for snapshot management across the application.
 * Provides everything components need to handle snapshot filtering:
 * - State tracking for snapshot visibility
 * - Methods to update filtering preferences
 * - Filtering logic for snapshot data
 */
interface GlobalSnapshots {
  excludeSnapshots: Ref<boolean>  // Flag to control snapshot filtering
  setExcludeSnapshots: (value: boolean) => void  // Function to update the flag
  filterSnapshots: (data: any[]) => any[]  // Function to filter snapshot data
}

// We use a global ref to ensure all components share the same snapshot state.
// This prevents inconsistencies where some charts might show snapshots while others don't.
const excludeSnapshots = ref(false)

/**
 * Determines if a version string represents a snapshot release.
 * 
 * SDK snapshot versions contain hyphens (e.g., "1.0.0-SNAPSHOT", "2.0.0-beta.1").
 * This helps distinguish between release versions (1.0.0) and development/preview versions.
 */
function versionIsSnapshot(version?: string): boolean {
  if (!version) return false
  return version.includes('-')
}

export function useGlobalSnapshots(): GlobalSnapshots {
  const setExcludeSnapshots = (value: boolean) => {
    excludeSnapshots.value = value
  }

  const filterSnapshots = (data: any[]) => {
    if (!excludeSnapshots.value) return data
    return data.filter(item => !versionIsSnapshot(item.version))
  }

  return {
    excludeSnapshots,
    setExcludeSnapshots,
    filterSnapshots
  }
}