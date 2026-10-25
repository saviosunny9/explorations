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
  function captionText(deck, draft) {
    const refs = (draft && draft.refs) || deck.refs || [];
    return `${deck.caption || deck.topic}\n\n${(deck.hashtags || []).join(' ')}\n` + (refs.length ? `\nSources\n${refs.map(r => `- ${r.title || r.url} (${r.source || 'source'}) ${r.url}`).join('\n')}\n` : '');
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


  // ---- PDF (one JPEG page per slide, no extra libraries) -----------------------------------------------------------------------------------
  function buildPDF(pages) {
    const enc = new TextEncoder(), chunks = [], offs = []; let pos = 0;
    const w = v => { const b = typeof v === 'string' ? enc.encode(v) : v; chunks.push(b); pos += b.length; };
    const begin = id => { offs[id] = pos; w(`${id} 0 obj\n`); }, end = () => w('endobj\n'), n = pages.length;
    w('%PDF-1.4\n');
    begin(1); w('<< /Type /Catalog /Pages 2 0 R >>\n'); end();
    begin(2); w(`<< /Type /Pages /Kids [${pages.map((_, k) => `${3 + 3 * k} 0 R`).join(' ')}] /Count ${n} >>\n`); end();
    pages.forEach((p, k) => {
      const pg = 3 + 3 * k, ct = 4 + 3 * k, im = 5 + 3 * k, content = `q ${p.w} 0 0 ${p.h} 0 0 cm /Im0 Do Q`;
      begin(pg); w(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.w} ${p.h}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>\n`); end();
      begin(ct); w(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\n`); end();
      begin(im); w(`<< /Type /XObject /Subtype /Image /Width ${p.iw} /Height ${p.ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`); w(p.jpeg); w('\nendstream\n'); end();
    });
    const xref = pos, total = 3 * n + 3;
    w(`xref\n0 ${total}\n0000000000 65535 f \n`); for (let id = 1; id < total; id++) w(String(offs[id]).padStart(10, '0') + ' 00000 n \n');
    w(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(chunks, { type: 'application/pdf' });
  }
  async function pdfBlob(deck, o) {
    const [W, H] = String((o && o.ratio) || '1080x1350').split('x').map(Number), pages = [];
    for (let i = 0; i < deck.slides.length; i++) {
      const b = await slideBlob(deck, i, { ratio: o && o.ratio, scale: 2, format: 'jpg' }); pages.push({ w: W, h: H, iw: W * 2, ih: H * 2, jpeg: new Uint8Array(await b.arrayBuffer()) }); await sleep(0);
    }
    return buildPDF(pages);
  }

  // ---- SVG, Figma hand-off, everything ------------------------------------------------------------------------------------------------------
  function svgFiles(deck, o) {
    const [W, H] = String((o && o.ratio) || '1080x1350').split('x').map(Number);
    return deck.slides.map((s, i) => ({ name: `slide-${pad(i + 1)}.svg`, blob: new Blob([R.toSVG(deck, i, { W, H })], { type: 'image/svg+xml' }) }));
  }
  // ---- Figma: a post as live-text frames for the "Sixjuly Flow importer" plugin (figma-plugin/) ----------------------------------------------------
  function figmaData(deck, draft, o) {
    const [W, H] = String((o && o.ratio) || '1080x1350').split('x').map(Number), name = (draft && draft.title) || deck.topic || 'Sixjuly post';
    return { kind: 'sixjuly-figma', version: 1, name, slides: deck.slides.map((s, i) => Object.assign({ name: `${name} — ${pad(i + 1)}` }, R.toFigma(deck, i, { W, H }))) };
  }
  const figmaJSON = (deck, draft, o) => JSON.stringify(figmaData(deck, draft, o));
  // copy the post for the Figma importer; when the clipboard is blocked, save it as a .sixjuly.json file instead
  async function addToFigma(deck, draft, o) {
    const text = figmaJSON(deck, draft, o), name = slug((draft && draft.title) || deck.topic) + '.sixjuly.json';
    try { await navigator.clipboard.writeText(text); return 'Copied for Figma. In Figma run “Sixjuly Flow importer” and paste. (First time? Export → Figma pack has the plugin.)'; }
    catch (e) { await download(new Blob([text], { type: 'application/json' }), name); return 'Saved ' + name + '. In Figma run “Sixjuly Flow importer” and open this file.'; }
  }
  function pluginFiles(prefix) { const P = window.SIXJULY_FIGMA_PLUGIN; if (!P) return []; return [['manifest.json', P.manifest], ['code.js', P.code], ['ui.html', P.ui]].map(([n, t]) => ({ name: prefix + n, blob: new Blob([t], { type: 'text/plain' }) })); }
  const FIGMA_README = (deck) => `HOW TO CONTINUE THIS POST IN FIGMA (live text)
==============================================
Once: install the importer
1. In the Figma desktop app: Plugins → Development → Import plugin from manifest…
2. Pick figma-plugin/manifest.json from this folder. It is now listed as "Sixjuly Flow importer". It runs on your computer and sends nothing anywhere.

Every post
1. In Sixjuly Flow click "Figma" on a post (or Export → Add to Figma in the editor). The post is copied.
2. In Figma run Plugins → Development → Sixjuly Flow importer, paste (Cmd/Ctrl + V) and press "Add to Figma".
   You can also open the .sixjuly.json file in this folder from the plugin instead of pasting.
3. Each slide becomes a frame. Headlines, labels and paragraphs are real text layers (font, size, line height, letter spacing and
   highlight colours kept). Rules, panels, shapes and photos come in as vectors and images in named groups.

Fonts: Google Sans Flex, Geist Mono, Instrument Serif and Anton are Google Fonts and available in Figma. If one is missing the plugin
uses Inter for that layer and lists the missing font.
The slide-XX.svg files are also here for other tools; SVG text keeps its <text> elements, but Figma's own SVG import may outline it,
which is why the plugin route exists. Figma does not accept outside .fig files, and nothing here claims to make one.

Post: ${deck.topic}
`;
  const FIGMA_README_OLD = (deck) => `HOW TO CONTINUE THIS POST IN FIGMA
=================================
1. Open a Figma design file.
2. Drag all the slide-XX.svg files from this folder onto the canvas (or paste one slide: in the app use Export > Copy this slide's SVG, then click in Figma and press Cmd/Ctrl + V).
3. Every slide arrives at ${'its exact size'} with live text and shapes. Rename the frames, group them in a section and keep editing.

Notes
- Fonts: the posts use Google Sans Flex (body), Anton, Instrument Serif and Space Mono. All are Google Fonts and are built into Figma. If a text layer shows a missing-font warning, pick the Google font by name.
- Photos are embedded inside the SVG as images. Brightness / contrast / saturation edits are applied as an image filter that Figma ignores; re-apply them in Figma if you need them.
- Figma cannot open a .fig file from outside. Importing SVG is the supported route, and nothing here claims otherwise.
- Layer names follow the slide: Background, Headline, Footer text, Visual, Logo and handle, and so on.

Post: ${deck.topic}
`;
  async function figmaPack(deck, draft, o) {
    const files = svgFiles(deck, o); files.push({ name: 'caption.txt', blob: new Blob([captionText(deck, draft)], { type: 'text/plain' }) }, { name: 'README.txt', blob: new Blob([FIGMA_README(deck)], { type: 'text/plain' }) }, { name: slug((draft && draft.title) || deck.topic) + '.sixjuly.json', blob: new Blob([figmaJSON(deck, draft, o)], { type: 'application/json' }) }, ...pluginFiles('figma-plugin/')); return files;
  }
  async function everything(deck, draft, o) {
    const out = [];
    (await carouselFiles(deck, Object.assign({}, o, { format: 'png' }))).forEach(f => out.push({ name: 'png/' + f.name, blob: f.blob }));
    (await carouselFiles(deck, Object.assign({}, o, { format: 'jpg' }))).forEach(f => out.push({ name: 'jpg/' + f.name, blob: f.blob }));
    svgFiles(deck, o).forEach(f => out.push({ name: 'svg/' + f.name, blob: f.blob }));
    out.push({ name: 'carousel.pdf', blob: await pdfBlob(deck, o) });
    out.push({ name: 'caption.txt', blob: new Blob([captionText(deck, draft)], { type: 'text/plain' }) });
    if (draft && draft.refs && draft.refs.length) out.push({ name: 'sources.txt', blob: new Blob([draft.refs.map(r => `${r.title || ''}\n${r.url}\n${r.source || ''}\n`).join('\n')], { type: 'text/plain' }) });
    out.push({ name: 'figma/README.txt', blob: new Blob([FIGMA_README(deck)], { type: 'text/plain' }) }, { name: 'figma/' + slug((draft && draft.title) || deck.topic) + '.sixjuly.json', blob: new Blob([figmaJSON(deck, draft, o)], { type: 'application/json' }) }, ...pluginFiles('figma/figma-plugin/'));
    svgFiles(deck, o).forEach(f => out.push({ name: 'figma/' + f.name, blob: f.blob }));
    if (draft) out.push({ name: 'post.json', blob: new Blob([JSON.stringify({ title: draft.title, topic: deck.topic, status: draft.status, refs: draft.refs || [], slides: deck.slides }, null, 1)], { type: 'application/json' }) });
    return out;
  }
  // downscale an uploaded photo to a sensible size (max 1400 px, JPEG)
  function shrink(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader(); fr.onerror = () => rej(new Error('Could not read ' + file.name));
      fr.onload = () => { const im = new Image(); im.onerror = () => rej(new Error(file.name + ' is not an image')); im.onload = () => { const k = Math.min(1, 1400 / Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', 0.86)); }; im.src = fr.result; };
      fr.readAsDataURL(file);
    });
  }

  window.SixjulyExport = { figmaData, figmaJSON, pluginFiles, addToFigma, slug, pad, slideBlob, carouselFiles, captionText, reelVideo, zipFiles, download, pdfBlob, svgFiles, figmaPack, everything, shrink };
})();
