<template>
  <b-form-checkbox 
    v-model="localExcludeSnapshots"
    @change="handleChange"
    class="mb-3">
    Exclude snapshots
  </b-form-checkbox>
</template>

<script>
import { computed } from 'vue'
import { useGlobalSnapshots } from '../mixins/GlobalSnapshotMixin'

export default {
  name: 'ExcludeSnapshotsCheckbox',
  setup() {
    const { excludeSnapshots, setExcludeSnapshots } = useGlobalSnapshots()
    
    const localExcludeSnapshots = computed({
      get: () => excludeSnapshots.value,
      set: (value) => setExcludeSnapshots(value)
    })

    const handleChange = (value) => {
      setExcludeSnapshots(value)
    }

    return {
      localExcludeSnapshots,
      handleChange
    }
  }
}
</script>