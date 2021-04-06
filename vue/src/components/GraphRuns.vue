<template>
  <div>
    <a href="#" v-if="!display" v-on:click="display = true">
      Tests
    </a>

    <table v-if="display">
      <thead>
      <tr>
        <td>Run</td>
        <td>Display</td>
        <td>Impl</td>
        <td>Cluster</td>
        <td>Workload</td>
        <td>Vars</td>
      </tr>
      </thead>

      <tr v-for="r in graph.runs" :key="r.id">
        <td v-bind:style="{color: r.color}">{{ r.id.substring(0, 6) }}</td>
        <td>{{ r.groupedBy }}</td>
        <td><pre>{{ JSON.stringify(r.impl, null, 2) }}</pre></td>
        <td><pre>{{ JSON.stringify(r.cluster, null, 2) }}</pre></td>
        <td><pre>{{ JSON.stringify(r.workload, null, 2) }}</pre></td>
        <td><pre>{{ JSON.stringify(r.vars, null, 2) }}</pre></td>
      </tr>
      <!--            <p>{JSON.stringify(r)}</p>-->
      <!--                <p>{r.id}</p>-->
    </table>
  </div>
</template>

<script>
export default {
  name: 'GraphRuns',
  props: {
    graph: {}
  },
  data() {
    return {
      display: false
    }
  }
}
</script>

<style>
thead {
  font-weight: bold;
}

td {
  text-align: left;
}
</style>