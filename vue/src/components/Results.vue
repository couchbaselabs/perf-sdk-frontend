<template>
  <div class="mb-5">
    <!-- Hack to force this to update when input changes.  Not sure if better way to achieve. -->
    <div style="display: none">
      {{ JSON.stringify(input) }}
    </div>

    <div v-if="!results">
      <b-spinner small variant="primary" label="Spinning"></b-spinner>
      Fetching...
    </div>

    <div v-if="results" class="graph">
      <b-container class="mb-3">

        <BarChart v-if="results.type === 'bar'" class="chart" :chartData="results.data" :options="results.options"
                  :input="input"/>
        <div v-if="results.type === 'line'">
          <LineChart class="chartLine" :chartdata="results.data" :options="results.options" :input="input"/>
          <div>
            Time: All runs are shown starting from time '0' to allow them to be displayed together. Mouseover points
            to see the wallclock times.
          </div>
        </div>

      </b-container>

      <div>
        <b-button class="mr-2" v-on:click="showInExplorer" variant="outline-primary">
          Show in Explorer
        </b-button>

        <b-button v-if="!display" v-on:click="display = true" variant="outline-primary">
          Show runs ({{ results.runs.length }})
        </b-button>

        <b-button v-if="display" v-on:click="display = false" variant="outline-primary">
          Hide runs
        </b-button>
      </div>

      <table v-if="display" class="text-left table-striped table-bordered table-sm table-responsive mt-5">
        <thead class="font-weight-bold">
        <tr>
          <td>Run</td>
          <td>Date</td>
          <td>Display</td>
          <td>Impl</td>
          <td>Cluster</td>
          <td>Workload</td>
          <td>Vars</td>
        </tr>
        </thead>

        <tr v-for="r in results.runs" :key="r.id">
          <td v-bind:style="{color: r.color}">
            <a href="#" v-on:click="runClicked(r.id)">
              {{ r.id }}
            </a>
          </td>
          <td v-bind:style="{color: r.color}">{{ r.datetime }}</td>
          <td>{{ r.groupedBy }}</td>
          <td>
            <pre>{{ JSON.stringify(r.impl, null, 2) }}</pre>
          </td>
          <td>
            <pre>{{ JSON.stringify(r.cluster, null, 2) }}</pre>
          </td>
          <td>
            <pre>{{ JSON.stringify(r.workload, null, 2) }}</pre>
          </td>
          <td>
            <pre>{{ JSON.stringify(r.vars, null, 2) }}</pre>
          </td>
        </tr>
      </table>

    </div>
  </div>
</template>

<script>
import BarChart from "./BarChart";
import LineChart from "./LineChart";
import router from '../router.ts'

export default {
  name: "Results",
  components: {BarChart, LineChart},
  data() {
    return {
      lastInput: undefined,
      results: undefined,
      display: false
    }
  },
  mounted() {
    if (this.single) {
      this.fetchSingleQuery(this.single)
    } else if (this.input) {
      this.fetchQuery(this.input)
    }
  },
  updated() {
    // Need this component to refetch data when the `input` prop changes.  The approach used here doesn't seem slick
    // but is the only solution that worked.
    if (!this.single && this.lastInput !== this.input) {
      this.fetchQuery(this.input)
    }
  },
  methods: {
    fetchQuery: async function (input) {
      if (input !== undefined) {
        this.lastInput = input
        console.info("Results fetching...")
        console.info(JSON.stringify(input))

        const res = await fetch(`http://${document.location.hostname}:3002/dashboard/query`,
            {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              method: "POST",
              body: JSON.stringify(input)
            })

        this.results = await res.json();
      } else {
        console.info("Skipping fetch")
      }
    },

    fetchSingleQuery: async function (input) {
      const res = await fetch(`http://${document.location.hostname}:3002/dashboard/single`,
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

    showInExplorer: function () {
      router.push({
        name: 'Explorer',
        params: {
          initialInput: this.lastInput
        }
      })
    },

    runClicked: function (runId) {
      // window.history.pushState(null, '', `/single/${runId}/${this.input.display}`);

      this.$router.push({
        path: `/single`,
        query: {
          runId: runId,
          yAxis: this.input.yAxis,
          mergingType: this.input.mergingType,
          bucketiseSeconds: this.input.bucketiseSeconds
        }
      })
    }
  },
  props: ['input', 'single']
}
</script>

<style scoped>
.chart {
  height: 200px !important;
}

.chartLine {
  height: 600px !important;
}
</style>