/**
 * Catálogo de Conceptos Presupuestales
 * Gestiona la visualización e interacción del catálogo de conceptos CDP, CRP, EJE, Rubros, etc.
 */

const catalogData = {
    all: [
        // Esta sección se cargará con todos los conceptos
    ],
    cdp: [
        {
            title: "CDP - Certificado de Disponibilidad Presupuestal",
            definition: "Documento emitido por la Dependencia Financiera que certifica la disponibilidad de presupuesto para una transacción específica.",
            description: "El CDP es el primer documento del ciclo presupuestal que certifica existe presupuesto disponible para la contratación.",
            category: "cdp",
            icon: "📋"
        }
    ],
    crp: [
        {
            title: "CRP - Certificado de Registro Presupuestal",
            definition: "Documento que formaliza el registro del CDP en la Dependencia de Presupuesto.",
            description: "El CRP vincula el CDP a una obligación específica del estado.",
            category: "crp",
            icon: "📝"
        }
    ],
    eje: [
        {
            title: "EJE - Ejecución Presupuestal",
            definition: "Fase del ciclo presupuestal donde se realiza la obligación del gasto registrado en el CRP.",
            description: "La EJE es cuando realmente se contrae la obligación presupuestal con un tercero.",
            category: "eje",
            icon: "⚙️"
        }
    ],
    rubros: [
        {
            title: "Rubros Presupuestales",
            definition: "Clasificación del presupuesto según la naturaleza del gasto.",
            description: "Los rubros agrupan conceptos de gasto similares para su seguimiento y control.",
            category: "rubros",
            icon: "🏷️"
        }
    ],
    glosario: [
        {
            title: "SIIF",
            definition: "Sistema Integrado de Información Financiera",
            description: "Sistema que registra todas las transacciones presupuestales.",
            category: "glosario",
            icon: "💻"
        },
        {
            title: "Vigencia",
            definition: "Período de tiempo (generalmente un año calendario) en que se ejecuta el presupuesto.",
            description: "Para 2026, la vigencia es del 1 de enero al 31 de diciembre de 2026.",
            category: "glosario",
            icon: "📅"
        },
        {
            title: "Dependencia",
            definition: "Entidad administrativa responsable de la ejecución presupuestal.",
            description: "Puede ser un ministerio, departamento o centro de formación.",
            category: "glosario",
            icon: "🏢"
        }
    ]
};

class CatalogManager {
    constructor() {
        this.currentTab = 'all';
        this.currentSearch = '';
        this.isOpen = false;
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadInitialContent();
    }

    cacheElements() {
        this.catalogView = document.getElementById('catalogView');
        this.catalogContent = document.getElementById('catalogContent');
        this.catalogNavBtn = document.getElementById('catalogNavBtn');
        this.catalogBackBtn = document.getElementById('catalogBackBtn');
        this.catalogSearchInput = document.getElementById('catalogSearchInput');
        this.catalogTabs = document.querySelectorAll('.catalog-tab-btn');
    }

