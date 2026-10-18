/* Savio's editor — captions: auto subtitles and kinetic word captions (window.StudioCaptions, C).
   A captions layer (type 'captions', usually the whole canvas) holds el.cap = { src, cues, style, edits }:
     src    what was transcribed: { kind: 'mix' } (the whole design's sound, times = design time), { kind: 'el', id }
            (a video layer / clip, times = its own source time) or { kind: 'audio', id } (a sound track)
     cues   [{ start, end (ms, source time), lang, text (as spoken), en, tr (translation), words: [ms] (each word's start,
            found in the sound), timedText (the text those times belong to) }]
     style  template, fonts, colours, entrance, effect, blend, behind-subject, … (DEFAULT_STYLE)
     edits  { 'cue:word': { text, x, y, size, font, color, anim, depth } }
   Ported from the S film app's kinetic subtitles (handoff: Kinetic.kt / Subtitles.kt / TextLayer.kt): words come in as they
   are said, grouped into short phrases that a template sets like a poster. Everything is deterministic (seeded hash), so the
   editor, thumbnails and export match. Positions are fractions of the layer's box (y down); sizes fractions of its short side. */
(function () {
  'use strict';
  const R = window.StudioRender;
  const C = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ── the style ── */
  C.TEMPLATES = [
    ['scatter', 'Scatter', 'Phrases land around the frame: one big word, small ones tucked on it'],
    ['stack', 'Stack', 'Lines build up in the middle, sans, serif and italic mixed'],
    ['focus', 'Focus', 'One or two words at a time, centred'],
    ['sides', 'Sides', 'Down the left and right edges, the middle left clear'],
    ['cascade', 'Cascade', 'Each phrase steps down diagonally, word by word'],
    ['highlight', 'Highlight', 'The whole line shows; the word being said lights up'],
    ['lower', 'Lower third', 'Lines low on the left, the key word in the serif'],
    ['headline', 'Headline', 'Big capitals across the top'],
    ['punch', 'Punch', 'One huge word at a time'],
    ['classic', 'Classic', 'A subtitle line at a time'],
  ];
  C.ANIMS = [['blur', 'Blur in'], ['fade', 'Fade'], ['rise', 'Rise'], ['pop', 'Pop'], ['type', 'Type'], ['none', 'Cut']];
  C.EFFECTS = [['none', 'None'], ['shadow', 'Soft shadow'], ['drop', 'Drop shadow'], ['glow', 'Glow'], ['blur', 'Soft blur'], ['outline', 'Outline'], ['haze', 'Haze']];
  C.BLENDS = [['normal', 'Normal'], ['screen', 'Screen'], ['add', 'Add'], ['overlay', 'Overlay'], ['soft-light', 'Soft light'], ['multiply', 'Multiply'], ['difference', 'Difference'], ['color-dodge', 'Colour dodge']];
  C.BACKS = [['none', 'None'], ['shadow', 'Shadow'], ['outline', 'Outline'], ['box', 'Box']];
  // how each blend reaches the canvas (the whole captions layer blends with what is under it)
  C.BLEND_OP = { normal: 'source-over', screen: 'screen', add: 'lighter', overlay: 'overlay', 'soft-light': 'soft-light', multiply: 'multiply', difference: 'difference', 'color-dodge': 'color-dodge' };
  C.DEFAULT_STYLE = {
    template: 'scatter', show: 'spoken', second: null,
    font: 'Inter Tight', weight: 700, accent: 'Instrument Serif', scale: 1, tracking: 0,
    color: '#ffffff', accentColor: '#ffe14d', anim: 'blur', effect: 'none', effectAmount: 0.5, effectColor: null, blend: 'normal',
    behind: false, seed: 0,
    // classic lines
    size: 0.055, x: 0.5, y: 0.86, align: 'center', back: 'box', backColor: '#000000', backOpacity: 0.6,
  };
  // ready-made looks (the style gallery): a template plus the settings that make it
  C.PRESETS = [
    ['poster', 'Poster', { template: 'scatter', anim: 'blur', effect: 'shadow', effectAmount: 0.5 }],
    ['behind', 'Behind you', { template: 'scatter', anim: 'blur', effect: 'shadow', effectAmount: 0.4, behind: true }],
    ['stack', 'Stack', { template: 'stack', anim: 'rise', effect: 'shadow', effectAmount: 0.4 }],
    ['focus', 'Focus pop', { template: 'focus', anim: 'pop', effect: 'drop', effectAmount: 0.35 }],
    ['sides', 'Sides', { template: 'sides', anim: 'blur', effect: 'shadow', effectAmount: 0.4 }],
    ['cascade', 'Cascade', { template: 'cascade', anim: 'fade', effect: 'shadow', effectAmount: 0.4 }],
    ['karaoke', 'Karaoke', { template: 'highlight', anim: 'fade', effect: 'shadow', effectAmount: 0.5, accentColor: '#ffe14d' }],
    ['lower', 'Lower third', { template: 'lower', anim: 'rise', effect: 'haze', effectAmount: 0.45 }],
    ['headline', 'Headline', { template: 'headline', anim: 'type', effect: 'shadow', effectAmount: 0.5 }],
    ['punch', 'Punch', { template: 'punch', anim: 'pop', effect: 'drop', effectAmount: 0.6 }],
    ['neon', 'Neon', { template: 'focus', anim: 'blur', effect: 'glow', effectAmount: 0.75, effectColor: '#ff3df2', color: '#ffe8fb', blend: 'screen' }],
    ['soft', 'Soft focus', { template: 'scatter', anim: 'blur', effect: 'blur', effectAmount: 0.55 }],
    ['typewriter', 'Typewriter', { template: 'cascade', anim: 'type', font: 'Courier Prime', weight: 700, accent: 'Courier Prime', effect: 'shadow', effectAmount: 0.4 }],
    ['bold', 'Bold yellow', { template: 'punch', anim: 'pop', font: 'Anton', weight: 400, color: '#ffe14d', effect: 'outline', effectColor: '#000000', effectAmount: 0.45 }],
    ['sub-box', 'Subtitles · box', { template: 'classic', back: 'box', font: 'Inter Tight', weight: 600 }],
    ['sub-outline', 'Subtitles · outline', { template: 'classic', back: 'outline', font: 'Inter Tight', weight: 700 }],
    ['sub-shadow', 'Subtitles · shadow', { template: 'classic', back: 'shadow', font: 'Inter Tight', weight: 600 }],
    ['sub-yellow', 'Subtitles · yellow', { template: 'classic', back: 'outline', color: '#ffe14d', font: 'Inter Tight', weight: 800 }],
  ];
  C.preset = id => { const p = C.PRESETS.find(x => x[0] === id) || C.PRESETS[0]; return Object.assign({}, C.DEFAULT_STYLE, p[2], { preset: p[0] }); };
  C.style = el => Object.assign({}, C.DEFAULT_STYLE, (el.cap && el.cap.style) || {});

  /* ── words and phrases ── */
  const STOP = new Set(('a an the of to in on at by for with from as and but or so if is are was were be been am it its it\'s that this these those ' +
    'i i\'m i\'ve i\'d i\'ll you your you\'re we our they their he she his her me my us them do did does have has had not no just what when then than ' +
    'there here will would can could about up out all one who how why where which know like get got').split(' '));
  const HEAD_TOP = 0.25, IN_MS = 260, ANTICIPATE_MS = 60, OUT_MS = 120;
  C.IN_MS = IN_MS;
  const isLetter = ch => /[\p{L}\p{N}']/u.test(ch);
  const bare = w => { const s = w.toLowerCase(); let a = 0, b = s.length; while (a < b && !isLetter(s[a])) a++; while (b > a && !isLetter(s[b - 1])) b--; return s.slice(a, b); };
  const isSmall = w => STOP.has(bare(w)) || [...bare(w)].length <= 2;
  C.isSmall = isSmall;
  // the text a cue shows (in the style's language)
  C.shownText = (c, st) => (st.show === 'en' ? c.en || c.text : st.show === 'tr' ? c.tr || c.en || c.text : c.text || c.en || '') || '';
  C.splitWords = s => String(s || '').split(/\s+/).filter(Boolean);
  const ENDS = ',.;:!?';
  function words(cap, st) {
    return (cap.cues || []).map((c, ci) => {
      const text = C.shownText(c, st), parts = C.splitWords(text);
      if (!parts.length) return [];
      // timed in the sound: each word starts coming in just before it is said
      if (c.timedText === text && c.words && c.words.length === parts.length) {
        const at = c.words.map(x => x - ANTICIPATE_MS);
        return parts.map((w, wi) => { const s = at[wi], e = Math.max(s, at[wi + 1] ?? c.end); return { id: ci + ':' + wi, text: w, start: s, end: e, cue: ci, index: wi }; });
      }
      // otherwise spread through the cue by length (a comma or stop adds a breath)
      const wts = parts.map(w => 1.5 + Math.max(1, [...bare(w)].length) + (ENDS.includes(w[w.length - 1]) ? 2.5 : 0)), tot = wts.reduce((a, b) => a + b, 0), span = Math.max(1, c.end - c.start);
      let acc = 0;
      return parts.map((w, wi) => { const s = c.start + Math.floor(span * acc / tot); acc += wts[wi]; return { id: ci + ':' + wi, text: w, start: s, end: c.start + Math.floor(span * acc / tot), cue: ci, index: wi }; });
    });
  }
  const LIMITS = { scatter: [3, 20], stack: [2, 15], focus: [2, 14], sides: [3, 22], cascade: [4, 24], highlight: [6, 34], lower: [4, 26], headline: [3, 18], punch: [2, 14], classic: [99, 999] };
  function phrases(cap, st) {
    const [maxW, maxC] = LIMITS[st.template] || LIMITS.scatter, groups = [], opens = '"“‘\'([', closes = '”’"\')';
    for (const cue of words(cap, st)) {
      let cur = [];
      const flush = () => { if (cur.length) { groups.push(cur); cur = []; } };
      cue.forEach((w, i) => {
        const chars = cur.reduce((a, x) => a + x.text.length + 1, 0) + w.text.length;
        const pause = cur.length && w.start - cur[cur.length - 1].end > 350;
        if (opens.includes(w.text[0]) || cur.length >= maxW || chars > maxC || pause) flush();
        cur.push(w);
        if (st.template === 'punch' && !isSmall(w.text)) { flush(); return; }
        let t = w.text; while (t && closes.includes(t[t.length - 1])) t = t.slice(0, -1);
        if (ENDS.includes(w.text[w.text.length - 1]) || (t && ENDS.includes(t[t.length - 1]))) { flush(); return; }
        if (!isSmall(w.text) && (cur.length >= 2 || [...bare(w.text)].length >= 7 || '”’"'.includes(w.text[w.text.length - 1]))) {
          const nx = cue[i + 1];
          if (nx && isSmall(nx.text) && ENDS.includes(nx.text[nx.text.length - 1]) && maxW > 2) return;
          flush();
        }
      });
      flush();
    }
    return groups.map((g, i) => {
      const next = groups[i + 1] ? groups[i + 1][0].start : Infinity, last = g[g.length - 1];
      return { words: g, start: g[0].start, end: Math.min(next, Math.max(last.end + 700, last.start + IN_MS + 400)), index: i };
    });
  }
  // a stable pseudo-random number for k (and the shuffle seed), 0..1
  function rnd(k, salt, seed) {
    let h = Math.imul(k | 0, 0x9E3779B1) ^ Math.imul(salt | 0, 0x85EBCA77) ^ Math.imul(seed | 0, 0xC2B2AE3D);
    h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; h = Math.imul(h, 0x297A2D39); h ^= h >>> 15;
    return (h >>> 8) / 16777216;
  }
  C.rnd = rnd;
  const behindPhrase = (p, seed) => rnd(p.index, 7, seed) < 0.42;
  function emphasis(ws) { let best = 0, score = -1; ws.forEach((w, i) => { const s = [...bare(w.text)].length + (isSmall(w.text) ? 0 : 6) + i * 0.1; if (s > score) { score = s; best = i; } }); return best; }
  // phrase spots for Scatter: anchor x, big word's centre y, alignment, target width; crown spots for words going behind
  const SLOTS = [
    [0.06, 0.15, 'left', 0.50], [0.94, 0.15, 'right', 0.50], [0.50, 0.20, 'center', 0.62], [0.50, 0.56, 'center', 0.66],
    [0.07, 0.42, 'left', 0.44], [0.93, 0.42, 'right', 0.44], [0.50, 0.72, 'center', 0.60],
    [0.50, HEAD_TOP - 0.01, 'center', 0.82, true], [0.05, HEAD_TOP - 0.04, 'left', 0.62, true], [0.95, HEAD_TOP - 0.04, 'right', 0.62, true],
  ].map(([x, y, align, width, crown]) => ({ x, y, align, width, crown: !!crown }));
  function slotFor(i, seed, pool, prev) {
    const ch = pool.filter(s => s !== prev), choices = ch.length ? ch : pool, wts = choices.map(s => s === 3 ? 2.2 : 1);
    let r = rnd(i, 1, seed) * wts.reduce((a, b) => a + b, 0);
    for (let k = 0; k < choices.length; k++) { r -= wts[k]; if (r <= 0) return choices[k]; }
    return choices[choices.length - 1];
  }
  function stackBlocks(all) {
    const out = []; let cur = [];
    for (const p of all) { const gap = cur.length && p.start - cur[cur.length - 1].words[cur[cur.length - 1].words.length - 1].end > 600; if (cur.length >= 3 || gap) { out.push(cur); cur = []; } cur.push(p); }
    if (cur.length) out.push(cur);
    return out;
  }
  // the plan of a track (phrases, which go behind, Scatter spots), cached per caption layer
  const plans = new WeakMap();
  function sigOf(cap, st) {
    let s = (R ? R.fontsVersion : 0) + '|' + JSON.stringify(st) + '|' + JSON.stringify(cap.edits || {}) + '|';
    for (const c of cap.cues || []) s += c.start + ',' + c.end + ',' + (c.text || '').length + ',' + (c.en || '').length + ',' + (c.tr || '').length + ',' + (c.words ? c.words.length + ':' + (c.words[0] || 0) : '') + (c.timedText === C.shownText(c, st) ? 't' : '') + ';';
    return s;
  }
  function plan(el) {
    const cap = el.cap || {}, st = C.style(el), sig = sigOf(cap, st), hit = plans.get(cap);
    if (hit && hit.sig === sig) return hit;
    const ps = phrases(cap, st);
    const behind = ps.map(p => st.behind && behindPhrase(p, st.seed) && !isSmall(p.words[emphasis(p.words)].text));
    const slots = [];
    ps.forEach((p, i) => { const pool = SLOTS.map((s, k) => k).filter(k => SLOTS[k].crown === behind[i]); slots[i] = slotFor(i, st.seed, pool, i > 0 ? slots[i - 1] : -1); });
    const out = { sig, st, phrases: ps, behind, slots, blocks: st.template === 'stack' ? stackBlocks(ps) : null, placed: new Map() };
    plans.set(cap, out);
    return out;
  }
  C.plan = plan;

  /* ── measuring ── */
  const mctx = document.createElement('canvas').getContext('2d');
  const TELUGU = /[\u0C00-\u0C7F]/;
  // a face: { f: family, w: weight, i: italic }; non-Latin scripts fall back to their own face
  const fontCss = (face, px, text) => `${face.i ? 'italic ' : ''}${face.w || 400} ${px}px "${TELUGU.test(text || '') ? 'Noto Sans Telugu' : face.f}", "Noto Sans Telugu", "Inter", sans-serif`;
  C.fontCss = fontCss;
  function ruler(aspect, tracking) {
    const w = 1000 * Math.max(aspect, 0.05), h = 1000, short = Math.min(w, h);
    return {
      w, h, short,
      width(text, face, size) {
        const px = size * short; mctx.font = fontCss(face, px, text);
        if ('letterSpacing' in mctx) mctx.letterSpacing = (tracking * px) + 'px';
        return mctx.measureText(text).width / w;
      },
      lineH: size => size * short / h * 1.18,
      sizeFor(text, face, frac) { return frac / Math.max(this.width(text, face, 1), 1e-4); },
    };
  }
  const shownWord = (st, t) => st.template === 'headline' ? t.toUpperCase() : t;

  /* ── layout: one phrase → placed words { word, x, y, size, face, color, behind, big } ── */
  function place(el, P, p, aspect, stackOf) {
    const st = P.st, ru = ruler(aspect, st.tracking), out = [], m = 0.04;
    const tel = p.words.some(w => TELUGU.test(w.text));
    const sans = { f: st.font, w: st.weight }, serif = tel ? sans : { f: st.accent, w: 400, i: true }, italic = { f: st.font, w: st.weight, i: true };
    const wide = aspect > 1 ? 0.55 : 1, scale = st.scale, behindOn = st.behind;
    const txt = w => shownWord(st, w.text);
    const lineWidth = (ws, face, size) => ws.reduce((a, w) => a + ru.width(txt(w), face, size), 0) + ru.width(' ', face, size) * (ws.length - 1);
    const line = (ws, left, y, face, size, behind, big) => {
      let x = left; const sp = ru.width(' ', face, size);
      for (const w of ws) { const ww = ru.width(txt(w), face, size); out.push({ word: w, x: x + ww / 2, y, size, face, color: st.color, behind, big }); x += ww + sp; }
    };
    const wrap = (ws, face, size, maxW) => { const lines = []; let cur = []; for (const w of ws) { if (cur.length && lineWidth(cur.concat(w), face, size) > maxW) { lines.push(cur); cur = []; } cur.push(w); } if (cur.length) lines.push(cur); return lines; };
    const T = st.template;
    if (T === 'scatter') {
      const e = emphasis(p.words), goBehind = !!P.behind[p.index], slot = SLOTS[P.slots[p.index] ?? 3];
      const accent = rnd(p.index, 3, st.seed) < 0.22 && !tel, bigFace = accent ? serif : sans, bw0 = p.words[e];
      let big = clamp(ru.sizeFor(bw0.text, bigFace, slot.width * wide) * scale, 0.085, slot.crown ? 0.26 : 0.2);
      const maxW = 1 - 2 * m;
      if (ru.width(bw0.text, bigFace, big) > maxW) big = ru.sizeFor(bw0.text, bigFace, maxW);
      const small = clamp(big * 0.4, 0.05, 0.075) * (scale < 1 ? scale : 1), bw = ru.width(bw0.text, bigFace, big);
      const bigLeft = clamp(slot.align === 'left' ? slot.x : slot.align === 'right' ? slot.x - bw : slot.x - bw / 2, m, Math.max(m, 1 - m - bw));
      const by = slot.y, bh = ru.lineH(big);
      line([bw0], bigLeft, by, bigFace, big, goBehind, true);
      const before = p.words.slice(0, e), after = p.words.slice(e + 1);
      if (before.length) {
        const lw = lineWidth(before, sans, small);
        const left = clamp(slot.align === 'left' ? bigLeft + bw * 0.02 : slot.align === 'right' ? bigLeft + bw - lw : bigLeft + (bw - lw) / 2, m, Math.max(m, 1 - m - lw));
        line(before, left, by - bh * 0.47, sans, small, false, false);
      }
      if (after.length) {
        const lw = lineWidth(after, sans, small);
        line(after, clamp(slot.align === 'right' ? bigLeft + bw * 0.04 : bigLeft + bw - lw, m, Math.max(m, 1 - m - lw)), by + bh * 0.40, sans, small, false, false);
      }
    } else if (T === 'stack') {
      const lines = stackOf && stackOf.length ? stackOf : [p], cycle = [sans, serif, italic];
      const stackBehind = behindOn && lines.length > 1 && behindPhrase(lines[0], st.seed);
      const pl = lines.map((ph, li) => {
        const bigLine = ph.words.some(w => !isSmall(w.text) && [...bare(w.text)].length >= 5) || ph.words.length === 1;
        const face = bigLine && !tel ? cycle[(li + Math.floor(rnd(ph.index, 5, st.seed) * 3)) % 3] : sans;
        const target = stackBehind && li === 0 && bigLine ? 0.84 : bigLine ? 0.64 : 0.34;
        let size = clamp(ru.sizeFor(ph.words.map(w => w.text).join(' '), face, target * wide) * scale, bigLine ? 0.075 : 0.042, stackBehind && li === 0 ? 0.24 : bigLine ? 0.16 : 0.065);
        const lw0 = lineWidth(ph.words, face, size); if (lw0 > 1 - 2 * m) size *= (1 - 2 * m) / lw0;
        return [ph, face, size];
      });
      const gaps = []; for (let i = 1; i < pl.length; i++) gaps.push(0.53 * (pl[i - 1][2] + pl[i][2]) * ru.short / ru.h);
      const total = gaps.reduce((a, b) => a + b, 0), blockBehind = stackBehind && pl[0][2] > 0.07;
      let cy = blockBehind ? HEAD_TOP : 0.58 - total / 2;
      pl.forEach(([ph, face, size], li) => {
        if (li > 0) cy += gaps[li - 1];
        const lw = lineWidth(ph.words, face, size), shift = [-0.05, 0.06, -0.02][li % 3] * (rnd(ph.index, 9, st.seed) < 0.5 ? 1 : -1);
        if (ph === p) line(ph.words, clamp(0.5 - lw / 2 + shift, m, Math.max(m, 1 - m - lw)), cy, face, size, blockBehind && li === 0, size > 0.07);
      });
    } else if (T === 'focus') {
      const behind = behindOn && behindPhrase(p, st.seed);
      let size = 0.075 * scale; const lw0 = lineWidth(p.words, sans, size); if (lw0 > 0.84) size *= 0.84 / lw0;
      const lw = lineWidth(p.words, sans, size);
      line(p.words, 0.5 - lw / 2, behind ? 0.3 : 0.52, sans, size, behind, true);
    } else if (T === 'sides') {
      const left = (p.index + st.seed) % 2 === 0, colW = aspect > 1 ? 0.2 : 0.25, e = emphasis(p.words);
      const bigFace = rnd(p.index, 3, st.seed) < 0.25 && !tel ? serif : sans;
      let big = clamp(ru.sizeFor(txt(p.words[e]), bigFace, colW) * scale, 0.05, 0.12);
      if (ru.width(txt(p.words[e]), bigFace, big) > colW * 1.15) big = ru.sizeFor(txt(p.words[e]), bigFace, colW * 1.15);
      const small = clamp(big * 0.5, 0.035, 0.06) * (scale < 1 ? scale : 1), lines = []; let run = [];
      const flushRun = () => { if (run.length) { for (const l of wrap(run, sans, small, colW)) lines.push({ ws: l, face: sans, size: small, big: false }); run = []; } };
      p.words.forEach((w, i) => { if (i === e) { flushRun(); lines.push({ ws: [w], face: bigFace, size: big, big: true }); } else run.push(w); });
      flushRun();
      const hs = lines.map(l => ru.lineH(l.size) * 0.95);
      let y = 0.40 + (rnd(p.index, 4, st.seed) - 0.5) * 0.16 - hs.reduce((a, b) => a + b, 0) / 2;
      lines.forEach((l, k) => { y += hs[k] / 2; const lw = lineWidth(l.ws, l.face, l.size); line(l.ws, left ? m + 0.01 : 1 - m - 0.01 - lw, y, l.face, l.size, false, l.big); y += hs[k] / 2; });
    } else if (T === 'cascade') {
      const e = emphasis(p.words), base = 0.072 * scale, sizes = p.words.map((w, i) => i === e ? base * 1.4 : base), widths = p.words.map((w, i) => ru.width(txt(w), sans, sizes[i]));
      const n = p.words.length, mw = Math.max(0, ...widths), dx = n > 1 ? Math.max(0, Math.min(0.13, (1 - 2 * m - mw) / (n - 1))) : 0;
      const dys = sizes.map(s => ru.lineH(s) * 0.92), fwd = (p.index + st.seed) % 2 === 0;
      let y = 0.5 + (rnd(p.index, 4, st.seed) - 0.5) * 0.12 - dys.reduce((a, b) => a + b, 0) / 2;
      p.words.forEach((w, i) => {
        y += dys[i] / 2;
        const x = fwd ? 0.5 - (dx * (n - 1) + widths[n - 1]) / 2 + dx * i : 0.5 + (dx * (n - 1) + widths[0]) / 2 - dx * i - widths[i];
        line([w], clamp(x, m, Math.max(m, 1 - m - widths[i])), y, sans, sizes[i], false, i === e);
        y += dys[i] / 2;
      });
    } else if (T === 'highlight' || T === 'lower') {
      const lower = T === 'lower', size = (lower ? 0.058 : 0.062) * scale, maxW = (lower ? 0.7 : 0.84) * wide, e = emphasis(p.words);
      const lines = wrap(p.words, sans, size, maxW), lh = ru.lineH(size) * 1.02;
      let y = (lower ? 0.86 : 0.74) - lh * lines.length + lh / 2;
      for (const ln of lines) {
        if (lower) {
          let x = m + 0.03;
          for (const w of ln) { const key = w === p.words[e] && !tel, face = key ? serif : sans, sz = key ? size * 1.25 : size, ww = ru.width(txt(w), face, sz); out.push({ word: w, x: x + ww / 2, y, size: sz, face, color: st.color, behind: false, big: key }); x += ww + ru.width(' ', sans, size); }
        } else line(ln, 0.5 - lineWidth(ln, sans, size) / 2, y, sans, size, false, false);
        y += lh;
      }
    } else if (T === 'headline') {
      const behind = behindOn && behindPhrase(p, st.seed), target = 0.88;
      let size = clamp(ru.sizeFor(p.words.map(txt).join(' '), sans, target) * scale, 0.06, 0.2), lines;
      if (size >= 0.085 || p.words.length === 1) lines = [p.words]; else { size = 0.085 * scale; lines = wrap(p.words, sans, size, target); }
      const lh = ru.lineH(size) * 0.9;
      let y = (behind ? HEAD_TOP - 0.01 : 0.15) - lh * (lines.length - 1) / 2;
      for (const ln of lines) { let sz = size; const lw0 = lineWidth(ln, sans, sz); if (lw0 > 1 - 2 * m) sz *= (1 - 2 * m) / lw0; line(ln, 0.5 - lineWidth(ln, sans, sz) / 2, y, sans, sz, behind, true); y += lh; }
    } else if (T === 'punch') {
      const e = emphasis(p.words), w = p.words[e], behind = behindOn && behindPhrase(p, st.seed) && !isSmall(w.text);
      let big = clamp(ru.sizeFor(txt(w), sans, 0.78 * wide) * scale, 0.1, 0.3);
      if (ru.width(txt(w), sans, big) > 1 - 2 * m) big = ru.sizeFor(txt(w), sans, 1 - 2 * m);
      const by = behind ? HEAD_TOP + 0.02 : 0.5, bw = ru.width(txt(w), sans, big);
      line([w], 0.5 - bw / 2, by, sans, big, behind, true);
      const rest = p.words.filter((x, i) => i !== e);
      if (rest.length) { const small = clamp(big * 0.32, 0.04, 0.07), lw = lineWidth(rest, sans, small); line(rest, 0.5 - lw / 2, by - ru.lineH(big) * 0.55, sans, small, false, false); }
    }
    // the person's own changes win
    const edits = (el.cap && el.cap.edits) || {};
    return out.map(pl => {
      const e = edits[pl.word.id];
      if (!e || (e.text && e.text !== pl.word.text)) return pl;
      return Object.assign({}, pl, { x: e.x ?? pl.x, y: e.y ?? pl.y, size: e.size ?? pl.size, face: e.font ? { f: e.font, w: pl.face.w, i: pl.face.i } : pl.face, color: e.color || pl.color,
        behind: e.depth === 'front' ? false : e.depth === 'behind' ? true : pl.behind });
    });
  }
  function placed(el, P, p, aspect, block) {
    const k = p.index + '|' + aspect.toFixed(4);
    let v = P.placed.get(k);
    if (!v) { v = place(el, P, p, aspect, block); P.placed.set(k, v); }
    return v;
  }

  // where a word settles (before any animation): { word, x, y, size, face, color, behind } or null
  C.wordPlace = function (el, wordId) {
    if (!el.cap || C.style(el).template === 'classic') return null;
    const P = plan(el), aspect = el.width / Math.max(1, el.height);
    for (const p of P.phrases) if (p.words.some(w => w.id === wordId)) {
      const block = P.blocks ? P.blocks.find(b => b.includes(p)) : null;
      return placed(el, P, p, aspect, block).find(pl => pl.word.id === wordId) || null;
    }
    return null;
  };
  // the phrase a word belongs to: its start and end (ms, source time)
  C.wordPhrase = function (el, wordId) { const P = plan(el); return P.phrases.find(p => p.words.some(w => w.id === wordId)) || null; };

  /* ── animation: word layers for a moment (ms, source time) ── */
  const ease = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const backOut = x => { const c = 1.7, t = clamp(x, 0, 1) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };
  // a layer: { id, text, face, size, x, y, color, opacity, reveal, blur, behind, wordId }
  function kineticAt(el, ms, aspect) {
    const P = plan(el), st = P.st, all = P.phrases, out = [], ru = ruler(aspect, st.tracking);
    let visible;
    if (st.template === 'stack') {
      const b = P.blocks.find(bl => ms >= bl[0].start && ms < bl[bl.length - 1].end);
      if (!b) return out;
      visible = b.filter(p => p.start <= ms).map(p => [p, b]);
    } else { const p = all.find(q => ms >= q.start && ms < q.end); if (!p) return out; visible = [[p, null]]; }
    const edits = (el.cap && el.cap.edits) || {};
    for (const [p, block] of visible) {
      const end = block ? block[block.length - 1].end : p.end, leaving = clamp((end - ms) / OUT_MS, 0, 1);
      if (st.template === 'highlight') {
        const enter = ease((ms - p.start) / IN_MS);
        for (const pl of placed(el, P, p, aspect, block)) {
          const ed = edits[pl.word.id] && (!edits[pl.word.id].text || edits[pl.word.id].text === pl.word.text) ? edits[pl.word.id] : null;
          const said = ms >= pl.word.start, now = said && ms < pl.word.end, pop = now ? ease((ms - pl.word.start) / 120) : 0, alpha = (said ? 1 : 0.5) * enter * leaving;
          if (alpha <= 0.01) continue;
          out.push({ wordId: pl.word.id, text: shownWord(st, pl.word.text), face: pl.face, size: pl.size * (1 + 0.12 * pop), x: pl.x, y: pl.y + 0.25 * (1 - enter) * ru.lineH(pl.size),
            color: now && !(ed && ed.color) ? st.accentColor : pl.color, opacity: alpha, reveal: 1, blur: 0, behind: pl.behind });
        }
        continue;
      }
      for (const pl of placed(el, P, p, aspect, block)) {
        if (ms < pl.word.start) continue;
        const ed = edits[pl.word.id] && (!edits[pl.word.id].text || edits[pl.word.id].text === pl.word.text) ? edits[pl.word.id] : null;
        const anim = (ed && ed.anim) || st.anim, u = (ms - pl.word.start) / IN_MS;
        let reveal = 1, blur = 0, alpha = 1, dy = 0, sc = 1;
        if (anim === 'blur') { reveal = ease(u * 1.15); blur = 0.14 * (1 - ease(u)); dy = 0.05 * (1 - ease(u)); }
        else if (anim === 'fade') alpha = ease(u);
        else if (anim === 'rise') { alpha = ease(u); dy = 0.4 * (1 - ease(u)); }
        else if (anim === 'pop') { alpha = ease(u * 2); sc = 0.55 + 0.45 * backOut(u); }
        else if (anim === 'type') { const n = [...pl.word.text].length; reveal = u >= 1 ? 1 : (Math.floor(u * n) + 1) / (n + 1); }
        if (leaving < 1) { alpha *= leaving; blur += 0.1 * (1 - leaving); }
        if (alpha <= 0.01) continue;
        out.push({ wordId: pl.word.id, text: shownWord(st, pl.word.text), face: pl.face, size: pl.size * sc, x: pl.x, y: pl.y + dy * ru.lineH(pl.size), color: pl.color, opacity: alpha, reveal, blur, behind: pl.behind });
      }
    }
    return out;
  }
  // classic: the cue's line(s), wrapped, stacked and kept inside the frame
  function classicAt(el, ms, aspect) {
    const st = C.style(el), cues = (el.cap && el.cap.cues) || [], c = cues.find(q => ms >= q.start && ms < q.end);
    if (!c) return [];
    const main = C.shownText(c, st).trim(), sec = st.second ? (st.second === 'en' ? c.en : st.second === 'tr' ? c.tr : c.text) : '';
    const lines = [sec && sec.trim() !== main ? sec.trim() : '', main].filter(Boolean);
    const margin = 0.03, room = clamp(st.align === 'left' ? 1 - margin - st.x : st.align === 'right' ? st.x - margin : 2 * Math.min(st.x, 1 - st.x) - 2 * margin, 0.35, 0.9);
    const ru = ruler(aspect, st.tracking), face = { f: st.font, w: Math.min(600, st.weight) };
    const blocks = lines.map(text => {
      const ws = text.split(/\s+/), out = []; let cur = '';
      for (const w of ws) { const next = cur ? cur + ' ' + w : w; if (cur && ru.width(next, face, st.size) > room) { out.push(cur); cur = w; } else cur = next; }
      if (cur) out.push(cur);
      const wpx = Math.max(...out.map(l => ru.width(l, face, st.size))), lh = ru.lineH(st.size);
      const pad = st.back === 'box' ? [0.35 * st.size * ru.short / ru.w, 0.16 * st.size * ru.short / ru.h] : [0, 0];
      return { lines: out, w: wpx + pad[0] * 2, h: lh * out.length + pad[1] * 2 };
    });
    const gap = 0.008, total = blocks.reduce((a, b) => a + b.h, 0) + gap * (blocks.length - 1);
    const centre = clamp(st.y, Math.min(0.5, total / 2 + margin), Math.max(0.5, 1 - total / 2 - margin));
    let top = centre - total / 2;
    return blocks.map((b, i) => {
      const cx = clamp(st.align === 'left' ? st.x + b.w / 2 : st.align === 'right' ? st.x - b.w / 2 : st.x, Math.min(0.5, b.w / 2 + margin / 2), Math.max(0.5, 1 - b.w / 2 - margin / 2));
      const y = top + b.h / 2; top += b.h + gap;
      return { classic: true, lines: b.lines, w: b.w, h: b.h, x: cx, y, face, size: st.size, color: st.color, opacity: 1, reveal: 1, blur: 0, behind: false, align: st.align, back: st.back, backColor: st.backColor, backOpacity: st.backOpacity };
    });
  }

  /* ── time: the layer's moment → the source's own time (ms) ── */
  C.srcMs = function (el, t, doc) {
    const src = (el.cap && el.cap.src) || { kind: 'mix' };
    if (t == null) return null;
    if (src.kind === 'el') {
      const e = (doc.elements || []).find(x => x.id === src.id);
      if (!e) return t * 1000;
      const vd = e.video || {}, start = (e.time && e.time.start) || 0, v = R.assetImage(e.assetId), dur = v && v.duration && isFinite(v.duration) ? v.duration : null;
      const end = vd.end > 0 ? (dur ? Math.min(dur, vd.end) : vd.end) : dur, ts = vd.trim || 0, lt = Math.max(0, t - start) * (vd.speed || 1);
      let k = lt;
      if (end && vd.loop !== false) k = lt % Math.max(0.05, end - ts); else if (end) k = Math.min(lt, end - ts);
      return (vd.reverse && end ? end - k : ts + k) * 1000;
    }
    if (src.kind === 'audio') {
      const a = (doc.audio || []).find(x => x.id === src.id);
      if (!a) return t * 1000;
      return ((a.trim || 0) + (t - (a.start || 0)) * (a.speed || 1)) * 1000;
    }
    return t * 1000;
  };
  // and back: a source time (ms) → the layer's moment (s), for SRT and the transcript
  C.designS = function (el, ms, doc) {
    const src = (el.cap && el.cap.src) || { kind: 'mix' };
    if (src.kind === 'el') { const e = (doc.elements || []).find(x => x.id === src.id); if (!e) return ms / 1000; const vd = e.video || {}; return ((e.time && e.time.start) || 0) + (ms / 1000 - (vd.trim || 0)) / (vd.speed || 1); }
    if (src.kind === 'audio') { const a = (doc.audio || []).find(x => x.id === src.id); if (!a) return ms / 1000; return (a.start || 0) + (ms / 1000 - (a.trim || 0)) / (a.speed || 1); }
    return ms / 1000;
  };
  // the still editing view shows the first phrase, settled
  function stillMs(el) {
    const P = plan(el), st = P.st;
    if (st.template === 'classic') { const c = (el.cap.cues || [])[0]; return c ? c.start + 1 : null; }
    const p = P.phrases[0]; if (!p) return null;
    return Math.min(p.end - OUT_MS - 1, p.words[p.words.length - 1].start + IN_MS + 50);
  }
  // the layers to draw at design time t (null = the still view)
  C.layersAt = function (el, t, doc) {
    if (!el.cap || !(el.cap.cues || []).length) return [];
    const ms = t == null ? stillMs(el) : C.srcMs(el, t, doc || R.animDoc || { elements: [] });
    if (ms == null) return [];
    const aspect = el.width / Math.max(1, el.height);
    return C.style(el).template === 'classic' ? classicAt(el, ms, aspect) : kineticAt(el, ms, aspect);
  };

  /* ── drawing ── */
  // canvas blur(σ) for an Android blur mask of radius r (Skia: σ = 0.57735 r + 0.5)
  const sig = r => 0.57735 * r + 0.5;
  function rgba(hex, a) { const c = String(hex || '#000').replace('#', ''), n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c.slice(0, 6), 16) || 0; return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  // one word (or classic block) in a box of W × H (short = min); sc = device pixels per unit, so words stay crisp
  function drawLayer(ctx, L, W, H, st, sc = 1) {
    const short = Math.min(W, H);
    if (L.classic) return drawClassic(ctx, L, W, H, st);
    const ts = Math.max(1, L.size * short), op = clamp(L.opacity, 0, 1), a = clamp(st.effectAmount, 0, 1);
    const font = fontCss(L.face, ts, L.text), track = st.tracking * ts;
    ctx.font = font; if ('letterSpacing' in ctx) ctx.letterSpacing = track + 'px';
    const tw = ctx.measureText(L.text).width, pad = ts * 2, bw = Math.ceil(tw + pad * 2), bh = Math.ceil(ts * 1.18 + pad * 2);
    // the word is set into its own small canvas (effects, reveal and blur stay with it), then placed
    const c = document.createElement('canvas'); c.width = Math.ceil(bw * sc); c.height = Math.ceil(bh * sc);
    const x = c.getContext('2d'); x.scale(sc, sc);
    x.font = font; if ('letterSpacing' in x) x.letterSpacing = track + 'px';
    x.textBaseline = 'middle'; x.textAlign = 'left';
    const ox = pad, oy = bh / 2, fill = L.color || '#fff', fxc = st.effectColor;
    const text = (dx = 0, dy = 0) => x.fillText(L.text, ox + dx, oy + dy);
    const under = () => {
      const e = st.effect;
      x.save();
      if (e === 'drop') { const d = ts * (0.035 + 0.07 * a); x.fillStyle = rgba(fxc || '#000000', (0.55 + 0.45 * a) * op); text(d, d); }
      else if (e === 'glow' || e === 'blur') {
        const glow = e === 'glow';
        x.fillStyle = glow ? rgba(fxc || fill, (0.55 + 0.45 * a) * op) : rgba(fill, (0.5 + 0.4 * a) * op);
        if ('filter' in x) x.filter = `blur(${sig(ts * (glow ? 0.08 + 0.32 * a : 0.05 + 0.2 * a))}px)`;
        text(); if (glow && a > 0.5) text();
      } else if (e === 'outline') { x.strokeStyle = rgba(fxc || '#000000', op); x.lineJoin = 'round'; x.lineWidth = ts * (0.04 + 0.14 * a); x.strokeText(L.text, ox, oy); }
      else if (e === 'haze') {
        x.fillStyle = x.strokeStyle = rgba(fxc || '#000000', (0.3 + 0.45 * a) * op); x.lineWidth = ts * 0.45; x.lineJoin = 'round';
        if ('filter' in x) x.filter = `blur(${sig(ts * (0.45 + 0.55 * a))}px)`;
        text(); x.strokeText(L.text, ox, oy);
      }
      x.restore();
    };
    under();
    x.save();
    if (st.effect === 'shadow') { x.shadowColor = rgba(fxc || '#000000', (0.35 + 0.55 * a) * op); x.shadowBlur = 2 * sig(ts * (0.05 + 0.25 * a)); x.shadowOffsetY = ts * (0.02 + 0.05 * a); }
    let blurPx = L.blur > 0.002 ? sig(L.blur * ts) : 0;
    if (!blurPx && st.effect === 'blur') blurPx = sig(ts * 0.03 * a + 0.5);
    if (blurPx && 'filter' in x) x.filter = `blur(${blurPx}px)`;
    x.fillStyle = rgba(fill, op); text();
    x.restore();
    // letter by letter: everything right of the reveal edge fades out
    if (L.reveal < 1) {
      const soft = Math.max(tw * 0.35, ts * 0.6), edge = ox - soft + L.reveal * (tw + soft);
      const g = x.createLinearGradient(edge, 0, edge + soft, 0); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalCompositeOperation = 'destination-in'; x.fillStyle = g; x.fillRect(0, 0, bw, bh);
    }
    ctx.drawImage(c, L.x * W - (ox + tw / 2), L.y * H - oy, c.width / sc, c.height / sc);
  }
  function drawClassic(ctx, L, W, H, st) {
    const short = Math.min(W, H), ts = L.size * short, lh = ts * 1.18;
    ctx.save();
    ctx.font = fontCss(L.face, ts, L.lines.join(' ')); if ('letterSpacing' in ctx) ctx.letterSpacing = st.tracking * ts + 'px';
    ctx.textBaseline = 'middle';
    const widths = L.lines.map(l => ctx.measureText(l).width), maxw = Math.max(...widths), cx = L.x * W, cy = L.y * H, top = cy - lh * L.lines.length / 2;
    const lineX = (i) => L.align === 'left' ? cx - maxw / 2 : L.align === 'right' ? cx + maxw / 2 - widths[i] : cx - widths[i] / 2;
    if (L.back === 'box') {
      const px = ts * 0.35, py = ts * 0.16, r = ts * 0.22;
      const l0 = Math.min(...L.lines.map((l, i) => lineX(i))), r0 = Math.max(...L.lines.map((l, i) => lineX(i) + widths[i]));
      ctx.fillStyle = rgba(L.backColor, L.backOpacity);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(l0 - px, top - py, r0 - l0 + 2 * px, lh * L.lines.length + 2 * py, r) : ctx.rect(l0 - px, top - py, r0 - l0 + 2 * px, lh * L.lines.length + 2 * py); ctx.fill();
    }
    if (L.back === 'shadow') { ctx.shadowColor = 'rgba(0,0,0,0.59)'; ctx.shadowBlur = 2 * sig(ts * 0.09); ctx.shadowOffsetY = ts * 0.035; }
    L.lines.forEach((l, i) => {
      const x = lineX(i), y = top + lh * (i + 0.5);
      if (L.back === 'outline') { ctx.save(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = rgba(L.backColor, 1); ctx.lineWidth = ts * 0.14; ctx.lineJoin = 'round'; ctx.strokeText(l, x, y); ctx.restore(); }
      ctx.fillStyle = L.color; ctx.fillText(l, x, y);
    });
    ctx.restore();
  }
  // the subject matte for words set behind: every photo / video layer under the captions with a subject found, firmed
  // (lift, grow, hold — SubjectMasker.solidify) at ≤ 480 px; returns a canvas the size of the box (or null)
  const holds = new Map();
  function matteFor(el, doc, t, W, H, env) {
    const below = [];
    for (const e of doc.elements || []) { if (e === el || e.id === el.id) break; if (e.type === 'image' && !e.hidden && R.hasSubject(e) && R.visibleAt(e, t)) below.push(e); }
    if (!below.length) return null;
    const s = Math.min(1, 480 / Math.max(W, H)), mw = Math.max(2, Math.round(W * s)), mh = Math.max(2, Math.round(H * s));
    const m = document.createElement('canvas'); m.width = mw; m.height = mh;
    const x = m.getContext('2d', { willReadFrequently: true }), k = mw / el.width;
    let any = false;
    for (const e of below) {
      const mk = R.subjectMaskLocal(e, env, k);
      if (!mk) continue;
      x.save(); x.setTransform(k, 0, 0, k, 0, 0); x.translate(e.x - el.x, e.y - el.y); x.rotate((e.rotation || 0) * Math.PI / 180);
      x.drawImage(mk, 0, 0, e.width, e.height); x.restore(); any = true;
    }
    if (!any) return null;
    const d = x.getImageData(0, 0, mw, mh), a = new Uint8ClampedArray(mw * mh);
    for (let i = 0; i < a.length; i++) a[i] = clamp((d.data[i * 4 + 3] - 25) * 2.6, 0, 255);
    const r = Math.max(1, Math.ceil(Math.max(mw, mh) / 128)), tmp = new Uint8ClampedArray(a.length);
    for (let y = 0; y < mh; y++) for (let q = 0; q < mw; q++) { let v = 0; for (let k2 = Math.max(0, q - r); k2 <= Math.min(mw - 1, q + r); k2++) v = Math.max(v, a[y * mw + k2]); tmp[y * mw + q] = v; }
    for (let q = 0; q < mw; q++) for (let y = 0; y < mh; y++) { let v = 0; for (let k2 = Math.max(0, y - r); k2 <= Math.min(mh - 1, y + r); k2++) v = Math.max(v, tmp[k2 * mw + q]); a[y * mw + q] = v; }
    // a moving subject keeps covering where it just was for a few frames (reset on a jump in time)
    const h0 = holds.get(el.id);
    if (h0 && h0.n === a.length && t != null && t > h0.t && t - h0.t < 0.5) for (let i = 0; i < a.length; i++) a[i] = Math.max(a[i], h0.a[i] * 0.6);
    holds.set(el.id, { a: a.slice(), n: a.length, t });
    for (let i = 0; i < a.length; i++) { const v = clamp((a[i] / 255 - 0.3) / 0.4, 0, 1); d.data[i * 4 + 3] = v * v * (3 - 2 * v) * 255; }
    x.putImageData(d, 0, 0);
    return m;
  }
  // draw a captions layer (ctx is in the layer's own box, 0..width × 0..height)
  C.draw = function (ctx, el, env) {
    const t = 'time' in env ? env.time : R.playTime, doc = env.doc || R.animDoc || (window.Studio && window.Studio.doc) || { elements: [] };
    const layers = C.layersAt(el, t, doc);
    if (!layers.length) return;
    const st = C.style(el), W = el.width, H = el.height;
    const T = ctx.getTransform(), sc = Math.max(0.25, Math.min(4, Math.hypot(T.a, T.b)));
    const front = layers.filter(l => !l.behind), back = layers.filter(l => l.behind);
    if (back.length) {
      // words behind the subject: drawn on their own and cut out where the person is
      const bw = Math.max(1, Math.round(W * sc)), bh = Math.max(1, Math.round(H * sc)), b = document.createElement('canvas'); b.width = bw; b.height = bh;
      const bx = b.getContext('2d'); bx.scale(sc, sc);
      for (const L of back) drawLayer(bx, L, W, H, st, sc);
      const m = matteFor(el, doc, t, W, H, env);
      if (m) { bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'destination-out'; bx.drawImage(m, 0, 0, bw, bh); }
      ctx.drawImage(b, 0, 0, W, H);
    }
    for (const L of front) drawLayer(ctx, L, W, H, st, sc);
  };
  // word boxes at a moment (layer coordinates), for picking words on the canvas
  C.boxesAt = function (el, t, doc) {
    const out = [], short = Math.min(el.width, el.height);
    for (const L of C.layersAt(el, t, doc)) {
      if (L.classic) { out.push({ x: L.x * el.width - L.w * el.width / 2, y: L.y * el.height - L.h * el.height / 2, w: L.w * el.width, h: L.h * el.height }); continue; }
      const ts = L.size * short; mctx.font = fontCss(L.face, ts, L.text); const w = mctx.measureText(L.text).width;
      out.push({ wordId: L.wordId, x: L.x * el.width - w / 2, y: L.y * el.height - ts * 0.6, w, h: ts * 1.2 });
    }
    return out;
  };
  C.fontsOf = function (el) {
    const st = C.style(el), out = [[st.font, st.weight, false], [st.font, st.weight, true], [st.accent, 400, true], [st.font, Math.min(600, st.weight), false]];
    for (const e of Object.values((el.cap && el.cap.edits) || {})) if (e.font) out.push([e.font, st.weight, false]);
    if ((el.cap.cues || []).some(c => TELUGU.test((c.text || '') + (c.tr || '')))) out.push(['Noto Sans Telugu', 700, false], ['Noto Sans Telugu', 500, false]);
    return out;
  };

  /* ── SubRip ── */
  const srtTime = ms => { const t = Math.max(0, Math.round(ms)); const p = (n, k = 2) => String(n).padStart(k, '0'); return `${p(Math.floor(t / 3600000))}:${p(Math.floor(t / 60000) % 60)}:${p(Math.floor(t / 1000) % 60)},${p(t % 1000, 3)}`; };
  C.toSrt = function (el, doc) {
    const st = C.style(el);
    return (el.cap.cues || []).map((c, i) => {
      const main = C.shownText(c, st).trim(), sec = st.template === 'classic' && st.second ? (st.second === 'en' ? c.en : st.second === 'tr' ? c.tr : c.text) || '' : '';
      const text = [sec.trim() !== main ? sec.trim() : '', main].filter(Boolean).join('\n') || ' ';
      return `${i + 1}\n${srtTime(C.designS(el, c.start, doc) * 1000)} --> ${srtTime(C.designS(el, c.end, doc) * 1000)}\n${text}\n`;
    }).join('\n');
  };
  C.parseTime = v => { if (typeof v === 'number') return Math.round(v * 1000); const s = String(v || '').trim().replace(/s$/, '').replace(',', '.'); let secs = 0; for (const p of s.split(':')) secs = secs * 60 + (parseFloat(p) || 0); return Math.round(secs * 1000); };
  C.fromSrt = function (txt) {
    const cues = [];
    for (const blk of String(txt).replace(/\r/g, '').split(/\n\s*\n/)) {
      const lines = blk.trim().split('\n'), k = lines.findIndex(l => l.includes('-->'));
      if (k < 0) continue;
      const [a, b] = lines[k].split('-->').map(s => C.parseTime(s.trim().split(' ')[0]));
      const text = lines.slice(k + 1).join(' ').replace(/<[^>]+>/g, '').trim();
      if (text) cues.push({ start: a, end: b, lang: '', text });
    }
    return C.clean(cues, Infinity);
  };
  // tidy cues from a model: in order, inside the clip, no overlaps, each at least 0.7 s
  C.clean = function (raw, durMs) {
    const end = durMs > 0 ? durMs : Infinity;
    const sorted = raw.filter(c => (c.text || c.en || c.tr || '').trim()).map(c => Object.assign({}, c, { start: clamp(c.start, 0, end), end: clamp(c.end, 0, end) })).sort((a, b) => a.start - b.start);
    const out = [];
    sorted.forEach((c, i) => {
      const next = sorted[i + 1] ? sorted[i + 1].start : end;
      let e = Math.max(c.end, c.start + 700);
      if (e > next) e = Math.max(next, c.start + 300);
      if (e > end) e = end;
      if (e > c.start) out.push(Object.assign({}, c, { end: e }));
    });
    return out;
  };
  window.StudioCaptions = C;
})();
