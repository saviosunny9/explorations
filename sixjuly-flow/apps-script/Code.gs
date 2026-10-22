/**
 * Sixjuly Flow: Google Sheet connector and source collector.
 *
 * What it does
 *  - Keeps four tabs in THIS spreadsheet: Sources, Found links, Topics, Content drafts.
 *  - Lets the Sixjuly Flow app read and write those tabs.
 *  - Checks the sources you list: it reads their public RSS / Atom feeds (or the feed address a page announces
 *    in its own <link rel="alternate"> tag) and adds NEW links. It stores only the title, link, date and a
 *    short note (about 280 characters). It does not copy articles or images, does not log in anywhere, and
 *    skips pages that robots.txt asks automated tools to avoid.
 *
 * Set-up (about 3 minutes)
 *  1. In the spreadsheet choose Extensions > Apps Script and paste this whole file over what is there.
 *  2. Change SECRET below to a passphrase only you know. You will type the same passphrase into the app.
 *  3. Click Deploy > New deployment > type "Web app". Execute as: Me. Who has access: Anyone. Click Deploy
 *     and approve the permissions Google asks for (it needs this sheet and "connect to external service").
 *  4. Copy the "Web app URL" into the app (Topics > Google Sheet). Done.
 *  Optional: run installDailyTrigger once (Run button) so sources are checked every morning automatically.
 *
 * Privacy: the Web app address plus your passphrase are the only keys. Do not share them or post them in public.
 */
const SECRET = 'CHANGE-ME';
const RECENT_DAYS = 45;          // ignore feed items older than this
const MAX_PER_SOURCE = 15;       // newest items kept per source per check
const SUMMARY_CHARS = 280;       // the short note kept for each link

const TABS = {
  'Sources': ['ID', 'Name', 'Group', 'Type', 'Priority', 'Region', 'Primary topics', 'Website', 'Blog / articles', 'Feed URL', 'Newsletter', 'LinkedIn (manual)', 'Instagram (manual)', 'X (manual)', 'YouTube (manual)', 'Enabled', 'Paused', 'Last checked', 'Last status', 'Last error', 'Method', 'Notes'],
  'Found links': ['ID', 'Captured', 'Published', 'Source ID', 'Source', 'Title', 'URL', 'Key', 'Summary', 'Main topic', 'Other topics', 'Relevance', 'Status', 'Notes'],
  'Topics': ['ID', 'Title', 'Main topic', 'Angle', 'Supporting link IDs', 'Supporting URLs', 'Status', 'Created', 'Decision note', 'Draft ID'],
  'Content drafts': ['ID', 'Topic ID', 'Title', 'Status', 'Updated', 'Slides', 'Caption', 'Files', 'Sources'],
};
const STATUS_LISTS = { 'Found links': { col: 'Status', values: ['New', 'Needs review', 'Skipped'] }, 'Topics': { col: 'Status', values: ['Needs review', 'Approved', 'Rejected', 'Saved for later', 'Draft ready'] }, 'Content drafts': { col: 'Status', values: ['Draft ready', 'Approved for export', 'Exported'] } };

function doGet() { return out_({ ok: true, name: 'Sixjuly Flow connector', note: 'Open the Sixjuly Flow app and paste this address under Topics > Google Sheet.' }); }

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    if (SECRET === 'CHANGE-ME') return out_({ ok: false, error: 'Change SECRET at the top of the script first, then deploy a new version.' });
    if (req.token !== SECRET) return out_({ ok: false, error: 'The passphrase does not match.' });
    switch (req.action) {
      case 'ping': return out_({ ok: true, sheet: SpreadsheetApp.getActive().getName(), tabs: SpreadsheetApp.getActive().getSheets().map(function (s) { return s.getName(); }) });
      case 'setup': setup_(); return out_({ ok: true });
      case 'read': return out_({ ok: true, rows: read_(req.tab) });
      case 'replace': replace_(req.tab, req.rows || []); return out_({ ok: true, count: (req.rows || []).length });
      case 'upsert': upsert_(req.tab, req.rows || []); return out_({ ok: true, count: (req.rows || []).length });
      case 'remove': remove_(req.tab, req.ids || []); return out_({ ok: true });
      case 'check': return out_({ ok: true, result: check_(req.ids || null, req.limit || 8, req.skip || 0) });
      default: return out_({ ok: false, error: 'Unknown action ' + req.action });
    }
  } catch (err) { return out_({ ok: false, error: String(err && err.message || err) }); }
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ---- tabs ---------------------------------------------------------------------------------------------------------------------------------
function sheet_(name) {
  const ss = SpreadsheetApp.getActive(); let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  const head = TABS[name]; if (!head) throw new Error('Unknown tab ' + name);
  if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() !== head[0]) { sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#f3f1ec'); sh.setFrozenRows(1); }
  return sh;
}
function setup_() {
  Object.keys(TABS).forEach(function (name) {
    const sh = sheet_(name), cfg = STATUS_LISTS[name];
    if (cfg) { const col = TABS[name].indexOf(cfg.col) + 1; sh.getRange(2, col, 1000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(cfg.values, true).setAllowInvalid(true).build()); }
  });
  const first = SpreadsheetApp.getActive().getSheetByName('Sheet1'); if (first && first.getLastRow() === 0 && SpreadsheetApp.getActive().getSheets().length > 1) SpreadsheetApp.getActive().deleteSheet(first);
}
function read_(tab) {
  const sh = sheet_(tab), n = sh.getLastRow(); if (n < 2) return [];
  const head = TABS[tab], vals = sh.getRange(2, 1, n - 1, head.length).getValues();
  return vals.filter(function (r) { return r[0] !== ''; }).map(function (r) { const o = {}; head.forEach(function (h, i) { const v = r[i]; o[h] = v instanceof Date ? v.toISOString() : v; }); return o; });
}
function write_(sh, tab, rows, startRow) { const head = TABS[tab]; if (!rows.length) return; sh.getRange(startRow, 1, rows.length, head.length).setValues(rows.map(function (o) { return head.map(function (h) { const v = o[h]; return v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : v); }); })); }
function replace_(tab, rows) { const sh = sheet_(tab), n = sh.getLastRow(); if (n > 1) sh.getRange(2, 1, n - 1, TABS[tab].length).clearContent(); write_(sh, tab, rows, 2); }
function upsert_(tab, rows) {
  const sh = sheet_(tab), n = sh.getLastRow(), ids = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  const add = [];
  rows.forEach(function (o) { const i = ids.indexOf(String(o.ID)); if (i >= 0) write_(sh, tab, [o], i + 2); else add.push(o); });
  if (add.length) write_(sh, tab, add, Math.max(2, sh.getLastRow() + 1));
}
function remove_(tab, ids) {
  const sh = sheet_(tab), n = sh.getLastRow(); if (n < 2) return; const col = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = col.length - 1; i >= 0; i--) if (ids.indexOf(String(col[i][0])) >= 0) sh.deleteRow(i + 2);
}

