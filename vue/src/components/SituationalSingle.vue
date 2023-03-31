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

    <div v-if="results">
      {{JSON.stringify(results?.runs[0]?.srjParams)}}
    </div>
  </div>
</template>

<script>
import Results from "@/components/Results.vue";

export default {
  components: {Results},
  data() {
    return {
      results: undefined,

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
          {
            type: "errors",
            yAxisID: "right",
          },
          {
            type: "metrics",
            yAxisID: "right",
          }
        ],
        annotations: [{type: "run-events"}],
        runId: this.$route.query.runId,
        trimmingSeconds: 0,
        mergingType: this.$route.query.mergingType ?? "Average",
        bucketiseSeconds: this.$route.query.bucketiseSeconds ?? undefined,
      }
    }
  },

  mounted() {
    if (this.$route.query.situationalRunId && this.$route.query.runId) {
      this.fetchQuery(this.$route.query.situationalRunId)
    }
  },
  methods: {
    fetchQuery: async function () {
      const res = await fetch(`http://${document.location.hostname}:3002/dashboard/situationalRunRun`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify({
              situationalRunId: this.$route.query.situationalRunId,
              runId: this.$route.query.runId
            })
          })

      if (res.status.toString().startsWith('2')) {
        this.results = await res.json();
      } else {
        this.errors = await res.json()
      }
    },
  }
}
</script>

