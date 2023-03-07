<template>
  <b-container>
    <div class="mb-5">
      Showing run {{$route.query.runId}} and displaying {{$route.query.display}}.
      <div v-if="input.bucketiseSeconds">
        Re-bucketised into {{input.bucketiseSeconds}} second buckets, merged with {{input.mergingType}}.
        <b-alert variant="danger" show>Currently if re-bucketising data, metrics are disabled as re-bucketising the JSON-based metrics is non-trivial.</b-alert>
      </div>
    </div>

    <Results :single="input" :input="input"></Results>
  </b-container>
</template>

<script>
import Results from "@/components/Results";

export default {
  components: {Results},
  data() {
    return {
      input: {
        yAxis: this.$route.query.yAxis,
        runId: this.$route.query.runId,
        trimmingSeconds: 0,
        includeMetrics: true,
        mergingType: this.$route.query.mergingType,
        bucketiseSeconds: this.$route.query.bucketiseSeconds,
      }
    }
  }
}
</script>

