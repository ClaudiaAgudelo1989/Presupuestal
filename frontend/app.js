const state = {
  tables: [],
};

const elements = {
  apiBase: document.getElementById('apiBase'),
  checkHealthBtn: document.getElementById('checkHealthBtn'),
  healthStatus: document.getElementById('healthStatus'),
  refreshTablesBtn: document.getElementById('refreshTablesBtn'),
  tablesList: document.getElementById('tablesList'),
  tablesEmpty: document.getElementById('tablesEmpty'),
  createTableForm: document.getElementById('createTableForm'),
  tableName: document.getElementById('tableName'),
  ifExists: document.getElementById('ifExists'),
  addColumnBtn: document.getElementById('addColumnBtn'),
  columnsContainer: document.getElementById('columnsContainer'),
  schemaTableSelect: document.getElementById('schemaTableSelect'),
  loadSchemaBtn: document.getElementById('loadSchemaBtn'),
  schemaTableBody: document.getElementById('schemaTableBody'),
  uploadForm: document.getElementById('uploadForm'),
  uploadTableSelect: document.getElementById('uploadTableSelect'),
  sheetName: document.getElementById('sheetName'),
  excelFile: document.getElementById('excelFile'),
  previewExcelBtn: document.getElementById('previewExcelBtn'),
  previewMeta: document.getElementById('previewMeta'),
  previewHead: document.getElementById('previewHead'),
  previewBody: document.getElementById('previewBody'),
  responseLog: document.getElementById('responseLog'),
  columnRowTemplate: document.getElementById('columnRowTemplate'),
};

function getApiBase() {
  const raw = elements.apiBase.value.trim();
  if (!raw) {
    return window.location.origin;
  }
  return raw.replace(/\/$/, '');
}

function setHealthStatus(text, variant) {
  elements.healthStatus.textContent = text;
  elements.healthStatus.className = `status-chip ${variant}`;
}

function writeLog(title, payload) {
  const timestamp = new Date().toLocaleTimeString('es-CO');
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  elements.responseLog.textContent = `[${timestamp}] ${title}\n${serialized}`;
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

function createColumnRow(defaults = {}) {
  const node = elements.columnRowTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('.column-name').value = defaults.name || '';
  node.querySelector('.column-type').value = defaults.data_type || 'TEXT';
  node.querySelector('.column-nullable').checked = defaults.nullable ?? true;
  node.querySelector('.remove-column-btn').addEventListener('click', () => {
    node.remove();
  });
  return node;
}

function bootstrapColumnRows() {
  elements.columnsContainer.innerHTML = '';
  [
    { name: 'numero_documento', data_type: 'VARCHAR(100)', nullable: true },
    { name: 'fecha_registro', data_type: 'DATETIME', nullable: true },
    { name: 'valor_actual', data_type: 'DECIMAL(18,2)', nullable: true },
  ].forEach((column) => {
    elements.columnsContainer.appendChild(createColumnRow(column));
  });
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
    item.innerHTML = `
      <span>${tableName}</span>
      <span class="table-badge">${index + 1}</span>
    `;
    elements.tablesList.appendChild(item);
  });

  const optionsMarkup = state.tables.length
    ? state.tables.map((table) => `<option value="${table}">${table}</option>`).join('')
    : '<option value="">Sin tablas</option>';

  elements.schemaTableSelect.innerHTML = optionsMarkup;
  elements.uploadTableSelect.innerHTML = optionsMarkup;
}

function renderSchema(columns) {
  if (!columns.length) {
    elements.schemaTableBody.innerHTML = '<tr><td colspan="5" class="table-placeholder">La tabla no tiene columnas visibles.</td></tr>';
    return;
  }

  elements.schemaTableBody.innerHTML = columns
    .map(
      (column) => `
        <tr>
          <td>${column.column_name}</td>
          <td>${column.data_type}</td>
          <td>${column.is_nullable}</td>
          <td>${column.column_key || '-'}</td>
          <td>${column.extra || '-'}</td>
        </tr>
      `,
    )
    .join('');
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
    .map(
      (row) => `
        <tr>
          ${columns.map((col) => `<td>${row[col] ?? ''}</td>`).join('')}
        </tr>
      `,
    )
    .join('');
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
    writeLog('Tablas cargadas', data);
  } catch (error) {
    state.tables = [];
    renderTables();
    writeLog('Error cargando tablas', error.message);
  }
}

async function loadSchema() {
  const tableName = elements.schemaTableSelect.value;
  if (!tableName) {
    writeLog('Esquema', 'Selecciona una tabla primero.');
    return;
  }

  try {
    const data = await request(`/api/tables/${encodeURIComponent(tableName)}/schema`);
    renderSchema(data.columns || []);
    writeLog(`Esquema de ${tableName}`, data);
  } catch (error) {
    renderSchema([]);
    writeLog(`Error consultando esquema de ${tableName}`, error.message);
  }
}

async function handleCreateTable(event) {
  event.preventDefault();

  const columns = Array.from(elements.columnsContainer.querySelectorAll('.column-row')).map((row) => ({
    name: row.querySelector('.column-name').value.trim(),
    data_type: row.querySelector('.column-type').value,
    nullable: row.querySelector('.column-nullable').checked,
  })).filter((column) => column.name);

  if (!columns.length) {
    writeLog('Crear tabla', 'Debes agregar al menos una columna con nombre.');
    return;
  }

  const payload = {
    table_name: elements.tableName.value.trim(),
    if_exists: elements.ifExists.value,
    columns,
  };

  try {
    const data = await request('/api/tables/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    writeLog('Tabla creada', data);
    await loadTables();
    elements.createTableForm.reset();
    bootstrapColumnRows();
    if (data.table_name) {
      elements.schemaTableSelect.value = data.table_name;
      elements.uploadTableSelect.value = data.table_name;
    }
  } catch (error) {
    writeLog('Error creando tabla', error.message);
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
    const data = await request('/api/excel/preview', {
      method: 'POST',
      body: formData,
    });
    const targetSheet = elements.sheetName.value.trim();
    const sheetInfo = targetSheet
      ? (data.sheets || []).find((sheet) => sheet.sheet === targetSheet)
      : data.sheets?.[0];
    renderPreview(sheetInfo);
    writeLog('Vista previa Excel', data);
  } catch (error) {
    writeLog('Error en vista previa', error.message);
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
    const data = await request('/api/excel/upload-to-table', {
      method: 'POST',
      body: formData,
    });
    writeLog('Excel cargado', data);
  } catch (error) {
    writeLog('Error cargando Excel', error.message);
  }
}

function initializeApiBase() {
  elements.apiBase.value = window.location.origin === 'null' ? 'http://127.0.0.1:8000' : window.location.origin;
}

function bindEvents() {
  elements.checkHealthBtn.addEventListener('click', checkHealth);
  elements.refreshTablesBtn.addEventListener('click', loadTables);
  elements.addColumnBtn.addEventListener('click', () => {
    elements.columnsContainer.appendChild(createColumnRow());
  });
  elements.createTableForm.addEventListener('submit', handleCreateTable);
  elements.loadSchemaBtn.addEventListener('click', loadSchema);
  elements.previewExcelBtn.addEventListener('click', handlePreviewExcel);
  elements.uploadForm.addEventListener('submit', handleUploadExcel);
}

async function init() {
  initializeApiBase();
  bootstrapColumnRows();
  bindEvents();
  await checkHealth();
  await loadTables();
}

init();
