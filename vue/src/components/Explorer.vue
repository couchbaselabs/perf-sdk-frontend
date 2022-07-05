<template>
  <div class="main">
    <div>
      <b-form inline class="vgap">
        <div class="border p-2">
          <div class="form-legend">Display</div>

          <b-form-select v-model="selected_group_by" v-on:change="handleGroupByChanged" class="mb-2 mr-sm-2 mb-sm-0">
            <option v-for="v in group_by" :key="JSON.stringify(v)">{{ v }}</option>
          </b-form-select>

          <b-form-select v-model="selected_display" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
            <option v-for="v in display" :key="v.id">
              {{ v.text }}
            </option>
          </b-form-select>

          <b-form-select v-model="selected_graph_type" v-on:change="handleSubmit">
            <option>Simplified</option>
            <option>Full</option>
          </b-form-select>

          <b-form-select v-model="selected_grouping_type" v-on:change="handleSubmit">
            <option>Side-by-side</option>
            <option>Average</option>
          </b-form-select>
        </div>
      </b-form>

      <b-form inline class="vgap-big">
        <b-form-group  class="border p-2 w-auto">
          <div class="form-legend">Filter</div>

          <b-form-select v-model="selected_cluster" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
            <option v-for="v in clusters" :key="JSON.stringify(v)">{{ v }}</option>
          </b-form-select>

          <b-form-select v-model="selected_impl" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
            <option v-for="v in impls" :key="JSON.stringify(v)">{{ v }}</option>
          </b-form-select>

          <b-form-select v-model="selected_workload" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
            <option v-for="v in workloads" :key="JSON.stringify(v)">{{ v }}</option>
          </b-form-select>

          <b-form-select v-model="selected_vars" v-on:change="handleSubmit">
            <option v-for="v in vars" :key="JSON.stringify(v)">{{ v }}</option>
          </b-form-select>
        </b-form-group>

        <!--        <button type=submit>-->
        <!--            Submit-->
        <!--        </button>-->
      </b-form>
    </div>
    <!--        {query_params}-->


    <div v-if="input">
      <div class="jumbotron">
      {{JSON.stringify(input)}}
      </div>

      <Results :input="input"/>
    </div>

    <!--    {#await fetching}-->
    <!--        <p>Loading...</p>-->
    <!--    {:then results}-->
    <!--        {results}-->
  </div>
</template>

<script>


import Results from "@/components/Results";
export default {
  name: "Explorer",
  components: {Results},
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
      selected_graph_type: "Simplified",
      selected_grouping_type: "Side-by-side",
      fetching: undefined,
      query_params: undefined,
      input: undefined
    }
  },

  created() {
    this.fetch_group_by_options()
        .then(() => this.handleGroupByChanged())
  },

  methods: {
    handleSubmit: function () {
      console.info("handle submit");

      this.input = {
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
      await this.handleSubmit()
    },

    fetch_group_by_options: async function () {
      const url = new URL(`http://${document.location.hostname}:3002/dashboard/group_by_options`);
      const res = await fetch(url);
      this.group_by = await res.json();
    }
  }
}
</script>

<style scoped>

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

</style>