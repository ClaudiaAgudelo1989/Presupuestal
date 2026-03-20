# Historial del Proyecto Desde el Inicio

Nota: Este historial se reconstruye con base en los archivos existentes del repositorio y puede ajustarse cuando se disponga de una cronologia mas precisa.

## Fase 1 - Base de datos y procesamiento inicial

Evidencias en repositorio:
- `base_de_datos.sql`
- `transformar_eje.py`
- `visual_base_datos.py`

Trabajo realizado:
- Definicion del esquema de base de datos para informacion presupuestal.
- Preparacion de scripts de transformacion de datos para consolidar la informacion de ejecucion.
- Soporte de visualizacion/inspeccion de estructura de base de datos.

## Fase 2 - Dashboards y seguimiento

Evidencias en repositorio:
- `dashboard_eje.py`
- `dashboard_seguimiento.py`

Trabajo realizado:
- Construccion de tableros para lectura de ejecucion y seguimiento.
- Separacion de vistas por necesidad analitica (ejecucion y seguimiento).

## Fase 3 - API de soporte y carga de datos

Evidencias en repositorio:
- `backend_workbench_api.py`

Trabajo realizado:
- Exposicion de endpoints para lectura y carga de informacion.
- Habilitacion de carga de Excel a tablas existentes.
- Soporte para reemplazo completo de una tabla (truncate + load) para actualizaciones integrales.

## Fase 4 - Frontend para operacion

Evidencias en repositorio:
- `frontend/index.html`
- `frontend/upload.html`
- `frontend/dashboard.html`
- `frontend/upload.js`
- `frontend/dashboard.js`
- `frontend/styles.css`

Trabajo realizado:
- Interfaz de carga de datos para operacion no tecnica.
- Dashboard web con metricas y componentes visuales.
- Flujo de consulta, filtros y paginacion.

## Fase 5 - Respaldo y version de referencia

Evidencias en repositorio:
- `backup_cambios_20260316_170825/`

Trabajo realizado:
- Creacion de un respaldo con archivos de frontend y backend para recuperacion rapida o comparacion de cambios.

## Estado actual (al 2026-03-18)

- Proyecto operativo con backend API y frontend de carga/dashboard.
- Estructura lista para mantenimiento incremental.
- Se crea carpeta de documentacion para continuidad del proyecto con relevo de conocimiento.
