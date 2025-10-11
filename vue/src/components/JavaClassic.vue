<template>
  <b-container>

    <Shared :language="'Java'"></Shared>
    <Metrics :language="'Java'"></Metrics>
    <TransactionsShared :language="'Java'"></TransactionsShared>

    <h1>Horizontal Scaling (Reactive)</h1>
    Tests how the SDK scales with parallelism, using KV gets and the reactive API.
    <Results :input="kvGetsHorizontalScalingAsync" :key="'async-' + reloadTrigger"></Results>

    <h1>KV Gets (Blocking API)</h1>
    <Results :input="kvGetsBlocking" :key="'blocking-' + reloadTrigger"></Results>

    <h1>KV Gets (Reactive API)</h1>
    <Results :input="kvGetsReactive" :key="'reactive-' + reloadTrigger"></Results>
  </b-container>
</template>

<script>
import Shared, {
  defaultCluster,
  defaultQuery,
  defaultVars,
  defaultVarsWithoutHorizontalScaling,
  protostellarCluster,
  defaultWorkloadGets,
  withoutKey,
  hAxisSdkLanguage
} from "@/components/Shared.vue";
import Results from "@/components/Results.vue";
import Metrics from "@/components/Metrics.vue";
import Protostellar from "@/components/Protostellar.vue";
import {openShiftCluster} from "@/components/Shared.vue";
import { useSnapshotState } from '@/composables/useSnapshotState'

export default {
  components: {Metrics, Shared, Results, Protostellar},
  setup() {
    const { excludeSnapshots, reloadTrigger } = useSnapshotState()
    
    return {
      excludeSnapshots,
      reloadTrigger
    }
  },
  data() {
    return {
      // Cache computed results to avoid creating new objects unnecessarily
      _cachedQueries: {},
      _lastExcludeSnapshots: null
    }
  },
  computed: {
    kvGetsHorizontalScalingAsync() {
      const cacheKey = 'kvGetsHorizontalScalingAsync'
      const excludeSnapshots = this.excludeSnapshots || false
      
      // Only create new object if excludeSnapshots actually changed
      if (this._lastExcludeSnapshots !== excludeSnapshots || !this._cachedQueries[cacheKey]) {
        this._cachedQueries[cacheKey] = {
          ...defaultQuery,
          "hAxis": {
            "type": "dynamic",
            "databaseField": "vars.horizontalScaling",
            resultType: "Integer"
          },
          "databaseCompare": {
            "cluster": defaultCluster,
            "impl": {"language": "Java"},
            "workload": defaultWorkloadGets,
            "vars": {
              "poolSize": 10000, ...defaultVarsWithoutHorizontalScaling,
              "experimentName": "horizontalScaling",
              "api": "ASYNC"
            }
          },
          "excludeSnapshots": excludeSnapshots
        }
        this._lastExcludeSnapshots = excludeSnapshots
      }
      
      return this._cachedQueries[cacheKey]
    },

    kvGetsBlocking() {
      const cacheKey = 'kvGetsBlocking'
      const excludeSnapshots = this.excludeSnapshots || false
      
      // Only create new object if excludeSnapshots actually changed
      if (this._lastExcludeSnapshots !== excludeSnapshots || !this._cachedQueries[cacheKey]) {
        this._cachedQueries[cacheKey] = {
          ...defaultQuery,
          "databaseCompare": {
            "cluster": defaultCluster,
            "impl": {"language": "Java"},
            "workload": defaultWorkloadGets,
            "vars": {"poolSize": 10000, ...defaultVars, api: "DEFAULT"}
          },
          "excludeSnapshots": excludeSnapshots
        }
        this._lastExcludeSnapshots = excludeSnapshots
      }
      
      return this._cachedQueries[cacheKey]
    },

    kvGetsReactive() {
      const cacheKey = 'kvGetsReactive'
      const excludeSnapshots = this.excludeSnapshots || false
      
      // Only create new object if excludeSnapshots actually changed
      if (this._lastExcludeSnapshots !== excludeSnapshots || !this._cachedQueries[cacheKey]) {
        this._cachedQueries[cacheKey] = {
          ...defaultQuery,
          "databaseCompare": {
            "cluster": defaultCluster,
            "impl": {"language": "Java"},
            "workload": defaultWorkloadGets,
            "vars": {"poolSize": 10000, ...defaultVars, api: "ASYNC"}
          },
          "excludeSnapshots": excludeSnapshots
        }
        this._lastExcludeSnapshots = excludeSnapshots
      }
      
      return this._cachedQueries[cacheKey]
    }
  }
}
</script>
