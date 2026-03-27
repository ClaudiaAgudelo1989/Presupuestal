# 📖 Catálogo de Conceptos Presupuestales

## Descripción
El catálogo es una sección interactiva integrada en el dashboard que permite a los usuarios consultar definiciones y explicaciones de conceptos presupuestales como CDP, CRP, EJE, Rubros y términos relacionados.

## Características

✅ **Búsqueda inteligente** - Busca por título, definición o descripción
✅ **Tabs categorizados** - CDP, CRP, EJE, Rubros, Glosario, Todo
✅ **Modal flotante** - Accesible desde cualquier parte del dashboard
✅ **Responsive** - Compatible con dispositivos móviles
✅ **Tema oscuro/claro** - Se adapta al tema del dashboard
✅ **Animaciones suaves** - Interfaz fluida y moderna

## Ubicación en el Dashboard

- **Botón flotante** 📖 en la esquina inferior derecha
- Presiona para abrir el catálogo
- Presiona nuevamente o el botón ✕ para cerrar
- Presiona ESC para cerrar

## Cómo Agregar Conceptos desde el PDF

### Opción 1: Agregar manualmente en JavaScript

Edita el archivo `catalog.js` y agrega conceptos en el objeto `catalogData`:

```javascript
CDP: [
   {
       title: "Su título aquí",
       definition: "Definición corta",
       description: "Descripción completa del concepto",
       category: "cdp",
       icon: "📋"  // Usa emojis representativos
   },
   // Agrega más...
]
```

### Opción 2: Usar el método addConcepts() desde consola

En la consola del navegador (F12 → Console):

```javascript
window.catalogManager.addConcepts([
    {
        title: "Ejemplo de Concepto",
        definition: "Definición corta",
        description: "Descripción completa",
        category: "cdp",
        icon: "📋"
    }
], 'cdp');
```

### Opción 3: Agregar dinámicamente desde el backend

Si tienes un API que retorna los conceptos, modifica `catalog.js`:

```javascript
async function loadConceptsFromAPI() {
    try {
        const response = await fetch('/api/conceptos');
        const data = await response.json();
        
        data.forEach(concept => {
            window.catalogManager.addConcepts(
                [concept],
                concept.category
            );
        });
    } catch (error) {
        console.error('Error cargando conceptos:', error);
    }
}

// Llamar después de inicializar
loadConceptsFromAPI();
```

## Estructura de cada Concepto

```javascript
{
    title: string,           // Nombre del concepto (máx 50 caracteres)
    definition: string,      // Definición corta (1-2 líneas)
    description: string,     // Descripción completa (2-3 párrafos)
    category: string,        // 'cdp' | 'crp' | 'eje' | 'rubros' | 'glosario'
    icon: string            // Emoji (1 carácter)
}
```

## Categorías Disponibles

- **cdp** 📋 - Certificado de Disponibilidad Presupuestal
- **crp** 📝 - Certificado de Registro Presupuestal
- **eje** ⚙️ - Ejecución Presupuestal
- **rubros** 🏷️ - Rubros Presupuestales
- **glosario** 💬 - Términos y definiciones generales

## Emojis Recomendados

| Concepto | Emoji |
|----------|-------|
| Procesos | ⚙️ |
| Documentos | 📋 📝 |
| Transacciones | 💰 💵 |
| Datas | 📅 |
| Información | 💻 ℹ️ |
| Clasificación | 🏷️ 📊 |
| Términos | 💬 📚 |

## Función addConcepts()

```javascript
window.catalogManager.addConcepts(concepts, category)

// concepts: Array de objetos concepto
// category: 'cdp' | 'crp' | 'eje' | 'rubros' | 'glosario'
```

## Ejemplo Completo

```javascript
// Agregar varios conceptos a CDP
window.catalogManager.addConcepts([
    {
        title: "CDP - Certificado de Disponibilidad Presupuestal",
        definition: "Documento que certifica la disponibilidad de presupuesto.",
        description: "El CDP es el primer documento del ciclo presupuestal. Certifica que existe presupuesto disponible para la operación solicitada. Es requerido ante el SIIF para la contratación.",
        category: "cdp",
        icon: "📋"
    },
    {
        title: "Vigencia de CDP",
        definition: "Período de validez del certificado.",
        description: "La vigencia del CDP es generalmente de 30 días calendario desde su emisión. Puede ser renovado si es necesario.",
        category: "cdp",
        icon: "📅"
    }
], 'cdp');
```

## Archivos Relacionados

- `catalog.html` - Renderizado HTML básico (importado en dashboard.html)
- `catalog.js` - Lógica principal del catálogo
- `styles.css` - Estilos del catálogo (sección CATÁLOGO al final)
- `dashboard.html` - Integración en el dashboard

## Características Futuras

- [ ] Exportar catálogo a PDF
- [ ] Sincronización con base de datos backend
- [ ] Comentarios/anotaciones por usuario
- [ ] Historial de búsquedas
- [ ] Favoritos/marcadores
- [ ] Modo offline

## Soporte

Para agregar conceptos del PDF, copia el contenido relevante con esta estructura:
1. Título del concepto
2. Definición en 1-2 líneas
3. Descripción detallada
4. Elige categoría y emoji
5. Usa una de las opciones de agregación arriba

¡El catálogo se actualizará automáticamente!
