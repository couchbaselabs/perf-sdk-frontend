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
        ... defaultQuery,
        "databaseCompare": {
          "impl": {"language": this.language},
          "workload": {
            "operations": [{
              "op": "insert",
              "bounds": {"forSeconds": "$forSeconds"},
              "docLocation": {"method": "uuid"}
            }]
          },
          "vars": {"docNum": 10000000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20}
        },
        "excludeSnapshots": this.excludeSnapshots,
        "excludeGerrit": this.excludeGerrit || true,
      }
    },

    kvReplaces() {
      return {
        ... defaultQuery,
        "databaseCompare": {
          "impl": {"language": this.language},
          "workload": {
            "operations": [{
              "op": "replace",
              "bounds": {"forSeconds": "$forSeconds"},
              "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "counter"}
            }]
          },
          "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20}
        },
        "excludeGerrit": this.excludeGerrit || true,
        "excludeSnapshots": this.excludeSnapshots,
      }
    },

    kvGets() {
      return {
        ... defaultQuery,
        "databaseCompare": {
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
        "excludeGerrit": this.excludeGerrit || true,
        "excludeSnapshots": this.excludeSnapshots || false,
      }
    },

    kvGetsHorizontalScaling() {
      return {
        ... defaultQuery,
        "groupBy": "variables.horizontalScaling",
        "databaseCompare": {
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

export const defaultQuery = {
  // We're usually display SDK versions
  "groupBy": "impl.version",

  // It's not best practice to display averages - max or p99 would be better - but the test variance is unfortunately
  // too high for that to display useful results.
  "display": "duration_average_us",

  // These fields are compared to the database, and are what's most likely to change in each graph.
  "databaseCompare": {
    "cluster": defaultCluster,
  },

  // Usually want the simplified Showfast-style bar graph.
  "graphType": "Simplified",

  // Usually want to merge any duplicated results, for space reasons.
  "multipleResultsHandling": "Merged",
  "mergingType": "Average",

  // Usually want to trim a few seconds of data from the start, especially for JVM languages.
  "trimmingSeconds": 20,

  // Not used in the Simplified graph.
  "bucketiseSeconds": 0,
  "includeMetrics": false,

  // Generally want to include snapshot (interim) releases.
  "excludeSnapshots": true,

  // Generally don't want to include Gerrit results.
  "excludeGerrit": true,

  // Generally want to include all runs.
  "filterRuns": "All"
}
</script>


