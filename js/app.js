// ============================================================
// CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE) — opcional
// ============================================================
const SUPABASE_URL = 'https://hvxjjlpzoygqdangirwc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sx5O9wDnYjiqBY1iyUDZ0w_2GO04i_k';

const CLOUD_MODE = !SUPABASE_URL.includes('COLE_AQUI') && !SUPABASE_KEY.includes('COLE_AQUI');
const db = CLOUD_MODE ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ============================================================
// AUTENTICAÇÃO
// ============================================================
let currentUser = null;   // sessão atual (null = deslogado)
let authMode = 'login';   // 'login' | 'signup'
let accountsExist = true; // otimista até checarmos; evita travar login de quem já usa o app caso a checagem falhe

function traduzirErroAuth(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('user already registered')) return 'Já existe uma conta com esse e-mail.';
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).';
  if (m.includes('unable to validate email')) return 'E-mail inválido.';
  return msg;
}

async function checkAccountsExist() {
  if (!CLOUD_MODE) return true;
  const { data, error } = await db.rpc('any_user_exists');
  if (error) {
    // Função ainda não criada no Supabase — assume que já existem contas,
    // para nunca esconder o login de quem já tem uma conta por falta dessa função.
    return true;
  }
  return !!data;
}

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab-btn').forEach(btn => {
    const active = btn.dataset.mode === mode;
    btn.classList.toggle('bg-white', active);
    btn.classList.toggle('shadow-sm', active);
    btn.classList.toggle('text-ink', active);
    btn.classList.toggle('text-muted', !active);
  });
  document.getElementById('authNameField').classList.toggle('hidden', mode !== 'signup');
  document.getElementById('authTabs').classList.toggle('hidden', !accountsExist);
  document.getElementById('authFirstRunNote').classList.toggle('hidden', accountsExist);
  const submitBtn = document.querySelector('#authForm button[type="submit"]');
  submitBtn.textContent = mode === 'signup' ? 'Criar conta' : 'Entrar';
  document.getElementById('authError').classList.add('hidden');
  document.getElementById('authSuccess').classList.add('hidden');
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('authSuccess').classList.add('hidden');
}
function showAuthSuccess(msg) {
  const el = document.getElementById('authSuccess');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('authError').classList.add('hidden');
}

async function showAuthScreen() {
  document.getElementById('appShell').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  accountsExist = await checkAccountsExist();
  setAuthMode(accountsExist ? 'login' : 'signup');
}

function updateUserUI() {
  if (!currentUser) return;
  const name = (currentUser.user_metadata && currentUser.user_metadata.full_name) || currentUser.email.split('@')[0];
  const initials = name.trim().slice(0, 2).toUpperCase();
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userName').textContent = name;
  document.getElementById('userEmail').textContent = currentUser.email;
  document.getElementById('headerGreeting').textContent = `Olá, ${name.split(' ')[0]}`;
}

async function handleAuthenticated(user) {
  currentUser = user;
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  updateUserUI();
  await loadCategories();
  populateCategorySelect();
  renderCategoryList();
  await loadTransactions();
  await loadBalanceCheck();
}

// ============================================================
// DADOS
// ============================================================
let seq = 1;
const uid = () => String(seq++);

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Categorias agora são dinâmicas e pertencem a cada usuário (tabela `categories` no Supabase).
// As listas abaixo só servem de PONTO DE PARTIDA:
//  - DEMO_CATEGORIES:              usada apenas no modo demonstração (sem Supabase configurado).
//  - DEFAULT_NEW_USER_CATEGORIES:  semeada automaticamente na primeira vez que um usuário novo entra.
const DEMO_CATEGORIES = [
  { name: 'Salário', color: '#8A661F' },
  { name: 'Vendas Benegrano', color: '#2E6B4C' },
  { name: 'Alimentação', color: '#B5653F' },
  { name: 'Moradia', color: '#4A5D80' },
  { name: 'Transporte', color: '#6C5A96' },
  { name: 'Lazer', color: '#A34C74' },
  { name: 'Assinaturas', color: '#3E7C90' },
  { name: 'Saúde', color: '#B5453F' },
  { name: 'Educação', color: '#557A55' },
  { name: 'Investimentos', color: '#8C6E2F' },
  { name: 'Insumos Benegrano', color: '#7A5A34' },
  { name: 'Outros', color: '#5A5A5A' },
];

const DEFAULT_NEW_USER_CATEGORIES = [
  { name: 'Salário', color: '#8A661F' },
  { name: 'Alimentação', color: '#B5653F' },
  { name: 'Moradia', color: '#4A5D80' },
  { name: 'Transporte', color: '#6C5A96' },
  { name: 'Lazer', color: '#A34C74' },
  { name: 'Assinaturas', color: '#3E7C90' },
  { name: 'Saúde', color: '#B5453F' },
  { name: 'Educação', color: '#557A55' },
  { name: 'Investimentos', color: '#8C6E2F' },
  { name: 'Outros', color: '#5A5A5A' },
];

let categories = [];

