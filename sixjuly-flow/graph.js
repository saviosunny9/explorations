/* Sixjuly Flow — node editor.
   A small pan / zoom canvas with draggable nodes, typed ports and bezier wires. Node types register themselves in
   SixjulyGraph.types (see nodes.js); a node's fields are plain data in node.params. */
(function () {
  'use strict';
  const h = (tag, attrs, ...kids) => {
    const m = tag.match(/^([a-z0-9]+)((?:[.#][\w-]+)*)$/i); const el = document.createElement(m ? m[1] : tag);
    (m && m[2] ? m[2].match(/[.#][\w-]+/g) : []).forEach(t => (t[0] === '.' ? el.classList.add(t.slice(1)) : (el.id = t.slice(1))));
    for (const k in attrs || {}) {
      const v = attrs[k]; if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v); else if (k === 'html') el.innerHTML = v; else if (k in el && k !== 'list') el[k] = v; else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach(c => c != null && c !== false && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const G = {
    types: {}, nodes: [], edges: [], view: { x: 40, y: 40, k: 1 }, sel: null, selEdge: null,
    listeners: { change: [], run: [], history: [] }, nextId: 1,
  };
  G.on = (e, fn) => G.listeners[e].push(fn);
  const emit = (e, a) => { G.listeners[e].forEach(fn => fn(a)); if (e === 'change' && a && !a.view && !a.history) record(!a.field); };
  let root, world, wires, drag = null;
  const NODE_W = 280;

  // ---- model ---------------------------------------------------------------------------------------------------------------------
  G.register = def => { G.types[def.key] = def; };
  G.defaults = type => { const o = {}; (G.types[type].fields || []).forEach(f => { if (f.k) o[f.k] = typeof f.def === 'function' ? f.def() : f.def; }); return o; };
  G.add = (type, x, y, params, id) => {
    const n = { id: id || 'n' + G.nextId++, type, x, y, params: Object.assign(G.defaults(type), params || {}), status: '', msg: '' };
    if (id) G.nextId = Math.max(G.nextId, parseInt(String(id).slice(1), 10) + 1 || G.nextId);
    G.nodes.push(n); buildNode(n); drawWires(); changed(); return n;
  };
  G.node = id => G.nodes.find(n => n.id === id);
  G.remove = id => {
    const n = G.node(id); if (!n) return;
    G.edges = G.edges.filter(e => e.from[0] !== id && e.to[0] !== id);
    G.nodes = G.nodes.filter(x => x !== n); n.el.remove(); if (G.sel === id) G.sel = null; drawWires(); changed();
  };
  G.connect = (fromId, fromPort, toId, toPort) => {
    const a = G.node(fromId), b = G.node(toId); if (!a || !b || a === b) return false;
    const po = G.types[a.type].outputs.find(p => p.id === fromPort), pi = G.types[b.type].inputs.find(p => p.id === toPort);
    if (!po || !pi || po.type !== pi.type) return false;
    if (reaches(b.id, a.id)) return false; // no loops
    G.edges = G.edges.filter(e => !(e.to[0] === toId && e.to[1] === toPort));
    G.edges.push({ from: [fromId, fromPort], to: [toId, toPort] }); drawWires(); changed(); return true;
  };
  function reaches(from, to) { // is `to` downstream of `from`?
    const seen = new Set(), st = [from];
    while (st.length) { const id = st.pop(); if (id === to) return true; if (seen.has(id)) continue; seen.add(id); G.edges.filter(e => e.from[0] === id).forEach(e => st.push(e.to[0])); }
    return false;
  }
  G.inputsOf = id => G.edges.filter(e => e.to[0] === id);
  G.serialize = () => ({ v: 1, view: G.view, nodes: G.nodes.map(n => ({ id: n.id, type: n.type, x: Math.round(n.x), y: Math.round(n.y), params: n.params })), edges: G.edges });
  G.load = data => {
    G.nodes.forEach(n => n.el.remove()); G.nodes = []; G.edges = []; G.nextId = 1;
    (data.nodes || []).forEach(n => { if (G.types[n.type]) { const nn = { id: n.id, type: n.type, x: n.x, y: n.y, params: Object.assign(G.defaults(n.type), n.params || {}), status: '', msg: '' }; G.nodes.push(nn); G.nextId = Math.max(G.nextId, parseInt(String(n.id).slice(1), 10) + 1 || G.nextId); buildNode(nn); } });
    G.edges = (data.edges || []).filter(e => G.node(e.from[0]) && G.node(e.to[0]));
    if (data.view) G.view = Object.assign({ x: 40, y: 40, k: 1 }, data.view);
    applyView(); drawWires(); changed(true); H.list = []; H.i = -1; record(true);
  };
  function changed(quiet) { renumber(); if (!quiet) emit('change', { structural: true }); }

  // ---- history: every change to nodes, fields and wires can be undone (⌘Z / ⇧⌘Z); the view (pan / zoom) is not recorded ---------------------------
  const H = { list: [], i: -1, t: 0, busy: false };
  const snap = () => JSON.stringify({ nodes: G.nodes.map(n => ({ id: n.id, type: n.type, x: Math.round(n.x), y: Math.round(n.y), params: n.params })), edges: G.edges });
  function record(now) {
    if (H.busy) return; clearTimeout(H.t);
    const go = () => { const s = snap(); if (H.list[H.i] === s) return; H.list.length = H.i + 1; H.list.push(s); if (H.list.length > 80) H.list.shift(); H.i = H.list.length - 1; emit('history'); };
    if (now) go(); else H.t = setTimeout(go, 400);
  }
  function restoreSnap(s) {
    H.busy = true; const o = JSON.parse(s), keepSel = G.sel;
    G.nodes.forEach(n => n.el.remove()); G.nodes = []; G.edges = [];
    o.nodes.forEach(n => { const nn = { id: n.id, type: n.type, x: n.x, y: n.y, params: n.params, status: '', msg: '' }; G.nodes.push(nn); buildNode(nn); });
    G.edges = o.edges; G.sel = G.node(keepSel) ? keepSel : null; markSel(); drawWires(); emit('change', { structural: true, history: true }); H.busy = false; emit('history');
  }
  G.undo = () => { clearTimeout(H.t); const cur = snap(); if (H.list[H.i] !== cur) record(true); if (H.i > 0) { H.i--; restoreSnap(H.list[H.i]); } };
  G.redo = () => { if (H.i < H.list.length - 1) { H.i++; restoreSnap(H.list[H.i]); } };
  G.canUndo = () => H.i > 0 || (H.i >= 0 && H.list[H.i] !== snap());
  G.canRedo = () => H.i < H.list.length - 1;
  G.resetHistory = () => { H.list = [snap()]; H.i = 0; emit('history'); };

  // ---- DOM -------------------------------------------------------------------------------------------------------------------------
  G.init = el => {
    root = el; root.classList.add('graph');
    world = h('div.world'); wires = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); wires.classList.add('wires');
    wires.innerHTML = '<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1 L9 5 L0 9z" fill="context-stroke"/></marker></defs><g id="wg"></g><path id="wdrag" class="wdrag" d=""/>';
    world.append(wires); root.append(world); applyView();
    root.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    root.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', e => {
      if (document.body.classList.contains('focus-open') || root.closest('[hidden]') || root.offsetParent === null) return;
      const typing = /INPUT|TEXTAREA/.test((e.target || {}).tagName || '') && !/checkbox|range|color|radio/.test(e.target.type || '');
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y') && !typing) { e.preventDefault(); if (e.key.toLowerCase() === 'y' || e.shiftKey) G.redo(); else G.undo(); return; }
      if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
      if ((e.key === 'Backspace' || e.key === 'Delete')) { if (G.selEdge != null) { G.edges.splice(G.selEdge, 1); G.selEdge = null; drawWires(); changed(); } else if (G.sel) G.remove(G.sel); }
    });
    new ResizeObserver(() => drawWires()).observe(root);
  };
  function applyView() { world.style.transform = `translate(${G.view.x}px,${G.view.y}px) scale(${G.view.k})`; root.style.setProperty('--gk', G.view.k); root.style.backgroundPosition = `${G.view.x}px ${G.view.y}px`; root.style.backgroundSize = `${28 * G.view.k}px ${28 * G.view.k}px`; }
  const toWorld = (cx, cy) => { const r = root.getBoundingClientRect(); return { x: (cx - r.left - G.view.x) / G.view.k, y: (cy - r.top - G.view.y) / G.view.k }; };
  G.centre = () => { const r = root.getBoundingClientRect(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); };
  G.fit = () => {
    if (!G.nodes.length) return;
    const r = root.getBoundingClientRect(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    G.nodes.forEach(n => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + NODE_W); y1 = Math.max(y1, n.y + n.el.offsetHeight); });
    const k = clamp(Math.min((r.width - 80) / (x1 - x0), (r.height - 80) / (y1 - y0)), 0.35, 1);
    G.view = { k, x: (r.width - (x1 - x0) * k) / 2 - x0 * k, y: Math.max(30, (r.height - (y1 - y0) * k) / 2 - y0 * k) };
    applyView(); drawWires();
  };
  G.zoom = (f, cx, cy) => {
    const r = root.getBoundingClientRect(); cx = cx == null ? r.left + r.width / 2 : cx; cy = cy == null ? r.top + r.height / 2 : cy;
    const k = clamp(G.view.k * f, 0.3, 1.6), w = toWorld(cx, cy);
    G.view.k = k; G.view.x = cx - r.left - w.x * k; G.view.y = cy - r.top - w.y * k; applyView(); drawWires();
  };
  function onWheel(e) {
    if (e.target.closest('.nb textarea, .nb select') && !e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) G.zoom(Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    else { G.view.x -= e.deltaX; G.view.y -= e.deltaY; applyView(); drawWires(); }
  }

  function portEl(id, port, dir) { const n = G.node(id); return n && n.el.querySelector(`.port.${dir}[data-port="${port}"] .dot`); }
  function portXY(id, port, dir) {
    const n = G.node(id), p = portEl(id, port, dir); if (!n || !p) return { x: n ? n.x : 0, y: n ? n.y : 0 };
    const r = p.getBoundingClientRect(), wr = root.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - wr.left - G.view.x) / G.view.k, y: (r.top + r.height / 2 - wr.top - G.view.y) / G.view.k };
  }
  const curve = (a, b) => { const d = Math.max(60, Math.abs(b.x - a.x) * 0.5); return `M${a.x},${a.y} C${a.x + d},${a.y} ${b.x - d},${b.y} ${b.x},${b.y}`; };
  function drawWires() {
    if (!wires) return; const g = wires.querySelector('#wg'); g.innerHTML = '';
    G.edges.forEach((e, i) => {
      const a = portXY(e.from[0], e.from[1], 'out'), b = portXY(e.to[0], e.to[1], 'in');
      const t = G.types[G.node(e.from[0]).type].outputs.find(p => p.id === e.from[1]).type;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', curve(a, b));
      path.setAttribute('class', 'wire t-' + t + (G.selEdge === i ? ' sel' : '') + (G.node(e.from[0]).status === 'running' || G.node(e.to[0]).status === 'running' ? ' live' : ''));
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path'); hit.setAttribute('d', curve(a, b)); hit.setAttribute('class', 'whit');
      hit.addEventListener('pointerdown', ev => { ev.stopPropagation(); G.selEdge = i; G.sel = null; markSel(); drawWires(); });
      hit.addEventListener('dblclick', () => { G.edges.splice(i, 1); G.selEdge = null; drawWires(); changed(); });
      g.append(path, hit);
    });
  }
  G.redraw = drawWires;
  // number the nodes left to right (01, 02 …) so the flow reads like a sequence
  function renumber() { G.nodes.slice().sort((a, b) => (a.x - b.x) || (a.y - b.y)).forEach((n, i) => { const e = n.el && n.el.querySelector('.nidx'); if (e) e.textContent = String(i + 1).padStart(2, '0'); }); }
  function markSel() { G.nodes.forEach(n => n.el.classList.toggle('sel', n.id === G.sel)); }

  // ---- interaction -------------------------------------------------------------------------------------------------------------------
  function onDown(e) {
    if (e.button !== 0) return;
    const port = e.target.closest('.port .dot');
    if (port) {
      const row = port.closest('.port'), node = G.node(port.closest('.node').dataset.id), dir = row.classList.contains('out') ? 'out' : 'in', pid = row.dataset.port;
      if (dir === 'in') { // pick up an existing wire
        const ex = G.edges.findIndex(x => x.to[0] === node.id && x.to[1] === pid);
        if (ex >= 0) { const old = G.edges[ex]; G.edges.splice(ex, 1); drawWires(); drag = { kind: 'wire', from: old.from, dir: 'out', type: typeOf(old.from[0], old.from[1], 'out') }; changed(); }
        else drag = { kind: 'wire', from: [node.id, pid], dir: 'in', type: typeOf(node.id, pid, 'in') };
      } else drag = { kind: 'wire', from: [node.id, pid], dir: 'out', type: typeOf(node.id, pid, 'out') };
      root.classList.add('wiring'); root.dataset.wire = drag.type; e.preventDefault(); return;
    }
    const head = e.target.closest('.nh');
    if (head && !e.target.closest('button')) {
      const n = G.node(head.closest('.node').dataset.id); G.sel = n.id; G.selEdge = null; markSel(); n.el.style.zIndex = ++G.z || (G.z = 10);
      const w = toWorld(e.clientX, e.clientY); drag = { kind: 'node', n, dx: w.x - n.x, dy: w.y - n.y }; e.preventDefault(); return;
    }
    const node = e.target.closest('.node'); if (node) { G.sel = node.dataset.id; G.selEdge = null; markSel(); return; }
    if (e.target.closest('.graph-ui')) return;
    G.sel = null; G.selEdge = null; markSel(); drawWires();
    drag = { kind: 'pan', x: e.clientX, y: e.clientY, vx: G.view.x, vy: G.view.y }; root.classList.add('panning');
  }
  const typeOf = (id, port, dir) => (G.types[G.node(id).type][dir === 'out' ? 'outputs' : 'inputs'].find(p => p.id === port) || {}).type;
  function onMove(e) {
    if (!drag) return;
    if (drag.kind === 'pan') { G.view.x = drag.vx + e.clientX - drag.x; G.view.y = drag.vy + e.clientY - drag.y; applyView(); drawWires(); }
    else if (drag.kind === 'node') { const w = toWorld(e.clientX, e.clientY); drag.n.x = Math.round((w.x - drag.dx) / 4) * 4; drag.n.y = Math.round((w.y - drag.dy) / 4) * 4; drag.n.el.style.left = drag.n.x + 'px'; drag.n.el.style.top = drag.n.y + 'px'; drawWires(); }
    else if (drag.kind === 'wire') {
      const a = portXY(drag.from[0], drag.from[1], drag.dir), w = toWorld(e.clientX, e.clientY);
      wires.querySelector('#wdrag').setAttribute('d', drag.dir === 'out' ? curve(a, w) : curve(w, a));
      wires.querySelector('#wdrag').setAttribute('class', 'wdrag on t-' + drag.type);
    }
  }
  function onUp(e) {
    if (!drag) return; const d = drag; drag = null; root.classList.remove('panning', 'wiring');
    if (d.kind === 'node') changed(); else if (d.kind === 'pan') { emit('change', { view: true }); }
    else if (d.kind === 'wire') {
      wires.querySelector('#wdrag').setAttribute('class', 'wdrag');
      const t = document.elementFromPoint(e.clientX, e.clientY), dot = t && t.closest && t.closest('.port .dot');
      if (dot) {
        const row = dot.closest('.port'), id = dot.closest('.node').dataset.id, pid = row.dataset.port, dir = row.classList.contains('out') ? 'out' : 'in';
        if (dir !== d.dir) { if (d.dir === 'out') G.connect(d.from[0], d.from[1], id, pid); else G.connect(id, pid, d.from[0], d.from[1]); }
      }
      drawWires();
    }
  }

  // ---- node DOM ---------------------------------------------------------------------------------------------------------------------
  function fieldEl(n, f) {
    const P = n.params, set = (v, rebuild) => { P[f.k] = v; emit('change', { node: n, field: f.k, rebuild }); if (rebuild || f.rebuild) buildBody(n); };
    const lab = text => h('label.fl', null, text);
    let ctl;
    switch (f.type) {
      case 'area': ctl = h('textarea', { rows: f.rows || 4, value: P[f.k] == null ? '' : P[f.k], placeholder: f.placeholder || '', spellcheck: false, oninput: e => set(e.target.value) }); break;
      case 'text': ctl = h('input', { type: f.secret ? 'password' : 'text', value: P[f.k] == null ? '' : P[f.k], placeholder: f.placeholder || '', oninput: e => set(e.target.value) }); break;
      case 'num': ctl = h('input', { type: 'number', value: P[f.k], min: f.min, max: f.max, step: f.step || 1, oninput: e => set(parseFloat(e.target.value) || 0) }); break;
      case 'color': ctl = h('input.color', { type: 'color', value: P[f.k], oninput: e => set(e.target.value) }); break;
      case 'check': ctl = h('label.sw', null, h('input', { type: 'checkbox', checked: !!P[f.k], onchange: e => set(e.target.checked, true) }), h('i')); break;
      case 'select': ctl = h('select', { onchange: e => set(e.target.value, true) }, Object.entries(f.options).map(([v, l]) => h('option', { value: v, selected: String(P[f.k]) === v }, l))); break;
      case 'seg': ctl = h('div.seg', null, Object.entries(f.options).map(([v, l]) => h('button', { type: 'button', class: String(P[f.k]) === v ? 'on' : '', onclick: () => set(isNaN(v) ? v : +v, true) }, l))); break;
      case 'custom': return f.render(n, () => buildBody(n));
      case 'button': return h('div.frow', null, h('button.btn.sm', { type: 'button', onclick: () => f.action(n) }, f.label));
      case 'note': return h('div.fnote', { html: f.html });
      default: return h('div');
    }
    return h('div.frow' + (f.type === 'area' ? '.col' : ''), null, f.label ? lab(f.label) : null, ctl, f.hint ? h('div.fhint', null, f.hint) : null);
  }
  function buildBody(n) {
    const def = G.types[n.type], body = n.el.querySelector('.nb'); body.innerHTML = '';
    (def.fields || []).filter(f => !f.show || f.show(n.params)).forEach(f => body.append(fieldEl(n, f)));
    requestAnimationFrame(drawWires);
  }
  function buildNode(n) {
    const def = G.types[n.type];
    const ports = (list, dir) => h('div.ports.' + dir, null, (list || []).map(p => h('div.port.' + dir, { 'data-port': p.id, title: p.label }, dir === 'in' ? [h('i.dot.t-' + p.type), h('span', null, p.label)] : [h('span', null, p.label), h('i.dot.t-' + p.type)])));
    n.el = h('div.node.k-' + def.key, { 'data-id': n.id, style: { left: n.x + 'px', top: n.y + 'px', width: NODE_W + 'px' } },
      h('div.nh', null, h('span.nidx', null, ''), h('span.ni', { html: def.icon || '' }), h('b', null, def.title), h('span.ns', { title: '' }), h('button.nx', { title: 'Delete node', onclick: () => G.remove(n.id) }, '×')),
      (def.inputs && def.inputs.length) || (def.outputs && def.outputs.length) ? h('div.nio', null, ports(def.inputs, 'in'), ports(def.outputs, 'out')) : null,
      def.hint ? h('div.nhint', null, def.hint) : null,
      h('div.nb'), h('div.nmsg'));
    world.append(n.el); buildBody(n);
  }
  G.setStatus = (n, status, msg) => {
    n.status = status; n.msg = msg || ''; if (!n.el) return;
    n.el.dataset.status = status; const s = n.el.querySelector('.ns'); s.textContent = status === 'running' && msg ? msg : ''; s.title = msg || '';
    const m = n.el.querySelector('.nmsg'); m.textContent = status === 'error' ? msg : (status === 'done' && msg ? msg : ''); m.className = 'nmsg' + (status === 'error' ? ' err' : '');
    drawWires();
  };
  G.rebuild = n => buildBody(n);
  G.emitChange = (n, field) => emit('change', { node: n, field: field || 'files' });
  window.SixjulyGraph = G; window.sjh = h;
})();
