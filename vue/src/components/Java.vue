<template>
  <b-container>
  <Shared :language="'Java'"></Shared>
    <h1>Transactions</h1>
    <Results :input="transactions"></Results>
    </b-container>
</template>

<script>
import Shared from "@/components/Shared";
import Results from "@/components/Results";

export default {
  components: {Shared, Results},
    data() {
      return {
        transactions:  {"inputs":[{"viewing":"cluster","params":[{"type":"unmanaged","memory":28000,"region":"us-east-2","storage":"couchstore","version":"7.1.1-3175-enterprise","cpuCount":16,"instance":"c5.4xlarge","replicas":0,"topology":"A","nodeCount":1,"compaction":"disabled"}]}],"group_by":"impl.version","display":"duration_average_us","impl":{"language":"Java"},"workload":{"operations":[{"transaction":{"ops":[{"op":"replace","docLocation":{"method":"pool","poolSize":"$poolSize","poolSelectionStrategy":"randomUniform"}},{"op":"insert","docLocation":{"method":"uuid"}}],"bounds":{"forSeconds":"$forSeconds"}}}]},"vars":{"poolSize":10000,"driverVer":6,"forSeconds":300,"performerVer":1,"horizontal_scaling":20},"graph_type":"Simplified","grouping_type":"Average","merging_type":"Average","trimming_seconds":20,"bucketise_seconds":0,"include_metrics":false}
    }
    }
}
</script>

