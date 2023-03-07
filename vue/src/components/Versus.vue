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
import {
  defaultQuery,
  defaultVars,
  defaultWorkloadInserts,
  defaultWorkloadReplaces,
  defaultWorkloadGets,
  hAxisSdkLanguage
} from "@/components/Shared";

export default {
  components: {Results},
  props: ['language'],
  data() {
    return {
      kvInserts: {
        ...defaultQuery,
        "hAxis": hAxisSdkLanguage(),
        "databaseCompare": {
          "workload": defaultWorkloadInserts,
          "vars": {"docNum": 10000000, ...defaultVars}
        },
        "filterRuns": "Latest"
      },

      kvReplaces: {
        ...defaultQuery,
        "hAxis": hAxisSdkLanguage(),
        "databaseCompare": {
          "workload": defaultWorkloadReplaces,
          "vars": {"poolSize": 10000, ...defaultVars}
        },
        "filterRuns": "Latest"
      },

      kvGets: {
        ...defaultQuery,
        "hAxis": hAxisSdkLanguage(),
        "databaseCompare": {
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ...defaultVars}
        },
        "filterRuns": "Latest"
      },

      kvInsertsSingleThreaded: {
        ...defaultQuery,
        "hAxis": hAxisSdkLanguage(),
        "databaseCompare": {
          "workload": defaultWorkloadInserts,
          "vars": {"docNum": 10000000, ...defaultVars, "horizontalScaling": 1}
        },
        "filterRuns": "Latest"
      },

      kvReplacesSingleThreaded: {
        ...defaultQuery,
        "hAxis": hAxisSdkLanguage(),
        "databaseCompare": {
          "workload": defaultWorkloadReplaces,
          "vars": {"poolSize": 10000, ...defaultVars, "horizontalScaling": 1}
        },
        "filterRuns": "Latest"
      },

      kvGetsSingleThreaded: {
        ...defaultQuery,
        "hAxis": hAxisSdkLanguage(),
        "databaseCompare": {
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ...defaultVars, "horizontalScaling": 1}
        },
        "filterRuns": "Latest"
      }

    }
  }
}
</script>

