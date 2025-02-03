<template>
  <div class="chart-container">
    <div class="chart-area">
      <Line
        :options="chartOptions"
        :data="chartData"
        :plugins="[htmlLegendPlugin()]"
      />
    </div>
    <div class="legend-area">
      <div id="legend"></div>
    </div>
  </div>
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
  mounted() {
    console.log('LineChart', 'mounted', 'Component mounted with data:', this.chartData);
  },
  watch: {
    chartData: {
      handler(newData) {
        console.log('LineChart', 'watch:chartData', 'Chart data updated:', newData);
      },
      deep: true
    }
  },
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
                // if (x.tooltip) {
                //   return x.tooltip
                // }
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
            ticks: {
              beginAtZero: true
            }
          },
          right: {
            id: "right",
            position: "right",
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
      // Remove old legend items
      while (ul.firstChild) {
        ul.firstChild.remove();
      }

      // Add SDK version header if available
      if (chart.data.datasets.length > 0 && chart.data.datasets[0].data.length > 0) {
        const headerRow = document.createElement('tr');
        const headerCell = document.createElement('td');
        headerCell.colSpan = 2;
        headerCell.style.padding = '0 0 10px 0';
        headerCell.style.color = 'var(--text-secondary)';
        headerCell.style.fontSize = '0.9em';
        
        // Extract version from the first dataset's label
        const versionMatch = chart.data.datasets[0].label.match(/^([\d.]+(?:-\d+\.\d+)+)/);
        if (versionMatch) {
          headerCell.textContent = `SDK Version: ${versionMatch[1]}`;
        }
        
        headerRow.appendChild(headerCell);
        ul.appendChild(headerRow);
      }

      // Reuse the built-in legendItems generator
      const items = chart.options.plugins.legend.labels.generateLabels(chart);

      items.forEach(item => {
        const tr = document.createElement('tr');
        const isVisible = chart.isDatasetVisible(item.datasetIndex);

        const textContainer = document.createElement('td');
        textContainer.style.color = item.strokeStyle;
        textContainer.style.textDecoration = item.hidden ? 'line-through' : '';

        // Transform the label text
        let displayText = item.text;
        if (displayText.includes('operations_total')) {
          displayText = 'Total Operations';
        } else if (displayText.includes('duration_average_us')) {
          displayText = 'Average Duration (μs)';
        } else if (displayText.includes('processCpu')) {
          displayText = 'Process CPU';
        } else if (displayText.includes('systemCpu')) {
          displayText = 'System CPU';
        } else if (displayText.includes('threadCount')) {
          displayText = 'Thread Count';
        } else if (displayText.includes('errors')) {
          displayText = 'Errors';
        }
        else if (displayText.includes('memHeapMaxMB')) {
          displayText = 'Max Heap (MB)';
        }
        else if (displayText.includes('memHeapUsedMB')) {
          displayText = 'Used Heap (MB)';
        }
        else if (displayText.includes('memDirectMaxMB')) {
          displayText = 'Max Direct (MB)';
        }
        else if (displayText.includes('memDirectUsedMB')) {
          displayText = 'Used Direct (MB)';
        }
        else if (displayText.includes('gc0Count')) {
          displayText = 'GC0 Count';
        }
        else if (displayText.includes('gc0AccTimeMs')) {
          displayText = 'GC0 Accumulated Time (ms)';
        }
        else if (displayText.includes('freeSwapSizeMB')) {
          displayText = 'Free Swap (MB)';
        }
        const text = document.createTextNode(displayText);
        textContainer.appendChild(text);
        tr.appendChild(textContainer);

        const buttonCell = document.createElement('td');
        const buttonGroup = document.createElement('div');
        buttonGroup.style.display = 'flex';
        buttonGroup.style.gap = '4px';

        const left = document.createElement('button');
        left.className = `btn btn-sm ${isVisible && chart.data.datasets[item.datasetIndex].yAxisID === "left" 
          ? 'btn-primary' 
          : 'btn-outline-primary'}`;
        left.textContent = "Left";
        left.onclick = () => {
          chart.setDatasetVisibility(item.datasetIndex, true);
          chart.data.datasets[item.datasetIndex].yAxisID = "left";
          chart.update();
        };
        buttonGroup.appendChild(left);

        const disabled = document.createElement('button');
        disabled.className = `btn btn-sm ${!isVisible 
          ? 'btn-danger' 
          : 'btn-outline-danger'}`;
        disabled.textContent = "Disabled";
        disabled.onclick = () => {
          chart.setDatasetVisibility(item.datasetIndex, false);
          chart.update();
        };
        buttonGroup.appendChild(disabled);

        const right = document.createElement('button');
        right.className = `btn btn-sm ${isVisible && chart.data.datasets[item.datasetIndex].yAxisID === "right" 
          ? 'btn-success' 
          : 'btn-outline-success'}`;
        right.textContent = "Right";
        right.onclick = () => {
          chart.setDatasetVisibility(item.datasetIndex, true);
          chart.data.datasets[item.datasetIndex].yAxisID = "right";
          chart.update();
        };
        buttonGroup.appendChild(right);

        buttonCell.appendChild(buttonGroup);
        tr.appendChild(buttonCell);

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

<style scoped>
.chart-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  height: 600px;
  width: 100%;
  min-height: 0;
  min-width: 0;
}

.chart-area {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.legend-area {
  overflow-y: auto;
  padding-right: 10px;
  max-height: 600px;
  min-width: 350px;
}

#legend table {
  width: 100%;
  table-layout: fixed;
}

#legend tr {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) auto;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

#legend td:first-child {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  padding-right: 8px;
}

#legend td:last-child {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 0.2rem;
  white-space: nowrap;
  min-width: 60px;
}

/* Button colors */
.btn-primary {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.btn-success {
  background-color: #28a745;
  border-color: #28a745;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  border-color: #dc3545;
  color: white;
}

/* Button hover states */
.btn-primary:hover {
  background-color: #0056b3;
  border-color: #0056b3;
}

.btn-success:hover {
  background-color: #218838;
  border-color: #218838;
}

.btn-danger:hover {
  background-color: #c82333;
  border-color: #c82333;
}

/* Outline button states */
.btn-outline-primary {
  color: #007bff;
  border-color: #007bff;
  background-color: transparent;
}

.btn-outline-success {
  color: #28a745;
  border-color: #28a745;
  background-color: transparent;
}

.btn-outline-danger {
  color: #dc3545;
  border-color: #dc3545;
  background-color: transparent;
}

/* Outline button hover states */
.btn-outline-primary:hover {
  background-color: #007bff;
  color: white;
}

.btn-outline-success:hover {
  background-color: #28a745;
  color: white;
}

.btn-outline-danger:hover {
  background-color: #dc3545;
  color: white;
}
</style>
