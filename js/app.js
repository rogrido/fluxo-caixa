// ============================================================
// CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE) — opcional
// ============================================================
const SUPABASE_URL = 'https://hvxjjlpzoygqdangirwc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sx5O9wDnYjiqBY1iyUDZ0w_2GO04i_k';

const CLOUD_MODE = !SUPABASE_URL.includes('COLE_AQUI') && !SUPABASE_KEY.includes('COLE_AQUI');
const db = CLOUD_MODE ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ============================================================
// DADOS
// ============================================================
let seq = 1;
const uid = () => String(seq++);

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const CATEGORY_HEX = {
  'Salário': '#8A661F',
  'Vendas Benegrano': '#2E6B4C',
  'Alimentação': '#B5653F',
  'Moradia': '#4A5D80',
  'Transporte': '#6C5A96',
  'Lazer': '#A34C74',
  'Assinaturas': '#3E7C90',
  'Saúde': '#B5453F',
  'Educação': '#557A55',
  'Investimentos': '#8C6E2F',
  'Insumos Benegrano': '#7A5A34',
  'Outros': '#5A5A5A',
};

const CATEGORY_TAILWIND = {
  'Salário': { bg: 'bg-[#F1E4CD]', text: 'text-[#8A661F]' },
  'Vendas Benegrano': { bg: 'bg-[#E7F0EA]', text: 'text-[#2E6B4C]' },
  'Alimentação': { bg: 'bg-[#FBEFE7]', text: 'text-[#B5653F]' },
  'Moradia': { bg: 'bg-[#EAEEF5]', text: 'text-[#4A5D80]' },
  'Transporte': { bg: 'bg-[#F0EDF7]', text: 'text-[#6C5A96]' },
  'Lazer': { bg: 'bg-[#FDEDF3]', text: 'text-[#A34C74]' },
  'Assinaturas': { bg: 'bg-[#EAF2F5]', text: 'text-[#3E7C90]' },
  'Saúde': { bg: 'bg-[#FCEBEB]', text: 'text-[#B5453F]' },
  'Educação': { bg: 'bg-[#EEF3EC]', text: 'text-[#557A55]' },
  'Investimentos': { bg: 'bg-[#F5F0E4]', text: 'text-[#8C6E2F]' },
  'Insumos Benegrano': { bg: 'bg-[#F0E9DF]', text: 'text-[#7A5A34]' },
  'Outros': { bg: 'bg-[#EEEEEE]', text: 'text-[#5A5A5A]' },
};

