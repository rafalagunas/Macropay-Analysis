/**
 * Servicio para integración con Google Gemini AI
 *
 * Modelos disponibles:
 * - gemini-1.5-flash: Más rápido y eficiente (recomendado)
 * - gemini-1.5-pro: Más capacidad para análisis complejos
 * - gemini-1.0-pro: Modelo anterior (legacy)
 */

const GEM_API_KEY = "AIzaSyCZVJahBlkJKojr9Q8qULPRybh25qtvikQ";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

// Cache para modelos disponibles
let availableModelsCache = null;

/**
 * Lista los modelos disponibles para la API key actual
 */
const listAvailableModels = async () => {
  if (availableModelsCache) {
    return availableModelsCache;
  }

  try {
    const response = await fetch(
      `${GEMINI_BASE_URL}/v1beta/models?key=${GEM_API_KEY}`
    );

    if (!response.ok) {
      console.error("Error al listar modelos:", response.status);
      return [];
    }

    const data = await response.json();
    const models = data.models || [];

    // Filtrar solo modelos que soporten generateContent
    const supportedModels = models
      .filter((model) =>
        model.supportedGenerationMethods?.includes("generateContent")
      )
      .map((model) => model.name);

    console.log("Modelos disponibles:", supportedModels);
    availableModelsCache = supportedModels;
    return supportedModels;
  } catch (error) {
    console.error("Error al listar modelos:", error);
    return [];
  }
};

/**
 * Analiza los datos de consumo telefónico y genera recomendaciones
 */
export const analyzeDataWithAI = async (data, analysis) => {
  if (!GEM_API_KEY) {
    throw new Error(
      "GEM_API_KEY no está configurada en las variables de entorno"
    );
  }

  try {
    // Primero, obtener la lista de modelos disponibles
    console.log("Obteniendo modelos disponibles...");
    const availableModels = await listAvailableModels();

    if (availableModels.length === 0) {
      throw new Error(
        "No se pudieron obtener los modelos disponibles. Verifica tu API key."
      );
    }

    // Preferencia de modelos (en orden)
    const preferredModels = [
      "gemini-2.5-flash-latest",
      "gemini-2.5-pro-latest",
      "gemini-1.5-pro",
      "gemini-pro",
      "gemini-1.0-pro",
    ];

    // Encontrar el primer modelo disponible de nuestra lista de preferencias
    let modelToUse = null;
    for (const preferred of preferredModels) {
      const found = availableModels.find((model) => model.includes(preferred));
      if (found) {
        modelToUse = found;
        console.log(`Usando modelo: ${modelToUse}`);
        break;
      }
    }

    // Si no encontramos ninguno de los preferidos, usar el primero disponible
    if (!modelToUse && availableModels.length > 0) {
      modelToUse = availableModels[0];
      console.log(`Usando primer modelo disponible: ${modelToUse}`);
    }

    if (!modelToUse) {
      throw new Error(
        "No hay modelos disponibles que soporten generateContent"
      );
    }

    // Construir la URL completa
    const modelUrl = `${GEMINI_BASE_URL}/v1beta/${modelToUse}:generateContent`;

    // Intentar analizar con el modelo encontrado
    return await tryAnalyzeWithModel(modelUrl, data, analysis);
  } catch (error) {
    console.error("Error en analyzeDataWithAI:", error);
    throw error;
  }
};

/**
 * Intenta analizar con un modelo específico (con reintentos automáticos)
 */
