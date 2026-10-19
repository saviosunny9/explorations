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
    if (!el.clones || !el.clones.on || (!R.hasSubject(el) && el.clones.cut !== 'zone')) return true;
    for (const it of list(el)) {
      if (it.at != null) { if (!stills.get(stillKey(el, it.at)) || !stills.get(stillKey(el, it.at)).c) return false; }
      else { const e = R.assetVideo(el.assetId, it.slot); if (!e || !e.ok) return false; }
    }
    return true;
  };

  /* ── the camera: where a moment's picture sits in the frame on screen ── */
  // the analysed frame for a moment: by frame number (as R.subjectMask does), or by time for older masks
  const frameAt = (sj, time) => clamp(sj.vfps ? Math.round((Math.floor((time || 0) * sj.vfps + 1e-6) - sj.f0) / (sj.stride || 1)) : Math.round(((time || 0) - (sj.t0 || 0)) * (sj.fps || 1)), 0, sj.n - 1);
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
  /* one cut-out laid into the frame. The mask alone leaves a visible edge: a band of that moment's background (lit a
     little differently — lamps, auto exposure) round the person, and bits the models missed. So, near the person:
     · the light of the moment is matched to the frame it goes into, from a ring just outside the mask where both
       pictures show the same background (a gain per colour channel);
     · then a pixel is only laid in where it differs from what is already there. Leaving out a pixel that looks the
       same costs nothing, so the edge falls on the person's real outline; and just outside the mask, a pixel that
       clearly differs (a hand, a strand of hair, a shadow) is brought in. */
  function cutInto(x, key, src, m, W, H, warp, op, cl, bx) {
    const c = scratch('cut' + key, W, H), cx = c.getContext('2d', { willReadFrequently: true });
    cx.globalCompositeOperation = 'source-over'; cx.clearRect(0, 0, W, H);
    if (warp) drawHomog(cx, src, warp, W, H); else cx.drawImage(src, 0, 0, W, H);
    const mc = scratch('cm' + key, W, H), mx = mc.getContext('2d', { willReadFrequently: true });
    mx.clearRect(0, 0, W, H);
    const em = edgeMask(m, cl.grow || 0, cl.soft ?? 1, key);
    if (warp) drawHomog(mx, em, warp, W, H); else mx.drawImage(em, 0, 0, W, H);
    // where to look: the person's box (in that moment's picture, carried through the warp), padded
    let rx0 = 0, ry0 = 0, rx1 = W, ry1 = H;
    if (bx) {
      const cs = [[bx[0], bx[1]], [bx[2], bx[1]], [bx[0], bx[3]], [bx[2], bx[3]]].map(([u, v]) => (warp ? CT.apply(warp, u, v) : [u, v]));
      const pad = 0.05 * H + 0.06 * (bx[3] - bx[1]) * H;
      rx0 = Math.max(0, Math.floor(Math.min(...cs.map(q => q[0])) * W - pad)); rx1 = Math.min(W, Math.ceil(Math.max(...cs.map(q => q[0])) * W + pad));
      ry0 = Math.max(0, Math.floor(Math.min(...cs.map(q => q[1])) * H - pad)); ry1 = Math.min(H, Math.ceil(Math.max(...cs.map(q => q[1])) * H + pad));
    }
    const rw = rx1 - rx0, rh = ry1 - ry0;
    if (rw < 2 || rh < 2) return;
    if (cl.match === false) {
      cx.globalCompositeOperation = 'destination-in'; cx.drawImage(mc, 0, 0); cx.globalCompositeOperation = 'source-over';
    } else {
      // the mask grown by a band (for what the models missed), softly
      const band = Math.max(2, 0.012 * Math.max(W, H)), dc = scratch('cd' + key, W, H), dx = dc.getContext('2d', { willReadFrequently: true });
      dx.clearRect(0, 0, W, H); dx.filter = `blur(${band.toFixed(1)}px)`; dx.drawImage(mc, 0, 0); dx.filter = 'none';
      const Ld = x.getImageData(rx0, ry0, rw, rh).data, Cimg = cx.getImageData(rx0, ry0, rw, rh), Cd = Cimg.data;
      const Md = mx.getImageData(rx0, ry0, rw, rh).data, Dd = dx.getImageData(rx0, ry0, rw, rh).data, n = rw * rh;
      // the light: background in both, just outside the person
      let sL0 = 0, sL1 = 0, sL2 = 0, sC0 = 0, sC1 = 0, sC2 = 0, k = 0;
      for (let i = 0, o = 0; i < n; i++, o += 4) {
        if (Md[o + 3] > 6 || Dd[o + 3] < 12 || Cd[o + 3] < 250) continue;
        const d = Math.abs(Ld[o] - Cd[o]) + Math.abs(Ld[o + 1] - Cd[o + 1]) + Math.abs(Ld[o + 2] - Cd[o + 2]);
        if (d > 150) continue; // someone else there (the person on screen now)
        sL0 += Ld[o]; sL1 += Ld[o + 1]; sL2 += Ld[o + 2]; sC0 += Cd[o]; sC1 += Cd[o + 1]; sC2 += Cd[o + 2]; k++;
      }
      const gain = (a, b) => (k > 150 && b > k * 4 ? clamp(a / b, 0.7, 1.45) : 1);
      const g0 = gain(sL0, sC0), g1 = gain(sL1, sC1), g2 = gain(sL2, sC2);
      const sm = (v, a, b) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
      const AL = new Float32Array(n);
      for (let i = 0, o = 0; i < n; i++, o += 4) {
        const mm = Md[o + 3] / 255, dd = Dd[o + 3] / 255;
        if (mm < 0.004 && dd < 0.02) continue;
        const r = Cd[o] * g0, gg = Cd[o + 1] * g1, b = Cd[o + 2] * g2;
        const diff = (Math.abs(Ld[o] - r) + Math.abs(Ld[o + 1] - gg) + Math.abs(Ld[o + 2] - b)) / 3;
        // inside the mask: anything that differs at all; in the band: only what clearly does, less so further out
        const near = Math.min(1, dd * 2.4);
        AL[i] = Math.max(mm * sm(diff, 1.5, 7), near * (1 - mm) * sm(diff, 14 + (1 - near) * 22, 30 + (1 - near) * 30));
        Cd[o] = r > 255 ? 255 : r; Cd[o + 1] = gg > 255 ? 255 : gg; Cd[o + 2] = b > 255 ? 255 : b;
      }
      // pixel-by-pixel decisions leave a ragged edge: smooth it a little (two passes of a 3 × 3 box)
      let A2 = AL;
      for (let pass = 0; pass < 2; pass++) {
        const o2 = new Float32Array(n);
        for (let y = 0; y < rh; y++) for (let x2 = 0; x2 < rw; x2++) {
          let sum = 0, k2 = 0;
          for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= rh) continue; for (let dx2 = -1; dx2 <= 1; dx2++) { const xx = x2 + dx2; if (xx < 0 || xx >= rw) continue; sum += A2[yy * rw + xx]; k2++; } }
          o2[y * rw + x2] = sum / k2;
        }
        A2 = o2;
      }
      for (let i = 0, o = 3; i < n; i++, o += 4) Cd[o] = Math.round(A2[i] * Cd[o]);
      cx.clearRect(0, 0, W, H);
      cx.putImageData(Cimg, rx0, ry0);
    }
    x.globalAlpha = clamp(op, 0, 1);
    x.drawImage(c, rx0, ry0, rw, rh, rx0, ry0, rw, rh);
    x.globalAlpha = 1;
  }
  const frames = new Map();
  let unsettled = 0;
  /* split screen (Many places, cut 'zone'): each take plays inside its own zone (a shape in the reference view, softened
     at its edge) over the first take — no person cut-out, so nothing of anyone is ever lost, and it needs no subject */
  function zoneFrame(el, img, env) {
    const cl = el.clones, sj = R.hasSubject(el) ? el.subj : null, main = vidOf(el);
    const items = list(el).filter(it => it.slot), byId = new Map((cl.list || []).map(x => [x.id, x]));
    if (!items.length || !main) return null;
    const t = 'time' in env ? env.time : R.playTime, start = startOf(el);
    const s = env.editor ? main.currentTime : R.videoTarget(el.video, t, main, start);
    const parts = [];
    for (const it of items) {
      const z = byId.get(it.key) && byId.get(it.key).zone, e = R.assetVideo(el.assetId, it.slot);
      if (!z || z.length < 3 || !e || !e.ok) continue;
      if (env.editor) R.liveSync(e.v, el.video, t, start, tgtFor(el, it));
      const want = cloneTime(el, s, it);
      if (want == null) continue;
      const time = env.editor ? e.v.currentTime : want;
      parts.push({ it, src: e.v, time, z, op: it.op, warp: sj ? warpFor(el, sj, time, s) : null });
    }
    if (!parts.length) return null;
    const size = R.mediaSize(img), cap = env.editor ? (R.playing ? 960 : 1280) : 1920, k = Math.min(1, cap / Math.max(size.w, size.h));
    const W = Math.max(1, Math.round(size.w * k)), H = Math.max(1, Math.round(size.h * k));
    const key = 'z' + s.toFixed(3) + '|' + parts.map(p => p.it.key + '@' + p.time.toFixed(3)).join(',') + '|' + JSON.stringify(cl) + '|' + W;
    let fr = frames.get(el.id);
    if (fr && fr.key === key && !img._interp) return fr.c;
    if (!fr) { fr = { c: document.createElement('canvas'), key: '' }; frames.set(el.id, fr); }
    const c = fr.c; if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const x = c.getContext('2d', { willReadFrequently: true });
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, W, H);
    x.drawImage(img, 0, 0, W, H);
    // the camera now: zones are kept in the reference view, so they stay on the room when the camera moves
    const Hnow = sj && sj.cam && sj.cam.moving && cl.steady !== false && CT ? sj.cam.H[frameAt(sj, s)] : null, back = Hnow ? CT.inv(Hnow) : null;
    const feather = (cl.feather ?? 30) / 100 * 0.05 * W;
    for (const p of parts) {
      const cut = scratch('zc' + p.it.key, W, H), cx = cut.getContext('2d');
      cx.globalCompositeOperation = 'source-over'; cx.clearRect(0, 0, W, H);
      if (p.warp) drawHomog(cx, p.src, p.warp, W, H); else cx.drawImage(p.src, 0, 0, W, H);
      const m = scratch('zm' + p.it.key, W, H), mx = m.getContext('2d');
      mx.clearRect(0, 0, W, H);
      mx.filter = feather > 0.3 ? `blur(${feather.toFixed(1)}px)` : 'none';
      mx.fillStyle = '#fff'; mx.beginPath();
      p.z.forEach(([u, v], i) => { const q = back ? CT.apply(back, u, v) : [u, v]; if (i) mx.lineTo(q[0] * W, q[1] * H); else mx.moveTo(q[0] * W, q[1] * H); });
      mx.closePath(); mx.fill(); mx.filter = 'none';
      cx.globalCompositeOperation = 'destination-in'; cx.drawImage(m, 0, 0);
      cx.globalCompositeOperation = 'source-over';
      x.globalAlpha = clamp(p.op, 0, 1); x.drawImage(cut, 0, 0); x.globalAlpha = 1;
    }
    const settled = !main.seeking && !parts.some(p => p.src.seeking);
    fr.key = settled ? key : '';
    c._interp = true; c._stamp = settled ? key : key + '~' + (++unsettled);
    return c;
  }
  R.cloneFrame = function (el, img, env) {
    const sj = el.subj, cl = el.clones;
    if (!cl) return null;
    const zones = cl.mode === 'places' && cl.cut === 'zone';
    if (zones) return zoneFrame(el, img, env);
    if (!R.hasSubject(el) || !sj.box) return null;
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
        // a trail never reaches back across a cut in the clip (the person jumped somewhere else): it would leave a
        // ghost of the last take where nobody is now
        if (it.edge === 'hide' && jumpBetween(sj, time, s)) continue;
      } else {
        // a frozen copy appears once the video reaches it, with a quick fade
        if (cl.reveal !== false && t != null) { if (s < it.at - 0.01) continue; op *= clamp((s - it.at + 0.01) / 0.15, 0, 1); }
        // and makes way while the person on screen stands where it is (after a cut, or stopping on the spot)
        const ov = overlap(refBox(sj, it.at), refBox(sj, s));
        if (ov > 0.1) op *= clamp(1 - (ov - 0.1) / 0.1, 0, 1);
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
    const x = c.getContext('2d', { willReadFrequently: true });
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
        if (drawnBehind) { const lm = R.subjectMask(el, s, 'live'); if (lm) cutInto(x, 'live', img, lm, W, H, null, 1, cl, boxAt(sj, s)); }
        continue;
      }
      cutInto(x, p.it.key, p.src, p.m, W, H, p.warp, p.op, cl, boxAt(sj, p.time));
      drawnBehind = true;
    }
    if (cl.order === 'newest') { const lm = R.subjectMask(el, s, 'live'); if (lm) cutInto(x, 'live', img, lm, W, H, null, 1, cl, boxAt(sj, s)); }
    // a video still seeking already reports its new time but shows the old picture: don't keep that composite for the time
    const settled = !main.seeking && !parts.some(p => p.src.seeking);
    fr.key = settled ? key : '';
    // a frame of its own for the filters' cache
    c._interp = true; c._stamp = settled ? key : key + '~' + (++unsettled);
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
    const spot = r => { let x = 0, y = 0, w = 0, hh = 0, k = 0; for (let i = r[0]; i <= r[1]; i++) { x += sm[i].x; y += sm[i].y; w += sm[i].w; hh += sm[i].h; k++; } return { x: x / k, y: y / k, w: w / k, h: hh / k }; };
    // the same spot: their boxes mostly overlap (a centre distance alone fails when people are big in the frame —
    // sitting on the sofa and standing beside it are a quarter of the frame apart but under half a body height)
    const iou = (a, b) => {
      const ix = Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)), iy = Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2));
      const I = ix * iy; return I / Math.max(1e-6, a.w * a.h + b.w * b.h - I);
    };
    // runs at the same spot with a short break between them are one take
    const merged = [];
    for (const r of runs) {
      const last = merged[merged.length - 1];
      if (last && (r[0] - last[1]) / fps < 0.6) { const a = spot(last), b = spot(r); if (iou(a, b) > 0.5) { last[1] = r[1]; continue; } }
      merged.push(r.slice());
    }
    let takes = merged.filter(r => (r[1] - r[0] + 1) / fps >= 0.8).map(r => Object.assign(spot(r), { a: sm[r[0]].t, b: sm[r[1]].t, len: (r[1] - r[0] + 1) / fps }));
    // one take per spot (the longest), each spot clearly somewhere else
    const keep = [];
    for (const tk of takes.slice().sort((p, q) => q.len - p.len)) if (!keep.some(k => iou(k, tk) > 0.35)) keep.push(tk);
    takes = keep.sort((p, q) => p.a - q.a).slice(0, MAX + 1);
    return takes;
  }
  S.findCloneTakes = el => (ready(el) ? findTakes(el.subj) : []);
  // the moments of 'Freeze trail': a new copy each time the subject has moved about a body width on
  function freezeMoments(sj, gap) {
    const tr = track(sj), out = [], kept = [], js = jumps(sj);
    let last = null;
    for (const p of tr) {
      if (!p) continue;
      // not right at a cut (half the frames there belong to the other take)
      if (js.some(j => Math.abs(p.t - j) < 0.25)) continue;
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < Math.max(p.w, 0.04) * (gap || 1.1)) continue;
      // nor where an earlier copy already stands
      const b = [p.x - p.w / 2, p.y - p.h / 2, p.x + p.w / 2, p.y + p.h / 2];
      if (kept.some(k => overlap(k, b) > 0.3)) { last = p; continue; }
      out.push(+p.t.toFixed(3)); kept.push(b); last = p;
      if (out.length >= MAX) break;
    }
    return out;
  }
  // the subject's box at a moment, in the reference view
  function refBox(sj, time) {
    const b = boxAt(sj, time);
    if (!b) return null;
    const f = frameAt(sj, time), Hf = sj.cam && sj.cam.moving && sj.cam.H[f];
    if (!Hf) return b;
    const cs = [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]].map(q => CT.apply(Hf, q[0], q[1]));
    return [Math.min(...cs.map(q => q[0])), Math.min(...cs.map(q => q[1])), Math.max(...cs.map(q => q[0])), Math.max(...cs.map(q => q[1]))];
  }
  // how much two boxes overlap (intersection over union)
  function overlap(a, b) {
    if (!a || !b) return 0;
    const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])), I = ix * iy;
    return I / Math.max(1e-6, (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - I);
  }
  /* cuts in the clip: moments where the subject jumps further in one frame than anyone moves (several takes joined
     into one file, the usual way 'many places' footage arrives) */
  const jumpCache = new WeakMap();
  function jumps(sj) {
    if (jumpCache.has(sj)) return jumpCache.get(sj);
    const tr = track(sj), out = [];
    let prev = null;
    for (const p of tr) {
      if (!p) continue;
      if (prev && p.t - prev.t < 0.2 && Math.hypot(p.x - prev.x, p.y - prev.y) > Math.max(0.06, 0.45 * Math.max(p.w, prev.w))) out.push((p.t + prev.t) / 2);
      prev = p;
    }
    jumpCache.set(sj, out);
    return out;
  }
  const jumpBetween = (sj, a, b) => { const lo = Math.min(a, b), hi = Math.max(a, b); return jumps(sj).some(j => j > lo && j <= hi); };
  // run the subject finder over the whole clip (with the camera) if it hasn't been yet
  /* a quick look for split screen (no people finder): frames every ~0.2 s, small; the empty room is the median of
     them (each frame's light levelled to it first — lamps and auto exposure change between takes), and whatever
     differs from it is where someone is. Gives a box per sample, like el.subj.box, for findTakes and the zones. */
  async function scanClip(el, onProgress) {
    const e = R.assetVideo(el.assetId, 'scan');
    if (!e) throw new Error('No video');
    if (!e.ok) await e.promise;
    const v = e.v, D = v.duration;
    if (!D || !isFinite(D)) throw new Error('Couldn’t read this video');
    const step = clamp(D / 80, 0.12, 0.5), n = Math.max(2, Math.floor(D / step));
    const w = 160, h = Math.max(8, Math.round(w * v.videoHeight / v.videoWidth)), N = w * h;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true }), frs = [];
    for (let i = 0; i < n; i++) {
      await seek(v, Math.min(D - 0.03, (i + 0.5) * step));
      cx.drawImage(v, 0, 0, w, h);
      const d = cx.getImageData(0, 0, w, h).data, f = new Float32Array(N * 3);
      for (let j = 0; j < N; j++) { f[j * 3] = d[j * 4]; f[j * 3 + 1] = d[j * 4 + 1]; f[j * 3 + 2] = d[j * 4 + 2]; }
      frs.push(f);
      if (onProgress) onProgress((i + 1) / n * 0.8);
    }
    const med = a => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
    const plateOf = () => { const P = new Float32Array(N * 3), col = new Float32Array(n); for (let j = 0; j < N * 3; j++) { for (let i = 0; i < n; i++) col[i] = frs[i][j]; P[j] = med(col); } return P; };
    let P = plateOf();
    // level each frame's light to the plate, channel by channel
    for (let it = 0; it < 2; it++) {
      for (const f of frs) for (let c = 0; c < 3; c++) {
        const r = []; for (let j = c; j < N * 3; j += 9) if (f[j] > 12 && P[j] > 12) r.push(P[j] / f[j]);
        const g = r.length > 20 ? clamp(med(r), 0.5, 2) : 1;
        if (Math.abs(g - 1) > 0.004) for (let j = c; j < N * 3; j += 3) f[j] *= g;
      }
      P = plateOf();
    }
    const box = [];
    // the room's darkest and lightest within a pixel each way: a hand-held camera's shake moves edges about that much
    const Pmin = new Float32Array(N * 3), Pmax = new Float32Array(N * 3);
    for (let y = 0; y < h; y++) for (let x2 = 0; x2 < w; x2++) for (let c = 0; c < 3; c++) {
      let lo = 1e9, hi = -1e9;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = P[(clamp(y + dy, 0, h - 1) * w + clamp(x2 + dx, 0, w - 1)) * 3 + c]; if (v < lo) lo = v; if (v > hi) hi = v; }
      Pmin[(y * w + x2) * 3 + c] = lo; Pmax[(y * w + x2) * 3 + c] = hi;
    }
    const D2 = new Float32Array(N), M = new Uint8Array(N);
    for (const f of frs) {
      for (let j = 0; j < N; j++) { let d = 0; for (let c = 0; c < 3; c++) { const v = f[j * 3 + c], k = j * 3 + c; d += v > Pmax[k] ? v - Pmax[k] : v < Pmin[k] ? Pmin[k] - v : 0; } D2[j] = d; }
      const thr = Math.max(30, med(Array.from(D2.filter((_, j) => j % 7 === 0))) * 4);
      // a 3 × 3 vote cleans single pixels away
      for (let y = 0; y < h; y++) for (let x2 = 0; x2 < w; x2++) {
        let k = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = clamp(y + dy, 0, h - 1), xx = clamp(x2 + dx, 0, w - 1); if (D2[yy * w + xx] > thr) k++; }
        M[y * w + x2] = k >= 5 ? 1 : 0;
      }
      // the biggest blob, plus any other big one (an arm held out, a second part of the body)
      const lab = new Int32Array(N), comps = [];
      for (let j = 0; j < N; j++) {
        if (!M[j] || lab[j]) continue;
        const id = comps.length + 1, st = [j]; lab[j] = id; let a = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
        while (st.length) { const q = st.pop(), qx = q % w, qy = (q - qx) / w; a++; x0 = Math.min(x0, qx); x1 = Math.max(x1, qx); y0 = Math.min(y0, qy); y1 = Math.max(y1, qy);
          for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = qx + ox, ny = qy + oy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const ni = ny * w + nx; if (M[ni] && !lab[ni]) { lab[ni] = id; st.push(ni); } } }
        comps.push({ a, x0, y0, x1, y1 });
      }
      const big = comps.reduce((m, c) => Math.max(m, c.a), 0);
      const keep = comps.filter(c => c.a >= Math.max(N * 0.002, big * 0.3));
      if (!keep.length || big < N * 0.003) { box.push(0, 0, 0, 0); continue; }
      const b = keep.reduce((o, c) => [Math.min(o[0], c.x0), Math.min(o[1], c.y0), Math.max(o[2], c.x1 + 1), Math.max(o[3], c.y1 + 1)], [w, h, 0, 0]);
      box.push(Math.round(b[0] / w * 1000), Math.round(b[1] / h * 1000), Math.round(b[2] / w * 1000), Math.round(b[3] / h * 1000));
    }
    if (onProgress) onProgress(1);
    return { n, fps: 1 / step, t0: step / 2, box };
  }
  // where each take's person goes over the take (reference view, u v), the union of their boxes
  function takeBox(sj, a, b) {
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0, k = 0;
    for (let f = frameAt(sj, a); f <= frameAt(sj, b); f++) {
      const bx = (sj.box || []).slice(f * 4, f * 4 + 4).map(q => q / 1000);
      if (!bx[3] || bx[3] - bx[1] < 0.02) continue;
      let cs = [[bx[0], bx[1]], [bx[2], bx[1]], [bx[2], bx[3]], [bx[0], bx[3]]];
      const Hf = sj.cam && sj.cam.moving && sj.cam.H[f];
      if (Hf) cs = cs.map(q => CT.apply(Hf, q[0], q[1]));
      for (const [u, v] of cs) { x0 = Math.min(x0, u); y0 = Math.min(y0, v); x1 = Math.max(x1, u); y1 = Math.max(y1, v); }
      k++;
    }
    return k ? [x0, y0, x1, y1] : null;
  }
  // split-screen zones: full-height strips, one per take, split halfway between where neighbouring takes' people are
  // (side by side), or a box round the person when two takes share the same strip
  function autoZones(sj, spans) {
    const bx = spans.map(sp => takeBox(sj, sp.a, sp.b));
    const idx = spans.map((_, i) => i).filter(i => bx[i]).sort((p, q) => (bx[p][0] + bx[p][2]) - (bx[q][0] + bx[q][2]));
    const zones = spans.map(() => null);
    const strip = (l, r) => [[l, -0.02], [r, -0.02], [r, 1.02], [l, 1.02]];
    for (let k = 0; k < idx.length; k++) {
      const i = idx[k], b = bx[i], L = k ? bx[idx[k - 1]] : null, Rr = k < idx.length - 1 ? bx[idx[k + 1]] : null;
      const cut = (a2, b2) => (a2[2] <= b2[0] ? (a2[2] + b2[0]) / 2 : null);
      const l = L ? cut(L, b) : -0.02, r = Rr ? cut(b, Rr) : 1.02;
      if (l == null || r == null) {
        // overlapping sideways: a padded box round this take's person
        const px = (b[2] - b[0]) * 0.18 + 0.02, py = (b[3] - b[1]) * 0.1 + 0.02;
        zones[i] = [[b[0] - px, b[1] - py], [b[2] + px, b[1] - py], [b[2] + px, Math.min(1.02, b[3] + py)], [b[0] - px, Math.min(1.02, b[3] + py)]];
      } else zones[i] = strip(l, r);
    }
    return zones.map(z => z && z.map(([u, v]) => [+u.toFixed(4), +v.toFixed(4)]));
  }
  S.prepareClones = async function (el) {
    if (ready(el)) return el;
    await S.findSubject(el, { people: true, whole: true, cam: true });
    return S.doc.elements.find(e => e.id === el.id) || null;
  };
  // mode: 'places' | 'trail' | 'freeze'
  S.makeClones = async function (el, mode, o = {}) {
    // split screen: Many places cut into zones; it can use a quick look at the clip instead of the people finder
    const split = mode === 'split' || (mode === 'places' && o.cut === 'zone');
    if (mode === 'split') mode = 'places';
    let sj;
    if (split && !ready(el)) {
      const scan = await scanClip(el, o.onProgress);
      el = S.doc.elements.find(e => e.id === el.id);
      if (!el) return { el: null, note: '' };
      sj = scan;
    } else {
      el = await S.prepareClones(el);
      if (!el || !ready(el)) throw new Error('Couldn’t find anyone in this video to clone');
      sj = el.subj;
    }
    const prev = el.clones || {};
    const cfg = { on: true, mode, order: prev.order || 'depth', soft: prev.soft ?? 1, grow: prev.grow || 0, steady: prev.steady !== false };
    if (split) Object.assign(cfg, { cut: 'zone', feather: prev.feather ?? 30 });
    let video = null, note = '';
    // Many places cuts the clip to its first take: the other looks (and taking clones off) give the whole clip back
    const was = prev.mode === 'places' && prev.was ? prev.was : null;
    if (was && mode !== 'places') video = Object.assign({}, el.video, was);
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
      cfg.was = was || { trim: el.video.trim || 0, end: el.video.end ?? null };
      video = Object.assign({}, el.video, { trim: +takes[0].a.toFixed(3), end: +Math.min(D, takes[0].a + L).toFixed(3) });
      if (split) {
        if (sj !== el.subj) cfg.scan = sj;
        const zs = autoZones(sj, takes.map(tk => ({ a: tk.a, b: Math.min(D, tk.a + L) })));
        cfg.list.forEach((it, i) => { it.zone = zs[i + 1] || [[i / cfg.list.length, -0.02], [(i + 1) / cfg.list.length, -0.02], [(i + 1) / cfg.list.length, 1.02], [i / cfg.list.length, 1.02]]; });
      }
    }
    S.changeEl(el, e => { e.clones = cfg; if (video) e.video = video; });
    S.commit();
    return { el: S.doc.elements.find(e => e.id === el.id), note };
  };
  S.removeClones = function (el) { S.changeEl(el, e => { if (e.clones && e.clones.mode === 'places' && e.clones.was) e.video = Object.assign({}, e.video, e.clones.was); delete e.clones; }); S.commit(); };

  /* ── the inspector ── */
  const U = S.ui, { h, ic, sec, row, full, more, label, num, seg, toggle, toast } = U;
  const fmt = s => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`; };
  const setCl = (el, patch, live) => { S.changeEl(el, e => { e.clones = Object.assign({}, e.clones, patch); }, live); if (!live) S.commit(); };
  const nowSource = el => { const v = vidOf(el); return v ? v.currentTime : 0; };
  let busy = null;
  async function start(el, mode, o = {}) {
    busy = { id: el.id, mode, p: 0, scan: mode === 'split' || o.cut === 'zone' };
    U.renderInspector();
    try {
      const r = await S.makeClones(el, mode, Object.assign({ onProgress: p => { if (!busy) return; busy.p = p; const bar = document.querySelector('.clone-busy i'); if (bar) bar.style.width = Math.round(p * 100) + '%'; } }, o));
      if (r.note) toast(r.note);
      else toast({ places: 'Clones in every spot you stood', split: 'Each take plays in its own part of the frame', trail: 'Clone trail on', freeze: 'Freeze trail on' }[busy && busy.scan ? 'split' : mode]);
    } catch (e) { if (e && e.name !== 'AbortError') toast(e.message || 'Couldn’t make clones'); }
    busy = null;
    U.renderInspector();
  }
  S.on('subjectprogress', id => { if (busy && busy.id === id) { const bar = document.querySelector('.clone-busy i'), j = S.subjectJob(id); if (bar && j) bar.style.width = Math.round(j.p * 100) + '%'; const t = document.querySelector('.clone-busy span'); if (t && j) t.textContent = j.loading ? 'Getting the people finder…' : `Finding the subject in every frame… ${Math.round(j.p * 100)}%`; } });
  const MODES = [['places', 'Many places', 'One long take where you move to a new spot each time — every spot plays at once, each person cut out'], ['trail', 'Trail', 'Copies follow a moment behind'], ['freeze', 'Freeze trail', 'A frozen copy left behind as you move']];
  const TILES = [MODES[0], ['split', 'Split screen', 'The same, cut in straight parts of the frame instead of round the person — quick, for a camera on a tripod'], MODES[1], MODES[2]];
  const ICON = {
    places: '<svg viewBox="0 0 48 32"><circle cx="10" cy="11" r="3.4"/><rect x="7" y="15" width="6" height="11" rx="2.5"/><circle cx="24" cy="9" r="3.4"/><rect x="21" y="13" width="6" height="11" rx="2.5"/><circle cx="38" cy="12" r="3.4"/><rect x="35" y="16" width="6" height="11" rx="2.5"/></svg>',
    trail: '<svg viewBox="0 0 48 32"><g opacity=".25"><circle cx="9" cy="10" r="3.4"/><rect x="6" y="14" width="6" height="12" rx="2.5"/></g><g opacity=".5"><circle cx="19" cy="10" r="3.4"/><rect x="16" y="14" width="6" height="12" rx="2.5"/></g><g opacity=".75"><circle cx="29" cy="10" r="3.4"/><rect x="26" y="14" width="6" height="12" rx="2.5"/></g><circle cx="39" cy="10" r="3.4"/><rect x="36" y="14" width="6" height="12" rx="2.5"/></svg>',
    split: '<svg viewBox="0 0 48 32"><path d="M17 2v28M31 2v28" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 2" fill="none"/><circle cx="9" cy="11" r="3.4"/><rect x="6" y="15" width="6" height="11" rx="2.5"/><circle cx="24" cy="9" r="3.4"/><rect x="21" y="13" width="6" height="11" rx="2.5"/><circle cx="39" cy="12" r="3.4"/><rect x="36" y="16" width="6" height="11" rx="2.5"/></svg>',
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
      const scanning = busy && busy.scan && !job;
      return sec('Clones', [h('div.clone-busy', null, h('div.cap-bar', null, h('i', { style: { width: Math.round(((scanning ? busy.p : job && job.p) || 0) * 100) + '%' } })), h('span', null, scanning ? 'Looking at the clip…' : 'Finding the subject in every frame…')),
        full(h('button.btn', { type: 'button', onclick: () => { S.cancelSubject(el.id); busy = null; U.renderInspector(); } }, 'Cancel'))], true, { key: 'clones' });
    }
    if (!cl || !cl.on) {
      return sec('Clones', [
        h('p.hint', null, 'The same person in several places at once. Works best with the camera on a tripod; a moving camera is followed so the copies stay put.'),
        h('div.clone-tiles', null, TILES.map(m => tile(el, m))),
      ], false, { key: 'clones' });
    }
    const mode = cl.mode, kids = [], zones = mode === 'places' && cl.cut === 'zone';
    kids.push(row('Look', seg('sel', null, [['places', 'Places'], ['trail', 'Trail'], ['freeze', 'Freeze']], { get: () => mode, set: v => { if (v !== mode) start(el, v); } })));
    if (mode === 'trail') {
      kids.push(row('Copies', num('sel', null, { get: () => cl.count || 4, set: (v, live) => setCl(el, { count: Math.round(v) }, live), min: 1, max: MAX, slider: true })));
      kids.push(row('Gap', num('sel', null, { get: () => cl.gap ?? 0.35, set: (v, live) => setCl(el, { gap: +v.toFixed(2) }, live), min: 0.05, max: 2, step: 0.05, unit: 's', slider: true })));
      kids.push(row('Fade', num('sel', null, { get: () => cl.fade ?? 0.5, set: (v, live) => setCl(el, { fade: v }, live), min: 0, max: 95, scale: 100, unit: '%', slider: true })));
    } else {
      const rows = (cl.list || []).map((it, i) => itemRow(el, it, i, mode));
      kids.push(label(mode === 'places' ? 'Takes (1 is the video itself)' : 'Frozen copies'));
      kids.push(h('div.clone-list', null, rows.length ? rows : h('p.hint', null, 'None yet.')));
      const add = mode === 'places'
        ? h('button.btn.small', { type: 'button', title: 'Add a take starting where the clip is now', onclick: () => { const v = vidOf(el), at = v ? v.currentTime : 0; setCl(el, { list: (cl.list || []).concat(Object.assign({ id: uid(), dt: +(at - (el.video.trim || 0)).toFixed(3) }, zones ? { zone: [[0.34, -0.02], [0.66, -0.02], [0.66, 1.02], [0.34, 1.02]] } : {})) }); U.renderInspector(); } }, ic('plus'), 'Take from here')
        : h('button.btn.small', { type: 'button', title: 'Freeze a copy at the frame on screen', onclick: () => { const at = +nowSource(el).toFixed(3); setCl(el, { list: (cl.list || []).concat({ id: uid(), at }).sort((a, b) => a.at - b.at) }); U.renderInspector(); } }, ic('plus'), 'Freeze here');
      kids.push(h('div.cap-actions', null, add));
      if (mode === 'places') {
        kids.push(row('Length', seg('sel', null, [['shortest', 'Shortest take'], ['longest', 'Longest']], { get: () => cl.length || 'shortest', set: v => { const takes = [{ a: el.video.trim || 0 }].concat((cl.list || []).map(x => ({ a: (el.video.trim || 0) + x.dt }))); const D = durOf(el); const lens = takes.map((tk, i) => { const nx = takes.slice().sort((p, q) => p.a - q.a).find(q => q.a > tk.a); return (nx ? nx.a : D) - tk.a; }); const L = Math.max(1, v === 'longest' ? Math.max(...lens) : Math.min(...lens)); S.changeEl(el, e => { e.clones = Object.assign({}, e.clones, { length: v }); e.video = Object.assign({}, e.video, { end: +Math.min(D, (e.video.trim || 0) + L).toFixed(3) }); }); S.commit(); U.renderInspector(); } })));
        kids.push(row('Take ends', seg('sel', null, [['hold', 'Hold'], ['loop', 'Loop']], { get: () => cl.edge || 'hold', set: v => setCl(el, { edge: v }) })));
        kids.push(row('Cut', seg('sel', null, [['person', 'Person'], ['zone', 'Split screen']], { get: () => (zones ? 'zone' : 'person'), set: v => { if ((v === 'zone') !== zones) start(el, 'places', { cut: v, length: cl.length }); } })));
        if (zones) {
          const editing = S.isEditingMask && S.isEditingMask();
          kids.push(h('div.cap-actions', null,
            h('button.btn.small' + (editing ? '.on' : ''), { type: 'button', title: 'Move each take’s part of the frame on the canvas', onclick: () => (editing ? S.endMaskEdit() : editZones(el)) }, ic('path'), editing ? 'Done' : 'Edit zones'),
            h('button.btn.small', { type: 'button', title: 'Work the zones out again from where everyone stands', onclick: () => resetZones(el) }, ic('refresh'), 'Reset zones')));
          kids.push(row('Seams', num('sel', null, { get: () => cl.feather ?? 30, set: (v, live) => setCl(el, { feather: Math.round(v) }, live), min: 0, max: 100, slider: true })));
        }
      } else kids.push(toggle('sel', null, 'Each appears when it’s reached', { get: () => cl.reveal !== false, set: v => setCl(el, { reveal: v }) }));
    }
    if (!zones) kids.push(row('In front', seg('sel', null, [['depth', 'Nearest'], ['newest', 'Newest']], { get: () => cl.order || 'depth', set: v => setCl(el, { order: v }) })));
    if (zones) {
      kids.push(h('div.cap-actions', null, h('button.btn.small', { type: 'button', onclick: () => { S.removeClones(el); U.renderInspector(); } }, ic('trash'), 'Remove clones')));
      return sec('Clones', kids, true, { key: 'clones' });
    }
    kids.push(more('clones-more', [
      row('Edge', num('sel', null, { get: () => cl.grow || 0, set: (v, live) => setCl(el, { grow: Math.round(v) }, live), min: -3, max: 3, slider: true })),
      row('Softness', num('sel', null, { get: () => cl.soft ?? 1, set: (v, live) => setCl(el, { soft: v }, live), min: 0, max: 6, step: 0.5, slider: true })),
      el.subj && el.subj.cam && el.subj.cam.moving ? toggle('sel', null, 'Keep the copies still as the camera moves', { get: () => cl.steady !== false, set: v => setCl(el, { steady: v }) }) : h('p.hint', null, 'The camera stays still in this clip, so the copies need no steadying.'),
      h('div.cap-actions', null,
        h('button.btn.small', { type: 'button', title: 'Look for the subject again, frame by frame', onclick: () => { S.changeEl(el, e => { delete e.subj; }); start(el, mode); } }, ic('refresh'), 'Find again'),
        h('button.btn.small', { type: 'button', onclick: () => { S.removeClones(el); U.renderInspector(); } }, ic('trash'), 'Remove clones')),
    ], 'More'));
    return sec('Clones', kids, true, { key: 'clones' });
  }
  // split-screen zones in the mask editor (masks.js): one shape per take, numbered like the list
  const ZONE_COLS = ['#4d9fff', '#ffb547', '#5ee08a', '#ff6bd5', '#9b8cff', '#47e0e0'];
  function editZones(el) {
    S.startMaskEdit(el, { target: {
      shapes: e => ((e.clones && e.clones.list) || []).map((x, i) => (x.zone && x.on !== false ? { id: x.id, kind: 'pen', pts: x.zone, op: 'add', label: String(i + 2), color: ZONE_COLS[i % ZONE_COLS.length] } : null)).filter(Boolean),
      set: (e, shapes, live) => { S.changeEl(e, x => { x.clones = Object.assign({}, x.clones, { list: x.clones.list.map(it => { const sh = shapes.find(q => q.id === it.id); return sh ? Object.assign({}, it, { zone: sh.pts.map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]) }) : it; }) }); }, live); },
      draw: false,
      hint: 'Each numbered take plays inside its zone — drag a zone, or its corners · click the middle of an edge to add a corner',
    } });
    U.renderInspector();
  }
  function resetZones(el) {
    const cl = el.clones, sj = ready(el) ? el.subj : cl.scan;
    if (!sj) { start(el, 'places', { cut: 'zone', length: cl.length }); return; }
    const t0 = el.video.trim || 0, L = (el.video.end > 0 ? el.video.end : durOf(el)) - t0;
    const zs = autoZones(sj, [{ a: t0, b: t0 + L }].concat((cl.list || []).map(it => ({ a: t0 + it.dt, b: t0 + it.dt + L }))));
    setCl(el, { list: cl.list.map((it, i) => Object.assign({}, it, { zone: zs[i + 1] || it.zone })) });
    U.renderInspector();
  }
  S.on('maskedit', () => { const el = S.selEls()[0]; if (el && el.clones && el.clones.on) U.renderInspector(); });
  U.addSection('el', el => (isVideo(el) ? section(el) : null));
})();
