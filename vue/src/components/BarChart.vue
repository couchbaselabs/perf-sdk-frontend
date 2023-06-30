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
      console.info(this.chartData)
      const idx = arr[0].index
      console.info(this.chartData.labels[idx])
      console.info(this.chartData.datasets[0].data[idx])
      const runIds = this.chartData.runIds[idx]
      if (runIds !== undefined) {
        console.info(Array.from(runIds))
        console.info(runIds)

        if (runIds.length === 1) {
          this.$router.push({
            path: `/single`,
            query: {
              runId: runIds[0]
            }
          })
        }
        else {
          this.$router.push({
            path: `/runs`,
            query: {
              runIds: Array.from(runIds)
            }
          })
        }
      }
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
