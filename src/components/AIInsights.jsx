import React, { useState } from "react";
import {
  analyzeDataWithAI,
  isGeminiConfigured,
} from "../services/geminiService";

const AIInsights = ({ data, analysis }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await analyzeDataWithAI(data, analysis);
      setAiAnalysis(result);
      setIsExpanded(true);
    } catch (err) {
      const errorMsg = err.message || "Error al generar el análisis con IA";

      // Mensaje más amigable para error 503
      if (errorMsg.includes("overloaded")) {
        setError(
          "El servidor de Gemini está sobrecargado en este momento. Por favor intenta nuevamente en unos minutos."
        );
      } else {
        setError(errorMsg);
      }

      console.error("Error en análisis IA:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Función helper para procesar texto con negritas
  const processTextWithBold = (text) => {
    if (!text || !text.includes("**")) return text;

    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="text-white font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const formatAIResponse = (text) => {
    const lines = text.split("\n");
    const sections = [];
    let currentSection = null;
    let currentSubsection = null;
    let currentList = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Separador de secciones ---
      if (trimmed === "---") {
        if (currentList.length > 0) {
          if (currentSubsection) {
            currentSubsection.items.push({
              type: "list",
              items: [...currentList],
            });
          } else if (currentSection) {
            currentSection.items.push({
              type: "list",
              items: [...currentList],
            });
          }
          currentList = [];
        }
        if (currentSubsection && currentSection) {
          currentSection.items.push(currentSubsection);
          currentSubsection = null;
        }
        if (currentSection) {
          sections.push(currentSection);
          currentSection = null;
        }
        return;
      }

      // Títulos principales con ### (Nivel 1)
      if (trimmed.match(/^###\s+(\d+)\.\s+(.+)$/)) {
        const match = trimmed.match(/^###\s+(\d+)\.\s+(.+)$/);
        if (currentList.length > 0 && currentSection) {
          currentSection.items.push({ type: "list", items: [...currentList] });
          currentList = [];
        }
        if (currentSubsection && currentSection) {
          currentSection.items.push(currentSubsection);
          currentSubsection = null;
        }
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          number: match[1],
          title: match[2],
          items: [],
        };
        return;
      }

      // Subsecciones con ####
      if (trimmed.match(/^####\s+(.+)$/)) {
        const match = trimmed.match(/^####\s+(.+)$/);
        if (currentList.length > 0 && currentSection) {
          if (currentSubsection) {
            currentSubsection.items.push({
              type: "list",
              items: [...currentList],
            });
          } else {
            currentSection.items.push({
              type: "list",
              items: [...currentList],
            });
          }
          currentList = [];
        }
        if (currentSubsection && currentSection) {
          currentSection.items.push(currentSubsection);
        }
        currentSubsection = {
          title: match[1].replace(/:\s*$/, ""),
          items: [],
        };
        return;
      }

      // Items numerados (1. 2. etc)
      if (trimmed.match(/^(\d+)\.\s+(.+)$/)) {
        const match = trimmed.match(/^(\d+)\.\s+(.+)$/);
        const item = { type: "numbered", number: match[1], text: match[2] };

        if (currentSubsection) {
          currentSubsection.items.push(item);
        } else if (currentSection) {
          currentSection.items.push(item);
        }
        return;
      }

      // Items de lista con * o - (pero NO ** que es negrita)
      if (trimmed.match(/^[*\-•]\s+(.+)$/) && !trimmed.startsWith("**")) {
        const match = trimmed.match(/^[*\-•]\s+(.+)$/);
        currentList.push(match[1]);
        return;
      }

      // Texto normal
      if (trimmed !== "") {
        const item = { type: "text", content: trimmed };

        if (currentList.length > 0) {
          const target = currentSubsection || currentSection;
          if (target) {
            target.items.push({ type: "list", items: [...currentList] });
            currentList = [];
          }
        }

        if (currentSubsection) {
          currentSubsection.items.push(item);
        } else if (currentSection) {
          currentSection.items.push(item);
        } else {
          sections.push({ type: "intro", content: trimmed });
        }
      }
    });

    // Cerrar secciones pendientes
    if (currentList.length > 0) {
      const target = currentSubsection || currentSection;
      if (target) {
        target.items.push({ type: "list", items: currentList });
      }
    }
    if (currentSubsection && currentSection) {
      currentSection.items.push(currentSubsection);
    }
    if (currentSection) {
      sections.push(currentSection);
    }

    // Renderizar secciones
    return sections.map((section, idx) => {
      if (section.type === "intro") {
        return (
          <div
            key={idx}
            className="mb-6 text-white/90 text-base leading-relaxed"
          >
            {processTextWithBold(section.content)}
          </div>
        );
      }

      return (
        <div
          key={idx}
          className="mb-8 bg-white/5 rounded-xl p-6 border border-white/10 hover:border-macroplay-yellow/30 transition-colors"
        >
          {/* Título de sección con número */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-macroplay-yellow to-yellow-500 rounded-lg flex items-center justify-center text-macroplay-blue font-bold text-xl shadow-lg">
              {section.number}
            </div>
            <h3 className="flex-1 text-2xl font-bold text-white mt-2">
              {processTextWithBold(section.title)}
            </h3>
          </div>

          {/* Contenido de la sección */}
          <div className="space-y-4 ml-16">
            {section.items.map((item, itemIdx) => {
              // Subsección
              if (item.title) {
                return (
                  <div key={itemIdx} className="mb-6">
                    <h4 className="text-lg font-semibold text-macroplay-yellow mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-macroplay-yellow rounded-full"></span>
                      <span>{processTextWithBold(item.title)}</span>
                    </h4>
                    <div className="ml-4 space-y-3">
                      {item.items.map((subItem, subIdx) =>
                        renderItem(subItem, `${itemIdx}-${subIdx}`)
                      )}
                    </div>
                  </div>
                );
              }

              return renderItem(item, itemIdx);
            })}
          </div>
        </div>
      );
    });
  };

  const renderItem = (item, key) => {
    if (item.type === "text") {
      const content = item.content;
      return (
        <p key={key} className="text-white/80 leading-relaxed">
          {processTextWithBold(content)}
        </p>
      );
    }

    if (item.type === "numbered") {
      return (
        <div
          key={key}
          className="flex gap-3 items-start mb-3 bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors"
        >
          <span className="flex-shrink-0 w-7 h-7 bg-macroplay-yellow/20 text-macroplay-yellow rounded-full flex items-center justify-center text-sm font-bold">
            {item.number}
          </span>
          <p className="flex-1 text-white/90 leading-relaxed pt-0.5">
            {processTextWithBold(item.text)}
          </p>
        </div>
      );
    }

    if (item.type === "list") {
      return (
        <ul key={key} className="space-y-2">
          {item.items.map((listItem, listIdx) => (
            <li key={listIdx} className="flex gap-3 items-start text-white/80">
              <span className="flex-shrink-0 w-2 h-2 bg-macroplay-yellow rounded-full mt-2"></span>
              <span className="flex-1 leading-relaxed">
                {processTextWithBold(listItem)}
              </span>
            </li>
          ))}
        </ul>
      );
    }

    return null;
  };

  if (!isGeminiConfigured()) {
    return (
      <div className="bg-orange-500/10 backdrop-blur-md rounded-xl p-6 border border-orange-500/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-white mb-2">
              Configuración de IA Requerida
            </h4>
            <p className="text-white/70 text-sm mb-3">
              Para usar el análisis con IA de Gemini, necesitas configurar la
              variable de entorno{" "}
              <code className="bg-white/10 px-2 py-1 rounded text-macroplay-yellow">
                VITE_GEMINI_API_KEY
              </code>
            </p>
            <div className="bg-white/5 rounded-lg p-3 text-xs font-mono text-white/60">
              <p className="mb-1">
                1. Obtén tu API key en: https://makersuite.google.com/app/apikey
              </p>
              <p className="mb-1">2. Agrega al archivo .env:</p>
              <p className="text-macroplay-yellow">
                VITE_GEMINI_API_KEY=tu_api_key_aqui
              </p>
              <p className="mt-2">3. Reinicia el servidor de desarrollo</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-md rounded-xl border border-purple-500/30 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Análisis Inteligente con IA
            </h3>
            <p className="text-white/60 text-sm">
              Recomendaciones estratégicas powered by Google Gemini
            </p>
          </div>
        </div>

        {!aiAnalysis && (
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
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
                <div className="text-center">
                  <span className="block">Analizando datos con IA...</span>
                  <span className="text-xs text-white/70 mt-1 block">
                    Esto puede tomar 10-30 segundos. Si está sobrecargado,
                    reintentará automáticamente.
                  </span>
                </div>
              </>
            ) : (
              <>
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
                <span>Generar Análisis descriptivo con IA</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-6 bg-red-500/10 border-t border-red-500/30">
          <div className="flex items-center gap-3">
            <svg
              className="w-6 h-6 text-red-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-white font-medium">
                Error al generar análisis
              </p>
              <p className="text-white/70 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resultado del Análisis */}
      {aiAnalysis && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white/60 text-xs">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                Generado:{" "}
                {new Date(aiAnalysis.timestamp).toLocaleString("es-MX")}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-xs font-medium"
              >
                {isExpanded ? "Contraer" : "Expandir"}
              </button>
              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-xs font-medium flex items-center gap-1"
              >
                <svg
                  className="w-3 h-3"
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
                Regenerar
              </button>
            </div>
          </div>

          <div
            className={`rounded-lg overflow-hidden ${
              isExpanded ? "" : "max-h-[600px] relative"
            }`}
          >
            <div
              className={`space-y-6 ${!isExpanded ? "overflow-hidden" : ""}`}
            >
              {formatAIResponse(aiAnalysis.analysis)}
            </div>

            {!isExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-macroplay-blue via-macroplay-blue/80 to-transparent pointer-events-none">
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="bg-macroplay-yellow text-macroplay-blue px-6 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition-colors shadow-lg"
                  >
                    Ver Análisis Completo ↓
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsights;