// ---- source checking --------------------------------------------------------------------------------------------------------------------------------
function check_(ids, limit, skip) {
  const sources = read_('Sources').filter(function (s) { return s.Enabled !== false && String(s.Enabled).toUpperCase() !== 'FALSE' && String(s.Paused).toUpperCase() !== 'TRUE' && (!ids || ids.indexOf(String(s.ID)) >= 0); });
  const batch = sources.slice(skip, skip + limit), found = [], status = [];
  const links = sheet_('Found links'), have = {}; read_('Found links').forEach(function (l) { have[l.Key] = true; });
  batch.forEach(function (s) {
    const res = checkOne_(s); let added = 0;
    res.items.forEach(function (it) { const key = canonical_(it.url); if (!key || have[key]) return; have[key] = true; added++; found.push(linkRow_(s, it, key)); });
    status.push({ id: String(s.ID), ok: res.ok, manual: !!res.manual, error: res.error || '', added: added, method: res.method, feed: res.feed || '', checked: new Date().toISOString() });
  });
  if (found.length) write_(links, 'Found links', found, Math.max(2, links.getLastRow() + 1));
  // write the check result back into the Sources tab
  const sh = sheet_('Sources'), head = TABS['Sources'], n = sh.getLastRow(), idCol = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues() : [];
  status.forEach(function (st) {
    for (let i = 0; i < idCol.length; i++) if (String(idCol[i][0]) === st.id) {
      sh.getRange(i + 2, head.indexOf('Last checked') + 1, 1, 4).setValues([[st.checked, st.ok ? 'ok' : (st.manual ? 'manual' : 'failed'), st.error, st.method]]);
      if (st.feed) sh.getRange(i + 2, head.indexOf('Feed URL') + 1).setValue(st.feed);
    }
  });
  return { total: sources.length, done: Math.min(sources.length, skip + limit), added: found.length, status: status };
}
function checkOne_(s) {
  try {
    let feed = String(s['Feed URL'] || '').trim(), method = 'Feed';
    if (!feed) {
      const page = String(s['Blog / articles'] || s['Website'] || '').trim();
      if (!page) return { ok: false, manual: true, items: [], method: 'Manual', error: 'No address to check. Add a feed or paste links by hand.' };
      if (!allowedByRobots_(page)) return { ok: false, manual: true, items: [], method: 'Manual', error: 'The site asks automated tools not to read this page. Review it by hand.' };
      const html = fetch_(page); feed = discover_(html, page); method = 'Feed (announced by the page)';
      if (!feed) return { ok: false, manual: true, items: [], method: 'Manual', error: 'This page does not announce a feed. Review it by hand or paste links.' };
    }
    const items = parseFeed_(fetch_(feed)).slice(0, MAX_PER_SOURCE), cutoff = Date.now() - RECENT_DAYS * 864e5;
    return { ok: true, items: items.filter(function (i) { return !i.time || i.time >= cutoff; }), method: method, feed: feed };
  } catch (err) { return { ok: false, items: [], method: 'Feed', error: String(err && err.message || err).slice(0, 200) }; }
}
function fetch_(url) {
  const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': 'SixjulyFlow/1.0 (design research; reads public feeds)', Accept: 'application/rss+xml, application/atom+xml, text/xml, text/html' } });
  if (r.getResponseCode() >= 400) throw new Error('The site answered with status ' + r.getResponseCode());
  return r.getContentText();
}
function allowedByRobots_(url) {
  try {
    const m = /^(https?:\/\/[^\/]+)(\/[^?#]*)?/.exec(url); if (!m) return true;
    const r = UrlFetchApp.fetch(m[1] + '/robots.txt', { muteHttpExceptions: true }); if (r.getResponseCode() !== 200) return true;
    let applies = false, ok = true; const path = m[2] || '/';
    r.getContentText().split(/\r?\n/).forEach(function (line) {
      const l = line.split('#')[0].trim(), kv = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(l); if (!kv) return;
      const k = kv[1].toLowerCase(), v = kv[2].trim();
      if (k === 'user-agent') applies = (v === '*'); else if (applies && k === 'disallow' && v && path.indexOf(v) === 0) ok = false;
    });
    return ok;
  } catch (e) { return true; }
}
function discover_(html, base) {
  const re = /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/ig; let m;
  while ((m = re.exec(html))) { const h = /href=["']([^"']+)["']/i.exec(m[0]); if (h) return absolute_(h[1], base); }
  return '';
}
function absolute_(href, base) {
  if (/^https?:\/\//i.test(href)) return href; const o = /^(https?:\/\/[^\/]+)/.exec(base)[1];
  return href.charAt(0) === '/' ? o + href : base.replace(/[^\/]*$/, '') + href;
}
function parseFeed_(xml) {
  const doc = XmlService.parse(xml), root = doc.getRootElement(), items = [];
  function txt(el, name) { const c = el.getChildren(name, el.getNamespace()); const c2 = c.length ? c : el.getChildren(name); return c2.length ? c2[0].getText() : ''; }
  function kids(el, name) { return el.getChildren(name, el.getNamespace()).concat(el.getChildren(name)); }
  const rn = root.getName();
  if (rn === 'rss' || rn === 'RDF') {
    const ch = rn === 'rss' ? root.getChild('channel') : root;
    kids(ch, 'item').forEach(function (it) { const d = txt(it, 'pubDate') || firstNs_(it, 'date'); items.push({ title: clean_(txt(it, 'title')), url: clean_(txt(it, 'link')) || clean_(txt(it, 'guid')), published: d, time: Date.parse(d) || 0, summary: txt(it, 'description') }); });
  } else if (rn === 'feed') {
    kids(root, 'entry').forEach(function (en) {
      let href = ''; kids(en, 'link').forEach(function (l) { const rel = l.getAttribute('rel'); if (!href || (rel && rel.getValue() === 'alternate')) href = l.getAttribute('href') ? l.getAttribute('href').getValue() : href; });
      const d = txt(en, 'published') || txt(en, 'updated'); items.push({ title: clean_(txt(en, 'title')), url: href, published: d, time: Date.parse(d) || 0, summary: txt(en, 'summary') || txt(en, 'content') });
    });
  } else throw new Error('Not an RSS or Atom feed');
  return items.filter(function (i) { return i.title && /^https?:\/\//i.test(i.url); });
}
function firstNs_(el, name) { const all = el.getChildren(); for (let i = 0; i < all.length; i++) if (all[i].getName() === name) return all[i].getText(); return ''; }
function clean_(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&#39;/g, "'").replace(/\s+/g, ' ').trim(); }
function short_(s, n) { s = clean_(s); if (s.length <= n) return s; const cut = s.lastIndexOf(' ', n); return s.slice(0, cut > n * 0.6 ? cut : n).replace(/[,;:\s-]+$/, '') + '…'; }
function canonical_(url) {
  const m = /^https?:\/\/(?:www\.)?([^\/?#]+)([^?#]*)(\?[^#]*)?/i.exec(String(url || '')); if (!m) return '';
  const q = (m[3] || '').replace(/^\?/, '').split('&').filter(function (p) { return p && !/^(utm_|fbclid|gclid|mc_|ref=|source=|igshid)/i.test(p); }).join('&');
  return (m[1] + m[2].replace(/\/+$/, '') + (q ? '?' + q : '')).toLowerCase();
}
function linkRow_(s, it, key) {
  return { 'ID': 'l' + Utilities.getUuid().slice(0, 8), 'Captured': new Date().toISOString().slice(0, 10), 'Published': it.time ? new Date(it.time).toISOString().slice(0, 10) : '', 'Source ID': s.ID, 'Source': s.Name, 'Title': short_(it.title, 200), 'URL': it.url, 'Key': key, 'Summary': short_(it.summary, SUMMARY_CHARS), 'Main topic': '', 'Other topics': '', 'Relevance': '', 'Status': 'New', 'Notes': '' };
}

// ---- optional daily check ------------------------------------------------------------------------------------------------------------------------------
function dailyCheck() { let skip = 0, total = 1; while (skip < total && skip < 120) { const r = check_(null, 10, skip); total = r.total; skip = r.done; if (!r.status.length) break; } }
function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dailyCheck') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyCheck').timeBased().everyDays(1).atHour(7).create();
}