// Converte hex (#RRGGBB) em rgba(...) para permitir cores livres, escolhidas pelo usuário,
// nos badges de categoria (que antes usavam classes Tailwind fixas).
function hexToRgba(hex, alpha) {
  const clean = (hex || '#6B7280').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function getCategoryColor(name) {
  const found = categories.find(c => c.name === name);
  return found ? found.color : '#6B7280';
}

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
if (!CLOUD_MODE) categories = DEMO_CATEGORIES.map(c => ({ id: uid(), ...c }));

// ============================================================
// ESTADO
// ============================================================
const state = {
  period: { year: 'all', month: 'all', week: 'all' }, // drill-down: ano > mês > semana
  typeFilter: 'all',   // 'all' | 'entrada' | 'saida'
  chartMode: 'category', // 'category' | 'weekly'
  search: '',            // texto da caixa de pesquisa
  suspectsOnly: false,   // true = lista mostrando só os lançamentos suspeitos da conferência
};
let modalType = null; // nenhum tipo pré-selecionado: você precisa escolher entrada ou saída
let editingId = null; // id do lançamento em edição (null = criando um novo)
let balanceCheck = null;     // última conferência: { bank_balance, checked_at } (null = nunca conferiu)
let transactionsOk = false;  // true quando os lançamentos foram carregados com sucesso (evita alarme falso)
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
    transactionsOk = false;
    renderAll();
    return;
  }
  hideBanner();
  transactionsOk = true;
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
  const { data, error } = await db.from('transactions').delete().eq('id', id).select();
  if (error) { showBanner('error', 'Erro ao excluir na nuvem: ' + error.message); return false; }
  if (!data || data.length === 0) { showBanner('error', 'Não foi possível excluir: o lançamento não foi encontrado ou você não tem permissão.'); return false; }
  return true;
}

async function updateTransactionRemote(id, tx) {
  const { data, error } = await db.from('transactions').update({
    date: tx.date, description: tx.description, category: tx.category, type: tx.type, value: tx.value, notes: tx.notes
  }).eq('id', id).select();
  if (error) { showBanner('error', 'Erro ao salvar alterações na nuvem: ' + error.message); return false; }
  // Com as regras de segurança do Supabase, um update sem permissão não dá erro: apenas não altera nada.
  if (!data || data.length === 0) { showBanner('error', 'Não foi possível salvar: o lançamento não foi encontrado ou você não tem permissão para alterá-lo.'); return false; }
  return true;
}

// ============================================================
// CAMADA DE DADOS: CATEGORIAS
// ============================================================
function traduzirErroCategoria(msg) {
  if (/duplicate key/i.test(msg)) return 'Já existe uma categoria com esse nome.';
  return msg;
}

async function loadCategories() {
  if (!CLOUD_MODE) return; // modo demonstração já tem categorias fixas em memória

  const { data, error } = await db.from('categories').select('*').order('name', { ascending: true });
  if (error) {
    showBanner('error', 'Não foi possível carregar as categorias: ' + error.message);
    categories = [];
    return;
  }

  if (!data || data.length === 0) {
    // Primeiro acesso deste usuário: cria o conjunto padrão de categorias para ele.
    const seeds = DEFAULT_NEW_USER_CATEGORIES.map(c => ({ name: c.name, color: c.color }));
    const { data: inserted, error: seedError } = await db.from('categories').insert(seeds).select();
    if (seedError) {
      showBanner('error', 'Erro ao criar categorias padrão: ' + seedError.message);
      categories = [];
      return;
    }
    categories = inserted.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  } else {
    categories = data;
  }
}

async function addCategory(name, color) {
  if (CLOUD_MODE) {
    const { data, error } = await db.from('categories').insert([{ name, color }]).select();
    if (error) { showBanner('error', 'Erro ao adicionar categoria: ' + traduzirErroCategoria(error.message)); return false; }
    categories.push(data[0]);
  } else {
    categories.push({ id: uid(), name, color });
  }
  categories.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return true;
}

