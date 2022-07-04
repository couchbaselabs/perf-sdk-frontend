<script>
import {Bar} from 'vue-chartjs'

export default {
  extends: Bar,
  mounted() {
    this.renderChart(this.chartdata, {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      scales: {
        yAxes: [
          {
            title: {
              display: true,
              text: 'Per second'
            },
            ticks: {
              beginAtZero: true
            }
          }]
      },
      responsive: true,
      maintainAspectRatio: false
    })
  },
  props: {
    chartdata: {
      type: Object,
      default: null
    },
    // options: {
    //   type: Object,
    //   // default:
    // }
  }
}
</script>

<style scoped>

</style>