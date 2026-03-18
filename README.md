# 📊 Sistema de Gestión Presupuestal 2026 - Guía Rápida

## ✨ Nuevas Características Implementadas

### 1. **Dashboard Completo** (`/frontend/dashboard.html`)
- 📈 Gráficos interactivos de ejecución presupuestal
- 📊 Métricas en tiempo real (CDP, CRP, Devengado, Presupuesto Base)
- 🔍 Filtros de búsqueda avanzados
- 📋 Tabla de resumen ejecutivo con porcentajes de ejecución
- 🌙 Modo oscuro/claro personalizable

### 2. **Interfaz de Carga Mejorada** (`/frontend/upload.html`)
- 🔄 Actualizar datos cuando llegue información nueva
- 🎨 Diseño moderno con colores SENA (verde oscuro + blanco)
- ✅ Validación y previsualización de Excel
- 📵 Secciones innecesarias ocultas para el cliente

### 3. **Backend Mejorado**
- ✨ Nuevos endpoints:
  - `GET /api/statistics` → Estadísticas en tiempo real
  - `POST /api/tables/{table}/truncate-and-load` → Actualizar datos completamente
- 🔄 Soporte para reemplazar o añadir datos
- 📊 Cálculos automáticos de ejecución presupuestal

### 4. **Tema Visual Profesional**
- 🎨 Colores corporativos SENA (verde oscuro #003d2e, blanco)
- 🌙 Toggle de modo oscuro (persiste en localStorage)
- 📱 Responsive para móviles y tablets
- ⚡ Transiciones suaves y profesionales

---

## 🚀 Cómo Usar

### En la página de **Carga de Datos**:
1. Selecciona la tabla destino
2. Carga tu archivo Excel y previsualiza
3. Sube el archivo a la tabla seleccionada
4. Tus datos se mostrarán en las pestañas (CDP, CRP, Seguimiento)
5. Usa los filtros para buscar registros específicos
6. Pagina entre resultados con Anterior/Siguiente

### En el **Dashboard**:
1. Ver métricas de ejecución presupuestal
2. Analizar distribución con gráficos (circular, barras o dona)
3. Buscar registros específicos por concepto o año
4. Descargar automáticamente al actualizar

---

## 📁 Estructura de Archivos Nuevo

```
frontend/
├── index.html              (inicio - redirige a upload)
├── upload.html         ✨  (carga de datos - MEJORADO)
├── dashboard.html      ✨  (dashboard completo - NUEVO)
├── styles.css          ✨  (estilos SENA - ACTUALIZADO)
├── upload.js           ✨  (lógica upload - MEJORADO)
└── dashboard.js        ✨  (lógica dashboard - NUEVO)
```

---

## 🔧 Endpoints Backend Disponibles

| Método | Ruta | Función |
|--------|------|---------|
| GET | `/api/tables/{table}/preview` | Ver datos con búsqueda y paginación |
| GET | `/api/statistics` | Estadísticas de las 3 tablas |
| POST | `/api/tables/{table}/truncate-and-load` | Actualizar tabla completamente |
| POST | `/api/excel/upload-to-table` | Cargar Excel a tabla existente |

---

## 💡 Flujo de Actualización de Datos

Cuando recibas informes nuevos:

1. **Agregar a tabla específica**:
   - Selecciona tabla destino
   - Carga Excel
   - Los datos se agregan (sin borrar existentes)

2. **Reemplazar completamente una tabla**:
   - Usa el endpoint `POST /api/tables/{table}/truncate-and-load`
   - Vacía y vuelve a cargar solo la tabla indicada

---

## 📊 Tablas Base Disponibles

| Tabla | Registros | Descripción |
|-------|-----------|------------|
| CDP | 1,085 | Certificaciones de Disponibilidad Presupuestal |
| CRP | 1,339 | Compromisos Presupuestales |
| Seguimiento | 155 | Estado de Seguimiento |

---

## 🎯 Características Listas para Cliente

✅ Cargar datos nuevos facilmente  
✅ Ver informes en dashboard profesional  
✅ Buscar y filtrar información  
✅ Paginación de resultados  
✅ Diseño responsivo  
✅ Modo oscuro opcional  
✅ Sin exposición de logs o consolas técnicas  
✅ Interfaz intuitiva y moderna  

---

## 🌐 Acceso

- **Carga de Datos**: http://127.0.0.1:8000/frontend/upload.html
- **Dashboard**: http://127.0.0.1:8000/frontend/dashboard.html
- **Inicio**: http://127.0.0.1:8000/

---

## 📌 Notas Técnicas

- Base de datos: MySQL 8.0+
- Charset: utf8mb4 (soporta caracteres especiales)
- Números con decimales (18,2) - soporta valores grandes
- Respaldo automático de datos en upload
- Transacciones para consistencia

---

**¡Sistema listo para producción! 🚀**