    bindEvents() {
        // Abrir catálogo desde botón de navegación
        if (this.catalogNavBtn) {
            this.catalogNavBtn.addEventListener('click', () => this.open());
        }

        if (this.catalogBackBtn) {
            this.catalogBackBtn.addEventListener('click', () => this.close());
        }

        // Tabs
        this.catalogTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.catalogTab));
        });

        // Búsqueda
        if (this.catalogSearchInput) {
            this.catalogSearchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value.toLowerCase();
                this.renderContent();
            });
        }

        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    loadInitialContent() {
        // Combinar todos los conceptos
        catalogData.all = [
            ...catalogData.cdp,
            ...catalogData.crp,
            ...catalogData.eje,
            ...catalogData.rubros,
            ...catalogData.glosario
        ];
        this.renderContent();
    }

    switchTab(tab) {
        this.currentTab = tab;
        this.currentSearch = '';
        if (this.catalogSearchInput) {
            this.catalogSearchInput.value = '';
        }

        // Actualizar botones de tab
        this.catalogTabs.forEach(btn => {
            btn.classList.toggle('is-active', btn.dataset.catalogTab === tab);
        });

        this.renderContent();
    }

    filterContent() {
        const data = catalogData[this.currentTab] || [];
        const search = this.currentSearch;

        if (!search) return data;

        return data.filter(item => {
            const searchText = search.toLowerCase();
            return (
                item.title.toLowerCase().includes(searchText) ||
                item.definition.toLowerCase().includes(searchText) ||
                item.description.toLowerCase().includes(searchText)
            );
        });
    }

    renderContent() {
        const filteredData = this.filterContent();

        if (filteredData.length === 0) {
            this.catalogContent.innerHTML = `
                <div class="catalog-empty-state">
                    <p>❌ No se encontraron resultados para "<strong>${this.currentSearch}</strong>"</p>
                </div>
            `;
            return;
        }

        const html = filteredData.map((item, index) => `
            <div class="catalog-item" style="animation-delay: ${index * 50}ms;">
                <div class="catalog-item-header">
                    <span class="catalog-item-icon">${item.icon}</span>
                    <h3 class="catalog-item-title">${this.highlightSearch(item.title)}</h3>
                </div>
                <div class="catalog-definition">
                    <strong>Definición:</strong> ${this.highlightSearch(item.definition)}
                </div>
                <div class="catalog-description">
                    ${this.highlightSearch(item.description)}
                </div>
                <div class="catalog-item-category">
                    <span class="category-badge">${this.getCategoryLabel(item.category)}</span>
                </div>
            </div>
        `).join('');

        this.catalogContent.innerHTML = html;
    }

    highlightSearch(text) {
        if (!this.currentSearch) return text;

        const regex = new RegExp(`(${this.currentSearch})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    getCategoryLabel(category) {
        const labels = {
            cdp: '📋 CDP',
            crp: '📝 CRP',
            eje: '⚙️ EJE',
            rubros: '🏷️ Rubros',
            glosario: '💬 Glosario'
        };
        return labels[category] || category;
    }

    open() {
        this.catalogView.classList.remove('hidden');
        this.catalogNavBtn?.classList.add('active');
        this.isOpen = true;
        if (this.catalogSearchInput) {
            this.catalogSearchInput.focus();
        }
        // Ocultar dashboard-grid
        const dashboardGrid = document.querySelector('.dashboard-grid');
        if (dashboardGrid) {
            dashboardGrid.classList.add('hidden');
        }
    }

    close() {
        this.catalogView.classList.add('hidden');
        this.catalogNavBtn?.classList.remove('active');
        this.isOpen = false;
        if (this.catalogSearchInput) {
            this.catalogSearchInput.value = '';
        }
        this.currentSearch = '';
        // Mostrar dashboard-grid
        const dashboardGrid = document.querySelector('.dashboard-grid');
        if (dashboardGrid) {
            dashboardGrid.classList.remove('hidden');
        }
        // Hacer scroll al inicio del dashboard
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Método para agregar más conceptos desde el PDF
    addConcepts(concepts, category) {
        if (catalogData[category]) {
            catalogData[category].push(...concepts);
            // Actualizar el tab 'all'
            catalogData.all = [
                ...catalogData.cdp,
                ...catalogData.crp,
                ...catalogData.eje,
                ...catalogData.rubros,
                ...catalogData.glosario
            ];
            if (this.isOpen) {
                this.renderContent();
            }
        }
    }
}

// Inicializar catálogo cuando el documento esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.catalogManager = new CatalogManager();

    // Opcional: Agregar acceso rápido desde consola para agregar conceptos
    // Ejemplo: window.catalogManager.addConcepts([{...}], 'cdp');
});

// Exportar para uso desde otros scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CatalogManager;
}
