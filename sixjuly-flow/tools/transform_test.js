// Undo in the flow graph and the editor, and rotate / resize / number fields on layout elements.
//   node tools/transform_test.js
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } }); const errors = []; p.on('pageerror', e => errors.push(e.message));
  const ok = (c, m) => { if (!c) errors.push(m); };
  await p.goto('file://' + path.join(__dirname, '../index.html')); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.node');
  // graph: delete a node, ⌘Z brings it back, ⇧⌘Z removes it again; a field change undoes too
  const n0 = await p.evaluate(() => SixjulyGraph.nodes.length);
  await p.evaluate(() => SixjulyGraph.remove(SixjulyGraph.nodes[0].id)); await p.keyboard.press('Control+z');
  ok(await p.evaluate(() => SixjulyGraph.nodes.length) === n0, 'graph undo did not restore the node');
  await p.keyboard.press('Control+Shift+z'); ok(await p.evaluate(() => SixjulyGraph.nodes.length) === n0 - 1, 'graph redo failed'); await p.click('#undoBtn');
  ok(await p.evaluate(() => SixjulyGraph.nodes.length) === n0, 'undo button failed');
  const sel = await p.$('.node.k-design select'); const before = await sel.evaluate(s => s.value); await sel.selectOption('swiss'); await p.waitForTimeout(450); await p.focus('.node.k-design select'); await p.keyboard.press('Control+z');
  ok(await p.evaluate(() => SixjulyGraph.nodes.find(n => n.type === 'design').params.style) === before, 'field change not undone while a select had focus');
  // editor
  await p.click('#exBtn'); await p.click('#exMenu button >> text=Layout showcase'); await p.click('#runBtn'); await p.waitForSelector('.rc .strip canvas', { timeout: 40000 }); await p.waitForTimeout(400);
  await p.click('.rc >> nth=0 >> text=Edit'); await p.waitForTimeout(500);
  const i = await p.evaluate(() => SixjulyEditor._state().deck.slides.findIndex(s => s.kind === 'tiles')); await p.click(`.fc[data-i="${i}"]`); await p.waitForTimeout(200);
  const ov = await (await p.$('.ov')).boundingBox();
  await p.mouse.click(ov.x + ov.width * 0.3, ov.y + ov.height * 0.55); await p.waitForTimeout(150);
  const key = await p.evaluate(() => SixjulyEditor._state().key); ok(key && key.startsWith('visual'), 'no tile selected: ' + key);
  ok(await p.$$eval('.geom input', x => x.length) === 4, 'number fields missing');
  const rb = await (await p.$('.hd.rot')).boundingBox(); await p.mouse.move(rb.x + 5, rb.y + 5); await p.mouse.down(); await p.mouse.move(rb.x + 160, rb.y + 70, { steps: 6 }); await p.mouse.up();
  const r1 = await p.evaluate(k => ((SixjulyEditor._state().deck.slides[SixjulyEditor._state().i].o || {}).items || {})[k], key); ok(r1 && r1.r, 'rotation not stored');
  await p.fill('.geom input >> nth=3', '15'); await p.press('.geom input >> nth=3', 'Enter'); await p.waitForTimeout(100);
  const r2 = await p.evaluate(k => SixjulyEditor._state().deck.slides[SixjulyEditor._state().i].o.items[k].r, key); ok(Math.abs(r2 - 15 * Math.PI / 180) < 1e-6, 'rotation field failed ' + r2);
  await p.click('.stagewrap', { position: { x: 5, y: 5 } }).catch(() => {}); await p.keyboard.press('Control+z');
  const r3 = await p.evaluate(k => SixjulyEditor._state().deck.slides[SixjulyEditor._state().i].o.items[k].r, key); ok(Math.abs(r3 - r1.r) < 1e-6, 'editor undo of the rotation field failed');
  // headline: drag the right side to re-wrap
  await p.mouse.click(ov.x + ov.width * 0.2, ov.y + ov.height * 0.17); await p.waitForTimeout(150);
  ok(await p.evaluate(() => SixjulyEditor._state().key) === 'head0', 'headline not selected');
  const eb = await (await p.$('.hd.e')).boundingBox(); await p.mouse.move(eb.x + 5, eb.y + 5); await p.mouse.down(); await p.mouse.move(eb.x - 250, eb.y + 5, { steps: 5 }); await p.mouse.up();
  const w = await p.evaluate(() => SixjulyEditor._state().deck.slides[SixjulyEditor._state().i].o.head.w); ok(w > 100 && w < 900, 'headline width not set: ' + w);
  console.log({ graphNodes: n0, tile: key, rotation: r1 && +r1.r.toFixed(3), headWidth: w });
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors'); await b.close(); process.exit(errors.length ? 1 : 0);
})();
