<template>
  <b-container>
    <h1>couchbase2:// KV Gets</h1>
    With a localhost CNG instance between the SDK and the localhost cluster.
    <p>With 1 thread:</p>
    <Results :input="kvGets1Thread"></Results>
    <p>With 20 threads:</p>
    <Results :input="kvGets20Threads"></Results>
  </b-container>
</template>

<script>
import Results from "@/components/Results.vue";
import MetricsAlerts from "@/components/MetricsAlerts.vue";

import {defaultQuery, defaultCluster, defaultWorkloadGets, defaultVars} from "@/components/Shared.vue";

export default {
  components: {Results, MetricsAlerts},
  props: ['language'],
  computed: {
    kvGets1Thread() {
      const basic = basicQuery(this.language, this.excludeGerrit, this.excludeSnapshots)
      return {
        ... basic,
        "databaseCompare": {
          ... basic.databaseCompare,
          "workload": defaultWorkloadGets,
          "vars": {
            ...defaultVars,
            "horizontalScaling": 1,
          }
        }
      }
    },

    kvGets20Threads() {
      const basic = basicQuery(this.language, this.excludeGerrit, this.excludeSnapshots)
      return {
        ... basic,
        "databaseCompare": {
          ... basic.databaseCompare,
          "workload": defaultWorkloadGets,
        }
      }
    },
  },
  data() {
    return {
      excludeSnapshots: false,
      excludeGerrit: true,
    }
  }
}

const localhostCNGCluster = {
  ... defaultCluster,
  "insecure": true,
  "connectionString": "couchbase2://localhost",
  "cloudNativeGatewayVersion": "ghcr.io/cb-vanilla/cloud-native-gateway:0.2.0-141"
}


function basicQuery(language, excludeGerrit, excludeSnapshots) {
  return {
    ...defaultQuery,
    "databaseCompare": {
      "cluster": localhostCNGCluster,
      "impl": {"language": language},
      "vars": {...defaultVars}
    },
    "excludeGerrit": excludeGerrit || true,
    "excludeSnapshots": excludeSnapshots || false,
  }
}

</script>