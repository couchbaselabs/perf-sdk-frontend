import { ref, watch, WatchOptions } from 'vue'
import { useGlobalSnapshots } from '../mixins/GlobalSnapshotMixin'

/**
 * Options for customizing snapshot state behavior.
 * Allows components to add their own watchers if they need
 * to respond to additional state changes beyond snapshots.
 */
interface SnapshotHandlerOptions {
  additionalWatchers?: Array<{
    source: () => any,
    handler: () => void,
    options?: WatchOptions
  }>
}

/**
 * Manages snapshot filtering state and triggers rerenders when needed.
 * This composable centralizes our snapshot filtering logic and ensures
 * that components update consistently when snapshot preferences change.
 */
export function useSnapshotState(options: SnapshotHandlerOptions = {}) {
  const { excludeSnapshots } = useGlobalSnapshots()
  // Counter that forces components to rerender when snapshot settings change
  const reloadTrigger = ref(0)

  // When users toggle snapshot filtering, we need to refresh all the charts
  // to show/hide snapshot data. Incrementing reloadTrigger forces this refresh.
  watch(
    () => excludeSnapshots.value,
    () => {
      reloadTrigger.value++
    }
  )

  // Some components might need to respond to other state changes too.
  // This lets them hook into the same rerendering mechanism we use for snapshots.
  options.additionalWatchers?.forEach(({ source, handler, options }) => {
    watch(source, handler, options)
  })

  return {
    excludeSnapshots,
    reloadTrigger
  }
} 