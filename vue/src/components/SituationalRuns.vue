<template>
  <b-container>
    <h2 class="mb-4">Situational Runs</h2>
    
    <div class="d-flex justify-content-end mb-4">
      <b-button variant="outline-secondary" @click="refreshData" :disabled="isLoading">
        <i class="bi bi-arrow-clockwise"></i> Refresh
      </b-button>
    </div>
    
    <transition name="fade" mode="out-in">
      <div v-if="isLoading" class="text-center my-5" key="loading">
        <b-spinner variant="primary" label="Spinning"></b-spinner>
        <p class="mt-2">Fetching data...</p>
      </div>

      <b-alert v-else-if="errors" show variant="danger" key="error">
        <h4 class="alert-heading">Error</h4>
        <p>{{errors}}</p>
      </b-alert>

      <div v-else-if="results" key="results">
        <b-card class="shadow-sm">
          <b-table 
            striped 
            hover 
            responsive 
            :items="results" 
            :fields="fields"
            class="text-left table-fixed"
            :per-page="perPage"
            :current-page="currentPage"
            id="situational-runs-table"
          >
            <template #cell(situationalRunId)="data">
              <a 
                href="#" 
                @click.prevent="situationalRunClicked(data.item.situationalRunId)"
                :style="{color: data.item.color}"
              >
                {{ data.item.situationalRunId }}
              </a>
            </template>
            
            <template #cell(score)="data">
              {{ data.item.score ?? "N/A" }}
            </template>
            
            <template #cell(language)="data">
              {{ data.item.detailsOfAnyRun?.impl?.language }}
            </template>
            
            <template #cell(version)="data">
              {{ data.item.detailsOfAnyRun?.impl?.version }}
            </template>
          </b-table>
          
          <div class="mt-3">
            <b-pagination
              v-model="currentPage"
              :total-rows="rows"
              :per-page="perPage"
              align="center"
              aria-controls="situational-runs-table"
            ></b-pagination>
          </div>
        </b-card>
      </div>
    </transition>
  </b-container>
</template>

<script>
export default {
  name: "SituationalRuns",
  data() {
    return {
      lastInput: undefined,
      results: undefined,
      errors: undefined,
      display: false,
      isLoading: false,
      perPage: 25,
      currentPage: 1,
      fields: [
        { key: 'situationalRunId', label: 'Situational Run', tdClass: 'col-width-20' },
        { key: 'started', label: 'Started', tdClass: 'col-width-20' },
        { key: 'score', label: 'Score', tdClass: 'col-width-15' },
        { key: 'numRuns', label: 'Runs', tdClass: 'col-width-15' },
        { key: 'language', label: 'SDK', tdClass: 'col-width-15' },
        { key: 'version', label: 'Version', tdClass: 'col-width-15' }
      ]
    }
  },
  computed: {
    rows() {
      return this.results ? this.results.length : 0;
    }
  },
  created() {
    this.loadData();
  },
  methods: {
    resetState() {
      // Clear state for a fresh start
      this.results = undefined;
      this.errors = undefined;
    },
    
    refreshData() {
      // Manually trigger a refresh
      this.resetState();
      this.loadData();
    },
    
    loadData() {
      this.isLoading = true;
      this.fetchQuery()
        .finally(() => {
          this.isLoading = false;
        });
    },
    
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
        
        return res;
    },

    situationalRunClicked: function (situationalRunId) {
      console.info("Navigating to situational run:", situationalRunId);
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

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

.b-table {
  font-size: 0.95rem;
  width: 100%;
}

.table-fixed {
  table-layout: fixed;
}

.col-width-20 {
  width: 20%;
}

.col-width-15 {
  width: 15%;
}
</style> 