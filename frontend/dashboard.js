const state = {
  tables: [],
  dashboardData: {
    cdp: [],
    crp: [],
    seguimiento: [],
  },
  charts: {},
  searchTerm: '',
  filterType: '',
};

const elements = {
  metricCDP: document.getElementById('metricCDP'),
  metricCRP: document.getElementById('metricCRP'),
  metricDevengado: document.getElementById('metricDevengado'),
  metricBase: document.getElementById('metricBase'),
  chartTypeSelect: document.getElementById('chartTypeSelect'),
  refreshDashboardBtn: document.getElementById('refreshDashboardBtn'),
  summarySearchInput: document.getElementById('summarySearchInput'),
  summaryFilterSelect: document.getElementById('summaryFilterSelect'),
  summaryBody: document.getElementById('summaryBody'),
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

async function loadTableData(tableName, limit = 1000) {
  try {
    const response = await request(`/api/tables/${tableName}/preview?limit=${limit}&page=1`);
    return response.rows || [];
  } catch (error) {
    console.error(`Error cargando ${tableName}:`, error);
    return [];
  }
}

async function loadDashboardData() {
  try {
    const [cdpData, crpData, seguimientoData] = await Promise.all([
      loadTableData('cdp'),
      loadTableData('crp'),
      loadTableData('seguimiento_presupuestal'),
    ]);
    
    state.dashboardData = {
      cdp: cdpData,
      crp: crpData,
      seguimiento: seguimientoData,
    };
    
    updateMetrics();
    updateCharts();
    updateSummaryTable();
    updateDataSourceInfo();
  } catch (error) {
    console.error('Error cargando dashboard:', error);
    elements.dataSourceInfo.textContent = 'Error cargando datos del servidor';
  }
}

function extractNumericValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
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

function buildDependencyTrendSeries(dashboardData) {
  const source = dashboardData || state.dashboardData;
  const allRows = [
    ...source.cdp,
    ...source.crp,
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
  const cdpCount = state.dashboardData.cdp.length;
  const crpCount = state.dashboardData.crp.length;
  
  let devengadoTotal = 0;
  let baseTotal = 0;

  // Calcular totales del CRP (devengado)
  state.dashboardData.crp.forEach(row => {
    const colValor = findColumnCaseInsensitive(row, ['valor', 'cantidad', 'monto']);
    if (colValor) devengadoTotal += extractNumericValue(row[colValor]);
  });

  // Calcular totales del CDP (base)
  state.dashboardData.cdp.forEach(row => {
    const colValor = findColumnCaseInsensitive(row, ['valor', 'cantidad', 'monto']);
    if (colValor) baseTotal += extractNumericValue(row[colValor]);
  });

  elements.metricCDP.textContent = formatNumber(cdpCount);
  elements.metricCRP.textContent = formatNumber(crpCount);
  elements.metricDevengado.textContent = formatCurrency(devengadoTotal);
  elements.metricBase.textContent = formatCurrency(baseTotal);
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
  
  // Distribution Chart
  const labels = ['Apropiacion', 'Ejecucion', 'Asignacion'];
  const values = [
    state.dashboardData.cdp.length,
    state.dashboardData.crp.length,
    state.dashboardData.seguimiento.length,
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

  // Trend Chart
  const ctxTrend = document.getElementById('trendChart');
  if (ctxTrend && ctxTrend.getContext) {
    if (state.charts.trend) {
      state.charts.trend.destroy();
    }

    const trendSeries = buildDependencyTrendSeries(state.dashboardData);

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

  let allRows = [];

  if (filter === '' || filter === 'cdp') {
    allRows.push({
      concepto: 'Certificaciones',
      vigencia: new Date().getFullYear(),
      valorBase: calculateTotal(state.dashboardData.cdp),
      valorCDP: calculateTotal(state.dashboardData.cdp),
      valorCRP: 0,
      source: 'cdp',
    });
  }

  if (filter === '' || filter === 'crp') {
    allRows.push({
      concepto: 'Compromisos',
      vigencia: new Date().getFullYear(),
      valorBase: 0,
      valorCDP: 0,
      valorCRP: calculateTotal(state.dashboardData.crp),
      source: 'crp',
    });
  }

  if (filter === '' || filter === 'seguimiento') {
    allRows.push({
      concepto: 'Seguimiento',
      vigencia: new Date().getFullYear(),
      valorBase: calculateTotal(state.dashboardData.seguimiento),
      valorCDP: 0,
      valorCRP: 0,
      source: 'seguimiento',
    });
  }

  // Filtrar por búsqueda
  if (search) {
    allRows = allRows.filter(row =>
      row.concepto.toLowerCase().includes(search) ||
      row.vigencia.toString().includes(search)
    );
  }

  // Renderizar tabla
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

function calculateTotal(data) {
  let total = 0;
  data.forEach(row => {
    const colValor = findColumnCaseInsensitive(row, ['valor', 'cantidad', 'monto']);
    if (colValor) {
      total += extractNumericValue(row[colValor]);
    }
  });
  return total;
}

function updateDataSourceInfo() {
  const info = `
    📊 Base de Datos: presupuesto
    📁 Tablas cargadas: ${Object.keys(state.dashboardData).length}
    📝 Registros totales: ${Object.values(state.dashboardData).reduce((sum, arr) => sum + arr.length, 0)}
    ✅ Última actualización: ${new Date().toLocaleString('es-CO')}
  `;
  elements.dataSourceInfo.textContent = info;
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
  
  // Redibujar gráficos si existen
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

async function init() {
  initializeDarkMode();
  bindEvents();
  await loadDashboardData();
}

init();
