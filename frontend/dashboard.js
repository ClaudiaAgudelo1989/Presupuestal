const state = {
  tables: [],
  ejeSourceTable: 'eje',
  dashboardData: {
    cdp: [],
    crp: [],
    eje: [],
    seguimiento: [],
  },
  sourceYearCache: {
    cdp: null,
    crp: null,
    eje: null,
    seguimiento: null,
  },
  charts: {},
  searchTerm: '',
  filterType: '',
  activeSource: 'all',
  filters: {
    concept: '',
    dependency: '',
  },
  summarySort: {
    key: 'valor',
    direction: 'desc',
  },
  ejeGroupFilters: {
    dependency: '',
    rec: '',
    rubro: '',
    concept: '',
    siif: '',
    center: '',
    cdpCode: '',
    cdpRequest: '',
    keyword: '',
  },
};

const elements = {
  metricCDP: document.getElementById('metricCDP'),
  metricCRP: document.getElementById('metricCRP'),
  metricEJE: document.getElementById('metricEJE'),
  metricDevengado: document.getElementById('metricDevengado'),
  metricBase: document.getElementById('metricBase'),
  chartTypeSelect: document.getElementById('chartTypeSelect'),
  refreshDashboardBtn: document.getElementById('refreshDashboardBtn'),
  summarySearchInput: document.getElementById('summarySearchInput'),
  summaryFilterSelect: document.getElementById('summaryFilterSelect'),
  conceptFilterSelect: document.getElementById('conceptFilterSelect'),
  dependencyFilterSelect: document.getElementById('dependencyFilterSelect'),
  summarySiifFilterSelect: document.getElementById('summarySiifFilterSelect'),
  summaryCenterFilterSelect: document.getElementById('summaryCenterFilterSelect'),
  summaryCdpCodeFilterSelect: document.getElementById('summaryCdpCodeFilterSelect'),
  summaryCdpRequestFilterSelect: document.getElementById('summaryCdpRequestFilterSelect'),
  summaryViewButtons: Array.from(document.querySelectorAll('[data-summary-view]')),
  ejeDependencyFilterSelect: document.getElementById('ejeDependencyFilterSelect'),
  ejeRecFilterSelect: document.getElementById('ejeRecFilterSelect'),
  ejeRubroFilterSelect: document.getElementById('ejeRubroFilterSelect'),
  ejeConceptFilterSelect: document.getElementById('ejeConceptFilterSelect'),
  ejeSiifFilterSelect: document.getElementById('ejeSiifFilterSelect'),
  ejeCenterFilterSelect: document.getElementById('ejeCenterFilterSelect'),
  ejeCdpCodeFilterSelect: document.getElementById('ejeCdpCodeFilterSelect'),
  ejeCdpRequestFilterSelect: document.getElementById('ejeCdpRequestFilterSelect'),
  ejeKeywordFilterInput: document.getElementById('ejeKeywordFilterInput'),
  ejeClearFiltersBtn: document.getElementById('ejeClearFiltersBtn'),
  ejeActiveFiltersChip: document.getElementById('ejeActiveFiltersChip'),
  ejeGroupedBody: document.getElementById('ejeGroupedBody'),
  ejeGroupedSummaryInfo: document.getElementById('ejeGroupedSummaryInfo'),
  sourceToggleButtons: Array.from(document.querySelectorAll('[data-source-toggle]')),
  metricCards: Array.from(document.querySelectorAll('[data-metric-source]')),
  activeDashboardFilters: document.getElementById('activeDashboardFilters'),
  summaryBody: document.getElementById('summaryBody'),
  executiveSummaryBody: document.getElementById('executiveSummaryBody'),
  quarterAlertsPanel: document.getElementById('quarterAlertsPanel'),
  quarterOverallStatus: document.getElementById('quarterOverallStatus'),
  quarterAlertsInfo: document.getElementById('quarterAlertsInfo'),
  quarterAlertsGrid: document.getElementById('quarterAlertsGrid'),
  dataSourceInfo: document.getElementById('dataSourceInfo'),
};

function getApiBase() {
  const origin = window.location.origin;
  if (!origin || origin === 'null' || window.location.protocol === 'file:') {
    return 'http://127.0.0.1:8000';
  }
  return origin.replace(/\/$/, '');
}

async function request(path, options = {}) {
  const url = `${getApiBase()}${path}`;
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || response.statusText);
  }

  return response.json();
}

function formatCurrency(value) {
  if (!value) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value) {
  if (!value) return '0';
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

async function loadTableData(tableName, limit = 50) {
  try {
    const firstPage = await request(`/api/tables/${tableName}/preview?limit=${limit}&page=1`);
    const rows = [...(firstPage.rows || [])];
    const totalPages = Number(firstPage.total_pages || 1);

    if (totalPages > 1) {
      const pages = [];
      for (let page = 2; page <= totalPages; page += 1) {
        pages.push(page);
      }

      const batchSize = 8;
      for (let i = 0; i < pages.length; i += batchSize) {
        const batch = pages.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(page => request(`/api/tables/${tableName}/preview?limit=${limit}&page=${page}`))
        );

        results.forEach((result, index) => {
          const pageNumber = batch[index];
          if (result.status === 'fulfilled') {
            rows.push(...(result.value.rows || []));
          } else {
            console.error(`Error cargando página ${pageNumber} de ${tableName}:`, result.reason);
          }
        });
      }
    }

    return rows;
  } catch (error) {
    console.error(`Error cargando ${tableName}:`, error);
    return [];
  }
}

function extractNumericValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return Number.isNaN(num) ? 0 : num;
  }
  return 0;
}

function normalizeToken(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function getValueByAliases(row, aliases) {
  const keys = Object.keys(row || {});
  if (keys.length === 0) return null;

  const normalizedKeys = keys.map(key => ({
    key,
    token: normalizeToken(key),
  }));

  for (const alias of aliases) {
    const aliasToken = normalizeToken(alias);
    const exact = normalizedKeys.find(item => item.token === aliasToken);
    if (exact) return row[exact.key];

    const partial = normalizedKeys.find(item => item.token.includes(aliasToken));
    if (partial) return row[partial.key];
  }

  return null;
}

function getDependencyName(row) {
  const dependency = getValueByAliases(row, [
    'dependencia de afectacion del gasto',
    'dependencia de afectacion de gastos',
    'dependencia descripcion',
    'dependencia_descripcion',
    'dependencia',
  ]);

  const value = String(dependency || '').trim();
  return value || 'SIN DEPENDENCIA';
}

function getConceptName(row, source) {
  const concept = getValueByAliases(row, [
    'concepto',
    'descripcion',
    'rubro',
    'objeto',
    'tipo de cdp',
    'tipo_de_cdp',
  ]);

  const value = String(concept || '').trim();
  if (value) return value;

  if (source === 'cdp') return 'CDP';
  if (source === 'crp') return 'CRP';
  return 'SEGUIMIENTO';
}

function getSiifName(row) {
  const value = getValueByAliases(row, [
    'siif',
    'siif nacion',
    'codigo siif',
    'cod siif',
  ]);

  const text = String(value || '').trim();
  return text || 'N/A';
}

function getCenterName(row) {
  const value = getValueByAliases(row, [
    'centro de formacion',
    'centro de formación',
    'centro formacion',
    'centro_formacion',
    'nombre centro',
    'centro',
  ]);

  const text = String(value || '').trim();
  return text || 'N/A';
}

function getCdpCodeName(row) {
  const value = getValueByAliases(row, [
    'codigo del cdp',
    'codigo cdp',
    'cod cdp',
    'numero cdp',
    'nro cdp',
    'cdp',
  ]);

  const text = String(value || '').trim();
  return text || 'N/A';
}

function getCdpRequestName(row) {
  const value = getValueByAliases(row, [
    'solicitud de cdp',
    'solicitud cdp',
    'solicitud_cdp',
    'numero solicitud cdp',
    'numero de solicitud cdp',
    'nro solicitud cdp',
    'solicitud',
  ]);

  const text = String(value || '').trim();
  return text || 'N/A';
}

function getAmountBySource(row, source) {
  if (source === 'cdp') return getCdpInitialValue(row);
  if (source === 'crp') return getCrpDevengadoValue(row);
  if (source === 'eje') return getEjeExecutionValue(row);
  return getAmountValue(row);
}

function getRecBySource(row, source) {
  if (source === 'eje') return getEjeRec(row);
  return String(getValueByAliases(row, ['REC.', 'Rec', 'Recurso']) || 'N/A').trim() || 'N/A';
}

function getRubroBySource(row, source) {
  if (source === 'eje') return getEjeRubro(row);
  return String(getValueByAliases(row, ['Rubro', 'Objeto']) || 'N/A').trim() || 'N/A';
}

function getSummaryViewFromFilters() {
  const filter = elements.summaryFilterSelect?.value || '';
  return filter || 'all';
}

function updateSummaryViewTabs() {
  const activeView = getSummaryViewFromFilters();
  elements.summaryViewButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.summaryView === activeView);
  });
}

