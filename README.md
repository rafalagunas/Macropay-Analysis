# 📊 Macroplay Dashboard Administrativo

Plataforma web administrativa desarrollada en React para el análisis de hábitos de consumo telefónico de clientes de Macroplay.

![Macroplay Logo](https://macropay.mx/wp-content/uploads/2025/09/LOGO-MACROPAY_Mesa-de-trabajo-1.png)

## 🚀 Características

### ✅ Funcionalidades Implementadas

- **Sistema de Autenticación**: Login seguro con validación de credenciales
- **Rutas Protegidas**: Acceso controlado al dashboard mediante autenticación
- **Carga Dual de Archivos**: 
  - Carga simultánea de 2 archivos (Tarificación y Detalle Recargas)
  - Soporte para archivos .xlsx, .xls y .csv
  - Drag & drop para cada archivo
- **Correlación Automática de Datos**: 
  - Combina datos de tarificación y recargas por MSISDN
  - Calcula métricas adicionales (días sin recarga, estado del cliente, etc.)
- **Análisis Avanzado de Datos**: Procesamiento inteligente de información correlacionada
- **Visualización de Datos**:
  - Gráficos de barras
  - Gráficos de línea (tendencias temporales)
  - Gráficos de pie (distribución porcentual)
  - Gráficos de dona (consumo por tipo)
- **🤖 Análisis con IA (Google Gemini)**: Recomendaciones estratégicas basadas en datos correlacionados:
  - Insights clave sobre consumo, recargas y comportamiento del cliente
  - Oportunidades de venta: clientes con potencial de upgrade, migración prepago a pospago
  - Retención: identificación de clientes en riesgo, inactivos o con baja actividad
  - Estrategias de prospección y crecimiento
  - Acciones prioritarias accionables basadas en métricas calculadas
- **👥 Segmentación Inteligente con IA**: 
  - Clasificación manual de clientes en segmentos estratégicos con un clic
  - Basada en consumo, recargas, estado y actividad reciente
  - Visualización de distribución por segmento
  - Filtrado de tabla por segmento
  - Opción de re-segmentar cuando sea necesario
- **Tabla de Datos Avanzada**: 
  - Búsqueda global en tiempo real
  - Filtros por columna
  - Ordenamiento ascendente/descendente
  - Paginación inteligente
- **Exportación a CSV**: Descarga de análisis procesados
- **Diseño Responsivo**: Optimizado para desktop, tablet y móvil

### 🎨 Diseño

- **Colores Institucionales**:
  - Fondo: `#0047BA` (Azul Macroplay)
  - Texto: `#FFFFFF` (Blanco)
  - Botones/CTAs: `#FFDD00` (Amarillo Macroplay)
- **Framework CSS**: Tailwind CSS
- **Componentes**: Glassmorphism design con efectos de backdrop blur

## 📋 Requisitos Previos

- Node.js (versión 16 o superior)
- Yarn (gestor de paquetes)

## 🛠️ Instalación

1. **Clonar el repositorio** (o navegar a la carpeta del proyecto)

```bash
cd MACROPAY
```

2. **Instalar dependencias**

```bash
yarn install
```

3. **Configurar variables de entorno**

El archivo `.env` ya está configurado con las variables necesarias:

```env
VITE_APP_NAME=Macroplay Dashboard
VITE_LOGO_URL=https://macropay.mx/wp-content/uploads/2025/09/LOGO-MACROPAY_Mesa-de-trabajo-1.png
VITE_COLOR_PRIMARY=#0047BA
VITE_COLOR_SECONDARY=#FFDD00
VITE_COLOR_TEXT=#FFFFFF

# Opcional: Para habilitar el análisis con IA
VITE_GEMINI_API_KEY=tu_api_key_de_gemini
```

**🤖 Para habilitar el Análisis con IA:**
- Consulta: [INSTRUCCIONES_API_KEY.md](INSTRUCCIONES_API_KEY.md) (inicio rápido)
- Documentación completa: [CONFIGURACION_IA.md](CONFIGURACION_IA.md)

4. **Iniciar el servidor de desarrollo**

```bash
yarn dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📦 Scripts Disponibles

- `yarn dev` - Inicia el servidor de desarrollo
- `yarn build` - Construye la aplicación para producción
- `yarn preview` - Previsualiza la build de producción

## 🏗️ Estructura del Proyecto

```
MACROPAY/
├── src/
│   ├── components/           # Componentes reutilizables
│   │   ├── DataCharts.jsx   # Componente de gráficos
│   │   ├── DataTable.jsx    # Tabla de datos con paginación
│   │   ├── FileUpload.jsx   # Componente de carga de archivos
│   │   └── ProtectedRoute.jsx # HOC para rutas protegidas
│   ├── context/             # Contextos de React
│   │   └── AuthContext.jsx  # Contexto de autenticación
│   ├── pages/               # Páginas principales
│   │   ├── Login.jsx        # Página de inicio de sesión
│   │   └── Dashboard.jsx    # Dashboard principal
│   ├── utils/               # Utilidades
│   │   └── dataAnalysis.js  # Funciones de análisis de datos
│   ├── App.jsx              # Componente raíz
│   ├── main.jsx            # Punto de entrada
│   └── index.css           # Estilos globales
├── public/                  # Archivos estáticos
├── index.html              # HTML base
├── package.json            # Dependencias y scripts
├── vite.config.js         # Configuración de Vite
├── tailwind.config.js     # Configuración de Tailwind
└── README.md              # Este archivo
```

## 🔐 Autenticación

La aplicación implementa un sistema de autenticación mockeado para demostración:

- **Usuario**: Cualquier texto no vacío
- **Contraseña**: Cualquier texto no vacío

> ⚠️ **Nota**: En producción, este sistema debe ser reemplazado por una autenticación real con backend y tokens JWT.

## 📊 Uso del Dashboard

1. **Iniciar Sesión**: Ingresa credenciales válidas en la página de login

2. **Cargar AMBOS Archivos Excel**:
   - **Archivo 1 - Tarificación**: Arrastra o selecciona el archivo de facturación/consumo
   - **Archivo 2 - Detalle Recargas**: Arrastra o selecciona el archivo de historial de recargas
   - **Formatos aceptados**: .xlsx, .xls, .csv
   - **Archivos de ejemplo incluidos**: `ejemplo_tarificacion.csv` y `ejemplo_detalle_recargas.csv`
   
3. **Correlación Automática**: Una vez cargados ambos archivos, el sistema:
   - ✅ Correlaciona datos por MSISDN (número telefónico)
   - ✅ Calcula métricas: Total_Recargas, Dias_Sin_Recarga, Dias_Sin_Consumo, Estado_Cliente
   - ✅ Genera estadísticas combinadas

4. **Ver Análisis**: Automáticamente se generarán:
   - Estadísticas resumidas de datos correlacionados
   - Múltiples gráficos de visualización
   - **🤖 Análisis estratégico con IA** (si está configurada la API key)
   - **👥 Segmentación inteligente de clientes** con IA
   - Tabla detallada con datos combinados, filtros y búsqueda

5. **Usar Filtros en la Tabla**:
   - Búsqueda global: Escribe en el campo superior
   - Filtros por columna: Haz clic en "Mostrar Filtros"
   - Ordenamiento: Clic en cualquier encabezado de columna
   - Filtrar por segmento: Usa el filtro de la columna "Segmento_IA"

6. **Análisis con IA**:
   - Se genera automáticamente al cargar los archivos
   - Incluye insights sobre consumo, recargas y comportamiento
   - Recomendaciones para ventas, retención y crecimiento
   - Espera 10-30 segundos para obtener resultados

7. **Segmentación de Clientes** (Opcional):
   - Haz clic en "Segmentar Clientes con IA"
   - El sistema clasificará automáticamente a tus clientes en segmentos
   - Visualiza la distribución por segmento
   - Usa los filtros de la tabla para explorar cada segmento
   - Opción de re-segmentar si cambian los datos

8. **Exportar**: Descarga los datos correlacionados y segmentados en formato CSV

9. **Cerrar Sesión**: Usa el botón "Salir" en la barra superior

### 📂 Archivos de Ejemplo

Consulta [INSTRUCCIONES_ARCHIVOS_EJEMPLO.md](INSTRUCCIONES_ARCHIVOS_EJEMPLO.md) para detalles sobre:
- Estructura de columnas requeridas
- Cómo usar los archivos de ejemplo
- Cómo crear tus propios archivos

## 📱 Características Responsivas

- **Mobile First**: Diseño optimizado para dispositivos móviles
- **Breakpoints**:
  - `sm`: 640px (tablets pequeñas)
  - `md`: 768px (tablets)
  - `lg`: 1024px (laptops)
  - `xl`: 1280px (desktops)

## 🎯 Tecnologías Utilizadas

- **React 18.2** - Framework principal
- **Vite** - Build tool y dev server
- **React Router DOM 6** - Enrutamiento
- **Tailwind CSS 3** - Estilos y diseño responsivo
- **Chart.js 4** - Visualización de datos
- **react-chartjs-2** - Integración de Chart.js con React
- **xlsx (SheetJS)** - Lectura de archivos Excel y CSV, correlación de datos
- **Google Gemini AI** - Análisis inteligente, segmentación automática y recomendaciones (opcional)

## 🔗 Arquitectura de Correlación de Datos

El sistema implementa un proceso de correlación inteligente:

1. **Carga Dual**: Recibe dos archivos independientes (Tarificación y Detalle Recargas)
2. **Mapeo por MSISDN**: Correlaciona registros usando el número telefónico como clave
3. **Enriquecimiento**: Calcula métricas adicionales automáticamente
4. **Análisis Integrado**: Genera insights basados en datos combinados
5. **Segmentación IA**: Clasifica clientes en categorías estratégicas

**Métricas Calculadas:**
- `Total_Recargas`: Número total de recargas por cliente
- `Dias_Sin_Recarga`: Días desde la última recarga
- `Dias_Sin_Consumo`: Días desde el último consumo
- `Estado_Cliente`: Activo, En Riesgo, Inactivo, Baja Actividad, Sin Recargas

## 🔧 Personalización

### Cambiar Colores

Edita el archivo `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      'macroplay-blue': '#0047BA',    // Color primario
      'macroplay-yellow': '#FFDD00',  // Color secundario
    },
  },
}
```

### Modificar Análisis de Datos

Edita `src/utils/dataAnalysis.js` para ajustar la lógica de análisis según tus necesidades específicas.

## 🐛 Solución de Problemas

### El logo no se muestra
- Verifica la conexión a internet
- Comprueba que la URL del logo sea accesible

### Errores al cargar Excel
- Asegúrate de que el archivo tenga extensión .xlsx o .xls
- Verifica que el archivo contenga datos válidos

### Problemas de compilación
```bash
# Limpia node_modules e instala de nuevo
rm -rf node_modules
yarn install
```

## 📄 Licencia

© 2025 Macroplay. Todos los derechos reservados.

## 👥 Soporte

Para soporte técnico o preguntas, contacta al equipo de desarrollo de Macroplay.

---

**Desarrollado con ❤️ para Macroplay**

