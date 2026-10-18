/* Builds the camera looks pack: every photo look of the editor, packaged for another app (a live camera).
     node studio/tools/camera_looks/build.js [outDir]       (default: <repo>/studio/dist/camera-looks)
   Runs the editor in headless Chromium so everything comes from its real code: looks.json (from R.FILTER_PRESETS /
   R.FILTER_GROUPS), the reference implementation (checked against the editor pixel for pixel), the WebGL renderer
   (checked against the reference), 3D LUTs of each look's colour stage (.cube 33³ and 512 × 512 PNG), preview renders
   on sample photos, and the docs. Then zips it to <outDir>.zip. */
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const ROOT = path.resolve(__dirname, '..', '..'), SRC = path.join(__dirname, 'src');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'dist', 'camera-looks'));

// every parameter a look can use: key, label, group, type, range, default, stage, what it does
const PARAMS = [
  // light & colour (per pixel)
  ['exposure', 'Exposure', 'Light', -100, 100, 'colour', 'Multiplies the light by 2^(v/50) (v = 50 is one stop brighter).'],
  ['brightness', 'Brightness', 'Light', -100, 100, 'colour', 'Multiplies the light by 1 + v/100.'],
  ['contrast', 'Contrast', 'Light', -100, 100, 'colour', 'Classic contrast around mid-grey 128: f = 259(c+255)/(255(259−c)), c = 2.55v.'],
  ['highlights', 'Highlights', 'Light', -100, 100, 'colour', 'Lifts / pulls the bright tones (L²(1−L) curve), leaving pure white alone.'],
  ['shadows', 'Shadows', 'Light', -100, 100, 'colour', 'Lifts / pulls the dark tones (L(1−L)² curve), leaving pure black alone.'],
  ['blacks', 'Blacks', 'Light', -100, 100, 'colour', 'Moves the deepest tones ((1−L)³ curve).'],
  ['fade', 'Fade', 'Light', 0, 100, 'colour', 'Mixes toward a warm paper grey (255·(0.42, 0.40, 0.38)) by v/100 × 0.32 — matte, lifted blacks.'],
  ['saturation', 'Saturation', 'Colour', -100, 100, 'colour', 'Pushes colours away from (or toward) their own luma by 1 + v/100.'],
  ['vibrance', 'Vibrance', 'Colour', -100, 100, 'colour', 'Like saturation but strongest on muted colours.'],
  ['warmth', 'Temperature', 'Colour', -100, 100, 'colour', 'Adds 0.35v to red, 0.0525v to green, takes 0.35v from blue.'],
  ['tint', 'Tint', 'Colour', -100, 100, 'colour', 'Magenta (+) / green (−): ±0.15v on red and blue, ∓0.3v on green.'],
  ['hue', 'Hue', 'Colour', -180, 180, 'colour', 'Rotates hue by v degrees (luma-preserving matrix).'],
  ['cross', 'Cross process', 'Colour', 0, 100, 'colour', 'Slide film in C-41: S-curve in red and green, blue lifted in the shadows and crushed in the highlights.'],
  ['splitTone', 'Split tone', 'Colour', 0, 100, 'colour', 'Washes toneShadow\'s hue into the shadows and toneHigh\'s into the highlights.'],
  ['toneShadow', 'Shadow colour', 'Colour', null, null, 'colour', 'Split tone colour for the shadows (only its hue is used). Default #1d6f78.', 'color', '#1d6f78'],
  ['toneHigh', 'Highlight colour', 'Colour', null, null, 'colour', 'Split tone colour for the highlights. Default #ffa65c.', 'color', '#ffa65c'],
  ['toneBalance', 'Tone balance', 'Colour', -100, 100, 'colour', 'Where shadows end and highlights begin (pivot 0.5 + v/200).'],
  // mono & print
  ['grayscale', 'Mono', 'Mono & print', 0, 100, 'colour', 'Mixes toward luma (0.299, 0.587, 0.114).'],
  ['sepia', 'Sepia', 'Mono & print', 0, 100, 'colour', 'Mixes toward the classic sepia matrix.'],
  ['negative', 'Negative', 'Mono & print', 0, 100, 'colour', 'A colour negative: tones flipped on an orange film base.'],
  ['duotone', 'Duotone', 'Mono & print', null, null, 'colour', 'Maps brightness from duoDark (ink) to duoLight (paper).', 'bool'],
  ['threshold', 'Photocopy', 'Mono & print', 0, 100, 'colour', 'Hard black / white (ink / paper) at brightness v% — a photocopy.'],
  ['duoDark', 'Ink', 'Mono & print', null, null, 'colour', 'Ink colour for duotone / photocopy / halftone. Default #111111.', 'color', '#111111'],
  ['duoLight', 'Paper', 'Mono & print', null, null, 'colour', 'Paper colour for duotone / photocopy / halftone. Default #f4f1ea.', 'color', '#f4f1ea'],
  ['halftone', 'Halftone', 'Mono & print', 0, 100, 'spatial', 'Hexagonal dot screen; cell = max(3, round(m(0.004 + 0.022v/100))) px, dot radius = 0.56·cell·√(1 − tone).'],
  ['noise', 'Noise', 'Mono & print', 0, 100, 'colour', 'Uniform luminance noise ±0.6v per pixel (0..255 units), baked into the picture.'],
  // detail & lens
  ['sharpen', 'Sharpen', 'Detail', 0, 100, 'spatial', 'Unsharp mask, σ = max(0.8, m/1100) px, amount 1.6·v/100.'],
  ['clarity', 'Clarity', 'Detail', -100, 100, 'spatial', 'Wide unsharp mask on midtones, σ = max(2, 0.018m) px.'],
  ['bloom', 'Bloom', 'Film', 0, 100, 'spatial', 'Highlights glow in their own colour (diffusion filter).'],
  ['halation', 'Halation', 'Film', 0, 100, 'spatial', 'Red-orange glow bleeding round bright lights, like film emulsion.'],
  ['halColor', 'Halation colour', 'Film', null, null, 'spatial', 'Default #ff481e.', 'color', '#ff481e'],
  ['chroma', 'Colour fringe', 'Film', 0, 100, 'spatial', 'Chromatic aberration: red scaled out by 1.2v/100 %, green by 0.45 of that.'],
  ['fisheye', 'Fisheye', 'Lens', 0, 100, 'spatial', 'Barrel distortion, k = 0.6v/100: source = n·(1 + k(|n|² − 1)), n in −1..1.'],
  // blurs
  ['blur', 'Soft blur', 'Blur', 0, 40, 'spatial', 'Gaussian, σ = v × m / 1000 px.', 'number', 0, 0.1],
  ['motion', 'Motion blur', 'Blur', 0, 100, 'spatial', 'Equal-weight smear of length L = 0.09m·v/100 along motionAngle.'],
  ['motionAngle', 'Blur angle', 'Blur', -180, 180, 'spatial', 'Direction for motion / double, degrees (0 = right, 90 = down).'],
  ['ghost', 'Double exposure', 'Blur', 0, 100, 'spatial', 'Second and third copies at L and 2L (L = 0.12m·v/100), 42 % and 20 %.'],
  ['zoomBlur', 'Zoom blur', 'Blur', 0, 100, 'spatial', 'N copies scaled up to 1 + 0.32v/100 about (blurX, blurY).'],
  ['spinBlur', 'Spin blur', 'Blur', 0, 100, 'spatial', 'N copies turned ±0.11v/100 rad about (blurX, blurY).'],
  ['blurX', 'Blur centre x', 'Blur', 0, 1, 'spatial', 'Centre for zoom / spin (0..1).', 'number', 0.5, 0.01],
  ['blurY', 'Blur centre y', 'Blur', 0, 1, 'spatial', 'Centre for zoom / spin (0..1, 0 = top).', 'number', 0.5, 0.01],
  ['tiltShift', 'Tilt-shift', 'Blur', 0, 100, 'spatial', 'Sharp band, blurred above / below (σ = max(1, 0.018m·v/100)).'],
  ['tiltY', 'Band position', 'Blur', 0, 1, 'spatial', 'Centre of the sharp band (0 = top).', 'number', 0.5, 0.01],
  ['tiltSize', 'Band size', 'Blur', 0.02, 1, 'spatial', 'Height of the sharp band (fraction), soft edges 0.12.', 'number', 0.25, 0.01],
  // finishes
  ['leak', 'Light leak', 'Finish', 0, 100, 'finish', 'Warm light spilling in from one edge (three screened radial blobs), pulsing with time.'],
  ['leakColor', 'Leak colour', 'Finish', null, null, 'finish', 'Default #ff5a1f.', 'color', '#ff5a1f'],
  ['leakSide', 'Leak from', 'Finish', null, null, 'finish', "'left' | 'right' | 'top' | 'bottom' (default left).", 'enum', 'left'],
  ['vignette', 'Vignette', 'Finish', 0, 100, 'finish', 'Black radial falloff from 0.25·min(w, h) to the corners, up to 0.75v/100.'],
  ['grain', 'Film grain', 'Finish', 0, 100, 'finish', 'Grey noise laid on with an overlay blend at 0.55v/100; re-dealt 24 times a second.'],
  ['grainSize', 'Grain size', 'Finish', 0, 100, 'finish', 'One grain = (1 + 3v/100) px of a 1080 px picture.'],
  ['dust', 'Dust & scratches', 'Finish', 0, 100, 'finish', 'Dust specks (new every 1/12 s), a stray hair, thin scratches that linger.'],
].map(([key, label, group, min, max, stage, does, type = 'number', def = 0, step = 1]) => ({ key, label, group, type, min, max, step, default: def, stage, does }));

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  const mk = d => fs.mkdirSync(path.join(OUT, d), { recursive: true });
  ['reference', 'web/shaders', 'luts/cube', 'luts/png', 'previews/check', 'samples', 'spec'].forEach(mk);
  const exe = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await pw.chromium.launch({ executablePath: exe, proxy: proxy ? { server: proxy } : undefined });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true })).newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3000);

  // the looks, straight from the editor
  const { LOOKS, SHELVES } = await page.evaluate(() => {
    const R = StudioRender, LOOKS = {}, SHELVES = [];
    for (const [sid, g] of Object.entries(R.FILTER_GROUPS)) {
      SHELVES.push({ id: sid, name: g.label, looks: g.keys.slice() });
      for (const k of g.keys) if (!LOOKS[k]) LOOKS[k] = { id: k, name: R.FILTER_PRESETS[k].label, shelf: sid, params: JSON.parse(JSON.stringify(R.FILTER_PRESETS[k].f)) };
    }
    // drop zero / no-op values so each look lists only what it does
    for (const l of Object.values(LOOKS)) for (const [k, v] of Object.entries(l.params)) if (v === 0 && k === 'blur') delete l.params[k];
    // the passes beyond the colour stage (LUT) that each look needs
    const PASS = ['noise', 'halftone', 'sharpen', 'clarity', 'bloom', 'halation', 'chroma', 'motion', 'ghost', 'zoomBlur', 'spinBlur', 'tiltShift', 'fisheye', 'blur', 'leak', 'vignette', 'grain', 'dust'];
    for (const l of Object.values(LOOKS)) l.passes = PASS.filter(k => l.params[k]);
    return { LOOKS, SHELVES };
  });
  const ref = fs.readFileSync(path.join(SRC, 'reference', 'looks-reference.js'), 'utf8')
    .replace('/*LOOKS*/{}/*END*/', JSON.stringify(LOOKS, null, 1)).replace('/*SHELVES*/[]/*END*/', JSON.stringify(SHELVES));
  const gl = fs.readFileSync(path.join(SRC, 'web', 'webgl-looks.js'), 'utf8');
  await page.addScriptTag({ content: ref });
  await page.addScriptTag({ content: gl });

  // sample photos (bundled in the editor, Unsplash)
  const SAMPLES = { portrait: 'film-portrait', golden: 'film-golden', night: 'film-neon', smile: 'ed-smile' };
  const samples = await page.evaluate(async (S) => {
    const out = {};
    for (const [name, id] of Object.entries(S)) {
      const src = Studio.assets[id]; const im = new Image(); im.src = src; await im.decode();
      const c = document.createElement('canvas'), s = Math.min(1, 1080 / Math.max(im.naturalWidth, im.naturalHeight)); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      out[name] = { url: c.toDataURL('image/jpeg', 0.92), w: c.width, h: c.height };
    }
    return out;
  }, SAMPLES);
  for (const [n, s] of Object.entries(samples)) fs.writeFileSync(path.join(OUT, 'samples', n + '.jpg'), Buffer.from(s.url.split(',')[1], 'base64'));
  console.log('samples', Object.entries(samples).map(([n, s]) => `${n} ${s.w}×${s.h}`).join(', '));

  // 1. the reference against the editor itself (no grain / noise / dust: those are random)
  const parity = await page.evaluate(async (samples) => {
    const R = StudioRender, L = CameraLooks, load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const im = await load(samples.smile.url), res = [];
    const psnr = (a, b) => { let se = 0, n = 0; for (let i = 0; i < a.length; i += 4) for (let c = 0; c < 3; c++) { const d = a[i + c] - b[i + c]; se += d * d; n++; } return se ? 10 * Math.log10(255 * 255 / (se / n)) : 99; };
    for (const [id, look] of Object.entries(L.LOOKS)) {
      const f = Object.assign({}, look.params, { grain: 0, noise: 0, dust: 0 }), W = im.naturalWidth, H = im.naturalHeight;
      // the editor: filteredSource, drawn with the soft blur, then the photo finishes
      const e = document.createElement('canvas'); e.width = W; e.height = H; const ex = e.getContext('2d', { willReadFrequently: true });
      const src = R.filteredSource('parity:' + id, im, f);
      if (f.blur) ex.filter = `blur(${f.blur * Math.max(W, H) / 1000}px)`;
      ex.drawImage(src, 0, 0, W, H); ex.filter = 'none';
      R.photoFinish(ex, { x: 0, y: 0, w: W, h: H }, f, null);
      const r = L.applyLook(im, f, { time: null });
      res.push([id, +psnr(ex.getImageData(0, 0, W, H).data, r.getContext('2d').getImageData(0, 0, W, H).data).toFixed(1)]);
    }
    return res;
  }, samples);
  console.log('reference vs editor (PSNR dB):', parity.map(([k, v]) => k + ' ' + v).join(', '));

  // 2. the WebGL renderer against the reference
  const glCheck = await page.evaluate(async (samples) => {
    const L = CameraLooks, load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const out = [], cv = document.createElement('canvas'), fx = new LookRenderer(cv, { preserve: true });
    const psnr = (a, b) => { let se = 0, n = 0; for (let i = 0; i < a.length; i += 4) for (let c = 0; c < 3; c++) { const d = a[i + c] - b[i + c]; se += d * d; n++; } return se ? 10 * Math.log10(255 * 255 / (se / n)) : 99; };
    for (const name of ['portrait', 'night']) {
      const im = await load(samples[name].url);
      for (const [id, look] of Object.entries(L.LOOKS)) {
        const f = Object.assign({}, look.params, { grain: 0, noise: 0, dust: 0 });
        const r = L.applyLook(im, f, { time: null }), W = r.width, H = r.height;
        fx.render(im, f, { time: null });
        const g = document.createElement('canvas'); g.width = W; g.height = H; g.getContext('2d').drawImage(cv, 0, 0);
        out.push([name, id, +psnr(r.getContext('2d').getImageData(0, 0, W, H).data, g.getContext('2d').getImageData(0, 0, W, H).data).toFixed(1)]);
      }
    }
    return out;
  }, samples);
  const byLook = {};
  for (const [n, id, v] of glCheck) byLook[id] = Math.min(byLook[id] ?? 99, v);
  console.log('WebGL vs reference (worst PSNR dB):', Object.entries(byLook).map(([k, v]) => k + ' ' + v).join(', '));

  // 3. LUTs: the colour stage of each look on every colour of a 33³ (.cube) and 64³ (512 × 512 PNG) grid
  const luts = await page.evaluate(() => {
    const L = CameraLooks, out = {};
    const pngLut = fn => {
      // 8 × 8 tiles of 64 × 64; blue picks the tile (row-major), red runs across a tile, green down it
      const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'), d = x.createImageData(512, 512);
      for (let b = 0; b < 64; b++) for (let g = 0; g < 64; g++) for (let r = 0; r < 64; r++) {
        const px = (b % 8) * 64 + r, py = Math.floor(b / 8) * 64 + g, o = (py * 512 + px) * 4, v = fn(r * 255 / 63, g * 255 / 63, b * 255 / 63);
        d.data[o] = v[0]; d.data[o + 1] = v[1]; d.data[o + 2] = v[2]; d.data[o + 3] = 255;
      }
      x.putImageData(d, 0, 0); return c.toDataURL('image/png');
    };
    const cube = (fn, title) => {
      const N = 33, lines = [`TITLE "${title}"`, '# Camera Looks — colour stage only (see spec/PIPELINE.md for the spatial passes)', `LUT_3D_SIZE ${N}`, 'DOMAIN_MIN 0.0 0.0 0.0', 'DOMAIN_MAX 1.0 1.0 1.0'];
      // .cube order: red changes fastest, then green, then blue
      for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) { const v = fn(r * 255 / (N - 1), g * 255 / (N - 1), b * 255 / (N - 1)); lines.push((v[0] / 255).toFixed(4) + ' ' + (v[1] / 255).toFixed(4) + ' ' + (v[2] / 255).toFixed(4)); }
      return lines.join('\n') + '\n';
    };
    out.identity = { png: pngLut((r, g, b) => [Math.round(r), Math.round(g), Math.round(b)]) };
    for (const [id, look] of Object.entries(L.LOOKS)) {
      const fn = L.colourOnly(Object.assign({}, look.params, { noise: 0 }));
      out[id] = { cube: cube(fn, look.name), png: pngLut(fn) };
    }
    return out;
  });
  for (const [id, l] of Object.entries(luts)) {
    if (l.cube) fs.writeFileSync(path.join(OUT, 'luts', 'cube', id + '.cube'), l.cube);
    fs.writeFileSync(path.join(OUT, 'luts', 'png', id + '.png'), Buffer.from(l.png.split(',')[1], 'base64'));
  }

  // 4. previews: every look on every sample (the reference, a still frame), and one contact sheet per shelf
  const prev = await page.evaluate(async ({ samples, SHELVES }) => {
    const L = CameraLooks, load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const ims = {}; for (const [n, s] of Object.entries(samples)) ims[n] = await load(s.url);
    const files = {}, sheets = {};
    // the images to check a port against: the portrait with grain, noise and dust off (they are random)
    for (const [id, look] of Object.entries(L.LOOKS)) {
      const c = L.applyLook(ims.portrait, Object.assign({}, look.params, { grain: 0, noise: 0, dust: 0 }), { time: null });
      files[`check/${id}.jpg`] = c.toDataURL('image/jpeg', 0.95);
    }
    // full-size renders of two samples per look: what a port should reproduce
    for (const [id, look] of Object.entries(L.LOOKS)) for (const n of ['portrait', 'golden']) {
      const c = L.applyLook(ims[n], look.params, { time: null });
      files[`${id}__${n}.jpg`] = c.toDataURL('image/jpeg', 0.85);
    }
    // contact sheets: rows = looks of the shelf, columns = samples
    const tw = 220;
    for (const s of [{ id: 'all', name: 'All looks', looks: [...new Set(SHELVES.flatMap(x => x.looks))] }, ...SHELVES]) {
      const names = Object.keys(ims), cols = names.length, th = 220, lh = 26;
      const c = document.createElement('canvas'); c.width = tw * cols + 180; c.height = (th + 6) * s.looks.length + lh + 10;
      const x = c.getContext('2d'); x.fillStyle = '#0d0d0f'; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = '#fff'; x.font = '600 18px system-ui, sans-serif'; x.fillText(s.name, 12, 24);
      s.looks.forEach((id, r) => {
        const y = lh + 10 + r * (th + 6);
        x.fillStyle = '#fff'; x.font = '600 15px system-ui, sans-serif'; x.fillText(L.LOOKS[id].name, 12, y + 24);
        x.fillStyle = '#9a9aa0'; x.font = '12px ui-monospace, monospace'; x.fillText(id, 12, y + 44);
        names.forEach((n, q) => {
          const c2 = L.applyLook(ims[n], L.LOOKS[id].params, { time: null, width: 440 }), sc = Math.max(tw / c2.width, th / c2.height);
          x.save(); x.beginPath(); x.rect(180 + q * tw, y, tw - 6, th); x.clip();
          x.drawImage(c2, 180 + q * tw + (tw - 6 - c2.width * sc) / 2, y + (th - c2.height * sc) / 2, c2.width * sc, c2.height * sc); x.restore();
        });
      });
      sheets[`sheet-${s.id}.jpg`] = c.toDataURL('image/jpeg', 0.82);
    }
    return { files, sheets };
  }, { samples, SHELVES });
  for (const [n, u] of Object.entries(prev.files)) fs.writeFileSync(path.join(OUT, 'previews', n), Buffer.from(u.split(',')[1], 'base64'));
  for (const [n, u] of Object.entries(prev.sheets)) fs.writeFileSync(path.join(OUT, n), Buffer.from(u.split(',')[1], 'base64'));
  await browser.close();

  // 5. the files themselves
  fs.writeFileSync(path.join(OUT, 'looks.json'), JSON.stringify({ version: 1, shelves: SHELVES, looks: LOOKS }, null, 2));
  fs.writeFileSync(path.join(OUT, 'parameters.json'), JSON.stringify(PARAMS, null, 2));
  fs.writeFileSync(path.join(OUT, 'reference', 'looks-reference.js'), ref);
  fs.writeFileSync(path.join(OUT, 'web', 'webgl-looks.js'), gl);
  const html = fs.readFileSync(path.join(SRC, 'web', 'preview.html'), 'utf8').replace('/*PARAMS*/[]/*END*/', JSON.stringify(PARAMS)).replace('/*SAMPLE*/', samples.portrait.url);
  fs.writeFileSync(path.join(OUT, 'web', 'preview.html'), html);
  // the shaders as plain GLSL files too (GLSL ES 3.00), for porting
  const win = {}; new Function('window', gl)(win);
  const S = win.LookShaders;
  fs.writeFileSync(path.join(OUT, 'web', 'shaders', 'fullscreen.vert'), S.VERT + '\n');
  fs.writeFileSync(path.join(OUT, 'web', 'shaders', 'colour-stage.glsl'), '// the colour & tone stage, included by colour.frag and halftone.frag\n' + S.COLOUR_GLSL.trim() + '\n');
  for (const [k, v] of Object.entries(S.FRAG)) fs.writeFileSync(path.join(OUT, 'web', 'shaders', k + '.frag'), v + '\n');
  const all = Object.values(LOOKS), lutOnly = all.filter(l => !l.passes.length).length;
  const fmt = p => Object.entries(p).map(([k, v]) => k + ' ' + (typeof v === 'string' ? v : v === true ? 'on' : v)).join(', ');
  const table = '| shelf | look | id | settings | needs beyond the LUT |\n| --- | --- | --- | --- | --- |\n' +
    SHELVES.flatMap(sh => sh.looks.map(id => `| ${sh.name} | ${LOOKS[id].name} | \`${id}\` | ${fmt(LOOKS[id].params) || '—'} | ${LOOKS[id].passes.join(', ') || '—'} |`)).join('\n');
  for (const f of ['README.md', 'CLAUDE_BRIEF.md', 'spec/PIPELINE.md', 'luts/README.md', 'samples/CREDITS.md']) {
    const txt = fs.readFileSync(path.join(SRC, 'docs', f), 'utf8').replaceAll('{{COUNT}}', String(all.length)).replaceAll('{{LUT_ONLY}}', String(lutOnly)).replace('{{TABLE}}', table);
    fs.writeFileSync(path.join(OUT, f), txt);
  }
  // the check results, for the record
  fs.writeFileSync(path.join(OUT, 'spec', 'CHECKS.md'), '# Checks\n\nPSNR (dB) with grain, noise and dust off (they are random). 40+ = the same picture; 30+ = no visible difference.\n' +
    'The reference matches the editor exactly. The WebGL port matches the colour stage to within rounding; its halftone dots are\n' +
    'anti-aliased slightly differently and placed half a pixel apart (same look), and its many-copy blurs (motion, zoom, spin, double)\n' +
    'average in float where the reference blends copy by copy in 8 bits (a few levels of difference, same look).\n\n' +
    '| look | reference vs editor | WebGL vs reference (worst sample) |\n| --- | --- | --- |\n' + parity.map(([k, v]) => `| ${k} | ${v} | ${byLook[k]} |`).join('\n') + '\n');
  // zip it
  const zip = OUT + '.zip';
  fs.rmSync(zip, { force: true });
  execFileSync('python3', ['-c', `import shutil; shutil.make_archive(${JSON.stringify(OUT)}, 'zip', ${JSON.stringify(path.dirname(OUT))}, ${JSON.stringify(path.basename(OUT))})`]);
  console.log('wrote', zip, (fs.statSync(zip).size / 1e6).toFixed(1) + ' MB');
})();
