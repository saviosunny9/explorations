/* Sixjuly Flow — SVG recording context.
   Implements the part of CanvasRenderingContext2D that the slide renderer uses and writes SVG instead of pixels, so the same
   layouts export as editable SVG: text stays <text>, shapes stay <path> / <rect> / <circle>, photos stay <image>.
   Use: const c = new SixjulySVG(1080, 1350); paintScene(c, scene, null, null); c.toString(). */
(function () {
  'use strict';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const f = n => (Math.round(n * 100) / 100).toString();
  const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];

  class Grad {
    constructor(kind, args, owner) { this.kind = kind; this.args = args; this.stops = []; this.id = null; this.owner = owner; }
    addColorStop(o, c) { this.stops.push([o, c]); }
  }

  class SixjulySVG {
    constructor(w, h) {
      this.W = w; this.H = h; this.out = []; this.defs = []; this.uid = 1; this.groups = 0;
      this.m = [1, 0, 0, 1, 0, 0]; this.stack = []; this.path = []; this.clips = [];
      this.fillStyle = '#000'; this.strokeStyle = '#000'; this.lineWidth = 1; this.lineCap = 'butt'; this.lineJoin = 'miter'; this.globalAlpha = 1;
      this.font = '10px sans-serif'; this.letterSpacing = '0px'; this.textAlign = 'left'; this.textBaseline = 'alphabetic';
      this.shadowColor = 'rgba(0,0,0,0)'; this.shadowBlur = 0; this.shadowOffsetX = 0; this.shadowOffsetY = 0; this.filter = 'none'; this.dash = [];
      this.globalCompositeOperation = 'source-over';
      this._m = document.createElement('canvas').getContext('2d');
      this.cx = 0; this.cy = 0; this.sx = 0; this.sy = 0;
    }
    // ---- state ----
    save() { this.stack.push({ m: this.m.slice(), clips: this.clips.slice(), s: ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'globalAlpha', 'font', 'letterSpacing', 'textAlign', 'textBaseline', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'filter'].map(k => [k, this[k]]), dash: this.dash.slice() }); }
    restore() { const s = this.stack.pop(); if (!s) return; this.m = s.m; this.clips = s.clips; s.s.forEach(([k, v]) => (this[k] = v)); this.dash = s.dash; }
    translate(x, y) { this.m = mul(this.m, [1, 0, 0, 1, x, y]); }
    scale(x, y) { this.m = mul(this.m, [x, 0, 0, y, 0, 0]); }
    rotate(a) { const c = Math.cos(a), s = Math.sin(a); this.m = mul(this.m, [c, s, -s, c, 0, 0]); }
    transform(a, b, c, d, e, g) { this.m = mul(this.m, [a, b, c, d, e, g]); }
    setTransform(a, b, c, d, e, g) { this.m = [a, b, c, d, e, g]; }
    setLineDash(d) { this.dash = d.slice(); }
    getLineDash() { return this.dash.slice(); }
    measureText(t) { this._m.font = this.font; if ('letterSpacing' in this._m) this._m.letterSpacing = this.letterSpacing; return this._m.measureText(t); }
    createLinearGradient(...a) { return new Grad('linear', a, this); }
    createRadialGradient(...a) { return new Grad('radial', a, this); }
    // ---- path ----
    beginPath() { this.path = []; this.hasPt = false; }
    closePath() { this.path.push('Z'); }
    moveTo(x, y) { this.path.push(`M${f(x)} ${f(y)}`); this.cx = this.sx = x; this.cy = this.sy = y; }
    lineTo(x, y) { this.path.push(`${this.path.length ? 'L' : 'M'}${f(x)} ${f(y)}`); this.cx = x; this.cy = y; }
    bezierCurveTo(a, b, c, d, e, g) { this.path.push(`C${f(a)} ${f(b)} ${f(c)} ${f(d)} ${f(e)} ${f(g)}`); this.cx = e; this.cy = g; }
    quadraticCurveTo(a, b, c, d) { this.path.push(`Q${f(a)} ${f(b)} ${f(c)} ${f(d)}`); this.cx = c; this.cy = d; }
    rect(x, y, w, h) { this.path.push(`M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`); this.cx = x; this.cy = y; }
    arc(x, y, r, a0, a1, ccw) {
      const TAU = Math.PI * 2; let d = a1 - a0; if (!ccw && d < 0) d = ((d % TAU) + TAU) % TAU; if (ccw && d > 0) d = -(((-d) % TAU) + TAU) % TAU;
      if (Math.abs(d) >= TAU - 1e-6) { const mx = x + r * Math.cos(a0 + Math.PI), my = y + r * Math.sin(a0 + Math.PI), sx = x + r * Math.cos(a0), sy = y + r * Math.sin(a0); this.path.push(`${this.path.length ? 'L' : 'M'}${f(sx)} ${f(sy)}A${f(r)} ${f(r)} 0 1 ${ccw ? 0 : 1} ${f(mx)} ${f(my)}A${f(r)} ${f(r)} 0 1 ${ccw ? 0 : 1} ${f(sx)} ${f(sy)}`); this.cx = sx; this.cy = sy; return; }
      const sx = x + r * Math.cos(a0), sy = y + r * Math.sin(a0), ex = x + r * Math.cos(a0 + d), ey = y + r * Math.sin(a0 + d);
      this.path.push(`${this.path.length ? 'L' : 'M'}${f(sx)} ${f(sy)}A${f(r)} ${f(r)} 0 ${Math.abs(d) > Math.PI ? 1 : 0} ${d > 0 ? 1 : 0} ${f(ex)} ${f(ey)}`); this.cx = ex; this.cy = ey;
    }
    ellipse(x, y, rx, ry, rot, a0, a1, ccw) {
      const TAU = Math.PI * 2, c = Math.cos(rot), s = Math.sin(rot); const P = a => [x + rx * Math.cos(a) * c - ry * Math.sin(a) * s, y + rx * Math.cos(a) * s + ry * Math.sin(a) * c];
      let d = a1 - a0; if (!ccw && d < 0) d = ((d % TAU) + TAU) % TAU; if (ccw && d > 0) d = -(((-d) % TAU) + TAU) % TAU;
      const deg = rot * 180 / Math.PI, [sx, sy] = P(a0);
      if (Math.abs(d) >= TAU - 1e-6) { const [mx, my] = P(a0 + Math.PI); this.path.push(`${this.path.length ? 'L' : 'M'}${f(sx)} ${f(sy)}A${f(rx)} ${f(ry)} ${f(deg)} 1 1 ${f(mx)} ${f(my)}A${f(rx)} ${f(ry)} ${f(deg)} 1 1 ${f(sx)} ${f(sy)}`); return; }
      const [ex, ey] = P(a0 + d); this.path.push(`${this.path.length ? 'L' : 'M'}${f(sx)} ${f(sy)}A${f(rx)} ${f(ry)} ${f(deg)} ${Math.abs(d) > Math.PI ? 1 : 0} ${d > 0 ? 1 : 0} ${f(ex)} ${f(ey)}`); this.cx = ex; this.cy = ey;
    }
    arcTo(x1, y1, x2, y2, r) {                   // standard tangent-arc construction
      const x0 = this.cx, y0 = this.cy; const v1 = [x0 - x1, y0 - y1], v2 = [x2 - x1, y2 - y1], l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
      if (!l1 || !l2 || !r) { this.lineTo(x1, y1); return; }
      const u1 = [v1[0] / l1, v1[1] / l1], u2 = [v2[0] / l2, v2[1] / l2], cos = u1[0] * u2[0] + u1[1] * u2[1], ang = Math.acos(Math.max(-1, Math.min(1, cos)));
      if (Math.abs(Math.sin(ang)) < 1e-6) { this.lineTo(x1, y1); return; }
      const t = r / Math.tan(ang / 2), p1 = [x1 + u1[0] * t, y1 + u1[1] * t], p2 = [x1 + u2[0] * t, y1 + u2[1] * t], cross = u1[0] * u2[1] - u1[1] * u2[0];
      this.path.push(`${this.path.length ? 'L' : 'M'}${f(p1[0])} ${f(p1[1])}A${f(r)} ${f(r)} 0 0 ${cross < 0 ? 1 : 0} ${f(p2[0])} ${f(p2[1])}`); this.cx = p2[0]; this.cy = p2[1];
    }
    // ---- paint ----
    _matrix() { return `matrix(${this.m.map(v => f(v)).join(' ')})`; }
    _paint(v, forStroke) {
      if (v instanceof Grad) {
        if (!v.id) {
          v.id = 'g' + this.uid++; const st = v.stops.map(([o, c]) => `<stop offset="${f(o)}" stop-color="${esc(solid(c).c)}" stop-opacity="${solid(c).a}"/>`).join('');
          this.defs.push(v.kind === 'linear' ? `<linearGradient id="${v.id}" gradientUnits="userSpaceOnUse" x1="${f(v.args[0])}" y1="${f(v.args[1])}" x2="${f(v.args[2])}" y2="${f(v.args[3])}">${st}</linearGradient>` : `<radialGradient id="${v.id}" gradientUnits="userSpaceOnUse" cx="${f(v.args[3])}" cy="${f(v.args[4])}" r="${f(v.args[5])}" fx="${f(v.args[0])}" fy="${f(v.args[1])}">${st}</radialGradient>`);
        }
        return { fill: `url(#${v.id})`, op: 1 };
      }
      const s = solid(v); return { fill: s.c, op: s.a };
    }
    _wrap(inner, extra) {
      let el = inner;
      const sh = solid(this.shadowColor);
      if (sh.a > 0 && (this.shadowBlur || this.shadowOffsetX || this.shadowOffsetY)) {
        const id = 'f' + this.uid++; this.defs.push(`<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="${f(this.shadowOffsetX)}" dy="${f(this.shadowOffsetY)}" stdDeviation="${f(this.shadowBlur / 2)}" flood-color="${esc(sh.c)}" flood-opacity="${sh.a}"/></filter>`);
        el = `<g filter="url(#${id})">${el}</g>`;
      }
      for (let i = this.clips.length - 1; i >= 0; i--) el = `<g clip-path="url(#${this.clips[i]})">${el}</g>`;
      this.out.push(el + (extra || ''));
    }
    _pathD() { return this.path.join(''); }
    fill(a, b) {
      const rule = typeof a === 'string' ? a : b; if (a && typeof a === 'object' && a.d) { this.svgPath(a.d, this.fillStyle, rule); return; }
      if (!this.path.length) return; const p = this._paint(this.fillStyle);
      this._wrap(`<path d="${this._pathD()}" transform="${this._matrix()}" fill="${esc(p.fill)}"${p.op < 1 ? ` fill-opacity="${p.op}"` : ''}${this.globalAlpha < 1 ? ` opacity="${f(this.globalAlpha)}"` : ''}${rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}/>`);
    }
    stroke() {
      if (!this.path.length) return; const p = this._paint(this.strokeStyle);
      this._wrap(`<path d="${this._pathD()}" transform="${this._matrix()}" fill="none" stroke="${esc(p.fill)}"${p.op < 1 ? ` stroke-opacity="${p.op}"` : ''} stroke-width="${f(this.lineWidth)}" stroke-linecap="${this.lineCap === 'butt' ? 'butt' : this.lineCap}" stroke-linejoin="${this.lineJoin}"${this.dash.length ? ` stroke-dasharray="${this.dash.map(f).join(' ')}"` : ''}${this.globalAlpha < 1 ? ` opacity="${f(this.globalAlpha)}"` : ''}/>`);
    }
    clip() { const id = 'c' + this.uid++; this.defs.push(`<clipPath id="${id}"><path d="${this._pathD()}" transform="${this._matrix()}"/></clipPath>`); this.clips.push(id); }
    fillRect(x, y, w, h) { const keep = this.path; this.path = []; this.rect(x, y, w, h); this.fill(); this.path = keep; }
    strokeRect(x, y, w, h) { const keep = this.path; this.path = []; this.rect(x, y, w, h); this.stroke(); this.path = keep; }
    clearRect() { /* a fresh recording is always transparent */ }
    svgPath(d, color, rule) { const p = this._paint(color); this._wrap(`<path d="${d}" transform="${this._matrix()}" fill="${esc(p.fill)}"${p.op < 1 ? ` fill-opacity="${p.op}"` : ''}${this.globalAlpha < 1 ? ` opacity="${f(this.globalAlpha)}"` : ''}${rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}/>`); }
    dotPattern(step, color) {
      const id = 'p' + this.uid++, s = solid(color);
      this.defs.push(`<pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse" x="${step - 1}" y="${step - 1}"><rect width="2.2" height="2.2" fill="${esc(s.c)}" fill-opacity="${s.a}"/></pattern>`);
      this.out.push(`<rect id="dot-grid" width="${this.W}" height="${this.H}" fill="url(#${id})"/>`);
    }
    // ---- text ----
    _font() {
      const m = /^\s*(?:(italic|oblique)\s+)?(?:(\d{3}|bold|normal)\s+)?([\d.]+)px\s+(.+)$/.exec(this.font) || [];
      return { style: m[1] || 'normal', weight: m[2] === 'bold' ? 700 : (m[2] && m[2] !== 'normal' ? m[2] : 400), size: parseFloat(m[3]) || 16, family: (m[4] || 'sans-serif').trim() };
    }
    fillText(text, x, y) {
      text = String(text); if (!text) return;
      const ft = this._font(), mt = this.measureText(text), size = ft.size;
      const asc = mt.fontBoundingBoxAscent != null ? mt.fontBoundingBoxAscent : size * 0.8, desc = mt.fontBoundingBoxDescent != null ? mt.fontBoundingBoxDescent : size * 0.2;
      let base = y; if (this.textBaseline === 'top' || this.textBaseline === 'hanging') base = y + asc; else if (this.textBaseline === 'middle') base = y + (asc - desc) / 2; else if (this.textBaseline === 'bottom') base = y - desc;
      const ls = parseFloat(this.letterSpacing) || 0, w = mt.width, align = this.textAlign === 'center' ? 'center' : (this.textAlign === 'right' || this.textAlign === 'end') ? 'right' : 'left';
      const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x, p = this._paint(this.fillStyle);
      // text is recorded, not written: neighbouring runs of one line / paragraph are merged into one text element at the end
      this.out.push({ t: 'text', text, left, w, base, size, asc, desc, ls, align, family: ft.family, weight: ft.weight, style: ft.style, font: this.font, fill: p.fill, op: p.op, alpha: this.globalAlpha, m: this.m.slice(), clips: this.clips.join(',') });
    }
    strokeText() { /* not used by the layouts */ }
    drawImage(im, x, y, w, h) {
      const src = im && (im.currentSrc || im.src); if (!src || !/^data:|^https?:/.test(src)) return;
      const flt = this.filter && this.filter !== 'none' ? ` style="filter:${esc(this.filter)}"` : '';
      this._wrap(`<image href="${esc(src)}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" preserveAspectRatio="none" transform="${this._matrix()}"${this.globalAlpha < 1 ? ` opacity="${f(this.globalAlpha)}"` : ''}${flt}/>`);
    }
    // ---- structure (named groups become layers in Figma) ----
    group(name) { this.out.push(`<g id="${esc(String(name).replace(/[^\w-]+/g, '-'))}">`); this.groups++; }
    endGroup() { if (this.groups > 0) { this.out.push('</g>'); this.groups--; } }
    // merge consecutive text runs: same font, matrix and clip → one line (runs keep their colours), stacked lines → one paragraph
    _blocks() {
      const out = [], same = (a, b) => a.font === b.font && a.ls === b.ls && a.clips === b.clips && a.alpha === b.alpha && a.m.every((v, i) => Math.abs(v - b.m[i]) < 0.01);
      let blk = null;
      for (const el of this.out) {
        if (typeof el === 'string') { blk = null; out.push(el); continue; }
        const run = { text: el.text, fill: el.fill, op: el.op };
        if (blk && same(blk, el) && el.align === 'left' && blk.align === 'left') {
          const ln = blk.lines[blk.lines.length - 1], gap = el.left - ln.end;
          if (Math.abs(el.base - ln.base) < 0.6 && gap > -2 && gap < el.size * 0.75) { if (gap > el.size * 0.12) ln.runs.push({ text: ' ', fill: run.fill, op: run.op }); ln.runs.push(run); ln.end = el.left + el.w; continue; }
          const step = el.base - ln.base;
          if (Math.abs(el.left - blk.left) < 1.5 && step > el.size * 0.8 && step < el.size * 1.9 && (blk.step == null || Math.abs(step - blk.step) < 1.5)) { blk.step = step; blk.lines.push({ base: el.base, end: el.left + el.w, runs: [run] }); continue; }
        }
        blk = Object.assign({}, el, { t: 'block', lines: [{ base: el.base, end: el.left + el.w, runs: [run] }], step: null }); out.push(blk);
      }
      return out;
    }
    _textSVG(b) {
      const esc2 = t => esc(t);
      const body = b.lines.map(ln => `<tspan x="${f(b.left)}" y="${f(ln.base)}">${ln.runs.map(r => `<tspan fill="${esc(r.fill)}"${r.op < 1 ? ` fill-opacity="${r.op}"` : ''}>${esc2(r.text)}</tspan>`).join('')}</tspan>`).join('');
      let el = `<text xml:space="preserve" transform="${`matrix(${b.m.map(v => f(v)).join(' ')})`}" font-family="${esc(b.family)}" font-size="${f(b.size)}" font-weight="${b.weight}"${b.style !== 'normal' ? ` font-style="${b.style}"` : ''}${b.ls ? ` letter-spacing="${f(b.ls)}"` : ''}${b.alpha < 1 ? ` opacity="${f(b.alpha)}"` : ''}>${body}</text>`;
      if (b.clips) b.clips.split(',').reverse().forEach(id => (el = `<g clip-path="url(#${id})">${el}</g>`));
      return el;
    }
    // the same recording as Figma nodes: groups → groups, text → live text, everything else → SVG chunks
    toFigma(meta) {
      while (this.groups > 0) this.endGroup();
      const root = { type: 'group', name: (meta && meta.name) || 'Slide', children: [] }, stack = [root]; let buf = [];
      const W = this.W, H = this.H, defs = this.defs.join('');
      const flush = () => { if (!buf.length) return; stack[stack.length - 1].children.push({ type: 'svg', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${buf.join('')}</svg>` }); buf = []; };
      for (const el of this._blocks()) {
        if (typeof el === 'string') {
          const g = /^<g id="([^"]*)">$/.exec(el);
          if (g) { flush(); const grp = { type: 'group', name: g[1].replace(/-/g, ' '), children: [] }; stack[stack.length - 1].children.push(grp); stack.push(grp); }
          else if (el === '</g>') { flush(); if (stack.length > 1) stack.pop(); }
          else buf.push(el);
          continue;
        }
        flush(); stack[stack.length - 1].children.push(textNode(el));
      }
      flush();
      return root.children;
    }
    toString(meta) {
      while (this.groups > 0) this.endGroup();
      this.out = this._blocks().map(el => (typeof el === 'string' ? el : this._textSVG(el)));
      const fonts = (meta && meta.fonts) || [];
      return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${this.W}" height="${this.H}" viewBox="0 0 ${this.W} ${this.H}">\n<!-- Sixjuly Flow export. Text, shapes and photos are real SVG elements. Fonts used: ${esc(fonts.join(', '))} -->\n<defs>${this.defs.join('')}</defs>\n${this.out.join('\n')}\n</svg>\n`;
    }
  }

  // parse '#rrggbb', 'rgb()', 'rgba()' into a colour + alpha for SVG
  function solid(c) {
    c = String(c == null ? '#000' : c).trim();
    let m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?\s*\)$/.exec(c);
    if (m) return { c: `rgb(${Math.round(m[1])},${Math.round(m[2])},${Math.round(m[3])})`, a: m[4] == null ? 1 : +m[4] };
    if (/^#[0-9a-f]{8}$/i.test(c)) return { c: c.slice(0, 7), a: parseInt(c.slice(7), 16) / 255 };
    return { c, a: c === 'transparent' ? 0 : 1 };
  }
  // a merged text block → a Figma text node description (position = top-left of the box in slide space, before rotation)
  const STYLE_NAMES = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
  function textNode(b) {
    const m = b.m, k = Math.hypot(m[0], m[1]) || 1, cos = m[0] / k, sin = m[1] / k, nat = b.asc + b.desc, lh = b.step || nat;
    const top = b.lines[0].base - ((lh - nat) / 2 + b.asc), px = m[0] * b.left + m[2] * top + m[4], py = m[1] * b.left + m[3] * top + m[5];
    let chars = '', ranges = [];
    b.lines.forEach((ln, i) => { if (i) chars += '\n'; ln.runs.forEach(r => { const s0 = chars.length; chars += r.text; ranges.push({ s: s0, e: chars.length, fill: r.fill, op: r.op }); }); });
    const merged = []; ranges.forEach(r => { const l = merged[merged.length - 1]; if (l && l.fill === r.fill && l.op === r.op && l.e === r.s) l.e = r.e; else merged.push(Object.assign({}, r)); });
    const family = String(b.family).split(',')[0].replace(/["']/g, '').trim(), w = Number(b.weight) || 400, italic = b.style === 'italic';
    return { type: 'text', chars, family, weight: w, style: (STYLE_NAMES[Math.round(w / 100) * 100] || 'Regular') + (italic ? ' Italic' : ''), italic, size: +(b.size * k).toFixed(2), lineHeight: +(lh * k).toFixed(2), letterSpacing: +(b.ls * k).toFixed(2),
      align: b.lines.length === 1 ? (b.align || 'left') : 'left', x: +px.toFixed(2), y: +py.toFixed(2), rotation: +(Math.atan2(sin, cos) * 180 / Math.PI).toFixed(3), cos: +cos.toFixed(6), sin: +sin.toFixed(6), opacity: b.alpha, ranges: merged,
      fill: merged.length ? merged[0].fill : '#000', name: chars.replace(/\s+/g, ' ').slice(0, 48) };
  }
  window.SixjulySVG = SixjulySVG;
})();
