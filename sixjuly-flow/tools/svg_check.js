// Renders each showcase slide twice (canvas, then SVG → image) and reports how close they are; saves a side-by-side sheet.
//   node tools/svg_check.js out.png [style]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => m.type() === 'error' && !/fonts|ERR/.test(m.text()) && console.log('CONSOLE', m.text()));
  await p.setContent('<body></body>');
  for (const f of ['logo', 'render', 'layouts', 'layouts2', 'layouts3', 'svgctx', 'copy']) await p.addScriptTag({ path: path.join(__dirname, `../${f}.js`) });
  const style = process.argv[3] || 'sixjuly';
  const res = await p.evaluate(async (style) => {
    const R = window.SixjulyRender; await R.loadFonts({});
    const deck = { brand: {}, design: { theme: style === 'sixjuly' ? 'light' : 'auto', style, art: 'orb' }, slides: SixjulyCopy.showcase().slides };
    const out = [], W = 1080, H = 1350;
    for (let i = 0; i < deck.slides.length; i++) {
      const a = document.createElement('canvas'); a.width = W; a.height = H; const ca = a.getContext('2d'); R.drawSlide(ca, deck, i, { W, H });
      let svg; try { svg = R.toSVG(deck, i, { W, H }); } catch (e) { out.push({ i, kind: deck.slides[i].kind, err: e.message }); continue; }
      const im = new Image(); await new Promise(r => { im.onload = im.onerror = r; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
      const c = document.createElement('canvas'); c.width = W; c.height = H; const cc = c.getContext('2d'); cc.fillStyle = '#fff'; cc.fillRect(0, 0, W, H); cc.drawImage(im, 0, 0);
      const da = ca.getImageData(0, 0, W, H).data, dc = cc.getImageData(0, 0, W, H).data; let diff = 0, n = 0;
      for (let k = 0; k < da.length; k += 16) { n++; if (Math.abs(da[k] - dc[k]) + Math.abs(da[k + 1] - dc[k + 1]) + Math.abs(da[k + 2] - dc[k + 2]) > 60) diff++; }
      out.push({ i, kind: deck.slides[i].kind + (deck.slides[i].cover ? ':' + deck.slides[i].cover : ''), diffPct: +(diff / n * 100).toFixed(2), kb: Math.round(svg.length / 1024), texts: (svg.match(/<text /g) || []).length, a: a.toDataURL('image/png'), c: c.toDataURL('image/png'), svg: i === 3 || i === 4 ? svg : '' });
    }
    return out;
  }, style);
  res.forEach(r => console.log(r.i, r.kind, r.err ? 'ERR ' + r.err : `diff ${r.diffPct}%  ${r.kb}KB  ${r.texts} text elements`));
  const pick = res.filter(r => r.a).slice(0, 12); const out = process.argv[2] || 'svg-check.png';
  const html = '<body style="margin:0;background:#444;display:flex;flex-wrap:wrap;gap:6px;width:2400px">' + pick.map(r => `<div style="width:380px"><img src="${r.a}" width=190><img src="${r.c}" width=190></div>`).join('') + '</body>';
  const p2 = await b.newPage({ viewport: { width: 2400, height: 1100 } }); await p2.setContent(html); await p2.waitForTimeout(500); await p2.screenshot({ path: out });
  const s = res.find(r => r.svg); if (s) fs.writeFileSync(out.replace(/\.png$/, '.svg'), s.svg);
  await b.close();
})();
