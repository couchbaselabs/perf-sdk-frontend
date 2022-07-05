<template>
  <b-container>
    <h1>KV Insert</h1>
    <Results :input="input"></Results>
  </b-container>
</template>

<script>
import Results from "@/components/Results";

export default {
  components: {Results},
  data() {
    return {
      input: {
        "inputs": [{"viewing": "cluster", "params": [{"hostname": "cbs"}]}],
        "group_by": "impl.version",
        "display": "duration_average_us",
        "impl": {"language": "python"},
        "workload": {"description": "inserting"},
        "vars": {"doc_num": 1000000, "horizontal_scaling": 1},
        "graph_type": "Simplified",
        "grouping_type": "Average"
      }
    }
  }
}
</script>

