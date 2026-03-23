'use strict';
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const CORES = { green:'#6aaa7c', red:'#c96a6a', gold:'#c9a84c', blue:'#6a8fc9', accent:'#d4a853', muted:'#7a7268' };
const PIE_CORES = ['#c4a15a','#3e9e6a','#6a90d4','#8a6e30','#a84848','#7a5e9a'];
const _charts = {};

const el = (id) => document.getElementById(id);
function fmt(v) { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0); }
function fmtPct(v) { return `${(+v||0).toFixed(2)}%`; }
function fmtK(v)   { return `${((+v||0)/1000).toFixed(1)}k`; }
function val(id)   { return parseFloat(el(id)?.value)||0; }
function rnd(base) { return base*(0.85+Math.random()*0.3); }

// --- PERSISTÊNCIA (LOCALSTORAGE) ---
function saveData() {
  const data = {
    pessoal: {
      renda: val('pessoalRenda'),
      meta: val('metaEconomia'),
      gastos: GASTOS_IDS.reduce((acc, id) => { acc[id] = val(id); return acc; }, {}),
      portfolio: el('portfolioName')?.value || ''
    },
    business: {
      receita: val('pReceita'),
      despesa: val('pDespesa'),
      investimento: val('pInvestimento'),
      taxa: val('pTaxa')
    },
    calculos: {
      jcCapital: val('jcCapital'),
      jcTaxa: val('jcTaxa'),
      jcMeses: val('jcMeses'),
      imImovel: val('imImovel'),
      imAluguel: val('imAluguel'),
      imFinanc: val('imFinanc'),
      imMeses: val('imMeses')
    },
    transactions: transactions
  };
  localStorage.setItem('financeos_data', JSON.stringify(data));
  
  // Feedback visual simples
  const btn = el('btnSaveLocal');
  if(btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '✔ Salvo!';
    btn.style.background = 'var(--green)';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
    }, 2000);
  }
}

function loadData() {
  const saved = localStorage.getItem('financeos_data');
  if(!saved) return;
  try {
    const data = JSON.parse(saved);
    // Pessoal
    if(data.pessoal) {
      if(el('pessoalRenda')) el('pessoalRenda').value = data.pessoal.renda;
      if(el('metaEconomia')) el('metaEconomia').value = data.pessoal.meta;
      if(data.pessoal.portfolio && el('portfolioName')) {
        el('portfolioName').value = data.pessoal.portfolio;
        el('portfolioNameDisplay').textContent = data.pessoal.portfolio;
      }
      if(data.pessoal.gastos) {
        Object.keys(data.pessoal.gastos).forEach(id => {
          if(el(id)) el(id).value = data.pessoal.gastos[id];
        });
      }
    }
    // Business
    if(data.business) {
      if(el('pReceita')) el('pReceita').value = data.business.receita;
      if(el('pDespesa')) el('pDespesa').value = data.business.despesa;
      if(el('pInvestimento')) el('pInvestimento').value = data.business.investimento;
      if(el('pTaxa')) el('pTaxa').value = data.business.taxa;
    }
    // Cálculos
    if(data.calculos) {
      Object.keys(data.calculos).forEach(id => {
        if(el(id)) el(id).value = data.calculos[id];
      });
    }
    // Transações
    if(data.transactions) {
      transactions = data.transactions;
    }
  } catch(e) { console.error("Erro ao carregar dados:", e); }
}

function printReport() {
  window.print();
}

function getMonthlyData(receita,despesa) {
  return MESES.map(m=>{const r=rnd(receita),d=rnd(despesa);return{mes:m,receita:r,despesa:d,lucro:r-d};});
}

function calcular() {
  const receita=val('pReceita')||15000, despesa=val('pDespesa')||9000, investimento=val('pInvestimento')||50000;
  const taxa=(val('pTaxa')||1.2)/100, meses=val('pMeses')||24, aluguel=val('pAluguel')||2500;
  const imovel=val('pImovel')||450000, financiamento=val('pFinanciamento')||200000;
  const lucro=receita-despesa, margemLucro=receita>0?(lucro/receita)*100:0;
  const roi=investimento>0?(lucro/investimento)*100:0, ebitda=lucro*1.15;
  const payback=lucro>0?investimento/lucro:Infinity, capitalGiro=receita-despesa*0.6;
  const jcMontante=investimento*Math.pow(1+taxa,meses), jcRendimento=jcMontante-investimento;
  const yieldAluguel=imovel>0?(aluguel*12/imovel)*100:0;
  const parcela=financiamento>0?(financiamento*taxa*Math.pow(1+taxa,meses))/(Math.pow(1+taxa,meses)-1):0;
  const totalFinanc=parcela*meses, jurosFinanc=totalFinanc-financiamento;
  const vpl=Array.from({length:meses},(_,i)=>lucro/Math.pow(1+taxa,i+1)).reduce((a,b)=>a+b,0)-investimento;
  const tir=roi/100, breakEven=receita>0?(despesa/receita)*receita:0;
  const fluxoLivre=lucro-investimento*0.1, liquidez=despesa>0?receita/despesa:0;
  const alavancagem=investimento>0?receita/investimento:0;
  return{receita,despesa,investimento,taxa,meses,aluguel,imovel,financiamento,lucro,margemLucro,roi,ebitda,payback,capitalGiro,jcMontante,jcRendimento,yieldAluguel,parcela,totalFinanc,jurosFinanc,vpl,tir,breakEven,fluxoLivre,liquidez,alavancagem};
}