async function removeCategory(id) {
  if (CLOUD_MODE) {
    const { error } = await db.from('categories').delete().eq('id', id);
    if (error) { showBanner('error', 'Erro ao excluir categoria: ' + error.message); return false; }
  }
  categories = categories.filter(c => c.id !== id);
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

const editIcon = `<svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;

// Converte o horário do banco (ex.: "2026-10-16T21:23:45.123456+00:00") em milissegundos.
function tsMs(s) {
  if (!s) return 0;
  const ms = new Date(String(s).replace(/(\.\d{3})\d+/, '$1')).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

// ---------- PESQUISA: ignora maiúsculas/acentos, aceita pedaço da palavra e erro de digitação ----------
function normalizeText(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Distância de edição (trocar, apagar, inserir ou inverter 2 letras = 1 erro)
function editDistance(a, b) {
  const al = a.length, bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const d = Array.from({ length: al + 1 }, (_, i) => { const r = new Array(bl + 1).fill(0); r[0] = i; return r; });
  for (let j2 = 0; j2 <= bl; j2++) d[0][j2] = j2;
  for (let i = 1; i <= al; i++) {
    for (let k = 1; k <= bl; k++) {
      const cost = a[i - 1] === b[k - 1] ? 0 : 1;
      d[i][k] = Math.min(d[i - 1][k] + 1, d[i][k - 1] + 1, d[i - 1][k - 1] + cost);
      if (i > 1 && k > 1 && a[i - 1] === b[k - 2] && a[i - 2] === b[k - 1]) d[i][k] = Math.min(d[i][k], d[i - 2][k - 2] + 1);
    }
  }
  return d[al][bl];
}
// Palavras curtas aceitam menos erros (senão a pesquisa acharia coisa demais)
function maxTypos(len) { return len <= 3 ? 0 : len <= 7 ? 1 : 2; }

function scoreTextToken(token, words, haystack) {
  let best = 0;
  for (const w of words) {
    if (w === token) best = Math.max(best, 100);
    else if (w.startsWith(token)) best = Math.max(best, 80);
  }
  if (best) return best;
  if (token.length >= 2 && haystack.includes(token)) return 60;
  const tol = maxTypos(token.length);
  if (tol > 0) {
    for (const w of words) {
      const dist = editDistance(token, w);
      if (dist <= tol) best = Math.max(best, 45 - dist * 5);
      else if (w.length > token.length) {
        const distPrefix = editDistance(token, w.slice(0, token.length)); // digitou só o começo, com erro
        if (distPrefix <= tol) best = Math.max(best, 30 - distPrefix * 5);
      }
    }
  }
  return best;
}

function parseDateToken(tok) {
  let m = tok.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
  if (m) {
    const day = +m[1], month = +m[2];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { day, month, year: m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null };
  }
  m = tok.match(/^(\d{1,2})\/(\d{4})$/); // mês/ano, ex.: 10/2026
  if (m && +m[1] >= 1 && +m[1] <= 12) return { day: null, month: +m[1], year: +m[2] };
  return null;
}

function parseValueToken(tok) {
  if (!/^\d[\d.,]*$/.test(tok)) return null;
  const cents = parsePastedToCents(tok); // "50" = R$ 50,00 · "50,5" = R$ 50,50 · "1.234,56"
  return Number.isNaN(cents) ? null : cents;
}

function parseSearchQuery(q) {
  const raw = String(q).toLowerCase().replace(/r\$\s*/g, '').trim();
  const tokens = [];
  for (const tok of raw.split(/\s+/).filter(Boolean)) {
    const date = parseDateToken(tok);
    if (date) { tokens.push({ kind: 'date', ...date }); continue; }
    const cents = parseValueToken(tok);
    if (cents !== null) { tokens.push({ kind: 'value', cents, digits: tok.replace(/\D/g, '') }); continue; }
    for (const word of normalizeText(tok).split(' ').filter(Boolean)) tokens.push({ kind: 'text', text: word });
  }
  return tokens;
}

function searchScore(tx, tokens) {
  const words = normalizeText(tx.description + ' ' + tx.category).split(' ').filter(Boolean);
  const haystack = words.join(' ');
  let total = 0;
  for (const tk of tokens) {
    let s = 0;
    if (tk.kind === 'date') {
      const ok = (tk.day === null || tk.day === getDay(tx.date)) && tk.month === getMonth(tx.date) && (tk.year === null || tk.year === getYear(tx.date));
      s = ok ? 100 : 0;
    } else if (tk.kind === 'value') {
      s = toCents(tx.value) === tk.cents ? 100 : (tk.digits && haystack.includes(tk.digits) ? 60 : 0);
    } else {
      s = scoreTextToken(tk.text, words, haystack);
    }
    if (!s) return 0; // todas as palavras digitadas precisam combinar
    total += s;
  }
  return total;
}

// ---------- SUSPEITOS da conferência de saldo ----------
// diferença = saldo do site − saldo do banco (em centavos). Procura lançamentos que explicariam a diferença:
//  - valor igual à diferença (duplicado ou lançado a mais);
//  - metade da diferença com o tipo trocado (trocar entrada/saída muda o saldo pelo DOBRO do valor).
function getSuspectMap() {
  const map = new Map();
  if (CLOUD_MODE && !transactionsOk) return map;
  const res = computeBalanceCheck();
  if (!res || res.diffCents === 0) return map;
  const diff = res.diffCents;
  for (const t of transactions) {
    const s = signedCents(t);
    if (s === diff) map.set(t.id, 'Valor igual à diferença: pode estar duplicado ou lançado a mais.');
    else if (diff % 2 === 0 && s === diff / 2) map.set(t.id, 'Pode estar com o tipo trocado (seria ' + (t.type === 'entrada' ? 'uma saída' : 'uma entrada') + ').');
  }
  return map;
}

function clearSearch() {
  state.search = '';
  state.suspectsOnly = false;
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  const clr = document.getElementById('searchClearBtn');
  if (clr) clr.classList.add('hidden');
}

function getTableRows() {
  const order = new Map(transactions.map((t, i) => [t.id, i]));
  const byDefault = (a, b) =>
    b.date.localeCompare(a.date) ||             // dia mais recente primeiro
    tsMs(b.created_at) - tsMs(a.created_at) ||  // no mesmo dia: o último lançamento salvo fica no topo
    order.get(b.id) - order.get(a.id);          // empate total: mantém a ordem de carregamento

  if (state.suspectsOnly) {
    const suspects = getSuspectMap();
    if (suspects.size > 0) return transactions.filter(t => suspects.has(t.id)).sort(byDefault);
    state.suspectsOnly = false; // a diferença foi resolvida
  }

  const tokens = state.search.trim() ? parseSearchQuery(state.search) : [];
  if (tokens.length) {
    // Pesquisando: procura em TODOS os períodos (respeita só o filtro de entradas/saídas), mais certo primeiro
    let base = transactions;
    if (state.typeFilter !== 'all') base = base.filter(t => t.type === state.typeFilter);
    return base.map(t => ({ t, s: searchScore(t, tokens) })).filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s || byDefault(a.t, b.t)).map(x => x.t);
  }

  let rows = getFilteredRows();
  if (state.typeFilter !== 'all') rows = rows.filter(t => t.type === state.typeFilter);
  return rows.slice().sort(byDefault);
}

function renderSearchSummary(rows) {
  const el = document.getElementById('searchSummary');
  const q = state.search.trim();
  const searching = q && parseSearchQuery(q).length > 0;
  const plural = (n, a, b) => n === 1 ? a : b;
  if (state.suspectsOnly) {
    el.innerHTML = `<span>Mostrando <strong>${rows.length}</strong> ${plural(rows.length, 'lançamento suspeito', 'lançamentos suspeitos')} da conferência (todos os períodos).</span>` +
      `<button type="button" id="suspectsBackBtn" class="px-3 py-1 rounded-full bg-sidebar text-white font-semibold hover:brightness-110 transition-all">Voltar à lista</button>`;
  } else if (searching) {
    const ent = rows.filter(t => t.type === 'entrada').reduce((s, t) => s + toCents(t.value), 0);
    const sai = rows.filter(t => t.type === 'saida').reduce((s, t) => s + toCents(t.value), 0);
    el.innerHTML = `<span>Pesquisa por <strong>“${escapeHtml(q)}”</strong> em todos os períodos: <strong>${rows.length}</strong> ${plural(rows.length, 'encontrado', 'encontrados')}</span>` +
      `<span class="text-muted tabular">Entradas ${formatCurrency(ent / 100)} · Saídas ${formatCurrency(sai / 100)}</span>`;
  } else {
    el.classList.add('hidden'); el.classList.remove('flex');
    return;
  }
  el.classList.remove('hidden'); el.classList.add('flex');
}

function renderTable() {
  const rows = getTableRows();
  document.getElementById('tableCount').textContent = `${rows.length} lançamento${rows.length === 1 ? '' : 's'}`;
  renderSearchSummary(rows);
  const suspects = getSuspectMap();
  const tbody = document.getElementById('tableBody');

  if (rows.length === 0) {
    const msg = state.search.trim() ? `Nenhum lançamento encontrado para “${escapeHtml(state.search.trim())}”.` : 'Nenhum lançamento encontrado para este filtro.';
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-10 text-center text-sm text-muted">${msg}</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(t => {
    const catColor = getCategoryColor(t.category);
    const catStyle = `background-color:${hexToRgba(catColor, 0.14)}; color:${catColor};`;
    const isEntrada = t.type === 'entrada';
    const suspectBadge = suspects.has(t.id)
      ? `<span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800" title="${escapeHtml(suspects.get(t.id))}">suspeito</span>`
      : '';
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
            ${suspectBadge}
            ${noteBtn}
          </div>
        </td>
        <td class="px-4 py-3 text-sm whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style="${catStyle}">${escapeHtml(t.category)}</span>
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
          <button data-action="edit" data-id="${t.id}" title="Editar lançamento" aria-label="Editar lançamento" class="text-muted hover:text-gold transition-colors">${editIcon}</button>
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
    const colors = labels.map(l => getCategoryColor(l));
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
  renderBalanceStatus();
}

