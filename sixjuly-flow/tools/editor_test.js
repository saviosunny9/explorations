// Drives the focus view and the editor like a person would: select, drag, type, undo, add layers, reorder slides, export, reopen.
//   NODE_PATH=$(npm root -g) node tools/editor_test.js [--shots dir]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 920 }, acceptDownloads: true }); const p = await ctx.newPage(); const errors = [], log = {};
  p.on('pageerror', e => errors.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await p.goto('file://' + path.join(__dirname, '../index.html')); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.node');
  // capture downloads instead of saving
  await p.evaluate(() => { window.__dl = []; SixjulyExport.download = async (blob, name) => { window.__dl.push({ name, size: blob.size, type: blob.type, head: null }); window.__lastBlob = blob; window.__blobs = window.__blobs || {}; window.__blobs[name] = blob; }; });
  await p.click('#runBtn'); await p.waitForSelector('.rc', { timeout: 30000 });
  await p.click('.rc >> nth=0 >> text=Edit ⤢'); await p.waitForSelector('#focus:not([hidden]) .stage canvas');
  log.film = await p.locator('.film .fc').count(); log.slides = await p.evaluate(() => SixjulyEditor._state().deck.slides.length);
  if (shots) await p.screenshot({ path: path.join(shots, 'ed-1-open.png') });
  const geo = async key => p.evaluate(key => { const S = SixjulyEditor._state(), R = SixjulyRender, sc = R.sceneFor(S.deck, S.i, 1080, 1350), it = sc.items.find(x => x.key === key); if (!it) return null; const b = R.itemBox(sc, it), ov = document.querySelector('.ov').getBoundingClientRect(), k = ov.width / 1080; return { x: ov.left + (b.x + b.w / 2) * k, y: ov.top + (b.y + b.h / 2) * k, w: b.w * k, h: b.h * k, keys: sc.items.map(i => i.key).join(',') }; }, key);
  // slide 1 is the cover: select the headline and drag it
  let g = await geo('head0'); log.keys = g.keys;
  await p.mouse.click(g.x, g.y); log.sel = await p.evaluate(() => SixjulyEditor._state().key);
  await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.mouse.move(g.x + 40, g.y + 60, { steps: 6 }); await p.mouse.up();
  log.moved = await p.evaluate(() => JSON.stringify(SixjulyEditor._state().deck.slides[0].o));
  // double-click to type
  g = await geo('head0'); await p.mouse.dblclick(g.x, g.y);
  try { await p.waitForSelector('textarea.inline', { timeout: 4000 }); } catch (e) { console.log('DBLCLICK DID NOT OPEN', await p.evaluate(() => JSON.stringify({ key: SixjulyEditor._state().key, inline: !!SixjulyEditor._state().inline, active: document.activeElement.tagName + '.' + document.activeElement.className, dragging: !!SixjulyEditor._state().drag }))); await p.keyboard.press('Enter'); await p.waitForSelector('textarea.inline'); }
  await p.fill('textarea.inline', 'Edited [[headline]]'); await p.keyboard.press('Control+Enter');
  log.head = await p.evaluate(() => SixjulyEditor._state().deck.slides[0].head);
  // undo / redo
  await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.click('[data-act=undo]'); log.undo = await p.evaluate(() => SixjulyEditor._state().deck.slides[0].head);
  await p.click('[data-act=redo]'); log.redo = await p.evaluate(() => SixjulyEditor._state().deck.slides[0].head);
  // typography via the inspector: font size + alignment (selection is cleared by undo / redo, so select again)
  g = await geo('head0'); await p.mouse.click(g.x, g.y);
  await p.fill('.insp .isec:has(summary:text("Selected")) input[type=number]', '120'); await p.keyboard.press('Tab');
  log.size = await p.evaluate(() => JSON.stringify(SixjulyEditor._state().deck.slides[0].o.head));
  // add text, rectangle, photo layers
  await p.click('.insp .addgrid >> text=Text'); await p.click('.insp .addgrid >> text=Rectangle');
  log.layers = await p.evaluate(() => SixjulyEditor._state().deck.slides[0].layers.map(l => l.type).join(','));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4EIwDiqEF8oAL0kDAcw9EJGAAAAAElFTkSuQmCC', 'base64'); fs.writeFileSync('/tmp/t.png', png);
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('.insp .addgrid >> text=Photo…')]); await fc.setFiles('/tmp/t.png'); await p.waitForFunction(() => SixjulyEditor._state().deck.slides[0].layers.length === 3);
  // slide operations
  await p.evaluate(() => { const e = document.querySelectorAll('.film .fc')[1]; e.click(); });
  await p.click('.film .addslide'); await p.click('#addMenu >> text=Chat'); log.afterAdd = await p.evaluate(() => SixjulyEditor._state().deck.slides.map(s => s.kind).join(','));
  await p.click('.insp >> text=Duplicate slide'); await p.click('.insp >> text=Delete slide'); log.afterDup = await p.evaluate(() => SixjulyEditor._state().deck.slides.length);
  await p.click('.insp >> text=← Move'); log.afterMove = await p.evaluate(() => SixjulyEditor._state().deck.slides.map(s => s.kind).slice(0, 3).join(','));
  // views
  await p.click('.views >> text=All slides'); log.grid = await p.locator('.stage.grid canvas').count(); await p.click('.views >> text=One slide');
  await p.click('.zoomctl >> text=+'); log.zoom = await p.locator('.zv').textContent();
  if (shots) await p.screenshot({ path: path.join(shots, 'ed-2-edited.png') });
  // exports
  const names = ['This slide as PNG', 'All slides as PNG', 'PDF of the carousel', 'Editable SVG files', 'Figma pack', 'Everything (zip)'];
  for (const n of names) { await p.click('.fb >> text=Export ▾'); await p.click(`#expMenu >> text=${n}`); const before = await p.evaluate(() => window.__dl.length); try { await p.waitForFunction(b => window.__dl.length > b, before, { timeout: 60000 }); } catch (e) { console.log('EXPORT STALLED:', n, 'toast=', await p.evaluate(() => document.querySelector('#toast').textContent), 'menuOpen=', await p.evaluate(() => !!document.querySelector('#expMenu.open')), 'dl=', await p.evaluate(() => window.__dl.length)); throw e; } }
  log.downloads = await p.evaluate(() => window.__dl.map(d => d.name + ':' + Math.round(d.size / 1024) + 'KB').join(' | '));
  log.pdfHead = await p.evaluate(async () => { const b = Object.entries(window.__blobs).find(([n]) => n.endsWith('.pdf'))[1]; const t = await b.slice(0, 8).text(); const all = new Uint8Array(await b.arrayBuffer()); let s = new TextDecoder('latin1').decode(all.slice(-60)); return t.trim() + ' … ' + s.trim().split('\n').slice(-1)[0]; });
  log.svgInZip = await p.evaluate(async () => { const z = await JSZip.loadAsync(Object.entries(window.__blobs).find(([n]) => n.endsWith('-svg.zip'))[1]); const names = Object.keys(z.files); const first = names.find(n => n.endsWith('.svg')); const txt = await z.files[first].async('string'); return names.length + ' files; first has <text>: ' + /<text /.test(txt) + ', <path>: ' + /<path /.test(txt) + ', ' + (txt.match(/<g id="/g) || []).length + ' named groups'; });
  // autosave + reopen
  await p.waitForTimeout(900); await p.click('.fb >> text=← Flow'); log.drafts = await p.evaluate(async () => (await SixjulyDrafts.list()).map(d => d.title + ' (' + d.slides + ' slides)').join(', '));
  await p.reload(); await p.waitForSelector('.node');
  log.reopen = await p.evaluate(async () => { const ix = await SixjulyDrafts.list(); const d = await SixjulyDrafts.load(ix[0].id); return JSON.stringify({ head: d.deck.slides[0].head, layers: d.deck.slides[0].layers.length, img: d.deck.slides[0].layers.some(l => l.type === 'image' && SixjulyRender.imgs.has(l.img)) }); });
  console.log(log); console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors'); await b.close(); process.exit(errors.length ? 1 : 0);
})();
