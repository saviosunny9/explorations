// Loads the built single file with a stubbed window.claude (sample + downloads) and checks the in-Claude paths.
//   node tools/artifact_test.js [path/to/sixjuly-flow.html] [--shots dir]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const file = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(__dirname, '../dist/sixjuly-flow.html'));
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } }); const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await p.addInitScript(() => {
    window.__saved = []; window.__prompts = [];
    window.claude = { use: async name => {
      if (name === 'downloads') return { save: async ({ filename, data }) => { window.__saved.push({ filename, size: data.size }); return { status: 'saved' }; } };
      if (name === 'sample') { const f = async (input) => { window.__prompts.push(input); return { text: '```json\n' + JSON.stringify({ caption: 'Stub caption', hashtags: ['#a'], slides: [
        { kind: 'cover', cover: 'annotate', head: 'Stub Topic', callouts: [{ w: 0, label: 'First' }, { w: 1, label: 'Second' }], foot: 'Swipe.' },
        { kind: 'chat', head: 'What they [[say]]', chat: [{ who: 'them', text: 'Hello?' }, { who: 'me', text: 'Hello.' }], foot: 'Talk {{first}}.' },
        { kind: 'timeline', head: 'Then to [[now]]', points: [{ k: '2020', v: 'One' }, { k: '2026', v: 'Two' }], foot: 'x' },
        { kind: 'cta', head: 'Talk to [[us]]', btn: 'Hi', foot: 'Follow' }] }) + '\n```' }; }; return f; }
      return null; } };
  });
  await p.goto('file://' + file); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.node');
  const libs = await p.evaluate(() => ({ mp4: typeof Mp4Muxer, webm: typeof WebMMuxer, jszip: typeof JSZip, scripts: [...document.scripts].filter(s => s.src).length }));
  await p.click('#runBtn'); await p.waitForSelector('.rc', { timeout: 40000 }); await p.waitForTimeout(400);
  const eng = await p.evaluate(() => [...document.querySelectorAll('.rc-h .chip')].slice(0, 2).map(c => c.textContent).join(' / '));
  const sawPrompt = await p.evaluate(() => (window.__prompts[0] || '').includes('Richer layouts') && (window.__prompts[0] || '').includes('Topic:'));
  const kinds = await p.evaluate(() => SixjulyFlow.api.state.outputs[0].decks[0].slides.map(s => s.kind).join(','));
  if (shots) await p.screenshot({ path: path.join(shots, 'art-1.png') });
  await p.click('.rc >> nth=0 >> text=Download slides'); await p.waitForFunction(() => window.__saved.length >= 1, null, { timeout: 30000 });
  const saved = await p.evaluate(() => window.__saved);
  console.log({ libs, eng, sawPrompt, kinds, saved });
  // showcase flow + images node
  await p.click('#exBtn'); await p.click('#exMenu button >> text=Layout showcase'); await p.click('#runBtn'); await p.waitForSelector('.rc .strip canvas', { timeout: 40000 }); await p.waitForTimeout(600);
  const n = await p.evaluate(() => SixjulyFlow.api.state.outputs[0].decks[0].slides.length); console.log('showcase slides', n);
  if (shots) await p.screenshot({ path: path.join(shots, 'art-2.png') });
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors'); await b.close(); process.exit(errors.length ? 1 : 0);
})();
