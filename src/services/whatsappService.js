/**
 * Servicio para enviar mensajes de WhatsApp usando Infobip API
 */

const INFOBIP_API_KEY = import.meta.env.INFOBIP_SECRET || "";
const INFOBIP_FROM_NUMBER =
  import.meta.env.VITE_INFOBIP_FROM_NUMBER || "447860088970";
const INFOBIP_API_URL =
  import.meta.env.VITE_INFOBIP_API_URL || "https://pe3y38.api.infobip.com";

/**
 * Envía un mensaje de WhatsApp a un cliente usando un template
 * @param {string} toNumber - Número de teléfono del destinatario (formato internacional sin +)
 * @param {string} templateName - Nombre del template de WhatsApp
 * @param {Object} templateData - Datos para rellenar el template
 * @param {string} language - Idioma del template (default: "es")
 * @returns {Promise<Object>} - Respuesta de la API
 */
export const sendWhatsAppMessage = async (
  toNumber,
  templateName = "test_whatsapp_template_en",
  templateData = { body: { placeholders: [] } },
  language = "es"
) => {
  if (!INFOBIP_API_KEY) {
    throw new Error(
      "INFOBIP_API_KEY no está configurada en las variables de entorno"
    );
  }

  // Limpiar el número de teléfono (remover espacios, guiones, etc.)
  const cleanNumber = toNumber.replace(/[\s\-\(\)]/g, "");

  const myHeaders = new Headers();
  myHeaders.append("Authorization", `App ${INFOBIP_API_KEY}`);
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Accept", "application/json");

  const raw = JSON.stringify({
    messages: [
      {
        from: INFOBIP_FROM_NUMBER,
        to: "529998049373",
        messageId: `msg-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        content: {
          templateName: templateName,
          templateData: templateData,
          language: language,
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

  try {
    const response = await fetch(
      `${INFOBIP_API_URL}/whatsapp/1/message/template`,
      requestOptions
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error enviando mensaje de WhatsApp:", error);
    throw error;
  }
};

/**
 * Envía mensajes de WhatsApp a múltiples clientes de un segmento
 * @param {Array} clients - Array de clientes (deben tener MSISDN)
 * @param {string} templateName - Nombre del template
 * @param {Function} getTemplateData - Función que recibe un cliente y retorna los datos del template
 * @param {string} language - Idioma del template
 * @param {Function} onProgress - Callback para reportar progreso (sent, total, current)
 * @returns {Promise<Object>} - Resultado con estadísticas
 */
export const sendBulkWhatsAppMessages = async (
  clients,
  templateName = "test_whatsapp_template_en",
  getTemplateData = (client) => ({
    body: { placeholders: [client.MSISDN || "Cliente"] },
  }),
  language = "es",
  onProgress = null
) => {
  const results = {
    total: clients.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  // Buscar la columna MSISDN (puede tener variaciones)
  const msisdnColumn =
    clients.length > 0
      ? Object.keys(clients[0]).find(
          (key) =>
            key.toLowerCase() === "msisdn" ||
            key.toLowerCase().includes("telefono") ||
            key.toLowerCase().includes("phone")
        )
      : null;

  if (!msisdnColumn) {
    throw new Error(
      "No se encontró la columna MSISDN en los datos de clientes"
    );
  }

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const msisdn = client[msisdnColumn];

    if (!msisdn) {
      results.failed++;
      results.errors.push({
        client: client,
        error: "No se encontró MSISDN",
      });
      continue;
    }

    try {
      const templateData = getTemplateData(client);
      await sendWhatsAppMessage(msisdn, templateName, templateData, language);
      results.sent++;

      if (onProgress) {
        onProgress(results.sent, results.total, i + 1);
      }

      // Pequeña pausa para evitar rate limiting
      if (i < clients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        client: client,
        error: error.message,
      });
      console.error(`Error enviando a ${msisdn}:`, error);
    }
  }

  return results;
};

/**
 * Verifica si la API key de Infobip está configurada
 */
export const isWhatsAppConfigured = () => {
  return !!INFOBIP_API_KEY;
};
