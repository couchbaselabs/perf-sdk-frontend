<template>
  <div class="main">
    <Results :input="input"></Results>
  </div>
</template>

<script>
import Results from "@/components/Results";

export default {
  components: {Results},
  data() {
    return {
      input:  {"inputs":[{"viewing":"cluster","params":[{"type":"unmanaged","memory":12000,"version":"7.1.0-2556-enterprise","cpuCount":4,"nodeCount":1}]}],"group_by":"impl.version","display":"duration_average_us","impl":{"language":"java"},"workload":{"description":null},"vars":{"doc_num":100000,"driverVersion":2,"horizontal_scaling":20},"graph_type":"Simplified","grouping_type":"Side-by-side"}
    }
  }
}
</script>

