// Checks the design-language library through the real UI: every style on the Design node, the styles deck, per-slide style in the editor.
//   node tools/styles_test.js
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } }); const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await p.goto('file://' + path.join(__dirname, '../index.html')); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.node');
  const info = await p.evaluate(() => ({ styles: SixjulyRender.STYLE_ORDER, kinds: SixjulyCopy.KINDS.length, design: SixjulyCopy.DESIGN.length }));
  console.log(info);
  // example flow: style packs
  await p.click('#exBtn'); await p.click('#exMenu button >> text=Style packs'); await p.click('#runBtn'); await p.waitForSelector('.rc .strip canvas', { timeout: 40000 }); await p.waitForTimeout(500);
  const deck = await p.evaluate(() => { const d = SixjulyFlow.api.state.outputs[0].decks[0]; return { n: d.slides.length, styles: d.slides.map(s => s.style || '-').join(','), design: d.design }; });
  console.log('styles deck', deck);
  if (deck.n < 8 || !deck.styles.includes('swiss') || !deck.styles.includes('glow')) errors.push('styles deck incomplete');
  // style select on the Design node
  const opts = await p.evaluate(() => { const sel = [...document.querySelectorAll('.node select')].find(s => [...s.options].some(o => o.value === 'swiss')); return sel ? [...sel.options].map(o => o.value).join(',') : null; });
  console.log('design node style options', opts); if (!opts || !opts.includes('poster')) errors.push('no style select on Design node');
  // every style renders every kind without throwing (pixel-checked: not blank)
  const res = await p.evaluate(async () => {
    const R = SixjulyRender; await R.loadFonts({}); const out = [], slides = SixjulyCopy.showcase().slides, W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    for (const style of R.STYLE_ORDER) { let bad = 0, errs = []; const deck = { brand: {}, design: { theme: 'auto', style, art: 'orb' }, slides };
      for (let i = 0; i < slides.length; i++) { try { ctx.clearRect(0, 0, W, H); R.drawSlide(ctx, deck, i, { W, H }); const d = ctx.getImageData(0, 0, W, H).data; let nz = 0; for (let k = 3; k < d.length; k += 64) if (d[k]) nz++; if (!nz) bad++; R.toSVG(deck, i, { W, H }); R.drawSlide(ctx, deck, i, { W: 1080, H: 1920 }); } catch (e) { errs.push(slides[i].kind + ': ' + e.message); } }
      out.push({ style, slides: slides.length, bad, errs: errs.slice(0, 3) }); }
    return out;
  });
  res.forEach(r => { console.log(r.style, r.slides + ' slides', 'blank', r.bad, r.errs.join(' | ')); if (r.bad || r.errs.length) errors.push('style ' + r.style + ' failed'); });
  // copy engine: new kinds survive normalizeStory; Claude prompt documents them
  const nz = await p.evaluate(() => { const st = SixjulyCopy.normalizeStory({ slides: [{ kind: 'cover', head: 'X' }, { kind: 'matrix', head: 'M', axes: { x: ['a', 'b'] }, dots: [{ label: 'd', x: 3, y: -1 }] }, { kind: 'metrics', head: 'N', stats: [{ value: '5×', label: 'ok' }], style: 'swiss' }, { kind: 'glossary', head: 'G', term: 'Grid' }, { kind: 'index', head: 'I', items: ['only one'] }, { kind: 'cta', head: 'C' }] }, { topic: 'T' }, 'patterns', {}); return { kinds: st.slides.map(s => s.kind).join(','), dot: st.slides[1].dots[0], axes: st.slides[1].axes, style: st.slides[2].style, sys: SixjulyCopy.SYSTEM.includes('glossary') }; });
  console.log('normalize', nz); if (nz.kinds !== 'cover,matrix,metrics,glossary,statement,cta' || nz.dot.x !== 1 || nz.dot.y !== 0 || nz.style !== 'swiss' || !nz.sys) errors.push('normalize wrong');
  // pattern engine uses the new layouts
  const pat = await p.evaluate(() => { const seen = new Set(); for (const t of ['Grid systems', 'Why rules matter', 'How we brief a logo', 'Brand principles', 'Layout rules']) for (const f of ['list', 'howto', 'reversal']) for (let sd = 0; sd < 3; sd++) SixjulyCopy.writePatterns({ topic: t, points: [] }, { format: f, slides: 8, seed: sd }).slides.forEach(s => seen.add(s.kind)); return [...seen].filter(k => SixjulyCopy.DESIGN.includes(k)); });
  console.log('pattern engine design kinds', pat); if (pat.length < 3) errors.push('pattern engine rarely uses new layouts');
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors'); await b.close(); process.exit(errors.length ? 1 : 0);
})();
