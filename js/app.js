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
  await loadInvestments();
  renderInvestmentsList();
  switchView('dashboard');
  await loadTransactions();
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

// Investimentos: cada item tem uma taxa de rendimento e uma lista de aportes.
// O valor atual de cada aporte é sempre CALCULADO na hora (juros compostos), nunca armazenado.
let investments = [];
if (!CLOUD_MODE) {
  investments = [
    {
      id: uid(), name: 'CDB Banco Demo', rate_type: 'monthly', rate_value: 0.9,
      contributions: [
        { id: uid(), amount: 1000, date: '2026-01-15' },
        { id: uid(), amount: 500, date: '2026-04-10' },
      ],
    },
  ];
}

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
// CAMADA DE DADOS E CÁLCULO: INVESTIMENTOS
// ============================================================

// Converte a taxa cadastrada (mensal ou anual) numa taxa mensal equivalente.
function monthlyRateOf(inv) {
  return inv.rate_type === 'annual' ? Math.pow(1 + inv.rate_value / 100, 1 / 12) - 1 : inv.rate_value / 100;
}

// Valor atual de UM aporte, rendendo juros compostos dia a dia desde a data em que entrou.
function currentValueOfContribution(amount, monthlyRate, startDate, asOf = new Date()) {
  const dailyRate = Math.pow(1 + monthlyRate, 1 / 30.4368) - 1; // 30.4368 = média de dias por mês
  const start = new Date(startDate + 'T00:00:00');
  const days = Math.max(0, (asOf - start) / 86400000);
  return amount * Math.pow(1 + dailyRate, days);
}

// Soma de todos os aportes de um investimento: quanto entrou vs. quanto vale agora.
function investmentTotals(inv) {
  const monthlyRate = monthlyRateOf(inv);
  const aportado = inv.contributions.reduce((s, c) => s + c.amount, 0);
  const atual = inv.contributions.reduce((s, c) => s + currentValueOfContribution(c.amount, monthlyRate, c.date), 0);
  return { aportado, atual, rendimento: atual - aportado };
}

// Previsão: "se eu deixar mais X meses, deve valer aproximadamente..."
function projectedValue(inv, months) {
  const { atual } = investmentTotals(inv);
  return atual * Math.pow(1 + monthlyRateOf(inv), months);
}

async function loadInvestments() {
  if (!CLOUD_MODE) return; // modo demonstração já tem investimentos fixos em memória

  const { data: invData, error: invError } = await db.from('investments').select('*').order('created_at', { ascending: true });
  if (invError) { showBanner('error', 'Não foi possível carregar os investimentos: ' + invError.message); investments = []; return; }

  const { data: contribData, error: contribError } = await db.from('investment_contributions').select('*');
  if (contribError) { showBanner('error', 'Não foi possível carregar os aportes: ' + contribError.message); investments = []; return; }

  investments = (invData || []).map(inv => ({
    ...inv,
    rate_value: Number(inv.rate_value),
    contributions: (contribData || [])
      .filter(c => c.investment_id === inv.id)
      .map(c => ({ ...c, amount: Number(c.amount) })),
  }));
}

async function addInvestment(name, rateType, rateValue) {
  if (CLOUD_MODE) {
    const { data, error } = await db.from('investments').insert([{ name, rate_type: rateType, rate_value: rateValue }]).select();
    if (error) { showBanner('error', 'Erro ao adicionar investimento: ' + error.message); return false; }
    investments.push({ ...data[0], rate_value: Number(data[0].rate_value), contributions: [] });
  } else {
    investments.push({ id: uid(), name, rate_type: rateType, rate_value: rateValue, contributions: [] });
  }
  return true;
}

async function removeInvestment(id) {
  if (CLOUD_MODE) {
    const { error } = await db.from('investments').delete().eq('id', id);
    if (error) { showBanner('error', 'Erro ao excluir investimento: ' + error.message); return false; }
  }
  investments = investments.filter(inv => inv.id !== id);
  return true;
}