const tryAnalyzeWithModel = async (
  modelUrl,
  data,
  analysis,
  retryCount = 0,
  maxRetries = 3
) => {
  try {
    // Preparar un resumen de los datos para enviar a Gemini
    const dataSummary = prepareDataSummary(data, analysis);

    const prompt = `Eres un experto analista de datos de telecomunicaciones y estratega de ventas para Macropay, una empresa de telefonía móvil en México.

Analiza los siguientes datos CORRELACIONADOS de tarificación y recargas de clientes y proporciona recomendaciones estratégicas.

Los datos combinan:
- Información de TARIFICACIÓN: Consumo_MB, Tarificacion, Ofertas
- Información de RECARGAS: Total_Recargas, fechas de activación y última recarga
- Métricas CALCULADAS: Estado_Cliente, Dias_Sin_Recarga, Dias_Sin_Consumo

DATOS CORRELACIONADOS RESUMIDOS:
${dataSummary}

Por favor, proporciona un análisis detallado en formato estructurado con las siguientes secciones:

1. **INSIGHTS CLAVE**: 3-4 observaciones importantes sobre los patrones de consumo, recargas y estado de clientes

2. **OPORTUNIDADES DE VENTA**:
   - Identificación de clientes con potencial de upgrade (alto consumo, muchas recargas)
   - Clientes candidatos a migración de prepago a pospago
   - Productos o planes recomendados para cada segmento
   - Estrategias de cross-selling basadas en comportamiento de recargas

3. **RETENCIÓN DE CLIENTES**:
   - Clientes en riesgo (Estado_Cliente = "En Riesgo" o "Inactivo", días sin recarga > 30)
   - Acciones preventivas para reactivar clientes con "Baja Actividad"
   - Programas de fidelización sugeridos

4. **PROSPECCIÓN Y CRECIMIENTO**:
   - Segmentos de mercado desatendidos
   - Nuevas oportunidades de negocio
   - Estrategias de expansión regional

5. **RECOMENDACIONES ACCIONABLES**:
   - Top 5 acciones prioritarias a implementar
   - KPIs a monitorear
   - Proyección de impacto estimado

Sé específico, usa los números reales de los datos, y proporciona recomendaciones prácticas y accionables.`;

    const response = await fetch(`${modelUrl}?key=${GEM_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192, // Aumentado para respuestas más completas (era 2048)
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorCode = errorData.error?.code;
      const errorMessage =
        errorData.error?.message || "Error al comunicarse con Gemini AI";

      // Si el modelo está sobrecargado (503) o hay rate limit (429), reintentar
      if ((errorCode === 503 || errorCode === 429) && retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 2000; // Espera exponencial: 2s, 4s, 8s
        console.log(
          `Modelo sobrecargado. Reintentando en ${
            waitTime / 1000
          } segundos... (Intento ${retryCount + 1}/${maxRetries})`
        );

        // Esperar antes de reintentar
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // Reintentar recursivamente
        return await tryAnalyzeWithModel(
          modelUrl,
          data,
          analysis,
          retryCount + 1,
          maxRetries
        );
      }

      // Si se alcanzó el límite de tokens (MAX_TOKENS), no reintentar más
      if (errorMessage === "MAX_TOKENS") {
        throw new Error(
          "La respuesta es muy larga. Intenta con menos datos o un modelo diferente."
        );
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];
    const aiResponse = candidate?.content?.parts?.[0]?.text;
    const finishReason = candidate?.finishReason;

    // Verificar si la respuesta se cortó por límite de tokens
    if (finishReason === "MAX_TOKENS") {
      console.warn(
        "⚠️ La respuesta se cortó por límite de tokens. Reintentando con límite mayor..."
      );
      throw new Error("MAX_TOKENS");
    }

    if (!aiResponse || aiResponse.trim() === "") {
      console.error("Respuesta de API:", result);
      throw new Error("No se recibió respuesta válida de Gemini AI");
    }

    return {
      success: true,
      analysis: aiResponse,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error en tryAnalyzeWithModel:", error);
    throw error;
  }
};

/**
 * Prepara un resumen de los datos correlacionados para enviar a Gemini
 */
const prepareDataSummary = (data, analysis) => {
  const summary = [];

  // Información básica
  summary.push(`Total de registros correlacionados: ${analysis.totalRecords}`);
  summary.push(
    `Datos combinados de Tarificación y Detalle Recargas por MSISDN`
  );
  summary.push(`Columnas disponibles: ${analysis.columns.join(", ")}`);

  // Resaltar columnas clave de los datos correlacionados
  if (analysis.columns) {
    const hasEstadoCliente = analysis.columns.includes("Estado_Cliente");
    const hasDiasSinRecarga = analysis.columns.includes("Dias_Sin_Recarga");
    const hasTotalRecargas = analysis.columns.includes("Total_Recargas");

    if (hasEstadoCliente || hasDiasSinRecarga || hasTotalRecargas) {
      summary.push("\n📊 MÉTRICAS CLAVE DISPONIBLES:");
      if (hasEstadoCliente)
        summary.push(
          "  ✓ Estado_Cliente (Activo, En Riesgo, Inactivo, Baja Actividad, Sin Recargas)"
        );
      if (hasDiasSinRecarga)
        summary.push(
          "  ✓ Dias_Sin_Recarga (días transcurridos desde última recarga)"
        );
      if (hasTotalRecargas)
        summary.push("  ✓ Total_Recargas (número de recargas por MSISDN)");
    }
  }

  // Estadísticas numéricas
  if (analysis.summary && Object.keys(analysis.summary).length > 0) {
    summary.push("\nESTADÍSTICAS NUMÉRICAS:");
    Object.entries(analysis.summary).forEach(([key, stats]) => {
      summary.push(`- ${key}:`);
      summary.push(`  Total: ${stats.total}`);
      summary.push(`  Promedio: ${stats.average}`);
      summary.push(`  Máximo: ${stats.max}`);
      summary.push(`  Mínimo: ${stats.min}`);
    });
  }

  // Distribuciones categóricas
  if (analysis.chartData?.barChart) {
    summary.push("\nDISTRIBUCIÓN POR CATEGORÍA:");
    analysis.chartData.barChart.labels.forEach((label, index) => {
      summary.push(
        `- ${label}: ${analysis.chartData.barChart.data[index]} registros`
      );
    });
  }

  // Tendencias temporales
  if (analysis.chartData?.lineChart) {
    summary.push("\nTENDENCIA TEMPORAL:");
    analysis.chartData.lineChart.labels.forEach((label, index) => {
      summary.push(
        `- ${label}: ${analysis.chartData.lineChart.data[index]} registros`
      );
    });
  }

  // Muestra de datos reales (primeros 5 registros)
  summary.push("\nMUESTRA DE DATOS (primeros 5 registros):");
  data.slice(0, 5).forEach((row, index) => {
    summary.push(`Registro ${index + 1}:`);
    Object.entries(row).forEach(([key, value]) => {
      summary.push(`  ${key}: ${value}`);
    });
  });

  return summary.join("\n");
};

/**
 * Segmenta usuarios automáticamente usando IA
 */
export const segmentUsers = async (data, analysis) => {
  if (!GEM_API_KEY) {
    throw new Error("GEM_API_KEY no está configurada");
  }

  try {
    console.log("Segmentando usuarios con IA...");

    // Obtener modelos disponibles
    const availableModels = await listAvailableModels();
    if (availableModels.length === 0) {
      throw new Error("No hay modelos disponibles");
    }

    // Usar el primer modelo disponible
    const preferredModels = [
      "gemini-2.5-pro-latest",
      "gemini-2.5-flash-latest",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ];

    let modelToUse = null;
    for (const preferred of preferredModels) {
      const found = availableModels.find((model) => model.includes(preferred));
      if (found) {
        modelToUse = found;
        break;
      }
    }

    if (!modelToUse) {
      modelToUse = availableModels[0];
    }

    const modelUrl = `${GEMINI_BASE_URL}/v1beta/${modelToUse}:generateContent`;

    // Extraer rangos de fechas de los datos
    const dateColumns = [
      "Fecha Inicial",
      "Fecha Fin",
      "Fecha",
      "Fecha Ultimo Consumo",
      "Fecha Activacion",
      "Fecha Ultima Recarga",
    ];
    const dateRanges = {};

    dateColumns.forEach((col) => {
      const dates = data
        .map((row) => row[col])
        .filter((d) => d && d !== "")
        .map((d) => {
          // Convertir a Date si es necesario
          if (typeof d === "number") {
            // Excel serial number
            const excelEpoch = new Date(1899, 11, 30);
            return new Date(
              excelEpoch.getTime() + Math.floor(d) * 24 * 60 * 60 * 1000
            );
          }
          return new Date(d);
        })
        .filter((d) => !isNaN(d.getTime()));

      if (dates.length > 0) {
        const min = new Date(Math.min(...dates.map((d) => d.getTime())));
        const max = new Date(Math.max(...dates.map((d) => d.getTime())));
        dateRanges[col] = {
          min: min.toISOString().split("T")[0],
          max: max.toISOString().split("T")[0],
        };
      }
    });

    // Calcular el periodo total de los datos
    let dateContext = "";
    if (dateRanges["Fecha Inicial"] || dateRanges["Fecha"]) {
      const mainRange = dateRanges["Fecha Inicial"] || dateRanges["Fecha"];
      const startDate = new Date(mainRange.min);
      const endDate = new Date(mainRange.max);
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = Math.round(diffDays / 30);

      dateContext = `\nPERIODO DE DATOS: ${mainRange.min} a ${
        mainRange.max
      } (${diffDays} días, ~${diffMonths} ${
        diffMonths === 1 ? "mes" : "meses"
      })`;
      if (diffMonths <= 1) {
        dateContext += `\n⚠️ IMPORTANTE: Los datos cubren solo UN MES. Ajusta los criterios de segmentación en consecuencia.`;
      }
    }

    // Calcular estadísticas específicas de Consumo MB y Fecha Ultima Recarga
    const consumoMBCol = Object.keys(data[0] || {}).find(
      (col) =>
        col.toLowerCase().includes("consumo") &&
        col.toLowerCase().includes("mb")
    );
    const fechaUltimaRecargaCol = Object.keys(data[0] || {}).find(
      (col) =>
        col.toLowerCase().includes("fecha ultima recarga") ||
        col.toLowerCase().includes("fecha_ultima_recarga")
    );

    // Calcular estadísticas de Consumo MB
    let consumoStats = {};
    if (consumoMBCol) {
      const consumos = data
        .map((row) => Number(row[consumoMBCol]) || 0)
        .filter((c) => c > 0);
      if (consumos.length > 0) {
        consumoStats = {
          min: Math.min(...consumos),
          max: Math.max(...consumos),
          promedio: consumos.reduce((a, b) => a + b, 0) / consumos.length,
          mediana: consumos.sort((a, b) => a - b)[
            Math.floor(consumos.length / 2)
          ],
        };
      }
    }

    // Calcular estadísticas de días desde última recarga
    let diasRecargaStats = {};
    if (fechaUltimaRecargaCol) {
      const hoy = new Date();
      hoy.setUTCHours(0, 0, 0, 0);

      const diasDesdeRecarga = data
        .map((row) => {
          const fechaRecarga = row[fechaUltimaRecargaCol];
          if (!fechaRecarga) return null;

          let fecha;
          if (typeof fechaRecarga === "number") {
            const days = Math.floor(fechaRecarga) - 25569;
            fecha = new Date(days * 24 * 60 * 60 * 1000);
          } else {
            fecha = new Date(fechaRecarga);
          }

          if (isNaN(fecha.getTime())) return null;

          fecha.setUTCHours(0, 0, 0, 0);
          const diffTime = hoy.getTime() - fecha.getTime();
          return Math.floor(diffTime / (1000 * 60 * 60 * 24));
        })
        .filter((d) => d !== null && d >= 0);

      if (diasDesdeRecarga.length > 0) {
        diasRecargaStats = {
          min: Math.min(...diasDesdeRecarga),
          max: Math.max(...diasDesdeRecarga),
          promedio:
            diasDesdeRecarga.reduce((a, b) => a + b, 0) /
            diasDesdeRecarga.length,
          mediana: diasDesdeRecarga.sort((a, b) => a - b)[
            Math.floor(diasDesdeRecarga.length / 2)
          ],
        };
      }
    }

    // Preparar un resumen REDUCIDO solo para segmentación (evitar MAX_TOKENS)
    const shortSummary = `Total registros: ${data.length}
Columnas: ${Object.keys(data[0] || {}).join(", ")}${dateContext}
Rangos de fechas detectados: ${JSON.stringify(dateRanges, null, 2)}
Estadísticas Consumo MB: ${JSON.stringify(consumoStats)}
Estadísticas Días desde Última Recarga: ${JSON.stringify(diasRecargaStats)}`;

    const prompt = `Eres un experto en segmentación de clientes para Macropay (telefonía móvil en México).

Analiza estos datos CORRELACIONADOS (Tarificación + Recargas) y define 4-6 segmentos claros de clientes basados ÚNICAMENTE en:
1. CONSUMO MB (Consumo MB): Cantidad de megabytes consumidos
2. FECHA ÚLTIMA RECARGA (Fecha Ultima Recarga): Días transcurridos desde la última recarga

CRITERIOS DE SEGMENTACIÓN:
- Combina rangos de Consumo MB (bajo, medio, alto) con antigüedad de última recarga (reciente, media, antigua)
- Ejemplos de segmentos:
  * Alto Consumo + Recarga Reciente = Clientes VIP Activos
  * Alto Consumo + Recarga Antigua = Clientes en Riesgo (alto valor pero inactivos)
  * Bajo Consumo + Recarga Reciente = Clientes Leales de Bajo Consumo
  * Bajo Consumo + Recarga Antigua = Clientes Inactivos

DATOS:
${shortSummary}

IMPORTANTE: Responde SOLO con el JSON. NO agregues explicaciones ni texto adicional. Tu respuesta debe ser ÚNICAMENTE un JSON válido con este formato exacto:

{
  "segments": [
    {
      "name": "Clientes VIP Activos",
      "description": "Alto consumo MB y recarga reciente",
      "criteria": "Consumo MB > [valor] Y Días desde Última Recarga < [días]",
      "color": "#FFD700"
    },
    {
      "name": "En Riesgo - Alto Valor",
      "description": "Alto consumo MB pero recarga antigua",
      "criteria": "Consumo MB > [valor] Y Días desde Última Recarga > [días]",
      "color": "#FF4444"
    },
    {
      "name": "Clientes Leales",
      "description": "Consumo medio-bajo pero recarga reciente",
      "criteria": "Consumo MB < [valor] Y Días desde Última Recarga < [días]",
      "color": "#4CAF50"
    }
  ],
  "rules": [
    {
      "segment": "Clientes VIP Activos",
      "conditions": "si campo 'Consumo MB' > [valor] y días desde 'Fecha Ultima Recarga' < [días]"
    },
    {
      "segment": "En Riesgo - Alto Valor",
      "conditions": "si campo 'Consumo MB' > [valor] y días desde 'Fecha Ultima Recarga' > [días]"
    }
  ]
}

Usa los valores de las estadísticas proporcionadas para definir los umbrales. Define 4-6 segmentos relevantes. RESPONDE SOLO CON EL JSON, SIN TEXTO ADICIONAL.`;

    const response = await fetch(`${modelUrl}?key=${GEM_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: "application/json", // Forzar respuesta JSON
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Error al segmentar usuarios");
    }

    const result = await response.json();
    console.log(
      "📊 Respuesta completa de Gemini:",
      JSON.stringify(result, null, 2)
    );

    const finishReason = result.candidates?.[0]?.finishReason;
    const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

    // Verificar si se quedó sin tokens
    if (finishReason === "MAX_TOKENS") {
      console.error("❌ ERROR: Respuesta cortada por MAX_TOKENS");
      throw new Error(
        "MAX_TOKENS: El modelo se quedó sin espacio. Usando segmentación básica."
      );
    }

    if (!aiResponse || aiResponse.trim() === "") {
      console.error("❌ ERROR: No hay contenido en la respuesta");
      throw new Error("No se recibió respuesta de segmentación");
    }

    // Extraer JSON de la respuesta
    let segmentData;
    try {
      // Limpiar la respuesta (remover markdown si existe)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        segmentData = JSON.parse(jsonMatch[0]);
      } else {
        segmentData = JSON.parse(aiResponse);
      }
    } catch (e) {
      console.error("Error parseando JSON de segmentación:", aiResponse);
      throw new Error("No se pudo parsear la segmentación");
    }

    console.log("Segmentos definidos:", segmentData.segments);

    // Aplicar segmentación a cada registro
    const segmentedData = data.map((row) => {
      const segment = assignSegment(row, segmentData, analysis);
      return {
        ...row,
        Segmento_IA: segment.name,
        Segmento_Color: segment.color,
      };
    });

    return {
      data: segmentedData,
      segments: segmentData.segments,
    };
  } catch (error) {
    console.error("Error en segmentUsers:", error);
    // Si falla la segmentación por IA, usar una básica
    return fallbackSegmentation(data, analysis);
  }
};

