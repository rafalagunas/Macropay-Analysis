import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";

const FileUpload = ({ onDataLoaded }) => {
  const [isDraggingTarif, setIsDraggingTarif] = useState(false);
  const [isDraggingRecarga, setIsDraggingRecarga] = useState(false);
  const [tarifFileName, setTarifFileName] = useState("");
  const [recargaFileName, setRecargaFileName] = useState("");
  const [tarifFileSize, setTarifFileSize] = useState("");
  const [recargaFileSize, setRecargaFileSize] = useState("");
  const [tarifData, setTarifData] = useState(null);
  const [recargaData, setRecargaData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showColumnsInfo, setShowColumnsInfo] = useState(false);
  const [showLargeFilesInfo, setShowLargeFilesInfo] = useState(false);
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

    // Validar tamaño del archivo (límite sugerido: 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB en bytes
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    if (file.size > maxSize) {
      alert(
        `El archivo es demasiado grande (${fileSizeMB} MB). El tamaño máximo recomendado es 500 MB.\n\nPara archivos muy grandes, considera dividirlos en partes más pequeñas.`
      );
      return;
    }

    // Advertencia para archivos grandes
    if (file.size > 100 * 1024 * 1024) {
      console.warn(
        `⚠️ Archivo grande detectado (${fileSizeMB} MB). El procesamiento puede tardar varios minutos...`
      );
    }

    if (type === "tarif") {
      setTarifFileName(file.name);
      setTarifFileSize(fileSizeMB);
    } else {
      setRecargaFileName(file.name);
      setRecargaFileSize(fileSizeMB);
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;

        console.log(`📄 Procesando archivo ${type} (${fileSizeMB} MB)...`);
        console.log(`📦 Tamaño del ArrayBuffer: ${data.byteLength} bytes`);

        // Configurar opciones según el tipo de archivo
        // Usar ArrayBuffer para mejor rendimiento con archivos grandes
        const readOptions = {
          type: "array",
          cellDates: false, // No convertir a objetos Date
          raw: fileExtension === "csv", // Mantener valores raw para CSV
          dense: false, // Usar formato sparse para mayor eficiencia
          sheetStubs: false, // No incluir celdas vacías
        };

        console.log(`⚙️ Leyendo workbook con XLSX...`);
        const workbook = XLSX.read(data, readOptions);

        if (
          !workbook ||
          !workbook.SheetNames ||
          workbook.SheetNames.length === 0
        ) {
          throw new Error("El archivo no contiene hojas válidas");
        }

        console.log(`📑 Hojas encontradas: ${workbook.SheetNames.length}`);
        console.log(`📑 Nombres de hojas:`, workbook.SheetNames);

        // Leer la primera hoja
        const sheetName = workbook.SheetNames[0];
        console.log(`📄 Procesando hoja: "${sheetName}"`);

        const worksheet = workbook.Sheets[sheetName];

        // Verificar que la hoja tenga datos
        const range = worksheet["!ref"];
        console.log(`📏 Rango de la hoja: ${range}`);

        if (!range) {
          throw new Error("La hoja está vacía o no tiene rango definido");
        }

        // Convertir a JSON manteniendo formato original para CSV
        const jsonOptions =
          fileExtension === "csv"
            ? { raw: true, defval: "" } // Mantener strings para CSV
            : { defval: "", blankrows: false }; // Comportamiento normal para Excel

        console.log(`🔄 Convirtiendo a JSON...`);
        const jsonData = XLSX.utils.sheet_to_json(worksheet, jsonOptions);

        console.log(
          `✅ Archivo ${type} cargado exitosamente:`,
          jsonData.length,
          "registros"
        );

        if (jsonData.length === 0) {
          console.warn(
            `⚠️ ADVERTENCIA: El archivo se procesó pero devolvió 0 registros`
          );
          console.warn(`⚠️ Esto puede ocurrir si:`);
          console.warn(`   - El archivo es demasiado grande (>150MB)`);
          console.warn(`   - La primera fila no tiene encabezados`);
          console.warn(`   - Todas las filas están vacías`);
          console.warn(`⚠️ Rango de la hoja: ${range}`);
          console.warn(`⚠️ Nombre de la hoja: ${sheetName}`);

          // Intentar leer con diferentes opciones
          console.log(`🔄 Intentando lectura alternativa con header: 1...`);
          const alternativeData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1, // Leer como array de arrays
            defval: "",
            blankrows: false,
          });
          console.log(
            `📊 Filas encontradas (modo alternativo): ${alternativeData.length}`
          );
          if (alternativeData.length > 0) {
            console.log(
              `📋 Primera fila (encabezados potenciales):`,
              alternativeData[0]
            );
            console.log(
              `📋 Segunda fila (datos de ejemplo):`,
              alternativeData[1]
            );
          }

          throw new Error(
            `El archivo tiene ${range} pero no se pudieron extraer registros. Esto puede ocurrir con archivos muy grandes (>150MB). Por favor, divide el archivo en partes más pequeñas.`
          );
        }

        console.log(`📋 Muestra de datos:`, jsonData[0]);

        if (jsonData.length > 0) {
          console.log(`📋 Columnas encontradas:`, Object.keys(jsonData[0]));
        }

        if (type === "tarif") {
          setTarifData(jsonData);
        } else {
          setRecargaData(jsonData);
        }

        setIsProcessing(false);
      } catch (error) {
        console.error("Error al procesar el archivo:", error);

        let errorMessage = "Error al procesar el archivo.";

        // Mensajes de error más específicos
        if (error.message && error.message.includes("memory")) {
          errorMessage = `El archivo es demasiado grande para procesarse en el navegador.\n\nIntenta:\n1. Dividir el archivo en partes más pequeñas\n2. Usar un navegador con más memoria disponible\n3. Cerrar otras pestañas del navegador`;
        } else if (error.name === "NotReadableError") {
          errorMessage =
            "No se pudo leer el archivo. Verifica que el archivo no esté dañado o en uso.";
        }

        alert(errorMessage);
        setIsProcessing(false);
        if (type === "tarif") {
          setTarifFileName("");
        } else {
          setRecargaFileName("");
        }
      }
    };

    reader.onerror = (error) => {
      console.error("Error al leer el archivo:", error);

      let errorMessage = "Error al leer el archivo.";

      // Códigos de error específicos de FileReader
      if (reader.error) {
        switch (reader.error.code) {
          case 1: // NOT_FOUND_ERR
            errorMessage = "Archivo no encontrado.";
            break;
          case 2: // SECURITY_ERR
            errorMessage = "Error de seguridad al leer el archivo.";
            break;
          case 3: // ABORT_ERR
            errorMessage = "Lectura del archivo cancelada.";
            break;
          case 4: // NOT_READABLE_ERR
            errorMessage = "El archivo no se puede leer.";
            break;
          case 5: // ENCODING_ERR
            errorMessage = `Error al procesar el archivo (Código 5).\n\nEste error generalmente ocurre con archivos muy grandes (>150 MB).\n\nSoluciones:\n1. Divide el archivo en partes más pequeñas (< 100 MB cada una)\n2. Usa Chrome o Edge (mejor rendimiento con archivos grandes)\n3. Cierra otras pestañas para liberar memoria`;
            break;
          default:
            errorMessage = `Error desconocido al leer el archivo (código: ${reader.error.code})`;
        }
      }

      alert(errorMessage);
      setIsProcessing(false);
      if (type === "tarif") {
        setTarifFileName("");
      } else {
        setRecargaFileName("");
      }
    };

    // Usar readAsArrayBuffer en lugar de readAsBinaryString para mejor rendimiento
    reader.readAsArrayBuffer(file);
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
    setTarifFileSize("");
    setTarifData(null);
    onDataLoaded(null, null);
  };

  const handleRemoveRecarga = (e) => {
    e.stopPropagation();
    setRecargaFileName("");
    setRecargaFileSize("");
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
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <p className="text-white/60 text-xs">
                      {tarifData.length.toLocaleString()} registros
                    </p>
                    {tarifFileSize && (
                      <>
                        <span className="text-white/40">•</span>
                        <p className="text-white/60 text-xs">
                          {tarifFileSize} MB
                        </p>
                      </>
                    )}
                  </div>
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
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <p className="text-white/60 text-xs">
                      {recargaData.length.toLocaleString()} registros
                    </p>
                    {recargaFileSize && (
                      <>
                        <span className="text-white/40">•</span>
                        <p className="text-white/60 text-xs">
                          {recargaFileSize} MB
                        </p>
                      </>
                    )}
                  </div>
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

      {/* Información sobre las columnas esperadas - Collapse */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <button
          onClick={() => setShowColumnsInfo(!showColumnsInfo)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <h4 className="text-white font-semibold text-sm flex items-center gap-2">
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
          <svg
            className={`w-5 h-5 text-white/60 transition-transform ${
              showColumnsInfo ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {showColumnsInfo && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-macroplay-yellow font-semibold mb-2">
                  Tarificación:
                </p>
                <ul className="text-white/60 space-y-1 list-disc list-inside">
                  <li>Fecha_Inicio_PF</li>
                  <li>Fecha_Fin_PF</li>
                  <li>Altan_Usr_ID</li>
                  <li>IMSI</li>
                  <li>MSISDN</li>
                  <li>Fecha_Ejecucion</li>
                  <li>RGU</li>
                  <li>RGU_ID</li>
                  <li>Free_Unit_ID</li>
                  <li>Dias_Activo_PF</li>
                  <li>Dias_Activo_CI</li>
                  <li>Acum_Redond_CI</li>
                  <li>Cuota_Datos_Bytes</li>
                  <li>Acum_Cambio_Domicilio</li>
                  <li>Tot_Units_Cumul</li>
                  <li>Tot_Units_RR_Cumul</li>
                  <li>PCT_RR</li>
                  <li>RR_Limit_Pct</li>
                  <li>Price_Val</li>
                  <li>Precio</li>
                  <li>Tarificacion_PF</li>
                  <li>Cliente</li>
                  <li>Tariff_Period</li>
                  <li>Product_Start_Date</li>
                  <li>Product_End_Date</li>
                  <li>Activation_DT</li>
                  <li>Tarificacion_RGU_PF_Tradicional</li>
                  <li>RM_Performance</li>
                  <li>Cod.</li>
                  <li>OfferId</li>
                  <li>Archivo_Origen</li>
                </ul>
              </div>
              <div>
                <p className="text-macroplay-yellow font-semibold mb-2">
                  Detalle Recargas:
                </p>
                <ul className="text-white/60 space-y-1 list-disc list-inside">
                  <li>COMPANY_NAME</li>
                  <li>MSISDN</li>
                  <li>F_PRODUCTO</li>
                  <li>MODALIDAD</li>
                  <li>RGU</li>
                  <li>FECHA_ACTIVACION</li>
                  <li>FECHA_ULT_RECARGA</li>
                  <li>FECHA_ULT_CONSUMO</li>
                  <li>BRACKET_RECARGA</li>
                  <li>BRACKET_CONSUMO</li>
                  <li>SURVIVAL</li>
                  <li>FECHA_CORTE</li>
                  <li>FECHA_REPORTE</li>
                  <li>CountBE_ID</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Información sobre archivos grandes - Collapse */}
      <div className="bg-blue-500/10 backdrop-blur-md rounded-xl border border-blue-500/30 overflow-hidden">
        <button
          onClick={() => setShowLargeFilesInfo(!showLargeFilesInfo)}
          className="w-full p-4 flex items-center justify-between hover:bg-blue-500/10 transition-colors"
        >
          <h4 className="text-white font-semibold text-sm flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-400"
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
            Archivos Grandes
          </h4>
          <svg
            className={`w-5 h-5 text-white/60 transition-transform ${
              showLargeFilesInfo ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {showLargeFilesInfo && (
          <div className="px-4 pb-4">
            <div className="text-xs text-white/70 space-y-1">
              <p>
                • Tamaño máximo recomendado:{" "}
                <span className="text-white font-semibold">500 MB</span> por
                archivo
              </p>
              <p>
                • Para archivos mayores a 150 MB, se recomienda usar{" "}
                <span className="text-white font-semibold">Chrome o Edge</span>{" "}
                para mejor rendimiento
              </p>
              <p>
                • Si experimentas errores con archivos muy grandes, considera
                dividirlos en partes más pequeñas
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
