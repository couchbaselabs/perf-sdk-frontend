<template>
  <div class="main">
    <div>
      graph start
      <MyLineChart class="chart" />
      graph end
    </div>


<!--    <div>-->
<!--      <b-form inline class="vgap">-->
<!--        <div class="border p-2">-->
<!--          <div class="form-legend">Display</div>-->

<!--          <b-form-select v-model="selected_group_by" v-on:change="handleGroupByChanged" class="mb-2 mr-sm-2 mb-sm-0">-->
<!--            <option v-for="v in group_by" :key="JSON.stringify(v)">{{ v }}</option>-->
<!--          </b-form-select>-->

<!--          <b-form-select v-model="selected_display" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">-->
<!--            <option v-for="v in display" :key="v.id">-->
<!--              {{ v.text }}-->
<!--            </option>-->
<!--          </b-form-select>-->

<!--          <b-form-select v-model="selected_graph_type" v-on:change="handleSubmit">-->
<!--            <option>Simplified</option>-->
<!--            <option>Full</option>-->
<!--          </b-form-select>-->

<!--          <b-form-select v-model="selected_grouping_type" v-on:change="handleSubmit">-->
<!--            <option>Side-by-side</option>-->
<!--            <option>Average</option>-->
<!--          </b-form-select>-->
<!--        </div>-->
<!--      </b-form>-->

<!--      <b-form inline class="vgap-big">-->
<!--        <b-form-group  class="border p-2 w-auto">-->
<!--          <div class="form-legend">Filter</div>-->

<!--          <b-form-select v-model="selected_cluster" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">-->
<!--            <option v-for="v in clusters" :key="JSON.stringify(v)">{{ v }}</option>-->
<!--          </b-form-select>-->

<!--          <b-form-select v-model="selected_impl" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">-->
<!--            <option v-for="v in impls" :key="JSON.stringify(v)">{{ v }}</option>-->
<!--          </b-form-select>-->

<!--          <b-form-select v-model="selected_workload" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">-->
<!--            <option v-for="v in workloads" :key="JSON.stringify(v)">{{ v }}</option>-->
<!--          </b-form-select>-->

<!--          <b-form-select v-model="selected_vars" v-on:change="handleSubmit">-->
<!--            <option v-for="v in vars" :key="JSON.stringify(v)">{{ v }}</option>-->
<!--          </b-form-select>-->
<!--        </b-form-group>-->

<!--        &lt;!&ndash;        <button type=submit>&ndash;&gt;-->
<!--        &lt;!&ndash;            Submit&ndash;&gt;-->
<!--        &lt;!&ndash;        </button>&ndash;&gt;-->
<!--      </b-form>-->
<!--    </div>-->
<!--    &lt;!&ndash;        {query_params}&ndash;&gt;-->


