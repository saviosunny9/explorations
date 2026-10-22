/* Sixjuly Flow — focus view and post editor.
   Opens a draft full-screen: filmstrip on the left, the slide in the middle (click to select, drag to move, corners to resize,
   double-click text to type), an inspector on the right. Layout elements carry small overrides (slide.o), extra text / shapes / photos
   are free layers (slide.layers); both are plain data, so undo, autosave and every export see the same thing. */
(function () {
  'use strict';
  const R = window.SixjulyRender, C = window.SixjulyCopy, X = window.SixjulyExport, D = window.SixjulyDrafts, h = window.sjh;
  const clone = o => JSON.parse(JSON.stringify(o));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const KIND_NAMES = { cover: 'Cover', statement: 'Statement', art: 'Illustration', collage: 'Collage', posters: 'Posters', greeting: 'Festival', tiles: 'Tiles', split: 'Then / now', checks: 'Do / don’t', poster: 'Giant word', chat: 'Chat', marquee: 'Tape', notes: 'Sticky notes', timeline: 'Timeline', compare: 'Before / after', stat: 'Big number', list: 'List', steps: 'Steps', quote: 'Quote', objects: 'UI objects', cta: 'Closing' };
  const COVERS = { '': 'Plain', annotate: 'Annotated', crt: 'Collage monitor', ripple: 'Numbered serif' };
  const FONTS = { '': 'Brand font', serif: 'Serif italic', cond: 'Condensed', mono: 'Mono' };
  const WEIGHTS = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Black' };
  const THEMES = { light: 'White', cream: 'Cream', dark: 'Black', violet: 'Violet', orange: 'Orange' };
  const SW = [['ink', 'Text'], ['hi', 'Highlight'], ['sec', 'Accent'], ['#7E3EFF', 'Violet'], ['#FF4900', 'Orange'], ['#FCD94B', 'Yellow'], ['#6F83F3', 'Periwinkle'], ['#F9F5EC', 'Cream'], ['#FFFFFF', 'White'], ['#121212', 'Black']];
  const swatchCss = (c, th) => c === 'ink' ? th.ink : c === 'hi' ? th.hi : c === 'sec' ? th.sec : c === 'bg' ? th.bg : c;

  let root, S = null, onClose = null, saveT = 0, saveStatus = 'Saved', samples = null;
  const sample = kind => { samples = samples || C.showcase().slides; const s = samples.find(x => x.kind === kind && !x.cover) || samples.find(x => x.kind === kind); return s ? clone(s) : { kind: 'statement', head: 'New [[slide]]', foot: 'Say it {{plainly}}.' }; };
  const dims = () => String(S.draft.ratio || '1080x1350').split('x').map(Number);
  const slide = () => S.deck.slides[S.i];
  const scene = () => R.sceneFor(S.deck, S.i, ...dims());

  // ---- history, autosave -----------------------------------------------------------------------------------------------------------------
  const snap = () => JSON.stringify({ slides: S.deck.slides, design: S.deck.design, caption: S.deck.caption, hashtags: S.deck.hashtags, title: S.draft.title });
  function pushHist(coalesce) {
    const s = snap(); if (S.hist[S.hi] === s) return;
    if (coalesce && S.lastKey === coalesce && Date.now() - S.lastAt < 1200 && S.hi > 0) S.hist[S.hi] = s;
    else { S.hist.length = S.hi + 1; S.hist.push(s); if (S.hist.length > 120) S.hist.shift(); S.hi = S.hist.length - 1; }
    S.lastKey = coalesce || ''; S.lastAt = Date.now();
  }
  function restore(s) { const o = JSON.parse(s); S.deck.slides = o.slides; S.deck.design = o.design; S.deck.caption = o.caption; S.deck.hashtags = o.hashtags; S.draft.title = o.title; S.i = clamp(S.i, 0, S.deck.slides.length - 1); S.key = null; }
  function undo() { if (S.hi > 0) { S.hi--; restore(S.hist[S.hi]); afterChange(); } }
  function redo() { if (S.hi < S.hist.length - 1) { S.hi++; restore(S.hist[S.hi]); afterChange(); } }
  function scheduleSave() { saveStatus = 'Saving…'; paintStatus(); clearTimeout(saveT); saveT = setTimeout(async () => { try { await D.save(S.draft); saveStatus = 'Saved'; } catch (e) { saveStatus = 'Not saved'; } paintStatus(); if (S.onSaved) S.onSaved(S.draft); }, 500); }
  function paintStatus() { const el = root && root.querySelector('.saved'); if (el) { el.textContent = saveStatus; el.className = 'saved chip' + (saveStatus === 'Not saved' ? ' warn' : ''); } }
  // run a change, then redraw everything that depends on it
  function change(fn, o) { o = o || {}; fn(); pushHist(o.coalesce); afterChange(o.keepInsp); scheduleSave(); }
  function afterChange(keepInsp) { drawStage(); drawFilm(); if (!keepInsp) drawInsp(); paintUndo(); }
  function paintUndo() { const u = root.querySelector('[data-act=undo]'), r = root.querySelector('[data-act=redo]'); if (u) u.disabled = S.hi <= 0; if (r) r.disabled = S.hi >= S.hist.length - 1; }

  // ---- shell ---------------------------------------------------------------------------------------------------------------------------------
  function build() {
    root = document.getElementById('focus'); root.innerHTML = '';
    const btn = (act, label, title) => h('button.btn.sm', { type: 'button', 'data-act': act, title: title || label, onclick: () => actions[act] && actions[act]() }, label);
    root.append(
      h('header.fb', null,
        h('button.btn.sm', { type: 'button', onclick: () => Editor.close() }, '← Flow'),
        h('input.ftitle', { type: 'text', 'aria-label': 'Post title', onchange: e => change(() => (S.draft.title = e.target.value.trim() || 'Untitled post'), { keepInsp: true }) }),
        h('span.saved.chip', null, 'Saved'),
        h('div.spacer'),
        h('div.seg.tabs', { 'data-seg': 'tab' }, h('button', { type: 'button', 'data-v': 'carousel', onclick: () => setTab('carousel') }, 'Carousel'), h('button', { type: 'button', 'data-v': 'reel', onclick: () => setTab('reel') }, 'Reel')),
        h('div.seg.views', { 'data-seg': 'view' }, h('button', { type: 'button', 'data-v': 'one', onclick: () => setView('one') }, 'One slide'), h('button', { type: 'button', 'data-v': 'all', onclick: () => setView('all') }, 'All slides')),
        h('div.zoomctl', null, h('button.btn.sm', { type: 'button', 'aria-label': 'Zoom out', onclick: () => zoomBy(1 / 1.25) }, '−'), h('button.btn.sm.zv', { type: 'button', title: 'Fit to screen', onclick: () => { S.zoom = null; drawStage(); } }, 'Fit'), h('button.btn.sm', { type: 'button', 'aria-label': 'Zoom in', onclick: () => zoomBy(1.25) }, '+')),
        h('div.undoctl', null, btn('undo', '↶', 'Undo (⌘Z)'), btn('redo', '↷', 'Redo (⇧⌘Z)')),
        h('div.menuwrap', null, h('button.btn.sm', { type: 'button', 'data-act': 'approve', onclick: () => actions.approve() }, 'Approve post'), ),
        h('div.menuwrap', null, h('button.btn.sm.primary', { type: 'button', onclick: e => { e.stopPropagation(); toggleMenu('expMenu'); } }, 'Export ▾'), h('div.menu#expMenu'))),
      h('div.fbody', null, h('aside.film'), h('main.stagewrap', null, h('div.stage')), h('aside.insp')));
    buildExportMenu();
    root.addEventListener('pointerdown', e => { if (!e.target.closest('.menuwrap')) root.querySelectorAll('.menu.open').forEach(m => m.classList.remove('open')); });
    window.addEventListener('keydown', onKey); window.addEventListener('resize', () => S && (drawStage(), drawFilm()));
  }
  function toggleMenu(id) { const m = root.querySelector('#' + id); const was = m.classList.contains('open'); root.querySelectorAll('.menu.open').forEach(x => x.classList.remove('open')); if (!was) m.classList.add('open'); }

  const actions = {
    undo, redo,
    approve() { change(() => { S.draft.approved = !S.draft.approved; S.draft.status = S.draft.approved ? 'Approved for export' : 'Draft ready'; }, { keepInsp: true }); root.querySelector('[data-act=approve]').textContent = S.draft.approved ? '✓ Post approved' : 'Approve post'; toast(S.draft.approved ? 'Post approved. Nothing is published automatically.' : 'Approval removed'); },
  };
  let toast = m => window.SixjulyToast && window.SixjulyToast(m);

  function buildExportMenu() {
    const m = root.querySelector('#expMenu'); m.innerHTML = '';
    const item = (name, hint, fn) => h('button', { type: 'button', onclick: async e => { m.classList.remove('open'); await run(fn, name); } }, h('span', null, name, hint ? h('small', null, hint) : null));
    m.append(
      item('This slide as PNG', 'Full resolution', () => single('png')), item('This slide as JPG', null, () => single('jpg')),
      h('hr'),
      item('All slides as PNG', 'Zip with caption', () => pack('png')), item('All slides as JPG', 'Zip with caption', () => pack('jpg')),
      item('PDF of the carousel', 'One page per slide', () => pdf()),
      h('hr'),
      item('Editable SVG files', 'Live text and shapes', () => svgZip()),
      item('Figma pack', 'SVG slides + how to import', () => figma()),
      item('Copy this slide’s SVG', 'Paste straight into Figma', () => copySvg()),
      h('hr'),
      item('Everything (zip)', 'PNG, SVG, PDF, caption, sources', () => everything()));
  }
  async function run(fn, name) { try { await fn(); } catch (e) { toast((e && e.message) || ('Could not ' + name.toLowerCase())); } }
  const base = () => X.slug(S.draft.title || S.deck.topic);
  const ratioOpts = () => ({ ratio: S.draft.ratio, scale: 1, format: 'png' });
  async function single(fmt) { const b = await X.slideBlob(S.deck, S.i, Object.assign(ratioOpts(), { format: fmt, scale: 2 })); await X.download(b, `${base()}-${X.pad(S.i + 1)}.${fmt}`); }
  async function pack(fmt) { const files = await X.carouselFiles(S.deck, Object.assign(ratioOpts(), { format: fmt }), p => toast(`Rendering ${Math.round(p * 100)}%`)); files.push({ name: 'caption.txt', blob: new Blob([X.captionText(S.deck, S.draft)], { type: 'text/plain' }) }); await X.download(await X.zipFiles(files.map(f => ({ name: base() + '/' + f.name, blob: f.blob }))), `${base()}-${fmt}.zip`); }
  async function pdf() { toast('Building PDF…'); await X.download(await X.pdfBlob(S.deck, ratioOpts()), `${base()}.pdf`); }
  async function svgZip() { const files = X.svgFiles(S.deck, ratioOpts()); await X.download(await X.zipFiles(files.map(f => ({ name: base() + '/' + f.name, blob: f.blob }))), `${base()}-svg.zip`); }
  async function figma() { await X.download(await X.zipFiles(await X.figmaPack(S.deck, S.draft, ratioOpts())), `${base()}-figma.zip`); toast('Figma pack saved. Open README.txt inside for the 3 steps.'); }
  async function copySvg() { const svg = R.toSVG(S.deck, S.i, { W: dims()[0], H: dims()[1] }); try { await navigator.clipboard.writeText(svg); toast('SVG copied. Click in Figma and paste (⌘V).'); } catch (e) { await X.download(new Blob([svg], { type: 'image/svg+xml' }), `${base()}-${X.pad(S.i + 1)}.svg`); toast('Clipboard blocked, saved the SVG instead.'); } }
  async function everything() { toast('Preparing everything…'); await X.download(await X.zipFiles(await X.everything(S.deck, S.draft, ratioOpts())), `${base()}-all.zip`); }

  // ---- views -------------------------------------------------------------------------------------------------------------------------------------
  function setTab(t) { S.tab = t; paintSeg(); drawStage(); drawInsp(); }
  function setView(v) { S.view = v; paintSeg(); drawStage(); }
  function paintSeg() { root.querySelectorAll('[data-seg]').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === S[g.dataset.seg]))); root.classList.toggle('reel-tab', S.tab === 'reel'); }
  function zoomBy(f) { S.zoom = clamp((S.zoom || S.fit || 0.5) * f, 0.15, 3); drawStage(); }

  // ---- filmstrip ---------------------------------------------------------------------------------------------------------------------------------------
  function drawFilm() {
    const el = root.querySelector('.film'); el.innerHTML = ''; const [W, H] = dims(), tw = 132, th = Math.round(tw * H / W);
    S.deck.slides.forEach((s, i) => {
      const cv = h('canvas', { width: tw * 2, height: th * 2, style: { width: tw + 'px', height: th + 'px' } }); R.drawSlide(cv.getContext('2d'), S.deck, i, { W, H, scale: tw * 2 / W });
      const cell = h('div.fc' + (i === S.i ? '.on' : ''), { draggable: true, 'data-i': i, title: KIND_NAMES[s.kind] || s.kind, onclick: () => { S.i = i; S.key = null; if (S.view === 'all') S.view = 'one'; paintSeg(); drawStage(); drawFilm(); drawInsp(); },
        ondragstart: e => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; },
        ondragover: e => { e.preventDefault(); cell.classList.add('over'); }, ondragleave: () => cell.classList.remove('over'),
        ondrop: e => { e.preventDefault(); const from = +e.dataTransfer.getData('text/plain'); if (!isNaN(from) && from !== i) moveSlide(from, i); } },
        cv, h('span.fn', null, String(i + 1)),
        h('div.fa', null, h('button', { type: 'button', title: 'Duplicate slide', onclick: e => { e.stopPropagation(); dupSlide(i); } }, '⧉'), h('button', { type: 'button', title: 'Delete slide', onclick: e => { e.stopPropagation(); delSlide(i); } }, '×')));
      el.append(cell);
    });
    const add = h('div.menuwrap', null, h('button.btn.sm.addslide', { type: 'button', onclick: e => { e.stopPropagation(); toggleMenu('addMenu'); } }, '+ Slide'), h('div.menu#addMenu', { style: { left: 0, right: 'auto' } }));
    const m = add.querySelector('#addMenu'); Object.keys(KIND_NAMES).forEach(k => m.append(h('button', { type: 'button', onclick: () => { m.classList.remove('open'); addSlide(k); } }, h('span', null, KIND_NAMES[k]))));
    el.append(add);
  }
  function moveSlide(from, to) { change(() => { const [s] = S.deck.slides.splice(from, 1); S.deck.slides.splice(to, 0, s); S.i = to; S.key = null; }); }
  function dupSlide(i) { change(() => { const c = clone(S.deck.slides[i]); (c.layers || []).forEach(l => (l.id = D.uid('l'))); S.deck.slides.splice(i + 1, 0, c); S.i = i + 1; S.key = null; }); }
  function delSlide(i) { if (S.deck.slides.length <= 1) return toast('A post needs at least one slide'); change(() => { S.deck.slides.splice(i, 1); S.i = clamp(S.i, 0, S.deck.slides.length - 1); S.key = null; }); }
  function addSlide(kind) { change(() => { S.deck.slides.splice(S.i + 1, 0, sample(kind)); S.i = S.i + 1; S.key = null; }); }

  // ---- stage -------------------------------------------------------------------------------------------------------------------------------------------
  let cs = 0.5;                                  // css pixels per canvas pixel
  function drawStage() {
    const st = root.querySelector('.stage'), wrap = root.querySelector('.stagewrap'); stopPlayer(); st.innerHTML = '';
    const [W, H] = dims();
    if (S.tab === 'reel') return drawReelStage(st, wrap);
    if (S.view === 'all') {
      st.className = 'stage grid'; const w = clamp(Math.floor((wrap.clientWidth - 60) / Math.max(1, Math.round((wrap.clientWidth - 60) / 330))) - 18, 180, 460), th = Math.round(w * H / W);
      S.deck.slides.forEach((s, i) => { const cv = h('canvas', { width: w * 2, height: th * 2, style: { width: w + 'px', height: th + 'px' }, onclick: () => { S.i = i; S.key = null; setView('one'); drawFilm(); drawInsp(); } }); R.drawSlide(cv.getContext('2d'), S.deck, i, { W, H, scale: w * 2 / W }); st.append(h('figure.gcell' + (i === S.i ? '.on' : ''), null, cv, h('figcaption', null, `${i + 1} · ${KIND_NAMES[s.kind] || s.kind}`))); });
      return;
    }
    st.className = 'stage';
    const availW = Math.max(200, wrap.clientWidth - 56), availH = Math.max(200, wrap.clientHeight - 56); S.fit = Math.min(availW / W, availH / H); cs = S.zoom || S.fit;
    const zv = root.querySelector('.zv'); if (zv) zv.textContent = S.zoom ? Math.round(cs * 100) + '%' : 'Fit';
    const dpr = Math.min(2, window.devicePixelRatio || 1), cv = h('canvas.slide', { width: Math.round(W * cs * dpr), height: Math.round(H * cs * dpr), style: { width: W * cs + 'px', height: H * cs + 'px' } });
    R.drawSlide(cv.getContext('2d'), S.deck, S.i, { W, H, scale: cv.width / W });
    const ov = h('div.ov', { style: { width: W * cs + 'px', height: H * cs + 'px' } });
    st.append(h('div.sheet', { style: { width: W * cs + 'px', height: H * cs + 'px' } }, cv, ov));
    st.style.minWidth = (W * cs + 56) + 'px'; st.style.minHeight = (H * cs + 56) + 'px';
    S.cv = cv; S.ov = ov; paintOverlay();
    ov.addEventListener('pointerdown', onDown); ov.addEventListener('dblclick', onDbl); ov.addEventListener('pointermove', onHover);
    ov.addEventListener('wheel', e => { if (S.cropMode && selLayer() && selLayer().type === 'image') { e.preventDefault(); const l = selLayer(); change(() => (l.zoom = clamp((l.zoom || 1) * (e.deltaY < 0 ? 1.06 : 1 / 1.06), 1, 4)), { coalesce: 'zoom' + l.id, keepInsp: true }); } }, { passive: false });
  }
  let player = null;
  function stopPlayer() { if (player) { player.stop(); player = null; } }
  function drawReelStage(st, wrap) {
    st.className = 'stage reelstage'; const ch = clamp(wrap.clientHeight - 150, 320, 760), cw = Math.round(ch * 9 / 16);
    player = window.SixjulyPlayer.create(S.deck, cw, ch, 2); const plan = player.plan, m = S.deck.motion || R.DEFAULT_MOTION;
    st.append(h('div.reelbox', null, player.el, h('div.player', { style: { width: cw + 'px' } }, player.bar,
      h('div.meta', null, `${S.deck.slides.length} slides · ${plan.total.toFixed(1)}s · motion: ${m.preset || 'custom'} · ${R.TRANSITIONS[m.transition] || 'cut'}`),
      h('div.dl', null, h('button.btn.sm.primary', { type: 'button', onclick: async e => { const b = e.currentTarget; b.disabled = true; const l = b.textContent; try { const res = await X.reelVideo(S.deck, { fps: 30, mbps: 10 }, p => (b.textContent = `Encoding ${Math.round(p * 100)}%`)); await X.download(res.blob, `${base()}-reel.${res.ext}`); } catch (er) { toast('Video export failed: ' + er.message); } b.disabled = false; b.textContent = l; } }, 'Download video')),
      h('p.edhint', null, 'Reel timing and motion are set in the Motion node. Edits to text and layers here are included.'))));
  }

  // ---- selection overlay -------------------------------------------------------------------------------------------------------------------------------
  const selItem = () => (S.key ? scene().items.find(it => it.key === S.key) : null);
  const selLayer = () => { const it = selItem(); return it && it.lay ? (slide().layers || []).find(l => l.id === it.layer) : null; };
  function paintOverlay() {
    const ov = S.ov; if (!ov) return; ov.querySelectorAll('.sel,.guide,.hov').forEach(n => n.remove());
    const it = selItem(); if (!it) { if (S.key) S.key = null; return; }
    const b = R.itemBox(scene(), it), lay = it.lay, rot = lay && lay.rot ? lay.rot : 0;
    const box = h('div.sel', { style: { left: b.x * cs + 'px', top: b.y * cs + 'px', width: b.w * cs + 'px', height: b.h * cs + 'px', transform: rot ? `rotate(${rot}rad)` : '' } });
    ['nw', 'ne', 'se', 'sw'].concat(lay ? ['e', 'w'] : []).forEach(p => box.append(h('i.hd.' + p, { 'data-h': p })));
    if (lay) box.append(h('i.hd.rot', { 'data-h': 'rot' }));
    box.append(h('span.stag', null, R.itemName(it)));
    ov.append(box); S.box = box;
  }
  function guideLines(v, hz) { const [W, H] = dims(); [...S.ov.querySelectorAll('.guide')].forEach(n => n.remove()); if (v != null) S.ov.append(h('div.guide.v', { style: { left: v * cs + 'px' } })); if (hz != null) S.ov.append(h('div.guide.h', { style: { top: hz * cs + 'px' } })); void W; void H; }
  const toCanvas = e => { const r = S.ov.getBoundingClientRect(); return { x: (e.clientX - r.left) / cs, y: (e.clientY - r.top) / cs }; };
  function onHover(e) {
    if (S.drag) return; S.ov.querySelectorAll('.hov').forEach(n => n.remove()); const p = toCanvas(e), it = R.hitTest(scene(), p.x, p.y); S.ov.style.cursor = it ? 'move' : 'default';
    if (it && it.key !== S.key) { const b = R.itemBox(scene(), it); S.ov.append(h('div.hov', { style: { left: b.x * cs + 'px', top: b.y * cs + 'px', width: b.w * cs + 'px', height: b.h * cs + 'px' } })); }
  }
  function onDown(e) {
    if (e.button !== 0) return; closeInline(true);
    const hd = e.target.closest('.hd'), p = toCanvas(e), sc = scene();
    if (hd && S.key) return startDrag(hd.dataset.h, e, p);
    const hit = R.hitTest(sc, p.x, p.y);
    if (!hit) { S.key = null; paintOverlay(); drawInsp(); return; }
    if (hit.key !== S.key) { S.key = hit.key; paintOverlay(); drawInsp(); }
    startDrag(S.cropMode && hit.lay && hit.lay.type === 'image' ? 'pan' : 'move', e, p);
  }
  function overrideFor(key) { const s = slide(); s.o = s.o || {}; s.o.items = s.o.items || {}; return (s.o.items[key] = s.o.items[key] || {}); }
  function startDrag(kind, e, p0) {
    e.preventDefault(); const it = selItem(); if (!it) return; const lay = selLayer(), b0 = R.itemBox(scene(), it), [W, H] = dims();
    const ov0 = lay ? null : Object.assign({}, (slide().o && slide().o.items && slide().o.items[it.key]) || {}), l0 = lay ? clone(lay) : null; let moved = false;
    S.drag = { kind }; S.ov.setPointerCapture && S.ov.setPointerCapture(e.pointerId);
    const cx = b0.x + b0.w / 2, cy = b0.y + b0.h / 2;
    const move = ev => {
      const p = toCanvas(ev), dx = p.x - p0.x, dy = p.y - p0.y; if (!moved && Math.hypot(dx, dy) * cs < 3) return; moved = true;
      let gv = null, gh = null;
      if (kind === 'move') {
        let nx = b0.x + dx, ny = b0.y + dy; const mx = scene().g.mx;                      // snap to canvas centre and the page margins
        const cxn = nx + b0.w / 2, cyn = ny + b0.h / 2, T = 8 / cs;
        if (Math.abs(cxn - W / 2) < T) { nx += W / 2 - cxn; gv = W / 2; } else if (Math.abs(nx - mx) < T) { nx = mx; gv = mx; } else if (Math.abs(nx + b0.w - (W - mx)) < T) { nx = W - mx - b0.w; gv = W - mx; }
        if (Math.abs(cyn - H / 2) < T) { ny += H / 2 - cyn; gh = H / 2; }
        const ddx = nx - b0.x, ddy = ny - b0.y;
        if (lay) { const l = (slide().layers || []).find(z => z.id === lay.id); l.x = Math.round(l0.x + ddx); l.y = Math.round(l0.y + ddy); } else { const o = overrideFor(it.key); o.dx = Math.round((ov0.dx || 0) + ddx); o.dy = Math.round((ov0.dy || 0) + ddy); }
      } else if (kind === 'pan' && lay) {
        const l = (slide().layers || []).find(z => z.id === lay.id); l.ox = clamp((l0.ox || 0) - dx / (b0.w * 0.4), -1, 1); l.oy = clamp((l0.oy || 0) - dy / (b0.h * 0.4), -1, 1);
      } else if (kind === 'rot' && lay) {
        const l = (slide().layers || []).find(z => z.id === lay.id); let a = Math.atan2(p.y - cy, p.x - cx) + Math.PI / 2; if (ev.shiftKey || Math.abs(a % (Math.PI / 4)) < 0.05) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12); l.rot = a;
      } else if (lay) {
        const l = (slide().layers || []).find(z => z.id === lay.id), ax = kind.includes('w') ? b0.x + b0.w : b0.x, ay = kind.includes('n') ? b0.y + b0.h : b0.y;
        if (kind === 'e' || kind === 'w') { const nx = kind === 'e' ? Math.max(60, p.x - b0.x) : Math.max(60, b0.x + b0.w - p.x); l.w = Math.round(nx); if (kind === 'w') l.x = Math.round(b0.x + b0.w - nx); }
        else { let nw = Math.max(40, Math.abs(p.x - ax)), nh = Math.max(40, Math.abs(p.y - ay)); if (l.type === 'image' || ev.shiftKey) { const k = Math.max(nw / b0.w, nh / b0.h); nw = b0.w * k; nh = b0.h * k; } if (l.type === 'text') { l.w = Math.round(nw); l.x = Math.round(Math.min(ax, p.x < ax ? ax - nw : ax)); } else { l.w = Math.round(nw); l.h = Math.round(nh); l.x = Math.round(p.x < ax ? ax - nw : ax); l.y = Math.round(p.y < ay ? ay - nh : ay); } }
      } else {                                                                      // scale a layout element about its centre
        const d0 = Math.hypot(p0.x - cx, p0.y - cy) || 1, d1 = Math.hypot(p.x - cx, p.y - cy), o = overrideFor(it.key); o.s = clamp((ov0.s || 1) * d1 / d0, 0.15, 4);
      }
      guideLines(gv, gh); drawStageLive();
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); S.drag = null; guideLines(null, null); if (moved) { pushHist(); afterChange(); scheduleSave(); } else paintOverlay(); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  }
  function drawStageLive() { const [W, H] = dims(); const ctx = S.cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, S.cv.width, S.cv.height); R.drawSlide(ctx, S.deck, S.i, { W, H, scale: S.cv.width / W }); const g = [...S.ov.querySelectorAll('.guide')]; paintOverlay(); g.forEach(n => S.ov.append(n)); }

  // inline text editing ---------------------------------------------------------------------------------------------------------------------------------
  const TEXT_SRC = { head: 'head', sub: 'sub', foot: 'foot' };
  function onDbl(e) { const p = toCanvas(e), hit = R.hitTest(scene(), p.x, p.y); if (!hit) return; S.key = hit.key; paintOverlay(); drawInsp(); startInline(hit); }
  function startInline(it) {
    const lay = it.lay, field = TEXT_SRC[it.role]; if (!(field || (lay && lay.type === 'text'))) { toast('Use the Content panel on the right to edit this one.'); return; }
    closeInline(true); const b = R.itemBox(scene(), it), L = it.text || (lay && R.prepLayer(lay, scene()).L), size = (L ? L.size : 40) * cs * ((((slide().o || {}).items || {})[it.key] || {}).s || 1);
    const val = lay ? lay.text : slide()[field] || '';
    const ta = h('textarea.inline', { value: val, spellcheck: false, style: { left: b.x * cs + 'px', top: b.y * cs + 'px', width: Math.max(160, b.w * cs) + 'px', minHeight: b.h * cs + 'px', fontSize: Math.max(13, size * 0.6) + 'px' }, onkeydown: e => { if (e.key === 'Escape') { e.preventDefault(); closeInline(false); } if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); closeInline(true); } e.stopPropagation(); } });
    S.inline = { ta, lay, field }; S.ov.append(ta); ta.focus(); ta.select();
    ta.addEventListener('blur', () => closeInline(true));
  }
  function closeInline(commit) {
    const inl = S.inline; if (!inl) return; S.inline = null; const v = inl.ta.value; inl.ta.remove();
    if (!commit) return; const s = slide(), cur = inl.lay ? (s.layers.find(l => l.id === inl.lay.id) || {}).text : s[inl.field];
    if (v === cur) return; change(() => { if (inl.lay) s.layers.find(l => l.id === inl.lay.id).text = v; else s[inl.field] = v; });
  }

  // keyboard ---------------------------------------------------------------------------------------------------------------------------------------------------
  function onKey(e) {
    if (!S || root.hidden) return; const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); if (S.key) dupSelected(); else dupSlide(S.i); }
    else if (e.key === 'Escape') { if (S.key) { S.key = null; paintOverlay(); drawInsp(); } else Editor.close(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && S.key) { e.preventDefault(); delSelected(); }
    else if (e.key === 'Enter' && S.key) { const it = selItem(); if (it) { e.preventDefault(); startInline(it); } }
    else if (e.key.startsWith('Arrow') && S.key) { e.preventDefault(); nudge(e.key, e.shiftKey ? 10 : 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { if (S.i > 0) { S.i--; S.key = null; afterChange(); } }
    else if (e.key === 'ArrowRight' || e.key === 'PageDown') { if (S.i < S.deck.slides.length - 1) { S.i++; S.key = null; afterChange(); } }
  }
  function nudge(k, n) { const it = selItem(); if (!it) return; const dx = k === 'ArrowLeft' ? -n : k === 'ArrowRight' ? n : 0, dy = k === 'ArrowUp' ? -n : k === 'ArrowDown' ? n : 0; change(() => { const l = selLayer(); if (l) { l.x += dx; l.y += dy; } else { const o = overrideFor(it.key); o.dx = (o.dx || 0) + dx; o.dy = (o.dy || 0) + dy; } }, { coalesce: 'nudge' + S.key }); }
  function delSelected() { const it = selItem(); if (!it) return; change(() => { const l = selLayer(); if (l) slide().layers = slide().layers.filter(z => z.id !== l.id); else overrideFor(it.key).hide = true; S.key = null; }); }
  function dupSelected() { const l = selLayer(); if (!l) return toast('Only added elements can be duplicated. Duplicate the slide instead.'); change(() => { const c = clone(l); c.id = D.uid('l'); c.x += 30; c.y += 30; slide().layers.push(c); S.key = 'free:' + c.id; }); }

  // ---- adding things ---------------------------------------------------------------------------------------------------------------------------------------------------
  function addLayer(l) { change(() => { const s = slide(); s.layers = s.layers || []; l.id = D.uid('l'); s.layers.push(l); S.key = 'free:' + l.id; S.view = 'one'; }); }
  const ADD = {
    text: () => addLayer({ type: 'text', text: 'Your text', x: 120, y: 520, w: 640, size: 64, weight: 600, color: 'ink', align: 'left' }),
    heading: () => addLayer({ type: 'text', text: 'A [[bold]] idea', x: 96, y: 420, w: 888, size: 110, weight: 500, color: 'ink', track: -0.035 }),
    sticker: () => addLayer({ type: 'text', text: 'NEW', x: 96, y: 300, w: 260, size: 70, weight: 800, color: '#FFFFFF', bg: '#FF4900', rot: -0.05, align: 'center', track: -0.02 }),
    rect: () => addLayer({ type: 'shape', shape: 'rect', x: 140, y: 480, w: 420, h: 300, fill: 'hi', radius: 36 }),
    circle: () => addLayer({ type: 'shape', shape: 'circle', x: 300, y: 460, w: 320, h: 320, fill: 'sec' }),
    pill: () => addLayer({ type: 'shape', shape: 'pill', x: 200, y: 560, w: 460, h: 120, fill: 'hi' }),
    line: () => addLayer({ type: 'shape', shape: 'rect', x: 96, y: 640, w: 888, h: 8, fill: 'ink', radius: 4 }),
    arrow: () => addLayer({ type: 'shape', shape: 'arrow', x: 300, y: 600, w: 300, h: 80, stroke: 'ink', sw: 6 }),
  };
  function addPhoto(replaceLayer) {
    const inp = h('input', { type: 'file', accept: 'image/*', onchange: async e => {
      const f = e.target.files[0]; if (!f) return; let src; try { src = await X.shrink(f); } catch (er) { return toast(er.message); }
      const id = D.uid('u'), im = new Image(); await new Promise(r => { im.onload = im.onerror = r; im.src = src; }); R.imgs.set(id, im);
      if (replaceLayer) change(() => { replaceLayer.img = id; }); else { const k = Math.min(760 / im.naturalWidth, 760 / im.naturalHeight), w = Math.round(im.naturalWidth * k), hh = Math.round(im.naturalHeight * k); addLayer({ type: 'image', img: id, x: Math.round((dims()[0] - w) / 2), y: 330, w, h: hh, radius: 24, zoom: 1, ox: 0, oy: 0 }); }
    } }); inp.click();
  }

  // ---- inspector ------------------------------------------------------------------------------------------------------------------------------------------------------------
  const row = (label, ctl, hint) => h('div.ir', null, h('label', null, label), ctl, hint ? h('div.edhint', null, hint) : null);
  const sec = (title, kids, open) => { const d = h('details.isec', { open: open !== false }, h('summary', null, title), h('div.ibody', null, kids)); return d; };
  const sel = (opts, get, set) => h('select', { onchange: e => set(e.target.value) }, Object.entries(opts).map(([v, l]) => h('option', { value: v, selected: String(get()) === v }, l)));
  const seg = (opts, get, set) => h('div.seg', null, Object.entries(opts).map(([v, l]) => h('button', { type: 'button', class: String(get()) === v ? 'on' : '', onclick: () => set(v) }, l)));
  const range = (min, max, step, get, set, fmtv) => { const out = h('span.rv', null, fmtv ? fmtv(get()) : get()); const r = h('input', { type: 'range', min, max, step, value: get(), oninput: e => { out.textContent = fmtv ? fmtv(+e.target.value) : e.target.value; set(+e.target.value); } }); return h('div.rg', null, r, out); };
  const txt = (get, set, o) => { o = o || {}; const el = h(o.area ? 'textarea' : 'input', { value: get() == null ? '' : get(), rows: o.rows || 2, spellcheck: false, placeholder: o.ph || '', oninput: e => set(e.target.value) }); if (!o.area) el.type = 'text'; return el; };
  function colors(get, set, th, allowNone) {
    const cur = get(), sw = h('div.sw2', null, SW.map(([c, name]) => h('button', { type: 'button', title: name, class: String(cur) === c ? 'on' : '', style: { background: swatchCss(c, th) }, onclick: () => set(c) })));
    if (allowNone) sw.prepend(h('button.none', { type: 'button', title: 'None', class: !cur ? 'on' : '', onclick: () => set('') }, '∅'));
    const hex = /^#[0-9a-f]{6}$/i.test(String(cur)) ? cur : '#7e3eff'; sw.append(h('input', { type: 'color', value: hex, title: 'Custom colour', oninput: e => set(e.target.value) })); return sw;
  }
  const edit = (fn, key) => change(fn, { coalesce: key, keepInsp: true });

  function drawInsp() {
    const el = root.querySelector('.insp'); el.innerHTML = ''; if (S.tab === 'reel') { el.append(h('div.ibody', null, h('p.edhint', null, 'Switch to Carousel to edit the slides. The reel uses the same slides and the motion from the Motion node.'))); return; }
    const s = slide(), th = scene().theme, it = selItem(), lay = selLayer();
    // add elements
    el.append(sec('Add', h('div.addgrid', null, [['Text', 'text'], ['Heading', 'heading'], ['Sticker', 'sticker'], ['Rectangle', 'rect'], ['Circle', 'circle'], ['Pill', 'pill'], ['Line', 'line'], ['Arrow', 'arrow']].map(([n, k]) => h('button.btn.sm', { type: 'button', onclick: () => ADD[k]() }, n)).concat([h('button.btn.sm', { type: 'button', onclick: () => addPhoto() }, 'Photo…')])), true));
    if (it) el.append(elementSection(it, lay, s, th));
    el.append(slideSection(s, th), contentSection(s));
    const hidden = Object.entries(((s.o || {}).items) || {}).filter(([, v]) => v.hide).map(([k]) => k);
    if (hidden.length) el.append(sec('Hidden elements', hidden.map(k => h('div.ir', null, h('label', null, k.replace(/(\d+)$/, ' $1')), h('button.btn.sm', { type: 'button', onclick: () => change(() => delete s.o.items[k].hide) }, 'Show')))));
    if (S.draft.refs && S.draft.refs.length) el.append(sec('Sources', h('ul.refs', null, S.draft.refs.map(r => h('li', null, h('a', { href: /^https?:\/\//i.test(r.url) ? r.url : '#', target: '_blank', rel: 'noopener noreferrer' }, r.title || r.url), r.source ? h('span.muted', null, ' · ' + r.source) : null))), false));
  }

  function elementSection(it, lay, s, th) {
    const kids = [], key = it.key;
    const textLike = !!(TEXT_SRC[it.role] || (lay && lay.type === 'text'));
    if (textLike) {
      const o = lay || ((s.o = s.o || {}), (s.o[it.role] = s.o[it.role] || {}));
      const L = lay ? R.prepLayer(lay, scene()).L : it.text;
      const getSize = () => Math.round(o.size || (L ? L.size : 48));
      kids.push(row('Font', sel(FONTS, () => o.fam || '', v => change(() => (o.fam = v || undefined), { keepInsp: true }))),
        row('Weight', sel(WEIGHTS, () => o.weight || (L ? L.weight : 500), v => change(() => (o.weight = +v), { keepInsp: true }))),
        row('Size', h('div.rg', null, h('input', { type: 'number', min: 12, max: 500, value: getSize(), onchange: e => change(() => (o.size = clamp(+e.target.value || 48, 12, 500)), { keepInsp: true }) }), !lay ? h('button.btn.sm', { type: 'button', title: 'Back to automatic fitting', onclick: () => change(() => { delete o.size; }) }, 'Auto') : null)),
        row('Colour', colors(() => o.color || 'ink', v => change(() => (o.color = v), { keepInsp: true }), th)),
        row('Align', seg({ left: 'Left', center: 'Centre', right: 'Right' }, () => o.align || 'left', v => change(() => (o.align = v)))),
        row('Line height', range(0.8, 1.6, 0.02, () => o.lh || (L ? +(L.lh / L.size).toFixed(2) : 1.1), v => edit(() => (o.lh = v), 'lh' + key))),
        row('Letter spacing', range(-0.08, 0.2, 0.005, () => (o.track != null ? o.track : L ? L.track : 0), v => edit(() => (o.track = v), 'tr' + key))));
      if (lay) { kids.push(row('Box colour', colors(() => lay.bg || '', v => change(() => (lay.bg = v || undefined), { keepInsp: true }), th, true)), row('Corners', range(0, 80, 2, () => lay.radius || 0, v => edit(() => (lay.radius = v), 'rad' + key)))); }
      kids.push(h('p.edhint', null, 'Double-click the text on the slide to type. [[Brackets]] make the violet highlight, {{braces}} the orange accent.'));
    } else if (lay && lay.type === 'image') {
      kids.push(row('Photo', h('div.rg', null, h('button.btn.sm', { type: 'button', onclick: () => addPhoto(lay) }, 'Replace…'), h('button.btn.sm' + (S.cropMode ? '.primary' : ''), { type: 'button', title: 'Drag on the slide to move the photo inside its frame', onclick: () => { S.cropMode = !S.cropMode; drawInsp(); } }, S.cropMode ? 'Done cropping' : 'Crop'))),
        row('Zoom', range(1, 4, 0.02, () => lay.zoom || 1, v => edit(() => (lay.zoom = v), 'z' + key), v => v.toFixed(2) + '×')),
        row('Pan left / right', range(-1, 1, 0.02, () => lay.ox || 0, v => edit(() => (lay.ox = v), 'ox' + key), v => v.toFixed(2))),
        row('Pan up / down', range(-1, 1, 0.02, () => lay.oy || 0, v => edit(() => (lay.oy = v), 'oy' + key), v => v.toFixed(2))),
        row('Brightness', range(0.4, 1.8, 0.02, () => (lay.brightness != null ? lay.brightness : 1), v => edit(() => (lay.brightness = v), 'b' + key), v => Math.round(v * 100) + '%')),
        row('Contrast', range(0.4, 1.8, 0.02, () => (lay.contrast != null ? lay.contrast : 1), v => edit(() => (lay.contrast = v), 'c' + key), v => Math.round(v * 100) + '%')),
        row('Saturation', range(0, 2, 0.02, () => (lay.saturate != null ? lay.saturate : 1), v => edit(() => (lay.saturate = v), 's' + key), v => Math.round(v * 100) + '%')),
        row('Corners', range(0, 200, 2, () => lay.radius || 0, v => edit(() => (lay.radius = v), 'r' + key))),
        row('Outline', colors(() => lay.stroke || '', v => change(() => (lay.stroke = v || undefined), { keepInsp: true }), th, true)));
    } else if (lay && lay.type === 'shape') {
      if (lay.shape !== 'arrow') kids.push(row('Fill', colors(() => lay.fill || 'hi', v => change(() => (lay.fill = v), { keepInsp: true }), th, true)));
      kids.push(row('Outline', colors(() => lay.stroke || '', v => change(() => (lay.stroke = v || undefined), { keepInsp: true }), th, true)), row('Line width', range(1, 24, 1, () => lay.sw || 4, v => edit(() => (lay.sw = v), 'sw' + key))));
      if (lay.shape === 'rect') kids.push(row('Corners', range(0, 200, 2, () => lay.radius || 0, v => edit(() => (lay.radius = v), 'rad' + key))));
    } else {
      const io = () => ((s.o && s.o.items && s.o.items[key]) || {});
      kids.push(row('Size', range(0.2, 3, 0.02, () => io().s || 1, v => edit(() => (overrideFor(key).s = v), 'sc' + key), v => Math.round(v * 100) + '%')), h('p.edhint', null, 'Drag to move, drag a corner to resize. Press Delete to hide it; hidden elements come back from the list below.'));
    }
    if (lay) {
      kids.push(row('Rotation', range(-180, 180, 1, () => Math.round((lay.rot || 0) * 180 / Math.PI), v => edit(() => (lay.rot = v * Math.PI / 180), 'rot' + key), v => v + '°')), row('Order', h('div.rg', null, h('button.btn.sm', { type: 'button', onclick: () => reorder(lay, 1) }, 'Forward'), h('button.btn.sm', { type: 'button', onclick: () => reorder(lay, -1) }, 'Back'))));
      kids.push(row('Align to slide', h('div.rg', null, h('button.btn.sm', { type: 'button', onclick: () => centerLayer(lay, 'x') }, 'Centre ↔'), h('button.btn.sm', { type: 'button', onclick: () => centerLayer(lay, 'y') }, 'Centre ↕'))));
    }
    const acts = h('div.rg.acts', null, lay ? h('button.btn.sm', { type: 'button', onclick: dupSelected }, 'Duplicate') : null, h('button.btn.sm', { type: 'button', onclick: delSelected }, lay ? 'Delete' : 'Hide'), !lay && ((s.o || {}).items || {})[key] ? h('button.btn.sm', { type: 'button', onclick: () => change(() => delete s.o.items[key]) }, 'Reset position') : null);
    kids.push(acts);
    return sec('Selected: ' + R.itemName(it), kids, true);
  }
  function reorder(l, d) { change(() => { const a = slide().layers, i = a.indexOf(a.find(z => z.id === l.id)), j = clamp(i + d, 0, a.length - 1); const [m] = a.splice(i, 1); a.splice(j, 0, m); }, { keepInsp: true }); }
  function centerLayer(l, ax) { const [W, H] = dims(), b = R.itemBox(scene(), selItem()); change(() => { if (ax === 'x') l.x = Math.round((W - b.w) / 2); else l.y = Math.round((H - b.h) / 2); }, { keepInsp: true }); }

  function slideSection(s, th) {
    const kinds = Object.fromEntries(Object.entries(KIND_NAMES));
    const kids = [row('Layout', sel(kinds, () => s.kind, v => change(() => convertKind(s, v)))),
      s.kind === 'cover' ? row('Cover style', sel(COVERS, () => s.cover || '', v => change(() => { if (v) s.cover = v; else delete s.cover; if (v === 'annotate' && !s.callouts) s.callouts = [{ w: 0, label: 'Detail' }]; if (v === 'ripple' && !s.num) { s.num = '5'; s.stamp = String(new Date().getFullYear()); } }))) : null,
      row('Theme', seg(THEMES, () => s.theme || S.deck.design.theme || 'light', v => change(() => { s.theme = v; delete s.bgColor; }))),
      row('Background', colors(() => s.bgColor || '', v => change(() => (v ? (s.bgColor = v) : delete s.bgColor), { keepInsp: true }), th, true)),
      h('div.rg.acts', null, h('button.btn.sm', { type: 'button', onclick: () => dupSlide(S.i) }, 'Duplicate slide'), h('button.btn.sm', { type: 'button', onclick: () => delSlide(S.i) }, 'Delete slide'), h('button.btn.sm', { type: 'button', disabled: S.i === 0, onclick: () => moveSlide(S.i, S.i - 1) }, '← Move'), h('button.btn.sm', { type: 'button', disabled: S.i >= S.deck.slides.length - 1, onclick: () => moveSlide(S.i, S.i + 1) }, 'Move →')),
      (s.o && Object.keys(s.o).length) || (s.layers && s.layers.length) ? h('button.btn.sm', { type: 'button', onclick: () => change(() => { delete s.o; s.layers = []; S.key = null; }) }, 'Reset my edits on this slide') : null];
    return sec(`Slide ${S.i + 1} · ${KIND_NAMES[s.kind] || s.kind}`, kids, !S.key);
  }
  function convertKind(s, kind) {
    if (s.kind === kind) return; const n = sample(kind), keep = { head: s.head, foot: s.foot, theme: s.theme, bgColor: s.bgColor, layers: s.layers, imgs: s.imgs };
    Object.keys(s).forEach(k => delete s[k]); Object.assign(s, n); ['head', 'foot'].forEach(k => { if (keep[k] && (n[k] != null || k === 'head')) s[k] = keep[k]; }); if (keep.theme) s.theme = keep.theme; if (keep.bgColor) s.bgColor = keep.bgColor; if (keep.layers && keep.layers.length) s.layers = keep.layers; if (keep.imgs) s.imgs = keep.imgs; S.key = null;
  }

  // content fields for whatever the slide holds
  function contentSection(s) {
    const f = [], set = (fn, k) => v => edit(() => fn(v), k);
    const area = (label, get, put, rows, ph) => f.push(row(label, txt(get, set(put, 'c' + label), { area: true, rows: rows || 2, ph })));
    const line = (label, get, put) => f.push(row(label, txt(get, set(put, 'c' + label))));
    const lines = (label, get, put, rows, hint) => f.push(row(label, txt(() => (get() || []).join('\n'), set(v => put(v.split('\n').filter(x => x.trim())), 'c' + label), { area: true, rows: rows || 3 }), hint));
    if (s.kind === 'cover') { if (s.cover === 'ripple') { line('Number', () => s.num, v => (s.num = v)); line('Stamp', () => s.stamp, v => (s.stamp = v)); } area('Title', () => s.head, v => (s.head = v), 2); if (s.cover !== 'ripple' && s.cover !== 'crt') line('Sub-line', () => s.sub, v => (s.sub = v)); line('Sticker', () => s.tag, v => (s.tag = v)); }
    else if (s.head != null || s.kind) area('Headline', () => s.head, v => (s.head = v), 2);
    if (s.cover === 'annotate') lines('Callouts', () => (s.callouts || []).map(c => `${c.w}: ${c.label}`), v => (s.callouts = v.map(x => { const m = x.match(/^(\d+)\s*:\s*(.*)$/); return m ? { w: +m[1], label: m[2] } : { w: 0, label: x }; })), 3, 'One per line as “word number: label”. Word 0 is the first word of the title.');
    if (s.kind === 'art') f.push(row('Illustration', sel({ retro: 'Retro computer', browser: 'Browser window', phone: 'Phone' }, () => s.art || 'retro', v => change(() => (s.art = v), { keepInsp: true }))));
    if (s.a) { line('Left label', () => s.a.label, v => (s.a.label = v)); line('Left text', () => s.a.text, v => (s.a.text = v)); line('Right label', () => s.b.label, v => (s.b.label = v)); line('Right text', () => s.b.text, v => (s.b.text = v)); }
    if (s.stat) { line('Number', () => s.stat.value, v => (s.stat.value = v)); line('Label', () => s.stat.label, v => (s.stat.label = v)); }
    if (s.items) lines('List items', () => s.items, v => (s.items = v), 4);
    if (s.yes) { lines('Do', () => s.yes, v => (s.yes = v), 2); lines('Don’t', () => s.no, v => (s.no = v), 2); }
    if (s.quote) { area('Quote', () => s.quote.text, v => (s.quote.text = v), 3); line('By', () => s.quote.by, v => (s.quote.by = v)); }
    if (s.chat) lines('Messages', () => s.chat.map(m => `${m.who}: ${m.text}`), v => (s.chat = v.map(x => { const m = x.match(/^(me|them)\s*:\s*(.*)$/i); return m ? { who: m[1].toLowerCase(), text: m[2] } : { who: 'them', text: x }; })), 4, 'One per line: “them: …” or “me: …”.');
    if (s.notes) lines('Notes', () => s.notes, v => (s.notes = v), 3);
    if (s.points) lines('Timeline', () => s.points.map(p => `${p.k} | ${p.v}`), v => (s.points = v.map(x => { const [k, ...r] = x.split('|'); return { k: k.trim(), v: r.join('|').trim() }; })), 4, 'One per line: “2024 | what happened”.');
    if (s.words) line('Words', () => s.words.join(', '), v => (s.words = v.split(',').map(x => x.trim()).filter(Boolean)));
    if (s.labels) lines('Callout labels', () => s.labels, v => (s.labels = v), 2);
    if (s.kind === 'poster') line('Big word', () => s.word, v => (s.word = v));
    if (s.kind === 'marquee') line('Tape text', () => s.band, v => (s.band = v));
    if (s.kind === 'greeting') { line('Label', () => s.label, v => (s.label = v)); line('Title', () => s.title, v => (s.title = v)); }
    if (s.kind === 'cta') line('Button', () => s.btn, v => (s.btn = v));
    if (s.foot != null) area('Footer', () => s.foot, v => (s.foot = v), 2);
    f.push(h('p.edhint', null, '[[Brackets]] = violet highlight · {{braces}} = orange accent'));
    if (S.draft.deck.caption != null) f.push(row('Caption', txt(() => S.deck.caption, set(v => (S.deck.caption = v), 'cap'), { area: true, rows: 4 })));
    return sec('Content', f, true);
  }

  // ---- open / close ------------------------------------------------------------------------------------------------------------------------------------------------------------
  const Editor = {
    get isOpen() { return !!S && !root.hidden; },
    open(draft, o) {
      o = o || {}; if (!root) build(); root = document.getElementById('focus'); stopPlayer();
      S = { draft, deck: draft.deck, i: clamp(o.index || 0, 0, draft.deck.slides.length - 1), key: null, zoom: null, view: 'one', tab: o.tab || 'carousel', hist: [], hi: -1, cropMode: false, onSaved: o.onSaved };
      S.deck.slides.forEach(s => { if (!s.layers) s.layers = s.layers || []; });
      S.deck.brand = S.deck.brand || {}; S.deck.design = S.deck.design || { theme: 'light' }; pushHist();
      root.hidden = false; document.body.classList.add('focus-open'); onClose = o.onClose || null;
      root.querySelector('.ftitle').value = draft.title; root.querySelector('[data-act=approve]').textContent = draft.approved ? '✓ Post approved' : 'Approve post';
      paintSeg(); paintStatus(); requestAnimationFrame(() => { drawStage(); drawFilm(); drawInsp(); paintUndo(); });
      if (!o.unsaved) scheduleSave(); else { saveStatus = 'Not saved yet'; paintStatus(); }
      if (!o.keepSaved) { S.fresh = true; }
      root.querySelector('.stagewrap').scrollTo && root.querySelector('.stagewrap').scrollTo(0, 0);
    },
    close() { if (!S) return; closeInline(true); stopPlayer(); clearTimeout(saveT); const d = S.draft; D.save(d).catch(() => {}); root.hidden = true; document.body.classList.remove('focus-open'); const cb = onClose; S = null; if (cb) cb(d); },
    setToast(fn) { toast = fn; },
    get draft() { return S && S.draft; },
    _state() { return S; },
  };
  window.SixjulyEditor = Editor;
})();
