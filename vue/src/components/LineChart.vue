<script>
import {Line} from 'vue-chartjs'
import 'chartjs-adapter-luxon';

export default {
  extends: Line,
  mounted() {
    const x = {
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
        callback: function(value) {
          const minutes = Math.floor(value / 60);
          const seconds = Math.floor(value - (minutes * 60));
          console.info(`${value} ${minutes} ${seconds} ${toString(minutes)}`);
          return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
      }
    }

    const yAxisLeft =
        {
          id: "left",
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
        }

    const yAxisRight =
        {
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

    this.renderChart(this.chartdata, {
      legend: {
        display: true,
        position: "right"
      },
      title: {
        display: false
      },
      tooltips: {
        callbacks: {
          label: function(tooltipItem, data) {
            const x = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
            if (x.tooltip) {
              return x.tooltip
            }
            return `${x.nested.datetime}   seconds since start=${x.x}   value=${x.y}   runid=${x.nested.runid}`;
          }
        }
      },
      scales: {
        xAxes: [x],
        yAxes: [yAxisLeft, yAxisRight]
      },
      responsive: true,
      maintainAspectRatio: false
    })
  },
  props: {
    input: {
      type: Object
    },
    chartdata: {
      type: Object,
      default: null
    },
  }
}
</script>

<style scoped>

</style>