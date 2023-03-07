<template>
  <b-container>
    <b-row>
      <b-col>
        <b-form>
          <div class="form-legend">Display configuration:</div>

          <b-form-group label="Display" id="input-group-1" label-for="input-1"
                        description="What field to categorise the data into (e.g. the x-axis on the Simplified graph).  The backend introspects the database JSON and displays all options - not all will be valid.">
            <b-form-select id="input-1" v-model="selectedHAxis" v-on:change="handleGroupByChanged">
              <option v-for="v in groupBy" :key="JSON.stringify(v)">{{ v }}</option>
            </b-form-select>
          </b-form-group>

          <b-form-group label="Field"
                        description="What value to display on the y-axis.">
            <b-form-select v-model="selectedDisplay" v-on:change="handleSubmit">
              <option v-for="v in display" :key="v.id">
                {{ v.text }}
              </option>
            </b-form-select>
          </b-form-group>

          <b-container>
            <b-row>
              <b-col class="pl-0">
                <b-form-group label="Graph type" description="Showfast-style bar graphs, or over-time line graphs.">
                  <b-form-select v-model="selectedGraphType" v-on:change="handleSubmit">
                    <option>Simplified</option>
                    <option>Full</option>
                  </b-form-select>
                </b-form-group>
              </b-col>

              <b-col class="pr-0">
                <b-form-group label="Duplicate handling"
                              description="When duplicate runs exist, how to display them.">
                  <b-form-select v-model="selectedMultipleResultsHandling" v-on:change="handleSubmit">
                    <option>Side-by-side</option>
                    <option>Average</option>
                  </b-form-select>
                </b-form-group>
              </b-col>
            </b-row>
          </b-container>

          <b-container>
            <b-row>
              <b-col class="pl-0">
                <b-form-group label="Trim from start"
                              description="How much data to trim from the start to account for warmup, in seconds.">
                  <b-form-input v-model="selectedTrimmingSeconds" v-on:blur="handleSubmit"/>
                </b-form-group>
              </b-col>

              <b-col class="pr-0">
                <b-form-group label="Bucketise data"
                              description="Can re-bucketise the data into X second buckets to make it cheaper to render.  Will use Merging setting.  0 disables.">
                  <b-form-input v-model="selectedBucketiseSeconds" v-on:blur="handleSubmit"/>
                </b-form-group>
              </b-col>
            </b-row>
          </b-container>


          <b-container>
            <b-row>
              <b-col class="pl-0">
                <b-form-group label="Merging"
                              description="How to merge bucket results in Simplified view.">
                  <b-form-select v-model="selectedMergingType" v-on:change="handleSubmit">
                    <option>Average</option>
                    <option>Maximum</option>
                    <option>Minimum</option>
                    <option>Sum</option>
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
            <b-form-select v-model="selectedCluster" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
              <option v-for="v in clusters" :key="JSON.stringify(v)">{{ v }}</option>
            </b-form-select>
          </b-form-group>

          <b-form-group label="Implementation">
            <b-form-select v-model="selectedImpl" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
              <option v-for="v in impls" :key="JSON.stringify(v)">{{ v }}</option>
            </b-form-select>
          </b-form-group>

          <b-form-group label="Workload">
            <b-form-select v-model="selectedWorkload" v-on:change="handleSubmit" class="mb-2 mr-sm-2 mb-sm-0">
              <option v-for="v in workloads" :key="JSON.stringify(v)">{{ v }}</option>
            </b-form-select>
          </b-form-group>

          <b-form-group label="Variables">
            <b-form-select v-model="selectedVars" v-on:change="handleSubmit">
              <option v-for="v in vars" :key="JSON.stringify(v)">{{ v }}</option>
            </b-form-select>
          </b-form-group>

          <b-form-group label="Versions">
            <b-form-checkbox v-model="excludeSnapshots" v-on:change="handleSubmit">
              Exclude snapshots
            </b-form-checkbox>
            <b-form-checkbox v-model="excludeGerrit" v-on:change="handleSubmit">
              Exclude Gerrit builds
            </b-form-checkbox>
          </b-form-group>
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
import {hAxisSdkVersion} from "./Shared";

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
      groupBy: this.initial,
      clusters: this.initial,
      workloads: this.initial,
      impls: this.initial,
      vars: this.initial,
      results: undefined,
      selectedWorkload: undefined,
      selectedImpl: undefined,
      selectedCluster: undefined,
      selectedHAxis: hAxisSdkVersion,
      selectedVars: undefined,
      selectedDisplay: display[0].text,
      selectedGraphType: "Simplified",
      selectedMultipleResultsHandling: "Side-by-side",
      selectedMergingType: "Average",
      selectedTrimmingSeconds: 20,
      selectedBucketiseSeconds: 0,
      fetching: undefined,
      queryParams: undefined,
      input: this.initialInput,
      excludeGerrit: false,
      excludeSnapshots: false,
    }
  },

  created() {
    if (this.initialInput) {
      this.selectedCluster = JSON.stringify(this.initialInput.cluster);
      this.selectedWorkload = JSON.stringify(this.initialInput.workload);
      this.selectedImpl = JSON.stringify(this.initialInput.impl);
      this.selectedVars = JSON.stringify(this.initialInput.vars);
      this.selectedDisplay = this.initialInput.display;
      this.selectedHAxis = this.initialInput.groupBy;
      this.selectedGraphType = this.initialInput.graphType;
      this.selectedMultipleResultsHandling = this.initialInput.multipleResultsHandling;
      this.selectedMergingType = this.initialInput.mergingType;
      this.selectedTrimmingSeconds = this.initialInput.trimmingSeconds | 0;
      this.selectedBucketiseSeconds = this.initialInput.selectedBucketiseSeconds | 0;
    }

    this.fetchGroupByOptions()
        .then(() => {
          this.handleGroupByChanged()
        })
  },

  methods: {

    handleSubmit: function () {
      console.info("handle submit");

      this.input = {
        groupBy: this.selectedHAxis,
        display: this.selectedDisplay,
        compare: {
          cluster: JSON.parse(this.selectedCluster),
          impl: JSON.parse(this.selectedImpl),
          workload: JSON.parse(this.selectedWorkload),
          vars: JSON.parse(this.selectedVars)
        },
        graphType: this.selectedGraphType,
        multipleResultsHandling: this.selectedMultipleResultsHandling,
        mergingType: this.selectedMergingType,
        trimmingSeconds: this.selectedTrimmingSeconds,
        bucketiseSeconds: this.selectedBucketiseSeconds,
        includeMetrics: false,
        excludeGerrit: this.excludeGerrit,
        excludeSnapshots: this.excludeSnapshots,
      }
    },

    handleGroupByChanged: async function () {
      const url = new URL(`http://${document.location.hostname}:3002/dashboard/filtered`);
      url.searchParams.append("hAxis", this.selectedHAxis);
      const res = await fetch(url);
      const json = await res.json();
      this.clusters = json.clusters;
      this.workloads = json.workloads;
      this.impls = json.impls;
      this.vars = json.vars;
      if (!this.initialInput) {
        this.selectedCluster = this.clusters[0]
        this.selectedWorkload = this.workloads[0]
        this.selectedImpl = this.impls[0]
        this.selectedVars = this.vars[0]
      }
      await this.handleSubmit()
    },

    fetchGroupByOptions: async function () {
      const url = new URL(`http://${document.location.hostname}:3002/dashboard/groupByOptions`);
      const res = await fetch(url);
      this.groupBy = await res.json();
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