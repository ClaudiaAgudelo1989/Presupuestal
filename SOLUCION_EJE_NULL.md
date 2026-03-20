# Solución: Valores NULL en Tabla EJE

## Problema
Los valores en la tabla `eje` aparecen como NULL en MySQL Workbench.

## Causa
Había dos problemas:
1. La tabla `eje` podría no haberse creado correctamente
2. El mapeo de columnas del archivo EJE a la tabla BD era muy rígido (usaba `.get()` exacto)

## Solución

### Paso 1: Recrear la tabla EJE en MySQL
1. Abre **MySQL Workbench**
2. Abre el archivo: `crear_tabla_eje.sql` (está en la raíz del proyecto)
3. Ejecuta el script completo (`Ctrl + Shift + Enter`)

Esto creará la tabla `eje` con la estructura correcta.

### Paso 2: Actualizar el servidor
1. Detén el servidor API actual (cierra `iniciar_entorno_excel.bat`)
2. Abre `iniciar_entorno_excel.bat` nuevamente para reiniciar

### Paso 3: Subir datos EJE nuevamente
1. Abre el dashboard en `http://127.0.0.1:8000/frontend/upload.html`
2. Haz clic en **"Cargar Datos"**
3. Selecciona tu archivo EJE (Excel)
4. En "Tabla destino", elige **"eje"**
5. Haz clic en **"Cargar"**

### Paso 4: Verificar
1. Abre MySQL Workbench
2. Navega a: `presupuesto` → `eje`
3. Los valores ya NO deberían ser NULL

## Cambios del Backend

Se realizaron dos mejoras:

1. **Mapeo flexible de columnas**: Ahora busca columnas por alias en cualquier combinación de mayúsculas/minúsculas
   - Ejemplo: busca "APROPIACION DISPONIBLE DEP.GSTO" o "Apropiacion_Disponible"

2. **Inferencia automática de Vigencia**: Detecta el año más común en los datos y lo asigna automáticamente

## Soporte para columnas EJE

El sistema ahora soporta estos nombres de columna:
- Dependencia / DEPENDENCIA DE AFECTACION DE GASTOS
- Tipo / TIPO
- Concepto / CONCEPTO
- Fuente / FUENTE
- Situacion / SITUACION
- Recurso / RECURSO / REC.
- Apropiacion_Vigente / APROPIACION VIGENTE DEP.GSTO
- Total_CDP / TOTAL CDP DEP.GSTOS
- Apropiacion_Disponible / APROPIACION DISPONIBLE DEP.GSTO
- Total_CDP_Modificacion / TOTAL CDP MODIFICACION DEP.GSTOS
- Total_Compromiso / TOTAL COMPROMISO DEP.GSTOS
- CDP_Por_Comprometer / CDP POR COMPROMETER DEP.GSTOS
- Total_Obligaciones / TOTAL OBLIGACIONES DEP.GSTOS
- Compromiso_Por_Obligar / COMPROMISO POR OBLIGAR DEP.GSTOS
- Total_Ordenes_Pago / TOTAL ORDENES DE PAGO DEP.GSTOS
- Obligaciones_Por_Ordenar / OBLIGACIONES POR ORDENAR DEP.GSTOS
- Pagos / PAGOS DEP.GSTOS
- Ordenes_Pago_Por_Pagar / ORDENES DE PAGO POR PAGAR DEP.GSTOS
- Total_Reintegros / TOTAL REINTEGROS DEP.GSTOS CDP
