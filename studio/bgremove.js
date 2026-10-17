/* Collage Studio — on-device background removal.
   Runs BRIA's RMBG-1.4 segmentation model (quantised ONNX, ~44 MB) with
   ONNX Runtime Web in the browser; photos never leave the device. The model is
   downloaded once and kept in IndexedDB. */
(function () {
  'use strict';

  const S = window.Studio, R = window.StudioRender;
  const ORT_VERSION = '1.16.3';
  const ORT_JS = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort.min.js`;
  const WASM_FILE = 'ort-wasm-simd.wasm';
  const WASM_SOURCES = [`https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/${WASM_FILE}`, `vendor/${WASM_FILE}`];
  const MODEL_URL = 'https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model_quantized.onnx';
  const MODEL_KEY = 'rmbg-1.4-quantized';
  // UltraFace RFB-320: a 1.3 MB face detector, used to keep just the head for face slots
  const FACE_URL = 'https://huggingface.co/onnxmodelzoo/version-RFB-320/resolve/main/version-RFB-320.onnx';
  const FACE_KEY = 'ultraface-rfb-320';
  const SIZE = 1024;

  /* ───────── model cache (IndexedDB) ───────── */

  function idb() {
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('collage-studio-models', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('models');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  }
  async function cacheGet(k) {
    const d = await idb();
    return new Promise((res, rej) => { const q = d.transaction('models').objectStore('models').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  }
  async function cachePut(k, v) {
    const d = await idb();
    return new Promise((res, rej) => { const t = d.transaction('models', 'readwrite'); t.objectStore('models').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
  }

  /* ───────── loading ───────── */

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }
  async function fetchBytes(url, onProgress) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} for ${url}`);
    const total = +r.headers.get('content-length') || 0;
    if (!r.body || !r.body.getReader) return new Uint8Array(await r.arrayBuffer());
    const reader = r.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      if (onProgress) onProgress(got, total);
    }
    const out = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
  }
  // A self-hosted copy can ship the model as base64 text parts next to the
  // page (window.STUDIO_MODEL_PARTS = n → models/rmbg.part0.txt …).
  async function fetchParts(n, onProgress) {
    const parts = [];
    for (let i = 0; i < n; i++) {
      const t = await (await fetch(`models/rmbg.part${i}.txt`)).text();
      const bin = atob(t.trim());
      const u = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) u[j] = bin.charCodeAt(j);
      parts.push(u);
      onProgress((i + 1) / n);
    }
    const len = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  async function firstOk(sources, fn) {
    let err;
    for (const s of sources) { try { return await fn(s); } catch (e) { err = e; } }
    throw err;
  }

  let sessionP = null;
  function session(progress) {
    if (sessionP) return sessionP;
    sessionP = (async () => {
      if (!window.ort) await loadScript(ORT_JS);
      const ort = window.ort;
      const wasm = await firstOk(WASM_SOURCES, u => fetchBytes(u));
      const wasmUrl = URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' }));
      ort.env.wasm.wasmPaths = { [WASM_FILE]: wasmUrl };
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;
      ort.env.wasm.proxy = false;
      ort.env.logLevel = 'error';
      let model = null;
      try { model = await cacheGet(MODEL_KEY); } catch (e) { /* storage unavailable */ }
      if (!model) {
        progress('download', 0);
        try {
          model = await fetchBytes(MODEL_URL, (got, total) => progress('download', total ? got / total : 0));
        } catch (e) {
          if (!window.STUDIO_MODEL_PARTS) throw e;
          model = await fetchParts(window.STUDIO_MODEL_PARTS, f => progress('download', f));
        }
        try { await cachePut(MODEL_KEY, model); } catch (e) { /* storage full or blocked */ }
      }
      progress('prepare', 1);
      return ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    })();
    sessionP.catch(() => { sessionP = null; });
    return sessionP;
  }

  let faceP = null;
  function faceSession() {
    if (faceP) return faceP;
    faceP = (async () => {
      let model = null;
      try { model = await cacheGet(FACE_KEY); } catch (e) { /* storage unavailable */ }
      if (!model) {
        try { model = await fetchBytes(FACE_URL); }
        catch (e) {
          if (!window.STUDIO_MODEL_PARTS) throw e;
          const t = (await (await fetch('models/ultraface.txt')).text()).trim(), bin = atob(t);
          model = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) model[i] = bin.charCodeAt(i);
        }
        try { await cachePut(FACE_KEY, model); } catch (e) { /* storage full or blocked */ }
      }
      return window.ort.InferenceSession.create(model, { executionProviders: ['wasm'], logSeverityLevel: 3 });
    })();
    faceP.catch(() => { faceP = null; });
    return faceP;
  }
  // most confident face as { x1, y1, x2, y2 } in image pixels, or null
  async function detectFace(img) {
    const sess = await faceSession();
    const W = 320, H = 240, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, W, H);
    const px = x.getImageData(0, 0, W, H).data, n = W * H, input = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { input[i] = (px[i * 4] - 127) / 128; input[n + i] = (px[i * 4 + 1] - 127) / 128; input[2 * n + i] = (px[i * 4 + 2] - 127) / 128; }
    const out = await sess.run({ [sess.inputNames[0]]: new window.ort.Tensor('float32', input, [1, 3, H, W]) });
    const scores = out.scores ? out.scores.data : out[sess.outputNames[0]].data, boxes = out.boxes ? out.boxes.data : out[sess.outputNames[1]].data;
    let best = -1, bs = 0;
    for (let i = 0; i < scores.length / 2; i++) if (scores[i * 2 + 1] > bs) { bs = scores[i * 2 + 1]; best = i; }
    if (best < 0 || bs < 0.7) return null;
    return { x1: boxes[best * 4] * iw, y1: boxes[best * 4 + 1] * ih, x2: boxes[best * 4 + 2] * iw, y2: boxes[best * 4 + 3] * ih };
  }

  /* ───────── inference ───────── */

  // returns a canvas the size of the source with the background made transparent
  async function cutout(img, progress) {
    const sess = await session(progress);
    progress('detect', 1);
    await new Promise(r => setTimeout(r, 60)); // let the status paint before the busy loop
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const c = document.createElement('canvas');
    c.width = SIZE; c.height = SIZE;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, SIZE, SIZE);
    const px = x.getImageData(0, 0, SIZE, SIZE).data;
    const n = SIZE * SIZE, input = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      input[i] = px[i * 4] / 255 - 0.5;
      input[n + i] = px[i * 4 + 1] / 255 - 0.5;
      input[2 * n + i] = px[i * 4 + 2] / 255 - 0.5;
    }
    const ort = window.ort;
    const out = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) });
    const m = out[sess.outputNames[0]].data;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) { if (m[i] < lo) lo = m[i]; if (m[i] > hi) hi = m[i]; }
    const span = hi - lo || 1;
    const mask = x.createImageData(SIZE, SIZE);
    for (let i = 0; i < n; i++) {
      const v = (m[i] - lo) / span;
      mask.data[i * 4 + 3] = Math.round(v * 255);
    }
    x.putImageData(mask, 0, 0);
    // scale the mask to full resolution and use it as the photo's alpha
    const outC = document.createElement('canvas');
    outC.width = iw; outC.height = ih;
    const o = outC.getContext('2d', { willReadFrequently: true });
    o.drawImage(img, 0, 0, iw, ih);
    o.globalCompositeOperation = 'destination-in';
    o.imageSmoothingQuality = 'high';
    o.drawImage(c, 0, 0, iw, ih);
    return outC;
  }

  // bounding box of the opaque pixels, or null if nothing survived
  function opaqueBounds(canvas) {
    const w = canvas.width, h = canvas.height;
    const d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let xx = 0; xx < w; xx++) {
        if (d[(y * w + xx) * 4 + 3] > 12) {
          if (xx < x0) x0 = xx; if (xx > x1) x1 = xx;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;
    const pad = 2;
    return { x: Math.max(0, x0 - pad), y: Math.max(0, y0 - pad), w: Math.min(w, x1 + pad + 1) - Math.max(0, x0 - pad), h: Math.min(h, y1 + pad + 1) - Math.max(0, y0 - pad) };
  }

  /* ───────── placement ───────── */

  // where image pixel (u, v) lands inside a box drawn with cover-fit (see render drawCover)
  function coverMap(iw, ih, rect, crop) {
    crop = crop || {};
    const sc = Math.max(rect.w / iw, rect.h / ih) * (crop.zoom || 1);
    const dx = rect.x + (rect.w - iw * sc) * (crop.x ?? 0.5), dy = rect.y + (rect.h - ih * sc) * (crop.y ?? 0.5);
    return { sc, dx, dy };
  }
  function rot(dx, dy, deg) {
    const a = (deg || 0) * Math.PI / 180;
    return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
  }
  // the trimmed cut-out as a new image element sitting exactly where the subject was
  function placeCutout(src, b, frame) {
    const { iw, ih, rect, crop, flipX, flipY, x, y, rotation } = frame;
    const { sc, dx, dy } = coverMap(iw, ih, rect, crop);
    // only keep what was visible through the frame
    const vu0 = Math.max(b.x, (rect.x - dx) / sc), vu1 = Math.min(b.x + b.w, (rect.x + rect.w - dx) / sc);
    const vv0 = Math.max(b.y, (rect.y - dy) / sc), vv1 = Math.min(b.y + b.h, (rect.y + rect.h - dy) / sc);
    if (vu1 <= vu0 || vv1 <= vv0) return null;
    const cw = Math.round(vu1 - vu0), ch = Math.round(vv1 - vv0);
    const c = document.createElement('canvas');
    c.width = Math.max(1, cw); c.height = Math.max(1, ch);
    c.getContext('2d').drawImage(src, Math.round(vu0), Math.round(vv0), cw, ch, 0, 0, cw, ch);
    let lx = dx + vu0 * sc, ly = dy + vv0 * sc;
    const w = cw * sc, h = ch * sc;
    if (flipX) lx = rect.x + rect.w - (lx - rect.x) - w;
    if (flipY) ly = rect.y + rect.h - (ly - rect.y) - h;
    const [ox, oy] = rot(lx, ly, rotation);
    return { canvas: c, x: x + ox, y: y + oy, width: w, height: h, rotation: rotation || 0 };
  }

  // Portrait cut-outs include shoulders; for a face slot keep the head and neck.
  // Walking down the mask, the outline stays head-width until the shoulders
  // flare out — cut just above that flare.
  function headBounds(canvas, b) {
    const w = canvas.width, d = canvas.getContext('2d').getImageData(b.x, b.y, b.w, b.h).data;
    const widths = [];
    let minX = b.w, maxX = -1, lastY = 0;
    for (let y = 0; y < b.h; y++) {
      let x0 = -1, x1 = -1;
      for (let x = 0; x < b.w; x++) if (d[(y * b.w + x) * 4 + 3] > 100) { if (x0 < 0) x0 = x; x1 = x; }
      widths.push(x0 < 0 ? 0 : x1 - x0);
      if (x0 >= 0) { minX = Math.min(minX, x0); maxX = Math.max(maxX, x1); lastY = y; }
    }
    const solidW = Math.max(1, maxX - minX);
    let top = 0;
    while (top < b.h && !widths[top]) top++;
    // a full-length figure: the head is roughly the top sixth
    if (lastY - top > solidW * 1.8) return { x: b.x, y: b.y, w: b.w, h: Math.round(top + (lastY - top) * 0.17) };
    // a portrait: the outline stays head-width until the shoulders flare out
    const headZone = Math.max(4, Math.round(b.h * 0.35));
    let head = 0;
    for (let y = 0; y < headZone; y++) head = Math.max(head, widths[y]);
    let cut = b.h;
    for (let y = Math.round(b.h * 0.3); y < b.h; y++) {
      if (widths[y] > head * 1.35) { cut = y; break; }
    }
    // never shorter than a head-ish proportion
    cut = Math.max(cut, Math.round(Math.min(b.h, head * 1.15)));
    void w;
    return { x: b.x, y: b.y, w: b.w, h: Math.min(b.h, cut + Math.round(b.h * 0.02)) };
  }
  // hair, face and a little neck around a detected face
  function faceBounds(f, b) {
    const fw = f.x2 - f.x1, fh = f.y2 - f.y1;
    const x0 = Math.max(b.x, Math.round(f.x1 - fw * 0.8)), x1 = Math.min(b.x + b.w, Math.round(f.x2 + fw * 0.8));
    const y0 = Math.max(b.y, Math.round(f.y1 - fh * 0.9)), y1 = Math.min(b.y + b.h, Math.round(f.y2 + fh * 0.3));
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
  }
  function fadeBottom(canvas, b) {
    const x = canvas.getContext('2d'), f = Math.max(4, b.h * 0.08);
    const g = x.createLinearGradient(0, b.y + b.h - f, 0, b.y + b.h);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    x.save(); x.globalCompositeOperation = 'destination-out'; x.fillStyle = g;
    x.fillRect(b.x, b.y + b.h - f, b.w, f); x.restore();
  }

  /* ───────── public actions ───────── */

  // colour adjustments carry over to the cut-out; frame-wide vignette and grain don't
  function lookOnly(f) { const o = S.clone(f || {}); delete o.vignette; delete o.grain; return o; }

  // a photo that was just added may still be decoding
  async function loadedImage(id) {
    for (let i = 0; i < 100; i++) {
      const img = R.assetImage(id);
      if (img) return img;
      await new Promise(r => setTimeout(r, 50));
    }
    return null;
  }

  let busy = false;
  function reporter() {
    let firstDownload = true;
    return (stage, f) => {
      if (stage === 'download') {
        const pct = Math.round(f * 100);
        S.hint(`Downloading the background-removal model… ${pct}%${firstDownload ? ' · first time only (44 MB)' : ''}`);
      } else if (stage === 'prepare') S.hint('Preparing the model…');
      else if (stage === 'detect') S.hint('Finding the subject…');
      S.emit('bgremove', stage, f);
    };
  }
  async function guard(fn) {
    if (busy) { S.emit('toast', 'Background removal is already running'); return; }
    busy = true;
    S.emit('bgremove', 'start');
    try { return await fn(); }
    catch (e) {
      console.error(e);
      S.emit('toast', /fetch|load|network|Failed/i.test(String(e && e.message))
        ? 'Couldn’t download the background-removal model. Check your connection and try again.'
        : 'Background removal failed on this photo.');
    } finally {
      busy = false;
      S.hint('');
      S.emit('bgremove', 'end');
    }
  }
  S.isRemovingBackground = () => busy;
  S.isBackgroundRemovalCached = async () => { try { return !!(await cacheGet(MODEL_KEY)); } catch (e) { return false; } };

  // mode 'replace': the photo becomes the cut-out (restorable).
  // mode 'layer': keep the photo and add the cut-out as a new layer on top.
  S.removeBackground = function (id, mode = 'replace') {
    return guard(async () => {
      const el = S.elById(id);
      if (!el || el.type !== 'image' || !el.assetId) return;
      const img = await loadedImage(el.assetId);
      if (!img) throw new Error('image not loaded');
      const cut = await cutout(img, reporter());
      let b = opaqueBounds(cut);
      if (!b) { S.emit('toast', 'No clear subject found in this photo'); return; }
      if (mode === 'face') {
        let face = null;
        try { face = await detectFace(img); } catch (e) { console.warn('face detection unavailable', e); }
        b = face ? faceBounds(face, b) : headBounds(cut, b);
        fadeBottom(cut, b);
      }
      const g = R.frameGeometry(el);
      const placed = placeCutout(cut, b, { iw: cut.width, ih: cut.height, rect: g.rect, crop: el.crop, flipX: el.flipX, flipY: el.flipY, x: el.x, y: el.y, rotation: el.rotation });
      if (placed && mode === 'face') {
        // sit the head on the neck: same height as the slot, chin at the slot's bottom centre
        const k = el.height / placed.height, w = placed.width * k;
        const [bx, by] = rot(el.width / 2, el.height, el.rotation || 0);
        const [ox, oy] = rot(-w / 2, -el.height, el.rotation || 0);
        Object.assign(placed, { width: w, height: el.height, x: el.x + bx + ox, y: el.y + by + oy, rotation: el.rotation || 0 });
      }
      if (!placed) { S.emit('toast', 'The subject is outside the visible part of the photo'); return; }
      const assetId = S.addAsset(placed.canvas.toDataURL('image/png'));
      await new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = S.assets[assetId]; R.assetImage(assetId); });
      if (mode === 'face') mode = 'replace';
      if (mode === 'layer') {
        const idx = S.doc.elements.indexOf(el);
        const nel = S.mk('image', { assetId, x: placed.x, y: placed.y, width: placed.width, height: placed.height, rotation: placed.rotation, filters: lookOnly(el.filters), flipX: !!el.flipX, flipY: !!el.flipY, name: 'Cut-out' });
        S.addElement(nel, { index: idx + 1, center: false });
        S.emit('toast', 'Cut-out added above the photo — move text between them for a layered look');
      } else {
        S.changeEl(el, e => {
          e.bgRemoved = { assetId: e.assetId, x: e.x, y: e.y, width: e.width, height: e.height, rotation: e.rotation, crop: S.clone(e.crop || {}), frame: S.clone(e.frame || {}) };
          e.assetId = assetId;
          e.x = placed.x; e.y = placed.y; e.width = placed.width; e.height = placed.height;
          e.crop = { zoom: 1, x: 0.5, y: 0.5 };
          e.frame = Object.assign({}, e.frame, { style: 'none', radius: 0 });
        });
        S.attachTransformer();
        S.emit('doc');
        S.emit('toast', 'Background removed');
      }
    });
  };

  // a full-size cut-out of a photo (same size as the original, so it sits exactly over it): Vox parallax layers.
  // Resolves to the new asset id, or undefined if nothing was found.
  S.cutoutAsset = function (assetId) {
    return guard(async () => {
      const img = await loadedImage(assetId);
      if (!img) throw new Error('image not loaded');
      const cut = await cutout(img, reporter());
      if (!opaqueBounds(cut)) { S.emit('toast', 'No clear subject found in this photo'); return; }
      const id = S.addAsset(cut.toDataURL('image/png'));
      await new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = S.assets[id]; R.assetImage(id); });
      return id;
    });
  };
  // studio look: cut the person out once and keep it beside the original photo
  S.studioCutout = function (id) {
    return guard(async () => {
      const el = S.elById(id);
      if (!el || el.type !== 'image' || !el.assetId || !el.studio) return;
      if (el.studio.cutId && el.studio.src === el.assetId && S.assets[el.studio.cutId]) return;
      const img = await loadedImage(el.assetId);
      if (!img) throw new Error('image not loaded');
      const src = el.assetId;
      const cut = await cutout(img, reporter());
      if (!opaqueBounds(cut)) { S.emit('toast', 'No clear subject found in this photo'); return; }
      const cutId = S.addAsset(cut.toDataURL('image/png'));
      await new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = S.assets[cutId]; R.assetImage(cutId); });
      const cur = S.elById(id);
      if (!cur || cur.assetId !== src) return;
      S.changeEl(cur, e => { e.studio = Object.assign({}, e.studio, { cutId, src }); });
      S.emit('doc');
      S.emit('toast', 'Studio look ready — try the presets and light settings');
    });
  };

  S.restoreBackground = function (id) {
    const el = S.elById(id);
    if (!el || !el.bgRemoved) return;
    S.changeEl(el, e => {
      const o = e.bgRemoved;
      Object.assign(e, { assetId: o.assetId, x: o.x, y: o.y, width: o.width, height: o.height, rotation: o.rotation, crop: o.crop, frame: o.frame });
      delete e.bgRemoved;
    });
    S.attachTransformer();
    S.emit('doc');
  };

  // pull the subject out of the canvas background photo into its own layer
  S.cutoutBackgroundSubject = function () {
    return guard(async () => {
      const d = S.doc, bg = d.background;
      if (!bg.assetId) return;
      const img = await loadedImage(bg.assetId);
      if (!img) throw new Error('image not loaded');
      const cut = await cutout(img, reporter());
      const b = opaqueBounds(cut);
      if (!b) { S.emit('toast', 'No clear subject found in this photo'); return; }
      const placed = placeCutout(cut, b, { iw: cut.width, ih: cut.height, rect: { x: 0, y: 0, w: d.width, h: d.height }, crop: bg.crop, flipX: bg.flipX, flipY: false, x: 0, y: 0, rotation: 0 });
      if (!placed) return;
      const assetId = S.addAsset(placed.canvas.toDataURL('image/png'));
      await new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = S.assets[assetId]; R.assetImage(assetId); });
      const nel = S.mk('image', { assetId, x: placed.x, y: placed.y, width: placed.width, height: placed.height, filters: lookOnly(bg.filters), opacity: bg.imageOpacity ?? 1, name: 'Subject cut-out' });
      S.addElement(nel, { center: false });
      S.emit('toast', 'Subject added as a layer on top — send text behind it with ⌘[');
    });
  };
})();
