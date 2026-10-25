// Fields inside the flow nodes must be big enough to use and must react to clicks, in a wide and in a narrow window.
//   node tools/node_controls_test.js
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }); const errors = [];
  for (const [w, h] of [[1500, 900], [900, 700], [760, 640]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errors.push(e.message));
    await p.goto('file://' + path.join(__dirname, '../index.html')); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.node'); await p.waitForTimeout(600);
    const k = await p.evaluate(() => SixjulyGraph.view.k);
    // pan the Design node into view, then use its dropdown with a real click + keyboard
    await p.evaluate(() => { const G = SixjulyGraph, n = G.nodes.find(x => x.type === 'design'), r = document.getElementById('graph').getBoundingClientRect(); G.view.x = 40 - n.x * G.view.k; G.view.y = 60 - n.y * G.view.k; G.redraw(); document.querySelector('.world').style.transform = `translate(${G.view.x}px,${G.view.y}px) scale(${G.view.k})`; void r; });
    const sel = await p.$('.node.k-design select'), bb = await sel.boundingBox();
    await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(100);
    const focused = await p.evaluate(() => document.activeElement && document.activeElement.closest('.node.k-design') && document.activeElement.tagName);
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
    const style = await p.evaluate(() => SixjulyGraph.nodes.find(x => x.type === 'design').params.style);
    // a segmented button and a text field in the same node
    const seg = await p.$('.node.k-design .seg button:not(.on)'); const sb = await seg.boundingBox(); await p.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2); await p.waitForTimeout(100);
    const segOn = await p.evaluate(() => document.querySelectorAll('.node.k-design .seg button.on').length > 0);
    const rhythm = await p.evaluate(() => SixjulyGraph.nodes.find(x => x.type === 'design').params.rhythm);
    const res = { viewport: w + '×' + h, zoom: +k.toFixed(2), selectHeightPx: Math.round(bb.height), focused, style, rhythm, segOn };
    console.log(res);
    if (bb.height < 22) errors.push(w + ': dropdown too small (' + bb.height + ' px)');
    if (focused !== 'SELECT') errors.push(w + ': dropdown did not take the click');
    if (style === 'sixjuly') errors.push(w + ': dropdown value did not change');
    if (rhythm !== 'alternate') errors.push(w + ': segmented button did not change');
    await p.close();
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors'); await b.close(); process.exit(errors.length ? 1 : 0);
})();
