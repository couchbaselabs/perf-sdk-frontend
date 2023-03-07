<script>
import {Bar} from 'vue-chartjs'

export default {
  extends: Bar,
  mounted() {
    this.renderChart(this.chartData, {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      scales: {
        yAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: this.input.yAxis.column,
            },
            ticks: {
              beginAtZero: true
            }
          }]
      },
      onClick: this.barClicked,
      responsive: true,
      maintainAspectRatio: false
    })
  },
  methods: {
    barClicked: function(event, arr) {
      console.info(event)
      console.info(arr)
      // With Charts 2.x, can get back to the data with arr[0]._chart.data.datasets[0].data
      // But, this data is just an array of numbers.  May need Charts 3.x to allow custom objects.
    }
  },
  props: {
    input: {
      type: Object
    },
    chartData: {
      type: Object,
      default: null
    },
  }
}
</script>

<style scoped>

</style>