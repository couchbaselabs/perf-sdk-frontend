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

    <div v-if="loading" class="text-center">
      <b-spinner variant="primary"></b-spinner>
      <p>Loading metrics data...</p>
    </div>

    <Results v-else :single="input" :input="input" :showDropdown="false"></Results>
  </div>
</template>

<script>
import Results from "@/components/Results.vue";

export default {
  components: {Results},
  data() {
    return {
      loading: true,
      input: {
        yAxes: [
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
          }
        ],
        annotations: [{type: "run-events"}],
        runId: this.$route.query.runId,
        trimmingSeconds: 0,
        mergingType: this.$route.query.mergingType ?? "Average",
        bucketiseSeconds: this.$route.query.bucketiseSeconds ?? 10,
      }
    }
  },
  async created() {
    await this.initializeWithMetrics();
  },
  methods: {
    async initializeWithMetrics() {
      try {
        const response = await fetch(`${document.location.protocol}//${document.location.hostname}:3002/dashboard/metrics`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const metrics = await response.json();
        
        if (Array.isArray(metrics)) {
          // Add all metrics to yAxes with display: false by default
          metrics.forEach(metric => {
            this.input.yAxes.push({
              type: "metric",
              yAxisID: "right",
              metric: metric,
              
            });
          });
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>

