/**
 * Utilidades para análisis de datos de consumo telefónico
 */

// Función para correlacionar datos de Tarificación y Detalle Recargas por MSISDN
export const correlateData = (tarificacion, detalleRecargas) => {
  if (!tarificacion || !detalleRecargas || tarificacion.length === 0 || detalleRecargas.length === 0) {
    console.error('❌ Error: Archivos vacíos o no válidos');
    return [];
  }

  console.log('🔗 Iniciando correlación de datos...');
  console.log(`📊 Tarificación: ${tarificacion.length} registros`);
  console.log(`📊 Detalle Recargas: ${detalleRecargas.length} registros`);
  console.log('📋 Muestra Tarificación:', tarificacion[0]);
  console.log('📋 Muestra Recargas:', detalleRecargas[0]);

  // Crear un mapa de recargas por MSISDN para acceso rápido
  const recargasMap = new Map();
  
  detalleRecargas.forEach(recarga => {
    const msisdn = recarga.MSISDN;
    if (!msisdn) return;
    
    if (!recargasMap.has(msisdn)) {
      recargasMap.set(msisdn, []);
    }
    recargasMap.get(msisdn).push(recarga);
  });

  console.log(`📞 MSISDNs únicos en recargas:`, recargasMap.size);

  // Correlacionar cada registro de tarificación con sus recargas
  const correlatedData = tarificacion.map((tarif, index) => {
    const msisdn = tarif.MSISDN;
    const recargas = recargasMap.get(msisdn) || [];
    
    if (index === 0) {
      console.log(`🔍 Primer registro - MSISDN: ${msisdn}, Recargas encontradas: ${recargas.length}`);
    }
    
    // Encontrar la recarga más reciente para este MSISDN
    const recargaMasReciente = recargas.length > 0 
      ? recargas.reduce((latest, current) => {
          const latestDate = new Date(latest['Fecha Ultima Recarga'] || latest.Fecha || 0);
          const currentDate = new Date(current['Fecha Ultima Recarga'] || current.Fecha || 0);
          return currentDate > latestDate ? current : latest;
        })
      : null;

    // Obtener valor de Consumo MB (manejo especial para 0)
    const consumoMB = tarif.Consumo_MB ?? tarif['Consumo_MB'] ?? tarif['Consumo MB'];
    const consumoMBValue = consumoMB !== null && consumoMB !== undefined && consumoMB !== '' 
      ? consumoMB 
      : '';

    // Unir las columnas de ambos archivos por MSISDN (llave primaria)
    // MSISDN y Oferta aparecen solo una vez ya que son la llave de correlación
    return {
      // Columnas de TARIFICACIÓN
      'Fecha Inicial': tarif['Fecha Inicial'] || tarif.Fecha_Inicial || '',
      'Fecha Fin': tarif['Fecha Fin'] || tarif.Fecha_Fin || '',
      'MSISDN': msisdn || '',
      'Oferta': tarif.Oferta || '',
      'Consumo MB': consumoMBValue,
      'Tarificacion': tarif.Tarificacion ?? '',
      
      // Columnas adicionales de DETALLE RECARGAS (sin duplicar MSISDN y Oferta)
      'Fecha': recargaMasReciente ? recargaMasReciente.Fecha : '',
      'Fecha Ultimo Consumo': recargaMasReciente ? recargaMasReciente['Fecha Ultimo Consumo'] : '',
      'Fecha Activacion': recargaMasReciente ? recargaMasReciente['Fecha Activacion'] : '',
      'Fecha Ultima Recarga': recargaMasReciente ? recargaMasReciente['Fecha Ultima Recarga'] : '',
    };
  });

  console.log(`✅ Correlación completa: ${correlatedData.length} registros correlacionados`);
  console.log('📋 Muestra de datos correlacionados:', correlatedData[0]);
  
  return correlatedData;
};

// Función auxiliar para calcular días desde una fecha
const calcularDiasDesde = (fecha) => {
  if (!fecha) return null;
  try {
    const fechaPasada = new Date(fecha);
    const hoy = new Date();
    const diferencia = Math.floor((hoy - fechaPasada) / (1000 * 60 * 60 * 24));
    return diferencia;
  } catch (error) {
    return null;
  }
};

