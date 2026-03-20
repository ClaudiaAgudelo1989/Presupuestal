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
  ejeGroupFilters: {
    dependency: '',
    rec: '',
    rubro: '',
    concept: '',
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
  ejeDependencyFilterSelect: document.getElementById('ejeDependencyFilterSelect'),
  ejeRecFilterSelect: document.getElementById('ejeRecFilterSelect'),
  ejeRubroFilterSelect: document.getElementById('ejeRubroFilterSelect'),
  ejeConceptFilterSelect: document.getElementById('ejeConceptFilterSelect'),
  ejeGroupedBody: document.getElementById('ejeGroupedBody'),
  ejeGroupedSummaryInfo: document.getElementById('ejeGroupedSummaryInfo'),
  sourceToggleButtons: Array.from(document.querySelectorAll('[data-source-toggle]')),
  metricCards: Array.from(document.querySelectorAll('[data-metric-source]')),
  activeDashboardFilters: document.getElementById('activeDashboardFilters'),
  summaryBody: document.getElementById('summaryBody'),
  executiveSummaryBody: document.getElementById('executiveSummaryBody'),
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
            console.error(`Error cargando pagina ${pageNumber} de ${tableName}:`, result.reason);
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

  setSelectOptions(elements.conceptFilterSelect, concepts, 'Todos los conceptos');
  setSelectOptions(elements.dependencyFilterSelect, dependencies, 'Todas las dependencias');
}

function updateFilterLabels() {
  if (elements.activeDashboardFilters) {
    const active = [];
    if (state.activeSource !== 'all') active.push(`Vista: ${state.activeSource.toUpperCase()}`);
    if (state.filters.concept) active.push(`Concepto: ${state.filters.concept}`);
    if (state.filters.dependency) active.push(`Dependencia: ${state.filters.dependency}`);

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

    // Conserva una sola fila por centro/recurso/valor y prioriza el concepto mas especifico.
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

  return rows.filter((row) => {
    const dep = normalizeToken(getEjeDependency(row));
    const rec = normalizeToken(getEjeRec(row));
    const rubro = normalizeToken(getEjeRubro(row));
    const concept = normalizeToken(getEjeConcept(row));

    const byDependency = !dependencyToken || dep.includes(dependencyToken);
    const byRec = !recToken || rec.includes(recToken);
    const byRubro = !rubroToken || rubro.includes(rubroToken);
    const byConcept = !conceptToken || concept.includes(conceptToken);

    return byDependency && byRec && byRubro && byConcept;
  });
}

function populateEjeGroupingFilters() {
  const ejeRows = getCanonicalEjeRows(state.dashboardData.eje || []);

  const dependencies = Array.from(new Set(ejeRows.map(getEjeDependency))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const recs = Array.from(new Set(ejeRows.map(getEjeRec))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const rubros = Array.from(new Set(ejeRows.map(getEjeRubro))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  const concepts = Array.from(new Set(ejeRows.map(getEjeConcept))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  setSelectOptions(elements.ejeDependencyFilterSelect, dependencies, 'Todas las dependencias');
  setSelectOptions(elements.ejeRecFilterSelect, recs, 'Todos los REC/Recurso');
  setSelectOptions(elements.ejeRubroFilterSelect, rubros, 'Todos los rubros');
  setSelectOptions(elements.ejeConceptFilterSelect, concepts, 'Todos los conceptos');
}

function updateEjeGroupedTable() {
  if (!elements.ejeGroupedBody) return;

  const ejeRows = getCanonicalEjeRows(state.dashboardData.eje || []);
  const filteredRows = applyComplementaryEjeFilters(ejeRows);
  const grouped = new Map();

  filteredRows.forEach((row) => {
    const dep = getEjeDependency(row);
    const rec = getEjeRec(row);
    const rubro = getEjeRubro(row);
    const concept = getEjeConcept(row);
    const key = `${dep}||${rec}||${rubro}||${concept}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        dep,
        rec,
        rubro,
        concept,
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
    elements.ejeGroupedBody.innerHTML = '<tr><td colspan="6" class="table-placeholder">No hay datos EJE para los filtros seleccionados.</td></tr>';
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
  const canonicalEjeRows = getCanonicalEjeRows(activeData.eje || []);
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

  const canonicalEjeRows = getCanonicalEjeRows(state.dashboardData.eje || []);

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

  const labels = ['Apropiacion', 'Ejecucion', 'Asignacion'];
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
              text: 'Dependencia de Afectacion del Gasto',
              color: getComputedStyle(document.documentElement).getPropertyValue('--muted'),
            },
          },
        },
      },
    });
  }
}

function updateSummaryTable() {
  const search = elements.summarySearchInput.value.toLowerCase();
  const filter = elements.summaryFilterSelect.value;
  const sourceScope = state.activeSource === 'all' ? '' : state.activeSource;
  const conceptFilter = normalizeToken(state.filters.concept);
  const dependencyFilter = normalizeToken(state.filters.dependency);

  const aggregated = new Map();

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
      const concepto = getConceptName(item.row, item.source);
      const vigencia = extractYearValue(item.row, item.source);
      const amount = getAmountValue(item.row);
      const key = `${concepto}||${vigencia}`;

      if (!aggregated.has(key)) {
        aggregated.set(key, {
          concepto,
          vigencia,
          valorBase: 0,
          valorCDP: 0,
          valorCRP: 0,
        });
      }

      const entry = aggregated.get(key);

      if (item.source === 'cdp') {
        entry.valorBase += amount;
        entry.valorCDP += amount;
      } else if (item.source === 'crp') {
        entry.valorCRP += amount;
      } else {
        entry.valorBase += amount;
      }
    });

  let allRows = Array.from(aggregated.values()).sort((a, b) => b.valorCRP - a.valorCRP);

  if (search) {
    allRows = allRows.filter(row => {
      const joined = `${row.concepto} ${row.vigencia}`.toLowerCase();
      return joined.includes(search);
    });
  }

  if (allRows.length === 0) {
    elements.summaryBody.innerHTML = '<tr><td colspan="6" class="table-placeholder">No hay datos que mostrar</td></tr>';
    return;
  }

  elements.summaryBody.innerHTML = allRows.map(row => {
    const ejecucion = row.valorBase > 0
      ? ((row.valorCRP / row.valorBase) * 100).toFixed(2)
      : 0;

    return `
      <tr>
        <td><strong>${row.concepto}</strong></td>
        <td>${row.vigencia}</td>
        <td>${formatCurrency(row.valorBase)}</td>
        <td>${formatCurrency(row.valorCDP)}</td>
        <td>${formatCurrency(row.valorCRP)}</td>
        <td>${ejecucion}%</td>
      </tr>
    `;
  }).join('');
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
  elements.summaryFilterSelect.addEventListener('change', updateSummaryTable);
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
  });
  elements.dependencyFilterSelect.addEventListener('change', () => {
    state.filters.dependency = elements.dependencyFilterSelect.value;
    updateFilterLabels();
    updateMetrics();
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
    updateFilterLabels();

    updateMetrics();
    updateCharts();
    updateSummaryTable();
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
  bindEvents();
  await loadDashboardData();
}

init();