// ============================================================
// MODAL
// ============================================================
const modal = document.getElementById('modal');
const modalPanel = modal.querySelector('.modal-panel');
const form = document.getElementById('transactionForm');

function populateCategorySelect() {
  const select = document.getElementById('fieldCategory');
  select.innerHTML = categories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
}

function renderCategoryList() {
  const container = document.getElementById('categoryList');
  const emptyState = document.getElementById('categoryEmptyState');
  if (categories.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  container.innerHTML = categories.map(c => `
    <div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-[#EEECE7]">
      <span class="w-3 h-3 rounded-full shrink-0" style="background-color:${c.color};"></span>
      <span class="text-sm truncate flex-1">${escapeHtml(c.name)}</span>
      <button type="button" data-action="delete-category" data-id="${c.id}" data-name="${escapeHtml(c.name)}" title="Excluir categoria" class="text-muted hover:text-loss transition-colors shrink-0">${trashIcon}</button>
    </div>
  `).join('');
}

function setModalType(type) {
  modalType = type;
  const base = 'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors border';
  const entradaBtn = document.getElementById('btnTipoEntrada');
  const saidaBtn = document.getElementById('btnTipoSaida');
  entradaBtn.className = base + (type === 'entrada' ? ' bg-gain text-white border-gain' : ' bg-white text-muted border-[#E7E5E0] hover:border-gain/50');
  saidaBtn.className = base + (type === 'saida' ? ' bg-loss text-white border-loss' : ' bg-white text-muted border-[#E7E5E0] hover:border-loss/50');
  updateFormState();
}

// ---------- Campo de valor: os 2 últimos dígitos são sempre centavos ----------
const fieldValue = document.getElementById('fieldValue');
const MAX_CENTS = 999999999999; // 12 dígitos
let valueCents = 0; // valor em centavos inteiros (sem arredondamento)

function formatBRL(cents) {
  return 'R$ ' + (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function setValueCents(cents) {
  valueCents = Math.max(0, Math.min(cents, MAX_CENTS));
  fieldValue.value = valueCents > 0 ? formatBRL(valueCents) : '';
  updateFormState();
}

// Valor colado (ex.: "R$ 1.234,56" copiado do banco): respeita a vírgula/ponto dos centavos.
function parsePastedToCents(text) {
  const cleaned = String(text).replace(/[^\d.,]/g, '');
  if (!cleaned) return NaN;
  const m = cleaned.match(/^(.*)[.,](\d{1,2})$/);
  if (m) return parseInt((m[1].replace(/\D/g, '') || '0') + m[2].padEnd(2, '0'), 10);
  return parseInt(cleaned.replace(/\D/g, ''), 10) * 100; // sem centavos: tratado como reais inteiros
}

fieldValue.addEventListener('input', () => {
  const digits = fieldValue.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12);
  setValueCents(digits ? parseInt(digits, 10) : 0);
});
fieldValue.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text');
  const cents = parsePastedToCents(text);
  if (!Number.isNaN(cents)) setValueCents(cents);
});

