#!/usr/bin/env node
// Headless batch run of the same engine the app uses: topics in, carousel PNGs + reel video + captions out.
//   node tools/generate.js --topics topics.txt --out out/ [--reel] [--engine auto|claude|patterns] [--motion smooth|punchy|playful|minimal|editorial|kinetic]
//                          [--slides 7] [--format mix|reversal|beforeafter|list|myth|howto|stat] [--theme light|cream|dark|violet|orange] [--art orb|spiral|none]
//   node tools/generate.js --topic "Why rebrands work" --topic "Less is more in UI" --out out/
// Set ANTHROPIC_API_KEY to write copy with Claude (engine auto/claude); otherwise the offline pattern engine is used.
// Needs Playwright with Chromium (NODE_PATH=$(npm root -g) if it is installed globally).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const argv = process.argv.slice(2), opt = {}, topics = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]; if (!a.startsWith('--')) continue; const k = a.slice(2), v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  if (k === 'topic') topics.push(v); else opt[k] = v;
}
if (opt.topics) topics.push(...fs.readFileSync(opt.topics, 'utf8').split('\n'));
if (!topics.filter(t => t.trim()).length) { console.error('Give --topics file.txt or --topic "…". See the header of this file.'); process.exit(1); }
const out = opt.out || 'out'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const exe = process.env.CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => fs.existsSync(p));
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  p.on('pageerror', e => console.error('page error:', e.message));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForSelector('.node');
  const files = await p.evaluate(o => SixjulyFlow.api.generate(o), {
    topics: topics.join('\n'), reel: !!opt.reel, apiKey: process.env.ANTHROPIC_API_KEY || '', engine: opt.engine, model: opt.model, format: opt.format,
    slides: opt.slides && +opt.slides, motion: opt.motion, theme: opt.theme, art: opt.art, fps: opt.fps && +opt.fps, voice: opt.voice,
  });
  for (const f of files) { const dst = path.join(out, f.name); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, Buffer.from(f.b64, 'base64')); }
  console.log(`wrote ${files.length} files to ${out}/`); files.filter(f => /\.(mp4|webm|txt)$/.test(f.name)).forEach(f => console.log('  ' + f.name));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
