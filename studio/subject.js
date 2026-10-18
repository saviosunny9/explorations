/* Savio's editor — subject masks.
   Finds the subject of a photo or video layer — every person (MediaPipe selfie multiclass), and / or anything the user
   clicks (MediaPipe magic touch, prompted again on every frame from deep inside the last frame's mask) — follows it
   through the clip and keeps the result on the layer as a mask track:
     el.subj = { people, pts: [[u, v], …], sheets: [assetId, …], fps, n, per, cols, cw, ch, t0 }
   Masks are white with alpha = subject, packed into PNG sprite sheets saved like any other asset; R.subjectMask
   (render.js) picks (and blends) the right frame for a moment and styles get it as o.subject (Flash Light, or any
   style limited to the subject / background). Masks are refined against the frame (guided filter) and steadied over
   time (median of three frames). */
(function () {
  'use strict';
  const S = window.Studio, R = window.StudioRender;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const VER = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const MP = 'https://storage.googleapis.com/mediapipe-models/';
  const MODELS = {
    people: MP + 'image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
    pick: MP + 'interactive_segmenter/magic_touch/float32/1/magic_touch.tflite',
    pose: MP + 'pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
  };
  const AN = 512;      // analysis size (long side) fed to the models
  const SHEET = 4096;  // sprite sheet size limit

  /* ── models (loaded on first use) ──
     From jsDelivr / Google storage; the online copy (window.STUDIO_MODEL_PARTS) falls back to copies published next to
     the page: vendor/vision_bundle.mjs + vision_wasm_internal.{js,wasm}, models/subject-<kind>.part<i>.txt (base64). */
  const PARTS = { people: 2, pick: 1, pose: 1 };
  let vision = null;
  const segs = {};
  async function runtime() {
    const local = { wasmLoaderPath: new URL('vendor/vision_wasm_internal.js', location.href).href, wasmBinaryPath: new URL('vendor/vision_wasm_internal.wasm', location.href).href };
    let v;
    try { v = await import(VER + '/vision_bundle.mjs'); }
    catch (e) { if (!window.STUDIO_MODEL_PARTS) throw e; v = await import(new URL('vendor/vision_bundle.mjs', location.href).href); return { v, files: local, local }; }
    return { v, files: await v.FilesetResolver.forVisionTasks(VER + '/wasm'), local };
  }
  async function modelBytes(kind) {
    // (a stalled download gives up rather than holding everything up)
    try { const r = await fetch(MODELS[kind], AbortSignal.timeout ? { signal: AbortSignal.timeout(60000) } : {}); if (!r.ok) throw new Error('HTTP ' + r.status); return new Uint8Array(await r.arrayBuffer()); }
    catch (e) {
      if (!window.STUDIO_MODEL_PARTS) throw new Error('Couldn’t download the subject finder — check the connection');
      let t = '';
      for (let i = 0; i < PARTS[kind]; i++) t += (await (await fetch(`models/subject-${kind}.part${i}.txt`)).text()).trim();
      const bin = atob(t), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return u;
    }
  }
  function model(kind) {
    if (segs[kind]) return segs[kind];
    segs[kind] = (async () => {
      if (!vision) vision = runtime().catch(e => { vision = null; throw e; });
      const rt = await vision, { v } = rt, bytes = await modelBytes(kind);
      const Cls = kind === 'people' ? v.ImageSegmenter : v.InteractiveSegmenter;
      const opts = delegate => Object.assign({ baseOptions: { modelAssetBuffer: bytes, delegate }, outputConfidenceMasks: true, outputCategoryMask: false }, kind === 'people' ? { runningMode: 'IMAGE' } : {});
      // the wasm runtime from the CDN, or (online copy) the one published with the page
      let files = rt.files;
      const make = async delegate => {
        try { return await Cls.createFromOptions(files, opts(delegate)); }
        catch (e) { if (!window.STUDIO_MODEL_PARTS || files === rt.local) throw e; files = rt.local; return Cls.createFromOptions(files, opts(delegate)); }
      };
      // the GPU is many times faster on a real graphics card, but slower than the CPU on software WebGL: time it on a
      // test frame and keep whichever is quicker
      const test = document.createElement('canvas'); test.width = 256; test.height = 256;
      const tx = test.getContext('2d'); tx.fillStyle = '#888'; tx.fillRect(0, 0, 256, 256); tx.fillStyle = '#c96'; tx.fillRect(80, 40, 96, 180);
      const run = seg => { const r = kind === 'people' ? seg.segment(test) : seg.segment(test, { keypoint: { x: 0.5, y: 0.5 } }); r.confidenceMasks[0].getAsFloat32Array(); r.close(); };
      try {
        const gpu = await make('GPU');
        run(gpu);
        const t0 = performance.now(); run(gpu); run(gpu);
        if ((performance.now() - t0) / 2 < 90) return gpu;
        gpu.close();
      } catch (e) { /* no WebGL 2: use the CPU */ }
      return make('CPU');
    })();
    segs[kind].catch(() => { delete segs[kind]; });
    return segs[kind];
  }
  S.subjectModelsReady = () => !!(segs.people || segs.pick);

  /* ── the pose model (whole bodies, legs and feet included) runs in a worker: on a few pictures it never returns, and a
     stuck worker can be stopped and started again — the main page would just freeze ── */
  const POSE_SRC = `let lm = null;
onmessage = async e => {
  const d = e.data;
  try {
    if (d.type === 'init') {
      const v = await import(d.bundle), files = d.files || await v.FilesetResolver.forVisionTasks(d.wasm);
      const make = delegate => v.PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetBuffer: new Uint8Array(d.bytes), delegate }, runningMode: 'IMAGE', numPoses: 4, outputSegmentationMasks: true, minPoseDetectionConfidence: 0.4, minPosePresenceConfidence: 0.4 });
      const test = new OffscreenCanvas(256, 256), tx = test.getContext('2d'); tx.fillStyle = '#888'; tx.fillRect(0, 0, 256, 256);
      const run = m => { const r = m.detect(test); for (const k of r.segmentationMasks || []) k.close(); };
      // the graphics path whenever there is one, even a slow one: the processor path aborts on some pictures (a MediaPipe
      // bug in its mask conversion — 'Check failed: 1 == ChannelSize()')
      try { const g = await make('GPU'); run(g); lm = g; } catch (err) { /* no WebGL here */ }
      if (!lm) lm = await make('CPU');
      postMessage({ type: 'ready' });
    } else {
      const r = lm.detect(d.img), out = [], tr = [];
      for (const k of r.segmentationMasks || []) { const a = k.getAsFloat32Array().slice(); out.push({ a, w: k.width, h: k.height }); tr.push(a.buffer); k.close(); }
      if (d.img.close) d.img.close();
      postMessage({ type: 'res', id: d.id, masks: out }, tr);
    }
  } catch (err) { postMessage({ type: 'err', id: d.id, msg: String((err && err.message) || err) }); }
};`;
  const pose = { w: null, ready: null, bytes: null, fails: 0, cropFails: 0, off: false, noCrops: false, n: 0, waits: new Map() };
  function poseStop() { if (pose.w) pose.w.terminate(); pose.w = null; pose.ready = null; for (const f of pose.waits.values()) f(null); pose.waits.clear(); }
  function poseStart() {
    if (pose.off) return null;
    if (pose.ready) return pose.ready;
    pose.ready = (async () => {
      if (!vision) vision = runtime().catch(e => { vision = null; throw e; });
      // the model is downloaded once; a restarted worker gets the same bytes
      if (!pose.bytes) pose.bytes = modelBytes('pose').catch(e => { pose.bytes = null; throw e; });
      const rt = await vision, bytes = await pose.bytes;
      let w;
      // a classic worker (a module worker can't start from a file:// page); import() still works inside it
      try { w = new Worker(URL.createObjectURL(new Blob([POSE_SRC], { type: 'text/javascript' }))); }
      catch (e) { pose.off = true; return false; }
      pose.w = w;
      w.onmessage = e => { const f = pose.waits.get(e.data.id ?? 'init'); if (f) { pose.waits.delete(e.data.id ?? 'init'); f(e.data); } };
      w.onerror = () => { pose.fails++; poseStop(); };
      const abs = u => new URL(u, location.href).href;
      const msg = rt.files === rt.local || (rt.local && rt.files && rt.files.wasmLoaderPath === rt.local.wasmLoaderPath)
        ? { bundle: abs('vendor/vision_bundle.mjs'), files: rt.local } : { bundle: VER + '/vision_bundle.mjs', wasm: VER + '/wasm' };
      const ok = await new Promise(res => {
        pose.waits.set('init', d => res(d && d.type === 'ready'));
        w.postMessage(Object.assign({ type: 'init', bytes: bytes.slice().buffer }, msg));
        setTimeout(() => { if (pose.waits.has('init')) { pose.waits.delete('init'); res(false); } }, 45000);
      });
      if (!ok) { poseStop(); pose.off = true; return false; }
      return true;
    })();
    return pose.ready;
  }
  // all the pose masks for a picture, as one { a, w, h } (null: no pose model, or it got stuck — then it's restarted).
  // crop: a close-up of one person — the pictures it chokes on are nearly always these, so those stop being asked first
  async function poseRaw(c, crop) {
    if (pose.off || (crop && pose.noCrops)) return null;
    let up;
    try { up = await poseStart(); } catch (e) { pose.off = true; return null; }
    if (!up || !pose.w) return null;
    const id = ++pose.n, img = await createImageBitmap(c);
    const d = await new Promise(res => {
      pose.waits.set(id, res);
      pose.w.postMessage({ type: 'detect', id, img }, [img]);
      setTimeout(() => { if (pose.waits.has(id)) { pose.waits.delete(id); res('stuck'); } }, 4000);
    });
    if (d === 'stuck' || !d || d.type === 'err') {
      // a picture it chokes on (stuck, or the runtime aborted): this picture goes without, the worker starts again —
      // and if it keeps happening, close-ups stop being asked, then the whole model
      poseStop();
      if (crop) { if (++pose.cropFails >= 6) pose.noCrops = true; } else if (++pose.fails >= 6) pose.off = true;
      return null;
    }
    if (!d.masks.length) return { a: new Float32Array(4), w: 2, h: 2, none: true };
    const o = d.masks[0];
    for (const m of d.masks.slice(1)) if (m.w === o.w && m.h === o.h) for (let i = 0; i < o.a.length; i++) if (m.a[i] > o.a[i]) o.a[i] = m.a[i];
    return o;
  }
  S.subjectPoseState = () => ({ off: pose.off, noCrops: pose.noCrops, fails: pose.fails, cropFails: pose.cropFails, calls: pose.n });

  /* ── one frame ── */
  function frameCanvas(src, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d', { willReadFrequently: true }).drawImage(src, 0, 0, w, h);
    return c;
  }
  // a confidence mask (any size) resampled to w × h
  function resample(m, mw, mh, w, h) {
    if (mw === w && mh === h) return m;
    const o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const sy = clamp((y + 0.5) * mh / h - 0.5, 0, mh - 1.001), iy = sy | 0, fy = sy - iy;
      for (let x = 0; x < w; x++) {
        const sx = clamp((x + 0.5) * mw / w - 0.5, 0, mw - 1.001), ix = sx | 0, fx = sx - ix, a = iy * mw + ix;
        o[y * w + x] = (m[a] * (1 - fx) + m[a + 1] * fx) * (1 - fy) + (m[a + mw] * (1 - fx) + m[a + mw + 1] * fx) * fy;
      }
    }
    return o;
  }
  async function peopleMask(c) {
    const seg = await model('people'), out = seg.segment(c), cm = out.confidenceMasks, w = cm[0].width, h = cm[0].height;
    const bg = cm[0].getAsFloat32Array(), m = new Float32Array(w * h);
    for (let i = 0; i < m.length; i++) m[i] = 1 - bg[i];
    out.close();
    return resample(m, w, h, c.width, c.height);
  }
  // the selfie model's people (1 − background) at its own size
  async function peopleRaw(c) {
    const seg = await model('people'), out = seg.segment(c), cm = out.confidenceMasks, w = cm[0].width, h = cm[0].height;
    const bg = cm[0].getAsFloat32Array(), a = new Float32Array(w * h);
    for (let i = 0; i < a.length; i++) a[i] = 1 - bg[i];
    out.close();
    return { a, w, h };
  }
  /* ── people, done properly: where they are (the pose model every frame, the selfie model every few frames, and last
     frame's people), then both models again on a close crop around each of them — a small person far away gets the
     whole of the models' attention, and between them they keep legs, feet, hair and loose clothes ── */
  function blobsOf(m, w, h, thr = 0.5) {
    const seen = new Uint8Array(w * h), out = [], minN = Math.max(24, w * h * 0.0003);
    for (let i = 0; i < w * h; i++) {
      if (seen[i] || m[i] < thr) continue;
      let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0; const st = [i]; seen[i] = 1;
      while (st.length) {
        const q = st.pop(), x = q % w, y = (q / w) | 0; n++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && !seen[q - 1] && m[q - 1] >= thr) { seen[q - 1] = 1; st.push(q - 1); }
        if (x < w - 1 && !seen[q + 1] && m[q + 1] >= thr) { seen[q + 1] = 1; st.push(q + 1); }
        if (y > 0 && !seen[q - w] && m[q - w] >= thr) { seen[q - w] = 1; st.push(q - w); }
        if (y < h - 1 && !seen[q + w] && m[q + w] >= thr) { seen[q + w] = 1; st.push(q + w); }
      }
      if (n >= minN) out.push([x0, y0, x1, y1, n]);
    }
    return out;
  }
  // a roomy square crop around each blob; crops that touch become one
  function cropsOf(boxes, w, h) {
    let out = boxes.map(b => { const bw = b[2] - b[0] + 1, bh = b[3] - b[1] + 1, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, sz = Math.max(bw, bh) * 1.35 + 8; return [Math.max(0, cx - sz / 2), Math.max(0, cy - sz / 2), Math.min(w, cx + sz / 2), Math.min(h, cy + sz / 2)]; });
    for (let again = true; again;) {
      again = false;
      for (let i = 0; i < out.length && !again; i++) for (let j = i + 1; j < out.length && !again; j++) {
        const a = out[i], b = out[j];
        if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) { out[i] = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; out.splice(j, 1); again = true; }
      }
    }
    return out.filter(b => b[2] - b[0] >= 8 && b[3] - b[1] >= 8).sort((a, b) => (b[2] - b[0]) * (b[3] - b[1]) - (a[2] - a[0]) * (a[3] - a[1])).slice(0, 6);
  }
  const sampleAt = (r, u, v) => r.a[Math.min(r.h - 1, (v * r.h) | 0) * r.w + Math.min(r.w - 1, (u * r.w) | 0)];
  async function peopleFine(src, c, prev, wide) {
    const w = c.width, h = c.height, size = R.mediaSize(src) || { w, h }, k = size.w / w;
    const pf = await poseRaw(c);
    let seed = pf && !pf.none ? resample(pf.a, pf.w, pf.h, w, h) : null;
    if (wide || !seed) { const mc = await peopleMask(c); if (!seed) seed = mc; else for (let i = 0; i < seed.length; i++) if (mc[i] > seed[i]) seed[i] = mc[i]; }
    const crops = cropsOf(blobsOf(seed, w, h).concat(prev || []), w, h), o = seed.slice();
    for (const b of crops) for (let y = Math.floor(b[1]); y < Math.ceil(b[3]); y++) for (let x = Math.floor(b[0]); x < Math.ceil(b[2]); x++) o[y * w + x] = 0;
    for (const b of crops) {
      const bw = b[2] - b[0], bh = b[3] - b[1], L = 384, s = L / Math.max(bw, bh);
      const cc = document.createElement('canvas'); cc.width = Math.max(8, Math.round(bw * s)); cc.height = Math.max(8, Math.round(bh * s));
      cc.getContext('2d').drawImage(src, b[0] * k, b[1] * k, bw * k, bh * k, 0, 0, cc.width, cc.height);
      const a = await peopleRaw(cc), p = await poseRaw(cc, true);
      for (let y = Math.floor(b[1]); y < Math.ceil(b[3]); y++) for (let x = Math.floor(b[0]); x < Math.ceil(b[2]); x++) {
        const u = (x + 0.5 - b[0]) / bw, v = (y + 0.5 - b[1]) / bh;
        if (u < 0 || v < 0 || u >= 1 || v >= 1) continue;
        let val = sampleAt(a, u, v); if (p && !p.none) val = Math.max(val, sampleAt(p, u, v));
        const i = y * w + x; if (val > o[i]) o[i] = val;
      }
    }
    return o;
  }
  async function pickMask(c, u, v) {
    const seg = await model('pick'), out = seg.segment(c, { keypoint: { x: clamp(u, 0.001, 0.999), y: clamp(v, 0.001, 0.999) } });
    const mk = out.confidenceMasks[0], w = mk.width, h = mk.height, m = mk.getAsFloat32Array().slice();
    out.close();
    return resample(m, w, h, c.width, c.height);
  }

  /* ── following a clicked object: the next prompt sits deep inside the last mask, near the last prompt ── */
  const GS = 96; // grid for the prompt search
  function grid(m, w, h) {
    const gw = w >= h ? GS : Math.max(8, Math.round(GS * w / h)), gh = w >= h ? Math.max(8, Math.round(GS * h / w)) : GS, g = new Uint8Array(gw * gh);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) g[y * gw + x] = m[Math.min(h - 1, ((y + 0.5) * h / gh) | 0) * w + Math.min(w - 1, ((x + 0.5) * w / gw) | 0)] > 0.5 ? 1 : 0;
    return { g, gw, gh };
  }
  // chamfer distance to the outside of the mask
  function dist(G) {
    const { g, gw, gh } = G, d = new Float32Array(gw * gh), BIG = 1e6;
    for (let i = 0; i < d.length; i++) d[i] = g[i] ? BIG : 0;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const i = y * gw + x; if (!d[i]) continue;
      const a = x ? d[i - 1] + 1 : 1, b = y ? d[i - gw] + 1 : 1, c = x && y ? d[i - gw - 1] + 1.414 : 1.414, e = y && x < gw - 1 ? d[i - gw + 1] + 1.414 : 1.414;
      d[i] = Math.min(d[i], a, b, c, e);
    }
    for (let y = gh - 1; y >= 0; y--) for (let x = gw - 1; x >= 0; x--) {
      const i = y * gw + x; if (!d[i]) continue;
      const a = x < gw - 1 ? d[i + 1] + 1 : 1, b = y < gh - 1 ? d[i + gw] + 1 : 1, c = x < gw - 1 && y < gh - 1 ? d[i + gw + 1] + 1.414 : 1.414, e = y < gh - 1 && x ? d[i + gw - 1] + 1.414 : 1.414;
      d[i] = Math.min(d[i], a, b, c, e);
    }
    return d;
  }
  // a spot followed from one frame to the next: zero-mean SAD of a patch, coarse (step 2, ±24 px) then fine (±2 px)
  function greyOf(c) {
    const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data, g = new Float32Array(c.width * c.height);
    for (let i = 0; i < g.length; i++) g[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
    g.rgba = d;
    return g;
  }
  // what the thing looks like: a 4 × 4 × 4 colour histogram of the pixels inside its mask
  function hist(d, m) {
    const h = new Float32Array(64); let n = 0;
    for (let i = 0; i < m.length; i += 2) { if (m[i] < 0.5) continue; const o = i * 4; h[(d[o] >> 6) * 16 + (d[o + 1] >> 6) * 4 + (d[o + 2] >> 6)]++; n++; }
    if (n) for (let k = 0; k < 64; k++) h[k] /= n;
    return n ? h : null;
  }
  const same = (a, b) => { if (!a || !b) return 0; let s = 0; for (let k = 0; k < 64; k++) s += Math.min(a[k], b[k]); return s; };
  function follow(a, b, w, h, p) {
    const x0 = Math.round(clamp(p[0], 0, 1) * w), y0 = Math.round(clamp(p[1], 0, 1) * h);
    // a smaller patch near the edge of the frame
    const R = Math.min(9, x0 - 1, y0 - 1, w - 2 - x0, h - 2 - y0);
    if (R < 3) return p;
    let ma = 0; for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) ma += a[(y0 + y) * w + x0 + x];
    ma /= (2 * R + 1) ** 2;
    const cost = (cx, cy) => {
      if (cx < R || cy < R || cx >= w - R || cy >= h - R) return 1e12;
      let mb = 0; for (let y = -R; y <= R; y += 2) for (let x = -R; x <= R; x += 2) mb += b[(cy + y) * w + cx + x];
      mb /= (R + 1) ** 2;
      let s = 0; for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) s += Math.abs(a[(y0 + y) * w + x0 + x] - ma - b[(cy + y) * w + cx + x] + mb);
      return s;
    };
    let bx = x0, by = y0, best = cost(x0, y0);
    for (let dy = -24; dy <= 24; dy += 2) for (let dx = -24; dx <= 24; dx += 2) { const s = cost(x0 + dx, y0 + dy) + (Math.abs(dx) + Math.abs(dy)) * 3; if (s < best) { best = s; bx = x0 + dx; by = y0 + dy; } }
    const cx = bx, cy = by;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const s = cost(cx + dx, cy + dy); if (s < best) { best = s; bx = cx + dx; by = cy + dy; } }
    return [(bx + 0.5) / w, (by + 0.5) / h];
  }
  function nextPrompt(G, u, v, pull = 0.35) {
    const d = dist(G), { gw, gh } = G;
    let best = -1, bx = u, by = v, maxD = 0;
    for (const x of d) if (x > maxD) maxD = x;
    if (maxD <= 0) return null;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const D = d[y * gw + x]; if (!D) continue;
      // deep inside (but not necessarily the deepest spot of a big blob) and close to where we were
      const s = Math.min(D, maxD * 0.6) - pull * Math.hypot(x + 0.5 - u * gw, y + 0.5 - v * gh);
      if (s > best) { best = s; bx = (x + 0.5) / gw; by = (y + 0.5) / gh; }
    }
    return [bx, by];
  }
  const shiftGrid = (G, du, dv) => {
    const { g, gw, gh } = G, sx = Math.round(du * gw), sy = Math.round(dv * gh), o = new Uint8Array(g.length);
    for (let y = 0; y < gh; y++) { const yy = y - sy; if (yy < 0 || yy >= gh) continue; for (let x = 0; x < gw; x++) { const xx = x - sx; if (xx >= 0 && xx < gw) o[y * gw + x] = g[yy * gw + xx]; } }
    return { g: o, gw, gh };
  };
  // a mask grown by r grid cells (square), to keep the next frame's mask near where the thing was
  function grow(G, r) {
    const { g, gw, gh } = G, t = new Uint8Array(g.length), o = new Uint8Array(g.length);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let v = 0; for (let k = Math.max(0, x - r); k <= Math.min(gw - 1, x + r) && !v; k++) v = g[y * gw + k]; t[y * gw + x] = v; }
    for (let x = 0; x < gw; x++) for (let y = 0; y < gh; y++) { let v = 0; for (let k = Math.max(0, y - r); k <= Math.min(gh - 1, y + r) && !v; k++) v = t[k * gw + x]; o[y * gw + x] = v; }
    return { g: o, gw, gh };
  }
  const area = G => { let n = 0; for (const x of G.g) n += x; return n; };
  const iou = (A, B) => { let i = 0, u = 0; for (let k = 0; k < A.g.length; k++) { i += A.g[k] & B.g[k]; u += A.g[k] | B.g[k]; } return u ? i / u : 0; };
  function centroid(G) { let sx = 0, sy = 0, n = 0; for (let y = 0; y < G.gh; y++) for (let x = 0; x < G.gw; x++) if (G.g[y * G.gw + x]) { sx += x + 0.5; sy += y + 0.5; n++; } return n ? [sx / n / G.gw, sy / n / G.gh] : null; }

  /* ── edges that follow the picture: a guided filter with the frame's brightness as the guide ── */
  function box(a, w, h, r) {
    const t = new Float32Array(a.length), o = new Float32Array(a.length);
    for (let y = 0; y < h; y++) { let acc = 0; const row = y * w; for (let x = -r; x <= r; x++) acc += a[row + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { t[row + x] = acc; acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; } }
    const n = (2 * r + 1) * (2 * r + 1);
    for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += t[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { o[y * w + x] = acc / n; acc += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
    return o;
  }
  function guided(I, p, w, h, r, eps) {
    const n = w * h, Ip = new Float32Array(n), II = new Float32Array(n);
    for (let i = 0; i < n; i++) { Ip[i] = I[i] * p[i]; II[i] = I[i] * I[i]; }
    const mI = box(I, w, h, r), mp = box(p, w, h, r), mIp = box(Ip, w, h, r), mII = box(II, w, h, r), a = new Float32Array(n), b = new Float32Array(n);
    for (let i = 0; i < n; i++) { const v = mII[i] - mI[i] * mI[i]; a[i] = (mIp[i] - mI[i] * mp[i]) / (v + eps); b[i] = mp[i] - a[i] * mI[i]; }
    const ma = box(a, w, h, r), mb = box(b, w, h, r), q = new Float32Array(n);
    for (let i = 0; i < n; i++) q[i] = ma[i] * I[i] + mb[i];
    return q;
  }
  function refine(m, frame, w, h) {
    const d = frame.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data, I = new Float32Array(w * h);
    for (let i = 0; i < I.length; i++) I[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255;
    const q = guided(I, m, w, h, Math.max(1, Math.round(Math.max(w, h) / 240)), 0.004), o = new Uint8Array(w * h);
    for (let i = 0; i < o.length; i++) { const t = clamp((q[i] - 0.18) / 0.64, 0, 1); o[i] = Math.round(t * t * (3 - 2 * t) * 255); }
    return o;
  }

  /* ── the source of a layer ── */
  async function openVideo(id) {
    const shown = R.assetImage(id);
    if (!shown || !shown.duration) throw new Error('The video isn’t ready yet');
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = shown.currentSrc || shown.src;
    await new Promise((res, rej) => { if (v.readyState >= 2) return res(); v.onloadeddata = res; v.onerror = () => rej(new Error('Could not read the video')); setTimeout(res, 8000); });
    return v;
  }
  const seek = (v, time) => new Promise(res => {
    let done = false;
    const fin = () => { if (done) return; done = true; v.removeEventListener('seeked', fin); res(); };
    v.addEventListener('seeked', fin); setTimeout(fin, 3000);
    v.currentTime = time;
  });
  const sizeOf = (iw, ih, L) => iw >= ih ? [L, Math.max(2, Math.round(L * ih / iw))] : [Math.max(2, Math.round(L * iw / ih)), L];

  const CT = () => window.StudioCamTrack;
  // corners of the picture moved by H (how far the camera went), in px
  const camShift = (H, w, h) => Math.max(...[[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => { const q = CT().apply(H, x, y); return Math.hypot(q[0] - x, q[1] - y); }));
  // px homography → one across the picture (u, v in 0..1)
  const toUv = (H, w, h) => [H[0], H[1] * h / w, H[2] / w, H[3] * w / h, H[4], H[5] / h, H[6] * w, H[7] * h, H[8]].map(x => +x.toPrecision(7));

  /* ── a run: every frame of the clip (or the one photo) ── */
  // what: { people: bool, pts: [[u, v], …], whole (the whole file, not just the trimmed part), cam (follow the camera) }
  // — u, v across the source picture
  async function analyse(el, what, { onProgress = () => {}, signal, at } = {}) {
    if (!el || el.type !== 'image' || !el.assetId) throw new Error('Pick a photo or video layer');
    const people = !!what.people, pts = (what.pts || []).map(p => [p[0], p[1]]);
    if (!people && !pts.length) throw new Error('Nothing to find — turn on People or click what to light up');
    const isVid = R.isVideoAsset(el.assetId);
    const shown = R.assetImage(el.assetId);
    if (!shown) throw new Error('The picture isn’t ready yet');
    const size = R.mediaSize(shown), [aw, ah] = sizeOf(size.w, size.h, AN);
    // the times to look at (source time, seconds)
    let times = [0], fps = 0, t0 = 0, v = null;
    if (isVid) {
      const vd = what.whole ? {} : el.video || {}, dur = shown.duration, end = vd.end > 0 ? Math.min(dur, vd.end) : dur, ts = clamp(vd.trim || 0, 0, Math.max(0, end - 0.05));
      if (at != null) times = [at];
      else {
        const len = Math.max(0.05, end - ts);
        // every frame of the clip (≤ 30 a second), fewer for long clips (≤ 2400 frames)
        fps = clamp(Math.min(await R.clipFps(el.assetId) || 30, 30, 2400 / len), 2, 30);
        const n = Math.max(1, Math.round(len * fps));
        // sampled in the middle of each frame, so a seek can't land on the frame before
        t0 = ts + 0.5 / fps; times = Array.from({ length: n }, (_, i) => Math.min(end - 0.02, t0 + i / fps));
      }
      v = await openVideo(el.assetId);
    }
    // mask size: sharper for short clips, ≤ ~110 MB of masks for long ones
    const n = times.length, L = clamp(Math.floor(Math.sqrt(110e6 / n / (Math.min(aw, ah) / Math.max(aw, ah)))), 160, 512);
    const [mw, mh] = sizeOf(size.w, size.h, L);
    const masks = new Array(n);
    const shiftMask = (m, du, dv) => {
      const sx = Math.round(du * aw), sy = Math.round(dv * ah), o = new Float32Array(m.length);
      for (let y = 0; y < ah; y++) { const yy = y - sy; if (yy < 0 || yy >= ah) continue; for (let x = 0; x < aw; x++) { const xx = x - sx; if (xx >= 0 && xx < aw) o[y * aw + x] = m[yy * aw + xx]; } }
      return o;
    };
    const at01 = (m, u, v) => m[Math.min(ah - 1, Math.max(0, (v * ah) | 0)) * aw + Math.min(aw - 1, Math.max(0, (u * aw) | 0))];
    // picks are clicked on one frame (what.at, in the clip's own time): follow them forwards from there, then backwards
    const i0 = isVid && fps && what.at != null ? clamp(Math.round((what.at - t0) * fps), 0, n - 1) : 0;
    const order = []; for (let i = i0; i < n; i++) order.push(i); for (let i = i0 - 1; i >= 0; i--) order.push(i);
    // the camera is followed frame after frame, so only when the frames come in order
    const camOn = !!what.cam && isVid && n > 2 && i0 === 0 && !!CT(), tracker = camOn ? CT().create(aw, ah) : null, Hs = camOn ? new Array(n) : null;
    const looks = pts.map(() => null), cutPeople = pts.map(() => false); // each thing's colours on the frame it was clicked on
    const fresh = () => ({ keys: pts.map(p => p.slice()), last: pts.map(() => null), lastPm: pts.map(() => null), coast: pts.map(() => 0), prevGrey: null, boxes: null });
    const copy = st => ({ keys: st.keys.map(k => k && k.slice()), last: st.last.slice(), lastPm: st.lastPm.slice(), coast: st.coast.slice(), prevGrey: st.prevGrey, boxes: st.boxes });
    let st = fresh(), snap = null, done = 0, seen = 0;
    const total = n;
    // one clicked thing on one frame → its mask (or null)
    async function pickOne(c, grey, j, cut) {
      const prev = st.last[j], old = st.keys[j];
      // the clicked spot follows the picture itself (patch matching from the last frame), then the model is asked there
      const key = st.prevGrey ? follow(st.prevGrey, grey, aw, ah, old) : old;
      const dx = key[0] - old[0], dy = key[1] - old[1], was = prev && shiftGrid(prev, dx, dy);
      // (a single point: several points at once made the model spread onto whatever touches the thing)
      let pm = await pickMask(c, key[0], key[1]), k = key;
      // nothing far from where it just was: a gate around the last mask (moved with the spot), roomy enough to move and grow
      const gate = was ? grow(was, Math.max(3, Math.round(Math.sqrt(area(was)) * 0.18))) : null;
      const gated = m => { if (cut) for (let k = 0; k < m.length; k++) m[k] *= 1 - cut[k]; if (!gate) return m; const { g, gw, gh } = gate; for (let y = 0; y < ah; y++) { const gy = Math.min(gh - 1, (y * gh / ah) | 0) * gw; for (let x = 0; x < aw; x++) if (!g[gy + Math.min(gw - 1, (x * gw / aw) | 0)]) m[y * aw + x] = 0; } return m; };
      pm = gated(pm);
      let G = grid(pm, aw, ah);
      // a good mask holds the spot, keeps about its size and still looks like what was clicked (so it can't slide onto
      // something touching it — a person sitting on the picked chair)
      const fits = (m, g, q) => at01(m, q[0], q[1]) >= 0.5 && area(g) <= area(was) * 2.2 && area(g) >= area(was) * 0.45 && (!looks[j] || same(looks[j], hist(grey.rgba, m)) >= 0.5);
      if (was && !fits(pm, G, k)) {
        // other spots to ask at: deep inside where it was (moved with the spot), and its middle
        for (const q of [nextPrompt(was, key[0], key[1], 1.5), centroid(was)].filter(Boolean)) {
          const pm2 = gated(await pickMask(c, q[0], q[1])), G2 = grid(pm2, aw, ah);
          if (fits(pm2, G2, q) && !fits(pm, G, k) || iou(G2, was) > iou(G, was) && fits(pm2, G2, q) === fits(pm, G, k)) { pm = pm2; G = G2; k = q; }
        }
        // still nothing like it: it is probably hidden or blurred for a moment — carry the last mask along with the spot
        if (!fits(pm, G, k)) {
          if (st.coast[j]++ > 15) { st.keys[j] = key; return null; }
          const m2 = shiftMask(st.lastPm[j], dx, dy);
          st.lastPm[j] = m2; st.last[j] = was; st.keys[j] = key;
          return m2;
        }
      }
      if (area(G) < 2) { st.keys[j] = key; return null; }
      if (!looks[j]) looks[j] = hist(grey.rgba, pm);
      st.coast[j] = 0; st.last[j] = G; st.lastPm[j] = pm;
      // a spot drifting onto the edge is pulled back inside, staying close to where it was
      st.keys[j] = at01(pm, k[0], k[1]) < 0.75 ? nextPrompt(G, k[0], k[1], 1.5) || k : k;
      return pm;
    }
    const tick = async () => { onProgress(++done / total); if (done % 2 === 0) await new Promise(r => setTimeout(r, 0)); };
    for (const i of order) {
      if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (i === i0 - 1 && snap) st = copy(snap);
      if (v) await seek(v, times[i]);
      const c = frameCanvas(v || shown, aw, ah), grey = pts.length || camOn ? greyOf(c) : null;
      // people (crops around each, pose + selfie models) — and also when something that isn't a person was clicked, so a
      // person touching it (sitting on the picked chair, holding the picked cup) can be cut out of its mask
      const wantPeople = people || (pts.length && (i === i0 || cutPeople.some(Boolean)));
      const pp = wantPeople ? await peopleFine(v || shown, c, st.boxes, seen++ % 6 === 0) : null;
      if (i === i0 && pp && !people) pts.forEach((q, j) => { cutPeople[j] = at01(pp, q[0], q[1]) < 0.3; });
      let m = people ? pp.slice() : null;
      for (let j = 0; j < pts.length; j++) {
        const pm = await pickOne(c, grey, j, cutPeople[j] ? pp : null);
        if (!pm) continue;
        if (!m) m = pm.slice(); else for (let k = 0; k < m.length; k++) if (pm[k] > m[k]) m[k] = pm[k];
      }
      m = m || new Float32Array(aw * ah);
      st.prevGrey = grey;
      st.boxes = people ? blobsOf(m, aw, ah).map(b => b.slice(0, 4)) : null;
      if (camOn) Hs[i] = tracker.step(grey, m);
      if (i === i0) snap = copy(st);
      const small = resample(m, aw, ah, mw, mh), fc = frameCanvas(c, mw, mh);
      masks[i] = refine(small, fc, mw, mh);
      await tick();
    }
    // the camera: still enough to leave alone? (well under a pixel of the source at its largest move)
    let cam = null, still = true;
    if (camOn) {
      const shift = Math.max(...Hs.map(H => camShift(H, aw, ah)));
      still = shift < 0.5 * aw / Math.max(1, size.w) * 2;
      cam = { w: aw, h: ah, moving: !still, shift: +(shift / aw).toFixed(4), H: Hs.map(H => toUv(H, aw, ah)) };
    }
    if (v) { v.removeAttribute('src'); v.load(); }
    // steadier edges: the median of each frame and its neighbours
    const steady = masks.length < 3 ? masks : masks.map((m, i) => {
      if (!i || i === masks.length - 1) return m;
      const a = masks[i - 1], c = masks[i + 1], o = new Uint8Array(m.length);
      for (let k = 0; k < m.length; k++) { const x = a[k], y = m[k], z = c[k]; o[k] = x > y ? (y > z ? y : x > z ? z : x) : (x > z ? x : y > z ? z : y); }
      return o;
    });
    let cover = 0;
    // each frame's subject box (u, v ‰): how far away clones stand, where they are over time
    const box = [];
    for (const m of steady) {
      let s2 = 0; for (let k = 0; k < m.length; k += 7) s2 += m[k]; cover = Math.max(cover, s2 / (m.length / 7) / 255);
      let x0 = mw, y0 = mh, x1 = -1, y1 = -1;
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (m[y * mw + x] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      box.push(...(x1 < 0 ? [0, 0, 0, 0] : [Math.round(x0 / mw * 1000), Math.round(y0 / mh * 1000), Math.round((x1 + 1) / mw * 1000), Math.round((y1 + 1) / mh * 1000)]));
    }
    const sheets = await pack(steady, mw, mh);
    return { v: 2, of: el.assetId, people, pts, at: what.at ?? null, whole: !!what.whole, sheets: sheets.ids, per: sheets.per, cols: sheets.cols, cw: mw, ch: mh, n, fps, t0: isVid ? (at != null ? at : t0) : 0, cover: Math.round(cover * 1000) / 1000, box, cam };
  }
  // masks → PNG sprite sheets (white, alpha = mask)
  async function pack(masks, w, h) {
    const cols = Math.max(1, Math.floor(SHEET / w)), rows = Math.max(1, Math.floor(SHEET / h)), per = cols * rows, ids = [];
    for (let s = 0; s < masks.length; s += per) {
      const list = masks.slice(s, s + per), r = Math.ceil(list.length / cols);
      const c = document.createElement('canvas'); c.width = w * Math.min(cols, list.length); c.height = h * r;
      const x = c.getContext('2d'), im = x.createImageData(w, h);
      for (let k = 0; k < im.data.length; k += 4) im.data[k] = im.data[k + 1] = im.data[k + 2] = 255;
      list.forEach((m, i) => { for (let k = 0; k < m.length; k++) im.data[k * 4 + 3] = m[k]; x.putImageData(im, (i % cols) * w, ((i / cols) | 0) * h); });
      const blob = await new Promise(res => c.toBlob(res, 'image/png'));
      ids.push(S.addMedia(blob, 'image'));
    }
    return { ids, per, cols };
  }

  /* ── jobs (one per layer) ── */
  const jobs = new Map();
  S.subjectJob = id => jobs.get(id) || null;
  // the frame on screen now, in the clip's own time
  const nowAt = el => { const v = R.isVideoAsset(el.assetId) && R.assetImage(el.assetId); return v ? v.currentTime : null; };
  // find the subject and keep it on the layer. quick = only the frame on screen (a preview while picking)
  S.findSubject = async function (el, what, { quick = false } = {}) {
    const id = el.id, old = jobs.get(id);
    if (old) old.ctrl.abort();
    const ctrl = new AbortController(), job = { id, p: 0, ctrl, quick, loading: !segs[what.people ? 'people' : 'pick'] };
    jobs.set(id, job); S.emit('subject', id);
    try {
      const subj = await analyse(el, what, { signal: ctrl.signal, at: quick ? nowAt(el) : undefined, onProgress: p => { job.p = p; job.loading = false; S.emit('subjectprogress', id); } });
      if (quick) subj.preview = true;
      const cur = S.doc.elements.find(e => e.id === id);
      if (cur) { S.changeEl(cur, e => { e.subj = subj; }); if (!quick) S.commit(); }
      return subj;
    } catch (e) {
      if (e.name !== 'AbortError') throw e;
      return null;
    } finally {
      if (jobs.get(id) === job) jobs.delete(id);
      S.emit('subject', id);
    }
  };
  S.cancelSubject = id => { const j = jobs.get(id); if (j) j.ctrl.abort(); };

  /* ── picking on the canvas: click what should light up ── */
  let picking = null;
  const area0 = document.getElementById('stage-area');
  S.isPickingSubject = () => !!picking;
  function pickLayer() { return picking && S.doc.elements.find(e => e.id === picking.id); }
  function drawDots() {
    if (!picking) return;
    const el = pickLayer(), map = el && R.videoSpaceMap(S.doc, el.id);
    picking.dots.replaceChildren();
    if (!map) return;
    for (const p of picking.pts) {
      const q = map.toCanvas(p[0], p[1]);
      const d = document.createElement('span'); d.className = 'subj-dot';
      d.style.left = (S.view.x + q.x * S.view.scale) + 'px'; d.style.top = (S.view.y + q.y * S.view.scale) + 'px';
      picking.dots.append(d);
    }
  }
  async function preview() {
    const el = pickLayer();
    if (!el) return;
    picking.busy = true; picking.root.classList.add('busy');
    try { await S.findSubject(el, { people: picking.people, pts: picking.pts, at: picking.at }, { quick: true }); }
    catch (e) { S.emit('toast', e.message || 'Couldn’t find it'); }
    if (picking) { picking.busy = false; picking.root.classList.remove('busy'); }
  }
  // opts: { people } — keep people found automatically too
  S.startSubjectPick = function (el, opts = {}) {
    if (!el || el.type !== 'image' || !area0) return;
    S.endSubjectPick(false);
    if (S.isPlaying && S.isPlaying()) S.pause();
    if (S.endTrackPick) S.endTrackPick();
    const root = document.createElement('div'); root.className = 'subj-pick';
    const dots = document.createElement('div'); dots.className = 'subj-dots';
    const bar = document.createElement('div'); bar.className = 'subj-bar';
    bar.innerHTML = S.mobile ? '<span>Tap things to light them up · tap a dot to undo</span>'
      : '<span>Click what should light up — click more things to add them, Alt-click a dot to remove it.</span>';
    const done = document.createElement('button'); done.type = 'button'; done.className = 'btn primary'; done.textContent = 'Done';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn'; cancel.textContent = 'Cancel';
    bar.append(cancel, done);
    root.append(dots, bar);
    area0.append(root);
    const prev = el.subj ? JSON.parse(JSON.stringify(el.subj)) : null;
    // clicks are made on the frame on screen; earlier picks were made on their own frame, so they start over
    const at = nowAt(el), same = el.subj && el.subj.at != null && at != null && Math.abs(el.subj.at - at) < 0.02;
    picking = { id: el.id, root, dots, at, pts: same || at == null ? ((el.subj && el.subj.pts) || []).map(p => p.slice()) : [], people: opts.people ?? !!(el.subj && el.subj.people), prev };
    root.addEventListener('pointerdown', async e => {
      if (e.target.closest('.subj-bar')) return;
      e.preventDefault(); e.stopPropagation();
      const lay = pickLayer(), map = lay && R.videoSpaceMap(S.doc, lay.id);
      if (!map) return;
      const p = S.docPoint(e.clientX, e.clientY), q = map.fromCanvas(p.x, p.y);
      // the nearest dot (Alt-click, or a tap right on a dot, takes it away)
      let bi = -1, bd = 1e9;
      picking.pts.forEach((c, i) => { const a = map.toCanvas(c[0], c[1]), d = Math.hypot(a.x - p.x, a.y - p.y); if (d < bd) { bd = d; bi = i; } });
      if (bi >= 0 && (e.altKey ? bd < 40 / S.view.scale : e.pointerType === 'touch' && bd < 22 / S.view.scale)) picking.pts.splice(bi, 1);
      else {
        if (q.u < 0 || q.v < 0 || q.u > 1 || q.v > 1) { S.emit('toast', 'Click on the photo or video itself'); return; }
        picking.pts.push([Math.round(q.u * 1e4) / 1e4, Math.round(q.v * 1e4) / 1e4]);
      }
      drawDots();
      if (picking.pts.length || picking.people) preview();
      else S.changeEl(lay, x => { delete x.subj; });
    });
    cancel.addEventListener('click', () => S.endSubjectPick(false));
    done.addEventListener('click', () => S.endSubjectPick(true));
    drawDots();
    S.emit('subjectpick', true);
  };
  // keep = run the whole clip with what was picked; otherwise put things back as they were
  S.endSubjectPick = function (keep) {
    if (!picking) return;
    const p = picking; picking = null;
    p.root.remove();
    const el = S.doc.elements.find(e => e.id === p.id);
    S.cancelSubject(p.id);
    S.emit('subjectpick', false);
    if (!el) return;
    if (!keep) { S.changeEl(el, e => { if (p.prev) e.subj = p.prev; else delete e.subj; }); return; }
    if (!p.pts.length && !p.people) { S.changeEl(el, e => { delete e.subj; }); S.commit(); return; }
    S.findSubject(el, { people: p.people, pts: p.pts, at: p.at }).catch(e => S.emit('toast', e.message || 'Couldn’t follow it through the video'));
  };
  // a subject style on a layer whose picture is new (replaced, or a template's sample photo): find the people in it
  // (only once per picture: not again after it failed or the user threw the result away)
  const tried = new Set();
  S.autoSubject = function (el, { force = false } = {}) {
    const ST = window.StudioStyles, d = el && el.sfx && ST && ST.byId(el.sfx.id);
    const wants = d && (d.subject || el.sfx.region === 'subject' || el.sfx.region === 'background');
    if (!wants || el.type !== 'image' || !el.assetId || R.hasSubject(el) || jobs.has(el.id) || picking) return null;
    const key = el.id + '|' + el.assetId;
    if (tried.has(key) && !force) return null;
    tried.add(key);
    return S.findSubject(el, { people: true });
  };
  S.forgetSubject = function (el) { tried.add(el.id + '|' + el.assetId); S.changeEl(el, e => { delete e.subj; }); S.commit(); };
  // look as soon as a design with such a layer opens (templates), or a layer gets a new picture
  let lookT = 0;
  const lookAll = () => { clearTimeout(lookT); lookT = setTimeout(() => { for (const el of S.doc.elements) { const p = S.autoSubject(el); if (p) p.catch(() => {}); } }, 600); };
  S.on('doc', lookAll); S.on('replaced', lookAll); S.on('history', lookAll);
  S.on('view', drawDots);
  window.addEventListener('keydown', e => { if (picking && e.key === 'Escape') { e.stopPropagation(); S.endSubjectPick(true); } }, true);
  S.on('selection', () => { if (picking && !S.selEls().some(e => e.id === picking.id)) S.endSubjectPick(true); });
})();
