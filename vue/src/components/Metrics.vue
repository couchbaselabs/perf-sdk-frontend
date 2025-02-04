<template>
  <b-container>
    <h1>Metrics</h1>
    All these tests are doing KV gets in 20 threads.

    <h2>Memory</h2>
    Measures the maximum heap memory used in MB by the performer+SDK.
    <Results :input="memHeapUsedMB" :key="reloadTrigger"></Results>

    <h2>Thread Count</h2>
    Measures the maximum thread count used by the performer+SDK.
    <Results :input="threadCount" :key="reloadTrigger"></Results>

    <h2>Process CPU</h2>
    Measures the average process CPU used by the performer+SDK, in %.
    <Results :input="processCpu" :key="reloadTrigger"></Results>
  </b-container>
</template>

<script>
import { useGlobalSnapshots } from '@/mixins/GlobalSnapShotMixin'
import Shared, {
  defaultQuery,
  defaultVars,
  defaultWorkloadGets
} from "@/components/Shared.vue";
import Results from "@/components/Results.vue";
import {defaultCluster} from "@/components/Shared.vue";
import { useReloadHandler } from '@/composables/useReloadHandler'

function sharedQuery(language, excludeSnapshots) {
  return {
    ...defaultQuery,
    "databaseCompare": {
      "cluster": defaultCluster,
      "impl": {"language": language},
      "workload": defaultWorkloadGets,
      "vars": {...defaultVars}
    },
    "excludeSnapshots": excludeSnapshots
  }
}

export default {
  components: {Shared, Results},
  props: ['language'],
  setup() {
    const { excludeSnapshots, reloadTrigger } = useReloadHandler()
    
    return {
      excludeSnapshots,
      reloadTrigger
    }
  },
  computed: {
    processCpu() {
      return {
        ...sharedQuery(this.language, this.excludeSnapshots),
        "yAxes": [{
          "type": "metric",
          "metric": "processCpu",
        }],
        mergingType: "Average"
      }
    },

    memHeapUsedMB() {
      return {
        ...sharedQuery(this.language, this.excludeSnapshots),
        "yAxes": [{
          "type": "metric",
          "metric": "memHeapUsedMB",
        }],
        mergingType: "Maximum"
      }
    },

    threadCount() {
      return {
        ...sharedQuery(this.language, this.excludeSnapshots),
        "yAxes": [{
          "type": "metric",
          "metric": "threadCount",
        }],
        mergingType: "Maximum"
      }
    }
  }
}
</script>

