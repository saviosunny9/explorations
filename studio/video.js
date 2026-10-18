/* Collage Studio — video export.
   Renders the animation frame by frame with the same canvas renderer used for
   images, encodes with WebCodecs (H.264 → MP4, or VP9 → WebM) and muxes the
   result in the browser. Browsers without WebCodecs fall back to recording the
   canvas in real time with MediaRecorder. */
(function () {
  'use strict';

  const S = window.Studio, R = window.StudioRender;
  const LIBS = {
    // the bundled copies (webm-muxer carries a small patch for transparent video)
    mp4: 'vendor/mp4-muxer.js',
    webm: 'vendor/webm-muxer.js',
  };
  // if the page was published without the vendor folder, the stock builds from a CDN still make normal (opaque) video
  const CDN = {
    mp4: 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.5/build/mp4-muxer.js',
    webm: 'https://cdn.jsdelivr.net/npm/webm-muxer@5.0.4/build/webm-muxer.js',
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const even = n => Math.max(2, Math.round(n / 2) * 2);
  S.even = even;

  function loadScript(src) {
    return new Promise((res, rej) => {
      if ([...document.scripts].some(s => s.src === src)) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }

  // encoders this browser offers for the size, best first: H.264 (plays everywhere), then VP9 / VP8. Each codec is also
  // offered with the software encoder, because a hardware encoder can claim a size (4K) and then fail once frames arrive
  async function encoderCandidates(width, height, fps, bitrate, prefer) {
    if (!('VideoEncoder' in window)) return [];
    const avc = ['avc1.640034', 'avc1.640033', 'avc1.640032', 'avc1.64002a', 'avc1.640028', 'avc1.4d0034', 'avc1.42e034'];
    const vp = ['vp09.00.51.08', 'vp09.00.50.08', 'vp09.00.41.08', 'vp8'];
    const order = prefer === 'webm' ? [['webm', vp], ['mp4', avc]] : [['mp4', avc], ['webm', vp]];
    const out = [];
    const test = async (kind, cfg) => {
      try { const r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) { out.push({ kind, cfg: r.config || cfg }); return true; } } catch (e) { /* not this one */ }
      return false;
    };
    for (const [kind, list] of order) {
      for (const codec of list) {
        const cfg = { codec, width, height, bitrate, framerate: fps, latencyMode: 'quality' };
        if (kind === 'mp4') cfg.avc = { format: 'avc' };
        if (await test(kind, cfg)) { await test(kind, Object.assign({}, cfg, { hardwareAcceleration: 'prefer-software' })); break; }
      }
    }
    return out;
  }
  async function pickEncoder(width, height, fps, bitrate, prefer) {
    return (await encoderCandidates(width, height, fps, bitrate, prefer))[0] || null;
  }
  S.videoFormats = async function (width, height, fps) {
    const out = [];
    const m = await pickEncoder(width, height, fps, 8e6, 'mp4');
    if (m) out.push(m.kind);
    const w = await pickEncoder(width, height, fps, 8e6, 'webm');
    if (w && !out.includes(w.kind)) out.push(w.kind);
    if (!out.length && window.MediaRecorder) out.push('webm-realtime');
    return out;
  };

  /* ── long exports ──
     A file built in one ArrayBuffer tops out around 2 GB, so big exports are collected in pieces instead: the muxer writes
     forwards and only goes back a little (to fill in sizes), so recent pieces stay editable and older ones are handed to
     Blobs, which the browser can keep on disk. */
  function pieceTarget(Lib) {
    const head = [], live = [], frozen = [];
    let liveBytes = 0;
    const HEAD = 1 << 20, KEEP = 64 << 20;
    const write = (data, pos) => {
      data = data.slice();
      const end = pos + data.length;
      // a write over bytes already written (a size filled in later): patch the pieces it covers
      for (const p of head.concat(live)) {
        const pe = p.pos + p.data.length;
        if (pe <= pos || p.pos >= end) continue;
        const a = Math.max(pos, p.pos), b = Math.min(end, pe);
        p.data.set(data.subarray(a - pos, b - pos), a - p.pos);
        if (a === pos && b === end) return;
      }
      const tail = live.length ? live[live.length - 1] : head[head.length - 1];
      const at = tail ? tail.pos + tail.data.length : 0;
      if (end <= at) return;
      const fresh = pos < at ? data.subarray(at - pos) : data, fpos = Math.max(pos, at);
      if (fpos < HEAD) head.push({ pos: fpos, data: fresh });
      else { live.push({ pos: fpos, data: fresh }); liveBytes += fresh.length; }
      // older pieces become a Blob once plenty has been written after them
      if (liveBytes > KEEP * 2) {
        let n = 0, take = 0;
        while (n < live.length && liveBytes - take > KEEP) take += live[n++].data.length;
        frozen.push(new Blob(live.splice(0, n).map(p => p.data)));
        liveBytes -= take;
      }
    };
    const target = new Lib.StreamTarget({ onData: write, chunked: true, chunkSize: 8 << 20 });
    target.toBlob = type => new Blob([...head.map(p => p.data), ...frozen, ...live.map(p => p.data)], { type });
    return target;
  }
  // audio chunks go into the file in time order, just ahead of the video frames they play with
  function audioFeeder(muxer, snd) {
    let i = 0;
    const upTo = us => { if (!snd) return; while (i < snd.chunks.length && snd.chunks[i].chunk.timestamp <= us) { const c = snd.chunks[i++]; muxer.addAudioChunk(c.chunk, c.meta); } };
    return { upTo, rest: () => upTo(Infinity) };
  }
  const muxAudio = (snd, kind) => (snd ? { codec: kind === 'mp4' ? snd.codec : 'A_OPUS', numberOfChannels: snd.numberOfChannels, sampleRate: snd.sampleRate } : undefined);

  S.exportVideo = async function ({ width, height, fps = 30, duration = 5, bitrate, format = 'mp4', transparent = false, sound = true, onProgress = () => {}, signal }) {
    const doc = S.doc;
    width = even(width); height = even(height);
    bitrate = bitrate || Math.round(width * height * fps * 0.1);
    await R.preload(doc);
    const audible = sound && window.StudioAudio && window.StudioAudio.hasSound(doc);
    if (format === 'png') return exportFrames({ width, height, fps, duration, transparent, sound: audible, onProgress, signal });
    if (transparent) {
      const t = await exportAlphaWebm({ width, height, fps, duration, bitrate, sound: audible, onProgress, signal });
      if (t) return t;
    }
    const cands = await encoderCandidates(width, height, fps, bitrate, format);
    if (!cands.length) return recordRealtime({ width, height, fps, duration, bitrate, onProgress, signal });
    // if an encoder gives up part-way (typically hardware H.264 at 4K), start again with the next one
    let lastErr = null;
    for (let ci = 0; ci < cands.length; ci++) {
      try {
        return await encodeWith(cands[ci], { doc, width, height, fps, duration, bitrate, sound: audible, onProgress, signal });
      } catch (err) {
        if (!err || !err.fromEncoder || (signal && signal.aborted)) throw err;
        console.warn('Video encoder failed, trying the next one', cands[ci].cfg, err);
        lastErr = err;
        if (ci < cands.length - 1) onProgress(0, 'retry');
      }
    }
    throw lastErr;
  };
  async function encodeWith(enc, { doc, width, height, fps, duration, bitrate, sound, onProgress, signal }) {
    // the single-file build already carries the muxers; otherwise fetch the one we need
    if (!(enc.kind === 'mp4' ? window.Mp4Muxer : window.WebMMuxer)) await loadScript(LIBS[enc.kind]).catch(() => loadScript(CDN[enc.kind]));
    const Lib = enc.kind === 'mp4' ? window.Mp4Muxer : window.WebMMuxer;
    if (sound) onProgress(0, 'sound');
    const snd = sound ? await S.exportAudio(doc, duration, enc.kind) : null;
    // past ~400 MB the file is collected in pieces (see pieceTarget)
    const big = (bitrate || 8e6) * duration / 8 > 400e6;
    const target = big ? pieceTarget(Lib) : new Lib.ArrayBufferTarget();
    const audio = muxAudio(snd, enc.kind);
    const muxer = enc.kind === 'mp4'
      ? new Lib.Muxer({ target, video: { codec: 'avc', width, height }, audio, fastStart: big ? false : 'in-memory', firstTimestampBehavior: 'offset' })
      : new Lib.Muxer({ target, video: { codec: enc.cfg.codec.startsWith('vp8') ? 'V_VP8' : 'V_VP9', width, height, frameRate: fps }, audio, firstTimestampBehavior: 'offset' });
    const feed = audioFeeder(muxer, snd);
    let failure = null;
    const encErr = e => { const x = e instanceof Error ? e : new Error(String(e)); x.fromEncoder = true; return x; };
    const encoder = new VideoEncoder({ output: (chunk, meta) => { feed.upTo(chunk.timestamp); muxer.addVideoChunk(chunk, meta); }, error: e => { failure = encErr(e); } });
    try { encoder.configure(enc.cfg); } catch (e) { throw encErr(e); }
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const frames = Math.max(1, Math.round(duration * fps));
    const us = 1e6 / fps;
    const hasVid = R.hasVideo(doc);
    R.playing = false; R.pauseVideos();
    try {
      for (let i = 0; i < frames; i++) {
        if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (failure) throw failure;
        // video layers are seeked to their exact frame first
        if (hasVid) await R.syncVideos(doc, i / fps, i === 0);
        R.renderDoc(doc, { canvas: c, time: i / fps });
        const frame = new VideoFrame(c, { timestamp: Math.round(i * us), duration: Math.round(us) });
        try { encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 }); } catch (e) { throw failure || encErr(e); } finally { frame.close(); }
        // an encoder that stops taking frames counts as failed (some hardware encoders stall instead of erroring)
        for (const t0 = performance.now(); encoder.encodeQueueSize > 4 && !failure; await sleep(4)) {
          if (performance.now() - t0 > 15000) throw encErr(new Error('The video encoder stopped responding'));
        }
        onProgress((i + 1) / frames, 'render');
        if (i % 2 === 0) await sleep(0);
      }
      onProgress(1, 'finish');
      try {
        await Promise.race([encoder.flush(), sleep(60000).then(() => { throw new Error('The video encoder stopped responding'); })]);
      } catch (e) { throw failure || encErr(e); }
      if (failure) throw failure;
      feed.rest();
      muxer.finalize();
    } finally {
      if (encoder.state !== 'closed') encoder.close();
    }
    const type = enc.kind === 'mp4' ? 'video/mp4' : 'video/webm';
    const blob = big ? target.toBlob(type) : new Blob([muxer.target.buffer], { type });
    return { blob, ext: enc.kind, width, height, codec: enc.cfg.codec, software: enc.cfg.hardwareAcceleration === 'prefer-software', sound: snd ? snd.codec : sound ? 'failed' : null };
  }

  /* ── see-through video ──
     WebCodecs can't encode alpha, so a transparent WebM is built the way browsers store one: the colour
     picture as normal VP9, plus the alpha channel encoded as a second greyscale VP9 picture carried in each
     block's BlockAdditional (BlockAddID 1, track AlphaMode 1). Chrome, Edge, Firefox and most editors
     that read WebM play it see-through. */
  const vint8 = n => { const b = new Uint8Array(8); b[0] = 1; for (let i = 7; i > 0; i--) { b[i] = n & 255; n = Math.floor(n / 256); } return b; };
  const cat = parts => { const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
  function blockMore(alpha) {
    const inner = cat([new Uint8Array([0xEE, 0x81, 0x01, 0xA5]), vint8(alpha.length), alpha]);
    return cat([new Uint8Array([0xA6]), vint8(inner.length), inner]);
  }
  // one frame's pixels → an opaque colour picture (straight, not premultiplied) and the alpha as a raw I420 plane:
  // going through a canvas would squeeze alpha into video range (16–235), so the Y plane is written directly
  function splitAlpha(src, colour, yuv) {
    const w = src.width, h = src.height;
    const d = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h), p = d.data;
    for (let i = 0, j = 0; i < p.length; i += 4, j++) { yuv[j] = p[i + 3]; p[i + 3] = 255; }
    colour.getContext('2d').putImageData(d, 0, 0);
  }
  async function exportAlphaWebm({ width, height, fps, duration, bitrate, sound, onProgress, signal }) {
    if (!('VideoEncoder' in window)) return null;
    let cfg = null;
    for (const codec of ['vp09.00.51.08', 'vp09.00.50.08', 'vp09.00.41.08', 'vp8']) {
      const c0 = { codec, width, height, bitrate, framerate: fps, latencyMode: 'quality' };
      try { const r = await VideoEncoder.isConfigSupported(c0); if (r.supported) { cfg = r.config || c0; break; } } catch (e) { /* next */ }
    }
    if (!cfg) return null;
    if (!window.WebMMuxer) await loadScript(LIBS.webm);
    const Lib = window.WebMMuxer;
    const snd = sound ? await S.exportAudio(S.doc, duration, 'webm') : null;
    const muxer = new Lib.Muxer({ target: new Lib.ArrayBufferTarget(), video: { codec: cfg.codec.startsWith('vp8') ? 'V_VP8' : 'V_VP9', width, height, frameRate: fps, alpha: true }, audio: muxAudio(snd, 'webm'), firstTimestampBehavior: 'offset' });
    const feed = audioFeeder(muxer, snd);
    // the two encoders finish frames at their own pace; pair them up by timestamp and write in order
    const colourOut = new Map(), alphaOut = new Map(), order = [];
    let failure = null, next = 0;
    const flushPairs = () => {
      while (next < order.length && colourOut.has(order[next]) && alphaOut.has(order[next])) {
        const ts = order[next], c = colourOut.get(ts), a = alphaOut.get(ts);
        feed.upTo(ts);
        muxer.addVideoChunkRaw(c.data, c.type, ts, Object.assign({}, c.meta || {}, { additions: blockMore(a) }));
        colourOut.delete(ts); alphaOut.delete(ts); next++;
      }
    };
    const bytes = ch => { const b = new Uint8Array(ch.byteLength); ch.copyTo(b); return b; };
    const encC = new VideoEncoder({ output: (ch, meta) => { colourOut.set(ch.timestamp, { data: bytes(ch), type: ch.type, meta }); flushPairs(); }, error: e => { failure = e; } });
    const encA = new VideoEncoder({ output: ch => { alphaOut.set(ch.timestamp, bytes(ch)); flushPairs(); }, error: e => { failure = e; } });
    encC.configure(cfg);
    encA.configure(Object.assign({}, cfg, { bitrate: Math.max(500e3, Math.round(bitrate * 0.35)) }));
    const mk = () => { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; };
    const c = mk(), colour = mk(), yuv = new Uint8Array(width * height * 3 / 2);
    yuv.fill(128, width * height);
    const frames = Math.max(1, Math.round(duration * fps)), us = 1e6 / fps, doc = S.doc, hasVid = R.hasVideo(doc);
    R.playing = false; R.pauseVideos();
    try {
      for (let i = 0; i < frames; i++) {
        if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (failure) throw failure;
        if (hasVid) await R.syncVideos(doc, i / fps, i === 0);
        R.renderDoc(doc, { canvas: c, time: i / fps, transparent: true });
        splitAlpha(c, colour, yuv);
        const ts = Math.round(i * us), key = i % (fps * 2) === 0;
        order.push(ts);
        const fc = new VideoFrame(colour, { timestamp: ts, duration: Math.round(us) });
        encC.encode(fc, { keyFrame: key }); fc.close();
        const fa = new VideoFrame(yuv, { format: 'I420', codedWidth: width, codedHeight: height, timestamp: ts, duration: Math.round(us) });
        encA.encode(fa, { keyFrame: key }); fa.close();
        while (encC.encodeQueueSize > 4 || encA.encodeQueueSize > 4) await sleep(4);
        onProgress((i + 1) / frames, 'render');
        if (i % 2 === 0) await sleep(0);
      }
      onProgress(1, 'finish');
      await Promise.all([encC.flush(), encA.flush()]);
      if (failure) throw failure;
      flushPairs();
      feed.rest();
      muxer.finalize();
    } finally {
      for (const e of [encC, encA]) if (e.state !== 'closed') e.close();
    }
    return { blob: new Blob([muxer.target.buffer], { type: 'video/webm' }), ext: 'webm', width, height, alpha: true, sound: snd ? snd.codec : sound ? 'failed' : null };
  }

  // every frame as a numbered PNG in a zip — the format video editors import as a see-through clip
  async function exportFrames({ width, height, fps, duration, transparent, sound, onProgress, signal }) {
    if (!window.JSZip) await loadScript('vendor/jszip.min.js').catch(() => loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'));
    const zip = new window.JSZip(), dir = zip.folder('frames');
    // the sound goes next to the frames as a WAV file
    const mix = sound ? await window.StudioAudio.mix(S.doc, duration).catch(() => null) : null;
    if (mix) zip.file('sound.wav', window.StudioAudio.wav(mix));
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const frames = Math.max(1, Math.round(duration * fps)), doc = S.doc, hasVid = R.hasVideo(doc), pad = String(frames).length;
    R.playing = false; R.pauseVideos();
    for (let i = 0; i < frames; i++) {
      if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (hasVid) await R.syncVideos(doc, i / fps, i === 0);
      R.renderDoc(doc, { canvas: c, time: i / fps, transparent });
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      dir.file(`frame_${String(i + 1).padStart(Math.max(4, pad), '0')}.png`, blob);
      onProgress((i + 1) / frames * 0.9, 'render');
    }
    onProgress(0.95, 'finish');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    return { blob, ext: 'zip', width, height, alpha: transparent, frames, sound: mix ? 'wav' : null };
  }

  // fallback: draw frames on a timer and record the canvas stream
  async function recordRealtime({ width, height, fps, duration, bitrate, onProgress, signal }) {
    if (!window.MediaRecorder) throw new Error('This browser can’t encode video');
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const stream = c.captureStream(fps);
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise(res => { rec.onstop = res; });
    await R.syncVideos(S.doc, 0, true);
    R.playing = true;
    R.renderDoc(S.doc, { canvas: c, time: 0 });
    rec.start();
    const t0 = performance.now();
    await new Promise(res => {
      const step = () => {
        const t = (performance.now() - t0) / 1000;
        if (t >= duration || (signal && signal.aborted)) return res();
        R.liveSyncVideos(S.doc, t);
        R.renderDoc(S.doc, { canvas: c, time: t });
        onProgress(t / duration, 'render');
        requestAnimationFrame(step);
      };
      step();
    });
    rec.stop();
    R.playing = false; R.pauseVideos();
    await done;
    if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const type = (mime || 'video/webm').split(';')[0];
    return { blob: new Blob(chunks, { type }), ext: type.includes('mp4') ? 'mp4' : 'webm', width, height };
  }
})();
