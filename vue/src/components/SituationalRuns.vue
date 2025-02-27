<template>
  <b-container>
    <h2 class="mb-4">Situational Runs</h2>
    
    <div v-if="!results && !errors" class="text-center my-5">
      <b-spinner variant="primary" label="Spinning"></b-spinner>
      <p class="mt-2">Fetching data...</p>
    </div>

    <b-alert v-if="errors" show variant="danger">
      <h4 class="alert-heading">Error</h4>
      <p>{{errors}}</p>
    </b-alert>

    <div v-if="results">
      <b-card class="shadow-sm">
        <b-table 
          striped 
          hover 
          responsive 
          :items="results" 
          :fields="fields"
          class="text-left table-fixed"
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
      </b-card>
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
      display: false,
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

<style scoped>
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