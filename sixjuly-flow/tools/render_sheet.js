// Renders a sample deck with the slide renderer and saves a contact sheet (dev check against the Figma posts).
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || 'sheet.png';
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await p.setContent('<body style="margin:0;background:#444"></body>');
  await p.addScriptTag({ path: path.join(__dirname, '../logo.js') });
  await p.addScriptTag({ path: path.join(__dirname, '../render.js') });
  const data = await p.evaluate(async () => {
    const R = window.SixjulyRender; await R.loadFonts({});
    const deck = { brand: {}, design: { art: 'orb' }, slides: [
      { kind: 'cover', head: 'DIGITAL\nTEXTURES', tag: '07', sub: 'The [[New Face]] of UI', foot: 'In 2026, screens are meant to feel touchable again' },
      { kind: 'statement', head: 'For a decade, good design meant [[disappearing]].', foot: 'Flat icons. Zero shadows. Zero weight.\n{{Clean, yes. Forgettable, also yes.}}' },
      { kind: 'objects', head: '2026 is [[reversing]] that.', foot: 'Buttons that squish. Toggles that catch light like chrome. Cards that look carved, not printed.\n{{Designers call it Digital Texture}}', objects: [{ type: 'jelly', label: 'Jelly', text: 'Start' }, { type: 'toggle', label: 'Chrome' }, { type: 'card', label: 'Clay' }] },
      { kind: 'compare', head: 'The bird flew.\n[[The name]] stayed anyway.', a: { label: 'Before', text: 'Twitter' }, b: { label: 'After', text: 'X' }, foot: 'One of the most {{contested rebrands}} in tech history. Two years on, X is just the app.' },
      { kind: 'stat', head: 'Rebrands that cost a fortune.', stat: { value: '7×', label: 'more recall when the mark stays [[familiar]]' }, foot: 'Familiar beats {{new for the sake of new}}.' },
      { kind: 'list', head: 'Three rules we [[keep]].', items: ['Start with the [[human]]', 'Cut one thing more', 'Ship, then refine'], foot: 'Small rules. {{Big consistency.}}' },
      { kind: 'steps', head: 'How we run a [[sprint]].', items: ['Discover the real problem', 'Sketch ten ideas', 'Test with five people'], foot: 'Three days. {{One clear answer.}}' },
      { kind: 'quote', head: 'What clients say.', quote: { text: 'They made our product feel [[human]] again.', by: 'A happy founder' }, foot: 'Real words. {{Real work.}}' },
      { kind: 'cta', head: 'We don’t chase trends. We read where they’re headed and build for it.', btn: "Let's talk", foot: 'Follow @Sixjuly for more on {{what’s next in design.}}' },
    ] };
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const ctx = cv.getContext('2d');
    const shots = [];
    for (let i = 0; i < deck.slides.length; i++) { ctx.clearRect(0, 0, 1080, 1350); R.drawSlide(ctx, deck, i, { W: 1080, H: 1350 }); shots.push(cv.toDataURL('image/png')); }
    // reel frames
    const rv = document.createElement('canvas'); rv.width = 1080; rv.height = 1920; const rc = rv.getContext('2d');
    const reel = [];
    const plan = R.reelPlan(deck, R.DEFAULT_MOTION);
    for (const t of [0.4, 1.2, plan.segs[1].start + 0.2, plan.segs[1].start + 1.5]) { R.drawReel(rc, deck, t, { plan }); reel.push(rv.toDataURL('image/png')); }
    return { shots, reel, total: plan.total, segs: plan.segs.map(s => +s.dur.toFixed(2)) };
  });
  console.log('reel total', data.total.toFixed(1), data.segs.join(','));
  const fs = require('fs');
  data.shots.forEach((d, i) => fs.writeFileSync(`${out}.${i}.png`, Buffer.from(d.split(',')[1], 'base64')));
  data.reel.forEach((d, i) => fs.writeFileSync(`${out}.reel${i}.png`, Buffer.from(d.split(',')[1], 'base64')));
  await b.close();
})();