const CHART_DEFAULTS = {
  color:'#f0e8d4',
  plugins:{
    legend:{labels:{color:'#c8b898',font:{size:11,family:'Montserrat'},boxWidth:10}},
    tooltip:{backgroundColor:'#14121a',titleColor:'#c8b898',bodyColor:'#f0e8d4',borderColor:'rgba(196,161,90,0.25)',borderWidth:1,
      callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fmt(ctx.raw)}`}}
  },
  scales:{
    x:{ticks:{color:'#7a7060',font:{size:11}},grid:{color:'rgba(38,34,46,0.8)'},border:{display:false}},
    y:{ticks:{color:'#7a7060',font:{size:11},callback:v=>fmtK(v)},grid:{color:'rgba(38,34,46,0.8)'},border:{display:false}}
  }
};

function makeChart(id,config) {
  const canvas=el(id); if(!canvas)return;
  if(_charts[id]){_charts[id].destroy();}
  _charts[id]=new Chart(canvas,config);
}

function renderDashboard() {
  const m=calcular(), monthly=getMonthlyData(m.receita,m.despesa);
  el('kpiReceita').textContent=fmt(m.receita); el('kpiDespesa').textContent=fmt(m.despesa);
  const kL=el('kpiLucro'); kL.textContent=fmt(m.lucro); kL.className='kpi-val '+(m.lucro>=0?'green':'red');
  el('kpiLucroSub').textContent=fmtPct(m.margemLucro)+' de margem';
  el('kpiRoi').textContent=fmtPct(m.roi); el('kpiEbitda').textContent=fmt(m.ebitda);
  const kV=el('kpiVpl'); kV.textContent=fmt(m.vpl); kV.className='kpi-val '+(m.vpl>=0?'green':'red');
  el('kpiVplSub').textContent=`${m.meses} meses @ ${(m.taxa*100).toFixed(1)}%`;
  el('kpiPayback').textContent=isFinite(m.payback)?`${m.payback.toFixed(1)} meses`:'∞';
  el('kpiGiro').textContent=fmt(m.capitalGiro);
  el('sideRoi').textContent=fmtPct(m.roi); el('sideMargem').textContent=fmtPct(m.margemLucro);
  el('sideVpl').textContent=fmt(m.vpl); el('sideVpl').className=m.vpl>=0?'val-green':'val-red';
  const hS=el('headerSaldo'),hV=el('headerSaldoVal'); hV.textContent=fmt(m.lucro);
  if(m.lucro<0){hS.classList.add('negative');hV.classList.add('negative-val');}
  else{hS.classList.remove('negative');hV.classList.remove('negative-val');}
  makeChart('chartArea',{type:'line',data:{labels:monthly.map(d=>d.mes),datasets:[
    {label:'Receita',data:monthly.map(d=>d.receita),borderColor:CORES.green,backgroundColor:'rgba(106,170,124,0.12)',fill:true,tension:0.4,pointRadius:3,borderWidth:2},
    {label:'Despesa',data:monthly.map(d=>d.despesa),borderColor:CORES.red,backgroundColor:'rgba(201,106,106,0.12)',fill:true,tension:0.4,pointRadius:3,borderWidth:2}
  ]},options:{...CHART_DEFAULTS,responsive:true,maintainAspectRatio:true}});
  const pL=['Moradia','Alimentação','Transporte','Saúde','Serviços','Outros'],pV=[1200,600,250,100,330,Math.max(0,m.despesa-2480)];
  makeChart('chartPie',{type:'doughnut',data:{labels:pL,datasets:[{data:pV,backgroundColor:PIE_CORES,borderWidth:0,hoverOffset:6}]},
    options:{responsive:true,maintainAspectRatio:true,cutout:'60%',plugins:{legend:{position:'bottom',labels:{color:'#b8ad98',font:{size:10},boxWidth:8,padding:8}},
    tooltip:{backgroundColor:'#14121a',titleColor:'#c8b898',bodyColor:'#f0e8d4',borderColor:'rgba(196,161,90,0.25)',borderWidth:1,callbacks:{label:ctx=>` ${ctx.label}: ${fmt(ctx.raw)}`}}}}});
}

function rcRow(l,v,c){return `<div class="calc-row"><span>${l}</span><span style="color:${c||CORES.gold}">${v}</span></div>`;}

function renderCalculos() {
  const m=calcular();
  const jcC=val('jcCapital')||m.investimento, jcT=(val('jcTaxa')||1.2)/100, jcM=val('jcMeses')||24;
  const jcMt=jcC*Math.pow(1+jcT,jcM), jcR=jcMt-jcC;
  const imI=val('imImovel')||m.imovel, imA=val('imAluguel')||m.aluguel, imF=val('imFinanc')||m.financiamento;
  const imM=val('imMeses')||240, imP=imF>0?(imF*m.taxa*Math.pow(1+m.taxa,imM))/(Math.pow(1+m.taxa,imM)-1):0;
  const imY=imI>0?(imA*12/imI)*100:0;
  el('calcRentabilidade').innerHTML=[
    rcRow('Lucro Líquido',fmt(m.lucro),m.lucro>=0?CORES.green:CORES.red),
    rcRow('Margem de Lucro',fmtPct(m.margemLucro),CORES.gold),
    rcRow('ROI',fmtPct(m.roi),CORES.gold),
    rcRow('EBITDA',fmt(m.ebitda),CORES.blue),
    rcRow('Alavancagem',`${m.alavancagem.toFixed(2)}x`,CORES.accent),
    rcRow('Liquidez Corrente',`${m.liquidez.toFixed(2)}x`,'#b8ad98'),
  ].join('');
  el('calcJuros').innerHTML=[
    rcRow('Capital Inicial',fmt(jcC),'#b8ad98'),
    rcRow('Montante Final',fmt(jcMt),CORES.green),
    rcRow('Rendimento Bruto',fmt(jcR),CORES.gold),
    rcRow(`Taxa Efetiva (${jcM}m)`,fmtPct((jcMt/jcC-1)*100),CORES.accent),
  ].join('');
  el('calcImovel').innerHTML=[
    rcRow('Yield Anual',fmtPct(imY),CORES.gold),
    rcRow('Parcela Financiamento',fmt(imP),CORES.red),
    rcRow('Total a Pagar',fmt(imP*imM),CORES.red),
    rcRow('Juros Pagos',fmt(imP*imM-imF),CORES.red),
  ].join('');
  el('calcProjeto').innerHTML=[
    rcRow('VPL',fmt(m.vpl),m.vpl>=0?CORES.green:CORES.red),
    rcRow('TIR Estimada',fmtPct(m.tir*100),CORES.gold),
    rcRow('Payback',isFinite(m.payback)?`${m.payback.toFixed(1)} meses`:'Não viável',CORES.blue),
    rcRow('Break-Even',fmt(m.breakEven),CORES.accent),
    rcRow('Fluxo de Caixa Livre',fmt(m.fluxoLivre),m.fluxoLivre>=0?CORES.green:CORES.red),
    rcRow('Capital de Giro',fmt(m.capitalGiro),'#b8ad98'),
    rcRow('EBITDA',fmt(m.ebitda),CORES.blue),
  ].join('');
}

function renderGraficos() {
  const m=calcular(), monthly=getMonthlyData(m.receita,m.despesa);
  const step=Math.ceil(m.meses/8);
  const jcData=Array.from({length:m.meses},(_,i)=>({mes:`M${i+1}`,montante:m.investimento*Math.pow(1+m.taxa,i+1),capital:m.investimento})).filter((_,i)=>i%step===0||i===m.meses-1);
  makeChart('chartJuros',{type:'line',data:{labels:jcData.map(d=>d.mes),datasets:[
    {label:'Montante',data:jcData.map(d=>d.montante),borderColor:CORES.gold,backgroundColor:'rgba(201,168,76,0.15)',fill:true,tension:0.4,borderWidth:2.5,pointRadius:3},
    {label:'Capital',data:jcData.map(d=>d.capital),borderColor:'#7a7268',backgroundColor:'transparent',borderDash:[4,4],tension:0,borderWidth:1.5,pointRadius:0}
  ]},options:{...CHART_DEFAULTS,responsive:true,maintainAspectRatio:true}});
  makeChart('chartLucroMensal',{type:'bar',data:{labels:monthly.map(d=>d.mes),datasets:[{label:'Lucro',data:monthly.map(d=>d.lucro),backgroundColor:monthly.map(d=>d.lucro>=0?'rgba(106,170,124,0.85)':'rgba(201,106,106,0.85)'),borderRadius:5}]},options:{...CHART_DEFAULTS,responsive:true,maintainAspectRatio:true}});
  makeChart('chartBarRecDesp',{type:'bar',data:{labels:monthly.map(d=>d.mes),datasets:[
    {label:'Receita',data:monthly.map(d=>d.receita),backgroundColor:'rgba(106,170,124,0.8)',borderRadius:4},
    {label:'Despesa',data:monthly.map(d=>d.despesa),backgroundColor:'rgba(201,106,106,0.8)',borderRadius:4}
  ]},options:{...CHART_DEFAULTS,responsive:true,maintainAspectRatio:true}});
  const pL=['Moradia','Alimentação','Transporte','Saúde','Serviços','Outros'],pV=[1200,600,250,100,330,Math.max(10,m.despesa-2480)];
  makeChart('chartPie2',{type:'pie',data:{labels:pL,datasets:[{data:pV,backgroundColor:PIE_CORES,borderWidth:0,hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{position:'right',labels:{color:'#b8ad98',font:{size:11},boxWidth:10,padding:10}},
    tooltip:{backgroundColor:'#14121a',titleColor:'#c8b898',bodyColor:'#f0e8d4',borderColor:'rgba(196,161,90,0.25)',borderWidth:1,callbacks:{label:ctx=>` ${ctx.label}: ${fmt(ctx.raw)}`}}}}});
}

function renderPlanilha() {
  const m=calcular(), monthly=getMonthlyData(m.receita,m.despesa), cols=`140px repeat(12,1fr)`;
  const rows=[{label:'Receita',key:'receita',color:CORES.green},{label:'Despesa',key:'despesa',color:CORES.red},{label:'Lucro',key:'lucro',color:'#e8dfc8'}];
  let html=`<div class="planilha-header" style="grid-template-columns:${cols}"><span>Indicador</span>`;
  MESES.forEach(m=>{html+=`<span style="text-align:center;color:var(--gold)">${m}</span>`;});
  html+=`</div>`;
  rows.forEach((row,ri)=>{
    html+=`<div class="planilha-row" style="background:${ri%2===0?'transparent':'rgba(26,23,20,0.4)'};grid-template-columns:${cols}">`;
    html+=`<span class="planilha-label"><span class="dot" style="background:${row.color}"></span>${row.label}</span>`;
    monthly.forEach(d=>{const v=d[row.key];html+=`<span class="planilha-cell" style="color:${v<0?CORES.red:row.color}">${fmtK(v)}</span>`;});
    html+=`</div>`;
  });
  html+=`<div class="planilha-row" style="background:rgba(201,168,76,0.05);grid-template-columns:${cols}"><span class="planilha-label"><span class="dot" style="background:${CORES.gold}"></span>Margem %</span>`;
  monthly.forEach(d=>{const mg=d.receita>0?d.lucro/d.receita*100:0;html+=`<span class="planilha-cell" style="color:${mg>=0?CORES.gold:CORES.red}">${mg.toFixed(1)}%</span>`;});
  html+=`</div>`;
  let acc=0;
  html+=`<div class="planilha-row" style="grid-template-columns:${cols}"><span class="planilha-label"><span class="dot" style="background:${CORES.blue}"></span>Acumulado</span>`;
  monthly.forEach(d=>{acc+=d.lucro;html+=`<span class="planilha-cell" style="color:${acc>=0?CORES.blue:CORES.red}">${fmtK(acc)}</span>`;});
  html+=`</div>`;
  el('planilhaTable').innerHTML=html;
  const tR=monthly.reduce((a,d)=>a+d.receita,0), tD=monthly.reduce((a,d)=>a+d.despesa,0), tL=monthly.reduce((a,d)=>a+d.lucro,0);
  el('planilhaTotais').innerHTML=[
    {l:'Receita Anual',v:fmt(tR),c:CORES.green},{l:'Despesa Anual',v:fmt(tD),c:CORES.red},
    {l:'Lucro Anual',v:fmt(tL),c:tL>=0?CORES.green:CORES.red},
    {l:'Margem Média',v:fmtPct(tR>0?tL/tR*100:0),c:CORES.gold},
    {l:'ROI Anual',v:fmtPct(m.investimento>0?tL/m.investimento*100:0),c:CORES.blue}
  ].map(t=>`<div class="kpi-card"><p class="kpi-label">${t.l}</p><p class="kpi-val" style="color:${t.c}">${t.v}</p></div>`).join('');
}

const GASTOS_IDS=['g_aluguel','g_mercado','g_transporte','g_saude','g_internet','g_contas','g_lazer','g_compras','g_dividas','g_outros'];
const GASTOS_LABELS=['Moradia','Alimentação','Transporte','Saúde','Serviços','Contas','Lazer','Compras','Dívidas','Outros'];

function calcPessoal(){const renda=val('pessoalRenda')||0,gastos=GASTOS_IDS.map(id=>val(id)||0),totalGasto=gastos.reduce((a,b)=>a+b,0),sobra=renda-totalGasto,meta=val('metaEconomia')||0;return{renda,gastos,totalGasto,sobra,meta};}

function getMensagem(sobra,renda){
  if(renda===0)return'👆 Coloque quanto você ganha para começar!';
  const pct=renda>0?sobra/renda*100:0;
  if(sobra<0)return`🚨 Você está gastando ${fmt(Math.abs(sobra))} a mais do que ganha! Precisa cortar gastos.`;
  if(pct<5)return`⚠️ Você quase não está sobrando nada. Tente cortar pelo menos um gasto pequeno.`;
  if(pct<15)return`😐 Está sobrando pouco. Tente guardar pelo menos ${fmt(renda*0.1)} por mês.`;
  if(pct<30)return`👍 Você está no caminho certo! Tente guardar parte do que sobra.`;
  if(pct<50)return`✅ Ótimo! Você está economizando bem. Considere investir o que sobra.`;
  return`🌟 Excelente! Você está economizando mais da metade da sua renda. Continue assim!`;
}

function renderPessoal(){
  const{renda,gastos,totalGasto,sobra,meta}=calcPessoal();
  el('res_renda').textContent=fmt(renda); el('res_gasto').textContent=fmt(totalGasto);
  const rS=el('res_sobra'); rS.textContent=fmt(sobra); rS.style.color=sobra>=0?CORES.green:CORES.red;
  el('mensagemTexto').textContent=getMensagem(sobra,renda);
  const pctMeta=meta>0&&sobra>0?Math.min(100,(sobra/meta)*100):0;
  el('metaFill').style.width=pctMeta+'%';
  el('metaTexto').textContent=meta>0?`${pctMeta.toFixed(0)}% da meta — sobram ${fmt(sobra)} de ${fmt(meta)} necessários`:'Defina uma meta acima';
  const dicas=[];
  if(gastos[0]/renda>0.35)dicas.push({icon:'🏠',titulo:'Aluguel alto',texto:`Seu aluguel representa ${(gastos[0]/renda*100).toFixed(0)}% da renda. O ideal é até 30%.`});
  if(gastos[1]/renda>0.20)dicas.push({icon:'🛒',titulo:'Alimentação',texto:'Tente fazer mais refeições em casa para economizar.'});
  if(gastos[6]/renda>0.10)dicas.push({icon:'🎮',titulo:'Lazer',texto:'Seus gastos com lazer estão acima de 10% da renda. Tudo bem se estiver sobrando!'});
  if(sobra>0&&sobra/renda>0.2)dicas.push({icon:'📈',titulo:'Hora de investir!',texto:`Você tem ${fmt(sobra)} sobrando. Que tal guardar em uma conta que rende juros?`});
  if(gastos[8]>0)dicas.push({icon:'💳',titulo:'Dívidas',texto:`Você tem ${fmt(gastos[8])} em parcelas. Tente quitá-las para liberar dinheiro.`});
  if(dicas.length===0)dicas.push({icon:'🌟',titulo:'Tudo certo!',texto:'Seus gastos parecem equilibrados. Continue assim!'});
  el('dicasGrid').innerHTML=dicas.slice(0,3).map(d=>`<div class="dica-card"><span class="dica-icon">${d.icon}</span><div class="dica-titulo">${d.titulo}</div><div class="dica-texto">${d.texto}</div></div>`).join('');
  const pieVals=GASTOS_IDS.map((id,i)=>({label:GASTOS_LABELS[i],val:val(id)||0})).filter(d=>d.val>0);
  makeChart('chartPessoalPizza',{type:'doughnut',data:{labels:pieVals.map(d=>d.label),datasets:[{data:pieVals.map(d=>d.val),backgroundColor:PIE_CORES,borderWidth:0,hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:true,cutout:'55%',plugins:{
      legend:{position:'bottom',labels:{color:'#b8ad98',font:{size:11},boxWidth:8,padding:8}},
      tooltip:{backgroundColor:'#14121a',titleColor:'#c8b898',bodyColor:'#f0e8d4',borderColor:'rgba(196,161,90,0.25)',borderWidth:1,
        callbacks:{label:ctx=>` ${ctx.label}: ${fmt(ctx.raw)} (${(ctx.raw/totalGasto*100).toFixed(1)}%)`}}}}});
}

// ── TRANSACTIONS ─────────────────────────────────────────────────────────
let transactions=[
  {id:1,desc:'Salário Mensal',cat:'Serviços Prestados',val:12000,tipo:'entrada',status:'pago',vencimento:'',dataComp:'2026-03-23',formaPag:'PIX',centro:'Financeiro',nf:'',parcelas:1,valPago:12000,recorrencia:'mensal',obs:''},
  {id:2,desc:'Venda Produto X',cat:'Vendas',val:4500,tipo:'entrada',status:'pago',vencimento:'',dataComp:'2026-03-23',formaPag:'PIX',centro:'Comercial / Vendas',nf:'NF-000210',parcelas:1,valPago:4500,recorrencia:'unica',obs:''},
  {id:3,desc:'Aluguel Comercial',cat:'Aluguel',val:-3800,tipo:'saida',status:'pago',vencimento:'2026-03-23',dataComp:'2026-03-23',formaPag:'Boleto Bancário',centro:'Administrativo',nf:'',parcelas:1,valPago:3800,recorrencia:'mensal',obs:'Contrato até dez/2026'},
  {id:4,desc:'Folha de Pagamento',cat:'Folha de Pagamento',val:-8200,tipo:'saida',status:'pago',vencimento:'2026-03-23',dataComp:'2026-03-23',formaPag:'Transferência Bancária (TED/DOC)',centro:'RH / Pessoal',nf:'',parcelas:1,valPago:8200,recorrencia:'mensal',obs:''},
  {id:5,desc:'DAS Simples Nacional',cat:'DAS / Simples',val:-950,tipo:'saida',status:'pendente',vencimento:'2026-03-31',dataComp:'2026-03-23',formaPag:'Boleto Bancário',centro:'Financeiro',nf:'',parcelas:1,valPago:0,recorrencia:'mensal',obs:''},
  {id:6,desc:'Energia Elétrica',cat:'Energia / Água / Gás',val:-480,tipo:'saida',status:'vencida',vencimento:'2026-03-10',dataComp:'2026-03-23',formaPag:'Débito Automático',centro:'Administrativo',nf:'',parcelas:1,valPago:0,recorrencia:'mensal',obs:''},
  {id:7,desc:'Software CRM Anual',cat:'TI / Tecnologia',val:-2400,tipo:'saida',status:'pago',vencimento:'2026-03-23',dataComp:'2026-03-23',formaPag:'Cartão de Crédito',centro:'TI / Tecnologia',nf:'NF-002341',parcelas:12,valPago:2400,recorrencia:'anual',obs:'Renovação anual'},
  {id:8,desc:'Aporte Capital Giro',cat:'Investimento em Equipamento',val:-10000,tipo:'investimento',status:'pago',vencimento:'',dataComp:'2026-03-23',formaPag:'Transferência Bancária (TED/DOC)',centro:'Financeiro',nf:'',parcelas:1,valPago:10000,recorrencia:'unica',obs:''},
  {id:9,desc:'Conta de Internet',cat:'Internet / Telefone',val:-290,tipo:'saida',status:'agendado',vencimento:'2026-04-05',dataComp:'2026-03-23',formaPag:'Débito Automático',centro:'Administrativo',nf:'',parcelas:1,valPago:0,recorrencia:'mensal',obs:''},
  {id:10,desc:'Campanha Google Ads',cat:'Marketing / Publicidade',val:-1800,tipo:'saida',status:'pago',vencimento:'2026-03-23',dataComp:'2026-03-23',formaPag:'Cartão de Crédito',centro:'Marketing',nf:'',parcelas:1,valPago:1800,recorrencia:'mensal',obs:'Campanha Q1'},
];

let editingId=null;

function toggleDespesaFields(){
  const tipo=el('txTipo')?.value;
  const df=el('despesaFields');
  if(df) df.style.display=(tipo==='saida')?'block':'none';
}

function updateStatusColor(){}

function deleteTx(id){
  if(!confirm('Excluir este lançamento?'))return;
  transactions=transactions.filter(t=>t.id!==id);
  renderTransactions();
}

function startEdit(id){
  const tx=transactions.find(t=>t.id===id);
  if(!tx)return;
  editingId=id;
  el('txTipo').value=tx.tipo; toggleDespesaFields();
  el('txDesc').value=tx.desc;
  const catSel=el('txCat');
  for(let i=0;i<catSel.options.length;i++){ if(catSel.options[i].text===tx.cat||catSel.options[i].value===tx.cat){ catSel.selectedIndex=i; break; } }
  el('txVal').value=Math.abs(tx.val);
  el('txDataComp').value=tx.dataComp||'';
  if(tx.tipo==='saida'){
    if(el('txVencimento'))el('txVencimento').value=tx.vencimento||'';
    if(el('txStatus'))el('txStatus').value=tx.status||'pendente';
    if(el('txFormaPag')){ const s=el('txFormaPag'); for(let i=0;i<s.options.length;i++){if(s.options[i].text===tx.formaPag){s.selectedIndex=i;break;}} }
    if(el('txCentro')){ const s=el('txCentro'); for(let i=0;i<s.options.length;i++){if(s.options[i].text===tx.centro||s.options[i].value===tx.centro){s.selectedIndex=i;break;}} }
    if(el('txNF'))el('txNF').value=tx.nf||'';
    if(el('txParcelamento'))el('txParcelamento').value=String(tx.parcelas||1);
    if(el('txValPago'))el('txValPago').value=tx.valPago||0;
    if(el('txRecorrencia'))el('txRecorrencia').value=tx.recorrencia||'unica';
    if(el('txObs'))el('txObs').value=tx.obs||'';
  }
  el('addForm').style.display='block';
  el('btnSaveTx').textContent='✔ Atualizar';
  el('addForm').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function saveTx(){
  const desc=el('txDesc').value.trim();
  const v=parseFloat(el('txVal').value);
  const tipo=el('txTipo').value;
  const catSel=el('txCat');
  const cat=catSel.selectedIndex>0?catSel.options[catSel.selectedIndex].text:catSel.value||'Geral';
  const dataComp=el('txDataComp').value||'';
  if(!desc||!v){alert('Preencha ao menos descrição e valor.');return;}
  const realVal=tipo==='saida'?-Math.abs(v):Math.abs(v);

  const isDespesa=tipo==='saida';
  const getT=(id)=>el(id)?el(id).value:'';
  const getOptT=(id)=>{const s=el(id);return s&&s.selectedIndex>=0?s.options[s.selectedIndex].text:'';};

  const txData={
    desc, cat, val:realVal, tipo, dataComp,
    status: isDespesa?(getT('txStatus')||'pendente'):'pago',
    vencimento: isDespesa?getT('txVencimento'):'',
    formaPag: isDespesa?getOptT('txFormaPag'):'',
    centro: isDespesa?getOptT('txCentro'):'',
    nf: isDespesa?getT('txNF'):'',
    parcelas: isDespesa?parseInt(getT('txParcelamento')||'1'):1,
    valPago: isDespesa?parseFloat(getT('txValPago')||'0'):Math.abs(v),
    recorrencia: isDespesa?getT('txRecorrencia'):'unica',
    obs: isDespesa?getT('txObs'):'',
  };

  if(editingId!==null){
    transactions=transactions.map(t=>t.id===editingId?{...txData,id:editingId}:t);
    editingId=null; el('btnSaveTx').textContent='✔ Salvar Lançamento';
  } else {
    transactions.push({...txData,id:Date.now()});
  }
  resetForm();
  renderTransactions();
}

function resetForm(){
  ['txDesc','txVal','txDataComp','txVencimento','txNF','txValPago','txObs'].forEach(id=>{if(el(id))el(id).value='';});
  if(el('txTipo'))el('txTipo').value='saida';
  if(el('txStatus'))el('txStatus').value='pendente';
  if(el('txCat'))el('txCat').selectedIndex=0;
  if(el('txFormaPag'))el('txFormaPag').selectedIndex=0;
  if(el('txCentro'))el('txCentro').selectedIndex=0;
  if(el('txParcelamento'))el('txParcelamento').value='1';
  if(el('txRecorrencia'))el('txRecorrencia').value='unica';
  el('addForm').style.display='none';
  toggleDespesaFields();
  editingId=null;
}

function statusLabel(s){
  const map={pago:'✅ Pago',pendente:'⏳ Pendente',vencida:'🔴 Vencida',agendado:'📅 Agendado',parcial:'⚡ Parcial'};
  return map[s]||'—';
}

function fmtDate(d){
  if(!d)return '—';
  const parts=d.split('-');
  if(parts.length<3)return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function renderTransactions(){
  const filtro=el('txFiltro')?el('txFiltro').value:'todos';
  let list=transactions;
  if(filtro==='entrada')list=transactions.filter(t=>t.tipo==='entrada');
  else if(filtro==='saida')list=transactions.filter(t=>t.tipo==='saida');
  else if(filtro==='investimento')list=transactions.filter(t=>t.tipo==='investimento');
  else if(filtro==='vencida')list=transactions.filter(t=>t.status==='vencida');
  else if(filtro==='pendente')list=transactions.filter(t=>t.status==='pendente');
  else if(filtro==='pago')list=transactions.filter(t=>t.status==='pago');

  const entradas=transactions.filter(t=>t.val>0).reduce((a,b)=>a+b.val,0);
  const saidas=Math.abs(transactions.filter(t=>t.val<0).reduce((a,b)=>a+b.val,0));
  const saldo=transactions.reduce((a,b)=>a+b.val,0);
  const vencidas=Math.abs(transactions.filter(t=>t.status==='vencida').reduce((a,b)=>a+b.val,0));
  const in30=new Date(); in30.setDate(in30.getDate()+30);
  const aVencer=Math.abs(transactions.filter(t=>{
    if(t.tipo!=='saida'||!t.vencimento)return false;
    const d=new Date(t.vencimento+'T00:00:00');
    return d>=new Date()&&d<=in30&&t.status!=='pago';
  }).reduce((a,b)=>a+b.val,0));

  el('txTotalEntrada').textContent=fmt(entradas);
  el('txTotalSaida').textContent=fmt(saidas);
  const ts=el('txSaldo'); ts.textContent=fmt(saldo); ts.className='kpi-val '+(saldo>=0?'green':'red');
  if(el('txVencidas'))el('txVencidas').textContent=fmt(vencidas);
  if(el('txAVencer'))el('txAVencer').textContent=fmt(aVencer);

  el('txList').innerHTML=list.map(tx=>{
    const sClass='s-'+(tx.status||'na');
    const sLbl=statusLabel(tx.status);
    const valColor=tx.val>=0?'var(--green)':'var(--red)';
    const valPagoStr=tx.tipo==='saida'?`${fmt(tx.valPago||0)}`:'-';
    const parcStr=tx.tipo==='saida'&&tx.parcelas>1?`${tx.parcelas}x`:'-';
    return `<div class="table-row-tx">
      <span title="${tx.desc}" style="color:var(--cream);font-weight:600">${tx.desc}${tx.obs?`<br><span style="font-size:10px;color:var(--cream-dim)">${tx.obs}</span>`:''}</span>
      <span style="color:var(--cream-dim)">${tx.cat}</span>
      <span style="color:var(--cream-dim)">${fmtDate(tx.vencimento)}</span>
      <span><span class="status-badge ${sClass}">${sLbl}</span></span>
      <span style="color:var(--cream-dim);font-size:11px">${tx.formaPag||'—'}</span>
      <span style="color:var(--cream-dim);font-size:11px">${tx.centro||'—'}</span>
      <span style="color:var(--cream-dim)">${parcStr}</span>
      <span style="color:${valColor};font-weight:700;font-family:var(--mono)">${fmt(tx.val)}</span>
      <span style="display:flex;gap:5px;justify-content:flex-end">
        <button onclick="startEdit(${tx.id})" title="Editar" class="btn-icon">✎</button>
        <button onclick="deleteTx(${tx.id})" title="Excluir" class="btn-icon btn-icon-red">✕</button>
      </span>
    </div>`;
  }).join('')||'<div style="padding:24px;text-align:center;color:var(--cream-dim)">Nenhum lançamento encontrado.</div>';
}

let currentTab='pessoal';
function switchTab(tabId){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const tE=el('tab-'+tabId),bE=document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
  if(tE)tE.classList.add('active'); if(bE)bE.classList.add('active');
  currentTab=tabId;
  if(tabId==='pessoal')renderPessoal();
  if(tabId==='dashboard')renderDashboard();
  if(tabId==='calculos')renderCalculos();
  if(tabId==='graficos')renderGraficos();
  if(tabId==='planilha')renderPlanilha();
  if(tabId==='lancamentos')renderTransactions();
}

function switchNicho(nicho){
  document.querySelectorAll('.nicho-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.nicho-btn[data-nicho="${nicho}"]`)?.classList.add('active');
  const nL=el('nichoLabel'); if(nL)nL.textContent=nicho;
  rerender();
}

