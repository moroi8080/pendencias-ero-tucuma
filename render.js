// ============================================================
// Renderizador do Relatório de Pendências (Canvas API)
// Porta do renderizador do FlotaçãoInspect.
// v3: dois modos —
//   'png'  contínuo (para WhatsApp/preview)
//   'pdf'  paginado em A4 (quebra por linha, sem cortar texto)
// ============================================================

const W = 1080, MX = 48;
const PAGE_H = 1528;   // proporção A4 (1080 * 297/210)
const RODAPE_H = 116;
const CONT_H = 46;     // cabeçalho das páginas de continuação
const INK = '#1F2937', MUT = '#4B5563', WHITE = '#FFFFFF';
const TEAL = '#00727A', TEAL_D = '#00545B', TEAL_SOFT = '#BFF6F0';
const TEAL_BG = '#EBF4F4', FOOT_SUB = 'rgb(158,198,196)';
const CORES = { verde: '#1E9E4F', amarelo: '#E8A33D', vermelho: '#D64545', azul: '#2F7FD1', laranja: '#C25911' };
const FAM = '"Segoe UI", Arial, sans-serif';

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function tint(c, f = 0.16) {
  const [r, g, b] = hexRgb(c);
  return `rgb(${Math.round(r * f + 255 * (1 - f))},${Math.round(g * f + 255 * (1 - f))},${Math.round(b * f + 255 * (1 - f))})`;
}

function fonte(size, peso = '400', estilo = 'normal') {
  return `${peso} ${estilo} ${size}px ${FAM}`;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, texto, fnt, maxW) {
  const words = String(texto || '').split(' ');
  const linhas = [];
  let cur = '';
  for (const w of words) {
    const t = (cur + ' ' + w).trim();
    if (ctx.measureText(t).width <= maxW) cur = t;
    else { if (cur) linhas.push(cur); cur = w; }
  }
  if (cur) linhas.push(cur);
  return linhas;
}

