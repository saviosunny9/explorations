/* Styles panel, the Style section of the inspector and the action bar under the canvas.
   A style goes on the selected layer(s) (el.sfx) or, with nothing selected, on the whole canvas (doc.sfx).
   Thumbnails are the real styles run on a small copy of whatever the style would land on. */
(function () {
  'use strict';
  const S = window.Studio, R = window.StudioRender, ST = window.StudioStyles, U = S.ui;
  if (!ST || !U || !U.registerPanel) return;
  const { h, ic, sec, row, full, num, selectCtl, toggle, colorCtl, inputCtl, toast, menu } = U;

  /* ── favourites (kept in this browser only) ── */
  let favs = new Set();
  try { favs = new Set(JSON.parse(localStorage.getItem('studio.styleFavs') || '[]')); } catch (e) { /* private mode */ }
  const saveFavs = () => { try { localStorage.setItem('studio.styleFavs', JSON.stringify([...favs])); } catch (e) { /* ignore */ } };

  const ui = { sub: 'explore', q: '' };
  const SUGGEST = ['characters', 'crt', 'risograph', 'cyanotype', 'heat-tint', 'petrol-sheen', 'honeycomb', 'crumpled', 'blueprint', 'dither', 'lego', 'fluted-glass', 'pixel-art', 'halftone', 'thermal', 'edge-glow', 'datamosh', 'vitrine'];

  /* ── what a style lands on ── */
  function target() {
    const els = S.selEls();
    return els.length ? { kind: 'el', els } : { kind: 'doc' };
  }
  const currentSfx = () => { const t = target(); return t.kind === 'doc' ? S.doc.sfx : t.els[0].sfx; };
  function setSfx(sfx) {
    const t = target();
    if (t.kind === 'doc') S.change('doc', 'sfx', sfx ? JSON.parse(JSON.stringify(sfx)) : null);
    else { for (const el of t.els) S.changeEl(el, e => { if (sfx) e.sfx = JSON.parse(JSON.stringify(sfx)); else delete e.sfx; }, true); S.commit(); }
    U.renderInspector(); markActive();
  }
  function applyStyle(id) {
    const cur = currentSfx();
    if (cur && cur.id === id) return;
    setSfx(Object.assign(ST.defaults(id), { seed: (cur && cur.seed) || 1 }));
    toast(`${ST.byId(id).name} — ${target().kind === 'doc' ? 'on the whole canvas' : 'on this layer'}`, { label: 'Undo', run: () => S.undo && S.undo() });
  }
  function restyle() {
    const cur = currentSfx();
    if (!cur || !ST.has(cur)) { shuffle(); return; }
    setSfx(ST.restyle(cur));
  }
  function shuffle() {
    const cur = currentSfx(), list = ST.LIST.filter(d => !cur || d.id !== cur.id), d = list[(Math.random() * list.length) | 0];
    setSfx(Object.assign(ST.defaults(d.id), { seed: (Math.random() * 9999) | 0 }));
    toast(d.name);
  }
  // a fresh demo photo to try styles on
  function inspire() {
    const ids = [...Object.keys((window.StudioPortraits || {}).IMG || {}).map(k => 'ed-' + k), ...Object.keys((window.StudioFilm || {}).IMG || {}).map(k => 'film-' + k)];
    if (!ids.length) return;
    const pick = ids[(Math.random() * ids.length) | 0], els = S.selEls(), img = els.find(e => e.type === 'image') || S.doc.elements.find(e => e.type === 'image' && !e.hidden);
    if (img) { S.changeEl(img, e => { e.assetId = pick; }); S.select([img.id]); return; }
    const el = S.addImageFromAsset(pick), m = R.mediaSize(R.assetImage(pick)) || { w: 1, h: 1 }, sc = Math.max(S.doc.width / m.w, S.doc.height / m.h);
    S.changeEl(el, e => { e.width = m.w * sc; e.height = m.h * sc; e.x = (S.doc.width - e.width) / 2; e.y = (S.doc.height - e.height) / 2; });
  }

  /* ── thumbnails ── */
  const TW = 180, TH = 135;
  let srcKey = '', srcCanvas = null, srcPending = null;
  const cache = new Map(), queue = [];
  let busy = false;
  function strHash(s) { let h1 = 0; for (let i = 0; i < s.length; i++) h1 = (h1 * 31 + s.charCodeAt(i)) | 0; return h1; }
  function subjectDoc() {
    const t = target();
    const strip = e => { const o = Object.assign({}, e); delete o.sfx; delete o.anim; delete o.time; return o; };
    if (t.kind === 'el') {
      const el = t.els[0];
      return { width: el.width, height: el.height, background: { color: el.type === 'image' ? '#000' : '#0b0b0e' }, elements: [Object.assign(strip(el), { x: 0, y: 0, rotation: 0, opacity: 1 })] };
    }
    const d = S.doc, plain = !d.elements.some(e => !e.hidden) && !d.background.assetId;
    if (plain) return { width: 1080, height: 1350, background: { color: '#000' }, elements: [{ id: 'demo', type: 'image', assetId: 'ed-curls', x: 0, y: 0, width: 1080, height: 1350, rotation: 0, opacity: 1, crop: { zoom: 1, x: 0.5, y: 0.5 }, filters: {}, frame: {} }] };
    const o = JSON.parse(JSON.stringify(d)); delete o.sfx; o.elements = o.elements.map(strip); return o;
  }
  async function source() {
    const sd = subjectDoc(), key = String(strHash(JSON.stringify(sd)));
    if (key === srcKey && srcCanvas) return srcCanvas;
    if (srcPending && srcPending.key === key) return srcPending.p;
    const p = (async () => {
      try { await R.preload(sd); } catch (e) { /* draw what we have */ }
      const sc = Math.max(TW / sd.width, TH / sd.height) * 1.0, full = R.renderDoc(sd, { scale: sc });
      const c = document.createElement('canvas'); c.width = TW; c.height = TH;
      const x = c.getContext('2d'), w = sd.width * sc, hh = sd.height * sc;
      x.fillStyle = '#000'; x.fillRect(0, 0, TW, TH); x.drawImage(full, (TW - w) / 2, (TH - hh) / 2, w, hh);
      if (srcKey !== key) cache.clear();
      srcKey = key; srcCanvas = c; srcPending = null;
      return c;
    })();
    srcPending = { key, p };
    return p;
  }
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    (async () => {
      const src = await source();
      const t0 = performance.now();
      while (queue.length && performance.now() - t0 < 24) {
        const job = queue.shift();
        if (!job.cv.isConnected) continue;
        let img = cache.get(job.id);
        if (!img) { try { img = ST.apply(src, ST.defaults(job.id), { t: 1.2, lim: 260 }); } catch (e) { img = src; } cache.set(job.id, img); }
        const x = job.cv.getContext('2d'); x.clearRect(0, 0, TW, TH); x.drawImage(img, 0, 0, TW, TH); job.cv.classList.add('ready');
      }
      busy = false;
      if (queue.length) setTimeout(pump, 0);
    })();
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(ents => {
    for (const en of ents) if (en.isIntersecting) { io.unobserve(en.target); queue.push({ cv: en.target, id: en.target.dataset.id }); }
    pump();
  }, { rootMargin: '200px' }) : null;
  function thumb(id) {
    const cv = h('canvas.st-thumb', { width: TW, height: TH });
    cv.dataset.id = id;
    if (io) io.observe(cv); else { queue.push({ cv, id }); setTimeout(pump, 0); }
    return cv;
  }

  /* ── panel ── */
  function tile(d, big) {
    const cur = currentSfx(), on = cur && cur.id === d.id;
    const fav = h('button.st-fav' + (favs.has(d.id) ? '.on' : ''), {
      type: 'button', title: favs.has(d.id) ? 'Remove from favourites' : 'Add to favourites',
      onclick: e => { e.stopPropagation(); favs.has(d.id) ? favs.delete(d.id) : favs.add(d.id); saveFavs(); e.currentTarget.classList.toggle('on', favs.has(d.id)); if (ui.sub === 'favs') U.renderPanel(); },
    }, '★');
    return h('div.st-tile' + (big ? '.big' : '') + (on ? '.on' : ''), { role: 'button', tabindex: 0, 'data-style': d.id, title: d.name, onclick: () => applyStyle(d.id), onkeydown: e => { if (e.key === 'Enter') applyStyle(d.id); } },
      h('div.st-pic', null, thumb(d.id), d.anim && !d.animIf ? h('span.st-badge', null, 'Moves') : null, fav),
      h('div.st-name', null, d.name), h('div.st-tags', null, d.tags));
  }
  function markActive() {
    const cur = currentSfx();
    document.querySelectorAll('.st-tile').forEach(t => t.classList.toggle('on', !!cur && t.dataset.style === cur.id));
    const tg = document.querySelector('.st-target');
    if (tg) tg.replaceWith(targetLine());
  }
  function targetLine() {
    const t = target(), cur = currentSfx();
    const what = t.kind === 'doc' ? 'Whole canvas' : t.els.length > 1 ? `${t.els.length} layers` : (S.elLabel ? S.elLabel(t.els[0]) : 'Selected layer');
    return h('div.st-target', null, h('span.st-k', null, 'Applies to'), h('span.st-v', null, what),
      cur && ST.has(cur) ? h('button.st-clear', { type: 'button', title: 'Remove the style', onclick: () => setSfx(null) }, 'Remove') : null);
  }
  function panel() {
    const search = h('input.search', { type: 'search', placeholder: 'Search name or tag', value: ui.q });
    const body = h('div.st-body');
    const draw = () => {
      const q = ui.q.trim().toLowerCase(), out = [];
      const match = d => !q || (d.name + ' ' + d.tags + ' ' + (ST.CATS.find(c => c[0] === d.cat) || [])[1]).toLowerCase().includes(q);
      if (ui.sub === 'favs') {
        const list = ST.LIST.filter(d => favs.has(d.id) && match(d));
        out.push(list.length ? h('div.st-grid', null, list.map(d => tile(d))) : h('p.hint.st-empty', null, 'Tap ★ on any style to keep it here.'));
      } else if (q) {
        const list = ST.LIST.filter(match);
        out.push(h('div.st-cat', null, `${list.length} result${list.length === 1 ? '' : 's'}`), h('div.st-grid', null, list.map(d => tile(d))));
      } else {
        const sug = SUGGEST.map(ST.byId).filter(Boolean), seed = Math.abs(strHash(srcKey || 'x')) % sug.length, pick = [...sug.slice(seed), ...sug.slice(0, seed)].slice(0, 7);
        out.push(h('div.st-cat.small', null, 'Suggested for this image'), h('div.st-grid', null, pick.slice(0, 3).map(d => tile(d))), h('div.st-grid.one', null, tile(pick[3], true)), h('div.st-grid', null, pick.slice(4, 7).map(d => tile(d))));
        for (const [cat, title] of ST.CATS) {
          const list = ST.LIST.filter(d => d.cat === cat);
          out.push(h('div.st-cat', null, title), h('div.st-grid', null, list.map(d => tile(d))));
        }
      }
      body.replaceChildren(...out);
    };
    search.addEventListener('input', () => { ui.q = search.value; draw(); });
    const subBtn = (k, label) => h('button.st-sub' + (ui.sub === k ? '.on' : ''), { type: 'button', onclick: () => { ui.sub = k; U.renderPanel(); } }, label);
    draw();
    return [
      U.panelHead('Styles'),
      h('div.st-head', null,
        h('div.st-search', null, ic('search'), search),
        h('div.st-subs', null, subBtn('explore', 'Explore'), subBtn('favs', 'Favorites'), h('span.st-count', null, `${ST.LIST.length} styles`)),
        targetLine()),
      body,
    ];
  }
  U.registerPanel('styles', 'Styles', panel);
  // thumbnails follow what they would land on
  let refreshT = 0;
  const refresh = () => {
    clearTimeout(refreshT);
    refreshT = setTimeout(async () => {
      if (U.tab !== 'styles' || !document.querySelector('.st-thumb')) return;
      const old = srcKey; await source();
      if (srcKey !== old) document.querySelectorAll('.st-thumb').forEach(cv => { cv.classList.remove('ready'); queue.push({ cv, id: cv.dataset.id }); });
      pump(); markActive();
    }, 450);
  };
  S.on('selection', () => { markActive(); refresh(); });
  S.on('doc', refresh);
  S.on('history', refresh);

  /* ── inspector: the style's own controls ── */
  function control(T, d, p, P) {
    const path = 'sfx.' + p.key, rerender = v => { S.change(T, path, v); U.renderInspector(); };
    if (p.type === 'range') return row(p.label, num(T, path, { min: p.min, max: p.max, step: p.step || 1, slider: true, def: P[p.key], unit: p.unit === '%' ? '%' : p.unit === 'px' ? 'px' : undefined }));
    if (p.type === 'select') return row(p.label, selectCtl(T, path, p.options, { def: P[p.key], set: rerender }));
    if (p.type === 'toggle') return toggle(T, path, p.label, { get: () => !!ST.params(sfxOf(T))[p.key], set: rerender });
    if (p.type === 'color') return row(p.label, colorCtl(T, path, { def: P[p.key] }));
    if (p.type === 'text') return row(p.label, inputCtl(T, path, { placeholder: p.key === 'chars' ? 'Your own characters, densest first' : '' }));
    return null;
  }
  const sfxOf = T => (T === 'doc' ? S.doc.sfx : (S.selEls()[0] || {}).sfx) || {};
  function stylePicker(T, cur) {
    const s = h('select.sel.st-pick', { 'aria-label': 'Style' }, ST.CATS.map(([cat, title]) => h('optgroup', { label: title }, ST.LIST.filter(d => d.cat === cat).map(d => h('option', { value: d.id, selected: d.id === cur.id }, d.name)))));
    s.value = cur.id;
    s.addEventListener('change', () => { setSfx(Object.assign(ST.defaults(s.value), { seed: cur.seed || 1 })); });
    return s;
  }
  const GROUPS = [['style', null], ['backdrop', 'Backdrop'], ['intensity', 'Intensity'], ['motion', 'Motion']];
  function section(T) {
    const cur = sfxOf(T);
    const isDoc = T === 'doc';
    if (!cur || !ST.has(cur)) {
      const el = !isDoc && S.selEls()[0];
      if (!isDoc && !(el && el.type === 'image')) return null;
      return sec('Style', [h('div.st-cta', null,
        h('p.hint', null, isDoc ? 'Turn the whole design into ASCII, pixels, print, glass and 100+ more looks.' : 'Turn this photo or video into ASCII, pixels, print, glass and 100+ more looks.'),
        h('div.btn-row', null,
          h('button.btn.grow', { type: 'button', onclick: () => U.setTab('styles') }, ic('sparkle'), 'Browse styles'),
          h('button.btn', { type: 'button', title: 'A random style', onclick: shuffle }, ic('shuffle'))))], true, { key: 'style' });
    }
    const d = ST.byId(cur.id), P = ST.params(cur), kids = [];
    kids.push(h('div.st-engine', null, h('span.st-eng-k', null, d.name), stylePicker(T, cur)));
    kids.push(full(h('div.btn-row', null,
      h('button.btn.grow', { type: 'button', title: 'New random settings for this style', onclick: restyle }, ic('replace'), 'Restyle'),
      h('button.btn.grow', { type: 'button', title: 'Another style', onclick: shuffle }, ic('shuffle'), 'Shuffle'),
      h('button.btn', { type: 'button', title: 'Remove the style', 'aria-label': 'Remove the style', onclick: () => setSfx(null) }, ic('trash')))));
    for (const [g, title] of GROUPS) {
      const ps = d.params.filter(p => p.group === g && (!p.when || p.when(P)));
      if (!ps.length) continue;
      if (title) kids.push(h('div.st-group', null, title));
      for (const p of ps) kids.push(control(T, d, p, P));
    }
    if (!isDoc) kids.push(toggle(T, 'sfx.keepShape', 'Keep the layer’s outline', { get: () => sfxOf(T).keepShape !== false, set: v => { S.change(T, 'sfx.keepShape', v); } }));
    return sec('Style', kids, true, { key: 'style', collapsible: false });
  }
  U.addSection('el', () => section('sel'));
  U.addSection('doc', () => section('doc'));

  /* ── the action bar under the canvas ── */
  const dock = document.getElementById('dock');
  if (dock) {
    const act = (iconName, label, title, run, cls = '') => h('button.dock-act' + cls, { type: 'button', title, onclick: run }, ic(iconName), h('span', null, label));
    dock.append(h('span.dock-sep'),
      act('upload', 'Upload', 'Add photos or videos', () => S.pickImages({})),
      act('sparkle', 'Inspire', 'Try a sample photo', inspire),
      act('replace', 'Restyle', 'New settings for the current style', restyle),
      act('shuffle', 'Shuffle', 'A random style', shuffle),
      act('layout', 'Library', 'Your photos and videos', () => U.setTab('photos')),
      act('download', 'Export', 'Export (⌘E)', () => S.emit('export'), '.primary'));
  }
  // open on the styles
  if (U.tab === 'styles') U.setTab('styles', { open: true });
})();