<!--    &lt;!&ndash;    {#await fetching}&ndash;&gt;-->
<!--    &lt;!&ndash;        <p>Loading...</p>&ndash;&gt;-->
<!--    &lt;!&ndash;    {:then results}&ndash;&gt;-->
<!--    &lt;!&ndash;        {results}&ndash;&gt;-->
<!--    <div v-if="results">-->
<!--      <div v-for="panel in results.panels" :key="JSON.stringify(panel)">-->
<!--        &lt;!&ndash;        <h2>{{ panel.title }}</h2>&ndash;&gt;-->

<!--        <div class="graph" v-for="graph in panel.graphs" :key="JSON.stringify(graph)">-->
<!--          <b-container>-->

<!--            &lt;!&ndash;                    <table>&ndash;&gt;-->
<!--            &lt;!&ndash;                        <tr>&ndash;&gt;-->
<!--            &lt;!&ndash;                            <td><strong>Cluster:</strong></td>&ndash;&gt;-->
<!--            &lt;!&ndash;                            <td>{JSON.stringify(graph.chosen.cluster)}</td>&ndash;&gt;-->
<!--            &lt;!&ndash;                        </tr>&ndash;&gt;-->
<!--            &lt;!&ndash;                        <tr>&ndash;&gt;-->
<!--            &lt;!&ndash;                            <td><strong>Workload:</strong></td>&ndash;&gt;-->
<!--            &lt;!&ndash;                            <td>{JSON.stringify(graph.chosen.workload)}</td>&ndash;&gt;-->
<!--            &lt;!&ndash;                        </tr>&ndash;&gt;-->
<!--            &lt;!&ndash;                        <tr>&ndash;&gt;-->
<!--            &lt;!&ndash;                            <td><strong>Vars:</strong></td>&ndash;&gt;-->
<!--            &lt;!&ndash;                            <td>{JSON.stringify(graph.chosen.vars)}</td>&ndash;&gt;-->
<!--            &lt;!&ndash;                        </tr>&ndash;&gt;-->
<!--            &lt;!&ndash;                        <tr>&ndash;&gt;-->
<!--            &lt;!&ndash;                            <td><strong>Impl:</strong></td>&ndash;&gt;-->
<!--            &lt;!&ndash;                            <td>{JSON.stringify(graph.chosen.impl)}</td>&ndash;&gt;-->
<!--            &lt;!&ndash;                        </tr>&ndash;&gt;-->
<!--            &lt;!&ndash;                    </table>&ndash;&gt;-->

<!--            &lt;!&ndash;              <Chart data={graph.data} type={graph.type}/>&ndash;&gt;-->

<!--            <BarChart v-if="graph.type === 'barGraph'" class="chart" :chartData="graph.data" :options="graph.options"  />-->
<!--&lt;!&ndash;            <LineChart v-if="graph.type === 'lineGraph'" class="chart" :chartData="graph.data" :options="graph.options"  />&ndash;&gt;-->
<!--&lt;!&ndash;            <MyLineChart v-if="graph.type === 'lineGraph'" class="chart"  :options="graph.options"  />&ndash;&gt;-->


<!--          </b-container>-->

<!--          <GraphRuns :graph="graph"/>-->

<!--        </div>-->
<!--      </div>-->
<!--    </div>-->
  </div>
</template>

<script>
// import BarChart from "@/components/BarChart";
import MyLineChart from "@/components/MyLineChart";
// import GraphRuns from "@/components/GraphRuns";

export default {
  name: "Explorer",
  // components: {GraphRuns, BarChart, MyLineChart},
  components: {MyLineChart},
  data() {
    const display = [
      {id: 6, text: `duration_average_us`},
      {id: 4, text: `duration_min_us`},
      {id: 5, text: `duration_max_us`},
      {id: 7, text: `duration_p50_us`},
      {id: 8, text: `duration_p95_us`},
      {id: 9, text: `duration_p99_us`},
      {id: 0, text: `operations_total`},
      {id: 1, text: `operations_success`},
      {id: 2, text: `operations_failed`}
    ];

    return {
      display: display,
      initial: ['Loading...'],
      group_by: this.initial,
      clusters: this.initial,
      workloads: this.initial,
      impls: this.initial,
      vars: this.initial,
      results: undefined,
      selected_workload: undefined,
      selected_impl: undefined,
      selected_cluster: undefined,
      selected_group_by: "impl.version",
      selected_vars: undefined,
      selected_display: display[0].text,
      selected_graph_type: "Full",
      selected_grouping_type: "Side-by-side",
      fetching: undefined,
      query_params: undefined
    }
  },

  // created() {
  //   this.fetch_group_by_options()
  //       .then(() => this.handleGroupByChanged())
  // },

  methods: {
    handleSubmit: function () {
      this.fetching = this.fetchQuery()
    },

    handleGroupByChanged: async function () {
      const url = new URL(`http://${document.location.hostname}:3002/dashboard/filtered`);
      url.searchParams.append("group_by", this.selected_group_by);
      const res = await fetch(url);
      const json = await res.json();
      this.clusters = json.clusters;
      this.workloads = json.workloads;
      this.impls = json.impls;
      this.vars = json.vars;
      this.selected_cluster = this.clusters[0]
      this.selected_workload = this.workloads[0]
      this.selected_impl = this.impls[0]
      this.selected_vars = this.vars[0]
      this.handleSubmit()
    },

    fetch_group_by_options: async function () {
      const url = new URL(`http://${document.location.hostname}:3002/dashboard/group_by_options`);
      const res = await fetch(url);
      this.group_by = await res.json();
    },

    fetchQuery: async function () {
      console.info(this.selected_cluster)
      console.info(this.selected_workload)
      console.info(this.selected_impl)
      console.info(this.selected_vars)
      console.info(JSON.parse(this.selected_cluster))
      console.info(JSON.parse(this.selected_workload))
      console.info(JSON.parse(this.selected_impl))
      console.info(JSON.parse(this.selected_vars))

      const input = {
        inputs: [{
          viewing: 'cluster',
          params: [JSON.parse(this.selected_cluster)]
        }],
        group_by: this.selected_group_by,
        display: this.selected_display,
        impl: JSON.parse(this.selected_impl),
        workload: JSON.parse(this.selected_workload),
        vars: JSON.parse(this.selected_vars),
        graph_type: this.selected_graph_type,
        grouping_type: this.selected_grouping_type
      }

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

      // url.searchParams.append("query", input);
      // url.searchParams.append("group_by", group_by);
      // url.searchParams.append("display", display);
      // const res = await fetch(url);
      // const text: Array<Out> = await res.json();
      this.results = await res.json();
    }
  }
}
</script>

<style scoped>
.chart {
  height: 200px !important;
}

.form-legend {
  text-align: left;
  font-weight: bold;
}

.vgap {
  margin-bottom: 1rem;
}

.vgap-big {
  margin-bottom: 3rem;
}

.main {
  padding: 1rem
}

/*fieldset {*/
/*  display: flex;*/
/*  flex-flow: row wrap;*/
/*  align-items: center;*/

/*}*/
</style>