<template>
  <div class="mb-5">
    <!-- Removed hack that forced updates via JSON.stringify(input) -->

    <div v-if="!results && !errors" class="text-center">
      <b-spinner variant="primary"></b-spinner>
      <p>Fetching...</p>
    </div>

    <div v-if="errors">
      <b-card bg-variant="danger" text-variant="white" title="Error">
        <b-card-text>
          {{errors}}
        </b-card-text>
      </b-card>
    </div>

    <div v-if="results" class="graph">

      <!--      <b-container class="mb-3">-->

        <BarChart v-if="results.type === 'bar'" class="chart" :input="input" :chartData="results.data"/>
        <div v-if="results.type === 'line'">
          <LineChart class="chartLine" :chartData="results.data"/>
          <div>
            Time: All runs are shown starting from time '0' to allow them to be displayed together. Mouseover points
            to see the wallclock times.
          </div>
        </div>

<!--      </b-container>-->

      <div class="d-flex">
        <!-- <b-button class="mr-2" v-on:click="showInExplorer" variant="outline-primary">
          Show in Explorer
        </b-button> -->

        <b-button class="mr-2" variant="outline-secondary" size="sm" @click="forceRerender" :disabled="isReloading" title="Mainly to debug the backend">
          <b-spinner small v-if="isReloading"></b-spinner>
          {{ isReloading ? 'Reloading...' : 'Reload' }}
        </b-button>

        <b-button class="mr-2" v-if="!display" v-on:click="display = true" variant="outline-secondary">
          Show runs ({{ results.runs.length }})
        </b-button>

        <b-button class="mr-2" v-if="display" v-on:click="display = false" variant="outline-primary">
          Hide runs
        </b-button>

        <div>
          <b-form-select v-model="defaultDisplay">
            <option>duration_average_us</option>
            <option>duration_min_us</option>
            <option>duration_max_us</option>
            <option>duration_p50_us</option>
            <option>duration_p95_us</option>
            <option>duration_p99_us</option>
            <option>operations_total</option>
            <option>operations_success</option>
            <option>operations_failed</option>
          </b-form-select>
        </div>
      </div>

      <table v-if="display" class="table text-left table-striped table-bordered table-sm table-responsive mt-5">
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
          <td>{{ r.datetime }}</td>
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
import BarChart from "./BarChart.vue";
import LineChart from "./LineChart.vue";
import router from '../router.ts'

export default {
  name: "Results",
  components: {BarChart, LineChart},
  data() {
    return {
      defaultDisplay: 'duration_average_us',
      lastInput: undefined,
      results: undefined,
      errors: undefined,
      display: false,
      componentKey: 0,
      isReloading: false,
      lastRequestId: 0
    }
  },
  mounted() {
    // Do not fetch here; watchers with immediate=true handle initial fetch
  },
  unmounted() {
    console.info("Results component unmounted");
    // Clean up resources
    this.results = undefined;
    this.errors = undefined;
  },
  methods: {
    displayChanged: async function(display) {
      // Clone to avoid mutating prop (which triggers deep watchers endlessly)
      const newInput = JSON.parse(JSON.stringify(this.input || {}))
      if (newInput?.yAxes?.[0]) {
        newInput.yAxes[0].column = display
      }
      await this.fetchQuery(newInput)
    },

    fetchQuery: async function (input) {
      if (input !== undefined) {
        this.isReloading = true
        this.lastInput = input
        const reqId = ++this.lastRequestId
        try {
          console.info("Results fetching...")
          console.info(JSON.stringify(input))

          const res = await fetch(`/dashboard/query`,
              {
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                method: "POST",
                body: JSON.stringify(input)
              })

          if (reqId === this.lastRequestId) {
            if (res.status.toString().startsWith('2')) {
              this.results = await res.json();
            } else {
              const err = await res.json().catch(() => ({ message: res.statusText }))
              this.errors = err?.message || JSON.stringify(err) || `HTTP ${res.status}`
            }
          }
        } catch (e) {
          if (reqId === this.lastRequestId) {
            this.errors = e?.message || 'Network error'
          }
        } finally {
          this.isReloading = false
        }
      } else {
        console.info("Skipping fetch")
      }
    },

    fetchSingleQuery: async function (input) {
      this.isReloading = true
      const reqId = ++this.lastRequestId
      try {
        console.info("Fetching single query with input:", JSON.stringify(input));
        const res = await fetch(`/dashboard/single`,
            {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              method: "POST",
              body: JSON.stringify(input)
            })

        if (reqId === this.lastRequestId) {
          if (res.status.toString().startsWith('2')) {
            this.results = await res.json();
          } else {
            const err = await res.json().catch(() => ({ message: res.statusText }))
            this.errors = err?.message || JSON.stringify(err) || `HTTP ${res.status}`
          }
        }
      } catch (e) {
        if (reqId === this.lastRequestId) {
          this.errors = e?.message || 'Network error'
        }
      } finally {
        this.isReloading = false
      }
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
      this.$router.push({
        path: `/single`,
        query: {
          runId: runId
        }
      })
    },

    forceRerender() {
      this.componentKey += 1
      this.results = undefined
      this.errors = undefined
      if (this.single && !this.input) {
        this.fetchSingleQuery(this.single)
      } else if (this.input && !this.single) {
        this.fetchQuery(this.input)
      }
    }
  },
  props: ['input', 'single'],
  watch: {
    // Use v-model watch rather than DOM change events to avoid duplicate triggers
    defaultDisplay(newVal) {
      this.displayChanged(newVal)
    },
    input: {
      handler(newInput) {
        if (newInput && !this.single) {
          this.results = undefined
          this.errors = undefined
          this.fetchQuery(newInput)
        }
      },
      // Watch by reference only; child should not react to nested mutations of parent input
      deep: false,
      immediate: true
    },
    single: {
      handler(newSingle) {
        if (newSingle && !this.input) {
          this.results = undefined
          this.errors = undefined
          this.fetchSingleQuery(newSingle)
        }
      },
      deep: false,
      immediate: true
    }
  }
}
</script>

<style scoped>
.chart {
  max-height: 200px !important;
}

.chartLine {
  max-height: 600px !important;
}
</style>