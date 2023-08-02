<template>
  <b-container>
    {{transactions}}

    <h1>Transactions (write)</h1>
    <p>Each transaction is doing one KV replace and one KV insert.</p>
    <p>With 1 thread:</p>
    <Results :input="transactions1Thread"></Results>
    <p>With 20 threads:</p>
    <Results :input="transactions20Threads"></Results>
    <h1>Transactions (readonly)</h1>
    <p>Each transaction is doing one KV read. It should have near-identical performance to non-transactional KV
      gets.</p>
    <p>With 1 thread:</p>
    <Results :input="transactionsReadOnly1Thread"></Results>
    <p>With 20 threads:</p>
    <Results :input="transactionsReadOnly20Threads"></Results>
  </b-container>
</template>

<script>
import Results from "@/components/Results.vue";
import {defaultQuery, defaultCluster, defaultVars} from "@/components/Shared.vue";

function transactionsDefault(language, threads, excludeSnapshots, excludeGerrit) {
  return {
    ...defaultQuery,
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
 data() {
    return {
      transactions1Thread: transactionsDefault(this.language, 1, this.excludeSnapshots, this.excludeGerrit || true),
      transactions20Threads: transactionsDefault(this.language, 20, this.excludeSnapshots, this.excludeGerrit || true),
      transactionsReadOnly1Thread: transactionsReadOnlyDefault(this.language, 1, this.excludeSnapshots, this.excludeGerrit || true),
      transactionsReadOnly20Threads: transactionsReadOnlyDefault(this.language, 20, this.excludeSnapshots, this.excludeGerrit || true),
      excludeSnapshots: false,
      excludeGerrit: true,
    }
  }
}
</script>


