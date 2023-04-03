<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <Line
            :options="chartOptions"
            :data="chartData"
            :plugins="[htmlLegendPlugin()]"
        />
      </b-col>
      <b-col sm="3">
        <div id="legend"></div>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import annotationPlugin from 'chartjs-plugin-annotation';
import {Bar, Line} from 'vue-chartjs'
import 'chartjs-adapter-luxon';
import Chart from "chart.js/auto";
import {BButton, BCol} from "bootstrap-vue-next";

Chart.register(annotationPlugin);


const getOrCreateLegendList = (chart, id) => {
  const legendContainer = document.getElementById(id);
  let listContainer = legendContainer.querySelector('table');

  if (!listContainer) {
    listContainer = document.createElement('table');
    legendContainer.appendChild(listContainer);
  }

  return listContainer;
};


export default {
  name: 'LineChart',
  components: {BCol, BButton, Line},
  data() {
    return {


      chartOptions: {
        plugins: {
          htmlLegend: {
            container: 'legend',
          },
          legend: {
            display: false,
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
          annotation: {
            annotations: this.chartData.annotations
          }
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
                //console.info(`${value} ${minutes} ${seconds} ${toString(minutes)}`);
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
  methods: {
    htmlLegendPluginInternal: function (ul, chart) {
      console.info("Updating legend")

      // Remove old legend items
      while (ul.firstChild) {
        ul.firstChild.remove();
      }

      // Reuse the built-in legendItems generator
      const items = chart.options.plugins.legend.labels.generateLabels(chart);

      items.forEach(item => {
        const tr = document.createElement('tr');
        const isVisible = chart.isDatasetVisible(item.datasetIndex);

        console.info(item)

        const textContainer = document.createElement('td');
        textContainer.style.color = item.strokeStyle;
        textContainer.style.textDecoration = item.hidden ? 'line-through' : '';

        const text = document.createTextNode(item.text);
        textContainer.appendChild(text);

        tr.appendChild(textContainer);

        const left = document.createElement('b-button');
        left.className = "btn btn-sm"
        left.textContent = "Left"
        left.onclick = () => {
          chart.setDatasetVisibility(item.datasetIndex, true);
          chart.data.datasets[item.datasetIndex].yAxisID = "left";
          chart.update();
        }
        if (isVisible && chart.data.datasets[item.datasetIndex].yAxisID === "left") {
          left.className += " btn-secondary"
        }
        tr.appendChild(left)

        const disabled = document.createElement('b-button');
        disabled.className = "btn btn-sm"
        disabled.textContent = "Disabled"
        disabled.onclick = () => {
          chart.setDatasetVisibility(item.datasetIndex, false);
          chart.update();
        }
        if (!isVisible) {
          disabled.className += " btn-secondary"
        }
        tr.appendChild(disabled)

        const right = document.createElement('b-button');
        right.className = "btn btn-sm"
        right.textContent = "Right"
        right.onclick = () => {
          chart.setDatasetVisibility(item.datasetIndex, true);
          chart.data.datasets[item.datasetIndex].yAxisID = "right";
          chart.update();
        }
        if (isVisible && chart.data.datasets[item.datasetIndex].yAxisID === "right") {
          right.className += " btn-secondary"
        }
        tr.appendChild(right)

        ul.appendChild(tr);
      });
    },
    htmlLegendPlugin: function () {
      const x = this
      return {
        id: 'htmlLegend',
        afterUpdate(chart, args, options) {
          x.htmlLegendPluginInternal(getOrCreateLegendList(chart, options.container), chart);
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
