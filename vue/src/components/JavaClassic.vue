<template>
  <b-container>

    <Shared :language="'Java'"></Shared>
    <Metrics :language="'Java'"></Metrics>
    <TransactionsShared :language="'Java'"></TransactionsShared>

    <h1>Horizontal Scaling (Reactive)</h1>
    Tests how the SDK scales with parallelism, using KV gets and the reactive API.
    <Results :input="kvGetsHorizontalScalingAsync"></Results>

    <h1>KV Gets (Blocking API)</h1>
    <Results :input="kvGetsBlocking"></Results>

    <h1>KV Gets (Reactive API)</h1>
    <Results :input="kvGetsReactive"></Results>
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

      kvGetsHorizontalScalingAsync: {
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
        "excludeSnapshots": this.excludeSnapshots || false
      },

      kvGetsBlocking: {
        ...defaultQuery,
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": "Java"},
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ...defaultVars, api: "DEFAULT"}
        },
        "excludeSnapshots": this.excludeSnapshots || false,
      },
      kvGetsReactive: {
        ...defaultQuery,
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": "Java"},
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ...defaultVars, api: "ASYNC"}
        },
        "excludeSnapshots": this.excludeSnapshots || false,
      }
    }
  }
}
</script>

