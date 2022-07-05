<template>
  <b-container>
    <b-row>
      <b-col>
        <b-form>
          <div class="form-legend">Display configuration:</div>

          <b-form-group label="Display" id="input-group-1" label-for="input-1"
                        description="What field to categorise the data into (e.g. the x-axis on the Simplified graph).  The backend introspects the database JSON and displays all options - not all will be valid.">
            <b-form-select id="input-1" v-model="selected_group_by" v-on:change="handleGroupByChanged">
              <option v-for="v in group_by" :key="JSON.stringify(v)">{{ v }}</option>
            </b-form-select>
          </b-form-group>

          <b-form-group label="Field"
                        description="What value to display on the y-axis.">
            <b-form-select v-model="selected_display" v-on:change="handleSubmit">
              <option v-for="v in display" :key="v.id">
                {{ v.text }}
              </option>
            </b-form-select>
          </b-form-group>

          <b-container>
            <b-row>
              <b-col class="pl-0">
                <b-form-group label="Graph type" description="Showfast-style bar graphs, or over-time line graphs.">
                  <b-form-select v-model="selected_graph_type" v-on:change="handleSubmit">
                    <option>Simplified</option>
                    <option>Full</option>
                  </b-form-select>
                </b-form-group>
              </b-col>

              <b-col class="pr-0">
                <b-form-group label="Duplicate handling"
                              description="When duplicate runs exist, how to display them.">
                  <b-form-select v-model="selected_grouping_type" v-on:change="handleSubmit">
                    <option>Side-by-side</option>
                    <option>Average</option>
                  </b-form-select>
                </b-form-group>
              </b-col>
            </b-row>
          </b-container>
        </b-form>
      </b-col>

      <b-col>
        <b-form>
          <div class="form-legend">Show runs matching all of these:</div>

          <b-form-group label="Cluster">
            <b-form-select v-model="selected_cluster" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
              <option v-for="v in clusters" :key="JSON.stringify(v)">{{ v }}</option>
            </b-form-select>
          </b-form-group>

          <b-form-group label="Implementation">
            <b-form-select v-model="selected_impl" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
              <option v-for="v in impls" :key="JSON.stringify(v)">{{ v }}</option>
            </b-form-select>
          </b-form-group>

          <b-form-group label="Workload">
            <b-form-select v-model="selected_workload" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
              <option v-for="v in workloads" :key="JSON.stringify(v)">{{ v }}</option>
            </b-form-select>
          </b-form-group>

          <b-form-group label="Variables">
            <b-form-select v-model="selected_vars" v-on:change="handleSubmit">
              <option v-for="v in vars" :key="JSON.stringify(v)">{{ v }}</option>
            </b-form-select>
          </b-form-group>

          <!--        <button type=submit>-->
          <!--            Submit-->
          <!--        </button>-->
        </b-form>
      </b-col>
    </b-row>

    <div v-if="input">
      <Results :input="input"/>

      <div class="jumbotron">
        {{ JSON.stringify(input) }}
      </div>
    </div>

  </b-container>
</template>

<script>


import Results from "@/components/Results";

export default {
  name: "Explorer",
  components: {Results},
  props: ['initialInput'],
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
      input: this.initialInput
    }
  },

  created() {
    if (this.initialInput) {
      this.selected_cluster = JSON.stringify(this.initialInput.inputs[0].params[0]);
      this.selected_workload = JSON.stringify(this.initialInput.workload);
      this.selected_impl = JSON.stringify(this.initialInput.impl);
      this.selected_vars = JSON.stringify(this.initialInput.vars);
      this.selected_display = this.initialInput.display;
      this.selected_group_by = this.initialInput.group_by;
      this.selected_graph_type = this.initialInput.graph_type;
      this.selected_grouping_type = this.initialInput.grouping_type;
    }

    this.fetch_group_by_options()
        .then(() => {
          this.handleGroupByChanged()
        })
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
      if (!this.initialInput) {
        this.selected_cluster = this.clusters[0]
        this.selected_workload = this.workloads[0]
        this.selected_impl = this.impls[0]
        this.selected_vars = this.vars[0]
      }
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
  margin-bottom: 1rem;
}

</style>