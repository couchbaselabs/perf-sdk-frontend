import { ref } from 'vue'

// Global state for excluding snapshots, shared across all components
const excludeSnapshots = ref(false)

export function useGlobalSnapshots() {
  /**
   * Updates the global excludeSnapshots state and triggers a re-render of all Results components
   * This is necessary because some components might not automatically react to the global state change
   */
  const setExcludeSnapshots = (value) => {
    excludeSnapshots.value = value
    
    // Find all Results components in the DOM and force them to re-render
    // This is needed because some components might cache their computed values
    const resultComponents = document.querySelectorAll('[data-component="Results"]')
    resultComponents.forEach(component => {
      const vueInstance = component.__vueParentComponent?.ctx
      if (vueInstance && typeof vueInstance.forceRerender === 'function') {
        vueInstance.forceRerender()
      }
    })
  }

  /**
   * Filters out snapshot versions from the data array if excludeSnapshots is true
   * Snapshot versions are identified by having a hyphen in their version string
   */
  const filterSnapshots = (data) => {
    if (!excludeSnapshots.value) return data
    return data.filter(item => !item.version?.includes('-'))
  }

  // Return the composable API
  return {
    excludeSnapshots,    // Global reactive state
    setExcludeSnapshots, // Method to update state and trigger re-renders
    filterSnapshots      // Utility method to filter snapshot data
  }
} 