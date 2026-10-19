/* Savio's editor — clones: the same person (or anything found as the subject) in several places at once.
   On a video layer, el.clones = { on, mode, … } lays other moments of the same clip into each frame, cut out with the
   layer's subject masks (subject.js, analysed over the whole file with the camera followed):
     places  'Many places'  — one long take where you move to a new spot each time (a tripod, or a steady hand): each
                              spot plays at once; list: [{ id, dt (s after the first take), op, on }], edge 'hold' | 'loop'
     trail   'Trail'        — copies following a moment behind: count, gap (s), fade
     freeze  'Freeze trail' — the subject left frozen where it was at each moment in list: [{ id, at (source s), op, on }];
                              each appears once the video reaches it (reveal)
   Shared: order 'depth' (whoever stands further back is behind) | 'newest', soft (edge softness, px of the mask), grow
   (−3…3: tighter / looser cut), steady (warp each moment through the camera track so it stays put when the camera moves).
   Live clones play from their own <video> of the file (render.js slots, kept in step in the editor, sought exactly on
   export); freeze clones are still frames grabbed once. */
(function () {
  'use strict';
  const S = window.Studio, R = window.StudioRender, CT = window.StudioCamTrack;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const MAX = 12;
  const uid = () => 'c' + Math.random().toString(36).slice(2, 8);
  const isVideo = el => el && el.type === 'image' && el.assetId && R.isVideoAsset(el.assetId);
  const vidOf = el => R.assetImage(el.assetId);
  const durOf = el => { const v = vidOf(el); return v && isFinite(v.duration) ? v.duration : 0; };
  const startOf = el => (el.time && el.time.start) || 0;

  /* ── what to draw ── */
  // the clones of a layer as drawn: live ones { key, slot, dt, op, edge } and frozen ones { key, at, op }
  function list(el) {
    const c = el.clones;
    if (!c || !c.on) return [];
    if (c.mode === 'trail') {
      const n = clamp(Math.round(c.count || 4), 1, MAX), out = [];
      for (let k = 1; k <= n; k++) out.push({ key: 't' + k, slot: 'clone-t' + k, dt: -k * clamp(c.gap ?? 0.35, 0.04, 5), op: clamp(1 - (c.fade ?? 0.5) * k / (n + 1), 0.05, 1), edge: 'hide' });
      return out;
    }
    return (c.list || []).filter(x => x.on !== false).slice(0, MAX * 2).map(x => x.at != null
      ? { key: x.id, at: x.at, op: x.op ?? 1 }
      : { key: x.id, slot: 'clone-' + x.id, dt: x.dt || 0, op: x.op ?? 1, edge: c.edge || 'hold' });
  }
  S.cloneList = list;
  // the moment a live clone shows when the layer shows s (null: not on screen now)
  function cloneTime(el, s, it) {
    const D = durOf(el); if (!D) return null;
    let x = s + it.dt;
    if (it.edge === 'loop') x = ((x % D) + D) % D;
    else if (it.edge === 'hide' && (x < 0 || x > D - 0.03)) return null;
    return clamp(x, 0.02, D - 0.03);
  }
  const tgtFor = (el, it) => (t, v) => { const s = R.videoTarget(el.video, t, v, startOf(el)), x = cloneTime(el, s, it); return x == null ? s : x; };
  // every clone's own <video> joins the others (played in step in the editor, sought exactly on export)
  R.extraVideoUsers.push(doc => {
    const out = [];
    for (const el of doc.elements || []) {
      if (!isVideo(el) || el.hidden || !el.clones || !el.clones.on) continue;
      for (const it of list(el)) if (it.slot) out.push({ id: el.assetId, slot: it.slot, vd: el.video, start: startOf(el), el, tgt: tgtFor(el, it) });
    }
    return out;
  });

  /* ── frozen moments: grabbed once from their own <video> ── */
  const stills = new Map();
  let grabbing = Promise.resolve();
  const seek = (v, time) => new Promise(res => {
    if (Math.abs(v.currentTime - time) < 0.0005 && !v.seeking) { res(); return; }
    let done = false; const fin = () => { if (done) return; done = true; v.removeEventListener('seeked', fin); res(); };
    v.addEventListener('seeked', fin); setTimeout(fin, 3000); v.currentTime = time;
  });
  function stillKey(el, at) { return el.assetId + '|' + at.toFixed(3); }
  function still(el, at) {
    const k = stillKey(el, at), hit = stills.get(k);
    if (hit) return hit.c;
    const job = { c: null };
    stills.set(k, job);
    job.p = grabbing = grabbing.then(async () => {
      const e = R.assetVideo(el.assetId, 'still');
      if (!e) return;
      if (!e.ok) await e.promise;
      if (!e.ok) return;
      await seek(e.v, at);
      const v = e.v, sc = Math.min(1, 1920 / Math.max(v.videoWidth, v.videoHeight)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(v.videoWidth * sc)); c.height = Math.max(1, Math.round(v.videoHeight * sc));
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      job.c = c;
      if (stills.size > 120) stills.delete(stills.keys().next().value);
      R.requestRedraw();
    }).catch(() => {});
    return null;
  }
  // export: every frozen moment in the design is ready before a frame is drawn
  R.extraSync.push(async doc => {
    const waits = [];
    for (const el of doc.elements || []) {
      if (!isVideo(el) || el.hidden || !el.clones || !el.clones.on) continue;
      for (const it of list(el)) if (it.at != null) { still(el, it.at); const j = stills.get(stillKey(el, it.at)); if (j && j.p) waits.push(j.p); }
    }
    await Promise.all(waits);
  });
  R.clonesReady = el => {
    if (!el.clones || !el.clones.on || !R.hasSubject(el)) return true;
    for (const it of list(el)) {
      if (it.at != null) { if (!stills.get(stillKey(el, it.at)) || !stills.get(stillKey(el, it.at)).c) return false; }
      else { const e = R.assetVideo(el.assetId, it.slot); if (!e || !e.ok) return false; }
    }
    return true;
  };

  /* ── the camera: where a moment's picture sits in the frame on screen ── */
  const frameAt = (sj, time) => clamp(Math.round(((time || 0) - (sj.t0 || 0)) * (sj.fps || 1)), 0, sj.n - 1);
  function warpFor(el, sj, from, to) {
    const cam = sj.cam, c = el.clones;
    if (!cam || !cam.moving || c.steady === false || !CT) return null;
    const a = cam.H[frameAt(sj, from)], b = cam.H[frameAt(sj, to)];
    if (!a || !b) return null;
    // that moment's picture → the reference view → the picture on screen now
    return CT.norm(CT.mul(CT.inv(b), a));
  }
  const boxAt = (sj, time) => { const f = frameAt(sj, time) * 4, b = sj.box || []; return b[f + 3] ? [b[f] / 1000, b[f + 1] / 1000, b[f + 2] / 1000, b[f + 3] / 1000] : null; };
  // how far back someone stands: where their feet are (lower in the picture = nearer)
  function depth(sj, time, W) { const b = boxAt(sj, time); if (!b) return -1; const p = W ? CT.apply(W, (b[0] + b[2]) / 2, b[3]) : [0, b[3]]; return p[1]; }

  /* ── drawing ── */
  const tmp = new Map();
  function scratch(key, w, h) { let c = tmp.get(key); if (!c) { c = document.createElement('canvas'); tmp.set(key, c); } if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; }
  // the mask made solid — a person isn't see-through, but the models are often only half sure about legs and arms, and a
  // half-sure leg would show the background through it — then a little looser or tighter (grow −3…3) and softer, at the
  // mask's own size
  function edgeMask(m, grow, soft, key) {
    const c = scratch('edge' + key, m.width, m.height), x = c.getContext('2d', { willReadFrequently: true });
    x.clearRect(0, 0, c.width, c.height);
    const r = Math.abs(grow) * 0.6 + soft * 0.5;
    x.filter = r > 0.05 ? `blur(${r.toFixed(2)}px)` : 'none'; x.drawImage(m, 0, 0); x.filter = 'none';
    const d = x.getImageData(0, 0, c.width, c.height), a = d.data, lo = clamp(0.14 - grow * 0.05, 0.01, 0.6), hi = clamp(0.5 - grow * 0.07, lo + 0.1, 0.95);
    for (let i = 3; i < a.length; i += 4) { const t = clamp((a[i] / 255 - lo) / (hi - lo), 0, 1); a[i] = t * t * (3 - 2 * t) * 255; }
    x.putImageData(d, 0, 0);
    return c;
  }
  // a picture drawn through a homography (u, v → u, v): one affine when it's that close, else a mesh of triangles
  function drawHomog(ctx, src, H, W, Hh) {
    const P = (u, v) => { const q = CT.apply(H, u, v); return [q[0] * W, q[1] * Hh]; };
    // the best affine through the corners and centre, and how far the real warp strays from it
    const pts = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]], dst = pts.map(p => P(p[0], p[1]));
    const aff = affineFit(pts.map(p => [p[0] * W, p[1] * Hh]), dst);
    let dev = 0;
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) { const u = i / 4, v = j / 4, q = P(u, v), a = [aff[0] * u * W + aff[1] * v * Hh + aff[2], aff[3] * u * W + aff[4] * v * Hh + aff[5]]; dev = Math.max(dev, Math.hypot(q[0] - a[0], q[1] - a[1])); }
    if (dev < 0.6) { ctx.save(); ctx.transform(aff[0], aff[3], aff[1], aff[4], aff[2], aff[5]); ctx.drawImage(src, 0, 0, W, Hh); ctx.restore(); return; }
    const n = 10;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const u0 = i / n, u1 = (i + 1) / n, v0 = j / n, v1 = (j + 1) / n;
      const s = [[u0 * W, v0 * Hh], [u1 * W, v0 * Hh], [u1 * W, v1 * Hh], [u0 * W, v1 * Hh]], d = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
      tri(ctx, src, W, Hh, [s[0], s[1], s[2]], [d[0], d[1], d[2]]);
      tri(ctx, src, W, Hh, [s[0], s[2], s[3]], [d[0], d[2], d[3]]);
    }
  }
  function affineFit(src, dst) {
    // least squares x' = a x + b y + c, y' = d x + e y + f
    let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, n = src.length, bx = [0, 0, 0], by = [0, 0, 0];
    for (let k = 0; k < n; k++) { const [x, y] = src[k], [u, v] = dst[k]; sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; bx[0] += x * u; bx[1] += y * u; bx[2] += u; by[0] += x * v; by[1] += y * v; by[2] += v; }
    const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
    const solve3 = b => { const m = M.map((r, i) => r.concat(b[i])); for (let c = 0; c < 3; c++) { let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r; [m[c], m[p]] = [m[p], m[c]]; for (let r = 0; r < 3; r++) if (r !== c) { const f = m[r][c] / m[c][c]; for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k]; } } return m.map((r, i) => r[3] / r[i]); };
    const a = solve3(bx), b = solve3(by);
    return [a[0], a[1], a[2], b[0], b[1], b[2]];
  }
  function tri(ctx, src, W, H, s, d) {
    const [[x0, y0], [x1, y1], [x2, y2]] = s, [[u0, v0], [u1, v1], [u2, v2]] = d;
    const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0); if (!det) return;
    const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / det, b = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / det;
    const c = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / det, e = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / det;
    const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3, grow = p => { const dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1; return [p[0] + dx / L * 0.4, p[1] + dy / L * 0.4]; };
    ctx.save(); ctx.beginPath(); const g0 = grow(d[0]), g1 = grow(d[1]), g2 = grow(d[2]); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.lineTo(g2[0], g2[1]); ctx.closePath(); ctx.clip();
    ctx.transform(a, c, b, e, u0 - a * x0 - b * y0, v0 - c * x0 - e * y0);
    ctx.drawImage(src, 0, 0, W, H); ctx.restore();
  }
  // one cut-out: the picture inside its mask, laid into the frame
  function cutInto(x, key, src, m, W, H, warp, op, cl) {
    const c = scratch('cut' + key, W, H), cx = c.getContext('2d');
    cx.globalCompositeOperation = 'source-over'; cx.clearRect(0, 0, W, H); cx.drawImage(src, 0, 0, W, H);
    cx.globalCompositeOperation = 'destination-in'; cx.drawImage(edgeMask(m, cl.grow || 0, cl.soft ?? 1, key), 0, 0, W, H);
    cx.globalCompositeOperation = 'source-over';
    x.globalAlpha = clamp(op, 0, 1);
    if (warp) drawHomog(x, c, warp, W, H); else x.drawImage(c, 0, 0);
    x.globalAlpha = 1;
  }
  const frames = new Map();
  R.cloneFrame = function (el, img, env) {
    const sj = el.subj, cl = el.clones;
    if (!R.hasSubject(el) || !sj.box || !cl) return null;
    const items = list(el), main = vidOf(el);
    if (!items.length || !main) return null;
    const t = 'time' in env ? env.time : R.playTime, start = startOf(el);
    const s = env.editor ? main.currentTime : R.videoTarget(el.video, t, main, start);
    const parts = [];
    for (const it of items) {
      let src, time, op = it.op;
      if (it.slot) {
        const e = R.assetVideo(el.assetId, it.slot);
        if (!e || !e.ok) continue;
        if (env.editor) R.liveSync(e.v, el.video, t, start, tgtFor(el, it));
        const want = cloneTime(el, s, it);
        if (want == null) continue;
        src = e.v; time = env.editor ? e.v.currentTime : want;
      } else {
        // a frozen copy appears once the video reaches it, with a quick fade
        if (cl.reveal !== false && t != null) { if (s < it.at - 0.01) continue; op *= clamp((s - it.at + 0.01) / 0.15, 0, 1); }
        src = still(el, it.at); time = it.at;
        if (!src) continue;
      }
      const m = R.subjectMask(el, time, it.key);
      if (!m || op <= 0.01) continue;
      parts.push({ it, src, time, m, op, warp: warpFor(el, sj, time, s) });
    }
    if (!parts.length) return null;
    const size = R.mediaSize(img), cap = env.editor ? (R.playing ? 960 : 1280) : 1920, k = Math.min(1, cap / Math.max(size.w, size.h));
    const W = Math.max(1, Math.round(size.w * k)), H = Math.max(1, Math.round(size.h * k));
    const key = s.toFixed(3) + '|' + parts.map(p => p.it.key + '@' + p.time.toFixed(3) + ':' + p.op.toFixed(2)).join(',') + '|' + JSON.stringify(cl) + '|' + W;
    let fr = frames.get(el.id);
    if (fr && fr.key === key && !img._interp) return fr.c;
    if (!fr) { fr = { c: document.createElement('canvas'), key: '' }; frames.set(el.id, fr); }
    const c = fr.c; if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const x = c.getContext('2d');
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, W, H);
    x.drawImage(img, 0, 0, W, H);
    // who's in front: the further back someone stands, the earlier they're drawn — the person on screen now included
    const live = { live: true, d: depth(sj, s, null) };
    let order = parts.map(p => Object.assign(p, { d: depth(sj, p.time, p.warp) }));
    if (cl.order === 'newest') order = order.sort((a, b) => (a.it.at ?? a.it.dt ?? 0) - (b.it.at ?? b.it.dt ?? 0));
    else order = order.concat([live]).sort((a, b) => a.d - b.d);
    let drawnBehind = false;
    for (const p of order) {
      if (p.live) {
        // the person on screen now, back on top of anyone standing behind them
        if (drawnBehind) { const lm = R.subjectMask(el, s, 'live'); if (lm) cutInto(x, 'live', img, lm, W, H, null, 1, cl); }
        continue;
      }
      cutInto(x, p.it.key, p.src, p.m, W, H, p.warp, p.op, cl);
      drawnBehind = true;
    }
    if (cl.order === 'newest') { const lm = R.subjectMask(el, s, 'live'); if (lm) cutInto(x, 'live', img, lm, W, H, null, 1, cl); }
    fr.key = key;
    // a frame of its own for the filters' cache
    c._interp = true; c._stamp = key;
    return c;
  };

  /* ── setting clones up from what was found ── */
  const ready = el => R.hasSubject(el) && el.subj.v >= 2 && el.subj.whole && el.subj.box && el.subj.n > 2 && !el.subj.preview;
  S.clonesReady = ready;
  // per frame: where the subject is (u, v of its middle, its height), in the reference view so camera moves don't count
  function track(sj) {
    const out = [];
    for (let f = 0; f < sj.n; f++) {
      const b = sj.box.slice(f * 4, f * 4 + 4).map(v => v / 1000);
      if (!b[3] || b[3] - b[1] < 0.02) { out.push(null); continue; }
      let c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
      const H = sj.cam && sj.cam.moving && sj.cam.H[f];
      if (H) c = CT.apply(H, c[0], c[1]);
      out.push({ x: c[0], y: c[1], h: b[3] - b[1], w: b[2] - b[0], t: (sj.t0 || 0) + f / (sj.fps || 1) });
    }
    return out;
  }
  // the takes of 'Many places': stretches where the subject stays in one spot, one per spot, in order
  function findTakes(sj) {
    const tr = track(sj), fps = sj.fps || 1, n = tr.length;
    const sm = tr.map((p, i) => { if (!p) return null; let x = 0, y = 0, k = 0; for (let j = Math.max(0, i - Math.round(fps / 4)); j <= Math.min(n - 1, i + Math.round(fps / 4)); j++) if (tr[j]) { x += tr[j].x; y += tr[j].y; k++; } return { x: x / k, y: y / k, h: p.h, w: p.w, t: p.t }; });
    const hs = sm.filter(Boolean).map(p => p.h).sort((a, b) => a - b), hMed = hs.length ? hs[hs.length >> 1] : 0.3;
    // still enough: moving less than a third of a body height a second
    const still = sm.map((p, i) => { if (!p) return false; const a = sm[Math.max(0, i - 2)], b = sm[Math.min(n - 1, i + 2)]; if (!a || !b) return false; return Math.hypot(b.x - a.x, b.y - a.y) / ((b.t - a.t) || 1e-3) < hMed * 0.35; });
    const runs = [];
    for (let i = 0; i < n;) { if (!still[i]) { i++; continue; } let j = i; while (j + 1 < n && still[j + 1]) j++; runs.push([i, j]); i = j + 1; }
    const spot = r => { let x = 0, y = 0, k = 0; for (let i = r[0]; i <= r[1]; i++) { x += sm[i].x; y += sm[i].y; k++; } return { x: x / k, y: y / k }; };
    // runs at the same spot with a short break between them are one take
    const merged = [];
    for (const r of runs) {
      const last = merged[merged.length - 1];
      if (last && (r[0] - last[1]) / fps < 0.6) { const a = spot(last), b = spot(r); if (Math.hypot(a.x - b.x, a.y - b.y) < hMed * 0.3) { last[1] = r[1]; continue; } }
      merged.push(r.slice());
    }
    let takes = merged.filter(r => (r[1] - r[0] + 1) / fps >= 0.8).map(r => Object.assign(spot(r), { a: sm[r[0]].t, b: sm[r[1]].t, len: (r[1] - r[0] + 1) / fps }));
    // one take per spot (the longest), each spot clearly somewhere else
    const keep = [];
    for (const tk of takes.slice().sort((p, q) => q.len - p.len)) if (!keep.some(k => Math.hypot(k.x - tk.x, k.y - tk.y) < hMed * 0.5)) keep.push(tk);
    takes = keep.sort((p, q) => p.a - q.a).slice(0, MAX + 1);
    return takes;
  }
  S.findCloneTakes = el => (ready(el) ? findTakes(el.subj) : []);
  // the moments of 'Freeze trail': a new copy each time the subject has moved about a body width on
  function freezeMoments(sj, gap) {
    const tr = track(sj), out = [];
    let last = null;
    for (const p of tr) {
      if (!p) continue;
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= Math.max(p.w, 0.04) * (gap || 1.1)) { out.push(+p.t.toFixed(3)); last = p; }
      if (out.length >= MAX) break;
    }
    return out;
  }
  // run the subject finder over the whole clip (with the camera) if it hasn't been yet
  S.prepareClones = async function (el) {
    if (ready(el)) return el;
    await S.findSubject(el, { people: true, whole: true, cam: true });
    return S.doc.elements.find(e => e.id === el.id) || null;
  };
  // mode: 'places' | 'trail' | 'freeze'
  S.makeClones = async function (el, mode, o = {}) {
    el = await S.prepareClones(el);
    if (!el || !ready(el)) throw new Error('Couldn’t find anyone in this video to clone');
    const sj = el.subj, prev = el.clones || {};
    const cfg = { on: true, mode, order: prev.order || 'depth', soft: prev.soft ?? 1, grow: prev.grow || 0, steady: prev.steady !== false };
    let video = null, note = '';
    if (mode === 'trail') Object.assign(cfg, { count: prev.count || 4, gap: prev.gap || 0.35, fade: prev.fade ?? 0.5 });
    if (mode === 'freeze') { Object.assign(cfg, { reveal: true, list: freezeMoments(sj).map(at => ({ id: uid(), at })) }); if (cfg.list.length < 2) note = 'The subject hardly moves, so there are few copies — add more with “Freeze here”.'; }
    if (mode === 'places') {
      let takes = findTakes(sj);
      const D = durOf(el);
      if (takes.length < 2) {
        // no clear spots: the clip in equal parts
        const k = clamp(Math.floor(D / 2.5), 2, 4);
        takes = Array.from({ length: k }, (_, i) => ({ a: D * i / k, b: D * (i + 1) / k, len: D / k }));
        note = 'Couldn’t tell where you stood still, so the clip is cut into ' + takes.length + ' equal takes — change their starts below.';
      }
      const L = Math.max(1, o.length === 'longest' ? Math.max(...takes.map(t => t.len)) : Math.min(...takes.map(t => t.len)));
      Object.assign(cfg, { edge: 'hold', length: o.length || 'shortest', list: takes.slice(1).map(tk => ({ id: uid(), dt: +(tk.a - takes[0].a).toFixed(3) })) });
      video = Object.assign({}, el.video, { trim: +takes[0].a.toFixed(3), end: +Math.min(D, takes[0].a + L).toFixed(3) });
    }
    S.changeEl(el, e => { e.clones = cfg; if (video) e.video = video; });
    S.commit();
    return { el: S.doc.elements.find(e => e.id === el.id), note };
  };
  S.removeClones = function (el) { S.changeEl(el, e => { delete e.clones; }); S.commit(); };

  /* ── the inspector ── */
  const U = S.ui, { h, ic, sec, row, full, more, label, num, seg, toggle, toast } = U;
  const fmt = s => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`; };
  const setCl = (el, patch, live) => { S.changeEl(el, e => { e.clones = Object.assign({}, e.clones, patch); }, live); if (!live) S.commit(); };
  const nowSource = el => { const v = vidOf(el); return v ? v.currentTime : 0; };
  let busy = null;
  async function start(el, mode) {
    busy = { id: el.id, mode };
    U.renderInspector();
    try {
      const r = await S.makeClones(el, mode);
      if (r.note) toast(r.note);
      else toast({ places: 'Clones in every spot you stood', trail: 'Clone trail on', freeze: 'Freeze trail on' }[mode]);
    } catch (e) { if (e && e.name !== 'AbortError') toast(e.message || 'Couldn’t make clones'); }
    busy = null;
    U.renderInspector();
  }
  S.on('subjectprogress', id => { if (busy && busy.id === id) { const bar = document.querySelector('.clone-busy i'), j = S.subjectJob(id); if (bar && j) bar.style.width = Math.round(j.p * 100) + '%'; const t = document.querySelector('.clone-busy span'); if (t && j) t.textContent = j.loading ? 'Getting the people finder…' : `Finding the subject in every frame… ${Math.round(j.p * 100)}%`; } });
  const MODES = [['places', 'Many places', 'One long take where you move to a new spot each time — every spot plays at once'], ['trail', 'Trail', 'Copies follow a moment behind'], ['freeze', 'Freeze trail', 'A frozen copy left behind as you move']];
  const ICON = {
    places: '<svg viewBox="0 0 48 32"><circle cx="10" cy="11" r="3.4"/><rect x="7" y="15" width="6" height="11" rx="2.5"/><circle cx="24" cy="9" r="3.4"/><rect x="21" y="13" width="6" height="11" rx="2.5"/><circle cx="38" cy="12" r="3.4"/><rect x="35" y="16" width="6" height="11" rx="2.5"/></svg>',
    trail: '<svg viewBox="0 0 48 32"><g opacity=".25"><circle cx="9" cy="10" r="3.4"/><rect x="6" y="14" width="6" height="12" rx="2.5"/></g><g opacity=".5"><circle cx="19" cy="10" r="3.4"/><rect x="16" y="14" width="6" height="12" rx="2.5"/></g><g opacity=".75"><circle cx="29" cy="10" r="3.4"/><rect x="26" y="14" width="6" height="12" rx="2.5"/></g><circle cx="39" cy="10" r="3.4"/><rect x="36" y="14" width="6" height="12" rx="2.5"/></svg>',
    freeze: '<svg viewBox="0 0 48 32"><g opacity=".55"><circle cx="9" cy="10" r="3.4"/><rect x="6" y="14" width="6" height="12" rx="2.5"/><circle cx="21" cy="10" r="3.4"/><rect x="18" y="14" width="6" height="12" rx="2.5"/></g><circle cx="35" cy="10" r="3.4"/><rect x="32" y="14" width="6" height="12" rx="2.5"/><path d="M40 6l4-3M41 10h5" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>',
  };
  function tile(el, m) {
    const b = h('button.clone-tile', { type: 'button', title: m[2], onclick: () => start(el, m[0]) });
    const art = h('span.clone-art'); art.innerHTML = ICON[m[0]];
    b.append(art, h('b', null, m[1]), h('span', null, m[2]));
    return b;
  }
  function itemRow(el, it, i, kind) {
    const cl = el.clones, D = durOf(el);
    const edit = (patch, live) => setCl(el, { list: cl.list.map(x => (x.id === it.id ? Object.assign({}, x, patch) : x)) }, live);
    return h('div.clone-row' + (it.on === false ? '.off' : ''), null,
      h('span.clone-n', null, String(i + 2)),
      h('div.clone-time', { title: kind === 'freeze' ? 'The moment frozen (in the clip)' : 'Where this take starts in the clip' },
        num('sel', null, { get: () => (kind === 'freeze' ? it.at : (el.video.trim || 0) + it.dt), set: (v, live) => { v = clamp(v, 0, Math.max(0, D - 0.05)); edit(kind === 'freeze' ? { at: +v.toFixed(3) } : { dt: +(v - (el.video.trim || 0)).toFixed(3) }, live); }, min: 0, max: D || 60, step: 0.1, unit: 's', label: kind === 'freeze' ? 'At' : 'Starts', small: true })),
      kind === 'freeze' ? h('button.icon-btn', { type: 'button', title: 'Go to the moment the video reaches it', onclick: () => { const vd = el.video || {}, at = startOf(el) + (it.at - (vd.trim || 0)) / (vd.speed || 1); if (S.seek && at >= 0) S.seek(at); } }, ic('play')) : h('span'),
      h('button.icon-btn', { type: 'button', title: it.on === false ? 'Show this clone' : 'Hide this clone', onclick: () => { edit({ on: it.on === false }); U.renderInspector(); } }, ic(it.on === false ? 'eyeOff' : 'eye')),
      h('button.icon-btn', { type: 'button', title: 'Remove this clone', onclick: () => { setCl(el, { list: cl.list.filter(x => x.id !== it.id) }); U.renderInspector(); } }, ic('x')));
  }
  function section(el) {
    const cl = el.clones, job = S.subjectJob(el.id), running = busy && busy.id === el.id;
    if (running || (job && !job.quick && busy)) {
      return sec('Clones', [h('div.clone-busy', null, h('div.cap-bar', null, h('i', { style: { width: Math.round(((job && job.p) || 0) * 100) + '%' } })), h('span', null, 'Finding the subject in every frame…')),
        full(h('button.btn', { type: 'button', onclick: () => { S.cancelSubject(el.id); busy = null; U.renderInspector(); } }, 'Cancel'))], true, { key: 'clones' });
    }
    if (!cl || !cl.on) {
      return sec('Clones', [
        h('p.hint', null, 'The same person in several places at once. Works best with the camera on a tripod; a moving camera is followed so the copies stay put.'),
        h('div.clone-tiles', null, MODES.map(m => tile(el, m))),
      ], false, { key: 'clones' });
    }
    const mode = cl.mode, kids = [];
    kids.push(row('Look', seg('sel', null, MODES.map(m => [m[0], m[1]]), { get: () => mode, set: v => { if (v !== mode) start(el, v); } })));
    if (mode === 'trail') {
      kids.push(row('Copies', num('sel', null, { get: () => cl.count || 4, set: (v, live) => setCl(el, { count: Math.round(v) }, live), min: 1, max: MAX, slider: true })));
      kids.push(row('Gap', num('sel', null, { get: () => cl.gap ?? 0.35, set: (v, live) => setCl(el, { gap: +v.toFixed(2) }, live), min: 0.05, max: 2, step: 0.05, unit: 's', slider: true })));
      kids.push(row('Fade', num('sel', null, { get: () => cl.fade ?? 0.5, set: (v, live) => setCl(el, { fade: v }, live), min: 0, max: 95, scale: 100, unit: '%', slider: true })));
    } else {
      const rows = (cl.list || []).map((it, i) => itemRow(el, it, i, mode));
      kids.push(label(mode === 'places' ? 'Takes (1 is the video itself)' : 'Frozen copies'));
      kids.push(h('div.clone-list', null, rows.length ? rows : h('p.hint', null, 'None yet.')));
      const add = mode === 'places'
        ? h('button.btn.small', { type: 'button', title: 'Add a take starting where the clip is now', onclick: () => { const v = vidOf(el), at = v ? v.currentTime : 0; setCl(el, { list: (cl.list || []).concat({ id: uid(), dt: +(at - (el.video.trim || 0)).toFixed(3) }) }); U.renderInspector(); } }, ic('plus'), 'Take from here')
        : h('button.btn.small', { type: 'button', title: 'Freeze a copy at the frame on screen', onclick: () => { const at = +nowSource(el).toFixed(3); setCl(el, { list: (cl.list || []).concat({ id: uid(), at }).sort((a, b) => a.at - b.at) }); U.renderInspector(); } }, ic('plus'), 'Freeze here');
      kids.push(h('div.cap-actions', null, add));
      if (mode === 'places') {
        kids.push(row('Length', seg('sel', null, [['shortest', 'Shortest take'], ['longest', 'Longest']], { get: () => cl.length || 'shortest', set: v => { const takes = [{ a: el.video.trim || 0 }].concat((cl.list || []).map(x => ({ a: (el.video.trim || 0) + x.dt }))); const D = durOf(el); const lens = takes.map((tk, i) => { const nx = takes.slice().sort((p, q) => p.a - q.a).find(q => q.a > tk.a); return (nx ? nx.a : D) - tk.a; }); const L = Math.max(1, v === 'longest' ? Math.max(...lens) : Math.min(...lens)); S.changeEl(el, e => { e.clones = Object.assign({}, e.clones, { length: v }); e.video = Object.assign({}, e.video, { end: +Math.min(D, (e.video.trim || 0) + L).toFixed(3) }); }); S.commit(); U.renderInspector(); } })));
        kids.push(row('Take ends', seg('sel', null, [['hold', 'Hold'], ['loop', 'Loop']], { get: () => cl.edge || 'hold', set: v => setCl(el, { edge: v }) })));
      } else kids.push(toggle('sel', null, 'Each appears when it’s reached', { get: () => cl.reveal !== false, set: v => setCl(el, { reveal: v }) }));
    }
    kids.push(row('In front', seg('sel', null, [['depth', 'Nearest'], ['newest', 'Newest']], { get: () => cl.order || 'depth', set: v => setCl(el, { order: v }) })));
    kids.push(more('clones-more', [
      row('Edge', num('sel', null, { get: () => cl.grow || 0, set: (v, live) => setCl(el, { grow: Math.round(v) }, live), min: -3, max: 3, slider: true })),
      row('Softness', num('sel', null, { get: () => cl.soft ?? 1, set: (v, live) => setCl(el, { soft: v }, live), min: 0, max: 6, step: 0.5, slider: true })),
      el.subj.cam && el.subj.cam.moving ? toggle('sel', null, 'Keep the copies still as the camera moves', { get: () => cl.steady !== false, set: v => setCl(el, { steady: v }) }) : h('p.hint', null, 'The camera stays still in this clip, so the copies need no steadying.'),
      h('div.cap-actions', null,
        h('button.btn.small', { type: 'button', title: 'Look for the subject again, frame by frame', onclick: () => { S.changeEl(el, e => { delete e.subj; }); start(el, mode); } }, ic('refresh'), 'Find again'),
        h('button.btn.small', { type: 'button', onclick: () => { S.removeClones(el); U.renderInspector(); } }, ic('trash'), 'Remove clones')),
    ], 'More'));
    return sec('Clones', kids, true, { key: 'clones' });
  }
  U.addSection('el', el => (isVideo(el) ? section(el) : null));
})();
