<script>
import {Line} from 'vue-chartjs'
import 'chartjs-adapter-luxon';

export default {
  extends: Line,
  mounted() {
    const x = {
      display: true,
      type: 'time',
      title: {
        display: true,
        text: 'Time'
      },
      time: {
        unit: 'second',
        // https://moment.github.io/luxon/docs/manual/formatting.html#table-of-tokens
        displayFormats: {
          second: 'mm:ss'
        }
      }
    }

    const y =
        {
          title: {
            display: true,
            text: 'Time'
          },
          ticks: {
            beginAtZero: true
          }
        }

    this.renderChart(this.chartdata, {
      legend: {
        display: true
      },
      title: {
        display: false
      },
      scales: {
        xAxes: [x],
        x: [x],
        y: [y],
        yAxes: [y]
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