function isoHoje(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function isoToBR(iso){ if(!iso) return '—'; const [a,m,d]=iso.split('-'); return d+'/'+m+'/'+a; }

function atrasada(p){ return !!(p.prazo && p.prazo < isoHoje() && p.status !== 'concluida'); }
function infoStatus(p){
  if (atrasada(p)) return {txt:'FORA DO PRAZO', cor: CORES.vermelho};
  if (p.status === 'pendente') return {txt:'PENDENTE', cor: CORES.amarelo};
  if (p.status === 'andamento') return {txt:'EM ANDAMENTO', cor: CORES.azul};
  return {txt:'CONCLUÍDA', cor: CORES.verde};
}

// texto de referência: BRT-01 CR-002 (prefixo + tag)
function refTxt(a, p){
  let t = '';
  if (a.pref || p.num) t += (a.pref || 'PEN') + '-' + String(p.num || '').padStart(2, '0');
  if (p.tag) t += (t ? ' ' : '') + p.tag;
  return t;
}
function larguraRef(ctx, a, p){
  const ref = refTxt(a, p);
  if (!ref) return 0;
  ctx.font = fonte(16, '800');
  return ctx.measureText(ref).width + 14;
}
function desenharRef(ctx, a, p, x, y){
  let dx = x;
  const ref = refTxt(a, p);
  if (ref){
    ctx.fillStyle = TEAL;
    ctx.font = fonte(16, '800');
    ctx.fillText(ref, dx, y);
    dx += ctx.measureText(ref).width + 14;
  }
  return dx;
}

// altura de uma linha de pendência (medida, para a quebra de página)
function alturaLinha(ctx, a, p){
  const dx = MX + 38 + larguraRef(ctx, a, p);
  let linhas = wrap(ctx, p.desc, fonte(19, '700'), W - MX - dx);
  if (linhas.length > 2) linhas = linhas.slice(0, 2);
  let obsLinhas = wrap(ctx, p.obs, fonte(16.5), W - 2 * MX - 8);
  if (obsLinhas.length > 2) obsLinhas = obsLinhas.slice(0, 2);
  return 6 + linhas.length * 24 + 26 + 4 + obsLinhas.length * 22 + 14;
}

// registra as fontes: usa a Segoe UI local se existir (Windows),
// senão carrega os woff2 bundled (celular/Android).
async function carregarFontes() {
  const defs = [
    ['400', 'normal', 'segoeui.woff2'],
    ['700', 'normal', 'segoeuib.woff2'],
    ['400', 'italic', 'segoeuii.woff2'],
  ];
  for (const [peso, estilo, url] of defs) {
    try {
      const f = new FontFace('Segoe UI', `local("Segoe UI"), url(${url})`, { weight: peso, style: estilo });
      await f.load();
      document.fonts.add(f);
    } catch (e) { /* sem rede? segue com sans-serif */ }
  }
  await document.fonts.ready;
}

function rodape(ctx, dados, yBase){
  ctx.fillStyle = TEAL_D;
  ctx.fillRect(0, yBase, W, RODAPE_H);
  ctx.fillStyle = WHITE;
  ctx.font = fonte(21, '800');
  ctx.textAlign = 'center';
  ctx.fillText(String(dados.rodape1 || ''), W / 2, yBase + 52);
  ctx.fillStyle = FOOT_SUB;
  ctx.font = fonte(15, '700');
  ctx.fillText(String(dados.rodape2 || ''), W / 2, yBase + 82);
  ctx.textAlign = 'left';
}

async function renderPNG(dados, iconeImg, modo) {
  modo = modo || 'png'; // 'png' contínuo | 'pdf' paginado A4
  await carregarFontes();

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = 12000; // teto generoso; recortado no final
  const ctx = cv.getContext('2d');
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, 12000);
  ctx.textBaseline = 'alphabetic';

  let y = 0;
  let pag = 1;
  const limite = () => (modo === 'pdf') ? pag * PAGE_H - RODAPE_H : Infinity;
  const cabe = (h) => y + h <= limite();
  function novaPagina(){
    if (modo !== 'pdf') return;
    rodape(ctx, dados, pag * PAGE_H - RODAPE_H);
    pag++;
    y = (pag - 1) * PAGE_H;
    ctx.fillStyle = TEAL_D;
    ctx.font = fonte(13, '800');
    ctx.fillText('RELATÓRIO DE PENDÊNCIAS — ERO TUCUMÃ', MX, y + 28);
    ctx.fillStyle = MUT;
    ctx.font = fonte(12, '700');
    ctx.textAlign = 'right';
    ctx.fillText('PÁGINA ' + pag, W - MX, y + 28);
    ctx.textAlign = 'left';
    y += CONT_H;
  }

  // ---------- topo ----------
  if (iconeImg){
    try{ ctx.drawImage(iconeImg, MX, 20, 46, 11); }catch(e){}
  }
  ctx.fillStyle = TEAL_D;
  ctx.font = fonte(15, '700');
  ctx.fillText(String(dados.topo.rotulo1 || 'ERO TUCUMÃ'), MX + 56, 30);
  ctx.fillStyle = MUT;
  ctx.font = fonte(12);
  ctx.fillText(String(dados.topo.rotulo2 || 'SALA DE CONTROLE'), MX + 56, 47);
  ctx.font = fonte(13, '700');
  ctx.fillStyle = INK;
  ctx.textAlign = 'right';
  ctx.fillText(String(dados.topo.data || ''), W - MX, 30);
  ctx.textAlign = 'left';

  // ---------- faixa de título ----------
  y += 84;
  ctx.fillStyle = TEAL_D;
  ctx.fillRect(0, y, W, 158);
  ctx.fillStyle = WHITE;
  ctx.font = fonte(36, '800');
  ctx.fillText(String(dados.titulo || 'RELATÓRIO DE PENDÊNCIAS'), MX, y + 62);
  ctx.fillStyle = TEAL_SOFT;
  ctx.font = fonte(18, '700');
  ctx.fillText(String(dados.subtitulo || ''), MX, y + 96);
  const sem = String(dados.topo.semana || '') + '  ·  ' + String(dados.topo.data || '');
  ctx.font = fonte(15, '700');
  const tw = ctx.measureText(sem).width;
  rr(ctx, W - MX - tw - 36, y + 26, tw + 36, 34, 17);
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.fillText(sem, W - MX - tw - 18, y + 48);
  y += 158;

  // ---------- slogan ----------
  if (dados.slogan){
    ctx.fillStyle = MUT;
    ctx.font = fonte(14, '400', 'italic');
    ctx.textAlign = 'center';
    ctx.fillText(String(dados.slogan), W / 2, y + 34);
    ctx.textAlign = 'left';
    y += 56;
  }

  // ---------- resumo de KPIs ----------
  let kTot=0, kAb=0, kAtr=0, kConc=0;
  for (const a of (dados.areas || []))
    for (const p of (a.pend || [])){
      kTot++;
      if (p.status === 'concluida') kConc++; else kAb++;
      if (atrasada(p)) kAtr++;
    }
  const kpis = [
    {lbl:'TOTAL', v:kTot, cor:INK},
    {lbl:'ABERTAS', v:kAb, cor:CORES.amarelo},
    {lbl:'ATRASADAS', v:kAtr, cor:CORES.vermelho},
    {lbl:'CONCLUÍDAS', v:kConc, cor:CORES.verde}
  ];
  const bw = (W - 2 * MX - 3 * 14) / 4;
  kpis.forEach((k, i)=>{
    const bx = MX + i * (bw + 14);
    rr(ctx, bx, y, bw, 66, 10);
    ctx.fillStyle = WHITE;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#E5E7EB';
    ctx.stroke();
    ctx.fillStyle = k.cor;
    ctx.font = fonte(26, '800');
    ctx.fillText(String(k.v), bx + 16, y + 34);
    ctx.fillStyle = MUT;
    ctx.font = fonte(11, '800');
    ctx.fillText(k.lbl, bx + 16, y + 54);
  });
  y += 66 + 20;

  // ---------- rótulo da seção ----------
  ctx.fillStyle = MUT;
  ctx.font = fonte(13, '800');
  ctx.fillText('PENDÊNCIAS POR ÁREA', MX, y + 26);
  y += 40;

  // ---------- áreas ----------
  let nGlobal = 0;
  for (const a of (dados.areas || [])) {
    if (!cabe(54)) novaPagina();

    // banda da área
    ctx.fillStyle = TEAL_BG;
    rr(ctx, MX, y, W - 2 * MX, 44, 10);
    ctx.fill();
    ctx.fillStyle = TEAL_D;
    ctx.font = fonte(20, '800');
    ctx.fillText(String(a.nome || '').toUpperCase(), MX + 18, y + 30);

    const pend = a.pend || [];
    let abertas = 0, concluidas = 0, atr = 0;
    for (const p of pend){
      if (p.status === 'concluida') concluidas++; else abertas++;
      if (atrasada(p)) atr++;
    }
    const resumo = pend.length
      ? `${abertas} ABERTA${abertas===1?'':'S'} · ${concluidas} CONCLUÍDA${concluidas===1?'':'S'}${atr? ' · '+atr+' ATRASADA'+(atr===1?'':'S'):''}`
      : 'SEM REGISTROS';
    ctx.font = fonte(14, '800');
    const rw = ctx.measureText(resumo).width;
    rr(ctx, W - MX - rw - 32, y + 7, rw + 32, 30, 15);
    ctx.fillStyle = TEAL;
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.fillText(resumo, W - MX - rw - 16, y + 27);
    y += 54;

    if (!pend.length){
      if (!cabe(46)) novaPagina();
      ctx.fillStyle = MUT;
      ctx.font = fonte(16, '400', 'italic');
      ctx.fillText('Nenhuma pendência registrada.', MX + 6, y + 22);
      y += 46;
      continue;
    }

    for (const p of pend){
      const hLinha = alturaLinha(ctx, a, p);
      if (!cabe(hLinha)) novaPagina();
      const st = infoStatus(p);
      const dx = MX + 38 + larguraRef(ctx, a, p);
      let linhas = wrap(ctx, p.desc, fonte(19, '700'), W - MX - dx);
      if (linhas.length > 2) {
        linhas = linhas.slice(0, 2);
        linhas[1] = linhas[1].replace(/\s+$/, '') + '…';
      }
      let obsLinhas = wrap(ctx, p.obs, fonte(16.5), W - 2 * MX - 8);
      if (obsLinhas.length > 2) {
        obsLinhas = obsLinhas.slice(0, 2);
        obsLinhas[1] = obsLinhas[1].replace(/\s+$/, '') + '…';
      }

      const rowTop = y + 6;
      nGlobal++;

      // número
      ctx.fillStyle = TEAL;
      ctx.beginPath();
      ctx.arc(MX + 12, rowTop + 14, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = WHITE;
      ctx.font = fonte(12, '800');
      ctx.textAlign = 'center';
      ctx.fillText(String(nGlobal), MX + 12, rowTop + 18.5);
      ctx.textAlign = 'left';

      // referência (BRT-01 CR-002) + descrição
      const ddx = desenharRef(ctx, a, p, MX + 38, rowTop + 24);
      ctx.fillStyle = p.status === 'concluida' ? MUT : INK;
      ctx.font = fonte(19, '700');
      let dy = rowTop + 24;
      for (const l of linhas){ ctx.fillText(l, ddx, dy); dy += 24; }

      // linha meta: data/prazo/resp/conclusão à esquerda + status à direita
      const metaY = dy + 4;
      ctx.fillStyle = MUT;
      ctx.font = fonte(14.5);
      let meta = 'DATA ' + isoToBR(p.data);
      if (p.status === 'concluida') meta += '   ·   CONCLUÍDA EM ' + isoToBR(p.concluido_em || p.data);
      else if (p.prazo) meta += '   ·   PRAZO ' + isoToBR(p.prazo);
      if (p.resp) meta += '   ·   RESP ' + p.resp;
      ctx.fillText(meta, MX + 38, metaY + 17);

      ctx.font = fonte(13, '800');
      const sw = ctx.measureText(st.txt).width;
      const px = W - MX - sw - 26, py = metaY + 2;
      rr(ctx, px, py, sw + 26, 24, 12);
      ctx.fillStyle = tint(st.cor);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = st.cor;
      ctx.stroke();
      ctx.fillStyle = st.cor;
      ctx.fillText(st.txt, px + 13, py + 16.5);

      // observação
      let oy = metaY + 30;
      if (p.obs){
        ctx.fillStyle = MUT;
        ctx.font = fonte(16.5);
        for (const l of obsLinhas){ ctx.fillText(l, MX + 38, oy); oy += 22; }
      }

      y = oy + 8;

      // separador
      ctx.strokeStyle = 'rgba(31,41,55,.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MX, y);
      ctx.lineTo(W - MX, y);
      ctx.stroke();
      y += 6;
    }
    y += 4;
  }

  // ---------- fechamento e recorte ----------
  let H;
  if (modo === 'pdf'){
    rodape(ctx, dados, pag * PAGE_H - RODAPE_H);
    H = pag * PAGE_H;
  } else {
    rodape(ctx, dados, y);
    H = y + RODAPE_H;
  }
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  out.getContext('2d').drawImage(cv, 0, 0);
  return {url: out.toDataURL('image/png'), cv: out, pages: pag, pageH: PAGE_H};
}

// ============================================================
// PDF VETORIAL nativo (jsPDF) — texto real, A4 com margens,
// quebra de página por linha. Substitui a versão em imagem.
// ============================================================

const P = {   // geometria A4 em pontos (595.28 x 841.89)
  margem: 42,
  larg: 595.28 - 84,            // 511.28
  topo: 52,
  bandaAlt: 78,
  rodapeAlt: 40
};

function rgbHex(h){ const n=parseInt(h.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
// remove caracteres fora do WinAnsi (emoji etc.) para o texto do PDF
function limparPDF(s){ return String(s==null?'':s).replace(/[^\x20-\x7E -ÿ]/g,'?'); }

function gerarPDF(dados){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({orientation:'portrait', unit:'pt', format:'a4'});
  const AH = 841.89;
  let y = 0;
  let pag = 1;
  const limite = () => AH - P.rodapeAlt - 24;

  const teal    = rgbHex('#00727A');
  const tealD   = rgbHex('#00545B');
  const tealS   = rgbHex('#BFF6F0');
  const tealBg  = rgbHex('#EBF4F4');
  const ink     = rgbHex('#1F2937');
  const mut     = rgbHex('#4B5563');
  const corDe   = {verde:rgbHex('#1E9E4F'), amarelo:rgbHex('#E8A33D'), vermelho:rgbHex('#D64545'), azul:rgbHex('#2F7FD1')};
  function cor(ch){ return corDe[ch] || corDe.verde; }

  function tintRGB(c, f=0.14){
    return [Math.round(c[0]*f+255*(1-f)), Math.round(c[1]*f+255*(1-f)), Math.round(c[2]*f+255*(1-f))];
  }

  function rodape(){
    doc.setFillColor(...tealD);
    doc.rect(0, AH - P.rodapeAlt, 595.28, P.rodapeAlt, 'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.text(limparPDF(dados.rodape1||''), 595.28/2, AH - 23, {align:'center'});
    doc.setTextColor(158,198,196);
    doc.setFontSize(7);
    doc.text(limparPDF(dados.rodape2||''), 595.28/2, AH - 12, {align:'center'});
  }

  function novaPagina(){
    rodape();
    doc.addPage();
    pag++;
    y = 26;
    doc.setTextColor(...tealD);
    doc.setFont('helvetica','bold');
    doc.setFontSize(8.5);
    doc.text('RELATÓRIO DE PENDÊNCIAS — ERO TUCUMÃ', P.margem, y);
    doc.setTextColor(...mut);
    doc.setFontSize(7.5);
    doc.text('PÁGINA ' + pag, 595.28 - P.margem, y, {align:'right'});
    y += 20;
  }

  function cabe(h){ return y + h <= limite(); }

  // ---------- cabeçalho da página 1 ----------
  doc.setTextColor(...tealD);
  doc.setFont('helvetica','bold');
  doc.setFontSize(10);
  doc.text(limparPDF(dados.topo.rotulo1||'ERO TUCUMÃ'), P.margem, 34);
  doc.setTextColor(...mut);
  doc.setFont('helvetica','normal');
  doc.setFontSize(7.5);
  doc.text(limparPDF(dados.topo.rotulo2||'SALA DE CONTROLE'), P.margem, 44);
  doc.setFont('helvetica','bold');
  doc.setTextColor(...ink);
  doc.text(limparPDF(dados.topo.data||''), 595.28 - P.margem, 34, {align:'right'});

  // faixa do título
  doc.setFillColor(...tealD);
  doc.rect(0, P.topo, 595.28, P.bandaAlt, 'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(21);
  doc.text(limparPDF(dados.titulo||'RELATÓRIO DE PENDÊNCIAS'), P.margem, P.topo + 38);
  doc.setTextColor(...tealS);
  doc.setFontSize(10.5);
  doc.text(limparPDF(dados.subtitulo||''), P.margem, P.topo + 56);
  const sem = limparPDF((dados.topo.semana||'') + '  ·  ' + (dados.topo.data||''));
  doc.setFontSize(8.5);
  const sw = doc.getTextWidth(sem);
  doc.setFillColor(255,255,255);
  doc.setGState(new doc.GState({opacity:.16}));
  doc.roundedRect(595.28 - P.margem - sw - 22, P.topo + 14, sw + 22, 18, 9, 9, 'F');
  doc.setGState(new doc.GState({opacity:1}));
  doc.setTextColor(255,255,255);
  doc.text(sem, 595.28 - P.margem - sw - 11, P.topo + 26);

  y = P.topo + P.bandaAlt;

  // slogan
  if (dados.slogan){
    doc.setTextColor(...mut);
    doc.setFont('helvetica','italic');
    doc.setFontSize(8);
    doc.text(limparPDF(dados.slogan), 595.28/2, y + 18, {align:'center'});
    y += 30;
  }

  // ---------- resumo de KPIs ----------
  let kTot=0, kAb=0, kAtr=0, kConc=0;
  for (const a of (dados.areas||[]))
    for (const p of (a.pend||[])){
      kTot++;
      if (p.status==='concluida') kConc++; else kAb++;
      if (atrasada(p)) kAtr++;
    }
  const kpis = [
    {lbl:'TOTAL', v:kTot, c:ink},
    {lbl:'ABERTAS', v:kAb, c:corDe.amarelo},
    {lbl:'ATRASADAS', v:kAtr, c:corDe.vermelho},
    {lbl:'CONCLUÍDAS', v:kConc, c:corDe.verde}
  ];
  const bw = (P.larg - 3*10) / 4;
  kpis.forEach((k,i)=>{
    const bx = P.margem + i*(bw+10);
    doc.setDrawColor(229,231,235);
    doc.setLineWidth(.8);
    doc.roundedRect(bx, y, bw, 40, 5, 5, 'S');
    doc.setTextColor(...k.c);
    doc.setFont('helvetica','bold');
    doc.setFontSize(15);
    doc.text(String(k.v), bx + 10, y + 21);
    doc.setTextColor(...mut);
    doc.setFontSize(6.5);
    doc.text(k.lbl, bx + 10, y + 33);
  });
  y += 40 + 16;

  // rótulo da seção
  doc.setTextColor(...mut);
  doc.setFont('helvetica','bold');
  doc.setFontSize(8);
  doc.text('PENDÊNCIAS POR ÁREA', P.margem, y);
  y += 12;

  // ---------- áreas ----------
  let nGlobal = 0;
  for (const a of (dados.areas||[])){
    if (!cabe(30)) novaPagina();

    // banda da área
    doc.setFillColor(...tealBg);
    doc.roundedRect(P.margem, y, P.larg, 26, 4, 4, 'F');
    doc.setTextColor(...tealD);
    doc.setFont('helvetica','bold');
    doc.setFontSize(11.5);
    doc.text(limparPDF(String(a.nome||'').toUpperCase()), P.margem + 10, y + 17.5);

    const pend = a.pend||[];
    let ab=0, cc=0, at=0;
    for (const p of pend){ if (p.status==='concluida') cc++; else ab++; if (atrasada(p)) at++; }
    const resumo = pend.length
      ? `${ab} ABERTA${ab===1?'':'S'} · ${cc} CONCLUÍDA${cc===1?'':'S'}${at? ' · '+at+' ATRASADA'+(at===1?'':'S'):''}`
      : 'SEM REGISTROS';
    doc.setFontSize(7.5);
    const rw = doc.getTextWidth(resumo);
    doc.setFillColor(...teal);
    doc.roundedRect(595.28 - P.margem - rw - 20, y + 3.5, rw + 20, 19, 9.5, 9.5, 'F');
    doc.setTextColor(255,255,255);
    doc.text(resumo, 595.28 - P.margem - rw - 10, y + 16);
    y += 26 + 8;

    if (!pend.length){
      if (!cabe(20)) novaPagina();
      doc.setTextColor(...mut);
      doc.setFont('helvetica','italic');
      doc.setFontSize(8);
      doc.text('Nenhuma pendência registrada.', P.margem + 4, y + 12);
      y += 20 + 8;
      continue;
    }

    for (const p of pend){
      const st = infoStatus(p);
      const stCor = cor(st.cor);
      const ref = limparPDF(refTxt(a, p));

      // altura estimada da linha
      doc.setFont('helvetica','bold');
      doc.setFontSize(10);
      const refW = ref ? doc.getTextWidth(ref) + 8 : 0;
      const descLinhas = doc.splitTextToSize(limparPDF(p.desc), P.larg - 24 - refW);
      const desc2 = descLinhas.slice(0,2);
      doc.setFont('helvetica','normal');
      doc.setFontSize(8);
      const obsLinhas = doc.splitTextToSize(limparPDF(p.obs), P.larg - 24);
      const obs2 = obsLinhas.slice(0,2);
      if (obs2.length===2) obs2[1] = obs2[1].replace(/\s+$/,'') + '…';
      const hLinha = 8 + desc2.length*13 + 12 + 4 + obs2.length*10.5 + 12;

      if (!cabe(hLinha)) novaPagina();

      const rowTop = y + 6;
      nGlobal++;

      // número
      doc.setFillColor(...teal);
      doc.circle(P.margem + 7, rowTop + 8, 7, 'F');
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(7);
      doc.text(String(nGlobal), P.margem + 7, rowTop + 10.5, {align:'center'});

      // referência + descrição
      const dx = P.margem + 22;
      let ddx = dx;
      if (ref){
        doc.setTextColor(...teal);
        doc.setFont('helvetica','bold');
        doc.setFontSize(9.5);
        doc.text(ref, ddx, rowTop + 10.5);
        ddx += doc.getTextWidth(ref) + 8;
      }
      doc.setTextColor(...(p.status==='concluida' ? mut : ink));
      doc.setFont('helvetica','bold');
      doc.setFontSize(10);
      let dy = rowTop + 10.5;
      for (const l of desc2){ doc.text(l, ddx, dy); dy += 13; }

      // meta + pill de status
      const metaY = dy + 2;
      doc.setFont('helvetica','normal');
      doc.setFontSize(8);
      doc.setTextColor(...mut);
      let meta = 'DATA ' + isoToBR(p.data);
      if (p.status==='concluida') meta += '   ·   CONCLUÍDA EM ' + isoToBR(p.concluido_em||p.data);
      else if (p.prazo) meta += '   ·   PRAZO ' + isoToBR(p.prazo);
      if (p.resp) meta += '   ·   RESP ' + limparPDF(p.resp);
      doc.text(meta, dx, metaY + 10);

      doc.setFont('helvetica','bold');
      doc.setFontSize(7.5);
      const pw = doc.getTextWidth(st.txt);
      const t = tintRGB(stCor);
      doc.setFillColor(...t);
      doc.setDrawColor(...stCor);
      doc.setLineWidth(1);
      doc.roundedRect(595.28 - P.margem - pw - 16, metaY, pw + 16, 15, 7.5, 7.5, 'FD');
      doc.setTextColor(...stCor);
      doc.text(st.txt, 595.28 - P.margem - pw - 8, metaY + 10.5);

      // observação
      let oy = metaY + 15 + 6;
      if (p.obs){
        doc.setTextColor(...mut);
        doc.setFont('helvetica','normal');
        doc.setFontSize(8);
        for (const l of obs2){ doc.text(l, dx, oy); oy += 10.5; }
      }

      y = oy + 6;
      doc.setDrawColor(31,41,55);
      doc.setGState(new doc.GState({opacity:.08}));
      doc.setLineWidth(.7);
      doc.line(P.margem, y, 595.28 - P.margem, y);
      doc.setGState(new doc.GState({opacity:1}));
      y += 8;
    }
  }

  rodape();
  return doc;
}
