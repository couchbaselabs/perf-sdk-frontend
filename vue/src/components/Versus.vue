<template>
  <b-container>
    <h1>KV Get (1 thread)</h1>
    <Results :input="kvGetsSingleThreaded"></Results>
    <h1>KV Replace (1 thread)</h1>
    <Results :input="kvReplacesSingleThreaded"></Results>
    <h1>KV Insert (1 thread)</h1>
    <Results :input="kvInsertsSingleThreaded"></Results>
    <h1>KV Get (20 threads)</h1>
    <Results :input="kvGets"></Results>
    <h1>KV Replace (20 threads)</h1>
    <Results :input="kvReplaces"></Results>
    <h1>KV Insert (20 threads)</h1>
    <Results :input="kvInserts"></Results>
  </b-container>
</template>

<script>
import Results from "@/components/Results";
import {defaultCluster} from "./Shared";
import {defaultQuery} from "@/components/Shared";

export default {
  components: {Results},
  props: ['language'],
  data() {
    return {
      kvInserts: {
        ... defaultQuery,
        "databaseCompare": {
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
        "filterRuns": "Latest"
      },

      kvReplaces: {
        ... defaultQuery,
        "databaseCompare": {
          "workload": {
            "operations": [{
              "op": "replace",
              "bounds": {"forSeconds": "$forSeconds"},
              "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "counter"}
            }]
          },
          "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20}
        },
        "filterRuns": "Latest"
      },

      kvGets: {
        ... defaultQuery,
        "databaseCompare": {
          "workload": {
            "operations": [{
              "op": "get",
              "bounds": {"forSeconds": "$forSeconds"},
              "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
            }]
          },
          "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20}
        },
        "filterRuns": "Latest"
      },

      kvInsertsSingleThreaded: {
        ... defaultQuery,
        "databaseCompare": {
          "workload": {
            "operations": [{
              "op": "insert",
              "bounds": {"forSeconds": "$forSeconds"},
              "docLocation": {"method": "uuid"}
            }]
          },
          "vars": {"docNum": 10000000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 1}
        },
        "filterRuns": "Latest"
      },

      kvReplacesSingleThreaded: {
        ... defaultQuery,
        "databaseCompare": {
          "workload": {
            "operations": [{
              "op": "replace",
              "bounds": {"forSeconds": "$forSeconds"},
              "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "counter"}
            }]
          },
          "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 1}
        },
        "filterRuns": "Latest"
      },

      kvGetsSingleThreaded: {
        ... defaultQuery,
        "databaseCompare": {
          "workload": {
            "operations": [{
              "op": "get",
              "bounds": {"forSeconds": "$forSeconds"},
              "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
            }]
          },
          "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 1}
        },
        "filterRuns": "Latest"
      }

    }
  }
}
</script>

