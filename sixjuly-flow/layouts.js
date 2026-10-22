/* Sixjuly Flow — extra layouts.
   Each entry in LAYOUTS draws one slide kind into the visual area; COVERS holds the cover treatments (annotated title,
   CRT collage, numbered serif cover). Everything is painted with canvas 2D from brand colours, so no stock art is needed;
   slots that can take a photo use the Images node first and fall back to generated art. */
(function () {
  'use strict';
  const R = window.SixjulyRender, U = R.U, FAM = R.FAM;
  const { rr, setFont, layoutRich, fitRich, fitLine, clamp, lerp, TAU, plain, mix } = U;
  const L = R.LAYOUTS, CV = R.COVERS;

  const rnd = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const up = s => String(s == null ? '' : s).toUpperCase();
  const darker = (c, k) => mix(c, '#000000', k);

  function wrap(ctx, text, maxW) {
    const out = []; let line = '';
    String(text).split(/\n/).forEach(par => {
      line = '';
      par.split(/\s+/).forEach(w => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
      out.push(line);
    });
    return out;
  }
  function textBlock(ctx, text, x, y, maxW, lh, align) {
    const lines = wrap(ctx, text, maxW); ctx.textAlign = align || 'left';
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh)); ctx.textAlign = 'left'; return lines.length;
  }
  const pic = (slide, i) => { const id = slide.imgs && slide.imgs[i]; const im = id && R.imgs.get(id); return im && im.complete && im.naturalWidth ? im : null; };
  function drawPic(ctx, im, x, y, w, h, r) {
    ctx.save(); rr(ctx, x, y, w, h, r || 0); ctx.clip();
    const k = Math.max(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * k, ih = im.naturalHeight * k;
    ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); ctx.restore();
  }

  // ---- generated stand-ins for photos / work screenshots ---------------------------------------------------------------------------------------
  function word(ctx, text, x, y, w, h, o) {
    o = o || {}; const fam = o.fam || FAM.cond; let s = o.size || h * 0.5;
    ctx.font = `${o.weight || 400} ${s}px ${fam}`; if ('letterSpacing' in ctx) ctx.letterSpacing = (o.track || 0) * s + 'px';
    while (ctx.measureText(text).width > w && s > 10) { s -= 2; ctx.font = `${o.weight || 400} ${s}px ${fam}`; if ('letterSpacing' in ctx) ctx.letterSpacing = (o.track || 0) * s + 'px'; }
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = o.align || 'left'; ctx.fillText(text, o.align === 'center' ? x + w / 2 : x, y + s * 0.82); ctx.textAlign = 'left'; return s;
  }
  const PH = {
    type(ctx, x, y, w, h, c, sd, wd, b) {      // colour block with a giant condensed word
      ctx.fillStyle = c.bg; ctx.fillRect(x, y, w, h); ctx.fillStyle = c.ink; word(ctx, up(wd), x + w * 0.06, y + h * 0.1, w * 0.88, h * 0.5, { size: h * 0.62 });
      ctx.fillStyle = c.ink; ctx.globalAlpha = 0.5; for (let i = 0; i < 3; i++) ctx.fillRect(x + w * 0.06, y + h * (0.62 + i * 0.07), w * (0.5 - i * 0.1), Math.max(3, h * 0.012)); ctx.globalAlpha = 1;
    },
    oval(ctx, x, y, w, h, c, sd, wd, b) {      // lilac card with a glossy ellipse and a word
      ctx.fillStyle = c.bg; ctx.fillRect(x, y, w, h);
      ctx.save(); ctx.translate(x + w * 0.55, y + h * 0.62); ctx.rotate(-0.5); const g = ctx.createLinearGradient(-w * 0.3, -h * 0.2, w * 0.3, h * 0.2); g.addColorStop(0, c.a || '#F7B3E0'); g.addColorStop(1, c.b || '#5B3BD6');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.46, h * 0.2, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.fillStyle = c.ink; word(ctx, up(wd), x + w * 0.5, y + h * 0.08, w * 0.5, h * 0.3, { size: h * 0.3 });
    },
    mosaic(ctx, x, y, w, h, c, sd) {           // dense collage of small tiles
      ctx.fillStyle = c.bg; ctx.fillRect(x, y, w, h); const r = rnd(sd), cols = 6, rows = 4, tw = (w - 24) / cols, th = (h - 24) / rows;
      const pal = ['#F4F1EA', '#2D292A', '#B7A8FF', '#FCD94B', '#FFFFFF', '#6F83F3', '#121212'];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = r(); if (k < 0.12) continue; ctx.save(); ctx.translate(x + 12 + i * tw + tw / 2, y + 12 + j * th + th / 2); ctx.rotate((r() - 0.5) * 0.4);
        ctx.fillStyle = pal[Math.floor(r() * pal.length)]; rr(ctx, -tw * 0.46, -th * 0.46, tw * 0.92, th * 0.92, 6); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc((r() - 0.5) * tw * 0.4, (r() - 0.5) * th * 0.4, Math.min(tw, th) * 0.2, 0, TAU); ctx.fill(); ctx.restore();
      }
    },
    bokeh(ctx, x, y, w, h, c, sd) {            // warm festive blur
      const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#FFC94A'); g.addColorStop(0.5, '#FF7A2F'); g.addColorStop(1, '#C23B6A'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      const r = rnd(sd); ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      for (let i = 0; i < 26; i++) { const cx = x + r() * w, cy = y + r() * h, rad = (0.04 + r() * 0.14) * w; const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad); rg.addColorStop(0, `rgba(255,${200 + r() * 55 | 0},${120 + r() * 100 | 0},${0.55 + r() * 0.3})`); rg.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
    poster(ctx, x, y, w, h, c, sd, wd) {       // quiet typographic poster
      ctx.fillStyle = c.bg; ctx.fillRect(x, y, w, h); ctx.fillStyle = c.ink; word(ctx, up(wd), x + w * 0.08, y + h * 0.06, w * 0.84, h * 0.2, { size: h * 0.16, fam: FAM.cond });
      ctx.globalAlpha = 0.6; for (let i = 0; i < 4; i++) ctx.fillRect(x + w * 0.08, y + h * (0.72 + i * 0.05), w * (0.7 - (i % 2) * 0.25), Math.max(3, h * 0.012)); ctx.globalAlpha = 1;
      ctx.fillStyle = c.a || c.ink; ctx.beginPath(); ctx.arc(x + w * 0.62, y + h * 0.48, w * 0.22, 0, TAU); ctx.fill();
    },
  };
  function card(ctx, scene, i, x, y, w, h, kind, c, wd, r) {
    const im = pic(scene.slide, i);
    if (im) drawPic(ctx, im, x, y, w, h, r || 0);
    else { ctx.save(); rr(ctx, x, y, w, h, r || 0); ctx.clip(); (PH[kind] || PH.type)(ctx, x, y, w, h, c, hash(plain(scene.slide.head || '') + i), wd, scene.brand); ctx.restore(); }
  }
  const monoLabel = (ctx, text, x, y, color, th, size, maxW) => {
    size = size || 27; setFont(ctx, null, 700, size, 0.02, FAM.mono); const lines = wrap(ctx, up(text), maxW || 300), lh = size * 1.18; let w = 0;
    lines.forEach(l => (w = Math.max(w, ctx.measureText(l).width)));
    const bw = w + 30, bh = lines.length * lh + 24;
    ctx.fillStyle = th.dark ? '#1b1b1b' : '#fff'; ctx.fillRect(x, y, bw, bh); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = th.dark ? '#fff' : '#121212'; ctx.textBaseline = 'alphabetic'; lines.forEach((l, k) => ctx.fillText(l, x + 15, y + 12 + size * 0.86 + k * lh));
    return { w: bw, h: bh };
  };
  const handle = (ctx, x, y, color, s) => { ctx.fillStyle = color; ctx.fillRect(x - (s || 10), y - (s || 10), (s || 10) * 2, (s || 10) * 2); };

  // ---- illustrations -----------------------------------------------------------------------------------------------------------------------------
  const ART = {
    retro(ctx, x, y, s, th, b) {               // retro computer on an orange grid
      const o = b.orange, v = b.violet, ink = '#121212', pw = s, ph = s * 0.92;
      ctx.save(); ctx.fillStyle = th.dark ? '#1b1b1b' : '#fff'; ctx.fillRect(x, y, pw, ph);
      ctx.strokeStyle = o; ctx.lineWidth = 1.6; const st = pw / 12; ctx.beginPath();
      for (let i = 0; i <= 12; i++) { ctx.moveTo(x + i * st, y); ctx.lineTo(x + i * st, y + ph); } for (let j = 0; j * st <= ph; j++) { ctx.moveTo(x, y + j * st); ctx.lineTo(x + pw, y + j * st); } ctx.stroke();
      ctx.fillStyle = o; [[0, 0], [2, 0], [10, 3], [0, 3], [11, 0], [0, 8], [11, 8], [10, 10], [5, 10], [11, 5]].forEach(([i, j]) => ctx.fillRect(x + i * st, y + j * st, st, st));
      ctx.fillStyle = '#D9CCFF'; ctx.fillRect(x + 3 * st, y + 6 * st, st * 0.5, st * 0.5); ctx.fillRect(x + st * 0.1, y + 9.2 * st, st * 0.5, st * 0.5);
      ctx.fillStyle = v; ctx.fillRect(x + 9 * st, y + st * 0.4, st * 1.5, st * 1.5); ctx.fillStyle = '#fff'; const sx = x + 9.75 * st, sy = y + 1.15 * st; ctx.beginPath(); ctx.moveTo(sx, sy - st * 0.5); ctx.quadraticCurveTo(sx, sy, sx + st * 0.5, sy); ctx.quadraticCurveTo(sx, sy, sx, sy + st * 0.5); ctx.quadraticCurveTo(sx, sy, sx - st * 0.5, sy); ctx.quadraticCurveTo(sx, sy, sx, sy - st * 0.5); ctx.fill();
      // hourglass
      ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.fillStyle = ink; const hx = x + 0.9 * st, hy = y + 1.1 * st; ctx.fillRect(hx - st * 0.5, hy - st * 0.6, st * 1.3, 5); ctx.fillRect(hx - st * 0.5, hy + st * 1.2, st * 1.3, 5);
      ctx.beginPath(); ctx.moveTo(hx - st * 0.35, hy - st * 0.5); ctx.lineTo(hx + st * 0.5, hy - st * 0.5); ctx.lineTo(hx + st * 0.08, hy + st * 0.3); ctx.lineTo(hx + st * 0.5, hy + st * 1.15); ctx.lineTo(hx - st * 0.35, hy + st * 1.15); ctx.lineTo(hx + st * 0.08, hy + st * 0.3); ctx.closePath(); ctx.stroke();
      // monitor
      const mx = x + 2.2 * st, my = y + 1.6 * st, mw = 6.4 * st, mh = 5 * st;
      ctx.fillStyle = v; rr(ctx, mx - st * 0.5, my + st * 0.5, mw, mh, 16); ctx.fill();
      ctx.fillStyle = '#F2ECDF'; ctx.strokeStyle = ink; ctx.lineWidth = 4; rr(ctx, mx, my, mw, mh, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; rr(ctx, mx + st * 0.6, my + st * 0.5, mw - st * 1.2, mh - st * 1.3, 10); ctx.fill();
      [o, '#FCD94B', v].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(mx + st * 1.1 + i * st * 0.38, my + st * 0.95, st * 0.12, 0, TAU); ctx.fill(); });
      ctx.fillStyle = '#FCD94B'; rr(ctx, mx + st * 1, my + st * 1.9, st * 1.5, st * 1.1, 6); ctx.fill(); ctx.fillRect(mx + st * 1, my + st * 1.75, st * 0.6, st * 0.2);
      ctx.strokeStyle = o; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx + st * 2.5, my + st * 2.6); ctx.lineTo(mx + st * 3.5, my + st * 2.3); ctx.stroke();
      ctx.fillStyle = v; ctx.beginPath(); ctx.arc(mx + st * 4.2, my + st * 2.4, st * 0.62, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx + st * 4.0, my + st * 2.25, st * 0.18, 0, TAU); ctx.arc(mx + st * 4.55, my + st * 2.55, st * 0.25, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(mx + st * 4, my + mh - st * 1.1); ctx.lineTo(mx + st * 5, my + mh - st * 1.1); ctx.stroke();
      // base + keyboard
      ctx.fillStyle = '#F2ECDF'; ctx.strokeStyle = ink; ctx.lineWidth = 4; rr(ctx, mx - st * 0.2, my + mh, mw + st * 0.4, st * 0.8, 8); ctx.fill(); ctx.stroke();
      const kx = x + 1.8 * st, ky = y + 7.4 * st, kw = 7.4 * st, kh = 2.4 * st;
      ctx.fillStyle = v; ctx.beginPath(); ctx.moveTo(kx, ky + kh); ctx.lineTo(kx + kw * 0.08, ky); ctx.lineTo(kx + kw, ky); ctx.lineTo(kx + kw * 0.92, ky + kh); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; for (let r2 = 0; r2 < 3; r2++) for (let i = 0; i < 13; i++) { const f = r2 / 3, px = kx + kw * (0.08 - 0.08 * f * 0.5) + kw * 0.07 + i * (kw * 0.066); ctx.fillRect(px + r2 * 5, ky + st * (0.25 + r2 * 0.52), kw * 0.045, st * 0.3); }
      ctx.fillStyle = o; ctx.fillRect(kx + kw * 0.25, ky + kh - st * 0.62, kw * 0.5, st * 0.28);
      // cursor + cable
      ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 3.5; const cx = x + 9.2 * st, cy = y + 4.4 * st; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + st * 1.7); ctx.lineTo(cx + st * 0.45, cy + st * 1.3); ctx.lineTo(cx + st * 0.85, cy + st * 2.1); ctx.lineTo(cx + st * 1.15, cy + st * 1.95); ctx.lineTo(cx + st * 0.8, cy + st * 1.2); ctx.lineTo(cx + st * 1.35, cy + st * 1.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + mw * 0.7, my + mh + st * 0.8); ctx.bezierCurveTo(mx + mw * 1.2, ky + st * 0.6, x + 10 * st, ky + st * 1.5, x + 10.6 * st, ky + st * 0.4); ctx.stroke();
      ctx.restore();
    },
    browser(ctx, x, y, s, th, b) {             // browser window with a hero
      const w = s, h = s * 0.74, ink = '#121212';
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20; ctx.fillStyle = th.dark ? '#1f1f23' : '#fff'; rr(ctx, x, y, w, h, 26); ctx.fill(); ctx.restore();
      ctx.strokeStyle = th.dark ? '#444' : ink; ctx.lineWidth = 3.5; rr(ctx, x, y, w, h, 26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + 70); ctx.lineTo(x + w, y + 70); ctx.stroke();
      [b.orange, b.yellow, b.violet].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 40 + i * 32, y + 35, 10, 0, TAU); ctx.fill(); });
      ctx.fillStyle = th.dark ? '#2b2b30' : '#F1EEE7'; rr(ctx, x + 170, y + 18, w - 230, 36, 18); ctx.fill();
      const hy = y + 100; ctx.fillStyle = b.violet; rr(ctx, x + 36, hy, w * 0.52, h - 160, 20); ctx.fill();
      ctx.fillStyle = '#fff'; setFont(ctx, b, 800, w * 0.13, -0.04); ctx.fillText('Aa', x + 66, hy + w * 0.13 + 14);
      ctx.fillStyle = b.yellow; ctx.beginPath(); ctx.arc(x + 36 + w * 0.52 - 70, hy + 80, 40, 0, TAU); ctx.fill();
      ctx.fillStyle = th.dark ? '#555' : '#D8D3C6'; for (let i = 0; i < 4; i++) rr(ctx, x + w * 0.6 + 6, hy + i * 46, w * (0.3 - (i % 2) * 0.08), 18, 9), ctx.fill();
      ctx.fillStyle = b.orange; rr(ctx, x + w * 0.6 + 6, hy + 4 * 46 + 10, 150, 52, 26); ctx.fill();
    },
    phone(ctx, x, y, s, th, b) {               // phone with a card list
      const w = s * 0.5, h = s * 0.98, px = x + (s - w) / 2, ink = '#121212';
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20; ctx.fillStyle = ink; rr(ctx, px, y, w, h, 56); ctx.fill(); ctx.restore();
      ctx.fillStyle = th.dark ? '#26262b' : '#fff'; rr(ctx, px + 14, y + 14, w - 28, h - 28, 44); ctx.fill();
      ctx.fillStyle = ink; rr(ctx, px + w / 2 - 44, y + 26, 88, 24, 12); ctx.fill();
      ctx.fillStyle = b.violet; rr(ctx, px + 36, y + 80, w - 72, h * 0.22, 26); ctx.fill(); ctx.fillStyle = '#fff'; setFont(ctx, b, 700, w * 0.1, -0.02); ctx.fillText('Hello', px + 58, y + 80 + h * 0.22 - 36);
      [b.orange, b.yellow, b.periwinkle].forEach((c, i) => { const yy = y + 80 + h * 0.22 + 30 + i * 96; ctx.fillStyle = th.dark ? '#34343a' : '#F3F1EC'; rr(ctx, px + 36, yy, w - 72, 78, 20); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px + 78, yy + 39, 20, 0, TAU); ctx.fill(); ctx.fillStyle = th.dark ? '#666' : '#CFCABD'; rr(ctx, px + 116, yy + 22, w * 0.4, 14, 7); ctx.fill(); rr(ctx, px + 116, yy + 46, w * 0.28, 12, 6); ctx.fill(); });
      ctx.fillStyle = b.orange; rr(ctx, px + 36, y + h - 130, w - 72, 70, 35); ctx.fill();
    },
    crt(ctx, x, y, s, th, b) {                 // torn-paper collage with a glitching CRT
      const r = rnd(7); ctx.save();
      ctx.fillStyle = '#E6DDC9'; ctx.beginPath(); const n = 34, cx = x + s * 0.5, cy = y + s * 0.55;
      for (let i = 0; i < n; i++) { const a = i / n * TAU, rad = s * (0.5 + (r() - 0.5) * 0.16) * (1 + 0.1 * Math.sin(a * 3)); const px = cx + Math.cos(a) * rad * 1.05, py = cy + Math.sin(a) * rad * 0.95; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#17171a'; ctx.beginPath(); ctx.moveTo(x + s * 0.02, y + s * 0.5); ctx.lineTo(x + s * 0.22, y + s * 0.42); ctx.lineTo(x + s * 0.3, y + s * 0.62); ctx.lineTo(x + s * 0.12, y + s * 0.78); ctx.lineTo(x - s * 0.02, y + s * 0.68); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(x, y + s * (0.42 + i * 0.05)); ctx.lineTo(x + s * 0.3, y + s * (0.42 + i * 0.05)); ctx.stroke(); }
      const mx = x + s * 0.16, my = y + s * 0.12, mw = s * 0.82, mh = s * 0.64;
      const g = ctx.createLinearGradient(mx, my, mx + mw, my + mh); g.addColorStop(0, '#D4D4D2'); g.addColorStop(1, '#7E7E7C');
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 18; ctx.fillStyle = g; rr(ctx, mx, my, mw, mh, 34); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#3a3a3a'; rr(ctx, mx + mw * 0.05, my + mh * 0.06, mw * 0.9, mh * 0.82, 24); ctx.fill();
      ctx.fillStyle = '#0b0b0c'; rr(ctx, mx + mw * 0.09, my + mh * 0.1, mw * 0.82, mh * 0.74, 18); ctx.fill();
      const gx = mx + mw * 0.5, gy = my + mh * 0.47, gr = mh * 0.31; ctx.strokeStyle = '#EDEDED'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.stroke(); for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(gx, gy, gr, gr * Math.abs(i) / 2.6 + 2, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(gx, gy, Math.abs(i) * gr / 2.6 + 2, gr, 0, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#F4F4F4'; for (let i = 0; i < 9; i++) { const bw = gr * (0.5 + r() * 1.3), by = my + mh * (0.16 + r() * 0.62), bx = mx + mw * (0.12 + r() * 0.5); ctx.fillRect(bx, by, bw, 5 + r() * 9); }
      ctx.fillStyle = 'rgba(255,255,255,.06)'; for (let yy = my + mh * 0.1; yy < my + mh * 0.84; yy += 7) ctx.fillRect(mx + mw * 0.09, yy, mw * 0.82, 2);
      ctx.fillStyle = '#9a9a98'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(mx + mw * (0.6 + i * 0.05), my + mh * 0.93, 5, 0, TAU); ctx.fill(); } ctx.fillStyle = '#222'; ctx.fillRect(mx + mw * 0.85, my + mh * 0.9, mw * 0.06, mh * 0.06);
      ctx.fillStyle = '#5c5c5a'; ctx.beginPath(); ctx.moveTo(mx + mw * 0.25, my + mh); ctx.lineTo(mx + mw * 0.75, my + mh); ctx.lineTo(mx + mw * 0.85, my + mh * 1.14); ctx.lineTo(mx + mw * 0.15, my + mh * 1.14); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
  };
  R.ART = ART;

  // ---- layouts -------------------------------------------------------------------------------------------------------------------------------------
  L.art = (scene, add, vis) => {
    const s = Math.min(vis.w, vis.h, 780), x = vis.x + (vis.w - s) / 2, y = vis.y + (vis.h - s * (scene.slide.art === 'browser' ? 0.74 : scene.slide.art === 'retro' ? 0.92 : 1)) / 2;
    add('visual', { x, y, w: s, h: s }, ctx => (ART[scene.slide.art] || ART.retro)(ctx, x, y, s, scene.theme, scene.brand), { unit: 0 });
  };

  L.collage = (scene, add, vis) => {
    const { slide: sl, theme: th, brand: b } = scene, W = scene.W, fx = f => vis.x + vis.w * f, fy = f => vis.y + vis.h * f;
    const words = (sl.words && sl.words.length ? sl.words : plain(sl.head || 'play grid mess').split(/\s+/)).slice(0, 3); while (words.length < 3) words.push(words[0] || 'play');
    const A = { x: fx(0.0), y: fy(0.06), w: vis.w * 0.58, h: vis.h * 0.36 }, B = { x: fx(0.4), y: fy(0.24), w: vis.w * 0.38, h: vis.h * 0.5 }, C = { x: fx(0.46), y: fy(0.7), w: vis.w * 0.56, h: vis.h * 0.3 };
    const cards = [[A, 'type', { bg: b.yellow, ink: '#121212' }, 0], [B, 'oval', { bg: '#BFB0FF', ink: '#121212' }, 1], [C, 'mosaic', { bg: b.orange, ink: '#121212' }, 2]];
    cards.forEach(([r, kind, c, i]) => add('visual', r, ctx => { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.16)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; ctx.fillStyle = '#fff'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore(); card(ctx, scene, i, r.x, r.y, r.w, r.h, kind, c, words[i], 0); }, { unit: i }));
    const l1 = (sl.labels && sl.labels[0]) || 'Fewer boxes. More overlap.', l2 = (sl.labels && sl.labels[1]) || 'Layouts breaking the page on purpose.';
    const sz = scene.g.reel ? 29 : 26;
    const p1 = { x: fx(0.66), y: fy(0.13) }, p2 = { x: fx(0.02), y: fy(0.64) };
    add('visual', { x: p1.x - 40, y: A.y - 20, w: vis.w * 0.4, h: 220 }, ctx => {
      ctx.strokeStyle = b.orange; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(A.x + A.w, A.y); ctx.lineTo(p1.x, p1.y + 30); ctx.stroke();
      [[A.x, A.y], [A.x + A.w, A.y], [A.x, A.y + A.h], [A.x + A.w, A.y + A.h]].forEach(([x, y]) => handle(ctx, x, y, b.orange, 10));
      monoLabel(ctx, l1, p1.x, p1.y, b.orange, th, sz, vis.w * 0.34);
    }, { unit: 3 });
    add('visual', { x: p2.x, y: p2.y, w: vis.w * 0.5, h: 200 }, ctx => {
      ctx.strokeStyle = b.yellow; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(C.x, C.y); ctx.lineTo(p2.x + vis.w * 0.2, p2.y + 126); ctx.stroke();
      [[C.x, C.y], [C.x + C.w, C.y], [C.x, C.y + C.h], [C.x + C.w, C.y + C.h]].forEach(([x, y]) => handle(ctx, x, y, b.yellow, 10));
      monoLabel(ctx, l2, p2.x, p2.y, b.yellow, th, sz, vis.w * 0.44);
    }, { unit: 4 });
  };

  L.posters = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, fx = f => vis.x + vis.w * f, fy = f => vis.y + vis.h * f;
    const words = (sl.words && sl.words.length ? sl.words : ['studio', 'form', 'noa']).slice(0, 4); while (words.length < 4) words.push(words[words.length - 1]);
    const P = [
      [{ x: fx(0.0), y: fy(0.3), w: vis.w * 0.34, h: vis.h * 0.52 }, 'type', { bg: '#6C6B50', ink: '#EFE9D2' }],
      [{ x: fx(0.37), y: fy(0.0), w: vis.w * 0.28, h: vis.h * 0.64 }, 'poster', { bg: '#FBFAF6', ink: '#121212', a: '#CFC9BC' }],
      [{ x: fx(0.3), y: fy(0.67), w: vis.w * 0.46, h: vis.h * 0.3 }, 'type', { bg: '#58B26F', ink: '#121212' }],
      [{ x: fx(0.69), y: fy(0.16), w: vis.w * 0.31, h: vis.h * 0.64 }, 'poster', { bg: '#E9E1D3', ink: '#2D292A', a: b.orange }],
    ];
    P.forEach(([r, kind, c], i) => add('visual', r, ctx => {
      ctx.fillStyle = darker(c.bg, 0.3); ctx.fillRect(r.x + 14, r.y + 14, r.w, r.h);
      card(ctx, scene, i, r.x, r.y, r.w, r.h, kind, c, words[i], 0);
    }, { unit: i }));
    void th;
  };

  L.greeting = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, W, H } = scene, gold = '#E0A12B', mx = scene.g.mx;
    const px = W * 0.115, py = H * 0.25, pw = W * 0.785, ph = H * (scene.g.reel ? 0.4 : 0.52);
    add('visual', { x: 0, y: 0, w: W, h: H }, ctx => {
      ctx.save(); ctx.strokeStyle = gold; ctx.lineWidth = 2.5; ctx.setLineDash([10, 9]);
      ctx.beginPath(); ctx.moveTo(px - 24, py - 24); ctx.lineTo(px - 24, H); ctx.moveTo(px + pw + 24, 0); ctx.lineTo(px + pw + 24, H); ctx.moveTo(0, py - 24); ctx.lineTo(W, py - 24); ctx.moveTo(0, py + ph + 24); ctx.lineTo(W, py + ph + 24); ctx.stroke(); ctx.restore();
    }, { unit: 0 });
    add('visual', { x: px, y: py, w: pw, h: ph }, ctx => { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14; ctx.fillStyle = '#000'; ctx.fillRect(px, py, pw, ph); ctx.restore(); card(ctx, scene, 0, px, py, pw, ph, 'bokeh', {}, '', 0); }, { unit: 1 });
    // garland
    const gx = px + pw - 36; add('visual', { x: gx - 30, y: 0, w: 60, h: py }, ctx => {
      ctx.strokeStyle = '#7a5a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, py - 24); ctx.stroke();
      for (let y = 6, i = 0; y < py - 30; y += 24, i++) { const c = i % 3 === 0 ? '#FF7A1A' : i % 3 === 1 ? '#FFB400' : '#FFCE3A'; ctx.fillStyle = c; for (let a = 0; a < 7; a++) { ctx.beginPath(); ctx.ellipse(gx + Math.cos(a / 7 * TAU) * 11, y + Math.sin(a / 7 * TAU) * 11, 9, 7, a / 7 * TAU, 0, TAU); ctx.fill(); } ctx.fillStyle = '#C45A00'; ctx.beginPath(); ctx.arc(gx, y, 5, 0, TAU); ctx.fill(); }
    }, { unit: 2 });
    add('visual', { x: px, y: py - 70, w: pw, h: 40 }, ctx => { ctx.fillStyle = gold; setFont(ctx, b, 700, scene.g.reel ? 26 : 23, 0.22); ctx.fillText(up(sl.label || b.name || 'Sixjuly'), px, py - 40); }, { unit: 3 });
    add('visual', { x: px, y: py + ph + 40, w: pw, h: 60 }, ctx => { ctx.fillStyle = gold; setFont(ctx, b, 700, scene.g.reel ? 27 : 24, 0.22); ctx.textAlign = 'right'; ctx.fillText(up(sl.title || ''), px + pw, py + ph + 80); ctx.textAlign = 'left'; }, { unit: 4 });
    void th; void mx;
  };

  L.tiles = (scene, add, vis) => {
    const { slide: sl, brand: b } = scene, items = (sl.items || []).slice(0, 4), gap = 24, cols = 2, rows = Math.ceil(items.length / cols) || 1;
    const tw = (vis.w - gap) / cols, th2 = Math.min(vis.h / rows - gap, 360), total = rows * th2 + (rows - 1) * gap, y0 = vis.y + (vis.h - total) / 2;
    const COL = [[b.violet, '#fff'], [b.orange, '#121212'], [b.yellow, '#121212'], [b.periwinkle, '#fff']];
    items.forEach((txt, i) => {
      const x = vis.x + (i % cols) * (tw + gap), y = y0 + Math.floor(i / cols) * (th2 + gap), [bg, ink] = COL[i % 4];
      add('visual', { x, y, w: tw, h: th2 }, ctx => {
        ctx.fillStyle = bg; rr(ctx, x, y, tw, th2, 36); ctx.fill();
        ctx.save(); rr(ctx, x, y, tw, th2, 36); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.2)'; const k = i % 4;
        if (k === 0) { ctx.beginPath(); ctx.arc(x + tw - 20, y + 10, th2 * 0.34, 0, TAU); ctx.fill(); } else if (k === 1) { ctx.save(); ctx.translate(x + tw - 70, y + 70); ctx.rotate(0.6); ctx.fillRect(-50, -50, 100, 100); ctx.restore(); } else if (k === 2) { ctx.beginPath(); ctx.moveTo(x + tw - 150, y + 130); ctx.lineTo(x + tw - 20, y + 130); ctx.lineTo(x + tw - 20, y); ctx.closePath(); ctx.fill(); } else { for (let n = 0; n < 3; n++) { ctx.beginPath(); ctx.arc(x + tw - 60, y + 60, 24 + n * 26, 0, TAU); ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.stroke(); } }
        ctx.restore();
        const t = fitRich(b, txt, { maxW: tw - 64, maxH: th2 * 0.55, size: scene.g.reel ? 54 : 48, min: 26, weight: 700, lh: 1.08, track: -0.03 });
        ctx.fillStyle = ink; setFont(ctx, b, t.weight, t.size, t.track); ctx.textBaseline = 'top'; const ty = y + th2 - 34 - t.h;
        t.words.forEach(w => w.runs.forEach(r => ctx.fillText(r.t, x + 32 + w.x + r.x, ty + w.y + t.lh * 0.06))); ctx.textBaseline = 'alphabetic';
      }, { unit: i });
    });
  };

  L.split = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, W } = scene, a = sl.a || { label: 'Then', text: '' }, c = sl.b || { label: 'Now', text: '' };
    const y = vis.y + vis.h * 0.04, h = vis.h * 0.92, cx = W / 2;
    const side = (i, x0, x1, bg, ink, d) => add('visual', { x: x0, y, w: x1 - x0, h }, ctx => {
      ctx.fillStyle = bg; ctx.fillRect(x0, y, x1 - x0, h);
      ctx.fillStyle = ink; ctx.globalAlpha = 0.7; setFont(ctx, b, 700, 24, 0.14, FAM.mono); ctx.fillText(up(d.label), i ? cx + 48 : scene.g.mx, y + 60); ctx.globalAlpha = 1;
      const t = fitRich(b, plain(d.text), { maxW: (x1 - x0) - (i ? scene.g.mx + 48 : scene.g.mx + 48), maxH: h - 220, size: 64, min: 30, weight: 700, lh: 1.06, track: -0.035 });
      setFont(ctx, b, t.weight, t.size, t.track); ctx.textBaseline = 'top'; const ox = i ? cx + 48 : scene.g.mx;
      t.words.forEach(w => w.runs.forEach(r => ctx.fillText(r.t, ox + w.x + r.x, y + h - 60 - t.h + w.y + t.lh * 0.06))); ctx.textBaseline = 'alphabetic';
    }, { unit: i });
    side(0, 0, cx, th.dark ? '#262629' : '#121212', '#FFFFFF', a);
    side(1, cx, W, th.name === 'Violet' ? b.yellow : b.violet, th.name === 'Violet' ? '#121212' : '#FFFFFF', c);
    add('visual', { x: cx - 44, y: y + h / 2 - 44, w: 88, h: 88 }, ctx => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, y + h / 2, 44, 0, TAU); ctx.fill(); ctx.strokeStyle = '#121212'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 16, y + h / 2); ctx.lineTo(cx + 16, y + h / 2); ctx.moveTo(cx + 4, y + h / 2 - 12); ctx.lineTo(cx + 16, y + h / 2); ctx.lineTo(cx + 4, y + h / 2 + 12); ctx.stroke(); }, { unit: 2 });
  };

  L.checks = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, rows = [...(sl.yes || []).slice(0, 3).map(t => [1, t]), ...(sl.no || []).slice(0, 3).map(t => [0, t])];
    const n = Math.max(1, rows.length), rh = Math.min(scene.g.reel ? 170 : 140, vis.h / n), y0 = vis.y + (vis.h - rh * n) / 2, d = Math.min(72, rh * 0.52);
    rows.forEach(([ok, txt], i) => { const y = y0 + i * rh, cy = y + rh / 2;
      add('visual', { x: vis.x, y, w: vis.w, h: rh }, ctx => {
        ctx.fillStyle = ok ? b.violet : b.orange; ctx.beginPath(); ctx.arc(vis.x + d / 2, cy, d / 2, 0, TAU); ctx.fill();
        ctx.strokeStyle = ok && th.name === 'Violet' ? '#121212' : '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
        if (ok) { ctx.moveTo(vis.x + d * 0.27, cy + 1); ctx.lineTo(vis.x + d * 0.44, cy + d * 0.17); ctx.lineTo(vis.x + d * 0.74, cy - d * 0.16); } else { ctx.moveTo(vis.x + d * 0.3, cy - d * 0.2); ctx.lineTo(vis.x + d * 0.7, cy + d * 0.2); ctx.moveTo(vis.x + d * 0.7, cy - d * 0.2); ctx.lineTo(vis.x + d * 0.3, cy + d * 0.2); }
        ctx.stroke();
        const t = fitRich(b, txt, { maxW: vis.w - d - 40, maxH: rh - 14, size: scene.g.reel ? 54 : 48, min: 26, weight: ok ? 600 : 400, lh: 1.1, track: -0.025 });
        ctx.fillStyle = th.ink; ctx.globalAlpha = ok ? 1 : 0.62; setFont(ctx, b, t.weight, t.size, t.track); ctx.textBaseline = 'top';
        t.words.forEach(w => w.runs.forEach(r => ctx.fillText(r.t, vis.x + d + 40 + w.x + r.x, cy - t.h / 2 + w.y + t.lh * 0.06)));
        if (!ok) { ctx.strokeStyle = th.ink; ctx.lineWidth = 3; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(vis.x + d + 36, cy); ctx.lineTo(vis.x + d + 44 + t.w, cy); ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
      }, { unit: i });
    });
  };

  L.poster = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, W } = scene, wd = up(sl.word || 'MESS');
    const size = fitLine(b, wd, W * 0.9, vis.h * 0.9, 800, 80, -0.06), cx = W / 2, cy = vis.y + vis.h / 2;
    add('visual', { x: -20, y: cy - size * 0.5, w: W + 40, h: size }, ctx => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.07); setFont(ctx, b, 800, size, -0.06); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = b.orange; ctx.fillText(wd, 16, size * 0.04 + 16); ctx.fillStyle = th.name === 'Violet' ? b.yellow : b.violet; ctx.fillText(wd, 0, size * 0.04);
      ctx.restore();
    }, { unit: 0 });
  };

  L.chat = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, msgs = (sl.chat || []).slice(0, 4), gap = 26, size = scene.g.reel ? 46 : 42, maxW = vis.w * 0.74;
    const laid = msgs.map(m => ({ m, t: layoutRich(b, m.text, { maxW: maxW - 60, size, weight: 500, lh: 1.16, track: -0.02 }) }));
    const heights = laid.map(o => o.t.h + 56), total = heights.reduce((a, v) => a + v, 0) + gap * (laid.length - 1); let y = vis.y + (vis.h - total) / 2;
    laid.forEach((o, i) => {
      const me = o.m.who === 'me', w = Math.min(maxW, o.t.w + 64), h = heights[i], x = me ? vis.x + vis.w - w : vis.x + 70, yy = y; y += h + gap;
      add('visual', { x: me ? x : vis.x, y: yy, w: w + 70, h }, ctx => {
        if (!me) { ctx.fillStyle = b.orange; ctx.beginPath(); ctx.arc(vis.x + 27, yy + h - 27, 27, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; setFont(ctx, b, 700, 28, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', vis.x + 27, yy + h - 25); ctx.textAlign = 'left'; }
        ctx.fillStyle = me ? b.violet : (th.dark ? '#26262b' : '#EFECE5'); rr(ctx, x, yy, w, h, 36); ctx.fill();
        ctx.fillStyle = me ? (th.name === 'Violet' ? '#121212' : '#fff') : th.ink; setFont(ctx, b, 500, o.t.size, o.t.track); ctx.textBaseline = 'top';
        o.t.words.forEach(wd => wd.runs.forEach(r => ctx.fillText(r.t, x + 32 + wd.x + r.x, yy + 28 + wd.y + o.t.lh * 0.06))); ctx.textBaseline = 'alphabetic';
      }, { unit: i });
    });
  };

  L.marquee = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th, W } = scene, text = up(sl.band || 'Design that matters'), bandH = scene.g.reel ? 190 : 160;
    const bands = [[b.violet, '#FFFFFF', 1], [b.orange, '#121212', -1], [b.yellow, '#121212', 1]];
    bands.forEach(([bg, ink, dir], i) => add('visual', { x: -40, y: vis.y, w: W + 80, h: vis.h }, (ctx, st) => {
      ctx.save(); ctx.beginPath(); ctx.rect(0, vis.y - 30, W, vis.h + 60); ctx.clip();
      ctx.translate(W / 2, vis.y + vis.h / 2 + (i - 1) * (bandH + 14)); ctx.rotate(-0.1 + (i - 1) * 0.03);
      ctx.fillStyle = bg; ctx.fillRect(-W, -bandH / 2, W * 2, bandH);
      const sz = bandH * 0.52; setFont(ctx, b, 800, sz, -0.02); ctx.fillStyle = ink; ctx.textBaseline = 'middle'; const unit = text + '   ✦   ', uw = ctx.measureText(unit).width, off = ((st.t || 0) * 140 * dir) % uw;
      const base = -W / 2 + scene.g.mx; for (let k = -2; k < 6; k++) ctx.fillText(unit, base + k * uw + off, 4);
      ctx.restore();
    }, { unit: i }));
    void th;
  };

  L.notes = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, notes = (sl.notes || []).slice(0, 3), s = Math.min(vis.w * 0.5, vis.h * 0.4, 380);
    const pos = [[0.0, 0.0, -0.05], [1.0, 0.16, 0.05], [0.3, 0.62, -0.03]], col = [b.yellow, '#C9D1FB', '#FFB79E'];
    notes.forEach((txt, i) => {
      const [fx, fy, rot] = pos[i], x = vis.x + (vis.w - s) * fx + (i === 2 ? 40 : 0), y = vis.y + (vis.h - s) * fy;
      add('visual', { x, y, w: s, h: s }, ctx => {
        ctx.save(); ctx.translate(x + s / 2, y + s / 2); ctx.rotate(rot); ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 14; ctx.fillStyle = col[i]; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.save(); ctx.translate(0, -s / 2); ctx.rotate(-0.05); ctx.fillRect(-s * 0.14, -16, s * 0.28, 36); ctx.restore();
        const t = fitRich(b, txt, { maxW: s - 64, maxH: s - 90, size: 52, min: 26, weight: 700, lh: 1.08, track: -0.03 });
        ctx.fillStyle = '#121212'; setFont(ctx, b, t.weight, t.size, t.track); ctx.textBaseline = 'top';
        t.words.forEach(w => w.runs.forEach(r => { ctx.fillStyle = r.c === 'hi' ? b.violet : '#121212'; ctx.fillText(r.t, -s / 2 + 32 + w.x + r.x, -s / 2 + 56 + w.y + t.lh * 0.06); })); ctx.restore();
      }, { unit: i });
    });
    void th;
  };

  L.timeline = (scene, add, vis) => {
    const { slide: sl, brand: b, theme: th } = scene, pts = (sl.points || []).slice(0, 5), n = Math.max(1, pts.length), rh = Math.min(scene.g.reel ? 190 : 160, vis.h / n), y0 = vis.y + (vis.h - rh * n) / 2, lx = vis.x + 210;
    add('visual', { x: lx - 2, y: y0, w: 4, h: rh * n }, ctx => { ctx.strokeStyle = th.line; ctx.lineWidth = 4; ctx.setLineDash([2, 12]); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, y0 + rh / 2); ctx.lineTo(lx, y0 + rh * (n - 0.5)); ctx.stroke(); ctx.setLineDash([]); }, { unit: 0, behind: true });
    pts.forEach((p, i) => { const cy = y0 + i * rh + rh / 2;
      add('visual', { x: vis.x, y: cy - rh / 2, w: vis.w, h: rh }, ctx => {
        ctx.fillStyle = th.hi; setFont(ctx, b, 700, scene.g.reel ? 42 : 38, 0, FAM.mono); ctx.textBaseline = 'middle'; ctx.fillText(String(p.k), vis.x, cy + 2);
        ctx.fillStyle = th.bg; ctx.strokeStyle = th.hi; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(lx, cy, 14, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = th.hi; ctx.beginPath(); ctx.arc(lx, cy, 6, 0, TAU); ctx.fill();
        const t = fitRich(b, p.v, { maxW: vis.w - 270, maxH: rh - 14, size: scene.g.reel ? 50 : 44, min: 26, weight: 500, lh: 1.1, track: -0.025 });
        setFont(ctx, b, t.weight, t.size, t.track); ctx.textBaseline = 'top';
        t.words.forEach(w => w.runs.forEach(r => { ctx.fillStyle = r.c === 'hi' ? th.hi : r.c === 'sec' ? th.sec : th.ink; ctx.fillText(r.t, lx + 50 + w.x + r.x, cy - t.h / 2 + w.y + t.lh * 0.06); })); ctx.textBaseline = 'alphabetic';
      }, { unit: i + 1 });
    });
  };

  // ---- covers ---------------------------------------------------------------------------------------------------------------------------------------
  CV.annotate = {
    build(scene, add, o) {                       // thin orange boxes with small labels around words of the title
      const { headL, headY, th, slide, g, brand: b } = o; if (!headL) return;
      (slide.callouts || []).slice(0, 4).forEach((c, i) => {
        const w = headL.words[clamp(c.w | 0, 0, headL.words.length - 1)]; if (!w) return;
        const bx = g.mx + w.x - 10, by = headY + w.y + headL.lh * 0.04, bw = w.w + 20, bh = headL.lh * 0.9;
        add('visual', { x: bx, y: by - 40, w: bw + 200, h: bh + 90 }, ctx => {
          ctx.strokeStyle = th.sec; ctx.lineWidth = 2.5; ctx.strokeRect(bx, by, bw, bh); [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]].forEach(([x, y]) => handle(ctx, x, y, th.sec, 4));
          ctx.fillStyle = th.ink; setFont(ctx, b, 400, o.reel ? 26 : 23, 0); ctx.textBaseline = 'alphabetic'; const lab = String(c.label || ''), lw = ctx.measureText(lab).width;
          if (bx + bw + 14 + lw < scene.W - g.mx + 20) ctx.fillText(lab, bx + bw + 14, by + 22); else ctx.fillText(lab, bx + 6, by - 14);
        }, { unit: i });
      });
    },
  };
  CV.crt = {
    build(scene, add, o) {
      const { W, H, th, brand: b, headL, headY, footTop } = o, top = headL ? headY + headL.h : H * 0.45, avail = footTop - top - 30, s = Math.min(W * 0.66, avail / 0.95), x = W - s * 0.9, y = top - s * 0.02;
      add('art', { x, y, w: s, h: s }, ctx => ART.crt(ctx, x, y, s, th, b), {});
    },
  };
  CV.ripple = {
    replaceHead: true,
    build(scene, add, o) {                       // big italic serif title over yellow ripples, e.g. "8 Graphic Design Trends Dominating 2026"
      const { g, th, brand: b, slide: sl, W, H, reel } = o, lines = String(sl.head || '').split('\n').filter(Boolean), num = String(sl.num || ''), stamp = String(sl.stamp || '');
      const ctx0 = U.mc, widest = () => lines.reduce((a, l) => Math.max(a, ctx0.measureText(l).width), 0);
      let ls = W * 0.125; const x1 = g.mx + W * 0.2;
      for (; ls > 40; ls -= 4) { setFont(ctx0, b, 'italic 400', ls, -0.03, FAM.serif); if (widest() + (lines.length > 1 ? 80 : 0) < W - x1 - g.mx + W * 0.1) break; }
      const ns = ls * 1.7, lh = ls * 0.98, blockH = lines.length * lh + (stamp ? ls * 0.9 : 0), top = H * (reel ? 0.36 : 0.3), cy = top + blockH / 2;
      add('art', { x: W * 0.12, y: cy - W * 0.45, w: W * 0.9, h: W * 0.9 }, ctx => {
        [[W * 0.64, cy - W * 0.02, W * 0.4], [W * 0.5, cy + W * 0.2, W * 0.32]].forEach(([cx, cy2, R0], k) => { for (let i = 9; i >= 0; i--) { ctx.fillStyle = `rgba(252,217,75,${0.16 + (9 - i) * 0.02})`; ctx.beginPath(); ctx.arc(cx, cy2, R0 * (i + 1) / 10, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.stroke(); } void k; });
      }, {});
      add('head', { x: g.mx, y: top - ls * 0.3, w: W - 2 * g.mx, h: blockH + ls * 0.6 }, ctx => {
        ctx.textBaseline = 'alphabetic'; if (num) { ctx.fillStyle = th.hi; setFont(ctx, b, 'italic 400', ns, -0.04, FAM.serif); ctx.fillText(num, g.mx - 10, top + ns * 0.62); }
        lines.forEach((l, i) => { ctx.fillStyle = th.ink; setFont(ctx, b, 'italic 400', ls, -0.03, FAM.serif); ctx.fillText(l, x1 + (i % 2) * 22 + i * 10, top + ls * 0.82 + i * lh); });
        if (stamp) { ctx.fillStyle = th.hi; setFont(ctx, b, 700, ls * 0.5, -0.02, FAM.mono); const sx = x1 + 10, sy = top + ls * 0.82 + lines.length * lh + ls * 0.1; ctx.fillText(stamp, sx, sy); const sw = ctx.measureText(stamp).width; ctx.strokeStyle = th.hi; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(sx + sw + 18, sy - ls * 0.04); ctx.lineTo(sx + sw + 18 + ls * 0.3, sy - ls * 0.34); ctx.moveTo(sx + sw + 18 + ls * 0.04, sy - ls * 0.34); ctx.lineTo(sx + sw + 18 + ls * 0.3, sy - ls * 0.34); ctx.lineTo(sx + sw + 18 + ls * 0.3, sy - ls * 0.08); ctx.stroke(); }
      }, {});
    },
  };

  // slide kinds this file adds, with a one-line description and the fields each uses (used by the layout gallery and the copy engine)
  R.LAYOUT_INFO = {
    art: 'Statement with an illustration (retro computer, browser, phone)', collage: 'Overlapping work cards with mono callouts', posters: 'Four staggered posters with hard shadows',
    greeting: 'Festival post: dashed frame, photo, garland', tiles: '2×2 colour tiles', split: 'Full-bleed then / now halves', checks: 'Do and don’t rows', poster: 'One giant word', chat: 'Chat bubbles',
    marquee: 'Scrolling tape bands', notes: 'Rotated sticky notes', timeline: 'Dated timeline',
  };
})();
