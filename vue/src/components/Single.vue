<template>
  <b-container>
    <Results :single="input"></Results>
  </b-container>
</template>

<script>
import Results from "@/components/Results";

export default {
  components: {Results},
  data() {
    return {
      input: {
        "display": this.display,
        "runid": this.runId,
        "trimming_seconds": 0,
        include_metrics: true
      }
    }
  },
  props: ['runId', 'display']
}
</script>

