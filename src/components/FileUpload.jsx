import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";

const FileUpload = ({ onDataLoaded }) => {
  const [isDraggingTarif, setIsDraggingTarif] = useState(false);
  const [isDraggingRecarga, setIsDraggingRecarga] = useState(false);
  const [tarifFileName, setTarifFileName] = useState("");
  const [recargaFileName, setRecargaFileName] = useState("");
  const [tarifData, setTarifData] = useState(null);
  const [recargaData, setRecargaData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const tarifInputRef = useRef(null);
  const recargaInputRef = useRef(null);

  // Cuando ambos archivos están cargados, notificar al padre
  useEffect(() => {
    if (tarifData && recargaData) {
      onDataLoaded(
        {
          tarificacion: tarifData,
          detalleRecargas: recargaData,
        },
        {
          tarifFileName,
          recargaFileName,
        }
      );
    }
  }, [tarifData, recargaData]);

  // Handlers para Tarificación
  const handleDragEnterTarif = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingTarif(true);
  };

  const handleDragLeaveTarif = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingTarif(false);
  };

  const handleDragOverTarif = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropTarif = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingTarif(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0], "tarif");
    }
  };

  // Handlers para Detalle Recargas
  const handleDragEnterRecarga = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingRecarga(true);
  };

  const handleDragLeaveRecarga = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingRecarga(false);
  };

  const handleDragOverRecarga = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropRecarga = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingRecarga(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0], "recarga");
    }
  };

  const handleFileInput = (e, type) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFile(files[0], type);
    }
  };

  const handleFile = (file, type) => {
    // Validar que sea un archivo Excel o CSV
    const fileExtension = file.name.split(".").pop().toLowerCase();
    if (
      fileExtension !== "xlsx" &&
      fileExtension !== "xls" &&
      fileExtension !== "csv"
    ) {
      alert(
        "Por favor, seleccione un archivo Excel válido (.xlsx, .xls o .csv)"
      );
      return;
    }

    if (type === "tarif") {
      setTarifFileName(file.name);
    } else {
      setRecargaFileName(file.name);
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;

        // Configurar opciones según el tipo de archivo
        const readOptions = {
          type: "binary",
          cellDates: false, // No convertir a objetos Date
          raw: fileExtension === "csv", // Mantener valores raw para CSV
        };

        const workbook = XLSX.read(data, readOptions);

        // Leer la primera hoja
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convertir a JSON manteniendo formato original para CSV
        const jsonOptions =
          fileExtension === "csv"
            ? { raw: true, defval: "" } // Mantener strings para CSV
            : { defval: "" }; // Comportamiento normal para Excel

        const jsonData = XLSX.utils.sheet_to_json(worksheet, jsonOptions);

        console.log(
          `📄 Archivo ${type} cargado:`,
          jsonData.length,
          "registros"
        );
        console.log(`📋 Muestra de datos:`, jsonData[0]);

        if (type === "tarif") {
          setTarifData(jsonData);
        } else {
          setRecargaData(jsonData);
        }

        setIsProcessing(false);
      } catch (error) {
        console.error("Error al procesar el archivo:", error);
        alert(
          "Error al procesar el archivo. Por favor, intente con otro archivo."
        );
        setIsProcessing(false);
        if (type === "tarif") {
          setTarifFileName("");
        } else {
          setRecargaFileName("");
        }
      }
    };

    reader.onerror = () => {
      alert("Error al leer el archivo");
      setIsProcessing(false);
      if (type === "tarif") {
        setTarifFileName("");
      } else {
        setRecargaFileName("");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleClickTarif = () => {
    tarifInputRef.current?.click();
  };

  const handleClickRecarga = () => {
    recargaInputRef.current?.click();
  };

  const handleRemoveTarif = (e) => {
    e.stopPropagation();
    setTarifFileName("");
    setTarifData(null);
    onDataLoaded(null, null);
  };

  const handleRemoveRecarga = (e) => {
    e.stopPropagation();
    setRecargaFileName("");
    setRecargaData(null);
    onDataLoaded(null, null);
  };

  const bothFilesLoaded = tarifData && recargaData;

  return (
    <div className="w-full space-y-6">
      {/* Indicador de estado */}
      {bothFilesLoaded && (
        <div className="bg-green-500/10 backdrop-blur-md rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">
                ✓ Ambos archivos cargados correctamente
              </p>
              <p className="text-white/70 text-sm">
                Los datos están listos para ser analizados
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Área de carga: Tarificación */}
        <div>
          <div className="mb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-macroplay-yellow text-macroplay-blue text-sm font-bold">
                1
              </span>
              Tarificación
            </h3>
            <p className="text-white/60 text-sm mt-1 ml-8">
              Archivo con consumo y tarificación por línea
            </p>
          </div>
          <div
            onDragEnter={handleDragEnterTarif}
            onDragLeave={handleDragLeaveTarif}
            onDragOver={handleDragOverTarif}
            onDrop={handleDropTarif}
            onClick={handleClickTarif}
            className={`
              relative border-2 border-dashed rounded-xl p-6 md:p-8 text-center cursor-pointer
              transition-all duration-300 ease-in-out
              ${
                isDraggingTarif
                  ? "border-macroplay-yellow bg-macroplay-yellow/10 scale-[1.02]"
                  : tarifData
                  ? "border-green-500 bg-green-500/5"
                  : "border-white/30 bg-white/5 hover:border-macroplay-yellow hover:bg-white/10"
              }
              ${isProcessing ? "opacity-50 cursor-wait" : ""}
            `}
          >
            <input
              ref={tarifInputRef}
              type="file"
              onChange={(e) => handleFileInput(e, "tarif")}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={isProcessing}
            />

            {tarifData ? (
              <div className="space-y-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-green-500 text-sm font-medium mb-1">
                    Archivo cargado
                  </p>
                  <p className="text-white/80 text-xs break-all px-2">
                    {tarifFileName}
                  </p>
                  <p className="text-white/60 text-xs mt-1">
                    {tarifData.length} registros
                  </p>
                </div>
                <button
                  onClick={handleRemoveTarif}
                  className="mt-2 px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-xs"
                >
                  Cambiar archivo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto">
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
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium mb-1">
                    Arrastra tu archivo aquí
                  </p>
                  <p className="text-white/60 text-xs">
                    o haz clic para seleccionar
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Área de carga: Detalle Recargas */}
        <div>
          <div className="mb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-macroplay-yellow text-macroplay-blue text-sm font-bold">
                2
              </span>
              Detalle Recargas
            </h3>
            <p className="text-white/60 text-sm mt-1 ml-8">
              Archivo con historial de recargas
            </p>
          </div>
          <div
            onDragEnter={handleDragEnterRecarga}
            onDragLeave={handleDragLeaveRecarga}
            onDragOver={handleDragOverRecarga}
            onDrop={handleDropRecarga}
            onClick={handleClickRecarga}
            className={`
              relative border-2 border-dashed rounded-xl p-6 md:p-8 text-center cursor-pointer
              transition-all duration-300 ease-in-out
              ${
                isDraggingRecarga
                  ? "border-macroplay-yellow bg-macroplay-yellow/10 scale-[1.02]"
                  : recargaData
                  ? "border-green-500 bg-green-500/5"
                  : "border-white/30 bg-white/5 hover:border-macroplay-yellow hover:bg-white/10"
              }
              ${isProcessing ? "opacity-50 cursor-wait" : ""}
            `}
          >
            <input
              ref={recargaInputRef}
              type="file"
              onChange={(e) => handleFileInput(e, "recarga")}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={isProcessing}
            />

            {recargaData ? (
              <div className="space-y-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-green-500 text-sm font-medium mb-1">
                    Archivo cargado
                  </p>
                  <p className="text-white/80 text-xs break-all px-2">
                    {recargaFileName}
                  </p>
                  <p className="text-white/60 text-xs mt-1">
                    {recargaData.length} registros
                  </p>
                </div>
                <button
                  onClick={handleRemoveRecarga}
                  className="mt-2 px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-xs"
                >
                  Cambiar archivo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto">
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
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium mb-1">
                    Arrastra tu archivo aquí
                  </p>
                  <p className="text-white/60 text-xs">
                    o haz clic para seleccionar
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Información sobre las columnas esperadas */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
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
          Columnas esperadas en cada archivo
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-macroplay-yellow font-semibold mb-2">
              Tarificación:
            </p>
            <ul className="text-white/60 space-y-1 list-disc list-inside">
              <li>Fecha Inicial</li>
              <li>Fecha Fin</li>
              <li>MSISDN</li>
              <li>Oferta</li>
              <li>Consumo_MB</li>
              <li>Tarificacion</li>
            </ul>
          </div>
          <div>
            <p className="text-macroplay-yellow font-semibold mb-2">
              Detalle Recargas:
            </p>
            <ul className="text-white/60 space-y-1 list-disc list-inside">
              <li>Fecha</li>
              <li>MSISDN</li>
              <li>Oferta</li>
              <li>Fecha Ultimo Consumo</li>
              <li>Fecha Activacion</li>
              <li>Fecha Ultima Recarga</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
