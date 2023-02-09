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
        "group_by": "impl.language",
        "display": "duration_average_us",
        "impl": {"language": "Scala"},
        "workload": {
          "operations": [{
            "op": "insert",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "uuid"}
          }]
        },
        "vars": {"docNum": 10000000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20},
        "graph_type": "Simplified",
        "grouping_type": "Average",
        "merging_type": "Average",
        "trimming_seconds": 20,
        "bucketise_seconds": 0,
        "include_metrics": false,
        "exclude_gerrit": true,
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
        "group_by": "impl.language",
        "display": "duration_average_us",
        "impl": {"language": "Scala"},
        "workload": {
          "operations": [{
            "op": "replace",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "counter"}
          }]
        },
        "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20},
        "graph_type": "Simplified",
        "grouping_type": "Average",
        "merging_type": "Average",
        "trimming_seconds": 20,
        "bucketise_seconds": 0,
        "include_metrics": false,
        "exclude_gerrit": true,
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
        "group_by": "impl.language",
        "display": "duration_average_us",
        "impl": {"language": "Scala"},
        "workload": {
          "operations": [{
            "op": "get",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
          }]
        },
        "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20},
        "graph_type": "Simplified",
        "grouping_type": "Average",
        "merging_type": "Average",
        "trimming_seconds": 20,
        "bucketise_seconds": 0,
        "include_metrics": false,
        "exclude_gerrit": true,
      }
    }
  }
}
</script>

