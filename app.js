/* ═══════════════════════════════════════════
   FINANCEOS — APP.JS
   Lógica completa: cálculos, gráficos, tabs
═══════════════════════════════════════════ */

'use strict';

// ── CONSTANTES ─────────────────────────────────────────────────────────
const MESES   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const CORES   = { green:'#6aaa7c', red:'#c96a6a', gold:'#c9a84c', blue:'#6a8fc9', accent:'#d4a853', muted:'#7a7268' };
const PIE_CORES = ['#c9a84c','#6aaa7c','#6a8fc9','#d4a853','#c96a6a','#9a7ec9'];

// Registro de instâncias Chart.js para destruir antes de recriar
const _charts = {};

// ── UTILITÁRIOS ─────────────────────────────────────────────────────────
function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v || 0);
}
function fmtPct(v) { return `${(+v || 0).toFixed(2)}%`; }
function fmtK(v)   { return `${((+v || 0) / 1000).toFixed(1)}k`; }
function el(id)    { return document.getElementById(id); }
function val(id)   { return parseFloat(el(id)?.value) || 0; }
function rnd(base, spread = 0.3) { return base * (0.85 + Math.random() * spread); }

function getMonthlyData(receita, despesa) {
  return MESES.map(m => {
    const r = rnd(receita);
    const d = rnd(despesa);
    return { mes: m, receita: r, despesa: d, lucro: r - d };
  });
}

// ── CÁLCULOS FINANCEIROS ────────────────────────────────────────────────
function calcular() {
  const receita     = val('pReceita')     || 15000;
  const despesa     = val('pDespesa')     || 9000;
  const investimento= val('pInvestimento')|| 50000;
  const taxa        = (val('pTaxa')       || 1.2)   / 100;
  const meses       = val('pMeses')       || 24;
  const aluguel     = val('pAluguel')     || 2500;
  const imovel      = val('pImovel')      || 450000;
  const financiamento= val('pFinanciamento')|| 200000;

  const lucro = receita - despesa;
  const margemLucro = receita > 0 ? (lucro / receita) * 100 : 0;
  const roi    = investimento > 0 ? (lucro / investimento) * 100 : 0;
  const ebitda = lucro * 1.15;
  const payback = lucro > 0 ? investimento / lucro : Infinity;
  const capitalGiro = receita - despesa * 0.6;
  const jcMontante = investimento * Math.pow(1 + taxa, meses);
  const jcRendimento = jcMontante - investimento;
  const yieldAluguel = imovel > 0 ? (aluguel * 12 / imovel) * 100 : 0;
  const parcela = financiamento > 0 ? (financiamento * taxa * Math.pow(1+taxa, meses)) / (Math.pow(1+taxa, meses) - 1) : 0;
  const totalFinanc = parcela * meses;
  const jurosFinanc = totalFinanc - financiamento;
  const vpl = Array.from({length: meses}, (_, i) => lucro / Math.pow(1 + taxa, i + 1)).reduce((a, b) => a + b, 0) - investimento;
  const tir = roi / 100;
  const breakEven = receita > 0 ? (despesa / receita) * receita : 0;
  const fluxoLivre = lucro - investimento * 0.1;
  const liquidez = despesa > 0 ? receita / despesa : 0;
  const alavancagem = investimento > 0 ? receita / investimento : 0;

  return {
    receita, despesa, investimento, taxa, meses, aluguel, imovel, financiamento,
    lucro, margemLucro, roi, ebitda, payback, capitalGiro,
    jcMontante, jcRendimento, yieldAluguel, parcela, totalFinanc, jurosFinanc,
    vpl, tir, breakEven, fluxoLivre, liquidez, alavancagem,
  };
}

