/* Savio's editor — the Sounds panel: the library (recordings, designed effects and music beds, sfx.js) by category, your own
   sound files, previews, and one-click sound for every transition / entrance of a design. */
(function () {
  'use strict';
  const S = window.Studio, R = window.StudioRender, X = window.StudioSfx, U = S.ui;
  const { h, ic, hydrateIcons, toast, panelHead, searchBox } = U;
  let cat = 'all', q = '';
  const fmt = d => (d >= 60 ? Math.floor(d / 60) + ':' + String(Math.round(d % 60)).padStart(2, '0') : d < 10 ? d.toFixed(1) + 's' : Math.round(d) + 's');
  const now = () => (R.playTime == null ? 0 : R.playTime);

  /* previews: one at a time */
  let player = null, playing = null;
  function stopPreview() { if (player) { player.pause(); player = null; } playing = null; for (const b of document.querySelectorAll('.snd-row.playing')) b.classList.remove('playing'); }
  async function preview(id, row) {
    if (playing === id) { stopPreview(); return; }
    stopPreview();
    playing = id; row.classList.add('playing', 'busy');
    const ok = /^sfx-/.test(id) ? await S.ensureSound(id) : !!S.assets[id];
    row.classList.remove('busy');
    if (!ok || playing !== id) return;
    player = new Audio(S.assets[id]);
    player.onended = () => { if (playing === id) stopPreview(); };
    player.play().catch(() => stopPreview());
  }
  S.on('playstate', on => { if (on) stopPreview(); });

  /* adding */
  // a library sound at the playhead (music from the start, looping to the end of a video edit)
  async function addLib(s, at) {
    const id = 'sfx-' + s.id;
    if (!(await S.ensureSound(id))) { toast('Couldn’t make that sound in this browser'); return; }
    const music = s.cat === 'music', edit = S.isVideoEdit();
    const t = at != null ? at : music ? 0 : now();
    // effects line their loudest moment up with the playhead
    const start = Math.max(0, t - (music ? 0 : s.peak || 0));
    const tr = S.addSound(id, { name: s.name, duration: s.dur, at: start, loop: music ? edit : !!s.loop, keepLength: !music || edit, volume: music ? 0.7 : 0.9, fadeOut: music || s.loop ? 1.5 : 0, sfx: s.id });
    if (S.openTimeline) S.openTimeline();
    toast(`Added “${s.name}”` + (music ? (edit ? ' — it loops to the end of the video' : '') : ` at ${t.toFixed(1)}s`), { label: 'Undo', run: () => S.removeSound(tr.id) });
  }
  S.addLibrarySound = addLib;
  // replace earlier automatic sounds of the same kind, then add one per moment
  function autoSounds(kind, moments) {
    const doc = S.doc;
    doc.audio = (doc.audio || []).filter(a => a.auto !== kind);
    let n = 0;
    for (const m of moments) {
      const s = X.get(m.sfx);
      if (!s) continue;
      S.ensureSound('sfx-' + s.id);
      doc.audio.push({ id: 'au' + Math.random().toString(36).slice(2, 9), assetId: 'sfx-' + s.id, name: s.name, start: Math.max(0, m.t - (s.peak || 0)), trim: 0, end: 0, dur: s.dur, volume: m.volume ?? 0.75, fadeIn: 0, fadeOut: 0, loop: false, mute: false, sfx: s.id, auto: kind });
      n++;
    }
    S.commit(); S.emit('doc');
    if (S.openTimeline && n) S.openTimeline();
    return n;
  }
  // a whoosh (or the effect that fits) on every transition and cut of a video edit
  S.soundTransitions = function () {
    const clips = S.clips(), ms = [];
    clips.forEach((el, i) => {
      if (!i) return;
      const tr = el.clip.trans, type = tr && tr.type && tr.type !== 'none' ? tr.type : 'cut';
      ms.push({ t: el.time.start + (el.clip._in || 0) / 2, sfx: X.FOR_TRANSITION[type] || 'swish', volume: type === 'cut' ? 0.55 : 0.75 });
    });
    const n = autoSounds('trans', ms);
    toast(n ? `${n} transition sound${n > 1 ? 's' : ''} added — on their own sound track` : 'Add a second clip first');
  };
  // a pop / swish / typing sound on every layer that animates in
  S.soundEntrances = function () {
    const ms = [];
    for (const el of S.doc.elements) {
      const en = el.anim && el.anim.enter;
      if (!en || en === 'none' || el.hidden || el.clip) continue;
      const sfx = X.FOR_ENTRANCE[en];
      if (!sfx) continue;
      ms.push({ t: ((el.time && el.time.start) || 0) + (el.anim.delay || 0) + 0.05, sfx, volume: 0.6 });
    }
    const n = autoSounds('enter', ms);
    toast(n ? `${n} entrance sound${n > 1 ? 's' : ''} added` : 'Nothing animates in yet — give layers an entrance under Motion');
  };

  /* the panel */
  function row(s) {
    const id = s.lib ? 'sfx-' + s.id : s.id;
    const play = h('button.snd-play', { type: 'button', title: 'Preview', 'aria-label': 'Preview ' + s.name }, ic('play'));
    const r = h('div.snd-row', { draggable: 'true', title: s.lib ? 'Click to add at the playhead · drag onto the timeline' : 'Click to add at the playhead' },
      play,
      h('div.snd-name', null, h('b', null, s.name), h('small', null, [s.catName, s.dur ? fmt(s.dur) : null, s.bpm ? s.bpm + ' bpm' : null, s.loop ? 'loops' : null].filter(Boolean).join(' · '))),
      h('button.snd-add', { type: 'button', title: 'Add at the playhead', 'aria-label': 'Add ' + s.name }, ic('plus')));
    play.addEventListener('click', e => { e.stopPropagation(); preview(id, r); });
    const add = () => (s.lib ? addLib(s) : (S.addSound(id, { name: s.name, duration: s.dur, at: now() }), S.openTimeline && S.openTimeline()));
    r.addEventListener('click', add);
    r.addEventListener('dragstart', e => { e.dataTransfer.setData('application/x-studio-sound', JSON.stringify({ lib: !!s.lib, id: s.id })); e.dataTransfer.effectAllowed = 'copy'; });
    return r;
  }
  function yours() {
    return S.uploads.filter(id => R.isAudioAsset(id) && S.assets[id]).map(id => {
      const b = S.assetBlob(id), tr = (S.doc.audio || []).find(a => a.assetId === id);
      return { id, name: (b && b.name ? b.name.replace(/\.[^.]+$/, '') : tr && tr.name) || 'Sound', dur: tr ? tr.dur : 0, catName: 'Yours' };
    });
  }
  function panel() {
    const catName = Object.fromEntries(X.CATS);
    const lib = X.LIST.map(s => Object.assign({ lib: true, catName: catName[s.cat] }, s));
    const list = h('div.snd-list-panel');
    const chips = h('div.chips.scroll');
    const draw = () => {
      const qq = q.trim().toLowerCase();
      const match = s => !qq || (s.name + ' ' + (s.tags || '') + ' ' + s.catName).toLowerCase().includes(qq);
      const groups = cat === 'yours' ? [['Your sounds', yours()]] : (cat === 'all' ? X.CATS : X.CATS.filter(([k]) => k === cat)).map(([k, l]) => [l, lib.filter(s => s.cat === k)]);
      if (cat === 'all') groups.unshift(['Your sounds', yours()]);
      const kids = [];
      for (const [title, items] of groups) {
        const m = items.filter(match);
        if (!m.length) continue;
        kids.push(h('div.snd-head', null, title, h('small', null, m.length)), ...m.map(row));
      }
      if (!kids.length) kids.push(h('p.hint', null, cat === 'yours' ? 'Sound files you add show up here.' : 'No sounds match.'));
      list.replaceChildren(...kids);
      hydrateIcons(list);
    };
    const drawChips = () => chips.replaceChildren(...[['all', 'All'], ...X.CATS, ['yours', 'Yours']].map(([k, l]) => h('button.chip' + (cat === k ? '.on' : ''), { type: 'button', onclick: () => { cat = k; drawChips(); draw(); } }, l)));
    drawChips(); draw();
    const upload = h('input', { type: 'file', accept: 'audio/*,.mp3,.m4a,.wav,.ogg,.opus,.flac,.aac', multiple: true, hidden: true });
    upload.addEventListener('change', () => { if (upload.files.length) S.importFiles([...upload.files], { soundAt: now() < 0.1 ? 0 : now() }); upload.value = ''; });
    const edit = S.isVideoEdit();
    const auto = h('div.snd-auto', null,
      h('button.btn.grow', { type: 'button', title: 'A whoosh, swish or hit that fits each transition and cut', disabled: !edit || S.clips().length < 2, onclick: () => S.soundTransitions() }, ic('scissors'), 'Every transition'),
      h('button.btn.grow', { type: 'button', title: 'A pop, swish or typing sound for every layer that animates in', onclick: () => S.soundEntrances() }, ic('sparkle'), 'Every entrance'));
    const search = searchBox('Search sounds — whoosh, typing, rain, jazz…', v => { q = v; draw(); });
    return [panelHead('Sounds'), search, chips,
      h('div.btn-row.snd-top', null,
        h('button.btn.grow', { type: 'button', onclick: () => upload.click() }, ic('upload'), 'Upload sound'),
        h('button.btn.grow', { type: 'button', title: 'Record a voiceover from the playhead', onclick: () => { if (S.openTimeline) S.openTimeline(); document.querySelector('.vtl-btn[title^="Record"]')?.click(); } }, ic('mic'), 'Record')),
      h('div.sub-label', null, 'Sound for every…'), auto,
      h('p.hint', null, 'Real recordings (BigSoundBank, CC0) and sounds made in the app — free to use anywhere. Effects line up their loudest moment with the playhead; ambiences loop.'),
      list, upload];
  }
  U.registerPanel('sounds', 'Sounds', panel);
  S.on('uploads', () => { if (U.tab === 'sounds') U.renderPanel(); });
})();