// Función auxiliar para determinar el estado del cliente
const determinarEstadoCliente = (fechaUltimaRecarga, fechaUltimoConsumo, totalRecargas) => {
  const diasSinRecarga = calcularDiasDesde(fechaUltimaRecarga);
  const diasSinConsumo = calcularDiasDesde(fechaUltimoConsumo);
  
  if (totalRecargas === 0) return 'Sin Recargas';
  if (diasSinRecarga === null) return 'Desconocido';
  
  if (diasSinRecarga > 60) return 'Inactivo';
  if (diasSinRecarga > 30) return 'En Riesgo';
  if (diasSinConsumo && diasSinConsumo > 15) return 'Baja Actividad';
  
  return 'Activo';
};

// Función para analizar datos de consumo
export const analyzeConsumptionData = (data) => {
  console.log('🔬 analyzeConsumptionData llamada con:', data?.length, 'registros');
  
  if (!data || data.length === 0) {
    console.warn('⚠️ analyzeConsumptionData: No hay datos para analizar');
    return null;
  }

  // Intentar detectar columnas relevantes (manejo flexible de nombres de columnas)
  const sampleRow = data[0];
  const columns = Object.keys(sampleRow);
  
  console.log('📋 Columnas detectadas:', columns);
  console.log('📊 Muestra de primer registro:', sampleRow);

  // Análisis básico
  const analysis = {
    totalRecords: data.length,
    columns: columns,
    summary: {},
    chartData: {}
  };

  // Buscar columnas numéricas para estadísticas
  const numericColumns = columns.filter(col => {
    return data.some(row => typeof row[col] === 'number' && !isNaN(row[col]));
  });

  // Calcular estadísticas para columnas numéricas
  numericColumns.forEach(col => {
    const values = data.map(row => Number(row[col]) || 0);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    analysis.summary[col] = {
      total,
      average: average.toFixed(2),
      max,
      min
    };
  });

  // Preparar datos para gráficos
  prepareChartData(data, analysis);

  console.log('✅ Análisis completado:', {
    totalRecords: analysis.totalRecords,
    barChartTotal: analysis.chartData.barChart?.data?.reduce((a, b) => a + b, 0),
    barChartTimestamp: analysis.chartData.barChart?._timestamp,
    timestamp: Date.now()
  });

  // Retornar un nuevo objeto completamente nuevo para forzar re-render
  const newAnalysis = {
    totalRecords: analysis.totalRecords,
    columns: [...analysis.columns],
    summary: { ...analysis.summary },
    chartData: {
      ...(analysis.chartData.barChart && {
        barChart: {
          labels: [...analysis.chartData.barChart.labels],
          data: [...analysis.chartData.barChart.data],
          title: analysis.chartData.barChart.title,
          _timestamp: analysis.chartData.barChart._timestamp
        }
      }),
      ...(analysis.chartData.lineChart && {
        lineChart: {
          labels: [...analysis.chartData.lineChart.labels],
          data: [...analysis.chartData.lineChart.data],
          title: analysis.chartData.lineChart.title,
          _timestamp: analysis.chartData.lineChart._timestamp
        }
      }),
      ...(analysis.chartData.pieChart && {
        pieChart: {
          labels: [...analysis.chartData.pieChart.labels],
          data: [...analysis.chartData.pieChart.data],
          title: analysis.chartData.pieChart.title,
          _timestamp: analysis.chartData.pieChart._timestamp
        }
      }),
      ...(analysis.chartData.doughnutChart && {
        doughnutChart: {
          labels: [...analysis.chartData.doughnutChart.labels],
          data: [...analysis.chartData.doughnutChart.data],
          title: analysis.chartData.doughnutChart.title,
          _timestamp: analysis.chartData.doughnutChart._timestamp
        }
      }),
      ...(analysis.chartData.scatterChart && {
        scatterChart: {
          data: [...analysis.chartData.scatterChart.data],
          title: analysis.chartData.scatterChart.title,
          xLabel: analysis.chartData.scatterChart.xLabel,
          yLabel: analysis.chartData.scatterChart.yLabel,
          _timestamp: analysis.chartData.scatterChart._timestamp
        }
      }),
      ...(analysis.chartData.stackedBarChart && {
        stackedBarChart: {
          labels: [...analysis.chartData.stackedBarChart.labels],
          data: [...analysis.chartData.stackedBarChart.data],
          title: analysis.chartData.stackedBarChart.title,
          _timestamp: analysis.chartData.stackedBarChart._timestamp
        }
      }),
      ...(analysis.chartData.areaChart && {
        areaChart: {
          labels: [...analysis.chartData.areaChart.labels],
          data: [...analysis.chartData.areaChart.data],
          title: analysis.chartData.areaChart.title,
          _timestamp: analysis.chartData.areaChart._timestamp
        }
      }),
      ...(analysis.chartData.histogramChart && {
        histogramChart: {
          labels: [...analysis.chartData.histogramChart.labels],
          data: [...analysis.chartData.histogramChart.data],
          title: analysis.chartData.histogramChart.title,
          _timestamp: analysis.chartData.histogramChart._timestamp
        }
      })
    }
  };
  
  console.log('🔄 Nuevo objeto analysis creado con timestamp:', newAnalysis.chartData.barChart?._timestamp);
  
  return newAnalysis;
};

