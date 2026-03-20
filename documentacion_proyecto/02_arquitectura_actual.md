# Arquitectura Actual del Proyecto

## Vision general

El sistema se compone de tres capas principales:
- Persistencia y esquema de datos (SQL).
- Backend API para exponer datos y procesos de carga.
- Frontend para operacion (carga de Excel y dashboard de consulta).

## Componentes principales

### 1) Base de datos

Archivo clave:
- `base_de_datos.sql`

Responsabilidades:
- Definir tablas para CDP, CRP y seguimiento.
- Mantener tipos de datos adecuados para valores presupuestales.

### 2) Backend

Archivo clave:
- `backend_workbench_api.py`

Responsabilidades:
- Endpoints para consulta de datos con filtros/paginacion.
- Endpoint de estadisticas para el dashboard.
- Endpoint para carga de Excel y actualizacion de tablas.
- Endpoint de reemplazo completo de datos por tabla (truncate-and-load).

### 3) Frontend

Carpeta:
- `frontend/`

Responsabilidades:
- `upload.html` y `upload.js`: carga y validacion de archivos Excel.
- `dashboard.html` y `dashboard.js`: visualizacion de KPIs y analitica.
- `styles.css`: estilo visual y experiencia de usuario.
- `index.html`: punto de entrada.

### 4) Scripts de apoyo

Archivos:
- `transformar_eje.py`
- `visual_base_datos.py`
- `dashboard_eje.py`
- `dashboard_seguimiento.py`
- `iniciar_entorno_excel.bat`

Responsabilidades:
- Transformacion de datos y utilidades de apoyo.
- Arranque local del entorno de trabajo.

## Flujo operativo

1. Usuario prepara archivo Excel.
2. Usuario carga archivo en frontend de upload.
3. Frontend envia archivo al backend.
4. Backend procesa y escribe en base de datos.
5. Dashboard consume estadisticas y datos consolidados.
6. Usuario consulta indicadores y tablas filtradas.

## Dependencias de entorno

- Python (segun `requirements.txt`).
- Motor MySQL/MariaDB compatible con el esquema SQL.
- Configuracion de conexion por variables de entorno o valores del backend.

## Riesgos tecnicos actuales

- Falta de documentacion historica detallada por cada cambio previo.
- Posibles cambios manuales no registrados en bitacora.
- Necesidad de estandarizar pruebas de regresion luego de cada despliegue.
