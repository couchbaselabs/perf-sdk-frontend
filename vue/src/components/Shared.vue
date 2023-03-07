<template>
  <b-container>
    <b-form-checkbox v-model="excludeSnapshots">
      Exclude snapshots
    </b-form-checkbox>

    <MetricsAlerts :input="{language:language}"></MetricsAlerts>
    <h1>KV Get</h1>
    <Results :input="kvGets"></Results>
    <h1>KV Replace</h1>
    <Results :input="kvReplaces"></Results>
    <h1>KV Insert</h1>
    <Results :input="kvInserts"></Results>
    <h1>Horizontal Scaling</h1>
    Tests how the SDK scales with parallelism, using KV gets.
    <Results :input="kvGetsHorizontalScaling"></Results>
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
        "groupBy": "impl.version",
        "display": "duration_average_us",
        "databaseCompare": {
          "impl": {"language": this.language},
          "cluster": defaultCluster,
          "workload": {
            "operations": [{
              "op": "insert",
              "bounds": {"forSeconds": "$forSeconds"},
              "docLocation": {"method": "uuid"}
            }]
          },
          "vars": {"docNum": 10000000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20}
        },
        "graphType": "Simplified",
        "multipleResultsHandling": "Merged",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeSnapshots": this.excludeSnapshots,
        "excludeGerrit": this.excludeGerrit || true,
      }
    },

    kvReplaces() {
      return {
        "groupBy": "impl.version",
        "display": "duration_average_us",
        "databaseCompare": {
          "impl": {"language": this.language},
          "cluster": defaultCluster,
          "workload": {
            "operations": [{
              "op": "replace",
              "bounds": {"forSeconds": "$forSeconds"},
              "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "counter"}
            }]
          },
          "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20}
        },
        "graphType": "Simplified",
        "multipleResultsHandling": "Merged",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": this.excludeGerrit || true,
        "excludeSnapshots": this.excludeSnapshots,
      }
    },

    kvGets() {
      return {
        "groupBy": "impl.version",
        "display": "duration_average_us",
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": this.language},
          "workload": {
            "operations": [{
              "op": "get",
              "bounds": {"forSeconds": "$forSeconds"},
              "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
            }]
          },
          "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20}
        },
        "graphType": "Simplified",
        "multipleResultsHandling": "Merged",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": this.excludeGerrit || true,
        "excludeSnapshots": this.excludeSnapshots || false,
      }
    },

    kvGetsHorizontalScaling() {
      return {
        "groupBy": "variables.horizontalScaling",
        "display": "duration_average_us",
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": this.language},
          "workload": {
            "operations": [{
              "op": "get",
              "bounds": {"forSeconds": "$forSeconds"},
              "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
            }]
          },
          "vars": {
            "poolSize": 10000,
            "driverVer": 6,
            "forSeconds": 300,
            "performerVer": 1,
            "experimentName": "horizontalScaling",
            "api": "DEFAULT",
          }
        },
        "graphType": "Simplified",
        "multipleResultsHandling": "Merged",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": true,
        "excludeSnapshots": this.excludeSnapshots || false,
        "filterRuns": "Latest"
      }
    }
  },
  data() {
    return {
      excludeSnapshots: false,
      excludeGerrit: true,
    }
  }
}

export const defaultCluster = {
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
}

export const protostellarCluster = {
  "type": "unmanaged",
  "memory": 28000,
  "region": "us-east-2",
  "scheme": "protostellar",
  "storage": "couchstore",
  "version": "7.1.1-3175-enterprise",
  "cpuCount": 16,
  "instance": "c5.4xlarge",
  "replicas": 0,
  "topology": "A",
  "nodeCount": 1,
  "compaction": "disabled",
  "stellarNebulaSha": "945b3d0e611ddb7549453fa30b22905cb4d33a9e"
}
</script>


