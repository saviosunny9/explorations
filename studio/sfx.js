/* Savio's editor — the sound library.
   Every sound effect and music bed is synthesized in the browser (Web Audio, rendered offline into a WAV), so nothing
   third-party is bundled and the library costs no download. A sound is used through the asset id 'sfx-<key>'; its file is
   made the first time it's needed (S.ensureSound in app.js) and never saved with a project — it's rebuilt the same way.

   window.StudioSfx = { CATS, LIST: [{ id, name, cat, dur, tags, loop, bpm }], byId, render(id) → Promise<Blob> } */
(function () {
  'use strict';
  const X = window.StudioSfx = {};
  const RATE = 48000;
  X.CATS = [['music', 'Music'], ['transition', 'Transitions'], ['motion', 'Motion'], ['ui', 'Interface'], ['camera', 'Camera & film'], ['glitch', 'Glitch'], ['hit', 'Hits & drums'], ['magic', 'Magic']];
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
    master.connect(comp); comp.connect(c.destination);
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
  const snare = (k, t, v = 1, dest) => { hiss(k, t, { type: 'highpass', f: 1400, q: 0.5, d: 0.17, gain: 0.42 * v, dest, send: 0.15 }); tone(k, 200, t, { type: 'triangle', to: 160, glide: 0.08, d: 0.11, gain: 0.4 * v, dest }); };
  const hat = (k, t, v = 1, open = false, dest) => hiss(k, t, { type: 'highpass', f: 7500, q: 0.4, d: open ? 0.26 : 0.035, gain: (open ? 0.18 : 0.15) * v, dest, pan: 0.15 });
  const clap = (k, t, v = 1, dest) => { for (let i = 0; i < 3; i++) hiss(k, t + i * 0.011, { f: 1300, q: 1.4, d: 0.025, gain: 0.32 * v, dest }); hiss(k, t + 0.033, { f: 1200, q: 1, d: 0.16, gain: 0.3 * v, dest, send: 0.3 }); };
  const tom = (k, t, f, v = 1, dest) => tone(k, f, t, { to: f * 0.62, glide: 0.25, d: 0.45, gain: 0.6 * v, dest, send: 0.2 });
  function rhodes(k, m, t, dur, v = 1, dest) {
    const f = mtof(m);
    tone(k, f, t, { a: 0.006, hold: dur * 0.35, d: dur * 0.65, gain: 0.16 * v, vib: [4.6, f * 0.004], dest, send: 0.25 });
    tone(k, f * 2, t, { a: 0.004, d: dur * 0.5, gain: 0.05 * v, dest });
    tone(k, f * 3.01, t, { a: 0.002, d: 0.12, gain: 0.025 * v, dest });
  }
  function piano(k, m, t, dur, v = 1, dest) {
    const f = mtof(m);
    tone(k, f, t, { type: 'triangle', a: 0.003, d: dur, gain: 0.2 * v, lp: [5000, 900, dur], dest, send: 0.3 });
    tone(k, f * 2.003, t, { a: 0.002, d: dur * 0.4, gain: 0.05 * v, dest });
  }
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

  /* ── transitions ── */
  def('whoosh', 'Whoosh', 'transition', 0.9, k => { hiss(k, 0, { f: 260, to: 2600, glide: 0.38, to2: 500, glide2: 0.4, q: 1.3, a: 0.36, d: 0.45, gain: 0.85, pan: [-0.7, 0.7, 0, 0.8], send: 0.3 }); hiss(k, 0.05, { type: 'lowpass', f: 300, to: 900, glide: 0.35, a: 0.32, d: 0.4, gain: 0.35 }); }, { peak: 0.36, tags: 'swoosh air pass' });
  def('whoosh-soft', 'Soft whoosh', 'transition', 0.8, k => hiss(k, 0, { type: 'lowpass', f: 400, to: 1600, glide: 0.35, to2: 350, glide2: 0.35, q: 0.8, a: 0.33, d: 0.42, gain: 0.6, pan: [-0.4, 0.4, 0, 0.7], send: 0.25 }), { peak: 0.33, tags: 'gentle air' });
  def('swish', 'Swish', 'transition', 0.45, k => hiss(k, 0, { f: 900, to: 4500, glide: 0.16, to2: 1500, glide2: 0.2, q: 1.6, a: 0.14, d: 0.25, gain: 0.7, pan: [-0.8, 0.8, 0, 0.35], send: 0.2 }), { peak: 0.14, tags: 'fast swoosh' });
  def('swipe', 'Swipe', 'transition', 0.3, k => hiss(k, 0, { type: 'highpass', f: 2000, to: 6500, glide: 0.12, q: 0.6, a: 0.08, d: 0.16, gain: 0.55, pan: [-0.9, 0.9, 0, 0.25] }), { peak: 0.08, tags: 'phone slide' });
  def('whip', 'Whip', 'transition', 0.35, k => { hiss(k, 0, { f: 700, to: 5200, glide: 0.07, q: 2.2, a: 0.06, d: 0.12, gain: 0.85, pan: [-0.5, 0.6, 0, 0.12] }); tone(k, 3000, 0.07, { type: 'triangle', d: 0.03, gain: 0.25 }); }, { peak: 0.07, tags: 'crack whip pan' });
  def('riser', 'Riser', 'transition', 2.2, k => {
    hiss(k, 0, { f: 300, to: 6000, glide: 2.1, q: 2, a: 2.05, d: 0.08, gain: 0.55, send: 0.35 });
    tone(k, 110, 0, { type: 'sawtooth', to: 880, glide: 2.1, a: 2.05, d: 0.08, gain: 0.16, lp: [500, 6000, 2.1], vib: [6, 4] });
    tone(k, 220, 0, { type: 'sawtooth', to: 1760, glide: 2.1, a: 2.05, d: 0.08, gain: 0.08, lp: [600, 7000, 2.1], detune: 9 });
  }, { peak: 2.1, tags: 'build up tension' });
  def('drop', 'Down sweep', 'transition', 1.4, k => { hiss(k, 0, { f: 6000, to: 180, glide: 1.2, q: 1.5, a: 0.03, d: 1.3, gain: 0.5, send: 0.3 }); tone(k, 900, 0, { to: 50, glide: 1.1, a: 0.02, d: 1.3, gain: 0.3 }); }, { peak: 0.03, tags: 'fall down drop' });
  def('reverse', 'Reverse swell', 'transition', 1.4, k => hiss(k, 0, { type: 'lowpass', f: 1200, to: 11000, glide: 1.35, q: 0.4, a: 1.35, d: 0.03, gain: 0.7, send: 0.2 }), { peak: 1.35, tags: 'reverse cymbal suck' });
  def('impact', 'Impact boom', 'transition', 2.4, k => { tone(k, 120, 0, { to: 36, glide: 0.7, d: 2.2, gain: 1 }); hiss(k, 0, { type: 'lowpass', f: 900, to: 120, glide: 0.4, q: 0.5, d: 0.6, gain: 0.7, send: 0.6 }); hiss(k, 0, { type: 'highpass', f: 3000, d: 0.08, gain: 0.3 }); }, { peak: 0, wet: 0.35, tags: 'boom hit trailer cinematic' });
  def('tape-stop', 'Tape stop', 'transition', 0.9, k => { tone(k, 330, 0, { type: 'sawtooth', to: 28, glide: 0.8, hold: 0.6, d: 0.2, gain: 0.25, lp: [3000, 200, 0.8] }); tone(k, 165, 0, { type: 'square', to: 18, glide: 0.8, hold: 0.6, d: 0.2, gain: 0.1, lp: 900 }); }, { peak: 0, tags: 'slow down stop' });

  /* ── motion ── */
  def('pop', 'Pop', 'motion', 0.25, k => { tone(k, 950, 0, { to: 170, glide: 0.07, d: 0.11, gain: 0.7 }); hiss(k, 0, { f: 2400, q: 1, d: 0.02, gain: 0.2 }); }, { peak: 0, tags: 'appear bubble' });
  def('bubble', 'Bubble', 'motion', 0.25, k => tone(k, 280, 0, { to: 1300, glide: 0.07, d: 0.12, gain: 0.55, send: 0.15 }), { peak: 0, tags: 'blip water' });
  def('boing', 'Boing', 'motion', 0.8, k => tone(k, 170, 0, { type: 'triangle', to: 330, glide: 0.5, d: 0.7, gain: 0.55, vib: [17, 45] }), { peak: 0, tags: 'spring bounce cartoon' });
  def('bounce', 'Bounce', 'motion', 0.6, k => { tone(k, 700, 0, { to: 160, glide: 0.08, d: 0.12, gain: 0.6 }); tone(k, 560, 0.2, { to: 140, glide: 0.08, d: 0.12, gain: 0.4 }); tone(k, 460, 0.34, { to: 120, glide: 0.06, d: 0.1, gain: 0.25 }); }, { peak: 0, tags: 'ball' });
  def('slide-up', 'Slide up', 'motion', 0.7, k => tone(k, 400, 0, { to: 1700, glide: 0.6, a: 0.03, hold: 0.5, d: 0.1, gain: 0.4, vib: [7, 10], send: 0.2 }), { peak: 0.3, tags: 'whistle rise' });
  def('slide-down', 'Slide down', 'motion', 0.7, k => tone(k, 1600, 0, { to: 380, glide: 0.6, a: 0.03, hold: 0.5, d: 0.1, gain: 0.4, vib: [7, 10], send: 0.2 }), { peak: 0.3, tags: 'whistle fall' });
  def('zip', 'Zip', 'motion', 0.3, k => tone(k, 250, 0, { type: 'sawtooth', to: 3200, glide: 0.2, a: 0.01, hold: 0.15, d: 0.08, gain: 0.22, lp: [1500, 6000, 0.2] }), { peak: 0.1, tags: 'zipper quick' });
  def('wobble', 'Wobble', 'motion', 0.7, k => tone(k, 260, 0, { type: 'triangle', d: 0.65, gain: 0.5, vib: [11, 60] }), { peak: 0, tags: 'jelly spring' });
  def('thud', 'Soft thud', 'motion', 0.4, k => { tone(k, 110, 0, { to: 55, glide: 0.1, d: 0.3, gain: 0.8 }); hiss(k, 0, { type: 'lowpass', f: 500, d: 0.08, gain: 0.3 }); }, { peak: 0, tags: 'land drop' });

  /* ── interface ── */
  def('click', 'Click', 'ui', 0.12, k => { tone(k, 2100, 0, { type: 'square', d: 0.012, gain: 0.25 }); hiss(k, 0, { type: 'highpass', f: 4000, d: 0.01, gain: 0.25 }); }, { peak: 0, tags: 'mouse tap button' });
  def('tick', 'Tick', 'ui', 0.12, k => { tone(k, 1250, 0, { type: 'triangle', d: 0.045, gain: 0.45 }); hiss(k, 0, { f: 3000, q: 3, d: 0.02, gain: 0.25 }); }, { peak: 0, tags: 'wood block clock' });
  def('typing', 'Typing', 'ui', 1.6, k => { let t = 0.02; while (t < 1.5) { hiss(k, t, { f: 2500 + rnd() * 1800, q: 2, d: 0.018, gain: 0.35 + rnd() * 0.2, pan: rnd() * 0.6 - 0.3 }); tone(k, 180 + rnd() * 60, t, { d: 0.03, gain: 0.15 }); t += 0.07 + rnd() * 0.12; } }, { peak: 0, tags: 'keyboard keys' });
  def('notify', 'Notification', 'ui', 0.9, k => { tone(k, 880, 0, { d: 0.5, gain: 0.32, send: 0.3 }); tone(k, 1320, 0.12, { d: 0.7, gain: 0.3, send: 0.3 }); tone(k, 2640, 0.12, { d: 0.25, gain: 0.05 }); }, { peak: 0, tags: 'message ding alert' });
  def('success', 'Success', 'ui', 0.9, k => [72, 76, 79, 84].forEach((m, i) => { tone(k, mtof(m), i * 0.07, { d: 0.5, gain: 0.22, send: 0.3 }); tone(k, mtof(m) * 2, i * 0.07, { type: 'triangle', d: 0.2, gain: 0.05 }); }), { peak: 0, tags: 'done complete correct' });
  def('error', 'Error', 'ui', 0.5, k => { tone(k, 180, 0, { type: 'square', d: 0.14, hold: 0.06, gain: 0.16, lp: 1400 }); tone(k, 140, 0.22, { type: 'square', d: 0.16, hold: 0.06, gain: 0.16, lp: 1400 }); }, { peak: 0, tags: 'wrong buzz' });
  def('message', 'Message pop', 'ui', 0.35, k => { tone(k, 620, 0, { to: 940, glide: 0.05, d: 0.12, gain: 0.4 }); tone(k, 1250, 0.07, { d: 0.18, gain: 0.25, send: 0.2 }); }, { peak: 0, tags: 'chat text bubble' });
  def('enter', 'Return key', 'ui', 0.25, k => { hiss(k, 0, { f: 1800, q: 1.5, d: 0.04, gain: 0.5 }); tone(k, 120, 0, { d: 0.06, gain: 0.3 }); hiss(k, 0.06, { f: 2600, q: 2, d: 0.02, gain: 0.25 }); }, { peak: 0, tags: 'keyboard' });

  /* ── camera & film ── */
  def('shutter', 'Camera shutter', 'camera', 0.35, k => { hiss(k, 0, { type: 'highpass', f: 2500, d: 0.018, gain: 0.7 }); hiss(k, 0.005, { f: 1400, q: 1.5, d: 0.05, gain: 0.35 }); hiss(k, 0.085, { type: 'highpass', f: 2000, d: 0.02, gain: 0.55 }); tone(k, 240, 0.085, { d: 0.04, gain: 0.25 }); }, { peak: 0, tags: 'photo snap' });
  def('projector', 'Film projector', 'camera', 3, k => { for (let t = 0; t < 3; t += 1 / 24) hiss(k, t, { f: 1800 + rnd() * 400, q: 2.5, d: 0.012, gain: 0.22 }); tone(k, 60, 0, { type: 'sawtooth', a: 0.2, hold: 2.5, d: 0.3, gain: 0.05, lp: 240 }); hiss(k, 0, { type: 'lowpass', f: 400, a: 0.2, hold: 2.5, d: 0.3, gain: 0.05 }); }, { peak: 0, loop: true, tags: 'reel 8mm vintage' });
  def('flash', 'Flash charge', 'camera', 1.4, k => { tone(k, 900, 0, { to: 7000, glide: 1.15, a: 1.1, d: 0.05, gain: 0.05 }); hiss(k, 1.18, { type: 'highpass', f: 3000, d: 0.03, gain: 0.6 }); tone(k, 300, 1.18, { d: 0.05, gain: 0.2 }); }, { peak: 1.18, tags: 'camera flash whine' });
  def('instant', 'Instant photo', 'camera', 1.1, k => { hiss(k, 0, { type: 'highpass', f: 2600, d: 0.02, gain: 0.6 }); tone(k, 140, 0.12, { type: 'sawtooth', a: 0.05, hold: 0.75, d: 0.1, gain: 0.08, lp: 600, vib: [30, 12] }); hiss(k, 0.12, { f: 900, q: 1.2, a: 0.05, hold: 0.75, d: 0.1, gain: 0.12 }); }, { peak: 0, tags: 'polaroid print whirr' });
  def('rewind', 'Tape rewind', 'camera', 1.2, k => { tone(k, 400, 0, { type: 'sawtooth', to: 2400, glide: 1, a: 0.1, hold: 0.9, d: 0.1, gain: 0.06, lp: 2500, vib: [22, 60] }); hiss(k, 0, { f: 2000, to: 4500, glide: 1, q: 1, a: 0.1, hold: 0.9, d: 0.1, gain: 0.2 }); }, { peak: 0, tags: 'vhs fast' });

  /* ── glitch ── */
  def('glitch', 'Glitch burst', 'glitch', 0.6, k => { let t = 0; while (t < 0.55) { const d = 0.015 + rnd() * 0.05; if (rnd() < 0.75) tone(k, 80 + rnd() * 2400, t, { type: rnd() < 0.5 ? 'square' : 'sawtooth', a: 0.001, hold: d * 0.8, d: 0.005, gain: 0.08 + rnd() * 0.1, pan: rnd() * 1.6 - 0.8 }); else hiss(k, t, { type: 'highpass', f: 1000 + rnd() * 5000, a: 0.001, hold: d, d: 0.005, gain: 0.25 }); t += d; } }, { peak: 0, tags: 'digital error data' });
  def('static', 'Static', 'glitch', 0.8, k => { for (let t = 0; t < 0.75; t += 0.03 + rnd() * 0.05) hiss(k, t, { f: 600 + rnd() * 5000, q: 0.6, a: 0.002, hold: 0.02 + rnd() * 0.04, d: 0.01, gain: 0.2 + rnd() * 0.3 }); }, { peak: 0, tags: 'tv noise radio' });
  def('stutter', 'Stutter', 'glitch', 0.7, k => { let t = 0, d = 0.12; for (let i = 0; i < 9; i++) { tone(k, 330, t, { type: 'square', a: 0.001, hold: d * 0.45, d: 0.005, gain: 0.12, lp: 2500 }); t += d; d *= 0.8; } }, { peak: 0, tags: 'repeat stammer' });
  def('bitcrush', 'Data drop', 'glitch', 0.9, k => { for (let i = 0; i < 12; i++) tone(k, 1800 / (1 + i * 0.6), i * 0.06, { type: 'square', a: 0.001, hold: 0.04, d: 0.01, gain: 0.1 }); }, { peak: 0, tags: '8-bit computer' });

  /* ── hits & drums ── */
  def('kick', 'Kick', 'hit', 0.5, k => kick(k, 0), { peak: 0, tags: 'drum bass' });
  def('snare', 'Snare', 'hit', 0.4, k => snare(k, 0), { peak: 0, tags: 'drum' });
  def('clap', 'Clap', 'hit', 0.5, k => clap(k, 0), { peak: 0, tags: 'hands' });
  def('crash', 'Cymbal crash', 'hit', 2.2, k => { hiss(k, 0, { type: 'highpass', f: 5000, q: 0.3, d: 2, gain: 0.4, send: 0.3 }); hiss(k, 0, { f: 3500, q: 0.8, d: 0.5, gain: 0.25 }); }, { peak: 0, tags: 'cymbal' });
  def('drumroll', 'Drum roll', 'hit', 2.2, k => { for (let t = 0, i = 0; t < 1.9; t += 0.045, i++) snare(k, t, 0.35 + t * 0.3); snare(k, 1.95, 1.1); hiss(k, 1.95, { type: 'highpass', f: 5000, q: 0.3, d: 1.2, gain: 0.35, send: 0.3 }); }, { peak: 1.95, tags: 'reveal suspense' });
  def('scratch', 'Record scratch', 'hit', 0.6, k => { hiss(k, 0, { f: 500, to: 2600, glide: 0.12, to2: 400, glide2: 0.14, q: 3, a: 0.02, d: 0.26, gain: 0.8 }); hiss(k, 0.3, { f: 450, to: 2200, glide: 0.1, q: 3, a: 0.02, d: 0.18, gain: 0.6 }); }, { peak: 0, tags: 'dj vinyl stop' });
  def('toms', 'Tom fill', 'hit', 1, k => { [220, 180, 150, 120].forEach((f, i) => tom(k, i * 0.12, f)); kick(k, 0.5); hiss(k, 0.5, { type: 'highpass', f: 5000, d: 1, gain: 0.3, send: 0.3 }); }, { peak: 0.5, tags: 'drum fill' });

  /* ── magic ── */
  def('sparkle', 'Sparkle', 'magic', 1.4, k => { for (let i = 0; i < 16; i++) { const t = rnd() * 0.9; tone(k, 2200 + rnd() * 4200, t, { d: 0.15 + rnd() * 0.25, gain: 0.06 + rnd() * 0.06, pan: rnd() * 1.6 - 0.8, send: 0.6 }); } }, { peak: 0, wet: 0.4, tags: 'glitter shine twinkle' });
  def('chime', 'Chime', 'magic', 2, k => [1, 2.76, 5.4, 8.93].forEach((p, i) => tone(k, 1046 * p, 0, { d: 1.8 / (1 + i * 0.7), gain: 0.18 / (1 + i), send: 0.4 })), { peak: 0, tags: 'bell soft' });
  def('shimmer', 'Shimmer', 'magic', 2.2, k => [72, 76, 79, 83, 88].forEach((m, i) => tone(k, mtof(m), i * 0.08, { a: 0.7, hold: 0.6, d: 0.8, gain: 0.07, vib: [6 + i, 6], send: 0.6 })), { peak: 0.7, wet: 0.45, tags: 'dream reveal' });
  def('ding', 'Ding', 'magic', 1.2, k => { tone(k, 1568, 0, { d: 1, gain: 0.3, send: 0.35 }); tone(k, 3136, 0, { d: 0.4, gain: 0.07 }); }, { peak: 0, tags: 'idea bell' });
  def('levelup', 'Level up', 'magic', 0.8, k => [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => tone(k, mtof(m), i * 0.055, { type: 'square', d: 0.12, gain: 0.06, lp: 4000 })), { peak: 0, tags: 'game win 8-bit' });
  def('fairy', 'Fairy dust', 'magic', 1.6, k => { for (let i = 0; i < 22; i++) { const t = i * 0.055; tone(k, mtof(84 + Math.round(rnd() * 14)), t, { d: 0.25, gain: 0.05 * (1 - i / 26), pan: Math.sin(i) * 0.7, send: 0.7 }); } }, { peak: 0, wet: 0.45, tags: 'wand magic cascade' });

  /* ── music beds (loops) ── */
  // a bar-by-bar song: fn(k, barStart, barIndex, beat) for `bars` bars at `bpm`
  function song(bars, bpm, fn) { const beat = 60 / bpm; return { dur: bars * 4 * beat, make: k => { for (let b = 0; b < bars; b++) fn(k, b * 4 * beat, b, beat); } }; }
  const music = (id, name, s, o) => def(id, name, 'music', s.dur, s.make, Object.assign({ loop: true, peak: 0, gain: 0.75 }, o));
  {
    const prog = [chord('F3', 'maj7'), chord('E3', 'min7'), chord('D3', 'min7'), chord('C3', 'maj7')];
    music('lofi', 'Lo-fi afternoon', song(8, 82, (k, t, b, q) => {
      const c = prog[b % 4], sw = q * 0.16;
      if (b === 0) crackle(k, 0, 8 * 4 * q);
      for (let i = 0; i < 4; i++) { const tt = t + i * q; if (i === 0 || i === 2) kick(k, tt, 0.8); if (i === 1 || i === 3) snare(k, tt, 0.55); hat(k, tt, 0.6); hat(k, tt + q / 2 + sw, 0.45); }
      kick(k, t + 2.5 * q + sw, 0.5);
      for (const m of c) rhodes(k, m + 12, t, 4 * q * 0.95, 0.9);
      bass(k, c[0] - 12, t, 2 * q); bass(k, c[0] - 12, t + 2.5 * q + sw, 1.3 * q, 0.8);
    }), { tags: 'chill study calm beat', bpm: 82 });
  }
  {
    const prog = [chord('C4', 'maj'), chord('G3', 'maj'), chord('A3', 'min'), chord('F3', 'maj')];
    music('upbeat', 'Upbeat pop', song(8, 118, (k, t, b, q) => {
      const c = prog[b % 4];
      for (let i = 0; i < 4; i++) { const tt = t + i * q; kick(k, tt, 0.9); if (i % 2) clap(k, tt, 0.6); hat(k, tt + q / 2, 0.7, i === 3); }
      for (let i = 0; i < 8; i++) pluck(k, c[i % 3] + 12, t + i * q / 2, i % 2 ? 0.7 : 1, null, i % 2 ? 0.3 : -0.3);
      for (let i = 0; i < 4; i++) bass(k, c[0] - 12, t + i * q, q * 0.5, 0.9);
    }), { tags: 'happy bright energetic', bpm: 118 });
  }
  {
    const prog = [chord('D3', 'add9'), chord('B2', 'min7'), chord('G2', 'maj7'), chord('A2', 'sus2')];
    music('ambient', 'Ambient haze', song(4, 60, (k, t, b, q) => {
      const c = prog[b % 4];
      pad(k, c.map(m => m + 12), t, 4 * q + 0.8, 1);
      for (let i = 0; i < 6; i++) tone(k, mtof(c[(i * 2) % c.length] + 24), t + i * 0.66 + rnd() * 0.2, { d: 1.4, gain: 0.03, send: 0.8, pan: rnd() - 0.5 });
    }), { tags: 'calm dreamy soft pad', bpm: 60, wet: 0.4 });
  }
  {
    const prog = [chord('A3', 'min7'), chord('A3', 'min7'), chord('D3', 'min7'), chord('E3', 'min7')];
    music('boombap', 'Boom bap', song(8, 90, (k, t, b, q) => {
      const c = prog[b % 4];
      kick(k, t, 1); kick(k, t + 1.75 * q, 0.7); kick(k, t + 2.5 * q, 0.9); snare(k, t + q, 0.8); snare(k, t + 3 * q, 0.8);
      for (let i = 0; i < 8; i++) hat(k, t + i * q / 2, i % 2 ? 0.45 : 0.7);
      piano(k, c[0] + 12, t, 1.2, 0.9); for (const m of c.slice(1)) piano(k, m + 12, t, 1.2, 0.6);
      piano(k, c[2] + 12, t + 2.5 * q, 0.6, 0.5);
      bass(k, c[0] - 12, t, q * 1.5); bass(k, c[0] - 12, t + 2.5 * q, q);
    }), { tags: 'hip hop rap groove', bpm: 90 });
  }
  {
    music('cinematic', 'Cinematic pulse', song(8, 100, (k, t, b, q) => {
      const root = [n('D2'), n('D2'), n('Bb1'), n('C2')][b % 4];
      for (let i = 0; i < 8; i++) tone(k, mtof(root + (i % 4 === 3 ? 12 : 0)), t + i * q / 2, { type: 'sawtooth', a: 0.005, d: 0.18, gain: 0.12, lp: [1800, 300, 0.15] });
      pad(k, [root + 24, root + 27, root + 31], t, 4 * q, 0.8);
      tom(k, t, 120, 0.8); if (b % 2) { tom(k, t + 3 * q, 150, 0.6); tom(k, t + 3.5 * q, 120, 0.7); }
      if (b === 7) hiss(k, t + 2 * q, { type: 'lowpass', f: 1200, to: 11000, glide: 2 * q, q: 0.4, a: 2 * q - 0.02, d: 0.03, gain: 0.4 });
    }), { tags: 'epic tension trailer drama', bpm: 100 });
  }
  {
    const prog = [chord('G3', 'min7'), chord('G3', 'min7'), chord('Eb3', 'maj7'), chord('F3', 'dom7')];
    music('house', 'House groove', song(8, 124, (k, t, b, q) => {
      const c = prog[b % 4];
      for (let i = 0; i < 4; i++) { const tt = t + i * q; kick(k, tt, 1); hat(k, tt + q / 2, 0.8, true); if (i % 2) clap(k, tt, 0.5); hat(k, tt + q * 0.25, 0.3); hat(k, tt + q * 0.75, 0.3); }
      stab(k, c.map(m => m + 12), t + 0.5 * q); stab(k, c.map(m => m + 12), t + 1.75 * q, 0.8); stab(k, c.map(m => m + 12), t + 3 * q, 0.7);
      for (let i = 0; i < 8; i++) if (i % 2) bass(k, c[0] - 12 + (i === 7 ? 12 : 0), t + i * q / 2, q * 0.4, 0.9);
    }), { tags: 'dance club workout', bpm: 124 });
  }
  {
    const prog = [chord('C4', 'maj'), chord('E3', 'min'), chord('F3', 'maj'), chord('G3', 'maj')];
    music('sunny', 'Sunny pluck', song(8, 104, (k, t, b, q) => {
      const c = prog[b % 4], pat = [0, 1, 2, 1, 0, 2, 1, 2];
      for (let i = 0; i < 8; i++) pluck(k, c[pat[i]] + (i > 3 ? 12 : 0), t + i * q / 2, 0.8, null, (i % 2 ? 0.25 : -0.25));
      clap(k, t + q, 0.45); clap(k, t + 3 * q, 0.45); kick(k, t, 0.6); kick(k, t + 2 * q, 0.5);
      for (let i = 0; i < 4; i++) hat(k, t + i * q + q / 2, 0.4);
      bass(k, c[0] - 12, t, 2 * q, 0.7); bass(k, c[0] - 12 + 7, t + 2 * q, 2 * q, 0.6);
    }), { tags: 'happy summer travel vlog acoustic', bpm: 104 });
  }
  {
    const prog = [chord('A3', 'min'), chord('F3', 'maj'), chord('C4', 'maj'), chord('G3', 'maj')];
    music('piano', 'Piano story', song(8, 72, (k, t, b, q) => {
      const c = prog[b % 4], arp = [c[0], c[1], c[2], c[1] + 12, c[2] + 12, c[1] + 12, c[2], c[1]];
      for (let i = 0; i < 8; i++) piano(k, arp[i] + 12, t + i * q / 2, 1.6, 0.7);
      piano(k, c[0] - 12, t, 3, 0.8); piano(k, c[0], t, 3, 0.5);
    }), { tags: 'emotional sentimental memories', bpm: 72, wet: 0.35 });
  }
  {
    music('drill', 'Dark trap', song(8, 140, (k, t, b, q) => {
      const root = [n('F#2'), n('F#2'), n('D2'), n('E2')][b % 4];
      kick(k, t, 1); kick(k, t + 2.75 * q, 0.8); snare(k, t + 2 * q, 0.9); clap(k, t + 2 * q, 0.5);
      for (let i = 0; i < 8; i++) hat(k, t + i * q / 2, i % 2 ? 0.4 : 0.6);
      if (b % 2) for (let i = 0; i < 6; i++) hat(k, t + 3 * q + i * q / 6, 0.4);
      tone(k, mtof(root), t, { to: mtof(root) * 0.96, glide: 1.4, a: 0.01, hold: 1.2, d: 0.6, gain: 0.5, lp: 400 });
      for (let i = 0; i < 4; i++) tone(k, mtof(root + 36 + [0, 3, 7, 3][i]), t + i * q, { type: 'triangle', d: 0.3, gain: 0.06, send: 0.4 });
    }), { tags: 'hip hop 808 dark bass', bpm: 140 });
  }

  X.byId = Object.fromEntries(X.LIST.map(s => [s.id, s]));
  // which effect fits a transition, an entrance or a plain cut
  X.FOR_TRANSITION = { cut: 'swish', fade: 'whoosh-soft', black: 'impact', white: 'flash', slide: 'whoosh', push: 'whoosh', whip: 'whip', wipe: 'swipe', iris: 'pop', zoom: 'whoosh', blur: 'whoosh-soft', spin: 'swish', glitch: 'glitch' };
  X.FOR_ENTRANCE = { pop: 'pop', drop: 'thud', bounce: 'bounce', rise: 'swish', slide: 'swish', zoom: 'whoosh-soft', spin: 'swish', typewriter: 'typing', wipe: 'swipe', land: 'thud', build: 'tick', shuffle: 'swish', focus: 'shimmer', draw: 'zip' };

  // render one sound to a WAV file (cached)
  const cache = new Map();
  X.render = function (id) {
    const s = X.byId[id];
    if (!s) return Promise.resolve(null);
    if (cache.has(id)) return cache.get(id);
    const p = (async () => {
      seed = 1 + [...id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 100000;
      const tail = s.loop ? 0 : 0.6;
      const c = new OfflineAudioContext(2, Math.ceil((s.dur + tail) * RATE), RATE);
      const k = desk(c, { wet: s.wet, gain: s.gain, noise: Math.min(6, s.dur + 1) });
      s.fn(k);
      const buf = await c.startRendering();
      level(buf, s.cat === 'music');
      return wav(buf);
    })().catch(err => { console.warn('sound', id, err); cache.delete(id); return null; });
    cache.set(id, p);
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
