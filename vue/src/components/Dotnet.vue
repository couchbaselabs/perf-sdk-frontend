<template>
  <b-container>
    <MetricsAlerts :input="{language:language}"></MetricsAlerts>
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
import MetricsAlerts from "@/components/MetricsAlerts";

export default {
  components: {Results, MetricsAlerts},
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
        "display": "operations_success",
        "impl": {"language": ".NET"},
        "workload": {"operations": [{"op": "insert", "count": "$docNum", "docLocation": {"method": "uuid"}}]},
        "vars": {"docNum": 100000, "driverVer": 6, "performerVer": 1, "horizontal_scaling": 20},
        "graph_type": "Simplified",
        "grouping_type": "Side-by-side",
        "merging_type": "Sum",
        "trimming_seconds": "0",
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
        "display": "operations_success",
        "impl": {"language": ".NET"},
        "workload": {
          "operations": [{
            "op": "replace",
            "count": "$docNum",
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "counter"}
          }]
        },
        "vars": {"docNum": 100000, "poolSize": 10000, "driverVer": 6, "performerVer": 1, "horizontal_scaling": 20},
        "graph_type": "Simplified",
        "grouping_type": "Side-by-side",
        "merging_type": "Sum",
        "trimming_seconds": "0",
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
        "display": "operations_success",
        "impl": {"language": ".NET"},
        "workload": {
          "operations": [{
            "op": "get",
            "count": "$docNum",
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
          }]
        },
        "vars": {"docNum": 500000, "poolSize": 10000, "driverVer": 6, "performerVer": 1, "horizontal_scaling": 20},
        "graph_type": "Simplified",
        "grouping_type": "Side-by-side",
        "merging_type": "Sum",
        "trimming_seconds": "0",
        "bucketise_seconds": 0,
        "include_metrics": false
      }
    }
  }
}
</script>

