// Runs apps-script/Code.gs against small in-memory stand-ins for SpreadsheetApp, UrlFetchApp, XmlService and ContentService
// (the real Google services are not available outside Google), so the sheet logic and the feed parsing are exercised.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const code = fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8').replace("const SECRET = 'CHANGE-ME';", "const SECRET = 'pw-test';");
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message)); await p.setContent('<body></body>');
  await p.evaluate(() => {
    // ---- stand-ins ----
    const sheets = {}, mk = name => { const grid = []; const sh = { name, grid, getName: () => name, getLastRow: () => { let n = 0; grid.forEach((r, i) => { if (r && r.some(v => v !== '' && v != null)) n = i + 1; }); return n; }, getLastColumn: () => 30,
      getRange(r, c, nr = 1, nc = 1) { return { setValues(v) { v.forEach((row, i) => row.forEach((x, j) => { grid[r - 1 + i] = grid[r - 1 + i] || []; grid[r - 1 + i][c - 1 + j] = x; })); return this; }, getValues() { const o = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) { const v = (grid[r - 1 + i] || [])[c - 1 + j]; row.push(v == null ? '' : v); } o.push(row); } return o; }, getValue() { return this.getValues()[0][0]; }, setValue(v) { this.setValues([[v]]); return this; }, clearContent() { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (grid[r - 1 + i]) grid[r - 1 + i][c - 1 + j] = ''; return this; }, setFontWeight() { return this; }, setBackground() { return this; }, setDataValidation() { return this; } }; },
      setFrozenRows() {}, deleteRow(r) { grid.splice(r - 1, 1); } }; return sh; };
    window.SpreadsheetApp = { newDataValidation: () => ({ requireValueInList() { return this; }, setAllowInvalid() { return this; }, build() { return {}; } }), getActive: () => ({ getName: () => 'Test sheet', getSheets: () => Object.values(sheets), getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = mk(n)), deleteSheet() {} }) };
    window.__sheets = sheets;
    window.Utilities = { getUuid: () => Math.random().toString(16).slice(2) + 'abcdef12' };
    window.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: t => ({ text: t, setMimeType() { return this; } }) };
    const web = {
      'https://good.example/feed': { code: 200, body: '<?xml version="1.0"?><rss version="2.0"><channel><title>Good</title><item><title>Variable fonts are changing brand identity</title><link>https://good.example/a?utm_source=x</link><pubDate>' + new Date().toUTCString() + '</pubDate><description>&lt;p&gt;A look at how variable typography reshapes identity systems.&lt;/p&gt;</description></item><item><title>Old post from long ago</title><link>https://good.example/old</link><pubDate>Mon, 01 Jan 2018 00:00:00 GMT</pubDate></item></channel></rss>' },
      'https://atom.example/feed.xml': { code: 200, body: '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title><entry><title>Design systems tokens at scale</title><link rel="alternate" href="https://atom.example/p/1"/><updated>' + new Date().toISOString() + '</updated><summary>Tokens first.</summary></entry></feed>' },
      'https://page.example/blog': { code: 200, body: '<html><head><link rel="alternate" type="application/rss+xml" href="/rss.xml"></head></html>' },
      'https://page.example/rss.xml': { code: 200, body: '<rss version="2.0"><channel><item><title>Announced feed item</title><link>https://page.example/x</link><pubDate>' + new Date().toUTCString() + '</pubDate></item></channel></rss>' },
      'https://page.example/robots.txt': { code: 404, body: '' },
      'https://nofeed.example/blog': { code: 200, body: '<html><head><title>No feed</title></head></html>' }, 'https://nofeed.example/robots.txt': { code: 404, body: '' },
      'https://blocked.example/blog': { code: 200, body: '<html></html>' }, 'https://blocked.example/robots.txt': { code: 200, body: 'User-agent: *\nDisallow: /blog' },
      'https://down.example/feed': { code: 500, body: 'oops' },
    };
    window.UrlFetchApp = { fetch: u => { const r = web[u]; if (!r) return { getResponseCode: () => 404, getContentText: () => '' }; return { getResponseCode: () => r.code, getContentText: () => r.body }; } };
    // XmlService on top of DOMParser
    const wrap = el => ({ getName: () => el.localName, getText: () => el.textContent, getNamespace: () => el.namespaceURI || 'ns', getChild: n => { const c = [...el.children].find(x => x.localName === n); return c ? wrap(c) : null; }, getChildren: n => [...el.children].filter(x => !n || x.localName === n).map(wrap),
      getAttribute: n => (el.hasAttribute(n) ? { getValue: () => el.getAttribute(n) } : null) });
    window.XmlService = { parse: x => { const d = new DOMParser().parseFromString(x, 'text/xml'); if (d.querySelector('parsererror')) throw new Error('bad xml'); return { getRootElement: () => wrap(d.documentElement) }; } };
    window.ScriptApp = { getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: () => ({ timeBased() { return this; }, everyDays() { return this; }, atHour() { return this; }, create() {} }) };
  });
  await p.addScriptTag({ content: code });
  const res = await p.evaluate(() => {
    const call = o => JSON.parse(doPost({ postData: { contents: JSON.stringify(Object.assign({ token: 'pw-test' }, o)) } }).text), r = {};
    r.badToken = JSON.parse(doPost({ postData: { contents: JSON.stringify({ token: 'nope', action: 'ping' }) } }).text).error;
    r.setup = call({ action: 'setup' }); r.ping = call({ action: 'ping' }).tabs.join(',');
    const src = (id, name, o) => Object.assign({ ID: id, Name: name, Enabled: true, Paused: false }, o);
    call({ action: 'upsert', tab: 'Sources', rows: [src('s1', 'Good', { 'Feed URL': 'https://good.example/feed' }), src('s2', 'Atom', { 'Feed URL': 'https://atom.example/feed.xml' }), src('s3', 'Page', { 'Blog / articles': 'https://page.example/blog' }), src('s4', 'NoFeed', { 'Blog / articles': 'https://nofeed.example/blog' }), src('s5', 'Blocked', { 'Blog / articles': 'https://blocked.example/blog' }), src('s6', 'Down', { 'Feed URL': 'https://down.example/feed' }), src('s7', 'Paused', { 'Feed URL': 'https://good.example/feed', Paused: 'TRUE' })] });
    r.sources = call({ action: 'read', tab: 'Sources' }).rows.length;
    const c1 = call({ action: 'check', limit: 4, skip: 0 }).result, c2 = call({ action: 'check', limit: 4, skip: 4 }).result;
    r.check1 = { total: c1.total, done: c1.done, added: c1.added }; r.check2 = { done: c2.done, added: c2.added };
    r.status = [...c1.status, ...c2.status].map(s => `${s.id}:${s.ok ? 'ok' : s.manual ? 'manual' : 'fail'}${s.added ? '+' + s.added : ''}`).join(' ');
    const links = call({ action: 'read', tab: 'Found links' }).rows; r.links = links.map(l => l.Title + ' | ' + l.Key + ' | ' + l.Summary.slice(0, 40)).join('\n  ');
    const again = call({ action: 'check', limit: 8, skip: 0 }).result; r.recheckAdded = again.added;
    const srcRows = call({ action: 'read', tab: 'Sources' }).rows; r.written = srcRows.filter(s => s['Last status']).map(s => s.Name + '=' + s['Last status'] + (s['Last error'] ? ' (' + s['Last error'].slice(0, 50) + ')' : '')).join('; ');
    call({ action: 'upsert', tab: 'Topics', rows: [{ ID: 't1', Title: 'A topic', Status: 'Approved' }] }); call({ action: 'upsert', tab: 'Topics', rows: [{ ID: 't1', Title: 'A topic', Status: 'Rejected' }] });
    const t = call({ action: 'read', tab: 'Topics' }).rows; r.topics = t.length + ' ' + t[0].Status; call({ action: 'remove', tab: 'Topics', ids: ['t1'] }); r.afterRemove = call({ action: 'read', tab: 'Topics' }).rows.length;
    return r;
  });
  console.log(res); await b.close();
})();
