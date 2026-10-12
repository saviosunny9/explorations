/* Collage Studio — panels, inspector, popovers and dialogs. */
(function () {
  'use strict';

  const S = window.Studio, R = window.StudioRender, F = window.StudioFonts;
  const $ = (q, r = document) => r.querySelector(q);
  const $$ = (q, r = document) => [...r.querySelectorAll(q)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ───────────────────────── icons ───────────────────────── */

  const ICONS = {
    plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
    sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4', drop: 'M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z',
    blend: 'M9.5 15.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM14.5 19.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z',
    move: 'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3',
    home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
    target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
    undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11', redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
    grid: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM3 9h18M3 15h18M9 3v18M15 3v18',
    magnet: 'M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4zM6 8h4M14 8h4',
    guides: 'M12 3v18M3 12h18M8 8h8v8H8z',
    resize: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
    help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.2a2.5 2.5 0 0 1 4.9.6c0 1.7-2.4 2.1-2.4 3.7M12 17h.01',
    folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14', upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
    layout: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM3 9h18M9 21V9',
    type: 'M5 7V5h14v2M12 5v14M9 19h6',
    sticker: 'M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5zM15 3v4a2 2 0 0 0 2 2h4M8.5 13h.01M15.5 13h.01M9.5 16.5s1 1 2.5 1 2.5-1 2.5-1',
    shapes: 'M7 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM14 14h7v7h-7zM17.5 3 21 9h-7z',
    image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM21 15l-5-5L5 21',
    calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01',
    palette: 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 21 9.8C21 6 17 3 12 3zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
    layers: 'M12 3 2 8l10 5 10-5zM2 16l10 5 10-5M2 12l10 5 10-5',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
    lock: 'M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V7a4 4 0 0 1 8 0v4',
    unlock: 'M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V7a4 4 0 0 1 7.9-1',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    copy: 'M11 9h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
    front: 'M4 14V5a1 1 0 0 1 1-1h9M9.5 8h9A1.5 1.5 0 0 1 20 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 8 18.5v-9A1.5 1.5 0 0 1 9.5 8z',
    back: 'M5.5 4h9A1.5 1.5 0 0 1 16 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 14.5v-9A1.5 1.5 0 0 1 5.5 4zM20 10v9a1 1 0 0 1-1 1h-9',
    forward: 'M12 19V5M6 11l6-6 6 6', backward: 'M12 5v14M6 13l6 6 6-6',
    alignL: 'M4 4v16M8 6h12v4H8zM8 14h7v4H8z', alignC: 'M12 4v16M6 6h12v4H6zM8 14h8v4H8z', alignR: 'M20 4v16M4 6h12v4H4zM9 14h7v4H9z',
    alignT: 'M4 4h16M6 8h4v12H6zM14 8h4v7h-4z', alignM: 'M4 12h16M6 6h4v12H6zM14 8h4v8h-4z', alignB: 'M4 20h16M6 4h4v12H6zM14 9h4v7h-4z',
    distH: 'M4 4v16M20 4v16M10 7h4v10h-4z', distV: 'M4 4h16M4 20h16M7 10h10v4H7z',
    flipH: 'M12 3v18M16 7l5 5-5 5zM8 7l-5 5 5 5z', flipV: 'M3 12h18M7 16l5 5 5-5zM7 8l5-5 5 5z',
    crop: 'M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2',
    replace: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    tl: 'M4 6h16M4 12h10M4 18h14', tc: 'M4 6h16M7 12h10M5 18h14', tr: 'M4 6h16M10 12h10M6 18h14',
    italic: 'M19 4h-9M14 20H5M15 4 9 20', underline: 'M6 4v6a6 6 0 0 0 12 0V4M4 20h16', strike: 'M16 4H9a3 3 0 0 0-2.8 4M14 12a4 4 0 0 1 0 8H6M4 12h16',
    upper: 'M3 18 7 6l4 12M4.5 14h5M13 18l4-12 4 12M14.5 14h5',
    x: 'M6 6l12 12M18 6 6 18', edit: 'M4 20h4L19 9l-4-4L4 16z', check: 'M5 12l5 5 9-11',
    sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
    wand: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5',
    eraser: 'M7 21h10M5.6 13.4l7-7a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L12.4 19H8.6l-3-3a1.8 1.8 0 0 1 0-2.6zM9 10l6 6',
    play: 'M7 4.5v15l12.5-7.5z', pause: 'M8 5v14M16 5v14',
    film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4',
    square: 'M5 5h14v14H5z', circle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', stop: 'M6 6h12v12H6z',
    shuffle: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
    bgimg: 'M3 15l6-6 4 4 3-3 5 5M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    paste: 'M9 4h6v3H9zM15 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2',
    chevDown: 'M6 9l6 6 6-6', chevRight: 'M9 6l6 6-6 6', chevLeft: 'M15 6l-6 6 6 6',
    cursor: 'M5 3l14 7-6.5 1.8L10.5 19z', hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6.5a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6.5 7-2.8 0-4.3-1.4-5.8-3.8L3.3 13.6a1.5 1.5 0 0 1 2.4-1.7L8 14.5',
    path: 'M3 17c3-7 6-9 9-5s6 3 9-5', sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  };
  const FILLED_DOTS = new Set(['more']);
  function icon(name) {
    const d = ICONS[name] || '';
    const sw = FILLED_DOTS.has(name) ? 3.2 : 1.8;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  }
  function hydrateIcons(root = document) { $$('i[data-icon]', root).forEach(i => { if (!i.firstChild) i.innerHTML = icon(i.dataset.icon); }); }

  /* ───────────────────────── tiny DOM helper ───────────────────────── */

  function h(tag, attrs, ...kids) {
    const [t, ...cls] = tag.split('.');
    const el = document.createElement(t || 'div');
    if (cls.length) el.className = cls.join(' ');
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
    return el;
  }
  const ic = name => h('i', { 'data-icon': name, html: icon(name) });

  function toast(msg, action) {
    const t = $('#toast');
    t.replaceChildren(String(msg));
    if (action) t.append(h('button.toast-act', { type: 'button', onclick: () => { t.classList.remove('show'); action.run(); } }, action.label));
    t.classList.toggle('has-act', !!action);
    t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), action ? 5000 : 2200);
  }
  S.on('toast', toast);

  /* ───────────────────────── palettes ───────────────────────── */

  const PALETTE = [
    '#1d1b18', '#4a4640', '#8c877c', '#d3cec3', '#f6f1e7', '#ffffff', '#efe6d2', '#c8a97e',
    '#2f5d50', '#1f5a4a', '#7fa88a', '#b9d7a8', '#d7ef5a', '#c8d64a', '#9ab83e', '#5f7a2e',
    '#f7d046', '#ffb547', '#ff8a3d', '#f2542d', '#e84a5f', '#ff7ab6', '#f7b4c8', '#ffd6e0',
    '#c9b6f2', '#9b8cf2', '#6c5ce7', '#3b4cca', '#1f3fd1', '#5aa9e6', '#9ad1f5', '#7bd3c4',
  ];
  const GRADIENTS = [
    ['#ff8a3d', '#ff7ab6', 'linear', 135], ['#f7d046', '#ff8a3d', 'linear', 180], ['#9ad1f5', '#c9b6f2', 'linear', 160],
    ['#e9e3ff', '#c9b6f2', 'radial', 0], ['#d7ef5a', '#7bd3c4', 'linear', 135], ['#1f3fd1', '#6c5ce7', 'linear', 160],
    ['#fff6e5', '#ffd6e0', 'radial', 0], ['#1d1b18', '#4b3f72', 'linear', 180], ['#ffefd6', '#f7b4c8', 'linear', 200],
    ['#b9d7a8', '#2f5d50', 'linear', 180], ['#ff7ab6', '#6c5ce7', 'linear', 120], ['#fef9ef', '#e8dcc4', 'radial', 0],
  ];

  function docColors() {
    const set = new Set();
    const add = c => { if (c && typeof c === 'string' && !/^rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') set.add(c.toLowerCase()); };
    add(S.doc.background.color);
    for (const el of S.doc.elements) {
      add(el.fill); add(el.color); add(el.accent); add(el.textColor); add(el.stroke && el.stroke.color); add(el.bg && el.bg.style !== 'none' && el.bg.color);
      if (el.colors) el.colors.forEach(add);
    }
    return [...set].slice(0, 16);
  }

  /* ───────────────────────── color utils ───────────────────────── */

  const cx = document.createElement('canvas').getContext('2d');
  function parseColor(c) {
    if (!c || c === 'transparent') return { hex: '#ffffff', a: 0 };
    cx.fillStyle = '#000'; cx.fillStyle = c;
    const v = cx.fillStyle;
    if (v[0] === '#') return { hex: v, a: 1 };
    const m = v.match(/rgba?\(([^)]+)\)/);
    if (!m) return { hex: '#000000', a: 1 };
    const p = m[1].split(',').map(parseFloat);
    const hex = '#' + p.slice(0, 3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
    return { hex, a: p[3] ?? 1 };
  }
  function toColor(hex, a) {
    if (a >= 0.999) return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${Math.round(a * 100) / 100})`;
  }

  /* ───────────────────────── popovers ───────────────────────── */

  let openPop = null;
  function closePop() { if (openPop) { const p = openPop; openPop = null; p.el.remove(); p.onClose && p.onClose(); } }
  function popover(anchor, content, opts = {}) {
    closePop();
    const el = h('div.pop' + (opts.cls ? '.' + opts.cls : ''), null, content);
    $('#popover-root').append(el);
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y, width: 0 };
    const pw = el.offsetWidth, ph = el.offsetHeight;
    let x = opts.side === 'left' ? r.left - pw - 8 : r.left;
    let y = r.bottom + 6;
    if (opts.at) { x = opts.at.x; y = opts.at.y; }
    if (x + pw > innerWidth - 8) x = innerWidth - pw - 8;
    if (y + ph > innerHeight - 8) y = Math.max(8, (opts.at ? opts.at.y : r.top) - ph - 6);
    el.style.left = Math.max(8, x) + 'px'; el.style.top = Math.max(8, y) + 'px';
    openPop = { el, onClose: opts.onClose, anchor };
    return el;
  }
  document.addEventListener('mousedown', e => {
    if (openPop && !openPop.el.contains(e.target) && !(openPop.anchor && openPop.anchor.contains && openPop.anchor.contains(e.target))) closePop();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openPop) { closePop(); e.stopPropagation(); } }, true);

  function colorPopover(anchor, value, onPick, opts = {}) {
    let { hex, a } = parseColor(value);
    let committed = false;
    const emitC = live => onPick(a === 0 && opts.allowNone ? 'transparent' : toColor(hex, a), live);
    const hexIn = h('input', { type: 'text', value: hex });
    const native = h('input', { type: 'color', value: hex });
    const alpha = h('input', { type: 'range', min: 0, max: 100, value: Math.round(a * 100) });
    const alphaLbl = h('span', null, Math.round(a * 100) + '%');
    const sync = () => { hexIn.value = hex; native.value = hex; alpha.value = Math.round(a * 100); alphaLbl.textContent = Math.round(a * 100) + '%'; $$('.pal button', el).forEach(b => b.classList.toggle('on', b.dataset.c === hex && a === 1)); };
    const swatch = c => h('button', { 'data-c': c, title: c, style: { background: c }, onclick: () => { hex = c; a = 1; sync(); emitC(false); committed = true; } });
    const kids = [h('div.pal', null, PALETTE.map(swatch))];
    const dc = docColors().filter(c => c[0] === '#' && !PALETTE.includes(c));
    if (dc.length) kids.push(h('h4', null, 'In this design'), h('div.pal', null, dc.map(swatch)));
    const row = h('div.hexrow', null, native, hexIn);
    if (window.EyeDropper) row.append(h('button.btn.icon', { title: 'Pick from screen', onclick: async () => { try { const r = await new window.EyeDropper().open(); hex = r.sRGBHex; a = 1; sync(); emitC(false); } catch (e) { /* cancelled */ } } }, ic('sparkle')));
    if (opts.allowNone) row.append(h('button.btn', { title: 'No colour', onclick: () => { a = 0; sync(); emitC(false); } }, 'None'));
    kids.push(row, h('div.alpha', null, 'Opacity', alpha, alphaLbl));
    const el = popover(anchor, kids, { onClose: () => { if (!committed) emitC(false); } });
    native.addEventListener('input', () => { hex = native.value; if (a === 0) a = 1; sync(); emitC(true); committed = false; });
    native.addEventListener('change', () => { emitC(false); committed = true; });
    hexIn.addEventListener('change', () => { const p = parseColor(hexIn.value.trim()); hex = p.hex; a = p.a || 1; sync(); emitC(false); committed = true; });
    alpha.addEventListener('input', () => { a = alpha.value / 100; alphaLbl.textContent = alpha.value + '%'; emitC(true); committed = false; });
    alpha.addEventListener('change', () => { emitC(false); committed = true; });
    sync();
    committed = true;
  }

  const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };
  let fontCat = 'All';
  function fontPopover(anchor, current, onPick) {
    const search = h('input.search', { placeholder: 'Search 120+ fonts', type: 'text' });
    const chips = h('div.chips');
    const list = h('div.font-list');
    const upload = h('button.btn', { style: { marginTop: '8px', width: '100%' }, title: 'Add .otf, .ttf, .woff, .woff2 files or a .zip of them', onclick: () => pickFonts(fam => { draw(); if (fam) { onPick(fam); closePop(); } }) }, ic('upload'), 'Upload your own fonts');
    const draw = () => {
      const cats = ['All', ...(F.customFamilies().length ? [F.CUSTOM_CAT] : []), ...F.CATEGORIES];
      if (!cats.includes(fontCat)) fontCat = 'All';
      chips.replaceChildren(...cats.map(c => h('button.chip' + (c === fontCat ? '.on' : ''), { onclick: () => { fontCat = c; draw(); } }, c)));
      const q = search.value.trim().toLowerCase();
      const items = F.FONTS.filter(f => (fontCat === 'All' || f.cat === fontCat) && (!q || f.family.toLowerCase().includes(q)));
      list.replaceChildren(...items.map(f => h('button.font-item' + (f.family === current ? '.on' : ''), {
        style: { fontFamily: `"${f.family}", ${f.cat === 'Serif' ? 'serif' : 'sans-serif'}` },
        onclick: () => { onPick(f.family); closePop(); },
      }, h('span', null, f.family), h('small', null, f.cat + (f.weights.length > 1 ? ' · ' + f.weights.length : ''),
        f.custom ? h('span.font-del', { title: `Remove ${f.family} from this browser`, onclick: async e => { e.stopPropagation(); await F.removeFamily(f.family); toast(`Removed ${f.family}`); draw(); } }, ' ✕') : null))));
      if (!items.length) list.append(h('div.hint', { style: { padding: '12px' } }, 'No fonts match.'));
    };
    search.addEventListener('input', draw);
    draw();
    popover(anchor, [search, chips, list, upload], { cls: 'font-pop', side: anchor.closest && anchor.closest('.inspector') ? 'left' : undefined });
    setTimeout(() => { search.focus(); const on = $('.font-item.on', list); if (on) on.scrollIntoView({ block: 'center' }); }, 0);
  }

  // font upload: files or zips → registered in this browser only
  function pickFonts(done) {
    const inp = h('input', { type: 'file', accept: '.otf,.ttf,.woff,.woff2,.zip,font/*,application/zip', multiple: true, hidden: true });
    document.body.append(inp);
    inp.addEventListener('change', async () => {
      const files = [...inp.files];
      inp.remove();
      if (!files.length) return;
      toast('Adding fonts…');
      try {
        const { families, skipped } = await F.importFonts(files);
        const names = Object.keys(families);
        if (!names.length) { toast('No usable fonts found — use .otf, .ttf, .woff or .woff2 files'); done && done(null); return; }
        R.fontsVersion++; R.requestRedraw();
        fontCat = F.CUSTOM_CAT;
        toast(`Added ${names.map(n => `${n} (${families[n]} style${families[n] > 1 ? 's' : ''})`).join(', ')}${skipped ? ` · ${skipped} file${skipped > 1 ? 's' : ''} skipped` : ''}`);
        done && done(names.length === 1 ? names[0] : null);
        if (tab === 'text') renderPanel();
      } catch (err) { console.error(err); toast('Couldn’t read those font files'); }
    });
    inp.click();
  }
  S.pickFonts = pickFonts;

  function menu(at, items) {
    const kids = items.map(it => it === '-' ? h('hr') : h('button', { onclick: () => { closePop(); it.run(); }, disabled: it.disabled }, ic(it.icon || 'plus'), it.label, it.kbd ? h('kbd', null, it.kbd) : null));
    popover(at.nodeType ? at : { getBoundingClientRect: () => ({ left: at.x, right: at.x, top: at.y, bottom: at.y }) }, kids, { cls: 'menu', at: at.nodeType ? null : at });
  }

  /* ───────────────────────── modals ───────────────────────── */

  function modal(content, opts = {}) {
    closeModal();
    const box = h('div.modal' + (opts.small ? '.small' : ''), null,
      opts.closable === false ? null : h('button.modal-x', { onclick: closeModal, title: 'Close' }, ic('x')), content);
    const back = h('div.modal-back', { onmousedown: e => { if (e.target === back && opts.closable !== false) closeModal(); } }, box);
    $('#modal-root').append(back);
    const esc = e => { if (e.key === 'Escape' && opts.closable !== false) closeModal(); };
    document.addEventListener('keydown', esc);
    back._esc = esc;
    return box;
  }
  function closeModal() {
    const b = $('.modal-back');
    if (b) { document.removeEventListener('keydown', b._esc); b.remove(); }
  }
  function confirmBox(title, body, okLabel, onOk) {
    modal([h('h1', { style: { fontSize: '20px' } }, title), h('p.lead', null, body),
      h('div.btn-row', null, h('button.btn', { onclick: closeModal }, 'Cancel'), h('button.btn.primary', { onclick: () => { closeModal(); onOk(); } }, okLabel))], { small: true });
  }

  /* ───────────────────────── thumbnails ───────────────────────── */

  const thumbCache = new Map();
  async function docThumb(key, docObj, width = 260) {
    if (thumbCache.has(key)) return thumbCache.get(key);
    const p = (async () => {
      await R.preload(docObj);
      const s = width / docObj.width;
      const c = R.renderDoc(docObj, { scale: s });
      return c;
    })();
    thumbCache.set(key, p);
    return p;
  }
  function prepDoc(d) {
    const dd = S.clone(d);
    dd.elements = (dd.elements || []).map(e => { const full = S.deepMerge(S.deepMerge(S.clone(baseFor(e.type)), {}), e); if (!full.id) full.id = S.uid(); S.autosize(full, false); return full; });
    dd.background = S.deepMerge(S.blankDoc(dd.width, dd.height, '#fff').background, dd.background || {});
    dd.overlay = S.deepMerge(S.blankDoc(1, 1, '#fff').overlay, dd.overlay || {});
    return dd;
  }
  function baseFor(type) { const e = S.mk(type); delete e.id; return e; }

  function elThumb(el, maxW, maxH, pad = 4) {
    const c = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = el.width + pad * 2, bh = el.height + pad * 2;
    const s = Math.min(maxW / bw, maxH / bh);
    c.width = Math.ceil(bw * s * dpr); c.height = Math.ceil(bh * s * dpr);
    c.style.width = Math.ceil(bw * s) + 'px';
    const draw = () => {
      const ctx = c.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.scale(s * dpr, s * dpr); ctx.translate(pad, pad);
      R.drawElement(ctx, el, {});
    };
    draw();
    R.preload({ elements: [el] }).then(() => { if (el.type === 'text') S.autosize(el, false); draw(); });
    return c;
  }

  /* ───────────────────────── controls ───────────────────────── */

  let bindings = [];
  function val(t, path) { return t === 'doc' ? S.getPath(S.doc, path) : S.getPath(S.selEls()[0] || {}, path); }
  function refreshValues() { for (const b of bindings) { try { b(); } catch (e) { /* control gone */ } } }
  S.on('values', refreshValues);

  function decimals(step) { const s = String(step); return s.includes('.') ? s.split('.')[1].length : 0; }
  function num(t, path, o = {}) {
    const scale = o.scale || 1, step = o.step || 1;
    const get = () => { const v = o.get ? o.get() : val(t, path); return (v == null ? (o.def ?? 0) : v) * scale; };
    const set = (v, live) => {
      if (o.min != null) v = Math.max(o.min, v);
      if (o.max != null && !o.soft) v = Math.min(o.max, v);
      if (o.set) o.set(v / scale, live); else S.change(t, path, v / scale, live);
    };
    const inp = h('input', { type: 'text', inputmode: 'decimal', 'aria-label': o.label || path });
    const lbl = o.label ? h('span.lbl', { title: 'Drag to adjust' }, o.label) : null;
    const box = h('div.num' + (o.small ? '.small' : ''), null, lbl, inp, o.unit ? h('span.unit', null, o.unit) : null);
    let slider = null;
    if (o.slider) slider = h('input.slider', { type: 'range', min: o.min ?? 0, max: o.max ?? 100, step, 'aria-label': o.label || path });
    const fmt = v => (Math.round(v * 10 ** decimals(step)) / 10 ** decimals(step)).toString();
    const upd = () => {
      const v = get();
      if (document.activeElement !== inp) inp.value = fmt(v);
      if (slider && document.activeElement !== slider) slider.value = v;
    };
    inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (!isNaN(v)) set(v, false); upd(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const v = (parseFloat(inp.value) || 0) + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
        set(v, false); inp.value = fmt(clamp(v, o.min ?? -Infinity, o.max ?? Infinity));
      }
      if (e.key === 'Enter') inp.blur();
    });
    if (slider) {
      slider.addEventListener('input', () => { set(parseFloat(slider.value), true); inp.value = fmt(parseFloat(slider.value)); });
      slider.addEventListener('change', () => set(parseFloat(slider.value), false));
    }
    if (lbl) {
      lbl.addEventListener('pointerdown', e => {
        e.preventDefault();
        const x0 = e.clientX, v0 = get();
        lbl.setPointerCapture(e.pointerId);
        const mv = ev => { const v = v0 + Math.round((ev.clientX - x0) / 2) * step; set(v, true); inp.value = fmt(clamp(v, o.min ?? -Infinity, o.max ?? Infinity)); };
        const up = () => { lbl.removeEventListener('pointermove', mv); lbl.removeEventListener('pointerup', up); set(parseFloat(inp.value), false); };
        lbl.addEventListener('pointermove', mv); lbl.addEventListener('pointerup', up);
      });
    }
    bindings.push(upd); upd();
    return h('div.ctl', null, slider, box);
  }
  function colorCtl(t, path, o = {}) {
    const sw = h('span');
    const code = h('code');
    const btn = h('button.swatch-btn', { type: 'button' }, h('span.sw', null, sw), code);
    const upd = () => { const v = val(t, path) ?? o.def; sw.style.background = v || 'transparent'; code.textContent = (!v || v === 'transparent') ? 'None' : (v[0] === '#' ? v.toUpperCase() : v); };
    btn.addEventListener('click', () => colorPopover(btn, val(t, path) ?? o.def, (v, live) => (o.set ? o.set(v, live) : S.change(t, path, v, live)), o));
    bindings.push(upd); upd();
    return btn;
  }
  function selectCtl(t, path, options, o = {}) {
    const s = h('select.sel', { 'aria-label': o.label || path }, options.map(([v, l]) => h('option', { value: String(v) }, l)));
    const upd = () => { if (document.activeElement !== s) s.value = String(val(t, path) ?? o.def ?? ''); };
    s.addEventListener('change', () => { let v = s.value; if (o.number) v = parseFloat(v); if (o.set) o.set(v); else S.change(t, path, v, false); });
    bindings.push(upd); upd();
    return s;
  }
  function seg(t, path, options, o = {}) {
    const wrap = h('div.seg');
    const btns = options.map(([v, label, title]) => {
      const b = h('button', { type: 'button', title: title || (typeof label === 'string' && !ICONS[label] ? label : String(v)) }, ICONS[label] ? ic(label) : label);
      b.addEventListener('click', () => { if (o.set) o.set(v); else S.change(t, path, v, false); upd(); });
      b._v = v;
      return b;
    });
    wrap.append(...btns);
    const upd = () => { const cur = o.get ? o.get() : val(t, path); btns.forEach(b => b.classList.toggle('on', b._v === cur)); };
    bindings.push(upd); upd();
    return wrap;
  }
  function toggle(t, path, label, o = {}) {
    const sw = h('button.switch', { type: 'button', role: 'switch', 'aria-label': label });
    const upd = () => { const on = !!(o.get ? o.get() : val(t, path)); sw.classList.toggle('on', on); sw.setAttribute('aria-checked', on); };
    sw.addEventListener('click', () => { const v = !(o.get ? o.get() : val(t, path)); if (o.set) o.set(v); else S.change(t, path, v, false); upd(); });
    bindings.push(upd); upd();
    return h('div.toggle-row', null, h('label', null, label), sw);
  }
  function textCtl(t, path, o = {}) {
    const ta = h('textarea.txt', { rows: o.rows || 3, placeholder: o.placeholder || '', spellcheck: false });
    const upd = () => { if (document.activeElement !== ta) ta.value = val(t, path) ?? ''; };
    let timer;
    ta.addEventListener('input', () => { S.change(t, path, ta.value, true); clearTimeout(timer); timer = setTimeout(() => S.commit(), 500); });
    ta.addEventListener('blur', () => S.commit());
    bindings.push(upd); upd();
    return ta;
  }
  function inputCtl(t, path, o = {}) {
    const inp = h('input.sel', { type: 'text', placeholder: o.placeholder || '' });
    const upd = () => { if (document.activeElement !== inp) inp.value = val(t, path) ?? ''; };
    inp.addEventListener('input', () => S.change(t, path, inp.value, true));
    inp.addEventListener('change', () => S.commit());
    bindings.push(upd); upd();
    return inp;
  }
  function fontCtl(t, famPath, weightPath) {
    const label = h('span');
    const btn = h('button.font-btn', { type: 'button' }, label, ic('chevDown'));
    const upd = () => { const f = val(t, famPath); label.textContent = f; label.style.fontFamily = `"${f}"`; };
    btn.addEventListener('click', () => fontPopover(btn, val(t, famPath), fam => {
      if (weightPath) {
        const w = val(t, weightPath) || 400;
        S.change(t, weightPath, F.nearestWeight(fam, w), true);
      }
      S.change(t, famPath, fam, false);
      renderInspector();
    }));
    bindings.push(upd); upd();
    return btn;
  }
  function weightCtl(t, famPath, weightPath) {
    const fam = val(t, famPath);
    const meta = F.BY_NAME[fam];
    const ws = meta ? meta.weights : [400, 700];
    return selectCtl(t, weightPath, ws.map(w => [w, `${w} · ${WEIGHT_NAMES[w]}`]), { number: true });
  }
  const row = (label, ...ctl) => h('div.row', null, h('label', null, label), h('div.ctl', null, ...ctl));
  const full = (...ctl) => h('div.row.full', null, ...ctl);
  const two = (a, b) => h('div.row.two', null, a, b);

  // sections: a title row that folds, an optional action on the right
  const secOpen = new Map();
  function sec(title, kids, open = true, opts = {}) {
    const key = opts.key || title;
    const fixed = opts.collapsible === false;
    const isOpen = fixed || (secOpen.has(key) ? secOpen.get(key) : open);
    const list = (kids || []).flat().filter(Boolean);
    const d = h('section.sec' + (isOpen ? '.open' : '') + (fixed ? '.fixed' : '') + (list.length ? '' : '.empty'));
    const title$ = fixed
      ? h('div.sec-title', null, h('span', null, title))
      : h('button.sec-title', { type: 'button', onclick: () => { const o = !d.classList.contains('open'); d.classList.toggle('open', o); secOpen.set(key, o); } }, h('span', null, title), ic('chevDown'));
    d.dataset.key = key; d.dataset.title = title;
    d.append(h('div.sec-head', null, title$, opts.actions || null), h('div.sec-body', null, list));
    return d;
  }
  // "More options" disclosure inside a section — rarely used controls live here
  const moreOpen = new Map();
  function more(key, kids, label = 'More options') {
    const list = (kids || []).flat().filter(Boolean);
    if (!list.length) return null;
    const open = !!moreOpen.get(key);
    const box = h('div.more-body', { hidden: !open }, list);
    const btn = h('button.more-btn' + (open ? '.on' : ''), { type: 'button', onclick: () => { const o = box.hidden; box.hidden = !o; moreOpen.set(key, o); btn.classList.toggle('on', o); } }, ic('chevRight'), h('span', null, label));
    return h('div.more', null, btn, box);
  }
  // Figma-style list: nothing shows until you add it with +
  function addSec(title, items, key) {
    const active = items.filter(i => i && i.on);
    const avail = items.filter(i => i && !i.on && !i.hidden);
    const addBtn = avail.length ? h('button.sec-add', {
      type: 'button', title: 'Add ' + title.toLowerCase(),
      onclick: e => menu(e.currentTarget, avail.map(i => ({ label: i.label, icon: i.icon || 'plus', run: () => { i.add(); renderInspector(); } }))),
    }, ic('plus')) : null;
    const rows = active.map(i => h('div.fx', null,
      h('div.fx-head', null, h('span', null, i.label), i.remove ? h('button.fx-x', { type: 'button', title: 'Remove ' + i.label.toLowerCase(), onclick: () => { i.remove(); renderInspector(); } }, ic('minus')) : null),
      h('div.fx-body', null, (i.body ? i.body() : []).flat().filter(Boolean))));
    return sec(title, rows, true, { key: key || title, collapsible: false, actions: addBtn });
  }
  const label = t => h('div.sub-label', null, t);
  function swatchRow(items) {
    // items: [title, getter, setter]
    return h('div.swatches', null, items.map(([title, get, set]) => {
      const b = h('button.swatch', { type: 'button', title });
      const upd = () => { b.style.background = get() || 'transparent'; };
      b.addEventListener('click', () => colorPopover(b, get(), (v, live) => { set(v, live); upd(); }));
      bindings.push(upd); upd();
      return b;
    }));
  }

  /* ───────────────────────── inspector ───────────────────────── */

  const insp = $('#inspector');
  function renderInspector() {
    bindings = [];
    const els = S.selEls();
    const parts = [];
    if (!els.length) parts.push(...canvasInspector());
    else if (els.length > 1) parts.push(...multiInspector(els));
    else {
      const el = els[0];
      parts.push(inspHead(el));
      const fn = { text: textInspector, image: imageInspector, sticker: stickerInspector, shape: shapeInspector, calendar: calendarInspector, badge: badgeInspector, checklist: checklistInspector, ribbon: ribbonInspector, camera: cameraInspector, nature: natureInspector, flashes: flashesInspector }[el.type];
      if (fn) parts.push(...fn(el));
      parts.push(effectsSection(el), motionSection(el), arrangeSection(el));
    }
    const top = insp.scrollTop;
    insp.replaceChildren(...parts.flat().filter(Boolean));
    insp.scrollTop = top;
    hydrateIcons(insp);
    if (S.mobile) mobileSheet();
  }
  S.renderInspector = renderInspector;
  function typeLabel(el) {
    if (el.type === 'nature' || el.type === 'camera' || el.type === 'ribbon') return S.elLabel(el).replace(/ · .*/, '');
    return { text: 'Text', image: el.seq && el.seq.ids && el.seq.ids.length > 1 ? 'Stop motion' : el.assetId ? (R.isVideoAsset(el.assetId) ? 'Video' : 'Photo') : 'Photo frame', flashes: 'Speed flashes', sticker: 'Sticker', shape: el.shape === 'line' ? 'Line' : 'Shape', calendar: 'Calendar', badge: 'Badge', checklist: 'Checklist' }[el.type] || 'Element';
  }
  // every blend mode the canvas can do, as in Figma / Photoshop
  const BLEND_MODES = [['normal', 'Normal'], ['darken', 'Darken'], ['multiply', 'Multiply'], ['color-burn', 'Colour burn'], ['lighten', 'Lighten'], ['screen', 'Screen'],
    ['color-dodge', 'Colour dodge'], ['overlay', 'Overlay'], ['soft-light', 'Soft light'], ['hard-light', 'Hard light'], ['difference', 'Difference'], ['exclusion', 'Exclusion'],
    ['hue', 'Hue'], ['saturation', 'Saturation'], ['color', 'Colour'], ['luminosity', 'Luminosity']];
  function blendCtl() {
    const s = selectCtl('sel', 'blend', BLEND_MODES, { def: 'normal', label: 'Blend mode' });
    s.classList.add('blend-sel'); s.title = 'Blend mode — how this layer mixes with what’s under it';
    return s;
  }
  // blend mode and opacity, the "Layer" row under the inspector title
  function layerRow() {
    return h('div.layer-row', null, blendCtl(), h('div.insp-opacity', { title: 'Layer opacity' }, num('sel', 'opacity', { min: 0, max: 100, scale: 100, unit: '%', label: 'Opacity' })));
  }
  function inspHead(el) {
    return [h('div.insp-head', null,
      h('h2', null, typeLabel(el)),
      el.locked ? h('span.pill', null, 'Locked') : null,
      h('button.icon-btn', { type: 'button', title: 'More actions', onclick: e => { const r = e.currentTarget.getBoundingClientRect(); contextMenu({ x: r.left - 160, y: r.bottom + 4 }); } }, ic('more'))),
      layerRow()];
  }

  // what an animated text layer does with its text, in plain words
  function textModeHint(el) {
    const en = (el.anim && el.anim.enter) || '';
    if (en === 'captions') return 'One caption per line — each line shows in turn.';
    if (en === 'roll') return 'One value per line — they roll past in order.';
    if (en === 'words') return 'Each word pops up on its own, in order.';
    if (en === 'typewriter') return 'Typed out letter by letter. Pick highlighted words under Motion → Typing.';
    if (/^letters|^slam/.test(en)) return 'Each letter animates in, one after another.';
    if (el.time && (el.time.start > 0 || el.time.end != null || el.time.cycle)) return 'Shown for part of the video (see Motion → timing).';
    return '';
  }
  // a text box bound to one element (so many can sit side by side)
  function elTextBox(el, o = {}) {
    const key = o.path || 'text';
    const pieces = () => (R.seqPieces(el) || []).length;
    const ta = h('textarea.txt.video-text', { rows: o.rows || Math.min(8, Math.max(2, String(el[key] || '').split('\n').length + 1)), spellcheck: true, placeholder: o.placeholder || 'Type your text', 'data-el': el.id });
    ta.value = el[key] || '';
    const count = h('span.txt-count');
    const updCount = () => { const n = pieces(); count.textContent = n > 1 ? `${n} ${el.anim.enter === 'words' ? 'words' : 'lines'}` : ''; };
    let timer;
    ta.addEventListener('input', () => {
      S.changeEl(el, e => { e[key] = ta.value; }, true);
      updCount(); clearTimeout(timer); timer = setTimeout(() => S.commit(), 500);
      if (R.playTime != null) S.seek(R.playTime);
    });
    ta.addEventListener('blur', () => { S.commit(); if (o.onBlur) o.onBlur(); });
    ta.addEventListener('keydown', e => e.stopPropagation());
    bindings.push(() => { if (document.activeElement !== ta) ta.value = el[key] || ''; });
    updCount();
    const hint = o.hint ?? textModeHint(el);
    return h('div.text-box', null, ta, h('div.text-box-foot', null, hint ? h('span.hint', null, hint) : h('span'), count));
  }
  S.on('focusText', id => {
    renderInspector();
    const ta = insp.querySelector(`textarea.video-text[data-el="${id}"]`);
    if (ta) { ta.focus(); ta.select(); ta.closest('.sec')?.scrollIntoView({ block: 'nearest' }); ta.classList.add('flash'); setTimeout(() => ta.classList.remove('flash'), 700); }
    if (S.mobile) { const sec0 = ta && ta.closest('.sec'); if (sec0) { mTool = sec0.dataset.key; mobileSheet(); ta.focus(); } }
    else if (matchMedia('(max-width: 920px)').matches) insp.classList.add('open');
  });
  function textInspector(el, o = {}) {
    const T = 'sel';
    const bgStyle = (el.bg && el.bg.style) || 'none';
    const lineStyle = ['lines', 'select', 'marker', 'underline', 'rough'].includes(bgStyle);
    const grad = el.gradient && el.gradient !== 'none';
    const MAIN_STYLES = ['none', 'box', 'pill', 'lines', 'select', 'marker', 'sticker', 'glossy'];
    const showAll = !!moreOpen.get('text-styles-all') || !MAIN_STYLES.includes(bgStyle);
    const styles = Object.entries(R.TEXT_BG).filter(([k]) => showAll || MAIN_STYLES.includes(k));
    const chips = h('div.chips.tight', null, styles.map(([k, l]) => h('button.chip' + (bgStyle === k ? '.on' : ''), { type: 'button', onclick: () => { S.change(T, 'bg.style', k, false); renderInspector(); } }, l)),
      showAll ? null : h('button.chip.ghost', { type: 'button', onclick: () => { moreOpen.set('text-styles-all', true); renderInspector(); } }, 'More…'));
    const videoText = !o.multi && S.isVideoText(el);
    return [
      videoText ? sec('Text', [
        elTextBox(el, { onBlur: () => { if (el.typing) renderInspector(); } }),
        full(h('div.btn-row', null, h('button.btn.grow', { type: 'button', onclick: () => { S.seek(0); S.play(); } }, ic('play'), 'Preview the animation'))),
      ], true, { collapsible: false, key: 'video-text' }) : null,
      sec('Typography', [
        full(fontCtl(T, 'fontFamily', 'fontWeight')),
        two(weightCtl(T, 'fontFamily', 'fontWeight'), num(T, 'fontSize', { label: 'Size', min: 4, max: 2000, step: 1 })),
        full(h('div.btn-row.tools', null,
          seg(T, 'align', [['left', 'tl', 'Align left'], ['center', 'tc', 'Align centre'], ['right', 'tr', 'Align right']]),
          styleToggle('italic', 'italic', 'Italic'), styleToggle('uppercase', 'upper', 'Uppercase'), styleToggle('underline', 'underline', 'Underline'))),
        row('Colour', colorCtl(T, 'fill', { allowNone: true })),
        more('text-more', [
          row('Line height', num(T, 'lineHeight', { min: 0.5, max: 3, step: 0.05, slider: true })),
          row('Letters', num(T, 'letterSpacing', { min: -10, max: 60, step: 0.5, scale: 100, slider: true, unit: '%' })),
          row('Curve', num(T, 'curve', { min: -100, max: 100, step: 1, slider: true, set: (v, live) => { S.change(T, 'curve', v, live); if (!live) S.attachTransformer(); } })),
          row('Gradient', selectCtl(T, 'gradient', [['none', 'None'], ['linear', 'Linear'], ['radial', 'Radial']], { set: v => { S.change(T, 'gradient', v); renderInspector(); } })),
          grad ? row('To', colorCtl(T, 'fill2')) : null,
          grad ? row('Angle', num(T, 'gradAngle', { min: 0, max: 360, slider: true, unit: '°' })) : null,
          styleToggle('strike', 'strike', 'Strikethrough', 'Strikethrough'),
          !el.autoWidth && !(el.curve && Math.abs(el.curve) >= 1) ? toggle(T, 'autoWidth', 'Fit width to text') : null,
        ], 'Spacing, curve & gradient'),
      ], true, { collapsible: false }),
      sec('Background', [
        full(chips),
        bgStyle !== 'none' ? row(bgStyle === 'sticker' ? 'Outline' : 'Fill', colorCtl(T, 'bg.color', { allowNone: true })) : null,
        bgStyle !== 'none' ? row(bgStyle === 'sticker' ? 'Thickness' : 'Padding', num(T, 'bg.padX', { min: 0, max: 200, slider: true })) : null,
        bgStyle !== 'none' ? more('text-bg-more', [
          bgStyle !== 'sticker' ? row('Padding Y', num(T, 'bg.padY', { min: 0, max: 200, slider: true })) : null,
          ['box', 'lines', 'ticket', 'speech', 'glossy'].includes(bgStyle) ? row('Radius', num(T, 'bg.radius', { min: 0, max: 200, slider: true })) : null,
          lineStyle ? row('Line gap', num(T, 'bg.gap', { min: -40, max: 120, slider: true })) : null,
          row(bgStyle === 'select' ? 'Accent' : 'Border', colorCtl(T, 'bg.borderColor')),
          row(bgStyle === 'select' ? 'Line' : 'Border W', num(T, 'bg.borderWidth', { min: 0, max: 40, slider: true, step: 0.5 })),
          ['box', 'pill', 'lines'].includes(bgStyle) ? toggle(T, 'bg.stitch', 'Stitched edge') : null,
        ]) : null,
      ], bgStyle !== 'none'),
    ];
  }
  function styleToggle(path, iconName, title, text) {
    const b = h('button.btn' + (text ? '' : '.icon'), { type: 'button', title }, ic(iconName), text || null);
    const upd = () => b.classList.toggle('on', !!val('sel', path));
    b.addEventListener('click', () => { S.change('sel', path, !val('sel', path)); upd(); });
    bindings.push(upd); upd();
    return b;
  }

  // looks, in shelves: film stocks first, then colour, black & white, print and effects
  const lookShelf = new Map();
  function filterThumbs(el, target) {
    const grid = h('div.filter-strip');
    const img = target === 'doc' ? R.assetImage(S.doc.background.assetId) : R.assetImage(el.assetId);
    const assetId = target === 'doc' ? S.doc.background.assetId : el.assetId;
    let small = null;
    if (img) {
      small = document.createElement('canvas');
      const m = R.mediaSize(img), s = 120 / Math.max(m.w, m.h);
      small.width = Math.max(1, Math.round(m.w * s)); small.height = Math.max(1, Math.round(m.h * s));
      small.getContext('2d').drawImage(img, 0, 0, small.width, small.height);
    }
    const fpath = target === 'doc' ? 'background.filters' : 'filters';
    const cur = JSON.stringify(S.getPath(target === 'doc' ? S.doc : el, fpath) || {});
    const G = R.FILTER_GROUPS;
    const isOn = k => JSON.stringify(R.FILTER_PRESETS[k].f) === cur;
    const shelf = lookShelf.get(target) || Object.keys(G).find(g => G[g].keys.some(k => k !== 'original' && isOn(k))) || 'film';
    const keys = (G[shelf].keys.includes('original') ? [] : ['original']).concat(G[shelf].keys);
    for (const k of keys) {
      const p = R.FILTER_PRESETS[k];
      const c = document.createElement('canvas');
      c.width = 96; c.height = 96;
      const x = c.getContext('2d');
      if (small) {
        const src = R.filteredSource('thumb:' + assetId, small, p.f);
        const sc = Math.max(96 / small.width, 96 / small.height);
        if (p.f.blur) x.filter = `blur(${p.f.blur / 6}px)`;
        x.drawImage(src, (96 - small.width * sc) / 2, (96 - small.height * sc) / 2, small.width * sc, small.height * sc);
        x.filter = 'none';
        R.photoFinish(x, { x: 0, y: 0, w: 96, h: 96 }, Object.assign({}, p.f, { grain: 0, dust: 0 }));
      } else { x.fillStyle = '#ddd'; x.fillRect(0, 0, 96, 96); }
      grid.append(h('button.filter-tile' + (isOn(k) ? '.on' : ''), { type: 'button', onclick: () => { S.change(target, fpath, S.clone(p.f)); renderInspector(); } }, c, p.label));
    }
    const tabs = h('div.chips.tight.look-tabs', null, Object.entries(G).map(([g, v]) =>
      h('button.chip' + (g === shelf ? '.on' : ''), { type: 'button', onclick: () => { lookShelf.set(target, g); renderInspector(); } }, v.label)));
    return h('div.looks', null, tabs, grid);
  }
  // one slider for one photo-look value
  function lookSlider(t, base, k, l, a, b) {
    return row(l, num(t, base + '.' + k, { min: a, max: b, slider: true, def: 0, set: (v, live) => { S.change(t, base + '.' + k, v, live); if (!live && ['motion', 'halftone', 'threshold', 'splitTone', 'leak', 'halation'].includes(k)) renderInspector(); } }));
  }
  // light and colour, like a photo app's edit tab: the everyday sliders up front, the rest one click away
  function adjustSection(t, base) {
    const f = S.getPath(t === 'doc' ? S.doc : S.selEls()[0] || {}, base) || {};
    const sl = (k, l, a = -100, b = 100) => lookSlider(t, base, k, l, a, b);
    return sec('Adjust', [
      sl('exposure', 'Exposure'), sl('contrast', 'Contrast'), sl('highlights', 'Highlights'), sl('shadows', 'Shadows'),
      sl('warmth', 'Temperature'), sl('tint', 'Tint'), sl('saturation', 'Saturation'), sl('vibrance', 'Vibrance'),
      more('adjust-more', [
        sl('brightness', 'Brightness'), sl('blacks', 'Blacks'), sl('fade', 'Fade', 0, 100), sl('hue', 'Hue', -180, 180),
        sl('sharpen', 'Sharpen', 0, 100), sl('clarity', 'Clarity'), sl('noise', 'Noise', 0, 100), sl('fisheye', 'Fisheye', 0, 100),
        label('Print'),
        sl('grayscale', 'Mono', 0, 100), sl('sepia', 'Sepia', 0, 100), sl('halftone', 'Halftone', 0, 100), sl('threshold', 'Photocopy', 0, 100),
        toggle(t, base + '.duotone', 'Duotone', { set: v => { S.change(t, base + '.duotone', v); if (v && !f.duoDark) { S.change(t, base + '.duoDark', '#1b2a8f', true); S.change(t, base + '.duoLight', '#a9c4ff'); } renderInspector(); } }),
        f.duotone || f.threshold || f.halftone ? row('Ink', colorCtl(t, base + '.duoDark')) : null,
        f.duotone || f.threshold || f.halftone ? row('Paper', colorCtl(t, base + '.duoLight')) : null,
      ], 'More adjustments'),
      full(h('button.btn', { type: 'button', onclick: () => { S.change(t, base, {}); renderInspector(); } }, ic('undo'), 'Reset photo look')),
    ], true, { key: 'adjust' });
  }
  // what makes it feel like film: glow round the lights, grain, leaks, dust
  function filmSection(t, base) {
    const f = S.getPath(t === 'doc' ? S.doc : S.selEls()[0] || {}, base) || {};
    const sl = (k, l, a = 0, b = 100) => lookSlider(t, base, k, l, a, b);
    return sec('Film effects', [
      sl('halation', 'Halation'), sl('bloom', 'Bloom'), sl('grain', 'Film grain'), sl('vignette', 'Vignette'),
      sl('leak', 'Light leak'), sl('dust', 'Dust'),
      more('film-more', [
        sl('grainSize', 'Grain size'),
        f.halation ? row('Halation colour', colorCtl(t, base + '.halColor', { def: '#ff4820' })) : null,
        f.leak ? row('Leak colour', colorCtl(t, base + '.leakColor', { def: '#ff5a1f' })) : null,
        f.leak ? row('Leak from', seg(t, base + '.leakSide', [['left', 'Left'], ['right', 'Right'], ['top', 'Top'], ['bottom', 'Bottom']], { get: () => (S.getPath(t === 'doc' ? S.doc : S.selEls()[0] || {}, base) || {}).leakSide || 'left' })) : null,
        sl('chroma', 'Colour fringe'), sl('cross', 'Cross process'),
        label('Split tone'),
        sl('splitTone', 'Amount'),
        f.splitTone ? row('Shadows', colorCtl(t, base + '.toneShadow', { def: '#1d6f78' })) : null,
        f.splitTone ? row('Highlights', colorCtl(t, base + '.toneHigh', { def: '#ffa65c' })) : null,
        f.splitTone ? sl('toneBalance', 'Balance', -100, 100) : null,
      ], 'More film effects'),
    ], true, { key: 'film-fx' });
  }

  // one place to pick a blur, see how strong it is and steer it
  const BLUR_TYPES = [['none', 'None'], ['motion', 'Motion'], ['zoom', 'Zoom'], ['spin', 'Spin'], ['soft', 'Soft'], ['tilt', 'Tilt-shift'], ['ghost', 'Double']];
  const BLUR_KEY = { motion: 'motion', zoom: 'zoomBlur', spin: 'spinBlur', soft: 'blur', tilt: 'tiltShift', ghost: 'ghost' };
  const BLUR_HINT = {
    motion: 'Streaks in one direction, like a fast pan.', zoom: 'Rushes out from a point, like zooming the lens mid-shot.',
    spin: 'Swirls around a point.', soft: 'An even, dreamy softness.', tilt: 'A sharp band with the rest blurred — the miniature look.',
    ghost: 'A faint second copy, like a double exposure.',
  };
  function blurSection(t, base) {
    const type = blurTypeOf(S.getPath(t === 'doc' ? S.doc : S.selEls()[0] || {}, base) || {});
    return sec('Blur', blurControls(t, base), type !== 'none', { key: 'blur-' + t });
  }
  const blurTypeOf = ff => Object.keys(BLUR_KEY).find(k => (ff[BLUR_KEY[k]] || 0) > 0) || 'none';
  // the blur picker: type chips, amount, direction / centre / band, and where it lands (everywhere, on spots, off spots).
  // Photos keep it in filters; text, stickers, shapes and lines in tblur, with spots placed inside the layer's box.
  function blurControls(t, base, o = {}) {
    const get = () => S.getPath(t === 'doc' ? S.doc : S.selEls()[0] || {}, base) || {};
    const noun = o.noun || 'photo';
    const type = blurTypeOf(get());
    const amountOf = ff => type === 'soft' ? (ff.blur || 0) * 2.5 : (ff[BLUR_KEY[type]] || 0);
    const setType = nt => {
      const cur = get(), amt = type !== 'none' ? amountOf(cur) : 50;
      const nf = Object.assign({}, cur);
      for (const k of Object.values(BLUR_KEY)) delete nf[k];
      if (nt !== 'none') nf[BLUR_KEY[nt]] = nt === 'soft' ? Math.round(amt / 2.5 * 10) / 10 : amt;
      if (nt === 'none' && o.onNone) return o.onNone();
      S.change(t, base, nf);
      renderInspector();
    };
    const pct = (k, l, def) => row(l, num(t, base + '.' + k, { min: 0, max: 100, scale: 100, slider: true, unit: '%', def }));
    // where the blur lands: the whole photo, only around chosen spots, or everywhere except them
    const area = get().blurArea || 'all', pts = get().blurPts || [];
    const selEl = t === 'doc' ? null : S.selEls()[0];
    const canPlace = !!(selEl && (selEl.type !== 'image' || selEl.assetId));
    const editing = canPlace && S.isEditingSpots();
    const setPts = list => { S.change(t, base + '.blurPts', list); renderInspector(); };
    const setArea = a => {
      S.change(t, base + '.blurArea', a, a !== 'all' && !pts.length);
      if (a !== 'all' && !pts.length) S.change(t, base + '.blurPts', [{ x: 0.5, y: 0.5, r: 0.15 }]);
      if (a === 'all' && editing) S.endBlurSpots();
      if (a !== 'all' && canPlace && !editing) S.startBlurSpots(selEl.id);
      renderInspector();
    };
    const where = type === 'none' ? [] : [
      label('Where'),
      full(seg(t, base + '.blurArea', [['all', 'Everywhere', `Blur the whole ${noun}`], ['spots', 'On spots', 'Blur only around the spots'], ['sharp', 'Off spots', 'Keep the spots sharp, blur the rest']], { get: () => get().blurArea || 'all', set: setArea })),
    ];
    if (type !== 'none' && area !== 'all') {
      where.push(h('p.hint', null, area === 'spots' ? 'Blur fades out from each spot — the rest stays sharp.' : 'Each spot stays in focus — everything around it is blurred.'));
      where.push(full(h('div.btn-row', null,
        canPlace ? h('button.btn.grow' + (editing ? '.primary' : ''), { type: 'button', onclick: () => { editing ? S.endBlurSpots() : S.startBlurSpots(selEl.id); renderInspector(); } }, ic(editing ? 'check' : 'target'), editing ? 'Done placing' : `Place on ${noun}`) : null,
        h('button.btn.grow', { type: 'button', onclick: () => setPts(pts.concat([{ x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.4, r: 0.12 }])) }, ic('plus'), 'Add spot'))));
      pts.forEach((p, i) => {
        const P = base + '.blurPts.' + i;
        const sl = (k, l, a, b, unit) => row(l, num(t, P + '.' + k, { min: a, max: b, scale: 100, slider: true, unit, def: k === 'r' ? 0.12 : 0.5 }));
        where.push(h('div.spot-item', null,
          h('div.spot-head', null, h('span.spot-dot'), h('b', null, 'Spot ' + (i + 1)),
            h('button.icon-btn', { type: 'button', title: 'Remove spot', onclick: () => setPts(pts.filter((_, j) => j !== i)) }, ic('trash'))),
          sl('r', 'Size', 1, 60, '%'),
          canPlace ? null : sl('x', 'Across', 0, 100, '%'),
          canPlace ? null : sl('y', 'Down', 0, 100, '%')));
      });
      if (!pts.length) where.push(h('p.hint', null, `No spots yet — add one, or click the ${noun} while placing.`));
      where.push(row('Softness', num(t, base + '.blurFeather', { min: 0, max: 100, slider: true, unit: '%', def: 60 })));
    }
    return [
      full(h('div.chips.tight', null, BLUR_TYPES.filter(([k]) => k !== 'none' || !o.onNone).map(([k, l]) => h('button.chip' + (type === k ? '.on' : ''), { type: 'button', onclick: () => setType(k) }, l)))),
      type !== 'none' ? h('p.hint', null, BLUR_HINT[type]) : null,
      type !== 'none' ? row('Amount', num(t, base + '.' + BLUR_KEY[type], { min: 0, max: 100, slider: true, get: () => amountOf(get()), set: (v, live) => S.change(t, base + '.' + BLUR_KEY[type], type === 'soft' ? v / 2.5 : v, live) })) : null,
      type === 'motion' || type === 'ghost' ? row('Direction', num(t, base + '.motionAngle', { min: -90, max: 90, slider: true, unit: '°', def: 0 })) : null,
      type === 'zoom' || type === 'spin' ? pct('blurX', 'Centre X', 0.5) : null,
      type === 'zoom' || type === 'spin' ? pct('blurY', 'Centre Y', 0.5) : null,
      type === 'tilt' ? pct('tiltY', 'Focus line', 0.5) : null,
      type === 'tilt' ? pct('tiltSize', 'Focus size', 0.25) : null,
      ...where,
    ];
  }
  const ROUND_FRAMES = ['circle', 'heart', 'star', 'blob', 'scallop', 'flower', 'squircle', 'sparkle', 'arch', 'ticket', 'rounded', 'none'];
  const BORDER_FRAMES = ['polaroid', 'stamp', 'film', 'torn', 'border', 'gate', 'scan', 'slide', 'filed'];
  const DARK_FRAMES = ['film', 'gate', 'scan', 'filed'];
  // starting border size and colour for the film frames, as a share of the photo's short side
  const FRAME_START = { gate: [0.045, '#0b0b0b'], scan: [0.035, '#161412'], slide: [0.16, '#efebe2'], filed: [0.05, '#0b0b0b'], strips: [0.012, '#ffffff'], mosaic: [0.012, '#ffffff'], mirror: [0.008, '#ffffff'] };
  // frames that cut the photo up and place it piece by piece
  const CUT_FRAMES = ['strips', 'mosaic', 'mirror'];
  function frameTiles(el, limit) {
    const grid = h('div.frame-grid');
    let entries = Object.entries(R.FRAMES);
    const cur = el.frame.style || 'none';
    if (limit && entries.length > limit) {
      const head = entries.slice(0, limit);
      if (!head.some(([k]) => k === cur)) head[limit - 1] = entries.find(([k]) => k === cur);
      entries = head;
    }
    for (const [k, l] of entries) {
      const demo = S.mk('image', { assetId: el.assetId, width: 100, height: k === 'polaroid' ? 120 : 100, frame: { style: k, color: FRAME_START[k] ? FRAME_START[k][1] : DARK_FRAMES.includes(k) ? '#0b0b0b' : el.frame.color === '#ffffff' && ROUND_FRAMES.includes(k) ? '#ffffff' : (el.frame.color || '#fff'), size: ROUND_FRAMES.includes(k) ? 0 : FRAME_START[k] ? Math.round(100 * FRAME_START[k][0]) : 7, radius: k === 'rounded' ? 14 : 0 }, crop: el.crop, filters: {}, placeholder: el.placeholder });
      demo.id = el.id;
      const c = elThumb(demo, 56, 56, 2);
      c.style.width = '100%';
      grid.append(h('button.frame-tile' + (cur === k ? '.on' : ''), {
        type: 'button',
        onclick: () => {
          const e0 = S.selEls()[0];
          const needsBorder = BORDER_FRAMES.includes(k);
          S.changeEl(e0, e => {
            e.frame.style = k;
            if (needsBorder && !(e.frame.size > 2)) e.frame.size = Math.round(Math.min(e.width, e.height) * 0.05);
            if (FRAME_START[k]) e.frame.size = Math.round(Math.min(e.width, e.height) * FRAME_START[k][0]);
            if (!needsBorder && ROUND_FRAMES.includes(k)) e.frame.size = 0;
            if (DARK_FRAMES.includes(k) && ['#ffffff', '#efebe2'].includes(e.frame.color)) e.frame.color = FRAME_START[k] ? FRAME_START[k][1] : '#1d1b18';
            if (!DARK_FRAMES.includes(k) && ['#1d1b18', '#0b0b0b', '#161412'].includes(e.frame.color)) e.frame.color = k === 'slide' ? '#efebe2' : '#ffffff';
            if (k === 'rounded' && !e.frame.radius) e.frame.radius = Math.round(Math.min(e.width, e.height) * 0.08);
          });
          renderInspector();
        },
      }, c, l));
    }
    return grid;
  }

  function bgRemovalControls(el) {
    const busy = S.isRemovingBackground();
    if (el.bgRemoved) return full(h('button.btn', { type: 'button', onclick: () => S.restoreBackground(el.id) }, ic('undo'), 'Restore background'));
    return [
      full(h('div.btn-row', null,
        h('button.btn.primary.grow', { type: 'button', disabled: busy, onclick: () => S.removeBackground(el.id, 'replace') }, ic('wand'), busy ? 'Working…' : 'Remove background'),
        h('button.btn.icon', { type: 'button', disabled: busy, title: 'Cut the subject out onto a new layer and keep this photo', onclick: () => S.removeBackground(el.id, 'layer') }, ic('layers')))),
    ];
  }

  // studio look: re-light the person over a seamless backdrop
  function studioTile(k, p, on, onclick) {
    const bg = p.light === 'spot' ? `radial-gradient(circle at ${p.lx * 100}% ${p.ly * 100}%, ${p.glow} 0 32%, ${p.color} 50%, ${p.color2} 85%)`
      : p.light === 'side' ? `linear-gradient(${p.lx < 0.5 ? 90 : 270}deg, ${p.color}, ${p.color2})`
      : p.light === 'top' ? `linear-gradient(180deg, ${p.color}, ${p.color2})`
      : `radial-gradient(circle at ${p.lx * 100}% ${p.ly * 100}%, ${p.glow} 0, ${p.color} 30%, ${p.color2} 100%)`;
    return h('button.studio-tile' + (on ? '.on' : ''), { type: 'button', title: p.label, onclick }, h('span.studio-swatch', { style: { background: bg } }, h('span.studio-figure')), p.label);
  }
  function applyStudio(el, k) {
    const p = R.STUDIO_PRESETS[k];
    const cur = el.studio || {};
    S.changeEl(el, e => { e.studio = Object.assign({ on: true, backdrop: true }, cur, p, { on: true, preset: k, label: undefined }); delete e.studio.label; });
    renderInspector();
    if (el.assetId && !R.studioReady(el) && S.studioCutout) S.studioCutout(el.id);
  }
  function studioSection(el) {
    const T = 'sel', st = el.studio || {};
    const on = !!st.on;
    const busy = S.isRemovingBackground && S.isRemovingBackground();
    const tiles = h('div.studio-grid', null, Object.entries(R.STUDIO_PRESETS).map(([k, p]) => studioTile(k, p, on && st.preset === k, () => applyStudio(S.selEls()[0], k))));
    const needsCut = on && el.assetId && !R.studioReady(el);
    return sec('Studio look', [
      on ? null : h('p.hint', null, 'Turn any photo into a studio shot: the person is cut out and re-lit on a seamless coloured backdrop.'),
      full(tiles),
      needsCut ? full(h('button.btn.primary', { type: 'button', disabled: busy, onclick: () => S.studioCutout(el.id) }, ic('wand'), busy ? 'Cutting out…' : 'Cut out the person')) : null,
      on ? row('Light', selectCtl(T, 'studio.light', Object.entries(R.STUDIO_LIGHTS), { set: v => { S.change(T, 'studio.light', v); renderInspector(); } })) : null,
      on ? h('div.swatch-line', null, h('span.sub-label', null, 'Colours'), swatchRow([
        ['Backdrop', () => S.selEls()[0].studio.color, (v, l) => S.change(T, 'studio.color', v, l)],
        ['Shadow side', () => S.selEls()[0].studio.color2, (v, l) => S.change(T, 'studio.color2', v, l)],
        ['Light', () => S.selEls()[0].studio.glow, (v, l) => S.change(T, 'studio.glow', v, l)],
      ])) : null,
      on ? row('Brightness', num(T, 'studio.intensity', { min: 0, max: 150, scale: 100, slider: true, unit: '%' })) : null,
      on ? row('Tint person', num(T, 'studio.grade', { min: 0, max: 100, slider: true })) : null,
      on ? more('studio-more', [
        row('Light X', num(T, 'studio.lx', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
        row('Light Y', num(T, 'studio.ly', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
        row('Light size', num(T, 'studio.size', { min: 10, max: 150, scale: 100, slider: true, unit: '%' })),
        row('Rim light', num(T, 'studio.rim', { min: 0, max: 100, slider: true })),
        row('Wall shadow', num(T, 'studio.shadow', { min: 0, max: 100, slider: true })),
        toggle(T, 'studio.backdrop', 'Backdrop on this layer', { get: () => S.selEls()[0].studio.backdrop !== false }),
        h('p.hint', null, 'Turn the backdrop off to put text between the canvas background and the person. Add movement with Blur → Motion: it smears just the person.'),
      ], 'Light position, rim & shadow') : null,
      on ? full(h('button.link-btn', { type: 'button', onclick: () => { S.change(T, 'studio.on', false); renderInspector(); } }, 'Turn off studio look')) : null,
      !el.assetId && on ? h('p.hint', null, 'Add a photo — the person is cut out automatically (the first time downloads a 44 MB model).') : null,
    ], on, { key: 'studio-look' });
  }
  // speed for a video (a layer or the canvas background): presets, any percentage, and smooth slow motion
  const SPEEDS = [[0.15, 'Super slow'], [0.4, 'Slow'], [1, 'Normal'], [2, 'Fast']];
  function speedControls(t, base, clipLen) {
    const get = () => (S.getPath(t === 'doc' ? S.doc : S.selEls()[0] || {}, base) || {});
    const sp = get().speed || 1;
    const setSpeed = v => {
      v = clamp(Math.round(v * 1000) / 1000, 0.05, 4);
      S.change(t, base + '.speed', v);
      // slowing down stretches the clip: lengthen the design so all of it plays (up to a minute)
      const len = clipLen ? clipLen() : 0;
      if (len && v < 1) {
        const want = Math.min(60, Math.round(len / v * 10) / 10);
        if (want > S.doc.anim.duration + 0.05) { S.change('doc', 'anim.duration', want); updateTimeline(); toast(`Design length set to ${want}s so the whole slowed clip plays`); }
      }
      renderInspector();
    };
    return [
      full(h('div.chips.tight.speed-chips', null, SPEEDS.map(([v, l]) => h('button.chip' + (Math.abs(sp - v) < 0.001 ? '.on' : ''), { type: 'button', onclick: () => setSpeed(v) }, l, h('small', null, ' ' + Math.round(v * 100) + '%'))))),
      row('Speed', num(t, base + '.speed', { min: 5, max: 400, step: 1, scale: 100, unit: '%', slider: true, def: 1, set: (v, live) => { if (live) S.change(t, base + '.speed', clamp(v, 0.05, 4), true); else setSpeed(v); } })),
      sp < 0.999 ? row('Smooth frames', seg(t, base + '.smooth', [['flow', 'Flow'], ['blend', 'Blend'], ['off', 'Off']], { get: () => get().smooth || 'flow' })) : null,
      sp < 0.999 ? h('p.hint', null, (get().smooth || 'flow') === 'off' ? 'Plays the clip’s own frames, slowed down — it steps.' : (get().smooth || 'flow') === 'blend'
        ? 'New in-between frames cross-fade from one real frame to the next — soft, no warping.'
        : 'New in-between frames follow the motion in the clip, like a phone’s slow-mo. Made when you export; the preview plays the plain clip.') : null,
    ];
  }
  function videoSection(el) {
    const T = 'sel', ve = R.assetVideo(el.assetId), dur = ve && ve.v && isFinite(ve.v.duration) ? ve.v.duration : 0;
    return sec('Playback', [
      dur ? row('Start at', num(T, 'video.trim', { min: 0, max: Math.max(0.1, Math.floor((dur - 0.2) * 10) / 10), step: 0.1, slider: true, unit: 's', def: 0 })) : null,
      dur ? row('End at', num(T, 'video.end', { min: 0.2, max: Math.round(dur * 10) / 10, step: 0.1, slider: true, unit: 's', get: () => { const v = S.selEls()[0].video || {}; return v.end > 0 ? v.end : Math.round(dur * 10) / 10; } })) : null,
      full(h('div.btn-row', null,
        h('button.btn.grow', { type: 'button', title: 'Drag to choose which part of the video shows; scroll to zoom', onclick: () => S.startCrop(el.id) }, ic('crop'), 'Crop & position'),
        h('button.btn.grow', { type: 'button', onclick: () => { const v = S.selEls()[0].video || {}; const len = ((v.end > 0 ? v.end : dur) - (v.trim || 0)) / (v.speed || 1); S.change('doc', 'anim.duration', Math.min(60, Math.max(1, Math.round(len * 10) / 10))); updateTimeline(); toast(`Design length set to ${S.doc.anim.duration}s`); } }, ic('film'), 'Fit length to clip'))),
      ...speedControls(T, 'video', () => { const v = S.selEls()[0].video || {}; return dur ? (v.end > 0 ? v.end : dur) - (v.trim || 0) : 0; }),
      toggle(T, 'video.loop', 'Loop when it ends', { get: () => (S.selEls()[0].video || {}).loop !== false }),
      h('p.hint', null, `${dur ? dur.toFixed(1) + 's clip · ' : ''}plays muted and exports without sound. Press play to preview it with your design.`),
    ], true, { collapsible: false });
  }
  // stop motion: photos picked here become the frames, in the order they were chosen (file name order)
  function pickFrames(el, replace) {
    S.pickImages({ uploadOnly: true, imagesOnly: true, onAdded: added => {
      const cur = S.doc.elements.find(e => e.id === el.id);
      if (!cur) return;
      const ids = added.filter(a => !a.video).map(a => a.id);
      if (!ids.length) return;
      S.changeEl(cur, e => {
        const prev = replace ? [] : ((e.seq && e.seq.ids) || (e.assetId ? [e.assetId] : []));
        e.seq = Object.assign({ fps: 6, mode: 'loop', jitter: 35, still: 0 }, e.seq || {}, { ids: [...prev, ...ids] });
        e.assetId = e.seq.ids[0];
      });
      fitLengthToFrames(cur);
      renderInspector();
      toast(`${ids.length} photo${ids.length > 1 ? 's' : ''} added — press play to watch`);
    } });
  }
  function makeStopMotion(el) {
    S.changeEl(el, e => { e.seq = { ids: [e.assetId], fps: 6, mode: 'loop', jitter: 35, still: 0 }; });
    renderInspector();
    pickFrames(el, false);
  }
  // one pass through the frames (twice for short sequences) sets the video length, within 30 s
  function fitLengthToFrames(el, force) {
    const sq = el.seq, n = sq.ids.length;
    const pass = (sq.mode === 'bounce' ? 2 * n - 2 : n) / clamp(sq.fps || 6, 1, 30);
    const want = Math.min(30, Math.max(2, Math.round((pass < 2 ? pass * 2 : pass) * 10) / 10));
    if (force || S.doc.anim.duration < want) { S.change('doc', 'anim.duration', want); updateTimeline(); }
  }
  function stopMotionSection(el) {
    const T = 'sel', sq = el.seq, ids = sq.ids.filter(id => S.assets[id]);
    const setIds = list => { S.changeEl(S.selEls()[0], e => { e.seq = Object.assign({}, e.seq, { ids: list }); e.assetId = list[0]; }); renderInspector(); };
    const move = (i, d) => { const l = ids.slice(), j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setIds(l); };
    const strip = h('div.seq-strip', null,
      ids.map((id, i) => h('div.seq-frame', { title: `Frame ${i + 1}` },
        h('span.seq-img', { style: { backgroundImage: `url(${S.assets[id]})` } }), h('b', null, i + 1),
        h('div.seq-tools', null,
          i > 0 ? h('button', { type: 'button', title: 'Move earlier', onclick: () => move(i, -1) }, ic('chevLeft')) : null,
          ids.length > 1 ? h('button', { type: 'button', title: 'Remove this frame', onclick: () => setIds(ids.filter((_, j) => j !== i)) }, ic('x')) : null,
          i < ids.length - 1 ? h('button', { type: 'button', title: 'Move later', onclick: () => move(i, 1) }, ic('chevRight')) : null))),
      h('button.seq-add', { type: 'button', title: 'Add more photos', onclick: () => pickFrames(el, false) }, ic('plus')));
    const secs = (ids.length / (sq.fps || 6)).toFixed(1);
    return sec('Stop motion', [
      full(h('div.btn-row', null,
        h('button.btn.primary.grow', { type: 'button', title: 'Pick all your photos at once — they play in file-name order', onclick: () => pickFrames(el, true) }, ic('image'), 'Choose photos'),
        h('button.btn', { type: 'button', title: 'Add more photos to the end', onclick: () => pickFrames(el, false) }, ic('plus'), 'Add'),
        h('button.btn', { type: 'button', title: 'Crop all frames the same way', onclick: () => S.startCrop(el.id) }, ic('crop')))),
      h('div.sub-label', null, `${ids.length} frame${ids.length === 1 ? '' : 's'} · ${secs}s per pass`),
      full(strip),
      row('Speed', num(T, 'seq.fps', { min: 1, max: 24, slider: true, unit: 'fps', def: 6, set: (v, live) => { S.change(T, 'seq.fps', v, live); if (!live) renderInspector(); } })),
      full(seg(T, 'seq.mode', [['loop', 'Loop'], ['bounce', 'Back & forth'], ['once', 'Play once']], { get: () => S.selEls()[0].seq.mode || 'loop' })),
      row('Jiggle', num(T, 'seq.jitter', { min: 0, max: 100, slider: true, def: 35 })),
      more('seq-more', [
        row('Still shows', num(T, 'seq.still', { min: 0, max: Math.max(0, ids.length - 1), step: 1, slider: true, def: 0 })),
        full(h('button.btn', { type: 'button', onclick: () => { fitLengthToFrames(S.selEls()[0], true); toast(`Video length set to ${S.doc.anim.duration}s`); } }, ic('film'), 'Fit video length to the frames')),
        full(h('button.btn', { type: 'button', onclick: () => { S.changeEl(S.selEls()[0], e => { e.assetId = e.seq.ids[0]; delete e.seq; }); renderInspector(); } }, ic('undo'), 'Back to a single photo')),
      ], 'More'),
      h('p.hint', null, 'Tip: pick all your photos in one go — they play in the order of their file names. Jiggle shifts each frame a hair, like it was placed by hand.'),
    ], true, { collapsible: false });
  }
  function imageInspector(el) {
    const T = 'sel';
    const fs = el.frame.style || 'none';
    const bordered = BORDER_FRAMES.includes(fs);
    const allFrames = !!moreOpen.get('frames-all');
    const isVid = R.isVideoAsset(el.assetId);
    if (el.seq && el.seq.ids && el.seq.ids.length) return [stopMotionSection(el), ...imageLookSections(el)];
    return [
      sec(isVid ? 'Video' : 'Photo', [
        full(h('div.btn-row', null,
          h('button.btn.grow', { type: 'button', title: 'Photos and videos both work', onclick: () => S.pickImages({ replaceId: el.id }) }, ic('replace'), el.assetId ? 'Replace' : 'Add photo or video'),
          el.assetId ? h('button.btn.grow', { type: 'button', onclick: () => S.startCrop(el.id) }, ic('crop'), 'Crop') : null)),
        el.assetId && !isVid ? bgRemovalControls(el) : null,
        el.assetId ? null : row('Tint', colorCtl(T, 'placeholder.0', { set: (v, live) => S.changeEl(S.selEls()[0], e => { e.placeholder = [v, (e.placeholder || [])[1] || '#cfc5b1']; }, live) })),
        el.assetId ? more('photo-pos', [
          row('Zoom', num(T, 'crop.zoom', { min: 1, max: 5, step: 0.01, slider: true })),
          row('Pan X', num(T, 'crop.x', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
          row('Pan Y', num(T, 'crop.y', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
          toggle(T, 'crop.fit', isVid ? 'Show the whole video (fit)' : 'Show the whole photo (fit)'),
          full(h('button.btn', { type: 'button', onclick: () => { S.setBackgroundImage(el.assetId); toast('Set as background'); } }, ic('bgimg'), 'Use as canvas background')),
        ], 'Zoom & position') : null,
        (() => {
          const els = S.doc.elements, i = els.findIndex(e => e.id === el.id);
          const fl = els.slice(i + 1).find(e => e.type === 'flashes' && baseUnder(e) === el);
          return fl ? full(h('button.link-btn.flash-link', { type: 'button', onclick: () => S.select([fl.id]) }, ic('film'), 'Edit the speed flashes on top')) : null;
        })(),
        el.assetId && !isVid ? full(h('button.link-btn.flash-link', { type: 'button', title: 'Add more photos to this layer and play them frame by frame', onclick: () => makeStopMotion(el) }, ic('film'), 'Make it a stop motion')) : null,
      ], true, { collapsible: false }),
      isVid ? videoSection(el) : studioSection(el),
      ...imageLookSections(el),
    ];
  }
  function imageLookSections(el) {
    const T = 'sel';
    const fs = el.frame.style || 'none';
    const bordered = BORDER_FRAMES.includes(fs);
    const allFrames = !!moreOpen.get('frames-all');
    return [
      el.assetId ? sec('Look', [full(filterThumbs(el, 'sel'))], true) : null,
      el.assetId ? adjustSection(T, 'filters') : null,
      el.assetId ? filmSection(T, 'filters') : null,
      blurSection(T, 'filters'),
      sec('Frame', [
        full(frameTiles(el, allFrames ? 0 : 8)),
        allFrames ? null : full(h('button.link-btn', { type: 'button', onclick: () => { moreOpen.set('frames-all', true); renderInspector(); } }, `All ${Object.keys(R.FRAMES).length} frames`)),
        fs !== 'none' ? row('Colour', colorCtl(T, 'frame.color')) : null,
        fs !== 'none' ? row(CUT_FRAMES.includes(fs) ? (fs === 'mirror' ? 'Line' : 'Gap') : bordered ? 'Border' : 'Edge', num(T, 'frame.size', { min: 0, max: 200, slider: true })) : null,
        fs === 'strips' || fs === 'mosaic' ? row(fs === 'strips' ? 'Strips' : 'Tiles across', num(T, 'frame.count', { min: 2, max: fs === 'strips' ? 30 : 16, slider: true, def: fs === 'strips' ? 6 : 5 })) : null,
        CUT_FRAMES.includes(fs) ? row(fs === 'mirror' ? 'Copies' : 'Shift', num(T, 'frame.amount', { min: 0, max: 100, slider: true, def: 50 })) : null,
        fs === 'strips' || fs === 'mosaic' ? full(h('button.btn', { type: 'button', onclick: () => S.change(T, 'frame.seed', Math.floor(Math.random() * 1e5)) }, ic('shuffle'), fs === 'strips' ? 'Shuffle the strips' : 'Shuffle the tiles')) : null,
        fs !== 'none' ? more('frame-more', [
          ['rounded', 'border', 'polaroid', 'ticket'].includes(fs) ? row('Radius', num(T, 'frame.radius', { min: 0, max: 400, slider: true })) : null,
          fs === 'gate' ? row('Corners', num(T, 'frame.round', { min: -60, max: 200, slider: true, def: 0 })) : null,
          fs === 'gate' ? row('Soft edge', num(T, 'frame.soft', { min: 0, max: 100, slider: true, def: 40 })) : null,
          fs === 'polaroid' ? row('Bottom', num(T, 'frame.bottom', { min: 1, max: 8, step: 0.1, slider: true, unit: '×' })) : null,
          fs === 'scan' || fs === 'slide' ? row(fs === 'scan' ? 'Edge print' : 'Label', inputCtl(T, 'frame.label', { placeholder: fs === 'scan' ? 'FILM 400' : 'SUMMER · 1978' })) : null,
          fs === 'scan' || fs === 'slide' ? row(fs === 'scan' ? 'Frame no.' : 'Slide no.', num(T, 'frame.num', { min: 0, max: 99, def: fs === 'scan' ? 14 : 12 })) : null,
          fs === 'scan' || fs === 'slide' ? row('Print colour', colorCtl(T, 'frame.textColor', { def: fs === 'scan' ? '#f2a33a' : '#2d2822' })) : null,
          fs === 'filed' ? row('Roughness', num(T, 'frame.rough', { min: 0, max: 300, scale: 100, slider: true, unit: '%', def: 1 })) : null,
          fs === 'filed' ? full(h('button.btn', { type: 'button', onclick: () => S.change(T, 'frame.seed', Math.floor(Math.random() * 1e5)) }, ic('shuffle'), 'New edge')) : null,
          bordered ? row('Paper', num(T, 'frame.texture', { min: 0, max: 100, slider: true })) : null,
        ]) : null,
      ], fs !== 'none' || !el.assetId),
    ];
  }

  function stickerInspector(el) {
    const T = 'sel';
    const def = R.stickerDef(el.stickerId);
    const cols = def ? def.colors : [];
    if (!el.colors || el.colors.length !== cols.length) el.colors = cols.slice();
    if (!cols.length) return [];
    return [sec('Colours', [
      h('div.swatch-line', null, swatchRow(cols.map((c, i) => [`Colour ${i + 1}`, () => (S.selEls()[0].colors || cols)[i],
        (v, live) => S.changeEl(S.selEls()[0], e => { if (!e.colors || e.colors.length !== cols.length) e.colors = cols.slice(); e.colors[i] = v; }, live)])),
      h('button.link-btn', { type: 'button', onclick: () => { S.change(T, 'colors', cols.slice()); renderInspector(); } }, 'Reset')),
    ], true, { collapsible: false })];
  }

  function shapeInspector(el) {
    const T = 'sel';
    const k = el.shape;
    if (k === 'line') {
      return [sec('Line', [
        row('Colour', colorCtl(T, 'stroke')),
        row('Weight', num(T, 'strokeWidth', { min: 1, max: 80, slider: true })),
        full(h('div.btn-row', null,
          styleToggle('arrowStart', 'backward', 'Arrow at start', 'Start arrow'),
          styleToggle('arrowEnd', 'forward', 'Arrow at end', 'End arrow'))),
        more('line-more', [row('Dashes', num(T, 'dash', { min: 0, max: 6, step: 0.5, slider: true })), toggle(T, 'wavy', 'Wavy line')]),
      ], true, { collapsible: false })];
    }
    const opts = Object.entries(R.SHAPES).filter(([v]) => v !== 'line').map(([v, s]) => [v, s.label]);
    const grad = el.gradient && el.gradient !== 'none';
    const extra = [];
    if (['rect', 'rounded', 'triangle', 'pentagon', 'hexagon', 'star', 'ticket', 'speech'].includes(k)) extra.push(row('Corners', num(T, 'radius', { min: 0, max: 400, slider: true })));
    if (['star', 'burst', 'scallop', 'flower'].includes(k)) extra.push(row('Points', num(T, 'points', { min: 3, max: 40, slider: true })));
    if (['star', 'burst'].includes(k)) extra.push(row('Inner', num(T, 'inner', { min: 10, max: 95, scale: 100, slider: true, unit: '%' })));
    if (['scallop', 'flower'].includes(k)) extra.push(row('Depth', num(T, 'depth', { min: 1, max: 50, scale: 100, slider: true, unit: '%' })));
    if (k === 'torn') {
      const sides = (el.tornSides || 'trbl');
      extra.push(row('Torn edges', h('div.seg', null, [['t', 'Top'], ['r', 'Right'], ['b', 'Bottom'], ['l', 'Left']].map(([c, l]) => h('button' + (sides.includes(c) ? '.on' : ''), {
        type: 'button', onclick: () => { const cur = S.selEls()[0].tornSides || 'trbl'; let nx = cur.includes(c) ? cur.replace(c, '') : cur + c; if (!nx) nx = c; S.change(T, 'tornSides', 'trbl'.split('').filter(x => nx.includes(x)).join('')); renderInspector(); },
      }, l)))));
    }
    if (['torn', 'notebook'].includes(k)) extra.push(row('Torn rim', colorCtl(T, 'rim', { allowNone: true })));
    if (['blob', 'torn', 'notebook'].includes(k)) extra.push(full(h('button.btn', { type: 'button', onclick: () => S.change(T, 'seed', Math.floor(Math.random() * 1000)) }, ic('shuffle'), 'Shuffle shape')));
    return [
      sec('Shape', [
        row('Shape', selectCtl(T, 'shape', opts, { set: v => { S.change(T, 'shape', v); renderInspector(); } })),
        row('Fill', colorCtl(T, 'fill', { allowNone: true })),
        ...extra.slice(0, 2),
        more('shape-more', [
          ...extra.slice(2),
          row('Gradient', selectCtl(T, 'gradient', [['none', 'None'], ['linear', 'Linear'], ['radial', 'Radial']], { set: v => { S.change(T, 'gradient', v); renderInspector(); } })),
          grad ? row('To', colorCtl(T, 'fill2')) : null,
          grad ? row('Angle', num(T, 'gradAngle', { min: 0, max: 360, slider: true, unit: '°' })) : null,
          row('Stroke', colorCtl(T, 'stroke', { allowNone: true })),
          row('Stroke W', num(T, 'strokeWidth', { min: 0, max: 60, step: 0.5, slider: true })),
          row('Dashes', num(T, 'dash', { min: 0, max: 6, step: 0.5, slider: true })),
        ], 'Gradient & stroke'),
      ], true, { collapsible: false }),
      sec('Texture', [
        row('Pattern', selectCtl(T, 'pattern.type', Object.entries(R.PATTERNS), { set: v => { S.change(T, 'pattern.type', v); renderInspector(); } })),
        el.pattern && el.pattern.type !== 'none' ? row('Colour', colorCtl(T, 'pattern.color')) : null,
        el.pattern && el.pattern.type !== 'none' ? row('Size', num(T, 'pattern.size', { min: 4, max: 300, slider: true })) : null,
        row('Paper grain', num(T, 'texture', { min: 0, max: 100, slider: true })),
        row('Crumpled', num(T, 'crumple', { min: 0, max: 100, slider: true, def: 0 })),
      ], !!(el.texture || el.crumple || (el.pattern && el.pattern.type !== 'none'))),
    ];
  }

  function calendarInspector(el) {
    const T = 'sel';
    const lay = el.layout || 'grid';
    const months = R.MONTHS.map((m, i) => [i, m]);
    const miniCal = () => {
      const e = S.selEls()[0];
      const first = new Date(e.year, e.month, 1).getDay();
      const off = e.startMonday ? (first + 6) % 7 : first;
      const days = new Date(e.year, e.month + 1, 0).getDate();
      const names = e.startMonday ? 'MTWTFSS' : 'SMTWTFS';
      const grid = h('div.mini-cal', null, [...names].map(n => h('span', null, n)));
      for (let i = 0; i < off; i++) grid.append(h('span'));
      const marked = new Set(e.marked || []);
      for (let d = 1; d <= days; d++) {
        const on = (lay === 'grid' || lay === 'minimal') ? marked.has(d) : (lay === 'strip' || lay === 'page') ? e.day === d : false;
        grid.append(h('button' + (on ? '.on' : ''), {
          type: 'button',
          onclick: () => {
            if (lay === 'page' || lay === 'strip') {
              if (lay === 'strip' && e.day !== d) S.change(T, 'day', d);
              else if (lay === 'strip') { const m = new Set(e.marked || []); m.has(d) ? m.delete(d) : m.add(d); S.change(T, 'marked', [...m]); }
              else S.change(T, 'day', d);
            } else {
              const m = new Set(e.marked || []); m.has(d) ? m.delete(d) : m.add(d);
              S.change(T, 'marked', [...m].sort((a, b) => a - b));
            }
            calHolder.replaceChildren(miniCal());
          },
        }, d));
      }
      return grid;
    };
    const calHolder = h('div', null, miniCal());
    const relayout = v => { S.change(T, 'layout', v); renderInspector(); };
    return [
      sec('Calendar', [
        full(seg(T, 'layout', [['grid', 'Grid'], ['minimal', 'Minimal'], ['strip', 'Week'], ['page', 'Date']], { set: relayout })),
        two(selectCtl(T, 'month', months, { number: true, set: v => { S.change(T, 'month', v); calHolder.replaceChildren(miniCal()); } }), num(T, 'year', { min: 1900, max: 2200, step: 1, set: (v, live) => { S.change(T, 'year', Math.round(v), live); if (!live) calHolder.replaceChildren(miniCal()); } })),
        h('div.hint', null, lay === 'page' ? 'Pick the date to show' : lay === 'strip' ? 'Pick the highlighted day — click again to add a dot' : 'Tap days to mark them'),
        full(calHolder),
        lay !== 'page' ? row('Mark', selectCtl(T, 'markStyle', [['circle', 'Filled circle'], ['ring', 'Ring'], ['scribble', 'Scribble circle'], ['heart', 'Heart'], ['star', 'Star'], ['flower', 'Flower'], ['square', 'Square'], ['cross', 'Cross out']])) : null,
        h('div.swatch-line', null, h('span.sub-label', null, 'Colours'), swatchRow([
          ['Text', () => val(T, 'color'), (v, l) => S.change(T, 'color', v, l)],
          ['Accent', () => val(T, 'accent'), (v, l) => S.change(T, 'accent', v, l)],
          ['On accent', () => val(T, 'accentText'), (v, l) => S.change(T, 'accentText', v, l)],
          ['Cells', () => val(T, 'cellColor'), (v, l) => S.change(T, 'cellColor', v, l)],
          ['Background', () => val(T, 'bgColor'), (v, l) => S.change(T, 'bgColor', v, l)],
        ])),
      ], true, { collapsible: false }),
      sec('Typography', [
        label('Title & numbers'),
        full(fontCtl(T, 'titleFont', 'titleWeight')),
        label('Labels & days'),
        full(fontCtl(T, 'bodyFont', 'bodyWeight')),
        lay !== 'page' ? toggle(T, 'showTitle', 'Show month title') : null,
        lay !== 'page' ? toggle(T, 'showYear', 'Show year') : null,
        lay !== 'page' ? row('Title', seg(T, 'titleAlign', [['left', 'tl', 'Left'], ['center', 'tc', 'Centre']])) : null,
        row('Case', seg(T, 'monthCase', [['normal', 'Aa'], ['upper', 'AA']])),
        lay === 'grid' || lay === 'minimal' ? row('Weekdays', seg(T, 'dayFormat', [['initial', 'M'], ['short', 'MON'], ['long', 'Mon…']])) : null,
        lay === 'grid' || lay === 'minimal' ? row('Title size', num(T, 'titleSize', { min: 5, max: 40, scale: 100, slider: true, unit: '%' })) : null,
        row('Tracking', num(T, 'titleSpacing', { min: -10, max: 60, scale: 100, slider: true, unit: '%' })),
      ], false),
      lay === 'grid' || lay === 'minimal' ? sec('Grid', [
        lay === 'grid' ? toggle(T, 'showLines', 'Grid lines') : null,
        lay === 'grid' ? row('Lines', colorCtl(T, 'lineColor', { allowNone: true })) : null,
        toggle(T, 'showWeekdays', 'Weekday names', { get: () => S.selEls()[0].showWeekdays !== false }),
        toggle(T, 'startMonday', 'Week starts Monday', { set: v => { S.change(T, 'startMonday', v); renderInspector(); } }),
        toggle(T, 'headerLine', 'Rule under weekdays'),
        toggle(T, 'weekendAccent', 'Accent weekends'),
        toggle(T, 'showAdjacent', 'Show neighbouring days'),
        lay === 'grid' ? row('Numbers', seg(T, 'numberPos', [['center', 'Centre'], ['corner', 'Left'], ['corner-right', 'Right']])) : null,
        row('Number size', num(T, 'numberScale', { min: 20, max: 200, scale: 100, slider: true, unit: '%', def: 1 })),
        row('Cell radius', num(T, 'cellRadius', { min: 0, max: 50, scale: 100, slider: true, unit: '%' })),
        row('Corner', num(T, 'radius', { min: 0, max: 200, slider: true })),
      ], false) : null,
    ];
  }

  function badgeInspector() {
    const T = 'sel';
    const el = S.selEls()[0];
    return [
      sec('Ring text', [
        full(inputCtl(T, 'ringText', { placeholder: 'Text around the circle' })),
        full(fontCtl(T, 'ringFont', 'ringWeight')),
        row('Colour', colorCtl(T, 'textColor')),
        row('Size', num(T, 'ringSize', { min: 3, max: 25, step: 0.5, scale: 100, slider: true, unit: '%' })),
        more('badge-ring', [
          row('Spacing', num(T, 'ringSpacing', { min: -10, max: 80, scale: 100, slider: true, unit: '%' })),
          row('Radius', num(T, 'ringRadius', { min: 30, max: 100, scale: 100, slider: true, unit: '%' })),
          row('Rotate', num(T, 'ringStart', { min: -180, max: 180, slider: true, unit: '°' })),
          toggle(T, 'ringFill', 'Spread around full circle'),
          toggle(T, 'ringRepeat', 'Repeat text'),
          toggle(T, 'ringUpper', 'Uppercase'),
        ]),
      ], true, { collapsible: false }),
      sec('Badge', [
        row('Shape', selectCtl(T, 'shape', [['circle', 'Circle'], ['scallop', 'Scallop'], ['flower', 'Flower'], ['burst', 'Starburst'], ['none', 'None']])),
        row('Fill', colorCtl(T, 'fill', { allowNone: true })),
        row('Centre', selectCtl(T, 'center', [['asterisk', 'Asterisk'], ['star', 'Star'], ['sparkle', 'Sparkle'], ['heart', 'Heart'], ['flower', 'Flower'], ['text', 'Text'], ['none', 'Nothing']], { set: v => { S.change(T, 'center', v); renderInspector(); } })),
        el.center === 'text' ? full(textCtl(T, 'centerText', { rows: 2 })) : null,
        more('badge-more', [
          el.center === 'text' ? full(fontCtl(T, 'centerFont', 'centerWeight')) : null,
          row('Centre size', num(T, 'centerSize', { min: 5, max: 80, scale: 100, slider: true, unit: '%' })),
          row('Centre col.', colorCtl(T, 'centerColor')),
          row('Border', colorCtl(T, 'borderColor')),
          row('Border W', num(T, 'borderWidth', { min: 0, max: 40, slider: true })),
          toggle(T, 'innerRing', 'Inner ring line'),
        ]),
      ], false),
    ];
  }

  function checklistInspector() {
    const T = 'sel';
    return [
      sec('Checklist', [
        full(textCtl(T, 'items', { rows: 5 })),
        h('div.hint', null, 'One item per line. Start a line with [x] to tick it.'),
        full(fontCtl(T, 'fontFamily', 'fontWeight')),
        two(num(T, 'fontSize', { label: 'Size', min: 6, max: 400 }), num(T, 'lineHeight', { label: 'Line', min: 1, max: 4, step: 0.05 })),
        row('Boxes', seg(T, 'boxStyle', [['square', '□'], ['round', '▢'], ['circle', '○'], ['heart', '♡'], ['star', '☆']])),
        h('div.swatch-line', null, h('span.sub-label', null, 'Colours'), swatchRow([
          ['Text', () => val(T, 'fill'), (v, l) => S.change(T, 'fill', v, l)],
          ['Boxes', () => val(T, 'boxColor'), (v, l) => S.change(T, 'boxColor', v, l)],
          ['Tick', () => val(T, 'checkColor'), (v, l) => S.change(T, 'checkColor', v, l)],
        ])),
        more('check-more', [
          toggle(T, 'fillChecked', 'Fill ticked boxes'),
          toggle(T, 'strikeChecked', 'Strike through done items'),
          toggle(T, 'dimChecked', 'Fade done items'),
          toggle(T, 'ruled', 'Ruled lines'),
        ]),
      ], true, { collapsible: false }),
    ];
  }

  function ribbonInspector(el) {
    const T = 'sel';
    const custom = !!el.points;
    const presets = Object.entries(R.RIBBON_PATHS);
    const pathTiles = h('div.path-grid', null, presets.map(([k, p]) => {
      const demo = S.mk('ribbon', { path: k, width: 72, height: 40, thickness: el.line ? 3 : 9, line: false, text: '', color: 'currentColor' });
      demo.color = '#5b4cf5';
      const c = elThumb(demo, 64, 36, 6);
      return h('button.path-tile' + (!custom && el.path === k ? '.on' : ''), { type: 'button', title: p.label, onclick: () => { S.changeEl(S.selEls()[0], e => { e.path = k; e.points = null; e.closed = false; e.sharp = false; }); renderInspector(); } }, c);
    }));
    return [
      sec('Path', [
        full(pathTiles),
        full(h('div.btn-row', null,
          h('button.btn.grow', { type: 'button', onclick: () => S.startPathEdit(el.id) }, ic('edit'), 'Edit points'),
          custom ? h('button.btn', { type: 'button', title: 'Back to the preset shape', onclick: () => { S.changeEl(S.selEls()[0], e => { e.points = null; }); renderInspector(); } }, ic('undo'), 'Reset') : null)),
        row('Style', seg(T, 'line', [[false, 'Band'], [true, 'Line']], { set: v => { S.changeEl(S.selEls()[0], e => { e.line = v; if (v && e.thickness > 20) e.thickness = 4; if (!v && e.thickness < 20) e.thickness = 80; }); renderInspector(); } })),
        row('Colour', colorCtl(T, 'color', { allowNone: true })),
        row(el.line ? 'Weight' : 'Thickness', num(T, 'thickness', { min: 0.5, max: 400, slider: true })),
        more('rib-more', [
          full(h('div.btn-row', null, styleToggle('arrowStart', 'backward', 'Arrow at start', 'Start arrow'), styleToggle('arrowEnd', 'forward', 'Arrow at end', 'End arrow'))),
          row('Ends', seg(T, 'ends', [['round', 'Round'], ['flat', 'Flat']])),
          row('Dashes', num(T, 'dash', { min: 0, max: 6, step: 0.25, slider: true })),
          el.line ? null : row('Border', colorCtl(T, 'border.color')),
          el.line ? null : row('Border W', num(T, 'border.width', { min: 0, max: 40, slider: true })),
        ], 'Arrows, ends & border'),
      ], true, { collapsible: false }),
      sec('Text on path', [
        full(textCtl(T, 'text', { rows: 2, placeholder: 'Type the words that run along the path' })),
        full(fontCtl(T, 'fontFamily', 'fontWeight')),
        two(weightCtl(T, 'fontFamily', 'fontWeight'), num(T, 'fontSize', { label: 'Size', min: 4, max: 600 })),
        row('Colour', colorCtl(T, 'textColor')),
        toggle(T, 'repeat', 'Repeat along the whole path'),
        more('rib-text', [
          row('Letters', num(T, 'letterSpacing', { min: -10, max: 80, step: 0.5, scale: 100, slider: true, unit: '%' })),
          row('Slide', num(T, 'offset', { min: -100, max: 100, scale: 100, slider: true, unit: '%' })),
          row('Raise', num(T, 'textShift', { min: -100, max: 100, scale: 100, slider: true, unit: '%' })),
          el.repeat ? row('Between', inputCtl(T, 'sep', { placeholder: '   ✦   ' })) : null,
          toggle(T, 'uppercase', 'Uppercase'),
          toggle(T, 'flip', 'Run the other way'),
        ], 'Spacing & direction'),
      ], !!el.text || !el.line),
    ];
  }

  // take the photo or video off the canvas background (undo brings it back)
  function removeBgPhoto() {
    const vid = R.isVideoAsset(S.doc.background.assetId);
    S.change('doc', 'background.assetId', null);
    renderInspector(); renderPanel();
    toast(vid ? 'Background video removed' : 'Background photo removed', { label: 'Undo', run: () => { S.undo(); renderInspector(); renderPanel(); } });
  }
  // the photo or video an overlay plays over: the nearest big photo layer below it, else the canvas background
  function baseUnder(el) {
    const els = S.doc.elements, i = els.findIndex(e => e.id === el.id), area = S.doc.width * S.doc.height;
    for (let j = i - 1; j >= 0; j--) { const e = els[j]; if (e.type === 'image' && !e.hidden && e.width * e.height >= area * 0.35) return e; }
    return null;
  }
  function underneathSection(el) {
    const base = baseUnder(el), bgId = S.doc.background.assetId;
    const id = base ? base.assetId : bgId;
    const vid = id && R.isVideoAsset(id);
    const thumb = id ? assetThumb(id) : h('span.under-ph', { style: base && base.placeholder ? { background: `linear-gradient(135deg, ${base.placeholder[0]}, ${base.placeholder[1]})` } : null }, ic('image'));
    const replace = () => (base ? S.pickImages({ replaceId: base.id }) : S.pickImages({ asBackground: true }));
    return sec('Underneath', [
      h('button.under-card', { type: 'button', title: 'Replace with your own photo or video', onclick: replace },
        h('span.under-thumb', null, thumb),
        h('span.under-text', null,
          h('b', null, id ? (vid ? 'Your video' : base && /^demo-/.test(id) ? 'Demo photo' : 'Your photo') : 'Add your photo or video'),
          h('small', null, id ? (base && /^demo-/.test(id) ? 'Swap in your own photo or video' : 'Plays under the flashes') : 'It plays under the flashes'))),
      full(h('div.btn-row', null,
        h('button.btn.primary.grow', { type: 'button', onclick: replace }, ic('replace'), id ? 'Replace photo or video' : 'Add photo or video'),
        base ? h('button.btn', { type: 'button', title: 'Select it to crop, filter or trim', onclick: () => S.select([base.id]) }, ic('cursor'), 'Edit') : null,
        !base && bgId ? h('button.btn', { type: 'button', title: 'Remove the background photo', 'aria-label': 'Remove the background photo', onclick: removeBgPhoto }, ic('trash')) : null)),
    ], true, { collapsible: false });
  }
  function flashesInspector(el) {
    const T = 'sel', F = window.StudioFlashes || { PACKS: {}, IMG: {} };
    const packTile = (k, label, src) => h('button.flash-pack' + ((el.pack || 'hustle') === k ? '.on' : ''), { type: 'button', title: label, onclick: () => { S.change(T, 'pack', k); renderInspector(); } },
      h('span.flash-pack-img', { style: src ? { backgroundImage: `url(${src})` } : null }, src ? null : ic('image')), h('span', null, label));
    const packs = Object.entries(F.PACKS).map(([k, p]) => packTile(k, p.label, (F.IMG[p.ids[0]] || {}).src));
    packs.push(packTile('mine', 'Only mine', (el.images || []).length ? S.assets[el.images[0]] : null));
    const mine = (el.images || []).filter(id => S.assets[id]);
    const addMine = () => S.pickImages({ uploadOnly: true, imagesOnly: true, onAdded: added => {
      const cur = S.selEls()[0];
      if (!cur || cur.type !== 'flashes') return;
      S.changeEl(cur, e => { e.images = [...(e.images || []), ...added.filter(a => !a.video).map(a => a.id)]; });
      renderInspector();
    } });
    const mineRow = h('div.flash-mine', null,
      mine.map(id => h('span.flash-mine-item', { style: { backgroundImage: `url(${S.assets[id]})` } },
        h('button', { type: 'button', title: 'Remove from the flashes', onclick: () => { S.changeEl(S.selEls()[0], e => { e.images = (e.images || []).filter(x => x !== id); }); renderInspector(); } }, ic('x')))),
      h('button.flash-mine-add', { type: 'button', title: 'Add your own photos to the flashes', onclick: addMine }, ic('plus')));
    const tone = el.tone || 'color';
    return [underneathSection(el), sec('Speed flashes', [
      label('Photos'),
      full(h('div.flash-packs', null, packs)),
      h('div.sub-label', null, (el.pack === 'mine' ? 'Your photos' : 'Add your own to the mix')),
      full(mineRow),
      label('Motion'),
      row('Speed', num(T, 'rate', { min: 2, max: 20, slider: true, unit: '/s' })),
      row('Blur', num(T, 'blur', { min: 0, max: 100, slider: true })),
      row('Direction', num(T, 'angle', { min: -90, max: 90, slider: true, unit: '°' })),
      label('Mix'),
      row('Strength', num(T, 'opacity', { min: 5, max: 100, scale: 100, slider: true, unit: '%' })),
      full(seg(T, 'blend', [['screen', 'Light'], ['overlay', 'Punchy'], ['soft-light', 'Soft'], ['normal', 'Solid']], { get: () => S.selEls()[0].blend || 'normal' })),
      full(seg(T, 'tone', [['color', 'Colour'], ['mono', 'Mono'], ['tint', 'Tint']], { set: v => { S.change(T, 'tone', v); renderInspector(); } })),
      tone === 'tint' ? row('Tint', colorCtl(T, 'tint')) : null,
      more('flash-more', [
        row('Drift', num(T, 'drift', { min: 0, max: 100, slider: true })),
        row('Push in', num(T, 'zoom', { min: 0, max: 100, slider: true })),
        row('Overlap', num(T, 'overlap', { min: 0, max: 80, slider: true, unit: '%' })),
        row('Flash', num(T, 'strobe', { min: 0, max: 100, slider: true, unit: '%' })),
        row('Gaps', num(T, 'gaps', { min: 0, max: 80, slider: true, unit: '%' })),
        row('Contrast', num(T, 'contrast', { min: -50, max: 80, slider: true })),
        row('Still shows', num(T, 'still', { min: 0, max: 40, step: 1, slider: true })),
        full(h('button.btn', { type: 'button', onclick: () => S.change(T, 'seed', ((S.selEls()[0].seed || 0) + 1) % 1000) }, ic('shuffle'), 'Shuffle the order')),
      ], 'More'),
      h('p.hint', null, 'Plays when you preview or export a video. Keep it above your photo or video and under the text. Overlap blends two photos at once; Flash adds a white pop on every cut; Gaps let your own shot show through.'),
    ], true, { collapsible: false })];
  }
  function cameraInspector(el) {
    const T = 'sel';
    const st = el.style || 'iphone';
    return [sec('Overlay', [
      full(seg(T, 'style', [['iphone', 'Phone'], ['camcorder', 'Camcorder'], ['minimal', 'Viewfinder']], { set: v => { S.change(T, 'style', v); renderInspector(); } })),
      toggle(T, 'grid', 'Grid lines'),
      toggle(T, 'lens', 'Wide-lens black edge'),
      h('div.swatch-line', null, h('span.sub-label', null, 'Colours'), swatchRow([
        ['Interface', () => val(T, 'color'), (v, l) => S.change(T, 'color', v, l)],
        ['Highlight', () => val(T, 'accent'), (v, l) => S.change(T, 'accent', v, l)],
        ['Lens edge', () => val(T, 'lensColor'), (v, l) => S.change(T, 'lensColor', v, l)],
      ])),
      more('cam-more', st === 'iphone' ? [
        row('Modes', inputCtl(T, 'modes', { placeholder: 'VIDEO, PHOTO, PORTRAIT' })),
        row('Selected', num(T, 'activeMode', { min: 0, max: 10, step: 1 })),
        row('Zooms', inputCtl(T, 'zooms', { placeholder: '0.5, 1×, 2' })),
        row('Selected', num(T, 'activeZoom', { min: 0, max: 10, step: 1 })),
        toggle(T, 'brackets', 'Frame corners'),
        toggle(T, 'thumb', 'Last-photo thumbnail'),
      ] : st === 'camcorder' ? [
        row('Top left', inputCtl(T, 'rec')), row('Top right', inputCtl(T, 'timecode')),
        row('Bottom left', inputCtl(T, 'date')), row('Bottom right', inputCtl(T, 'mode')),
        toggle(T, 'scanlines', 'Scan lines'),
      ] : [row('Label', inputCtl(T, 'zoomLabel', { placeholder: '1×' }))], 'Labels'),
      h('div.hint', null, 'Tip: give the photo underneath the Fisheye look for the wide-lens feel.'),
    ], true, { collapsible: false })];
  }

  function natureInspector(el) {
    const T = 'sel';
    const N = window.StudioNature;
    const def = N && N.KINDS[el.kind];
    if (!def) return [];
    const cols = def.colors || [];
    if (!el.colors || el.colors.length !== cols.length) el.colors = cols.slice();
    const names = def.colorNames || [];
    const P = def.params || {};
    const pget = k => (S.selEls()[0][k] ?? P[k]);
    const params = [];
    const NAMES = { profile: 'Shape', bloom: 'Flowers', blooms: 'Blooms', clouds: 'Clouds', grain: 'Grain', softness: 'Softness' };
    const OPT_NAMES = { left: 'Rises left', right: 'Rises right', dome: 'Dome', double: 'Rolling', flat: 'Flat', cluster: 'Clusters', daisy: 'Daisies', spike: 'Spikes' };
    for (const k of Object.keys(P)) {
      const lbl = NAMES[k] || (k[0].toUpperCase() + k.slice(1));
      const opts = def.options && def.options[k];
      if (opts) params.push(row(lbl, selectCtl(T, k, opts.map(o => [o, OPT_NAMES[o] || o]), { def: P[k], set: v => S.change(T, k, v) })));
      else if (typeof P[k] === 'number') {
        const big = P[k] > 1;
        params.push(row(lbl, num(T, k, { min: 0, max: 100, scale: big ? 1 : 100, slider: true, unit: big ? '' : '%', get: () => pget(k) })));
      }
    }
    return [sec(def.label, [
      h('div.swatch-line', null, swatchRow(cols.map((c, i) => [names[i] || `Colour ${i + 1}`, () => (S.selEls()[0].colors || cols)[i],
        (v, live) => S.changeEl(S.selEls()[0], e => { if (!e.colors || e.colors.length !== cols.length) e.colors = cols.slice(); e.colors[i] = v; }, live)])),
      h('button.link-btn', { type: 'button', onclick: () => { S.change(T, 'colors', cols.slice()); renderInspector(); } }, 'Reset')),
      ...params,
      row('Density', num(T, 'density', { min: 20, max: 200, scale: 100, slider: true, unit: '%', def: 1 })),
      full(h('button.btn', { type: 'button', onclick: () => S.change(T, 'seed', Math.floor(Math.random() * 1e5)) }, ic('shuffle'), 'Shuffle')),
    ], true, { collapsible: false })];
  }

  const SHADOWS = {
    soft: { on: true, style: 'drop', color: '#000000', opacity: 0.22, blur: 30, x: 0, y: 14 },
    lifted: { on: true, style: 'drop', color: '#000000', opacity: 0.35, blur: 12, x: 0, y: 6 },
    hard: { on: true, style: 'drop', color: '#1d1b18', opacity: 1, blur: 0, x: 10, y: 10 },
    glow: { on: true, style: 'drop', color: '#fff36b', opacity: 0.9, blur: 30, x: 0, y: 0 },
  };
  function effectsSection(el) {
    const T = 'sel';
    const sh = el.shadow || {};
    const isCast = sh.on && sh.style === 'cast';
    const presetOf = () => { const s = S.selEls()[0]?.shadow || {}; for (const [k, p] of Object.entries(SHADOWS)) if (p.blur === s.blur && p.x === s.x && p.y === s.y && p.opacity === s.opacity) return k; return 'custom'; };
    const set = (path, v) => S.change(T, path, v);
    const items = [
      {
        label: 'Drop shadow', icon: 'square', on: sh.on && !isCast,
        add: () => S.change(T, 'shadow', Object.assign({}, sh, SHADOWS.soft)), remove: () => set('shadow.on', false),
        body: () => [
          full(seg(T, 'shadow', [['soft', 'Soft'], ['lifted', 'Lift'], ['hard', 'Hard'], ['glow', 'Glow']], { get: presetOf, set: v => { S.change(T, 'shadow', Object.assign({}, S.selEls()[0].shadow, SHADOWS[v])); renderInspector(); } })),
          row('Colour', colorCtl(T, 'shadow.color')),
          more('fx-shadow', [
            row('Strength', num(T, 'shadow.opacity', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
            row('Blur', num(T, 'shadow.blur', { min: 0, max: 120, slider: true })),
            row('Offset X', num(T, 'shadow.x', { min: -100, max: 100, slider: true })),
            row('Offset Y', num(T, 'shadow.y', { min: -100, max: 100, slider: true })),
          ], 'Blur & offset'),
        ],
      },
      {
        label: 'Ground shadow', icon: 'sun', on: isCast, hidden: el.type === 'text' || el.type === 'camera',
        add: () => S.change(T, 'shadow', { on: true, style: 'cast', color: '#000000', angle: 50, length: 0.45, blur: 12, opacity: 0.4, x: 0, y: 0 }), remove: () => set('shadow.on', false),
        body: () => [
          row('Angle', num(T, 'shadow.angle', { min: -80, max: 80, slider: true, unit: '°', def: 50 })),
          row('Length', num(T, 'shadow.length', { min: 5, max: 150, scale: 100, slider: true, unit: '%', def: 0.45 })),
          row('Softness', num(T, 'shadow.blur', { min: 0, max: 80, slider: true })),
          row('Strength', num(T, 'shadow.opacity', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
          row('Lift', num(T, 'shadow.y', { min: -400, max: 400, slider: true })),
        ],
      },
      el.type === 'text' ? {
        label: 'Outline', icon: 'circle', on: el.stroke && el.stroke.width > 0,
        add: () => S.change(T, 'stroke.width', Math.max(2, Math.round(el.fontSize * 0.04))), remove: () => set('stroke.width', 0),
        body: () => [row('Colour', colorCtl(T, 'stroke.color')), row('Width', num(T, 'stroke.width', { min: 0.5, max: 40, step: 0.5, slider: true }))],
      } : null,
      el.type === 'text' ? {
        label: '3D / hard shadow', icon: 'layers', on: el.echo && el.echo.on,
        add: () => set('echo.on', true), remove: () => set('echo.on', false),
        body: () => [
          row('Colour', colorCtl(T, 'echo.color')),
          row('Depth', num(T, 'echo.steps', { min: 1, max: 30, step: 1, slider: true })),
          more('fx-echo', [
            row('Offset X', num(T, 'echo.dx', { min: -50, max: 50, step: 0.5, scale: 100, slider: true, unit: '%' })),
            row('Offset Y', num(T, 'echo.dy', { min: -50, max: 50, step: 0.5, scale: 100, slider: true, unit: '%' })),
          ], 'Offset'),
        ],
      } : null,
      ...(['text', 'sticker', 'shape', 'ribbon'].includes(el.type) ? [
        {
          label: 'Thermal blur', icon: 'sun', on: el.tfx && el.tfx.style === 'thermal',
          add: () => { S.change(T, 'tfx', { style: 'thermal', amount: 50, palette: 'thermal', move: false }); renderInspector(); }, remove: () => S.change(T, 'tfx', null),
          body: () => [
            full(seg(T, 'tfx.palette', Object.entries(R.THERMAL_PALETTES).slice(0, 4).map(([k, p]) => [k, p.label.split(' ')[0]]), { def: 'thermal' })),
            row('Heat', num(T, 'tfx.amount', { min: 0, max: 100, slider: true, def: 50 })),
            more('fx-thermal', [
              row('Colours', selectCtl(T, 'tfx.palette', Object.entries(R.THERMAL_PALETTES).map(([k, p]) => [k, p.label]), { def: 'thermal' })),
              toggle(T, 'tfx.move', 'Shimmer in videos'),
            ], 'More'),
          ],
        },
        {
          label: 'Ink bleed', icon: 'drop', on: el.tfx && el.tfx.style === 'ink',
          add: () => { S.change(T, 'tfx', { style: 'ink', amount: 50, rough: 50, speckle: 50, smear: 25, angle: 30 }); renderInspector(); }, remove: () => S.change(T, 'tfx', null),
          body: () => [
            row('Bleed', num(T, 'tfx.amount', { min: 0, max: 100, slider: true, def: 50 })),
            row('Speckle', num(T, 'tfx.speckle', { min: 0, max: 100, slider: true, def: 50 })),
            more('fx-ink', [
              row('Rough edge', num(T, 'tfx.rough', { min: 0, max: 100, slider: true, def: 50 })),
              row('Smear', num(T, 'tfx.smear', { min: 0, max: 100, slider: true, def: 25 })),
              row('Smear angle', num(T, 'tfx.angle', { min: -180, max: 180, slider: true, unit: '°', def: 30 })),
              full(h('button.btn', { type: 'button', onclick: () => S.change(T, 'tfx.seed', Math.floor(Math.random() * 1e5)) }, ic('shuffle'), 'New pattern')),
            ], 'More'),
          ],
        },
      ] : []),
      el.type === 'sticker' || (el.type === 'image' && (el.frame.style || 'none') === 'none' && el.assetId) ? {
        label: 'Die-cut border', icon: 'sticker', on: el.outline && el.outline.on,
        add: () => set('outline.on', true), remove: () => set('outline.on', false),
        body: () => [
          row('Style', selectCtl(T, 'outline.style', Object.entries(R.OUTLINE_STYLES), { def: 'smooth' })),
          row('Colour', colorCtl(T, 'outline.color')),
          row('Width', num(T, 'outline.width', { min: 1, max: 80, slider: true })),
        ],
      } : null,
      el.type !== 'image' && el.type !== 'camera' ? {
        label: 'Blur', icon: 'drop', on: R.hasLayerBlur(el),
        add: () => { S.change(T, 'tblur', { blur: 12 }); renderInspector(); },
        remove: () => { if (S.isEditingSpots()) S.endBlurSpots(); S.change(T, 'tblur', null); renderInspector(); },
        body: () => blurControls(T, 'tblur', { noun: el.type === 'text' ? 'text' : 'layer', onNone: () => { S.change(T, 'tblur', null); renderInspector(); } }),
      } : null,
      {
        // the older plain layer blur: kept for photos, and for other layers that already use it
        label: 'Layer blur', icon: 'circle', on: !!(el.lblur && (el.lblur.gauss > 0 || el.lblur.motion > 0)), hidden: el.type === 'camera' || (el.type !== 'image' && !(el.lblur && (el.lblur.gauss > 0 || el.lblur.motion > 0))),
        add: () => S.change(T, 'lblur', { gauss: 6, motion: 0, angle: 0 }), remove: () => S.change(T, 'lblur', null),
        body: () => [
          row('Blur', num(T, 'lblur.gauss', { min: 0, max: 60, step: 0.5, slider: true, def: 0 })),
          row('Motion', num(T, 'lblur.motion', { min: 0, max: 200, slider: true, def: 0 })),
          row('Direction', num(T, 'lblur.angle', { min: -90, max: 90, slider: true, unit: '°', def: 0 })),
        ],
      },
      el.erase && el.erase.length ? {
        label: 'Erased areas', on: true, remove: () => S.clearErase(el.id),
        body: () => [full(h('button.btn', { type: 'button', onclick: () => S.setTool('erase') }, ic('eraser'), 'Keep erasing'))],
      } : null,
    ];
    return addSec('Effects', items.filter(Boolean));
  }

  // motion tracking: pin a layer to something in a video — it follows its move, size and turn
  let trackJob = null;
  async function runTrack(el, src, pick) {
    if (trackJob) return;
    if (S.isPlaying && S.isPlaying()) S.pause();
    S.endTrackPick();
    S.seek(null); // the still frame is the reference the layer was placed on
    const ctrl = new AbortController();
    trackJob = { id: el.id, src, p: 0, ctrl };
    renderInspector();
    try {
      const region = pick && pick.pts && pick.pts.length ? { mode: pick.mode, pts: pick.pts } : null;
      const tr = await S.trackLayer(el, { src, region, signal: ctrl.signal, onProgress: p => { trackJob.p = p; const bar = $('.track-progress > div'); if (bar) bar.style.width = Math.round(p * 100) + '%'; } });
      const cur = S.doc.elements.find(e => e.id === el.id);
      if (cur) { S.changeEl(cur, e => { e.track = tr; }); S.commit(); }
      toast('Pinned — press play to see it stick');
    } catch (err) {
      if (err.name !== 'AbortError') { console.error(err); toast(err.message || 'Tracking failed'); }
    }
    trackJob = null;
    renderInspector(); updateTimeline();
  }
  const PICK_MODES = [['point', 'Point', 'A single spot'], ['object', 'Object', 'A thing — click it to find it, or drag a box'], ['edge', 'Edge', 'A line, like the edge of a table or a door'], ['plane', 'Plane', 'A flat surface — the layer follows its perspective too']];
  function trackControls(el, sources) {
    const T = 'sel';
    if (trackJob && trackJob.id === el.id) return [
      h('p.hint', null, 'Following it through the video…'),
      full(h('div.progress.track-progress', null, h('div', { style: { width: Math.round(trackJob.p * 100) + '%' } }))),
      full(h('button.btn', { type: 'button', onclick: () => trackJob && trackJob.ctrl.abort() }, 'Cancel')),
    ];
    const tr = el.track || {}, pick = el.trackPick || null, src = (pick && pick.src) || tr.src || sources[0][0];
    const mode = (pick && pick.mode) || tr.pick || 'object', picking = S.isPicking(), picked = !!(pick && pick.pts && pick.pts.length);
    const startPick = m => { S.changeEl(el, e => { e.trackPick = { mode: m, src, pts: e.trackPick && e.trackPick.mode === m ? e.trackPick.pts : [] }; }); S.commit(); S.startTrackPick(el.id, m, src); renderInspector(); };
    const what = { point: 'the point', object: 'the object', edge: 'the edge', plane: 'the surface' }[tr.pick || mode];
    return [
      label('Stick to'),
      full(seg(T, 'trackPick.mode', PICK_MODES, { get: () => mode, set: m => startPick(m) })),
      h('p.hint', null, picking ? { point: 'Click the spot on the video. Drag to make the tracked area bigger.', object: 'Click the object to find it, or drag a box around it.', edge: 'Drag along the edge, end to end.', plane: 'Drag a box over the surface, then move its corners onto the surface’s corners.' }[mode]
        : R.isTracked(el) ? `Pinned to ${what} — it moves, grows and turns with it. Put the layer anywhere: it keeps its place relative to ${what}.`
        : picked ? 'Picked. Now track it through the video.' : 'Pick what it should stick to on the video.'),
      sources.length > 1 ? row('Video', selectCtl(T, 'trackPick.src', sources, { get: () => src, set: v => { S.changeEl(el, e => { e.trackPick = Object.assign({}, e.trackPick || { mode, pts: [] }, { src: v }); }); S.commit(); renderInspector(); } })) : null,
      full(h('div.btn-row', null,
        picking ? h('button.btn.grow', { type: 'button', onclick: () => { S.endTrackPick(); renderInspector(); } }, ic('check'), 'Done picking')
          : h('button.btn.grow', { type: 'button', onclick: () => startPick(mode) }, ic('target'), picked ? 'Adjust pick' : 'Pick on video'),
        h('button.btn.grow' + (picked && !R.isTracked(el) ? '.primary' : ''), { type: 'button', disabled: !picked, onclick: () => runTrack(S.selEls()[0], src, S.selEls()[0].trackPick) }, ic('film'), R.isTracked(el) ? 'Track again' : 'Track'))),
      R.isTracked(el) ? row('Steady', num(T, 'track.steady', { min: 0, max: 100, slider: true, def: 10, set: (v, l) => S.change(T, 'track.steady', v, l) })) : null,
      R.isTracked(el) && tr.mode !== 'plane' ? toggle(T, 'track.scale', 'Follow size', { get: () => (S.selEls()[0].track || {}).scale !== false, set: v => S.change(T, 'track.scale', v) }) : null,
      R.isTracked(el) && tr.mode !== 'plane' ? toggle(T, 'track.rotate', 'Follow turn', { get: () => (S.selEls()[0].track || {}).rotate !== false, set: v => S.change(T, 'track.rotate', v) }) : null,
      R.isTracked(el) && tr.mode !== 'plane' ? toggle(T, 'track.blur', 'Motion blur on fast moves', { get: () => (S.selEls()[0].track || {}).blur !== false, set: v => S.change(T, 'track.blur', v) }) : null,
      R.isTracked(el) ? full(h('button.btn', { type: 'button', onclick: () => { S.seek(0); S.play(); } }, ic('play'), 'Preview')) : null,
    ];
  }
  function motionSection(el) {
    const T = 'sel';
    const an = el.anim || {};
    const loop = an.loop || 'none', enter = an.enter || 'none';
    const setA = (k, v, live) => { S.change(T, 'anim.' + k, v, live); if (!live && (k === 'loop' || k === 'enter')) renderInspector(); updateTimeline(); };
    const isPath = el.type === 'ribbon';
    const loops = Object.entries(R.ANIM_LOOPS).filter(([k]) => k !== 'none' && (k !== 'flow' || isPath));
    const TEXT_ONLY = ['typewriter', 'slam', 'lettersUp', 'lettersDrop', 'lettersFade', 'lettersBounce', 'captions', 'roll', 'words', 'build', 'shuffle', 'sweep', 'wall'];
    const enters = Object.entries(R.ANIM_ENTER).filter(([k]) => k !== 'none' && (!TEXT_ONLY.includes(k) || el.type === 'text') && (k !== 'draw' || isPath));
    const start = (k, v) => { S.change(T, 'anim', Object.assign({ speed: 1, amount: 1, delay: 0 }, S.selEls()[0].anim || {}, { [k]: v })); updateTimeline(); S.play(); };
    const tm = el.time || {};
    const words = [...new Set((el.text || '').split(/\s+/).map(w => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(w => w.length > 1))].slice(0, 40);
    const marks = (el.typing && el.typing.marks) || [];
    const isMarked = w => marks.some(m => m.toLowerCase() === w.toLowerCase());
    const toggleMark = w => { const cur = (S.selEls()[0].typing.marks || []).slice(); const i = cur.findIndex(m => m.toLowerCase() === w.toLowerCase()); if (i >= 0) cur.splice(i, 1); else cur.push(w); S.change(T, 'typing.marks', cur); renderInspector(); };
    const sources = S.trackSources().filter(([id]) => id !== el.id);
    return addSec('Motion', [
      el.type !== 'camera' && !(el.type === 'image' && R.isVideoAsset(el.assetId)) ? {
        label: 'Pin to video (tracking)', icon: 'target', on: R.isTracked(el) || !!el.trackPick || (trackJob && trackJob.id === el.id), hidden: !sources.length,
        add: () => { S.changeEl(el, e => { e.trackPick = { mode: 'object', src: sources[0][0], pts: [] }; }); S.commit(); S.startTrackPick(el.id, 'object', sources[0][0]); renderInspector(); },
        remove: () => { if (trackJob && trackJob.id === el.id) trackJob.ctrl.abort(); S.endTrackPick(); S.change(T, 'track', null); S.change(T, 'trackPick', null); renderInspector(); },
        body: () => trackControls(el, sources),
      } : null,
      el.type === 'text' ? {
        label: 'Typing', icon: 'type', on: !!el.typing,
        add: () => { S.change(T, 'typing', { caret: true, marks: [], style: 'select' }, true); if ((S.selEls()[0].anim || {}).enter !== 'typewriter') start('enter', 'typewriter'); else S.commit(); },
        remove: () => { S.change(T, 'typing', null); if (enter === 'typewriter') setA('enter', 'none'); },
        body: () => [
          h('div.sub-label', null, 'Highlight words — tap to pick'),
          words.length ? h('div.chips.tight.word-chips', null, words.map(w => h('button.chip' + (isMarked(w) ? '.on' : ''), { type: 'button', onclick: () => toggleMark(w) }, w))) : h('p.hint', null, 'Type some text first.'),
          row('Style', seg(T, 'typing.style', [['select', 'Select'], ['marker', 'Marker'], ['underline', 'Line']], { set: v => { S.change(T, 'typing.style', v); S.change(T, 'typing.color', null); renderInspector(); } })),
          row('Colour', colorCtl(T, 'typing.color', { allowNone: true })),
          toggle(T, 'typing.caret', 'Blinking cursor', { get: () => S.selEls()[0].typing && S.selEls()[0].typing.caret !== false, set: v => S.change(T, 'typing.caret', v) }),
          more('typing-more', [
            row('Speed', num(T, 'anim.speed', { min: 0.25, max: 4, step: 0.05, slider: true, def: 1, unit: '×', set: (v, l) => setA('speed', v, l) })),
            row('Starts at', num(T, 'anim.delay', { min: 0, max: 20, step: 0.05, slider: true, def: 0, unit: 's', set: (v, l) => setA('delay', v, l) })),
            row('Phrase', inputCtl(T, 'typing.marksText', { placeholder: 'e.g. every day' })),
            h('p.hint', null, 'Type a phrase above (comma between several) to highlight more than one word at a time.'),
            row('Handles', colorCtl(T, 'typing.handle')),
            row('Cursor', colorCtl(T, 'typing.caretColor')),
            full(h('button.btn', { type: 'button', onclick: () => { S.seek(0); S.play(); } }, ic('play'), 'Preview')),
          ], 'Speed, phrases & colours'),
        ],
      } : null,
      {
        label: 'Entrance', icon: 'forward', on: enter !== 'none',
        add: () => start('enter', isPath ? 'draw' : el.type === 'text' ? 'rise' : 'pop'), remove: () => setA('enter', 'none'),
        body: () => [
          row('Style', selectCtl(T, 'anim.enter', enters, { def: 'pop', set: v => { setA('enter', v); S.touchAll(); } })),
          row('Delay', num(T, 'anim.delay', { min: 0, max: 10, step: 0.05, slider: true, def: 0, unit: 's', set: (v, l) => setA('delay', v, l) })),
          ['captions', 'roll', 'words', 'typewriter', 'build', 'shuffle', 'sweep', 'wall'].includes(enter) || /^letters|slam/.test(enter) ? row('Speed', num(T, 'anim.speed', { min: 0.25, max: 4, step: 0.05, slider: true, def: 1, unit: '×', set: (v, l) => setA('speed', v, l) })) : null,
          enter === 'roll' ? toggle(T, 'anim.accel', 'Speed up as it goes') : null,
          ['captions', 'roll'].includes(enter) ? h('p.hint', null, 'Put one item per line in the text — each line takes its turn.') : enter === 'words' ? h('p.hint', null, 'Each word of the text takes its turn.') : null,
          enter === 'build' ? h('p.hint', null, 'Words join one at a time, popping up from below; the line re-centres as it grows.') : null,
          enter === 'shuffle' ? h('p.hint', null, 'The words slide about their lines with motion blur, then settle into place.') : null,
          ...(enter === 'sweep' ? [
            h('p.hint', null, 'A text selection is dragged across the words; the line slides along so the cursor stays in view.'),
            row('Highlight', colorCtl(T, 'sweep.color', { def: '#f0c419' })),
            row('Selected text', colorCtl(T, 'sweep.ink', { def: '#4a1d00' })),
            toggle(T, 'sweep.cursor', 'Show the cursor', { get: () => (S.selEls()[0].sweep || {}).cursor !== false, set: v => S.change(T, 'sweep.cursor', v) }),
            toggle(T, 'sweep.follow', 'Follow the cursor', { get: () => (S.selEls()[0].sweep || {}).follow !== false, set: v => S.change(T, 'sweep.follow', v) }),
          ] : []),
          ...(enter === 'wall' ? [
            h('p.hint', null, 'Type the words with commas between them. They fill the layer as a wall, and one lights up at a time.'),
            row('Lit word', fontCtl(T, 'wall.fontFamily', 'wall.fontWeight')),
            row('Lit colour', colorCtl(T, 'wall.color', { def: '#ffffff' })),
            row('Lit size', num(T, 'wall.scale', { min: 0.8, max: 2, step: 0.02, slider: true, def: 1.12, unit: '×' })),
            row('Each word', num(T, 'wall.beat', { min: 0.12, max: 1.5, step: 0.02, slider: true, def: 0.36, unit: 's' })),
          ] : []),
        ],
      },
      {
        label: 'Loop', icon: 'shuffle', on: loop !== 'none',
        add: () => start('loop', isPath && el.text ? 'flow' : el.type === 'text' ? 'sway' : 'float'), remove: () => setA('loop', 'none'),
        body: () => [
          row('Style', selectCtl(T, 'anim.loop', loops, { def: 'float', set: v => setA('loop', v) })),
          loop === 'drift' ? h('p.hint', null, 'Glides steadily over the whole video — how far across and down it travels:') : null,
          loop === 'drift' ? row('Across', num(T, 'anim.dx', { min: -4000, max: 4000, step: 10, slider: true, def: -300, unit: 'px', set: (v, l) => setA('dx', v, l) })) : null,
          loop === 'drift' ? row('Down', num(T, 'anim.dy', { min: -4000, max: 4000, step: 10, slider: true, def: 0, unit: 'px', set: (v, l) => setA('dy', v, l) })) : null,
          loop !== 'drift' ? row('Speed', num(T, 'anim.speed', { min: 0.25, max: 4, step: 0.05, slider: true, def: 1, unit: '×', set: (v, l) => setA('speed', v, l) })) : null,
          loop !== 'spin' && loop !== 'blink' && loop !== 'flow' && loop !== 'drift' ? row('Amount', num(T, 'anim.amount', { min: 0.1, max: 4, step: 0.05, slider: true, def: 1, unit: '×', set: (v, l) => setA('amount', v, l) })) : null,
          more('motion-more', [
            loop === 'spin' || loop === 'flow' ? toggle(T, 'anim.reverse', 'Reverse direction') : null,
            toggle(T, 'anim.sync', 'Start in sync with other layers'),
          ]),
        ],
      },
      {
        label: 'Show / hide timing', icon: 'film', on: R.hasTiming(el),
        add: () => { S.change(T, 'time', { start: 1, end: null }); updateTimeline(); }, remove: () => { S.change(T, 'time', null); updateTimeline(); },
        body: () => [
          row('Appears at', num(T, 'time.start', { min: 0, max: 60, step: 0.05, slider: true, def: 0, unit: 's' })),
          row('Leaves at', num(T, 'time.end', { min: 0, max: 60, step: 0.05, slider: true, def: 0, unit: 's', set: (v, l) => S.change(T, 'time.end', v > 0 ? v : null, l) })),
          tm.cycle && tm.cycle.count > 1 ? h('p.hint', null, `Takes turns with ${tm.cycle.count - 1} other layer${tm.cycle.count > 2 ? 's' : ''}, ${Math.round((tm.cycle.slot || 0.15) * 100) / 100}s each — this is how match cuts flicker.`) : null,
          tm.cycle && tm.cycle.count > 1 ? row('Each shot', num(T, 'time.cycle.slot', { min: 0.04, max: 2, step: 0.01, slider: true, unit: 's' })) : null,
          h('p.hint', null, 'Leave “Leaves at” at 0 to keep it until the end. Great for cuts: show one layer, then swap it for another.'),
        ],
      },
    ]);
  }
  // Typing phrases typed in the "Phrase" box become highlight marks too
  S.on('values', path => {
    if (path !== 'typing.marksText') return;
    const el = S.selEls()[0];
    if (!el || !el.typing) return;
    const extra = String(el.typing.marksText || '').split(',').map(x => x.trim()).filter(Boolean);
    const words = (el.typing.marks || []).filter(m => !/\s/.test(m));
    el.typing.marks = [...words, ...extra];
    S.redraw();
  });

  function alignGrid() {
    return h('div.align-grid', null,
      [['left', 'alignL', 'Align left'], ['hcenter', 'alignC', 'Centre horizontally'], ['right', 'alignR', 'Align right'],
        ['top', 'alignT', 'Align top'], ['vcenter', 'alignM', 'Centre vertically'], ['bottom', 'alignB', 'Align bottom']]
        .map(([op, i, t]) => h('button', { type: 'button', title: t, onclick: () => S.align(op) }, ic(i))));
  }
  function arrangeSection(el) {
    const T = 'sel';
    const ratioLocked = el.type === 'sticker' || el.type === 'badge';
    const setW = (v, live) => S.changeEl(S.selEls()[0], e => { const r = e.height / e.width; if (e.type === 'text') { e.autoWidth = false; } e.width = Math.max(4, v); if (ratioLocked) e.height = e.width * r; }, live);
    const setH = (v, live) => S.changeEl(S.selEls()[0], e => { const r = e.width / e.height; e.height = Math.max(4, v); if (ratioLocked) e.width = e.height * r; }, live);
    const sizeEditable = el.type !== 'text' && el.type !== 'checklist';
    return sec('Position', [
      alignGrid(),
      two(num(T, 'x', { label: 'X', step: 1, soft: true }), num(T, 'y', { label: 'Y', step: 1, soft: true })),
      two(num(T, 'width', { label: 'W', min: 4, set: setW }), sizeEditable ? num(T, 'height', { label: 'H', min: 4, set: setH }) : num(T, 'height', { label: 'H', set: () => {} })),
      two(num(T, 'rotation', { label: '∠', unit: '°', step: 1, soft: true, set: (v, live) => S.change(T, 'rotation', ((v % 360) + 360) % 360 > 180 ? ((v % 360) + 360) % 360 - 360 : ((v % 360) + 360) % 360, live) }),
        h('div.btn-row', null, h('button.btn.icon', { type: 'button', title: 'Flip horizontal (⇧H)', onclick: () => S.flip('x') }, ic('flipH')),
          h('button.btn.icon', { type: 'button', title: 'Flip vertical (⇧V)', onclick: () => S.flip('y') }, ic('flipV')))),
      h('div.btn-row', null,
        h('button.btn.icon', { type: 'button', title: 'Bring to front (⇧⌘])', onclick: () => S.order('front') }, ic('front')),
        h('button.btn.icon', { type: 'button', title: 'Bring forward (⌘])', onclick: () => S.order('forward') }, ic('forward')),
        h('button.btn.icon', { type: 'button', title: 'Send backward (⌘[)', onclick: () => S.order('backward') }, ic('backward')),
        h('button.btn.icon', { type: 'button', title: 'Send to back (⇧⌘[)', onclick: () => S.order('back') }, ic('back'))),
    ], false);
  }

  function multiInspector(els) {
    // all text (or all shapes): their controls change every selected layer at once
    const one = els.every(e => e.type === els[0].type) ? els[0].type : null;
    const shared = one === 'text' ? textInspector(els[0], { multi: true }) : one === 'shape' && els.every(e => e.shape !== 'line') === (els[0].shape !== 'line') ? shapeInspector(els[0]) : [];
    return [
      h('div.insp-head', null, h('h2', null, one === 'text' ? `${els.length} text layers` : `${els.length} layers`)),
      layerRow(),
      one === 'text' ? h('p.hint.multi-hint', null, 'Changes apply to all selected text.') : null,
      one === 'image' ? sec('Photos', [full(h('button.btn.primary', { type: 'button', onclick: () => S.fillSlots(S.selEls()) }, ic('image'), `Replace these ${els.length} with your photos`))], true, { collapsible: false }) : null,
      ...shared,
      sec('Arrange', [
        alignGrid(),
        els.length >= 3 ? h('div.btn-row', null, h('button.btn.grow', { type: 'button', onclick: () => S.distribute('x') }, ic('distH'), 'Space across'), h('button.btn.grow', { type: 'button', onclick: () => S.distribute('y') }, ic('distV'), 'Space down')) : null,
        h('div.btn-row', null,
          h('button.btn.icon', { type: 'button', title: 'Bring to front', onclick: () => S.order('front') }, ic('front')),
          h('button.btn.icon', { type: 'button', title: 'Bring forward', onclick: () => S.order('forward') }, ic('forward')),
          h('button.btn.icon', { type: 'button', title: 'Send backward', onclick: () => S.order('backward') }, ic('backward')),
          h('button.btn.icon', { type: 'button', title: 'Send to back', onclick: () => S.order('back') }, ic('back')),
          h('button.btn.icon', { type: 'button', title: 'Lock', onclick: () => S.toggleLock() }, ic('lock'))),
      ], true, { collapsible: false }),
      motionSectionMulti(els),
    ];
  }
  function motionSectionMulti(els) {
    return sec('Motion', [
      h('div.hint', null, 'Give every selected layer the same move.'),
      full(h('div.chips.tight', null, [['float', 'Float'], ['jiggle', 'Jiggle'], ['wiggle', 'Wiggle'], ['bounce', 'Bounce'], ['none', 'None']].map(([k, l]) => h('button.chip', { type: 'button', onclick: () => { for (const e of S.selEls()) e.anim = Object.assign({ enter: 'none', speed: 1, amount: 1 }, e.anim || {}, { loop: k }); S.touchAll(); S.commit(); updateTimeline(); if (k !== 'none') S.play(); } }, l)))),
    ], false);
  }

  const CAM_DEFAULTS = {
    pushin: { zoom: 1.6, start: 0, dur: 5, blur: 0.2 }, pullback: { zoom: 3.5, start: 0, dur: 1.8, rotate: 6, blur: 0.8 },
    whip: { zoom: 2.4, start: 0.8, dur: 0.5, rotate: 5, blur: 1 }, snap: { zoom: 2, start: 1.2, dur: 3, blur: 0.6, shake: 0.4 },
    crash: { zoom: 2.6, start: 0.6, dur: 2.4, rotate: 4, blur: 0.9 }, follow: { zoom: 3.5, start: 0.8, dur: 0.45, blur: 0.5, shake: 0.15 },
    cuts: { zoom: 3.4, start: 0, dur: 1.6, rotate: 5, blur: 0, shake: 0.3 }, drift: { zoom: 1.15, rotate: 1.5, shake: 0.5, blur: 0.2 },
    pan: { zoom: 1.4, start: 0, dur: 5, blur: 0.4 }, tilt: { zoom: 1.2, start: 0, dur: 5, rotate: 7, blur: 0.2 },
    jolt: { zoom: 1.3, rotate: 2, cut: 0.2, wander: 1, blur: 0.4 }, spiral: { zoom: 2, start: 0, dur: 2, rotate: 25, blur: 0.6 },
  };
  function camTargetDefault(move) {
    const els = S.doc.elements;
    const typed = els.find(e => e.type === 'text' && (e.typing || (e.anim && e.anim.enter === 'typewriter')));
    const pick = (move === 'follow' && typed) || els.filter(e => e.type === 'image' && e.width < S.doc.width * 0.95).sort((a, b) => b.width * b.height - a.width * a.height)[0] || typed || null;
    return pick ? (pick.key || pick.id) : '';
  }
  function setCameraMove(move) {
    if (move === 'none') { S.change('doc', 'camera', null); }
    else {
      const prev = S.doc.camera || {};
      S.change('doc', 'camera', Object.assign({ move, target: prev.target || camTargetDefault(move), start: 0, dur: 1.5, zoom: 2, rotate: 0, shake: 0, blur: 0.5 }, CAM_DEFAULTS[move] || {}, { move }, prev.target ? { target: prev.target } : {}, prev.keys ? { keys: prev.keys } : {}));
      S.seek(0); S.play();
    }
    renderInspector(); updateTimeline(); updateTop();
  }
  S.setCameraMove = setCameraMove;
  // type & cut: the typing pace, how close the camera rides the caret, and the clips that cut in between words
  function typeCutControls(c) {
    const T = 'doc', clips = S.doc.elements.filter(e => e.cutin);
    const P = R.typePlan(S.doc), used = P ? new Set(P.phases.filter(p => p.kind === 'cut').map(p => p.id)) : new Set();
    const typed = S.doc.elements.find(e => e.id === c.target || e.key === c.target);
    const words = typed ? String(typed.text || '').trim().split(/\s+/).filter(Boolean).length : 0;
    const setLive = (path, v, live) => { S.change(T, path, v, live); if (!live) { S.syncTypeLength(); updateTimeline(); } };
    const addClips = () => S.pickImages({ uploadOnly: true, onAdded: added => {
      added.forEach(a => S.addElement({ type: 'image', x: 0, y: 0, width: S.doc.width, height: S.doc.height, assetId: a.id, cutin: true, layoutSlot: true, name: 'Clip ' + (S.doc.elements.filter(e => e.cutin).length + 1), video: a.video ? { trim: 0, speed: 1, loop: true } : undefined }, { center: false, select: false, commit: false }));
      S.commit(); renderInspector(); updateTimeline();
      R.preload(S.doc).then(() => renderInspector());
    } });
    const thumb = e => { const im = e.assetId && R.assetImage(e.assetId), cv = h('canvas.clip-thumb', { width: 64, height: 40 }); if (im) { const m = R.mediaSize(im), k = Math.max(64 / m.w, 40 / m.h); cv.getContext('2d').drawImage(im, (64 - m.w * k) / 2, (40 - m.h * k) / 2, m.w * k, m.h * k); } return cv; };
    return [
      h('p.hint', null, `Types the text with a natural rhythm while the camera rides the caret, then pulls back to show it all. Change the words any time — the video's length follows (${S.doc.anim.duration}s now).`),
      row('Typing speed', num(T, 'camera.cps', { min: 3, max: 30, slider: true, unit: '/s', def: 10, set: (v, l) => setLive('camera.cps', v, l) })),
      row('Zoom', num(T, 'camera.zoom', { min: 1, max: 6, step: 0.05, slider: true, unit: '×', def: 2.6, set: (v, l) => setLive('camera.zoom', v, l) })),
      row('End hold', num(T, 'camera.hold', { min: 0, max: 6, step: 0.1, slider: true, unit: 's', def: 1.8, set: (v, l) => setLive('camera.hold', v, l) })),
      toggle(T, 'camera.phrases', 'One phrase at a time', { get: () => !!S.doc.camera.phrases, set: v => { S.change(T, 'camera.phrases', v); S.syncTypeLength(); updateTimeline(); renderInspector(); } }),
      c.phrases ? h('p.hint', null, 'Each line of the text is typed on an empty screen, then the shot cuts to the next line.') : null,
      c.phrases ? null : more('typecut-clips', [
      row('Clip length', num(T, 'camera.cut', { min: 0.3, max: 4, step: 0.1, slider: true, unit: 's', def: 1, set: (v, l) => setLive('camera.cut', v, l) })),
      ...clips.map((e, i) => h('div.clip-row', null, thumb(e), h('span.clip-name', null, (e.name || 'Clip ' + (i + 1)) + (used.has(e.id) ? '' : ' · not used')),
        h('button.icon-btn', { type: 'button', title: 'Replace with a photo or video', onclick: () => S.pickImages({ replaceId: e.id }) }, ic('bgimg')),
        h('button.icon-btn', { type: 'button', title: 'Remove this clip', onclick: () => { S.select([e.id]); S.removeSelected(); S.commit(); S.select([]); renderInspector(); updateTimeline(); } }, ic('trash')))),
      clips.length > Math.max(0, words - 1) ? h('p.hint', null, 'There are more clips than breaks between words, so the last ones wait until you add words.') : null,
      full(h('button.btn', { type: 'button', onclick: addClips }, ic('plus'), 'Add photos or videos')),
      ], clips.length ? `Clips between words (${clips.length})` : 'Cut to photos or videos (optional)'),
    ];
  }
  function cameraSection() {
    const c = S.doc.camera;
    const moves = Object.entries(R.CAMERA_MOVES).filter(([k]) => k !== 'none' && (k !== 'keys' || (c && c.keys && c.keys.length)));
    const add = h('button.sec-add', { type: 'button', title: 'Add a camera move', onclick: e => menu(e.currentTarget, moves.map(([k, l]) => ({ label: l, icon: 'film', run: () => setCameraMove(k) }))) }, ic(c && c.move ? 'more' : 'plus'));
    if (!c || !c.move || c.move === 'none') return sec('Camera', [], true, { collapsible: false, actions: add });
    const D = S.doc.anim.duration;
    const focusOpts = [['', 'Centre of the canvas'], ...S.doc.elements.slice().reverse().filter(e => !e.hidden).map(e => [e.key || e.id, S.elLabel(e).slice(0, 30)])];
    const T = 'doc';
    return sec('Camera', [
      row('Move', selectCtl(T, 'camera.move', moves, { set: v => setCameraMove(v) })),
      c.move === 'keys' ? h('p.hint', null, 'This camera path came with the template: it glides, whips and pushes in between the words.') : null,
      ...(c.move === 'typecut' ? typeCutControls(c) : []),
      !['keys', 'typecut'].includes(c.move) ? row('Focus on', selectCtl(T, 'camera.target', focusOpts, { set: v => S.change(T, 'camera.target', v || null) })) : null,
      !['keys', 'typecut'].includes(c.move) ? row('Zoom', num(T, 'camera.zoom', { min: 1, max: 8, step: 0.05, slider: true, unit: '×' })) : null,
      !['drift', 'jolt', 'keys', 'typecut'].includes(c.move) ? row('Starts at', num(T, 'camera.start', { min: 0, max: D, step: 0.05, slider: true, unit: 's' })) : null,
      !['drift', 'jolt', 'follow', 'keys', 'typecut'].includes(c.move) ? row('Lasts', num(T, 'camera.dur', { min: 0.1, max: 30, step: 0.05, slider: true, unit: 's' })) : null,
      c.move === 'jolt' ? row('Cut every', num(T, 'camera.cut', { min: 0.05, max: 2, step: 0.01, slider: true, unit: 's' })) : null,
      more('camera-more', [
        ['keys', 'typecut'].includes(c.move) ? null : row('Tilt', num(T, 'camera.rotate', { min: -40, max: 40, step: 0.5, slider: true, unit: '°' })),
        row('Handheld', num(T, 'camera.shake', { min: 0, max: 3, step: 0.05, slider: true, def: 0 })),
        row('Motion blur', num(T, 'camera.blur', { min: 0, max: 100, scale: 100, slider: true, unit: '%', def: 0 })),
        c.move === 'jolt' ? row('Wander', num(T, 'camera.wander', { min: 0, max: 100, scale: 100, slider: true, unit: '%', def: 1 })) : null,
        row('Video length', num(T, 'anim.duration', { min: 1, max: 60, step: 0.5, slider: true, unit: 's', set: (v, live) => { S.change(T, 'anim.duration', v, live); updateTimeline(); } })),
      ], 'Tilt, shake & blur'),
      full(h('div.btn-row', null,
        h('button.btn.grow', { type: 'button', onclick: () => { S.seek(0); S.play(); } }, ic('play'), 'Preview'),
        h('button.btn', { type: 'button', onclick: () => setCameraMove('none') }, ic('trash'), 'Remove'))),
    ], true, { collapsible: false, actions: null });
  }
  // every piece of text in a video, editable without touching the canvas
  function videoTextSection() {
    if (!S.hasAnimation()) return null;
    const items = S.doc.elements.filter(e => !e.hidden && ((e.type === 'text' && String(e.text || '').trim()) || (e.type === 'ribbon' && e.text)));
    if (!items.length) return null;
    const label = e => {
      if (e.name) return e.name;
      if (e.type === 'ribbon') return 'Ribbon text';
      const en = (e.anim || {}).enter || '';
      const m = { captions: 'Captions', roll: 'Rolling values', words: 'Word by word', typewriter: 'Typed text', left: 'Slides in from the left', right: 'Slides in from the right', rise: 'Slides up', drop: 'Drops in', fade: 'Fades in', pop: 'Pops in', zoom: 'Zooms in', wipe: 'Wipes in' }[en];
      if (m) return m;
      if (/^letters|^slam/.test(en)) return 'Animated letters';
      if (e.time && e.time.start > 0) return `Appears at ${e.time.start}s`;
      return 'Text';
    };
    return sec('Text in this video', [
      h('p.hint', null, 'Type here — the animation updates as you go. Click a label to select that layer.'),
      ...items.slice().reverse().map(e => h('div.video-text-item', null,
        h('button.link-btn.vt-label', { type: 'button', onclick: () => S.select([e.id]) }, label(e)),
        elTextBox(e, { rows: Math.min(6, Math.max(1, String(e.text || '').split('\n').length)), hint: e.type === 'ribbon' ? 'Runs along the ribbon.' : undefined }))),
    ], true, { key: 'video-text-all' });
  }
  function sizeName(w, hh) { const m = SIZES.find(([, a, b]) => a === w && b === hh); return m ? m[0] : 'Custom'; }
  function canvasInspector() {
    const T = 'doc';
    const d = S.doc;
    const bg = d.background;
    const o = d.overlay || {};
    const grad = bg.gradient && bg.gradient !== 'none';
    const fin = (label, path, max = 100, extra) => ({
      label, on: !!S.getPath(d, path), add: () => S.change(T, path, extra ? extra.def : 30), remove: () => S.change(T, path, 0),
      body: () => [row('Amount', num(T, path, { min: 0, max, slider: true, def: 0 })), ...(extra && extra.body ? extra.body() : [])],
    });
    return [
      h('div.insp-head', null, h('h2', null, 'Canvas')),
      sec('Background', [
        full(h('button.size-btn', { type: 'button', onclick: () => openSizeModal() }, h('span', null, sizeName(d.width, d.height)), h('small', null, `${d.width} × ${d.height}`), ic('resize'))),
        toggle(T, 'background.none', 'No background (see-through)', { set: v => { S.change(T, 'background.none', v); S.commit(); renderInspector(); } }),
        bg.none ? h('p.hint', null, 'Nothing is painted behind your layers. PNG and WEBP images and WEBM videos export see-through, ready to drop over other footage. Grain and other finishes only touch the layers.') : null,
        bg.none ? null : row('Colour', colorCtl(T, 'background.color')),
        bg.none ? null : full(h('div.btn-row', null,
          h('button.btn.grow', { type: 'button', onclick: () => setTab('background') }, ic('palette'), 'Backgrounds'),
          h('button.btn.grow', { type: 'button', title: 'Photos and videos both work', onclick: () => S.pickImages({ asBackground: true }) }, ic('bgimg'), bg.assetId ? 'Replace' : 'Photo'),
          bg.assetId ? h('button.btn', { type: 'button', title: 'Remove the background photo', 'aria-label': 'Remove the background photo', onclick: removeBgPhoto }, ic('trash')) : null)),
        bg.none ? null : more('canvas-grad', [
          row('Gradient', selectCtl(T, 'background.gradient', [['none', 'None'], ['linear', 'Linear'], ['radial', 'Radial']], { set: v => { S.change(T, 'background.gradient', v); renderInspector(); } })),
          grad ? row('To', colorCtl(T, 'background.color2')) : null,
          grad ? row('Angle', num(T, 'background.angle', { min: 0, max: 360, slider: true, unit: '°' })) : null,
        ], 'Gradient'),
      ], true, { collapsible: false }),
      bg.scene ? sec('Scene', [
        h('div.hint', null, 'A painted backdrop. Add hills, flowers and clouds as layers from Elements → Garden.'),
        full(h('div.btn-row', null,
          h('button.btn.grow', { type: 'button', onclick: () => { S.change(T, 'background.scene', Object.assign({}, bg.scene, { seed: Math.floor(Math.random() * 1e5) })); } }, ic('shuffle'), 'Shuffle'),
          h('button.btn', { type: 'button', onclick: () => { S.change(T, 'background.scene', null); renderInspector(); } }, ic('trash'), 'Remove'))),
      ], true) : null,
      bg.assetId ? sec(R.isVideoAsset(bg.assetId) ? 'Background video' : 'Background photo', [
        full(h('button.btn.primary', { type: 'button', disabled: S.isRemovingBackground(), title: 'Copies the main subject onto its own layer so you can tuck text behind it', onclick: () => S.cutoutBackgroundSubject() }, ic('wand'), S.isRemovingBackground() ? 'Working…' : 'Cut out subject to a layer')),
        full(filterThumbs(null, 'doc')),
        ...(R.isVideoAsset(bg.assetId) ? speedControls(T, 'background.video', () => { const ve = R.assetVideo(bg.assetId); return ve && ve.v && isFinite(ve.v.duration) ? ve.v.duration : 0; }) : []),
        more('bgphoto-more', [
          row('Opacity', num(T, 'background.imageOpacity', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
          row('Zoom', num(T, 'background.crop.zoom', { min: 1, max: 5, step: 0.01, slider: true })),
          row('Pan X', num(T, 'background.crop.x', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
          row('Pan Y', num(T, 'background.crop.y', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
        ], 'Opacity & position'),
        full(h('div.btn-row', null,
          h('button.btn.grow', { type: 'button', onclick: () => S.pickImages({ asBackground: true }) }, ic('replace'), 'Replace'),
          h('button.btn.grow.danger', { type: 'button', onclick: removeBgPhoto }, ic('trash'), R.isVideoAsset(bg.assetId) ? 'Remove video' : 'Remove photo'))),
      ], true) : null,
      bg.assetId ? adjustSection(T, 'background.filters') : null,
      bg.assetId ? filmSection(T, 'background.filters') : null,
      bg.assetId ? blurSection(T, 'background.filters') : null,
      S.photoSlots().length >= 2 ? sec('Photo slots', [
        h('p.hint', null, `${S.photoSlots().length} photo slots. Pick several photos or videos at once — they go in in order.`),
        full(h('button.btn.primary', { type: 'button', onclick: () => S.fillSlots() }, ic('image'), 'Fill photo slots')),
      ], true, { key: 'photo-slots' }) : null,
      videoTextSection(),
      cameraSection(),
      addSec('Finish', [
        {
          label: 'Pattern', on: bg.pattern && bg.pattern.type !== 'none',
          add: () => S.change(T, 'background.pattern', Object.assign({}, bg.pattern, { type: 'grid' })), remove: () => S.change(T, 'background.pattern.type', 'none'),
          body: () => [
            row('Pattern', selectCtl(T, 'background.pattern.type', Object.entries(R.PATTERNS).filter(([k]) => k !== 'none'))),
            row('Colour', colorCtl(T, 'background.pattern.color')),
            row('Size', num(T, 'background.pattern.size', { min: 4, max: 300, slider: true })),
            more('fin-pattern', [
              row('Line', num(T, 'background.pattern.thick', { min: 0.5, max: 12, step: 0.5, slider: true })),
              row('Opacity', num(T, 'background.pattern.opacity', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
            ]),
          ],
        },
        fin('Paper texture', 'background.texture'),
        fin('Crumpled paper', 'background.crumple', 100, { def: 60, body: () => [full(h('button.btn', { type: 'button', onclick: () => S.change(T, 'background.crumpleSeed', Math.floor(Math.random() * 1e6)) }, ic('shuffle'), 'New creases'))] }),
        fin('Film grain', 'overlay.grain', 100, { def: 30, body: () => [row('Grain size', num(T, 'overlay.grainSize', { min: 0, max: 100, slider: true, def: 0 }))] }),
        fin('Dust & scratches', 'overlay.dust', 100, { def: 45 }),
        fin('Film burn', 'overlay.burn', 100, { def: 60 }),
        fin('Flicker', 'overlay.flicker', 100, { def: 50, body: () => [h('p.hint', null, 'Each frame a touch brighter or darker — shows while the video plays.')] }),
        fin('Gate weave', 'overlay.weave', 100, { def: 50, body: () => [h('p.hint', null, 'The picture hops slightly every frame, like film in a projector — shows while the video plays.')] }),
        fin('Vignette', 'overlay.vignette'),
        {
          // the whole design shown on a real display, filmed close up (pixel mesh, soft focus, dust)
          label: 'Screen close-up', on: !!(d.screen && d.screen.on),
          add: () => { S.change(T, 'screen', { on: true, pitch: Math.round(Math.min(d.width, d.height) / 900 * 100) / 100, grid: 75, focus: 40, dust: 5 }); renderInspector(); },
          remove: () => { S.change(T, 'screen.on', false); renderInspector(); },
          body: () => [
            h('p.hint', null, 'Looks like the design is on a real screen filmed from close by. The pixels show once the camera zooms in — try Camera → Slow push-in. Play to see it.'),
            row('Pixel size', num(T, 'screen.pitch', { min: 0.3, max: 6, step: 0.05, slider: true, def: 1 })),
            row('Pixel grid', num(T, 'screen.grid', { min: 0, max: 100, slider: true, def: 75 })),
            row('Depth of field', num(T, 'screen.focus', { min: 0, max: 100, slider: true, def: 40 })),
            row('Dust', num(T, 'screen.dust', { min: 0, max: 20, step: 1, slider: true, def: 5 })),
          ],
        },
        {
          label: 'Colour tint', on: !!o.tintAmount, add: () => S.change(T, 'overlay.tintAmount', 30), remove: () => S.change(T, 'overlay.tintAmount', 0),
          body: () => [row('Colour', colorCtl(T, 'overlay.tint')), row('Amount', num(T, 'overlay.tintAmount', { min: 0, max: 100, slider: true }))],
        },
        fin('Paper on top', 'overlay.paper'),
        fin('Poster folds', 'overlay.creases', 100, { def: 60 }),
        fin('Light leak', 'overlay.leak', 100, { def: 45 }),
        fin('Window-blind shadows', 'overlay.blinds', 100, { def: 50 }),
        fin('VHS scanlines', 'overlay.scanlines', 100, { def: 50 }),
        fin('RGB split', 'overlay.rgb', 100, { def: 40 }),
      ], 'canvas-finish'),
      h('p.insp-empty', null, 'Select a layer to edit it. Double-click text to type, a photo to crop, a ribbon to bend it.'),
    ];
  }

  /* ───────────────────────── left panels ───────────────────────── */

  const panel = $('#panel');
  const app = $('#app');
  let tab = 'templates';
  let drill = null;        // "See all" view inside a panel: { tab, title, items, grid }
  const queries = {};      // search text per tab
  const TAB_TITLES = { templates: 'Templates', elements: 'Elements', text: 'Text', photos: 'Photos', background: 'Canvas', layers: 'Layers' };
  function setTab(t, opts = {}) {
    if (t === 'animate') { openAnimate($('#btn-animate')); return; }
    if (t === 'stickers' || t === 'shapes' || t === 'planner') t = 'elements';
    if (tab !== t) drill = null;
    tab = t;
    $$('#rail button').forEach(b => b.classList.toggle('active', b.dataset.tab === t && !app.classList.contains('panel-closed')));
    if (opts.open !== false) openPanel(true);
    renderPanel();
    if (t === 'background') S.select([]);
  }
  function openPanel(on) {
    app.classList.toggle('panel-closed', !on);
    $$('#rail button').forEach(b => b.classList.toggle('active', on && b.dataset.tab === tab));
    if (matchMedia('(max-width: 920px)').matches) { panel.classList.toggle('open', on); if (on) insp.classList.remove('open'); }
  }
  $('#rail').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    const narrow = matchMedia('(max-width: 920px)').matches;
    const isOpen = narrow ? panel.classList.contains('open') : !app.classList.contains('panel-closed');
    // clicking the active tab folds the panel away for more canvas room
    if (tab === b.dataset.tab && isOpen) { openPanel(false); return; }
    setTab(b.dataset.tab);
  });

  function panelHead(title, extra) {
    return h('div.panel-head', null, h('h2', null, title), extra || null,
      h('button.icon-btn', { type: 'button', title: 'Hide panel', onclick: () => openPanel(false) }, ic('chevLeft')));
  }
  function searchBox(placeholder, onInput) {
    const inp = h('input.search', { placeholder, value: queries[tab] || '', type: 'search' });
    inp.addEventListener('input', () => { queries[tab] = inp.value; onInput(inp.value.trim().toLowerCase()); });
    return inp;
  }
  // a short row of the most useful items with "See all" for the rest
  function shelf(title, items, o = {}) {
    if (!items.length) return null;
    const limit = o.limit ?? 8;
    const grid = o.grid || 'stk-grid';
    return h('div.shelf', null,
      h('div.shelf-head', null, h('h3', null, title),
        items.length > limit ? h('button.see-all', { type: 'button', onclick: () => { drill = { tab, title, items, grid, note: o.note }; renderPanel(); panel.scrollTop = 0; } }, 'See all', ic('chevRight')) : null),
      o.note && !o.noteAll ? h('p.hint.shelf-note', null, o.note) : null,
      h('div.' + grid, null, items.slice(0, limit).map(it => it.node())));
  }
  function drillView() {
    return [
      h('button.back-link', { type: 'button', onclick: () => { drill = null; renderPanel(); } }, ic('chevLeft'), TAB_TITLES[tab]),
      h('h2.drill-title', null, drill.title),
      drill.note ? h('p.hint', null, drill.note) : null,
      h('div.' + drill.grid, null, drill.items.map(it => it.node())),
    ];
  }

  function renderPanel() {
    const fn = { templates: templatesPanel, elements: elementsPanel, text: textPanel, photos: photosPanel, background: backgroundPanel, layers: layersPanel }[tab] || templatesPanel;
    const body = drill && drill.tab === tab ? [panelHead(TAB_TITLES[tab]), ...drillView()] : fn();
    panel.replaceChildren(...body.flat().filter(Boolean));
    hydrateIcons(panel);
  }
  S.on('fonts', () => { if (tab === 'layers') renderPanel(); });

  function dragPayload(node, payload) {
    node.draggable = true;
    node.addEventListener('dragstart', e => { e.dataTransfer.setData('application/x-studio', JSON.stringify(typeof payload === 'function' ? payload() : payload)); e.dataTransfer.effectAllowed = 'copy'; });
  }
  S.on('dropPayload', (p, at) => {
    if (p.kind === 'sticker') addSticker(p.id, at);
    else if (p.kind === 'element') S.addElement(p.el, { at });
    else if (p.kind === 'asset') { const el = S.addImageFromAsset(p.id); S.changeEl(el, e => { e.x = at.x - e.width / 2; e.y = at.y - e.height / 2; }); }
  });
  // a tile that adds an element on click and can be dragged onto the canvas
  function elTile(name, make, o = {}) {
    return {
      name, tags: o.tags || '',
      node: () => {
        const demo = make();
        const tile = h('button.' + (o.cls || 'stk') + (o.dark ? '.dark' : ''), { type: 'button', title: name, onclick: () => (o.onAdd ? o.onAdd() : S.addElement(make())) },
          o.thumb ? o.thumb() : elThumb(demo, o.tw || 54, o.th || 54, o.pad ?? 6), o.caption ? h('div.cap', null, name) : null);
        dragPayload(tile, () => ({ kind: 'element', el: make() }));
        return tile;
      },
    };
  }

  /* templates */
  let tplTag = 'All';
  function templateCard(t, onPick, width = 260, opts = {}) {
    const thumb = h('div.thumb.skeleton', { style: { aspectRatio: `${t.width} / ${t.height}` } });
    const main = h('button.tpl-main', { type: 'button', onclick: () => onPick(t), title: opts.title || `Use “${t.name}”` }, thumb, opts.meta === false ? null : h('div.meta', null, opts.label || t.name));
    const card = h('div.tpl' + (opts.family ? '.family' : ''), null, main,
      t.video ? h('span.tpl-badge', null, ic('play'), 'Video') : null,
      opts.count ? h('span.tpl-count', null, `${opts.count} styles`) : null,
      opts.pieces ? h('button.tpl-pieces', { type: 'button', title: `Browse the layers in “${t.name}” and add the ones you want`, onclick: () => openPieces(t) }, ic('layers'), 'Pieces') : null);
    let still = null;
    docThumb('tpl:' + t.id, templateDoc(t), width).then(c => {
      still = new Image();
      still.src = c.toDataURL('image/jpeg', 0.85);
      thumb.classList.remove('skeleton');
      thumb.replaceChildren(still);
    });
    if (t.video) {
      // hovering a video template plays it in the thumbnail
      let raf = 0, cv = null, wait = 0;
      // start after a short hover so quick clicks and taps aren't disturbed by the swap
      main.addEventListener('pointerenter', e => {
        if (e.pointerType === 'touch') return;
        wait = setTimeout(() => {
          const d = templateDoc(t);
          if (!cv) { cv = document.createElement('canvas'); cv.width = width; cv.height = Math.round(width * t.height / t.width); }
          const t0 = performance.now();
          R.renderDoc(d, { canvas: cv, time: 0 });
          thumb.replaceChildren(cv);
          const tick = now => { R.renderDoc(d, { canvas: cv, time: ((now - t0) / 1000) % ((d.anim && d.anim.duration) || 5) }); raf = requestAnimationFrame(tick); };
          raf = requestAnimationFrame(tick);
        }, 250);
      });
      main.addEventListener('pointerleave', () => { clearTimeout(wait); cancelAnimationFrame(raf); if (still && cv && cv.isConnected) thumb.replaceChildren(still); });
    }
    return card;
  }
  const tplDocs = new Map();
  function templateDoc(t) {
    if (!tplDocs.has(t.id)) tplDocs.set(t.id, prepDoc(t.build()));
    return tplDocs.get(t.id);
  }
  function fitTemplate(t) {
    const d = S.doc, td = templateDoc(t);
    const k = Math.min(d.width / td.width, d.height / td.height);
    return { k, ox: (d.width - td.width * k) / 2, oy: (d.height - td.height * k) / 2 };
  }
  function pieceFor(t, src, at) {
    const { k, ox, oy } = fitTemplate(t);
    const el = S.clone(src);
    el.id = S.uid();
    if (k !== 1) S.scaleElement(el, k, k);
    el.x = src.x * k + ox; el.y = src.y * k + oy;
    if (at) { el.x = at.x - el.width / 2; el.y = at.y - el.height / 2; }
    return el;
  }
  function addTemplateLayers(t, els) {
    const list = (els || templateDoc(t).elements).map(e => pieceFor(t, e));
    S.addElements(list);
    toast(`Added ${list.length} layer${list.length > 1 ? 's' : ''} from “${t.name}”`);
  }
  function useTemplateBackground(t) {
    const td = templateDoc(t);
    S.doc.background = S.deepMerge(S.blankDoc(1, 1, '#fff').background, S.clone(td.background));
    S.doc.overlay = S.deepMerge(S.blankDoc(1, 1, '#fff').overlay, S.clone(td.overlay || {}));
    S.touchAll(); S.commit(); renderInspector();
    toast(`Using the background from “${t.name}”`);
  }
  // a design started from a layout family is named after the family, not the orientation
  const tplName = t => t.style ? `${t.style} · ${t.name}` : t.family ? `${t.family} · ${t.name}` : t.name;
  function replaceWithTemplate(t) {
    closeModal();
    templateFonts(t);
    S.loadDoc(prepDoc(t.build()), null, { name: tplName(t) });
    toast(`“${t.name}” loaded — make it yours`);
  }
  function useTemplate(t) {
    if (!S.doc.elements.length) { replaceWithTemplate(t); return; }
    const n = templateDoc(t).elements.length;
    const choice = (iconName, title, sub, run, primary) => h('button.big-btn' + (primary ? '.accent' : ''), { type: 'button', onclick: () => { closeModal(); run(); } },
      ic(iconName), h('div', null, h('b', { style: { display: 'block' } }, title), h('small', { style: { opacity: 0.8 } }, sub)));
    const box = modal([
      h('h1', { style: { fontSize: '20px' } }, `Use “${t.name}”`),
      h('p.lead', null, 'You already have a design going. What should this template do?'),
      choice('replace', 'Start from this template', 'Replaces your canvas. ⌘Z brings your design back.', () => replaceWithTemplate(t), true),
      choice('plus', 'Add it to my design', `Adds its ${n} layers on top, scaled to fit.`, () => addTemplateLayers(t)),
      choice('layers', 'Pick pieces', 'Choose single layers to add.', () => openPieces(t)),
      choice('palette', 'Use just its background', 'Swaps the backdrop and finish only.', () => useTemplateBackground(t)),
    ], { small: true });
    box.style.width = 'min(440px, 100%)';
    hydrateIcons(box);
  }
  let piecesOf = null;
  function openPieces(t) {
    closeModal();
    piecesOf = t.id;
    drill = null;
    if (tab !== 'templates') setTab('templates'); else { openPanel(true); renderPanel(); }
    panel.scrollTop = 0;
  }
  function piecesPanel(t) {
    const td = templateDoc(t);
    const grid = h('div.piece-grid');
    const bgThumb = h('div.piece-thumb');
    docThumb('bg-of:' + t.id, Object.assign({}, td, { elements: [] }), 140).then(c => bgThumb.replaceChildren(c));
    grid.append(h('button.piece', { type: 'button', title: 'Use this background on your canvas', onclick: () => useTemplateBackground(t) }, bgThumb, h('span', null, 'Background')));
    td.elements.slice().reverse().forEach(src => {
      const demo = S.clone(src); demo.rotation = 0;
      const tile = h('button.piece', { type: 'button', title: 'Click to add · drag onto the canvas', onclick: () => { S.addElement(pieceFor(t, src), { center: false }); toast(`Added ${S.elLabel(src)}`); } },
        h('div.piece-thumb', null, elThumb(demo, 128, 96, 8)), h('span', null, S.elLabel(src)));
      dragPayload(tile, () => ({ kind: 'element', el: pieceFor(t, src) }));
      grid.append(tile);
    });
    return [
      panelHead('Templates'),
      h('button.back-link', { type: 'button', onclick: () => { piecesOf = null; renderPanel(); } }, ic('chevLeft'), 'All templates'),
      h('h2.drill-title', null, t.name),
      h('p.hint', null, `${td.elements.length} layers — click one to add it, or drag it where you want it.`),
      h('div.btn-row', { style: { margin: '10px 0 14px' } },
        h('button.btn.primary.grow', { type: 'button', onclick: () => addTemplateLayers(t) }, ic('plus'), 'Add all'),
        h('button.btn.grow', { type: 'button', onclick: () => useTemplate(t) }, ic('layout'), 'Use template')),
      grid,
    ];
  }
  let tplGroup = null, tplStyle = null;
  // combined families (moving layouts) hold several types, each in every ratio; the family card shows the types first
  const combined = members => members.some(t => t.style);
  const styleGroups = members => {
    const by = new Map();
    for (const t of members) { if (!by.has(t.style)) by.set(t.style, []); by.get(t.style).push(t); }
    return [...by.values()];
  };
  const countOf = members => combined(members) ? styleGroups(members).length : members.length;
  // moving layouts come in every orientation; the one closest to your canvas goes first, and any other size can be built to fit
  function orientationMembers(members, W, H) {
    if (!members[0].layout) return members;
    const ar = W / H, near = t => Math.abs(Math.log((t.width / t.height) / ar));
    const sorted = members.slice().sort((a, b) => near(a) - near(b));
    const exact = members.some(t => t.width === W && t.height === H);
    if (!exact && window.STUDIO_LAYOUTS && window.STUDIO_LAYOUTS[members[0].layout]) {
      const L = window.STUDIO_LAYOUTS[members[0].layout];
      sorted.unshift({ id: `mv-${members[0].layout}-fit-${W}x${H}`, name: `Your canvas ${W} × ${H}`, family: members[0].family, style: members[0].style, layout: members[0].layout, width: W, height: H, video: true, tags: [], build: () => L.build(W, H) });
    }
    return sorted;
  }
  function familyPanel(g, members) {
    if (combined(members)) {
      if (tplStyle) { const m = members.filter(t => t.style === tplStyle); if (m.length) return stylePanel(g, tplStyle, m); tplStyle = null; }
      return combinedPanel(g, members);
    }
    members = orientationMembers(members, S.doc.width, S.doc.height);
    const grid = h('div.tpl-grid', null, members.map((t, i) => templateCard(t, useTemplate, 260, { pieces: !/-fit-/.test(t.id), label: members[0].layout && i === 0 ? (/-fit-/.test(t.id) ? 'Your canvas' : `${t.name} · fits`) : undefined })));
    return [
      panelHead('Templates'),
      h('button.back-link', { type: 'button', onclick: () => { tplGroup = null; renderPanel(); } }, ic('chevLeft'), 'All templates'),
      h('h2.drill-title', null, g),
      members[0].layout ? h('p.hint', { style: { marginBottom: '12px' } }, 'Every orientation is here, the one that fits your canvas first. Resize the canvas later and the layout re-flows to the new shape, keeping your photos and videos.') : h('p.hint', { style: { marginBottom: '12px' } }, members[0].video
        ? `${members.length} styles, each with its own camera move. Hover to preview — after choosing, change the move under Camera on the right.`
        : `${members.length} styles — pick one, then make it yours.`),
      grid,
    ];
  }
  // the family's types, one card each
  function combinedPanel(g, members) {
    const types = styleGroups(members);
    const grid = h('div.tpl-grid', null, types.map(m => templateCard(m[0], () => { tplStyle = m[0].style; renderPanel(); panel.scrollTop = 0; }, 260, {
      family: true, label: m[0].style, title: `Choose a ratio for “${m[0].style}”`,
    })));
    return [
      panelHead('Templates'),
      h('button.back-link', { type: 'button', onclick: () => { tplGroup = null; tplStyle = null; renderPanel(); } }, ic('chevLeft'), 'All templates'),
      h('h2.drill-title', null, g),
      h('p.hint', { style: { marginBottom: '12px' } }, `${types.length} types — pick one, then choose its ratio.`),
      grid,
    ];
  }
  // one type in every ratio; the one closest to your canvas comes first, and any other size can be built to fit
  function stylePanel(g, style, members) {
    const ms = orientationMembers(members, S.doc.width, S.doc.height);
    const grid = h('div.tpl-grid', null, ms.map((t, i) => templateCard(t, useTemplate, 260, { pieces: !/-fit-/.test(t.id), label: i === 0 ? (/-fit-/.test(t.id) ? 'Your canvas' : `${t.name} · fits`) : undefined })));
    return [
      panelHead('Templates'),
      h('button.back-link', { type: 'button', onclick: () => { tplStyle = null; renderPanel(); } }, ic('chevLeft'), g),
      h('h2.drill-title', null, style),
      h('p.hint', { style: { marginBottom: '12px' } }, 'Choose the ratio for your canvas, then add it. Resize the canvas later and the layout re-flows to the new shape, keeping your photos and videos.'),
      grid,
    ];
  }
  /* my templates: designs saved from the canvas to start new ones from */
  let myTpls = [];
  async function loadMyTemplates() {
    const list = await S.myTemplates.list();
    const out = [];
    for (const m of list) {
      const data = await S.myTemplates.get(m.id);
      if (!data || !data.doc) continue;
      // their photos join the asset store so thumbnails and new designs can use them
      if (data.assets) Object.assign(S.assets, data.assets);
      out.push({ id: 'my:' + m.id + ':' + m.savedAt, mine: m.id, meta: m, name: m.name, width: data.doc.width, height: data.doc.height, video: !!m.video, tags: ['My templates'], fonts: data.fonts || [], build: () => S.clone(data.doc) });
    }
    R.setAssets(S.assets);
    myTpls = out;
  }
  const allTemplates = () => myTpls.concat(window.STUDIO_TEMPLATES || []);
  // uploaded fonts saved with a template come back before it's used
  function templateFonts(t) {
    if (!t.fonts || !t.fonts.length) return;
    F.unpackFamilies(t.fonts).then(() => { R.fontsVersion++; R.requestRedraw(); });
  }
  function saveTemplateModal() {
    const nameIn = h('input.sel', { type: 'text', value: S.docName && S.docName !== 'Untitled design' ? S.docName : '', placeholder: 'Template name', 'aria-label': 'Template name' });
    let target = '';
    const pick = myTpls.length ? h('select.sel', { 'aria-label': 'Save as', onchange: e => { target = e.target.value; const m = myTpls.find(t => t.mine === target); if (m && !nameIn.value.trim()) nameIn.value = m.name; } },
      h('option', { value: '' }, 'A new template'), myTpls.map(t => h('option', { value: t.mine }, `Replace “${t.name}”`))) : null;
    const save = () => {
      const name = nameIn.value.trim() || 'My template';
      closeModal();
      S.myTemplates.save(name, target || null)
        .then(() => toast(`Saved “${name}” to My templates`, { label: 'Show', run: () => { tplGroup = null; piecesOf = null; tplTag = 'All'; queries.templates = ''; setTab('templates'); panel.scrollTop = 0; } }))
        .catch(() => toast('Couldn’t save the template — the browser’s storage may be full'));
    };
    nameIn.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') save(); });
    const box = modal([
      h('h1', { style: { fontSize: '20px' } }, 'Save as template'),
      h('p.lead', null, 'Keeps the whole canvas — layers, photos and videos, background, finish and animation — under My templates, so any new design can start from it. This design stays as it is.'),
      h('div.form-rows', null,
        h('label.form-row', null, h('span', null, 'Name'), nameIn),
        pick ? h('label.form-row', null, h('span', null, 'Save as'), pick) : null),
      h('div.btn-row', { style: { marginTop: '18px' } }, h('button.btn', { type: 'button', onclick: closeModal }, 'Cancel'), h('button.btn.primary', { type: 'button', onclick: save }, ic('layout'), 'Save template')),
    ], { small: true });
    box.style.width = 'min(460px, 100%)';
    hydrateIcons(box);
    setTimeout(() => { nameIn.focus(); nameIn.select(); }, 30);
  }
  function renameTemplate(t) {
    const nameIn = h('input.sel', { type: 'text', value: t.name, 'aria-label': 'Template name' });
    const ok = () => { const v = nameIn.value.trim(); closeModal(); if (v && v !== t.name) S.myTemplates.rename(t.mine, v); };
    nameIn.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') ok(); });
    modal([h('h1', { style: { fontSize: '20px' } }, 'Rename template'), nameIn,
      h('div.btn-row', { style: { marginTop: '18px' } }, h('button.btn', { type: 'button', onclick: closeModal }, 'Cancel'), h('button.btn.primary', { type: 'button', onclick: ok }, 'Rename'))], { small: true }).style.width = 'min(420px, 100%)';
    setTimeout(() => { nameIn.focus(); nameIn.select(); }, 30);
  }
  async function downloadTemplate(t) {
    const data = await S.myTemplates.get(t.mine);
    if (!data) return;
    const name = (t.name || 'template').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'template';
    const blob = new Blob([JSON.stringify({ app: 'collage-studio', kind: 'template', version: 1, name: t.name, doc: data.doc, assets: data.assets, fonts: data.fonts || [], video: !!data.video })], { type: 'application/json' });
    download(blob, name + '.template.studio.json').then(r => { if (r === 'saved' || r === 'started') toast('Template file saved'); });
  }
  async function deleteTemplate(t) {
    const r = await S.myTemplates.remove(t.mine);
    toast(`Deleted the template “${t.name}”`, { label: 'Undo', run: () => S.myTemplates.restore(r) });
  }
  // a template card with a ⋯ menu for the ones you made
  function myTemplateCard(t, onPick, width) {
    const card = templateCard(t, onPick, width, { pieces: width > 240 });
    card.classList.add('mine');
    card.append(h('button.icon-btn.tpl-more', { type: 'button', title: 'More', 'aria-label': `More for “${t.name}”`, onclick: e => { e.stopPropagation(); menu(e.currentTarget, [
      { label: 'Use template', icon: 'layout', run: () => onPick(t) },
      { label: 'Rename', icon: 'edit', run: () => renameTemplate(t) },
      { label: 'Replace with this design', icon: 'replace', disabled: isHome(), run: () => S.myTemplates.save(t.name, t.mine).then(() => toast(`Updated “${t.name}”`)) },
      { label: 'Download template file', icon: 'download', run: () => downloadTemplate(t) },
      '-',
      { label: 'Delete', icon: 'trash', run: () => deleteTemplate(t) },
    ]); } }, ic('more')));
    return card;
  }
  function myTemplatesBlock(q) {
    const list = myTpls.filter(t => !q || t.name.toLowerCase().includes(q));
    if (q && !list.length) return null;
    const saveTile = h('button.tpl-save', { type: 'button', onclick: saveTemplateModal, title: 'Save the whole canvas as a template' }, ic('plus'), h('b', null, 'Save this design'), h('small', null, 'as a template'));
    return h('div.my-tpls', null,
      h('div.sub-head', null, h('span', null, 'My templates'), myTpls.length ? h('small', null, myTpls.length) : null),
      myTpls.length ? null : h('p.hint', null, 'Made something you’ll want again? Save the whole canvas as a template and it shows up here.'),
      h('div.tpl-grid', null, list.map(t => myTemplateCard(t, useTemplate, 260)), q ? null : saveTile));
  }

  function templatesPanel() {
    const T = allTemplates();
    if (piecesOf) { const t = T.find(x => x.id === piecesOf); if (t) return piecesPanel(t); piecesOf = null; }
    if (tplGroup) { const m = T.filter(t => t.group === tplGroup); if (m.length) return familyPanel(tplGroup, m); tplGroup = null; }
    const BT = window.STUDIO_TEMPLATES || [];
    const tags = ['All', 'Video', ...[...new Set(BT.flatMap(t => t.tags || []))].filter(x => x !== 'Video')];
    const grid = h('div.tpl-grid'), mine = h('div');
    const draw = () => {
      const q = (queries.templates || '').trim().toLowerCase();
      mine.replaceChildren(...[tplTag === 'All' ? myTemplatesBlock(q) : null].filter(Boolean));
      hydrateIcons(mine);
      const list = BT.filter(t => (tplTag === 'All' || (t.tags || []).includes(tplTag)) && (!q || t.name.toLowerCase().includes(q) || (t.group || '').toLowerCase().includes(q) || (t.tags || []).some(g => g.toLowerCase().includes(q))));
      // one card per family; searching shows every match individually
      const seen = new Set(), cards = [];
      for (const t of list) {
        if (t.group && !q) {
          if (seen.has(t.group)) continue;
          seen.add(t.group);
          const members = T.filter(x => x.group === t.group);
          cards.push(templateCard(t, () => { tplGroup = t.group; tplStyle = null; renderPanel(); panel.scrollTop = 0; }, 260, { family: true, count: countOf(members), label: t.group, title: `See all ${countOf(members)} styles of “${t.group}”` }));
        } else cards.push(templateCard(t, useTemplate, 260, { pieces: true }));
      }
      grid.replaceChildren(...cards);
      if (!list.length) grid.append(h('p.hint', null, 'No templates match.'));
      hydrateIcons(grid);
    };
    const chips = h('div.chips.scroll');
    const drawChips = () => chips.replaceChildren(...tags.map(tg => h('button.chip' + (tg === tplTag ? '.on' : ''), { type: 'button', onclick: () => { tplTag = tg; drawChips(); draw(); } }, tg)));
    drawChips(); draw();
    return [panelHead('Templates'), searchBox('Search templates', draw), chips, mine, grid];
  }

  /* elements */
  let stkCat = null;
  const svgUrlCache = new Map();
  function stickerUrl(def) { let u = svgUrlCache.get(def.id); if (!u) { u = R.svgDataUrl(def.svg(def.colors)); svgUrlCache.set(def.id, u); } return u; }
  function addSticker(id, at) {
    const def = R.stickerDef(id);
    if (!def) return;
    if (def.neck) { addFigure(def, at); return; }
    const base = Math.min(S.doc.width, S.doc.height) * 0.24;
    const s = base / Math.max(def.w, def.h);
    const el = S.mk('sticker', { stickerId: id, colors: def.colors.slice(), width: def.w * s, height: def.h * s });
    S.addElement(el, at ? { at } : {});
  }
  function figureEls(def, at, scale = 1) {
    const H = Math.min(S.doc.width, S.doc.height) * 0.42 * scale, k = H / def.h;
    const bw = def.w * k, bh = H;
    const cx = at ? at.x : S.doc.width / 2, cy = at ? at.y : S.doc.height / 2 + bh * 0.12;
    const bx = cx - bw / 2, by = cy - bh / 2;
    const body = S.mk('sticker', { stickerId: def.id, colors: def.colors.slice(), x: bx, y: by, width: bw, height: bh, name: def.name });
    const nx = bx + def.neck[0] * k, ny = by + def.neck[1] * k;
    const hw = bw * 0.66, hh = hw * 1.18;
    const head = S.mk('image', {
      x: nx - hw / 2, y: ny - hh * 0.92, width: hw, height: hh, name: 'Face — add a selfie, then Remove background',
      frame: { style: 'circle', size: 0 }, placeholder: ['#ecd2bb', '#c99d7d'],
    });
    return [body, head];
  }
  function addFigure(def, at) {
    S.addElements(figureEls(def, at));
    if (!S.settings.faceTipShown) {
      S.settings.faceTipShown = true; S.saveSettings();
      toast('Double-click the face circle to add a selfie — the background is removed for you');
    }
  }
  S.figureEls = figureEls;
  S.on('replaced', el => {
    if (el && el.type === 'image' && el.studio && el.studio.on && S.studioCutout) { toast('Cutting out the person for the studio look…'); S.studioCutout(el.id); return; }
    if (el && el.type === 'image' && /^Face/.test(el.name || '') && S.removeBackground) {
      toast('Cutting out the face…');
      S.removeBackground(el.id, 'face');
    }
  });
  const DARK_STK = /chalk|star-outline|paper-plane|polaroid|tape-clear|sparkle-outline|smiley-chain|px-cursor|px-hand|cloud-|ui-pill/i;
  function stickerItem(s) {
    return {
      name: s.name, tags: s.cat + ' ' + s.id,
      node: () => {
        const b = h('button.stk' + (DARK_STK.test(s.id) ? '.dark' : ''), { type: 'button', title: s.name, onclick: () => addSticker(s.id) }, h('img', { src: stickerUrl(s), alt: s.name, loading: 'lazy' }));
        dragPayload(b, { kind: 'sticker', id: s.id });
        return b;
      },
    };
  }
  const STICKER_CAT_NAMES = { Shapes: 'Sparkles & shapes' };
  function elementCatalog() {
    const W = S.doc.width, M = Math.min(S.doc.width, S.doc.height);
    const out = [];
    const N = window.StudioNature;
    if (N) {
      const kinds = Object.entries(N.KINDS).map(([k, d]) => elTile(d.label, () => {
        const s = (k === 'hill' || k === 'sky') ? W / d.w : M / 1080;
        return S.mk('nature', { kind: k, colors: d.colors.slice(), width: d.w * s, height: d.h * s, name: d.label, ...(k === 'hill' ? { y: S.doc.height - d.h * s, x: 0 } : {}) });
      }, { tags: 'garden nature grass flowers', onAdd: k === 'hill' ? () => { const s = W / d.w; const el = S.mk('nature', { kind: k, colors: d.colors.slice(), width: W, height: d.h * s, name: d.label }); el.x = 0; el.y = S.doc.height - el.height; S.addElement(el, { center: false }); } : null }));
      out.push({ title: 'Garden & nature', items: kinds, note: 'Painted lawn, flowers and sky — stack them like a set, then add a cut-out photo on top.' });
    }
    const ribbons = [
      ['Loop ribbon', { path: 'loop', color: '#e9f07a', text: 'a cosy weekend festival with friends, music and good food', width: W * 0.9, height: W * 0.5, thickness: W * 0.08, fontSize: W * 0.03 }],
      ['Wave ribbon', { path: 'wave', color: '#ff7ab6', text: 'NEW DROP', uppercase: true, fontFamily: 'Archivo Black', fontWeight: 400, width: W * 0.9, height: W * 0.28, thickness: W * 0.065, fontSize: W * 0.035 }],
      ['Swoosh band', { path: 'swoosh', color: '#1f3fd1', textColor: '#ffffff', text: 'limited edition', width: W * 0.85, height: W * 0.45, thickness: W * 0.07, fontSize: W * 0.032 }],
      ['Arc banner', { path: 'arc', color: '#f2542d', textColor: '#fff6e5', text: 'OPEN SUNDAYS', uppercase: true, repeat: false, fontFamily: 'Anton', fontWeight: 400, width: W * 0.7, height: W * 0.3, thickness: W * 0.08, fontSize: W * 0.05, letterSpacing: 0.12 }],
      ['Outlined S-curve', { path: 'scurve', color: '#d7ef5a', border: { width: 5, color: '#1d1b18' }, text: 'save the date', width: W * 0.8, height: W * 0.5, thickness: W * 0.07, fontSize: W * 0.032 }],
      ['Circle band', { path: 'circle', color: '#c9b6f2', text: 'good things take time', width: W * 0.5, height: W * 0.5, thickness: W * 0.06, fontSize: W * 0.028 }],
      ['Spiral', { path: 'spiral', color: '#7bd3c4', text: 'round and round we go', width: W * 0.6, height: W * 0.6, thickness: W * 0.05, fontSize: W * 0.024 }],
      ['Zigzag tape', { path: 'zigzag', color: '#f7d046', text: 'CAUTION · HOT DEALS', uppercase: true, ends: 'flat', width: W * 0.9, height: W * 0.25, thickness: W * 0.06, fontSize: W * 0.026 }],
      ['Double loop', { path: 'double', color: '#ff8a3d', text: 'twists and turns and happy accidents', width: W * 0.9, height: W * 0.45, thickness: W * 0.055, fontSize: W * 0.024 }],
      ['Text on a line', { path: 'wave', color: 'transparent', text: 'words floating on a gentle wave', repeat: false, fontFamily: 'Instrument Serif', fontWeight: 400, fontSize: W * 0.05, width: W * 0.8, height: W * 0.2, thickness: 4, textColor: '#1d1b18' }],
    ].map(([name, o]) => elTile(name, () => S.mk('ribbon', o), { tags: 'ribbon text path band', tw: 80, th: 50 }));
    out.push({ title: 'Ribbons & text paths', items: ribbons, grid: 'wide-grid', limit: 4, note: 'Double-click a ribbon on the canvas to bend it point by point.' });
    const curves = [
      ['Hook arrow', { path: 'hook', arrowEnd: true }], ['Bend arrow', { path: 'bend', arrowEnd: true }], ['Wave arrow', { path: 'wave', arrowEnd: true }],
      ['Swoosh arrow', { path: 'swoosh', arrowEnd: true }], ['Loop arrow', { path: 'loop', arrowEnd: true }], ['Arc arrow', { path: 'arc', arrowEnd: true }],
      ['Dashed curve', { path: 'scurve', dash: 2.5, arrowEnd: true }], ['Spiral line', { path: 'spiral' }],
    ].map(([name, o]) => elTile(name, () => S.mk('ribbon', Object.assign({ line: true, thickness: Math.max(3, W * 0.004), color: '#1d1b18', text: '', width: W * 0.3, height: W * 0.24 }, o)), { tags: 'arrow line curve connector' }));
    const lineDefs = [
      ['Line', {}], ['Arrow', { arrowEnd: true }], ['Double arrow', { arrowEnd: true, arrowStart: true }], ['Dashed', { dash: 2 }],
      ['Wavy', { wavy: true }], ['Wavy arrow', { wavy: true, arrowEnd: true }], ['Dotted', { dash: 0.5 }], ['Thick', { strokeWidth: 18 }],
    ].map(([name, o]) => elTile(name, () => S.mk('shape', Object.assign({ shape: 'line', stroke: '#1d1b18', strokeWidth: 8, width: W * 0.4, height: 60 }, o)), { tags: 'line arrow', th: 40 }));
    out.push({ title: 'Lines & arrows', items: [...curves.slice(0, 4), ...lineDefs.slice(0, 4), ...curves.slice(4), ...lineDefs.slice(4)] });
    const marks = [
      ['Circle it', 'scribble', 0.32, 0.34], ['Underline swipe', 'swipe', 0.4, 0.07], ['Tick', 'tick', 0.18, 0.15], ['Cross it out', 'cross', 0.25, 0.25],
      ['Pointing arrow', 'bend', 0.26, 0.2, { arrowEnd: true }], ['Hook arrow', 'hook', 0.26, 0.22, { arrowEnd: true }],
    ].map(([name, path, w, hh, o]) => elTile(name, () => S.mk('ribbon', Object.assign({ path, line: true, thickness: Math.max(6, W * 0.012), color: '#dc2626', opacity: 0.92, text: '', width: W * w, height: W * hh, anim: { enter: 'draw', delay: 0.5, speed: 0.8 } }, o || {})), { tags: 'mark circle underline red marker annotate scribble' }));
    out.push({ title: 'Marks & scribbles', items: marks, note: 'Red-pen marks that draw themselves on in videos.' });
    const colors = ['#7fa88a', '#f7d046', '#ff8a3d', '#c9b6f2', '#ff7ab6', '#5aa9e6', '#d7ef5a', '#e84a5f'];
    let ci = 0;
    const shapes = Object.entries(R.SHAPES).filter(([k]) => k !== 'line').map(([k, s]) => {
      const fill = colors[ci++ % colors.length];
      return elTile(s.label, () => {
        const sz = W * 0.3;
        const w = ['pill', 'ticket', 'arrow', 'parallelogram', 'speech', 'torn'].includes(k) ? sz * 1.5 : sz;
        const hh = k === 'halfcircle' ? sz / 2 : k === 'arch' ? sz * 1.3 : ['pill', 'ticket', 'arrow', 'parallelogram'].includes(k) ? sz * 0.55 : sz;
        return S.mk('shape', { shape: k, fill, width: w, height: hh, radius: k === 'rounded' ? sz * 0.16 : k === 'ticket' ? 18 : 0, points: k === 'burst' ? 18 : k === 'scallop' ? 16 : k === 'flower' ? 8 : 5, inner: k === 'burst' ? 0.8 : 0.48, depth: k === 'flower' ? 0.28 : 0.08, texture: k === 'torn' ? 30 : 0 });
      }, { tags: 'shape' });
    });
    out.push({ title: 'Shapes', items: shapes });
    const papers = (window.STUDIO_PAPER_PRESETS || []).map(p => elTile(p.name, () => S.mk('shape', S.clone(p.el(W))), { cls: 'preset', tw: 120, th: 80, pad: 14, caption: true, tags: 'paper card note' }));
    out.push({ title: 'Paper & cards', items: papers, grid: 'preset-grid', limit: 4 });
    const planners = (window.STUDIO_PLANNER_PRESETS || []).map(p => elTile(p.name, () => { const e = S.mk(p.el.type, S.clone(p.el)); scaleTo(e, W); return e; }, { cls: 'preset', dark: p.dark, tw: 128, th: 96, caption: true, tags: 'calendar planner date ' + p.group }));
    out.push({ title: 'Calendars & planners', items: planners, grid: 'preset-grid', limit: 4 });
    const cams = [
      ['Phone camera', { style: 'iphone' }], ['Phone camera, no edge', { style: 'iphone', lens: false }],
      ['Camcorder', { style: 'camcorder', lens: false, grid: false }], ['Viewfinder', { style: 'minimal', lens: false, grid: true }],
    ].map(([name, o]) => elTile(name, () => S.mk('camera', Object.assign({ x: 0, y: 0, width: S.doc.width, height: S.doc.height, name }, o)), {
      cls: 'preset.dark', tw: 96, th: 110, caption: true, tags: 'camera overlay phone screen ui',
      onAdd: () => S.addElement(S.mk('camera', Object.assign({ x: 0, y: 0, width: S.doc.width, height: S.doc.height, name }, o)), { center: false }),
    }));
    const F = window.StudioFlashes;
    if (F) {
      const flashAdd = k => () => {
        const top = S.doc.elements.reduce((m, e, i) => (e.type === 'image' && e.width >= S.doc.width * 0.6 ? i : m), -1);
        S.addElement(S.mk('flashes', { x: 0, y: 0, width: S.doc.width, height: S.doc.height, pack: k, opacity: 0.55, blend: 'screen' }), { center: false, index: top + 1 });
        toast('Speed flashes added — press play to see them');
      };
      const flashes = Object.entries(F.PACKS).map(([k, p]) => ({
        name: p.label, tags: 'speed flash motion blur overlay video ' + p.sub,
        node: () => h('button.preset.flash-tile', { type: 'button', title: `${p.label} — ${p.sub}`, onclick: flashAdd(k) },
          h('span.flash-tile-img', { style: { backgroundImage: `url(${(F.IMG[p.ids[0]] || {}).src})` } }), h('div.cap', null, p.label)),
      }));
      out.push({ title: 'Speed flashes', items: flashes, grid: 'preset-grid', limit: 4, note: 'Fast motion-blurred action shots that flash over your photo or video.' });
    }
    out.push({ title: 'Camera overlays', items: cams, grid: 'preset-grid', limit: 2, note: 'Covers the whole canvas — put it on top of a photo.' });
    const all = window.STICKERS || [];
    const cats = [...new Set(all.map(s => s.cat))];
    const order = ['Game & UI', 'Interface icons', 'Doodles', 'Pen sketches', 'Shapes', 'Paper & Office', 'Objects', 'Retro & Y2K', 'Pixel & Web', 'Outfits · Girls', 'Outfits · Boys', 'Shoes & Bags'];
    cats.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
    for (const c of cats) {
      out.push({ title: STICKER_CAT_NAMES[c] || c, items: all.filter(s => s.cat === c).map(stickerItem), note: /^Outfits/.test(c) ? 'Each outfit comes with a face slot — add a selfie and the background is cut away.' : null });
    }
    return out;
  }
  function elementsPanel() {
    const cat = elementCatalog();
    const body = h('div');
    const draw = q => {
      if (!q) {
        body.replaceChildren(...cat.map(c => shelf(c.title, c.items, { grid: c.grid, limit: c.limit, note: c.note })).filter(Boolean));
      } else {
        const hits = cat.flatMap(c => c.items.filter(it => it.name.toLowerCase().includes(q) || (it.tags || '').toLowerCase().includes(q) || c.title.toLowerCase().includes(q)));
        body.replaceChildren(hits.length ? h('div.stk-grid', null, hits.slice(0, 120).map(it => it.node())) : h('p.hint', null, 'Nothing matches — try “arrow”, “heart”, “flower” or “calendar”.'));
      }
      hydrateIcons(body);
    };
    draw((queries.elements || '').trim().toLowerCase());
    return [panelHead('Elements'), searchBox('Search stickers, shapes, garden…', draw), body];
  }
  function scaleTo(e, W) {
    const s = W / 1080;
    if (s === 1) return;
    e.width *= s; e.height *= s;
    if (e.fontSize) e.fontSize *= s;
  }

  /* text */
  function addText(over) { return S.addElement(S.mk('text', over)); }
  S.on('addText', () => addText({ text: 'Your text', fontSize: Math.round(S.doc.width * 0.08) }));
  function scaleTextPreset(e, s) {
    if (e.fontSize) e.fontSize = Math.round(e.fontSize * s);
    if (e.bg) for (const k of ['padX', 'padY', 'gap', 'radius', 'borderWidth']) if (e.bg[k]) e.bg[k] *= s;
    if (e.stroke && e.stroke.width) e.stroke.width *= s;
  }
  function textPanel() {
    const W = S.doc.width;
    const presets = (window.STUDIO_TEXT_PRESETS || []).map(p => ({
      name: p.name,
      node: () => {
        const el = S.mk('text', S.clone(p.el));
        S.autosize(el, false);
        const tile = h('button.preset' + (p.dark ? '.dark' : ''), { type: 'button', title: p.name, onclick: () => { const e = S.clone(p.el); scaleTextPreset(e, W / 1080); addText(e); } }, elThumb(el, 128, 64, 12));
        dragPayload(tile, () => { const e = S.clone(p.el); scaleTextPreset(e, W / 1080); return { kind: 'element', el: S.mk('text', e) }; });
        return tile;
      },
    }));
    const paths = elementCatalog().find(c => c.title === 'Ribbons & text paths');
    const badge = elTile('Circular badge', () => S.mk('badge', { width: W * 0.3, height: W * 0.3 }), { cls: 'preset', tw: 80, th: 80, caption: true });
    const fams = F.customFamilies();
    return [
      panelHead('Text'),
      h('div.add-text', null,
        h('button.add-text-btn', { type: 'button', onclick: () => addText({ text: 'Add a heading', fontFamily: 'Instrument Serif', fontSize: Math.round(W * 0.11) }) }, h('span', { style: { fontFamily: '"Instrument Serif"', fontSize: '26px' } }, 'Heading')),
        h('button.add-text-btn', { type: 'button', onclick: () => addText({ text: 'Add a subheading', fontFamily: 'Bricolage Grotesque', fontWeight: 600, fontSize: Math.round(W * 0.05) }) }, h('span', { style: { fontFamily: '"Bricolage Grotesque"', fontWeight: 600, fontSize: '17px' } }, 'Subheading')),
        h('button.add-text-btn', { type: 'button', onclick: () => addText({ text: 'Add a little body text', fontFamily: 'Instrument Sans', fontSize: Math.round(W * 0.032), lineHeight: 1.35 }) }, h('span', { style: { fontFamily: '"Instrument Sans"', fontSize: '13px' } }, 'Body text'))),
      shelf('Styles', presets, { grid: 'preset-grid', limit: 8 }),
      paths ? shelf('Text on a path', [...paths.items, badge], { grid: 'wide-grid', limit: 4 }) : null,
      h('div.shelf', null,
        h('div.shelf-head', null, h('h3', null, 'Your fonts'), h('button.see-all', { type: 'button', onclick: () => pickFonts(() => renderPanel()) }, ic('upload'), 'Upload')),
        fams.length
          ? h('div.font-chips', null, fams.map(fam => h('button.chip', {
            type: 'button', style: { fontFamily: `"${fam}", sans-serif` },
            onclick: () => { const meta = F.BY_NAME[fam]; addText({ text: fam, fontFamily: fam, fontWeight: meta && meta.weights.includes(500) ? 500 : F.nearestWeight(fam, 400), fontSize: Math.round(W * 0.08) }); },
          }, fam)))
          : h('p.hint', null, 'Add fonts you own (.otf, .ttf, .woff or a .zip). They stay in this browser and travel inside project files.')),
    ];
  }

  /* photos */
  // uploads can be photos or videos; videos show their first frame with a play mark
  function assetThumb(id) {
    if (!R.isVideoAsset(id)) return h('img', { src: S.assets[id], alt: '' });
    const c = h('canvas.vid-thumb');
    const ve = R.assetVideo(id);
    const paint = () => { const v = ve.v, m = R.mediaSize(v); if (!m || !m.w) return; const s = 160 / Math.max(m.w, m.h); c.width = Math.round(m.w * s); c.height = Math.round(m.h * s); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); };
    if (ve) { if (ve.ok) paint(); else ve.promise.then(paint); ve.v.addEventListener('seeked', paint, { once: true }); }
    return h('span.vid-wrap', null, c, h('span.vid-badge', null, ic('play')));
  }
  function photosPanel() {
    const W = S.doc.width;
    const dz = h('div.drop-zone', { onclick: () => S.pickImages({}) }, ic('upload'), h('div', null, h('b', null, 'Upload photos or videos'), h('div.hint', null, 'or drop them here · paste with ⌘V')));
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); S.importFiles([...e.dataTransfer.files], { uploadOnly: true }); });
    const ups = S.uploads.filter(id => S.assets[id]).map(id => ({
      name: 'Upload',
      node: () => {
        const b = h('button.upl', { type: 'button', title: 'Add to canvas', onclick: () => S.addImageFromAsset(id) }, assetThumb(id),
          h('span.upl-bg', { onclick: e => { e.stopPropagation(); S.setBackgroundImage(id); toast('Set as background'); } }, 'Background'));
        dragPayload(b, { kind: 'asset', id });
        return b;
      },
    }));
    const sel = S.selEls();
    const target = sel.length === 1 && sel[0].type === 'image' ? sel[0] : null;
    const tints = [['#e7e1d4', '#cfc5b1'], ['#f3d9d0', '#e3b4a6'], ['#d8e4d2', '#b4c9aa'], ['#dad6ef', '#b9b2de'], ['#f4e6c2', '#e6cf93'], ['#d3e3ee', '#a9c6db']];
    let ti = 0;
    const frames = Object.entries(R.FRAMES).map(([k, l]) => {
      const tint = tints[ti++ % tints.length];
      const make = () => {
        const sz = W * 0.42;
        const bordered = BORDER_FRAMES.includes(k);
        return S.mk('image', {
          width: sz, height: k === 'polaroid' ? sz * 1.2 : k === 'arch' ? sz * 1.3 : k === 'film' ? sz * 0.8 : k === 'gate' || k === 'filed' ? sz * 0.66 : k === 'scan' ? sz * 0.82 : sz,
          placeholder: tint,
          frame: { style: k, color: FRAME_START[k] ? FRAME_START[k][1] : k === 'film' ? '#1d1b18' : k === 'stamp' ? '#9ab83e' : '#ffffff', size: FRAME_START[k] ? Math.round(sz * FRAME_START[k][0]) : bordered ? Math.round(sz * 0.05) : 0, radius: k === 'rounded' ? sz * 0.08 : 0 },
          shadow: bordered ? { on: true, color: '#000000', opacity: 0.22, blur: 26, x: 0, y: 12 } : undefined,
        });
      };
      return {
        name: l,
        node: () => {
          const tile = h('button.frame-tile', {
            type: 'button', title: target ? `Apply ${l} to the selected photo` : `Add a ${l} photo frame`,
            onclick: () => {
              const cur = S.selEls()[0];
              if (cur && cur.type === 'image') {
                S.changeEl(cur, e => { const n = make(); e.frame = n.frame; e.frame.size = BORDER_FRAMES.includes(k) ? Math.round(Math.min(e.width, e.height) * 0.05) : 0; if (k === 'polaroid') e.height = Math.max(e.height, e.width * 1.18); });
                renderInspector();
              } else S.addElement(make());
            },
          }, elThumb(make(), 56, 56, 2), l);
          if (!target) dragPayload(tile, () => ({ kind: 'element', el: make() }));
          return tile;
        },
      };
    });
    const layouts = (window.STUDIO_PHOTO_LAYOUTS || []).map(L => ({ name: L.name, node: () => h('button.list-btn', { type: 'button', onclick: () => S.addElements(L.build(S.doc).map(e => S.mk(e.type, e))) }, ic('layout'), L.name) }));
    return [
      panelHead('Photos'),
      dz,
      ups.length ? shelf('Your uploads', ups, { grid: 'upl-grid', limit: 6 }) : null,
      shelf(target ? 'Frames · applies to selected photo' : 'Frames', frames, { grid: 'frame-grid', limit: 8 }),
      shelf('Collage layouts', layouts, { grid: 'list-grid', limit: 4 }),
      h('p.hint.panel-tip', null, 'Select a photo to remove its background, try a look (Motion, Fisheye, Gym grit…) or add a ground shadow.'),
    ];
  }
  S.on('uploads', () => { if (tab === 'photos') renderPanel(); });
  S.on('bgremove', st => { if (st === 'start' || st === 'end') { renderInspector(); quickBar(); hydrateIcons(S.quickBar); } });

  /* canvas / backgrounds */
  function applyBackground(b) {
    const keepImg = S.doc.background.assetId;
    S.doc.background = S.deepMerge(S.blankDoc(1, 1, '#fff').background, S.clone(b.bg));
    if (keepImg && b.keepPhoto) S.doc.background.assetId = keepImg;
    S.doc.overlay = S.deepMerge(S.blankDoc(1, 1, '#fff').overlay, S.clone(b.overlay || {}));
    S.touchAll(); S.commit(); renderInspector();
  }
  function backgroundPanel() {
    const bgs = (window.STUDIO_BACKGROUNDS || []).slice();
    const N = window.StudioNature;
    if (N && N.SCENES) for (const [id, sc] of Object.entries(N.SCENES)) bgs.push({ name: sc.label, group: 'Garden & sky', bg: { color: (sc.scene.sky && sc.scene.sky[1]) || '#bfe6f5', scene: Object.assign({ id }, sc.scene) } });
    const groupOf = b => b.group || (b.bg.scene ? 'Garden & sky' : b.bg.crumple ? 'Crumpled paper' : b.bg.gradient && b.bg.gradient !== 'none' ? 'Gradients & film' : b.overlay && b.overlay.grain > 20 ? 'Gradients & film' : 'Paper & patterns');
    const groups = new Map();
    for (const b of bgs) { const g = groupOf(b); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(b); }
    const item = b => ({
      name: b.name,
      node: () => {
        const d = prepDoc({ width: 300, height: 300, background: b.bg, overlay: b.overlay || {}, elements: [] });
        const thumb = h('div.thumb', { style: { aspectRatio: '1' } });
        docThumb('bg:' + b.name, d, 150).then(c => thumb.replaceChildren(c));
        return h('button.tpl.bg-tile', { type: 'button', title: b.name, onclick: () => applyBackground(b) }, thumb, h('div.meta', null, b.name));
      },
    });
    const sw = h('div.color-row', null, PALETTE.map(c => h('button', { type: 'button', style: { background: c }, title: c, onclick: () => { S.change('doc', 'background.gradient', 'none', true); S.change('doc', 'background.scene', null, true); S.change('doc', 'background.color', c); renderInspector(); } })));
    const grads = h('div.color-row', null, GRADIENTS.map(([a, b, t, ang]) => h('button', {
      type: 'button',
      style: { background: t === 'radial' ? `radial-gradient(${a}, ${b})` : `linear-gradient(${ang}deg, ${a}, ${b})` },
      onclick: () => { Object.assign(S.doc.background, { color: a, color2: b, gradient: t, angle: ang, scene: null }); S.touchAll(); S.commit(); renderInspector(); },
    })));
    const order = ['Garden & sky', 'Crumpled paper', 'Paper & patterns', 'Gradients & film'];
    return [
      panelHead('Canvas'),
      h('button.size-btn', { type: 'button', onclick: () => openSizeModal() }, h('span', null, sizeName(S.doc.width, S.doc.height)), h('small', null, `${S.doc.width} × ${S.doc.height}`), ic('resize')),
      h('div.shelf', null, h('div.shelf-head', null, h('h3', null, 'Colour')), sw),
      h('div.shelf', null, h('div.shelf-head', null, h('h3', null, 'Gradient')), grads),
      ...order.filter(g => groups.has(g)).map(g => shelf(g, groups.get(g).map(item), { grid: 'tpl-grid.bg-grid', limit: 4 })),
      S.doc.background.assetId
        ? h('div.btn-row.bg-photo-row', null,
          h('button.list-btn.grow', { type: 'button', onclick: () => S.pickImages({ asBackground: true }) }, ic('bgimg'), 'Replace photo'),
          h('button.list-btn.danger', { type: 'button', title: 'Remove the background photo', onclick: removeBgPhoto }, ic('trash'), 'Remove'))
        : h('button.list-btn', { type: 'button', onclick: () => S.pickImages({ asBackground: true }) }, ic('bgimg'), 'Use a photo or video as the background'),
    ];
  }

  /* layers */
  let dragLayer = null;
  function layersPanel() {
    const els = S.doc.elements.slice().reverse();
    const list = h('div.layers');
    const sel = new Set(S.sel);
    for (const el of els) {
      const thumbEl = S.clone(el); thumbEl.rotation = 0; thumbEl.shadow = { on: false };
      const nameSpan = h('span', null, S.elLabel(el));
      const item = h('div.layer' + (sel.has(el.id) ? '.sel' : '') + (el.hidden ? '.hidden-el' : ''), {
        draggable: true,
        onclick: e => {
          if (e.target.closest('.lbtn')) return;
          // Shift adds, Alt/Option removes, Cmd/Ctrl toggles, a plain click selects just this layer
          if (e.shiftKey) S.select([...new Set([...S.sel, el.id])]);
          else if (e.altKey) S.select(S.sel.filter(x => x !== el.id));
          else if (e.metaKey || e.ctrlKey) S.toggleSelect(el.id);
          else S.select([el.id]);
        },
        onmouseenter: () => S.hover(el.id), onmouseleave: () => S.hover(null),
        ondblclick: e => {
          if (e.target.closest('.lbtn')) return;
          const inp = h('input', { value: el.name || S.elLabel(el) });
          nameSpan.replaceChildren(inp); inp.focus(); inp.select();
          const done = () => { S.changeEl(el, x => { x.name = inp.value.trim(); }); renderPanel(); };
          inp.addEventListener('blur', done); inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') inp.blur(); ev.stopPropagation(); });
        },
      },
      h('div.lthumb', null, elThumb(thumbEl, 30, 30, 2)),
      h('div.lname', null, nameSpan, h('div.ltype', null, typeLabel(el))),
      h('button.lbtn' + (el.locked ? '.on' : ''), { type: 'button', title: el.locked ? 'Unlock' : 'Lock', onclick: () => S.toggleLock([el.id]) }, ic(el.locked ? 'lock' : 'unlock')),
      h('button.lbtn' + (el.hidden ? '' : '.on'), { type: 'button', title: el.hidden ? 'Show' : 'Hide', onclick: () => S.toggleHidden(el.id) }, ic(el.hidden ? 'eyeOff' : 'eye')));
      item.addEventListener('dragstart', e => { dragLayer = el.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', el.id); });
      item.addEventListener('dragover', e => {
        if (!dragLayer) return;
        e.preventDefault();
        const r = item.getBoundingClientRect(), top = e.clientY < r.top + r.height / 2;
        item.classList.toggle('drag-over-top', top); item.classList.toggle('drag-over-bottom', !top);
      });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over-top', 'drag-over-bottom'));
      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('drag-over-top', 'drag-over-bottom');
        if (!dragLayer || dragLayer === el.id) return;
        const r = item.getBoundingClientRect(), top = e.clientY < r.top + r.height / 2;
        const arr = S.doc.elements.filter(x => x.id !== dragLayer);
        let idx = arr.findIndex(x => x.id === el.id);
        if (top) idx += 1;
        S.moveLayer(dragLayer, idx);
        dragLayer = null;
      });
      list.append(item);
    }
    return [
      panelHead('Layers'),
      h('p.hint', { style: { margin: '0 0 10px' } }, 'Top of the list sits in front. Drag to reorder, double-click to rename.'),
      els.length ? list : h('p.hint', null, 'Nothing here yet — add text, stickers or photos.'),
      h('div.layer.bg-layer', { onclick: () => { S.select([]); setTab('background'); } }, h('div.lthumb', { style: { background: S.doc.background.color } }), h('div.lname', null, 'Background', h('div.ltype', null, `${S.doc.width} × ${S.doc.height}`))),
    ];
  }

  /* ───────────────────────── quick bar & context menu ───────────────────────── */

  function quickBar() {
    const q = S.quickBar;
    const els = S.selEls();
    if (!els.length) { q.replaceChildren(); return; }
    const el = els[0];
    const b = (i, t, fn) => h('button', { title: t, onclick: fn }, ic(i));
    const kids = [];
    if (els.length === 1 && el.type === 'text' && !el.locked) kids.push(b('edit', 'Edit text', () => S.editText(el.id)));
    if (els.length === 1 && el.type === 'image' && !el.locked) {
      kids.push(b('replace', el.assetId ? 'Replace photo' : 'Add photo', () => S.pickImages({ replaceId: el.id })));
      if (el.assetId) kids.push(b('crop', 'Crop', () => S.startCrop(el.id)));
      if (el.assetId && !el.bgRemoved) kids.push(b('wand', 'Remove background', () => S.removeBackground(el.id, 'replace')));
    }
    if (kids.length) kids.push(h('div.sep'));
    kids.push(b('copy', 'Duplicate (⌘D)', () => S.duplicate()), b(el.locked ? 'unlock' : 'lock', el.locked ? 'Unlock' : 'Lock', () => S.toggleLock()),
      b('front', 'Bring to front', () => S.order('front')), b('trash', 'Delete', () => S.removeSelected()),
      b('more', 'More', e => contextMenu({ x: e.clientX, y: e.clientY })));
    q.replaceChildren(...kids);
  }
  function contextMenu(at) {
    const els = S.selEls();
    if (!els.length) {
      menu(at, [
        { label: 'Paste', icon: 'paste', kbd: '⌘V', run: () => S.paste(), disabled: !S.hasClipboard() },
        { label: 'Select all', icon: 'layers', kbd: '⌘A', run: () => S.selectAll() },
        '-',
        { label: 'Add text', icon: 'type', kbd: 'T', run: () => S.emit('addText') },
        { label: 'Add photo', icon: 'image', run: () => S.pickImages({}) },
        { label: 'Canvas settings', icon: 'palette', run: () => setTab('background') },
      ]);
      return;
    }
    const el = els[0];
    const items = [];
    if (els.length === 1 && el.type === 'text') items.push({ label: 'Edit text', icon: 'edit', kbd: '↵', run: () => S.editText(el.id) });
    if (els.length === 1 && el.type === 'image') {
      items.push({ label: el.assetId ? 'Replace photo' : 'Add photo', icon: 'replace', run: () => S.pickImages({ replaceId: el.id }) });
      if (el.assetId) items.push({ label: 'Crop', icon: 'crop', run: () => S.startCrop(el.id) }, { label: 'Use as background', icon: 'bgimg', run: () => S.setBackgroundImage(el.assetId) });
      if (el.assetId && !el.bgRemoved) items.push({ label: 'Remove background', icon: 'wand', run: () => S.removeBackground(el.id, 'replace') }, { label: 'Cut out subject to a layer', icon: 'layers', run: () => S.removeBackground(el.id, 'layer') });
      if (el.bgRemoved) items.push({ label: 'Restore background', icon: 'undo', run: () => S.restoreBackground(el.id) });
    }
    if (items.length) items.push('-');
    items.push(
      { label: 'Duplicate', icon: 'copy', kbd: '⌘D', run: () => S.duplicate() },
      { label: 'Copy', icon: 'copy', kbd: '⌘C', run: () => S.copy() },
      { label: 'Paste', icon: 'paste', kbd: '⌘V', run: () => S.paste(), disabled: !S.hasClipboard() },
      { label: 'Copy properties', icon: 'copy', kbd: '⌥⌘C', run: () => S.copyStyle() },
      { label: 'Paste properties', icon: 'paste', kbd: '⌥⌘V', run: () => S.pasteStyle(), disabled: !S.hasStyleClip() },
      { label: 'Flip horizontal', icon: 'flipH', kbd: '⇧H', run: () => S.flip('x') },
      { label: 'Flip vertical', icon: 'flipV', kbd: '⇧V', run: () => S.flip('y') },
      '-',
      { label: 'Bring to front', icon: 'front', kbd: '⇧⌘]', run: () => S.order('front') },
      { label: 'Bring forward', icon: 'forward', kbd: '⌘]', run: () => S.order('forward') },
      { label: 'Send backward', icon: 'backward', kbd: '⌘[', run: () => S.order('backward') },
      { label: 'Send to back', icon: 'back', kbd: '⇧⌘[', run: () => S.order('back') },
      '-',
      { label: 'Centre on canvas', icon: 'guides', run: () => { S.align('hcenter'); S.align('vcenter'); } },
      { label: el.locked ? 'Unlock' : 'Lock', icon: el.locked ? 'unlock' : 'lock', kbd: '⌘L', run: () => S.toggleLock() },
      { label: 'Hide', icon: 'eyeOff', run: () => els.forEach(e => S.toggleHidden(e.id)) },
      { label: 'Delete', icon: 'trash', kbd: '⌫', run: () => S.removeSelected() },
    );
    menu(at, items);
  }
  S.on('contextmenu', (x, y) => contextMenu({ x, y }));
  S.on('quick', () => { quickBar(); hydrateIcons(S.quickBar); });

  /* ───────────────────────── top bar, dock & zoom ───────────────────────── */

  function updateTop() {
    $('#btn-undo').disabled = !S.canUndo();
    $('#btn-redo').disabled = !S.canRedo();
    $('#size-label').textContent = `${S.doc.width} × ${S.doc.height}`;
    $('#btn-zoom-fit').textContent = Math.round(S.view.scale * 100) + '%';
    $('#btn-view').classList.toggle('on', !!(S.settings.grid || S.settings.snapGrid));
    $('#btn-animate').classList.toggle('on', S.hasAnimation());
    updateDock();
  }
  $('#btn-undo').onclick = () => S.undo();
  $('#btn-redo').onclick = () => S.redo();
  $('#btn-export').onclick = () => openExport();
  $('#size-label').onclick = () => openSizeModal();
  $('#btn-menu').onclick = e => menu(e.currentTarget, [
    { label: 'Home — all designs', icon: 'home', run: () => openHome() },
    { label: 'New design…', icon: 'plus', run: () => customSizeModal() },
    { label: 'Save to my designs', icon: 'check', kbd: '⌘S', run: () => S.projects.markSaved().then(() => toast('Saved to your designs')) },
    { label: 'Save as template…', icon: 'layout', run: () => saveTemplateModal() },
    { label: 'Open project file…', icon: 'folder', run: () => { $('#project-input').value = ''; $('#project-input').click(); } },
    { label: 'Download project file', icon: 'download', run: saveProject },
    '-',
    { label: 'Canvas size…', icon: 'resize', run: () => openSizeModal() },
    { label: 'Export…', icon: 'image', kbd: '⌘E', run: () => openExport() },
    '-',
    { label: 'Keyboard shortcuts', icon: 'help', kbd: '?', run: () => openHelp() },
  ]);
  $('#btn-zoom-in').onclick = () => S.zoomBy(1.2);
  $('#btn-zoom-out').onclick = () => S.zoomBy(1 / 1.2);
  $('#btn-zoom-fit').onclick = e => menu(e.currentTarget, [
    { label: 'Fit to screen', icon: 'resize', kbd: '⌘0', run: () => S.fit() },
    { label: 'Zoom to 50%', icon: 'minus', run: () => S.zoomAt(0.5) },
    { label: 'Zoom to 100%', icon: 'plus', kbd: '⌘1', run: () => S.zoomAt(1) },
    { label: 'Zoom to 200%', icon: 'plus', run: () => S.zoomAt(2) },
  ]);
  function viewMenu(anchor) {
    const set = (k, v) => { S.settings[k] = v; S.saveSettings(); S.redraw(); updateTop(); };
    const item = (label, on, run) => h('button.view-item', { type: 'button', onclick: () => { run(); viewMenu(anchor); } }, h('span', null, label), h('span.switch' + (on ? '.on' : '')));
    const sizes = [10, 20, 30, 40, 60, 80, 108, 120];
    popover(anchor, [
      h('div.pop-title', null, 'Grid & snapping'),
      item('Smart guides & centre lines', S.settings.guides, () => set('guides', !S.settings.guides)),
      item('Show grid', S.settings.grid, () => set('grid', !S.settings.grid)),
      item('Snap to grid', S.settings.snapGrid, () => { set('snapGrid', !S.settings.snapGrid); if (S.settings.snapGrid) set('grid', true); }),
      h('div.view-sizes', null, h('span', null, 'Grid size'), h('div.seg', null, sizes.map(g => h('button' + (S.settings.gridSize === g ? '.on' : ''), { type: 'button', onclick: () => { S.settings.gridSize = g; S.settings.grid = true; S.saveSettings(); S.redraw(); updateTop(); viewMenu(anchor); } }, g)))),
      h('p.hint', null, 'Hold Ctrl while dragging to skip snapping.'),
    ], { cls: 'view-pop' });
    const pop = $('.view-pop'), r = anchor.getBoundingClientRect();
    if (pop) { pop.style.top = Math.max(8, r.top - pop.offsetHeight - 8) + 'px'; pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, r.right - pop.offsetWidth)) + 'px'; }
  }
  $('#btn-view').onclick = e => viewMenu(e.currentTarget);

  // floating tool dock under the canvas
  const dock = $('#dock');
  function updateDock() {
    $$('button[data-tool]', dock).forEach(b => b.classList.toggle('on', S.tool === b.dataset.tool));
  }
  function buildDock() {
    const W = () => S.doc.width;
    const tool = (t, iconName, title) => h('button.dock-btn', { type: 'button', 'data-tool': t, title, onclick: () => S.setTool(S.tool === t && t !== 'select' ? 'select' : t) }, ic(iconName));
    const act = (iconName, title, run) => h('button.dock-btn', { type: 'button', title, onclick: run }, ic(iconName));
    dock.replaceChildren(
      tool('select', 'cursor', 'Select (V)'),
      tool('hand', 'hand', 'Hand — drag to pan (H, or hold Space)'),
      h('span.dock-sep'),
      act('type', 'Add text (T)', () => S.emit('addText')),
      act('shapes', 'Add a shape', e => menu(e.currentTarget, [
        { label: 'Rectangle', icon: 'square', run: () => S.addElement(S.mk('shape', { shape: 'rect', width: W() * 0.3, height: W() * 0.3 })) },
        { label: 'Circle', icon: 'circle', run: () => S.addElement(S.mk('shape', { shape: 'ellipse', width: W() * 0.3, height: W() * 0.3, fill: '#f7d046' })) },
        { label: 'Star', icon: 'sparkle', run: () => S.addElement(S.mk('shape', { shape: 'star', width: W() * 0.3, height: W() * 0.3, fill: '#ff8a3d' })) },
        { label: 'Line', icon: 'minus', run: () => S.addElement(S.mk('shape', { shape: 'line', stroke: '#1d1b18', strokeWidth: 8, width: W() * 0.4, height: 60 })) },
        { label: 'Curved arrow', icon: 'forward', run: () => S.addElement(S.mk('ribbon', { path: 'hook', line: true, thickness: 4, color: '#1d1b18', text: '', arrowEnd: true, width: W() * 0.3, height: W() * 0.24 })) },
        { label: 'Ribbon with text', icon: 'path', run: () => S.addElement(S.mk('ribbon', { width: W() * 0.85, height: W() * 0.3, thickness: W() * 0.07, fontSize: W() * 0.03 })) },
        '-',
        { label: 'More elements…', icon: 'more', run: () => setTab('elements') },
      ])),
      act('image', 'Add photos', () => S.pickImages({})),
      tool('erase', 'eraser', 'Eraser (E)'),
    );
    hydrateIcons(dock);
    updateDock();
  }
  buildDock();
  S.on('tool', updateDock);

  const nameInput = $('#doc-name');
  nameInput.addEventListener('input', () => { S.docName = nameInput.value || 'Untitled design'; S.scheduleSave(); });
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') nameInput.blur(); e.stopPropagation(); });
  S.on('name', () => { nameInput.value = S.docName; });
  S.on('history', updateTop);
  S.on('view', updateTop);
  S.on('settings', updateTop);
  S.on('help', () => openHelp());
  S.on('export', () => openExport());

  function slug() { return (S.docName || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design'; }
  // Embedded hosts (the shared Claude link) block page-started downloads but
  // offer a confirmed save; everywhere else a plain download link is used.
  let dlCap = null;
  function downloadsCap() {
    if (!dlCap) dlCap = window.claude && typeof window.claude.use === 'function' ? Promise.resolve(window.claude.use('downloads')).catch(() => null) : Promise.resolve(null);
    return dlCap;
  }
  downloadsCap();
  async function download(blob, name) {
    const dl = await downloadsCap();
    if (dl) {
      try { await dl.save({ filename: name, data: blob }); return 'saved'; }
      catch (e) {
        const code = e && e.code;
        if (code === 'declined') { toast('Save cancelled'); return 'declined'; }
        if (code === 'rate_limited') { toast('A save prompt is already open'); return 'busy'; }
        if (code === 'too_large') { toast('That file is too large to save here — try a smaller size'); return 'failed'; }
        // anything else: fall back to an ordinary download below
      }
    }
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return 'started';
  }
  function saveProject() {
    const blob = new Blob([JSON.stringify(S.projectData())], { type: 'application/json' });
    download(blob, slug() + '.studio.json').then(r => { if (r === 'saved' || r === 'started') toast('Project file saved'); });
  }
  $('#project-input').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.doc) throw new Error('bad');
      if (data.fonts && data.fonts.length) { await F.unpackFamilies(data.fonts); R.fontsVersion++; }
      if (data.kind === 'template') {
        await S.myTemplates.add(data, data.name || f.name.replace(/(\.template)?\.studio\.json$|\.json$/, ''));
        toast(`Added “${data.name || 'template'}” to My templates`);
        return;
      }
      S.loadDoc(data.doc, data.assets || {}, { name: data.name || f.name.replace(/\.studio\.json$|\.json$/, ''), project: 'new' });
      S.uploads.splice(0, S.uploads.length, ...(data.uploads || []));
      S.saveNow();
      if (isHome()) leaveHome();
      toast('Project opened — it’s now in your designs');
    } catch (err) { toast('That file isn’t a Savio’s editor project'); }
  });

  /* ───────────────────────── dialogs ───────────────────────── */

  const SIZES = [
    ['Square post', 1080, 1080], ['Portrait post', 1080, 1350], ['Story / Reel', 1080, 1920], ['Landscape', 1920, 1080],
    ['Pinterest pin', 1000, 1500], ['A4 poster', 1240, 1754], ['X / Twitter', 1600, 900], ['Wallpaper', 1170, 2532],
  ];
  function sizeTiles(cur, onPick) {
    return h('div.size-grid', null, SIZES.map(([n, w, hh]) => {
      const s = 30 / Math.max(w, hh);
      return h('button.size-opt' + (cur && cur[0] === w && cur[1] === hh ? '.on' : ''), { onclick: e => { $$('.size-opt', e.currentTarget.parentNode).forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on'); onPick(w, hh); } },
        h('div.ratio', { style: { width: w * s + 'px', height: hh * s + 'px' } }), n, h('small', null, `${w}×${hh}`));
    }));
  }
  function openSizeModal() {
    let W = S.doc.width, H = S.doc.height, scale = true;
    const wIn = h('input', { type: 'text', value: W }), hIn = h('input', { type: 'text', value: H });
    const box = modal([
      h('h1', null, 'Canvas size'),
      h('p.lead', null, 'Pick a format or type your own. Elements can scale with the canvas.'),
      sizeTiles([W, H], (w, hh) => { W = w; H = hh; wIn.value = w; hIn.value = hh; }),
      h('div.custom-size', null, h('div.num', null, h('span.lbl', null, 'W'), wIn, h('span.unit', null, 'px')), '×', h('div.num', null, h('span.lbl', null, 'H'), hIn, h('span.unit', null, 'px'))),
      h('div.toggle-row', { style: { marginTop: '12px' } }, h('label', null, 'Scale elements to fit the new size'), (() => { const s = h('button.switch.on', { onclick: () => { scale = !scale; s.classList.toggle('on', scale); } }); return s; })()),
      h('div.btn-row', { style: { marginTop: '16px' } }, h('button.btn', { onclick: closeModal }, 'Cancel'), h('button.btn.primary', {
        onclick: () => {
          const w = clamp(parseInt(wIn.value, 10) || W, 64, 6000), hh = clamp(parseInt(hIn.value, 10) || H, 64, 6000);
          closeModal(); S.resizeCanvas(w, hh, scale); updateTop();
        },
      }, 'Apply')),
    ], { small: true });
    box.style.width = 'min(560px, 100%)';
  }

  /* ───────────────────────── home: your designs & new ones ───────────────────────── */

  const home = $('#home');
  const HOME_SIZES = [['Portrait post', 1080, 1350], ['Square post', 1080, 1080], ['Story / Reel', 1080, 1920], ['Landscape', 1920, 1080]];
  const hs = { filter: 'all', sort: 'edited', q: '', tag: 'All', allTpl: false };
  function ago(t) {
    const s = (Date.now() - t) / 1000;
    if (s < 45) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    if (s < 86400 * 7) { const d = Math.round(s / 86400); return d === 1 ? 'yesterday' : d + ' days ago'; }
    return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  }
  function isHome() { return !home.hidden; }
  async function openHome() {
    if (S.isPlaying()) S.pause();
    if (R.playTime != null) S.stopPreview();
    closeModal(); closePop();
    await S.saveNow();
    home.hidden = false;
    document.body.classList.add('at-home');
    renderHome();
  }
  function leaveHome() {
    home.hidden = true;
    document.body.classList.remove('at-home');
    S.fit(); updateTop(); renderInspector(); renderPanel();
  }
  function startBlank(w, hh, color) { S.newDoc(w, hh, color || '#ffffff', {}, { project: 'new' }); leaveHome(); }
  function startTemplate(t) { templateFonts(t); S.loadDoc(prepDoc(t.build()), null, { name: tplName(t), project: 'new' }); leaveHome(); }
  function startPhoto(files) {
    const opts = { startFromPhoto: true, newProject: true, onStart: () => { if (isHome()) leaveHome(); } };
    if (files) S.importFiles(files, opts); else S.pickImages(opts);
  }
  async function openProject(id) {
    const data = await S.projects.get(id);
    if (!data || !data.doc) { toast('That design couldn’t be opened'); return; }
    S.uploads.splice(0, S.uploads.length, ...(data.uploads || []));
    S.loadDoc(data.doc, data.assets || {}, { name: data.name || 'Untitled design', project: id });
    leaveHome();
  }
  function customSizeModal() {
    let W = 1080, H = 1350, color = '#ffffff';
    const colors = ['#ffffff', '#f6f1e7', '#efe6d2', '#1f5a4a', '#1d1b18', '#f7b4c8', '#c9b6f2', '#d7ef5a', '#9ad1f5', '#ff8a3d'];
    const crow = h('div.color-row', null, colors.map(c => h('button' + (c === color ? '.on' : ''), { type: 'button', title: c, style: { background: c }, onclick: e => { color = c; $$('button', crow).forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on'); } })));
    const wIn = h('input', { type: 'text', value: W }), hIn = h('input', { type: 'text', value: H });
    const box = modal([
      h('h1', null, 'New design'),
      h('p.lead', null, 'Pick a format or type your own size, then a starting colour.'),
      sizeTiles([W, H], (w, hh) => { W = w; H = hh; wIn.value = w; hIn.value = hh; }),
      h('div.custom-size', null, h('div.num', null, h('span.lbl', null, 'W'), wIn, h('span.unit', null, 'px')), '×', h('div.num', null, h('span.lbl', null, 'H'), hIn, h('span.unit', null, 'px'))),
      h('div.sub-label', { style: { marginTop: '16px' } }, 'Background'), crow,
      h('div.btn-row', { style: { marginTop: '18px' } }, h('button.btn', { type: 'button', onclick: closeModal }, 'Cancel'),
        h('button.btn.primary', { type: 'button', onclick: () => { closeModal(); startBlank(clamp(parseInt(wIn.value, 10) || W, 64, 6000), clamp(parseInt(hIn.value, 10) || H, 64, 6000), color); } }, 'Create design')),
    ], { small: true });
    box.style.width = 'min(560px, 100%)';
  }
  function familyModal(g, members) {
    if (combined(members)) return typesModal(g, members);
    const box = modal([
      h('h1', null, g),
      h('p.lead', null, members[0].video ? `${members.length} styles — hover one to preview its motion.` : `${members.length} styles — pick one, then make it yours.`),
      h('div.home-tpls', null, members.map(t => templateCard(t, tt => { closeModal(); startTemplate(tt); }, 220))),
    ]);
    box.style.width = 'min(900px, 100%)';
    hydrateIcons(box);
  }
  // combined family on the home page: its types, then each type's ratios
  function typesModal(g, members) {
    const types = styleGroups(members);
    const box = modal([
      h('h1', null, g),
      h('p.lead', null, `${types.length} types — pick one, then choose its ratio.`),
      h('div.home-tpls', null, types.map(m => templateCard(m[0], () => ratiosModal(g, m), 220, { family: true, label: m[0].style, title: `Choose a ratio for “${m[0].style}”` }))),
    ]);
    box.style.width = 'min(900px, 100%)';
    hydrateIcons(box);
  }
  function ratiosModal(g, members) {
    const box = modal([
      h('h1', null, members[0].style),
      h('p.lead', null, `${g} · choose the ratio, then start your design.`),
      h('div.home-tpls', null, members.map(t => templateCard(t, tt => { closeModal(); startTemplate(tt); }, 220))),
    ]);
    box.style.width = 'min(900px, 100%)';
    hydrateIcons(box);
  }
  function renameInline(nameEl, p) {
    const inp = h('input.proj-rename', { value: p.name, 'aria-label': 'Design name' });
    const done = ok => { const v = inp.value.trim(); inp.replaceWith(nameEl); if (ok && v && v !== p.name) { nameEl.textContent = v; S.projects.update(p.id, { name: v }); } };
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); });
    inp.addEventListener('blur', () => done(true));
    nameEl.replaceWith(inp); inp.focus(); inp.select();
  }
  async function deleteProject(p) {
    const r = await S.projects.remove(p.id);
    toast(`Deleted “${p.name}”`, { label: 'Undo', run: () => S.projects.restore(r) });
  }
  async function downloadProject(p) {
    const data = await S.projects.get(p.id);
    if (!data) return;
    const name = (p.name || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design';
    const blob = new Blob([JSON.stringify({ app: 'collage-studio', version: 1, name: p.name, doc: data.doc, assets: data.assets, uploads: data.uploads })], { type: 'application/json' });
    download(blob, name + '.studio.json');
  }
  function projectCard(p) {
    const thumb = h('div.proj-thumb');
    if (p.thumb) thumb.append(h('img', { src: p.thumb, alt: '' }));
    else {
      thumb.classList.add('skeleton');
      S.projects.get(p.id).then(data => {
        if (!data || !data.doc) return;
        R.setAssets(Object.assign(S.assets, data.assets || {}));
        docThumb('proj:' + p.id + ':' + p.savedAt, prepDoc(data.doc), 360).then(c => { thumb.classList.remove('skeleton'); thumb.replaceChildren(h('img', { src: c.toDataURL('image/jpeg', 0.8), alt: '' })); });
      });
    }
    const nameEl = h('b.proj-name', { title: 'Double-click to rename' }, p.name || 'Untitled design');
    nameEl.addEventListener('dblclick', e => { e.stopPropagation(); renameInline(nameEl, p); });
    const saved = p.status === 'saved';
    const more = h('button.icon-btn.proj-more', { type: 'button', title: 'More', onclick: e => { e.stopPropagation(); menu(e.currentTarget, [
      { label: 'Open', icon: 'chevRight', run: () => openProject(p.id) },
      { label: 'Rename', icon: 'edit', run: () => renameInline(nameEl, p) },
      { label: 'Duplicate', icon: 'copy', run: () => S.projects.duplicate(p.id).then(() => toast('Duplicated')) },
      { label: saved ? 'Move to drafts' : 'Mark as saved', icon: saved ? 'undo' : 'check', run: () => S.projects.update(p.id, { status: saved ? 'draft' : 'saved' }) },
      { label: 'Download project file', icon: 'download', run: () => downloadProject(p) },
      '-',
      { label: 'Delete', icon: 'trash', run: () => deleteProject(p) },
    ]); } }, ic('more'));
    const card = h('div.proj', null,
      h('button.proj-open', { type: 'button', title: `Open “${p.name}”`, onclick: () => openProject(p.id) }, thumb,
        p.video ? h('span.tpl-badge', null, ic('play'), 'Video') : null,
        h('span.proj-status' + (saved ? '.saved' : ''), null, saved ? 'Saved' : 'Draft')),
      h('div.proj-meta', null, h('div.proj-text', null, nameEl, h('small', null, `Edited ${ago(p.savedAt)} · ${p.w} × ${p.h}`)), more));
    return card;
  }
  function drawHomeMine(slot) {
    slot = slot || $('.home-mine');
    if (!slot) return;
    const q = hs.q.trim().toLowerCase();
    const list = myTpls.filter(t => !q || t.name.toLowerCase().includes(q));
    slot.hidden = !list.length;
    slot.replaceChildren(h('div.home-head', null, h('h2', null, 'My templates')), h('div.home-tpls', null, list.map(t => myTemplateCard(t, startTemplate, 220))));
    hydrateIcons(slot);
  }
  let homeTplGrid = null;
  function drawHomeTemplates() {
    if (!homeTplGrid) return;
    const T = window.STUDIO_TEMPLATES || [];
    const q = hs.q.trim().toLowerCase();
    const list = T.filter(t => (hs.tag === 'All' || (t.tags || []).includes(hs.tag)) && (!q || t.name.toLowerCase().includes(q) || (t.group || '').toLowerCase().includes(q) || (t.tags || []).some(g => g.toLowerCase().includes(q))));
    const seen = new Set(), cards = [];
    for (const t of list) {
      if (t.group && !q) {
        if (seen.has(t.group)) continue;
        seen.add(t.group);
        const members = T.filter(x => x.group === t.group);
        cards.push(templateCard(t, () => familyModal(t.group, members), 220, { family: true, count: countOf(members), label: t.group, title: `See all ${countOf(members)} styles of “${t.group}”` }));
      } else cards.push(templateCard(t, startTemplate, 220));
    }
    const limit = hs.allTpl || q ? cards.length : 12;
    homeTplGrid.replaceChildren(...cards.slice(0, limit));
    if (!cards.length) homeTplGrid.append(h('p.hint', null, 'No templates match.'));
    const btn = $('#home-tpl-more');
    if (btn) { btn.hidden = cards.length <= 12 || !!q; btn.textContent = hs.allTpl ? 'Show fewer' : `Show all ${cards.length}`; }
    hydrateIcons(homeTplGrid);
  }
  async function drawProjects(slot, tabs) {
    const all = (await S.projects.list()).slice();
    const q = hs.q.trim().toLowerCase();
    const counts = { all: all.length, draft: all.filter(p => p.status !== 'saved').length, saved: all.filter(p => p.status === 'saved').length };
    tabs.replaceChildren(...[['all', 'All'], ['draft', 'Drafts'], ['saved', 'Saved']].map(([k, l]) =>
      h('button' + (hs.filter === k ? '.on' : ''), { type: 'button', onclick: () => { hs.filter = k; drawProjects(slot, tabs); } }, l, h('span.count', null, counts[k]))));
    let list = all.filter(p => (hs.filter === 'all' || (hs.filter === 'saved' ? p.status === 'saved' : p.status !== 'saved')) && (!q || (p.name || '').toLowerCase().includes(q)));
    list.sort(hs.sort === 'name' ? (a, b) => (a.name || '').localeCompare(b.name || '') : hs.sort === 'created' ? (a, b) => (b.created || 0) - (a.created || 0) : (a, b) => b.savedAt - a.savedAt);
    if (!list.length) {
      slot.replaceChildren(h('div.proj-empty', null,
        h('div.proj-empty-art', null, h('span'), h('span'), h('span')),
        h('b', null, q ? 'No designs match your search' : all.length ? (hs.filter === 'saved' ? 'Nothing saved yet' : 'No drafts') : 'No designs yet'),
        h('p', null, q ? 'Try another name.' : all.length ? (hs.filter === 'saved' ? 'Press ⌘S (Ctrl+S) in a design, or use Mark as saved, to keep it here.' : 'Everything you start lands here as a draft until you save it.') : 'Start one above — everything you make is kept here automatically.')));
      return;
    }
    slot.replaceChildren(h('div.proj-grid', null, list.map(projectCard)));
    hydrateIcons(slot);
  }
  function renderHome() {
    const T = window.STUDIO_TEMPLATES || [];
    const search = h('input.home-search-in', { type: 'search', placeholder: 'Search designs and templates', value: hs.q, 'aria-label': 'Search' });
    const projSlot = h('div'), tabs = h('div.seg.home-tabs');
    search.addEventListener('input', () => { hs.q = search.value; drawProjects(projSlot, tabs); drawHomeTemplates(); drawHomeMine(); });
    search.addEventListener('keydown', e => e.stopPropagation());
    const sizeCard = ([n, w, hh]) => {
      const sc = 54 / Math.max(w, hh);
      return h('button.start-card', { type: 'button', onclick: () => startBlank(w, hh) },
        h('div.start-art', null, h('div.start-ratio', { style: { width: w * sc + 'px', height: hh * sc + 'px' } })), h('b', null, n), h('small', null, `${w} × ${hh}`));
    };
    const photoCard = h('button.start-card.photo', { type: 'button', onclick: () => startPhoto() },
      h('div.start-art', null, ic('image')), h('b', null, 'From a photo or video'), h('small', null, 'Click or drop one here'));
    photoCard.addEventListener('dragover', e => { e.preventDefault(); photoCard.classList.add('over'); });
    photoCard.addEventListener('dragleave', () => photoCard.classList.remove('over'));
    photoCard.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); photoCard.classList.remove('over'); startPhoto([...e.dataTransfer.files]); });
    const tags = ['All', 'Video', ...[...new Set(T.flatMap(t => t.tags || []))].filter(x => x !== 'Video')];
    const chips = h('div.chips.scroll');
    const drawChips = () => chips.replaceChildren(...tags.map(tg => h('button.chip' + (tg === hs.tag ? '.on' : ''), { type: 'button', onclick: () => { hs.tag = tg; drawChips(); drawHomeTemplates(); } }, tg)));
    drawChips();
    homeTplGrid = h('div.home-tpls');
    const sortSel = h('select.sel.home-sort', { 'aria-label': 'Sort designs', onchange: e => { hs.sort = e.target.value; drawProjects(projSlot, tabs); } },
      [['edited', 'Last edited'], ['created', 'Newest first'], ['name', 'Name']].map(([v, l]) => h('option', { value: v, selected: hs.sort === v }, l)));
    const cur = S.projectId;
    const homeMine = h('section.home-sec.home-mine');
    drawHomeMine(homeMine);
    home.replaceChildren(
      h('header.home-top', null,
        h('div.home-brand', null, h('span.brand-mark'), h('b', null, 'Savio’s editor')),
        h('label.home-search', null, ic('search'), search),
        h('div.home-actions', null,
          cur ? h('button.btn', { type: 'button', onclick: leaveHome, title: 'Back to the design you were editing' }, ic('chevLeft'), h('span', null, 'Back to editor')) : null,
          h('button.btn', { type: 'button', title: 'Open a .studio.json project file', onclick: () => { $('#project-input').value = ''; $('#project-input').click(); } }, ic('folder'), h('span', null, 'Open file')),
          h('button.btn.primary', { type: 'button', onclick: customSizeModal }, ic('plus'), h('span', null, 'New design')))),
      h('main.home-main', null,
        h('section.home-sec', null,
          h('h1.home-title', { html: 'What are we <em>making</em> today?' }),
          h('div.start-row', null, HOME_SIZES.map(sizeCard), photoCard,
            h('button.start-card', { type: 'button', onclick: customSizeModal }, h('div.start-art', null, ic('resize')), h('b', null, 'Custom size'), h('small', null, 'Any width × height')))),
        h('section.home-sec', null,
          h('div.home-head', null, h('h2', null, 'Your designs'), tabs, h('div.grow'), sortSel),
          projSlot),
        homeMine,
        h('section.home-sec', null,
          h('div.home-head', null, h('h2', null, 'Start from a template')),
          chips, homeTplGrid,
          h('button.btn.home-more', { type: 'button', id: 'home-tpl-more', onclick: () => { hs.allTpl = !hs.allTpl; drawHomeTemplates(); } }, 'Show all'))));
    hydrateIcons(home);
    drawProjects(projSlot, tabs);
    drawHomeTemplates();
    home._redraw = () => drawProjects(projSlot, tabs);
  }
  S.on('projects', () => { if (isHome() && home._redraw) home._redraw(); updateSaveState(); });
  S.on('templates', () => loadMyTemplates().then(() => { if (tab === 'templates' && !tplGroup && !piecesOf) renderPanel(); if (isHome()) drawHomeMine(); }));
  loadMyTemplates().then(() => { if (myTpls.length) { if (tab === 'templates') renderPanel(); if (isHome()) drawHomeMine(); } });
  S.on('project', updateSaveState);

  // draft / saved state next to the design name
  const saveChip = $('#save-state');
  function updateSaveState() {
    if (!saveChip) return;
    const st = S.projectId ? S.projects.status() : null;
    saveChip.hidden = !st;
    saveChip.classList.toggle('saved', st === 'saved');
    saveChip.replaceChildren(...(st === 'saved' ? [ic('check'), 'Saved'] : ['Draft']));
    saveChip.title = st === 'saved' ? 'Kept in Saved on your home page' : 'Autosaved as a draft — click to save it (⌘S)';
  }
  if (saveChip) saveChip.onclick = () => { if (S.projects.status() !== 'saved') S.projects.markSaved().then(() => toast('Saved to your designs')); else S.projects.update(S.projectId, { status: 'draft' }).then(() => toast('Moved back to drafts')); };

  // export resolutions are named by their short side, so "4K" means 2160 px on the short edge (3840 × 2160 landscape)
  const RES = [['1×', 0], ['HD 720', 720], ['Full HD 1080', 1080], ['2K 1440', 1440], ['4K 2160', 2160]];
  function sizeFor(short, mult) {
    const d = S.doc, s0 = Math.min(d.width, d.height);
    const k = short ? short / s0 : (mult || 1);
    return { w: S.even(d.width * k), h: S.even(d.height * k), k };
  }
  async function openExport(startTab) {
    let mode = startTab || (S.hasAnimation() ? 'video' : 'image');
    // a canvas with no background exports see-through by default
    const clearBg = R.isClearBg(S.doc);
    let fmt = 'png', res = 1080, transparent = clearBg, quality = 0.92;
    let vfmt = clearBg ? 'webm' : 'mp4', vres = 1080, fps = S.doc.anim.fps || 30, vq = 'high', valpha = clearBg;
    let ctrl = null;
    S.pause();
    const preview = h('div.export-preview', null, h('div.hint', null, 'Rendering preview…'));
    const box = modal([]);
    const tabs = h('div.seg.export-tabs');
    const opts = h('div');
    box.style.width = 'min(500px, 100%)';
    box.append(h('h1', null, 'Export'), h('p.lead', null, 'Download your design as an image or, if it’s animated, as a video — up to 4K.'), tabs, preview, opts);
    const segBtn = (cur, v, l, set) => h('button' + (cur === v ? '.on' : ''), { onclick: () => { set(v); draw(); } }, l);
    const drawTabs = () => tabs.replaceChildren(segBtn(mode, 'image', 'Image', v => { mode = v; }), segBtn(mode, 'video', 'Video', v => { mode = v; }));
    function draw() {
      drawTabs();
      if (mode === 'image') {
        const sz = sizeFor(res);
        opts.replaceChildren(...[
          row('Format', h('div.seg', null, segBtn(fmt, 'png', 'PNG', v => { fmt = v; }), segBtn(fmt, 'jpeg', 'JPG', v => { fmt = v; transparent = false; }), segBtn(fmt, 'webp', 'WEBP', v => { fmt = v; }))),
          row('Size', h('div.seg', null, RES.map(([l, v]) => segBtn(res, v, l, x => { res = x; })))),
          fmt !== 'jpeg' ? h('div.toggle-row', null, h('label', null, 'Transparent background'), h('button.switch' + (transparent ? '.on' : ''), { onclick: () => { transparent = !transparent; draw(); } })) : null,
          fmt !== 'png' ? row('Quality', h('input.slider', { type: 'range', min: 50, max: 100, value: Math.round(quality * 100), oninput: e => { quality = e.target.value / 100; } })) : null,
          h('div.hint', null, `${sz.w} × ${sz.h} px · ${fmt.toUpperCase()}`),
          h('div.btn-row', { style: { marginTop: '14px' } },
            navigator.clipboard && window.ClipboardItem ? h('button.btn', { onclick: copyImage }, ic('copy'), 'Copy image') : null,
            h('button.btn.primary', { onclick: doImage, style: { height: '38px' } }, ic('download'), 'Download image')),
        ].filter(Boolean));
      } else {
        const sz = sizeFor(vres);
        const anim = S.hasAnimation();
        opts.replaceChildren(...[
          anim ? null : h('div.hint', { style: { marginBottom: '8px', color: 'var(--ink)' } }, 'Nothing is animated yet. Use Animate in the top bar to bring layers to life — or export a still video.'),
          anim ? null : h('button.btn', { style: { marginBottom: '10px' }, onclick: () => { closeModal(); openAnimate($('#btn-animate')); } }, ic('film'), 'Animate'),
          h('div.toggle-row', null, h('label', null, 'Transparent background'), h('button.switch' + (valpha ? '.on' : ''), { onclick: () => { valpha = !valpha; if (valpha && vfmt === 'mp4') vfmt = 'webm'; draw(); } })),
          row('Format', h('div.seg', null,
            valpha ? null : segBtn(vfmt, 'mp4', 'MP4', v => { vfmt = v; }),
            segBtn(vfmt, 'webm', 'WEBM', v => { vfmt = v; }),
            segBtn(vfmt, 'png', 'PNG frames', v => { vfmt = v; }))),
          valpha ? h('div.hint', { style: { marginBottom: '6px' } }, vfmt === 'png'
            ? 'A .zip of numbered see-through PNGs — import it as an image sequence in Premiere, After Effects, DaVinci or Final Cut.'
            : 'See-through WEBM plays in Chrome, Edge and Firefox and imports into editors that read WEBM. MP4 can’t hold transparency; for iPhone apps use PNG frames.') : null,
          row('Size', h('div.seg', null, RES.slice(1).map(([l, v]) => segBtn(vres, v, l.split(' ')[0], x => { vres = x; })))),
          row('Frame rate', h('div.seg', null, [24, 30, 60].map(f => segBtn(fps, f, f + ' fps', x => { fps = x; })))),
          vfmt === 'png' ? null : row('Quality', h('div.seg', null, segBtn(vq, 'standard', 'Standard', v => { vq = v; }), segBtn(vq, 'high', 'High', v => { vq = v; }), segBtn(vq, 'max', 'Max', v => { vq = v; }))),
          row('Length', num('doc', 'anim.duration', { min: 1, max: 60, step: 0.5, slider: true, unit: 's', set: (v, live) => { S.change('doc', 'anim.duration', v, live); if (!live) draw(); } })),
          h('div.hint', null, `${sz.w} × ${sz.h} px · ${fps} fps · ${S.doc.anim.duration}s` + (vfmt === 'png' ? ` · ${Math.round(S.doc.anim.duration * fps)} frames` : ' · loops seamlessly') + (valpha ? ' · see-through' : '')),
          h('div.progress', { hidden: true }, h('div')),
          h('div.hint.vstatus'),
          h('div.btn-row', { style: { marginTop: '14px' } },
            h('button.btn.vcancel', { hidden: true, onclick: () => ctrl && ctrl.abort() }, 'Cancel'),
            h('button.btn.primary.vgo', { onclick: doVideo, style: { height: '38px' } }, ic('film'), vfmt === 'png' ? 'Render frames' : 'Render video')),
        ].filter(Boolean));
      }
      hydrateIcons(opts);
    }
    async function doImage(e) {
      const btn = e.currentTarget; btn.disabled = true; btn.lastChild.textContent = 'Rendering…';
      try {
        const sz = sizeFor(res);
        let c = await S.render({ scale: sz.k, transparent: transparent && fmt !== 'jpeg', time: null });
        if (fmt === 'jpeg' && clearBg) {
          // JPG has no transparency: put the see-through canvas on white
          const w = document.createElement('canvas'); w.width = c.width; w.height = c.height;
          const x = w.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, w.width, w.height); x.drawImage(c, 0, 0); c = w;
        }
        const blob = await new Promise(r => c.toBlob(r, 'image/' + fmt, quality));
        const name = `${slug()}.${fmt === 'jpeg' ? 'jpg' : fmt}`;
        const url = URL.createObjectURL(blob);
        preview.replaceChildren(h('div.export-result', null, h('img', { src: url, alt: name }),
          h('div.hint', null, `${name} · ${c.width} × ${c.height}. If nothing downloaded, use Save again, or right-click / long-press the image to save it.`),
          h('button.btn', { onclick: () => download(blob, name) }, ic('download'), 'Save again')));
        hydrateIcons(preview);
        const r = await download(blob, name);
        if (r === 'saved' || r === 'started') toast(`Exported ${c.width} × ${c.height}`);
      } catch (err) { console.error(err); toast('Export failed — try a smaller size'); }
      btn.disabled = false; btn.lastChild.textContent = 'Download image';
    }
    async function copyImage() {
      try {
        const c = await S.render({ scale: Math.min(sizeFor(res).k, 2), transparent, time: null });
        const blob = await new Promise(r => c.toBlob(r, 'image/png'));
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
        toast('Image copied to clipboard');
      } catch (err) { toast('Your browser blocked clipboard access'); }
    }
    async function doVideo() {
      const bar = $('.progress', opts), fill = $('.progress > div', opts), status = $('.vstatus', opts), go = $('.vgo', opts), cancel = $('.vcancel', opts);
      const sz = sizeFor(vres);
      const bpp = { standard: 0.07, high: 0.12, max: 0.2 }[vq];
      ctrl = new AbortController();
      bar.hidden = false; cancel.hidden = false; go.disabled = true;
      const t0 = performance.now();
      try {
        const out = await S.exportVideo({
          width: sz.w, height: sz.h, fps, duration: S.doc.anim.duration, format: vfmt, transparent: valpha,
          bitrate: Math.min(80e6, Math.round(sz.w * sz.h * fps * bpp)), signal: ctrl.signal,
          onProgress: (f, stage) => {
            fill.style.width = Math.round(f * 100) + '%';
            const el = (performance.now() - t0) / 1000;
            status.textContent = stage === 'retry' ? 'The fast encoder gave up at this size — trying another one…' : stage === 'finish' ? 'Finishing the file…' : `Rendering frames… ${Math.round(f * 100)}%` + (f > 0.05 ? ` · about ${Math.max(1, Math.round(el / f - el))}s left` : '');
          },
        });
        const name = `${slug()}.${out.ext}`;
        const url = URL.createObjectURL(out.blob);
        preview.replaceChildren(h('div.export-result' + (out.alpha ? '.see-through' : ''), null, out.ext === 'zip' ? h('div.hint', null, `${out.frames} PNG frames`) : h('video', { src: url, controls: true, autoplay: true, loop: true, muted: true, playsInline: true }),
          h('div.hint', null, `${name} · ${out.width} × ${out.height} · ${(out.blob.size / 1e6).toFixed(1)} MB. If nothing downloaded, use Save again` + (out.ext === 'zip' ? '.' : ', or right-click the video and choose “Save video as”.')),
          h('button.btn', { onclick: () => download(out.blob, name) }, ic('download'), 'Save again')));
        hydrateIcons(preview);
        download(out.blob, name);
        status.textContent = valpha && !out.alpha ? 'This browser can’t make see-through video here, so the background was left in — try PNG frames.' : out.ext !== (vfmt === 'png' ? 'zip' : vfmt) ? `Your browser can’t encode ${vfmt.toUpperCase()} at this size, so this was saved as ${out.ext.toUpperCase()}.` : 'Done.';
        toast('Video exported');
      } catch (err) {
        console.error(err);
        const why = err && err.message ? ` (${err.message.slice(0, 140)})` : '';
        status.textContent = err.name === 'AbortError' ? 'Cancelled.' : `Video export failed${why}. Try a smaller size or a lower frame rate.`;
      }
      cancel.hidden = true; go.disabled = false; ctrl = null;
    }
    draw();
    const c = await S.render({ scale: Math.min(1, 520 / Math.max(S.doc.width, S.doc.height)), time: null });
    if (!preview.querySelector('.export-result')) preview.replaceChildren(c);
  }

  function openHelp() {
    const k = (keys, label) => [h('span', null, label), h('span', null, keys.split(' ').map(x => h('span.kbd', null, x)).reduce((a, b) => [a, ' ', b]))];
    modal([
      h('h1', null, 'Shortcuts'),
      h('p.lead', null, 'Snapping: elements snap to the canvas edges and centre lines (pink), to other elements (orange) and to the grid when grid-snap is on.'),
      h('div.help-grid', null,
        k('Drag', 'Move — snaps to guides'), k('Hold Shift while moving', 'Move along one axis'), k('Alt drag a selected layer', 'Duplicate while dragging'), k('Ctrl drag', 'Move without snapping'),
        k('Shift click / Shift drag', 'Add layers to the selection (works over photos too)'), k('Alt click / Alt drag', 'Remove layers from the selection'), k('Hold Alt', 'Show distances to the canvas edges, or to the layer under the pointer'), k('⌘ click', 'Toggle a layer in or out'),
        k('E', 'Eraser (Esc to leave)'), k('[ ]', 'Eraser size'), k('P', 'Play / pause animation'),
        k('Arrows', 'Nudge 1px (Shift: 10px)'), k('Space drag', 'Pan the canvas'), k('⌘ scroll', 'Zoom'), k('⌘0', 'Fit to screen'),
        k('Dbl-click', 'Edit text · crop a photo'), k('T', 'Add text'), k('G', 'Toggle grid'),
        k('⌘D', 'Duplicate'), k('⌘C ⌘V', 'Copy & paste'), k('⌥⌘C ⌥⌘V', 'Copy & paste properties (font, colours, effects…)'), k('⇧H ⇧V', 'Flip horizontal / vertical'), k('⌘Z', 'Undo'), k('⇧⌘Z', 'Redo'), k('⌘] ⌘[', 'Forward / backward'),
        k('⌘L', 'Lock'), k('⌘A', 'Select all'), k('⌫', 'Delete'), k('⌘E', 'Export'), k('Esc', 'Deselect / finish')),
    ], { small: true });
  }

  /* ───────────────────────── animation ───────────────────────── */

  // one-click looks for the whole design
  const ANIM_PRESETS = [
    { name: 'Stop-motion', sub: 'Everything boils like hand-made frames', apply: (el, i) => ({ loop: 'wiggle', amount: el.type === 'image' && el.width > S.doc.width * 0.8 ? 0 : 1, speed: 1 }) },
    { name: 'Gentle float', sub: 'Stickers drift, text settles in', apply: (el, i) => el.type === 'text' ? { enter: 'rise', delay: i * 0.12, loop: 'none' } : el.type === 'ribbon' ? { loop: 'flow', enter: 'none' } : { loop: el.type === 'sticker' ? 'float' : 'sway', amount: 0.7 } },
    { name: 'Pop in', sub: 'Layers pop in one after another', apply: (el, i) => ({ enter: el.type === 'ribbon' ? 'draw' : 'pop', delay: 0.15 + i * 0.12, loop: el.type === 'sticker' ? 'jiggle' : 'none', amount: 0.6 }) },
    { name: 'Party', sub: 'Bouncy stickers, spinning stars', apply: (el, i) => el.type === 'sticker' ? { loop: /star|sparkle|sun|flower|asterisk|burst|gem/i.test(el.stickerId) ? 'spin' : 'bounce', speed: 1 } : el.type === 'text' ? { loop: 'pulse', amount: 0.6 } : el.type === 'ribbon' ? { loop: 'flow' } : { loop: 'jiggle', amount: 0.4 } },
    { name: 'Typewriter story', sub: 'Text types itself out', apply: (el, i) => el.type === 'text' ? { enter: 'typewriter', delay: 0.2 + i * 0.5, speed: 0.4 } : el.type === 'ribbon' ? { enter: 'draw', delay: i * 0.1 } : { enter: 'fade', delay: i * 0.1 } },
    { name: 'Drop & sway', sub: 'Things fall in and keep swinging', apply: (el, i) => ({ enter: 'drop', delay: i * 0.1, loop: el.type === 'sticker' ? 'swing' : 'none', amount: 0.8 }) },
  ];
  function applyAnimPreset(p) {
    const targets = S.doc.elements.filter(e => !e.locked && !e.hidden && e.type !== 'camera' && !(e.type === 'nature' && e.width >= S.doc.width * 0.9));
    targets.forEach((el, i) => { el.anim = Object.assign({ loop: 'none', enter: 'none', speed: 1, amount: 1, delay: 0 }, p.apply(el, i)); if (el.anim.amount === 0) el.anim = { loop: 'none', enter: 'none' }; });
    S.touchAll(); S.commit(); renderInspector(); updateTimeline(); updateTop(); S.play();
    toast(`“${p.name}” applied to ${targets.length} layers`);
  }
  function openAnimate(anchor) {
    const playing = S.isPlaying();
    const el = popover(anchor, [
      h('div.pop-title', null, 'Animate'),
      h('div.btn-row', null,
        h('button.btn.primary.grow', { type: 'button', onclick: () => { closePop(); if (!S.hasAnimation()) { toast('Pick a look below first'); return; } playing ? S.pause() : S.play(); } }, ic(playing ? 'pause' : 'play'), playing ? 'Pause' : 'Play'),
        h('button.btn.grow', { type: 'button', onclick: () => { closePop(); openExport('video'); } }, ic('film'), 'Export video')),
      row('Camera', (() => { const sl = h('select.sel', { onchange: e => { closePop(); setCameraMove(e.target.value); S.select([]); } }, Object.entries(R.CAMERA_MOVES).map(([k, l]) => h('option', { value: k, selected: ((S.doc.camera && S.doc.camera.move) || 'none') === k }, l))); return sl; })()),
      h('div.sub-label', null, 'Animate everything'),
      h('div.anim-presets', null, ANIM_PRESETS.map(p => h('button.anim-preset', { type: 'button', onclick: () => { closePop(); applyAnimPreset(p); } }, h('b', null, p.name), h('small', null, p.sub)))),
      row('Length', num('doc', 'anim.duration', { min: 1, max: 60, step: 0.5, slider: true, unit: 's', set: (v, live) => { S.change('doc', 'anim.duration', v, live); updateTimeline(); } })),
      S.hasAnimation() ? h('button.link-btn.danger', { type: 'button', onclick: () => { closePop(); S.doc.elements.forEach(e => { delete e.anim; }); S.stopPreview(); S.touchAll(); S.commit(); renderInspector(); updateTimeline(); updateTop(); toast('Animations removed'); } }, 'Remove all animation') : null,
      h('p.hint', null, 'To animate one layer, select it and use Motion on the right. Camera settings live on the right when nothing is selected.'),
    ].filter(Boolean), { cls: 'anim-pop' });
    hydrateIcons(el);
  }
  $('#btn-animate').onclick = e => openAnimate(e.currentTarget);

  // floating timeline under the canvas whenever something moves
  const tl = $('#timeline');
  function updateTimeline() {
    const show = S.hasAnimation() || S.isPlaying();
    tl.hidden = !show;
    $('#stage-area').classList.toggle('has-timeline', show);
    if (!show) return;
    const D = S.doc.anim.duration;
    if (!tl.firstChild) {
      tl.append(
        h('button.play', { type: 'button', title: 'Play / pause (P)', onclick: () => (S.isPlaying() ? S.pause() : S.play()) }, ic('play')),
        h('input', { type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'Animation time', oninput: e => { S.pause(); S.seek(e.target.value / 1000 * S.doc.anim.duration); } }),
        h('span.time'),
        h('button.btn', { type: 'button', title: 'Back to the still layout for editing', onclick: () => S.stopPreview() }, ic('stop'), 'Edit'));
      hydrateIcons(tl);
    }
    const t = R.playTime;
    $('input', tl).value = t == null ? 0 : Math.round(t / D * 1000);
    $('.time', tl).textContent = t == null ? `${D}s` : `${t.toFixed(1)} / ${D}s`;
    const pb = $('.play', tl);
    const want = S.isPlaying() ? 'pause' : 'play';
    if (pb.dataset.state !== want) { pb.dataset.state = want; pb.replaceChildren(ic(want)); }
  }
  let tlRaf = 0;
  S.on('time', () => { if (!tlRaf) tlRaf = requestAnimationFrame(() => { tlRaf = 0; updateTimeline(); }); });
  S.on('playstate', () => { updateTimeline(); updateTop(); });
  S.on('change', updateTimeline);
  S.on('doc', updateTimeline);

  /* ───────────────────────── eraser bar ───────────────────────── */

  const ebar = $('#eraser-bar');
  function updateEraserBar() {
    const on = S.tool === 'erase';
    ebar.hidden = !on;
    if (!on) return;
    const E = S.eraser;
    const segE = (cur, v, label, set) => h('button' + (cur === v ? '.on' : ''), { title: typeof label === 'string' ? label : '', onclick: () => { set(v); S.refreshBrush(); updateEraserBar(); } }, ICONS[label] ? ic(label) : label);
    const size = h('input', { type: 'range', min: 4, max: 400, value: Math.round(E.size), 'aria-label': 'Eraser size', oninput: e => { E.size = +e.target.value; val.textContent = E.size + 'px'; S.refreshBrush(); } });
    const val = h('span.val', null, Math.round(E.size) + 'px');
    const cur = S.selEls()[0];
    ebar.replaceChildren(
      h('label', null, 'Eraser'),
      h('div.seg', null, segE(E.shape, 'circle', 'circle', v => { E.shape = v; }), segE(E.shape, 'square', 'square', v => { E.shape = v; })),
      size, val,
      h('div.seg', null, segE(E.mode, 'erase', 'Erase', v => { E.mode = v; }), segE(E.mode, 'restore', 'Restore', v => { E.mode = v; })),
      cur && cur.erase && cur.erase.length ? h('button.btn', { onclick: () => { S.clearErase(cur.id); updateEraserBar(); } }, 'Reset layer') : null,
      h('button.btn.primary', { onclick: () => S.setTool('select') }, 'Done'));
    [...ebar.childNodes].forEach(n => { if (n.nodeType === 3 && n.textContent === 'null') n.remove(); });
    hydrateIcons(ebar);
  }
  S.on('tool', updateEraserBar);
  S.on('selection', () => { if (S.tool === 'erase') updateEraserBar(); });
  S.on('spotedit', () => renderInspector());
  S.on('trackpick', () => renderInspector());
  S.on('values', () => { if (S.tool === 'erase') { const c = S.selEls()[0]; const has = !!(c && c.erase && c.erase.length); if (has !== !!$('#eraser-bar .btn:not(.primary)')) updateEraserBar(); } });

  /* ───────────────────────── wiring ───────────────────────── */

  let lastSelKey = '';
  S.on('selection', () => {
    const key = S.sel.join(',');
    const els = S.selEls();
    // re-render the inspector only when the selection really changes
    if (key !== lastSelKey || !els.length) renderInspector();
    lastSelKey = key;
    if (tab === 'layers') renderPanel();
    if (tab === 'photos') renderPanel();
    quickBar(); hydrateIcons(S.quickBar);
    if (S.mobile) { if (els.length) panel.classList.remove('open'); mToolbar(); }
    else if (matchMedia('(max-width: 920px)').matches) {
      insp.classList.toggle('open', els.length > 0);
      if (els.length) panel.classList.remove('open');
    }
  });
  S.on('doc', () => { renderInspector(); if (tab === 'layers' || tab === 'background') renderPanel(); updateTop(); });
  S.on('change', () => { if (tab === 'layers') { clearTimeout(S._lt); S._lt = setTimeout(renderPanel, 120); } });

  /* ───────────────────────── phone layout ─────────────────────────
     Snapseed / Photoshop Express style: the canvas fills the screen, a strip of tools along the bottom changes
     with what's selected, and each tool opens one small sheet (one inspector section) with the canvas in view.
     Panels (templates, text, photos…) open as tall sheets and fold away once something is added. */
  const mtools = h('nav.mtools', { id: 'mtools', 'aria-label': 'Tools' });
  app.append(mtools);
  let mTool = null;   // the inspector section in the sheet; 'all' = the whole canvas inspector; null = sheet closed
  const M_SEC = {
    Photo: ['image', 'Photo'], 'Studio look': ['wand', 'Studio'], Look: ['palette', 'Looks'], Adjust: ['sliders', 'Adjust'], 'Film effects': ['film', 'Film'],
    Blur: ['drop', 'Blur'], Frame: ['square', 'Frame'], Typography: ['type', 'Font'], Background: ['square', 'Style'], Text: ['edit', 'Text'],
    Effects: ['sparkle', 'Effects'], Motion: ['play', 'Motion'], Position: ['move', 'Position'], Arrange: ['layers', 'Arrange'], Playback: ['film', 'Playback'],
    'Stop motion': ['film', 'Frames'], Shape: ['shapes', 'Shape'], Colours: ['palette', 'Colours'], Underneath: ['image', 'Under'], Photos: ['image', 'Photos'],
    'Opacity & blend': ['blend', 'Blend'],
  };
  function mSections() {
    const out = [];
    for (const n of insp.children) {
      if (n.classList.contains('layer-row')) out.push({ node: n, key: 'layer', title: 'Opacity & blend' });
      // "+" lists (Effects, Motion, Finish) count even before anything is added — that's how you add things
      else if (n.matches('section.sec') && (!n.classList.contains('empty') || n.querySelector('.sec-add'))) out.push({ node: n, key: n.dataset.key, title: n.dataset.title });
      else if (n.matches('section.sec')) n.classList.add('m-hide');
    }
    return out;
  }
  function mobileSheet() {
    if (!S.mobile) return;
    const secs = mSections(), els = S.selEls();
    if (mTool === 'all' && els.length) mTool = null;
    if (mTool && mTool !== 'all' && !secs.some(x => x.key === mTool)) mTool = null;
    for (const x of secs) {
      const on = mTool === 'all' || x.key === mTool;
      x.node.classList.toggle('m-hide', !on);
      if (on && mTool !== 'all') x.node.classList.add('open');
    }
    insp.classList.toggle('open', !!mTool);
    insp.classList.toggle('m-single', !!mTool && mTool !== 'all');
    const old = insp.querySelector(':scope > .m-bar');
    if (old) old.remove();
    if (mTool) {
      const cur = secs.find(x => x.key === mTool);
      const title = mTool === 'all' ? 'Canvas' : cur ? cur.title : '';
      insp.prepend(h('div.m-bar', null, h('b', null, title), h('button.m-done', { type: 'button', 'aria-label': 'Done', onclick: () => { mTool = null; mobileSheet(); } }, ic('check'))));
    }
    mToolbar(secs);
  }
  function mOpen(key) { panel.classList.remove('open'); mTool = mTool === key ? null : key; mobileSheet(); insp.scrollTop = 0; }
  function mPanel(t) {
    mTool = null; mobileSheet();
    if (panel.classList.contains('open') && tab === t) openPanel(false); else setTab(t);
    mToolbar();
  }
  function mToolbar(secs) {
    if (!S.mobile) return;
    secs = secs || mSections();
    const els = S.selEls(), items = [];
    const B = (icon, label, run, on, cls) => h('button.mt' + (on ? '.on' : '') + (cls || ''), { type: 'button', onclick: run }, ic(icon), h('span', null, label));
    if (!els.length) {
      const pt = panel.classList.contains('open') ? tab : null;
      items.push(B('layout', 'Templates', () => mPanel('templates'), pt === 'templates'), B('type', 'Text', () => mPanel('text'), pt === 'text'),
        B('image', 'Photos', () => mPanel('photos'), pt === 'photos'), B('shapes', 'Elements', () => mPanel('elements'), pt === 'elements'),
        B('palette', 'Backdrop', () => mPanel('background'), pt === 'background'), B('sliders', 'Canvas', () => mOpen('all'), mTool === 'all'),
        B('layers', 'Layers', () => mPanel('layers'), pt === 'layers'), B('film', 'Animate', e => openAnimate(e.currentTarget)));
      if (S.hasAnimation()) items.push(B(S.isPlaying() ? 'pause' : 'play', S.isPlaying() ? 'Pause' : 'Play', () => (S.isPlaying() ? S.pause() : S.play())));
    } else {
      const el = els[0], one = els.length === 1;
      items.push(B('chevLeft', 'Done', () => { mTool = null; S.select([]); }, false, '.back'));
      if (one && el.type === 'text') items.push(B('edit', 'Edit text', () => (S.isVideoText(el) ? mOpen('video-text') : S.editText(el.id))));
      if (one && el.type === 'image') {
        items.push(B('replace', el.assetId ? 'Replace' : 'Add photo', () => S.pickImages({ replaceId: el.id })));
        if (el.assetId) items.push(B('crop', 'Crop', () => { mTool = null; mobileSheet(); S.startCrop(el.id); }));
      }
      for (const x of secs) {
        if (x.key === 'video-text' && one && el.type === 'text') continue;
        const [icon, lab] = M_SEC[x.title] || ['more', x.title];
        items.push(B(icon, lab, () => mOpen(x.key), mTool === x.key));
      }
      items.push(B('copy', 'Duplicate', () => S.duplicate()), B('trash', 'Delete', () => S.removeSelected(), false, '.danger'));
    }
    const sx = mtools.scrollLeft;
    mtools.replaceChildren(...items);
    mtools.scrollLeft = sx;
  }
  S.on('mobile', () => { mTool = null; panel.classList.remove('open'); insp.classList.remove('open'); renderInspector(); renderPanel(); mToolbar(); if (S.fit) S.fit(); });
  S.on('playstate', () => mToolbar());
  // a template loaded or a layer added from a sheet: fold the sheet so the canvas shows
  S.on('doc', () => { if (S.mobile) { panel.classList.remove('open'); mToolbar(); } });
  // the panel's own close button folds the sheet; keep the strip in step
  new MutationObserver(() => { if (S.mobile) mToolbar(); }).observe(panel, { attributes: true, attributeFilter: ['class'] });

  hydrateIcons();
  renderPanel();
  renderInspector();
  updateTop();
  if (S.mobile) mToolbar();
  S.ui = { openHome, openExport, openSizeModal, setTab, toast, renderPanel };

  // first run: restore the last session silently, otherwise show the start screen
  F.injectStylesheets();
  F.customReady.then(() => { if (F.customFamilies().length) { R.fontsVersion++; R.requestRedraw(); } });
  // the app opens on the home page with your designs
  openHome();
})();
