// ============================================================
// Pendências ERO — controle de pendências por área
// Páginas: Painel · Britagem · Moagem · Flotação · Relatórios
// Dados: localStorage (chave única), edição inline sem modal.
// ============================================================

const CHAVE = 'pendencias_ero_v1';

const AREAS = [
  {k:'britagem', nome:'BRITAGEM', rotulo:'Britagem'},
  {k:'moagem',   nome:'MOAGEM',   rotulo:'Moagem'},
  {k:'flotacao', nome:'FLOTAÇÃO', rotulo:'Flotação'}
];

const DADOS_PADRAO = {
  areas: {
    britagem: { pend: [
      {id:'b1', desc:'CR-002 — Desgaste acentuado dos revestimentos (avaliar troca)', data:'2026-09-24', prazo:'2026-10-10', status:'pendente', prio:'alta', obs:'Episódios de material não britável em 22 e 24/09 — inspeção mecânica agendada'},
      {id:'b2', desc:'CR-003 — Paradas pelo intertravamento (câmara vazia + FE parado + PW baixa)', data:'2026-09-28', prazo:'2026-10-03', status:'andamento', prio:'alta', obs:'Lógica de intertravamento de 20 min em análise com a elétrica'},
      {id:'b3', desc:'CV-001 — Obstrução recorrente do chute (LSH em projeção)', data:'2026-10-01', prazo:'2026-10-08', status:'pendente', prio:'media', obs:'Limpeza programada para a próxima parada'},
      {id:'b4', desc:'Peneira — Troca de telas do deck superior', data:'2026-09-30', prazo:'', status:'concluida', prio:'media', obs:'Trocadas em 30/09 — deck normalizado'}
    ]},
    moagem: { pend: [
      {id:'m1', desc:'Moinho — Sensor de nível do silo com leitura intermitente', data:'2026-10-02', prazo:'2026-10-12', status:'pendente', prio:'media', obs:'Verificar com instrumentação'},
      {id:'m2', desc:'Hidrociclone — Liner desgastado (programar troca)', data:'2026-09-29', prazo:'', status:'andamento', prio:'media', obs:'Sobressalente em estoque — aguardando janela'},
      {id:'m3', desc:'Bomba de polpa — Vazamento na gaxeta', data:'2026-09-26', prazo:'', status:'concluida', prio:'alta', obs:'Corrigido pela mecânica em 26/09'}
    ]},
    flotacao: { pend: [
      {id:'f1', desc:'Distribuidores de água danificados (Jameson 01 e 02)', data:'2026-10-03', prazo:'2026-10-15', status:'pendente', prio:'alta', obs:'Aquisição de sobressalentes em andamento'},
      {id:'f2', desc:'Downcomers sem conexão — 03 no Jameson 01 e 01 no Jameson 02', data:'2026-10-03', prazo:'', status:'pendente', prio:'media', obs:'Aguardando conexões'},
      {id:'f3', desc:'FC-012 — Preventiva do acoplamento do rotor', data:'2026-09-25', prazo:'2026-10-20', status:'andamento', prio:'media', obs:'Aguardando programação da manutenção'},
      {id:'f4', desc:'PU-020R — Sucção travada (indisponível)', data:'2026-09-30', prazo:'2026-10-07', status:'pendente', prio:'alta', obs:'Mecânica corretiva ciente'},
      {id:'f5', desc:'FC-026 — 4230-LCV-0072 Dardo B fora de serviço', data:'2026-09-28', prazo:'', status:'andamento', prio:'alta', obs:'Aguardando peça'}
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
  try{
    const v = localStorage.getItem(CHAVE);
    if (v) return JSON.parse(v);
  }catch(e){}
  return JSON.parse(JSON.stringify(DADOS_PADRAO));
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
function atrasada(p){ return !!(p.prazo && p.prazo < isoHoje() && p.status !== 'concluida'); }

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
  const mapa = {verde:'verde', amarelo:'amarelo', vermelho:'vermelho', azul:'azul'};
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
    delPend(card.dataset.area, card.dataset.id);
    return;
  }
  const seg = e.target.closest('.pcard .segbtn');
  if (seg){
    const card = seg.closest('.pcard');
    const p = pendDe(card.dataset.area).find(x=>x.id===card.dataset.id);
    if (p){ p.status = seg.dataset.val; agendarSalvar(); }
    card.querySelectorAll('.segbtn').forEach(b=>b.classList.toggle('on', b===seg));
    atualizarCardVisual(card);
    return;
  }
  const nseg = e.target.closest('#nf-status .segbtn');
  if (nseg){
    document.querySelectorAll('#nf-status .segbtn').forEach(b=>b.classList.toggle('on', b===nseg));
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

document.addEventListener('change', e=>{
  const sel = e.target.closest('select[data-campo]');
  if (!sel) return;
  const card = sel.closest('.pcard');
  if (!card) return;
  const p = pendDe(card.dataset.area).find(x=>x.id===card.dataset.id);
  if (!p) return;
  p[sel.dataset.campo] = sel.value;
  agendarSalvar();
  sel.className = 'sel-prio p-' + sel.value;
});

// ---------- PAINEL ----------
function renderPainel(){
  let tot=0, pend=0, and=0, conc=0, atr=0;
  const porArea = {};
  for (const a of AREAS){
    const lista = pendDe(a.k);
    let ab=0, c=0, at=0;
    for (const p of lista){
      tot++;
      if (p.status==='concluida'){ c++; conc++; }
      else {
        ab++;
        if (p.status==='pendente') pend++; else and++;
        if (atrasada(p)) atr++;
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
        return `<div class="pend" data-area="${x.area}" style="cursor:pointer">
          <div class="n">${i+1}</div>
          <div class="dets">
            <div class="t"><span class="area-tag">${x.nome}</span> ${esc(x.p.desc)}</div>
            <div class="m">${badge(st.cor, st.txt)} <span>Data: ${isoToBR(x.p.data)}</span>${x.p.prazo?` <span>Prazo: ${isoToBR(x.p.prazo)}</span>`:''}</div>
          </div>
        </div>`;
      }).join('')
    : `<div class="vazio">Nenhuma pendência em aberto. ✅</div>`;

  document.getElementById('pnl').innerHTML = `
    ${stats}
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
      <input type="text" id="nf-desc" placeholder="Descrição / equipamento..." style="flex:1;font-weight:700;font-size:14px;">
    </div>
    <div class="prow2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <label>Data<input type="date" id="nf-data" value="${isoHoje()}"></label>
      <label>Prazo (opcional)<input type="date" id="nf-prazo"></label>
    </div>
    <label style="margin-bottom:6px;">Status</label>
    <div class="seg" id="nf-status" style="margin-bottom:10px;">
      <button class="segbtn amarelo ${novaStatus[k]==='pendente'?'on':''}" data-val="pendente">PENDENTE</button>
      <button class="segbtn azul ${novaStatus[k]==='andamento'?'on':''}" data-val="andamento">EM ANDAMENTO</button>
      <button class="segbtn verde ${novaStatus[k]==='concluida'?'on':''}" data-val="concluida">CONCLUÍDA</button>
    </div>
    <div class="prow2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <label>Prioridade
        <select id="nf-prio">
          <option value="alta">ALTA</option>
          <option value="media" selected>MÉDIA</option>
          <option value="baixa">BAIXA</option>
        </select>
      </label>
    </div>
    <label>Observação<textarea id="nf-obs" placeholder="Detalhes, andamento, responsável..."></textarea></label>
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
  return `<div class="pcard ${st.cor}" data-area="${k}" data-id="${p.id}">
    <div class="prow1">
      <input type="text" data-campo="desc" value="${esc(p.desc)}" placeholder="Descrição / equipamento...">
      <button class="pdel" title="Excluir pendência">✕</button>
    </div>
    <div class="meta">
      ${badge(st.cor, st.txt)}
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
  const b = card.querySelector('.bdg');
  if (b) b.outerHTML = badge(st.cor, st.txt);
  card.querySelectorAll('.segbtn').forEach(x=>x.classList.toggle('on', x.dataset.val===p.status));
}

function addPend(k){
  const desc = document.getElementById('nf-desc').value.trim();
  if (!desc){ alert('Descreva a pendência antes de adicionar.'); return; }
  const data = document.getElementById('nf-data').value || isoHoje();
  const prazo = document.getElementById('nf-prazo').value;
  const prio = document.getElementById('nf-prio').value;
  const obs = document.getElementById('nf-obs').value.trim();
  pendDe(k).push({
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    desc, data, prazo, status: novaStatus[k], prio, obs
  });
  salvarLocal();
  renderArea(k);
}

function delPend(k, id){
  if (!confirm('Excluir esta pendência?')) return;
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
    areas: AREAS.map(a=>({nome:a.nome, pend:ordenarPend(pendDe(a.k))})),
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
            <button class="btn danger" onclick="resetPadrao()">↺ Restaurar padrão</button>
          </div>
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
    const url = await renderPNG(dadosRelatorio(), icone);
    const img = document.getElementById('pv');
    img.src = url;
    img.classList.add('show');
  }catch(e){ console.error('Preview:', e); }
}

function baixarDados(cv){
  const a = document.createElement('a');
  a.href = cv.toDataURL('image/png');
  a.download = 'pendencias_ero_' + isoHoje() + '.png';
  a.click();
}

async function baixarPNG(){
  try{
    const url = await renderPNG(dadosRelatorio(), icone);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pendencias_ero_' + isoHoje() + '.png';
    a.click();
  }catch(e){ alert('Erro ao gerar PNG: ' + e.message); }
}

async function baixarPDF(){
  try{
    const url = await renderPNG(dadosRelatorio(), icone);
    const img = new Image();
    await new Promise((ok, err)=>{ img.onload=ok; img.onerror=err; img.src=url; });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({orientation:'portrait', unit:'px', format:[img.width, img.height], hotfixes:['px_scaling']});
    pdf.addImage(img, 'PNG', 0, 0, img.width, img.height);
    pdf.save('pendencias_ero_' + isoHoje() + '.pdf');
  }catch(e){ alert('Erro ao gerar PDF: ' + e.message); }
}

function exportarJSON(){
  const blob = new Blob([JSON.stringify(S, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pendencias_ero_dados_' + isoHoje() + '.json';
  a.click();
}

function resetPadrao(){
  if (!confirm('Restaurar os dados padrão? Suas alterações serão perdidas.')) return;
  S = JSON.parse(JSON.stringify(DADOS_PADRAO));
  salvarLocal();
  renderPagina();
}

document.getElementById('imp').addEventListener('change', function(){
  const f = this.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{
      const d = JSON.parse(r.result);
      if (!d.areas || !d.areas.britagem || !d.areas.moagem || !d.areas.flotacao) throw new Error('formato');
      if (!confirm('Substituir os dados atuais pelos do arquivo?')) return;
      S = d;
      salvarLocal();
      renderPagina();
    }catch(e){ alert('Arquivo inválido — use um JSON exportado por este app.'); }
  };
  r.readAsText(f);
  this.value = '';
});

// ---------- ícone ----------
(function(){
  const img = new Image();
  img.onload = ()=>{ icone = img; };
  img.src = 'ero_icon.png';
})();

// ---------- init ----------
navegar('painel');
