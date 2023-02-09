<template>
  <b-container>
    <b-form-checkbox v-model="exclude_snapshots">
      Exclude snapshots
    </b-form-checkbox>

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
  props: ['language'],
  computed: {
    kvInserts() {
      return {
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
        "exclude_snapshots": this.exclude_snapshots,
        "exclude_gerrit": this.exclude_gerrit || true,
      }
    },

    kvReplaces() {
      return {
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
        "exclude_gerrit": this.exclude_gerrit || true,
        "exclude_snapshots": this.exclude_snapshots,
      }
    },

    kvGets() {
      return {
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
        "exclude_gerrit": this.exclude_gerrit || true,
        "exclude_snapshots": this.exclude_snapshots || false,
      }
    }
  },
  data() {
    return {
      exclude_snapshots: false,
      exclude_gerrit: true,
    }
  }
}
</script>

