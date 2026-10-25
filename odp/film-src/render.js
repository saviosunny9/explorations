const { chromium } = require('playwright');
const fs = require('fs');
const [,, out, w, h, ss, fps, from, to, every] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', e => console.log('ERR', e.message));
  p.on('console', m => console.log('LOG', m.text()));
  await p.goto(`file://${__dirname}/scene.html?w=${w}&h=${h}&ss=${ss}`);
  await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
  fs.mkdirSync(out, { recursive: true });
  const t0 = Date.now();
  for (let f = +from; f < +to; f += +(every || 1)) {
    const url = await p.evaluate(t => window.renderFrame(t), f / +fps);
    fs.writeFileSync(`${out}/f${String(f).padStart(4, '0')}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('done', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await b.close();
})();