function getSummaryColumnsForView(view) {
  if (view === 'eje') {
    return [
      { key: 'fuente', title: 'Fuente' },
      { key: 'concepto', title: 'Concepto' },
      { key: 'vigencia', title: 'Vigencia' },
      { key: 'dependencia', title: 'Dependencia' },
      { key: 'siif', title: 'SIIF' },
      { key: 'center', title: 'Centro de Formación' },
      { key: 'rec', title: 'REC/Recurso' },
      { key: 'rubro', title: 'Rubro' },
      { key: 'cdpCode', title: 'Código CDP' },
      { key: 'cdpRequest', title: 'Solicitud CDP' },
      { key: 'valor', title: 'Valor EJE', isCurrency: true },
    ];
  }

  if (view === 'cdp') {
    return [
      { key: 'fuente', title: 'Fuente' },
      { key: 'concepto', title: 'Concepto' },
      { key: 'vigencia', title: 'Vigencia' },
      { key: 'dependencia', title: 'Dependencia' },
      { key: 'siif', title: 'SIIF' },
      { key: 'center', title: 'Centro de Formación' },
      { key: 'cdpCode', title: 'Código CDP' },
      { key: 'cdpRequest', title: 'Solicitud CDP' },
      { key: 'valor', title: 'Valor CDP', isCurrency: true },
    ];
  }

  if (view === 'crp') {
    return [
      { key: 'fuente', title: 'Fuente' },
      { key: 'concepto', title: 'Concepto' },
      { key: 'vigencia', title: 'Vigencia' },
      { key: 'dependencia', title: 'Dependencia' },
      { key: 'siif', title: 'SIIF' },
      { key: 'center', title: 'Centro de Formación' },
      { key: 'cdpCode', title: 'Código CDP' },
      { key: 'cdpRequest', title: 'Solicitud CDP' },
      { key: 'valor', title: 'Valor CRP', isCurrency: true },
    ];
  }

  return [
    { key: 'fuente', title: 'Fuente' },
    { key: 'concepto', title: 'Concepto' },
    { key: 'vigencia', title: 'Vigencia' },
    { key: 'dependencia', title: 'Dependencia' },
    { key: 'siif', title: 'SIIF' },
    { key: 'center', title: 'Centro de Formación' },
    { key: 'cdpCode', title: 'Código CDP' },
    { key: 'cdpRequest', title: 'Solicitud CDP' },
    { key: 'valor', title: 'Valor', isCurrency: true },
  ];
}

function toggleSummarySort(key) {
  if (!key) return;

  if (state.summarySort.key === key) {
    state.summarySort.direction = state.summarySort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    state.summarySort.key = key;
    state.summarySort.direction = key === 'valor' ? 'desc' : 'asc';
  }
}

function compareSummaryRows(a, b, key, direction) {
  const dir = direction === 'asc' ? 1 : -1;
  const numericKeys = new Set(['valor', 'vigencia']);

  if (numericKeys.has(key)) {
    const aNum = Number(a[key] || 0);
    const bNum = Number(b[key] || 0);
    return (aNum - bNum) * dir;
  }

  const aText = String(a[key] ?? '').toLocaleLowerCase('es');
  const bText = String(b[key] ?? '').toLocaleLowerCase('es');
  return aText.localeCompare(bText, 'es', { sensitivity: 'base' }) * dir;
}

function tryExtractYear(value) {
  if (value === null || value === undefined) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    return year >= 2000 && year <= 2100 ? year : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const rounded = Math.trunc(value);

    if (rounded >= 2000 && rounded <= 2100) {
      return rounded;
    }

    if (rounded >= 30000 && rounded <= 70000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + rounded * 24 * 60 * 60 * 1000);
      const year = date.getUTCFullYear();
      return year >= 2000 && year <= 2100 ? year : null;
    }
  }

  const text = String(value).trim();
  if (!text) return null;

  const yearMatch = text.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    return year >= 2000 && year <= 2100 ? year : null;
  }

  const parsedDate = new Date(text);
  if (!Number.isNaN(parsedDate.getTime())) {
    const year = parsedDate.getFullYear();
    return year >= 2000 && year <= 2100 ? year : null;
  }

  return null;
}

function tryExtractMonth(value) {
  if (value === null || value === undefined) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getMonth() + 1;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const rounded = Math.trunc(value);

    if (rounded >= 1 && rounded <= 12) {
      return rounded;
    }

    if (rounded >= 30000 && rounded <= 70000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + rounded * 24 * 60 * 60 * 1000);
      return date.getUTCMonth() + 1;
    }
  }

  const text = String(value).trim();
  if (!text) return null;

  const numericMonth = text.match(/\b(0?[1-9]|1[0-2])\b/);
  if (numericMonth && text.length <= 2) {
    return Number(numericMonth[1]);
  }

  const monthMap = {
    enero: 1,
    feb: 2,
    febrero: 2,
    mar: 3,
    marzo: 3,
    abr: 4,
    abril: 4,
    may: 5,
    mayo: 5,
    jun: 6,
    junio: 6,
    jul: 7,
    julio: 7,
    ago: 8,
    agosto: 8,
    sep: 9,
    sept: 9,
    septiembre: 9,
    oct: 10,
    octubre: 10,
    nov: 11,
    noviembre: 11,
    dic: 12,
    diciembre: 12,
  };

  const normalized = normalizeToken(text);
  const monthFromName = Object.entries(monthMap).find(([name]) => normalized.includes(normalizeToken(name)));
  if (monthFromName) {
    return monthFromName[1];
  }

  const isoDate = text.match(/\b(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);
  if (isoDate) {
    const month = Number(isoDate[2]);
    if (month >= 1 && month <= 12) return month;
  }

  const latamDate = text.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b/);
  if (latamDate) {
    const month = Number(latamDate[2]);
    if (month >= 1 && month <= 12) return month;
  }

  const parsedDate = new Date(text);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getMonth() + 1;
  }

  return null;
}

function tryExtractQuarter(value) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text) return null;

  const quarterMatch = text.match(/(?:trimestre|trim|q|t)\s*[-:]?\s*([1-4])/i);
  if (quarterMatch) {
    return Number(quarterMatch[1]);
  }

  const loneQuarter = text.match(/^([1-4])$/);
  if (loneQuarter) {
    return Number(loneQuarter[1]);
  }

  return null;
}

function monthToQuarter(month) {
  if (!month || month < 1 || month > 12) return null;
  return Math.floor((month - 1) / 3) + 1;
}

function extractQuarterFromRow(row) {
  const quarterValue = getValueByAliases(row, [
    'trimestre',
    'trim',
    'quarter',
    'q',
    'periodo',
  ]);

  const directQuarter = tryExtractQuarter(quarterValue);
  if (directQuarter) return directQuarter;

  const monthValue = getValueByAliases(row, [
    'mes',
    'mes registro',
    'mes_registro',
    'fecha de registro',
    'fecha_registro',
    'fecha de creacion',
    'fecha_creacion',
    'fecha movimientos',
    'periodo',
  ]);

  const month = tryExtractMonth(monthValue);
  if (month) return monthToQuarter(month);

  return null;
}

function getRowsBySourceName(source) {
  if (source === 'cdp') return state.dashboardData.cdp;
  if (source === 'crp') return state.dashboardData.crp;
  if (source === 'eje') return state.dashboardData.eje;
  return state.dashboardData.seguimiento;
}

