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
      <b-card title="Scoring" class="mb-2">
        <b-card-text>Total score: {{results.runs[0].srjParams.score}}</b-card-text>

        <ul>
          <li v-for="x in results.runs[0].srjParams.reasons" :key="JSON.stringify(x)">{{x}}</li>
        </ul>
      </b-card>
    </div>

    <div v-if="errorsSummary">
      <b-card title="Errors Summary" class="mb-2">
        <div v-if="errorsSummary.length === 0">
          <b-card-text>No errors seen!</b-card-text>
        </div>
        <div v-else>
          <table>
            <thead>
            <th>Count</th>
            <th>First Error</th>
            </thead>
            <tr v-for="x in errorsSummary" :key="JSON.stringify(x)">
              <td>{{ x.count }}</td>
              <td>
                <pre>{{ JSON.stringify(x.first, null, '\t') }}</pre>
              </td>
            </tr>
          </table>
        </div>
      </b-card>
    </div>

    <b-button class="mr-2" v-if="!this.hideEventsButton" v-on:click="() => this.hideEventsButton = true && this.fetchAlLEvents()" variant="outline-primary">
      Show All Events
    </b-button>

    <div v-if="events">
      <table>
        <thead>
        <th>Time</th>
        <th>Seconds From Start</th>
        <th>Event</th>
        </thead>
        <tr v-for="x in events" :key="x.datetime">
          <td>{{x.datetime}}</td>
          <td>{{x.timeOffsetSecs}}</td>
          <td><pre>{{JSON.stringify(x.params, null, '\t')}}</pre></td>
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
      results: undefined,
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
            type: "metrics",
            yAxisID: "left",
          }
        ],
        annotations: [{type: "run-events"}],
        runId: this.$route.query.runId,
        trimmingSeconds: 5,
        mergingType: this.$route.query.mergingType ?? "Average",
        bucketiseSeconds: this.$route.query.bucketiseSeconds ?? undefined,
      }
    }
  },

  mounted() {
    if (this.$route.query.situationalRunId && this.$route.query.runId) {
      this.fetchQuery(this.$route.query.situationalRunId)
      this.fetchErrorsSummary(this.$route.query.situationalRunId)
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

    fetchErrorsSummary: async function () {
      const res = await fetch(`http://${document.location.hostname}:3002/dashboard/situationalRunRunErrorsSummary`,
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
        this.errorsSummary = await res.json();
      } else {
        this.errors = await res.json()
      }
    },

    fetchAlLEvents: async function () {
      const res = await fetch(`http://${document.location.hostname}:3002/dashboard/situationalRunRunEvents`,
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
        this.events = await res.json();
      } else {
        this.errors = await res.json()
      }
    },
  }
}
</script>

<style>
pre {
  white-space: pre-wrap;       /* css-3 */
  white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
  white-space: -pre-wrap;      /* Opera 4-6 */
  white-space: -o-pre-wrap;    /* Opera 7 */
  word-wrap: break-word;       /* Internet Explorer 5.5+ */
}
</style>
