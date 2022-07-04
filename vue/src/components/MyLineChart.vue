<template>
  <Line :chart-data="chartData" :chart-options="chartOptions" />
</template>

<script>
import {Line} from 'vue-chartjs'
// import 'chartjs-adapter-luxon';
// import zoom from 'chartjs-plugin-zoom';


export default {
  name: 'MyLineChart',
  components: { Line },
  data() {
    // this.addPlugin(zoom);

    return {
      chartOptions: {
        plugins: {
          legend: {
            display: true
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

        // scales: {
        //   x: {
        // //   //   display: true,
        // //   //   // type: 'time',
        // //   //   title: {
        // //   //     display: true,

        // //   //     text: 'Time'
        // //   //   },
        // //   //   time: {
        // //   //     unit: 'second',
        // //   //     // https://moment.github.io/luxon/docs/manual/formatting.html#table-of-tokens
        // //   //     displayFormats: {
        // //   //       second: 'mm:ss'
        // //   //     }
        // //   //   }
        //   },
        //   y: {
        // //   //   title: {
        // //   //     display: true,
        // //   //     text: 'Time'
        // //   //   },
        // //   //   ticks: {
        // //   //     beginAtZero: true
        // //   //   }
        //   },
        // },
        // width:  "400px",
        // height: "400px"
        responsive: true,
        maintainAspectRatio: false
        // plugins: {
        //   zoom: {
        //     zoom: {
        //       wheel: {
        //         enabled: true,
        //       },
        //       pinch: {
        //         enabled: true
        //       },
        //       mode: 'xy',
        //     }
        //   }
        // }
      },

      chartData: {
        labels: ["week 1", "week 2", "week 3", "week 4", "week 5", "week 6", "week 7", "week 8", "week 9", "week 10"],
        datasets: [
          {
            data: [86, 114, 106, 106, 107, 111, 133, 221, 783, 2478],
            label: "Africa",
            borderColor: "#3e95cd",
            fill: false
          },
          {
            data: [282, 350, 411, 502, 635, 809, 947, 1402, 3700, 5267],
            label: "Asia",
            borderColor: "#8e5ea2",
            fill: false
          },
          {
            data: [168, 170, 178, 190, 203, 276, 408, 547, 675, 734],
            label: "Europe",
            borderColor: "#3cba9f",
            fill: false
          },
          {
            data: [40, 20, 10, 16, 24, 38, 74, 167, 508, 784],
            label: "Latin America",
            borderColor: "#e8c3b9",
            fill: false
          },
          {
            data: [6, 3, 2, 2, 7, 26, 82, 172, 312, 433],
            label: "North America",
            borderColor: "#c45850",
            fill: false
          }
        ]

        // labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
        // datasets: [
        //   {
        //     label: 'Data One',
        //     backgroundColor: '#f87979',
        //     data: [40, 39, 10, 40, 39, 80, 40]
        //   }
        // ]
      }


    }
  }
  // props: {
  //   width: {
  //     type: Number,
  //     default: 400
  //   },
  //   height: {
  //     type: Number,
  //     default: 400
  //   }
  //
  //   // chartData: {
  //   //   type: Object,
  //   //   required: true
  //   // },
  //   // options: {
  //   //   type: Object,
  //   //   // default:
  //   // }
  // }
}
</script>

<style scoped>

</style>