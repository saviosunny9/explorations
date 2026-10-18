/* Camera looks — reference implementation (ground truth).
   The exact code the editor uses for its photo looks, lifted out of render.js into one dependency-free file. It runs in
   any browser (Canvas 2D + ImageData), so it is slow-ish (CPU) — use it to check a port, not to run a live camera.

     const out = CameraLooks.applyLook(sourceImageOrCanvasOrVideo, 'gold', { time: 0, width: 1080 });
     // out is a <canvas>. `look` can be a look id from LOOKS or a params object.

   Order of work (see spec/PIPELINE.md):
     1. colour & tone, per pixel (colourPixel) — exposure/brightness, contrast, highlights/shadows/blacks, saturation,
        vibrance, hue, warmth, tint, cross process, split tone, mono, sepia, negative, fade, duotone / photocopy, noise
     2. spatial passes on the graded picture — halftone, sharpen + clarity, bloom, halation, colour fringe, motion blur,
        double exposure, zoom blur, spin blur, tilt-shift, fisheye
     3. soft blur while drawing (blur)
     4. finishes drawn on top — light leak, vignette, film grain, dust & scratches (these move with `time`)
   Sizes are relative to the picture (the long side, `m`), so a look reads the same at any resolution. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  // '#rrggbb' / '#rgb' → [r, g, b] (0..255)
  function hexRgb(c) { c = String(c || '#000').replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); const n = parseInt(c.slice(0, 6), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const iwOf = s => s.videoWidth || s.naturalWidth || s.width;
  const ihOf = s => s.videoHeight || s.naturalHeight || s.height;

  /* ── 1. colour & tone ── */
  // everything that depends only on the pixel's own colour, worked out once per look (colourStage(f) → fn(r, g, b, out))
  // values stay unclamped from step to step; only the final write is clamped to 0..255 and rounded
  function colourStage(f) {
    const br = (1 + (f.brightness || 0) / 100) * Math.pow(2, (f.exposure || 0) / 50);
    const cv = (f.contrast || 0) * 2.55, cf = (259 * (cv + 255)) / (255 * (259 - cv));
    const sat = 1 + (f.saturation || 0) / 100;
    const wa = (f.warmth || 0) * 0.35;
    const fade = (f.fade || 0) / 100 * 0.32;
    const gs = (f.grayscale || 0) / 100, sp = (f.sepia || 0) / 100;
    const twoTone = f.duotone || f.threshold;
    const dk = twoTone ? hexRgb(f.duoDark || '#111111') : null, lt = twoTone ? hexRgb(f.duoLight || '#f4f1ea') : null;
    const thr = (f.threshold || 0) / 100 * 255;
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
    const sc = v => { const x = clamp(v / 255, 0, 1); return 255 * (x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x)); };
    // out = [r, g, b, tone]; tone = brightness before duotone (what the halftone dots are sized by)
    return function (r, g, b, out) {
      r *= br; g *= br; b *= br;
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
      out[3] = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0, 1);
      if (twoTone) {
        let t = out[3];
        if (f.threshold) t = t * 255 > thr ? 1 : 0;
        r = dk[0] + (lt[0] - dk[0]) * t; g = dk[1] + (lt[1] - dk[1]) * t; b = dk[2] + (lt[2] - dk[2]) * t;
      }
      out[0] = r; out[1] = g; out[2] = b;
      return out;
    };
  }

  /* ── 2. spatial passes (each takes and returns a canvas) ── */
  // print-style dot screen: one dot per cell, sized by how dark the cell is (hexagonal grid, rows 0.866 cell apart)
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
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(src, 0, 0);
    return o;
  }
  // sharpen (fine detail) and clarity (midtone punch) are both unsharp masks: the photo pushed away from a blurred copy
  function unsharp(src, sharpen, clarity) {
    const w = src.width, h = src.height, m = Math.max(w, h);
    const sx = canvas(w, h).getContext('2d', { willReadFrequently: true });
    sx.drawImage(src, 0, 0);
    const D = sx.getImageData(0, 0, w, h);
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
  // bloom: highlights glow softly in their own colour, like a diffusion filter on the lens
  function bloom(src, amt) {
    const w = src.width, h = src.height, k = clamp(amt / 100, 0, 1);
    const sc = Math.min(1, 640 / Math.max(w, h)), sw = Math.max(1, Math.round(w * sc)), sh = Math.max(1, Math.round(h * sc));
    const small = canvas(sw, sh), sx = small.getContext('2d', { willReadFrequently: true });
    sx.drawImage(src, 0, 0, sw, sh);
    const d = sx.getImageData(0, 0, sw, sh);
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
  // halation: on film, bright light bleeds through the emulsion as a red-orange glow around highlights
  function halation(src, amt, color) {
    const hc = color ? hexRgb(color) : [255, 72, 30];
    const w = src.width, h = src.height, k = clamp(amt / 100, 0, 1);
    const sc = Math.min(1, 800 / Math.max(w, h)), sw = Math.max(1, Math.round(w * sc)), sh = Math.max(1, Math.round(h * sc));
    const small = canvas(sw, sh), sx = small.getContext('2d', { willReadFrequently: true });
    sx.drawImage(src, 0, 0, sw, sh);
    const d = sx.getImageData(0, 0, sw, sh);
    const a = d.data, thr = 255 * (0.72 - k * 0.2);
    for (let i = 0; i < a.length; i += 4) {
      const l = Math.max(a[i], a[i + 1], a[i + 2]) * 0.6 + (0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]) * 0.4;
      const v = Math.pow(clamp((l - thr) / (255 - thr), 0, 1), 0.8);
      a[i] = hc[0] * v; a[i + 1] = hc[1] * v; a[i + 2] = hc[2] * v; a[i + 3] = 255;
    }
    sx.putImageData(d, 0, 0);
    // the highlight mask blurred into a tight halo and a wider bloom; drawing it onto itself `gain - 1` times
    // ('lighter') doubles it each time, so small lights still glow
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
  // directional blur: the photo averaged with copies of itself slid along the angle (N equal-weight samples)
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
  // double exposure: a faint second (and third) copy slid along the direction
  function ghostBlur(src, amt, angle) {
    const w = src.width, h = src.height, o = canvas(w, h), x = o.getContext('2d');
    const L = Math.max(w, h) * amt / 100 * 0.12, a = angle * Math.PI / 180;
    x.drawImage(src, 0, 0);
    x.globalAlpha = 0.42; x.drawImage(src, Math.cos(a) * L, Math.sin(a) * L);
    x.globalAlpha = 0.2; x.drawImage(src, Math.cos(a) * L * 2, Math.sin(a) * L * 2);
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
  // fisheye: barrel distortion, f = 1 + k (r² − 1) in −1..1 coordinates (corners outside the picture stay empty)
  function barrel(src, amt) {
    const w = src.width, h = src.height;
    const sc = canvas(w, h).getContext('2d', { willReadFrequently: true });
    sc.drawImage(src, 0, 0);
    const si = sc.getImageData(0, 0, w, h);
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

  /* ── 4. finishes ── */
  // film grain: a 256 × 256 tile of grey noise (seeded) laid over the picture with an 'overlay' blend at amount × 0.55;
  // each frame the tile is shifted to a new random offset so it dances. One grain = grainScale px at a 1080 px picture.
  let grainTex = null;
  function grainTile() {
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
  const grainScale = v => 1 + clamp(v || 0, 0, 100) / 100 * 3;
  function grain(ctx, amount, w, h, scale, frame) {
    const pat = ctx.createPattern(grainTile(), 'repeat');
    if (frame != null) { const r = rng(frame * 2654435761 + 17); pat.setTransform(new DOMMatrix().scale(scale).translate(Math.floor(r() * 256), Math.floor(r() * 256))); }
    else if (scale !== 1) pat.setTransform(new DOMMatrix().scale(scale));
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha *= clamp(amount / 100, 0, 1) * 0.55;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  // light leak: warm light spilling in from one edge — three soft radial blobs screened on, gently pulsing over time
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
  function finishes(ctx, w, h, f, t) {
    if (f.leak) lightLeak(ctx, w, h, f.leak, f.leakColor, f.leakSide || 'left', t);
    if (f.vignette) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${f.vignette / 100 * 0.75})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    // grain is sized against a 1080 px picture (the editor's design pixels)
    if (f.grain) grain(ctx, f.grain, w, h, grainScale(f.grainSize) * Math.min(w, h) / 1080, t != null ? Math.floor(t * 24) : null);
    if (f.dust) dustScratches(ctx, w, h, f.dust, t != null ? Math.floor(t * 12) : null, 5);
  }

  /* ── the whole look ── */
  // source: image / canvas / video frame. opts: { time (s, null = a still frame), width (output width, default source) }
  function applyLook(source, look, opts = {}) {
    const f = typeof look === 'string' ? (LOOKS[look] || {}).params || {} : look || {};
    const sw = iwOf(source), sh = ihOf(source), W = Math.round(opts.width || sw), H = Math.round(W * sh / sw);
    const c = canvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(source, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H), a = d.data, px = colourStage(f), o = [0, 0, 0, 0];
    const tone = f.halftone ? new Float32Array(W * H) : null;
    // luminance noise is baked into the pixels (one xorshift stream per picture)
    const nz = (f.noise || 0) / 100 * 120;
    let seed = 0x9e3779b9;
    for (let i = 0; i < a.length; i += 4) {
      px(a[i], a[i + 1], a[i + 2], o);
      let r = o[0], g = o[1], b = o[2];
      if (tone) tone[i >> 2] = o[3];
      if (nz) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; const n = ((seed >>> 0) / 4294967296 - 0.5) * nz; r += n; g += n; b += n; }
      a[i] = r; a[i + 1] = g; a[i + 2] = b;
    }
    x.putImageData(d, 0, 0);
    let out = c;
    if (f.halftone) out = halftone(c, tone, f);
    if (f.sharpen || f.clarity) out = unsharp(out, f.sharpen || 0, f.clarity || 0);
    if (f.bloom) out = bloom(out, f.bloom);
    if (f.halation) out = halation(out, f.halation, f.halColor);
    if (f.chroma) out = chromaAb(out, f.chroma);
    if (f.motion) out = motionBlur(out, f.motion, f.motionAngle || 0);
    if (f.ghost) out = ghostBlur(out, f.ghost, f.motionAngle || 0);
    if (f.zoomBlur) out = radialBlur(out, f.zoomBlur, f.blurX ?? 0.5, f.blurY ?? 0.5, 'zoom');
    if (f.spinBlur) out = radialBlur(out, f.spinBlur, f.blurX ?? 0.5, f.blurY ?? 0.5, 'spin');
    if (f.tiltShift) out = tiltShift(out, f.tiltShift, f.tiltY ?? 0.5, f.tiltSize ?? 0.25);
    if (f.fisheye) out = barrel(out, f.fisheye);
    // soft blur and the finishes, drawn onto the result
    const res = canvas(W, H), rx = res.getContext('2d');
    if (f.blur) rx.filter = `blur(${f.blur * Math.max(W, H) / 1000}px)`;
    rx.drawImage(out, 0, 0);
    rx.filter = 'none';
    finishes(rx, W, H, f, opts.time ?? null);
    return res;
  }
  // the colour part alone, for baking LUTs: (r, g, b) 0..255 → [r, g, b] 0..255, clamped
  function colourOnly(look) {
    const f = typeof look === 'string' ? (LOOKS[look] || {}).params || {} : look || {}, px = colourStage(f), o = [0, 0, 0, 0];
    return (r, g, b) => { px(r, g, b, o); return [clamp(Math.round(o[0]), 0, 255), clamp(Math.round(o[1]), 0, 255), clamp(Math.round(o[2]), 0, 255)]; };
  }

  const LOOKS = /*LOOKS*/{}/*END*/;
  const SHELVES = /*SHELVES*/[]/*END*/;
  root.CameraLooks = { LOOKS, SHELVES, applyLook, colourStage, colourOnly, hexRgb, rng };
})(typeof window !== 'undefined' ? window : globalThis);
