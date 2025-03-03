<template>
  <b-container>
    <transition name="fade" mode="out-in">
      <div v-if="isLoading" class="text-center py-5" :key="'loading'">
        <div class="loading-indicator">
          <b-spinner small variant="primary" class="opacity-50"></b-spinner>
        </div>
      </div>
      
      <div v-else-if="errors" :key="'error'">
        <b-card bg-variant="danger" text-variant="white" title="Error">
          <b-card-text>
            {{errors}}
          </b-card-text>
        </b-card>
      </div>

      <div v-else-if="results" :key="'results'">
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
    </transition>
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
      display: false,
      isLoading: false
    }
  },
  created() {
    this.loadData();
  },
  watch: {
    '$route': {
      handler() {
        this.loadData();
      },
      immediate: true
    }
  },
  methods: {
    loadData() {
      if (this.$route.query.situationalRunId) {
        this.isLoading = true;
        this.results = undefined;
        this.errors = undefined;
        
        setTimeout(() => {
          this.fetchQuery(this.$route.query.situationalRunId)
            .finally(() => {
              this.isLoading = false;
            });
        }, 50);
      }
    },
    fetchQuery: async function (situationalRunId) {
        const res = await fetch(`${document.location.protocol}//${document.location.hostname}:3002/dashboard/situationalRun`,
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
        return res;
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

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

.loading-indicator {
  opacity: 0.6;
}
</style>
