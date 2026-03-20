# Hoja de Ruta Futura

## Objetivo

Guiar evolucion del proyecto para que una nueva persona pueda continuar de forma ordenada.

## Prioridad Alta

1. Estandarizar despliegue local y productivo.
   - Definir variables de entorno requeridas.
   - Documentar paso a paso de levantamiento de backend y frontend.

2. Definir estrategia de pruebas.
   - Pruebas minimas para endpoints criticos de carga y estadisticas.
   - Validacion de calidad de datos al cargar Excel.

3. Endurecer trazabilidad de datos.
   - Registrar fecha/hora/usuario de cada carga.
   - Conservar metadatos de origen de archivo.

## Prioridad Media

1. Mejorar observabilidad.
   - Logs mas claros por proceso de carga.
   - Manejo de errores estandarizado para frontend y backend.

2. Mejorar experiencia de usuario en dashboard.
   - Filtros avanzados por periodo/centro/rubro.
   - Exportaciones a Excel/CSV desde vistas filtradas.

3. Gestion de respaldos.
   - Politica de backup periodico con nomenclatura definida.

## Prioridad Baja

1. Automatizacion de tareas repetitivas.
   - Scripts para carga programada y limpieza.

2. Organizacion de modulos.
   - Separar logica de negocio, acceso a datos y rutas API en paquetes.

## Criterio de cierre por tarea

Cada tarea se considera cerrada cuando:
- Hay cambio en codigo o configuracion aplicado.
- Se registra entrada en `03_bitacora_cambios.md`.
- Se valida funcionamiento esperado.
- Se actualiza esta hoja de ruta (marcando estado).
