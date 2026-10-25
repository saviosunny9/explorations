/* Sixjuly Flow — structured grid system.
   The house style and every style pack except "Classic" sit on one 12-column grid: a top bar (mark, series, page), a numbered section
   label, the headline, the content block and a bottom bar (handle, site, next). Layouts below hang off the columns and the type scale
   so slides read as one system. Also adds four structured layouts that work in every style: bento, table, feature, columns. */
(function () {
  'use strict';
  const R = window.SixjulyRender, U = R.U, FAM = R.FAM;
  const { rr, setFont, layoutRich, fitRich, fitLine, clamp, TAU, plain, mix, drawLogo } = U;
  const STY = R.STYLES, CH = R.CHROME, L = R.LAYOUTS;
  const GRID = R.GRID = {}, GC = R.GRID_COVERS = {};
  const pad2 = n => String(n).padStart(2, '0');
  const up = s => String(s == null ? '' : s).toUpperCase();

  // ---- small drawing helpers ---------------------------------------------------------------------------------------------------------------------
  const hair = (ctx, x0, y0, x1, y1, color, w) => { ctx.strokeStyle = color; ctx.lineWidth = w || 1.5; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
  const label = (ctx, b, text, x, y, size, color, o) => { o = o || {}; setFont(ctx, b, o.weight || 500, size, o.track != null ? o.track : 0.02, FAM.mono); ctx.fillStyle = color; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'top'; ctx.fillText(up(text), x, y); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; return ctx.measureText(up(text)).width; };
  const para = (ctx, b, th, P, x, y, o) => {          // paint a laid-out rich block with its top-left at x, y
    o = o || {}; setFont(ctx, b, P.weight, P.size, P.track, P.fam); ctx.textBaseline = 'alphabetic'; const base = (P.lh - P.size) / 2 + P.size * 0.8;
    P.words.forEach(w => w.runs.forEach(r => { ctx.fillStyle = r.c === 'hi' ? (o.hi || th.hi) : r.c === 'sec' ? (o.sec || th.sec) : (o.color || th.ink); ctx.fillText(r.t, x + w.x + r.x, y + w.y + base); }));
    if (o.strike) { ctx.strokeStyle = o.color || th.ink; ctx.lineWidth = Math.max(2, P.size * 0.06); for (let i = 0; i < P.lines; i++) { const ws = P.words.filter(w => w.line === i); if (!ws.length) continue; const x1 = Math.max(...ws.map(w => w.x + w.w)); hair(ctx, x + ws[0].x, y + i * P.lh + base - P.size * 0.3, x + x1, y + i * P.lh + base - P.size * 0.3, o.color || th.ink, Math.max(2, P.size * 0.06)); } }
  };
  const onHi = th => (th.name === 'Violet' || th.name === 'Orange' ? th.btnInk : '#FFFFFF');      // text that sits on a highlight-coloured panel
  const K = scene => (scene.g.reel ? 1.12 : 1);
  const LS = scene => scene.g.labelSize || 22;
  const R0 = scene => 12 * scene.rs;                                                                // panel corner radius from the style
  let BODY = null;                                                                                 // body font of the current style (set per layout call)
  const lay = (b, t, o) => layoutRich(b, t, Object.assign({ fam: BODY || undefined }, o, BODY && o.weight ? { weight: Math.min(o.weight, BODYW) } : {}));
  let BODYW = 900;
  const fit = (b, text, maxW, maxH, size, o) => fitRich(b, text || '', Object.assign({ maxW, maxH, size, min: 22, weight: 500, lh: 1.12, track: -0.025, fam: BODY || undefined }, o || {}, BODY ? { weight: Math.min((o && o.weight) || 500, BODYW) } : {}));
  const arrowGlyph = (ctx, x1, y, len, color, w) => { ctx.strokeStyle = color; ctx.lineWidth = w || 3; ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(x1 - len, y); ctx.lineTo(x1, y); ctx.moveTo(x1 - len * 0.3, y - len * 0.3); ctx.lineTo(x1, y); ctx.lineTo(x1 - len * 0.3, y + len * 0.3); ctx.stroke(); };
  const tick = (ctx, cx, cy, r, color, cross) => { ctx.strokeStyle = color; ctx.lineWidth = Math.max(2.5, r * 0.16); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.beginPath(); if (cross) { const d = r * 0.36; ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d); ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d); } else { ctx.moveTo(cx - r * 0.42, cy + r * 0.02); ctx.lineTo(cx - r * 0.1, cy + r * 0.32); ctx.lineTo(cx + r * 0.45, cy - r * 0.3); } ctx.stroke(); };
  // stack rows of rich text top-down; shrinks the size until they fit the height
  function rowsFit(b, texts, maxW, maxH, size, gap, o) {
    for (let s = size; s >= 24; s -= 2) { const Ls = texts.map(t => lay(b, t, Object.assign({ maxW, size: s, weight: 500, lh: 1.1, track: -0.025 }, o || {}))); const tot = Ls.reduce((a, P) => a + P.h + gap, 0); if (tot <= maxH && Ls.every(P => P.widest <= maxW)) return Ls; }
    return texts.map(t => lay(b, t, Object.assign({ maxW, size: 24, weight: 500, lh: 1.1, track: -0.025 }, o || {})));
  }

  // ---- style packs: all structured except Classic -----------------------------------------------------------------------------------------------
  STY.classic = Object.assign({}, STY.sixjuly, { name: 'Sixjuly classic', from: 'the original Sixjuly posts', note: 'Dot grid, rounded cards, arrow, halftone art' });
  STY.sixjuly = { name: 'Sixjuly grid', grid: true, chrome: 'grid', rs: 0.5, theme: 'light', from: 'the Sixjuly brand file on a 12-column grid', note: 'Grid, meta bars, numbered sections, one accent', head: { weight: 500, track: -0.042 } };
  Object.assign(STY.swiss, { grid: true, chrome: 'swiss', rs: 0, header: undefined, arrow: undefined, head: { weight: 600, track: -0.05, lh: 0.98, scale: 1.08 } });
  Object.assign(STY.editorial, { grid: true, chrome: 'editorial', rs: 0.25, header: undefined, arrow: undefined });
  Object.assign(STY.mono, { grid: true, chrome: 'mono', rs: 0.15, header: undefined, arrow: undefined });
  Object.assign(STY.bento, { grid: true, chrome: 'bento', rs: 1.6 });
  Object.assign(STY.poster, { grid: true, chrome: 'poster', rs: 0.4 });
  Object.assign(STY.glow, { grid: true, chrome: 'glow', rs: 1 });
  R.STYLE_ORDER = ['sixjuly', 'swiss', 'editorial', 'mono', 'bento', 'poster', 'glow', 'classic'];

  // ---- chrome: the meta bars every grid slide carries ------------------------------------------------------------------------------------------------
  // two selectable pieces (top bar, bottom bar) so they can be moved or hidden like anything else
  function bars(add, o, top, bottom) {
    const { g, W } = o;
    if (top) add({ x: g.mx, y: g.metaY - 30, w: W - 2 * g.mx, h: g.ruleTop - g.metaY + 34 }, top, { nosel: false, name: 'Top bar' });
    if (bottom) add({ x: g.mx, y: g.ruleBot - 4, w: W - 2 * g.mx - 170, h: g.metaBY - g.ruleBot + 12 }, bottom, { nosel: false, name: 'Bottom bar' });
  }
  const seriesText = o => { const t = String(o.series || '').replace(/\s+/g, ' ').trim(); return t.length > 34 ? t.slice(0, 33).trim() + '…' : t; };
  CH.grid = (scene, add, o) => {
    const { g, th, brand: b, W, index, total } = o, ls = g.labelSize, ty = g.metaY - ls * 0.82;
    bars(add, o, ctx => {
      drawLogo(ctx, g.mx, g.metaY - ls * 1.05, ls * 1.7, th.logo);
      label(ctx, b, seriesText(o) || 'Sixjuly', g.col(4, 1).x, ty, ls, th.ink);
      label(ctx, b, `${pad2(index + 1)} / ${pad2(total)}`, W - g.mx, ty, ls, th.ink, { align: 'right' });
      hair(ctx, g.mx, g.ruleTop, W - g.mx, g.ruleTop, th.ink, 1.5);
    }, ctx => {
      hair(ctx, g.mx, g.ruleBot, W - g.mx, g.ruleBot, th.ink, 1.5);
      label(ctx, b, b.handle || '@sixjulydesign', g.mx, g.metaBY - ls * 0.82, ls, th.ink);
      label(ctx, b, b.site || 'sixjuly.com', g.col(4, 1).x, g.metaBY - ls * 0.82, ls, th.mute);
    });
  };
  CH.swiss = (scene, add, o) => {
    const { g, th, brand: b, W, index, total } = o, ls = g.labelSize, ty = g.metaY - ls * 0.82;
    bars(add, o, ctx => {
      setFont(ctx, b, 700, ls * 1.15, -0.02); ctx.fillStyle = th.ink; ctx.textBaseline = 'alphabetic'; ctx.fillText('Sixjuly®', g.mx, g.metaY);
      label(ctx, b, seriesText(o) || 'Studio notes', g.col(4, 1).x, ty, ls, th.ink);
      label(ctx, b, `${pad2(index + 1)}—${pad2(total)}`, W - g.mx, ty, ls, th.ink, { align: 'right' });
      hair(ctx, g.mx, g.ruleTop, W - g.mx, g.ruleTop, th.ink, 4); ctx.fillStyle = th.hi; ctx.fillRect(g.mx, g.ruleTop - 4, g.colW * 2 + g.gut, 8);
    }, ctx => {
      hair(ctx, g.mx, g.ruleBot, W - g.mx, g.ruleBot, th.ink, 1.5);
      label(ctx, b, b.site || 'sixjuly.com', g.mx, g.metaBY - ls * 0.82, ls, th.ink);
      label(ctx, b, b.handle || '@sixjulydesign', g.col(4, 1).x, g.metaBY - ls * 0.82, ls, th.mute);
    });
  };
  CH.editorial = (scene, add, o) => {
    const { g, th, brand: b, W, index, total } = o, ls = g.labelSize;
    bars(add, o, ctx => {
      setFont(ctx, b, 'italic 400', ls * 1.45, 0, FAM.serif); ctx.fillStyle = th.ink; ctx.textBaseline = 'alphabetic'; ctx.fillText('Sixjuly Design Studio', g.mx, g.metaY);
      ctx.textAlign = 'right'; ctx.fillText(`No. ${index + 1}`, W - g.mx, g.metaY); ctx.textAlign = 'left';
      hair(ctx, g.mx, g.ruleTop, W - g.mx, g.ruleTop, th.ink, 1); hair(ctx, g.mx, g.ruleTop + 6, W - g.mx, g.ruleTop + 6, th.ink, 1);
    }, ctx => {
      hair(ctx, g.mx, g.ruleBot, W - g.mx, g.ruleBot, th.ink, 1);
      label(ctx, b, `${seriesText(o) || 'Notes'} · ${index + 1} of ${total}`, g.mx, g.metaBY - ls * 0.82, ls, th.mute, { track: 0.06 });
    });
  };
  CH.mono = (scene, add, o) => {
    const { g, th, brand: b, W, H, index, total } = o, ls = g.labelSize, m = 30, a = th.dark ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.3)';
    add({ x: 0, y: 0, w: W, h: H }, ctx => { ctx.strokeStyle = a; ctx.lineWidth = 1.5; ctx.strokeRect(m, m, W - 2 * m, H - 2 * m); for (const [x, y] of [[m, m], [W - m, m], [m, H - m], [W - m, H - m]]) { hair(ctx, x - 14, y, x + 14, y, th.ink, 2); hair(ctx, x, y - 14, x, y + 14, th.ink, 2); } }, { name: 'Frame' });
    bars(add, o, ctx => {
      label(ctx, b, `[ ${b.site || 'sixjuly.com'} ]`, g.mx, g.metaY - ls * 0.82, ls, th.ink, { weight: 600 });
      label(ctx, b, seriesText(o), g.col(5, 1).x, g.metaY - ls * 0.82, ls, th.mute);
      label(ctx, b, `slide ${pad2(index + 1)}/${pad2(total)}`, W - g.mx, g.metaY - ls * 0.82, ls, th.hi, { align: 'right', weight: 600 });
      ctx.setLineDash([6, 6]); hair(ctx, g.mx, g.ruleTop, W - g.mx, g.ruleTop, a, 1.5); ctx.setLineDash([]);
    }, ctx => {
      ctx.setLineDash([6, 6]); hair(ctx, g.mx, g.ruleBot, W - g.mx, g.ruleBot, a, 1.5); ctx.setLineDash([]);
      label(ctx, b, b.handle || '@sixjulydesign', g.mx, g.metaBY - ls * 0.82, ls, th.mute);
      label(ctx, b, `x:${pad2(index + 1)} y:${pad2(total)}`, g.col(5, 1).x, g.metaBY - ls * 0.82, ls, th.mute);
    });
  };
  CH.bento = (scene, add, o) => {
    const { g, th, brand: b, W, index, total } = o, ls = g.labelSize, n = Math.min(total, 12);
    bars(add, o, ctx => {
      drawLogo(ctx, g.mx, g.metaY - ls * 1.05, ls * 1.7, th.logo);
      label(ctx, b, seriesText(o), g.col(4, 1).x, g.metaY - ls * 0.82, ls, th.mute);
      for (let i = 0; i < n; i++) { const on = i === index, w = on ? 30 : 10, x = W - g.mx - (n - i) * 18 - (index < i ? 0 : 20) + (on ? -0 : 0); ctx.fillStyle = on ? th.hi : th.line; rr(ctx, x - (on ? 20 : 0), g.metaY - 16, w, 10, 5); ctx.fill(); }
    }, ctx => { label(ctx, b, b.handle || '@sixjulydesign', g.mx, g.metaBY - ls * 0.82, ls, th.mute); });
  };
  CH.poster = (scene, add, o) => {
    const { g, th, brand: b, W, H, index } = o, ls = g.labelSize;
    add({ x: 0, y: 0, w: W, h: H }, ctx => { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); setFont(ctx, b, 700, H * 0.56, -0.06); ctx.fillStyle = th.ink; ctx.globalAlpha = 0.07; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillText(String(index + 1), W + H * 0.04, H * 0.98); ctx.restore(); }, { name: 'Big number' });
    bars(add, o, ctx => {
      label(ctx, b, 'Sixjuly ✦ ' + (b.site || 'sixjuly.com'), g.mx, g.metaY - ls * 0.82, ls, th.ink, { weight: 700 });
      label(ctx, b, seriesText(o), W - g.mx, g.metaY - ls * 0.82, ls, th.ink, { align: 'right' });
      hair(ctx, g.mx, g.ruleTop, W - g.mx, g.ruleTop, th.ink, 3);
    }, ctx => { label(ctx, b, b.handle || '@sixjulydesign', g.mx, g.metaBY - ls * 0.82, ls, th.ink, { weight: 700 }); });
  };
  CH.glow = (scene, add, o) => {
    const { g, th, brand: b, W, H, index, total } = o, ls = g.labelSize;
    add({ x: 0, y: 0, w: W, h: H }, ctx => {
      const blobs = [[0.1, 0.06, W * 0.75, b.violet, 0.55], [1.0, 0.92, W * 0.62, b.orange, 0.28], [0.95, 0.12, W * 0.5, b.periwinkle, 0.3]];
      ctx.save(); for (const [fx, fy, r, c, al] of blobs) { const gr = ctx.createRadialGradient(W * fx, H * fy, 0, W * fx, H * fy, r); gr.addColorStop(0, c); gr.addColorStop(1, /^#[0-9a-f]{6}$/i.test(c) ? c + '00' : 'rgba(0,0,0,0)'); ctx.globalAlpha = al; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); } ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.5; rr(ctx, 30, 30, W - 60, H - 60, 30); ctx.stroke();
    }, { name: 'Glow' });
    bars(add, o, ctx => {
      drawLogo(ctx, g.mx, g.metaY - ls * 1.05, ls * 1.7, th.logo);
      label(ctx, b, seriesText(o), g.col(4, 1).x, g.metaY - ls * 0.82, ls, 'rgba(255,255,255,.7)');
      label(ctx, b, `${pad2(index + 1)} / ${pad2(total)}`, W - g.mx, g.metaY - ls * 0.82, ls, 'rgba(255,255,255,.7)', { align: 'right' });
    }, ctx => { label(ctx, b, b.handle || '@sixjulydesign', g.mx, g.metaBY - ls * 0.82, ls, 'rgba(255,255,255,.6)'); });
  };

  // ---- grid covers ------------------------------------------------------------------------------------------------------------------------------------
  const chip = (ctx, b, text, x, y, size, color, fill) => {   // outlined pill label, e.g. HOT TAKE
    setFont(ctx, b, 500, size, 0.04, FAM.mono); const t = up(text), w = ctx.measureText(t).width + size * 1.6, h = size * 1.9;
    if (fill) { ctx.fillStyle = fill; rr(ctx, x, y, w, h, h / 2); ctx.fill(); } else { ctx.strokeStyle = color; ctx.lineWidth = 1.5; rr(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, h / 2); ctx.stroke(); }
    ctx.fillStyle = fill ? '#FFFFFF' : color; ctx.textBaseline = 'middle'; ctx.fillText(t, x + size * 0.8, y + h / 2 + 1); ctx.textBaseline = 'alphabetic'; return { w, h };
  };
  const chipH = scene => LS(scene) * 1.9;
  GC.type = {                 // huge headline under the top bar, sub-line and foot on the bottom, a rule between
    head(scene, o) { const { g, reel, H } = o, t = o.slide.tag ? chipH(scene) + (reel ? 40 : 34) : 0; return { opts: { maxW: g.col(1, 12).w, maxH: H * (reel ? 0.34 : 0.4), size: reel ? 196 : 172, min: 64, weight: 600, lh: 0.93, track: -0.052, maxLines: 5 }, y: () => g.top + t }; },
    build(scene, add, o) {
      const { g, th, brand: b, slide: sl, W, subL, footL } = o;
      if (sl.tag) add('tag', { x: g.mx, y: g.top, w: 300, h: chipH(scene) }, ctx => chip(ctx, b, sl.tag, g.mx, g.top, LS(scene), th.ink), { name: 'Tag' });
      if (subL || footL) { const y = g.bottom - (footL ? footL.h + (subL ? 22 : 0) : 0) - (subL ? subL.h : 0) - (g.reel ? 52 : 44); add('art', { x: g.mx, y: y - 2, w: W - 2 * g.mx, h: 4 }, ctx => hair(ctx, g.mx, y, W - g.mx, y, th.ink, 1.5), { name: 'Rule' }); }
    },
  };
  GC.block = {                // a full-bleed highlight panel holding the headline
    ink: th => onHi(th), hiInk: (th, b) => (th.hi === b.yellow ? b.cream : b.yellow),
    head(scene, o) { const { g, reel, H, W } = o, y1 = Math.round(H * (reel ? 0.6 : 0.63)); return { opts: { maxW: W - 2 * g.mx, maxH: y1 - g.ruleTop - 160, size: reel ? 160 : 140, min: 60, weight: 600, lh: 0.95, track: -0.05, maxLines: 5 }, y: P => y1 - (reel ? 64 : 56) - P.h }; },
    build(scene, add, o) {
      const { g, th, brand: b, slide: sl, W, H, reel } = o, y0 = g.ruleTop + (reel ? 34 : 28), y1 = Math.round(H * (reel ? 0.6 : 0.63));
      add('art', { x: 0, y: y0, w: W, h: y1 - y0 }, ctx => { ctx.fillStyle = th.name === 'Violet' ? b.black : th.hi; ctx.fillRect(0, y0, W, y1 - y0); }, { name: 'Panel', behind: true });
      if (sl.tag) add('tag', { x: g.mx, y: y0 + 44, w: 300, h: chipH(scene) }, ctx => chip(ctx, b, sl.tag, g.mx, y0 + 44, LS(scene), onHi(th)), { name: 'Tag' });
      add('art', { x: W - g.mx - 80, y: y0 + 40, w: 80, h: 60 }, ctx => arrowGlyph(ctx, W - g.mx, y0 + 40 + LS(scene), 46, onHi(th), 3), { name: 'Arrow mark' });
    },
  };
  GC.index = {                // a giant number, then the title
    head(scene, o) { const { g, reel, H } = o, nh = numSize(scene, o); return { opts: { maxW: g.col(1, 11).w, maxH: H * 0.3, size: reel ? 128 : 112, min: 56, weight: 600, lh: 0.96, track: -0.048, maxLines: 4 }, y: () => g.top + nh * 0.8 + (reel ? 56 : 44) }; },
    build(scene, add, o) {
      const { g, th, brand: b, slide: sl, W } = o, n = String(sl.num || pad2(Math.max(1, scene.total - 2))), sz = numSize(scene, o);
      add('art', { x: g.mx, y: g.top, w: W - 2 * g.mx, h: sz * 0.8 }, ctx => { setFont(ctx, b, 500, sz, -0.07); ctx.fillStyle = th.hi; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'right'; ctx.fillText(n, W - g.mx + sz * 0.02, g.top + sz * 0.74); ctx.textAlign = 'left'; if (sl.tag) chip(ctx, b, sl.tag, g.mx, g.top, LS(scene), th.ink); }, { name: 'Number' });
    },
  };
  function numSize(scene, o) { const n = String(o.slide.num || pad2(Math.max(1, scene.total - 2))); return Math.min(fitLine(o.brand, n, o.g.col(5, 8).w, o.reel ? 560 : 470, 500, 120, -0.07), o.H * 0.36); }
  R.GRID_COVER_NAMES = { type: 'Big type', block: 'Colour block', index: 'Big number' };

  // closing slide: a three-column contact row above the footer
  R.GRID_CTA = (scene, add, o) => {
    const { g, th, brand: b, W, footTop } = o, ls = LS(scene), rowH = ls + 20 + 40 * K(scene), y = (footTop || g.bottom) - rowH - (g.reel ? 72 : 56);
    [['Follow', b.handle || '@sixjulydesign'], ['Visit', b.site || 'sixjuly.com'], ['Save', 'For your next brief']].forEach(([k, v], i) => {
      const c = g.col(1 + i * 4, 4);
      add('visual', { x: c.x, y, w: c.w, h: rowH }, ctx => { hair(ctx, c.x, y, c.x + c.w, y, th.ink, 1.5); label(ctx, b, k, c.x, y + 18, ls, th.mute); setFont(ctx, b, 500, 32 * K(scene), -0.02); ctx.fillStyle = th.ink; ctx.textBaseline = 'top'; ctx.fillText(v, c.x, y + 18 + ls + 14); ctx.textBaseline = 'alphabetic'; }, { unit: i, name: k });
    });
  };

  // ---- grid layouts for the core slide kinds ------------------------------------------------------------------------------------------------------------
  GRID.list = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, items = (sl.items || []).slice(0, 6), n = Math.max(1, items.length), ls = LS(scene), tx = vis.x + scene.g.colW + scene.g.gut, tw = vis.x + vis.w - tx;
    const rh = Math.min(vis.h / n, (scene.g.reel ? 250 : 210)), size = Math.min(...items.map(t => fit(b, t, tw, rh - 56, 60 * K(scene)).size));
    items.forEach((t, i) => { const P = lay(b, t, { maxW: tw, size, weight: 500, lh: 1.08, track: -0.03 }), yy = vis.y + i * rh;
      add('visual', { x: vis.x, y: yy, w: vis.w, h: rh }, ctx => { hair(ctx, vis.x, yy, vis.x + vis.w, yy, i ? th.line : th.ink, 1.5); label(ctx, b, pad2(i + 1), vis.x, yy + 28 + (P.size - ls) * 0.28, ls, th.hi); para(ctx, b, th, P, tx, yy + 24); if (i === n - 1) hair(ctx, vis.x, yy + rh, vis.x + vis.w, yy + rh, th.line, 1.5); }, { unit: i }); });
  };
  GRID.steps = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, g } = scene, items = (sl.items || []).slice(0, 6), n = items.length, ls = LS(scene);
    if (n === 4 || n === 2) {                                   // a 2-column grid of cells
      const cols = 2, rows = Math.ceil(n / 2), gap = g.gut * 2, cw = g.col(1, 6).w, ch = (vis.h - gap * (rows - 1)) / rows;
      items.forEach((t, i) => { const c = g.col(1 + (i % 2) * 6, 6), y = vis.y + Math.floor(i / 2) * (ch + gap), P = fit(b, t, cw - 8, ch - 90, 58 * K(scene), { lh: 1.06, track: -0.032 });
        add('visual', { x: c.x, y, w: c.w, h: ch }, ctx => { hair(ctx, c.x, y, c.x + c.w, y, i === 0 ? th.hi : th.ink, 4); label(ctx, b, 'Step ' + pad2(i + 1), c.x, y + 24, ls, i === 0 ? th.hi : th.mute); para(ctx, b, th, P, c.x, y + 24 + ls + 28); }, { unit: i }); void cols; });
      return;
    }
    const Ls = rowsFit(b, items, vis.w, vis.h - n * (ls + 64), 58 * K(scene), 0); let y = vis.y;
    items.forEach((t, i) => { const P = Ls[i], h = P.h + ls + 64, yy = y;
      add('visual', { x: vis.x, y: yy, w: vis.w, h }, ctx => { hair(ctx, vis.x, yy, vis.x + vis.w, yy, i === 0 ? th.hi : th.ink, i === 0 ? 4 : 1.5); label(ctx, b, 'Step ' + pad2(i + 1), vis.x, yy + 22, ls, i === 0 ? th.hi : th.mute); para(ctx, b, th, P, vis.x, yy + 22 + ls + 18); }, { unit: i });
      y += h; });
  };
  GRID.compare = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, g } = scene, A = sl.a || { label: 'Before', text: '' }, B = sl.b || { label: 'After', text: '' }, ls = LS(scene), py = vis.y + ls + 26, ph = vis.y + vis.h - py;
    [[A, false], [B, true]].forEach(([d, strong], i) => {
      const c = g.col(1 + i * 6, 6), pad = 36, P = fit(b, plain(d.text), c.w - pad * 2, ph - pad * 2 - 80, 56 * K(scene), { lh: 1.06, track: -0.035 });
      add('visual', { x: c.x, y: vis.y, w: c.w, h: vis.h }, ctx => {
        label(ctx, b, (strong ? '→ ' : '') + (d.label || (strong ? 'After' : 'Before')), c.x, vis.y, ls, strong ? th.hi : th.mute);
        ctx.fillStyle = strong ? th.hi : th.card; rr(ctx, c.x, py, c.w, ph, R0(scene)); ctx.fill(); if (!strong && th.card === th.bg) { ctx.strokeStyle = th.line; ctx.lineWidth = 1.5; rr(ctx, c.x, py, c.w, ph, R0(scene)); ctx.stroke(); }
        para(ctx, b, th, P, c.x + pad, py + pad, { color: strong ? onHi(th) : th.ink, hi: strong ? onHi(th) : th.hi });
        label(ctx, b, strong ? 'B' : 'A', c.x + pad, py + ph - pad - ls, ls, strong ? onHi(th) : th.mute);
      }, { unit: i * 2 });
    });
  };
  GRID.stat = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, g } = scene, st = sl.stat || { value: '3×', label: '' }, val = String(st.value || ''), ls = LS(scene);
    const sz = fitLine(b, val, vis.w, Math.min(vis.h * 0.6, g.reel ? 460 : 400), 500, 100, -0.065), base = vis.y + sz * 0.76, ly = vis.y + sz * 0.92;
    add('visual', { x: vis.x, y: vis.y, w: vis.w, h: sz * 0.9 }, ctx => { setFont(ctx, b, 500, sz, -0.065); ctx.fillStyle = th.hi; ctx.textBaseline = 'alphabetic'; ctx.fillText(val, vis.x - sz * 0.03, base); }, { unit: 0 });
    const P = st.label ? fit(b, plain(st.label), g.col(1, 7).w, vis.y + vis.h - ly - 60, 40 * K(scene), { weight: 400, lh: 1.2, track: -0.015 }) : null, pct = /(\d+(?:\.\d+)?)\s*%/.exec(val);
    add('visual', { x: vis.x, y: ly, w: vis.w, h: vis.y + vis.h - ly }, ctx => {
      hair(ctx, vis.x, ly, vis.x + vis.w, ly, th.ink, 1.5);
      if (P) para(ctx, b, th, P, vis.x, ly + 28);
      if (sl.source) label(ctx, b, 'Source — ' + sl.source, g.col(9, 1).x, ly + 28, ls, th.mute);
      if (pct) { const y = ly + 28 + (P ? P.h : 0) + 40, w = vis.w, f = clamp(parseFloat(pct[1]) / 100); ctx.fillStyle = th.line; ctx.fillRect(vis.x, y, w, 10); ctx.fillStyle = th.hi; ctx.fillRect(vis.x, y, w * f, 10); }
    }, { unit: 1 });
  };
  GRID.quote = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, g } = scene, q = sl.quote || { text: '', by: '' }, ls = LS(scene), qs = 150 * K(scene);
    const P = fit(b, q.text, g.col(1, 11).w, vis.h - qs * 0.6 - 120, 78 * K(scene), { weight: 400, lh: 1.1, track: -0.035 });
    add('visual', { x: vis.x, y: vis.y, w: vis.w, h: qs * 0.6 + P.h + 110 }, ctx => {
      setFont(ctx, b, 500, qs, -0.02); ctx.fillStyle = th.hi; ctx.textBaseline = 'alphabetic'; ctx.fillText('“', vis.x - qs * 0.04, vis.y + qs * 0.72);
      para(ctx, b, th, P, vis.x, vis.y + qs * 0.6);
      if (q.by) { const y = vis.y + qs * 0.6 + P.h + 48; hair(ctx, vis.x, y + ls * 0.55, vis.x + 48, y + ls * 0.55, th.ink, 1.5); label(ctx, b, q.by, vis.x + 64, y, ls, th.ink); }
    }, { unit: 0 });
  };
  GRID.tiles = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, g } = scene, items = (sl.items || []).slice(0, 4), ls = LS(scene), cw = g.col(1, 6).w, gap = g.gut, ch = (vis.h - gap) / 2;
    items.forEach((t, i) => { const c = g.col(1 + (i % 2) * 6, 6), y = vis.y + Math.floor(i / 2) * (ch + gap), strong = i === 0, pad = 30, P = fit(b, t, cw - pad * 2, ch - pad * 2 - ls - 30, 44 * K(scene), { lh: 1.06, track: -0.03 });
      add('visual', { x: c.x, y, w: c.w, h: ch }, ctx => {
        ctx.fillStyle = strong ? th.hi : th.card; rr(ctx, c.x, y, c.w, ch, R0(scene)); ctx.fill(); if (!strong && th.card === th.bg) { ctx.strokeStyle = th.line; ctx.lineWidth = 1.5; rr(ctx, c.x, y, c.w, ch, R0(scene)); ctx.stroke(); }
        label(ctx, b, pad2(i + 1), c.x + pad, y + pad, ls, strong ? onHi(th) : th.hi);
        para(ctx, b, th, P, c.x + pad, y + ch - pad - P.h, { color: strong ? onHi(th) : th.ink, hi: strong ? onHi(th) : th.hi });
      }, { unit: i }); });
  };
  GRID.split = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, g } = scene, A = sl.a || { label: 'Then', text: '' }, B = sl.b || { label: 'Now', text: '' }, ls = LS(scene), half = vis.h * 0.42;
    const Pa = fit(b, plain(A.text), vis.w, half - ls - 40, 56 * K(scene), { weight: 400, track: -0.03 }), Pb = fit(b, plain(B.text), vis.w, vis.h - half - ls - 80, 80 * K(scene), { lh: 1.02, track: -0.045 });
    add('visual', { x: vis.x, y: vis.y, w: vis.w, h: half }, ctx => { label(ctx, b, A.label || 'Then', vis.x, vis.y, ls, th.mute); para(ctx, b, th, Pa, vis.x, vis.y + ls + 24, { color: th.mute, hi: th.mute, sec: th.mute, strike: true }); }, { unit: 0 });
    const y = vis.y + half + 16;
    add('visual', { x: vis.x, y, w: vis.w, h: vis.h - half - 16 }, ctx => { hair(ctx, vis.x, y, vis.x + vis.w, y, th.ink, 1.5); label(ctx, b, '→ ' + (B.label || 'Now'), vis.x, y + 28, ls, th.hi); para(ctx, b, th, Pb, vis.x, y + 28 + ls + 26); }, { unit: 1 });
  };
  GRID.checks = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, g } = scene, ls = LS(scene);
    [[sl.yes || [], false, 'Do'], [sl.no || [], true, 'Don’t']].forEach(([list, no, name], ci) => {
      const c = g.col(1 + ci * 6, 6), items = list.slice(0, 4), Ls = rowsFit(b, items, c.w - 8, vis.h - 90 - items.length * 52, 46 * K(scene), 0, { weight: 400, lh: 1.14, track: -0.025 });
      add('visual', { x: c.x, y: vis.y, w: c.w, h: vis.h }, ctx => {
        tick(ctx, c.x + ls * 0.7, vis.y + ls * 0.7, ls * 0.7, no ? th.sec : th.hi, no); label(ctx, b, name, c.x + ls * 2, vis.y + ls * 0.18, ls, no ? th.sec : th.hi);
        let y = vis.y + ls + 40; Ls.forEach(P => { hair(ctx, c.x, y, c.x + c.w, y, th.line, 1.5); para(ctx, b, th, P, c.x, y + 24, { color: no ? th.mute : th.ink }); y += P.h + 52; });
      }, { unit: ci });
    });
  };
  GRID.timeline = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, pts = (sl.points || []).slice(0, 4), n = Math.max(1, pts.length), cw = vis.w / n, ls = LS(scene), ly = vis.y + 18;
    add('visual', { x: vis.x, y: ly - 2, w: vis.w, h: 4 }, ctx => hair(ctx, vis.x, ly, vis.x + vis.w, ly, th.ink, 1.5), { unit: 0, name: 'Axis' });
    pts.forEach((p, i) => { const x = vis.x + i * cw, last = i === n - 1, Py = fit(b, p.k, cw - 20, 140, 76 * K(scene), { weight: 500, track: -0.05 }), Pt = fit(b, p.v, cw - 28, vis.h - 160 - Py.h, 40 * K(scene), { weight: 400, lh: 1.16, track: -0.02 });
      add('visual', { x, y: vis.y, w: cw, h: vis.h }, ctx => {
        ctx.fillStyle = last ? th.hi : th.bg; ctx.strokeStyle = last ? th.hi : th.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 9, ly, 9, 0, TAU); ctx.fill(); ctx.stroke();
        para(ctx, b, th, Py, x, ly + 40, { color: last ? th.hi : th.ink }); para(ctx, b, th, Pt, x, ly + 40 + Py.h + 18, { color: last ? th.ink : th.mute });
      }, { unit: i + 1 }); });
  };
  GRID.chat = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, msgs = (sl.chat || []).slice(0, 4), ls = LS(scene), mw = vis.w * 0.74, pad = 26;
    const Ls = msgs.map(m => fit(b, m.text, mw - pad * 2, 260, 38 * K(scene), { weight: 400, lh: 1.2, track: -0.015 })); let tot = Ls.reduce((a, P) => a + P.h + pad * 2 + ls + 40, 0), k = Math.min(1, vis.h / tot);
    let y = vis.y; msgs.forEach((m, i) => { const me = m.who === 'me', P = Ls[i], bw = Math.min(mw, P.w + pad * 2 + 4), bh = P.h + pad * 2, x = me ? vis.x + vis.w - bw : vis.x, yy = y;
      add('visual', { x, y: yy, w: bw, h: bh + ls + 14 }, ctx => { label(ctx, b, me ? 'Sixjuly' : 'Client', me ? x + bw : x, yy, ls, me ? th.hi : th.mute, { align: me ? 'right' : 'left' }); ctx.fillStyle = me ? th.hi : th.card; rr(ctx, x, yy + ls + 14, bw, bh, Math.min(bh / 2, 22 * Math.max(0.5, scene.rs))); ctx.fill(); para(ctx, b, th, P, x + pad, yy + ls + 14 + pad, { color: me ? onHi(th) : th.ink, hi: me ? onHi(th) : th.hi }); }, { unit: i });
      y += (bh + ls + 40) * Math.max(0.85, k); });
  };
  GRID.notes = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, g } = scene, notes = (sl.notes || []).slice(0, 3), ls = LS(scene), COL = [b.violet, b.orange, b.yellow], gap = g.gut, ch = (vis.h - gap * (notes.length - 1)) / Math.max(1, notes.length);
    notes.forEach((t, i) => { const y = vis.y + i * (ch + gap), P = fit(b, t, vis.w - 140, ch - 40, 46 * K(scene), { lh: 1.08, track: -0.03 });
      add('visual', { x: vis.x, y, w: vis.w, h: ch }, ctx => { ctx.fillStyle = th.card; rr(ctx, vis.x, y, vis.w, ch, R0(scene)); ctx.fill(); ctx.fillStyle = COL[i % 3]; ctx.fillRect(vis.x, y, 10, ch); label(ctx, b, pad2(i + 1), vis.x + 40, y + (ch - ls) / 2, ls, th.mute); para(ctx, b, th, P, vis.x + 110, y + (ch - P.h) / 2); }, { unit: i }); });
  };
  GRID.poster = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, w = String(sl.word || 'Human'), sz = fitLine(b, w, vis.w, Math.min(vis.h * 0.8, 420), 600, 80, -0.065);
    add('visual', { x: vis.x, y: vis.y + (vis.h - sz * 0.8) / 2, w: vis.w, h: sz * 0.8 }, ctx => { setFont(ctx, b, 600, sz, -0.065); ctx.fillStyle = th.hi; ctx.textBaseline = 'alphabetic'; ctx.fillText(w, vis.x - sz * 0.03, vis.y + (vis.h - sz * 0.8) / 2 + sz * 0.74); }, { unit: 0 });
  };
  GRID.marquee = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, W } = scene, band = up(sl.band || 'Design that matters'), bh = 150 * K(scene), y = vis.y + (vis.h - bh) / 2, ts = bh * 0.52;
    add('visual', { x: 0, y, w: W, h: bh }, (ctx, st) => {
      ctx.fillStyle = th.hi; ctx.fillRect(0, y, W, bh); ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, bh); ctx.clip();
      setFont(ctx, b, 600, ts, -0.03); const seg = band + '   ✦   ', sw = ctx.measureText(seg).width, off = -(((st && st.t) || 0) * 140 % sw);
      ctx.fillStyle = onHi(th); ctx.textBaseline = 'middle'; for (let x = off - sw; x < W + sw; x += sw) ctx.fillText(seg, x, y + bh / 2 + 4); ctx.restore(); ctx.textBaseline = 'alphabetic';
    }, { unit: 0, name: 'Ticker' });
  };

  GRID.flow = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, g } = scene, items = (sl.items || []).slice(0, 4), n = Math.max(1, items.length), ls = LS(scene), gap = Math.max(56, vis.h * 0.07), bh = (vis.h - gap * (n - 1)) / n, span = 7;
    const pos = items.map((_, i) => { const c = g.col(i % 2 ? 13 - span : 1, span); return { x: c.x, w: c.w, y: vis.y + i * (bh + gap) }; });
    items.forEach((t, i) => { const p = pos[i], last = i === n - 1, pad = 28, P = fit(b, t, p.w - pad * 2, bh - pad * 2 - ls - 16, 46 * K(scene), { lh: 1.06, track: -0.03 });
      add('visual', { x: p.x, y: p.y, w: p.w, h: bh }, ctx => {
        if (i) { const q = pos[i - 1], x0 = q.x + q.w / 2, y0 = q.y + bh, x1 = p.x + p.w / 2, ym = y0 + gap / 2; ctx.strokeStyle = th.ink; ctx.lineWidth = 1.5; ctx.lineJoin = 'miter'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, ym); ctx.lineTo(x1, ym); ctx.lineTo(x1, p.y - 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1 - 7, p.y - 10); ctx.lineTo(x1, p.y - 2); ctx.lineTo(x1 + 7, p.y - 10); ctx.stroke(); }
        ctx.fillStyle = last ? th.hi : th.bg; rr(ctx, p.x, p.y, p.w, bh, R0(scene)); ctx.fill(); if (!last) { ctx.strokeStyle = th.ink; ctx.lineWidth = 1.5; rr(ctx, p.x + 0.75, p.y + 0.75, p.w - 1.5, bh - 1.5, R0(scene)); ctx.stroke(); }
        label(ctx, b, pad2(i + 1), p.x + pad, p.y + pad, ls, last ? onHi(th) : th.hi); para(ctx, b, th, P, p.x + pad, p.y + bh - pad - P.h, { color: last ? onHi(th) : th.ink, hi: last ? onHi(th) : th.hi });
      }, { unit: i }); });
  };
  GRID.metrics = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, g } = scene, st = (sl.stats && sl.stats.length ? sl.stats : [{ value: '3×', label: 'faster' }]).slice(0, 3), n = st.length, rh = vis.h / n, ls = LS(scene);
    st.forEach((s0, i) => { const y = vis.y + i * rh, sz = fitLine(b, s0.value, g.col(1, 7).w, Math.min(rh * 0.78, 230 * K(scene)), 500, 60, -0.06), P = fit(b, plain(s0.label), g.col(8, 5).w, rh - 60, 40 * K(scene), { weight: 400, lh: 1.16, track: -0.02 });
      add('visual', { x: vis.x, y, w: vis.w, h: rh }, ctx => { hair(ctx, vis.x, y, vis.x + vis.w, y, i ? th.line : th.ink, 1.5); setFont(ctx, b, 500, sz, -0.06); ctx.fillStyle = i === 0 ? th.hi : th.ink; ctx.textBaseline = 'alphabetic'; ctx.fillText(s0.value, vis.x - sz * 0.03, y + 20 + sz * 0.76); label(ctx, b, pad2(i + 1), g.col(8, 1).x, y + 26, ls, th.mute); para(ctx, b, th, P, g.col(8, 1).x, y + 26 + ls + 16); }, { unit: i }); });
  };

  // ---- four structured layouts (every style) ---------------------------------------------------------------------------------------------------------------
  // bento: one large highlight cell plus smaller cells
  L.bento = GRID.bento = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, g = scene.g.col ? scene.g : R.gridGeometry(scene.W, scene.H), items = (sl.items || []).slice(0, 4), ls = LS(scene), gap = g.gut, big = String(sl.value || '');
    const A = { c: g.col(1, 7), y: vis.y, h: items.length > 3 ? vis.h * 0.68 : vis.h }, rest = items.slice(1, 3), rh = (A.h - gap * (rest.length - 1)) / Math.max(1, rest.length);
    const cells = [Object.assign({ t: items[0] || '', strong: true }, A)].concat(rest.map((t, i) => ({ t, c: g.col(8, 5), y: vis.y + i * (rh + gap), h: rh })));
    if (items[3]) cells.push({ t: items[3], c: { x: vis.x, w: vis.w }, y: vis.y + A.h + gap, h: vis.h - A.h - gap });
    cells.forEach((cl, i) => { const pad = 30, P = fit(b, cl.t, cl.c.w - pad * 2, cl.h - pad * 2 - ls - 24 - (cl.strong && big ? 200 : 0), (cl.strong ? 52 : 38) * K(scene), { lh: 1.06, track: -0.03 });
      add('visual', { x: cl.c.x, y: cl.y, w: cl.c.w, h: cl.h }, ctx => {
        ctx.fillStyle = cl.strong ? th.hi : th.card; rr(ctx, cl.c.x, cl.y, cl.c.w, cl.h, 14 * Math.max(scene.rs, 0.5)); ctx.fill(); if (!cl.strong && th.card === th.bg) { ctx.strokeStyle = th.line; ctx.lineWidth = 1.5; rr(ctx, cl.c.x, cl.y, cl.c.w, cl.h, 14 * Math.max(scene.rs, 0.5)); ctx.stroke(); }
        const ink = cl.strong ? onHi(th) : th.ink; label(ctx, b, pad2(i + 1), cl.c.x + pad, cl.y + pad, ls, cl.strong ? ink : th.hi);
        if (cl.strong && big) { const s = fitLine(b, big, cl.c.w - pad * 2, 220 * K(scene), 500, 60, -0.06); setFont(ctx, b, 500, s, -0.06); ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic'; ctx.fillText(big, cl.c.x + pad - 4, cl.y + pad + ls + 20 + s * 0.78); }
        para(ctx, b, th, P, cl.c.x + pad, cl.y + cl.h - pad - P.h, { color: ink, hi: cl.strong ? ink : th.hi });
      }, { unit: i }); });
  };
  // table: a comparison table with a header row
  L.table = GRID.table = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, cols = (sl.cols && sl.cols.length ? sl.cols : ['', 'Before', 'After']).slice(0, 4), rows = (sl.rows || []).slice(0, 6), ls = LS(scene), nc = cols.length, first = vis.w * (nc > 2 ? 0.34 : 0.5), cw = (vis.w - first) / Math.max(1, nc - 1);
    const xs = cols.map((_, i) => (i === 0 ? vis.x : vis.x + first + (i - 1) * cw)), ws = cols.map((_, i) => (i === 0 ? first : cw) - 24), hy = vis.y;
    add('visual', { x: vis.x, y: hy, w: vis.w, h: ls + 30 }, ctx => { cols.forEach((c, i) => label(ctx, b, c, xs[i], hy, ls, i === nc - 1 ? th.hi : th.mute)); hair(ctx, vis.x, hy + ls + 22, vis.x + vis.w, hy + ls + 22, th.ink, 1.5); }, { unit: 0, name: 'Header' });
    const size0 = 44 * K(scene), avail = vis.h - ls - 30; let size = size0, laid;
    for (; size >= 22; size -= 2) { laid = rows.map(r => cols.map((_, i) => lay(b, String(r[i] == null ? '' : r[i]), { maxW: ws[i], size, weight: i === 0 ? 500 : 400, lh: 1.16, track: -0.02 }))); if (laid.reduce((a, r) => a + Math.max(...r.map(P => P.h)) + 56, 0) <= avail) break; }
    let y = hy + ls + 30;
    laid.forEach((r, ri) => { const h = Math.max(...r.map(P => P.h)) + 56, yy = y;
      add('visual', { x: vis.x, y: yy, w: vis.w, h }, ctx => { r.forEach((P, i) => para(ctx, b, th, P, xs[i], yy + 28, { color: i === nc - 1 ? th.ink : i === 0 ? th.ink : th.mute })); hair(ctx, vis.x, yy + h, vis.x + vis.w, yy + h, th.line, 1.5); }, { unit: ri + 1 });
      y += h; });
  };
  // feature: a framed image with a figure caption, then a two-column text block
  L.feature = GRID.feature = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, g = scene.g.col ? scene.g : R.gridGeometry(scene.W, scene.H), ls = LS(scene), ih = Math.round(vis.h * 0.58), im = sl.imgs && sl.imgs[0] && R.imgs.get(sl.imgs[0]);
    add('visual', { x: vis.x, y: vis.y, w: vis.w, h: ih }, ctx => {
      ctx.save(); rr(ctx, vis.x, vis.y, vis.w, ih, R0(scene)); ctx.clip();
      if (im && im.complete && im.naturalWidth) { const k = Math.max(vis.w / im.naturalWidth, ih / im.naturalHeight); ctx.drawImage(im, vis.x + (vis.w - im.naturalWidth * k) / 2, vis.y + (ih - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); }
      else {                                                               // generated artwork: a quiet composition in the brand colours
        const c6 = g.col(1, 6), x2 = g.col(7, 1).x; ctx.fillStyle = th.card; ctx.fillRect(vis.x, vis.y, vis.w, ih);
        ctx.fillStyle = b.violet; ctx.fillRect(c6.x, vis.y, c6.w, ih);
        ctx.fillStyle = b.orange; ctx.beginPath(); ctx.arc(c6.x + c6.w, vis.y + ih * 0.5, ih * 0.26, -Math.PI / 2, Math.PI / 2); ctx.fill();
        ctx.fillStyle = b.yellow; ctx.fillRect(g.col(10, 1).x, vis.y + ih * 0.62, g.col(10, 3).w, ih * 0.38);
        ctx.strokeStyle = mix(th.ink, th.card, 0.75); ctx.lineWidth = 1; for (let i = 7; i <= 12; i++) { const x = g.col(i, 1).x; hair(ctx, x, vis.y, x, vis.y + ih, ctx.strokeStyle, 1); }
        setFont(ctx, b, 500, ih * 0.3, -0.06); ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'alphabetic'; ctx.fillText('Aa', c6.x + 32, vis.y + ih - 36); void x2;
      }
      ctx.restore();
    }, { unit: 0, name: 'Image' });
    const y = vis.y + ih + 22, P = fit(b, sl.body || '', g.col(6, 7).w, vis.y + vis.h - y - ls - 30, 34 * K(scene), { weight: 400, lh: 1.24, track: -0.015 });
    add('visual', { x: vis.x, y, w: vis.w, h: vis.y + vis.h - y }, ctx => {
      label(ctx, b, 'Fig. ' + pad2(1) + ' — ' + (sl.caption || 'Detail'), vis.x, y, ls, th.mute);
      hair(ctx, vis.x, y + ls + 26, vis.x + vis.w, y + ls + 26, th.ink, 1.5);
      label(ctx, b, sl.kicker || 'Why it works', vis.x, y + ls + 50, ls, th.hi);
      para(ctx, b, th, P, g.col(6, 1).x, y + ls + 48);
    }, { unit: 1 });
  };
  // columns: three short columns with labels (problem / approach / result)
  L.columns = GRID.columns = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, g = scene.g.col ? scene.g : R.gridGeometry(scene.W, scene.H), cols = (sl.cols && sl.cols.length ? sl.cols : [{ k: 'Problem', v: '' }, { k: 'Approach', v: '' }, { k: 'Result', v: '' }]).slice(0, 3), n = cols.length, span = 12 / n, ls = LS(scene);
    const tall = scene.g.reel || vis.h > vis.w * 0.9, vertical = tall && n === 3 && false;
    cols.forEach((c, i) => { const cc = g.col(1 + i * span, span), P = fit(b, c.v || '', cc.w - 6, vis.h - ls - 120, (n === 3 ? 46 : 54) * K(scene), { weight: 500, lh: 1.08, track: -0.03 });
      add('visual', { x: cc.x, y: vis.y, w: cc.w, h: vis.h }, ctx => { hair(ctx, cc.x, vis.y, cc.x + cc.w, vis.y, i === 0 ? th.hi : th.ink, 4); label(ctx, b, pad2(i + 1), cc.x, vis.y + 26, ls, i === 0 ? th.hi : th.mute); label(ctx, b, c.k, cc.x, vis.y + 26 + ls + 10, ls, th.ink); para(ctx, b, th, P, cc.x, vis.y + 26 + ls * 2 + 50); }, { unit: i }); });
    void vertical;
  };

  // every grid layout runs with the style's body font (Editorial → serif, Mono → mono)
  Object.keys(GRID).forEach(k => { const f = GRID[k]; GRID[k] = function (scene) { const bd = scene.style && scene.style.body; BODY = bd && FAM[bd.fam] || null; BODYW = (bd && bd.weight) || 900; try { return f.apply(this, arguments); } finally { BODY = null; BODYW = 900; } }; });
  ['bento', 'table', 'feature', 'columns'].forEach(k => (L[k] = GRID[k]));
  STY.editorial.body = { fam: 'serif', weight: 400 }; STY.mono.body = { fam: 'mono', weight: 500 };

  R.LAYOUT_INFO = Object.assign(R.LAYOUT_INFO || {}, { bento: 'Modular cells: one large highlight cell and smaller ones', table: 'Comparison table with a header row', feature: 'Framed image with a figure caption and a text column', columns: 'Three labelled columns (problem / approach / result)' });
})();
