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
    showcase: 'Layout showcase (every layout)',
  };
  const CLASSIC = ['cover', 'statement', 'compare', 'stat', 'list', 'steps', 'quote', 'objects', 'cta'];
  const RICH = ['art', 'collage', 'posters', 'greeting', 'tiles', 'split', 'checks', 'poster', 'chat', 'marquee', 'notes', 'timeline'];
  const KINDS = CLASSIC.concat(RICH);

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

  // ---- richer layouts -------------------------------------------------------------------------------------------------------------------------
  const FESTIVALS = /\b(diwali|deepavali|holi|eid|christmas|navratri|ganesh chaturthi|ganesh|onam|pongal|new year|dussehra|raksha bandhan|independence day|republic day|halloween|thanksgiving|ramadan|easter|hanukkah|valentine'?s?|lohri|baisakhi|janmashtami|durga puja)\b/i;
  const STOP = new Set('the and for with that this from your what why how are was our you not its but all can has have about into more less than they them then when will would should could of in on to is it a an as at by or be we do does'.split(' '));
  const keyWords = (T, pts, r) => {
    const w = [...T.split(/\s+/), ...pts.flatMap(p => p.split(/\s+/).slice(0, 2))].map(x => x.replace(/[^\p{L}\p{N}-]/gu, '')).filter(x => x.length > 3 && !STOP.has(x.toLowerCase()));
    const uniq = [...new Set(w.map(x => x.toLowerCase()))];
    const fill = ['form', 'craft', 'play', 'tone', 'grid', 'depth', 'rhythm', 'signal'].filter(x => !uniq.includes(x));
    return uniq.concat(fill);
  };
  const BANK2 = {
    artHead: [['[[{T}]] is a design\nsystem now'], ['The [[{t}]] problem\nnobody names'], ['{T} is quietly\n[[changing]] the brief'], ['Why {t} feels\n[[different]] now']],
    artFoot: ['Why the smartest product teams are rethinking {t}, and what they are borrowing to make it feel safe.', 'A few things we have noticed in the studio. {{Swipe for the short version.}}', 'What changed, why it matters, and what to do about it.'],
    collageHead: [['The grid is dead.', '[[Long live the mess.]]'], ['Rules are fine.', '[[Breaking them well]] is better.'], ['Tidy is easy.', '[[Alive]] is hard.']],
    collageLabels: [['Fewer boxes. More overlap.', 'Layouts breaking the page on purpose.'], ['One idea. Three treatments.', 'Same brand, louder voice.'], ['Less polish. More point of view.', 'Make the work look made.']],
    postersHead: ['[[{T}]]\nis here.', '[[{T}]]\nis having a moment.', 'Say hello to\n[[{t}]].'],
    postersFoot: ['Flat design had its decade.\nNow it is warmer, softer and human.', 'Loud had its decade.\nNow quiet confidence wins.', 'Trends rotate.\nGood judgement does not.'],
    tilesHead: ['Four ideas behind [[{t}]]', 'What {t} really comes down to', 'The [[four]] things we watch'],
    splitPairs: [['Flat icons. Zero weight.', 'Soft light. Real depth.'], ['Decoration first.', 'Meaning first.'], ['Everything shouted.', 'One thing said well.'], ['Templates everywhere.', 'A point of view.']],
    yes: ['Say it plainly', 'One idea per screen', 'Show the next step', 'Test it with five people', 'Cut one thing more'],
    no: ['Hide behind jargon', 'Five fonts on one page', 'Decorate to fill space', 'Ship it and hope', 'Add one more feature'],
    chatThem: ['Can we add more features?', 'Can it feel more premium?', 'Can we make the logo bigger?', 'Everyone has a different opinion.'],
    chatMe: ['Can we make the first step obvious?', 'What should people feel in the first second?', 'What if the logo did less and the idea did more?', 'Then pick the one that is true.'],
    chatEnd: ['Huh. That is better.', 'Okay. That changes things.', 'Fine. Let us try it.'],
    bands: ['Design that matters', 'Make it feel human', 'Clarity beats clever', 'Craft over trend'],
    wishes: ['Wishing you light, warmth and [[good design]]', 'May your year be bright, bold and [[beautifully made]]', 'Warm wishes from all of us at [[Sixjuly]]'],
  };
  const lowT = T => low(T);
  const sub = (str, T) => str.replace(/\{T\}/g, T).replace(/\{t\}/g, low(T));

  function richMakers(T, pts, r, ctxo) {
    const kw = keyWords(T, pts, r), up = x => String(x).toUpperCase();
    const pairs = ctxo.pairs, used = { yes: 0 };
    const short = s => cap(s.split(/\s+/).slice(0, 7).join(' '));
    return {
      art: () => { const h = pick(r, BANK2.artHead)[0]; return { kind: 'art', art: pick(r, ['retro', 'browser', 'phone']), head: sub(h, T), foot: sub(pick(r, BANK2.artFoot), T) }; },
      collage: () => { const h = pick(r, BANK2.collageHead), lb = pick(r, BANK2.collageLabels); return { kind: 'collage', head: h[0] + '\n' + h[1], words: [kw[0], kw[1], kw[2]].map(up), labels: lb, header: true, dots: true }; },
      posters: () => ({ kind: 'posters', head: sub(pick(r, BANK2.postersHead), T), words: [kw[1], kw[2], kw[3], kw[0]].map(x => (x || 'form')), handle: true, foot: pick(r, BANK2.postersFoot) }),
      tiles: () => { const items = (pts.length >= 3 ? pts.slice(0, 4).map(short) : ['Make it feel [[touchable]]', 'Let light do the work', 'Depth, not decoration', 'Keep one thing loud']).slice(0, 4); return { kind: 'tiles', head: sub(pick(r, BANK2.tilesHead), T), items, foot: 'Small ideas. {{Big feeling.}}' }; },
      split: () => { const p = pairs.length ? [pairs[0].a, pairs[0].b] : pick(r, BANK2.splitPairs); return { kind: 'split', head: 'Then vs [[now]]', a: { label: 'Then', text: p[0] }, b: { label: 'Now', text: p[1] }, foot: pick(r, ['The shift is {{subtle.}}', 'Same craft. {{Different answer.}}', 'It looks obvious {{in hindsight.}}']) }; },
      checks: () => ({ kind: 'checks', head: 'Do this. [[Not that.]]', yes: BANK2.yes.slice().sort(() => r() - 0.5).slice(0, 2), no: BANK2.no.slice().sort(() => r() - 0.5).slice(0, 2), foot: pick(r, ['Simple wins {{every time.}}', 'Boring on paper. {{Brilliant in practice.}}']) }),
      poster: () => ({ kind: 'poster', head: 'One word for [[' + low(T).split(/\s+/).slice(0, 3).join(' ') + ']].', word: cap(kw[0] || 'human'), foot: 'Everything else is {{detail.}}' }),
      chat: () => { const i = Math.floor(r() * BANK2.chatThem.length); return { kind: 'chat', head: 'What clients [[ask]]', chat: [{ who: 'them', text: BANK2.chatThem[i] }, { who: 'me', text: BANK2.chatMe[i] }, { who: 'them', text: pick(r, BANK2.chatEnd) }], foot: 'Good questions are {{half the design.}}' }; },
      marquee: () => ({ kind: 'marquee', head: 'Say it [[louder]]', band: up(pick(r, BANK2.bands)), foot: 'Repeat what is {{true.}}' }),
      notes: () => { const items = (pts.length >= 3 ? pts.slice(0, 3).map(short) : BANK.rules.slice().sort(() => r() - 0.5).slice(0, 3)); return { kind: 'notes', head: 'Sticky-note [[rules]]', notes: items, foot: 'Stick them {{where you work.}}' }; },
      timeline: () => { const yrs = pts.map(p => p.match(/^(\d{4})\s*[-:–—]?\s*(.+)$/)).filter(Boolean); const points = yrs.length >= 2 ? yrs.slice(0, 4).map(m => ({ k: m[1], v: cap(m[2]) })) : [{ k: '2013', v: 'Flat design takes over' }, { k: '2019', v: 'Everything starts to look the [[same]]' }, { k: '2026', v: 'Texture and character come back' }]; return { kind: 'timeline', head: 'How we got [[here]]', points, foot: 'Design moves like a {{pendulum.}}' }; },
      list: () => ({ kind: 'list', head: 'Three rules for [[' + low(T) + ']]', items: (pts.length >= 3 ? pts.slice(0, 3).map(cap) : BANK.rules.slice().sort(() => r() - 0.5).slice(0, 3)), foot: pick(r, BANK.rulesFoot) }),
      steps: () => ({ kind: 'steps', head: 'How to approach [[' + low(T) + ']]', items: (pts.length >= 3 ? pts.slice(0, 4).map(cap) : BANK.steps.slice(0, 4)), foot: pick(r, BANK.stepsFoot) }),
      compare: () => { const p = pairs[0] || { a: 'The usual approach', b: cap(T) + ', done right' }; return { kind: 'compare', head: 'What changed with [[' + low(T) + ']]', a: { label: 'Before', text: p.a }, b: { label: 'After', text: p.b }, foot: pick(r, ['Same goal. {{Better answer.}}', 'Small shift. {{Big effect.}}']) }; },
      statement: () => { const o = pick(r, BANK.open); return { kind: 'statement', head: fill(o[0], T) + '\n' + fill(o[1], T), foot: pick(r, BANK.openFoot) }; },
      punch: () => { const p = pick(r, BANK.punch); return { kind: 'statement', head: p[0] + '\n' + p[1], foot: pick(r, BANK.punchFoot) }; },
    };
  }
  const POOLS = {
    reversal: ['art', 'collage', 'tiles', 'split', 'poster', 'marquee', 'checks', 'notes'],
    beforeafter: ['split', 'compare', 'posters', 'chat', 'tiles', 'art', 'timeline'],
    list: ['tiles', 'notes', 'list', 'checks', 'collage', 'art', 'posters'],
    myth: ['chat', 'split', 'checks', 'compare', 'poster', 'marquee'],
    howto: ['steps', 'timeline', 'tiles', 'notes', 'checks', 'art'],
    stat: ['tiles', 'poster', 'collage', 'split', 'art'],
  };
  const COVER_TAG = BANK.tagFor;

  function buildRich(fmt, T, pts, n, r) {
    const pairs = pts.map(p => { const m = p.split(/\s*(?:→|->|=>)\s*/); return m.length > 1 ? { a: m[0], b: m[1] } : null; }).filter(Boolean);
    const mk = richMakers(T, pts.filter(p => !/→|->|=>/.test(p) || pairs.length === 0), r, { pairs });
    const want = Math.max(1, n - 2), mids = [];
    if (FESTIVALS.test(T)) {
      const fest = (T.match(FESTIVALS) || [T])[0], Fn = fest.split(' ').map(cap).join(' ');
      return [{ kind: 'greeting', head: 'Happy [[' + Fn.replace(/^Happy /, '') + ']]', label: 'Sixjuly', title: 'Festival greetings' }, { kind: 'statement', head: pick(r, BANK2.wishes), foot: 'From all of us at {{Sixjuly.}}' }, { kind: 'cta', head: 'Let us make the next one [[together]].', btn: pick(r, BANK.ctaBtn), foot: 'Follow @sixjulydesign for more on {{design that matters.}}' }];
    }
    // opener: an illustrated or plain statement
    mids.push(r() < 0.6 ? mk.art() : mk.statement());
    const pool = (POOLS[fmt] || POOLS.reversal).slice().sort(() => r() - 0.5);
    const general = ['collage', 'tiles', 'split', 'checks', 'poster', 'chat', 'marquee', 'notes', 'posters', 'art'];
    const seen = new Set([mids[0].kind === 'art' ? 'art' : 'statement']);
    for (const k of pool.concat(general)) { if (mids.length >= want) break; if (seen.has(k) || !mk[k]) continue; seen.add(k); mids.push(mk[k]()); }
    while (mids.length < want) mids.push(mk.punch());
    if (mids.length > 2 && want >= 4) mids[mids.length - 1] = mids[mids.length - 1].kind === 'statement' ? mids[mids.length - 1] : mids[mids.length - 1];
    // cover: annotate when there are specifics, CRT for rebrand / nostalgia words, numbered serif for counts, else the classic cover
    const tw = words(T), head = tw.length > 1 ? tw.slice(0, -1).join(' ') + ' [[' + tw[tw.length - 1] + ']]' : '[[' + T + ']]';
    let cover;
    const style = pts.length >= 2 && tw.length <= 4 ? 'annotate' : /rebrand|retro|nostalg|internet|tech|screen|crt/i.test(T) ? 'crt' : (/\b\d+\b/.test(T) || fmt === 'list') ? 'ripple' : pick(r, ['annotate', 'crt', '']);
    if (style === 'annotate') {
      const hw = (tw.length > 1 ? tw : [T]).map((w, i) => ({ w: i, len: w.length })).sort((a, b) => b.len - a.len).slice(0, Math.min(3, pts.length || 2)).sort((a, b) => a.w - b.w);
      cover = { kind: 'cover', cover: 'annotate', head: tw.map(up1).join(' ').split(' ').slice(0, 2).join('\n') + (tw.length > 2 ? '\n' + tw.slice(2).map(up1).join(' ') : ''), callouts: hw.map((h2, i) => ({ w: h2.w, label: cap(short2(pts[i] || ['Surface', 'Material', 'Light'][i])) })), sub: pick(r, BANK.coverSub), foot: pick(r, BANK.coverFoot) };
    } else if (style === 'ripple') {
      const m = T.match(/\b(\d+)\b/), num = m ? m[1] : String(Math.max(3, Math.min(9, pts.length || n - 2)));
      const rest = T.replace(/\b\d+\b/, '').trim().split(/\s+/).filter(Boolean), lines = rest.length > 3 ? [rest.slice(0, 2).join(' '), rest.slice(2, 3).join(' '), rest.slice(3).join(' ')] : rest.length > 1 ? [rest.slice(0, -1).join(' '), rest[rest.length - 1]] : [rest[0] || T];
      cover = { kind: 'cover', cover: 'ripple', num, head: lines.map(cap).join('\n'), stamp: String(new Date().getFullYear() + (new Date().getMonth() > 8 ? 1 : 0)), foot: '' };
    } else if (style === 'crt') {
      cover = { kind: 'cover', cover: 'crt', head: head, tag: COVER_TAG[fmt] || 'NEW', foot: pick(r, BANK.coverFoot) };
    } else {
      cover = { kind: 'cover', head: tw.length <= 4 ? head.toUpperCase() : head, sub: pick(r, BANK.coverSub), foot: pick(r, BANK.coverFoot), tag: COVER_TAG[fmt] || '' };
    }
    const ctaPair = pick(r, BANK.cta);
    return [cover, ...mids, { kind: 'cta', head: ctaPair[0], btn: pick(r, BANK.ctaBtn), foot: ctaPair[1] }];
  }
  const up1 = s => s.toUpperCase();
  const short2 = s => String(s).split(/\s+/).slice(0, 3).join(' ');

  // one deck that shows every layout with sample copy
  function showcase() {
    return { topic: 'Layout showcase', format: 'showcase', engine: 'patterns', caption: 'Every Sixjuly layout in one deck.', hashtags: ['#sixjuly', '#design'], slides: [
      { kind: 'cover', cover: 'annotate', head: 'DIGITAL\nTEXTURES', callouts: [{ w: 0, label: 'Chrome buttons' }, { w: 1, label: 'Clay material' }], sub: 'The [[New Face]] of UI', foot: 'In 2026, screens are meant to feel touchable again' },
      { kind: 'cover', cover: 'crt', head: 'Rebrands That [[Broke The]] Internet', tag: '07', foot: 'Seven logo changes that set the internet on fire' },
      { kind: 'cover', cover: 'ripple', num: '8', head: 'Graphic Design\nTrends\nDominating', stamp: '2026', foot: '' },
      { kind: 'cover', head: 'WHY REBRANDS [[WORK]]', tag: 'HOT TAKE', sub: 'The [[short]] version', foot: 'Written by designers, for humans.' },
      { kind: 'art', art: 'retro', head: '[[Nostalgia]] is a design\nsystem now', foot: 'Why the smartest product teams are borrowing from the past to make the future feel safe?' },
      { kind: 'art', art: 'browser', head: 'The page is a [[canvas]].', foot: 'Websites are allowed to be weird again.' },
      { kind: 'art', art: 'phone', head: 'Small screen, [[big]] decisions.', foot: 'Design for the thumb first.' },
      { kind: 'collage', head: 'The grid is dead.\n[[Long live the mess.]]', header: true, dots: true, words: ['PLAY', 'GRID', 'MESS'], labels: ['Fewer boxes. More overlap.', 'Layouts breaking the page on purpose.'] },
      { kind: 'posters', head: '[[Neo-Minimalism]]\nis here.', handle: true, words: ['gabriel', 'neckel studio', 'noa', 'true to form'], foot: 'Flat design had its decade.\nNow it is warmer, softer and human.' },
      { kind: 'greeting', head: 'Happy [[Diwali]]', label: 'Sixjuly', title: 'Festival of lights' },
      { kind: 'tiles', head: 'Four ideas behind [[texture]]', items: ['Make it feel [[touchable]]', 'Light does the work', 'Depth, not decoration', 'Keep it quiet'], foot: 'Small ideas. {{Big feeling.}}' },
      { kind: 'split', head: 'Then vs [[now]]', a: { label: 'Then', text: 'Flat icons. Zero weight.' }, b: { label: 'Now', text: 'Soft light. Real depth.' }, foot: 'The shift is {{subtle.}}' },
      { kind: 'checks', head: 'Do this. [[Not that.]]', yes: ['Say it plainly', 'One idea per screen'], no: ['Hide behind jargon', 'Five fonts on one page'], foot: 'Simple wins {{every time.}}' },
      { kind: 'poster', head: 'One word for [[2026]].', word: 'Human', foot: 'Everything else is {{detail.}}' },
      { kind: 'chat', head: 'What clients [[ask]]', chat: [{ who: 'them', text: 'Can we add more features?' }, { who: 'me', text: 'Can we make the first step obvious?' }, { who: 'them', text: 'Huh. That is better.' }], foot: 'Questions are {{design.}}' },
      { kind: 'marquee', head: 'Say it [[louder]]', band: 'Design that matters', foot: 'Repeat what is {{true.}}' },
      { kind: 'notes', head: 'Sticky-note [[rules]]', notes: ['Start with the [[human]]', 'Cut one thing more', 'Ship, then refine'], foot: 'Stick them {{where you work.}}' },
      { kind: 'timeline', head: 'How we got [[here]]', points: [{ k: '2013', v: 'Flat design takes over' }, { k: '2019', v: 'Everything looks the [[same]]' }, { k: '2026', v: 'Texture comes back' }], foot: 'Design is a {{pendulum.}}' },
      { kind: 'compare', head: 'The bird flew.\n[[The name]] stayed anyway.', a: { label: 'Before', text: 'Twitter' }, b: { label: 'After', text: 'X' }, foot: 'One of the most {{contested rebrands}} in tech history.' },
      { kind: 'stat', head: 'Familiar beats new', stat: { value: '7×', label: 'more recall when the mark stays [[familiar]]' }, foot: 'Familiar beats {{new for the sake of new.}}' },
      { kind: 'list', head: 'Three rules we [[keep]].', items: ['Start with the [[human]]', 'Cut one thing more', 'Ship, then refine'], foot: 'Small rules. {{Big consistency.}}' },
      { kind: 'steps', head: 'How we run a [[sprint]].', items: ['Discover the real problem', 'Sketch ten ideas', 'Test with five people'], foot: 'Three days. {{One clear answer.}}' },
      { kind: 'quote', head: 'What clients say.', quote: { text: 'They made our product feel [[human]] again.', by: 'A happy founder' }, foot: 'Real words. {{Real work.}}' },
      { kind: 'objects', head: '2026 is [[reversing]] that.', objects: [{ type: 'jelly', label: 'Jelly', text: 'Start' }, { type: 'toggle', label: 'Chrome' }, { type: 'card', label: 'Clay' }], foot: 'Buttons that squish. Toggles that catch light.\n{{Designers call it Digital Texture}}' },
      { kind: 'statement', head: 'We don’t chase trends.\nWe read where they’re [[headed]].', foot: 'Just a clear point of view. {{Nothing else.}}' },
      { kind: 'cta', head: 'Want this on [[your]] brand?', btn: "Let's talk", foot: 'Follow @sixjulydesign for more on {{what’s next in design.}}' },
    ] };
  }

  function writePatterns(item, o) {
    const T = item.topic, seed = hash(T) + (o.seed || 0) * 977;
    const r = rng(seed);
    let fmt = o.format || 'mix';
    if (fmt === 'showcase') { const sc = showcase(); sc.topic = T; return sc; }
    if (fmt === 'mix') {
      const hasPairs = (item.points || []).some(x => /→|->|=>/.test(x)), hasPts = (item.points || []).length > 0;
      fmt = pick(r, hasPairs ? ['beforeafter'] : hasPts ? ['reversal', 'list', 'howto'] : ['reversal', 'beforeafter', 'list', 'myth', 'howto']);
    }
    if (fmt === 'stat' && !item.points.some(p => /\d/.test(p))) fmt = 'reversal';
    if (o.format === 'showcase' || fmt === 'showcase') { const sc = showcase(); sc.topic = T; return sc; }
    const slides = o.layouts === 'classic' ? build(fmt, T, item.points || [], clampN(o.slides), r) : buildRich(fmt, T, item.points || [], clampN(o.slides), r);
    const tags = BANK.tags.slice().sort(() => r() - 0.5).slice(0, 4);
    const caption = `${cap(T)}: the short version.\n\n${slides.filter(s => s.kind !== 'cover' && s.kind !== 'cta').map(s => SixjulyRender.plain(s.head || '').replace(/\n/g, ' ')).slice(0, 3).join(' ')}\n\nFollow @sixjulydesign for more on what's next in design.`;
    return { topic: T, format: fmt, engine: 'patterns', slides, caption, hashtags: tags };
  }
  const clampN = n => Math.max(4, Math.min(10, parseInt(n, 10) || 7));

  // ---- Claude ------------------------------------------------------------------------------------------------------------------
  const BASE = `You write Instagram carousel copy for Sixjuly Design Studio, a design studio whose posts are expert, direct, friendly and human.
Voice: short, punchy, confident. Two- or three-beat lines ("No car. No growler. All conversation."). A clear, contrarian take on a design or brand topic. No hype words, no emojis, no hashtags inside slides. Plain words over jargon.
Markup inside text: [[words]] shows in the violet highlight, {{words}} shows in the orange accent. Use exactly one [[...]] phrase in most headlines (the idea the reader should remember) and one {{...}} phrase in most footers. A newline (\\n) breaks a line.
Return ONLY a JSON object, no prose, no code fences:
{"caption": string (Instagram caption, 2-4 short paragraphs, ends with a question or call to follow), "hashtags": [3-6 strings starting with #], "slides": [ ... ]}
Slides, in order: first one kind "cover", last one kind "cta". Vary the kinds: never use the same kind twice in a row and use at least four different kinds. Allowed kinds and fields:
- cover: head (2-4 words, set huge), foot (one sentence). Optional "cover" style: "annotate" (head in 2 lines of single words, plus callouts [{w: index of the word in head, label ≤ 3 words}, ...] 2-3 of them, and sub), "crt" (head 3-6 words, plus tag such as "07"), "ripple" (num: the count as a digit string, head: 2-3 short lines separated by \\n, stamp: a year or short label) or omit "cover" for the plain cover (sub: short line ≤ 7 words, tag: optional sticker such as "NEW")
- statement: head (≤ 14 words), foot (≤ 22 words), a punchy text-only slide
- compare: head, a {label,text}, b {label,text} (text ≤ 6 words; labels like Before/After or Myth/Truth), foot
- stat: head, stat {value (e.g. "3×", "72%"), label (≤ 12 words)}, foot
- list: head, items (3-4 strings, ≤ 8 words each, may use [[ ]]), foot
- steps: head, items (3-4 strings, ≤ 8 words each), foot
- quote: head, quote {text (≤ 18 words), by}, foot
- objects: head, objects (exactly 3 of {type: jelly|toggle|card, label}), foot; only when the topic is about UI materials or textures
- cta: head (≤ 16 words), btn (≤ 3 words, e.g. "Let's talk"), foot (mention following @sixjulydesign)`;
  const RICH_DOC = `
Richer layouts (use several of them):
- art: head, art ("retro" | "browser" | "phone"), foot; a statement with an illustration under it
- collage: head (two beats, e.g. "The grid is dead.\\n[[Long live the mess.]]"), words (3 short single words that appear on the work cards), labels (2 short callouts, ≤ 8 words each)
- posters: head (two lines, e.g. "[[Neo-Minimalism]]\\nis here."), words (4 short names or words printed on posters), foot (two short lines separated by \\n)
- tiles: head, items (exactly 4 short ideas, ≤ 7 words), foot
- split: head, a {label, text}, b {label, text} (full-bleed halves such as Then / Now, text ≤ 6 words), foot
- checks: head, yes (2-3 short do lines), no (2-3 short don't lines), foot
- poster: head, word (ONE word, ≤ 8 letters, shown giant), foot
- chat: head, chat (3-4 messages [{who: "them" | "me", text ≤ 12 words}] alternating, a client and the studio), foot
- marquee: head, band (a 2-4 word slogan that scrolls as tape), foot
- notes: head, notes (exactly 3 short sticky-note lines ≤ 7 words), foot
- timeline: head, points (3-4 of {k: year or short label, v: ≤ 8 words}), foot
- greeting: only for festivals and holidays: head ("Happy [[Diwali]]"), label ("Sixjuly"), title (festival name), as the first slide
Pick layouts that suit the idea: chat for objections, split for before/after, checks for dos and don'ts, timeline for history, tiles or notes for rules, poster for a single big word.`;
  const GUARD = `
Only claim facts you are confident are true. Never invent statistics or quotes attributed to real people or companies; use stat/quote only when the user's points supply the figure or when it is clearly the studio's own view. Every slide must have a head and foot except covers and the ones noted.`;
  const systemPrompt = layouts => BASE + (layouts === 'classic' ? '' : RICH_DOC) + GUARD;
  const SYSTEM = systemPrompt('rich');

  function userPrompt(item, o) {
    const fmt = o.format && o.format !== 'mix' ? `Format: ${FORMATS[o.format]}.` : 'Choose the format that suits the topic (hot take, before/after, list of rules, myth vs truth, how-to, or a single striking number).';
    return `Topic: ${item.topic}\n${item.points && item.points.length ? 'Points to cover: ' + item.points.join('; ') + '\n' : ''}${item.refs && item.refs.length ? 'Background reading, for context only. Write everything in your own words and never copy phrases from these titles:\n' + item.refs.slice(0, 6).map(r => '- ' + r.title + (r.source ? ' (' + r.source + ')' : '')).join('\n') + '\n' : ''}${fmt}\nSlide count: ${clampN(o.slides)} including cover and closing slide.${o.layouts === 'classic' ? ' Use only the classic kinds.' : ''}\n${o.voice ? 'Extra voice notes: ' + o.voice + '\n' : ''}${o.seed ? 'Variation #' + o.seed + ': take a different angle than the obvious one.\n' : ''}Return the JSON now.`;
  }

  let sampleP = null;
  const getSample = () => { if (!sampleP) sampleP = (window.claude && typeof window.claude.use === 'function') ? Promise.resolve(window.claude.use('sample')).catch(() => null) : Promise.resolve(null); return sampleP; };

  async function writeClaude(item, o) {
    const key = o.apiKey, sys = systemPrompt(o.layouts), prompt = userPrompt(item, o);
    let text;
    if (key) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: o.model || 'claude-sonnet-5-5', max_tokens: 5000, system: sys, messages: [{ role: 'user', content: prompt }] }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body.error && body.error.message) || ('HTTP ' + res.status));
      text = (body.content || []).map(c => c.text || '').join('');
    } else {
      const sample = await getSample();
      if (!sample) throw new Error('No API key set');
      const r = await sample(sys + '\n\n---\n\n' + prompt, { cache: false });
      text = r.text;
    }
    return normalizeStory(extractJSON(text), item, 'claude', o);
  }

  // optional: rewrite suggested topic titles in clearer words (Claude, or the API key if one is set)
  async function rewordTopics(items, o) {
    const prompt = 'You help a design studio choose Instagram post topics. For each item below write a clear, specific topic title (4 to 9 words, plain words, no hype) and a one-sentence angle (max 25 words) saying what a post could teach. Use only the information given, never invent facts, and do not copy phrases from the link titles.\nReturn ONLY a JSON array: [{"id": string, "title": string, "angle": string}].\n\n' + JSON.stringify(items);
    let text;
    if (o && o.apiKey) {
      const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': o.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: o.model || 'claude-sonnet-5-5', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }) });
      const body = await res.json().catch(() => ({})); if (!res.ok) throw new Error((body.error && body.error.message) || ('HTTP ' + res.status)); text = (body.content || []).map(c => c.text || '').join('');
    } else { const sample = await getSample(); if (!sample) throw new Error('Claude is not available'); text = (await sample(prompt, { cache: false })).text; }
    const t = String(text).replace(/```json|```/g, ''), a = t.indexOf('['), b = t.lastIndexOf(']'); if (a < 0) throw new Error('Claude did not return a list'); return JSON.parse(t.slice(a, b + 1));
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
      if (kind === 'cover') {
        if (['annotate', 'crt', 'ripple'].includes(s.cover)) out.cover = s.cover;
        if (out.cover === 'annotate') out.callouts = (Array.isArray(s.callouts) ? s.callouts : []).slice(0, 4).map(c => ({ w: Math.max(0, parseInt(c.w, 10) || 0), label: str(c.label, 28) })).filter(c => c.label);
        if (out.cover === 'ripple') { out.num = str(String(s.num || ''), 3); out.stamp = str(String(s.stamp || ''), 8); }
      }
      if (kind === 'art') out.art = ['retro', 'browser', 'phone'].includes(s.art) ? s.art : 'retro';
      if (kind === 'collage') { out.words = (Array.isArray(s.words) ? s.words : []).slice(0, 3).map(x => str(String(x), 14)); out.labels = (Array.isArray(s.labels) ? s.labels : []).slice(0, 2).map(x => str(String(x), 60)); out.header = true; out.dots = true; }
      if (kind === 'posters') { out.words = (Array.isArray(s.words) ? s.words : []).slice(0, 4).map(x => str(String(x), 16)); out.handle = true; }
      if (kind === 'greeting') { out.label = str(s.label, 20) || 'Sixjuly'; out.title = str(s.title, 36); }
      if (kind === 'tiles') { out.items = (Array.isArray(s.items) ? s.items : []).map(x => str(String(x), 60)).filter(Boolean).slice(0, 4); if (out.items.length < 2) out.kind = 'statement'; }
      if (kind === 'split') { out.a = { label: str(s.a && s.a.label, 14) || 'Then', text: str(s.a && s.a.text, 50) }; out.b = { label: str(s.b && s.b.label, 14) || 'Now', text: str(s.b && s.b.text, 50) }; }
      if (kind === 'checks') { out.yes = (Array.isArray(s.yes) ? s.yes : []).slice(0, 3).map(x => str(String(x), 50)).filter(Boolean); out.no = (Array.isArray(s.no) ? s.no : []).slice(0, 3).map(x => str(String(x), 50)).filter(Boolean); if (!out.yes.length && !out.no.length) out.kind = 'statement'; }
      if (kind === 'poster') out.word = str(String(s.word || ''), 12) || 'Human';
      if (kind === 'chat') { out.chat = (Array.isArray(s.chat) ? s.chat : []).slice(0, 4).map(m => ({ who: m.who === 'me' ? 'me' : 'them', text: str(String(m.text || ''), 70) })).filter(m => m.text); if (!out.chat.length) out.kind = 'statement'; }
      if (kind === 'marquee') out.band = str(String(s.band || ''), 30) || 'Design that matters';
      if (kind === 'notes') { out.notes = (Array.isArray(s.notes) ? s.notes : []).slice(0, 3).map(x => str(String(x), 50)).filter(Boolean); if (!out.notes.length) out.kind = 'statement'; }
      if (kind === 'timeline') { out.points = (Array.isArray(s.points) ? s.points : []).slice(0, 5).map(p => ({ k: str(String(p.k || ''), 8), v: str(String(p.v || ''), 60) })).filter(p => p.k && p.v); if (out.points.length < 2) out.kind = 'statement'; }
      if ((kind === 'list' || kind === 'steps') && !out.items.length) out.kind = 'statement';
      if (s.header === true && kind !== 'cover') out.header = true;
      return out;
    });
    if (!slides.length) throw new Error('No slides in the response');
    if (slides[0].kind !== 'cover') slides.unshift({ kind: 'cover', head: item.topic.toUpperCase(), sub: '', foot: '' });
    if (slides[slides.length - 1].kind !== 'cta') slides.push({ kind: 'cta', head: 'Want this on [[your]] brand?', btn: "Let's talk", foot: 'Follow @sixjulydesign for more on {{what’s next in design.}}' });
    slides = slides.slice(0, 30);
    return { topic: item.topic, format: (o && o.format) || 'mix', engine, slides, caption: str(obj.caption, 1500), hashtags: (Array.isArray(obj.hashtags) ? obj.hashtags : []).map(h => str(String(h), 30)).filter(Boolean).slice(0, 8) };
  }

  // engine: 'claude' | 'patterns' | 'auto' (Claude when a key is set, patterns otherwise or if Claude fails)
  async function write(item, o) {
    o = o || {};
    const engine = o.engine || 'auto';
    const canClaude = !!o.apiKey || !!(await getSample());
    if (engine === 'patterns' || o.format === 'showcase' || (engine === 'auto' && !canClaude)) return writePatterns(item, o);
    try { return await writeClaude(item, o); }
    catch (e) {
      if (engine === 'claude') throw e;
      const s = writePatterns(item, o); s.engine = 'patterns (Claude failed: ' + (e && e.message || e.code || 'error') + ')'; return s;
    }
  }
  const canUseClaude = async key => !!key || !!(await getSample());

  window.SixjulyCopy = { rewordTopics, FORMATS, KINDS, CLASSIC, RICH, showcase, canUseClaude, parseTopics, write, writePatterns, writeClaude, normalizeStory, extractJSON, SYSTEM };
})();
