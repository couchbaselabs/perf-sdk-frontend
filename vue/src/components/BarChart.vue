<template>
  <Bar
      :options="chartOptions"
      :data="chartData"
  />
</template>

<script>
import {Bar} from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

export default {
  name: 'BarChart',
  components: { Bar },
  data() {
    return {
      chartOptions: {
        plugins: {
          legend: {
            display: false
          },
        },
        scales: {
          y: {
            title: {
              display: true,
              text: this.input?.yAxes[0]?.column ?? this.input?.yAxes[0]?.metric ?? "unknown",
            },
            ticks: {
              beginAtZero: true
            }
          }
        },
        onClick: this.barClicked,
        responsive: true,
        maintainAspectRatio: false
      }
    }
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
