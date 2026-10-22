/* Sixjuly Flow — Google Sheet connection.
   Talks to the small Apps Script web app that lives in your own spreadsheet (apps-script/Code.gs). The only things stored here are the
   web app address and your passphrase, in this browser only. If either is missing the app says so and keeps working locally. */
(function () {
  'use strict';
  const TR = window.SixjulyTracker, KEY = 'sixjuly-flow.sheet';
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } };
  const put = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private window */ } };
  const inClaude = () => !!(window.claude && typeof window.claude.use === 'function');
  const iso = t => (t ? new Date(t).toISOString() : '');

  // ---- entity <-> row -------------------------------------------------------------------------------------------------------------------------------
  const MAP = {
    'Sources': {
      list: T => T.sources, rm: 'sources',
      to: s => ({ ID: s.id, Name: s.name, Group: s.group, Type: s.type, Priority: s.priority, Region: s.region, 'Primary topics': s.topics, Website: s.site, 'Blog / articles': s.blog, 'Feed URL': s.feed, Newsletter: s.newsletter, 'LinkedIn (manual)': (s.social || {}).linkedin || '', 'Instagram (manual)': (s.social || {}).instagram || '', 'X (manual)': (s.social || {}).x || '', 'YouTube (manual)': (s.social || {}).youtube || '', Enabled: s.enabled ? 'TRUE' : 'FALSE', Paused: s.paused ? 'TRUE' : 'FALSE', 'Last checked': iso(s.lastChecked), 'Last status': s.lastStatus || '', 'Last error': s.lastError || '', Method: TR.method(s), Notes: s.notes || '' }),
      from: (r, old) => Object.assign({}, old || {}, { id: String(r.ID), name: r.Name, group: r.Group, type: r.Type, priority: r.Priority, region: r.Region, topics: r['Primary topics'], site: r.Website, blog: r['Blog / articles'], feed: r['Feed URL'], newsletter: r.Newsletter, social: { linkedin: r['LinkedIn (manual)'], instagram: r['Instagram (manual)'], x: r['X (manual)'], youtube: r['YouTube (manual)'] }, enabled: String(r.Enabled).toUpperCase() !== 'FALSE', paused: String(r.Paused).toUpperCase() === 'TRUE', lastChecked: r['Last checked'] ? Date.parse(r['Last checked']) || 0 : 0, lastStatus: r['Last status'] || '', lastError: r['Last error'] || '', notes: r.Notes || '' }),
    },
    'Found links': {
      list: T => T.links, rm: 'links',
      to: l => ({ ID: l.id, Captured: l.captured, Published: l.published, 'Source ID': l.sourceId, Source: l.source, Title: l.title, URL: l.url, Key: l.key, Summary: l.summary, 'Main topic': l.topic, 'Other topics': (l.topics2 || []).join('; '), Relevance: l.score, Status: l.status, Notes: l.notes || '' }),
      from: (r, old) => { const l = Object.assign({}, old || {}, { id: String(r.ID), captured: String(r.Captured || '').slice(0, 10), capturedAt: Date.parse(r.Captured) || (old && old.capturedAt) || Date.now(), published: String(r.Published || '').slice(0, 10), publishedAt: Date.parse(r.Published) || 0, sourceId: String(r['Source ID'] || ''), source: r.Source, title: r.Title, url: r.URL, key: r.Key || TR.canonical(r.URL), summary: r.Summary || '', status: r.Status || 'New', notes: r.Notes || '' }); l.topic = r['Main topic'] || l.topic; l.topics2 = r['Other topics'] ? String(r['Other topics']).split(/;\s*/) : l.topics2 || []; l.score = Number(r.Relevance) || l.score; return l; },
    },
    'Topics': {
      list: T => T.topics, rm: 'topics',
      to: t => ({ ID: t.id, Title: t.title, 'Main topic': t.mainTopic, Angle: t.angle, 'Supporting link IDs': JSON.stringify(t.linkIds || []), 'Supporting URLs': TR.refsOf(t).map(r => r.url).join('\n'), Status: t.status, Created: TR.dayStr(t.created), 'Decision note': t.note || '', 'Draft ID': t.draftId || '' }),
      from: (r, old) => { let ids = []; try { ids = JSON.parse(r['Supporting link IDs'] || '[]'); } catch (e) { /* hand-edited */ } return Object.assign({}, old || {}, { id: String(r.ID), key: (old && old.key) || String(r.ID), title: r.Title, mainTopic: r['Main topic'] || 'Other', angle: r.Angle || '', linkIds: ids, status: r.Status || 'Needs review', created: Date.parse(r.Created) || (old && old.created) || Date.now(), note: r['Decision note'] || '', draftId: r['Draft ID'] || '' }); },
    },
  };
  const draftRow = d => ({ ID: d.id, 'Topic ID': d.topicId || '', Title: d.title, Status: d.approved ? 'Approved for export' : d.status, Updated: iso(d.updated), Slides: d.deck ? d.deck.slides.length : d.slides, Caption: d.deck ? (d.deck.caption || '') : '', Files: 'Kept in the Sixjuly Flow app (Drafts > Export).', Sources: (d.refs || []).map(r => r.url).join('\n') });

  const Sheet = {
    get cfg() { return get(); }, get connected() { return !!(get().url && get().secret); }, get blocked() { return inClaude(); },
    set(url, secret) { put({ url: String(url || '').trim(), secret: String(secret || '').trim() }); },
    clear() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
    async call(action, payload) {
      const c = get(); if (!c.url || !c.secret) throw new Error('The Google Sheet is not connected yet.');
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(c.url)) throw new Error('That address does not look like a Web app URL. It should start with https://script.google.com/macros/s/ and end with /exec.');
      let res; try { res = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ token: c.secret, action }, payload || {})), redirect: 'follow' }); }
      catch (e) { throw new Error(inClaude() ? 'This copy runs inside Claude, which cannot contact Google. Open the downloaded app (dist/sixjuly-flow.html) to use the Sheet.' : 'Could not reach Google. Check the address, your internet connection, and that the web app is deployed for “Anyone”.'); }
      let j; try { j = await res.json(); } catch (e) { throw new Error('Google answered, but not with the connector. Re-deploy the script as a Web app (Execute as: Me, Access: Anyone) and copy the new address.'); }
      if (!j.ok) throw new Error(j.error || 'The Sheet reported an error.'); return j;
    },
    ping() { return Sheet.call('ping'); },
    setup() { return Sheet.call('setup'); },
    // send what changed here; deletions too
    async push(all) {
      const T = TR.data; let n = 0;
      for (const [tab, m] of Object.entries(MAP)) {
        const rows = m.list(T).filter(x => all || x.dirty);
        if (rows.length) { await Sheet.call(all && tab === 'Sources' ? 'replace' : 'upsert', { tab, rows: rows.map(m.to) }); rows.forEach(x => delete x.dirty); n += rows.length; }
        const gone = (T.removed || {})[m.rm] || []; if (gone.length) { await Sheet.call('remove', { tab, ids: gone }); T.removed[m.rm] = []; n += gone.length; }
      }
      if (n) TR.save(); return n;
    },
    async pushDrafts(list) { if (list.length) await Sheet.call('upsert', { tab: 'Content drafts', rows: list.map(draftRow) }); },
    // bring the sheet's rows in (new links from the collector, status changes made by hand)
    async pull() {
      const T = TR.data; let changed = 0;
      for (const [tab, m] of Object.entries(MAP)) {
        const { rows } = await Sheet.call('read', { tab }), list = m.list(T), byId = new Map(list.map(x => [x.id, x]));
        rows.forEach(r => {
          const old = byId.get(String(r.ID)); if (old && old.dirty) return;              // keep unsent local edits
          const o = m.from(r, old); if (tab === 'Found links' && (!o.topic || !o.score)) { const src = T.sources.find(s => s.id === o.sourceId), cls = TR.classify(o.title, o.summary, src && src.topics); o.topic = o.topic || cls.main; o.topics2 = o.topics2 && o.topics2.length ? o.topics2 : cls.others; o.score = o.score || TR.relevance(o, src, cls); o.dirty = true; }
          if (old) Object.assign(old, o); else list.push(o); changed++;
        });
      }
      TR.save(); return changed;
    },
    // ask the collector (in your own Google account) to read the sources, a few at a time
    async check(onProgress, ids) {
      await Sheet.push(false);
      let skip = 0, total = 1, added = 0, failed = 0, manual = 0;
      while (skip < total) {
        const { result } = await Sheet.call('check', { ids: ids || null, limit: 6, skip }); total = result.total; skip = result.done; added += result.added;
        result.status.forEach(st => { const s = TR.data.sources.find(x => x.id === st.id); if (s) { s.lastChecked = Date.parse(st.checked) || Date.now(); s.lastStatus = st.ok ? 'ok' : (st.manual ? 'manual' : 'failed'); s.lastError = st.error || ''; if (st.feed && !s.feed) s.feed = st.feed; s.lastAdded = st.added; if (!st.ok) st.manual ? manual++ : failed++; } });
        if (onProgress) onProgress(Math.min(skip, total), total); if (!result.status.length) break;
      }
      await Sheet.pull(); TR.save(); return { total, added, failed, manual };
    },
  };
  window.SixjulySheet = Sheet;
})();
