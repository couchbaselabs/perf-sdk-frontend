<template>
  <b-container>
    <div class="mb-5">Showing run {{$route.params.runId}} with {{$route.params.display}}</div>

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
        "display": this.$route.params.display,
        "runid": this.$route.params.runId,
        "trimming_seconds": 0,
        include_metrics: true
      }
    }
  }
}
</script>

