<template>
  <b-container>
    <h1>KV Get</h1>
    <Results :input="kvGets"></Results>
    <h1>KV Replace</h1>
    <Results :input="kvReplaces"></Results>
  </b-container>
</template>

<script>
import Results from "@/components/Results";

export default {
  components: {Results},
  data() {
    return {
      kvReplaces: {
        "inputs": [{
          "viewing": "cluster",
          "params": [{
            "type": "unmanaged",
            "memory": 12000,
            "version": "7.1.0-2556-enterprise",
            "cpuCount": 4,
            "nodeCount": 1
          }]
        }],
        "group_by": "impl.version",
        "display": "duration_average_us",
        "impl": {"language": "java"},
        "workload": {
          "operations": [{
            "op": "replace",
            "count": "$doc_num",
            "docLocation": {"method": "pool", "poolSize": "$pool_size", "poolSelectionStrategy": "counter"}
          }]
        },
        "vars": {"doc_num": 10000000, "pool_size": 10000, "driverVersion": 2, "horizontal_scaling": 20},
        "graph_type": "Simplified",
        "grouping_type": "Average",
        "merging_type": "Average",
        "trimming_seconds": "0",
        "include_metrics": false
      },

      kvGets: {
        "inputs": [{
          "viewing": "cluster",
          "params": [{
            "type": "unmanaged",
            "memory": 12000,
            "version": "7.1.0-2556-enterprise",
            "cpuCount": 4,
            "nodeCount": 1
          }]
        }],
        "group_by": "impl.version",
        "display": "duration_average_us",
        "impl": {"language": "java"},
        "workload": {
          "operations": [{
            "op": "get",
            "count": "$doc_num",
            "docLocation": {"method": "pool", "poolSize": "$pool_size", "poolSelectionStrategy": "random_uniform"}
          }]
        },
        "vars": {"doc_num": 10000000, "pool_size": 10000, "driverVersion": 2, "horizontal_scaling": 20},
        "graph_type": "Simplified",
        "grouping_type": "Average",
        "merging_type": "Average",
        "trimming_seconds": "0",
        "include_metrics": false
      }
    }
  }
}
</script>

