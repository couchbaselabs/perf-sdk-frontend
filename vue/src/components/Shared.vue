<template>
  <b-container>
    <h1>KV Get</h1>
    <Results :input="kvGets"></Results>
    <h1>KV Replace</h1>
    <Results :input="kvReplaces"></Results>
    <h1>KV Insert</h1>
    <Results :input="kvInserts"></Results>
  </b-container>
</template>

<script>
import Results from "@/components/Results";

export default {
  components: {Results},
  props: ['language'],
  data() {
    return {
      kvInserts: {
        "inputs": [{
          "viewing": "cluster",
          "params": [{
            "type": "unmanaged",
            "memory": 28000,
            "region": "us-east-2",
            "storage": "couchstore",
            "version": "7.1.1-3175-enterprise",
            "cpuCount": 16,
            "instance": "c5.4xlarge",
            "replicas": 0,
            "topology": "A",
            "nodeCount": 1,
            "compaction": "disabled"
          }]
        }],
        "group_by": "impl.version",
        "display": "duration_average_us",
        "impl": {"language": this.language},
        "workload": {"operations": [{"op": "insert", "count": "$doc_num", "docLocation": {"method": "uuid"}}]},
        "vars": {"doc_num": 10000000, "driverVer": "6", "performerVer": "1", "horizontal_scaling": 20},
        "graph_type": "Simplified",
        "grouping_type": "Side-by-side",
        "merging_type": "Average",
        "trimming_seconds": 20,
        "bucketise_seconds": 0,
        "include_metrics": false
      },

      kvReplaces: {
        "inputs": [{
          "viewing": "cluster",
          "params": [{
            "type": "unmanaged",
            "memory": 28000,
            "region": "us-east-2",
            "storage": "couchstore",
            "version": "7.1.1-3175-enterprise",
            "cpuCount": 16,
            "instance": "c5.4xlarge",
            "replicas": 0,
            "topology": "A",
            "nodeCount": 1,
            "compaction": "disabled"
          }]
        }],
        "group_by": "impl.version",
        "display": "duration_average_us",
        "impl": {"language": this.language},
        "workload": {
          "operations": [{
            "op": "replace",
            "count": "$doc_num",
            "docLocation": {"method": "pool", "poolSize": "$pool_size", "poolSelectionStrategy": "counter"}
          }]
        },
        "vars": {
          "doc_num": 10000000,
          "driverVer": "6",
          "pool_size": 10000,
          "performerVer": "1",
          "horizontal_scaling": 20
        },
        "graph_type": "Simplified",
        "grouping_type": "Side-by-side",
        "merging_type": "Average",
        "trimming_seconds": 20,
        "bucketise_seconds": 0,
        "include_metrics": false
      },

      kvGets: {
        "inputs": [{
          "viewing": "cluster",
          "params": [{
            "type": "unmanaged",
            "memory": 28000,
            "region": "us-east-2",
            "storage": "couchstore",
            "version": "7.1.1-3175-enterprise",
            "cpuCount": 16,
            "instance": "c5.4xlarge",
            "replicas": 0,
            "topology": "A",
            "nodeCount": 1,
            "compaction": "disabled"
          }]
        }],
        "group_by": "impl.version",
        "display": "duration_average_us",
        "impl": {"language": this.language},
        "workload": {
          "operations": [{
            "op": "get",
            "count": "$doc_num",
            "docLocation": {"method": "pool", "poolSize": "$pool_size", "poolSelectionStrategy": "random_uniform"}
          }]
        },
        "vars": {
          "doc_num": 50000000,
          "driverVer": "6",
          "pool_size": 10000,
          "performerVer": "1",
          "horizontal_scaling": 20
        },
        "graph_type": "Simplified",
        "grouping_type": "Side-by-side",
        "merging_type": "Average",
        "trimming_seconds": 20,
        "bucketise_seconds": 0,
        "include_metrics": false
      }
    }
  }
}
</script>

