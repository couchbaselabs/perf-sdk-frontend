<template>
  <b-container>
    {{transactions}}

    <h1>Transactions (write)</h1>
    <p>Each transaction is doing one KV replace and one KV insert.</p>
    <p>With 1 thread:</p>
    <Results :input="transactions1Thread" :key="'trans1-' + reloadTrigger"></Results>
    <p>With 20 threads:</p>
    <Results :input="transactions20Threads" :key="'trans20-' + reloadTrigger"></Results>
    <h1>Transactions (readonly)</h1>
    <p>Each transaction is doing one KV read. It should have near-identical performance to non-transactional KV
      gets.</p>
    <p>With 1 thread:</p>
    <Results :input="transactionsReadOnly1Thread" :key="'readonly1-' + reloadTrigger"></Results>
    <p>With 20 threads:</p>
    <Results :input="transactionsReadOnly20Threads" :key="'readonly20-' + reloadTrigger"></Results>
  </b-container>
</template>

<script>
import Results from "@/components/Results.vue";
import { useSnapshotState } from '@/composables/useSnapshotState'
import { defaultQuery, defaultCluster } from "@/components/Shared.vue";

function transactionsDefault(language, threads, excludeSnapshots, excludeGerrit) {
  return {
    ...defaultQuery,
    // Switch to throughput as we have some bad latency spikes in a few early Java transaction tests, that are likely
    // test bugs and are dominating the results.
    "yAxes": [{
      type: "buckets",
      column: "operations_total",
    }],
    "databaseCompare": {
      "cluster": defaultCluster,
      "impl": {"language": language},
      "workload": {
        "operations": [{
          "transaction": {
            "ops": [{
              "op": "replace",
              "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
            }, {"op": "insert", "docLocation": {"method": "uuid"}}], "bounds": {"forSeconds": "$forSeconds"}
          }
        }]
      },
      "vars": {
        "horizontalScaling": threads
      }
    },
    "excludeSnapshots": excludeSnapshots,
    "excludeGerrit": excludeGerrit,
  }
}

function transactionsReadOnlyDefault(language, threads, excludeSnapshots, excludeGerrit) {
  return {
    ...defaultQuery,
    "databaseCompare": {
      "cluster": defaultCluster,
      "impl": {"language": language},
      "workload": {
        "operations": [{
          "transaction": {
            "ops": [{
              "op": "get",
              "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
            }], "bounds": {"forSeconds": "$forSeconds"}
          }
        }]
      },
      "vars": {
        "horizontalScaling": threads
      }
    },
    "excludeSnapshots": excludeSnapshots,
    "excludeGerrit": excludeGerrit
  }
}

export default {
  components: {Results},
  props: ['language'],
  setup() {
    const { excludeSnapshots, reloadTrigger } = useSnapshotState()
    
    return {
      excludeSnapshots,
      reloadTrigger
    }
  },
  computed: {
    transactions1Thread() {
      return transactionsDefault(this.language, 1, this.excludeSnapshots, this.excludeGerrit || true)
    },
    transactions20Threads() {
      return transactionsDefault(this.language, 20, this.excludeSnapshots, this.excludeGerrit || true)
    },
    transactionsReadOnly1Thread() {
      return transactionsReadOnlyDefault(this.language, 1, this.excludeSnapshots, this.excludeGerrit || true)
    },
    transactionsReadOnly20Threads() {
      return transactionsReadOnlyDefault(this.language, 20, this.excludeSnapshots, this.excludeGerrit || true)
    }
  }
}
</script>

