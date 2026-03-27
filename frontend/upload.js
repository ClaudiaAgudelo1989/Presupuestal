// --- SUBIDA AVANZADA EJE ---
const uploadEjeAvanzadoForm = document.getElementById('uploadEjeAvanzadoForm');
const excelEjeAvanzadoFile = document.getElementById('excelEjeAvanzadoFile');
const uploadEjeAvanzadoResult = document.getElementById('uploadEjeAvanzadoResult');

if (uploadEjeAvanzadoForm) {
  uploadEjeAvanzadoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!excelEjeAvanzadoFile.files.length) {
      uploadEjeAvanzadoResult.classList.remove('ok', 'error', 'hidden');
      uploadEjeAvanzadoResult.classList.add('error');
      uploadEjeAvanzadoResult.textContent = 'Selecciona un archivo .xlsx';
      return;
    }
    const formData = new FormData();
    formData.append('file', excelEjeAvanzadoFile.files[0]);
    formData.append('table_name', 'eje');
    uploadEjeAvanzadoResult.classList.remove('ok', 'error', 'hidden');
    uploadEjeAvanzadoResult.classList.add('neutral');
    uploadEjeAvanzadoResult.textContent = 'Subiendo archivo...';
    try {
      const response = await fetch(`${getApiBase()}/api/excel/upload-to-table`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        uploadEjeAvanzadoResult.classList.remove('neutral', 'error', 'hidden');
        uploadEjeAvanzadoResult.classList.add('ok');
        uploadEjeAvanzadoResult.textContent = data.message || 'Archivo subido correctamente.';
      } else {
        uploadEjeAvanzadoResult.classList.remove('neutral', 'ok', 'hidden');
        uploadEjeAvanzadoResult.classList.add('error');
        uploadEjeAvanzadoResult.textContent = data.detail || 'Error al subir el archivo.';
      }
    } catch (err) {
      uploadEjeAvanzadoResult.classList.remove('neutral', 'ok', 'hidden');
      uploadEjeAvanzadoResult.classList.add('error');
      uploadEjeAvanzadoResult.textContent = err.message || 'Error de red al subir el archivo.';
    }
  });
}
const state = {
  tables: [],
  datasetTables: ['cdp', 'crp', 'seguimiento_presupuestal'],
  activeDatasetTable: 'cdp',
  datasetPage: 1,
  datasetSearch: '',
  datasetPageSize: 8,
  keywordTerms: [],
};

const elements = {
  apiBase: document.getElementById('apiBase'),
  checkHealthBtn: document.getElementById('checkHealthBtn'),
  healthStatus: document.getElementById('healthStatus'),
  refreshTablesBtn: document.getElementById('refreshTablesBtn'),
  tablesList: document.getElementById('tablesList'),
  tablesEmpty: document.getElementById('tablesEmpty'),
  uploadForm: document.getElementById('uploadForm'),
  uploadTableSelect: document.getElementById('uploadTableSelect'),
  sheetName: document.getElementById('sheetName'),
  excelFile: document.getElementById('excelFile'),
  previewExcelBtn: document.getElementById('previewExcelBtn'),
  refreshDatasetViewsBtn: document.getElementById('refreshDatasetViewsBtn'),
  datasetTabs: Array.from(document.querySelectorAll('.dataset-tab')),
  datasetSearchInput: document.getElementById('datasetSearchInput'),
  datasetSearchBtn: document.getElementById('datasetSearchBtn'),
  datasetKeywordBtn: document.getElementById('datasetKeywordBtn'),
  datasetClearKeywordBtn: document.getElementById('datasetClearKeywordBtn'),
  datasetActiveName: document.getElementById('datasetActiveName'),
  datasetCountActive: document.getElementById('datasetCountActive'),
  datasetPageInfo: document.getElementById('datasetPageInfo'),
  datasetKeywordInfo: document.getElementById('datasetKeywordInfo'),
  datasetHeadActive: document.getElementById('datasetHeadActive'),
  datasetBodyActive: document.getElementById('datasetBodyActive'),
  datasetPrevBtn: document.getElementById('datasetPrevBtn'),
  datasetNextBtn: document.getElementById('datasetNextBtn'),
  previewMeta: document.getElementById('previewMeta'),
  previewHead: document.getElementById('previewHead'),
  previewBody: document.getElementById('previewBody'),
  uploadResult: document.getElementById('uploadResult'),
  responseLog: document.getElementById('responseLog'),
};

function setUploadResult(message, variant = 'neutral') {
  if (!elements.uploadResult) {
    return;
  }

  elements.uploadResult.classList.remove('hidden', 'ok', 'error', 'neutral');
  elements.uploadResult.classList.add(variant);
  elements.uploadResult.textContent = message;
}

