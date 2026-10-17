/* Realtime styles — window.StudioStyles.
   Image looks in the spirit of an ASCII / pixel / print / glass effects studio: every style turns a
   picture (a photo, a video frame, a whole design) into a new picture on a 2D canvas, so the same code
   runs in the editor, in thumbnails and in export. A style is { id, name, cat, tags, kind, params, fn }:
     kind 'cells'  — the picture is rebuilt from marks (characters, dots, bricks…) drawn over a backdrop
                     (blurred image / black / original / none) with the shared Backdrop + Intensity controls;
     kind 'filter' — the picture is reworked pixel by pixel (dither, glass, distort…) with an Effect strength.
   ST.apply(src, sfx, { scale, t, mask, lim }) returns a canvas the size of src. sfx = { id, ...params }. */
(function () {
  'use strict';
  const ST = {};
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const fract = v => v - Math.floor(v);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  const ctx2 = (c, read) => c.getContext('2d', read ? { willReadFrequently: true } : undefined);
  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function vnoise(x, y, s) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
  }
  const fbm = (x, y, s, o = 4) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { v += vnoise(x * f, y * f, s + i * 17) * a; f *= 2; a *= 0.5; } return v / (1 - Math.pow(0.5, o)); };
  const hex = c => { c = String(c || '#000').replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); const n = parseInt(c.slice(0, 6), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgbStr = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  function hsl2rgb(h, s, l) {
    h = fract(h); const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = fract(t); return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  }
  // a colour ramp from stops [[t, '#hex'], …] → 256 × rgb lookup
  const rampCache = new Map();
  function ramp(stops) {
    const key = JSON.stringify(stops); let lut = rampCache.get(key);
    if (lut) return lut;
    lut = new Uint8ClampedArray(256 * 3);
    const S = stops.map(([t, c]) => [t, hex(c)]);
    for (let i = 0; i < 256; i++) {
      const t = i / 255; let k = 0;
      while (k < S.length - 2 && t > S[k + 1][0]) k++;
      const [t0, c0] = S[k], [t1, c1] = S[Math.min(S.length - 1, k + 1)], f = t1 > t0 ? clamp((t - t0) / (t1 - t0), 0, 1) : 0;
      for (let j = 0; j < 3; j++) lut[i * 3 + j] = c0[j] + (c1[j] - c0[j]) * f;
    }
    rampCache.set(key, lut); return lut;
  }

  /* ── pixels ── */
  // read the picture at w × h (drawn smoothed, so shrinking averages it)
  function pix(src, w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    const c = canvas(w, h), x = ctx2(c, true);
    x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h);
    const im = x.getImageData(0, 0, w, h);
    return { w, h, d: im.data, im, c, x };
  }
  const put = p => { p.x.putImageData(p.im, 0, 0); return p.c; };
  function lumOf(p) { const n = p.w * p.h, L = new Float32Array(n), d = p.d; for (let i = 0; i < n; i++) L[i] = lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]); return L; }
  function boxBlur(a, w, h, r) {
    r = Math.round(r); if (r < 1) return a.slice();
    const t = new Float32Array(a.length), o = new Float32Array(a.length), n = r * 2 + 1;
    for (let pass = 0; pass < 2; pass++) {
      const s = pass ? t : a, d = pass ? o : t;
      if (!pass) for (let y = 0; y < h; y++) { let acc = 0; const row = y * w; for (let x = -r; x <= r; x++) acc += s[row + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { d[row + x] = acc / n; acc += s[row + Math.min(w - 1, x + r + 1)] - s[row + Math.max(0, x - r)]; } }
      else for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += s[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { d[y * w + x] = acc / n; acc += s[Math.min(h - 1, y + r + 1) * w + x] - s[Math.max(0, y - r) * w + x]; } }
    }
    return o;
  }
  const blur3 = (a, w, h, r) => boxBlur(boxBlur(boxBlur(a, w, h, r * 0.58), w, h, r * 0.58), w, h, r * 0.58);
  function sobel(L, w, h) {
    const mag = new Float32Array(w * h), gx = new Float32Array(w * h), gy = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, a = L[i - w - 1], b = L[i - w], c = L[i - w + 1], d = L[i - 1], f = L[i + 1], g = L[i + w - 1], k = L[i + w], l = L[i + w + 1];
      const X = (c + 2 * f + l) - (a + 2 * d + g), Y = (g + 2 * k + l) - (a + 2 * b + c);
      gx[i] = X; gy[i] = Y; mag[i] = Math.sqrt(X * X + Y * Y);
    }
    return { mag, gx, gy };
  }
  // per-pixel remap at working size: fn(x, y, out) writes the source position (px) into out[0..1]
  function remap(src, w, h, fn, edge) {
    const p = pix(src, w, h), s = p.d, o = new Uint8ClampedArray(s.length), q = [0, 0];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      fn(x + 0.5, y + 0.5, q);
      let sx = q[0] - 0.5, sy = q[1] - 0.5;
      const k = (y * w + x) * 4;
      if (edge === 'clear' && (sx < -0.5 || sy < -0.5 || sx > w - 0.5 || sy > h - 0.5)) { o[k + 3] = 0; continue; }
      if (edge === 'wrap') { sx = ((sx % w) + w) % w; sy = ((sy % h) + h) % h; }
      sx = clamp(sx, 0, w - 1.001); sy = clamp(sy, 0, h - 1.001);
      const ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy, a = (iy * w + ix) * 4, b = a + 4, c = a + w * 4, d = c + 4;
      for (let j = 0; j < 4; j++) o[k + j] = (s[a + j] * (1 - fx) + s[b + j] * fx) * (1 - fy) + (s[c + j] * (1 - fx) + s[d + j] * fx) * fy;
    }
    p.d.set(o); return put(p);
  }
  // a bilinear colour sample from a pix
  function samp(p, x, y, out, k = 0) {
    x = clamp(x - 0.5, 0, p.w - 1.001); y = clamp(y - 0.5, 0, p.h - 1.001);
    const ix = x | 0, iy = y | 0, fx = x - ix, fy = y - iy, w = p.w, s = p.d, a = (iy * w + ix) * 4, b = a + 4, c = a + w * 4, d = c + 4;
    for (let j = 0; j < 4; j++) out[k + j] = (s[a + j] * (1 - fx) + s[b + j] * fx) * (1 - fy) + (s[c + j] * (1 - fx) + s[d + j] * fx) * fy;
    return out;
  }
  // the image as cells: average colour per cell (and the cell's mapped brightness)
  function cells(e, cw, ch) {
    cw = Math.max(1.5, cw); ch = Math.max(1.5, ch || cw);
    const cols = Math.max(1, Math.ceil(e.W / cw)), rows = Math.max(1, Math.ceil(e.H / ch));
    const p = pix(e.src, cols, rows), n = cols * rows, L = new Float32Array(n), A = new Float32Array(n);
    for (let i = 0; i < n; i++) { const o = i * 4; L[i] = e.map(lum(p.d[o], p.d[o + 1], p.d[o + 2])); A[i] = p.d[o + 3] / 255; }
    e.tone(p.d);
    return { cols, rows, cw, ch, d: p.d, L, A, p, n };
  }
  // tint white marks drawn on ctx with the cells' colours (nearest-neighbour grid)
  function colorize(x, g, mono) {
    x.save(); x.globalCompositeOperation = 'source-in';
    if (mono) { x.fillStyle = mono; x.fillRect(0, 0, x.canvas.width, x.canvas.height); }
    else { x.imageSmoothingEnabled = false; if ('filter' in x) x.filter = 'brightness(1.25) saturate(1.15)'; x.drawImage(put(g.p), 0, 0, g.cols * g.cw, g.rows * g.ch); }
    x.restore();
  }
  // glyph atlas: chars rendered white, one per cell-sized slot
  const atlasCache = new Map();
  const MONO = '"Geist Mono", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  function atlas(chars, cw, ch, font, weight = 600, scale = 1) {
    const key = chars + '|' + cw + '|' + ch + '|' + font + '|' + weight + '|' + scale + '|' + (window.StudioRender ? window.StudioRender.fontsVersion : 0);
    let a = atlasCache.get(key);
    if (a) return a;
    if (atlasCache.size > 40) atlasCache.clear();
    const list = [...chars], W = Math.ceil(cw), H = Math.ceil(ch);
    a = canvas(W * list.length, H); const x = a.getContext('2d');
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `${weight} ${Math.max(2, ch * 0.92 * scale)}px ${font || MONO}`;
    list.forEach((c, i) => x.fillText(c, i * W + W / 2, H / 2 + ch * 0.04));
    a.n = list.length; a.cw = W; a.ch = H; atlasCache.set(key, a); return a;
  }
  function drawGlyphs(x, g, chars, pick, o = {}) {
    const at = atlas(chars, g.cw, g.ch, o.font, o.weight, o.scale);
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      const i = r * g.cols + c, k = pick(i, c, r);
      if (k < 0 || g.A[i] < 0.05) continue;
      x.drawImage(at, k * at.cw, 0, at.cw, at.ch, c * g.cw, r * g.ch, g.cw, g.ch);
    }
  }
  // the classic palettes for dithering / pixel art
  const PAL = {
    mono: ['#000000', '#ffffff'],
    grey2: ['#000000', '#555555', '#aaaaaa', '#ffffff'],
    grey3: ['#000000', '#242424', '#494949', '#6d6d6d', '#929292', '#b6b6b6', '#dbdbdb', '#ffffff'],
    gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    cga0: ['#000000', '#00aa00', '#aa0000', '#aa5500'],
    cga1: ['#000000', '#00aaaa', '#aa00aa', '#aaaaaa'],
    pico8: ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'],
    c64: ['#000000', '#ffffff', '#880000', '#aaffee', '#cc44cc', '#00cc55', '#0000aa', '#eeee77', '#dd8855', '#664400', '#ff7777', '#333333', '#777777', '#aaff66', '#0088ff', '#bbbbbb'],
    nes: ['#000000', '#fcfcfc', '#bcbcbc', '#7c7c7c', '#a80020', '#f83800', '#fca044', '#f8b800', '#00a800', '#58d854', '#0058f8', '#3cbcfc', '#6844fc', '#d800cc', '#f878f8', '#503000'],
    rgb3: ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'],
    cyberpunk: ['#0d0221', '#261447', '#2de2e6', '#f6019d', '#ff3864', '#fdf500', '#ffffff'],
    pastel: ['#3d405b', '#a3c4f3', '#90dbf4', '#98f5e1', '#b9fbc0', '#fbf8cc', '#fde4cf', '#ffcfd2', '#f1c0e8', '#cfbaf0'],
    riso: ['#f4efe4', '#ff48b0', '#0078bf', '#ffe800', '#1b1b1b'],
    sepia: ['#2b1d0e', '#704214', '#b08d57', '#e8d6b0', '#fff8e7'],
  };
  const PAL_OPTS = [['mono', 'Mono 1-bit'], ['grey2', 'Grey 2-bit'], ['grey3', 'Grey 3-bit'], ['gameboy', 'Game Boy'], ['cga0', 'CGA 0'], ['cga1', 'CGA 1'], ['pico8', 'Pico-8'], ['c64', 'C64-ish'], ['nes', 'NES-ish'], ['rgb3', '3-bit RGB'], ['cyberpunk', 'Cyberpunk'], ['pastel', 'Pastel'], ['riso', 'Risograph'], ['sepia', 'Sepia'], ['original', 'Original colours'], ['custom', 'Custom']];
  ST.PALETTES = PAL;
  function palOf(P) {
    if (P.palette === 'custom') return [P.c1, P.c2, P.c3, P.c4].filter(Boolean).map(hex);
    return (PAL[P.palette] || PAL.mono).map(hex);
  }
  function nearest(pal, r, g, b) {
    let best = 0, bd = 1e9;
    for (let i = 0; i < pal.length; i++) { const p = pal[i], dr = r - p[0], dg = g - p[1], db = b - p[2], d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; if (d < bd) { bd = d; best = i; } }
    return pal[best];
  }

  /* ── registry ── */
  const LIST = [], BY = {};
  ST.CATS = [
    ['ascii', 'ASCII & Text'], ['pixel', 'Pixel & Blocks'], ['print', 'Print & Paper'], ['geo', 'Geometric'], ['distort', 'Distort'],
    ['blur', 'Blur & Focus'], ['glitch', 'Glitch & Signal'], ['light', 'Light & Color'], ['glass', 'Glass'], ['material', 'Material & Texture'],
  ];
  const R_ = (key, label, min, max, def, o = {}) => Object.assign({ key, label, type: 'range', min, max, def }, o);
  const S_ = (key, label, options, def, o = {}) => Object.assign({ key, label, type: 'select', options, def: def ?? options[0][0] }, o);
  const T_ = (key, label, def = false, o = {}) => Object.assign({ key, label, type: 'toggle', def }, o);
  const C_ = (key, label, def, o = {}) => Object.assign({ key, label, type: 'color', def }, o);
  const X_ = (key, label, def, o = {}) => Object.assign({ key, label, type: 'text', def }, o);
  ST.P = { range: R_, select: S_, toggle: T_, color: C_, text: X_ };
  const BACKDROP = [
    S_('backdrop', 'Mode', [['blur', 'Blurred image'], ['black', 'Solid black'], ['color', 'Solid colour'], ['original', 'Original image'], ['none', 'None (transparent)']], 'blur', { group: 'backdrop' }),
    R_('soft', 'Softness', 0, 60, 14, { group: 'backdrop', unit: 'px', when: P => P.backdrop === 'blur' }),
    R_('bgOpacity', 'Opacity', 0, 100, 45, { group: 'backdrop', unit: '%', when: P => P.backdrop === 'blur' || P.backdrop === 'original' }),
    C_('bgColor', 'Colour', '#000000', { group: 'backdrop', when: P => P.backdrop === 'color' }),
    S_('blend', 'Blend mode', [['source-over', 'Normal'], ['overlay', 'Overlay'], ['color-dodge', 'Color dodge'], ['screen', 'Screen'], ['lighter', 'Lighter'], ['multiply', 'Multiply']], 'source-over', { group: 'backdrop' }),
    R_('markOpacity', 'Mark opacity', 0, 100, 100, { group: 'backdrop', unit: '%' }),
    T_('invert', 'Invert mapping', false, { group: 'backdrop' }),
    T_('dotGrid', 'Dot grid overlay', false, { group: 'backdrop' }),
  ];
  const INTENSITY = [
    R_('coverage', 'Coverage', 0, 100, 100, { group: 'intensity', unit: '%' }),
    R_('brightness', 'Brightness', -100, 100, 0, { group: 'intensity' }),
    R_('contrast', 'Contrast', -100, 100, 40, { group: 'intensity' }),
  ];
  const STRENGTH = [R_('mix', 'Effect strength', 0, 100, 100, { group: 'intensity', unit: '%' })];
  const MOTION = [T_('move', 'Animate in videos', true, { group: 'motion' }), R_('speed', 'Speed', 0, 100, 50, { group: 'motion', when: P => P.move })];
  function def(id, o) {
    o.id = id; o.kind = o.kind || 'filter';
    o.params = [...(o.params || []).map(p => Object.assign({ group: 'style' }, p)),
      ...(o.kind === 'cells' ? [...BACKDROP.filter(p => !(o.noBackdrop || []).includes(p.key)), ...INTENSITY] : (o.noTone ? STRENGTH : [...STRENGTH, ...INTENSITY.slice(1)])),
      ...(o.anim ? MOTION : [])];
    o.defaults = Object.assign({ backdrop: 'black' }, o.defaults);
    LIST.push(o); BY[id] = o; return o;
  }
  ST.LIST = LIST; ST.byId = id => BY[id];
  // every setting with its default filled in
  ST.params = function (sfx) {
    const d = BY[sfx && sfx.id]; if (!d) return {};
    const P = {}; for (const p of d.params) P[p.key] = sfx[p.key] ?? (d.defaults && d.defaults[p.key] !== undefined ? d.defaults[p.key] : p.def);
    return P;
  };
  ST.defaults = function (id) { const d = BY[id]; if (!d) return null; const o = { id }; for (const p of d.params) { const v = d.defaults && d.defaults[p.key] !== undefined ? d.defaults[p.key] : p.def; if (v !== undefined) o[p.key] = v; } return o; };
  // moves: an animated style, its motion not switched off (and, for some, only with the setting that moves it)
  ST.moves = sfx => { const d = sfx && BY[sfx.id]; return !!(d && d.anim && sfx.move !== false && (!d.animIf || d.animIf(ST.params(sfx)))); };
  ST.has = sfx => !!(sfx && sfx.id && BY[sfx.id]);
  // a random variation of a style's own settings (Restyle)
  ST.restyle = function (sfx, seed) {
    const d = BY[sfx.id], r = rng(seed || (Math.random() * 1e9) | 0), o = Object.assign({}, sfx);
    for (const p of d.params) {
      if (p.group !== 'style' || p.fixed) continue;
      if (p.type === 'range') { const span = p.max - p.min, base = p.def ?? p.min; o[p.key] = Math.round(clamp(base + (r() - 0.5) * span * 0.6, p.min, p.max)); }
      else if (p.type === 'select' && r() < 0.5) o[p.key] = p.options[(r() * p.options.length) | 0][0];
      else if (p.type === 'toggle' && r() < 0.25) o[p.key] = !o[p.key];
    }
    o.seed = (r() * 9999) | 0;
    return o;
  };

  /* ── apply ── */
  ST.apply = function (src, sfx, o = {}) {
    const d = BY[sfx && sfx.id];
    if (!d || !src || !src.width || !src.height) return src;
    // sizes are measured against the picture itself (500 units across its short side), so a style looks the same
    // in a thumbnail, in the editor and in a 4K export
    const P = ST.params(sfx), W = src.width, H = src.height, k = Math.min(W, H) / 500;
    const t = ST.moves(sfx) ? (o.t ?? 0) * (0.2 + (P.speed ?? 50) / 50 * 0.8) : 0;
    const playing = window.StudioRender && window.StudioRender.playing;
    const lim = o.lim || (playing ? 560 : 960);
    const ws = Math.min(1, lim / Math.max(W, H));
    const cf = 1 + (P.contrast ?? 0) / 100 * 0.9, bf = (P.brightness ?? 0) / 100 * 0.6, inv = !!P.invert;
    const e = {
      src, W, H, k, P, t, seed: (sfx.seed || 1) * 7 + 3, ws, w: Math.max(2, Math.round(W * ws)), h: Math.max(2, Math.round(H * ws)), o,
      // brightness → mapped 0..1 (contrast, brightness, invert)
      map: L => { L = clamp((L - 0.5) * cf + 0.5 + bf, 0, 1); return inv ? 1 - L : L; },
      // the same on colours in place (rgba array)
      tone: dd => { if (cf === 1 && !bf) return; for (let i = 0; i < dd.length; i += 4) for (let j = 0; j < 3; j++) dd[i + j] = (dd[i + j] - 128) * cf + 128 + bf * 255; },
      px: (s = 1) => pix(src, Math.max(2, Math.round(W * ws * s)), Math.max(2, Math.round(H * ws * s))),
    };
    const out = canvas(W, H), x = out.getContext('2d');
    if (d.kind === 'cells') {
      const m = P.backdrop;
      if (m === 'black' || m === 'color') { x.fillStyle = m === 'black' ? (d.black || '#000') : P.bgColor; x.fillRect(0, 0, W, H); }
      else if (m === 'blur' || m === 'original') {
        x.save(); x.globalAlpha = (P.bgOpacity ?? 100) / 100;
        if (m === 'blur' && P.soft > 0 && 'filter' in x) x.filter = `blur(${P.soft * k}px)`;
        if (m === 'blur') { x.fillStyle = '#000'; x.globalAlpha = 1; x.fillRect(0, 0, W, H); x.globalAlpha = (P.bgOpacity ?? 100) / 100; }
        x.drawImage(src, 0, 0); x.restore();
      }
      const fg = canvas(W, H), fx = fg.getContext('2d');
      d.fn(e, fx);
      if (P.coverage < 100) coverage(fx, e, P.coverage / 100);
      x.save(); x.globalAlpha = (P.markOpacity ?? 100) / 100; x.globalCompositeOperation = P.blend || 'source-over';
      x.drawImage(fg, 0, 0); x.restore();
      if (P.dotGrid) dotGrid(x, W, H, Math.max(4, (P.size || 11) * k));
    } else {
      const r = d.fn(e, x);
      if (r && r !== out) { x.drawImage(r, 0, 0, W, H); }
      if ((P.mix ?? 100) < 100) { const m = canvas(W, H), mx = m.getContext('2d'); mx.drawImage(src, 0, 0); mx.globalAlpha = (P.mix ?? 100) / 100; mx.drawImage(out, 0, 0); return finish(m, src, o); }
    }
    return finish(out, src, o);
  };
  function finish(out, src, o) {
    // a layer keeps its own outline (a cut-out stays a cut-out, text stays text-shaped)
    if (o.mask) { const x = out.getContext('2d'); x.save(); x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0); x.restore(); }
    return out;
  }
  function coverage(x, e, c) {
    // knock out a share of the marks in soft clumps so it reads as sparse, not broken
    const cell = Math.max(6, (e.P.size || 11) * e.k * 1.6), cols = Math.ceil(e.W / cell), rows = Math.ceil(e.H / cell);
    x.save(); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) if (hash(q, r, e.seed) > c) x.fillRect(q * cell, r * cell, cell, cell);
    x.restore();
  }
  function dotGrid(x, W, H, s) {
    x.save(); x.fillStyle = 'rgba(255,255,255,0.16)';
    for (let y = s / 2; y < H; y += s) for (let q = s / 2; q < W; q += s) x.fillRect(q - 0.5, y - 0.5, 1, 1);
    x.restore();
  }

  /* ════════════════════════ ASCII & TEXT ════════════════════════ */
  const SETS = {
    standard: '@#S08Xx+=-;:. ', classic: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
    ink: '█▇▆▅▄▃▂▁ ', minimal: '#+-. ', forensic: '■▣▤▥▦▧▨▩□ ', blocks: '█▓▒░ ', bars: '█▉▊▋▌▍▎▏ ', quadrants: '█▛▜▟▙▚▞▌▐▀▄▖▗▘▝ ',
    numeric: '8906532471 ', binary: '10 ', hacker: '#$%&@!?<>/\\|=+-_*. ', alpha: 'MWNQBHKRDGOSAPEZXUVYCLTJFIrl ', dots: '●◉◎○◌·. ',
    geometric: '■◆▲●◢◣◤◥◼◻△○ ', math: '∑∏∫√∞≈≠±×÷∂∆π°. ', katakana: 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ ',
  };
  ST.CHARSETS = SETS;
  const setOpts = Object.keys(SETS).map(k => [k, k[0].toUpperCase() + k.slice(1)]);
  const COLORMODE = S_('colorMode', 'Colour', [['image', 'From the image'], ['mono', 'One colour']], 'image');
  const INK = C_('ink', 'Ink', '#ffffff', { when: P => P.colorMode === 'mono' });
  function asciiCells(e, x, chars, o = {}) {
    const P = e.P, sz = Math.max(3, (P.size || 11) * e.k), g = cells(e, sz * (o.aspect ?? 0.62), sz);
    const list = [...chars], n = list.length, r = rng(e.seed + Math.floor(e.t * 8));
    drawGlyphs(x, g, chars, i => {
      const L = g.L[i];
      if (o.thresh != null && L < o.thresh) return -1;
      if (P.random) return Math.floor(r() * Math.max(1, n - 1));
      const k = Math.round((1 - L) * (n - 1));
      return list[k] === ' ' ? -1 : k;
    }, o);
    colorize(x, g, P.colorMode === 'mono' ? P.ink : o.mono);
    return g;
  }
  def('characters', {
    name: 'Characters', cat: 'ascii', tags: 'Dense · Mono', icon: '@', kind: 'cells', anim: true, animIf: P => P.random,
    params: [R_('size', 'Font size', 3, 80, 11), S_('set', 'Character set', setOpts, 'standard'), X_('chars', 'Chars', ''), COLORMODE, INK, T_('random', 'Randomize characters')],
    fn(e, x) { asciiCells(e, x, e.P.chars || SETS[e.P.set] || SETS.standard); },
  });
  def('ascii-studio', {
    name: 'ASCII Studio', cat: 'ascii', tags: 'Color · Geometric', icon: '◉', kind: 'cells', defaults: { backdrop: 'black', contrast: 60 },
    params: [R_('size', 'Glyph size', 4, 60, 13), R_('sat', 'Saturation', 0, 200, 150), R_('sparse', 'Sparse', 0, 100, 35)],
    fn(e, x) {
      const P = e.P, g = asciiCells(e, x, '✚✖◆●■▲◢◣+x· ', { aspect: 1, thresh: P.sparse / 100 * 0.6 });
      x.save(); x.globalCompositeOperation = 'source-atop'; x.filter = `saturate(${P.sat / 100}) brightness(1.25)`; x.drawImage(x.canvas, 0, 0); x.restore();
    },
  });
  def('block', {
    name: 'Block', cat: 'ascii', tags: 'Minimal · Mono', icon: '▛', kind: 'cells',
    params: [R_('size', 'Block size', 3, 80, 11), COLORMODE, INK],
    fn(e, x) { asciiCells(e, x, SETS.blocks, { aspect: 0.62 }); },
  });
  def('dots', {
    name: 'Dots', cat: 'ascii', tags: 'Minimal · Organic', icon: '●', kind: 'cells',
    params: [R_('size', 'Dot size', 3, 80, 11), R_('gap', 'Gap', 0, 60, 10), COLORMODE, INK],
    fn(e, x) {
      const P = e.P, sz = Math.max(3, P.size * e.k), g = cells(e, sz, sz), rm = sz / 2 * (1 - P.gap / 100);
      x.fillStyle = '#fff'; x.beginPath();
      for (let i = 0; i < g.n; i++) { const r = rm * Math.sqrt(g.L[i]) * g.A[i]; if (r < 0.3) continue; const c = i % g.cols, q = (i / g.cols) | 0, cx = (c + 0.5) * sz, cy = (q + 0.5) * sz; x.moveTo(cx + r, cy); x.arc(cx, cy, r, 0, TAU); }
      x.fill(); colorize(x, g, P.colorMode === 'mono' ? P.ink : null);
    },
  });
  def('mixed', {
    name: 'Mixed', cat: 'ascii', tags: 'Dense · Mono', icon: '⣷', kind: 'cells', anim: true, animIf: P => P.random,
    params: [R_('size', 'Font size', 3, 80, 11), COLORMODE, INK, T_('random', 'Randomize characters')],
    fn(e, x) { asciiCells(e, x, '█▓#@%&8BWMm*+=~-:. '); },
  });
  def('braille', {
    name: 'Braille', cat: 'ascii', tags: 'Dense · Mono', icon: '⣿', kind: 'cells',
    params: [R_('size', 'Font size', 3, 80, 11), R_('thresh', 'Threshold', 0, 100, 50), COLORMODE, INK],
    fn(e, x) {
      // each character is a 2 × 4 grid of dots, each lit where its own spot is bright enough
      const P = e.P, sz = Math.max(3, P.size * e.k), cw = sz * 0.6, ch = sz, cols = Math.ceil(e.W / cw), rows = Math.ceil(e.H / ch);
      const p = pix(e.src, cols * 2, rows * 4), th = P.thresh / 100;
      const g = cells(e, cw, ch), bits = [[0, 0, 0x1], [0, 1, 0x2], [0, 2, 0x4], [1, 0, 0x8], [1, 1, 0x10], [1, 2, 0x20], [0, 3, 0x40], [1, 3, 0x80]];
      let chars = ''; for (let i = 0; i < 256; i++) chars += String.fromCharCode(0x2800 + i);
      const at = atlas(chars, cw, ch);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        let m = 0;
        for (const [bx, by, bit] of bits) { const o = ((r * 4 + by) * p.w + c * 2 + bx) * 4; if (e.map(lum(p.d[o], p.d[o + 1], p.d[o + 2])) > th && p.d[o + 3] > 30) m |= bit; }
        if (m) x.drawImage(at, m * at.cw, 0, at.cw, at.ch, c * cw, r * ch, cw, ch);
      }
      colorize(x, g, P.colorMode === 'mono' ? P.ink : null);
    },
  });

  /* ════════════════════════ PIXEL & BLOCKS ════════════════════════ */
  def('pixel-art', {
    name: 'Pixel Art', cat: 'pixel', tags: 'Retro · Color', icon: '◧', kind: 'filter',
    params: [R_('size', 'Pixel size', 2, 60, 9), S_('palette', 'Palette', PAL_OPTS.filter(o => o[0] !== 'custom'), 'pico8'), R_('levels', 'Colour levels', 2, 16, 6, { when: P => P.palette === 'original' }), R_('sat', 'Saturation', 0, 200, 125), T_('outline', 'Dark outline', true), T_('dither', 'Dither', false)],
    fn(e, x) {
      const P = e.P, s = Math.max(1, P.size * e.k), w = Math.max(2, Math.round(e.W / s)), h = Math.max(2, Math.round(e.H / s));
      const p = pix(e.src, w, h), d = p.d, pal = P.palette === 'original' ? null : palOf(P), lv = P.levels - 1, sat = P.sat / 100;
      e.tone(d);
      const L = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const o = i * 4; let r = d[o], g = d[o + 1], b = d[o + 2]; const m = (r + g + b) / 3;
        r = m + (r - m) * sat; g = m + (g - m) * sat; b = m + (b - m) * sat;
        const th = P.dither ? (BAYER4[(i % w & 3) + ((i / w | 0) & 3) * 4] / 16 - 0.5) * 48 : 0;
        let c;
        if (pal) c = nearest(pal, r + th, g + th, b + th);
        else c = [r, g, b].map(v => Math.round(clamp(v + th, 0, 255) / 255 * lv) / lv * 255);
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; L[i] = lum(c[0], c[1], c[2]);
      }
      if (P.outline) {
        // a one-pixel dark line where the picture steps from bright to dark (or the subject meets the empty background)
        const A = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) A[i] = d[i * 4 + 3] > 40;
        for (let y = 1; y < h - 1; y++) for (let q = 1; q < w - 1; q++) {
          const i = y * w + q; if (!A[i]) continue;
          if (!A[i - 1] || !A[i + 1] || !A[i - w] || !A[i + w] || L[i] - Math.min(L[i - 1], L[i + 1], L[i - w], L[i + w]) > 0.38) { const o = i * 4; d[o] *= 0.25; d[o + 1] *= 0.25; d[o + 2] *= 0.3; }
        }
      }
      x.imageSmoothingEnabled = false; x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  def('mosaic', {
    name: 'Mosaic', cat: 'pixel', tags: 'Color · Geometric', icon: '▣', kind: 'cells', defaults: { backdrop: 'black' },
    params: [S_('shape', 'Tile shape', [['square', 'Square'], ['wide', 'Wide'], ['tall', 'Tall']], 'square'), R_('size', 'Block size', 3, 80, 13), R_('gap', 'Grout', 0, 40, 8), T_('bevel', 'Bevel', true)],
    fn(e, x) {
      const P = e.P, s = Math.max(3, P.size * e.k), cw = P.shape === 'wide' ? s * 1.8 : s, ch = P.shape === 'tall' ? s * 1.8 : s, g = cells(e, cw, ch), gp = Math.min(cw, ch) * P.gap / 100;
      for (let i = 0; i < g.n; i++) {
        if (g.A[i] < 0.05) continue;
        const c = i % g.cols, r = (i / g.cols) | 0, o = i * 4, X = c * cw + gp / 2, Y = r * ch + gp / 2, w = cw - gp, h = ch - gp;
        x.fillStyle = rgbStr(g.d[o], g.d[o + 1], g.d[o + 2]); x.fillRect(X, Y, w, h);
        if (P.bevel && w > 4) { x.fillStyle = 'rgba(255,255,255,0.16)'; x.fillRect(X, Y, w, Math.max(1, h * 0.12)); x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(X, Y + h * 0.88, w, h * 0.12); }
      }
    },
  });
  const LEGO = ['#f2f3f2', '#a5a5a5', '#646464', '#1b2a34', '#c4281b', '#da8540', '#f5cd2f', '#287f46', '#4b974a', '#0d69ab', '#6e99c9', '#923978', '#e8bac8', '#a05f34', '#d7c599', '#352100', '#ff8a00', '#9fc3e9'].map(hex);
  def('lego', {
    name: 'LEGO', cat: 'pixel', tags: 'Color · Geometric', icon: '▦', kind: 'cells', defaults: { backdrop: 'black', contrast: 20 },
    params: [R_('size', 'Brick size', 5, 80, 14), T_('palette', 'Real brick colours', true)],
    fn(e, x) {
      const P = e.P, s = Math.max(4, P.size * e.k), g = cells(e, s, s);
      for (let i = 0; i < g.n; i++) {
        if (g.A[i] < 0.1) continue;
        const c = i % g.cols, r = (i / g.cols) | 0, o = i * 4, X = c * s, Y = r * s;
        const col = P.palette ? nearest(LEGO, g.d[o], g.d[o + 1], g.d[o + 2]) : [g.d[o], g.d[o + 1], g.d[o + 2]];
        x.fillStyle = rgbStr(...col); x.fillRect(X, Y, s, s);
        x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(X, Y + s - Math.max(1, s * 0.06), s, Math.max(1, s * 0.06)); x.fillRect(X + s - Math.max(1, s * 0.06), Y, Math.max(1, s * 0.06), s);
        // the stud: a shadowed disc with a highlight on top
        const cx = X + s / 2, cy = Y + s / 2, rr = s * 0.3;
        x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.arc(cx + s * 0.04, cy + s * 0.06, rr, 0, TAU); x.fill();
        x.fillStyle = rgbStr(...col); x.beginPath(); x.arc(cx, cy, rr, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.3)'; x.beginPath(); x.arc(cx - rr * 0.25, cy - rr * 0.3, rr * 0.55, Math.PI * 1.05, Math.PI * 1.75); x.lineWidth = Math.max(0.6, s * 0.05); x.strokeStyle = 'rgba(255,255,255,0.45)'; x.stroke();
      }
    },
  });
  def('voxel', {
    name: 'Voxel', cat: 'pixel', tags: 'Geometric · Dense', icon: '⬢', kind: 'cells', defaults: { backdrop: 'black', blend: 'source-over' },
    params: [R_('size', 'Cell size', 4, 60, 12), R_('hsp', 'H. spacing', 60, 200, 100), R_('vsp', 'V. spacing', 60, 200, 100), R_('top', 'Top shade', 50, 200, 135), R_('light', 'Light side', 30, 150, 100), R_('dark', 'Dark side', 20, 150, 55), R_('outline', 'Outline', 0, 50, 0), T_('flip', 'Flip light')],
    fn(e, x) {
      // little isometric cubes, one per cell, their three faces shaded from the cell's colour
      const P = e.P, s = Math.max(4, P.size * e.k), cw = s * P.hsp / 100, ch = s * 0.75 * P.vsp / 100, g = cells(e, cw, ch);
      const sh = (c, f) => rgbStr(c[0] * f, c[1] * f, c[2] * f);
      for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
        const i = r * g.cols + c; if (g.A[i] < 0.1) continue;
        const o = i * 4, col = [g.d[o], g.d[o + 1], g.d[o + 2]], X = c * cw + (r % 2 ? cw / 2 : 0), Y = r * ch, a = s / 2, b = s / 4;
        const L = P.flip ? P.dark : P.light, D = P.flip ? P.light : P.dark;
        x.fillStyle = sh(col, P.top / 100); x.beginPath(); x.moveTo(X, Y - b); x.lineTo(X + a, Y); x.lineTo(X, Y + b); x.lineTo(X - a, Y); x.closePath(); x.fill();
        x.fillStyle = sh(col, L / 100); x.beginPath(); x.moveTo(X - a, Y); x.lineTo(X, Y + b); x.lineTo(X, Y + b + a); x.lineTo(X - a, Y + a); x.closePath(); x.fill();
        x.fillStyle = sh(col, D / 100); x.beginPath(); x.moveTo(X + a, Y); x.lineTo(X, Y + b); x.lineTo(X, Y + b + a); x.lineTo(X + a, Y + a); x.closePath(); x.fill();
        if (P.outline > 0) { x.strokeStyle = `rgba(0,0,0,${P.outline / 50})`; x.lineWidth = Math.max(0.5, s * 0.04); x.stroke(); }
      }
    },
  });
  def('hex-mosaic', {
    name: 'Hex Mosaic', cat: 'pixel', tags: 'Geometric · Color', icon: '⬡', kind: 'cells', defaults: { backdrop: 'black' },
    params: [R_('size', 'Hex size', 4, 80, 14), R_('gap', 'Grout', 0, 40, 10)],
    fn(e, x) {
      const P = e.P, s = Math.max(4, P.size * e.k), cw = s * Math.sqrt(3) / 2 * 2, ch = s * 1.5, src = e.px(), rr = s * (1 - P.gap / 100);
      e.tone(src.d);
      for (let r = -1; r * ch < e.H + s; r++) for (let c = -1; c * cw < e.W + s; c++) {
        const cx = c * cw + (r & 1 ? cw / 2 : 0), cy = r * ch, q = samp(src, cx * e.ws, cy * e.ws, [0, 0, 0, 0]);
        if (q[3] < 20) continue;
        x.fillStyle = rgbStr(q[0], q[1], q[2]); x.beginPath();
        for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
        x.closePath(); x.fill();
      }
    },
  });
  def('led-matrix', {
    name: 'LED Matrix', cat: 'pixel', tags: 'Retro · Geometric', icon: '⣿', kind: 'cells', defaults: { backdrop: 'black', contrast: 50 },
    params: [R_('size', 'LED pitch', 3, 60, 10), R_('glow', 'Glow', 0, 100, 55), S_('tint', 'LEDs', [['image', 'Full colour'], ['amber', 'Amber'], ['red', 'Red'], ['green', 'Green'], ['white', 'White']], 'image'), R_('levels', 'Brightness steps', 2, 16, 6)],
    fn(e, x) {
      const P = e.P, s = Math.max(3, P.size * e.k), g = cells(e, s, s), lv = P.levels - 1;
      const T = { amber: [255, 150, 30], red: [255, 40, 30], green: [60, 255, 90], white: [255, 255, 255] }[P.tint];
      for (let i = 0; i < g.n; i++) {
        const o = i * 4, L = Math.round(g.L[i] * lv) / lv * g.A[i];
        const c = T ? T.map(v => v * L) : [g.d[o], g.d[o + 1], g.d[o + 2]].map(v => Math.round(v / 255 * lv) / lv * 255);
        g.d[o] = c[0]; g.d[o + 1] = c[1]; g.d[o + 2] = c[2]; g.d[o + 3] = 255;
        if (T) g.d[o + 3] = 255;
      }
      x.fillStyle = '#fff'; x.beginPath();
      for (let i = 0; i < g.n; i++) { const c = i % g.cols, r = (i / g.cols) | 0, cx = (c + 0.5) * s, cy = (r + 0.5) * s; x.moveTo(cx + s * 0.38, cy); x.arc(cx, cy, s * 0.38, 0, TAU); }
      x.fill(); colorize(x, g);
      // dark LEDs still show as dim lenses
      x.save(); x.globalCompositeOperation = 'destination-over'; x.fillStyle = 'rgba(40,40,40,0.9)'; x.beginPath();
      for (let i = 0; i < g.n; i++) { const c = i % g.cols, r = (i / g.cols) | 0, cx = (c + 0.5) * s, cy = (r + 0.5) * s; x.moveTo(cx + s * 0.38, cy); x.arc(cx, cy, s * 0.38, 0, TAU); }
      x.fill(); x.restore();
      if (P.glow > 0 && 'filter' in x) { const gl = canvas(e.W, e.H), gx = gl.getContext('2d'); gx.filter = `blur(${s * 0.6}px)`; gx.drawImage(x.canvas, 0, 0); x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = P.glow / 100; x.drawImage(gl, 0, 0); x.restore(); }
    },
  });

  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  /* ════════════════════════ PRINT & PAPER ════════════════════════ */
  function bayer(n) {
    let m = [[0]];
    while (m.length < n) {
      const s = m.length, o = [];
      for (let y = 0; y < s * 2; y++) { o.push([]); for (let x = 0; x < s * 2; x++) { const v = m[y % s][x % s] * 4; o[y].push(v + [[0, 2], [3, 1]][y >= s ? 1 : 0][x >= s ? 1 : 0]); } }
      m = o;
    }
    const N = n * n; return (x, y) => (m[y % n][x % n] + 0.5) / N;
  }
  const CLUSTER = (() => { const n = 8, pts = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) pts.push([Math.hypot(x - 3.5, y - 3.5) + (x * 7 + y * 3) % 5 * 0.001, x, y]); pts.sort((a, b) => a[0] - b[0]); const m = []; pts.forEach((p, i) => { m[p[2] * n + p[1]] = (i + 0.5) / (n * n); }); return (x, y) => m[(y % n) * n + (x % n)]; })();
  const ORDERED = {
    bayer2: bayer(2), bayer4: bayer(4), bayer8: bayer(8), bayer16: bayer(16), cluster: CLUSTER,
    hlines: (x, y) => ((y % 4) + 0.5) / 4, vlines: x => ((x % 4) + 0.5) / 4, diag: (x, y) => (((x + y) % 6) + 0.5) / 6,
    white: (x, y) => hash(x, y, 91), blue: (x, y) => fract(52.9829189 * fract(0.06711056 * x + 0.00583715 * y)),
  };
  ORDERED.radial = null;
  const KERNELS = {
    fs: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]].map(k => [k[0], k[1], k[2] / 16]),
    atkinson: [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]].map(k => [k[0], k[1], 1 / 8]),
    stucki: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2], [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]].map(k => [k[0], k[1], k[2] / 42]),
    sierra: [[1, 0, 2], [-1, 1, 1], [0, 1, 1]].map(k => [k[0], k[1], k[2] / 4]),
  };
  const ALGOS = [['bayer2', 'Bayer 2×2'], ['bayer4', 'Bayer 4×4'], ['bayer8', 'Bayer 8×8'], ['bayer16', 'Bayer 16×16'], ['cluster', 'Halftone (clustered dot)'], ['radial', 'Radial'], ['hlines', 'Horizontal lines'], ['vlines', 'Vertical lines'], ['diag', 'Diagonal lines'], ['white', 'White noise'], ['blue', 'Blue noise'], ['fs', 'Floyd–Steinberg'], ['atkinson', 'Atkinson'], ['stucki', 'Stucki'], ['sierra', 'Sierra Lite']];
  // dither a pix in place to a palette; mode 'standard' (nearest colour), 'lum' (brightness steps), 'rgb' (each channel on its own)
  function ditherPix(p, o) {
    const { w, h, d } = p, n = w * h, pal = o.pal, chroma = o.chroma || 'standard';
    const sorted = pal ? pal.slice().sort((a, b) => lum(...a) - lum(...b)) : null;
    const lv = o.levels || 2, cf = (o.contrast ?? 100) / 100, bias = (50 - (o.threshold ?? 50)) / 100 * 255;
    const F = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) F[i * 3 + j] = (d[i * 4 + j] - 128) * cf + 128 + bias;
    const cx = w / 2, cy = h / 2, ordF = o.algo === 'radial' ? (x, y) => fract(Math.hypot(x - cx, y - cy) / 4.5) : ORDERED[o.algo];
    const quant = (r, g, b, t) => {
      if (!sorted) return [r, g, b].map(v => clamp(Math.floor(clamp(v, 0, 255) / 255 * (lv - 1) + t), 0, lv - 1) / (lv - 1) * 255);
      if (chroma === 'lum' || sorted.length === 2) { const L = clamp(lum(r, g, b), 0, 1); return sorted[clamp(Math.floor(L * (sorted.length - 1) + t), 0, sorted.length - 1)]; }
      if (chroma === 'rgb') { const q = [r, g, b].map(v => v / 255 >= 1 - t ? 255 : 0); return nearest(sorted, q[0], q[1], q[2]); }
      const sp = (t - 0.5) * 255 / Math.max(1, Math.sqrt(sorted.length) - 0.5);
      return nearest(sorted, r + sp, g + sp, b + sp);
    };
    if (ordF) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, q = quant(F[i * 3], F[i * 3 + 1], F[i * 3 + 2], ordF(x, y)); d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; }
    } else {
      const K = KERNELS[o.algo] || KERNELS.fs;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, r = F[i * 3], g = F[i * 3 + 1], b = F[i * 3 + 2], q = quant(r, g, b, 0.5);
        d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2];
        const er = r - q[0], eg = g - q[1], eb = b - q[2];
        for (const [dx, dy, f] of K) { const X = x + dx, Y = y + dy; if (X < 0 || X >= w || Y >= h) continue; const j = (Y * w + X) * 3; F[j] += er * f; F[j + 1] += eg * f; F[j + 2] += eb * f; }
      }
    }
    return p;
  }
  ST.ALGOS = ALGOS;
  def('dither', {
    name: 'Dither', cat: 'print', tags: 'Retro · Dense', icon: '▚', kind: 'filter', noTone: true,
    params: [S_('algo', 'Algorithm', ALGOS, 'fs'), S_('palette', 'Palette', PAL_OPTS, 'mono'),
      C_('c1', 'Colour 1', '#0b0b0e', { when: P => P.palette === 'custom' }), C_('c2', 'Colour 2', '#ff3d6e', { when: P => P.palette === 'custom' }), C_('c3', 'Colour 3', '#9ee8ff', { when: P => P.palette === 'custom' }), C_('c4', 'Colour 4', '#ffffff', { when: P => P.palette === 'custom' }),
      S_('chroma', 'Chroma', [['standard', 'Standard'], ['lum', 'Luminance only'], ['rgb', 'Per-channel R/G/B']], 'standard'), R_('pixel', 'Pixel size', 1, 12, 2), R_('contrast', 'Contrast', 0, 200, 110), R_('threshold', 'Threshold', 0, 100, 50)],
    fn(e, x) {
      const P = e.P, s = Math.max(1, P.pixel * e.k), p = pix(e.src, e.W / s, e.H / s);
      ditherPix(p, { algo: P.algo, pal: P.palette === 'original' ? null : palOf(P), levels: 3, chroma: P.chroma, contrast: P.contrast, threshold: P.threshold });
      x.imageSmoothingEnabled = false; x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  function paper(x, W, H, col, seed, amt = 0.06) {
    x.fillStyle = col; x.fillRect(0, 0, W, H);
    if (amt <= 0) return;
    const s = 3, n = canvas(Math.ceil(W / s), Math.ceil(H / s)), nx = n.getContext('2d'), im = nx.createImageData(n.width, n.height);
    for (let i = 0; i < n.width * n.height; i++) { const v = hash(i % n.width, (i / n.width) | 0, seed) * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255 * amt; }
    nx.putImageData(im, 0, 0); x.save(); x.globalCompositeOperation = 'multiply'; x.drawImage(n, 0, 0, W, H); x.restore();
  }
  // an ink layer from a density field (0..1 per working pixel) → a canvas in that ink's colour
  function inkLayer(w, h, D, col, W, H) {
    const c = canvas(w, h), x = c.getContext('2d'), im = x.createImageData(w, h), rgb = hex(col);
    for (let i = 0; i < w * h; i++) { im.data[i * 4] = rgb[0]; im.data[i * 4 + 1] = rgb[1]; im.data[i * 4 + 2] = rgb[2]; im.data[i * 4 + 3] = clamp(D[i], 0, 1) * 255; }
    x.putImageData(im, 0, 0);
    if (W) { const o = canvas(W, H), ox = o.getContext('2d'); ox.drawImage(c, 0, 0, W, H); return o; }
    return c;
  }
  def('stippling', {
    name: 'Stippling', cat: 'print', tags: 'Organic · Mono', icon: '⣠', kind: 'filter',
    params: [R_('size', 'Dot size', 1, 12, 3), R_('density', 'Density', 10, 100, 70), C_('ink', 'Ink', '#141414'), C_('paper', 'Paper', '#f3efe6')],
    fn(e, x) {
      const P = e.P, s = Math.max(1.2, P.size * e.k * 1.6), p = e.px(), L = lumOf(p), r = rng(e.seed);
      paper(x, e.W, e.H, P.paper, e.seed);
      x.fillStyle = P.ink; x.beginPath();
      for (let y = 0; y < e.H; y += s) for (let q = 0; q < e.W; q += s) {
        const X = q + r() * s, Y = y + r() * s, i = Math.min(p.h - 1, (Y * e.ws) | 0) * p.w + Math.min(p.w - 1, (X * e.ws) | 0);
        const dk = Math.pow(1 - e.map(L[i]), 1.4) * P.density / 70;
        if (p.d[i * 4 + 3] > 30 && r() < dk) { const rr = s * (0.28 + r() * 0.16); x.moveTo(X + rr, Y); x.arc(X, Y, rr, 0, TAU); }
      }
      x.fill();
    },
  });
  def('risograph', {
    name: 'Risograph', cat: 'print', tags: 'Retro · Color', icon: '▚', kind: 'filter',
    params: [C_('ink1', 'Ink 1', '#ff48b0'), C_('ink2', 'Ink 2', '#0078bf'), C_('paper', 'Paper', '#f4efe4'), R_('grain', 'Grain', 1, 10, 3), R_('shift', 'Misregister', 0, 40, 10), R_('density', 'Ink density', 30, 150, 100)],
    fn(e, x) {
      // two soy-ink drums: one carries the shadows, the other the warm mid-tones, each printed as a speckled grain
      const P = e.P, gs = Math.max(1, P.grain * e.k * 0.7), w = Math.max(2, Math.round(e.W / gs)), h = Math.max(2, Math.round(e.H / gs)), p = pix(e.src, w, h), d = p.d, n = w * h;
      const A = new Float32Array(n), B = new Float32Array(n), dn = P.density / 100;
      for (let i = 0; i < n; i++) {
        const o = i * 4, r = d[o], g = d[o + 1], b = d[o + 2], L = e.map(lum(r, g, b)), al = d[o + 3] / 255;
        const dB = Math.pow(1 - L, 1.15) * dn, dA = clamp((1 - L) * 0.55 + (r - g) / 255 * 0.7 + (r - b) / 255 * 0.2, 0, 1) * dn;
        A[i] = (hash(i % w, (i / w) | 0, e.seed) < dA ? 1 : 0) * al; B[i] = (hash(i % w, (i / w) | 0, e.seed + 5) < dB ? 1 : 0) * al;
      }
      paper(x, e.W, e.H, P.paper, e.seed, 0.05);
      const sh = P.shift * e.k * 0.3;
      x.save(); x.globalCompositeOperation = 'multiply'; x.imageSmoothingEnabled = false;
      x.drawImage(inkLayer(w, h, B, P.ink2), -sh / 2, sh / 3, e.W, e.H);
      x.drawImage(inkLayer(w, h, A, P.ink1), sh / 2, -sh / 3, e.W, e.H);
      x.restore();
    },
  });
  function posterizePix(d, lv, sat = 1) {
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2]; const m = (r + g + b) / 3;
      r = m + (r - m) * sat; g = m + (g - m) * sat; b = m + (b - m) * sat;
      d[i] = Math.round(clamp(r, 0, 255) / 255 * (lv - 1)) / (lv - 1) * 255; d[i + 1] = Math.round(clamp(g, 0, 255) / 255 * (lv - 1)) / (lv - 1) * 255; d[i + 2] = Math.round(clamp(b, 0, 255) / 255 * (lv - 1)) / (lv - 1) * 255;
    }
  }
  function edgeMask(p, th, thick = 1) {
    const L = lumOf(p), S = sobel(blur3(L, p.w, p.h, 1), p.w, p.h).mag, n = p.w * p.h, M = new Float32Array(n);
    for (let i = 0; i < n; i++) M[i] = smooth(th, th * 1.6, S[i]);
    return thick > 1 ? blur3(M, p.w, p.h, thick - 1).map(v => clamp(v * 2.2, 0, 1)) : M;
  }
  def('comic', {
    name: 'Comic', cat: 'print', tags: 'Retro · Color', icon: '◗', kind: 'filter',
    params: [R_('levels', 'Colour levels', 2, 8, 4), R_('ink', 'Ink lines', 0, 100, 60), R_('dots', 'Ben-Day dots', 0, 100, 60), R_('size', 'Dot size', 2, 20, 6), R_('sat', 'Saturation', 0, 200, 140)],
    fn(e, x) {
      const P = e.P, p = e.px(), w = p.w, h = p.h;
      const sm = pix(e.src, w, h); { const L0 = new Float32Array(w * h * 4); for (let i = 0; i < L0.length; i++) L0[i] = sm.d[i]; for (let j = 0; j < 4; j++) { const ch = new Float32Array(w * h); for (let i = 0; i < w * h; i++) ch[i] = L0[i * 4 + j]; const b = blur3(ch, w, h, 1.2); for (let i = 0; i < w * h; i++) sm.d[i * 4 + j] = b[i]; } }
      e.tone(sm.d); posterizePix(sm.d, P.levels, P.sat / 100);
      const E = edgeMask(p, 0.25 - P.ink / 100 * 0.18, 1 + P.ink / 50);
      for (let i = 0; i < w * h; i++) { const k = 1 - E[i] * (P.ink > 0 ? 1 : 0); sm.d[i * 4] *= k; sm.d[i * 4 + 1] *= k; sm.d[i * 4 + 2] *= k; }
      x.drawImage(put(sm), 0, 0, e.W, e.H);
      if (P.dots > 0) {
        // dots in the shadows, like cheap colour printing
        const s = Math.max(2, P.size * e.k), L = lumOf(p);
        x.save(); x.globalAlpha = P.dots / 100 * 0.6; x.fillStyle = '#111'; x.beginPath();
        for (let y = 0; y < e.H; y += s) for (let q = ((y / s) & 1) * s / 2; q < e.W; q += s) {
          const i = Math.min(h - 1, (y * e.ws) | 0) * w + Math.min(w - 1, (q * e.ws) | 0), dk = 1 - e.map(L[i]);
          if (dk > 0.35) { const r = s * 0.42 * Math.sqrt((dk - 0.35) / 0.65); x.moveTo(q + r, y); x.arc(q, y, r, 0, TAU); }
        }
        x.fill(); x.restore();
      }
    },
  });
  function hatch(x, W, H, ang, gap, lw, col, alpha, maskC, seed) {
    // straight strokes at an angle, then cut to where the mask is
    const c = canvas(W, H), cx = c.getContext('2d'), r = rng(seed);
    cx.strokeStyle = col; cx.lineWidth = lw; cx.globalAlpha = alpha; cx.lineCap = 'round';
    cx.translate(W / 2, H / 2); cx.rotate(ang); const D = Math.hypot(W, H) / 2;
    cx.beginPath(); for (let v = -D; v < D; v += gap) { const j = (r() - 0.5) * gap * 0.3; cx.moveTo(-D, v + j); cx.lineTo(D, v + j + (r() - 0.5) * gap); }
    cx.stroke(); cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.globalCompositeOperation = 'destination-in'; cx.globalAlpha = 1; cx.drawImage(maskC, 0, 0, W, H);
    x.drawImage(c, 0, 0);
  }
  function darkMask(e, L, w, h, lo, hi) {
    const D = new Float32Array(w * h); for (let i = 0; i < w * h; i++) D[i] = smooth(lo, hi, 1 - e.map(L[i]));
    return inkLayer(w, h, D, '#000');
  }
  def('sketch', {
    name: 'Sketch', cat: 'print', tags: 'Mono · Minimal', icon: '✎', kind: 'filter',
    params: [R_('lines', 'Outline', 0, 100, 65), R_('shade', 'Shading', 0, 100, 55), R_('gap', 'Hatch spacing', 2, 20, 5), C_('ink', 'Pencil', '#2a2a2e'), C_('paper', 'Paper', '#f6f4ef')],
    fn(e, x) {
      const P = e.P, p = e.px(), L = lumOf(p), w = p.w, h = p.h;
      paper(x, e.W, e.H, P.paper, e.seed, 0.04);
      const g = Math.max(2, P.gap * e.k);
      if (P.shade > 0) {
        hatch(x, e.W, e.H, -0.75, g, Math.max(0.6, g * 0.18), P.ink, P.shade / 100 * 0.55, darkMask(e, L, w, h, 0.35, 0.6), e.seed);
        hatch(x, e.W, e.H, 0.75, g * 1.1, Math.max(0.6, g * 0.16), P.ink, P.shade / 100 * 0.5, darkMask(e, L, w, h, 0.6, 0.85), e.seed + 3);
      }
      if (P.lines > 0) { const E = edgeMask(p, 0.3 - P.lines / 100 * 0.24); x.save(); x.globalAlpha = 0.9; x.drawImage(inkLayer(w, h, E, P.ink), 0, 0, e.W, e.H); x.restore(); }
    },
  });
  def('engraving', {
    name: 'Engraving', cat: 'print', tags: 'Mono · Retro', icon: '≣', kind: 'filter',
    params: [R_('gap', 'Line spacing', 2, 24, 6), R_('wave', 'Contour bend', 0, 100, 45), R_('angle', 'Angle', -90, 90, 0), C_('ink', 'Ink', '#121212'), C_('paper', 'Paper', '#efe8d8')],
    fn(e, x) {
      // a line screen whose lines swell in the shadows and bend with the shape's brightness
      const P = e.P, p = e.px(), L = blur3(lumOf(p), p.w, p.h, 1), w = p.w, h = p.h, g = Math.max(1.5, P.gap * e.k * e.ws), D = new Float32Array(w * h);
      const ca = Math.cos(P.angle * Math.PI / 180), sa = Math.sin(P.angle * Math.PI / 180);
      for (let y = 0; y < h; y++) for (let q = 0; q < w; q++) {
        const i = y * w + q, l = e.map(L[i]), v = (-q * sa + y * ca + l * g * 2.5 * P.wave / 50) / g, f = Math.abs(fract(v) - 0.5) * 2;
        D[i] = smooth(l * 0.95 + 0.02, l * 0.95 + 0.14, 1 - f) * (p.d[i * 4 + 3] / 255);
      }
      paper(x, e.W, e.H, P.paper, e.seed, 0.05);
      x.drawImage(inkLayer(w, h, D, P.ink), 0, 0, e.W, e.H);
    },
  });
  const WARHOL = [['#ff3f8e', '#ffd400', '#1a1a1a'], ['#00b2ff', '#ff6a00', '#141414'], ['#7cff3a', '#ff2ad4', '#101040'], ['#ffe600', '#00c2a8', '#2a0a3a'], ['#ff7aa8', '#7a5cff', '#121212'], ['#ff4a1c', '#a2f7ff', '#0d1b2a'], ['#f9f871', '#ff6f91', '#2c1338'], ['#45f0df', '#ff4d6d', '#14213d'], ['#ffd6a5', '#3a86ff', '#1b1b1b']];
  def('warhol', {
    name: 'Warhol', cat: 'print', tags: 'Color · Retro', icon: '⊞', kind: 'filter',
    params: [S_('grid', 'Grid', [['2', '2 × 2'], ['3', '3 × 3'], ['1', 'Single']], '2'), R_('levels', 'Tones', 2, 4, 3), R_('gap', 'Gap', 0, 40, 0)],
    fn(e, x) {
      const P = e.P, n = +P.grid, cw = e.W / n, ch = e.H / n, gp = P.gap * e.k, p = pix(e.src, e.w / n * 1.4, e.h / n * 1.4), L = blur3(lumOf(p), p.w, p.h, 0.8);
      x.fillStyle = '#111'; x.fillRect(0, 0, e.W, e.H);
      for (let k = 0; k < n * n; k++) {
        const pal = WARHOL[(k + e.seed) % WARHOL.length], cols = [pal[2], pal[0], pal[1], '#ffffff'].map(hex), q = pix(e.src, p.w, p.h);
        for (let i = 0; i < p.w * p.h; i++) { const lv = Math.min(P.levels, Math.floor(e.map(L[i]) * (P.levels + 0.999))), c = cols[Math.min(3, lv)]; q.d[i * 4] = c[0]; q.d[i * 4 + 1] = c[1]; q.d[i * 4 + 2] = c[2]; }
        x.drawImage(put(q), (k % n) * cw + gp / 2, ((k / n) | 0) * ch + gp / 2, cw - gp, ch - gp);
      }
    },
  });
  def('blueprint', {
    name: 'Blueprint', cat: 'print', tags: 'Retro · Color', icon: '◫', kind: 'filter',
    params: [C_('paper', 'Paper', '#1d4e8f'), C_('ink', 'Lines', '#e9f2ff'), R_('lines', 'Line detail', 0, 100, 60), R_('fill', 'Tone', 0, 100, 35), R_('grid', 'Grid', 0, 100, 40)],
    fn(e, x) {
      const P = e.P, p = e.px(), w = p.w, h = p.h, L = lumOf(p);
      x.fillStyle = P.paper; x.fillRect(0, 0, e.W, e.H);
      if (P.grid > 0) { const g = 24 * e.k; x.strokeStyle = `rgba(255,255,255,${P.grid / 100 * 0.25})`; x.lineWidth = Math.max(0.5, e.k * 0.7); x.beginPath(); for (let v = 0; v < e.W; v += g) { x.moveTo(v, 0); x.lineTo(v, e.H); } for (let v = 0; v < e.H; v += g) { x.moveTo(0, v); x.lineTo(e.W, v); } x.stroke(); }
      if (P.fill > 0) { const T = new Float32Array(w * h); for (let i = 0; i < w * h; i++) T[i] = e.map(L[i]) * P.fill / 100 * p.d[i * 4 + 3] / 255; x.drawImage(inkLayer(w, h, T, P.ink), 0, 0, e.W, e.H); }
      const E = edgeMask(p, 0.3 - P.lines / 100 * 0.24); x.drawImage(inkLayer(w, h, E, P.ink), 0, 0, e.W, e.H);
    },
  });
  // dots on a rotated grid; dot(x, y, r, sample) draws each
  function screenDots(e, s, ang, each) {
    const ca = Math.cos(ang), sa = Math.sin(ang), D = Math.hypot(e.W, e.H) / 2 + s, cx = e.W / 2, cy = e.H / 2;
    for (let v = -D; v < D; v += s) for (let u = -D; u < D; u += s) {
      const X = cx + u * ca - v * sa, Y = cy + u * sa + v * ca;
      if (X < -s || Y < -s || X > e.W + s || Y > e.H + s) continue;
      each(X, Y);
    }
  }
  def('halftone', {
    name: 'Halftone', cat: 'print', tags: 'Retro · Mono', icon: '◉', kind: 'filter',
    params: [R_('size', 'Dot size', 3, 50, 9), R_('angle', 'Angle', 0, 90, 45), S_('mode', 'Colour', [['mono', 'One ink'], ['image', 'Image colours']], 'mono'), C_('ink', 'Ink', '#111111', { when: P => P.mode === 'mono' }), C_('paper', 'Paper', '#f2eee6'), S_('shape', 'Dot', [['round', 'Round'], ['square', 'Square'], ['line', 'Line']], 'round')],
    fn(e, x) {
      const P = e.P, s = Math.max(2.5, P.size * e.k), p = e.px(), c = [0, 0, 0, 0];
      e.tone(p.d);
      x.fillStyle = P.paper; x.fillRect(0, 0, e.W, e.H);
      const mono = P.mode === 'mono';
      if (mono) { x.fillStyle = P.ink; x.beginPath(); }
      screenDots(e, s, P.angle * Math.PI / 180, (X, Y) => {
        samp(p, X * e.ws, Y * e.ws, c); if (c[3] < 20) return;
        const dk = 1 - lum(c[0], c[1], c[2]) * (P.invert ? -1 : 1), r = s * 0.62 * Math.sqrt(clamp(mono ? dk : 0.25 + dk * 0.75, 0, 1));
        if (r < 0.25) return;
        if (!mono) { x.fillStyle = rgbStr(c[0], c[1], c[2]); x.beginPath(); }
        if (P.shape === 'square') x.rect(X - r * 0.85, Y - r * 0.85, r * 1.7, r * 1.7);
        else if (P.shape === 'line') x.rect(X - s / 2, Y - r * 0.6, s, r * 1.2);
        else { x.moveTo(X + r, Y); x.arc(X, Y, r, 0, TAU); }
        if (!mono) x.fill();
      });
      if (mono) x.fill();
    },
  });
  def('woodblock', {
    name: 'Woodblock', cat: 'print', tags: 'Retro · Color', icon: '❀', kind: 'filter',
    params: [R_('levels', 'Colours', 2, 6, 4), R_('grain', 'Wood grain', 0, 100, 55), R_('ink', 'Key block', 0, 100, 45), C_('paper', 'Paper', '#efe3c8')],
    fn(e, x) {
      const P = e.P, p = e.px(0.7), w = p.w, h = p.h;
      for (let j = 0; j < 3; j++) { const ch = new Float32Array(w * h); for (let i = 0; i < w * h; i++) ch[i] = p.d[i * 4 + j]; const b = blur3(ch, w, h, 1.6); for (let i = 0; i < w * h; i++) p.d[i * 4 + j] = b[i]; }
      e.tone(p.d); posterizePix(p.d, P.levels, 1.1);
      const pc = hex(P.paper);
      for (let i = 0; i < w * h; i++) {
        const q = i % w, y = (i / w) | 0, gr = fbm(q / w * 3, y / h * 30, e.seed, 3), k = 1 - P.grain / 100 * 0.35 * smooth(0.45, 0.7, gr), o = i * 4;
        // the paper shows through where the block printed light
        const L = lum(p.d[o], p.d[o + 1], p.d[o + 2]), m = smooth(0.55, 0.9, L);
        for (let j = 0; j < 3; j++) p.d[o + j] = lerp(p.d[o + j] * k, pc[j], m);
      }
      x.drawImage(put(p), 0, 0, e.W, e.H);
      if (P.ink > 0) { const E = edgeMask(p, 0.34 - P.ink / 100 * 0.2); x.drawImage(inkLayer(w, h, E, '#1a120c'), 0, 0, e.W, e.H); }
    },
  });
  def('posterize', {
    name: 'Posterize', cat: 'print', tags: 'Color · Retro', icon: '◱', kind: 'filter',
    params: [R_('levels', 'Levels', 2, 12, 4), R_('sat', 'Saturation', 0, 200, 115), R_('smooth', 'Smooth first', 0, 10, 2)],
    fn(e, x) {
      const P = e.P, p = e.px(), w = p.w, h = p.h;
      if (P.smooth > 0) for (let j = 0; j < 3; j++) { const ch = new Float32Array(w * h); for (let i = 0; i < w * h; i++) ch[i] = p.d[i * 4 + j]; const b = blur3(ch, w, h, P.smooth * e.k * e.ws); for (let i = 0; i < w * h; i++) p.d[i * 4 + j] = b[i]; }
      e.tone(p.d); posterizePix(p.d, P.levels, P.sat / 100);
      x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  def('mezzotint', {
    name: 'Mezzotint', cat: 'print', tags: 'Retro · Mono', icon: '▚', kind: 'filter',
    params: [S_('type', 'Grain', [['dots', 'Fine dots'], ['strokes', 'Short strokes'], ['lines', 'Long lines']], 'dots'), R_('size', 'Grain size', 1, 8, 2), S_('mode', 'Colour', [['mono', 'One ink'], ['image', 'Image colours']], 'mono'), C_('ink', 'Ink', '#141414'), C_('paper', 'Paper', '#f1ece2')],
    fn(e, x) {
      const P = e.P, gs = Math.max(1, P.size * e.k * 0.8), w = Math.max(2, Math.round(e.W / gs)), h = Math.max(2, Math.round(e.H / gs)), p = pix(e.src, w, h), d = p.d, D = new Float32Array(w * h);
      e.tone(d);
      for (let y = 0; y < h; y++) for (let q = 0; q < w; q++) {
        const i = y * w + q, L = e.map(lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]));
        const nz = P.type === 'lines' ? hash(0, y, e.seed) * 0.5 + hash(q >> 4, y, e.seed) * 0.5 : P.type === 'strokes' ? hash(q >> 2, y, e.seed) * 0.6 + hash(q, y, e.seed) * 0.4 : hash(q, y, e.seed);
        D[i] = (nz > L ? 1 : 0) * d[i * 4 + 3] / 255;
      }
      x.fillStyle = P.paper; x.fillRect(0, 0, e.W, e.H); x.imageSmoothingEnabled = false;
      if (P.mode === 'image') { for (let i = 0; i < w * h; i++) d[i * 4 + 3] = D[i] * 255; x.drawImage(put(p), 0, 0, e.W, e.H); }
      else x.drawImage(inkLayer(w, h, D, P.ink), 0, 0, e.W, e.H);
    },
  });
  def('pointillize', {
    name: 'Pointillize', cat: 'print', tags: 'Color · Retro', icon: '⣿', kind: 'filter',
    params: [R_('size', 'Dot size', 3, 40, 9), R_('jitter', 'Scatter', 0, 100, 70), C_('paper', 'Ground', '#f7f3ea'), R_('bright', 'Lift colours', 0, 100, 25)],
    fn(e, x) {
      const P = e.P, s = Math.max(2, P.size * e.k), p = e.px(), r = rng(e.seed), c = [0, 0, 0, 0];
      e.tone(p.d);
      x.fillStyle = P.paper; x.fillRect(0, 0, e.W, e.H);
      for (let pass = 0; pass < 2; pass++) for (let y = 0; y < e.H; y += s * 0.8) for (let q = 0; q < e.W; q += s * 0.8) {
        const X = q + (r() - 0.5) * s * P.jitter / 50, Y = y + (r() - 0.5) * s * P.jitter / 50;
        samp(p, X * e.ws, Y * e.ws, c); if (c[3] < 30) continue;
        const v = 1 + P.bright / 100 * 0.4 + (r() - 0.5) * 0.2;
        x.fillStyle = rgbStr(c[0] * v, c[1] * v, c[2] * v, 0.92); x.beginPath(); x.arc(X, Y, s * (0.38 + r() * 0.2), 0, TAU); x.fill();
      }
    },
  });
  def('crosshatch', {
    name: 'Crosshatch', cat: 'print', tags: 'Mono · Geometric', icon: '✕', kind: 'filter',
    params: [R_('gap', 'Spacing', 2, 24, 6), R_('weight', 'Line weight', 10, 100, 35), R_('layers', 'Layers', 1, 4, 4), C_('ink', 'Ink', '#151515'), C_('paper', 'Paper', '#f5f1e8')],
    fn(e, x) {
      const P = e.P, p = e.px(0.6), L = blur3(lumOf(p), p.w, p.h, 1), g = Math.max(2, P.gap * e.k), lw = Math.max(0.5, g * P.weight / 100 * 0.5);
      paper(x, e.W, e.H, P.paper, e.seed, 0.03);
      const T = [[0.2, 0.45, -0.785], [0.45, 0.65, 0.785], [0.65, 0.82, 0], [0.82, 0.95, 1.5708]];
      for (let k = 0; k < P.layers; k++) hatch(x, e.W, e.H, T[k][2], g, lw, P.ink, 0.95, darkMask(e, L, p.w, p.h, T[k][0], T[k][1]), e.seed + k);
    },
  });
  def('cmyk-drops', {
    name: 'CMYK Drops', cat: 'print', tags: 'Color · Retro', icon: '⣿', kind: 'filter',
    params: [R_('size', 'Dot size', 3, 40, 8), R_('shift', 'Misregister', 0, 30, 4), C_('paper', 'Paper', '#f6f2ea')],
    fn(e, x) {
      // four screens at their classic angles, each dot sized by that ink's share
      const P = e.P, s = Math.max(2.5, P.size * e.k), p = e.px(), c = [0, 0, 0, 0], sh = P.shift * e.k * 0.3;
      e.tone(p.d);
      x.fillStyle = P.paper; x.fillRect(0, 0, e.W, e.H);
      const INKS = [['#00a6e3', 15, 0], ['#e6007e', 75, 1], ['#ffe500', 0, 2], ['#161616', 45, 3]];
      x.save(); x.globalCompositeOperation = 'multiply';
      for (const [col, ang, j] of INKS) {
        x.fillStyle = col; x.beginPath(); const ox = (j - 1.5) * sh, oy = (1.5 - j) * sh * 0.6;
        screenDots(e, s, ang * Math.PI / 180, (X, Y) => {
          samp(p, X * e.ws, Y * e.ws, c); if (c[3] < 20) return;
          const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, K = 1 - Math.max(r, g, b), den = 1 - K || 1;
          const v = j === 3 ? K : j === 0 ? (1 - r - K) / den : j === 1 ? (1 - g - K) / den : (1 - b - K) / den;
          const rr = s * 0.55 * Math.sqrt(clamp(v, 0, 1)); if (rr < 0.3) return;
          x.moveTo(X + ox + rr, Y + oy); x.arc(X + ox, Y + oy, rr, 0, TAU);
        });
        x.fill();
      }
      x.restore();
    },
  });
  def('cyanotype', {
    name: 'Cyanotype', cat: 'print', tags: 'Retro · Mono', icon: '◩', kind: 'filter',
    params: [C_('blue', 'Prussian blue', '#0e2f66'), C_('paper', 'Paper', '#efe7d2'), R_('contrast2', 'Exposure', 0, 100, 60), R_('texture', 'Paper texture', 0, 100, 50)],
    fn(e, x) {
      const P = e.P, p = e.px(), d = p.d, w = p.w, h = p.h, lut = ramp([[0, P.blue], [0.45, '#1e4f93'], [0.8, '#9eb6cf'], [1, P.paper]]);
      const k = 1 + P.contrast2 / 100 * 1.6;
      for (let i = 0; i < w * h; i++) {
        const q = i % w, y = (i / w) | 0, o = i * 4;
        let L = clamp((e.map(lum(d[o], d[o + 1], d[o + 2])) - 0.5) * k + 0.5, 0, 1);
        L = clamp(L + (fbm(q / 40, y / 40, e.seed, 3) - 0.5) * P.texture / 100 * 0.25, 0, 1);
        const v = (L * 255) | 0; d[o] = lut[v * 3]; d[o + 1] = lut[v * 3 + 1]; d[o + 2] = lut[v * 3 + 2];
      }
      x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  def('honeycomb', {
    name: 'Honeycomb Screen', cat: 'print', tags: 'Retro · Geometric', icon: '⬢', kind: 'filter',
    params: [R_('size', 'Cell size', 4, 60, 16), C_('ink', 'Ink', '#1d1712'), C_('paper', 'Paper', '#e9dcc0'), T_('hexDot', 'Hex dots', true)],
    fn(e, x) {
      const P = e.P, s = Math.max(4, P.size * e.k), cw = s * Math.sqrt(3) / 2 * 2 / 2, ch = s * 0.75 * 2 / 2, p = e.px(), c = [0, 0, 0, 0];
      e.tone(p.d);
      paper(x, e.W, e.H, P.paper, e.seed, 0.08); x.fillStyle = P.ink; x.beginPath(); let nn = 0;
      for (let r = -1; r * ch < e.H + s; r++) for (let q = -1; q * cw < e.W + s; q++) {
        const cx = q * cw + (r & 1 ? cw / 2 : 0), cy = r * ch; samp(p, cx * e.ws, cy * e.ws, c);
        const rr = s / 2 * 0.98 * Math.sqrt(clamp(1 - e.map(lum(c[0], c[1], c[2])), 0, 1)) * (c[3] / 255); if (rr < 0.4) continue;
        if (P.hexDot) { for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; x[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); }
        else { x.moveTo(cx + rr, cy); x.arc(cx, cy, rr, 0, TAU); }
        if (++nn % 300 === 0) { x.fill(); x.beginPath(); }
      }
      x.fill();
    },
  });
  // a crumpled sheet as a brightness map: ridges from folded noise, lit from the top left
  function crumpleMap(w, h, seed, scale = 1) {
    const H = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let q = 0; q < w; q++) { const u = q / w * 4 * scale, v = y / h * 4 * scale * h / w; H[y * w + q] = Math.abs(fbm(u, v, seed, 4) - 0.5) * 2 + fbm(u * 3, v * 3, seed + 9, 2) * 0.15; }
    const S = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let q = 1; q < w - 1; q++) { const i = y * w + q, dx = H[i + 1] - H[i - 1], dy = H[i + w] - H[i - w]; S[i] = clamp(0.5 - (dx + dy) * w * 0.012, 0, 1); }
    return S;
  }
  def('crumpled', {
    name: 'Crumpled Print', cat: 'print', tags: 'Minimal · Organic', icon: '▢', kind: 'filter',
    params: [R_('crumple', 'Crumple', 0, 100, 60), R_('scale', 'Fold size', 20, 200, 100), R_('fade', 'Print fade', 0, 100, 25), C_('paper', 'Paper', '#f4f1ea')],
    fn(e, x) {
      const P = e.P, p = e.px(0.6), w = p.w, h = p.h, S = crumpleMap(w, h, e.seed, 100 / P.scale), pc = hex(P.paper), d = p.d, a = P.crumple / 100, f = P.fade / 100;
      e.tone(d);
      for (let i = 0; i < w * h; i++) {
        const o = i * 4, sh = lerp(1, 0.55 + S[i] * 0.9, a);
        for (let j = 0; j < 3; j++) d[o + j] = clamp(lerp(d[o + j], pc[j], f * 0.6) * sh * (lerp(1, pc[j] / 255, 0.3)), 0, 255);
        d[o + 3] = 255;
      }
      x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });

  /* ════════════════════════ GEOMETRIC ════════════════════════ */
  function marks(e, x, draw, o = {}) {
    const P = e.P, s = Math.max(3, (P.size || 11) * e.k), g = cells(e, s, s);
    x.fillStyle = x.strokeStyle = '#fff'; x.lineCap = o.cap || 'butt'; x.beginPath();
    // big paths of many closed shapes fill slowly, so they go out in batches
    for (let i = 0; i < g.n; i++) { if (g.A[i] < 0.08) continue; const c = i % g.cols, r = (i / g.cols) | 0; draw(x, (c + 0.5) * s, (r + 0.5) * s, s, g.L[i], i); if (i % 300 === 299) { o.stroke ? x.stroke() : x.fill(); x.beginPath(); } }
    o.stroke ? x.stroke() : x.fill();
    colorize(x, g, P.colorMode === 'mono' ? P.ink : null);
  }
  def('cross', {
    name: 'Cross', cat: 'geo', tags: 'Geometric · Mono', icon: '✚', kind: 'cells',
    params: [R_('size', 'Mark size', 3, 80, 11), R_('weight', 'Weight', 5, 50, 20), COLORMODE, INK],
    fn(e, x) { const wt = e.P.weight / 100; marks(e, x, (x, X, Y, s, L) => { const a = s * 0.5 * L, t = Math.max(0.5, s * wt * (0.4 + L * 0.6)); if (a < 0.4) return; x.rect(X - a, Y - t / 2, a * 2, t); x.rect(X - t / 2, Y - a, t, a * 2); }); },
  });
  def('diamond', {
    name: 'Diamond', cat: 'geo', tags: 'Geometric · Mono', icon: '◆', kind: 'cells',
    params: [R_('size', 'Mark size', 3, 80, 11), COLORMODE, INK],
    fn(e, x) { marks(e, x, (x, X, Y, s, L) => { const a = s * 0.52 * Math.sqrt(L); if (a < 0.4) return; x.moveTo(X, Y - a); x.lineTo(X + a, Y); x.lineTo(X, Y + a); x.lineTo(X - a, Y); x.closePath(); }); },
  });
  def('lines', {
    name: 'Lines', cat: 'geo', tags: 'Minimal · Geometric', icon: '≡', kind: 'cells',
    params: [R_('size', 'Line spacing', 3, 80, 11), R_('weight', 'Weight', 5, 90, 35), COLORMODE, INK],
    fn(e, x) { const wt = e.P.weight / 100; marks(e, x, (x, X, Y, s, L) => { const a = s * 0.5 * L; if (a < 0.3) return; x.rect(X - a, Y - s * wt / 2, a * 2, s * wt); }); },
  });
  def('diagonal', {
    name: 'Diagonal', cat: 'geo', tags: 'Geometric · Minimal', icon: '╱', kind: 'cells',
    params: [R_('size', 'Mark size', 3, 80, 11), COLORMODE, INK],
    fn(e, x) { marks(e, x, (x, X, Y, s, L) => { if (L < 0.04) return; const h = s / 2, t = s * 0.42 * L; x.moveTo(X - h, Y + h - t); x.lineTo(X - h + t, Y + h); x.lineTo(X + h, Y - h + t); x.lineTo(X + h - t, Y - h); x.closePath(); }); },
  });
  def('specimen', {
    name: 'Specimen', cat: 'geo', tags: 'Geometric · Color', icon: '⊞', kind: 'filter',
    params: [R_('count', 'Boxes', 1, 8, 3), R_('box', 'Box size', 5, 40, 16), C_('color', 'Colour', '#9cff3a'), T_('inset', 'Magnified inset', true), T_('labels', 'Labels', true)],
    fn(e, x) {
      // the picture with a few sample boxes picked on its busiest spots, each with a magnified inset
      const P = e.P, p = e.px(0.4), L = lumOf(p), S = sobel(blur3(L, p.w, p.h, 1), p.w, p.h).mag, bs = Math.min(e.W, e.H) * P.box / 100;
      x.drawImage(e.src, 0, 0);
      const picks = [], gx = 6, gy = 6;
      for (let gyi = 0; gyi < gy; gyi++) for (let gxi = 0; gxi < gx; gxi++) {
        let best = 0, bx = 0, by = 0;
        for (let y = (gyi * p.h / gy) | 0; y < ((gyi + 1) * p.h / gy) | 0; y += 2) for (let q = (gxi * p.w / gx) | 0; q < ((gxi + 1) * p.w / gx) | 0; q += 2) { const v = S[y * p.w + q] * (p.d[(y * p.w + q) * 4 + 3] / 255); if (v > best) { best = v; bx = q; by = y; } }
        picks.push([best * (0.7 + hash(gxi, gyi, e.seed) * 0.6), bx / p.w * e.W, by / p.h * e.H]);
      }
      picks.sort((a, b) => b[0] - a[0]);
      const chosen = [];
      for (const pk of picks) { if (chosen.length >= P.count) break; if (chosen.every(c => Math.hypot(c[1] - pk[1], c[2] - pk[2]) > bs * 1.6)) chosen.push(pk); }
      const lw = Math.max(1, e.k * 2.2);
      x.strokeStyle = P.color; x.fillStyle = P.color; x.lineWidth = lw; x.font = `500 ${Math.max(7, 13 * e.k)}px ${MONO}`;
      chosen.forEach(([, cx, cy], i) => {
        const X = clamp(cx - bs / 2, lw, e.W - bs - lw), Y = clamp(cy - bs / 2, lw, e.H - bs - lw);
        x.beginPath(); x.roundRect ? x.roundRect(X, Y, bs, bs, bs * 0.08) : x.rect(X, Y, bs, bs); x.stroke();
        if (P.labels) x.fillText(String(i + 1).padStart(2, '0'), X + lw * 2, Y - lw * 2);
        if (P.inset) {
          const s2 = bs * 1.6, IX = X + bs + s2 * 0.25 + s2 > e.W ? X - s2 * 1.25 : X + bs + s2 * 0.25, IY = clamp(Y - s2 * 0.2, lw, e.H - s2 - lw);
          x.save(); x.beginPath(); x.rect(IX, IY, s2, s2); x.clip(); x.drawImage(e.src, X, Y, bs, bs, IX, IY, s2, s2); x.restore();
          x.beginPath(); x.rect(IX, IY, s2, s2); x.stroke();
          x.beginPath(); x.moveTo(X + bs, Y + bs / 2); x.lineTo(IX, IY + s2 / 2); x.globalAlpha = 0.7; x.stroke(); x.globalAlpha = 1;
        }
      });
    },
  });
  def('low-poly', {
    name: 'Low Poly', cat: 'geo', tags: 'Geometric · Minimal', icon: '◺', kind: 'filter',
    params: [R_('size', 'Triangle size', 6, 120, 28), R_('jitter', 'Jitter', 0, 100, 60), R_('edges', 'Edges', 0, 100, 0)],
    fn(e, x) {
      const P = e.P, s = Math.max(5, P.size * e.k), cols = Math.ceil(e.W / s) + 1, rows = Math.ceil(e.H / s) + 1, p = e.px(0.5), c = [0, 0, 0, 0], V = [];
      e.tone(p.d);
      for (let r = 0; r <= rows; r++) for (let q = 0; q <= cols; q++) {
        const edge = r === 0 || q === 0 || r === rows || q === cols, j = edge ? 0 : P.jitter / 100 * 0.45 * s;
        V.push([q * s + (hash(q, r, e.seed) - 0.5) * 2 * j, r * s + (hash(q, r, e.seed + 1) - 0.5) * 2 * j]);
      }
      const at = (q, r) => V[r * (cols + 1) + q];
      x.lineJoin = 'round';
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const a = at(q, r), b = at(q + 1, r), cc = at(q, r + 1), d = at(q + 1, r + 1), tris = (q + r) & 1 ? [[a, b, d], [a, d, cc]] : [[a, b, cc], [b, d, cc]];
        for (const T of tris) {
          samp(p, (T[0][0] + T[1][0] + T[2][0]) / 3 * e.ws * 0.5, (T[0][1] + T[1][1] + T[2][1]) / 3 * e.ws * 0.5, c);
          x.fillStyle = x.strokeStyle = rgbStr(c[0], c[1], c[2], c[3] / 255);
          x.beginPath(); x.moveTo(T[0][0], T[0][1]); x.lineTo(T[1][0], T[1][1]); x.lineTo(T[2][0], T[2][1]); x.closePath(); x.fill(); x.lineWidth = 0.8; x.stroke();
          if (P.edges > 0) { x.strokeStyle = `rgba(255,255,255,${P.edges / 100 * 0.4})`; x.stroke(); }
        }
      }
    },
  });
  def('droste', {
    name: 'Droste', cat: 'geo', tags: 'Geometric · Glitch', icon: '⟳', kind: 'filter', anim: true,
    params: [R_('depth', 'Depth', 2, 12, 7), R_('scale', 'Step size', 40, 92, 72), R_('rotate', 'Twist', -45, 45, 8), R_('cx', 'Centre X', 0, 100, 50), R_('cy', 'Centre Y', 0, 100, 50), T_('frame', 'Frame edges', true)],
    fn(e, x) {
      // the picture inside itself, again and again, each copy smaller and turned — zooming forever in a video
      const P = e.P, f = P.scale / 100, cx = e.W * P.cx / 100, cy = e.H * P.cy / 100, ph = fract(e.t * 0.25), lw = Math.max(1, e.k * 2);
      x.fillStyle = '#000'; x.fillRect(0, 0, e.W, e.H);
      for (let i = -1; i < P.depth; i++) {
        const k = Math.pow(f, i + 1 - ph), a = (i + 1 - ph) * P.rotate * Math.PI / 180;
        x.save(); x.translate(cx, cy); x.rotate(a); x.scale(k, k); x.translate(-cx, -cy);
        x.drawImage(e.src, 0, 0);
        if (P.frame) { x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = lw / k; x.strokeRect(0, 0, e.W, e.H); }
        x.restore();
      }
    },
  });
  def('truchet', {
    name: 'Truchet', cat: 'geo', tags: 'Geometric · Mono', icon: '◜', kind: 'cells', defaults: { backdrop: 'black' },
    params: [R_('size', 'Tile size', 4, 80, 14), S_('tile', 'Tile', [['arc', 'Quarter arcs'], ['diag', 'Diagonals'], ['tri', 'Triangles']], 'arc'), COLORMODE, INK],
    fn(e, x) {
      const P = e.P, s = Math.max(4, P.size * e.k), g = cells(e, s, s);
      x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineCap = 'round';
      for (let i = 0; i < g.n; i++) {
        if (g.A[i] < 0.08) continue;
        const c = i % g.cols, r = (i / g.cols) | 0, X = c * s, Y = r * s, flip = hash(c, r, e.seed) < 0.5, L = g.L[i];
        x.lineWidth = Math.max(0.5, s * 0.42 * L);
        x.beginPath();
        if (P.tile === 'arc') {
          if (flip) { x.arc(X, Y, s / 2, 0, Math.PI / 2); x.moveTo(X + s, Y + s / 2); x.arc(X + s, Y + s, s / 2, -Math.PI / 2, -Math.PI, true); }
          else { x.arc(X + s, Y, s / 2, Math.PI / 2, Math.PI); x.moveTo(X + s / 2, Y + s); x.arc(X, Y + s, s / 2, 0, -Math.PI / 2, true); }
          x.stroke();
        } else if (P.tile === 'diag') { if (flip) { x.moveTo(X, Y); x.lineTo(X + s, Y + s); } else { x.moveTo(X + s, Y); x.lineTo(X, Y + s); } x.stroke(); }
        else { if (L < 0.08) continue; const k = 0.2 + L * 0.8; if (flip) { x.moveTo(X, Y); x.lineTo(X + s * k, Y); x.lineTo(X, Y + s * k); } else { x.moveTo(X + s, Y + s); x.lineTo(X + s - s * k, Y + s); x.lineTo(X + s, Y + s - s * k); } x.fill(); }
      }
      colorize(x, g, P.colorMode === 'mono' ? P.ink : null);
    },
  });
  def('iso-extrude', {
    name: 'Iso Extrude', cat: 'geo', tags: 'Geometric · Retro', icon: '⬢', kind: 'filter',
    params: [R_('size', 'Column size', 4, 60, 12), R_('height', 'Height', 0, 100, 45), C_('bg', 'Background', '#05060a'), T_('invert2', 'Dark parts rise')],
    fn(e, x) {
      // the picture laid flat in isometric view, every cell pushed up into a column by its brightness
      const P = e.P, s = Math.max(4, P.size * e.k), cols = Math.ceil(e.W / s), rows = Math.ceil(e.H / s), p = pix(e.src, cols, rows);
      e.tone(p.d);
      x.fillStyle = P.bg; x.fillRect(0, 0, e.W, e.H);
      const a = e.W * 0.96 / (cols + rows), b = a * 0.58, Hm = a * 7 * P.height / 50, ox = e.W / 2 + (rows - cols) * a / 2, oy = (e.H - (cols + rows) * b) / 2 + Hm * 0.5;
      for (let sum = 0; sum < cols + rows; sum++) for (let q = Math.max(0, sum - rows + 1); q <= Math.min(cols - 1, sum); q++) {
        const r = sum - q, o = (r * cols + q) * 4; if (p.d[o + 3] < 30) continue;
        let L = lum(p.d[o], p.d[o + 1], p.d[o + 2]); if (P.invert2) L = 1 - L;
        const hh = L * Hm, X = ox + (q - r) * a, Y = oy + (q + r) * b - hh, col = [p.d[o], p.d[o + 1], p.d[o + 2]];
        x.fillStyle = rgbStr(col[0] * 0.55, col[1] * 0.55, col[2] * 0.55); x.beginPath(); x.moveTo(X - a, Y); x.lineTo(X, Y + b); x.lineTo(X, Y + b + hh + 0.5); x.lineTo(X - a, Y + hh + 0.5); x.fill();
        x.fillStyle = rgbStr(col[0] * 0.8, col[1] * 0.8, col[2] * 0.8); x.beginPath(); x.moveTo(X + a, Y); x.lineTo(X, Y + b); x.lineTo(X, Y + b + hh + 0.5); x.lineTo(X + a, Y + hh + 0.5); x.fill();
        x.fillStyle = rgbStr(Math.min(255, col[0] * 1.12), Math.min(255, col[1] * 1.12), Math.min(255, col[2] * 1.12)); x.beginPath(); x.moveTo(X, Y - b); x.lineTo(X + a, Y); x.lineTo(X, Y + b); x.lineTo(X - a, Y); x.fill();
      }
    },
  });
  def('flow-field', {
    name: 'Flow Field', cat: 'geo', tags: 'Organic · Mono', icon: '≋', kind: 'filter', anim: true,
    params: [R_('density', 'Density', 10, 100, 55), R_('length', 'Stroke length', 5, 100, 40), R_('width', 'Stroke width', 1, 20, 3), S_('colorMode', 'Colour', [['image', 'From the image'], ['mono', 'One colour']], 'mono'), C_('ink', 'Ink', '#f2f2f2', { when: P => P.colorMode === 'mono' }), C_('bg', 'Background', '#050505')],
    fn(e, x) {
      // strokes that run along the picture's contours, bright where the picture is bright
      const P = e.P, p = e.px(0.5), w = p.w, h = p.h, L = blur3(lumOf(p), w, h, 3 * e.ws * 2 + 1), G = sobel(L, w, h), r = rng(e.seed), c = [0, 0, 0, 0];
      x.fillStyle = P.bg; x.fillRect(0, 0, e.W, e.H);
      const step = Math.max(2, (110 - P.density) / 6 * e.k), steps = Math.round(4 + P.length / 3), sl = Math.max(1, 3 * e.k), sw = Math.max(0.5, P.width * e.k * 0.5), sc = w / e.W;
      x.lineCap = 'round'; x.lineWidth = sw;
      for (let y = 0; y < e.H; y += step) for (let q = 0; q < e.W; q += step) {
        let X = q + (r() - 0.5) * step, Y = y + (r() - 0.5) * step;
        samp(p, X * sc, Y * sc, c); const l = e.map(lum(c[0], c[1], c[2]));
        if (c[3] < 30 || l < 0.06 || r() > l * 1.3) continue;
        x.strokeStyle = P.colorMode === 'mono' ? P.ink : rgbStr(c[0], c[1], c[2]); x.globalAlpha = 0.35 + l * 0.65;
        x.beginPath(); x.moveTo(X, Y);
        for (let k = 0; k < steps; k++) {
          const i = clamp((Y * sc) | 0, 0, h - 1) * w + clamp((X * sc) | 0, 0, w - 1);
          const ang = Math.atan2(G.gy[i], G.gx[i]) + Math.PI / 2 + (vnoise(X / 90, Y / 90 + e.t * 0.3, e.seed) - 0.5) * 1.2;
          X += Math.cos(ang) * sl; Y += Math.sin(ang) * sl; x.lineTo(X, Y);
        }
        x.stroke();
      }
      x.globalAlpha = 1;
    },
  });
  def('lattice', {
    name: 'Lattice', cat: 'geo', tags: 'Organic · Color', icon: '▦', kind: 'filter',
    params: [R_('size', 'Spacing', 4, 60, 14), R_('warp', 'Warp', 0, 100, 60), R_('width', 'Thread width', 1, 20, 4), C_('bg', 'Background', '#050505')],
    fn(e, x) {
      // a net of threads pushed around by the picture's brightness, each thread in the colour beneath it
      const P = e.P, s = Math.max(4, P.size * e.k), p = e.px(0.4), w = p.w, h = p.h, L = blur3(lumOf(p), w, h, 2), cols = Math.ceil(e.W / s) + 1, rows = Math.ceil(e.H / s) + 1, sc = w / e.W, c = [0, 0, 0, 0];
      e.tone(p.d);
      const pt = (q, r) => { const X = q * s, Y = r * s, i = clamp((Y * sc) | 0, 0, h - 1) * w + clamp((X * sc) | 0, 0, w - 1), l = L[i]; return [X + Math.cos(l * TAU * 2) * s * P.warp / 100 * 0.9, Y + Math.sin(l * TAU * 2) * s * P.warp / 100 * 0.9, l]; };
      const V = []; for (let r = 0; r <= rows; r++) for (let q = 0; q <= cols; q++) V.push(pt(q, r));
      x.fillStyle = P.bg; x.fillRect(0, 0, e.W, e.H); x.lineCap = 'round';
      for (let r = 0; r <= rows; r++) for (let q = 0; q <= cols; q++) {
        const a = V[r * (cols + 1) + q];
        samp(p, a[0] * sc, a[1] * sc, c); if (c[3] < 30) continue;
        x.strokeStyle = rgbStr(c[0], c[1], c[2]); x.lineWidth = Math.max(0.5, P.width * e.k * 0.35 * (0.3 + a[2]));
        x.beginPath();
        if (q < cols) { const b = V[r * (cols + 1) + q + 1]; x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); }
        if (r < rows) { const b = V[(r + 1) * (cols + 1) + q]; x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); }
        x.stroke();
      }
    },
  });
  def('topography', {
    name: 'Topography', cat: 'geo', tags: 'Organic · Geometric', icon: '∿', kind: 'filter',
    params: [R_('levels', 'Contours', 4, 60, 18), R_('smooth', 'Smoothness', 0, 20, 6), S_('colorMode', 'Lines', [['ramp', 'Elevation colours'], ['image', 'From the image'], ['mono', 'One colour']], 'image'), C_('ink', 'Ink', '#f5f5f5', { when: P => P.colorMode === 'mono' }), C_('bg', 'Background', '#06080c'), R_('fill', 'Shade between', 0, 100, 0)],
    fn(e, x) {
      // contour lines of the picture's brightness, like a height map
      const P = e.P, p = e.px(), w = p.w, h = p.h, L = blur3(lumOf(p), w, h, P.smooth * e.ws * e.k + 0.5), N = P.levels, M = new Float32Array(w * h);
      const out = pix(e.src, w, h), d = out.d, ink = hex(P.ink), bg = hex(P.bg), lut = ramp([[0, '#2b1055'], [0.3, '#1f6bd6'], [0.55, '#2ee6a6'], [0.8, '#f6e05e'], [1, '#ff5a3c']]);
      for (let y = 0; y < h - 1; y++) for (let q = 0; q < w - 1; q++) { const i = y * w + q, a = Math.floor(e.map(L[i]) * N), b = Math.floor(e.map(L[i + 1]) * N), c = Math.floor(e.map(L[i + w]) * N); M[i] = a !== b || a !== c ? 1 : 0; }
      const M2 = blur3(M, w, h, 0.6);
      for (let i = 0; i < w * h; i++) {
        const o = i * 4, l = e.map(L[i]), m = clamp(M2[i] * 2.2, 0, 1), v = (Math.floor(l * N) / N * 255) | 0;
        const lc = P.colorMode === 'mono' ? ink : P.colorMode === 'ramp' ? [lut[v * 3], lut[v * 3 + 1], lut[v * 3 + 2]] : [Math.min(255, d[o] * 1.3), Math.min(255, d[o + 1] * 1.3), Math.min(255, d[o + 2] * 1.3)];
        const fl = P.fill / 100 * l * 0.5;
        for (let j = 0; j < 3; j++) d[o + j] = lerp(lerp(bg[j], lc[j], fl), lc[j], m);
        d[o + 3] = Math.max(d[o + 3], 0) ? 255 : 0;
      }
      x.drawImage(put(out), 0, 0, e.W, e.H);
    },
  });
  def('forms', {
    name: 'Forms', cat: 'geo', tags: 'Color · Organic', icon: '✽', kind: 'cells', defaults: { backdrop: 'black' },
    params: [R_('size', 'Form size', 6, 100, 22), S_('mix', 'Shapes', [['all', 'Circles, squares, triangles'], ['round', 'Circles and halves'], ['sharp', 'Squares and triangles']], 'all'), R_('turn', 'Turn', 0, 100, 50)],
    fn(e, x) {
      const P = e.P, s = Math.max(5, P.size * e.k), g = cells(e, s, s), kinds = P.mix === 'round' ? [0, 3] : P.mix === 'sharp' ? [1, 2] : [0, 1, 2, 3];
      for (let i = 0; i < g.n; i++) {
        if (g.A[i] < 0.1) continue;
        const c = i % g.cols, r = (i / g.cols) | 0, o = i * 4, X = (c + 0.5) * s, Y = (r + 0.5) * s, L = g.L[i], k = kinds[(hash(c, r, e.seed) * kinds.length) | 0], sz = s * (0.3 + L * 0.65);
        x.save(); x.translate(X, Y); x.rotate(Math.round(hash(c, r, e.seed + 2) * 4) * Math.PI / 2 * P.turn / 50);
        x.fillStyle = rgbStr(g.d[o], g.d[o + 1], g.d[o + 2]); x.beginPath();
        if (k === 0) x.arc(0, 0, sz / 2, 0, TAU);
        else if (k === 1) x.rect(-sz / 2, -sz / 2, sz, sz);
        else if (k === 2) { x.moveTo(-sz / 2, sz / 2); x.lineTo(sz / 2, sz / 2); x.lineTo(-sz / 2, -sz / 2); }
        else { x.arc(0, sz / 4, sz / 2, Math.PI, 0); }
        x.fill(); x.restore();
      }
    },
  });
  def('schematic', {
    name: 'Schematic', cat: 'geo', tags: 'Geometric · Minimal', icon: '✛', kind: 'filter',
    params: [C_('ink', 'Lines', '#e8f1ff'), C_('bg', 'Background', '#070a10'), R_('detail', 'Detail', 0, 100, 55), R_('marks', 'Callouts', 0, 12, 5), R_('grid', 'Grid', 0, 100, 30)],
    fn(e, x) {
      const P = e.P, p = e.px(), w = p.w, h = p.h, E = edgeMask(p, 0.3 - P.detail / 100 * 0.24), r = rng(e.seed);
      x.fillStyle = P.bg; x.fillRect(0, 0, e.W, e.H);
      if (P.grid > 0) { const g = 32 * e.k; x.strokeStyle = P.ink; x.globalAlpha = P.grid / 100 * 0.18; x.lineWidth = Math.max(0.5, e.k * 0.6); x.beginPath(); for (let v = g; v < e.W; v += g) { x.moveTo(v, 0); x.lineTo(v, e.H); } for (let v = g; v < e.H; v += g) { x.moveTo(0, v); x.lineTo(e.W, v); } x.stroke(); x.globalAlpha = 1; }
      x.drawImage(inkLayer(w, h, E, P.ink), 0, 0, e.W, e.H);
      // dimension callouts on strong edges
      x.strokeStyle = x.fillStyle = P.ink; x.lineWidth = Math.max(0.6, e.k); x.font = `400 ${Math.max(7, 11 * e.k)}px ${MONO}`;
      for (let k = 0, tries = 0; k < P.marks && tries < 400; tries++) {
        const q = (r() * w) | 0, y = (r() * h) | 0; if (E[y * w + q] < 0.6) continue;
        const X = q / w * e.W, Y = y / h * e.H, dx = (r() < 0.5 ? -1 : 1) * e.W * 0.12, dy = -e.H * 0.06;
        x.beginPath(); x.arc(X, Y, 3 * e.k, 0, TAU); x.moveTo(X, Y); x.lineTo(X + dx, Y + dy); x.lineTo(X + dx * 1.4, Y + dy); x.stroke();
        x.textAlign = dx < 0 ? 'right' : 'left'; x.fillText(`${String.fromCharCode(65 + k)}-${(10 + r() * 90).toFixed(1)}`, X + dx * 1.45, Y + dy - 3 * e.k); k++;
      }
      x.textAlign = 'left';
    },
  });
  def('neon-grid', {
    name: 'Neon Grid', cat: 'geo', tags: 'Color · Geometric', icon: '▦', kind: 'cells', defaults: { backdrop: 'black', contrast: 50 },
    params: [R_('size', 'Cell size', 4, 80, 16), C_('c1', 'Low', '#0a2fff'), C_('c2', 'High', '#29ffe9'), R_('glow', 'Glow', 0, 100, 60), T_('outline', 'Outlines only')],
    fn(e, x) {
      const P = e.P, s = Math.max(4, P.size * e.k), g = cells(e, s, s), lut = ramp([[0, '#000000'], [0.25, P.c1], [1, P.c2]]);
      for (let i = 0; i < g.n; i++) {
        const L = g.L[i] * g.A[i]; if (L < 0.06) continue;
        const c = i % g.cols, r = (i / g.cols) | 0, v = (L * 255) | 0, col = rgbStr(lut[v * 3], lut[v * 3 + 1], lut[v * 3 + 2]), m = s * (0.12 + (1 - L) * 0.2);
        if (P.outline) { x.strokeStyle = col; x.lineWidth = Math.max(0.6, s * 0.08); x.strokeRect(c * s + m, r * s + m, s - m * 2, s - m * 2); }
        else { x.fillStyle = col; x.fillRect(c * s + m, r * s + m, s - m * 2, s - m * 2); }
      }
      if (P.glow > 0 && 'filter' in x) { const gl = canvas(e.W, e.H), gx = gl.getContext('2d'); gx.filter = `blur(${s * 0.5}px)`; gx.drawImage(x.canvas, 0, 0); x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = P.glow / 100; x.drawImage(gl, 0, 0); x.restore(); }
    },
  });

  /* ════════════════════════ DISTORT ════════════════════════ */
  const CENTRE = [R_('cx', 'Centre X', 0, 100, 50), R_('cy', 'Centre Y', 0, 100, 50)];
  function radial(e, fn, edge) {
    const P = e.P, w = e.w, h = e.h, cx = w * (P.cx ?? 50) / 100, cy = h * (P.cy ?? 50) / 100, R0 = Math.min(w, h) * (P.radius ?? 60) / 100;
    return remap(e.src, w, h, (X, Y, q) => { const dx = X - cx, dy = Y - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), o = fn(r, a, R0); q[0] = cx + Math.cos(o[1]) * o[0]; q[1] = cy + Math.sin(o[1]) * o[0]; }, edge);
  }
  def('smudge', {
    name: 'Smudge', cat: 'distort', tags: 'Organic · Color', icon: '〰', kind: 'filter', anim: true,
    params: [R_('amount', 'Amount', 0, 100, 45), R_('scale', 'Scale', 5, 100, 35), R_('smear', 'Smear', 0, 100, 50)],
    fn(e) {
      const P = e.P, w = e.w, h = e.h, a = P.amount / 100 * Math.min(w, h) * 0.12, sc = 1 / (P.scale / 100 * Math.min(w, h) * 0.6), t = e.t * 0.25;
      const pass = src => remap(src, w, h, (X, Y, q) => { const n1 = fbm(X * sc, Y * sc + t, e.seed, 3) - 0.5, n2 = fbm(X * sc + 5.2, Y * sc - t, e.seed + 4, 3) - 0.5; q[0] = X + n1 * a * 2; q[1] = Y + n2 * a * 2; });
      let c = pass(e.src);
      if (P.smear > 0) { const o = canvas(w, h), x = o.getContext('2d'); x.drawImage(c, 0, 0); x.globalAlpha = P.smear / 100 * 0.5; x.drawImage(pass(c), 0, 0); c = o; }
      return c;
    },
  });
  def('pinch', {
    name: 'Pinch', cat: 'distort', tags: 'Geometric · Minimal', icon: '⊙', kind: 'filter',
    params: [R_('amount', 'Amount', -100, 100, 60), R_('radius', 'Radius', 10, 100, 60), ...CENTRE],
    fn(e) { const k = e.P.amount / 100; return radial(e, (r, a, R0) => r >= R0 ? [r, a] : [R0 * Math.pow(r / R0, 1 - 0.6 * k), a]); },
  });
  def('spherize', {
    name: 'Spherize', cat: 'distort', tags: 'Geometric · Minimal', icon: '◍', kind: 'filter',
    params: [R_('amount', 'Amount', -100, 100, 70), R_('radius', 'Radius', 10, 100, 55), ...CENTRE],
    fn(e) { const k = e.P.amount / 100; return radial(e, (r, a, R0) => r >= R0 ? [r, a] : [R0 * Math.pow(r / R0, 1 + 0.8 * k), a]); },
  });
  def('twirl', {
    name: 'Twirl', cat: 'distort', tags: 'Geometric · Organic', icon: '◉', kind: 'filter', anim: true,
    params: [R_('amount', 'Angle', -100, 100, 60), R_('radius', 'Radius', 10, 100, 70), ...CENTRE],
    fn(e) { const k = e.P.amount / 100 * Math.PI * 2.2 * (1 + Math.sin(e.t * 0.8) * 0.15 * (e.P.move ? 1 : 0)); return radial(e, (r, a, R0) => r >= R0 ? [r, a] : [r, a + k * Math.pow(1 - r / R0, 2)]); },
  });
  def('zigzag', {
    name: 'ZigZag', cat: 'distort', tags: 'Geometric · Organic', icon: '⌇', kind: 'filter', anim: true,
    params: [R_('amount', 'Amount', 0, 100, 40), R_('ridges', 'Ridges', 1, 30, 10), R_('radius', 'Radius', 10, 100, 80), ...CENTRE],
    fn(e) { const P = e.P, k = P.amount / 100 * 0.5; return radial(e, (r, a, R0) => r >= R0 ? [r, a] : [r, a + Math.sin(r / R0 * P.ridges * TAU - e.t * 2) * k * (1 - r / R0)]); },
  });
  def('ripple', {
    name: 'Ripple', cat: 'distort', tags: 'Geometric · Organic', icon: '≈', kind: 'filter', anim: true,
    params: [R_('amount', 'Height', 0, 100, 35), R_('waves', 'Wave length', 2, 60, 14), ...CENTRE],
    fn(e) { const P = e.P, A = P.amount / 100 * e.w * 0.02, L = Math.max(2, P.waves / 100 * e.w * 0.6); return radial(e, (r, a) => [r + Math.sin(r / L * TAU - e.t * 3) * A, a]); },
  });
  def('polar', {
    name: 'Polar', cat: 'distort', tags: 'Geometric · Minimal', icon: '◎', kind: 'filter',
    params: [S_('dir', 'Direction', [['toPolar', 'Little planet'], ['fromPolar', 'Unroll']], 'toPolar'), R_('turn', 'Turn', 0, 360, 90), T_('flip', 'Flip')],
    fn(e) {
      const P = e.P, w = e.w, h = e.h, cx = w / 2, cy = h / 2, R0 = Math.hypot(w, h) / 2, t0 = P.turn * Math.PI / 180;
      return remap(e.src, w, h, (X, Y, q) => {
        if (P.dir === 'toPolar') { const dx = X - cx, dy = Y - cy, a = fract((Math.atan2(dy, dx) + t0) / TAU), r = Math.hypot(dx, dy) / Math.min(cx, cy); q[0] = a * w; q[1] = (P.flip ? r : 1 - r) * h; }
        else { const a = X / w * TAU - t0, r = (P.flip ? Y / h : 1 - Y / h) * Math.min(cx, cy); q[0] = cx + Math.cos(a) * r; q[1] = cy + Math.sin(a) * r; }
      }, 'wrap');
    },
  });
  def('shear', {
    name: 'Shear', cat: 'distort', tags: 'Geometric · Minimal', icon: '⇔', kind: 'filter', anim: true,
    params: [S_('mode', 'Shape', [['wave', 'Wave'], ['slant', 'Slant'], ['steps', 'Steps']], 'wave'), R_('amount', 'Amount', 0, 100, 40), R_('freq', 'Frequency', 1, 20, 3), T_('vertical', 'Vertical')],
    fn(e) {
      const P = e.P, w = e.w, h = e.h, A = P.amount / 100 * w * 0.15, f = P.freq;
      return remap(e.src, w, h, (X, Y, q) => {
        const u = P.vertical ? X / w : Y / h, off = P.mode === 'slant' ? (u - 0.5) * A * 2 : P.mode === 'steps' ? (hash(Math.floor(u * f * 4), 0, e.seed) - 0.5) * A * 2 : Math.sin(u * f * TAU + e.t * 1.5) * A;
        if (P.vertical) { q[0] = X; q[1] = Y + off; } else { q[0] = X + off; q[1] = Y; }
      }, 'wrap');
    },
  });

  /* ════════════════════════ BLUR & FOCUS ════════════════════════ */
  function blurPx(src, r) { const o = canvas(src.width, src.height), x = o.getContext('2d'); if (r > 0.2 && 'filter' in x) x.filter = `blur(${r}px)`; x.drawImage(src, 0, 0); return o; }
  def('motion-blur', {
    name: 'Motion Blur', cat: 'blur', tags: 'Minimal · Organic', icon: '⇉', kind: 'filter',
    params: [R_('amount', 'Distance', 0, 100, 40), R_('angle', 'Angle', -90, 90, 0)],
    fn(e) {
      const P = e.P, w = e.w, h = e.h, D = P.amount / 100 * Math.max(w, h) * 0.12, a = P.angle * Math.PI / 180, N = clamp(Math.round(D / 1.5), 2, 40), o = canvas(w, h), x = o.getContext('2d');
      for (let i = 0; i < N; i++) { const f = i / (N - 1) - 0.5; x.globalAlpha = 1 / (i + 1); x.drawImage(e.src, Math.cos(a) * D * f, Math.sin(a) * D * f, w, h); }
      return o;
    },
  });
  def('tilt-shift', {
    name: 'Tilt-Shift', cat: 'blur', tags: 'Minimal · Color', icon: '⊙', kind: 'filter',
    params: [R_('focus', 'Focus line', 0, 100, 55), R_('band', 'Sharp band', 2, 80, 22), R_('amount', 'Blur', 0, 100, 55), R_('sat', 'Toy colours', 0, 100, 40)],
    fn(e, x) {
      const P = e.P, b = blurPx(e.src, P.amount / 100 * e.W * 0.012);
      const o = canvas(e.W, e.H), ox = o.getContext('2d');
      ox.filter = `saturate(${1 + P.sat / 100 * 0.6}) contrast(${1 + P.sat / 100 * 0.15})`; ox.drawImage(e.src, 0, 0); ox.filter = 'none';
      const m = canvas(e.W, e.H), mx = m.getContext('2d'), fy = e.H * P.focus / 100, bd = e.H * P.band / 200, g = mx.createLinearGradient(0, 0, 0, e.H);
      const st = v => clamp(v / e.H, 0, 1);
      g.addColorStop(0, '#000'); g.addColorStop(st(fy - bd * 2.5), '#000'); g.addColorStop(st(fy - bd), 'rgba(0,0,0,0)'); g.addColorStop(st(fy + bd), 'rgba(0,0,0,0)'); g.addColorStop(st(fy + bd * 2.5), '#000'); g.addColorStop(1, '#000');
      mx.fillStyle = g; mx.fillRect(0, 0, e.W, e.H); mx.globalCompositeOperation = 'source-in'; mx.filter = ox.filter; mx.drawImage(b, 0, 0);
      ox.drawImage(m, 0, 0); return o;
    },
  });
  def('gaussian-blur', {
    name: 'Gaussian Blur', cat: 'blur', tags: 'Minimal · Organic', icon: '◍', kind: 'filter',
    params: [R_('amount', 'Radius', 0, 100, 30), R_('glow', 'Bloom', 0, 100, 0)],
    fn(e, x) { const b = blurPx(e.src, e.P.amount / 100 * e.W * 0.025); x.drawImage(b, 0, 0); if (e.P.glow > 0) { x.save(); x.globalCompositeOperation = 'screen'; x.globalAlpha = e.P.glow / 100 * 0.7; x.drawImage(blurPx(e.src, e.W * 0.03), 0, 0); x.restore(); } },
  });
  def('radial-blur', {
    name: 'Radial Blur', cat: 'blur', tags: 'Minimal · Organic', icon: '◎', kind: 'filter',
    params: [S_('mode', 'Type', [['zoom', 'Zoom'], ['spin', 'Spin']], 'zoom'), R_('amount', 'Amount', 0, 100, 40), ...CENTRE],
    fn(e) {
      const P = e.P, w = e.w, h = e.h, cx = w * P.cx / 100, cy = h * P.cy / 100, N = 24, o = canvas(w, h), x = o.getContext('2d');
      for (let i = 0; i < N; i++) {
        const f = i / (N - 1); x.globalAlpha = 1 / (i + 1); x.save(); x.translate(cx, cy);
        if (P.mode === 'spin') x.rotate((f - 0.5) * P.amount / 100 * 0.5); else { const s = 1 + f * P.amount / 100 * 0.25; x.scale(s, s); }
        x.translate(-cx, -cy); x.drawImage(e.src, 0, 0, w, h); x.restore();
      }
      return o;
    },
  });

  /* ════════════════════════ GLITCH & SIGNAL ════════════════════════ */
  function glow(x, W, H, r, a, mode = 'screen') {
    if (!(a > 0) || !('filter' in x)) return;
    const g = canvas(W, H), gx = g.getContext('2d'); gx.filter = `blur(${r}px)`; gx.drawImage(x.canvas, 0, 0);
    x.save(); x.globalCompositeOperation = mode; x.globalAlpha = a; x.drawImage(g, 0, 0); x.restore();
  }
  def('crt', {
    name: 'CRT Screen', cat: 'glitch', tags: 'Retro · Color', icon: '▓', kind: 'filter', anim: true,
    params: [R_('size', 'Phosphor size', 1, 12, 3), R_('curve', 'Curvature', 0, 100, 35), R_('scan', 'Scanlines', 0, 100, 55), R_('glow', 'Glow', 0, 100, 45), R_('flicker', 'Flicker', 0, 100, 25), S_('mask', 'Mask', [['stripe', 'Aperture grille'], ['dot', 'Shadow mask'], ['none', 'None']], 'stripe')],
    fn(e, x) {
      const P = e.P, w = Math.round(e.W * Math.min(1, 1300 / Math.max(e.W, e.H))), h = Math.round(e.H * w / e.W), ts = Math.max(1, P.size * e.k * w / e.W);
      const cv = P.curve / 100 * 0.18, cx = w / 2, cy = h / 2;
      const base = cv > 0 ? remap(e.src, w, h, (X, Y, q) => { const u = X / cx - 1, v = Y / cy - 1, r2 = u * u + v * v, f = 1 + cv * r2; q[0] = cx + u * f * cx; q[1] = cy + v * f * cy; }, 'clear') : pix(e.src, w, h).c;
      const p = pix(base, w, h), d = p.d, fl = 1 - P.flicker / 100 * 0.12 * (0.5 + 0.5 * Math.sin(e.t * 47)) * (hash(Math.floor(e.t * 24), 0, 3) > 0.5 ? 1 : 0.4);
      e.tone(d);
      for (let y = 0; y < h; y++) {
        const sl = 1 - P.scan / 100 * 0.55 * (0.5 - 0.5 * Math.cos((y / ts) * Math.PI * 2 / 1.5));
        for (let q = 0; q < w; q++) {
          const o = (y * w + q) * 4; let m = [1, 1, 1];
          if (P.mask !== 'none') {
            const col = Math.floor((q + (P.mask === 'dot' && Math.floor(y / (ts * 2)) & 1 ? ts * 1.5 : 0)) / ts) % 3;
            m = col === 0 ? [1, 0.3, 0.3] : col === 1 ? [0.3, 1, 0.3] : [0.3, 0.3, 1];
          }
          for (let j = 0; j < 3; j++) d[o + j] = d[o + j] * m[j] * sl * 1.65 * fl;
        }
      }
      x.fillStyle = '#000'; x.fillRect(0, 0, e.W, e.H);
      x.drawImage(put(p), 0, 0, e.W, e.H);
      glow(x, e.W, e.H, e.W * 0.008, P.glow / 100 * 0.8, 'lighter');
      const vg = x.createRadialGradient(e.W / 2, e.H / 2, Math.min(e.W, e.H) * 0.3, e.W / 2, e.H / 2, Math.hypot(e.W, e.H) / 2);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.65)'); x.fillStyle = vg; x.fillRect(0, 0, e.W, e.H);
    },
  });
  def('pixel-sort', {
    name: 'Pixel Sort', cat: 'glitch', tags: 'Glitch · Color', icon: '▧', kind: 'filter',
    params: [R_('lo', 'Lower threshold', 0, 100, 15), R_('hi', 'Upper threshold', 0, 100, 92), S_('dir', 'Direction', [['v', 'Vertical'], ['h', 'Horizontal']], 'v'), T_('reverse', 'Reverse order'), R_('max', 'Max run', 5, 100, 100)],
    fn(e, x) {
      // runs of pixels inside the brightness window are sorted by brightness, so the picture melts in streaks
      const P = e.P, p = e.px(), w = p.w, h = p.h, d = p.d, lo = P.lo / 100, hi = P.hi / 100, vert = P.dir === 'v', N = vert ? w : h, M = vert ? h : w, maxRun = Math.max(2, M * P.max / 100);
      const idx = (a, b) => (vert ? b * w + a : a * w + b) * 4, run = [];
      for (let a = 0; a < N; a++) {
        let b = 0;
        while (b < M) {
          while (b < M) { const o = idx(a, b), L = lum(d[o], d[o + 1], d[o + 2]); if (L >= lo && L <= hi) break; b++; }
          const s0 = b; run.length = 0;
          while (b < M && b - s0 < maxRun) { const o = idx(a, b), L = lum(d[o], d[o + 1], d[o + 2]); if (L < lo || L > hi) break; run.push([L, d[o], d[o + 1], d[o + 2], d[o + 3]]); b++; }
          if (run.length > 1) { run.sort((u, v) => P.reverse ? v[0] - u[0] : u[0] - v[0]); for (let k = 0; k < run.length; k++) { const o = idx(a, s0 + k); d[o] = run[k][1]; d[o + 1] = run[k][2]; d[o + 2] = run[k][3]; d[o + 3] = run[k][4]; } }
          if (b === s0) b++;
        }
      }
      x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  def('forensics', {
    name: 'Forensics', cat: 'glitch', tags: 'Mono · Color', icon: '⊚', kind: 'filter',
    params: [R_('amplify', 'Amplify', 0, 100, 60), S_('palette', 'Read-out', [['red', 'Red alert'], ['heat', 'Heat'], ['mono', 'Mono']], 'red'), R_('levels', 'Levels', 2, 8, 4)],
    fn(e, x) {
      // an error-level-analysis look: the picture's fine detail amplified and cut into a few flat tones
      const P = e.P, p = e.px(), w = p.w, h = p.h, L = lumOf(p), B = blur3(L, w, h, 2), d = p.d;
      const lut = ramp(P.palette === 'heat' ? [[0, '#000'], [0.35, '#5a0a6b'], [0.6, '#ff3b1f'], [0.85, '#ffd23a'], [1, '#fff']] : P.palette === 'mono' ? [[0, '#000'], [1, '#fff']] : [[0, '#050505'], [0.45, '#d4130f'], [0.7, '#ff4a2b'], [1, '#ffffff']]);
      for (let i = 0; i < w * h; i++) {
        const hp = (L[i] - B[i]) * (2 + P.amplify / 10), v = clamp(e.map(L[i]) * 0.7 + hp + 0.15, 0, 1), q = Math.round(v * (P.levels - 1)) / (P.levels - 1), k = (q * 255) | 0, o = i * 4;
        d[o] = lut[k * 3]; d[o + 1] = lut[k * 3 + 1]; d[o + 2] = lut[k * 3 + 2];
      }
      x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  def('digital-distortion', {
    name: 'Digital Distortion', cat: 'glitch', tags: 'Glitch · Color', icon: '▒', kind: 'filter', anim: true,
    params: [R_('amount', 'Amount', 0, 100, 50), R_('block', 'Slice size', 2, 60, 14), R_('shift', 'Colour shift', 0, 100, 40), R_('noise', 'Block noise', 0, 100, 30)],
    fn(e, x) {
      const P = e.P, beat = Math.floor(e.t * 8), sd = e.seed + beat * 13, r = rng(sd), W = e.W, H = e.H, bh = Math.max(2, P.block * e.k), A = P.amount / 100;
      x.drawImage(e.src, 0, 0);
      // torn horizontal slices
      for (let y = 0; y < H; y += bh * (0.5 + r())) {
        if (r() > A * 0.6) continue;
        const hh = bh * (0.4 + r() * 1.6), dx = (r() - 0.5) * W * 0.25 * A;
        x.drawImage(e.src, 0, y, W, hh, dx, y, W, hh);
        if (P.shift > 0 && r() < 0.6) { x.save(); x.globalCompositeOperation = 'screen'; x.globalAlpha = P.shift / 100; x.fillStyle = r() < 0.5 ? '#ff0040' : '#00e5ff'; x.fillRect(0, y, W, hh); x.restore(); }
      }
      if (P.shift > 0) { const c = canvas(W, H), cx = c.getContext('2d'); cx.drawImage(x.canvas, 0, 0); const o = P.shift / 100 * W * 0.012; x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.35; x.drawImage(tintCopy(c, '#ff0000'), o, 0); x.drawImage(tintCopy(c, '#00ffff'), -o, 0); x.restore(); }
      // stuck macroblocks
      const bs = bh * 1.6;
      for (let k = 0; k < P.noise / 3; k++) { const X = r() * W, Y = r() * H; x.drawImage(e.src, clamp(X + (r() - 0.5) * W * 0.2, 0, W - bs), Y, bs, bs, X, Y, bs * (1 + r() * 3), bs); }
    },
  });
  function tintCopy(src, col) { const c = canvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0); return c; }
  def('datamosh', {
    name: 'Datamosh', cat: 'glitch', tags: 'Glitch · Color', icon: '▞', kind: 'filter', anim: true,
    params: [R_('amount', 'Melt', 0, 100, 55), R_('block', 'Macroblock', 4, 64, 16), R_('smear', 'Smear', 0, 100, 60), R_('colour', 'Colour crush', 0, 100, 35)],
    fn(e, x) {
      // macroblocks dragged along a lazy motion field and smeared, like a broken video keyframe
      const P = e.P, W = e.W, H = e.H, b = Math.max(3, P.block * e.k), A = P.amount / 100, t = e.t * 0.6;
      x.drawImage(e.src, 0, 0);
      const cols = Math.ceil(W / b), rows = Math.ceil(H / b), frame = canvas(W, H), fx = frame.getContext('2d'); fx.drawImage(e.src, 0, 0);
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const n = fbm(q / cols * 3 + t, r / rows * 3, e.seed, 2), m = fbm(q / cols * 3, r / rows * 3 - t, e.seed + 7, 2);
        if (hash(q, r, e.seed) > A * 0.9 + 0.15) continue;
        const dx = (n - 0.5) * b * 18 * A, dy = (m - 0.5) * b * 18 * A, steps = 1 + Math.round(P.smear / 20);
        for (let k = steps; k >= 1; k--) x.drawImage(frame, clamp(q * b + dx * k / steps, 0, W - b), clamp(r * b + dy * k / steps, 0, H - b), b, b, q * b, r * b, b, b);
      }
      if (P.colour > 0) { const p = pix(x.canvas, e.w, e.h); posterizePix(p.d, Math.round(lerp(12, 3, P.colour / 100)), 1.2); x.save(); x.globalAlpha = P.colour / 100; x.drawImage(put(p), 0, 0, W, H); x.restore(); }
    },
  });
  def('lofi', {
    name: 'Lofi', cat: 'glitch', tags: 'Retro · Color', icon: '▒', kind: 'filter', anim: true,
    params: [R_('res', 'Resolution', 5, 100, 35), R_('bleed', 'Colour bleed', 0, 100, 50), R_('noise', 'Noise', 0, 100, 35), R_('sat', 'Saturation', 0, 200, 125), R_('wobble', 'Tape wobble', 0, 100, 25)],
    fn(e, x) {
      const P = e.P, sc = 0.08 + P.res / 100 * 0.5, w = Math.max(8, Math.round(e.W * sc * e.ws)), h = Math.max(8, Math.round(e.H * sc * e.ws)), p = pix(e.src, w, h), d = p.d, r = rng(e.seed + Math.floor(e.t * 24));
      e.tone(d);
      const Cb = new Float32Array(w * h), Cr = new Float32Array(w * h), Y = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) { const o = i * 4, R = d[o], G = d[o + 1], B = d[o + 2]; Y[i] = 0.299 * R + 0.587 * G + 0.114 * B; Cb[i] = (B - Y[i]) * P.sat / 100; Cr[i] = (R - Y[i]) * P.sat / 100; }
      const bl = Math.round(P.bleed / 100 * w * 0.03);
      const blurH = a => { if (bl < 1) return a; const o = new Float32Array(a.length); for (let y = 0; y < h; y++) { let acc = 0, n = 0; for (let q = 0; q < w; q++) { acc += a[y * w + q]; n++; if (n > bl) { acc -= a[y * w + q - bl]; n--; } o[y * w + q] = acc / n; } } return o; };
      const cb = blurH(Cb), cr = blurH(Cr);
      for (let y = 0; y < h; y++) {
        const wob = Math.round((vnoise(y / h * 6, e.t * 2, e.seed) - 0.5) * P.wobble / 100 * w * 0.03);
        for (let q = 0; q < w; q++) {
          const i = y * w + q, j = y * w + clamp(q + wob, 0, w - 1), o = i * 4, n = (r() - 0.5) * P.noise * 1.2;
          const yy = Y[j] + n, R = yy + cr[j] / 0.713 * 0.5, B = yy + cb[j] / 0.564 * 0.5, G = (yy - 0.299 * R - 0.114 * B) / 0.587;
          d[o] = R; d[o + 1] = G; d[o + 2] = B;
        }
      }
      x.imageSmoothingEnabled = true; x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  def('rgb-split', {
    name: 'RGB Split', cat: 'glitch', tags: 'Glitch · Color', icon: '◐', kind: 'filter', anim: true,
    params: [R_('amount', 'Distance', 0, 100, 35), R_('angle', 'Angle', -180, 180, 0), R_('jitter', 'Jitter', 0, 100, 0)],
    fn(e, x) {
      const P = e.P, jit = P.jitter / 100 * (hash(Math.floor(e.t * 12), 1, e.seed) - 0.5) * 2, D = (P.amount / 100 + jit * 0.3) * e.W * 0.035, a = P.angle * Math.PI / 180, dx = Math.cos(a) * D, dy = Math.sin(a) * D;
      x.fillStyle = '#000'; x.fillRect(0, 0, e.W, e.H); x.globalCompositeOperation = 'lighter';
      x.drawImage(tintCopy(e.src, '#ff0000'), dx, dy); x.drawImage(tintCopy(e.src, '#00ff00'), 0, 0); x.drawImage(tintCopy(e.src, '#0000ff'), -dx, -dy);
      x.globalCompositeOperation = 'source-over';
    },
  });
  def('scanline', {
    name: 'Scanline', cat: 'glitch', tags: 'Retro · Glitch', icon: '☰', kind: 'filter', anim: true,
    params: [R_('gap', 'Line spacing', 2, 20, 4), R_('dark', 'Darkness', 0, 100, 55), R_('roll', 'Rolling band', 0, 100, 35), R_('glow', 'Glow', 0, 100, 30)],
    fn(e, x) {
      const P = e.P, g = Math.max(2, P.gap * e.k);
      x.drawImage(e.src, 0, 0); glow(x, e.W, e.H, e.W * 0.006, P.glow / 100 * 0.6);
      x.fillStyle = `rgba(0,0,0,${P.dark / 100 * 0.75})`;
      for (let y = 0; y < e.H; y += g) x.fillRect(0, y + g * 0.5, e.W, g * 0.5);
      if (P.roll > 0) { const by = fract(e.t * 0.15) * (e.H * 1.4) - e.H * 0.2, gr = x.createLinearGradient(0, by - e.H * 0.08, 0, by + e.H * 0.08); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${P.roll / 100 * 0.18})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, by - e.H * 0.08, e.W, e.H * 0.16); }
    },
  });
  const THERMAL = {
    iron: [[0, '#000010'], [0.2, '#2a0a6e'], [0.4, '#8a0f8f'], [0.6, '#e2322a'], [0.8, '#ffae19'], [1, '#fffbe0']],
    rainbow: [[0, '#00007a'], [0.2, '#0050ff'], [0.4, '#00e5ff'], [0.55, '#3cff3c'], [0.75, '#fff000'], [0.9, '#ff5a00'], [1, '#ff0000']],
    arctic: [[0, '#0a0f3a'], [0.4, '#1a6bff'], [0.7, '#7af0ff'], [1, '#ffffff']],
    white: [[0, '#000'], [1, '#fff']], black: [[0, '#fff'], [1, '#000']],
    lava: [[0, '#0a0000'], [0.4, '#8a0000'], [0.7, '#ff5a00'], [1, '#ffef9a']],
  };
  function gradMap(e, x, stops, o = {}) {
    const p = e.px(), d = p.d, lut = ramp(stops), L = o.blur ? blur3(lumOf(p), p.w, p.h, o.blur) : null;
    for (let i = 0; i < p.w * p.h; i++) { const q = i * 4, v = (clamp(e.map(L ? L[i] : lum(d[q], d[q + 1], d[q + 2])), 0, 1) * 255) | 0; d[q] = lut[v * 3]; d[q + 1] = lut[v * 3 + 1]; d[q + 2] = lut[v * 3 + 2]; }
    x.drawImage(put(p), 0, 0, e.W, e.H);
  }
  def('thermal', {
    name: 'Thermal', cat: 'glitch', tags: 'Color · Glitch', icon: '◉', kind: 'filter',
    params: [S_('palette', 'Palette', [['iron', 'Ironbow'], ['rainbow', 'Rainbow'], ['arctic', 'Arctic'], ['lava', 'Lava'], ['white', 'White hot'], ['black', 'Black hot']], 'iron'), R_('soft', 'Sensor blur', 0, 20, 3), T_('readout', 'Sensor read-out', false)],
    fn(e, x) {
      gradMap(e, x, THERMAL[e.P.palette] || THERMAL.iron, { blur: e.P.soft * e.ws * e.k + 0.01 });
      if (e.P.readout) { x.fillStyle = '#fff'; x.font = `500 ${Math.max(8, 16 * e.k)}px ${MONO}`; x.fillText('36.8°C', 20 * e.k, 34 * e.k); x.fillText('◉ SPOT', 20 * e.k, e.H - 20 * e.k); x.strokeStyle = '#fff'; x.lineWidth = Math.max(1, e.k * 1.5); const c = 14 * e.k; x.beginPath(); x.moveTo(e.W / 2 - c, e.H / 2); x.lineTo(e.W / 2 + c, e.H / 2); x.moveTo(e.W / 2, e.H / 2 - c); x.lineTo(e.W / 2, e.H / 2 + c); x.stroke(); }
    },
  });
  def('beacon', {
    name: 'Beacon', cat: 'glitch', tags: 'Color · Dense', icon: '✦', kind: 'cells', defaults: { backdrop: 'black', contrast: 60 },
    params: [R_('size', 'Lamp pitch', 3, 60, 9), R_('thresh', 'Light up above', 0, 100, 45), R_('glow', 'Glow', 0, 100, 70), COLORMODE, INK],
    fn(e, x) {
      const P = e.P, s = Math.max(3, P.size * e.k), g = cells(e, s, s), th = P.thresh / 100;
      for (let i = 0; i < g.n; i++) {
        const c = i % g.cols, r = (i / g.cols) | 0, L = g.L[i] * g.A[i], on = L > th, m = s * 0.22;
        x.fillStyle = on ? '#fff' : `rgba(255,255,255,${0.06 + L * 0.12})`; x.fillRect(c * s + m, r * s + m, s - m * 2, s - m * 2);
      }
      colorize(x, g, P.colorMode === 'mono' ? P.ink : null);
      x.save(); x.globalCompositeOperation = 'source-atop'; x.filter = 'brightness(1.6) saturate(1.3)'; x.drawImage(x.canvas, 0, 0); x.restore();
      glow(x, e.W, e.H, s * 0.9, P.glow / 100, 'lighter');
    },
  });

  /* ════════════════════════ LIGHT & COLOR ════════════════════════ */
  def('disco', {
    name: 'Disco', cat: 'light', tags: 'Glitch · Color', icon: '◈', kind: 'cells', anim: true, defaults: { blend: 'color-dodge' },
    params: [R_('uniformity', 'Uniformity', 0, 100, 80), R_('size', 'Mark size', 3, 80, 11), R_('spin', 'Colour cycle', 0, 100, 40)],
    fn(e, x) {
      const P = e.P, s = Math.max(3, P.size * e.k), g = cells(e, s, s), u = P.uniformity / 100;
      for (let i = 0; i < g.n; i++) {
        if (g.A[i] < 0.08) continue;
        const c = i % g.cols, r = (i / g.cols) | 0, L = g.L[i], X = (c + 0.5) * s, Y = (r + 0.5) * s, k = (c + r) % 3, a = s * 0.48 * (0.35 + L * 0.65);
        const hue = L * 0.8 + hash(c, r, e.seed) * (1 - u) + e.t * P.spin / 100 * 0.3, rgb = hsl2rgb(hue, 1, 0.35 + L * 0.4);
        x.fillStyle = rgbStr(...rgb); x.beginPath();
        if (k === 0) { x.moveTo(X, Y - a); x.lineTo(X + a, Y); x.lineTo(X, Y + a); x.lineTo(X - a, Y); x.closePath(); x.fill(); }
        else if (k === 1) { x.arc(X, Y, a * 0.85, 0, TAU); x.fill(); }
        else { x.lineWidth = Math.max(0.6, s * 0.12); x.strokeStyle = x.fillStyle; x.moveTo(X, Y - a * 0.8); x.lineTo(X + a * 0.8, Y); x.lineTo(X, Y + a * 0.8); x.lineTo(X - a * 0.8, Y); x.closePath(); x.stroke(); }
      }
    },
  });
  def('anaglyph', {
    name: 'Anaglyph 3D', cat: 'light', tags: 'Retro · Color', icon: '◑', kind: 'filter',
    params: [R_('depth', 'Depth', 0, 100, 45), T_('mono', 'Grey first', false), T_('flatShift', 'Even shift', false)],
    fn(e, x) {
      // bright parts read as near: they shift further between the red and the cyan eye
      const P = e.P, w = e.w, h = e.h, p = pix(e.src, w, h), L = blur3(lumOf(p), w, h, 4), D = P.depth / 100 * w * 0.02, s = p.d, o = new Uint8ClampedArray(s.length);
      for (let y = 0; y < h; y++) for (let q = 0; q < w; q++) {
        const i = y * w + q, sh = D * (P.flatShift ? 1 : 0.3 + L[i]), l = clamp(Math.round(q + sh), 0, w - 1), r = clamp(Math.round(q - sh), 0, w - 1), a = (y * w + l) * 4, b = (y * w + r) * 4, k = i * 4;
        if (P.mono) { o[k] = lum(s[a], s[a + 1], s[a + 2]) * 255; o[k + 1] = o[k + 2] = lum(s[b], s[b + 1], s[b + 2]) * 255; }
        else { o[k] = s[a]; o[k + 1] = s[b + 1]; o[k + 2] = s[b + 2]; }
        o[k + 3] = Math.max(s[a + 3], s[b + 3]);
      }
      p.d.set(o); x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  const GRADS = {
    sunset: [[0, '#140026'], [0.35, '#7a1c6d'], [0.65, '#ff5e3a'], [1, '#ffe39a']], ocean: [[0, '#02111f'], [0.4, '#0a4c8a'], [0.75, '#2ec4d6'], [1, '#e9fffb']],
    neon: [[0, '#0b0033'], [0.4, '#ff00a8'], [0.7, '#00f0ff'], [1, '#ffffff']], fire: [[0, '#000'], [0.4, '#a3000b'], [0.7, '#ff7a00'], [1, '#fff3a0']],
    forest: [[0, '#06140c'], [0.5, '#2f6b3a'], [1, '#e8f5c8']], gold: [[0, '#1b0f2e'], [0.5, '#7a4b9a'], [0.8, '#e7b75a'], [1, '#fff6d9']],
    mono: [[0, '#000'], [1, '#fff']], blush: [[0, '#2a0e1c'], [0.5, '#d65a7e'], [1, '#ffe9ef']],
  };
  def('gradient-map', {
    name: 'Gradient Map', cat: 'light', tags: 'Color · Retro', icon: '⬒', kind: 'filter',
    params: [S_('preset', 'Gradient', Object.keys(GRADS).map(k => [k, k[0].toUpperCase() + k.slice(1)]).concat([['custom', 'Custom']]), 'sunset'), C_('g1', 'Shadows', '#1a0533', { when: P => P.preset === 'custom' }), C_('g2', 'Mid-tones', '#e0457b', { when: P => P.preset === 'custom' }), C_('g3', 'Highlights', '#fff2b8', { when: P => P.preset === 'custom' })],
    fn(e, x) { const P = e.P; gradMap(e, x, P.preset === 'custom' ? [[0, P.g1], [0.5, P.g2], [1, P.g3]] : GRADS[P.preset] || GRADS.sunset); },
  });
  def('duotone', {
    name: 'Duotone', cat: 'light', tags: 'Color · Minimal', icon: '◑', kind: 'filter',
    params: [C_('dark', 'Shadows', '#1b1f5e'), C_('light', 'Highlights', '#ffb38a'), R_('contrast2', 'Contrast', 0, 100, 40)],
    fn(e, x) { const k = e.P.contrast2 / 100 * 0.3; gradMap(e, x, [[0, e.P.dark], [k, e.P.dark], [1 - k, e.P.light], [1, e.P.light]]); },
  });
  def('prism', {
    name: 'Prism', cat: 'light', tags: 'Geometric · Color', icon: '✧', kind: 'filter',
    params: [R_('amount', 'Spread', 0, 100, 40), R_('angle', 'Angle', -180, 180, 30), R_('copies', 'Bands', 3, 7, 5), R_('base', 'Original', 0, 100, 35)],
    fn(e, x) {
      // the picture split into a fan of spectrum-tinted copies
      const P = e.P, D = P.amount / 100 * e.W * 0.03, a = P.angle * Math.PI / 180, n = P.copies;
      x.fillStyle = '#000'; x.fillRect(0, 0, e.W, e.H); x.globalAlpha = P.base / 100; x.drawImage(e.src, 0, 0); x.globalAlpha = 1;
      x.globalCompositeOperation = 'lighter';
      const T = []; for (let i = 0; i < n; i++) T.push(hsl2rgb(i / n, 1, 0.5));
      const sum = [0, 1, 2].map(j => T.reduce((v, c) => v + c[j], 0) / 255), ga = (1 - P.base / 100 * 0.5) / Math.max(...sum);
      for (let i = 0; i < n; i++) { const f = i / (n - 1) - 0.5; x.globalAlpha = ga; x.drawImage(tintCopy(e.src, rgbStr(...T[i])), Math.cos(a) * D * f * 2, Math.sin(a) * D * f * 2); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    },
  });
  def('dreamdust', {
    name: 'Dreamdust', cat: 'light', tags: 'Organic · Color', icon: '✵', kind: 'filter', anim: true,
    params: [R_('sparkle', 'Sparkles', 0, 100, 55), R_('size', 'Sparkle size', 1, 20, 5), R_('glow', 'Glow', 0, 100, 55), C_('tint', 'Tint', '#ffe7b8')],
    fn(e, x) {
      const P = e.P, p = e.px(0.3), L = lumOf(p), r = rng(e.seed);
      x.drawImage(e.src, 0, 0); glow(x, e.W, e.H, e.W * 0.02, P.glow / 100 * 0.7);
      x.save(); x.globalCompositeOperation = 'soft-light'; x.fillStyle = P.tint; x.globalAlpha = 0.35; x.fillRect(0, 0, e.W, e.H); x.restore();
      const N = Math.round(P.sparkle * 6 * Math.sqrt(e.W * e.H) / 1000), s = Math.max(1, P.size * e.k);
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0, tries = 0; i < N && tries < N * 8; tries++) {
        const u = r(), v = r(), l = L[((v * p.h) | 0) * p.w + ((u * p.w) | 0)]; if (r() > l * l * 1.3) continue; i++;
        const tw = 0.5 + 0.5 * Math.sin(e.t * (2 + r() * 4) + r() * TAU), X = u * e.W, Y = v * e.H, z = s * (0.4 + r()) * (0.4 + tw * 0.8);
        x.globalAlpha = 0.5 + tw * 0.5; x.fillStyle = P.tint;
        x.beginPath(); x.moveTo(X, Y - z * 2); x.lineTo(X + z * 0.3, Y - z * 0.3); x.lineTo(X + z * 2, Y); x.lineTo(X + z * 0.3, Y + z * 0.3); x.lineTo(X, Y + z * 2); x.lineTo(X - z * 0.3, Y + z * 0.3); x.lineTo(X - z * 2, Y); x.lineTo(X - z * 0.3, Y - z * 0.3); x.fill();
      }
      x.restore();
    },
  });
  def('light-wind', {
    name: 'Light Wind', cat: 'light', tags: 'Color · Organic', icon: '༄', kind: 'filter', anim: true,
    params: [R_('length', 'Streak length', 0, 100, 50), R_('angle', 'Direction', -180, 180, 0), R_('thresh', 'Catch light above', 0, 100, 55), R_('amount', 'Strength', 0, 100, 70)],
    fn(e, x) {
      // the brightest parts blown into long streaks of light
      const P = e.P, w = e.w, h = e.h, p = pix(e.src, w, h), d = p.d, th = P.thresh / 100;
      for (let i = 0; i < w * h; i++) { const o = i * 4, k = smooth(th, th + 0.2, lum(d[o], d[o + 1], d[o + 2])); d[o] *= k; d[o + 1] *= k; d[o + 2] *= k; }
      const hi = put(p), st = canvas(w, h), sx = st.getContext('2d'), D = P.length / 100 * w * 0.35, a = P.angle * Math.PI / 180, N = 18, j = 1 + 0.15 * Math.sin(e.t * 2);
      sx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < N; i++) { const f = i / N; sx.globalAlpha = (1 - f) * 0.22; sx.drawImage(hi, Math.cos(a) * D * f * j, Math.sin(a) * D * f * j); }
      x.drawImage(e.src, 0, 0); x.save(); x.globalCompositeOperation = 'screen'; x.globalAlpha = P.amount / 100; x.drawImage(st, 0, 0, e.W, e.H); x.restore();
    },
  });
  def('kaleidoscope', {
    name: 'Kaleidoscope', cat: 'light', tags: 'Color · Organic', icon: '✺', kind: 'filter', anim: true,
    params: [R_('segments', 'Segments', 2, 16, 6), R_('turn', 'Turn', 0, 360, 0), R_('zoom', 'Zoom', 30, 200, 50), ...CENTRE],
    fn(e) {
      const P = e.P, w = e.w, h = e.h, cx = w / 2, cy = h / 2, sx = w * P.cx / 100, sy = h * P.cy / 100, seg = TAU / P.segments, t0 = P.turn * Math.PI / 180 + e.t * 0.2, z = 100 / P.zoom;
      return remap(e.src, w, h, (X, Y, q) => { const dx = X - cx, dy = Y - cy, r = Math.hypot(dx, dy) * z; let a = Math.atan2(dy, dx) + t0; a = ((a % seg) + seg) % seg; if (a > seg / 2) a = seg - a; a += -Math.PI / 2 - seg / 4; q[0] = sx + Math.cos(a) * r; q[1] = sy + Math.sin(a) * r; }, 'wrap');
    },
  });
  def('warpbloom', {
    name: 'Warpbloom', cat: 'light', tags: 'Organic · Color', icon: '❃', kind: 'filter', anim: true,
    params: [R_('warp', 'Warp', 0, 100, 45), R_('petals', 'Petals', 2, 12, 5), R_('bloom', 'Bloom', 0, 100, 60), R_('sat', 'Saturation', 0, 200, 140)],
    fn(e, x) {
      const P = e.P, w = e.w, h = e.h, cx = w / 2, cy = h / 2, A = P.warp / 100 * 0.18 * Math.min(w, h);
      const c = remap(e.src, w, h, (X, Y, q) => { const dx = X - cx, dy = Y - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), k = Math.sin(a * P.petals + e.t * 0.8) * A * Math.min(1, r / (Math.min(w, h) * 0.4)); q[0] = cx + Math.cos(a) * (r + k); q[1] = cy + Math.sin(a) * (r + k); });
      x.filter = `saturate(${P.sat / 100})`; x.drawImage(c, 0, 0, e.W, e.H); x.filter = 'none';
      glow(x, e.W, e.H, e.W * 0.025, P.bloom / 100 * 0.8);
    },
  });
  def('edge-glow', {
    name: 'Edge Glow', cat: 'light', tags: 'Glitch · Color', icon: '◇', kind: 'filter',
    params: [R_('detail', 'Detail', 0, 100, 55), R_('glow', 'Glow', 0, 100, 70), S_('colorMode', 'Colour', [['image', 'From the image'], ['neon', 'Neon rainbow'], ['mono', 'One colour']], 'image'), C_('ink', 'Colour', '#3cf2ff', { when: P => P.colorMode === 'mono' }), R_('base', 'Picture underneath', 0, 100, 0)],
    fn(e, x) {
      const P = e.P, p = e.px(), w = p.w, h = p.h, E = edgeMask(p, 0.3 - P.detail / 100 * 0.25, 1.4), d = p.d, ink = hex(P.ink);
      for (let i = 0; i < w * h; i++) {
        const o = i * 4; let c;
        if (P.colorMode === 'mono') c = ink; else if (P.colorMode === 'neon') c = hsl2rgb((i % w) / w * 0.8 + ((i / w) | 0) / h * 0.3, 1, 0.6); else { const [hh, , l] = rgb2hsl(d[o], d[o + 1], d[o + 2]); c = hsl2rgb(hh, 1, Math.max(0.55, l)); }
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = E[i] * 255;
      }
      x.fillStyle = '#000'; x.fillRect(0, 0, e.W, e.H);
      if (P.base > 0) { x.globalAlpha = P.base / 100 * 0.6; x.drawImage(e.src, 0, 0); x.globalAlpha = 1; }
      x.drawImage(put(p), 0, 0, e.W, e.H);
      glow(x, e.W, e.H, e.W * 0.008, P.glow / 100, 'lighter');
    },
  });
  def('aberration', {
    name: 'Aberration', cat: 'light', tags: 'Color · Organic', icon: '◉', kind: 'filter',
    params: [R_('amount', 'Amount', 0, 100, 45), R_('bloom', 'Bloom', 0, 100, 30), ...CENTRE],
    fn(e, x) {
      // the lens focuses each colour at a slightly different size, so edges fringe towards the corners
      const P = e.P, cx = e.W * P.cx / 100, cy = e.H * P.cy / 100, k = P.amount / 100 * 0.035;
      x.fillStyle = '#000'; x.fillRect(0, 0, e.W, e.H); x.globalCompositeOperation = 'lighter';
      [['#ff0000', 1 + k], ['#00ff00', 1], ['#0000ff', 1 - k]].forEach(([c, s]) => { x.save(); x.translate(cx, cy); x.scale(s, s); x.translate(-cx, -cy); x.drawImage(tintCopy(e.src, c), 0, 0); x.restore(); });
      x.globalCompositeOperation = 'source-over';
      glow(x, e.W, e.H, e.W * 0.015, P.bloom / 100 * 0.6);
    },
  });

  /* ════════════════════════ GLASS ════════════════════════ */
  // cells around jittered points: nearest id, distance to it and to the second nearest (for the edges)
  function voro(w, h, s, seed, jit = 1) {
    const cols = Math.ceil(w / s) + 1, rows = Math.ceil(h / s) + 1, px = new Float32Array(cols * rows), py = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { const i = r * cols + q; px[i] = (q + 0.5 + (hash(q, r, seed) - 0.5) * jit) * s; py[i] = (r + 0.5 + (hash(q, r, seed + 1) - 0.5) * jit) * s; }
    const id = new Int32Array(w * h), d1 = new Float32Array(w * h), d2 = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const gq = Math.floor(x / s), gr = Math.floor(y / s); let b1 = 1e9, b2 = 1e9, bi = 0;
      for (let r = gr - 1; r <= gr + 1; r++) for (let q = gq - 1; q <= gq + 1; q++) {
        if (q < 0 || r < 0 || q >= cols || r >= rows) continue;
        const i = r * cols + q, dd = (px[i] - x) ** 2 + (py[i] - y) ** 2;
        if (dd < b1) { b2 = b1; b1 = dd; bi = i; } else if (dd < b2) b2 = dd;
      }
      const k = y * w + x; id[k] = bi; d1[k] = Math.sqrt(b1); d2[k] = Math.sqrt(b2);
    }
    return { id, d1, d2, px, py, cols, rows };
  }
  // refraction: lens(x, y, out) writes [dx, dy, light] (offset in px, light -1..1); the picture is read through it
  function glass(e, lens, o = {}) {
    const w = e.w, h = e.h, p = pix(e.src, w, h), s = o.blur ? (() => { const b = canvas(w, h), bx = b.getContext('2d'); bx.filter = `blur(${o.blur}px)`; bx.drawImage(p.c, 0, 0); return pix(b, w, h); })() : p;
    const out = pix(e.src, w, h), d = out.d, q = [0, 0, 0], c = [0, 0, 0, 0], tint = o.tint ? hex(o.tint) : null, ta = o.tintAmt ?? 0.2, hl = o.light ?? 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      q[0] = q[1] = q[2] = 0; lens(x + 0.5, y + 0.5, q);
      samp(s, x + 0.5 + q[0], y + 0.5 + q[1], c);
      const k = (y * w + x) * 4, L = q[2] * hl;
      for (let j = 0; j < 3; j++) { let v = c[j]; if (tint) v = lerp(v, v * tint[j] / 255 * 1.3, ta); d[k + j] = L > 0 ? v + (255 - v) * L : v * (1 + L); }
      d[k + 3] = c[3];
    }
    return put(out);
  }
  const GLASS_P = (s, a) => [R_('size', 'Cell size', 3, 120, s), R_('amount', 'Refraction', 0, 100, a), R_('light', 'Highlights', 0, 100, 50)];
  def('frosted-glass', {
    name: 'Frosted Glass', cat: 'glass', tags: 'Minimal · Organic', icon: '▩', kind: 'filter',
    params: [R_('amount', 'Frost', 0, 100, 55), R_('blur', 'Haze', 0, 100, 35), C_('tint', 'Tint', '#e9f3ff'), R_('tintAmt', 'Tint amount', 0, 100, 15)],
    fn(e) { const P = e.P, A = P.amount / 100 * e.w * 0.02; return glass(e, (x, y, q) => { q[0] = (hash(x | 0, y | 0, e.seed) - 0.5) * 2 * A; q[1] = (hash(x | 0, y | 0, e.seed + 3) - 0.5) * 2 * A; q[2] = 0.05; }, { blur: P.blur / 100 * e.w * 0.006, tint: P.tint, tintAmt: P.tintAmt / 100 }); },
  });
  def('tinted-glass', {
    name: 'Tinted Glass', cat: 'glass', tags: 'Color · Geometric', icon: '◈', kind: 'filter',
    params: [R_('size', 'Pane size', 6, 160, 40), R_('lead', 'Lead lines', 0, 100, 45), R_('sat', 'Colour', 0, 100, 70), R_('amount', 'Refraction', 0, 100, 30)],
    fn(e, x) {
      // stained glass: panes around random points, each tinted with its own colour, joined by dark lead
      const P = e.P, w = e.w, h = e.h, s = Math.max(4, P.size * e.k * e.ws), V = voro(w, h, s, e.seed), p = pix(e.src, w, h), d = p.d, out = pix(e.src, w, h), od = out.d, lw = s * P.lead / 100 * 0.12, c = [0, 0, 0, 0];
      const A = P.amount / 100 * s * 0.3;
      for (let i = 0; i < w * h; i++) {
        const k = V.id[i], cx = V.px[k], cy = V.py[k]; samp(p, cx, cy, c);
        const [hh, ss, ll] = rgb2hsl(c[0], c[1], c[2]), tc = hsl2rgb(hh, Math.min(1, ss + P.sat / 100 * 0.6), clamp(ll, 0.25, 0.7)), X = i % w, Y = (i / w) | 0;
        const q = samp(p, X + (X - cx) / s * A, Y + (Y - cy) / s * A, [0, 0, 0, 0]), edge = smooth(lw, lw * 0.4, V.d2[i] - V.d1[i]), o = i * 4;
        for (let j = 0; j < 3; j++) od[o + j] = lerp(lerp(q[j], tc[j], 0.55) * (1.1 - V.d1[i] / s * 0.4), 25, edge);
        od[o + 3] = d[o + 3];
      }
      x.drawImage(put(out), 0, 0, e.W, e.H);
    },
  });
  def('shatter', {
    name: 'Shatter', cat: 'glass', tags: 'Geometric · Glitch', icon: '❖', kind: 'filter',
    params: [R_('size', 'Shard size', 8, 200, 60), R_('amount', 'Scatter', 0, 100, 40), R_('cracks', 'Cracks', 0, 100, 55)],
    fn(e, x) {
      const P = e.P, w = e.w, h = e.h, s = Math.max(6, P.size * e.k * e.ws), V = voro(w, h, s, e.seed), p = pix(e.src, w, h), out = pix(e.src, w, h), od = out.d, A = P.amount / 100 * s * 0.5, c = [0, 0, 0, 0];
      for (let i = 0; i < w * h; i++) {
        const k = V.id[i], X = i % w, Y = (i / w) | 0, dx = (hash(k, 0, e.seed) - 0.5) * A, dy = (hash(k, 1, e.seed) - 0.5) * A, z = 1 + (hash(k, 2, e.seed) - 0.5) * P.amount / 100 * 0.15;
        samp(p, V.px[k] + (X - V.px[k]) * z + dx, V.py[k] + (Y - V.py[k]) * z + dy, c);
        const crack = smooth(1.4, 0.2, V.d2[i] - V.d1[i]) * P.cracks / 100, sh = 1 + (hash(k, 3, e.seed) - 0.5) * 0.25, o = i * 4;
        for (let j = 0; j < 3; j++) od[o + j] = lerp(c[j] * sh, 255, crack * 0.85);
        od[o + 3] = c[3];
      }
      x.drawImage(put(out), 0, 0, e.W, e.H);
    },
  });
  def('vitrine', {
    name: 'Vitrine', cat: 'glass', tags: 'Organic · Color', icon: '▦', kind: 'filter',
    params: GLASS_P(40, 50),
    fn(e) {
      // glass blocks: every tile shows a slightly zoomed, shifted piece of what is behind it, with bevelled edges
      const P = e.P, s = Math.max(4, P.size * e.k * e.ws), A = P.amount / 100;
      return glass(e, (x, y, q) => { const u = (x % s) / s - 0.5, v = (y % s) / s - 0.5; q[0] = -u * s * 0.5 * A; q[1] = -v * s * 0.5 * A; const ed = Math.max(Math.abs(u), Math.abs(v)); q[2] = (ed > 0.44 ? (u + v < 0 ? 0.5 : -0.5) : -v * 0.25) * P.light / 50; }, { light: 1 });
    },
  });
  def('glass-orb', {
    name: 'Glass Orb', cat: 'glass', tags: 'Color · Organic', icon: '⬤', kind: 'filter',
    params: [R_('radius', 'Orb size', 10, 100, 45), R_('amount', 'Refraction', 0, 100, 70), R_('blur', 'Background blur', 0, 100, 40), ...CENTRE],
    fn(e, x) {
      const P = e.P, w = e.w, h = e.h, cx = w * P.cx / 100, cy = h * P.cy / 100, R0 = Math.min(w, h) * P.radius / 200, b = canvas(w, h), bx = b.getContext('2d');
      bx.filter = `blur(${P.blur / 100 * w * 0.02}px) brightness(0.7)`; bx.drawImage(e.src, 0, 0, w, h);
      const orb = glass(e, (X, Y, q) => { const dx = (X - cx) / R0, dy = (Y - cy) / R0, r2 = dx * dx + dy * dy; if (r2 >= 1) { q[2] = 0; return; } const z = Math.sqrt(1 - r2), k = P.amount / 100 * 1.6; q[0] = -dx * R0 * k * (1 - z) - dx * R0 * 0.6; q[1] = -dy * R0 * k * (1 - z) - dy * R0 * 0.6; q[2] = Math.pow(Math.max(0, -dx * 0.5 - dy * 0.6 + z * 0.6), 18) * 0.9 - (1 - z) * 0.35; });
      x.drawImage(b, 0, 0, e.W, e.H);
      x.save(); x.beginPath(); x.arc(cx / w * e.W, cy / h * e.H, R0 / w * e.W, 0, TAU); x.clip(); x.drawImage(orb, 0, 0, e.W, e.H); x.restore();
    },
  });
  def('fluted-glass', {
    name: 'Fluted Glass', cat: 'glass', tags: 'Color · Organic', icon: '⦀', kind: 'filter',
    params: [...GLASS_P(18, 60), S_('dir', 'Reeds', [['v', 'Vertical'], ['h', 'Horizontal']], 'v')],
    fn(e) {
      // reeded glass: each rib squeezes and mirrors the slice behind it, lit on one side
      const P = e.P, s = Math.max(3, P.size * e.k * e.ws), A = P.amount / 100, v = P.dir === 'v';
      return glass(e, (x, y, q) => { const t = ((v ? x : y) % s) / s, u = t - 0.5, off = -u * s * 1.6 * A + Math.sin(t * Math.PI) * 0, L = (Math.cos(t * Math.PI) * 0.35 - (t > 0.92 ? 0.3 : 0)) * P.light / 50; if (v) q[0] = off; else q[1] = off; q[2] = L; });
    },
  });
  def('cross-reeded', {
    name: 'Cross Reeded', cat: 'glass', tags: 'Geometric · Dense', icon: '▦', kind: 'filter',
    params: GLASS_P(16, 55),
    fn(e) { const P = e.P, s = Math.max(3, P.size * e.k * e.ws), A = P.amount / 100; return glass(e, (x, y, q) => { const u = (x % s) / s - 0.5, v = (y % s) / s - 0.5; q[0] = -u * s * 1.3 * A; q[1] = -v * s * 1.3 * A; q[2] = (-(u + v) * 0.4 - (Math.abs(u) > 0.45 || Math.abs(v) > 0.45 ? 0.25 : 0)) * P.light / 50; }); },
  });
  def('hammered', {
    name: 'Hammered', cat: 'glass', tags: 'Organic · Dense', icon: '▨', kind: 'filter',
    params: GLASS_P(22, 55),
    fn(e) {
      const P = e.P, s = Math.max(3, P.size * e.k * e.ws), A = P.amount / 100 * s;
      return glass(e, (x, y, q) => { const n = (X, Y) => Math.abs(fbm(X / s, Y / s, e.seed, 2) - 0.5); const c = n(x, y), dx = n(x + 1, y) - c, dy = n(x, y + 1) - c; q[0] = dx * A * 12; q[1] = dy * A * 12; q[2] = clamp((-dx - dy) * 25, -0.5, 0.6) * P.light / 50; });
    },
  });
  def('diamond-glass', {
    name: 'Diamond Glass', cat: 'glass', tags: 'Geometric · Color', icon: '◆', kind: 'filter',
    params: GLASS_P(36, 55),
    fn(e) {
      const P = e.P, s = Math.max(4, P.size * e.k * e.ws), A = P.amount / 100 * s * 0.5;
      return glass(e, (x, y, q) => { const u = x / s, v = y / s, a = fract(u + v) - 0.5, b = fract(u - v) - 0.5, fu = a > 0 ? 1 : -1, fv = b > 0 ? 1 : -1; q[0] = -(fu + fv) * A * 0.5; q[1] = -(fu - fv) * A * 0.5; q[2] = (fu * 0.25 + fv * 0.15) * P.light / 50; });
    },
  });
  def('hexagon-glass', {
    name: 'Hexagon', cat: 'glass', tags: 'Geometric · Minimal', icon: '⬡', kind: 'filter',
    params: GLASS_P(30, 55),
    fn(e) {
      const P = e.P, s = Math.max(4, P.size * e.k * e.ws), A = P.amount / 100, H3 = Math.sqrt(3);
      return glass(e, (x, y, q) => {
        // nearest hex centre
        const r = s / 2, qy = y / (r * 1.5), row = Math.round(qy), cx0 = (Math.round(x / (r * H3) - (row & 1) * 0.5) + (row & 1) * 0.5) * r * H3, cy0 = row * r * 1.5;
        let bx = cx0, by = cy0, bd = 1e9;
        for (const [ox, oy] of [[0, 0], [r * H3 / 2, r * 1.5], [-r * H3 / 2, r * 1.5], [r * H3 / 2, -r * 1.5], [-r * H3 / 2, -r * 1.5], [r * H3, 0], [-r * H3, 0]]) { const d = (x - cx0 - ox) ** 2 + (y - cy0 - oy) ** 2; if (d < bd) { bd = d; bx = cx0 + ox; by = cy0 + oy; } }
        const dx = (x - bx) / r, dy = (y - by) / r; q[0] = -dx * r * A; q[1] = -dy * r * A; q[2] = (-dx * 0.3 - dy * 0.35 - (Math.sqrt(bd) / r > 0.85 ? 0.3 : 0)) * P.light / 50;
      });
    },
  });
  def('ripple-glass', {
    name: 'Ripple', cat: 'glass', tags: 'Organic · Minimal', icon: '◎', kind: 'filter', anim: true,
    params: [R_('size', 'Wave length', 3, 120, 26), R_('amount', 'Refraction', 0, 100, 55), R_('light', 'Highlights', 0, 100, 45), R_('drops', 'Drops', 1, 6, 3)],
    fn(e) {
      const P = e.P, s = Math.max(3, P.size * e.k * e.ws), A = P.amount / 100 * s * 0.4, w = e.w, h = e.h, r = rng(e.seed), C = [];
      for (let i = 0; i < P.drops; i++) C.push([r() * w, r() * h]);
      return glass(e, (x, y, q) => { let gx = 0, gy = 0; for (const [cx, cy] of C) { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) + 0.001, k = Math.cos(d / s * TAU - e.t * 3) * Math.exp(-d / (Math.min(w, h) * 0.6)); gx += dx / d * k; gy += dy / d * k; } q[0] = gx * A; q[1] = gy * A; q[2] = clamp(-(gx + gy) * 0.3, -0.4, 0.5) * P.light / 50; });
    },
  });
  def('ice-crackle', {
    name: 'Ice Crackle', cat: 'glass', tags: 'Organic · Dense', icon: '❄', kind: 'filter',
    params: [R_('size', 'Crack size', 6, 120, 30), R_('amount', 'Refraction', 0, 100, 40), R_('frost', 'Frost', 0, 100, 40), C_('tint', 'Ice tint', '#cfe9ff')],
    fn(e, x) {
      const P = e.P, w = e.w, h = e.h, s = Math.max(4, P.size * e.k * e.ws), V = voro(w, h, s, e.seed), V2 = voro(w, h, s * 0.45, e.seed + 9), p = pix(e.src, w, h), out = pix(e.src, w, h), od = out.d, A = P.amount / 100 * s * 0.25, c = [0, 0, 0, 0], tn = hex(P.tint);
      for (let i = 0; i < w * h; i++) {
        const k = V.id[i], X = i % w, Y = (i / w) | 0, f = (hash(X, Y, e.seed) - 0.5) * P.frost / 100 * 6;
        samp(p, X + (hash(k, 0, e.seed) - 0.5) * A + f, Y + (hash(k, 1, e.seed) - 0.5) * A + f, c);
        const cr = Math.max(smooth(1.2, 0.1, V.d2[i] - V.d1[i]), smooth(0.8, 0.05, V2.d2[i] - V2.d1[i]) * 0.5), o = i * 4;
        for (let j = 0; j < 3; j++) od[o + j] = lerp(lerp(c[j], tn[j], 0.18 + P.frost / 100 * 0.2), 255, cr * 0.8);
        od[o + 3] = c[3];
      }
      x.drawImage(put(out), 0, 0, e.W, e.H);
    },
  });
  def('chevron-prism', {
    name: 'Chevron Prism', cat: 'glass', tags: 'Geometric · Color', icon: '∧', kind: 'filter',
    params: [...GLASS_P(30, 60), R_('fringe', 'Rainbow fringe', 0, 100, 40)],
    fn(e, x) {
      const P = e.P, s = Math.max(4, P.size * e.k * e.ws), A = P.amount / 100 * s, w = e.w;
      const lens = sh => (X, Y, q) => { const t = fract(Y / s + Math.abs(X / w - 0.5) * w / s * 0.6), u = t - 0.5; q[1] = -u * A * (1 + sh); q[0] = (X < w / 2 ? 1 : -1) * u * A * 0.3; q[2] = (Math.cos(t * Math.PI) * 0.3) * P.light / 50; };
      const base = glass(e, lens(0));
      if (P.fringe <= 0) return base;
      x.drawImage(base, 0, 0, e.W, e.H); x.globalCompositeOperation = 'lighter'; x.globalAlpha = P.fringe / 100 * 0.35;
      x.drawImage(tintCopy(glass(e, lens(0.12)), '#ff0050'), 0, 0, e.W, e.H); x.drawImage(tintCopy(glass(e, lens(-0.12)), '#0080ff'), 0, 0, e.W, e.H);
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    },
  });
  def('seedy-bubbles', {
    name: 'Seedy Bubbles', cat: 'glass', tags: 'Organic · Minimal', icon: '⁙', kind: 'filter',
    params: [R_('count', 'Bubbles', 10, 400, 140), R_('size', 'Bubble size', 2, 60, 12), R_('amount', 'Refraction', 0, 100, 60)],
    fn(e) {
      const P = e.P, w = e.w, h = e.h, r = rng(e.seed), B = [], s = P.size * e.k * e.ws, G = Math.max(8, s * 3), cols = Math.ceil(w / G), rows = Math.ceil(h / G), grid = Array.from({ length: cols * rows }, () => []);
      for (let i = 0; i < P.count; i++) { const b = [r() * w, r() * h, s * (0.3 + r() * r() * 1.6)]; B.push(b); grid[Math.min(rows - 1, (b[1] / G) | 0) * cols + Math.min(cols - 1, (b[0] / G) | 0)].push(b); }
      return glass(e, (x, y, q) => {
        const gq = (x / G) | 0, gr = (y / G) | 0;
        for (let rr = gr - 1; rr <= gr + 1; rr++) for (let cq = gq - 1; cq <= gq + 1; cq++) {
          if (cq < 0 || rr < 0 || cq >= cols || rr >= rows) continue;
          for (const [bx, by, br] of grid[rr * cols + cq]) { const dx = (x - bx) / br, dy = (y - by) / br, d2 = dx * dx + dy * dy; if (d2 < 1) { const z = Math.sqrt(1 - d2); q[0] = dx * br * P.amount / 100 * 1.5; q[1] = dy * br * P.amount / 100 * 1.5; q[2] = (d2 > 0.75 ? -0.35 : 0) + Math.pow(Math.max(0, -dx * 0.6 - dy * 0.6 + z * 0.4), 12) * 0.9; return; } }
        }
      });
    },
  });
  def('glass-pixel', {
    name: 'Glass Pixel', cat: 'glass', tags: 'Geometric · Retro', icon: '▩', kind: 'filter',
    params: GLASS_P(22, 70),
    fn(e) { const P = e.P, s = Math.max(3, P.size * e.k * e.ws), A = P.amount / 100; return glass(e, (x, y, q) => { const u = (x % s) / s - 0.5, v = (y % s) / s - 0.5; q[0] = -u * s * A; q[1] = -v * s * A; const ed = Math.max(Math.abs(u), Math.abs(v)); q[2] = (ed > 0.42 ? -0.4 : 0) + (u < -0.2 && v < -0.2 ? 0.25 : 0) * P.light / 50; }); },
  });
  def('jello', {
    name: 'Jello', cat: 'glass', tags: 'Organic · Color', icon: '◍', kind: 'filter', anim: true,
    params: [R_('size', 'Wobble size', 5, 150, 50), R_('amount', 'Wobble', 0, 100, 50), R_('light', 'Gloss', 0, 100, 55), R_('sat', 'Juiciness', 0, 200, 140)],
    fn(e, x) {
      const P = e.P, s = Math.max(4, P.size * e.k * e.ws), A = P.amount / 100 * s * 0.4, t = e.t;
      const c = glass(e, (X, Y, q) => { const a = Math.sin(X / s * 2 + t * 2.2) + Math.sin(Y / s * 2.6 - t * 1.7), b = Math.cos(Y / s * 2.2 + t * 1.9) + Math.cos((X + Y) / s * 1.3 - t * 2.4); q[0] = a * A; q[1] = b * A; q[2] = clamp((a - b) * 0.18, -0.3, 0.45) * P.light / 50; });
      x.filter = `saturate(${P.sat / 100})`; x.drawImage(c, 0, 0, e.W, e.H); x.filter = 'none';
    },
  });

  /* ════════════════════════ MATERIAL & TEXTURE ════════════════════════ */
  def('waves', {
    name: 'Waves', cat: 'material', tags: 'Organic · Color', icon: '≈', kind: 'filter', anim: true,
    params: [R_('amount', 'Height', 0, 100, 40), R_('length', 'Wave length', 2, 100, 20), R_('shade', 'Shading', 0, 100, 40), T_('vertical', 'Vertical')],
    fn(e) {
      const P = e.P, s = Math.max(2, P.length / 100 * e.w * 0.3), A = P.amount / 100 * s * 0.5;
      return glass(e, (x, y, q) => { const u = P.vertical ? x : y, ph = u / s * TAU + e.t * 2 + Math.sin((P.vertical ? y : x) / s * 0.7) * 1.5, d = Math.sin(ph) * A; if (P.vertical) q[1] = d; else q[0] = d; q[2] = Math.cos(ph) * P.shade / 100 * 0.35; });
    },
  });
  // Kuwahara: each pixel takes the mean of whichever of its four corner windows is calmest
  function kuwahara(p, r) {
    const { w, h, d } = p, n = w * h, I = [0, 1, 2].map(() => new Float64Array((w + 1) * (h + 1))), I2 = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, k = (y + 1) * (w + 1) + x + 1, L = lum(d[o], d[o + 1], d[o + 2]);
      for (let j = 0; j < 3; j++) I[j][k] = d[o + j] + I[j][k - 1] + I[j][k - w - 1] - I[j][k - w - 2];
      I2[k] = L * L + I2[k - 1] + I2[k - w - 1] - I2[k - w - 2];
    }
    const L1 = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4, k = (y + 1) * (w + 1) + x + 1; L1[k] = lum(d[o], d[o + 1], d[o + 2]) + L1[k - 1] + L1[k - w - 1] - L1[k - w - 2]; }
    const S = (A, x0, y0, x1, y1) => A[(y1 + 1) * (w + 1) + x1 + 1] - A[y0 * (w + 1) + x1 + 1] - A[(y1 + 1) * (w + 1) + x0] + A[y0 * (w + 1) + x0];
    const o2 = new Uint8ClampedArray(d.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let best = 1e9, bc = null;
      for (const [ax, ay] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x0 = clamp(Math.min(x, x + ax * r), 0, w - 1), x1 = clamp(Math.max(x, x + ax * r), 0, w - 1), y0 = clamp(Math.min(y, y + ay * r), 0, h - 1), y1 = clamp(Math.max(y, y + ay * r), 0, h - 1), N = (x1 - x0 + 1) * (y1 - y0 + 1);
        const m = S(L1, x0, y0, x1, y1) / N, v = S(I2, x0, y0, x1, y1) / N - m * m;
        if (v < best) { best = v; bc = [S(I[0], x0, y0, x1, y1) / N, S(I[1], x0, y0, x1, y1) / N, S(I[2], x0, y0, x1, y1) / N]; }
      }
      const o = (y * w + x) * 4; o2[o] = bc[0]; o2[o + 1] = bc[1]; o2[o + 2] = bc[2]; o2[o + 3] = d[o + 3];
    }
    d.set(o2); return p;
  }
  def('oil-paint', {
    name: 'Oil Paint', cat: 'material', tags: 'Organic · Color', icon: '❋', kind: 'filter',
    params: [R_('brush', 'Brush size', 1, 20, 5), R_('texture', 'Canvas & strokes', 0, 100, 45), R_('sat', 'Saturation', 0, 200, 120)],
    fn(e, x) {
      const P = e.P, p = e.px(0.75), r = Math.max(1, Math.round(P.brush * e.k * e.ws * 0.75));
      kuwahara(p, r); e.tone(p.d);
      x.filter = `saturate(${P.sat / 100})`; x.drawImage(put(p), 0, 0, e.W, e.H); x.filter = 'none';
      if (P.texture > 0) {
        // brush-stroke relief: streaky noise, embossed and laid over the paint
        const w = p.w, h = p.h, t = pix(p.c, w, h), td = t.d;
        for (let y = 0; y < h; y++) for (let q = 0; q < w; q++) { const o = (y * w + q) * 4, a = fbm(q / (r * 3), y / (r * 1.2), e.seed, 2) - fbm((q + 1) / (r * 3), (y + 1) / (r * 1.2), e.seed, 2); const v = 128 + a * 900; td[o] = td[o + 1] = td[o + 2] = clamp(v, 0, 255); td[o + 3] = 255; }
        x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = P.texture / 100 * 0.6; x.drawImage(put(t), 0, 0, e.W, e.H); x.restore();
      }
    },
  });
  def('watercolor', {
    name: 'Watercolor', cat: 'material', tags: 'Organic · Color', icon: '❍', kind: 'filter',
    params: [R_('wash', 'Wash', 0, 100, 55), R_('edges', 'Pigment edges', 0, 100, 55), R_('grain', 'Paper grain', 0, 100, 45), C_('paper', 'Paper', '#f8f4ec')],
    fn(e, x) {
      const P = e.P, p = e.px(0.6), w = p.w, h = p.h, d = p.d, n = w * h, pc = hex(P.paper);
      kuwahara(p, Math.max(1, Math.round(P.wash / 100 * 6 + 1)));
      const L = lumOf(p), B = blur3(L, w, h, 3);
      for (let i = 0; i < n; i++) {
        const o = i * 4, q = i % w, y = (i / w) | 0, edge = clamp((B[i] - L[i]) * 6, 0, 1) * P.edges / 100, gr = (fbm(q / 6, y / 6, e.seed, 3) - 0.5) * P.grain / 100;
        const lift = smooth(0.55, 0.95, L[i]);
        for (let j = 0; j < 3; j++) { let v = lerp(d[o + j], pc[j], lift * 0.55 + 0.12); v = v * (1 - edge * 0.5) * (1 + gr * 0.5); d[o + j] = v * (pc[j] / 255); }
        d[o + 3] = 255;
      }
      x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  def('chrome', {
    name: 'Chrome', cat: 'material', tags: 'Color · Geometric', icon: '◐', kind: 'filter',
    params: [R_('bands', 'Reflections', 1, 10, 3), R_('smooth', 'Smoothness', 0, 20, 6), C_('dark', 'Shadow', '#0b1a3a'), C_('light', 'Sheen', '#f2f7ff'), R_('tintAmt', 'Image colour', 0, 100, 15)],
    fn(e, x) {
      const P = e.P, p = e.px(), w = p.w, h = p.h, L = blur3(lumOf(p), w, h, P.smooth * e.ws * e.k + 0.5), d = p.d, lut = ramp([[0, P.dark], [0.45, '#5a6f96'], [0.7, P.light], [0.85, '#a9b9d6'], [1, '#ffffff']]);
      for (let i = 0; i < w * h; i++) { const o = i * 4, v = (clamp(0.5 - 0.5 * Math.cos(e.map(L[i]) * Math.PI * P.bands), 0, 1) * 255) | 0; for (let j = 0; j < 3; j++) d[o + j] = lerp(lut[v * 3 + j], d[o + j], P.tintAmt / 100); }
      x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  def('thin-film', {
    name: 'Thin-Film', cat: 'material', tags: 'Color · Organic', icon: '◍', kind: 'filter', anim: true,
    params: [R_('bands', 'Film thickness', 1, 10, 3), R_('amount', 'Iridescence', 0, 100, 70), R_('noise', 'Swirl', 0, 100, 40)],
    fn(e, x) {
      const P = e.P, p = e.px(), w = p.w, h = p.h, L = blur3(lumOf(p), w, h, 2), d = p.d;
      for (let i = 0; i < w * h; i++) {
        const o = i * 4, q = i % w, y = (i / w) | 0, hue = L[i] * P.bands + (fbm(q / w * 3, y / h * 3 + e.t * 0.05, e.seed, 3) - 0.5) * P.noise / 25 + e.t * 0.04;
        const c = hsl2rgb(hue, 0.9, 0.5 + L[i] * 0.2), a = P.amount / 100;
        for (let j = 0; j < 3; j++) d[o + j] = lerp(d[o + j], 255 - (255 - c[j]) * (255 - d[o + j]) / 255, a);
      }
      x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  def('marble', {
    name: 'Marble', cat: 'material', tags: 'Organic · Color', icon: '❖', kind: 'filter',
    params: [R_('veins', 'Veins', 0, 100, 55), R_('scale', 'Scale', 10, 200, 70), R_('stone', 'Stone colour', 0, 100, 45), C_('vein', 'Vein colour', '#3a2f4a')],
    fn(e, x) {
      const P = e.P, p = e.px(0.6), w = p.w, h = p.h, d = p.d, vc = hex(P.vein), sc = P.scale / 100;
      for (let i = 0; i < w * h; i++) {
        const o = i * 4, q = i % w / w * 4 / sc, y = ((i / w) | 0) / w * 4 / sc, tb = fbm(q, y, e.seed, 5), v = Math.pow(Math.abs(Math.sin((q + y * 0.6 + tb * 3.2) * Math.PI)), 0.25 + (1 - P.veins / 100) * 2);
        const L = lum(d[o], d[o + 1], d[o + 2]), st = P.stone / 100;
        for (let j = 0; j < 3; j++) { const base = lerp(d[o + j], 200 + L * 55, st); d[o + j] = lerp(vc[j], base, v); }
      }
      x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  def('molten-metal', {
    name: 'Molten Metal', cat: 'material', tags: 'Organic · Color', icon: '◈', kind: 'filter', anim: true,
    params: [R_('heat', 'Heat', 0, 100, 60), R_('flow', 'Flow', 0, 100, 45), R_('glow', 'Glow', 0, 100, 55)],
    fn(e, x) {
      const P = e.P, w = e.w, h = e.h, A = P.flow / 100 * Math.min(w, h) * 0.04, s = Math.min(w, h) * 0.12;
      const c = remap(e.src, w, h, (X, Y, q) => { q[0] = X + (fbm(X / s, Y / s - e.t * 0.3, e.seed, 3) - 0.5) * A * 2; q[1] = Y + (fbm(X / s + 3, Y / s - e.t * 0.3, e.seed + 2, 3) - 0.5) * A * 2; });
      const p = pix(c, w, h), d = p.d, lut = ramp([[0, '#090202'], [0.3, '#4a0c04'], [0.55, '#c2350a'], [0.75, '#ff8a1c'], [0.9, '#ffd36b'], [1, '#fffbe8']]), k = 0.6 + P.heat / 100 * 0.8;
      for (let i = 0; i < w * h; i++) { const o = i * 4, v = (clamp(Math.pow(e.map(lum(d[o], d[o + 1], d[o + 2])), 1 / k), 0, 1) * 255) | 0; d[o] = lut[v * 3]; d[o + 1] = lut[v * 3 + 1]; d[o + 2] = lut[v * 3 + 2]; }
      x.drawImage(put(p), 0, 0, e.W, e.H); glow(x, e.W, e.H, e.W * 0.012, P.glow / 100 * 0.8, 'screen');
    },
  });
  def('crystallize', {
    name: 'Crystallize', cat: 'material', tags: 'Geometric · Color', icon: '◈', kind: 'filter',
    params: [R_('size', 'Crystal size', 4, 160, 34), R_('edges', 'Edges', 0, 100, 20), R_('facet', 'Facet shading', 0, 100, 30)],
    fn(e, x) {
      const P = e.P, w = e.w, h = e.h, s = Math.max(3, P.size * e.k * e.ws), V = voro(w, h, s, e.seed), p = pix(e.src, w, h), out = pix(e.src, w, h), od = out.d, c = [0, 0, 0, 0];
      e.tone(p.d);
      for (let i = 0; i < w * h; i++) {
        const k = V.id[i]; samp(p, V.px[k], V.py[k], c);
        const ed = smooth(1.2, 0.2, V.d2[i] - V.d1[i]) * P.edges / 100, f = 1 + (V.d1[i] / s - 0.35) * -P.facet / 100 * 0.6, o = i * 4;
        for (let j = 0; j < 3; j++) od[o + j] = lerp(c[j] * f, 0, ed);
        od[o + 3] = c[3];
      }
      x.drawImage(put(out), 0, 0, e.W, e.H);
    },
  });
  def('emboss', {
    name: 'Emboss', cat: 'material', tags: 'Mono · Geometric', icon: '◪', kind: 'filter',
    params: [R_('depth', 'Depth', 0, 100, 55), R_('angle', 'Light angle', -180, 180, -45), R_('colour', 'Keep colour', 0, 100, 0)],
    fn(e, x) {
      const P = e.P, p = e.px(), w = p.w, h = p.h, L = blur3(lumOf(p), w, h, 0.8), d = p.d, a = P.angle * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), k = P.depth / 100 * 6;
      for (let y = 0; y < h; y++) for (let q = 0; q < w; q++) {
        const i = y * w + q, gx = L[y * w + Math.min(w - 1, q + 1)] - L[y * w + Math.max(0, q - 1)], gy = L[Math.min(h - 1, y + 1) * w + q] - L[Math.max(0, y - 1) * w + q];
        const v = clamp(0.5 + (gx * ca + gy * sa) * k, 0, 1) * 255, o = i * 4;
        for (let j = 0; j < 3; j++) d[o + j] = lerp(v, d[o + j] * (v / 128), P.colour / 100);
      }
      x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  def('petrol-sheen', {
    name: 'Petrol Sheen', cat: 'material', tags: 'Color · Organic', icon: '◉', kind: 'filter', anim: true,
    params: [R_('amount', 'Sheen', 0, 100, 55), R_('scale', 'Swirl size', 10, 200, 80), R_('bands', 'Rainbow bands', 1, 8, 3)],
    fn(e, x) {
      const P = e.P, p = e.px(0.7), w = p.w, h = p.h, d = p.d, sc = P.scale / 100;
      for (let i = 0; i < w * h; i++) {
        const o = i * 4, q = i % w / w * 3 / sc, y = ((i / w) | 0) / w * 3 / sc, L = lum(d[o], d[o + 1], d[o + 2]);
        const n = fbm(q + e.t * 0.04, y, e.seed, 4), c = hsl2rgb(n * P.bands + L * 0.6, 0.85, 0.55), m = P.amount / 100 * (0.3 + 0.7 * smooth(0.25, 0.85, L));
        for (let j = 0; j < 3; j++) { const ov = d[o + j] < 128 ? 2 * d[o + j] * c[j] / 255 : 255 - 2 * (255 - d[o + j]) * (255 - c[j]) / 255; d[o + j] = lerp(d[o + j], ov, m); }
      }
      x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  def('heat-tint', {
    name: 'Heat Tint', cat: 'material', tags: 'Color', icon: '◆', kind: 'filter',
    params: [R_('shift', 'Temper', 0, 100, 45), R_('keep', 'Keep detail', 0, 100, 30)],
    fn(e, x) {
      // the straw-bronze-purple-blue bands of tempered steel, run along the picture's brightness
      const P = e.P, p = e.px(), d = p.d, lut = ramp([[0, '#05071a'], [0.3, '#1a2a9a'], [0.5, '#3d5cff'], [0.65, '#7a4fd8'], [0.8, '#c88a4c'], [0.92, '#f4dc8a'], [1, '#ffffff']]), sh = P.shift / 100 * 0.3;
      for (let i = 0; i < p.w * p.h; i++) { const o = i * 4, L = e.map(lum(d[o], d[o + 1], d[o + 2])), v = (clamp(L * (1 - sh) + sh * 0.2, 0, 1) * 255) | 0; for (let j = 0; j < 3; j++) d[o + j] = lerp(lut[v * 3 + j], lut[v * 3 + j] * (0.5 + L), P.keep / 100); }
      x.drawImage(put(p), 0, 0, e.W, e.H);
    },
  });
  /* @more */

  ST._h = { canvas, pix, put, lumOf, boxBlur, blur3, sobel, remap, samp, cells, colorize, rng, hash, vnoise, fbm, hex, ramp, hsl2rgb, rgb2hsl, clamp, lerp, fract, smooth, nearest, palOf, atlas, drawGlyphs };
  window.StudioStyles = ST;
})();
