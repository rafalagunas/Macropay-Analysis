import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FileUpload from "../components/FileUpload";
import DataCharts from "../components/DataCharts";
import DataTable from "../components/DataTable";
import AIInsights from "../components/AIInsights";
import {
  analyzeConsumptionData,
  correlateData,
  exportToCSV,
} from "../utils/dataAnalysis";
import { segmentUsers, isGeminiConfigured } from "../services/geminiService";
// WhatsApp service import removed - using hardcoded values

const Dashboard = () => {
  const [correlatedData, setCorrelatedData] = useState(null);
  const [originalData, setOriginalData] = useState(null); // Datos sin filtrar
  const [analysis, setAnalysis] = useState(null);
  const [fileNames, setFileNames] = useState({ tarif: "", recarga: "" });
  const [segments, setSegments] = useState(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [isProcessingData, setIsProcessingData] = useState(false); // Estado de procesamiento
  const [processingStep, setProcessingStep] = useState(""); // Paso actual del procesamiento
  const [sendingWhatsApp, setSendingWhatsApp] = useState({}); // { segmentName: boolean }
  const [whatsAppProgress, setWhatsAppProgress] = useState({}); // { segmentName: { sent, total } }
  const [sendingSMS, setSendingSMS] = useState({}); // { segmentName: boolean }
  const [smsProgress, setSmsProgress] = useState({}); // { segmentName: { sent, total } }
  const [dateRange, setDateRange] = useState({ min: null, max: null }); // Rango disponible
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: null,
    end: null,
  }); // Rango seleccionado
  const [tempDateRange, setTempDateRange] = useState({
    start: null,
    end: null,
  }); // Rango temporal antes de aplicar
  const [chartKey, setChartKey] = useState(Date.now()); // Key para forzar re-render de gráficos
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Monitorear cambios en correlatedData
  useEffect(() => {
    console.log("🔄 correlatedData cambió:", {
      length: correlatedData?.length,
      muestra: correlatedData?.slice(0, 2),
    });
  }, [correlatedData]);

  // Monitorear cambios en analysis
  useEffect(() => {
    console.log("🔄 analysis cambió:", {
      totalRecords: analysis?.totalRecords,
      hasChartData: !!analysis?.chartData,
      chartDataKeys: analysis?.chartData ? Object.keys(analysis.chartData) : [],
      barChartTotal: analysis?.chartData?.barChart?.data?.reduce(
        (a, b) => a + b,
        0
      ),
      timestamp: Date.now(),
    });

    // Verificar si chartData está siendo el mismo objeto
    if (analysis?.chartData) {
      console.log("🔍 chartData reference:", analysis.chartData);
      console.log("📊 barChart data:", analysis.chartData.barChart?.data);
    }
  }, [analysis]);

  // Función para extraer rango de fechas de los datos (optimizada para grandes volúmenes)
  const extractDateRange = (data) => {
    const dateColumns = [
      "Fecha Inicial",
      "Fecha_Inicio_PF",
      "Fecha Fin",
      "Fecha_Fin_PF",
      "Fecha",
      "FECHA_CORTE",
      "Fecha Ultimo Consumo",
      "FECHA_ULT_CONSUMO",
      "Fecha Activacion",
      "FECHA_ACTIVACION",
      "Fecha Ultima Recarga",
      "FECHA_ULT_RECARGA",
    ];

    let minTime = Infinity;
    let maxTime = -Infinity;
    let foundDates = false;

    // Optimización: encontrar min/max en un solo loop sin crear array grande
    data.forEach((row) => {
      dateColumns.forEach((col) => {
        const value = row[col];
        if (value && value !== "") {
          let timestamp;

          if (typeof value === "number") {
            // Excel serial number - Usar UTC para evitar problemas de zona horaria
            // 25569 es la diferencia en días entre 1900-01-01 y 1970-01-01
            const days = Math.floor(value) - 25569;
            timestamp = days * 24 * 60 * 60 * 1000;
          } else {
            const date = new Date(value);
            timestamp = date.getTime();
          }

          if (!isNaN(timestamp)) {
            foundDates = true;
            if (timestamp < minTime) minTime = timestamp;
            if (timestamp > maxTime) maxTime = timestamp;
          }
        }
      });
    });

    if (foundDates && minTime !== Infinity && maxTime !== -Infinity) {
      const min = new Date(minTime);
      const max = new Date(maxTime);

      // Usar UTC para obtener las fechas correctas
      const minStr = `${min.getUTCFullYear()}-${String(
        min.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(min.getUTCDate()).padStart(2, "0")}`;
      const maxStr = `${max.getUTCFullYear()}-${String(
        max.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(max.getUTCDate()).padStart(2, "0")}`;

      console.log(`📅 Rango de fechas encontrado: ${minStr} a ${maxStr}`);

      return {
        min: minStr,
        max: maxStr,
      };
    }

    console.warn("⚠️ No se encontraron fechas válidas en los datos");
    return { min: null, max: null };
  };

  // Función para filtrar datos por rango de fechas
  const filterDataByDateRange = (data, startDate, endDate) => {
    if (!startDate || !endDate) return data;

    // Convertir fechas seleccionadas a tiempo UTC (inicio del día y fin del día)
    const start = new Date(startDate + "T00:00:00.000Z");
    const startTime = start.getTime();

    const end = new Date(endDate + "T23:59:59.999Z");
    const endTime = end.getTime();

    console.log(`🔍 Filtrando del ${startDate} al ${endDate}`);
    console.log(`⏰ Rango UTC: ${start.toISOString()} a ${end.toISOString()}`);

    let sinFecha = 0;
    let fechasInvalidas = 0;
    let enRango = 0;
    let fueraDeRango = 0;
    const muestraEnRango = [];
    const muestraFuera = [];

    const filtered = data.filter((row, index) => {
      // Intentar obtener la fecha principal del registro (priorizar Fecha Inicial)
      const fechaValue =
        row["Fecha Inicial"] ||
        row["Fecha_Inicio_PF"] ||
        row["Fecha"] ||
        row["FECHA_CORTE"] ||
        row["Fecha Fin"] ||
        row["Fecha_Fin_PF"];

      // Log del primer registro para debugging
      if (index === 0) {
        console.log("🔍 Primer registro a filtrar:", {
          "Fecha Inicial": row["Fecha Inicial"],
          "tipo Fecha Inicial": typeof row["Fecha Inicial"],
          Fecha: row["Fecha"],
          "tipo Fecha": typeof row["Fecha"],
          "Fecha Fin": row["Fecha Fin"],
          "fechaValue seleccionado": fechaValue,
          "tipo fechaValue": typeof fechaValue,
        });
      }

      if (!fechaValue || fechaValue === "") {
        sinFecha++;
        return false; // Excluir registros sin fecha
      }

      let date;
      if (typeof fechaValue === "number") {
        // Excel serial number - Usar UTC para evitar problemas de zona horaria
        const days = Math.floor(fechaValue) - 25569;
        date = new Date(days * 24 * 60 * 60 * 1000);
        if (index === 0) {
          console.log("📅 Conversión de Excel serial:", {
            serial: fechaValue,
            days: days,
            date: date.toISOString(),
            dateUTC: `${date.getUTCFullYear()}-${String(
              date.getUTCMonth() + 1
            ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`,
          });
        }
      } else {
        date = new Date(fechaValue);
        if (index === 0) {
          console.log("📅 Conversión de string:", {
            fechaValue,
            date: date.toISOString(),
          });
        }
      }

      if (isNaN(date.getTime())) {
        fechasInvalidas++;
        return false; // Excluir si la fecha es inválida
      }

      // Normalizar a inicio del día en UTC
      date.setUTCHours(0, 0, 0, 0);
      const dateTime = date.getTime();
      const isInRange = dateTime >= startTime && dateTime <= endTime;

      if (isInRange) {
        enRango++;
        if (muestraEnRango.length < 3) {
          muestraEnRango.push({
            msisdn: row.MSISDN,
            fecha: date.toISOString().split("T")[0],
          });
        }
      } else {
        fueraDeRango++;
        if (muestraFuera.length < 3) {
          muestraFuera.push({
            msisdn: row.MSISDN,
            fecha: date.toISOString().split("T")[0],
          });
        }
      }

      return isInRange;
    });

    console.log(`📊 Resultados del filtro:`);
    console.log(`  ✅ En rango: ${enRango} registros`);
    console.log(`  ❌ Fuera de rango: ${fueraDeRango} registros`);
    console.log(`  ⚠️ Sin fecha: ${sinFecha} registros`);
    console.log(`  ⚠️ Fechas inválidas: ${fechasInvalidas} registros`);
    if (muestraEnRango.length > 0) {
      console.log(`  📋 Muestra en rango:`, muestraEnRango);
    }
    if (muestraFuera.length > 0) {
      console.log(`  📋 Muestra fuera:`, muestraFuera);
    }
    return filtered;
  };

  const handleDataLoaded = async (filesData, names) => {
    if (filesData && filesData.tarificacion && filesData.detalleRecargas) {
      try {
        setIsProcessingData(true);
        setProcessingStep("Validando archivos...");

        console.log("📊 Iniciando procesamiento de datos...");
        console.log(
          `  Tarificación: ${filesData.tarificacion.length} registros`
        );
        console.log(
          `  Detalle Recargas: ${filesData.detalleRecargas.length} registros`
        );

        // Validar que hay datos en ambos archivos
        if (
          filesData.tarificacion.length === 0 ||
          filesData.detalleRecargas.length === 0
        ) {
          console.error("❌ Error: Uno o ambos archivos están vacíos");
          alert(
            "Error: Uno o ambos archivos están vacíos. Por favor, verifica que los archivos contengan datos."
          );
          return;
        }

        // Verificar que tienen las columnas necesarias
        const tarifKeys = Object.keys(filesData.tarificacion[0] || {});
        const recargaKeys = Object.keys(filesData.detalleRecargas[0] || {});

        console.log("📋 Columnas en Tarificación:", tarifKeys);
        console.log("📋 Columnas en Detalle Recargas:", recargaKeys);

        // Verificar que existe la columna MSISDN en ambos archivos
        const hasMSISDNTarif = tarifKeys.some(
          (key) => key.toLowerCase() === "msisdn"
        );
        const hasMSISDNRecarga = recargaKeys.some(
          (key) => key.toLowerCase() === "msisdn"
        );

        if (!hasMSISDNTarif || !hasMSISDNRecarga) {
          console.error(
            "❌ Error: No se encontró la columna MSISDN en uno o ambos archivos"
          );
          alert(
            "Error: No se encontró la columna MSISDN en uno o ambos archivos. Esta columna es necesaria para correlacionar los datos."
          );
          return;
        }

        setProcessingStep("Correlacionando datos por MSISDN...");
        console.log("📊 Correlacionando datos de ambos archivos...");
        console.log(
          "⏱️ Esto puede tardar varios minutos para archivos grandes..."
        );

        // Usar setTimeout para dar tiempo al UI de actualizarse
        setTimeout(async () => {
          try {
            // Correlacionar los dos archivos por MSISDN
            const correlated = correlateData(
              filesData.tarificacion,
              filesData.detalleRecargas
            );

            if (!correlated || correlated.length === 0) {
              console.error("❌ Error: La correlación no produjo resultados");
              alert(
                "Error: No se pudieron correlacionar los datos. Verifica que ambos archivos tengan MSISDNs en común."
              );
              return;
            }

            console.log(
              `✅ Datos correlacionados: ${correlated.length} registros`
            );
            console.log("📋 Muestra de datos correlacionados:", correlated[0]);

            // Extraer rango de fechas disponible
            setProcessingStep("Extrayendo rangos de fechas...");
            console.log("📅 Extrayendo rango de fechas...");
            const range = extractDateRange(correlated);
            console.log("📅 RANGO DE FECHAS EN LOS DATOS:", range);
            console.log("📊 Muestra de fechas en los datos:");
            correlated.slice(0, 5).forEach((row, i) => {
              console.log(`  Registro ${i + 1}:`, {
                "Fecha Inicial": row["Fecha Inicial"],
                Fecha: row["Fecha"],
                MSISDN: row["MSISDN"],
              });
            });
            setDateRange(range);
            setSelectedDateRange({ start: range.min, end: range.max }); // Inicialmente mostrar todo
            setTempDateRange({ start: range.min, end: range.max }); // Sincronizar temp

            // Guardar datos originales
            setOriginalData(correlated);
            setCorrelatedData(correlated);
            setFileNames({
              tarif: names.tarifFileName,
              recarga: names.recargaFileName,
            });

            // Analizar los datos correlacionados
            setProcessingStep("Generando gráficos y análisis...");
            console.log("📊 Analizando datos para gráficos...");
            const analysisResult = analyzeConsumptionData(correlated);

            if (!analysisResult) {
              console.error("❌ Error: El análisis no produjo resultados");
              return;
            }

            console.log("✅ Análisis completado:", {
              totalRecords: analysisResult.totalRecords,
              hasChartData: !!analysisResult.chartData,
            });

            setAnalysis(analysisResult);
            setSegments(null); // Reset segments when new data is loaded
            setChartKey(Date.now()); // Forzar re-render de gráficos

            setIsProcessingData(false);
            setProcessingStep("");
            console.log("✅ Procesamiento completado exitosamente");
          } catch (correlationError) {
            console.error(
              "❌ Error durante la correlación o análisis:",
              correlationError
            );
            setIsProcessingData(false);
            setProcessingStep("");
            alert(
              `Error al procesar los archivos: ${correlationError.message}\n\nSi los archivos son muy grandes (>200MB), considera dividirlos en partes más pequeñas.`
            );

            // Limpiar datos en caso de error
            setCorrelatedData(null);
            setOriginalData(null);
            setFileNames({ tarif: "", recarga: "" });
            setAnalysis(null);
            setSegments(null);
          }
        }, 100);
      } catch (error) {
        console.error("❌ Error al cargar los datos:", error);
        setIsProcessingData(false);
        setProcessingStep("");
        alert(`Error al cargar los datos: ${error.message}`);

        // Limpiar datos en caso de error
        setCorrelatedData(null);
        setOriginalData(null);
        setFileNames({ tarif: "", recarga: "" });
        setAnalysis(null);
        setSegments(null);
      }
    } else {
      // Limpiar datos
      setCorrelatedData(null);
      setOriginalData(null);
      setFileNames({ tarif: "", recarga: "" });
      setAnalysis(null);
      setSegments(null);
      setDateRange({ min: null, max: null });
      setSelectedDateRange({ start: null, end: null });
      setTempDateRange({ start: null, end: null });
    }
  };

  // Aplicar filtro de fechas
  const applyDateFilter = () => {
    console.log(`🔘🔘🔘 FUNCIÓN applyDateFilter EJECUTADA 🔘🔘🔘`);

    const start = tempDateRange.start;
    const end = tempDateRange.end;

    console.log(`📅 APLICANDO FILTRO DE FECHAS`);
    console.log(`  Fecha inicio: ${start}`);
    console.log(`  Fecha fin: ${end}`);
    console.log(`  Original Data length: ${originalData?.length}`);

    // Validar fechas
    if (!start || !end) {
      console.error("❌ ERROR: Fechas no válidas", { start, end });
      alert("Por favor selecciona ambas fechas (inicial y final)");
      return;
    }

    if (new Date(start) > new Date(end)) {
      console.warn("❌ La fecha inicial no puede ser mayor que la fecha final");
      alert("La fecha inicial no puede ser mayor que la fecha final");
      return;
    }

    if (!originalData || originalData.length === 0) {
      console.error("❌ ERROR: No hay datos originales disponibles");
      alert("No hay datos disponibles para filtrar");
      return;
    }

    // Filtrar datos
    console.log(`🔍 Iniciando filtrado...`);
    const filtered = filterDataByDateRange(originalData, start, end);
    console.log(
      `✅ Filtrado completado: ${filtered.length} de ${originalData.length} registros`
    );

    if (filtered.length === 0) {
      console.warn("⚠️ ADVERTENCIA: El filtro devolvió 0 registros!");
      alert(
        "El rango de fechas seleccionado no contiene registros. Intenta con otro rango."
      );
      return;
    }

    // Actualizar estados
    console.log("📋 Actualizando estados...");
    setSelectedDateRange({ start, end });
    setCorrelatedData(filtered);

    // Re-analizar
    console.log("📊 Re-analizando datos filtrados...");
    const analysisResult = analyzeConsumptionData(filtered);
    setAnalysis(analysisResult);

    // Forzar re-render
    const newKey = Date.now();
    setChartKey(newKey);
    console.log(`🔑 Nuevo chartKey: ${newKey}`);

    // Limpiar segmentos
    setSegments(null);

    console.log("✅✅✅ FILTRO APLICADO EXITOSAMENTE ✅✅✅");
  };

  // Restablecer filtro
  const resetDateFilter = () => {
    console.log("🔄 Restableciendo filtro de fechas");
    setTempDateRange({ start: dateRange.min, end: dateRange.max });
    setSelectedDateRange({ start: dateRange.min, end: dateRange.max });

    if (originalData) {
      setCorrelatedData(originalData);
      const analysisResult = analyzeConsumptionData(originalData);
      setAnalysis(analysisResult);
      setChartKey(Date.now());
      setSegments(null);
    }
  };

  const handleSegmentation = async () => {
    if (!correlatedData || !analysis) return;

    setIsSegmenting(true);
    try {
      console.log("🤖 Iniciando segmentación de clientes con IA...");
      const segmentationResult = await segmentUsers(correlatedData, analysis);

      // Actualizar datos con la segmentación
      setCorrelatedData(segmentationResult.data);
      setSegments(segmentationResult.segments);

      console.log("✅ Segmentación completada:", segmentationResult.segments);
    } catch (error) {
      console.error("Error en segmentación:", error);
      alert(
        "Error al generar segmentación: " +
          (error.message || "Por favor, intenta de nuevo")
      );
    } finally {
      setIsSegmenting(false);
    }
  };

  const handleSendWhatsApp = async (segmentName) => {
    setSendingWhatsApp((prev) => ({ ...prev, [segmentName]: true }));
    setWhatsAppProgress((prev) => ({
      ...prev,
      [segmentName]: { sent: 0, total: 1 },
    }));

    try {
      // Obtener información del segmento
      const segment = segments?.find((s) => s.name === segmentName);
      const segmentInfo = segment
        ? `${segment.name}: ${segment.description}`
        : segmentName;

      const myHeaders = new Headers();
      myHeaders.append(
        "Authorization",
        "App 465a2685406386854044dc3f43b09c1c-6e0af66d-2044-410a-8d32-958e1f09b20d"
      );
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Accept", "application/json");

      // Generar messageId único
      const messageId = `${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const raw = JSON.stringify({
        messages: [
          {
            from: "447860088970",
            to: "529998049373",
            messageId: messageId,
            content: {
              templateName: "test_whatsapp_template_en",
              templateData: {
                body: {
                  placeholders: [segmentInfo],
                },
              },
              language: "en",
            },
          },
        ],
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      };

      const response = await fetch(
        "https://8kl9d3.api.infobip.com/whatsapp/1/message/template",
        requestOptions
      );

      const result = await response.text();
      console.log(result);

      setWhatsAppProgress((prev) => ({
        ...prev,
        [segmentName]: { sent: 1, total: 1 },
      }));

      if (response.ok) {
        alert("✅ Mensaje de WhatsApp enviado exitosamente");
      } else {
        alert("❌ Error al enviar mensaje: " + result);
      }
    } catch (error) {
      console.error("Error enviando mensaje de WhatsApp:", error);
      alert(
        "Error al enviar mensaje: " +
          (error.message || "Por favor, intenta de nuevo")
      );
    } finally {
      setSendingWhatsApp((prev) => ({ ...prev, [segmentName]: false }));
    }
  };

  const handleSendSMS = async (segmentName) => {
    setSendingSMS((prev) => ({ ...prev, [segmentName]: true }));
    setSmsProgress((prev) => ({
      ...prev,
      [segmentName]: { sent: 0, total: 1 },
    }));

    try {
      // Obtener información del segmento
      const segment = segments?.find((s) => s.name === segmentName);
      const segmentText = segment
        ? `Hola! Eres parte del segmento "${segment.name}". ${segment.description}. Gracias por ser cliente Macropay.`
        : `Hola! Eres parte del segmento "${segmentName}". Gracias por ser cliente Macropay.`;

      const myHeaders = new Headers();
      myHeaders.append(
        "Authorization",
        "App 8a9012a04be4485f681992e3d380b477-cb387512-f772-4ccb-ba17-6edd6dc8c3b2"
      );
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Accept", "application/json");

      const raw = JSON.stringify({
        messages: [
          {
            destinations: [{ to: "529998049373" }],
            from: "444000",
            text: segmentText,
          },
          {
            destinations: [{ to: "529997743512" }],
            from: "444000",
            text: segmentText,
          },
          {
            destinations: [{ to: "529991752457" }],
            from: "444000",
            text: segmentText,
          },
        ],
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      };

      const response = await fetch(
        "https://api.infobip.com/sms/2/text/advanced",
        requestOptions
      );

      const result = await response.text();
      console.log(result);

      setSmsProgress((prev) => ({
        ...prev,
        [segmentName]: { sent: 1, total: 1 },
      }));

      if (response.ok) {
        alert("✅ Mensaje SMS enviado exitosamente");
      } else {
        alert("❌ Error al enviar SMS: " + result);
      }
    } catch (error) {
      console.error("Error enviando SMS:", error);
      alert(
        "Error al enviar SMS: " +
          (error.message || "Por favor, intenta de nuevo")
      );
    } finally {
      setSendingSMS((prev) => ({ ...prev, [segmentName]: false }));
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleExport = () => {
    if (correlatedData) {
      exportToCSV(correlatedData, `analisis_correlacionado_macropay.csv`);
    }
  };

  return (
    <div className="min-h-screen bg-macroplay-blue">
      {/* Header/Navbar */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo y Título */}
            <div className="flex items-center gap-3 md:gap-4">
              <img
                src={
                  import.meta.env.VITE_LOGO_URL ||
                  "https://macropay.mx/wp-content/uploads/2025/09/LOGO-MACROPAY_Mesa-de-trabajo-1.png"
                }
                alt="Macroplay Logo"
                style={{ height: "250px" }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <div>
                <h1 className="text-lg md:text-xl font-bold text-white">
                  Dashboard Macropay
                </h1>
                <p className="text-xs text-white/60 hidden sm:block">
                  Análisis de consumo telefónico
                </p>
              </div>
            </div>

            {/* Usuario y Logout */}
            <div className="flex items-center gap-3 md:gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm text-white font-medium">
                  {user?.username}
                </p>
                <p className="text-xs text-white/60">Usuario</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="space-y-6 md:space-y-8 animate-fadeIn">
          {/* Sección de Carga de Archivos */}
          <section>
            <div className="mb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Cargar Archivos Excel
              </h2>
              <p className="text-white/70 text-sm md:text-base">
                Sube ambos archivos Excel (Tarificación y Detalle Recargas) para
                analizar los datos correlacionados de tus clientes
              </p>
            </div>
            <FileUpload onDataLoaded={handleDataLoaded} />
          </section>

          {/* Indicador de Procesamiento */}
          {isProcessingData && (
            <section>
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-md rounded-xl p-6 border border-blue-500/30 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      Procesando Archivos...
                    </h3>
                    <p className="text-white/70 text-sm">
                      {processingStep || "Iniciando procesamiento..."}
                    </p>
                    <p className="text-white/50 text-xs mt-2">
                      Este proceso puede tardar varios minutos para archivos
                      grandes. Por favor, espera...
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Estadísticas Resumidas */}
          {analysis && !isProcessingData && (
            <section>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                  Resumen de Análisis
                </h2>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-macroplay-yellow text-macroplay-blue rounded-lg hover:bg-yellow-400 transition-colors text-sm font-medium flex items-center gap-2 shadow-lg"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Exportar CSV
                </button>
              </div>

              {/* Selector de Rango de Fechas */}
              {dateRange.min && dateRange.max && (
                <div className="mb-6 bg-gradient-to-r from-macroplay-yellow/10 to-orange-500/10 backdrop-blur-md rounded-xl p-6 border border-macroplay-yellow/30">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                    <div className="flex-shrink-0">
                      <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-macroplay-yellow"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Filtrar por Rango de Fechas
                      </h3>
                      <p className="text-white/60 text-sm">
                        Disponible: {dateRange.min} a {dateRange.max}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1 w-full lg:w-auto">
                      <div className="flex-1">
                        <label className="block text-white/70 text-sm mb-2">
                          Fecha Inicial
                        </label>
                        <input
                          type="date"
                          value={tempDateRange.start || ""}
                          min={dateRange.min}
                          max={dateRange.max}
                          onChange={(e) => {
                            console.log(
                              "🎯 onChange Fecha Inicial:",
                              e.target.value
                            );
                            setTempDateRange((prev) => ({
                              ...prev,
                              start: e.target.value,
                            }));
                          }}
                          className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:border-macroplay-yellow transition-colors"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="block text-white/70 text-sm mb-2">
                          Fecha Final
                        </label>
                        <input
                          type="date"
                          value={tempDateRange.end || ""}
                          min={tempDateRange.start || dateRange.min}
                          max={dateRange.max}
                          onChange={(e) => {
                            console.log(
                              "🎯 onChange Fecha Final:",
                              e.target.value
                            );
                            setTempDateRange((prev) => ({
                              ...prev,
                              end: e.target.value,
                            }));
                          }}
                          className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:border-macroplay-yellow transition-colors"
                        />
                      </div>

                      <div className="flex items-end gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("🔘 CLICK EN BOTÓN APLICAR");
                            console.log("  Fecha start:", tempDateRange.start);
                            console.log("  Fecha end:", tempDateRange.end);
                            applyDateFilter();
                          }}
                          type="button"
                          className="px-4 py-2 bg-macroplay-yellow text-macroplay-blue rounded-lg hover:bg-yellow-400 transition-colors text-sm font-medium whitespace-nowrap flex items-center gap-2 shadow-lg"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                            />
                          </svg>
                          Aplicar
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("🔘 CLICK EN BOTÓN RESTABLECER");
                            resetDateFilter();
                          }}
                          type="button"
                          className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium whitespace-nowrap flex items-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Restablecer
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Indicador de registros filtrados */}
                  {correlatedData &&
                    originalData &&
                    correlatedData.length !== originalData.length && (
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <p className="text-white/80 text-sm flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-macroplay-yellow"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Mostrando{" "}
                          <strong className="text-macroplay-yellow mx-1">
                            {correlatedData.length}
                          </strong>
                          de{" "}
                          <strong className="text-white mx-1">
                            {originalData.length}
                          </strong>{" "}
                          registros
                        </p>
                      </div>
                    )}
                </div>
              )}

              {/* Tarjetas de Estadísticas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm mb-1">
                        Total Registros
                      </p>
                      <p className="text-3xl font-bold text-macroplay-yellow">
                        {analysis.totalRecords}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-macroplay-yellow/20 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-macroplay-yellow"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm mb-1">Columnas</p>
                      <p className="text-3xl font-bold text-macroplay-yellow">
                        {analysis.columns.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-macroplay-yellow/20 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-macroplay-yellow"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Tarjeta de Consumo MB */}
                {(() => {
                  // Buscar la columna de Consumo MB (puede tener variaciones en el nombre)
                  const consumoMBKey = Object.keys(analysis.summary).find(
                    (key) =>
                      key.toLowerCase().includes("consumo") &&
                      key.toLowerCase().includes("mb")
                  );

                  return consumoMBKey && analysis.summary[consumoMBKey] ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-white/70 text-sm mb-1 truncate">
                            Consumo MB
                          </p>
                          <p className="text-2xl font-bold text-macroplay-yellow">
                            {Number(
                              analysis.summary[consumoMBKey].total
                            ).toLocaleString()}
                          </p>
                          <p className="text-white/50 text-xs mt-1">
                            Promedio:{" "}
                            {Number(
                              analysis.summary[consumoMBKey].average
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-macroplay-yellow/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-6 h-6 text-macroplay-yellow"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Tarjeta de Tarificacion */}
                {(() => {
                  // Buscar la columna de Tarificacion (puede tener variaciones en el nombre)
                  const tarificacionKey = Object.keys(analysis.summary).find(
                    (key) =>
                      key.toLowerCase().includes("tarificacion") ||
                      key.toLowerCase().includes("tarificación")
                  );

                  return tarificacionKey &&
                    analysis.summary[tarificacionKey] ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-white/70 text-sm mb-1 truncate">
                            Tarificacion
                          </p>
                          <p className="text-2xl font-bold text-macroplay-yellow">
                            {Number(
                              analysis.summary[tarificacionKey].total
                            ).toLocaleString()}
                          </p>
                          <p className="text-white/50 text-xs mt-1">
                            Promedio:{" "}
                            {Number(
                              analysis.summary[tarificacionKey].average
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-macroplay-yellow/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-6 h-6 text-macroplay-yellow"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Gráficos */}
              {analysis.chartData &&
                Object.keys(analysis.chartData).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-4">
                      Visualización de Datos
                      <span className="ml-2 text-xs text-white/50">
                        ({correlatedData?.length || 0} registros)
                      </span>
                    </h3>
                    <DataCharts
                      key={`charts-${chartKey}`}
                      chartData={analysis.chartData}
                    />
                  </div>
                )}

              {/* Análisis con IA */}
              {correlatedData && analysis && (
                <div className="mb-6">
                  <AIInsights
                    key={`ai-${chartKey}`}
                    data={correlatedData}
                    analysis={analysis}
                  />
                </div>
              )}

              {/* Segmentación de Clientes con IA */}
              {correlatedData &&
                analysis &&
                isGeminiConfigured() &&
                !segments &&
                !isSegmenting && (
                  <div className="mb-6">
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-600/10 backdrop-blur-md rounded-xl p-6 border border-green-500/30">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <svg
                              className="w-6 h-6 text-green-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                              />
                            </svg>
                            Segmentación Inteligente de Clientes
                          </h3>
                          <p className="text-white/70 text-sm">
                            Usa IA para clasificar automáticamente tus clientes
                            en segmentos estratégicos basados en consumo,
                            recargas y comportamiento.
                          </p>
                        </div>
                        <button
                          onClick={handleSegmentation}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl flex items-center gap-2 whitespace-nowrap"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          Segmentar Clientes con IA
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {/* Indicador de Segmentación en Proceso */}
              {isSegmenting && (
                <div className="mb-6">
                  <div className="bg-green-500/10 backdrop-blur-md rounded-xl p-6 border border-green-500/30">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      <div>
                        <p className="text-white font-semibold text-lg">
                          Segmentando clientes con IA...
                        </p>
                        <p className="text-white/60 text-sm">
                          Clasificando por consumo, recargas, estado y potencial
                          de crecimiento
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tarjetas de Segmentos */}
              {segments && segments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <svg
                      className="w-6 h-6 text-macroplay-yellow"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Segmentación Inteligente de Clientes
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {segments.map((segment, idx) => {
                      const count = correlatedData.filter(
                        (row) => row.Segmento_IA === segment.name
                      ).length;
                      const percentage = (
                        (count / correlatedData.length) *
                        100
                      ).toFixed(1);

                      const isSending = sendingWhatsApp[segment.name] || false;
                      const progress = whatsAppProgress[segment.name] || null;
                      const isSendingSMS = sendingSMS[segment.name] || false;
                      const smsProgressData = smsProgress[segment.name] || null;

                      return (
                        <div
                          key={idx}
                          className="bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/20 hover:border-white/40 transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: segment.color }}
                            ></div>
                            <span className="text-2xl font-bold text-macroplay-yellow">
                              {count}
                            </span>
                          </div>
                          <h4 className="text-white font-bold text-lg mb-2 group-hover:text-macroplay-yellow transition-colors">
                            {segment.name}
                          </h4>
                          <p className="text-white/70 text-sm mb-2">
                            {segment.description}
                          </p>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-macroplay-yellow to-yellow-500 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-white/60 text-xs font-medium">
                              {percentage}%
                            </span>
                          </div>

                          {/* Botón de WhatsApp */}
                          <button
                            onClick={() => handleSendWhatsApp(segment.name)}
                            disabled={isSending}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 disabled:bg-green-500/10 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium border border-green-500/30"
                          >
                            {isSending ? (
                              <>
                                <svg
                                  className="animate-spin h-4 w-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                {progress ? (
                                  <span>
                                    Enviando... {progress.sent}/{progress.total}
                                  </span>
                                ) : (
                                  <span>Enviando...</span>
                                )}
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                <span>Enviar WhatsApp</span>
                              </>
                            )}
                          </button>

                          {/* Botón de SMS */}
                          <button
                            onClick={() => handleSendSMS(segment.name)}
                            disabled={isSendingSMS}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:bg-blue-500/10 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium border border-blue-500/30 mt-2"
                          >
                            {isSendingSMS ? (
                              <>
                                <svg
                                  className="animate-spin h-4 w-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                {smsProgressData ? (
                                  <span>
                                    Enviando... {smsProgressData.sent}/
                                    {smsProgressData.total}
                                  </span>
                                ) : (
                                  <span>Enviando...</span>
                                )}
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                  />
                                </svg>
                                <span>Enviar SMS</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 bg-white/5 rounded-lg p-4">
                    <p className="text-white/60 text-sm flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-macroplay-yellow"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        Los clientes han sido segmentados con IA. Usa los
                        filtros de la tabla para explorar cada segmento.
                      </span>
                    </p>
                    <button
                      onClick={handleSegmentation}
                      className="mt-3 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Re-segmentar
                    </button>
                  </div>
                </div>
              )}

              {/* Tabla de Datos */}
              {correlatedData && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">
                    Vista Detallada - Datos Correlacionados
                    {segments && (
                      <span className="ml-2 text-sm font-normal text-macroplay-yellow">
                        (con segmentación IA)
                      </span>
                    )}
                  </h3>
                  <p className="text-white/60 text-sm mb-4">
                    Datos combinados de Tarificación y Detalle Recargas
                    correlacionados por MSISDN
                    {selectedDateRange.start && selectedDateRange.end && (
                      <span className="ml-2 text-macroplay-yellow">
                        (Filtrado: {selectedDateRange.start} a{" "}
                        {selectedDateRange.end})
                      </span>
                    )}
                  </p>
                  <DataTable key={`table-${chartKey}`} data={correlatedData} />
                </div>
              )}
            </section>
          )}

          {/* Mensaje cuando no hay datos */}
          {!analysis && (
            <section className="text-center py-12 md:py-16">
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 md:p-12 border border-white/10">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-macroplay-yellow"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                  No hay datos para mostrar
                </h3>
                <p className="text-white/60 text-sm md:text-base max-w-md mx-auto">
                  Carga ambos archivos Excel (Tarificación y Detalle Recargas)
                  para comenzar a analizar los datos correlacionados de tus
                  clientes
                </p>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/5 border-t border-white/10 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-white/60 text-sm">
            © 2025 Macroplay. Todos los derechos reservados. | Dashboard
            Administrativo v1.0
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
