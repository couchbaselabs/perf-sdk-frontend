<template>
  <b-container>
    <ExcludeSnapshotsCheckbox class="mb-3" />
    
    <Protostellar :language="'Java'"></Protostellar>

    <h1>KV Gets (OpenShift + Protostellar + CNG)</h1>
    Going from an AWS node in us-west-1 to the test OpenShift cluster, also in us-west-1. Protostellar is used, talking
    to a CNG ingress node.

    With 20 threads:
    <Results :input="kvGetsOpenShift20Threads" :key="reloadTrigger"></Results>
    With 1 thread:
    <Results :input="kvGetsOpenShift1Thread" :key="reloadTrigger"></Results>
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
import { useReloadHandler } from '@/composables/useReloadHandler'
import ExcludeSnapshotsCheckbox from './ExcludeSnapshotsCheckbox.vue'

export default {
  components: {
    Metrics, 
    Shared, 
    Results, 
    Protostellar,
    ExcludeSnapshotsCheckbox
  },
  setup() {
    const { excludeSnapshots, reloadTrigger } = useReloadHandler()
    
    return {
      excludeSnapshots,
      reloadTrigger
    }
  },
  computed: {
    kvGetsOpenShift20Threads() {
      return {
        ...defaultQuery,
        "databaseCompare": {
          "cluster": openShiftCluster,
          "impl": {"language": "Java"},
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ...defaultVarsWithoutHorizontalScaling, "horizontalScaling": 20}
        },
        "excludeSnapshots": this.excludeSnapshots,
      }
    },
    kvGetsOpenShift1Thread() {
      return {
        ...defaultQuery,
        "databaseCompare": {
          "cluster": openShiftCluster,
          "impl": {"language": "Java"},
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ...defaultVarsWithoutHorizontalScaling, "horizontalScaling": 1}
        },
        "excludeSnapshots": this.excludeSnapshots,
        "multipleResultsHandling": "Side-by-Side"
      }
    },
    stellarNebulaGets() {
      return {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.com.couchbase.protostellar.executorMaxThreadCount",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "cluster": protostellarCluster,
          "impl": {"language": "Java", "version": "refs/changes/35/184435/1"},
          "workload": defaultWorkloadGets,
          "vars": {
            "poolSize": 10000,
            ...defaultVars,
            "com.couchbase.protostellar.executorType": "ForkJoinPool",
          }
        },
        "excludeGerrit": false,
      }
    }
  }
}
</script>