const SEED_DATA = [
  { date: '2026-07-01', description: 'Salário Semanal', category: 'Salário', type: 'entrada', value: 950.00, notes: '' },
  { date: '2026-07-02', description: 'Supermercado Extra', category: 'Alimentação', type: 'saida', value: 187.40, notes: 'Compra do mês, incluindo estoque de café e leite.' },
  { date: '2026-07-03', description: 'Uber para faculdade', category: 'Transporte', type: 'saida', value: 24.90, notes: '' },
  { date: '2026-07-04', description: 'Venda Benegrano – Atacado (Empório Sabor)', category: 'Vendas Benegrano', type: 'entrada', value: 420.00, notes: '' },
  { date: '2026-07-05', description: 'Netflix + Spotify', category: 'Assinaturas', type: 'saida', value: 54.90, notes: '' },
  { date: '2026-07-06', description: 'Aluguel', category: 'Moradia', type: 'saida', value: 650.00, notes: 'Pago com antecedência, sem multa por atraso.' },
  { date: '2026-07-07', description: 'Combustível', category: 'Transporte', type: 'saida', value: 120.00, notes: '' },
  { date: '2026-07-08', description: 'Salário Semanal', category: 'Salário', type: 'entrada', value: 950.00, notes: '' },
  { date: '2026-07-09', description: 'Sacas de café – Sítio Santa Cruz', category: 'Insumos Benegrano', type: 'saida', value: 480.00, notes: 'Reposição de estoque, lote Arara 84 pontos SCA.' },
  { date: '2026-07-10', description: 'iFood', category: 'Alimentação', type: 'saida', value: 62.30, notes: '' },
  { date: '2026-07-11', description: 'Mensalidade curso técnico', category: 'Educação', type: 'saida', value: 210.00, notes: '' },
  { date: '2026-07-12', description: 'Venda Benegrano – Varejo (Padaria Trigo Doce)', category: 'Vendas Benegrano', type: 'entrada', value: 280.00, notes: '' },
  { date: '2026-07-13', description: 'Cinema com amigos', category: 'Lazer', type: 'saida', value: 45.00, notes: '' },
  { date: '2026-07-14', description: 'Farmácia', category: 'Saúde', type: 'saida', value: 38.70, notes: '' },
  { date: '2026-07-15', description: 'Salário Semanal', category: 'Salário', type: 'entrada', value: 950.00, notes: '' },
  { date: '2026-07-16', description: 'Aplicação em CDB', category: 'Investimentos', type: 'saida', value: 300.00, notes: 'Reserva de emergência, resgate disponível em 90 dias.' },
  { date: '2026-07-17', description: 'Mercado', category: 'Alimentação', type: 'saida', value: 143.20, notes: '' },
  { date: '2026-07-18', description: 'Etiquetas e embalagens', category: 'Insumos Benegrano', type: 'saida', value: 95.00, notes: '' },
  { date: '2026-07-19', description: 'Venda Benegrano – Atacado (Café Aurora)', category: 'Vendas Benegrano', type: 'entrada', value: 560.00, notes: '' },
  { date: '2026-07-20', description: 'Show ao vivo', category: 'Lazer', type: 'saida', value: 80.00, notes: '' },
  { date: '2026-07-21', description: 'Gasolina', category: 'Transporte', type: 'saida', value: 110.00, notes: '' },
  { date: '2026-07-22', description: 'Salário Semanal', category: 'Salário', type: 'entrada', value: 950.00, notes: '' },
  { date: '2026-07-23', description: 'Conta de luz', category: 'Moradia', type: 'saida', value: 175.60, notes: '' },
  { date: '2026-07-24', description: 'Internet + Celular', category: 'Assinaturas', type: 'saida', value: 130.00, notes: '' },
  { date: '2026-07-25', description: 'Venda Benegrano – Varejo (Empório do Bairro)', category: 'Vendas Benegrano', type: 'entrada', value: 310.00, notes: '' },
  { date: '2026-07-26', description: 'Consulta odontológica', category: 'Saúde', type: 'saida', value: 150.00, notes: '' },
  { date: '2026-07-27', description: 'Material de estudo', category: 'Educação', type: 'saida', value: 68.90, notes: '' },
  { date: '2026-07-28', description: 'Jantar em família', category: 'Lazer', type: 'saida', value: 95.00, notes: 'Aniversário do vô Bene — jantar de comemoração.' },
  { date: '2026-07-29', description: 'Salário Semanal', category: 'Salário', type: 'entrada', value: 950.00, notes: '' },
  { date: '2026-07-30', description: 'Frete de sacas do sítio', category: 'Insumos Benegrano', type: 'saida', value: 140.00, notes: '' },
  { date: '2026-07-31', description: 'Mercado', category: 'Alimentação', type: 'saida', value: 98.50, notes: '' },
  { date: '2026-07-31', description: 'Rendimento poupança', category: 'Investimentos', type: 'entrada', value: 42.00, notes: '' },
];

let transactions = CLOUD_MODE ? [] : SEED_DATA.map(t => ({ id: uid(), ...t }));

// ============================================================
// ESTADO
// ============================================================
const state = {
  period: { year: 'all', month: 'all', week: 'all' }, // drill-down: ano > mês > semana
  typeFilter: 'all',   // 'all' | 'entrada' | 'saida'
  chartMode: 'category', // 'category' | 'weekly'
};
let modalType = 'saida';
let chartInstance = null;

