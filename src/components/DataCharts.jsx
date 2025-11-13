import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Scatter } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DataCharts = ({ chartData }) => {
  useEffect(() => {
    console.log('📊 DataCharts montado/actualizado');
    console.log('  📈 barChart:', !!chartData?.barChart);
    console.log('  📉 lineChart:', !!chartData?.lineChart);
    console.log('  🥧 pieChart:', !!chartData?.pieChart);
    console.log('  🍩 doughnutChart:', !!chartData?.doughnutChart);
    console.log('  📊 scatterChart:', !!chartData?.scatterChart);
    console.log('  📊 stackedBarChart:', !!chartData?.stackedBarChart);
    console.log('  📊 areaChart:', !!chartData?.areaChart);
    console.log('  📊 histogramChart:', !!chartData?.histogramChart);
  }, [chartData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
    },
    transitions: {
      active: {
        animation: {
          duration: 0
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#FFFFFF',
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 71, 186, 0.9)',
        titleColor: '#FFDD00',
        bodyColor: '#FFFFFF',
        borderColor: '#FFDD00',
        borderWidth: 1,
        padding: 12,
        displayColors: true
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#FFFFFF',
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        ticks: {
          color: '#FFFFFF'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  // Forzar creación de nuevos objetos para evitar que Chart.js cachee los datos
  const barChartData = {
    labels: [...(chartData.barChart?.labels || [])],
    datasets: [
      {
        label: 'Cantidad',
        data: [...(chartData.barChart?.data || [])],
        backgroundColor: 'rgba(255, 221, 0, 0.8)',
        borderColor: '#FFDD00',
        borderWidth: 2,
        borderRadius: 6,
      }
    ]
  };

  const lineChartData = {
    labels: [...(chartData.lineChart?.labels || [])],
    datasets: [
      {
        label: 'Tendencia',
        data: [...(chartData.lineChart?.data || [])],
        borderColor: '#FFDD00',
        backgroundColor: 'rgba(255, 221, 0, 0.2)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#FFDD00',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }
    ]
  };

  const pieColors = [
    'rgba(255, 221, 0, 0.9)',
    'rgba(255, 180, 0, 0.9)',
    'rgba(255, 140, 0, 0.9)',
    'rgba(230, 199, 0, 0.9)',
    'rgba(200, 170, 0, 0.9)',
    'rgba(170, 140, 0, 0.9)',
    'rgba(255, 200, 50, 0.9)',
    'rgba(255, 230, 100, 0.9)',
  ];

  const pieChartData = {
    labels: [...(chartData.pieChart?.labels || [])],
    datasets: [
      {
        data: [...(chartData.pieChart?.data || [])],
        backgroundColor: pieColors,
        borderColor: '#FFFFFF',
        borderWidth: 2,
      }
    ]
  };

  const doughnutChartData = {
    labels: [...(chartData.doughnutChart?.labels || [])],
    datasets: [
      {
        data: [...(chartData.doughnutChart?.data || [])],
        backgroundColor: pieColors,
        borderColor: '#FFFFFF',
        borderWidth: 2,
      }
    ]
  };

  const pieOptions = {
    ...chartOptions,
    scales: undefined
  };

  // Gráfico de dispersión (Scatter)
  const scatterChartData = chartData.scatterChart ? {
    datasets: [
      {
        label: 'Consumo vs Tarificación',
        data: chartData.scatterChart.data,
        backgroundColor: 'rgba(255, 221, 0, 0.6)',
        borderColor: '#FFDD00',
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBorderWidth: 2,
        pointBorderColor: '#FFFFFF',
      }
    ]
  } : null;

  const scatterOptions = {
    ...chartOptions,
    scales: {
      x: {
        ...chartOptions.scales.x,
        title: {
          display: true,
          text: chartData.scatterChart?.xLabel || 'Consumo MB',
          color: '#FFFFFF',
          font: { size: 12 }
        }
      },
      y: {
        ...chartOptions.scales.y,
        title: {
          display: true,
          text: chartData.scatterChart?.yLabel || 'Tarificación',
          color: '#FFFFFF',
          font: { size: 12 }
        }
      }
    },
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          title: function(context) {
            // Mostrar el MSISDN como título del tooltip
            const dataPoint = scatterChartData.datasets[0].data[context[0].dataIndex];
            return dataPoint.label || 'Sin identificar';
          },
          label: function(context) {
            return `Consumo: ${context.parsed.x.toLocaleString()} MB, Tarificación: $${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    }
  };

  // Gráfico de barras apiladas (Stacked Bar)
  const stackedBarChartData = chartData.stackedBarChart ? {
    labels: [...(chartData.stackedBarChart.labels || [])],
    datasets: [
      {
        label: 'Consumo Total (MB)',
        data: [...(chartData.stackedBarChart.data || [])],
        backgroundColor: 'rgba(255, 221, 0, 0.8)',
        borderColor: '#FFDD00',
        borderWidth: 2,
        borderRadius: 6,
      }
    ]
  } : null;

  // Gráfico de área (Area Chart)
  const areaChartData = chartData.areaChart ? {
    labels: [...(chartData.areaChart.labels || [])],
    datasets: [
      {
        label: 'Consumo Diario (MB)',
        data: [...(chartData.areaChart.data || [])],
        borderColor: '#FFDD00',
        backgroundColor: 'rgba(255, 221, 0, 0.3)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#FFDD00',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  } : null;

  // Histograma (usando Bar chart)
  const histogramChartData = chartData.histogramChart ? {
    labels: [...(chartData.histogramChart.labels || [])],
    datasets: [
      {
        label: 'Clientes',
        data: [...(chartData.histogramChart.data || [])],
        backgroundColor: 'rgba(255, 221, 0, 0.8)',
        borderColor: '#FFDD00',
        borderWidth: 2,
        borderRadius: 4,
      }
    ]
  } : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 [&>*:last-child:nth-child(odd)]:lg:col-span-2">
      {/* Gráfico de Barras */}
      {chartData.barChart && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">
            {chartData.barChart.title}
            <span className="ml-2 text-xs text-white/50">
              (Total: {barChartData.datasets[0].data.reduce((a, b) => a + b, 0)})
            </span>
          </h3>
          <div className="h-64 md:h-80">
            <Bar data={barChartData} options={chartOptions} redraw={true} />
          </div>
        </div>
      )}

      {/* Gráfico de Línea */}
      {chartData.lineChart && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">
            {chartData.lineChart.title}
            <span className="ml-2 text-xs text-white/50">
              (Total: {lineChartData.datasets[0].data.reduce((a, b) => a + b, 0)})
            </span>
          </h3>
          <div className="h-64 md:h-80">
            <Line data={lineChartData} options={chartOptions} redraw={true} />
          </div>
        </div>
      )}

      {/* Gráfico de Pie */}
      {chartData.pieChart && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">
            {chartData.pieChart.title}
            <span className="ml-2 text-xs text-white/50">
              (Total: {pieChartData.datasets[0].data.reduce((a, b) => a + b, 0)})
            </span>
          </h3>
          <div className="h-64 md:h-80">
            <Pie data={pieChartData} options={pieOptions} redraw={true} />
          </div>
        </div>
      )}

      {/* Gráfico de Dona */}
      {chartData.doughnutChart && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">
            {chartData.doughnutChart.title}
            <span className="ml-2 text-xs text-white/50">
              (Total: {doughnutChartData.datasets[0].data.reduce((a, b) => a + b, 0)})
            </span>
          </h3>
          <div className="h-64 md:h-80">
            <Doughnut data={doughnutChartData} options={pieOptions} redraw={true} />
          </div>
        </div>
      )}

      {/* Gráfico de Dispersión: Consumo MB vs Tarificación */}
      {chartData.scatterChart && scatterChartData && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">
            {chartData.scatterChart.title}
            <span className="ml-2 text-xs text-white/50">
              ({scatterChartData.datasets[0].data.length} puntos)
            </span>
          </h3>
          <div className="h-64 md:h-80">
            <Scatter data={scatterChartData} options={scatterOptions} redraw={true} />
          </div>
        </div>
      )}

      {/* Gráfico de Barras Apiladas: Consumo por Oferta */}
      {chartData.stackedBarChart && stackedBarChartData && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">
            {chartData.stackedBarChart.title}
            <span className="ml-2 text-xs text-white/50">
              (Total: {stackedBarChartData.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString()} MB)
            </span>
          </h3>
          <div className="h-64 md:h-80">
            <Bar data={stackedBarChartData} options={chartOptions} redraw={true} />
          </div>
        </div>
      )}

      {/* Gráfico de Área: Consumo Diario por Fecha Último Consumo */}
      {chartData.areaChart && areaChartData && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">
            {chartData.areaChart.title}
            <span className="ml-2 text-xs text-white/50">
              (Consumo máximo diario: {Math.max(...areaChartData.datasets[0].data).toLocaleString()} MB)
            </span>
          </h3>
          <div className="h-64 md:h-80">
            <Line data={areaChartData} options={chartOptions} redraw={true} />
          </div>
        </div>
      )}

      {/* Histograma: Distribución de Consumo MB */}
      {chartData.histogramChart && histogramChartData && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">
            {chartData.histogramChart.title}
            <span className="ml-2 text-xs text-white/50">
              (Total: {histogramChartData.datasets[0].data.reduce((a, b) => a + b, 0)} clientes)
            </span>
          </h3>
          <div className="h-64 md:h-80">
            <Bar data={histogramChartData} options={chartOptions} redraw={true} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DataCharts;

