<template>
  <b-container>
    <ul>
      <li v-for="r in runIds" :key="r">
        <a href="#" v-on:click="runClicked(r)">
          {{ r }}
        </a>
      </li>
    </ul>
  </b-container>
</template>

<script>

export default {
  name: "Runs",
  methods: {
    runClicked: function (runId) {
      this.$router.push({
        path: `/single`,
        query: {
          runId: runId
        }
      })
    }
  },
  data() {
    return {
      runIds: this.$route.query.runIds
    }
  }
}
</script>
