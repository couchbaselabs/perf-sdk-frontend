<template>
  <b-container>

    <Protostellar :language="'Java'"></Protostellar>

    <h1>KV Gets (OpenShift + Protostellar + CNG)</h1>
    Going from an AWS node in us-west-1 to the test OpenShift cluster, also in us-west-1. Protostellar is used, talking
    to a CNG ingress node.

    With 20 threads:
    <Results :input="kvGetsOpenShift20Threads"></Results>
    With 1 thread:
    <Results :input="kvGetsOpenShift1Thread"></Results>
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

export default {
  components: {Metrics, Shared, Results, Protostellar},
  data() {
    return {
      kvGetsOpenShift20Threads: {
        ...defaultQuery,
        "databaseCompare": {
          "cluster": openShiftCluster,
          "impl": {"language": "Java"},
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ...defaultVarsWithoutHorizontalScaling, "horizontalScaling": 20}
        },
        "excludeSnapshots": false,
      },
      kvGetsOpenShift1Thread: {
        ...defaultQuery,
        "databaseCompare": {
          "cluster": openShiftCluster,
          "impl": {"language": "Java"},
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ...defaultVarsWithoutHorizontalScaling, "horizontalScaling": 1}
        },
        "excludeSnapshots": false,
        "multipleResultsHandling": "Side-by-Side"
      },
      stellarNebulaGets: {
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

