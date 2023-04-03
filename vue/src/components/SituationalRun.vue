<template>
  <b-container>
    <div v-if="!results && !errors">
      <b-spinner small variant="primary" label="Spinning"></b-spinner>
      Fetching...
    </div>

    <div v-if="errors">
      <b-card bg-variant="danger" text-variant="white" title="Error">
        <b-card-text>
          {{errors}}
        </b-card-text>
      </b-card>
    </div>

    <div v-if="results">
<!--      {{JSON.stringify(results)}}-->

      <table class="table text-left table-striped table-sm table-responsive mt-5">
        <thead class="font-weight-bold">
        <tr>
          <td>Run</td>
          <td>Started</td>
          <td>Description</td>
          <td>Score</td>
        </tr>
        </thead>

        <tr v-for="r in results.runs" :key="r.runId">
          <td v-bind:style="{color: r.color}">
            <a href="#" v-on:click="runClicked(r.runId)">
              {{ r.runId }}
            </a>
          </td>
          <td>{{ r.started }}</td>
          <td>{{ r.runParams?.workload?.situational }}</td>
          <td>{{ r.srjParams?.score ?? "N/A" }}</td>
        </tr>
      </table>

    </div>
  </b-container>
</template>

<script>

export default {
  name: "SituationalRun",
  data() {
    return {
      lastInput: undefined,
      results: undefined,
      errors: undefined,
      display: false
    }
  },
  mounted() {
    this.fetchQuery(this.$route.query.situationalRunId)
  },
  methods: {
    fetchQuery: async function (situationalRunId) {
        const res = await fetch(`http://${document.location.hostname}:3002/dashboard/situationalRun`,
            {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              method: "POST",
              body: JSON.stringify({
                situationalRunId: situationalRunId
              })
            })

        if (res.status.toString().startsWith('2')) {
          this.results = await res.json();
        } else {
          this.errors = await res.json()
        }
    },

    runClicked: function (runId) {
      this.$router.push({
        path: `/situationalSingle`,
        query: {
          situationalRunId: this.$route.query.situationalRunId,
          runId: runId
        }
      })
    }
  }
}
</script>