// ---------- Data por extenso e estado do botão Salvar ----------
function formatDateLong(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function updateFormState() {
  const date = document.getElementById('fieldDate').value;
  document.getElementById('dateLong').textContent = formatDateLong(date);

  const missing = [];
  if (!modalType) missing.push('tipo (entrada ou saída)');
  if (!date) missing.push('data');
  if (valueCents <= 0) missing.push('valor');
  const ok = missing.length === 0;

  const btn = document.getElementById('modalSubmitBtn');
  const base = 'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ';
  btn.disabled = !ok;
  if (ok) {
    btn.className = base + 'text-white hover:brightness-95 ' + (modalType === 'entrada' ? 'bg-gain' : 'bg-loss');
    btn.textContent = editingId ? 'Salvar alterações' : (modalType === 'entrada' ? 'Salvar entrada' : 'Salvar saída');
  } else {
    btn.className = base + 'text-white/80 bg-[#C9C6BE] cursor-not-allowed';
    btn.textContent = editingId ? 'Salvar alterações' : 'Salvar lançamento';
  }
  const pending = document.getElementById('formPending');
  pending.className = 'text-xs text-muted text-center min-h-[1rem]';
  pending.textContent = ok ? '' : 'Falta preencher: ' + missing.join(', ');
}

function showFormError(msg) {
  const pending = document.getElementById('formPending');
  pending.className = 'text-xs text-loss font-medium text-center min-h-[1rem]';
  pending.textContent = msg;
}

function resetDeleteConfirm() {
  document.getElementById('deleteTriggerBtn').classList.remove('hidden');
  document.getElementById('deleteConfirm').classList.add('hidden');
}

// openModal()    -> novo lançamento (tudo vazio)
// openModal(tx)  -> editar o lançamento tx (campos já preenchidos)
function openModal(tx) {
  editingId = tx ? tx.id : null;
  form.reset();           // data e valor começam vazios
  valueCents = 0;
  populateCategorySelect(); // refaz a lista (remove categoria temporária de uma edição anterior)
  document.getElementById('modalTitle').textContent = tx ? 'Editar lançamento' : 'Novo lançamento';
  document.getElementById('deleteArea').classList.toggle('hidden', !tx);
  resetDeleteConfirm();

  if (tx) {
    const select = document.getElementById('fieldCategory');
    if (![...select.options].some(o => o.value === tx.category)) {
      select.add(new Option(tx.category, tx.category)); // categoria que foi excluída depois: mantém a do lançamento
    }
    document.getElementById('fieldDescription').value = tx.description;
    document.getElementById('fieldDate').value = tx.date;
    select.value = tx.category;
    document.getElementById('fieldNotes').value = tx.notes || '';
    setValueCents(Math.round(tx.value * 100));
    setModalType(tx.type);
  } else {
    setModalType(null);   // nenhum tipo marcado (também atualiza o botão Salvar)
  }

  modal.classList.remove('opacity-0', 'pointer-events-none');
  modalPanel.classList.remove('scale-95', 'opacity-0');
  if (!tx) setTimeout(() => document.getElementById('fieldDescription').focus(), 50);
}
function closeModal() {
  modal.classList.add('opacity-0');
  modalPanel.classList.add('scale-95', 'opacity-0');
  setTimeout(() => modal.classList.add('pointer-events-none'), 200);
}

// Se o filtro atual esconde o lançamento que acabou de ser editado, limpa os filtros para você ver o resultado.
function ensureRowVisible(id) {
  if (state.suspectsOnly && getSuspectMap().size > 0) return; // continua na lista de suspeitos
  if (!getTableRows().some(t => t.id === id)) {
    state.period = { year: 'all', month: 'all', week: 'all' };
    state.typeFilter = 'all';
    clearSearch();
    renderAll();
  }
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
  if (!modalType || valueCents <= 0) { updateFormState(); return; } // trava extra: tipo e valor são obrigatórios
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalLabel = submitBtn.textContent;

  const payload = {
    date: document.getElementById('fieldDate').value,
    description: document.getElementById('fieldDescription').value.trim(),
    category: document.getElementById('fieldCategory').value,
    type: modalType,
    value: valueCents / 100, // vem de centavos inteiros, sem arredondar
    notes: document.getElementById('fieldNotes').value.trim(),
  };

  // ----- Editando um lançamento existente -----
  if (editingId) {
    const id = editingId;
    if (CLOUD_MODE) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando…';
      const ok = await updateTransactionRemote(id, payload);
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
      if (!ok) { showFormError('Não foi possível salvar as alterações. Veja o aviso no topo da página.'); return; }
      closeModal();
      await loadTransactions();
    } else {
      transactions = transactions.map(t => t.id === id ? { ...t, ...payload } : t);
      closeModal();
      renderAll();
    }
    ensureRowVisible(id);
    highlightRow(id);
    return;
  }

  state.period = { year: 'all', month: 'all', week: 'all' };
  state.typeFilter = 'all';
  clearSearch();

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
    const newTx = { id: uid(), created_at: new Date().toISOString(), ...payload };
    transactions.push(newTx);
    closeModal();
    renderAll();
    highlightRow(newTx.id);
  }
});

// ============================================================
// CONFERÊNCIA DE SALDO
// ============================================================
// Como funciona (tudo em centavos inteiros, sem arredondar):
//  - saldo do site  = soma de TODOS os lançamentos (entradas − saídas), de todos os períodos;
//  - saldo do banco = valor que você digitou na conferência + os lançamentos salvos DEPOIS dela
//    (um lançamento novo mexe nos dois lados, então a diferença não muda);
//  - editar ou excluir mexe só no saldo do site, então a diferença aparece até você corrigir.
const toCents = v => Math.round(Number(v) * 100);
const signedCents = t => (t.type === 'entrada' ? 1 : -1) * toCents(t.value);

function siteTotalCents() {
  return transactions.reduce((sum, t) => sum + signedCents(t), 0);
}

