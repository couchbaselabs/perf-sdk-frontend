<template>
  <b-container>
    <h1>Metrics</h1>
    All these tests are doing KV gets in 20 threads.

    <h2>Memory</h2>
    Measures the maximum heap memory used in MB by the performer+SDK.
    <Results :input="memHeapUsedMB"></Results>

    <h2>Thread Count</h2>
    Measures the maximum thread count used by the performer+SDK.
    <Results :input="threadCount"></Results>

    <h2>Process CPU</h2>
    Measures the average process CPU used by the performer+SDK, in %.
    <Results :input="processCpu"></Results>
  </b-container>
</template>

<script>
import Shared, {
  defaultQuery,
  defaultVars,
  defaultWorkloadGets
} from "@/components/Shared";
import Results from "@/components/Results";

function sharedQuery(language) {
  return {
    ...defaultQuery,
    "databaseCompare": {
      "impl": {"language": language},
      "workload": defaultWorkloadGets,
      "vars": {...defaultVars}
    },
    "excludeSnapshots": false
  }
}

export default {
  components: {Shared, Results},
  props: ['language'],
  computed: {
    processCpu() {
      return {
        ...sharedQuery(this.language),
        "yAxis": {
          "type": "metric",
          "metric": "processCpu",
        },
        mergingType: "Average",
      }
    },

    memHeapUsedMB() {
      return {
        ...sharedQuery(this.language),
        "yAxis": {
          "type": "metric",
          "metric": "memHeapUsedMB",
        },
        mergingType: "Maximum",
      }
    },

    threadCount() {
      return {
        ...sharedQuery(this.language),
        "yAxis": {
          "type": "metric",
          "metric": "threadCount",
        },
        mergingType: "Maximum",
      }
    }
  }
}
</script>

