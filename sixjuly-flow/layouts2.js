/* Sixjuly Flow — design-language library.
   Seven style packs and thirteen layouts distilled from how leading studios and companies build their layouts (grids and rules,
   editorial type, hard-edged mono, bento tiles, flat colour posters, soft gradients). Everything is drawn from the Sixjuly palette,
   fonts and logo, so it all stays on brand. Nothing here reproduces another brand's marks, imagery or copy; see DESIGN-LANGUAGE.md.
   A style pack changes the type profile, the chrome around the slide (rules, folio, frames, backgrounds), corner scale and default theme.
   It sits on top of the layouts, so every slide kind works in every style. */
(function () {
  'use strict';
  const R = window.SixjulyRender, U = R.U, FAM = R.FAM;
  const { rr, setFont, layoutRich, fitRich, fitLine, clamp, TAU, plain, mix } = U;
  const L = R.LAYOUTS, STY = R.STYLES, CH = R.CHROME;
  const pad2 = n => String(n).padStart(2, '0');
  const up = s => String(s == null ? '' : s).toUpperCase();
  const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rich = (ctx, b, th, L2, x, y, o) => {             // paint a laid-out rich text block with highlight colours
    o = o || {}; setFont(ctx, b, L2.weight, L2.size, L2.track, L2.fam); ctx.textBaseline = 'top';
    L2.words.forEach(w => w.runs.forEach(r => { ctx.fillStyle = r.c === 'hi' ? th.hi : r.c === 'sec' ? th.sec : (o.color || th.ink); ctx.fillText(r.t, x + w.x + r.x, y + w.y + L2.lh * (o.dy != null ? o.dy : 0.06)); }));
    ctx.textBaseline = 'alphabetic';
  };
  const mono = (ctx, b, text, x, y, size, color, o) => { o = o || {}; setFont(ctx, b, o.weight || 400, size, o.track != null ? o.track : 0.1, FAM.mono); ctx.fillStyle = color; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(up(text), x, y); ctx.textAlign = 'left'; };
  const hair = (ctx, x0, y0, x1, y1, color, w) => { ctx.strokeStyle = color; ctx.lineWidth = w || 1.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };

  // ---- style packs --------------------------------------------------------------------------------------------------------------------------------
  // from: the public design languages each pack takes its principles from (see DESIGN-LANGUAGE.md); rs = corner scale; chrome = painter below
  STY.sixjuly = { name: 'Sixjuly house', from: 'the Sixjuly brand file', note: 'Violet highlight, orange accent, arrow', theme: 'light' };
  STY.swiss = { name: 'Swiss grid', from: 'Pentagram, IBM Carbon, International Typographic Style', note: 'Flush-left grotesk, hairline rules, folio, no ornament', theme: 'light', dots: false, rs: 0, header: false, arrow: false, chrome: 'swiss', head: { weight: 600, track: -0.045, lh: 1.0, scale: 1.1 }, foot: { weight: 400, track: -0.005 }, sub: { weight: 600 } };
  STY.editorial = { name: 'Editorial', from: 'Collins and editorial brand work', note: 'Serif italic display, cream paper, running head', theme: 'cream', dots: false, rs: 0.35, header: false, chrome: 'editorial', head: { fam: 'serif', weight: 400, track: -0.02, lh: 1.02, scale: 1.25 }, foot: { fam: 'serif', weight: 400, track: 0, scale: 1.14 }, sub: { fam: 'serif', weight: 400, scale: 1.1 } };
  STY.mono = { name: 'Mono terminal', from: 'Porto Rocha, Vercel Geist', note: 'Hard borders, mono labels, coordinates, black', theme: 'dark', dots: false, rs: 0.12, header: false, arrow: false, chrome: 'mono', head: { fam: 'mono', weight: 700, track: -0.03, lh: 1.08, scale: 0.78 }, foot: { fam: 'mono', weight: 400, track: -0.02, scale: 0.74 }, sub: { fam: 'mono', weight: 700, scale: 0.8 } };
  STY.bento = { name: 'Bento', from: 'Apple, Notion, Linear', note: 'Soft modular tiles, calm type, progress dots', theme: 'cream', dots: false, rs: 1.2, chrome: 'bento', head: { weight: 600, track: -0.04, lh: 1.04 }, foot: { weight: 400 } };
  STY.poster = { name: 'Colour poster', from: 'Spotify Wrapped, bold campaign posters', note: 'Flat colour fields, giant black type, type as shape', theme: 'violet', cycle: ['violet', 'orange', 'light', 'violet', 'dark', 'orange'], dots: false, rs: 0.7, chrome: 'poster', head: { weight: 800, track: -0.05, lh: 0.98, scale: 1.18, upper: true }, foot: { weight: 500 }, sub: { weight: 800 } };
  STY.glow = { name: 'Glow', from: 'Stripe and Linear', note: 'Near-black, soft colour glow, light display type, hairline frame', theme: 'dark', dots: false, rs: 0.9, chrome: 'glow', head: { weight: 300, track: -0.05, lh: 1.04, scale: 1.14 }, foot: { weight: 400 } };
  R.STYLE_ORDER = ['sixjuly', 'swiss', 'editorial', 'mono', 'bento', 'poster', 'glow'];

  // ---- chrome: what a style draws around the slide -------------------------------------------------------------------------------------------------------
  const full = o => ({ x: 0, y: 0, w: o.W, h: o.H });
  CH.swiss = (scene, add, o) => {
    const { g, th, brand, W, H, index, total, reel } = o, mx = g.mx, top = reel ? 196 : 66, bot = g.bottom + (reel ? 40 : 34);
    add(full(o), ctx => {
      hair(ctx, mx, top, W - mx, top, th.ink, 3); mono(ctx, brand, 'Sixjuly — studio notes', mx, top - 16, reel ? 24 : 20, th.ink, { weight: 700 }); mono(ctx, brand, `${pad2(index + 1)} / ${pad2(total)}`, W - mx, top - 16, reel ? 24 : 20, th.ink, { weight: 700, align: 'right' });
      hair(ctx, mx, bot, W - mx, bot, th.ink, 1.5); mono(ctx, brand, brand.site || 'sixjuly.com', mx, bot + 30, reel ? 21 : 18, th.mute); mono(ctx, brand, brand.handle || '@sixjulydesign', W - mx, bot + 30, reel ? 21 : 18, th.mute, { align: 'right' });
      ctx.fillStyle = th.hi; ctx.fillRect(mx, top - 3, 96, 8);                           // the one accent: a short violet bar on the top rule
    });
  };
  CH.editorial = (scene, add, o) => {
    const { g, th, brand, W, H, index, total, reel } = o, mx = g.mx, top = reel ? 200 : 74, bot = g.bottom + (reel ? 36 : 36);
    add(full(o), ctx => {
      setFont(ctx, brand, 'italic 400', reel ? 32 : 28, 0, FAM.serif); ctx.fillStyle = th.ink; ctx.textBaseline = 'alphabetic'; ctx.fillText('Sixjuly Design Studio', mx, top - 14); ctx.textAlign = 'right'; ctx.fillText(`No. ${index + 1}`, W - mx, top - 14); ctx.textAlign = 'left';
      hair(ctx, mx, top, W - mx, top, th.ink, 1.2); hair(ctx, mx, bot, W - mx, bot, th.ink, 1.2);
      mono(ctx, brand, `${brand.site || 'sixjuly.com'}`, W / 2, bot + 32, reel ? 20 : 17, th.mute, { align: 'center', track: 0.22 });
      mono(ctx, brand, `${index + 1} of ${total}`, W - mx, bot + 32, reel ? 20 : 17, th.mute, { align: 'right', track: 0.12 });
    });
  };
  CH.mono = (scene, add, o) => {
    const { g, th, brand, W, H, index, total, reel } = o, m = 28, c = th.ink, a = 'rgba(255,255,255,.34)';
    add(full(o), ctx => {
      ctx.strokeStyle = a; ctx.lineWidth = 1.5; ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
      for (const [x, y] of [[m, m], [W - m, m], [m, H - m], [W - m, H - m]]) { hair(ctx, x - 14, y, x + 14, y, c, 2); hair(ctx, x, y - 14, x, y + 14, c, 2); }
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = m + 54; x < W - m; x += 54) { ctx.moveTo(x, m); ctx.lineTo(x, m + (x % 270 === m + 54 % 270 ? 14 : 8)); } ctx.stroke();
      mono(ctx, brand, `[ ${brand.site || 'sixjuly.com'} ]`, m + 26, m + 46, reel ? 24 : 20, c, { weight: 700 }); mono(ctx, brand, `slide ${pad2(index + 1)}/${pad2(total)}`, W - m - 26, m + 46, reel ? 24 : 20, th.hi, { weight: 700, align: 'right' });
      mono(ctx, brand, brand.handle || '@sixjulydesign', m + 26, H - m - 24, reel ? 22 : 18, th.mute); mono(ctx, brand, `x:${pad2(index + 1)} y:${pad2(total)}`, W - m - 26, H - m - 24, reel ? 22 : 18, th.mute, { align: 'right' });
    });
  };
  CH.bento = (scene, add, o) => {
    const { g, th, W, total, index, reel } = o, mx = g.mx, y = reel ? 170 : 58;
    add(full(o), ctx => { for (let i = 0; i < Math.min(total, 10); i++) { ctx.fillStyle = i === index ? th.hi : th.line; rr(ctx, W - mx - (Math.min(total, 10) - i) * 26 + 6, y, i === index ? 18 : 10, 10, 5); ctx.fill(); } });
  };
  CH.poster = (scene, add, o) => {
    const { g, th, brand, W, H, index, reel } = o, mx = g.mx;
    add(full(o), ctx => {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); setFont(ctx, brand, 800, H * 0.62, -0.06); ctx.fillStyle = th.ink; ctx.globalAlpha = 0.09; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillText(String(index + 1), W + H * 0.05, H * 0.96); ctx.restore();
      mono(ctx, brand, 'Sixjuly ✦ ' + (brand.site || 'sixjuly.com'), mx, reel ? 190 : 70, reel ? 24 : 20, th.ink, { weight: 700 });
    });
  };
  CH.glow = (scene, add, o) => {
    const { g, th, brand, W, H, index, reel } = o, b = brand;
    add(full(o), ctx => {
      const blobs = [[0.12, 0.08, W * 0.75, b.violet, 0.55], [1.0, 0.9, W * 0.62, b.orange, 0.3], [0.92, 0.12, W * 0.55, b.periwinkle, 0.35]];
      ctx.save(); for (const [fx, fy, r, c, a] of blobs) { const gr = ctx.createRadialGradient(W * fx, H * fy, 0, W * fx, H * fy, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); } ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.5; rr(ctx, 36, 36, W - 72, H - 72, 30); ctx.stroke();
      mono(ctx, b, `${pad2(index + 1)}`, W - 86, reel ? 186 : 92, reel ? 24 : 20, 'rgba(255,255,255,.55)', { align: 'right' });
    });
  };

  // ---- new layouts ------------------------------------------------------------------------------------------------------------------------------------------
  const rowsArea = (vis, n, max) => { const rh = Math.min(max, vis.h / Math.max(1, n)); return { rh, y0: vis.y + (vis.h - rh * n) / 2 }; };

  // index: a contents-style list with big mono numbers, hairlines and arrows (Swiss / editorial)
  L.index = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, items = (sl.items || []).slice(0, 6), { rh, y0 } = rowsArea(vis, items.length, scene.g.reel ? 170 : 140);
    items.forEach((txt, i) => { const y = y0 + i * rh, cy = y + rh / 2;
      add('visual', { x: vis.x, y, w: vis.w, h: rh }, ctx => {
        hair(ctx, vis.x, y, vis.x + vis.w, y, th.ink, i ? 1.5 : 3); mono(ctx, b, pad2(i + 1), vis.x, cy + 12, scene.g.reel ? 40 : 34, th.hi, { weight: 700, track: 0 });
        const t = fitRich(b, txt, { maxW: vis.w - 220, maxH: rh - 14, size: scene.g.reel ? 56 : 50, min: 26, weight: 600, lh: 1.08, track: -0.035 }); rich(ctx, b, th, t, vis.x + 120, cy - t.h / 2);
        hair(ctx, vis.x + vis.w - 64, cy, vis.x + vis.w - 8, cy, th.ink, 3.2); hair(ctx, vis.x + vis.w - 22, cy - 14, vis.x + vis.w - 8, cy, th.ink, 3.2); hair(ctx, vis.x + vis.w - 22, cy + 14, vis.x + vis.w - 8, cy, th.ink, 3.2);
        if (i === items.length - 1) hair(ctx, vis.x, y + rh, vis.x + vis.w, y + rh, th.ink, 1.5);
      }, { unit: i }); });
  };

  // spec: a type or system specimen sheet (giant glyph, weight ladder, spec table)
  L.spec = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, glyph = sl.word || 'Aa', specs = (sl.specs && sl.specs.length ? sl.specs : [{ k: 'Family', v: b.font || 'Google Sans Flex' }, { k: 'Weights', v: '300 to 800' }, { k: 'Used for', v: 'Headlines and body' }, { k: 'Tracking', v: '−4% at display sizes' }]).slice(0, 4);
    const gh = vis.h * 0.5, gs = fitLine(b, glyph, vis.w * 0.62, gh * 1.5, 700, 80, -0.05);
    add('visual', { x: vis.x, y: vis.y, w: vis.w * 0.62, h: gh }, ctx => { ctx.fillStyle = th.hi; setFont(ctx, b, 700, gs, -0.05); ctx.textBaseline = 'alphabetic'; ctx.fillText(glyph, vis.x - 6, vis.y + gh * 0.92); }, { unit: 0 });
    const ladder = [300, 400, 600, 800];
    add('visual', { x: vis.x + vis.w * 0.64, y: vis.y, w: vis.w * 0.36, h: gh }, ctx => { ladder.forEach((w, i) => { setFont(ctx, b, w, scene.g.reel ? 44 : 38, -0.02); ctx.fillStyle = th.ink; ctx.fillText('Sixjuly', vis.x + vis.w * 0.64, vis.y + 56 + i * (gh / 4.2)); mono(ctx, b, String(w), vis.x + vis.w, vis.y + 56 + i * (gh / 4.2), 18, th.mute, { align: 'right' }); }); }, { unit: 1 });
    const ty = vis.y + gh + 30, rh = Math.min(86, (vis.h - gh - 30) / specs.length);
    specs.forEach((s, i) => add('visual', { x: vis.x, y: ty + i * rh, w: vis.w, h: rh }, ctx => { hair(ctx, vis.x, ty + i * rh, vis.x + vis.w, ty + i * rh, th.ink, i ? 1 : 2.5); mono(ctx, b, s.k, vis.x, ty + i * rh + rh * 0.62, scene.g.reel ? 24 : 20, th.mute); setFont(ctx, b, 500, scene.g.reel ? 40 : 34, -0.02); ctx.fillStyle = th.ink; ctx.textAlign = 'right'; ctx.fillText(s.v, vis.x + vis.w, ty + i * rh + rh * 0.66); ctx.textAlign = 'left'; }, { unit: 2 + i }));
  };

  // casestudy: image frame plus a meta table (client, role, year, scope), like an agency work page
  L.casestudy = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, meta = (sl.meta && sl.meta.length ? sl.meta : [{ k: 'Client', v: 'Northwind' }, { k: 'Role', v: 'Identity' }, { k: 'Year', v: String(new Date().getFullYear()) }]).slice(0, 4), ih = vis.h * 0.66;
    add('visual', { x: vis.x, y: vis.y, w: vis.w, h: ih }, ctx => {
      const im = sl.imgs && sl.imgs[0] && R.imgs.get(sl.imgs[0]);
      ctx.save(); rr(ctx, vis.x, vis.y, vis.w, ih, 12 * scene.rs); ctx.clip();
      if (im && im.complete && im.naturalWidth) { const k = Math.max(vis.w / im.naturalWidth, ih / im.naturalHeight); ctx.drawImage(im, vis.x + (vis.w - im.naturalWidth * k) / 2, vis.y + (ih - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); }
      else { const r = seeded(hash(plain(sl.head || 'case'))), g = ctx.createLinearGradient(vis.x, vis.y, vis.x + vis.w, vis.y + ih); g.addColorStop(0, b.violet); g.addColorStop(1, b.periwinkle); ctx.fillStyle = g; ctx.fillRect(vis.x, vis.y, vis.w, ih);
        ctx.fillStyle = b.orange; ctx.beginPath(); ctx.arc(vis.x + vis.w * 0.72, vis.y + ih * 0.42, ih * 0.28, 0, TAU); ctx.fill(); ctx.fillStyle = b.yellow; rr(ctx, vis.x + vis.w * 0.12, vis.y + ih * 0.52, vis.w * 0.34, ih * 0.3, 18); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.9)'; setFont(ctx, b, 800, ih * 0.26, -0.06); ctx.fillText(plain(sl.words && sl.words[0] || 'Brand').slice(0, 9), vis.x + vis.w * 0.06, vis.y + ih * 0.42 + r() * 0); }
      ctx.restore();
    }, { unit: 0 });
    const cw = vis.w / meta.length, my = vis.y + ih + 36;
    meta.forEach((m, i) => add('visual', { x: vis.x + i * cw, y: my, w: cw, h: 120 }, ctx => { hair(ctx, vis.x + i * cw, my, vis.x + (i + 1) * cw - 18, my, th.ink, 2.5); mono(ctx, b, m.k, vis.x + i * cw, my + 36, scene.g.reel ? 22 : 18, th.mute); setFont(ctx, b, 600, scene.g.reel ? 40 : 34, -0.03); ctx.fillStyle = th.ink; ctx.fillText(m.v, vis.x + i * cw, my + 84); }, { unit: 1 + i }));
  };

  // principles: huge pale numerals behind short statements (think Rams' ten principles)
  L.principles = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, items = (sl.items || []).slice(0, 4), { rh, y0 } = rowsArea(vis, items.length, scene.g.reel ? 230 : 190);
    items.forEach((txt, i) => { const y = y0 + i * rh;
      add('visual', { x: vis.x, y, w: vis.w, h: rh }, ctx => {
        const ns = rh * 1.15; setFont(ctx, b, 800, ns, -0.06); ctx.fillStyle = th.line; ctx.textBaseline = 'alphabetic'; ctx.fillText(String(i + 1), vis.x - 8, y + rh * 0.9);
        const t = fitRich(b, txt, { maxW: vis.w - rh * 0.8, maxH: rh - 20, size: scene.g.reel ? 54 : 48, min: 26, weight: 600, lh: 1.08, track: -0.03 }); rich(ctx, b, th, t, vis.x + rh * 0.72, y + (rh - t.h) / 2);
        hair(ctx, vis.x, y + rh, vis.x + vis.w, y + rh, th.line, 2);
      }, { unit: i }); });
  };

  // metrics: big figures with hairlines and a small trend line
  L.metrics = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, st = (sl.stats && sl.stats.length ? sl.stats : [{ value: '3×', label: 'faster' }]).slice(0, 3), { rh, y0 } = rowsArea(vis, st.length, scene.g.reel ? 300 : 250);
    st.forEach((s, i) => { const y = y0 + i * rh;
      add('visual', { x: vis.x, y, w: vis.w, h: rh }, ctx => {
        hair(ctx, vis.x, y, vis.x + vis.w, y, th.ink, i ? 1.5 : 3);
        const sz = fitLine(b, s.value, vis.w * 0.52, rh * 0.8, 800, 60, -0.06); setFont(ctx, b, 800, sz, -0.06); ctx.fillStyle = th.hi; ctx.fillText(s.value, vis.x - 4, y + rh * 0.74);
        const t = fitRich(b, plain(s.label), { maxW: vis.w * 0.4, maxH: rh * 0.5, size: scene.g.reel ? 42 : 36, min: 22, weight: 500, lh: 1.12, track: -0.02 }); rich(ctx, b, th, t, vis.x + vis.w * 0.58, y + 38);
        const r = seeded(hash(s.value + i)), x0 = vis.x + vis.w * 0.58, w = vis.w * 0.4, yb = y + rh - 36; ctx.strokeStyle = th.sec; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); let v = 0.2;
        for (let k = 0; k <= 12; k++) { v = clamp(v + 0.05 + (r() - 0.4) * 0.14, 0, 1); const px = x0 + w * k / 12, py = yb - v * 56; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
        if (i === st.length - 1) hair(ctx, vis.x, y + rh, vis.x + vis.w, y + rh, th.ink, 1.5);
      }, { unit: i }); });
  };

  // release: a changelog card with a version pill and tagged changes (Linear-style release notes)
  L.release = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, ch = (sl.changes && sl.changes.length ? sl.changes : [{ tag: 'New', text: 'Slides that animate themselves' }]).slice(0, 5), top = 96;
    add('visual', { x: vis.x, y: vis.y, w: vis.w, h: 70 }, ctx => { setFont(ctx, b, 700, 30, 0.02, FAM.mono); const v = String(sl.version || 'v1.0'), tw = ctx.measureText(v).width + 40; ctx.fillStyle = th.hi; rr(ctx, vis.x, vis.y, tw, 56, 28 * Math.max(0.3, scene.rs)); ctx.fill(); ctx.fillStyle = th.name === 'Violet' ? '#121212' : '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(v, vis.x + 20, vis.y + 30); ctx.textBaseline = 'alphabetic'; mono(ctx, b, sl.date || 'This week', vis.x + tw + 24, vis.y + 38, 22, th.mute); }, { unit: 0 });
    const rows = vis.h - top, rh = Math.min(150, rows / ch.length), y0 = vis.y + top + (rows - rh * ch.length) / 2, COL = { new: scene.brand.violet, improved: scene.brand.periwinkle, fixed: scene.brand.orange };
    ch.forEach((c, i) => { const y = y0 + i * rh;
      add('visual', { x: vis.x, y, w: vis.w, h: rh }, ctx => {
        hair(ctx, vis.x, y, vis.x + vis.w, y, th.line, 2); const col = COL[String(c.tag).toLowerCase()] || scene.brand.violet; setFont(ctx, b, 700, 20, 0.12, FAM.mono); const tg = up(c.tag), tw = ctx.measureText(tg).width + 28;
        ctx.fillStyle = mix(col, th.bg, 0.8); rr(ctx, vis.x, y + rh / 2 - 20, tw, 40, 8 * scene.rs); ctx.fill(); ctx.fillStyle = col; ctx.textBaseline = 'middle'; ctx.fillText(tg, vis.x + 14, y + rh / 2 + 2); ctx.textBaseline = 'alphabetic';
        const t = fitRich(b, c.text, { maxW: vis.w - tw - 30, maxH: rh - 14, size: scene.g.reel ? 48 : 42, min: 24, weight: 500, lh: 1.1, track: -0.025 }); rich(ctx, b, th, t, vis.x + tw + 26, y + (rh - t.h) / 2);
      }, { unit: 1 + i }); });
  };

  // matrix: a 2 x 2 with labelled axes and dots (consulting and strategy diagrams)
  L.matrix = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, ax = sl.axes || { x: ['Low effort', 'High effort'], y: ['Low impact', 'High impact'] }, dots = (sl.dots && sl.dots.length ? sl.dots : [{ label: 'Quick win', x: 0.2, y: 0.8 }, { label: 'Big bet', x: 0.8, y: 0.85 }, { label: 'Later', x: 0.7, y: 0.2 }]).slice(0, 6);
    const s = Math.min(vis.w - 110, vis.h - 70), x0 = vis.x + 110 + (vis.w - 110 - s) / 2, y0 = vis.y + (vis.h - 70 - s) / 2;
    add('visual', { x: x0 - 110, y: y0, w: s + 110, h: s + 70 }, ctx => {
      ctx.fillStyle = mix(th.hi, th.bg, 0.86); ctx.fillRect(x0, y0, s / 2, s / 2); ctx.strokeStyle = th.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + s); ctx.lineTo(x0 + s, y0 + s); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = th.line; ctx.beginPath(); ctx.moveTo(x0 + s / 2, y0); ctx.lineTo(x0 + s / 2, y0 + s); ctx.moveTo(x0, y0 + s / 2); ctx.lineTo(x0 + s, y0 + s / 2); ctx.stroke();
      mono(ctx, b, ax.x[0], x0, y0 + s + 40, 20, th.mute); mono(ctx, b, ax.x[1], x0 + s, y0 + s + 40, 20, th.mute, { align: 'right' });
      ctx.save(); ctx.translate(x0 - 30, y0 + s); ctx.rotate(-Math.PI / 2); mono(ctx, b, ax.y[0], 0, 0, 20, th.mute); mono(ctx, b, ax.y[1], s, 0, 20, th.mute, { align: 'right' }); ctx.restore();
    }, { unit: 0 });
    dots.forEach((d, i) => add('visual', { x: x0 + d.x * s - 20, y: y0 + (1 - d.y) * s - 20, w: 40, h: 40 }, ctx => {
      const px = x0 + clamp(d.x, 0.05, 0.95) * s, py = y0 + (1 - clamp(d.y, 0.05, 0.95)) * s; ctx.fillStyle = i === 0 ? th.sec : th.hi; ctx.beginPath(); ctx.arc(px, py, 16, 0, TAU); ctx.fill();
      setFont(ctx, b, 600, scene.g.reel ? 32 : 28, -0.02); ctx.fillStyle = th.ink; const tw = ctx.measureText(d.label).width, left = px + 30 + tw > x0 + s; ctx.textAlign = left ? 'right' : 'left'; ctx.fillText(d.label, left ? px - 28 : px + 28, py + 10); ctx.textAlign = 'left';
    }, { unit: 1 + i }));
  };

  // system: the brand's own tokens (colour, type scale, shape, spacing) as a design-system board
  L.system = (scene, add, vis) => {
    const { brand: b, theme: th } = scene, cols = [['Violet', b.violet], ['Orange', b.orange], ['Yellow', b.yellow], ['Periwinkle', b.periwinkle], ['Cream', b.cream], ['Black', b.black]], gap = 12, cw = (vis.w - gap * 5) / 6, sh = Math.min(170, vis.h * 0.26);
    add('visual', { x: vis.x, y: vis.y, w: vis.w, h: sh + 70 }, ctx => { mono(ctx, b, 'Colour', vis.x, vis.y + 4, 18, th.mute); cols.forEach(([n, c], i) => { const x = vis.x + i * (cw + gap); ctx.fillStyle = c; rr(ctx, x, vis.y + 20, cw, sh, 14 * scene.rs); ctx.fill(); if (c === '#F9F5EC' || c === b.cream) { ctx.strokeStyle = th.line; ctx.lineWidth = 1.5; rr(ctx, x, vis.y + 20, cw, sh, 14 * scene.rs); ctx.stroke(); } setFont(ctx, b, 600, 20, -0.01); ctx.fillStyle = th.ink; ctx.fillText(n, x, vis.y + sh + 52); mono(ctx, b, c, x, vis.y + sh + 76, 14, th.mute, { track: 0 }); }); }, { unit: 0 });
    const ty = vis.y + sh + 110;
    add('visual', { x: vis.x, y: ty, w: vis.w, h: 230 }, ctx => { mono(ctx, b, 'Type', vis.x, ty, 18, th.mute); [['Display', 800, 84], ['Heading', 500, 54], ['Body', 400, 34]].forEach(([n, w, sz], i) => { const y = ty + 60 + i * 70 + (i ? 14 : 0) + (i > 1 ? 4 : 0); setFont(ctx, b, w, sz, -0.03); ctx.fillStyle = th.ink; ctx.fillText('Sixjuly ' + n, vis.x, y + (i === 0 ? 20 : 0)); mono(ctx, b, `${sz}px · ${w}`, vis.x + vis.w, y + (i === 0 ? 20 : 0), 16, th.mute, { align: 'right', track: 0 }); }); }, { unit: 1 });
    const sy = ty + 250;
    add('visual', { x: vis.x, y: sy, w: vis.w, h: Math.max(100, vis.y + vis.h - sy) }, ctx => { mono(ctx, b, 'Shape', vis.x, sy, 18, th.mute); [0, 12, 28, 60].forEach((r, i) => { const x = vis.x + i * 120; ctx.fillStyle = th.hi; rr(ctx, x, sy + 20, 96, 64, Math.min(r, 32)); ctx.fill(); mono(ctx, b, r ? r + 'px' : 'sharp', x, sy + 112, 15, th.mute, { track: 0 }); });
      mono(ctx, b, 'Space', vis.x + 520, sy, 18, th.mute); [8, 16, 32, 64].forEach((u, i) => { ctx.fillStyle = th.sec; ctx.fillRect(vis.x + 520 + i * 100, sy + 84 - u * 0.9, u * 0.9, u * 0.9); mono(ctx, b, u + 'px', vis.x + 520 + i * 100, sy + 112, 15, th.mute, { track: 0 }); }); }, { unit: 2 });
  };

  // glossary: a dictionary entry
  L.glossary = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, term = sl.term || 'Texture', ts = fitLine(b, term, vis.w, scene.g.reel ? 220 : 190, 400, 80, -0.03, FAM.serif);
    const def = fitRich(b, sl.definition || 'The feel of a surface, brought into a screen so that interfaces look touchable again.', { maxW: vis.w, maxH: vis.h * 0.3, size: scene.g.reel ? 50 : 44, min: 26, weight: 400, lh: 1.2, track: -0.02 }), ex = fitRich(b, sl.example ? '“' + sl.example + '”' : '', { maxW: vis.w - 40, maxH: vis.h * 0.18, size: 34, min: 22, weight: 400, lh: 1.25, track: -0.01 });
    const total = ts * 1.0 + 70 + def.h + (sl.example ? ex.h + 60 : 0), y0 = vis.y + Math.max(0, (vis.h - total) / 2);
    add('visual', { x: vis.x, y: y0, w: vis.w, h: total }, ctx => {
      setFont(ctx, b, 'italic 400', ts, -0.03, FAM.serif); ctx.fillStyle = th.ink; ctx.textBaseline = 'alphabetic'; ctx.fillText(term, vis.x - 4, y0 + ts * 0.82);
      mono(ctx, b, `${sl.phonetic ? sl.phonetic + '   ·   ' : ''}${sl.pos || 'noun'}`, vis.x, y0 + ts * 0.82 + 52, 24, th.hi, { track: 0.04 }); hair(ctx, vis.x, y0 + ts * 0.82 + 84, vis.x + vis.w, y0 + ts * 0.82 + 84, th.ink, 2);
      rich(ctx, b, th, def, vis.x, y0 + ts * 0.82 + 110);
      if (sl.example) { hair(ctx, vis.x, y0 + ts * 0.82 + 130 + def.h, vis.x + 6, y0 + ts * 0.82 + 130 + def.h + ex.h + 8, th.sec, 4); rich(ctx, b, th, ex, vis.x + 24, y0 + ts * 0.82 + 134 + def.h, { color: th.mute }); }
    }, { unit: 0 });
  };

  // stack: offset layers, a simple "how it fits together" diagram
  L.stack = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, items = (sl.items || []).slice(0, 4), n = Math.max(1, items.length), slabH = Math.min(150, vis.h / (n + 1)), step = Math.min(120, (vis.h - slabH) / n), COL = [b.violet, b.periwinkle, b.orange, b.yellow], H0 = slabH + step * (n - 1), y0 = vis.y + (vis.h - H0) / 2;
    for (let k = n - 1; k >= 0; k--) { const i = n - 1 - k, y = y0 + k * step, x = vis.x + (k % 2 ? 40 : 0) + (n - 1 - k) * 0, w = vis.w - 80;
      add('visual', { x, y, w, h: slabH }, ctx => {
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 14; ctx.fillStyle = COL[k % 4]; rr(ctx, x + 40 * (1 - k % 2), y, w, slabH, 28 * scene.rs); ctx.fill(); ctx.restore();
        const ink = (COL[k % 4] === b.yellow || COL[k % 4] === b.orange) ? '#121212' : '#fff'; const t = fitRich(b, items[k], { maxW: w - 100, maxH: slabH - 30, size: scene.g.reel ? 54 : 48, min: 26, weight: 700, lh: 1.05, track: -0.03 });
        ctx.fillStyle = ink; setFont(ctx, b, t.weight, t.size, t.track); ctx.textBaseline = 'top'; t.words.forEach(wd => wd.runs.forEach(r => ctx.fillText(r.t, x + 40 * (1 - k % 2) + 40 + wd.x + r.x, y + (slabH - t.h) / 2 + wd.y + t.lh * 0.06))); ctx.textBaseline = 'alphabetic';
        mono(ctx, b, pad2(k + 1), x + 40 * (1 - k % 2) + w - 36, y + 42, 18, ink, { align: 'right' });
      }, { unit: i }); }
  };

  // flow: a zig-zag process with connectors
  L.flow = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, items = (sl.items || []).slice(0, 4), n = Math.max(1, items.length), bw = vis.w * 0.62, bh = Math.min(150, (vis.h - 30 * (n - 1)) / n), gap = (vis.h - bh * n) / Math.max(1, n - 1), pos = items.map((_, i) => ({ x: vis.x + (i % 2 ? vis.w - bw : 0), y: vis.y + i * (bh + gap) }));
    items.forEach((txt, i) => { const p = pos[i];
      add('visual', { x: p.x, y: p.y, w: bw, h: bh }, ctx => {
        if (i) { const q = pos[i - 1]; ctx.strokeStyle = th.ink; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); const sx = q.x + (i % 2 ? bw : 0) + (i % 2 ? -bw * 0.5 : bw * 0.5), sy = q.y + bh, ex = p.x + (i % 2 ? bw * 0.5 : bw * 0.5), ey = p.y; ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx, sy + gap * 0.6, ex, ey - gap * 0.6, ex, ey - 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex - 10, ey - 16); ctx.lineTo(ex, ey - 3); ctx.lineTo(ex + 10, ey - 16); ctx.stroke(); }
        ctx.fillStyle = i === n - 1 ? th.hi : th.card; ctx.strokeStyle = th.ink; ctx.lineWidth = 3; rr(ctx, p.x, p.y, bw, bh, 26 * scene.rs); ctx.fill(); if (i !== n - 1) ctx.stroke();
        const ink = i === n - 1 ? (th.name === 'Violet' ? '#121212' : '#fff') : th.ink; mono(ctx, b, pad2(i + 1), p.x + 28, p.y + 40, 20, i === n - 1 ? ink : th.hi, { weight: 700 });
        const t = fitRich(b, txt, { maxW: bw - 60, maxH: bh - 66, size: scene.g.reel ? 46 : 40, min: 22, weight: 600, lh: 1.08, track: -0.03 }); ctx.fillStyle = ink; setFont(ctx, b, t.weight, t.size, t.track); ctx.textBaseline = 'top'; t.words.forEach(wd => wd.runs.forEach(r => ctx.fillText(r.t, p.x + 28 + wd.x + r.x, p.y + 56 + wd.y + t.lh * 0.06))); ctx.textBaseline = 'alphabetic';
      }, { unit: i }); });
  };

  // wrapped: one flat colour field, a giant figure repeated as shape (bold type on flat colour)
  L.wrapped = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, W, H } = scene, val = String(sl.value || '7×'), accent = th.name === 'Violet' ? b.yellow : th.name === 'Orange' ? b.cream : th.hi;
    const lab = sl.label ? fitRich(b, plain(sl.label), { maxW: vis.w * 0.8, maxH: vis.h * 0.2, size: scene.g.reel ? 60 : 52, min: 28, weight: 700, lh: 1.05, track: -0.035 }) : null;
    const bottom = vis.y + vis.h, sz = fitLine(b, val, W * 1.05, Math.min(vis.h * 0.62, H * 0.42), 800, 120, -0.08);
    add('art', { x: 0, y: 0, w: W, h: H }, ctx => { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); setFont(ctx, b, 800, sz, -0.08); ctx.textBaseline = 'alphabetic'; ctx.fillStyle = accent;
      [[2, 0.1], [1, 0.25], [0, 1]].forEach(([k, a]) => { ctx.globalAlpha = a; ctx.fillText(val, -sz * 0.04 + k * 14, bottom + sz * 0.02 - k * sz * 0.5); }); ctx.restore(); }, { nosel: true });
    if (lab) add('visual', { x: vis.x, y: vis.y, w: vis.w, h: lab.h }, ctx => rich(ctx, b, th, lab, vis.x, vis.y), { unit: 0 });
  };

  // mesh: a soft gradient hero with optional tag chips
  L.mesh = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, W, H } = scene, clear = c => /^#[0-9a-f]{6}$/i.test(c) ? c + '00' : 'rgba(255,255,255,0)';
    add('art', { x: 0, y: 0, w: W, h: H }, ctx => { const blobs = [[0.18, 0.82, W * 0.85, b.violet, 0.9], [0.9, 0.74, W * 0.7, b.orange, 0.8], [0.5, 1.02, W * 0.75, b.periwinkle, 0.8], [0.82, 0.98, W * 0.5, b.yellow, 0.7]];
      ctx.save(); for (const [fx, fy, r, c, a] of blobs) { const gr = ctx.createRadialGradient(W * fx, H * fy, 0, W * fx, H * fy, r); gr.addColorStop(0, c); gr.addColorStop(1, clear(c)); ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); } ctx.restore(); }, { nosel: true });
    const tags = (sl.tags || []).slice(0, 4); let x = vis.x; const y = vis.y + vis.h - 90;
    tags.forEach((t, i) => { setFont(U.mc, b, 600, 30, -0.01); const w = U.mc.measureText(t).width + 56, x0 = x; x += w + 14;
      add('visual', { x: x0, y, w, h: 64 }, ctx => { setFont(ctx, b, 600, 30, -0.01); ctx.fillStyle = 'rgba(255,255,255,.28)'; rr(ctx, x0, y, w, 64, 32); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; rr(ctx, x0, y, w, 64, 32); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(t, x0 + 28, y + 34); ctx.textBaseline = 'alphabetic'; }, { unit: i }); });
  };

  R.LAYOUT_INFO = Object.assign(R.LAYOUT_INFO || {}, { index: 'Contents-style list with big numbers', spec: 'Type or system specimen sheet', casestudy: 'Image frame with client / role / year table', principles: 'Huge pale numerals behind short statements', metrics: 'Big figures with hairlines and trend lines', release: 'Changelog card with tagged changes', matrix: '2 × 2 with labelled axes and dots', system: 'Brand tokens board: colour, type, shape, space', glossary: 'Dictionary entry', stack: 'Offset layers diagram', flow: 'Zig-zag process with connectors', wrapped: 'Flat colour field with a giant repeated figure', mesh: 'Soft gradient hero with tags' });
})();