function computeBalanceCheck() {
  if (!balanceCheck) return null;
  const checkedMs = tsMs(balanceCheck.checked_at);
  let site = 0, movedSince = 0;
  for (const t of transactions) {
    const s = signedCents(t);
    site += s;
    if (checkedMs > 0 && tsMs(t.created_at) > checkedMs) movedSince += s;
  }
  const bank = toCents(balanceCheck.bank_balance) + movedSince;
  return { siteCents: site, bankCents: bank, diffCents: site - bank };
}

function formatCheckedAt(iso) {
  const ms = tsMs(iso);
  if (!ms) return '';
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} às ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function renderBalanceStatus() {
  const banner = document.getElementById('balanceBanner');
  const okPill = document.getElementById('balanceOk');
  const reliable = !CLOUD_MODE || transactionsOk;   // não compara se os lançamentos não carregaram
  const res = reliable ? computeBalanceCheck() : null;

  if (!res) {
    banner.classList.add('hidden');
    okPill.classList.add('hidden'); okPill.classList.remove('inline-flex');
    return;
  }
  const when = formatCheckedAt(balanceCheck.checked_at);
  if (res.diffCents === 0) {
    banner.classList.add('hidden');
    okPill.innerHTML = 'Conferido ✓' + (when ? `<span class="hidden sm:inline font-normal">&nbsp;· ${when}</span>` : '');
    okPill.title = 'O saldo do site bate com o banco (última conferência: ' + when + ')';
    okPill.classList.remove('hidden'); okPill.classList.add('inline-flex');
  } else {
    okPill.classList.add('hidden'); okPill.classList.remove('inline-flex');
    const more = res.diffCents > 0;
    document.getElementById('balanceBannerTitle').textContent =
      `O saldo do site está ${formatCurrency(Math.abs(res.diffCents) / 100)} a ${more ? 'mais' : 'menos'} que o banco.`;
    const nSus = getSuspectMap().size;
    document.getElementById('balanceBannerSub').textContent = nSus > 0
      ? `Conferido em ${when}. ${nSus} ${nSus === 1 ? 'lançamento suspeito marcado' : 'lançamentos suspeitos marcados'} na lista. Corrija pelo botão de lápis.`
      : `Conferido em ${when}. Nenhum lançamento suspeito óbvio: use “Conferir por dia” para achar onde a conta se afastou.`;
    const susBtn = document.getElementById('balanceSuspectsBtn');
    susBtn.textContent = `Ver suspeitos (${nSus})`;
    susBtn.classList.toggle('hidden', nSus === 0);
    banner.classList.remove('hidden');
  }
}

async function loadBalanceCheck() {
  balanceCheck = null;
  if (CLOUD_MODE) {
    const { data, error } = await db.from('balance_checks').select('*').maybeSingle();
    if (error) console.warn('Conferência de saldo indisponível:', error.message); // ex.: tabela ainda não criada
    else if (data) balanceCheck = { bank_balance: Number(data.bank_balance), checked_at: data.checked_at };
  }
  renderTable();
  renderBalanceStatus();
}

function traduzirErroConferencia(error) {
  const msg = (error && error.message) || '';
  if ((error && error.code === 'PGRST205') || /schema cache|does not exist/i.test(msg)) {
    return 'A tabela da conferência ainda não foi criada no Supabase. Rode o comando SQL do Passo 3 e tente de novo.';
  }
  return 'Não foi possível salvar a conferência: ' + msg;
}

// ---------- Janela "Conferir saldo" ----------
const balanceModal = document.getElementById('balanceModal');
const balancePanel = balanceModal.querySelector('.modal-panel');
const balanceForm = document.getElementById('balanceForm');
const fieldBank = document.getElementById('fieldBankBalance');
let bankCents = 0;

function updateBalanceForm() {
  const btn = document.getElementById('balanceSubmitBtn');
  const ok = bankCents > 0;
  btn.disabled = !ok;
  btn.className = 'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ' +
    (ok ? 'text-white bg-gold hover:brightness-95' : 'text-white/80 bg-[#C9C6BE] cursor-not-allowed');
}
function setBankCents(cents) {
  bankCents = Math.max(0, Math.min(cents, MAX_CENTS));
  fieldBank.value = bankCents > 0 ? formatBRL(bankCents) : '';
  document.getElementById('balanceMsg').className = 'text-xs text-muted min-h-[1rem]';
  document.getElementById('balanceMsg').textContent = '';
  updateBalanceForm();
}
fieldBank.addEventListener('input', () => {
  const digits = fieldBank.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12);
  setBankCents(digits ? parseInt(digits, 10) : 0);
});
fieldBank.addEventListener('paste', (e) => {
  e.preventDefault();
  const cents = parsePastedToCents((e.clipboardData || window.clipboardData).getData('text'));
  if (!Number.isNaN(cents)) setBankCents(cents);
});

function openBalanceModal() {
  balanceForm.reset();
  setBankCents(0);
  document.getElementById('balanceSiteLine').textContent =
    'Saldo do site agora (todos os períodos): ' + formatCurrency(siteTotalCents() / 100);
  resetDayCheck();
  balanceModal.classList.remove('opacity-0', 'pointer-events-none');
  balancePanel.classList.remove('scale-95', 'opacity-0');
  setTimeout(() => fieldBank.focus(), 50);
}
function closeBalanceModal() {
  balanceModal.classList.add('opacity-0');
  balancePanel.classList.add('scale-95', 'opacity-0');
  setTimeout(() => balanceModal.classList.add('pointer-events-none'), 200);
}
function showBalanceError(msg) {
  const el = document.getElementById('balanceMsg');
  el.className = 'text-xs text-loss font-medium min-h-[1rem]';
  el.textContent = msg;
}

balanceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (bankCents <= 0) return;
  const btn = document.getElementById('balanceSubmitBtn');
  if (CLOUD_MODE) {
    btn.disabled = true;
    btn.textContent = 'Conferindo…';
    // O horário (checked_at) é gravado pelo próprio banco, no mesmo relógio do created_at dos lançamentos.
    const { data, error } = await db.from('balance_checks')
      .upsert({ user_id: currentUser.id, bank_balance: bankCents / 100 }, { onConflict: 'user_id' })
      .select().single();
    btn.textContent = 'Conferir';
    updateBalanceForm();
    if (error) { showBalanceError(traduzirErroConferencia(error)); return; }
    balanceCheck = { bank_balance: Number(data.bank_balance), checked_at: data.checked_at };
  } else {
    balanceCheck = { bank_balance: bankCents / 100, checked_at: new Date().toISOString() };
  }
  closeBalanceModal();
  renderTable();
  renderBalanceStatus();
});

document.getElementById('checkBalanceBtn').addEventListener('click', openBalanceModal);
document.getElementById('balanceRecheckBtn').addEventListener('click', openBalanceModal);
document.getElementById('balanceCloseBtn').addEventListener('click', closeBalanceModal);
document.getElementById('balanceCancelBtn').addEventListener('click', closeBalanceModal);
document.getElementById('balanceBackdrop').addEventListener('click', closeBalanceModal);

// ---------- Conferir por dia (só consulta, não grava nada) ----------
function makeMoneyMask(input, onChange) {
  let cents = 0;
  const set = (c) => {
    cents = Math.max(0, Math.min(c, MAX_CENTS));
    input.value = cents > 0 ? formatBRL(cents) : '';
    onChange(cents);
  };
  input.addEventListener('input', () => {
    const digits = input.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12);
    set(digits ? parseInt(digits, 10) : 0);
  });
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const c = parsePastedToCents((e.clipboardData || window.clipboardData).getData('text'));
    if (!Number.isNaN(c)) set(c);
  });
  return { get: () => cents, set };
}

const dayDateInput = document.getElementById('dayDate');
const dayCompareBtn = document.getElementById('dayCompareBtn');
const dayResult = document.getElementById('dayResult');

function updateDayForm() {
  const ok = !!dayDateInput.value && dayMask.get() > 0;
  dayCompareBtn.disabled = !ok;
  dayCompareBtn.className = 'mt-3 w-full py-2 rounded-xl text-sm font-semibold transition-all ' +
    (ok ? 'text-white bg-gold hover:brightness-95' : 'text-white/80 bg-[#C9C6BE] cursor-not-allowed');
  dayResult.textContent = '';
}
const dayMask = makeMoneyMask(document.getElementById('dayBank'), updateDayForm);
dayDateInput.addEventListener('input', updateDayForm);
dayDateInput.addEventListener('change', updateDayForm);

function resetDayCheck() {
  document.getElementById('dayCheck').open = false;
  dayDateInput.value = '';
  dayMask.set(0);
}

dayCompareBtn.addEventListener('click', () => {
  const date = dayDateInput.value, bank = dayMask.get();
  if (!date || bank <= 0) return;
  if (CLOUD_MODE && !transactionsOk) {
    dayResult.className = 'text-sm mt-3 min-h-[1rem] text-loss font-medium';
    dayResult.textContent = 'Os lançamentos não carregaram. Atualize a página e tente de novo.';
    return;
  }
  const site = transactions.reduce((sum, t) => t.date <= date ? sum + signedCents(t) : sum, 0);
  const diff = site - bank;
  const dataBr = formatDate(date);
  if (diff === 0) {
    dayResult.className = 'text-sm mt-3 min-h-[1rem] text-gain font-medium';
    dayResult.textContent = `✓ Até ${dataBr} o site soma ${formatCurrency(site / 100)} e bate com o banco. Se houver erro, ele está depois dessa data.`;
  } else {
    dayResult.className = 'text-sm mt-3 min-h-[1rem] text-loss font-medium';
    dayResult.textContent = `Até ${dataBr} o site soma ${formatCurrency(site / 100)} e o banco mostrava ${formatCurrency(bank / 100)}: ` +
      `${formatCurrency(Math.abs(diff) / 100)} a ${diff > 0 ? 'mais' : 'menos'} no site. O erro está nessa data ou antes dela. Tente uma data anterior.`;
  }
});

// ---------- Eventos: suspeitos e pesquisa ----------
document.getElementById('balanceSuspectsBtn').addEventListener('click', () => {
  clearSearch();
  state.suspectsOnly = true;
  renderTable();
  document.getElementById('tableSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.getElementById('searchSummary').addEventListener('click', (e) => {
  if (e.target.closest('#suspectsBackBtn')) { state.suspectsOnly = false; renderTable(); }
});

const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', () => {
  state.search = searchInput.value;
  state.suspectsOnly = false; // pesquisar assume o lugar da lista de suspeitos
  document.getElementById('searchClearBtn').classList.toggle('hidden', !searchInput.value);
  renderTable();
});
document.getElementById('searchClearBtn').addEventListener('click', () => {
  clearSearch();
  renderTable();
  searchInput.focus();
});

// ============================================================
// EVENT LISTENERS: AUTENTICAÇÃO
// ============================================================
document.getElementById('authTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.auth-tab-btn');
  if (!btn) return;
  setAuthMode(btn.dataset.mode);
});

