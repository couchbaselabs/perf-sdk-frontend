<template>
  <div>
    <!-- Hack to force this to redisplay when input changes.  Not sure if better way to achieve. -->
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
            <LineChart v-if="graph.type === 'line'" class="chart" :chartdata="graph.data" :options="graph.options"/>

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
//import {Input} from "../input";

export default {
  name: "Results",
  components: {GraphRuns, BarChart,LineChart},
  data() {
    return {
      results: undefined
    }
  },
  mounted() { console.log(`Results mounted`) },
  beforeUpdate() { console.log(`Results beforeUpdate`) },
  updated() {
    console.log(`Results updated`)
    this.fetchQuery(this.input)
  },
  created() {
    console.log(`Results created`);
    this.fetchQuery(this.input);
  },
  methods: {
    fetchQuery: async function (input) {
      if (input !== undefined) {
        console.info("Fetching...")
        console.info(input)

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
</style>