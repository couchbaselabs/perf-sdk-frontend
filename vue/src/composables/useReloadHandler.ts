import { ref, watch, WatchOptions } from 'vue'
import { useGlobalSnapshots } from '../mixins/GlobalSnapshotMixin'

interface ReloadHandlerOptions {
  additionalWatchers?: Array<{
    source: () => any,
    handler: () => void,
    options?: WatchOptions
  }>
}

export function useReloadHandler(options: ReloadHandlerOptions = {}) {
  const { excludeSnapshots } = useGlobalSnapshots()
  const reloadTrigger = ref(0)

  // Base watch for excludeSnapshots
  watch(
    () => excludeSnapshots.value,
    () => {
      reloadTrigger.value++
    }
  )

  // Setup additional watchers if provided
  options.additionalWatchers?.forEach(({ source, handler, options }) => {
    watch(source, handler, options)
  })

  return {
    excludeSnapshots,
    reloadTrigger
  }
} 