<template>
  <b-container>
    <h1>KV Get</h1>
    <Results :input="kvGets"></Results>
  </b-container>
</template>

<script>
import Results from "@/components/Results";

export default {
  components: {Results},
  data() {
    return {
      kvGets: {
        "inputs": [{
          "viewing": "cluster",
          "params": [{
            "type": "unmanaged",
            "memory": 14000,
            "storage": "couchstore",
            "version": "7.1.1-3175-enterprise",
            "cpuCount": 4,
            "replicas": 0,
            "nodeCount": 1
          }]
        }],
        "group_by": "impl.version",
        "display": "duration_average_us",
        "impl": {"language": "kotlin"},
        "workload": {
          "variables": {
            "custom": [{"name": "doc_num", "value": 10000000}, {
              "name": "pool_size",
              "value": 10000
            }], "predefined": [{"name": "horizontal_scaling", "values": [20]}]
          },
          "operations": [{
            "op": "get",
            "count": "$doc_num",
            "docLocation": {"method": "pool", "poolSize": "$pool_size", "poolSelectionStrategy": "random_uniform"}
          }]
        },
        "vars": {"doc_num": 10000000, "driverVersion": 6, "performerVersion": 0, "horizontal_scaling": 20},
        "graph_type": "Simplified",
        "grouping_type": "Side-by-side",
        "merging_type": "Average",
        "trimming_seconds": 15,
        "include_metrics": false
      }
    }
  }
}
</script>

