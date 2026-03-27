/**
 * ARCHIVO DE EJEMPLO: Cómo agregar conceptos del PDF al Catálogo
 * 
 * Copia esta plantilla y reemplaza con el contenido del PDF:
 * GuiaDescripciondelosRubrosPresupuestalesSENA-2025_(1).docx.pdf
 * 
 * Para agregar conceptos, sigue uno de estos métodos:
 */

// ==================== MÉTODO 1: Agregar en catalog.js ====================
// Edita directamente el archivo catalog.js en la sección correspondiente

// Ejemplo de conceptos para CDP:
const cdpConceptosDelPDF = [
    {
        title: "CDP - Certificado de Disponibilidad Presupuestal",
        definition: "[COPIAR DEL PDF - Definición oficial]",
        description: "[COPIAR DEL PDF - Descripción completa, puede ser 2-3 párrafos]",
        category: "cdp",
        icon: "📋"
    },
    {
        title: "Proceso de Expedición del CDP",
        definition: "[COPIAR DEL PDF]",
        description: "[COPIAR DEL PDF]",
        category: "cdp",
        icon: "⚙️"
    }
];

// Ejemplo de conceptos para CRP:
const crpConceptosDelPDF = [
    {
        title: "CRP - Certificado de Registro Presupuestal",
        definition: "[COPIAR DEL PDF]",
        description: "[COPIAR DEL PDF]",
        category: "crp",
        icon: "📝"
    }
];

// Ejemplo de conceptos para EJE:
const ejeConceptosDelPDF = [
    {
        title: "EJE - Ejecución Presupuestal",
        definition: "[COPIAR DEL PDF]",
        description: "[COPIAR DEL PDF]",
        category: "eje",
        icon: "⚙️"
    }
];

// Ejemplo de Rubros:
const rubrosConceptosDelPDF = [
    {
        title: "Rubro de Gastos de Funcionamiento",
        definition: "[COPIAR DEL PDF]",
        description: "[COPIAR DEL PDF]",
        category: "rubros",
        icon: "🏷️"
    }
];

// Ejemplo de Glosario (términos generales):
const glosarioTerminosDelPDF = [
    {
        title: "SIIF - Sistema Integrado de Información Financiera",
        definition: "[COPIAR DEL PDF]",
        description: "[COPIAR DEL PDF]",
        category: "glosario",
        icon: "💻"
    },
    {
        title: "Vigencia Presupuestal",
        definition: "[COPIAR DEL PDF]",
        description: "[COPIAR DEL PDF]",
        category: "glosario",
        icon: "📅"
    }
];

// ==================== MÉTODO 2: Agregar desde Consola del Navegador ====================
// 
// 1. Abre Dashboard en navegador
// 2. Presiona F12 para abrir herramientas de desarrollador
// 3. Ve a la pestaña "Console"
// 4. Copia y pega este código (reemplazando [...] con contenido del PDF):
//
// window.catalogManager.addConcepts([
//     {
//         title: "Tu Concepto Aquí",
//         definition: "Definición aquí",
//         description: "Descripción completa aquí",
//         category: "cdp",
//         icon: "📋"
//     }
// ], 'cdp');
//
// Repite para cada categoría necesaria

// ==================== MÉTODO 3: Crear archivo de datos externo ====================
// 
// 1. Crea un archivo: frontend/catalog-data.json
// 2. Estructura:
const catalogDataJSON = {
    "cdp": [
        {
            "title": "CDP - Certificado de Disponibilidad Presupuestal",
            "definition": "Del PDF",
            "description": "Del PDF",
            "category": "cdp",
            "icon": "📋"
        }
    ],
    "crp": [],
    "eje": [],
    "rubros": [],
    "glosario": []
};

// 3. Luego, modifica catalog.js para cargar el JSON:
//    fetch('catalog-data.json')
//        .then(r => r.json())
//        .then(data => {
//            Object.entries(data).forEach(([cat, concepts]) => {
//                window.catalogManager.addConcepts(concepts, cat);
//            });
//        });