// ============================================================
// HELPERS DE DATA
// ============================================================
function getYear(dateStr) { return Number(dateStr.slice(0, 4)); }
function getMonth(dateStr) { return Number(dateStr.slice(5, 7)); }
function getDay(dateStr) { return Number(dateStr.slice(8, 10)); }
function weekOfMonth(dateStr) { return Math.ceil(getDay(dateStr) / 7); }
function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }

function weekRangesForMonth(year, month) {
  const total = daysInMonth(year, month);
  const ranges = {};
  let w = 1;
  for (let start = 1; start <= total; start += 7) {
    const end = Math.min(start + 6, total);
    ranges[w] = `${String(start).padStart(2, '0')}–${String(end).padStart(2, '0')} ${MONTH_ABBR[month - 1]}`;
    w++;
  }
  return ranges;
}

function getAvailableYears() {
  const years = new Set(transactions.map(t => getYear(t.date)));
  return Array.from(years).sort((a, b) => b - a);
}
function getAvailableMonths(year) {
  const months = new Set(transactions.filter(t => getYear(t.date) === year).map(t => getMonth(t.date)));
  return Array.from(months).sort((a, b) => a - b);
}
function countTxForYear(y) { return transactions.filter(t => getYear(t.date) === y).length; }
function countTxForMonth(y, m) { return transactions.filter(t => getYear(t.date) === y && getMonth(t.date) === m).length; }

