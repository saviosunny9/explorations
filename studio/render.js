/* Studio — rendering engine.
   Pure canvas-2D drawing for every element type. The editor (Konva) calls
   drawElement() from each node's sceneFunc, and export/thumbnails call
   renderDoc() on a plain canvas, so what you see is exactly what you export. */
(function () {
  'use strict';

  const R = {};
  const TAU = Math.PI * 2;
  const Fonts = window.StudioFonts;

  /* ───────────────────────── resources ───────────────────────── */

  let assets = {};
  const imgCache = new Map();
  const svgCache = new Map();
  let redrawHook = () => {};
  let redrawQueued = false;
  R.fontsVersion = 0;

  function requestRedraw() {
    if (redrawQueued) return;
    redrawQueued = true;
    requestAnimationFrame(() => { redrawQueued = false; redrawHook(); });
  }
  R.setAssets = a => { assets = a; };
  // what each asset is when its URL doesn't say (blob: URLs of videos and sound files)
  let assetKinds = {};
  R.setAssetKinds = k => { assetKinds = k; };
  R.onRedraw = fn => { redrawHook = fn; };
  R.requestRedraw = requestRedraw;
  // safety net: any face finishing (e.g. one first used by the DOM) invalidates text metrics
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { R.fontsVersion++; requestRedraw(); });

  function loadImage(src, cache, key) {
    let e = cache.get(key);
    if (e && e.src === src) return e;
    const img = new Image();
    e = { img, ok: false, failed: false, src };
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
    e.promise = new Promise(res => {
      img.onload = () => { e.ok = true; requestRedraw(); res(); };
      img.onerror = () => { e.failed = true; res(); };
    });
    img.src = src;
    cache.set(key, e);
    if (cache.size > 400) cache.delete(cache.keys().next().value);
    return e;
  }
  function assetImage(id) {
    if (!id || !assets[id]) return null;
    if (isVideoAsset(id)) { const v = assetVideo(id); return v && v.ok ? v.v : null; }
    const e = loadImage(assets[id], imgCache, id);
    return e.ok ? e.img : null;
  }
  R.assetImage = assetImage;
  // photos, canvases and video frames all report their size differently
  const iwOf = s => s.videoWidth || s.naturalWidth || s.width;
  const ihOf = s => s.videoHeight || s.naturalHeight || s.height;
  R.mediaSize = s => (s ? { w: iwOf(s), h: ihOf(s) } : null);

  /* ── video assets: a muted <video> per asset, drawn like a photo ── */
  const vidCache = new Map();
  function isVideoAsset(id) { const a = id && assets[id]; return typeof a === 'string' && (assetKinds[id] === 'video' || a.startsWith('data:video')); }
  R.isVideoAsset = isVideoAsset;
  R.isAudioAsset = id => { const a = id && assets[id]; return typeof a === 'string' && (assetKinds[id] === 'audio' || a.startsWith('data:audio')); };
  function dataToBlobUrl(src) {
    const i = src.indexOf(','), mime = src.slice(5, src.indexOf(';'));
    const bin = atob(src.slice(i + 1)), u = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
    return URL.createObjectURL(new Blob([u], { type: mime }));
  }
  // slot: another <video> of the same file (a clone showing a different moment of it)
  function assetVideo(id, slot) {
    const src = assets[id];
    if (!src) return null;
    const key = slot ? id + '#' + slot : id;
    let e = vidCache.get(key);
    if (e && e.src === src) return e;
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto'; v.loop = false;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    e = { v, ok: false, failed: false, src };
    e.promise = new Promise(res => {
      v.addEventListener('loadeddata', () => { e.ok = true; requestRedraw(); res(); }, { once: true });
      v.addEventListener('error', () => { e.failed = true; res(); }, { once: true });
    });
    v.addEventListener('seeked', () => requestRedraw());
    try { v.src = src.startsWith('data:') ? dataToBlobUrl(src) : src; } catch (err) { e.failed = true; }
    vidCache.set(key, e);
    return e;
  }
  R.assetVideo = assetVideo;
  // the moment of a video that belongs at design time t (null = the still frame used while editing)
  R.videoTarget = function (vd, t, v, start) {
    vd = vd || {};
    const dur = v && v.duration;
    if (!dur || !isFinite(dur)) return 0;
    const end = vd.end > 0 ? Math.min(dur, vd.end) : dur;
    const ts = clamp(vd.trim || 0, 0, Math.max(0, end - 0.05)), len = Math.max(0.05, end - ts);
    if (t == null) return Math.min(dur - 0.02, ts + (vd.poster || 0));
    const lt = Math.max(0, t - (start || 0)) * (vd.speed || 1);
    const k = vd.loop === false ? Math.min(lt, len - 0.02) : lt % len;
    // played backwards: from the end of the trimmed part to its start
    if (vd.reverse) return Math.max(ts, end - 0.02 - k);
    return Math.min(end - 0.02, ts + k);
  };
  // every place a video is shown: image layers and the canvas background
  function videoUsers(doc) {
    const out = [];
    const bg = doc.background || {};
    if (isVideoAsset(bg.assetId)) out.push({ id: bg.assetId, vd: bg.video, start: 0, el: null });
    for (const el of doc.elements || []) if (el.type === 'image' && !el.hidden && isVideoAsset(el.assetId)) out.push({ id: el.assetId, vd: el.video, start: (el.time && el.time.start) || 0, el });
    // more <video>s of the same files (clones.js): { id, slot, vd, start, el, tgt(t, v) → the moment to show }
    for (const f of R.extraVideoUsers) out.push(...f(doc));
    return out;
  }
  R.extraVideoUsers = [];
  R.videoUsers = videoUsers;
  // a layer that's cut out at this moment needs no frame (clips after each other each have their own window)
  const userOn = (u, t) => !u.el || t == null || R.visibleAt(u.el, t);
  R.hasVideo = doc => videoUsers(doc).length > 0;
  R.playing = false;
  // editor preview: let the video run and only correct it when it drifts
  // R.holdLive > 0 while frames are being sought exactly (export): the editor redrawing in the meantime mustn't move them
  R.holdLive = 0;
  function liveSync(v, vd, t, start, tgt) {
    if (R.holdLive > 0) return;
    const target = tgt ? tgt(t, v) : R.videoTarget(vd, t, v, start);
    // a video can't play backwards: a reversed clip is stepped by seeking
    if (t == null || !R.playing || (vd && vd.reverse)) {
      if (!v.paused) v.pause();
      if (Math.abs(v.currentTime - target) > 0.04 && !v.seeking) v.currentTime = target;
      return;
    }
    // browsers play down to 1/16 speed; anything slower is kept in step by the drift check below
    v.playbackRate = Math.max(0.0625, Math.min(16, (vd && vd.speed) || 1));
    if (v.paused) { if (!v.seeking) v.currentTime = target; v.play().catch(() => {}); }
    else if (Math.abs(v.currentTime - target) > 0.3 && !v.seeking) v.currentTime = target;
  }
  R.liveSync = liveSync;
  R.liveSyncVideos = function (doc, t) {
    const seen = new Set();
    for (const u of videoUsers(doc)) {
      const e = assetVideo(u.id, u.slot), key = u.slot ? u.id + '#' + u.slot : u.id;
      if (!e || !e.ok) continue;
      if (userOn(u, t)) { seen.add(key); liveSync(e.v, u.vd, t, u.start, u.tgt); continue; }
      if (seen.has(key) || u.slot) continue;
      // off screen: stop it, and park a clip that's about to come in on its first frame
      if (!e.v.paused) e.v.pause();
      const s0 = u.el.time && u.el.time.start;
      if (t != null && s0 > t && s0 - t < 1.5 && !e.v.seeking) { const want = R.videoTarget(u.vd, s0, e.v, u.start); if (Math.abs(e.v.currentTime - want) > 0.04) e.v.currentTime = want; }
    }
  };
  R.pauseVideos = function () { for (const e of vidCache.values()) if (!e.v.paused) e.v.pause(); };
  /* ── smooth slow motion ──
     A slowed-down clip only has so many real frames; on export the frames in between are made from the two
     real frames either side — by following the motion between them (optical flow) or by cross-fading. */
  const seekTo = (v, time) => new Promise(res => {
    if (Math.abs(v.currentTime - time) < 0.0005 && !v.seeking) { res(); return; }
    let done = false;
    const fin = () => { if (done) return; done = true; v.removeEventListener('seeked', fin); res(); };
    v.addEventListener('seeked', fin); setTimeout(fin, 2000);
    v.currentTime = time;
  });
  // the clip's frame rate, measured once by watching a few frames go by (30 if the browser can't tell)
  async function clipFps(e) {
    if (e.fps) return e.fps;
    const v = e.v, was = v.currentTime, times = [];
    if ('requestVideoFrameCallback' in v) {
      await new Promise(res => {
        const cb = (now, md) => { times.push(md.mediaTime); if (times.length < 10) v.requestVideoFrameCallback(cb); else res(); };
        v.requestVideoFrameCallback(cb);
        v.playbackRate = 1; v.play().catch(res);
        setTimeout(res, 1500);
      });
      v.pause();
    }
    const gaps = [];
    for (let i = 1; i < times.length; i++) { const d = times[i] - times[i - 1]; if (d > 0.004) gaps.push(d); }
    gaps.sort((a, b) => a - b);
    // the usual gap is one frame (a busy machine skips some, never adds any), snapped to the rates cameras use
    const raw = gaps.length >= 3 ? 1 / gaps[gaps.length >> 1] : 0, RATES = [12, 15, 23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 90, 100, 119.88, 120];
    const near = raw ? RATES.reduce((a, b) => (Math.abs(b - raw) < Math.abs(a - raw) ? b : a)) : 0;
    e.fps = !raw ? 30 : Math.abs(near - raw) / raw < 0.04 ? near : clamp(Math.round(raw), 12, 120);
    await seekTo(v, was);
    return e.fps;
  }
  // measured on a <video> of its own: the one on screen is paused and sought by the editor while it plays
  R.clipFps = async id => {
    const e = assetVideo(id, 'fps');
    if (!e) return 30;
    if (!e.ok) await e.promise;
    return e.ok ? clipFps(e) : 30;
  };
  function grabFrame(v) {
    const s = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
    const c = canvas(Math.max(1, Math.round(v.videoWidth * s)), Math.max(1, Math.round(v.videoHeight * s)));
    c.getContext('2d', { willReadFrequently: true }).drawImage(v, 0, 0, c.width, c.height);
    return c;
  }
  function pixels(c) { return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height); }
  // optical flow by block matching, coarse to fine, on small grey copies of the two frames: where did each patch of A go in B?
  function estimateFlow(A, B) {
    const W0 = Math.min(320, A.width), H0 = Math.max(16, Math.round(A.height * W0 / A.width));
    const greyOf = (c, W, H) => {
      const t = canvas(W, H), x = t.getContext('2d', { willReadFrequently: true });
      x.drawImage(c, 0, 0, W, H);
      const d = x.getImageData(0, 0, W, H).data, g = new Float32Array(W * H);
      for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114;
      return g;
    };
    const half = (g, W, H) => {
      const w = W >> 1, h = H >> 1, o = new Float32Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * 2 * W + x * 2; o[y * w + x] = (g[i] + g[i + 1] + g[i + W] + g[i + W + 1]) / 4; }
      return o;
    };
    const bs = 8;
    // one level: best match for each block within the search radius around a guess from the coarser level
    const level = (ga, gb, W, H, prior, radius, smooth) => {
      const gw = Math.max(1, Math.floor(W / bs)), gh = Math.max(1, Math.floor(H / bs));
      const vx = new Float32Array(gw * gh), vy = new Float32Array(gw * gh), flat = new Uint8Array(gw * gh), flatY = new Uint8Array(gw * gh);
      for (let by = 0; by < gh; by++) for (let bx = 0; bx < gw; bx++) {
        let gx = 0, gy = 0;
        if (prior) { const px = Math.min(prior.gw - 1, bx >> 1), py = Math.min(prior.gh - 1, by >> 1); gx = Math.round(prior.vx[py * prior.gw + px] * 2); gy = Math.round(prior.vy[py * prior.gw + px] * 2); }
        const x0 = bx * bs, y0 = by * bs;
        let mean = 0, varc = 0;
        for (let y = 0; y < bs; y++) for (let x = 0; x < bs; x++) mean += ga[(y0 + y) * W + x0 + x];
        mean /= bs * bs;
        for (let y = 0; y < bs; y++) for (let x = 0; x < bs; x++) { const d = ga[(y0 + y) * W + x0 + x] - mean; varc += d * d; }
        let best = Infinity, bdx = gx, bdy = gy;
        const k = by * gw + bx;
        // flat patches (sky, walls, the inside of a plain shape) can't show their own motion: borrow it from neighbours below
        const sadAt = (dx, dy) => {
          if (x0 + dx < 0 || y0 + dy < 0 || x0 + dx + bs > W || y0 + dy + bs > H) return Infinity;
          let sad = 0;
          for (let y = 0; y < bs; y++) { const ra = (y0 + y) * W + x0, rb = (y0 + dy + y) * W + x0 + dx; for (let x = 0; x < bs; x++) sad += Math.abs(ga[ra + x] - gb[rb + x]); }
          return sad;
        };
        // plain patches (sky, walls, the inside of a plain shape) can't show motion: they borrow it from nearby edges below
        if (varc / (bs * bs) <= 12) { flat[k] = 1; flatY[k] = 1; vx[k] = gx; vy[k] = gy; continue; }
        // a detailed patch that looks the same in both frames is simply still
        if (sadAt(0, 0) < bs * bs * 2.5) { vx[k] = 0; vy[k] = 0; continue; }
        const tryAt = (cx, cy) => {
          for (let dy = cy - radius; dy <= cy + radius; dy++) for (let dx = cx - radius; dx <= cx + radius; dx++) {
            if (x0 + dx < 0 || y0 + dy < 0 || x0 + dx + bs > W || y0 + dy + bs > H) continue;
            let sad = (Math.abs(dx) + Math.abs(dy)) * 0.5;
            for (let y = 0; y < bs && sad < best; y++) {
              const ra = (y0 + y) * W + x0, rb = (y0 + dy + y) * W + x0 + dx;
              for (let x = 0; x < bs; x++) sad += Math.abs(ga[ra + x] - gb[rb + x]);
            }
            if (sad < best) { best = sad; bdx = dx; bdy = dy; }
          }
        };
        tryAt(gx, gy);
        if (gx || gy) tryAt(0, 0);
        vx[k] = bdx; vy[k] = bdy;
        // an edge sliding along itself looks the same wherever it is: that direction can't be measured here
        const tol = bs * bs * 2.5, b0 = sadAt(bdx, bdy);
        if (Math.min(sadAt(bdx - 2, bdy), sadAt(bdx + 2, bdy)) - b0 < tol) flat[k] = 1;
        if (Math.min(sadAt(bdx, bdy - 2), sadAt(bdx, bdy + 2)) - b0 < tol) flatY[k] = 1;
      }
      // fill what couldn't be measured from neighbours that could, spreading outwards a ring at a time (each direction on its own)
      const fill = (v, fl) => {
        // a few blocks deep only: far from any edge, a plain area's motion makes no visible difference
        for (let pass = 0; pass < 4; pass++) {
          let left = 0;
          const nv = v.slice(), nf = fl.slice();
          for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
            const k = y * gw + x;
            if (!fl[k]) continue;
            let sum = 0, n = 0;
            for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
              const xx = x + i, yy = y + j;
              if ((i || j) && xx >= 0 && yy >= 0 && xx < gw && yy < gh && !fl[yy * gw + xx]) { sum += v[yy * gw + xx]; n++; }
            }
            if (n) { nv[k] = sum / n; nf[k] = 0; } else left++;
          }
          v.set(nv); fl.set(nf);
          if (!left) break;
        }
      };
      fill(vx, flat); fill(vy, flatY);
      // a 3×3 median keeps the field coherent and throws out stray matches
      const med = (src) => { const o = new Float32Array(src.length), n = []; for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { n.length = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const xx = clamp(x + i, 0, gw - 1), yy = clamp(y + j, 0, gh - 1); n.push(src[yy * gw + xx]); } n.sort((a, b) => a - b); o[y * gw + x] = n[4]; } return o; };
      return smooth ? { gw, gh, vx: med(vx), vy: med(vy) } : { gw, gh, vx, vy };
    };
    const a0 = greyOf(A, W0, H0), b0 = greyOf(B, W0, H0);
    const W1 = W0 >> 1, H1 = H0 >> 1, a1 = half(a0, W0, H0), b1 = half(b0, W0, H0);
    const W2 = W1 >> 1, H2 = H1 >> 1, a2 = half(a1, W1, H1), b2 = half(b1, W1, H1);
    const f2 = level(a2, b2, W2, H2, null, 6, false), f1 = level(a1, b1, W1, H1, f2, 5, false), f0 = level(a0, b0, W0, H0, f1, 10, false);
    return Object.assign(f0, { bs, scale: A.width / W0 });
  }
  // the frame a fraction w of the way from A to B. With the motion both ways (A→B and B→A), the motion from the
  // in-between moment back to each frame is approximated (as in Super SloMo), each frame is pulled into place and
  // the two are mixed, leaning on whichever frame is nearer in time.
  function warpFrames(A, B, fab, fba, w) {
    const W = A.width, H = A.height, pa = pixels(A).data, pb = pixels(B).data;
    const out = canvas(W, H), ox = out.getContext('2d'), od = ox.createImageData(W, H), o = od.data;
    const field = (f, x, y) => {
      const cell = f.bs * f.scale, gxf = clamp(x / cell - 0.5, 0, f.gw - 1), gyf = clamp(y / cell - 0.5, 0, f.gh - 1);
      const gx0 = gxf | 0, gy0 = gyf | 0, gx1 = Math.min(f.gw - 1, gx0 + 1), gy1 = Math.min(f.gh - 1, gy0 + 1), tx = gxf - gx0, ty = gyf - gy0;
      const k00 = gy0 * f.gw + gx0, k10 = gy0 * f.gw + gx1, k01 = gy1 * f.gw + gx0, k11 = gy1 * f.gw + gx1;
      return [((f.vx[k00] * (1 - tx) + f.vx[k10] * tx) * (1 - ty) + (f.vx[k01] * (1 - tx) + f.vx[k11] * tx) * ty) * f.scale,
        ((f.vy[k00] * (1 - tx) + f.vy[k10] * tx) * (1 - ty) + (f.vy[k01] * (1 - tx) + f.vy[k11] * tx) * ty) * f.scale];
    };
    const sample = (p, X, Y, c) => {
      const x0 = X | 0, y0 = Y | 0, x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1), tx = X - x0, ty = Y - y0;
      const i00 = (y0 * W + x0) * 4 + c, i10 = (y0 * W + x1) * 4 + c, i01 = (y1 * W + x0) * 4 + c, i11 = (y1 * W + x1) * 4 + c;
      return (p[i00] * (1 - tx) + p[i10] * tx) * (1 - ty) + (p[i01] * (1 - tx) + p[i11] * tx) * ty;
    };
    // flow is smooth, so it's worked out on a coarse grid and filled in between
    const step = 4, cw = Math.ceil(W / step) + 1, ch = Math.ceil(H / step) + 1;
    const t0x = new Float32Array(cw * ch), t0y = new Float32Array(cw * ch), t1x = new Float32Array(cw * ch), t1y = new Float32Array(cw * ch);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const x = Math.min(W - 1, i * step), y = Math.min(H - 1, j * step), [ax, ay] = field(fab, x, y), [bx, by] = field(fba, x, y), k = j * cw + i;
      t0x[k] = -(1 - w) * w * ax + w * w * bx; t0y[k] = -(1 - w) * w * ay + w * w * by;
      t1x[k] = (1 - w) * (1 - w) * ax - w * (1 - w) * bx; t1y[k] = (1 - w) * (1 - w) * ay - w * (1 - w) * by;
    }
    for (let y = 0; y < H; y++) {
      const jf = y / step, j0 = jf | 0, j1 = Math.min(ch - 1, j0 + 1), ty = jf - j0;
      for (let x = 0; x < W; x++) {
        const if_ = x / step, i0 = if_ | 0, i1 = Math.min(cw - 1, i0 + 1), tx = if_ - i0;
        const k00 = j0 * cw + i0, k10 = j0 * cw + i1, k01 = j1 * cw + i0, k11 = j1 * cw + i1;
        const lerp = a => (a[k00] * (1 - tx) + a[k10] * tx) * (1 - ty) + (a[k01] * (1 - tx) + a[k11] * tx) * ty;
        const ax = clamp(x + lerp(t0x), 0, W - 1), ay = clamp(y + lerp(t0y), 0, H - 1);
        const bx = clamp(x + lerp(t1x), 0, W - 1), by = clamp(y + lerp(t1y), 0, H - 1);
        const i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) o[i + c] = sample(pa, ax, ay, c) * (1 - w) + sample(pb, bx, by, c) * w;
        o[i + 3] = 255;
      }
    }
    ox.putImageData(od, 0, 0);
    return out;
  }
  function blendFrames(A, B, w) {
    const out = canvas(A.width, A.height), x = out.getContext('2d');
    x.drawImage(A, 0, 0); x.globalAlpha = w; x.drawImage(B, 0, 0, A.width, A.height);
    return out;
  }
  const smoothMode = vd => (vd && (vd.speed || 1) < 0.999) ? (vd.smooth || 'flow') : 'off';
  const interp = new Map(), pairs = new Map();
  R.interpKey = (id, vd, start) => id + '|' + JSON.stringify(vd || {}) + '|' + (start || 0);
  // the made-up frame for this layer at this moment of the export, if there is one
  R.interpFrame = (id, vd, start, t) => { const e = interp.get(R.interpKey(id, vd, start)); return e && t != null && e.t === t ? e.canvas : null; };
  async function smoothFrame(u, e, t) {
    const v = e.v, key = R.interpKey(u.id, u.vd, u.start), mode = smoothMode(u.vd);
    const fd = 1 / await clipFps(e), target = R.videoTarget(u.vd, t, v, u.start);
    const f = target / fd, k = Math.floor(f), w = f - k;
    let p = pairs.get(key);
    if (!p || p.k !== k) {
      await seekTo(v, Math.min(v.duration - 0.001, (k + 0.5) * fd)); const A = grabFrame(v);
      await seekTo(v, Math.min(v.duration - 0.001, (k + 1.5) * fd)); const B = grabFrame(v);
      p = { k, A, B, flow: null }; pairs.set(key, p);
    }
    let out = p.A;
    if (mode === 'off') { /* the clip's own frame, held */ } else if (w > 0.02 && w < 0.98) {
      if (mode === 'blend') out = blendFrames(p.A, p.B, w);
      else { if (!p.flow) p.flow = [estimateFlow(p.A, p.B), estimateFlow(p.B, p.A)]; out = warpFrames(p.A, p.B, p.flow[0], p.flow[1], w); }
    } else if (w >= 0.98) out = p.B;
    out._interp = true; out._stamp = t.toFixed(4);
    interp.set(key, { t, canvas: out });
  }
  // export: seek every video to its exact frame before the frame is drawn
  R.syncVideos = async function (doc, t, force) {
    R.holdLive++;
    try { await syncAll(doc, t, force); } finally { R.holdLive--; }
  };
  async function syncAll(doc, t, force) {
    const jobs = [];
    for (const u of videoUsers(doc)) {
      if (!userOn(u, t)) continue;
      const e = assetVideo(u.id, u.slot);
      if (!e) continue;
      if (!e.ok) await e.promise;
      if (!e.ok) continue;
      const v = e.v;
      if (!v.paused) v.pause();
      // a seek still in flight (from the editor) would leave its old frame on screen
      if (v.seeking) await new Promise(res => { const fin = () => { v.removeEventListener('seeked', fin); res(); }; v.addEventListener('seeked', fin); setTimeout(fin, 1500); });
      // slowed down with smooth frames: build the in-between frame (one video, two seeks, so not in parallel)
      if (t != null && !u.slot && u.vd && (u.vd.speed || 1) < 0.999 && !u.vd.reverse) { await smoothFrame(u, e, t); continue; }
      const target = u.tgt ? u.tgt(t, v) : R.videoTarget(u.vd, t, v, u.start);
      if (!force && Math.abs(v.currentTime - target) < 0.0005) continue;
      jobs.push(new Promise(res => {
        let done = false;
        const fin = () => { if (done) return; done = true; v.removeEventListener('seeked', fin); res(); };
        v.addEventListener('seeked', fin);
        setTimeout(fin, 2000);
        v.currentTime = target;
      }));
    }
    await Promise.all(jobs);
    // anything else a frame needs before it's drawn (clones' still frames)
    for (const f of R.extraSync) await f(doc, t);
  }
  R.extraSync = [];

  let stickerMap = null;
  function stickerDef(id) {
    if (!stickerMap) {
      stickerMap = new Map();
      for (const s of (window.STICKERS || [])) stickerMap.set(s.id, s);
    }
    return stickerMap.get(id);
  }
  R.stickerDef = stickerDef;
  function stickerSvg(el) {
    const def = stickerDef(el.stickerId);
    if (!def) return null;
    const cols = (el.colors && el.colors.length === def.colors.length) ? el.colors : def.colors;
    return def.svg(cols);
  }
  function svgImage(svg) {
    const key = svg;
    const e = loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), svgCache, key);
    return e.ok ? e.img : null;
  }
  R.svgDataUrl = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  /* ───────────────────────── small utils ───────────────────────── */

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const mcanvas = document.createElement('canvas');
  const mctx = mcanvas.getContext('2d');
  function rgba(color, a = 1) {
    if (!color || color === 'transparent') return 'rgba(0,0,0,0)';
    mctx.fillStyle = '#000';
    mctx.fillStyle = color;
    const c = mctx.fillStyle;
    if (c[0] === '#') {
      const n = parseInt(c.slice(1), 16);
      return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return c;
    const p = m[1].split(',').map(parseFloat);
    return `rgba(${p[0]},${p[1]},${p[2]},${(p[3] ?? 1) * a})`;
  }
  R.rgba = rgba;
  function isClear(c) { return !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c); }
  function deviceScale(ctx) {
    const m = ctx.getTransform();
    return Math.hypot(m.a, m.b) || 1;
  }
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  class LRU {
    constructor(n) { this.n = n; this.m = new Map(); }
    get(k) { const v = this.m.get(k); if (v !== undefined) { this.m.delete(k); this.m.set(k, v); } return v; }
    set(k, v) { this.m.set(k, v); if (this.m.size > this.n) this.m.delete(this.m.keys().next().value); }
  }

  /* ───────────────────────── noise textures ───────────────────────── */

  let grainTex = null, paperTex = null;
  function grain() {
    if (grainTex) return grainTex;
    const c = canvas(256, 256), x = c.getContext('2d');
    const d = x.createImageData(256, 256), r = rng(7);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 128 + (r() - 0.5) * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    return (grainTex = c);
  }
  function paper() {
    if (paperTex) return paperTex;
    const S = 512, c = canvas(S, S), x = c.getContext('2d'), r = rng(11);
    x.fillStyle = '#fff'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
      const px = r() * S, py = r() * S, rad = 40 + r() * 140;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, `rgba(120,100,70,${0.025 + r() * 0.04})`);
      g.addColorStop(1, 'rgba(120,100,70,0)');
      x.fillStyle = g;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.save(); x.translate(ox, oy); x.fillRect(px - rad, py - rad, rad * 2, rad * 2); x.restore(); }
    }
    const d = x.getImageData(0, 0, S, S);
    for (let i = 0; i < d.data.length; i += 4) {
      const n = (r() - 0.5) * 26 + (r() < 0.004 ? -60 * r() : 0);
      d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n;
    }
    x.putImageData(d, 0, 0);
    // short fibres
    x.strokeStyle = 'rgba(90,80,60,0.08)'; x.lineWidth = 0.6;
    for (let i = 0; i < 220; i++) {
      const px = r() * S, py = r() * S, a = r() * TAU, l = 3 + r() * 9;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 1) * l / 2, py + Math.sin(a + 1) * l / 2, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
    return (paperTex = c);
  }
  // real paper (papers.js): one scan laid over the whole surface — no tiling seams — turned to suit its shape.
  // The procedural tile above is only the fallback while a scan decodes.
  const paperImgs = {};
  function paperLoad(id) {
    const P = window.StudioPapers;
    const p = P && (P.byId(id) || P.byId(P.DEFAULT));
    if (!p) return null;
    let e = paperImgs[p.id];
    if (!e) {
      const im = new Image();
      e = paperImgs[p.id] = { im, promise: new Promise(res => { im.onload = () => { requestRedraw(); res(); }; im.onerror = () => res(); }) };
      im.src = p.src;
    }
    return e;
  }
  function paperImage(id) { const e = paperLoad(id); return e && e.im.complete && e.im.naturalWidth ? e.im : null; }
  R.paperImage = paperImage;
  function drawPaper(ctx, im, amount, w, h, frame) {
    const iw = im.naturalWidth, ih = im.naturalHeight, turn = (w > h) !== (iw > ih) && Math.max(w / h, h / w) > 1.15;
    let s = Math.max(w / (turn ? ih : iw), h / (turn ? iw : ih));
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha *= clamp(amount / 100, 0, 1);
    ctx.translate(w / 2, h / 2);
    // texture boil: a fresh crop and flip of the same sheet every stepped frame
    if (frame != null) { const r = rng(frame * 2654435761 + 17); s *= 1.14; ctx.translate((r() - 0.5) * w * 0.12, (r() - 0.5) * h * 0.12); ctx.scale(r() < 0.5 ? -1 : 1, r() < 0.5 ? -1 : 1); }
    if (turn) ctx.rotate(Math.PI / 2);
    ctx.drawImage(im, -iw * s / 2, -ih * s / 2, iw * s, ih * s);
    ctx.restore();
  }
  function fillTexture(ctx, kind, amount, w, h, scale = 1, frame = null, paperId = null) {
    if (!amount) return;
    if (kind === 'paper') { const im = paperImage(paperId); if (im) { drawPaper(ctx, im, amount, w, h, frame); return; } }
    const tex = kind === 'paper' ? paper() : grain();
    const pat = ctx.createPattern(tex, 'repeat');
    // moving grain: a fresh offset into the noise tile every frame, so it dances like real film
    if (frame != null && pat.setTransform) { const r = rng(frame * 2654435761 + 17); pat.setTransform(new DOMMatrix().scale(scale).translate(Math.floor(r() * 256), Math.floor(r() * 256))); }
    else if (scale !== 1 && pat.setTransform) pat.setTransform(new DOMMatrix().scale(scale));
    ctx.save();
    ctx.globalCompositeOperation = kind === 'paper' ? 'multiply' : 'overlay';
    ctx.globalAlpha *= kind === 'paper' ? clamp(amount / 100, 0, 1) : clamp(amount / 100, 0, 1) * 0.55;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* ───────────────────────── paths ───────────────────────── */

  function rrect(p, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    if (!r) { p.rect(x, y, w, h); return p; }
    p.moveTo(x + r, y);
    p.arcTo(x + w, y, x + w, y + h, r);
    p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r);
    p.arcTo(x, y, x + w, y, r);
    p.closePath();
    return p;
  }
  function polyPath(pts, smooth = 0) {
    const p = new Path2D();
    if (!smooth) {
      pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y));
    } else {
      // closed Catmull-Rom → cubic Bézier
      const n = pts.length;
      p.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6 * smooth, p1[1] + (p2[1] - p0[1]) / 6 * smooth,
          p2[0] - (p3[0] - p1[0]) / 6 * smooth, p2[1] - (p3[1] - p1[1]) / 6 * smooth, p2[0], p2[1]);
      }
    }
    p.closePath();
    return p;
  }
  // radial shape fitted to the w×h box; fn(theta) returns radius in [0,1]
  function polar(w, h, fn, samples = 360) {
    const pts = [];
    for (let i = 0; i < samples; i++) {
      const t = i / samples * TAU;
      const r = fn(t);
      pts.push([w / 2 + Math.sin(t) * r * w / 2, h / 2 - Math.cos(t) * r * h / 2]);
    }
    return polyPath(pts);
  }
  function fitPoly(unit, w, h) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of unit) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return unit.map(([x, y]) => [(x - x0) / (x1 - x0) * w, (y - y0) / (y1 - y0) * h]);
  }
  function starUnit(n, inner) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = i / (n * 2) * TAU - Math.PI / 2, r = i % 2 ? inner : 1;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }
  function regular(n) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2; pts.push([Math.cos(a), Math.sin(a)]); }
    return pts;
  }
  function roundedPoly(pts, r) {
    // polygon with rounded corners (arcTo), r in px
    const p = new Path2D(), n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = mid(pts[n - 1], pts[0]);
    p.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      p.arcTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, r);
    }
    p.closePath();
    return p;
  }
  // a standing figure seen from the front: head, shoulders, arms and body
  function personPath(w, h) {
    const p = new Path2D(), cx = w / 2, hr = Math.min(w * 0.2, h * 0.09);
    p.arc(cx, hr * 1.05, hr, 0, TAU);
    const ny = hr * 2.05, sw = w * 0.5, top = ny + h * 0.02;
    p.moveTo(cx - w * 0.08, ny - hr * 0.1);
    p.lineTo(cx + w * 0.08, ny - hr * 0.1);
    p.lineTo(cx + w * 0.09, top);
    p.bezierCurveTo(cx + sw * 0.7, top + h * 0.01, cx + sw * 0.95, top + h * 0.05, cx + sw * 0.98, top + h * 0.16);
    p.lineTo(w * 0.97, h * 0.62); p.lineTo(w * 0.86, h * 0.63); p.lineTo(w * 0.8, h * 0.4); p.lineTo(w * 0.78, h);
    p.lineTo(w * 0.22, h); p.lineTo(w * 0.2, h * 0.4); p.lineTo(w * 0.14, h * 0.63); p.lineTo(w * 0.03, h * 0.62);
    p.lineTo(cx - sw * 0.98, top + h * 0.16);
    p.bezierCurveTo(cx - sw * 0.95, top + h * 0.05, cx - sw * 0.7, top + h * 0.01, cx - w * 0.09, top);
    p.closePath();
    return p;
  }
  function heartPath(w, h) {
    const p = new Path2D();
    p.moveTo(w / 2, h * 0.28);
    p.bezierCurveTo(w * 0.42, h * 0.02, 0, h * 0.02, 0, h * 0.34);
    p.bezierCurveTo(0, h * 0.6, w * 0.3, h * 0.78, w / 2, h);
    p.bezierCurveTo(w * 0.7, h * 0.78, w, h * 0.6, w, h * 0.34);
    p.bezierCurveTo(w, h * 0.02, w * 0.58, h * 0.02, w / 2, h * 0.28);
    p.closePath();
    return p;
  }
  function sparklePath(w, h, k = 0.12) {
    const p = new Path2D(), cx = w / 2, cy = h / 2;
    p.moveTo(cx, 0);
    p.quadraticCurveTo(cx + w * k, cy - h * k, w, cy);
    p.quadraticCurveTo(cx + w * k, cy + h * k, cx, h);
    p.quadraticCurveTo(cx - w * k, cy + h * k, 0, cy);
    p.quadraticCurveTo(cx - w * k, cy - h * k, cx, 0);
    p.closePath();
    return p;
  }
  function blobPath(w, h, seed) {
    const r = rng(seed), n = 7, pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + r() * 0.3, rad = 0.78 + r() * 0.22;
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    }
    return polyPath(fitPoly(pts, w, h), 1);
  }
  function stampPath(w, h, rh) {
    const p = new Path2D();
    const nx = Math.max(2, Math.round(w / (rh * 3.1))), ny = Math.max(2, Math.round(h / (rh * 3.1)));
    const sx = w / nx, sy = h / ny;
    p.moveTo(0, 0);
    for (let i = 0; i < nx; i++) { const c = sx * (i + 0.5); p.lineTo(c - rh, 0); p.arc(c, 0, rh, Math.PI, 0, true); }
    p.lineTo(w, 0);
    for (let i = 0; i < ny; i++) { const c = sy * (i + 0.5); p.lineTo(w, c - rh); p.arc(w, c, rh, -Math.PI / 2, Math.PI / 2, true); }
    p.lineTo(w, h);
    for (let i = 0; i < nx; i++) { const c = w - sx * (i + 0.5); p.lineTo(c + rh, h); p.arc(c, h, rh, 0, Math.PI, true); }
    p.lineTo(0, h);
    for (let i = 0; i < ny; i++) { const c = h - sy * (i + 0.5); p.lineTo(0, c + rh); p.arc(0, c, rh, Math.PI / 2, -Math.PI / 2, true); }
    p.closePath();
    return p;
  }
  // sides: any of 't', 'r', 'b', 'l' — the edges that are ripped; the rest stay straight
  function tornPath(w, h, seed, amp, sides = 'trbl') {
    const r = rng(seed), pts = [];
    const edge = (x0, y0, x1, y1, nx, ny, torn) => {
      if (!torn) { pts.push([x0, y0]); return; }
      const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(6, Math.round(len / (amp * 1.4)));
      for (let i = 0; i < steps; i++) {
        const t = i / steps, j = (r() * 0.85 + 0.15) * amp;
        pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]);
      }
    };
    edge(0, 0, w, 0, 0, 1, sides.includes('t')); edge(w, 0, w, h, -1, 0, sides.includes('r'));
    edge(w, h, 0, h, 0, -1, sides.includes('b')); edge(0, h, 0, 0, 1, 0, sides.includes('l'));
    return polyPath(pts);
  }
  // a page ripped out of a spiral notebook: ragged left edge with torn-through punch holes
  function notebookPath(w, h, seed) {
    const p = new Path2D();
    p.addPath(tornPath(w, h, seed, Math.max(3, w * 0.03), 'l'));
    const hole = Math.max(4, Math.min(w, h) * 0.028), gap = hole * 2.6, r = rng(seed + 9);
    for (let y = gap; y < h - hole * 2; y += gap) {
      const x = w * 0.035 + (r() - 0.5) * hole * 0.3;
      rrect(p, x, y, hole * 1.2, hole, hole * 0.2);
    }
    return p;
  }
  function ticketPath(w, h, r, notch) {
    const p = new Path2D(), n = notch;
    r = Math.min(r, h / 4, w / 4);
    p.moveTo(r, 0); p.lineTo(w - r, 0); p.arcTo(w, 0, w, r, r);
    p.lineTo(w, h / 2 - n); p.arc(w, h / 2, n, -Math.PI / 2, Math.PI / 2, true);
    p.lineTo(w, h - r); p.arcTo(w, h, w - r, h, r);
    p.lineTo(r, h); p.arcTo(0, h, 0, h - r, r);
    p.lineTo(0, h / 2 + n); p.arc(0, h / 2, n, Math.PI / 2, -Math.PI / 2, true);
    p.lineTo(0, r); p.arcTo(0, 0, r, 0, r);
    p.closePath();
    return p;
  }
  function speechPath(w, h, r, tailSide = 'left') {
    const bh = h * 0.8, p = new Path2D();
    r = Math.min(r, bh / 2, w / 2);
    const tx = tailSide === 'left' ? w * 0.18 : w * 0.82;
    p.moveTo(r, 0); p.arcTo(w, 0, w, bh, r); p.arcTo(w, bh, 0, bh, r);
    if (tailSide === 'left') { p.lineTo(tx + w * 0.12, bh); p.lineTo(tx - w * 0.04, h); p.lineTo(tx, bh); }
    else { p.lineTo(tx, bh); p.lineTo(tx + w * 0.04, h); p.lineTo(tx - w * 0.12, bh); }
    p.arcTo(0, bh, 0, 0, r); p.arcTo(0, 0, w, 0, r);
    p.closePath();
    return p;
  }
  function cloudPath(w, h) {
    const p = new Path2D();
    p.moveTo(w * 0.22, h);
    p.bezierCurveTo(w * 0.02, h, -w * 0.02, h * 0.6, w * 0.16, h * 0.52);
    p.bezierCurveTo(w * 0.12, h * 0.2, w * 0.42, h * 0.08, w * 0.5, h * 0.3);
    p.bezierCurveTo(w * 0.58, -h * 0.08, w * 0.92, h * 0.04, w * 0.84, h * 0.42);
    p.bezierCurveTo(w * 1.04, h * 0.44, w * 1.04, h, w * 0.8, h);
    p.closePath();
    return p;
  }
  function archPath(w, h) {
    const p = new Path2D(), r = w / 2, ry = Math.min(r, h);
    p.moveTo(0, h); p.lineTo(0, ry);
    p.ellipse(w / 2, ry, r, ry, 0, Math.PI, 0);
    p.lineTo(w, h); p.closePath();
    return p;
  }

  const SHAPES = {
    rect: { label: 'Rectangle', path: (w, h, o) => rrect(new Path2D(), 0, 0, w, h, o.radius || 0) },
    rounded: { label: 'Rounded', path: (w, h, o) => rrect(new Path2D(), 0, 0, w, h, o.radius ?? Math.min(w, h) * 0.18) },
    pill: { label: 'Pill', path: (w, h) => rrect(new Path2D(), 0, 0, w, h, Math.min(w, h) / 2) },
    ellipse: { label: 'Circle', path: (w, h) => { const p = new Path2D(); p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, TAU); return p; } },
    arch: { label: 'Arch', path: archPath },
    halfcircle: { label: 'Half circle', path: (w, h) => { const p = new Path2D(); p.moveTo(0, h); p.ellipse(w / 2, h, w / 2, h, 0, Math.PI, 0); p.closePath(); return p; } },
    triangle: { label: 'Triangle', path: (w, h, o) => o.radius ? roundedPoly([[w / 2, 0], [w, h], [0, h]], o.radius) : polyPath([[w / 2, 0], [w, h], [0, h]]) },
    diamond: { label: 'Diamond', path: (w, h) => polyPath([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]) },
    pentagon: { label: 'Pentagon', path: (w, h, o) => roundedPoly(fitPoly(regular(5), w, h), o.radius || 0.01) },
    hexagon: { label: 'Hexagon', path: (w, h, o) => roundedPoly(fitPoly(regular(6), w, h), o.radius || 0.01) },
    star: { label: 'Star', path: (w, h, o) => roundedPoly(fitPoly(starUnit(o.points || 5, o.inner || 0.48), w, h), o.radius || 0.01) },
    burst: { label: 'Burst', path: (w, h, o) => polyPath(fitPoly(starUnit(o.points || 18, o.inner || 0.78), w, h)) },
    scallop: { label: 'Scallop', path: (w, h, o) => { const n = o.points || 16, d = o.depth ?? 0.08; return polar(w, h, t => 1 - d + d * Math.sqrt(Math.abs(Math.sin(n * t / 2)))); } },
    flower: { label: 'Flower', path: (w, h, o) => { const n = o.points || 8, d = o.depth ?? 0.28; return polar(w, h, t => 1 - d + d * Math.sqrt(Math.abs(Math.sin(n * t / 2)))); } },
    squircle: { label: 'Squircle', path: (w, h) => polar(w, h, t => Math.pow(Math.pow(Math.abs(Math.cos(t)), 4) + Math.pow(Math.abs(Math.sin(t)), 4), -1 / 4) / Math.SQRT2 * 1.0, 240) },
    sparkle: { label: 'Sparkle', path: (w, h) => sparklePath(w, h) },
    heart: { label: 'Heart', path: heartPath },
    blob: { label: 'Blob', path: (w, h, o) => blobPath(w, h, o.seed || 3) },
    cloud: { label: 'Cloud', path: cloudPath },
    ticket: { label: 'Ticket', path: (w, h, o) => ticketPath(w, h, o.radius ?? 12, Math.min(w, h) * 0.12) },
    speech: { label: 'Speech', path: (w, h, o) => speechPath(w, h, o.radius ?? Math.min(w, h) * 0.2) },
    stamp: { label: 'Stamp edge', path: (w, h) => stampPath(w, h, Math.max(4, Math.min(w, h) * 0.035)) },
    torn: { label: 'Torn paper', path: (w, h, o) => tornPath(w, h, o.seed || 5, Math.max(3, Math.min(w, h) * 0.025), o.tornSides || 'trbl') },
    notebook: { label: 'Notebook page', path: (w, h, o) => notebookPath(w, h, o.seed || 7), evenodd: true },
    cross: { label: 'Plus', path: (w, h) => { const t = 0.32; return polyPath([[w * (0.5 - t / 2), 0], [w * (0.5 + t / 2), 0], [w * (0.5 + t / 2), h * (0.5 - t / 2)], [w, h * (0.5 - t / 2)], [w, h * (0.5 + t / 2)], [w * (0.5 + t / 2), h * (0.5 + t / 2)], [w * (0.5 + t / 2), h], [w * (0.5 - t / 2), h], [w * (0.5 - t / 2), h * (0.5 + t / 2)], [0, h * (0.5 + t / 2)], [0, h * (0.5 - t / 2)], [w * (0.5 - t / 2), h * (0.5 - t / 2)]]); } },
    arrow: { label: 'Arrow', path: (w, h) => polyPath([[0, h * 0.32], [w * 0.62, h * 0.32], [w * 0.62, 0], [w, h / 2], [w * 0.62, h], [w * 0.62, h * 0.68], [0, h * 0.68]]) },
    parallelogram: { label: 'Slant', path: (w, h) => polyPath([[w * 0.18, 0], [w, 0], [w * 0.82, h], [0, h]]) },
    person: { label: 'Person', path: (w, h) => personPath(w, h) },
    line: { label: 'Line', path: null },
  };
  R.SHAPES = SHAPES;
  function shapePath(kind, w, h, o = {}) {
    const s = SHAPES[kind] || SHAPES.rect;
    return s.path ? s.path(w, h, o) : rrect(new Path2D(), 0, 0, w, h, 0);
  }
  R.shapePath = shapePath;

  /* ───────────────────────── patterns ───────────────────────── */

  const PATTERNS = {
    none: 'None', grid: 'Grid paper', graph: 'Graph paper', dots: 'Dot grid', lined: 'Notebook lines',
    check: 'Checkerboard', gingham: 'Gingham', stripes: 'Stripes', diagonal: 'Diagonal', polka: 'Polka dots',
    waves: 'Waves', plus: 'Plus grid', halftone: 'Halftone', scribble: 'Pen scribbles',
  };
  R.PATTERNS = PATTERNS;
  function drawPattern(ctx, w, h, p) {
    if (!p || !p.type || p.type === 'none') return;
    const s = Math.max(4, p.size || 40), col = p.color || 'rgba(0,0,0,.15)', lw = p.thick || 1.5;
    ctx.save();
    ctx.globalAlpha *= p.opacity ?? 1;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw;
    const path = new Path2D();
    switch (p.type) {
      case 'grid':
        for (let x = s; x < w; x += s) { path.moveTo(x, 0); path.lineTo(x, h); }
        for (let y = s; y < h; y += s) { path.moveTo(0, y); path.lineTo(w, y); }
        ctx.stroke(path); break;
      case 'graph': {
        const fine = new Path2D(), f = s / 5;
        for (let x = f; x < w; x += f) { fine.moveTo(x, 0); fine.lineTo(x, h); }
        for (let y = f; y < h; y += f) { fine.moveTo(0, y); fine.lineTo(w, y); }
        ctx.save(); ctx.globalAlpha *= 0.45; ctx.lineWidth = lw * 0.6; ctx.stroke(fine); ctx.restore();
        for (let x = s; x < w; x += s) { path.moveTo(x, 0); path.lineTo(x, h); }
        for (let y = s; y < h; y += s) { path.moveTo(0, y); path.lineTo(w, y); }
        ctx.stroke(path); break;
      }
      case 'dots':
        for (let x = s; x < w; x += s) for (let y = s; y < h; y += s) { path.moveTo(x + lw * 1.3, y); path.arc(x, y, lw * 1.3, 0, TAU); }
        ctx.fill(path); break;
      case 'lined': {
        for (let y = s * 2; y < h; y += s) { path.moveTo(0, y); path.lineTo(w, y); }
        ctx.stroke(path);
        ctx.strokeStyle = p.color2 || 'rgba(222,96,96,.55)';
        ctx.beginPath(); ctx.moveTo(s * 2.2, 0); ctx.lineTo(s * 2.2, h); ctx.stroke();
        break;
      }
      case 'check':
        for (let x = 0, i = 0; x < w; x += s, i++) for (let y = 0, j = 0; y < h; y += s, j++) if ((i + j) % 2) path.rect(x, y, s, s);
        ctx.fill(path); break;
      case 'scribble': {
        // dense handwriting-like scribbles, like a page filled with a ballpoint pen
        const r = rng(p.seed || 11);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let y = s * 0.4; y < h + s; y += s * 0.42) {
          let x = -s;
          path.moveTo(x, y + (r() - 0.5) * s * 0.3);
          while (x < w + s) {
            const step = s * (0.08 + r() * 0.12), amp = s * (0.12 + r() * 0.3);
            x += step;
            const ny = y + (r() - 0.5) * s * 0.35;
            if (r() < 0.35) path.bezierCurveTo(x + step * 0.8, ny - amp, x - step * 1.2, ny - amp * 1.4, x, ny);
            else path.quadraticCurveTo(x - step * 0.5, ny + (r() < 0.5 ? -amp : amp), x, ny);
            if (r() < 0.04) { x += s * 0.25; path.moveTo(x, y); }
          }
        }
        ctx.stroke(path); break;
      }
      case 'gingham': {
        ctx.globalAlpha *= 0.5;
        const a = new Path2D(), b = new Path2D();
        for (let x = 0; x < w; x += s * 2) a.rect(x, 0, s, h);
        for (let y = 0; y < h; y += s * 2) b.rect(0, y, w, s);
        ctx.fill(a); ctx.fill(b); break;
      }
      case 'stripes':
        for (let x = 0; x < w; x += s) path.rect(x, 0, s / 2, h);
        ctx.fill(path); break;
      case 'diagonal':
        ctx.lineWidth = s / 4;
        for (let x = -h; x < w + h; x += s) { path.moveTo(x, 0); path.lineTo(x + h, h); }
        ctx.stroke(path); break;
      case 'polka':
        for (let y = 0, j = 0; y < h + s; y += s / 2, j++) for (let x = (j % 2) * s / 2; x < w + s; x += s) { path.moveTo(x + s * 0.13, y); path.arc(x, y, s * 0.13, 0, TAU); }
        ctx.fill(path); break;
      case 'waves':
        for (let y = s / 2; y < h + s; y += s / 2) {
          path.moveTo(0, y);
          for (let x = 0; x <= w; x += 4) path.lineTo(x, y + Math.sin(x / s * TAU) * s * 0.12);
        }
        ctx.stroke(path); break;
      case 'plus':
        for (let x = s / 2; x < w; x += s) for (let y = s / 2; y < h; y += s) { const k = s * 0.12; path.moveTo(x - k, y); path.lineTo(x + k, y); path.moveTo(x, y - k); path.lineTo(x, y + k); }
        ctx.lineCap = 'round'; ctx.stroke(path); break;
      case 'halftone':
        for (let y = 0, j = 0; y < h + s; y += s / 2, j++) {
          const r = s * 0.22 * (1 - y / h * 0.85);
          for (let x = (j % 2) * s / 2; x < w + s; x += s) { path.moveTo(x + r, y); path.arc(x, y, Math.max(0.5, r), 0, TAU); }
        }
        ctx.fill(path); break;
    }
    ctx.restore();
  }
  R.drawPattern = drawPattern;

  /* ───────────────────────── fills ───────────────────────── */

  function makeFill(ctx, f, w, h) {
    // f: {color, color2, gradient:'none'|'linear'|'radial', angle}
    if (!f.gradient || f.gradient === 'none' || !f.color2) return f.color;
    if (f.gradient === 'radial') {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
      g.addColorStop(0, f.color); g.addColorStop(1, f.color2);
      return g;
    }
    const a = ((f.angle ?? 180) - 90) * Math.PI / 180;
    const L = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
    const cx = w / 2, cy = h / 2, dx = Math.cos(a) * L / 2, dy = Math.sin(a) * L / 2;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, f.color); g.addColorStop(1, f.color2);
    return g;
  }

  /* ───────────────────────── text layout ───────────────────────── */

  const GENERIC = { Serif: 'serif', Sans: 'sans-serif', Display: 'sans-serif', Script: 'cursive', Handwritten: 'cursive', Mono: 'monospace' };
  function fontFor(family, weight, italic, size) {
    const meta = Fonts.BY_NAME[family];
    const wgt = meta ? Fonts.nearestWeight(family, weight || 400) : (weight || 400);
    const gen = meta ? (GENERIC[meta.cat] || 'sans-serif') : 'sans-serif';
    if (meta && !Fonts.isLoaded(family, wgt, !!italic)) {
      Fonts.ensure(family, wgt, !!italic).then(() => { R.fontsVersion++; requestRedraw(); });
    }
    return `${italic ? 'italic ' : ''}${wgt} ${size}px "${family}", ${gen}`;
  }
  R.fontFor = fontFor;

  const metricCache = new Map();
  function metrics(fontAt100) {
    const k = fontAt100 + '|' + R.fontsVersion;
    let m = metricCache.get(k);
    if (m) return m;
    mctx.font = fontAt100;
    const H = mctx.measureText('H'), g = mctx.measureText('g');
    m = { cap: (H.actualBoundingBoxAscent || 70) / 100, desc: (g.actualBoundingBoxDescent || 20) / 100 };
    metricCache.set(k, m);
    return m;
  }

  function measurer(ctx, font, ls) {
    ctx.font = font;
    const cache = new Map();
    const raw = s => { let v = cache.get(s); if (v === undefined) { v = ctx.measureText(s).width; cache.set(s, v); } return v; };
    const fn = s => { const n = [...s].length; return raw(s) + ls * Math.max(0, n - 1); };
    fn.raw = raw;
    return fn;
  }

  // draws one line at x (left), baseline y. letter-spacing done per glyph, but
  // positions come from prefix widths so pair-kerning survives.
  function drawLine(ctx, str, x, y, ls, mode) {
    const op = mode === 'stroke' ? 'strokeText' : 'fillText';
    if (!ls) { ctx[op](str, x, y); return; }
    const chars = [...str];
    let prefix = '';
    for (let i = 0; i < chars.length; i++) {
      const px = ctx.measureText(prefix).width + ls * i;
      ctx[op](chars[i], x + px, y);
      prefix += chars[i];
    }
  }

  const LINE_BG = new Set(['lines', 'select', 'marker', 'underline', 'rough']);
  R.TEXT_BG = {
    none: 'None', box: 'Box', pill: 'Pill', lines: 'Line highlight', select: 'Selection', marker: 'Marker',
    sticker: 'Sticker outline', tape: 'Tape', oval: 'Oval', scallop: 'Scallop', burst: 'Burst',
    speech: 'Speech bubble', ticket: 'Ticket', underline: 'Underline', scribble: 'Scribble circle', torn: 'Torn paper', rough: 'Marker blocks', folded: 'Folded label', glossy: 'Game button',
  };

  const layoutCache = new LRU(400);
  function textKey(el) {
    const b = el.bg || {};
    return [el.text, el.fontFamily, el.fontWeight, el.italic, el.fontSize, el.lineHeight, el.letterSpacing, el.uppercase,
      el.align, el.autoWidth ? 'A' : el.width, el.curve || 0, b.style, b.padX, b.padY, b.gap, el.stroke && el.stroke.width, R.fontsVersion].join('\u0001');
  }
  function layoutText(el) {
    // pinned typing: lay out the finished text, then show only the typed characters, so letters never shift
    if (el._full != null && el.typing && el.typing.pin) return pinnedLayout(el);
    const key = textKey(el);
    const hit = layoutCache.get(key);
    if (hit) return hit;
    const size = el.fontSize || 48;
    const font = fontFor(el.fontFamily, el.fontWeight, el.italic, size);
    const font100 = fontFor(el.fontFamily, el.fontWeight, el.italic, 100);
    const m = metrics(font100);
    const ls = (el.letterSpacing || 0) * size;
    const measure = measurer(mctx, font, ls);
    const bg = el.bg || { style: 'none' };
    const style = bg.style || 'none';
    const lineBg = LINE_BG.has(style);
    let padX = bg.padX || 0, padY = bg.padY || 0;
    if (style === 'none') { padX = 0; padY = 0; }
    if (style === 'sticker') padY = padX;
    const gap = lineBg ? (bg.gap ?? 0) : 0;
    const lh = size * (el.lineHeight || 1.2);
    let txt = el.text ?? '';
    if (el.uppercase) txt = txt.toUpperCase();
    const cap = m.cap * size;
    const desc = (el.uppercase ? 0 : m.desc * 0.5) * size;

    // curved: single run along an arc
    if (el.curve && Math.abs(el.curve) >= 1) {
      const str = txt.replace(/\s*\n\s*/g, ' ');
      const chars = [...str];
      const pos = [];
      let prefix = '';
      for (let i = 0; i < chars.length; i++) { pos.push(measure.raw(prefix) + ls * i); prefix += chars[i]; }
      const total = measure(str) || 1;
      const theta = Math.min(Math.abs(el.curve) / 100 * TAU, TAU);
      const r = total / theta;
      const sign = el.curve > 0 ? 1 : -1;
      const asc = size * 0.85, dsc = size * 0.25;
      const glyphs = chars.map((ch, i) => {
        const cw = (i < chars.length - 1 ? pos[i + 1] - ls : total) - pos[i];
        return { ch, cw, phi: (pos[i] + cw / 2 - total / 2) / r };
      });
      const r0 = sign > 0 ? r - dsc : r - asc, r1 = sign > 0 ? r + asc : r + dsc;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const span = theta / 2 + (size * 0.6) / r;
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const phi = -span + 2 * span * i / steps;
        for (const rad of [r0, r1]) {
          const x = rad * Math.sin(phi), y = sign > 0 ? -rad * Math.cos(phi) : rad * Math.cos(phi);
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
      const p = style === 'sticker' ? padX : 0;
      const sw = (el.stroke && el.stroke.width) || 0;
      const pp = p + sw;
      const L = {
        curved: true, font, size, ls, lh, glyphs, r, sign,
        cx: pp - x0, cy: pp - y0,
        boxW: Math.max(10, x1 - x0 + pp * 2), boxH: Math.max(10, y1 - y0 + pp * 2),
        padX: pp, padY: pp, lines: [], cap, desc, style,
      };
      layoutCache.set(key, L);
      return L;
    }

    const maxW = el.autoWidth ? Infinity : Math.max(1, (el.width || 300) - padX * 2);
    const lines = [];
    for (const par of txt.split('\n')) {
      if (maxW === Infinity || measure(par) <= maxW) { lines.push(par); continue; }
      const toks = par.split(/(\s+)/);
      let line = '';
      for (const tok of toks) {
        if (!tok) continue;
        const test = line + tok;
        if (!line.trim() || measure(test.trimEnd()) <= maxW) { line = test; continue; }
        lines.push(line.trimEnd());
        line = /^\s+$/.test(tok) ? '' : tok;
        // a single word longer than the box: hard-break it
        while (measure(line) > maxW && [...line].length > 1) {
          const cs = [...line];
          let k = cs.length - 1;
          while (k > 1 && measure(cs.slice(0, k).join('')) > maxW) k--;
          lines.push(cs.slice(0, k).join(''));
          line = cs.slice(k).join('');
        }
      }
      lines.push(line.trimEnd());
    }
    const widths = lines.map(l => measure(l));
    const contentW = maxW === Infinity ? Math.max(1, ...widths) : maxW;
    const boxW = contentW + padX * 2;
    const slot = lineBg ? lh + padY * 2 + gap : lh;
    const boxH = lineBg ? lines.length * slot - gap : lines.length * lh + padY * 2;
    const out = lines.map((t, i) => {
      const w = widths[i];
      const x = el.align === 'right' ? padX + contentW - w : el.align === 'center' ? padX + (contentW - w) / 2 : padX;
      const top = lineBg ? i * slot + padY : padY + i * lh;
      return { text: t, w, x, top, base: top + lh / 2 + (cap - desc) / 2 };
    });
    const L = { curved: false, font, size, ls, lh, lines: out, boxW, boxH: Math.max(boxH, 1), padX, padY, cap, desc, style, slot, lineBg };
    layoutCache.set(key, L);
    return L;
  }
  R.layoutText = layoutText;
  function pinnedLayout(el) {
    const LF = layoutText(Object.assign({}, el, { text: el._full, _full: null }));
    const up = t => el.uppercase ? t.toUpperCase() : t;
    const full = up(el._full), n = [...up(el.text || '')].length, meas = measurer(mctx, LF.font, LF.ls);
    const lines = [];
    let at = 0;
    for (const ln of LF.lines) {
      const idx = full.indexOf(ln.text, at), st = idx < 0 ? at : idx;
      const chars = [...ln.text], startN = [...full.slice(0, st)].length, k = clamp(n - startN, 0, chars.length);
      if (k <= 0 && lines.length) break;
      const t = chars.slice(0, k).join('');
      lines.push(Object.assign({}, ln, { text: t, w: meas(t) }));
      at = st + ln.text.length;
      if (k < chars.length) break;
    }
    return Object.assign({}, LF, { lines });
  }

  function textBackground(ctx, el, L) {
    const bg = el.bg || {};
    const style = bg.style;
    if (!style || style === 'none' || style === 'sticker') return;
    const col = bg.color || '#f4d35e';
    const w = L.boxW, h = L.boxH, rad = bg.radius ?? 0;
    const border = bg.borderWidth > 0 ? { w: bg.borderWidth, c: bg.borderColor || '#111' } : null;
    const paint = (path, fill = true) => {
      if (fill) { ctx.fillStyle = col; ctx.fill(path); }
      if (border && !bg.stitch) { ctx.lineWidth = border.w; ctx.strokeStyle = border.c; ctx.lineJoin = 'round'; ctx.stroke(path); }
    };
    // dashed "stitched" line sewn just inside a label's edge
    const stitch = (x, y, ww, hh, r) => {
      if (!bg.stitch) return;
      const ins = Math.max(3, L.size * 0.09), lw = bg.borderWidth > 0 ? bg.borderWidth : Math.max(1.5, L.size * 0.035);
      ctx.save();
      ctx.setLineDash([lw * 3.2, lw * 2.4]); ctx.lineWidth = lw; ctx.strokeStyle = bg.borderColor || '#ffffff'; ctx.lineCap = 'round';
      ctx.stroke(rrect(new Path2D(), x + ins, y + ins, ww - ins * 2, hh - ins * 2, Math.max(0, r - ins)));
      ctx.restore();
    };
    const seed = hashStr(el.id || 'x');
    switch (style) {
      case 'box': paint(rrect(new Path2D(), 0, 0, w, h, rad)); stitch(0, 0, w, h, rad); break;
      case 'pill': paint(rrect(new Path2D(), 0, 0, w, h, h / 2)); stitch(0, 0, w, h, h / 2); break;
      case 'glossy': {
        // game-menu button: soft vertical gradient, top sheen and a darker lower lip
        const p = rrect(new Path2D(), 0, 0, w, h, Math.min(h / 2, rad || h / 2));
        const base = rgba(col);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, rgba('#ffffff', 1)); g.addColorStop(0.55, base); g.addColorStop(1, base);
        ctx.fillStyle = g; ctx.fill(p);
        ctx.save(); ctx.clip(p);
        const lip = ctx.createLinearGradient(0, h * 0.6, 0, h);
        lip.addColorStop(0, 'rgba(0,0,0,0)'); lip.addColorStop(1, 'rgba(60,50,40,0.16)');
        ctx.fillStyle = lip; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill(rrect(new Path2D(), h * 0.3, h * 0.08, w - h * 0.6, h * 0.22, h * 0.11));
        ctx.restore();
        ctx.lineWidth = Math.max(1, h * 0.025); ctx.strokeStyle = border ? border.c : 'rgba(80,70,60,0.18)'; ctx.stroke(p);
        break;
      }
      case 'oval': { const p = new Path2D(); p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, TAU); paint(p); break; }
      case 'scallop': paint(shapePath('scallop', w, h, { points: Math.round(clamp((w + h) / 18, 12, 28)), depth: 0.07 })); break;
      case 'burst': paint(shapePath('burst', w, h, { points: 20, inner: 0.84 })); break;
      case 'speech': paint(speechPath(w, h, rad || h * 0.2)); break;
      case 'ticket': paint(ticketPath(w, h, rad, Math.min(h * 0.16, 18))); break;
      case 'torn': paint(tornPath(w, h, seed, Math.max(2, Math.min(w, h) * 0.04))); break;
      case 'folded': {
        // paper label with its top-right corner folded over
        const f = Math.min(h * 0.75, w * 0.3);
        const body = polyPath([[0, 0], [w - f, 0], [w, f], [w, h], [0, h]]);
        paint(body);
        if (!isClear(col)) {
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = f * 0.25 * deviceScale(ctx); ctx.shadowOffsetX = -f * 0.08 * deviceScale(ctx); ctx.shadowOffsetY = f * 0.1 * deviceScale(ctx);
          ctx.fillStyle = col; ctx.fill(polyPath([[w - f, 0], [w - f, f], [w, f]]));
          ctx.restore();
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill(polyPath([[w - f, 0], [w - f, f], [w, f]]));
        }
        break;
      }
      case 'tape': {
        const r = rng(seed), p = new Path2D(), z = Math.max(3, h * 0.07), n = Math.max(4, Math.round(h / (z * 1.6)));
        p.moveTo(0, 0); p.lineTo(w, 0);
        for (let i = 1; i <= n; i++) p.lineTo(w - (i % 2 ? z * (0.6 + r() * 0.6) : 0), h * i / n);
        p.lineTo(0, h);
        for (let i = n - 1; i >= 0; i--) p.lineTo(i % 2 ? z * (0.6 + r() * 0.6) : 0, h * i / n);
        p.closePath();
        ctx.save(); ctx.globalAlpha *= 0.92; paint(p); ctx.restore();
        ctx.save(); ctx.clip(p); ctx.globalAlpha *= 0.12; ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h * 0.35); ctx.restore();
        break;
      }
      case 'scribble': {
        const r = rng(seed), p = new Path2D();
        const lw = bg.borderWidth || Math.max(2, L.size * 0.06);
        for (let k = 0; k < 2; k++) {
          const ox = (r() - 0.5) * w * 0.04, oy = (r() - 0.5) * h * 0.08;
          for (let i = 0; i <= 64; i++) {
            const t = i / 64 * TAU * 1.08 - 0.6, x = w / 2 + ox + Math.cos(t) * (w / 2 - lw), y = h / 2 + oy + Math.sin(t) * (h / 2 - lw);
            i ? p.lineTo(x, y) : p.moveTo(x, y);
          }
        }
        ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.stroke(p);
        break;
      }
      default: if (L.lineBg) {
        for (const ln of L.lines) {
          if (!ln.text.trim()) continue;
          const x = ln.x - L.padX, y = ln.top - L.padY, lw = ln.w + L.padX * 2, lh = L.lh + L.padY * 2;
          if (style === 'lines') { paint(rrect(new Path2D(), x, y, lw, lh, rad)); stitch(x, y, lw, lh, rad); }
          else if (style === 'rough') {
            // hand-cut marker block: wobbly edges and slightly skewed corners
            const r = rng(seed + (ln.top | 0)), j = Math.max(2, L.size * 0.06), pts = [];
            const edge = (x0, y0, x1, y1) => { const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / (L.size * 0.5))); for (let i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / n + (r() - 0.5) * j, y0 + (y1 - y0) * i / n + (r() - 0.5) * j]); };
            edge(x, y, x + lw, y); edge(x + lw, y, x + lw, y + lh); edge(x + lw, y + lh, x, y + lh); edge(x, y + lh, x, y);
            paint(polyPath(pts));
          }
          else if (style === 'select') {
            ctx.fillStyle = col; ctx.fillRect(x, y, lw, lh);
            const ac = bg.borderColor || '#6c5ce7', bw = bg.borderWidth || Math.max(1.5, L.size * 0.025);
            ctx.lineWidth = bw; ctx.strokeStyle = ac; ctx.strokeRect(x, y, lw, lh);
            const dr = Math.max(3, L.size * 0.07);
            ctx.fillStyle = ac;
            ctx.beginPath(); ctx.arc(x, y, dr, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(x + lw, y + lh, dr, 0, TAU); ctx.fill();
          } else if (style === 'marker') {
            const r = rng(seed + ln.top | 0), p = new Path2D();
            const y0 = ln.top + L.lh * 0.42, y1 = ln.top + L.lh * 0.98, sk = L.size * 0.08;
            p.moveTo(x + sk, y0 + (r() - 0.5) * sk);
            p.lineTo(x + lw, y0 - sk * 0.3);
            p.quadraticCurveTo(x + lw + sk * 0.8, (y0 + y1) / 2, x + lw - sk * 0.4, y1);
            p.lineTo(x, y1 + (r() - 0.5) * sk);
            p.quadraticCurveTo(x - sk * 0.6, (y0 + y1) / 2, x + sk, y0);
            ctx.save(); ctx.globalAlpha *= 0.85; ctx.fillStyle = col; ctx.fill(p); ctx.restore();
          } else if (style === 'underline') {
            const r = rng(seed + ln.top | 0), p = new Path2D(), uy = ln.base + L.size * 0.14;
            p.moveTo(x, uy + (r() - 0.5) * 4);
            p.bezierCurveTo(x + lw * 0.3, uy - L.size * 0.06, x + lw * 0.7, uy + L.size * 0.08, x + lw, uy - L.size * 0.02);
            ctx.lineWidth = bg.borderWidth || Math.max(2, L.size * 0.07); ctx.lineCap = 'round';
            ctx.strokeStyle = col; ctx.stroke(p);
          }
        }
      }
    }
  }

  // char ranges of the highlighted words, mapped onto the laid-out lines
  function typingBoxes(el, L) {
    const tp = el.typing || {};
    const up = s => el.uppercase ? s.toUpperCase() : s;
    const shown = up(el.text || '');
    const full = up(el._full != null ? el._full : (el.text || ''));
    const meas = measurer(mctx, L.font, 0);
    const starts = [];
    let i = 0;
    for (const ln of L.lines) { const idx = ln.text ? shown.indexOf(ln.text, i) : i; const at = idx < 0 ? i : idx; starts.push(at); i = at + ln.text.length; }
    const xAt = (li, off) => { const ln = L.lines[li]; return ln.x + meas.raw(ln.text.slice(0, off)) + L.ls * off; };
    const boxes = [];
    const F = full.toLowerCase();
    for (const raw of (tp.marks || [])) {
      const m = String(raw || '').trim().toLowerCase();
      if (!m) continue;
      let from = 0, a;
      while ((a = F.indexOf(m, from)) >= 0) {
        const b = Math.min(a + m.length, shown.length);
        from = a + m.length;
        if (b <= a) continue;
        L.lines.forEach((ln, li) => {
          const s0 = Math.max(a, starts[li]), e0 = Math.min(b, starts[li] + ln.text.length);
          if (e0 > s0) boxes.push({ li, x0: xAt(li, s0 - starts[li]), x1: xAt(li, e0 - starts[li]) - (e0 - starts[li] > 0 ? L.ls * 0.5 : 0), base: ln.base, first: s0 === a, last: e0 === a + m.length || e0 === shown.length });
        });
      }
    }
    const last = L.lines[L.lines.length - 1];
    const caret = last ? { x: last.x + meas.raw(last.text) + L.ls * [...last.text].length, base: last.base } : { x: 0, base: L.size };
    return { boxes, caret };
  }
  R.typingBoxes = typingBoxes;
  // marks can wipe on over time (typing.wipe = { start, dur } in video seconds): 0 → 1, eased; the still view shows them whole
  function markProgress(el, env) {
    const w = el.typing && el.typing.wipe;
    if (!w) return 1;
    const t = env && 'time' in env ? env.time : R.playTime;
    if (t == null) return 1;
    const q = clamp((t - (w.start || 0)) / Math.max(0.05, w.dur || 0.5), 0, 1);
    return 1 - Math.pow(1 - q, 2.2);
  }
  // the boxes cut back to the first share p of their total length, in reading order
  function marksUpTo(boxes, p) {
    if (p >= 1) return boxes;
    const total = boxes.reduce((a, b) => a + (b.x1 - b.x0), 0);
    let left = total * p;
    const out = [];
    for (const b of boxes) {
      if (left <= 0) break;
      const w = b.x1 - b.x0;
      out.push(left >= w ? b : Object.assign({}, b, { x1: b.x0 + left, cut: true }));
      left -= w;
    }
    return out;
  }
  function typingUnder(ctx, el, L, T, prog = 1) {
    const tp = el.typing;
    const st = tp.style || 'select';
    if (st === 'circle') return;
    for (const b of marksUpTo(T.boxes, prog)) {
      const y0 = b.base - L.cap * 1.32, y1 = b.base + L.size * 0.2;
      const px = st === 'marker' ? L.size * 0.12 : L.size * 0.03;
      if (st === 'underline') { ctx.fillStyle = tp.color || '#ff3b30'; ctx.fillRect(b.x0, b.base + L.size * 0.08, b.x1 - b.x0, Math.max(2, L.size * 0.09)); continue; }
      ctx.fillStyle = tp.color || (st === 'marker' ? '#f4e04d' : 'rgba(52,130,246,0.32)');
      if (st === 'marker') ctx.fill(rrect(new Path2D(), b.x0 - px, y0, b.x1 - b.x0 + px * 2, y1 - y0, L.size * 0.04));
      else ctx.fillRect(b.x0 - px, y0, b.x1 - b.x0 + px * 2, y1 - y0);
    }
  }
  // a hand-drawn marker loop around each marked word, drawn on as the progress runs
  function markCircle(ctx, el, L, T, prog) {
    const tp = el.typing;
    if (prog <= 0) return;
    // marks that run on from one box to the next (same line) are circled as one
    const groups = [];
    for (const b of T.boxes) { const g = groups[groups.length - 1]; if (g && g.base === b.base && b.x0 - g.x1 < L.size * 0.6) g.x1 = b.x1; else groups.push({ x0: b.x0, x1: b.x1, base: b.base }); }
    ctx.save();
    ctx.strokeStyle = tp.color || '#e0312b'; ctx.lineWidth = Math.max(2, L.size * (tp.width || 0.075)); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    groups.forEach((g, gi) => {
      const r = rng(hashStr(el.text || '') + gi * 31);
      const cx = (g.x0 + g.x1) / 2, cy = g.base - L.cap * 0.5, rx = (g.x1 - g.x0) / 2 + L.size * 0.32, ry = L.cap * 0.5 + L.size * 0.36;
      const a0 = -2.6 + r() * 0.4, sweep = TAU * 1.12, n = 64, upto = Math.max(2, Math.round(n * prog));
      ctx.beginPath();
      for (let i = 0; i <= upto; i++) {
        const k = i / n, a = a0 + sweep * k;
        // the loop doesn't close on itself: it overshoots a little wider, like a quick pen stroke
        const grow = 1 + k * 0.1 + Math.sin(k * 9 + r() * 0.3) * 0.015;
        const x = cx + Math.cos(a) * rx * grow, y = cy + Math.sin(a) * ry * grow - k * L.size * 0.08;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    });
    ctx.restore();
  }
  function typingOver(ctx, el, L, T, prog = 1) {
    const tp = el.typing;
    if (tp.style === 'circle') markCircle(ctx, el, L, T, prog);
    if ((tp.style || 'select') === 'select') {
      const hc = tp.handle || '#1f7ae0', lw = Math.max(1.5, L.size * 0.05), kr = Math.max(3, L.size * 0.1);
      ctx.fillStyle = hc; ctx.strokeStyle = hc; ctx.lineWidth = lw; ctx.lineCap = 'butt';
      for (const b of T.boxes) {
        const px = L.size * 0.03, y0 = b.base - L.cap * 1.32, y1 = b.base + L.size * 0.2;
        if (b.first) { ctx.beginPath(); ctx.moveTo(b.x0 - px, y0 - kr); ctx.lineTo(b.x0 - px, y1); ctx.stroke(); ctx.beginPath(); ctx.arc(b.x0 - px, y0 - kr, kr, 0, TAU); ctx.fill(); }
        if (b.last) { ctx.beginPath(); ctx.moveTo(b.x1 + px, y0); ctx.lineTo(b.x1 + px, y1 + kr); ctx.stroke(); ctx.beginPath(); ctx.arc(b.x1 + px, y1 + kr, kr, 0, TAU); ctx.fill(); }
      }
    }
    if (tp.caret !== false && el._caretOn !== false) {
      ctx.fillStyle = tp.caretColor || (isClear(el.fill) ? '#111' : el.fill);
      const w = Math.max(1.5, L.size * (tp.caretWidth || 0.06));
      ctx.fillRect(T.caret.x + L.size * 0.04, T.caret.base - L.cap * 1.22, w, L.cap * 1.22 + L.size * 0.2);
    }
  }
  /* ── word-level entrances: word build, blur shuffle, select sweep, word wall ──
     These draw the words themselves (fill colour only — no box, stroke or shadow) so each word can move on its own. */
  // each word of a laid-out text: where it sits (x0–x1 along its line's baseline)
  function wordBoxesOf(L) {
    const meas = measurer(mctx, L.font, 0), out = [];
    L.lines.forEach((ln, li) => {
      const re = /\S+/g;
      let m;
      while ((m = re.exec(ln.text))) {
        const pre = ln.text.slice(0, m.index), n0 = [...pre].length, nw = [...m[0]].length;
        const x0 = ln.x + meas.raw(pre) + L.ls * n0, w = meas.raw(pre + m[0]) - meas.raw(pre) + L.ls * (nw - 1);
        out.push({ w: m[0], x0, x1: x0 + w, base: ln.base, li });
      }
    });
    return out;
  }
  const wfxLayout = (el, text) => {
    const e = Object.assign({}, el, { text, autoWidth: false, width: el.width });
    const L = layoutText(e);
    return { L, B: wordBoxesOf(L), dy: (el.height - L.boxH) / 2 };
  };
  // a word drawn on its own little canvas, smeared along x by `blur` px (cached per look)
  const wordCache = new LRU(300);
  function wordBitmap(L, word, fill, blur, s) {
    const key = [L.font, L.ls, word, fill, Math.round(blur), s].join('|');
    let c = wordCache.get(key);
    if (c) return c;
    const meas = measurer(mctx, L.font, L.ls), w = meas(word), pad = blur + L.size * 0.2;
    const W = Math.ceil((w + pad * 2) * s), H = Math.ceil(L.size * 1.6 * s);
    c = canvas(Math.max(2, W), Math.max(2, H));
    const x = c.getContext('2d');
    x.scale(s, s); x.font = L.font; x.fillStyle = fill; x.textBaseline = 'alphabetic';
    drawLine(x, word, pad, L.size * 1.15, L.ls, 'fill');
    if (blur > 1.5) c = motionBlurPx(c, blur * s, 0);
    c.pad = pad; c.top = L.size * 1.15; c.s = s;
    wordCache.set(key, c);
    return c;
  }
  // how many words a build entrance has shown at tt, and how far the newest one has come
  function buildState(n, tt, spd) {
    const slot = 0.34 / spd;
    if (tt < 0) return { n: 0, q: 0 };
    const k = Math.min(n, Math.floor(tt / slot) + 1);
    return { n: k, q: clamp((tt - (k - 1) * slot) / (0.32 / spd), 0, 1) };
  }
  function drawWordFx(ctx, el, W, env) {
    const mode = W.mode, tt = W.t, spd = W.spd, fill = el.fill || '#111';
    const text = el.uppercase ? String(el.text || '').toUpperCase() : String(el.text || '');
    const s = Math.min(3, Math.max(1, deviceScale(ctx)));
    if (mode === 'wall') { drawWordWall(ctx, el, tt, spd, env.doc || R.animDoc); return; }
    if (mode === 'build') {
      // words arrive one at a time; the line re-centres around what's there, the newest word pops up from below
      const words = [...text.matchAll(/\S+/g)], N = words.length;
      const st = buildState(N, tt, spd);
      if (!st.n) return;
      const upTo = k => k ? text.slice(0, words[k - 1].index + words[k - 1][0].length) : '';
      const P = wfxLayout(el, upTo(st.n)), Q = st.n > 1 ? wfxLayout(el, upTo(st.n - 1)) : P;
      const slide = easeOut(Math.min(1, st.q * 3));
      ctx.font = P.L.font; ctx.fillStyle = fill; ctx.textBaseline = 'alphabetic';
      for (let i = 0; i < P.B.length; i++) {
        const b = P.B[i], a = Q.B[i] && i < st.n - 1 ? Q.B[i] : b;
        const x = a.x0 + (b.x0 - a.x0) * slide, y = (a.base + Q.dy) + ((b.base + P.dy) - (a.base + Q.dy)) * slide;
        if (i < st.n - 1) { drawLine(ctx, b.w, x, y, P.L.ls, 'fill'); continue; }
        const q = st.q, k = easeBack(q), cx = b.x0 + (b.x1 - b.x0) / 2;
        ctx.save();
        ctx.globalAlpha *= Math.min(1, q * 4);
        ctx.translate(cx, y + (1 - k) * P.L.size * 0.55);
        ctx.rotate((1 - Math.min(1, k)) * (i % 2 ? 0.045 : -0.035));
        drawLine(ctx, b.w, b.x0 - cx, 0, P.L.ls, 'fill');
        ctx.restore();
      }
      return;
    }
    if (mode === 'shuffle') {
      // the paragraph keeps its lines, but a few times the words in each line are re-spaced at random (ragged, wide gaps,
      // pushed left or right); each word slides to its new spot a moment apart, smeared by its speed, then all settle
      const P = wfxLayout(el, text), L = P.L, K = 3, T = 2.1 / spd, md = 0.24 / spd;
      const byLine = new Map();
      P.B.forEach((b, i) => { if (!byLine.has(b.li)) byLine.set(b.li, []); byLine.get(b.li).push(i); });
      const offs = P.B.map(() => []), hops = P.B.map(() => []);
      for (const [li, ids] of byLine) {
        const r = rng(hashStr((el.id || 'w') + ':' + li) + 7);
        const ws = ids.map(i => P.B[i].x1 - P.B[i].x0), minGap = L.size * 0.25, free = Math.max(0, L.boxW - ws.reduce((a, v) => a + v, 0) - minGap * (ids.length - 1));
        for (let j = 0; j < K; j++) {
          const wt = Array.from({ length: ids.length + 1 }, () => Math.pow(r(), 1.6) + 0.02), sum = wt.reduce((a, v) => a + v, 0);
          let x = free * wt[0] / sum;
          ids.forEach((i, k) => { offs[i].push(x - P.B[i].x0); x += ws[k] + minGap + free * wt[k + 1] / sum; });
        }
        ids.forEach(i => { const rr = rng(hashStr((el.id || 'w') + i) + 3); for (let j = 0; j < K; j++) hops[i].push((j + 1) * T / (K + 1) + (rr() - 0.5) * 0.32 / spd); });
      }
      P.B.forEach((b, i) => {
        const o = offs[i].concat([0]);
        const at = u => {
          let p = o[0];
          for (let j = 0; j < K; j++) {
            const q = clamp((u - hops[i][j]) / md, 0, 1);
            if (q <= 0) break;
            p = o[j] + (o[j + 1] - o[j]) * eio(q);
          }
          return p;
        };
        const p = at(tt), v = Math.abs(p - at(tt - 1 / 30));
        const bm = wordBitmap(L, b.w, fill, Math.min(160, v * 1.1), s);
        ctx.drawImage(bm, b.x0 + p - bm.pad, b.base + P.dy - bm.top, bm.width / s, bm.height / s);
      });
      return;
    }
    if (mode === 'sweep') {
      // a text selection dragged across the line: highlight + I-beam, the line sliding along so the cursor stays in view
      const sw = el.sweep || {}, L = layoutText(el), meas = measurer(mctx, L.font, 0);
      const lines = L.lines, total = lines.reduce((a, ln) => a + [...ln.text].length, 0);
      const cps = 13 * spd, n = clamp(tt * cps, 0, total);
      // cursor position for a fractional character count
      const posAt = k => {
        let left = k;
        for (const ln of lines) {
          const ch = [...ln.text];
          if (left <= ch.length || ln === lines[lines.length - 1]) {
            const i = clamp(Math.floor(left), 0, ch.length), f = clamp(left - i, 0, 1);
            const xa = ln.x + meas.raw(ch.slice(0, i).join('')) + L.ls * i, xb = i < ch.length ? ln.x + meas.raw(ch.slice(0, i + 1).join('')) + L.ls * (i + 1) : xa;
            return { x: xa + (xb - xa) * f, ln };
          }
          left -= ch.length;
        }
        return { x: 0, ln: lines[0] };
      };
      const head = posAt(n);
      let shift = 0;
      const doc = env.doc || R.animDoc;
      if (sw.follow !== false && doc) shift = Math.min(0, doc.width * (sw.at ?? 0.62) - (el.x + head.x));
      ctx.save();
      ctx.translate(shift, 0);
      ctx.font = L.font; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = fill;
      for (const ln of lines) drawLine(ctx, ln.text, ln.x, ln.base, L.ls, 'fill');
      const sel = Math.round(n), hc = sw.color || '#f0c419', ink = sw.ink || '#4a1d00';
      let left = sel;
      const y0 = b => b - L.cap * 1.22, y1 = b => b + L.size * 0.24;
      for (const ln of lines) {
        const ch = [...ln.text], k = Math.min(ch.length, left);
        if (k > 0) {
          const xr = ln.x + meas.raw(ch.slice(0, k).join('')) + L.ls * k;
          ctx.save();
          ctx.beginPath(); ctx.rect(ln.x - L.size * 0.03, y0(ln.base), xr - ln.x + L.size * 0.03, y1(ln.base) - y0(ln.base)); ctx.clip();
          ctx.fillStyle = hc; ctx.fillRect(ln.x - L.size * 0.03, y0(ln.base), xr - ln.x + L.size * 0.03, y1(ln.base) - y0(ln.base));
          ctx.fillStyle = ink; drawLine(ctx, ln.text, ln.x, ln.base, L.ls, 'fill');
          ctx.restore();
        }
        left -= ch.length;
        if (left <= 0) break;
      }
      if (sw.cursor !== false) {
        // the I-beam, with its little curved serifs
        const b = head.ln.base, top = y0(b) - L.size * 0.12, bot = y1(b) + L.size * 0.12, x = head.x, sf = L.size * 0.09;
        ctx.strokeStyle = sw.beam || hc; ctx.lineWidth = Math.max(1.2, L.size * 0.035); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bot);
        ctx.moveTo(x - sf, top - sf * 0.5); ctx.quadraticCurveTo(x, top - sf * 0.1, x, top + sf * 0.35); ctx.quadraticCurveTo(x, top - sf * 0.1, x + sf, top - sf * 0.5);
        ctx.moveTo(x - sf, bot + sf * 0.5); ctx.quadraticCurveTo(x, bot + sf * 0.1, x, bot - sf * 0.35); ctx.quadraticCurveTo(x, bot + sf * 0.1, x + sf, bot + sf * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  // word wall: rows of the words (comma-separated in the text) fill the layer; one of them lights up in a second font,
  // and every beat the wall reshuffles around the next word
  function drawWordWall(ctx, el, tt, spd, doc) {
    const wl = el.wall || {}, words = String(el.text || '').split(/[,\n]+/).map(w => w.trim()).filter(Boolean);
    if (!words.length || tt < 0) return;
    const size = el.fontSize || 48, font = fontFor(el.fontFamily, el.fontWeight, el.italic, size);
    const hiSize = size * (wl.scale ?? 1.12), hiFont = fontFor(wl.fontFamily || 'Newsreader', wl.fontWeight || 400, !!wl.italic, hiSize);
    const meas = measurer(mctx, font, 0), space = meas(' ') * 1.05, lh = size * (el.lineHeight || 1.0);
    const beat = Math.max(0.12, (wl.beat ?? 0.36) / spd), c = Math.floor(tt / beat), hi = words[c % words.length];
    // the wall covers the whole canvas (a text box is only as tall as its own lines); wall.fill = false keeps it to the box
    const full = wl.fill !== false && doc && !el.rotation, ox = full ? -el.x : 0, oy = full ? -el.y : 0;
    const W = full ? doc.width : el.width, H = full ? doc.height : el.height, rows = Math.ceil(H / lh) + 2, mid = Math.floor(rows / 2);
    const y0 = H / 2 - mid * lh + size * 0.35;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.textBaseline = 'alphabetic';
    const pick = r => words[Math.floor(r() * words.length)];
    for (let row = 0; row < rows; row++) {
      const r = rng(hashStr(el.id || 'wall') + c * 977 + row * 131), y = y0 + row * lh;
      ctx.font = font; ctx.fillStyle = el.fill || '#1b2a8f';
      if (row !== mid) {
        let x = -r() * W * 0.4;
        while (x < W) { const w = pick(r); ctx.fillText(w, x, y); x += meas(w) + space; }
        continue;
      }
      // the lit word sits near the middle; ordinary words run up to it from both sides
      mctx.font = hiFont;
      const hw = mctx.measureText(hi).width, hx = W / 2 - hw / 2 + (r() - 0.5) * W * 0.3;
      let x = hx - space;
      while (x > 0) { const w = pick(r); x -= meas(w); ctx.fillText(w, x, y); x -= space; }
      x = hx + hw + space;
      while (x < W) { const w = pick(r); ctx.fillText(w, x, y); x += meas(w) + space; }
      ctx.font = hiFont; ctx.fillStyle = wl.color || '#ffffff';
      ctx.fillText(hi, hx, y);
    }
    ctx.restore();
  }
  function drawText(ctx, el, env) {
    const L = layoutText(el);
    const bg = el.bg || {};
    // anchor: slide the line so one chosen word sits dead centre (match cuts keep it still)
    if (el.anchor && !L.curved) {
      const A = typingBoxes(Object.assign({}, el, { typing: { marks: [el.anchor] } }), L).boxes[0];
      if (A) ctx.translate(L.boxW / 2 - (A.x0 + A.x1) / 2, 0);
    }
    textBackground(ctx, el, L);
    if (el._yShift) ctx.translate(0, el._yShift);
    const TY = el.typing && !L.curved ? typingBoxes(el, L) : null;
    const MP = TY ? markProgress(el, env) : 1;
    if (TY) typingUnder(ctx, el, L, TY, MP);
    ctx.font = L.font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    const stroke = el.stroke || {};
    const echo = el.echo || {};
    const fillStyle = (el.gradient && el.gradient !== 'none' && el.fill2)
      ? makeFill(ctx, { color: el.fill, color2: el.fill2, gradient: el.gradient, angle: el.gradAngle }, L.boxW, L.boxH)
      : (el.fill || '#111');

    const pass = (mode, style, lineWidth, dx = 0, dy = 0) => {
      ctx.save();
      ctx.translate(dx, dy);
      if (mode === 'stroke') { ctx.lineWidth = lineWidth; ctx.strokeStyle = style; }
      else ctx.fillStyle = style;
      if (el._letters && !L.curved) {
        // per-letter entrance: each glyph lands on its own, staggered
        const LT = el._letters, meas = measurer(mctx, L.font, 0);
        const bounce = LT.style === 'lettersBounce';
        const stag = (bounce ? 0.11 : 0.055) / LT.spd, dur = (bounce ? 0.24 : 0.42) / LT.spd;
        let g = 0;
        for (const ln of L.lines) {
          const chars = [...ln.text];
          let prefix = '';
          for (let i = 0; i < chars.length; i++, g++) {
            const ch = chars[i], x = ln.x + meas.raw(prefix) + L.ls * i, cw = meas.raw(prefix + ch) - meas.raw(prefix);
            prefix += ch;
            const q = clamp((LT.t - g * stag) / dur, 0, 1);
            if (q <= 0 || ch === ' ') continue;
            ctx.save();
            ctx.translate(x + cw / 2, ln.base - L.cap / 2);
            if (LT.style === 'slam') {
              const k = easeBack(q), sc = 2.1 - 1.1 * k;
              ctx.rotate((1 - q) * (g % 2 ? 0.35 : -0.35)); ctx.scale(sc, sc); ctx.globalAlpha *= Math.min(1, q * 3);
            } else if (LT.style === 'lettersBounce') {
              // each new letter lands low, then snaps up onto the line
              ctx.translate(0, (1 - easeBack(q)) * L.size * 0.5); ctx.scale(0.86 + 0.14 * q, 0.86 + 0.14 * q);
            } else if (LT.style === 'lettersUp') { ctx.translate(0, (1 - easeOut(q)) * L.size * 0.9); ctx.globalAlpha *= q; }
            else if (LT.style === 'lettersDrop') { ctx.translate(0, -(1 - easeBounce(q)) * L.size * 1.3); ctx.globalAlpha *= Math.min(1, q * 4); }
            else { ctx.globalAlpha *= q; ctx.scale(0.9 + 0.1 * q, 0.9 + 0.1 * q); }
            mode === 'stroke' ? ctx.strokeText(ch, -cw / 2, L.cap / 2) : ctx.fillText(ch, -cw / 2, L.cap / 2);
            ctx.restore();
          }
        }
      } else if (L.curved) {
        for (const g of L.glyphs) {
          ctx.save();
          if (L.sign > 0) { ctx.translate(L.cx + L.r * Math.sin(g.phi), L.cy - L.r * Math.cos(g.phi)); ctx.rotate(g.phi); }
          else { ctx.translate(L.cx + L.r * Math.sin(g.phi), L.cy + L.r * Math.cos(g.phi)); ctx.rotate(-g.phi); }
          mode === 'stroke' ? ctx.strokeText(g.ch, -g.cw / 2, 0) : ctx.fillText(g.ch, -g.cw / 2, 0);
          ctx.restore();
        }
      } else {
        for (const ln of L.lines) drawLine(ctx, ln.text, ln.x, ln.base, L.ls, mode);
      }
      ctx.restore();
    };

    if (bg.style === 'sticker') {
      const pw = bg.padX || L.size * 0.12;
      if (bg.borderWidth > 0) pass('stroke', bg.borderColor || '#111', (pw + bg.borderWidth) * 2 + (stroke.width || 0) * 2);
      pass('stroke', bg.color || '#fff', pw * 2 + (stroke.width || 0) * 2);
    }
    if (echo.on) {
      const steps = Math.max(1, Math.round(echo.steps || 1));
      const dx = (echo.dx ?? 0.05) * L.size, dy = (echo.dy ?? 0.05) * L.size;
      for (let k = steps; k >= 1; k--) {
        const ox = dx * k / steps, oy = dy * k / steps;
        if (stroke.width > 0) pass('stroke', echo.color || '#111', stroke.width * 2, ox, oy);
        pass('fill', echo.color || '#111', 0, ox, oy);
      }
    }
    // a filled glyph hides the inner half of the stroke; outline-only text keeps it centred
    if (stroke.width > 0) pass('stroke', stroke.color || '#111', isClear(el.fill) ? stroke.width : stroke.width * 2);
    if (!isClear(el.fill)) pass('fill', fillStyle);

    if (!L.curved && (el.underline || el.strike)) {
      ctx.fillStyle = isClear(el.fill) ? (stroke.color || '#111') : el.fill;
      const t = Math.max(1, L.size * 0.055);
      for (const ln of L.lines) {
        if (el.underline) ctx.fillRect(ln.x, ln.base + L.size * 0.1, ln.w, t);
        if (el.strike) ctx.fillRect(ln.x, ln.base - L.cap * 0.42 - t / 2, ln.w, t);
      }
    }
    if (TY) typingOver(ctx, el, L, TY, MP);
  }
  /* ───────────────────────── checklist ───────────────────────── */

  function layoutChecklist(el) {
    const size = el.fontSize || 40;
    const lh = size * (el.lineHeight || 1.6);
    const items = (el.items || '').split('\n');
    return { size, lh, items, boxH: Math.max(lh, items.length * lh), font: fontFor(el.fontFamily, el.fontWeight, el.italic, size) };
  }
  R.layoutChecklist = layoutChecklist;
  function drawChecklist(ctx, el) {
    const L = layoutChecklist(el);
    const box = L.size * 0.78, gap = L.size * 0.5;
    ctx.font = L.font; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const m = metrics(fontFor(el.fontFamily, el.fontWeight, el.italic, 100));
    L.items.forEach((raw, i) => {
      const checked = /^\s*\[x\]/i.test(raw);
      const text = raw.replace(/^\s*\[( |x)?\]\s?/i, '');
      const cy = i * L.lh + L.lh / 2;
      const bx = 0, by = cy - box / 2;
      const lw = Math.max(1.5, L.size * 0.07);
      const p = new Path2D();
      const shape = el.boxStyle || 'square';
      if (shape === 'circle') p.arc(bx + box / 2, cy, box / 2, 0, TAU);
      else if (shape === 'heart') { const hp = heartPath(box, box); p.addPath(hp, new DOMMatrix().translate(bx, by)); }
      else if (shape === 'star') { p.addPath(shapePath('star', box, box, { radius: box * 0.06 }), new DOMMatrix().translate(bx, by)); }
      else rrect(p, bx, by, box, box, shape === 'round' ? box * 0.28 : box * 0.08);
      if (checked && el.fillChecked) { ctx.fillStyle = el.boxColor || '#111'; ctx.fill(p); }
      ctx.lineWidth = lw; ctx.strokeStyle = el.boxColor || '#111'; ctx.stroke(p);
      if (checked) {
        ctx.strokeStyle = el.fillChecked ? (el.checkOnFill || '#fff') : (el.checkColor || el.boxColor || '#111');
        ctx.lineWidth = lw * 1.4;
        ctx.beginPath();
        ctx.moveTo(bx + box * 0.2, cy + box * 0.02);
        ctx.lineTo(bx + box * 0.42, cy + box * 0.24);
        ctx.lineTo(bx + box * (el.fillChecked ? 0.8 : 0.95), cy - box * (el.fillChecked ? 0.22 : 0.42));
        ctx.stroke();
      }
      const tx = bx + box + gap;
      ctx.fillStyle = el.fill || '#111';
      ctx.save();
      if (checked && el.dimChecked !== false) ctx.globalAlpha *= 0.55;
      ctx.textBaseline = 'alphabetic';
      const base = cy + (m.cap * L.size) / 2;
      ctx.fillText(text, tx, base);
      if (checked && el.strikeChecked !== false) {
        const tw = ctx.measureText(text).width;
        ctx.fillRect(tx, base - m.cap * L.size * 0.45, tw, Math.max(1, L.size * 0.06));
      }
      if (el.ruled) {
        ctx.globalAlpha = 0.25; ctx.fillRect(tx, i * L.lh + L.lh - 1, el.width - tx, 1.2);
      }
      ctx.restore();
    });
  }

  /* ───────────────────────── calendar ───────────────────────── */

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  R.MONTHS = MONTHS; R.DAYS = DAYS;
  function markPath(kind, cx, cy, r, seed) {
    switch (kind) {
      case 'heart': { const p = new Path2D(); p.addPath(heartPath(r * 2.1, r * 1.9), new DOMMatrix().translate(cx - r * 1.05, cy - r * 0.9)); return p; }
      case 'star': { const p = new Path2D(); p.addPath(shapePath('star', r * 2.4, r * 2.3, { radius: r * 0.12 }), new DOMMatrix().translate(cx - r * 1.2, cy - r * 1.2)); return p; }
      case 'square': return rrect(new Path2D(), cx - r, cy - r, r * 2, r * 2, r * 0.3);
      case 'flower': { const p = new Path2D(); p.addPath(shapePath('flower', r * 2.3, r * 2.3, { points: 8, depth: 0.22 }), new DOMMatrix().translate(cx - r * 1.15, cy - r * 1.15)); return p; }
      case 'scribble': {
        const rr = rng(seed), p = new Path2D();
        for (let i = 0; i <= 50; i++) {
          const t = i / 50 * TAU * 1.15 - 0.4, k = 1 + (rr() - 0.5) * 0.05;
          const x = cx + Math.cos(t) * r * 1.15 * k, y = cy + Math.sin(t) * r * 0.95 * k;
          i ? p.lineTo(x, y) : p.moveTo(x, y);
        }
        return p;
      }
      default: { const p = new Path2D(); p.arc(cx, cy, r, 0, TAU); return p; }
    }
  }
  function drawMark(ctx, el, cx, cy, r, day) {
    const kind = el.markStyle || 'circle', col = el.accent || '#e4572e';
    const p = markPath(kind, cx, cy, r, day * 31);
    if (kind === 'ring' || kind === 'scribble') {
      ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.stroke(p);
      return false;
    }
    if (kind === 'cross') {
      ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.strokeStyle = col; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - r * 0.8, cy - r * 0.8); ctx.lineTo(cx + r * 0.8, cy + r * 0.8);
      ctx.moveTo(cx + r * 0.8, cy - r * 0.8); ctx.lineTo(cx - r * 0.8, cy + r * 0.8); ctx.stroke();
      return false;
    }
    ctx.fillStyle = col; ctx.fill(p);
    return true;
  }
  function centered(ctx, s, x, y, ls = 0) {
    // text centred on x; y is the visual middle
    const w = ctx.measureText(s).width + ls * Math.max(0, [...s].length - 1);
    drawLine(ctx, s, x - w / 2, y, ls, 'fill');
  }
  function weeksIn(year, month, mon) {
    const first = new Date(year, month, 1).getDay();
    const off = mon ? (first + 6) % 7 : first;
    const days = new Date(year, month + 1, 0).getDate();
    return { off, days, rows: Math.ceil((off + days) / 7) };
  }
  function drawCalendar(ctx, el) {
    const w = el.width, h = el.height;
    const year = el.year ?? 2026, month = el.month ?? 0;
    const text = el.color || '#1d1d1b', accent = el.accent || '#e4572e', accentText = el.accentText || '#fff';
    const marked = new Set(el.marked || []);
    const tF = el.titleFont || 'Instrument Serif', bF = el.bodyFont || 'Instrument Sans';
    const tW = el.titleWeight || 400, bW = el.bodyWeight || 500;
    const capOf = (fam, wt) => metrics(fontFor(fam, wt, false, 100)).cap;
    const layout = el.layout || 'grid';

    if (el.bgColor && !isClear(el.bgColor)) {
      ctx.fillStyle = el.bgColor;
      ctx.fill(rrect(new Path2D(), 0, 0, w, h, el.radius || 0));
    }
    ctx.textBaseline = 'alphabetic';

    if (layout === 'page') {
      const r = el.radius ?? w * 0.06;
      const band = h * 0.24;
      ctx.save();
      ctx.clip(rrect(new Path2D(), 0, 0, w, h, r));
      ctx.fillStyle = el.cellColor || '#fffdf7'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = accent; ctx.fillRect(0, 0, w, band);
      ctx.restore();
      // binding rings
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      for (const fx of [0.3, 0.7]) { ctx.beginPath(); ctx.arc(w * fx, band * 0.22, w * 0.025, 0, TAU); ctx.fill(); }
      ctx.fillStyle = accentText;
      let fs = band * 0.42;
      ctx.font = fontFor(tF, tW, false, fs);
      const mtxt = (el.monthCase === 'upper' ? MONTHS[month].toUpperCase() : MONTHS[month]);
      centered(ctx, mtxt, w / 2, band * 0.55 + capOf(tF, tW) * fs / 2, (el.titleSpacing || 0) * fs);
      const day = clamp(el.day || 1, 1, 31);
      fs = h * 0.5;
      ctx.font = fontFor(tF, tW, false, fs);
      ctx.fillStyle = text;
      centered(ctx, String(day), w / 2, band + (h - band) * 0.46 + capOf(tF, tW) * fs / 2);
      fs = h * 0.075;
      ctx.font = fontFor(bF, bW, false, fs);
      ctx.fillStyle = text;
      const wd = DAYS[new Date(year, month, day).getDay()];
      centered(ctx, el.monthCase === 'upper' ? wd.toUpperCase() : wd, w / 2, h - (h - band) * 0.12, fs * 0.08);
      return;
    }

    if (layout === 'strip') {
      const day = clamp(el.day || 1, 1, 31);
      const date = new Date(year, month, day);
      const dow = el.startMonday ? (date.getDay() + 6) % 7 : date.getDay();
      const start = new Date(year, month, day - dow);
      const showT = el.showTitle !== false;
      const th = showT ? h * 0.26 : 0;
      if (showT) {
        const fs = th * 0.62;
        ctx.font = fontFor(tF, tW, false, fs); ctx.fillStyle = text;
        const s = MONTHS[month] + (el.showYear !== false ? ' ' + year : '');
        if (el.titleAlign === 'left') drawLine(ctx, el.monthCase === 'upper' ? s.toUpperCase() : s, w * 0.02, th * 0.72, 0, 'fill');
        else centered(ctx, el.monthCase === 'upper' ? s.toUpperCase() : s, w / 2, th * 0.72);
      }
      const cw = w / 7, ch = h - th;
      for (let i = 0; i < 7; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const cx = cw * i + cw / 2;
        const sel = d.getDate() === day && d.getMonth() === month;
        const pill = rrect(new Path2D(), cx - cw * 0.4, th + ch * 0.04, cw * 0.8, ch * 0.92, cw * 0.4);
        if (sel) { ctx.fillStyle = accent; ctx.fill(pill); }
        else if (el.cellColor && !isClear(el.cellColor)) { ctx.fillStyle = el.cellColor; ctx.fill(pill); }
        let fs = Math.min(cw * 0.26, ch * 0.16);
        ctx.font = fontFor(bF, bW, false, fs); ctx.fillStyle = sel ? accentText : text;
        ctx.save(); if (!sel) ctx.globalAlpha *= 0.6;
        centered(ctx, DAYS[d.getDay()].slice(0, 3).toUpperCase(), cx, th + ch * 0.3, fs * 0.08);
        ctx.restore();
        fs = Math.min(cw * 0.48, ch * 0.34);
        ctx.font = fontFor(tF, tW, false, fs); ctx.fillStyle = sel ? accentText : text;
        centered(ctx, String(d.getDate()), cx, th + ch * 0.68 + capOf(tF, tW) * fs / 2 - fs * 0.1);
        if (!sel && marked.has(d.getDate()) && d.getMonth() === month) {
          ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx, th + ch * 0.86, cw * 0.05, 0, TAU); ctx.fill();
        }
      }
      return;
    }

    // grid / minimal
    const { off, days, rows } = weeksIn(year, month, el.startMonday);
    const pad = w * 0.04;
    const showT = el.showTitle !== false;
    const th = showT ? h * (el.titleSize || 0.17) : 0;
    const hh = el.showWeekdays === false ? 0 : h * 0.08;
    const gx = pad, gy = pad + th + hh, gw = w - pad * 2, gh = h - gy - pad;
    const cw = gw / 7, chh = gh / rows;
    if (showT) {
      const fs = th * 0.7;
      ctx.font = fontFor(tF, tW, false, fs); ctx.fillStyle = text;
      let s = MONTHS[month];
      if (el.monthCase === 'upper') s = s.toUpperCase();
      const ty = pad + th * 0.5 + capOf(tF, tW) * fs / 2;
      const tsp = (el.titleSpacing || 0) * fs;
      if (el.titleAlign === 'center') centered(ctx, s + (el.showYear !== false ? ' ' + year : ''), w / 2, ty, tsp);
      else {
        drawLine(ctx, s, gx, ty, tsp, 'fill');
        if (el.showYear !== false) {
          const yf = fs * 0.42;
          ctx.font = fontFor(bF, bW, false, yf);
          const yw = ctx.measureText(String(year)).width;
          ctx.save(); ctx.globalAlpha *= 0.7;
          ctx.fillText(String(year), gx + gw - yw, ty);
          ctx.restore();
        }
      }
    }
    // weekday header
    if (hh) {
      const fs = Math.min(cw * 0.3, hh * 0.5);
      ctx.font = fontFor(bF, Math.max(bW, 600), false, fs);
      const names = el.startMonday ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
      for (let i = 0; i < 7; i++) {
        let n = DAYS[names[i]];
        n = el.dayFormat === 'initial' ? n[0] : el.dayFormat === 'long' ? n : n.slice(0, 3);
        if (el.dayFormat !== 'long') n = n.toUpperCase();
        const isWeekend = names[i] === 0 || names[i] === 6;
        ctx.fillStyle = isWeekend && el.weekendAccent ? accent : text;
        ctx.save(); ctx.globalAlpha *= isWeekend && el.weekendAccent ? 1 : 0.65;
        centered(ctx, n, gx + cw * i + cw / 2, pad + th + hh * 0.5 + capOf(bF, 600) * fs / 2, fs * 0.08);
        ctx.restore();
      }
      if (el.headerLine) {
        ctx.fillStyle = el.lineColor || text; ctx.fillRect(gx, pad + th + hh - 1, gw, 1.5);
      }
    }
    const lineCol = el.lineColor || rgba(text, 0.25);
    if (layout === 'grid' && el.showLines !== false) {
      ctx.strokeStyle = lineCol; ctx.lineWidth = Math.max(1, w * 0.0025);
      const p = new Path2D();
      for (let r = 0; r <= rows; r++) { p.moveTo(gx, gy + chh * r); p.lineTo(gx + gw, gy + chh * r); }
      for (let c = 0; c <= 7; c++) { p.moveTo(gx + cw * c, gy); p.lineTo(gx + cw * c, gy + gh); }
      ctx.stroke(p);
    }
    const fs = Math.min(cw, chh) * (layout === 'grid' ? 0.34 : 0.42) * (el.numberScale || 1);
    const numFont = fontFor(bF, bW, false, fs);
    const numCap = capOf(bF, bW) * fs;
    const topLeft = layout === 'grid' && (el.numberPos === 'corner' || el.numberPos === 'corner-right');
    const rightCorner = el.numberPos === 'corner-right';
    for (let d = 1; d <= days; d++) {
      const idx = off + d - 1, r = Math.floor(idx / 7), c = idx % 7;
      const x0 = gx + cw * c, y0 = gy + chh * r;
      if (el.cellColor && !isClear(el.cellColor)) {
        ctx.fillStyle = el.cellColor;
        const ins = Math.min(cw, chh) * 0.06;
        ctx.fill(rrect(new Path2D(), x0 + ins, y0 + ins, cw - ins * 2, chh - ins * 2, (el.cellRadius ?? 0.2) * Math.min(cw, chh)));
      }
      let cx = x0 + cw / 2, cy = y0 + chh / 2;
      if (topLeft) { cx = rightCorner ? x0 + cw - fs * 1.1 : x0 + fs * 0.9; cy = y0 + fs * 0.95; }
      let onAccent = false;
      if (marked.has(d)) onAccent = drawMark(ctx, el, cx, cy, Math.min(cw, chh) * (topLeft ? 0.22 : 0.36), d);
      ctx.font = numFont;
      const weekend = el.startMonday ? c >= 5 : (c === 0 || c === 6);
      ctx.fillStyle = onAccent ? accentText : (weekend && el.weekendAccent ? accent : text);
      centered(ctx, String(d), cx, cy + numCap / 2);
    }
    if (el.showAdjacent) {
      ctx.save(); ctx.globalAlpha *= 0.28; ctx.font = numFont; ctx.fillStyle = text;
      const prevDays = new Date(year, month, 0).getDate();
      for (let i = 0; i < off; i++) centered(ctx, String(prevDays - off + 1 + i), gx + cw * i + cw / 2, gy + chh / 2 + numCap / 2);
      const tail = rows * 7 - off - days;
      for (let i = 0; i < tail; i++) {
        const idx = off + days + i, r = Math.floor(idx / 7), c = idx % 7;
        centered(ctx, String(i + 1), gx + cw * c + cw / 2, gy + chh * r + chh / 2 + numCap / 2);
      }
      ctx.restore();
    }
  }

  /* ───────────────────────── badge (circular text) ───────────────────────── */

  function drawBadge(ctx, el) {
    const s = Math.min(el.width, el.height), cx = el.width / 2, cy = el.height / 2, R0 = s / 2;
    const shape = el.shape || 'circle';
    if (shape !== 'none') {
      const p = new Path2D();
      const m = new DOMMatrix().translate(cx - R0, cy - R0);
      if (shape === 'circle') p.arc(cx, cy, R0, 0, TAU);
      else p.addPath(shapePath(shape, s, s, shape === 'burst' ? { points: 22, inner: 0.86 } : shape === 'flower' ? { points: 10, depth: 0.16 } : { points: 18, depth: 0.06 }), m);
      ctx.fillStyle = el.fill || '#d7ef5a'; ctx.fill(p);
      if (el.borderWidth > 0) { ctx.lineWidth = el.borderWidth; ctx.strokeStyle = el.borderColor || '#111'; ctx.stroke(p); }
    }
    if (el.innerRing) {
      ctx.lineWidth = Math.max(1, s * 0.008); ctx.strokeStyle = el.textColor || '#111';
      ctx.beginPath(); ctx.arc(cx, cy, R0 * (el.ringRadius ?? 0.74) - s * 0.06, 0, TAU); ctx.stroke();
    }
    // ring text
    const fs = s * (el.ringSize ?? 0.1);
    const font = fontFor(el.ringFont || 'Bricolage Grotesque', el.ringWeight || 600, false, fs);
    ctx.font = font; ctx.fillStyle = el.textColor || '#1f3fd1'; ctx.textBaseline = 'alphabetic';
    const m = metrics(fontFor(el.ringFont || 'Bricolage Grotesque', el.ringWeight || 600, false, 100));
    let str = el.ringText || '';
    if (el.ringUpper !== false) str = str.toUpperCase();
    const rr = R0 * (el.ringRadius ?? 0.74);
    const circ = TAU * rr;
    let chars = [...str];
    const ls0 = (el.ringSpacing ?? 0.1) * fs;
    const widthOf = arr => { let t = 0; for (const c of arr) t += ctx.measureText(c).width + ls0; return t; };
    if (el.ringRepeat && chars.length) {
      const unit = [...(str + (el.ringSep ?? '  •  '))];
      const uw = widthOf(unit);
      const reps = Math.max(1, Math.floor(circ / uw));
      chars = []; for (let i = 0; i < reps; i++) chars.push(...unit);
    }
    const total = widthOf(chars);
    const extra = el.ringFill !== false && chars.length ? Math.max(0, circ - total) / chars.length : 0;
    let a = (el.ringStart ?? 0) * Math.PI / 180;
    const mid = rr - m.cap * fs / 2; // place baseline so glyphs are centred on the ring radius
    for (const ch of chars) {
      const cw = ctx.measureText(ch).width + ls0 + extra;
      const phi = a + (cw / 2) / rr;
      ctx.save();
      ctx.translate(cx + Math.sin(phi) * mid, cy - Math.cos(phi) * mid);
      ctx.rotate(phi);
      ctx.fillText(ch, -ctx.measureText(ch).width / 2, 0);
      ctx.restore();
      a += cw / rr;
    }
    // centre
    const cs = s * (el.centerSize ?? 0.3);
    const center = el.center || 'asterisk';
    ctx.fillStyle = el.centerColor || el.textColor || '#1f3fd1';
    ctx.strokeStyle = ctx.fillStyle;
    if (center === 'text') {
      const f2 = fontFor(el.centerFont || el.ringFont || 'Bricolage Grotesque', el.centerWeight || 700, !!el.centerItalic, cs);
      ctx.font = f2;
      const lines = (el.centerText || '').split('\n');
      const mm = metrics(fontFor(el.centerFont || el.ringFont || 'Bricolage Grotesque', el.centerWeight || 700, !!el.centerItalic, 100));
      const lh = cs * 1.0;
      const top = cy - (lines.length - 1) * lh / 2;
      lines.forEach((ln, i) => centered(ctx, ln, cx, top + i * lh + mm.cap * cs / 2));
    } else if (center === 'asterisk') {
      ctx.lineWidth = cs * 0.16; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) { const t = i * Math.PI / 3 + Math.PI / 2; ctx.moveTo(cx - Math.cos(t) * cs / 2, cy - Math.sin(t) * cs / 2); ctx.lineTo(cx + Math.cos(t) * cs / 2, cy + Math.sin(t) * cs / 2); }
      ctx.stroke();
    } else if (center !== 'none') {
      const kind = center === 'sparkle' ? 'sparkle' : center === 'heart' ? 'heart' : center === 'flower' ? 'flower' : 'star';
      const p = new Path2D();
      p.addPath(shapePath(kind, cs, cs, { radius: cs * 0.05 }), new DOMMatrix().translate(cx - cs / 2, cy - cs / 2));
      ctx.fill(p);
    }
  }

  /* ───────────────────────── images ───────────────────────── */

  R.FILTER_PRESETS = {
    original: { label: 'Original', f: {} },
    vivid: { label: 'Vivid', f: { saturation: 35, contrast: 12 } },
    warm: { label: 'Warm', f: { warmth: 35, saturation: 8 } },
    cool: { label: 'Cool', f: { warmth: -30, contrast: 6 } },
    fade: { label: 'Fade', f: { fade: 45, contrast: -12, saturation: -10 } },
    vintage: { label: 'Vintage', f: { sepia: 35, fade: 30, warmth: 18, contrast: -6, vignette: 35, grain: 30 } },
    film: { label: 'Film', f: { fade: 22, warmth: 10, contrast: 10, saturation: -8, grain: 45 } },
    halation: { label: 'Halation', f: { halation: 55, warmth: 14, fade: 10, contrast: 8, grain: 30, vignette: 20 } },
    dreamy: { label: 'Dreamy', f: { brightness: 10, fade: 25, saturation: -12, blur: 0 } },
    punch: { label: 'Punch', f: { contrast: 30, saturation: 25, brightness: -4 } },
    bw: { label: 'B&W', f: { grayscale: 100, contrast: 12 } },
    noir: { label: 'Noir', f: { grayscale: 100, contrast: 45, brightness: -8, vignette: 45, grain: 25 } },
    sepia: { label: 'Sepia', f: { sepia: 85, contrast: 5 } },
    halftone: { label: 'Halftone', f: { grayscale: 100, contrast: 25, brightness: 12, halftone: 35 } },
    halftoneFine: { label: 'Fine dots', f: { grayscale: 100, contrast: 20, halftone: 12 } },
    duoBlue: { label: 'Duo blue', f: { contrast: 15, duotone: true, duoDark: '#1b2a8f', duoLight: '#a9c4ff' } },
    duoPink: { label: 'Duo pink', f: { contrast: 15, duotone: true, duoDark: '#3a0d2c', duoLight: '#ff7ab6' } },
    duoDots: { label: 'Duo dots', f: { contrast: 20, duotone: true, duoDark: '#1b2a8f', duoLight: '#b8cdfa', halftone: 20 } },
    photocopy: { label: 'Photocopy', f: { contrast: 20, threshold: 50, grain: 35 } },
    riso: { label: 'Riso', f: { contrast: 25, duotone: true, duoDark: '#f2542d', duoLight: '#fff3d6', halftone: 8, grain: 25 } },
    xerox: { label: 'Xerox', f: { grayscale: 100, contrast: 60, brightness: 8, grain: 50, fade: 10 } },
    motion: { label: 'Motion', f: { motion: 45, contrast: 6 } },
    grit: { label: 'Gym grit', f: { grayscale: 100, contrast: 28, brightness: -6, motion: 55, noise: 55, vignette: 35 } },
    ghost: { label: 'Ghost', f: { motion: 70, motionAngle: 90, fade: 18, saturation: -20 } },
    noisy: { label: 'Noise', f: { noise: 60, contrast: 10, fade: 8 } },
    haze: { label: 'Haze', f: { blur: 6, fade: 22, brightness: 8, noise: 30 } },
    zoomburst: { label: 'Zoom burst', f: { zoomBlur: 55, contrast: 10 } },
    spin: { label: 'Spin', f: { spinBlur: 45, contrast: 6 } },
    tilt: { label: 'Tilt-shift', f: { tiltShift: 60, saturation: 20, contrast: 8 } },
    double: { label: 'Double', f: { ghost: 45, motionAngle: 20, fade: 10 } },
    fisheye: { label: 'Fisheye', f: { fisheye: 45, contrast: 6, saturation: 8 } },
    lens: { label: 'Lens', f: { fisheye: 35, warmth: 12, fade: 10, vignette: 30 } },
    // film stocks and processes (named for the look, not the brand)
    gold: { label: 'Gold 200', f: { warmth: 22, saturation: 12, contrast: 8, fade: 10, highlights: -15, splitTone: 30, toneShadow: '#5a3a2a', toneHigh: '#ffc46b', grain: 30, vignette: 18 } },
    portrait: { label: 'Portrait 400', f: { contrast: -8, saturation: -10, warmth: 12, tint: 6, fade: 18, shadows: 20, highlights: -20, splitTone: 25, toneShadow: '#3d6a6e', toneHigh: '#ffcfa8', grain: 25 } },
    vivid100: { label: 'Vivid 100', f: { contrast: 18, saturation: 30, vibrance: 20, warmth: 6, sharpen: 30, grain: 12 } },
    green400: { label: 'Green 400', f: { tint: -14, warmth: -4, contrast: 10, saturation: 8, splitTone: 35, toneShadow: '#1f6b5a', toneHigh: '#f3e6c0', fade: 12, grain: 35 } },
    tungsten: { label: 'Tungsten 800', f: { warmth: -24, tint: 4, contrast: 12, halation: 70, shadows: 10, splitTone: 30, toneShadow: '#14425a', toneHigh: '#ffd2a0', grain: 40 } },
    slide: { label: 'Slide 50', f: { contrast: 28, saturation: 38, vibrance: 15, blacks: -20, warmth: -4, tint: -6, vignette: 25 } },
    expired: { label: 'Expired', f: { fade: 35, tint: 22, warmth: 20, contrast: -14, saturation: -18, splitTone: 40, toneShadow: '#5b2d6b', toneHigh: '#ffe08a', grain: 55, dust: 35, vignette: 30 } },
    disposable: { label: 'Disposable', f: { contrast: 22, saturation: 10, tint: -10, warmth: 10, vignette: 45, chroma: 40, grain: 45, highlights: 15, sharpen: 20 } },
    instant: { label: 'Instant', f: { fade: 28, contrast: -12, saturation: -15, warmth: 14, tint: 10, highlights: -25, splitTone: 35, toneShadow: '#2d5d7a', toneHigh: '#ffe6b3', bloom: 25, vignette: 22 } },
    super8: { label: 'Super 8', f: { warmth: 26, fade: 22, contrast: 10, saturation: -6, bloom: 30, blur: 0.6, vignette: 50, grain: 60, grainSize: 40, chroma: 25, halation: 30 } },
    cinema: { label: 'Cinema', f: { splitTone: 70, toneShadow: '#0e6b7a', toneHigh: '#ffa155', contrast: 16, saturation: 6, shadows: 8, vignette: 20, grain: 20 } },
    twostrip: { label: 'Two-strip', f: { saturation: -35, splitTone: 90, toneShadow: '#0f7a86', toneHigh: '#ff6a3d', contrast: 14, grain: 25 } },
    crossp: { label: 'Cross process', f: { cross: 80, saturation: 20, contrast: 6, grain: 20 } },
    bleach: { label: 'Bleach bypass', f: { saturation: -55, contrast: 40, clarity: 40, blacks: -10, sharpen: 25, grain: 25 } },
    overexposed: { label: 'Overexposed', f: { exposure: 25, highlights: -30, fade: 15, saturation: -10, warmth: 10, contrast: -10, bloom: 40, grain: 30 } },
    pushed: { label: 'Pushed', f: { exposure: -12, contrast: 25, shadows: -10, grain: 70, grainSize: 30, saturation: -10, vignette: 25 } },
    lightleak: { label: 'Light leak', f: { warmth: 16, fade: 16, contrast: 4, leak: 70, grain: 35, vignette: 20 } },
    pan400: { label: 'Pan 400', f: { grayscale: 100, contrast: 30, clarity: 25, grain: 55, blacks: -10, vignette: 20 } },
    softbw: { label: 'Soft B&W', f: { grayscale: 100, contrast: 6, fade: 20, grain: 40, bloom: 20 } },
    negative: { label: 'Negative', f: { negative: 100, contrast: -10, grain: 25 } },
  };
  // preset shelves in the inspector
  R.FILTER_GROUPS = {
    film: { label: 'Film', keys: ['film', 'gold', 'portrait', 'vivid100', 'green400', 'tungsten', 'halation', 'slide', 'expired', 'disposable', 'instant', 'super8', 'cinema', 'twostrip', 'crossp', 'bleach', 'overexposed', 'pushed', 'lightleak', 'negative', 'vintage'] },
    colour: { label: 'Colour', keys: ['original', 'vivid', 'warm', 'cool', 'fade', 'dreamy', 'punch'] },
    mono: { label: 'B&W', keys: ['bw', 'pan400', 'softbw', 'noir', 'sepia', 'xerox'] },
    print: { label: 'Print', keys: ['halftone', 'halftoneFine', 'duoBlue', 'duoPink', 'duoDots', 'photocopy', 'riso'] },
    fx: { label: 'Effects', keys: ['motion', 'grit', 'ghost', 'noisy', 'haze', 'zoomburst', 'spin', 'tilt', 'double', 'fisheye', 'lens'] },
  };
  const FILTER_KEYS = ['brightness', 'contrast', 'saturation', 'warmth', 'fade', 'grayscale', 'sepia', 'halftone', 'threshold', 'duotone', 'noise', 'motion', 'motionAngle', 'fisheye',
    'zoomBlur', 'spinBlur', 'tiltShift', 'ghost', 'blurX', 'blurY', 'tiltY', 'tiltSize', 'halation',
    'highlights', 'shadows', 'tint', 'vibrance', 'hue', 'sharpen', 'clarity', 'bloom', 'chroma', 'splitTone', 'exposure', 'blacks', 'cross', 'negative'];
  const filterCache = new LRU(40);
  function hexRgb(c) { const v = rgba(c).match(/[\d.]+/g).map(Number); return v; }
  const vidFilterCache = new Map();
  function filteredSource(id, img, f) {
    if (!f || !(FILTER_KEYS.some(k => f[k]) || (f.blur && f.blurArea && f.blurArea !== 'all'))) return img;
    const spots = f.blurArea && f.blurArea !== 'all' && (f.blurPts || []).length ? f.blurArea : null;
    const isVid = (typeof HTMLVideoElement !== 'undefined' && img instanceof HTMLVideoElement) || !!img._interp;
    const key = id + '|' + FILTER_KEYS.map(k => f[k] || 0).join(',') + '|' + (f.duotone || f.threshold || f.halftone ? (f.duoDark || '') + (f.duoLight || '') : '') +
      (f.splitTone ? (f.toneShadow || '') + (f.toneHigh || '') + (f.toneBalance || 0) : '') + (f.halation ? f.halColor || '' : '') +
      (spots ? '|' + spots + JSON.stringify(f.blurPts) + (f.blurFeather ?? 60) + '|' + (f.blur || 0) : '') + (isVid ? '@' + (img._interp ? img._stamp : img.currentTime.toFixed(3)) : '');
    // video frames change constantly: keep only the latest filtered frame per video
    // mid-seek, currentTime already shows the new time but the pixels are still the old frame
    if (isVid && img.seeking) { const prev = vidFilterCache.get(id); if (prev) return prev.out; }
    const hit = isVid ? ((vidFilterCache.get(id) || {}).key === key ? vidFilterCache.get(id).out : null) : filterCache.get(key);
    if (hit) return hit;
    // video frames are graded smaller: 1280 px for export, 720 px while previewing so playback keeps up
    // very large photos are graded at up to 4096 px (more than any canvas size needs, and quick enough to adjust)
    const ds = Math.min(1, (isVid ? (R.playing ? 720 : 1280) : 4096) / Math.max(iwOf(img), ihOf(img)));
    const c = canvas(Math.max(1, Math.round(iwOf(img) * ds)), Math.max(1, Math.round(ihOf(img) * ds))), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, c.width, c.height);
    let d;
    try { d = x.getImageData(0, 0, c.width, c.height); } catch (e) { return img; }
    const a = d.data;
    const br = (1 + (f.brightness || 0) / 100) * Math.pow(2, (f.exposure || 0) / 50);
    const cv = (f.contrast || 0) * 2.55, cf = (259 * (cv + 255)) / (255 * (259 - cv));
    const sat = 1 + (f.saturation || 0) / 100;
    const wa = (f.warmth || 0) * 0.35;
    const fade = (f.fade || 0) / 100 * 0.32;
    const gs = (f.grayscale || 0) / 100, sp = (f.sepia || 0) / 100;
    // two-tone mapping (duotone and photocopy threshold) paints luminance between an ink and a paper colour
    const twoTone = f.duotone || f.threshold;
    const dk = twoTone ? hexRgb(f.duoDark || '#111111') : null, lt = twoTone ? hexRgb(f.duoLight || '#f4f1ea') : null;
    const thr = (f.threshold || 0) / 100 * 255;
    const tone = f.halftone ? new Float32Array(a.length / 4) : null;
    // luminance noise is baked into the pixels, so it stays fine-grained at any size
    const nz = (f.noise || 0) / 100 * 120;
    // tone and colour grading: highlights / shadows / blacks, tint, vibrance, hue, split toning, cross-processing
    const hl = (f.highlights || 0) / 100, shd = (f.shadows || 0) / 100, blk = (f.blacks || 0) / 100;
    const tn = (f.tint || 0) / 100 * 30, vib = (f.vibrance || 0) / 100;
    const hue = (f.hue || 0) * Math.PI / 180, hc = Math.cos(hue), hs = Math.sin(hue);
    const HM = hue ? [0.213 + 0.787 * hc - 0.213 * hs, 0.715 - 0.715 * hc - 0.715 * hs, 0.072 - 0.072 * hc + 0.928 * hs,
      0.213 - 0.213 * hc + 0.143 * hs, 0.715 + 0.285 * hc + 0.140 * hs, 0.072 - 0.072 * hc - 0.283 * hs,
      0.213 - 0.213 * hc - 0.787 * hs, 0.715 - 0.715 * hc + 0.715 * hs, 0.072 + 0.928 * hc + 0.072 * hs] : null;
    const st = (f.splitTone || 0) / 100;
    // only the hue of each tone colour is used (its own brightness taken out), so toning never darkens or washes out
    const hueOnly = c => { const v = hexRgb(c), L = 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]; return [v[0] - L, v[1] - L, v[2] - L]; };
    const tS = st ? hueOnly(f.toneShadow || '#1d6f78') : null, tH = st ? hueOnly(f.toneHigh || '#ffa65c') : null;
    const tb = 0.5 + (f.toneBalance || 0) / 200;
    const xp = (f.cross || 0) / 100, ng = (f.negative || 0) / 100;
    let seed = 0x9e3779b9;
    for (let i = 0; i < a.length; i += 4) {
      let r = a[i] * br, g = a[i + 1] * br, b = a[i + 2] * br;
      r = cf * (r - 128) + 128; g = cf * (g - 128) + 128; b = cf * (b - 128) + 128;
      if (hl || shd || blk) {
        // shadows lift the darks and highlights pull the brights, leaving pure black and white where they are
        const L = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0, 1), iL = 1 - L;
        const add = shd * L * iL * iL * 4 * 70 + hl * L * L * iL * 6.75 * 60 + blk * iL * iL * iL * 60;
        r += add; g += add; b += add;
      }
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
      if (vib) {
        // vibrance boosts the muted colours most and leaves already-strong ones (and skin) gentler
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), k = 1 + vib * (1 - clamp((mx - mn) / 255, 0, 1)) * 1.3;
        r = l + (r - l) * k; g = l + (g - l) * k; b = l + (b - l) * k;
      }
      if (HM) { const r0 = r, g0 = g, b0 = b; r = r0 * HM[0] + g0 * HM[1] + b0 * HM[2]; g = r0 * HM[3] + g0 * HM[4] + b0 * HM[5]; b = r0 * HM[6] + g0 * HM[7] + b0 * HM[8]; }
      r += wa; b -= wa; g += wa * 0.15;
      if (tn) { r += tn * 0.5; g -= tn; b += tn * 0.5; }
      if (xp) {
        // cross-processed slide film: punchy S-curve in red and green, blues lifted in the shadows and crushed in the highlights
        const sc = v => { const x = clamp(v / 255, 0, 1); return 255 * (x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x)); };
        r += (sc(r) - r) * xp * 0.8; g += (sc(g) * 1.04 - g) * xp * 0.6; b += ((b * 0.78 + 26) - b) * xp;
      }
      if (st) {
        // split toning: one colour washed into the shadows, another into the highlights
        const L = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0, 1);
        const a1 = clamp((tb - L) / tb, 0, 1), a2 = clamp((L - tb) / (1 - tb), 0, 1);
        const ws = a1 * (2 - a1) * st * 0.75, wh = a2 * (2 - a2) * st * 0.65;
        r += tS[0] * ws + tH[0] * wh; g += tS[1] * ws + tH[1] * wh; b += tS[2] * ws + tH[2] * wh;
      }
      if (gs) { const L2 = 0.299 * r + 0.587 * g + 0.114 * b; r += (L2 - r) * gs; g += (L2 - g) * gs; b += (L2 - b) * gs; }
      if (sp) {
        const sr = r * 0.393 + g * 0.769 + b * 0.189, sg = r * 0.349 + g * 0.686 + b * 0.168, sb = r * 0.272 + g * 0.534 + b * 0.131;
        r += (sr - r) * sp; g += (sg - g) * sp; b += (sb - b) * sp;
      }
      if (ng) {
        // a colour negative: tones flipped, sitting on the film's orange base
        r += (255 - 2 * r) * ng; g += (255 - 2 * g) * ng; b += (255 - 2 * b) * ng;
        r = r * (1 - 0.12 * ng) + 40 * ng; g = g * (1 - 0.3 * ng) + 12 * ng; b = b * (1 - 0.55 * ng);
      }
      if (fade) { r = r * (1 - fade) + 255 * fade * 0.42; g = g * (1 - fade) + 255 * fade * 0.4; b = b * (1 - fade) + 255 * fade * 0.38; }
      if (tone) tone[i >> 2] = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0, 1);
      if (twoTone) {
        let t = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0, 1);
        if (f.threshold) t = t * 255 > thr ? 1 : 0;
        r = dk[0] + (lt[0] - dk[0]) * t; g = dk[1] + (lt[1] - dk[1]) * t; b = dk[2] + (lt[2] - dk[2]) * t;
      }
      if (nz) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        const n = ((seed >>> 0) / 4294967296 - 0.5) * nz;
        r += n; g += n; b += n;
      }
      a[i] = r; a[i + 1] = g; a[i + 2] = b;
    }
    x.putImageData(d, 0, 0);
    let out = c;
    if (f.halftone) out = halftone(c, tone, f);
    if (f.sharpen || f.clarity) out = unsharp(out, f.sharpen || 0, f.clarity || 0);
    if (f.bloom) out = bloom(out, f.bloom);
    if (f.halation) out = halation(out, f.halation, f.halColor);
    if (f.chroma) out = chromaAb(out, f.chroma);
    const sharp = out;
    if (f.motion) out = motionBlur(out, f.motion, f.motionAngle || 0);
    if (f.ghost) out = ghostBlur(out, f.ghost, f.motionAngle || 0);
    if (f.zoomBlur) out = radialBlur(out, f.zoomBlur, f.blurX ?? 0.5, f.blurY ?? 0.5, 'zoom');
    if (f.spinBlur) out = radialBlur(out, f.spinBlur, f.blurX ?? 0.5, f.blurY ?? 0.5, 'spin');
    if (f.tiltShift) out = tiltShift(out, f.tiltShift, f.tiltY ?? 0.5, f.tiltSize ?? 0.25);
    if (spots) {
      // soft blur is normally applied while drawing; bake it here so it can be masked too
      if (f.blur) { const b = canvas(out.width, out.height), bx = b.getContext('2d'); bx.filter = `blur(${f.blur * Math.max(out.width, out.height) / 1000}px)`; bx.drawImage(out, 0, 0); out = b; }
      if (out !== sharp) out = blurSpots(sharp, out, f.blurPts, spots === 'sharp', (f.blurFeather ?? 60) / 100);
    }
    if (f.fisheye) out = barrel(out, f.fisheye);
    if (isVid) { if (!img.seeking) vidFilterCache.set(id, { key, out }); } else filterCache.set(key, out);
    return out;
  }
  // halation: on film, bright light bleeds through the emulsion as a red-orange glow around highlights
  function halation(src, amt, color) {
    const hc = color ? hexRgb(color) : [255, 72, 30];
    const w = src.width, h = src.height, k = clamp(amt / 100, 0, 1);
    // work at up to ~800px so even small lights survive into the glow
    const sc = Math.min(1, 800 / Math.max(w, h)), sw = Math.max(1, Math.round(w * sc)), sh = Math.max(1, Math.round(h * sc));
    const small = canvas(sw, sh), sx = small.getContext('2d', { willReadFrequently: true });
    sx.drawImage(src, 0, 0, sw, sh);
    let d;
    try { d = sx.getImageData(0, 0, sw, sh); } catch (e) { return src; }
    const a = d.data, thr = 255 * (0.72 - k * 0.2);
    for (let i = 0; i < a.length; i += 4) {
      const l = Math.max(a[i], a[i + 1], a[i + 2]) * 0.6 + (0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]) * 0.4;
      const v = Math.pow(clamp((l - thr) / (255 - thr), 0, 1), 0.8);
      a[i] = hc[0] * v; a[i + 1] = hc[1] * v; a[i + 2] = hc[2] * v; a[i + 3] = 255;
    }
    sx.putImageData(d, 0, 0);
    // blur the highlight mask into a tight red halo and a wider bloom, boosting each so small lights still glow
    const halo = (radius, gain) => {
      const g = canvas(w, h), gx = g.getContext('2d');
      gx.filter = `blur(${radius}px)`;
      gx.drawImage(small, 0, 0, w, h);
      gx.filter = 'none';
      gx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < gain; i++) gx.drawImage(g, 0, 0);
      return g;
    };
    const m = Math.max(w, h);
    const out = canvas(w, h), x = out.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'screen';
    x.globalAlpha = 0.45 + k * 0.55;
    x.drawImage(halo(m * (0.003 + k * 0.007), 2 + Math.round(k * 2)), 0, 0);
    x.globalAlpha = 0.35 + k * 0.4;
    x.drawImage(halo(m * (0.012 + k * 0.02), 2 + Math.round(k * 3)), 0, 0);
    return out;
  }
  // bloom: highlights glow softly in their own colour, like a diffusion filter on the lens
  function bloom(src, amt) {
    const w = src.width, h = src.height, k = clamp(amt / 100, 0, 1);
    const sc = Math.min(1, 640 / Math.max(w, h)), sw = Math.max(1, Math.round(w * sc)), sh = Math.max(1, Math.round(h * sc));
    const small = canvas(sw, sh), sx = small.getContext('2d', { willReadFrequently: true });
    sx.drawImage(src, 0, 0, sw, sh);
    let d;
    try { d = sx.getImageData(0, 0, sw, sh); } catch (e) { return src; }
    const a = d.data, thr = 255 * (0.62 - k * 0.22);
    for (let i = 0; i < a.length; i += 4) {
      const l = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2];
      const v = clamp((l - thr) / (255 - thr), 0, 1);
      a[i] *= v; a[i + 1] *= v; a[i + 2] *= v; a[i + 3] = 255;
    }
    sx.putImageData(d, 0, 0);
    const m = Math.max(w, h), g = canvas(w, h), gx = g.getContext('2d');
    gx.filter = `blur(${m * (0.012 + k * 0.025)}px)`;
    gx.drawImage(small, 0, 0, w, h);
    gx.filter = 'none';
    const out = canvas(w, h), x = out.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'screen';
    x.globalAlpha = 0.5 + k * 0.5;
    x.drawImage(g, 0, 0);
    if (k > 0.5) { x.globalAlpha = (k - 0.5) * 1.2; x.drawImage(g, 0, 0); }
    x.globalCompositeOperation = 'destination-in'; x.globalAlpha = 1; x.drawImage(src, 0, 0);
    return out;
  }
  // sharpen (fine detail) and clarity (midtone punch) are both unsharp masks: the photo pushed away from a blurred copy
  function unsharp(src, sharpen, clarity) {
    const w = src.width, h = src.height, m = Math.max(w, h);
    const sx = canvas(w, h).getContext('2d', { willReadFrequently: true });
    sx.drawImage(src, 0, 0);
    let D;
    try { D = sx.getImageData(0, 0, w, h); } catch (e) { return src; }
    const blurred = r => { const c = canvas(w, h).getContext('2d', { willReadFrequently: true }); c.filter = `blur(${r}px)`; c.drawImage(src, 0, 0); return c.getImageData(0, 0, w, h).data; };
    const a = D.data;
    if (sharpen) {
      const b = blurred(Math.max(0.8, m / 1100)), k = sharpen / 100 * 1.6;
      for (let i = 0; i < a.length; i += 4) for (let c = 0; c < 3; c++) a[i + c] = a[i + c] + (a[i + c] - b[i + c]) * k;
    }
    if (clarity) {
      const b = blurred(Math.max(2, m * 0.018)), k = clarity / 100 * (clarity > 0 ? 0.9 : 0.75);
      for (let i = 0; i < a.length; i += 4) {
        const L = (0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]) / 255, wm = 1 - Math.abs(2 * clamp(L, 0, 1) - 1) * 0.7;
        for (let c = 0; c < 3; c++) a[i + c] = a[i + c] + (a[i + c] - b[i + c]) * k * wm;
      }
    }
    const out = canvas(w, h);
    out.getContext('2d').putImageData(D, 0, 0);
    return out;
  }
  // chromatic aberration: red spreads out and blue pulls in toward the edges, like a cheap lens
  function chromaAb(src, amt) {
    const w = src.width, h = src.height, e = amt / 100 * 0.012;
    const out = canvas(w, h), x = out.getContext('2d');
    const ch = (col, k) => {
      const c = canvas(w, h), cx = c.getContext('2d');
      cx.drawImage(src, 0, 0);
      cx.globalCompositeOperation = 'multiply'; cx.fillStyle = col; cx.fillRect(0, 0, w, h);
      x.drawImage(c, -w * k / 2, -h * k / 2, w * (1 + k), h * (1 + k));
    };
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'lighter';
    ch('#ff0000', e); ch('#00ff00', e * 0.45); ch('#0000ff', 0);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0);
    return out;
  }
  // directional blur: the photo averaged with copies of itself slid along the angle
  function motionBlur(src, amt, angle) {
    const w = src.width, h = src.height;
    const L = Math.max(w, h) * amt / 100 * 0.09;
    const N = clamp(Math.round(L / 3), 6, 40);
    const o = canvas(w, h), x = o.getContext('2d');
    const a = angle * Math.PI / 180, dx = Math.cos(a) * L, dy = Math.sin(a) * L;
    x.drawImage(src, 0, 0);
    for (let i = 1; i < N; i++) {
      const t = i / (N - 1) - 0.5;
      x.globalAlpha = 1 / (i + 1); // running average keeps every copy equally weighted
      x.drawImage(src, dx * t, dy * t);
    }
    return o;
  }
  function motionBlurPx(src, L, angle) {
    const w = src.width, h = src.height, o = canvas(w, h), x = o.getContext('2d');
    const N = clamp(Math.round(L / 2.5), 4, 36), a = angle * Math.PI / 180, dx = Math.cos(a) * L, dy = Math.sin(a) * L;
    for (let i = 0; i < N; i++) { const t = i / (N - 1) - 0.5; x.globalAlpha = 1 / (i + 1); x.drawImage(src, dx * t, dy * t); }
    return o;
  }
  // blur only around chosen spots (or everywhere except them), with soft edges
  function blurSpots(sharp, blurred, pts, invert, feather) {
    const w = sharp.width, h = sharp.height, M = Math.max(w, h);
    const mask = canvas(w, h), mx = mask.getContext('2d');
    const paint = () => {
      for (const p of pts) {
        const cx = p.x * w, cy = p.y * h, r = Math.max(2, (p.r || 0.12) * M);
        const g = mx.createRadialGradient(cx, cy, r * (1 - clamp(feather, 0, 0.98)), cx, cy, r);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        mx.fillStyle = g; mx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    };
    if (invert) { mx.fillStyle = '#000'; mx.fillRect(0, 0, w, h); mx.globalCompositeOperation = 'destination-out'; paint(); }
    else paint();
    // blurred × mask + sharp × (1 − mask): a true mix, so see-through layers don't show the sharp copy under the blur
    const o = canvas(w, h), x = o.getContext('2d');
    x.drawImage(blurred, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0);
    const k = canvas(w, h), kx = k.getContext('2d');
    kx.drawImage(sharp, 0, 0); kx.globalCompositeOperation = 'destination-out'; kx.drawImage(mask, 0, 0);
    x.globalCompositeOperation = 'lighter'; x.drawImage(k, 0, 0);
    return o;
  }
  // zoom blur streaks out from a centre point; spin blur swirls around it
  function radialBlur(src, amt, cx, cy, kind) {
    const w = src.width, h = src.height, o = canvas(w, h), x = o.getContext('2d');
    const px = cx * w, py = cy * h, a = amt / 100;
    const N = clamp(Math.round(10 + a * 26), 8, 36);
    x.drawImage(src, 0, 0);
    for (let i = 1; i < N; i++) {
      const t = i / (N - 1);
      x.save(); x.globalAlpha = 1 / (i + 1);
      x.translate(px, py);
      if (kind === 'zoom') { const k = 1 + a * 0.32 * t; x.scale(k, k); }
      else x.rotate((t - 0.5) * a * 0.22);
      x.translate(-px, -py);
      x.drawImage(src, 0, 0);
      x.restore();
    }
    return o;
  }
  // tilt-shift: a sharp band across the photo, blurring away above and below
  function tiltShift(src, amt, cy, size) {
    const w = src.width, h = src.height, o = canvas(w, h), x = o.getContext('2d');
    x.filter = `blur(${Math.max(1, amt / 100 * Math.max(w, h) * 0.018)}px)`;
    x.drawImage(src, 0, 0); x.filter = 'none';
    const sharp = canvas(w, h), sx = sharp.getContext('2d');
    sx.drawImage(src, 0, 0);
    sx.globalCompositeOperation = 'destination-in';
    const g = sx.createLinearGradient(0, 0, 0, h), c = clamp(cy, 0, 1), half = clamp(size, 0.02, 1) / 2, soft = 0.12;
    const st = (p, al) => g.addColorStop(clamp(p, 0, 1), `rgba(0,0,0,${al})`);
    st(0, c - half - soft <= 0 ? 1 : 0); st(c - half - soft, 0); st(c - half, 1); st(c + half, 1); st(c + half + soft, 0); st(1, c + half + soft >= 1 ? 1 : 0);
    sx.fillStyle = g; sx.fillRect(0, 0, w, h);
    x.drawImage(sharp, 0, 0);
    return o;
  }
  // double exposure: a faint second copy slid along the direction
  function ghostBlur(src, amt, angle) {
    const w = src.width, h = src.height, o = canvas(w, h), x = o.getContext('2d');
    const L = Math.max(w, h) * amt / 100 * 0.12, a = angle * Math.PI / 180;
    x.drawImage(src, 0, 0);
    x.globalAlpha = 0.42; x.drawImage(src, Math.cos(a) * L, Math.sin(a) * L);
    x.globalAlpha = 0.2; x.drawImage(src, Math.cos(a) * L * 2, Math.sin(a) * L * 2);
    return o;
  }
  /* canvas blur (doc.blur): one of the photo blurs over the whole finished frame, same keys as filters / tblur */
  const frameBlurOn = doc => { const f = doc && doc.blur; return !!(f && ['motion', 'ghost', 'zoomBlur', 'spinBlur', 'tiltShift', 'blur'].some(k => f[k] > 0)); };
  R.hasFrameBlur = frameBlurOn;
  function frameBlur(src, f) {
    const M = Math.max(src.width, src.height);
    let out = src;
    if (f.motion) out = motionBlur(out, f.motion, f.motionAngle || 0);
    if (f.ghost) out = ghostBlur(out, f.ghost, f.motionAngle || 0);
    if (f.zoomBlur) out = radialBlur(out, f.zoomBlur, f.blurX ?? 0.5, f.blurY ?? 0.5, 'zoom');
    if (f.spinBlur) out = radialBlur(out, f.spinBlur, f.blurX ?? 0.5, f.blurY ?? 0.5, 'spin');
    if (f.tiltShift) out = tiltShift(out, f.tiltShift, f.tiltY ?? 0.5, f.tiltSize ?? 0.25);
    if (f.blur) {
      const o = canvas(src.width, src.height), x = o.getContext('2d');
      if ('filter' in x) { x.filter = `blur(${f.blur * M / 1000}px)`; x.drawImage(out, 0, 0); out = o; }
    }
    const pts = f.blurPts || [];
    if (f.blurArea && f.blurArea !== 'all' && pts.length && out !== src) out = blurSpots(src, out, pts, f.blurArea === 'sharp', (f.blurFeather ?? 60) / 100);
    return out;
  }
  // the editor's version: blur the canvas region the artboard covers on the layer's own canvas (worked out at ≤ 1200 px)
  let fbBuf = null;
  R.frameBlurCtx = function (ctx, doc) {
    const hunting = R.playTime != null && doc.camera && doc.camera.hunt > 0;
    if (styleOn(doc.sfx)) frameStyleCtx(ctx, doc, frameBlurOn(doc) || hunting);
    else if (!frameBlurOn(doc) && !hunting) return;
    else frameBlurOnly(ctx, doc, hunting);
  };
  function frameBlurOnly(ctx, doc, hunting) {
    const c = ctx.canvas, T = ctx.getTransform();
    const x0 = T.e, y0 = T.f, w = doc.width * T.a, h = doc.height * T.d;
    if (!(w > 2 && h > 2)) return;
    const k = Math.min(1, 1200 / Math.max(w, h)), bw = Math.max(2, Math.round(w * k)), bh = Math.max(2, Math.round(h * k));
    if (!fbBuf || fbBuf.width !== bw || fbBuf.height !== bh) fbBuf = canvas(bw, bh);
    const bx = fbBuf.getContext('2d');
    bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, bw, bh);
    bx.drawImage(c, x0, y0, w, h, 0, 0, bw, bh);
    let out = frameBlurOn(doc) ? frameBlur(fbBuf, doc.blur) : fbBuf;
    const hb = hunting ? R.huntBlurPx(doc, R.playTime, bw) : 0;
    if (hb > 0.3) { const o = canvas(bw, bh), ox = o.getContext('2d'); ox.filter = `blur(${hb}px)`; ox.drawImage(out, 0, 0); out = o; }
    else if (out === fbBuf && !frameBlurOn(doc)) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    // over a see-through canvas the blurred frame replaces the sharp one; otherwise it lands on top so the edges stay filled
    if (R.isClearBg(doc)) ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(out, x0, y0, w, h);
    ctx.restore();
  }
  // the canvas style in the editor: read the artboard back (≤ 900 px), blur it if asked, restyle it, draw it over.
  // The result is reused while the artboard's pixels, the settings and the time stay the same.
  let fsBuf = null, fsLast = null;
  function frameStyleCtx(ctx, doc, blurToo) {
    const c = ctx.canvas, T = ctx.getTransform();
    const x0 = T.e, y0 = T.f, w = doc.width * T.a, h = doc.height * T.d;
    if (!(w > 2 && h > 2)) return;
    const k = Math.min(1, (R.playing ? 560 : 900) / Math.max(w, h)), bw = Math.max(2, Math.round(w * k)), bh = Math.max(2, Math.round(h * k));
    if (!fsBuf || fsBuf.width !== bw || fsBuf.height !== bh) fsBuf = canvas(bw, bh);
    const bx = fsBuf.getContext('2d', { willReadFrequently: true });
    bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, bw, bh);
    bx.drawImage(c, x0, y0, w, h, 0, 0, bw, bh);
    let src = fsBuf;
    if (blurToo) {
      if (frameBlurOn(doc)) src = frameBlur(src, doc.blur);
      const hb = R.playTime != null && doc.camera && doc.camera.hunt > 0 ? R.huntBlurPx(doc, R.playTime, bw) : 0;
      if (hb > 0.3) { const o = canvas(bw, bh), ox = o.getContext('2d'); ox.filter = `blur(${hb}px)`; ox.drawImage(src, 0, 0); src = o; }
    }
    // a cheap fingerprint of the frame: a coarse grid of samples
    const mv = window.StudioStyles.moves(doc.sfx), probe = bx.getImageData(0, 0, bw, bh).data;
    let fp = 0; for (let i = 0; i < probe.length; i += 4 * 97) fp = (fp * 31 + probe[i] + probe[i + 1] * 3 + probe[i + 2] * 7 + probe[i + 3] * 11) | 0;
    const key = fp + '|' + bw + 'x' + bh + '|' + JSON.stringify(doc.sfx) + '|' + (mv ? R.playTime : '') + '|' + (blurToo ? JSON.stringify(doc.blur) + R.playTime : '');
    let out;
    if (fsLast && fsLast.key === key) out = fsLast.out;
    else { out = window.StudioStyles.apply(src, doc.sfx, { t: R.playTime, mask: R.isClearBg(doc) }); fsLast = { key, out }; }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(out, x0, y0, w, h);
    ctx.restore();
  }
  // barrel distortion: the centre swells, edges bow out and the corners fall away
  function barrel(src, amt) {
    const w = src.width, h = src.height;
    const sc = canvas(w, h).getContext('2d', { willReadFrequently: true });
    sc.drawImage(src, 0, 0);
    let si;
    try { si = sc.getImageData(0, 0, w, h); } catch (e) { return src; }
    const sd = si.data, o = canvas(w, h), ox = o.getContext('2d'), od = ox.createImageData(w, h), dd = od.data;
    const k = amt / 100 * 0.6;
    for (let y = 0; y < h; y++) {
      const ny = (y + 0.5) / h * 2 - 1;
      for (let x = 0; x < w; x++) {
        const nx = (x + 0.5) / w * 2 - 1;
        const f = 1 + k * (nx * nx + ny * ny - 1);
        const fx = (nx * f + 1) / 2 * w - 0.5, fy = (ny * f + 1) / 2 * h - 0.5;
        if (fx < -0.5 || fy < -0.5 || fx > w - 0.5 || fy > h - 0.5) continue;
        const x0 = Math.max(0, Math.floor(fx)), y0 = Math.max(0, Math.floor(fy));
        const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
        const tx = clamp(fx - x0, 0, 1), ty = clamp(fy - y0, 0, 1);
        const i00 = (y0 * w + x0) * 4, i10 = (y0 * w + x1) * 4, i01 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4;
        const di = (y * w + x) * 4;
        for (let c = 0; c < 4; c++) {
          const top = sd[i00 + c] + (sd[i10 + c] - sd[i00 + c]) * tx, bot = sd[i01 + c] + (sd[i11 + c] - sd[i01 + c]) * tx;
          dd[di + c] = top + (bot - top) * ty;
        }
      }
    }
    ox.putImageData(od, 0, 0);
    return o;
  }
  // print-style dot screen: one dot per cell, sized by how dark the cell is
  function halftone(src, tone, f) {
    const w = src.width, h = src.height;
    const cell = Math.max(3, Math.round(Math.max(w, h) * (0.004 + f.halftone / 100 * 0.022)));
    const ink = f.duotone ? f.duoDark || '#111' : '#111111', paper = f.duotone ? f.duoLight || '#f4f1ea' : '#f4f1ea';
    const o = canvas(w, h), x = o.getContext('2d');
    x.fillStyle = paper; x.fillRect(0, 0, w, h);
    x.fillStyle = ink;
    const p = new Path2D();
    for (let row = 0, y = cell / 2; y < h + cell; y += cell * 0.866, row++) {
      for (let cx0 = (row % 2) * cell / 2; cx0 < w + cell; cx0 += cell) {
        const sx = Math.min(w - 1, Math.max(0, cx0 | 0)), sy = Math.min(h - 1, Math.max(0, y | 0));
        const dark = 1 - tone[sy * w + sx];
        const r = cell * 0.56 * Math.sqrt(dark);  // dot area tracks darkness
        if (r > 0.35) { p.moveTo(cx0 + r, y); p.arc(cx0, y, r, 0, TAU); }
      }
    }
    x.fill(p);
    // keep the photo's transparency (cut-outs stay cut out)
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(src, 0, 0);
    return o;
  }

  R.FRAMES = {
    none: 'None', rounded: 'Rounded', circle: 'Circle', arch: 'Arch', polaroid: 'Polaroid', stamp: 'Stamp',
    film: 'Film', torn: 'Torn paper', papercut: 'Paper cut', border: 'Border', blob: 'Blob', heart: 'Heart', star: 'Star',
    scallop: 'Scallop', flower: 'Flower', ticket: 'Ticket', squircle: 'Squircle', sparkle: 'Sparkle', sticky: 'Sticky note',
    gate: 'Film gate', scan: 'Negative scan', slide: 'Slide mount', filed: 'Filed edge',
    strips: 'Shredded strips', mosaic: 'Mosaic grid', mirror: 'Mirror repeat',
  };
  function frameGeometry(el) {
    const w = el.width, h = el.height, f = el.frame || {};
    const style = f.style || 'none';
    const size = f.size ?? Math.min(w, h) * 0.05;
    const full = { x: 0, y: 0, w, h };
    const g = { outer: null, inner: null, rect: full, stroke: null, extra: null };
    const inset = (l, t, r, b) => ({ x: l, y: t, w: w - l - r, h: h - t - b });
    switch (style) {
      case 'none': g.inner = rrect(new Path2D(), 0, 0, w, h, f.radius || 0); break;
      case 'rounded': g.inner = rrect(new Path2D(), 0, 0, w, h, f.radius ?? Math.min(w, h) * 0.08); if (f.size) g.stroke = { path: g.inner, w: size }; break;
      case 'border':
        g.outer = rrect(new Path2D(), 0, 0, w, h, f.radius || 0);
        g.rect = inset(size, size, size, size);
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, Math.max(0, (f.radius || 0) - size));
        break;
      case 'polaroid':
        g.outer = rrect(new Path2D(), 0, 0, w, h, f.radius ?? 2);
        g.rect = inset(size, size, size, size * (f.bottom ?? 3.6));
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, 0);
        break;
      case 'stamp': {
        const rh = Math.max(3, Math.min(w, h) * 0.028);
        g.outer = stampPath(w, h, rh);
        const s2 = Math.max(size, rh * 2.2);
        g.rect = inset(s2, s2, s2, s2);
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, 0);
        break;
      }
      case 'film': {
        const bw = Math.max(size, Math.min(w, h) * 0.09);
        g.outer = rrect(new Path2D(), 0, 0, w, h, 2);
        g.rect = inset(size * 0.6, bw, size * 0.6, bw);
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, 3);
        g.extra = ctx => {
          const hw = bw * 0.36, hh = bw * 0.42, n = Math.max(4, Math.round(w / (hw * 2.4)));
          ctx.fillStyle = 'rgba(250,246,238,.92)';
          for (let i = 0; i < n; i++) {
            const x = (w / n) * (i + 0.5) - hw / 2;
            ctx.fill(rrect(new Path2D(), x, (bw - hh) / 2, hw, hh, hw * 0.2));
            ctx.fill(rrect(new Path2D(), x, h - bw + (bw - hh) / 2, hw, hh, hw * 0.2));
          }
        };
        break;
      }
      case 'gate': {
        // a projected film frame: dark gate around the picture, rounded corners, soft burnt-in edge
        const m = Math.min(w, h), bw = Math.max(2, size);
        g.outer = rrect(new Path2D(), 0, 0, w, h, f.radius ?? 0);
        g.rect = inset(bw, bw, bw, bw);
        const rad = Math.min(g.rect.w, g.rect.h) * 0.06 + (f.round ?? 0) * m * 0.001;
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, rad);
        const soft = Math.max(1, (f.soft ?? 40) / 100 * m * 0.05);
        g.extra = ctx => {
          ctx.save();
          ctx.strokeStyle = f.color || '#0b0b0b';
          // a crisp core straddling the cut (outside the clip) so no light leaks along the edge
          ctx.lineWidth = Math.max(3, soft * 0.8);
          ctx.stroke(g.inner);
          ctx.clip(g.inner);
          ctx.lineWidth = soft * 2.4;
          if ('filter' in ctx) ctx.filter = `blur(${soft * 0.7 * deviceScale(ctx)}px)`;
          ctx.stroke(g.inner);
          // the gate's edge is never perfectly even: a slightly darker band hugs the top and bottom
          ctx.lineWidth = soft * 1.2;
          ctx.globalAlpha *= 0.5;
          ctx.stroke(g.inner);
          ctx.restore();
        };
        break;
      }
      case 'scan': {
        // a 35mm negative scanned with its rebate: edge print, lit sprocket holes, then the picture
        const m = Math.min(w, h), rb = Math.max(size * 2.6, m * 0.1), sd = Math.max(2, size * 0.6);
        g.outer = rrect(new Path2D(), 0, 0, w, h, 0);
        g.rect = inset(sd, rb, sd, rb);
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, m * 0.006);
        g.extra = ctx => {
          ctx.save();
          const hh = rb * 0.4, hw = hh * 0.74, pitch = hw * 1.9, n = Math.max(2, Math.floor(w / pitch));
          const off = (w - n * pitch) / 2 + (pitch - hw) / 2, hy = rb * 0.3;
          ctx.fillStyle = f.holeColor || '#f4efe4';
          for (let i = 0; i < n; i++) for (const y of [hy, h - hy - hh]) ctx.fill(rrect(new Path2D(), off + i * pitch, y, hw, hh, hw * 0.2));
          const fs = rb * 0.19, mono = `"Space Mono", ui-monospace, Menlo, monospace`;
          ctx.fillStyle = f.textColor || '#f2a33a';
          ctx.textBaseline = 'middle';
          if ('letterSpacing' in ctx) ctx.letterSpacing = fs * 0.12 + 'px';
          ctx.font = `700 ${fs}px ${mono}`;
          const label = (f.label ?? 'FILM 400').toUpperCase(), num = f.num ?? 14;
          for (let x = w * 0.04; x < w - fs * 4; x += w * 0.5) ctx.fillText(label, x, hy * 0.5);
          ctx.fillText(String(num), w * 0.05, h - hy * 0.5);
          ctx.fillText('▸ ' + num + 'A', w * 0.52, h - hy * 0.5);
          ctx.restore();
        };
        break;
      }
      case 'slide': {
        // a 35mm slide in its card mount: a thick border, a small window, a label printed on top
        const m = Math.min(w, h), mg = Math.max(size, m * 0.06);
        g.outer = rrect(new Path2D(), 0, 0, w, h, f.radius || m * 0.05);
        g.rect = inset(mg, mg, mg, mg);
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, m * 0.02);
        g.extra = ctx => {
          ctx.save();
          const b = m * 0.008, r = g.rect;
          // pressed bevel round the window, light from the top left
          ctx.lineWidth = b;
          ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.stroke(rrect(new Path2D(), r.x - b / 2, r.y - b / 2, r.w + b, r.h + b, m * 0.024));
          ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke(rrect(new Path2D(), r.x - b * 1.5, r.y - b * 1.5, r.w + b * 3, r.h + b * 3, m * 0.03));
          ctx.fillStyle = f.textColor || 'rgba(45,40,34,0.78)';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const fs = Math.min(mg * 0.24, m * 0.05);
          if ('letterSpacing' in ctx) ctx.letterSpacing = fs * 0.2 + 'px';
          ctx.font = `700 ${fs}px "Space Mono", ui-monospace, Menlo, monospace`;
          ctx.fillText((f.label ?? 'SUMMER · 1978').toUpperCase(), w / 2, mg / 2);
          ctx.font = `400 ${fs * 0.8}px "Space Mono", ui-monospace, Menlo, monospace`;
          ctx.fillText(String(f.num ?? 12).padStart(2, '0'), w / 2, h - mg / 2);
          ctx.restore();
        };
        break;
      }
      case 'filed': {
        // a filed-out negative carrier: the black edge printed around the picture, rough and uneven
        const m = Math.min(w, h), bw = Math.max(2, size), r0 = rng(hashStr(el.id || 'filed') + (f.seed || 0) * 977);
        const amp = m * 0.011 * (f.rough ?? 1);
        g.outer = rrect(new Path2D(), 0, 0, w, h, 0);
        g.rect = inset(bw, bw, bw, bw);
        const R0 = g.rect, pts = [];
        // each edge wanders on a few slow waves, with fine grit and the odd notch where the carrier was filed
        const edge = (x0, y0, x1, y1, nx, ny) => {
          const L = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(8, Math.round(L / (m * 0.01)));
          const ph = [r0() * TAU, r0() * TAU, r0() * TAU], notch = r0() < 0.8 ? r0() : -1, nw = 0.04 + r0() * 0.06;
          for (let i = 0; i < steps; i++) {
            const t = i / steps;
            let d = (Math.sin(t * 5 + ph[0]) * 0.45 + Math.sin(t * 13 + ph[1]) * 0.3 + Math.sin(t * 31 + ph[2]) * 0.15) * amp + (r0() - 0.5) * amp * 0.5;
            if (notch >= 0 && Math.abs(t - notch) < nw) d -= amp * 2.4 * Math.cos((t - notch) / nw * Math.PI / 2);
            pts.push([x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d]);
          }
        };
        edge(R0.x, R0.y, R0.x + R0.w, R0.y, 0, 1);
        edge(R0.x + R0.w, R0.y, R0.x + R0.w, R0.y + R0.h, -1, 0);
        edge(R0.x + R0.w, R0.y + R0.h, R0.x, R0.y + R0.h, 0, -1);
        edge(R0.x, R0.y + R0.h, R0.x, R0.y, 1, 0);
        g.inner = polyPath(pts);
        g.extra = ctx => {
          ctx.save(); ctx.clip(g.inner);
          ctx.strokeStyle = f.color || '#0b0b0b'; ctx.lineWidth = m * 0.012;
          if ('filter' in ctx) ctx.filter = `blur(${m * 0.004 * deviceScale(ctx)}px)`;
          ctx.globalAlpha *= 0.7; ctx.stroke(g.inner);
          ctx.restore();
        };
        break;
      }
      case 'strips': {
        // the photo cut into paper strips, each slid sideways and tilted a touch
        const n = clamp(Math.round(f.count || 6), 2, 30), gap = Math.max(0, size), amt = (f.amount ?? 50) / 100;
        const r0 = rng(hashStr(el.id || 'strips') + (f.seed || 0) * 977), bh = (h - gap * (n - 1)) / n;
        const bands = [];
        for (let i = 0; i < n; i++) bands.push({ y: i * (bh + gap), dx: (r0() - 0.5) * w * 0.16 * amt, rot: (r0() - 0.5) * 2.4 * amt });
        g.inner = rrect(new Path2D(), 0, 0, w, h, 0);
        g.paint = (ctx, draw) => {
          for (const b of bands) {
            ctx.save();
            ctx.translate(b.dx + w / 2, b.y + bh / 2); ctx.rotate(b.rot * Math.PI / 180); ctx.translate(-w / 2, -(b.y + bh / 2));
            ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = Math.max(2, bh * 0.12) * deviceScale(ctx); ctx.shadowOffsetY = bh * 0.05;
            ctx.fillStyle = f.color || '#ffffff'; ctx.fillRect(0, b.y, w, bh); ctx.restore();
            ctx.beginPath(); ctx.rect(0, b.y, w, bh); ctx.clip();
            ctx.translate(-b.dx, 0);
            draw({ x: 0, y: 0, w, h });
            ctx.restore();
          }
        };
        break;
      }
      case 'mosaic': {
        // the photo cut into a grid of tiles; a few are printed in a flat colour, a few slip out of line
        const n = clamp(Math.round(f.count || 5), 2, 16), gap = Math.max(0, size), amt = (f.amount ?? 50) / 100;
        const r0 = rng(hashStr(el.id || 'mosaic') + (f.seed || 0) * 977);
        const rows = Math.max(2, Math.round(n * h / w)), tw = (w - gap * (n - 1)) / n, th = (h - gap * (rows - 1)) / rows;
        const tints = f.tints || ['#f2d33c', '#d8312b', '#2b52c8'];
        const tiles = [];
        for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
          const roll = r0();
          tiles.push({ x: i * (tw + gap), y: j * (th + gap), tint: roll < 0.24 * amt ? tints[Math.floor(r0() * tints.length)] : null, dx: r0() < 0.12 * amt ? (r0() - 0.5) * tw * 0.3 : 0, dy: r0() < 0.12 * amt ? (r0() - 0.5) * th * 0.3 : 0 });
        }
        g.inner = rrect(new Path2D(), 0, 0, w, h, 0);
        g.paint = (ctx, draw) => {
          for (const t of tiles) {
            ctx.save();
            ctx.translate(t.dx, t.dy);
            ctx.beginPath(); ctx.rect(t.x, t.y, tw, th); ctx.clip();
            ctx.translate(-t.dx, -t.dy);
            draw({ x: 0, y: 0, w, h });
            if (t.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = t.tint; ctx.fillRect(t.x, t.y, tw, th); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= 0.25; ctx.fillRect(t.x, t.y, tw, th); }
            ctx.restore();
          }
        };
        break;
      }
      case 'mirror': {
        // the photo in the middle with mirrored, washed-out copies running off both sides
        const panel = clamp(1 - (f.amount ?? 50) / 100 * 0.8, 0.2, 1), pw = w * panel, px = (w - pw) / 2, line = Math.max(1, size * 0.15);
        g.inner = rrect(new Path2D(), 0, 0, w, h, 0);
        g.paint = (ctx, draw) => {
          for (const side of [-1, 1]) {
            ctx.save();
            ctx.beginPath(); side < 0 ? ctx.rect(0, 0, px, h) : ctx.rect(px + pw, 0, px, h); ctx.clip();
            // mirror about the panel's edge so the picture folds out from it
            const ax = side < 0 ? px : px + pw;
            ctx.translate(ax, 0); ctx.scale(-1, 1); ctx.translate(-ax, 0);
            draw({ x: px, y: 0, w: pw, h });
            ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fillRect(0, 0, w, h);
            ctx.restore();
          }
          ctx.save(); ctx.beginPath(); ctx.rect(px, 0, pw, h); ctx.clip(); draw({ x: px, y: 0, w: pw, h }); ctx.restore();
          ctx.save(); ctx.strokeStyle = f.color || '#ffffff'; ctx.lineWidth = line; ctx.strokeRect(px, -line, pw, h + line * 2); ctx.restore();
        };
        break;
      }
      case 'torn':
        g.outer = tornPath(w, h, hashStr(el.id || 'img'), Math.max(3, Math.min(w, h) * 0.022));
        g.rect = inset(size, size, size, size);
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, 0);
        break;
      case 'papercut': {
        // angular hand-cut outline: a jittered polygon with the photo cut along an inset copy
        const r = rng(hashStr(el.id || 'pc')), cx = w / 2, cy = h / 2, n = 16;
        const pts = [];
        for (let i = 0; i < n; i++) {
          const t = i / n * TAU + (r() - 0.5) * 0.25;
          const ex = Math.cos(t), ey = Math.sin(t);
          const k = 1 / Math.max(Math.abs(ex), Math.abs(ey)); // push towards the rectangle's edge
          const j = 0.9 + r() * 0.1;
          pts.push([ex * Math.min(k, 1.25) * j, ey * Math.min(k, 1.25) * j]);
        }
        const outerPts = fitPoly(pts, w, h);
        g.outer = polyPath(outerPts);
        const sx = Math.max(0.1, (w / 2 - size) / (w / 2)), sy = Math.max(0.1, (h / 2 - size) / (h / 2));
        g.inner = polyPath(outerPts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]));
        g.rect = { x: 0, y: 0, w, h };
        break;
      }
      case 'sticky': {
        // a sticky note: the photo printed on the paper, glue strip on top, the bottom edge curling up
        const lift = h * 0.025;
        const p = new Path2D();
        p.moveTo(0, 0); p.lineTo(w, 0); p.lineTo(w, h - lift); p.quadraticCurveTo(w * 0.55, h + lift * 0.4, 0, h - lift * 0.3); p.closePath();
        g.outer = p;
        g.rect = inset(size, size * 1.1, size, size * 1.3);
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, 0);
        g.print = true;
        g.extra = ctx => {
          ctx.save(); ctx.clip(p);
          const gl = ctx.createLinearGradient(0, 0, 0, h * 0.14);
          gl.addColorStop(0, 'rgba(0,0,0,0.10)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h * 0.14);
          const cl = ctx.createLinearGradient(0, h * 0.72, 0, h);
          cl.addColorStop(0, 'rgba(255,255,255,0)'); cl.addColorStop(0.7, 'rgba(255,255,255,0.10)'); cl.addColorStop(1, 'rgba(0,0,0,0.18)');
          ctx.fillStyle = cl; ctx.fillRect(0, h * 0.72, w, h * 0.28);
          const sd = ctx.createLinearGradient(0, 0, w, 0);
          sd.addColorStop(0, 'rgba(0,0,0,0.06)'); sd.addColorStop(0.15, 'rgba(0,0,0,0)'); sd.addColorStop(0.85, 'rgba(0,0,0,0)'); sd.addColorStop(1, 'rgba(0,0,0,0.08)');
          ctx.fillStyle = sd; ctx.fillRect(0, 0, w, h);
          ctx.restore();
        };
        break;
      }
      case 'ticket':
        g.inner = ticketPath(w, h, f.radius ?? Math.min(w, h) * 0.06, Math.min(w, h) * 0.1);
        if (f.size) g.stroke = { path: g.inner, w: size };
        break;
      default: {
        const kind = style === 'circle' ? 'ellipse' : style;
        g.inner = shapePath(kind, w, h, { points: style === 'scallop' ? 18 : style === 'star' ? 5 : 8, depth: style === 'scallop' ? 0.06 : 0.22, radius: Math.min(w, h) * 0.06, seed: hashStr(el.id || 'b') % 97 + 1 });
        if (f.size) g.stroke = { path: g.inner, w: size };
      }
    }
    return g;
  }

  R.frameGeometry = frameGeometry;
  // where image coordinates (0–1) land inside an image element's box, matching drawCover
  R.imageBoxMap = function (el) {
    const img = assetImage(el.assetId);
    if (!img) return null;
    const r = frameGeometry(el).rect, iw = iwOf(img), ih = ihOf(img), c = el.crop || {};
    const sc = (c.fit ? Math.min : Math.max)(r.w / iw, r.h / ih) * (c.zoom || 1), dw = iw * sc, dh = ih * sc;
    const dx = r.x + (r.w - dw) * (c.x ?? 0.5), dy = r.y + (r.h - dh) * (c.y ?? 0.5);
    const fx = u => el.flipX ? 1 - u : u, fy = v => el.flipY ? 1 - v : v;
    return {
      toBox: (u, v) => ({ x: dx + fx(u) * dw, y: dy + fy(v) * dh }),
      toImg: (x, y) => ({ u: fx((x - dx) / dw), v: fy((y - dy) / dh) }),
      unit: Math.max(dw, dh),
    };
  };
  R.filteredSource = filteredSource;

  function drawPlaceholder(ctx, r, el) {
    const cols = el.placeholder || ['#e7e1d4', '#cfc5b1'];
    const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    // a small "photo" glyph
    const s = Math.min(r.w, r.h) * 0.2, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.save();
    ctx.globalAlpha *= 0.45;
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = Math.max(1.5, s * 0.07); ctx.lineJoin = 'round';
    ctx.stroke(rrect(new Path2D(), cx - s, cy - s * 0.72, s * 2, s * 1.44, s * 0.18));
    ctx.beginPath(); ctx.arc(cx + s * 0.45, cy - s * 0.25, s * 0.16, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - s * 0.8, cy + s * 0.5); ctx.lineTo(cx - s * 0.25, cy - s * 0.1); ctx.lineTo(cx + s * 0.15, cy + s * 0.25); ctx.lineTo(cx + s * 0.4, cy + s * 0.05); ctx.lineTo(cx + s * 0.8, cy + s * 0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawCover(ctx, src, r, el) {
    const iw = iwOf(src), ih = ihOf(src);
    if (!iw || !ih) return;
    const c = el.crop || {};
    const sc = (c.fit ? Math.min : Math.max)(r.w / iw, r.h / ih) * (c.zoom || 1);
    const dw = iw * sc, dh = ih * sc;
    const fx = c.x ?? 0.5, fy = c.y ?? 0.5;
    const dx = r.x + (r.w - dw) * fx, dy = r.y + (r.h - dh) * fy;
    ctx.save();
    if (el.flipX || el.flipY) {
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
      ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    }
    const f = el.filters || {};
    if (f.blur && 'filter' in ctx && !(f.blurArea && f.blurArea !== 'all' && (f.blurPts || []).length)) ctx.filter = `blur(${f.blur * deviceScale(ctx) * Math.max(dw, dh) / 1000}px)`;
    ctx.drawImage(src, dx, dy, dw, dh);
    ctx.restore();
  }

  function overlays(ctx, r, f, t = null) {
    if (f.leak) { ctx.save(); ctx.translate(r.x, r.y); lightLeak(ctx, r.w, r.h, f.leak, f.leakColor, f.leakSide || 'left', t); ctx.restore(); }
    if (f.vignette) {
      const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.25, r.x + r.w / 2, r.y + r.h / 2, Math.hypot(r.w, r.h) / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${f.vignette / 100 * 0.75})`);
      ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    if (f.grain) {
      ctx.save(); ctx.translate(r.x, r.y); fillTexture(ctx, 'grain', f.grain, r.w, r.h, grainScale(f.grainSize), t != null ? Math.floor(t * 24) : null); ctx.restore();
    }
    if (f.dust) { ctx.save(); ctx.translate(r.x, r.y); dustScratches(ctx, r.w, r.h, f.dust, t != null ? Math.floor(t * 12) : null, 5); ctx.restore(); }
  }
  const grainScale = v => 1 + clamp(v || 0, 0, 100) / 100 * 3;
  R.photoFinish = overlays;

  /* ───────────────────────── film effects ─────────────────────────
     Painted over a photo (filters) or the whole canvas (overlay). With a time they move
     like projected film; without one they hold a single, steady frame. */
  // light leak: warm light spilling in from one edge of the frame
  function lightLeak(ctx, w, h, amt, color, side, t) {
    const k = clamp(amt / 100, 0, 1), M = Math.max(w, h), c = hexRgb(color || '#ff5a1f');
    ctx.save();
    if (side === 'right') { ctx.translate(w, 0); ctx.scale(-1, 1); }
    else if (side === 'top' || side === 'bottom') { ctx.translate(side === 'top' ? w : 0, side === 'top' ? 0 : h); ctx.rotate(side === 'top' ? Math.PI / 2 : -Math.PI / 2); [w, h] = [h, w]; }
    ctx.globalCompositeOperation = 'screen';
    const d = t ?? 0, pulse = t != null ? 0.78 + 0.22 * Math.sin(t * 1.3) : 1;
    ctx.globalAlpha *= k * pulse;
    const blob = (x, y, rx, ry, stops) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(rx / M, ry / M);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, M);
      for (const [p, col, a] of stops) g.addColorStop(p, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
      ctx.fillStyle = g; ctx.fillRect(-M, -M, M * 2, M * 2); ctx.restore();
    };
    const y1 = h * (0.36 + Math.sin(d * 0.45) * 0.12), y2 = h * (0.78 + Math.sin(d * 0.6 + 2) * 0.08);
    blob(-w * 0.04, y1, w * 0.62, h * 0.7, [[0, c, 0.95], [0.45, c, 0.4], [1, c, 0]]);
    blob(-w * 0.02, y2, w * 0.45, h * 0.4, [[0, [255, 40, 90], 0.7], [0.5, [255, 40, 90], 0.22], [1, [255, 40, 90], 0]]);
    blob(-w * 0.03, y1 + h * 0.04, w * 0.2, h * 0.32, [[0, [255, 236, 190], 0.95], [0.6, [255, 190, 120], 0.35], [1, [255, 190, 120], 0]]);
    ctx.restore();
  }
  // dust specks, a stray hair and long scratches; specks change every frame, scratches linger and wander
  function dustScratches(ctx, w, h, amt, frame, seed) {
    const k = clamp(amt / 100, 0, 1), M = Math.max(w, h);
    const r = rng(seed * 977 + (frame ?? 3) * 7919);
    ctx.save();
    const n = Math.round(k * (10 + 34 * (w * h) / (1080 * 1350)));
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h, sz = M * (0.0007 + Math.pow(r(), 3) * 0.0045), white = r() < 0.6;
      ctx.fillStyle = white ? `rgba(255,252,240,${0.45 + r() * 0.5})` : `rgba(14,10,6,${0.4 + r() * 0.5})`;
      ctx.beginPath(); ctx.ellipse(x, y, sz, sz * (0.5 + r() * 0.7), r() * Math.PI, 0, TAU); ctx.fill();
    }
    const hairs = Math.round(k * 2.2 + r() * k);
    ctx.lineCap = 'round';
    for (let i = 0; i < hairs; i++) {
      const x = r() * w, y = r() * h, L = M * (0.025 + r() * 0.05), a = r() * TAU;
      ctx.strokeStyle = r() < 0.5 ? 'rgba(255,250,235,0.7)' : 'rgba(12,8,5,0.6)'; ctx.lineWidth = M * 0.0011;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + Math.cos(a + 1) * L * 0.5, y + Math.sin(a + 1) * L * 0.5, x + Math.cos(a - 0.8) * L * 0.8, y + Math.sin(a - 0.8) * L * 0.8, x + Math.cos(a) * L, y + Math.sin(a) * L);
      ctx.stroke();
    }
    // scratches run down the film and stay for a few frames, wobbling sideways
    const block = frame == null ? 1 : Math.floor(frame / 9), rs = rng(seed * 131 + block * 104729);
    const lines = Math.round(k * 2.5 + rs() * 1.2);
    for (let i = 0; i < lines; i++) {
      const x = rs() * w + (frame == null ? 0 : (r() - 0.5) * M * 0.003), lw = M * (0.0006 + rs() * 0.0012);
      ctx.strokeStyle = rs() < 0.75 ? `rgba(255,252,240,${0.2 + rs() * 0.3})` : `rgba(10,8,6,${0.2 + rs() * 0.25})`; ctx.lineWidth = lw;
      let y = -10;
      ctx.beginPath();
      while (y < h) { const seg = h * (0.15 + rs() * 0.5); ctx.moveTo(x + (rs() - 0.5) * lw * 3, y); ctx.lineTo(x + (rs() - 0.5) * lw * 3, y + seg); y += seg + h * rs() * 0.12; }
      ctx.stroke();
    }
    ctx.restore();
  }
  // film burn: the frame scorching orange and white from one edge, flaring up and dying back
  function filmBurn(ctx, w, h, amt, t) {
    const k = clamp(amt / 100, 0, 1), M = Math.max(w, h);
    // in a video it flares every few seconds, swelling across the frame and dying back; a still holds a steady burn at the edge
    let p = 0.75;
    if (t != null) { const c = ((t + 1.2) % 4) / 4, s = Math.max(0, Math.sin(c * Math.PI)); p = Math.pow(s, 1.6) + Math.sin(t * 23) * 0.03; }
    p = clamp(p, 0, 1);
    if (p < 0.02) return;
    const d = t ?? 0;
    const blob = (y, i, comp, stops, grow) => {
      const rad = M * (0.2 + grow * p) * (0.85 + 0.15 * Math.sin(d * 0.9 + i));
      ctx.save(); ctx.globalCompositeOperation = comp; ctx.translate(w + M * 0.04, y); ctx.scale(0.8, 1.2);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      for (const [o, c] of stops) g.addColorStop(o, c);
      ctx.fillStyle = g; ctx.fillRect(-rad, -rad, rad * 2, rad * 2); ctx.restore();
    };
    ctx.save();
    ctx.globalAlpha *= k;
    for (let i = 0; i < 3; i++) {
      const y = h * (0.15 + i * 0.35) + Math.sin(d * 0.8 + i * 2.1) * h * 0.08;
      // burnt orange stains the picture, then a white-hot core blows it out
      blob(y, i, 'source-over', [[0, `rgba(255,120,20,${0.85 * p})`], [0.45, `rgba(230,60,0,${0.6 * p})`], [0.8, `rgba(150,15,0,${0.25 * p})`], [1, 'rgba(120,0,0,0)']], 0.55);
      blob(y, i, 'screen', [[0, 'rgba(255,250,235,1)'], [0.25, `rgba(255,214,120,${0.9 * p})`], [0.6, `rgba(255,120,30,${0.4 * p})`], [1, 'rgba(255,90,0,0)']], 0.35);
    }
    ctx.restore();
  }
  // projector flicker: each frame a touch brighter or darker than the last
  function flicker(ctx, w, h, amt, t) {
    if (t == null) return;
    const r = rng(Math.floor(t * 24) * 31 + 3), v = ((r() - 0.5) * 2 * 0.1 + Math.sin(t * 9) * 0.025) * clamp(amt / 100, 0, 1);
    ctx.save(); ctx.globalAlpha *= Math.abs(v); ctx.fillStyle = v > 0 ? '#fff6e6' : '#000'; ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  R.hasFilmMotion = doc => !!(doc && ((doc.overlay && (doc.overlay.weave > 0 || doc.overlay.flicker > 0)) || (styleOn(doc.sfx) && window.StudioStyles.moves(doc.sfx))));

  /* ───────────────────────── studio look ─────────────────────────
     el.studio = { on, preset, color, color2, glow, light, lx, ly, size, intensity, grade, rim, shadow, backdrop, cutId, src }
     The person (cut out once, cached as cutId) is re-lit over a seamless studio backdrop. */
  R.STUDIO_PRESETS = {
    ember: { label: 'Ember', color: '#d2501f', color2: '#4a1306', glow: '#ff9a52', light: 'soft', lx: 0.32, ly: 0.22, size: 0.75, intensity: 0.85, grade: 55, rim: 45, shadow: 35 },
    spotlight: { label: 'Spotlight', color: '#d2731a', color2: '#4a1a05', glow: '#ffc23a', light: 'spot', lx: 0.42, ly: 0.42, size: 0.42, intensity: 1, grade: 50, rim: 55, shadow: 20 },
    blue: { label: 'Blue hour', color: '#5f86e0', color2: '#1d3a9e', glow: '#c9dbff', light: 'top', lx: 0.6, ly: 0.1, size: 0.8, intensity: 0.8, grade: 55, rim: 40, shadow: 25 },
    clay: { label: 'Clay', color: '#c98a64', color2: '#6a3a24', glow: '#ffd8b8', light: 'side', lx: 0.15, ly: 0.35, size: 0.7, intensity: 0.75, grade: 40, rim: 40, shadow: 40 },
    grey: { label: 'Studio grey', color: '#b9b7b2', color2: '#5b5955', glow: '#ffffff', light: 'soft', lx: 0.5, ly: 0.3, size: 0.8, intensity: 0.7, grade: 15, rim: 30, shadow: 40 },
    lime: { label: 'Lime', color: '#c7e25a', color2: '#4f6a12', glow: '#f4ffc0', light: 'soft', lx: 0.65, ly: 0.25, size: 0.7, intensity: 0.8, grade: 35, rim: 40, shadow: 30 },
    noir: { label: 'Noir', color: '#3a3a3a', color2: '#050505', glow: '#ffffff', light: 'side', lx: 0.85, ly: 0.3, size: 0.6, intensity: 0.9, grade: 30, rim: 70, shadow: 10 },
    blush: { label: 'Blush', color: '#f2a7b8', color2: '#8e3b56', glow: '#ffe3ea', light: 'spot', lx: 0.5, ly: 0.38, size: 0.5, intensity: 0.85, grade: 40, rim: 45, shadow: 25 },
  };
  R.STUDIO_LIGHTS = { soft: 'Soft key', spot: 'Spotlight', side: 'Side', top: 'Top', flat: 'Flat' };
  function studioBackdrop(ctx, r, st) {
    const { x, y, w, h } = r, M = Math.max(w, h), k = clamp(st.intensity ?? 0.8, 0, 1.5);
    const c1 = st.color || '#d2501f', c2 = st.color2 || '#3a0e04', glow = st.glow || '#ffffff';
    const lx = x + w * (st.lx ?? 0.5), ly = y + h * (st.ly ?? 0.3), R0 = M * (st.size ?? 0.7);
    ctx.save();
    ctx.fillStyle = c2; ctx.fillRect(x, y, w, h);
    const light = st.light || 'soft';
    if (light === 'spot') {
      // a hard-ish circle of light thrown on the wall behind the subject
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, R0);
      g.addColorStop(0, glow); g.addColorStop(0.55, rgba(glow, 0.95)); g.addColorStop(0.78, c1); g.addColorStop(1, c2);
      ctx.fillStyle = c1; ctx.globalAlpha = 0.55 * k; ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = Math.min(1, k); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    } else if (light === 'side' || light === 'top') {
      const gg = light === 'side' ? ctx.createLinearGradient(lx < x + w / 2 ? x : x + w, 0, lx < x + w / 2 ? x + w : x, 0) : ctx.createLinearGradient(0, y, 0, y + h);
      gg.addColorStop(0, c1); gg.addColorStop(0.65, rgba(c1, 0.35)); gg.addColorStop(1, rgba(c1, 0));
      ctx.globalAlpha = k; ctx.fillStyle = gg; ctx.fillRect(x, y, w, h);
      const hl = ctx.createRadialGradient(lx, ly, 0, lx, ly, R0);
      hl.addColorStop(0, rgba(glow, 0.45 * k)); hl.addColorStop(1, rgba(glow, 0));
      ctx.globalAlpha = 1; ctx.fillStyle = hl; ctx.fillRect(x, y, w, h);
    } else if (light === 'flat') {
      ctx.fillStyle = c1; ctx.fillRect(x, y, w, h);
    } else {
      // soft key: a broad pool of light falling off into the shadow colour
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, R0 * 1.5);
      g.addColorStop(0, rgba(glow, 0.9)); g.addColorStop(0.25, c1); g.addColorStop(1, c2);
      ctx.globalAlpha = Math.min(1, k); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    }
    // seamless sweep: the floor darkens slightly, edges fall off
    ctx.globalAlpha = 1;
    const fl = ctx.createLinearGradient(0, y + h * 0.7, 0, y + h);
    fl.addColorStop(0, 'rgba(0,0,0,0)'); fl.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = fl; ctx.fillRect(x, y + h * 0.7, w, h * 0.3);
    const vg = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.hypot(w, h) / 2);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vg; ctx.fillRect(x, y, w, h);
    ctx.translate(x, y); fillTexture(ctx, 'grain', 22, w, h);
    ctx.restore();
  }
  R.studioBackdrop = studioBackdrop;
  const studioCache = new LRU(12);
  // the cut-out person, tinted toward the backdrop and rim-lit from the light's side
  function studioSubject(cutId, cutImg, filters, st) {
    const key = cutId + '|' + JSON.stringify(filters || {}) + '|' + [st.color, st.color2, st.glow, st.grade, st.rim, st.lx, st.ly].join(',');
    const hit = studioCache.get(key);
    if (hit) return hit;
    const src = filteredSource(cutId, cutImg, filters);
    const w = src.width, h = src.height;
    const out = canvas(w, h), x = out.getContext('2d');
    x.drawImage(src, 0, 0);
    const grade = (st.grade ?? 40) / 100;
    if (grade > 0) {
      // pull the person's colours toward the backdrop: hue shift, soft-light warmth, deeper shadows
      x.globalCompositeOperation = 'color'; x.globalAlpha = grade * 0.55; x.fillStyle = st.color || '#d2501f'; x.fillRect(0, 0, w, h);
      x.globalCompositeOperation = 'soft-light'; x.globalAlpha = Math.min(1, grade * 1.1); x.fillStyle = st.color || '#d2501f'; x.fillRect(0, 0, w, h);
      x.globalCompositeOperation = 'multiply'; x.globalAlpha = grade * 0.3; x.fillStyle = st.color2 || '#3a0e04'; x.fillRect(0, 0, w, h);
      x.globalCompositeOperation = 'screen'; x.globalAlpha = grade * 0.12; x.fillStyle = st.glow || '#ffffff'; x.fillRect(0, 0, w, h);
      x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0);
    }
    const rim = (st.rim ?? 40) / 100;
    if (rim > 0) {
      const ang = Math.atan2((st.ly ?? 0.3) - 0.5, (st.lx ?? 0.5) - 0.5), d = Math.max(w, h) * 0.014 * (0.4 + rim);
      const sil = canvas(w, h), sx = sil.getContext('2d');
      sx.drawImage(src, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = st.glow || '#ffffff'; sx.fillRect(0, 0, w, h);
      sx.globalCompositeOperation = 'destination-out'; sx.drawImage(src, -Math.cos(ang) * d, -Math.sin(ang) * d);
      const soft = canvas(w, h), so = soft.getContext('2d');
      so.filter = `blur(${d * 0.5}px)`; so.drawImage(sil, 0, 0); so.filter = 'none';
      so.globalCompositeOperation = 'destination-in'; so.drawImage(src, 0, 0);
      x.globalCompositeOperation = 'screen'; x.globalAlpha = Math.min(1, rim * 1.2); x.drawImage(soft, 0, 0);
    }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    // a silhouette for the soft shadow on the wall
    const shadow = canvas(w, h), shx = shadow.getContext('2d');
    shx.drawImage(src, 0, 0); shx.globalCompositeOperation = 'source-in'; shx.fillStyle = '#000'; shx.fillRect(0, 0, w, h);
    const res = { img: out, shadow };
    studioCache.set(key, res);
    return res;
  }
  R.studioReady = el => !!(el.studio && el.studio.on && el.studio.cutId && el.studio.src === el.assetId && assetImage(el.studio.cutId));
  function drawStudio(ctx, el, g) {
    const st = el.studio, r = g.rect;
    ctx.save();
    ctx.clip(g.inner);
    if (st.backdrop !== false) studioBackdrop(ctx, r, st);
    const cutImg = st.cutId && st.src === el.assetId ? assetImage(st.cutId) : null;
    if (cutImg) {
      const S2 = studioSubject(st.cutId, cutImg, el.filters, st);
      if ((st.shadow ?? 30) > 0) {
        const ang = Math.atan2((st.ly ?? 0.3) - 0.5, (st.lx ?? 0.5) - 0.5), off = Math.max(r.w, r.h) * 0.035;
        ctx.save();
        ctx.translate(-Math.cos(ang) * off, -Math.sin(ang) * off * 0.6);
        ctx.globalAlpha *= clamp((st.shadow ?? 30) / 100, 0, 1) * 0.7;
        if ('filter' in ctx) ctx.filter = `blur(${Math.max(r.w, r.h) * 0.025 * deviceScale(ctx)}px)`;
        drawCover(ctx, S2.shadow, r, Object.assign({}, el, { filters: {} }));
        ctx.restore();
      }
      drawCover(ctx, S2.img, r, Object.assign({}, el, { filters: { blur: (el.filters || {}).blur } }));
    } else if (el.assetId && assetImage(el.assetId)) {
      // not cut out yet: show the photo dimmed over the backdrop
      ctx.globalAlpha *= 0.35;
      drawCover(ctx, filteredSource(el.assetId, assetImage(el.assetId), el.filters), r, el);
      ctx.globalAlpha /= 0.35;
    } else if (!el.assetId) {
      const s = Math.min(r.w, r.h) * 0.12, cx = r.x + r.w / 2, cy = r.y + r.h * 0.55;
      ctx.globalAlpha *= 0.35; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx, cy - s * 1.6, s * 0.75, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 1.4, s * 1.5, s * 2.2, 0, Math.PI, 0); ctx.fill();
    }
    overlays(ctx, r, el.filters || {});
    ctx.restore();
  }

  /* ── stop motion: an image layer can hold a sequence of photos played frame by frame ──
     el.seq = { ids: [assetId…], fps, mode: 'loop'|'bounce'|'once', jitter, still } */
  function seqFrame(el, t) {
    const sq = el.seq, n = sq.ids.length;
    if (t == null) return { k: clamp(sq.still || 0, 0, n - 1), i: clamp(sq.still || 0, 0, n - 1) };
    const k = Math.max(0, Math.floor((t - ((el.time && el.time.start) || 0)) * clamp(sq.fps || 8, 1, 30) + 1e-6));
    let i;
    if (sq.mode === 'once') i = Math.min(k, n - 1);
    else if (sq.mode === 'bounce' && n > 1) { const p = 2 * n - 2, m = k % p; i = m < n ? m : p - m; }
    else i = k % n;
    return { k, i };
  }
  R.isSeq = el => !!(el && el.type === 'image' && el.seq && el.seq.ids && el.seq.ids.length > 1);
  R.seqFrame = seqFrame;
  function drawImageEl(ctx, el, env) {
    if (el.seq && el.seq.ids && el.seq.ids.length) {
      const t = 'time' in env ? env.time : R.playTime;
      const { k, i } = seqFrame(el, t);
      const id = el.seq.ids[i];
      const j = (el.seq.jitter ?? 35) / 100;
      // hand-made wobble: every frame sits a touch off, like each was placed by hand
      if (t != null && j > 0 && el.seq.ids.length > 1) {
        const r = rng(hashStr(el.id || 'seq') + k * 7919), m = Math.min(el.width, el.height);
        ctx.translate(el.width / 2 + (r() - 0.5) * m * 0.02 * j, el.height / 2 + (r() - 0.5) * m * 0.02 * j);
        ctx.rotate((r() - 0.5) * 1.6 * j * Math.PI / 180);
        ctx.translate(-el.width / 2, -el.height / 2);
      }
      if (id && id !== el.assetId) el = Object.assign({}, el, { assetId: id });
    }
    const g = frameGeometry(el);
    const f = el.frame || {};
    if (el.studio && el.studio.on) {
      if (g.outer) { ctx.fillStyle = f.color || '#fff'; ctx.fill(g.outer); }
      drawStudio(ctx, el, g);
      if (g.stroke) { ctx.lineWidth = g.stroke.w; ctx.strokeStyle = f.color || '#fff'; ctx.lineJoin = 'round'; ctx.stroke(g.stroke.path); }
      if (g.extra) g.extra(ctx);
      return;
    }
    if (g.outer) {
      ctx.fillStyle = f.color || '#fff'; ctx.fill(g.outer);
      if (f.texture) { ctx.save(); ctx.clip(g.outer); fillTexture(ctx, 'paper', f.texture, el.width, el.height, 1, null, f.paperId); ctx.restore(); }
    }
    let img = assetImage(el.assetId);
    if (img && env.editor && isVideoAsset(el.assetId)) liveSync(img, el.video, 'time' in env ? env.time : R.playTime, (el.time && el.time.start) || 0);
    // exporting a slowed-down clip: draw the smooth in-between frame made for this moment
    if (img && !env.editor && isVideoAsset(el.assetId)) img = R.interpFrame(el.assetId, el.video, (el.time && el.time.start) || 0, 'time' in env ? env.time : null) || img;
    // clones (clones.js): the frame with the subject's other moments laid into it
    if (img && el.clones && el.clones.on && R.cloneFrame) img = R.cloneFrame(el, img, env) || img;
    // layer masks (masks.js): the picture cut to shapes and / or its subject
    if (img && el.mask && el.mask.on && R.maskFrame) img = R.maskFrame(el, img, env) || img;
    if (el.outline && el.outline.on && el.outline.width > 0 && img && (f.style || 'none') === 'none') {
      const src = filteredSource(el.assetId, img, el.filters);
      drawOutlined(ctx, el, 'img:' + el.assetId + JSON.stringify(el.filters || {}) + JSON.stringify(el.crop || {}) + (el.flipX ? 1 : 0), (c, w, h) => drawCover(c, src, { x: 0, y: 0, w, h }, el));
      return;
    }
    if (g.paint) {
      // cut-up frames place the photo piece by piece themselves
      const src = img ? filteredSource(el.assetId, img, el.filters) : null;
      g.paint(ctx, r => { if (src) drawCover(ctx, src, r, el); else drawPlaceholder(ctx, r, el); overlays(ctx, r, el.filters || {}, null); });
      if (g.extra) g.extra(ctx);
      return;
    }
    ctx.save();
    ctx.clip(g.inner);
    // printed frames lay the photo into the paper like ink
    if (g.print) ctx.globalCompositeOperation = 'multiply';
    if (img) drawCover(ctx, filteredSource(el.assetId, img, el.filters), g.rect, el);
    else drawPlaceholder(ctx, g.rect, el);
    ctx.globalCompositeOperation = 'source-over';
    overlays(ctx, g.rect, el.filters || {}, R.isTimeVarying(el) ? ('time' in env ? env.time : R.playTime) : null);
    ctx.restore();
    if (g.stroke) { ctx.lineWidth = g.stroke.w; ctx.strokeStyle = f.color || '#fff'; ctx.lineJoin = 'round'; ctx.stroke(g.stroke.path); }
    if (g.extra) g.extra(ctx);
  }

  /* ───────────────────────── die-cut outline ───────────────────────── */

  const outlineCache = new LRU(60);
  R.OUTLINE_STYLES = { smooth: 'Smooth sticker', paper: 'Paper cut-out', scribble: 'Marker scribble' };
  function dilate(sil, W, H, rad) {
    const d = canvas(W, H), dx = d.getContext('2d');
    const n = 28;
    for (let i = 0; i < n; i++) { const a = i / n * TAU; dx.drawImage(sil, Math.cos(a) * rad, Math.sin(a) * rad); }
    for (let i = 0; i < n / 2; i++) { const a = i / (n / 2) * TAU; dx.drawImage(sil, Math.cos(a) * rad * 0.5, Math.sin(a) * rad * 0.5); }
    dx.drawImage(sil, 0, 0);
    return d;
  }
  // outer contours of the opaque blobs in a canvas, as point lists in canvas pixels
  function contours(src, W, H) {
    const g = Math.min(1, 240 / Math.max(W, H));
    const gw = Math.max(2, Math.round(W * g)), gh = Math.max(2, Math.round(H * g));
    const sm = canvas(gw + 2, gh + 2), sx = sm.getContext('2d', { willReadFrequently: true });
    sx.drawImage(src, 1, 1, gw, gh);
    const gw2 = gw + 2, gh2 = gh + 2, px = sx.getImageData(0, 0, gw2, gh2).data;
    const G = new Uint8Array(gw2 * gh2);
    for (let i = 0; i < G.length; i++) G[i] = px[i * 4 + 3] > 110 ? 1 : 0;
    const lab = new Int32Array(G.length), comps = [];
    let id = 0;
    for (let i = 0; i < G.length; i++) {
      if (!G[i] || lab[i]) continue;
      id++;
      let area = 0;
      const stack = [i];
      lab[i] = id;
      while (stack.length) {
        const q = stack.pop(); area++;
        const qx = q % gw2, qy = (q / gw2) | 0;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = qx + ox, ny = qy + oy;
          if (nx < 0 || ny < 0 || nx >= gw2 || ny >= gh2) continue;
          const ni = ny * gw2 + nx;
          if (G[ni] && !lab[ni]) { lab[ni] = id; stack.push(ni); }
        }
      }
      comps.push({ id, start: i, area });
    }
    const maxA = Math.max(0, ...comps.map(c => c.area));
    const D = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
    const out = [];
    for (const c of comps) {
      if (c.area < Math.max(12, maxA * 0.03)) continue;
      const inC = (x, y) => x >= 0 && y >= 0 && x < gw2 && y < gh2 && lab[y * gw2 + x] === c.id;
      const sxp = c.start % gw2, syp = (c.start / gw2) | 0;
      let cx = sxp, cy = syp, dir = 0;
      const pts = [];
      const cap = c.area * 4 + 100;
      for (let step = 0; step < cap; step++) {
        pts.push([cx, cy]);
        let found = false;
        for (let k = 0; k < 8; k++) {
          const d = (dir + k) % 8, nx = cx + D[d][0], ny = cy + D[d][1];
          if (inC(nx, ny)) { cx = nx; cy = ny; dir = (d + 6) % 8; found = true; break; }
        }
        if (!found || (cx === sxp && cy === syp && pts.length > 2)) break;
      }
      out.push(pts.map(([x, y]) => [(x - 1 + 0.5) / g, (y - 1 + 0.5) / g]));
    }
    return out;
  }
  function simplify(pts, eps) {
    if (pts.length < 4) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [i0, i1] = stack.pop();
      const [ax, ay] = pts[i0], [bx, by] = pts[i1];
      const L = Math.hypot(bx - ax, by - ay) || 1;
      let best = -1, bd = 0;
      for (let i = i0 + 1; i < i1; i++) {
        const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
        if (d > bd) { bd = d; best = i; }
      }
      if (bd > eps && best > 0) { keep[best] = 1; stack.push([i0, best], [best, i1]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  function drawOutlined(ctx, el, srcKey, paint) {
    const w = el.width, h = el.height, o = el.outline;
    const style = o.style || 'smooth';
    const s = Math.min(4, Math.max(0.25, Math.ceil(deviceScale(ctx) * 4) / 4));
    const sw = style === 'scribble' ? Math.max(3, o.width * 0.5) : 0;
    const pad = o.width + sw + 4;
    const key = [srcKey, w | 0, h | 0, s, o.width, o.color, style].join('|');
    let c = outlineCache.get(key);
    if (!c) {
      const W = (w + pad * 2) * s, H = (h + pad * 2) * s;
      const art = canvas(W, H), ax = art.getContext('2d');
      ax.scale(s, s); ax.translate(pad, pad); paint(ax, w, h);
      const sil = canvas(W, H), sx = sil.getContext('2d');
      sx.drawImage(art, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = o.color || '#fff'; sx.fillRect(0, 0, W, H);
      c = canvas(W, H);
      const cx = c.getContext('2d');
      const rad = o.width * s;
      if (style === 'smooth') {
        cx.drawImage(dilate(sil, W, H, rad), 0, 0);
      } else {
        const polys = contours(dilate(sil, W, H, rad), W, H);
        const r = rng(hashStr(el.id || 'o'));
        cx.fillStyle = cx.strokeStyle = o.color || '#fff';
        cx.lineJoin = 'round'; cx.lineCap = 'round';
        for (const poly of polys) {
          if (style === 'paper') {
            // few, straight cuts like scissors through paper
            const pts = simplify(poly, Math.max(W, H) * 0.018).map(([x, y]) => [x + (r() - 0.5) * rad * 0.3, y + (r() - 0.5) * rad * 0.3]);
            cx.fill(polyPath(pts));
          } else {
            // low-frequency wobble so the line reads as drawn by hand around the subject
            const s1 = r() * 10, s2 = r() * 10, amp = sw * s * 0.55;
            const pts = simplify(poly, Math.max(1.5, Math.max(W, H) * 0.004)).map(([x, y], i) => [x + (Math.sin(i * 0.55 + s1) + 0.5 * Math.sin(i * 1.7 + s2)) * amp, y + (Math.cos(i * 0.6 + s2) + 0.5 * Math.sin(i * 1.3 + s1)) * amp]);
            cx.lineWidth = sw * s;
            cx.stroke(polyPath(pts, 1));
            cx.globalAlpha = 0.55;
            cx.lineWidth = sw * s * 0.6;
            cx.stroke(polyPath(pts.map(([x, y]) => [x + (r() - 0.5) * sw * s * 0.8, y + (r() - 0.5) * sw * s * 0.8]), 1));
            cx.globalAlpha = 1;
          }
        }
      }
      if (style !== 'scribble') cx.drawImage(art, 0, 0);
      c.art = style === 'scribble' ? art : null;
      outlineCache.set(key, c);
    }
    ctx.drawImage(c, -pad, -pad, w + pad * 2, h + pad * 2);
    if (c.art) ctx.drawImage(c.art, -pad, -pad, w + pad * 2, h + pad * 2);
  }

  /* ───────────────────────── stickers & shapes ───────────────────────── */

  function drawSticker(ctx, el) {
    const svg = stickerSvg(el);
    if (!svg) return;
    const img = svgImage(svg);
    if (!img) return;
    const w = el.width, h = el.height;
    ctx.save();
    if (el.flipX || el.flipY) { ctx.translate(el.flipX ? w : 0, el.flipY ? h : 0); ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1); }
    if (el.outline && el.outline.on && el.outline.width > 0) drawOutlined(ctx, el, 'svg:' + hashStr(svg), (c, ww, hh) => c.drawImage(img, 0, 0, ww, hh));
    else ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  }

  function drawShape(ctx, el) {
    const w = el.width, h = el.height;
    ctx.save();
    if (el.flipX || el.flipY) { ctx.translate(el.flipX ? w : 0, el.flipY ? h : 0); ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1); }
    if (el.shape === 'line') {
      const sw = el.strokeWidth || 6;
      ctx.strokeStyle = el.stroke || '#111'; ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = sw; ctx.lineCap = el.dash ? 'butt' : 'round';
      if (el.dash) ctx.setLineDash([sw * el.dash, sw * el.dash]);
      const y = h / 2, head = sw * 3.2;
      const x0 = el.arrowStart ? head * 0.8 : 0, x1 = el.arrowEnd ? w - head * 0.8 : w;
      ctx.beginPath();
      if (el.wavy) { for (let x = x0; x <= x1; x += 2) { const yy = y + Math.sin((x - x0) / (sw * 6) * TAU / 2) * sw * 1.5; x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } }
      else { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
      ctx.stroke(); ctx.setLineDash([]);
      const headAt = (x, dir) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * head, y - head * 0.62); ctx.lineTo(x - dir * head, y + head * 0.62); ctx.closePath(); ctx.fill(); };
      if (el.arrowEnd) headAt(w, 1);
      if (el.arrowStart) headAt(0, -1);
      ctx.restore();
      return;
    }
    const path = shapePath(el.shape, w, h, el);
    const rule = (SHAPES[el.shape] || {}).evenodd ? 'evenodd' : 'nonzero';
    // white paper fibres showing along a ripped edge
    if ((el.shape === 'torn' || el.shape === 'notebook') && el.rim && !isClear(el.rim)) {
      const amp = Math.max(3, Math.min(w, h) * 0.025) * 1.9;
      ctx.fillStyle = el.rim;
      ctx.fill(el.shape === 'torn' ? tornPath(w, h, (el.seed || 5) + 31, amp, el.tornSides || 'trbl') : tornPath(w, h, (el.seed || 7) + 31, Math.max(3, w * 0.03) * 1.6, 'l'));
    }
    if (!isClear(el.fill)) {
      ctx.fillStyle = makeFill(ctx, { color: el.fill, color2: el.fill2, gradient: el.gradient, angle: el.gradAngle }, w, h);
      ctx.fill(path, rule);
    }
    if ((el.pattern && el.pattern.type && el.pattern.type !== 'none') || el.texture || el.crumple) {
      ctx.save(); ctx.clip(path, rule);
      drawPattern(ctx, w, h, el.pattern);
      if (el.texture) fillTexture(ctx, 'paper', el.texture, w, h, 1, null, el.paperId);
      if (el.crumple) drawCrumple(ctx, w, h, el.crumple, el.seed || 3);
      ctx.restore();
    }
    if (el.strokeWidth > 0 && !isClear(el.stroke)) {
      ctx.lineWidth = el.strokeWidth; ctx.strokeStyle = el.stroke; ctx.lineJoin = 'round';
      if (el.dash) ctx.setLineDash([el.strokeWidth * el.dash, el.strokeWidth * el.dash * 0.8]);
      ctx.stroke(path);
    }
    ctx.restore();
  }

  /* ───────────────────────── crumpled paper ─────────────────────────
     Light and shadow painted as translucent white and black (folds, crinkles,
     mottling, fibres, dust), so the relief reads on any paper colour. */
  const crumpleCache = new LRU(12);
  let dustTile = null;
  function dust() {
    if (dustTile) return dustTile;
    const c = canvas(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256), r = rng(29);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = r(), white = v < 0.5;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = white ? 255 : 0;
      d.data[i + 3] = r() < 0.004 ? 200 : Math.round(Math.abs(v - 0.5) * 2 * 46);
    }
    x.putImageData(d, 0, 0);
    return (dustTile = c);
  }
  function crumpleTexture(w, h, seed) {
    const k = Math.min(1, 1800 / Math.max(w, h));
    const W = Math.max(64, Math.round(w * k)), H = Math.max(64, Math.round(h * k));
    const key = W + 'x' + H + ':' + seed;
    let c = crumpleCache.get(key);
    if (c) return c;
    c = canvas(W, H);
    const x = c.getContext('2d'), r = rng(seed * 7919 + 13), M = Math.max(W, H);
    // blotchy mottling
    for (let i = 0; i < 90; i++) {
      const px = r() * W, py = r() * H, rad = M * (0.06 + r() * 0.3), light = r() < 0.35;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      const al = (0.06 + r() * 0.14) * (light ? 0.55 : 1);
      g.addColorStop(0, light ? `rgba(255,255,255,${al})` : `rgba(0,0,0,${al})`);
      g.addColorStop(1, light ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    // folds: shaded band on one side, lit band on the other, crisp ridge between
    const crease = (pts, strength) => {
      const path = new Path2D(); pts.forEach(([a, b], i) => i ? path.lineTo(a, b) : path.moveTo(a, b));
      const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1], len = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / len, ny = (bx - ax) / len, band = M * (0.01 + r() * 0.025);
      x.save(); x.lineJoin = 'round'; x.lineCap = 'round';
      for (let j = 0; j < 3; j++) {
        const bw = band * (1 - j * 0.3);
        x.lineWidth = bw;
        x.save(); x.translate(nx * bw / 2, ny * bw / 2); x.strokeStyle = `rgba(0,0,0,${0.07 * strength})`; x.stroke(path); x.restore();
        x.save(); x.translate(-nx * bw / 2, -ny * bw / 2); x.strokeStyle = `rgba(255,255,255,${0.05 * strength})`; x.stroke(path); x.restore();
      }
      x.lineWidth = Math.max(1, M * 0.0013);
      x.strokeStyle = `rgba(255,255,255,${0.55 * strength})`; x.stroke(path);
      x.translate(nx * Math.max(1.2, M * 0.001), ny * Math.max(1.2, M * 0.001)); x.strokeStyle = `rgba(0,0,0,${0.45 * strength})`; x.stroke(path);
      x.restore();
    };
    const line = (x0, y0, x1, y1, wobble) => {
      const pts = [], n = 8;
      for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + (r() - 0.5) * wobble, y0 + (y1 - y0) * t + (r() - 0.5) * wobble]); }
      return pts;
    };
    crease(line(W * (0.47 + r() * 0.06), -10, W * (0.47 + r() * 0.06), H + 10, M * 0.01), 1.1);
    crease(line(-10, H * (0.18 + r() * 0.06), W + 10, H * (0.18 + r() * 0.06), M * 0.01), 1);
    crease(line(-10, H * (0.72 + r() * 0.06), W + 10, H * (0.72 + r() * 0.06), M * 0.01), 0.8);
    for (let i = 0; i < 18; i++) {
      const a = r() * TAU, cx = r() * W, cy = r() * H, L = M * (0.15 + r() * 0.6);
      crease(line(cx - Math.cos(a) * L / 2, cy - Math.sin(a) * L / 2, cx + Math.cos(a) * L / 2, cy + Math.sin(a) * L / 2, M * 0.025), 0.35 + r() * 0.6);
    }
    // fine crinkles
    x.lineWidth = Math.max(0.6, M * 0.0009);
    for (let i = 0; i < 600; i++) {
      const cx = r() * W, cy = r() * H, a = r() * TAU, L = M * (0.008 + r() * 0.05);
      x.strokeStyle = r() < 0.45 ? `rgba(255,255,255,${0.1 + r() * 0.15})` : `rgba(0,0,0,${0.12 + r() * 0.18})`;
      x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + Math.cos(a + 0.6) * L / 2, cy + Math.sin(a + 0.6) * L / 2, cx + Math.cos(a) * L, cy + Math.sin(a) * L); x.stroke();
    }
    // fibres and photocopy dust
    x.fillStyle = x.createPattern(dust(), 'repeat');
    x.fillRect(0, 0, W, H);
    crumpleCache.set(key, c);
    return c;
  }
  function drawCrumple(ctx, w, h, amount, seed, jit) {
    if (!amount) return;
    const tex = crumpleTexture(w, h, seed || 1);
    ctx.save();
    ctx.globalAlpha *= clamp(amount / 100, 0, 1);
    // boiling paper: the sheet sits a few pixels off every frame, slightly larger so the edges stay covered
    if (jit) { const m = Math.max(w, h) * 0.012; ctx.drawImage(tex, -m + jit.dx, -m + jit.dy, w + m * 2, h + m * 2); }
    else ctx.drawImage(tex, 0, 0, w, h);
    ctx.restore();
  }
  /* texture boil (overlay.boil 0–100): paper, grunge and textures are dealt again every frame of the stepped rate,
     the hand-made "it's alive" shimmer of stop-motion and Vox-style collage. boilAt gives that frame's number, or null. */
  function boilAt(doc, t) {
    const b = doc && doc.overlay && doc.overlay.boil;
    if (!(b > 0) || t == null) return null;
    return Math.floor(t * ((doc.anim && doc.anim.step) || 12) + 1e-6);
  }
  function boilJit(doc, t, salt) {
    const f = boilAt(doc, t);
    if (f == null) return null;
    const r = rng(f * 7919 + (salt || 1) * 131), a = doc.overlay.boil / 100, m = Math.min(doc.width, doc.height) * 0.006 * a;
    return { dx: (r() - 0.5) * 2 * m, dy: (r() - 0.5) * 2 * m, f, r };
  }
  /* grunge (overlay.grunge): ink stains, dry-brush streaks, specks and scuffs, light and dark, so it reads on any colour */
  const grungeCache = new LRU(6);
  function grungeTexture(w, h, seed) {
    const k = Math.min(1, 1400 / Math.max(w, h)), W = Math.max(64, Math.round(w * k)), H = Math.max(64, Math.round(h * k));
    const key = W + 'x' + H + ':' + seed;
    let c = grungeCache.get(key);
    if (c) return c;
    c = canvas(W, H);
    const x = c.getContext('2d'), r = rng(seed * 4099 + 7), M = Math.max(W, H);
    // soft stains and a darker rim, like an old print handled a lot
    for (let i = 0; i < 26; i++) {
      const px = r() * W, py = r() * H, rad = M * (0.04 + r() * 0.18), dark = r() < 0.75;
      const g = x.createRadialGradient(px, py, rad * 0.55, px, py, rad);
      const al = 0.05 + r() * 0.09;
      g.addColorStop(0, dark ? `rgba(40,30,15,${al * 0.5})` : `rgba(255,255,255,${al * 0.6})`);
      g.addColorStop(0.92, dark ? `rgba(40,30,15,${al})` : `rgba(255,255,255,${al})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    const rim = x.createRadialGradient(W / 2, H / 2, M * 0.35, W / 2, H / 2, M * 0.75);
    rim.addColorStop(0, 'rgba(30,20,10,0)'); rim.addColorStop(1, 'rgba(30,20,10,0.28)');
    x.fillStyle = rim; x.fillRect(0, 0, W, H);
    // dry-brush streaks
    for (let i = 0; i < 40; i++) {
      const y = r() * H, x0 = r() * W, len = M * (0.08 + r() * 0.35), th = M * (0.002 + r() * 0.006);
      x.fillStyle = r() < 0.6 ? `rgba(20,15,10,${0.03 + r() * 0.06})` : `rgba(255,255,255,${0.04 + r() * 0.08})`;
      for (let j = 0; j < 6; j++) x.fillRect(x0 + r() * len * 0.1, y + (r() - 0.5) * th * 6, len * (0.5 + r() * 0.5), th * (0.4 + r()));
    }
    // ink specks: mostly tiny, irregular, a few in small clusters (splatter)
    for (let i = 0; i < 700; i++) {
      const px = r() * W, py = r() * H, rr = Math.max(0.35, M * 0.0011 * Math.pow(r(), 4) * 3), n = r() < 0.08 ? 6 : 1;
      x.fillStyle = r() < 0.8 ? `rgba(15,10,5,${0.18 + r() * 0.4})` : `rgba(255,255,255,${0.25 + r() * 0.4})`;
      for (let j = 0; j < n; j++) {
        const qx = px + (j ? (r() - 0.5) * M * 0.012 : 0), qy = py + (j ? (r() - 0.5) * M * 0.012 : 0), q = j ? rr * (0.3 + r() * 0.5) : rr;
        x.beginPath(); x.ellipse(qx, qy, q * (0.6 + r() * 0.8), q * (0.6 + r() * 0.8), r() * TAU, 0, TAU); x.fill();
      }
    }
    // scuffs and hairline scratches
    x.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const px = r() * W, py = r() * H, a = r() * TAU, L = M * (0.01 + r() * 0.08);
      x.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.2 + r() * 0.3})` : `rgba(20,15,10,${0.15 + r() * 0.25})`;
      x.lineWidth = Math.max(0.5, M * 0.0008);
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 0.4) * L / 2, py + Math.sin(a + 0.4) * L / 2, px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke();
    }
    grungeCache.set(key, c);
    return c;
  }
  R.drawCrumple = drawCrumple;

  /* ───────────────────────── ribbons: bands and lines with text along a path ─────────────────────────
     el.points are [u, v] fractions of the box, joined by a Catmull-Rom spline. */

  R.RIBBON_PATHS = {
    wave: { label: 'Wave', pts: [[0, 0.62], [0.18, 0.3], [0.42, 0.68], [0.66, 0.3], [0.85, 0.62], [1, 0.42]] },
    loop: { label: 'Loop', pts: [[0, 0.92], [0.17, 0.78], [0.33, 0.66], [0.4, 0.84], [0.28, 0.95], [0.17, 0.8], [0.19, 0.42], [0.36, 0.12], [0.58, 0.2], [0.78, 0.6], [1, 0.52]] },
    swoosh: { label: 'Swoosh', pts: [[0, 0.82], [0.35, 0.8], [0.7, 0.55], [1, 0.12]] },
    arc: { label: 'Arc', pts: [[0, 0.95], [0.25, 0.25], [0.5, 0.05], [0.75, 0.25], [1, 0.95]] },
    scurve: { label: 'S-curve', pts: [[0, 0.1], [0.55, 0.12], [0.62, 0.5], [0.38, 0.86], [1, 0.9]] },
    double: { label: 'Double loop', pts: [[0, 0.7], [0.15, 0.45], [0.27, 0.72], [0.17, 0.85], [0.12, 0.6], [0.35, 0.3], [0.55, 0.5], [0.66, 0.78], [0.56, 0.86], [0.52, 0.62], [0.75, 0.3], [1, 0.4]] },
    zigzag: { label: 'Zigzag', sharp: true, pts: [[0, 0.25], [0.25, 0.75], [0.5, 0.25], [0.75, 0.75], [1, 0.25]] },
    spiral: { label: 'Spiral', pts: (() => { const o = []; for (let i = 0; i <= 26; i++) { const t = i / 26 * TAU * 1.6, r = 0.08 + 0.42 * i / 26; o.push([0.5 + Math.cos(t) * r, 0.5 + Math.sin(t) * r]); } return o; })() },
    circle: { label: 'Circle', closed: true, pts: (() => { const o = []; for (let i = 0; i < 12; i++) { const t = i / 12 * TAU - Math.PI / 2; o.push([0.5 + Math.cos(t) * 0.5, 0.5 + Math.sin(t) * 0.5]); } return o; })() },
    straight: { label: 'Straight', pts: [[0, 0.5], [1, 0.5]] },
    hook: { label: 'Hook arrow', pts: [[0.02, 0], [0.06, 0.55], [0.3, 0.92], [1, 0.97]] },
    scribble: { label: 'Scribble circle', pts: (() => { const o = []; for (let i = 0; i <= 16; i++) { const t = -1.75 + i / 16 * TAU * 1.12, r = 0.47 + (i === 0 || i === 16 ? 0.05 : 0) - Math.sin(i * 1.7) * 0.012; o.push([0.5 + Math.cos(t) * r, 0.5 + Math.sin(t) * r * 0.98]); } o.unshift([0.5 + Math.cos(-1.9) * 0.62, 0.5 + Math.sin(-1.9) * 0.6]); return o; })() },
    swipe: { label: 'Marker swipe', pts: [[0, 0.62], [0.35, 0.5], [0.7, 0.42], [1, 0.36]] },
    tick: { label: 'Tick', sharp: true, pts: [[0, 0.55], [0.34, 1], [1, 0]] },
    cross: { label: 'Cross-out', sharp: true, pts: [[0, 0.1], [1, 0.9], [0.98, 0.08], [0.02, 0.95]] },
    bend: { label: 'Bend arrow', pts: [[0, 0.85], [0.45, 0.1], [1, 0.3]] },
  };
  const ribbonCache = new LRU(60);
  function ribbonGeom(el) {
    const w = el.width, h = el.height, pre = R.RIBBON_PATHS[el.path] || R.RIBBON_PATHS.wave;
    const P = (el.points && el.points.length >= 2 ? el.points : pre.pts);
    const closed = el.points ? !!el.closed : !!pre.closed, sharp = el.points ? !!el.sharp : !!pre.sharp;
    const key = JSON.stringify(P) + '|' + w + '|' + h + '|' + closed + sharp;
    let g = ribbonCache.get(key);
    if (g) return g;
    const pts = P.map(([u, v]) => [u * w, v * h]);
    const out = [];
    const n = pts.length, segs = closed ? n : n - 1;
    const at = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const steps = sharp ? 1 : Math.max(8, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 6));
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        if (sharp) { out.push([p1[0], p1[1]]); continue; }
        out.push([0, 1].map(c => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    out.push(closed ? out[0].slice() : pts[n - 1].slice());
    const cum = [0];
    for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
    g = { pts: out, cum, L: cum[cum.length - 1] || 1, closed };
    ribbonCache.set(key, g);
    return g;
  }
  R.ribbonGeom = ribbonGeom;
  // point and direction at distance d along the path
  function pathAt(g, d) {
    const { pts, cum, L } = g;
    if (g.closed) d = ((d % L) + L) % L; else d = clamp(d, 0, L);
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const seg = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / seg;
    const a = pts[lo], b = pts[hi];
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  function subPath(g, d0, d1) {
    const p = new Path2D(), { pts, cum } = g;
    const s = pathAt(g, d0);
    p.moveTo(s.x, s.y);
    for (let i = 0; i < pts.length; i++) if (cum[i] > d0 && cum[i] < d1) p.lineTo(pts[i][0], pts[i][1]);
    const e = pathAt(g, d1);
    p.lineTo(e.x, e.y);
    return p;
  }
  function ribbonHead(el) {
    const th = el.thickness || 60;
    return el.line ? Math.max(10, th * 4.2) : th * 1.1;
  }
  function drawRibbon(ctx, el) {
    const g = ribbonGeom(el);
    const th = Math.max(0.5, el.thickness || 60);
    const L = g.L;
    const frac = el.drawFrac == null ? 1 : clamp(el.drawFrac, 0, 1);
    if (frac <= 0.004) return;
    const head = ribbonHead(el);
    const end = L * frac;
    const d0 = el.arrowStart && !g.closed ? head * 0.85 : 0;
    const d1 = el.arrowEnd && !g.closed ? Math.max(d0, end - head * 0.85) : end;
    const path = g.closed && frac >= 1 && !el.arrowEnd ? (() => { const p = new Path2D(); g.pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; })() : subPath(g, d0, d1);
    const col = el.color || '#e9f07a';
    const bw = (el.border && el.border.width) || 0;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = el.ends === 'flat' ? 'butt' : 'round';
    if (el.dash) ctx.setLineDash([th * el.dash, th * el.dash * (el.line ? 1.4 : 0.6)]);
    if (bw > 0 && !el.line) { ctx.lineWidth = th + bw * 2; ctx.strokeStyle = el.border.color || '#111'; ctx.stroke(path); }
    if (!isClear(col)) { ctx.lineWidth = th; ctx.strokeStyle = col; ctx.stroke(path); }
    ctx.setLineDash([]);
    // arrowheads
    const headAt = (d, dir) => {
      const p = pathAt(g, d), a = p.ang + (dir < 0 ? Math.PI : 0);
      const hw = el.line ? head * 0.42 : th * 1.05, hl = head;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      ctx.beginPath();
      if (el.line && el.headStyle !== 'solid') {
        ctx.moveTo(-hl, -hw); ctx.lineTo(0, 0); ctx.lineTo(-hl, hw);
        ctx.lineWidth = th; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      } else {
        ctx.moveTo(0, 0); ctx.lineTo(-hl, -hw); ctx.lineTo(-hl, hw); ctx.closePath();
        if (bw > 0 && !el.line) { ctx.lineWidth = bw * 2; ctx.strokeStyle = el.border.color || '#111'; ctx.stroke(); }
        ctx.fillStyle = col; ctx.fill();
      }
      ctx.restore();
    };
    if (el.arrowEnd && !g.closed && frac > 0.02) headAt(end, 1);
    if (el.arrowStart && !g.closed && frac > 0.02) headAt(0, -1);
    // text riding the path
    let txt = el.text || '';
    if (el.uppercase) txt = txt.toUpperCase();
    txt = txt.replace(/\s*\n\s*/g, ' ');
    if (txt.trim() && el.fontSize > 0) {
      const size = el.fontSize;
      const font = fontFor(el.fontFamily || 'Space Mono', el.fontWeight || 700, !!el.italic, size);
      const m = metrics(fontFor(el.fontFamily || 'Space Mono', el.fontWeight || 700, !!el.italic, 100));
      const ls = (el.letterSpacing || 0) * size;
      const unitStr = el.repeat ? txt + (el.sep ?? '   ✦   ') : txt;
      const chars = [...unitStr];
      const meas = measurer(mctx, font, 0);
      const pos = [], cw = [];
      let prefix = '';
      for (let i = 0; i < chars.length; i++) { pos.push(meas.raw(prefix) + ls * i); prefix += chars[i]; }
      const unitW = meas.raw(unitStr) + ls * chars.length;
      for (let i = 0; i < chars.length; i++) cw.push((i < chars.length - 1 ? pos[i + 1] - ls : meas.raw(unitStr)) - pos[i]);
      const flow = el.flowShift || 0;
      let starts;
      if (el.repeat) {
        const first = ((el.offset || 0) * L + flow * unitW) % unitW;
        starts = [];
        for (let s0 = first - unitW; s0 < L + unitW; s0 += unitW) starts.push(s0);
      } else {
        const tw = unitW - ls;
        let s0 = el.align === 'start' ? (el.offset || 0) * L + size * 0.4 : (L - tw) / 2 + (el.offset || 0) * L;
        if (flow) s0 = ((s0 + flow * L) % L + L) % L - (g.closed ? 0 : tw * 0);
        starts = [s0];
      }
      ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = el.textColor || '#111';
      const lift = m.cap * size / 2 + (el.textShift || 0) * size;
      const flip = !!el.flip;
      const lim = end;
      for (const s0 of starts) {
        for (let i = 0; i < chars.length; i++) {
          if (chars[i] === ' ') continue;
          let d = s0 + pos[i] + cw[i] / 2;
          if (g.closed) d = ((d % L) + L) % L;
          else if (d < -cw[i] || d > lim + cw[i] * 0.2) continue;
          if (!g.closed && (d < 0 || d > lim)) continue;
          const pd = flip ? L - d : d;
          const p = pathAt(g, pd);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.ang + (flip ? Math.PI : 0));
          ctx.fillText(chars[i], -cw[i] / 2, lift);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  /* ───────────────────────── camera overlays ───────────────────────── */

  R.CAMERA_STYLES = { iphone: 'Phone camera', camcorder: 'Camcorder', minimal: 'Viewfinder' };
  // a rounded frame whose sides bow outwards, like a wide lens seen on screen
  function barrelPath(w, h, ins, bulge, rad) {
    const p = new Path2D(), x0 = ins, y0 = ins, x1 = w - ins, y1 = h - ins;
    p.moveTo(x0 + rad, y0);
    p.quadraticCurveTo(w / 2, y0 - bulge, x1 - rad, y0);
    p.quadraticCurveTo(x1, y0, x1, y0 + rad);
    p.quadraticCurveTo(x1 + bulge, h / 2, x1, y1 - rad);
    p.quadraticCurveTo(x1, y1, x1 - rad, y1);
    p.quadraticCurveTo(w / 2, y1 + bulge, x0 + rad, y1);
    p.quadraticCurveTo(x0, y1, x0, y1 - rad);
    p.quadraticCurveTo(x0 - bulge, h / 2, x0, y0 + rad);
    p.quadraticCurveTo(x0, y0, x0 + rad, y0);
    p.closePath();
    return p;
  }
  function drawCamera(ctx, el) {
    const w = el.width, h = el.height, u = Math.min(w, h) / 1080;
    const style = el.style || 'iphone';
    const col = el.color || '#ffffff', acc = el.accent || '#ffd60a';
    const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
    ctx.save();
    if (el.lens) {
      const m = Math.min(w, h);
      const p = barrelPath(w, h, m * 0.035, m * 0.03, m * 0.11);
      const outer = new Path2D(); outer.rect(-2, -2, w + 4, h + 4); outer.addPath(p);
      ctx.fillStyle = el.lensColor || '#000000'; ctx.fill(outer, 'evenodd');
      // soft inner shading at the lens edge
      ctx.save(); ctx.clip(p);
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.hypot(w, h) * 0.55);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    const thin = Math.max(1, 1.6 * u);
    if (el.grid) {
      ctx.strokeStyle = rgba(col, 0.42); ctx.lineWidth = thin;
      ctx.beginPath();
      for (const f of [1 / 3, 2 / 3]) { ctx.moveTo(w * f, 0); ctx.lineTo(w * f, h); ctx.moveTo(0, h * f); ctx.lineTo(w, h * f); }
      ctx.stroke();
    }
    const brackets = (x0, y0, x1, y1, len, lw, c) => {
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath();
      for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
        ctx.moveTo(x + sx * len, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * len);
      }
      ctx.stroke();
    };
    const font = (wt, px, fam) => fontFor(fam || el.fontFamily || 'Inter', wt, false, px);
    const label = (t, x, y, f, c, align = 'center', ls = 0) => {
      ctx.font = f; ctx.fillStyle = c; ctx.textBaseline = 'middle';
      if (!ls) { ctx.textAlign = align; ctx.fillText(t, x, y); return; }
      ctx.textAlign = 'left';
      const tw = ctx.measureText(t).width + ls * ([...t].length - 1);
      drawLine(ctx, t, align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x, y, ls, 'fill');
    };
    if (style === 'iphone') {
      if (el.brackets !== false) brackets(w * 0.045, h * 0.07, w * 0.955, h * 0.79, 28 * u, 3 * u, rgba(col, 0.85));
      // zoom bubbles
      const zooms = list(el.zooms ?? '0.5, 1×, 2, 5'), za = el.activeZoom ?? 1;
      const zy = h * 0.745, zgap = 88 * u, zx0 = w / 2 - (zooms.length - 1) * zgap / 2;
      zooms.forEach((z, i) => {
        const x = zx0 + i * zgap, on = i === za;
        ctx.fillStyle = 'rgba(20,20,20,0.38)';
        ctx.beginPath(); ctx.arc(x, zy, (on ? 34 : 27) * u, 0, TAU); ctx.fill();
        label(z, x, zy + 1 * u, font(on ? 700 : 600, (on ? 25 : 21) * u), on ? acc : col);
      });
      // mode strip, centred on the active mode
      const modes = list(el.modes ?? 'CINEMATIC, VIDEO, PHOTO, PORTRAIT, PANO'), ma = clamp(el.activeMode ?? 2, 0, Math.max(0, modes.length - 1));
      const mf = font(600, 25 * u), mls = 1.5 * u, gap = 52 * u, my = h * 0.85;
      ctx.font = mf;
      const widths = modes.map(m => ctx.measureText(m).width + mls * ([...m].length - 1));
      let x = w / 2 - widths[ma] / 2;
      for (let i = ma - 1; i >= 0; i--) x -= widths[i] + gap;
      modes.forEach((m, i) => { label(m, x, my, mf, i === ma ? acc : rgba(col, 0.92), 'left', mls); x += widths[i] + gap; });
      // shutter, last-shot thumbnail, flip
      const sy = h * 0.93;
      ctx.lineWidth = 6 * u; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(w / 2, sy, 56 * u, 0, TAU); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(w / 2, sy, 46 * u, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(20,20,20,0.38)';
      ctx.beginPath(); ctx.arc(w * 0.82, sy, 38 * u, 0, TAU); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 3.5 * u; ctx.lineCap = 'round';
      const fx = w * 0.82, r = 15 * u;
      ctx.beginPath(); ctx.arc(fx, sy, r, Math.PI * 1.05, Math.PI * 1.85); ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, sy, r, Math.PI * 0.05, Math.PI * 0.85); ctx.stroke();
      const tip = (a, dir) => { const px = fx + Math.cos(a) * r, py = sy + Math.sin(a) * r; ctx.beginPath(); ctx.moveTo(px - 6 * u, py - dir * 5 * u); ctx.lineTo(px, py); ctx.lineTo(px + 7 * u * dir, py - 2 * u); ctx.stroke(); };
      tip(Math.PI * 1.85, -1); tip(Math.PI * 0.85, 1);
      if (el.thumb !== false) { ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill(rrect(new Path2D(), w * 0.18 - 32 * u, sy - 32 * u, 64 * u, 64 * u, 10 * u)); }
    } else if (style === 'camcorder') {
      const vt = (px) => fontFor(el.fontFamily || 'VT323', 400, false, px);
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 6 * u * deviceScale(ctx);
      brackets(w * 0.06, h * 0.06, w * 0.94, h * 0.94, 46 * u, 4 * u, rgba(col, 0.9));
      ctx.fillStyle = el.recColor || '#ff3b30';
      ctx.beginPath(); ctx.arc(w * 0.1, h * 0.105, 13 * u, 0, TAU); ctx.fill();
      label(el.rec ?? 'REC', w * 0.1 + 26 * u, h * 0.105, vt(62 * u), col, 'left');
      label(el.timecode ?? '00:12:47', w * 0.9, h * 0.105, vt(62 * u), col, 'right');
      // battery
      const bx = w * 0.9 - 70 * u, by = h * 0.105 + 44 * u;
      ctx.strokeStyle = col; ctx.lineWidth = 3 * u; ctx.strokeRect(bx, by, 60 * u, 28 * u);
      ctx.fillStyle = col; ctx.fillRect(bx + 60 * u, by + 8 * u, 6 * u, 12 * u);
      for (let i = 0; i < 3; i++) ctx.fillRect(bx + (6 + i * 18) * u, by + 6 * u, 13 * u, 16 * u);
      label(el.date ?? 'OCT 10 2026', w * 0.1, h * 0.895, vt(56 * u), col, 'left');
      label(el.mode ?? 'SP ▶', w * 0.9, h * 0.895, vt(56 * u), col, 'right');
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba(col, 0.8); ctx.lineWidth = 3 * u;
      ctx.beginPath(); ctx.moveTo(w / 2 - 24 * u, h / 2); ctx.lineTo(w / 2 + 24 * u, h / 2); ctx.moveTo(w / 2, h / 2 - 24 * u); ctx.lineTo(w / 2, h / 2 + 24 * u); ctx.stroke();
      if (el.scanlines) {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        for (let y = 0; y < h; y += 6 * u) ctx.fillRect(0, y, w, 2.5 * u);
      }
    } else {
      brackets(w * 0.06, h * 0.06, w * 0.94, h * 0.94, 40 * u, 3 * u, rgba(col, 0.9));
      const fs = Math.min(w, h) * 0.16;
      ctx.strokeStyle = acc; ctx.lineWidth = 2.5 * u;
      ctx.strokeRect(w / 2 - fs / 2, h / 2 - fs / 2, fs, fs);
      ctx.fillStyle = acc;
      for (const [x, y] of [[w / 2, h / 2 - fs / 2], [w / 2, h / 2 + fs / 2], [w / 2 - fs / 2, h / 2], [w / 2 + fs / 2, h / 2]]) ctx.fillRect(x - 1.5 * u - (y === h / 2 ? (x < w / 2 ? 0 : 8 * u) : 0), y - 1.5 * u - (x === w / 2 ? (y < h / 2 ? 0 : 8 * u) : 0), y === h / 2 ? 11 * u : 3 * u, x === w / 2 ? 11 * u : 3 * u);
      label(el.zoomLabel ?? '1×', w / 2, h * 0.88, font(700, 26 * u), acc);
    }
    ctx.restore();
  }

  /* ───────────────────────── speed flashes ─────────────────────────
     el = { pack, images[], rate, blur, angle, drift, zoom, overlap, strobe, gaps, tone, tint, contrast, seed, still }
     Full-frame action photos, motion-blurred, cutting fast over whatever sits below the layer. */
  function flashSources(el) {
    const F = window.StudioFlashes, out = [];
    const pk = F && el.pack !== 'mine' ? (F.PACKS[el.pack || 'hustle'] || F.PACKS.hustle) : null;
    if (pk) for (const id of pk.ids) if (F.IMG[id]) out.push({ key: 'fl:' + id, src: F.IMG[id].src });
    for (const a of el.images || []) if (assets[a]) out.push({ key: a, src: assets[a] });
    return out;
  }
  R.flashSources = flashSources;
  R.isTimeVarying = el => el.type === 'flashes' || el.type === 'captions' || R.isSeq(el) || (el.type === 'image' && R.isVideoAsset(el.assetId)) || !!(el.typing && el.typing.wipe);
  const permCache = new Map();
  function flashPerm(seed, n) {
    const key = seed + ':' + n;
    let p = permCache.get(key);
    if (!p) {
      p = [...Array(n).keys()];
      const r = rng(seed);
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
      permCache.set(key, p);
    }
    return p;
  }
  function flashFilters(el) {
    const tone = el.tone || 'color';
    return {
      motion: (el.blur ?? 60) * 2, motionAngle: el.angle || 0, contrast: el.contrast || 0,
      grayscale: tone === 'mono' ? 100 : 0, duotone: tone === 'tint', duoDark: '#050505', duoLight: el.tint || '#ff5a1f',
      saturation: tone === 'color' ? (el.saturation || 0) : 0,
    };
  }
  function drawFlashFrame(ctx, el, item, p, k, alpha) {
    const e = loadImage(item.src, imgCache, item.key);
    if (!e.ok) return;
    const src = filteredSource(item.key, e.img, flashFilters(el));
    const w = el.width, h = el.height, iw = iwOf(src), ih = ihOf(src);
    // each cut drifts along the blur direction (alternating sides) while pushing in a touch
    const sc = Math.max(w / iw, h / ih) * (1.12 + (el.zoom ?? 30) / 100 * 0.22 * p);
    const a = (el.angle || 0) * Math.PI / 180, dir = k % 2 ? -1 : 1;
    const d = (p - 0.5) * (el.drift ?? 50) / 100 * Math.max(w, h) * 0.12 * dir;
    const dw = iw * sc, dh = ih * sc;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(src, (w - dw) / 2 + Math.cos(a) * d, (h - dh) / 2 + Math.sin(a) * d, dw, dh);
    ctx.restore();
  }
  function drawFlashes(ctx, el, env) {
    const list = flashSources(el), n = list.length, w = el.width, h = el.height;
    if (!n) {
      if (env.editor) {
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.strokeRect(6, 6, w - 12, h - 12);
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = fontFor('Inter', 600, false, Math.max(18, w * 0.03)); ctx.textAlign = 'center';
        ctx.fillText('Speed flashes — add photos or pick a pack', w / 2, h / 2); ctx.restore();
      }
      return;
    }
    const t = 'time' in env ? env.time : R.playTime;
    const rate = clamp(el.rate || 8, 1, 30);
    let k, p;
    if (t == null) { k = el.still || 0; p = 0.5; } else { const u = Math.max(0, t) * rate; k = Math.floor(u); p = u - k; }
    const seed = hashStr(el.id || 'flash') + (el.seed || 0) * 7919;
    const perm = flashPerm(seed, n), at = j => list[perm[((j % n) + n) % n]];
    // gaps leave some beats empty so the photo underneath breathes
    const gap = j => t != null && (el.gaps || 0) > 0 && rng(seed + j * 104729)() < el.gaps / 100;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    if (!gap(k)) drawFlashFrame(ctx, el, at(k), p, k, 1);
    const ov = (el.overlap || 0) / 100;
    if (t != null && ov > 0 && p > 1 - ov && !gap(k + 1)) drawFlashFrame(ctx, el, at(k + 1), p - 1, k + 1, ((p - (1 - ov)) / ov) * 0.85);
    if (t != null && (el.strobe || 0) > 0 && p < 0.3 && !gap(k)) {
      ctx.globalAlpha *= el.strobe / 100 * (1 - p / 0.3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  /* ───────────────────────── element dispatch ───────────────────────── */

  function bleed(el) {
    const lb = el.lblur || {};
    return bleedCore(el) + (lb.gauss || 0) * 2.5 + (lb.motion || 0) * 0.6 + R.textFxPad(el) + (el.type === 'image' ? 0 : R.layerBlurPad(el));
  }
  function bleedCore(el) {
    const m = Math.max(el.width, el.height);
    switch (el.type) {
      case 'text': return ((el.bg && el.bg.padX) || 0) + ((el.stroke && el.stroke.width) || 0) * 2 + (el.echo && el.echo.on ? el.fontSize * 0.4 : 0) + 8;
      case 'sticker': case 'image': return ((el.outline && el.outline.on && el.outline.width) || 0) * 1.6 + 8;
      case 'shape': return (el.strokeWidth || 0) + 6;
      case 'ribbon': return Math.max(el.thickness || 0, (el.fontSize || 0) * 1.2) / 2 + ((el.border && el.border.width) || 0) + ribbonHead(el) * 0.6 + 8;
      case 'camera': return 6;
      case 'nature': return 4;
      case 'flashes': return 2;
      default: return m * 0.05 + 6;
    }
  }

  // images, stickers and shapes flip their own content; everything else is mirrored as a whole
  const SELF_FLIP = { image: 1, sticker: 1, shape: 1 };
  function drawCore(ctx, el, env) {
    if ((el.flipX || el.flipY) && !SELF_FLIP[el.type]) {
      ctx.save();
      ctx.translate(el.flipX ? el.width : 0, el.flipY ? el.height : 0);
      ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
      drawCoreInner(ctx, el, env);
      ctx.restore();
      return;
    }
    drawCoreInner(ctx, el, env);
  }
  function drawCoreInner(ctx, el, env) {
    switch (el.type) {
      case 'text': drawText(ctx, el, env); break;
      case 'image': drawImageEl(ctx, el, env); break;
      case 'sticker': drawSticker(ctx, el, env); break;
      case 'shape': drawShape(ctx, el, env); break;
      case 'calendar': drawCalendar(ctx, el, env); break;
      case 'badge': drawBadge(ctx, el, env); break;
      case 'checklist': drawChecklist(ctx, el, env); break;
      case 'ribbon': drawRibbon(ctx, el, env); break;
      case 'camera': drawCamera(ctx, el, env); break;
      case 'nature': if (window.StudioNature) window.StudioNature.draw(ctx, el); break;
      case 'flashes': drawFlashes(ctx, el, env); break;
      case 'captions': if (window.StudioCaptions) window.StudioCaptions.draw(ctx, el, env); break;
    }
  }

  /* ───────────────────────── animation ───────────────────────── */

  R.playTime = null;
  R.animDoc = null;
  R.ANIM_LOOPS = {
    none: 'None', wiggle: 'Stop-motion wiggle', float: 'Float', jiggle: 'Jiggle', sway: 'Sway', swing: 'Swing',
    spin: 'Spin', pulse: 'Pulse', bounce: 'Bounce', shake: 'Shake', orbit: 'Orbit', blink: 'Blink', drift: 'Drift across', flow: 'Text flow (paths)',
  };
  R.ANIM_ENTER = {
    none: 'None', pop: 'Pop in', land: 'Toss in', fade: 'Fade in', rise: 'Slide up', drop: 'Drop in', left: 'Slide from left',
    right: 'Slide from right', zoom: 'Zoom in', focus: 'Blur in (focus)', spinIn: 'Spin in', typewriter: 'Typewriter', wipe: 'Wipe', draw: 'Draw on (paths)',
    slam: 'Letters slam in', lettersUp: 'Letters rise', lettersDrop: 'Letters drop', lettersFade: 'Letters fade in', lettersBounce: 'Letters bounce in',
    captions: 'Captions (line by line)', roll: 'Roll through lines', words: 'Word by word',
    build: 'Word build', shuffle: 'Blur shuffle', sweep: 'Select sweep', wall: 'Word wall',
  };
  const LOOP_PERIOD = { float: 3, jiggle: 0.9, sway: 3, swing: 2.2, spin: 6, pulse: 1.6, bounce: 1.2, shake: 0.5, orbit: 4, blink: 1.4, flow: 4 };
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const easeBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  const easeBounce = p => {
    const n = 7.5625, d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
    return n * (p -= 2.625 / d) * p + 0.984375;
  };
  R.hasAnim = el => el.type === 'flashes' || el.type === 'captions' || !!(el.sfx && styleOn(el.sfx) && window.StudioStyles.moves(el.sfx)) || R.isSeq(el) || !!(el.track && el.track.pts && el.track.pts.length) || !!(el.tfx && el.tfx.style && el.tfx.style !== 'none' && (el.tfx.style === 'vision' ? el.tfx.move !== false : el.tfx.move)) || !!((el.anim && ((el.anim.loop && el.anim.loop !== 'none') || (el.anim.enter && el.anim.enter !== 'none'))) || R.hasTiming(el) || (el.typing && el.typing.caret !== false && el.typing.blink !== false));
  R.hasTiming = el => !!(el.time && ((el.time.start || 0) > 0 || el.time.end != null || (el.time.cycle && el.time.cycle.count > 1)));
  // cuts: a layer can be shown only for part of the video, or take turns with others
  R.visibleAt = function (el, t) {
    const tm = el.time;
    if (!tm) return true;
    // the still view shows every cut at once, except a Vox explainer, which shows its first scene
    if (t == null) return !((el.vox || el.clip) && tm.start > 0);
    const s0 = tm.start || 0, e0 = tm.end;
    if (t < s0 - 1e-6) return false;
    if (e0 != null && e0 > s0 && t >= e0) return false;
    const cy = tm.cycle;
    if (cy && cy.count > 1) {
      const k = Math.floor((t - s0) / Math.max(0.02, cy.slot || 0.15));
      return ((k % cy.count) + cy.count) % cy.count === (cy.index || 0) % cy.count;
    }
    return true;
  };
  function animState(el, t, doc) {
    const an = el.anim || {}, D = Math.max(0.5, (doc && doc.anim && doc.anim.duration) || 5);
    const st = { dx: 0, dy: 0, rot: 0, sc: 1, alpha: 1, px: el.width / 2, py: el.height / 2, chars: null, reveal: 1, flow: null, draw: null, letters: null, caption: null, mblur: 0, mang: 0, gblur: 0, seq: null, wfx: null };
    const amt = an.amount ?? 1, spd = an.speed ?? 1, m = Math.min(el.width, el.height);
    const tl = ((t % D) + D) % D;
    const loop = an.loop || 'none';
    if (loop !== 'none') {
      const phase = an.sync ? 0 : (hashStr(el.id || 'a') % 1000) / 1000;
      if (loop === 'drift') {
        // a steady glide across the whole video (scrolling walls, conveyor strips), or across anim.span = [start, end] only
        // (a parallax layer moves through its own scene); ds grows the layer too, so nearer layers swell faster on a dolly
        const k = an.span ? clamp((tl - an.span[0]) / Math.max(0.01, an.span[1] - an.span[0]), 0, 1) : tl / D;
        st.dx = (an.dx ?? -300) * k * amt; st.dy = (an.dy ?? 0) * k * amt;
        if (an.ds) st.sc *= 1 + an.ds * k * amt;
      } else if (loop === 'wiggle') {
        const N = Math.max(1, Math.round(D * 8 * spd));
        const k = Math.floor(tl / D * N) % N;
        const r = rng(hashStr(el.id || 'w') + k * 7919);
        st.dx = (r() - 0.5) * m * 0.035 * amt; st.dy = (r() - 0.5) * m * 0.035 * amt; st.rot = (r() - 0.5) * 5 * amt;
      } else {
        const base = LOOP_PERIOD[loop] / spd;
        const P = D / Math.max(1, Math.round(D / base));
        const u = tl / P + phase, ph = u * TAU;
        switch (loop) {
          case 'float': st.dy = Math.sin(ph) * m * 0.06 * amt; break;
          case 'jiggle': st.rot = Math.sin(ph) * 6 * amt; st.sc = 1 + Math.sin(ph * 2) * 0.02 * amt; break;
          case 'sway': st.rot = Math.sin(ph) * 4 * amt; st.dx = Math.sin(ph) * m * 0.03 * amt; break;
          case 'swing': st.rot = Math.sin(ph) * 10 * amt; st.py = 0; break;
          case 'spin': st.rot = (u % 1) * 360 * (an.reverse ? -1 : 1); break;
          case 'pulse': st.sc = 1 + (0.5 + 0.5 * Math.sin(ph)) * 0.08 * amt; break;
          case 'bounce': st.dy = -Math.abs(Math.sin(ph / 2)) * m * 0.14 * amt; break;
          case 'shake': st.dx = Math.sin(ph) * m * 0.025 * amt; break;
          case 'orbit': st.dx = Math.cos(ph) * m * 0.06 * amt; st.dy = Math.sin(ph) * m * 0.06 * amt; break;
          case 'blink': st.alpha = (u % 1) < 0.78 ? 1 : 0.12; break;
          case 'flow': st.flow = (u - phase) * (an.reverse ? -1 : 1); break;
        }
      }
    }
    const enter = an.enter || 'none';
    if (enter !== 'none') {
      // typing runs at a steady characters-per-second rate; other entrances take ~0.6 s
      const nch = enter === 'typewriter' && el.type === 'text' ? [...(el.text || '')].length : 0;
      const dur = nch ? Math.max(0.2, nch / (14 * spd)) : 0.6 / spd, p = clamp((tl - (an.delay || 0)) / dur, 0, 1), e = easeOut(p);
      switch (enter) {
        case 'pop': st.sc *= Math.max(0, easeBack(p)); st.alpha *= Math.min(1, p * 3); break;
        case 'fade': st.alpha *= e; break;
        // anim.dist (px) moves every layer of a group the same distance, so a card and its words travel together
        case 'rise': st.dy += (1 - e) * (an.dist ?? m * 0.4); st.alpha *= e; st.mblur = (1 - e) * m * 0.25; st.mang = 90; break;
        case 'drop': st.dy -= (1 - easeBounce(p)) * (an.dist ?? m * 1.2); st.alpha *= Math.min(1, p * 4); st.mblur = (1 - p) * m * 0.4; st.mang = 90; break;
        case 'left': st.dx -= (1 - e) * (an.dist ?? m * 1.2); st.alpha *= e; st.mblur = (1 - e) * m * 0.6; break;
        case 'right': st.dx += (1 - e) * (an.dist ?? m * 1.2); st.alpha *= e; st.mblur = (1 - e) * m * 0.6; break;
        case 'slam': case 'lettersUp': case 'lettersDrop': case 'lettersFade': case 'lettersBounce':
          if (el.type === 'text') st.letters = { t: tl - (an.delay || 0), spd, style: enter }; else st.alpha *= e;
          break;
        case 'captions': if (el.type === 'text') st.caption = Math.max(0, Math.floor((tl - (an.delay || 0)) / (0.8 / spd))); break;
        case 'roll': case 'words': if (el.type === 'text') st.seq = seqState(el, tl - (an.delay || 0), spd, enter, an.accel); break;
        case 'build': case 'shuffle': case 'sweep': case 'wall': if (el.type === 'text') st.wfx = { mode: enter, t: tl - (an.delay || 0), spd }; else st.alpha *= e; break;
        case 'zoom': st.sc *= 1.6 - 0.6 * e; st.alpha *= e; break;
        // out of focus to sharp, like a lens pulling focus onto the word
        case 'focus': { const q = clamp((tl - (an.delay || 0)) / (0.75 / spd), 0, 1), f = 1 - Math.pow(1 - q, 2.2); st.alpha *= Math.min(1, q * 1.6); st.gblur = (1 - f) * m * 0.22 * amt; st.sc *= 1 + (1 - f) * 0.04; break; }
        case 'land': {
          // tossed onto a pile: comes in big and turned, settles flat with a little bounce
          const q = clamp((tl - (an.delay || 0)) / (0.45 / spd), 0, 1), k = easeOut(q);
          st.sc *= 1 + (1 - k) * 0.5 + Math.sin(Math.min(1, q * 1.2) * Math.PI) * 0.015; st.rot += (1 - k) * (an.spin ?? 14); st.alpha *= Math.min(1, q * 4);
          st.dy -= (1 - k) * m * 0.08;
          break;
        }
        case 'spinIn': st.rot -= (1 - e) * 200; st.sc *= e; break;
        case 'typewriter': {
          const P = el.type === 'text' ? typePlanFor(doc, el) : null;
          if (P) { st.chars = P.charsAt(t); if (P.phrases) st.view = P.view(st.chars); }
          else if (el.type === 'text') st.chars = Math.floor(p * nch + 1e-6); else st.reveal = p;
          break;
        }
        case 'wipe': st.reveal = e; break;
        case 'draw': if (el.type === 'ribbon') st.draw = e; else st.reveal = e; break;
      }
    }
    return st;
  }
  R.animState = animState;
  // sequence modes show one piece of the text at a time: lines (captions, roll) or words
  const SEQ = new Set(['captions', 'roll', 'words']);
  R.seqPieces = function (el) {
    if (el.type !== 'text' || !el.anim || !SEQ.has(el.anim.enter)) return null;
    const t = String(el.text || '');
    const out = el.anim.enter === 'words' ? t.split(/\s+/) : t.split('\n');
    return out.map(x => x.trim()).filter(Boolean);
  };
  function seqState(el, tt, spd, mode, accel) {
    const pieces = R.seqPieces(el) || [];
    const n = pieces.length;
    if (!n) return null;
    const base = (mode === 'words' ? 0.42 : 0.7) / spd;
    // optional acceleration: early pieces linger, later ones fly past
    const slotOf = i => base * (accel ? Math.max(0.28, 1.6 - i * 0.22) : 1);
    let acc = 0, i = 0;
    if (tt < 0) return { pieces, i: 0, k: 0, enterK: 1 };
    while (i < n - 1 && acc + slotOf(i) <= tt) { acc += slotOf(i); i++; }
    const slot = slotOf(i), frac = clamp((tt - acc) / slot, 0, 1);
    const tw = mode === 'roll' ? Math.min(0.45, 0.12 / slot + 0.15) : 0;
    const k = mode === 'roll' && i < n - 1 && frac > 1 - tw ? (frac - (1 - tw)) / tw : 0;
    const enterK = mode === 'words' ? clamp((tt - acc) / Math.min(slot * 0.5, 0.2), 0, 1) : 1;
    return { pieces, i, k, enterK, first: i === 0 };
  }

  function onePiece(el, piece) {
    const one = Object.assign({}, el, { text: piece, autoWidth: false, width: el.width });
    one._yShift = (el.height - layoutText(one).boxH) / 2;
    return one;
  }
  /* ── motion tracking: a layer pinned to something in a video ──
     el.track = { src: 'bg' | <video layer id>, t0, dt, pts: [[u, v, s, r], …], ref, scale, rotate } — the tracked spot in
     the video's own picture (u, v as fractions), its size and turn relative to the reference frame, sampled every dt
     seconds of the clip from t0. The layer sits where it was placed on the reference frame (the still the editor shows)
     and follows the spot from there: moved, scaled and turned with it. */
  // where a point of a video's picture lands on the canvas
  R.videoSpaceMap = function (doc, src) {
    const W = doc.width, H = doc.height;
    if (src === 'bg') {
      const bg = doc.background || {}, img = bg.assetId && assetImage(bg.assetId);
      if (!img) return null;
      const iw = iwOf(img), ih = ihOf(img), c = bg.crop || {};
      const sc = (c.fit ? Math.min : Math.max)(W / iw, H / ih) * (c.zoom || 1), dw = iw * sc, dh = ih * sc;
      const dx = (W - dw) * (c.x ?? 0.5), dy = (H - dh) * (c.y ?? 0.5), fx = u => bg.flipX ? 1 - u : u;
      return { toCanvas: (u, v) => ({ x: dx + fx(u) * dw, y: dy + v * dh }), fromCanvas: (x, y) => ({ u: fx((x - dx) / dw), v: (y - dy) / dh }), unit: Math.max(dw, dh), rot: 0, vd: bg.video, start: 0, assetId: bg.assetId };
    }
    const el = (doc.elements || []).find(e => e.id === src);
    if (!el || el.type !== 'image') return null;
    const m = R.imageBoxMap(el);
    if (!m) return null;
    const a = (el.rotation || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const toC = p => ({ x: el.x + p.x * ca - p.y * sa, y: el.y + p.x * sa + p.y * ca });
    const fromC = (x, y) => { const dx = x - el.x, dy = y - el.y; return m.toImg(dx * ca + dy * sa, -dx * sa + dy * ca); };
    return { toCanvas: (u, v) => toC(m.toBox(u, v)), fromCanvas: (x, y) => { const q = fromC(x, y); return { u: q.u, v: q.v }; }, unit: m.unit, rot: el.rotation || 0, vd: el.video, start: (el.time && el.time.start) || 0, assetId: el.assetId };
  };
  // jitter control: a zero-lag Gaussian over time (the whole path is known, so nothing trails behind). Position is only
  // lightly smoothed so real camera shake is still followed; size and turn, which wobble more, get more.
  const seriesCache = new WeakMap();
  function trackSeries(tr) {
    const k = tr.steady ?? 10, hit = seriesCache.get(tr);
    if (hit && hit.k === k) return hit.pts;
    const P = tr.pts, n = P.length, W = P[0].length;
    const sig = c => tr.mode === 'plane' ? 0.4 + k / 100 * 1.6 : (c < 2 ? 0.3 + k / 100 * 1.2 : 0.8 + k / 100 * 5);
    const out = P.map(r => r.slice());
    for (let c = 0; c < W; c++) {
      const sg = sig(c), R2 = Math.ceil(sg * 3);
      if (sg < 0.35) continue;
      const wts = []; for (let j = -R2; j <= R2; j++) wts.push(Math.exp(-(j * j) / (2 * sg * sg)));
      for (let i = 0; i < n; i++) {
        let s = 0, ws = 0;
        for (let j = -R2; j <= R2; j++) { const q = i + j; if (q < 0 || q >= n || !P[q]) continue; s += P[q][c] * wts[j + R2]; ws += wts[j + R2]; }
        if (ws) out[i][c] = s / ws;
      }
    }
    seriesCache.set(tr, { k, pts: out });
    return out;
  }
  // the tracked target at a moment of the clip, interpolated between samples
  function trackSample(tr, m) {
    const P = trackSeries(tr), n = P.length;
    if (!n) return null;
    const f = clamp((m - tr.t0) / tr.dt, 0, n - 1), i = Math.floor(f), k = f - i, a = P[i], b = P[Math.min(n - 1, i + 1)];
    return a.map((v, c) => v + (b[c] - v) * k);
  }
  // 4-point perspective (homography) taking quad A to quad B, as a 3×3 row-major array
  function quadH(A, B) {
    const M = [], v = [];
    for (let i = 0; i < 4; i++) {
      const { x, y } = A[i], X = B[i].x, Y = B[i].y;
      M.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); v.push(X);
      M.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); v.push(Y);
    }
    for (let i = 0; i < 8; i++) {
      let p = i; for (let r = i + 1; r < 8; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
      [M[i], M[p]] = [M[p], M[i]]; [v[i], v[p]] = [v[p], v[i]];
      if (Math.abs(M[i][i]) < 1e-12) return null;
      for (let r = i + 1; r < 8; r++) { const f = M[r][i] / M[i][i]; for (let c = i; c < 8; c++) M[r][c] -= f * M[i][c]; v[r] -= f * v[i]; }
    }
    const h = new Array(8);
    for (let i = 7; i >= 0; i--) { let s2 = v[i]; for (let c = i + 1; c < 8; c++) s2 -= M[i][c] * h[c]; h[i] = s2 / M[i][i]; }
    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  }
  const hpt = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return { x: (H[0] * x + H[1] * y + H[2]) / w, y: (H[3] * x + H[4] * y + H[5]) / w }; };
  R.hpt = hpt;
  R.quadH = quadH;
  R.trackSampleAt = trackSample;
  // how a tracked layer is moved at time t: a canvas-space matrix (or a perspective H for planes) and its speed
  R.trackXform = function (el, t, doc) {
    const tr = el.track;
    if (!tr || !tr.pts || !tr.pts.length || t == null || !doc) return null;
    const map = R.videoSpaceMap(doc, tr.src);
    if (!map) return null;
    const e = assetVideo(map.assetId), v = e && e.ok ? e.v : null;
    if (!v || !v.duration) return null;
    const at = tt => trackSample(tr, R.videoTarget(map.vd, tt, v, map.start));
    // the reference is the still frame the layer was placed on, read from the same smoothed path
    const now = at(t), ref = trackSample(tr, R.videoTarget(map.vd, null, v, map.start));
    if (!now || !ref) return null;
    if (tr.mode === 'plane') {
      const quad = q => [0, 1, 2, 3].map(i => map.toCanvas(q[i * 2], q[i * 2 + 1]));
      const A = quad(ref), B = quad(now), H = quadH(A, B);
      if (!H) return null;
      const prev = at(Math.max(0, t - 1 / 30)), P0 = prev ? quad(prev) : B;
      const cA = B.reduce((s2, q) => ({ x: s2.x + q.x / 4, y: s2.y + q.y / 4 }), { x: 0, y: 0 }), cP = P0.reduce((s2, q) => ({ x: s2.x + q.x / 4, y: s2.y + q.y / 4 }), { x: 0, y: 0 });
      return { H, quad: B, vx: cA.x - cP.x, vy: cA.y - cP.y, scale: 1 };
    }
    const A = map.toCanvas(now[0], now[1]), A0 = map.toCanvas(ref[0], ref[1]);
    const ds = tr.scale === false ? 1 : now[2] / (ref[2] || 1), dr = tr.rotate === false ? 0 : now[3] - ref[3];
    const M = new DOMMatrix().translate(A.x, A.y).rotate(dr).scale(ds).translate(-A0.x, -A0.y);
    // speed over the last 1/30 s, in canvas units, for motion blur on fast moves
    const prev = at(Math.max(0, t - 1 / 30)), P0 = prev ? map.toCanvas(prev[0], prev[1]) : A;
    return { M, vx: A.x - P0.x, vy: A.y - P0.y, scale: ds };
  };
  // the picked target's outline on the canvas at time t (null = as picked, on the still frame)
  R.trackRegionAt = function (el, t, doc) {
    const tr = el.track;
    if (!tr || !tr.region) return null;
    const map = R.videoSpaceMap(doc, tr.src);
    if (!map) return null;
    let pts = tr.region.map(([u, v]) => map.toCanvas(u, v));
    const X = t != null ? R.trackXform(el, t, doc) : null;
    if (X) pts = pts.map(p => X.H ? hpt(X.H, p.x, p.y) : X.M.transformPoint(new DOMPoint(p.x, p.y)));
    return { mode: tr.pick || 'object', pts };
  };
  // draw a layer through a perspective: render it flat, then map it piece by piece (an affine per triangle)
  let warpBuf = null;
  function drawWarped(ctx, el, env, H) {
    const cur = ctx.getTransform(), own = new DOMMatrix().translate(el.x, el.y).rotate(el.rotation || 0), C = cur.multiply(own.inverse());
    const b = bleed(el), a = (el.rotation || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const cs = [[-b, -b], [el.width + b, -b], [el.width + b, el.height + b], [-b, el.height + b]].map(([x, y]) => ({ x: el.x + x * ca - y * sa, y: el.y + x * sa + y * ca }));
    const bx = Math.min(...cs.map(p => p.x)), by = Math.min(...cs.map(p => p.y)), bw = Math.max(...cs.map(p => p.x)) - bx, bh = Math.max(...cs.map(p => p.y)) - by;
    const k = clamp(Math.hypot(C.a, C.b) * 1.2, 0.5, Math.min(3, 3000 / Math.max(bw, bh, 1)));
    const W = Math.max(2, Math.ceil(bw * k)), Ht = Math.max(2, Math.ceil(bh * k));
    if (!warpBuf || warpBuf.width < W || warpBuf.height < Ht) warpBuf = canvas(Math.max(W, warpBuf ? warpBuf.width : 0), Math.max(Ht, warpBuf ? warpBuf.height : 0));
    const ox = warpBuf.getContext('2d');
    ox.setTransform(1, 0, 0, 1, 0, 0); ox.clearRect(0, 0, warpBuf.width, warpBuf.height);
    ox.setTransform(k, 0, 0, k, -bx * k, -by * k);
    ox.translate(el.x, el.y); ox.rotate(a);
    drawElement(ox, Object.assign({}, el, { track: null }), env);
    // a grid over the flat layer, each cell drawn as two triangles with their own affine map
    const N = 10, src = (i, j) => ({ x: bx + bw * i / N, y: by + bh * j / N });
    const dst = (i, j) => { const p = src(i, j); return hpt(H, p.x, p.y); };
    const tri = (s0, s1, s2, d0, d1, d2) => {
      // affine taking buffer pixels of s* to canvas d*
      const S0 = { x: (s0.x - bx) * k, y: (s0.y - by) * k }, S1 = { x: (s1.x - bx) * k, y: (s1.y - by) * k }, S2 = { x: (s2.x - bx) * k, y: (s2.y - by) * k };
      const den = (S1.x - S0.x) * (S2.y - S0.y) - (S2.x - S0.x) * (S1.y - S0.y);
      if (Math.abs(den) < 1e-9) return;
      const ma = ((d1.x - d0.x) * (S2.y - S0.y) - (d2.x - d0.x) * (S1.y - S0.y)) / den, mc = ((d2.x - d0.x) * (S1.x - S0.x) - (d1.x - d0.x) * (S2.x - S0.x)) / den;
      const mb = ((d1.y - d0.y) * (S2.y - S0.y) - (d2.y - d0.y) * (S1.y - S0.y)) / den, md = ((d2.y - d0.y) * (S1.x - S0.x) - (d1.y - d0.y) * (S2.x - S0.x)) / den;
      const me = d0.x - ma * S0.x - mc * S0.y, mf = d0.y - mb * S0.x - md * S0.y;
      // grow the clip a hair so neighbouring triangles meet without hairline gaps
      const cx = (d0.x + d1.x + d2.x) / 3, cy = (d0.y + d1.y + d2.y) / 3, g = 0.6 / Math.max(0.2, Math.hypot(C.a, C.b));
      const grow = p => { const dx = p.x - cx, dy = p.y - cy, L = Math.hypot(dx, dy) || 1; return { x: p.x + dx / L * g, y: p.y + dy / L * g }; };
      const [e0, e1, e2] = [grow(d0), grow(d1), grow(d2)];
      ctx.save();
      ctx.setTransform(C);
      ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.lineTo(e2.x, e2.y); ctx.closePath(); ctx.clip();
      ctx.transform(ma, mb, mc, md, me, mf);
      ctx.drawImage(warpBuf, 0, 0);
      ctx.restore();
    };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const s00 = src(i, j), s10 = src(i + 1, j), s01 = src(i, j + 1), s11 = src(i + 1, j + 1);
      const d00 = dst(i, j), d10 = dst(i + 1, j), d01 = dst(i, j + 1), d11 = dst(i + 1, j + 1);
      tri(s00, s10, s11, d00, d10, d11);
      tri(s00, s11, s01, d00, d11, d01);
    }
  }
  R.isTracked = el => !!(el.track && el.track.pts && el.track.pts.length);

  /* ── transitions between clips of a video edit ──
     A clip's transition overlaps the end of the clip before it (S.layoutClips sets clip._in on the incoming clip and
     clip._out on the outgoing one); both sides are drawn with their half of the effect. */
  R.TRANSITIONS = { none: 'Cut', fade: 'Dissolve', black: 'Dip to black', white: 'Flash', slide: 'Slide', push: 'Push', whip: 'Whip pan', wipe: 'Wipe', iris: 'Circle', zoom: 'Zoom', blur: 'Blur', spin: 'Spin', glitch: 'Glitch' };
  R.TRANS_DIRS = ['slide', 'push', 'whip', 'wipe'];
  function clipFx(el, t) {
    const c = el.clip;
    if (!c || t == null || !el.time) return null;
    const s0 = el.time.start || 0, e0 = el.time.end;
    if (c._in > 0 && c.trans && t < s0 + c._in) return { p: clamp((t - s0) / c._in, 0, 1), type: c.trans.type, dir: c.trans.dir, inn: true };
    if (c._out && c._out.dur > 0 && e0 != null && t > e0 - c._out.dur) return { p: clamp((t - (e0 - c._out.dur)) / c._out.dur, 0, 1), type: c._out.type, dir: c._out.dir, inn: false };
    return null;
  }
  const hash1 = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function drawElement(ctx, el, env = {}) {
    const t = 'time' in env ? env.time : R.playTime;
    const fx = el.clip ? clipFx(el, t) : null;
    if (!fx || !fx.type || fx.type === 'none' || !R.visibleAt(el, t)) return drawElementCore(ctx, el, env);
    const doc = env.doc || R.animDoc || {}, W = doc.width || el.width, H = doc.height || el.height, w = el.width, h = el.height;
    const p = fx.p, e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2, inn = fx.inn;
    // the way the picture travels: 'left' = the new clip comes in from the right
    const d = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] }[fx.dir || 'left'] || [1, 0];
    let e2 = el, tint = null;
    ctx.save();
    switch (fx.type) {
      case 'fade': if (inn) ctx.globalAlpha *= e; break;
      case 'black': case 'white': {
        // dip: the old clip goes to the colour by halfway, the new one comes up out of it
        const col = fx.type === 'black' ? '#000000' : '#ffffff';
        if (inn) { if (p < 0.5) { ctx.restore(); return; } tint = [col, fx.type === 'white' ? Math.pow(2 * (1 - p), 1.6) : 2 * (1 - p)]; } else tint = [col, Math.min(1, 2 * p)];
        break;
      }
      case 'slide': if (inn) ctx.translate((1 - e) * W * d[0], (1 - e) * H * d[1]); break;
      case 'push': case 'whip': {
        if (inn) ctx.translate((1 - e) * W * d[0], (1 - e) * H * d[1]); else ctx.translate(-e * W * d[0], -e * H * d[1]);
        if (fx.type === 'whip') {
          const sp = Math.sin(Math.PI * p) * Math.hypot(W * d[0], H * d[1]) * 0.22;
          if (sp > 1.5) e2 = Object.assign({}, el, { lblur: Object.assign({}, el.lblur || {}, { motion: ((el.lblur && el.lblur.motion) || 0) + sp, angle: d[1] ? 90 : 0 }) });
        }
        break;
      }
      case 'wipe': if (inn) {
        ctx.beginPath();
        if (d[0] > 0) ctx.rect(w * (1 - e), -h, w * e + w, h * 3); else if (d[0] < 0) ctx.rect(-w, -h, w * (1 + e), h * 3);
        else if (d[1] > 0) ctx.rect(-w, h * (1 - e), w * 3, h * e + h); else ctx.rect(-w, -h, w * 3, h * (1 + e));
        ctx.clip();
      } break;
      case 'iris': if (inn) { ctx.beginPath(); ctx.arc(w / 2, h / 2, Math.max(0.5, e * Math.hypot(w, h) / 2), 0, Math.PI * 2); ctx.clip(); } break;
      case 'zoom': {
        const k = inn ? 1.3 - 0.3 * e : 1 + 0.3 * e;
        ctx.translate(w / 2, h / 2); ctx.scale(k, k); ctx.translate(-w / 2, -h / 2);
        if (inn) ctx.globalAlpha *= Math.min(1, e * 1.4);
        break;
      }
      case 'blur': {
        const b = (inn ? 1 - e : e) * Math.min(W, H) * 0.03;
        if (inn) ctx.globalAlpha *= e;
        if (b > 0.3) e2 = Object.assign({}, el, { lblur: Object.assign({}, el.lblur || {}, { gauss: ((el.lblur && el.lblur.gauss) || 0) + Math.round(b * 2) / 2 }) });
        break;
      }
      case 'spin': {
        const k = inn ? 0.5 + 0.5 * e : 1 + 0.4 * e, r = inn ? (1 - e) * -120 : e * 120;
        ctx.translate(w / 2, h / 2); ctx.rotate(r * Math.PI / 180); ctx.scale(k, k); ctx.translate(-w / 2, -h / 2);
        if (inn) ctx.globalAlpha *= e;
        break;
      }
      case 'glitch': {
        // flickers between the two with sideways jumps that settle
        const f = Math.floor(t * 24), amt = inn ? 1 - p : p;
        if (inn && hash1(f) > p * 1.15) { ctx.restore(); return; }
        ctx.translate((hash1(f + 7) - 0.5) * W * 0.12 * amt, (hash1(f + 3) - 0.5) * H * 0.02 * amt);
        break;
      }
    }
    drawElementCore(ctx, e2, env);
    if (tint && tint[1] > 0.002) { ctx.globalAlpha = Math.min(1, tint[1]) * (el.opacity ?? 1); ctx.fillStyle = tint[0]; ctx.fillRect(0, 0, w, h); }
    ctx.restore();
  }
  function drawElementCore(ctx, el, env = {}) {
    const t = 'time' in env ? env.time : R.playTime;
    if (!R.visibleAt(el, t)) return;
    // clips cut in between typed words: only on screen during their own slot (hidden while editing the still)
    if (el.cutin) { const P = R.typePlan(env.doc || R.animDoc); if (!P || t == null || P.cutAt(t) !== el.id) return; }
    // pinned to a tracked spot in a video: move the whole layer with it (prepended to the layer's own placement)
    let trackBlur = null;
    if (t != null && el.track) {
      const X = R.trackXform(el, t, env.doc || R.animDoc);
      if (X && X.H) { drawWarped(ctx, el, env, X.H); return; }
      if (X) {
        const cur = ctx.getTransform(), own = new DOMMatrix().translate(el.x, el.y).rotate(el.rotation || 0);
        ctx.setTransform(cur.multiply(own.inverse()).multiply(X.M).multiply(own));
        const sp = Math.hypot(X.vx, X.vy);
        if (el.track.blur !== false && sp > 4) {
          // undo the layer's own turn so the streak runs along the movement on the canvas
          trackBlur = { motion: sp * 0.6, angle: Math.atan2(X.vy, X.vx) * 180 / Math.PI - (el.rotation || 0) };
        }
      }
    }
    if (trackBlur) el = Object.assign({}, el, { lblur: Object.assign({}, el.lblur || {}, { motion: ((el.lblur && el.lblur.motion) || 0) + trackBlur.motion, angle: trackBlur.angle }), track: null, _tracked: true });
    const pcs = R.seqPieces(el);
    if (t == null && pcs && pcs.length) { drawLayered(ctx, onePiece(el, pcs[0]), env); return; }
    // a word wall's still is the wall itself, not its list of words
    if (t == null && el.type === 'text' && el.anim && el.anim.enter === 'wall') { drawWordWall(ctx, el, 0, 1, env.doc || R.animDoc); return; }
    if (t == null || !R.hasAnim(el)) { drawLayered(ctx, el, env); return; }
    const A = animState(el, t, env.doc || R.animDoc);
    if (A.alpha <= 0.001 || A.sc <= 0.001 || A.reveal <= 0) return;
    ctx.save();
    ctx.translate(A.px + A.dx, A.py + A.dy);
    if (A.rot) ctx.rotate(A.rot * Math.PI / 180);
    if (A.sc !== 1) ctx.scale(A.sc, A.sc);
    ctx.translate(-A.px, -A.py);
    if (A.alpha < 1) ctx.globalAlpha *= A.alpha;
    if (A.reveal < 1) {
      const b = bleed(el), dir = el.anim && el.anim.dir, H2 = el.height + b * 2;
      ctx.beginPath();
      if (dir === 'up') ctx.rect(-b, -b + H2 * (1 - A.reveal), el.width + b * 2, H2 * A.reveal);
      else if (dir === 'down') ctx.rect(-b, -b, el.width + b * 2, H2 * A.reveal);
      else ctx.rect(-b, -b, (el.width + b * 2) * A.reveal, H2);
      ctx.clip();
    }
    let e = el;
    if (A.view) e = phraseEl(el, A.view);
    else if (A.chars != null) {
      const chars = [...(el.text || '')];
      if (A.chars < chars.length) e = Object.assign({}, el, { text: chars.slice(0, A.chars).join(''), autoWidth: false, width: el.width, _full: el.text, _typing: true });
    }
    if (el.typing && el.typing.caret !== false) {
      // solid while typing, blinking once the text is complete
      const on = e._typing || el.typing.blink === false || ((t % 1) + 1) % 1 < 0.55;
      if (e === el) e = Object.assign({}, el);
      e._caretOn = on;
    }
    if (A.flow != null || A.draw != null) e = Object.assign({}, e, A.flow != null ? { flowShift: ((A.flow % 1) + 1) % 1 } : {}, A.draw != null ? { drawFrac: A.draw } : {});
    if (A.letters) e = Object.assign({}, e, { _letters: A.letters });
    if (A.mblur > 1.5) e = Object.assign({}, e, { lblur: Object.assign({}, e.lblur || {}, { motion: ((e.lblur && e.lblur.motion) || 0) + A.mblur, angle: A.mang }) });
    if (A.gblur > 0.3) e = Object.assign({}, e, { lblur: Object.assign({}, e.lblur || {}, { gauss: ((e.lblur && e.lblur.gauss) || 0) + Math.round(A.gblur * 2) / 2 }) });
    if (A.wfx) {
      if (e.lblur && (e.lblur.gauss > 0 || e.lblur.motion > 0)) {
        // the layer's own blur still applies: draw the words onto a layer bitmap and blur that
        const b = bleed(e), s = Math.min(3, Math.max(1, deviceScale(ctx))), c = canvas((el.width + b * 2) * s, (el.height + b * 2) * s), x = c.getContext('2d');
        x.scale(s, s); x.translate(b, b); drawWordFx(x, e, A.wfx, env);
        let o = c;
        if (e.lblur.motion > 0) o = motionBlurPx(o, e.lblur.motion * s, e.lblur.angle || 0);
        if (e.lblur.gauss > 0) { const g = canvas(o.width, o.height), gx = g.getContext('2d'); gx.filter = `blur(${e.lblur.gauss * s}px)`; gx.drawImage(o, 0, 0); o = g; }
        ctx.drawImage(o, -b, -b, el.width + b * 2, el.height + b * 2);
      } else drawWordFx(ctx, e, A.wfx, env);
      ctx.restore();
      return;
    }
    if (A.seq) {
      const Q = A.seq, cur = onePiece(e, Q.pieces[Q.i]);
      if (el.anim.enter === 'roll') {
        // the old line rolls up and away while the next one rolls in from below
        const lh = (el.fontSize || 48) * 1.05, k = easeOut(Q.k);
        const draw1 = (piece, dy, al, bl) => {
          const x = bl > 1 ? Object.assign({}, piece, { lblur: { motion: bl, angle: 90 } }) : piece;
          ctx.save(); ctx.translate(0, dy); ctx.globalAlpha *= al; drawLayered(ctx, x, env); ctx.restore();
        };
        draw1(cur, -k * lh, 1 - k * 0.85, Q.k > 0 ? Math.sin(Math.PI * Q.k) * lh * 0.6 : 0);
        if (Q.k > 0) draw1(onePiece(e, Q.pieces[Q.i + 1]), (1 - k) * lh, Math.min(1, k * 1.4), Math.sin(Math.PI * Q.k) * lh * 0.6);
      } else {
        // word by word: each word pops up from a little smaller
        const kk = easeBack(Q.enterK), sc = 0.72 + 0.28 * kk;
        ctx.save();
        ctx.translate(el.width / 2, el.height / 2); ctx.scale(sc, sc); ctx.translate(-el.width / 2, -el.height / 2);
        ctx.globalAlpha *= Math.min(1, Q.enterK * 2.5);
        drawLayered(ctx, Q.enterK < 0.5 ? Object.assign({}, cur, { lblur: { gauss: (0.5 - Q.enterK) * 8 } }) : cur, env);
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    if (A.caption != null && el.type === 'text') {
      // captions: one line of the text at a time, centred in the layer's box
      const lines = String(el.text || '').split('\n').filter(x => x.trim());
      if (lines.length) {
        const line = lines[Math.min(lines.length - 1, A.caption)];
        const one = Object.assign({}, e, { text: line, autoWidth: false, width: el.width });
        one._yShift = (el.height - layoutText(one).boxH) / 2;
        e = one;
      }
    }
    drawLayered(ctx, e, env);
    ctx.restore();
  }
  R.drawElement = drawElement;

  /* ───────────────────────── erasing ───────────────────────── */

  // el.erase: [{ m: 'erase'|'restore', s: 'circle'|'square', r, p: [u, v, …] }] in fractions of the box
  function strokeErase(x, el, st) {
    const w = el.width, h = el.height, r = Math.max(0.5, st.r * w), p = st.p;
    if (st.s === 'square') {
      const stamp = (u, v) => x.fillRect(u * w - r, v * h - r, r * 2, r * 2);
      stamp(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) {
        const x0 = p[i - 2] * w, y0 = p[i - 1] * h, x1 = p[i] * w, y1 = p[i + 1] * h;
        const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (r * 0.4)));
        for (let k = 1; k <= n; k++) stamp((x0 + (x1 - x0) * k / n) / w, (y0 + (y1 - y0) * k / n) / h);
      }
      return;
    }
    if (p.length <= 2) { x.beginPath(); x.arc(p[0] * w, p[1] * h, r, 0, TAU); x.fill(); return; }
    x.lineWidth = r * 2; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(p[0] * w, p[1] * h);
    for (let i = 2; i < p.length; i += 2) x.lineTo(p[i] * w, p[i + 1] * h);
    x.stroke();
  }

  /* ───────────────────────── text effects (thermal, ink bleed) ───────────────────────── */

  // el.tfx = { style: 'thermal' | 'ink', amount, palette, move, rough, speckle, smear, angle, color }
  // Both work on the layer's rendered bitmap: its alpha becomes a heat map or a soaked-ink mask.
  R.TEXT_FX = { none: 'None', thermal: 'Thermal blur', vision: 'Depth vision', ink: 'Ink bleed' };
  /* Depth vision — "how robots see": a depth / heat field around the subject mapped through a cyclic colour ramp.
     The subject (letters, a shape, a cut-out, or whatever differs from a photo's backdrop) is blurred wide into a glow;
     a slow radial wave and flowing noise drift through the field; the value runs light blue (empty) → yellow → red at
     the subject's edge and wraps round to blue inside it, where the picture's own shading stays readable; fine noise
     dithers every colour boundary. Stops sit at 0, ¼, ½, ¾, 1 with the last = the first, so the ramp wraps cleanly. */
  R.VISION_PALETTES = {
    depth: { label: 'Depth', stops: ['#186ade', '#9bbfe4', '#f6da7a', '#d72f28', '#186ade'] },
    jet: { label: 'Jet', stops: [[0, '#2f6ad8'], [0.25, '#9cc0e8'], [0.38, '#7fd6bf'], [0.5, '#f2e08a'], [0.62, '#f0a35a'], [0.75, '#d8453a'], [1, '#2f6ad8']] },
    turbo: { label: 'Turbo', stops: [[0, '#3a4fd0'], [0.25, '#8ec5ef'], [0.4, '#5fe0b5'], [0.5, '#c6ef5a'], [0.6, '#f9d24a'], [0.75, '#f0662a'], [0.88, '#b3201c'], [1, '#3a4fd0']] },
    dusk: { label: 'Dusk', stops: ['#3b2a8f', '#c9b6f2', '#ffd1a1', '#ff4f79', '#3b2a8f'] },
    mono: { label: 'Mono', stops: ['#1d1b18', '#d9d6cf', '#ffffff', '#6d6a64', '#1d1b18'] },
  };
  const visionLuts = new LRU(12);
  function visionLut(fx) {
    const P = R.VISION_PALETTES[fx.palette] || R.VISION_PALETTES.depth;
    const raw = fx.palette === 'custom' && Array.isArray(fx.stops) && fx.stops.length >= 2 ? fx.stops : P.stops;
    const st = raw.map((c, i) => Array.isArray(c) ? [c[0], hexRgb(c[1])] : [i / (raw.length - 1), hexRgb(c)]);
    const key = JSON.stringify(st);
    let lut = visionLuts.get(key);
    if (lut) return lut;
    lut = new Uint8ClampedArray(1024 * 3);
    for (let i = 0; i < 1024; i++) {
      const v = i / 1023;
      let j = 0;
      while (j < st.length - 2 && v > st[j + 1][0]) j++;
      const a = st[j], b = st[j + 1], k = clamp((v - a[0]) / Math.max(1e-6, b[0] - a[0]), 0, 1);
      for (let c = 0; c < 3; c++) lut[i * 3 + c] = a[1][c] + (b[1][c] - a[1][c]) * k;
    }
    visionLuts.set(key, lut);
    return lut;
  }
  // which pixels are "the subject": letters / shapes / cut-outs by their shape; a photo by how much it differs from its
  // own backdrop (the median of its border), or simply its bright / dark parts
  function visionSubject(px, a, L, w, h, el, mode, box) {
    const n = w * h, s = new Float32Array(n);
    let clear = 0;
    for (let i = 0; i < n; i++) if (a[i] < 0.5) clear++;
    const boxN = (box.x1 - box.x0) * (box.y1 - box.y0);
    const shape = el.type !== 'image' || mode === 'shape' || (mode !== 'bright' && mode !== 'dark' && clear - (n - boxN) > boxN * 0.03);
    if (shape) { for (let i = 0; i < n; i++) s[i] = a[i]; return s; }
    const sm = smoothstep;
    if (mode === 'bright' || mode === 'dark') {
      for (let i = 0; i < n; i++) { const v = mode === 'bright' ? L[i] : 1 - L[i]; s[i] = sm(0.42, 0.82, v) * a[i]; }
      return s;
    }
    const border = [];
    for (let x = box.x0; x < box.x1; x += 2) { border.push(L[box.y0 * w + x], L[(box.y1 - 1) * w + x]); }
    for (let y = box.y0; y < box.y1; y += 2) { border.push(L[y * w + box.x0], L[y * w + box.x1 - 1]); }
    border.sort((p, q) => p - q);
    const bg = border.length ? border[border.length >> 1] : 0.5, Ls = blurMap(L, w, h, Math.max(1, Math.min(w, h) * 0.004));
    for (let i = 0; i < n; i++) s[i] = sm(0.06, 0.34, Math.abs(Ls[i] - bg)) * a[i];
    return s;
  }
  const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  function visionFx(c, el, s, t, b) {
    const fx = el.tfx, W = c.width, H = c.height;
    // detail at up to 720 px (the picture's shading inside the subject); the soft field at up to 300 px
    const ds = Math.min(1, (R.playing ? 440 : 720) / Math.max(W, H)), w = Math.max(2, Math.round(W * ds)), h = Math.max(2, Math.round(H * ds));
    const work = canvas(w, h), wx = work.getContext('2d', { willReadFrequently: true });
    wx.drawImage(c, 0, 0, w, h);
    let d;
    try { d = wx.getImageData(0, 0, w, h); } catch (e) { return c; }
    const px = d.data, n = w * h, a = new Float32Array(n), L = new Float32Array(n);
    for (let i = 0; i < n; i++) { const o = i * 4; a[i] = px[o + 3] / 255; L[i] = (0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2]) / 255; }
    // the layer's own box inside the bitmap (the rest is bleed for the glow)
    const bb = b * s * ds, box = { x0: clamp(Math.round(bb), 0, w - 1), y0: clamp(Math.round(bb), 0, h - 1), x1: clamp(Math.round(w - bb), 1, w), y1: clamp(Math.round(h - bb), 1, h) };
    let S = visionSubject(px, a, L, w, h, el, fx.subject || 'auto', box);
    // melted edges for letters and shapes (photos keep their outline)
    const melt = meltOf(el, fx);
    if (melt) S = meltMask(S, w, h, (el.fontSize || Math.min(el.width, el.height) * 0.35) * s * ds, melt, hashStr(el.id || 'fx') + (fx.seed || 0), fx.move !== false && t != null ? t * 0.45 * ((fx.speed ?? 50) / 50) : 0).core;
    // inside the subject: its brightness, stretched over the blue end of the ramp
    const hist = [];
    for (let i = 0; i < n; i += 7) if (S[i] > 0.5) hist.push(L[i]);
    hist.sort((p, q) => p - q);
    const lo = hist.length > 30 ? hist[Math.floor(hist.length * 0.04)] : 0, hi = hist.length > 30 ? hist[Math.floor(hist.length * 0.96)] : 1, span = Math.max(0.05, hi - lo);
    // the soft field
    const fsK = Math.min(1, 300 / Math.max(w, h)), fw = Math.max(2, Math.round(w * fsK)), fh = Math.max(2, Math.round(h * fsK)), Mf = Math.min(fw, fh);
    const sf = new Float32Array(fw * fh);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const y0 = Math.floor(y / fsK), x0 = Math.floor(x / fsK), y1 = Math.min(h, Math.floor((y + 1) / fsK)), x1 = Math.min(w, Math.floor((x + 1) / fsK));
      let sum = 0, cnt = 0;
      for (let yy = y0; yy < Math.max(y0 + 1, y1); yy += 2) for (let xx = x0; xx < Math.max(x0 + 1, x1); xx += 2) { sum += S[Math.min(h - 1, yy) * w + Math.min(w - 1, xx)]; cnt++; }
      sf[y * fw + x] = cnt ? sum / cnt : 0;
    }
    const kA = clamp((fx.amount ?? 50) / 100, 0, 1), isPic = el.type === 'image';
    const fsF = (el.fontSize || Math.min(el.width, el.height) * 0.35) * s * ds * fsK;
    const r2 = isPic ? Mf * (0.06 + 0.2 * kA) : fsF * (0.35 + 0.9 * kA), r1 = r2 * 0.25;
    const B1 = blurMap(sf, fw, fh, r1), B2 = blurMap(sf, fw, fh, r2);
    const seed = hashStr(el.id || 'fx') + (fx.seed || 0), mv = fx.move !== false && t != null, spd = (fx.speed ?? 50) / 50, z = mv ? t * 0.55 * spd : 0;
    const nzA = valueNoise(fw, fh, Math.max(3, Mf * 0.18), seed, z), nzB = valueNoise(fw, fh, Math.max(3, Mf * 0.18), seed + 9, z + 0.5), nzC = valueNoise(fw, fh, Math.max(3, Mf * 0.35), seed + 2, z * 0.7);
    const disp = Mf * 0.05 * ((fx.noise ?? 50) / 50), noiseAmp = 0.12 * ((fx.noise ?? 50) / 50);
    const waveAmp = 0.07 * ((fx.wave ?? 50) / 50), wl = 0.6 + 1.4 * ((fx.waveLen ?? 35) / 100), cx = fx.cx ?? 1.2, cy = fx.cy ?? -0.3, stretch = 2;
    // thin strokes hardly raise a wide blur, so for letters and shapes the glow is scaled until it peaks at full strength
    let gain = 1;
    if (!isPic || (fx.subject === 'shape')) { let mx = 0; for (let i = 0; i < B2.length; i++) mx = Math.max(mx, B1[i] * 1.15, B2[i] * 1.5); gain = mx > 0.02 ? Math.min(5, 1 / mx) : 1; }
    const V0 = new Float32Array(fw * fh), FF = new Float32Array(fw * fh);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const i = y * fw + x, dx = Math.round((nzB[i] - 0.5) * disp), dy = Math.round((nzA[i] - 0.5) * disp);
      const j = clamp(y + dy, 0, fh - 1) * fw + clamp(x + dx, 0, fw - 1);
      const F = clamp(Math.max(B1[j] * 1.15, B2[j] * 1.5) * gain, 0, 1);
      const u = x / fw, v = y / fh, dd = Math.sqrt(((u - cx) * fw / Mf / stretch) ** 2 + ((v - cy) * fh / Mf) ** 2);
      const wave = Math.sin(TAU * (dd * wl - (mv ? t * 0.12 * spd : 0))) * waveAmp;
      FF[i] = F;
      V0[i] = 0.25 + 0.72 * F + wave + (nzC[i] - 0.5) * noiseAmp * 2;
    }
    const lut = visionLut(fx), core = 0.2 * ((fx.core ?? 50) / 50), grainAmt = 0.06 * ((fx.grain ?? 50) / 50);
    let gs = (seed + 31 + (mv ? Math.floor(t * 24) : 0)) * 2654435761 >>> 0;
    const gr = () => { gs = (gs * 1664525 + 1013904223) >>> 0; return gs / 4294967296; };
    const field = fx.field ?? el.type === 'image';
    for (let y = 0; y < h; y++) {
      const fy = Math.min(fh - 1.001, y * fsK), iy = Math.floor(fy), ty = fy - iy, ey = Math.min(y - box.y0, box.y1 - 1 - y);
      for (let x = 0; x < w; x++) {
        const fxp = Math.min(fw - 1.001, x * fsK), ix = Math.floor(fxp), tx = fxp - ix, k = iy * fw + ix;
        const v0 = (V0[k] * (1 - tx) + V0[k + 1] * tx) * (1 - ty) + (V0[k + fw] * (1 - tx) + V0[k + fw + 1] * tx) * ty;
        const F = (FF[k] * (1 - tx) + FF[k + 1] * tx) * (1 - ty) + (FF[k + fw] * (1 - tx) + FF[k + fw + 1] * tx) * ty;
        const i = y * w + x, sv = S[i];
        let val = v0 * (1 - sv) + (1.02 + core * clamp((L[i] - lo) / span, 0, 1)) * sv;
        val += (gr() - 0.5) * grainAmt;
        val -= Math.floor(val);
        const o = Math.min(1023, Math.max(0, Math.round(val * 1023))) * 3, q = i * 4;
        px[q] = lut[o]; px[q + 1] = lut[o + 1]; px[q + 2] = lut[o + 2];
        // with the field on, the layer's box is filled (a photo stays a photo-shaped picture) and the glow spills past it;
        // otherwise only the subject and its glow show, fading out before the bitmap's edge
        const inBox = x >= box.x0 && x < box.x1 && y >= box.y0 && y < box.y1;
        let al = field && inBox ? Math.max(a[i], sv) : Math.max(sv, a[i] * (isPic ? 1 : 0), smoothstep(0, 0.42, F));
        if (!(field && inBox)) {
          const ex = Math.min(x, w - 1 - x, y, h - 1 - y) / (Math.min(w, h) * 0.08);
          if (ex < 1) al *= Math.max(0, ex);
        }
        px[q + 3] = al * 255;
      }
    }
    wx.putImageData(d, 0, 0);
    if (ds === 1) return work;
    const out = canvas(W, H), ox = out.getContext('2d');
    ox.imageSmoothingQuality = 'high';
    ox.drawImage(work, 0, 0, W, H);
    return out;
  }
  R.THERMAL_PALETTES = {
    thermal: { label: 'Thermal', stops: [[0, 20, 40, 255, 0], [0.07, 30, 60, 255, 0.3], [0.14, 50, 80, 255, 0.85], [0.22, 90, 100, 255, 1], [0.3, 255, 110, 170, 1], [0.42, 255, 140, 60, 1], [0.6, 255, 214, 60, 1], [0.8, 255, 246, 170, 1], [1, 255, 255, 255, 1]] },
    infrared: { label: 'Infrared', stops: [[0, 40, 0, 90, 0], [0.07, 60, 0, 120, 0.3], [0.14, 80, 0, 150, 0.85], [0.25, 170, 20, 160, 1], [0.42, 240, 40, 60, 1], [0.6, 255, 140, 20, 1], [0.8, 255, 230, 90, 1], [1, 255, 255, 235, 1]] },
    night: { label: 'Night vision', stops: [[0, 0, 40, 10, 0], [0.07, 5, 70, 20, 0.3], [0.14, 10, 100, 30, 0.85], [0.35, 40, 190, 60, 1], [0.65, 150, 255, 120, 1], [1, 235, 255, 225, 1]] },
    ice: { label: 'Ice', stops: [[0, 10, 30, 120, 0], [0.07, 20, 50, 180, 0.3], [0.14, 30, 80, 230, 0.85], [0.32, 40, 160, 255, 1], [0.55, 110, 230, 255, 1], [0.8, 210, 250, 255, 1], [1, 255, 255, 255, 1]] },
    sunset: { label: 'Sunset', stops: [[0, 120, 20, 120, 0], [0.07, 150, 25, 130, 0.3], [0.14, 190, 30, 140, 0.85], [0.3, 255, 60, 110, 1], [0.5, 255, 120, 60, 1], [0.75, 255, 200, 110, 1], [1, 255, 250, 235, 1]] },
  };
  const paletteLut = new LRU(8);
  function heatLut(name) {
    let lut = paletteLut.get(name);
    if (lut) return lut;
    const st = (R.THERMAL_PALETTES[name] || R.THERMAL_PALETTES.thermal).stops;
    lut = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) {
      const v = i / 255;
      let j = 0;
      while (j < st.length - 2 && v > st[j + 1][0]) j++;
      const a = st[j], b = st[j + 1], k = clamp((v - a[0]) / Math.max(1e-6, b[0] - a[0]), 0, 1);
      for (let c = 0; c < 4; c++) lut[i * 4 + c] = (a[c + 1] + (b[c + 1] - a[c + 1]) * k) * (c === 3 ? 255 : 1);
    }
    paletteLut.set(name, lut);
    return lut;
  }
  // three box passes ≈ a gaussian; runs on a Float32 alpha map so it works without canvas filters (Safari)
  function blurMap(src, w, h, r) {
    r = Math.max(0, Math.round(r));
    if (!r) return src.slice();
    const a = src.slice(), b = new Float32Array(src.length), inv = 1 / (r * 2 + 1);
    const hpass = (from, to) => {
      for (let y = 0; y < h; y++) {
        const o = y * w;
        let s = 0;
        for (let i = -r; i <= r; i++) s += from[o + (i < 0 ? 0 : i >= w ? w - 1 : i)];
        for (let x = 0; x < w; x++) {
          to[o + x] = s * inv;
          const add = x + r + 1, sub = x - r;
          s += from[o + (add >= w ? w - 1 : add)] - from[o + (sub < 0 ? 0 : sub)];
        }
      }
    };
    const vpass = (from, to) => {
      for (let x = 0; x < w; x++) {
        let s = 0;
        for (let i = -r; i <= r; i++) s += from[(i < 0 ? 0 : i >= h ? h - 1 : i) * w + x];
        for (let y = 0; y < h; y++) {
          to[y * w + x] = s * inv;
          const add = y + r + 1, sub = y - r;
          s += from[(add >= h ? h - 1 : add) * w + x] - from[(sub < 0 ? 0 : sub) * w + x];
        }
      }
    };
    for (let k = 0; k < 3; k++) { hpass(a, b); vpass(b, a); }
    return a;
  }
  // smooth value noise in 0..1, cells of `cell` px; `z` slides the field over time
  function valueNoise(w, h, cell, seed, z = 0) {
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, r = rng(seed), g = new Float32Array(gw * gh * 2);
    for (let i = 0; i < g.length; i++) g[i] = r();
    const zi = Math.floor(z) % 2, zf = z - Math.floor(z), zs = zf * zf * (3 - 2 * zf), out = new Float32Array(w * h);
    const G = (x, y, l) => g[(((l + zi) % 2) * gh + y) * gw + x];
    for (let y = 0; y < h; y++) {
      const fy = y / cell, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < w; x++) {
        const fx = x / cell, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx);
        const at = l => { const a = G(ix, iy, l) + (G(ix + 1, iy, l) - G(ix, iy, l)) * sx, b = G(ix, iy + 1, l) + (G(ix + 1, iy + 1, l) - G(ix, iy + 1, l)) * sx; return a + (b - a) * sy; };
        out[y * w + x] = zs ? at(0) + (at(1) - at(0)) * zs : at(0);
      }
    }
    return out;
  }
  // melted edges: the shape is pushed around by smooth noise (worked out at a quarter size), then blurred and cut
  // again at half, so corners round off and edges bulge like wax. Returns the melted shape and a source for the glow
  // that is pushed twice as far.
  function meltMask(a, w, h, fs, m, seed, z) {
    const q = 4, qw = Math.max(2, Math.ceil(w / q)), qh = Math.max(2, Math.ceil(h / q)), cell = Math.max(2, fs * 0.42 / q);
    const n1 = valueNoise(qw, qh, cell, seed + 41, z), n2 = valueNoise(qw, qh, cell, seed + 43, z + 0.5);
    const f1 = valueNoise(qw, qh, Math.max(1.5, cell * 0.35), seed + 47, z * 1.3), f2 = valueNoise(qw, qh, Math.max(1.5, cell * 0.35), seed + 53, z * 1.3 + 0.5);
    const amp = fs * 0.12 * m, core = new Float32Array(w * h), glow = new Float32Array(w * h);
    const at = (x, y) => {
      if (x < 0 || y < 0 || x > w - 1 || y > h - 1) return 0;
      const ix = Math.min(w - 2, Math.floor(x)), iy = Math.min(h - 2, Math.floor(y)), tx = x - ix, ty = y - iy, i = iy * w + ix;
      return (a[i] * (1 - tx) + a[i + 1] * tx) * (1 - ty) + (a[i + w] * (1 - tx) + a[i + w + 1] * tx) * ty;
    };
    for (let y = 0; y < h; y++) {
      const gy = Math.min(qh - 1.001, y / q), jy = Math.floor(gy), ty = gy - jy;
      for (let x = 0; x < w; x++) {
        const gx = Math.min(qw - 1.001, x / q), jx = Math.floor(gx), tx = gx - jx, k = jy * qw + jx;
        const L = arr => (arr[k] * (1 - tx) + arr[k + 1] * tx) * (1 - ty) + (arr[k + qw] * (1 - tx) + arr[k + qw + 1] * tx) * ty;
        const dx = ((L(n1) - 0.5) * 2 + (L(f1) - 0.5) * 0.45) * amp, dy = ((L(n2) - 0.5) * 2 + (L(f2) - 0.5) * 0.45) * amp;
        core[y * w + x] = at(x + dx, y + dy);
        glow[y * w + x] = at(x + dx * 2.2, y + dy * 2.2);
      }
    }
    const sm = blurMap(core, w, h, fs * (0.012 + 0.05 * m));
    for (let i = 0; i < sm.length; i++) sm[i] = smoothstep(0.36, 0.62, sm[i]);
    return { core: sm, glow };
  }
  const meltOf = (el, fx) => el.type === 'image' ? 0 : clamp((fx.melt ?? 0) / 100, 0, 1);
  R.textFxPad = function (el) {
    const fx = el.tfx;
    if (!fx || !fx.style || fx.style === 'none') return 0;
    const fs = el.fontSize || Math.min(el.width, el.height) * 0.3, k = clamp((fx.amount ?? 50) / 100, 0, 1);
    if (fx.style === 'thermal') return fs * (0.3 + 0.85 * k + 0.3 * meltOf(el, fx));
    if (fx.style === 'vision') return el.type === 'image' ? Math.min(el.width, el.height) * (0.04 + 0.12 * k) : fs * (0.7 + 1.9 * k);
    return fs * (0.1 + 0.25 * k) + fs * 0.5 * clamp((fx.smear ?? 25) / 100, 0, 1);
  };
  const fxOn = el => el.tfx && el.tfx.style && el.tfx.style !== 'none';
  // realtime styles (styles.js): el.sfx on a layer, doc.sfx over the whole canvas
  const styleOn = sfx => !!(sfx && sfx.id && window.StudioStyles && window.StudioStyles.has(sfx) && sfx.on !== false);
  R.styleOn = styleOn;
  /* subject masks (subject.js): el.subj holds PNG sprite sheets, white with alpha = subject, one cell per analysed frame.
     R.subjectMask(el, st) gives the mask for source time st (blended between the two nearest frames), in the picture's
     own frame — draw it like the photo (drawCover) to line it up. */
  const subjCache = new Map();
  // a subject found for this layer's own picture (split clips share the file under another id: same URL)
  R.hasSubject = el => { const sj = el && el.subj; return !!(sj && sj.sheets && sj.sheets.length && sj.n && (!sj.of || assets[sj.of] === assets[el.assetId])); };
  // slot: a second cache line for the same layer (clones ask for several moments at once)
  R.subjectMask = function (el, st, slot) {
    const sj = el && el.subj;
    if (!R.hasSubject(el)) return null;
    // masks taken on the clip's own frames: the one for the frame showing (by frame number); the older kind by time
    const f = sj.n > 1 && sj.vfps ? clamp((Math.floor((st || 0) * sj.vfps + 1e-6) - sj.f0) / (sj.stride || 1), 0, sj.n - 1)
      : sj.n > 1 && sj.fps ? clamp(((st || 0) - (sj.t0 || 0)) * sj.fps, 0, sj.n - 1) : 0;
    // every frame (or every other one): the nearest; sparser ones (long clips): blended
    const dense = (sj.fps || 0) >= 23.5, i = dense ? Math.round(f) : Math.floor(f), fr = dense ? 0 : Math.round((f - i) * 8) / 8, j = Math.min(sj.n - 1, i + 1);
    const key = sj.sheets.join(',') + '|' + i + '|' + fr;
    const ck = slot ? el.id + '#' + slot : el.id;
    let hit = subjCache.get(ck);
    if (hit && hit.key === key) return hit.c;
    const cell = k => { const sh = assetImage(sj.sheets[Math.floor(k / sj.per)]); if (!sh) return null; const q = k % sj.per; return [sh, (q % sj.cols) * sj.cw, Math.floor(q / sj.cols) * sj.ch]; };
    const A = cell(i), B = fr > 0 ? cell(j) : null;
    if (!A || (fr > 0 && !B)) return null;
    const c = hit && hit.c && hit.c.width === sj.cw && hit.c.height === sj.ch ? hit.c : canvas(sj.cw, sj.ch), x = c.getContext('2d');
    x.clearRect(0, 0, sj.cw, sj.ch);
    x.globalAlpha = 1 - fr; x.drawImage(A[0], A[1], A[2], sj.cw, sj.ch, 0, 0, sj.cw, sj.ch);
    if (B) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = fr; x.drawImage(B[0], B[1], B[2], sj.cw, sj.ch, 0, 0, sj.cw, sj.ch); x.globalCompositeOperation = 'source-over'; }
    x.globalAlpha = 1;
    if (subjCache.size > 80) subjCache.clear();
    subjCache.set(ck, { key, c });
    return c;
  };
  // a layer's subject mask in its own box, scaled by k (for captions set behind the person)
  R.subjectMaskLocal = (el, env, k) => subjectLayerMask(el, env || {}, Math.max(1, Math.round(el.width * k)), Math.max(1, Math.round(el.height * k)), k, 0);
  R.subjectReady = el => !el.subj || !el.subj.sheets || el.subj.sheets.every(id => !assets[id] || !!assetImage(id));
  // the layer's subject mask laid over its cached bitmap (same scale and bleed), for ST.apply
  function subjectLayerMask(el, env, W, H, s, b) {
    if (el.type !== 'image' || !el.subj) return null;
    const v = isVideoAsset(el.assetId) && assetImage(el.assetId), t = 'time' in env ? env.time : R.playTime;
    const st = !v ? 0 : env.editor || t == null ? v.currentTime : R.videoTarget(el.video, t, v, (el.time && el.time.start) || 0);
    const m = R.subjectMask(el, st);
    if (!m) return null;
    const c = canvas(W, H), x = c.getContext('2d'), g = frameGeometry(el);
    x.scale(s, s); x.translate(b, b);
    if (g.inner) x.clip(g.inner);
    drawCover(x, m, g.rect || { x: 0, y: 0, w: el.width, h: el.height }, Object.assign({}, el, { filters: null }));
    return c;
  }
  function textFx(c, el, s, t, b = 0) {
    if (el.tfx.style === 'vision') return visionFx(c, el, s, t, b);
    const fx = el.tfx, W = c.width, H = c.height, hot = fx.style === 'thermal', melt = hot ? meltOf(el, fx) : 0;
    // the glow is soft, so heat is worked out small (melted letters need more detail); ink needs its fine specks
    const ws = Math.min(1, (hot ? (melt ? (R.playing ? 480 : 760) : 420) : 1100) / Math.max(W, H)), w = Math.max(1, Math.round(W * ws)), h = Math.max(1, Math.round(H * ws));
    const work = canvas(w, h), wx = work.getContext('2d', { willReadFrequently: true });
    wx.drawImage(c, 0, 0, w, h);
    let d;
    try { d = wx.getImageData(0, 0, w, h); } catch (e) { return c; }
    const px = d.data, n = w * h;
    // a photo or video glows by its brightness, like a heat camera; everything else by its shape
    let a = new Float32Array(n);
    if (hot && el.type === 'image') for (let i = 0; i < n; i++) { const o = i * 4; a[i] = (0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2]) / 255 * px[o + 3] / 255; }
    else for (let i = 0; i < n; i++) a[i] = px[i * 4 + 3] / 255;
    const fs = (el.fontSize || Math.min(el.width, el.height) * 0.3) * s * ws, k = clamp((fx.amount ?? 50) / 100, 0, 1);
    const seed = hashStr(el.id || 'fx') + (fx.seed || 0);
    if (fx.style === 'thermal') {
      // heat: the letters are white-hot, a tight blur glows yellow-orange, a wide one fades through pink to blue
      const r = fs * (0.05 + 0.15 * k), z = fx.move && t != null ? t * 1.2 : 0;
      // melted: the white-hot letters lose their crisp edges and the glow comes from a shape pushed further still
      let src = a;
      if (melt) { const mm = meltMask(a, w, h, fs, melt, seed, z * 0.6); a = mm.core; src = mm.glow; }
      const b1 = blurMap(src, w, h, r * 0.35), b2 = blurMap(src, w, h, r), b3 = blurMap(src, w, h, r * 1.8);
      const nz = valueNoise(w, h, Math.max(4, r * 0.9), seed, z), grain = rng(seed + 7 + Math.floor(z * 10));
      const lut = heatLut(fx.palette || 'thermal');
      for (let i = 0; i < n; i++) {
        const wob = 0.55 + nz[i] * 0.9;
        let v = el.type === 'image' ? clamp(a[i] * 0.82 + b2[i] * 0.22, 0, 1) : Math.max(a[i], Math.min(0.74, b1[i] * 1.5) * (0.8 + 0.2 * wob), Math.min(0.6, b2[i] * 1.3 * wob), b3[i] * 1.1 * wob);
        // fade out towards the bitmap's edge so the glow never ends in a straight line
        const ex = i % w, ey = (i - ex) / w, edge = Math.min(ex, w - 1 - ex, ey, h - 1 - ey) / (Math.min(w, h) * 0.08);
        if (edge < 1 && el.type !== 'image') v *= Math.max(0, edge);
        const g = grain();
        v = v < 0.004 ? 0 : clamp(v + (g - 0.5) * 0.05 * Math.min(1, v * 8), 0, 1);
        const o = Math.round(v * 255) * 4, keep = el.type === 'image' ? px[i * 4 + 3] : -1;
        px[i * 4] = lut[o]; px[i * 4 + 1] = lut[o + 1]; px[i * 4 + 2] = lut[o + 2]; px[i * 4 + 3] = keep >= 0 ? keep : lut[o + 3];
      }
    } else {
      // ink soaking into paper: blur the letters (plus a smear in one direction), then cut the result with a
      // rough threshold so the edges spread unevenly, and spray dots of ink into the halo around them
      const r = fs * (0.012 + 0.045 * k), sm = clamp((fx.smear ?? 25) / 100, 0, 1), rough = clamp((fx.rough ?? 50) / 100, 0, 1), sp = clamp((fx.speckle ?? 50) / 100, 0, 1);
      let m = blurMap(a, w, h, r);
      if (sm > 0) {
        const ang = (fx.angle ?? 30) * Math.PI / 180, len = fs * 0.4 * sm, steps = Math.max(2, Math.min(24, Math.round(len / 2)));
        const dx = Math.cos(ang) * len / steps, dy = Math.sin(ang) * len / steps, base = m.slice();
        for (let j = 1; j <= steps; j++) {
          const ox = Math.round(dx * j), oy = Math.round(dy * j), f = 0.75 * (1 - j / (steps + 1));
          for (let y = Math.max(0, oy); y < Math.min(h, h + oy); y++) {
            const row = y * w, srow = (y - oy) * w;
            for (let x = Math.max(0, ox); x < Math.min(w, w + ox); x++) { const v = base[srow + x - ox] * f; if (v > m[row + x]) m[row + x] = v; }
          }
        }
      }
      const spray = blurMap(m, w, h, r * 1.4 + 1.5), mid = valueNoise(w, h, Math.max(2, fs * 0.05), seed), fine = rng(seed + 3), th = 0.5 - 0.2 * k;
      const col = hexRgb(fx.color || (typeof el.fill === 'string' && !isClear(el.fill) ? el.fill : '#111111'));
      for (let i = 0; i < n; i++) {
        const f = fine();
        const v = m[i] + (mid[i] - 0.5) * rough * 0.45 + (f - 0.5) * rough * 0.18;
        // the letter itself always stays inked; the soaked edge and the spray of dots grow out of it
        let al = Math.max(a[i] > 0.5 ? 1 : a[i], clamp((v - th + 0.035) / 0.07, 0, 1));
        if (al < 1 && spray[i] > 0.01 && f < sp * 0.5 * Math.pow(Math.min(1, spray[i] / th), 2.6)) al = 1;
        else if (al > 0 && a[i] > 0.95 && f > 1 - rough * 0.012) al *= 0.4;
        px[i * 4] = col[0]; px[i * 4 + 1] = col[1]; px[i * 4 + 2] = col[2]; px[i * 4 + 3] = al * 255;
      }
    }
    wx.putImageData(d, 0, 0);
    if (ws === 1 && !hot) return work;
    const out = canvas(W, H), ox = out.getContext('2d');
    ox.imageSmoothingQuality = 'high';
    ox.drawImage(work, 0, 0, W, H);
    if (hot && el.type !== 'image' && !melt) {
      // the letters themselves are the hottest colour, drawn sharp over the upscaled glow
      const lut = heatLut(fx.palette || 'thermal'), core = canvas(W, H), cx = core.getContext('2d');
      cx.drawImage(c, 0, 0); cx.globalCompositeOperation = 'source-in';
      cx.fillStyle = `rgb(${lut[1020]},${lut[1021]},${lut[1022]})`; cx.fillRect(0, 0, W, H);
      ox.drawImage(core, 0, 0);
    }
    return out;
  }

  /* ───────────────────────── layer blurs (text, stickers, shapes…) ───────────────────────── */

  // el.tblur uses the photo blur settings — motion, ghost, zoomBlur, spinBlur, blur (soft), tiltShift, their
  // centre / angle / band, and blurArea + blurPts for spot blurs — measured against the layer's own box
  const TBLUR_KEYS = ['motion', 'ghost', 'zoomBlur', 'spinBlur', 'blur', 'tiltShift'];
  const tblurOn = el => !!(el.tblur && TBLUR_KEYS.some(k => el.tblur[k] > 0));
  R.hasLayerBlur = tblurOn;
  R.layerBlurPad = function (el) {
    if (!tblurOn(el)) return 0;
    const f = el.tblur, M = Math.max(el.width, el.height), a = k => (f[k] || 0) / 100;
    return M * Math.max(a('motion') * 0.05, a('ghost') * 0.25, a('zoomBlur') * 0.24, a('spinBlur') * 0.1, a('tiltShift') * 0.06, (f.blur || 0) * 0.0032) + 4;
  };
  function layerBlur(c, el, s, b) {
    const f = el.tblur, W = c.width, H = c.height;
    const bx = b * s, by = b * s, bw = el.width * s, bh = el.height * s, M = Math.max(bw, bh), k = M / Math.max(W, H);
    // the photo blurs measure against the whole bitmap; scale them to the layer's box instead
    const ux = u => (bx + u * bw) / W, uy = v => (by + v * bh) / H;
    const sharp = c;
    let out = c;
    if (f.motion) out = motionBlur(out, f.motion * k, f.motionAngle || 0);
    if (f.ghost) out = ghostBlur(out, f.ghost * k, f.motionAngle || 0);
    if (f.zoomBlur) out = radialBlur(out, f.zoomBlur, ux(f.blurX ?? 0.5), uy(f.blurY ?? 0.5), 'zoom');
    if (f.spinBlur) out = radialBlur(out, f.spinBlur, ux(f.blurX ?? 0.5), uy(f.blurY ?? 0.5), 'spin');
    if (f.tiltShift) out = tiltShift(out, f.tiltShift * k, uy(f.tiltY ?? 0.5), clamp(f.tiltSize ?? 0.25, 0.02, 1) * bh / H);
    if (f.blur) {
      const o = canvas(W, H), x = o.getContext('2d');
      if ('filter' in x) { x.filter = `blur(${f.blur * M / 1000}px)`; x.drawImage(out, 0, 0); out = o; }
    }
    const pts = f.blurPts || [];
    if (f.blurArea && f.blurArea !== 'all' && pts.length && out !== sharp) {
      const P = pts.map(p => ({ x: ux(p.x), y: uy(p.y), r: (p.r || 0.12) * k }));
      out = blurSpots(sharp, out, P, f.blurArea === 'sharp', (f.blurFeather ?? 60) / 100);
    }
    return out;
  }

  const layerCache = new LRU(60);
  function drawLayered(ctx, el, env) {
    const sh = el.shadow;
    const erased = el.erase && el.erase.length;
    const lb = el.lblur && (el.lblur.gauss > 0 || el.lblur.motion > 0) ? el.lblur : null;
    const tfx = fxOn(el), tb = el.type !== 'image' && tblurOn(el), sty = styleOn(el.sfx);
    if ((!sh || !sh.on) && !erased && !lb && !tfx && !tb && !sty) { drawCore(ctx, el, env); return; }
    const s = Math.min(4, Math.max(0.25, Math.ceil(deviceScale(ctx) * 4) / 4));
    const b = bleed(el);
    const { x, y, rotation, opacity, name, locked, hidden, anim, ...rest } = el;
    // layers that change every frame (speed flashes, video) can't reuse a cached bitmap across time
    const key = JSON.stringify(rest) + '|' + s + '|' + R.fontsVersion + (R.playing ? 'p' : '') + (R.isTimeVarying(el) || (tfx && (el.tfx.style === 'vision' ? el.tfx.move !== false : el.tfx.move)) || (sty && window.StudioStyles.moves(el.sfx)) ? '|' + ('time' in env ? env.time : R.playTime) : '');
    let c = layerCache.get(key);
    if (!c || c.dirty) {
      const W = (el.width + b * 2) * s, H = (el.height + b * 2) * s;
      c = canvas(W, H);
      const x2 = c.getContext('2d');
      x2.scale(s, s); x2.translate(b, b);
      drawCore(x2, el, env);
      if (erased) {
        const mk = canvas(W, H), mx = mk.getContext('2d');
        mx.scale(s, s); mx.translate(b, b);
        mx.fillStyle = mx.strokeStyle = '#000';
        mx.fillRect(-b, -b, el.width + b * 2, el.height + b * 2);
        for (const st of el.erase) {
          mx.globalCompositeOperation = st.m === 'restore' ? 'source-over' : 'destination-out';
          strokeErase(mx, el, st);
        }
        x2.setTransform(1, 0, 0, 1, 0, 0);
        x2.globalCompositeOperation = 'destination-in';
        x2.drawImage(mk, 0, 0);
      }
      // a realtime style (ASCII, dither, glass…) reworks the layer's own picture, keeping its outline
      if (sty) {
        const tt = 'time' in env ? env.time : R.playTime;
        const sc = window.StudioStyles.apply(c, el.sfx, { t: tt, tr: tt, sid: el.id, mask: el.sfx.keepShape !== false, subject: subjectLayerMask(el, env, W, H, s, b) });
        if (sc !== c) { sc.dirty = c.dirty; c = sc; }
      }
      if (tfx) { const fc = textFx(c, el, s, 'time' in env ? env.time : R.playTime, b); fc.dirty = c.dirty; c = fc; }
      if (tb) { const bc = layerBlur(c, el, s, b); bc.dirty = c.dirty; c = bc; }
      if (lb && lb.motion > 0) {
        const sm = motionBlurPx(c, lb.motion * s, lb.angle || 0);
        sm.dirty = c.dirty; c = sm;
      }
      // bake a gaussian layer blur into the cached bitmap: blurring once beats blurring every frame
      if (lb && lb.gauss > 0) {
        const bc = canvas(c.width, c.height), bx = bc.getContext('2d');
        if ('filter' in bx) { bx.filter = `blur(${lb.gauss * s}px)`; bx.drawImage(c, 0, 0); bc.dirty = c.dirty; bc.baked = true; c = bc; }
      }
      // async resources may still be loading; don't cache an incomplete render
      if (!isComplete(el)) c.dirty = true;
      layerCache.set(key, c);
    }
    const ds = deviceScale(ctx);
    ctx.save();
    if (sh && sh.on && sh.style === 'cast') {
      // a shadow lying on the ground behind the subject: its silhouette sheared and squashed from the box's bottom edge
      if (!c.sil || c.sil.src !== key) {
        const sil = canvas(c.width, c.height), sx = sil.getContext('2d');
        sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#000'; sx.fillRect(0, 0, sil.width, sil.height);
        c.sil = sil; c.sil.src = key;
      }
      const hh = el.height, skew = Math.tan(clamp(sh.angle ?? 50, -85, 85) * Math.PI / 180), len = sh.length ?? 0.45;
      ctx.save();
      ctx.transform(1, 0, -skew * len, len, skew * len * hh + (sh.x || 0), hh * (1 - len) + (sh.y || 0));
      ctx.globalAlpha *= clamp(sh.opacity ?? 0.4, 0, 1);
      if ((sh.blur ?? 12) > 0 && 'filter' in ctx) ctx.filter = `blur(${(sh.blur ?? 12) * ds}px)`;
      ctx.drawImage(c.sil, -b, -b, el.width + b * 2, el.height + b * 2);
      ctx.restore();
    } else if (sh && sh.on) {
      ctx.shadowColor = rgba(sh.color || '#000', sh.opacity ?? 0.35);
      ctx.shadowBlur = (sh.blur ?? 20) * ds;
      ctx.shadowOffsetX = (sh.x ?? 0) * ds;
      ctx.shadowOffsetY = (sh.y ?? 12) * ds;
    }
    if (lb && lb.gauss > 0 && !c.baked && 'filter' in ctx) ctx.filter = `blur(${lb.gauss * ds}px)`;
    ctx.drawImage(c, -b, -b, el.width + b * 2, el.height + b * 2);
    ctx.restore();
  }

  function isComplete(el) {
    if (el.type === 'image') return (!el.assetId || !!assetImage(el.assetId)) && (!(el.studio && el.studio.on && el.studio.cutId) || !!assetImage(el.studio.cutId)) && R.subjectReady(el) && (!el.clones || !R.clonesReady || R.clonesReady(el));
    if (el.type === 'sticker') { const svg = stickerSvg(el); return !svg || !!svgImage(svg); }
    return true;
  }

  /* ───────────────────────── background / overlay ───────────────────────── */

  // a see-through canvas shows as a checkerboard while editing
  let checkerPat = null;
  function checker(ctx, w, h) {
    if (!checkerPat) {
      const t = canvas(32, 32), x = t.getContext('2d');
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, 32, 32);
      x.fillStyle = '#e4e4e8'; x.fillRect(0, 0, 16, 16); x.fillRect(16, 16, 16, 16);
      checkerPat = t;
    }
    ctx.save();
    const k = Math.max(w, h) / 1080;
    ctx.scale(k, k);
    ctx.fillStyle = ctx.createPattern(checkerPat, 'repeat');
    ctx.fillRect(0, 0, w / k, h / k);
    ctx.restore();
  }
  R.isClearBg = doc => !!(doc && doc.background && doc.background.none);
  function drawBackground(ctx, doc, opts = {}) {
    const w = doc.width, h = doc.height, bg = doc.background || {};
    // "No background": nothing is painted, so PNG / WebM exports stay see-through
    if (bg.none) { if (opts.editor) checker(ctx, w, h); return; }
    if (!opts.transparent) {
      ctx.fillStyle = makeFill(ctx, { color: bg.color || '#fff', color2: bg.color2, gradient: bg.gradient, angle: bg.angle }, w, h);
      ctx.fillRect(0, 0, w, h);
      if (bg.scene && window.StudioNature) window.StudioNature.drawScene(ctx, w, h, bg.scene);
    }
    if (bg.assetId) {
      let img = assetImage(bg.assetId);
      if (img && opts.editor && isVideoAsset(bg.assetId)) liveSync(img, bg.video, R.playTime, 0);
      if (img && !opts.editor && isVideoAsset(bg.assetId)) img = R.interpFrame(bg.assetId, bg.video, 0, opts.time ?? null) || img;
      if (img) {
        ctx.save();
        ctx.globalAlpha *= bg.imageOpacity ?? 1;
        const el = { crop: bg.crop, filters: bg.filters, flipX: bg.flipX };
        drawCover(ctx, filteredSource(bg.assetId, img, bg.filters), { x: 0, y: 0, w, h }, el);
        overlays(ctx, { x: 0, y: 0, w, h }, bg.filters || {}, isVideoAsset(bg.assetId) ? (opts.time ?? R.playTime ?? null) : null);
        ctx.restore();
      }
    }
    drawPattern(ctx, w, h, bg.pattern);
    const tB = 'time' in opts ? opts.time : R.playTime;
    if (bg.texture) fillTexture(ctx, 'paper', bg.texture, w, h, 1, boilAt(doc, tB), bg.paperId);
    // with relief on, the folds are drawn once above the layers instead (see renderDoc), so the print sits in the paper
    if (bg.crumple && !bg.relief) drawCrumple(ctx, w, h, bg.crumple, bg.crumpleSeed || 1, boilJit(doc, tB, 2));
  }
  R.drawBackground = drawBackground;

  function drawOverlay(ctx, doc, t) {
    const o = doc.overlay || {};
    const w = doc.width, h = doc.height;
    if (t === undefined) t = R.playTime ?? null;
    if (o.burn) filmBurn(ctx, w, h, o.burn, t);
    if (o.flicker) flicker(ctx, w, h, o.flicker, t);
    if (o.vignette) overlays(ctx, { x: 0, y: 0, w, h }, { vignette: o.vignette });
    if (o.grain) fillTexture(ctx, 'grain', o.grain, w, h, grainScale(o.grainSize), t != null ? Math.floor(t * 24) : null);
    if (o.dust) dustScratches(ctx, w, h, o.dust, t != null ? Math.floor(t * 12) : null, 1);
    if (o.tint && o.tintAmount) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha *= o.tintAmount / 100; ctx.fillStyle = o.tint; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    if (o.paper) fillTexture(ctx, 'paper', o.paper, w, h, 1, boilAt(doc, t), o.paperId || (doc.background && doc.background.paperId));
    if (o.grunge) {
      const g = grungeTexture(w, h, (o.grungeSeed || 3)), j = boilJit(doc, t, 5), m = Math.max(w, h) * 0.012;
      ctx.save(); ctx.globalAlpha *= clamp(o.grunge / 100, 0, 1);
      if (j) ctx.drawImage(g, -m + j.dx, -m + j.dy, w + m * 2, h + m * 2); else ctx.drawImage(g, 0, 0, w, h);
      ctx.restore();
    }
    // your own texture (a scan, a paper photo, a texture you downloaded): laid over the frame with a blend mode
    if (o.userTex && o.userTexAmount > 0) {
      const im = assetImage(o.userTex);
      if (im) {
        const iw = im.naturalWidth || im.videoWidth || im.width, ih = im.naturalHeight || im.videoHeight || im.height;
        if (iw && ih) {
          const j = boilJit(doc, t, 9), k = Math.max(w / iw, h / ih) * (j ? 1.06 : 1), dw = iw * k, dh = ih * k;
          ctx.save();
          ctx.globalCompositeOperation = o.userTexBlend || 'multiply'; ctx.globalAlpha *= clamp(o.userTexAmount / 100, 0, 1);
          // boiling: a new crop and a flip every frame, so one still texture keeps moving
          if (j) { ctx.translate(w / 2, h / 2); ctx.scale(j.f % 2 ? -1 : 1, (j.f >> 1) % 2 ? -1 : 1); ctx.translate(-w / 2, -h / 2); }
          ctx.drawImage(im, (w - dw) / 2 + (j ? (j.r() - 0.5) * (dw - w) : 0), (h - dh) / 2 + (j ? (j.r() - 0.5) * (dh - h) : 0), dw, dh);
          ctx.restore();
        }
      }
    }
    if (o.light) {
      // window light: brighter from the top left, falling off toward the far corner, like a sheet photographed by a window
      const a = o.light / 100, g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, `rgba(255,248,232,${0.26 * a})`); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(20,12,0,${0.32 * a})`);
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.restore();
      ctx.save(); ctx.globalAlpha *= 0.5; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.restore();
    }
    if (o.leak) {
      // warm light leak bleeding in from two corners
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha *= o.leak / 100;
      const dr = t != null ? Math.sin(t * 0.5) * 0.08 : 0;
      for (const [x, y, c] of [[w * dr, h * dr, '255,120,40'], [w, h * (0.85 - dr), '255,60,120']]) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.6);
        g.addColorStop(0, `rgba(${c},0.85)`); g.addColorStop(0.5, `rgba(${c},0.25)`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }
    if (o.scanlines) scanlines(ctx, w, h, o.scanlines);
    if (o.blinds) {
      // soft diagonal shadows, like sun through window blinds
      const a = o.blinds / 100, period = Math.max(w, h) * 0.34;
      ctx.save();
      ctx.translate(w / 2, h / 2); ctx.rotate(-0.62); ctx.translate(-w, -h);
      for (let x = 0; x < w * 2.4; x += period) {
        const gg = ctx.createLinearGradient(x, 0, x + period, 0);
        gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(0.3, `rgba(0,0,0,${0.32 * a})`); gg.addColorStop(0.5, `rgba(0,0,0,${0.36 * a})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gg; ctx.fillRect(x, 0, period, h * 2.4);
      }
      ctx.restore();
    }
    if (o.creases) {
      // folded-poster creases: a shadow and a highlight either side of each fold
      const a = o.creases / 100;
      const fold = (x0, y0, x1, y1, vertical) => {
        const span = Math.max(w, h) * 0.012;
        const g = vertical ? ctx.createLinearGradient(x0 - span, 0, x0 + span, 0) : ctx.createLinearGradient(0, y0 - span, 0, y0 + span);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, `rgba(0,0,0,${0.22 * a})`);
        g.addColorStop(0.55, `rgba(255,255,255,${0.35 * a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        if (vertical) ctx.fillRect(x0 - span, 0, span * 2, h); else ctx.fillRect(0, y0 - span, w, span * 2);
      };
      ctx.save();
      fold(w / 2, 0, w / 2, h, true);
      fold(0, h / 3, w, h / 3, false);
      fold(0, h * 2 / 3, w, h * 2 / 3, false);
      fillTexture(ctx, 'paper', 25 * a, w, h);
      ctx.restore();
    }
  }
  R.drawOverlay = drawOverlay;

  /* ───────────────────────── camera ─────────────────────────
     doc.camera moves a virtual camera over the finished layout while the video
     plays: { move, target, zoom, start, dur, rotate, shake, blur, cut }.
     It never changes the layout itself, only how the frame is viewed. */

  R.CAMERA_MOVES = {
    none: 'Still', pushin: 'Slow push-in', pullback: 'Pull-back reveal', whip: 'Whip zoom', snap: 'Snap zoom', crash: 'Crash zoom in & out',
    follow: 'Follow the typing', cuts: 'Hard cuts (close → wide)', drift: 'Handheld drift', pan: 'Pan across', tilt: 'Dutch tilt', jolt: 'Jolt cuts', spiral: 'Spiral in',
    keys: 'Smooth cam (keyframes)',
    typecut: 'Screen typing (follow the caret)',
  };
  const eio = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const eoExpo = p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
  const eioExpo = p => p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2;
  /* ── type & cut: one schedule, worked out from the text, drives the typing, the clips and the camera ──
     camera = { move: 'typecut', target, zoom, cps, cut, hold }: the text types at cps characters a second; the
     clips (image layers with cutin: true, in layer order) cut in at word breaks spread evenly through the text;
     each return to the screen is closer than the last; after the last letter the camera pulls back and holds. */
  const planCache = new LRU(12);
  R.typePlan = function (doc) {
    const c = doc && doc.camera;
    if (!c || c.move !== 'typecut') return null;
    const el = findEl(doc, c.target);
    if (!el || el.type !== 'text') return null;
    const clips = (doc.elements || []).filter(e => e.cutin && !e.hidden);
    const cps = Math.max(2, c.cps || 10), cutLen = Math.max(0.2, c.cut ?? 1), hold = Math.max(0, c.hold ?? 1.8), Z = Math.max(1, c.zoom || 2.6);
    const key = [el.text, el.uppercase, cps, cutLen, hold, Z, !!c.phrases, clips.map(e => e.id).join(',')].join('|');
    const hit = planCache.get(key);
    if (hit) { hit.el = el; return hit; }
    const chars = [...(el.text || '')], N = chars.length;
    if (c.phrases) { const P = phrasePlan(el, chars, cps, hold, Z); planCache.set(key, P); return P; }
    // word breaks: the last letter of each word that has more words after it
    const breaks = [];
    for (let i = 1; i < N; i++) if (/\s/.test(chars[i]) && !/\s/.test(chars[i - 1]) && /\S/.test(chars.slice(i).join(''))) breaks.push(i);
    const K = Math.min(clips.length, breaks.length), at = new Map();
    for (let j = 0; j < K; j++) {
      let b = Math.round((j + 1) * (breaks.length + 1) / (K + 1)) - 1;
      b = clamp(b, 0, breaks.length - 1);
      while (at.has(breaks[b]) && b < breaks.length - 1) b++;
      at.set(breaks[b], clips[j].id);
    }
    const phases = [], LEAD = 0.35, PAUSE = 0.22;
    // a person types in bursts: quicker inside a word, a beat at each space, longer after punctuation, the odd hesitation.
    // kt[i] is when character i lands; the same text always gets the same rhythm.
    const rr = rng(hashStr(el.text || '') + 17), kt = new Array(N);
    const gap = i => {
      const ch = chars[i], prev = chars[i - 1] || '';
      let d = (1 / cps) * (0.55 + rr() * 0.9);
      if (/\s/.test(ch)) d *= 1.45;
      if (/[.,!?;:—–-]/.test(prev)) d *= 2.4;
      if (rr() < 0.05) d *= 2.6;
      return d;
    };
    let t = LEAD, typed = 0, zoom = Z, visit = 0;
    const stops = [...at.keys()].sort((a, b) => a - b).concat([N]);
    phases.push({ kind: 'type', t0: 0, t1: LEAD, zoom, seg: 'type0' });
    for (const stop of stops) {
      const t0 = t;
      for (let i = typed; i < stop; i++) { t += gap(i); kt[i] = t; }
      if (stop < N) t += PAUSE;
      phases.push({ kind: 'type', t0, t1: t, zoom, seg: 'type' + visit });
      typed = stop;
      if (stop < N) {
        phases.push({ kind: 'cut', t0: t, t1: t + cutLen, id: at.get(stop), seg: 'cut' + visit });
        t += cutLen; visit++;
        zoom = Math.min(Z * 2.2, Z * (1 + 0.32 * visit));
        // the space after the word is already there when the screen comes back
        while (typed < N && /\s/.test(chars[typed])) { kt[typed] = t; typed++; }
      }
    }
    const lastZoom = zoom;
    phases.push({ kind: 'type', t0: t, t1: t + 0.55, zoom: lastZoom, seg: 'type' + visit });
    t += 0.55;
    const PULL = 1.1;
    phases.push({ kind: 'pull', t0: t, t1: t + PULL, zoom: lastZoom, seg: 'pull' });
    t += PULL;
    phases.push({ kind: 'end', t0: t, t1: t + hold, seg: 'end' });
    t += hold;
    const total = t;
    const find = tt => phases.find(p => tt >= p.t0 && tt < p.t1) || phases[phases.length - 1];
    // how many characters are on screen at tt (binary search over the keystroke times)
    const count = tt => { let lo = 0, hi = N; while (lo < hi) { const m = (lo + hi) >> 1; if (kt[m] <= tt) lo = m + 1; else hi = m; } return lo; };
    const plan = {
      el, total, phases, kt,
      phase(tt) {
        const p = find(tt);
        return Object.assign({}, p, p.kind === 'pull' ? { k: clamp((tt - p.t0) / (p.t1 - p.t0), 0, 1) } : {});
      },
      charsAt: count,
      // the same, gliding between keystrokes (for the camera)
      charsAtF(tt) {
        const n = count(tt);
        if (n >= N) return N;
        const a = n ? kt[n - 1] : LEAD, b = kt[n];
        return n + clamp((tt - a) / Math.max(1e-3, b - a), 0, 1) * (b - a < 0.6 ? 1 : 0);
      },
      cutAt(tt) { const p = find(tt); return p.kind === 'cut' ? p.id : null; },
    };
    planCache.set(key, plan);
    return plan;
  };
  // phrase by phrase: each line of the text is typed on an empty screen, held a beat, then the shot cuts to the next line.
  // Short phrases are framed closer. view(n) says which phrase is on screen and how much of it is typed.
  function phrasePlan(el, chars, cps, hold, Z) {
    const N = chars.length, rr = rng(hashStr(el.text || '') + 29), kt = new Array(N), phases = [], ph = [];
    let a = 0;
    for (let i = 0; i <= N; i++) if (i === N || chars[i] === '\n') { if (i > a) ph.push({ s: a, e: i }); a = i + 1; }
    const LEAD = 0.35, HOLD = 0.6;
    let t = LEAD;
    phases.push({ kind: 'type', t0: 0, t1: LEAD, zoom: Z, seg: 'type0', p: 0 });
    ph.forEach((p, j) => {
      const len = p.e - p.s, zoom = Z * clamp(Math.sqrt(11 / Math.max(3, len)), 0.8, 1.45), t0 = j ? t : 0;
      // the first letter of a new phrase is already there when the shot cuts in
      if (j) { kt[p.s - 1] = t; kt[p.s] = t; } 
      for (let i = p.s + (j ? 1 : 0); i < p.e; i++) {
        let d = (1 / cps) * (0.55 + rr() * 0.9);
        if (/\s/.test(chars[i])) d *= 1.45;
        if (/[.,!?;:—–-]/.test(chars[i - 1] || '')) d *= 2.4;
        if (rr() < 0.05) d *= 2.6;
        t += d; kt[i] = t;
      }
      t += j < ph.length - 1 ? HOLD : 0.4;
      phases.push({ kind: 'type', t0, t1: t, zoom, seg: 'phrase' + j, p: j });
    });
    for (let i = 0; i < N; i++) if (kt[i] == null) kt[i] = i ? kt[i - 1] : LEAD;
    const last = phases[phases.length - 1];
    // the last phrase stays framed to the end
    phases.push({ kind: 'type', t0: t, t1: t + hold, zoom: last.zoom, seg: last.seg, p: last.p });
    t += hold;
    const count = tt => { let lo = 0, hi = N; while (lo < hi) { const m = (lo + hi) >> 1; if (kt[m] <= tt) lo = m + 1; else hi = m; } return lo; };
    const find = tt => phases.find(p => tt >= p.t0 && tt < p.t1) || phases[phases.length - 1];
    const plan = {
      el, total: t, phases, kt, phrases: ph,
      phase(tt) { return find(tt); },
      charsAt: count,
      charsAtF(tt) {
        const n = count(tt);
        if (n >= N) return N;
        const a2 = n ? kt[n - 1] : LEAD, b = kt[n];
        return n + clamp((tt - a2) / Math.max(1e-3, b - a2), 0, 1) * (b - a2 < 0.6 ? 1 : 0);
      },
      cutAt() { return null; },
      // the phrase on screen once n characters have been typed
      view(n) {
        let j = 0;
        while (j < ph.length - 1 && n > ph[j].e) j++;
        const p = ph[j] || { s: 0, e: 0 };
        return { j, text: chars.slice(p.s, clamp(n, p.s, p.e)).join(''), full: chars.slice(p.s, p.e).join('') };
      },
    };
    return plan;
  }
  // a text element showing just one typed phrase, centred in the layer's box
  function phraseEl(el, v) {
    const e = Object.assign({}, el, { text: v.text, autoWidth: false, width: el.width, _full: v.full, _typing: v.text.length < v.full.length });
    e._yShift = (el.height - layoutText(Object.assign({}, el, { text: v.full, _full: null, autoWidth: false, width: el.width })).boxH) / 2;
    return e;
  }
  // write the schedule back into the design: the video length, and each clip's slot (so a video clip starts at its cut)
  R.applyTypePlan = function (doc) {
    const P = R.typePlan(doc);
    if (!P) return false;
    let changed = false;
    const d = Math.round(P.total * 10) / 10;
    if (!doc.anim) doc.anim = { duration: d, fps: 30 };
    if (doc.anim.duration !== d) { doc.anim.duration = d; changed = true; }
    const slot = new Map(P.phases.filter(p => p.kind === 'cut').map(p => [p.id, p]));
    for (const e of doc.elements || []) {
      if (!e.cutin) continue;
      const p = slot.get(e.id), want = p ? { start: Math.round(p.t0 * 1000) / 1000, end: Math.round(p.t1 * 1000) / 1000 } : null;
      if (JSON.stringify(e.time || null) !== JSON.stringify(want)) { if (want) e.time = want; else delete e.time; changed = true; }
    }
    return changed;
  };
  function typePlanFor(doc, el) {
    const P = doc && R.typePlan(doc);
    return P && P.el && P.el.id === el.id ? P : null;
  }
  // fill in each key from the one before it; x / y may be fractions of the canvas (≤ 1)
  function camKeys(c, W, H) {
    const out = [];
    let prev = { t: 0, x: W / 2, y: H / 2, z: 1, r: 0 };
    for (const k of (c.keys || []).slice().sort((p, q) => p.t - q.t)) {
      const n = Object.assign({}, prev, k);
      if (k.x != null && k.x <= 1) n.x = k.x * W;
      if (k.y != null && k.y <= 1) n.y = k.y * H;
      out.push(n); prev = n;
    }
    return out;
  }
  function findEl(doc, key) { return key ? (doc.elements || []).find(e => e.id === key || e.key === key) : null; }
  function elCentre(el) {
    const a = (el.rotation || 0) * Math.PI / 180, w = el.width / 2, h = el.height / 2;
    return { x: el.x + w * Math.cos(a) - h * Math.sin(a), y: el.y + w * Math.sin(a) + h * Math.cos(a) };
  }
  // where the typing caret sits (in canvas coordinates) at time t
  R.caretAt = function (el, t, doc) {
    let e = el;
    if (t != null && el.anim && el.anim.enter === 'typewriter') {
      const A = animState(el, t, doc);
      const chars = [...(el.text || '')];
      if (A.chars != null && A.chars < chars.length) e = Object.assign({}, el, { text: chars.slice(0, A.chars).join(''), autoWidth: false, width: el.width, _full: el.text });
    }
    const L = layoutText(e), T = typingBoxes(e, L);
    const lx = T.caret.x, ly = T.caret.base - L.cap * 0.5;
    const a = (el.rotation || 0) * Math.PI / 180;
    return { x: el.x + lx * Math.cos(a) - ly * Math.sin(a), y: el.y + lx * Math.sin(a) + ly * Math.cos(a) };
  };
  // the caret after n characters (n may be fractional: it glides between the two letters around it)
  R.caretAtChars = function (el, n, P) {
    const chars = [...(el.text || '')], at = k => {
      const kk = clamp(Math.floor(k), 0, chars.length);
      const e = P && P.phrases ? phraseEl(el, P.view(kk)) : kk < chars.length ? Object.assign({}, el, { text: chars.slice(0, kk).join(''), autoWidth: false, width: el.width, _full: el.text }) : el;
      const L = layoutText(e), T = typingBoxes(e, L);
      return { x: T.caret.x, y: T.caret.base - L.cap * 0.5 + (e._yShift || 0) };
    };
    const lo = at(n), f = n - Math.floor(n), hi = f > 0 ? at(n + 1) : lo;
    // across a line break, jump rather than slide through the middle of the text
    const p = Math.abs(hi.y - lo.y) > 1 ? (f < 0.5 ? lo : hi) : { x: lo.x + (hi.x - lo.x) * f, y: lo.y };
    const a = (el.rotation || 0) * Math.PI / 180;
    return { x: el.x + p.x * Math.cos(a) - p.y * Math.sin(a), y: el.y + p.x * Math.sin(a) + p.y * Math.cos(a) };
  };
  function focusAt(doc, c, t) {
    const el = findEl(doc, c.target);
    if (!el) return null;
    if (c.move === 'follow' && el.type === 'text') {
      // ease toward the caret instead of locking onto every keystroke
      let x = 0, y = 0, wsum = 0;
      for (let k = 0; k < 6; k++) { const p = R.caretAt(el, Math.max(0, t - k * 0.05), doc), w = 6 - k; x += p.x * w; y += p.y * w; wsum += w; }
      return { x: x / wsum, y: y / wsum };
    }
    return elCentre(el);
  }
  // focus hunting (camera.hunt 0–100): during each camera move the lens hunts — soft, sharp, soft again, then settles
  // sharp as the move ends — and "breathes" (the framing swells a touch with the focus). Returns 0…1 for time t.
  function huntAt(doc, t) {
    const c = doc && doc.camera;
    if (!c || !(c.hunt > 0) || t == null || !c.move || c.move === 'none') return 0;
    const segs = [];
    if (c.move === 'keys') {
      const K = camKeys(c, doc.width, doc.height);
      for (let i = 0; i < K.length - 1; i++) {
        const a = K[i], b = K[i + 1], L = b.t - a.t;
        if (L > 0.3 && (Math.abs(b.z - a.z) > 0.02 || Math.hypot(b.x - a.x, b.y - a.y) > doc.width * 0.02)) segs.push([a.t, L]);
      }
    } else if (['pushin', 'pullback', 'whip', 'crash', 'spiral', 'follow', 'snap'].includes(c.move)) segs.push([c.start || 0, Math.max(0.3, c.dur || 1.5)]);
    else if (c.move === 'drift') segs.push([0, Math.max(0.5, (doc.anim && doc.anim.duration) || 5)]);
    for (const [t0, L] of segs) {
      // the lens hunts as the move gets going — soft, sharp, soft again — and has locked focus by about 40% in (or 1.6 s),
      // so the rest of the beat reads sharp
      const L2 = Math.min(L * 0.4, 1.6), u = (t - t0) / L2;
      if (u < 0 || u > 1) continue;
      const env = Math.pow(Math.sin(Math.PI * u), 0.7);
      const ph = 0.5 + 0.5 * Math.cos(Math.PI * 2 * (u * 1.8 + 0.08));
      return clamp(env * (0.3 + 0.7 * ph) * c.hunt / 100, 0, 1);
    }
    return 0;
  }
  R.huntAt = huntAt;
  // the hunt as a blur radius in canvas pixels for a frame of width w
  R.huntBlurPx = (doc, t, w) => huntAt(doc, t) * w * 0.009;
  function camAt(doc, t) {
    const c0 = doc.camera, weave = (doc.overlay && doc.overlay.weave) || 0;
    if (t == null || (!weave && (!c0 || !c0.move || c0.move === 'none'))) return null;
    const c = c0 && c0.move && c0.move !== 'none' ? c0 : { move: 'none' };
    const W = doc.width, H = doc.height, C = { x: W / 2, y: H / 2 };
    const D = Math.max(0.5, (doc.anim && doc.anim.duration) || 5);
    const T0 = focusAt(doc, c, t) || C;
    const Z = Math.max(1, c.zoom || 2), s0 = c.start || 0, d = Math.max(0.05, c.dur || 1.5), rot = c.rotate || 0;
    const p = clamp((t - s0) / d, 0, 1);
    const mix = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
    let f = C, z = 1, r = 0, seg;
    switch (c.move) {
      case 'pushin': { const k = eio(p); f = mix(C, T0, k); z = 1 + (Z - 1) * k; r = rot * k; break; }
      case 'pullback': { const k = 1 - Math.pow(1 - p, 2.6); f = mix(T0, C, k); z = Z + (1 - Z) * k; r = rot * (1 - k); break; }
      case 'whip': { const k = eioExpo(p); f = mix(C, T0, k); z = 1 + (Z - 1) * k; r = rot * Math.sin(Math.PI * p) + rot * 0.15 * k; break; }
      case 'snap': { const q = clamp((t - s0) / 0.14, 0, 1), k = q <= 0 ? 0 : easeBack(q); f = mix(C, T0, Math.min(1, k)); z = (1 + (Z - 1) * k) * (1 + 0.06 * p); r = rot * Math.min(1, k); break; }
      case 'crash': { const k = p < 0.5 ? eioExpo(p * 2) : 1 - eioExpo((p - 0.5) * 2); f = mix(C, T0, k); z = 1 + (Z - 1) * k; r = rot * k; break; }
      case 'follow': { const k = eio(clamp((t - s0) / Math.min(d, 0.45), 0, 1)); f = mix(C, T0, k); z = 1 + (Z - 1) * k; r = rot * k; break; }
      case 'drift': { const k = t / D; z = 1 + (Z - 1) * k; f = { x: C.x + (T0.x - C.x) * k + Math.sin(t * 0.9) * W * 0.01, y: C.y + (T0.y - C.y) * k + Math.cos(t * 0.7) * H * 0.008 }; r = Math.sin(t * 0.6) * (rot || 1.5); break; }
      case 'pan': { const k = eio(p); z = Z; f = { x: W / 2 / z + (W - W / z) * k, y: T0.y }; r = rot; break; }
      case 'tilt': { const k = eio(p); z = Z; f = mix(C, T0, 0.5); r = -(rot || 8) + 2 * (rot || 8) * k; break; }
      case 'cuts': {
        // three hard cuts from a tight close-up out to the full frame, each shot creeping in
        const shot = p >= 1 ? 3 : Math.floor(p * 3), q = p >= 1 ? clamp((t - s0 - d) / Math.max(0.5, D - s0 - d), 0, 1) : (p * 3) % 1;
        const zs = [Z, 1 + (Z - 1) * 0.45, 1.12, 1];
        f = shot === 0 ? T0 : shot === 1 ? mix(T0, C, 0.35) : shot === 2 ? mix(T0, C, 0.8) : C;
        z = zs[shot] * (1 + 0.05 * q); r = shot === 1 ? rot * 0.6 : shot === 0 ? -rot * 0.4 : 0;
        break;
      }
      case 'spiral': { const k = eio(p); f = mix(C, T0, k); z = 1 + (Z - 1) * k; r = (rot || 25) * (1 - k); break; }
      case 'typecut': {
        // type & cut: zoomed in on the caret while typing, the full frame during clips, a pull-back at the end
        const P = R.typePlan(doc), el = P && P.el;
        if (!P) break;
        const ph = P.phase(t);
        seg = ph.seg;
        if (ph.kind === 'cut') { f = C; z = 1; break; }
        // follow a continuously gliding caret, eased over the last ~0.3 s so the camera trails the typing smoothly
        const caret = () => { let x = 0, y = 0, ws = 0; for (let k = 0; k < 8; k++) { const q = R.caretAtChars(el, P.charsAtF(Math.max(ph.t0, t - k * 0.04)), P), w = 8 - k; x += q.x * w; y += q.y * w; ws += w; } return { x: x / ws, y: y / ws }; };
        if (ph.kind === 'type' && P.phrases && ph.p != null) {
          // phrase by phrase: keep the whole phrase in shot, leaning toward the caret, closer for short phrases
          const pr = P.phrases[ph.p], a = R.caretAtChars(el, pr.s + 1e-6, P), b = R.caretAtChars(el, pr.e, P), cq = caret();
          const span = Math.max(1, Math.abs(b.x - a.x)), mid = (a.x + b.x) / 2;
          f = { x: mid + (cq.x - mid) * 0.25, y: cq.y };
          z = Math.min(ph.zoom, W * 0.64 / span) * (1 + 0.02 * Math.min(8, t - ph.t0)); r = rot;
          break;
        }
        if (ph.kind === 'type') { f = caret(); z = ph.zoom * (1 + 0.02 * Math.min(8, t - ph.t0)); r = rot; break; }
        if (ph.kind === 'pull') { const k = eio(ph.k); f = mix(caret(), C, k); z = ph.zoom + (1 - ph.zoom) * k; r = rot * (1 - k); break; }
        f = C; z = 1 + 0.012 * (t - ph.t0);
        break;
      }
      case 'keys': {
        // keyframed camera: { t, x, y, z, r, ease } — each key eases in from the one before ('expo' for a whip)
        const K = camKeys(c, W, H);
        if (!K.length) break;
        let i = 0;
        while (i < K.length - 1 && t >= K[i + 1].t) i++;
        const a = K[i], b = K[Math.min(K.length - 1, i + 1)];
        const q = b === a ? 0 : clamp((t - a.t) / Math.max(1e-3, b.t - a.t), 0, 1);
        const k = b.ease === 'expo' ? eioExpo(q) : b.ease === 'out' ? eoExpo(q) : b.ease === 'linear' ? q : eio(q);
        f = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; z = a.z + (b.z - a.z) * k; r = a.r + (b.r - a.r) * k;
        break;
      }
      case 'jolt': {
        const slot = Math.max(0.05, c.cut || 0.15), n = Math.floor(t / slot), rr = rng(n * 7919 + 101);
        z = 1 + (Z - 1) * (0.35 + rr() * 0.65); r = (rr() - 0.5) * 2 * (rot || 3);
        const wd = c.wander ?? 1;
        f = { x: T0.x + (rr() - 0.5) * W * 0.05 * wd, y: T0.y + (rr() - 0.5) * H * 0.04 * wd };
        break;
      }
    }
    if (c0 && c0.hunt > 0) z *= 1 + 0.014 * huntAt(doc, t);
    if (weave) {
      // gate weave: film never sits perfectly still in the gate — it hops a little every frame
      const a = weave / 100, rr = rng(Math.floor(t * 18) * 131 + 7);
      z *= 1 + 0.014 * a;
      f = { x: f.x + (rr() - 0.5) * W * 0.005 * a / z, y: f.y + (rr() - 0.5) * H * 0.007 * a / z };
      r += (rr() - 0.5) * 0.25 * a;
    }
    if (c.shake) {
      const a = c.shake;
      f = { x: f.x + (Math.sin(t * 7.3) + 0.6 * Math.sin(t * 13.1 + 1.7)) * W * 0.004 * a / z, y: f.y + (Math.cos(t * 6.1) + 0.6 * Math.sin(t * 11.3 + 0.4)) * H * 0.004 * a / z };
      r += Math.sin(t * 5.3 + 0.8) * 0.5 * a;
    }
    // never show past the canvas edge: zoom enough to cover the rotation, keep the view inside
    const ar = Math.abs(r) * Math.PI / 180, asp = Math.max(W / H, H / W);
    z = Math.max(z, Math.cos(ar) + Math.sin(ar) * asp) * (z > 1.0001 || ar ? 1.004 : 1);
    const hw = W / 2 / z, hh = H / 2 / z;
    f = { x: clamp(f.x, hw, W - hw), y: clamp(f.y, hh, H - hh) };
    return { fx: f.x, fy: f.y, z, r, seg };
  }
  R.camAt = camAt;
  R.hasCamera = doc => !!(doc && doc.camera && doc.camera.move && doc.camera.move !== 'none');
  function camMatrix(doc, cam) {
    return new DOMMatrix().translate(doc.width / 2, doc.height / 2).rotate(cam.r).scale(cam.z).translate(-cam.fx, -cam.fy);
  }

  /* ───────────────────────── whole-document render ───────────────────────── */

  function fontsOf(doc) {
    const out = [];
    for (const el of doc.elements || []) {
      if (el.type === 'text' || el.type === 'checklist') out.push([el.fontFamily, el.fontWeight || 400, !!el.italic]);
      if (el.type === 'calendar') { out.push([el.titleFont || 'Instrument Serif', el.titleWeight || 400, false], [el.bodyFont || 'Instrument Sans', el.bodyWeight || 500, false], [el.bodyFont || 'Instrument Sans', 600, false]); }
      if (el.type === 'ribbon' && el.text) out.push([el.fontFamily || 'Space Mono', el.fontWeight || 700, !!el.italic]);
      if (el.type === 'camera') { if (el.style === 'camcorder') out.push([el.fontFamily || 'VT323', 400, false]); else out.push([el.fontFamily || 'Inter', 600, false], [el.fontFamily || 'Inter', 700, false]); }
      if (el.type === 'badge') { out.push([el.ringFont || 'Bricolage Grotesque', el.ringWeight || 600, false]); if (el.center === 'text') out.push([el.centerFont || el.ringFont || 'Bricolage Grotesque', el.centerWeight || 700, !!el.centerItalic]); }
      if (el.type === 'captions' && el.cap && window.StudioCaptions) out.push(...window.StudioCaptions.fontsOf(el));
    }
    return out.filter(f => Fonts.BY_NAME[f[0]]).map(([f, w, i]) => [f, Fonts.nearestWeight(f, w), i]);
  }
  R.preload = async function (doc) {
    const jobs = [];
    for (const [f, w, i] of fontsOf(doc)) jobs.push(Fonts.ensure(f, w, i));
    // the paper scans this design uses (decoding them is quick, so all of them)
    for (const p of (window.StudioPapers ? window.StudioPapers.LIST : [])) { const e = paperLoad(p.id); if (e) jobs.push(e.promise); }
    const ids = new Set();
    if (doc.background && doc.background.assetId) ids.add(doc.background.assetId);
    for (const el of doc.elements || []) {
      if (el.type === 'image' && el.assetId) ids.add(el.assetId);
      if (el.type === 'image' && el.seq && el.seq.ids) for (const a of el.seq.ids) ids.add(a);
      if (el.type === 'image' && el.studio && el.studio.cutId) ids.add(el.studio.cutId);
      if (el.type === 'image' && el.subj && el.subj.sheets) for (const a of el.subj.sheets) ids.add(a);
      if (el.type === 'flashes') for (const it of flashSources(el)) jobs.push(loadImage(it.src, imgCache, it.key).promise);
      if (el.type === 'sticker') { const svg = stickerSvg(el); if (svg) jobs.push(loadImage(R.svgDataUrl(svg), svgCache, svg).promise); }
    }
    for (const id of ids) if (assets[id]) jobs.push(isVideoAsset(id) ? assetVideo(id).promise : loadImage(assets[id], imgCache, id).promise);
    await Promise.all(jobs);
    R.fontsVersion++;
    requestRedraw();
  };

  // chromatic aberration: the red channel spreads a little wider than green and blue
  let rgbA = null, rgbB = null;
  function rgbSplit(ctx, src, px) {
    const w = src.width, h = src.height;
    if (!rgbA || rgbA.width !== w || rgbA.height !== h) { rgbA = canvas(w, h); rgbB = canvas(w, h); }
    const a = rgbA.getContext('2d'), b = rgbB.getContext('2d');
    const tint = (x, col) => {
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1;
      x.globalCompositeOperation = 'copy'; x.drawImage(src, 0, 0);
      x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, w, h);
      x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0);
      x.globalCompositeOperation = 'source-over';
    };
    tint(a, '#ff0000'); tint(b, '#00ffff');
    const k = (w + px * 3) / w, kh = (h + px * 1.8) / h;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'copy'; ctx.globalAlpha = 1;
    // both channels are drawn slightly enlarged so the frame edges stay covered
    const k0 = (w + px) / w;
    ctx.drawImage(rgbB, -(w * k0 - w) / 2, -(h * k0 - h) / 2, w * k0, h * k0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(rgbA, -(w * k - w) / 2, -(h * kh - h) / 2, w * k, h * kh);
    ctx.restore();
  }
  R.rgbSplit = function (ctx, px) {
    const c = ctx.canvas;
    if (!c || !(px > 0.3)) return;
    const copy = canvas(c.width, c.height);
    copy.getContext('2d').drawImage(c, 0, 0);
    rgbSplit(ctx, copy, px);
  };
  let scanTile = null;
  function scanlines(ctx, w, h, amt) {
    if (!scanTile) {
      scanTile = canvas(4, 4);
      const x = scanTile.getContext('2d');
      x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 0, 4, 1.4);
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(0, 2, 4, 0.8);
    }
    const pat = ctx.createPattern(scanTile, 'repeat');
    ctx.save(); ctx.globalAlpha *= clamp(amt / 100, 0, 1) * 0.6; ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  let blurBuf = null;
  /* ── screen close-up: the design shown on a real display, filmed from a few centimetres away ──
     doc.screen = { on, pitch, grid, focus, dust }: the design is rendered at the screen's own resolution (one image pixel
     per screen pixel, `pitch` canvas units apart), drawn back with hard pixel edges under the camera, and a pixel mesh with
     RGB sub-pixels is laid over it — all locked to the screen, so it grows as the camera moves in. A little lens softness,
     a shallow depth of field and specks of dust on the glass finish the look. */
  let panelBuf = null;
  const meshTiles = new Map();
  function meshTile(T) {
    let tile = meshTiles.get(T);
    if (tile) return tile;
    tile = canvas(T, T);
    const x = tile.getContext('2d'), gap = Math.max(1, Math.round(T * 0.16)), w = (T - gap) / 3;
    // dark gaps between pixels; inside each, red / green / blue sub-pixel columns (only faintly tinted, as a camera sees them)
    x.fillStyle = 'rgb(118,124,124)'; x.fillRect(0, 0, T, T);
    [[255, 232, 228], [236, 255, 240], [232, 240, 255]].forEach(([r, g, b], i) => { x.fillStyle = `rgb(${r},${g},${b})`; x.fillRect(Math.round(i * w), 0, Math.max(1, Math.round((i + 1) * w) - Math.round(i * w) - (T >= 9 && i < 2 ? 1 : 0)), T - gap); });
    meshTiles.set(T, tile);
    return tile;
  }
  function drawScreen(ctx, doc, opts, t, scr, k0) {
    const W = doc.width, H = doc.height, p = Math.max(0.2, scr.pitch || 1);
    const pw = Math.ceil(W / p), ph = Math.ceil(H / p);
    if (!panelBuf || panelBuf.width !== pw || panelBuf.height !== ph) panelBuf = canvas(pw, ph);
    R.renderDoc(doc, { canvas: panelBuf, scale: pw / W, time: t, _panel: true, transparent: opts.transparent });
    const P = p * k0; // output pixels per screen pixel
    ctx.save();
    ctx.imageSmoothingEnabled = P < 2;
    ctx.drawImage(panelBuf, 0, 0, pw * p, ph * p);
    ctx.imageSmoothingEnabled = true;
    // the pixel mesh: fades in once the pixels are big enough to resolve (no moiré when pulled back)
    const vis = clamp((P - 1.8) / 2.2, 0, 1) * clamp((scr.grid ?? 70) / 100, 0, 1);
    if (vis > 0.01) {
      const T = clamp(Math.round(P), 3, 24), pat = ctx.createPattern(meshTile(T), 'repeat');
      pat.setTransform(new DOMMatrix().scale(p / T));
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = vis; ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
      // expose for the bright screen: colour-dodge lifts the whites back to white but leaves dark text dark
      ctx.globalCompositeOperation = 'color-dodge'; ctx.fillStyle = 'rgb(34,34,34)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    // dust on the glass: a few soft specks fixed to the screen
    const nd = Math.round(scr.dust ?? 6);
    if (nd > 0) {
      const r = rng(77 + nd);
      for (let i = 0; i < nd * 6; i++) {
        const x = r() * W, y = r() * H, rad = p * (0.5 + r() * r() * 3), a = 0.12 + r() * 0.25;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, `rgba(30,32,30,${a})`); g.addColorStop(1, 'rgba(30,32,30,0)');
        ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
    ctx.restore();
  }
  // lens softness everywhere, and a shallow depth of field: sharp across the middle, softer above and below
  function screenLens(c, ctx, scr, P) {
    const W = c.width, H = c.height;
    const soft = Math.min(7, Math.max(0, P * 0.32)), focus = clamp((scr.focus ?? 45) / 100, 0, 1);
    if (!('filter' in ctx) || (soft < 0.4 && !focus)) return;
    const src = canvas(W, H), sx = src.getContext('2d');
    sx.filter = soft >= 0.4 ? `blur(${soft}px)` : 'none'; sx.drawImage(c, 0, 0); sx.filter = 'none';
    let out = src;
    if (focus > 0) {
      const far = canvas(W, H), fx = far.getContext('2d');
      fx.filter = `blur(${Math.max(1, focus * Math.max(W, H) * 0.012)}px)`; fx.drawImage(src, 0, 0); fx.filter = 'none';
      const g = fx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.24, 'rgba(0,0,0,0)'); g.addColorStop(0.76, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      fx.globalCompositeOperation = 'destination-in'; fx.fillStyle = g; fx.fillRect(0, 0, W, H);
      sx.drawImage(far, 0, 0);
      out = src;
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(out, 0, 0); ctx.restore();
  }

  // stepped motion (doc.anim.step, e.g. 12): layers, camera and cuts move in held steps, like graphics animated on twos;
  // grain and film finishes keep the real time so the frame still breathes
  R.stepTime = (doc, t) => (t == null || !(doc && doc.anim && doc.anim.step > 0)) ? t : Math.floor(t * doc.anim.step + 1e-6) / doc.anim.step;
  /* ── groups: a template or several layers over a video kept together as one piece (timeline.js / app.js) ──
     doc.groups[gid] = { id, name, origin, start, end, lane, hidden, sfx, opacity, blend }; members carry el.grp. A group with
     its own look (a Style, opacity under 100 % or a blend) is drawn as one picture: its layers into a buffer, the style on that. */
  R.groupOf = (doc, el) => (el && el.grp && doc && doc.groups && doc.groups[el.grp]) || null;
  R.groupComposite = g => !!g && ((g.sfx && styleOn(g.sfx)) || (g.opacity ?? 1) < 0.999 || (!!g.blend && g.blend !== 'normal'));
  function drawGroup(ctx, doc, g, env = {}) {
    const W = doc.width, H = doc.height, t = 'time' in env ? env.time : R.playTime;
    if (t != null && (t < (g.start || 0) - 1e-6 || (g.end != null && t >= g.end))) return;
    const m = ctx.getTransform(), k = Math.max(0.1, Math.min(Math.hypot(m.a, m.b), 1600 / Math.max(W, H)));
    const c = canvas(Math.max(1, Math.round(W * k)), Math.max(1, Math.round(H * k))), x = c.getContext('2d');
    x.scale(k, k);
    for (const el of doc.elements) {
      if (el.grp !== g.id || el.hidden) continue;
      x.save(); x.translate(el.x, el.y); x.rotate((el.rotation || 0) * Math.PI / 180);
      x.globalAlpha = el.opacity ?? 1;
      if (el.blend && el.blend !== 'normal') x.globalCompositeOperation = el.blend;
      drawElement(x, el, env);
      x.restore();
    }
    let out = c;
    if (g.sfx && styleOn(g.sfx) && window.StudioStyles) out = window.StudioStyles.apply(c, g.sfx, { t, mask: g.sfx.keepShape !== false });
    ctx.save();
    ctx.globalAlpha *= g.opacity ?? 1;
    if (g.blend && g.blend !== 'normal') ctx.globalCompositeOperation = g.blend;
    ctx.drawImage(out, 0, 0, W, H);
    ctx.restore();
  }
  R.drawGroup = drawGroup;
  R.renderDoc = function (doc, opts = {}) {
    const scale = opts.scale || 1;
    const tReal = opts.time ?? null;
    if (tReal != null && doc.anim && doc.anim.step > 0) opts = Object.assign({}, opts, { time: R.stepTime(doc, tReal) });
    const c = opts.canvas || canvas(doc.width * scale, doc.height * scale);
    const ctx = c.getContext('2d');
    if (opts.canvas) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); }
    const t = opts.time ?? null;
    // a "panel" render is the screen's own picture for the close-up look: no camera, no finish on top
    const panel = !!opts._panel, scr = !panel && doc.screen && doc.screen.on ? doc.screen : null;
    const cam = t != null && !panel ? camAt(doc, t) : null;
    const sx = c.width / doc.width, sy = c.height / doc.height;
    ctx.save();
    ctx.scale(sx, sy);
    if (cam) ctx.transform(...(m => [m.a, m.b, m.c, m.d, m.e, m.f])(camMatrix(doc, cam)));
    if (scr) drawScreen(ctx, doc, opts, t, scr, sx * (cam ? cam.z : 1));
    else {
      drawBackground(ctx, doc, opts);
      const env = Object.assign({}, opts, { time: opts.time ?? null, doc });
      const grpDone = new Set();
      for (const el of doc.elements || []) {
        if (el.hidden) continue;
        const g = el.grp ? R.groupOf(doc, el) : null;
        if (g && g.hidden) continue;
        // a group with its own look is drawn once, as one picture, where its lowest layer sits
        if (g && R.groupComposite(g)) { if (!grpDone.has(g.id)) { grpDone.add(g.id); drawGroup(ctx, doc, g, env); } continue; }
        ctx.save();
        ctx.translate(el.x, el.y);
        ctx.rotate((el.rotation || 0) * Math.PI / 180);
        ctx.globalAlpha = el.opacity ?? 1;
        if (el.blend && el.blend !== 'normal') ctx.globalCompositeOperation = el.blend;
        drawElement(ctx, el, env);
        ctx.restore();
      }
      const bgd = doc.background || {};
      if (bgd.crumple && bgd.relief && !R.isClearBg(doc)) drawCrumple(ctx, doc.width, doc.height, bgd.crumple, bgd.crumpleSeed || 1, boilJit(doc, opts.time ?? null, 2));
    }
    ctx.restore();
    if (panel) return c;
    // motion blur: smear the frame along the camera's own movement during a short shutter
    const blur = cam && doc.camera && doc.camera.blur > 0 ? doc.camera.blur : 0;
    if (blur) {
      const sh = blur * 0.045;
      const prev = camAt(doc, Math.max(0, t - sh));
      if (prev && prev.seg === cam.seg) {
        const M = camMatrix(doc, cam), Mi = M.inverse();
        const S0 = new DOMMatrix().scale(sx, sy), S0i = S0.inverse();
        const rel = k => { const ck = camAt(doc, Math.max(0, t - sh * k)); return S0.multiply(camMatrix(doc, ck)).multiply(Mi).multiply(S0i); };
        const R1 = rel(1);
        const pts = [[0, 0], [c.width, 0], [0, c.height], [c.width, c.height], [c.width / 2, c.height / 2]];
        const disp = Math.max(...pts.map(([x, y]) => { const q = R1.transformPoint(new DOMPoint(x, y)); return Math.hypot(q.x - x, q.y - y); }));
        if (disp > 1.5) {
          const N = clamp(Math.ceil(disp / 2.5), 2, 64);
          // a long smear hides fine detail, so big moves are accumulated at half size (4× fewer pixels per sample)
          const hs = disp > 40 ? 0.5 : 1, bw = Math.round(c.width * hs), bh = Math.round(c.height * hs);
          if (!blurBuf || blurBuf.width !== bw || blurBuf.height !== bh) blurBuf = canvas(bw, bh);
          const bx = blurBuf.getContext('2d'), HS = new DOMMatrix().scale(hs, hs);
          bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalAlpha = 1; bx.clearRect(0, 0, bw, bh);
          bx.drawImage(c, 0, 0, bw, bh);
          for (let i = 1; i <= N; i++) {
            bx.setTransform(HS.multiply(rel(i / N))); bx.globalAlpha = 1 / (i + 1);
            bx.drawImage(c, 0, 0);
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
          ctx.drawImage(blurBuf, 0, 0, c.width, c.height);
        }
      }
    }
    if (scr) screenLens(c, ctx, scr, doc.screen.pitch * sx * (cam ? cam.z : 1));
    const hb = R.huntBlurPx(doc, opts.time ?? null, c.width);
    if (hb > 0.4) {
      const o = canvas(c.width, c.height), ox = o.getContext('2d');
      ox.filter = `blur(${hb}px)`; ox.drawImage(c, 0, 0);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      if (opts.transparent || R.isClearBg(doc)) ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(o, 0, 0); ctx.restore();
    }
    if (frameBlurOn(doc)) {
      const out = frameBlur(c, doc.blur);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      if (opts.transparent || R.isClearBg(doc)) ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(out, 0, 0);
      ctx.restore();
    }
    if (styleOn(doc.sfx)) {
      const out = window.StudioStyles.apply(c, doc.sfx, { t: tReal, mask: opts.transparent || R.isClearBg(doc) });
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'copy'; ctx.drawImage(out, 0, 0); ctx.restore();
    }
    const ov = doc.overlay || {};
    if (ov.rgb > 0) {
      const copy = canvas(c.width, c.height); copy.getContext('2d').drawImage(c, 0, 0);
      rgbSplit(ctx, copy, ov.rgb / 100 * c.width * 0.006);
    }
    // on a see-through canvas the finish (grain, vignette, tint…) only lands on the layers, never on the empty parts
    const clear = (opts.transparent || R.isClearBg(doc)) && hasOverlay(doc);
    let keep = null;
    if (clear) { keep = canvas(c.width, c.height); keep.getContext('2d').drawImage(c, 0, 0); }
    ctx.save();
    ctx.scale(sx, sy);
    drawOverlay(ctx, doc, tReal);
    ctx.restore();
    if (keep) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(keep, 0, 0); ctx.restore(); }
    return c;
  };
  function hasOverlay(doc) { const o = doc.overlay || {}; return Object.keys(o).some(k => typeof o[k] === 'number' && o[k] > 0 && !['grainSize', 'tintAmount', 'weave', 'boil', 'grungeSeed'].includes(k)); }

  window.StudioRender = R;
})();
