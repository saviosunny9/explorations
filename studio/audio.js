/* Savio's editor — sound.
   Video layers play their own sound, and music / voice tracks (doc.audio) play under the design: in the editor through
   Web Audio, in step with the timeline; on export everything is mixed offline into one stereo track and encoded
   (AAC in MP4 where the browser can, Opus otherwise) next to the picture.

   doc.audio = [{ id, assetId, name, start, trim, end, dur, volume, fadeIn, fadeOut, loop, mute }]
     start = where it begins in the design (s) · trim / end = the part of the file used (end 0 = to the end of the file)
     dur = the file's length · volume 0–2 · fades in seconds
   el.video / background.video carry { volume, mute, fadeIn, fadeOut } for a video's own sound. */
(function () {
  'use strict';
  const S = window.Studio, R = window.StudioRender;
  const A = window.StudioAudio = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const uid = () => 'au' + Math.random().toString(36).slice(2, 9);

  // a music track's length on the timeline (one pass through the part of the file it uses)
  A.trackLen = a => Math.max(0.05, ((a.end > 0 ? a.end : a.dur || 0) - (a.trim || 0)));
  A.trackEnd = (a, D) => (a.loop ? D : Math.min(D, (a.start || 0) + A.trackLen(a)));

  // every sound in a design and where it sits on the timeline (design seconds)
  function sources(doc) {
    const D = (doc.anim && doc.anim.duration) || 5, out = [];
    const vid = (key, id, vd, start, end, el) => {
      vd = vd || {};
      if (vd.mute || (vd.volume ?? 1) <= 0 || end <= start) return;
      out.push({ key, id, kind: 'video', start, end, trim: vd.trim || 0, srcEnd: vd.end > 0 ? vd.end : 0, speed: vd.speed || 1, loop: vd.loop !== false, reverse: !!vd.reverse, volume: vd.volume ?? 1, fadeIn: vd.fadeIn || 0, fadeOut: vd.fadeOut || 0, el });
    };
    const bg = doc.background || {};
    if (!bg.none && R.isVideoAsset(bg.assetId)) vid('bg', bg.assetId, bg.video, 0, D, null);
    for (const el of doc.elements || []) {
      if (el.type !== 'image' || el.hidden || !R.isVideoAsset(el.assetId)) continue;
      const tm = el.time || {}, s0 = tm.start || 0, e0 = tm.end != null && tm.end > s0 ? tm.end : D;
      vid(el.id, el.assetId, el.video, s0, Math.min(D, e0), el);
    }
    for (const a of doc.audio || []) {
      if (a.mute || !a.assetId || (a.volume ?? 1) <= 0) continue;
      const s0 = a.start || 0, e0 = A.trackEnd(a, D);
      if (e0 <= s0) continue;
      out.push({ key: a.id, id: a.assetId, kind: 'music', start: s0, end: e0, trim: a.trim || 0, srcEnd: a.end > 0 ? a.end : 0, speed: 1, loop: !!a.loop, reverse: false, volume: a.volume ?? 1, fadeIn: a.fadeIn || 0, fadeOut: a.fadeOut || 0 });
    }
    return out;
  }
  A.sources = sources;
  A.hasSound = doc => sources(doc).length > 0;
  // loudness of a source at design time t (volume × fades)
  function gainAt(s, t) {
    if (t < s.start || t >= s.end) return 0;
    let g = s.volume;
    if (s.fadeIn > 0) g *= clamp((t - s.start) / s.fadeIn, 0, 1);
    if (s.fadeOut > 0) g *= clamp((s.end - t) / s.fadeOut, 0, 1);
    return g;
  }
  // the moment of the file that belongs at design time t
  function srcTime(s, t, fileDur) {
    const end = Math.min(fileDur || Infinity, s.srcEnd > 0 ? s.srcEnd : fileDur || Infinity), len = Math.max(0.05, end - s.trim);
    const lt = Math.max(0, t - s.start) * s.speed;
    return s.trim + (s.loop ? lt % len : Math.min(lt, len - 0.01));
  }

  /* ── preview ── */
  let ctx = null, master = null;
  const routes = new Map(); // media element → gain node (null = routed without Web Audio)
  function audioCtx() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.connect(ctx.destination); } catch (e) { ctx = null; }
    return ctx;
  }
  A.resume = () => { const c = audioCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); };
  function route(m) {
    if (routes.has(m)) return routes.get(m);
    let g = null;
    const c = audioCtx();
    if (c) { try { const n = c.createMediaElementSource(m); g = c.createGain(); g.gain.value = 0; n.connect(g); g.connect(master); } catch (e) { g = null; } }
    routes.set(m, g);
    return g;
  }
  function setGain(m, v) {
    const g = route(m);
    if (g) { m.muted = false; g.gain.setTargetAtTime(v, ctx.currentTime, 0.015); } else { m.muted = v <= 0; m.volume = clamp(v, 0, 1); }
  }
  const musicEls = new Map(); // track id → { m, src }
  function musicEl(s) {
    const src = S.assets[s.id];
    let e = musicEls.get(s.key);
    if (e && e.src === src) return e.m;
    if (e) { e.m.pause(); }
    const m = new Audio();
    m.preload = 'auto'; m.src = src;
    musicEls.set(s.key, { m, src });
    return m;
  }
  // called on every frame while playing
  A.tick = function (t) {
    const doc = S.doc, live = new Map();
    for (const s of sources(doc)) {
      if (s.kind === 'video') {
        const e = R.assetVideo(s.id);
        if (!e || !e.ok) continue;
        e.v.preservesPitch = false; // the export changes pitch with speed too
        live.set(e.v, Math.max(live.get(e.v) || 0, s.reverse ? 0 : gainAt(s, t)));
        continue;
      }
      const m = musicEl(s), on = t >= s.start && t < s.end;
      live.set(m, Math.max(live.get(m) || 0, on ? gainAt(s, t) : 0));
      if (!on) { if (!m.paused) m.pause(); continue; }
      const want = srcTime(s, t, m.duration);
      if (m.paused) { if (isFinite(want)) m.currentTime = want; m.play().catch(() => {}); } else if (Math.abs(m.currentTime - want) > 0.25) m.currentTime = want;
    }
    for (const [m, g] of live) setGain(m, g);
    for (const m of routes.keys()) if (!live.has(m)) { setGain(m, 0); if (m.tagName === 'AUDIO' && !m.paused) m.pause(); }
    for (const { m } of musicEls.values()) if (!live.has(m) && !m.paused) m.pause();
  };
  A.stop = function () {
    for (const m of routes.keys()) setGain(m, 0);
    for (const { m } of musicEls.values()) if (!m.paused) m.pause();
  };
  S.audioTick = A.tick;
  S.on('playstate', on => { if (on) A.resume(); else A.stop(); });

  /* ── decoding (export, waveforms) ── */
  const decoded = new Map(); // asset URL → Promise<AudioBuffer | null>
  A.decode = function (id) {
    const url = S.assets[id];
    if (!url) return Promise.resolve(null);
    if (decoded.has(url)) return decoded.get(url);
    const p = (async () => {
      try {
        const blob = S.assetBlob(id) || await (await fetch(url)).blob();
        // decodeAudioData needs the whole file in memory; past ~1.8 GB browsers give up
        if (blob.size > 1.8e9) return null;
        const oc = new OfflineAudioContext(2, 1, 48000);
        return await oc.decodeAudioData(await blob.arrayBuffer());
      } catch (e) { return null; } // no sound track, or a codec the browser can't decode
    })();
    decoded.set(url, p);
    return p;
  };
  // peak levels for drawing a waveform: n values 0–1 across the part [t0, t1] of the file
  A.peaks = async function (id, t0, t1, n) {
    const b = await A.decode(id);
    if (!b) return null;
    const rate = b.sampleRate, ch = [...Array(b.numberOfChannels)].map((_, i) => b.getChannelData(i));
    const i0 = Math.max(0, Math.floor(t0 * rate)), i1 = Math.min(b.length, Math.ceil((t1 > 0 ? t1 : b.duration) * rate));
    const out = new Float32Array(n), step = Math.max(1, (i1 - i0) / n), stride = Math.max(1, Math.floor(step / 64));
    for (let k = 0; k < n; k++) {
      let mx = 0;
      const a = i0 + Math.floor(k * step), z = Math.min(i1, i0 + Math.floor((k + 1) * step));
      for (const d of ch) for (let i = a; i < z; i += stride) { const v = Math.abs(d[i]); if (v > mx) mx = v; }
      out[k] = Math.min(1, mx);
    }
    return out;
  };
  function reversed(b) {
    const oc = new OfflineAudioContext(b.numberOfChannels, b.length, b.sampleRate), r = oc.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
    for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c), o = r.getChannelData(c); for (let i = 0, n = d.length; i < n; i++) o[i] = d[n - 1 - i]; }
    return r;
  }

  /* ── export ── */
  // the whole design's sound as one stereo buffer (null when nothing makes a sound)
  A.mix = async function (doc, duration, rate = 48000) {
    const srcs = sources(doc).filter(s => s.start < duration);
    if (!srcs.length) return null;
    const oc = new OfflineAudioContext(2, Math.max(1, Math.ceil(duration * rate)), rate);
    let any = false;
    for (const s of srcs) {
      const buf = await A.decode(s.id);
      if (!buf) continue;
      const fileEnd = Math.min(buf.duration, s.srcEnd > 0 ? s.srcEnd : buf.duration);
      let a0 = clamp(s.trim, 0, buf.duration), a1 = fileEnd;
      const b = s.reverse ? reversed(buf) : buf;
      if (s.reverse) [a0, a1] = [buf.duration - fileEnd, buf.duration - s.trim];
      const end = Math.min(duration, s.end);
      if (end <= s.start || a1 - a0 < 0.01) continue;
      const src = oc.createBufferSource();
      src.buffer = b;
      src.playbackRate.value = clamp(s.speed, 0.05, 4);
      if (s.loop) { src.loop = true; src.loopStart = a0; src.loopEnd = a1; }
      const g = oc.createGain(), p = g.gain, v = s.volume, span = end - s.start;
      const fi = Math.min(s.fadeIn, span / 2), fo = Math.min(s.fadeOut, span / 2);
      p.setValueAtTime(fi > 0 ? 0 : v, s.start);
      if (fi > 0) p.linearRampToValueAtTime(v, s.start + fi);
      if (fo > 0) { p.setValueAtTime(v, end - fo); p.linearRampToValueAtTime(0, end); }
      src.connect(g); g.connect(oc.destination);
      if (s.loop) src.start(s.start, a0); else src.start(s.start, a0, a1 - a0);
      src.stop(end);
      any = true;
    }
    if (!any) return null;
    const out = await oc.startRendering();
    // keep peaks out of the red: a soft limiter on anything above full scale
    for (let c = 0; c < out.numberOfChannels; c++) { const d = out.getChannelData(c); for (let i = 0; i < d.length; i++) { const x = d[i]; if (x > 0.95 || x < -0.95) d[i] = Math.sign(x) * (0.95 + 0.05 * Math.tanh((Math.abs(x) - 0.95) / 0.05)); } }
    return out;
  };
  // encode a mixed buffer for a container: { codec: 'aac' | 'opus', sampleRate, numberOfChannels, chunks: [{ chunk, meta }] }
  A.encode = async function (buffer, kind) {
    if (!buffer || !('AudioEncoder' in window)) return null;
    const ch = buffer.numberOfChannels, rate = buffer.sampleRate;
    const cands = kind === 'mp4' ? [['aac', 'mp4a.40.2'], ['opus', 'opus']] : [['opus', 'opus']];
    let pick = null;
    for (const [name, codec] of cands) {
      const cfg = { codec, sampleRate: rate, numberOfChannels: ch, bitrate: 192000 };
      try { const r = await AudioEncoder.isConfigSupported(cfg); if (r.supported) { pick = { name, cfg: r.config || cfg }; break; } } catch (e) { /* next */ }
    }
    if (!pick) return null;
    const chunks = [];
    let err = null;
    const enc = new AudioEncoder({ output: (chunk, meta) => chunks.push({ chunk, meta }), error: e => { err = e; } });
    enc.configure(pick.cfg);
    const N = buffer.length, block = 4800, planes = [...Array(ch)].map((_, i) => buffer.getChannelData(i));
    for (let i = 0; i < N && !err; i += block) {
      const n = Math.min(block, N - i), data = new Float32Array(n * ch);
      for (let c = 0; c < ch; c++) data.set(planes[c].subarray(i, i + n), c * n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: rate, numberOfFrames: n, numberOfChannels: ch, timestamp: Math.round(i / rate * 1e6), data });
      enc.encode(ad); ad.close();
      if (enc.encodeQueueSize > 16) await sleep(1);
    }
    try { await enc.flush(); } catch (e) { err = err || e; }
    if (enc.state !== 'closed') enc.close();
    if (err || !chunks.length) return null;
    return { codec: pick.name, sampleRate: rate, numberOfChannels: ch, chunks };
  };
  // a mixed buffer as a 16-bit WAV file (goes next to PNG frame sequences)
  A.wav = function (b) {
    const ch = b.numberOfChannels, n = b.length, rate = b.sampleRate, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, rate, true);
    out.setUint32(28, rate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * ch * 2, true);
    const planes = [...Array(ch)].map((_, i) => b.getChannelData(i));
    for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < ch; c++, o += 2) out.setInt16(o, clamp(planes[c][i], -1, 1) * 32767, true);
    return new Blob([out.buffer], { type: 'audio/wav' });
  };
  // mix + encode for video export; null when the design is silent (or sound can't be made here)
  S.exportAudio = async function (doc, duration, kind) {
    const mix = await A.mix(doc, duration).catch(() => null);
    if (!mix) return null;
    return A.encode(mix, kind).catch(() => null);
  };

  /* ── music tracks ── */
  // add a sound file as a track starting at `at` (default: the start); a still design grows to the music's length
  S.addSound = function (assetId, o = {}) {
    const doc = S.doc;
    doc.audio = doc.audio || [];
    const dur = o.duration || 0;
    const tr = { id: uid(), assetId, name: o.name || 'Music', start: Math.max(0, o.at || 0), trim: 0, end: 0, dur, volume: 1, fadeIn: 0, fadeOut: dur > 4 ? 1 : 0, loop: false, mute: false, voice: !!o.voice };
    doc.audio.push(tr);
    const hasClips = doc.elements.some(e => e.clip);
    if (!hasClips && dur && tr.start + dur > doc.anim.duration + 0.05 && !o.keepLength) {
      const want = Math.min(S.MAX_LEN, Math.round((tr.start + dur) * 10) / 10);
      S.change('doc', 'anim.duration', want);
      S.emit('toast', `Design length set to ${want}s to match the music`);
    }
    S.commit();
    S.emit('doc');
    return tr;
  };
  S.soundById = id => (S.doc.audio || []).find(a => a.id === id) || null;
  S.changeSound = function (id, patch, live) {
    const a = S.soundById(id);
    if (!a) return;
    Object.assign(a, patch);
    if (!live) S.commit();
    S.emit('change');
  };
  S.removeSound = function (id) {
    const doc = S.doc;
    doc.audio = (doc.audio || []).filter(a => a.id !== id);
    S.commit(); S.emit('doc');
  };
  // cut a track in two at design time t
  S.splitSound = function (id, t) {
    const a = S.soundById(id);
    if (!a || a.loop) return null;
    const k = t - (a.start || 0), len = A.trackLen(a);
    if (k <= 0.05 || k >= len - 0.05) return null;
    const b = Object.assign({}, a, { id: uid(), start: t, trim: (a.trim || 0) + k, fadeIn: 0 });
    a.end = (a.trim || 0) + k; a.fadeOut = 0;
    S.doc.audio.splice(S.doc.audio.indexOf(a) + 1, 0, b);
    S.commit(); S.emit('doc');
    return b;
  };

  /* ── voiceover ── */
  let rec = null;
  A.recording = () => !!rec;
  // records the microphone while the design plays from `at`; the take becomes a track at that spot
  A.record = async function (at) {
    if (rec) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined), parts = [];
    mr.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    const t0 = performance.now();
    rec = { mr, stream, at: at || 0, t0, done: new Promise(res => { mr.onstop = res; }) };
    mr.start(250);
    S.emit('recording', true);
    rec.parts = parts;
  };
  A.stopRecording = async function () {
    if (!rec) return null;
    const r = rec; rec = null;
    r.mr.stop();
    await r.done;
    for (const tk of r.stream.getTracks()) tk.stop();
    S.emit('recording', false);
    const blob = new Blob(r.parts, { type: (r.mr.mimeType || 'audio/webm').split(';')[0] });
    if (!blob.size) return null;
    const secs = (performance.now() - r.t0) / 1000;
    const id = S.addMedia(blob, 'audio');
    S.uploads.unshift(id);
    S.emit('uploads');
    return S.addSound(id, { name: 'Voiceover', duration: secs, at: r.at, voice: true, keepLength: S.doc.elements.some(e => e.clip) });
  };
})();
