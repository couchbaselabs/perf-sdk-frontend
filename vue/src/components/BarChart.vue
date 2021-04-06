<script>
import {Bar} from 'vue-chartjs'

export default {
  extends: Bar,
  mounted() {
    this.renderChart(this.chartdata, {
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: false
        }

      },
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: false
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