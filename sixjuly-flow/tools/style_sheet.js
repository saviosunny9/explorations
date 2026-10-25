// Dev check: renders the design-language layouts in a style pack.  node tools/style_sheet.js out-prefix [style] [format=post|reel]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const out = process.argv[2] || 'styles', style = process.argv[3] || 'sixjuly', reel = process.argv[4] === 'reel';
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await p.setContent('<body></body>');
  for (const f of ['logo', 'render', 'layouts', 'layouts2']) await p.addScriptTag({ path: path.join(__dirname, `../${f}.js`) });
  const shots = await p.evaluate(async ({ style, reel }) => {
    const R = window.SixjulyRender; await R.loadFonts({});
    const S = window.__samples = [
      { kind: 'cover', head: 'DESIGN\nSYSTEMS\nTHAT SHIP', sub: 'The [[quiet]] craft', foot: 'What the best studios agree on' },
      { kind: 'statement', head: 'Good design is [[as little design]] as possible.', foot: 'Say the one thing {{clearly.}}' },
      { kind: 'index', head: 'What is [[inside]]', items: ['Grids that hold', 'Type with a voice', 'Colour used on purpose', 'Motion that explains', 'Rules worth keeping'], foot: 'Five chapters, {{one idea.}}' },
      { kind: 'spec', head: 'The [[type]] sheet', word: 'Aa', specs: [{ k: 'Family', v: 'Google Sans Flex' }, { k: 'Weights', v: '300 to 800' }, { k: 'Tracking', v: '−4% display' }], foot: 'Small rules, {{consistent.}}' },
      { kind: 'casestudy', head: 'Case study: [[Northwind]]', meta: [{ k: 'Client', v: 'Northwind' }, { k: 'Role', v: 'Identity' }, { k: 'Year', v: '2026' }], words: ['Northwind'], foot: 'A calmer way to move money' },
      { kind: 'principles', head: 'Four [[principles]]', items: ['Be [[useful]]', 'Be honest', 'Be as little design as possible', 'Be long-lasting'], foot: 'Borrowed, {{not copied.}}' },
      { kind: 'metrics', head: 'The [[numbers]]', stats: [{ value: '3×', label: 'faster to publish' }, { value: '92%', label: 'on-brand slides' }, { value: '14 min', label: 'saved per post' }], foot: 'Measured over {{six weeks.}}' },
      { kind: 'release', head: "What's [[new]]", version: 'v2.4', changes: [{ tag: 'New', text: 'Style packs for every post' }, { tag: 'Improved', text: 'Faster reel export' }, { tag: 'Fixed', text: 'Arrow clipping on covers' }], foot: 'Update available {{today.}}' },
      { kind: 'matrix', head: 'Effort vs [[impact]]', axes: { x: ['Low effort', 'High effort'], y: ['Low impact', 'High impact'] }, dots: [{ label: 'Quick win', x: 0.2, y: 0.8 }, { label: 'Big bet', x: 0.8, y: 0.85 }, { label: 'Later', x: 0.7, y: 0.2 }], foot: 'Start {{top left.}}' },
      { kind: 'system', head: 'Our [[system]]', foot: 'Tokens, not {{guesses.}}' },
      { kind: 'glossary', head: 'Design [[glossary]]', term: 'Texture', phonetic: '/ˈtekstʃər/', pos: 'noun', definition: 'The feel of a surface, brought into a screen so interfaces look touchable again.', example: 'Texture is back in UI', foot: 'Words we use {{daily.}}' },
      { kind: 'stack', head: 'How it fits [[together]]', items: ['Brand', 'System', 'Layouts', 'Post'], foot: 'Layers, {{not pages.}}' },
      { kind: 'flow', head: 'From topic to [[post]]', items: ['Pick a topic', 'Write the copy', 'Choose a style', 'Export'], foot: 'Four steps, {{no fuss.}}' },
      { kind: 'wrapped', head: 'Your year in [[design]]', value: '7×', label: 'More posts than last year', foot: 'Thanks for {{making.}}' },
      { kind: 'mesh', head: 'Ship [[faster]] with calm tools', tags: ['Carousels', 'Reels', 'Batch'], foot: 'Built for the team' },
      { kind: 'cta', head: 'Follow for more [[design]]', btn: 'Follow', foot: 'sixjuly.com' },
    ];
    const deck = { brand: {}, design: { theme: 'auto', style, art: 'orb' }, slides: S };
    const W = 1080, H = reel ? 1920 : 1350, res = [], cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    for (let i = 0; i < S.length; i++) { ctx.clearRect(0, 0, W, H); try { R.drawSlide(ctx, deck, i, { W, H }); } catch (e) { console.error('slide ' + i + ' ' + S[i].kind + ': ' + e.message + ' ' + (e.stack.split('\n')[1] || '')); } res.push(cv.toDataURL('image/jpeg', 0.8)); }
    return res;
  }, { style, reel });
  shots.forEach((d, i) => fs.writeFileSync(`${out}.${String(i).padStart(2, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64')));
  console.log('rendered', shots.length); await b.close();
})();
