<template>
  <b-container>
    <h1>KV Get (1 thread)</h1>
    <Results :input="kvGetsSingleThreaded"></Results>
<!--    <h1>KV Replace (1 thread)</h1>-->
<!--    <Results :input="kvReplacesSingleThreaded"></Results>-->
<!--    <h1>KV Insert (1 thread)</h1>-->
<!--    <Results :input="kvInsertsSingleThreaded"></Results>-->
<!--    <h1>KV Get (20 threads)</h1>-->
<!--    <Results :input="kvGets"></Results>-->
<!--    <h1>KV Replace (20 threads)</h1>-->
<!--    <Results :input="kvReplaces"></Results>-->
<!--    <h1>KV Insert (20 threads)</h1>-->
<!--    <Results :input="kvInserts"></Results>-->
  </b-container>
</template>

<script>
import Results from "@/components/Results";
import defaultCluster from "./Shared";

export default {
  components: {Results},
  props: ['language'],
  data() {
    return {
      kvInserts: {
        "inputs": [{
          "viewing": "cluster",
          "params": defaultCluster
        }],
        "groupBy": "impl.language",
        "display": "duration_average_us",
        "workload": {
          "operations": [{
            "op": "insert",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "uuid"}
          }]
        },
        "vars": {"docNum": 10000000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20},
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": true,
        "filterRuns": "Latest"
      },

      kvReplaces: {
        "inputs": [{
          "viewing": "cluster",
          "params": defaultCluster
        }],
        "groupBy": "impl.language",
        "display": "duration_average_us",
        "workload": {
          "operations": [{
            "op": "replace",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "counter"}
          }]
        },
        "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20},
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": true,
        "filterRuns": "Latest"
      },

      kvGets: {
        "inputs": [{
          "viewing": "cluster",
          "params": defaultCluster
        }],
        "groupBy": "impl.language",
        "display": "duration_average_us",
        "workload": {
          "operations": [{
            "op": "get",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
          }]
        },
        "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20},
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": true,
        "filterRuns": "Latest"
      },

      kvInsertsSingleThreaded: {
        "inputs": [{
          "viewing": "cluster",
          "params": defaultCluster
        }],
        "groupBy": "impl.language",
        "display": "duration_average_us",
        "workload": {
          "operations": [{
            "op": "insert",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "uuid"}
          }]
        },
        "vars": {"docNum": 10000000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 1},
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": true,
        "filterRuns": "Latest"
      },

      kvReplacesSingleThreaded: {
        "inputs": [{
          "viewing": "cluster",
          "params": defaultCluster
        }],
        "groupBy": "impl.language",
        "display": "duration_average_us",
        "workload": {
          "operations": [{
            "op": "replace",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "counter"}
          }]
        },
        "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 1},
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": true,
        "filterRuns": "Latest"
      },

      kvGetsSingleThreaded: {
        "inputs": [{
          "viewing": "cluster",
          "params": defaultCluster
        }],
        "groupBy": "impl.language",
        "display": "duration_average_us",
        "workload": {
          "operations": [{
            "op": "get",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
          }]
        },
        "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 1},
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": true,
        "filterRuns": "Latest"
      }

    }
  }
}
</script>

