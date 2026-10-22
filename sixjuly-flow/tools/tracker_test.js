// Drives the Topics dashboard: sources, feeds, links, suggestions, approval, draft creation, Drafts view and the Google Sheet connection (mocked).
//   NODE_PATH=$(npm root -g) node tools/tracker_test.js [--shots dir]
const { chromium } = require('playwright'); const path = require('path');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const rss = items => `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${items.map(i => `<item><title>${i[0]}</title><link>${i[1]}</link><pubDate>${new Date(Date.now() - (i[3] || 1) * 864e5).toUTCString()}</pubDate><description>${i[2] || ''}</description></item>`).join('')}</channel></rss>`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage(), errors = [], log = {};
  p.on('pageerror', e => errors.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource|CORS policy/.test(m.text())) errors.push('console: ' + m.text()); });
  const CORS = { 'access-control-allow-origin': '*' };
  await p.route('https://www.nngroup.com/feed/rss/', r => r.fulfill({ status: 200, headers: CORS, contentType: 'application/rss+xml', body: rss([['Design systems tokens are replacing style guides', 'https://www.nngroup.com/articles/tokens/?utm_source=x', 'How design tokens keep components consistent across products.'], ['Why design systems need governance', 'https://www.nngroup.com/articles/governance/', 'Governance and tokens for scale.'], ['Usability testing with five users', 'https://www.nngroup.com/articles/five-users/', 'A UX research classic revisited.']]) }));
  await p.route('https://uxdesign.cc/feed', r => r.fulfill({ status: 200, headers: CORS, contentType: 'application/rss+xml', body: rss([['Design system tokens: a practical guide', 'https://uxdesign.cc/tokens-guide', 'Tokens and components in design systems.'], ['Generative AI is changing UI design workflows', 'https://uxdesign.cc/ai-ui', 'AI design tools and agents.']]) }));
  await p.route('https://www.smashingmagazine.com/feed/', r => r.abort('failed'));          // a feed the browser cannot read (blocked by the site)
  let sheetRows = { 'Found links': [], Sources: [], Topics: [], 'Content drafts': [] }, calls = [];
  await p.route('https://script.google.com/macros/s/TEST/exec', async r => {
    const req = JSON.parse(r.request().postData()); calls.push(req.action + (req.tab ? ':' + req.tab : '') + (req.token === 'pass' ? '' : ' BADTOKEN'));
    let out = { ok: true };
    if (req.action === 'ping') out = { ok: true, sheet: 'My tracker', tabs: [] }; else if (req.action === 'read') out = { ok: true, rows: req.tab === 'Found links' ? [{ ID: 'lx1', Captured: '2026-10-21', Published: '2026-10-20', 'Source ID': 's1', Source: 'Pentagram', Title: 'Collector found: identity system for a museum', URL: 'https://www.pentagram.com/work/museum', Key: 'pentagram.com/work/museum', Summary: 'A new visual identity.', 'Main topic': '', Relevance: '', Status: 'New' }] : [] };
    else if (req.action === 'check') out = { ok: true, result: { total: 2, done: 2, added: 1, status: [{ id: 's1', ok: true, added: 1, checked: new Date().toISOString(), error: '' }, { id: 's2', ok: false, manual: true, added: 0, checked: new Date().toISOString(), error: 'This page does not announce a feed.' }] } };
    else if (req.action === 'upsert' || req.action === 'replace') sheetRows[req.tab] = (sheetRows[req.tab] || []).concat(req.rows);
    await r.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(out) });
  });
  await p.goto('file://' + path.join(__dirname, '../index.html')); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.node');
  await p.evaluate(() => { window.__dl = []; SixjulyExport.download = async (blob, name) => { window.__dl.push(name + ':' + blob.size); }; });
  // 1. sources from the workbook
  await p.click('.nav button[data-view=topics]'); await p.click('.dtabs >> text=Sources');
  log.sources = await p.evaluate(() => SixjulyTracker.data.sources.length); log.groups = await p.locator('.sgrp').count(); log.rows = await p.locator('.sr').count();
  log.banner = await p.locator('.bn').first().textContent();
  if (shots) await p.screenshot({ path: path.join(shots, 'tr-1-sources.png') });
  // 2. add a link by hand
  await p.click('.dtabs >> text=Found links'); await p.click('text=+ Add link'); await p.fill('dialog input[type=url]', 'https://example.com/post?utm_source=a'); await p.fill('dialog input[type=text] >> nth=0', 'Typography trends for 2026');
  await p.fill('dialog textarea', 'Variable fonts and type systems keep growing.'); await p.click('dialog >> text=Save link');
  log.manual = await p.evaluate(() => { const l = SixjulyTracker.data.links[0]; return [l.title, l.topic, l.status, l.key, l.source].join(' | '); });
  // 3. check all (feeds read in the browser)
  await p.click('.dh >> text=Check sources'); await p.waitForFunction(() => !document.querySelector('.dh .btn.sm[disabled]'), null, { timeout: 30000 }); await p.waitForTimeout(400);
  log.afterCheck = await p.evaluate(() => ({ links: SixjulyTracker.data.links.length, topics: SixjulyTracker.data.topics.length, statuses: SixjulyTracker.data.sources.filter(s => s.lastStatus).map(s => s.name + ':' + s.lastStatus).join(', '), err: (SixjulyTracker.data.sources.find(s => s.name === 'Smashing Magazine') || {}).lastError }));
  // dedupe: checking again adds nothing
  const before = await p.evaluate(() => SixjulyTracker.data.links.length); await p.click('.dh >> text=Check sources'); await p.waitForTimeout(1500); log.dedupe = before === await p.evaluate(() => SixjulyTracker.data.links.length);
  // 4. suggestions + approval
  await p.click('.dh >> text=Suggest topics'); await p.waitForSelector('.tc', { timeout: 8000 }).catch(() => {}); console.log('state', await p.evaluate(() => JSON.stringify({ links: SixjulyTracker.data.links.map(l => l.title + ' / ' + l.topic), topics: SixjulyTracker.data.topics.length, checked: SixjulyTracker.data.sources.filter(s => s.lastStatus).map(s => s.name + ':' + s.lastStatus + ':' + s.lastError.slice(0, 40)) }))); log.topicTitles = await p.evaluate(() => SixjulyTracker.data.topics.map(t => `${t.title} [${t.mainTopic}] ${t.linkIds.length} links`).join(' || '));
  if (shots) await p.screenshot({ path: path.join(shots, 'tr-2-topics.png') });
  const first = p.locator('.tc').first(); await first.locator('text=Approve').click(); log.status = await p.evaluate(() => SixjulyTracker.data.topics.filter(t => t.status === 'Approved').length);
  log.noDraftYet = await p.evaluate(async () => (await SixjulyDrafts.list()).length);
  await p.locator('.tc', { hasText: 'Create draft' }).first().locator('text=Create draft').click(); await p.waitForSelector('#focus:not([hidden]) .stage canvas', { timeout: 40000 });
  log.draft = await p.evaluate(async () => { const S = SixjulyEditor._state(); return JSON.stringify({ title: S.draft.title, refs: S.draft.refs.length, slides: S.deck.slides.length, topicStatus: SixjulyTracker.data.topics.find(t => t.id === S.draft.topicId).status }); });
  await p.waitForTimeout(800); await p.click('.fb >> text=← Flow');
  // 5. drafts view
  await p.click('.nav button[data-view=drafts]'); await p.waitForSelector('.dc'); log.draftCards = await p.locator('.dc').count(); log.thumb = await p.locator('.dc img').count();
  if (shots) await p.screenshot({ path: path.join(shots, 'tr-3-drafts.png') });
  // 6. google sheet (mocked)
  await p.click('.nav button[data-view=topics]'); await p.click('.dtabs >> text=Google Sheet');
  await p.fill('#topicsView input[type=url]', 'https://script.google.com/macros/s/TEST/exec'); await p.fill('#topicsView input[type=password]', 'pass'); await p.click('#topicsView button:text-is("Connect")');
  await p.waitForFunction(() => /Connected to/.test(document.querySelector('.sres') ? document.querySelector('.sres').textContent : ''), null, { timeout: 15000 }).catch(() => {});
  log.sheetMsg = await p.evaluate(() => (document.querySelector('.sres') || {}).textContent); await p.waitForTimeout(300);
  await p.click('text=Send everything to the Sheet'); await p.waitForFunction(() => /Sent \d+ rows/.test(document.querySelector('.sres').textContent)); log.sent = await p.evaluate(() => document.querySelector('.sres').textContent);
  await p.click('text=Get latest from the Sheet'); await p.waitForFunction(() => /Read \d+ rows/.test(document.querySelector('.sres').textContent)); log.pulled = await p.evaluate(() => SixjulyTracker.data.links.find(l => l.id === 'lx1') ? SixjulyTracker.data.links.find(l => l.id === 'lx1').topic : 'missing');
  await p.click('.dh >> text=Check sources'); await p.waitForFunction(() => !document.querySelector('.dh .btn.sm[disabled]'), null, { timeout: 15000 }); await p.waitForTimeout(300);
  log.collector = await p.evaluate(() => SixjulyTracker.data.sources.filter(s => s.id === 's2').map(s => s.lastStatus + ': ' + s.lastError).join());
  log.calls = [...new Set(calls)].join(', ');
  // 7. csv fallback
  await p.click('text=Download CSV files'); await p.waitForTimeout(500); log.csv = await p.evaluate(() => window.__dl.join(' '));
  if (shots) await p.screenshot({ path: path.join(shots, 'tr-4-sheet.png') });
  console.log(log); console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors'); await b.close(); process.exit(errors.length ? 1 : 0);
})();
