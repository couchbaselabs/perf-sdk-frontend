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
          <td>Situational Run</td>
          <td>Started</td>
          <td>Score</td>
          <td>Runs</td>
          <td>SDK</td>
          <td>Version</td>
        </tr>
        </thead>

        <tr v-for="r in results" :key="r.situationalRunId">
          <td v-bind:style="{color: r.color}">
            <a href="#" v-on:click="situationalRunClicked(r.situationalRunId)">
              {{ r.situationalRunId }}
            </a>
          </td>
          <td>{{ r.started }}</td>
          <td>{{ r.score ?? "N/A" }}</td>
          <td>{{ r.numRuns }}</td>
          <td>{{ r.detailsOfAnyRun?.impl?.language }}</td>
          <td>{{ r.detailsOfAnyRun?.impl?.version }}</td>
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
    this.fetchQuery()
  },
  methods: {
    fetchQuery: async function () {
        const res = await fetch(`${document.location.protocol}//${document.location.hostname}:3002/dashboard/situationalRuns`,
            {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            })

        if (res.status.toString().startsWith('2')) {
          this.results = await res.json();
        } else {
          this.errors = await res.json()
        }
    },

    situationalRunClicked: function (situationalRunId) {
      this.$router.push({
        path: `/situationalRun`,
        query: {
          situationalRunId: situationalRunId
        }
      })
    }
  }
}
</script>
