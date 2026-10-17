/* Savio's editor — Vox-style explainer scenes.
   A Vox video is a run of short "beats" on textured paper: title and chapter cards with a yellow highlighter bar,
   scanned documents whose key sentence gets highlighted and a word circled in red marker, archival photos cut out
   with torn white edges and tape, 2.5D parallax (a cut-out subject in front of its own photo, text tucked between
   them; photo walls and paper layers at different depths), headline montages, charts that grow, a search bar, a
   dictionary entry, a declassified page, a social post, a map route, a timeline, a list, a pull quote.
   Graphics move "on twos" (12 fps steps), the paper texture "boils" (re-dealt every frame), every beat has its own
   camera move and the lens hunts for focus while it moves; beats hard-cut into each other.

   doc.vox = { theme, step, hunt, boil, scenes: [{ id, kind, dur, text, word, sub, note, assetId, assetId2, cutId }] }
   is the whole recipe: build(spec, W, H) writes every layer (flagged vox: true), the background, finish, camera keys
   and length from it, for any canvas size. The editor's Vox panel only edits the recipe (S.setVox). */
(function () {
  'use strict';

  const txt = (text, o) => Object.assign({ type: 'text', text }, o);
  const shp = (shape, x, y, w, h, o = {}) => Object.assign({ type: 'shape', shape, x, y, width: w, height: h }, o);
  const stk = (stickerId, x, y, w, h, o = {}) => Object.assign({ type: 'sticker', stickerId, x, y, width: w, height: h }, o);
  const img = (x, y, w, h, o = {}) => Object.assign({ type: 'image', x, y, width: w, height: h }, o);
  const rib = (path, x, y, w, h, o = {}) => Object.assign({ type: 'ribbon', path, x, y, width: w, height: h, line: true, text: '' }, o);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

  /* ── looks ── paper colour, ink, the one hot accent, the highlighter, type and texture */
  const THEMES = {
    paper: {
      label: 'Paper', bg: '#f2ede1', sheet: '#fbf8f0', ink: '#151412', dim: '#5d5850', accent: '#e0312b', hi: '#fff200', band: '#e4dccb',
      background: { color: '#f2ede1', texture: 45, crumple: 22, crumpleSeed: 5, relief: true },
      overlay: { grain: 22, paper: 10, vignette: 22, light: 14, dust: 8 },
    },
    newsprint: {
      label: 'Newsprint', bg: '#e6e1d3', sheet: '#f1ecdf', ink: '#1b1a17', dim: '#55524b', accent: '#c8102e', hi: '#ffe94d', band: '#d6d0bf',
      background: { color: '#e6e1d3', texture: 60, pattern: { type: 'halftone', color: 'rgba(0,0,0,0.05)', size: 12 } },
      overlay: { grain: 30, paper: 16, vignette: 26, dust: 12, grunge: 18 },
    },
    archive: {
      label: 'Archive', bg: '#d9ccb0', sheet: '#efe6d0', ink: '#1c1810', dim: '#5a4f3c', accent: '#b3261e', hi: '#ffd23f', band: '#c9b994',
      background: { color: '#d9ccb0', texture: 60, crumple: 35, crumpleSeed: 11, relief: true },
      overlay: { grain: 28, paper: 14, vignette: 34, dust: 18, grunge: 45, light: 10 },
    },
    clean: {
      label: 'Clean', bg: '#f6f4ef', sheet: '#ffffff', ink: '#111111', dim: '#666666', accent: '#ff4f2e', hi: '#fff200', band: '#e9e6df',
      background: { color: '#f6f4ef', texture: 15 },
      overlay: { grain: 10, vignette: 10 },
    },
  };
  const F = { head: 'Archivo Black', bold: 'Archivo', serif: 'Newsreader', mast: 'Playfair Display', mono: 'IBM Plex Mono', hand: 'Permanent Marker' };

  /* ── scene kinds ── what each beat asks for (fields: [key, label, textarea rows]; photos: [key, label]), default length */
  const KINDS = {
    title: { label: 'Title card', group: 'Type', dur: 3.5, fields: [['text', 'Headline'], ['word', 'Highlighted words'], ['sub', 'Kicker']],
      demo: { text: 'Why everything costs more now', word: 'costs more', sub: 'Explained' } },
    chapter: { label: 'Chapter card', group: 'Type', dur: 3, fields: [['text', 'Chapter title'], ['sub', 'Chapter number']],
      demo: { text: 'The supply shock', sub: '01' } },
    quote: { label: 'Pull quote', group: 'Type', dur: 4.5, fields: [['text', 'Quote', 3], ['word', 'Highlighted words'], ['sub', 'Who said it']],
      demo: { text: 'We never planned for prices to stay this high for this long.', word: 'this long', sub: 'A city planner, 2024' } },
    definition: { label: 'Dictionary entry', group: 'Type', dur: 4.5, fields: [['text', 'Word'], ['note', 'Part of speech · sound'], ['sub', 'Definition', 3], ['word', 'Highlighted words']],
      demo: { text: 'inflation', note: 'noun · in-flay-shun', sub: 'A general rise in prices, and the fall in what the same money can buy.', word: 'what the same money can buy' } },
    document: { label: 'Highlighted document', group: 'Paper', dur: 5, fields: [['text', 'Sentence to highlight', 3], ['word', 'Word to circle'], ['sub', 'Paper name']],
      demo: { text: 'Prices rose faster than wages for the third year in a row.', word: 'wages', sub: 'The Morning Ledger' } },
    headlines: { label: 'Headline montage', group: 'Paper', dur: 4.5, fields: [['text', 'Headlines (one per line)', 4], ['word', 'Highlighted words'], ['sub', 'Paper names (comma between)']],
      demo: { text: 'Prices hit a 40-year high\nShoppers cut back as costs climb\nRents jump again in most cities\nThe end of cheap money', word: 'cheap money', sub: 'The Daily Record, Evening Post, The Courier, Weekly Ledger' } },
    redacted: { label: 'Declassified page', group: 'Paper', dur: 5, fields: [['text', 'Line that gets revealed', 2], ['sub', 'Stamp']],
      demo: { text: 'The committee knew about the shortfall in March.', sub: 'Declassified' } },
    photo: { label: 'Archival photo', group: 'Photo', dur: 4.5, photos: [['assetId', 'Photo']], fields: [['text', 'Caption'], ['sub', 'Handwritten note']],
      demo: { text: 'Factory floor, 1943', sub: 'where it started', assetId: 'film-station' } },
    parallax: { label: 'Cut-out parallax', group: 'Parallax', dur: 5, photos: [['assetId', 'Photo']], cutout: true, fields: [['text', 'Words behind the subject'], ['sub', 'Kicker']],
      demo: { text: 'The worker', sub: 'Part one', assetId: 'ed-suit' } },
    depth: { label: 'Photo wall parallax', group: 'Parallax', dur: 5, photos: [['assetId', 'Front photo']], fields: [['text', 'Caption'], ['sub', 'Heading']],
      demo: { text: 'Archive, 1950–1975', sub: 'Decades of the same story' } },
    layers: { label: 'Paper layers parallax', group: 'Parallax', dur: 4.5, fields: [['text', 'Headline'], ['sub', 'Kicker']],
      demo: { text: 'How did we get here?', sub: 'A short history' } },
    compare: { label: 'Then vs now', group: 'Photo', dur: 5, photos: [['assetId', 'Then photo'], ['assetId2', 'Now photo']], fields: [['text', 'Then label'], ['word', 'Now label'], ['sub', 'Heading']],
      demo: { text: '1975', word: '2025', sub: 'Same street, fifty years apart', assetId: 'film-tram', assetId2: 'film-road' } },
    callouts: { label: 'Photo callouts', group: 'Photo', dur: 5, photos: [['assetId', 'Photo']], fields: [['text', 'Labels (one per line)', 3], ['sub', 'Heading']],
      demo: { text: 'Shipping containers\nIdle cranes\nThe backlog', sub: 'What the port looked like', assetId: 'film-coast' } },
    stat: { label: 'Big number', group: 'Data', dur: 4, fields: [['text', 'Number'], ['sub', 'What it measures']],
      demo: { text: '62%', sub: 'of people say they feel it every month' } },
    chart: { label: 'Bar chart', group: 'Data', dur: 5, fields: [['text', 'Bars (label: value, one per line)', 4], ['word', 'Highlighted bar'], ['sub', 'Heading']],
      demo: { text: '2019: 12\n2020: 18\n2021: 31\n2022: 47\n2023: 64', word: '2023', sub: 'Average rent, in hundreds' } },
    line: { label: 'Line graph', group: 'Data', dur: 5, fields: [['text', 'Values (comma between)'], ['word', 'End label'], ['sub', 'Heading']],
      demo: { text: '10, 12, 11, 15, 14, 22, 30, 41', word: '+310%', sub: 'Shipping costs since 2019' } },
    timeline: { label: 'Timeline', group: 'Data', dur: 5, fields: [['text', 'Years (comma between)'], ['word', 'Highlighted year'], ['sub', 'Heading']],
      demo: { text: '1971, 1980, 2008, 2020, 2024', word: '2008', sub: 'Every time it happened before' } },
    list: { label: 'Ranked list', group: 'Data', dur: 5, fields: [['text', 'Items (one per line)', 4], ['word', 'Highlighted words'], ['sub', 'Heading']],
      demo: { text: 'Housing\nFood\nEnergy\nInsurance', word: 'Housing', sub: 'What got pricier fastest' } },
    map: { label: 'Map route', group: 'Screen', dur: 4.5, photos: [['assetId', 'Map screenshot']], fields: [['text', 'Place'], ['sub', 'Heading']],
      demo: { text: 'Port of Long Beach', sub: 'Where the slowdown began' } },
    search: { label: 'Search bar', group: 'Screen', dur: 4.5, fields: [['text', 'What gets typed'], ['sub', 'Search site name']],
      demo: { text: 'why is everything so expensive', sub: 'Seekly' } },
    post: { label: 'Social post', group: 'Screen', dur: 4.5, fields: [['text', 'Post', 3], ['word', 'Highlighted words'], ['sub', 'Name'], ['note', 'Handle']],
      demo: { text: 'paid $9 for a dozen eggs today. nine dollars. for eggs.', word: 'nine dollars', sub: 'Maya R.', note: '@mayabakes' } },
  };
  let idSeq = 0;
  const newScene = (kind, over) => Object.assign({ id: 's' + Date.now().toString(36) + (idSeq++).toString(36), kind, dur: KINDS[kind].dur }, KINDS[kind].demo, over || {});

  // newspaper filler for the document beat, sentence by sentence (sentences holding the circled word are left out)
  const FILLER = 'Officials said the change had been building for months. Families in the region noticed it first at the grocery store, then at the pump. Economists have argued for years about what drives the trend, and the debate is far from settled. Some point to supply chains that never fully recovered. Others blame a decade of cheap borrowing. The data tell a more complicated story than either side admits. In interviews, shop owners described rising costs that arrived without warning. Many said they had no choice but to pass them on. Analysts expect the pressure to ease, though few will say when. For now, the numbers keep climbing. City leaders met again on Tuesday to discuss what can be done. A report released this week offers the clearest picture yet. It found that the effect is uneven across neighborhoods and incomes. Younger households have been hit hardest. Older residents, many on fixed incomes, are close behind. The report recommends a mix of short and long term measures.'.split(/(?<=\.)\s+/);
  const fillerText = (avoid, chars, from) => {
    const ok = FILLER.filter(s => !avoid || !s.toLowerCase().includes(avoid.toLowerCase()));
    let out = '', i = from % ok.length;
    while (out.length < chars && ok.length) { out += (out ? ' ' : '') + ok[i]; i = (i + 1) % ok.length; }
    return out;
  };
  // "62%" → the steps a roll-up passes through on its way to 62%
  function rollPieces(s) {
    const m = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/.exec(String(s).trim());
    if (!m) return null;
    const n = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, comma = m[2].includes(',');
    if (!isFinite(n)) return null;
    const fmt = v => { let t = v.toFixed(dec); if (comma) t = t.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return m[1] + t + m[3]; };
    return [0.08, 0.27, 0.49, 0.71, 0.88, 1].map(k => fmt(k === 1 ? n : n * k));
  }

  // colour helpers for paper tones
  const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const PHOTO_POOL = ['film-golden', 'film-tram', 'film-road', 'film-friends', 'film-station', 'film-window', 'film-coast', 'film-lamp', 'film-picnic', 'film-canyon'];
  const ARCHIVE = { grayscale: 100, contrast: 16, brightness: 12, halftone: 10 };

  /* ── one beat: its layers inside [s0, s1), plus where the camera goes ── */
  function sceneLayers(sc, s0, s1, P, W, H, idx) {
    const d = s1 - s0, S = Math.min(W, H) / 1080, M = Math.round(Math.min(W, H) * 0.085), wide = W > H * 1.2, tall = H > W * 1.4;
    const at = (t, o) => Object.assign({ delay: s0 + t }, o);
    // parallax drift through this beat only: dx / dy in px over the scene, ds = how much the layer swells (nearer = more)
    const drift = (dx, dy, ds) => ({ loop: 'drift', dx: dx || 0, dy: dy || 0, ds: ds || 0, span: [s0, s1] });
    const ent = (t, enter, extra, dr) => at(t, Object.assign({ enter }, extra || {}, dr || {}));
    const word = String(sc.word || '').trim(), text = String(sc.text || ''), sub = String(sc.sub || ''), note = String(sc.note || '');
    const has = (hay, w) => !!(w && String(hay).toLowerCase().includes(w.toLowerCase()));
    const mark = (style, start, dur, color, marks) => ({ caret: false, blink: false, marks, style, color, wipe: { start: s0 + start, dur } });
    const soft = { on: true, color: '#000000', opacity: 0.22, blur: 26 * S, x: 0, y: 12 * S };
    const lifted = { on: true, color: '#000000', opacity: 0.3, blur: 18 * S, x: 0, y: 9 * S };
    // a rotated group: children placed in the group's own (rotated) frame, all turning about the group's corner
    const group = (gx, gy, deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r); return (el, dx, dy) => Object.assign(el, { x: gx + dx * c - dy * sn, y: gy + dx * sn + dy * c, rotation: deg }); };
    const heading = (t, y, o) => txt(t, Object.assign({ x: M, y, align: 'left', autoWidth: false, width: W - 2 * M, fontFamily: F.head, fontSize: Math.round((wide ? 64 : 60) * S), lineHeight: 1, fill: P.ink, anim: ent(0.1, 'rise', { speed: 1.3, dist: 40 * S }) }, o || {}));
    const label = (t, x, y, o) => txt(t, Object.assign({ x, y, align: 'left', fontFamily: F.mono, fontWeight: 700, fontSize: Math.round(28 * S), letterSpacing: 0.06, fill: '#ffffff', bg: { style: 'box', color: P.ink, padX: 16 * S, padY: 9 * S } }, o || {}));
    const els = [];
    let cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: 0.5, z: 1.06 }];
    switch (sc.kind) {
      case 'title': {
        const y0 = H * (tall ? 0.36 : wide ? 0.3 : 0.32), hs = Math.round((wide ? 118 : tall ? 118 : 108) * S);
        els.push(
          txt(sub.toUpperCase(), { x: M, y: y0, align: 'left', fontFamily: F.mono, fontWeight: 600, fontSize: Math.round(30 * S), letterSpacing: 0.16, fill: P.accent, anim: ent(0.15, 'typewriter', { speed: 1.6 }) }),
          shp('rect', M, y0 + 52 * S, Math.min(W - 2 * M, 240 * S), 6 * S, { fill: P.ink, anim: ent(0.05, 'wipe', { speed: 1.3 }) }),
          txt(text, { x: M, y: y0 + 92 * S, align: 'left', autoWidth: false, width: W - 2 * M, fontFamily: F.head, fontSize: hs, lineHeight: 0.98, letterSpacing: -0.01, fill: P.ink,
            anim: ent(0.3, 'rise', { speed: 1.1 }), typing: word ? mark('marker', 1.0, 0.5, P.hi, [word]) : undefined }),
        );
        cam = [{ x: 0.5, y: 0.48, z: 1 }, { x: 0.47, y: 0.46, z: 1.08 }];
        break;
      }
      case 'chapter': {
        // the chapter number, then a torn paper band laid over its foot, the title on the band
        const cy = H * 0.5, bh = Math.min(H * 0.3, (wide ? 250 : 280) * S), fs = Math.round((wide ? 330 : 300) * S);
        els.push(
          txt(sub || '01', { cx: W / 2, cy: cy - bh * 0.5 - fs * 0.22, align: 'center', fontFamily: F.head, fontSize: fs, lineHeight: 1, letterSpacing: -0.03, fill: P.accent, anim: ent(0, 'drop', { speed: 1.5, dist: 160 * S }) }),
          shp('torn', -W * 0.05, cy - bh / 2, W * 1.1, bh, { fill: P.sheet, texture: 45, seed: 7 + idx, tornSides: 'tb', shadow: soft, anim: ent(0.15, 'wipe', { speed: 1.8 }) }),
          txt(text, { cx: W / 2, cy, align: 'center', autoWidth: false, width: W - 2 * M, fontFamily: F.head, fontSize: Math.round((wide ? 84 : 70) * S), lineHeight: 1, fill: P.ink, anim: ent(0.45, 'rise', { speed: 1.3, dist: 30 * S }) }),
          txt('CHAPTER', { cx: W / 2, cy: cy + bh / 2 + 50 * S, align: 'center', fontFamily: F.mono, fontWeight: 600, fontSize: Math.round(26 * S), letterSpacing: 0.4, fill: P.dim, anim: ent(0.7, 'typewriter', { speed: 2 }) }),
        );
        // a slow pull-out, for a change of pace
        cam = [{ x: 0.5, y: 0.5, z: 1.08 }, { x: 0.5, y: 0.5, z: 1 }];
        break;
      }
      case 'definition': {
        const x0 = M, y0 = H * (wide ? 0.2 : tall ? 0.28 : 0.2), ws = Math.round((wide ? 150 : 128) * S), dy = y0 + ws * 1.15;
        els.push(
          txt(text, { x: x0, y: y0, align: 'left', fontFamily: F.mast, fontWeight: 800, fontSize: ws, lineHeight: 1, fill: P.ink, anim: ent(0, 'fade', { speed: 2.5 }) }),
          txt(note, { x: x0 + 4 * S, y: dy, align: 'left', fontFamily: F.serif, italic: true, fontSize: Math.round(40 * S), fill: P.dim, anim: ent(0.45, 'fade', { speed: 1.6 }) }),
          shp('rect', x0, dy + 72 * S, W - 2 * M, 3 * S, { fill: P.ink, anim: ent(0.6, 'wipe', { speed: 1.2 }) }),
          txt('1.', { x: x0, y: dy + 104 * S, align: 'left', fontFamily: F.serif, fontWeight: 700, fontSize: Math.round(46 * S), fill: P.accent, anim: ent(0.9, 'fade', { speed: 2 }) }),
          txt(sub, { x: x0 + 62 * S, y: dy + 104 * S, align: 'left', autoWidth: false, width: W - 2 * M - 62 * S, fontFamily: F.serif, fontSize: Math.round(46 * S), lineHeight: 1.32, fill: P.ink,
            anim: ent(0.9, 'fade', { speed: 1.6 }), typing: word && has(sub, word) ? mark('marker', 1.7, 0.8, P.hi, [word]) : undefined }),
        );
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.46, y: 0.5, z: 1.09 }];
        break;
      }
      case 'document': {
        const pw = wide ? W * 0.48 : W * 0.86, ph = wide ? H * 0.88 : H * (tall ? 0.74 : 0.8), px = (W - pw) / 2, py = (H - ph) / 2, pad = 54 * S;
        const fs = Math.round((wide ? 25 : 30) * S), lh = 1.42, bodyY = py + pad + 150 * S, bodyW = pw - pad * 2;
        // how much text fits, so the key sentence lands near the middle of the page and the page stays full
        const cpl = bodyW / (fs * 0.47), lines = Math.max(4, Math.floor((py + ph - pad - bodyY) / (fs * lh)) - 1);
        const cap = cpl * lines, before = fillerText(word, Math.max(0, cap * 0.42 - text.length / 2), idx * 3), after = fillerText(word, Math.max(0, cap * 0.58 - text.length / 2), idx * 3 + 7);
        const body = (before + ' ' + text + ' ' + after).trim();
        const bodyEl = { x: px + pad, y: bodyY, align: 'left', autoWidth: false, width: bodyW, fontFamily: F.serif, fontWeight: 400, fontSize: fs, lineHeight: lh, fill: '#2a2825' };
        const keyLine = Math.floor(before.length / cpl) + 0.5, slide = ent(0, 'rise', { speed: 1.5, dist: 140 * S });
        els.push(
          shp('rect', px, py, pw, ph, { fill: P.sheet, texture: 40, shadow: soft, anim: slide }),
          txt(sub || 'The Daily Record', { cx: W / 2, y: py + pad * 0.7, fontFamily: F.mast, fontWeight: 800, fontSize: Math.round((wide ? 50 : 58) * S), fill: P.ink, anim: slide }),
          shp('rect', px + pad, py + pad * 0.7 + 86 * S, pw - pad * 2, 3 * S, { fill: P.ink, anim: slide }),
          txt('VOL. CXII · NO. 38 · LATE EDITION', { cx: W / 2, y: py + pad * 0.7 + 98 * S, fontFamily: F.mono, fontSize: Math.round(17 * S), letterSpacing: 0.12, fill: P.dim, anim: slide }),
          txt(body, Object.assign({}, bodyEl, { anim: slide, typing: mark('marker', 0.9, Math.min(1.4, 0.5 + text.length / 90), P.hi, [text.trim()]) })),
        );
        // the red circle rides on an invisible copy of the page text, so it finds the word wherever it wraps
        if (has(text, word)) els.push(txt(body, Object.assign({}, bodyEl, { fill: 'transparent', name: 'Circle', typing: mark('circle', 2.1, 0.55, P.accent, [word]) })));
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: clamp((bodyY + keyLine * fs * lh) / H, 0.3, 0.7), z: wide ? 1.55 : 1.45 }];
        break;
      }
      case 'headlines': {
        // clippings cut in one after another, each a little crooked, drifting on the table; the last one gets the highlighter
        const lines = text.split('\n').map(t => t.trim()).filter(Boolean).slice(0, 5), papers = sub.split(',').map(t => t.trim()).filter(Boolean);
        const n = Math.max(1, lines.length), r = rnd(hash(sc.id) + idx), cw = wide ? W * 0.44 : W * 0.82, step = Math.min(0.75, (d - 1.4) / n);
        let last = [0.5, 0.5];
        lines.forEach((hl, i) => {
          const a = (r() - 0.5) * 9, fs = Math.round(cw * (hl.length > 34 ? 0.07 : 0.085)), ch = cw * (wide ? 0.4 : 0.42);
          const cx = W / 2 + (r() - 0.5) * W * (wide ? 0.36 : 0.12), cy = H / 2 + (i - (n - 1) / 2) * H * (wide ? 0.12 : 0.115) + (r() - 0.5) * H * 0.03;
          const g = group(cx - cw / 2, cy - ch / 2, a), t = 0.1 + i * step, dr = drift((r() - 0.5) * 40 * S, (r() - 0.5) * 24 * S);
          const an = ent(t, 'drop', { speed: 2.2, dist: 70 * S }, dr), from = s0 + t;
          els.push(
            Object.assign(g(shp('rect', 0, 0, cw, ch, { fill: P.sheet, texture: 50, shadow: lifted, anim: an }), 0, 0), { _from: from }),
            Object.assign(g(txt((papers[i % Math.max(1, papers.length)] || 'The Daily Record').toUpperCase(), { align: 'left', fontFamily: F.mono, fontWeight: 600, fontSize: Math.round(cw * 0.028), letterSpacing: 0.14, fill: P.dim, anim: an }), cw * 0.06, ch * 0.09), { _from: from }),
            Object.assign(g(shp('rect', 0, 0, cw * 0.88, Math.max(2, 2.5 * S), { fill: P.ink, anim: an }), cw * 0.06, ch * 0.22), { _from: from }),
            Object.assign(g(txt(hl, { align: 'left', autoWidth: false, width: cw * 0.88, fontFamily: F.mast, fontWeight: 800, fontSize: fs, lineHeight: 1.02, fill: P.ink, anim: an,
              typing: has(hl, word) ? mark('marker', t + 0.45, 0.5, P.hi, [word]) : undefined }), cw * 0.06, ch * 0.3), { _from: from }),
          );
          last = [cx / W, cy / H];
        });
        cam = [{ x: 0.5, y: 0.5, z: 1.02 }, { x: 0.5 + (last[0] - 0.5) * 0.6, y: 0.5 + (last[1] - 0.5) * 0.6, z: 1.14 }];
        break;
      }
      case 'redacted': {
        // a declassified page: lines blacked out bar by bar, then one bar is lifted and the line under it highlighted
        const pw = wide ? W * 0.5 : W * 0.86, ph = wide ? H * 0.88 : H * (tall ? 0.72 : 0.8), px = (W - pw) / 2, py = (H - ph) / 2, pad = 56 * S;
        const fs = Math.round((wide ? 25 : 30) * S), lh = fs * 1.42, bodyY = py + pad + 120 * S, bodyW = pw - pad * 2, rows = Math.max(6, Math.floor((py + ph - pad - bodyY) / lh));
        const cpl = bodyW / (fs * 0.47), r = rnd(hash(sc.id) + 5), key = Math.floor(rows * 0.5), slide = ent(0, 'rise', { speed: 1.6, dist: 120 * S });
        els.push(
          shp('rect', px, py, pw, ph, { fill: P.sheet, texture: 55, shadow: soft, anim: slide }),
          txt('MEMORANDUM · FILE 27-B · CONFIDENTIAL', { x: px + pad, y: py + pad, align: 'left', fontFamily: F.mono, fontWeight: 600, fontSize: Math.round(20 * S), letterSpacing: 0.1, fill: P.dim, anim: slide }),
          shp('rect', px + pad, py + pad + 46 * S, bodyW, 2 * S, { fill: P.ink, anim: slide }),
          txt(fillerText('', cpl * rows, idx * 5), { x: px + pad, y: bodyY, align: 'left', autoWidth: false, width: bodyW, fontFamily: F.mono, fontSize: Math.round(fs * 0.86), lineHeight: lh / (fs * 0.86), fill: '#2f2c27', anim: slide }),
        );
        let bars = 0;
        for (let row = 0; row < rows - 1; row++) {
          if (row === key || row === key + 1) continue;
          if (r() < 0.45) {
            const x = px + pad + (r() < 0.5 ? 0 : r() * bodyW * 0.3), w = Math.min(px + pad + bodyW - x, bodyW * (0.3 + r() * 0.7));
            els.push(shp('rect', x, bodyY + row * lh + lh * 0.12, w, lh * 0.78, { fill: '#121110', anim: ent(0.5 + bars * 0.09, 'wipe', { speed: 3 }) }));
            bars++;
          }
        }
        // the revealed line sits on a clean strip; its bar wipes on, holds, and is lifted with a cut
        const ky = bodyY + key * lh;
        els.push(
          shp('rect', px + pad - 6 * S, ky - 4 * S, bodyW + 12 * S, lh * 2 + 8 * S, { fill: P.sheet, anim: slide }),
          txt(text, { x: px + pad, y: ky + lh * 0.1, align: 'left', autoWidth: false, width: bodyW, fontFamily: F.mono, fontWeight: 600, fontSize: Math.round(fs * 0.9), lineHeight: lh / (fs * 0.9), fill: P.ink, anim: slide,
            typing: mark('marker', 2.4, 0.8, P.hi, [text.trim()]) }),
          Object.assign(shp('rect', px + pad, ky + lh * 0.12, bodyW, lh * 1.78, { fill: '#121110', anim: ent(0.4, 'wipe', { speed: 2.5 }) }), { _to: s0 + 2.1 }),
        );
        if (sub) els.push(txt(sub.toUpperCase(), { cx: px + pw * 0.66, cy: py + ph * 0.16, rotation: -11, fontFamily: F.head, fontSize: Math.round(54 * S), letterSpacing: 0.04, fill: P.accent, opacity: 0.88,
          bg: { style: 'box', color: 'rgba(0,0,0,0)', borderWidth: 6 * S, borderColor: P.accent, padX: 22 * S, padY: 10 * S }, anim: ent(3.0, 'zoom', { speed: 2.5 }) }));
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: clamp((ky + lh) / H, 0.3, 0.7), z: wide ? 1.5 : 1.4 }];
        break;
      }
      case 'photo': {
        const ph = wide ? H * 0.64 : tall ? W * 0.82 : H * 0.5, pw = wide ? ph * 1.3 : W * 0.72, cx = wide ? W * 0.43 : W / 2, cy = H * (wide ? 0.47 : 0.42);
        const x = cx - pw / 2, y = cy - ph / 2, dr = drift(-30 * S, -10 * S);
        els.push(
          img(x, y, pw, ph, { assetId: sc.assetId || undefined, placeholder: ['#9b958a', '#4d4943'], name: 'Archival photo', rotation: -2.5,
            filters: ARCHIVE, frame: { style: 'papercut', color: '#f4f1ea', size: Math.round(24 * S) },
            shadow: { on: true, color: '#000000', opacity: 0.32, blur: 22 * S, x: 0, y: 12 * S }, anim: ent(0.05, 'land', { spin: -10 }, dr) }),
          stk('tape-masking', x + pw * 0.36, y - 30 * S, 230 * S, 66 * S, { rotation: 3, anim: ent(0.55, 'pop', {}, dr) }),
          txt(text, { x: x + 14 * S, y: y + ph + 36 * S, align: 'left', fontFamily: F.mono, fontWeight: 600, fontSize: Math.round(30 * S), fill: P.ink, bg: { style: 'box', color: '#ffffff', padX: 16 * S, padY: 9 * S },
            anim: ent(0.9, 'wipe', { speed: 1.6 }) }),
        );
        if (sub) {
          const nx = wide ? x + pw + 40 * S : W - M - 330 * S, ny = wide ? y + ph * 0.18 : Math.max(M, y - 150 * S);
          els.push(
            txt(sub, { x: nx, y: ny, align: 'left', fontFamily: F.hand, fontSize: Math.round(46 * S), fill: P.accent, rotation: -5, anim: ent(1.75, 'fade', { speed: 2 }, drift(14 * S, 0)) }),
            rib('hook', wide ? nx - 120 * S : nx - 40 * S, ny + 64 * S, 150 * S, 120 * S, { color: P.accent, thickness: Math.max(4, 7 * S), arrowEnd: true, rotation: wide ? 10 : 70, anim: ent(1.45, 'draw', { speed: 1.3 }) }),
          );
        }
        cam = [{ x: 0.5, y: 0.5, z: 1.02 }, { x: cx / W, y: cy / H, z: 1.1 }];
        break;
      }
      case 'parallax': {
        // 2.5D: the photo far back (soft once there is a cut-out), the words in the middle, the cut-out subject in front,
        // each layer gliding and swelling at its own rate — nearer layers more — while the camera eases in
        const k = 1.12, bw = W * k, bh = H * k, bx = (W - bw) / 2, by = (H - bh) / 2, crop = { zoom: 1, x: 0.5, y: 0.32 };
        const asset = sc.assetId || 'ed-suit', cut = sc.cutId, fs = Math.round(Math.min((wide ? 240 : 200) * S, W * 0.92 / Math.max(3, text.length * 0.62)));
        els.push(
          img(bx, by, bw, bh, { assetId: asset, name: 'Background', crop, filters: Object.assign({}, ARCHIVE, cut ? { brightness: -2 } : {}), lblur: cut ? { gauss: 5 * S } : undefined,
            anim: ent(0, 'fade', { speed: 5 }, drift(-22 * S, 0, 0.03)) }),
          txt(text.toUpperCase(), { cx: W / 2, cy: H * (wide ? 0.4 : 0.34), align: 'center', autoWidth: false, width: W * 0.94, fontFamily: F.head, fontSize: fs, lineHeight: 0.9, letterSpacing: -0.01, fill: P.accent,
            shadow: { on: true, color: '#000000', opacity: 0.25, blur: 18 * S, x: 0, y: 8 * S }, anim: ent(0.25, 'rise', { speed: 1.2, dist: 60 * S }, drift(-48 * S, 0, 0.06)) }),
        );
        if (cut) els.push(img(bx, by, bw, bh, { assetId: cut, name: 'Cut-out', crop, filters: { grayscale: 100, contrast: 16, brightness: 12 }, outline: { on: true, color: '#f4f1ea', width: Math.round(9 * S) },
          shadow: { on: true, color: '#000000', opacity: 0.45, blur: 26 * S, x: 0, y: 14 * S }, anim: ent(0, 'fade', { speed: 5 }, drift(-70 * S, 0, 0.11)) }));
        else els.push(
          shp('torn', -W * 0.08, H * 0.78, W * 1.16, H * 0.32, { fill: P.sheet, texture: 45, tornSides: 't', seed: 3 + idx, shadow: soft, anim: ent(0, 'fade', { speed: 5 }, drift(-110 * S, 0, 0.04)) }),
          stk('tape-clear', W * 0.62, H * 0.75, 200 * S, 60 * S, { rotation: -6, anim: ent(0.4, 'pop', {}, drift(-110 * S, 0, 0)) }),
        );
        if (sub) els.push(label(sub.toUpperCase(), M, H * (cut ? 0.86 : 0.85), { bg: { style: 'box', color: P.accent, padX: 16 * S, padY: 9 * S }, anim: ent(0.8, 'wipe', { speed: 1.8 }) }));
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: 0.47, z: 1.07 }];
        break;
      }
      case 'depth': {
        // a wall of archival prints in three depths: far ones small, soft and dim, near ones big and sharp, all panning
        // past at their own speeds (the further, the slower)
        const r = rnd(hash(sc.id) + 3), pool = PHOTO_POOL.slice().sort(() => r() - 0.5), rows = [
          { n: wide ? 6 : 5, s: 0.2, blur: 6, dim: -14, dx: -40, y: [0.12, 0.62] },
          { n: wide ? 4 : 3, s: 0.32, blur: 2.5, dim: -6, dx: -110, y: [0.2, 0.7] },
          { n: 2, s: 0.5, blur: 0, dim: 0, dx: -230, y: [0.3, 0.62] },
        ];
        let pi = 0;
        rows.forEach((L, li) => {
          for (let i = 0; i < L.n; i++) {
            const pw = Math.min(W, H) * L.s * (wide ? 1.15 : 1), ph = pw * (0.72 + r() * 0.5), x = (W + 300 * S) * (i + 0.15 + r() * 0.5) / L.n - 60 * S, y = H * (L.y[0] + r() * (L.y[1] - L.y[0]));
            const hero = li === 2 && i === 0 && sc.assetId;
            els.push(img(x, y, pw, ph, { assetId: hero ? sc.assetId : pool[pi++ % pool.length], rotation: (r() - 0.5) * 10, filters: Object.assign({}, ARCHIVE, { brightness: ARCHIVE.brightness + L.dim }),
              frame: { style: li === 2 ? 'papercut' : 'border', color: '#f4f1ea', size: Math.round((li === 2 ? 20 : 8) * S) }, lblur: L.blur ? { gauss: L.blur * S } : undefined,
              shadow: li ? lifted : undefined, opacity: li === 0 ? 0.8 : 1, anim: ent(0.05 + li * 0.15, 'fade', { speed: 4 }, drift(L.dx * S, (r() - 0.5) * 20 * S, li * 0.03)) }));
          }
        });
        if (sub) els.push(heading(sub, M * 0.9, { width: Math.min(W - 2 * M, 820 * S), bg: { style: 'box', color: P.sheet, padX: 22 * S, padY: 14 * S } }));
        if (text) els.push(label(text.toUpperCase(), M, H * 0.88, { anim: ent(1.1, 'wipe', { speed: 1.8 }) }));
        cam = [{ x: 0.5, y: 0.5, z: 1.0 }, { x: 0.52, y: 0.5, z: 1.05 }];
        break;
      }
      case 'layers': {
        // a paper diorama: a sun disc and torn bands in front of each other, rising at different speeds; the title rides the front band
        const tones = [mix(P.band, P.ink, 0.22), mix(P.band, P.ink, 0.1), P.band, P.sheet], tops = [0.46, 0.56, 0.66, 0.74], spd = [-14, -34, -62, -100];
        els.push(shp('ellipse', W * 0.62 - Math.min(W, H) * 0.2, H * 0.2, Math.min(W, H) * 0.4, Math.min(W, H) * 0.4, { fill: P.accent, texture: 40, anim: ent(0, 'fade', { speed: 4 }, drift(0, -8 * S, 0.02)) }));
        tones.forEach((c, i) => els.push(shp('torn', -W * 0.1, H * tops[i], W * 1.2, H * 0.6, { fill: c, texture: 45, tornSides: 't', seed: 11 + i * 7 + idx, shadow: i ? lifted : undefined,
          anim: ent(0.05 + i * 0.08, 'rise', { speed: 1.4, dist: 80 * S }, drift((i % 2 ? 1 : -1) * 18 * S, spd[i] * S, i * 0.015)) })));
        els.push(
          txt(text, { x: M, y: H * tops[3] + 70 * S, align: 'left', autoWidth: false, width: W - 2 * M, fontFamily: F.head, fontSize: Math.round((wide ? 90 : 78) * S), lineHeight: 1, fill: P.ink,
            anim: ent(0.45, 'rise', { speed: 1.4, dist: 80 * S }, drift(18 * S, spd[3] * S, 0.045)) }),
          txt(sub.toUpperCase(), { x: M, y: M, align: 'left', fontFamily: F.mono, fontWeight: 600, fontSize: Math.round(30 * S), letterSpacing: 0.16, fill: P.ink, anim: ent(0.2, 'typewriter', { speed: 1.8 }) }),
        );
        cam = [{ x: 0.5, y: 0.53, z: 1.05 }, { x: 0.5, y: 0.47, z: 1.05 }];
        break;
      }
      case 'compare': {
        const side = W >= H * 0.95, g = 16 * S, top = H * (side ? 0.22 : 0.15);
        const A = side ? { x: M * 0.6, y: top, w: (W - M * 1.2 - g) / 2, h: H * 0.64 } : { x: M * 0.6, y: top, w: W - M * 1.2, h: (H * 0.8 - g) / 2 };
        const B = side ? { x: A.x + A.w + g, y: A.y, w: A.w, h: A.h } : { x: A.x, y: A.y + A.h + g, w: A.w, h: A.h };
        els.push(
          heading(sub, H * (side ? 0.08 : 0.05)),
          img(A.x, A.y, A.w, A.h, { assetId: sc.assetId || 'film-tram', name: 'Then', filters: Object.assign({}, ARCHIVE, { sepia: 25 }), frame: { style: 'border', color: '#f4f1ea', size: Math.round(10 * S) }, shadow: soft,
            anim: ent(0.1, side ? 'left' : 'rise', { speed: 1.4, dist: 120 * S }) }),
          img(B.x, B.y, B.w, B.h, { assetId: sc.assetId2 || 'film-road', name: 'Now', filters: { contrast: 6, saturation: 8 }, frame: { style: 'border', color: '#f4f1ea', size: Math.round(10 * S) }, shadow: soft,
            anim: ent(0.55, side ? 'right' : 'rise', { speed: 1.4, dist: 120 * S }) }),
          label(text.toUpperCase(), A.x + 26 * S, A.y + 26 * S, { anim: ent(1.0, 'wipe', { speed: 1.8 }) }),
          label(word.toUpperCase(), B.x + 26 * S, B.y + 26 * S, { bg: { style: 'box', color: P.accent, padX: 16 * S, padY: 9 * S }, anim: ent(1.4, 'wipe', { speed: 1.8 }) }),
        );
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: side ? 0.56 : 0.5, y: side ? 0.52 : 0.58, z: 1.06 }];
        break;
      }
      case 'callouts': {
        // the photo full frame; dots pop on the details and leader lines draw out to their labels
        const labels = text.split('\n').map(t => t.trim()).filter(Boolean).slice(0, 4);
        const pts = [[0.24, 0.36], [0.44, 0.56], [0.3, 0.74], [0.5, 0.24]];
        els.push(img(-W * 0.04, -H * 0.04, W * 1.08, H * 1.08, { assetId: sc.assetId || 'film-coast', name: 'Photo', filters: ARCHIVE, anim: ent(0, 'fade', { speed: 5 }, drift(-16 * S, 0, 0.03)) }));
        labels.forEach((l, i) => {
          const [u, v] = pts[i], px = W * u, py = H * v, lx = px + W * (wide ? 0.08 : 0.12), ly = py - H * 0.07, t = 0.5 + i * 0.55;
          els.push(
            shp('ellipse', px - 14 * S, py - 14 * S, 28 * S, 28 * S, { fill: P.accent, stroke: '#ffffff', strokeWidth: 5 * S, anim: ent(t, 'pop', { speed: 1.6 }) }),
            rib(null, px, ly + 22 * S, lx - px, py - ly - 22 * S, { points: [[0, 1], [1, 0]], sharp: true, color: P.accent, thickness: Math.max(3, 5 * S), anim: ent(t + 0.15, 'draw', { speed: 2.4 }) }),
            label(l.toUpperCase(), lx, ly, { bg: { style: 'box', color: '#ffffff', padX: 16 * S, padY: 9 * S }, fill: P.ink, anim: ent(t + 0.35, 'wipe', { speed: 2 }) }),
          );
        });
        if (sub) els.push(heading(sub, M * 0.9, { width: Math.min(W - 2 * M, 820 * S), bg: { style: 'box', color: P.sheet, padX: 22 * S, padY: 14 * S } }));
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.42, y: 0.52, z: 1.1 }];
        break;
      }
      case 'quote': {
        const fs = Math.round((wide ? 72 : 66) * S), y0 = H * (wide ? 0.2 : tall ? 0.26 : 0.2);
        const qLines = Math.ceil(text.length / ((W - 2 * M) / (fs * 0.46)));
        els.push(
          txt('“', { x: M - 8 * S, y: y0 - 60 * S, align: 'left', fontFamily: F.mast, fontWeight: 900, fontSize: Math.round(250 * S), lineHeight: 1, fill: P.accent, anim: ent(0, 'pop', { speed: 2 }) }),
          txt(text, { x: M, y: y0 + 150 * S, align: 'left', autoWidth: false, width: W - 2 * M, fontFamily: F.serif, fontWeight: 500, fontSize: fs, lineHeight: 1.18, fill: P.ink,
            anim: ent(0.1, 'fade', { speed: 1.8 }), typing: word ? mark('marker', 0.9, 0.8, P.hi, [word]) : undefined }),
          txt('— ' + sub.toUpperCase(), { x: M, y: Math.min(H - M - 40 * S, y0 + 150 * S + qLines * fs * 1.18 + 70 * S), align: 'left', fontFamily: F.mono, fontWeight: 500, fontSize: Math.round(28 * S), letterSpacing: 0.1, fill: P.dim, anim: ent(1.7, 'typewriter', { speed: 1.5 }) }),
        );
        // the payoff beat holds almost still
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: 0.5, z: 1.02 }];
        break;
      }
      case 'stat': {
        const pieces = rollPieces(text), fs = Math.round((wide ? 300 : 270) * S), cy = H * 0.42;
        els.push(
          txt(pieces ? pieces.join('\n') : text, { cx: W / 2, cy, align: 'center', fontFamily: F.head, fontSize: fs, lineHeight: 1, letterSpacing: -0.02, fill: P.ink,
            anim: pieces ? ent(0.15, 'roll', { speed: 2.2 }) : ent(0.15, 'pop', { speed: 1.3 }) }),
          rib('swipe', W / 2 - Math.min(W * 0.62, 640 * S) / 2, cy + fs * 0.52, Math.min(W * 0.62, 640 * S), 56 * S, { color: P.accent, thickness: Math.max(6, 13 * S), anim: ent(1.9, 'draw', { speed: 1.1 }) }),
          txt(sub, { cx: W / 2, y: cy + fs * 0.52 + 90 * S, align: 'center', autoWidth: false, width: Math.min(W - 2 * M, 900 * S), fontFamily: F.bold, fontWeight: 700, fontSize: Math.round(44 * S), lineHeight: 1.15, fill: P.ink, anim: ent(0.9, 'rise', { speed: 1.3 }) }),
        );
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: 0.47, z: 1.1 }];
        break;
      }
      case 'chart': case 'line': {
        // a graph-paper card; bars grow from the baseline one by one, or a line draws itself across
        const gw = wide ? W * 0.64 : W - M * 1.2, gh = wide ? H * 0.74 : H * (tall ? 0.56 : 0.66), gx = (W - gw) / 2, gy = wide ? H * 0.2 : H * (tall ? 0.26 : 0.24), pad = 56 * S;
        const card = ent(0, 'rise', { speed: 1.6, dist: 100 * S });
        els.push(
          heading(sub, gy - (wide ? 110 : 120) * S),
          shp('rect', gx, gy, gw, gh, { fill: P.sheet, texture: 40, pattern: { type: 'graph', color: 'rgba(60,95,130,0.22)', size: Math.round(36 * S), thick: 1 }, shadow: soft, anim: card }),
        );
        const x0 = gx + pad + 20 * S, x1 = gx + gw - pad, yTop = gy + pad + 40 * S, base = gy + gh - pad - 50 * S;
        els.push(shp('rect', x0, base, x1 - x0, 4 * S, { fill: P.ink, anim: ent(0.25, 'wipe', { speed: 1.4 }) }));
        if (sc.kind === 'chart') {
          const bars = text.split(/\n|;/).map(t => t.split(':')).filter(p => p.length >= 2 && isFinite(parseFloat(p[1]))).slice(0, 8).map(([l, v]) => ({ l: l.trim(), v: parseFloat(v) }));
          const n = Math.max(1, bars.length), max = Math.max(1e-6, ...bars.map(b => b.v)), slot = (x1 - x0) / n, bw = slot * 0.6;
          let hx = 0.5;
          bars.forEach((b, i) => {
            const hgt = (base - yTop) * 0.92 * b.v / max, x = x0 + slot * i + (slot - bw) / 2, t = 0.5 + i * 0.32, hit = word && b.l.toLowerCase() === word.toLowerCase();
            if (hit) hx = (x + bw / 2) / W;
            els.push(
              shp('rect', x, base - hgt, bw, hgt, { fill: hit ? P.accent : P.ink, anim: ent(t, 'wipe', { dir: 'up', speed: 1.5 }) }),
              txt(String(b.v), { cx: x + bw / 2, cy: base - hgt - 34 * S, align: 'center', fontFamily: F.head, fontSize: Math.round(Math.min(40, slot / S * 0.32) * S), fill: P.ink, anim: ent(t + 0.4, 'pop', { speed: 1.8 }),
                typing: hit ? mark('marker', t + 0.7, 0.4, P.hi, [String(b.v)]) : undefined }),
              txt(b.l, { cx: x + bw / 2, cy: base + 32 * S, align: 'center', fontFamily: F.mono, fontWeight: 600, fontSize: Math.round(Math.min(26, slot / S * 0.2) * S), fill: P.dim, anim: ent(0.3, 'fade', { speed: 2 }) }),
            );
          });
          cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5 + (hx - 0.5) * 0.5, y: 0.5, z: 1.08 }];
        } else {
          const vals = text.split(/[,;\s]+/).map(parseFloat).filter(isFinite).slice(0, 20);
          if (vals.length < 2) vals.push(...[1, 2]);
          const lo = Math.min(...vals), hiV = Math.max(...vals), span = hiV - lo || 1, n = vals.length;
          const pts = vals.map((v, i) => [i / (n - 1), 1 - (v - lo) / span]);
          const lx0 = x0 + 10 * S, ly0 = yTop + 20 * S, lw = x1 - lx0 - 30 * S, lh = base - ly0 - 20 * S;
          const ex = lx0 + lw, ey = ly0 + lh * pts[n - 1][1];
          els.push(
            shp('rect', x0, yTop, 4 * S, base - yTop, { fill: P.ink, anim: ent(0.25, 'wipe', { dir: 'up', speed: 1.4 }) }),
            rib(null, lx0, ly0, lw, lh, { points: pts, sharp: true, color: P.accent, thickness: Math.max(4, 9 * S), anim: ent(0.6, 'draw', { speed: 0.55 }) }),
            shp('ellipse', ex - 30 * S, ey - 30 * S, 60 * S, 60 * S, { fill: 'transparent', stroke: P.accent, strokeWidth: 4 * S, anim: ent(2.4, 'pop', { loop: 'pulse', amount: 3 }) }),
            shp('ellipse', ex - 13 * S, ey - 13 * S, 26 * S, 26 * S, { fill: P.accent, stroke: '#ffffff', strokeWidth: 5 * S, anim: ent(2.35, 'pop', { speed: 1.6 }) }),
          );
          if (word) els.push(txt(word, { cx: ex - 110 * S, cy: Math.max(yTop + 30 * S, ey - 70 * S), align: 'center', fontFamily: F.head, fontSize: Math.round(46 * S), fill: P.ink, bg: { style: 'box', color: P.hi, padX: 14 * S, padY: 6 * S }, anim: ent(2.6, 'pop', { speed: 1.6 }) }));
          cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5 + (ex / W - 0.5) * 0.4, y: 0.5 + (ey / H - 0.5) * 0.4, z: 1.1 }];
        }
        break;
      }
      case 'map': {
        const pinX = W * (wide ? 0.66 : 0.64), pinY = H * (wide ? 0.42 : 0.44);
        if (sc.assetId) els.push(img(0, 0, W, H, { assetId: sc.assetId, name: 'Map', filters: { saturation: -40, contrast: 8, sepia: 15 } }));
        else {
          // no map yet: a plain paper map — water, three land masses, a couple of roads
          els.push(
            shp('rect', 0, 0, W, H, { fill: '#cdd8d2', texture: 35 }),
            shp('blob', -W * 0.2, H * 0.12, W * 0.95, H * 0.6, { fill: '#ebe4cf', texture: 30, seed: 3, stroke: '#b9b19a', strokeWidth: 3 * S }),
            shp('blob', W * 0.48, H * 0.3, W * 0.7, H * 0.5, { fill: '#e6dec6', texture: 30, seed: 9, stroke: '#b9b19a', strokeWidth: 3 * S }),
            shp('blob', W * 0.1, H * 0.72, W * 0.5, H * 0.3, { fill: '#ebe4cf', texture: 30, seed: 14, stroke: '#b9b19a', strokeWidth: 3 * S }),
            rib('wave', W * 0.05, H * 0.28, W * 0.8, H * 0.14, { color: 'rgba(120,110,90,0.45)', thickness: Math.max(2, 4 * S) }),
            rib('scurve', W * 0.45, H * 0.4, W * 0.45, H * 0.3, { color: 'rgba(120,110,90,0.4)', thickness: Math.max(2, 3 * S) }),
          );
        }
        els.push(
          rib('bend', W * 0.12, pinY + 10 * S, pinX - W * 0.12, H * (wide ? 0.4 : 0.3), { color: P.accent, thickness: Math.max(4, 9 * S), dash: 2.2, anim: ent(0.45, 'draw', { speed: 0.75 }) }),
          shp('ellipse', pinX - 46 * S, pinY - 46 * S, 92 * S, 92 * S, { fill: 'transparent', stroke: P.accent, strokeWidth: 5 * S, anim: ent(1.5, 'pop', { loop: 'pulse', amount: 3 }) }),
          shp('ellipse', pinX - 20 * S, pinY - 20 * S, 40 * S, 40 * S, { fill: P.accent, stroke: '#ffffff', strokeWidth: 6 * S, anim: ent(1.45, 'pop', { speed: 1.4 }) }),
          label(text.toUpperCase(), pinX + 60 * S, pinY - 26 * S, { anim: ent(1.75, 'wipe', { speed: 1.8 }) }),
        );
        if (sub) els.push(heading(sub, M, { width: Math.min(W - 2 * M, 760 * S), fontSize: Math.round(54 * S), lineHeight: 1.02, bg: { style: 'box', color: P.sheet, padX: 22 * S, padY: 14 * S }, anim: ent(0.15, 'left', { speed: 1.3, dist: 80 * S }) }));
        // push toward the pin without losing the heading: aim halfway between the centre and the pin
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5 + (pinX / W - 0.5) * 0.5, y: 0.5 + (pinY / H - 0.5) * 0.5, z: 1.22 }];
        break;
      }
      case 'search': {
        // a made-up search page: the logo, a search box, the question typed with a caret, then suggestions drop down
        const bw = Math.min(W - 2 * M, 920 * S), bh = 96 * S, bx = (W - bw) / 2, by = H * (wide ? 0.42 : 0.4), on = ent(0, 'fade', { speed: 3 });
        const sugg = [text, text + ' explained', text + ' right now'];
        els.push(
          txt(sub || 'Seekly', { cx: W / 2, cy: by - 120 * S, align: 'center', fontFamily: F.bold, fontWeight: 800, fontSize: Math.round(92 * S), letterSpacing: -0.03, fill: P.ink, anim: on }),
          shp('pill', bx, by, bw, bh, { fill: '#ffffff', stroke: '#d6d1c4', strokeWidth: 2 * S, shadow: soft, anim: on }),
          shp('ellipse', bx + 34 * S, by + bh / 2 - 17 * S, 28 * S, 28 * S, { fill: 'transparent', stroke: P.dim, strokeWidth: 4 * S, anim: on }),
          shp('rect', bx + 58 * S, by + bh / 2 + 8 * S, 16 * S, 5 * S, { fill: P.dim, rotation: 45, anim: on }),
          txt(text, { x: bx + 96 * S, y: by + bh / 2 - 26 * S, align: 'left', autoWidth: false, width: bw - 130 * S, fontFamily: F.bold, fontWeight: 500, fontSize: Math.round(40 * S), lineHeight: 1.25, fill: P.ink,
            anim: ent(0.5, 'typewriter', { speed: 1.2 }), typing: { caret: true, caretColor: P.accent } }),
          Object.assign(shp('rect', bx + 20 * S, by + bh + 8 * S, bw - 40 * S, 3 * 74 * S + 16 * S, { fill: '#ffffff', shadow: soft }), { _from: s0 + Math.min(d - 1, 2.6) }),
        );
        sugg.forEach((q, i) => els.push(Object.assign(txt(q, { x: bx + 60 * S, y: by + bh + 24 * S + i * 74 * S, align: 'left', autoWidth: false, width: bw - 120 * S, fontFamily: F.bold, fontWeight: i ? 400 : 700, fontSize: Math.round(34 * S), fill: i ? P.dim : P.ink,
          bg: i ? undefined : { style: 'box', color: '#f1eee6', padX: 30 * S, padY: 14 * S } }), { _from: s0 + Math.min(d - 1, 2.6) + i * 0.12 })));
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: (by + bh / 2) / H, z: wide ? 1.28 : 1.1 }];
        break;
      }
      case 'post': {
        // a made-up social app post card; the key phrase gets the highlighter
        const cw = Math.min(W - 2 * M, 880 * S), fs = Math.round(44 * S), lines = Math.max(1, Math.ceil(text.length / ((cw - 90 * S) / (fs * 0.5))));
        const ch = 190 * S + lines * fs * 1.28 + 110 * S, cx0 = (W - cw) / 2, cy0 = H * 0.46 - ch / 2, on = ent(0.05, 'rise', { speed: 1.6, dist: 90 * S });
        els.push(
          shp('rounded', cx0, cy0, cw, ch, { radius: 30 * S, fill: '#ffffff', shadow: soft, anim: on }),
          shp('ellipse', cx0 + 40 * S, cy0 + 40 * S, 92 * S, 92 * S, { fill: P.accent, anim: on }),
          txt((sub || '?').trim().charAt(0).toUpperCase(), { cx: cx0 + 86 * S, cy: cy0 + 86 * S, align: 'center', fontFamily: F.head, fontSize: Math.round(44 * S), fill: '#ffffff', anim: on }),
          txt(sub, { x: cx0 + 156 * S, y: cy0 + 46 * S, align: 'left', fontFamily: F.bold, fontWeight: 800, fontSize: Math.round(38 * S), fill: '#111111', anim: on }),
          txt(note, { x: cx0 + 156 * S, y: cy0 + 92 * S, align: 'left', fontFamily: F.bold, fontWeight: 400, fontSize: Math.round(30 * S), fill: '#777777', anim: on }),
          txt('threadly', { x: cx0 + cw - 190 * S, y: cy0 + 50 * S, align: 'left', fontFamily: F.mono, fontWeight: 700, fontSize: Math.round(24 * S), fill: '#999999', anim: on }),
          txt(text, { x: cx0 + 44 * S, y: cy0 + 170 * S, align: 'left', autoWidth: false, width: cw - 90 * S, fontFamily: F.bold, fontWeight: 500, fontSize: fs, lineHeight: 1.28, fill: '#111111', anim: on,
            typing: has(text, word) ? mark('marker', 1.1, 0.7, P.hi, [word]) : undefined }),
          txt('12.4K likes  ·  3,201 reposts  ·  845 replies', { x: cx0 + 44 * S, y: cy0 + ch - 70 * S, align: 'left', fontFamily: F.mono, fontSize: Math.round(22 * S), fill: '#888888', anim: on }),
        );
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: 0.47, z: 1.12 }];
        break;
      }
      case 'timeline': {
        const years = text.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 6), n = Math.max(1, years.length);
        const ly = H * (tall ? 0.52 : 0.56), x0 = M, x1 = W - M, ys = Math.round((n > 4 || !wide && n > 3 ? 48 : 60) * S);
        els.push(
          heading(sub, H * (wide ? 0.18 : tall ? 0.3 : 0.22), { fontSize: Math.round((wide ? 68 : 64) * S) }),
          shp('rect', x0, ly - 3 * S, x1 - x0, 6 * S, { fill: P.ink, anim: ent(0.3, 'wipe', { speed: 0.7 }) }),
        );
        years.forEach((y, i) => {
          const x = x0 + (x1 - x0) * (i + 0.5) / n, t = 0.55 + i * 0.42, hit = word && y.toLowerCase() === word.toLowerCase();
          els.push(
            shp('ellipse', x - 16 * S, ly - 16 * S, 32 * S, 32 * S, { fill: hit ? P.accent : P.bg, stroke: P.ink, strokeWidth: 5 * S, anim: ent(t, 'pop', { speed: 1.5 }) }),
            txt(y, { cx: x, cy: ly - 72 * S, align: 'center', fontFamily: F.head, fontSize: ys, fill: P.ink, anim: ent(t + 0.05, 'rise', { speed: 1.5 }), typing: hit ? mark('marker', t + 0.45, 0.4, P.hi, [y]) : undefined }),
          );
        });
        cam = wide ? [{ x: 0.44, y: 0.52, z: 1.14 }, { x: 0.56, y: 0.52, z: 1.14 }] : [{ x: 0.48, y: 0.5, z: 1.06 }, { x: 0.52, y: 0.5, z: 1.06 }];
        break;
      }
      case 'list': {
        const items = text.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 6), n = Math.max(1, items.length);
        const top = H * (wide ? 0.34 : 0.32), rowH = Math.min(150 * S, (H * 0.86 - top) / n), bs = Math.round(66 * S);
        els.push(heading(sub, H * (wide ? 0.12 : 0.15), { fontSize: Math.round(62 * S) }));
        items.forEach((it, i) => {
          const y = top + i * rowH, t = 0.45 + i * 0.45, hit = has(it, word);
          els.push(
            shp('ellipse', M, y, bs, bs, { fill: P.accent, anim: ent(t, 'pop', { speed: 1.5 }) }),
            txt(String(i + 1), { cx: M + bs / 2, cy: y + bs / 2, align: 'center', fontFamily: F.head, fontSize: Math.round(34 * S), fill: '#ffffff', anim: ent(t, 'pop', { speed: 1.5 }) }),
            txt(it, { x: M + bs + 30 * S, y: y + bs / 2 - 30 * S, align: 'left', autoWidth: false, width: W - 2 * M - bs - 30 * S, fontFamily: F.bold, fontWeight: 800, fontSize: Math.round(48 * S), lineHeight: 1.1, fill: P.ink,
              anim: ent(t + 0.05, 'left', { speed: 1.4, dist: 60 * S }), typing: hit ? mark('marker', t + 0.55, 0.45, P.hi, [word]) : undefined }),
          );
        });
        cam = [{ x: 0.5, y: 0.46, z: 1.06 }, { x: 0.5, y: 0.54, z: 1.06 }];
        break;
      }
    }
    for (const e of els) {
      // layers cut in during the beat (_from) or lifted before it ends (_to); otherwise they hold the whole beat
      e.time = { start: e._from != null ? e._from : s0, end: e._to != null ? e._to : s1 };
      delete e._from; delete e._to;
      e.vox = true; e.key = 'vox:' + sc.id;
    }
    return { els, cam };
  }

  /* ── the whole video from the recipe ── */
  function build(spec, W, H) {
    const P = THEMES[spec.theme] || THEMES.paper;
    const scenes = (spec.scenes || []).filter(s => KINDS[s.kind]);
    let t = 0;
    const total = scenes.reduce((a, s) => a + clamp(+s.dur || KINDS[s.kind].dur, 1.5, 15), 0) || 4;
    const elements = [], keys = [];
    scenes.forEach((sc, i) => {
      const d = clamp(+sc.dur || KINDS[sc.kind].dur, 1.5, 15), s0 = t, s1 = t + d;
      const r = sceneLayers(sc, s0, s1, P, W, H, i);
      elements.push(...r.els);
      // each beat opens on a hard cut and eases through its own move
      keys.push(Object.assign({ t: s0 }, r.cam[0]), Object.assign({ t: Math.max(s0 + 0.01, s1 - 0.002) }, r.cam[1]));
      t = s1;
    });
    const overlay = JSON.parse(JSON.stringify(P.overlay));
    overlay.boil = +spec.boil || 0;
    return {
      background: JSON.parse(JSON.stringify(P.background)),
      overlay,
      anim: { duration: Math.round(total * 100) / 100, fps: 30, step: spec.step === false || spec.step === 0 ? 0 : (spec.step || 12) },
      camera: { move: 'keys', keys, hunt: +spec.hunt || 0 },
      elements,
    };
  }
  const docFor = (spec, W, H) => Object.assign({ width: W, height: H, vox: spec }, build(spec, W, H));

  /* ── templates: a few complete stories plus one type per beat, each in four sizes ── */
  const SIZES = [['story', 1080, 1920, 'Story 9:16'], ['portrait', 1080, 1350, 'Portrait 4:5'], ['square', 1080, 1080, 'Square 1:1'], ['wide', 1920, 1080, 'Landscape 16:9']];
  const STORIES = [
    ['explainer', 'Full explainer', ['title', 'document', 'photo', 'stat', 'quote'], 'paper'],
    ['parallaxstory', 'Parallax story', ['chapter', 'parallax', 'depth', 'layers', 'quote'], 'newsprint'],
    ['datastory', 'Data story', ['title', 'chart', 'line', 'stat', 'list'], 'clean'],
    ['investigation', 'Investigation', ['headlines', 'redacted', 'search', 'callouts', 'definition'], 'archive'],
    ['internet', 'Internet moment', ['post', 'search', 'headlines', 'stat'], 'paper'],
  ];
  // the single-beat types, in the order the panel shows them
  const SINGLES = ['parallax', 'depth', 'layers', 'title', 'chapter', 'document', 'headlines', 'redacted', 'photo', 'compare', 'callouts', 'quote', 'definition', 'stat', 'chart', 'line', 'timeline', 'list', 'map', 'search', 'post'];
  const recipe = (kinds, theme) => ({ theme: theme || 'paper', step: 12, hunt: 35, boil: theme === 'clean' ? 0 : 35, scenes: kinds.map((k, i) => Object.assign(newScene(k), { id: 'd' + i })) });
  function templates() {
    const types = STORIES.map(([key, name, kinds, theme]) => [key, name, kinds, theme]).concat(SINGLES.map(k => [k, KINDS[k].label, [k], 'paper']));
    return types.flatMap(([key, name, kinds, theme]) => SIZES.map(([o, W, H, label]) => ({
      id: `vox-${key}-${o}`, name: label, family: 'Vox explainer', style: name, orientation: o, tags: ['Video', 'Text', 'Vox'], width: W, height: H, video: true,
      build: () => docFor(recipe(kinds, theme), W, H),
      buildAt: (w, h) => docFor(recipe(kinds, theme), w, h),
    })));
  }

  window.STUDIO_VOX = { THEMES, KINDS, build, newScene, templates };
})();
