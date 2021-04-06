<template>
  <div class="main">
    <div>
      <b-form inline class="vgap">
        <div class="border p-2">
          <div class="form-legend">Display</div>

          <b-form-select v-model="selected_group_by" v-on:change="handleGroupByChanged" class="mb-2 mr-sm-2 mb-sm-0">
            <option v-for="v in group_by" :key="v">{{ v }}</option>
          </b-form-select>

          <b-form-select v-model="selected_display" v-on:change="handleSubmit">
            <option v-for="v in display" :key="v.id">
              {{ v.text }}
            </option>
          </b-form-select>
        </div>
      </b-form>

      <b-form inline class="vgap-big">
        <b-form-group  class="border p-2 w-auto">
          <div class="form-legend">Filter</div>

          <b-form-select v-model="selected_cluster" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
            <option v-for="v in clusters" :key="v">{{ v }}</option>
          </b-form-select>

          <b-form-select v-model="selected_impl" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
            <option v-for="v in impls" :key="v">{{ v }}</option>
          </b-form-select>

          <b-form-select v-model="selected_workload" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
            <option v-for="v in workloads" :key="v">{{ v }}</option>
          </b-form-select>

          <b-form-select v-model="selected_vars" v-on:change="handleSubmit">
            <option v-for="v in vars" :key="v">{{ v }}</option>
          </b-form-select>
        </b-form-group>

        <!--        <button type=submit>-->
        <!--            Submit-->
        <!--        </button>-->
      </b-form>
    </div>
    <!--        {query_params}-->


    <!--    {#await fetching}-->
    <!--        <p>Loading...</p>-->
    <!--    {:then results}-->
    <!--        {results}-->
    <div v-if="results">
      <div v-for="panel in results.panels" :key="panel">
        <!--        <h2>{{ panel.title }}</h2>-->

        <div class="graph" v-for="graph in panel.graphs" :key="graph">
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

            <BarChart class="chart" :chartdata="graph.data" :options="graph.options"/>
          </b-container>
          <table>
            <tr v-for="r in graph.runs" :key="r">
              <td>{{ r.id }}</td>
              <!--                                <td>{r.grouping}</td>-->
              <td>{{ JSON.stringify(r.impl) }}</td>
              <td>{{ JSON.stringify(r.cluster) }}</td>
              <td>{{ JSON.stringify(r.workload) }}</td>
              <td>{{ JSON.stringify(r.vars) }}</td>
            </tr>
            <!--            <p>{JSON.stringify(r)}</p>-->
            <!--                <p>{r.id}</p>-->
          </table>

        </div>
      </div>
    </div>
  </div>
</template>

<script>
import BarChart from "@/components/BarChart";

export default {
  name: "Explorer",
  components: {BarChart},
  data() {
    const display = [
      {id: 6, text: `latency_average_us`},
      {id: 4, text: `latency_min_us`},
      {id: 5, text: `latency_max_us`},
      {id: 7, text: `latency_p50_us`},
      {id: 8, text: `latency_p95_us`},
      {id: 9, text: `latency_p99_us`},
      {id: 0, text: `transactions_total`},
      {id: 1, text: `transactions_success`},
      {id: 2, text: `transactions_failed`},
      {id: 3, text: `transactions_unstaging_incomplete`}
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
      selected_group_by: undefined,
      selected_vars: undefined,
      selected_display: display[0].text,
      fetching: undefined,
      query_params: undefined
    }
  },

  created() {
    this.fetch_group_by_options()
  },

  methods: {
    handleSubmit: function () {
      this.fetching = this.fetchQuery()
    },

    handleGroupByChanged: async function () {
      const url = new URL(`http://localhost:3002/dashboard/filtered`);
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
      const url = new URL(`http://localhost:3002/dashboard/group_by_options`);
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
        vars: JSON.parse(this.selected_vars)
      }

      console.info(input)

      // const url = new URL(`http://localhost:3002/dashboard/query`);
      const res = await fetch(`http://localhost:3002/dashboard/query`,
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