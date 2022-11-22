<template>
  <div class="mb-5">
    <div v-if="!results">
      <b-spinner small variant="primary" label="Spinning"></b-spinner> Fetching metrics alerts...
    </div>

    <div v-if="results && results.length == 0">
      ✅ No metrics alerts.
    </div>

    <div v-if="results && results.length > 0" class="scrollable">
      <table class="text-left table-striped table-bordered table-sm table-responsive mt-5">
        <thead class="font-weight-bold">
        <tr>
          <td>Run</td>
          <td>Date</td>
          <td>Language</td>
          <td>Version</td>
          <td>Message</td>
        </tr>
        </thead>

        <tr v-for="r in results" :key="r.runId">
          <td>
            <a href="#" v-on:click="runClicked(r.runId)">
              {{ r.runId }}
            </a>
          </td>
          <td>{{ r.datetime }}</td>
          <td>{{ r.language }}</td>
          <td>{{ r.version }}</td>
          <td>{{ r.message }}</td>
        </tr>
      </table>

    </div>
  </div>
</template>

<script>
export default {
  name: "MetricsAlerts",
  props: ['input'],
  data() {
    return {
      results: undefined
    }
  },
  mounted() {
    this.fetchQuery(this.input)
  },
  methods: {
    fetchQuery: async function (input) {
      const res = await fetch(`http://${document.location.hostname}:3002/dashboard/metrics`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify(input)
          })

      this.results = await res.json();
    },

    runClicked: function (runId) {
      this.$router.push({
        path: `/single`,
        query: {
          runId: runId,
          display: "duration_average_us",
          mergingType: "Maximum",
          bucketiseSeconds: 0
        }
      })
    }
  }
}
</script>


<style scoped>

.scrollable {
  max-height: 300px;
  overflow:auto;
}

</style>