async function addContribution(investmentId, amount, date) {
  const inv = investments.find(i => i.id === investmentId);
  if (!inv) return false;
  if (CLOUD_MODE) {
    const { data, error } = await db.from('investment_contributions').insert([{ investment_id: investmentId, amount, date }]).select();
    if (error) { showBanner('error', 'Erro ao adicionar aporte: ' + error.message); return false; }
    inv.contributions.push({ ...data[0], amount: Number(data[0].amount) });
  } else {
    inv.contributions.push({ id: uid(), investment_id: investmentId, amount, date });
  }
  return true;
}

async function removeContribution(investmentId, contributionId) {
  const inv = investments.find(i => i.id === investmentId);
  if (!inv) return false;
  if (CLOUD_MODE) {
    const { error } = await db.from('investment_contributions').delete().eq('id', contributionId);
    if (error) { showBanner('error', 'Erro ao excluir aporte: ' + error.message); return false; }
  }
  inv.contributions = inv.contributions.filter(c => c.id !== contributionId);
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
    const catColor = getCategoryColor(t.category);
    const catStyle = `background-color:${hexToRgba(catColor, 0.14)}; color:${catColor};`;
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

// ============================================================
// RENDER: Investimentos
// ============================================================
function renderInvestmentsKpi() {
  const total = investments.reduce((s, inv) => s + investmentTotals(inv).atual, 0);
  document.getElementById('kpiInvestidoValue').textContent = formatCurrency(total);
  document.getElementById('kpiInvestidoSub').textContent = `${investments.length} investimento(s)`;
}

function renderInvestmentsList() {
  const container = document.getElementById('investmentList');
  const emptyState = document.getElementById('investmentEmptyState');

  if (investments.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    renderInvestmentsKpi();
    return;
  }
  emptyState.classList.add('hidden');

  container.innerHTML = investments.map(inv => {
    const { aportado, atual, rendimento } = investmentTotals(inv);
    const rendPct = aportado > 0 ? (rendimento / aportado) * 100 : 0;
    const rateLabel = inv.rate_type === 'annual' ? `${inv.rate_value}% a.a.` : `${inv.rate_value}% a.m.`;

    const contribRows = inv.contributions.slice().sort((a, b) => b.date.localeCompare(a.date)).map(c => `
      <div class="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-[#F0EFEC] last:border-0">
        <span class="text-muted">${formatDate(c.date)}</span>
        <span class="font-medium tabular">${formatCurrency(c.amount)}</span>
        <button type="button" data-action="delete-contribution" data-investment-id="${inv.id}" data-contribution-id="${c.id}" title="Excluir aporte" class="text-muted hover:text-loss transition-colors shrink-0">${trashIcon}</button>
      </div>
    `).join('') || '<p class="text-xs text-muted py-2">Nenhum aporte registrado ainda.</p>';

    return `
    <div class="border border-[#EEECE7] rounded-xl p-4" data-investment-card="${inv.id}">
      <div class="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <p class="font-display font-semibold text-sm">${escapeHtml(inv.name)}</p>
          <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EAF2F5] text-[#3E7C90]">${rateLabel}</span>
        </div>
        <button type="button" data-action="delete-investment" data-id="${inv.id}" data-name="${escapeHtml(inv.name)}" title="Excluir investimento" class="text-muted hover:text-loss transition-colors shrink-0">${trashIcon}</button>
      </div>

      <div class="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p class="text-[11px] text-muted">Aportado</p>
          <p class="text-sm font-semibold tabular">${formatCurrency(aportado)}</p>
        </div>
        <div>
          <p class="text-[11px] text-muted">Valor atual</p>
          <p class="text-sm font-semibold tabular text-[#3E7C90]">${formatCurrency(atual)}</p>
        </div>
        <div>
          <p class="text-[11px] text-muted">Rendimento</p>
          <p class="text-sm font-semibold tabular text-gain">+${formatCurrency(rendimento)} <span class="text-[11px] font-normal">(${rendPct.toFixed(1)}%)</span></p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 mb-3 bg-[#FAF9F7] rounded-lg px-3 py-2">
        <span class="text-xs text-muted">Daqui a</span>
        <input type="number" data-role="projection-months" data-id="${inv.id}" min="1" step="1" value="12" class="w-16 px-2 py-1 rounded-lg border border-[#E7E5E0] text-xs text-center focus-visible:ring-2 focus-visible:ring-gold/40" />
        <span class="text-xs text-muted">meses, deve valer</span>
        <span data-role="projection-result" data-id="${inv.id}" class="text-xs font-semibold text-gold">${formatCurrency(projectedValue(inv, 12))}</span>
      </div>

      <details class="mb-3">
        <summary class="text-xs font-medium text-muted cursor-pointer hover:text-ink select-none">Ver aportes (${inv.contributions.length})</summary>
        <div class="mt-2">${contribRows}</div>
      </details>

      <form data-action="add-contribution" data-id="${inv.id}" class="flex flex-wrap gap-2 items-end pt-2 border-t border-[#F0EFEC]">
        <div>
          <label class="block text-[11px] text-muted mb-1">Novo aporte (R$)</label>
          <input type="number" required min="0.01" step="0.01" data-role="contribution-amount" placeholder="0,00" class="w-28 px-2.5 py-1.5 rounded-lg border border-[#E7E5E0] text-xs focus-visible:ring-2 focus-visible:ring-gold/40" />
        </div>
        <div>
          <label class="block text-[11px] text-muted mb-1">Data</label>
          <input type="date" required data-role="contribution-date" value="${new Date().toISOString().slice(0, 10)}" class="px-2.5 py-1.5 rounded-lg border border-[#E7E5E0] text-xs focus-visible:ring-2 focus-visible:ring-gold/40" />
        </div>
        <button type="submit" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gold hover:brightness-95 transition-all">+ Aporte</button>
      </form>
    </div>`;
  }).join('');

  renderInvestmentsKpi();
}

// ============================================================
// SIMULADOR DE INVESTIMENTOS (hipotético, não afeta dados reais)
// ============================================================
function simulateInvestment(initial, monthlyContribution, monthlyRate, months) {
  let value = initial;
  let contributed = initial;
  for (let i = 0; i < months; i++) {
    value *= (1 + monthlyRate);
    value += monthlyContribution;
    contributed += monthlyContribution;
  }
  return { value, contributed, interest: value - contributed };
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
  investments = [];
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
// EVENT LISTENERS: INVESTIMENTOS
// ============================================================
document.getElementById('investmentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('investmentName');
  const rateValueInput = document.getElementById('investmentRateValue');
  const rateTypeInput = document.getElementById('investmentRateType');
  const name = nameInput.value.trim();
  const rateValue = parseFloat(rateValueInput.value);
  const rateType = rateTypeInput.value;
  if (!name || isNaN(rateValue)) return;

  const submitBtn = document.getElementById('investmentSubmitBtn');
  submitBtn.disabled = true;
  const ok = await addInvestment(name, rateType, rateValue);
  submitBtn.disabled = false;
  if (!ok) return;

  nameInput.value = '';
  rateValueInput.value = '';
  renderInvestmentsList();
});

document.getElementById('investmentList').addEventListener('click', async (e) => {
  const delInvBtn = e.target.closest('[data-action="delete-investment"]');
  if (delInvBtn) {
    const confirmed = confirm(`Excluir "${delInvBtn.dataset.name}" e todo o histórico de aportes dele? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;
    delInvBtn.disabled = true;
    const ok = await removeInvestment(delInvBtn.dataset.id);
    if (!ok) { delInvBtn.disabled = false; return; }
    renderInvestmentsList();
    return;
  }

  const delContribBtn = e.target.closest('[data-action="delete-contribution"]');
  if (delContribBtn) {
    delContribBtn.disabled = true;
    const ok = await removeContribution(delContribBtn.dataset.investmentId, delContribBtn.dataset.contributionId);
    if (!ok) { delContribBtn.disabled = false; return; }
    renderInvestmentsList();
  }
});

document.getElementById('investmentList').addEventListener('submit', async (e) => {
  const form = e.target.closest('[data-action="add-contribution"]');
  if (!form) return;
  e.preventDefault();
  const amountInput = form.querySelector('[data-role="contribution-amount"]');
  const dateInput = form.querySelector('[data-role="contribution-date"]');
  const amount = parseFloat(amountInput.value);
  const date = dateInput.value;
  if (isNaN(amount) || amount <= 0 || !date) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const ok = await addContribution(form.dataset.id, amount, date);
  submitBtn.disabled = false;
  if (!ok) return;
  renderInvestmentsList();
});

document.getElementById('investmentList').addEventListener('input', (e) => {
  const input = e.target.closest('[data-role="projection-months"]');
  if (!input) return;
  const inv = investments.find(i => i.id === input.dataset.id);
  if (!inv) return;
  const months = Math.max(1, parseInt(input.value) || 1);
  const resultEl = document.querySelector(`[data-role="projection-result"][data-id="${input.dataset.id}"]`);
  if (resultEl) resultEl.textContent = formatCurrency(projectedValue(inv, months));
});

document.getElementById('simulatorForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const initial = parseFloat(document.getElementById('simInitial').value) || 0;
  const monthlyContribution = parseFloat(document.getElementById('simMonthly').value) || 0;
  const rateValue = parseFloat(document.getElementById('simRateValue').value);
  const rateType = document.getElementById('simRateType').value;
  const months = parseInt(document.getElementById('simMonths').value);
  if (isNaN(rateValue) || isNaN(months) || months < 1) return;

  const monthlyRate = rateType === 'annual' ? Math.pow(1 + rateValue / 100, 1 / 12) - 1 : rateValue / 100;
  const { value, contributed, interest } = simulateInvestment(initial, monthlyContribution, monthlyRate, months);

  const resultEl = document.getElementById('simulatorResult');
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `
    <div class="bg-[#F5F4F1] rounded-xl p-4">
      <p class="text-xs text-muted">Total investido</p>
      <p class="font-display font-bold text-lg mt-1 tabular">${formatCurrency(contributed)}</p>
    </div>
    <div class="bg-gainbg rounded-xl p-4">
      <p class="text-xs text-muted">Rendimento no período</p>
      <p class="font-display font-bold text-lg mt-1 tabular text-gain">+${formatCurrency(interest)}</p>
    </div>
    <div class="bg-goldlight rounded-xl p-4">
      <p class="text-xs text-muted">Valor final</p>
      <p class="font-display font-bold text-lg mt-1 tabular text-[#7A5A2E]">${formatCurrency(value)}</p>
    </div>
  `;
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
// Navegação entre views (Painel, Configurações, Investimentos)
const VIEW_IDS = { dashboard: 'topo', config: 'configSection', investments: 'investmentsSection' };

function switchView(view) {
  Object.values(VIEW_IDS).forEach(id => document.getElementById(id).classList.add('hidden'));
  document.getElementById(VIEW_IDS[view] || VIEW_IDS.dashboard).classList.remove('hidden');
  document.querySelectorAll('.nav-link').forEach(link => {
    const active = link.dataset.view === view;
    link.classList.toggle('bg-sidebarhover', active);
    link.classList.toggle('text-white', active);
  });
  document.querySelector('main').scrollTo({ top: 0 });
}

document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', (e) => {
  e.preventDefault();
  switchView(link.dataset.view);
  if (link.dataset.scrollTo) {
    requestAnimationFrame(() => {
      document.getElementById(link.dataset.scrollTo).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
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
    renderInvestmentsList();
    switchView('dashboard');
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
      investments = [];
      showAuthScreen();
    }
  });
}

init();
