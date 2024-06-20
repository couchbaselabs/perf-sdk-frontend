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
import Results from "@/components/Results.vue";

export default {
  components: {Results},
  data() {
    return {
      input: {
        yAxes: this.$route.query.yAxis ?? [
          {
            type: "buckets",
            yAxisID: "left",
            column: "operations_total",
          },
          {
            type: "buckets",
            yAxisID: "right",
            column: "duration_average_us",
          },
          // Too slow to fetch all these
          // {
          //   type: "buckets",
          //   yAxisID: "right",
          //   column: "duration_p99_us",
          // },
          // {
          //   type: "buckets",
          //   yAxisID: "right",
          //   column: "duration_max_us",
          // },
          {
            type: "errors",
            yAxisID: "left",
          },
          {
            type: "metrics",
            yAxisID: "right",
          }
        ],
        annotations: [],
        runId: this.$route.query.runId,
        trimmingSeconds: 0,
        mergingType: this.$route.query.mergingType ?? "Average",
        bucketiseSeconds: this.$route.query.bucketiseSeconds ?? 10,
      }
    }
  }
}
</script>