// ── CHARTS HELPER ───────────────────────────────────────────────────────
const CHART_DEFAULTS = {
  color: '#e8dfc8',
  plugins: {
    legend: { labels: { color:'#b8ad98', font:{ size:11, family:'Sora' }, boxWidth:10 } },
    tooltip: {
      backgroundColor:'#2c2722',
      titleColor:'#b8ad98',
      bodyColor:'#e8dfc8',
      borderColor:'#3d3730',
      borderWidth:1,
      callbacks: {
        label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}`
      }
    }
  },
  scales: {
    x: { ticks:{ color:'#7a7268', font:{size:11} }, grid:{ color:'rgba(61,55,48,0.6)' }, border:{display:false} },
    y: { ticks:{ color:'#7a7268', font:{size:11}, callback: v => fmtK(v) }, grid:{ color:'rgba(61,55,48,0.6)' }, border:{display:false} }
  }
};

function makeChart(id, config) {
  const canvas = el(id);
  if (!canvas) return;
  if (_charts[id]) { _charts[id].destroy(); }
  _charts[id] = new Chart(canvas, config);
}

// ── RENDER DASHBOARD ────────────────────────────────────────────────────
function renderDashboard() {
  const m = calcular();
  const monthly = getMonthlyData(m.receita, m.despesa);

  // KPIs
  el('kpiReceita').textContent = fmt(m.receita);
  el('kpiDespesa').textContent = fmt(m.despesa);

  const kLucro = el('kpiLucro');
  kLucro.textContent = fmt(m.lucro);
  kLucro.className = 'kpi-val ' + (m.lucro >= 0 ? 'green' : 'red');
  el('kpiLucroSub').textContent = fmtPct(m.margemLucro) + ' de margem';

  el('kpiRoi').textContent    = fmtPct(m.roi);
  el('kpiEbitda').textContent = fmt(m.ebitda);

  const kVpl = el('kpiVpl');
  kVpl.textContent = fmt(m.vpl);
  kVpl.className = 'kpi-val ' + (m.vpl >= 0 ? 'green' : 'red');
  el('kpiVplSub').textContent = `${m.meses} meses @ ${(m.taxa*100).toFixed(1)}%`;

  el('kpiPayback').textContent = isFinite(m.payback) ? `${m.payback.toFixed(1)} meses` : '∞';
  el('kpiGiro').textContent = fmt(m.capitalGiro);

  // Sidebar
  el('sideRoi').textContent    = fmtPct(m.roi);
  el('sideMargem').textContent = fmtPct(m.margemLucro);
  el('sideVpl').textContent    = fmt(m.vpl);
  el('sideVpl').className = m.vpl >= 0 ? 'val-green' : 'val-red';

  // Header saldo
  const hS = el('headerSaldo');
  const hV = el('headerSaldoVal');
  hV.textContent = fmt(m.lucro);
  if (m.lucro < 0) { hS.classList.add('negative'); hV.classList.add('negative-val'); }
  else { hS.classList.remove('negative'); hV.classList.remove('negative-val'); }

  // Chart Área
  makeChart('chartArea', {
    type: 'line',
    data: {
      labels: monthly.map(d => d.mes),
      datasets: [
        { label:'Receita', data: monthly.map(d => d.receita), borderColor: CORES.green, backgroundColor: 'rgba(106,170,124,0.12)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
        { label:'Despesa', data: monthly.map(d => d.despesa), borderColor: CORES.red,   backgroundColor: 'rgba(201,106,106,0.12)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
      ]
    },
    options: { ...CHART_DEFAULTS, responsive:true, maintainAspectRatio:true }
  });

  // Chart Pizza
  const pieLabels = ['Moradia','Alimentação','Transporte','Saúde','Serviços','Outros'];
  const pieVals   = [1200, 600, 250, 100, 330, Math.max(0, m.despesa - 2480)];
  makeChart('chartPie', {
    type: 'doughnut',
    data: { labels: pieLabels, datasets: [{ data: pieVals, backgroundColor: PIE_CORES, borderWidth: 0, hoverOffset: 6 }] },
    options: {
      responsive:true, maintainAspectRatio:true, cutout:'60%',
      plugins: {
        legend: { position:'bottom', labels:{ color:'#b8ad98', font:{size:10}, boxWidth:8, padding:8 } },
        tooltip: { ...CHART_DEFAULTS.plugins.tooltip, callbacks:{ label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}` } }
      }
    }
  });
}

// ── RENDER CÁLCULOS ─────────────────────────────────────────────────────
function renderCalcRow(label, value, color) {
  return `<div class="calc-row"><span>${label}</span><span style="color:${color||CORES.gold}">${value}</span></div>`;
}