// Preparar datos para diferentes tipos de gráficos
const prepareChartData = (data, analysis) => {
  console.log('📊 prepareChartData: Procesando', data.length, 'registros para gráficos');
  
  const sampleRow = data[0];
  const columns = Object.keys(sampleRow);

  // 1. Gráfico de barras: distribución por categoría (primera columna categórica)
  const categoricalColumn = columns.find(col => 
    typeof data[0][col] === 'string' || isNaN(data[0][col])
  );

  console.log('📊 Columna categórica para barChart:', categoricalColumn);

  if (categoricalColumn) {
    const categoryCounts = {};
    data.forEach(row => {
      const category = row[categoricalColumn] || 'Sin categoría';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    // Limitar a top 10 categorías
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const barChartData = sortedCategories.map(([, count]) => count);
    
    analysis.chartData.barChart = {
      labels: sortedCategories.map(([label]) => label),
      data: barChartData,
      title: `Distribución por ${categoricalColumn}`,
      _timestamp: Date.now() // Marcador de tiempo para debug
    };
    
    console.log('📊 barChart generado:', {
      labels: analysis.chartData.barChart.labels,
      data: analysis.chartData.barChart.data,
      total: barChartData.reduce((a, b) => a + b, 0),
      timestamp: analysis.chartData.barChart._timestamp
    });
  }

  // 2. Gráfico de línea: tendencia temporal por día usando "Fecha Ultima Recarga"
  const dateColumn = columns.find(col => col === 'Fecha Ultima Recarga') 
    || columns.find(col => col.toLowerCase() === 'fecha ultima recarga')
    || columns.find(col => col.toLowerCase().includes('fecha ultima recarga'));

  console.log('📅 Columna de fecha para lineChart:', dateColumn);

  if (dateColumn) {
    const timeSeries = {};
    
    // Función para normalizar fechas a formato YYYY-MM-DD
    const normalizeDate = (dateValue) => {
      if (!dateValue) return null;
      
      try {
        // Si es número (Excel serial)
        if (typeof dateValue === 'number') {
          const days = Math.floor(dateValue) - 25569;
          const date = new Date(days * 24 * 60 * 60 * 1000);
          return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        }
        
        // Si es string
        const str = String(dateValue);
        
        // Formato DD/MM/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
          const parts = str.split('/');
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
        
        // Formato YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
          return str.substring(0, 10);
        }
        
        return null;
      } catch (e) {
        console.error('Error normalizando fecha:', dateValue, e);
        return null;
      }
    };
    
    // Agrupar por día
    data.forEach(row => {
      const normalizedDate = normalizeDate(row[dateColumn]);
      if (normalizedDate) {
        timeSeries[normalizedDate] = (timeSeries[normalizedDate] || 0) + 1;
      }
    });

    // Ordenar cronológicamente
    const sortedDates = Object.entries(timeSeries).sort((a, b) => {
      return a[0].localeCompare(b[0]);
    });

    // Formatear labels a DD/MM/YYYY para mostrar
    const formattedLabels = sortedDates.map(([dateStr]) => {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    });

    console.log('📈 lineChart datos por día:', {
      fechas: formattedLabels,
      registros: sortedDates.map(([, count]) => count),
      total: sortedDates.reduce((sum, [, count]) => sum + count, 0)
    });

    analysis.chartData.lineChart = {
      labels: formattedLabels,
      data: sortedDates.map(([, count]) => count),
      title: 'Últimas Recargas por Día',
      _timestamp: Date.now()
    };
  } else {
    console.warn('⚠️ No se encontró la columna "Fecha Ultima Recarga" para el gráfico de línea');
  }

  // 3. Gráfico de pie: distribución porcentual (usar misma columna que barras)
  if (categoricalColumn && analysis.chartData.barChart) {
    analysis.chartData.pieChart = {
      labels: [...analysis.chartData.barChart.labels],
      data: [...analysis.chartData.barChart.data],
      title: `Distribución % por ${categoricalColumn}`,
      _timestamp: Date.now()
    };
  }

  // 4. Gráfico de dona: consumo por tipo (buscar columna de tipo o plan)
  const typeColumn = columns.find(col => 
    col.toLowerCase().includes('tipo') ||
    col.toLowerCase().includes('plan') ||
    col.toLowerCase().includes('type') ||
    col.toLowerCase().includes('categoria')
  );

  if (typeColumn && typeColumn !== categoricalColumn) {
    const typeCounts = {};
    data.forEach(row => {
      const type = row[typeColumn] || 'Sin tipo';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const sortedTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    analysis.chartData.doughnutChart = {
      labels: sortedTypes.map(([label]) => label),
      data: sortedTypes.map(([, count]) => count),
      title: `Consumo por ${typeColumn}`,
      _timestamp: Date.now()
    };
  }
  
  // 5. Gráfico de dispersión: Consumo MB vs Tarificación (correlación)
  const consumoMBCol = columns.find(col => 
    col.toLowerCase().includes('consumo') && col.toLowerCase().includes('mb')
  );
  const tarificacionCol = columns.find(col => 
    col.toLowerCase().includes('tarificacion') || col.toLowerCase().includes('tarificación')
  );

  if (consumoMBCol && tarificacionCol) {
    const scatterData = data
      .filter(row => {
        const consumo = Number(row[consumoMBCol]) || 0;
        const tarif = Number(row[tarificacionCol]) || 0;
        return consumo > 0 && tarif > 0;
      })
      .map(row => ({
        x: Number(row[consumoMBCol]) || 0,
        y: Number(row[tarificacionCol]) || 0,
        label: row['Oferta'] || 'Sin oferta'
      }));

    if (scatterData.length > 0) {
      analysis.chartData.scatterChart = {
        data: scatterData,
        title: 'Consumo MB vs Tarificación',
        xLabel: 'Consumo MB',
        yLabel: 'Tarificación',
        _timestamp: Date.now()
      };
      console.log('📊 scatterChart generado:', scatterData.length, 'puntos');
    }
  }

  // 6. Gráfico de barras apiladas: Consumo por Oferta (top 5 ofertas)
  if (consumoMBCol && categoricalColumn) {
    const ofertasConsumo = {};
    data.forEach(row => {
      const oferta = row[categoricalColumn] || 'Sin oferta';
      const consumo = Number(row[consumoMBCol]) || 0;
      if (!ofertasConsumo[oferta]) {
        ofertasConsumo[oferta] = 0;
      }
      ofertasConsumo[oferta] += consumo;
    });

    const sortedOfertas = Object.entries(ofertasConsumo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (sortedOfertas.length > 0) {
      analysis.chartData.stackedBarChart = {
        labels: sortedOfertas.map(([label]) => label),
        data: sortedOfertas.map(([, consumo]) => consumo),
        title: 'Consumo Total por Oferta (Top 5)',
        _timestamp: Date.now()
      };
      console.log('📊 stackedBarChart generado:', sortedOfertas.length, 'ofertas');
    }
  }

  // 7. Gráfico de área: Tarificación acumulada por día (usando Fecha Inicial)
  const fechaInicialCol = columns.find(col => col === 'Fecha Inicial') 
    || columns.find(col => col.toLowerCase() === 'fecha inicial')
    || columns.find(col => col.toLowerCase().includes('fecha inicial'));
  
  if (tarificacionCol && fechaInicialCol) {
    const normalizeDate = (dateValue) => {
      if (!dateValue) return null;
      try {
        if (typeof dateValue === 'number') {
          const days = Math.floor(dateValue) - 25569;
          const date = new Date(days * 24 * 60 * 60 * 1000);
          return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        }
        const str = String(dateValue);
        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
          const parts = str.split('/');
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
          return str.substring(0, 10);
        }
        return null;
      } catch (e) {
        return null;
      }
    };

    const tarifPorDia = {};
    data.forEach(row => {
      const normalizedDate = normalizeDate(row[fechaInicialCol]);
      const tarif = Number(row[tarificacionCol]) || 0;
      if (normalizedDate && tarif > 0) {
        tarifPorDia[normalizedDate] = (tarifPorDia[normalizedDate] || 0) + tarif;
      }
    });

    const sortedTarifDates = Object.entries(tarifPorDia).sort((a, b) => a[0].localeCompare(b[0]));
    
    // Calcular acumulado
    let acumulado = 0;
    const tarifAcumulada = sortedTarifDates.map(([date, tarif]) => {
      acumulado += tarif;
      return acumulado;
    });

    const formattedLabels = sortedTarifDates.map(([dateStr]) => {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    });

    if (formattedLabels.length > 0) {
      analysis.chartData.areaChart = {
        labels: formattedLabels,
        data: tarifAcumulada,
        title: 'Tarificación Acumulada por Día',
        _timestamp: Date.now()
      };
      console.log('📊 areaChart generado:', formattedLabels.length, 'días');
    }
  }

  // 8. Histograma: Distribución de rangos de consumo
  if (consumoMBCol) {
    const consumos = data
      .map(row => Number(row[consumoMBCol]) || 0)
      .filter(c => c > 0);

    if (consumos.length > 0) {
      const maxConsumo = Math.max(...consumos);
      const minConsumo = Math.min(...consumos);
      const numBins = 6;
      const binSize = (maxConsumo - minConsumo) / numBins;

      const bins = Array(numBins).fill(0).map((_, i) => ({
        min: minConsumo + (i * binSize),
        max: minConsumo + ((i + 1) * binSize),
        count: 0
      }));

      consumos.forEach(consumo => {
        const binIndex = Math.min(
          Math.floor((consumo - minConsumo) / binSize),
          numBins - 1
        );
        bins[binIndex].count++;
      });

      const histogramLabels = bins.map(bin => 
        `${Math.round(bin.min).toLocaleString()} - ${Math.round(bin.max).toLocaleString()} MB`
      );
      const histogramData = bins.map(bin => bin.count);

      analysis.chartData.histogramChart = {
        labels: histogramLabels,
        data: histogramData,
        title: 'Distribución de Consumo MB',
        _timestamp: Date.now()
      };
      console.log('📊 histogramChart generado:', numBins, 'rangos');
    }
  }

  console.log('📊 prepareChartData completado:', {
    barChart: !!analysis.chartData.barChart,
    lineChart: !!analysis.chartData.lineChart,
    pieChart: !!analysis.chartData.pieChart,
    doughnutChart: !!analysis.chartData.doughnutChart,
    scatterChart: !!analysis.chartData.scatterChart,
    stackedBarChart: !!analysis.chartData.stackedBarChart,
    areaChart: !!analysis.chartData.areaChart,
    histogramChart: !!analysis.chartData.histogramChart
  });
};

// Función para exportar análisis a CSV
export const exportToCSV = (data, filename = 'analisis_macroplay.csv') => {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escapar comas y comillas en los valores
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

