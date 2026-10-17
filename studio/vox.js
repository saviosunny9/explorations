/* Savio's editor — Vox-style explainer scenes.
   A Vox video is a run of short "beats" on textured paper: a title card with a yellow highlighter bar, a scanned
   document whose key sentence gets highlighted and a word circled in red marker, archival photos cut out with torn
   white edges and tape, a pull quote, a big number that rolls up, a map with a route drawing on, a timeline, a list.
   Graphics move "on twos" (12 fps steps), every beat gets its own camera move (push in, pan, tilt, static for the
   payoff) and beats hard-cut into each other.

   doc.vox = { theme, step, scenes: [{ id, kind, dur, text, word, sub, assetId }] } is the whole recipe: build(spec, W, H)
   writes every layer (flagged vox: true), the background, finish, camera keys and length from it, for any canvas size.
   The editor's Vox panel only edits the recipe (S.setVox). */
(function () {
  'use strict';

  const txt = (text, o) => Object.assign({ type: 'text', text }, o);
  const shp = (shape, x, y, w, h, o = {}) => Object.assign({ type: 'shape', shape, x, y, width: w, height: h }, o);
  const stk = (stickerId, x, y, w, h, o = {}) => Object.assign({ type: 'sticker', stickerId, x, y, width: w, height: h }, o);
  const img = (x, y, w, h, o = {}) => Object.assign({ type: 'image', x, y, width: w, height: h }, o);
  const rib = (path, x, y, w, h, o = {}) => Object.assign({ type: 'ribbon', path, x, y, width: w, height: h, line: true, text: '' }, o);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ── looks ── paper colour, ink, the one hot accent, the highlighter, type and texture */
  const THEMES = {
    paper: {
      label: 'Paper', bg: '#f2ede1', sheet: '#fbf8f0', ink: '#151412', dim: '#5d5850', accent: '#e0312b', hi: '#fff200',
      background: { color: '#f2ede1', texture: 45, crumple: 22, crumpleSeed: 5, relief: true },
      overlay: { grain: 22, paper: 10, vignette: 22, light: 14, dust: 8 },
    },
    newsprint: {
      label: 'Newsprint', bg: '#e6e1d3', sheet: '#f1ecdf', ink: '#1b1a17', dim: '#55524b', accent: '#c8102e', hi: '#ffe94d',
      background: { color: '#e6e1d3', texture: 60, pattern: { type: 'halftone', color: 'rgba(0,0,0,0.05)', size: 12 } },
      overlay: { grain: 30, paper: 16, vignette: 26, dust: 12 },
    },
    clean: {
      label: 'Clean', bg: '#f6f4ef', sheet: '#ffffff', ink: '#111111', dim: '#666666', accent: '#ff4f2e', hi: '#fff200',
      background: { color: '#f6f4ef', texture: 15 },
      overlay: { grain: 10, vignette: 10 },
    },
  };
  const F = { head: 'Archivo Black', bold: 'Archivo', serif: 'Newsreader', mast: 'Playfair Display', mono: 'IBM Plex Mono', hand: 'Permanent Marker' };

  /* ── scene kinds ── what each beat asks for, and how long it runs by default */
  const KINDS = {
    title: { label: 'Title card', dur: 3.5, fields: [['text', 'Headline'], ['word', 'Highlighted words'], ['sub', 'Kicker']],
      demo: { text: 'Why everything costs more now', word: 'costs more', sub: 'Explained' } },
    document: { label: 'Highlighted document', dur: 5, fields: [['text', 'Sentence to highlight', 3], ['word', 'Word to circle'], ['sub', 'Paper name']],
      demo: { text: 'Prices rose faster than wages for the third year in a row.', word: 'wages', sub: 'The Morning Ledger' } },
    photo: { label: 'Archival photo', dur: 4.5, photo: true, fields: [['text', 'Caption'], ['sub', 'Handwritten note']],
      demo: { text: 'Factory floor, 1943', sub: 'where it started', assetId: 'film-station' } },
    quote: { label: 'Pull quote', dur: 4.5, fields: [['text', 'Quote', 3], ['word', 'Highlighted words'], ['sub', 'Who said it']],
      demo: { text: 'We never planned for prices to stay this high for this long.', word: 'this long', sub: 'A city planner, 2024' } },
    stat: { label: 'Big number', dur: 4, fields: [['text', 'Number'], ['sub', 'What it measures']],
      demo: { text: '62%', sub: 'of people say they feel it every month' } },
    map: { label: 'Map route', dur: 4.5, photo: true, fields: [['text', 'Place'], ['sub', 'Heading']],
      demo: { text: 'Port of Long Beach', sub: 'Where the slowdown began' } },
    timeline: { label: 'Timeline', dur: 5, fields: [['text', 'Years (comma between)'], ['word', 'Highlighted year'], ['sub', 'Heading']],
      demo: { text: '1971, 1980, 2008, 2020, 2024', word: '2008', sub: 'Every time it happened before' } },
    list: { label: 'Ranked list', dur: 5, fields: [['text', 'Items (one per line)', 4], ['word', 'Highlighted words'], ['sub', 'Heading']],
      demo: { text: 'Housing\nFood\nEnergy\nInsurance', word: 'Housing', sub: 'What got pricier fastest' } },
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

  /* ── one beat: its layers inside [s0, s1), plus where the camera goes ── */
  function sceneLayers(sc, s0, s1, P, W, H, idx) {
    const d = s1 - s0, S = Math.min(W, H) / 1080, M = Math.round(Math.min(W, H) * 0.085), wide = W > H * 1.2, tall = H > W * 1.4;
    const time = { start: s0, end: s1 };
    const at = (t, o) => Object.assign({ delay: s0 + t }, o);
    const word = String(sc.word || '').trim(), text = String(sc.text || ''), sub = String(sc.sub || '');
    const mark = (style, start, dur, color, marks) => ({ caret: false, blink: false, marks, style, color, wipe: { start: s0 + start, dur } });
    const els = [];
    let cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: 0.5, z: 1.06 }];
    switch (sc.kind) {
      case 'title': {
        const y0 = H * (tall ? 0.36 : wide ? 0.3 : 0.32), hs = Math.round((wide ? 118 : tall ? 118 : 108) * S);
        els.push(
          txt(sub.toUpperCase(), { x: M, y: y0, align: 'left', fontFamily: F.mono, fontWeight: 600, fontSize: Math.round(30 * S), letterSpacing: 0.16, fill: P.accent, anim: at(0.15, { enter: 'typewriter', speed: 1.6 }) }),
          shp('rect', M, y0 + 52 * S, Math.min(W - 2 * M, 240 * S), 6 * S, { fill: P.ink, anim: at(0.05, { enter: 'wipe', speed: 1.3 }) }),
          txt(text, { x: M, y: y0 + 92 * S, align: 'left', autoWidth: false, width: W - 2 * M, fontFamily: F.head, fontSize: hs, lineHeight: 0.98, letterSpacing: -0.01, fill: P.ink,
            anim: at(0.3, { enter: 'rise', speed: 1.1 }), typing: word ? mark('marker', 1.0, 0.5, P.hi, [word]) : undefined }),
        );
        cam = [{ x: 0.5, y: 0.48, z: 1 }, { x: 0.47, y: 0.46, z: 1.08 }];
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
        const keyLine = Math.floor(before.length / cpl) + 0.5;
        els.push(
          shp('rect', px, py, pw, ph, { fill: P.sheet, texture: 40, shadow: { on: true, color: '#000000', opacity: 0.22, blur: 30 * S, x: 0, y: 14 * S }, anim: at(0, { enter: 'rise', speed: 1.5 }) }),
          txt(sub || 'The Daily Record', { cx: W / 2, y: py + pad * 0.7, fontFamily: F.mast, fontWeight: 800, fontSize: Math.round((wide ? 50 : 58) * S), fill: P.ink, anim: at(0, { enter: 'rise', speed: 1.5 }) }),
          shp('rect', px + pad, py + pad * 0.7 + 86 * S, pw - pad * 2, 3 * S, { fill: P.ink, anim: at(0, { enter: 'rise', speed: 1.5 }) }),
          txt('VOL. CXII · NO. 38 · LATE EDITION', { cx: W / 2, y: py + pad * 0.7 + 98 * S, fontFamily: F.mono, fontSize: Math.round(17 * S), letterSpacing: 0.12, fill: P.dim, anim: at(0, { enter: 'rise', speed: 1.5 }) }),
          txt(body, Object.assign({}, bodyEl, { anim: at(0, { enter: 'rise', speed: 1.5 }), typing: mark('marker', 0.9, Math.min(1.4, 0.5 + text.length / 90), P.hi, [text.trim()]) })),
        );
        // the red circle rides on an invisible copy of the page text, so it finds the word wherever it wraps
        if (word && text.toLowerCase().includes(word.toLowerCase())) els.push(txt(body, Object.assign({}, bodyEl, { fill: 'transparent', name: 'Circle', typing: mark('circle', 2.1, 0.55, P.accent, [word]) })));
        const ky = (bodyY + keyLine * fs * lh) / H;
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: clamp(ky, 0.3, 0.7), z: wide ? 1.55 : 1.45 }];
        break;
      }
      case 'photo': {
        const ph = wide ? H * 0.64 : tall ? W * 0.82 : H * 0.5, pw = wide ? ph * 1.3 : W * 0.72, cx = wide ? W * 0.43 : W / 2, cy = H * (wide ? 0.47 : 0.42);
        // parallax: the photo glides one way, the note the other. Drift runs across the whole video, so it is scaled to this
        // beat (k) and each layer starts shifted back by what it has already drifted when the beat opens (off)
        const total = sc._total || d, k = total / d, drift = { dx: -26 * S }, off = v => -v * k * s0 / total;
        const x = cx - pw / 2 + off(drift.dx), y = cy - ph / 2 + off(-8 * S);
        els.push(
          img(x, y, pw, ph, { assetId: sc.assetId || undefined, placeholder: ['#9b958a', '#4d4943'], name: 'Archival photo', rotation: -2.5,
            filters: { grayscale: 100, contrast: 16, brightness: 16, halftone: 12 }, frame: { style: 'papercut', color: '#f4f1ea', size: Math.round(24 * S) },
            shadow: { on: true, color: '#000000', opacity: 0.32, blur: 22 * S, x: 0, y: 12 * S }, anim: at(0.05, { enter: 'land', spin: -10, loop: 'drift', dx: drift.dx * k, dy: -8 * S * k }) }),
          stk('tape-masking', x + pw * 0.36, y - 30 * S, 230 * S, 66 * S, { rotation: 3, anim: at(0.55, { enter: 'pop', loop: 'drift', dx: drift.dx * k, dy: -8 * S * k }) }),
          txt(text, { x: x + 14 * S, y: y + ph + 36 * S, align: 'left', fontFamily: F.mono, fontWeight: 600, fontSize: Math.round(30 * S), fill: P.ink, bg: { style: 'box', color: '#ffffff', padX: 16 * S, padY: 9 * S },
            anim: at(0.9, { enter: 'wipe', speed: 1.6 }) }),
        );
        if (sub) {
          const nx = wide ? x + pw + 40 * S : W - M - 330 * S, ny = wide ? y + ph * 0.18 : Math.max(M, y - 150 * S);
          els.push(
            txt(sub, { x: nx + off(12 * S), y: ny, align: 'left', fontFamily: F.hand, fontSize: Math.round(46 * S), fill: P.accent, rotation: -5, anim: at(1.75, { enter: 'fade', speed: 2, loop: 'drift', dx: 12 * S * k, dy: 0 }) }),
            rib('hook', wide ? nx - 120 * S : nx - 40 * S, ny + 64 * S, 150 * S, 120 * S, { color: P.accent, thickness: Math.max(4, 7 * S), arrowEnd: true, rotation: wide ? 10 : 70, anim: at(1.45, { enter: 'draw', speed: 1.3 }) }),
          );
        }
        cam = [{ x: 0.5, y: 0.5, z: 1.02 }, { x: cx / W, y: cy / H, z: 1.1 }];
        break;
      }
      case 'quote': {
        const fs = Math.round((wide ? 72 : 66) * S), y0 = H * (wide ? 0.2 : tall ? 0.26 : 0.2);
        const qLines = Math.ceil(text.length / ((W - 2 * M) / (fs * 0.46)));
        els.push(
          txt('“', { x: M - 8 * S, y: y0 - 60 * S, align: 'left', fontFamily: F.mast, fontWeight: 900, fontSize: Math.round(250 * S), lineHeight: 1, fill: P.accent, anim: at(0, { enter: 'pop', speed: 2 }) }),
          txt(text, { x: M, y: y0 + 150 * S, align: 'left', autoWidth: false, width: W - 2 * M, fontFamily: F.serif, fontWeight: 500, fontSize: fs, lineHeight: 1.18, fill: P.ink,
            anim: at(0.1, { enter: 'fade', speed: 1.8 }), typing: word ? mark('marker', 0.9, 0.8, P.hi, [word]) : undefined }),
          txt('— ' + sub.toUpperCase(), { x: M, y: Math.min(H - M - 40 * S, y0 + 150 * S + qLines * fs * 1.18 + 70 * S), align: 'left', fontFamily: F.mono, fontWeight: 500, fontSize: Math.round(28 * S), letterSpacing: 0.1, fill: P.dim, anim: at(1.7, { enter: 'typewriter', speed: 1.5 }) }),
        );
        // the payoff beat holds almost still
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: 0.5, z: 1.02 }];
        break;
      }
      case 'stat': {
        const pieces = rollPieces(text), fs = Math.round((wide ? 300 : 270) * S), cy = H * (wide ? 0.42 : 0.42);
        els.push(
          txt(pieces ? pieces.join('\n') : text, { cx: W / 2, cy, align: 'center', fontFamily: F.head, fontSize: fs, lineHeight: 1, letterSpacing: -0.02, fill: P.ink,
            anim: pieces ? at(0.15, { enter: 'roll', speed: 2.2 }) : at(0.15, { enter: 'pop', speed: 1.3 }) }),
          rib('swipe', W / 2 - Math.min(W * 0.62, 640 * S) / 2, cy + fs * 0.52, Math.min(W * 0.62, 640 * S), 56 * S, { color: P.accent, thickness: Math.max(6, 13 * S), anim: at(1.9, { enter: 'draw', speed: 1.1 }) }),
          txt(sub, { cx: W / 2, y: cy + fs * 0.52 + 90 * S, align: 'center', autoWidth: false, width: Math.min(W - 2 * M, 900 * S), fontFamily: F.bold, fontWeight: 700, fontSize: Math.round(44 * S), lineHeight: 1.15, fill: P.ink, anim: at(0.9, { enter: 'rise', speed: 1.3 }) }),
        );
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5, y: 0.47, z: 1.1 }];
        break;
      }
      case 'map': {
        const pinX = W * (wide ? 0.66 : 0.64), pinY = H * (wide ? 0.42 : 0.44);
        if (sc.assetId) els.push(img(0, 0, W, H, { assetId: sc.assetId, name: 'Map', filters: { saturation: -40, contrast: 8, sepia: 15 } }));
        else {
          // no map yet: a plain paper map — water, three land masses, a couple of roads
          els.push(
            shp('rect', 0, 0, W, H, { fill: '#cdd8d2', texture: 35 }),
            shp('blob', -W * 0.2, H * 0.12, W * 0.95, H * 0.6, { fill: '#ebe4cf', texture: 30, points: 7, depth: 0.28, seed: 3, stroke: '#b9b19a', strokeWidth: 3 * S }),
            shp('blob', W * 0.48, H * 0.3, W * 0.7, H * 0.5, { fill: '#e6dec6', texture: 30, points: 8, depth: 0.25, seed: 9, stroke: '#b9b19a', strokeWidth: 3 * S }),
            shp('blob', W * 0.1, H * 0.72, W * 0.5, H * 0.3, { fill: '#ebe4cf', texture: 30, points: 6, depth: 0.3, seed: 14, stroke: '#b9b19a', strokeWidth: 3 * S }),
            rib('wave', W * 0.05, H * 0.28, W * 0.8, H * 0.14, { color: 'rgba(120,110,90,0.45)', thickness: Math.max(2, 4 * S) }),
            rib('scurve', W * 0.45, H * 0.4, W * 0.45, H * 0.3, { color: 'rgba(120,110,90,0.4)', thickness: Math.max(2, 3 * S) }),
          );
        }
        els.push(
          rib('bend', W * 0.12, pinY + 10 * S, pinX - W * 0.12, H * (wide ? 0.4 : 0.3), { color: P.accent, thickness: Math.max(4, 9 * S), dash: 2.2, rotation: 0, anim: at(0.45, { enter: 'draw', speed: 0.75 }) }),
          shp('ellipse', pinX - 46 * S, pinY - 46 * S, 92 * S, 92 * S, { fill: 'transparent', stroke: P.accent, strokeWidth: 5 * S, anim: at(1.5, { enter: 'pop', loop: 'pulse', amount: 3 }) }),
          shp('ellipse', pinX - 20 * S, pinY - 20 * S, 40 * S, 40 * S, { fill: P.accent, stroke: '#ffffff', strokeWidth: 6 * S, anim: at(1.45, { enter: 'pop', speed: 1.4 }) }),
          txt(text.toUpperCase(), { x: pinX + 60 * S, y: pinY - 26 * S, align: 'left', fontFamily: F.mono, fontWeight: 700, fontSize: Math.round(28 * S), letterSpacing: 0.06, fill: '#ffffff', bg: { style: 'box', color: P.ink, padX: 16 * S, padY: 9 * S },
            anim: at(1.75, { enter: 'wipe', speed: 1.8 }) }),
        );
        if (sub) els.push(txt(sub, { x: M, y: M, align: 'left', autoWidth: false, width: Math.min(W - 2 * M, 760 * S), fontFamily: F.head, fontSize: Math.round(54 * S), lineHeight: 1.02, fill: P.ink, bg: { style: 'box', color: P.sheet, padX: 22 * S, padY: 14 * S }, anim: at(0.15, { enter: 'left', speed: 1.3 }) }));
        // push toward the pin without losing the heading: aim halfway between the centre and the pin
        cam = [{ x: 0.5, y: 0.5, z: 1 }, { x: 0.5 + (pinX / W - 0.5) * 0.5, y: 0.5 + (pinY / H - 0.5) * 0.5, z: 1.22 }];
        break;
      }
      case 'timeline': {
        const years = text.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 6), n = Math.max(1, years.length);
        const ly = H * (tall ? 0.52 : 0.56), x0 = M, x1 = W - M, ys = Math.round((n > 4 || !wide && n > 3 ? 48 : 60) * S);
        els.push(
          txt(sub, { x: M, y: H * (wide ? 0.18 : tall ? 0.3 : 0.22), align: 'left', autoWidth: false, width: W - 2 * M, fontFamily: F.head, fontSize: Math.round((wide ? 68 : 64) * S), lineHeight: 1, fill: P.ink, anim: at(0.1, { enter: 'rise', speed: 1.3 }) }),
          shp('rect', x0, ly - 3 * S, x1 - x0, 6 * S, { fill: P.ink, anim: at(0.3, { enter: 'wipe', speed: 0.7 }) }),
        );
        years.forEach((y, i) => {
          const x = x0 + (x1 - x0) * (i + 0.5) / n, t = 0.55 + i * 0.42, hit = word && y.toLowerCase() === word.toLowerCase();
          els.push(
            shp('ellipse', x - 16 * S, ly - 16 * S, 32 * S, 32 * S, { fill: hit ? P.accent : P.bg, stroke: P.ink, strokeWidth: 5 * S, anim: at(t, { enter: 'pop', speed: 1.5 }) }),
            txt(y, { cx: x, cy: ly - 72 * S, align: 'center', fontFamily: F.head, fontSize: ys, fill: P.ink, anim: at(t + 0.05, { enter: 'rise', speed: 1.5 }), typing: hit ? mark('marker', t + 0.45, 0.4, P.hi, [y]) : undefined }),
          );
        });
        cam = wide ? [{ x: 0.44, y: 0.52, z: 1.14 }, { x: 0.56, y: 0.52, z: 1.14 }] : [{ x: 0.48, y: 0.5, z: 1.06 }, { x: 0.52, y: 0.5, z: 1.06 }];
        break;
      }
      case 'list': {
        const items = text.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 6), n = Math.max(1, items.length);
        const top = H * (wide ? 0.34 : 0.32), rowH = Math.min(150 * S, (H * 0.86 - top) / n), bs = Math.round(66 * S);
        els.push(txt(sub, { x: M, y: H * (wide ? 0.12 : 0.15), align: 'left', autoWidth: false, width: W - 2 * M, fontFamily: F.head, fontSize: Math.round(62 * S), lineHeight: 1, fill: P.ink, anim: at(0.1, { enter: 'rise', speed: 1.3 }) }));
        items.forEach((it, i) => {
          const y = top + i * rowH, t = 0.45 + i * 0.45, hit = word && it.toLowerCase().includes(word.toLowerCase());
          els.push(
            shp('ellipse', M, y, bs, bs, { fill: P.accent, anim: at(t, { enter: 'pop', speed: 1.5 }) }),
            txt(String(i + 1), { cx: M + bs / 2, cy: y + bs / 2, align: 'center', fontFamily: F.head, fontSize: Math.round(34 * S), fill: '#ffffff', anim: at(t, { enter: 'pop', speed: 1.5 }) }),
            txt(it, { x: M + bs + 30 * S, y: y + bs / 2 - 30 * S, align: 'left', autoWidth: false, width: W - 2 * M - bs - 30 * S, fontFamily: F.bold, fontWeight: 800, fontSize: Math.round(48 * S), lineHeight: 1.1, fill: P.ink,
              anim: at(t + 0.05, { enter: 'left', speed: 1.4 }), typing: hit ? mark('marker', t + 0.55, 0.45, P.hi, [word]) : undefined }),
          );
        });
        cam = [{ x: 0.5, y: 0.46, z: 1.06 }, { x: 0.5, y: 0.54, z: 1.06 }];
        break;
      }
    }
    for (const e of els) { e.time = Object.assign({}, time); e.vox = true; e.key = 'vox:' + sc.id; }
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
      const r = sceneLayers(Object.assign({}, sc, { _total: total }), s0, s1, P, W, H, i);
      elements.push(...r.els);
      // each beat opens on a hard cut and eases through its own move
      keys.push(Object.assign({ t: s0 }, r.cam[0]), Object.assign({ t: Math.max(s0 + 0.01, s1 - 0.002) }, r.cam[1]));
      t = s1;
    });
    return {
      background: JSON.parse(JSON.stringify(P.background)),
      overlay: JSON.parse(JSON.stringify(P.overlay)),
      anim: { duration: Math.round(total * 100) / 100, fps: 30, step: spec.step === false || spec.step === 0 ? 0 : (spec.step || 12) },
      camera: { move: 'keys', keys },
      elements,
    };
  }
  const docFor = (spec, W, H) => Object.assign({ width: W, height: H, vox: spec }, build(spec, W, H));

  /* ── templates: one type per beat plus a full explainer, each in four sizes ── */
  const SIZES = [['story', 1080, 1920, 'Story 9:16'], ['portrait', 1080, 1350, 'Portrait 4:5'], ['square', 1080, 1080, 'Square 1:1'], ['wide', 1920, 1080, 'Landscape 16:9']];
  const TYPES = [
    ['explainer', 'Full explainer', ['title', 'document', 'photo', 'stat', 'quote']],
    ['title', 'Title card', ['title']], ['document', 'Highlighted document', ['document']], ['photo', 'Archival photo', ['photo']],
    ['quote', 'Pull quote', ['quote']], ['stat', 'Big number', ['stat']], ['map', 'Map route', ['map']],
    ['timeline', 'Timeline', ['timeline']], ['list', 'Ranked list', ['list']],
  ];
  const recipe = kinds => ({ theme: 'paper', step: 12, scenes: kinds.map((k, i) => Object.assign(newScene(k), { id: 'd' + i })) });
  function templates() {
    return TYPES.flatMap(([key, name, kinds]) => SIZES.map(([o, W, H, label]) => ({
      id: `vox-${key}-${o}`, name: label, family: 'Vox explainer', style: name, orientation: o, tags: ['Video', 'Text', 'Vox'], width: W, height: H, video: true,
      build: () => docFor(recipe(kinds), W, H),
      buildAt: (w, h) => docFor(recipe(kinds), w, h),
    })));
  }

  window.STUDIO_VOX = { THEMES, KINDS, build, newScene, templates };
})();