function renderCalculos() {
  const m = calcular();

  // Juros compostos com inputs próprios
  const jcCapital = val('jcCapital') || m.investimento;
  const jcTaxa    = (val('jcTaxa')  || 1.2) / 100;
  const jcMeses   = val('jcMeses')  || 24;
  const jcMontante  = jcCapital * Math.pow(1 + jcTaxa, jcMeses);
  const jcRendimento = jcMontante - jcCapital;

  // Imóvel com inputs próprios
  const imImovel = val('imImovel') || m.imovel;
  const imAluguel = val('imAluguel') || m.aluguel;
  const imFinanc = val('imFinanc') || m.financiamento;
  const imMeses = val('imMeses') || 240;
  const imTaxa = m.taxa;
  const imParcela = imFinanc > 0 ? (imFinanc * imTaxa * Math.pow(1+imTaxa, imMeses)) / (Math.pow(1+imTaxa, imMeses) - 1) : 0;
  const imYield = imImovel > 0 ? (imAluguel * 12 / imImovel) * 100 : 0;

  el('calcRentabilidade').innerHTML = [
    renderCalcRow('Lucro Líquido',    fmt(m.lucro),            m.lucro>=0 ? CORES.green : CORES.red),
    renderCalcRow('Margem de Lucro',  fmtPct(m.margemLucro),   CORES.gold),
    renderCalcRow('ROI',              fmtPct(m.roi),            CORES.gold),
    renderCalcRow('EBITDA',           fmt(m.ebitda),            CORES.blue),
    renderCalcRow('Alavancagem',      `${m.alavancagem.toFixed(2)}x`, CORES.accent),
    renderCalcRow('Liquidez Corrente',`${m.liquidez.toFixed(2)}x`,    '#b8ad98'),
  ].join('');

  el('calcJuros').innerHTML = [
    renderCalcRow('Capital Inicial',   fmt(jcCapital),   '#b8ad98'),
    renderCalcRow('Montante Final',    fmt(jcMontante),  CORES.green),
    renderCalcRow('Rendimento Bruto',  fmt(jcRendimento),CORES.gold),
    renderCalcRow(`Taxa Efetiva (${jcMeses}m)`, fmtPct((jcMontante/jcCapital - 1)*100), CORES.accent),
  ].join('');

  el('calcImovel').innerHTML = [
    renderCalcRow('Yield Anual',          fmtPct(imYield),    CORES.gold),
    renderCalcRow('Parcela Financiamento',fmt(imParcela),      CORES.red),
    renderCalcRow('Total a Pagar',        fmt(imParcela*imMeses), CORES.red),
    renderCalcRow('Juros Pagos',          fmt(imParcela*imMeses - imFinanc), CORES.red),
  ].join('');

  el('calcProjeto').innerHTML = [
    renderCalcRow('VPL',              fmt(m.vpl),       m.vpl>=0 ? CORES.green : CORES.red),
    renderCalcRow('TIR Estimada',     fmtPct(m.tir*100),CORES.gold),
    renderCalcRow('Payback',          isFinite(m.payback) ? `${m.payback.toFixed(1)} meses` : 'Não viável', CORES.blue),
    renderCalcRow('Break-Even',       fmt(m.breakEven), CORES.accent),
    renderCalcRow('Fluxo de Caixa Livre', fmt(m.fluxoLivre), m.fluxoLivre>=0 ? CORES.green : CORES.red),
    renderCalcRow('Capital de Giro',  fmt(m.capitalGiro),'#b8ad98'),
    renderCalcRow('EBITDA',           fmt(m.ebitda),     CORES.blue),
  ].join('');
}