/**
 * Asigna un segmento a un usuario basado en Consumo MB y Fecha Ultima Recarga
 */
const assignSegment = (row, segmentData, analysis) => {
  const segments = segmentData.segments;

  // Buscar columnas de Consumo MB y Fecha Ultima Recarga
  const consumoMBCol = Object.keys(row).find(
    (key) =>
      key.toLowerCase().includes("consumo") && key.toLowerCase().includes("mb")
  );
  const fechaUltimaRecargaCol = Object.keys(row).find(
    (key) =>
      key.toLowerCase().includes("fecha ultima recarga") ||
      key.toLowerCase().includes("fecha_ultima_recarga")
  );

  // Obtener valores
  const consumoMB = consumoMBCol ? Number(row[consumoMBCol]) || 0 : 0;

  // Calcular días desde última recarga
  let diasDesdeRecarga = null;
  if (fechaUltimaRecargaCol) {
    const fechaRecarga = row[fechaUltimaRecargaCol];
    if (fechaRecarga) {
      let fecha;
      if (typeof fechaRecarga === "number") {
        const days = Math.floor(fechaRecarga) - 25569;
        fecha = new Date(days * 24 * 60 * 60 * 1000);
      } else {
        fecha = new Date(fechaRecarga);
      }

      if (!isNaN(fecha.getTime())) {
        const hoy = new Date();
        hoy.setUTCHours(0, 0, 0, 0);
        fecha.setUTCHours(0, 0, 0, 0);
        const diffTime = hoy.getTime() - fecha.getTime();
        diasDesdeRecarga = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }
    }
  }

  // Calcular umbrales dinámicos basados en el análisis si está disponible
  let consumoMedio = 5000; // Valores por defecto
  let consumoAlto = 7500;
  let consumoBajo = 2500;

  if (
    analysis &&
    analysis.summary &&
    consumoMBCol &&
    analysis.summary[consumoMBCol]
  ) {
    consumoMedio = Number(analysis.summary[consumoMBCol].average) || 5000;
    consumoAlto = consumoMedio * 1.5;
    consumoBajo = consumoMedio * 0.5;
  }

  // Evaluar cada segmento basado en las reglas
  for (const segment of segments) {
    const criteria = segment.criteria || "";
    const conditions =
      segmentData.rules?.find((r) => r.segment === segment.name)?.conditions ||
      "";
    const desc = (segment.description || "").toLowerCase();

    // Evaluar criterios basados en Consumo MB y Días desde Última Recarga
    let matchesConsumo = true;
    let matchesRecarga = true;

    // Verificar Consumo MB
    const criteriaLower = criteria.toLowerCase();
    const conditionsLower = conditions.toLowerCase();

    // Buscar umbrales en el criterio
    const consumoMatch =
      criteria.match(/consumo\s*mb\s*([><=]+)\s*(\d+)/i) ||
      conditionsLower.match(/consumo\s*mb\s*([><=]+)\s*(\d+)/i);

    if (consumoMatch) {
      const operator = consumoMatch[1].trim();
      const threshold = Number(consumoMatch[2]);

      if (operator.includes(">")) {
        matchesConsumo = consumoMB > threshold;
      } else if (operator.includes("<")) {
        matchesConsumo = consumoMB < threshold;
      } else if (operator.includes("=")) {
        matchesConsumo = Math.abs(consumoMB - threshold) <= 100; // Tolerancia
      }
    } else {
      // Fallback: usar descripción y umbrales dinámicos
      if (
        desc.includes("alto consumo") ||
        conditionsLower.includes("alto consumo")
      ) {
        matchesConsumo = consumoMB >= consumoAlto;
      } else if (
        desc.includes("bajo consumo") ||
        conditionsLower.includes("bajo consumo")
      ) {
        matchesConsumo = consumoMB <= consumoBajo;
      } else if (desc.includes("medio") || conditionsLower.includes("medio")) {
        matchesConsumo = consumoMB >= consumoBajo && consumoMB <= consumoAlto;
      }
    }

    // Verificar Días desde Última Recarga
    if (diasDesdeRecarga !== null) {
      const diasMatch =
        criteria.match(
          /días?\s*desde\s*última\s*recarga\s*([><=]+)\s*(\d+)/i
        ) ||
        conditionsLower.match(
          /días?\s*desde\s*última\s*recarga\s*([><=]+)\s*(\d+)/i
        ) ||
        conditionsLower.match(/recarga\s*([><=]+)\s*(\d+)/i);

      if (diasMatch) {
        const operator = diasMatch[1].trim();
        const threshold = Number(diasMatch[2]);

        if (operator.includes(">")) {
          matchesRecarga = diasDesdeRecarga > threshold;
        } else if (operator.includes("<")) {
          matchesRecarga = diasDesdeRecarga < threshold;
        } else if (operator.includes("=")) {
          matchesRecarga = Math.abs(diasDesdeRecarga - threshold) <= 5; // Tolerancia
        }
      } else {
        // Fallback: usar descripción
        if (desc.includes("reciente") || conditionsLower.includes("reciente")) {
          matchesRecarga = diasDesdeRecarga <= 7;
        } else if (
          desc.includes("antigua") ||
          conditionsLower.includes("antigua")
        ) {
          matchesRecarga = diasDesdeRecarga > 30;
        } else if (
          desc.includes("media") ||
          conditionsLower.includes("media")
        ) {
          matchesRecarga = diasDesdeRecarga > 7 && diasDesdeRecarga <= 30;
        }
      }
    } else {
      // Si no hay fecha de recarga
      if (
        conditionsLower.includes("recarga") &&
        !conditionsLower.includes("sin recarga")
      ) {
        matchesRecarga = false; // Requiere recarga pero no hay fecha
      }
    }

    // El segmento coincide si ambas condiciones se cumplen (AND)
    if (matchesConsumo && matchesRecarga) {
      return segment;
    }
  }

  // Por defecto, asignar el primer segmento
  return segments[0] || { name: "Sin Clasificar", color: "#999999" };
};