function formatCurrency(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getFilteredRows() {
  const { year, month, week } = state.period;
  return transactions.filter(t => {
    if (year !== 'all' && getYear(t.date) !== year) return false;
    if (month !== 'all' && getMonth(t.date) !== month) return false;
    if (week !== 'all' && weekOfMonth(t.date) !== week) return false;
    return true;
  });
}

function getPeriodLabel() {
  const { year, month, week } = state.period;
  if (year === 'all') return 'Todos os períodos';
  if (month === 'all') return `Ano ${year}`;
  if (week === 'all') return `${MONTH_NAMES[month - 1]} de ${year}`;
  const ranges = weekRangesForMonth(year, month);
  return `Semana ${week} · ${ranges[week]} ${year}`;
}

// ============================================================
// CAMADA DE DADOS (Supabase / demonstração)
// ============================================================
function showBanner(type, message) {
  const el = document.getElementById('connectionBanner');
  el.classList.remove('hidden', 'bg-lossbg', 'text-loss', 'border-loss/30', 'bg-goldlight', 'text-[#7A5A2E]', 'border-gold/30');
  if (type === 'error') el.classList.add('bg-lossbg', 'text-loss', 'border-loss/30');
  else el.classList.add('bg-goldlight', 'text-[#7A5A2E]', 'border-gold/30');
  el.textContent = message;
}
function hideBanner() {
  document.getElementById('connectionBanner').classList.add('hidden');
}
function setSyncing(on) {
  const el = document.getElementById('syncIndicator');
  el.classList.toggle('hidden', !on);
  el.classList.toggle('flex', on);
}

async function loadTransactions() {
  if (!CLOUD_MODE) { renderAll(); return; }
  setSyncing(true);
  document.getElementById('tableBody').innerHTML = `<tr><td colspan="7" class="px-4 py-10 text-center text-sm text-muted">Carregando lançamentos…</td></tr>`;
  const { data, error } = await db.from('transactions').select('*').order('date', { ascending: false });
  setSyncing(false);
  if (error) {
    showBanner('error', 'Não foi possível conectar ao banco de dados: ' + error.message + '. Confira a URL e a chave do Supabase no início do código.');
    transactions = [];
    renderAll();
    return;
  }
  hideBanner();
  transactions = data.map(row => ({ ...row, value: Number(row.value) }));
  renderAll();
}

async function insertTransactionRemote(tx) {
  const { data, error } = await db.from('transactions').insert([{
    date: tx.date, description: tx.description, category: tx.category, type: tx.type, value: tx.value, notes: tx.notes
  }]).select();
  if (error) { showBanner('error', 'Erro ao salvar na nuvem: ' + error.message); return null; }
  return data && data[0] ? data[0] : null;
}

async function deleteTransactionRemote(id) {
  const { error } = await db.from('transactions').delete().eq('id', id);
  if (error) { showBanner('error', 'Erro ao excluir na nuvem: ' + error.message); return false; }
  return true;
}

// ============================================================
// RENDER: KPIs
// ============================================================
function computeKPIs() {
  const rows = getFilteredRows();
  const ganhos = rows.filter(t => t.type === 'entrada').reduce((s, t) => s + t.value, 0);
  const gastos = rows.filter(t => t.type === 'saida').reduce((s, t) => s + t.value, 0);
  return { ganhos, gastos, saldo: ganhos - gastos, rows };
}
function renderKPIs() {
  const { ganhos, gastos, saldo, rows } = computeKPIs();
  const label = getPeriodLabel();
  document.getElementById('kpiGanhosPeriod').textContent = label;
  document.getElementById('kpiGastosPeriod').textContent = label;
  document.getElementById('kpiSaldoPeriod').textContent = label;
  document.getElementById('kpiGanhosValue').textContent = formatCurrency(ganhos);
  document.getElementById('kpiGastosValue').textContent = formatCurrency(gastos);
  const saldoEl = document.getElementById('kpiSaldoValue');
  saldoEl.textContent = formatCurrency(saldo);
  saldoEl.classList.remove('text-gain', 'text-loss');
  saldoEl.classList.add(saldo >= 0 ? 'text-gain' : 'text-loss');
  document.getElementById('kpiGanhosCount').textContent = `${rows.filter(t => t.type === 'entrada').length} entrada(s)`;
  document.getElementById('kpiGastosCount').textContent = `${rows.filter(t => t.type === 'saida').length} saída(s)`;
}

// ============================================================
// RENDER: Período (breadcrumb + lista hierárquica Ano > Mês > Semana)
// ============================================================
function applyPeriodFromDataset(el) {
  state.period.year = el.dataset.year === 'all' ? 'all' : Number(el.dataset.year);
  state.period.month = el.dataset.month === 'all' ? 'all' : Number(el.dataset.month);
  state.period.week = el.dataset.week === 'all' ? 'all' : Number(el.dataset.week);
  renderPeriod();
  renderKPIs();
  renderTable();
  renderChart();
}

function renderPeriodBreadcrumb() {
  const container = document.getElementById('periodBreadcrumb');
  if (state.period.year === 'all') { container.innerHTML = ''; return; }

  const parts = [
    { label: 'Tudo', y: 'all', m: 'all', w: 'all' },
    { label: String(state.period.year), y: state.period.year, m: 'all', w: 'all' },
  ];
  if (state.period.month !== 'all') {
    parts.push({ label: MONTH_NAMES[state.period.month - 1], y: state.period.year, m: state.period.month, w: 'all' });
  }

  container.innerHTML = parts.map((p, i) => {
    const isLast = i === parts.length - 1;
    const sep = i > 0 ? '<span class="text-muted/40">›</span>' : '';
    if (isLast) return `${sep}<span class="font-semibold text-ink">${p.label}</span>`;
    return `${sep}<button type="button" class="breadcrumb-btn text-muted hover:text-gold transition-colors" data-year="${p.y}" data-month="${p.m}" data-week="${p.w}">${p.label}</button>`;
  }).join('');
}

function renderPeriodList() {
  const container = document.getElementById('periodList');
  const tiles = [];

  if (state.period.year === 'all') {
    tiles.push({ y: 'all', m: 'all', w: 'all', label: 'Tudo', sub: `${transactions.length} lançamento(s)` });
    getAvailableYears().forEach(y => {
      tiles.push({ y, m: 'all', w: 'all', label: String(y), sub: `${countTxForYear(y)} lançamento(s)` });
    });
  } else if (state.period.month === 'all') {
    const y = state.period.year;
    tiles.push({ y, m: 'all', w: 'all', label: 'Tudo', sub: `Ano ${y} completo` });
    getAvailableMonths(y).forEach(m => {
      tiles.push({ y, m, w: 'all', label: MONTH_NAMES[m - 1], sub: `${countTxForMonth(y, m)} lançamento(s)` });
    });
  } else {
    const y = state.period.year, m = state.period.month;
    const ranges = weekRangesForMonth(y, m);
    tiles.push({ y, m, w: 'all', label: 'Tudo', sub: `${MONTH_NAMES[m - 1]} completo` });
    Object.keys(ranges).map(Number).forEach(w => {
      tiles.push({ y, m, w, label: `Semana ${w}`, sub: ranges[w] });
    });
  }

  container.innerHTML = tiles.map(t => {
    const active = t.y === state.period.year && t.m === state.period.month && t.w === state.period.week;
    const cls = active
      ? 'bg-gold text-white border-gold shadow-sm'
      : 'bg-white text-ink border-[#EEECE7] hover:border-gold/50 hover:bg-goldlight/30';
    return `<button type="button" data-year="${t.y}" data-month="${t.m}" data-week="${t.w}" class="period-btn shrink-0 lg:w-full text-left px-4 py-3 rounded-xl transition-colors border ${cls}">
      <div class="text-sm font-semibold whitespace-nowrap">${t.label}</div>
      <div class="text-xs mt-0.5 whitespace-nowrap ${active ? 'text-white/80' : 'text-muted'}">${t.sub}</div>
    </button>`;
  }).join('');
}

function renderPeriod() {
  renderPeriodBreadcrumb();
  renderPeriodList();
}

// ============================================================
// RENDER: Pills (filtro rápido da tabela)
// ============================================================
function renderPills() {
  const container = document.getElementById('pillsContainer');
  const items = [
    { key: 'all', label: 'Todos' },
    { key: 'entrada', label: 'Apenas Entradas' },
    { key: 'saida', label: 'Apenas Saídas' },
  ];
  container.innerHTML = items.map(item => {
    const active = state.typeFilter === item.key;
    const cls = active ? 'bg-sidebar text-white' : 'bg-[#F0EFEC] text-ink hover:bg-[#E7E5E0]';
    return `<button data-type="${item.key}" class="pill-btn px-4 py-2 rounded-full text-xs font-semibold transition-colors ${cls}">${item.label}</button>`;
  }).join('');
}

// ============================================================
// RENDER: Chart tabs
// ============================================================
function renderChartTabs() {
  const container = document.getElementById('chartTabs');
  const items = [
    { key: 'category', label: 'Por Categoria' },
    { key: 'weekly', label: 'Evolução Semanal' },
  ];
  container.innerHTML = items.map(item => {
    const active = state.chartMode === item.key;
    const cls = active ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink';
    return `<button data-mode="${item.key}" class="chart-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${cls}">${item.label}</button>`;
  }).join('');
}

// ============================================================
// RENDER: Tabela
// ============================================================
const trashIcon = `<svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>`;
const infoIcon = `<svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="7.5" x2="12" y2="7.5"/></svg>`;

function getTableRows() {
  let rows = getFilteredRows();
  if (state.typeFilter !== 'all') rows = rows.filter(t => t.type === state.typeFilter);
  return rows.slice().sort((a, b) => b.date.localeCompare(a.date));
}

function renderTable() {
  const rows = getTableRows();
  document.getElementById('tableCount').textContent = `${rows.length} lançamento${rows.length === 1 ? '' : 's'}`;
  const tbody = document.getElementById('tableBody');

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-10 text-center text-sm text-muted">Nenhum lançamento encontrado para este filtro.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(t => {
    const catClass = CATEGORY_TAILWIND[t.category] || CATEGORY_TAILWIND['Outros'];
    const isEntrada = t.type === 'entrada';
    const noteBtn = t.notes
      ? `<button data-action="toggle-note" data-id="${t.id}" title="Ver observação" class="text-muted hover:text-gold transition-colors shrink-0">${infoIcon}</button>`
      : '';
    const noteRow = t.notes
      ? `<tr data-note-row="${t.id}" class="hidden bg-[#FAF7F0]"><td colspan="7" class="px-4 pb-3 pt-0 text-xs text-muted italic">${escapeHtml(t.notes)}</td></tr>`
      : '';
    return `
      <tr class="border-b border-[#EEECE7] hover:bg-[#FAF9F7] transition-colors" data-row-id="${t.id}">
        <td class="px-4 py-3 text-sm whitespace-nowrap tabular">${formatDate(t.date)}</td>
        <td class="px-4 py-3 text-sm">
          <div class="flex items-center gap-2">
            <span class="truncate max-w-[220px]">${escapeHtml(t.description)}</span>
            ${noteBtn}
          </div>
        </td>
        <td class="px-4 py-3 text-sm whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${catClass.bg} ${catClass.text}">${t.category}</span>
        </td>
        <td class="px-4 py-3 text-sm whitespace-nowrap">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isEntrada ? 'bg-gainbg text-gain' : 'bg-lossbg text-loss'}">
            <span class="w-1.5 h-1.5 rounded-full ${isEntrada ? 'bg-gain' : 'bg-loss'}"></span>
            ${isEntrada ? 'Entrada' : 'Saída'}
          </span>
        </td>
        <td class="px-4 py-3 text-sm font-semibold whitespace-nowrap tabular ${isEntrada ? 'text-gain' : 'text-loss'}">${isEntrada ? '+ ' : '− '}${formatCurrency(t.value)}</td>
        <td class="px-4 py-3 text-sm text-muted whitespace-nowrap">Semana ${weekOfMonth(t.date)}</td>
        <td class="px-4 py-3 text-sm text-right">
          <button data-action="delete" data-id="${t.id}" title="Excluir lançamento" class="text-muted hover:text-loss transition-colors">${trashIcon}</button>
        </td>
      </tr>
      ${noteRow}`;
  }).join('');
}

