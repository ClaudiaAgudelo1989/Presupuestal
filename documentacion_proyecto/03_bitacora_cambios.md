# Bitacora de Cambios

Este archivo debe actualizarse en cada cambio tecnico o funcional.

## 2026-03-18

- Version: H0.1
- Fecha: 2026-03-18
- Responsable: GitHub Copilot + Usuario
- Objetivo del cambio: Crear base documental de continuidad para transferencia del proyecto.
- Archivos modificados:
  - `documentacion_proyecto/00_indice_documentacion.md`
  - `documentacion_proyecto/01_historial_desde_inicio.md`
  - `documentacion_proyecto/02_arquitectura_actual.md`
  - `documentacion_proyecto/03_bitacora_cambios.md`
  - `documentacion_proyecto/04_hoja_ruta_futuro.md`
- Impacto funcional: No cambia logica del sistema; mejora mantenibilidad y traspaso de conocimiento.
- Riesgos o pendientes: Validar periodicamente que la bitacora se mantenga actualizada despues de cada cambio.
- Validacion realizada: Verificacion de creacion y estructura de carpeta de documentacion.

## 2026-03-18

- Version: H0.2
- Fecha: 2026-03-18
- Responsable: GitHub Copilot + Usuario
- Objetivo del cambio: Definir e integrar convencion de versionado por hitos para trazabilidad.
- Archivos modificados:
  - `documentacion_proyecto/00_indice_documentacion.md`
  - `documentacion_proyecto/03_bitacora_cambios.md`
  - `documentacion_proyecto/05_convencion_versionado_hitos.md`
  - `README.md`
- Impacto funcional: No cambia logica del sistema; mejora control de versiones funcionales y auditoria.
- Riesgos o pendientes: Asegurar adopcion disciplinada de la etiqueta de version en cada nueva entrada.
- Validacion realizada: Revision de enlaces y consistencia de plantilla en documentacion.

## 2026-03-18

- Version: H0.3
- Fecha: 2026-03-18
- Responsable: GitHub Copilot + Usuario
- Objetivo del cambio: Agregar script de consolidacion EJE + CDP + CRP con indicadores de disponible real y por comprometer.
- Archivos modificados:
  - `consolidar_eje_cdp_crp.py`
  - `documentacion_proyecto/03_bitacora_cambios.md`
- Impacto funcional: Se habilita proceso reproducible para unir archivos Excel y generar salida consolidada.
- Riesgos o pendientes: Revisar nombres exactos de columnas en archivos fuente para evitar errores por variaciones de encabezado.
- Validacion realizada: Revision de errores en archivo Python (sin errores reportados).

## 2026-03-18

- Version: H0.4
- Fecha: 2026-03-18
- Responsable: GitHub Copilot + Usuario
- Objetivo del cambio: Renombrar el titulo de la seccion de distribucion en dashboard a "Ejecucion presupuestal".
- Archivos modificados:
  - `frontend/dashboard.html`
  - `documentacion_proyecto/03_bitacora_cambios.md`
- Impacto funcional: Ajuste visual de nomenclatura en interfaz; no altera logica de datos.
- Riesgos o pendientes: Ninguno identificado para este ajuste.
- Validacion realizada: Verificacion de texto actualizado en plantilla HTML.

## 2026-03-18

- Version: H0.5
- Fecha: 2026-03-18
- Responsable: GitHub Copilot + Usuario
- Objetivo del cambio: Renombrar etiquetas del grafico de distribucion en dashboard.
- Archivos modificados:
  - `frontend/dashboard.js`
  - `documentacion_proyecto/03_bitacora_cambios.md`
- Impacto funcional: En el grafico, CDP pasa a Apropiacion, CRP a Ejecucion y Seguimiento a Asignacion.
- Riesgos o pendientes: Ninguno identificado para este ajuste.
- Validacion realizada: Verificacion de etiquetas actualizadas en configuracion del grafico.

## 2026-03-18

- Version: H0.6
- Fecha: 2026-03-18
- Responsable: GitHub Copilot + Usuario
- Objetivo del cambio: Forzar actualizacion del archivo JS del dashboard para evitar caché del navegador.
- Archivos modificados:
  - `frontend/dashboard.html`
  - `documentacion_proyecto/03_bitacora_cambios.md`
- Impacto funcional: Se asegura que los ultimos cambios de etiquetas del grafico se reflejen de inmediato.
- Riesgos o pendientes: Si se hacen nuevos cambios de JS, actualizar el versionado de query string.
- Validacion realizada: Verificacion de referencia `dashboard.js?v=20260318-2` en HTML.

## 2026-03-18

- Version: H0.7
- Fecha: 2026-03-18
- Responsable: GitHub Copilot + Usuario
- Objetivo del cambio: Ajustar grafica de tendencia para mostrar valores en millones por dependencia de afectacion del gasto.
- Archivos modificados:
  - `frontend/dashboard.js`
  - `frontend/dashboard.html`
  - `documentacion_proyecto/03_bitacora_cambios.md`
- Impacto funcional: La seccion de tendencia deja de mostrar conteo y ahora presenta linea por dependencia con eje en millones COP.
- Riesgos o pendientes: Dependencias con nombres muy largos pueden reducir legibilidad; considerar filtro Top N configurable.
- Validacion realizada: Revision de errores (sin errores) y verificacion de textos/ejes/etiquetas en codigo.

## 2026-03-18

- Version: H0.8
- Fecha: 2026-03-18
- Responsable: GitHub Copilot + Usuario
- Objetivo del cambio: Crear botones para filtrar el dashboard por concepto y por dependencia de afectacion del gasto.
- Archivos modificados:
  - `frontend/dashboard.html`
  - `frontend/dashboard.js`
  - `documentacion_proyecto/03_bitacora_cambios.md`
- Impacto funcional: Se agregan filtros interactivos mediante botones (concepto/dependencia) y opcion de limpiar filtros.
- Riesgos o pendientes: El filtro de concepto aplica a la tabla resumen; si se requiere, se puede extender a todos los componentes.
- Validacion realizada: Revision de errores (sin errores) y verificacion de ids/eventos de botones en frontend.

## 2026-03-18

- Version: H0.9
- Fecha: 2026-03-18
- Responsable: GitHub Copilot + Usuario
- Objetivo del cambio: Revertir el ultimo ajuste de filtros por botones en dashboard por impacto visual.
- Archivos modificados:
  - `frontend/dashboard.html`
  - `frontend/dashboard.js`
  - `documentacion_proyecto/03_bitacora_cambios.md`
- Impacto funcional: Se elimina panel de filtros por botones y se restaura comportamiento visual previo.
- Riesgos o pendientes: Ninguno identificado.
- Validacion realizada: Revision de errores (sin errores) y verificacion de ausencia de referencias a filtros removidos.

---

## Plantilla para nuevas entradas

- Version:
- Fecha:
- Responsable:
- Objetivo del cambio:
- Archivos modificados:
- Impacto funcional:
- Riesgos o pendientes:
- Validacion realizada:
