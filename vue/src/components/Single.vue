<template>
  <div>
    <div class="mb-5">
      Showing run {{ $route.query.runId }}.
      <div v-if="input.bucketiseSeconds">
        Re-bucketised into {{ input.bucketiseSeconds }} second buckets, merged with {{ input.mergingType }}.
        <b-alert variant="danger" show>Currently if re-bucketising data, metrics are disabled as re-bucketising the
          JSON-based metrics is non-trivial.
        </b-alert>
      </div>
    </div>

    <Results :single="input" :input="input"></Results>
  </div>
</template>

<script>
import Results from "@/components/Results";

export default {
  components: {Results},
  data() {
    return {
      input: {
        yAxes: this.$route.query.yAxis ?? [{
          type: "buckets",
          column: "operations_total",
        },
          {type: "errors"},
          {type: "metrics"}
        ],
        runId: this.$route.query.runId,
        trimmingSeconds: 0,
        includeMetrics: true,
        mergingType: this.$route.query.mergingType ?? "Average",
        bucketiseSeconds: this.$route.query.bucketiseSeconds ?? undefined,
      }
    }
  }
}
</script>

