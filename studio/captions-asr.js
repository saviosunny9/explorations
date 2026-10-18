/* Savio's editor — captions: hearing the words.
   S.transcribe({ src, engine, language, translate, model, key, onProgress, signal }) → cues for captions.js:
     engine 'local'  — Whisper in the browser (transformers.js from jsDelivr, onnx-community/whisper-*_timestamped from
                       Hugging Face, WebGPU when there is one), with word times; nothing leaves the computer
     engine 'gemini' — Google's Gemini with the user's own API key (better for many languages, translations, lyrics);
                       gives cue times only (the S film handoff, §3)
   Either way the words are then timed against the sound by the alignment model (align-model.js: log-mel features, a small
   CNN, a CTC Viterbi per cue — WordAligner.kt), which lands ~90 % of words within 0.1 s. */
(function () {
  'use strict';
  const S = window.Studio, A = window.StudioAudio, C = window.StudioCaptions;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ── the sound, 16 kHz mono ── */
  async function to16k(buf, from = 0, to = null) {
    const end = Math.min(buf.duration, to ?? buf.duration), dur = Math.max(0.05, end - from);
    const oc = new OfflineAudioContext(1, Math.ceil(dur * 16000), 16000), s = oc.createBufferSource();
    s.buffer = buf; s.connect(oc.destination); s.start(0, from, dur);
    return (await oc.startRendering()).getChannelData(0);
  }
  // what to listen to: the whole design's sound, a video layer's own sound (its trimmed part) or a sound track.
  // Returns { pcm, offset (s of source time where pcm starts), duration }
  S.captionAudio = async function (src) {
    const doc = S.doc;
    if (!src || src.kind === 'mix') {
      const dur = (doc.anim && doc.anim.duration) || 5, mix = await A.mix(doc, dur, 16000);
      if (!mix) throw new Error('This design has no sound to caption yet');
      return { pcm: await to16k(mix), offset: 0, duration: dur };
    }
    let id, trim = 0, end = null;
    if (src.kind === 'el') { const e = doc.elements.find(x => x.id === src.id); if (!e) throw new Error('That video is gone'); id = e.assetId; trim = (e.video && e.video.trim) || 0; end = e.video && e.video.end > 0 ? e.video.end : null; }
    else { const a = (doc.audio || []).find(x => x.id === src.id); if (!a) throw new Error('That sound is gone'); id = a.assetId; trim = a.trim || 0; end = a.end > 0 ? a.end : null; }
    const buf = await A.decode(id);
    if (!buf) throw new Error('Couldn’t read the sound of that clip');
    return { pcm: await to16k(buf, trim, end), offset: trim, duration: (end ?? buf.duration) - trim };
  };
  function wavBlob(pcm) {
    const out = new DataView(new ArrayBuffer(44 + pcm.length * 2)), str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE'); str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
    out.setUint32(24, 16000, true); out.setUint32(28, 32000, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) out.setInt16(44 + i * 2, clamp(pcm[i], -1, 1) * 32767, true);
    return new Blob([out.buffer], { type: 'audio/wav' });
  }
  const b64 = async blob => { const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };

  /* ── on this computer: Whisper ── */
  const TF = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
  S.LOCAL_MODELS = [['base', 'Fast', 'onnx-community/whisper-base_timestamped', '95 MB'], ['small', 'Best', 'onnx-community/whisper-small_timestamped', '330 MB']];
  // half-precision encoder + 8-bit decoder: the best words of the sizes tried, and a third of the full download
  const DTYPE = { encoder_model: 'fp16', decoder_model_merged: 'q8' };
  const pipes = {};
  let gpuOk = null;   // is there a WebGPU adapter that works? (asked once)
  async function hasGpu() {
    if (gpuOk == null) { try { gpuOk = !!(navigator.gpu && await navigator.gpu.requestAdapter()); } catch (e) { gpuOk = false; } }
    return gpuOk;
  }
  // the online copy can't always reach jsDelivr / Hugging Face: it falls back to copies published next to the page
  // (tools/whisper_prep.py: the runtime, configs, and the big files as base64 parts listed in models/whisper/manifest.json)
  const here = p => new URL(p, location.href).href;
  let T = null, localOn = false, fromCopy = false;
  async function runtime() {
    if (T) return T;
    try { T = await import(TF); }
    catch (e) { if (!window.STUDIO_MODEL_PARTS) throw e; T = await import(here('vendor/transformers.min.js')); fromCopy = true; }
    return T;
  }
  async function parts(f, onBytes) {
    let got = 0; const out = new Uint8Array(f.bytes);
    for (let i = 0; i < f.parts; i++) {
      const r = await fetch(here(`models/whisper/${f.stem}.part${i}.txt`));
      if (!r.ok) throw new Error('Couldn’t download the speech model');
      const bin = atob((await r.text()).trim());
      for (let k = 0; k < bin.length; k++) out[got + k] = bin.charCodeAt(k);
      got += bin.length; onBytes && onBytes(got);
    }
    return out;
  }
  async function useLocal(onProgress) {
    if (localOn) return true;
    if (!window.STUDIO_MODEL_PARTS) return false;
    let man; try { man = await (await fetch(here('models/whisper/manifest.json'))).json(); } catch (e) { return false; }
    const total = Object.values(man.files).reduce((a, f) => a + f.bytes, 0), done = {};
    const tell = (k, n) => { done[k] = n; onProgress && onProgress('download', Object.values(done).reduce((a, b) => a + b, 0) / total); };
    const env = T.env, store = 'caches' in window ? await caches.open('studio-whisper').catch(() => null) : null;
    env.allowLocalModels = false; env.useBrowserCache = false;
    env.remoteHost = here('models/hf/'); env.remotePathTemplate = '{model}/';
    env.useCustomCache = true;
    env.customCache = {
      async match(key) {
        const name = Object.keys(man.files).find(k => k !== 'wasm' && String(key).endsWith(man.model + '/' + k));
        if (!name) return undefined;
        const hit = store && await store.match(here('models/whisper/' + name)).catch(() => null);
        if (hit) { tell(name, man.files[name].bytes); return hit; }
        const res = new Response(await parts(man.files[name], n => tell(name, n)), { headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(man.files[name].bytes) } });
        if (store) store.put(here('models/whisper/' + name), res.clone()).catch(() => {});
        return res;
      },
      async put() { /* kept by match */ },
    };
    const w = env.backends.onnx.wasm;
    w.wasmPaths = { mjs: here('vendor/ort-wasm-simd-threaded.jsep.mjs') };
    w.wasmBinary = await parts(man.files.wasm, n => tell('wasm', n));
    return (localOn = true);
  }
  async function whisper(model, onProgress, device) {
    const m = S.LOCAL_MODELS.find(x => x[0] === model) || S.LOCAL_MODELS[0], id = m[2], key = id + '|' + device;
    if (pipes[key]) return pipes[key];
    pipes[key] = (async () => {
      await runtime();
      // no jsDelivr means no runtime .wasm from there either: use the copies from the start (the runtime can't retry)
      if (fromCopy && !(await useLocal(onProgress))) throw new Error('Couldn’t load the speech model here');
      const files = {};
      const progress_callback = p => {
        if (p.status === 'progress' && p.total && !localOn) { files[p.file] = [p.loaded, p.total]; let a = 0, b = 0; for (const [x, y] of Object.values(files)) { a += x; b += y; } onProgress && onProgress('download', a / b); }
      };
      const make = () => T.pipeline('automatic-speech-recognition', id, { dtype: DTYPE, device, progress_callback });
      try { return await make(); }
      catch (e) {
        // blocked from the model's home: the copies published with this page (the Fast model only)
        if (localOn || m[0] !== 'base' || !(await useLocal(onProgress))) throw e;
        return make();
      }
    })();
    pipes[key].catch(() => { delete pipes[key]; });
    return pipes[key];
  }
  const WHISPER_LANG = { en: 'english', te: 'telugu', hi: 'hindi', ta: 'tamil', kn: 'kannada', ml: 'malayalam', es: 'spanish', fr: 'french', de: 'german', pt: 'portuguese', it: 'italian', ja: 'japanese', ko: 'korean', zh: 'chinese', ar: 'arabic', ru: 'russian' };
  // timed words → cues: a cue ends at a full stop, a comma once it's long enough, a pause, or about 6 s / 80 characters
  function wordsToCues(ws, lang) {
    const cues = []; let cur = [];
    const flush = () => { if (cur.length) { const text = cur.map(w => w.text).join(' '); cues.push({ start: cur[0].s, end: cur[cur.length - 1].e, lang, text, en: lang === 'en' ? text : '', words: cur.map(w => w.s), timedText: text }); cur = []; } };
    for (const w of ws) {
      if (cur.length && (w.s - cur[cur.length - 1].e > 700 || w.e - cur[0].s > 6000 || cur.reduce((a, x) => a + x.text.length + 1, 0) + w.text.length > 80)) flush();
      cur.push(w);
      const len = cur.reduce((a, x) => a + x.text.length + 1, 0), span = w.e - cur[0].s;
      if (/[.?!…]["”’)]?$/.test(w.text) || (/[,;:]["”’)]?$/.test(w.text) && (span > 1800 || len > 34))) flush();
    }
    flush();
    return cues;
  }
  async function transcribeLocal(audio, o) {
    const opts = { return_timestamps: 'word', chunk_length_s: 30, stride_length_s: 5 };
    if (o.language && WHISPER_LANG[o.language]) { opts.language = WHISPER_LANG[o.language]; opts.task = 'transcribe'; }
    const hear = async device => { const asr = await whisper(o.model, o.onProgress, device); o.onProgress && o.onProgress('listen', 0); return asr(audio.pcm, opts); };
    let out = null;
    // the graphics chip when there's one that works, else the processor
    if (await hasGpu()) { try { out = await hear('webgpu'); } catch (e) { console.warn('Whisper on WebGPU failed, using the processor', e); gpuOk = false; } }
    if (!out) out = await hear('wasm');
    const ws = (out.chunks || []).map(c => ({ text: String(c.text || '').trim(), s: Math.round((c.timestamp[0] ?? 0) * 1000), e: Math.round((c.timestamp[1] ?? c.timestamp[0] ?? 0) * 1000) })).filter(w => w.text);
    for (let i = 0; i < ws.length; i++) if (ws[i].e <= ws[i].s) ws[i].e = ws[i + 1] ? ws[i + 1].s : ws[i].s + 300;
    return wordsToCues(ws, o.language || (/[\u0C00-\u0C7F]/.test(out.text || '') ? 'te' : ''));
  }

  /* ── Gemini, with the user's own key ── */
  const GEM = 'https://generativelanguage.googleapis.com';
  S.GEMINI_MODELS = [['gemini-3.8-flash', 'Gemini Flash'], ['gemini-3.5-flash-lite', 'Gemini Flash-Lite (faster)']];
  const LANG_NAMES = { en: 'English', te: 'Telugu', hi: 'Hindi', ta: 'Tamil', kn: 'Kannada', ml: 'Malayalam', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese', it: 'Italian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic', ru: 'Russian' };
  S.CAPTION_LANGS = Object.entries(LANG_NAMES);
  function geminiPrompt(dur, tr, schema) {
    const trName = tr && LANG_NAMES[tr];
    return [
      `You write subtitles. Transcribe every word spoken or sung in this audio (it is ${dur.toFixed(1)} seconds long) and split it into subtitle cues.`,
      'Rules:',
      '- Each cue: start and end in seconds from the beginning of the audio, matching when the words are said; 1 to 6 seconds; at most about 80 characters; break at natural pauses; in order; no overlaps.',
      '- spoken: exactly what was said, in the script of the language spoken (Telugu in Telugu script, English in Latin letters; keep words from another language that are mixed in as they were said).',
      '- language: the ISO 639-1 code of the main language of that cue (te, en, hi, ...).',
      '- english: a natural English subtitle for the cue (the same words if they spoke English).',
      trName ? `- translation: a natural ${trName} subtitle for the cue, in ${trName}'s own script (the same words if they spoke ${trName}).` : '- translation: leave empty.',
      '- Only real speech or lyrics: no sound descriptions; write [inaudible] for words you cannot make out. If nobody speaks or sings, return no cues.',
      schema ? '' : 'Reply with only JSON in this form: {"cues":[{"start":0.0,"end":2.4,"language":"en","spoken":"...","english":"...","translation":"..."}]}',
    ].filter(Boolean).join('\n');
  }
  const SCHEMA = { type: 'OBJECT', properties: { cues: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
    start: { type: 'NUMBER', description: 'seconds from the start of the audio' }, end: { type: 'NUMBER', description: 'seconds from the start of the audio' },
    language: { type: 'STRING', description: 'ISO 639-1 code of the language spoken' }, spoken: { type: 'STRING', description: "the words as spoken, in that language's own script" },
    english: { type: 'STRING' }, translation: { type: 'STRING' } }, required: ['start', 'end', 'language', 'spoken', 'english', 'translation'] } } }, required: ['cues'] };
  async function geminiUpload(blob, key, signal) {
    const start = await fetch(GEM + '/upload/v1beta/files', { method: 'POST', signal, headers: { 'x-goog-api-key': key, 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(blob.size), 'X-Goog-Upload-Header-Content-Type': blob.type, 'Content-Type': 'application/json' }, body: JSON.stringify({ file: { display_name: 'captions-audio' } }) });
    if (!start.ok) throw new Error('Gemini upload failed (' + start.status + ')');
    const url = start.headers.get('x-goog-upload-url');
    const up = await fetch(url, { method: 'POST', signal, headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' }, body: blob });
    let f = (await up.json()).file;
    while (f && f.state === 'PROCESSING') { await new Promise(r => setTimeout(r, 1500)); f = await (await fetch(GEM + '/v1beta/' + f.name, { headers: { 'x-goog-api-key': key }, signal })).json(); }
    if (!f || f.state === 'FAILED') throw new Error('Gemini couldn’t read the sound');
    return f;
  }
  async function transcribeGemini(audio, o) {
    if (!o.key) throw new Error('Add your Gemini API key first');
    const blob = wavBlob(audio.pcm), part = blob.size <= 13e6 ? { inlineData: { mimeType: 'audio/wav', data: await b64(blob) } } : null;
    o.onProgress && o.onProgress('upload', 0);
    const media = part || { fileData: { mimeType: 'audio/wav', fileUri: (await geminiUpload(blob, o.key, o.signal)).uri } };
    const ask = async (thinking, schema) => {
      const gc = { temperature: 0.2, responseMimeType: 'application/json' };
      if (schema) gc.responseSchema = SCHEMA;
      if (thinking) gc.thinkingConfig = { thinkingLevel: 'low' };
      const res = await fetch(`${GEM}/v1beta/models/${o.model || S.GEMINI_MODELS[0][0]}:streamGenerateContent?alt=sse`, {
        method: 'POST', signal: o.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': o.key },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [media, { text: geminiPrompt(audio.duration, o.translate, schema) }] }], generationConfig: gc }),
      });
      if (res.status === 400) return null;
      if (!res.ok) { let msg = ''; try { msg = (await res.json()).error.message; } catch (e) { /* plain */ } throw new Error('Gemini: ' + (msg || res.status)); }
      // streamed: join the text parts (not the thinking), counting cues as they come
      const rd = res.body.getReader(), dec = new TextDecoder(); let buf = '', text = '';
      for (;;) {
        const { value, done } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let k;
        while ((k = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, k).trim(); buf = buf.slice(k + 1);
          if (!line.startsWith('data:')) continue;
          try { const j = JSON.parse(line.slice(5)); for (const p of ((j.candidates || [])[0] || {}).content?.parts || []) if (!p.thought && p.text) text += p.text; } catch (e) { /* a partial line */ }
          o.onProgress && o.onProgress('listen', (text.match(/"end"/g) || []).length);
        }
      }
      return text;
    };
    // without thinking, then without the schema too, when the model refuses the request
    const text = (await ask(true, true)) ?? (await ask(false, true)) ?? (await ask(false, false));
    if (text == null) throw new Error('Gemini didn’t accept the request');
    let j; try { j = JSON.parse(text.replace(/^```(json)?|```$/g, '').trim()); } catch (e) { throw new Error('Gemini’s answer wasn’t readable — try again'); }
    const raw = Array.isArray(j) ? j : j.cues || [];
    return raw.map(c => {
      const lang = String(c.language || '').toLowerCase(), spoken = String(c.spoken || '').trim();
      return { start: C.parseTime(c.start), end: C.parseTime(c.end), lang, text: spoken || String(c.english || '').trim(), en: String(c.english || '').trim() || (lang.startsWith('en') ? spoken : ''), tr: String(c.translation || '').trim() };
    });
  }

  /* ── word timing: the alignment model ── */
  const LABELS = ['-', 'a', 'i', 'e', 'n', 'o', 'u', 't', 's', 'r', 'm', 'k', 'l', 'd', 'g', 'h', 'y', 'b', 'p', 'w', 'c', 'v', 'j', 'z', 'f', "'", 'q', 'x'];
  const MEL = 40, CH = 160, VOCAB = 28;
  let model = null;
  function half(h) {
    const sign = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, m = h & 0x3ff;
    if (e === 0) return sign * m * Math.pow(2, -24);
    if (e === 31) return m ? NaN : sign * Infinity;
    return sign * (1 + m / 1024) * Math.pow(2, e - 15);
  }
  function loadModel() {
    if (model) return model;
    if (!window.STUDIO_ALIGN_MODEL) return null;
    const bin = atob(window.STUDIO_ALIGN_MODEL), n = bin.length >> 1, f = new Float32Array(n);
    for (let i = 0; i < n; i++) f[i] = half(bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8));
    let o = 0; const take = k => { const v = f.subarray(o, o + k); o += k; return v; };
    const m = { c1w: take(CH * MEL * 5), c1b: take(CH), c2w: take(CH * CH * 3), c2b: take(CH), blocks: [] };
    for (let b = 0; b < 8; b++) m.blocks.push({ dw: take(CH * 9), db: take(CH), pw: take(CH * CH), pb: take(CH), g: take(CH), b: take(CH) });
    m.ow = take(VOCAB * CH); m.ob = take(VOCAB);
    return (model = m);
  }
  // 40 log-mel bands every 10 ms (periodic Hann 512, 60–7600 Hz), each less its mean over the clip
  let fb = null; const win = new Float64Array(512).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / 512));
  function bank() {
    if (fb) return fb;
    const hz2m = f => 2595 * Math.log10(1 + f / 700), m2hz = m => 700 * (Math.pow(10, m / 2595) - 1), lo = hz2m(60), hi = hz2m(7600);
    const pts = Array.from({ length: MEL + 2 }, (_, i) => m2hz(lo + (hi - lo) * i / (MEL + 1)));
    return (fb = Array.from({ length: MEL }, (_, i) => Float32Array.from({ length: 257 }, (_, k) => { const f = k * 16000 / 512; return Math.max(0, Math.min((f - pts[i]) / (pts[i + 1] - pts[i]), (pts[i + 2] - f) / (pts[i + 2] - pts[i + 1]))); })));
  }
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2, ar = re[b] * cr - im[b] * ci, ai = re[b] * ci + im[b] * cr; re[b] = re[a] - ar; im[b] = im[a] - ai; re[a] += ar; im[a] += ai; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
    }
  }
  function logMel(pcm) {
    const T = Math.floor(pcm.length / 160), out = Array.from({ length: MEL }, () => new Float32Array(T)), re = new Float64Array(512), im = new Float64Array(512), B = bank();
    for (let t = 0; t < T; t++) {
      const s = t * 160;
      for (let i = 0; i < 512; i++) { const j = s + i; re[i] = j < pcm.length ? pcm[j] * win[i] : 0; im[i] = 0; }
      fft(re, im);
      for (let m = 0; m < MEL; m++) { const w = B[m]; let acc = 0; for (let k = 0; k < 257; k++) if (w[k]) acc += w[k] * (re[k] * re[k] + im[k] * im[k]); out[m][t] = Math.log(acc + 1e-6); }
    }
    for (const row of out) { let mean = 0; for (const v of row) mean += v; mean /= Math.max(1, row.length); for (let i = 0; i < row.length; i++) row[i] -= mean; }
    return out;
  }
  function forward(M, mel, from, to) {
    const n = to - from, h1 = Array.from({ length: CH }, () => new Float32Array(n));
    for (let o = 0; o < CH; o++) {
      const row = h1[o]; row.fill(M.c1b[o]);
      for (let i = 0; i < MEL; i++) { const xi = mel[i], base = (o * MEL + i) * 5; for (let k = 0; k < 5; k++) { const w = M.c1w[base + k], off = k - 2, lo = Math.max(0, -off), hi = Math.min(n, n - off); for (let t = lo; t < hi; t++) row[t] += w * xi[from + t + off]; } }
      for (let t = 0; t < n; t++) if (row[t] < 0) row[t] = 0;
    }
    const m = ((n - 1) >> 1) + 1;
    let x = Array.from({ length: CH }, () => new Float32Array(m));
    for (let o = 0; o < CH; o++) {
      const row = x[o]; row.fill(M.c2b[o]);
      for (let i = 0; i < CH; i++) { const xi = h1[i], base = (o * CH + i) * 3, w0 = M.c2w[base], w1 = M.c2w[base + 1], w2 = M.c2w[base + 2]; for (let t = 0; t < m; t++) { const c = 2 * t; let acc = w1 * xi[c]; if (c > 0) acc += w0 * xi[c - 1]; if (c + 1 < n) acc += w2 * xi[c + 1]; row[t] += acc; } }
      for (let t = 0; t < m; t++) if (row[t] < 0) row[t] = 0;
    }
    const hN = Array.from({ length: CH }, () => new Float32Array(m)), hD = Array.from({ length: CH }, () => new Float32Array(m));
    for (const bw of M.blocks) {
      for (let t = 0; t < m; t++) {
        let mean = 0; for (let c = 0; c < CH; c++) mean += x[c][t]; mean /= CH;
        let v = 0; for (let c = 0; c < CH; c++) { const d = x[c][t] - mean; v += d * d; }
        const inv = 1 / Math.sqrt(v / CH + 1e-5);
        for (let c = 0; c < CH; c++) hN[c][t] = (x[c][t] - mean) * inv * bw.g[c] + bw.b[c];
      }
      for (let c = 0; c < CH; c++) { const src = hN[c], dst = hD[c]; dst.fill(bw.db[c]); for (let k = 0; k < 9; k++) { const w = bw.dw[c * 9 + k], off = k - 4, lo = Math.max(0, -off), hi = Math.min(m, m - off); for (let t = lo; t < hi; t++) dst[t] += w * src[t + off]; } }
      const nx = Array.from({ length: CH }, () => new Float32Array(m));
      for (let o = 0; o < CH; o++) {
        const row = nx[o]; row.fill(bw.pb[o]);
        for (let i = 0; i < CH; i++) { const w = bw.pw[o * CH + i]; if (!w) continue; const src = hD[i]; for (let t = 0; t < m; t++) row[t] += w * src[t]; }
        const res = x[o]; for (let t = 0; t < m; t++) row[t] = (row[t] > 0 ? row[t] : 0) + res[t];
      }
      x = nx;
    }
    const out = Array.from({ length: VOCAB }, () => new Float32Array(m));
    for (let o = 0; o < VOCAB; o++) { const row = out[o]; row.fill(M.ob[o]); for (let i = 0; i < CH; i++) { const w = M.ow[o * CH + i], src = x[i]; for (let t = 0; t < m; t++) row[t] += w * src[t]; } }
    for (let t = 0; t < m; t++) { let mx = out[0][t]; for (let v = 1; v < VOCAB; v++) if (out[v][t] > mx) mx = out[v][t]; let sum = 0; for (let v = 0; v < VOCAB; v++) sum += Math.exp(out[v][t] - mx); const lse = mx + Math.log(sum); for (let v = 0; v < VOCAB; v++) out[v][t] -= lse; }
    return out;
  }
  // letter log-probabilities every 20 ms: [T][VOCAB]
  S.alignProbs = async function (pcm) {
    const M = loadModel(); if (!M) return null;
    const mel = logMel(pcm), t10 = mel[0].length; if (!t10) return [];
    const t20 = ((t10 - 1) >> 1) + 1, out = Array.from({ length: t20 }, () => new Float32Array(VOCAB));
    for (let s20 = 0; s20 < t20;) {
      const e20 = Math.min(t20, s20 + 3000), a20 = Math.max(0, s20 - 120), b20 = Math.min(t20, e20 + 120), part = forward(M, mel, a20 * 2, Math.min(t10, b20 * 2));
      for (let t = s20; t < e20; t++) for (let v = 0; v < VOCAB; v++) out[t][v] = part[v][t - a20];
      s20 = e20;
      await new Promise(r => setTimeout(r, 0));
    }
    return out;
  };
  // spelling words in the letters the model knows: Telugu by sound, numbers in words
  const V = { 'అ': 'a', 'ఆ': 'aa', 'ఇ': 'i', 'ఈ': 'ii', 'ఉ': 'u', 'ఊ': 'uu', 'ఋ': 'ra', 'ౠ': 'rra', 'ఌ': 'la', 'ఎ': 'e', 'ఏ': 'ee', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'oo', 'ఔ': 'au' };
  const K = { 'క': 'k', 'ఖ': 'kh', 'గ': 'g', 'ఘ': 'gh', 'ఙ': 'ng', 'చ': 'c', 'ఛ': 'ch', 'జ': 'j', 'ఝ': 'jh', 'ఞ': 'ny', 'ట': 'tt', 'ఠ': 'tth', 'డ': 'dd', 'ఢ': 'ddh', 'ణ': 'nn', 'త': 't', 'థ': 'th', 'ద': 'd', 'ధ': 'dh', 'న': 'n', 'ప': 'p', 'ఫ': 'ph', 'బ': 'b', 'భ': 'bh', 'మ': 'm', 'య': 'y', 'ర': 'r', 'ఱ': 'rr', 'ల': 'l', 'ళ': 'll', 'ఴ': 'lll', 'వ': 'v', 'శ': 'sh', 'ష': 'ss', 'స': 's', 'హ': 'h' };
  const SG = { 'ా': 'aa', 'ి': 'i', 'ీ': 'ii', 'ు': 'u', 'ూ': 'uu', 'ృ': 'ra', 'ౄ': 'rra', 'ె': 'e', 'ే': 'ee', 'ై': 'ai', 'ొ': 'o', 'ో': 'oo', 'ౌ': 'au' };
  const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' '), TENS = '_ _ twenty thirty forty fifty sixty seventy eighty ninety'.split(' ');
  const num = n => n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? ONES[n % 10] : '') : n < 1000 ? ONES[Math.floor(n / 100)] + 'hundred' + (n % 100 ? num(n % 100) : '') : num(Math.floor(n / 1000)) + 'thousand' + (n % 1000 ? num(n % 1000) : '');
  function roman(word) {
    const s = word.toLowerCase(); let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (K[c]) { out += K[c]; const nx = s[i + 1]; if (nx && SG[nx]) { out += SG[nx]; i++; } else if (nx === '్') i++; else out += 'a'; continue; }
      if (V[c]) out += V[c]; else if (c === 'ం') out += 'm'; else if (c === 'ః') out += 'h';
      else if (c >= '౦' && c <= '౯') out += String(c.charCodeAt(0) - 0x0C66);
      else if ((c >= 'a' && c <= 'z') || c === "'" || (c >= '0' && c <= '9')) out += c;
    }
    return out.replace(/[0-9]+/g, d => d.length <= 6 ? num(+d) : [...d].map(x => ONES[+x]).join('')).replace(/^'+|'+$/g, '');
  }
  S.romanize = roman;
  function viterbi(lp, a, b, toks) {
    const T = b - a, n = toks.length, Sn = 2 * n + 3, neg = -1e30;
    let prev = new Float32Array(Sn).fill(neg), cur = new Float32Array(Sn);
    const back = Array.from({ length: T }, () => new Uint8Array(Sn));
    const garbage = t => { const r = lp[a + t]; let m = r[0]; for (let v = 1; v < r.length; v++) if (r[v] > m) m = r[v]; return m - 1; };
    const em = (t, s, g) => s === 0 || s === Sn - 1 ? g : (s - 1) % 2 === 0 ? lp[a + t][0] : lp[a + t][toks[(s - 1) >> 1]];
    const g0 = garbage(0); prev[0] = em(0, 0, g0); prev[1] = em(0, 1, g0); prev[2] = em(0, 2, g0);
    for (let t = 1; t < T; t++) {
      const g = garbage(t), bt = back[t];
      for (let s = 0; s < Sn; s++) {
        let best = prev[s], step = 0;
        if (s >= 1 && prev[s - 1] > best) { best = prev[s - 1]; step = 1; }
        if (s >= 3 && s <= Sn - 2 && (s - 1) % 2 === 1) { const k = (s - 1) >> 1; if (k >= 1 && toks[k] !== toks[k - 1] && prev[s - 2] > best) { best = prev[s - 2]; step = 2; } }
        if (s === 2 && prev[0] > best) { best = prev[0]; step = 2; }
        if (s === Sn - 1 && prev[Sn - 3] > best) { best = prev[Sn - 3]; step = 2; }
        cur[s] = best + em(t, s, g); bt[s] = step;
      }
      const tmp = prev; prev = cur; cur = tmp;
    }
    let s = Sn - 1; if (prev[Sn - 2] > prev[s]) s = Sn - 2; if (prev[Sn - 3] > prev[s]) s = Sn - 3;
    const path = new Int32Array(T);
    for (let t = T - 1; t >= 0; t--) { path[t] = s; if (t > 0) s -= back[t][s]; }
    return path;
  }
  // a cue's word starts (ms, from the start of pcm) and the frame after its last letter, or null
  function alignCue(lp, words, startMs, endMs, prevEnd) {
    const toks = [], owner = [];
    words.forEach((w, wi) => { for (const ch of roman(w)) { const k = LABELS.indexOf(ch); if (k > 0) { toks.push(k); owner.push(wi); } } });
    if (!toks.length) return null;
    const T = lp.length, written = Math.floor(startMs / 20);
    const a = clamp(Math.max(Math.min(prevEnd, written), Math.floor((startMs - 800) / 20)), 0, T), b = Math.min(T, Math.floor((endMs + 800) / 20) + 1);
    if (b - a < toks.length + 2) return null;
    const path = viterbi(lp, a, b, toks), starts = new Array(words.length).fill(-1);
    let last = a, hit = 0;
    for (let t = 0; t < path.length; t++) { const s = path[t]; if (s >= 1 && s <= 2 * toks.length + 1 && (s - 1) % 2 === 1) { const w = owner[(s - 1) >> 1]; if (starts[w] < 0) starts[w] = Math.max(0, Math.round((a + t) * 20 - 35)); last = a + t; hit++; } }
    if (!hit) return null;
    // a word that starts after the cue is over was found in the next cue's sound: don't trust it
    for (let i = 0; i < starts.length; i++) if (starts[i] > endMs + 150) starts[i] = -1;
    const known = starts.map((v, i) => v >= 0 ? i : -1).filter(i => i >= 0);
    if (!known.length) return null;
    const n = starts.length, endAt = Math.max(endMs - 250, starts[known[known.length - 1]]);
    for (let i = 0; i < n; i++) if (starts[i] < 0) {
      const p = [...known].reverse().find(k => k < i), nn = known.find(k => k > i);
      starts[i] = p != null && nn != null ? starts[p] + Math.round((starts[nn] - starts[p]) * (i - p) / (nn - p))
        : p != null ? Math.round(starts[p] + (endAt - starts[p]) * (i - p) / (n - p)) : starts[nn];
    }
    for (let i = 1; i < starts.length; i++) if (starts[i] < starts[i - 1]) starts[i] = starts[i - 1];
    return [starts, last + 1];
  }
  // time the words of every cue whose shown words are the words spoken (offsetMs = where pcm starts in source time)
  S.alignCues = async function (cues, style, pcm, offsetMs = 0, lp = null) {
    lp = lp || await S.alignProbs(pcm);
    if (!lp) return { cues, aligned: 0 };
    let prevEnd = 0, aligned = 0;
    const out = cues.map(c => {
      const text = C.shownText(c, style), ws = C.splitWords(text), l = (c.lang || '').toLowerCase();
      const spoken = style.show === 'spoken' || !l || (style.show === 'en' && l.startsWith('en'));
      if (!ws.length || !spoken) return c;
      const r = alignCue(lp, ws, c.start - offsetMs, c.end - offsetMs, prevEnd);
      if (!r) return c;
      prevEnd = r[1]; aligned++;
      return Object.assign({}, c, { words: r[0].map(x => x + offsetMs), timedText: text });
    });
    return { cues: out, aligned, lp };
  };

  /* ── the whole job ── */
  S.transcribe = async function (o) {
    const P = (k, v) => o.onProgress && o.onProgress(k, v);
    P('sound', 0);
    const audio = await S.captionAudio(o.src);
    let cues = o.engine === 'gemini' ? await transcribeGemini(audio, o) : await transcribeLocal(audio, o);
    const off = Math.round(audio.offset * 1000);
    cues = C.clean(cues.map(c => Object.assign({}, c, { start: c.start + off, end: c.end + off, words: c.words ? c.words.map(w => w + off) : c.words })), Math.round((audio.offset + audio.duration) * 1000));
    if (!cues.length) return { cues, aligned: 0 };
    if (o.align !== false) {
      P('align', 0);
      const style = Object.assign({}, C.DEFAULT_STYLE, o.style || {});
      const r = await S.alignCues(cues, style, audio.pcm, off);
      cues = r.cues;
      // keep the sound around for re-timing after edits
      S.captionAudioCache = { src: JSON.stringify(o.src || { kind: 'mix' }), pcm: audio.pcm, off, lp: r.lp };
      return { cues, aligned: r.aligned };
    }
    return { cues, aligned: 0 };
  };
})();
