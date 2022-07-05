<template>
  <div>
    <!-- Hack to force this to update when input changes.  Not sure if better way to achieve. -->
    <div style="display: none">
      {{ JSON.stringify(input) }}
    </div>

    <div v-if="results">
      <div v-for="panel in results.panels" :key="JSON.stringify(panel)">
        <!--        <h2>{{ panel.title }}</h2>-->

        <div class="graph" v-for="graph in panel.graphs" :key="JSON.stringify(graph)">
          <b-container>

            <!--                    <table>-->
            <!--                        <tr>-->
            <!--                            <td><strong>Cluster:</strong></td>-->
            <!--                            <td>{JSON.stringify(graph.chosen.cluster)}</td>-->
            <!--                        </tr>-->
            <!--                        <tr>-->
            <!--                            <td><strong>Workload:</strong></td>-->
            <!--                            <td>{JSON.stringify(graph.chosen.workload)}</td>-->
            <!--                        </tr>-->
            <!--                        <tr>-->
            <!--                            <td><strong>Vars:</strong></td>-->
            <!--                            <td>{JSON.stringify(graph.chosen.vars)}</td>-->
            <!--                        </tr>-->
            <!--                        <tr>-->
            <!--                            <td><strong>Impl:</strong></td>-->
            <!--                            <td>{JSON.stringify(graph.chosen.impl)}</td>-->
            <!--                        </tr>-->
            <!--                    </table>-->

            <!--              <Chart data={graph.data} type={graph.type}/>-->

            <BarChart v-if="graph.type === 'bar'" class="chart" :chartdata="graph.data" :options="graph.options"/>
            <div v-if="graph.type === 'line'">
              <LineChart class="chartLine" :chartdata="graph.data" :options="graph.options"/>
              <div>
                Time: All runs are shown starting from time '0' to allow them to be displayed together.  Tooltips show the wallclock time for each run.
              </div>
            </div>

          </b-container>

          <GraphRuns :graph="graph"/>

        </div>
      </div>
    </div>
  </div>
</template>

<script>
import BarChart from "./BarChart";
import LineChart from "./LineChart";
import GraphRuns from "./GraphRuns";

export default {
  name: "Results",
  components: {GraphRuns, BarChart,LineChart},
  data() {
    return {
      lastInput: undefined,
      results: undefined
    }
  },
  mounted() {
    this.fetchQuery(this.input)
  },
  updated() {
    // Need this component to refetch data when the `input` prop changes.  The approach used here doesn't seem slick
    // but is the only solution that worked.
    if (this.lastInput !== this.input) {
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
  },
  props: ['input']
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