function rerender(){
  if(currentTab==='pessoal')renderPessoal();
  if(currentTab==='dashboard')renderDashboard();
  if(currentTab==='calculos')renderCalculos();
  if(currentTab==='graficos')renderGraficos();
  if(currentTab==='planilha')renderPlanilha();
}

function debounce(fn,ms){let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),ms);};}
const dRerender=debounce(rerender,300);

document.addEventListener('DOMContentLoaded',()=>{
  loadData(); // Carrega os dados salvos ao iniciar
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
  document.querySelectorAll('.nicho-btn').forEach(btn=>btn.addEventListener('click',()=>switchNicho(btn.dataset.nicho)));
  el('portfolioName')?.addEventListener('input',e=>{el('portfolioNameDisplay').textContent=e.target.value||'Meu Portfólio';});
  ['pReceita','pDespesa','pInvestimento','pTaxa','pMeses','pAluguel','pImovel','pFinanciamento'].forEach(id=>el(id)?.addEventListener('input',dRerender));
  ['jcCapital','jcTaxa','jcMeses','imImovel','imAluguel','imFinanc','imMeses'].forEach(id=>el(id)?.addEventListener('input',dRerender));
  el('pessoalRenda')?.addEventListener('input',dRerender);
  el('metaEconomia')?.addEventListener('input',dRerender);
  GASTOS_IDS.forEach(id=>el(id)?.addEventListener('input',dRerender));
  el('btnShowAdd')?.addEventListener('click',()=>{
    const f=el('addForm');
    if(f.style.display==='block'){resetForm();}
    else{f.style.display='block'; toggleDespesaFields();}
  });
  el('btnCancelTx')?.addEventListener('click',resetForm);
  el('btnSaveTx')?.addEventListener('click',saveTx);
  el('txFiltro')?.addEventListener('change',renderTransactions);
  
  // Eventos para os novos botões
  document.querySelectorAll('.btn-save-local').forEach(btn => btn.addEventListener('click', saveData));
  document.querySelectorAll('.btn-print').forEach(btn => btn.addEventListener('click', printReport));
  
  switchTab('pessoal'); // Inicia na tab pessoal
  rerender(); // Renderiza os dados carregados
});
