-- Script de diagnóstico para la tabla EJE
-- Ejecuta estas queries en MySQL Workbench para diagnosticar el problema

USE presupuesto;

-- 1. Contar registros en tabla EJE
SELECT 'Total registros' as diagnostic, COUNT(*) as valor
FROM eje
UNION ALL
-- 2. Contar NULL en columnas principales
SELECT 'Null en Apropiacion_Disponible', COUNT(*) - COUNT(Apropiacion_Disponible)
FROM eje
UNION ALL
SELECT 'Null en Total_Compromiso', COUNT(*) - COUNT(Total_Compromiso)
FROM eje
UNION ALL
SELECT 'Null en Total_CDP', COUNT(*) - COUNT(Total_CDP)
FROM eje
UNION ALL
-- 3. Ver distribución de valores
SELECT 'Rows con Apropiacion_Disponible > 0', COUNT(*)
FROM eje
WHERE Apropiacion_Disponible > 0
UNION ALL
SELECT 'Rows con Total_Compromiso > 0', COUNT(*)
FROM eje
WHERE Total_Compromiso > 0
UNION ALL
-- 4. Ver muestra de datos
SELECT 'Primeras 5 filas de EJE - primeras 5 columnas:' as info, NULL;

-- Vista rápida de datos
SELECT id, Dependencia, Concepto, Apropiacion_Disponible, Total_Compromiso
FROM eje
LIMIT 5;

-- Si todos están NULL, esta query te mostrará qué columnas NO son NULL:
SELECT COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'presupuesto' 
  AND TABLE_NAME = 'eje'
  AND COLUMN_NAME NOT IN ('id', 'Vigencia')
LIMIT 20;
