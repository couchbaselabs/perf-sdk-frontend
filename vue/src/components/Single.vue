<template>
  <b-container>
    <div class="mb-5">
      Showing run {{$route.query.runId}} and displaying {{$route.query.display}}.
    </div>

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
        display: this.$route.query.display,
        runid: this.$route.query.runId,
        trimming_seconds: 0,
        include_metrics: true,
        merging_type: this.$route.query.mergingType,
        // Not re-bucketising data, since re-bucketising the JSON-based metrics is non-trivial.
        // bucketise_seconds: this.$route.query.bucketiseSeconds,
        bucketise_seconds: undefined,
      }
    }
  }
}
</script>

