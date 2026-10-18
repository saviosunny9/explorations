/* Savio's editor — video edits: clips one after another.
   Any image layer with `clip` is part of the main video track. The clips play in their layer order (bottom → top),
   each for its own length, so trimming, speeding up, splitting, deleting or reordering a clip moves everything after it
   (ripple). A clip's `trans` is the transition into it from the clip before; it overlaps the two by its length.

   el.clip = { len (photo hold, s), src (the video file's length, s), trans: { type, dur, dir } | null,
               _in, _out (worked out here for the renderer) } */
(function () {
  'use strict';
  const S = window.Studio, R = window.StudioRender;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round = v => Math.round(v * 1000) / 1000;

  const clipsOf = doc => doc.elements.filter(e => e.clip && e.type === 'image');
  S.clips = () => clipsOf(S.doc);
  S.isVideoEdit = () => S.doc.elements.some(e => e.clip);
  // the video file's own length
  function srcLen(el) {
    if (el.clip && el.clip.src > 0) return el.clip.src;
    const e = R.assetVideo(el.assetId);
    const d = e && e.v && isFinite(e.v.duration) ? e.v.duration : 0;
    if (d && el.clip) el.clip.src = d;
    return d;
  }
  S.clipSrcLen = srcLen;
  // how long a clip plays: the trimmed part of its video at its speed, or a photo's hold time
  function clipLen(el) {
    if (R.isVideoAsset(el.assetId)) {
      const vd = el.video || {}, src = srcLen(el) || 5;
      const end = vd.end > 0 ? Math.min(vd.end, src) : src;
      return Math.max(0.1, (end - (vd.trim || 0)) / (vd.speed || 1));
    }
    return Math.max(0.1, (el.clip && el.clip.len) || 3);
  }
  S.clipLen = clipLen;

  // lay the clips end to end (called on every commit); the design is as long as its clips
  S.layoutClips = function () {
    const doc = S.doc, list = clipsOf(doc);
    if (!list.length) return false;
    let t = 0, prevLen = 0, prev = null;
    const seen = new Set();
    list.forEach((el, i) => {
      // every clip gets its own <video>, even when it's a piece of the same file
      if (R.isVideoAsset(el.assetId)) { if (seen.has(el.assetId) && S.aliasAsset) { el.assetId = S.aliasAsset(el.assetId); S.syncNode && S.syncNode(el); } seen.add(el.assetId); }
      el.video = el.video ? Object.assign(el.video, { loop: false }) : el.video;
      const len = clipLen(el), tr = el.clip.trans;
      const ov = i && tr && tr.type && tr.type !== 'none' ? round(Math.min(tr.dur || 0.5, len / 2, prevLen / 2)) : 0;
      const start = round(Math.max(0, t - ov));
      el.time = { start, end: round(start + len) };
      el.clip._in = ov;
      el.clip._out = null;
      if (prev) prev.clip._out = ov ? { type: tr.type, dur: ov, dir: tr.dir } : null;
      t = start + len; prevLen = len; prev = el;
    });
    const D = Math.min(S.MAX_LEN, round(t));
    if (Math.abs(doc.anim.duration - D) > 0.001) doc.anim.duration = Math.max(0.2, D);
    return true;
  };
  // the clip on screen at design time t (the newer one during a transition)
  S.clipAt = function (t) {
    let hit = null;
    for (const el of clipsOf(S.doc)) if (t >= el.time.start - 1e-6 && t < el.time.end) hit = el;
    return hit;
  };

  // full-frame placement: fill (cropped to the canvas) or fit (the whole picture, bars around it)
  function place(el, mode, m) {
    const W = S.doc.width, H = S.doc.height;
    if (mode === 'fit' && m && m.w && m.h) {
      const s = Math.min(W / m.w, H / m.h);
      el.width = m.w * s; el.height = m.h * s; el.x = (W - el.width) / 2; el.y = (H - el.height) / 2;
    } else { el.x = 0; el.y = 0; el.width = W; el.height = H; }
    el.rotation = 0;
    el.crop = { zoom: 1, x: 0.5, y: 0.5 };
    el.clip.fit = mode === 'fit' ? 'fit' : 'fill';
  }
  S.placeClip = function (el, mode) {
    const img = R.assetImage(el.assetId), m = R.mediaSize(img);
    S.changeEl(el, e => place(e, mode, m));
    S.commit();
  };

  // add photos / videos (as returned by importFiles) to the main track, at position `clipIndex` (default: the end)
  S.addClips = function (added, opts = {}) {
    const doc = S.doc;
    if (opts.newProject) {
      // a new video edit takes the shape of its first clip, 1920 px on the long side
      const a = added.find(x => x.video) || added[0], k = 1920 / Math.max(a.w, a.h);
      const W = Math.round(a.w * k / 2) * 2, H = Math.round(a.h * k / 2) * 2;
      const ids = S.uploads.slice(0, added.length);
      S.newDoc(W, H, '#000000', {}, { project: 'new', name: 'Video edit' });
      S.uploads.splice(0, 0, ...ids);
      if (opts.onStart) opts.onStart();
    }
    const d = S.doc;
    let index = opts.clipIndex != null ? clamp(opts.clipIndex, 0, clipsOf(d).length) : clipsOf(d).length;
    const ids = [];
    for (const a of added) {
      const list = clipsOf(d), prev = list[index - 1];
      const elIndex = prev ? d.elements.indexOf(prev) + 1 : list[0] ? d.elements.indexOf(list[0]) : 0;
      const el = S.mk('image', { assetId: a.id, name: a.name || '', clip: { len: a.video ? 0 : (opts.photoLen || 3), src: a.video ? a.duration || 0 : 0, trans: opts.trans ? Object.assign({}, opts.trans) : null } });
      place(el, opts.fit || 'fill', { w: a.w, h: a.h });
      if (a.video) el.video = { trim: 0, speed: 1, loop: false, volume: 1 };
      const n = S.addElement(el, { index: elIndex, select: false, commit: false, center: false });
      ids.push(n.id);
      index++;
    }
    S.commit();
    S.select([ids[0]]);
    S.emit('doc');
    const first = S.elById(ids[0]);
    if (first && first.time) S.seek(first.time.start + 0.01);
    if (!opts.newProject) S.emit('toast', `${added.length} clip${added.length > 1 ? 's' : ''} added to the video`);
    return added;
  };
  // photos / videos as layers over the video (picture in picture), from design time `at`, on track `lane`
  S.addOverlays = function (added, o = {}) {
    const d = S.doc, W = d.width, H = d.height, t = Math.max(0, o.at || 0), ids = [];
    added.forEach((a, i) => {
      const box = Math.min(W, H) * 0.42, k = Math.min(box / a.w, box / a.h);
      const el = S.mk('image', { assetId: a.id, name: a.name || '', width: a.w * k, height: a.h * k, shadow: { on: true, color: '#000000', opacity: 0.35, blur: 30, x: 0, y: 10 } });
      el.x = W - el.width - W * 0.05 - i * 30; el.y = H * 0.06 + i * 30;
      const len = a.video ? a.duration || 3 : 3;
      el.time = { start: round(t), end: round(Math.min(S.MAX_LEN, t + len)) };
      if (a.video) el.video = { trim: 0, speed: 1, loop: false, volume: 1 };
      if (o.lane != null) el.lane = o.lane;
      ids.push(S.addElement(el, { select: false, commit: false, center: false }).id);
    });
    // without clips the design's length is its own: make room for the new layers
    if (!S.isVideoEdit()) { const end = Math.max(...ids.map(id => S.elById(id).time.end)); if (end > d.anim.duration + 0.01) d.anim.duration = Math.min(S.MAX_LEN, end); }
    S.commit();
    S.select(ids);
    S.emit('doc');
    S.seek(t + 0.01);
    return added;
  };
  S.pickClips = function (opts = {}) { S.pickImages(Object.assign({ asClips: true }, opts)); };

  // cut a clip in two at design time t
  S.splitClip = function (el, t) {
    if (!el || !el.clip || !el.time) return null;
    const k = t - el.time.start, len = clipLen(el);
    if (k < 0.1 || k > len - 0.1) return null;
    const b = S.clone(el);
    b.id = null;
    b.clip.trans = null; b.clip._in = 0;
    if (b.anim && b.anim.enter && b.anim.enter !== 'none') b.anim = Object.assign({}, b.anim, { enter: 'none' });
    S.changeEl(el, e => {
      if (R.isVideoAsset(e.assetId)) {
        const vd = e.video, sp = vd.speed || 1, src = srcLen(e) || 0, end = vd.end > 0 ? vd.end : src;
        if (vd.reverse) { const cut = round(end - k * sp); vd.trim = cut; b.video.end = cut; }
        else { const cut = round((vd.trim || 0) + k * sp); vd.end = cut; b.video.trim = cut; }
        b.assetId = S.aliasAsset(e.assetId);
      } else { e.clip.len = round(k); b.clip.len = round(len - k); }
      e.clip._out = null;
    });
    const n = S.addElement(b, { index: S.doc.elements.indexOf(el) + 1, select: false, commit: false, center: false });
    S.commit();
    S.select([n.id]);
    S.emit('doc');
    return n;
  };
  // move a clip to another place in the sequence
  S.moveClip = function (el, to) {
    const d = S.doc, list = clipsOf(d), from = list.indexOf(el);
    if (from < 0) return;
    to = clamp(to, 0, list.length - 1);
    if (to === from) return;
    d.elements.splice(d.elements.indexOf(el), 1);
    const rest = clipsOf(d), ref = rest[to];
    const at = ref ? d.elements.indexOf(ref) : d.elements.indexOf(rest[rest.length - 1]) + 1;
    d.elements.splice(at, 0, el);
    S.rebuild();
    S.commit();
    S.select([el.id]);
    S.emit('doc');
  };
  S.setTransition = function (el, patch) {
    if (!el || !el.clip) return;
    S.changeEl(el, e => {
      const cur = e.clip.trans || { type: 'fade', dur: 0.5, dir: 'left' };
      e.clip.trans = Object.assign({}, cur, patch);
      if (e.clip.trans.type === 'none') e.clip.trans = null;
    });
    S.commit();
  };
  // the same transition between every clip
  S.setAllTransitions = function (patch) {
    clipsOf(S.doc).forEach((el, i) => { if (i) S.changeEl(el, e => { e.clip.trans = patch && patch.type !== 'none' ? Object.assign({ type: 'fade', dur: 0.5, dir: 'left' }, e.clip.trans || {}, patch) : null; }); });
    S.commit();
  };
  // turn the layers of a design into a clip / back into a free layer
  S.makeClip = function (el, on) {
    if (!el || el.type !== 'image' || !el.assetId) return;
    if (on) {
      const d = S.doc, list = clipsOf(d);
      S.changeEl(el, e => { e.clip = { len: 3, src: 0, trans: null }; if (e.video) e.video.loop = false; delete e.time; place(e, 'fill', R.mediaSize(R.assetImage(e.assetId))); });
      // joins the end of the main track
      const last = list[list.length - 1];
      d.elements.splice(d.elements.indexOf(el), 1);
      d.elements.splice(last ? d.elements.indexOf(last) + 1 : 0, 0, el);
      S.rebuild();
    } else S.changeEl(el, e => { delete e.clip; delete e.time; });
    S.commit(); S.emit('doc');
  };

  // a quick colour and exposure fix from one frame: levels, white balance and a touch of saturation
  S.autoFix = function (el) {
    const img = R.assetImage(el.assetId), m = R.mediaSize(img);
    if (!img || !m || !m.w) return false;
    const k = 96 / Math.max(m.w, m.h), w = Math.max(2, Math.round(m.w * k)), h = Math.max(2, Math.round(m.h * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, w, h);
    let d;
    try { d = x.getImageData(0, 0, w, h).data; } catch (e) { return false; }
    const lum = [];
    let r = 0, g = 0, b = 0, n = 0, sat = 0;
    for (let i = 0; i < d.length; i += 4) {
      const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      lum.push(L); r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      sat += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
    }
    lum.sort((a2, b2) => a2 - b2);
    const lo = lum[Math.floor(n * 0.01)], hi = lum[Math.floor(n * 0.99)], mid = lum[Math.floor(n * 0.5)];
    r /= n; g /= n; b /= n; sat /= n;
    const f = {
      exposure: Math.round(clamp((118 - mid) / 2.2, -40, 40)),
      contrast: Math.round(clamp((200 - (hi - lo)) / 4, -10, 30)),
      shadows: Math.round(clamp((40 - lo) * 0.8, 0, 35)),
      highlights: Math.round(clamp((hi - 235) * -1.2, -35, 0)),
      warmth: Math.round(clamp((b - r) * 0.5, -30, 30)),
      tint: Math.round(clamp((g - (r + b) / 2) * -0.6, -25, 25)),
      vibrance: Math.round(clamp((60 - sat) * 0.5, 0, 25)),
    };
    S.changeEl(el, e => { e.filters = Object.assign({}, e.filters || {}, f); });
    S.commit();
    return f;
  };
})();
