// Dev check: renders one sample of every slide kind / cover style into contact sheets.  node tools/layout_sheet.js out-prefix [theme]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const out = process.argv[2] || 'layouts', theme = process.argv[3] || 'light';
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await p.setContent('<body></body>');
  for (const f of ['logo', 'render', 'layouts']) await p.addScriptTag({ path: path.join(__dirname, `../${f}.js`) });
  const shots = await p.evaluate(async (theme) => {
    const R = window.SixjulyRender; await R.loadFonts({});
    const S = [
      { kind: 'cover', cover: 'annotate', head: 'DIGITAL\nTEXTURES', callouts: [{ w: 0, label: 'Chrome buttons' }, { w: 1, label: 'Clay material' }], sub: 'The [[New Face]] of UI', foot: 'In 2026, screens are meant to feel touchable again' },
      { kind: 'cover', cover: 'crt', head: 'Rebrands That [[Broke The]] Internet', tag: '07', foot: 'Seven logo changes that set the internet on fire' },
      { kind: 'cover', cover: 'ripple', num: '8', head: 'Graphic Design\nTrends\nDominating', stamp: '2026', foot: '' },
      { kind: 'art', art: 'retro', head: '[[Nostalgia]] is a design\nsystem now', foot: 'Why the smartest product teams are borrowing from the past to make the future feel safe?' },
      { kind: 'art', art: 'browser', head: 'The page is a [[canvas]].', foot: 'Websites are allowed to be weird again.' },
      { kind: 'art', art: 'phone', head: 'Small screen, [[big]] decisions.', foot: 'Design for the thumb first.' },
      { kind: 'collage', head: 'The grid is dead.\n[[Long live the mess.]]', header: true, dots: true, words: ['PLAY', 'GRID', 'MESS'], labels: ['Fewer boxes. More overlap.', 'Layouts breaking the page on purpose.'] },
      { kind: 'posters', head: '[[Neo-Minimalism]]\nis here.', handle: true, words: ['gabriel', 'neckel studio', 'noa', 'true to form'], foot: 'Flat design had its decade.\nNow it’s warmer, softer and human.' },
      { kind: 'greeting', head: 'Happy [[Diwali]]', label: 'Sixjuly', title: 'Festival of lights' },
      { kind: 'tiles', head: 'Four ideas behind [[texture]]', items: ['Make it feel [[touchable]]', 'Light does the work', 'Depth, not decoration', 'Keep it quiet'], foot: 'Small ideas. {{Big feeling.}}' },
      { kind: 'split', head: 'Then vs [[now]]', a: { label: 'Then', text: 'Flat icons. Zero weight.' }, b: { label: 'Now', text: 'Soft light. Real depth.' }, foot: 'The shift is {{subtle.}}' },
      { kind: 'checks', head: 'Do this. [[Not that.]]', yes: ['Say it plainly', 'One idea per screen'], no: ['Hide behind jargon', 'Five fonts on one page'], foot: 'Simple wins {{every time.}}' },
      { kind: 'poster', head: 'One word for [[2026]].', word: 'Human', foot: 'Everything else is {{detail.}}' },
      { kind: 'chat', head: 'What clients [[ask]]', chat: [{ who: 'them', text: 'Can we add more features?' }, { who: 'me', text: 'Can we make the first step obvious?' }, { who: 'them', text: 'Huh. That is better.' }], foot: 'Questions are {{design.}}' },
      { kind: 'marquee', head: 'Say it [[louder]]', band: 'Design that matters', foot: 'Repeat what is {{true.}}' },
      { kind: 'notes', head: 'Sticky-note [[rules]]', notes: ['Start with the [[human]]', 'Cut one thing more', 'Ship, then refine'], foot: 'Stick them {{where you work.}}' },
      { kind: 'timeline', head: 'How we got [[here]]', points: [{ k: '2013', v: 'Flat design takes over' }, { k: '2019', v: 'Everything looks the [[same]]' }, { k: '2026', v: 'Texture comes back' }], foot: 'Design is a {{pendulum.}}' },
    ];
    const deck = { brand: {}, design: { theme, art: 'orb' }, slides: S };
    const res = [], cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const ctx = cv.getContext('2d');
    for (let i = 0; i < S.length; i++) { ctx.clearRect(0, 0, 1080, 1350); try { R.drawSlide(ctx, deck, i, { W: 1080, H: 1350 }); } catch (e) { console.error('slide ' + i + ' ' + S[i].kind + ': ' + e.message + ' ' + e.stack.split('\n')[1]); } res.push(cv.toDataURL('image/png')); }
    return res;
  }, theme);
  shots.forEach((d, i) => fs.writeFileSync(`${out}.${String(i).padStart(2, '0')}.png`, Buffer.from(d.split(',')[1], 'base64')));
  console.log('rendered', shots.length); await b.close();
})();