// ============================================================
// RENDER: Gráfico
// ============================================================
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw(chart) {
    if (chart.config.type !== 'doughnut' || !chart.options.plugins.centerText) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const centerX = chartArea.left + chartArea.width / 2;
    const centerY = chartArea.top + chartArea.height / 2;
    const { total, label } = chart.options.plugins.centerText;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "700 19px Sora, sans-serif";
    ctx.fillStyle = '#1F2430';
    ctx.fillText(total, centerX, centerY - 10);
    ctx.font = "500 12px Inter, sans-serif";
    ctx.fillStyle = '#6B7280';
    ctx.fillText(label, centerX, centerY + 13);
    ctx.restore();
  }
};
Chart.register(centerTextPlugin);

function renderChart() {
  const canvas = document.getElementById('mainChart');
  const emptyState = document.getElementById('chartEmptyState');
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  if (state.chartMode === 'category') {
    const rows = getFilteredRows().filter(t => t.type === 'saida');
    const totals = {};
    rows.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.value; });
    const labels = Object.keys(totals);
    const data = labels.map(l => totals[l]);
    const colors = labels.map(l => CATEGORY_HEX[l] || '#999999');
    const totalValue = data.reduce((a, b) => a + b, 0);

    if (labels.length === 0) {
      emptyState.textContent = 'Nenhum gasto registrado neste período.';
      emptyState.classList.remove('hidden');
      canvas.classList.add('hidden');
      return;
    }
    emptyState.classList.add('hidden');
    canvas.classList.remove('hidden');

    chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#ffffff', hoverOffset: 6 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle', padding: 14, font: { family: 'Inter', size: 11 } } },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${formatCurrency(c.parsed)}` } },
          centerText: { total: formatCurrency(totalValue), label: 'Total gasto' },
        }
      }
    });
    return;
  }

  // Evolução Semanal: precisa de um mês selecionado (ano + mês definidos)
  if (state.period.year === 'all' || state.period.month === 'all') {
    emptyState.textContent = 'Selecione um mês no período (ao lado) para ver a evolução semanal.';
    emptyState.classList.remove('hidden');
    canvas.classList.add('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  canvas.classList.remove('hidden');

  const y = state.period.year, m = state.period.month;
  const ranges = weekRangesForMonth(y, m);
  const weekNums = Object.keys(ranges).map(Number);
  const monthRows = transactions.filter(t => getYear(t.date) === y && getMonth(t.date) === m);
  const labels = weekNums.map(w => `Semana ${w}`);
  const ganhos = weekNums.map(w => monthRows.filter(t => weekOfMonth(t.date) === w && t.type === 'entrada').reduce((s, t) => s + t.value, 0));
  const gastos = weekNums.map(w => monthRows.filter(t => weekOfMonth(t.date) === w && t.type === 'saida').reduce((s, t) => s + t.value, 0));
  let acc = 0;
  const saldoAcumulado = ganhos.map((g, i) => { acc += (g - gastos[i]); return acc; });

  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Ganhos', data: ganhos, backgroundColor: '#2E7D57', borderRadius: 6, barPercentage: 0.55, categoryPercentage: 0.6 },
        { type: 'bar', label: 'Gastos', data: gastos, backgroundColor: '#B5453F', borderRadius: 6, barPercentage: 0.55, categoryPercentage: 0.6 },
        { type: 'line', label: 'Saldo acumulado', data: saldoAcumulado, borderColor: '#B98B4E', backgroundColor: '#B98B4E', tension: 0.35, pointRadius: 4, pointBackgroundColor: '#B98B4E' },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle', padding: 14, font: { family: 'Inter', size: 11 } } },
        tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
        y: { grid: { color: '#EEECE7' }, ticks: { callback: (v) => 'R$ ' + v, font: { family: 'Inter', size: 11 } } },
      }
    }
  });
}

