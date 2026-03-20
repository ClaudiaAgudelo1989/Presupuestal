# Convencion de Versionado por Hitos

## Objetivo

Estandarizar como se etiquetan y documentan los avances del proyecto para facilitar auditoria, relevo y soporte.

## Esquema de version

Formato recomendado:

H<numero_hito>.<numero_entrega>

Ejemplos:
- H1.0 -> Primera entrega formal del Hito 1.
- H1.1 -> Ajuste menor sobre el Hito 1.
- H2.0 -> Primera entrega formal del Hito 2.

Reglas:
- El numero de hito cambia cuando hay un bloque funcional nuevo relevante.
- El numero de entrega sube cuando hay ajustes dentro del mismo hito.
- Evitar saltos grandes sin registro en bitacora.

## Definicion de hito

Crear un nuevo hito cuando ocurra al menos uno de estos casos:
- Se incorpora un modulo nuevo (por ejemplo, un nuevo tablero o nuevo flujo de carga).
- Cambia el modelo de datos de forma importante.
- Se modifica la arquitectura o forma de despliegue.
- Se completa una fase funcional del roadmap.

## Plantilla de registro por version

Registrar cada version en la bitacora con este encabezado:

- Version: Hx.y
- Fecha:
- Responsable:
- Objetivo del cambio:
- Archivos modificados:
- Impacto funcional:
- Riesgos o pendientes:
- Validacion realizada:

## Convencion para commits (recomendado)

Formato sugerido de mensaje:

[Hx.y] tipo: resumen breve

Ejemplos:
- [H2.0] feat: dashboard con metricas de ejecucion
- [H2.1] fix: correccion de paginacion en consulta CDP
- [H3.0] refactor: separacion de rutas y servicios backend

Tipos recomendados:
- feat: funcionalidad nueva
- fix: correccion de error
- refactor: mejora estructural sin cambio funcional
- docs: cambios de documentacion
- chore: tareas operativas

## Estado inicial aplicado

A partir de hoy, se propone iniciar con:
- Version base documental: H0.1

Motivo:
- Se consolida documentacion de continuidad y transferencia de conocimiento.
