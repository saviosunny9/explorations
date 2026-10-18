/* Savio's editor — the video timeline.
   A multi-track editor under the canvas, like the ones in video apps: the main video track (clips one after another,
   with the transitions between them), lanes above it for timed text and layers, and sound lanes below for music and
   voiceovers. Drag a clip to reorder it, drag its edges to trim, split at the playhead (S), drop files to add them.
   The clip logic lives in clips.js, sound in audio.js; this file is the UI. */
(function () {
  'use strict';
  const S = window.Studio, R = window.StudioRender, A = window.StudioAudio, U = S.ui;
  const { h, ic, hydrateIcons, toast, num, row, sec, full, toggle, more } = U;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const LAB = 76;           // label column
  const MIN_H = 150, DEF_H = 236;
  const area = document.getElementById('stage-area');

  let open = false, userClosed = false, pps = 0, fitZoom = true, selSound = null, drag = null, raf = 0, height = DEF_H;
  try { height = clamp(+localStorage.getItem('studio.vtlHeight') || DEF_H, MIN_H, 520); } catch (e) { /* storage blocked */ }
  Object.defineProperty(S, 'vtlOpen', { get: () => open });

  const fmt = t => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
  const D = () => Math.max(0.5, S.doc.anim.duration || 5);
  const now = () => (R.playTime == null ? 0 : R.playTime);
  const tx = t => LAB + t * pps;

  /* ── DOM ── */
  const root = h('div.vtl', { hidden: true });
  const grip = h('div.vtl-grip', { title: 'Drag to resize the timeline' });
  const playBtn = h('button.vtl-play', { type: 'button', title: 'Play / pause (P)', onclick: () => (S.isPlaying() ? S.pause() : S.play()) }, ic('play'));
  const timeEl = h('span.vtl-time');
  const zoomIn = h('input.vtl-zoom', { type: 'range', min: 0, max: 100, value: 0, 'aria-label': 'Timeline zoom', oninput: e => setZoom(+e.target.value) });
  const btn = (icon, title, run, label) => h('button.vtl-btn', { type: 'button', title, 'aria-label': title, onclick: run }, ic(icon), label ? h('span', null, label) : null);
  const recBtn = btn('mic', 'Record a voiceover from the playhead', () => toggleRecord(), 'Voice');
  const musicInput = h('input', { type: 'file', accept: 'audio/*,.mp3,.m4a,.wav,.ogg,.opus,.flac,.aac', multiple: true, hidden: true });
  musicInput.addEventListener('change', () => { if (musicInput.files.length) S.importFiles([...musicInput.files], { soundAt: now() < 0.1 ? 0 : now() }); musicInput.value = ''; });
  const bar = h('div.vtl-bar', null,
    playBtn, timeEl, h('span.vtl-sep'),
    btn('scissors', 'Split at the playhead (S)', () => split()),
    btn('copy', 'Duplicate', () => duplicate()),
    btn('trash', 'Delete', () => remove()),
    h('span.vtl-sep'),
    btn('clip', 'Add video clips or photos to the end', () => S.pickClips({}), 'Clips'),
    btn('image', 'Add a video or photo as a layer over the video, from the playhead', () => addLayerMedia(), 'Layer'),
    btn('music', 'Add music or a sound file at the playhead', () => musicInput.click(), 'Music'),
    recBtn,
    btn('type', 'Add a title at the playhead', () => addTitle(), 'Text'),
    h('div.vtl-grow'),
    btn('minus', 'Zoom out', () => setZoom(+zoomIn.value - 12)), zoomIn, btn('plus', 'Zoom in', () => setZoom(+zoomIn.value + 12)),
    btn('fit', 'Fit the whole video', () => { fitZoom = true; render(); }),
    btn('x', 'Close the timeline', () => { userClosed = true; close(); }),
    musicInput);
  const scroll = h('div.vtl-scroll');
  const inner = h('div.vtl-inner');
  const ruler = h('canvas.vtl-ruler');
  const lanes = h('div.vtl-lanes');
  const head = h('div.vtl-head', null, h('span'));
  const pop = h('div.vtl-pop', { hidden: true });
  inner.append(h('div.vtl-rulerrow', null, h('div.vtl-lab'), ruler), lanes, head);
  scroll.append(inner);
  root.append(grip, bar, scroll, pop);
  area.append(root);
  hydrateIcons(root);

  function setOpen(v) {
    open = v;
    root.hidden = !v;
    area.classList.toggle('vtl-open', v);
    area.style.setProperty('--vtl-h', height + 'px');
    S.setStageInset(v ? height : 0);
    if (dockBtn) dockBtn.classList.toggle('on', v);
    S.emit('change');
  }
  function openTl() {
    if (!open) { setOpen(true); if (R.playTime == null) S.seek(0); }
    fitZoom = fitZoom || !pps;
    render();
  }
  function close() { setOpen(false); closePop(); }
  S.openTimeline = () => { userClosed = false; openTl(); };
  S.closeTimeline = close;

  // drag the top edge to make the timeline taller or shorter
  grip.addEventListener('pointerdown', e => {
    e.preventDefault();
    const y0 = e.clientY, h0 = height;
    grip.setPointerCapture(e.pointerId);
    const mv = ev => { height = clamp(h0 - (ev.clientY - y0), MIN_H, Math.min(560, area.clientHeight - 120)); area.style.setProperty('--vtl-h', height + 'px'); S.setStageInset(height); };
    const up = () => { grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); try { localStorage.setItem('studio.vtlHeight', String(height)); } catch (err) { /* ignore */ } };
    grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up);
  });

  function setZoom(v) {
    v = clamp(v, 0, 100);
    zoomIn.value = v;
    const fit = fitPps();
    const keepT = (scroll.scrollLeft + scroll.clientWidth / 2 - LAB) / (pps || 1);
    pps = fit * Math.pow(2, v / 100 * 8);
    fitZoom = v === 0;
    render();
    scroll.scrollLeft = Math.max(0, LAB + keepT * pps - scroll.clientWidth / 2);
  }
  const fitPps = () => Math.max(1, (scroll.clientWidth - LAB - 28) / D());
  scroll.addEventListener('wheel', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    setZoom(+zoomIn.value - Math.sign(e.deltaY) * 6);
  }, { passive: false });

  /* ── what's on the timeline ── */
  // the layers over the video: everything timed (in a video edit, every layer that isn't a clip)
  function overlayItems() {
    const d = S.doc, edit = S.isVideoEdit();
    return d.elements.filter(e => !e.clip && (e.time || edit) && !e.vox && !e.mcut && !e.cutin && !e.layoutSlot)
      .map(e => ({ el: e, want: e.lane, s: (e.time && e.time.start) || 0, e: e.time && e.time.end != null && e.time.end > (e.time.start || 0) ? e.time.end : D() }));
  }
  // tracks: each item keeps its own lane (el.lane / a.lane, 0 = nearest the video track); items without one, or that would
  // overlap another item there, take the next free lane up
  function pack(items) {
    const lanesUsed = [];
    const fits = (k, it) => !(lanesUsed[k] || []).some(([s0, e0]) => it.s < e0 - 1e-6 && it.e > s0 + 1e-6);
    const put = (it, k0) => { let k = Math.max(0, k0 | 0); while (!fits(k, it)) k++; (lanesUsed[k] = lanesUsed[k] || []).push([it.s, it.e]); it.lane = k; };
    const bySt = (a, b) => a.s - b.s;
    for (const it of items.filter(x => x.want != null).sort(bySt)) put(it, it.want);
    for (const it of items.filter(x => x.want == null).sort(bySt)) put(it, 0);
    // empty tracks in between close up
    const used = [...new Set(items.map(it => it.lane))].sort((a, b) => a - b), to = new Map(used.map((l, i) => [l, i]));
    for (const it of items) it.lane = to.get(it.lane);
    return used.length;
  }

  /* ── drawing ── */
  // while something is being dragged only the drag itself redraws (render(true)), so the dragged block stays put
  function schedule() { if (!open || raf) return; raf = requestAnimationFrame(() => { raf = 0; if (drag) { drag.pending = true; return; } render(); }); }
  function render(force) {
    if (!open || (drag && !force)) return;
    const d = S.doc, dur = D();
    if (fitZoom || !pps) { pps = fitPps(); zoomIn.value = 0; }
    const W = Math.max(scroll.clientWidth, LAB + dur * pps + 120);
    inner.style.width = W + 'px';
    drawRuler(W);
    const clips = S.clips(), sel = new Set(S.sel), ov = overlayItems(), ovLanes = ov.length ? pack(ov) : 0;
    const snd = (d.audio || []).map(a => ({ a, want: a.lane, s: a.start || 0, e: A.trackEnd(a, dur) }));
    const auLanes = snd.length ? pack(snd) : 0;
    // tracks are kept closed up, so the numbers stored match the ones shown
    for (const it of ov) if (it.want != null) it.el.lane = it.lane;
    for (const it of snd) if (it.want != null) it.a.lane = it.lane;
    const rows = [];
    // layer tracks, the top one first, plus an empty one to drop or drag new layers onto
    for (let k = ovLanes; k >= 0; k--) {
      const lane = h('div.vtl-track.ov');
      const items = ov.filter(x => x.lane === k);
      for (const it of items) lane.append(overlayBar(it, sel.has(it.el.id)));
      const media = items.some(it => it.el.type === 'image');
      rows.push(h('div.vtl-row.ov' + (media ? '.media' : '') + (k === ovLanes ? '.spare' : ''), { 'data-kind': 'ov', 'data-lane': k },
        h('div.vtl-lab', null, h('span', null, k === ovLanes ? 'New layer' : `Layer ${k + 1}`),
          k === ovLanes ? h('button.vtl-mini', { type: 'button', title: 'Add a video or photo layer at the playhead', 'aria-label': 'Add a layer', onclick: () => addLayerMedia(k) }, ic('plus')) : null),
        lane));
    }
    // the main video track
    const main = h('div.vtl-track.main');
    if (!clips.length) main.append(h('button.vtl-empty', { type: 'button', onclick: () => S.pickClips({}) }, ic('plus'), d.elements.length ? 'Add clips — your videos and photos play one after another' : 'Add video clips or photos — or drop them here'));
    clips.forEach((el, i) => { main.append(clipBlock(el, i, sel.has(el.id))); if (i) main.append(transChip(el)); });
    rows.push(h('div.vtl-row.main', { 'data-kind': 'main' }, h('div.vtl-lab', null, h('span', null, 'Video'), h('button.vtl-mini', { type: 'button', title: 'Add clips', 'aria-label': 'Add clips', onclick: () => S.pickClips({}) }, ic('plus'))), main));
    // sound
    // sound tracks, plus an empty one under them
    for (let k = 0; k <= auLanes; k++) {
      const lane = h('div.vtl-track.au'), items = snd.filter(x => x.lane === k);
      for (const it of items) lane.append(soundBar(it));
      if (!snd.length) lane.append(h('button.vtl-empty.au', { type: 'button', onclick: () => (S.ui.setTab('sounds'), 0) }, ic('music'), 'Add music or sound effects — or drop a sound file here'));
      const muted = items.length && items.every(it => it.a.mute);
      rows.push(h('div.vtl-row.au' + (k === auLanes && snd.length ? '.spare' : ''), { 'data-kind': 'au', 'data-lane': k },
        h('div.vtl-lab', null, h('span', null, k === auLanes && snd.length ? 'New sound' : `Sound ${k + 1}`),
          items.length ? h('button.vtl-mini' + (muted ? '.on' : ''), { type: 'button', title: muted ? 'Unmute this track' : 'Mute this track', 'aria-label': muted ? 'Unmute track' : 'Mute track', onclick: () => { for (const it of items) it.a.mute = !muted; S.commit(); S.emit('change'); render(); } }, ic(muted ? 'mute' : 'volume')) : null),
        lane));
      if (!snd.length) break;
    }
    lanes.replaceChildren(...rows);
    hydrateIcons(lanes);
    placeHead();
  }
  function drawRuler(W) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), Hh = 22, w = W - LAB;
    ruler.width = Math.round(w * dpr); ruler.height = Hh * dpr; ruler.style.width = w + 'px'; ruler.style.height = Hh + 'px';
    const x = ruler.getContext('2d');
    x.scale(dpr, dpr);
    const css = getComputedStyle(root);
    x.fillStyle = css.getPropertyValue('--ink-3') || '#888';
    x.strokeStyle = css.getPropertyValue('--line-strong') || 'rgba(255,255,255,.2)';
    x.font = '10px ' + (css.getPropertyValue('--mono') || 'monospace');
    const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const major = steps.find(s => s * pps >= 70) || 600, minor = major / (major >= 1 && major % 5 === 0 ? 5 : 4);
    x.beginPath();
    for (let t = 0; t <= D() + 1e-6 + 60 / pps; t += minor) {
      const px = Math.round(t * pps) + 0.5, isMaj = Math.abs(t / major - Math.round(t / major)) < 1e-6;
      x.moveTo(px, isMaj ? 9 : 15); x.lineTo(px, Hh);
      if (isMaj) x.fillText(fmt(t).replace(/\.0$/, ''), px + 3, 9);
    }
    x.stroke();
    // the end of the video
    x.fillStyle = 'rgba(255,255,255,.06)';
    x.fillRect(D() * pps, 0, w, Hh);
  }
  function placeHead() {
    const t = now();
    head.style.transform = `translateX(${tx(t)}px)`;
    timeEl.textContent = `${fmt(t)} / ${fmt(D())}`;
    const want = S.isPlaying() ? 'pause' : 'play';
    if (playBtn.dataset.state !== want) { playBtn.dataset.state = want; playBtn.replaceChildren(ic(want)); }
    // keep the playhead in view while playing
    if (S.isPlaying()) {
      const x = tx(t);
      if (x > scroll.scrollLeft + scroll.clientWidth - 40 || x < scroll.scrollLeft + LAB) scroll.scrollLeft = x - LAB - 20;
    }
  }

  /* filmstrips: a few frames per video, grabbed once with a private <video> */
  const strips = new Map(); // asset URL → { frames: [{ t, c }], step, busy }
  function stripFor(id) {
    const url = S.assets[id];
    let st = strips.get(url);
    if (st) return st;
    st = { frames: [], step: 1, busy: true };
    strips.set(url, st);
    (async () => {
      const v = document.createElement('video');
      v.muted = true; v.preload = 'auto'; v.src = url;
      await new Promise(res => { v.onloadeddata = res; v.onerror = res; setTimeout(res, 8000); });
      const dur = isFinite(v.duration) ? v.duration : 0;
      if (!dur || !v.videoWidth) { st.busy = false; return; }
      const n = Math.min(80, Math.max(2, Math.ceil(dur / 1.5)));
      st.step = dur / n;
      const th = 60, tw = Math.round(th * v.videoWidth / v.videoHeight);
      for (let i = 0; i < n; i++) {
        const t = Math.min(dur - 0.05, (i + 0.5) * st.step);
        await new Promise(res => { const fin = () => { v.removeEventListener('seeked', fin); res(); }; v.addEventListener('seeked', fin); setTimeout(fin, 1500); v.currentTime = t; });
        const c = document.createElement('canvas'); c.width = tw; c.height = th;
        c.getContext('2d').drawImage(v, 0, 0, tw, th);
        st.frames.push({ t, c });
        if (i % 6 === 5 || i === n - 1) schedule();
      }
      st.busy = false;
      v.removeAttribute('src'); v.load();
    })();
    return st;
  }
  function paintStrip(c, el, w, hgt) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.round(hgt * dpr);
    c.style.width = w + 'px'; c.style.height = hgt + 'px';
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    const vid = R.isVideoAsset(el.assetId);
    const img = vid ? null : R.assetImage(el.assetId), m = vid ? null : R.mediaSize(img);
    const st = vid ? stripFor(el.assetId) : null;
    const tileW = vid ? (st.frames[0] ? st.frames[0].c.width * hgt / st.frames[0].c.height : hgt * 16 / 9) : m ? Math.max(20, hgt * m.w / m.h) : hgt;
    const vd = el.video || {}, sp = vd.speed || 1;
    for (let px = 0; px < w; px += tileW) {
      if (vid) {
        if (!st.frames.length) continue;
        const lt = (px + tileW / 2) / pps * sp, srcEnd = vd.end > 0 ? vd.end : S.clipSrcLen(el);
        const t = vd.reverse ? srcEnd - lt : (vd.trim || 0) + lt;
        const f = st.frames[clamp(Math.round(t / st.step - 0.5), 0, st.frames.length - 1)];
        x.drawImage(f.c, px, 0, tileW, hgt);
      } else if (img) {
        const s = Math.max(tileW / m.w, hgt / m.h);
        x.drawImage(img, (m.w - tileW / s) / 2, (m.h - hgt / s) / 2, tileW / s, hgt / s, px, 0, tileW, hgt);
      }
    }
  }
  const waves = new Map(); // key → Float32Array
  function paintWave(c, a, w, hgt) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.round(hgt * dpr);
    c.style.width = w + 'px'; c.style.height = hgt + 'px';
    const n = Math.max(8, Math.min(4000, Math.round(w / 2)));
    const len = A.trackLen(a), key = S.assets[a.assetId] + '|' + a.trim + '|' + a.end + '|' + n;
    const pk = waves.get(key);
    if (!pk) {
      if (!waves.has(key)) { waves.set(key, null); A.peaks(a.assetId, a.trim || 0, a.end > 0 ? a.end : 0, n).then(p => { if (p) { waves.set(key, p); schedule(); } }); }
      return;
    }
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    x.fillStyle = 'rgba(255,255,255,.55)';
    const pass = len * pps, reps = a.loop ? Math.ceil(w / Math.max(1, pass)) : 1;
    for (let r = 0; r < reps; r++) {
      for (let i = 0; i < n; i++) {
        const px = r * pass + i / n * Math.min(w, pass);
        if (px > w) break;
        const v = pk[i] * (a.volume ?? 1), bh = Math.max(1, Math.min(1, v) * (hgt - 6));
        x.fillRect(px, (hgt - bh) / 2, Math.max(1, Math.min(w, pass) / n - 0.5), bh);
      }
    }
  }

  function clipBlock(el, i, on) {
    const s0 = el.time.start, len = el.time.end - el.time.start, w = Math.max(6, len * pps);
    const vid = R.isVideoAsset(el.assetId), muted = vid && el.video && el.video.mute;
    const c = h('canvas.vtl-strip');
    const b = h('div.vtl-clip' + (on ? '.on' : '') + (vid ? '.vid' : '.photo'), { style: { left: s0 * pps + 'px', width: w + 'px' }, 'data-id': el.id },
      c,
      h('div.vtl-clip-info', null,
        h('span', null, (el.name || (vid ? 'Video' : 'Photo')) + ''),
        h('small', null, fmt(len).replace(/^0:/, '') + 's' + (vid && (el.video.speed || 1) !== 1 ? ` · ${Math.round(el.video.speed * 100)}%` : '') + (vid && el.video.reverse ? ' · reversed' : '')),
        muted ? h('i.vtl-mut', { 'data-icon': 'mute' }) : null),
      h('div.vtl-h.l', { title: 'Drag to trim the start' }), h('div.vtl-h.r', { title: 'Drag to trim the end' }));
    paintStrip(c, el, w, 44);
    b.addEventListener('pointerdown', e => startDrag(e, { kind: 'clip', el, side: e.target.classList.contains('l') ? 'l' : e.target.classList.contains('r') ? 'r' : null, b }));
    b.addEventListener('dblclick', () => S.openTimeline());
    return b;
  }
  function transChip(el) {
    const tr = el.clip.trans, has = tr && tr.type && tr.type !== 'none';
    const x = el.time.start * pps + (el.clip._in || 0) * pps / 2;
    const b = h('button.vtl-trans' + (has ? '.on' : ''), { type: 'button', title: has ? `${R.TRANSITIONS[tr.type]} · ${el.clip._in.toFixed(2)}s — click to change` : 'Add a transition', style: { left: x + 'px' } }, has ? h('b', null, (R.TRANSITIONS[tr.type] || '').slice(0, 1)) : ic('plus'));
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', e => { e.stopPropagation(); transPop(el, b); });
    return b;
  }
  function overlayBar(it, on) {
    const el = it.el, w = Math.max(6, (it.e - it.s) * pps), media = el.type === 'image' && el.assetId;
    const c = media ? h('canvas.vtl-strip') : null;
    const b = h('div.vtl-ovb.t-' + el.type + (on ? '.on' : '') + (el.hidden ? '.muted' : ''), { style: { left: it.s * pps + 'px', width: w + 'px' } },
      c, h('span', null, S.elLabel(el)), h('div.vtl-h.l'), h('div.vtl-h.r'));
    if (c) paintStrip(c, el, w, 30);
    b.addEventListener('pointerdown', e => startDrag(e, { kind: 'ov', el, side: e.target.classList.contains('l') ? 'l' : e.target.classList.contains('r') ? 'r' : null, b }));
    return b;
  }
  function soundBar(it) {
    const a = it.a, w = Math.max(6, (it.e - it.s) * pps), on = selSound === a.id;
    const c = h('canvas.vtl-wave');
    const b = h('div.vtl-sound' + (on ? '.on' : '') + (a.mute ? '.muted' : '') + (a.voice ? '.voice' : ''), { style: { left: it.s * pps + 'px', width: w + 'px' } },
      c, h('div.vtl-clip-info', null, h('i', { 'data-icon': a.voice ? 'mic' : 'music' }), h('span', null, a.name || 'Sound'), a.loop ? h('small', null, 'loops') : null, a.mute ? h('i.vtl-mut', { 'data-icon': 'mute' }) : null),
      a.fadeIn > 0 ? h('div.vtl-fade.in', { style: { width: Math.min(w / 2, a.fadeIn * pps) + 'px' } }) : null,
      a.fadeOut > 0 ? h('div.vtl-fade.out', { style: { width: Math.min(w / 2, a.fadeOut * pps) + 'px' } }) : null,
      h('div.vtl-h.l'), a.loop ? null : h('div.vtl-h.r'));
    paintWave(c, a, w, 36);
    b.addEventListener('pointerdown', e => startDrag(e, { kind: 'snd', a, side: e.target.classList.contains('l') ? 'l' : e.target.classList.contains('r') ? 'r' : null, b }));
    return b;
  }

  /* ── dragging ── */
  function selectSound(id) {
    selSound = id;
    if (id) S.select([]);
    U.renderInspector();
    render();
  }
  function startDrag(e, o) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    closePop();
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false;
    if (o.kind === 'snd') {
      selSound = o.a.id; if (S.sel.length) S.select([]);
      for (const x of lanes.querySelectorAll('.on')) x.classList.remove('on');
      o.b.classList.add('on');
      U.renderInspector();
      o.a0 = Object.assign({}, o.a);
    } else {
      if (selSound) selSound = null;
      if (!S.sel.includes(o.el.id)) S.select([o.el.id]);
      o.v0 = JSON.parse(JSON.stringify({ video: o.el.video || null, clip: o.el.clip || null, time: o.el.time || null }));
      o.lane0 = o.b && o.b.parentNode && o.b.parentNode.parentNode ? +o.b.parentNode.parentNode.dataset.lane : null;
    }
    drag = o;
    const target = root;
    target.setPointerCapture(e.pointerId);
    const mv = ev => {
      const dx = ev.clientX - x0;
      if (!moved && Math.abs(dx) < 4 && Math.abs(ev.clientY - y0) < 6) return;
      moved = true;
      dragMove(o, dx / pps, ev);
    };
    const up = ev => {
      target.removeEventListener('pointermove', mv); target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', up);
      drag = null;
      if (target.hasPointerCapture(ev.pointerId)) target.releasePointerCapture(ev.pointerId);
      if (moved) dragEnd(o, (ev.clientX - x0) / pps, ev);
      else if (o.kind === 'clip' || o.kind === 'ov') {
        // a click: show this layer at the playhead, or jump into it
        const t = now(), tm = o.el.time;
        if (tm && (t < tm.start || t >= (tm.end ?? D()))) S.seek(tm.start + 0.01);
      }
      render();
    };
    target.addEventListener('pointermove', mv); target.addEventListener('pointerup', up); target.addEventListener('pointercancel', up);
  }
  function dragMove(o, dt, ev) {
    if (o.kind === 'clip') {
      const el = o.el, v0 = o.v0;
      if (!o.side) {
        // reorder: the block follows the pointer, the others stay until it's dropped
        o.b.style.transform = `translateX(${dt * pps}px)`;
        o.b.classList.add('lift');
        const mid = el.time.start + (el.time.end - el.time.start) / 2 + dt;
        o.to = S.clips().filter(c => c !== el && c.time.start + (c.time.end - c.time.start) / 2 < mid).length;
        return;
      }
      S.changeEl(el, e => {
        if (R.isVideoAsset(e.assetId)) {
          const sp = (v0.video && v0.video.speed) || 1, src = S.clipSrcLen(e) || 9999, tr0 = (v0.video && v0.video.trim) || 0, en0 = v0.video && v0.video.end > 0 ? v0.video.end : src;
          // trimming the left edge of a reversed clip cuts its end in the file
          const left = (o.side === 'l') !== !!(v0.video && v0.video.reverse);
          if (left) e.video.trim = clamp(tr0 + (o.side === 'l' ? dt : -dt) * sp, 0, en0 - 0.1);
          else e.video.end = clamp(en0 + (o.side === 'r' ? dt : -dt) * sp, tr0 + 0.1, src);
        } else e.clip.len = clamp(((v0.clip && v0.clip.len) || 3) + (o.side === 'r' ? dt : -dt), 0.2, 600);
      }, true);
      S.layoutClips();
      // show the frame at the cut
      S.seek(o.side === 'l' ? el.time.start + 0.001 : el.time.end - 0.02);
    } else if (o.kind === 'ov') {
      const t0 = o.v0.time || { start: 0, end: null }, s0 = t0.start || 0, e0 = t0.end != null && t0.end > s0 ? t0.end : D();
      let s = s0, en = e0;
      if (!o.side) { const k = clamp(dt, -s0, D() - e0 + (e0 - s0) - 0.1); s = s0 + k; en = e0 + k; }
      else if (o.side === 'l') s = clamp(s0 + dt, 0, e0 - 0.1);
      else en = clamp(e0 + dt, s0 + 0.1, D());
      const vid = R.isVideoAsset(o.el.assetId), vd0 = o.v0.video || {};
      // a video layer's left edge trims the clip too, so the picture stays where it was in time
      if (vid && o.side === 'l') s = Math.max(s, s0 - (vd0.trim || 0) / (vd0.speed || 1));
      if (vid && o.side === 'r' && vd0.loop === false) { const src = S.clipSrcLen(Object.assign({ clip: null }, o.el)) || R.assetVideo(o.el.assetId).v.duration || 9999; en = Math.min(en, s0 + ((vd0.end > 0 ? vd0.end : src) - (vd0.trim || 0)) / (vd0.speed || 1)); }
      const lane = o.side ? null : laneAt(ev.clientY, 'ov');
      S.changeEl(o.el, e => {
        e.time = Object.assign({}, e.time, { start: Math.round(s * 100) / 100, end: en >= D() - 0.005 && !vid ? null : Math.round(en * 100) / 100 });
        if (vid && o.side === 'l') e.video = Object.assign({}, e.video, { trim: Math.max(0, Math.round(((vd0.trim || 0) + (s - s0) * (vd0.speed || 1)) * 1000) / 1000) });
        if (lane != null) e.lane = lane;
      }, true);
      S.seek(o.side === 'r' ? en - 0.02 : s + 0.001);
    } else if (o.kind === 'snd') {
      const a0 = o.a0, len0 = A.trackLen(a0), end0 = a0.end > 0 ? a0.end : a0.dur || len0 + (a0.trim || 0);
      const p = {};
      if (!o.side) { p.start = Math.max(0, (a0.start || 0) + dt); const lane = laneAt(ev.clientY, 'au'); if (lane != null) p.lane = lane; }
      else if (o.side === 'l') { const k = clamp(dt, -(a0.trim || 0), len0 - 0.1); p.trim = (a0.trim || 0) + k; p.start = Math.max(0, (a0.start || 0) + k); }
      else p.end = clamp(end0 + dt, (a0.trim || 0) + 0.1, a0.dur || end0 + dt);
      S.changeSound(a0.id, p, true);
    }
    render(true);
  }
  function dragEnd(o) {
    if (o.kind === 'clip' && !o.side) {
      o.b.style.transform = ''; o.b.classList.remove('lift');
      if (o.to != null && o.to !== S.clips().indexOf(o.el)) S.moveClip(o.el, o.to); else render();
      return;
    }
    if (o.kind === 'ov' && o.el.lane !== (o.lane0 ?? o.el.lane)) restack(o.el);
    S.commit();
    S.emit('doc');
  }

  // the track under the pointer (null when it's another kind of track)
  function laneAt(clientY, kind) {
    for (const r of lanes.querySelectorAll('.vtl-row')) {
      const b = r.getBoundingClientRect();
      if (clientY >= b.top && clientY < b.bottom) return r.dataset.kind === kind ? +r.dataset.lane : null;
    }
    return null;
  }
  // a higher track draws over a lower one: move the layer in the stack to match its track
  function restack(el) {
    const d = S.doc, L = el.lane || 0, items = overlayItems();
    pack(items);
    const laneOf = new Map(items.map(it => [it.el, it.lane]));
    const from = d.elements.indexOf(el);
    d.elements.splice(from, 1);
    let at = -1;
    d.elements.forEach((e, i) => { if (laneOf.has(e) && laneOf.get(e) <= L) at = i + 1; });
    if (at < 0) { const i = d.elements.findIndex(e => laneOf.has(e) && laneOf.get(e) > L); at = i >= 0 ? i : from; }
    d.elements.splice(at, 0, el);
    S.rebuild();
  }
  // videos / photos as layers over the video, from the playhead
  function addLayerMedia(lane) { S.pickImages({ asOverlay: true, at: now(), lane }); }
  S.addLayerMedia = addLayerMedia;

  // click / drag on the ruler or an empty spot moves the playhead
  function seekFromX(clientX) {
    const r = inner.getBoundingClientRect();
    S.pause();
    S.seek(clamp((clientX - r.left - LAB) / pps, 0, D() - 0.001));
  }
  inner.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('.vtl-clip, .vtl-ovb, .vtl-sound, .vtl-trans, .vtl-empty, .vtl-lab button')) return;
    if (e.clientX - inner.getBoundingClientRect().left < LAB) return;
    closePop();
    if (selSound) { selSound = null; U.renderInspector(); }
    seekFromX(e.clientX);
    inner.setPointerCapture(e.pointerId);
    const mv = ev => seekFromX(ev.clientX);
    const up = () => { inner.removeEventListener('pointermove', mv); inner.removeEventListener('pointerup', up); render(); };
    inner.addEventListener('pointermove', mv); inner.addEventListener('pointerup', up);
  });

  // drop files: sound becomes a track at the drop point, videos and photos become clips there
  root.addEventListener('dragover', e => { const ty = [...e.dataTransfer.types]; if (ty.includes('Files') || ty.includes('application/x-studio-sound')) { e.preventDefault(); e.stopPropagation(); root.classList.add('over'); } });
  root.addEventListener('dragleave', () => root.classList.remove('over'));
  root.addEventListener('drop', e => {
    const snd = e.dataTransfer.getData('application/x-studio-sound');
    const t = clamp((e.clientX - inner.getBoundingClientRect().left - LAB) / pps, 0, D());
    // a sound from the Sounds panel, dropped where it should play
    if (snd) {
      e.preventDefault(); e.stopPropagation(); root.classList.remove('over');
      const p = JSON.parse(snd), lane = laneAt(e.clientY, 'au');
      if (p.lib && S.addLibrarySound) S.addLibrarySound(window.StudioSfx.byId[p.id], t).then(() => { const a = S.doc.audio[S.doc.audio.length - 1]; if (a && lane != null) { a.lane = lane; S.commit(); render(); } });
      else { const a = S.addSound(p.id, { at: t, lane }); if (a) render(); }
      return;
    }
    if (!e.dataTransfer.files.length) return;
    e.preventDefault(); e.stopPropagation(); root.classList.remove('over');
    const files = [...e.dataTransfer.files];
    const idx = S.clips().filter(c => c.time.start + (c.time.end - c.time.start) / 2 < t).length;
    const ovLane = laneAt(e.clientY, 'ov'), auLane = laneAt(e.clientY, 'au');
    // onto a layer track: layers at the drop point; onto the video track (or anywhere else): clips
    S.importFiles(files, ovLane != null ? { asOverlay: true, at: t, lane: ovLane, soundAt: t } : { asClips: true, clipIndex: idx, soundAt: t, soundLane: auLane });
  });

  /* ── actions ── */
  function split() {
    const t = now();
    if (selSound) { if (!S.splitSound(selSound, t)) toast('Move the playhead inside the sound to split it'); return; }
    const sel = S.selEls()[0];
    const el = sel && sel.clip && t > sel.time.start && t < sel.time.end ? sel : S.clipAt(t);
    if (!el) { toast('Move the playhead over a clip to split it'); return; }
    if (!S.splitClip(el, t)) toast('Too close to the clip’s edge to split');
  }
  function duplicate() {
    if (selSound) {
      const a = S.soundById(selSound);
      if (!a) return;
      const b = Object.assign({}, a, { id: 'au' + Math.random().toString(36).slice(2, 9), start: A.trackEnd(a, Infinity) });
      S.doc.audio.splice(S.doc.audio.indexOf(a) + 1, 0, b);
      S.commit(); S.emit('doc'); selectSound(b.id);
      return;
    }
    if (S.sel.length) S.duplicate();
  }
  function remove() {
    if (selSound) { const id = selSound; selSound = null; S.removeSound(id); U.renderInspector(); return; }
    if (S.sel.length) { S.removeSelected(); S.commit(); }
  }
  function addTitle() {
    const t = now(), W = S.doc.width;
    const el = S.mk('text', { text: 'Your title', fontSize: Math.round(Math.min(W, S.doc.height) * 0.08), fontFamily: 'Inter', fontWeight: 700, fill: '#ffffff', align: 'center', shadow: { on: true, color: '#000000', opacity: 0.45, blur: 18, x: 0, y: 4 } });
    el.time = { start: Math.round(t * 100) / 100, end: Math.round(Math.min(D(), t + 3) * 100) / 100 };
    el.anim = { enter: 'rise', loop: 'none', speed: 1, amount: 1, delay: 0 };
    el.cx = S.doc.width / 2; el.cy = S.doc.height * 0.78;
    S.addElement(el, { center: false });
    S.seek(t + 0.5);
    S.emit('doc');
  }
  async function toggleRecord() {
    if (A.recording()) {
      S.pause();
      const tr = await A.stopRecording();
      if (tr) { selectSound(tr.id); toast('Voiceover added'); }
      return;
    }
    try {
      const t = now();
      await A.record(t);
      // play the design from the playhead so you can talk over it
      if (S.isVideoEdit() || S.hasAnimation()) S.play();
      toast('Recording — click Voice again to stop');
    } catch (err) { toast('The microphone isn’t available — check the browser’s permission'); }
  }
  S.on('recording', on => { recBtn.classList.toggle('rec', !!on); recBtn.lastChild.textContent = on ? 'Stop' : 'Voice'; });

  /* ── transition picker ── */
  function closePop() { pop.hidden = true; pop.replaceChildren(); }
  function transPop(el, anchor) {
    const tr = el.clip.trans || { type: 'none', dur: 0.5, dir: 'left' };
    const draw = () => {
      const cur = el.clip.trans || { type: 'none', dur: 0.5, dir: 'left' };
      pop.replaceChildren(
        h('div.vtl-pop-title', null, 'Transition'),
        h('div.vtl-trans-grid', null, Object.entries(R.TRANSITIONS).map(([k, l]) => h('button' + (cur.type === k ? '.on' : ''), { type: 'button', onclick: () => { S.setTransition(el, { type: k }); draw(); render(); } }, l))),
        cur.type !== 'none' ? h('label.vtl-pop-row', null, h('span', null, 'Length'),
          h('input', { type: 'range', min: 0.1, max: 3, step: 0.05, value: cur.dur || 0.5, oninput: e => { S.changeEl(el, x => { x.clip.trans.dur = +e.target.value; }, true); S.layoutClips(); render(); val.textContent = (+e.target.value).toFixed(2) + 's'; }, onchange: () => S.commit() }),
          h('b', null)) : null,
        cur.type !== 'none' && R.TRANS_DIRS.includes(cur.type) ? h('div.seg.vtl-dirs', null, [['left', '←'], ['right', '→'], ['up', '↑'], ['down', '↓']].map(([k, l]) => h('button' + ((cur.dir || 'left') === k ? '.on' : ''), { type: 'button', title: 'Moves ' + k, onclick: () => { S.setTransition(el, { dir: k }); draw(); } }, l))) : null,
        h('div.vtl-pop-foot', null,
          h('button.link-btn', { type: 'button', onclick: () => { S.setAllTransitions(el.clip.trans ? Object.assign({}, el.clip.trans) : { type: 'none' }); toast('Same transition between every clip'); render(); } }, 'Apply to all clips'),
          h('button.link-btn', { type: 'button', title: 'A sound effect that fits this transition', onclick: () => { const X = window.StudioSfx, s = X && X.byId[X.FOR_TRANSITION[(el.clip.trans && el.clip.trans.type) || 'cut'] || 'swish']; if (s) S.addLibrarySound(s, el.time.start + (el.clip._in || 0) / 2); closePop(); } }, 'Add a sound'),
          h('button.link-btn', { type: 'button', onclick: () => { const t = el.time.start; S.seek(Math.max(0, t - 0.6)); S.play(); setTimeout(() => { if (S.isPlaying() && now() > t + (el.clip._in || 0) + 0.5) S.pause(); }, 1600); } }, 'Preview')));
      const val = pop.querySelector('.vtl-pop-row b');
      if (val) val.textContent = (cur.dur || 0.5).toFixed(2) + 's';
    };
    void tr;
    draw();
    pop.hidden = false;
    const r = anchor.getBoundingClientRect(), rr = root.getBoundingClientRect();
    pop.style.left = clamp(r.left - rr.left - 130, 8, rr.width - 290) + 'px';
    pop.style.bottom = (rr.bottom - r.top + 8) + 'px';
  }
  document.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('.vtl-trans')) closePop(); });

  /* ── keys (only while the timeline is open and nobody is typing) ── */
  const typing = e => /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
  window.addEventListener('keydown', e => {
    if (!open || typing(e) || document.querySelector('.modal-back')) return;
    const mod = e.metaKey || e.ctrlKey;
    if ((!mod && e.key.toLowerCase() === 's' && !e.shiftKey && !e.altKey) || (mod && e.key.toLowerCase() === 'b')) { e.preventDefault(); e.stopImmediatePropagation(); split(); return; }
    if (selSound && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); e.stopImmediatePropagation(); remove(); return; }
    // ← → step a frame (Shift: a second) when nothing is selected
    if (!mod && !S.sel.length && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault(); e.stopImmediatePropagation();
      const st = e.shiftKey ? 1 : 1 / (S.doc.anim.fps || 30);
      S.pause(); S.seek(clamp(now() + (e.key === 'ArrowLeft' ? -st : st), 0, D() - 0.001));
    }
  }, true);

  /* ── events ── */
  S.on('time', () => { if (open) placeHead(); });
  S.on('playstate', () => { if (open) placeHead(); });
  for (const ev of ['doc', 'change', 'selection', 'history']) S.on(ev, () => { if (ev === 'selection' && S.sel.length && selSound) { selSound = null; } schedule(); autoOpen(); });
  S.on('project', () => { userClosed = false; selSound = null; });
  // a design with clips opens the timeline (unless it was closed for this design)
  function autoOpen() { const home = document.getElementById('home'); if (!open && !userClosed && S.isVideoEdit() && (!home || home.hidden)) openTl(); }
  new ResizeObserver(() => { if (open) { if (fitZoom) pps = 0; schedule(); } }).observe(scroll);

  /* ── the dock button ── */
  const dock = document.getElementById('dock');
  let dockBtn = null;
  if (dock) {
    dockBtn = h('button.dock-act', { type: 'button', title: 'Video timeline — clips, music, transitions', onclick: () => (open ? (userClosed = true, close()) : S.openTimeline()) }, ic('timeline'), h('span', null, 'Timeline'));
    const exp = dock.querySelector('.dock-act.primary');
    dock.insertBefore(dockBtn, exp || null);
    hydrateIcons(dockBtn);
  }

  /* ── inspector: the selected clip, the selected sound, the design's sound ── */
  U.addSection('el', el => {
    if (!el.clip) return null;
    const vid = R.isVideoAsset(el.assetId);
    const i = S.clips().indexOf(el), tr = el.clip.trans;
    return sec('Clip', [
      h('p.hint', null, `Clip ${i + 1} of ${S.clips().length} · ${fmt(el.time.start)} – ${fmt(el.time.end)}`),
      row('Frame', h('div.seg', null,
        h('button' + (el.clip.fit !== 'fit' ? '.on' : ''), { type: 'button', title: 'Fill the canvas (crops the edges)', onclick: () => { S.placeClip(el, 'fill'); U.renderInspector(); } }, 'Fill'),
        h('button' + (el.clip.fit === 'fit' ? '.on' : ''), { type: 'button', title: 'Show the whole picture', onclick: () => { S.placeClip(el, 'fit'); U.renderInspector(); } }, 'Fit'))),
      vid ? null : row('Shows for', num('sel', 'clip.len', { min: 0.2, max: 60, soft: true, step: 0.1, slider: true, unit: 's', def: 3 })),
      i > 0 ? row('Transition in', (() => {
        const s = h('select.sel', { 'aria-label': 'Transition into this clip', onchange: e => { S.setTransition(el, { type: e.target.value }); U.renderInspector(); } }, Object.entries(R.TRANSITIONS).map(([k, l]) => h('option', { value: k, selected: (tr ? tr.type : 'none') === k }, l)));
        return s;
      })()) : null,
      full(h('div.btn-row', null,
        h('button.btn.grow', { type: 'button', title: 'Even out exposure, contrast and colour from this clip', onclick: () => { if (S.autoFix(el)) { toast('Auto fix applied — fine-tune under Adjust'); U.renderInspector(); } else toast('The clip isn’t ready yet'); } }, ic('wand'), 'Auto fix'),
        h('button.btn.grow', { type: 'button', title: 'Split at the playhead (S)', onclick: () => split() }, ic('scissors'), 'Split'))),
      full(h('button.link-btn', { type: 'button', onclick: () => { S.makeClip(el, false); U.renderInspector(); toast('Now a free layer over the video'); } }, 'Take out of the video track (use as an overlay)')),
    ], true, { key: 'clip', collapsible: false });
  });
  // a free photo / video layer can join the main track
  U.addSection('el', el => {
    if (el.clip || el.type !== 'image' || !el.assetId || !S.isVideoEdit()) return null;
    return full(h('button.btn', { type: 'button', style: { margin: '0 0 10px' }, onclick: () => { S.makeClip(el, true); U.renderInspector(); } }, ic('timeline'), 'Put in the video track'));
  });
  U.addSection('doc', () => {
    const a = selSound && S.soundById(selSound);
    if (a) {
      const set = (k, v, live) => { S.changeSound(a.id, { [k]: v }, live); render(); };
      const g = k => () => S.soundById(a.id) && S.soundById(a.id)[k];
      const len = A.trackLen(a);
      return sec(a.voice ? 'Voiceover' : 'Music', [
        h('p.hint', null, `${a.name || 'Sound'} · starts at ${fmt(a.start)} · ${fmt(len)} used of ${fmt(a.dur || len)}`),
        row('Volume', num('doc', '', { min: 0, max: 200, scale: 100, unit: '%', slider: true, def: 1, get: g('volume'), set: (v, l) => set('volume', v, l) })),
        row('Fade in', num('doc', '', { min: 0, max: 10, step: 0.1, slider: true, unit: 's', get: g('fadeIn'), set: (v, l) => set('fadeIn', v, l) })),
        row('Fade out', num('doc', '', { min: 0, max: 10, step: 0.1, slider: true, unit: 's', get: g('fadeOut'), set: (v, l) => set('fadeOut', v, l) })),
        row('Starts at', num('doc', '', { min: 0, max: Math.max(60, D()), soft: true, step: 0.1, slider: true, unit: 's', get: g('start'), set: (v, l) => set('start', v, l) })),
        toggle('doc', '', 'Loop to the end of the video', { get: g('loop'), set: v => { set('loop', v); U.renderInspector(); } }),
        toggle('doc', '', 'Mute', { get: g('mute'), set: v => { set('mute', v); U.renderInspector(); } }),
        full(h('div.btn-row', null,
          h('button.btn.grow', { type: 'button', onclick: () => split() }, ic('scissors'), 'Split'),
          h('button.btn.grow', { type: 'button', onclick: () => remove() }, ic('trash'), 'Delete'))),
      ], true, { key: 'sound-track', collapsible: false });
    }
    const tracks = S.doc.audio || [];
    const vidSound = A.sources(S.doc).filter(s => s.kind === 'video').length;
    return sec('Sound', [
      tracks.length ? h('div.snd-list', null, tracks.map(t => h('button.snd-item', { type: 'button', onclick: () => { S.openTimeline(); selectSound(t.id); } }, ic(t.voice ? 'mic' : 'music'), h('span', null, t.name || 'Sound'), h('small', null, Math.round((t.volume ?? 1) * 100) + '%')))) : null,
      h('p.hint', null, tracks.length || vidSound ? `${vidSound ? `${vidSound} video${vidSound > 1 ? 's' : ''} with sound` : ''}${vidSound && tracks.length ? ' · ' : ''}${tracks.length ? `${tracks.length} sound track${tracks.length > 1 ? 's' : ''}` : ''} — all of it goes into the exported video.` : 'Add music or record a voiceover; it plays with the design and is exported with the video.'),
      full(h('div.btn-row', null,
        h('button.btn.grow', { type: 'button', onclick: () => musicInput.click() }, ic('music'), 'Add music'),
        h('button.btn.grow', { type: 'button', onclick: () => { S.openTimeline(); toggleRecord(); } }, ic('mic'), 'Record'),
        h('button.btn', { type: 'button', title: 'Open the video timeline', 'aria-label': 'Open the video timeline', onclick: () => S.openTimeline() }, ic('timeline')))),
    ], !!tracks.length, { key: 'sound' });
  });
  S.on('selection', () => { if (S.sel.length && selSound) selSound = null; });
})();
