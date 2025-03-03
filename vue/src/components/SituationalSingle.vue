<template>
  <div>
    <div class="mb-5">
      <div v-if="results">
        <h1>{{results.runs[0].runParams?.workload?.situational}}</h1>
      </div>
      <div v-else class="h1-placeholder"></div>

      <a href="#" v-on:click="this.situationalRunClicked()">Back to situational results</a>

      <div v-if="input.bucketiseSeconds">
        Re-bucketised into {{ input.bucketiseSeconds }} second buckets, merged with {{ input.mergingType }}.
        <b-alert variant="danger" show>Currently if re-bucketising data, metrics are disabled as re-bucketising the
          JSON-based metrics is non-trivial.
        </b-alert>
      </div>
    </div>

    <!-- Use a transition for smooth content changes -->
    <transition name="fade" mode="out-in">
      <div :key="resultsKey">
        <div v-if="isLoading" class="chart-placeholder">
          <div class="loading-overlay">
            <b-spinner variant="primary" small></b-spinner>
          </div>
        </div>
        <Results v-else :single="input" :input="input"></Results>
      </div>
    </transition>

    <b-row class="mb-2">
      <b-col>
        <div v-if="results">
          <b-card title="Scoring" class="mb-1">
            <b-card-text><b>Total score: {{ results.runs[0].srjParams.score }}</b></b-card-text>

            <ul>
              <li v-for="x in results.runs[0].srjParams.reasons" :key="JSON.stringify(x)">{{ x }}</li>
            </ul>
          </b-card>

          <b-card title="Debug">
            <ul>
              <li>Situational run id: {{$route.query.situationalRunId}}</li>
              <li>Run id: {{$route.query.runId}}</li>
              <li><a :href="results.runs[0].runParams?.debug?.ciUrl">CI job</a></li>
              <li>OpenShift project/namespace: {{results.runs[0].runParams?.debug?.openShiftProject}}</li>
            </ul>
          </b-card>
        </div>
      </b-col>

      <b-col>
        <div v-if="errorsSummary">
          <b-card title="Errors Summary" class="mb-2">
            <div v-if="errorsSummary.length === 0">
              <b-card-text>No errors seen!</b-card-text>
            </div>
            <div v-else>
              <table>
                <tr v-for="x in errorsSummary" :key="JSON.stringify(x)">
                  <td>{{ x.count }}</td>
                  <td>
                    <pre>{{ JSON.stringify(x.first, null, '\t') }}</pre>
                  </td>
                </tr>
              </table>

              <b-button class="mr-2" v-if="!this.hideEventsButton"
                        v-on:click="() => this.hideEventsButton = true && this.fetchAlLEvents()" variant="outline-primary">
                Show All Events
              </b-button>
            </div>
          </b-card>
        </div>
      </b-col>
    </b-row>

    <div v-if="events">
      <table>
        <thead>
        <th>Time</th>
        <th>Seconds From Start</th>
        <th>Event</th>
        </thead>
        <tr v-for="x in events" :key="x.datetime">
          <td>{{ x.datetime }}</td>
          <td>{{ x.timeOffsetSecs }}</td>
          <td>
            <pre>{{ JSON.stringify(x.params, null, '\t') }}</pre>
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
import Results from "@/components/Results.vue";
import {BCard} from "bootstrap-vue-next";

export default {
  components: {BCard, Results},
  data() {
    return {
      isLoading: false,
      resultsKey: 0,
      results: undefined,
      errors: undefined,
      errorsSummary: undefined,
      hideEventsButton: false,
      events: undefined,

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
            yAxisID: "left",
          },
          {
            type: "metric",
            yAxisID: "left",
          }
        ],
        annotations: [{type: "run-events"}],
        runId: this.$route.query.runId,
        trimmingSeconds: 5,
        mergingType: this.$route.query.mergingType ?? "Average",
        bucketiseSeconds: this.$route.query.bucketiseSeconds ?? 10,
        situationalRunId: this.$route.query.situationalRunId,
      }
    }
  },
  created() {
    this.loadData();
  },
  watch: {
    '$route.query.runId': {
      handler(newRunId) {
        this.input.runId = newRunId;
        this.loadData();
      },
      immediate: true,
    },
    '$route': {
      handler() {
        this.loadData();
      },
      immediate: true
    }
  },
  beforeUnmount() {
    // Cleanup any pending operations
    this.results = undefined;
    this.errors = undefined;
    this.errorsSummary = undefined;
  },
  methods: {
    loadData() {
      if (this.input.situationalRunId && this.input.runId) {
        this.isLoading = true;
        this.resultsKey++;

        // Fetch data
        Promise.all([
          this.fetchQuery(),
          this.fetchErrorsSummary(),
        ]).finally(() => {
          this.isLoading = false;
        });
      }
    },
    fetchQuery: async function () {
      const res = await fetch(`${document.location.protocol}//${document.location.hostname}:3002/dashboard/situationalRunRun`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify({
              situationalRunId: this.input.situationalRunId,
              runId: this.input.runId
            })
          })

      if (res.status.toString().startsWith('2')) {
        this.results = await res.json();
      } else {
        this.errors = await res.json()
      }
      return res;
    },

    fetchErrorsSummary: async function () {
      const res = await fetch(`${document.location.protocol}//${document.location.hostname}:3002/dashboard/situationalRunRunErrorsSummary`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify({
              situationalRunId: this.input.situationalRunId,
              runId: this.input.runId
            })
          })

      if (res.status.toString().startsWith('2')) {
        this.errorsSummary = await res.json();
      } else {
        this.errors = await res.json()
      }
    },

    fetchAlLEvents: async function () {
      const res = await fetch(`${document.location.protocol}//${document.location.hostname}:3002/dashboard/situationalRunRunEvents`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify({
              situationalRunId: this.input.situationalRunId,
              runId: this.input.runId
            })
          })

      if (res.status.toString().startsWith('2')) {
        this.events = await res.json();
      } else {
        this.errors = await res.json()
      }
    },

    situationalRunClicked: function () {
      console.info("Moving...")
      this.$router.push({
        path: `/situationalRun`,
        query: {
          situationalRunId: this.input.situationalRunId
        }
      })
    },
  }
}
</script>

<style>
/* Add these styles for smooth transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

.chart-placeholder {
  min-height: 300px;
  position: relative;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.h1-placeholder {
  height: 2.5rem;
  margin-bottom: 0.5rem;
}
</style>
