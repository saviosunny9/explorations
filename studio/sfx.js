/* Savio's editor — the sound library.
   Real recordings (soundpack.js: BigSoundBank, CC0) for transitions, phones and typing, camera and film, everyday foley,
   nature and places, and a drum kit; designed sounds (risers, ringtones from marimba / vibraphone models) and music beds
   (real drums and cymbals with FM electric piano, piano, upright bass, nylon guitar, music box and thumb-piano samples)
   are made in the browser (Web Audio, rendered offline into a WAV). A sound is used through the asset id 'sfx-<key>'; its
   file is made the first time it's needed (S.ensureSound in app.js) and never saved with a project.

   window.StudioSfx = { CATS, LIST: [{ id, name, cat, dur, peak, tags, loop, bpm, rec }], byId, get(id), ALIAS, render(id) → Promise<Blob> } */
(function () {
  'use strict';
  const X = window.StudioSfx = {};
  const RATE = 48000;
  X.CATS = [['music', 'Music'], ['transition', 'Transitions'], ['phone', 'Phone & typing'], ['camera', 'Camera & film'], ['everyday', 'Everyday'], ['nature', 'Nature & places'], ['hit', 'Drums & hits']];
  X.LIST = [];
  const def = (id, name, cat, dur, fn, o = {}) => X.LIST.push(Object.assign({ id, name, cat, dur, fn, tags: '' }, o));

  /* ── building blocks ── */
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const n = s => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(s); return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
  function noiseBuf(c, sec) {
    const b = c.createBuffer(2, Math.ceil(sec * c.sampleRate), c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }
    return b;
  }
  function impulse(c, sec, decay) {
    const b = c.createBuffer(2, Math.ceil(sec * c.sampleRate), c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / d.length, decay); }
    return b;
  }
  // a mixing desk for one sound: master → gentle compressor → out, plus a reverb send
  function desk(c, o = {}) {
    const master = c.createGain(); master.gain.value = o.gain ?? 0.85;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.2;
    if (o.lofi) {
      // lo-fi: warm tape-ish saturation and the top end rolled off
      const sh = c.createWaveShaper(), cv = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; cv[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
      sh.curve = cv;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4600; lp.Q.value = 0.5;
      master.connect(sh); sh.connect(lp); lp.connect(comp);
    } else master.connect(comp);
    comp.connect(c.destination);
    const verb = c.createConvolver(); verb.buffer = impulse(c, o.room || 2.2, o.decay || 3.2);
    const vg = c.createGain(); vg.gain.value = o.wet ?? 0.22; verb.connect(vg); vg.connect(master);
    return { c, out: master, verb, nb: noiseBuf(c, Math.min(6, (o.noise || 3))) };
  }
  // volume shape: silence → peak in `a` s → (sustain) → silence by the end
  function shape(p, t0, a, peak, d, hold = 0) {
    p.setValueAtTime(0.0001, t0);
    p.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + Math.max(0.001, a));
    if (hold) p.setValueAtTime(Math.max(0.0002, peak), t0 + a + hold);
    p.exponentialRampToValueAtTime(0.0001, t0 + a + hold + Math.max(0.005, d));
  }
  function bus(k, dest, pan, send) {
    const g = k.c.createGain();
    let last = g;
    if (pan) { const p = k.c.createStereoPanner(); if (Array.isArray(pan)) { p.pan.setValueAtTime(pan[0], pan[2] || 0); p.pan.linearRampToValueAtTime(pan[1], pan[3] || 1); } else p.pan.value = pan; g.connect(p); last = p; }
    last.connect(dest || k.out);
    if (send) { const s = k.c.createGain(); s.gain.value = send; last.connect(s); s.connect(k.verb); }
    return g;
  }
  // an oscillator note: o = { type, to (glide target), glide, a, d, hold, gain, pan, send, lp, detune, vib: [rate, depth] }
  function tone(k, f, t0, o = {}) {
    const c = k.c, osc = c.createOscillator(), g = bus(k, o.dest, o.pan, o.send);
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide || 0.2));
    if (o.detune) osc.detune.value = o.detune;
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + (o.a || 0.005) + (o.hold || 0) + (o.d || 0.3) + 0.05); }
    let node = osc;
    if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = o.q || 0.7; if (Array.isArray(o.lp)) { fl.frequency.setValueAtTime(o.lp[0], t0); fl.frequency.exponentialRampToValueAtTime(o.lp[1], t0 + (o.lp[2] || 0.3)); } else fl.frequency.value = o.lp; osc.connect(fl); node = fl; }
    const env = c.createGain();
    shape(env.gain, t0, o.a || 0.005, o.gain ?? 0.5, o.d || 0.3, o.hold || 0);
    node.connect(env); env.connect(g);
    osc.start(t0); osc.stop(t0 + (o.a || 0.005) + (o.hold || 0) + (o.d || 0.3) + 0.05);
    return osc;
  }
  // filtered noise: o = { type, f, to, glide, q, a, d, hold, gain, pan, send, hp }
  function hiss(k, t0, o = {}) {
    const c = k.c, src = c.createBufferSource(), g = bus(k, o.dest, o.pan, o.send);
    src.buffer = k.nb; src.loop = true;
    const fl = c.createBiquadFilter(); fl.type = o.type || 'bandpass'; fl.Q.value = o.q ?? 1;
    fl.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide || 0.3));
    if (o.to2) fl.frequency.exponentialRampToValueAtTime(o.to2, t0 + (o.glide || 0.3) + (o.glide2 || 0.3));
    let node = fl;
    if (o.hp) { const h2 = c.createBiquadFilter(); h2.type = 'highpass'; h2.frequency.value = o.hp; fl.connect(h2); node = h2; }
    const env = c.createGain();
    shape(env.gain, t0, o.a || 0.005, o.gain ?? 0.5, o.d || 0.2, o.hold || 0);
    src.connect(fl); node.connect(env); env.connect(g);
    src.start(t0, rnd() * k.nb.duration * 0.8); src.stop(t0 + (o.a || 0.005) + (o.hold || 0) + (o.d || 0.2) + 0.05);
  }

  /* ── drums and instruments (shared by the effects and the music beds) ── */
  const kick = (k, t, v = 1, dest) => { tone(k, 160, t, { to: 42, glide: 0.11, d: 0.38, gain: 0.95 * v, dest }); tone(k, 2400, t, { type: 'triangle', d: 0.012, gain: 0.12 * v, dest }); };
  const clap = (k, t, v = 1, dest) => { for (let i = 0; i < 3; i++) hiss(k, t + i * 0.011, { f: 1300, q: 1.4, d: 0.025, gain: 0.32 * v, dest }); hiss(k, t + 0.033, { f: 1200, q: 1, d: 0.16, gain: 0.3 * v, dest, send: 0.3 }); };
  const pluck = (k, m, t, v = 1, dest, pan) => tone(k, mtof(m), t, { type: 'sawtooth', a: 0.002, d: 0.45, gain: 0.12 * v, lp: [5200, 500, 0.25], q: 2, dest, pan, send: 0.2 });
  function pad(k, notes, t, dur, v = 1, dest) {
    for (const m of notes) for (const dt of [-8, 7]) tone(k, mtof(m), t, { type: 'sawtooth', detune: dt, a: Math.min(1.2, dur * 0.35), hold: Math.max(0, dur - 1.6), d: 1.2, gain: 0.035 * v, lp: 1100, dest, send: 0.45 });
  }
  const bass = (k, m, t, dur, v = 1, dest) => { tone(k, mtof(m), t, { type: 'triangle', a: 0.005, hold: dur * 0.6, d: dur * 0.4, gain: 0.32 * v, lp: 700, dest }); tone(k, mtof(m - 12), t, { a: 0.005, hold: dur * 0.6, d: dur * 0.4, gain: 0.22 * v, dest }); };
  const stab = (k, notes, t, v = 1, dest) => { for (const m of notes) tone(k, mtof(m), t, { type: 'square', a: 0.004, d: 0.22, gain: 0.045 * v, lp: [3200, 700, 0.2], dest, send: 0.25 }); };
  // vinyl crackle under the lo-fi bed
  function crackle(k, t0, dur) {
    const c = k.c, b = c.createBuffer(2, Math.ceil(dur * c.sampleRate), c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * 0.006 + (rnd() < 0.0004 ? (rnd() * 2 - 1) * 0.35 : 0); }
    const src = c.createBufferSource(), fl = c.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = 1500;
    src.buffer = b; src.connect(fl); fl.connect(k.out); src.start(t0);
  }
  const chord = (root, kind) => { const r = n(root), iv = { maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], sus2: [0, 2, 7], add9: [0, 4, 7, 14] }[kind]; return iv.map(i => r + i); };

  /* ── recorded samples (soundpack.js) as AudioBuffers, for the music beds and drum fills ── */
  const P = () => (window.StudioSoundpack && window.StudioSoundpack.items) || {};
  const bank = new Map();
  let dec = null;
  function dataBytes(src) { const b = atob(src.slice(src.indexOf(',') + 1)), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function sample(key) {
    if (!bank.has(key)) {
      const it = P()[key];
      if (!it) return Promise.resolve(null);
      dec = dec || new OfflineAudioContext(2, 1, RATE);
      bank.set(key, dec.decodeAudioData(dataBytes(it.src).buffer).catch(() => null));
    }
    return bank.get(key);
  }
  // a recorded hit: o = { gain, rate (pitch), pan, send, lp, hp, dest, loop, dur }
  function samp(k, key, t, o = {}) {
    const b = k.s[key];
    if (!b) return;
    const c = k.c, src = c.createBufferSource(), g = bus(k, o.dest, o.pan, o.send);
    src.buffer = b; src.playbackRate.value = o.rate || 1;
    let node = src;
    for (const [type, f] of [['lowpass', o.lp], ['highpass', o.hp]]) if (f) { const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; node.connect(fl); node = fl; }
    g.gain.value = o.gain ?? 0.6;
    if (o.loop) { src.loop = true; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain ?? 0.6, t + 1); }
    node.connect(g);
    src.start(t);
    if (o.dur) { if (o.loop) { g.gain.setValueAtTime(o.gain ?? 0.6, t + o.dur - 1); g.gain.linearRampToValueAtTime(0, t + o.dur); } src.stop(t + o.dur); }
  }
  // a pitched sample: plays the nearest recorded note, retuned
  function note(k, set, m, t, o = {}) {
    let best = null;
    for (const [key, mm] of set) if (k.s[key] && (!best || Math.abs(mm - m) < Math.abs(best[1] - m))) best = [key, mm];
    if (best) samp(k, best[0], t, Object.assign({}, o, { rate: Math.pow(2, (m - best[1]) / 12) }));
  }
  const MBOX = [['mbox-gs', 68], ['mbox-as', 70], ['mbox-c', 72], ['mbox-cs', 73], ['mbox-ds', 75], ['mbox-f', 77], ['mbox-g', 79]];

  /* ── instruments ── */
  // FM electric piano: a tine that barks on the attack and mellows as it rings
  function epiano(k, m, t, dur, v = 1, dest, bright = 1) {
    const c = k.c, f = mtof(m), g = bus(k, dest, 0, 0.22);
    const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), tine = c.createOscillator(), tg = c.createGain(), env = c.createGain();
    car.frequency.value = f; mod.frequency.value = f; tine.frequency.value = Math.min(18000, f * 14);
    mg.gain.setValueAtTime(f * 1.8 * v * bright, t); mg.gain.exponentialRampToValueAtTime(f * 0.22, t + 0.45); mg.gain.exponentialRampToValueAtTime(f * 0.04, t + dur + 0.3);
    tg.gain.setValueAtTime(f * 1.1 * v * bright, t); tg.gain.exponentialRampToValueAtTime(0.5, t + 0.07);
    mod.connect(mg); mg.connect(car.frequency); tine.connect(tg); tg.connect(car.frequency);
    shape(env.gain, t, 0.003, 0.13 * v, Math.max(0.3, dur * 0.8), dur * 0.25);
    car.connect(env); env.connect(g);
    for (const o of [car, mod, tine]) { o.start(t); o.stop(t + dur * 1.1 + 0.4); }
  }
  // acoustic-ish piano: two slightly detuned FM voices with a hammer thump and a fast-then-slow decay
  function piano(k, m, t, dur, v = 1, dest) {
    const c = k.c, f = mtof(m), g = bus(k, dest, (m - 60) / 60, 0.3);
    for (const dt of [-2.5, 2.5]) {
      const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), env = c.createGain();
      car.frequency.value = f; car.detune.value = dt; mod.frequency.value = f * 2; mod.detune.value = dt;
      mg.gain.setValueAtTime(f * 0.9 * v, t); mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.6);
      mod.connect(mg); mg.connect(car.frequency);
      env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(0.09 * v, t + 0.004);
      env.gain.exponentialRampToValueAtTime(0.035 * v, t + 0.25); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.25 + dur * 1.4);
      car.connect(env); env.connect(g);
      for (const o of [car, mod]) { o.start(t); o.stop(t + 0.3 + dur * 1.5); }
    }
    hiss(k, t, { type: 'lowpass', f: 900, q: 0.5, d: 0.025, gain: 0.05 * v, dest });
  }
  // upright bass: a round plucked string with the finger's thump
  function ubass(k, m, t, dur, v = 1, dest) {
    const f = mtof(m);
    tone(k, f * 1.012, t, { to: f, glide: 0.04, type: 'triangle', a: 0.004, hold: dur * 0.15, d: dur * 0.9, gain: 0.4 * v, lp: [1500, 380, 0.3], dest });
    tone(k, f, t, { a: 0.004, hold: dur * 0.15, d: dur, gain: 0.3 * v, dest });
    hiss(k, t, { type: 'lowpass', f: 600, q: 0.8, d: 0.035, gain: 0.12 * v, dest });
  }
  // nylon guitar strum (bossa): each string a little after the one before
  function nylon(k, notes, t, v = 1, dest, up) {
    (up ? notes.slice().reverse() : notes).forEach((m, i) => {
      const tt = t + i * 0.014, f = mtof(m);
      tone(k, f, tt, { type: 'triangle', a: 0.002, d: 1.2, gain: 0.11 * v, lp: [3200, 650, 0.35], dest, pan: (i - 2) * 0.12, send: 0.2 });
      tone(k, f * 2, tt, { a: 0.002, d: 0.3, gain: 0.025 * v, dest });
    });
  }
  // brushes on a snare: the swirl and the tap
  const swirl = (k, t, len, v = 1) => hiss(k, t, { f: 3200, to: 5200, glide: len, q: 0.7, a: len * 0.55, d: len * 0.45, gain: 0.05 * v, pan: -0.2 });
  const tap = (k, t, v = 1) => { samp(k, 'snare-3', t, { gain: 0.13 * v, lp: 3800 }); hiss(k, t, { type: 'highpass', f: 2200, q: 0.4, d: 0.09, gain: 0.06 * v }); };
  // marimba: wooden bar modes (1 : 3.9 : 9.2) and a soft mallet
  function marimba(k, m, t, v = 1, dest, len = 0.9) {
    const f = mtof(m);
    tone(k, f, t, { a: 0.002, d: len, gain: 0.32 * v, dest, send: 0.25 });
    tone(k, f * 3.93, t, { a: 0.001, d: len * 0.2, gain: 0.08 * v, dest });
    tone(k, f * 9.2, t, { a: 0.001, d: 0.04, gain: 0.03 * v, dest });
    hiss(k, t, { type: 'lowpass', f: 1800, q: 0.5, d: 0.012, gain: 0.05 * v, dest });
  }
  // vibraphone: long ringing metal bar with a slow tremolo
  function vibes(k, m, t, v = 1, dest, len = 1.8) {
    const c = k.c, f = mtof(m), g = bus(k, dest, 0, 0.35), trem = c.createGain(), l = c.createOscillator(), lg = c.createGain();
    trem.gain.value = 0.8; l.frequency.value = 5.5; lg.gain.value = 0.2; l.connect(lg); lg.connect(trem.gain); trem.connect(g);
    tone(k, f, t, { a: 0.002, d: len, gain: 0.22 * v, dest: trem });
    tone(k, f * 4, t, { a: 0.001, d: len * 0.18, gain: 0.05 * v, dest: trem });
    l.start(t); l.stop(t + len + 0.2);
  }

  /* ── recorded sounds (soundpack.js) join the library as they are ── */
  for (const [id, it] of Object.entries(P())) if (it.name) def(id, it.name, it.cat, it.dur, null, { rec: true, peak: it.peak || 0, loop: !!it.loop });

  /* ── transitions (designed) ── */
  def('riser', 'Riser', 'transition', 2.2, k => {
    hiss(k, 0, { f: 300, to: 6000, glide: 2.1, q: 2, a: 2.05, d: 0.08, gain: 0.55, send: 0.35 });
    tone(k, 110, 0, { type: 'sawtooth', to: 880, glide: 2.1, a: 2.05, d: 0.08, gain: 0.16, lp: [500, 6000, 2.1], vib: [6, 4] });
    tone(k, 220, 0, { type: 'sawtooth', to: 1760, glide: 2.1, a: 2.05, d: 0.08, gain: 0.08, lp: [600, 7000, 2.1], detune: 9 });
  }, { peak: 2.1, tags: 'build up tension' });
  def('drop', 'Down sweep', 'transition', 1.4, k => { hiss(k, 0, { f: 6000, to: 180, glide: 1.2, q: 1.5, a: 0.03, d: 1.3, gain: 0.5, send: 0.3 }); tone(k, 900, 0, { to: 50, glide: 1.1, a: 0.02, d: 1.3, gain: 0.3 }); }, { peak: 0.03, tags: 'fall down drop' });
  def('reverse', 'Reverse swell', 'transition', 1.4, k => hiss(k, 0, { type: 'lowpass', f: 1200, to: 11000, glide: 1.35, q: 0.4, a: 1.35, d: 0.03, gain: 0.7, send: 0.2 }), { peak: 1.35, tags: 'reverse cymbal suck' });
  def('impact', 'Impact boom', 'transition', 2.4, k => { tone(k, 120, 0, { to: 36, glide: 0.7, d: 2.2, gain: 1 }); hiss(k, 0, { type: 'lowpass', f: 900, to: 120, glide: 0.4, q: 0.5, d: 0.6, gain: 0.7, send: 0.6 }); hiss(k, 0, { type: 'highpass', f: 3000, d: 0.08, gain: 0.3 }); }, { peak: 0, wet: 0.35, tags: 'boom hit trailer cinematic' });
  def('tape-stop', 'Tape stop', 'transition', 0.9, k => { tone(k, 330, 0, { type: 'sawtooth', to: 28, glide: 0.8, hold: 0.6, d: 0.2, gain: 0.25, lp: [3000, 200, 0.8] }); tone(k, 165, 0, { type: 'square', to: 18, glide: 0.8, hold: 0.6, d: 0.2, gain: 0.1, lp: 900 }); }, { peak: 0, tags: 'slow down stop' });

  /* ── phone: original ringtones and notification tones (marimba / vibraphone models) ── */
  const melody = (k, inst, notes, step, t0 = 0, v = 1) => notes.forEach((m, i) => { if (m) inst(k, m, t0 + i * step, v); });
  def('ring-marimba', 'Marimba ringtone', 'phone', 4.4, k => {
    const a = [79, 84, 88, 84, 86, 83, 79, 0, 81, 84, 88, 91, 89, 86, 88, 0];
    melody(k, marimba, a, 0.135); melody(k, marimba, a, 0.135, 2.2);
  }, { peak: 0, tags: 'ring call phone cell' });
  def('ring-morning', 'Morning ringtone', 'phone', 4.6, k => {
    const a = [72, 76, 79, 84, 79, 76, 74, 77, 81, 86, 81, 77, 76, 79, 84, 88];
    melody(k, marimba, a, 0.14, 0, 0.9); [[60, 64, 67], [62, 65, 69], [64, 67, 72]].forEach((ch, i) => ch.forEach(m => vibes(k, m, i * 0.75 * 1.5, 0.35, null, 1.4)));
    melody(k, marimba, a.map(m => m + 12), 0.14, 2.3, 0.7);
  }, { peak: 0, tags: 'ring alarm wake up' });
  def('ring-vibes', 'Vibraphone ringtone', 'phone', 4.8, k => {
    const a = [76, 0, 79, 83, 0, 81, 79, 0, 74, 0, 77, 81, 0, 79, 76, 0];
    melody(k, (kk, m, t, v) => vibes(kk, m, t, v, null, 1.2), a, 0.16); melody(k, (kk, m, t, v) => vibes(kk, m, t, v, null, 1.2), a, 0.16, 2.6);
  }, { peak: 0, tags: 'ring jazz soft' });
  def('ring-digital', 'Digital ringtone', 'phone', 3.2, k => {
    for (let r = 0; r < 2; r++) [[1320, 0], [1320, 0.09], [990, 0.18], [1320, 0.36], [1760, 0.45]].forEach(([f, d]) => tone(k, f, r * 1.4 + d, { type: 'square', a: 0.002, hold: 0.06, d: 0.02, gain: 0.07, lp: 4000 }));
  }, { peak: 0, tags: 'ring old mobile beep' });
  def('note-chime', 'Three-note chime', 'phone', 1.4, k => [84, 88, 91].forEach((m, i) => marimba(k, m, i * 0.11, 0.9, null, 1.1)), { peak: 0, tags: 'notification message text' });
  def('note-marimba', 'Marimba note', 'phone', 1.0, k => { marimba(k, 86, 0, 1); marimba(k, 91, 0.12, 0.8); }, { peak: 0, tags: 'notification ping' });
  def('note-glass', 'Glass tap', 'phone', 1.2, k => { tone(k, 2637, 0, { a: 0.001, d: 1, gain: 0.2, send: 0.4 }); tone(k, 2637 * 2.76, 0, { a: 0.001, d: 0.25, gain: 0.05 }); hiss(k, 0, { type: 'highpass', f: 5000, d: 0.01, gain: 0.08 }); }, { peak: 0, tags: 'notification ding crystal' });
  def('note-vibes', 'Soft vibes note', 'phone', 1.6, k => { vibes(k, 81, 0, 1, null, 1.4); vibes(k, 88, 0.09, 0.7, null, 1.4); }, { peak: 0, tags: 'notification calm' });
  def('note-pop', 'Pop note', 'phone', 0.5, k => { tone(k, 880, 0, { to: 1320, glide: 0.04, d: 0.16, gain: 0.35, send: 0.15 }); hiss(k, 0, { type: 'lowpass', f: 2000, d: 0.01, gain: 0.08 }); }, { peak: 0, tags: 'bubble notification sent' });
  def('phone-typing', 'Phone keyboard', 'phone', 2.2, k => {
    let t = 0.03;
    while (t < 2.05) { tone(k, 1500 + rnd() * 120, t, { to: 1150, glide: 0.012, a: 0.001, d: 0.022, gain: 0.32 }); hiss(k, t, { type: 'highpass', f: 3500, q: 0.6, d: 0.006, gain: 0.07 }); t += rnd() < 0.15 ? 0.32 + rnd() * 0.2 : 0.11 + rnd() * 0.09; }
  }, { peak: 0, tags: 'touch screen text message taps' });

  /* ── hits & drums (designed, and fills from the recorded kit) ── */
  def('kick', 'Kick', 'hit', 0.5, k => kick(k, 0), { peak: 0, tags: 'drum bass' });
  def('clap', 'Clap', 'hit', 0.5, k => clap(k, 0), { peak: 0, tags: 'hands' });
  def('drumroll', 'Drum roll', 'hit', 2.4, k => { for (let t = 0, i = 0; t < 1.9; t += 0.05, i++) samp(k, i % 2 ? 'snare-2' : 'snare', t, { gain: 0.15 + t * 0.2, pan: i % 2 ? 0.1 : -0.1 }); samp(k, 'snare', 1.95, { gain: 0.8 }); samp(k, 'crash', 1.95, { gain: 0.6, send: 0.2 }); }, { peak: 1.95, tags: 'reveal suspense', samples: true });
  def('toms', 'Tom fill', 'hit', 1.6, k => { ['tom-high', 'tom-high', 'tom-mid', 'tom-mid', 'tom-low', 'tom-low'].forEach((s, i) => samp(k, s, i * 0.1, { gain: 0.7, pan: 0.3 - i * 0.12 })); kick(k, 0.62); samp(k, 'crash', 0.62, { gain: 0.6 }); }, { peak: 0.62, tags: 'drum fill', samples: true });

  /* ── music beds (loops) ── */
  // a bar-by-bar song: fn(k, barStart, barIndex, beat) for `bars` bars at `bpm`; o.bed = a recorded ambience under it
  function song(bars, bpm, fn, o = {}) {
    const beat = 60 / bpm, dur = bars * 4 * beat;
    return { dur, make: k => { if (o.bed) samp(k, o.bed, 0, { loop: true, dur, gain: o.bedGain || 0.35 }); if (o.crackle) crackle(k, 0, dur); for (let b = 0; b < bars; b++) fn(k, b * 4 * beat, b, beat); } };
  }
  const music = (id, name, s, o) => def(id, name, 'music', s.dur, s.make, Object.assign({ loop: true, peak: 0, gain: 0.75, samples: true }, o));
  const ch = chord;
  const voice = (root, ivs) => ivs.map(i => n(root) + i);
  // a swung eighth: the "and" lands two thirds of the way through the beat
  const sw = (q, x) => Math.floor(x) * q + (x % 1 ? q * 2 / 3 : 0);
  const lofiDrums = (k, t, q, v = 1, swing = 0.16) => {
    const s = q * swing;
    kick(k, t, 0.8 * v); kick(k, t + 2.5 * q + s, 0.5 * v); kick(k, t + 2 * q, 0.6 * v);
    samp(k, 'snare', t + q, { gain: 0.42 * v, lp: 5200, send: 0.1 }); samp(k, 'snare-2', t + 3 * q, { gain: 0.42 * v, lp: 5200, send: 0.1 });
    for (let i = 0; i < 4; i++) { samp(k, 'hat', t + i * q, { gain: 0.2 * v, lp: 7000, pan: 0.2 }); samp(k, 'hat', t + i * q + q / 2 + s, { gain: 0.12 * v, lp: 7000, pan: 0.2 }); }
  };
  {
    const prog = [voice('F3', [0, 4, 7, 11, 14]), voice('E3', [0, 3, 7, 10, 14]), voice('D3', [0, 3, 7, 10, 14]), voice('C3', [0, 4, 7, 11, 14])];
    music('lofi', 'Lo-fi afternoon', song(8, 82, (k, t, b, q) => {
      const c = prog[b % 4]; lofiDrums(k, t, q);
      c.slice(1).forEach((m, i) => epiano(k, m + 12, t + i * 0.012, 4 * q * 0.9, 0.8, null, 0.6));
      ubass(k, c[0] - 12, t, 2 * q, 0.9); ubass(k, c[0] - 12, t + 2.5 * q + q * 0.16, 1.2 * q, 0.7);
    }, { crackle: true }), { tags: 'chill study calm beat', bpm: 82, lofi: true });
  }
  {
    const prog = [voice('A2', [0, 7, 10, 14, 15]), voice('F2', [0, 7, 11, 14, 16]), voice('C3', [0, 4, 7, 11, 14]), voice('G2', [0, 7, 10, 14, 17])];
    music('lofi-rain', 'Lo-fi rain', song(8, 74, (k, t, b, q) => {
      const c = prog[b % 4]; lofiDrums(k, t, q, 0.85, 0.2);
      c.slice(1).forEach((m, i) => epiano(k, m + 12, t + i * 0.015, 4 * q * 0.9, 0.75, null, 0.5));
      epiano(k, c[3] + 24, t + 2.5 * q, q, 0.4, null, 0.4);
      ubass(k, c[0], t, 2.5 * q, 0.9); ubass(k, c[0] + 7, t + 3 * q, q, 0.6);
    }, { bed: 'rain', bedGain: 0.3, crackle: true }), { tags: 'rainy cozy study sleep', bpm: 74, lofi: true });
  }
  {
    const prog = [voice('D3', [0, 3, 7, 10, 14]), voice('G2', [0, 10, 14, 16, 21]), voice('C3', [0, 4, 7, 11, 14]), voice('A2', [0, 4, 10, 13, 19])];
    music('lofi-night', 'Lo-fi night', song(8, 68, (k, t, b, q) => {
      const c = prog[b % 4];
      kick(k, t, 0.7); kick(k, t + 2.5 * q, 0.45); samp(k, 'snare-3', t + q, { gain: 0.35, lp: 4200, send: 0.2 }); samp(k, 'snare-3', t + 3 * q, { gain: 0.35, lp: 4200, send: 0.2 });
      for (let i = 0; i < 8; i++) samp(k, 'hat', t + sw(q, i / 2), { gain: i % 2 ? 0.08 : 0.14, lp: 6000 });
      c.slice(1).forEach((m, i) => epiano(k, m + 12, t + i * 0.02, 4 * q * 0.95, 0.7, null, 0.45));
      ubass(k, c[0] - 12 + 12, t, 3 * q, 0.8);
    }, { bed: 'crickets', bedGain: 0.22, crackle: true }), { tags: 'night chill sleep calm', bpm: 68, lofi: true });
  }
  {
    // a music box melody over a soft beat, in A♭ major (the box's own notes)
    const mel = [[75, 0], [72, 1], [70, 1.5], [68, 2], [72, 3], [75, 4], [77, 5], [79, 6], [77, 6.5], [75, 7], [73, 8], [72, 9], [70, 10], [72, 11], [68, 12], [70, 13], [72, 14], [75, 15]];
    const prog = [voice('Ab2', [0, 7, 11, 16]), voice('F2', [0, 7, 10, 15]), voice('Db3', [0, 7, 11, 16]), voice('Eb3', [0, 7, 10, 17])];
    music('lofi-box', 'Music box lo-fi', song(8, 76, (k, t, b, q) => {
      const c = prog[b % 4]; lofiDrums(k, t, q, 0.8);
      c.slice(1).forEach((m, i) => epiano(k, m + 12, t + i * 0.012, 4 * q * 0.9, 0.55, null, 0.4));
      ubass(k, c[0], t, 2 * q, 0.8); ubass(k, c[0], t + 2.5 * q, q, 0.6);
      for (const [m, at] of mel) if (Math.floor(at / 4) === b % 4) note(k, MBOX, m + 12, t + (at % 4) * q, { gain: 0.32, send: 0.35, pan: 0.15 });
    }, { crackle: true }), { tags: 'cute nostalgic dreamy toy', bpm: 76, lofi: true });
  }
  {
    // ii–V–I in F with turnaround: ride, brushes, walking bass, Rhodes voicings, a swung feel
    const bars = [['G2', [0, 10, 14, 15, 19], [43, 46, 50, 53]], ['C3', [0, 10, 14, 16, 21], [48, 52, 55, 49]], ['F2', [0, 11, 14, 16, 19], [41, 45, 48, 50]], ['D3', [0, 10, 13, 16, 20], [50, 54, 57, 55]],
      ['G2', [0, 10, 14, 15, 19], [43, 50, 46, 45]], ['C3', [0, 10, 14, 16, 21], [48, 47, 46, 45]], ['F2', [0, 11, 14, 16, 19], [41, 43, 45, 48]], ['C3', [0, 10, 13, 16, 20], [48, 46, 45, 44]]];
    music('jazz-slow', 'Slow jazz', song(8, 66, (k, t, b, q) => {
      const [root, iv, walk] = bars[b], v = voice(root, iv);
      // ride: ding, ding-ga, ding, ding-ga
      [[0, 1], [1, 1], [1 + 2 / 3, 0.6], [2, 1], [3, 1], [3 + 2 / 3, 0.6]].forEach(([x, g]) => samp(k, b % 2 && x === 0 ? 'ride-2' : 'ride', t + x * q, { gain: 0.26 * g, pan: 0.35, send: 0.1 }));
      samp(k, 'hat', t + q, { gain: 0.12, pan: 0.3 }); samp(k, 'hat', t + 3 * q, { gain: 0.12, pan: 0.3 });
      for (let i = 0; i < 4; i++) swirl(k, t + i * q, q * 0.9, 0.9);
      tap(k, t + q, 0.8); tap(k, t + 3 * q, 0.8);
      walk.forEach((m, i) => ubass(k, m, t + i * q, q * 0.95, i ? 0.85 : 1));
      // comping: on the "and" of 1 and on 3, a little behind
      v.slice(1).forEach((m, i) => { epiano(k, m + 12, t + q * 2 / 3 + i * 0.01, q * 1.2, 0.7, null, 0.5); epiano(k, m + 12, t + 2 * q + i * 0.01, q * 1.6, 0.6, null, 0.45); });
    }), { tags: 'jazz smooth evening bar restaurant swing', bpm: 66, wet: 0.3 });
  }
  {
    const bars = [['C3', [0, 3, 7, 10, 14]], ['F2', [0, 10, 14, 16, 19]], ['Bb2', [0, 4, 7, 11, 14]], ['G2', [0, 4, 10, 13, 15]]];
    const walks = [[48, 51, 53, 54], [41, 45, 48, 47], [46, 50, 53, 52], [43, 47, 49, 47]];
    music('jazz-cafe', 'Café jazz', song(8, 112, (k, t, b, q) => {
      const [root, iv] = bars[b % 4], v = voice(root, iv);
      [[0, 1], [1, 1], [1 + 2 / 3, 0.55], [2, 1], [3, 1], [3 + 2 / 3, 0.55]].forEach(([x, g]) => samp(k, 'ride', t + x * q, { gain: 0.24 * g, pan: 0.35 }));
      samp(k, 'hat', t + q, { gain: 0.14 }); samp(k, 'hat', t + 3 * q, { gain: 0.14 });
      tap(k, t + 3 * q + q * 2 / 3, 0.6);
      walks[b % 4].forEach((m, i) => ubass(k, m, t + i * q, q * 0.9));
      const hits = b % 2 ? [[0, 1.4], [2 + 2 / 3, 1]] : [[2 / 3, 1.2], [2, 0.8], [3 + 2 / 3, 0.9]];
      for (const [x, len] of hits) v.slice(1).forEach((m, i) => piano(k, m + 12, t + x * q + i * 0.008, len * q, 0.7));
      if (b % 4 === 3) [79, 77, 74, 72].forEach((m, i) => piano(k, m, t + sw(q, i / 2), q * 0.6, 0.6));
    }), { tags: 'coffee shop brunch upbeat swing piano', bpm: 112, wet: 0.28 });
  }
  {
    const prog = [voice('D3', [0, 3, 7, 10, 14]), voice('G2', [0, 10, 14, 16, 21]), voice('C3', [0, 4, 7, 11, 14]), voice('A2', [0, 4, 10, 13, 15])];
    music('bossa', 'Bossa evening', song(8, 128, (k, t, b, q) => {
      const c = prog[b % 4], e = q / 2;
      // rim clicks of the bossa clave, shaker eighths
      [0, 3, 6, 10, 13].forEach(i => samp(k, 'snare-2', t + i * e, { gain: 0.1, rate: 1.9, hp: 1200, pan: -0.25 }));
      for (let i = 0; i < 8; i++) samp(k, 'hat', t + i * e, { gain: i % 2 ? 0.1 : 0.06, rate: 1.3, hp: 4000, pan: 0.3 });
      kick(k, t, 0.35); kick(k, t + 1.5 * q, 0.25); kick(k, t + 2 * q, 0.35); kick(k, t + 3.5 * q, 0.25);
      [[0, 0], [1.5, 1], [2.5, 0], [3, 1]].forEach(([x, up]) => nylon(k, c.slice(1).map(m => m + 12), t + x * q, 0.8, null, up));
      ubass(k, c[0], t, 1.4 * q, 0.85); ubass(k, c[0] + 7, t + 1.5 * q, 0.5 * q, 0.7); ubass(k, c[0], t + 2 * q, 1.4 * q, 0.85); ubass(k, c[0] + 7, t + 3.5 * q, 0.5 * q, 0.7);
    }), { tags: 'brazil latin guitar summer dinner', bpm: 128 });
  }
  {
    const prog = [ch('D3', 'add9'), ch('B2', 'min7'), ch('G2', 'maj7'), ch('A2', 'sus2')];
    music('ambient', 'Ambient haze', song(4, 60, (k, t, b, q) => {
      const c = prog[b % 4];
      pad(k, c.map(m => m + 12), t, 4 * q + 0.8, 1);
      for (let i = 0; i < 6; i++) tone(k, mtof(c[(i * 2) % c.length] + 24), t + i * 0.66 + rnd() * 0.2, { d: 1.4, gain: 0.03, send: 0.8, pan: rnd() - 0.5 });
    }), { tags: 'calm dreamy soft pad meditation', bpm: 60, wet: 0.4 });
  }
  {
    const prog = [ch('A3', 'min'), ch('F3', 'maj'), ch('C4', 'maj'), ch('G3', 'maj')];
    music('piano', 'Piano story', song(8, 72, (k, t, b, q) => {
      const c = prog[b % 4], arp = [c[0], c[1], c[2], c[1] + 12, c[2] + 12, c[1] + 12, c[2], c[1]];
      for (let i = 0; i < 8; i++) piano(k, arp[i] + 12, t + i * q / 2, 1.4, 0.75);
      piano(k, c[0] - 12, t, 3, 0.8); piano(k, c[0], t, 3, 0.45);
    }), { tags: 'emotional sentimental memories', bpm: 72, wet: 0.35 });
  }
  {
    const prog = [ch('A3', 'min7'), ch('A3', 'min7'), ch('D3', 'min7'), ch('E3', 'min7')];
    music('boombap', 'Boom bap', song(8, 90, (k, t, b, q) => {
      const c = prog[b % 4];
      kick(k, t, 1); kick(k, t + 1.75 * q, 0.7); kick(k, t + 2.5 * q, 0.9); samp(k, 'snare', t + q, { gain: 0.6 }); samp(k, 'snare', t + 3 * q, { gain: 0.6 });
      for (let i = 0; i < 8; i++) samp(k, 'hat', t + i * q / 2, { gain: i % 2 ? 0.14 : 0.22 });
      c.forEach((m, i) => piano(k, m + 12, t + i * 0.01, 1.2, i ? 0.55 : 0.85)); piano(k, c[2] + 12, t + 2.5 * q, 0.6, 0.5);
      ubass(k, c[0] - 12, t, q * 1.5); ubass(k, c[0] - 12, t + 2.5 * q, q);
    }), { tags: 'hip hop rap groove', bpm: 90 });
  }
  {
    const prog = [ch('C4', 'maj'), ch('G3', 'maj'), ch('A3', 'min'), ch('F3', 'maj')];
    music('upbeat', 'Upbeat pop', song(8, 118, (k, t, b, q) => {
      const c = prog[b % 4];
      for (let i = 0; i < 4; i++) { const tt = t + i * q; kick(k, tt, 0.9); if (i % 2) { samp(k, 'snare-2', tt, { gain: 0.45 }); clap(k, tt, 0.4); } samp(k, i === 3 ? 'hat-open' : 'hat', tt + q / 2, { gain: 0.22 }); }
      for (let i = 0; i < 8; i++) pluck(k, c[i % 3] + 12, t + i * q / 2, i % 2 ? 0.7 : 1, null, i % 2 ? 0.3 : -0.3);
      for (let i = 0; i < 4; i++) bass(k, c[0] - 12, t + i * q, q * 0.5, 0.9);
      if (b === 7) samp(k, 'crash', t + 4 * q - 0.01, { gain: 0.3 });
    }), { tags: 'happy bright energetic', bpm: 118 });
  }
  {
    const prog = [ch('G3', 'min7'), ch('G3', 'min7'), ch('Eb3', 'maj7'), ch('F3', 'dom7')];
    music('house', 'House groove', song(8, 124, (k, t, b, q) => {
      const c = prog[b % 4];
      for (let i = 0; i < 4; i++) { const tt = t + i * q; kick(k, tt, 1); samp(k, 'hat-open', tt + q / 2, { gain: 0.2 }); if (i % 2) clap(k, tt, 0.5); samp(k, 'hat', tt + q * 0.25, { gain: 0.1 }); samp(k, 'hat', tt + q * 0.75, { gain: 0.1 }); }
      stab(k, c.map(m => m + 12), t + 0.5 * q); stab(k, c.map(m => m + 12), t + 1.75 * q, 0.8); stab(k, c.map(m => m + 12), t + 3 * q, 0.7);
      for (let i = 0; i < 8; i++) if (i % 2) bass(k, c[0] - 12 + (i === 7 ? 12 : 0), t + i * q / 2, q * 0.4, 0.9);
    }), { tags: 'dance club workout', bpm: 124 });
  }
  {
    music('cinematic', 'Cinematic pulse', song(8, 100, (k, t, b, q) => {
      const root = [n('D2'), n('D2'), n('Bb1'), n('C2')][b % 4];
      for (let i = 0; i < 8; i++) tone(k, mtof(root + (i % 4 === 3 ? 12 : 0)), t + i * q / 2, { type: 'sawtooth', a: 0.005, d: 0.18, gain: 0.12, lp: [1800, 300, 0.15] });
      pad(k, [root + 24, root + 27, root + 31], t, 4 * q, 0.8);
      samp(k, 'tom-low', t, { gain: 0.7, send: 0.3 }); if (b % 2) { samp(k, 'tom-mid', t + 3 * q, { gain: 0.6, send: 0.3 }); samp(k, 'tom-low', t + 3.5 * q, { gain: 0.7, send: 0.3 }); }
      if (b === 7) hiss(k, t + 2 * q, { type: 'lowpass', f: 1200, to: 11000, glide: 2 * q, q: 0.4, a: 2 * q - 0.02, d: 0.03, gain: 0.4 });
      if (b === 0 || b === 4) samp(k, 'crash', t, { gain: 0.35, send: 0.3 });
    }), { tags: 'epic tension trailer drama', bpm: 100 });
  }
  {
    // mbira (thumb piano) over a soft pulse, in F minor pentatonic — the instrument's own notes
    const MB = [['mbira-1', 65], ['mbira-2', 72], ['mbira-3', 77], ['mbira-4', 80], ['mbira-5', 84]];
    const pat = [65, 72, 77, 72, 80, 77, 84, 77, 65, 72, 80, 72, 77, 72, 84, 80];
    music('mbira', 'Thumb piano', song(8, 96, (k, t, b, q) => {
      pat.forEach((m, i) => { if ((i + b) % 7 !== 6) note(k, MB, m, t + i * q / 4, { gain: i % 4 ? 0.3 : 0.42, pan: (i % 2 ? 0.2 : -0.2), send: 0.25 }); });
      kick(k, t, 0.4); kick(k, t + 2 * q, 0.35); samp(k, 'snare-3', t + 3 * q, { gain: 0.15, lp: 3000 });
      bass(k, b % 4 === 3 ? n('Db2') : n('F2'), t, 3.5 * q, 0.6);
    }), { tags: 'warm acoustic travel world organic', bpm: 96 });
  }

  X.byId = Object.fromEntries(X.LIST.map(s => [s.id, s]));
  // sounds that were renamed or replaced by recordings keep working in older designs
  X.ALIAS = { swipe: 'swish-snap', pop: 'flick', bubble: 'flick', boing: 'swish', bounce: 'thump', 'slide-up': 'swish', 'slide-down': 'swish', zip: 'swish-snap', wobble: 'swish',
    click: 'mouse', tick: 'clock', typing: 'laptop', notify: 'notify-1', success: 'note-chime', error: 'notify-4', enter: 'typewriter-bell', projector: 'proj8', flash: 'shutter-dslr',
    instant: 'film-wind', rewind: 'reel', glitch: 'flicker-quick', static: 'flicker', stutter: 'flicker-quick', bitcrush: 'flicker', sparkle: 'ding-soft', chime: 'note-chime',
    shimmer: 'note-vibes', ding: 'ding-bright', levelup: 'note-chime', fairy: 'ding-soft', drill: 'boombap' };
  X.get = id => X.byId[id] || X.byId[X.ALIAS[id]] || null;
  // which effect fits a transition, an entrance or a plain cut
  X.FOR_TRANSITION = { cut: 'swish', fade: 'whoosh-soft', black: 'impact', white: 'flicker', slide: 'whoosh', push: 'whoosh-big', whip: 'whoosh-quick', wipe: 'swish-snap', iris: 'flick', zoom: 'whoosh-pass', blur: 'whoosh-air', spin: 'swish', glitch: 'flicker-quick' };
  X.FOR_ENTRANCE = { pop: 'flick', drop: 'thud', bounce: 'thump', rise: 'swish', slide: 'swish', zoom: 'whoosh-air', spin: 'swish', typewriter: 'laptop', wipe: 'swish-snap', land: 'thud', build: 'mouse', shuffle: 'swish', focus: 'whoosh-soft', draw: 'pencil' };
  X.credit = 'Recorded sounds: Joseph Sardin — BigSoundBank.com (CC0). Designed sounds and music made in the app.';

  // render one sound to a file (cached): recordings as they are, designed sounds through an offline mix
  const cache = new Map();
  X.render = function (id) {
    const s = X.get(id);
    if (!s) return Promise.resolve(null);
    if (cache.has(s.id)) return cache.get(s.id);
    const p = (async () => {
      if (s.rec) return new Blob([dataBytes(P()[s.id].src)], { type: 'audio/mpeg' });
      seed = 1 + [...s.id].reduce((a, ch2) => a * 31 + ch2.charCodeAt(0), 7) % 100000;
      const tail = s.loop ? 0 : 0.6;
      const c = new OfflineAudioContext(2, Math.ceil((s.dur + tail) * RATE), RATE);
      const k = desk(c, { wet: s.wet, gain: s.gain, noise: Math.min(6, s.dur + 1), lofi: s.lofi });
      k.s = {};
      if (s.samples) { const keys = Object.keys(P()).filter(key => !P()[key].name || P()[key].cat === 'hit' || ['rain', 'crickets'].includes(key)); await Promise.all(keys.map(async key => { k.s[key] = await sample(key); })); }
      s.fn(k);
      const buf = await c.startRendering();
      level(buf, s.cat === 'music');
      return wav(buf);
    })().catch(err => { console.warn('sound', id, err); cache.delete(s.id); return null; });
    cache.set(s.id, p);
    return p;
  };

  // even levels across the library: effects peak at -1.5 dB, music beds are matched by loudness (and kept under full scale)
  function level(b, isMusic) {
    const ch = [...Array(b.numberOfChannels)].map((_, i) => b.getChannelData(i));
    let pk = 0, sq = 0, cnt = 0;
    for (const d of ch) for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; sq += d[i] * d[i]; cnt++; }
    if (!pk) return;
    const rms = Math.sqrt(sq / cnt), g = isMusic ? Math.min(0.16 / Math.max(1e-4, rms), 3 / pk) : 0.84 / pk;
    for (const d of ch) for (let i = 0; i < d.length; i++) { const x = d[i] * g, a = Math.abs(x); d[i] = a > 0.9 ? Math.sign(x) * (0.9 + 0.09 * Math.tanh((a - 0.9) / 0.09)) : x; }
  }
  function wav(b) {
    const ch = b.numberOfChannels, len = b.length, rate = b.sampleRate, out = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, rate, true); out.setUint32(28, rate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, len * ch * 2, true);
    const pl = [...Array(ch)].map((_, i) => b.getChannelData(i));
    for (let i = 0, o = 44; i < len; i++) for (let c = 0; c < ch; c++, o += 2) out.setInt16(o, Math.max(-1, Math.min(1, pl[c][i])) * 32767, true);
    return new Blob([out.buffer], { type: 'audio/wav' });
  }
})();
