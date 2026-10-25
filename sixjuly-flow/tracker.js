/* Sixjuly Flow — source and topic tracker (data layer).
   Sources → found links → suggested topics → approval. Everything is kept in this browser first; the Google Sheet (sheet.js) mirrors it.
   Only short facts are stored for each link: title, source, date, URL and a short note. Articles and images are never copied. */
(function () {
  'use strict';
  const KV = window.SixjulyKV;
  const STARTER = window.SJ_STARTER || { sources: [], taxonomy: [] };
  const LINK_STATUS = ['New', 'Needs review', 'Skipped'];
  const TOPIC_STATUS = ['Needs review', 'Approved', 'Rejected', 'Saved for later', 'Draft ready'];
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = () => Date.now();
  const clone = o => JSON.parse(JSON.stringify(o));
  const gone = (kind, id) => { T.removed = T.removed || {}; (T.removed[kind] = T.removed[kind] || []).push(id); };

  let T = null; const listeners = [];
  const emit = what => listeners.forEach(fn => { try { fn(what); } catch (e) { /* a listener failed */ } });

  // ---- load / save ---------------------------------------------------------------------------------------------------------------------------
  async function load() {
    if (T) return T;
    let saved = null; try { saved = await KV.get('tracker'); } catch (e) { /* first run */ }
    T = saved || { sources: clone(STARTER.sources), links: [], topics: [], taxonomy: clone(STARTER.taxonomy), seeded: true };
    T.taxonomy = T.taxonomy && T.taxonomy.length ? T.taxonomy : clone(STARTER.taxonomy); T.removed = T.removed || {};
    // newer starter data may know a feed address the saved copy does not: fill it in unless the user set one themselves
    const byId = new Map(STARTER.sources.map(s => [s.id, s]));
    T.sources.forEach(s => { const o = byId.get(s.id); if (!o) return; if (!s.feed && o.feed && !s.feedByUser) { s.feed = o.feed; s.dirty = true; } if (o.browserOK && s.feed === o.feed) s.browserOK = true; });
    return T;
  }
  let saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => KV.set('tracker', T).catch(() => {}), 250); emit('save'); }

  // ---- URLs, dates, text -----------------------------------------------------------------------------------------------------------------------------
  function canonical(url) {
    try {
      const u = new URL(url); u.hash = ''; const drop = [...u.searchParams.keys()].filter(k => /^(utm_|fbclid|gclid|mc_|ref$|source$|igshid)/i.test(k)); drop.forEach(k => u.searchParams.delete(k));
      let p = u.pathname.replace(/\/+$/, ''); return (u.hostname.replace(/^www\./, '') + p + (u.search || '')).toLowerCase();
    } catch (e) { return String(url || '').trim().toLowerCase(); }
  }
  const strip = h => String(h || '').replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;|&#8220;|&#8221;/g, '"').replace(/&#8217;|&#39;/g, "'").replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
  const short = (s, n) => { s = strip(s); return s.length > n ? s.slice(0, s.lastIndexOf(' ', n) > n * 0.6 ? s.lastIndexOf(' ', n) : n).replace(/[,;:\s-]+$/, '') + '…' : s; };
  const toTime = d => { const t = d ? Date.parse(d) : NaN; return isNaN(t) ? 0 : t; };
  const ago = t => { if (!t) return 'never'; const m = Math.round((now() - t) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 24) return h + ' h ago'; const d = Math.round(h / 24); return d < 60 ? d + ' days ago' : new Date(t).toLocaleDateString(); };
  const dayStr = t => (t ? new Date(t).toISOString().slice(0, 10) : '');

  // ---- classification (controlled vocabulary from the Topic Taxonomy sheet) ---------------------------------------------------------------------
  const STOP = new Set('the and for with that this from your what why how are was our you not its but all can has have about into more less than they them then when will would should could of in on to is it a an as at by or be we do does new via vs one two three top best use using used get make made way ways take takes just like now still also very out over under per need needs here there their who which while after before between within across does did being been were had her his him she them these those onto upon really says say said look looks first last next year years day days time times people work works design designer designers designing'.split(' '));
  function classify(title, summary, srcTopics) {
    const text = (' ' + String(title || '').toLowerCase() + ' '), body = (' ' + String(summary || '').toLowerCase() + ' '), src = String(srcTopics || '').toLowerCase();
    const scores = T.taxonomy.map(t => {
      let s = 0; t.keywords.forEach(k => { const re = new RegExp('(^|[^a-z])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)'); if (re.test(text)) s += 3 + (k.includes(' ') ? 1 : 0); if (re.test(body)) s += 1; });
      if (src.includes(t.topic.toLowerCase())) s += 0.6;
      return { topic: t.topic, s };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
    return { main: scores[0] ? scores[0].topic : 'Other', others: scores.slice(1, 4).map(x => x.topic), strength: scores[0] ? Math.min(1, scores[0].s / 8) : 0, ai: /\bai\b|artificial intelligence|generative|llm|chatgpt|copilot|agentic|\bagents?\b/i.test(title + ' ' + summary) };
  }
  const PRIORITY = { Core: 2, High: 1.5, Medium: 1, Low: 0.5 };
  function relevance(link, src, cls) {
    const age = (now() - (link.publishedAt || link.capturedAt)) / 864e5;
    const rec = age <= 2 ? 1.5 : age <= 7 ? 1 : age <= 30 ? 0.5 : 0;
    const v = 0.5 + (PRIORITY[src && src.priority] || 1) + rec + cls.strength;
    return Math.max(1, Math.min(5, Math.round(v)));
  }

  // ---- links ---------------------------------------------------------------------------------------------------------------------------------------
  // merge found items (from a feed check or typed in by hand). Duplicates are matched on the canonical URL.
  function addLinks(items, src, o) {
    o = o || {}; const have = new Set(T.links.map(l => l.key)); let added = 0;
    items.forEach(it => {
      const url = String(it.url || '').trim(); if (!/^https?:\/\//i.test(url) || !it.title) return;
      const key = canonical(url); if (have.has(key)) return; have.add(key);
      const summary = short(it.summary, 280), cls = classify(it.title, summary, src && src.topics), publishedAt = toTime(it.published) || 0;
      const link = { id: uid('l'), sourceId: src ? src.id : '', source: (src && src.name) || it.source || 'Added by hand', title: short(it.title, 200), url, key, published: publishedAt ? dayStr(publishedAt) : '', publishedAt, captured: dayStr(now()), capturedAt: now(), summary, topic: cls.main, topics2: cls.others, ai: cls.ai, status: o.status || 'New', notes: it.notes || '', manual: !!o.manual };
      link.score = relevance(link, src, cls); link.dirty = true; T.links.push(link); added++;
    });
    if (added) save(); return added;
  }
  const setLinkStatus = (id, st) => { const l = T.links.find(x => x.id === id); if (l) { l.status = st; l.dirty = true; save(); } };
  const removeLink = id => { gone('links', id); T.links = T.links.filter(x => x.id !== id); T.topics.forEach(t => (t.linkIds = t.linkIds.filter(i => i !== id))); save(); };

  // ---- feeds (parsed in the browser when a feed allows it) -----------------------------------------------------------------------------------------------
  function parseFeed(xml) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml'); if (doc.querySelector('parsererror')) throw new Error('This address did not return a readable feed');
    const items = [], txt = (el, sel) => { const n = el.querySelector(sel); return n ? n.textContent : ''; };
    doc.querySelectorAll('item').forEach(el => items.push({ title: strip(txt(el, 'title')), url: strip(txt(el, 'link')) || strip(txt(el, 'guid')), published: txt(el, 'pubDate') || txt(el, 'date'), summary: txt(el, 'description') }));
    doc.querySelectorAll('entry').forEach(el => { const l = el.querySelector('link[rel="alternate"]') || el.querySelector('link'); items.push({ title: strip(txt(el, 'title')), url: l ? l.getAttribute('href') : '', published: txt(el, 'published') || txt(el, 'updated'), summary: txt(el, 'summary') || txt(el, 'content') }); });
    return items;
  }
  async function checkInBrowser(src) {
    const url = src.feed; if (!url) return { ok: false, manual: true, error: 'No feed address. Add one, or use the Google Sheet collector, or paste links by hand.' };
    try {
      const res = await fetch(url, { headers: { Accept: 'application/rss+xml, application/atom+xml, text/xml' } });
      if (!res.ok) throw new Error('The feed answered with status ' + res.status);
      const items = parseFeed(await res.text()).slice(0, 20), cutoff = now() - 45 * 864e5, fresh = items.filter(i => { const t = toTime(i.published); return !t || t >= cutoff; });
      const added = addLinks(fresh, src); return { ok: true, found: items.length, added };
    } catch (e) {
      const inClaude = !!(window.claude && typeof window.claude.use === 'function');
      const msg = e instanceof TypeError ? (inClaude ? 'This copy runs inside Claude, which cannot read websites. Open the downloaded app (dist/sixjuly-flow.html) to check feeds, or paste links by hand.' : 'The browser is not allowed to read this feed directly (it is blocked by the website). Connect the Google Sheet collector, or paste links by hand.') : e.message;
      return { ok: false, error: msg };
    }
  }
  function markChecked(src, r) { src.dirty = true; src.lastChecked = now(); src.lastStatus = r.ok ? 'ok' : (r.manual ? 'manual' : 'failed'); src.lastError = r.ok ? '' : (r.error || ''); src.lastAdded = r.added || 0; save(); }

  // ---- sources -------------------------------------------------------------------------------------------------------------------------------------
  const method = s => (s.feed ? (s.browserOK ? 'Feed (reads anywhere)' : 'Feed (Sheet collector)') : s.blog || s.site ? 'Page (collector looks for a feed)' : 'Manual');
  function addSource(o) { const s = Object.assign({ id: uid('s'), name: 'New source', type: 'Design blog', group: 'Design blogs & publications', topics: '', why: '', site: '', blog: '', feed: '', newsletter: '', social: {}, priority: 'Medium', region: 'Global', notes: '', enabled: true, paused: false, custom: true, dirty: true }, o || {}); T.sources.unshift(s); save(); return s; }
  const updateSource = (id, patch) => { const s = T.sources.find(x => x.id === id); if (s) { Object.assign(s, patch, { dirty: true }); save(); } return s; };
  const removeSource = id => { gone('sources', id); T.sources = T.sources.filter(s => s.id !== id); save(); };

  // ---- topic suggestions -----------------------------------------------------------------------------------------------------------------------------
  const FUNC = new Set('the and for with that this from your what why how are was our you not its but all can has have about into more than they them then when will would should could of in on to is it a an as at by or be we do does new via vs'.split(' '));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  // one-word and two-word phrases from a title; two-word phrases only from neighbouring words
  function phrasesOf(title) {
    const raw = String(title || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean), out = new Set();
    raw.forEach((w, i) => { if (w.length > 3 && !FUNC.has(w) && !STOP.has(w) && !/^\d+$/.test(w)) out.add(w); const n = raw[i + 1]; if (n && !FUNC.has(w) && !FUNC.has(n) && w.length > 2 && n.length > 2 && !(STOP.has(w) && STOP.has(n)) && !/^\d+$/.test(w + n)) out.add(w + ' ' + n); });
    return out;
  }
  function suggest(o) {
    o = o || {}; const days = o.days || 45, cutoff = now() - days * 864e5, made = [];
    const links = T.links.filter(l => l.status !== 'Skipped' && (l.publishedAt || l.capturedAt) >= cutoff), have = new Set(T.topics.map(t => t.key));
    const byMain = {}; links.forEach(l => (byMain[l.topic] = byMain[l.topic] || []).push(l));
    Object.entries(byMain).forEach(([main, ls]) => {
      if (main === 'Other' && ls.length < 3) return;
      const df = new Map(); ls.forEach(l => phrasesOf(l.title).forEach(p => df.set(p, (df.get(p) || new Set()).add(l.id))));
      const cand = [...df.entries()].filter(([p, s2]) => s2.size >= 2).map(([p, s2]) => ({ p, ids: [...s2], score: s2.size * (p.includes(' ') ? 1.6 : 1) })).sort((a, b) => b.score - a.score);
      const used = new Set(), groups = [];
      while (groups.length < 3) {
        const avail = cand.filter(c => !c.ids.every(i => used.has(i))); if (!avail.length) break; const a = avail[0];
        const b = avail.slice(1).find(c => !(c.p.includes(a.p) || a.p.includes(c.p)) && c.ids.filter(i => a.ids.includes(i)).length >= 2);
        const ids = b ? a.ids.filter(i => b.ids.includes(i)) : a.ids; ids.forEach(i => used.add(i)); used.add(a.p);
        groups.push({ a: a.p, b: b ? b.p : '', ids }); cand.splice(cand.indexOf(a), 1);
      }
      if (!groups.length) { const best = ls.slice().sort((x, y) => y.score - x.score)[0]; if (best && best.score >= 4) { const ph = [...phrasesOf(best.title)].sort((x, y) => y.length - x.length)[0]; if (ph) groups.push({ a: ph, b: '', ids: [best.id] }); } }
      groups.forEach(g => {
        const key = (main + '|' + g.a + '|' + g.b).toLowerCase(); if (have.has(key)) return; have.add(key);
        const sup = g.ids.map(id => T.links.find(l => l.id === id)).filter(Boolean), srcs = [...new Set(sup.map(l => l.source))], mw = main.toLowerCase();
        const lowFirst = x => x.split(' ').map(w => (/^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase())).join(' '), title = g.b ? `${cap(g.b)} in ${g.a}` : (g.a.split(' ').some(w => mw.includes(w) && w.length > 3) ? cap(g.a) : `${cap(g.a)} in ${main === 'Other' ? 'design' : lowFirst(main)}`);
        const t = { id: uid('t'), key, title, mainTopic: main, angle: `${sup.length} ${sup.length === 1 ? 'link' : 'links'} from ${srcs.length} ${srcs.length === 1 ? 'source' : 'sources'} (${srcs.slice(0, 3).join(', ')}${srcs.length > 3 ? '…' : ''}). Latest ${dayStr(Math.max(...sup.map(l => l.publishedAt || l.capturedAt)))}.`, linkIds: g.ids, status: 'Needs review', created: now(), note: '', draftId: '', independent: srcs.length, dirty: true };
        T.topics.push(t); made.push(t);
      });
    });
    if (made.length) save(); return made;
  }
  const addTopic = o => { const t = Object.assign({ id: uid('t'), key: uid('k'), title: 'New topic', mainTopic: 'Other', angle: '', linkIds: [], status: 'Needs review', created: now(), note: '', draftId: '', independent: 0, dirty: true }, o || {}); T.topics.unshift(t); save(); return t; };
  const updateTopic = (id, patch) => { const t = T.topics.find(x => x.id === id); if (t) { Object.assign(t, patch, { dirty: true }); save(); } return t; };
  const removeTopic = id => { gone('topics', id); T.topics = T.topics.filter(t => t.id !== id); save(); };
  const refsOf = t => (t.linkIds || []).map(id => T.links.find(l => l.id === id)).filter(Boolean).map(l => ({ title: l.title, url: l.url, source: l.source, published: l.published }));

  // ---- CSV (a plain fallback when the Sheet is not connected) ---------------------------------------------------------------------------------------------------
  const csvCell = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const toCSV = (cols, rows) => [cols.map(csvCell).join(','), ...rows.map(r => cols.map(c => csvCell(r[c])).join(','))].join('\n');
  function csvFiles(drafts) {
    const src = T.sources.map(s => ({ ID: s.id, Name: s.name, Group: s.group, Type: s.type, Priority: s.priority, Region: s.region, 'Primary topics': s.topics, Website: s.site, 'Blog / articles': s.blog, 'Feed URL': s.feed, Newsletter: s.newsletter, Enabled: s.enabled ? 'TRUE' : 'FALSE', Paused: s.paused ? 'TRUE' : 'FALSE', 'Last checked': s.lastChecked ? new Date(s.lastChecked).toISOString() : '', 'Last status': s.lastStatus || '', 'Last error': s.lastError || '', Notes: s.notes }));
    const lk = T.links.map(l => ({ ID: l.id, Captured: l.captured, Published: l.published, Source: l.source, Title: l.title, URL: l.url, Summary: l.summary, 'Main topic': l.topic, 'Other topics': (l.topics2 || []).join('; '), Relevance: l.score, Status: l.status, Notes: l.notes }));
    const tp = T.topics.map(t => ({ ID: t.id, Title: t.title, 'Main topic': t.mainTopic, Angle: t.angle, 'Supporting URLs': refsOf(t).map(r => r.url).join('\n'), Status: t.status, Created: dayStr(t.created), 'Decision note': t.note, 'Draft ID': t.draftId }));
    const dr = (drafts || []).map(d => ({ ID: d.id, Title: d.title, Status: d.approved ? 'Approved for export' : d.status, Updated: new Date(d.updated).toISOString(), Slides: d.slides, 'Topic ID': d.topicId || '' }));
    return [['Sources.csv', toCSV(Object.keys(src[0] || { ID: 1 }), src)], ['Found links.csv', toCSV(Object.keys(lk[0] || { ID: 1, Title: 1, URL: 1 }), lk)], ['Topics.csv', toCSV(Object.keys(tp[0] || { ID: 1, Title: 1 }), tp)], ['Content drafts.csv', toCSV(Object.keys(dr[0] || { ID: 1, Title: 1 }), dr)]];
  }
  // simple CSV reader for importing links
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) { const c = text[i]; if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; } else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c; }
    if (cell || row.length) { row.push(cell); rows.push(row); } const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
    return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  }

  window.SixjulyTracker = {
    LINK_STATUS, TOPIC_STATUS, load, save, get data() { return T; }, on(fn) { listeners.push(fn); }, emit,
    canonical, strip, short, ago, dayStr, classify, relevance, parseFeed, checkInBrowser, markChecked, method,
    addLinks, setLinkStatus, removeLink, addSource, updateSource, removeSource, suggest, addTopic, updateTopic, removeTopic, refsOf, csvFiles, parseCSV, uid,
    reset() { T = { sources: clone(STARTER.sources), links: [], topics: [], taxonomy: clone(STARTER.taxonomy), seeded: true }; save(); },
  };
})();
