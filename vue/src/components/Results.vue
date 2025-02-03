<template>
  <div data-component="Results" class="results-wrapper">
    <!-- Keep hidden input tracker -->
    <div style="display: none">
      {{ JSON.stringify(input) }}
    </div>

    <!-- Loading State -->
    <div v-if="!results && !errors" class="loading-state">
      <div class="spinner"></div>
      <span>Fetching...</span>
    </div>

    <!-- Error State -->
    <div v-if="errors" class="error-card">
      <div class="error-title">Error</div>
      <div class="error-content">{{errors}}</div>
    </div>

    <!-- Results -->
    <div v-if="results" class="results-container">
      <div class="chart-wrapper">
        <div ref="chartContainer">
          <BarChart v-if="results.type === 'bar'" 
                   class="chart" 
                   :input="processedInput" 
                   :chartData="results.data"
                   :key="chartKey"/>
          <div v-if="results.type === 'line'" class="line-chart-container">
            <LineChart class="chartLine" 
                      :chartData="results.data"
                      :key="chartKey"/>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <button class="action-btn" 
                @click="forceRerender" 
                :disabled="isReloading" 
                :class="{ 'loading': isReloading }">
          <div v-if="isReloading" class="spinner small"></div>
          {{ isReloading ? 'Reloading...' : 'Reload' }}
        </button>

        <button v-if="!display" 
                @click="display = true" 
                class="action-btn">
          Show runs ({{ results.runs.length }})
        </button>

        <button v-if="display" 
                @click="display = false" 
                class="action-btn active">
          Hide runs
        </button>

        <select v-if="showDropdown"
                v-model="defaultDisplay" 
                @change="displayChanged" 
                class="select-control">
          <option value="duration_average_us">Average Duration (μs)</option>
          <option value="duration_min_us">Min Duration (μs)</option>
          <option value="duration_max_us">Max Duration (μs)</option>
          <option value="duration_p50_us">P50 Duration (μs)</option>
          <option value="duration_p95_us">P95 Duration (μs)</option>
          <option value="duration_p99_us">P99 Duration (μs)</option>
          <option value="operations_total">Total Operations</option>
          <option value="operations_success">Successful Operations</option>
          <option value="operations_failed">Failed Operations</option>
        </select>
      </div>

      <!-- Results Table -->
      <div v-if="display" class="results-table-wrapper">
        <table class="results-table">
          <thead>
            <tr>
              <th>Run</th>
              <th>Date</th>
              <th>Display</th>
              <th>Impl</th>
              <th>Cluster</th>
              <th>Workload</th>
              <th>Vars</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in results.runs" :key="r.id">
              <td>
                <a href="#" 
                   @click="runClicked(r.id)"
                   class="run-link">
                  {{ r.id }}
                </a>
              </td>
              <td class="date-cell">{{ r.datetime }}</td>
              <td>{{ r.groupedBy }}</td>
              <td><pre>{{ JSON.stringify(r.impl, null, 2) }}</pre></td>
              <td><pre>{{ JSON.stringify(r.cluster, null, 2) }}</pre></td>
              <td><pre>{{ JSON.stringify(r.workload, null, 2) }}</pre></td>
              <td><pre>{{ JSON.stringify(r.vars, null, 2) }}</pre></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import BarChart from "./BarChart.vue";
import LineChart from "./LineChart.vue";
import router from '../router.ts'
import { useGlobalSnapshots } from '../mixins/GlobalSnapShotMixin'
import { computed } from 'vue'

export default {
  name: "Results",
  components: { BarChart, LineChart },
  data() {
    return {
      defaultDisplay: 'duration_average_us',
      lastInput: undefined,
      results: undefined,
      errors: undefined,
      display: false,
      key: 0,
      isReloading: false,
      chartKey: 0
    }
  },
  mounted() {
    if (this.single) {
      this.fetchSingleQuery(this.single)
    } else if (this.input) {
      this.fetchQuery(this.input)
    }
  },
  watch: {
    input: {
      handler(newInput) {
        if (newInput) {
          this.fetchQuery(newInput);
        }
      },
      deep: true
    }
  },
  methods: {
    displayChanged(event) {
      const selectedValue = event.target.value;
      this.input.yAxes = this.input.yAxes.map(axis => {
        if (axis.type === "buckets") {
          return { ...axis, column: selectedValue };
        }
        return axis;
      });
      this.fetchQuery(this.input);
    },

    async fetchQuery(input) {
      if (!input) return
      
      try {
        const res = await fetch(`${document.location.protocol}//${document.location.hostname}:3002/dashboard/query`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify(input)
          })

        if (res.ok) {
          this.results = await res.json()
          this.lastInput = input
        } else {
          this.errors = await res.text()
        }
      } catch (error) {
        this.errors = error.message
      }
    },

    async fetchSingleQuery(input) {
      if (!input) return
      
      try {
        const res = await fetch(`${document.location.protocol}//${document.location.hostname}:3002/dashboard/single`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify(input)
          })

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        this.results = await res.json()
      } catch (error) {
        throw error
      }
    },

    showInExplorer() {
      router.push({
        name: 'Explorer',
        params: { initialInput: this.lastInput }
      })
    },

    runClicked(runId) {
      this.$router.push({
        path: `/single`,
        query: { runId: runId }
      })
    },

    async forceRerender() {
      this.isReloading = true
      try {
        if (this.single) {
          // For single run view, use fetchSingleQuery
          await this.fetchSingleQuery(this.single)
        } else if (this.input) {
          // For regular charts
          await this.fetchQuery(this.processedInput)
        }
      } catch (error) {
        console.error('Error reloading:', error)
        this.errors = error.message
      } finally {
        this.isReloading = false
      }
    }
  },
  props: {
    input: Object,
    single: Object,
    showDropdown: {
      type: Boolean,
      default: true
    }
  },
  setup() {
    const { excludeSnapshots } = useGlobalSnapshots()
    
    return {
      excludeSnapshots
    }
  },
  computed: {
    processedInput() {
      const input = { ...this.input }
      input.excludeSnapshots = this.excludeSnapshots
      return input
    }
  }
}
</script>

<style scoped>
.results-wrapper {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-secondary);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.small {
  width: 14px;
  height: 14px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-card {
  background: #fef2f2;
  border-radius: 8px;
  padding: 1rem;
}

.error-title {
  color: #dc2626;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.error-content {
  color: #ef4444;
  opacity: 0.8;
}

.chart-wrapper {
  background: #f9fafb;
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1rem 0;
}

.chart {
  max-height: 200px !important;
}

.chartLine {
  max-height: 600px !important;
}

.actions-bar {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
  flex-wrap: wrap;
  align-items: center;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: #f3f4f6;
  color: var(--text);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.active {
  background: #2563eb;
  color: #ffffff;
}

.select-control {
  background: #f3f4f6;
  border: none;
  color: var(--text);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.select-control:focus {
  background: #e5e7eb;
  outline: none;
}

.results-table-wrapper {
  margin-top: 1.5rem;
  overflow-x: auto;
  background: #ffffff;
  border-radius: 8px;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.results-table th {
  background: #f8fafc;
  padding: 0.75rem 1rem;
  text-align: left;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.results-table td {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

.results-table tr:hover {
  background: #f8fafc;
}

.results-table pre {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.run-link {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  color: #2563eb !important;
  text-decoration: none;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  background: #f1f5f9;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: inline-block;
}

.run-link:hover {
  text-decoration: none;
  background: #e2e8f0;
  transform: translateY(-1px);
}

.date-cell {
  color: var(--text-secondary) !important;
  font-size: 0.875rem;
}
</style>