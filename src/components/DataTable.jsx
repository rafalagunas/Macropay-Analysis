import React, { useState, useMemo } from "react";

const DataTable = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({
    column: null,
    direction: "asc",
  });
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 10;

  // Función para convertir hex a rgba con opacidad
  const hexToRgba = (hex, alpha) => {
    if (!hex || !hex.startsWith("#")) return `rgba(0, 0, 0, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  if (!data || data.length === 0) {
    return null;
  }

  // Función para calcular días desde fecha última recarga
  const calculateDaysSinceLastRecharge = (fechaUltimaRecarga) => {
    if (!fechaUltimaRecarga || fechaUltimaRecarga === "-" || fechaUltimaRecarga === "") {
      return null;
    }

    try {
      let fecha;
      
      // Si es número (Excel serial)
      if (typeof fechaUltimaRecarga === "number") {
        if (fechaUltimaRecarga > 1 && fechaUltimaRecarga < 73050) {
          const days = Math.floor(fechaUltimaRecarga) - 25569;
          fecha = new Date(days * 24 * 60 * 60 * 1000);
        } else {
          return null;
        }
      } else {
        // Intentar parsear como fecha
        const valueStr = String(fechaUltimaRecarga).trim();
        
        // Formato ISO: YYYY-MM-DD
        const isoMatch = valueStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          fecha = new Date(isoMatch[1], parseInt(isoMatch[2]) - 1, isoMatch[3]);
        } else {
          // Formato DD/MM/YYYY
          const ddmmyyyyMatch = valueStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (ddmmyyyyMatch) {
            fecha = new Date(ddmmyyyyMatch[3], parseInt(ddmmyyyyMatch[2]) - 1, ddmmyyyyMatch[1]);
          } else {
            fecha = new Date(valueStr);
          }
        }
      }

      if (isNaN(fecha.getTime())) {
        return null;
      }

      // Calcular diferencia en días
      const hoy = new Date();
      hoy.setUTCHours(0, 0, 0, 0);
      fecha.setUTCHours(0, 0, 0, 0);
      
      const diffTime = hoy.getTime() - fecha.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 ? diffDays : null;
    } catch (error) {
      return null;
    }
  };

  // Función para obtener el color según los días
  const getDaysColor = (days) => {
    if (days === null || days === undefined) return "text-white/60";
    
    if (days <= 30) {
      return "text-green-400 font-semibold"; // Verde: Activos (0-30 días)
    } else if (days <= 60) {
      return "text-yellow-400 font-semibold"; // Amarillo: Potencial Churn (31-60 días)
    } else {
      return "text-red-400 font-semibold"; // Rojo: Churn (>60 días)
    }
  };

  // Definir el orden y las columnas que queremos mostrar
  // Nota: Los nombres deben coincidir exactamente con los nombres en los datos
  const desiredColumnOrder = [
    "MSISDN",
    "Segmento_IA", // Solo si existe (después de la segmentación)
    "Consumo MB",
    "Fecha Ultimo Consumo",
    "Fecha Activacion",
    "Fecha Ultima Recarga",
    "Días desde Última Recarga", // Columna calculada
    "BRACKET_RECARGA",
    "BRACKET_CONSUMO",
    "SURVIVAL",
  ];

  // Obtener todas las columnas disponibles
  const allColumns = Object.keys(data[0]);

  // Filtrar y ordenar columnas según el orden deseado
  const columns = desiredColumnOrder.filter((col) => {
    // Buscar la columna (case-insensitive)
    return allColumns.some(
      (availableCol) => availableCol.toLowerCase() === col.toLowerCase()
    );
  });

  // Mapear los nombres de columnas deseados a los nombres reales en los datos
  const columnMapping = {};
  desiredColumnOrder.forEach((desiredCol) => {
    const foundCol = allColumns.find(
      (availableCol) => availableCol.toLowerCase() === desiredCol.toLowerCase()
    );
    if (foundCol) {
      columnMapping[desiredCol] = foundCol;
    }
  });

  // Crear array final con los nombres reales de las columnas en el orden correcto
  let finalColumns = columns.map((col) => columnMapping[col] || col);
  
  // Agregar la columna calculada "Días desde Última Recarga" si existe "Fecha Ultima Recarga"
  const fechaUltimaRecargaCol = finalColumns.find(
    (col) => col === "Fecha Ultima Recarga" || col.toLowerCase().includes("fecha ultima recarga")
  );
  
  if (fechaUltimaRecargaCol && !finalColumns.includes("Días desde Última Recarga")) {
    // Insertar después de "Fecha Ultima Recarga"
    const index = finalColumns.indexOf(fechaUltimaRecargaCol);
    finalColumns.splice(index + 1, 0, "Días desde Última Recarga");
  }

  // Filtrar y ordenar datos
  const filteredAndSortedData = useMemo(() => {
    let processedData = [...data];

    // Función helper para obtener el valor de una columna (incluyendo calculadas)
    const getColumnValue = (row, column) => {
      if (column === "Días desde Última Recarga") {
        const days = calculateDaysSinceLastRecharge(row["Fecha Ultima Recarga"]);
        return days !== null ? `${days} días` : "-";
      }
      return String(row[column] || "");
    };

    // Aplicar búsqueda global
    if (searchTerm) {
      processedData = processedData.filter((row) =>
        finalColumns.some((column) =>
          getColumnValue(row, column)
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      );
    }

    // Aplicar filtros por columna
    Object.keys(columnFilters).forEach((column) => {
      const filterValue = columnFilters[column];
      if (filterValue) {
        processedData = processedData.filter((row) =>
          getColumnValue(row, column)
            .toLowerCase()
            .includes(filterValue.toLowerCase())
        );
      }
    });

    // Aplicar ordenamiento
    if (sortConfig.column) {
      processedData.sort((a, b) => {
        // Manejar columna calculada "Días desde Última Recarga"
        let aValue, bValue;
        if (sortConfig.column === "Días desde Última Recarga") {
          aValue = calculateDaysSinceLastRecharge(a["Fecha Ultima Recarga"]);
          bValue = calculateDaysSinceLastRecharge(b["Fecha Ultima Recarga"]);
          // Convertir a número para ordenamiento (null va al final)
          aValue = aValue === null ? Infinity : aValue;
          bValue = bValue === null ? Infinity : bValue;
        } else {
          aValue = a[sortConfig.column];
          bValue = b[sortConfig.column];
        }

        // Verificar si es una columna de fecha
        const isDateColumn =
          sortConfig.column &&
          (sortConfig.column.toLowerCase().includes("fecha") ||
            sortConfig.column.toLowerCase().includes("date"));

        if (isDateColumn) {
          // Ordenar fechas
          const parseDate = (value) => {
            if (!value) return null;

            // Si es número de serie de Excel
            if (typeof value === "number" && value > 1 && value < 73050) {
              // Convertir número de serie de Excel a timestamp (UTC)
              const days = Math.floor(value) - 25569;
              return days * 24 * 60 * 60 * 1000;
            }

            if (typeof value === "string") {
              // Formato ISO: YYYY-MM-DD (parsear directamente sin zona horaria)
              if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
                const parts = value.split("-");
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2].substring(0, 2), 10);
                return new Date(year, month, day).getTime();
              }
              // Formato con barras: DD/MM/YYYY
              if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) {
                const parts = value.split("/");
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                return new Date(year, month, day).getTime();
              }
            }

            if (value instanceof Date) {
              return value.getTime();
            }

            return null;
          };

          const aDate = parseDate(aValue);
          const bDate = parseDate(bValue);

          if (aDate === null && bDate === null) return 0;
          if (aDate === null) return 1; // nulls al final
          if (bDate === null) return -1;

          const diff = aDate - bDate;
          return sortConfig.direction === "asc" ? diff : -diff;
        }

        // Verificar si son números
        const aNum = Number(aValue);
        const bNum = Number(bValue);

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
        }

        // Comparar como strings
        const aStr = String(aValue || "").toLowerCase();
        const bStr = String(bValue || "").toLowerCase();

        if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return processedData;
  }, [data, searchTerm, columnFilters, sortConfig, finalColumns]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredAndSortedData.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleSort = (column) => {
    setSortConfig((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleColumnFilter = (column, value) => {
    setColumnFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
    setCurrentPage(1); // Reset a la primera página al filtrar
  };

  const clearFilters = () => {
    setSearchTerm("");
    setColumnFilters({});
    setSortConfig({ column: null, direction: "asc" });
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || Object.keys(columnFilters).length > 0;

  // Función para convertir número de serie de Excel a fecha
  const excelSerialToDate = (serial) => {
    // Excel cuenta días desde el 1 de enero de 1900
    // Usar UTC para evitar problemas de zona horaria
    // 25569 es la diferencia en días entre 1900-01-01 y 1970-01-01
    const days = Math.floor(serial) - 25569;
    const date = new Date(days * 24 * 60 * 60 * 1000);

    // Usar UTC para obtener la fecha correcta
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();

    return `${day}/${month}/${year}`;
  };

  // Función para formatear fechas
  const formatDate = (value, columnName) => {
    // Lista explícita de columnas de fecha (nombres exactos de los CSV)
    const dateColumns = [
      "Fecha Inicial",
      "Fecha Fin",
      "Fecha",
      "Fecha Ultimo Consumo",
      "Fecha Activacion",
      "Fecha Ultima Recarga",
    ];

    // Detectar si es una columna de fecha
    const isDateColumn =
      columnName &&
      (dateColumns.includes(columnName) ||
        columnName.toLowerCase().includes("fecha") ||
        columnName.toLowerCase().includes("date"));

    if (!isDateColumn || !value || value === "-") {
      return null; // No es fecha o está vacío
    }

    try {
      // Si es un número (número de serie de Excel)
      if (typeof value === "number") {
        // Verificar que esté en el rango válido de fechas de Excel (1900-2100)
        if (value > 1 && value < 73050) {
          return excelSerialToDate(value);
        }
        return null;
      }

      const valueStr = String(value).trim();

      // Formato ISO: YYYY-MM-DD (el formato de los CSV)
      const isoMatch = valueStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const year = isoMatch[1];
        const month = isoMatch[2];
        const day = isoMatch[3];
        return `${day}/${month}/${year}`;
      }

      // Formato DD/MM/YYYY
      const ddmmyyyyMatch = valueStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyyMatch) {
        const day = ddmmyyyyMatch[1].padStart(2, "0");
        const month = ddmmyyyyMatch[2].padStart(2, "0");
        const year = ddmmyyyyMatch[3];
        return `${day}/${month}/${year}`;
      }

      // Si no coincide con ningún formato conocido, devolver null
      return null;
    } catch (error) {
      return null;
    }
  };

  // Función para renderizar el valor de una celda
  const renderCellValue = (value, columnName) => {
    if (value === null || value === undefined) {
      return "-";
    }

    // Intentar formatear como fecha
    const formattedDate = formatDate(value, columnName);
    if (formattedDate) {
      console.log(`Formateando ${columnName}: ${value} → ${formattedDate}`);
      return formattedDate;
    }

    // Si no es fecha, devolver como string
    return String(value);
  };

  // Reset página cuando cambien los datos filtrados
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredAndSortedData.length]);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
      {/* Header con búsqueda */}
      <div className="p-6 border-b border-white/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Datos del Excel</h3>
            <p className="text-white/60 text-sm mt-1">
              {Number(filteredAndSortedData.length).toLocaleString("es-MX")} de{" "}
              {Number(data.length).toLocaleString("es-MX")} registros
              {hasActiveFilters && " (filtrados)"}
            </p>
          </div>

          {/* Botón de filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
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
            {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
          </button>
        </div>

        {/* Búsqueda Global */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar en toda la tabla..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 pl-10 bg-white/5 text-white placeholder-white/40 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-macroplay-yellow transition-all"
            />
            <svg
              className="w-5 h-5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-red-500/20 text-white rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Limpiar Filtros
            </button>
          )}
        </div>

        {/* Filtros por columna */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-white/70 text-sm mb-3">Filtrar por columna:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {finalColumns.map((column) => (
                <div key={column}>
                  <label className="block text-white/60 text-xs mb-1 truncate">
                    {column}
                  </label>
                  <input
                    type="text"
                    placeholder={`Filtrar ${column}...`}
                    value={columnFilters[column] || ""}
                    onChange={(e) => handleColumnFilter(column, e.target.value)}
                    className="w-full px-3 py-1.5 bg-white/5 text-white text-sm placeholder-white/30 rounded-lg border border-white/20 focus:outline-none focus:ring-1 focus:ring-macroplay-yellow transition-all"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5">
              {finalColumns.map((column, index) => (
                <th
                  key={index}
                  onClick={() => handleSort(column)}
                  className="px-6 py-4 text-left text-xs font-semibold text-macroplay-yellow uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span>{column}</span>
                    <div className="flex flex-col">
                      <svg
                        className={`w-3 h-3 ${
                          sortConfig.column === column &&
                          sortConfig.direction === "asc"
                            ? "text-macroplay-yellow"
                            : "text-white/30 group-hover:text-white/50"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" />
                      </svg>
                      <svg
                        className={`w-3 h-3 -mt-1 ${
                          sortConfig.column === column &&
                          sortConfig.direction === "desc"
                            ? "text-macroplay-yellow"
                            : "text-white/30 group-hover:text-white/50"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" />
                      </svg>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {currentData.length > 0 ? (
              currentData.map((row, rowIndex) => {
                // Obtener el color del segmento si existe
                const segmentColor = row.Segmento_Color || null;

                const rowStyle = segmentColor
                  ? {
                      borderLeft: `8px solid ${segmentColor}`,
                      backgroundColor: hexToRgba(segmentColor, 0.35), // 35% de opacidad para máxima visibilidad
                    }
                  : {};

                return (
                  <tr
                    key={rowIndex}
                    className="hover:bg-white/5 transition-colors"
                    style={rowStyle}
                  >
                    {finalColumns.map((column, colIndex) => {
                      // Manejar columna calculada "Días desde Última Recarga"
                      if (column === "Días desde Última Recarga") {
                        const fechaUltimaRecarga = row["Fecha Ultima Recarga"];
                        const days = calculateDaysSinceLastRecharge(fechaUltimaRecarga);
                        const colorClass = getDaysColor(days);
                        
                        return (
                          <td
                            key={colIndex}
                            className={`px-6 py-4 text-sm whitespace-nowrap ${colorClass}`}
                          >
                            {days !== null ? `${days} días` : "-"}
                          </td>
                        );
                      }
                      
                      return (
                        <td
                          key={colIndex}
                          className="px-6 py-4 text-sm text-white whitespace-nowrap"
                        >
                          {renderCellValue(row[column], column)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={finalColumns.length}
                  className="px-6 py-8 text-center text-white/60"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-12 h-12 text-white/30"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p>No se encontraron resultados</p>
                    <button
                      onClick={clearFilters}
                      className="mt-2 text-macroplay-yellow hover:underline text-sm"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/60 text-sm">
            Página {currentPage} de {totalPages} ({filteredAndSortedData.length}{" "}
            registros)
          </p>
          <div className="flex gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Anterior
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-macroplay-yellow text-macroplay-blue rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