/**
 * Segmentación de respaldo basada en Consumo MB y Fecha Ultima Recarga
 */
const fallbackSegmentation = (data, analysis) => {
  console.log(
    "Usando segmentación de respaldo basada en Consumo MB y Fecha Ultima Recarga..."
  );

  // Buscar columnas
  const consumoMBCol = Object.keys(data[0] || {}).find(
    (key) =>
      key.toLowerCase().includes("consumo") && key.toLowerCase().includes("mb")
  );
  const fechaUltimaRecargaCol = Object.keys(data[0] || {}).find(
    (key) =>
      key.toLowerCase().includes("fecha ultima recarga") ||
      key.toLowerCase().includes("fecha_ultima_recarga")
  );

  // Calcular umbrales basados en los datos
  const consumos = data
    .map((row) => Number(row[consumoMBCol]) || 0)
    .filter((c) => c > 0);

  const consumoMedio =
    consumos.length > 0
      ? consumos.reduce((a, b) => a + b, 0) / consumos.length
      : 0;
  const consumoAlto = consumoMedio * 1.5;
  const consumoBajo = consumoMedio * 0.5;

  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);

  const segmentedData = data.map((row) => {
    const consumoMB = consumoMBCol ? Number(row[consumoMBCol]) || 0 : 0;

    // Calcular días desde última recarga
    let diasDesdeRecarga = null;
    if (fechaUltimaRecargaCol) {
      const fechaRecarga = row[fechaUltimaRecargaCol];
      if (fechaRecarga) {
        let fecha;
        if (typeof fechaRecarga === "number") {
          const days = Math.floor(fechaRecarga) - 25569;
          fecha = new Date(days * 24 * 60 * 60 * 1000);
        } else {
          fecha = new Date(fechaRecarga);
        }

        if (!isNaN(fecha.getTime())) {
          fecha.setUTCHours(0, 0, 0, 0);
          const diffTime = hoy.getTime() - fecha.getTime();
          diasDesdeRecarga = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
      }
    }

    // Segmentar basado en Consumo MB y Días desde Última Recarga
    let segment;

    if (
      consumoMB >= consumoAlto &&
      (diasDesdeRecarga === null || diasDesdeRecarga <= 7)
    ) {
      // Alto consumo + recarga reciente
      segment = {
        name: "VIP Activos",
        description: `Alto consumo (${Math.round(
          consumoMB
        )} MB) y recarga reciente`,
        color: "#FFD700",
      };
    } else if (
      consumoMB >= consumoAlto &&
      diasDesdeRecarga !== null &&
      diasDesdeRecarga > 30
    ) {
      // Alto consumo + recarga antigua
      segment = {
        name: "En Riesgo - Alto Valor",
        description: `Alto consumo (${Math.round(
          consumoMB
        )} MB) pero sin recarga reciente (${diasDesdeRecarga} días)`,
        color: "#FF4444",
      };
    } else if (
      consumoMB >= consumoMedio &&
      (diasDesdeRecarga === null || diasDesdeRecarga <= 15)
    ) {
      // Consumo medio + recarga reciente
      segment = {
        name: "Clientes Activos",
        description: `Consumo medio (${Math.round(
          consumoMB
        )} MB) y recarga reciente`,
        color: "#4CAF50",
      };
    } else if (
      consumoMB < consumoBajo &&
      (diasDesdeRecarga === null || diasDesdeRecarga <= 7)
    ) {
      // Bajo consumo + recarga reciente
      segment = {
        name: "Clientes Leales",
        description: `Bajo consumo (${Math.round(
          consumoMB
        )} MB) pero recarga reciente`,
        color: "#2196F3",
      };
    } else if (diasDesdeRecarga !== null && diasDesdeRecarga > 30) {
      // Sin recarga reciente
      segment = {
        name: "Clientes Inactivos",
        description: `Sin recarga reciente (${diasDesdeRecarga} días)`,
        color: "#999999",
      };
    } else {
      // Por defecto
      segment = {
        name: "Clientes Regulares",
        description: `Consumo: ${Math.round(consumoMB)} MB, Días sin recarga: ${
          diasDesdeRecarga !== null ? diasDesdeRecarga : "N/A"
        }`,
        color: "#FFA500",
      };
    }

    return {
      ...row,
      Segmento_IA: segment.name,
      Segmento_Color: segment.color,
    };
  });

  // Extraer segmentos únicos con sus descripciones
  const uniqueSegments = [];
  const segmentMap = new Map();

  segmentedData.forEach((row) => {
    if (!segmentMap.has(row.Segmento_IA)) {
      // Buscar la descripción original del segmento
      const segmentDescription =
        row.Segmento_IA === "VIP Activos"
          ? "Alto consumo MB y recarga reciente"
          : row.Segmento_IA === "En Riesgo - Alto Valor"
          ? "Alto consumo MB pero recarga antigua"
          : row.Segmento_IA === "Clientes Activos"
          ? "Consumo medio MB y recarga reciente"
          : row.Segmento_IA === "Clientes Leales"
          ? "Bajo consumo MB pero recarga reciente"
          : row.Segmento_IA === "Clientes Inactivos"
          ? "Sin recarga reciente"
          : "Clientes regulares";

      segmentMap.set(row.Segmento_IA, {
        name: row.Segmento_IA,
        description: segmentDescription,
        color: row.Segmento_Color,
      });
    }
  });
  uniqueSegments.push(...Array.from(segmentMap.values()));

  return {
    data: segmentedData,
    segments: uniqueSegments,
  };
};

/**
 * Verifica si la API key está configurada
 */
export const isGeminiConfigured = () => {
  return !!GEM_API_KEY;
};