function buildUploadSummary(data) {
  const exitosas = Number(data?.filas_exitosas ?? data?.filas_cargadas ?? 0);
  const fallidas = Number(data?.filas_fallidas ?? 0);
  const preparadas = Number(data?.filas_preparadas_para_insert ?? data?.filas_intentadas ?? exitosas + fallidas);

  const coverage = data?.validacion_integridad?.cobertura_columnas_porcentaje;
  const coverageText = typeof coverage === 'number' ? `${coverage}%` : 'N/D';

  const mensaje = [
    `Carga completada en tabla ${data?.tabla || '-'}`,
    `Filas preparadas: ${preparadas}`,
    `Registros exitosos: ${exitosas}`,
    `Registros fallidos: ${fallidas}`,
    `Cobertura de columnas: ${coverageText}`,
  ];

  if (data?.validacion_cdp) {
    const cdp = data.validacion_cdp;
    mensaje.push(`Columnas CDP detectadas: ${cdp.columnas_totales_excel_detectadas}/${cdp.columnas_totales_excel_esperadas}`);
    mensaje.push(`CDP requeridas detectadas: ${cdp.encabezados_requeridos_detectados}/${cdp.encabezados_requeridos}`);
    if (!cdp.encabezados_requeridos_completos) {
      mensaje.push(`Encabezados CDP faltantes: ${cdp.encabezados_requeridos_faltantes.join(', ')}`);
    }
  }

  if ((data?.errores_muestra || []).length) {
    const first = data.errores_muestra[0];
    mensaje.push(`Primer error: fila ${first.fila} - ${first.error}`);
  }

  return mensaje.join(' | ');
}

function getApiBase() {
  const raw = (elements.apiBase?.value || '').trim();
  if (!raw) {
    const origin = window.location.origin;
    if (!origin || origin === 'null' || window.location.protocol === 'file:') {
      return 'http://127.0.0.1:8000';
    }
    return origin.replace(/\/$/, '');
  }
  return raw.replace(/\/$/, '');
}

function writeLog(title, payload) {
  const timestamp = new Date().toLocaleTimeString('es-CO');
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  if (elements.responseLog) {
    elements.responseLog.textContent = `[${timestamp}] ${title}\n${serialized}`;
  } else {
    // Cuando el panel de log está oculto para cliente, mantenemos trazas en consola.
    // eslint-disable-next-line no-console
    console.log(`[${timestamp}] ${title}`, payload);
  }
}

function formatTableLabel(tableName) {
  const raw = String(tableName || '');
  const normalized = raw.toLowerCase();

  if (normalized === 'seguimiento_presupuestal' || normalized === 'presupuesto.seguimiento_presupuestal') {
    return 'seguimiento_presupuestal (EJE)';
  }

  return raw.replace(/^presupuesto\./i, '');
}

function setHealthStatus(text, variant) {
  if (!elements.healthStatus) {
    return;
  }
  elements.healthStatus.textContent = text;
  elements.healthStatus.className = `status-chip ${variant}`;
}

