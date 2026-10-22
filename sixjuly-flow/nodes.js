/* Sixjuly Flow — node types and the flow runner.
   Data types on the wires: topics → stories → decks (+ brand). A "deck" is one topic's slides plus brand, design and motion. */
(function () {
  'use strict';
  const G = window.SixjulyGraph, R = window.SixjulyRender, C = window.SixjulyCopy;
  const ic = d => `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const opt = (obj) => obj;
  const FONTS = { 'Google Sans Flex': 'Google Sans Flex', Inter: 'Inter', 'DM Sans': 'DM Sans', Manrope: 'Manrope', 'Space Grotesk': 'Space Grotesk', Sora: 'Sora', Outfit: 'Outfit', 'Plus Jakarta Sans': 'Plus Jakarta Sans' };
  const THEMES = { light: 'White', cream: 'Cream', dark: 'Black', violet: 'Violet', orange: 'Orange' };
  const THEMES_OPT = Object.assign({ '': 'Same as slides' }, THEMES);

  const MOTION_ENTER = R.ENTER_TYPES, MOTION_LOOP = R.LOOP_TYPES;
  const presetOptions = { smooth: 'Smooth', punchy: 'Punchy', playful: 'Playful', minimal: 'Minimal', editorial: 'Editorial', kinetic: 'Kinetic', custom: 'Custom' };
  const adv = p => !!p.adv;
  const customise = n => { n.params.preset = 'custom'; };

  G.register({
    key: 'topics', title: 'Topics', icon: ic('<path d="M4 5h12M4 10h12M4 15h7"/>'),
    hint: 'What to post about. One topic per line.',
    inputs: [], outputs: [{ id: 'topics', label: 'Topics', type: 'topics' }],
    fields: [
      { k: 'text', type: 'area', rows: 6, def: 'Digital textures in UI :: jelly buttons; chrome toggles; clay cards\nWhy great rebrands feel familiar\nDesign systems that scale :: tokens first; one source of truth; document the why', placeholder: 'One topic per line', hint: 'Optional specifics after “::”, separated by “;”. For before → after, write “old → new”. Lines starting with # are skipped.' },
    ],
    async run(ins, p) { const topics = C.parseTopics(p.text); if (!topics.length) throw new Error('Add at least one topic'); return { topics, _msg: topics.length + (topics.length === 1 ? ' topic' : ' topics') }; },
  });

  G.register({
    key: 'brand', title: 'Brand', icon: ic('<circle cx="10" cy="10" r="6.5"/><path d="M10 3.5c-3 3-3 10 0 13M3.5 10h13"/>'),
    hint: 'Colours, font and handle used on every post.',
    inputs: [], outputs: [{ id: 'brand', label: 'Brand', type: 'brand' }],
    fields: [
      { k: 'font', label: 'Font', type: 'select', options: FONTS, def: 'Google Sans Flex' },
      { k: 'handle', label: 'Handle', type: 'text', def: '@sixjulydesign' },
      { k: 'site', label: 'Website', type: 'text', def: 'sixjuly.com' },
      { k: 'violet', label: 'Primary violet', type: 'color', def: R.BRAND.violet },
      { k: 'orange', label: 'Primary orange', type: 'color', def: R.BRAND.orange },
      { k: 'more', label: 'More colours', type: 'check', def: false },
      { k: 'cream', label: 'Cream', type: 'color', def: R.BRAND.cream, show: p => p.more },
      { k: 'yellow', label: 'Yellow', type: 'color', def: R.BRAND.yellow, show: p => p.more },
      { k: 'periwinkle', label: 'Periwinkle', type: 'color', def: R.BRAND.periwinkle, show: p => p.more },
      { k: 'black', label: 'Black', type: 'color', def: R.BRAND.black, show: p => p.more },
    ],
    async run(ins, p) { const b = Object.assign({}, R.BRAND, p); delete b.more; return { brand: b, _msg: p.font }; },
  });

  G.register({
    key: 'write', title: 'Write', icon: ic('<path d="M4 16l1-4 8.5-8.5a1.6 1.6 0 012.3 2.3L7.3 14.3 4 16z"/><path d="M12 5l3 3"/>'),
    hint: 'Turns each topic into slide copy in the Sixjuly voice.',
    inputs: [{ id: 'topics', label: 'Topics', type: 'topics' }], outputs: [{ id: 'stories', label: 'Copy', type: 'stories' }],
    fields: [
      { k: 'engine', label: 'Engine', type: 'seg', options: { auto: 'Auto', claude: 'Claude', patterns: 'Patterns' }, def: 'auto', hint: 'Auto uses Claude when an API key is set (⚙ top right), pattern banks otherwise.' },
      { k: 'model', label: 'Model', type: 'select', options: { 'claude-sonnet-5-5': 'Sonnet 5.5', 'claude-opus-5-5': 'Opus 5.5 (best)', 'claude-haiku-5-5': 'Haiku 5.5 (fastest)' }, def: 'claude-sonnet-5-5', show: p => p.engine !== 'patterns' },
      { k: 'format', label: 'Format', type: 'select', options: C.FORMATS, def: 'mix' },
      { k: 'slides', label: 'Slides', type: 'seg', options: { 5: '5', 6: '6', 7: '7', 8: '8', 9: '9' }, def: 7 },
      { k: 'voice', label: 'Voice notes', type: 'text', def: '', placeholder: 'e.g. a bit more playful, B2B founders', show: p => p.engine !== 'patterns' },
      { k: 'seed', type: 'button', label: '↻ New angle', action: n => { n.params.seed = (n.params.seed || 0) + 1; window.SixjulyFlow && window.SixjulyFlow.touch(n); }, def: 0 },
    ],
    async run(ins, p, ctx, node) {
      const out = [], list = ins.topics;
      for (let i = 0; i < list.length; i++) {
        G.setStatus(node, 'running', `${i + 1}/${list.length}`);
        const key = JSON.stringify([list[i], p.engine, p.model, p.format, p.slides, p.voice, p.seed, !!ctx.apiKey && p.engine !== 'patterns']);
        let s = ctx.cache.get(key);
        if (!s) { s = await C.write(list[i], { engine: p.engine, model: p.model, format: p.format, slides: p.slides, voice: p.voice, seed: p.seed, apiKey: ctx.apiKey }); ctx.cache.set(key, s); }
        out.push(s);
      }
      const eng = [...new Set(out.map(s => String(s.engine).split(' ')[0]))].join(' + ');
      const fail = out.find(s => /failed/.test(s.engine));
      return { stories: out, _msg: out.length + ' × ' + eng, _warn: fail ? fail.engine : '' };
    },
  });

  G.register({
    key: 'design', title: 'Design', icon: ic('<rect x="3.5" y="3.5" width="13" height="13" rx="3"/><path d="M3.5 12l4-3 3 2 3-3 3 3"/>'),
    hint: 'Lays the copy out as Sixjuly brand slides.',
    inputs: [{ id: 'stories', label: 'Copy', type: 'stories' }, { id: 'brand', label: 'Brand (optional)', type: 'brand', optional: true }],
    outputs: [{ id: 'decks', label: 'Slides', type: 'decks' }],
    fields: [
      { k: 'theme', label: 'Theme', type: 'select', options: THEMES, def: 'light' },
      { k: 'coverTheme', label: 'Cover theme', type: 'select', options: THEMES_OPT, def: '' },
      { k: 'ctaTheme', label: 'Closer theme', type: 'select', options: THEMES_OPT, def: '' },
      { k: 'rhythm', label: 'Rhythm', type: 'seg', options: { consistent: 'Consistent', alternate: 'Alternate' }, def: 'consistent' },
      { k: 'altTheme', label: 'Alternate with', type: 'select', options: THEMES, def: 'cream', show: p => p.rhythm === 'alternate' },
      { k: 'art', label: 'Cover art', type: 'seg', options: { none: 'None', orb: 'Halftone', spiral: 'Spiral' }, def: 'orb' },
    ],
    async run(ins, p) {
      const brand = ins.brand || R.BRAND;
      const decks = ins.stories.map(s => ({ topic: s.topic, caption: s.caption, hashtags: s.hashtags, engine: s.engine, format: s.format, slides: s.slides, brand, design: Object.assign({}, p), motion: null }));
      return { decks, _msg: decks.length + (decks.length === 1 ? ' deck' : ' decks') };
    },
  });

  const mf = (k, label, opts, extra) => Object.assign({ k, label, type: 'select', options: opts, def: R.DEFAULT_MOTION[k], show: adv, rebuild: false }, extra || {});
  G.register({
    key: 'motion', title: 'Motion', icon: ic('<path d="M3 13c3 0 3-6 6-6s3 6 6 6"/><circle cx="16" cy="13" r="1.2"/>'),
    hint: 'Quick animations for each element of the slide.',
    inputs: [{ id: 'decks', label: 'Slides', type: 'decks' }], outputs: [{ id: 'decks', label: 'Animated', type: 'decks' }],
    fields: [
      { k: 'preset', label: 'Style', type: 'select', options: presetOptions, def: 'smooth', apply: true },
      { k: 'head', label: 'Headline', type: 'select', options: MOTION_ENTER, def: R.DEFAULT_MOTION.head },
      { k: 'hi', label: 'Highlight', type: 'select', options: R.HI_TYPES, def: R.DEFAULT_MOTION.hi },
      { k: 'visual', label: 'Visual', type: 'select', options: MOTION_ENTER, def: R.DEFAULT_MOTION.visual },
      { k: 'loopVisual', label: 'Visual loop', type: 'select', options: MOTION_LOOP, def: R.DEFAULT_MOTION.loopVisual },
      { k: 'transition', label: 'Transition', type: 'select', options: R.TRANSITIONS, def: R.DEFAULT_MOTION.transition },
      { k: 'speed', label: 'Speed', type: 'seg', options: { 0.75: 'Calm', 1: 'Normal', 1.4: 'Fast' }, def: 1 },
      { k: 'adv', label: 'Fine-tune every element', type: 'check', def: false },
      { k: 'foot', label: 'Footer', type: 'select', options: MOTION_ENTER, def: R.DEFAULT_MOTION.foot, show: adv },
      { k: 'header', label: 'Logo + handle', type: 'select', options: MOTION_ENTER, def: R.DEFAULT_MOTION.header, show: adv },
      { k: 'tag', label: 'Sticker', type: 'select', options: MOTION_ENTER, def: R.DEFAULT_MOTION.tag, show: adv },
      { k: 'btn', label: 'Button', type: 'select', options: MOTION_ENTER, def: R.DEFAULT_MOTION.btn, show: adv },
      { k: 'art', label: 'Cover art', type: 'select', options: MOTION_ENTER, def: R.DEFAULT_MOTION.art, show: adv },
      { k: 'loopArt', label: 'Art loop', type: 'select', options: { none: 'None', spin: 'Spin' }, def: R.DEFAULT_MOTION.loopArt, show: adv },
      { k: 'loopArrow', label: 'Arrow', type: 'select', options: R.ARROW_TYPES, def: R.DEFAULT_MOTION.loopArrow, show: adv },
      { k: 'ease', label: 'Easing', type: 'select', options: { smooth: 'Smooth', snappy: 'Snappy', bouncy: 'Bouncy', spring: 'Spring', linear: 'Linear' }, def: R.DEFAULT_MOTION.ease, show: adv },
      { k: 'stagger', label: 'Stagger (s)', type: 'num', min: 0, max: 0.4, step: 0.01, def: R.DEFAULT_MOTION.stagger, show: adv },
      { k: 'perSlide', label: 'Seconds / slide', type: 'num', min: 0, max: 12, step: 0.5, def: 0, hint: '0 = automatic from the amount of text', show: adv },
    ],
    async run(ins, p) { const m = Object.assign({}, p); return { decks: ins.decks.map(d => Object.assign({}, d, { motion: m })), _msg: presetOptions[p.preset] || 'Custom' }; },
  });

  G.register({
    key: 'carousel', title: 'Carousel post', icon: ic('<rect x="3" y="4.5" width="9" height="11" rx="2"/><path d="M14.5 6.5v7M17 8v4"/>'),
    hint: 'Static slides to post. PNG or JPG.',
    inputs: [{ id: 'decks', label: 'Slides', type: 'decks' }], outputs: [], output: true,
    fields: [
      { k: 'ratio', label: 'Ratio', type: 'seg', options: { '1080x1350': '4:5', '1080x1080': '1:1', '1080x1440': '3:4' }, def: '1080x1350' },
      { k: 'scale', label: 'Resolution', type: 'seg', options: { 1: '1080', 2: '2160' }, def: 1 },
      { k: 'format', label: 'File', type: 'seg', options: { png: 'PNG', jpg: 'JPG' }, def: 'png' },
    ],
    async run(ins) { return { decks: ins.decks, _msg: ins.decks.length + ' post' + (ins.decks.length === 1 ? '' : 's') }; },
  });

  G.register({
    key: 'reel', title: 'Reel video', icon: ic('<rect x="6" y="3" width="8" height="14" rx="2.2"/><path d="M9 8l3 2-3 2z"/>'),
    hint: '9:16 video with the motion from the node before it.',
    inputs: [{ id: 'decks', label: 'Slides', type: 'decks' }], outputs: [], output: true,
    fields: [
      { k: 'fps', label: 'Frame rate', type: 'seg', options: { 30: '30 fps', 60: '60 fps' }, def: 30 },
      { k: 'file', label: 'File', type: 'seg', options: { auto: 'MP4', webm: 'WebM' }, def: 'auto', hint: 'MP4 needs Chrome / Edge / Safari. Other browsers fall back to WebM.' },
      { k: 'mbps', label: 'Quality', type: 'seg', options: { 6: 'Good', 10: 'High', 16: 'Max' }, def: 10 },
    ],
    async run(ins) { return { decks: ins.decks, _msg: ins.decks.length + ' reel' + (ins.decks.length === 1 ? '' : 's') }; },
  });

  // apply a motion preset to the node's params
  const origBuild = G.rebuild;
  G.applyPreset = n => { const p = R.MOTION_PRESETS[n.params.preset]; if (p) { Object.assign(n.params, p); G.rebuild(n); } };

  // ---- runner ------------------------------------------------------------------------------------------------------------------------
  const Flow = {
    cache: new Map(), apiKey: '',
    async run() {
      const memo = new Map(), outputs = [];
      G.nodes.forEach(n => G.setStatus(n, '', ''));
      const evalNode = async id => {
        if (memo.has(id)) return memo.get(id);
        const node = G.node(id), def = G.types[node.type];
        const prom = (async () => {
          const ins = {};
          for (const port of def.inputs || []) {
            const e = G.edges.find(x => x.to[0] === id && x.to[1] === port.id);
            if (!e) { if (port.optional) continue; G.setStatus(node, 'error', `Connect “${port.label}”`); throw new Error(`${def.title}: connect “${port.label}”`); }
            ins[port.id] = (await evalNode(e.from[0]))[e.from[1]];
          }
          G.setStatus(node, 'running', '');
          try {
            const out = await def.run(ins, node.params, { cache: Flow.cache, apiKey: Flow.apiKey }, node);
            G.setStatus(node, out._warn ? 'warn' : 'done', out._warn || out._msg || '');
            return out;
          } catch (err) { G.setStatus(node, 'error', err.message); throw err; }
        })();
        memo.set(id, prom); return prom;
      };
      const terminals = G.nodes.filter(n => G.types[n.type].output);
      if (!terminals.length) throw new Error('Add a Carousel post or Reel video node to get output');
      for (const t of terminals) { const out = await evalNode(t.id); outputs.push({ node: t, decks: out.decks }); }
      return outputs;
    },
    touch(n) { document.dispatchEvent(new CustomEvent('sj-touch', { detail: n })); },
  };
  window.SixjulyFlow = Flow;
})();
