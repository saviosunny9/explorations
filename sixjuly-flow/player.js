/* Sixjuly Flow — reel player (canvas + play / scrub). Used by the result cards and the focus view. */
(function () {
  'use strict';
  const R = window.SixjulyRender, h = window.sjh;
  const PLAY = '<svg viewBox="0 0 16 16" width="13" height="13"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
  const PAUSE = '<svg viewBox="0 0 16 16" width="13" height="13"><path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor"/></svg>';
  // returns { el (canvas), bar (controls), stop(), redraw(), plan }
  function create(deck, cssW, cssH, dpr) {
    dpr = dpr || 2; const sc = cssW * dpr / 1080;
    const cv = h('canvas', { width: Math.round(cssW * dpr), height: Math.round(cssH * dpr), style: { width: cssW + 'px', height: cssH + 'px' } }), ctx = cv.getContext('2d');
    const m = () => deck.motion || R.DEFAULT_MOTION;
    let plan = R.reelPlan(deck, m()), t = 0, playing = false, raf = 0, last = 0, poster = true;
    const range = h('input', { type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'Scrub' }), time = h('span.time', null, '0:00');
    const pad = n => String(n).padStart(2, '0'), fmt = s => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
    const frame = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(sc, 0, 0, sc, 0, 0);
      if (poster) R.drawSlide(ctx, deck, 0, { W: 1080, H: 1920 }); else R.drawReel(ctx, deck, t, { plan, motion: m() });
      range.value = Math.round(t / plan.total * 1000); time.textContent = `${fmt(t)} / ${fmt(plan.total)}`;
    };
    const tick = now => { if (!playing) return; t += (now - last) / 1000; last = now; if (t >= plan.total) t = 0; frame(); raf = requestAnimationFrame(tick); };
    const btn = h('button.pbtn', { type: 'button', title: 'Play / pause', onclick: () => { playing = !playing; poster = false; btn.innerHTML = playing ? PAUSE : PLAY; if (playing) { last = performance.now(); raf = requestAnimationFrame(tick); } } }); btn.innerHTML = PLAY;
    range.addEventListener('input', () => { poster = false; t = range.value / 1000 * plan.total; frame(); });
    frame();
    return { el: cv, bar: h('div.bar', null, btn, range, time), stop() { playing = false; cancelAnimationFrame(raf); }, redraw() { plan = R.reelPlan(deck, m()); frame(); }, get plan() { return plan; } };
  }
  window.SixjulyPlayer = { create };
})();
