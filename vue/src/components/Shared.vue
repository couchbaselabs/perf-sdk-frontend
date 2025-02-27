<template>
  <b-container>
    <ExcludeSnapshotsCheckbox />
    
    <!-- Disabling as unoptimised and potentially killing database -->
    <!-- <MetricsAlerts :input="{language:language}"></MetricsAlerts>-->
    <h1>KV Get</h1>
    <p>With 20 threads:</p>
    <Results :input="kvGets" :key="'gets-' + reloadTrigger"></Results>
    <h1>KV Replace</h1>
    <p>With 20 threads:</p>
    <Results :input="kvReplaces" :key="'replaces-' + reloadTrigger"></Results>
    <h1>KV Insert</h1>
    <p>With 20 threads:</p>
    <Results :input="kvInserts" :key="'inserts-' + reloadTrigger"></Results>
    <h1>Horizontal Scaling</h1>
    Tests how the SDK scales with parallelism, using KV gets.  The SDK's default numKvConnections setting is used (and is likely to be a bottleneck).
    <Results :input="kvGetsHorizontalScaling" :key="'horizontalScaling-' + reloadTrigger"></Results>
  </b-container>
</template>

<script>
import { useGlobalSnapshots } from '../mixins/GlobalSnapshotMixin'
import { useSnapshotState } from '../composables/useSnapshotState'
import ExcludeSnapshotsCheckbox from './ExcludeSnapshotsCheckbox.vue'
import Results from "@/components/Results.vue";

export default {
  components: { 
    Results,
    ExcludeSnapshotsCheckbox
  },
  props: ['language'],
  setup() {
    const { excludeSnapshots } = useGlobalSnapshots()
    const { reloadTrigger } = useSnapshotState()
    
    return {
      excludeSnapshots,
      reloadTrigger
    }
  },
  computed: {
    kvInserts() {
      return {
        ... defaultQuery,
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": this.language},
          "workload": defaultWorkloadInserts,
          "vars": {"docNum": 10000000, ... defaultVars}
        },
        "excludeSnapshots": this.excludeSnapshots,
        "excludeGerrit": this.excludeGerrit || true
      }
    },

    kvReplaces() {
      return {
        ... defaultQuery,
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": this.language},
          "workload": defaultWorkloadReplaces,
          "vars": {... defaultVars}
        },
        "excludeGerrit": this.excludeGerrit || true,
        "excludeSnapshots": this.excludeSnapshots
      }
    },

    kvGets() {
      return {
        ... defaultQuery,
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": this.language},
          "workload": defaultWorkloadGets,
          "vars": {... defaultVars}
        },
        "excludeGerrit": this.excludeGerrit || true,
        "excludeSnapshots": this.excludeSnapshots || false,
        
      }
    },

    kvGetsHorizontalScaling() {
      return {
        ... defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.horizontalScaling",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": this.language},
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ... defaultVarsWithoutHorizontalScaling, "experimentName": "horizontalScaling" }
        },
        "excludeSnapshots": this.excludeSnapshots || false,
        "filterRuns": "Latest",
        
      }
    }
  },
  data() {
    return {
      excludeGerrit: true,
    }
  }
}

export const defaultCluster = {
  "type": "unmanaged",
  "memory": 28000,
  "storage": "couchstore",
  "version": "7.1.1-3175-enterprise",
  "cpuCount": 16,
  "replicas": 0,
  "nodeCount": 1,
  "connectionString": "couchbase://localhost"
}

// This is localhost CNG.
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

export const openShiftCluster = {
  "connectionString": "protostellar://grpc-sdk-performance-testing.apps.operator-fit.1o92.p1.openshiftapps.com:443"
}

export const defaultQuery = {
  // We're usually displaying SDK versions as the h-axis.
  "hAxis": hAxisSdkVersion(),

  // We're usually display duration_average_us from the buckets table as the y-axis.
  // It's not best practice to display averages - max or p99 would be better - but the test variance is unfortunately
  // too high for that to display useful results.
  "yAxes": [{
    type: "buckets",
    column: "duration_average_us",
  }],

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

  // Generally want to include snapshot (interim) releases.
  "excludeSnapshots": false,

  // Generally don't want to include Gerrit results.
  "excludeGerrit": true,

  // Generally want to include all runs.
  "filterRuns": "All"
}

export const defaultVarsWithoutHorizontalScaling = {
  // driverVer increases whenever the driver logic changes in a way that would meaningfully impact results.
  "driverVer": 6,

  // Most tests run for this time.
  "forSeconds": 300,

  // performerVer is meant to change whenever the performer's code changes in a way that would meaningfully impact
  // results.  So each performer technically has its own performerVer, and it shouldn't really be useful to have it here.
  // However, in practice we usually wipe the database results instead, so this is currently 1 for all performers.
  "performerVer": 1,

  // Mainly affects Java - if there are multiple APIs, just use the default one.
  "api": "DEFAULT",

  // We usually don't want to include experiments. The value `null` here means that runs where the field "experimentName" is defined
  // should be excluded. The value that marks a field that should be excluded might change in the future
  "experimentName": null,
}

export const defaultVars = {
  ... defaultVarsWithoutHorizontalScaling,

  // Most tests are done with this level of load.
  "horizontalScaling": 20
}

export const defaultWorkloadInserts = {
  "operations": [{
    "op": "insert",
    "bounds": {"forSeconds": "$forSeconds"},
    "docLocation": {"method": "uuid"}
  }]
}

export const defaultWorkloadReplaces = {
  "operations": [{
    "op": "replace",
    "bounds": {"forSeconds": "$forSeconds"},
    "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "counter"}
  }]
}

export const defaultWorkloadGets = {
  "operations": [{
    "op": "get",
    "bounds": {"forSeconds": "$forSeconds"},
    "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
  }]
}

export function hAxisSdkVersion() {
  return {
    "type": "dynamic",
    "databaseField": "impl.version",
    "resultType": "VersionSemver"
  }
}

export function hAxisSdkLanguage() {
  return {
    "type": "dynamic",
    "databaseField": "impl.language",
    "resultType": "String"
  }
}

// Return a copy of `vars` (a JSON object) with key `key` removed.
export function withoutKey(key, vars) {
  // eslint-disable-next-line no-unused-vars
  const {[key]: _, ... rest} = vars
  return rest;
}
</script>