// ── RENDER GRÁFICOS ─────────────────────────────────────────────────────
function renderGraficos() {
  const m = calcular();
  const monthly = getMonthlyData(m.receita, m.despesa);

  // Juros compostos
  const step = Math.ceil(m.meses / 8);
  const jcData = Array.from({length: m.meses}, (_, i) => ({
    mes: `M${i+1}`,
    montante: m.investimento * Math.pow(1 + m.taxa, i+1),
    capital:  m.investimento,
  })).filter((_, i) => i % step === 0 || i === m.meses - 1);

  makeChart('chartJuros', {
    type: 'line',
    data: {
      labels: jcData.map(d => d.mes),
      datasets: [
        { label:'Montante', data: jcData.map(d => d.montante), borderColor: CORES.gold, backgroundColor:'rgba(201,168,76,0.15)', fill:true, tension:0.4, borderWidth:2.5, pointRadius:3 },
        { label:'Capital',  data: jcData.map(d => d.capital),  borderColor:'#7a7268',   backgroundColor:'transparent', borderDash:[4,4], tension:0, borderWidth:1.5, pointRadius:0 },
      ]
    },
    options: { ...CHART_DEFAULTS, responsive:true, maintainAspectRatio:true }
  });

  // Lucro mensal (bar colorido)
  makeChart('chartLucroMensal', {
    type: 'bar',
    data: {
      labels: monthly.map(d => d.mes),
      datasets: [{
        label: 'Lucro',
        data: monthly.map(d => d.lucro),
        backgroundColor: monthly.map(d => d.lucro >= 0 ? 'rgba(106,170,124,0.85)' : 'rgba(201,106,106,0.85)'),
        borderRadius: 5,
      }]
    },
    options: { ...CHART_DEFAULTS, responsive:true, maintainAspectRatio:true }
  });

  // Receita x Despesa bar
  makeChart('chartBarRecDesp', {
    type: 'bar',
    data: {
      labels: monthly.map(d => d.mes),
      datasets: [
        { label:'Receita', data: monthly.map(d => d.receita), backgroundColor:'rgba(106,170,124,0.8)', borderRadius:4 },
        { label:'Despesa', data: monthly.map(d => d.despesa), backgroundColor:'rgba(201,106,106,0.8)', borderRadius:4 },
      ]
    },
    options: { ...CHART_DEFAULTS, responsive:true, maintainAspectRatio:true }
  });

  // Pizza
  const pieLabels = ['Moradia','Alimentação','Transporte','Saúde','Serviços','Outros'];
  const pieVals   = [1200, 600, 250, 100, 330, Math.max(10, m.despesa - 2480)];
  makeChart('chartPie2', {
    type: 'pie',
    data: { labels: pieLabels, datasets: [{ data: pieVals, backgroundColor: PIE_CORES, borderWidth: 0, hoverOffset: 8 }] },
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins: {
        legend: { position:'right', labels:{ color:'#b8ad98', font:{size:11}, boxWidth:10, padding:10 } },
        tooltip: { ...CHART_DEFAULTS.plugins.tooltip, callbacks:{ label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}` } }
      }
    }
  });
}

// ── RENDER PLANILHA ─────────────────────────────────────────────────────
function renderPlanilha() {
  const m = calcular();
  const monthly = getMonthlyData(m.receita, m.despesa);
  const cols = `140px repeat(12, 1fr)`;

  const rows = [
    { label:'Receita', key:'receita', color: CORES.green  },
    { label:'Despesa', key:'despesa', color: CORES.red    },
    { label:'Lucro',   key:'lucro',   color: '#e8dfc8'    },
  ];

  let html = `<div class="planilha-header" style="grid-template-columns:${cols}">
    <span>Indicador</span>`;
  MESES.forEach(mes => { html += `<span style="text-align:center;color:var(--gold)">${mes}</span>`; });
  html += `</div>`;

  rows.forEach((row, ri) => {
    html += `<div class="planilha-row" style="background:${ri%2===0?'transparent':'rgba(26,23,20,0.4)'};grid-template-columns:${cols}">`;
    html += `<span class="planilha-label"><span class="dot" style="background:${row.color}"></span>${row.label}</span>`;
    monthly.forEach(d => {
      const v = d[row.key];
      html += `<span class="planilha-cell" style="color:${v<0?CORES.red:row.color}">${fmtK(v)}</span>`;
    });
    html += `</div>`;
  });

  // Margem %
  html += `<div class="planilha-row" style="background:rgba(201,168,76,0.05);grid-template-columns:${cols}">`;
  html += `<span class="planilha-label"><span class="dot" style="background:${CORES.gold}"></span>Margem %</span>`;
  monthly.forEach(d => {
    const mg = d.receita > 0 ? d.lucro / d.receita * 100 : 0;
    html += `<span class="planilha-cell" style="color:${mg>=0?CORES.gold:CORES.red}">${mg.toFixed(1)}%</span>`;
  });
  html += `</div>`;

  // Acumulado
  let acc = 0;
  html += `<div class="planilha-row" style="grid-template-columns:${cols}">`;
  html += `<span class="planilha-label"><span class="dot" style="background:${CORES.blue}"></span>Acumulado</span>`;
  monthly.forEach(d => {
    acc += d.lucro;
    html += `<span class="planilha-cell" style="color:${acc>=0?CORES.blue:CORES.red}">${fmtK(acc)}</span>`;
  });
  html += `</div>`;

  el('planilhaTable').innerHTML = html;

  // Totais
  const tR = monthly.reduce((a, d) => a + d.receita, 0);
  const tD = monthly.reduce((a, d) => a + d.despesa, 0);
  const tL = monthly.reduce((a, d) => a + d.lucro, 0);
  const totais = [
    { l:'Receita Anual',  v: fmt(tR), c: CORES.green  },
    { l:'Despesa Anual',  v: fmt(tD), c: CORES.red    },
    { l:'Lucro Anual',    v: fmt(tL), c: tL>=0 ? CORES.green : CORES.red },
    { l:'Margem Média',   v: fmtPct(tR>0 ? tL/tR*100 : 0), c: CORES.gold  },
    { l:'ROI Anual',      v: fmtPct(m.investimento>0 ? tL/m.investimento*100 : 0), c: CORES.blue  },
  ];
  el('planilhaTotais').innerHTML = totais.map(t => `
    <div class="kpi-card">
      <p class="kpi-label">${t.l}</p>
      <p class="kpi-val" style="color:${t.c}">${t.v}</p>
    </div>`).join('');
}

// ── ABA PESSOAL ─────────────────────────────────────────────────────────
const GASTOS_IDS = ['g_aluguel','g_mercado','g_transporte','g_saude','g_internet','g_contas','g_lazer','g_compras','g_dividas','g_outros'];
const GASTOS_LABELS = ['Moradia','Alimentação','Transporte','Saúde','Serviços','Contas','Lazer','Compras','Dívidas','Outros'];

function calcPessoal() {
  const renda = val('pessoalRenda') || 0;
  const gastos = GASTOS_IDS.map(id => val(id) || 0);
  const totalGasto = gastos.reduce((a, b) => a + b, 0);
  const sobra = renda - totalGasto;
  const meta  = val('metaEconomia') || 0;
  return { renda, gastos, totalGasto, sobra, meta };
}

function getMensagem(sobra, renda) {
  if (renda === 0) return '👆 Coloque quanto você ganha para começar!';
  const pct = renda > 0 ? sobra / renda * 100 : 0;
  if (sobra < 0)  return `🚨 Você está gastando ${fmt(Math.abs(sobra))} a mais do que ganha! Precisa cortar gastos.`;
  if (pct < 5)    return `⚠️ Você quase não está sobrando nada. Tente cortar pelo menos um gasto pequeno.`;
  if (pct < 15)   return `😐 Está sobrando pouco. Tente guardar pelo menos R$ ${fmt(renda*0.1).replace('R$','')} por mês.`;
  if (pct < 30)   return `👍 Você está no caminho certo! Tente guardar parte do que sobra.`;
  if (pct < 50)   return `✅ Ótimo! Você está economizando bem. Considere investir o que sobra.`;
  return `🌟 Excelente! Você está economizando mais da metade da sua renda. Continue assim!`;
}

function renderPessoal() {
  const { renda, gastos, totalGasto, sobra, meta } = calcPessoal();

  el('res_renda').textContent = fmt(renda);
  el('res_gasto').textContent = fmt(totalGasto);

  const rSobra = el('res_sobra');
  rSobra.textContent = fmt(sobra);
  rSobra.style.color = sobra >= 0 ? CORES.green : CORES.red;

  // Mensagem
  el('mensagemTexto').textContent = getMensagem(sobra, renda);

  // Meta progress
  const pctMeta = meta > 0 && sobra > 0 ? Math.min(100, (sobra / meta) * 100) : 0;
  el('metaFill').style.width = pctMeta + '%';
  el('metaTexto').textContent = meta > 0
    ? `${pctMeta.toFixed(0)}% da meta — sobram ${fmt(sobra)} de ${fmt(meta)} necessários`
    : 'Defina uma meta acima';

  // Dicas
  const dicas = [];
  if (gastos[0] / renda > 0.35) dicas.push({ icon:'🏠', titulo:'Aluguel alto', texto:`Seu aluguel representa ${(gastos[0]/renda*100).toFixed(0)}% da renda. O ideal é até 30%.` });
  if (gastos[1] / renda > 0.20) dicas.push({ icon:'🛒', titulo:'Alimentação', texto:'Tente fazer mais refeições em casa para economizar.' });
  if (gastos[6] / renda > 0.10) dicas.push({ icon:'🎮', titulo:'Lazer', texto:'Seus gastos com lazer estão acima de 10% da renda. Tudo bem se estiver sobrando!' });
  if (sobra > 0 && sobra/renda > 0.2) dicas.push({ icon:'📈', titulo:'Hora de investir!', texto:`Você tem ${fmt(sobra)} sobrando. Que tal guardar em uma conta que rende juros?` });
  if (gastos[8] > 0) dicas.push({ icon:'💳', titulo:'Dívidas', texto:`Você tem ${fmt(gastos[8])} em parcelas. Tente quitá-las para liberar dinheiro.` });
  if (dicas.length === 0) dicas.push({ icon:'🌟', titulo:'Tudo certo!', texto:'Seus gastos parecem equilibrados. Continue assim!' });

  el('dicasGrid').innerHTML = dicas.slice(0, 3).map(d =>
    `<div class="dica-card">
      <span class="dica-icon">${d.icon}</span>
      <div class="dica-titulo">${d.titulo}</div>
      <div class="dica-texto">${d.texto}</div>
    </div>`
  ).join('');

  // Gráfico pizza pessoal
  const pieVals = GASTOS_IDS.map((id, i) => ({ label: GASTOS_LABELS[i], val: val(id) || 0 })).filter(d => d.val > 0);
  makeChart('chartPessoalPizza', {
    type: 'doughnut',
    data: {
      labels: pieVals.map(d => d.label),
      datasets: [{ data: pieVals.map(d => d.val), backgroundColor: PIE_CORES, borderWidth:0, hoverOffset:8 }]
    },
    options: {
      responsive:true, maintainAspectRatio:true, cutout:'55%',
      plugins: {
        legend: { position:'bottom', labels:{ color:'#b8ad98', font:{size:11}, boxWidth:8, padding:8 } },
        tooltip: { ...CHART_DEFAULTS.plugins.tooltip, callbacks:{ label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)} (${(ctx.raw/totalGasto*100).toFixed(1)}%)` } }
      }
    }
  });
}

