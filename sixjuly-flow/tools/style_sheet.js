// Dev check: renders the design-language layouts in a style pack.  node tools/style_sheet.js out-prefix [style] [format=post|reel]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const out = process.argv[2] || 'styles', style = process.argv[3] || 'sixjuly', reel = process.argv[4] === 'reel';
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await p.setContent('<body></body>');
  for (const f of ['logo', 'render', 'layouts', 'layouts2', 'layouts3']) await p.addScriptTag({ path: path.join(__dirname, `../${f}.js`) });
  const shots = await p.evaluate(async ({ style, reel }) => {
    const R = window.SixjulyRender; await R.loadFonts({});
    const S = window.__samples = [
      { kind: 'cover', head: 'Design systems that [[ship]]', tag: 'Hot take', sub: 'The [[quiet]] craft behind great brands', foot: 'What the best studios agree on' },
      { kind: 'cover', cover: 'block', head: 'Why rebrands [[work]]', tag: 'Essay', sub: 'Familiar beats new', foot: 'Seven lessons from a decade of identity work' },
      { kind: 'cover', cover: 'index', num: '07', head: 'Rules for [[better]] grids', sub: 'A field guide', foot: 'Save this for your next layout' },
      { kind: 'statement', head: 'Good design is [[as little design]] as possible.', foot: 'Say the one thing {{clearly.}}' },
      { kind: 'list', head: 'Three rules we [[keep]]', items: ['Start with the [[human]]', 'Cut one thing more', 'Ship, then refine'], foot: 'Small rules. {{Big consistency.}}' },
      { kind: 'steps', head: 'How we run a [[sprint]]', items: ['Discover the real problem', 'Sketch ten ideas', 'Test with five people', 'Ship the smallest version'], foot: 'Four days. {{One clear answer.}}' },
      { kind: 'compare', head: 'What changed with [[logos]]', a: { label: 'Before', text: 'Detailed marks for print' }, b: { label: 'After', text: 'Simple marks for tiny screens' }, foot: 'Same goal. {{Better answer.}}' },
      { kind: 'stat', head: 'Familiar beats [[new]]', stat: { value: '72%', label: 'of people recognise a brand by colour before they read the name' }, foot: 'Numbers do not design anything. {{People do.}}' },
      { kind: 'quote', head: 'What clients say', quote: { text: 'They made our product feel [[human]] again.', by: 'A happy founder' }, foot: 'Real words. {{Real work.}}' },
      { kind: 'tiles', head: 'Four ideas behind [[texture]]', items: ['Make it feel [[touchable]]', 'Light does the work', 'Depth, not decoration', 'Keep it quiet'], foot: 'Small ideas. {{Big feeling.}}' },
      { kind: 'split', head: 'Then vs [[now]]', a: { label: 'Then', text: 'Flat icons. Zero weight.' }, b: { label: 'Now', text: 'Soft light. Real depth.' }, foot: 'The shift is {{subtle.}}' },
      { kind: 'checks', head: 'Do this. [[Not that.]]', yes: ['Say it plainly', 'One idea per screen', 'Show the next step'], no: ['Hide behind jargon', 'Five fonts on one page', 'Decorate to fill space'], foot: 'Simple wins {{every time.}}' },
      { kind: 'timeline', head: 'How we got [[here]]', points: [{ k: '2013', v: 'Flat design takes over' }, { k: '2019', v: 'Everything looks the same' }, { k: '2026', v: 'Texture comes back' }], foot: 'Design is a {{pendulum.}}' },
      { kind: 'chat', head: 'What clients [[ask]]', chat: [{ who: 'them', text: 'Can we add more features?' }, { who: 'me', text: 'Can we make the first step obvious?' }, { who: 'them', text: 'Huh. That is better.' }], foot: 'Questions are {{design.}}' },
      { kind: 'notes', head: 'Notes from the [[studio]]', notes: ['Start with the [[human]]', 'Cut one thing more', 'Ship, then refine'], foot: 'Stick them {{where you work.}}' },
      { kind: 'poster', head: 'One word for [[2026]]', word: 'Human', foot: 'Everything else is {{detail.}}' },
      { kind: 'marquee', head: 'Say it [[louder]]', band: 'Design that matters', foot: 'Repeat what is {{true.}}' },
      { kind: 'bento', head: 'The year in [[review]]', value: '48', items: ['Brands launched with clients across four continents', 'Design systems shipped', 'Workshops run', 'One studio, twelve people'], foot: 'Thank you for {{making.}}' },
      { kind: 'table', head: 'Agency vs [[studio]]', cols: ['', 'Agency', 'Studio'], rows: [['Team', 'Rotating', 'Senior, fixed'], ['Process', 'Deck first', 'Prototype first'], ['Timeline', '12 weeks', '6 weeks'], ['Handover', 'PDF guidelines', 'Living system']], foot: 'Pick the one that {{fits.}}' },
      { kind: 'feature', head: 'Colour is a [[system]]', caption: 'Palette study', kicker: 'Why it works', body: 'One accent, used rarely, does more than five used everywhere. Keep the violet for the word that matters.', foot: 'Use it {{sparingly.}}' },
      { kind: 'columns', head: 'Inside a [[rebrand]]', cols: [{ k: 'Problem', v: 'Nobody remembered the old mark' }, { k: 'Approach', v: 'Keep the colour, simplify the shape' }, { k: 'Result', v: 'Recognised in a second, at any size' }], foot: 'Case notes, {{in short.}}' },
      { kind: 'index', head: 'What is [[inside]]', items: ['Grids that hold', 'Type with a voice', 'Colour used on purpose', 'Motion that explains'], foot: 'Four chapters, {{one idea.}}' },
      { kind: 'principles', head: 'Four [[principles]]', items: ['Be [[useful]]', 'Be honest', 'Be as little design as possible', 'Be long-lasting'], foot: 'Borrowed, {{not copied.}}' },
      { kind: 'metrics', head: 'The [[numbers]]', stats: [{ value: '3×', label: 'faster to publish' }, { value: '92%', label: 'on-brand slides' }, { value: '14 min', label: 'saved per post' }], foot: 'Sample figures. {{Swap in your own.}}' },
      { kind: 'release', head: "What's [[new]]", version: 'v2.4', changes: [{ tag: 'New', text: 'Style packs for every post' }, { tag: 'Improved', text: 'Faster reel export' }, { tag: 'Fixed', text: 'Arrow clipping on covers' }], foot: 'Update available {{today.}}' },
      { kind: 'matrix', head: 'Effort vs [[impact]]', axes: { x: ['Low effort', 'High effort'], y: ['Low impact', 'High impact'] }, dots: [{ label: 'Quick win', x: 0.2, y: 0.8 }, { label: 'Big bet', x: 0.8, y: 0.85 }, { label: 'Later', x: 0.7, y: 0.2 }], foot: 'Start {{top left.}}' },
      { kind: 'glossary', head: 'Design [[glossary]]', term: 'Texture', phonetic: '/ˈtekstʃər/', pos: 'noun', definition: 'The feel of a surface, brought into a screen so interfaces look touchable again.', example: 'Texture is back in UI', foot: 'Words we use {{daily.}}' },
      { kind: 'flow', head: 'From topic to [[post]]', items: ['Pick a topic', 'Write the copy', 'Choose a style', 'Export'], foot: 'Four steps, {{no fuss.}}' },
      { kind: 'cta', head: 'Want this on [[your]] brand?', btn: "Let's talk", foot: 'New posts every {{Tuesday.}}' },
    ];

    const deck = { topic: 'Design systems that ship', brand: {}, design: { theme: 'auto', style, art: 'orb' }, slides: S };
    const W = 1080, H = reel ? 1920 : 1350, res = [], cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    for (let i = 0; i < S.length; i++) { ctx.clearRect(0, 0, W, H); try { R.drawSlide(ctx, deck, i, { W, H }); } catch (e) { console.error('slide ' + i + ' ' + S[i].kind + ': ' + e.message + ' ' + (e.stack.split('\n')[1] || '')); } res.push(cv.toDataURL('image/jpeg', 0.8)); }
    return res;
  }, { style, reel });
  shots.forEach((d, i) => fs.writeFileSync(`${out}.${String(i).padStart(2, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
  console.log('rendered', shots.length); await b.close();
})();
