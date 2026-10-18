/* Savio's editor — captions UI: the Auto captions dialog (what to listen to, on this computer or with Gemini, a starting
   look), the captions inspector (style gallery, layout, type, effects, the transcript, single words) and the ways in:
   Text panel, timeline toolbar, a video's inspector and the canvas inspector. The captions themselves are captions.js;
   hearing and timing the words is captions-asr.js. */
(function () {
  'use strict';
  const S = window.Studio, R = window.StudioRender, C = window.StudioCaptions, A = window.StudioAudio, U = S.ui;
  const { h, ic, hydrateIcons, toast, sec, row, full, more, label, num, selectCtl, seg, toggle, colorCtl, fontCtl, weightCtl, modal, closeModal, download } = U;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private window */ } },
  };
  const fmt = ms => { const t = Math.max(0, ms / 1000), m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
  const plainSel = (opts, v, on, aria) => { const s = h('select.sel', { 'aria-label': aria || '', onchange: e => on(e.target.value) }, opts.map(([k, l]) => h('option', { value: k }, l))); s.value = v; return s; };

  /* ── what can be listened to ── */
  const isVideo = e => e && e.type === 'image' && e.assetId && R.isVideoAsset(e.assetId);
  function sources() {
    const doc = S.doc, out = [];
    if (A.sources(doc).length) out.push([{ kind: 'mix' }, 'All the sound in this design']);
    let n = 0;
    for (const e of doc.elements) if (isVideo(e)) { n++; out.push([{ kind: 'el', id: e.id }, (e.name || (e.clip ? 'Clip ' : 'Video ') + n) + (e.video && e.video.mute ? ' (muted)' : '')]); }
    for (const a of doc.audio || []) out.push([{ kind: 'audio', id: a.id }, (a.voice ? 'Voiceover · ' : '') + (a.name || 'Sound')]);
    return out;
  }
  const srcKey = s => JSON.stringify(s || { kind: 'mix' });
  function defaultSource(want) {
    const all = sources();
    if (want && all.some(s => srcKey(s[0]) === srcKey(want))) return want;
    // one video and nothing else: follow that video (its own trim / loops); otherwise the whole mix
    const vids = all.filter(s => s[0].kind === 'el'), tracks = all.filter(s => s[0].kind === 'audio');
    if (vids.length === 1 && !tracks.length && !S.isVideoEdit()) return vids[0][0];
    return all.length ? all[0][0] : null;
  }

  /* ── style tiles: a sample phrase in each look ── */
  const SAMPLE = 'Stay close to what matters';
  function sampleEl(style, aspect) {
    const at = [100, 350, 650, 850, 1100], H = 640, W = Math.round(H * aspect);
    // bigger type than on a real canvas, so a look reads at tile size
    const st = Object.assign({}, style, { scale: (style.scale || 1) * 1.45, size: (style.size || 0.055) * 2 });
    return { id: 'cap-sample', type: 'captions', x: 0, y: 0, width: W, height: H,
      cap: { src: { kind: 'mix' }, cues: [{ start: 0, end: 2600, lang: 'en', text: SAMPLE, en: SAMPLE, words: at, timedText: SAMPLE }], style: st, edits: {} } };
  }
  const tileCache = new Map();
  function styleTile(id, name, style, on, onPick) {
    const aspect = clamp(S.doc.width / S.doc.height, 0.72, 1.8), tw = 104, th = Math.round(tw / aspect);
    const c = h('canvas.cap-tile-c'); const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(tw * dpr); c.height = Math.round(th * dpr); c.style.width = tw + 'px'; c.style.height = th + 'px';
    const paint = () => {
      const el = sampleEl(style, aspect), x = c.getContext('2d'), s = c.width / el.width;
      const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, '#4a5866'); g.addColorStop(1, '#1d2329');
      x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      x.save(); x.scale(s, s);
      if (style.blend && style.blend !== 'normal') x.globalCompositeOperation = C.BLEND_OP[style.blend] || 'source-over';
      try { C.draw(x, el, { time: 2.2, doc: { elements: [el], anim: { duration: 3 } } }); } catch (e) { /* font still loading */ }
      x.restore();
    };
    const key = id + '|' + aspect.toFixed(2);
    paint();
    if (!tileCache.has(key)) tileCache.set(key, Promise.all(C.fontsOf(sampleEl(style, aspect)).map(([f, w, i]) => window.StudioFonts.ensure(f, w, i))).catch(() => {}));
    tileCache.get(key).then(() => requestAnimationFrame(paint));
    return h('button.cap-tile' + (on ? '.on' : ''), { type: 'button', title: name, onclick: onPick }, c, h('span', null, name));
  }

  /* ── the Auto captions dialog ── */
  let job = null;
  const KEY = 'studio.captions.geminiKey', PREFS = 'studio.captions.prefs';
  S.openCaptions = function (o = {}) {
    const all = sources();
    if (!all.length) { toast('Add a video or some sound first — captions are made from what’s said in it'); return; }
    const p = Object.assign({ engine: 'local', model: 'base', lang: '', translate: '', gmodel: S.GEMINI_MODELS[0][0], preset: 'poster' }, store.get(PREFS, {}));
    const target = o.el || null;
    let src = defaultSource(o.src || (target && target.cap.src));
    const box = h('div.cap-dialog');
    const draw = () => {
      const local = p.engine === 'local';
      const status = h('div.cap-status', { hidden: true }, h('div.cap-bar', null, h('i')), h('span', null, ''));
      const keyInp = h('input.sel', { type: 'password', placeholder: 'Paste your Gemini API key', value: store.get(KEY, ''), autocomplete: 'off', spellcheck: false, oninput: e => store.set(KEY, e.target.value.trim()) });
      const go = h('button.btn.primary', { type: 'button', onclick: () => run(status, go, keyInp.value.trim()) }, target ? 'Transcribe again' : 'Make captions');
      const srt = h('input', { type: 'file', accept: '.srt,.vtt,text/plain', hidden: true, onchange: e => { const f = e.target.files[0]; if (f) importSrt(f, target); closeModal(); } });
      box.replaceChildren(
        h('h1', { style: { fontSize: '20px' } }, target ? 'Transcribe again' : 'Auto captions'),
        h('p.lead', null, 'Listens to the sound and writes down what’s said, each word timed to the moment it’s spoken.'),
        row('Listen to', plainSel(all.map(([s, l]) => [srcKey(s), l]), srcKey(src), v => { src = JSON.parse(v); }, 'What to listen to')),
        row('Words by', h('div.seg', null, [['local', 'This computer'], ['gemini', 'Gemini']].map(([k, l]) =>
          h('button' + (p.engine === k ? '.on' : ''), { type: 'button', onclick: () => { p.engine = k; store.set(PREFS, p); draw(); } }, l)))),
        ...(local ? [
          row('Accuracy', plainSel(S.LOCAL_MODELS.map(m => [m[0], `${m[1]} · ${m[3]} download`]), p.model, v => { p.model = v; store.set(PREFS, p); }, 'Accuracy')),
          h('p.hint', null, 'Free and private: nothing leaves this computer. The speech model downloads once, then it’s kept.'),
        ] : [
          row('API key', keyInp),
          h('p.hint', null, 'Better with many languages, songs and translations. Uses your own key from ', h('a', { href: 'https://aistudio.google.com/apikey', target: '_blank', rel: 'noopener' }, 'aistudio.google.com'), ' — it stays in this browser and is never saved in projects. The sound is sent to Google.'),
          row('Model', plainSel(S.GEMINI_MODELS, p.gmodel, v => { p.gmodel = v; store.set(PREFS, p); }, 'Gemini model')),
          row('Translate to', plainSel([['', 'No translation'], ...S.CAPTION_LANGS], p.translate, v => { p.translate = v; store.set(PREFS, p); }, 'Translate to')),
        ]),
        row('Language', plainSel([['', 'Find it myself'], ...S.CAPTION_LANGS], p.lang, v => { p.lang = v; store.set(PREFS, p); }, 'Language spoken')),
        ...(target ? [] : [label('Look'), h('div.cap-tiles.small', null, C.PRESETS.map(([id, name, st]) => styleTile(id, name, Object.assign({}, C.DEFAULT_STYLE, st), p.preset === id, () => { p.preset = id; store.set(PREFS, p); draw(); })))]),
        status,
        h('div.btn-row', null,
          target ? null : h('button.btn.ghost', { type: 'button', title: 'Use a subtitle file you already have (.srt)', onclick: () => srt.click() }, ic('upload'), 'Open .srt'), srt,
          h('span', { style: { flex: 1 } }),
          h('button.btn', { type: 'button', onclick: () => { if (job) job.abort(); job = null; closeModal(); } }, 'Cancel'), go));
      hydrateIcons(box);
    };
    async function run(status, go, key) {
      if (p.engine === 'gemini' && !key) { toast('Paste a Gemini API key first, or pick “This computer”'); return; }
      if (job) job.abort();
      const ctrl = new AbortController(); job = ctrl;
      status.hidden = false; go.disabled = true;
      const bar = status.querySelector('i'), txt = status.querySelector('span');
      const say = (t, v) => { txt.textContent = t; bar.style.width = v == null ? '' : Math.round(clamp(v, 0, 1) * 100) + '%'; status.classList.toggle('busy', v == null); };
      const t0 = performance.now(); let heard = 0;
      const tick = setInterval(() => { if (/^Listening/.test(txt.textContent)) txt.textContent = `Listening… ${Math.round((performance.now() - t0) / 1000)}s` + (heard ? ` · ${heard} lines` : ''); }, 1000);
      try {
        const res = await S.transcribe({
          src, engine: p.engine, model: p.engine === 'local' ? p.model : p.gmodel, key, language: p.lang, translate: p.translate, signal: ctrl.signal,
          style: target ? C.style(target) : C.preset(p.preset),
          onProgress: (k, v) => {
            if (ctrl.signal.aborted) return;
            if (k === 'sound') say('Reading the sound…', null);
            else if (k === 'download') say(`Getting the speech model… ${Math.round(v * 100)}%`, v);
            else if (k === 'upload') say('Sending the sound to Gemini…', null);
            else if (k === 'listen') { heard = v || heard; say('Listening…', null); }
            else if (k === 'align') say('Timing every word…', null);
          },
        });
        if (ctrl.signal.aborted) return;
        if (!res.cues.length) { say('No words heard in that sound. Try another source, or Gemini for songs.', 0); go.disabled = false; return; }
        closeModal();
        if (target) {
          S.changeEl(target, e => { e.cap.cues = res.cues; e.cap.src = src; e.cap.edits = {}; });
          S.commit(); S.select([target.id]);
          toast(`Transcribed again — ${res.cues.length} lines`);
        } else addCaptions(res.cues, src, C.preset(p.preset));
      } catch (e) {
        if (ctrl.signal.aborted) return;
        console.error(e);
        say(e && e.message ? e.message : 'That didn’t work', 0); go.disabled = false;
      } finally { clearInterval(tick); if (job === ctrl) job = null; }
    }
    modal(box);
    draw();
  };

  // a captions layer over the whole canvas, on top
  function addCaptions(cues, src, style) {
    const doc = S.doc;
    const made = S.mk('captions', { x: 0, y: 0, width: doc.width, height: doc.height, name: style.template === 'classic' ? 'Subtitles' : 'Captions',
      blend: style.blend && style.blend !== 'normal' ? C.BLEND_OP[style.blend] : 'normal', cap: { src, cues, style, edits: {} } });
    const el = S.addElement(made, { center: false });
    S.select([el.id]);
    if (style.behind) findPeople(el);
    toast(`Captions added — ${cues.length} line${cues.length === 1 ? '' : 's'}. Pick a look and fix any word in the inspector.`, { label: 'Undo', run: () => S.undo && S.undo() });
    const first = C.designS(el, cues[0].start, doc);
    if (S.seek && (R.playTime == null || R.playTime < first)) S.seek(first + 0.6);
    return el;
  }
  S.addCaptions = addCaptions;
  // subtitle file: times are design times
  async function importSrt(file, target) {
    const cues = C.clean(C.fromSrt(await file.text()), Infinity);
    if (!cues.length) { toast('No subtitles found in that file'); return; }
    let el = target;
    if (el) { S.changeEl(el, e => { e.cap.cues = cues; e.cap.src = { kind: 'mix' }; e.cap.edits = {}; }); S.commit(); }
    else el = addCaptions(cues, { kind: 'mix' }, C.preset('sub-box'));
    if (A.sources(S.doc).length) retime(el, { quiet: true });
  }

  /* ── re-timing words after edits ── */
  let retiming = null;
  async function retime(el, o = {}) {
    const src = el.cap.src || { kind: 'mix' };
    if (retiming) return retiming;
    retiming = (async () => {
      try {
        let cache = S.captionAudioCache;
        if (!cache || cache.src !== srcKey(src)) {
          if (!o.quiet) toast('Listening again to time the words…');
          const a = await S.captionAudio(src);
          cache = S.captionAudioCache = { src: srcKey(src), pcm: a.pcm, off: Math.round(a.offset * 1000), lp: null };
        }
        const r = await S.alignCues(el.cap.cues, C.style(el), cache.pcm, cache.off, cache.lp);
        cache.lp = r.lp || cache.lp;
        S.changeEl(el, e => { e.cap.cues = r.cues; });
        S.commit();
        if (!o.quiet) toast(`Words timed — ${r.aligned} of ${el.cap.cues.length} lines`);
      } catch (e) { console.error(e); if (!o.quiet) toast('Couldn’t time the words: ' + (e.message || e)); }
      finally { retiming = null; }
    })();
    return retiming;
  }
  S.retimeCaptions = retime;

  /* ── the person, for words set behind them ── */
  function findPeople(el, force) {
    const below = [];
    for (const e of S.doc.elements) { if (e.id === el.id) break; if (e.type === 'image' && e.assetId && !e.hidden && (force || !R.hasSubject(e))) below.push(e); }
    if (!below.length) return;
    if (!S.findSubject) return;
    toast('Finding the person so words can go behind them…');
    Promise.all(below.map(e => S.findSubject(e, { people: true }).catch(err => console.warn(err)))).then(() => { R.requestRedraw(); U.renderInspector(); });
  }

  /* ── the inspector ── */
  let selWord = null;     // { el, id } — a word picked on the canvas or in the transcript
  const P = k => 'cap.style.' + k;
  const setStyle = (k, v, live) => S.change('sel', P(k), v, live);
  function applyPreset(el, id) {
    const keep = { seed: C.style(el).seed, show: C.style(el).show, second: C.style(el).second }, st = Object.assign(C.preset(id), keep);
    S.changeEl(el, e => { e.cap.style = st; e.blend = st.blend && st.blend !== 'normal' ? C.BLEND_OP[st.blend] : 'normal'; });
    S.commit();
    if (st.behind) findPeople(el);
    U.renderInspector();
  }
  function lookSection(el) {
    const st = C.style(el), classic = st.template === 'classic';
    const tiles = h('div.cap-tiles', null, C.PRESETS.map(([id, name, s]) => styleTile(id, name, Object.assign({}, C.DEFAULT_STYLE, s, { seed: st.seed }), st.preset === id, () => applyPreset(el, id))));
    const langs = (el.cap.cues || []).some(c => c.tr) ? [['spoken', 'As spoken'], ['en', 'English'], ['tr', 'Translation']] : (el.cap.cues || []).some(c => c.en && c.en !== c.text) ? [['spoken', 'As spoken'], ['en', 'English']] : null;
    const relayout = v => { setStyle('template', v, false); U.renderInspector(); };
    return sec('Captions', [
      full(tiles),
      row('Layout', selectCtl('sel', P('template'), C.TEMPLATES.map(t => [t[0], t[1]]), { def: 'scatter', set: relayout })),
      h('p.hint', null, (C.TEMPLATES.find(t => t[0] === st.template) || [])[2] || ''),
      classic ? null : row('Entrance', selectCtl('sel', P('anim'), C.ANIMS, { def: 'blur' })),
      classic ? null : row('Size', num('sel', P('scale'), { min: 40, max: 220, scale: 100, unit: '%', slider: true, def: 1, step: 5 })),
      classic ? null : row('Arrangement', h('button.btn.small', { type: 'button', title: 'Shuffle where words land and which go behind', onclick: () => { setStyle('seed', (st.seed || 0) + 1, false); } }, ic('shuffle'), 'Shuffle')),
      classic ? null : toggle('sel', P('behind'), 'Some words go behind the person', { set: v => { setStyle('behind', v, false); if (v) findPeople(el); U.renderInspector(); } }),
      classic ? [
        row('Size', num('sel', P('size'), { min: 20, max: 120, scale: 1000, slider: true, def: 0.055 })),
        row('Height', num('sel', P('y'), { min: 5, max: 95, scale: 100, unit: '%', slider: true, def: 0.86 })),
        row('Align', seg('sel', P('align'), [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']])),
        row('Background', seg('sel', P('back'), C.BACKS, { set: v => { setStyle('back', v, false); U.renderInspector(); } })),
        st.back === 'box' || st.back === 'outline' ? row(st.back === 'box' ? 'Box colour' : 'Outline', colorCtl('sel', P('backColor'), { def: '#000000' })) : null,
        st.back === 'box' ? row('Box opacity', num('sel', P('backOpacity'), { min: 0, max: 100, scale: 100, unit: '%', slider: true, def: 0.6 })) : null,
      ] : null,
      langs ? row('Show', seg('sel', P('show'), langs)) : null,
      classic && langs ? row('Second line', selectCtl('sel', P('second'), [['', 'None'], ...langs.filter(l => l[0] !== st.show)], { def: '', set: v => setStyle('second', v || null, false) })) : null,
    ], true, { key: 'cap-look' });
  }
  function typeSection(el) {
    const st = C.style(el), classic = st.template === 'classic';
    const fxOn = st.effect && st.effect !== 'none';
    return sec('Type', [
      row('Font', fontCtl('sel', P('font'), P('weight'))),
      row('Weight', weightCtl('sel', P('font'), P('weight'))),
      classic ? null : row('Accent font', fontCtl('sel', P('accent'))),
      row('Colour', colorCtl('sel', P('color'), { def: '#ffffff' })),
      classic ? null : row(st.template === 'highlight' ? 'Word said' : 'Highlight', colorCtl('sel', P('accentColor'), { def: '#ffe14d' })),
      classic ? null : row('Effect', selectCtl('sel', P('effect'), C.EFFECTS, { def: 'none', set: v => { setStyle('effect', v, false); U.renderInspector(); } })),
      !classic && fxOn ? row('Amount', num('sel', P('effectAmount'), { min: 0, max: 100, scale: 100, unit: '%', slider: true, def: 0.5 })) : null,
      !classic && fxOn && st.effect !== 'blur' ? row('Effect colour', colorCtl('sel', P('effectColor'), { def: st.effect === 'glow' ? st.color : '#000000' })) : null,
      more('cap-type', [row('Spacing', num('sel', P('tracking'), { min: -10, max: 40, scale: 100, slider: true, def: 0 }))]),
    ], true, { key: 'cap-type' });
  }
  // the transcript: one box per line, a click on the time jumps there
  function wordsSection(el) {
    const st = C.style(el), field = st.show === 'en' ? 'en' : st.show === 'tr' ? 'tr' : 'text';
    const cues = el.cap.cues || [];
    let timer = null;
    const list = h('div.cap-cues', null, cues.map((c, i) => {
      const ta = h('textarea.txt.cap-cue', { rows: 1, spellcheck: true, 'aria-label': 'Line ' + (i + 1) });
      ta.value = C.shownText(c, st);
      const grow = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
      ta.addEventListener('input', () => {
        grow();
        S.changeEl(el, e => { const q = e.cap.cues[i]; q[field] = ta.value; if (field !== 'text' && !q.text) q.text = ta.value; }, true);
        clearTimeout(timer); timer = setTimeout(() => { S.commit(); retime(el, { quiet: true }); }, 1200);
      });
      ta.addEventListener('keydown', e => e.stopPropagation());
      ta.addEventListener('focus', () => S.seek && S.seek(C.designS(el, c.start, S.doc) + 0.05));
      requestAnimationFrame(grow);
      return h('div.cap-cue-row', null,
        h('button.cap-time', { type: 'button', title: 'Go to this line', onclick: () => S.seek && S.seek(C.designS(el, c.start, S.doc) + 0.05) }, fmt(C.designS(el, c.start, S.doc) * 1000)),
        ta,
        h('button.icon-btn.cap-x', { type: 'button', title: 'Remove this line', onclick: () => { S.changeEl(el, e => { e.cap.cues.splice(i, 1); e.cap.edits = {}; }); S.commit(); U.renderInspector(); } }, ic('x')));
    }));
    const srt = h('input', { type: 'file', accept: '.srt,.vtt,text/plain', hidden: true, onchange: e => { const f = e.target.files[0]; if (f) importSrt(f, el); e.target.value = ''; } });
    return sec('Words', [
      h('div.cap-actions', null,
        h('button.btn.small', { type: 'button', title: 'Transcribe the sound again', onclick: () => S.openCaptions({ el }) }, ic('mic'), 'Again'),
        h('button.btn.small', { type: 'button', title: 'Time every word to the sound again', onclick: () => retime(el) }, ic('timeline'), 'Re-time'),
        h('button.btn.small', { type: 'button', title: 'Save the captions as a subtitle file (.srt)', onclick: () => download(new Blob([C.toSrt(el, S.doc)], { type: 'application/x-subrip' }), (S.docName || 'captions').replace(/[^\w\- ]+/g, '').trim() + '.srt') }, ic('download'), '.srt'),
        h('button.btn.small', { type: 'button', title: 'Replace these with a subtitle file (.srt)', onclick: () => srt.click() }, ic('upload'), 'Open'), srt),
      cues.length ? list : h('p.hint', null, 'No lines yet.'),
      h('p.hint', null, st.template === 'classic' ? 'Fix a word and its line is timed again by itself.' : 'Fix a word and its line is timed again by itself. Click a word on the canvas to move, resize or recolour just that word.'),
    ], true, { key: 'cap-words' });
  }
  // one word picked on the canvas
  function wordSection(el) {
    if (!selWord || selWord.el !== el.id || C.style(el).template === 'classic') return null;
    const id = selWord.id, pl = C.wordPlace(el, id);
    if (!pl) { selWord = null; return null; }
    const ed = () => Object.assign({}, (el.cap.edits || {})[id]);
    const put = (patch, live) => { S.changeEl(el, e => { e.cap.edits = Object.assign({}, e.cap.edits); e.cap.edits[id] = Object.assign({ text: pl.word.text }, e.cap.edits[id], patch); }, live); if (!live) S.commit(); };
    const base = (() => { const keep = (el.cap.edits || {})[id]; if (!keep) return pl; const e2 = Object.assign({}, el, { cap: Object.assign({}, el.cap, { edits: {} }) }); return C.wordPlace(e2, id) || pl; })();
    return sec('Word · “' + pl.word.text + '”', [
      row('Size', num('sel', null, { get: () => (ed().size ?? base.size) / base.size, set: (v, live) => put({ size: base.size * v }, live), min: 20, max: 400, scale: 100, unit: '%', slider: true, step: 5 })),
      row('Across', num('sel', null, { get: () => ed().x ?? base.x, set: (v, live) => put({ x: v }, live), min: 0, max: 100, scale: 100, unit: '%', slider: true })),
      row('Down', num('sel', null, { get: () => ed().y ?? base.y, set: (v, live) => put({ y: v }, live), min: 0, max: 100, scale: 100, unit: '%', slider: true })),
      row('Colour', h('div.ctl', null, swatch(() => ed().color || base.color, (v, live) => put({ color: v }, live)))),
      row('Font', plainSel([['', 'As the others'], ...[...new Set([C.style(el).font, C.style(el).accent, 'Instrument Serif', 'Inter Tight', 'Anton', 'Playfair Display', 'Caveat', 'Courier Prime', 'Bebas Neue'])].map(f => [f, f])], ed().font || '', v => { put({ font: v || undefined }); U.renderInspector(); }, 'Font')),
      row('Entrance', plainSel([['', 'As the others'], ...C.ANIMS], ed().anim || '', v => put({ anim: v || undefined }), 'Entrance')),
      C.style(el).behind || S.doc.elements.some(e => e.type === 'image' && R.hasSubject(e)) ? row('Depth', h('div.seg', null, [['', 'Auto'], ['front', 'In front'], ['behind', 'Behind']].map(([k, l]) =>
        h('button' + ((ed().depth || '') === k ? '.on' : ''), { type: 'button', onclick: () => { put({ depth: k || undefined }); if (k === 'behind') findPeople(el); U.renderInspector(); } }, l)))) : null,
      h('div.btn-row', null,
        h('button.btn.small', { type: 'button', onclick: () => { S.changeEl(el, e => { e.cap.edits = Object.assign({}, e.cap.edits); delete e.cap.edits[id]; }); S.commit(); U.renderInspector(); } }, 'Reset word'),
        h('button.btn.small', { type: 'button', onclick: () => { selWord = null; U.renderInspector(); } }, 'Done')),
    ], true, { key: 'cap-word', collapsible: false });
  }
  function swatch(get, set) {
    const b = h('button.swatch-btn', { type: 'button' }, h('span.sw', null, h('span', { style: { background: get() } })), h('code', null, String(get()).toUpperCase()));
    b.addEventListener('click', () => U.colorPopover(b, get(), (v, live) => { set(v, live); b.querySelector('.sw span').style.background = v; b.querySelector('code').textContent = String(v).toUpperCase(); }));
    return b;
  }
  S.captionsInspector = function (el) {
    if (!el.cap) return [];
    return [wordSection(el), lookSection(el), typeSection(el), wordsSection(el)];
  };
  S.on('selection', () => { const e = S.selEls()[0]; if (!e || e.type !== 'captions' || (selWord && selWord.el !== e.id)) selWord = null; });

  // a click on a word of the selected captions picks that word
  if (S.stage) S.stage.on('click tap', () => {
    const els = S.selEls(), el = els[0];
    if (els.length !== 1 || !el || el.type !== 'captions' || C.style(el).template === 'classic') return;
    const n = S.stage.findOne('#' + el.id); if (!n) return;
    const p = n.getRelativePointerPosition(); if (!p) return;
    const hit = C.boxesAt(el, R.playTime, S.doc).find(b => b.wordId && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
    const next = hit ? { el: el.id, id: hit.wordId } : null;
    if ((next && next.id) !== (selWord && selWord.id)) { selWord = next; U.renderInspector(); }
  });

  /* ── ways in ── */
  const linked = e => S.doc.elements.find(c => c.type === 'captions' && c.cap && c.cap.src && c.cap.src.kind === 'el' && c.cap.src.id === e.id);
  U.addSection('el', el => {
    if (!isVideo(el)) return null;
    const cap = linked(el);
    return sec('Captions', [
      h('p.hint', null, cap ? 'This video has captions.' : 'Write down what’s said in this video, word by word, in a look you pick.'),
      full(cap ? h('button.btn', { type: 'button', onclick: () => S.select([cap.id]) }, ic('type'), 'Edit its captions')
        : h('button.btn', { type: 'button', onclick: () => S.openCaptions({ src: { kind: 'el', id: el.id } }) }, ic('captions'), 'Auto captions')),
    ], false, { key: 'cap-from' });
  });
  U.addSection('doc', () => {
    if (!A.sources(S.doc).length) return null;
    const caps = S.doc.elements.filter(e => e.type === 'captions');
    return sec('Captions', [
      full(caps.length ? h('button.btn', { type: 'button', onclick: () => S.select([caps[0].id]) }, ic('type'), 'Edit captions')
        : h('button.btn', { type: 'button', onclick: () => S.openCaptions() }, ic('captions'), 'Auto captions from the sound')),
    ], false, { key: 'cap-doc' });
  });
  // the Text panel card
  S.captionsShelf = function () {
    return h('div.shelf', null,
      h('div.shelf-head', null, h('h3', null, 'Auto captions')),
      h('button.cap-card', { type: 'button', onclick: () => S.openCaptions() },
        h('span.cap-card-demo', null, h('b', null, 'every'), h('i', null, ' word'), h('span', null, ' as it’s said')),
        h('span.cap-card-txt', null, 'Subtitles and word captions from the sound of your video, music or voiceover')));
  };
})();
