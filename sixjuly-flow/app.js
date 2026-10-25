/* Sixjuly Flow — app shell: toolbar, flows, results panel, reel player, downloads. */
(function () {
  'use strict';
  const G = window.SixjulyGraph, R = window.SixjulyRender, F = window.SixjulyFlow, X = window.SixjulyExport, C = window.SixjulyCopy, h = window.sjh;
  const $ = s => document.querySelector(s);
  const LS = { flow: 'sixjuly-flow.v1', key: 'sixjuly-flow.key', auto: 'sixjuly-flow.auto' };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private window */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  // ---- starter flows ------------------------------------------------------------------------------------------------------------
  const TOPICS = 'Digital textures in UI :: jelly buttons; chrome toggles; clay cards\nWhy great rebrands feel familiar\nDesign systems that scale :: tokens first; one source of truth; document the why';
  function flowFull(o) {
    o = o || {};
    const t = { id: 'n1', type: 'topics', x: 0, y: 0, params: { text: o.topics || TOPICS } };
    const b = { id: 'n2', type: 'brand', x: 0, y: 340, params: {} };
    const w = { id: 'n3', type: 'write', x: 324, y: 0, params: o.write || {} };
    const d = { id: 'n4', type: 'design', x: 648, y: 60, params: {} };
    const nodes = [t, b, w, d], edges = [
      { from: ['n1', 'topics'], to: ['n3', 'topics'] }, { from: ['n3', 'stories'], to: ['n4', 'stories'] }, { from: ['n2', 'brand'], to: ['n4', 'brand'] }];
    if (o.carousel !== false) { nodes.push({ id: 'n5', type: 'carousel', x: 972, y: 0, params: {} }); edges.push({ from: ['n4', 'decks'], to: ['n5', 'decks'] }); }
    if (o.reel !== false) {
      nodes.push({ id: 'n6', type: 'motion', x: 972, y: o.carousel === false ? 0 : 340, params: Object.assign({ preset: 'smooth' }, R.MOTION_PRESETS.smooth, o.motion || {}) });
      nodes.push({ id: 'n7', type: 'reel', x: 1296, y: o.carousel === false ? 0 : 340, params: {} });
      edges.push({ from: ['n4', 'decks'], to: ['n6', 'decks'] }, { from: ['n6', 'decks'], to: ['n7', 'decks'] });
    }
    return { v: 1, nodes, edges };
  }
  const FLOWS = [
    { name: 'Carousel + Reel', hint: 'Topics → copy → slides → post and video', make: () => flowFull() },
    { name: 'Carousel only', hint: 'Static 4:5 posts', make: () => flowFull({ reel: false }) },
    { name: 'Reel only', hint: '9:16 video with motion', make: () => flowFull({ carousel: false }) },
    { name: 'Punchy reels, dark theme', hint: 'Fast word-by-word motion on black', make: () => { const f = flowFull({ motion: R.MOTION_PRESETS.punchy }); f.nodes.find(n => n.type === 'motion').params.preset = 'punchy'; f.nodes.find(n => n.id === 'n4').params = { theme: 'dark', art: 'spiral' }; return f; } },
    { name: 'Layout showcase', hint: 'One deck with every layout and cover style', make: () => flowFull({ topics: 'Layout showcase', write: { format: 'showcase', engine: 'patterns' } }) },
    { name: 'Style packs', hint: 'One deck that shows all seven design styles', make: () => flowFull({ topics: 'Style packs', write: { format: 'styles', engine: 'patterns' } }) },
    { name: 'Swiss grid carousel', hint: 'Hairline rules, folio, flush-left grotesk (studio style)', make: () => { const f = flowFull({ reel: false }); f.nodes.find(n => n.id === 'n4').params = { style: 'swiss' }; return f; } },
    { name: 'Colour poster reels', hint: 'Flat colour fields and giant type, fast motion', make: () => { const f = flowFull({ carousel: false, motion: R.MOTION_PRESETS.punchy }); f.nodes.find(n => n.type === 'motion').params.preset = 'punchy'; f.nodes.find(n => n.id === 'n4').params = { style: 'poster' }; return f; } },
    { name: 'Blank', hint: 'Start from nothing', make: () => ({ v: 1, nodes: [], edges: [] }) },
  ];

  // ---- toast ---------------------------------------------------------------------------------------------------------------------
  let toastT;
  function toast(msg, err) { const t = $('#toast'); t.textContent = msg; t.className = 'on' + (err ? ' err' : ''); clearTimeout(toastT); toastT = setTimeout(() => (t.className = ''), err ? 6000 : 2600); }

  window.SixjulyToast = toast;

  // ---- state ---------------------------------------------------------------------------------------------------------------------
  const state = { outputs: [], busy: false, pending: false, auto: store.get(LS.auto) === '1', players: [] };
  F.apiKey = store.get(LS.key) || '';

  function save() {
    let txt = JSON.stringify(G.serialize());
    if (txt.length > 3e6) { const d = G.serialize(); d.nodes.forEach(n => { if (n.type === 'images') n.params = Object.assign({}, n.params, { files: [] }); }); txt = JSON.stringify(d); }
    store.set(LS.flow, txt);
  }
  let saveT; const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 300); };
  let autoT;
  function scheduleAuto() { if (!state.auto) return; clearTimeout(autoT); autoT = setTimeout(() => run(), 700); }

  // ---- run -----------------------------------------------------------------------------------------------------------------------
  async function run() {
    if (state.busy) { state.pending = true; return; }
    state.busy = true; const btn = $('#runBtn'); btn.disabled = true; btn.lastChild.textContent = ' Running…';
    try {
      const outs = await F.run();
      await R.loadFonts(outs[0] && outs[0].decks[0] ? outs[0].decks[0].brand : {});
      state.outputs = outs; draftsOf.clear(); renderResults();
    } catch (e) { toast(e.message, true); }
    state.busy = false; btn.disabled = false; btn.lastChild.textContent = ' Run';
    if (state.pending) { state.pending = false; scheduleAuto(); }
  }

  // ---- results -------------------------------------------------------------------------------------------------------------------
  function stopPlayers() { state.players.forEach(p => p.stop()); state.players = []; }
  function renderResults() {
    stopPlayers();
    const body = $('#rbody'); body.innerHTML = '';
    const max = Math.max(0, ...state.outputs.map(o => o.decks.length));
    $('#allBtn').disabled = !max; $('#maxBtn').disabled = !max;
    $('#rsub').textContent = max ? `${max} topic${max === 1 ? '' : 's'}` : '';
    if (!max) return;
    for (let i = 0; i < max; i++) body.append(card(i));
  }

  function card(i) {
    const first = state.outputs.map(o => o.decks[i]).find(Boolean);
    const rc = h('article.rc', { 'data-i': i });
    const eng = String(first.engine || '');
    rc.append(h('div.rc-h', null, h('h3', { title: first.topic }, first.topic), h('span.chip' + (/failed/.test(eng) ? '.warn' : ''), { title: eng }, /failed/.test(eng) ? 'Claude failed → patterns' : eng.split(' ')[0]), h('span.chip', null, (C.FORMATS[first.format] || first.format)), h('button.btn.sm', { type: 'button', title: 'Edit this post and see it full screen', onclick: () => openInFocus(i) }, 'Edit ⤢')));
    for (const out of state.outputs) {
      const deck = out.decks[i]; if (!deck) continue;
      if (out.node.type === 'carousel') rc.append(carouselSection(out.node, deck, i));
      else if (out.node.type === 'reel') rc.append(reelSection(out.node, deck));
    }
    rc.append(editor(first, i, rc));
    return rc;
  }

  function carouselSection(node, deck, deckIndex) {
    const [W, H] = String(node.params.ratio).split('x').map(Number), cw = 150, ch = Math.round(cw * H / W), dpr = 2;
    const strip = h('div.strip');
    const draw = (cv, i, t) => { const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); R.drawSlide(ctx, deck, i, { W, H, scale: cv.width / W, t, motion: deck.motion || R.DEFAULT_MOTION }); };
    deck.slides.forEach((s, i) => {
      const cv = h('canvas', { width: cw * dpr, height: ch * dpr, style: { width: cw + 'px', height: ch + 'px' }, title: 'Hover to preview the motion' });
      draw(cv, i, null); cv._draw = t => draw(cv, i, t); strip.append(cv);
      cv.addEventListener('click', () => openInFocus(deckIndex, i));
      let raf = 0;
      cv.addEventListener('mouseenter', () => { const t0 = performance.now(), m = deck.motion || R.DEFAULT_MOTION; const tick = () => { const t = (performance.now() - t0) / 1000; draw(cv, i, t); if (t < 5) raf = requestAnimationFrame(tick); else draw(cv, i, null); }; cancelAnimationFrame(raf); tick(); });
      cv.addEventListener('mouseleave', () => { cancelAnimationFrame(raf); draw(cv, i, null); });
    });
    const sec = h('div.sect', null, h('div.sect-h', null, h('b', null, node.params.format === 'jpg' ? 'Carousel · JPG' : 'Carousel'), `${deck.slides.length} slides · ${W}×${H}`));
    const btn = h('button.btn.sm', { onclick: async () => {
      btn.disabled = true; const label = btn.textContent;
      try { const files = await X.carouselFiles(deck, node.params, p => (btn.textContent = `Rendering ${Math.round(p * 100)}%`)); files.push({ name: 'caption.txt', blob: new Blob([X.captionText(deck)], { type: 'text/plain' }) }); X.download(await X.zipFiles(files.map(f => ({ name: X.slug(deck.topic) + '/' + f.name, blob: f.blob }))), X.slug(deck.topic) + '-carousel.zip'); }
      catch (e) { toast(e.message, true); }
      btn.disabled = false; btn.textContent = label;
    } }, 'Download slides');
    sec.append(strip, h('div.dl', null, btn));
    sec._redraw = () => strip.querySelectorAll('canvas').forEach(cv => cv._draw && cv._draw(null));
    return sec;
  }

  function reelSection(node, deck) {
    const m = deck.motion || R.DEFAULT_MOTION, dpr = 2, cw = 162, ch = 288, sc = cw * dpr / 1080;
    const cv = h('canvas', { width: cw * dpr, height: ch * dpr, style: { width: cw + 'px', height: ch + 'px' } });
    const ctx = cv.getContext('2d');
    let plan = R.reelPlan(deck, m), t = 0, playing = false, raf = 0, last = 0, poster = true;
    const range = h('input', { type: 'range', min: 0, max: 1000, value: 0 }), time = h('span.time', null, '0:00');
    const fmt = s => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`; const pad = n => String(n).padStart(2, '0');
    const frame = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(sc, 0, 0, sc, 0, 0);
      if (poster) R.drawSlide(ctx, deck, 0, { W: 1080, H: 1920 }); else R.drawReel(ctx, deck, t, { plan, motion: m });
      range.value = Math.round(t / plan.total * 1000); time.textContent = `${fmt(t)} / ${fmt(plan.total)}`;
    };
    const tick = now => { if (!playing) return; t += (now - last) / 1000; last = now; if (t >= plan.total) { t = 0; } frame(); raf = requestAnimationFrame(tick); };
    const pbtn = h('button.pbtn', { title: 'Play / pause', onclick: () => { playing = !playing; poster = false; pbtn.innerHTML = playing ? PAUSE : PLAY; if (playing) { last = performance.now(); raf = requestAnimationFrame(tick); } } }); pbtn.innerHTML = PLAY;
    range.addEventListener('input', () => { poster = false; t = range.value / 1000 * plan.total; frame(); });
    frame();
    const stop = () => { playing = false; cancelAnimationFrame(raf); };
    state.players.push({ stop });
    const dlBtn = h('button.btn.sm', { onclick: async () => {
      dlBtn.disabled = true; const label = dlBtn.textContent;
      try { const res = await X.reelVideo(deck, node.params, p => (dlBtn.textContent = `Encoding ${Math.round(p * 100)}%`)); X.download(res.blob, `${X.slug(deck.topic)}-reel.${res.ext}`); toast(`Saved ${res.ext.toUpperCase()} · ${(res.blob.size / 1e6).toFixed(1)} MB`); }
      catch (e) { toast('Video export failed: ' + e.message, true); }
      dlBtn.disabled = false; dlBtn.textContent = label;
    } }, 'Download video');
    const meta = h('div.meta', null, `${deck.slides.length} slides · ${plan.total.toFixed(1)}s`, h('br'), `Motion: ${R.MOTION_PRESETS[m.preset] ? m.preset : 'custom'} · ${R.TRANSITIONS[m.transition] || 'cut'}`, h('br'), `${node.params.fps} fps · 1080×1920`);
    const sec = h('div.sect', null, h('div.sect-h', null, h('b', null, 'Reel')), h('div.reel', null, cv, h('div.player', null, h('div.bar', null, pbtn, range, time), meta, h('div.dl', null, dlBtn))));
    sec._redraw = () => { plan = R.reelPlan(deck, m); frame(); meta.firstChild.textContent = `${deck.slides.length} slides · ${plan.total.toFixed(1)}s`; };
    return sec;
  }
  const PLAY = '<svg viewBox="0 0 16 16" width="13" height="13"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
  const PAUSE = '<svg viewBox="0 0 16 16" width="13" height="13"><path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor"/></svg>';

  // ---- copy editor ------------------------------------------------------------------------------------------------------------------
  function editor(deck, i, rc) {
    const det = h('details.edit', null, h('summary', null, 'Edit copy & caption'));
    let ready = false, tm;
    const redraw = () => { clearTimeout(tm); tm = setTimeout(() => rc.querySelectorAll('.sect').forEach(s => s._redraw && s._redraw()), 220); };
    const input = (get, set, o) => { o = o || {}; const el = h(o.area ? 'textarea' : 'input', { value: get() || '', rows: o.rows || 2, placeholder: o.ph || '', spellcheck: false, oninput: e => { set(e.target.value); redraw(); } }); if (!o.area) el.type = 'text'; return el; };
    det.addEventListener('toggle', () => {
      if (!det.open || ready) return; ready = true;
      det.append(h('p.edhint', null, 'Use [[double brackets]] for the violet highlight and {{braces}} for the orange accent.'));
      deck.slides.forEach((s, k) => {
        const box = h('div.slide-ed', null, h('h4', null, `${k + 1} · ${s.kind}`));
        if (s.head != null) box.append(input(() => s.head, v => (s.head = v), { area: 1 }));
        if (s.kind === 'cover') box.append(h('div.two', null, input(() => s.sub, v => (s.sub = v), { ph: 'Sub-line' }), input(() => s.tag, v => (s.tag = v), { ph: 'Sticker' })));
        if (s.kind === 'compare') box.append(h('div.two', null, input(() => s.a.text, v => (s.a.text = v)), input(() => s.b.text, v => (s.b.text = v))));
        if (s.kind === 'stat') box.append(h('div.two', null, input(() => s.stat.value, v => (s.stat.value = v)), input(() => s.stat.label, v => (s.stat.label = v))));
        if (s.items) box.append(input(() => s.items.join('\n'), v => (s.items = v.split('\n').filter(Boolean)), { area: 1, rows: 3 }));
        if (s.quote) box.append(input(() => s.quote.text, v => (s.quote.text = v), { area: 1 }));
        if (s.kind === 'cta') box.append(input(() => s.btn, v => (s.btn = v), { ph: 'Button text' }));
        if (s.foot != null) box.append(input(() => s.foot, v => (s.foot = v), { area: 1 }));
        det.append(box);
      });
      const cap = h('textarea.cap', { value: X.captionText(deck), oninput: e => { const [c, ...rest] = e.target.value.split(/\n\n(?=#)/); deck.caption = c.trim(); deck.hashtags = (rest.join(' ').match(/#\w+/g)) || deck.hashtags; } });
      det.append(h('h4.edcap', { style: { margin: '14px 0 6px', fontSize: '12px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 500 } }, 'Caption'), cap,
        h('div.dl', { style: { marginTop: '8px' } }, h('button.btn.sm', { onclick: () => { try { navigator.clipboard.writeText(cap.value).then(() => toast('Caption copied'), () => { cap.select(); toast('Press ⌘/Ctrl + C to copy'); }); } catch (e) { cap.select(); toast('Press ⌘/Ctrl + C to copy'); } } }, 'Copy caption')));
    });
    return det;
  }

  // ---- download all -----------------------------------------------------------------------------------------------------------------------
  async function collectAll(onStatus) {
    const files = [], decks = [];
    const max = Math.max(0, ...state.outputs.map(o => o.decks.length));
    for (let i = 0; i < max; i++) {
      for (const out of state.outputs) {
        const deck = out.decks[i]; if (!deck) continue;
        const dir = X.slug(deck.topic) + '/';
        if (out.node.type === 'carousel') { onStatus(`Slides ${i + 1}/${max}`); (await X.carouselFiles(deck, out.node.params)).forEach(f => files.push({ name: dir + 'carousel/' + f.name, blob: f.blob })); }
        else { onStatus(`Reel ${i + 1}/${max}`); const r = await X.reelVideo(deck, out.node.params, p => onStatus(`Reel ${i + 1}/${max} · ${Math.round(p * 100)}%`)); files.push({ name: dir + 'reel.' + r.ext, blob: r.blob }); }
        if (!decks.includes(deck.topic)) { decks.push(deck.topic); files.push({ name: dir + 'caption.txt', blob: new Blob([X.captionText(deck)], { type: 'text/plain' }) }); }
      }
    }
    return files;
  }
  async function downloadAll() {
    const btn = $('#allBtn'); btn.disabled = true; const label = btn.textContent;
    try { const files = await collectAll(s => (btn.textContent = s)); btn.textContent = 'Zipping…'; X.download(await X.zipFiles(files), 'sixjuly-posts.zip'); toast('Saved sixjuly-posts.zip'); }
    catch (e) { toast(e.message, true); }
    btn.disabled = false; btn.textContent = label;
  }

  // ---- focus view ---------------------------------------------------------------------------------------------------------------------------------
  const draftsOf = new Map();                  // result index -> draft created from it in this run
  function draftFromResult(i) {
    if (draftsOf.has(i)) return draftsOf.get(i);
    const car = state.outputs.find(o => o.node.type === 'carousel' && o.decks[i]), reel = state.outputs.find(o => o.node.type === 'reel' && o.decks[i]);
    const deck = (car || reel).decks[i], motion = reel ? reel.decks[i].motion : deck.motion;
    const d = SixjulyDrafts.create(Object.assign({}, deck, { motion }), { title: deck.topic, ratio: car ? car.node.params.ratio : '1080x1350', refs: (state.refs || {})[deck.topic] || [] });
    draftsOf.set(i, d); return d;
  }
  function openInFocus(i, index, tab) {
    const d = draftFromResult(i || 0); SixjulyEditor.open(d, { index: index || 0, tab, onSaved: d2 => syncDraft(d2), onClose: () => { renderResults(); } });
  }
  $('#maxBtn').onclick = () => openInFocus(0);
  const syncDraft = (() => { let t = 0; return d => { if (!SixjulySheet.connected || SixjulySheet.blocked) return; clearTimeout(t); t = setTimeout(() => SixjulySheet.pushDrafts([d]).catch(() => {}), 2500); }; })();
  async function openDraft(id) {
    const d = await SixjulyDrafts.load(id); if (!d) return toast('That draft could not be found');
    SixjulyEditor.open(d, { onSaved: syncDraft, onClose: () => { if (SixjulyDash.st.view === 'drafts') SixjulyDash.renderDrafts(); if (SixjulyDash.st.view === 'topics') SixjulyDash.renderDash(); } });
  }
  // an approved topic becomes a draft: its title and the subtopics from the taxonomy go into the Topics node, the existing flow writes and designs it
  async function createDraftFromTopic(t) {
    if (state.busy) throw new Error('The flow is busy. Try again in a moment.');
    const node = G.nodes.find(n => n.type === 'topics'); if (!node) throw new Error('Add a Topics node to the flow first.');
    const tax = SixjulyTracker.data.taxonomy.find(x => x.topic === t.mainTopic), points = tax ? tax.subtopics.slice(0, 4).map(x => x.toLowerCase()) : [];
    const name = t.title.replace(/[.!?\s]+$/, '').replace(/::/g, ' ');
    node.params.text = name + (points.length ? ' :: ' + points.join('; ') : ''); G.rebuild(node);
    F.refs = { [name]: SixjulyTracker.refsOf(t) }; state.refs = F.refs;
    await run(); if (!state.outputs.length || !state.outputs[0].decks.length) throw new Error('The flow did not produce a post. Check the nodes for errors.');
    const d = draftFromResult(0); d.topicId = t.id; d.title = t.title; d.refs = SixjulyTracker.refsOf(t); await SixjulyDrafts.save(d);
    SixjulyTracker.updateTopic(t.id, { status: 'Draft ready', draftId: d.id }); syncDraft(d);
    SixjulyEditor.open(d, { onSaved: syncDraft, onClose: () => { SixjulyDash.renderDash(); } }); toast('Draft ready. Review and edit it, then approve the post when you are happy.');
  }
  window.SixjulyApp = { createDraftFromTopic, openDraft, run };
  document.querySelectorAll('.nav button').forEach(b => (b.onclick = () => SixjulyDash.show(b.dataset.view)));
  SixjulyTracker.load().then(() => { /* tracker data is ready; the Topics view builds itself when opened */ });

  // ---- toolbar ------------------------------------------------------------------------------------------------------------------------
  function menu(id, btnId, items) {
    const m = $(id), b = $(btnId); m.innerHTML = '';
    items.forEach(it => it === '-' ? m.append(h('hr')) : m.append(h('button', { onclick: () => { m.classList.remove('open'); it.run(); } }, it.icon ? h('span.mi', { html: it.icon }) : null, h('span', null, it.name, it.hint ? h('small', null, it.hint) : null))));
    b.onclick = e => { e.stopPropagation(); document.querySelectorAll('.menu.open').forEach(x => x !== m && x.classList.remove('open')); m.classList.toggle('open'); };
  }
  document.addEventListener('click', () => document.querySelectorAll('.menu.open').forEach(m => m.classList.remove('open')));

  const ADDABLE = ['topics', 'brand', 'images', 'write', 'design', 'motion', 'carousel', 'reel'];
  function buildMenus() {
    menu('#addMenu', '#addBtn', ADDABLE.map(k => { const d = G.types[k]; return { name: d.title, hint: d.hint, icon: d.icon, run: () => { const c = G.centre(); const n = G.add(k, Math.round((c.x - 150) / 4) * 4, Math.round((c.y - 120) / 4) * 4); G.sel = n.id; n.el.classList.add('sel'); } }; }));
    menu('#exMenu', '#exBtn', [...FLOWS.map(f => ({ name: f.name, hint: f.hint, run: () => loadFlow(f.make()) })), '-',
      { name: 'Save flow…', hint: 'Download as a .json file', run: () => X.download(new Blob([JSON.stringify(G.serialize(), null, 1)], { type: 'application/json' }), 'sixjuly-flow.json') },
      { name: 'Open flow…', hint: 'Load a saved .json flow', run: () => $('#openFile').click() }]);
  }
  $('#openFile').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; try { loadFlow(JSON.parse(await f.text())); } catch (er) { toast('Not a flow file', true); } e.target.value = ''; });
  function loadFlow(data) { G.load(data); requestAnimationFrame(() => { G.fit(); save(); }); state.outputs = []; renderResults(); $('#rbody').innerHTML = '<div class="empty"><h3>Turn a topic into posts</h3><p>Edit the nodes, then press <b>Run</b>.</p></div>'; }

  $('#runBtn').onclick = () => run();
  $('#allBtn').onclick = downloadAll;
  $('#auto').checked = state.auto; $('#auto').onchange = e => { state.auto = e.target.checked; store.set(LS.auto, state.auto ? '1' : '0'); if (state.auto) scheduleAuto(); };
  $('#zIn').onclick = () => G.zoom(1.2); $('#zOut').onclick = () => G.zoom(1 / 1.2); $('#zFit').onclick = () => G.fit();
  $('#setBtn').onclick = () => { $('#keyIn').value = F.apiKey; $('#settings').showModal(); };
  $('#settings').addEventListener('close', () => {
    const rv = $('#settings').returnValue;
    if (rv === 'save') { F.apiKey = $('#keyIn').value.trim(); store.set(LS.key, F.apiKey); toast(F.apiKey ? 'API key saved in this browser' : 'Key removed'); }
    if (rv === 'clear') { F.apiKey = ''; store.del(LS.key); toast('Key removed'); }
  });
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); } });
  $('#mark').innerHTML = `<path d="${window.SIXJULY_LOGO.d}" fill-rule="evenodd"/>`; $('#mark').setAttribute('viewBox', `0 0 100 ${window.SIXJULY_LOGO.h}`);

  // ---- boot ---------------------------------------------------------------------------------------------------------------------------
  G.init($('#graph'));
  G.on('change', ev => {
    if (ev.node && ev.node.type === 'motion') {
      if (ev.field === 'preset') G.applyPreset(ev.node);
      else if (ev.field !== 'adv' && ev.node.params.preset !== 'custom') { ev.node.params.preset = 'custom'; setTimeout(() => G.rebuild(ev.node), 0); }
    }
    saveSoon(); if (!ev.view && !(ev.structural && !ev.node && !state.auto)) scheduleAuto();
  });
  document.addEventListener('sj-touch', () => { saveSoon(); if (state.auto) scheduleAuto(); else toast('New angle ready — press Run'); });
  buildMenus();
  let saved = null; try { saved = JSON.parse(store.get(LS.flow) || 'null'); } catch (e) { /* ignore */ }
  G.load(saved && saved.nodes && saved.nodes.length ? saved : FLOWS[0].make());
  requestAnimationFrame(() => requestAnimationFrame(() => G.fit()));
  R.loadFonts({});

  // ---- programmatic API (used by tools/generate.js and tests) ------------------------------------------------------------------------------
  F.api = {
    async generate(o) {
      o = o || {};
      G.load(flowFull({ topics: o.topics, carousel: o.carousel !== false, reel: !!o.reel }));
      const byType = t => G.nodes.find(n => n.type === t);
      const w = byType('write'); ['engine', 'model', 'format', 'slides', 'voice', 'seed'].forEach(k => o[k] != null && (w.params[k] = o[k]));
      if (o.apiKey) F.apiKey = o.apiKey;
      const d = byType('design'); ['theme', 'coverTheme', 'ctaTheme', 'rhythm', 'art'].forEach(k => o[k] != null && (d.params[k] = o[k]));
      const m = byType('motion'); if (m && o.motion) { m.params.preset = o.motion; Object.assign(m.params, R.MOTION_PRESETS[o.motion] || {}); }
      const rl = byType('reel'); if (rl && o.fps) rl.params.fps = o.fps;
      state.outputs = await F.run(); await R.loadFonts(state.outputs[0].decks[0].brand); renderResults();
      const files = await collectAll(() => {});
      const out = [];
      for (const f of files) { const buf = new Uint8Array(await f.blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); out.push({ name: f.name, b64: btoa(s) }); }
      return out;
    },
    state,
  };
})();