function getActiveDashboardData() {
  if (state.activeSource === 'all') {
    return state.dashboardData;
  }

  return {
    cdp: state.activeSource === 'cdp' ? state.dashboardData.cdp : [],
    crp: state.activeSource === 'crp' ? state.dashboardData.crp : [],
    eje: state.activeSource === 'eje' ? state.dashboardData.eje : [],
    seguimiento: state.activeSource === 'seguimiento' ? state.dashboardData.seguimiento : [],
  };
}

function setActiveSource(source) {
  state.activeSource = source;

  elements.sourceToggleButtons.forEach(button => {
    const isActive = button.dataset.sourceToggle === source;
    button.classList.toggle('is-active', isActive);
  });

  updateMetricVisibility();
  updateFilterLabels();
  updateMetrics();
  updateCharts();
  updateSummaryTable();
  updateQuarterAlerts();
  updateExecutiveSummary();
  updateDataSourceInfo();
}

function updateMetricVisibility() {
  const source = state.activeSource;

  elements.metricCards.forEach(card => {
    const cardSource = card.dataset.metricSource || 'all';
    const isVisible = source === 'all' || cardSource === 'all' || cardSource === source;
    card.classList.toggle('hidden', !isVisible);
  });
}

function inferSourceYear(source) {
  const rows = getRowsBySourceName(source);
  const counts = new Map();

  rows.forEach(row => {
    const directValue = getValueByAliases(row, [
      'vigencia',
      'ano',
      'año',
      'periodo',
      'fecha de registro',
      'fecha_registro',
      'fecha de creacion',
      'fecha_creacion',
      'fecha movimientos',
    ]);

    const year = tryExtractYear(directValue);
    if (!year) return;

    counts.set(year, (counts.get(year) || 0) + 1);
  });

  if (counts.size === 0) return null;

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])[0][0];
}

function refreshSourceYearCache() {
  state.sourceYearCache = {
    cdp: inferSourceYear('cdp'),
    crp: inferSourceYear('crp'),
    eje: inferSourceYear('eje'),
    seguimiento: inferSourceYear('seguimiento'),
  };
}

function extractYearValue(row, source) {
  const directValue = getValueByAliases(row, [
    'vigencia',
    'ano',
    'año',
    'periodo',
    'fecha de registro',
    'fecha_registro',
    'fecha de creacion',
    'fecha_creacion',
    'fecha movimientos',
  ]);

  const directYear = tryExtractYear(directValue);
  if (directYear) return directYear;

  const inferred = state.sourceYearCache[source] ?? inferSourceYear(source);
  return inferred || 'SIN VIGENCIA';
}

function getRowsBySource() {
  const ejeRows = getCanonicalEjeRows(state.dashboardData.eje || []);
  return [
    ...state.dashboardData.cdp.map(row => ({ row, source: 'cdp' })),
    ...state.dashboardData.crp.map(row => ({ row, source: 'crp' })),
    ...ejeRows.map(row => ({ row, source: 'eje' })),
    ...state.dashboardData.seguimiento.map(row => ({ row, source: 'seguimiento' })),
  ];
}

function setSelectOptions(selectElement, options, placeholder) {
  if (!selectElement) return;

  const previousValue = selectElement.value;
  selectElement.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = placeholder;
  selectElement.appendChild(defaultOption);

  options.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });

  if (previousValue && options.includes(previousValue)) {
    selectElement.value = previousValue;
  }
}