document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalLabel = submitBtn.textContent;
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const name = document.getElementById('authName').value.trim();

  document.getElementById('authError').classList.add('hidden');
  document.getElementById('authSuccess').classList.add('hidden');

  if (!CLOUD_MODE) { showAuthError('Configure o Supabase (topo do código) para usar login.'); return; }

  if (authMode === 'signup') {
    if (!name) { showAuthError('Informe seu nome.'); return; }

    submitBtn.disabled = true; submitBtn.textContent = 'Criando conta…';
    const { data, error } = await db.auth.signUp({ email, password, options: { data: { full_name: name } } });
    submitBtn.disabled = false; submitBtn.textContent = originalLabel;

    if (error) { showAuthError(traduzirErroAuth(error.message)); return; }

    if (data.session) {
      await handleAuthenticated(data.user);
    } else {
      showAuthSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.');
      document.getElementById('authForm').reset();
      setAuthMode('login');
    }
  } else {
    submitBtn.disabled = true; submitBtn.textContent = 'Entrando…';
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    submitBtn.disabled = false; submitBtn.textContent = originalLabel;

    if (error) { showAuthError(traduzirErroAuth(error.message)); return; }
    await handleAuthenticated(data.user);
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (CLOUD_MODE) await db.auth.signOut();
  currentUser = null;
  transactions = [];
  categories = [];
  balanceCheck = null;
  transactionsOk = false;
  document.getElementById('authForm').reset();
  showAuthScreen();
});

// ============================================================
// EVENT LISTENERS: CATEGORIAS (Configurações)
// ============================================================
document.getElementById('categoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('categoryName');
  const colorInput = document.getElementById('categoryColor');
  const name = nameInput.value.trim();
  const color = colorInput.value;
  if (!name) return;

  const submitBtn = document.getElementById('categorySubmitBtn');
  submitBtn.disabled = true;
  const ok = await addCategory(name, color);
  submitBtn.disabled = false;
  if (!ok) return;

  nameInput.value = '';
  colorInput.value = '#6B7280';
  populateCategorySelect();
  renderCategoryList();
  renderChart();
});

document.getElementById('categoryList').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action="delete-category"]');
  if (!btn) return;
  const id = btn.dataset.id;
  const name = btn.dataset.name;
  const usageCount = transactions.filter(t => t.category === name).length;

  if (usageCount > 0) {
    const confirmed = confirm(`"${name}" está sendo usada em ${usageCount} lançamento(s). Os lançamentos existentes manterão essa categoria no histórico, mas ela deixará de aparecer para novos lançamentos. Deseja excluir mesmo assim?`);
    if (!confirmed) return;
  }

  btn.disabled = true;
  const ok = await removeCategory(id);
  if (!ok) { btn.disabled = false; return; }
  populateCategorySelect();
  renderCategoryList();
  renderTable();
  renderChart();
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
  const editBtn = e.target.closest('[data-action="edit"]');
  if (editBtn) {
    const tx = transactions.find(t => String(t.id) === editBtn.dataset.id);
    if (tx) openModal(tx);
  }
});

document.getElementById('fabBtn').addEventListener('click', () => openModal());
document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', closeModal);
document.getElementById('btnTipoEntrada').addEventListener('click', () => setModalType('entrada'));
document.getElementById('btnTipoSaida').addEventListener('click', () => setModalType('saida'));
document.getElementById('deleteTriggerBtn').addEventListener('click', () => {
  document.getElementById('deleteTriggerBtn').classList.add('hidden');
  document.getElementById('deleteConfirm').classList.remove('hidden');
});
document.getElementById('deleteCancelBtn').addEventListener('click', resetDeleteConfirm);
document.getElementById('deleteConfirmBtn').addEventListener('click', async () => {
  const id = editingId;
  if (!id) return;
  const btn = document.getElementById('deleteConfirmBtn');
  if (CLOUD_MODE) {
    btn.disabled = true;
    btn.textContent = 'Excluindo…';
    const ok = await deleteTransactionRemote(id);
    btn.disabled = false;
    btn.textContent = 'Sim, excluir';
    if (!ok) { showFormError('Não foi possível excluir. Veja o aviso no topo da página.'); return; }
    closeModal();
    await loadTransactions();
  } else {
    transactions = transactions.filter(t => String(t.id) !== String(id));
    closeModal();
    renderAll();
  }
});
document.getElementById('fieldDate').addEventListener('input', updateFormState);
document.getElementById('fieldDate').addEventListener('change', updateFormState);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.classList.contains('pointer-events-none')) closeModal();
  if (e.key === 'Escape' && !balanceModal.classList.contains('pointer-events-none')) closeBalanceModal();
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
document.getElementById('headerSubtitle').textContent = `Resumo do seu fluxo de caixa · ${new Date().getFullYear()}`;
document.getElementById('dataScopeNote').textContent = CLOUD_MODE
  ? 'Seus lançamentos são salvos automaticamente na nuvem (Supabase) e ficam visíveis apenas para a sua conta.'
  : 'Modo demonstração: os dados ficam apenas na memória do navegador. Configure o Supabase (topo do código) para salvar na nuvem com login multiusuário.';

async function init() {
  if (!CLOUD_MODE) {
    // Sem Supabase configurado: pula o login e usa dados de demonstração em memória.
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
    populateCategorySelect();
    renderCategoryList();
    renderAll();
    return;
  }

  const { data: { session } } = await db.auth.getSession();
  if (session && session.user) {
    await handleAuthenticated(session.user);
  } else {
    await showAuthScreen();
  }

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      currentUser = null;
      transactions = [];
      categories = [];
      balanceCheck = null;
      transactionsOk = false;
      showAuthScreen();
    }
  });
}

init();
