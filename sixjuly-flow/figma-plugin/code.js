// Sixjuly Flow importer — rebuilds posts exported by Sixjuly Flow ("Add to Figma") as frames.
// Text arrives as real, editable text layers (font, size, line height, letter spacing, colour ranges);
// shapes, panels and photos arrive as vectors / images inside named groups. Nothing is sent anywhere.
figma.showUI(__html__, { width: 380, height: 460, themeColors: true });

const STYLE_TRY = {
  Thin: ['Thin', 'Hairline'], ExtraLight: ['ExtraLight', 'Extra Light', 'UltraLight', 'Light'], Light: ['Light'], Regular: ['Regular', 'Book', 'Normal'],
  Medium: ['Medium', 'Regular'], SemiBold: ['SemiBold', 'Semi Bold', 'Semibold', 'DemiBold', 'Bold'], Bold: ['Bold'], ExtraBold: ['ExtraBold', 'Extra Bold', 'Heavy', 'Black', 'Bold'], Black: ['Black', 'Heavy', 'ExtraBold', 'Bold'],
};
const fontCache = new Map(), missing = new Set();
async function tryFont(family, style) { const key = family + '|' + style; if (fontCache.has(key)) return fontCache.get(key); let ok = null; try { await figma.loadFontAsync({ family, style }); ok = { family, style }; } catch (e) { ok = null; } fontCache.set(key, ok); return ok; }
async function pickFont(n) {
  const base = String(n.style || 'Regular').replace(/ Italic$/, ''), italic = !!n.italic, names = STYLE_TRY[base] || [base, 'Regular'];
  const styles = italic ? names.map(s => (s === 'Regular' ? 'Italic' : s + ' Italic')).concat(names) : names;
  for (const s of styles) { const f = await tryFont(n.family, s); if (f) return f; }
  missing.add(n.family);
  for (const s of (italic ? ['Italic', base, 'Regular'] : [base, 'Regular'])) { const f = await tryFont('Inter', s); if (f) return f; }
  return tryFont('Inter', 'Regular');
}
function paint(c, op) {
  const m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?\s*\)$/.exec(String(c || '').trim());
  let r = 0, g = 0, b = 0, a = 1;
  if (m) { r = m[1] / 255; g = m[2] / 255; b = m[3] / 255; if (m[4] != null) a = +m[4]; }
  else { let h = String(c || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); r = parseInt(h.slice(0, 2), 16) / 255 || 0; g = parseInt(h.slice(2, 4), 16) / 255 || 0; b = parseInt(h.slice(4, 6), 16) / 255 || 0; if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255; }
  return { type: 'SOLID', color: { r, g, b }, opacity: (op == null ? 1 : op) * a };
}
async function makeText(n) {
  const t = figma.createText(); t.fontName = await pickFont(n); t.characters = n.chars;
  t.fontSize = Math.max(1, n.size); t.lineHeight = { unit: 'PIXELS', value: Math.max(1, n.lineHeight) }; t.letterSpacing = { unit: 'PIXELS', value: n.letterSpacing || 0 };
  t.textAutoResize = 'WIDTH_AND_HEIGHT'; t.textAlignHorizontal = n.align === 'center' ? 'CENTER' : n.align === 'right' ? 'RIGHT' : 'LEFT';
  t.fills = [paint(n.fill)]; (n.ranges || []).forEach(r => { if (r.e > r.s) t.setRangeFills(r.s, r.e, [paint(r.fill, r.op)]); });
  t.relativeTransform = [[n.cos, -n.sin, n.x], [n.sin, n.cos, n.y]];
  if (n.opacity != null && n.opacity < 1) t.opacity = n.opacity;
  t.name = n.name || n.chars.slice(0, 40); return t;
}
async function build(parent, list) {
  const made = [];
  for (const n of list) {
    if (n.type === 'text') { const t = await makeText(n); parent.appendChild(t); made.push(t); }
    else if (n.type === 'svg') {
      let f; try { f = figma.createNodeFromSvg(n.svg); } catch (e) { continue; }
      parent.appendChild(f); f.x = 0; f.y = 0; const kids = [...f.children]; kids.forEach(k => parent.appendChild(k)); f.remove(); made.push(...kids);
    } else if (n.type === 'group') {
      const kids = await build(parent, n.children || []);
      if (!kids.length) continue;
      if (kids.length === 1) { kids[0].name = n.name; made.push(kids[0]); continue; }
      const g = figma.group(kids, parent); g.name = n.name; made.push(g);
    }
  }
  return made;
}
figma.ui.onmessage = async msg => {
  if (msg.type !== 'import') return;
  try {
    const data = msg.data; if (!data || data.kind !== 'sixjuly-figma' || !Array.isArray(data.slides)) throw new Error('This is not a Sixjuly Flow export. In the app use Export → Add to Figma.');
    const posts = Array.isArray(data.posts) ? data.posts : [{ name: data.name, slides: data.slides }];
    const vc = figma.viewport.center, frames = []; let y0 = Math.round(vc.y);
    for (const post of posts) {
      let x = Math.round(vc.x);
      for (const s of post.slides) {
        const fr = figma.createFrame(); fr.name = s.name; fr.resize(s.w, s.h); fr.x = x; fr.y = y0; fr.fills = [paint(s.bg || '#FFFFFF')]; fr.clipsContent = true;
        figma.currentPage.appendChild(fr); await build(fr, s.nodes || []); frames.push(fr); x += s.w + 80;
        figma.ui.postMessage({ type: 'progress', done: frames.length });
      }
      y0 += (post.slides[0] ? post.slides[0].h : 1350) + 200;
    }
    if (posts.length === 1 && frames.length > 1) { const sec = figma.createSection ? figma.createSection() : null; if (sec) { sec.name = posts[0].name || 'Sixjuly post'; const minX = Math.min(...frames.map(f => f.x)), minY = Math.min(...frames.map(f => f.y)); sec.x = minX - 60; sec.y = minY - 100; sec.resizeWithoutConstraints(Math.max(...frames.map(f => f.x + f.width)) - minX + 120, Math.max(...frames.map(f => f.y + f.height)) - minY + 160); frames.forEach(f => { sec.appendChild(f); f.x -= sec.x; f.y -= sec.y; }); } }
    figma.currentPage.selection = frames; figma.viewport.scrollAndZoomIntoView(frames);
    figma.ui.postMessage({ type: 'done', frames: frames.length, missing: [...missing] });
  } catch (e) { figma.ui.postMessage({ type: 'error', message: e.message || String(e) }); }
};
