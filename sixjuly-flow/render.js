/* Sixjuly Flow — slide renderer.
   One canvas-2D renderer for everything: the node previews, PNG export and video export.
   A slide is plain data ({ kind, head, foot, … }); layoutSlide() turns it into a scene (positioned items, one per
   animatable element) and paintScene() draws that scene at a moment in time. t = null draws the finished still. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;

  // ---- brand ---------------------------------------------------------------------------------------------------------
  const BRAND = {
    name: 'Sixjuly', handle: '@sixjulydesign', site: 'sixjuly.com', font: 'Google Sans Flex',
    violet: '#7E3EFF', orange: '#FF4900', cream: '#F9F5EC', charcoal: '#2D292A', yellow: '#FCD94B',
    periwinkle: '#6F83F3', white: '#FFFFFF', black: '#121212',
  };
  const FALLBACK = 'Inter, "Helvetica Neue", Arial, sans-serif';
  const stack = b => `"${(b && b.font) || BRAND.font}", ${FALLBACK}`;

  function mix(a, b, k) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join('');
  }

  // slide themes built from the brand palette: bg, ink (text), hi (violet-style highlight), sec (orange-style footer highlight)
  function themesFor(b) {
    b = Object.assign({}, BRAND, b || {});
    return {
      light:  { name: 'White',  bg: b.white,  ink: b.black, hi: b.violet, sec: b.orange, mute: '#7A7A7A', dot: 'rgba(18,18,18,0.10)', logo: b.violet, card: '#F3F1EC', line: '#E6E2DA', btn: b.violet, btnInk: b.white, dark: false },
      cream:  { name: 'Cream',  bg: b.cream,  ink: b.black, hi: b.violet, sec: b.orange, mute: '#7D7869', dot: 'rgba(18,18,18,0.10)', logo: b.violet, card: '#FFFFFF', line: '#E2DCCB', btn: b.violet, btnInk: b.white, dark: false },
      dark:   { name: 'Black',  bg: b.black,  ink: b.white, hi: mix(b.violet, '#FFFFFF', 0.28), sec: b.orange, mute: '#9A9A9A', dot: 'rgba(255,255,255,0.10)', logo: mix(b.violet, '#FFFFFF', 0.28), card: '#1E1E1E', line: '#2C2C2C', btn: b.violet, btnInk: b.white, dark: true },
      violet: { name: 'Violet', bg: b.violet, ink: b.white, hi: b.yellow, sec: b.cream, mute: 'rgba(255,255,255,0.72)', dot: 'rgba(255,255,255,0.16)', logo: b.white, card: 'rgba(255,255,255,0.14)', line: 'rgba(255,255,255,0.28)', btn: b.yellow, btnInk: b.black, dark: true },
      orange: { name: 'Orange', bg: b.orange, ink: b.black, hi: b.white, sec: b.black, mute: 'rgba(18,18,18,0.65)', dot: 'rgba(18,18,18,0.14)', logo: b.black, card: 'rgba(255,255,255,0.22)', line: 'rgba(18,18,18,0.25)', btn: b.black, btnInk: b.white, dark: false },
    };
  }

  // ---- easing + motion presets -----------------------------------------------------------------------------------------
  const EASE = {
    smooth: p => 1 - Math.pow(1 - p, 3),
    snappy: p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    bouncy: p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    spring: p => (p >= 1 ? 1 : 1 - Math.exp(-6.5 * p) * Math.cos(p * TAU * 1.15)),
    linear: p => p,
  };
  const ENTER_TYPES = {
    none: 'None', fade: 'Fade', rise: 'Rise', reveal: 'Line reveal', words: 'Word by word', blur: 'Focus in', pop: 'Pop',
    slide: 'Slide in', drop: 'Drop', wipe: 'Wipe', type: 'Typewriter',
  };
  const LOOP_TYPES = { none: 'None', float: 'Float', pulse: 'Pulse', wobble: 'Wobble', sway: 'Sway', spin: 'Spin' };
  const HI_TYPES = { none: 'None', ink: 'Ink fill', underline: 'Underline', pop: 'Pop' };
  const ARROW_TYPES = { none: 'None', nudge: 'Nudge', draw: 'Draw' };
  const TRANSITIONS = { cut: 'Cut', fade: 'Cross-fade', push: 'Push', zoom: 'Zoom through', wipe: 'Wipe', up: 'Slide up' };

  const MOTION_PRESETS = {
    smooth:  { head: 'reveal', visual: 'rise',  foot: 'fade', header: 'fade', tag: 'pop', art: 'fade', btn: 'pop', hi: 'ink',       loopVisual: 'float',  loopArrow: 'nudge', loopArt: 'spin', ease: 'smooth', stagger: 0.10, speed: 1,   transition: 'push' },
    punchy:  { head: 'words',  visual: 'pop',   foot: 'rise', header: 'none', tag: 'drop', art: 'pop',  btn: 'drop', hi: 'pop',       loopVisual: 'pulse',  loopArrow: 'nudge', loopArt: 'none', ease: 'snappy', stagger: 0.07, speed: 1.2, transition: 'wipe' },
    playful: { head: 'words',  visual: 'drop',  foot: 'blur', header: 'pop',  tag: 'drop', art: 'pop',  btn: 'pop',  hi: 'underline', loopVisual: 'wobble', loopArrow: 'nudge', loopArt: 'spin', ease: 'bouncy', stagger: 0.09, speed: 1,   transition: 'zoom' },
    minimal: { head: 'fade',   visual: 'fade',  foot: 'fade', header: 'fade', tag: 'fade', art: 'fade', btn: 'fade', hi: 'none',      loopVisual: 'none',   loopArrow: 'none',  loopArt: 'none', ease: 'smooth', stagger: 0.06, speed: 1,   transition: 'fade' },
    editorial: { head: 'blur', visual: 'slide', foot: 'rise', header: 'fade', tag: 'slide', art: 'fade', btn: 'slide', hi: 'ink',     loopVisual: 'sway',   loopArrow: 'draw',  loopArt: 'spin', ease: 'snappy', stagger: 0.12, speed: 0.9, transition: 'up' },
    kinetic: { head: 'type',   visual: 'wipe',  foot: 'type', header: 'fade', tag: 'pop',  art: 'pop',  btn: 'pop',  hi: 'ink',       loopVisual: 'pulse',  loopArrow: 'nudge', loopArt: 'spin', ease: 'snappy', stagger: 0.08, speed: 1.1, transition: 'cut' },
  };
  const DEFAULT_MOTION = Object.assign({ perSlide: 0, preset: 'smooth' }, MOTION_PRESETS.smooth);

  // ---- rich text: [[violet words]] and {{orange words}} -------------------------------------------------------------------------
  // returns words; a word is a list of coloured runs (so "[[gradient]]." keeps the full stop attached and black)
  function parseRich(src) {
    const chars = []; let c = 'ink';
    const s = String(src == null ? '' : src);
    for (let i = 0; i < s.length; i++) {
      const two = s.substr(i, 2);
      if (two === '[[') { c = 'hi'; i++; continue; }
      if (two === ']]' || two === '}}') { c = 'ink'; i++; continue; }
      if (two === '{{') { c = 'sec'; i++; continue; }
      chars.push({ ch: s[i], c });
    }
    const words = []; let cur = null;
    for (const { ch, c } of chars) {
      if (ch === '\n') { cur = null; words.push({ br: true }); continue; }
      if (/\s/.test(ch)) { cur = null; continue; }
      if (!cur) { cur = { runs: [] }; words.push(cur); }
      const last = cur.runs[cur.runs.length - 1];
      if (last && last.c === c) last.t += ch; else cur.runs.push({ t: ch, c });
    }
    return words;
  }
  const plain = s => String(s == null ? '' : s).replace(/\[\[|\]\]|\{\{|\}\}/g, '');

  const mc = document.createElement('canvas').getContext('2d');
  const FAM = { cond: '"Anton", "Bebas Neue", Impact, "Arial Narrow", sans-serif', serif: '"Instrument Serif", "Playfair Display", Georgia, serif', mono: '"Space Mono", "DM Mono", ui-monospace, Menlo, monospace' };
  const LAYOUTS = {}, COVERS = {}, imgs = new Map();   // filled by layouts.js / the Images node
  function setFont(ctx, brand, weight, size, track, fam) {
    ctx.font = `${weight} ${size}px ${fam || stack(brand)}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (track || 0) * size + 'px';
  }

  // lay words out in lines. opts: { maxW, size, weight, lh (× size), track (× size), align, balance }
  function layoutRich(brand, src, o) {
    const words = parseRich(src);
    setFont(mc, brand, o.weight, o.size, o.track, o.fam);
    const space = mc.measureText(' ').width + (o.track || 0) * o.size * 0;
    const items = words.map(w => {
      if (w.br) return w;
      let x = 0;
      const runs = w.runs.map(r => { const wd = mc.measureText(r.t).width; const out = { t: r.t, c: r.c, x, w: wd }; x += wd; return out; });
      return { runs, w: x };
    });
    const flow = maxW => {
      const lines = [[]]; let x = 0;
      for (const it of items) {
        if (it.br) { lines.push([]); x = 0; continue; }
        const need = (lines[lines.length - 1].length ? space : 0) + it.w;
        if (x + need > maxW && lines[lines.length - 1].length) { lines.push([it]); x = it.w; }
        else { lines[lines.length - 1].push(it); x += need; }
      }
      return lines.filter(l => l.length);
    };
    let lines = flow(o.maxW);
    if (o.balance !== false && lines.length > 1) { // shrink the measure while the line count holds → even lines
      const n = lines.length; let lo = o.maxW * 0.5, hi = o.maxW;
      for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (flow(mid).length <= n) hi = mid; else lo = mid; }
      lines = flow(hi);
    }
    const lh = o.lh * o.size, out = []; let maxLine = 0, wi = 0;
    lines.forEach((ln, li) => {
      const lw = ln.reduce((a, w, i) => a + w.w + (i ? space : 0), 0);
      maxLine = Math.max(maxLine, lw);
      let x = o.align === 'center' ? (o.maxW - lw) / 2 : o.align === 'right' ? o.maxW - lw : 0;
      ln.forEach(w => { out.push({ runs: w.runs, w: w.w, x, y: li * lh, line: li, idx: wi++ }); x += w.w + space; });
    });
    const widest = items.reduce((a, w) => Math.max(a, w.w || 0), 0);
    return { words: out, lines: lines.length, w: maxLine, h: lines.length * lh, lh, size: o.size, weight: o.weight, track: o.track, fam: o.fam, widest };
  }

  // largest size that fits the box
  function fitRich(brand, src, o) {
    let size = o.size;
    for (; size > (o.min || 24); size -= 2) {
      const L = layoutRich(brand, src, Object.assign({}, o, { size }));
      if (L.widest <= o.maxW && (!o.maxH || L.h <= o.maxH) && (!o.maxLines || L.lines <= o.maxLines)) return L;
    }
    return layoutRich(brand, src, Object.assign({}, o, { size }));
  }

  // ---- geometry -----------------------------------------------------------------------------------------------------------
  function geometry(W, H) {
    const reel = H / W > 1.6;
    const mx = Math.round(W * 0.089);                       // 96 on a 1080 canvas
    return {
      W, H, reel, mx,
      top: reel ? 250 : mx,                                  // reels keep clear of the app chrome
      bottom: reel ? H - 340 : H - mx,
      headSize: reel ? 104 : 88,
      footSize: reel ? 40 : 34,
      headerY: reel ? 140 : mx,
    };
  }

  // ---- scene --------------------------------------------------------------------------------------------------------------
  // item = { role, unit, box, paint(ctx, st, ctxInfo) }; roles: header art tag head sub visual foot btn arrow
  const ROLE_ORDER = ['art', 'header', 'tag', 'head', 'sub', 'visual', 'free', 'btn', 'foot', 'arrow'];

  function layoutSlide(slide, env) {
    const { W, H, brand } = env;
    const th = env.theme;
    const g = geometry(W, H);
    const scene = { W, H, g, theme: th, brand, slide, items: [], units: {} };
    const add = (role, box, paint, extra) => { const it = Object.assign({ role, unit: 0, box, paint }, extra || {}); scene.items.push(it); return it; };
    const kind = slide.kind || 'statement';
    const reel = g.reel, OV = slide.o || {};
    // per-slide text overrides from the editor: size, weight, family, alignment, line height, tracking (colour is applied at paint time)
    const ty = (key, src, opts, fit) => {
      const o = OV[key] || {}, op = Object.assign({}, opts);
      if (o.weight) op.weight = +o.weight; if (o.fam && FAM[o.fam]) op.fam = FAM[o.fam]; if (o.align) op.align = o.align; if (o.lh) op.lh = +o.lh; if (o.track != null && o.track !== '') op.track = +o.track;
      if (o.size) { op.size = +o.size; delete op.maxH; delete op.maxLines; return layoutRich(brand, src, op); }
      return fit ? fitRich(brand, src, op) : layoutRich(brand, src, op);
    };

    // headline ------------------------------------------------------------------------------------------------------------
    const cover = kind === 'cover', cta = kind === 'cta';
    const hasVisual = !['statement', 'cover', 'cta'].includes(kind);
    const maxW = W - 2 * g.mx;
    let footL = null, footTop = g.bottom - (slide.handle ? 0 : 56);
    if (slide.foot) {
      footL = ty('foot', slide.foot, { maxW: maxW - (slide.handle ? 330 : 130), size: g.footSize, weight: 400, lh: 1.3, track: -0.01, balance: false }, false);
      footTop = g.bottom - footL.h;
    }
    let subL = null;
    if (cover && slide.sub) {
      subL = ty('sub', slide.sub, { maxW, size: reel ? 64 : 54, min: 36, weight: 600, lh: 1.12, track: -0.025, maxLines: 2 }, true);
      footTop = Math.min(footTop, footTop) - (footL ? 18 : 0) - subL.h;
    }
    let headL = null, headY = g.top;
    const cov = cover && COVERS[slide.cover];
    if (cov && cov.replaceHead) { cov.build(scene, add, { g, th, brand, slide, W, H, reel, U: window.SixjulyRender.U }); }
    else if (slide.head) {
      if (cover) {
        headL = ty('head', slide.head, { maxW, maxH: H * (reel ? 0.34 : 0.4), size: reel ? 260 : 230, min: 70, weight: 800, lh: 0.96, track: -0.045, maxLines: 4 }, true);
        headY = Math.round(H * (reel ? 0.31 : 0.265));
      } else if (cta || kind === 'statement' && !slide.visual) {
        headL = ty('head', slide.head, { maxW, maxH: H * 0.36, size: g.headSize * (cta ? 1.08 : 1.25), min: 56, weight: 500, lh: 1.08, track: -0.035, maxLines: 5 }, true);
        headY = Math.round(H * (cta ? (reel ? 0.34 : 0.26) : (reel ? 0.34 : 0.3)));
      } else {
        headL = ty('head', slide.head, { maxW, maxH: H * 0.3, size: g.headSize, min: 52, weight: 500, lh: 1.1, track: -0.035, maxLines: 4 }, true);
      }
    }
    if (headL && slide.header && !cover && !cta) headY = g.headerY + 74 * 0.84 + (reel ? 70 : 50);
    scene.headL = headL;
    scene.headY = headY;

    // header (logo + handle) — on cover / closing slides, like the brand posts
    if (cover || cta || slide.header) {
      const lg = window.SIXJULY_LOGO, lw = 74, lhh = lw * lg.h / lg.w, y = g.headerY;
      add('header', { x: g.mx, y, w: lw, h: lhh }, (ctx, st) => {
        drawLogo(ctx, g.mx, y, lw, th.logo);
        ctx.fillStyle = th.ink; setFont(ctx, brand, 400, reel ? 22 : 19, 0); ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(brand.handle || BRAND.handle, W - g.mx, y + 16);
        ctx.fillText(brand.site || BRAND.site, W - g.mx, y + 16 + (reel ? 28 : 25));
        ctx.textAlign = 'left';
      });
    }

    // cover art: sits in the free band between the headline and the bottom text, bleeding off the right edge ---------------
    if (cover && env.art && env.art !== 'none' && headL && !slide.cover) {
      const textTop = g.bottom - (footL ? footL.h + (subL ? 18 : 0) : 0) - (subL ? subL.h : 0);
      const free = textTop - (headY + headL.h) - 70;
      const size = clamp(free, 300, W * 0.72), cy = headY + headL.h + 35 + free / 2;
      const box = { x: W - size * 0.7, y: cy - size / 2, w: size, h: size };
      if (env.art === 'spiral') add('art', box, (ctx, st) => { ctx.save(); ctx.translate(box.x + size / 2, box.y + size / 2); ctx.rotate(st.spin || 0); ctx.globalAlpha *= 0.16; drawLogo(ctx, -size / 2, -size * (window.SIXJULY_LOGO.h / 100) / 2, size, th.hi); ctx.restore(); }, { spin: true });
      if (env.art === 'orb') add('art', box, (ctx, st) => drawOrb(ctx, box.x + size / 2, box.y + size / 2, size / 2 * 0.9, th.hi, th.sec, th.dark, st.spin || 0), { spin: true });
    }

    if (cov && !cov.replaceHead) { cov.build(scene, add, { g, th, brand, slide, W, H, reel, headL, headY, footTop, U: window.SixjulyRender.U }); }

    // sticker tag (cover) -------------------------------------------------------------------------------------------------
    if (cover && slide.tag && headL) {
      const tagText = String(slide.tag), tsz = fitLine(brand, tagText, W * 0.62, reel ? 88 : 76, 800, 36, -0.02);
      setFont(mc, brand, 800, tsz, -0.02);
      const tw = mc.measureText(tagText).width, pad = Math.round(tsz * 0.29), h = tsz * 1.12 + pad;
      const box = { x: g.mx - 4, y: headY - h - 30, w: tw + pad * 2, h };
      add('tag', box, (ctx) => {
        ctx.save(); ctx.translate(box.x, box.y + box.h); ctx.rotate(-0.05); ctx.translate(0, -box.h);
        ctx.fillStyle = th.sec; ctx.fillRect(0, 0, box.w, box.h);
        ctx.fillStyle = th.name === 'Orange' ? th.ink : '#FFFFFF'; setFont(ctx, brand, 800, tsz, -0.02); ctx.textBaseline = 'alphabetic';
        ctx.fillText(tagText, pad, box.h - pad * 0.95); ctx.restore();
      });
    }

    // headline words ---------------------------------------------------------------------------------------------------------
    if (headL) {
      const box = { x: g.mx, y: headY, w: maxW, h: headL.h };
      scene.headBox = box;
      add('head', box, null, { text: headL, ox: g.mx, oy: headY, ink: (OV.head || {}).color });
    }
    const headBottom = headL ? headY + headL.h : g.top;

    // sub (cover) & foot -------------------------------------------------------------------------------------------------
    if (subL) {
      const y = g.bottom - (footL ? footL.h + 18 : 0) - subL.h;
      add('sub', { x: g.mx, y, w: maxW, h: subL.h }, null, { text: subL, ox: g.mx, oy: y, ink: (OV.sub || {}).color });
    }
    if (footL) add('foot', { x: g.mx, y: footTop + (subL ? 0 : 0), w: maxW - 130, h: footL.h }, null, { text: footL, ox: g.mx, oy: g.bottom - footL.h, ink: (OV.foot || {}).color });
    // arrow
    if (slide.handle) {
      const ay0 = g.bottom;
      add('arrow', { x: W - g.mx - 300, y: ay0 - 60, w: 300, h: 60 }, (ctx) => { ctx.fillStyle = th.ink; setFont(ctx, brand, 400, reel ? 26 : 23, 0); ctx.textAlign = 'right'; ctx.fillText(brand.handle || BRAND.handle, W - g.mx, ay0 - 28); ctx.fillText(brand.site || BRAND.site, W - g.mx, ay0 + 2); ctx.textAlign = 'left'; });
    } else if (kind !== 'cta' || slide.arrow) {
      const ay = g.bottom - (footL ? Math.min(footL.h, g.footSize * 1.3) / 2 : 22);
      add('arrow', { x: W - g.mx - 64, y: ay - 24, w: 64, h: 48 }, (ctx, st) => {
        const p = st.draw == null ? 1 : st.draw;
        ctx.save(); ctx.strokeStyle = th.ink; ctx.lineWidth = reel ? 4 : 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const x1 = W - g.mx - 6, x0 = x1 - 54 * p;
        ctx.beginPath(); ctx.moveTo(x0, ay); ctx.lineTo(x1, ay); ctx.stroke();
        if (p > 0.55) { const k = clamp((p - 0.55) / 0.45); ctx.beginPath(); ctx.moveTo(x1 - 16 * k, ay - 16 * k); ctx.lineTo(x1, ay); ctx.lineTo(x1 - 16 * k, ay + 16 * k); ctx.stroke(); }
        ctx.restore();
      });
    }

    // visual area ---------------------------------------------------------------------------------------------------------
    const vTop = headBottom + (reel ? 60 : 40), vBot = footTop - (reel ? 60 : 40);
    const vis = { x: g.mx, y: vTop, w: maxW, h: Math.max(200, vBot - vTop) };
    scene.vis = vis;
    if (hasVisual) buildVisual(scene, add, vis, env);
    if (cta && slide.btn) {
      setFont(mc, brand, 700, reel ? 52 : 46, -0.01);
      const label = String(slide.btn).toUpperCase(), tw = mc.measureText(label).width;
      const bh = reel ? 150 : 128, bw = tw + 120, by = headY + headL.h + (reel ? 70 : 58);
      add('btn', { x: g.mx, y: by, w: bw, h: bh }, (ctx) => {
        ctx.fillStyle = th.btn; rr(ctx, g.mx, by, bw, bh, bh / 2); ctx.fill();
        ctx.fillStyle = th.btnInk; setFont(ctx, brand, 700, reel ? 52 : 46, -0.01); ctx.textBaseline = 'middle'; ctx.fillText(label, g.mx + 60, by + bh / 2 + 3); ctx.textBaseline = 'alphabetic';
      });
    }
    // free layers added in the editor (text, shapes, photos), drawn above the layout
    (slide.layers || []).forEach((ly, k) => { const lay = prepLayer(ly, scene); add('free', lay.box, ctx => lay.paint(ctx), { unit: k, layer: ly.id, lay: ly }); });
    // stable keys so edits (move / scale / hide) stay attached to the same element
    const cnt = {}; scene.items.forEach(it => { cnt[it.role] = cnt[it.role] || 0; it.key = it.layer ? 'free:' + it.layer : it.role + cnt[it.role]; cnt[it.role]++; });
    scene.dots = cover || cta || slide.dots;
    return scene;
  }

  // ---- visuals -------------------------------------------------------------------------------------------------------------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawLogo(ctx, x, y, w, color) {
    const lg = window.SIXJULY_LOGO; if (!lg) return;
    if (ctx.svgPath) { ctx.save(); ctx.translate(x, y); ctx.scale(w / lg.w, w / lg.w); ctx.svgPath(lg.d, color, 'evenodd'); ctx.restore(); return; }
    if (!lg._p) lg._p = new Path2D(lg.d);
    ctx.save(); ctx.translate(x, y); ctx.scale(w / lg.w, w / lg.w); ctx.fillStyle = color; ctx.fill(lg._p, 'evenodd'); ctx.restore();
  }
  function drawOrb(ctx, cx, cy, R, c1, c2, dark, rot) {
    // halftone sphere: dots shrink away from a light spot
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    const step = R / 15, lx = -R * 0.38, ly = -R * 0.42;
    for (let gy = -R; gy <= R; gy += step) for (let gx = -R; gx <= R; gx += step) {
      const d = Math.hypot(gx, gy); if (d > R) continue;
      const l = Math.hypot(gx - lx, gy - ly) / (R * 1.5), r = step * 0.52 * (1 - clamp(l) * 0.92);
      if (r < 0.6) continue; ctx.fillStyle = l < 0.42 ? c1 : c2; ctx.globalAlpha = dark ? 0.9 : 1;
      ctx.beginPath(); ctx.arc(gx, gy, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function fitLine(brand, text, maxW, size, weight, min, track) {
    let s = size; setFont(mc, brand, weight, s, track);
    while (mc.measureText(text).width > maxW && s > min) { s -= 2; setFont(mc, brand, weight, s, track); }
    return s;
  }

  function buildVisual(scene, add, vis, env) {
    const { brand, theme: th, slide, g, W } = scene, kind = slide.kind, reel = g.reel;
    if (LAYOUTS[kind]) return LAYOUTS[kind](scene, add, vis, env, window.SixjulyRender.U);
    const label = (ctx, text, cx, y, size) => { ctx.fillStyle = th.ink; setFont(ctx, brand, 400, size || (reel ? 28 : 25), 0.12); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(String(text).toUpperCase(), cx, y); ctx.textAlign = 'left'; };
    const centre = (h) => vis.y + (vis.h - h) / 2;

    if (kind === 'compare') {
      const a = slide.a || { label: 'Before', text: '' }, b = slide.b || { label: 'After', text: '' };
      const cw = Math.min(410, (vis.w - 130) / 2), ch = Math.min(cw * 0.86, vis.h - 70), y = centre(ch + 70);
      const x0 = vis.x + (vis.w - (cw * 2 + 130)) / 2;
      const card = (ci, x, d, strong) => add('visual', { x, y, w: cw, h: ch + 70 }, (ctx) => {
        ctx.save();
        ctx.fillStyle = strong ? th.hi : th.card;
        if (!strong && !th.dark) { ctx.shadowColor = 'rgba(0,0,0,0.07)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; }
        rr(ctx, x, y, cw, ch, 36); ctx.fill(); ctx.restore();
        const t = layoutRich(brand, plain(d.text), { maxW: cw - 70, size: 46, weight: 600, lh: 1.12, track: -0.025, align: 'center' });
        const fit = fitRich(brand, plain(d.text), { maxW: cw - 70, maxH: ch - 60, size: 50, min: 26, weight: 600, lh: 1.12, track: -0.025, align: 'center' });
        const L = fit || t; const ty = y + (ch - L.h) / 2;
        ctx.fillStyle = strong ? (th.dark && th.hi !== th.ink && th.name === 'Violet' ? th.btnInk : '#FFFFFF') : th.ink;
        if (strong && th.name === 'Violet') ctx.fillStyle = th.btnInk;
        setFont(ctx, brand, L.weight, L.size, L.track); ctx.textBaseline = 'top';
        L.words.forEach(w => w.runs.forEach(r => ctx.fillText(r.t, x + 35 + w.x + r.x, ty + w.y + L.lh * 0.08)));
        ctx.textBaseline = 'alphabetic';
        label(ctx, d.label || (strong ? 'After' : 'Before'), x + cw / 2, y + ch + 56);
      }, { unit: ci });
      card(0, x0, a, false);
      add('visual', { x: x0 + cw, y: y + ch / 2 - 24, w: 130, h: 48 }, (ctx) => {
        const cx = x0 + cw + 65, cy = y + ch / 2; ctx.save(); ctx.strokeStyle = th.ink; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(cx - 22, cy); ctx.lineTo(cx + 22, cy); ctx.moveTo(cx + 8, cy - 14); ctx.lineTo(cx + 22, cy); ctx.lineTo(cx + 8, cy + 14); ctx.stroke(); ctx.restore();
      }, { unit: 1 });
      card(2, x0 + cw + 130, b, true);
    } else if (kind === 'stat') {
      const st = slide.stat || { value: '3×', label: '' };
      const val = String(st.value || '');
      const sz = fitLine(brand, val, vis.w, Math.min(reel ? 460 : 400, vis.h * 0.8), 800, 120, -0.05);
      const lab = st.label ? fitRich(brand, plain(st.label), { maxW: vis.w * 0.9, size: reel ? 52 : 46, min: 28, weight: 500, lh: 1.15, track: -0.02, align: 'center', maxLines: 3 }) : null;
      const total = sz * 0.82 + (lab ? lab.h + 30 : 0), y0 = centre(total);
      add('visual', { x: vis.x, y: y0, w: vis.w, h: sz * 0.82 }, (ctx) => {
        ctx.fillStyle = th.hi; setFont(ctx, brand, 800, sz, -0.05); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(val, vis.x + vis.w / 2, y0 + sz * 0.76); ctx.textAlign = 'left';
      }, { unit: 0 });
      if (lab) add('visual', { x: vis.x, y: y0 + sz * 0.82 + 30, w: vis.w, h: lab.h }, (ctx) => {
        ctx.fillStyle = th.ink; setFont(ctx, brand, lab.weight, lab.size, lab.track); ctx.textBaseline = 'top';
        lab.words.forEach(w => w.runs.forEach(r => ctx.fillText(r.t, vis.x + (vis.w - vis.w * 0.9) / 2 + w.x + r.x, y0 + sz * 0.82 + 30 + w.y)));
        ctx.textBaseline = 'alphabetic';
      }, { unit: 1 });
    } else if (kind === 'list' || kind === 'steps') {
      const items = (slide.items || []).slice(0, kind === 'steps' ? 5 : 5);
      const n = Math.max(1, items.length), rowH = Math.min(reel ? 190 : 160, vis.h / n), total = rowH * n, y0 = centre(total);
      const d = Math.min(76, rowH * 0.5);
      if (kind === 'steps' && n > 1) add('visual', { x: vis.x, y: y0, w: d, h: total }, (ctx) => {
        ctx.save(); ctx.strokeStyle = th.line; ctx.lineWidth = 4; ctx.setLineDash([2, 12]); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(vis.x + d / 2, y0 + rowH / 2); ctx.lineTo(vis.x + d / 2, y0 + rowH * (n - 0.5)); ctx.stroke(); ctx.restore();
      }, { unit: 0, behind: true });
      items.forEach((txt, i) => {
        const y = y0 + i * rowH, cy = y + rowH / 2;
        add('visual', { x: vis.x, y, w: vis.w, h: rowH }, (ctx) => {
          if (kind === 'list' && i) { ctx.strokeStyle = th.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(vis.x, y); ctx.lineTo(vis.x + vis.w, y); ctx.stroke(); }
          ctx.fillStyle = th.hi; ctx.beginPath(); ctx.arc(vis.x + d / 2, cy, d / 2, 0, TAU); ctx.fill();
          ctx.fillStyle = th.name === 'Violet' ? th.btnInk : '#FFFFFF'; setFont(ctx, brand, 700, d * 0.5, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), vis.x + d / 2, cy + 2); ctx.textAlign = 'left';
          const L = fitRich(brand, txt, { maxW: vis.w - d - 36, maxH: rowH - 16, size: reel ? 52 : 46, min: 26, weight: 500, lh: 1.12, track: -0.025 });
          ctx.fillStyle = th.ink; setFont(ctx, brand, L.weight, L.size, L.track); ctx.textBaseline = 'top';
          L.words.forEach(w => w.runs.forEach(r => { ctx.fillStyle = r.c === 'hi' ? th.hi : r.c === 'sec' ? th.sec : th.ink; ctx.fillText(r.t, vis.x + d + 36 + w.x + r.x, cy - L.h / 2 + w.y + L.lh * 0.06); }));
          ctx.textBaseline = 'alphabetic';
        }, { unit: i + (kind === 'steps' ? 1 : 0) });
      });
    } else if (kind === 'quote') {
      const q = slide.quote || { text: '', by: '' };
      const L = fitRich(brand, q.text, { maxW: vis.w, maxH: vis.h - 220, size: reel ? 70 : 62, min: 30, weight: 500, lh: 1.14, track: -0.03 });
      const total = 190 + L.h + (q.by ? 80 : 0), y0 = centre(total);
      add('visual', { x: vis.x, y: y0, w: vis.w, h: total }, (ctx) => {
        ctx.fillStyle = th.hi; setFont(ctx, brand, 800, 340, 0); ctx.textBaseline = 'alphabetic'; ctx.fillText('“', vis.x - 8, y0 + 290);
        setFont(ctx, brand, L.weight, L.size, L.track); ctx.textBaseline = 'top';
        L.words.forEach(w => w.runs.forEach(r => { ctx.fillStyle = r.c === 'hi' ? th.hi : r.c === 'sec' ? th.sec : th.ink; ctx.fillText(r.t, vis.x + w.x + r.x, y0 + 190 + w.y + L.lh * 0.06); }));
        if (q.by) { ctx.fillStyle = th.mute; setFont(ctx, brand, 400, reel ? 28 : 25, 0.12); ctx.fillText(String(q.by).toUpperCase(), vis.x, y0 + 190 + L.h + 36); }
        ctx.textBaseline = 'alphabetic';
      }, { unit: 0 });
    } else if (kind === 'objects') {
      const objs = (slide.objects && slide.objects.length ? slide.objects : [{ type: 'jelly', label: 'Jelly' }, { type: 'toggle', label: 'Chrome' }, { type: 'card', label: 'Clay' }]).slice(0, 3);
      const cw = vis.w / objs.length, rowH = 260, y0 = centre(rowH + 70), cy = y0 + rowH / 2;
      objs.forEach((o, i) => {
        const cx = vis.x + cw * (i + 0.5);
        add('visual', { x: cx - cw / 2, y: y0, w: cw, h: rowH + 70 }, (ctx) => {
          drawObject(ctx, o.type, cx, cy, Math.min(cw - 30, 290), th, brand, o.text);
          label(ctx, o.label || '', cx, y0 + rowH + 56);
        }, { unit: i });
      });
    }
  }

  function drawObject(ctx, type, cx, cy, w, th, brand, text) {
    ctx.save();
    if (type === 'jelly') {
      const h = w * 0.4, x = cx - w / 2, y = cy - h / 2;
      ctx.shadowColor = 'rgba(126,62,255,0.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
      const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#B792FF'); gr.addColorStop(0.55, '#7E3EFF'); gr.addColorStop(1, '#5A1FE0');
      ctx.fillStyle = gr; rr(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.shadowColor = 'transparent';
      const hl = ctx.createLinearGradient(0, y, 0, y + h * 0.5); hl.addColorStop(0, 'rgba(255,255,255,0.75)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl; rr(ctx, x + h * 0.22, y + h * 0.08, w - h * 0.44, h * 0.42, h * 0.21); ctx.fill();
      ctx.fillStyle = '#fff'; setFont(ctx, brand, 600, h * 0.4, -0.01); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text || 'Start', cx, cy + 2);
    } else if (type === 'toggle') {
      const h = w * 0.46, x = cx - w * 0.42, y = cy - h / 2, tw = w * 0.84;
      ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
      const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#6c6c70'); gr.addColorStop(0.5, '#e9e9ee'); gr.addColorStop(1, '#a9a9b0');
      ctx.fillStyle = gr; rr(ctx, x, y, tw, h, h / 2); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; rr(ctx, x + 7, y + 7, tw - 14, h - 14, (h - 14) / 2); ctx.fill();
      const kx = x + tw - h / 2, kr = h * 0.4;
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
      const kg = ctx.createRadialGradient(kx - kr * 0.3, cy - kr * 0.35, kr * 0.1, kx, cy, kr); kg.addColorStop(0, '#ffffff'); kg.addColorStop(0.6, '#cfcfd6'); kg.addColorStop(1, '#8e8e96');
      ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(kx, cy, kr, 0, TAU); ctx.fill();
    } else {
      const h = w * 0.7, x = cx - w * 0.42, y = cy - h / 2, cw = w * 0.84;
      ctx.shadowColor = 'rgba(60,50,30,0.25)'; ctx.shadowBlur = 38; ctx.shadowOffsetY = 20;
      const gr = ctx.createLinearGradient(x, y, x + cw, y + h); gr.addColorStop(0, '#FBF8F1'); gr.addColorStop(1, '#E4DED0');
      ctx.fillStyle = gr; rr(ctx, x, y, cw, h * 0.82, 30); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(120,105,80,0.18)'; ctx.beginPath(); ctx.arc(x + cw * 0.18, y + h * 0.2, cw * 0.07, 0, TAU); ctx.fill();
      rr(ctx, x + cw * 0.1, y + h * 0.44, cw * 0.8, 12, 6); ctx.fill(); rr(ctx, x + cw * 0.1, y + h * 0.56, cw * 0.55, 12, 6); ctx.fill();
    }
    ctx.restore();
  }

  // ---- motion engine -------------------------------------------------------------------------------------------------------
  const ENTER_DUR = { fade: 0.6, rise: 0.75, reveal: 0.8, words: 0.7, blur: 0.9, pop: 0.7, slide: 0.8, drop: 0.95, wipe: 0.75, type: 0.5, none: 0.01 };

  function motionFor(motion, role) {
    const m = motion || DEFAULT_MOTION;
    const map = { header: m.header, art: m.art, tag: m.tag, head: m.head, sub: m.head === 'words' || m.head === 'type' ? 'rise' : m.head, visual: m.visual, free: m.visual, foot: m.foot, btn: m.btn, arrow: 'fade' };
    return map[role] || 'fade';
  }

  // when does each role start, and how many staggered units does it have?
  function timeline(scene, motion) {
    const m = motion || DEFAULT_MOTION, speed = m.speed || 1, stag = m.stagger == null ? 0.1 : m.stagger;
    const tl = {}; let cursor = 0.12;
    for (const role of ROLE_ORDER) {
      const its = scene.items.filter(i => i.role === role); if (!its.length) continue;
      const type = motionFor(m, role), dur = (ENTER_DUR[type] || 0.7) / speed;
      let units = 1;
      if (role === 'head' || role === 'sub' || role === 'foot') {
        const L = its[0].text; units = !L ? 1 : type === 'words' ? L.words.length : type === 'reveal' ? L.lines : 1;
      } else units = Math.max(...its.map(i => i.unit)) + 1;
      const gap = type === 'type' ? 0 : stag / speed;
      const start = role === 'art' ? 0 : cursor, span = dur + gap * (units - 1);
      tl[role] = { type, start, dur, gap, units, span };
      if (role !== 'art') cursor = start + span * (role === 'head' ? 0.78 : 0.62);
    }
    const hiStart = (tl.head ? tl.head.start + tl.head.span : 0.6) - 0.1;
    tl.hi = { type: m.hi || 'none', start: hiStart, dur: 0.7 / speed };
    tl.end = Object.values(tl).reduce((a, x) => Math.max(a, (x.start || 0) + (x.span || x.dur || 0)), 0) + 0.2;
    return tl;
  }

  // animation state of one unit of a role at time t
  function unitState(tl, role, unit, t, motion, loopSeed) {
    const m = motion || DEFAULT_MOTION, T = tl[role];
    const st = { a: 1, dx: 0, dy: 0, s: 1, rot: 0, blur: 0, wipe: 1, chars: 1, mask: 0, draw: 1, spin: 0, t: t == null ? 0 : t };
    if (t == null || !T) return st;
    const raw = (t - T.start - T.gap * unit) / T.dur;
    const p = clamp(raw), e = (EASE[m.ease] || EASE.smooth)(p);
    switch (T.type) {
      case 'none': break;
      case 'fade': st.a = clamp(p * 1.4); break;
      case 'rise': st.a = clamp(p * 2); st.dy = (1 - e) * 54; break;
      case 'words': st.a = clamp(p * 2.2); st.dy = (1 - e) * 60; break;
      case 'reveal': st.mask = 1; st.dy = (1 - e) * 1.15; st.a = p > 0 ? 1 : 0; break;
      case 'blur': st.a = clamp(p * 1.6); st.blur = (1 - p) * 16; st.s = 0.95 + 0.05 * e; break;
      case 'pop': st.a = clamp(p * 3); st.s = 0.55 + 0.45 * e; break;
      case 'slide': st.a = clamp(p * 2); st.dx = -(1 - e) * 170; break;
      case 'drop': st.a = clamp(p * 4); st.dy = -(1 - EASE.bouncy(p)) * 260; st.rot = (1 - e) * -0.06; break;
      case 'wipe': st.a = p > 0 ? 1 : 0; st.wipe = e; break;
      case 'type': st.a = 1; st.chars = p; break;
    }
    if (raw < 0 && T.type !== 'none') { st.a = 0; if (T.type === 'type') st.chars = 0; }
    // loops (after the entrance)
    if (role === 'visual' && m.loopVisual && m.loopVisual !== 'none' && raw > 0.6) {
      const k = (t - T.start) * 1.6 + unit * 0.9 + (loopSeed || 0), amp = clamp((t - T.start - T.dur) * 1.2);
      switch (m.loopVisual) {
        case 'float': st.dy += Math.sin(k) * 11 * amp; break;
        case 'pulse': st.s *= 1 + Math.sin(k * 1.3) * 0.028 * amp; break;
        case 'wobble': st.rot += Math.sin(k * 1.2) * 0.03 * amp; st.dy += Math.sin(k * 0.8) * 5 * amp; break;
        case 'sway': st.dx += Math.sin(k * 0.9) * 16 * amp; break;
        case 'spin': st.rot += (t - T.start) * 0.5 * amp; break;
      }
    }
    if (role === 'arrow') {
      if (m.loopArrow === 'draw') { st.draw = clamp(raw); st.a = raw > 0 ? 1 : 0; }
      else if (m.loopArrow === 'nudge' && raw > 0.8) st.dx += (Math.sin((t - T.start) * 4.2) * 0.5 + 0.5) * 10 * clamp((t - T.start - T.dur) * 2);
    }
    if (role === 'art' && m.loopArt === 'spin') st.spin = t * 0.18;
    return st;
  }

  function withState(ctx, st, box, fn) {
    if (st.a <= 0.003) return;
    ctx.save();
    ctx.globalAlpha *= clamp(st.a);
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    ctx.translate(cx + st.dx, cy + st.dy); if (st.rot) ctx.rotate(st.rot); if (st.s !== 1) ctx.scale(st.s, st.s); ctx.translate(-cx, -cy);
    if (st.wipe < 1) { ctx.beginPath(); ctx.rect(box.x - 60, box.y - 60, (box.w + 120) * st.wipe, box.h + 120); ctx.clip(); }
    if (st.blur > 0.2) ctx.filter = `blur(${st.blur.toFixed(1)}px)`;
    fn();
    ctx.restore();
  }

  function paintText(ctx, scene, item, tl, t, motion, ink) {
    const th = scene.theme, L = item.text, role = item.role, T = tl[role] || { type: 'fade' };
    setFont(ctx, scene.brand, L.weight, L.size, L.track, L.fam);
    ctx.textBaseline = 'alphabetic';
    const total = L.words.reduce((a, w) => a + w.runs.reduce((b, r) => b + r.t.length, 0), 0);
    let seen = 0;
    const color = c => (c === 'hi' ? th.hi : c === 'sec' ? th.sec : ink || th.ink);
    const hiT = tl.hi, hiP = t == null ? 1 : clamp((t - hiT.start) / hiT.dur), hiE = EASE.smooth(hiP);
    const baseline = (L.lh - L.size) / 2 + L.size * 0.8;
    L.words.forEach(w => {
      const unit = T.type === 'words' ? w.idx : T.type === 'reveal' ? w.line : 0;
      const st = unitState(tl, role, unit, t, motion);
      const wx = item.ox + w.x, wy = item.oy + w.y;
      const wordBox = { x: wx, y: wy, w: w.w, h: L.lh };
      const chars0 = seen; seen += w.runs.reduce((b, r) => b + r.t.length, 0);
      const need = T.type === 'type' && t != null ? Math.floor(st.chars * total) - chars0 : 1e9;
      if (T.type === 'type' && t != null && need <= 0) return;
      ctx.save();
      if (st.mask) { ctx.beginPath(); ctx.rect(item.ox - 40, item.oy + w.line * L.lh - 4, item.box.w + 80, L.lh + 8); ctx.clip(); }
      const state = Object.assign({}, st, st.mask ? { dy: st.dy * L.lh, a: st.a } : {});
      const hasHi = w.runs.some(r => r.c === 'hi');
      let hs = 1; if (hasHi && hiT.type === 'pop' && t != null) hs = 1 + Math.sin(clamp(hiP) * Math.PI) * 0.1;
      withState(ctx, state, wordBox, () => {
        if (hs !== 1) { ctx.translate(wx + w.w / 2, wy + L.lh / 2); ctx.scale(hs, hs); ctx.translate(-(wx + w.w / 2), -(wy + L.lh / 2)); }
        let left = need;
        w.runs.forEach(r => {
          const txt = r.t.length > left ? r.t.slice(0, Math.max(0, left)) : r.t; left -= r.t.length;
          if (!txt) return;
          const rx = wx + r.x, ry = wy + baseline;
          if (r.c === 'hi' && hiT.type === 'ink' && t != null && hiP < 1) {
            ctx.fillStyle = ink || th.ink; ctx.fillText(txt, rx, ry);
            ctx.save(); ctx.beginPath(); ctx.rect(rx - 4, wy - 4, (r.w + 8) * hiE, L.lh + 8); ctx.clip(); ctx.fillStyle = th.hi; ctx.fillText(txt, rx, ry); ctx.restore();
          } else { ctx.fillStyle = color(r.c); ctx.fillText(txt, rx, ry); }
          if (r.c === 'hi' && hiT.type === 'underline' && t != null) {
            ctx.fillStyle = th.hi; ctx.fillRect(rx, wy + baseline + L.size * 0.1, r.w * hiE, Math.max(4, L.size * 0.055));
          }
        });
      });
      ctx.restore();
    });
  }

  function paintScene(ctx, scene, t, motion, o) {
    o = o || {};
    const { W, H, theme: th } = scene;
    if (!o.noBg) { ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H); }
    if (scene.dots && !o.noBg) paintDots(ctx, W, H, th.dot);
    const tl = timeline(scene, motion);
    scene.tl = tl;
    const order = scene.items.slice().sort((a, b) => (ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)) || ((b.behind ? 1 : 0) - (a.behind ? 1 : 0)));
    const seed = (scene.slide.head || '').length, IO = (scene.slide.o || {}).items || {}, svg = !!ctx.group;
    for (const it of order) {
      const io = IO[it.key]; if (io && io.hide) continue;
      const draw = () => {
        if (it.text && (it.role === 'head' || it.role === 'sub' || it.role === 'foot')) {
          if (it.role === 'foot' || it.role === 'sub') {
            const st = unitState(tl, it.role, 0, t, motion), T = tl[it.role];
            if (T && T.type === 'type') paintText(ctx, scene, it, tl, t, motion, it.ink);
            else withState(ctx, Object.assign({}, st, { mask: 0 }), it.box, () => paintText(ctx, scene, it, tl, null, motion, it.ink));
          } else paintText(ctx, scene, it, tl, t, motion, it.ink);
          return;
        }
        const st = unitState(tl, it.role, it.unit, t, motion, seed);
        withState(ctx, st, it.box, () => it.paint(ctx, st));
      };
      if (svg) ctx.group(itemName(it));
      if (io && (io.dx || io.dy || (io.s && io.s !== 1))) {
        ctx.save(); const b = it.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2; ctx.translate(cx + (io.dx || 0), cy + (io.dy || 0)); if (io.s && io.s !== 1) ctx.scale(io.s, io.s); ctx.translate(-cx, -cy); draw(); ctx.restore();
      } else draw();
      if (svg) ctx.endGroup();
    }
  }

  function paintDots(ctx, W, H, color) {
    if (ctx.dotPattern) return ctx.dotPattern(36, color);
    ctx.save(); ctx.fillStyle = color; const s = 36;
    for (let y = s; y < H; y += s) for (let x = s; x < W; x += s) ctx.fillRect(x - 1, y - 1, 2.2, 2.2);
    ctx.restore();
  }

  // ---- decks, still frames and reels --------------------------------------------------------------------------------------------------
  // deck = { slides:[…], brand, design:{ theme, coverTheme, ctaTheme, art, rhythm } }
  function themeFor(deck, i) {
    const T = themesFor(deck.brand), d = deck.design || {}, n = deck.slides.length;
    let key = d.theme || 'light';
    if (i === 0 && d.coverTheme) key = d.coverTheme;
    if (i === n - 1 && d.ctaTheme) key = d.ctaTheme;
    if (d.rhythm === 'alternate' && i > 0 && i < n - 1) key = i % 2 ? (d.theme || 'light') : (d.altTheme || 'cream');
    const sl = deck.slides[i] || {}; if (sl.theme && T[sl.theme]) key = sl.theme;
    let th = T[key] || T.light; if (sl.bgColor) th = Object.assign({}, th, { bg: sl.bgColor });
    return th;
  }
  const sceneCache = new Map();
  function sceneFor(deck, i, W, H) {
    const slide = deck.slides[i];
    const key = JSON.stringify([slide, deck.brand, deck.design, W, H, i === deck.slides.length - 1, i === 0]);
    let s = sceneCache.get(key);
    if (!s) {
      s = layoutSlide(slide, { W, H, brand: Object.assign({}, BRAND, deck.brand || {}), theme: themeFor(deck, i), art: i === 0 ? (deck.design || {}).art : 'none' });
      if (sceneCache.size > 80) sceneCache.clear();
      sceneCache.set(key, s);
    }
    return s;
  }
  function drawSlide(ctx, deck, i, o) {
    o = o || {}; const W = o.W || 1080, H = o.H || 1350;
    ctx.save();
    if (o.scale) ctx.scale(o.scale, o.scale);
    const scene = sceneFor(deck, i, W, H);
    paintScene(ctx, scene, o.t == null ? null : o.t, o.motion);
    ctx.restore();
    return scene;
  }

  function slideDuration(deck, i, motion) {
    const m = motion || DEFAULT_MOTION;
    if (m.perSlide > 0) return m.perSlide;
    const s = deck.slides[i], words = (plain(s.head || '') + ' ' + plain(s.foot || '')).trim().split(/\s+/).length;
    const scene = sceneFor(deck, i, 1080, 1920), tl = timeline(scene, m);
    return clamp(Math.max(tl.end + 0.9, 1.8 + words * 0.13), 2.8, 7);
  }
  function reelPlan(deck, motion) {
    const m = motion || DEFAULT_MOTION, tt = m.transition === 'cut' ? 0 : 0.55 / (m.speed || 1);
    let at = 0; const segs = deck.slides.map((s, i) => { const dur = slideDuration(deck, i, m); const seg = { i, start: at, dur, end: at + dur }; at += dur; return seg; });
    return { segs, total: at, tt };
  }
  function drawReel(ctx, deck, t, o) {
    o = o || {}; const W = 1080, H = 1920, m = o.motion || DEFAULT_MOTION;
    const plan = o.plan || reelPlan(deck, m);
    t = clamp(t, 0, plan.total - 0.001);
    let k = plan.segs.findIndex(s => t < s.end); if (k < 0) k = plan.segs.length - 1;
    const seg = plan.segs[k], into = t - seg.start;
    const tin = k === 0 ? 0 : plan.tt;
    const cur = sceneFor(deck, k, W, H);
    if (k > 0 && into < tin) {
      const prev = plan.segs[k - 1], ps = sceneFor(deck, k - 1, W, H);
      const p = clamp(into / tin), e = EASE.smooth(p), type = m.transition || 'push';
      const local = Math.max(0, into - tin * 0.55);
      const drawPrev = () => paintScene(ctx, ps, prev.dur + into, m);
      const drawCur = () => paintScene(ctx, cur, Math.max(0, into - tin * 0.45), m);
      ctx.save();
      if (type === 'fade') { drawPrev(); ctx.globalAlpha = e; drawCur(); }
      else if (type === 'push') { ctx.save(); ctx.translate(-W * e, 0); drawPrev(); ctx.restore(); ctx.save(); ctx.translate(W * (1 - e), 0); drawCur(); ctx.restore(); }
      else if (type === 'up') { drawPrev(); ctx.save(); ctx.translate(0, H * (1 - e)); drawCur(); ctx.restore(); }
      else if (type === 'zoom') { ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1 + 0.18 * e, 1 + 0.18 * e); ctx.translate(-W / 2, -H / 2); ctx.globalAlpha = 1 - e; drawPrev(); ctx.restore(); ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(0.9 + 0.1 * e, 0.9 + 0.1 * e); ctx.translate(-W / 2, -H / 2); ctx.globalAlpha = e; drawCur(); ctx.restore(); }
      else if (type === 'wipe') { drawPrev(); ctx.beginPath(); ctx.moveTo(0, 0); const x = (W + 300) * e - 300; ctx.lineTo(x + 300, 0); ctx.lineTo(x, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip(); drawCur(); }
      else drawCur();
      ctx.restore();
      void local;
    } else paintScene(ctx, cur, Math.max(0, into - (k === 0 ? 0 : tin * 0.45)), m);
    return plan;
  }


  // ---- free layers -----------------------------------------------------------------------------------------------------------------------------
  function prepLayer(ly, scene) {
    const brand = scene.brand, th = scene.theme;
    const col = c => (c === 'ink' || !c ? th.ink : c === 'hi' ? th.hi : c === 'sec' ? th.sec : c === 'bg' ? th.bg : c);
    const rot = ly.rot || 0;
    const wrapRot = (ctx, box, fn) => { ctx.save(); if (rot) { ctx.translate(box.x + box.w / 2, box.y + box.h / 2); ctx.rotate(rot); ctx.translate(-(box.x + box.w / 2), -(box.y + box.h / 2)); } fn(); ctx.restore(); };
    if (ly.type === 'text') {
      const fam = ly.fam && FAM[ly.fam] ? FAM[ly.fam] : undefined, pad = ly.bg ? Math.round((ly.size || 48) * 0.3) : 0;
      const L = layoutRich(brand, ly.text || '', { maxW: Math.max(40, (ly.w || 400) - pad * 2), size: ly.size || 48, weight: ly.weight || 600, lh: ly.lh || 1.12, track: ly.track != null ? ly.track : -0.025, align: ly.align || 'left', fam, balance: false });
      const box = { x: ly.x, y: ly.y, w: ly.w || 400, h: Math.max(20, L.h + pad * 2) };
      return { box, L, paint: ctx => wrapRot(ctx, box, () => {
        if (ly.bg) { ctx.fillStyle = col(ly.bg); rr(ctx, box.x, box.y, box.w, box.h, ly.radius != null ? ly.radius : 0); ctx.fill(); }
        setFont(ctx, brand, L.weight, L.size, L.track, L.fam); ctx.textBaseline = 'alphabetic'; const base = (L.lh - L.size) / 2 + L.size * 0.8;
        L.words.forEach(w => w.runs.forEach(r => { ctx.fillStyle = r.c === 'hi' ? th.hi : r.c === 'sec' ? th.sec : col(ly.color); ctx.fillText(r.t, box.x + pad + w.x + r.x, box.y + pad + w.y + base); }));
      }) };
    }
    if (ly.type === 'shape') {
      const box = { x: ly.x, y: ly.y, w: ly.w || 200, h: ly.h || 200 };
      return { box, paint: ctx => wrapRot(ctx, box, () => {
        const fill = ly.fill === 'none' ? null : col(ly.fill || 'hi'), st = ly.stroke ? col(ly.stroke) : null; ctx.lineWidth = ly.sw || 4;
        if (ly.shape === 'circle') { ctx.beginPath(); ctx.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w / 2, box.h / 2, 0, 0, TAU); }
        else if (ly.shape === 'arrow') {
          ctx.strokeStyle = col(ly.stroke || 'ink'); ctx.lineWidth = ly.sw || 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const cy = box.y + box.h / 2, hd = Math.min(box.h * 0.45, box.w * 0.3);
          ctx.beginPath(); ctx.moveTo(box.x, cy); ctx.lineTo(box.x + box.w, cy); ctx.moveTo(box.x + box.w - hd, cy - hd); ctx.lineTo(box.x + box.w, cy); ctx.lineTo(box.x + box.w - hd, cy + hd); ctx.stroke(); return;
        } else rr(ctx, box.x, box.y, box.w, box.h, ly.shape === 'pill' ? 1e4 : (ly.radius || 0));
        if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (st) { ctx.strokeStyle = st; ctx.stroke(); }
      }) };
    }
    // photo
    const box = { x: ly.x, y: ly.y, w: ly.w || 400, h: ly.h || 400 };
    return { box, paint: ctx => wrapRot(ctx, box, () => {
      const im = imgs.get(ly.img);
      ctx.save(); rr(ctx, box.x, box.y, box.w, box.h, ly.radius || 0); ctx.clip();
      if (im && im.complete && im.naturalWidth) {
        const z = Math.max(1, ly.zoom || 1), k = Math.max(box.w / im.naturalWidth, box.h / im.naturalHeight) * z, iw = im.naturalWidth * k, ih = im.naturalHeight * k;
        const ox = clamp(ly.ox || 0, -1, 1) * (iw - box.w) / 2, oy = clamp(ly.oy || 0, -1, 1) * (ih - box.h) / 2;
        const fl = []; if (ly.brightness != null && ly.brightness !== 1) fl.push(`brightness(${ly.brightness})`); if (ly.contrast != null && ly.contrast !== 1) fl.push(`contrast(${ly.contrast})`); if (ly.saturate != null && ly.saturate !== 1) fl.push(`saturate(${ly.saturate})`);
        if (fl.length) ctx.filter = fl.join(' ');
        ctx.drawImage(im, box.x + (box.w - iw) / 2 + ox, box.y + (box.h - ih) / 2 + oy, iw, ih);
      } else { ctx.fillStyle = th.card; ctx.fillRect(box.x, box.y, box.w, box.h); ctx.fillStyle = th.mute; setFont(ctx, brand, 500, 28, 0); ctx.textAlign = 'center'; ctx.fillText('Photo', box.x + box.w / 2, box.y + box.h / 2); ctx.textAlign = 'left'; }
      ctx.restore();
      if (ly.stroke) { ctx.strokeStyle = col(ly.stroke); ctx.lineWidth = ly.sw || 4; rr(ctx, box.x, box.y, box.w, box.h, ly.radius || 0); ctx.stroke(); }
    }) };
  }
  const ITEM_NAMES = { head: 'Headline', sub: 'Sub-line', foot: 'Footer text', arrow: 'Arrow', header: 'Logo and handle', tag: 'Sticker', btn: 'Button', art: 'Cover art', visual: 'Visual' };
  function itemName(it, k) { if (it.lay) return it.lay.type === 'text' ? 'Text' : it.lay.type === 'image' ? 'Photo' : 'Shape'; return ITEM_NAMES[it.role] || it.role; }
  // item box after the editor's move / scale overrides
  function itemBox(scene, it) {
    const io = ((scene.slide.o || {}).items || {})[it.key]; const b = it.box; if (!io) return b;
    const s = io.s || 1, cx = b.x + b.w / 2 + (io.dx || 0), cy = b.y + b.h / 2 + (io.dy || 0); return { x: cx - b.w * s / 2, y: cy - b.h * s / 2, w: b.w * s, h: b.h * s };
  }
  // topmost selectable element under a point (canvas px)
  function hitTest(scene, x, y) {
    const order = scene.items.slice().sort((a, b) => (ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)) || ((b.behind ? 1 : 0) - (a.behind ? 1 : 0)));
    const probe = soft => {
      for (let i = order.length - 1; i >= 0; i--) {
        const it = order[i]; if (!!it.soft !== soft) continue; const io = ((scene.slide.o || {}).items || {})[it.key]; if (io && io.hide) continue;
        const b = itemBox(scene, it); if (b.w * b.h > scene.W * scene.H * 0.85 || b.w < 4 || b.h < 4) continue;
        let px = x, py = y; const rot = it.lay && it.lay.rot; if (rot) { const cx = b.x + b.w / 2, cy = b.y + b.h / 2, c = Math.cos(-rot), s2 = Math.sin(-rot); px = cx + (x - cx) * c - (y - cy) * s2; py = cy + (x - cx) * s2 + (y - cy) * c; }
        if (px >= b.x - 6 && px <= b.x + b.w + 6 && py >= b.y - 6 && py <= b.y + b.h + 6) return it;
      }
      return null;
    };
    return probe(false) || probe(true);
  }


  // one slide as editable SVG (needs svgctx.js)
  function toSVG(deck, i, o) {
    o = o || {}; const W = o.W || 1080, H = o.H || 1350, scene = sceneFor(deck, i, W, H), c = new window.SixjulySVG(W, H);
    c.group('Background'); c.fillStyle = scene.theme.bg; c.fillRect(0, 0, W, H); c.endGroup();
    if (scene.dots) { c.group('Dot grid'); paintDots(c, W, H, scene.theme.dot); c.endGroup(); }
    paintScene(c, scene, null, null, { noBg: true });
    const b = Object.assign({}, BRAND, deck.brand || {});
    return c.toString({ fonts: [b.font, 'Anton', 'Instrument Serif', 'Space Mono'] });
  }

  // ---- fonts -----------------------------------------------------------------------------------------------------------------
  const fontLinks = new Set();
  const EXTRA = 'https://fonts.googleapis.com/css2?family=Anton&family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&display=swap';
  function addLink(href) {
    if (fontLinks.has(href)) return Promise.resolve(); fontLinks.add(href);
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
    return new Promise(r => { l.onload = r; l.onerror = r; setTimeout(r, 4000); });
  }
  async function loadFonts(brand) {
    const fam = (brand && brand.font) || BRAND.font;
    await Promise.all([addLink(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, '+')}:wght@300..900&display=swap`), addLink(EXTRA)]);
    try {
      await Promise.all([300, 400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px "${fam}"`, 'Aa Sixjuly 0123')).concat([
        document.fonts.load('400 40px "Anton"', 'Aa'), document.fonts.load('italic 400 40px "Instrument Serif"', 'Aa'), document.fonts.load('400 40px "Instrument Serif"', 'Aa'),
        document.fonts.load('400 24px "Space Mono"', 'Aa'), document.fonts.load('700 24px "Space Mono"', 'Aa')]));
      await document.fonts.ready;
    } catch (e) { /* system fallback */ }
    sceneCache.clear();
  }

  window.SixjulyRender = {
    BRAND, themesFor, parseRich, plain, layoutSlide, paintScene, timeline, drawSlide, drawReel, reelPlan, slideDuration, sceneFor,
    U: { rr, setFont, layoutRich, fitRich, fitLine, drawLogo, clamp, lerp, TAU, mc, mix, parseRich, plain, EASE, stack },
    prepLayer, itemBox, hitTest, itemName, toSVG, sceneFor,
    loadFonts, drawLogo, LAYOUTS, COVERS, FAM, imgs, DEFAULT_MOTION, MOTION_PRESETS, ENTER_TYPES, LOOP_TYPES, HI_TYPES, ARROW_TYPES, TRANSITIONS, EASE, stack,
  };
})();
