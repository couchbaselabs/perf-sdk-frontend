<template>
  <Bar :chart-data="chartData" :chart-options="chartOptions" />
</template>


<script>
import {Bar} from 'vue-chartjs'

export default {
  name: 'MyBarChart',
  components: { Bar },
  data() {
    return {
      chartOptions: {
        plugins: {
          legend: {
            display: false
          }
        },
        title: {
          display: false
        },
        scales: {
          y: {
            title: {
              display: true,
              text: 'Per 1 second bucket'
            },
            ticks: {
              // CBD-4962: showfast-style seems better as otherwise tiny perf differences get overly magnified.
              beginAtZero: true
            }
          }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    }
  },
  props: {
    chartData: {
      type: Object,
      required: true
    }
  }
}
</script>

<style scoped>

</style>