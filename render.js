// ============================================================
// Renderizador PNG do Relatório de Pendências
// Porta do renderizador do FlotaçãoInspect (Canvas API).
// v2: resumo de KPIs, nº/TAG da pendência, responsável e
//     data de conclusão (modelos: punch list + backlog).
// ============================================================

const W = 1080, MX = 48;
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
// desenha a referência e devolve o x onde a descrição começa
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
function larguraRef(ctx, a, p){
  const ref = refTxt(a, p);
  if (!ref) return 0;
  ctx.font = fonte(16, '800');
  return ctx.measureText(ref).width + 14;
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

function medirAltura(ctx, dados) {
  let y = 0;
  y += 84;                        // topo
  y += 158;                       // faixa de título
  if (dados.slogan) y += 56;      // slogan
  y += 66 + 20;                   // resumo de KPIs
  y += 40;                        // rótulo da seção

  for (const a of (dados.areas || [])) {
    y += 44 + 10;                 // banda da área
    const pend = a.pend || [];
    if (!pend.length){ y += 36; continue; }
    for (const p of pend) {
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
      y += 6 + linhas.length * 24 + 26 + 4 + obsLinhas.length * 22 + 14;
    }
    y += 6;
  }

  y += 116;                        // rodapé
  return y;
}

async function renderPNG(dados, iconeImg) {
  await carregarFontes();
  const ctx0 = document.createElement('canvas').getContext('2d');
  const H = medirAltura(ctx0, dados);
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  cv.width = W;
  cv.height = H;

  // fundo branco explícito (senão o PNG sai transparente e vira preto nos visualizadores)
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  let y = 0;

  // ---------- topo ----------
  if (iconeImg){
    try{
      ctx.drawImage(iconeImg, MX, 20, 46, 11);
    }catch(e){}
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
  // pill semana + data (canto direito)
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
      ctx.fillStyle = MUT;
      ctx.font = fonte(16, '400', 'italic');
      ctx.fillText('Nenhuma pendência registrada.', MX + 6, y + 22);
      y += 36 + 10;
      continue;
    }

    for (const p of pend){
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

  // ---------- rodapé ----------
  ctx.fillStyle = TEAL_D;
  ctx.fillRect(0, H - 116, W, 116);
  ctx.fillStyle = WHITE;
  ctx.font = fonte(21, '800');
  ctx.textAlign = 'center';
  ctx.fillText(String(dados.rodape1 || ''), W / 2, H - 64);
  ctx.fillStyle = FOOT_SUB;
  ctx.font = fonte(15, '700');
  ctx.fillText(String(dados.rodape2 || ''), W / 2, H - 34);
  ctx.textAlign = 'left';

  return cv.toDataURL('image/png');
}
