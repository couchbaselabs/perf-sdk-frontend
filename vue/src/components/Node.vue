<template>
  <b-container>
    <Shared :language="'Node'"></Shared>

    <h1>Experiment - threads</h1>
    Doing KV gets with increasing numbers of threads.
    <Results :input="numThreads"></Results>

  </b-container>
</template>

<script>
import Shared from "@/components/Shared";
import Results from "@/components/Results";

export default {
  components: {Results, Shared},
  data() {
    return {
      numThreads: {
        "inputs": [{
          "viewing": "cluster",
          "params": [{}]
        }],
        "display": "duration_average_us",
        "group_by": "variables.horizontalScaling",
        "impl": {"language": "Node"},
        "workload": {
          "settings": {
            "variables": [{"name": "experimentName", "value": "numThreads"}]
          },
        },
        "graph_type": "Simplified",
        "grouping_type": "Average",
        "merging_type": "Average",
        "trimming_seconds": 20,
        "bucketise_seconds": 0,
        "include_metrics": false,
        "exclude_gerrit": false,
        "exclude_snapshots": false
      }
    }
  }
}
</script>

