// Smoke test: loads the app, runs the default flow (offline pattern engine), checks the results and exports a zip + a short reel.
//   NODE_PATH=$(npm root -g) node tools/smoke_test.js [--shots dir] [--video]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2), shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
(async () => {
  const exe = process.env.CHROME || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 1 });
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await p.goto('file://' + path.join(__dirname, '../index.html'));
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForSelector('.node');
  const nodeCount = await p.locator('.node').count();
  if (shots) await p.screenshot({ path: path.join(shots, '1-flow.png') });
  await p.click('#runBtn');
  await p.waitForSelector('.rc', { timeout: 30000 });
  await p.waitForTimeout(500);
  const cards = await p.locator('.rc').count(), thumbs = await p.locator('.strip canvas').count(), reels = await p.locator('.reel canvas').count();
  if (shots) { await p.screenshot({ path: path.join(shots, '2-results.png') }); }
  const statuses = await p.evaluate(() => SixjulyGraph.nodes.map(n => n.type + ':' + n.status));
  console.log({ nodeCount, cards, thumbs, reels, statuses: statuses.join(' ') });
  // editor interactions: rewire by dragging, delete a wire, motion presets, add / delete nodes
  const box = async sel => { const b = await p.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const dotSel = (id, dir, port) => `.node[data-id="${id}"] .port.${dir}[data-port="${port}"] .dot`;
  await p.keyboard.press('Escape');
  // detach Design's copy input (n4) by dragging it off, then drop it back on
  const edges0 = await p.evaluate(() => SixjulyGraph.edges.length);
  let a = await box(dotSel('n4', 'in', 'stories'));
  await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(a.x - 60, a.y + 80, { steps: 5 }); const mid = await p.evaluate(() => SixjulyGraph.edges.length); await p.mouse.move(a.x, a.y, { steps: 5 }); await p.mouse.up();
  const edgesAfter = await p.evaluate(() => SixjulyGraph.edges.length);
  // a wrong-type drop must be refused
  a = await box(dotSel('n1', 'out', 'topics')); const bad = await box(dotSel('n4', 'in', 'brand'));
  await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(bad.x, bad.y, { steps: 6 }); await p.mouse.up();
  const edgesBad = await p.evaluate(() => SixjulyGraph.edges.length);
  await p.selectOption('.node.k-motion select >> nth=0', 'punchy');
  const motion = await p.evaluate(() => { const n = SixjulyGraph.nodes.find(x => x.type === 'motion'); return n.params.preset + '/' + n.params.head + '/' + n.params.transition; });
  await p.click('.node.k-motion .seg button >> text=Fast');
  const custom = await p.evaluate(() => SixjulyGraph.nodes.find(x => x.type === 'motion').params.preset);
  await p.click('#addBtn'); await p.click('#addMenu button >> text=Carousel post'); const added = await p.locator('.node').count();
  await p.evaluate(() => SixjulyGraph.remove(SixjulyGraph.nodes[SixjulyGraph.nodes.length - 1].id)); const removed = await p.locator('.node').count();
  console.log('editor', { edges0, mid, edgesAfter, edgesBad, motion, custom, added, removed });
  if (shots) { await p.click('.node.k-motion label.sw'); await p.screenshot({ path: path.join(shots, '3-motion.png') }); }
  // Claude path with the API mocked: checks the request and that the reply becomes slides
  let seen = null;
  await p.route('https://api.anthropic.com/v1/messages', async route => {
    seen = { headers: route.request().headers(), body: JSON.parse(route.request().postData()) };
    const story = { caption: 'Mock caption?', hashtags: ['#design', '#test'], slides: [
      { kind: 'cover', head: 'Mock Topic', sub: 'The [[short]] version', foot: 'Swipe.', tag: 'NEW' },
      { kind: 'stat', head: 'A [[big]] number', stat: { value: '3×', label: 'faster' }, foot: 'Because {{reasons}}.' },
      { kind: 'bogus', head: 'Unknown kinds become statements', foot: 'ok' },
      { kind: 'cta', head: 'Talk to [[us]]', btn: "Let's talk", foot: 'Follow @sixjulydesign' } ] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '```json\n' + JSON.stringify(story) + '\n```' }] }) });
  });
  const claude = await p.evaluate(async () => { SixjulyFlow.apiKey = 'sk-test'; const s = await SixjulyCopy.write({ topic: 'Mock topic', points: ['one'] }, { engine: 'claude', apiKey: 'sk-test', slides: 6 }); return { engine: s.engine, kinds: s.slides.map(x => x.kind).join(','), caption: s.caption, tags: s.hashtags.join(' ') }; });
  console.log('claude mock', claude, 'model=' + seen.body.model, 'key=' + seen.headers['x-api-key'], 'direct-access=' + seen.headers['anthropic-dangerous-direct-browser-access']);
  const auto = await p.evaluate(async () => { SixjulyFlow.apiKey = 'bad'; const s = await SixjulyCopy.write({ topic: 'Fallback topic', points: [] }, { engine: 'auto', apiKey: 'bad', slides: 5 }); return s.engine; });
  await p.unroute('https://api.anthropic.com/v1/messages');
  await p.route('https://api.anthropic.com/v1/messages', r => r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { message: 'invalid x-api-key' } }) }));
  const fb = await p.evaluate(async () => { const s = await SixjulyCopy.write({ topic: 'Fallback topic', points: [] }, { engine: 'auto', apiKey: 'bad', slides: 5 }); let strict = ''; try { await SixjulyCopy.write({ topic: 'x', points: [] }, { engine: 'claude', apiKey: 'bad' }); } catch (e) { strict = e.message; } return { auto: s.engine, strict }; });
  console.log('claude failure', fb); void auto;
  // programmatic export (also exercises the video encoder)
  const t0 = Date.now();
  const files = await p.evaluate(async () => (await SixjulyFlow.api.generate({ topics: 'Why rebrands work\nLess is more in UI', reel: false, slides: 5 })).map(f => [f.name, f.b64.length]));
  console.log('api files', files.length, files.slice(0, 4).map(f => f[0]).join(', '), (Date.now() - t0) + 'ms');
  if (args.includes('--video')) {
    const vf = await p.evaluate(async () => {
      SixjulyFlow.api.state.busy = false;
      const out = await SixjulyFlow.api.generate({ topics: 'Why rebrands work', reel: true, slides: 4, motion: 'punchy' });
      return out.map(f => [f.name, f.b64.length, f.name.endsWith('webm') || f.name.endsWith('mp4') ? f.b64 : '']).map(([n, l, d]) => [n, l, d]);
    });
    vf.forEach(([n, l, d]) => { console.log(n, l); if (d) fs.writeFileSync(path.join(shots || '.', path.basename(n)), Buffer.from(d, 'base64')); });
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
  await b.close();
  process.exit(errors.length ? 1 : 0);
})();