// ============================================================
// RENDER ALL
// ============================================================
function renderAll() {
  renderKPIs();
  renderPeriod();
  renderPills();
  renderChartTabs();
  renderTable();
  renderChart();
}

// ============================================================
// MODAL
// ============================================================
const modal = document.getElementById('modal');
const modalPanel = modal.querySelector('.modal-panel');
const form = document.getElementById('transactionForm');

function populateCategorySelect() {
  const select = document.getElementById('fieldCategory');
  select.innerHTML = Object.keys(CATEGORY_HEX).map(c => `<option value="${c}">${c}</option>`).join('');
}

function setModalType(type) {
  modalType = type;
  const base = 'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors border';
  const entradaBtn = document.getElementById('btnTipoEntrada');
  const saidaBtn = document.getElementById('btnTipoSaida');
  entradaBtn.className = base + (type === 'entrada' ? ' bg-gain text-white border-gain' : ' bg-white text-muted border-[#E7E5E0] hover:border-gain/50');
  saidaBtn.className = base + (type === 'saida' ? ' bg-loss text-white border-loss' : ' bg-white text-muted border-[#E7E5E0] hover:border-loss/50');
}

function openModal() {
  form.reset();
  document.getElementById('fieldDate').value = new Date().toISOString().slice(0, 10);
  setModalType('saida');
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modalPanel.classList.remove('scale-95', 'opacity-0');
  setTimeout(() => document.getElementById('fieldDescription').focus(), 50);
}
function closeModal() {
  modal.classList.add('opacity-0');
  modalPanel.classList.add('scale-95', 'opacity-0');
  setTimeout(() => modal.classList.add('pointer-events-none'), 200);
}

