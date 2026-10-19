/* Collage Studio — layer masks.
   A photo or video can be cut to shapes drawn on it (pen, rectangle, ellipse, brush), to its subject (people found
   automatically, or things clicked — subject.js), or both. Shapes live in the picture's own coordinates (u, v 0–1), so
   they stay on the picture when the layer is moved, cropped or resized; a shape on a video can follow something moving
   (tracker.js: its points are where they were on the frame it was tracked from and move with the track).

   el.mask = { on, invert, feather (0–100), expand (−50…50), subject: false | true,
               shapes: [{ id, kind: 'pen' | 'rect' | 'ellipse' | 'brush', pts: [[u, v]…], smooth, r (brush: × short side),
                          op: 'add' | 'cut', hidden, track: { …S.trackLayer result, refAt } }] }

   R.maskFrame(el, img, env) (called from drawImageEl after the clones) returns the picture with the mask as its alpha.
   S.startMaskEdit(el, opts) opens the on-canvas editor; opts.target lets clones.js edit its split-screen zones with it. */
(function () {
  'use strict';
  const S = window.Studio, R = window.StudioRender;
  if (!S || !R) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => 's' + Math.random().toString(36).slice(2, 8);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
  const iwOf = s => s.videoWidth || s.naturalWidth || s.width;
  const ihOf = s => s.videoHeight || s.naturalHeight || s.height;
  const isVideo = el => el && el.type === 'image' && el.assetId && R.isVideoAsset(el.assetId);
  const vidOf = el => (isVideo(el) ? R.assetImage(el.assetId) : null);

  /* ── shapes through time ── */
  // where a tracked shape's points are at media time m: a function on picture pixels (and its inverse, for editing)
  function motionAt(sh, m, iw, ih) {
    const tr = sh && sh.track;
    if (!tr || !tr.pts || !tr.pts.length || m == null || !R.trackSampleAt) return null;
    const now = R.trackSampleAt(tr, m), ref = R.trackSampleAt(tr, tr.refAt ?? tr.t0);
    if (!now || !ref) return null;
    if (tr.mode === 'plane') {
      const quad = q => [0, 1, 2, 3].map(i => ({ x: q[i * 2] * iw, y: q[i * 2 + 1] * ih }));
      const A = quad(ref), B = quad(now), H = R.quadH(A, B), Hi = R.quadH(B, A);
      if (!H || !Hi) return null;
      return { f: (x, y) => R.hpt(H, x, y), inv: (x, y) => R.hpt(Hi, x, y) };
    }
    const cx0 = ref[0] * iw, cy0 = ref[1] * ih, cx1 = now[0] * iw, cy1 = now[1] * ih;
    const ds = (now[2] || 1) / (ref[2] || 1), a = ((now[3] || 0) - (ref[3] || 0)) * Math.PI / 180, ca = Math.cos(a) * ds, sa = Math.sin(a) * ds;
    return {
      f: (x, y) => { const dx = x - cx0, dy = y - cy0; return { x: cx1 + ca * dx - sa * dy, y: cy1 + sa * dx + ca * dy }; },
      inv: (x, y) => { const dx = x - cx1, dy = y - cy1, d = ca * ca + sa * sa || 1; return { x: cx0 + (ca * dx + sa * dy) / d, y: cy0 + (-sa * dx + ca * dy) / d }; },
    };
  }
  // a shape's points in picture pixels at media time m
  function ptsAt(sh, m, iw, ih) {
    const mo = motionAt(sh, m, iw, ih);
    return sh.pts.map(([u, v]) => (mo ? mo.f(u * iw, v * ih) : { x: u * iw, y: v * ih }));
  }
  // the outline of a shape as a Path2D (brush strokes are stroked, not filled)
  function shapePath(sh, P) {
    const p = new Path2D();
    if (!P.length) return p;
    if (sh.kind === 'ellipse' && P.length >= 4) {
      // the ellipse inside the box (or the quad a tracked box has become): unit circle through the box's affine
      const u = new Path2D(); u.ellipse(0.5, 0.5, 0.5, 0.5, 0, 0, Math.PI * 2);
      const [a, b, , d] = P;
      p.addPath(u, new DOMMatrix([b.x - a.x, b.y - a.y, d.x - a.x, d.y - a.y, a.x, a.y]));
      return p;
    }
    if (sh.kind === 'brush') {
      p.moveTo(P[0].x, P[0].y);
      if (P.length === 1) p.lineTo(P[0].x + 0.01, P[0].y);
      for (let i = 1; i < P.length; i++) { const m = { x: (P[i - 1].x + P[i].x) / 2, y: (P[i - 1].y + P[i].y) / 2 }; p.quadraticCurveTo(P[i - 1].x, P[i - 1].y, m.x, m.y); }
      p.lineTo(P[P.length - 1].x, P[P.length - 1].y);
      return p;
    }
    if (sh.smooth && P.length > 2) {
      // a closed Catmull-Rom curve through the points
      const n = P.length, g = i => P[(i + n) % n];
      p.moveTo(P[0].x, P[0].y);
      for (let i = 0; i < n; i++) {
        const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
        p.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
      }
      p.closePath();
      return p;
    }
    p.moveTo(P[0].x, P[0].y);
    for (let i = 1; i < P.length; i++) p.lineTo(P[i].x, P[i].y);
    p.closePath();
    return p;
  }
  // paint shapes (in picture coordinates) into a W × H mask
  function paintShapes(x, shapes, m, iw, ih, W, H, opts = {}) {
    const k = W / iw;
    x.save(); x.scale(k, H / ih);
    for (const sh of shapes) {
      if (sh.hidden || !sh.pts || !sh.pts.length) continue;
      const P = ptsAt(sh, m, iw, ih), path = shapePath(sh, P);
      x.globalCompositeOperation = sh.op === 'cut' && !opts.noCut ? 'destination-out' : 'source-over';
      x.fillStyle = x.strokeStyle = '#fff';
      if (sh.kind === 'brush') { x.lineWidth = (sh.r || 0.03) * Math.min(iw, ih) * 2; x.lineCap = x.lineJoin = 'round'; x.stroke(path); }
      else x.fill(path);
    }
    x.restore();
    x.globalCompositeOperation = 'source-over';
  }
  R.maskShapePaint = paintShapes;
  R.maskShapePts = ptsAt;
  R.maskShapePath = shapePath;

  /* ── soft edges: grow / shrink and feather an alpha mask in place ── */
  function soften(c, expand, feather) {
    const x = c.getContext('2d', { willReadFrequently: true }), W = c.width, H = c.height;
    if (expand) {
      const t = mk(W, H), tx = t.getContext('2d'), r = Math.abs(expand);
      tx.filter = `blur(${(r * 0.5).toFixed(2)}px)`; tx.drawImage(c, 0, 0); tx.filter = 'none';
      const d = tx.getImageData(0, 0, W, H), a = d.data, lo = expand > 0 ? 0.03 : 0.82, hi = expand > 0 ? 0.16 : 0.97;
      for (let i = 3; i < a.length; i += 4) { const v = clamp((a[i] / 255 - lo) / (hi - lo), 0, 1); a[i] = v * v * (3 - 2 * v) * 255; a[i - 3] = a[i - 2] = a[i - 1] = 255; }
      x.clearRect(0, 0, W, H); x.putImageData(d, 0, 0);
    }
    if (feather > 0.3) {
      const t = mk(W, H), tx = t.getContext('2d');
      tx.filter = `blur(${feather.toFixed(2)}px)`; tx.drawImage(c, 0, 0); tx.filter = 'none';
      x.clearRect(0, 0, W, H); x.drawImage(t, 0, 0);
    }
  }
  R.softenMask = soften;

  /* ── subject edges: the subject masks are worked out small (512 px); a guided filter (He, Sun & Tang) against the
     full-size picture lays their edge onto the real outline — hair and fingers instead of a soft blob ── */
  function boxBlur(a, w, h, r) {
    const t = new Float32Array(a.length), o = new Float32Array(a.length);
    for (let y = 0; y < h; y++) { let s = 0; const row = y * w; for (let x = -r; x <= r; x++) s += a[row + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) { t[row + x] = s; s += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) { o[y * w + x] = s; s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
    const k = 1 / ((2 * r + 1) * (2 * r + 1)); for (let i = 0; i < o.length; i++) o[i] *= k;
    return o;
  }
  function guidedEdge(c, img) {
    const W = c.width, H = c.height, k = Math.min(1, (R.playing ? 640 : 1100) / Math.max(W, H)), w = Math.max(2, Math.round(W * k)), h = Math.max(2, Math.round(H * k));
    const g = mk(w, h), gx = g.getContext('2d', { willReadFrequently: true });
    gx.drawImage(img, 0, 0, w, h);
    let fd; try { fd = gx.getImageData(0, 0, w, h).data; } catch (e) { return; }
    gx.clearRect(0, 0, w, h); gx.drawImage(c, 0, 0, w, h);
    const md = gx.getImageData(0, 0, w, h), mdd = md.data, n = w * h, I = new Float32Array(n), P = new Float32Array(n);
    let any = false;
    for (let i = 0; i < n; i++) { I[i] = (fd[i * 4] * 0.299 + fd[i * 4 + 1] * 0.587 + fd[i * 4 + 2] * 0.114) / 255; P[i] = mdd[i * 4 + 3] / 255; if (P[i] > 0.02) any = true; }
    if (!any) return;
    const r = Math.max(2, Math.round(Math.max(w, h) / 220)), eps = 0.0015;
    const II = new Float32Array(n), IP = new Float32Array(n);
    for (let i = 0; i < n; i++) { II[i] = I[i] * I[i]; IP[i] = I[i] * P[i]; }
    const mI = boxBlur(I, w, h, r), mP = boxBlur(P, w, h, r), mII = boxBlur(II, w, h, r), mIP = boxBlur(IP, w, h, r);
    const A = new Float32Array(n), B = new Float32Array(n);
    for (let i = 0; i < n; i++) { const v = mII[i] - mI[i] * mI[i], cv = mIP[i] - mI[i] * mP[i]; A[i] = cv / (v + eps); B[i] = mP[i] - A[i] * mI[i]; }
    const mA = boxBlur(A, w, h, r), mB = boxBlur(B, w, h, r);
    // then matting at the edge: the colours of the person and of the background nearby (averaged from where the mask
    // is sure), and each edge pixel's opacity from where its colour lies between the two — a light wall round dark hair
    // no longer comes along as a halo
    const r2 = Math.max(4, Math.round(Math.max(w, h) / 50)), FM = new Float32Array(n), BM = new Float32Array(n);
    for (let i = 0; i < n; i++) { FM[i] = P[i] > 0.92 ? 1 : 0; BM[i] = P[i] < 0.06 ? 1 : 0; }
    const cF = boxBlur(FM, w, h, r2), cB = boxBlur(BM, w, h, r2), F = [], Bk = [], C = [];
    for (let ch = 0; ch < 3; ch++) {
      const Ic = new Float32Array(n); for (let i = 0; i < n; i++) Ic[i] = fd[i * 4 + ch] / 255;
      const fi = new Float32Array(n), bi = new Float32Array(n); for (let i = 0; i < n; i++) { fi[i] = Ic[i] * FM[i]; bi[i] = Ic[i] * BM[i]; }
      F.push(boxBlur(fi, w, h, r2)); Bk.push(boxBlur(bi, w, h, r2)); C.push(Ic);
    }
    for (let i = 0; i < n; i++) {
      // only near the edge: well inside and well outside stay as they were
      const p = P[i];
      if (p < 0.004 && mP[i] < 0.004) { mdd[i * 4 + 3] = 0; continue; }
      const q = clamp(mA[i] * I[i] + mB[i], 0, 1), t = clamp((q - 0.12) / 0.76, 0, 1);
      let al = t * t * (3 - 2 * t);
      if (p > 0.01 && p < 0.99 && cF[i] > 0.04 && cB[i] > 0.04) {
        let num = 0, den = 0;
        for (let ch = 0; ch < 3; ch++) { const f = F[ch][i] / cF[i], b = Bk[ch][i] / cB[i], d = f - b; num += (C[ch][i] - b) * d; den += d * d; }
        const conf = clamp((den - 0.006) / 0.03, 0, 1);
        if (conf > 0) { const am = clamp(num / den, 0, 1), sm = clamp((am - 0.08) / 0.84, 0, 1); al = al * (1 - conf) + sm * conf; }
      }
      mdd[i * 4] = mdd[i * 4 + 1] = mdd[i * 4 + 2] = 255; mdd[i * 4 + 3] = Math.round(al * 255);
    }
    gx.putImageData(md, 0, 0);
    const x = c.getContext('2d');
    x.clearRect(0, 0, W, H); x.imageSmoothingQuality = 'high'; x.drawImage(g, 0, 0, W, H);
  }
  R.guidedMaskEdge = guidedEdge;

  /* ── the mask of a layer at a moment ── */
  // media time of the picture on screen / being exported
  function mediaTime(el, env) {
    const v = vidOf(el);
    if (!v) return null;
    const t = 'time' in env ? env.time : R.playTime;
    return env.editor ? v.currentTime : R.videoTarget(el.video, t, v, (el.time && el.time.start) || 0);
  }
  R.maskMediaTime = mediaTime;
  function buildMask(el, m, iw, ih, W, H, img) {
    const mk0 = el.mask, c = mk(W, H), x = c.getContext('2d');
    const shapes = (mk0.shapes || []).filter(s => !s.hidden && s.pts && s.pts.length);
    let any = false;
    c.pending = false;
    if (mk0.subject && R.hasSubject(el)) {
      const sm = R.subjectMask(el, m || 0, 'mask');
      // its sprite sheet isn't decoded yet: draw what there is, but don't keep it
      if (!sm) c.pending = true;
      if (sm) { x.imageSmoothingQuality = 'high'; x.drawImage(sm, 0, 0, W, H); any = true; if (img && !R.noGuidedEdge) guidedEdge(c, img); }
    }
    // only cuts: they cut out of the whole picture
    if (!any && shapes.length && shapes.every(s => s.op === 'cut')) { x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); }
    if (shapes.length) paintShapes(x, shapes, m, iw, ih, W, H);
    const unit = Math.min(W, H);
    soften(c, (mk0.expand || 0) / 50 * unit * 0.025, (mk0.feather || 0) / 100 * unit * 0.04);
    if (mk0.invert) {
      x.globalCompositeOperation = 'xor'; x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
    }
    return c;
  }
  const cache = new Map();
  let unsettled = 0;
  R.maskEditing = null;
  R.maskFrame = function (el, img, env) {
    const mask = el.mask;
    if (!mask || !mask.on) return null;
    const active = (mask.subject && R.hasSubject(el)) || (mask.shapes || []).some(s => !s.hidden && s.pts && s.pts.length);
    if (!active) return null;
    const v = vidOf(el), m = mediaTime(el, env), iw = iwOf(img), ih = ihOf(img);
    const cap = v ? (env.editor ? (R.playing ? 960 : 1280) : 1920) : 4096, k = Math.min(1, cap / Math.max(iw, ih));
    const W = Math.max(1, Math.round(iw * k)), H = Math.max(1, Math.round(ih * k)), editing = R.maskEditing === el.id && !!env.editor;
    const key = JSON.stringify(mask) + '|' + (m == null ? '' : m.toFixed(3)) + '|' + W + 'x' + H + '|' + (el.subj ? (el.subj.sheets || []).join() : '') + '|' + (img._stamp || el.assetId) + (editing ? '|edit' : '');
    let hit = cache.get(el.id);
    if (hit && hit.key === key) return hit.c;
    if (!hit) { hit = { c: mk(W, H), key: '' }; cache.set(el.id, hit); }
    const c = hit.c; if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const x = c.getContext('2d');
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, W, H);
    x.drawImage(img, 0, 0, W, H);
    const mc = buildMask(el, m, iw, ih, W, H, img);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(mc, 0, 0);
    // while the mask is edited, the rest of the picture shows faintly underneath
    if (editing) { x.globalCompositeOperation = 'destination-over'; x.globalAlpha = 0.28; x.drawImage(img, 0, 0, W, H); x.globalAlpha = 1; }
    x.globalCompositeOperation = 'source-over';
    // a video still seeking shows its old picture under its new time: don't keep that one
    const settled = !(v && v.seeking) && !(img.seeking) && !mc.pending;
    if (mc.pending) setTimeout(() => R.requestRedraw(), 120);
    hit.key = settled ? key : '';
    c._interp = true; c._stamp = settled ? key : key + '~' + (++unsettled);
    return c;
  };

  /* ── tracking a shape ── */
  // the bounding box of a shape where it is now, on the canvas (for the tracker's region)
  async function trackShape(el, sh, onProgress, signal) {
    const v = vidOf(el), map = R.videoSpaceMap(S.doc, el.id);
    if (!v || !map) throw new Error('Only shapes on a video can follow something');
    const iw = iwOf(v), ih = ihOf(v), at = v.currentTime;
    // the points as they are on this frame become the shape's reference
    const P = ptsAt(sh, at, iw, ih).map(p => [p.x / iw, p.y / ih]);
    let u0 = 1, v0 = 1, u1 = 0, v1 = 0;
    for (const [u, w] of P) { u0 = Math.min(u0, u); v0 = Math.min(v0, w); u1 = Math.max(u1, u); v1 = Math.max(v1, w); }
    u0 = clamp(u0, 0, 1); v0 = clamp(v0, 0, 1); u1 = clamp(u1, 0, 1); v1 = clamp(v1, 0, 1);
    if (u1 - u0 < 0.01 || v1 - v0 < 0.01) throw new Error('The shape is too small to follow');
    const plane = sh.follow === 'plane';
    const pts = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, w]) => map.toCanvas(u, w));
    const tr = await S.trackLayer(el, { src: el.id, region: { mode: plane ? 'plane' : 'object', pts }, at, onProgress, signal });
    tr.refAt = tr.t0 + Math.round((at - tr.t0) / tr.dt) * tr.dt;
    tr.steady = 6;
    return { pts: P, track: tr };
  }

  /* ── the editor on the canvas ── */
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  let ed = null;
  S.isEditingMask = () => !!ed;
  const edLayer = () => ed && S.doc.elements.find(e => e.id === ed.id);
  // the default target: the layer's own mask
  const maskTarget = {
    shapes: el => (el.mask && el.mask.shapes) || [],
    set: (el, shapes, live) => S.changeEl(el, e => { e.mask = Object.assign({ on: true, feather: 0, expand: 0, invert: false, subject: false }, e.mask, { on: true, shapes }); }, live),
    draw: true,
  };
  function pictureMap(el) {
    const map = R.videoSpaceMap(S.doc, el.id), img = R.assetImage(el.assetId);
    if (!map || !img) return null;
    const iw = iwOf(img), ih = ihOf(img), v = vidOf(el), m = v ? v.currentTime : null;
    const toScreen = (x, y) => { const q = map.toCanvas(x / iw, y / ih); return { x: S.view.x + q.x * S.view.scale, y: S.view.y + q.y * S.view.scale }; };
    const fromScreen = (sx, sy) => { const p = S.docPoint(sx, sy), q = map.fromCanvas(p.x, p.y); return { x: q.u * iw, y: q.v * ih }; };
    // screen px per picture px
    const a = toScreen(0, 0), b = toScreen(iw, 0), k = Math.hypot(b.x - a.x, b.y - a.y) / iw;
    return { map, iw, ih, m, toScreen, fromScreen, k };
  }
  S.startMaskEdit = function (el, opts = {}) {
    const area = document.getElementById('stage-area');
    if (!el || el.type !== 'image' || !el.assetId || !area) return;
    S.endMaskEdit();
    if (S.endSubjectPick) S.endSubjectPick(true);
    if (S.isPlaying && S.isPlaying()) S.pause();
    const target = opts.target || maskTarget;
    const root = document.createElement('div'); root.className = 'mask-edit';
    const svg = svgEl('svg', { class: 'mask-svg' });
    const bar = document.createElement('div'); bar.className = 'mask-bar';
    root.append(svg, bar); area.append(root);
    ed = { id: el.id, root, svg, bar, target, tool: target.draw ? (opts.tool || 'pen') : 'select', op: 'add', sel: opts.sel || null, draft: null, drag: null, brush: 0.03 };
    R.maskEditing = target.draw ? el.id : null;
    buildBar();
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('dblclick', e => { if (ed && ed.draft && ed.draft.kind === 'pen') { e.preventDefault(); finishDraft(); } });
    render();
    R.requestRedraw();
    S.emit('maskedit', true);
  };
  S.endMaskEdit = function () {
    if (!ed) return;
    if (ed.draft && ed.draft.kind === 'pen' && ed.draft.pts.length >= 3) finishDraft();
    const id = ed.id;
    ed.root.remove(); ed = null;
    R.maskEditing = null;
    const el = S.doc.elements.find(e => e.id === id);
    if (el) S.changeEl(el, () => {}, true);
    R.requestRedraw();
    S.emit('maskedit', false);
  };
  const TOOLS = [['select', 'Select and move', 'M5 3l14 8-6 1.6L10 19z'], ['pen', 'Pen', 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3'], ['rect', 'Rectangle', 'M4 6h16v12H4z'], ['ellipse', 'Ellipse', 'M12 19c4.4 0 8-3.1 8-7s-3.6-7-8-7-8 3.1-8 7 3.6 7 8 7z'],
    ['brush', 'Brush', 'M7 16c-2 0-3 1.5-3 4 2.5 0 4-1 4-3M8.5 15.5 19 5l-1.5-1.5L7 14']];
  function icon(d) { const s = svgEl('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); s.append(svgEl('path', { d })); return s; }
  function buildBar() {
    const b = ed.bar; b.replaceChildren();
    if (ed.target.draw) {
      const tools = document.createElement('div'); tools.className = 'mask-tools';
      for (const [k, name, d] of TOOLS) {
        const t = document.createElement('button'); t.type = 'button'; t.className = 'mask-tool' + (ed.tool === k ? ' on' : ''); t.title = name; t.append(icon(d));
        t.addEventListener('click', () => { if (ed.draft) finishDraft(); ed.tool = k; buildBar(); });
        tools.append(t);
      }
      b.append(tools);
      const ops = document.createElement('div'); ops.className = 'mask-ops';
      for (const [k, name, tip] of [['add', 'Add', 'New shapes show the picture'], ['cut', 'Cut', 'New shapes cut it away']]) {
        const o = document.createElement('button'); o.type = 'button'; o.className = 'mask-op' + (ed.op === k ? ' on' : ''); o.textContent = name; o.title = tip;
        o.addEventListener('click', () => { ed.op = k; buildBar(); });
        ops.append(o);
      }
      b.append(ops);
      if (ed.tool === 'brush') {
        const sz = document.createElement('input'); sz.type = 'range'; sz.min = 0.004; sz.max = 0.15; sz.step = 0.002; sz.value = ed.brush; sz.title = 'Brush size'; sz.className = 'mask-size';
        sz.addEventListener('input', () => { ed.brush = +sz.value; });
        b.append(sz);
      }
    }
    const hint = document.createElement('span'); hint.className = 'mask-hint';
    hint.textContent = ed.target.hint || ({
      pen: S.mobile ? 'Tap points · tap the first to close' : 'Click points round it · click the first point (or double-click) to close · drag a point to move it',
      rect: 'Drag a box', ellipse: 'Drag an ellipse', brush: S.mobile ? 'Paint over it' : 'Paint over it · Alt paints the other way',
    }[ed.tool] || 'Drag the points to change the shape');
    b.append(hint);
    const done = document.createElement('button'); done.type = 'button'; done.className = 'btn primary small'; done.textContent = 'Done';
    done.addEventListener('click', () => S.endMaskEdit());
    b.append(done);
  }
  const shapesNow = () => { const el = edLayer(); return el ? ed.target.shapes(el).map(s => Object.assign({}, s, { pts: s.pts.map(p => p.slice()) })) : []; };
  function commitShapes(shapes, live) { const el = edLayer(); if (el) ed.target.set(el, shapes, live); if (!live) render(); }
  function finishDraft() {
    const d = ed && ed.draft;
    if (!d) return;
    ed.draft = null;
    const ok = d.kind === 'pen' ? d.pts.length >= 3 : d.kind === 'brush' ? d.pts.length >= 1 : true;
    if (ok) {
      const sh = { id: uid(), kind: d.kind, pts: d.pts, op: d.op || ed.op, smooth: d.kind === 'pen' ? false : undefined };
      if (d.kind === 'brush') sh.r = d.r;
      const all = shapesNow(); all.push(sh); ed.sel = sh.id;
      commitShapes(all);
      S.ui && S.ui.renderInspector && S.ui.renderInspector();
    } else render();
  }
  // a point on the picture (in picture px) for a pointer event, and its reference position for a tracked shape
  function toRef(sh, p, pm) { const mo = motionAt(sh, pm.m, pm.iw, pm.ih); return mo ? mo.inv(p.x, p.y) : p; }
  function onDown(e) {
    if (e.target.closest('.mask-bar')) return;
    e.preventDefault(); e.stopPropagation();
    const el = edLayer(), pm = el && pictureMap(el);
    if (!pm) return;
    const p = pm.fromScreen(e.clientX, e.clientY), uv = [p.x / pm.iw, p.y / pm.ih];
    const hitR = (S.mobile ? 18 : 9);
    const shapes = shapesNow();
    // a handle of the selected shape
    const selSh = shapes.find(s => s.id === ed.sel);
    if (selSh && selSh.kind !== 'brush' && !ed.draft) {
      const P = ptsAt(selSh, pm.m, pm.iw, pm.ih).map(q => pm.toScreen(q.x, q.y)), r = ed.root.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
      const hi = P.findIndex(q => Math.hypot(q.x - sx, q.y - sy) < hitR + 3);
      if (hi >= 0) {
        if (e.altKey && selSh.kind === 'pen' && selSh.pts.length > 3) { selSh.pts.splice(hi, 1); commitShapes(shapes); return; }
        startDrag(e, { type: 'point', id: selSh.id, i: hi });
        return;
      }
      // a midpoint adds a point to a pen shape
      if (selSh.kind === 'pen') {
        for (let i = 0; i < P.length; i++) {
          const a = P[i], b = P[(i + 1) % P.length];
          if (Math.hypot((a.x + b.x) / 2 - sx, (a.y + b.y) / 2 - sy) < hitR) {
            const q = toRef(selSh, p, pm); selSh.pts.splice(i + 1, 0, [q.x / pm.iw, q.y / pm.ih]); commitShapes(shapes, true);
            startDrag(e, { type: 'point', id: selSh.id, i: i + 1 });
            return;
          }
        }
      }
    }
    // pen: keep adding points
    if (ed.draft && ed.draft.kind === 'pen') {
      const f = pm.toScreen(ed.draft.pts[0][0] * pm.iw, ed.draft.pts[0][1] * pm.ih), r = ed.root.getBoundingClientRect();
      if (ed.draft.pts.length >= 3 && Math.hypot(f.x - (e.clientX - r.left), f.y - (e.clientY - r.top)) < hitR + 4) { finishDraft(); return; }
      ed.draft.pts.push(uv); render(); return;
    }
    // a shape under the pointer: select it and drag it about
    const hitShape = !ed.target.draw || e.shiftKey || ed.tool === 'select' ? pickShape(shapes, p, pm) : (selSh && inside(selSh, p, pm) ? selSh : null);
    if (hitShape) { ed.sel = hitShape.id; render(); startDrag(e, { type: 'move', id: hitShape.id, from: p }); S.ui && S.ui.renderInspector && S.ui.renderInspector(); return; }
    if (!ed.target.draw) { ed.sel = null; render(); return; }
    ed.sel = null;
    if (ed.tool === 'pen') { ed.draft = { kind: 'pen', pts: [uv] }; render(); return; }
    if (ed.tool === 'rect' || ed.tool === 'ellipse') { ed.draft = { kind: ed.tool, a: uv, pts: [uv, uv, uv, uv] }; startDrag(e, { type: 'box' }); return; }
    if (ed.tool === 'brush') { ed.draft = { kind: 'brush', pts: [uv], r: ed.brush, op: e.altKey ? (ed.op === 'add' ? 'cut' : 'add') : ed.op }; render(); startDrag(e, { type: 'paint' }); }
  }
  function inside(sh, p, pm) {
    const c = mk(1, 1).getContext('2d'), P = ptsAt(sh, pm.m, pm.iw, pm.ih), path = shapePath(sh, P);
    if (sh.kind === 'brush') { c.lineWidth = (sh.r || 0.03) * Math.min(pm.iw, pm.ih) * 2; return c.isPointInStroke(path, p.x, p.y); }
    return c.isPointInPath(path, p.x, p.y);
  }
  function pickShape(shapes, p, pm) { for (let i = shapes.length - 1; i >= 0; i--) if (!shapes[i].hidden && inside(shapes[i], p, pm)) return shapes[i]; return null; }
  function startDrag(e, d) {
    ed.drag = d;
    const el = edLayer(), pm = pictureMap(el);
    const move = ev => {
      if (!ed || !ed.drag) return;
      const p = pm.fromScreen(ev.clientX, ev.clientY), uv = [clamp(p.x / pm.iw, -0.2, 1.2), clamp(p.y / pm.ih, -0.2, 1.2)];
      if (d.type === 'box') {
        const [a0, b0] = ed.draft.a, [a1, b1] = uv, sq = ev.shiftKey;
        let x1 = a1, y1 = b1;
        if (sq) { const s = Math.max(Math.abs(a1 - a0) * pm.iw, Math.abs(b1 - b0) * pm.ih); x1 = a0 + Math.sign(a1 - a0 || 1) * s / pm.iw; y1 = b0 + Math.sign(b1 - b0 || 1) * s / pm.ih; }
        ed.draft.pts = [[a0, b0], [x1, b0], [x1, y1], [a0, y1]];
        render(); return;
      }
      if (d.type === 'paint') { const l = ed.draft.pts[ed.draft.pts.length - 1]; if (Math.hypot((uv[0] - l[0]) * pm.iw, (uv[1] - l[1]) * pm.ih) > Math.min(pm.iw, pm.ih) * 0.004) { ed.draft.pts.push(uv); render(); } return; }
      const shapes = shapesNow(), sh = shapes.find(s => s.id === d.id);
      if (!sh) return;
      if (d.type === 'point') {
        const q = toRef(sh, p, pm);
        if (sh.kind === 'rect' || sh.kind === 'ellipse') {
          // a box keeps its corners square: the opposite corner stays put
          const o = sh.pts[(d.i + 2) % 4], n = [q.x / pm.iw, q.y / pm.ih];
          const box = [[Math.min(o[0], n[0]), Math.min(o[1], n[1])], [Math.max(o[0], n[0]), Math.max(o[1], n[1])]];
          if (!sh.track) { sh.pts = [[box[0][0], box[0][1]], [box[1][0], box[0][1]], [box[1][0], box[1][1]], [box[0][0], box[1][1]]]; d.i = n[0] > o[0] ? (n[1] > o[1] ? 2 : 1) : (n[1] > o[1] ? 3 : 0); }
          else sh.pts[d.i] = n;
        } else sh.pts[d.i] = [q.x / pm.iw, q.y / pm.ih];
      } else if (d.type === 'move') {
        const a = toRef(sh, d.from, pm), b = toRef(sh, p, pm), dx = (b.x - a.x) / pm.iw, dy = (b.y - a.y) / pm.ih;
        sh.pts = sh.pts.map(([u, w]) => [u + dx, w + dy]); d.from = p;
      }
      commitShapes(shapes, true); render();
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (!ed) return;
      const dd = ed.drag; ed.drag = null;
      if (dd.type === 'box') {
        const P = ed.draft.pts, w = Math.abs(P[2][0] - P[0][0]) * pm.iw, hh = Math.abs(P[2][1] - P[0][1]) * pm.ih;
        if (w < 6 || hh < 6) { ed.draft = null; render(); return; }
        const x0 = Math.min(P[0][0], P[2][0]), y0 = Math.min(P[0][1], P[2][1]), x1 = Math.max(P[0][0], P[2][0]), y1 = Math.max(P[0][1], P[2][1]);
        ed.draft.pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
        finishDraft(); return;
      }
      if (dd.type === 'paint') { finishDraft(); return; }
      S.commit(); render();
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  // draw the shapes, handles and the shape being drawn over the canvas
  function render() {
    if (!ed) return;
    const el = edLayer(), pm = el && pictureMap(el), svg = ed.svg;
    svg.replaceChildren();
    if (!pm) return;
    const toS = (u, v) => pm.toScreen(u * pm.iw, v * pm.ih);
    const d = (P, closed) => P.map((q, i) => (i ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1)).join('') + (closed ? 'Z' : '');
    // a shape's outline on screen: the same curve as the mask, sampled
    const outline = (sh, P) => {
      if (sh.kind === 'ellipse' && P.length >= 4) { const [a, b, , dd] = P, out = []; for (let i = 0; i <= 48; i++) { const t = i / 48 * Math.PI * 2, s = 0.5 + 0.5 * Math.cos(t), r = 0.5 + 0.5 * Math.sin(t); out.push({ x: a.x + (b.x - a.x) * s + (dd.x - a.x) * r, y: a.y + (b.y - a.y) * s + (dd.y - a.y) * r }); } return d(out, true); }
      if (sh.smooth && P.length > 2) { const n = P.length, g = i => P[(i + n) % n], out = []; for (let i = 0; i < n; i++) { const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2); for (let k = 0; k < 8; k++) { const t = k / 8, t2 = t * t, t3 = t2 * t; out.push({ x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3), y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3) }); } } return d(out, true); }
      return d(P, sh.kind !== 'brush');
    };
    const shapes = ed.target.shapes(el);
    shapes.forEach((sh, idx) => {
      if (!sh.pts || !sh.pts.length) return;
      const P = ptsAt(sh, pm.m, pm.iw, pm.ih).map(q => pm.toScreen(q.x, q.y)), on = sh.id === ed.sel, col = sh.color || (sh.op === 'cut' ? '#ff6b6b' : '#4d9fff');
      if (sh.kind === 'brush') {
        const w = (sh.r || 0.03) * Math.min(pm.iw, pm.ih) * 2 * pm.k;
        svg.append(svgEl('path', { d: outline(sh, P), fill: 'none', stroke: col, 'stroke-opacity': on ? 0.45 : 0.25, 'stroke-width': Math.max(1, w), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
        return;
      }
      svg.append(svgEl('path', { d: outline(sh, P), fill: on ? col : 'none', 'fill-opacity': 0.08, stroke: col, 'stroke-width': on ? 2 : 1.5, 'stroke-dasharray': sh.hidden ? '4 4' : '', 'vector-effect': 'non-scaling-stroke' }));
      if (sh.label) { const c = P.reduce((s, q) => ({ x: s.x + q.x / P.length, y: s.y + q.y / P.length }), { x: 0, y: 0 }); const t = svgEl('text', { x: c.x, y: c.y, class: 'mask-label', 'text-anchor': 'middle' }); t.textContent = sh.label; svg.append(t); }
      if (!on) return;
      if (sh.kind === 'pen') P.forEach((a, i) => { const b = P[(i + 1) % P.length]; svg.append(svgEl('circle', { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, r: 3.5, class: 'mask-mid' })); });
      P.forEach(q => svg.append(svgEl('circle', { cx: q.x, cy: q.y, r: S.mobile ? 8 : 5.5, class: 'mask-pt', style: `stroke:${col}` })));
    });
    const dr = ed.draft;
    if (dr) {
      const P = dr.pts.map(([u, v]) => toS(u, v)), col = (dr.op || ed.op) === 'cut' ? '#ff6b6b' : '#4d9fff';
      if (dr.kind === 'brush') {
        const w = dr.r * Math.min(pm.iw, pm.ih) * 2 * pm.k;
        svg.append(svgEl('path', { d: d(P.length > 1 ? P : [P[0], { x: P[0].x + 0.1, y: P[0].y }], false), fill: 'none', stroke: col, 'stroke-opacity': 0.5, 'stroke-width': Math.max(1, w), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      } else if (dr.kind === 'ellipse') svg.append(svgEl('path', { d: outline({ kind: 'ellipse' }, P), fill: col, 'fill-opacity': 0.1, stroke: col, 'stroke-width': 1.5 }));
      else svg.append(svgEl('path', { d: d(P, dr.kind !== 'pen'), fill: dr.kind === 'pen' ? 'none' : col, 'fill-opacity': 0.1, stroke: col, 'stroke-width': 1.5 }));
      if (dr.kind === 'pen') P.forEach((q, i) => svg.append(svgEl('circle', { cx: q.x, cy: q.y, r: i === 0 ? 7 : 4.5, class: 'mask-pt' + (i === 0 ? ' first' : ''), style: `stroke:${col}` })));
    }
  }
  S.maskEditRender = render;
  window.addEventListener('keydown', e => {
    if (!ed) return;
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (ed.draft) { ed.draft = null; render(); } else S.endMaskEdit(); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (ed.draft) finishDraft(); else S.endMaskEdit(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && ed.sel && ed.target.draw) {
      e.preventDefault(); e.stopPropagation();
      const all = shapesNow().filter(s => s.id !== ed.sel); ed.sel = null; commitShapes(all); S.ui && S.ui.renderInspector && S.ui.renderInspector();
    }
  }, true);
  S.on('view', render); S.on('time', render); S.on('values', render); S.on('history', render);
  S.on('selection', () => { if (ed && !S.selEls().some(e => e.id === ed.id)) S.endMaskEdit(); });

  /* ── the inspector ── */
  const U = S.ui;
  if (!U || !U.addSection) return;
  const { h, ic, sec, row, num, seg, toggle, toast, more } = U;
  const setMask = (el, patch, live) => S.changeEl(el, e => { e.mask = Object.assign({ on: true, shapes: [], feather: 0, expand: 0, invert: false, subject: false }, e.mask, patch); }, live);
  const tracking = new Map(); // shape id → { p, ctrl }
  async function follow(el, sh, how) {
    if (tracking.has(sh.id)) return;
    const ctrl = new AbortController();
    tracking.set(sh.id, { p: 0, ctrl });
    U.renderInspector();
    try {
      const r = await trackShape(el, Object.assign({}, sh, { follow: how }), p => { const t = tracking.get(sh.id); if (t) { t.p = p; const bar = document.querySelector(`[data-track="${sh.id}"] i`); if (bar) bar.style.width = Math.round(p * 100) + '%'; } }, ctrl.signal);
      const e2 = S.doc.elements.find(e => e.id === el.id);
      if (e2) setMask(e2, { shapes: (e2.mask.shapes || []).map(s => (s.id === sh.id ? Object.assign({}, s, { pts: r.pts, track: r.track, follow: how }) : s)) });
      toast('The shape follows it now');
    } catch (err) { if (!err || err.name !== 'AbortError') toast((err && err.message) || 'Couldn’t follow it'); }
    tracking.delete(sh.id);
    U.renderInspector();
  }
  function unfollow(el, sh) {
    // keep the shape where it is on the frame on screen
    const v = vidOf(el), iw = v ? iwOf(v) : 1, ih = v ? ihOf(v) : 1, P = ptsAt(sh, v ? v.currentTime : null, iw, ih).map(p => [p.x / iw, p.y / ih]);
    setMask(el, { shapes: el.mask.shapes.map(s => (s.id === sh.id ? Object.assign({}, s, { pts: P, track: null, follow: null }) : s)) });
  }
  const KIND = { pen: ['path', 'Shape'], rect: ['square', 'Rectangle'], ellipse: ['target', 'Ellipse'], brush: ['eraser', 'Brush'] };
  function shapeRow(el, sh, i) {
    const t = tracking.get(sh.id), set = patch => setMask(el, { shapes: el.mask.shapes.map(s => (s.id === sh.id ? Object.assign({}, s, patch) : s)) });
    const [icn, name] = KIND[sh.kind] || KIND.pen;
    const kids = [
      h('span.mask-k', null, ic(icn)),
      h('button.mask-name', { type: 'button', title: 'Select it on the canvas', onclick: () => S.startMaskEdit(el, { tool: 'select', sel: sh.id }) }, name + ' ' + (i + 1)),
      h('button.mask-opb' + (sh.op === 'cut' ? '.cut' : ''), { type: 'button', title: sh.op === 'cut' ? 'Cuts away — click to show instead' : 'Shows the picture — click to cut away instead', onclick: () => set({ op: sh.op === 'cut' ? 'add' : 'cut' }) }, sh.op === 'cut' ? '−' : '+'),
    ];
    if (isVideo(el)) {
      if (t) kids.push(h('span.mask-track', { 'data-track': sh.id, title: 'Following…' }, h('i', { style: { width: Math.round(t.p * 100) + '%' } })), h('button.icon-btn', { type: 'button', title: 'Stop', onclick: () => t.ctrl.abort() }, ic('x')));
      else kids.push(h('button.icon-btn' + (sh.track ? '.on' : ''), { type: 'button', title: sh.track ? 'Follows something moving — click to keep it still' : 'Follow something moving in the video', onclick: () => (sh.track ? unfollow(el, sh) : follow(el, sh, 'object')) }, ic('target')));
    }
    kids.push(h('button.icon-btn', { type: 'button', title: sh.hidden ? 'Use this shape' : 'Leave this shape out', onclick: () => set({ hidden: !sh.hidden }) }, ic(sh.hidden ? 'eyeOff' : 'eye')));
    kids.push(h('button.icon-btn', { type: 'button', title: 'Delete', onclick: () => { setMask(el, { shapes: el.mask.shapes.filter(s => s.id !== sh.id) }); U.renderInspector(); } }, ic('trash')));
    return h('div.mask-row' + (sh.hidden ? '.off' : ''), null, kids);
  }
  function subjectRow(el) {
    const sj = R.hasSubject(el) ? el.subj : null, job = S.subjectJob && S.subjectJob(el.id);
    const what = !sj ? 'Finding…' : [sj.people ? 'People' : null, (sj.pts || []).length ? (sj.pts.length + ' picked') : null].filter(Boolean).join(' + ') || 'Subject';
    return h('div.mask-row', null,
      h('span.mask-k', null, ic('user')),
      h('span.mask-name', null, job && !job.quick ? h('span.mask-track', { title: 'Finding it in every frame' }, h('i', { style: { width: Math.round((job.p || 0) * 100) + '%' } })) : what),
      h('button.btn.small', { type: 'button', title: 'Click things on the picture to add them (or take them away)', onclick: () => S.startSubjectPick(el, { people: !!(sj && sj.people) }) }, ic('target'), 'Pick'),
      h('button.icon-btn', { type: 'button', title: 'Don’t use the subject', onclick: () => { setMask(el, { subject: false }); U.renderInspector(); } }, ic('trash')));
  }
  function useSubject(el, how) {
    setMask(el, { subject: true });
    if (how === 'pick') { S.startSubjectPick(S.doc.elements.find(e => e.id === el.id), { people: false }); return; }
    if (!R.hasSubject(el)) S.findSubject(el, { people: true }).then(() => { const e = S.doc.elements.find(x => x.id === el.id); if (e && e.subj && e.subj.cover < 0.01) toast('No people found — pick what to keep', { label: 'Pick', run: () => S.startSubjectPick(e, { people: false }) }); U.renderInspector(); }).catch(err => toast(err.message || 'Couldn’t find anyone'));
    U.renderInspector();
  }
  const TILES = [
    ['subject', 'user', 'Subject', 'The person, found automatically'],
    ['pick', 'target', 'Object', 'Click what to keep'],
    ['draw', 'path', 'Draw', 'Pen, box, ellipse or brush'],
  ];
  function section(el) {
    const mask = el.mask, editing = ed && ed.id === el.id && ed.target === maskTarget;
    if (!mask || !mask.on) {
      return sec('Mask', [
        h('p.hint', null, 'Show only part of this ' + (isVideo(el) ? 'video' : 'photo') + ' — the person, something you click, or a shape you draw.'),
        h('div.mask-tiles', null, TILES.map(([k, icn, name, tip]) => h('button.mask-tile', { type: 'button', title: tip, onclick: () => (k === 'draw' ? (setMask(el, {}), S.startMaskEdit(S.doc.elements.find(e => e.id === el.id)), U.renderInspector()) : useSubject(el, k)) }, ic(icn), h('b', null, name), h('span', null, tip)))),
      ], false, { key: 'mask' });
    }
    const kids = [];
    kids.push(row('Show', seg('sel', null, [['in', 'Inside'], ['out', 'Outside']], { get: () => (mask.invert ? 'out' : 'in'), set: v => setMask(el, { invert: v === 'out' }) })));
    const list = [];
    if (mask.subject) list.push(subjectRow(el));
    (mask.shapes || []).forEach((sh, i) => list.push(shapeRow(el, sh, i)));
    kids.push(h('div.mask-list', null, list.length ? list : h('p.hint', null, 'Nothing yet — add the subject or draw a shape.')));
    kids.push(h('div.cap-actions', null,
      h('button.btn.small' + (editing ? '.on' : ''), { type: 'button', title: 'Draw and change shapes on the canvas', onclick: () => (editing ? S.endMaskEdit() : S.startMaskEdit(el)) }, ic('path'), editing ? 'Done drawing' : 'Draw'),
      mask.subject ? null : h('button.btn.small', { type: 'button', title: 'Keep the person (found automatically)', onclick: () => useSubject(el, 'subject') }, ic('user'), 'Subject'),
      mask.subject ? null : h('button.btn.small', { type: 'button', title: 'Click an object to keep', onclick: () => useSubject(el, 'pick') }, ic('target'), 'Object')));
    kids.push(row('Feather', num('sel', null, { get: () => mask.feather || 0, set: (v, live) => setMask(el, { feather: Math.round(v) }, live), min: 0, max: 100, slider: true })));
    kids.push(more('mask-more', [
      row('Edge', num('sel', null, { get: () => mask.expand || 0, set: (v, live) => setMask(el, { expand: Math.round(v) }, live), min: -50, max: 50, slider: true })),
      (mask.shapes || []).some(s => s.kind === 'pen') ? toggle('sel', null, 'Smooth curves', { get: () => (mask.shapes || []).filter(s => s.kind === 'pen').every(s => s.smooth), set: v => setMask(el, { shapes: mask.shapes.map(s => (s.kind === 'pen' ? Object.assign({}, s, { smooth: v }) : s)) }) }) : null,
      h('div.cap-actions', null, h('button.btn.small', { type: 'button', onclick: () => { if (editing) S.endMaskEdit(); S.changeEl(el, e => { delete e.mask; }); U.renderInspector(); } }, ic('trash'), 'Remove mask')),
    ].filter(Boolean), 'More'));
    return sec('Mask', kids, true, { key: 'mask' });
  }
  U.addSection('el', el => (el && el.type === 'image' && el.assetId && !el.studio?.on ? section(el) : null));
  S.on('maskedit', () => U.renderInspector());
  S.on('subject', () => { const el = S.selEls()[0]; if (el && el.mask && el.mask.on) U.renderInspector(); });
  S.on('subjectprogress', id => { const job = S.subjectJob && S.subjectJob(id), bar = document.querySelector('.mask-row .mask-track i'); if (bar && job) bar.style.width = Math.round((job.p || 0) * 100) + '%'; });
})();
