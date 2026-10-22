/* Sixjuly Flow — copy engine.
   Turns a topic into a "story" (cover → content slides → closer + caption) in Sixjuly's voice.
   Two engines: Claude (Anthropic API, key kept in this browser) and offline pattern banks. */
(function () {
  'use strict';

  const FORMATS = {
    mix: 'Mix (varies per topic)',
    reversal: 'Hot take',
    beforeafter: 'Before → After',
    list: 'List of rules',
    myth: 'Myth vs truth',
    howto: 'How-to steps',
    stat: 'Big number',
  };
  const KINDS = ['cover', 'statement', 'compare', 'stat', 'list', 'steps', 'quote', 'objects', 'cta'];

  // ---- topics ------------------------------------------------------------------------------------------------------------
  // one topic per line:  "Digital textures in UI :: jelly buttons; chrome toggles; clay cards"
  function parseTopics(text) {
    return String(text || '').split(/\n+/).map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => {
      const [t, rest] = l.split('::');
      const pts = rest ? rest.split(/[;|]/).map(s => s.trim()).filter(Boolean) : [];
      return { topic: t.trim().replace(/[.!?\s]+$/, ''), points: pts };
    });
  }

  // ---- seeded randomness ---------------------------------------------------------------------------------------------------
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const low = s => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const words = s => s.split(/\s+/).filter(Boolean);

  // ---- pattern banks ---------------------------------------------------------------------------------------------------------
  const BANK = {
    coverSub: ['The [[short]] version', 'What [[actually]] matters', 'A [[quick]] read for design teams', 'The [[honest]] take', 'What we [[see]] from the studio'],
    coverFoot: ['Swipe through. It takes a minute.', 'Written by designers, for humans.', 'Six slides. One clear idea.', 'Straight from the Sixjuly studio.'],
    open: [
      ['Everyone has an opinion on {t}.', 'Few have [[thought it through]].'],
      ['{T} is everywhere.', 'Understanding it is [[rarer]].'],
      ['Most teams treat {t} as an afterthought.', 'The best ones [[start there]].'],
      ['{T} looks simple.', 'Getting it right is [[not]].'],
    ],
    openFoot: ['Here is what we have learned. {{Keep swiping.}}', 'Our short version, from real projects. {{Swipe.}}', 'No theory. Just what we see in the work. {{Swipe.}}'],
    punch: [
      ['Trends fade.', '[[Craft]] stays.'],
      ['Louder is easy.', '[[Clearer]] is design.'],
      ['Decoration is optional.', '[[Meaning]] is not.'],
      ['Ship the idea.', 'Then [[polish]] it.'],
    ],
    punchFoot: ['The work that lasts is the work that is {{understood in a second.}}', 'Design is a decision, not a decoration. {{Make the call.}}', 'Fewer ideas, {{better made.}}'],
    rules: [
      'Start with the [[human]], not the screen',
      'Cut one thing more than feels safe',
      'Test it with five real people',
      'Make the next step obvious',
      'Ship it, then refine',
      'Keep one idea per screen',
      'Say it plainly first',
    ],
    rulesFoot: ['Small rules. {{Big consistency.}}', 'None of this is new. {{Almost nobody does it.}}', 'Boring on paper. {{Brilliant in practice.}}'],
    steps: ['Find the [[real]] problem', 'Sketch ten rough ideas', 'Pick one and test it', 'Refine what people noticed', 'Ship and watch'],
    stepsFoot: ['Short loops beat long plans. {{Every time.}}', 'Three days is enough to find {{a clear direction.}}'],
    mythA: ['It needs more features', 'People want everything', 'Users will figure it out', 'It just needs a redesign', 'Bold means loud'],
    mythB: ['It needs fewer decisions', 'People want the next step', 'Clear beats clever', 'It needs a clearer idea', 'Bold means confident'],
    cta: [
      ['We don’t chase trends. We read where they’re [[headed]] and build for it.', 'Follow @sixjulydesign for more on {{what’s next in design.}}'],
      ['Want this kind of thinking on [[your]] brand?', 'Follow @sixjulydesign for more on {{design that matters.}}'],
      ['Good design is a [[conversation]].', 'Start one with us at {{sixjuly.com}}'],
    ],
    ctaBtn: ["Let's talk", 'Book a sprint', 'Say hello', 'DM us'],
    tagFor: { reversal: 'HOT TAKE', beforeafter: 'BEFORE / AFTER', list: 'RULES', myth: 'MYTH VS TRUTH', howto: 'HOW TO', stat: 'BY THE NUMBERS' },
    tags: ['#design', '#branding', '#uidesign', '#designstudio', '#sixjuly', '#brandidentity'],
  };

  const fill = (s, T) => s.replace(/\{T\}/g, T).replace(/\{t\}/g, low(T));
  const mark = s => s; // markup passes through

  function build(format, T, pts, n, r) {
    const out = [];
    const ctaPair = pick(r, BANK.cta);
    const mids = [];
    const hasPts = pts.length > 0;
    const ptItems = pts.slice(0, 5).map(p => cap(p));
    const pair = p => { const m = p.split(/\s*(?:→|->|=>)\s*/); return m.length > 1 ? { a: m[0], b: m[1] } : null; };
    const pairs = pts.map(pair).filter(Boolean);

    const open = () => { const o = pick(r, BANK.open); return { kind: 'statement', head: fill(o[0], T) + '\n' + fill(o[1], T), foot: pick(r, BANK.openFoot) }; };
    const shuffled = a => a.slice().sort(() => r() - 0.5);
    const punchLeft = shuffled(BANK.punch), ruleLeft = shuffled(BANK.rules);
    const punch = () => { const p = punchLeft.length ? punchLeft.shift() : pick(r, BANK.punch); return { kind: 'statement', head: p[0] + '\n' + p[1], foot: pick(r, BANK.punchFoot) }; };
    let ptsUsed = false;
    const rules = (title, count) => {
      const items = !ptsUsed ? ptItems.slice(0, count) : []; ptsUsed = true;
      while (items.length < count && ruleLeft.length) items.push(ruleLeft.shift());
      return { kind: 'list', head: title, items: items.slice(0, count), foot: pick(r, BANK.rulesFoot) };
    };

    if (format === 'beforeafter') {
      mids.push(open());
      const list = pairs.length ? pairs : [{ a: 'The usual approach', b: cap(T) + ', done right' }, { a: 'Decoration first', b: 'Meaning first' }, { a: 'Louder', b: 'Clearer' }];
      list.slice(0, Math.max(1, n - 3)).forEach((p, i) => mids.push({ kind: 'compare', head: i === 0 ? 'What changed with [[' + low(T) + ']]' : pick(r, ['Same goal.\n[[Better]] answer.', 'Old habit.\n[[New]] default.', 'It used to be this.\nNow it is [[that]].']), a: { label: 'Before', text: p.a }, b: { label: 'After', text: p.b }, foot: pick(r, ['The shift is small. {{The effect is not.}}', 'Same people. {{Better decisions.}}', 'It looks obvious {{in hindsight.}}']) }));
      mids.push(punch());
    } else if (format === 'list') {
      mids.push(open());
      mids.push(rules('Three rules for [[' + low(T) + ']]', 3));
      mids.push(punch());
    } else if (format === 'myth') {
      mids.push(open());
      const mythCount = Math.max(1, Math.min(3, n - 4));
      const idx = [0, 1, 2, 3, 4].sort(() => r() - 0.5).slice(0, mythCount);
      const use = pairs.length ? pairs : idx.map(i => ({ a: BANK.mythA[i], b: BANK.mythB[i] }));
      use.slice(0, mythCount).forEach((p, i) => mids.push({ kind: 'compare', head: i === 0 ? 'The biggest myth about [[' + low(T) + ']]' : pick(r, ['Another one we [[hear]] a lot.', 'And this one [[too]].']), a: { label: 'Myth', text: p.a }, b: { label: 'Truth', text: p.b }, foot: pick(r, ['Say it out loud and it {{sounds obvious.}}', 'Believe the {{second one.}}']) }));
      mids.push(punch());
    } else if (format === 'howto') {
      mids.push(open());
      const items = ptItems.length ? ptItems.slice(0, 4) : BANK.steps.slice(0, 4);
      mids.push({ kind: 'steps', head: 'How to approach [[' + low(T) + ']]', items, foot: pick(r, BANK.stepsFoot) });
      mids.push(punch());
    } else if (format === 'stat') {
      const withNum = pts.find(p => /\d/.test(p));
      const m = withNum && withNum.match(/(\d[\d.,]*\s?[%×xX+kKmM]?)\s*(.*)/);
      mids.push(open());
      mids.push({ kind: 'stat', head: 'The number behind [[' + low(T) + ']]', stat: { value: m ? m[1].replace(/\s/g, '') : '3×', label: m && m[2] ? m[2] : 'the difference it makes when it is done with intent' }, foot: 'Numbers do not design anything. {{People do.}}' });
      mids.push(rules('Three things that [[move it]]', 3));
    } else { // reversal / hot take
      mids.push(open());
      if (pairs.length) mids.push({ kind: 'compare', head: 'What teams [[assume]]', a: { label: 'Assumed', text: pairs[0].a }, b: { label: 'Reality', text: pairs[0].b }, foot: pick(r, ['The gap is where {{the work is.}}', 'Same brief. {{Different outcome.}}']) });
      mids.push(rules('What actually [[matters]]', 3));
      mids.push(punch());
    }
    // trim / pad middle to fit the requested length (cover + cta take two)
    const want = Math.max(1, n - 2);
    while (mids.length > want) mids.splice(mids.length - 2 >= 1 ? mids.length - 2 : mids.length - 1, 1);
    let flip = 0; while (mids.length < want) mids.splice(mids.length - 1, 0, (flip++ % 2 === 0 && ruleLeft.length >= 3) ? rules(pick(r, ['Three more [[rules]]', 'A few [[reminders]]', 'Three [[habits]]']), 3) : punch());

    const tw = words(T);
    const head = tw.length > 1 ? tw.slice(0, -1).join(' ') + ' [[' + tw[tw.length - 1] + ']]' : '[[' + T + ']]';
    out.push({ kind: 'cover', head: tw.length <= 4 ? head.toUpperCase().replace(/\[\[(.*?)\]\]/g, '[[$1]]') : head, sub: pick(r, BANK.coverSub), foot: pick(r, BANK.coverFoot), tag: BANK.tagFor[format] || '' });
    out.push(...mids);
    out.push({ kind: 'cta', head: ctaPair[0], btn: pick(r, BANK.ctaBtn), foot: ctaPair[1] });
    return out;
  }

  function writePatterns(item, o) {
    const T = item.topic, seed = hash(T) + (o.seed || 0) * 977;
    const r = rng(seed);
    let fmt = o.format || 'mix';
    if (fmt === 'mix') {
      const hasPairs = (item.points || []).some(x => /→|->|=>/.test(x)), hasPts = (item.points || []).length > 0;
      fmt = pick(r, hasPairs ? ['beforeafter'] : hasPts ? ['reversal', 'list', 'howto'] : ['reversal', 'beforeafter', 'list', 'myth', 'howto']);
    }
    if (fmt === 'stat' && !item.points.some(p => /\d/.test(p))) fmt = 'reversal';
    const slides = build(fmt, T, item.points || [], clampN(o.slides), r);
    const tags = BANK.tags.slice().sort(() => r() - 0.5).slice(0, 4);
    const caption = `${cap(T)}: the short version.\n\n${slides.filter(s => s.kind !== 'cover' && s.kind !== 'cta').map(s => SixjulyRender.plain(s.head || '').replace(/\n/g, ' ')).slice(0, 3).join(' ')}\n\nFollow @sixjulydesign for more on what's next in design.`;
    return { topic: T, format: fmt, engine: 'patterns', slides, caption, hashtags: tags };
  }
  const clampN = n => Math.max(4, Math.min(10, parseInt(n, 10) || 7));

  // ---- Claude ------------------------------------------------------------------------------------------------------------------
  const SYSTEM = `You write Instagram carousel copy for Sixjuly Design Studio, a design studio whose posts are expert, direct, friendly and human.
Voice: short, punchy, confident. Two- or three-beat lines ("No car. No growler. All conversation."). A clear, contrarian take on a design or brand topic. No hype words, no emojis, no hashtags inside slides. Plain words over jargon.
Markup inside text: [[words]] shows in the violet highlight, {{words}} shows in the orange accent. Use exactly one [[...]] phrase in most headlines (the idea the reader should remember) and one {{...}} phrase in most footers. A newline (\\n) breaks a line.
Return ONLY a JSON object, no prose, no code fences:
{"caption": string (Instagram caption, 2-4 short paragraphs, ends with a question or call to follow), "hashtags": [3-6 strings starting with #], "slides": [ ... ]}
Slides, in order: first one kind "cover", last one kind "cta". Allowed kinds and fields:
- cover: head (2-4 words, will be set huge), sub (a short line, ≤ 7 words, may use [[ ]]), foot (one sentence), tag (optional short sticker such as "07" or "NEW")
- statement: head (≤ 14 words), foot (≤ 22 words) — a punchy text-only slide
- compare: head, a {label,text}, b {label,text} (text ≤ 6 words; labels like Before/After or Myth/Truth), foot
- stat: head, stat {value (e.g. "3×", "72%"), label (≤ 12 words)}, foot
- list: head, items (3-4 strings, ≤ 8 words each, may use [[ ]]), foot
- steps: head, items (3-4 strings, ≤ 8 words each), foot
- quote: head, quote {text (≤ 18 words), by}, foot
- objects: head, objects (exactly 3 of {type: jelly|toggle|card, label}), foot — only when the topic is about UI materials or textures
- cta: head (≤ 16 words), btn (≤ 3 words, e.g. "Let's talk"), foot (mention following @sixjulydesign)
Only claim facts you are confident are true. Never invent statistics or quotes attributed to real people or companies; use stat/quote only when the user's points supply the figure or when it is clearly illustrative of the studio's own view. Every slide must have a head and foot except the cover.`;

  function userPrompt(item, o) {
    const fmt = o.format && o.format !== 'mix' ? `Format: ${FORMATS[o.format]}.` : 'Choose the format that suits the topic (hot take, before/after, list of rules, myth vs truth, how-to, or a single striking number).';
    return `Topic: ${item.topic}\n${item.points && item.points.length ? 'Points to cover: ' + item.points.join('; ') + '\n' : ''}${fmt}\nSlide count: ${clampN(o.slides)} including cover and closing slide.\n${o.voice ? 'Extra voice notes: ' + o.voice + '\n' : ''}${o.seed ? 'Variation #' + o.seed + ': take a different angle than the obvious one.\n' : ''}Return the JSON now.`;
  }

  async function writeClaude(item, o) {
    const key = o.apiKey;
    if (!key) throw new Error('No API key set');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: o.model || 'claude-sonnet-5-5', max_tokens: 4000, system: SYSTEM, messages: [{ role: 'user', content: userPrompt(item, o) }] }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body.error && body.error.message) || ('HTTP ' + res.status));
    const text = (body.content || []).map(c => c.text || '').join('');
    const obj = extractJSON(text);
    return normalizeStory(obj, item, 'claude', o);
  }

  function extractJSON(text) {
    const t = String(text).replace(/```json|```/g, '');
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('Claude did not return JSON');
    return JSON.parse(t.slice(a, b + 1));
  }

  // make anything (Claude output or an edited story) safe for the renderer
  function normalizeStory(obj, item, engine, o) {
    const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    let slides = Array.isArray(obj.slides) ? obj.slides.filter(s => s && typeof s === 'object') : [];
    slides = slides.map((s, i) => {
      const kind = KINDS.includes(s.kind) ? s.kind : 'statement';
      const out = { kind, head: str(s.head, kind === 'cover' ? 60 : 130), foot: str(s.foot, 190) };
      if (kind === 'cover') { out.sub = str(s.sub, 70); if (s.tag) out.tag = str(String(s.tag), 8); }
      if (kind === 'compare') { out.a = { label: str(s.a && s.a.label, 14) || 'Before', text: str(s.a && s.a.text, 50) }; out.b = { label: str(s.b && s.b.label, 14) || 'After', text: str(s.b && s.b.text, 50) }; }
      if (kind === 'stat') out.stat = { value: str(String(s.stat && s.stat.value || ''), 8) || '3×', label: str(s.stat && s.stat.label, 90) };
      if (kind === 'list' || kind === 'steps') out.items = (Array.isArray(s.items) ? s.items : []).map(x => str(String(x), 70)).filter(Boolean).slice(0, 4);
      if (kind === 'quote') out.quote = { text: str(s.quote && s.quote.text, 140), by: str(s.quote && s.quote.by, 40) };
      if (kind === 'objects') out.objects = (Array.isArray(s.objects) ? s.objects : []).slice(0, 3).map(x => ({ type: ['jelly', 'toggle', 'card'].includes(x.type) ? x.type : 'card', label: str(x.label, 14) }));
      if (kind === 'cta') out.btn = str(s.btn, 24) || "Let's talk";
      if ((kind === 'list' || kind === 'steps') && !out.items.length) out.kind = 'statement';
      return out;
    });
    if (!slides.length) throw new Error('No slides in the response');
    if (slides[0].kind !== 'cover') slides.unshift({ kind: 'cover', head: item.topic.toUpperCase(), sub: '', foot: '' });
    if (slides[slides.length - 1].kind !== 'cta') slides.push({ kind: 'cta', head: 'Want this on [[your]] brand?', btn: "Let's talk", foot: 'Follow @sixjulydesign for more on {{what’s next in design.}}' });
    slides = slides.slice(0, 12);
    return { topic: item.topic, format: (o && o.format) || 'mix', engine, slides, caption: str(obj.caption, 1500), hashtags: (Array.isArray(obj.hashtags) ? obj.hashtags : []).map(h => str(String(h), 30)).filter(Boolean).slice(0, 8) };
  }

  // engine: 'claude' | 'patterns' | 'auto' (Claude when a key is set, patterns otherwise or if Claude fails)
  async function write(item, o) {
    o = o || {};
    const engine = o.engine || 'auto';
    if (engine === 'patterns' || (engine === 'auto' && !o.apiKey)) return writePatterns(item, o);
    try { return await writeClaude(item, o); }
    catch (e) {
      if (engine === 'claude') throw e;
      const s = writePatterns(item, o); s.engine = 'patterns (Claude failed: ' + e.message + ')'; return s;
    }
  }

  window.SixjulyCopy = { FORMATS, KINDS, parseTopics, write, writePatterns, writeClaude, normalizeStory, extractJSON, SYSTEM };
})();