function highlightRow(id) {
  requestAnimationFrame(() => {
    const row = document.querySelector(`[data-row-id="${id}"]`);
    if (row) {
      row.classList.add('bg-goldlight/60');
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => row.classList.remove('bg-goldlight/60'), 1800);
    }
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalLabel = submitBtn.textContent;

  const payload = {
    date: document.getElementById('fieldDate').value,
    description: document.getElementById('fieldDescription').value.trim(),
    category: document.getElementById('fieldCategory').value,
    type: modalType,
    value: parseFloat(document.getElementById('fieldValue').value),
    notes: document.getElementById('fieldNotes').value.trim(),
  };

  state.period = { year: 'all', month: 'all', week: 'all' };
  state.typeFilter = 'all';

  if (CLOUD_MODE) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando…';
    const inserted = await insertTransactionRemote(payload);
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
    if (!inserted) return;
    closeModal();
    await loadTransactions();
    highlightRow(inserted.id);
  } else {
    const newTx = { id: uid(), ...payload };
    transactions.push(newTx);
    closeModal();
    renderAll();
    highlightRow(newTx.id);
  }
});

// ============================================================
// EVENT LISTENERS
// ============================================================
document.getElementById('periodList').addEventListener('click', (e) => {
  const btn = e.target.closest('.period-btn'); if (!btn) return;
  applyPeriodFromDataset(btn);
});

