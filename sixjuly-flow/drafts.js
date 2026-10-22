/* Sixjuly Flow — local storage for drafts and tracker data.
   Everything lives in this browser (IndexedDB, with an in-memory fallback in private windows). Drafts keep their photos inside,
   so a draft opens exactly as you left it. */
(function () {
  'use strict';
  const R = window.SixjulyRender;
  const DB = 'sixjuly-flow', ST = 'kv', mem = new Map();
  let dbp = null, memOnly = false;
  const open = () => new Promise((res, rej) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
  const db = () => dbp || (dbp = open().catch(e => { memOnly = true; return null; }));
  const run = async (mode, fn) => {
    const d = await db(); if (!d) return fn(null);
    return new Promise((res, rej) => { let out; const t = d.transaction(ST, mode); out = fn(t.objectStore(ST)); t.oncomplete = () => res(out && 'result' in out ? out.result : out); t.onerror = () => rej(t.error); });
  };
  const KV = {
    async get(k) { const r = await run('readonly', s => (s ? s.get(k) : { result: mem.get(k) })); return r === undefined ? undefined : r; },
    async set(k, v) { await run('readwrite', s => { if (s) s.put(v, k); else mem.set(k, v); }); },
    async del(k) { await run('readwrite', s => { if (s) s.delete(k); else mem.delete(k); }); },
    get memoryOnly() { return memOnly; },
  };
  // KV.get on IndexedDB: request.result is only filled after success, so read through a promise
  KV.get = async k => { const d = await db(); if (!d) return mem.get(k); return new Promise((res, rej) => { const r = d.transaction(ST, 'readonly').objectStore(ST).get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); };

  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clone = o => JSON.parse(JSON.stringify(o));
  function usedImages(deck) {
    const ids = new Set(); (deck.slides || []).forEach(s => { (s.imgs || []).forEach(i => ids.add(i)); (s.layers || []).forEach(l => l.img && ids.add(l.img)); });
    return [...ids];
  }
  function restoreImages(map) { return Promise.all(Object.entries(map || {}).map(([id, src]) => new Promise(res => { if (R.imgs.has(id)) return res(); const im = new Image(); im.onload = im.onerror = () => res(); im.src = src; R.imgs.set(id, im); }))); }

  const Drafts = {
    uid,
    // a draft is a deck plus what we know about where it came from; nothing is stored until save()
    create(deck, meta) {
      meta = meta || {};
      const d = clone({ topic: deck.topic, caption: deck.caption, hashtags: deck.hashtags, engine: deck.engine, format: deck.format, slides: deck.slides, brand: deck.brand, design: deck.design, motion: deck.motion || null });
      return { id: uid('d'), title: meta.title || deck.topic || 'Untitled post', status: meta.status || 'Draft ready', topicId: meta.topicId || '', refs: meta.refs || [], ratio: meta.ratio || '1080x1350', deck: d, created: Date.now(), updated: Date.now(), approved: false };
    },
    async list() { const ix = (await KV.get('drafts:index')) || []; return ix.slice().sort((a, b) => b.updated - a.updated); },
    async load(id) { const d = await KV.get('draft:' + id); if (!d) return null; await restoreImages(d.images); return d; },
    async save(draft) {
      draft.updated = Date.now(); const images = {};
      usedImages(draft.deck).forEach(id => { const im = R.imgs.get(id); if (im && im.src) images[id] = im.src; });
      draft.images = images; await KV.set('draft:' + draft.id, draft);
      const ix = ((await KV.get('drafts:index')) || []).filter(x => x.id !== draft.id);
      let thumb = ''; try { const [W, H] = String(draft.ratio || '1080x1350').split('x').map(Number), cv = document.createElement('canvas'); cv.width = 240; cv.height = Math.round(240 * H / W); R.drawSlide(cv.getContext('2d'), draft.deck, 0, { W, H, scale: 240 / W }); thumb = cv.toDataURL('image/jpeg', 0.78); } catch (e) { /* no preview */ }
      ix.push({ thumb, id: draft.id, title: draft.title, status: draft.status, updated: draft.updated, topic: draft.deck.topic, slides: draft.deck.slides.length, topicId: draft.topicId || '', approved: !!draft.approved });
      await KV.set('drafts:index', ix); return draft;
    },
    async remove(id) { await KV.del('draft:' + id); await KV.set('drafts:index', ((await KV.get('drafts:index')) || []).filter(x => x.id !== id)); },
    usedImages, restoreImages,
  };
  window.SixjulyKV = KV; window.SixjulyDrafts = Drafts;
})();
