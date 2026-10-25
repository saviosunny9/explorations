/* Sixjuly Flow — Topics and Drafts dashboards.
   Topics: suggested topics with their supporting links, found links, the source list, and the Google Sheet connection.
   Nothing here creates a post by itself: a topic must be approved first, and a finished post has its own approval inside the editor. */
(function () {
  'use strict';
  const TR = window.SixjulyTracker, Sheet = window.SixjulySheet, D = window.SixjulyDrafts, X = window.SixjulyExport, C = window.SixjulyCopy, R = window.SixjulyRender, h = window.sjh;
  const toast = m => window.SixjulyToast && window.SixjulyToast(m);
  const st = {
    view: 'flow', tab: 'topics', busy: '', busyMsg: '', syncMsg: '', syncOk: true, open: new Set(), shown: { links: 60 },
    f: { topics: { q: '', status: '', main: '', source: '', days: '0' }, links: { q: '', source: '', topic: '', status: '', days: '0' }, sources: { q: '', group: '', on: '' } },
  };
  const GROUP_ORDER = ['Studios & companies', 'People', 'Design blogs & publications', 'News sites', 'Newsletters', 'Research', 'Platforms & technology', 'Other'];
  const PRIOS = ['Core', 'High', 'Medium', 'Low'];
  const T = () => TR.data;
  let listEl = null, barEl = null, rt = 0;

  // ---- navigation ----------------------------------------------------------------------------------------------------------------------------------------
  function show(view) {
    st.view = view; document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
    document.getElementById('flowView').hidden = view !== 'flow'; document.getElementById('topicsView').hidden = view !== 'topics'; document.getElementById('draftsView').hidden = view !== 'drafts';
    ['runBtn', 'auto', 'addBtn', 'exBtn', 'gUndo'].forEach(id => { const el = document.getElementById(id); const w = el && (el.closest('.menuwrap') || el.closest('label') || el); if (w) w.style.visibility = view === 'flow' ? '' : 'hidden'; });
    if (view === 'topics') renderDash(); if (view === 'drafts') renderDrafts();
  }

  // ---- small helpers -----------------------------------------------------------------------------------------------------------------------------------------
  const chip = (t, cls) => h('span.chip' + (cls ? '.' + cls : ''), null, t);
  const dot = s => h('span.sd.' + (s === 'ok' ? 'ok' : s === 'failed' ? 'bad' : s === 'manual' ? 'man' : 'none'), { title: s === 'ok' ? 'Checked' : s === 'failed' ? 'Last check failed' : s === 'manual' ? 'Needs manual review' : 'Not checked yet' });
  const sel = (opts, val, on, cls) => { const s = h('select' + (cls ? '.' + cls : ''), { onchange: e => on(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: String(val) === String(v) }, l))); return s; };
  const field = (label, ctl, hint) => h('label.df', null, h('span', null, label), ctl, hint ? h('small', null, hint) : null);
  const inRange = (t, days) => !(+days) || (t || 0) >= Date.now() - (+days) * 864e5;
  const safeUrl = u => (/^https?:\/\//i.test(u) ? u : '#');
  const link = (u, t) => h('a', { href: safeUrl(u), target: '_blank', rel: 'noopener noreferrer' }, t || u);
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const DAYS = [['0', 'Any time'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']];

  // ---- shell -----------------------------------------------------------------------------------------------------------------------------------------------------
  function renderDash() {
    const root = document.getElementById('topicsView'); if (!T()) return; root.innerHTML = '';
    const counts = { topics: T().topics.length, links: T().links.length, sources: T().sources.length };
    const tabs = [['topics', 'Suggested topics', counts.topics], ['links', 'Found links', counts.links], ['sources', 'Sources', counts.sources], ['sheet', 'Google Sheet', null]];
    root.append(h('div.dh', null,
      h('div.dtabs', null, tabs.map(([k, l, n]) => h('button' + (st.tab === k ? '.on' : ''), { type: 'button', onclick: () => { st.tab = k; renderDash(); } }, l, n != null ? h('i', null, String(n)) : null, k === 'sheet' ? h('span.sd.' + (Sheet.connected ? 'ok' : 'none'), { title: Sheet.connected ? 'Connected' : 'Not connected' }) : null))),
      h('div.spacer'),
      h('button.btn.sm', { type: 'button', disabled: !!st.busy, onclick: () => checkAll() }, st.busy === 'check' ? st.busyMsg : 'Check sources'),
      h('button.btn.sm.primary', { type: 'button', disabled: !!st.busy, onclick: () => { const n = TR.suggest().length; toast(n ? `${n} new topic${n === 1 ? '' : 's'} to review` : 'No new topic ideas yet. Check sources or add links first.'); st.tab = 'topics'; renderDash(); } }, 'Suggest topics')));
    root.append(banner());
    const body = h('div.dbody'); root.append(body); ({ topics: topicsTab, links: linksTab, sources: sourcesTab, sheet: sheetTab })[st.tab](body);
  }
  function banner() {
    const items = [];
    if (!Sheet.connected) items.push(h('div.bn', null, h('b', null, 'Google Sheet not connected. '), 'Sources, links and topics are saved in this browser only. ', h('button.lnk', { type: 'button', onclick: () => { st.tab = 'sheet'; renderDash(); } }, 'Connect a Sheet')));
    else if (!st.syncOk) items.push(h('div.bn.warn', null, h('b', null, 'Sheet sync problem. '), st.syncMsg));
    else if (st.syncMsg) items.push(h('div.bn.ok', null, st.syncMsg));
    return h('div.bns', null, items);
  }
  const refresh = () => { clearTimeout(rt); rt = setTimeout(() => { if (st.view === 'topics') renderDash(); }, 60); };
  const refreshList = () => { if (listEl) listEl.render(); };

  // ---- topics tab --------------------------------------------------------------------------------------------------------------------------------------------------
  function topicsTab(body) {
    const f = st.f.topics, mains = [...new Set(T().topics.map(t => t.mainTopic))].sort();
    body.append(h('div.fbar', null,
      h('input', { type: 'search', placeholder: 'Search topics', value: f.q, 'aria-label': 'Search topics', oninput: e => { f.q = e.target.value; refreshList(); } }),
      sel([['', 'Any status'], ...TR.TOPIC_STATUS.map(s => [s, s])], f.status, v => { f.status = v; refreshList(); }),
      sel([['', 'Any subject'], ...mains.map(m => [m, m])], f.main, v => { f.main = v; refreshList(); }),
      sel(DAYS, f.days, v => { f.days = v; refreshList(); }), sel([['', 'Any source'], ...[...new Set(T().links.map(l => l.source))].sort().map(x => [x, x])], f.source || '', v => { f.source = v; refreshList(); }),
      h('div.spacer'), h('button.btn.sm', { type: 'button', title: 'Rewrite the suggested titles in clearer words. Uses Claude.', onclick: rewordAll }, 'Improve wording'),
      h('button.btn.sm', { type: 'button', onclick: () => editTopic(null) }, '+ Topic')));
    listEl = h('div.tlist'); listEl.render = () => {
      listEl.innerHTML = ''; const q = f.q.toLowerCase();
      const rows = T().topics.filter(t => (!f.status || t.status === f.status) && (!f.main || t.mainTopic === f.main) && (!f.source || TR.refsOf(t).some(r => r.source === f.source)) && inRange(t.created, f.days) && (!q || (t.title + ' ' + t.angle + ' ' + t.mainTopic).toLowerCase().includes(q))).sort((a, b) => (a.status === 'Needs review' ? 0 : 1) - (b.status === 'Needs review' ? 0 : 1) || b.created - a.created);
      if (!rows.length) return listEl.append(h('div.empty2', null, h('h3', null, T().topics.length ? 'Nothing matches these filters' : 'No topic suggestions yet'), h('p', null, T().topics.length ? 'Clear a filter to see more.' : 'Press “Check sources” to look for new links (or paste links on the Found links tab), then “Suggest topics”. Each suggestion shows the links behind it, and nothing becomes a post until you approve it.')));
      rows.forEach(t => listEl.append(topicCard(t)));
    };
    body.append(listEl); listEl.render();
  }
  function topicCard(t) {
    const refs = TR.refsOf(t), open = st.open.has(t.id), links = (t.linkIds || []).map(id => T().links.find(l => l.id === id)).filter(Boolean);
    const stCls = { Approved: 'ok', Rejected: 'no', 'Saved for later': 'later', 'Draft ready': 'ok' }[t.status] || '';
    const act = (label, status, cls) => h('button.btn.sm' + (cls ? '.' + cls : ''), { type: 'button', disabled: t.status === status, onclick: () => { TR.updateTopic(t.id, { status }); refresh(); } }, label);
    return h('article.tc.st-' + (stCls || 'new'), null,
      h('div.tc-h', null, h('h3', null, t.title), chip(t.mainTopic), chip(t.status, stCls), h('span.muted.cnt', null, `${links.length} ${links.length === 1 ? 'link' : 'links'} · ${t.independent || new Set(links.map(l => l.source)).size} ${(t.independent || 1) === 1 ? 'source' : 'sources'}`)),
      t.angle ? h('p.angle', null, t.angle) : null, t.note ? h('p.note', null, 'Note: ' + t.note) : null,
      h('div.tc-a', null, act('Approve', 'Approved', 'ok'), act('Save for later', 'Saved for later'), act('Reject', 'Rejected'),
        t.status === 'Approved' ? h('button.btn.sm.primary', { type: 'button', disabled: !!st.busy, onclick: () => makeDraft(t) }, st.busy === 't' + t.id ? 'Creating…' : 'Create draft') : null,
        t.status === 'Draft ready' && t.draftId ? h('button.btn.sm.primary', { type: 'button', onclick: () => window.SixjulyApp.openDraft(t.draftId) }, 'Open draft') : null,
        h('div.spacer'), h('button.btn.sm', { type: 'button', onclick: () => editTopic(t) }, 'Edit'), h('button.btn.sm', { type: 'button', title: 'Remove this suggestion', onclick: () => { TR.removeTopic(t.id); refresh(); } }, '×')),
      h('details', { open, ontoggle: e => (e.target.open ? st.open.add(t.id) : st.open.delete(t.id)) }, h('summary', null, `Where this came from (${refs.length})`),
        h('ul.sup', null, links.map(l => h('li', null, h('div', null, link(l.url, l.title), ' ', h('span.muted', null, `${l.source}${l.published ? ' · ' + l.published : ''}`)), l.summary ? h('div.sm', null, l.summary) : null)))));
  }
  function editTopic(t) {
    const dlg = h('dialog.dlg'); const v = Object.assign({ title: '', mainTopic: 'Other', angle: '', note: '' }, t || {});
    const mains = T().taxonomy.map(x => x.topic).concat(['Other']);
    const title = h('input', { type: 'text', value: v.title }), main = sel(mains.map(m => [m, m]), v.mainTopic, () => {}), angle = h('textarea', { rows: 3 }, v.angle), note = h('textarea', { rows: 2 }, v.note);
    dlg.append(h('form', { method: 'dialog', onsubmit: e => e.preventDefault() }, h('h3', null, t ? 'Edit topic' : 'Add a topic'), field('Topic', title), field('Subject', main), field('Angle (one or two plain sentences)', angle), field('Decision note', note, 'Why you approved, rejected or parked it.'),
      h('div.row', null, h('button.btn', { type: 'button', onclick: () => dlg.close() }, 'Cancel'), h('div.spacer'), h('button.btn.primary', { type: 'button', onclick: () => { const patch = { title: title.value.trim() || 'Untitled topic', mainTopic: main.value, angle: angle.value.trim(), note: note.value.trim() }; if (t) TR.updateTopic(t.id, patch); else TR.addTopic(patch); dlg.close(); refresh(); } }, 'Save'))));
    document.body.append(dlg); dlg.addEventListener('close', () => dlg.remove()); dlg.showModal(); title.focus();
  }
  async function makeDraft(t) {
    st.busy = 't' + t.id; refresh();
    try { await window.SixjulyApp.createDraftFromTopic(t); } catch (e) { toast(e.message || 'Could not create the draft'); }
    st.busy = ''; refresh();
  }
  async function rewordAll() {
    const todo = T().topics.filter(t => t.status === 'Needs review').slice(0, 12); if (!todo.length) return toast('No topics waiting for review.');
    if (!(await C.canUseClaude(window.SixjulyFlow.apiKey))) return toast('Improving the wording needs Claude: add an API key in Settings, or open this inside Claude.');
    toast('Improving wording…');
    try { const out = await C.rewordTopics(todo.map(t => ({ id: t.id, title: t.title, main: t.mainTopic, linkTitles: TR.refsOf(t).map(r => r.title) })), { apiKey: window.SixjulyFlow.apiKey }); out.forEach(o => { if (o && o.id && o.title) TR.updateTopic(o.id, { title: String(o.title).slice(0, 120), angle: o.angle ? String(o.angle).slice(0, 280) : undefined }); }); toast('Wording updated'); refresh(); }
    catch (e) { toast('Could not reword: ' + e.message); }
  }

  // ---- links tab ----------------------------------------------------------------------------------------------------------------------------------------------------
  function linksTab(body) {
    const f = st.f.links, srcs = [...new Set(T().links.map(l => l.source))].sort(), mains = [...new Set(T().links.map(l => l.topic))].sort();
    body.append(h('div.fbar', null,
      h('input', { type: 'search', placeholder: 'Search links', value: f.q, 'aria-label': 'Search links', oninput: e => { f.q = e.target.value; st.shown.links = 60; refreshList(); } }),
      sel([['', 'Any source'], ...srcs.map(s => [s, s])], f.source, v => { f.source = v; refreshList(); }), sel([['', 'Any subject'], ...mains.map(m => [m, m])], f.topic, v => { f.topic = v; refreshList(); }),
      sel([['', 'Any status'], ...TR.LINK_STATUS.map(s => [s, s])], f.status, v => { f.status = v; refreshList(); }), sel(DAYS, f.days, v => { f.days = v; refreshList(); }),
      h('div.spacer'), h('button.btn.sm', { type: 'button', onclick: importCSV }, 'Import CSV'), h('button.btn.sm.primary', { type: 'button', onclick: addLinkDialog }, '+ Add link')));
    listEl = h('div.llist'); listEl.render = () => {
      listEl.innerHTML = ''; const q = f.q.toLowerCase();
      const rows = T().links.filter(l => (!f.source || l.source === f.source) && (!f.topic || l.topic === f.topic) && (!f.status || l.status === f.status) && inRange(l.publishedAt || l.capturedAt, f.days) && (!q || (l.title + ' ' + l.summary + ' ' + l.source).toLowerCase().includes(q))).sort((a, b) => (b.publishedAt || b.capturedAt) - (a.publishedAt || a.capturedAt));
      if (!rows.length) return listEl.append(h('div.empty2', null, h('h3', null, T().links.length ? 'Nothing matches these filters' : 'No links yet'), h('p', null, 'Links appear here when a feed is checked. For sources that cannot be checked automatically, use “Add link” to save a link and review it yourself.')));
      listEl.append(h('div.lh', null, h('span', null, 'Link'), h('span', null, 'Source'), h('span', null, 'Date'), h('span', null, 'Subject'), h('span', null, 'Status'), h('span')));
      rows.slice(0, st.shown.links).forEach(l => listEl.append(h('div.lr' + (l.status === 'Skipped' ? '.skip' : ''), null,
        h('div.lt', null, link(l.url, l.title), l.summary ? h('div.sm', null, l.summary) : null), h('div.ls', { title: l.source }, l.source, h('div.muted', null, hostOf(l.url))), h('div.ld', null, l.published || l.captured),
        h('div.lc', null, chip(l.topic), h('span.score', { title: 'Relevance ' + l.score + ' of 5' }, '●'.repeat(l.score || 1))),
        sel(TR.LINK_STATUS.map(s => [s, s]), l.status, v => { TR.setLinkStatus(l.id, v); }, 'mini'),
        h('button.btn.sm', { type: 'button', title: 'Remove link', onclick: () => { TR.removeLink(l.id); refresh(); } }, '×'))));
      if (rows.length > st.shown.links) listEl.append(h('button.btn.sm.more', { type: 'button', onclick: () => { st.shown.links += 100; refreshList(); } }, `Show more (${rows.length - st.shown.links} left)`));
    };
    body.append(listEl); listEl.render();
  }
  function addLinkDialog() {
    const dlg = h('dialog.dlg'), url = h('input', { type: 'url', placeholder: 'https://…' }), title = h('input', { type: 'text', placeholder: 'Title of the page' }), date = h('input', { type: 'date' }), note = h('textarea', { rows: 3, maxLength: 280, placeholder: 'One or two sentences in your own words (kept short)' });
    const src = h('input', { type: 'text', list: 'srcnames', placeholder: 'Source name' }); const dl = h('datalist#srcnames', null, T().sources.map(s => h('option', { value: s.name })));
    dlg.append(h('form', { method: 'dialog', onsubmit: e => e.preventDefault() }, h('h3', null, 'Add a link'), h('p.edhint', null, 'Use this for sources that cannot be checked automatically, such as social posts and newsletters. Only the link, title, date and your short note are kept.'), field('Link', url), field('Title', title), field('Source', src), dl, field('Date', date), field('Short note', note),
      h('div.row', null, h('button.btn', { type: 'button', onclick: () => dlg.close() }, 'Cancel'), h('div.spacer'), h('button.btn.primary', { type: 'button', onclick: () => {
        if (!/^https?:\/\//i.test(url.value.trim())) return toast('Paste a full link starting with https://'); if (!title.value.trim()) return toast('Add a title so you can recognise it later');
        const s = T().sources.find(x => x.name.toLowerCase() === src.value.trim().toLowerCase()); const n = TR.addLinks([{ url: url.value.trim(), title: title.value.trim(), published: date.value, summary: note.value, source: src.value.trim() || 'Added by hand' }], s, { manual: true, status: 'Needs review' });
        toast(n ? 'Link saved' : 'That link is already saved'); dlg.close(); refresh();
      } }, 'Save link'))));
    document.body.append(dlg); dlg.addEventListener('close', () => dlg.remove()); dlg.showModal(); url.focus();
  }
  function importCSV() {
    const inp = h('input', { type: 'file', accept: '.csv,text/csv', onchange: async e => { const f = e.target.files[0]; if (!f) return; const rows = TR.parseCSV(await f.text()); const items = rows.map(r => ({ url: r.url || r.link || r['content url'], title: r.title || r.name || r['post / article title'], published: r.published || r.date || r['published date'], summary: r.summary || r.note || r.notes, source: r.source || r['source name'] })); const n = TR.addLinks(items, null, { manual: true, status: 'Needs review' }); toast(`${n} new link${n === 1 ? '' : 's'} added (${items.length - n} skipped as duplicates or incomplete)`); refresh(); } }); inp.click();
  }

  // ---- sources tab ----------------------------------------------------------------------------------------------------------------------------------------------------
  function sourcesTab(body) {
    const f = st.f.sources, groups = [...new Set(T().sources.map(s => s.group || 'Other'))];
    body.append(h('p.explain', null, h('b', null, 'How checking works. '), 'Sources with a feed address are read automatically. Pages without one are read by the Google Sheet collector only if the page announces its own feed and its robots.txt allows it. Social profiles (LinkedIn, Instagram, X, YouTube) and newsletters are never read by this app: open them from the links on each row and use “Add link” for anything worth keeping.'));
    body.append(h('div.fbar', null,
      h('input', { type: 'search', placeholder: 'Search sources', value: f.q, 'aria-label': 'Search sources', oninput: e => { f.q = e.target.value; refreshList(); } }),
      sel([['', 'All groups'], ...GROUP_ORDER.filter(g => groups.includes(g)).map(g => [g, g])], f.group, v => { f.group = v; refreshList(); }), sel([['', 'On and paused'], ['on', 'Only following'], ['off', 'Only off']], f.on, v => { f.on = v; refreshList(); }),
      h('div.spacer'), h('button.btn.sm.primary', { type: 'button', onclick: () => sourceDialog(null) }, '+ Add source')));
    listEl = h('div.slist'); listEl.render = () => {
      listEl.innerHTML = ''; const q = f.q.toLowerCase();
      const rows = T().sources.filter(s => (!f.group || (s.group || 'Other') === f.group) && (!f.on || (f.on === 'on' ? s.enabled && !s.paused : !s.enabled || s.paused)) && (!q || (s.name + ' ' + s.type + ' ' + s.topics).toLowerCase().includes(q)));
      if (!rows.length) return listEl.append(h('div.empty2', null, h('h3', null, 'No sources match'), h('p', null, 'Clear the search or add a source.')));
      GROUP_ORDER.concat(groups.filter(g => !GROUP_ORDER.includes(g))).forEach(g => { const gs = rows.filter(s => (s.group || 'Other') === g); if (!gs.length) return;
        const det = h('details.sgrp', { open: true }, h('summary', null, g, h('i', null, String(gs.length))), h('div.sh', null, h('span'), h('span', null, 'Source'), h('span', null, 'Method'), h('span', null, 'Last check'), h('span')));
        gs.sort((a, b) => PRIOS.indexOf(a.priority) - PRIOS.indexOf(b.priority) || a.name.localeCompare(b.name)).forEach(s => det.append(sourceRow(s))); listEl.append(det); });
    };
    body.append(listEl); listEl.render();
  }
  function sourceRow(s) {
    const social = Object.entries(s.social || {}).filter(([, u]) => u);
    return h('div.sr' + (!s.enabled || s.paused ? '.off' : ''), null,
      h('input', { type: 'checkbox', checked: s.enabled && !s.paused, title: 'Follow this source', 'aria-label': 'Follow ' + s.name, onchange: e => { TR.updateSource(s.id, { enabled: e.target.checked, paused: false }); refresh(); } }),
      h('div.sn', null, h('div', null, s.site ? link(s.site, s.name) : s.name, ' ', chip(s.priority, 'p' + s.priority), s.paused ? chip('Paused', 'later') : null), h('div.muted.sm', null, s.type, s.topics ? ' · ' + s.topics : ''),
        h('div.sl', null, s.blog && s.blog !== s.site ? link(s.blog, 'Articles') : null, s.newsletter ? link(s.newsletter, 'Newsletter (manual)') : null, social.map(([k, u]) => link(u, ({ linkedin: 'LinkedIn', instagram: 'Instagram', x: 'X', youtube: 'YouTube' })[k] + ' (manual)')))),
      h('div.sm2', null, TR.method(s)), h('div.sc', { title: s.lastError || '' }, dot(s.lastStatus), ' ', TR.ago(s.lastChecked), s.lastStatus === 'ok' && s.lastAdded ? h('span.muted', null, ` · ${s.lastAdded} new`) : null, s.lastError ? h('div.err', null, s.lastError) : null),
      h('div.sa', null, h('button.btn.sm', { type: 'button', disabled: !!st.busy || !s.enabled, onclick: () => checkOne(s) }, 'Check'), h('button.btn.sm', { type: 'button', onclick: () => sourceDialog(s) }, 'Edit'), h('button.btn.sm', { type: 'button', title: s.paused ? 'Resume' : 'Pause', onclick: () => { TR.updateSource(s.id, { paused: !s.paused }); refresh(); } }, s.paused ? '▶' : '⏸'), h('button.btn.sm', { type: 'button', title: 'Remove source', onclick: () => { TR.removeSource(s.id); refresh(); } }, '×')));
  }
  function sourceDialog(s) {
    const dlg = h('dialog.dlg.wide'), v = Object.assign({ name: '', group: 'Design blogs & publications', type: '', priority: 'Medium', site: '', blog: '', feed: '', newsletter: '', topics: '', notes: '', social: {} }, s || {});
    const i = (k, ph, type) => h('input', { type: type || 'text', value: v[k] || '', placeholder: ph || '' }), I = { name: i('name', 'Name'), type: i('type', 'e.g. Design blog, Newsletter, RSS feed, Studio'), site: i('site', 'https://', 'url'), blog: i('blog', 'https://', 'url'), feed: i('feed', 'https://…/feed', 'url'), newsletter: i('newsletter', 'https://', 'url'), topics: i('topics', 'Topics it covers') };
    const soc = ['linkedin', 'instagram', 'x', 'youtube'].reduce((o, k) => { o[k] = h('input', { type: 'url', value: (v.social || {})[k] || '', placeholder: 'https://' }); return o; }, {});
    const grp = sel([...GROUP_ORDER].map(g => [g, g]), v.group, () => {}), pri = sel(PRIOS.map(p => [p, p]), v.priority, () => {}), notes = h('textarea', { rows: 2 }, v.notes || '');
    dlg.append(h('form', { method: 'dialog', onsubmit: e => e.preventDefault() }, h('h3', null, s ? 'Edit source' : 'Add a source'),
      h('div.g2', null, field('Name', I.name), field('Kind of source', I.type, 'Design blog, company website, newsletter, news site, RSS feed, social profile…')), h('div.g2', null, field('Group', grp), field('Priority', pri)),
      field('Website', I.site), h('div.g2', null, field('Articles page', I.blog), field('Feed (RSS / Atom) address', I.feed, 'Best option. Leave empty if there is none.')), field('Newsletter page (manual)', I.newsletter), field('Topics it covers', I.topics),
      h('details', null, h('summary', null, 'Social profiles (opened by you, never read by the app)'), h('div.g2', null, field('LinkedIn', soc.linkedin), field('Instagram', soc.instagram), field('X', soc.x), field('YouTube', soc.youtube))), field('Notes', notes),
      h('div.row', null, h('button.btn', { type: 'button', onclick: () => dlg.close() }, 'Cancel'), h('div.spacer'), h('button.btn.primary', { type: 'button', onclick: () => {
        if (!I.name.value.trim()) return toast('Give the source a name');
        const patch = { name: I.name.value.trim(), type: I.type.value.trim(), group: grp.value, priority: pri.value, site: I.site.value.trim(), blog: I.blog.value.trim(), feed: I.feed.value.trim(), newsletter: I.newsletter.value.trim(), topics: I.topics.value.trim(), notes: notes.value.trim(), social: Object.fromEntries(Object.entries(soc).map(([k, e]) => [k, e.value.trim()])) };
        if (s) TR.updateSource(s.id, patch); else TR.addSource(patch); dlg.close(); refresh();
      } }, 'Save source'))));
    document.body.append(dlg); dlg.addEventListener('close', () => dlg.remove()); dlg.showModal(); I.name.focus();
  }

  // ---- checking ---------------------------------------------------------------------------------------------------------------------------------------------------------------
  async function checkOne(s) {
    st.busy = 'check'; st.busyMsg = 'Checking…'; refresh();
    try {
      if (Sheet.connected) { await Sheet.check(null, [s.id]); }
      else { const r = await TR.checkInBrowser(s); TR.markChecked(s, r); toast(r.ok ? `${r.added} new link${r.added === 1 ? '' : 's'} from ${s.name}` : r.error); }
    } catch (e) { TR.markChecked(s, { ok: false, error: e.message }); toast(e.message); }
    st.busy = ''; refresh();
  }
  async function checkAll() {
    if (st.busy) return; st.busy = 'check'; st.busyMsg = 'Checking…'; renderDash();
    try {
      let msg;
      if (Sheet.connected) { const r = await Sheet.check((d, t) => { st.busyMsg = `Checking ${d}/${t}`; const b = document.querySelector('.dh .btn.sm'); if (b) b.textContent = st.busyMsg; }); msg = `Checked ${r.total} sources on Google: ${r.added} new links, ${r.failed} failed, ${r.manual} need manual review.`; }
      else {
        const todo = T().sources.filter(s => s.enabled && !s.paused && s.feed); let added = 0, ok = 0, blocked = 0, i = 0;
        for (const s of todo) { i++; st.busyMsg = `Checking ${i}/${todo.length}`; const b = document.querySelector('.dh .btn.sm'); if (b) b.textContent = st.busyMsg; const r = await TR.checkInBrowser(s); TR.markChecked(s, r); if (r.ok) { ok++; added += r.added; } else blocked++; }
        const noFeed = T().sources.filter(s => s.enabled && !s.paused && !s.feed).length;
        msg = `Read ${ok} of ${todo.length} feeds in this browser: ${added} new links. ${blocked ? blocked + ' feeds are blocked by their websites in a browser. ' : ''}${noFeed} sources have no feed and need the Google Sheet collector or manual review.`;
      }
      const n = TR.suggest().length; toast(msg + (n ? ` ${n} new topic ideas.` : '')); st.syncMsg = msg; st.syncOk = true;
    } catch (e) { st.syncOk = false; st.syncMsg = e.message; toast(e.message); }
    st.busy = ''; renderDash();
  }

  // ---- Google Sheet tab ------------------------------------------------------------------------------------------------------------------------------------------------------------
  function sheetTab(body) {
    const cfg = Sheet.cfg, url = h('input', { type: 'url', value: cfg.url || '', placeholder: 'https://script.google.com/macros/s/…/exec', autocomplete: 'off' }), sec = h('input', { type: 'password', value: cfg.secret || '', placeholder: 'The passphrase you chose in the script', autocomplete: 'off' }), out = h('div.sres');
    const say = (m, ok) => { st.sres = { m, ok }; out.className = 'sres' + (ok === false ? ' bad' : ok ? ' good' : ''); out.textContent = m; };
    if (st.sres) say(st.sres.m, st.sres.ok);
    const run = async (label, fn) => { say(label + '…'); try { const m = await fn(); say(m, true); st.syncOk = true; st.syncMsg = ''; } catch (e) { say(e.message, false); st.syncOk = false; st.syncMsg = e.message; } };
    if (Sheet.blocked) body.append(h('div.bn.warn', null, h('b', null, 'This copy runs inside Claude. '), 'It cannot contact Google, so the Sheet connection is unavailable here. Everything else works and is kept in this browser. To connect a Sheet, open the downloaded app file (dist/sixjuly-flow.html) in Chrome. You can also download the tracker as CSV files below and import them into a Sheet.'));
    body.append(h('div.sheetcols', null,
      h('section.card', null, h('h3', null, Sheet.connected ? 'Connected to your Google Sheet' : 'Connect a Google Sheet'),
        h('p.edhint', null, 'The Sheet keeps four tabs: Sources, Found links, Topics and Content drafts. It holds links, statuses and short notes only. Images and design files stay in this app. If you never connect it, the app still works and saves here.'),
        h('ol.steps', null,
          h('li', null, 'Create a blank Google Sheet. ', h('a', { href: 'https://sheets.new', target: '_blank', rel: 'noopener' }, 'Open a new Sheet ↗')),
          h('li', null, 'In the Sheet choose ', h('b', null, 'Extensions → Apps Script'), ', delete what is there, and paste the script. ', h('button.btn.sm', { type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(window.SJ_APPS_SCRIPT); toast('Script copied'); } catch (e) { toast('Could not copy. Open apps-script/Code.gs and copy it from there.'); } } }, 'Copy script')),
          h('li', null, 'Near the top of the script, change ', h('code', null, "SECRET = 'CHANGE-ME'"), ' to a passphrase only you know, then save (⌘/Ctrl + S).'),
          h('li', null, 'Click ', h('b', null, 'Deploy → New deployment'), ', pick the type ', h('b', null, 'Web app'), ', set “Execute as” to ', h('b', null, 'Me'), ' and “Who has access” to ', h('b', null, 'Anyone'), ', then Deploy and allow the permissions Google asks for.'),
          h('li', null, 'Copy the ', h('b', null, 'Web app URL'), ' and paste it below with your passphrase.')),
        field('Web app URL', url), field('Passphrase', sec, 'Stored in this browser only. Never put it in a public page or share the URL.'),
        h('div.row', null, h('button.btn.primary', { type: 'button', disabled: Sheet.blocked, onclick: () => run('Connecting', async () => { Sheet.set(url.value, sec.value); const r = await Sheet.ping(); await Sheet.setup(); st.syncOk = true; st.sres = { m: `Connected to “${r.sheet}”. The four tabs are ready.`, ok: true }; renderDash(); return st.sres.m; }) }, Sheet.connected ? 'Save and test' : 'Connect'),
          Sheet.connected ? h('button.btn', { type: 'button', onclick: () => { Sheet.clear(); renderDash(); } }, 'Disconnect') : null), out),
      h('section.card', null, h('h3', null, 'Use the Sheet'),
        h('div.col', null,
          h('button.btn', { type: 'button', disabled: !Sheet.connected, onclick: () => run('Sending', async () => { const n = await Sheet.push(true); return `Sent ${n} rows to the Sheet.`; }) }, 'Send everything to the Sheet'),
          h('button.btn', { type: 'button', disabled: !Sheet.connected, onclick: () => run('Reading the Sheet', async () => { const n = await Sheet.pull(); refresh(); return `Read ${n} rows from the Sheet. Edits you made there (statuses, notes) are now here.`; }) }, 'Get latest from the Sheet'),
          h('button.btn', { type: 'button', disabled: !Sheet.connected || !!st.busy, onclick: () => checkAll() }, 'Check all sources on Google'),
          h('p.edhint', null, 'To check sources every morning without opening this app, run the function ', h('code', null, 'installDailyTrigger'), ' once in the Apps Script editor.')),
        h('h3', { style: { marginTop: '22px' } }, 'No Sheet? Use files'),
        h('p.edhint', null, 'Download the tracker as four CSV files you can import into any spreadsheet, or import links from a CSV.'),
        h('div.rg', null, h('button.btn', { type: 'button', onclick: async () => { const list = await D.list(); const files = TR.csvFiles(list).map(([n, t]) => ({ name: n, blob: new Blob([t], { type: 'text/csv' }) })); await X.download(await X.zipFiles(files), 'sixjuly-tracker-csv.zip'); } }, 'Download CSV files'), h('button.btn', { type: 'button', onclick: importCSV }, 'Import links from CSV')),
        h('h3', { style: { marginTop: '22px' } }, 'Starter sources'), h('p.edhint', null, `${T().sources.length} sources came from your tracker workbook. Social links are discovery links, not verified accounts.`),
        h('button.btn', { type: 'button', onclick: () => { if (window.confirmReset) return; const b = event.currentTarget; if (b.dataset.sure) { TR.reset(); renderDash(); } else { b.dataset.sure = 1; b.textContent = 'Press again to reset sources, links and topics'; } } }, 'Reset to starter sources'))));
  }

  // auto-send changes while connected
  let syncT = 0;
  TR.on(what => { if (what !== 'save' || !Sheet.connected || Sheet.blocked) return; clearTimeout(syncT); syncT = setTimeout(async () => { try { const n = await Sheet.push(false); if (n) { st.syncMsg = `Sheet updated at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`; st.syncOk = true; } } catch (e) { st.syncOk = false; st.syncMsg = e.message; } }, 2500); });

  // ---- drafts view ----------------------------------------------------------------------------------------------------------------------------------------------------------------------
  async function renderDrafts() {
    const root = document.getElementById('draftsView'); root.innerHTML = ''; const list = await D.list();
    root.append(h('div.dh', null, h('h2', null, 'Drafts'), h('span.muted', null, `${list.length} saved in this browser`)));
    if (!list.length) return root.append(h('div.empty2', null, h('h3', null, 'No drafts yet'), h('p', null, 'Run the flow and press “Edit” on a post, or approve a topic and create a draft. Edits are saved automatically.')));
    const grid = h('div.dgrid'); root.append(grid);
    list.forEach(d => grid.append(h('article.dc', null,
      h('div.thumb2', { onclick: () => window.SixjulyApp.openDraft(d.id) }, d.thumb ? h('img', { src: d.thumb, alt: '' }) : h('div.nothumb', null, 'No preview')),
      h('div.dcb', null, h('h3', null, d.title), h('div.muted.sm', null, `${d.slides} slides · ${TR.ago(d.updated)}`), h('div', null, chip(d.approved ? 'Approved for export' : d.status, d.approved ? 'ok' : '')),
        h('div.rg.acts', null, h('button.btn.sm.primary', { type: 'button', onclick: () => window.SixjulyApp.openDraft(d.id) }, 'Open'),
          h('button.btn.sm', { type: 'button', onclick: async e => { const b = e.currentTarget; b.disabled = true; const l = b.textContent; b.textContent = 'Preparing…'; try { const dr = await D.load(d.id); await X.download(await X.zipFiles(await X.everything(dr.deck, dr, { ratio: dr.ratio, scale: 1 })), X.slug(dr.title) + '-all.zip'); } catch (er) { toast(er.message); } b.disabled = false; b.textContent = l; } }, 'Download'),
          h('button.btn.sm', { type: 'button', onclick: async () => { const dr = await D.load(d.id), c = JSON.parse(JSON.stringify(dr)); c.id = D.uid('d'); c.title += ' copy'; c.approved = false; c.status = 'Draft ready'; await D.save(c); renderDrafts(); } }, 'Duplicate'),
          h('button.btn.sm', { type: 'button', title: 'Delete draft', onclick: async e => { const b = e.currentTarget; if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Sure?'; return; } await D.remove(d.id); renderDrafts(); } }, '×'))))));
  }

  window.SixjulyDash = { show, renderDash, renderDrafts, st };
})();
