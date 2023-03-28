<template>
  <Line
      :options="chartOptions"
      :data="chartData"
  />
</template>

<script>
import {Bar, Line} from 'vue-chartjs'
import 'chartjs-adapter-luxon';
import 'chart.js/auto'

export default {
  name: 'LineChart',
  components: {Line},
  data() {
    return {
      chartOptions: {
        plugins: {
          legend: {
            display: true,
            position: "right"
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                console.info(context)
                const x = context.dataset.data[context.dataIndex];
                if (x.tooltip) {
                  return x.tooltip
                }
                return `${x.nested?.datetime}   seconds since start=${x.x}   value=${x.y}   runid=${x.nested?.runid}`;
              }
            }
          },
        },
        scales: {
          x: {
            display: true,
            type: 'linear',
            title: {
              display: true,
              text: 'Time'
            },
            scaleLabel: {
              display: true,
              labelString: 'Time',
            },
            ticks: {
              callback: function (value) {
                const minutes = Math.floor(value / 60);
                const seconds = Math.floor(value - (minutes * 60));
                console.info(`${value} ${minutes} ${seconds} ${toString(minutes)}`);
                return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
              }
            }
          },
          left: {
            id: "left",
            position: "left",
            scaleLabel: {
              display: true,
              labelString: (this.input?.yAxes[0]?.column) ?? "unknown",
            },
            title: {
              display: true
            },
            ticks: {
              beginAtZero: true
            }
          },
          right: {
            id: "right",
            position: "right",
            scaleLabel: {
              display: true,
            },
            title: {
              display: true
            },
            ticks: {
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