// ── LANÇAMENTOS ─────────────────────────────────────────────────────────
const defaultTransactions = [
  { id:1, desc:'Salário',         cat:'Receita',      val:8000,  tipo:'entrada' },
  { id:2, desc:'Freela Design',   cat:'Receita',      val:3500,  tipo:'entrada' },
  { id:3, desc:'Aluguel',         cat:'Moradia',      val:-2200, tipo:'saida'   },
  { id:4, desc:'Supermercado',    cat:'Alimentação',  val:-1100, tipo:'saida'   },
  { id:5, desc:'Energia/Internet',cat:'Serviços',     val:-350,  tipo:'saida'   },
  { id:6, desc:'Tesouro Direto',  cat:'Investimento', val:-2000, tipo:'investimento' },
  { id:7, desc:'Dividendos FII',  cat:'Rendimento',   val:420,   tipo:'entrada' },
];
let transactions = [...defaultTransactions];

function renderTransactions() {
  const entradas = transactions.filter(t => t.val > 0).reduce((a, b) => a + b.val, 0);
  const saidas   = Math.abs(transactions.filter(t => t.val < 0).reduce((a, b) => a + b.val, 0));
  const saldo    = transactions.reduce((a, b) => a + b.val, 0);

  el('txTotalEntrada').textContent = fmt(entradas);
  el('txTotalSaida').textContent   = fmt(saidas);
  const ts = el('txSaldo');
  ts.textContent = fmt(saldo);
  ts.className = 'kpi-val ' + (saldo >= 0 ? 'green' : 'red');

  el('txList').innerHTML = transactions.map(tx => `
    <div class="table-row">
      <span style="color:var(--cream)">${tx.desc}</span>
      <span style="color:var(--cream-dim)">${tx.cat}</span>
      <span><span class="badge badge-${tx.tipo}">${tx.tipo}</span></span>
      <span style="color:${tx.val>=0?'var(--green)':'var(--red)'}; font-weight:700; font-family:var(--mono)">${fmt(tx.val)}</span>
    </div>`).join('');
}