async function request(path, options = {}) {
  const response = await fetch(`${getApiBase()}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = data?.detail || data || 'Error desconocido';
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }

  return data;
}

function renderTables() {
  elements.tablesList.innerHTML = '';

  if (!state.tables.length) {
    elements.tablesEmpty.classList.remove('hidden');
  } else {
    elements.tablesEmpty.classList.add('hidden');
  }

  state.tables.forEach((tableName, index) => {
    const item = document.createElement('li');
    item.innerHTML = `<span>${formatTableLabel(tableName)}</span><span class="table-badge">${index + 1}</span>`;
    elements.tablesList.appendChild(item);
  });

  elements.uploadTableSelect.innerHTML = state.tables.length
    ? state.tables.map((table) => `<option value="${table}">${formatTableLabel(table)}</option>`).join('')
    : '<option value="">Sin tablas</option>';
}

function renderPreview(sheetInfo) {
  if (!sheetInfo || !sheetInfo.preview || !sheetInfo.preview.length) {
    elements.previewMeta.textContent = 'No hay filas para mostrar en la vista previa.';
    elements.previewHead.innerHTML = '';
    elements.previewBody.innerHTML = '<tr><td class="table-placeholder">Sin contenido para mostrar.</td></tr>';
    return;
  }

  const columns = Object.keys(sheetInfo.preview[0]);
  elements.previewMeta.textContent = `Hoja: ${sheetInfo.sheet} | Filas: ${sheetInfo.rows} | Columnas: ${sheetInfo.columns.length}`;
  elements.previewHead.innerHTML = `<tr>${columns.map((col) => `<th>${col}</th>`).join('')}</tr>`;
  elements.previewBody.innerHTML = sheetInfo.preview
    .map((row) => `<tr>${columns.map((col) => `<td>${row[col] ?? ''}</td>`).join('')}</tr>`)
    .join('');
}

function renderDatasetPreview(tableName, payload) {
  const rows = payload?.rows || [];
  const columns = payload?.columns || [];
  elements.datasetActiveName.textContent = formatTableLabel(tableName);
  elements.datasetPageInfo.textContent = `Página ${payload?.page ?? 1} de ${payload?.total_pages ?? 1}`;
  elements.datasetPrevBtn.disabled = (payload?.page ?? 1) <= 1;
  elements.datasetNextBtn.disabled = (payload?.page ?? 1) >= (payload?.total_pages ?? 1);

  if (!columns.length) {
    elements.datasetCountActive.textContent = '0';
    elements.datasetKeywordInfo.textContent = '';
    elements.datasetHeadActive.innerHTML = '';
    elements.datasetBodyActive.innerHTML = '<tr><td class="table-placeholder">Sin columnas visibles.</td></tr>';
    return;
  }

  elements.datasetHeadActive.innerHTML = `<tr>${columns.map((col) => `<th>${col}</th>`).join('')}</tr>`;

  if (!rows.length) {
    elements.datasetCountActive.textContent = '0';
    elements.datasetBodyActive.innerHTML = `<tr><td colspan="${columns.length}" class="table-placeholder">Sin datos cargados.</td></tr>`;
    return;
  }

  renderKeywordFilteredRows(rows, columns, payload?.total_rows ?? rows.length);
}

function renderKeywordFilteredRows(rows, columns, totalRows) {
  const terms = state.keywordTerms
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);

  const filteredRows = !terms.length
    ? rows
    : rows.filter((row) => {
      const haystack = columns
        .map((col) => String(row[col] ?? '').toLowerCase())
        .join(' ');
      return terms.every((term) => haystack.includes(term));
    });

  elements.datasetCountActive.textContent = String(filteredRows.length);
  if (elements.datasetKeywordInfo) {
    elements.datasetKeywordInfo.textContent = terms.length
      ? `Palabras clave: ${terms.join(', ')} | Registros visibles: ${filteredRows.length} de ${rows.length}`
      : `Registros visibles: ${rows.length} de ${totalRows}`;
  }

  if (!filteredRows.length) {
    elements.datasetBodyActive.innerHTML = `<tr><td colspan="${columns.length}" class="table-placeholder">No hay resultados para las palabras clave.</td></tr>`;
    return;
  }

  elements.datasetBodyActive.innerHTML = filteredRows
    .map((row) => `<tr>${columns.map((col) => `<td>${row[col] ?? ''}</td>`).join('')}</tr>`)
    .join('');
}

function syncDatasetTabs() {
  elements.datasetTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.table === state.activeDatasetTable);
  });
}

async function checkHealth() {
  try {
    setHealthStatus('Verificando...', 'neutral');
    const data = await request('/health');
    setHealthStatus(`Conexión activa: ${data.status}`, 'ok');
    writeLog('Health check', data);
  } catch (error) {
    setHealthStatus('Sin conexión', 'error');
    writeLog('Health check', error.message);
  }
}

async function loadTables() {
  try {
    const data = await request('/api/tables');
    state.tables = data.tables || [];
    renderTables();
    await loadDatasetViews();
    writeLog('Tablas cargadas', data);
  } catch (error) {
    state.tables = [];
    renderTables();
    writeLog('Error cargando tablas', error.message);
  }
}

async function loadDatasetViews() {
  const available = new Set(state.tables.map((table) => String(table).toLowerCase()));
  syncDatasetTabs();

  if (!available.has(state.activeDatasetTable.toLowerCase())) {
    renderDatasetPreview(state.activeDatasetTable, { columns: [], rows: [], total_rows: 0, page: 1, total_pages: 1 });
    return;
  }

  const params = new URLSearchParams({
    limit: String(state.datasetPageSize),
    page: String(state.datasetPage),
  });
  if (state.datasetSearch.trim()) {
    params.set('q', state.datasetSearch.trim());
  }

  try {
    const data = await request(
      `/api/tables/${encodeURIComponent(state.activeDatasetTable)}/preview?${params.toString()}`,
    );
    renderDatasetPreview(state.activeDatasetTable, data);
  } catch (error) {
    renderDatasetPreview(state.activeDatasetTable, { columns: [], rows: [], total_rows: 0, page: 1, total_pages: 1 });
    writeLog(`Error cargando vista de ${state.activeDatasetTable}`, error.message);
  }
}

async function handlePreviewExcel() {
  const file = elements.excelFile.files[0];
  if (!file) {
    writeLog('Vista previa Excel', 'Selecciona primero un archivo Excel.');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  if (elements.uploadTableSelect?.value) {
    formData.append('table_name', elements.uploadTableSelect.value);
  }
  if (elements.sheetName.value.trim()) {
    formData.append('sheet', elements.sheetName.value.trim());
  }

  try {
    const data = await request('/api/excel/preview', { method: 'POST', body: formData });
    const targetSheet = elements.sheetName.value.trim();
    const sheetInfo = targetSheet
      ? (data.sheets || []).find((sheet) => sheet.sheet === targetSheet)
      : data.sheets?.[0];
    renderPreview(sheetInfo);
    writeLog('Vista previa Excel', data);
  } catch (error) {
    writeLog('Error en vista previa', error.message);
    window.alert(`Error en vista previa: ${error.message}`);
  }
}

async function handleUploadExcel(event) {
  event.preventDefault();

  const file = elements.excelFile.files[0];
  const tableName = elements.uploadTableSelect.value;
  if (!file || !tableName) {
    writeLog('Subir Excel', 'Debes seleccionar una tabla y un archivo.');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('table_name', tableName);
  if (elements.sheetName.value.trim()) {
    formData.append('sheet', elements.sheetName.value.trim());
  }

  try {
    const data = await request('/api/excel/upload-to-table', { method: 'POST', body: formData });
    writeLog('Excel cargado', data);
    const summary = buildUploadSummary(data);
    setUploadResult(summary, Number(data?.filas_fallidas || 0) > 0 ? 'error' : 'ok');
    window.alert(summary);
    await loadDatasetViews();
  } catch (error) {
    writeLog('Error cargando Excel', error.message);
    setUploadResult(`Error cargando Excel: ${error.message}`, 'error');
    window.alert(`Error cargando Excel: ${error.message}`);
  }
}

function initializeApiBase() {
  if (!elements.apiBase) {
    return;
  }
  elements.apiBase.value = window.location.origin === 'null' ? 'http://127.0.0.1:8000' : window.location.origin;
}

function bindDatasetTabEvents() {
  elements.datasetTabs.forEach((tab) => {
    tab.addEventListener('click', async () => {
      state.activeDatasetTable = tab.dataset.table;
      state.datasetPage = 1;
      state.keywordTerms = [];
      await loadDatasetViews();
    });
  });

  elements.datasetSearchBtn?.addEventListener('click', async () => {
    state.datasetSearch = elements.datasetSearchInput.value.trim();
    state.datasetPage = 1;
    await loadDatasetViews();
  });

  elements.datasetSearchInput?.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      state.datasetSearch = elements.datasetSearchInput.value.trim();
      state.datasetPage = 1;
      await loadDatasetViews();
    }
  });

  elements.datasetKeywordBtn?.addEventListener('click', async () => {
    const current = state.keywordTerms.join(', ');
    const input = window.prompt('Escribe palabras clave separadas por coma (,).\nEjemplo: dependencia, registro', current);
    if (input === null) {
      return;
    }

    state.keywordTerms = input
      .split(',')
      .map((term) => term.trim())
      .filter(Boolean);

    state.datasetPage = 1;
    await loadDatasetViews();
  });

  elements.datasetClearKeywordBtn?.addEventListener('click', async () => {
    state.keywordTerms = [];
    state.datasetPage = 1;
    await loadDatasetViews();
  });

  elements.datasetPrevBtn?.addEventListener('click', async () => {
    if (state.datasetPage > 1) {
      state.datasetPage -= 1;
      await loadDatasetViews();
    }
  });

  elements.datasetNextBtn?.addEventListener('click', async () => {
    state.datasetPage += 1;
    await loadDatasetViews();
  });
}

function bindEvents() {
  elements.checkHealthBtn?.addEventListener('click', checkHealth);
  elements.refreshTablesBtn?.addEventListener('click', loadTables);
  elements.refreshDatasetViewsBtn?.addEventListener('click', loadDatasetViews);
  elements.previewExcelBtn?.addEventListener('click', handlePreviewExcel);
  elements.uploadForm?.addEventListener('submit', handleUploadExcel);
  bindDatasetTabEvents();
  bindThemeToggle();
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

function bindThemeToggle() {
  const toggleBtn = document.getElementById('toggleDarkMode');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }
}

async function init() {
  initializeApiBase();
  initializeDarkMode();
  bindEvents();
  if (elements.checkHealthBtn || elements.healthStatus) {
    await checkHealth();
  }
  await loadTables();
}

init();
