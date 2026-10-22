/* Sixjuly Flow — exports: PNG / JPG slides, zip bundles and reel video (WebCodecs → MP4 / WebM, MediaRecorder fallback). */
(function () {
  'use strict';
  const R = window.SixjulyRender;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const slug = s => String(s || 'post').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'post';
  const pad = (n, w = 2) => String(n).padStart(w, '0');

  function blobOf(canvas, type, q) { return new Promise(res => canvas.toBlob(res, type, q)); }

  async function slideBlob(deck, i, o) {
    o = o || {};
    const [W, H] = String(o.ratio || '1080x1350').split('x').map(Number), sc = +o.scale || 1;
    const cv = document.createElement('canvas'); cv.width = Math.round(W * sc); cv.height = Math.round(H * sc);
    const ctx = cv.getContext('2d');
    R.drawSlide(ctx, deck, i, { W, H, scale: sc });
    return blobOf(cv, o.format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
  }
  async function carouselFiles(deck, o, onProgress) {
    const files = [], ext = o && o.format === 'jpg' ? 'jpg' : 'png';
    for (let i = 0; i < deck.slides.length; i++) { files.push({ name: `slide-${pad(i + 1)}.${ext}`, blob: await slideBlob(deck, i, o) }); if (onProgress) onProgress((i + 1) / deck.slides.length); await sleep(0); }
    return files;
  }
  function captionText(deck) {
    return `${deck.caption || deck.topic}\n\n${(deck.hashtags || []).join(' ')}\n`;
  }

  // ---- video ---------------------------------------------------------------------------------------------------------------------------
  function loadScript(src) {
    return new Promise((res, rej) => {
      if ([...document.scripts].some(s => s.src.endsWith(src))) return res();
      const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s);
    });
  }
  async function candidates(width, height, fps, bitrate, prefer) {
    if (!('VideoEncoder' in window)) return [];
    const avc = ['avc1.640032', 'avc1.64002a', 'avc1.640028', 'avc1.4d0034', 'avc1.42e034'], vp = ['vp09.00.40.08', 'vp09.00.41.08', 'vp09.00.51.08', 'vp8'];
    const order = prefer === 'webm' ? [['webm', vp]] : [['mp4', avc], ['webm', vp]];
    const out = [];
    for (const [kind, list] of order) for (const codec of list) {
      const cfg = { codec, width, height, bitrate, framerate: fps, latencyMode: 'quality' }; if (kind === 'mp4') cfg.avc = { format: 'avc' };
      let ok = false;
      for (const hw of ['no-preference', 'prefer-software']) {
        try { const r = await VideoEncoder.isConfigSupported(Object.assign({}, cfg, { hardwareAcceleration: hw })); if (r.supported) { out.push({ kind, cfg: Object.assign({}, cfg, { hardwareAcceleration: hw }) }); ok = true; } } catch (e) { /* next */ }
      }
      if (ok) break;
    }
    return out;
  }

  async function encodeWith(enc, deck, o, plan, onProgress) {
    const W = 1080, H = 1920, fps = enc.cfg.framerate, frames = Math.max(2, Math.ceil(plan.total * fps));
    const lib = enc.kind === 'mp4' ? 'Mp4Muxer' : 'WebMMuxer';
    if (!window[lib]) await loadScript(enc.kind === 'mp4' ? 'vendor/mp4-muxer.js' : 'vendor/webm-muxer.js');
    const L = window[lib];
    const muxer = enc.kind === 'mp4'
      ? new L.Muxer({ target: new L.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H }, fastStart: 'in-memory' })
      : new L.Muxer({ target: new L.ArrayBufferTarget(), video: { codec: enc.cfg.codec.startsWith('vp8') ? 'V_VP8' : 'V_VP9', width: W, height: H, frameRate: fps } });
    let failed = null;
    const encoder = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { failed = e; e.fromEncoder = true; } });
    encoder.configure(enc.cfg);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d', { alpha: false });
    for (let f = 0; f < frames; f++) {
      if (failed) throw failed;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      R.drawReel(ctx, deck, f / fps, { plan, motion: deck.motion || R.DEFAULT_MOTION });
      const vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
      encoder.encode(vf, { keyFrame: f % (fps * 2) === 0 }); vf.close();
      let waited = 0; while (encoder.encodeQueueSize > 6 && !failed) { await sleep(2); if (++waited > 5000) { failed = Object.assign(new Error('Encoder stalled'), { fromEncoder: true }); } }
      if (f % 6 === 0) { if (onProgress) onProgress(f / frames); await sleep(0); }
    }
    if (failed) throw failed;
    await encoder.flush(); encoder.close(); muxer.finalize();
    return { blob: new Blob([muxer.target.buffer], { type: enc.kind === 'mp4' ? 'video/mp4' : 'video/webm' }), ext: enc.kind === 'mp4' ? 'mp4' : 'webm' };
  }

  // real-time fallback for browsers without WebCodecs
  async function recordFallback(deck, o, plan, onProgress) {
    const W = 1080, H = 1920, fps = +o.fps || 30;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    const stream = cv.captureStream(fps); const mime = ['video/webm;codecs=vp9', 'video/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
    if (!mime) throw new Error('This browser cannot record video. Use Chrome, Edge or Safari.');
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: (+o.mbps || 10) * 1e6 }), chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const done = new Promise(r => (rec.onstop = r)); rec.start(200);
    const t0 = performance.now();
    await new Promise(res => { const tick = () => { const t = (performance.now() - t0) / 1000; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); R.drawReel(ctx, deck, Math.min(t, plan.total - 0.01), { plan, motion: deck.motion || R.DEFAULT_MOTION }); if (onProgress) onProgress(t / plan.total); if (t >= plan.total) res(); else requestAnimationFrame(tick); }; tick(); });
    rec.stop(); await done;
    return { blob: new Blob(chunks, { type: 'video/webm' }), ext: 'webm' };
  }

  async function reelVideo(deck, o, onProgress) {
    o = o || {}; const fps = +o.fps || 30, bitrate = (+o.mbps || 10) * 1e6;
    const plan = R.reelPlan(deck, deck.motion || R.DEFAULT_MOTION);
    const list = await candidates(1080, 1920, fps, bitrate, o.file === 'webm' ? 'webm' : 'mp4');
    let lastErr = null;
    for (const enc of list) {
      try { return await encodeWith(enc, deck, o, plan, onProgress); }
      catch (e) { lastErr = e; if (!e.fromEncoder) throw e; }
    }
    if (list.length && lastErr) throw lastErr;
    return recordFallback(deck, Object.assign({ fps }, o), plan, onProgress);
  }

  async function zipFiles(files) {
    if (!window.JSZip) await loadScript('vendor/jszip.min.js');
    const z = new JSZip(); files.forEach(f => z.file(f.name, f.blob));
    return z.generateAsync({ type: 'blob', compression: 'STORE' });
  }
  let dlP = null;
  const getDownloads = () => { if (!dlP) dlP = (window.claude && typeof window.claude.use === 'function') ? Promise.resolve(window.claude.use('downloads')).catch(() => null) : Promise.resolve(null); return dlP; };
  // inside Claude the page hands the file to the viewer through the downloads capability; elsewhere it is a normal browser download
  async function download(blob, name) {
    const d = await getDownloads();
    if (d) { try { await d.save({ filename: name, data: blob }); } catch (e) { if (e && e.code === 'declined') return; throw new Error((e && e.message) || 'Could not save the file'); } return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  window.SixjulyExport = { slug, pad, slideBlob, carouselFiles, captionText, reelVideo, zipFiles, download };
})();