// ==================== GUÍA DE CONTENIDO DEL PDF ====================
//
// PASO 1: Abre el PDF "GuiaDescripciondelosRubrosPresupuestalesSENA-2025_(1).docx.pdf"
//
// PASO 2: Busca las secciones principales:
//   - Definiciones de CDP
//   - Definiciones de CRP  
//   - Definiciones de EJE
//   - Clasificación de Rubros
//   - Glosario de términos
//
// PASO 3: Para cada concepto, extrae:
//   a) Title: El nombre o encabezado (máx 50-60 caracteres)
//   b) Definition: La definición oficial (1-2 líneas cortas)
//   c) Description: El párrafo o explicación completa (2-3 párrafos)
//   d) Icon: Elige un emoji representativo
//
// PASO 4: Copia los valores en la estructura de objeto
//
// PASO 5: Agrega usando uno de los 3 métodos arriba

// ==================== EMOJIS SUGERIDOS POR CATEGORÍA ====================
//
// CDP (Certificado Disponibilidad)
//   📋 - Documentos, certificados
//   ✅ - Aprobación, disponibilidad
//   🟢 - Estado positivo
//
// CRP (Certificado Registro)  
//   📝 - Registro, escritura
//   📊 - Datos, información
//   🔗 - Vinculación
//
// EJE (Ejecución)
//   ⚙️ - Proceso, ejecución
//   🚀 - Movimiento, progreso
//   💰 - Dinero, gasto
//
// RUBROS
//   🏷️ - Clasificación, etiquetas
//   📊 - Datos, categorías
//   📂 - Carpetas, agrupación
//
// GLOSARIO
//   💬 - Términos, definiciones
//   📚 - Conocimiento, referencia
//   ℹ️ - Información

// ==================== VALIDACIÓN DE CONCEPTOS ====================
//
// Cada concepto debe cumplir:
// ✓ title: string no vacío (máx 60 caracteres)
// ✓ definition: string (1-2 líneas)
// ✓ description: string (2-3+ párrafos)
// ✓ category: 'cdp' | 'crp' | 'eje' | 'rubros' | 'glosario'
// ✓ icon: Un emoji válido
//
// Si falta algo, el concepto NO se agregará correctamente

// ==================== EJEMPLO COMPLETO LISTO PARA USAR ====================

/*
// Copia esto completo a la consola (F12):

window.catalogManager.addConcepts([
    {
        title: "CDP - Certificado de Disponibilidad Presupuestal",
        definition: "Documento emitido por la Dependencia Financiera que certifica la disponibilidad de presupuesto para una obligación específica.",
        description: "El CDP es el documento inicial en el ciclo presupuestal que asegura que existe presupuesto disponible para ejecutar un gasto. Este documento es requerido obligatoriamente en el SIIF (Sistema Integrado de Información Financiera) antes de cualquier transacción. El CDP tiene validez por un período determinado y puede renovarse si es necesario.",
        category: "cdp",
        icon: "📋"
    },
    {
        title: "Disponibilidad Presupuestal",
        definition: "Verificación de que existe presupuesto no comprometido para una operación.",
        description: "La disponibilidad presupuestal es el resultado de verificar que después de restar todos los CDP y compromisos existentes, aún queda presupuesto disponible para nuevas operaciones. Este cálculo es fundamental antes de emitir cualquier nuevo CDP.",
        category: "cdp",
        icon: "✅"
    }
], 'cdp');

*/

// ==================== PRÓXIMOS PASOS ====================
//
// 1. Lee el PDF completo
// 2. Identifica todos los conceptos principales
// 3. Extrae definiciones y descripciones
// 4. Usa uno de los 3 métodos para agregar
// 5. Refresca el Dashboard (F5)
// 6. Abre el Catálogo (botón 📖) y valida

console.log("✅ Archivo de ejemplo cargado. Ver instrucciones en CATALOGO_README.md");