// ── TABS ─────────────────────────────────────────────────────────────────
let currentTab = 'pessoal';

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const tabEl = el('tab-' + tabId);
  const btnEl = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
  if (tabEl) tabEl.classList.add('active');
  if (btnEl) btnEl.classList.add('active');
  currentTab = tabId;

  // Render on demand
  if (tabId === 'pessoal')     renderPessoal();
  if (tabId === 'dashboard')   renderDashboard();
  if (tabId === 'calculos')    renderCalculos();
  if (tabId === 'graficos')    renderGraficos();
  if (tabId === 'planilha')    renderPlanilha();
  if (tabId === 'lancamentos') renderTransactions();
}

// ── NICHO ────────────────────────────────────────────────────────────────
function switchNicho(nicho) {
  document.querySelectorAll('.nicho-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nicho-btn[data-nicho="${nicho}"]`)?.classList.add('active');
  const nichoLabel = el('nichoLabel');
  if (nichoLabel) nichoLabel.textContent = nicho;
  rerender();
}

// ── RERENDER ─────────────────────────────────────────────────────────────
function rerender() {
  if (currentTab === 'pessoal')     renderPessoal();
  if (currentTab === 'dashboard')   renderDashboard();
  if (currentTab === 'calculos')    renderCalculos();
  if (currentTab === 'graficos')    renderGraficos();
  if (currentTab === 'planilha')    renderPlanilha();
}

// ── DEBOUNCE ─────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const dRerender = debounce(rerender, 300);

// ── INIT ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Sidebar nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Nicho buttons
  document.querySelectorAll('.nicho-btn').forEach(btn => {
    btn.addEventListener('click', () => switchNicho(btn.dataset.nicho));
  });

  // Portfolio name sync
  el('portfolioName')?.addEventListener('input', e => {
    el('portfolioNameDisplay').textContent = e.target.value || 'Meu Portfólio';
  });

  // Parâmetros dashboard
  ['pReceita','pDespesa','pInvestimento','pTaxa','pMeses','pAluguel','pImovel','pFinanciamento'].forEach(id => {
    el(id)?.addEventListener('input', dRerender);
  });

  // Parâmetros cálculos
  ['jcCapital','jcTaxa','jcMeses','imImovel','imAluguel','imFinanc','imMeses'].forEach(id => {
    el(id)?.addEventListener('input', dRerender);
  });

  // Inputs pessoal
  el('pessoalRenda')?.addEventListener('input', dRerender);
  el('metaEconomia')?.addEventListener('input', dRerender);
  GASTOS_IDS.forEach(id => el(id)?.addEventListener('input', dRerender));

  // Lançamentos
  el('btnShowAdd')?.addEventListener('click', () => {
    const f = el('addForm');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
  });

  el('btnSaveTx')?.addEventListener('click', () => {
    const desc = el('txDesc').value.trim();
    const cat  = el('txCat').value.trim();
    const v    = parseFloat(el('txVal').value);
    const tipo = el('txTipo').value;
    if (!desc || !v) return;
    const realVal = tipo === 'saida' ? -Math.abs(v) : Math.abs(v);
    transactions.push({ id: Date.now(), desc, cat: cat||'Geral', val: realVal, tipo });
    el('txDesc').value = '';
    el('txCat').value  = '';
    el('txVal').value  = '';
    el('addForm').style.display = 'none';
    renderTransactions();
  });

  // Render inicial
  switchTab('pessoal');
});