function populateAdvancedFilters() {
  const concepts = Array.from(
    new Set(getRowsBySource().map(item => getConceptName(item.row, item.source)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  const dependencies = Array.from(
    new Set(getRowsBySource().map(item => getDependencyName(item.row)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  const siifValues = Array.from(
    new Set(getRowsBySource().map(item => getSiifName(item.row)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  const centers = Array.from(
    new Set(getRowsBySource().map(item => getCenterName(item.row)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  const cdpCodes = Array.from(
    new Set(getRowsBySource().map(item => getCdpCodeName(item.row)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  const cdpRequests = Array.from(
    new Set(getRowsBySource().map(item => getCdpRequestName(item.row)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  setSelectOptions(elements.conceptFilterSelect, concepts, 'Todos los conceptos');
  setSelectOptions(elements.dependencyFilterSelect, dependencies, 'Todas las dependencias');
  setSelectOptions(elements.summarySiifFilterSelect, siifValues, 'Todos los SIIF');
  setSelectOptions(elements.summaryCenterFilterSelect, centers, 'Todos los Centros de Formación');
  setSelectOptions(elements.summaryCdpCodeFilterSelect, cdpCodes, 'Todos los códigos de CDP');
  setSelectOptions(elements.summaryCdpRequestFilterSelect, cdpRequests, 'Todas las solicitudes de CDP');
}

function updateFilterLabels() {
  if (elements.activeDashboardFilters) {
    const active = [];
    if (state.activeSource !== 'all') active.push(`Vista: ${state.activeSource.toUpperCase()}`);
    if (state.filters.concept) active.push(`Concepto: ${state.filters.concept}`);
    if (state.filters.dependency) active.push(`Dependencia: ${state.filters.dependency}`);
    if (elements.summarySiifFilterSelect?.value) active.push(`SIIF: ${elements.summarySiifFilterSelect.value}`);
    if (elements.summaryCenterFilterSelect?.value) active.push(`Centro: ${elements.summaryCenterFilterSelect.value}`);
    if (elements.summaryCdpCodeFilterSelect?.value) active.push(`Código CDP: ${elements.summaryCdpCodeFilterSelect.value}`);
    if (elements.summaryCdpRequestFilterSelect?.value) active.push(`Solicitud CDP: ${elements.summaryCdpRequestFilterSelect.value}`);
    if (elements.summarySearchInput?.value?.trim()) active.push(`Palabras clave: ${elements.summarySearchInput.value.trim()}`);

    elements.activeDashboardFilters.textContent = active.length > 0
      ? `Filtros activos -> ${active.join(' | ')}`
      : 'Sin filtros avanzados activos.';
  }
}

function getCrpDevengadoValue(row) {
  const amount = getValueByAliases(row, [
    'valor',
    'cantidad',
    'monto',
    'obligaciones',
    'ordenes de pago',
  ]);

  return extractNumericValue(amount);
}

function getAmountValue(row) {
  const amount = getValueByAliases(row, [
    'valor actual',
    'valor_actual',
    'valor',
    'monto',
    'cantidad',
    'apropiacion vigente dep.gsto',
  ]);

  return extractNumericValue(amount);
}

function getCdpInitialValue(row) {
  const amount = getValueByAliases(row, [
    'apropiacion disponible dep.gsto',
    'apropiacion disponible',
    'valor inicial',
    'valor_inicial',
  ]);

  return extractNumericValue(amount);
}

function getEjeExecutionValue(row) {
  // Prioriza Apropiación Vigente (columna amarilla en el Excel) para evitar dobles conteos.
  const amount = getValueByAliases(row, [
    'Valor Inicial',
    'Valor_Inicial',
    'valor inicial',
    'valor_inicial',
    'Valor_Actual',
    'valor_actual',
    'Apropiacion_Disponible',
    'apropiacion_disponible',
    'APROPIACION DISPONIBLE DEP.GSTO',
    'Total_Compromiso',
    'total_compromiso',
    'TOTAL COMPROMISO DEP.GSTOS',
    'Total_CDP',
    'total_cdp',
    'TOTAL CDP DEP.GSTOS',
  ]);
  
  const numericAmount = extractNumericValue(amount);
  if (numericAmount > 0) {
    return numericAmount;
  }
  
  // Fallback: intenta encontrar el primer valor numérico significativo en el row
  const keys = Object.keys(row);
  for (const key of keys) {
    if (key.toLowerCase().includes('disponible') || 
        key.toLowerCase().includes('valor_actual') ||
        key.toLowerCase().includes('valorinicial') ||
        key.toLowerCase().includes('valor inicial') ||
        key.toLowerCase().includes('valor_inicial') ||
        key.toLowerCase().includes('valor actual') ||
        key.toLowerCase().includes('compromiso') ||
        key.toLowerCase().includes('obligacion') ||
        key.toLowerCase().includes('pago')) {
      const val = extractNumericValue(row[key]);
      if (val > 0) return val;
    }
  }
  
  return 0;
}

function getCanonicalEjeRows(rows) {
  const grouped = new Map();

  rows.forEach((row, index) => {
    const dep = getEjeDependency(row);
    const rec = getEjeRec(row);
    const recurso = String(getValueByAliases(row, ['Recurso', 'REC.', 'Rec']) || '').trim();
    const valorBase = getEjeApropiacionVigente(row);
    const valorCdp = getEjeCdpValue(row);
    const concept = getEjeConcept(row);

    const key = [
      normalizeToken(dep),
      normalizeToken(rec),
      normalizeToken(recurso),
      valorBase.toFixed(2),
      valorCdp.toFixed(2),
    ].join('||');

    const score = concept.length;
    const previous = grouped.get(key);

    // Conserva una sola fila por centro/recurso/valor y prioriza el concepto más específico.
    if (!previous || score >= previous.score) {
      grouped.set(key, { row, score, index });
    }
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.index - b.index)
    .map((item) => item.row);
}

function detectEjeMetricSource(rows) {
  const candidates = [
    ['Valor_Inicial', 'valor_inicial', 'Valor Inicial', 'valor inicial'],
    ['Valor_Actual', 'valor_actual', 'Valor Actual', 'valor actual'],
    ['Apropiacion_Disponible', 'apropiacion_disponible', 'APROPIACION DISPONIBLE DEP.GSTO'],
    ['Total_Compromiso', 'total_compromiso', 'TOTAL COMPROMISO DEP.GSTOS'],
    ['Total_CDP', 'total_cdp', 'TOTAL CDP DEP.GSTOS'],
  ];

  const totals = candidates.map((aliases) => {
    let total = 0;
    rows.forEach((row) => {
      total += extractNumericValue(getValueByAliases(row, aliases));
    });
    return {
      label: aliases[0],
      total,
    };
  });

  const best = totals.sort((a, b) => b.total - a.total)[0] || { label: 'N/D', total: 0 };
  return best;
}

function getEjeDependency(row) {
  return String(getValueByAliases(row, ['Dependencia_Descripcion', 'Dependencia']) || 'SIN DEPENDENCIA').trim() || 'SIN DEPENDENCIA';
}

function getEjeRec(row) {
  return String(getValueByAliases(row, ['REC.', 'Rec', 'Recurso']) || 'SIN REC').trim() || 'SIN REC';
}

function getEjeRubro(row) {
  return String(getValueByAliases(row, ['Rubro', 'Objeto']) || 'SIN RUBRO').trim() || 'SIN RUBRO';
}

function getEjeConcept(row) {
  return String(getValueByAliases(row, ['Concepto', 'Descripcion', 'Objeto']) || 'SIN CONCEPTO').trim() || 'SIN CONCEPTO';
}

function getEjeSiif(row) {
  return String(getValueByAliases(row, [
    'siif',
    'siif nacion',
    'codigo siif',
    'cod siif',
  ]) || 'SIN SIIF').trim() || 'SIN SIIF';
}

function getEjeCenter(row) {
  return String(getValueByAliases(row, [
    'centro de formacion',
    'centro de formación',
    'centro formacion',
    'centro_formacion',
    'nombre centro',
    'centro',
  ]) || 'SIN CENTRO').trim() || 'SIN CENTRO';
}

function getEjeCdpCode(row) {
  return String(getValueByAliases(row, [
    'codigo del cdp',
    'codigo cdp',
    'cod cdp',
    'numero cdp',
    'nro cdp',
    'cdp',
  ]) || 'SIN CÓDIGO CDP').trim() || 'SIN CÓDIGO CDP';
}

function getEjeCdpRequest(row) {
  return String(getCdpRequestName(row) || 'SIN SOLICITUD CDP').trim() || 'SIN SOLICITUD CDP';
}

function getEjeApropiacionVigente(row) {
  return extractNumericValue(getValueByAliases(row, [
    'Valor_Inicial',
    'valor_inicial',
    'Apropiacion_Vigente',
    'APROPIACION VIGENTE DEP.GSTO',
  ]));
}

function getEjeCdpValue(row) {
  return extractNumericValue(getValueByAliases(row, [
    'Valor_Actual',
    'valor_actual',
    'Total_CDP',
    'TOTAL CDP DEP.GSTOS',
  ]));
}

function applyComplementaryEjeFilters(rows) {
  const dependencyToken = normalizeToken(state.ejeGroupFilters.dependency);
  const recToken = normalizeToken(state.ejeGroupFilters.rec);
  const rubroToken = normalizeToken(state.ejeGroupFilters.rubro);
  const conceptToken = normalizeToken(state.ejeGroupFilters.concept);
  const siifToken = normalizeToken(state.ejeGroupFilters.siif);
  const centerToken = normalizeToken(state.ejeGroupFilters.center);
  const cdpCodeToken = normalizeToken(state.ejeGroupFilters.cdpCode);
  const cdpRequestToken = normalizeToken(state.ejeGroupFilters.cdpRequest);
  const keywordTokens = String(state.ejeGroupFilters.keyword || '')
    .split(/[;,|\s]+/)
    .map((token) => normalizeToken(token))
    .filter(Boolean);

  return rows.filter((row) => {
    const dep = normalizeToken(getEjeDependency(row));
    const rec = normalizeToken(getEjeRec(row));
    const rubro = normalizeToken(getEjeRubro(row));
    const concept = normalizeToken(getEjeConcept(row));
    const siif = normalizeToken(getEjeSiif(row));
    const center = normalizeToken(getEjeCenter(row));
    const cdpCode = normalizeToken(getEjeCdpCode(row));
    const cdpRequest = normalizeToken(getEjeCdpRequest(row));
    const rowSearchText = normalizeToken([
      getEjeDependency(row),
      getEjeRec(row),
      getEjeRubro(row),
      getEjeConcept(row),
      getEjeSiif(row),
      getEjeCenter(row),
      getEjeCdpCode(row),
      getEjeCdpRequest(row),
      ...Object.values(row || {}).map(value => String(value || '')),
    ].join(' '));

    const byDependency = !dependencyToken || dep.includes(dependencyToken);
    const byRec = !recToken || rec.includes(recToken);
    const byRubro = !rubroToken || rubro.includes(rubroToken);
    const byConcept = !conceptToken || concept.includes(conceptToken);
    const bySiif = !siifToken || siif.includes(siifToken);
    const byCenter = !centerToken || center.includes(centerToken);
    const byCdpCode = !cdpCodeToken || cdpCode.includes(cdpCodeToken);
    const byCdpRequest = !cdpRequestToken || cdpRequest.includes(cdpRequestToken);
    const byKeywords = keywordTokens.length === 0 || keywordTokens.every((token) => rowSearchText.includes(token));

    return byDependency && byRec && byRubro && byConcept && bySiif && byCenter && byCdpCode && byCdpRequest && byKeywords;
  });
}

function updateEjeActiveFiltersChip() {
  if (!elements.ejeActiveFiltersChip) return;

  const activeCount = [
    state.ejeGroupFilters.dependency,
    state.ejeGroupFilters.rec,
    state.ejeGroupFilters.rubro,
    state.ejeGroupFilters.concept,
    state.ejeGroupFilters.siif,
    state.ejeGroupFilters.center,
    state.ejeGroupFilters.cdpCode,
    state.ejeGroupFilters.cdpRequest,
    state.ejeGroupFilters.keyword,
  ].filter((value) => String(value || '').trim() !== '').length;

  elements.ejeActiveFiltersChip.textContent = `Filtros activos: ${activeCount}`;
  elements.ejeActiveFiltersChip.classList.toggle('is-active', activeCount > 0);
}

function populateEjeGroupingFilters() {
  const ejeRows = getCanonicalEjeRows(state.dashboardData.eje || []);

  const dependencies = Array.from(new Set(ejeRows.map(getEjeDependency))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const recs = Array.from(new Set(ejeRows.map(getEjeRec))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const rubros = Array.from(new Set(ejeRows.map(getEjeRubro))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const concepts = Array.from(new Set(ejeRows.map(getEjeConcept))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const siifValues = Array.from(new Set(ejeRows.map(getEjeSiif))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const centers = Array.from(new Set(ejeRows.map(getEjeCenter))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const cdpCodes = Array.from(new Set(ejeRows.map(getEjeCdpCode))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const cdpRequests = Array.from(new Set(ejeRows.map(getEjeCdpRequest))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  setSelectOptions(elements.ejeDependencyFilterSelect, dependencies, 'Todas las dependencias');
  setSelectOptions(elements.ejeRecFilterSelect, recs, 'Todos los REC/Recurso');
  setSelectOptions(elements.ejeRubroFilterSelect, rubros, 'Todos los rubros');
  setSelectOptions(elements.ejeConceptFilterSelect, concepts, 'Todos los conceptos');
  setSelectOptions(elements.ejeSiifFilterSelect, siifValues, 'Todos los SIIF');
  setSelectOptions(elements.ejeCenterFilterSelect, centers, 'Todos los Centros de Formación');
  setSelectOptions(elements.ejeCdpCodeFilterSelect, cdpCodes, 'Todos los códigos de CDP');
  setSelectOptions(elements.ejeCdpRequestFilterSelect, cdpRequests, 'Todas las solicitudes de CDP');
}

function updateEjeGroupedTable() {
  if (!elements.ejeGroupedBody) return;

  updateEjeActiveFiltersChip();

  // Only include rows where is_bold_ap == 1
  const ejeRows = getCanonicalEjeRows(state.dashboardData.eje || []).filter(row => {
    // Accept both number and string representations
    return row.is_bold_ap === 1 || row.is_bold_ap === '1';
  });
  const filteredRows = applyComplementaryEjeFilters(ejeRows);
  const grouped = new Map();

  filteredRows.forEach((row) => {
    const dep = getEjeDependency(row);
    const rec = getEjeRec(row);
    const rubro = getEjeRubro(row);
    const concept = getEjeConcept(row);
    const cdpRequest = getEjeCdpRequest(row);
    const key = `${dep}||${rec}||${rubro}||${concept}||${cdpRequest}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        dep,
        rec,
        rubro,
        concept,
        cdpRequest,
        apropiacionVigente: 0,
        cdp: 0,
      });
    }

    const entry = grouped.get(key);
    entry.apropiacionVigente += getEjeApropiacionVigente(row);
    entry.cdp += getEjeCdpValue(row);
  });

  const rows = Array.from(grouped.values()).sort((a, b) => b.apropiacionVigente - a.apropiacionVigente);

  if (!rows.length) {
    elements.ejeGroupedBody.innerHTML = '<tr><td colspan="7" class="table-placeholder">No hay datos EJE para los filtros seleccionados.</td></tr>';
    if (elements.ejeGroupedSummaryInfo) {
      elements.ejeGroupedSummaryInfo.textContent = 'Sin resultados con los filtros actuales.';
    }
    return;
  }

  const totalApropiacion = rows.reduce((sum, row) => sum + row.apropiacionVigente, 0);
  const totalCdp = rows.reduce((sum, row) => sum + row.cdp, 0);

  if (elements.ejeGroupedSummaryInfo) {
    elements.ejeGroupedSummaryInfo.textContent = `Grupos: ${formatNumber(rows.length)} | Apropiación Vigente: ${formatCurrency(totalApropiacion)} | CDP: ${formatCurrency(totalCdp)}`;
  }

  elements.ejeGroupedBody.innerHTML = rows.map((row) => `
    <tr>
      <td><strong>${row.dep}</strong></td>
      <td>${row.rec}</td>
      <td>${row.rubro}</td>
      <td>${row.concept}</td>
      <td>${formatCurrency(row.apropiacionVigente)}</td>
      <td>${formatCurrency(row.cdp)}</td>
      <td>${row.cdpRequest}</td>
    </tr>
  `).join('');
}

function buildDependencyTrendSeries(dashboardData) {
  const source = dashboardData || state.dashboardData;
  const allRows = [
    ...source.cdp,
    ...source.crp,
    ...source.eje,
    ...source.seguimiento,
  ];

  const totalsByDependency = new Map();

  allRows.forEach(row => {
    const dependency = getDependencyName(row);
    const amount = getAmountValue(row);

    totalsByDependency.set(
      dependency,
      (totalsByDependency.get(dependency) || 0) + amount
    );
  });

  const sorted = Array.from(totalsByDependency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  if (sorted.length === 0) {
    return {
      labels: ['Sin datos'],
      valuesInMillions: [0],
    };
  }

  return {
    labels: sorted.map(([dependency]) => dependency),
    valuesInMillions: sorted.map(([, total]) => total / 1000000),
  };
}

function updateMetrics() {
  const activeData = getActiveDashboardData();
  // Only include rows where is_bold_ap == 1
  const canonicalEjeRows = getCanonicalEjeRows(activeData.eje || []).filter(row => {
    return row.is_bold_ap === 1 || row.is_bold_ap === '1';
  });
  const conceptFilter = normalizeToken(state.filters.concept);
  const dependencyFilter = normalizeToken(state.filters.dependency);
  
  const cdpCount = activeData.cdp.length;
  const crpCount = activeData.crp.length;
  let ejeCount = canonicalEjeRows.length;

  let devengadoTotal = 0;
  let baseTotal = 0;
  let ejeTotal = 0;

  activeData.crp.forEach(row => {
    devengadoTotal += getCrpDevengadoValue(row);
  });

  activeData.cdp.forEach(row => {
    baseTotal += getCdpInitialValue(row);
  });

  // Apply filters to EJE data
  canonicalEjeRows.forEach(row => {
    const concept = getConceptName(row, 'eje');
    const dependency = getDependencyName(row);

    const matchesConcept = !conceptFilter || normalizeToken(concept).includes(conceptFilter);
    const matchesDependency = !dependencyFilter || normalizeToken(dependency).includes(dependencyFilter);

    if (matchesConcept && matchesDependency) {
      const ejeVal = getEjeExecutionValue(row);
      ejeTotal += ejeVal;
    }
  });

  // Update count if filters are applied
  if (conceptFilter || dependencyFilter) {
    ejeCount = canonicalEjeRows.filter(row => {
      const concept = getConceptName(row, 'eje');
      const dependency = getDependencyName(row);

      const matchesConcept = !conceptFilter || normalizeToken(concept).includes(conceptFilter);
      const matchesDependency = !dependencyFilter || normalizeToken(dependency).includes(dependencyFilter);

      return matchesConcept && matchesDependency;
    }).length;
  }

  elements.metricCDP.textContent = formatNumber(cdpCount);
  elements.metricCRP.textContent = formatNumber(crpCount);
  elements.metricEJE.textContent = formatCurrency(ejeTotal);
  elements.metricDevengado.textContent = formatCurrency(devengadoTotal);
  elements.metricBase.textContent = formatCurrency(baseTotal);
}

function updateExecutiveSummary() {
  if (!elements.executiveSummaryBody) return;

  // Only include rows where is_bold_ap == 1
  const canonicalEjeRows = getCanonicalEjeRows(state.dashboardData.eje || []).filter(row => {
    return row.is_bold_ap === 1 || row.is_bold_ap === '1';
  });

  const totals = {
    cdp: state.dashboardData.cdp.reduce((sum, row) => sum + getCdpInitialValue(row), 0),
    crp: state.dashboardData.crp.reduce((sum, row) => sum + getCrpDevengadoValue(row), 0),
    eje: canonicalEjeRows.reduce((sum, row) => sum + getEjeExecutionValue(row), 0),
  };

  const counts = {
    cdp: state.dashboardData.cdp.length,
    crp: state.dashboardData.crp.length,
    eje: canonicalEjeRows.length,
  };

  const grandTotal = totals.cdp + totals.crp + totals.eje;

  const rows = [
    { fuente: 'CDP', key: 'cdp', vigencia: state.sourceYearCache.cdp || 'N/A' },
    { fuente: 'CRP', key: 'crp', vigencia: state.sourceYearCache.crp || 'N/A' },
    { fuente: 'EJE', key: 'eje', vigencia: state.sourceYearCache.eje || 'N/A' },
  ].map(item => {
    const total = totals[item.key];
    const participacion = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(2) : '0.00';

    return `
      <tr>
        <td><strong>${item.fuente}</strong></td>
        <td>${counts[item.key]}</td>
        <td>${formatCurrency(total)}</td>
        <td>${participacion}%</td>
        <td>${item.vigencia}</td>
      </tr>
    `;
  }).join('');

  elements.executiveSummaryBody.innerHTML = rows;
}

function findColumnCaseInsensitive(row, possibleNames) {
  const keys = Object.keys(row);
  for (const possible of possibleNames) {
    const found = keys.find(k => k.toLowerCase().includes(possible.toLowerCase()));
    if (found) return found;
  }
  return keys[0];
}

function updateCharts() {
  const chartType = elements.chartTypeSelect.value || 'pie';
  const activeData = getActiveDashboardData();

  const labels = ['Apropiación', 'Ejecución', 'Asignación'];
  const values = [
    activeData.cdp.length,
    activeData.crp.length,
    activeData.eje.length,
  ];

  const ctxDistribution = document.getElementById('distributionChart');
  if (ctxDistribution && ctxDistribution.getContext) {
    if (state.charts.distribution) {
      state.charts.distribution.destroy();
    }

    state.charts.distribution = new Chart(ctxDistribution, {
      type: chartType,
      data: {
        labels,
        datasets: [{
          label: 'Registros',
          data: values,
          backgroundColor: [
            'rgba(0, 107, 79, 0.7)',
            'rgba(0, 61, 46, 0.7)',
            'rgba(107, 175, 143, 0.7)',
          ],
          borderColor: [
            'rgba(0, 107, 79, 1)',
            'rgba(0, 61, 46, 1)',
            'rgba(107, 175, 143, 1)',
          ],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--ink'),
              font: { size: 12, weight: '600' },
            },
          },
        },
      },
    });
  }

  const ctxTrend = document.getElementById('trendChart');
  if (ctxTrend && ctxTrend.getContext) {
    if (state.charts.trend) {
      state.charts.trend.destroy();
    }

    const trendSeries = buildDependencyTrendSeries(activeData);

    state.charts.trend = new Chart(ctxTrend, {
      type: 'line',
      data: {
        labels: trendSeries.labels,
        datasets: [{
          label: 'Valor en millones (COP)',
          data: trendSeries.valuesInMillions,
          borderColor: 'rgba(0, 107, 79, 1)',
          backgroundColor: 'rgba(0, 107, 79, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 6,
          pointBackgroundColor: 'rgba(0, 107, 79, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--ink'),
              font: { size: 12, weight: '600' },
            },
          },
          tooltip: {
            callbacks: {
              label(context) {
                const value = Number(context.raw || 0);
                return ` ${formatNumber(value)} M`;
              },
            },
          },
        },
        scales: {
          y: {
            ticks: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--muted'),
              callback(value) {
                return `${formatNumber(value)} M`;
              },
            },
            grid: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--line'),
            },
            title: {
              display: true,
              text: 'Millones COP',
              color: getComputedStyle(document.documentElement).getPropertyValue('--muted'),
            },
          },
          x: {
            ticks: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--muted'),
              maxRotation: 45,
              minRotation: 30,
            },
            grid: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--line'),
            },
            title: {
              display: true,
              text: 'Dependencia de Afectación del Gasto',
              color: getComputedStyle(document.documentElement).getPropertyValue('--muted'),
            },
          },
        },
      },
    });
  }
}

function updateSummaryTable() {
  const searchTokens = String(elements.summarySearchInput.value || '')
    .split(/[;,|\s]+/)
    .map(token => normalizeToken(token))
    .filter(Boolean);
  const filter = elements.summaryFilterSelect.value;
  const sourceScope = state.activeSource === 'all' ? '' : state.activeSource;
  const conceptFilter = normalizeToken(state.filters.concept);
  const dependencyFilter = normalizeToken(state.filters.dependency);
  const siifFilter = normalizeToken(elements.summarySiifFilterSelect?.value || '');
  const centerFilter = normalizeToken(elements.summaryCenterFilterSelect?.value || '');
  const cdpCodeFilter = normalizeToken(elements.summaryCdpCodeFilterSelect?.value || '');
  const cdpRequestFilter = normalizeToken(elements.summaryCdpRequestFilterSelect?.value || '');

  let allRows = getRowsBySource()
    .filter(item => sourceScope === '' || item.source === sourceScope)
    .filter(item => filter === '' || item.source === filter)
    .map(item => {
      const concepto = getConceptName(item.row, item.source);
      const vigencia = extractYearValue(item.row, item.source);
      const dependencia = getDependencyName(item.row);
      const siif = getSiifName(item.row);
      const center = getCenterName(item.row);
      const cdpCode = getCdpCodeName(item.row);
      const cdpRequest = getCdpRequestName(item.row);
      const rec = getRecBySource(item.row, item.source);
      const rubro = getRubroBySource(item.row, item.source);
      const valor = getAmountBySource(item.row, item.source);

      return {
        fuente: item.source.toUpperCase(),
        concepto,
        vigencia,
        dependencia,
        siif,
        center,
        cdpCode,
        cdpRequest,
        rec,
        rubro,
        valor,
      };
    })
    .filter(row => {
      const byConcept = !conceptFilter || normalizeToken(row.concepto).includes(conceptFilter);
      const byDependency = !dependencyFilter || normalizeToken(row.dependencia).includes(dependencyFilter);
      const bySiif = !siifFilter || normalizeToken(row.siif).includes(siifFilter);
      const byCenter = !centerFilter || normalizeToken(row.center).includes(centerFilter);
      const byCdpCode = !cdpCodeFilter || normalizeToken(row.cdpCode).includes(cdpCodeFilter);
      const byCdpRequest = !cdpRequestFilter || normalizeToken(row.cdpRequest).includes(cdpRequestFilter);

      const rowSearchText = normalizeToken([
        row.fuente,
        row.concepto,
        row.vigencia,
        row.dependencia,
        row.siif,
        row.center,
        row.cdpCode,
        row.cdpRequest,
      ].join(' '));
      const byKeywords = searchTokens.length === 0 || searchTokens.every(token => rowSearchText.includes(token));

      return byConcept && byDependency && bySiif && byCenter && byCdpCode && byCdpRequest && byKeywords;
    });

  const sortKey = state.summarySort.key;
  const sortDirection = state.summarySort.direction;
  allRows = allRows.sort((a, b) => compareSummaryRows(a, b, sortKey, sortDirection));

  updateFilterLabels();

  if (allRows.length === 0) {
    const emptyCols = getSummaryColumnsForView(getSummaryViewFromFilters()).length;
    elements.summaryBody.innerHTML = `<tr><td colspan="${emptyCols}" class="table-placeholder">No hay datos que mostrar</td></tr>`;
    return;
  }

  const columns = getSummaryColumnsForView(getSummaryViewFromFilters());
  const summaryHead = document.getElementById('summaryHead');
  if (summaryHead) {
    summaryHead.innerHTML = `<tr>${columns.map((col) => {
      const isActiveSort = state.summarySort.key === col.key;
      const arrow = isActiveSort ? (state.summarySort.direction === 'asc' ? ' ▲' : ' ▼') : '';
      return `<th data-summary-sort-key="${col.key}" class="summary-sortable-head">${col.title}${arrow}</th>`;
    }).join('')}</tr>`;
  }

  elements.summaryBody.innerHTML = allRows.map(row => {
    const cells = columns.map((col) => {
      const raw = row[col.key];
      const value = col.isCurrency ? formatCurrency(Number(raw || 0)) : (raw ?? 'N/A');
      if (col.key === 'concepto') {
        return `<td><strong>${value}</strong></td>`;
      }
      if (col.key === 'fuente') {
        return `<td><strong>${value}</strong></td>`;
      }
      return `<td>${value}</td>`;
    }).join('');

    return `
      <tr>
        ${cells}
      </tr>
    `;
  }).join('');

  updateSummaryViewTabs();
}

function classifyQuarterAlert(percent) {
  if (percent <= 30) {
    return {
      className: 'quarter-critical',
      badge: 'Crítico',
      helper: 'Hasta 30%',
      icon: '⛔',
    };
  }
  if (percent <= 60) {
    return {
      className: 'quarter-warning',
      badge: 'Medio',
      helper: '31% a 60%',
      icon: '⚠️',
    };
  }
  if (percent <= 100) {
    return {
      className: 'quarter-success',
      badge: 'Óptimo',
      helper: '61% a 100%',
      icon: '✅',
    };
  }
  return {
    className: 'quarter-over',
    badge: 'Sobre 100%',
    helper: 'Ejecución superior al plan',
    icon: '🚀',
  };
}

function updateQuarterPanelTone(rows) {
  if (!elements.quarterAlertsPanel) return;

  const panel = elements.quarterAlertsPanel;
  panel.classList.remove('panel-state-critical', 'panel-state-warning', 'panel-state-success', 'panel-state-over', 'panel-state-neutral');

  const setOverallText = (text) => {
    if (elements.quarterOverallStatus) {
      elements.quarterOverallStatus.textContent = text;
    }
  };

  if (!rows || rows.length === 0) {
    panel.classList.add('panel-state-neutral');
    setOverallText('Estado general: Sin datos');
    return;
  }

  const hasCritical = rows.some((item) => item.alert.className === 'quarter-critical');
  const hasWarning = rows.some((item) => item.alert.className === 'quarter-warning');
  const hasOver = rows.some((item) => item.alert.className === 'quarter-over');

  if (hasCritical) {
    panel.classList.add('panel-state-critical');
    setOverallText('⛔ Estado general: Crítico');
    return;
  }

  if (hasWarning) {
    panel.classList.add('panel-state-warning');
    setOverallText('⚠️ Estado general: Medio');
    return;
  }

  if (hasOver) {
    panel.classList.add('panel-state-over');
    setOverallText('🚀 Estado general: Sobre 100%');
    return;
  }

  panel.classList.add('panel-state-success');
  setOverallText('✅ Estado general: Óptimo');
}

function updateQuarterAlerts() {
  if (!elements.quarterAlertsGrid || !elements.quarterAlertsInfo) return;

  const sourceScope = state.activeSource === 'all' ? '' : state.activeSource;
  const filter = elements.summaryFilterSelect?.value || '';
  const conceptFilter = normalizeToken(state.filters.concept);
  const dependencyFilter = normalizeToken(state.filters.dependency);

  const quarterData = {
    1: { base: 0, ejecutado: 0, registros: 0 },
    2: { base: 0, ejecutado: 0, registros: 0 },
    3: { base: 0, ejecutado: 0, registros: 0 },
    4: { base: 0, ejecutado: 0, registros: 0 },
  };

  getRowsBySource()
    .filter(item => sourceScope === '' || item.source === sourceScope)
    .filter(item => filter === '' || item.source === filter)
    .filter(item => {
      const concept = getConceptName(item.row, item.source);
      const dependency = getDependencyName(item.row);

      const matchesConcept = !conceptFilter || normalizeToken(concept).includes(conceptFilter);
      const matchesDependency = !dependencyFilter || normalizeToken(dependency).includes(dependencyFilter);

      return matchesConcept && matchesDependency;
    })
    .forEach(item => {
      const quarter = extractQuarterFromRow(item.row);
      if (!quarter || !quarterData[quarter]) return;

      const amount = getAmountValue(item.row);
      const entry = quarterData[quarter];
      entry.registros += 1;

      if (item.source === 'cdp') {
        entry.base += amount;
      } else if (item.source === 'crp') {
        entry.ejecutado += amount;
      }
    });

  const rows = [1, 2, 3, 4].map((quarter) => {
    const entry = quarterData[quarter];
    const percent = entry.base > 0 ? (entry.ejecutado / entry.base) * 100 : 0;
    const alert = classifyQuarterAlert(percent);

    return {
      quarter,
      percent,
      base: entry.base,
      ejecutado: entry.ejecutado,
      registros: entry.registros,
      alert,
    };
  });

  const hasData = rows.some((item) => item.registros > 0);
  if (!hasData) {
    updateQuarterPanelTone([]);
    elements.quarterAlertsInfo.textContent = 'No se identificaron fechas o trimestres para calcular alertas.';
    elements.quarterAlertsGrid.innerHTML = '<div class="quarter-alert-card quarter-neutral">Sin datos trimestrales disponibles.</div>';
    return;
  }

  const warnings = rows.filter((item) => item.alert.className === 'quarter-critical' || item.alert.className === 'quarter-warning').length;
  updateQuarterPanelTone(rows);
  elements.quarterAlertsInfo.textContent = `Semáforo trimestral calculado con filtros activos. Trimestres en alerta: ${warnings}.`;

  elements.quarterAlertsGrid.innerHTML = rows.map((item, index) => `
    <article class="quarter-alert-card ${item.alert.className}" style="animation-delay: ${index * 70}ms;">
      <div class="quarter-alert-head">
        <span class="quarter-title">Trimestre ${item.quarter}</span>
        <span class="quarter-lights" aria-hidden="true">
          <span class="light light-red ${item.alert.className === 'quarter-critical' ? 'active' : ''}"></span>
          <span class="light light-amber ${item.alert.className === 'quarter-warning' ? 'active' : ''}"></span>
          <span class="light light-green ${item.alert.className === 'quarter-success' || item.alert.className === 'quarter-over' ? 'active' : ''}"></span>
        </span>
        <span class="quarter-status-badge">${item.alert.badge}</span>
      </div>
      <div class="quarter-alert-value">${item.percent.toFixed(2)}%</div>
      <div class="quarter-alert-icon" aria-hidden="true">${item.alert.icon}</div>
      <div class="quarter-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(item.percent, 100).toFixed(2)}" aria-label="Avance del trimestre ${item.quarter}">
        <div class="quarter-progress-fill" style="width: ${Math.min(item.percent, 100)}%;"></div>
      </div>
      <div class="quarter-alert-meta">
        <div>${item.alert.helper}</div>
        <div>Base: ${formatCurrency(item.base)}</div>
        <div>Ejecutado: ${formatCurrency(item.ejecutado)}</div>
      </div>
    </article>
  `).join('');
}

function updateDataSourceInfo() {
  const activeData = getActiveDashboardData();
  const canonicalEjeRows = getCanonicalEjeRows(state.dashboardData.eje || []);
  const currentView = state.activeSource === 'all' ? 'TODOS' : state.activeSource.toUpperCase();
  const ejeMetricSource = detectEjeMetricSource(canonicalEjeRows);
  const info = `
    📊 Base de Datos: presupuesto
    🧩 Fuente EJE: ${state.ejeSourceTable}
    🧮 Columna EJE usada: ${ejeMetricSource.label}
    💰 Suma control EJE: ${formatCurrency(ejeMetricSource.total)}
    🔎 Vista activa: ${currentView}
    📁 Tablas cargadas: ${Object.keys(state.dashboardData).length}
    📝 Registros en vista: ${Object.values(activeData).reduce((sum, arr) => sum + arr.length, 0)}
    🧾 Registros totales: ${Object.values(state.dashboardData).reduce((sum, arr) => sum + arr.length, 0)}
    ✅ Última actualización: ${new Date().toLocaleString('es-CO')}
  `;
  elements.dataSourceInfo.textContent = info;
}

function initializeAccordions() {
  // Get all accordion headers
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  
  accordionHeaders.forEach(header => {
    const toggleBtn = header.querySelector('.accordion-toggle');
    const accordionId = header.dataset.accordion;
    const contentElement = document.querySelector(`[data-accordion-content="${accordionId}"]`);
    
    if (toggleBtn && contentElement) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle the collapsed state
        header.classList.toggle('collapsed');
        contentElement.classList.toggle('hidden');
      });
    }
  });
}

function bindEvents() {
  elements.chartTypeSelect.addEventListener('change', updateCharts);
  elements.refreshDashboardBtn.addEventListener('click', () => {
    elements.refreshDashboardBtn.textContent = 'Actualizando...';
    elements.refreshDashboardBtn.disabled = true;

    loadDashboardData().then(() => {
      elements.refreshDashboardBtn.textContent = 'Actualizar';
      elements.refreshDashboardBtn.disabled = false;
    });
  });

  elements.summarySearchInput.addEventListener('input', updateSummaryTable);
  elements.summaryFilterSelect.addEventListener('change', () => {
    updateSummaryViewTabs();
    updateSummaryTable();
    updateQuarterAlerts();
  });
  elements.summaryViewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.summaryView || 'all';
      elements.summaryFilterSelect.value = view === 'all' ? '' : view;
      elements.summaryFilterSelect.dispatchEvent(new Event('change'));
    });
  });
  document.getElementById('summaryHead')?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const header = target.closest('[data-summary-sort-key]');
    if (!(header instanceof HTMLElement)) return;

    const key = header.dataset.summarySortKey;
    toggleSummarySort(key);
    updateSummaryTable();
  });
  elements.sourceToggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      const source = button.dataset.sourceToggle || 'all';
      setActiveSource(source);
    });
  });
  elements.conceptFilterSelect.addEventListener('change', () => {
    state.filters.concept = elements.conceptFilterSelect.value;
    updateFilterLabels();
    updateMetrics();
    updateSummaryTable();
    updateQuarterAlerts();
  });
  elements.dependencyFilterSelect.addEventListener('change', () => {
    state.filters.dependency = elements.dependencyFilterSelect.value;
    updateFilterLabels();
    updateMetrics();
    updateSummaryTable();
    updateQuarterAlerts();
  });
  elements.summarySiifFilterSelect?.addEventListener('change', () => {
    updateSummaryTable();
  });
  elements.summaryCenterFilterSelect?.addEventListener('change', () => {
    updateSummaryTable();
  });
  elements.summaryCdpCodeFilterSelect?.addEventListener('change', () => {
    updateSummaryTable();
  });
  elements.summaryCdpRequestFilterSelect?.addEventListener('change', () => {
    updateSummaryTable();
  });

  elements.ejeDependencyFilterSelect?.addEventListener('change', () => {
    state.ejeGroupFilters.dependency = elements.ejeDependencyFilterSelect.value;
    updateEjeGroupedTable();
  });
  elements.ejeRecFilterSelect?.addEventListener('change', () => {
    state.ejeGroupFilters.rec = elements.ejeRecFilterSelect.value;
    updateEjeGroupedTable();
  });
  elements.ejeRubroFilterSelect?.addEventListener('change', () => {
    state.ejeGroupFilters.rubro = elements.ejeRubroFilterSelect.value;
    updateEjeGroupedTable();
  });
  elements.ejeConceptFilterSelect?.addEventListener('change', () => {
    state.ejeGroupFilters.concept = elements.ejeConceptFilterSelect.value;
    updateEjeGroupedTable();
  });
  elements.ejeSiifFilterSelect?.addEventListener('change', () => {
    state.ejeGroupFilters.siif = elements.ejeSiifFilterSelect.value;
    updateEjeGroupedTable();
  });
  elements.ejeCenterFilterSelect?.addEventListener('change', () => {
    state.ejeGroupFilters.center = elements.ejeCenterFilterSelect.value;
    updateEjeGroupedTable();
  });
  elements.ejeCdpCodeFilterSelect?.addEventListener('change', () => {
    state.ejeGroupFilters.cdpCode = elements.ejeCdpCodeFilterSelect.value;
    updateEjeGroupedTable();
  });
  elements.ejeCdpRequestFilterSelect?.addEventListener('change', () => {
    state.ejeGroupFilters.cdpRequest = elements.ejeCdpRequestFilterSelect.value;
    updateEjeGroupedTable();
  });
  elements.ejeKeywordFilterInput?.addEventListener('input', () => {
    state.ejeGroupFilters.keyword = elements.ejeKeywordFilterInput.value;
    updateEjeGroupedTable();
  });
  elements.ejeClearFiltersBtn?.addEventListener('click', () => {
    state.ejeGroupFilters = {
      dependency: '',
      rec: '',
      rubro: '',
      concept: '',
      siif: '',
      center: '',
      cdpCode: '',
      cdpRequest: '',
      keyword: '',
    };

    if (elements.ejeDependencyFilterSelect) elements.ejeDependencyFilterSelect.value = '';
    if (elements.ejeRecFilterSelect) elements.ejeRecFilterSelect.value = '';
    if (elements.ejeRubroFilterSelect) elements.ejeRubroFilterSelect.value = '';
    if (elements.ejeConceptFilterSelect) elements.ejeConceptFilterSelect.value = '';
    if (elements.ejeSiifFilterSelect) elements.ejeSiifFilterSelect.value = '';
    if (elements.ejeCenterFilterSelect) elements.ejeCenterFilterSelect.value = '';
    if (elements.ejeCdpCodeFilterSelect) elements.ejeCdpCodeFilterSelect.value = '';
    if (elements.ejeCdpRequestFilterSelect) elements.ejeCdpRequestFilterSelect.value = '';
    if (elements.ejeKeywordFilterInput) elements.ejeKeywordFilterInput.value = '';

    updateEjeGroupedTable();
  });

  // Initialize accordions
  initializeAccordions();

  const toggleBtn = document.getElementById('toggleDarkMode');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }
}

function initializeDarkMode() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme !== 'auto' ? savedTheme : (prefersDark ? 'dark' : 'light');
  setTheme(theme);
}

function setTheme(theme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    updateToggleButton('☀️');
  } else {
    html.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    updateToggleButton('🌙');
  }

  if (Object.keys(state.charts).length > 0) {
    updateCharts();
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const isDarkMode = html.getAttribute('data-theme') === 'dark';
  setTheme(isDarkMode ? 'light' : 'dark');
}

function updateToggleButton(emoji) {
  const btn = document.getElementById('toggleDarkMode');
  if (btn) {
    btn.textContent = emoji;
  }
}

async function loadDashboardData() {
  try {
    const tablesData = await request('/api/tables');
    const availableTables = new Set((tablesData.tables || []).map((table) => String(table).toLowerCase()));
    const hasEjeTable = availableTables.has('eje');
    const hasSeguimientoTable = availableTables.has('seguimiento_presupuestal');

    const [cdpData, crpData, ejeRawData, seguimientoRawData] = await Promise.all([
      loadTableData('cdp'),
      loadTableData('crp'),
      hasEjeTable ? loadTableData('eje') : Promise.resolve([]),
      hasSeguimientoTable ? loadTableData('seguimiento_presupuestal') : Promise.resolve([]),
    ]);

    const useSeguimientoAsEje = (!hasEjeTable || ejeRawData.length === 0) && seguimientoRawData.length > 0;
    const ejeData = useSeguimientoAsEje ? seguimientoRawData : ejeRawData;
    const seguimientoData = useSeguimientoAsEje ? [] : seguimientoRawData;

    state.ejeSourceTable = useSeguimientoAsEje ? 'seguimiento_presupuestal (fallback)' : 'eje';

    state.dashboardData = {
      cdp: cdpData,
      crp: crpData,
      eje: ejeData,
      seguimiento: seguimientoData,
    };

    refreshSourceYearCache();

    populateAdvancedFilters();
    populateEjeGroupingFilters();

    state.filters.concept = elements.conceptFilterSelect.value;
    state.filters.dependency = elements.dependencyFilterSelect.value;
    state.ejeGroupFilters.dependency = elements.ejeDependencyFilterSelect?.value || '';
    state.ejeGroupFilters.rec = elements.ejeRecFilterSelect?.value || '';
    state.ejeGroupFilters.rubro = elements.ejeRubroFilterSelect?.value || '';
    state.ejeGroupFilters.concept = elements.ejeConceptFilterSelect?.value || '';
    state.ejeGroupFilters.siif = elements.ejeSiifFilterSelect?.value || '';
    state.ejeGroupFilters.center = elements.ejeCenterFilterSelect?.value || '';
    state.ejeGroupFilters.cdpCode = elements.ejeCdpCodeFilterSelect?.value || '';
    state.ejeGroupFilters.cdpRequest = elements.ejeCdpRequestFilterSelect?.value || '';
    state.ejeGroupFilters.keyword = elements.ejeKeywordFilterInput?.value || '';
    updateFilterLabels();

    updateMetrics();
    updateCharts();
    updateSummaryTable();
    updateQuarterAlerts();
    updateEjeGroupedTable();
    updateExecutiveSummary();
    updateDataSourceInfo();
  } catch (error) {
    console.error('Error cargando dashboard:', error);
    elements.dataSourceInfo.textContent = 'Error cargando datos del servidor';
  }
}

async function init() {
  initializeDarkMode();
  setActiveSource('all');
  updateFilterLabels();
  updateSummaryViewTabs();
  bindEvents();
  await loadDashboardData();
  initializeNavigation();
}

// Inicializar navegación - Cierra catálogo cuando se navega
function initializeNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // No cerrar al hacer clic en el propio botón del catálogo.
      if (btn.id === 'catalogNavBtn') {
        return;
      }

      // Si el catálogo está abierto, cerrarlo al navegar a otra vista.
      if (window.catalogManager && window.catalogManager.isOpen) {
        window.catalogManager.close();
      }
    });
  });
}

init();
