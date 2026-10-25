// Exports the layout showcase as a Figma post (as "Add to Figma" does), checks every SVG chunk parses, then runs the importer plugin
// (figma-plugin/code.js) against a stand-in for the Figma API and checks that text arrives as merged, editable text layers.
//   node tools/figma_test.js
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'), vm = require('vm');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto('file://' + path.join(__dirname, '../index.html')); await p.waitForSelector('.node');
  const res = await p.evaluate(async () => {
    const R = SixjulyRender; await R.loadFonts({});
    const out = {};
    for (const style of ['sixjuly', 'editorial', 'classic']) {
      const deck = { topic: 'Showcase', brand: {}, design: { theme: 'auto', style }, slides: SixjulyCopy.showcase().slides };
      const data = SixjulyExport.figmaData(deck, { title: 'Showcase ' + style }, { ratio: '1080x1350' });
      let bad = 0, chunks = 0; const walk = ns => ns.forEach(n => { if (n.type === 'svg') { chunks++; const d = new DOMParser().parseFromString(n.svg, 'image/svg+xml'); if (d.querySelector('parsererror')) bad++; } if (n.children) walk(n.children); });
      data.slides.forEach(s => walk(s.nodes)); out[style] = { data, bad, chunks };
    }
    return out;
  });
  await b.close();
  const fonts = new Set(['Google Sans Flex|Regular', 'Google Sans Flex|Medium', 'Google Sans Flex|SemiBold', 'Google Sans Flex|Bold', 'Google Sans Flex|ExtraBold', 'Google Sans Flex|Light', 'Geist Mono|Regular', 'Geist Mono|Medium', 'Geist Mono|SemiBold', 'Geist Mono|Bold', 'Instrument Serif|Regular', 'Instrument Serif|Italic', 'Anton|Regular', 'Inter|Regular', 'Inter|Medium', 'Inter|Bold', 'Inter|Italic']);
  for (const [style, r] of Object.entries(res)) {
    // a minimal stand-in for the Figma plugin API
    const made = { frames: 0, texts: [], svgs: 0, groups: 0 }, msgs = [];
    const node = (type, o) => Object.assign({ type, children: [], parent: null, x: 0, y: 0, name: '', appendChild(c) { if (c.parent) c.parent.children = c.parent.children.filter(k => k !== c); c.parent = this; this.children.push(c); }, remove() { if (this.parent) this.parent.children = this.parent.children.filter(k => k !== this); }, resize(w, h) { this.width = w; this.height = h; } }, o || {});
    const page = node('PAGE');
    const figma = {
      showUI() {}, ui: { postMessage: m => msgs.push(m), onmessage: null }, currentPage: page, viewport: { center: { x: 0, y: 0 }, scrollAndZoomIntoView() {} },
      loadFontAsync: async f => { if (!fonts.has(f.family + '|' + f.style)) throw new Error('missing ' + f.family + ' ' + f.style); },
      createFrame: () => (made.frames++, node('FRAME')),
      createText: () => { const t = node('TEXT', { setRangeFills(s, e, f) { (this.rf = this.rf || []).push([s, e, f]); } }); made.texts.push(t); return t; },
      createNodeFromSvg: svg => { made.svgs++; const f = node('FRAME'); const v = node('VECTOR'); f.appendChild(v); if (!/^<svg[\s\S]*<\/svg>$/.test(svg)) throw new Error('bad svg'); return f; },
      group: (kids, parent) => { made.groups++; const g = node('GROUP'); parent.appendChild(g); kids.forEach(k => g.appendChild(k)); return g; },
      createSection: () => node('SECTION', { resizeWithoutConstraints() {} }),
    };
    Object.defineProperty(figma.currentPage, 'selection', { set() {}, get() { return []; } });
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../figma-plugin/code.js'), 'utf8'), { figma, __html__: '', console });
    await figma.ui.onmessage({ type: 'import', data: JSON.parse(JSON.stringify(r.data)) });
    const done = msgs.find(m => m.type === 'done'), err = msgs.find(m => m.type === 'error');
    const chars = made.texts.map(t => t.characters), headline = chars.find(c => /Design systems that/.test(c.replace(/\n/g, ' '))) || '';
    const perWord = made.texts.filter(t => /^\S+$/.test(t.characters) && t.characters.length > 3 && /[a-z]/.test(t.characters)).length;
    console.log(style, { frames: made.frames, textLayers: made.texts.length, svgChunks: made.svgs, groups: made.groups, badSvg: r.bad, singleWordLayers: perWord, headline: JSON.stringify(headline), missing: done && done.missing, error: err && err.message });
    if (err || r.bad || !done || (style !== 'classic' && !/Design systems that ship/.test(headline.replace(/\n/g, ' ')))) errors.push(style + ' failed');
    if (style === 'sixjuly') { console.log('  single-word layers:', made.texts.filter(t => /^\S+$/.test(t.characters) && t.characters.length > 3 && /[a-z]/.test(t.characters)).map(t => t.characters).join(' | ')); const ex = made.texts.find(t => (t.rf || []).length > 1); console.log('  colour ranges on a text layer:', ex ? JSON.stringify(ex.characters) + ' ' + ex.rf.length + ' ranges' : 'none'); fs.writeFileSync(path.join(process.env.OUT || '/tmp', 'showcase.sixjuly.json'), JSON.stringify(r.data)); }
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors'); process.exit(errors.length ? 1 : 0);
})();
