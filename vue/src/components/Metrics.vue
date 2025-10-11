<template>
  <b-container>
    <h1>Metrics</h1>
    All these tests are doing KV gets in 20 threads.

    <h2>Memory</h2>
    <div v-if="hasHeapUsedMB">
      Measures the maximum heap memory used in MB by the performer+SDK.
      <Results :input="memHeapUsedMB" :key="'heap-' + reloadTrigger"></Results>
    </div>
    <div v-if="hasRssUsedMB">
      Measures the maximum RSS memory used in MB by the performer+SDK.
      <Results :input="memRssUsedMB" :key="'rss-' + reloadTrigger"></Results>
    </div>

    <h2>Thread Count</h2>
    Measures the maximum thread count used by the performer+SDK.
    <Results :input="threadCount" :key="'thread-' + reloadTrigger"></Results>

    <h2>Process CPU</h2>
    Measures the average process CPU used by the performer+SDK, in %.
    <Results :input="processCpu" :key="'cpu-' + reloadTrigger"></Results>
  </b-container>
</template>

<script>
import Shared, {
  defaultQuery,
  defaultVars,
  defaultWorkloadGets
} from "@/components/Shared.vue";
import Results from "@/components/Results.vue";
import {defaultCluster} from "@/components/Shared.vue";
import { useSnapshotState } from '@/composables/useSnapshotState'

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
    const { excludeSnapshots, reloadTrigger } = useSnapshotState()
    
    return {
      excludeSnapshots,
      reloadTrigger
    }
  },
  data() {
    return {
      // Cache computed query objects to avoid changing identity unnecessarily
      _cachedQueries: {},
      _lastExcludeSnapshots: null,
      _lastLanguage: null,
    }
  },
  computed: {
    processCpu() {
      const cacheKey = 'processCpu'
      const excludeSnapshots = !!this.excludeSnapshots
      if (this._lastExcludeSnapshots !== excludeSnapshots || this._lastLanguage !== this.language || !this._cachedQueries[cacheKey]) {
        this._cachedQueries[cacheKey] = {
          ...sharedQuery(this.language, excludeSnapshots),
          "yAxes": [{
            "type": "metric",
            "metric": "processCpu",
          }],
          mergingType: "Average",
        }
        this._lastExcludeSnapshots = excludeSnapshots
        this._lastLanguage = this.language
      }
      return this._cachedQueries[cacheKey]
    },

    hasHeapUsedMB() {
      return ["go", "java", "kotlin", "scala", ".net"].includes(this.language.toLowerCase());
    },

    hasRssUsedMB() {
      return ["c++", "node", "python", "ruby"].includes(this.language.toLowerCase());
    },

    memHeapUsedMB() {
      const cacheKey = 'memHeapUsedMB'
      const excludeSnapshots = !!this.excludeSnapshots
      if (this._lastExcludeSnapshots !== excludeSnapshots || this._lastLanguage !== this.language || !this._cachedQueries[cacheKey]) {
        this._cachedQueries[cacheKey] = {
          ...sharedQuery(this.language, excludeSnapshots),
          "yAxes": [{
            "type": "metric",
            "metric": "memHeapUsedMB",
          }],
          mergingType: "Maximum",
        }
        this._lastExcludeSnapshots = excludeSnapshots
        this._lastLanguage = this.language
      }
      return this._cachedQueries[cacheKey]
    },

    memRssUsedMB() {
      const cacheKey = 'memRssUsedMB'
      const excludeSnapshots = !!this.excludeSnapshots
      if (this._lastExcludeSnapshots !== excludeSnapshots || this._lastLanguage !== this.language || !this._cachedQueries[cacheKey]) {
        this._cachedQueries[cacheKey] = {
          ...sharedQuery(this.language, excludeSnapshots),
          "yAxes": [{
            "type": "metric",
            "metric": "memRssUsedMB",
          }],
          mergingType: "Maximum",
        }
        this._lastExcludeSnapshots = excludeSnapshots
        this._lastLanguage = this.language
      }
      return this._cachedQueries[cacheKey]
    },

    threadCount() {
      const cacheKey = 'threadCount'
      const excludeSnapshots = !!this.excludeSnapshots
      if (this._lastExcludeSnapshots !== excludeSnapshots || this._lastLanguage !== this.language || !this._cachedQueries[cacheKey]) {
        this._cachedQueries[cacheKey] = {
          ...sharedQuery(this.language, excludeSnapshots),
          "yAxes": [{
            "type": "metric",
            "metric": "threadCount",
          }],
          mergingType: "Maximum",
        }
        this._lastExcludeSnapshots = excludeSnapshots
        this._lastLanguage = this.language
      }
      return this._cachedQueries[cacheKey]
    }
  }
}
</script>