document.getElementById('periodBreadcrumb').addEventListener('click', (e) => {
  const btn = e.target.closest('.breadcrumb-btn'); if (!btn) return;
  applyPeriodFromDataset(btn);
});

document.getElementById('pillsContainer').addEventListener('click', (e) => {
  const btn = e.target.closest('.pill-btn'); if (!btn) return;
  state.typeFilter = btn.dataset.type;
  renderPills(); renderTable();
});

document.getElementById('chartTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.chart-tab-btn'); if (!btn) return;
  state.chartMode = btn.dataset.mode;
  renderChartTabs(); renderChart();
});

document.getElementById('tableBody').addEventListener('click', async (e) => {
  const toggleBtn = e.target.closest('[data-action="toggle-note"]');
  if (toggleBtn) {
    const noteRow = document.querySelector(`[data-note-row="${toggleBtn.dataset.id}"]`);
    if (noteRow) noteRow.classList.toggle('hidden');
    return;
  }
  const delBtn = e.target.closest('[data-action="delete"]');
  if (delBtn) {
    const id = delBtn.dataset.id;
    if (CLOUD_MODE) {
      delBtn.disabled = true;
      const ok = await deleteTransactionRemote(id);
      if (!ok) { delBtn.disabled = false; return; }
      await loadTransactions();
    } else {
      transactions = transactions.filter(t => t.id !== id);
      renderAll();
    }
  }
});

document.getElementById('fabBtn').addEventListener('click', openModal);
document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', closeModal);
document.getElementById('btnTipoEntrada').addEventListener('click', () => setModalType('entrada'));
document.getElementById('btnTipoSaida').addEventListener('click', () => setModalType('saida'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.classList.contains('pointer-events-none')) closeModal();
});

// Sidebar mobile
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
function openSidebar() { sidebar.classList.remove('-translate-x-full'); overlay.classList.remove('hidden'); }
function closeSidebar() { sidebar.classList.add('-translate-x-full'); overlay.classList.add('hidden'); }
document.getElementById('hamburgerBtn').addEventListener('click', openSidebar);
document.getElementById('closeSidebarBtn').addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);
document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => {
  if (window.innerWidth < 1024) closeSidebar();
}));

// ============================================================
// INIT
// ============================================================
populateCategorySelect();
document.getElementById('headerSubtitle').textContent = `Resumo do seu fluxo de caixa · ${new Date().getFullYear()}`;
document.getElementById('dataScopeNote').textContent = CLOUD_MODE
  ? 'Seus lançamentos são salvos automaticamente na nuvem (Supabase) e sincronizam entre dispositivos.'
  : 'Modo demonstração: os dados ficam apenas na memória do navegador. Configure o Supabase (topo do código) para salvar na nuvem.';

if (CLOUD_MODE) {
  loadTransactions();
} else {
  renderAll();
}
