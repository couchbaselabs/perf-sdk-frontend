// Import required Vue composition API functions
import { ref, Ref } from 'vue'

// Interface defining the shape of the GlobalSnapshots object
interface GlobalSnapshots {
  excludeSnapshots: Ref<boolean>  // Flag to control snapshot filtering
  setExcludeSnapshots: (value: boolean) => void  // Function to update the flag
  filterSnapshots: (data: any[]) => any[]  // Function to filter snapshot data
}

// Global reactive reference to track snapshot exclusion state
const excludeSnapshots = ref(false)

/**
 * Composable function to handle snapshot filtering functionality
 * @returns GlobalSnapshots object with methods and state for snapshot filtering
 */
export function useGlobalSnapshots(): GlobalSnapshots {
  // Function to update the excludeSnapshots flag
  const setExcludeSnapshots = (value: boolean) => {
    excludeSnapshots.value = value
  }

  /**
   * Filters an array of data based on snapshot exclusion rules
   * @param data Array of items that may contain version information
   * @returns Filtered array excluding snapshot versions when excludeSnapshots is true
   */
  const filterSnapshots = (data: any[]) => {
    if (!excludeSnapshots.value) return data
    // Filter out items where version contains a hyphen (indicating snapshot versions)
    return data.filter(item => !item.version?.includes('-'))
  }

  return {
    excludeSnapshots,
    setExcludeSnapshots,
    filterSnapshots
  }
}