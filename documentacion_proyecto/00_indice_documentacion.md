# Documentacion del Proyecto - Ejecucion Presupuestal 2026

Este directorio centraliza la documentacion de continuidad del proyecto para facilitar el relevo a otra persona.

## Objetivo

Dejar trazabilidad de:
- Lo que se construyo desde el inicio (reconstruido con evidencia del repositorio).
- Lo que se vaya cambiando en adelante.
- El plan recomendado de evolucion del proyecto.

## Archivos de esta carpeta

1. `01_historial_desde_inicio.md`
   - Resume la evolucion del proyecto desde su fase inicial hasta el estado actual.
2. `02_arquitectura_actual.md`
   - Explica componentes, flujo funcional y piezas criticas.
3. `03_bitacora_cambios.md`
   - Registro cronologico de cambios nuevos (debe actualizarse en cada intervencion).
4. `04_hoja_ruta_futuro.md`
   - Backlog sugerido y prioridades de evolucion.
5. `05_convencion_versionado_hitos.md`
   - Estandar de versionado por hitos y entregas incrementales.

## Regla de mantenimiento

Cada vez que se haga un cambio en codigo o en base de datos, actualizar minimo:
- `03_bitacora_cambios.md`
- `04_hoja_ruta_futuro.md` (si cambia prioridad o se cierra una tarea)
- Usar la convencion de `05_convencion_versionado_hitos.md` para registrar la version.

## Convencion de registro de cambios

Usar esta estructura por cada entrada nueva:

- Version:
- Fecha:
- Responsable:
- Objetivo del cambio:
- Archivos modificados:
- Impacto funcional:
- Riesgos o pendientes:
- Validacion realizada:
