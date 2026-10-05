// ============================================================
// Pendências ERO — controle de pendências por área
// Páginas: Painel · Britagem · Moagem · Flotação · Relatórios
// Dados: localStorage (chave única), edição inline sem modal.
// ============================================================

const CHAVE = 'pendencias_ero_v1';

const AREAS = [
  {k:'britagem', nome:'BRITAGEM', rotulo:'Britagem', pref:'BRT'},
  {k:'moagem',   nome:'MOAGEM',   rotulo:'Moagem',   pref:'MOA'},
  {k:'flotacao', nome:'FLOTAÇÃO', rotulo:'Flotação', pref:'FLO'}
];

const RESP = ['', 'ELÉTRICA', 'MECÂNICA', 'INSTRUMENTAÇÃO', 'OPERAÇÃO', 'OUTROS'];

const DADOS_PADRAO = {
  areas: {
    britagem: { pend: [
      {id:'b1', num:1, tag:'CR-002', desc:'Desgaste acentuado dos revestimentos (avaliar troca)', data:'2026-09-24', prazo:'2026-10-10', status:'pendente', prio:'alta', resp:'MECÂNICA', obs:'Episódios de material não britável em 22 e 24/09 — inspeção mecânica agendada', concluido_em:''},
      {id:'b2', num:2, tag:'CR-003', desc:'Paradas pelo intertravamento (câmara vazia + FE parado + PW baixa)', data:'2026-09-28', prazo:'2026-10-03', status:'andamento', prio:'alta', resp:'ELÉTRICA', obs:'Lógica de intertravamento de 20 min em análise com a elétrica', concluido_em:''},
      {id:'b3', num:3, tag:'CV-001', desc:'Obstrução recorrente do chute (LSH em projeção)', data:'2026-10-01', prazo:'2026-10-08', status:'pendente', prio:'media', resp:'OPERAÇÃO', obs:'Limpeza programada para a próxima parada', concluido_em:''},
      {id:'b4', num:4, tag:'PEN-01', desc:'Troca de telas do deck superior', data:'2026-09-30', prazo:'', status:'concluida', prio:'media', resp:'MECÂNICA', obs:'Trocadas em 30/09 — deck normalizado', concluido_em:'2026-09-30'}
    ]},
    moagem: { pend: [
      {id:'m1', num:1, tag:'MOI-01', desc:'Sensor de nível do silo com leitura intermitente', data:'2026-10-02', prazo:'2026-10-12', status:'pendente', prio:'media', resp:'INSTRUMENTAÇÃO', obs:'Verificar com instrumentação', concluido_em:''},
      {id:'m2', num:2, tag:'CIC-02', desc:'Liner desgastado (programar troca)', data:'2026-09-29', prazo:'', status:'andamento', prio:'media', resp:'MECÂNICA', obs:'Sobressalente em estoque — aguardando janela', concluido_em:''},
      {id:'m3', num:3, tag:'BP-05', desc:'Vazamento na gaxeta', data:'2026-09-26', prazo:'', status:'concluida', prio:'alta', resp:'MECÂNICA', obs:'Corrigido pela mecânica em 26/09', concluido_em:'2026-09-26'}
    ]},
    flotacao: { pend: [
      {id:'f1', num:1, tag:'JA-01/02', desc:'Distribuidores de água danificados (Jameson 01 e 02)', data:'2026-10-03', prazo:'2026-10-15', status:'pendente', prio:'alta', resp:'MECÂNICA', obs:'Aquisição de sobressalentes em andamento', concluido_em:''},
      {id:'f2', num:2, tag:'JA-01/02', desc:'Downcomers sem conexão — 03 no Jameson 01 e 01 no Jameson 02', data:'2026-10-03', prazo:'', status:'pendente', prio:'media', resp:'OPERAÇÃO', obs:'Aguardando conexões', concluido_em:''},
      {id:'f3', num:3, tag:'FC-012', desc:'Preventiva do acoplamento do rotor', data:'2026-09-25', prazo:'2026-10-20', status:'andamento', prio:'media', resp:'MECÂNICA', obs:'Aguardando programação da manutenção', concluido_em:''},
      {id:'f4', num:4, tag:'PU-020R', desc:'Sucção travada (indisponível)', data:'2026-09-30', prazo:'2026-10-07', status:'pendente', prio:'alta', resp:'MECÂNICA', obs:'Mecânica corretiva ciente', concluido_em:''},
      {id:'f5', num:5, tag:'FC-026', desc:'4230-LCV-0072 Dardo B fora de serviço', data:'2026-09-28', prazo:'', status:'andamento', prio:'alta', resp:'INSTRUMENTAÇÃO', obs:'Aguardando peça', concluido_em:''}
    ]}
  }
};

// ---------- estado ----------
let S = carregar();
let pagina = 'painel';
let tSalvar = null;
let icone = null;
const filtros = {britagem:'todas', moagem:'todas', flotacao:'todas'};
const novaStatus = {britagem:'pendente', moagem:'pendente', flotacao:'pendente'};

function carregar(){
  let s = null;
  try{
    const v = localStorage.getItem(CHAVE);
    if (v) s = JSON.parse(v);
  }catch(e){}
  if (!s) s = JSON.parse(JSON.stringify(DADOS_PADRAO));
  return migrar(s);
}

// completa pendências antigas com os campos novos (num, tag, resp, concluido_em)
function migrar(base){
  for (const a of AREAS){
    const lista = (base.areas[a.k] && base.areas[a.k].pend) || [];
    let prox = 1;
    for (const p of lista){
      if (!p.num) p.num = prox;
      if (p.num >= prox) prox = p.num + 1;
      if (p.tag === undefined) p.tag = '';
      if (p.resp === undefined) p.resp = '';
      if (p.concluido_em === undefined) p.concluido_em = (p.status === 'concluida') ? (p.data || '') : '';
    }
  }
  return base;
}

function salvarLocal(){
  localStorage.setItem(CHAVE, JSON.stringify(S));
  const el = document.getElementById('ult');
  if (el) el.textContent = 'Salvo em ' + new Date().toLocaleTimeString('pt-BR');
}
function agendarSalvar(){
  clearTimeout(tSalvar);
  tSalvar = setTimeout(salvarLocal, 400);
}

// ---------- utilidades ----------
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function isoHoje(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function isoToBR(iso){ if(!iso) return '—'; const [a,m,d]=iso.split('-'); return d+'/'+m+'/'+a; }
function hojeBR(){ return isoToBR(isoHoje()); }
function semanaISO(){
  const d = new Date(); d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - ((d.getDay()+6) % 7));
  const sem1 = new Date(d.getFullYear(), 0, 4);
  const n = 1 + Math.round(((d - sem1) / 86400000 - 3 + ((sem1.getDay()+6) % 7)) / 7);
  return 'SEMANA ' + n;
}

function pendDe(area){ return S.areas[area].pend; }
// contêiner da página da área (as páginas ficam no DOM escondidas —
// buscas por id precisam ser escopadas, senão pegam a área errada)
function contArea(k){ return document.getElementById({britagem:'brt',moagem:'moa',flotacao:'flo'}[k]); }
function atrasada(p){ return !!(p.prazo && p.prazo < isoHoje() && p.status !== 'concluida'); }

// idade (aging) desde a data de registro, em dias
function idadeDias(p){
  if (!p.data) return 0;
  const d = new Date(p.data + 'T12:00:00');
  const h = new Date(isoHoje() + 'T12:00:00');
  return Math.max(0, Math.round((h - d) / 86400000));
}
function idadeInfo(p){
  if (p.status === 'concluida') return null;
  const d = idadeDias(p);
  if (d <= 7) return {txt: d + 'd', cor: 'verde'};
  if (d <= 15) return {txt: d + 'd', cor: 'amarelo'};
  if (d <= 30) return {txt: d + 'd', cor: 'laranja'};
  return {txt: d + 'd', cor: 'vermelho'};
}
function numTxt(area, p){
  const a = AREAS.find(x=>x.k===area);
  return (a ? a.pref : 'PEN') + '-' + String(p.num || 0).padStart(2, '0');
}
function noPrazo(p){
  // concluída dentro do prazo (ou sem prazo definido conta como no prazo)
  if (p.status !== 'concluida') return null;
  if (!p.prazo) return true;
  return (p.concluido_em || p.data) <= p.prazo;
}

function infoStatus(p){
  if (atrasada(p)) return {txt:'FORA DO PRAZO', cor:'vermelho'};
  if (p.status === 'pendente') return {txt:'PENDENTE', cor:'amarelo'};
  if (p.status === 'andamento') return {txt:'EM ANDAMENTO', cor:'azul'};
  return {txt:'CONCLUÍDA', cor:'verde'};
}

function ordem(p){
  if (atrasada(p)) return 0;
  if (p.status === 'pendente') return 1;
  if (p.status === 'andamento') return 2;
  return 3;
}
function ordenarPend(lista){
  return lista.slice().sort((a,b)=> ordem(a)-ordem(b) || (b.data||'').localeCompare(a.data||''));
}

function badge(cor, txt){
  const mapa = {verde:'verde', amarelo:'amarelo', vermelho:'vermelho', azul:'azul', laranja:'laranja'};
  return `<span class="bdg ${mapa[cor]||'neutro'}"><span class="dot"></span>${esc(txt)}</span>`;
}

// ---------- navegação ----------
function navegar(pg){
  pagina = pg;
  document.querySelectorAll('.page').forEach(p=>p.style.display='none');
  document.getElementById('page-'+pg).style.display='';
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('ativo', b.dataset.page===pg));
  renderPagina();
  window.scrollTo(0,0);
}
function renderPagina(){
  if (pagina==='painel') renderPainel();
  else if (pagina==='britagem' || pagina==='moagem' || pagina==='flotacao') renderArea(pagina);
  else if (pagina==='relatorios') renderRelatorios();
}

document.addEventListener('click', e=>{
  const nav = e.target.closest('.navbtn');
  if (nav){ navegar(nav.dataset.page); return; }
  const del = e.target.closest('.pcard .pdel');
  if (del){
    const card = del.closest('.pcard');
    delPend(card.dataset.area, card.dataset.id, del);
    return;
  }
  const seg = e.target.closest('.pcard .segbtn');
  if (seg){
    const card = seg.closest('.pcard');
    const p = pendDe(card.dataset.area).find(x=>x.id===card.dataset.id);
    if (p){
      const antes = p.status;
      p.status = seg.dataset.val;
      // data de conclusão automática (modelo: data de sanação registrada)
      if (seg.dataset.val === 'concluida' && antes !== 'concluida') p.concluido_em = isoHoje();
      if (seg.dataset.val !== 'concluida' && antes === 'concluida') p.concluido_em = '';
      agendarSalvar();
    }
    renderArea(card.dataset.area);
    return;
  }
  const nseg = e.target.closest('#nf-status .segbtn');
  if (nseg){
    contArea(pagina).querySelectorAll('#nf-status .segbtn').forEach(b=>b.classList.toggle('on', b===nseg));
    novaStatus[pagina] = nseg.dataset.val;
    return;
  }
  const chip = e.target.closest('.chip');
  if (chip){
    filtros[pagina] = chip.dataset.f;
    renderArea(pagina);
    return;
  }
  const pendRow = e.target.closest('.pend');
  if (pendRow && pendRow.dataset.area) navegar(pendRow.dataset.area);
});

document.addEventListener('input', e=>{
  // limpa a mensagem de erro do formulário quando volta a digitar na descrição
  if (e.target && e.target.id === 'nf-desc'){
    const pg = e.target.closest('.page');
    const msg = pg && pg.querySelector('#nf-msg');
    if (msg){ msg.style.display = 'none'; }
    e.target.style.outline = '';
  }
  const inp = e.target.closest('[data-campo]');
  if (!inp) return;
  const card = inp.closest('.pcard');
  if (!card) return;
  const p = pendDe(card.dataset.area).find(x=>x.id===card.dataset.id);
  if (!p) return;
  p[inp.dataset.campo] = inp.value;
  agendarSalvar();
  if (inp.dataset.campo==='data' || inp.dataset.campo==='prazo' || inp.dataset.campo==='status') atualizarCardVisual(card);
});

document.addEventListener('keydown', e=>{
  if (e.key === 'Enter' && e.target && e.target.id === 'nf-desc'){
    e.preventDefault();
    addPend(pagina);
  }
});

document.addEventListener('change', e=>{
  const sel = e.target.closest('select[data-campo]');
  if (!sel) return;
  const card = sel.closest('.pcard');
  if (!card) return;
  const p = pendDe(card.dataset.area).find(x=>x.id===card.dataset.id);
  if (!p) return;
  p[sel.dataset.campo] = sel.value;
  agendarSalvar();
  if (sel.dataset.campo === 'prio') sel.className = 'sel-prio p-' + sel.value;
});

// ---------- PAINEL ----------
function renderPainel(){
  let tot=0, pend=0, and=0, conc=0, atr=0, np=0, npTot=0;
  const faixas = {f7:0, f15:0, f30:0, f30p:0};
  const porArea = {};
  for (const a of AREAS){
    const lista = pendDe(a.k);
    let ab=0, c=0, at=0;
    for (const p of lista){
      tot++;
      if (p.status==='concluida'){
        c++; conc++;
        const r = noPrazo(p);
        if (r !== null){ npTot++; if (r) np++; }
      } else {
        ab++;
        if (p.status==='pendente') pend++; else and++;
        if (atrasada(p)) atr++;
        const d = idadeDias(p);
        if (d<=7) faixas.f7++; else if (d<=15) faixas.f15++; else if (d<=30) faixas.f30++; else faixas.f30p++;
      }
      if (atrasada(p)) at++;
    }
    porArea[a.k] = {ab, c, at};
  }

  const stats = `<div class="grid g4">
    <div class="stat"><div class="lbl">Pendências</div><div class="num">${tot}</div></div>
    <div class="stat"><div class="lbl">Pendentes</div><div class="num amarelo">${pend}</div></div>
    <div class="stat"><div class="lbl">Em andamento</div><div class="num azul">${and}</div></div>
    <div class="stat"><div class="lbl">Concluídas</div><div class="num verde">${conc}</div></div>
    <div class="stat"><div class="lbl">Atrasadas</div><div class="num vermelho">${atr}</div></div>
    <div class="stat"><div class="lbl">Concl. no prazo</div><div class="num verde">${npTot ? np+'/'+npTot : '—'}</div></div>
  </div>`;

  const aging = `<div class="grid g4">
    <div class="stat"><div class="lbl">0–7 dias</div><div class="num verde">${faixas.f7}</div></div>
    <div class="stat"><div class="lbl">8–15 dias</div><div class="num amarelo">${faixas.f15}</div></div>
    <div class="stat"><div class="lbl">16–30 dias</div><div class="num laranja">${faixas.f30}</div></div>
    <div class="stat"><div class="lbl">30+ dias (crítico)</div><div class="num vermelho">${faixas.f30p}</div></div>
  </div>`;

  const pills = AREAS.map(a=>{
    const r = porArea[a.k];
    const cor = r.at>0 ? 'vermelho' : (r.ab>0 ? 'amarelo' : 'verde');
    return `<div class="pill ${cor}">
      <div class="r">${a.nome}</div>
      <div class="v">${r.ab}/${r.ab+r.c}</div>
      <div class="s">${r.ab} abertas · ${r.c} concluídas${r.at? ' · '+r.at+' atrasadas':''}</div>
    </div>`;
  }).join('');

  // pendências em aberto (verdes não aparecem)
  const abertas = [];
  for (const a of AREAS)
    for (const p of pendDe(a.k))
      if (p.status !== 'concluida') abertas.push({area:a.k, nome:a.nome, p});
  abertas.sort((x,y)=> ordem(x.p)-ordem(y.p) || (y.p.data||'').localeCompare(x.p.data||''));
  const lista = abertas.length
    ? abertas.map((x,i)=>{
        const st = infoStatus(x.p);
        const id = idadeInfo(x.p);
        return `<div class="pend" data-area="${x.area}" style="cursor:pointer">
          <div class="n">${i+1}</div>
          <div class="dets">
            <div class="t"><span class="area-tag">${x.nome}</span> <span class="pnumref">${numTxt(x.area, x.p)}</span> ${x.p.tag? '<b>'+esc(x.p.tag)+'</b> — ':''}${esc(x.p.desc)}</div>
            <div class="m">${badge(st.cor, st.txt)} ${id? badge(id.cor, id.txt):''} <span>Data: ${isoToBR(x.p.data)}</span>${x.p.prazo?` <span>Prazo: ${isoToBR(x.p.prazo)}</span>`:''}${x.p.resp?` <span>Resp: ${esc(x.p.resp)}</span>`:''}</div>
          </div>
        </div>`;
      }).join('')
    : `<div class="vazio">Nenhuma pendência em aberto. ✅</div>`;

  document.getElementById('pnl').innerHTML = `
    ${stats}
    <div class="card"><h2>Idade das pendências abertas (aging)</h2>${aging}</div>
    <div class="card"><h2>Por área</h2><div class="pills">${pills}</div></div>
    <div class="card"><h2>Pendências em aberto</h2>${lista}</div>`;
}

// ---------- ÁREA (Britagem / Moagem / Flotação) ----------
function renderArea(k){
  const a = AREAS.find(x=>x.k===k);
  const lista = pendDe(k);
  const form = `<div class="card">
    <h2>Nova pendência — ${a.nome}</h2>
    <div class="prow1" style="display:flex;gap:8px;margin-bottom:10px;">
      <input type="text" id="nf-desc" placeholder="O QUE ESTÁ PENDENTE — ex.: vazamento na bomba de polpa" style="flex:1;font-weight:700;font-size:14px;">
    </div>
    <div class="prow2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <label>Data<input type="date" id="nf-data" value="${isoHoje()}"></label>
      <label>Prazo (opcional)<input type="date" id="nf-prazo"></label>
    </div>
    <div class="prow2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <label>Equipamento / TAG (opcional)<input type="text" id="nf-tag" placeholder="ex.: CR-002"></label>
      <label>Responsável
        <select id="nf-resp">
          ${RESP.map(r=>`<option value="${r}" ${r===''?'selected':''}>${r||'— (sem responsável)'}</option>`).join('')}
        </select>
      </label>
    </div>
    <label style="margin-bottom:6px;">Status</label>
    <div class="seg" id="nf-status" style="margin-bottom:10px;">
      <button class="segbtn amarelo ${novaStatus[k]==='pendente'?'on':''}" data-val="pendente">PENDENTE</button>
      <button class="segbtn azul ${novaStatus[k]==='andamento'?'on':''}" data-val="andamento">EM ANDAMENTO</button>
      <button class="segbtn verde ${novaStatus[k]==='concluida'?'on':''}" data-val="concluida">CONCLUÍDA</button>
    </div>
    <label>Prioridade
      <select id="nf-prio" style="max-width:220px;">
        <option value="alta">ALTA</option>
        <option value="media" selected>MÉDIA</option>
        <option value="baixa">BAIXA</option>
      </select>
    </label>
    <label style="margin-top:10px;">Observação<textarea id="nf-obs" placeholder="Detalhes, andamento..."></textarea></label>
    <div id="nf-msg" style="display:none;color:var(--bad-fg);font-weight:700;font-size:12.5px;margin-top:10px;background:var(--bad-bg);border:1px solid var(--bad);border-radius:8px;padding:8px 10px;"></div>
    <div class="btnrow" style="margin-top:10px;">
      <button class="btn prim" onclick="addPend('${k}')">➕ Adicionar pendência</button>
    </div>
  </div>`;

  const f = filtros[k];
  const chips = [
    {k:'todas', l:'Todas'},
    {k:'pendente', l:'Pendentes'},
    {k:'andamento', l:'Em andamento'},
    {k:'concluida', l:'Concluídas'},
    {k:'atrasadas', l:'Atrasadas'}
  ].map(c=>`<button class="chip ${f===c.k?'on':''}" data-f="${c.k}">${c.l}</button>`).join('');

  const filtrada = ordenarPend(lista).filter(p=>{
    if (f==='todas') return true;
    if (f==='atrasadas') return atrasada(p);
    return p.status===f;
  });

  const cards = filtrada.map(p=>cardHTML(k, p)).join('');
  const vazio = filtrada.length ? '' : `<div class="vazio">Nenhuma pendência neste filtro.</div>`;
  const aber = lista.filter(p=>p.status!=='concluida').length;
  const atr = lista.filter(p=>atrasada(p)).length;

  document.getElementById({britagem:'brt',moagem:'moa',flotacao:'flo'}[k]).innerHTML = `
    ${form}
    <div class="card">
      <h2>Pendências da área (${lista.length} · ${aber} abertas${atr? ' · '+atr+' atrasadas':''})</h2>
      <div class="filtros">${chips}</div>
      ${cards}${vazio}
    </div>`;
}

function cardHTML(k, p){
  const st = infoStatus(p);
  const id = idadeInfo(p);
  const idadeBadge = (p.status === 'concluida')
    ? badge('verde', 'CONCLUÍDA EM ' + isoToBR(p.concluido_em || p.data))
    : (id ? badge(id.cor, id.txt) : badge('verde', 'HOJE'));
  const respOpts = RESP.map(r=>`<option value="${r}" ${p.resp===r?'selected':''}>${r||'RESPONSÁVEL: —'}</option>`).join('');
  return `<div class="pcard ${st.cor}" data-area="${k}" data-id="${p.id}">
    <div class="prow1">
      <span class="pnum">${numTxt(k, p)}</span>
      <input type="text" class="ptag" data-campo="tag" value="${esc(p.tag)}" placeholder="TAG...">
      <input type="text" data-campo="desc" value="${esc(p.desc)}" placeholder="Descrição da pendência...">
      <button class="pdel" title="Excluir pendência">✕</button>
    </div>
    <div class="meta">
      <span class="pstatus">${badge(st.cor, st.txt)}</span>
      <span class="pidade">${idadeBadge}</span>
      <select data-campo="resp" style="width:auto;flex:0 0 auto;margin:0;font-weight:600;">
        ${respOpts}
      </select>
      <select data-campo="prio" class="sel-prio p-${p.prio}" style="width:auto;flex:0 0 auto;margin:0;font-weight:700;">
        <option value="alta" ${p.prio==='alta'?'selected':''}>PRIORIDADE ALTA</option>
        <option value="media" ${p.prio==='media'?'selected':''}>PRIORIDADE MÉDIA</option>
        <option value="baixa" ${p.prio==='baixa'?'selected':''}>PRIORIDADE BAIXA</option>
      </select>
    </div>
    <div class="prow2">
      <label><span>Data</span><input type="date" data-campo="data" value="${esc(p.data)}"></label>
      <label><span>Prazo</span><input type="date" data-campo="prazo" value="${esc(p.prazo)}"></label>
    </div>
    ${p.status==='concluida' ? `<label style="max-width:220px;"><span>Concluída em</span><input type="date" data-campo="concluido_em" value="${esc(p.concluido_em)}"></label>` : ''}
    <div class="seg" style="margin-bottom:8px;">
      <button class="segbtn amarelo ${p.status==='pendente'?'on':''}" data-val="pendente">PENDENTE</button>
      <button class="segbtn azul ${p.status==='andamento'?'on':''}" data-val="andamento">EM ANDAMENTO</button>
      <button class="segbtn verde ${p.status==='concluida'?'on':''}" data-val="concluida">CONCLUÍDA</button>
    </div>
    <textarea data-campo="obs" class="pobs" placeholder="Observação...">${esc(p.obs)}</textarea>
  </div>`;
}

function atualizarCardVisual(card){
  const p = pendDe(card.dataset.area).find(x=>x.id===card.dataset.id);
  if (!p) return;
  const st = infoStatus(p);
  card.className = 'pcard ' + st.cor;
  const b = card.querySelector('.bdg.pstatus, .pstatus .bdg');
  if (b) b.outerHTML = badge(st.cor, st.txt);
  const age = card.querySelector('.pidade');
  if (age){
    const id = idadeInfo(p);
    age.innerHTML = (p.status === 'concluida')
      ? badge('verde', 'CONCLUÍDA EM ' + isoToBR(p.concluido_em || p.data))
      : (id ? badge(id.cor, id.txt) : badge('verde', 'HOJE'));
  }
  card.querySelectorAll('.segbtn').forEach(x=>x.classList.toggle('on', x.dataset.val===p.status));
}

function addPend(k){
  const cont = contArea(k);
  const inpDesc = cont.querySelector('#nf-desc');
  const desc = inpDesc.value.trim();
  const tag = cont.querySelector('#nf-tag').value.trim();
  const obs = cont.querySelector('#nf-obs').value.trim();
  if (!desc){
    const msg = cont.querySelector('#nf-msg');
    msg.style.display = '';
    msg.textContent = (tag || obs)
      ? 'Falta a DESCRIÇÃO no primeiro campo ("O QUE ESTÁ PENDENTE"). O que você digitou em TAG/Observação não conta como descrição — copie para o primeiro campo.'
      : 'Preencha a DESCRIÇÃO (primeiro campo) para adicionar a pendência.';
    inpDesc.style.outline = '2px solid var(--bad)';
    inpDesc.focus();
    return;
  }
  const data = cont.querySelector('#nf-data').value || isoHoje();
  const prazo = cont.querySelector('#nf-prazo').value;
  const resp = cont.querySelector('#nf-resp').value;
  const prio = cont.querySelector('#nf-prio').value;
  const lista = pendDe(k);
  const num = lista.reduce((m,p)=>Math.max(m, p.num||0), 0) + 1;
  const status = novaStatus[k];
  lista.push({
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    num, tag, desc, data, prazo, status, prio, resp, obs,
    concluido_em: status === 'concluida' ? data : ''
  });
  salvarLocal();
  renderArea(k);
}

function delPend(k, id, btn){
  // exclusão com duplo toque (alert/confirm não aparecem em PWA instalado)
  if (btn && btn.dataset.armado !== '1'){
    btn.dataset.armado = '1';
    btn.textContent = 'Excluir?';
    btn.classList.add('armado');
    setTimeout(()=>{
      if (btn.dataset.armado === '1'){
        btn.dataset.armado = '';
        btn.textContent = '✕';
        btn.classList.remove('armado');
      }
    }, 3000);
    return;
  }
  S.areas[k].pend = pendDe(k).filter(p=>p.id!==id);
  salvarLocal();
  renderArea(k);
}

// ---------- RELATÓRIOS ----------
function dadosRelatorio(){
  return {
    topo: {rotulo1:'ERO TUCUMÃ', rotulo2:'SALA DE CONTROLE', data:hojeBR(), semana:semanaISO()},
    titulo: 'RELATÓRIO DE PENDÊNCIAS',
    subtitulo: 'BRITAGEM · MOAGEM · FLOTAÇÃO',
    slogan: 'Trabalhamos com o comprometimento de todos para uma operação segura, produtiva e dentro do prazo.',
    areas: AREAS.map(a=>({nome:a.nome, pref:a.pref, pend:ordenarPend(pendDe(a.k))})),
    rodape1: 'SEGURANÇA  ·  QUALIDADE  ·  PRODUÇÃO',
    rodape2: 'O VERDE NOS PERTENCE'
  };
}

function renderRelatorios(){
  document.getElementById('rel').innerHTML = `
    <div class="rel-grid">
      <div>
        <div class="card">
          <h2>Gerar relatório</h2>
          <div class="btnrow">
            <button class="btn prim" onclick="baixarPNG()">🖼️ Baixar PNG</button>
            <button class="btn outline" onclick="baixarPDF()">📄 Baixar PDF</button>
          </div>
          <p style="font-size:12px;color:hsl(var(--muted-foreground));margin-top:10px;">O relatório sai com data de hoje, as três áreas e o status de cada pendência (incluindo atrasadas em vermelho).</p>
        </div>
        <div class="card">
          <h2>Dados</h2>
          <div class="btnrow">
            <button class="btn outline" onclick="exportarJSON()">⬇️ Exportar JSON</button>
            <button class="btn outline" onclick="document.getElementById('imp').click()">⬆️ Importar JSON</button>
            <button class="btn danger" onclick="resetPadrao(this)">↺ Restaurar padrão</button>
          </div>
          <div id="imp-banner" style="display:none;margin-top:10px;background:var(--warn-bg);border:1px solid var(--warn);border-radius:8px;padding:8px 10px;font-size:12.5px;font-weight:700;color:var(--warn-fg);"></div>
          <p style="font-size:12px;color:hsl(var(--muted-foreground));margin-top:10px;">O backup dos dados fica no navegador (localStorage). <span id="ult"></span></p>
        </div>
      </div>
      <div class="rel-prev">
        <div class="pv-tit">PREVIEW</div>
        <button class="btn ghost mini" onclick="gerarPreview()">↻ Atualizar preview</button>
        <img id="pv" alt="Preview do relatório">
      </div>
    </div>`;
  gerarPreview();
}

async function gerarPreview(){
  try{
    const r = await renderPNG(dadosRelatorio(), icone, 'png');
    const img = document.getElementById('pv');
    img.src = r.url;
    img.classList.add('show');
  }catch(e){ mostrarErro('Erro no preview: ' + e.message); }
}

async function baixarPNG(){
  try{
    const r = await renderPNG(dadosRelatorio(), icone, 'png');
    const a = document.createElement('a');
    a.href = r.url;
    a.download = 'pendencias_ero_' + isoHoje() + '.png';
    a.click();
  }catch(e){ mostrarErro('Erro ao gerar PNG: ' + e.message); }
}

async function baixarPDF(){
  try{
    // paginação A4: cada página do canvas vira uma página A4 do PDF
    // compression 'SLOW': sem isso o jsPDF grava PNG cru (13 MB!)
    const r = await renderPNG(dadosRelatorio(), icone, 'pdf');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({orientation:'portrait', unit:'pt', format:'a4'});
    for (let i = 0; i < r.pages; i++){
      if (i > 0) pdf.addPage();
      const slice = document.createElement('canvas');
      slice.width = W;
      slice.height = r.pageH;
      slice.getContext('2d').drawImage(r.cv, 0, i * r.pageH, W, r.pageH, 0, 0, W, r.pageH);
      pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, 595.28, 841.89, undefined, 'SLOW');
    }
    pdf.save('pendencias_ero_' + isoHoje() + '.pdf');
  }catch(e){ mostrarErro('Erro ao gerar PDF: ' + e.message); }
}

function mostrarErro(txt){
  const b = document.getElementById('erro-banner');
  if (b){ b.style.display = ''; b.textContent = txt; }
}

function exportarJSON(){
  const blob = new Blob([JSON.stringify(S, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pendencias_ero_dados_' + isoHoje() + '.json';
  a.click();
}

let resetArmado = null;
function resetPadrao(btn){
  // duplo toque (confirm() não aparece em PWA instalado)
  if (!resetArmado || resetArmado !== btn){
    resetArmado = btn;
    btn.textContent = 'Tem certeza? Toque de novo';
    setTimeout(()=>{
      if (resetArmado === btn){
        resetArmado = null;
        btn.textContent = '↺ Restaurar padrão';
      }
    }, 4000);
    return;
  }
  resetArmado = null;
  S = JSON.parse(JSON.stringify(DADOS_PADRAO));
  salvarLocal();
  renderPagina();
}

let importPendente = null;
function aplicarImport(){
  if (!importPendente) return;
  S = migrar(importPendente);
  importPendente = null;
  document.getElementById('imp-banner').style.display = 'none';
  salvarLocal();
  renderPagina();
}
function cancelarImport(){
  importPendente = null;
  document.getElementById('imp-banner').style.display = 'none';
}

document.getElementById('imp').addEventListener('change', function(){
  const f = this.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{
      const d = JSON.parse(r.result);
      if (!d.areas || !d.areas.britagem || !d.areas.moagem || !d.areas.flotacao) throw new Error('formato');
      importPendente = d;
      const b = document.getElementById('imp-banner');
      b.style.display = '';
      b.innerHTML = 'Arquivo lido. Substituir os dados atuais? '
        + '<button class="btn prim mini" onclick="aplicarImport()">Aplicar</button> '
        + '<button class="btn ghost mini" onclick="cancelarImport()">Cancelar</button>';
    }catch(e){
      importPendente = null;
      const b = document.getElementById('imp-banner');
      b.style.display = '';
      b.textContent = 'Arquivo inválido — use um JSON exportado por este app.';
    }
  };
  r.readAsText(f);
  this.value = '';
});

// banner de erro visível (para diagnóstico no celular)
window.addEventListener('error', ev=>{
  try{
    const b = document.getElementById('erro-banner');
    if (b){
      b.style.display = '';
      b.textContent = 'Erro: ' + (ev.message || 'desconhecido') + ' — tire um print e envie.';
    }
  }catch(e){}
});

// ---------- ícone ----------
(function(){
  const img = new Image();
  img.onload = ()=>{ icone = img; };
  img.src = 'ero_icon.png';
})();

// ---------- init ----------
navegar('painel');
