/* Collage Studio — templates and presets.
   Coordinates are in canvas pixels. Text can be placed by its centre with
   cx / cy; the editor measures the text and resolves x / y on load. */
(function () {
  'use strict';

  const yr = new Date().getFullYear(), mo = new Date().getMonth(), dy = new Date().getDate();
  const txt = (text, o) => Object.assign({ type: 'text', text }, o);
  const stk = (stickerId, x, y, w, h, o = {}) => Object.assign({ type: 'sticker', stickerId, x, y, width: w, height: h }, o);
  const img = (x, y, w, h, o = {}) => Object.assign({ type: 'image', x, y, width: w, height: h }, o);
  const shp = (shape, x, y, w, h, o = {}) => Object.assign({ type: 'shape', shape, x, y, width: w, height: h }, o);
  const nat = (kind, x, y, w, h, o = {}) => Object.assign({ type: 'nature', kind, x, y, width: w, height: h }, o);
  const rib = (path, x, y, w, h, o = {}) => Object.assign({ type: 'ribbon', path, x, y, width: w, height: h }, o);
  const cam = (style, o = {}) => Object.assign({ type: 'camera', style, x: 0, y: 0, width: 1080, height: 1350 }, o);
  const arrow = (x, y, w, h, o = {}) => rib('hook', x, y, w, h, Object.assign({ line: true, thickness: 2.5, color: 'rgba(255,255,255,0.85)', text: '', arrowEnd: true }, o));
  const soft = { on: true, color: '#000000', opacity: 0.22, blur: 30, x: 0, y: 14 };
  const lifted = { on: true, color: '#000000', opacity: 0.3, blur: 14, x: 0, y: 7 };
  const deep = { on: true, color: '#0b1f18', opacity: 0.45, blur: 40, x: 0, y: 22 };
  const grid = (color, size, thick = 1.5) => ({ type: 'grid', color, size, thick, opacity: 1 });
  const TEMPLATES = [
    {
      id: 'every-shade', name: 'Every Shade', tags: ['Post', 'Paper'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#1f5a4a', pattern: grid('rgba(255,255,255,0.09)', 54), texture: 12 },
        elements: [
          shp('rect', 118, 214, 790, 1010, { rotation: -4, fill: '#e3ddcd', texture: 45, shadow: soft, pattern: { type: 'lined', color: 'rgba(70,90,120,0.16)', size: 34, thick: 1.2, color2: 'rgba(0,0,0,0)' } }),
          shp('rect', 232, 150, 760, 1060, { rotation: 3, fill: '#ece6d8', texture: 40, shadow: soft }),
          shp('rounded', 170, 150, 740, 1060, { radius: 26, fill: '#f4f0e6', texture: 55, shadow: deep }),
          stk('clip-silver', 210, 86, 64, 184, { rotation: -14 }),
          stk('binder-clip', 850, 700, 124, 140, { rotation: 90 }),
          txt('Transit', { cx: 540, cy: 236, fontFamily: 'Instrument Serif', italic: true, fontSize: 30, fill: '#2a2420' }),
          txt('Every', { cx: 470, cy: 452, fontFamily: 'Instrument Serif', fontSize: 178, fill: '#2a2420', lineHeight: 1 }),
          stk('star-chunky', 682, 338, 130, 130, { rotation: 12, colors: ['#4f7f62'] }),
          txt('Shade', { cx: 596, cy: 604, fontFamily: 'Instrument Serif', fontSize: 178, fill: '#2a2420', lineHeight: 0.92, bg: { style: 'select', color: '#cfc9f3', borderColor: '#7b6cf0', padX: 10, padY: 2, gap: 0, borderWidth: 2 } }),
          stk('heart-puffy', 196, 650, 112, 112, { rotation: -14, colors: ['#8c7cf0'] }),
          txt('deserves', { cx: 540, cy: 758, fontFamily: 'Instrument Serif', fontSize: 178, fill: '#2a2420', lineHeight: 1 }),
          txt('Attention', { cx: 540, cy: 912, fontFamily: 'Instrument Serif', fontSize: 178, fill: '#2a2420', lineHeight: 0.92, bg: { style: 'select', color: '#b9d2c2', borderColor: '#1f5a4a', padX: 10, padY: 2, gap: 0, borderWidth: 2 } }),
          txt('Choose what suits you.', { cx: 604, cy: 1036, fontFamily: 'Instrument Serif', fontSize: 44, fill: '#2a2420' }),
          txt('See all colors →', { cx: 440, cy: 1150, rotation: -2, fontFamily: 'Instrument Serif', fontSize: 42, fill: '#2a2420', bg: { style: 'tape', color: '#d8cfba', padX: 36, padY: 14 } }),
        ],
      }),
    },
    {
      id: 'hi-im', name: 'Hi, I’m…', tags: ['Post', 'Profile'], width: 1080, height: 1080,
      build: () => ({
        width: 1080, height: 1080,
        background: { color: '#f3f2ee', pattern: grid('rgba(40,40,40,0.13)', 108, 2) },
        elements: [
          img(250, 110, 600, 740, { frame: { style: 'stamp', color: '#9ab83e', size: 42 }, placeholder: ['#f6dccf', '#e7b29f'], shadow: { on: true, color: '#000000', opacity: 0.12, blur: 20, x: 0, y: 8 } }),
          txt('Hi,\nI’m Emily', { cx: 330, cy: 210, rotation: -5, fontFamily: 'Instrument Serif', fontSize: 104, lineHeight: 0.92, fill: '#2148c0', bg: { style: 'box', color: '#ffa53c', padX: 34, padY: 24, radius: 28 } }),
          txt('Founder &\nCreative Director', { cx: 330, cy: 880, rotation: 3, fontFamily: 'Instrument Serif', fontSize: 82, lineHeight: 0.95, fill: '#2148c0', bg: { style: 'box', color: '#c9b6f2', padX: 34, padY: 20, radius: 28 } }),
          { type: 'badge', x: 748, y: 668, width: 290, height: 290, rotation: -8, fill: '#d7ef5a', textColor: '#2148c0', ringText: '5+ years experience', ringFont: 'Bricolage Grotesque', ringWeight: 500, ringSize: 0.115, ringSpacing: 0.04, ringRadius: 0.7, ringFill: false, ringStart: -40, center: 'asterisk', centerSize: 0.24 },
          stk('sparkle-4', 880, 90, 90, 90, { colors: ['#ffa53c'] }),
        ],
      }),
    },
    {
      id: 'main-character', name: 'Main character', tags: ['Post', 'Collage'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#efe5d9', texture: 25 },
        elements: [
          stk('paper-strip', 420, 150, 600, 162, { rotation: 7, colors: ['#9db38b'] }),
          img(150, 260, 640, 820, { frame: { style: 'polaroid', color: '#ffffff', size: 30, bottom: 3.4 }, placeholder: ['#e9e6e1', '#cfcac2'], shadow: soft }),
          txt('candid', { cx: 470, cy: 1030, fontFamily: 'Young Serif', fontSize: 36, fill: '#2b2a26' }),
          img(724, 392, 270, 330, { rotation: 7, frame: { style: 'border', color: '#f6c4cd', size: 20 }, placeholder: ['#8fb7e3', '#3d6fb8'], shadow: lifted }),
          img(684, 716, 270, 330, { rotation: 7, frame: { style: 'border', color: '#f6c4cd', size: 20 }, placeholder: ['#8fb7e3', '#3d6fb8'], shadow: lifted }),
          txt('main\ncharacter\nenergy', { cx: 300, cy: 236, rotation: -7, fontFamily: 'Leckerli One', fontSize: 92, lineHeight: 0.86, fill: '#2b2a26', bg: { style: 'sticker', color: '#fdf3a2', padX: 24 } }),
          txt('Take control of\nyour story.', { x: 110, y: 760, align: 'left', fontFamily: 'Young Serif', fontSize: 62, lineHeight: 1.05, fill: '#2b2a26', bg: { style: 'lines', color: '#9db38b', padX: 16, padY: 6, gap: 4 } }),
          stk('smiley-doodle', 812, 150, 150, 150, { rotation: 10, colors: ['#2b2a26'] }),
          stk('martini-doodle', 110, 1090, 130, 170, { rotation: -6, colors: ['#2b2a26'] }),
        ],
      }),
    },
    {
      id: 'thrifthaus', name: 'Thrift Haus', tags: ['Post', 'Collage', 'Event'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#0d0d0d' },
        elements: [
          shp('rect', 60, 120, 560, 590, { rotation: -2, fill: '#2f6fed' }),
          txt('AN EVENING\nWITH', { x: 96, y: 160, rotation: -2, align: 'left', fontFamily: 'Familjen Grotesk', fontWeight: 700, fontSize: 70, lineHeight: 0.95, fill: '#101010' }),
          txt('ThriftHaus', { x: 90, y: 300, rotation: -2, align: 'left', fontFamily: 'Instrument Serif', italic: true, fontSize: 132, fill: '#ffffff' }),
          txt('THRIFTHAUS', { cx: 400, cy: 262, rotation: -6, fontFamily: 'Familjen Grotesk', fontWeight: 600, fontSize: 26, fill: '#101010', bg: { style: 'oval', color: '#ff9ad5', padX: 30, padY: 18 } }),
          txt('20% OFF\nEVERYTHING', { x: 100, y: 540, rotation: -2, align: 'left', fontFamily: 'Familjen Grotesk', fontWeight: 700, fontSize: 70, lineHeight: 0.95, fill: '#101010' }),
          stk('cap-doodle', 110, 440, 120, 106, { colors: ['#f6f27a'] }),
          shp('rect', 600, 230, 420, 280, { rotation: 5, fill: '#f06b2c' }),
          txt('NESTLED IN THE HEART OF THE CITY, OUR MODERN THRIFT STORE SERVES AS A VIBRANT HUB WHERE PRE-LOVED GARMENTS ARE GIVEN A SECOND CHANCE AT LIFE.', { x: 632, y: 262, width: 360, autoWidth: false, rotation: 5, align: 'left', fontFamily: 'Familjen Grotesk', fontWeight: 600, fontSize: 25, lineHeight: 1.08, fill: '#101010' }),
          txt('TH', { cx: 930, cy: 128, rotation: 8, fontFamily: 'Instrument Serif', italic: true, fontSize: 92, fill: '#101010', bg: { style: 'scallop', color: '#9b8cf2', padX: 44, padY: 52 } }),
          stk('sun-doodle', 880, 520, 150, 150, { colors: ['#2fb84a'] }),
          img(560, 600, 470, 470, { rotation: 4, placeholder: ['#bcd8f2', '#6aa3d8'] }),
          txt('ThriftHaus', { cx: 800, cy: 760, rotation: 4, fontFamily: 'Instrument Serif', italic: true, fontSize: 100, fill: '#ffffff', opacity: 0.92 }),
          img(70, 780, 430, 470, { rotation: -3, placeholder: ['#a9cbe8', '#e9d7b6'] }),
          txt('TH', { cx: 160, cy: 820, fontFamily: 'Instrument Serif', italic: true, fontSize: 52, fill: '#101010', bg: { style: 'scallop', color: '#f6f27a', padX: 28, padY: 32 } }),
          stk('flower-doodle', 470, 1010, 140, 140, { colors: ['#101010'] }),
          txt('THANK YOU', { cx: 410, cy: 1230, rotation: -3, fontFamily: 'Familjen Grotesk', fontWeight: 700, fontSize: 58, fill: '#101010', bg: { style: 'box', color: '#f4f06a', padX: 30, padY: 14 } }),
          txt('THRIFTHAUS', { cx: 830, cy: 1180, rotation: -4, fontFamily: 'Familjen Grotesk', fontWeight: 600, fontSize: 46, fill: '#101010', bg: { style: 'oval', color: '#ff9ad5', padX: 54, padY: 34 } }),
          stk('cap-doodle', 30, 1170, 160, 140, { rotation: -10, colors: ['#ff6a2a'] }),
        ],
      }),
    },
    {
      id: 'monthly-planner', name: 'Monthly planner', tags: ['Planner', 'Paper'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#e9e2d3', pattern: { type: 'dots', color: 'rgba(0,0,0,0.18)', size: 36, thick: 1.6 }, texture: 30 },
        elements: [
          shp('rounded', 70, 120, 940, 900, { radius: 24, fill: '#fffdf7', texture: 40, shadow: soft }),
          { type: 'calendar', x: 110, y: 160, width: 860, height: 820, year: yr, month: mo, marked: [dy, Math.min(dy + 5, 27), Math.max(dy - 6, 2)], markStyle: 'scribble', accent: '#e4572e', lineColor: 'rgba(29,27,24,0.14)', titleFont: 'Instrument Serif', titleSize: 0.19, bodyFont: 'DM Sans', bodyWeight: 500, weekendAccent: true },
          stk('washi-stripes', 10, 120, 250, 66, { rotation: -32, colors: ['#f6a5c0', '#ffffff'] }),
          stk('washi-dots', 820, 108, 250, 66, { rotation: 30, colors: ['#9ad1f5', '#ffffff'] }),
          txt('this month', { x: 120, y: 1058, align: 'left', fontFamily: 'Caveat', fontWeight: 700, fontSize: 56, fill: '#e4572e' }),
          { type: 'checklist', x: 120, y: 1128, width: 520, fontFamily: 'Caveat', fontSize: 44, lineHeight: 1.45, items: '[x] Plan the shoot\n[ ] Book the studio\n[ ] Post every Friday' },
          stk('sticky-note', 700, 1060, 270, 250, { rotation: 4, colors: ['#d7ef5a'], shadow: lifted }),
          txt('don’t forget\nto rest ♡', { cx: 835, cy: 1180, rotation: 4, fontFamily: 'Caveat', fontWeight: 700, fontSize: 50, lineHeight: 1, fill: '#1d1b18' }),
          stk('push-pin', 800, 1036, 70, 88, { colors: ['#e4572e'] }),
        ],
      }),
    },
    // ── "Meet our…" on crumpled poster paper ──
    ...[
      { id: 'meet-women', name: 'Meet our women', paper: '#2d3fd3', ink: '#ffffff', words: ['MEET', 'OUR', 'WOMEN'], corners: ['THE WOMEN', 'BEHIND BACKSPACE'], caption: '[BEFORE BACKSPACE]', layout: 'grid' },
      { id: 'meet-team', name: 'Meet the team', paper: '#d8402d', ink: '#fff4ea', words: ['MEET', 'THE', 'TEAM'], corners: ['THE TEAM', 'BEHIND THE STUDIO'], caption: '[EST. 2019]', layout: 'single' },
      { id: 'our-story', name: 'Our small story', paper: '#f2cf3d', ink: '#1d1b18', words: ['OUR', 'SMALL', 'STORY'], corners: ['CHAPTER 01', 'SINCE 2021'], caption: '[WHERE IT STARTED]', layout: 'strip' },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Post', 'Paper', 'Photo'], width: 1080, height: 1350,
      build: () => {
        const label = (text, o) => txt(text, Object.assign({ fontFamily: 'Inter', fontWeight: 500, fontSize: 26, letterSpacing: 0.02, fill: v.ink }, o));
        const prints = [
          shp('rect', 300, 372, 400, 560, { rotation: -3, fill: '#d9d2c4', texture: 50, shadow: lifted }),
          shp('rect', 334, 384, 380, 520, { rotation: 2.5, fill: '#ebe5d8', texture: 45, shadow: lifted }),
          shp('rect', 352, 404, 376, 500, { rotation: 0.5, fill: '#f4efe4', texture: 40, shadow: soft }),
        ];
        const bw = { grayscale: 100, contrast: 12, fade: 18, grain: 25 };
        const photos = v.layout === 'grid'
          ? [[372, 424], [546, 424], [372, 650], [546, 650]].map(([x, y], k) => img(x, y, 166, 218, { rotation: 0.5, filters: bw, placeholder: [['#cfcac2', '#8f8a83'], ['#d8d3cb', '#9a958d'], ['#c9c4bc', '#858079'], ['#d3cec6', '#938e87']][k] }))
          : v.layout === 'single'
            ? [img(372, 424, 340, 444, { rotation: 0.5, filters: bw, placeholder: ['#d3cec6', '#8a857e'] })]
            : [0, 1, 2].map(k => img(392, 424 + k * 148, 300, 140, { rotation: 0.5, filters: bw, placeholder: ['#d3cec6', '#8a857e'] }));
        return {
          width: 1080, height: 1350,
          background: { color: v.paper, crumple: 70, crumpleSeed: 7 },
          overlay: { grain: 12 },
          elements: [
            label(v.corners[0], { x: 100, y: 78, align: 'left' }), label(v.corners[1], { x: 980 - 330, y: 78, width: 330, autoWidth: false, align: 'right' }),
            label(v.corners[0], { x: 100, y: 1250, align: 'left' }), label(v.corners[1], { x: 980 - 330, y: 1250, width: 330, autoWidth: false, align: 'right' }),
            txt(v.words[0], { cx: 180, cy: 292, fontFamily: 'Inter', fontWeight: 800, fontSize: 76, fill: v.ink }),
            txt(v.words[1], { cx: 512, cy: 292, fontFamily: 'Inter', fontWeight: 800, fontSize: 76, fill: v.ink }),
            txt(v.words[2], { cx: 820, cy: 292, fontFamily: 'Inter', fontWeight: 800, fontSize: 76, fill: v.ink }),
            ...prints, ...photos,
            txt(v.caption, { cx: 540, cy: 1000, fontFamily: 'Inter', fontWeight: 600, fontSize: 32, fill: v.ink }),
          ],
        };
      },
    })),

    // ── childhood note: grid-paper note between two taped-on photos ──
    ...[
      { id: 'note-blue', name: 'Childhood notes', bg: '#1f3fe0', note: 'grid', a: 'SAULO', b: 'ANA', ta: 'SAULO: QUEIMADA, BETIS,\nESCONDE-ESCONDE', tb: 'ANA: JOGAR FUTEBOL, FAZER\nCOMIDINHAS DE BRINCADEIRA,\nSOLTAR PIPA E PULAR ELÁSTICO', brand: ['CREARE', 'ESPAÇO CRIATIVO'] },
      { id: 'note-green', name: 'Favourite snacks', bg: '#14824a', note: 'lined', a: 'MAYA', b: 'LEO', ta: 'MAYA: MANGO SLICES,\nPOPCORN AT THE CINEMA', tb: 'LEO: GRANDMA’S BISCUITS,\nCHOCOLATE MILK AND\nANYTHING WITH CHEESE', brand: ['LITTLE CO.', 'FAMILY ARCHIVE'] },
      { id: 'note-pink', name: 'First dream job', bg: '#f0418f', note: 'dots', a: 'JOÃO', b: 'BIA', ta: 'JOÃO: ASTRONAUT,\nTHEN A PIZZA CHEF', tb: 'BIA: VET, BALLERINA\nAND, FOR ONE SUMMER,\nA PROFESSIONAL MERMAID', brand: ['STUDIO 22', 'THEN & NOW'] },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Post', 'Paper', 'Photo'], width: 1080, height: 1350,
      build: () => {
        const pattern = v.note === 'grid' ? { type: 'grid', color: 'rgba(40,60,90,0.16)', size: 20, thick: 1 } : v.note === 'lined' ? { type: 'lined', color: 'rgba(60,110,170,0.3)', size: 50, thick: 1.4, color2: 'rgba(0,0,0,0)' } : { type: 'dots', color: 'rgba(0,0,0,0.22)', size: 26, thick: 1.6 };
        const photo = { frame: { style: 'border', color: '#f7f6f2', size: 22, texture: 30 }, filters: { fade: 15, grain: 30, contrast: 6 }, shadow: lifted };
        const tag = (t, o) => txt(t, Object.assign({ fontFamily: 'Gochi Hand', fontSize: 46, fill: v.bg, bg: { style: 'folded', color: '#d6d6d3', padX: 42, padY: 12 }, shadow: { on: true, color: '#000000', opacity: 0.18, blur: 10, x: 0, y: 4 } }, o));
        const brand = (t, o) => txt(t, Object.assign({ fontFamily: 'Inter', fontWeight: 600, fontSize: 28, letterSpacing: 0.02, fill: 'rgba(255,255,255,0.88)' }, o));
        return {
          width: 1080, height: 1350,
          background: { color: v.bg },
          overlay: { grain: 22 },
          elements: [
            brand(v.brand[0], { x: 80, y: 40, align: 'left' }),
            brand(v.brand[1], { x: 1000 - 380, y: 40, width: 380, autoWidth: false, align: 'right' }),
            img(-40, 60, 420, 540, Object.assign({ rotation: 4, placeholder: ['#e9d8c8', '#a78c76'] }, photo)),
            tag(v.a, { cx: 330, cy: 112, rotation: 14 }),
            shp('torn', 150, 380, 690, 470, { tornSides: 'b', fill: '#f6f5f1', pattern, texture: 35, shadow: lifted, seed: 11 }),
            shp('ellipse', 790, 462, 28, 28, { fill: v.bg }),
            shp('ellipse', 790, 650, 28, 28, { fill: v.bg }),
            txt(v.ta, { cx: 480, cy: 520, fontFamily: 'Gochi Hand', fontSize: 46, lineHeight: 1.12, fill: '#1d1b18' }),
            txt(v.tb, { cx: 480, cy: 692, fontFamily: 'Gochi Hand', fontSize: 46, lineHeight: 1.12, fill: '#1d1b18' }),
            img(600, 830, 420, 530, Object.assign({ rotation: -6, placeholder: ['#e7d7cf', '#b3988b'] }, photo)),
            tag(v.b, { cx: 610, cy: 1080, rotation: -12 }),
            brand(v.brand[0], { x: 80, y: 1255, align: 'left' }),
          ],
        };
      },
    })),

    // ── POV note: polaroid with tape over a blurred photo, cursive on a ripped notebook page ──
    ...[
      { id: 'pov-red', name: 'Creator POV', ink: '#c4232b', tape: '#d9262c', pattern: 'lined', bubble: 'Your product is SOLD OUT!\nCongrats — everything was snapped\nup faster than you expected.', body: 'Creator POV: You refresh your\nstore and see it — SOLD OUT.\n\nThe late nights, the hustle, the\ndoubts… suddenly feel worth it.\nBecause this is what growth\nlooks like.' },
      { id: 'pov-blue', name: 'Day one vs today', ink: '#1f3fa8', tape: '#3f73e8', pattern: 'dots', bubble: 'New order! That’s 1,000\norders since you launched.', body: 'Day 1: one sale, from my mum.\nToday: a thousand little parcels\npacked at this same desk.\n\nKeep going. Small steps\nstill count.' },
      { id: 'pov-green', name: 'Note to self', ink: '#1f6b3a', tape: '#3aa655', pattern: 'graph', bubble: 'Reminder: you planned\nto rest today.', body: 'Note to self:\nyou don’t have to earn rest.\n\nLog off, make tea,\ncall someone you love.\nThe work will still be here\ntomorrow.' },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Quote', 'Photo', 'Paper'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#3b2f27' },
        overlay: { vignette: 25 },
        elements: [
          img(0, 0, 1080, 1350, { filters: { blur: 22, brightness: -12, saturation: -10 }, placeholder: ['#6b5646', '#2e241d'], name: 'Background photo (blurred)' }),
          img(220, 110, 560, 520, { rotation: -1.5, frame: { style: 'polaroid', color: '#f7f5f0', size: 22, bottom: 2.4, texture: 25 }, placeholder: ['#b8a18b', '#6a5544'], shadow: soft }),
          stk('washi-plain', 360, 70, 240, 66, { rotation: -4, colors: [v.tape] }),
          txt(v.bubble, { x: 268, y: 200, rotation: -1.5, align: 'left', fontFamily: 'Newsreader', fontWeight: 600, fontSize: 22, lineHeight: 1.2, fill: '#1d1b18', bg: { style: 'speech', color: '#ffffff', padX: 18, padY: 12, radius: 22 }, shadow: { on: true, color: '#000000', opacity: 0.18, blur: 10, x: 0, y: 4 } }),
          shp('notebook', 110, 560, 840, 680, { fill: '#f3efe6', pattern: { type: v.pattern === 'lined' ? 'lined' : v.pattern, color: 'rgba(60,60,60,0.22)', size: v.pattern === 'lined' ? 52 : 30, thick: 1.2, color2: 'rgba(0,0,0,0)' }, texture: 35, rim: '#ffffff', shadow: soft, seed: 4 }),
          txt(v.body, { cx: 560, cy: 905, fontFamily: 'Allura', fontSize: 58, lineHeight: 1.0, fill: v.ink }),
        ],
      }),
    })),

    // ── studio portraits: the photo is cut out and re-lit on a seamless backdrop ──
    ...[
      { id: 'studio-stat', name: 'Big stat', preset: 'ember', f: { motion: 22, motionAngle: 0, contrast: 10 } },
      { id: 'studio-circle', name: 'Circle headline', preset: 'ember', st: { light: 'flat', color: '#d4552a', color2: '#7a2410' }, f: { motion: 35, motionAngle: 0, contrast: 10 } },
      { id: 'studio-rhythm', name: 'Case study', preset: 'blue', st: { backdrop: false }, f: { ghost: 35, motionAngle: -30 } },
      { id: 'studio-data', name: 'Body data', preset: 'spotlight', f: {} },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Photo', 'Post', 'Sport'], width: 1080, height: 1350,
      build: () => {
        const P = window.StudioRender && window.StudioRender.STUDIO_PRESETS ? window.StudioRender.STUDIO_PRESETS[v.preset] : {};
        const studio = Object.assign({ on: true, backdrop: true, preset: v.preset }, P, v.st || {});
        delete studio.label;
        const photo = img(0, 0, 1080, 1350, { studio, filters: v.f, placeholder: [studio.color, studio.color2], name: 'Your photo — the person is cut out and re-lit' });
        const W = '#ffffff';
        const els = {
          'studio-stat': [
            photo,
            txt('99%', { x: 585, y: 760, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 170, letterSpacing: -0.05, fill: W }),
            txt('of beginners at the gym\nmake this one mistake', { x: 592, y: 960, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 34, lineHeight: 1.12, letterSpacing: -0.03, fill: W }),
          ],
          'studio-circle': [
            photo,
            txt('superpower', { cx: 540, cy: 40, fontFamily: 'Inter', fontWeight: 600, fontSize: 34, letterSpacing: -0.02, fill: W }),
            shp('ellipse', 210, 330, 660, 660, { fill: 'transparent', stroke: '#ffffff', strokeWidth: 2.5 }),
            txt('The #1\nLongevity Hack', { cx: 540, cy: 660, fontFamily: 'Inter', fontWeight: 500, fontSize: 72, lineHeight: 1.15, letterSpacing: -0.02, fill: W }),
            txt('HEALTH HACKS', { x: 40, y: 1290, align: 'left', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 22, letterSpacing: 0.12, fill: W }),
          ],
          'studio-rhythm': [
            txt('rion', { cx: 560, cy: 780, fontFamily: 'Inter', fontWeight: 500, fontSize: 520, letterSpacing: -0.06, fill: 'rgba(255,255,255,0.16)' }),
            photo,
            txt('Case\nStudy', { x: 50, y: 40, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 18, lineHeight: 1.1, fill: W }),
            txt('Performance\nWellness Brand', { x: 350, y: 40, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 18, lineHeight: 1.1, fill: W }),
            txt('2026', { x: 700, y: 40, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 18, fill: W }),
            txt('Performance is not\npressure. It is a rhythm', { x: 50, y: 140, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 62, lineHeight: 1.08, letterSpacing: -0.04, fill: W }),
            txt('A performance wellness brand for people who move with intention — balancing training, recovery and everyday rituals.', { x: 700, y: 150, width: 330, autoWidth: false, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 21, lineHeight: 1.2, fill: W }),
            txt('Research\nBrand Identity\nLogo Design\nVisual System', { x: 115, y: 1120, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 18, lineHeight: 1.15, fill: W }),
            txt('Location:\nUSA', { x: 115, y: 1260, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 18, lineHeight: 1.15, fill: W }),
          ],
          'studio-data': [
            photo,
            ...[[590, 430], [265, 570], [320, 710], [410, 860]].map(([x, y]) => shp('rect', x, y, 12, 12, { fill: 'transparent', stroke: '#ffffff', strokeWidth: 1.5 })),
            shp('rect', 510, 590, 190, 180, { fill: 'transparent', stroke: '#ffffff', strokeWidth: 1.5 }),
            txt('FLEXION + ABDUCTION', { x: 508, y: 555, align: 'left', fontFamily: 'Space Mono', fontWeight: 400, fontSize: 15, letterSpacing: 0.1, fill: W }),
            txt('TRAPEZIUS MUSCULATURE', { x: 508, y: 785, align: 'left', fontFamily: 'Space Mono', fontWeight: 400, fontSize: 15, letterSpacing: 0.1, fill: W }),
            txt('Test your whole\nbody and visualize\nall your data.', { x: 30, y: 1050, align: 'left', fontFamily: 'Inter', fontWeight: 600, fontSize: 52, lineHeight: 1.0, letterSpacing: -0.04, fill: W }),
            txt('Hormones, stress, thyroid, heart,\nmetabolic, toxins and much more.', { x: 30, y: 1240, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 24, lineHeight: 1.2, fill: W }),
          ],
        }[v.id];
        return {
          width: 1080, height: 1350,
          background: v.id === 'studio-rhythm' ? { color: '#6f93e6', color2: '#2547a8', gradient: 'linear', angle: 160 } : { color: studio.color2 },
          overlay: { grain: 22 },
          elements: els,
        };
      },
    })),

    // ── VIDEO: newspaper clipping — the photo gets circled while the camera moves ──
    ...[
      { id: 'news-pullback', name: 'Pull-back reveal', head: 'That’s me!', last: 'me!', mark: 'circle', caption: 'That’s me!', cam: { move: 'pullback', zoom: 4.2, start: 0, dur: 1.9, rotate: 8, blur: 0.8, shake: 0.25 }, markAt: 1.7, headAt: 2.2 },
      { id: 'news-crash', name: 'Crash zoom', head: 'Front page!', last: 'page!', mark: 'arrow', caption: 'I made the papers', cam: { move: 'crash', zoom: 2.6, start: 0.5, dur: 2.6, rotate: 5, blur: 0.9, shake: 0.2 }, markAt: 1.2, headAt: 0.1 },
      { id: 'news-snap', name: 'Snap zoom', head: 'Spotted!', last: 'Spotted!', mark: 'circle', caption: 'Guess who…', cam: { move: 'snap', zoom: 2.1, start: 1.3, dur: 3.5, rotate: -3, blur: 0.6, shake: 0.6 }, markAt: 1.6, headAt: 0.1 },
      { id: 'news-cuts', name: 'Hard cuts', head: 'Breaking: me', last: 'me', mark: 'tick', caption: 'Plot twist', cam: { move: 'cuts', zoom: 3.6, start: 0, dur: 1.6, rotate: 6, blur: 0, shake: 0.35 }, markAt: 1.75, headAt: 2.1 },
      { id: 'news-push', name: 'Slow push-in', head: 'Local legend', last: 'legend', mark: 'scribble', caption: 'Small town, big dreams', cam: { move: 'pushin', zoom: 1.7, start: 0, dur: 5, rotate: 3, blur: 0.3, shake: 0.2 }, markAt: 1.4, headAt: 0.3 },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Photo'], width: 1080, height: 1350, video: true,
      build: () => {
        const R2 = -3, red = '#dc2626';
        const filler = 'A random line of text to fill this newspaper, because every page needs a story. This one starts with a photo nobody expected to see again, a date scribbled on the back, and a face that looks a lot like mine. ';
        const col = (x, y, w, h, n) => txt((filler + filler + filler).slice(0, n), { x, y, width: w, autoWidth: false, align: 'left', fontFamily: 'Newsreader', fontSize: 23, lineHeight: 1.22, fill: '#2a2826', rotation: R2, name: 'Column' });
        const markEl = {
          circle: rib('scribble', 105, 350, 430, 470, { key: 'mark', line: true, thickness: 13, color: red, opacity: 0.92, text: '', rotation: R2, anim: { enter: 'draw', delay: v.markAt, speed: 0.75 } }),
          scribble: rib('scribble', 85, 330, 470, 520, { key: 'mark', line: true, thickness: 10, color: red, opacity: 0.9, text: '', rotation: R2 - 4, anim: { enter: 'draw', delay: v.markAt, speed: 0.6 } }),
          arrow: rib('bend', 470, 300, 260, 200, { key: 'mark', line: true, thickness: 11, color: red, text: '', arrowStart: true, rotation: R2 + 8, anim: { enter: 'draw', delay: v.markAt, speed: 0.9 } }),
          tick: rib('tick', 400, 420, 180, 150, { key: 'mark', line: true, thickness: 16, color: red, opacity: 0.92, text: '', rotation: R2, anim: { enter: 'draw', delay: v.markAt, speed: 1 } }),
        }[v.mark];
        return {
          width: 1080, height: 1350,
          background: { color: '#1e1c1a' },
          overlay: { vignette: 45, grain: 18 },
          anim: { duration: 5, fps: 30 },
          camera: Object.assign({ target: 'photo' }, v.cam),
          elements: [
            shp('rect', -90, -70, 1260, 1500, { fill: '#e8e5de', texture: 70, crumple: 24, seed: 3, rotation: R2, name: 'Newspaper' }),
            shp('line', 20, 60, 1060, 20, { stroke: '#1d1b18', strokeWidth: 3, rotation: R2 }),
            txt(v.head, { key: 'head', x: 40, y: 95, align: 'left', fontFamily: 'Libre Caslon Display', fontSize: 150, fill: '#141414', rotation: R2, anim: { enter: 'typewriter', delay: v.headAt, speed: 1.4 } }),
            shp('line', 30, 280, 1060, 20, { stroke: '#1d1b18', strokeWidth: 3, rotation: R2 }),
            rib('swipe', 640, 228, 380, 60, { line: true, thickness: 22, color: red, opacity: 0.88, text: '', rotation: R2, anim: { enter: 'draw', delay: v.headAt + 0.9, speed: 1.2 }, name: 'Marker underline' }),
            img(40, 330, 560, 640, { key: 'photo', rotation: R2, filters: { saturation: -35, contrast: 12, fade: 8, noise: 25 }, placeholder: ['#7b746a', '#3b3631'], name: 'Your photo' }),
            markEl,
            col(640, 330, 390, 640, 520),
            col(40, 1010, 320, 330, 260),
            col(385, 995, 320, 330, 260),
            col(730, 975, 320, 330, 260),
            txt(v.caption, { cx: 540, cy: 1185, fontFamily: 'Inter', fontWeight: 600, fontSize: 36, fill: '#ffffff', shadow: { on: true, color: '#000000', opacity: 0.6, blur: 10, x: 0, y: 2 }, name: 'Caption' }),
          ],
        };
      },
    })),

    // ── VIDEO: typing with a caret, highlighted words and a camera that rides along ──
    ...[
      { id: 'type-follow', name: 'Type & follow', text: 'SHE HELPED CREATE THE TECHNOLOGY WE USE EVERY DAY', marks: ['TECHNOLOGY'], style: 'select', font: 'Archivo', weight: 700, size: 30, ink: '#2b2b2b', bg: { color: '#d8d2c2', pattern: { type: 'graph', color: 'rgba(60,70,90,0.14)', size: 60, thick: 1.2 }, texture: 40, crumple: 18 }, overlay: { grain: 25, vignette: 25 }, cam: { move: 'follow', zoom: 4.2, start: 0.9, dur: 0.45, shake: 0.15, blur: 0.5 }, cx: 540, cy: 675 },
      { id: 'type-marker', name: 'Typed note', text: 'I didn’t plan to start a business.\nI just wanted to make something I loved.', marks: ['something I loved'], style: 'marker', color: '#f6e05e', speed: 1.5, font: 'Instrument Serif', weight: 400, size: 66, ink: '#1d1b18', align: 'left', width: 820, bg: { color: '#f5f1e6', pattern: { type: 'lined', color: 'rgba(70,110,160,0.25)', size: 54, thick: 1.4 }, texture: 45 }, overlay: { grain: 12 }, cam: { move: 'pushin', zoom: 1.35, start: 0, dur: 5, shake: 0.2, blur: 0.2 }, cx: 540, cy: 640 },
      { id: 'type-crash', name: 'Type & crash zoom', text: 'Nobody talks about\nthe quiet part.', marks: ['quiet'], style: 'underline', color: '#ef4444', font: 'Inter', weight: 800, size: 78, ink: '#111111', bg: { color: '#fafafa', texture: 20 }, overlay: { grain: 10 }, cam: { move: 'crash', zoom: 2.6, start: 1.7, dur: 2.4, rotate: 4, blur: 0.8 }, cx: 540, cy: 660 },
      { id: 'type-terminal', name: 'Terminal', text: '> booting creativity…\n> loading ideas: 100%\n> ready to make something new', marks: ['something new'], style: 'select', color: 'rgba(93,255,138,0.25)', handle: '#5dff8a', speed: 1.5, font: 'VT323', weight: 400, size: 62, ink: '#5dff8a', align: 'left', width: 860, bg: { color: '#0b0f0c' }, overlay: { grain: 30, vignette: 45 }, cam: { move: 'drift', zoom: 1.18, rotate: 1, shake: 0.5, blur: 0.3 }, cx: 540, cy: 660 },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Quote'], width: 1080, height: 1350, video: true,
      build: () => ({
        width: 1080, height: 1350,
        background: v.bg, overlay: v.overlay,
        anim: { duration: 5, fps: 30 },
        camera: Object.assign({ target: 'type' }, v.cam),
        elements: [
          txt(v.text, Object.assign({
            key: 'type', cx: v.cx, cy: v.cy, align: v.align || 'center', fontFamily: v.font, fontWeight: v.weight, fontSize: v.size, lineHeight: 1.2, fill: v.ink,
            anim: { enter: 'typewriter', delay: 0.35, speed: v.speed || 1 },
            typing: { caret: true, marks: v.marks, style: v.style, color: v.color, handle: v.handle, caretColor: v.handle },
          }, v.width ? { autoWidth: false, width: v.width } : {})),
        ],
      }),
    })),

    // ── VIDEO: match cut — one word stays put while everything around it changes ──
    ...[
      { id: 'match-highlight', name: 'Keyword match cut', paper: '#ecebe7', crumple: 50, ink: '#2a2a2a', dim: '#6a6a6a', style: 'marker', color: '#f2df45', slot: 0.2, cam: { move: 'jolt', zoom: 1.3, rotate: 2, cut: 0.2, wander: 0, blur: 0.4 } },
      { id: 'match-dark', name: 'Night edition', paper: '#121212', crumple: 0, ink: '#ececec', dim: '#8a8a8a', style: 'marker', color: '#ff4fa3', slot: 0.25, cam: { move: 'pushin', zoom: 1.6, start: 0, dur: 5, shake: 0.4, blur: 0.4 } },
      { id: 'match-news', name: 'Newsprint flicker', paper: '#e8e2d2', crumple: 20, ink: '#1f1c17', dim: '#5e574b', style: 'underline', color: '#d62828', slot: 0.14, serif: true, cam: { move: 'jolt', zoom: 1.45, rotate: 3, cut: 0.14, wander: 0, blur: 0.5, shake: 0.2 } },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Quote'], width: 1080, height: 1350, video: true,
      build: () => {
        const KW = 'motivation';
        const A = [
          ['The Impact of Motivation\non Athletic Performance', 'In this piece, we explore motivation for athletes', 'potential. The discussion covers the different types of', 'Archivo Black', 'Inter'],
          ['Understanding Motivation\nin the Workplace', 'The piece delves into how motivation and habit', 'influence productivity. It also considers how teams', 'Fraunces', 'Newsreader'],
          ['The Role of Motivation\nin Achieving Goals', 'It examines how motivation acts as a quiet engine', 'behind achievement. It discusses the role of habits', 'Space Grotesk', 'DM Sans'],
          ['Motivation and Learning:\nWhat Really Works', 'A closer look at intrinsic motivation in education', 'explores the concept of curiosity and its effect on', 'Newsreader', 'Instrument Sans'],
          ['Why Motivation Fades\n(and How to Keep It)', 'Research shows motivation is less about willpower', 'and more about small, repeatable systems that make', 'Bricolage Grotesque', 'Space Grotesk'],
          ['Finding Motivation\nin Hard Seasons', 'Small wins build motivation in ways that last', 'longer than any pep talk. The article highlights practical', 'DM Serif Display', 'Fraunces'],
        ];
        const body = 'resilience and focus over time. It also covers the psychological strategies coaches use to boost confidence, and the importance of rest in sustaining performance. Recent studies suggest that steady routines matter more than bursts of energy, especially when the goal is far away.';
        const els = [];
        A.forEach(([title, line, after, tf, bf], i) => {
          const time = { start: 0, cycle: { slot: v.slot, index: i, count: A.length } };
          const f = v.serif ? ['Newsreader', 'Newsreader'] : [tf, bf];
          els.push(
            txt('Home / Articles', { x: 60, y: 300, align: 'left', fontFamily: f[1], fontWeight: 500, fontSize: 30, fill: v.dim, time, lblur: { motion: 10 } }),
            txt(title, { x: 60, y: 360, align: 'left', fontFamily: f[0], fontWeight: f[0] === 'Fraunces' || f[0] === 'Newsreader' ? 700 : f[0] === 'Bricolage Grotesque' ? 800 : f[0] === 'Space Grotesk' ? 700 : 400, fontSize: 60, lineHeight: 1.05, fill: v.ink, time, lblur: { motion: 7 } }),
            txt(line, { cx: 540, cy: 675, autoWidth: false, width: 2400, align: 'center', anchor: KW, fontFamily: f[1], fontWeight: 600, fontSize: 48, fill: v.ink, time, typing: { caret: false, blink: false, marks: [KW], style: v.style, color: v.color }, name: 'Keyword line' }),
            txt(after, { cx: 540, cy: 745, autoWidth: false, width: 2400, align: 'center', fontFamily: f[1], fontWeight: 500, fontSize: 44, fill: v.ink, time, lblur: { motion: 5 } }),
            txt(body, { x: -40, y: 790, autoWidth: false, width: 1160, align: 'left', fontFamily: f[1], fontWeight: 500, fontSize: 40, lineHeight: 1.3, fill: v.dim, time, lblur: { motion: 16, gauss: 1.5 } }),
          );
        });
        return {
          width: 1080, height: 1350,
          background: { color: v.paper, crumple: v.crumple, crumpleSeed: 8, texture: v.crumple ? 25 : 0 },
          overlay: { vignette: 38, grain: 20 },
          anim: { duration: 5, fps: 30 },
          camera: v.cam,
          elements: els,
        };
      },
    })),

    // ── TEXT SLIDES: typographic quote posters, one idea per slide ──
    ...(() => {
      const W = 1080, H = 1350;
      // left / right anchored lines without measuring: a full-width box aligned to one side
      const L = (t, x, y, o) => txt(t, Object.assign({ x, y, align: 'left' }, o));
      const Rt = (t, right, y, o) => txt(t, Object.assign({ x: 60, y, autoWidth: false, width: right - 60, align: 'right' }, o));
      const C = (t, cy, o) => txt(t, Object.assign({ cx: W / 2, cy, align: 'center' }, o));
      const chip = (asset, x, y, w, h, o = {}) => img(x, y, w, h, Object.assign({ assetId: 'img-' + asset, placeholder: ['#9a9a9a', '#5a5a5a'], name: 'Photo chip — replace with yours' }, o));
      const helv = (size, o) => Object.assign({ fontFamily: 'Inter', fontWeight: 500, fontSize: size, letterSpacing: -0.055, lineHeight: 0.98, fill: '#ffffff' }, o);
      const heavy = (size, o) => Object.assign({ fontFamily: 'Archivo Black', fontSize: size, letterSpacing: -0.02, lineHeight: 1, fill: '#111111' }, o);
      const paperTex = { texture: 40 };
      const slides = [
        { id: 'ts-created', name: 'I was created', bg: { color: '#2a14c8' }, els: () => [
          L('i', 120, 380, helv(160)), L('was', 300, 380, helv(160)), L('created', 430, 540, helv(160)), L('to', 300, 700, helv(160)), L('create.', 150, 860, helv(160)),
        ] },
        { id: 'ts-goal', name: 'Goal: make art', bg: { color: '#2a14c8' }, els: () => [
          L('goal:', 130, 330, helv(118)), L('make   art,', 300, 560, helv(118)), L('be   hot.', 130, 680, helv(118)),
        ] },
        { id: 'ts-earth', name: 'Earth without art', bg: { color: '#efefed' }, els: () => [
          L('EARTH', 90, 360, heavy(130)), chip('rise1', 600, 380, 390, 104),
          shp('burst', 92, 528, 104, 104, { fill: '#1b9a3c', points: 16, inner: 0.62 }), L('WITHOUT', 210, 500, heavy(130)),
          L('‘ART’', 90, 640, heavy(130)), chip('fight3', 455, 660, 340, 104, { filters: { contrast: 20, saturation: 30 } }), Rt('IS', 990, 640, heavy(130)),
          L('JUST', 90, 780, heavy(130)), chip('drive6', 480, 800, 210, 104), Rt('‘EH’', 990, 780, heavy(130)),
          L('YourStudio', 90, 1220, { fontFamily: 'Inter', fontWeight: 700, fontSize: 22, fill: '#111111' }),
        ] },
        { id: 'ts-crisis', name: 'Creative crisis', bg: { color: '#0b62de' }, els: () => [
          L('behind every\nbeautiful design\nthere’s a creative\ncrisis at 2 a.m.', 80, 440, { fontFamily: 'Inter', fontWeight: 600, fontSize: 80, lineHeight: 1.04, letterSpacing: -0.03, fill: '#d6f53c' }),
          C('@yourstudio', 1190, { fontFamily: 'Inter', fontWeight: 500, fontSize: 26, fill: '#d6f53c' }),
        ] },
        { id: 'ts-brands', name: 'Speak to someone', bg: { color: '#8c8c8c', color2: '#262626', gradient: 'linear', angle: 180, texture: 30 }, overlay: { grain: 45, vignette: 40 }, els: () => [
          shp('rect', 536, 0, 6, H, { fill: '#1b1b1b', opacity: 0.85, name: 'Door gap' }),
          shp('rect', 260, 380, 560, 580, { fill: '#0a22d6', texture: 20 }),
          C('THE  BEST  BRANDS  DON’T\nSPEAK TO EVERYONE.\nTHEY SPEAK TO SOMEONE', 650, { fontFamily: 'Archivo', fontWeight: 700, fontSize: 34, letterSpacing: 0.1, lineHeight: 1.3, fill: '#ffffff', align: 'left' }),
        ] },
        { id: 'ts-made', name: 'Made to create', bg: { color: '#1335ff', texture: 20 }, overlay: { grain: 40 }, els: () => [
          shp('burst', 110, 470, 860, 520, { fill: '#efe6cf', points: 13, inner: 0.72, rotation: -8, texture: 40 }),
          C('you were made\nto create.', 735, { fontFamily: 'Archivo', fontWeight: 800, fontSize: 84, lineHeight: 0.98, letterSpacing: -0.02, fill: '#111111', rotation: -6 }),
          ribbon('scurve', 130, 220, 120, 160, '#a8b6ff'), ribbon('swoosh', 760, 1080, 160, 90, '#a8b6ff'),
        ] },
        { id: 'ts-align', name: 'Art needs alignment', bg: { color: '#b9f02a' }, els: () => [
          L('Art\nneeds\nalignment.', 90, 440, { fontFamily: 'Archivo Black', fontSize: 150, lineHeight: 0.95, letterSpacing: -0.03, fill: '#111111' }),
          shp('rect', 930, 1190, 70, 80, { fill: 'transparent', stroke: '#111111', strokeWidth: 3, name: 'Logo box' }),
          C('K S', 1230, { cx: 965, fontFamily: 'Archivo', fontWeight: 700, fontSize: 24, fill: '#111111' }),
        ] },
        { id: 'ts-dress', name: 'Dress well, stay weird', bg: { color: '#2c12d6' }, els: () => [
          L('dress', 80, 360, helv(118)), chip('fight3', 360, 384, 140, 100), L('well', 520, 360, helv(118)),
          chip('play2', 80, 504, 150, 100), L('stay weird', 250, 480, helv(118)),
          L('make', 140, 600, helv(118)), chip('run4', 430, 624, 150, 100), L('art', 600, 600, helv(118)),
          chip('drive5', 80, 744, 210, 100), L('confuse', 310, 720, helv(118)),
          chip('gym3', 120, 864, 130, 100), chip('play4', 265, 864, 130, 100), L('people', 420, 840, helv(118)),
        ] },
        { id: 'ts-meant', name: 'Meant to create', bg: { color: '#1f5fa6', texture: 70, crumple: 30, crumpleSeed: 3 }, overlay: { grain: 30 }, els: () => [
          L('YOU ARE', 80, 300, heavy(78, { fill: '#ffffff', letterSpacing: -0.05 })), Rt('MEANT TO', 980, 460, heavy(78, { fill: '#ffffff', letterSpacing: -0.05 })),
          L('CREATE', 120, 620, heavy(78, { fill: '#ffffff', letterSpacing: -0.05 })), Rt('BEAUTIFUL', 940, 780, heavy(78, { fill: '#ffffff', letterSpacing: -0.05 })),
          L('THINGS.', 180, 940, heavy(78, { fill: '#ffffff', letterSpacing: -0.05 })),
          C('@YOURSTUDIO', 1240, { fontFamily: 'Archivo', fontWeight: 800, fontSize: 24, fill: '#ffffff' }),
        ] },
        { id: 'ts-new', name: 'It’s just new', bg: Object.assign({ color: '#ece6dc', pattern: { type: 'lined', color: 'rgba(0,0,0,0.05)', size: 40, color2: 'rgba(0,0,0,0)' } }, paperTex), els: () => [
          L('REMINDERS FOR YOU', 60, 60, { fontFamily: 'Inter', fontWeight: 600, fontSize: 18, letterSpacing: 0.12, fill: '#d8352a' }),
          Rt('+ FOR ME', 1020, 60, { fontFamily: 'Inter', fontWeight: 600, fontSize: 18, letterSpacing: 0.12, fill: '#d8352a' }),
          L('it’s not\nhard,', 60, 300, helv(160, { fill: '#d8352a' })), Rt('it’s just', 1020, 640, helv(160, { fill: '#d8352a' })), L('new.', 60, 800, helv(160, { fill: '#d8352a' })),
          L('+5', 60, 1280, { fontFamily: 'Inter', fontWeight: 600, fontSize: 18, fill: '#d8352a' }), Rt('@YOURSTUDIO', 1020, 1280, { fontFamily: 'Inter', fontWeight: 600, fontSize: 18, letterSpacing: 0.12, fill: '#d8352a' }),
        ] },
        { id: 'ts-visuals', name: 'Bare minimum', bg: { color: '#173c86', texture: 50 }, overlay: { grain: 35 }, els: () => {
          const ink = '#efe8b4', f = (sz, o) => Object.assign({ fontFamily: 'Inter', fontWeight: 600, fontSize: sz, letterSpacing: -0.04, fill: ink }, o);
          return [
            Rt('AESTHETIC “AND”', 1020, 70, f(20, { letterSpacing: 0.12, fontWeight: 500 })),
            L('good visuals', 230, 380, f(80)), L('are the', 150, 470, f(80)), L('[ bare minimum ]', 470, 478, f(34, { fontWeight: 500, letterSpacing: 0 })),
            L('to get someone', 300, 550, f(80)), L('to pay', 150, 630, f(80)), L('attention.', 360, 710, f(80)),
            C('but the list on the last slide are\nthe decisions that actually influence how\nsomeone reacts once they’re there.', 920, f(26, { fontWeight: 500, letterSpacing: 0, lineHeight: 1.35 })),
            L(':)', 1000, 1270, f(20)),
          ];
        } },
        { id: 'ts-average', name: 'Fear of being average', bg: { color: '#f21616' }, els: () => [
          C('INSPIRED\nBY THE\nFEAR\nOF BEING\nAVERAGE', 660, heavy(132, { lineHeight: 1.0 })),
        ] },
        { id: 'ts-cool', name: 'Wait, I’m cool', bg: { color: '#0a2df0' }, els: () => [
          L('wait, I’m cool\nactually.', 80, 870, { fontFamily: 'Inter', fontWeight: 700, fontSize: 92, lineHeight: 0.95, letterSpacing: -0.04, fill: '#ffffff' }),
        ] },
        { id: 'ts-iamart', name: 'I am art', bg: { color: '#c4c4c2', color2: '#8e8e8c', gradient: 'radial' }, overlay: { grain: 30 }, els: () => [
          C('I AM ART', 675, { fontFamily: 'Anton', fontSize: 300, letterSpacing: -0.03, fill: '#111111', lblur: { motion: 6, angle: 90 } }),
          C('I am art', 680, { fontFamily: 'Inter', fontWeight: 600, fontSize: 72, fill: '#ffffff', shadow: { on: true, color: '#000000', opacity: 0.35, blur: 12, x: 0, y: 2 } }),
        ] },
        { id: 'ts-redact', name: 'Make it simple', bg: Object.assign({ color: '#f2f0eb' }, paperTex), els: () => {
          const lines = [
            'Explaining too much kills the idea before it', 'gets a chance to breathe. Every extra word is', 'a decision you didn’t want to make, another',
            'layer between the feeling and the person you', 'want to reach. Say less. Cut the safe parts,', 'the clever parts, the parts that only exist to',
            'prove how hard you worked. The work should', 'speak before you do, and it should be clear.', 'So when in doubt:',
            'strip it back until only the point is left.', 'Then go one step further. Delete the line', 'you love the most and see if it still works.',
            'It usually does. Clarity is a kind of kindness.', 'Nobody remembers the paragraph, only the', 'moment it finally clicked for them.',
          ];
          const keep = 8, phrase = ' Make it simple.';
          const f = { fontFamily: 'Inter', fontWeight: 400, fontSize: 42, lineHeight: 1.42, letterSpacing: -0.01, align: 'left' };
          const body = lines.map((l, i) => (i === keep ? l + phrase : l)).join('\n');
          return [
            L(body, 70, 130, Object.assign({ fill: '#1a1a1a', name: 'Paragraph' }, f)),
            L(lines.join('\n'), 70, 130, Object.assign({ fill: 'rgba(0,0,0,0)', bg: { style: 'marker', color: '#e8261c', padX: 6, padY: 0, gap: 0 }, opacity: 0.92, name: 'Red marker (edit to match the paragraph)' }, f, { opacity: 1 })),
          ];
        } },
        { id: 'ts-rest', name: 'Real rest', bg: { color: '#0b3ea8' }, els: () => [
          C('~', 120, { fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 30, fill: '#ffffff' }),
          C('REAL CREATIVE WORK INCLUDES\nREAL REST.\n\nGO RECHARGE -\nYOUR ART WILL THANK YOU.', 640, { fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 32, letterSpacing: 0.04, lineHeight: 1.35, fill: '#ffffff' }),
          C('YOUR NAME', 1270, { fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 16, letterSpacing: 0.1, fill: 'rgba(255,255,255,0.7)' }),
        ] },
        { id: 'ts-chase', name: 'Chase it', bg: { color: '#4b6b2a' }, overlay: { grain: 25, vignette: 30 }, els: () => {
          const words = ['THAT', 'DREAM', 'WAS', 'PLANTED', 'IN', 'YOUR', 'HEART', 'FOR', 'A', 'REASON.', 'CHASE', 'IT.'];
          const f = { fontFamily: 'Inter', fontWeight: 700, fontSize: 24, letterSpacing: 0.06, fill: '#ffffff', shadow: { on: true, color: '#000000', opacity: 0.35, blur: 6, x: 0, y: 1 } };
          return [img(0, 0, W, H, { assetId: 'img-rise3', placeholder: ['#6f8f3a', '#2c4214'], filters: { contrast: 8, saturation: -10 }, name: 'Background photo — replace with yours' }),
            ...words.map((w, i) => txt(w, Object.assign({ cx: 150 + (i % 4) * 260, cy: 500 + Math.floor(i / 4) * 90 }, f)))];
        } },
        { id: 'ts-chapter', name: 'Chapter one', bg: { color: '#e8231c' }, els: () => {
          const hl = (sz) => ({ fontFamily: 'Inter', fontWeight: 600, fontSize: sz * 1.3, letterSpacing: -0.02, lineHeight: 1.12, fill: '#111111', bg: { style: 'lines', color: '#d8d8d8', padX: 8, padY: 2, radius: 0 } });
          return [L('(Chapter : 1)', 50, 60, hl(60)), L('A river never flows\nbackwards.', 50, 1080, hl(62))];
        } },
        { id: 'ts-do', name: 'Do.', bg: { color: '#c4121a', texture: 70, crumple: 35, crumpleSeed: 8 }, overlay: { grain: 30, vignette: 25 }, els: () => [
          shp('rect', 300, 610, 480, 130, { fill: '#e2453f', opacity: 0.8, rotation: -3, texture: 40, name: 'Tape' }),
          C('Do.', 675, { fontFamily: 'Inter', fontWeight: 800, fontSize: 96, letterSpacing: -0.05, fill: '#111111' }),
        ] },
        { id: 'ts-action', name: 'Less words, more action', bg: { color: '#e9e9ec' }, overlay: { grain: 25 }, els: () => {
          const a = cy => C('action', cy, { fontFamily: 'Inter', fontWeight: 700, fontSize: 230, letterSpacing: -0.05, fill: '#2f56f0', lblur: { gauss: 3.5 } });
          return [a(200), a(470), a(740), a(1010), a(1280),
            L('Less words,', 70, 590, { fontFamily: 'Inter', fontWeight: 600, fontSize: 46, letterSpacing: -0.03, fill: '#111111' }),
            Rt('more action.', 1010, 860, { fontFamily: 'Inter', fontWeight: 600, fontSize: 46, letterSpacing: -0.03, fill: '#111111' })];
        } },
        { id: 'ts-where', name: 'Where do I go', bg: { color: '#d8b50e' }, els: () => [
          img(240, 330, 600, 640, { assetId: 'demo-mindset', placeholder: ['#1a2fb0', '#0b1460'], filters: { duotone: true, duoDark: '#08156e', duoLight: '#e2363a', contrast: 25 }, crop: { zoom: 2.2, x: 0.62, y: 0.42 }, name: 'Photo — replace with yours' }),
          L('Where do\nI go from\nhere?', 70, 80, { fontFamily: 'Inter', fontWeight: 600, fontSize: 80, lineHeight: 0.95, letterSpacing: -0.04, fill: '#1e3fd8' }),
          Rt('Where do\nI go from\nhere?', 1010, 1010, { fontFamily: 'Inter', fontWeight: 600, fontSize: 80, lineHeight: 0.95, letterSpacing: -0.04, fill: '#ffffff' }),
        ] },
        { id: 'ts-norest', name: 'No rest for the creative', bg: Object.assign({ color: '#e7e4dd' }, paperTex), overlay: { grain: 30 }, els: () => [
          L('co.untitled', 70, 60, { fontFamily: 'Inter', fontWeight: 500, fontSize: 22, fill: '#444444' }),
          img(200, 280, 680, 680, { assetId: 'demo-premium', frame: { style: 'star', size: 0 }, filters: { duotone: true, duoDark: '#0a4fc0', duoLight: '#a6dcff', contrast: 15 }, crop: { zoom: 2.4, x: 0.5, y: 0.35 }, rotation: -8, name: 'Star photo — replace with yours' }),
          C('no rest', 260, { fontFamily: 'Inter', fontWeight: 700, fontSize: 200, letterSpacing: -0.07, fill: '#111111' }),
          C('for the', 950, { fontFamily: 'Inter', fontWeight: 700, fontSize: 200, letterSpacing: -0.07, fill: '#111111' }),
          C('creative', 1140, { fontFamily: 'Inter', fontWeight: 700, fontSize: 200, letterSpacing: -0.07, fill: '#111111' }),
        ] },
        { id: 'ts-scribble', name: 'Too many thoughts', bg: { color: '#fbfbfd', pattern: { type: 'scribble', color: '#2b3fe0', size: 120, thick: 2.2, opacity: 0.95 } }, els: () => [
          C('too many thoughts', 675, { fontFamily: 'Inter', fontWeight: 700, fontSize: 64, letterSpacing: -0.03, fill: '#2b3fe0', bg: { style: 'box', color: '#ffffff', padX: 30, padY: 16, radius: 0 } }),
        ] },
        { id: 'ts-feeling', name: 'Sell the feeling', bg: { color: '#f1efea' }, els: () => [
          img(130, 330, 820, 560, { assetId: 'img-rise2', placeholder: ['#3a6a7a', '#163844'], filters: { duotone: true, duoDark: '#10313f', duoLight: '#9cc7c9', contrast: 10 }, name: 'Photo — replace with yours' }),
          L('Sell The', 70, 90, { fontFamily: 'Inter', fontWeight: 700, fontSize: 120, letterSpacing: -0.05, fill: '#111111' }),
          L('Feeling', 50, 205, { fontFamily: 'Inter', fontWeight: 700, fontSize: 250, letterSpacing: -0.06, fill: '#f05a22', opacity: 0.92 }),
          L('Not The\nFeature!', 70, 930, { fontFamily: 'Inter', fontWeight: 700, fontSize: 125, lineHeight: 0.92, letterSpacing: -0.05, fill: '#111111' }),
          L('Sell the Feeling', 70, 1265, { fontFamily: 'Inter', fontWeight: 600, fontSize: 18, fill: '#111111' }),
          L('@yourbrand', 520, 1265, { fontFamily: 'Inter', fontWeight: 600, fontSize: 18, fill: '#111111' }),
          L('*', 980, 1240, { fontFamily: 'Inter', fontWeight: 800, fontSize: 60, fill: '#f05a22' }),
        ] },
        { id: 'ts-museum', name: 'Museum of failure', bg: { color: '#efefed' }, els: () => [
          C('museum   of   failure\nor gallery of trying?', 675, { fontFamily: 'Inter', fontWeight: 500, fontSize: 54, lineHeight: 1.35, letterSpacing: -0.03, fill: '#111111' }),
        ] },
        { id: 'ts-story', name: 'Tell a story', bg: Object.assign({ color: '#e9e3d9' }, paperTex), els: () => [
          Rt('MS', 1010, 70, { fontFamily: 'Instrument Serif', fontSize: 44, fill: '#9c2a24' }),
          L('Let your visuals', 140, 560, { fontFamily: 'Instrument Serif', fontSize: 110, letterSpacing: -0.02, fill: '#9c2a24' }),
          L('tell a', 140, 680, { fontFamily: 'Instrument Serif', fontSize: 110, letterSpacing: -0.02, fill: '#9c2a24' }),
          L('story.', 340, 680, { fontFamily: 'Instrument Serif', italic: true, fontSize: 110, letterSpacing: -0.02, fill: '#9c2a24' }),
          L('YOUR NAME  |  SOCIAL MEDIA & MARKETING', 80, 1240, { fontFamily: 'Inter', fontWeight: 600, fontSize: 16, letterSpacing: 0.08, fill: '#9c2a24' }),
          Rt('→', 1000, 1228, { fontFamily: 'Inter', fontWeight: 500, fontSize: 34, fill: '#9c2a24' }),
        ] },
        { id: 'ts-justdo', name: 'Just do creative stuff', bg: { color: '#ef4a14', texture: 25 }, overlay: { grain: 25 }, els: () => [
          C('just do\nsome\ncreative\nstuff', 675, { fontFamily: 'Oswald', fontWeight: 700, fontSize: 210, lineHeight: 0.7, letterSpacing: -0.04, fill: '#2f4cf0' }),
        ] },
        { id: 'ts-notend', name: 'Not the end', bg: { color: '#1747e8', texture: 45 }, overlay: { grain: 55 }, els: () => {
          const t = (s, x, y) => L(s, x, y, heavy(140, { fill: '#f2f2ff' }));
          const blue = { duotone: true, duoDark: '#0a2a9a', duoLight: '#cfe0ff', contrast: 15 };
          return [
            t('THIS', 70, 200), chip('rise1', 470, 222, 330, 112, { filters: blue }),
            t('IS NOT', 70, 350), chip('drive6', 625, 372, 150, 112, { filters: blue }),
            t('THE END', 70, 500),
            chip('rise3', 70, 672, 440, 112, { filters: blue }), t('OF', 530, 650),
            chip('drive5', 70, 822, 300, 112, { filters: blue }), t('YOUR', 390, 800),
            chip('rise2', 70, 972, 110, 112, { filters: blue }), t('STORY', 200, 950),
            L('YOUR NAME  |  BRAND', 70, 1240, { fontFamily: 'Inter', fontWeight: 600, fontSize: 18, letterSpacing: 0.1, fill: '#dfe6ff' }),
          ];
        } },
        { id: 'ts-consume', name: 'Create more, consume less', bg: { color: '#050505' }, overlay: { grain: 30 }, els: () => {
          const f = { fontFamily: 'Archivo Black', fontSize: 104, lineHeight: 0.98, letterSpacing: -0.04, fill: '#f2f2f2', bg: { style: 'lines', color: '#2f6fd8', padX: 10, padY: 0, radius: 0 } };
          return [shp('rect', 150, 300, 780, 760, { fill: '#1b1d22', texture: 35, name: 'Panel' }),
            L('CREATE\nMORE.', 200, 400, f), L('CONSUME\nLESS.', 200, 720, f)];
        } },
        { id: 'ts-love', name: 'Love people', bg: { color: '#1f3a7c', texture: 40 }, overlay: { grain: 30 }, els: () => [
          C('LOVE LIFE\nLOVE PEOPLE', 675, { fontFamily: 'Anton', fontSize: 130, lineHeight: 0.95, letterSpacing: -0.02, fill: '#cfdc58' }),
        ] },
        { id: 'ts-now', name: 'If not now, when?', bg: { color: '#ededeb' }, els: () => [
          L('if not\nnow,\nwhen?', 120, 400, { fontFamily: 'Archivo', fontWeight: 800, fontSize: 160, lineHeight: 0.9, letterSpacing: -0.04, fill: '#0d6b2f' }),
        ] },
        { id: 'ts-austen', name: 'Quote silhouette', bg: { color: '#ffffff' }, els: () => {
          const q = 'I cannot fix on the hour, or the spot, or the look or the words, which laid the foundation. It is too long ago. I was in the middle before I knew that I had begun.';
          const mono = (sz, o) => Object.assign({ fontFamily: 'Courier Prime', fontSize: sz, lineHeight: 1.6, fill: '#ffffff', align: 'left', autoWidth: false }, o);
          return [
            shp('rect', 540, 0, 540, H, { fill: '#0a1ff0', name: 'Blue panel' }),
            shp('person', 40, 170, 460, 1180, { fill: '#0a1ff0', name: 'Silhouette' }),
            txt(q + ' ' + q, mono(20, { x: 130, y: 470, width: 280, opacity: 0.85, name: 'Words inside the silhouette' })),
            txt(q + '\n\nJane Austen, Pride\nand Prejudice', mono(34, { x: 590, y: 90, width: 440 })),
          ];
        } },
        { id: 'ts-son', name: 'Son of a dreamer', bg: { color: '#b5121b', texture: 55 }, overlay: { grain: 30, vignette: 35 }, els: () => [
          C('SON OF A', 330, { fontFamily: 'Playfair Display', fontWeight: 800, fontSize: 200, fill: '#cf2530', shadow: { on: true, color: '#4a0005', opacity: 0.6, blur: 5, x: 0, y: 5 } }),
          C('DREAMER', 1010, { fontFamily: 'Playfair Display', fontWeight: 800, fontSize: 200, fill: '#cf2530', shadow: { on: true, color: '#4a0005', opacity: 0.6, blur: 5, x: 0, y: 5 } }),
          img(310, 400, 460, 560, { assetId: 'demo-grind', placeholder: ['#7a1018', '#2a0306'], filters: { duotone: true, duoDark: '#1c0204', duoLight: '#f2b2a4', contrast: 18 }, crop: { zoom: 1.5, x: 0.5, y: 0.2 }, shadow: { on: true, color: '#000000', opacity: 0.4, blur: 30, x: 0, y: 14 }, name: 'Portrait — replace with yours' }),
        ] },
        { id: 'ts-sleep', name: 'Creative people never sleep', bg: { color: '#6e98ee' }, els: () => [
          C('Creative People', 620, { fontFamily: 'Instrument Serif', fontSize: 124, letterSpacing: -0.02, fill: '#f6f08c' }),
          C('Never Sleep', 745, { fontFamily: 'Instrument Serif', italic: true, fontSize: 124, letterSpacing: -0.02, fill: '#f6f08c' }),
        ] },
        // ── second board ──
        { id: 'ts-laziest', name: 'The laziest designer', bg: { color: '#f4f4f2' }, els: () => [
          shp('rect', 150, 190, 780, 880, { fill: 'rgba(0,0,0,0)', stroke: '#9db0ff', strokeWidth: 3, name: 'Frame' }),
          C('the laziest\ndesigner\nalways\nwins', 590, { fontFamily: 'Roboto Condensed', fontWeight: 500, fontSize: 150, lineHeight: 0.92, letterSpacing: -0.03, fill: '#ffffff', bg: { style: 'lines', color: '#0a0a0a', padX: 16, padY: 4, gap: 0, radius: 0 } }),
          C('BEING THE ONE FREELANCER\nWHO OUTSMARTS THE REST.', 1170, { fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 22, lineHeight: 1.3, letterSpacing: 0.04, fill: '#222222' }),
        ] },
        { id: 'ts-gofor', name: 'Go for it', bg: { color: '#1f6fe0', texture: 60 }, overlay: { grain: 40 }, els: () => [
          L('GO\nFOR\nIT', 50, 90, { fontFamily: 'Archivo Black', fontSize: 380, lineHeight: 0.8, letterSpacing: -0.05, fill: '#f7a21b', stroke: { width: 6, color: '#c4410a' }, shadow: { on: true, color: '#ff4d00', opacity: 0.85, blur: 26, x: 0, y: 0 } }),
          Rt('TAKE\nTHE\nRISK', 1015, 80, { fontFamily: 'Inter Tight', fontWeight: 800, fontSize: 42, lineHeight: 0.95, letterSpacing: -0.02, fill: '#ffffff' }),
          L('OR\nMISS\nTHE\nCHANCE', 60, 1050, { fontFamily: 'Inter Tight', fontWeight: 800, fontSize: 42, lineHeight: 0.95, letterSpacing: -0.02, fill: '#ffffff' }),
          L('04 SEPT 2026        YOUR NAME        @yourdesign', 60, 1300, { fontFamily: 'Inter', fontWeight: 600, fontSize: 15, fill: '#e8eeff' }),
        ] },
        { id: 'ts-normalize', name: 'Things we should normalize', bg: { color: '#1230f2' }, els: () => {
          const sm = { fontFamily: 'Inter', fontWeight: 500, fontSize: 22, fill: '#ffffff' };
          return [L('we should', 60, 60, sm), Rt('normalize', 1020, 60, sm),
            L('Things\nWe\nShould\nNormalize', 60, 360, { fontFamily: 'Inter Tight', fontWeight: 700, fontSize: 170, lineHeight: 0.88, letterSpacing: -0.045, fill: '#ffffff' }),
            stk('px-cursor', 690, 330, 230, 300, { name: 'Pixel cursor' }),
            L('Designer’s side\nat Marketing Agency', 60, 1060, { fontFamily: 'Inter', fontWeight: 400, fontSize: 48, lineHeight: 1.08, letterSpacing: -0.02, fill: '#ffffff' }),
            L('sharing as a designer', 60, 1280, sm), Rt('at marketing agency', 1020, 1280, sm)];
        } },
        { id: 'ts-purpose', name: 'The purpose of life', bg: { color: '#2a10c4' }, els: () => [
          C('the   purpose\nof  life  is  to\nexperience', 640, { fontFamily: 'Arimo', fontWeight: 400, fontSize: 110, lineHeight: 0.95, letterSpacing: 0.01, fill: '#ffffff', align: 'left' }),
        ] },
        { id: 'ts-passion', name: 'Graphic design is my passion', bg: { color: '#7cc11d' }, els: () => [
          C('graphic design\nis my passion', 600, { fontFamily: 'Archivo Narrow', fontWeight: 400, fontSize: 180, lineHeight: 1.0, letterSpacing: -0.015, fill: '#0e0e0e' }),
          C('@yourname', 1080, { fontFamily: 'Arimo', fontWeight: 400, fontSize: 22, fill: '#0e0e0e' }),
        ] },
        { id: 'ts-artflip', name: 'AЯT', bg: { color: '#e6e6e6' }, els: () => [
          C('AЯT', 675, { fontFamily: 'Inter', fontWeight: 900, fontSize: 250, letterSpacing: -0.05, fill: '#1d36d6' }),
        ] },
        { id: 'ts-exactly', name: 'Exactly where you need to be', bg: { color: '#1f6be8', texture: 60 }, overlay: { grain: 35 }, els: () => [
          C('YOU ARE\nEXACTLY\nWHERE\nYOU\nNEED\nTO\nBE', 660, { fontFamily: 'Archivo Black', fontSize: 190, lineHeight: 0.8, letterSpacing: -0.05, fill: '#eef3ff' }),
          stk('push-pin', 330, 170, 440, 560, { rotation: -14, name: 'Push pin' }),
          L('30 AUG 2026        YOUR NAME        @yourdesign', 60, 1300, { fontFamily: 'Inter', fontWeight: 600, fontSize: 15, fill: '#e8eeff' }),
        ] },
        { id: 'ts-identity', name: 'Identity outside my art', bg: { color: '#f7f7f7' }, els: () => {
          const w = { fontFamily: 'Inter', fill: '#ffffff' };
          return [
            shp('rect', 0, 0, W, 150, { fill: '#0b0b0b', name: 'Post header' }),
            shp('ellipse', 40, 38, 76, 76, { fill: '#c98a5a', name: 'Avatar' }),
            L('yourname  ✓', 136, 40, Object.assign({ fontWeight: 700, fontSize: 30 }, w)), L('♫  Artist · Song', 136, 82, Object.assign({ fontWeight: 400, fontSize: 24 }, w)),
            Rt('···', 1030, 44, Object.assign({ fontWeight: 700, fontSize: 34 }, w)),
            Rt('10/11', 1030, 190, { fontFamily: 'Inter', fontWeight: 600, fontSize: 20, fill: '#ffffff', bg: { style: 'pill', color: '#8a8a8a', padX: 14, padY: 6 } }),
            img(220, 470, 620, 430, { assetId: 'img-mirror', placeholder: ['#7a8a6a', '#2a3324'], name: 'Photo — replace with yours' }),
            L('do I\nhave an\nidentity\noutside\nof my\nart?', 80, 200, { fontFamily: 'Inter', fontWeight: 400, fontSize: 110, lineHeight: 1.0, letterSpacing: -0.02, fill: '#ea8bb0' }),
            L('idk sometimes I feel like\nthe only updates I tell friends\nand family are work related.\nbut then that’s also what I enjoy\ndoing.', 600, 960, { fontFamily: 'Inter', fontWeight: 400, fontSize: 24, lineHeight: 1.2, fill: '#111111' }),
            shp('rect', 0, 1230, W, 120, { fill: '#0b0b0b', name: 'Post footer' }),
            L('♡  2,996      ◯  169      ⟳  126      ▽  386', 50, 1268, Object.assign({ fontWeight: 500, fontSize: 28 }, w)),
            Rt('▯', 1030, 1262, Object.assign({ fontWeight: 500, fontSize: 34 }, w)),
          ];
        } },
        { id: 'ts-ability', name: 'The ability to look deeply', bg: { color: '#e4e4e8' }, els: () => {
          const pill = (t, x) => L(t, x, 1268, { fontFamily: 'Inter', fontWeight: 600, fontSize: 13, letterSpacing: 0.06, fill: '#1a2fd6', bg: { style: 'pill', color: 'rgba(0,0,0,0)', padX: 12, padY: 5, borderWidth: 1.5, borderColor: '#1a2fd6' } });
          return [
            Rt('⊝⊝', 1020, 60, { fontFamily: 'Inter', fontWeight: 600, fontSize: 30, fill: '#1a2fd6' }),
            C('THE ABILITY TO\nLOOK DEEPLY IS\nTHE ROOT OF\nCREATIVITY', 560, { fontFamily: 'Covered By Your Grace', fontSize: 150, lineHeight: 1.05, fill: '#1a2fd6' }),
            C('RICK RUBIN', 905, { fontFamily: 'Inter', fontWeight: 800, fontSize: 18, letterSpacing: 0.04, fill: '#1a2fd6' }),
            L('YOUR NAME', 60, 1270, { fontFamily: 'Inter', fontWeight: 700, fontSize: 14, fill: '#1a2fd6' }),
            pill('BRANDING', 360), pill('ART DIRECTION', 500), pill('STRATEGY & DESIGN', 680), pill('PITCH DECKS', 892),
          ];
        } },
        { id: 'ts-tryagain', name: 'Try again', bg: { color: '#cfcac2', texture: 55 }, overlay: { grain: 35 }, els: () => {
          const rows = ['TRY AGAIN', 'AND AGAIN', 'AND AGAIN', 'AND AGAIN', 'AND AGAIN', 'AND AGAIN', 'AND AGAIN', 'AND AGAIN'];
          return [
            ...rows.map((r, i) => L(r, -20, 40 + i * 150, { fontFamily: 'Archivo Black', fontSize: 150, letterSpacing: -0.03, fill: '#151515', lblur: { motion: 8, angle: 0 } })),
            shp('blob', 180, 330, 740, 700, { fill: '#ffd23a', fill2: '#e4370d', gradient: 'radial', stroke: '#2a0e04', strokeWidth: 16, seed: 4, texture: 25, shadow: { on: true, color: '#2a0e04', opacity: 0.7, blur: 30, x: 0, y: 0 }, name: 'Burnt hole' }),
            C('TRY AGAIN\nUNTIL YOU\nSUCCEED', 690, { fontFamily: 'Inter Tight', fontWeight: 800, fontSize: 62, lineHeight: 0.98, fill: '#fff7ea' }),
            L('14 APR 2026        YOUR NAME        @yourdesign', 60, 1300, { fontFamily: 'Inter', fontWeight: 600, fontSize: 15, fill: '#222222' }),
          ];
        } },
        { id: 'ts-authentic', name: 'Be authentic', bg: { color: '#0731f0' }, els: () => [
          L('Be truly\nAUTHENTIC.', 80, 280, { fontFamily: 'Inter Tight', fontWeight: 700, fontSize: 104, lineHeight: 1.0, letterSpacing: -0.025, fill: '#ffffff' }),
          Rt('YOUR NAME', 1010, 1275, { fontFamily: 'Inter', fontWeight: 600, fontSize: 14, fill: '#c9d3ff' }),
        ] },
        { id: 'ts-happen', name: 'Let it happen', bg: { color: '#6fb6f2' }, els: () => [
          img(0, 0, W, H, { assetId: 'img-clouds', placeholder: ['#8cc8f6', '#3d8fe0'], crop: { zoom: 1.15, x: 0.5, y: 0.8 }, filters: { saturation: 15, contrast: 8 }, name: 'Sky photo — replace with yours' }),
          C('LET IT\nHAPPEN.', 370, { fontFamily: 'Anton', fontSize: 300, lineHeight: 0.88, letterSpacing: -0.01, fill: '#e8251c' }),
        ] },
        { id: 'ts-memories', name: 'All we have are memories', bg: { color: '#050505' }, els: () => [
          shp('rect', 110, 140, 860, 1070, { fill: '#1c3f8f', texture: 30, name: 'Panel' }),
          L('ALL WE\nHAVE ARE\nMEMORIES', 150, 190, { fontFamily: 'Antonio', fontWeight: 700, fontSize: 200, lineHeight: 0.86, letterSpacing: -0.02, fill: '#d9cdb3' }),
          L('SO MAKE\nTHEM', 150, 840, { fontFamily: 'Antonio', fontWeight: 700, fontSize: 200, lineHeight: 0.86, letterSpacing: -0.02, fill: '#0b0b0b' }),
          shp('rect', 930, 230, 4, 70, { fill: '#0b0b0b' }), shp('rect', 930, 1010, 4, 70, { fill: '#0b0b0b' }),
        ] },
        { id: 'ts-now2', name: 'The time is now', bg: { color: '#33d14e', texture: 45 }, overlay: { grain: 45 }, els: () => [
          C('THE TIME IS', 200, { fontFamily: 'Anton', fontSize: 230, letterSpacing: -0.01, fill: '#141414', lblur: { gauss: 1.2 } }),
          C('NOW', 770, { fontFamily: 'Anton', fontSize: 590, lineHeight: 0.85, letterSpacing: -0.02, fill: '#141414', lblur: { gauss: 1.5 } }),
          C('28 APR 2026        YOUR NAME        @yourdesign', 1300, { fontFamily: 'Inter', fontWeight: 600, fontSize: 15, fill: '#141414' }),
        ] },
        { id: 'ts-hands', name: 'The work of your hands', bg: { color: '#f39212', texture: 45 }, overlay: { grain: 35 }, els: () => [
          C('TRUST\nTHE WORK OF\nYOUR HANDS.', 620, { fontFamily: 'League Gothic', fontSize: 250, lineHeight: 0.84, letterSpacing: -0.01, fill: '#151515' }),
          C('DAY 90 / 365', 1120, { fontFamily: 'Arimo', fontWeight: 700, fontSize: 38, fill: '#151515' }),
        ] },
        { id: 'ts-messy', name: 'Messy authenticity', bg: { color: '#d6cb3c', texture: 30 }, els: () => {
          const f = { fontFamily: 'Arimo', fontWeight: 700, fontSize: 84, letterSpacing: -0.02, fill: '#d3161e' };
          return [L('Messy', 200, 300, f), L('authenticity', 120, 420, f), L('over', 330, 540, f), L('fake', 200, 660, f), L('perfection.', 300, 780, f)];
        } },
        { id: 'ts-start', name: 'Start before it makes sense', bg: { color: '#d9d9d9' }, els: () => [
          C('+', 150, { fontFamily: 'Inter', fontWeight: 300, fontSize: 60, fill: '#2626d8' }),
          C('START BEFORE\nIT MAKES SENSE', 640, { fontFamily: 'Roboto Condensed', fontWeight: 800, fontSize: 110, lineHeight: 0.88, letterSpacing: -0.02, fill: '#2626d8' }),
          C('YOUR NAME', 1220, { fontFamily: 'Inter', fontWeight: 800, fontSize: 16, fill: '#2626d8' }),
        ] },
        { id: 'ts-rushed', name: 'We rushed through', bg: { color: '#c9a77a' }, els: () => [
          img(0, 0, W, H, { assetId: 'img-desert', placeholder: ['#d8b98c', '#8a6a44'], filters: { contrast: 6, warmth: 10 }, name: 'Background photo — replace with yours' }),
          shp('rect', 330, 180, 420, 1010, { fill: '#e6261d', name: 'Red panel' }),
          C('WE\nRUSHED\nTHROUGH\nTHE\nONLY\nLIFE\nWE\nGET', 685, { fontFamily: 'Anton', fontSize: 118, lineHeight: 0.87, fill: '#111111' }),
        ] },
        { id: 'ts-develop', name: 'Develop your story', bg: { color: '#e9e9ee' }, els: () => [
          C('DEVELOP\nYOUR', 250, { fontFamily: 'Caveat Brush', fontSize: 140, lineHeight: 0.85, fill: '#2241e0', rotation: -6 }),
          C('STORY.', 500, { fontFamily: 'Caveat Brush', fontSize: 300, fill: '#2241e0', rotation: -5 }),
          rib('swipe', 170, 640, 720, 70, { line: true, thickness: 20, color: '#2241e0', text: '', name: 'Brush stroke' }),
          txt('Every great brand has a story — it’s the “why” behind everything they do. Telling that story effectively is critical. We often see brands wanting to say too much, and in the end, they say nothing at all.', { x: 110, y: 780, autoWidth: false, width: 860, align: 'left', fontFamily: 'Archivo', fontWeight: 800, fontSize: 34, lineHeight: 1.15, fill: '#2241e0' }),
        ] },
        { id: 'ts-addicted', name: 'Addicted to authenticity', bg: { color: '#777777' }, els: () => [
          img(0, 0, W, H, { assetId: 'img-sneakers', placeholder: ['#8a8a8a', '#3a3a3a'], crop: { zoom: 1.4, x: 0.5, y: 0.6 }, name: 'Background photo — replace with yours' }),
          shp('rect', 230, 260, 640, 720, { fill: '#ec2323', name: 'Red panel' }),
          C('ADDICTED TO\nAUTHENTICITY', 600, { fontFamily: 'Permanent Marker', fontSize: 74, lineHeight: 1.0, fill: '#111111', rotation: -3 }),
        ] },
        { id: 'ts-makeit', name: 'Make that stuff happen', bg: { color: '#c6f22e' }, els: () => [
          C('make\nthat stuff\nhappen', 640, { fontFamily: 'Roboto Condensed', fontWeight: 500, fontSize: 280, lineHeight: 0.82, letterSpacing: -0.045, fill: '#1d3aeb' }),
        ] },
        { id: 'ts-dothis', name: 'I get to do this', bg: { color: '#0d1a4a' }, els: () => {
          const cream = '#f1ecc4', sm = (t, x, y, o) => L(t, x, y, Object.assign({ fontFamily: 'Inter', fontWeight: 800, fontSize: 22, lineHeight: 1.15, fill: '#ffffff' }, o));
          return [
            img(0, 0, W, H, { assetId: 'img-run4', placeholder: ['#1b2a6a', '#b0201e'], crop: { zoom: 1.3, x: 0.5, y: 0.5 }, filters: { motion: 90, motionAngle: 0, contrast: 25, saturation: 35, brightness: -12 }, name: 'Background photo — replace with yours' }),
            sm('I GET TO', 120, 120, { fontSize: 28, fill: cream }),
            L('do\nthis', 110, 160, { fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 200, lineHeight: 0.78, letterSpacing: -0.03, fill: cream }),
            Rt('DESIGN THE\nLIFE YOU\nDESIRE', 960, 470, { fontFamily: 'Inter', fontWeight: 800, fontSize: 22, lineHeight: 1.15, fill: '#ffffff' }),
            sm('I GET TO', 470, 800, { fontSize: 28, fill: cream }),
            L('be', 650, 700, { fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 200, fill: cream }),
            L('HERE', 330, 860, { fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 250, letterSpacing: -0.02, fill: cream, lblur: { motion: 16, angle: 0 } }),
            sm('AS ART,\nPERCEPTION\nIS JUST AN\nINTERPRETATION', 120, 1130),
            C('YOUR NAME', 1300, { fontFamily: 'Inter', fontWeight: 600, fontSize: 14, fill: '#cfd6ff' }),
          ];
        } },
        { id: 'ts-mostcreative', name: 'The most creative act', bg: { color: '#e66f1c' }, els: () => [
          L('The most\ncreative\nact is', 80, 90, { fontFamily: 'Young Serif', fontSize: 104, lineHeight: 0.95, letterSpacing: -0.03, fill: '#151515' }),
          Rt('creating yourself', 1000, 1180, { fontFamily: 'Fraunces', fontWeight: 800, fontSize: 44, fill: '#151515' }),
          Rt('The act of', 1000 - 371 - 12, 1180, { fontFamily: 'Young Serif', fontSize: 44, fill: '#151515' }),
        ] },
        { id: 'ts-busy', name: 'Don’t be busy', bg: { color: '#1d57c8', texture: 30, pattern: { type: 'grid', color: 'rgba(255,255,255,0.28)', size: 180, thick: 2 } }, overlay: { grain: 25 }, els: () => {
          const nums = { fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 18, lineHeight: 6.4, fill: 'rgba(255,255,255,0.75)' };
          return [
            shp('rect', 40, 0, 2, H, { fill: 'rgba(255,255,255,0.5)' }), shp('rect', 1038, 0, 2, H, { fill: 'rgba(255,255,255,0.5)' }),
            L('50\n45\n40\n35\n30\n25\n20\n15\n10', 54, 150, nums), Rt('50\n45\n40\n35\n30\n25\n20\n15\n10', 1026, 150, Object.assign({ align: 'right' }, nums)),
            C('Don’t be busy.\nBe productive.', 640, { fontFamily: 'Newsreader', fontWeight: 400, fontSize: 76, lineHeight: 1.0, letterSpacing: -0.02, fill: '#ffffff' }),
          ];
        } },
        { id: 'ts-lesscare', name: 'The less you care', bg: { color: '#222222' }, els: () => {
          const red = { fontFamily: 'Arimo', fontWeight: 700, fontSize: 140, letterSpacing: -0.03, fill: '#e4231f' };
          return [
            img(0, 0, W, H, { assetId: 'demo-mindset', placeholder: ['#888', '#222'], crop: { zoom: 1.6, x: 0.6, y: 0.4 }, filters: { grayscale: 100, contrast: 45, noise: 60, brightness: -5 }, name: 'Background photo — replace with yours' }),
            C('THE LESS YOU', 150, red), C('C     A     R     E', 290, red), C('THE MORE YOU', 430, red),
            C('Live.', 1120, { fontFamily: 'Yellowtail', fontSize: 340, fill: '#e4231f', rotation: -5 }),
          ];
        } },
        { id: 'ts-chapter2', name: 'Chapter one: messy', bg: { color: '#e01d1d', texture: 30 }, els: () => {
          const f = { fontFamily: 'Roboto Condensed', fontWeight: 600, fontSize: 70, letterSpacing: -0.01, fill: '#111111' };
          return [
            L('(Chapter 1:)', 40, 50, Object.assign({}, f, { bg: { style: 'box', color: '#d9d3c8', padX: 12, padY: 4, radius: 0 } })),
            shp('rect', 30, 880, 1020, 250, { fill: '#d9d3c8', name: 'Label' }),
            L('Messy', 60, 905, f), Rt('Authenticity', 1020, 905, f),
            L('Over', 60, 1010, f), C('Fake', 1052, Object.assign({ cx: 520 }, f)), Rt('Perfection', 1020, 1010, f),
          ];
        } },
        { id: 'ts-overthink', name: 'Create, don’t overthink', bg: { color: '#0c1a2e' }, els: () => [
          C('Create,\ndon’t\noverthink.', 660, { fontFamily: 'Nunito', fontWeight: 900, fontSize: 160, lineHeight: 1.04, letterSpacing: -0.01, fill: '#ffffff' }),
        ] },
        { id: 'ts-athletes', name: 'Creatives are the new athletes', bg: { color: '#111111' }, els: () => [
          img(0, 0, W, H, { assetId: 'img-gym3', placeholder: ['#555', '#111'], crop: { zoom: 1.2, x: 0.5, y: 0.45 }, filters: { grayscale: 100, contrast: 30, brightness: -15 }, name: 'Background photo — replace with yours' }),
          L('CREATIVES\nARE THE\nNEW\nATHLETES', 170, 430, { fontFamily: 'Arimo', fontWeight: 700, fontSize: 96, lineHeight: 1.12, letterSpacing: 0.06, fill: '#d8d8d8', rotation: 4, opacity: 0.92, lblur: { gauss: 1.2 } }),
        ] },
        { id: 'ts-curated', name: 'It’s curated', bg: { color: '#f3f3f1' }, els: () => {
          const f = { fontFamily: 'Inter Tight', fontWeight: 700, fontSize: 86, lineHeight: 0.9, letterSpacing: -0.03, fill: '#111111' };
          const sat = { saturation: 45, contrast: 15 };
          return [
            L('Your\nspace', 110, 300, f), chip('fight3', 430, 310, 250, 150, { filters: sat }), chip('drive3', 710, 290, 160, 190, { filters: sat }),
            chip('play2', 110, 520, 270, 150, { filters: sat }), L('isn’t\nplain.', 420, 520, f), chip('run2', 730, 500, 140, 200, { filters: sat }),
            L('It’s\ncurated.', 110, 740, f), chip('drive1', 470, 750, 280, 160, { filters: sat }),
            shp('ellipse', 790, 745, 44, 44, { fill: 'rgba(0,0,0,0)', stroke: '#111111', strokeWidth: 3 }), shp('ellipse', 790, 800, 44, 44, { fill: 'rgba(0,0,0,0)', stroke: '#111111', strokeWidth: 3 }), shp('ellipse', 790, 855, 44, 44, { fill: 'rgba(0,0,0,0)', stroke: '#111111', strokeWidth: 3 }),
            C('Designed for your space, hand-tufted with intention.', 1090, { fontFamily: 'Inter', fontWeight: 600, fontSize: 20, fill: '#111111' }),
          ];
        } },
        { id: 'ts-outside', name: 'Outside.', bg: { color: '#e8e8e6' }, overlay: { grain: 30 }, els: () => [
          img(0, 640, W, 710, { assetId: 'img-rise3', placeholder: ['#9a9a9a', '#3a3a3a'], crop: { zoom: 1.2, x: 0.5, y: 0.8 }, filters: { grayscale: 100, contrast: 25 }, name: 'Field photo — replace with yours' }),
          C('Outside.', 270, { fontFamily: 'Arimo', fontWeight: 700, fontSize: 240, letterSpacing: -0.05, fill: '#111111' }),
          shp('rect', 300, 440, 500, 560, { fill: '#d4d23c', texture: 20, name: 'Poster' }),
          L('YOURBRAND\nDIGITAL MEDIA', 320, 460, { fontFamily: 'Arimo', fontWeight: 700, fontSize: 13, lineHeight: 1.15, fill: '#111111' }),
          L('POSTER\nSERIES-124', 470, 460, { fontFamily: 'Arimo', fontWeight: 700, fontSize: 13, lineHeight: 1.15, fill: '#111111' }),
          L('ON A MISSION\nTO ACHIEVE DREAMS', 620, 460, { fontFamily: 'Arimo', fontWeight: 700, fontSize: 13, lineHeight: 1.15, fill: '#111111' }),
        ] },
        { id: 'ts-done', name: 'Done is better', bg: { color: '#e4241e', texture: 70, crumple: 40, crumpleSeed: 6 }, overlay: { grain: 45 }, els: () => [
          L('DONE IS\nBETTER THAN\nPEFRECT.', 55, 400, { fontFamily: 'Archivo Black', fontSize: 128, lineHeight: 0.9, letterSpacing: -0.04, fill: '#f3ece8' }),
          C('26 APR 2026        YOUR NAME        @yourdesign', 1300, { fontFamily: 'Inter', fontWeight: 600, fontSize: 15, fill: '#f3ece8' }),
        ] },
        { id: 'ts-whatmakes', name: 'What makes real', bg: { color: '#1f22f0' }, els: () => {
          const h = { fontFamily: 'Inter', fontWeight: 500, fontSize: 42, letterSpacing: -0.02, fill: '#ffffff' }, n = { fontFamily: 'Inter', fontWeight: 400, fontSize: 22, lineHeight: 1.2, fill: '#ffffff' };
          return [
            L('Your Name', 40, 30, h), Rt('1978', 1040, 30, h), Rt('June 30th, June 30th', 1040, 82, h),
            shp('rect', 40, 145, 1000, 3, { fill: '#ffffff' }),
            L('What\nmakes\nreal', 30, 190, { fontFamily: 'Silkscreen', fontSize: 280, lineHeight: 0.92, letterSpacing: -0.07, fill: '#ffffff' }),
            L('(1)  Waiting for her…\nNothing to do but write a poem.\nShe is now 5 minutes late.', 560, 300, n),
            L('(2)  I have a feeling she will be at least\n15 minutes late.', 80, 560, n),
            L('(3) —NOW exactly NOW—\nthe doorbell rang', 470, 880, n),
            L('(4)  She is at the door:\n6 minutes after 9 P.M.', 700, 1160, n),
          ];
        } },
        { id: 'ts-support', name: 'Support the arts', bg: { color: '#ebebe9' }, els: () => [
          img(230, 480, 620, 360, { assetId: 'img-statue', placeholder: ['#4f6fd8', '#0b2a8f'], filters: { duotone: true, duoDark: '#0b2a8f', duoLight: '#a6c6ff', contrast: 15 }, crop: { zoom: 1.3, x: 0.6, y: 0.4 }, name: 'Photo — replace with yours' }),
          C('Support\nthe arts,\ndate an\nartist.', 660, { fontFamily: 'Permanent Marker', fontSize: 175, lineHeight: 0.98, fill: '#111111' }),
        ] },
        { id: 'ts-takerisk', name: 'Take that risk', bg: { color: '#e3e3e6' }, els: () => [
          shp('torn', 170, 240, 740, 830, { fill: '#ea3a1a', texture: 30, seed: 9, name: 'Torn paper' }),
          C('Take\nthat\nrisk.', 650, { fontFamily: 'Gloock', fontSize: 270, lineHeight: 0.84, letterSpacing: -0.02, fill: '#111111' }),
          C('26 MAY 2026        YOUR NAME        @yourdesign', 1300, { fontFamily: 'Inter', fontWeight: 600, fontSize: 15, fill: '#222222' }),
        ] },
        { id: 'ts-thinkbig', name: 'Think big, start small', bg: { color: '#1d4fd0', texture: 30 }, overlay: { grain: 25 }, els: () => [
          C('THINK\nBIG', 770, { fontFamily: 'Anton', fontSize: 470, lineHeight: 0.84, letterSpacing: -0.02, fill: '#f1e6c8' }),
          C('START\nSMALL', 905, { cx: 820, fontFamily: 'Inter', fontWeight: 900, fontSize: 30, lineHeight: 0.95, fill: '#1d4fd0', bg: { style: 'box', color: '#f1e6c8', padX: 14, padY: 10, radius: 0 } }),
        ] },
      ];
      function ribbon(path, x, y, w, h, color) { return rib(path, x, y, w, h, { line: true, thickness: 4, color, text: '', name: 'Doodle' }); }
      return slides.map(v => ({
        id: v.id, name: v.name, tags: ['Quote', 'Text'], width: W, height: H,
        build: () => ({ width: W, height: H, background: v.bg, overlay: v.overlay || {}, elements: v.els() }),
      }));
    })(),

    // ── LAYOUTS IN MOTION: photo & video layouts that move, each built for four orientations ──
    ...(() => {
      const SIZES = [['story', 1080, 1920, 'Story 9:16'], ['portrait', 1080, 1350, 'Portrait 4:5'], ['square', 1080, 1080, 'Square 1:1'], ['wide', 1920, 1080, 'Landscape 16:9']];
      const POOL = ['film-golden', 'ed-curls', 'film-road', 'film-friends', 'ed-yellow', 'film-beach', 'film-neon', 'ed-smile', 'film-grass', 'film-picnic', 'ed-red', 'film-tram',
        'film-lanterns', 'ed-stool', 'film-coast', 'film-window', 'ed-think', 'film-canyon', 'film-lamp', 'film-station', 'ed-suit', 'film-portrait', 'ed-youth', 'film-kiss'];
      const asset = (i, seed = 0) => POOL[(i * 5 + seed) % POOL.length];
      const slot = (i, x, y, w, h, o) => img(x, y, w, h, Object.assign({ assetId: asset(i, o && o.seed || 0), name: 'Photo or video ' + (i + 1), placeholder: ['#3a3632', '#1d1b18'] }, o || {}));
      const rnd = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
      const soft = { on: true, color: '#000000', opacity: 0.35, blur: 24, x: 0, y: 12 };
      const LAYOUTS = [
        {
          // rows of rounded, slightly bulging tiles gliding past like a wall of screens
          key: 'wall', name: 'Scrolling wall', D: 8,
          build(W, H) {
            const rows = H > W * 1.5 ? 4 : H > W ? 3 : W > H ? 2 : 3, pad = Math.min(W, H) * 0.06, gap = Math.min(W, H) * 0.035;
            const th = (H - pad * 2 - gap * (rows - 1)) / rows, travel = W * 0.45, els = [];
            let n = 0;
            for (let r = 0; r < rows; r++) {
              let x = r % 2 ? -th * 0.45 : -gap;
              while (x < W + travel + th) {
                const tw = th * [0.95, 1.18, 0.82, 1.05][(n + r) % 4];
                els.push(slot(n, x, pad + r * (th + gap), tw, th, { frame: { style: 'rounded', radius: th * 0.12, size: 0 }, filters: { fisheye: 22, contrast: 6 }, anim: { loop: 'drift', dx: -travel, dy: 0, sync: true } }));
                x += tw + gap; n++;
              }
            }
            return { background: { color: '#060606' }, overlay: { vignette: 45, grain: 10 }, elements: els };
          },
        },
        {
          // cards pop up one after another along a winding path; the oldest drop away as the trail moves on
          key: 'trail', name: 'Card trail', D: 7,
          build(W, H) {
            const n = 16, s = Math.min(W, H) * (W > H ? 0.4 : 0.36), r = rnd(11), els = [];
            for (let i = 0; i < n; i++) {
              const u = i / (n - 1), land = r() < 0.5;
              const w = land ? s * 1.3 : s * 0.82, h = land ? s * 0.9 : s * 1.1;
              const cx = W >= H ? W * (0.16 + 0.68 * u) + Math.sin(u * Math.PI * 2.2) * W * 0.04 : W * (0.5 + 0.2 * Math.sin(u * Math.PI * 2.4));
              const cy = W >= H ? H * (0.42 + 0.18 * Math.sin(u * Math.PI * 1.6 + 0.4)) : H * (0.18 + 0.64 * u);
              const start = i * 0.32, last = i >= n - 4;
              els.push(slot(i, cx - w / 2 + (r() - 0.5) * s * 0.3, cy - h / 2 + (r() - 0.5) * s * 0.3, w, h, { shadow: soft, time: { start, end: last ? null : start + 2.6 }, anim: { enter: 'pop', delay: start, speed: 1.6 } }));
            }
            return { background: { color: '#050505' }, overlay: { grain: 8 }, elements: els };
          },
        },
        {
          // a grid that fills up one photo at a time, a few cells left dark
          key: 'grid', name: 'Grid build', D: 6,
          build(W, H) {
            const cell = Math.min(W, H) / (W > H ? 3.1 : 3.6), gap = Math.min(W, H) * 0.012, pad = Math.min(W, H) * 0.05;
            const cols = Math.max(2, Math.round((W - pad * 2) / cell)), rows = Math.max(2, Math.round((H - pad * 2) / cell));
            const cw = (W - pad * 2 - gap * (cols - 1)) / cols, ch = (H - pad * 2 - gap * (rows - 1)) / rows;
            const used = new Set(), r = rnd(5), tiles = [];
            for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
              if (used.has(i + ',' + j)) continue;
              let sw = 1, sh = 1;
              if (r() < 0.28 && i + 1 < cols && !used.has((i + 1) + ',' + j)) sw = 2;
              else if (r() < 0.25 && j + 1 < rows) sh = 2;
              for (let a = 0; a < sw; a++) for (let b = 0; b < sh; b++) used.add((i + a) + ',' + (j + b));
              if (r() < 0.14) continue;
              tiles.push({ x: pad + i * (cw + gap), y: pad + j * (ch + gap), w: cw * sw + gap * (sw - 1), h: ch * sh + gap * (sh - 1) });
            }
            const order = tiles.map((t, k) => [r(), k]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
            const els = tiles.map((t, k) => { const d = order.indexOf(k) * (3.6 / tiles.length); return slot(k, t.x, t.y, t.w, t.h, { anim: { enter: 'fade', delay: d, speed: 3 }, time: { start: d } }); });
            return { background: { color: '#000000' }, overlay: { grain: 8 }, elements: els };
          },
        },
        {
          // prints tossed onto a pile, one after another
          key: 'drop', name: 'Photo drop', D: 6,
          build(W, H) {
            const n = 8, ch = Math.min(H * 0.72, W * 0.66 * 1.35), cw = ch * 0.74, r = rnd(23), els = [];
            for (let i = 0; i < n; i++) {
              const d = 0.15 + i * 0.62, rot = (r() - 0.5) * 12;
              els.push(slot(i, W / 2 - cw / 2 + (r() - 0.5) * cw * 0.12, H / 2 - ch / 2 + (r() - 0.5) * ch * 0.06, cw, ch, { rotation: rot,
                frame: { style: 'border', color: '#fbfaf7', size: Math.round(cw * 0.035) }, shadow: { on: true, color: '#000000', opacity: 0.22, blur: 18, x: 0, y: 8 },
                anim: { enter: 'land', delay: d, spin: i % 2 ? 16 : -16 }, time: { start: d } }));
            }
            return { background: { color: '#e9e8e4', texture: 20 }, overlay: { grain: 8 }, elements: els };
          },
        },
        {
          // a fan of prints opens out from the middle, then the front ones land on top
          key: 'fan', name: 'Fan stack', D: 6,
          build(W, H) {
            const wide = W > H, n = wide ? 7 : 5, ch = Math.min(H * (wide ? 0.62 : 0.5), W * 0.6), cw = ch * 0.72, spread = wide ? W * 0.11 : W * 0.13, els = [];
            const mid = (n - 1) / 2;
            for (let k = 0; k < n; k++) {
              const off = k - mid, d = 0.2 + Math.abs(off) * 0.08 + (off === 0 ? 0 : 0);
              els.push(slot(k, W / 2 - cw / 2 + off * spread, H / 2 - ch / 2 + Math.abs(off) * ch * 0.04, cw, ch, { rotation: off * (wide ? 5 : 7),
                frame: { style: 'border', color: '#fbfaf7', size: Math.round(cw * 0.035) }, shadow: { on: true, color: '#000000', opacity: 0.2, blur: 16, x: 0, y: 8 },
                anim: { enter: off < 0 ? 'left' : off > 0 ? 'right' : 'zoom', delay: d, speed: 1.4 } }));
            }
            // fan out from the centre: outer cards sit underneath
            els.sort((a, b) => Math.abs(b.x - (W / 2 - cw / 2)) - Math.abs(a.x - (W / 2 - cw / 2)));
            for (let i = 0; i < 3; i++) {
              const d = 1.6 + i * 0.75;
              els.push(slot(n + i, W / 2 - cw * 0.55, H / 2 - ch * 0.55, cw * 1.1, ch * 1.1, { rotation: [-4, 5, -1.5][i], frame: { style: 'border', color: '#fbfaf7', size: Math.round(cw * 0.04) },
                shadow: { on: true, color: '#000000', opacity: 0.25, blur: 20, x: 0, y: 10 }, anim: { enter: 'land', delay: d, spin: i % 2 ? -14 : 14 }, time: { start: d } }));
            }
            return { background: { color: '#ebe9e3', texture: 20 }, overlay: { grain: 8 }, elements: els };
          },
        },
        {
          // video strips of different widths glide past; a few split into stacked tiles. Tall canvases run in bands going up.
          key: 'strips', name: 'Strip conveyor', D: 7,
          build(W, H) {
            const vertical = H > W * 1.2, along = vertical ? H : W, across = vertical ? W : H;
            const margin = W >= H ? across * 0.12 : 0, gap = Math.max(4, across * 0.006), travel = along * 1.1, r = rnd(9), els = [];
            let p = 0, n = 0;
            while (p < along + travel) {
              const len = along * (0.12 + r() * 0.16), split = r() < 0.22 ? (r() < 0.5 ? 2 : 3) : 1;
              const span = across - margin * 2, piece = (span - gap * (split - 1)) / split;
              for (let k = 0; k < split; k++) {
                const a = margin + k * (piece + gap);
                els.push(slot(n, vertical ? a : p, vertical ? p : a, vertical ? piece : len, vertical ? len : piece, { anim: { loop: 'drift', dx: vertical ? 0 : -travel, dy: vertical ? -travel : 0, sync: true } }));
                n++;
              }
              p += len + gap;
            }
            return { background: { color: '#000000' }, overlay: { grain: 10 }, elements: els };
          },
        },
        {
          // a wall of photos fades in, then the camera pushes in to the one in the middle
          key: 'zoom', name: 'Zoom wall', D: 6,
          build(W, H) {
            const cols = W > H ? 5 : 3, rows = H > W * 1.5 ? 5 : H > W ? 4 : 3, gap = Math.min(W, H) * 0.014;
            const cw = (W - gap * (cols + 1)) / cols, ch = (H - gap * (rows + 1)) / rows, els = [], mid = [Math.floor(cols / 2), Math.floor(rows / 2)];
            let k = 0;
            for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
              const focus = i === mid[0] && j === mid[1], d = (Math.abs(i - mid[0]) + Math.abs(j - mid[1])) * 0.12;
              els.push(slot(k++, gap + i * (cw + gap), gap + j * (ch + gap), cw, ch, Object.assign({ anim: { enter: 'fade', delay: d, speed: 2 } }, focus ? { key: 'focus', name: 'The photo the camera zooms to' } : {})));
            }
            return { background: { color: '#0a0a0a' }, overlay: { grain: 8, vignette: 25 }, camera: { move: 'pushin', target: 'focus', zoom: Math.min(cols, rows) * 0.92, start: 1.4, dur: 2.6, blur: 0.5 }, elements: els };
          },
        },
        {
          // panels slide in from alternating sides until the frame is full
          key: 'panels', name: 'Slide-in panels', D: 5,
          build(W, H) {
            const wide = W > H * 1.2, tall = H > W * 1.2, gap = Math.min(W, H) * 0.012, els = [];
            const cells = wide ? [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]]
              : tall ? [[0, 0, 1, 1 / 3], [0, 1 / 3, 1, 1 / 3], [0, 2 / 3, 1, 1 / 3]]
              : [[0, 0, 0.5, 0.55], [0.5, 0, 0.5, 0.55], [0, 0.55, 0.62, 0.45], [0.62, 0.55, 0.38, 0.45]];
            cells.forEach(([x, y, w, h], i) => {
              const dir = wide ? (i % 2 ? 'rise' : 'drop') : (i % 2 ? 'right' : 'left');
              els.push(slot(i, x * W + gap / 2, y * H + gap / 2, w * W - gap, h * H - gap, { anim: { enter: dir, delay: 0.1 + i * 0.3, speed: 1.2, loop: 'float', amount: 0.12 } }));
            });
            return { background: { color: '#0a0a0a' }, overlay: { grain: 8 }, elements: els };
          },
        },
      ];
      // any size: the editor can re-flow a layout to the canvas it's on
      const buildAt = (L, W, H) => Object.assign({ width: W, height: H, anim: { duration: L.D, fps: 30 }, layout: { key: L.key } }, L.build(W, H));
      window.STUDIO_LAYOUTS = Object.fromEntries(LAYOUTS.map(L => [L.key, { name: L.name, build: (W, H) => buildAt(L, W, H) }]));
      // several layouts share one family card; each keeps its own type (style) and the ratio is picked afterwards
      const FAMILY = { wall: 'Moving grids', trail: 'Moving grids', grid: 'Moving grids', zoom: 'Moving grids', drop: 'Photo piles', fan: 'Photo piles', strips: 'Strips & panels', panels: 'Strips & panels' };
      return LAYOUTS.flatMap(L => SIZES.map(([k, W, H, label]) => ({
        id: `mv-${L.key}-${k}`, name: label, family: FAMILY[L.key], style: L.name, layout: L.key, orientation: k, tags: ['Video', 'Photo', 'Layout'], width: W, height: H, video: true,
        build: () => buildAt(L, W, H),
      })));
    })(),

    // ── SMOOTH CAM TEXT: words pull into focus, the camera whips up to the headline, pushes in, and the type turns italic ──
    ...(() => {
      const BLUE = '#1f19c8', FONT = 'Inter Tight';
      // word widths in ems (Inter Tight 800, -0.045 tracking; "probably" at 700)
      const EM = { 'you’ve': 3.03, probably: 3.75, 'seen those': 4.79, smooth: 3.39, cam: 1.94, animations: 4.85 };
      const D = 5.5;
      function build(W, H) {
        const Z = 2, vw = W / Z, vh = H / Z;
        const fs = Math.min(0.74 * vw / 1.12 / 8.53, vh * 0.2);
        const lowY = H * 0.66, highY = H * 0.34;
        // one line of words of different sizes sitting on a shared baseline, centred on x = W / 2
        const line = (words, cy, extra, label) => {
          const sized = words.map(([w, k, o]) => ({ w, size: fs * k, o: o || {} }));
          const total = sized.reduce((a, q, i) => a + EM[q.w] * q.size + (i ? 0.16 * q.size : 0), 0);
          let x = W / 2 - total / 2;
          const base = cy + fs * 0.36;
          return sized.map((q, i) => {
            if (i) x += 0.16 * q.size;
            const el = txt(q.w, Object.assign({ x, y: base - q.size * 0.97, align: 'left', fontFamily: FONT, fontWeight: 800, fontSize: Math.round(q.size * 10) / 10, letterSpacing: -0.045, fill: BLUE, key: 'w-' + q.w.replace(/\W+/g, '') + (extra && extra.italic ? '-i' : ''), name: (label || 'Word') + ' ' + (i + 1) }, extra || {}, q.o));
            x += EM[q.w] * q.size;
            return el;
          });
        };
        const blob = (fx, fy, fw, fh, color, blur) => shp('rounded', fx * W, fy * H, fw * W, fh * H, { radius: Math.min(fw * W, fh * H) * 0.3, fill: color, lblur: { gauss: blur * Math.min(W, H) / 1080, motion: 0, angle: 0 }, name: 'Soft light' });
        const flash = (color, op, a, b) => shp('rect', 0, 0, W, H, { fill: color, opacity: op, time: { start: a, end: b }, name: 'Exposure flash' });
        return {
          background: { color: '#e8eafb', color2: '#f6f6fd', gradient: 'linear', angle: 150 },
          overlay: { grain: 6 },
          camera: {
            move: 'keys', blur: 0.6,
            keys: [{ t: 0, x: 0.5, y: lowY / H, z: Z, r: 0 }, { t: 2.1, z: Z * 1.04 }, { t: 2.5, y: highY / H, z: Z, r: 3.2 }, { t: 3.1, r: 0, z: Z * 1.02, ease: 'out' }, { t: D, z: Z * 1.13, ease: 'linear' }],
          },
          elements: [
            blob(0.05, 0.08, 0.5, 0.3, '#ffffff', 60), blob(0.55, 0.2, 0.42, 0.24, '#d3d8f8', 70), blob(0.12, 0.46, 0.34, 0.2, '#dce0fa', 60),
            blob(0.6, 0.55, 0.4, 0.28, '#ffffff', 70), blob(0.02, 0.72, 0.5, 0.24, '#d0d5f7', 80), blob(0.45, 0.82, 0.5, 0.2, '#f9f9ff', 60),
            flash('#8d93ad', 0.45, 4.55, 4.67), flash('#ffffff', 0.75, 4.78, 4.88),
            ...line([['you’ve', 0.85], ['probably', 0.62, { fontWeight: 700 }]], lowY, null, 'Opening word').map((e, i) => Object.assign(e, { time: { start: i ? 0.8 : 0.3, end: 1.45 }, anim: { enter: 'focus', delay: i ? 0.8 : 0.3, speed: 1 } }, i ? { y: e.y + fs * 0.08 } : {})),
            ...line([['seen those', 0.8]], lowY, null, 'Second line').map(e => Object.assign(e, { time: { start: 1.45 }, anim: { enter: 'focus', delay: 1.45, speed: 1.6 } })),
            ...line([['smooth', 1], ['cam', 0.8], ['animations', 0.68]], highY, null, 'Headline word').map(e => Object.assign(e, { time: { start: 0, end: 4.02 } })),
            ...line([['smooth', 0.74], ['cam', 0.84], ['animations', 1]], highY, { italic: true }, 'Italic headline word').map(e => Object.assign(e, { time: { start: 3.92 }, anim: { enter: 'focus', delay: 3.92, speed: 2.2, amount: 0.6 } })),
          ],
        };
      }
      // every layer is part of the layout, so a resize rebuilds them (keeping the words you typed)
      const buildAt = (W, H) => { const d = build(W, H); d.elements.forEach(e => { e.layoutSlot = true; }); return Object.assign({ width: W, height: H, anim: { duration: D, fps: 30 }, layout: { key: 'smoothcam' } }, d); };
      (window.STUDIO_LAYOUTS = window.STUDIO_LAYOUTS || {}).smoothcam = { name: 'Smooth cam text', build: (W, H) => buildAt(W, H) };
      const SIZES = [['story', 1080, 1920, 'Story 9:16'], ['portrait', 1080, 1350, 'Portrait 4:5'], ['square', 1080, 1080, 'Square 1:1'], ['wide', 1920, 1080, 'Landscape 16:9']];
      return SIZES.map(([k, W, H, label]) => ({
        id: `mv-smoothcam-${k}`, name: label, family: 'Smooth cam text', layout: 'smoothcam', orientation: k, tags: ['Video', 'Text', 'Kinetic'], width: W, height: H, video: true,
        build: () => buildAt(W, H),
      }));
    })(),

    // ── TYPING SCREEN: a question typed on a white display, filmed close up — pixel mesh, soft focus, the camera riding the caret ──
    ...(() => {
      function build(W, H) {
        const fs = Math.round(Math.min(W * 0.036, H * 0.06) * 10) / 10;
        // about 45 screen pixels per capital letter, like text on a laptop screen seen through a macro lens
        const pitch = Math.round(fs * 0.72 / 45 * 1000) / 1000;
        // zoom so a screen pixel lands about 4–5 px wide in the video
        const zoom = Math.round((W > H ? 4.8 : 4.1) / pitch * 100) / 100;
        return {
          background: { color: '#ffffff', color2: '#f1f3f0', gradient: 'radial' },
          overlay: { grain: 7, vignette: 24 },
          screen: { on: true, pitch, grid: 75, focus: 40, dust: 5 },
          camera: { move: 'typecut', target: 'type', zoom, cps: 9, cut: 1.0, hold: 2.2, blur: 0, shake: 0.25 },
          elements: [
            txt('WHAT IS YOUR INSPIRATION?', { key: 'type', cx: W / 2, cy: H / 2, width: W * 0.84, autoWidth: false, align: 'center', fontFamily: 'Arimo', fontWeight: 400, fontSize: fs, lineHeight: 1.25, letterSpacing: 0.01, fill: '#1b3136',
              typing: { caret: true, pin: true, blink: true, caretWidth: 0.085, caretColor: '#142a2f', marks: [] }, anim: { enter: 'typewriter', delay: 0 }, name: 'Typed text' }),
          ],
        };
      }
      const buildAt = (W, H) => {
        const d = Object.assign({ width: W, height: H, anim: { duration: 8, fps: 30 }, layout: { key: 'typescreen' } }, build(W, H));
        d.elements.forEach(e => { e.layoutSlot = true; });
        // clips need ids before the schedule can give them their slots
        d.elements.forEach((e, i) => { if (!e.id) e.id = 'ts' + i + '_' + Math.random().toString(36).slice(2, 7); });
        if (window.StudioRender) window.StudioRender.applyTypePlan(d);
        return d;
      };
      (window.STUDIO_LAYOUTS = window.STUDIO_LAYOUTS || {}).typescreen = { name: 'Typing screen', build: (W, H) => buildAt(W, H) };
      const SIZES = [['wide', 1920, 1080, 'Landscape 16:9'], ['story', 1080, 1920, 'Story 9:16'], ['portrait', 1080, 1350, 'Portrait 4:5'], ['square', 1080, 1080, 'Square 1:1']];
      return SIZES.map(([k, W, H, label]) => ({
        id: `mv-typescreen-${k}`, name: label, family: 'Typing screen', layout: 'typescreen', orientation: k, tags: ['Video', 'Text', 'Typing'], width: W, height: H, video: true,
        build: () => buildAt(W, H),
      }));
    })(),

    // ── TYPE EFFECTS: words that build, shuffle into place, get selected, or light up in a wall of words ──
    ...(() => {
      const T = (id, name, w, h, build) => ({ id, name, tags: ['Video', 'Text', 'Kinetic'], width: w, height: h, video: true, build });
      // a phrase built word by word, on screen from a to b (the entrance clock is the video's, so its delay is its start)
      const caps = (t, a, b, o) => txt(t, Object.assign({ x: 0, cy: 540, width: 1920, autoWidth: false, align: 'center', fontFamily: 'Inter Tight', fontWeight: 900, fontSize: 110, letterSpacing: 0.02,
        fill: '#a2e86f', anim: { enter: 'build', delay: a, speed: 1 }, time: b ? { start: a, end: b } : { start: a }, name: 'Phrase' }, o));
      const slot = 0.34;
      return [
        T('te-build', 'Word build', 1920, 1080, () => ({
          width: 1920, height: 1080, anim: { duration: 9, fps: 30 }, overlay: { grain: 4 },
          background: { color: '#0f2a05', color2: '#071603', gradient: 'linear', angle: 180 },
          elements: [
            caps('NOVA IS ON A MISSION', 0.2, 1.9),
            caps('TO MAKE THE WORLD’S MONEY', 1.9, 4.1),
            caps('WORK FOR EVERYONE', 4.1, 5.6),
            // the last word swaps: the first two are already there when this one cuts in
            Object.assign(caps('WORK FOR EVERYWHERE', 5.6, 7.2), { anim: { enter: 'build', delay: 5.6 - 2 * slot + 0.01, speed: 1 } }),
            shp('rect', 0, 0, 1920, 1080, { fill: '#e3e8da', fill2: '#8f998a', gradient: 'linear', gradAngle: 180, time: { start: 7.2 }, name: 'Light ending' }),
            caps('TO MAKE MONEY SIMPLE', 7.2, null, { fill: '#163300' }),
          ],
        })),
        T('te-build-portrait', 'Word build — portrait', 1080, 1350, () => ({
          width: 1080, height: 1350, anim: { duration: 6.5, fps: 30 }, overlay: { grain: 4 },
          background: { color: '#e3e8da', color2: '#b9c2b0', gradient: 'linear', angle: 180 },
          elements: [
            caps('WE ARE ON A MISSION', 0.2, 2.2, { width: 1080, cy: 675, fontSize: 88, fill: '#163300' }),
            caps('TO MAKE EVERY DAY A LITTLE EASIER', 2.2, null, { width: 960, x: 60, cy: 675, fontSize: 88, lineHeight: 1.0, fill: '#163300' }),
          ],
        })),
        T('te-shuffle', 'Blur shuffle', 1080, 1350, () => ({
          width: 1080, height: 1350, anim: { duration: 4.6, fps: 30 },
          background: { color: '#1f14ff' },
          elements: [
            txt('But behind every design there is somebody making choices', { x: 44, y: 330, width: 1000, autoWidth: false, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 124, lineHeight: 0.98, letterSpacing: -0.02, fill: '#ffffff', anim: { enter: 'shuffle', delay: 0, speed: 1 }, name: 'Paragraph' }),
            txt('@yourstudio', { x: 44, y: 1270, align: 'left', fontFamily: 'Inter', fontSize: 20, fill: 'rgba(255,255,255,0.6)', name: 'Handle' }),
          ],
        })),
        T('te-shuffle-cream', 'Blur shuffle — cream', 1080, 1350, () => ({
          width: 1080, height: 1350, anim: { duration: 4.6, fps: 30 }, overlay: { grain: 8 },
          background: { color: '#f1ece2' },
          elements: [
            txt('Every good idea starts as a mess of words looking for order', { x: 44, y: 300, width: 1000, autoWidth: false, align: 'left', fontFamily: 'Inter', fontWeight: 500, fontSize: 118, lineHeight: 0.98, letterSpacing: -0.03, fill: '#151515', anim: { enter: 'shuffle', delay: 0, speed: 0.9 }, name: 'Paragraph' }),
          ],
        })),
        T('te-sweep', 'Select sweep', 1920, 1080, () => ({
          width: 1920, height: 1080, anim: { duration: 6.6, fps: 30 },
          background: { color: '#521f00' },
          elements: [
            txt('Our tools are open source, so even our competitors can put it to use.', { x: 70, cy: 540, autoWidth: true, align: 'left', fontFamily: 'Bricolage Grotesque', fontWeight: 600, fontSize: 118, letterSpacing: -0.01, fill: '#f0c419',
              anim: { enter: 'sweep', delay: 0.3, speed: 1 }, sweep: { color: '#f0c419', ink: '#521f00', at: 0.62 }, name: 'Selected line' }),
          ],
        })),
        T('te-sweep-night', 'Select sweep — night', 1080, 1920, () => ({
          width: 1080, height: 1920, anim: { duration: 5.2, fps: 30 },
          background: { color: '#0d1b2a' },
          elements: [
            txt('Select the words that matter and let the rest fall away.', { x: 60, cy: 960, autoWidth: true, align: 'left', fontFamily: 'Bricolage Grotesque', fontWeight: 600, fontSize: 104, fill: '#7ef0c3',
              anim: { enter: 'sweep', delay: 0.3, speed: 1.1 }, sweep: { color: '#7ef0c3', ink: '#0d1b2a', at: 0.66 }, name: 'Selected line' }),
          ],
        })),
        T('te-wall', 'Word wall', 1920, 1080, () => {
          const line = (o) => txt('You build it with', Object.assign({ x: 0, cy: 540, width: 1004, autoWidth: false, align: 'right', fontFamily: 'Inter', fontWeight: 500, fontSize: 46, letterSpacing: -0.01, fill: '#15171f', name: 'Lead-in' }, o));
          return {
            width: 1920, height: 1080, anim: { duration: 7, fps: 30 },
            background: { color: '#f4f3f5', color2: '#a7a7ab', gradient: 'linear', angle: 180 },
            elements: [
              line({ x: 0, width: 1920, align: 'center', anim: { enter: 'build', delay: 0.15, speed: 1.4 }, time: { start: 0, end: 1.6 } }),
              shp('rect', 0, 0, 1920, 1080, { fill: '#2a4ad8', fill2: '#121f7c', gradient: 'linear', gradAngle: 180, time: { start: 1.6, end: 4.9 }, name: 'Wall colour' }),
              txt('honesty, smiles, empathy, hugs, patience, elbow grease, passion, know how, dedication', { x: 0, y: 0, width: 1920, height: 1080, autoWidth: false, align: 'left', fontFamily: 'Inter', fontWeight: 500, fontSize: 132, lineHeight: 1.0, letterSpacing: -0.02, fill: '#14228c',
                anim: { enter: 'wall', delay: 1.6, speed: 1 }, wall: { fontFamily: 'Newsreader', fontWeight: 400, color: '#ffffff', scale: 1.14, beat: 0.36 }, time: { start: 1.6, end: 4.9 }, name: 'Word wall' }),
              line({ time: { start: 4.9 } }),
              txt('trust.', { x: 1016, cy: 536, align: 'left', fontFamily: 'Newsreader', fontWeight: 400, fontSize: 58, fill: '#2a45c8', anim: { enter: 'focus', delay: 5.0, speed: 1.2 }, time: { start: 4.9 }, name: 'Last word' }),
            ],
          };
        }),
      ];
    })(),

    // ── SCREEN CLOSE-UP: phrases typed on a tinted screen, and a comment thread, filmed through the pixel mesh ──
    ...(() => {
      const T = (id, name, w, h, build) => ({ id, name, tags: ['Video', 'Text', 'Typing'], width: w, height: h, video: true, build: () => { const d = build(); d.elements.forEach((e, i) => { if (!e.id) e.id = id + i; }); if (window.StudioRender) window.StudioRender.applyTypePlan(d); return d; } });
      const phrases = (W, H) => {
        const fs = Math.round(Math.min(W * 0.036, H * 0.06) * 10) / 10, pitch = Math.round(fs * 0.72 / 45 * 1000) / 1000, zoom = Math.round((W > H ? 4.8 : 4.1) / pitch * 100) / 100;
        return {
          width: W, height: H, anim: { duration: 8, fps: 30 },
          background: { color: '#b4d6da', color2: '#86b3ba', gradient: 'radial' },
          overlay: { grain: 7, vignette: 26 },
          screen: { on: true, pitch, grid: 78, focus: 42, dust: 6 },
          camera: { move: 'typecut', target: 'type', phrases: true, zoom, cps: 9, hold: 1.2, blur: 0, shake: 0.3 },
          elements: [
            txt('Something’s\nWRONG!\nmy iced coffee\ntastes OFF!', { key: 'type', cx: W / 2, cy: H / 2, width: W * 0.84, autoWidth: false, align: 'center', fontFamily: 'Arimo', fontWeight: 400, fontSize: fs, lineHeight: 1.25, letterSpacing: 0.01, fill: '#13262a',
              typing: { caret: true, pin: true, blink: true, caretWidth: 0.085, caretColor: '#10232a', marks: [] }, anim: { enter: 'typewriter', delay: 0 }, name: 'Typed phrases (one per line)' }),
          ],
        };
      };
      const thread = (W, H) => {
        const cx = W / 2, cy = H / 2, wide = W > H, Z = wide ? 2.4 : 1.6, ink = '#1c1f22', mute = '#576068', hv = W / (2 * Z) * 0.92;
        // one comment: avatar, a blurred user name, the words, and the action row
        const comment = (text, colour, a, b, dy) => {
          const x0 = cx - 260, y0 = cy - 70 + dy, t = { start: a, end: b };
          return [
            shp('ellipse', x0, y0, 64, 64, { fill: colour, time: t, name: 'Avatar' }),
            stk('ui-heart', x0 + 16, y0 + 16, 32, 32, { colors: ['rgba(255,255,255,0.75)'], time: t, name: 'Avatar mark' }),
            shp('rounded', x0 + 88, y0 + 10, 150, 22, { radius: 11, fill: '#aab2ba', lblur: { gauss: 5, motion: 0, angle: 0 }, time: t, name: 'User name (blurred)' }),
            txt(text, { x: x0 + 88, y: y0 + 50, align: 'left', fontFamily: 'Arimo', fontSize: 34, fill: ink, time: t, name: 'Comment' }),
            stk('ui-upvote', x0 + 86, y0 + 118, 34, 34, { colors: [mute], time: t }),
            stk('ui-downvote', x0 + 138, y0 + 118, 34, 34, { colors: [mute], time: t }),
            stk('ui-comment', x0 + 196, y0 + 118, 34, 34, { colors: [mute], time: t }),
            txt('Reply', { x: x0 + 238, y: y0 + 120, align: 'left', fontFamily: 'Arimo', fontWeight: 700, fontSize: 26, fill: mute, time: t }),
            stk('ui-share', x0 + 330, y0 + 118, 34, 34, { colors: [mute], time: t }),
            txt('Share', { x: x0 + 372, y: y0 + 120, align: 'left', fontFamily: 'Arimo', fontWeight: 700, fontSize: 26, fill: mute, time: t }),
          ];
        };
        return {
          width: W, height: H, anim: { duration: 5, fps: 30 },
          background: { color: '#eef2f5', color2: '#c9d3db', gradient: 'radial' },
          overlay: { grain: 7, vignette: 24 },
          screen: { on: true, pitch: Math.round(4.6 / Z * 100) / 100, grid: 76, focus: 40, dust: 6 },
          camera: { move: 'keys', blur: 0, shake: 0.3, keys: [{ t: 0, x: cx, y: cy - 20, z: Z, ease: 'linear' }, { t: 2.3, x: cx - 10, y: cy - 10, z: Z * 1.05, ease: 'linear' }, { t: 2.31, x: cx + 20, y: cy + 30, z: Z * 1.12, ease: 'linear' }, { t: 5, x: cx + 30, y: cy + 36, z: Z * 1.18, ease: 'linear' }] },
          elements: [
            // the top bar of a made-up forum app
            shp('rect', 0, cy - 214, W, 62, { fill: '#ffffff', fill2: '#f3f5f7', gradient: 'linear', gradAngle: 180, name: 'Top bar' }),
            txt('threadly', { x: cx - hv, y: cy - 202, align: 'left', fontFamily: 'Arimo', fontWeight: 700, fontSize: 30, fill: '#ff5a1f', name: 'App name' }),
            shp('rounded', cx - hv + 172, cy - 204, 2 * hv - 290, 40, { radius: 20, fill: '#e6eaee', name: 'Search' }),
            stk('ui-search', cx - hv + 186, cy - 197, 26, 26, { colors: [mute] }),
            txt('Find anything', { x: cx - hv + 222, y: cy - 196, align: 'left', fontFamily: 'Arimo', fontSize: 20, fill: '#98a1a9' }),
            stk('ui-bell', cx + hv - 82, cy - 199, 30, 30, { colors: [mute] }),
            stk('ui-more', cx + hv - 36, cy - 199, 30, 30, { colors: [mute] }),
            ...comment('what’s going on???', '#2fb35a', 0, 2.3, 0),
            ...comment('I thought i was the only one', '#2f8fb3', 2.3, null, 40),
          ],
        };
      };
      return [
        T('sc-phrases', 'Phrase typing — teal', 1920, 1080, () => phrases(1920, 1080)),
        T('sc-phrases-story', 'Phrase typing — story', 1080, 1920, () => phrases(1080, 1920)),
        T('sc-thread', 'Comment thread', 1920, 1080, () => thread(1920, 1080)),
        T('sc-thread-story', 'Comment thread — story', 1080, 1920, () => thread(1080, 1920)),
      ];
    })(),

    // ── TEXT EFFECTS: thermal-camera glow and ink soaking into paper ──
    ...(() => {
      const T = (id, name, tags, build, video) => ({ id, name, tags, width: 1080, height: 1350, video: !!video, build });
      const word = (t, o) => txt(t, Object.assign({ align: 'center', fontFamily: 'Inter Tight', fontWeight: 800, fontSize: 300, letterSpacing: -0.05, fill: '#ffffff' }, o));
      const ink = (t, o) => txt(t, Object.assign({ align: 'left', fontFamily: 'Archivo Black', fontSize: 190, letterSpacing: -0.07, lineHeight: 0.9, fill: '#141414', tfx: { style: 'ink', amount: 55, rough: 55, speckle: 60, smear: 30, angle: 25 } }, o));
      return [
        T('fx-thermal', 'Thermal word', ['Text', 'Video'], () => ({
          width: 1080, height: 1350, background: { color: '#030303' }, overlay: { grain: 18, vignette: 30 }, anim: { duration: 5, fps: 30 },
          camera: { move: 'pushin', zoom: 1.12, start: 0, dur: 5, blur: 0 },
          elements: [
            word('blur', { cx: 540, cy: 640, key: 'heat', tfx: { style: 'thermal', amount: 55, palette: 'thermal', move: true } }),
            txt('HEAT SIGNATURE · 36.6°', { cx: 540, cy: 1180, fontFamily: 'Space Mono', fontSize: 22, letterSpacing: 0.2, fill: '#7d86ff' }),
          ],
        }), true),
        T('fx-thermal-photo', 'Thermal over photo', ['Text', 'Photo'], () => ({
          width: 1080, height: 1350, background: { color: '#0b0b0b' }, overlay: { grain: 16 },
          elements: [
            img(0, 0, 1080, 1350, { assetId: 'ed-dark', name: 'Your photo or video', filters: { grayscale: 100, contrast: 20, brightness: -30 }, placeholder: ['#2a2a2a', '#111111'] }),
            word('warm', { cx: 540, cy: 1060, fontSize: 260, tfx: { style: 'thermal', amount: 45, palette: 'sunset' } }),
            txt('still thinking about you', { cx: 540, cy: 1250, fontFamily: 'Instrument Serif', italic: true, fontSize: 40, fill: '#ffd7b0' }),
          ],
        })),
        T('fx-night', 'Night vision', ['Text'], () => ({
          width: 1080, height: 1350, background: { color: '#020a04' }, overlay: { grain: 30, scanlines: 30, vignette: 45 },
          elements: [
            word('after\ndark', { cx: 540, cy: 620, fontSize: 230, lineHeight: 0.95, tfx: { style: 'thermal', amount: 40, palette: 'night' } }),
            txt('REC ● 02:14:09', { x: 70, y: 70, align: 'left', fontFamily: 'VT323', fontSize: 48, fill: '#8dff8a' }),
          ],
        })),
        T('fx-ink', 'Ink bleed poster', ['Text', 'Video', 'Paper'], () => ({
          width: 1080, height: 1350, background: { color: '#cbc9d2', texture: 70 }, overlay: { grain: 34 }, anim: { duration: 5, fps: 30 },
          camera: { move: 'pushin', target: 'bleed', zoom: 1.7, start: 0.4, dur: 3.6, blur: 0.4 },
          elements: [
            ink('INK', { x: 170, y: 470 }),
            ink('BLEED', { x: 350, y: 650, key: 'bleed' }),
            ink('EFFECT', { x: 100, y: 830 }),
          ],
        }), true),
        T('fx-ink-quote', 'Ink on paper', ['Text', 'Paper'], () => ({
          width: 1080, height: 1350, background: { color: '#efe9dc', texture: 55 }, overlay: { grain: 14 },
          elements: [
            txt('the words\nstay with\nyou', { x: 110, y: 330, align: 'left', fontFamily: 'Instrument Serif', fontSize: 210, lineHeight: 0.92, fill: '#1b2a7a', tfx: { style: 'ink', amount: 45, rough: 60, speckle: 45, smear: 10, angle: 0 } }),
            txt('— written in fountain pen, left in the rain', { x: 114, y: 1120, align: 'left', fontFamily: 'Courier Prime', fontSize: 26, fill: '#1b2a7a', tfx: { style: 'ink', amount: 30, rough: 40, speckle: 30, smear: 0 } }),
          ],
        })),
      ];
    })(),

    // ── PHOTO EFFECTS: editorial poster treatments — halftone scribbles, shredded strips, mosaics, mirrors, censor blocks ──
    ...(() => {
      const P = (asset, x, y, w, h, o) => img(x, y, w, h, Object.assign({ assetId: 'ed-' + asset, name: 'Your photo or video', placeholder: ['#d6d1c7', '#8c877c'] }, o || {}));
      const BW = extra => Object.assign({ grayscale: 100, contrast: 16 }, extra || {});
      const HALF = extra => Object.assign({ grayscale: 100, contrast: 38, brightness: 12, halftone: 16 }, extra || {});
      const mono = (t, o) => txt(t, Object.assign({ fontFamily: 'Space Mono', fontSize: 20, fill: '#1d1b18', letterSpacing: 0.06 }, o));
      const scrib = (path, x, y, w, h, o) => rib(path, x, y, w, h, Object.assign({ line: true, thickness: 16, color: '#f5d32a', text: '', name: 'Marker scribble' }, o));
      const arrowL = (x, y, w, h, o) => rib('hook', x, y, w, h, Object.assign({ line: true, thickness: 3, color: '#1d1b18', text: '', arrowEnd: true, name: 'Arrow' }, o));
      const T = (id, name, tags, build, o = {}) => ({ id, name, tags, width: o.w || 1080, height: o.h || 1350, build });
      const doc = (bg, elements, overlay) => ({ width: 1080, height: 1350, background: bg, overlay: overlay || { grain: 14 }, elements });
      const words = 'A film about turning life into a performance and calling it cinematic through humor and honesty this exposes the irony of chasing authenticity and the insecurity beneath the perfect frame'.split(' ');
      return [
        T('px-scribble', 'Halftone scribble', ['Photo', 'Paper'], () => doc({ color: '#ece9e2' }, [
          P('youth', 0, 0, 1080, 1350, { filters: HALF() }),
          scrib('circle', 250, 330, 260, 200, { rotation: -8 }),
          scrib('cross', 610, 300, 230, 230, { rotation: 6 }),
          scrib('scribble', 60, 940, 470, 330, { thickness: 20, rotation: -12 }),
          scrib('swoosh', 390, 690, 300, 110, { thickness: 14, rotation: 4 }),
          mono('@yourname  instagram', { x: 60, y: 1280, align: 'left', fontSize: 22, fill: '#1d1b18' }),
        ], { grain: 10 })),
        T('px-strips', 'Shredded', ['Photo'], () => doc({ color: '#c9302c', texture: 35 }, [
          mono('YOUR NAME', { cx: 540, cy: 170, fill: '#ffffff', fontSize: 22, letterSpacing: 0.3 }),
          P('plain', 170, 270, 740, 800, { filters: BW({ contrast: 22 }), frame: { style: 'strips', color: '#ffffff', size: 10, count: 7, amount: 65 } }),
          txt('DO THAT AGAIN', { cx: 540, cy: 1180, fontFamily: 'Arimo', fontWeight: 700, fontSize: 24, letterSpacing: 0.1, fill: '#ffffff' }),
          mono('SIDE A', { x: 50, y: 1280, align: 'left', fill: '#ffffff', fontSize: 16 }), mono('NO. 01', { x: 950, y: 1280, align: 'left', fill: '#ffffff', fontSize: 16 }),
        ])),
        T('px-mosaic', 'Mosaic grid', ['Photo'], () => doc({ color: '#f2efe9' }, [
          P('youth', 50, 50, 980, 1250, { filters: BW({ contrast: 20 }), frame: { style: 'mosaic', color: '#ffffff', size: 6, count: 6, amount: 60 } }),
          txt('Kids play while\nthe city sleeps.', { x: 120, y: 900, align: 'left', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 24, lineHeight: 1.2, fill: '#ffffff', bg: { style: 'box', color: '#2b52c8', padX: 18, padY: 12 } }),
        ])),
        T('px-mirror', 'Mirror repeat', ['Photo'], () => doc({ color: '#f4f4f2' }, [
          mono('PORTRAIT SERIES', { x: 50, y: 70, align: 'left', fontSize: 18 }), mono('26/10/11', { x: 900, y: 70, align: 'left', fontSize: 18 }),
          P('idman', 0, 200, 1080, 780, { filters: BW({ contrast: 10, brightness: 4 }), frame: { style: 'mirror', color: '#ffffff', size: 8, amount: 55 } }),
          txt('the one who stayed', { x: 70, y: 1010, align: 'left', fontFamily: 'Caveat', fontWeight: 600, fontSize: 46, fill: '#1d1b18', rotation: -4 }),
          arrowL(250, 960, 150, 70, { rotation: -150 }),
          txt('YOUR NAME', { cx: 640, cy: 1150, fontFamily: 'Archivo Black', fontSize: 88, fill: '#1d1b18' }),
          txt('YOUR NAME', { cx: 640, cy: 1240, fontFamily: 'Archivo Black', fontSize: 88, fill: '#1d1b18', opacity: 0.18, flipY: true, name: 'Reflection' }),
        ], { grain: 12 })),
        T('px-eyes', 'Eye strip', ['Photo', 'Paper'], () => doc({ color: '#c8241f', texture: 45 }, [
          txt('A SLOW RETURN', { cx: 540, cy: 520, fontFamily: 'Permanent Marker', fontSize: 92, fill: '#f6f1ea', rotation: -2 }),
          P('youth', 200, 600, 680, 170, { crop: { zoom: 1.05, x: 0.5, y: 0.43 }, filters: { contrast: 8, warmth: 6 } }),
          txt('TO', { x: 210, y: 800, align: 'left', fontFamily: 'Permanent Marker', fontSize: 52, fill: '#f6f1ea' }),
          txt('SKETCHING.', { cx: 580, cy: 900, fontFamily: 'Permanent Marker', fontSize: 104, fill: '#f6f1ea', rotation: 2 }),
        ], { grain: 18 })),
        T('px-childhood', 'Then & now', ['Photo'], () => doc({ color: '#0d0d0d' }, [
          P('dark', 0, 0, 1080, 1350, { filters: BW({ contrast: 24, brightness: -6 }) }),
          P('kid1', 300, 440, 150, 150, { filters: BW({ contrast: 10 }), name: 'Childhood photo' }),
          P('kid2', 465, 440, 150, 150, { filters: BW({ contrast: 10 }), name: 'Childhood photo' }),
          P('kid3', 630, 440, 150, 150, { filters: BW({ contrast: 10 }), name: 'Childhood photo' }),
          txt('portrait of the artist as a young man', { cx: 540, cy: 1160, fontFamily: 'Courier Prime', fontSize: 26, fill: '#d0322b' }),
          txt('a film by you\nshot on a tuesday', { cx: 540, cy: 1230, fontFamily: 'Courier Prime', fontSize: 18, lineHeight: 1.3, fill: '#d0322b', opacity: 0.8 }),
        ], { grain: 22 })),
        T('px-faceswap', 'Face swap', ['Photo', 'Paper'], () => doc({ color: '#8e1f1a', texture: 60 }, [
          P('think', 0, 0, 1080, 1350, { filters: BW({ contrast: 18 }), opacity: 0.95 }),
          P('kid1', 380, 300, 320, 360, { filters: { contrast: 6, warmth: 8 }, name: 'Face photo', shadow: { on: true, color: '#000000', opacity: 0.35, blur: 16, x: 0, y: 8 } }),
        ], { grain: 16 })),
        T('px-ghost', 'Ghost blur', ['Photo'], () => doc({ color: '#d9d7d2', texture: 55 }, [
          P('plain', 120, 140, 840, 1080, { filters: { grayscale: 100, contrast: 14, motion: 70, motionAngle: 90, fade: 8 } }),
          mono('STUDIO\nCOUTURE\nARCHIVE', { x: 780, y: 620, align: 'left', fontSize: 15, lineHeight: 1.3, fill: '#efece6' }),
          mono('DIGITAL\nCONTENT\nSTUDIO', { x: 900, y: 620, align: 'left', fontSize: 15, lineHeight: 1.3, fill: '#efece6' }),
        ], { grain: 40, vignette: 20 })),
        T('px-censor', 'How much can you see', ['Photo'], () => doc({ color: '#cfcfcf' }, [
          P('youth', 0, 0, 1080, 1350, { filters: BW({ contrast: 20 }) }),
          shp('rect', 0, 130, 470, 560, { fill: '#d6262b', name: 'Red block' }),
          txt('HOW\nMUCH\nCAN\nYOU\nSEE?', { x: 120, y: 190, align: 'left', fontFamily: 'Archivo Black', fontSize: 86, lineHeight: 0.98, fill: '#ffffff' }),
          ...[['and', 860, 120], ['why', 700, 330], ['you', 880, 560], ['keep', 600, 900], ['looking', 880, 1180]].map(([w, x, y]) => txt(w, { cx: x, cy: y, fontFamily: 'Arimo', fontWeight: 700, fontSize: 34, fill: '#d6262b' })),
        ], { grain: 14 })),
        T('px-words', 'Word grid', ['Photo'], () => doc({ color: '#0f2b30' }, [
          P('think', 0, 0, 1080, 1350, { filters: { saturation: -40, splitTone: 80, toneShadow: '#0e4f5c', toneHigh: '#9fd3d6', contrast: 8, exposure: -18 } }),
          ...words.map((w, i) => txt(w.toUpperCase(), { cx: [130, 540, 950][i % 3], cy: 190 + Math.floor(i / 3) * 84, fontFamily: 'Arimo', fontWeight: 700, fontSize: 21, letterSpacing: 0.08, fill: '#f2f2ee', name: 'Word' })),
        ], { grain: 20, vignette: 25 })),
        T('px-brandfade', 'Brand fade', ['Photo'], () => doc({ color: '#000000' }, [
          P('dark', 0, 0, 1080, 1350, { filters: BW({ contrast: 18 }) }),
          shp('rect', 0, 760, 1080, 590, { fill: 'rgba(0,0,0,0)', fill2: '#000000', gradient: 'linear', gradAngle: 180, name: 'Fade to black' }),
          mono('ART DIRECTION\nBRANDING\nDESIGN', { x: 820, y: 80, align: 'left', fontSize: 16, lineHeight: 1.3, fill: '#ffffff' }),
          txt('Afterglow®', { cx: 540, cy: 760, fontFamily: 'Inter Tight', fontWeight: 700, fontSize: 132, letterSpacing: -0.02, fill: '#ffffff' }),
          mono('yourstudio.co', { x: 820, y: 170, align: 'left', fontSize: 16, fill: '#ffffff', opacity: 0.7 }),
        ], { grain: 16 })),
        T('px-redbar', 'Red bar', ['Photo'], () => doc({ color: '#f1f0ec' }, [
          P('youth', 300, 330, 480, 620, { filters: BW({ contrast: 12 }) }),
          shp('rect', 286, 330, 18, 620, { fill: '#d6262b', name: 'Red bar' }),
          txt('Your Name', { cx: 170, cy: 640, fontFamily: 'Inter', fontWeight: 500, fontSize: 22, fill: '#1d1b18' }),
          txt('Studio', { cx: 900, cy: 640, fontFamily: 'Inter', fontWeight: 500, fontSize: 22, fill: '#1d1b18' }),
        ], { grain: 8 })),
        T('px-note', 'Note over face', ['Photo', 'Paper'], () => doc({ color: '#222222' }, [
          P('dark', 0, 0, 1080, 1350, { filters: HALF({ brightness: 4, halftone: 12 }) }),
          shp('rect', 330, 330, 420, 540, { fill: '#d9d5c4', texture: 55, rotation: -1, shadow: { on: true, color: '#000000', opacity: 0.4, blur: 26, x: 0, y: 12 }, name: 'Paper note' }),
          stk('binder-clip', 495, 270, 90, 110, { name: 'Clip' }),
          txt('YOUR NAME', { cx: 538, cy: 480, fontFamily: 'Special Elite', fontSize: 40, fill: '#1d1b18', rotation: -1 }),
          txt('Portfolio', { cx: 540, cy: 640, fontFamily: 'Homemade Apple', fontSize: 66, fill: '#1d1b18', rotation: -8 }),
        ], { grain: 14 })),
        T('px-phone', 'Retro phone', ['Photo'], () => doc({ color: '#171614' }, [
          shp('rounded', 70, 140, 940, 1070, { radius: 46, fill: '#f6a21e', fill2: '#e8601a', gradient: 'radial', name: 'Screen' }),
          P('red', 120, 270, 840, 800, { filters: { grayscale: 100, contrast: 25, brightness: 10 }, blend: 'multiply' }),
          txt('Tıl ✉', { x: 120, y: 172, align: 'left', fontFamily: 'VT323', fontSize: 64, fill: '#1d1208' }),
          txt('10:34 ▮', { x: 790, y: 172, align: 'left', fontFamily: 'VT323', fontSize: 60, fill: '#1d1208' }),
          txt('Menu', { x: 120, y: 1100, align: 'left', fontFamily: 'VT323', fontSize: 64, fill: '#1d1208' }),
          txt('YourTune', { cx: 540, cy: 1135, fontFamily: 'VT323', fontSize: 64, fill: '#1d1208' }),
          txt('Back', { x: 840, y: 1100, align: 'left', fontFamily: 'VT323', fontSize: 64, fill: '#1d1208' }),
        ], { grain: 14, scanlines: 25, vignette: 30 })),
        T('px-signed', 'Signed booth', ['Photo'], () => doc({ color: '#ffffff' }, [
          ...[['youth', 30, 30], ['curls', 545, 30], ['smile', 30, 470], ['yellow', 545, 470], ['think', 30, 910]].map(([a, x, y], i) => P(a, x, y, 505, 430, { filters: { contrast: 6, saturation: -10 } })),
          ...[[60, 50, -8], [580, 60, -12], [70, 490, -6], [600, 500, -10], [70, 930, -8]].map(([x, y, r], i) => txt(['Alex', 'Mira', 'Jonah', 'Sam', 'Kenji'][i], { x, y, align: 'left', fontFamily: 'Mrs Saint Delafield', fontSize: 92, fill: '#111111', rotation: r, name: 'Signature' })),
          txt('Alex, Mira,\nJonah, Sam,\nKenji', { x: 580, y: 940, align: 'left', fontFamily: 'EB Garamond', fontSize: 34, lineHeight: 1.15, fill: '#1d1b18' }),
          { type: 'badge', x: 930, y: 1200, width: 90, height: 90, shape: 'circle', fill: 'rgba(0,0,0,0)', borderWidth: 4, borderColor: '#1d1b18', ringText: '', center: 'text', centerText: 'YS', centerFont: 'Archivo Black', centerWeight: 400, centerSize: 0.34, centerColor: '#1d1b18', name: 'Logo' },
        ], { grain: 6 })),
        T('px-taped', 'Taped to the wall', ['Photo', 'Paper'], () => doc({ color: '#cbc8c2', texture: 75 }, [
          P('suit', 390, 600, 300, 400, { filters: { contrast: 8, saturation: -10 }, frame: { style: 'border', color: '#f7f4ee', size: 10 }, shadow: { on: true, color: '#000000', opacity: 0.22, blur: 12, x: 0, y: 6 } }),
          stk('tape-masking', 578, 545, 170, 70, { rotation: 90, name: 'Tape' }),
        ], { grain: 16 })),
        T('px-redprint', 'Print on red', ['Photo', 'Paper'], () => doc({ color: '#9e1119', texture: 30 }, [
          P('curls', 330, 380, 420, 540, { filters: { contrast: 6, warmth: 4 }, frame: { style: 'border', color: '#f7f4ee', size: 22 }, shadow: { on: true, color: '#000000', opacity: 0.35, blur: 22, x: 0, y: 12 } }),
          stk('tape-masking', 470, 330, 150, 70, { rotation: -6, name: 'Tape' }),
        ], { grain: 14 })),
        T('px-backdrop', 'Studio backdrop', ['Photo', 'Paper'], () => doc({ color: '#e9e6df', texture: 25 }, [
          P('stool', 120, 120, 840, 980, { filters: BW({ contrast: 14 }), frame: { style: 'border', color: '#f7f5f0', size: 18 }, shadow: { on: true, color: '#000000', opacity: 0.12, blur: 20, x: 0, y: 8 } }),
          arrowL(150, 560, 140, 60, { rotation: 200 }), arrowL(800, 520, 140, 60, { rotation: -20 }),
          txt('quiet day', { x: 690, y: 400, align: 'left', fontFamily: 'Caveat', fontWeight: 600, fontSize: 52, fill: '#1d1b18', rotation: -6 }),
          txt('Studio Notes', { cx: 540, cy: 1160, fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 40, fill: '#1d1b18' }),
          txt('Shot on the first cold morning.\nSoft light, one stool, no plan.', { cx: 540, cy: 1230, fontFamily: 'Inter', fontSize: 18, lineHeight: 1.35, fill: '#4a4640' }),
        ], { grain: 10 })),
        T('px-gridpaper', 'Grid paper portrait', ['Photo', 'Paper'], () => doc({ color: '#f5f5f2', pattern: { type: 'grid', color: 'rgba(40,40,40,0.08)', size: 40, thick: 1, opacity: 1 } }, [
          shp('rect', 120, 330, 840, 600, { fill: '#ffffff', stroke: '#e8b4c8', strokeWidth: 3, shadow: { on: true, color: '#000000', opacity: 0.08, blur: 16, x: 0, y: 6 }, name: 'Card' }),
          P('idwoman', 330, 380, 420, 550, { filters: BW({ contrast: 8 }) }),
          ...['#f08ab8', '#7aa9e8', '#a98be8', '#f2d33c', '#8fd18a'].map((c, i) => shp('rounded', 690 + i * 50, 352, 40, 14, { radius: 7, fill: c, name: 'Tab' })),
          txt('hi, I’m a…', { x: 160, y: 560, align: 'left', fontFamily: 'Caveat', fontWeight: 600, fontSize: 44, fill: '#1d1b18' }),
          mono('Creative', { x: 230, y: 470, align: 'left', fontSize: 16 }), mono('Director', { x: 790, y: 560, align: 'left', fontSize: 16 }),
          txt('living and working\nin NYC', { x: 780, y: 640, align: 'left', fontFamily: 'Caveat', fontWeight: 600, fontSize: 34, lineHeight: 1, fill: '#1d1b18' }),
          mono('YOUR NAME  ·  2026', { x: 140, y: 350, align: 'left', fontSize: 14, fontWeight: 700 }),
        ], { grain: 6 })),
        ...handwritten(),
      ];
      // ── handwritten journal pages: ink scrawl, pen capitals and marker notes around the photos ──
      function handwritten() {
        const F = (asset, x, y, w, h, o) => img(x, y, w, h, Object.assign({ assetId: 'film-' + asset, name: 'Your photo or video', placeholder: ['#d6d1c7', '#8c877c'] }, o || {}));
        const hand = (t, font, size, color, o) => txt(t, Object.assign({ align: 'left', fontFamily: font, fontSize: size, fill: color, lineHeight: 1.2 }, o));
        const soft = { on: true, color: '#000000', opacity: 0.16, blur: 18, x: 0, y: 8 };
        const pola = (size = 26) => ({ style: 'polaroid', color: '#f6f5f1', size, bottom: 3.6 });
        const pen = (x, y, w, h, pts, o) => rib('straight', x, y, w, h, Object.assign({ points: pts, line: true, thickness: 3, color: '#1d1b18', text: '', name: 'Pen line' }, o));
        // a point (lx, ly) inside a box whose top-left is (X, Y), turned by deg around that corner
        const turn = (X, Y, deg, lx, ly) => { const a = deg * Math.PI / 180; return [X + lx * Math.cos(a) - ly * Math.sin(a), Y + lx * Math.sin(a) + ly * Math.cos(a)]; };
        const INK = '#151413', BLUE = '#2f3c9e', RED = '#d42a2c';
        const LOOK = (k, extra) => Object.assign(JSON.parse(JSON.stringify(window.StudioRender.FILTER_PRESETS[k].f)), extra || {});
        return [
          T('px-letter', 'Ink letter', ['Photo', 'Paper', 'Handwritten'], () => doc({ color: '#fbfbf9' }, [
            hand('This is temporary\nyou’re gonna make it\ncount the days with\nfear and wonder\nthen let them go…\nfear can creep in.\nDon’t let it come\nfor you! You will\ncalm the storms', 'Zeyada', 118, INK, { x: 70, y: 90, lineHeight: 1.1, letterSpacing: 0.07, rotation: -1, name: 'Handwriting' }),
            P('think', 300, 500, 500, 360, { crop: { zoom: 1.25, x: 0.5, y: 0.62 }, filters: BW({ contrast: 30, brightness: 6 }) }),
          ], { grain: 6 })),
          T('px-touch', 'Stay in touch', ['Photo', 'Paper', 'Handwritten'], () => doc({ color: '#f5f5f4', color2: '#d4d4d2', gradient: 'linear', angle: 180 }, [
            F('friends', 240, 90, 580, 640, { rotation: 3, crop: { zoom: 1.35, x: 0.55, y: 0.5 }, filters: LOOK('expired', { fade: 14 }), frame: pola(30), shadow: soft }),
            hand('IF', 'The Girl Next Door', 76, BLUE, { x: 330, y: 880, rotation: -2 }),
            hand('WE  STAY', 'The Girl Next Door', 76, BLUE, { x: 330, y: 990, rotation: -2 }),
            hand('IN  TOUCH .', 'The Girl Next Door', 76, BLUE, { x: 400, y: 1100, rotation: -2 }),
          ], { grain: 10 })),
          T('px-fieldnotes', 'Field notes', ['Photo', 'Paper', 'Handwritten'], () => doc({ color: '#f1f0ec', texture: 18 }, [
            F('grass', 300, 60, 560, 640, { crop: { zoom: 1.6, x: 0.38, y: 0.5 }, filters: { fade: 22, brightness: 10, contrast: -8, saturation: -18, warmth: -6, noise: 8 } }),
            pen(276, 20, 20, 790, [[0.5, 0], [0.4, 1]]), pen(864, 20, 20, 720, [[0.5, 0], [0.6, 1]]), pen(220, 696, 720, 20, [[0, 0.4], [1, 0.6]]),
            hand('WAIT!  I HAVE SOMETHING\nTO SAY TO PEOPLE\nWHO ARE STRUGGLING ×2\nWE’RE NOT MACHINES\nBUT WE NEED TO REBOOT\nTHE BRAIN,', 'Covered By Your Grace', 38, INK, { x: 640, y: 92, lineHeight: 1.3, name: 'Notes' }),
            stk('pen-circle', 626, 90, 100, 52, { name: 'Pen circle' }),
            stk('pen-mark', 130, 360, 50, 64, { rotation: 10 }),
            hand('I’M THE ONE\nWHO TURNED THE\nSWITCH ON', 'Covered By Your Grace', 38, INK, { x: 120, y: 960, lineHeight: 1.4 }),
            hand('WE HAVE TO\nSWITCH IT OFF\nSOMETIMES,', 'Covered By Your Grace', 38, INK, { x: 680, y: 940, lineHeight: 1.4, underline: true }),
          ], { grain: 8 })),
          T('px-quote', 'Quote & booth strip', ['Photo', 'Paper', 'Handwritten'], () => {
            const X = 470, Y = 380, R = -8, sw = 160, ph = 168;
            const strip = [shp('rect', X, Y, sw, 3 * ph + 52, { rotation: R, fill: '#121212', shadow: { on: true, color: '#000000', opacity: 0.22, blur: 10, x: 0, y: 4 }, name: 'Booth strip' })];
            ['smile', 'kiss', 'friends'].forEach((a, i) => { const [x, y] = turn(X, Y, R, 12, 14 + i * (ph + 12)); strip.push(F(a, x, y, sw - 24, ph, { rotation: R, filters: BW({ contrast: 22 }) })); });
            return doc({ color: '#cfcbc1', texture: 15 }, [
              ...strip,
              hand('No one can', 'Whisper', 118, '#4469b3', { cx: 470, cy: 470, name: 'Quote' }),
              hand('make     you feel', 'Whisper', 118, '#4469b3', { cx: 560, cy: 620, name: 'Quote' }),
              hand('inferior     without', 'Whisper', 118, '#4469b3', { cx: 530, cy: 770, name: 'Quote' }),
              hand('your consent.', 'Whisper', 118, '#4469b3', { cx: 570, cy: 920, name: 'Quote' }),
              txt('Eleanor Roosevelt', { cx: 540, cy: 1030, fontFamily: 'EB Garamond', fontSize: 22, fill: '#4469b3', name: 'Who said it' }),
            ], { grain: 10 });
          }),
          T('px-belonged', 'Red marker notes', ['Photo', 'Paper', 'Handwritten'], () => doc({ color: '#ececeb', texture: 12 }, [
            P('profile', 100, 140, 480, 560, { rotation: -1, crop: { zoom: 1.1, x: 0.5, y: 0.4 }, filters: BW({ contrast: 26, brightness: -6 }), frame: pola(28), shadow: soft }),
            P('dark', 480, 560, 470, 560, { rotation: 1, crop: { zoom: 1.15, x: 0.5, y: 0.35 }, filters: BW({ contrast: 22 }), frame: pola(28), shadow: soft }),
            hand('from the moment\n  i saw you', 'Marck Script', 92, RED, { x: 430, y: 360, rotation: -12, lineHeight: 1.05, stroke: { width: 1, color: RED }, name: 'Marker note' }),
            hand('i have belonged', 'Marck Script', 92, RED, { x: 70, y: 860, rotation: -10, stroke: { width: 1, color: RED }, name: 'Marker note' }),
            hand('to you', 'Marck Script', 92, RED, { x: 190, y: 960, rotation: -10, stroke: { width: 1, color: RED }, name: 'Marker note' }),
            hand('Completely.', 'Marck Script', 100, RED, { x: 110, y: 1090, rotation: -10, stroke: { width: 1, color: RED }, name: 'Marker note' }),
          ], { grain: 12 })),
          T('px-worthy', 'Worthy', ['Photo', 'Handwritten'], () => doc({ color: '#e9e9ea', texture: 10 }, [
            F('station', 170, 330, 740, 640, { crop: { zoom: 1.2, x: 0.5, y: 0.5 }, filters: LOOK('portrait', { fade: 10 }) }),
            hand('worthy', 'Nanum Brush Script', 250, '#d9393e', { cx: 520, cy: 300, rotation: -3, name: 'Word' }),
            rib('straight', 150, 760, 800, 80, { points: [[0, 0.9], [1, 0.12]], line: true, thickness: 7, color: '#d9393e', text: '', name: 'Strike line' }),
            hand('of all of it', 'Nanum Brush Script', 150, '#d9393e', { cx: 560, cy: 1080, rotation: -3, name: 'Word' }),
          ], { grain: 10 })),
          T('px-margins', 'Margin scribbles', ['Photo', 'Paper', 'Handwritten'], () => doc({ color: '#ececec', texture: 14 }, [
            P('think', 250, 290, 580, 780, { crop: { zoom: 1.4, x: 0.42, y: 0.5 }, filters: BW({ contrast: 28 }), frame: { style: 'border', color: '#f4f4f2', size: 6 } }),
            hand('that stuff is OK', 'Kristi', 120, INK, { x: 290, y: 150, rotation: -3, name: 'Headline' }),
            hand('being sad', 'Reenie Beanie', 40, INK, { x: 150, y: 230, rotation: -32 }),
            hand('i don’t wanna be angry', 'Reenie Beanie', 40, INK, { x: 660, y: 240, rotation: -2 }),
            hand('it’s only human · i can’t let you go · it is good to feel', 'Reenie Beanie', 42, INK, { x: 196, y: 1066, rotation: -90, name: 'Left edge' }),
            hand('finally you found yourself a friend', 'Reenie Beanie', 42, INK, { x: 892, y: 300, rotation: 90, name: 'Right edge' }),
            hand('and it’s ok.', 'Reenie Beanie', 44, INK, { x: 620, y: 1090, rotation: -2 }),
          ], { grain: 10 })),
          T('px-sketchbook', 'Sketchbook story', ['Photo', 'Paper', 'Handwritten'], () => doc({ color: '#f3f2ee', texture: 10 }, [
            F('lamp', 110, 660, 600, 520, { crop: { zoom: 1.2, x: 0.45, y: 0.5 }, filters: LOOK('portrait', { fade: 18, saturation: -12 }) }),
            stk('pen-lamp', 700, 0, 200, 312, { name: 'Pen sketch' }),
            stk('pen-vase', 650, 840, 220, 314, { name: 'Pen sketch' }),
            stk('pen-clock', 870, 1000, 150, 150, { name: 'Pen sketch' }),
            hand('A story of', 'Dawning of a New Day', 92, INK, { x: 330, y: 420, rotation: -4 }),
            hand('curiosity,', 'Dawning of a New Day', 92, INK, { x: 470, y: 540, rotation: -6 }),
            hand('creativity,', 'Dawning of a New Day', 92, INK, { x: 360, y: 640, rotation: -4 }),
          ], { grain: 6 })),
        ];
      }
    })(),

    // ── PAPER & ID: documents, cards and stamps built around a portrait ──
    ...(() => {
      const P = (asset, x, y, w, h, o) => img(x, y, w, h, Object.assign({ assetId: 'ed-' + asset, name: 'Your photo or video', placeholder: ['#d6d1c7', '#8c877c'] }, o || {}));
      const BW = extra => Object.assign({ grayscale: 100, contrast: 16 }, extra || {});
      const mono = (t, o) => txt(t, Object.assign({ fontFamily: 'Space Mono', fontSize: 22, fill: '#1d1b18', align: 'left' }, o));
      const T = (id, name, tags, build) => ({ id, name, tags, width: 1080, height: 1350, build });
      const doc = (bg, elements, overlay) => ({ width: 1080, height: 1350, background: bg, overlay: overlay || { grain: 14 }, elements });
      const stamp = (text, x, y, s, color, o) => Object.assign({ type: 'badge', x, y, width: s, height: s, shape: 'circle', fill: 'rgba(0,0,0,0)', borderWidth: Math.round(s * 0.03), borderColor: color, innerRing: true, textColor: color,
        ringText: text, ringFont: 'Courier Prime', ringWeight: 700, ringSize: 0.1, ringSpacing: 0.05, ringRadius: 0.76, ringFill: true, center: 'text', centerText: '★', centerFont: 'Archivo Black', centerWeight: 400, centerSize: 0.22, centerColor: color, blend: 'multiply', opacity: 0.8, name: 'Rubber stamp' }, o || {});
      const rule = (x, y, w, h, o) => shp('rect', x, y, w, h, Object.assign({ fill: '#1d1b18', name: 'Rule' }, o || {}));
      // ten fingerprint boxes: a frame with a loose spiral inside each
      const prints = (x0, y0, size, gap, color) => [].concat(...Array.from({ length: 10 }, (_, i) => {
        const x = x0 + (i % 5) * (size + gap), y = y0 + Math.floor(i / 5) * (size + gap);
        return [shp('rect', x, y, size, size, { fill: 'rgba(0,0,0,0)', stroke: color, strokeWidth: 2, name: 'Print box' }),
          rib('spiral', x + size * 0.18, y + size * 0.14, size * 0.64, size * 0.72, { line: true, thickness: 2.5, color, text: '', opacity: 0.75, rotation: (i * 37) % 30 - 15, name: 'Fingerprint' })];
      }));
      const chart = (x, y, w, h) => [shp('rect', x, y, w, h, { fill: '#e9e8e4', pattern: { type: 'lined', color: 'rgba(30,30,30,0.35)', size: 26, thick: 1.5, opacity: 1 }, name: 'Height chart' }),
        txt(Array.from({ length: Math.floor(h / 52) }, (_, i) => 190 - i * 5).join('\n'), { x: x + w + 8, y: y + 4, align: 'left', fontFamily: 'Space Mono', fontSize: 14, lineHeight: 2.6, fill: '#3a3835', name: 'Heights' })];
      return [
        T('pid-certificate', 'Certificate', ['Photo', 'Paper'], () => doc({ color: '#e8e8e3', texture: 45 }, [
          txt('CERTIFICATE OF RECOGNITION', { cx: 540, cy: 140, fontFamily: 'EB Garamond', fontWeight: 600, fontSize: 34, letterSpacing: 0.16, fill: '#1d1b18' }),
          rule(90, 200, 900, 3), rule(90, 1030, 900, 3),
          rule(870, 200, 3, 1100), txt('E', { x: 40, y: 560, align: 'left', fontFamily: 'EB Garamond', fontSize: 90, fill: '#1d1b18' }),
          P('idman', 300, 290, 460, 620, { filters: BW({ contrast: 10 }), frame: { style: 'border', color: '#1d1b18', size: 2 } }),
          txt('CERTIFICATE NO', { x: 150, y: 1060, align: 'left', fontFamily: 'EB Garamond', fontWeight: 700, fontSize: 52, fill: '#1d1b18' }),
          txt('42608231', { x: 300, y: 1160, align: 'left', fontFamily: 'Courier Prime', fontWeight: 700, fontSize: 56, fill: '#1d1b18' }),
        ], { grain: 10 })),
        T('pid-mugshot', 'Mugshot record', ['Photo', 'Paper'], () => doc({ color: '#d9d7d2', texture: 55 }, [
          txt('#K0383737171047291', { x: 60, y: 60, align: 'left', fontFamily: 'Arimo', fontWeight: 700, fontSize: 30, fill: '#1d1b18' }),
          rule(60, 110, 420, 3),
          mono('Name: Your Name\nRecord ID: 8Bc9013383612\nHeight: 5\'11"\nAge: 20\nCharge: Stealing the show', { x: 60, y: 140, fontSize: 24, lineHeight: 1.75 }),
          ...chart(540, 60, 420, 600),
          P('youth', 590, 120, 330, 540, { filters: BW({ contrast: 18 }), crop: { zoom: 1.1, x: 0.5, y: 0.3 } }),
          stamp('RECORDS · OFFICE · FILED · ', 70, 470, 220, '#3a3a3a', { rotation: -14 }),
          rule(60, 760, 960, 2), txt('Fingerprints:', { x: 60, y: 790, align: 'left', fontFamily: 'Arimo', fontWeight: 700, fontSize: 34, fill: '#1d1b18' }),
          ...prints(60, 860, 150, 14, '#2c2a27'),
          stamp('CENTRAL · RECORDS · OFFICE · ', 840, 1120, 170, '#1d1b18', { centerText: 'CRO', centerSize: 0.2, opacity: 0.85, rotation: 8 }),
          mono('Office of Records and Archives', { x: 60, y: 1250, fontSize: 18, fill: '#4a4640' }),
        ], { grain: 16 })),
        T('pid-record', 'Personal record', ['Photo', 'Paper'], () => doc({ color: '#f4f3ef', texture: 20 }, [
          stamp('CENTRAL · RECORDS · ', 60, 50, 110, '#1d1b18', { centerText: '✦', opacity: 0.9, blend: 'normal' }),
          txt('Central Records Office\nPERSONAL RECORD', { x: 190, y: 70, align: 'left', fontFamily: 'Arimo', fontWeight: 700, fontSize: 24, lineHeight: 1.25, fill: '#1d1b18' }),
          mono('FILE NUMBER   #59K2063-531\nPURPOSE       G-123874-9(F)\nORG ID        K007', { x: 600, y: 70, fontSize: 17, lineHeight: 1.6 }),
          rule(60, 190, 960, 2),
          mono('#KTT0903198900050807\nNAME: YOUR NAME\nRECORD ID: T13S912309\nPRONOUNS: SHE/HER\nAGE: SEVENTEEN\nNATIONALITY: ANYWHERE\nMBTI: INFJ-T', { x: 60, y: 220, fontSize: 21, lineHeight: 1.65, fontWeight: 700 }),
          ...chart(600, 220, 330, 420),
          P('idwoman', 630, 240, 270, 400, { filters: BW({ contrast: 12 }) }),
          txt('FAVS...', { x: 60, y: 560, align: 'left', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 40, fill: '#1d1b18' }),
          mono('BANDS — two of them, on repeat\nFILMS — anything with a train in it\nFOOD — noodles, always\nCOLOUR — the blue at 6pm', { x: 60, y: 630, fontSize: 19, lineHeight: 1.6 }),
          txt('FINGERTIPS...', { x: 60, y: 830, align: 'left', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 40, fill: '#1d1b18' }),
          ...prints(60, 900, 92, 10, '#2c2a27'),
          txt('LIKES', { x: 600, y: 900, align: 'left', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 26, fill: '#1d1b18' }),
          mono('slow mornings, film cameras,\nnotes in the margins', { x: 600, y: 940, fontSize: 17, lineHeight: 1.5 }),
          txt('DISLIKES', { x: 600, y: 1030, align: 'left', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 26, fill: '#1d1b18' }),
          mono('people who spoil endings,\ncold coffee', { x: 600, y: 1070, fontSize: 17, lineHeight: 1.5 }),
          mono('[ made with care ]', { cx: 540, cy: 1270, align: 'center', fontSize: 18, fill: '#6b655b' }),
        ], { grain: 8 })),
        T('pid-badge', 'ID badge', ['Photo', 'Paper'], () => doc({ color: '#efefed' }, [
          shp('rounded', 190, 120, 700, 1130, { radius: 42, fill: 'rgba(255,255,255,0.55)', stroke: '#c9c9c9', strokeWidth: 5, shadow: { on: true, color: '#000000', opacity: 0.18, blur: 30, x: 0, y: 14 }, name: 'Badge holder' }),
          shp('pill', 450, 160, 180, 34, { fill: '#efefed', stroke: '#c9c9c9', strokeWidth: 4, name: 'Slot' }),
          shp('ellipse', 300, 165, 26, 26, { fill: '#efefed', stroke: '#c9c9c9', strokeWidth: 4, name: 'Hole' }), shp('ellipse', 754, 165, 26, 26, { fill: '#efefed', stroke: '#c9c9c9', strokeWidth: 4, name: 'Hole' }),
          shp('rect', 230, 240, 620, 960, { fill: '#ffffff', name: 'Card' }),
          txt('THE\nPERFORMER', { x: 265, y: 280, align: 'left', fontFamily: 'Archivo Black', fontSize: 86, lineHeight: 0.86, fill: '#111111' }),
          mono('DROP 23', { x: 720, y: 290, fontSize: 18, fontWeight: 700 }),
          txt('STUDIO-FIRST FOUNDATION', { x: 265, y: 470, align: 'left', fontFamily: 'Arimo', fontWeight: 700, fontSize: 22, fill: '#111111' }),
          P('curls', 335, 530, 410, 380, { filters: { contrast: 6 } }),
          mono('NAME', { x: 265, y: 950, fontSize: 16 }), txt('Your Name', { x: 360, y: 925, align: 'left', fontFamily: 'Covered By Your Grace', fontSize: 64, fill: '#1c2f8f' }),
          mono('OCCUPATION', { x: 265, y: 1030, fontSize: 16 }), txt('Model', { x: 430, y: 1005, align: 'left', fontFamily: 'Covered By Your Grace', fontSize: 60, fill: '#1c2f8f' }),
          mono('SHADE', { x: 265, y: 1110, fontSize: 16 }), txt('L1 Neutral', { x: 360, y: 1085, align: 'left', fontFamily: 'Covered By Your Grace', fontSize: 60, fill: '#1c2f8f' }),
          txt('45-12H', { x: 690, y: 1110, align: 'left', fontFamily: 'Arimo', fontWeight: 700, fontSize: 34, fill: '#111111' }),
        ], { grain: 8 })),
        T('pid-pass', 'Pass card', ['Photo', 'Paper'], () => doc({ color: '#ec5a24', texture: 20 }, [
          txt('YS', { x: 60, y: 1190, align: 'left', fontFamily: 'Archivo Black', fontSize: 80, fill: '#111111' }),
          mono('SEASON 26\nRUNWAY PASS\nNOT FOR RESALE', { x: 60, y: 60, fontSize: 16, lineHeight: 1.4 }),
          shp('rounded', 190, 400, 700, 500, { radius: 26, fill: '#efe9dc', texture: 25, shadow: { on: true, color: '#000000', opacity: 0.3, blur: 30, x: 0, y: 16 }, name: 'Card' }),
          txt('PASS CARD', { x: 480, y: 440, align: 'left', fontFamily: 'Arimo', fontWeight: 700, fontSize: 38, letterSpacing: 0.04, fill: '#111111' }),
          P('stool', 230, 440, 220, 300, { filters: BW({ contrast: 14 }), crop: { zoom: 1.6, x: 0.5, y: 0.25 } }),
          shp('rect', 230, 745, 220, 40, { fill: '#ec5a24', name: 'Look tag' }), txt('LOOK 05', { cx: 340, cy: 765, fontFamily: 'Arimo', fontWeight: 700, fontSize: 22, fill: '#111111' }),
          mono('Brand:   Your Label\nSeason:  SS26\nStyle:   24/7\nType:    Daily wear', { x: 480, y: 510, fontSize: 21, lineHeight: 1.7 }),
          ...Array.from({ length: 34 }, (_, i) => shp('rect', 480 + i * 11, 740, [3, 5, 2, 6, 3, 4][i % 6], 70, { fill: '#111111', name: 'Barcode' })),
          mono('2580 4417 0093', { x: 480, y: 820, fontSize: 16 }),
          ...[[190, 300, 120, 2], [890, 560, 120, 2], [400, 900, 2, 140], [890, 820, 110, 2]].map(([x, y, w, h]) => rule(x, y, w, h, { name: 'Callout' })),
          mono('fit check', { x: 70, y: 280, fontSize: 16 }), mono('limited', { x: 920, y: 530, fontSize: 16 }), mono('scan me', { x: 920, y: 790, fontSize: 16 }), mono('front row', { x: 340, y: 1060, fontSize: 16 }),
        ], { grain: 12 })),
        T('pid-inquiry', 'Inquiry stamp', ['Photo', 'Paper'], () => doc({ color: '#d8d7dc', texture: 60 }, [
          mono('xxxxx', { x: 60, y: 60, fontSize: 16 }), mono('xxxxx', { x: 960, y: 60, fontSize: 16 }),
          txt('INQUIRY', { cx: 540, cy: 260, fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 236, letterSpacing: 0.02, fill: '#6b58b8', opacity: 0.6, blend: 'multiply', rotation: -3 }),
          P('yellow', 400, 520, 320, 400, { filters: { duotone: true, duoDark: '#2a2614', duoLight: '#f2d33c', contrast: 20 }, frame: { style: 'stamp', color: '#f4f1ea', size: 22 }, shadow: { on: true, color: '#000000', opacity: 0.15, blur: 10, x: 0, y: 4 } }),
          stamp('RECEIVED · STUDIO · ARCHIVE · ', 230, 760, 260, '#5b46b0', { rotation: -14, centerText: '2026', centerSize: 0.16 }),
          txt('Your Name', { cx: 690, cy: 860, fontFamily: 'Mrs Saint Delafield', fontSize: 150, fill: '#1d1b18', rotation: -12, name: 'Signature' }),
          ...['no', 'rules', 'just', 'design', 'anymore'].map((w, i) => mono(w, { cx: 120 + i * 210, cy: 1270, align: 'center', fontSize: 18, fill: '#5b46b0' })),
        ], { grain: 18 })),
        T('pid-application', 'Friendship application', ['Photo', 'Paper'], () => doc({ color: '#e9e8e4', texture: 30 }, [
          txt('FRIENDSHIP\nAPPLICATION', { cx: 540, cy: 170, fontFamily: 'Archivo Black', fontSize: 64, lineHeight: 0.95, fill: '#43507f' }),
          mono('available until 15/26', { cx: 540, cy: 260, align: 'center', fontSize: 16, fill: '#43507f' }),
          ...[[80, { fade: 30, grayscale: 100 }], [400, { grayscale: 100, contrast: 10 }], [720, { fade: 30, grayscale: 100 }]].map(([x, f], i) => P('idman', x, 330, 280, 340, { filters: f, name: i === 1 ? 'Your photo or video' : 'Side photo' })),
          ...[[220, 330], [540, 330], [860, 330], [80, 500], [360, 500], [400, 500], [680, 500], [720, 500], [1000, 500], [220, 670], [540, 670], [860, 670]].map(([x, y]) => shp('ellipse', x - 9, y - 9, 18, 18, { fill: '#e9e8e4', stroke: '#43507f', strokeWidth: 2.5, name: 'Marker' })),
          rule(80, 500, 920, 1.5, { fill: '#43507f', opacity: 0.6 }),
          txt('Your Name. he/him | 22 years old.', { cx: 540, cy: 750, fontFamily: 'Space Mono', fontWeight: 700, fontSize: 22, fill: '#43507f' }),
          txt('LOOKING FOR NEW MUTUALS TO GET ALONG AND FILL MY TIMELINE.\nTALKING ABOUT POP CULTURE, FILMS, FOOD AND MUSIC.\nHORROR MOVIES, TV SHOWS, LONG WALKS. ALSO A TAROT READER.\nI PLAY GAMES AND ALWAYS SAY YES TO KARAOKE.', { cx: 540, cy: 870, fontFamily: 'Space Mono', fontSize: 17, lineHeight: 1.55, fill: '#43507f' }),
          txt('QUIZZES (ESPECIALLY ABOUT FILMS) GET FREE PASS', { cx: 540, cy: 1000, fontFamily: 'Space Mono', fontSize: 17, fill: '#43507f' }),
          mono('friendship · mutuals · notes · season 26', { cx: 540, cy: 1250, align: 'center', fontSize: 15, fill: '#43507f' }),
        ], { grain: 8 })),
        T('pid-portrait', 'A portrait of you', ['Photo', 'Paper'], () => doc({ color: '#d9d4c8', texture: 30 }, [
          shp('torn', 80, 70, 920, 1210, { fill: '#f4f0e6', texture: 55, shadow: { on: true, color: '#000000', opacity: 0.18, blur: 24, x: 0, y: 10 }, name: 'Paper' }),
          txt('The untold stories', { x: 200, y: 180, align: 'left', fontFamily: 'Inter', fontSize: 20, fill: '#1d1b18' }),
          txt('A PORTRAIT\nOF YOU,', { cx: 520, cy: 340, fontFamily: 'Covered By Your Grace', fontSize: 100, lineHeight: 1, fill: '#1d1b18', rotation: -2 }),
          P('profile', 260, 480, 470, 500, { rotation: -3, filters: BW({ contrast: 14 }), frame: { style: 'border', color: '#f7f4ee', size: 16 }, shadow: { on: true, color: '#000000', opacity: 0.2, blur: 14, x: 0, y: 6 } }),
          shp('rect', 470, 600, 170, 46, { fill: '#c9c4b9', rotation: -3, name: 'Censor bar' }),
          stk('tape-masking', 210, 440, 200, 66, { rotation: -32, name: 'Tape' }),
          txt('every moment\nyou keep', { x: 740, y: 560, align: 'left', fontFamily: 'Covered By Your Grace', fontSize: 40, lineHeight: 1, fill: '#1d1b18' }),
          txt('is worth', { x: 740, y: 640, align: 'left', fontFamily: 'Covered By Your Grace', fontSize: 40, fill: '#c5261f' }),
          txt('holding on to', { x: 740, y: 690, align: 'left', fontFamily: 'Covered By Your Grace', fontSize: 40, fill: '#1d1b18' }),
          txt('born to create', { cx: 470, cy: 1020, fontFamily: 'Mrs Saint Delafield', fontSize: 130, fill: '#c5261f', rotation: -6 }),
          txt('instagram.com/yourname', { cx: 540, cy: 1190, fontFamily: 'Inter', fontSize: 16, fill: '#4a4640' }),
        ], { grain: 10 })),
        T('pid-aboutme', 'About me note', ['Photo', 'Paper'], () => doc({ color: '#ececea' }, [
          P('suit', 400, 190, 600, 920, { filters: BW({ contrast: 12 }) }),
          shp('torn', 90, 330, 420, 640, { fill: '#efeae0', texture: 60, rotation: -2, shadow: { on: true, color: '#000000', opacity: 0.25, blur: 20, x: 0, y: 10 }, name: 'Note' }),
          stk('clip-silver', 330, 270, 56, 150, { rotation: 6, name: 'Paper clip' }),
          txt('ABOUT ME', { x: 150, y: 400, align: 'left', fontFamily: 'Special Elite', fontSize: 40, fill: '#2c3e9c', underline: true, rotation: -2 }),
          txt('• Your Name\n• Interior designer\n• Based in Valencia\n\n• Loves retail\n• Curious mind\n• Always learning\n\n   And still building...', { x: 150, y: 480, align: 'left', fontFamily: 'Special Elite', fontSize: 27, lineHeight: 1.35, fill: '#2c3e9c', rotation: -2 }),
          txt('stay tuned for more!', { x: 790, y: 1130, align: 'left', fontFamily: 'Caveat', fontWeight: 600, fontSize: 34, fill: '#1d1b18' }),
        ], { grain: 8 })),
        T('pid-profile', 'Profile card', ['Photo', 'Paper'], () => doc({ color: '#f7f6f3' }, [
          shp('rect', 220, 220, 600, 820, { fill: '#ebe5da', texture: 45, rotation: -3, shadow: { on: true, color: '#000000', opacity: 0.18, blur: 24, x: 0, y: 12 }, name: 'Card' }),
          txt('BEHIND THE NAME', { x: 270, y: 280, align: 'left', fontFamily: 'Arimo', fontWeight: 700, fontSize: 22, letterSpacing: 0.12, fill: '#1d1b18', rotation: -3 }),
          mono('NAME\nYour Name\n\nFAVOURITE\nCOUNTRIES\nPortugal, Japan,\nNew Zealand', { x: 270, y: 340, fontSize: 18, lineHeight: 1.35, rotation: -3 }),
          P('curls', 520, 300, 260, 330, { rotation: -3, filters: BW({ contrast: 10 }) }),
          stk('clip-silver', 640, 250, 44, 120, { rotation: 4, name: 'Paper clip' }),
          txt('TELL ME ABOUT YOUR STORY', { x: 270, y: 680, align: 'left', fontFamily: 'Arimo', fontWeight: 700, fontSize: 18, fill: '#1d1b18', rotation: -3 }),
          txt('somewhere between\nthe first flight and\nthe last train home', { x: 280, y: 720, align: 'left', fontFamily: 'Caveat', fontWeight: 600, fontSize: 42, lineHeight: 1, fill: '#1c2f8f', rotation: -3 }),
          shp('ticket', 160, 930, 380, 150, { fill: '#c8322a', rotation: -8, shadow: { on: true, color: '#000000', opacity: 0.2, blur: 12, x: 0, y: 6 }, name: 'Ticket' }),
          txt('ADMIT ONE\n13 · 0545', { cx: 345, cy: 990, fontFamily: 'Space Mono', fontWeight: 700, fontSize: 24, lineHeight: 1.3, fill: '#f7efe3', rotation: -8 }),
          shp('ticket', 800, 160, 110, 280, { fill: '#2b4f9a', rotation: 8, name: 'Ticket' }),
        ], { grain: 8 })),
      ];
    })(),

    // ── FILM: looks — your photo or video graded like a film stock, with grain, halation, leaks and dust ──
    ...(() => {
      const LOOK = (k, extra) => Object.assign(JSON.parse(JSON.stringify(window.StudioRender.FILTER_PRESETS[k].f)), extra || {});
      const slot = (asset, filters, o = {}) => img(o.x ?? 0, o.y ?? 0, o.w ?? 1080, o.h ?? 1350, Object.assign({ assetId: asset, filters, name: 'Your photo or video', placeholder: ['#5a4a3a', '#1d1712'] }, o.more || {}));
      // the orange date stamp a point-and-shoot burns into the corner
      const stamp = (text, cx, cy, o) => txt(text, Object.assign({ cx, cy, fontFamily: 'VT323', fontSize: 68, letterSpacing: 0.08, fill: '#ff8f2e', opacity: 0.92, shadow: { on: true, color: '#ff4d00', opacity: 0.9, blur: 16, x: 0, y: 0 }, name: 'Date stamp' }, o || {}));
      const mono = (text, o) => txt(text, Object.assign({ fontFamily: 'Space Mono', fontWeight: 700, fontSize: 26, letterSpacing: 0.14, fill: '#f2e7c9' }, o));
      const shade = { on: true, color: '#000000', opacity: 0.45, blur: 18, x: 0, y: 3 };
      const vid = { duration: 6, fps: 24 };
      const T = (id, name, tags, build, o = {}) => ({ id, name, tags, width: o.w || 1080, height: o.h || 1350, video: !!o.video, build });
      return [
        T('fl-gold', 'Gold 200', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#2a1d10' }, overlay: { grain: 16 },
          elements: [slot('film-golden', LOOK('gold')), stamp('’98  8  14', 860, 1262)],
        })),
        T('fl-portrait', 'Portrait 400', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#3b2f27' }, overlay: { grain: 12 },
          elements: [slot('film-portrait', LOOK('portrait')), mono('PORTRAIT 400  ·  36 EXP', { x: 56, y: 1262, align: 'left', fontSize: 24, opacity: 0.85 })],
        })),
        T('fl-night', 'Night 800T', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#0d0a0a' }, overlay: { grain: 26, vignette: 25 },
          elements: [
            slot('film-lanterns', LOOK('tungsten', { halation: 85 })),
            txt('night walks', { cx: 540, cy: 1130, fontFamily: 'Instrument Serif', italic: true, fontSize: 132, fill: '#fff1e2', shadow: shade }),
            mono('11:42 PM  ·  800T', { cx: 540, cy: 1235, fontSize: 24, opacity: 0.85 }),
          ],
        })),
        T('fl-expired', 'Expired roll', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#2b2228' }, overlay: { grain: 18, dust: 35 },
          elements: [slot('film-friends', LOOK('expired', { dust: 0 })), stamp('’04  9  12', 860, 1262)],
        })),
        T('fl-disposable', 'Disposable', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#1b1a14' }, overlay: { grain: 20, vignette: 20 },
          elements: [slot('film-picnic', LOOK('disposable')), stamp('’26  7  19', 860, 1262), mono('27', { x: 980, y: 52, align: 'left', fontSize: 30, fill: '#ffffff', opacity: 0.7, name: 'Frames left' })],
        })),
        T('fl-vivid', 'Vivid 100', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#3a2a1a' }, overlay: { grain: 10 },
          elements: [slot('img-desert', LOOK('vivid100')), txt('out west', { cx: 540, cy: 1150, fontFamily: 'Caveat', fontWeight: 600, fontSize: 150, fill: '#fffaf0', rotation: -4, shadow: shade })],
        })),
        T('fl-green', 'Green 400', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#10201a' }, overlay: { grain: 24 },
          elements: [slot('film-tram', LOOK('green400')), mono('GREEN 400  ·  PRAGUE', { x: 56, y: 1262, align: 'left', fontSize: 24, opacity: 0.85 }), stamp('’11  3  02', 860, 1262)],
        })),
        T('fl-cross', 'Cross process', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#1f2a12' }, overlay: { grain: 15 },
          elements: [slot('film-grass', LOOK('crossp')), txt('summer in\nslide film', { cx: 540, cy: 230, fontFamily: 'Instrument Serif', fontSize: 104, lineHeight: 0.95, fill: '#13261c' })],
        })),
        T('fl-bleach', 'Bleach bypass', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#1a1a1a' }, overlay: { grain: 22, vignette: 30 },
          elements: [
            slot('film-canyon', LOOK('bleach', { exposure: -22, highlights: -60 })),
            txt('THE LONG ROAD', { cx: 540, cy: 1110, fontFamily: 'League Gothic', fontSize: 190, letterSpacing: 0.04, fill: '#f4f1ea', shadow: shade }),
            mono('A SHORT FILM', { cx: 540, cy: 1225, fontSize: 24, letterSpacing: 0.4 }),
          ],
        })),
        T('fl-twostrip', 'Two-strip', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#1d1210' }, overlay: { grain: 22, vignette: 35 },
          elements: [
            slot('film-lamp', LOOK('twostrip')),
            txt('Chapter One', { cx: 540, cy: 1130, fontFamily: 'Playfair Display', italic: true, fontSize: 120, fill: '#f6e7cf', shadow: shade }),
          ],
        })),
        T('fl-pan400', 'Pan 400', ['Photo', 'Film', 'Paper'], () => ({
          width: 1080, height: 1350, background: { color: '#ece8df', texture: 30 }, overlay: { grain: 10 },
          elements: [
            txt('us, unposed.', { cx: 540, cy: 205, fontFamily: 'Instrument Serif', fontSize: 120, fill: '#1d1b18' }),
            slot('film-kiss', LOOK('pan400'), { x: 60, y: 330, w: 960, h: 720, more: { frame: { style: 'scan', color: '#161412', size: 16, label: 'PAN 400', num: 14 }, shadow: { on: true, color: '#000000', opacity: 0.2, blur: 24, x: 0, y: 10 } } }),
            mono('ROLL 03  ·  FRAME 14', { cx: 540, cy: 1130, fontSize: 24, fill: '#5a544a', fontWeight: 400 }),
          ],
        })),
        T('fl-super8', 'Super 8', ['Video', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#0b0a09' }, overlay: { weave: 70, flicker: 45, dust: 55, grain: 30 }, anim: vid,
          elements: [
            slot('film-road', LOOK('super8'), { x: 40, y: 190, w: 1000, h: 900, more: { frame: { style: 'gate', color: '#0b0a09', size: 26, soft: 75, round: 80 } } }),
            txt('SUPER 8', { x: 60, y: 92, align: 'left', fontFamily: 'VT323', fontSize: 64, fill: '#f2e7c9' }),
            txt('▶ PLAY', { x: 830, y: 92, align: 'left', fontFamily: 'VT323', fontSize: 64, fill: '#f2e7c9', anim: { loop: 'blink', speed: 0.8 } }),
            txt('summer road trip', { cx: 540, cy: 1200, fontFamily: 'Instrument Serif', italic: true, fontSize: 84, fill: '#f2e7c9', anim: { enter: 'fade', delay: 0.6 } }),
          ],
        }), { video: true }),
        T('fl-cinema', 'Widescreen', ['Video', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#000000' }, overlay: { weave: 20, grain: 22 }, anim: vid,
          elements: [
            slot('film-station', LOOK('cinema'), { y: 380, h: 590 }),
            mono('A FILM BY YOU', { cx: 540, cy: 300, fontSize: 22, letterSpacing: 0.5, fill: '#bdb7aa', fontWeight: 400, anim: { enter: 'fade', delay: 0.3 } }),
            txt('I always knew we’d end up here.', { cx: 540, cy: 1050, fontFamily: 'Arimo', fontSize: 40, fill: '#ffffff', anim: { enter: 'fade', delay: 1.2 } }),
          ],
        }), { video: true }),
        T('fl-burn', 'Film burn', ['Video', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#1a120c' }, overlay: { burn: 90, flicker: 30, dust: 35, grain: 22 }, anim: vid,
          elements: [slot('film-beach', LOOK('gold')), txt('end of the roll', { cx: 470, cy: 260, fontFamily: 'Instrument Serif', italic: true, fontSize: 120, fill: '#2b1a0e', anim: { enter: 'fade', delay: 1 } })],
        }), { video: true }),
        T('fl-leak', 'Light leak', ['Video', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#20160f' }, overlay: { leak: 70, grain: 20, dust: 20 }, anim: vid,
          elements: [
            slot('film-coast', LOOK('portrait')),
            mono('35MM', { x: 56, y: 60, align: 'left', fontSize: 26, fill: '#ffffff', opacity: 0.85 }),
            txt('golden days', { cx: 540, cy: 1130, fontFamily: 'Instrument Serif', italic: true, fontSize: 140, fill: '#fff4e4', shadow: shade, anim: { enter: 'rise', delay: 0.5 } }),
          ],
        }), { video: true }),
        T('fl-projector', 'Projector reel', ['Video', 'Film', 'Reel'], () => ({
          width: 1080, height: 1920, background: { color: '#0a0908' }, overlay: { weave: 80, flicker: 60, dust: 60, grain: 34, vignette: 30 }, anim: vid,
          elements: [
            mono('NOW SHOWING', { cx: 540, cy: 240, fontSize: 28, letterSpacing: 0.5 }),
            slot('film-neon', LOOK('tungsten'), { x: 60, y: 330, w: 960, h: 1260, more: { frame: { style: 'gate', color: '#0a0908', size: 24, soft: 70, round: 60 } } }),
            txt('the city after dark', { cx: 540, cy: 1700, fontFamily: 'Instrument Serif', italic: true, fontSize: 92, fill: '#f2e7c9', anim: { enter: 'fade', delay: 0.8 } }),
          ],
        }), { w: 1080, h: 1920, video: true }),
      ];
    })(),

    // ── FILM: the camera and darkroom — contact sheets, strips, slides, instant prints, the countdown leader ──
    ...(() => {
      const LOOK = (k, extra) => Object.assign(JSON.parse(JSON.stringify(window.StudioRender.FILTER_PRESETS[k].f)), extra || {});
      const photo = (asset, x, y, w, h, o) => img(x, y, w, h, Object.assign({ assetId: asset, name: 'Your photo or video', placeholder: ['#5a4a3a', '#1d1712'] }, o));
      const mono = (text, o) => txt(text, Object.assign({ fontFamily: 'Space Mono', fontWeight: 700, fontSize: 26, letterSpacing: 0.14, fill: '#2a2620' }, o));
      const drop = { on: true, color: '#000000', opacity: 0.25, blur: 22, x: 0, y: 10 };
      const T = (id, name, tags, build, o = {}) => ({ id, name, tags, width: o.w || 1080, height: o.h || 1350, video: !!o.video, build });
      // frames laid end to end along a tilted line, like one cut strip of negatives
      const strip = (assets, x0, y0, w, h, deg, o) => assets.map((a, i) => photo(a, x0 + i * w * Math.cos(deg * Math.PI / 180), y0 + i * w * Math.sin(deg * Math.PI / 180), w, h, Object.assign({ rotation: deg },
        { frame: Object.assign({ style: 'scan', color: '#161412', size: 12, label: 'FILM 400', num: (o.num || 10) + i }, o.frame || {}), filters: o.filters ? JSON.parse(JSON.stringify(o.filters)) : {} })));
      return [
        T('fc-contact', 'Contact sheet', ['Photo', 'Film', 'Paper'], () => ({
          width: 1080, height: 1350, background: { color: '#f1eee8', texture: 25 }, overlay: { grain: 8 },
          elements: [
            txt('ROLL 07', { x: 60, y: 46, align: 'left', fontFamily: 'Permanent Marker', fontSize: 72, fill: '#d42a2a', rotation: -3 }),
            ...strip(['film-golden', 'film-road', 'film-beach'], 30, 160, 340, 300, -0.6, { num: 4, filters: LOOK('film') }),
            ...strip(['film-grass', 'film-friends', 'film-picnic'], 32, 490, 340, 300, 0.4, { num: 7, filters: LOOK('film') }),
            ...strip(['film-coast', 'film-window', 'film-portrait'], 28, 820, 340, 300, -0.3, { num: 10, filters: LOOK('film') }),
            shp('ellipse', 382, 520, 320, 250, { fill: 'rgba(0,0,0,0)', stroke: '#d42a2a', strokeWidth: 7, rotation: -4, name: 'Grease pencil circle' }),
            txt('✕', { cx: 540, cy: 975, fontFamily: 'Permanent Marker', fontSize: 150, fill: '#d42a2a', opacity: 0.9 }),
            txt('keeper!', { x: 760, y: 70, align: 'left', fontFamily: 'Permanent Marker', fontSize: 56, fill: '#d42a2a', rotation: 4 }),
            mono('CONTACT SHEET  ·  2026', { cx: 540, cy: 1230, fontSize: 22, fontWeight: 400, fill: '#6b655b', letterSpacing: 0.3 }),
          ],
        })),
        T('fc-strip', 'Film strip', ['Photo', 'Film', 'Paper'], () => ({
          width: 1080, height: 1350, background: { color: '#e9e3d6', texture: 40 }, overlay: { grain: 10 },
          elements: [
            txt('frames from june', { cx: 540, cy: 290, fontFamily: 'Instrument Serif', italic: true, fontSize: 110, fill: '#1d1b18' }),
            ...strip(['film-tram', 'film-neon', 'film-lanterns'], -70, 610, 420, 340, -7, { num: 21, filters: LOOK('tungsten') }).map(e => Object.assign(e, { shadow: drop })),
            stk('tape-masking', 60, 560, 200, 70, { rotation: -14, name: 'Tape' }),
            stk('tape-masking', 860, 400, 200, 70, { rotation: 8, name: 'Tape' }),
            mono('35MM  ·  24 EXP', { cx: 540, cy: 1180, fontSize: 24, fontWeight: 400, fill: '#5a544a', letterSpacing: 0.3 }),
          ],
        })),
        T('fc-slides', 'Light table', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#fdfcf9', gradient: 'radial', color2: '#d9d5cc' }, overlay: { grain: 6 },
          elements: [
            txt('the good ones', { cx: 540, cy: 120, fontFamily: 'Caveat', fontWeight: 600, fontSize: 104, fill: '#2a2620', rotation: -2 }),
            ...[['film-canyon', 80, 230, -3, 'ARIZONA · 1978', 3], ['film-beach', 580, 215, 2.5, 'CAPRI · 1978', 7], ['film-golden', 95, 735, 2, 'TUSCANY · 1979', 12], ['film-coast', 585, 725, -2, 'BIG SUR · 1979', 18]]
              .map(([a, x, y, r, l, n]) => photo(a, x, y, 410, 410, { rotation: r, filters: LOOK('slide'), frame: { style: 'slide', color: '#efebe2', size: 66, label: l, num: n }, shadow: { on: true, color: '#000000', opacity: 0.18, blur: 18, x: 0, y: 8 } })),
            shp('ellipse', 700, 900, 300, 300, { fill: 'rgba(255,255,255,0.08)', stroke: '#2a2620', strokeWidth: 16, shadow: { on: true, color: '#000000', opacity: 0.3, blur: 24, x: 0, y: 14 }, name: 'Loupe' }),
          ],
        })),
        T('fc-instant', 'Instant stack', ['Photo', 'Film', 'Paper'], () => ({
          width: 1080, height: 1350, background: { color: '#d8cdbd', texture: 45 }, overlay: { grain: 10 },
          elements: [
            photo('film-window', 520, 170, 470, 570, { rotation: 8, filters: LOOK('instant'), frame: { style: 'polaroid', color: '#fbf8f1', size: 28, bottom: 4.2 }, shadow: drop }),
            photo('film-friends', 110, 420, 560, 680, { rotation: -5, filters: LOOK('instant'), frame: { style: 'polaroid', color: '#fbf8f1', size: 34, bottom: 4.2 }, shadow: drop }),
            txt('best day ☺', { cx: 400, cy: 1010, fontFamily: 'Caveat', fontWeight: 600, fontSize: 76, fill: '#2a2a2a', rotation: -5 }),
            stk('tape-masking', 300, 390, 220, 74, { rotation: -10, name: 'Tape' }),
          ],
        })),
        T('fc-negative', 'Negative scan', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#fbfaf6', gradient: 'radial', color2: '#e3e0d8' }, overlay: { grain: 8 },
          elements: [
            mono('HOW IT LOOKED ON THE ROLL', { cx: 540, cy: 170, fontSize: 24, letterSpacing: 0.3, fill: '#4a453d', fontWeight: 400 }),
            photo('film-tram', 60, 290, 960, 760, { filters: LOOK('negative'), frame: { style: 'scan', color: '#3a2214', size: 18, label: 'FILM 200', num: 31, textColor: '#ffb35c' }, shadow: { on: true, color: '#000000', opacity: 0.15, blur: 20, x: 0, y: 8 } }),
            txt('develop me', { cx: 540, cy: 1170, fontFamily: 'Instrument Serif', italic: true, fontSize: 100, fill: '#1d1b18' }),
          ],
        })),
        T('fc-halfframe', 'Half frame', ['Photo', 'Film', 'Paper'], () => ({
          width: 1080, height: 1350, background: { color: '#ece7dc', texture: 25 }, overlay: { grain: 8 },
          elements: [
            txt('half frame,\ndouble the memories', { cx: 540, cy: 240, fontFamily: 'Instrument Serif', fontSize: 92, lineHeight: 0.98, fill: '#1d1b18' }),
            img(60, 420, 960, 600, { frame: { style: 'scan', color: '#161412', size: 14, label: 'HALF 72', num: 36 }, placeholder: ['#161412', '#161412'], name: 'Film border', shadow: { on: true, color: '#000000', opacity: 0.18, blur: 22, x: 0, y: 10 } }),
            photo('film-window', 68.4, 480, 467, 480, { filters: LOOK('portrait') }),
            photo('film-coast', 544, 480, 467.6, 480, { filters: LOOK('portrait') }),
            txt('36 / 72', { cx: 540, cy: 1130, fontFamily: 'Space Mono', fontSize: 24, letterSpacing: 0.3, fill: '#5a544a' }),
          ],
        })),
        T('fc-medium', 'Medium format', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#11100e' }, overlay: { grain: 18 },
          elements: [
            photo('film-neon', 90, 170, 900, 900, { filters: LOOK('portrait', { halation: 40 }), frame: { style: 'filed', color: '#0b0a09', size: 38 } }),
            mono('120  ·  6×6  ·  NO. 9', { x: 96, y: 1100, align: 'left', fontSize: 22, fill: '#f2a33a' }),
            txt('square, slow, on purpose.', { cx: 540, cy: 1220, fontFamily: 'Instrument Serif', italic: true, fontSize: 70, fill: '#f2e7c9' }),
          ],
        })),
        T('fc-booth', 'Photo booth', ['Photo', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#8f2622', pattern: { type: 'stripes', color: 'rgba(0,0,0,0.16)', size: 60, thick: 26, opacity: 1 } }, overlay: { grain: 12, vignette: 30 },
          elements: [
            shp('rect', 330, 40, 420, 1270, { fill: '#f7f4ee', texture: 30, rotation: 0, shadow: { on: true, color: '#000000', opacity: 0.35, blur: 30, x: 0, y: 16 }, name: 'Strip' }),
            ...['film-smile', 'film-kiss', 'film-friends', 'film-portrait'].map((a, i) => photo(a, 360, 70 + i * 290, 360, 270, { filters: LOOK('pan400') })),
            txt('02 · 14 · 26', { cx: 540, cy: 1250, fontFamily: 'Special Elite', fontSize: 30, fill: '#3a3530' }),
          ],
        })),
        T('fc-darkroom', 'Darkroom', ['Video', 'Film'], () => ({
          width: 1080, height: 1350, background: { color: '#3a0806', gradient: 'radial', color2: '#120302' }, overlay: { tint: '#ff2a1a', tintAmount: 40, grain: 26, vignette: 35 }, anim: { duration: 5, fps: 24 },
          elements: [
            rib('arc', -20, 205, 1120, 30, { points: [[0, 0.1], [0.5, 0.9], [1, 0.1]], line: true, thickness: 3, color: '#cbb89e', text: '', name: 'Line' }),
            ...[['film-smile', 70, 250, -4], ['film-kiss', 395, 245, 2], ['film-station', 720, 252, -2]].map(([a, x, y, r]) => photo(a, x, y, 290, 380, { rotation: r, filters: LOOK('pan400'), frame: { style: 'border', color: '#f5f2ea', size: 16 }, shadow: { on: true, color: '#000000', opacity: 0.4, blur: 18, x: 0, y: 10 }, anim: { loop: 'sway', amount: 0.3, speed: 0.5 } })),
            ...[160, 485, 810].map((x, i) => stk('clip-silver', x, 190, 50, 140, { rotation: [-4, 2, -2][i], anim: { loop: 'sway', amount: 0.3, speed: 0.5 } })),
            txt('developing…', { cx: 540, cy: 1060, fontFamily: 'Special Elite', fontSize: 80, fill: '#ffb3a3', anim: { enter: 'typewriter', delay: 0.4, speed: 0.8 } }),
          ],
        }), { video: true }),
        T('fc-leader', 'Countdown leader', ['Video', 'Film'], () => {
          const lead = { start: 0, end: 3 };
          return {
            width: 1080, height: 1350, background: { color: '#14110e' }, overlay: { weave: 60, flicker: 50, dust: 60, grain: 34, vignette: 25 }, anim: { duration: 7, fps: 24 },
            elements: [
              photo('film-window', 0, 0, 1080, 1350, { filters: LOOK('gold') }),
              txt('and… action.', { cx: 540, cy: 1150, fontFamily: 'Instrument Serif', italic: true, fontSize: 110, fill: '#ffffff', shadow: { on: true, color: '#000000', opacity: 0.45, blur: 18, x: 0, y: 3 }, time: { start: 3.4 }, anim: { enter: 'fade', speed: 0.8 } }),
              shp('rect', 0, 0, 1080, 1350, { fill: '#8b877f', time: lead, name: 'Leader' }),
              shp('rect', 0, 673, 1080, 4, { fill: '#2a2724', time: lead, name: 'Cross line' }),
              shp('rect', 538, 0, 4, 1350, { fill: '#2a2724', time: lead, name: 'Cross line' }),
              shp('rect', 160, 671, 760, 8, { fill: '#2a2724', time: lead, anim: { loop: 'spin', speed: 6, sync: true }, name: 'Sweep' }),
              shp('ellipse', 160, 295, 760, 760, { fill: 'rgba(0,0,0,0)', stroke: '#f4f1ea', strokeWidth: 12, time: lead, name: 'Ring' }),
              shp('ellipse', 230, 365, 620, 620, { fill: 'rgba(0,0,0,0)', stroke: '#2a2724', strokeWidth: 6, time: lead, name: 'Ring' }),
              ...['3', '2', '1'].map((n, i) => txt(n, { cx: 540, cy: 675, fontFamily: 'Arimo', fontWeight: 700, fontSize: 520, fill: '#1d1b18', time: { start: i, end: i + 1 }, name: 'Count ' + n })),
            ],
          };
        }, { video: true }),
      ];
    })(),

    // ── VIDEO: stop motion — a handful of photos played frame by frame ──
    ...[
      { id: 'stop-classic', name: 'Stop motion', frames: ['run1', 'run2', 'run3', 'run4', 'run5', 'run6'], fps: 6, jitter: 45 },
      { id: 'stop-polaroid', name: 'Polaroid flip-book', frames: ['rise1', 'rise2', 'rise3', 'play1', 'play3'], fps: 4, jitter: 70 },
      { id: 'stop-reel', name: 'Film reel', frames: ['drive1', 'drive2', 'drive3', 'drive4', 'drive5', 'drive6'], fps: 8, jitter: 30 },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Photo'], width: 1080, height: 1350, video: true,
      build: () => {
        const seq = { ids: v.frames.map(k => 'img-' + k), fps: v.fps, mode: 'loop', jitter: v.jitter, still: 0 };
        const frames = { assetId: seq.ids[0], seq, placeholder: ['#d8d2c4', '#a89f8c'], name: 'Stop motion — choose your photos' };
        const dur = Math.round(v.frames.length / v.fps * 2 * 10) / 10;
        if (v.id === 'stop-classic') return {
          width: 1080, height: 1350, background: { color: '#111111' }, overlay: { grain: 40, vignette: 30 }, anim: { duration: dur, fps: 30 },
          elements: [
            img(0, 0, 1080, 1350, Object.assign({ filters: { contrast: 10, fade: 8, warmth: 8 } }, frames)),
            txt('frame by frame', { x: 60, y: 1240, align: 'left', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 30, letterSpacing: 0.06, fill: '#ffffff', shadow: { on: true, color: '#000000', opacity: 0.5, blur: 8, x: 0, y: 2 } }),
            txt('● REC', { x: 60, y: 60, align: 'left', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 28, fill: '#ff3b30', anim: { loop: 'blink', speed: 1 } }),
          ],
        };
        if (v.id === 'stop-polaroid') return {
          width: 1080, height: 1350, background: { color: '#ece4d4', texture: 45 }, overlay: { grain: 25 }, anim: { duration: dur, fps: 30 },
          elements: [
            img(150, 190, 780, 940, Object.assign({ rotation: -3, frame: { style: 'polaroid', color: '#fbf8f1', size: 38, bottom: 4.2 }, filters: { fade: 12, warmth: 12, contrast: 6 }, shadow: { on: true, color: '#000000', opacity: 0.25, blur: 30, x: 0, y: 16 } }, frames)),
            txt('summer ’26', { cx: 530, cy: 1035, fontFamily: 'Caveat', fontWeight: 600, fontSize: 84, fill: '#2a2a2a', rotation: -3 }),
            stk('tape-masking', 420, 150, 240, 80, { rotation: -6, name: 'Tape' }),
          ],
        };
        return {
          width: 1080, height: 1350, background: { color: '#0b0b0b' }, overlay: { grain: 45 }, anim: { duration: dur, fps: 30 },
          elements: [
            img(40, 230, 1000, 760, Object.assign({ frame: { style: 'gate', color: '#0b0b0b', size: 34, soft: 45 }, filters: { halation: 45, warmth: 10, fade: 10, contrast: 8 } }, frames)),
            txt('REEL 01', { x: 60, y: 110, align: 'left', fontFamily: 'VT323', fontSize: 64, fill: '#f2e7c9' }),
            txt('▶ 00:00:0' + Math.round(dur) + ':00', { x: 60, y: 1080, align: 'left', fontFamily: 'VT323', fontSize: 48, fill: '#f2e7c9', anim: { loop: 'blink', speed: 0.8 } }),
            txt('shot frame by frame', { x: 60, y: 1150, align: 'left', fontFamily: 'Instrument Serif', italic: true, fontSize: 56, fill: '#f2e7c9' }),
          ],
        };
      },
    })),

    // ── VIDEO: speed flashes — motion-blurred action shots cut fast over your own photo or video ──
    ...[
      {
        id: 'flash-mindset', name: 'Against the world', pack: 'hustle', ph: ['#3b3029', '#0d0b0a'], base: { contrast: 14, brightness: -12, saturation: -15 },
        fl: { opacity: 0.5, blend: 'normal', rate: 8, blur: 62, angle: 0, overlap: 30, contrast: 12 }, overlay: { grain: 28, vignette: 38 },
        text: () => [txt('just me and my\n“Everything happens\nfor a reason”\nmindset against the\nworld', { cx: 540, cy: 960, align: 'center', fontFamily: 'Instrument Serif', fontSize: 74, lineHeight: 0.98, letterSpacing: -0.01, fill: '#ffffff', shadow: { on: true, color: '#000000', opacity: 0.45, blur: 14, x: 0, y: 3 } })],
      },
      {
        id: 'flash-grind', name: 'No days off', pack: 'gym', ph: ['#5a5a5a', '#121212'], base: { grayscale: 100, contrast: 24, brightness: -14 },
        fl: { opacity: 0.72, blend: 'screen', rate: 10, blur: 70, angle: -12, tone: 'mono', contrast: 40, strobe: 35, gaps: 15 }, overlay: { grain: 45, vignette: 45 },
        text: () => [
          txt('NO DAYS\nOFF', { cx: 540, cy: 900, align: 'center', fontFamily: 'Anton', fontSize: 250, lineHeight: 0.92, letterSpacing: 0.01, fill: '#ffffff', anim: { enter: 'slam', delay: 0.3, speed: 1 } }),
          txt('5:00 AM  ·  EVERY  DAY', { cx: 540, cy: 1250, align: 'center', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 34, letterSpacing: 0.18, fill: '#e9ff5a', anim: { enter: 'typewriter', delay: 1.4, speed: 1.2 } }),
        ],
      },
      {
        id: 'flash-race', name: 'Run your race', pack: 'run', ph: ['#5b2c1a', '#120806'], base: { contrast: 26, brightness: -30, warmth: 20 },
        fl: { opacity: 0.62, blend: 'screen', rate: 9, blur: 72, angle: 0, tone: 'tint', tint: '#ff6a2a', contrast: 25, drift: 70, zoom: 45 }, overlay: { grain: 30, vignette: 35 },
        text: () => [
          txt('RUN\nYOUR\nOWN\nRACE', { cx: 540, cy: 960, autoWidth: false, width: 960, align: 'center', fontFamily: 'Bebas Neue', fontSize: 300, lineHeight: 0.9, letterSpacing: 0.02, fill: '#ffffff', anim: { enter: 'words', delay: 0.2, speed: 0.75 }, name: 'Words (one at a time)' }),
          txt('keep moving forward', { cx: 540, cy: 1560, align: 'center', fontFamily: 'Instrument Serif', italic: true, fontSize: 56, fill: '#ffd6c2', anim: { enter: 'fade', delay: 2, speed: 0.8 } }),
        ],
      },
      {
        id: 'flash-premium', name: 'Built different', pack: 'drive', ph: ['#2a2a30', '#07070a'], base: { contrast: 16, brightness: -14, saturation: -30 },
        fl: { opacity: 0.55, blend: 'screen', rate: 7, blur: 80, angle: 4, overlap: 45, contrast: 15, saturation: -20 }, overlay: { grain: 22, vignette: 50, rgb: 25 },
        text: () => [
          shp('rect', 0, 0, 1080, 170, { fill: '#000000', name: 'Letterbox bar' }),
          shp('rect', 0, 1750, 1080, 170, { fill: '#000000', name: 'Letterbox bar' }),
          txt('Built\ndifferent.', { cx: 540, cy: 900, align: 'center', fontFamily: 'Instrument Serif', italic: true, fontSize: 190, lineHeight: 0.88, letterSpacing: -0.02, fill: '#f1e3bd', anim: { enter: 'lettersFade', delay: 0.4, speed: 0.9 } }),
          txt('SUCCESS ISN’T OWNED — IT’S RENTED DAILY', { cx: 540, cy: 1180, align: 'center', fontFamily: 'Inter', fontWeight: 600, fontSize: 26, letterSpacing: 0.3, fill: 'rgba(241,227,189,0.8)', anim: { enter: 'fade', delay: 1.8, speed: 0.7 } }),
        ],
      },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Sport', 'Photo'], width: 1080, height: 1920, video: true,
      build: () => ({
        width: 1080, height: 1920,
        background: { color: '#0b0b0b' },
        overlay: v.overlay,
        anim: { duration: 6, fps: 30 },
        camera: v.cam || null,
        elements: [
          img(0, 0, 1080, 1920, { assetId: 'demo-' + v.id.replace('flash-', ''), placeholder: v.ph, filters: v.base, name: 'Your photo or video — replace with yours' }),
          { type: 'flashes', x: 0, y: 0, width: 1080, height: 1920, pack: v.pack, name: 'Speed flashes', ...v.fl },
          ...v.text(),
        ],
      }),
    })),

    // ── VIDEO: kinetic headline — small words whoosh in, the big word's letters slam down ──
    ...[
      { id: 'kinetic-news', name: 'Good news', small: ['but the', 'good'], big: 'NEWS', caps: 'we’re creative.\nBut the good news\nis that', paper: '#1d8a68', grid: 'rgba(255,255,255,0.32)', ink: '#e9e9e4', line: '#d8384a', letters: 'slam', cam: { move: 'drift', zoom: 1.12, rotate: 1.2, shake: 0.4, blur: 0.3 }, blinds: 55 },
      { id: 'kinetic-reveal', name: 'Big reveal', small: ['and the', 'winner is'], sx: [150, 520], ss: 78, big: 'YOU', caps: 'drumroll please…\nand the winner is\nyou!', paper: '#141414', grid: 'rgba(255,255,255,0.08)', ink: '#f5f2ea', line: '#f7d046', letters: 'lettersDrop', cam: { move: 'snap', target: 'big', zoom: 1.5, start: 1.25, dur: 3.5, rotate: -2, shake: 0.5, blur: 0.6 }, blinds: 25 },
      { id: 'kinetic-pop', name: 'Pop words', small: ['this is', 'your'], big: 'SIGN', caps: 'if you needed one…\nthis is your sign\nto start today', paper: '#ff7ab6', grid: 'rgba(255,255,255,0.35)', ink: '#fff4b8', line: '#1f3fd1', letters: 'lettersUp', cam: { move: 'pushin', target: 'big', zoom: 1.3, start: 0, dur: 5, blur: 0.2, shake: 0.2 }, blinds: 35 },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Quote'], width: 1080, height: 1350, video: true,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: v.paper, pattern: { type: 'grid', color: v.grid, size: 54, thick: 1.6, opacity: 1 }, texture: 22, crumple: 18, crumpleSeed: 5 },
        overlay: { grain: 34, vignette: 40, blinds: v.blinds },
        anim: { duration: 5, fps: 30 },
        camera: Object.assign({ target: 'big' }, v.cam),
        elements: [
          txt(v.small[0], { x: v.sx ? v.sx[0] : 210, y: 470, align: 'left', fontFamily: 'Archivo', fontWeight: 800, fontSize: v.ss || 92, letterSpacing: -0.04, fill: v.ink, anim: { enter: 'left', delay: 0.15, speed: 0.9 } }),
          txt(v.small[1], { x: v.sx ? v.sx[1] : 600, y: 470, align: 'left', fontFamily: 'Archivo', fontWeight: 800, fontSize: v.ss || 92, letterSpacing: -0.04, fill: v.ink, anim: { enter: 'right', delay: 0.4, speed: 0.9 } }),
          txt(v.big, { key: 'big', cx: 540, cy: 660, fontFamily: 'Archivo Black', fontSize: 200, letterSpacing: -0.03, fill: v.ink, anim: { enter: v.letters, delay: 0.9, speed: 1 } }),
          rib('straight', 200, 760, 680, 30, { line: true, thickness: 12, color: v.line, text: '', ends: 'flat', anim: { enter: 'draw', delay: 1.8, speed: 1.1 }, name: 'Underline' }),
          txt(v.caps, { cx: 540, cy: 1040, autoWidth: false, width: 900, fontFamily: 'Inter', fontWeight: 600, fontSize: 38, fill: '#ffffff', shadow: { on: true, color: '#000000', opacity: 0.5, blur: 8, x: 0, y: 2 }, anim: { enter: 'captions', delay: 0, speed: 0.55 }, name: 'Captions (one line at a time)' }),
        ],
      }),
    })),

    // ── VIDEO: photos printed on sticky notes, stop-motion wobble and a colour cut ──
    ...[
      { id: 'sticky-cut', name: 'Sticky notes', words: ['STICKY', 'NOTES'], notes: [['#f5b82e', '#6b3d06'], ['#3ab6e6', '#0b2f4a']], caps: 'it’s actually\na lot easier\nthan you think', titleInk: '#f5c33b', bgPh: ['#5b4632', '#1a140f'], cut: 2.1, layout: 'cut' },
      { id: 'sticky-stack', name: 'Sticky stack', words: ['WEEKEND', 'RECAP'], notes: [['#ff8fb1', '#5c1430'], ['#f7e463', '#4d4208'], ['#8fe0a8', '#0f4a26']], caps: 'friday night\nsaturday market\nsunday reset', titleInk: '#ffffff', bgPh: ['#3c3f52', '#14151d'], layout: 'stack' },
      { id: 'sticky-flip', name: 'Sticky flip-book', words: ['MEET', 'THE TEAM'], notes: [['#f5b82e', '#6b3d06'], ['#ff8fb1', '#5c1430'], ['#3ab6e6', '#0b2f4a'], ['#8fe0a8', '#0f4a26']], caps: 'design\ncode\ncoffee\nmore coffee', titleInk: '#f5c33b', bgPh: ['#2d3a4a', '#0d1218'], layout: 'flip' },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Photo'], width: 1080, height: 1350, video: true,
      build: () => {
        const note = (x, y, w, c, o = {}) => img(x, y, w, w * 1.04, Object.assign({
          frame: { style: 'sticky', color: c[0], size: w * 0.055, radius: 0 }, placeholder: ['#d9d2c5', '#9b9284'],
          filters: { contrast: 18, duotone: true, duoDark: c[1], duoLight: '#ffffff' },
          shadow: { on: true, color: '#000000', opacity: 0.45, blur: 30, x: 0, y: 18 }, name: 'Sticky note photo — double-click to add yours',
        }, o));
        const els = [img(0, 0, 1080, 1350, { placeholder: v.bgPh, filters: { blur: 16, brightness: -35, saturation: -10 }, name: 'Background photo (blurred)' })];
        const t1 = { start: 0, end: 0.75 }, t2 = { start: 0.75 };
        els.push(
          txt(v.words[0], { cx: 540, cy: 230, fontFamily: 'Archivo Black', fontSize: 120, letterSpacing: 0.01, fill: v.titleInk, time: t1, shadow: { on: true, color: '#000000', opacity: 0.4, blur: 18, x: 0, y: 6 } }),
          txt(v.words[1], { cx: 540, cy: 230, fontFamily: 'Archivo Black', fontSize: 120, letterSpacing: 0.01, fill: v.titleInk, time: t2, shadow: { on: true, color: '#000000', opacity: 0.4, blur: 18, x: 0, y: 6 } }),
        );
        if (v.layout === 'cut') {
          els.push(
            note(250, 360, 580, v.notes[0], { rotation: -2, time: { start: 0, end: v.cut }, anim: { loop: 'wiggle', amount: 0.7 } }),
            note(230, 360, 620, v.notes[1], { rotation: 1.5, time: { start: v.cut }, anim: { loop: 'swing', amount: 0.25, speed: 0.6 } }),
          );
        } else if (v.layout === 'stack') {
          v.notes.forEach((c, i) => els.push(note(170 + i * 120, 380 + i * 70, 470, c, { rotation: [-8, 4, -3][i], anim: { enter: 'drop', delay: 0.5 + i * 0.7, loop: 'wiggle', amount: 0.4 } })));
        } else {
          v.notes.forEach((c, i) => els.push(note(240, 380, 600, c, { rotation: [-2, 2, -1, 1.5][i], time: { start: 0, cycle: { slot: 0.55, index: i, count: v.notes.length } }, anim: { loop: 'wiggle', amount: 0.6 } })));
        }
        els.push(txt(v.caps, { cx: 540, cy: 1110, autoWidth: false, width: 900, fontFamily: 'Space Mono', fontWeight: 700, fontSize: 38, fill: v.titleInk, shadow: { on: true, color: '#000000', opacity: 0.6, blur: 8, x: 0, y: 2 }, anim: { enter: 'captions', delay: 0.8, speed: v.layout === 'flip' ? 1.45 : 0.6 }, name: 'Captions (one line at a time)' }));
        return {
          width: 1080, height: 1350,
          background: { color: v.bgPh[1] },
          overlay: { grain: 22, vignette: 35 },
          anim: { duration: 5, fps: 30 },
          camera: { move: v.layout === 'flip' ? 'jolt' : 'drift', zoom: v.layout === 'flip' ? 1.12 : 1.08, rotate: 1.5, shake: 0.35, blur: 0.3, cut: 0.55, wander: 0.4 },
          elements: els,
        };
      },
    })),

    // ── VIDEO: rolling sequence — values roll up one after another (years, countdowns, prices) ──
    ...[
      { id: 'roll-years', name: 'Through the years', seq: Array.from({ length: 18 }, (_, i) => String(1940 + i * 5)).join('\n'), sub: '', font: 'Playfair Display', weight: 500, italic: true, size: 150, ink: '#1c1c22', bg: '#cfcfcc', vhs: true, accel: true, speed: 1.4 },
      { id: 'roll-countdown', name: 'Countdown', seq: '10\n9\n8\n7\n6\n5\n4\n3\n2\n1\nGO!', sub: 'LAUNCHING SOON', font: 'Space Mono', weight: 700, size: 230, ink: '#ff3b30', bg: '#0e0e0e', vhs: true, speed: 2.1 },
      { id: 'roll-price', name: 'Price drop', seq: '$129\n$99\n$79\n$59\n$39', sub: 'TODAY ONLY', font: 'Archivo Black', weight: 400, size: 220, ink: '#1d1b18', bg: '#f7d046', vhs: false, accel: true, speed: 0.9 },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Sale'], width: 1080, height: 1350, video: true,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: v.bg, texture: v.vhs ? 10 : 30 },
        overlay: v.vhs ? { scanlines: 55, rgb: 45, grain: 30, vignette: 30 } : { grain: 18, vignette: 15 },
        anim: { duration: 5, fps: 30 },
        camera: { move: 'drift', zoom: 1.06, rotate: 0.6, shake: 0.35, blur: 0.2 },
        elements: [
          txt(v.seq, { key: 'roll', cx: 540, cy: 675, autoWidth: false, width: 1000, fontFamily: v.font, fontWeight: v.weight, italic: !!v.italic, fontSize: v.size, letterSpacing: v.italic ? -0.03 : 0, fill: v.ink, anim: { enter: 'roll', delay: 0.6, speed: v.speed, accel: !!v.accel }, name: 'Rolling values (one per line)' }),
          v.sub ? txt(v.sub, { cx: 540, cy: 1080, fontFamily: 'Space Mono', fontWeight: 700, fontSize: 36, letterSpacing: 0.18, fill: v.ink }) : null,
        ].filter(Boolean),
      }),
    })),

    // ── VIDEO: word by word — one word at a time, popping up in the middle ──
    ...[
      { id: 'words-films', name: 'Word by word', text: 'It wasn’t just making films.', font: 'Playfair Display', weight: 500, italic: true, size: 130, ink: '#1c1c22', bg: '#cfcfcc', overlay: { scanlines: 55, rgb: 40, grain: 28, vignette: 30 }, speed: 1, cam: { move: 'drift', zoom: 1.05, shake: 0.3 } },
      { id: 'words-bold', name: 'Bold statement', text: 'STOP WAITING FOR THE PERFECT MOMENT.', font: 'Archivo Black', weight: 400, size: 170, ink: '#ffffff', bg: '#0d0d0d', overlay: { grain: 30, vignette: 35 }, speed: 1.3, cam: { move: 'jolt', zoom: 1.18, rotate: 2.5, cut: 0.42 / 1.3, wander: 0, blur: 0.3 } },
      { id: 'words-soft', name: 'Soft whisper', text: 'slow mornings are a love language', font: 'Instrument Serif', weight: 400, italic: true, size: 150, ink: '#5a3e2b', bg: '#f3e9dc', overlay: { grain: 16, leak: 25, vignette: 15 }, speed: 0.8, cam: { move: 'pushin', zoom: 1.15, start: 0, dur: 5 } },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Quote'], width: 1080, height: 1350, video: true,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: v.bg, texture: 15 },
        overlay: v.overlay,
        anim: { duration: 5, fps: 30 },
        camera: v.cam,
        elements: [
          txt(v.text, { key: 'words', cx: 540, cy: 675, autoWidth: false, width: 1000, fontFamily: v.font, fontWeight: v.weight, italic: !!v.italic, fontSize: v.size, letterSpacing: -0.02, fill: v.ink, anim: { enter: 'words', delay: 0.3, speed: v.speed }, name: 'Words (shown one at a time)' }),
        ],
      }),
    })),

    // ── VIDEO: letters bounce in one by one after a play button ──
    ...[
      { id: 'bounce-everyone', name: 'Letter bounce', word: 'EVERYONE', font: 'Archivo', weight: 800, size: 130, ink: '#e8e6ea', bg: '#0b0b0d', crumple: 70, overlay: { rgb: 55, scanlines: 30, grain: 35, vignette: 45 }, play: true, cam: { move: 'crash', zoom: 1.25, start: 2.4, dur: 1.2, blur: 0.8, shake: 0.3 } },
      { id: 'bounce-hello', name: 'Glitch hello', word: 'HELLO WORLD', font: 'Space Grotesk', weight: 700, size: 110, ink: '#ffffff', bg: '#1f3fd1', crumple: 30, overlay: { rgb: 80, scanlines: 45, grain: 25 }, play: false, cam: { move: 'jolt', zoom: 1.12, rotate: 1.5, cut: 0.22, wander: 0.3, blur: 0.4 } },
      { id: 'bounce-pastel', name: 'Pastel bounce', word: 'yay, friday!', font: 'Fredoka', weight: 700, size: 150, ink: '#ff4f8b', bg: '#ffe3ef', crumple: 0, overlay: { grain: 10 }, play: false, cam: { move: 'pushin', zoom: 1.12, start: 0, dur: 5 } },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Quote'], width: 1080, height: 1350, video: true,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: v.bg, crumple: v.crumple, crumpleSeed: 17, texture: v.crumple ? 20 : 0 },
        overlay: v.overlay,
        anim: { duration: 5, fps: 30 },
        camera: Object.assign({ target: 'word' }, v.cam),
        elements: [
          v.play ? shp('triangle', 548, 600, 110, 130, { fill: '#cfcfd4', radius: 18, rotation: 90, time: { start: 0, end: 0.75 }, name: 'Play button' }) : null,
          txt(v.word, { key: 'word', cx: 540, cy: 675, fontFamily: v.font, fontWeight: v.weight, fontSize: v.size, letterSpacing: 0.01, fill: v.ink, anim: { enter: 'lettersBounce', delay: v.play ? 0.75 : 0.3, speed: 0.85 } }),
        ].filter(Boolean),
      }),
    })),

    // ── life-sim garden: cut-out photo on a painted lawn with game-menu choices ──
    ...[
      { id: 'garden-menu', name: 'Choose an action', sky: ['#1f6dd0', '#bfe7f6'], hill: ['#b5d65e', '#5fae37', '#2c6a1f', '#cdea7c'], profile: 'left', flower: ['#e3262c', '#8e0d15', '#3d7a2c', '#163c13', '#4d0a0c'], bloom: 'cluster', gem: ['#2fd16a', '#0c7a3c', '#a6ffbf'], ink: '#22307a', pill: '#f3eee6',
        items: [['Gossip', 'icon-lips'], ['Flirt', 'icon-heart-glossy'], ['Change Outfit', 'icon-cap'], ['Ask About Mood', 'icon-chat-bubbles'], ['Talk About Pet', 'icon-cat-sketch'], ['More Choices…', null]] },
      { id: 'garden-golden', name: 'Weekend plans', sky: ['#f39a5b', '#ffe6a8'], hill: ['#d4d86a', '#8fb23f', '#4b6e22', '#ecf09a'], profile: 'right', flower: ['#ffd23f', '#d89a10', '#4e7a2c', '#203f14', '#7a4a10'], bloom: 'daisy', gem: ['#ff9a3d', '#b85a10', '#ffe0b0'], ink: '#6b2f12', pill: '#fff4e0',
        items: [['Brunch', 'icon-coffee-glossy'], ['Nap', 'icon-house'], ['Go Thrifting', 'icon-cap'], ['Call Mum', 'icon-chat-bubbles'], ['Make a Playlist', 'icon-music-glossy'], ['More Plans…', null]] },
      { id: 'garden-dusk', name: 'Date night choices', sky: ['#8a6fd8', '#ffc3d8'], hill: ['#8cc06a', '#3f8a46', '#1d4f2a', '#b8e08a'], profile: 'double', flower: ['#ff8fc1', '#c24a86', '#3d7a3c', '#173d1c', '#ffe066'], bloom: 'cluster', gem: ['#ff6fb5', '#a8245f', '#ffd0e6'], ink: '#4a1f5c', pill: '#fff0f6',
        items: [['Compliment', 'icon-heart-glossy'], ['Hold Hands', 'icon-lips'], ['Share Dessert', 'icon-coffee-glossy'], ['Slow Dance', 'icon-music-glossy'], ['Stargaze', 'icon-sparkle-green'], ['More Choices…', null]] },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Post', 'Photo', 'Garden'], width: 1080, height: 1350,
      build: () => {
        const slots = [[340, 430], [740, 430], [290, 524], [790, 524], [250, 618], [830, 618]];
        const pills = v.items.flatMap(([label, icon], i) => {
          const [cx, cy] = slots[i], W = 280;
          const out = [txt(label, { cx, cy, autoWidth: false, width: W, align: 'center', fontFamily: 'Nunito', fontWeight: 700, fontSize: 26, fill: v.ink, bg: { style: 'glossy', color: v.pill, padX: 24, padY: 12 }, shadow: { on: true, color: '#000000', opacity: 0.2, blur: 16, x: 0, y: 6 }, name: 'Choice' })];
          if (icon) out.push(stk(icon, cx - W / 2 - 40, cy - 36, 72, 72, { name: 'Choice icon' }));
          return out;
        });
        return {
          width: 1080, height: 1350,
          background: { color: v.sky[0], color2: v.sky[1], gradient: 'linear', angle: 180 },
          overlay: { grain: 22 },
          elements: [
            nat('cloud', 690, 150, 320, 160, { opacity: v.id === 'garden-menu' ? 0 : 0.85, name: 'Cloud' }),
            nat('hill', 0, 640, 1080, 710, { colors: v.hill, profile: v.profile, seed: 4 }),
            nat('flowers', 200, 1105, 330, 120, { colors: v.flower, bloom: v.bloom, seed: 2 }),
            nat('flowers', 690, 975, 330, 100, { colors: v.flower, bloom: v.bloom, seed: 7 }),
            img(380, 470, 320, 860, { name: 'Your photo — press Remove background to cut yourself out', placeholder: ['#e6e1d6', '#c9bfae'], frame: { style: 'rounded', radius: 30, size: 0 }, shadow: { on: true, style: 'cast', angle: 55, length: 0.35, blur: 16, opacity: 0.45, x: 0, y: 0, color: '#000000' } }),
            stk('crystal-gem', 497, 190, 86, 172, { colors: v.gem, anim: { loop: 'float', amount: 0.6 } }),
            ...pills,
          ],
        };
      },
    })),

    // ── text riding a looping ribbon over a photo ──
    ...[
      { id: 'ribbon-fest', name: 'Ribbon festival', path: 'loop', band: '#e6ef7d', ink: '#1d1b18', ph: ['#5d8a4a', '#2f4d2a'], title: 'PET FEST', sub: '14–15 JUNE · CITY PARK', font: 'Unbounded', words: 'a cosy offline festival for pets and their people, with activities, new friends and useful meetups', doodle: '#e6ef7d' },
      { id: 'ribbon-sounds', name: 'Summer sounds', path: 'double', band: '#ff7ab6', ink: '#ffffff', ph: ['#6fb4e8', '#2c5fa8'], title: 'SUMMER\nSOUNDS', sub: 'LIVE MUSIC · EVERY FRIDAY', font: 'Bricolage Grotesque', words: 'SUMMER SOUNDS ✦ LIVE ON THE ROOF ✦ BRING A FRIEND', upper: true, doodle: '#ffd23f' },
      { id: 'ribbon-market', name: 'Saturday market', path: 'scurve', band: '#ff8a3d', ink: '#1d1b18', ph: ['#c9a27a', '#6b4b33'], title: 'MARKET\nDAY', sub: 'SATURDAYS 8–1 · OLD TOWN SQUARE', font: 'Archivo Black', words: 'fresh flowers · sourdough · coffee · local honey · good people', border: '#1d1b18', doodle: '#fff3d6' },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Event', 'Post', 'Ribbon'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: v.ph[1] },
        overlay: { grain: 12 },
        elements: [
          img(0, 0, 1080, 1350, { placeholder: v.ph, name: 'Background photo' }),
          stk('sparkle-4', 800, 40, 170, 170, { colors: [v.doodle], rotation: 12 }),
          stk('sparkle-4', 930, 190, 90, 90, { colors: [v.doodle], rotation: -8 }),
          rib(v.path, -70, 210, 1220, 650, { color: v.band, text: v.words, textColor: v.ink, fontFamily: 'Space Mono', fontWeight: 700, fontSize: 34, uppercase: !!v.upper, thickness: 100, letterSpacing: 0.04, border: { width: v.border ? 6 : 0, color: v.border || '#1d1b18' }, anim: { loop: 'flow', speed: 0.6 } }),
          txt(v.title, { cx: 540, cy: 1040, fontFamily: v.font, fontWeight: v.font === 'Unbounded' ? 800 : v.font === 'Bricolage Grotesque' ? 800 : 400, fontSize: v.title.includes('\n') ? 130 : 150, lineHeight: 0.92, fill: v.band, stroke: v.border ? { width: 6, color: v.border } : undefined }),
          txt(v.sub, { cx: 540, cy: 1230, fontFamily: 'Space Mono', fontWeight: 700, fontSize: 30, letterSpacing: 0.06, fill: '#ffffff', bg: { style: 'pill', color: 'rgba(20,20,20,0.35)', padX: 26, padY: 10 } }),
          stk('flower-doodle', 70, 1150, 150, 150, { colors: [v.doodle], rotation: -10 }),
          stk('sun-doodle', 880, 1140, 140, 140, { colors: [v.doodle] }),
        ],
      }),
    })),

    // ── motion-blurred sport photo with a step-by-step arrow trail ──
    ...[
      { id: 'first-squat', name: 'From the first squat', head: 'FROM\nTHE\nFIRST SQUAT\nTO\nFOREVER.', steps: ['BODY', 'MIND', 'SOUL', 'BODY'], f: { grayscale: 100, contrast: 28, brightness: -6, motion: 55, noise: 55, vignette: 35 }, ph: ['#6b6b6b', '#1c1c1c'], bg: '#151515' },
      { id: 'run-club', name: 'Run club', head: 'MILE ONE\nTO MILE\nONE\nHUNDRED.', steps: ['START', 'PUSH', 'BREATHE', 'FINISH'], f: { contrast: 18, saturation: -20, warmth: 25, motion: 60, noise: 40, vignette: 30 }, ph: ['#a0583a', '#2a140d'], bg: '#1d0f0a' },
      { id: 'dance-studio', name: 'Every rehearsal', head: 'EVERY\nREHEARSAL\nCOUNTS.', steps: ['COUNT', 'MOVE', 'FEEL', 'REPEAT'], f: { contrast: 15, duotone: true, duoDark: '#22104a', duoLight: '#d7c6ff', motion: 65, motionAngle: 90, noise: 45 }, ph: ['#7b67c9', '#1d1238'], bg: '#160c2c' },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Photo', 'Quote', 'Sport'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: v.bg },
        overlay: { grain: 30, vignette: 20 },
        elements: [
          img(0, 0, 1080, 1350, { placeholder: v.ph, filters: v.f, name: 'Action photo' }),
          txt(v.head, { x: 100, y: 70, align: 'left', fontFamily: 'Archivo Black', fontSize: 96, lineHeight: 0.86, fill: '#f2f2ef' }),
          txt(v.steps[0], { x: 92, y: 560, align: 'left', fontFamily: 'Archivo', fontWeight: 700, fontSize: 30, letterSpacing: 0.02, fill: '#f2f2ef' }),
          arrow(130, 610, 190, 160),
          txt(v.steps[1], { x: 336, y: 752, align: 'left', fontFamily: 'Archivo', fontWeight: 700, fontSize: 30, letterSpacing: 0.02, fill: '#f2f2ef' }),
          arrow(430, 800, 200, 160),
          txt(v.steps[2], { x: 640, y: 942, align: 'left', fontFamily: 'Archivo', fontWeight: 700, fontSize: 30, letterSpacing: 0.02, fill: '#f2f2ef' }),
          arrow(722, 990, 180, 160),
          txt(v.steps[3], { x: 912, y: 1132, align: 'left', fontFamily: 'Archivo', fontWeight: 700, fontSize: 30, letterSpacing: 0.02, fill: '#f2f2ef' }),
        ],
      }),
    })),

    // ── shot through a phone camera: fisheye photo with the camera interface on top ──
    ...[
      { id: 'pov-camera', name: 'Creators wanted', style: 'iphone', head: 'Bloggers,\nlet’s team up', sub: 'Now inviting creators', brand: 'WILD TRIP', f: { fisheye: 42, saturation: 10, warmth: 8 }, ph: ['#9cc4d8', '#4f7a3a'], font: 'Gloock', size: 118 },
      { id: 'pov-tapes', name: 'Summer tapes', style: 'camcorder', head: 'SUMMER\nTAPES ’26', sub: 'press play on the good days', brand: 'VOL. 03', f: { noise: 45, fade: 18, warmth: 15, contrast: 8 }, ph: ['#e6b98a', '#7a4a2e'], font: 'VT323', size: 170 },
      { id: 'pov-behind', name: 'Behind the scenes', style: 'minimal', head: 'Behind\nthe scenes', sub: 'Day 03 · Lisbon', brand: 'ON SET', f: { fisheye: 30, fade: 12, contrast: 6 }, ph: ['#d9c7b0', '#5f5246'], font: 'Instrument Serif', size: 140 },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Photo', 'Story', 'Camera'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#000000' },
        elements: [
          img(0, 0, 1080, 1350, { placeholder: v.ph, filters: v.f, name: 'Your photo' }),
          cam(v.style, v.style === 'iphone' ? { lens: true, grid: true } : v.style === 'camcorder' ? { lens: false, grid: false, date: 'JUL 21 2026' } : { lens: true, grid: true }),
          txt(v.brand, { cx: 540, cy: v.style === 'camcorder' ? 300 : 175, fontFamily: v.style === 'camcorder' ? 'VT323' : 'Instrument Sans', fontWeight: v.style === 'camcorder' ? 400 : 600, fontSize: v.style === 'camcorder' ? 44 : 24, letterSpacing: 0.18, fill: '#ffffff' }),
          txt(v.head, { cx: 540, cy: v.style === 'camcorder' ? 470 : 380, fontFamily: v.font, fontSize: v.size, lineHeight: v.style === 'camcorder' ? 0.8 : 0.95, fill: '#ffffff', shadow: { on: true, color: '#000000', opacity: 0.25, blur: 24, x: 0, y: 4 } }),
          txt(v.sub, { cx: 540, cy: v.style === 'camcorder' ? 660 : 560, fontFamily: v.style === 'camcorder' ? 'VT323' : 'Inter', fontWeight: v.style === 'camcorder' ? 400 : 500, fontSize: v.style === 'camcorder' ? 52 : 44, fill: '#ffffff' }),
        ],
      }),
    })),

    // ── save the date, written on a giant wall calendar ──
    ...[
      { id: 'date-green', name: 'Save the date (calendar)', head: 'SAVE\nTHE\nDATE', headInk: '#173d12', l1: 'POWDERFINGER +\nSILVERCHAIR SHOW', l2: '@ Wharf Events', mark: '#5cf06a', price: '$25pp', pen: ['#3fd16a', '#25302a'] },
      { id: 'date-pink', name: 'Birthday dinner', head: 'BIRTHDAY\nDINNER', headInk: '#8f1d4f', l1: 'MAYA TURNS 30 —\nDRESS UP, OBVIOUSLY', l2: '@ Lola’s, 8pm', mark: '#ff8ac8', price: 'RSVP!', pen: ['#ff6fb5', '#3a2030'] },
      { id: 'date-blue', name: 'Deadline day', head: 'DEAD\nLINE', headInk: '#1b2f8f', l1: 'PORTFOLIO DUE\nBY MIDNIGHT', l2: 'don’t panic', mark: '#7fd3ff', price: '11:59', pen: ['#3fa9f5', '#1d2a3a'] },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Event', 'Planner'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#f3f2ee', texture: 55, crumple: 18, crumpleSeed: 21 },
        elements: [
          // one giant cell (the 19th) sits in the middle of the frame; the notes are written inside it
          { type: 'calendar', x: -1271, y: -1146, width: 4000, height: 3600, rotation: -10, year: 2026, month: 4, layout: 'grid', showTitle: false, showWeekdays: false, numberPos: 'corner-right', numberScale: 0.3, lineColor: '#2a2f3a', color: '#2a2f3a', bodyFont: 'Space Mono', bodyWeight: 400, marked: [] },
          txt(v.head, { cx: 431, cy: 537, rotation: -10, align: 'left', fontFamily: 'Archivo Black', fontSize: 96, lineHeight: 0.9, fill: v.headInk }),
          txt(v.l1, { cx: 592, cy: 702, rotation: -20, fontFamily: 'Covered By Your Grace', fontSize: 58, lineHeight: 1.0, fill: '#1d1b18' }),
          txt(v.l2, { cx: 629, cy: 797, rotation: -20, fontFamily: 'Caveat', fontWeight: 600, fontSize: 62, fill: '#1d1b18', bg: { style: 'marker', color: v.mark, padX: 18, padY: 0, gap: 0 } }),
          txt(v.price, { cx: 735, cy: 845, rotation: -10, fontFamily: 'Caveat', fontWeight: 600, fontSize: 54, fill: '#1d1b18', bg: { style: 'scribble', color: '#1d1b18', padX: 34, padY: 24, borderWidth: 3 } }),
          stk('highlighter', 500, 980, 660, 309, { rotation: -10, colors: v.pen }),
        ],
      }),
    })),

    // ── torn notebook papers layered over a photo ──
    ...[
      { id: 'tip-green', name: 'Brand tip', back: '#cfe0ef', backPat: 'dots', front: '#d9eecf', line: 'rgba(90,170,90,0.6)', tape: ['#f2b8cc', '#c86a8a'], flower: '#9cc3ef', title: 'Polish your\nbrand look', body: 'Consistency builds recognition. Stick to the same colours, fonts and style across your posts. It makes your brand instantly recognisable and builds trust.' },
      { id: 'tip-pink', name: 'Reels tip', back: '#f6cfdc', backPat: 'grid', front: '#fbf3c8', line: 'rgba(214,170,60,0.6)', tape: ['#bfe3f2', '#5b9ec4'], flower: '#ff8fb8', title: 'Hook them in\nthree seconds', body: 'Open with the result, not the setup. Show the finished look first, then rewind and walk people through how you got there.' },
      { id: 'tip-lilac', name: 'Caption tip', back: '#dcd3f6', backPat: 'dots', front: '#f4efe6', line: 'rgba(120,110,180,0.5)', tape: ['#d7ef5a', '#8aa12a'], flower: '#f7d046', title: 'Write captions\nlike texts', body: 'Short lines, one idea each, the way you’d message a friend. End with a question so people have a reason to reply.' },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Post', 'Paper', 'Quote'], width: 1080, height: 1080,
      build: () => ({
        width: 1080, height: 1080,
        background: { color: '#6b5a50' },
        elements: [
          img(0, 0, 1080, 1080, { placeholder: ['#9b7d6c', '#4a3a31'], name: 'Background photo' }),
          shp('torn', 250, 130, 700, 500, { tornSides: 'tb', fill: v.back, pattern: { type: v.backPat, color: 'rgba(70,110,170,0.35)', size: 22, thick: 1.4 }, rim: '#ffffff', texture: 25, shadow: soft, seed: 12 }),
          shp('torn', 200, 210, 640, 690, { tornSides: 'l', fill: v.front, pattern: { type: 'lined', color: v.line, size: 34, thick: 1.6, color2: 'rgba(0,0,0,0)' }, rim: '#ffffff', texture: 25, shadow: soft, seed: 15 }),
          stk('washi-grid', 140, 190, 210, 56, { rotation: -2, colors: v.tape }),
          stk('flower-cog', 620, 170, 110, 110, { colors: [v.flower] }),
          txt(v.title, { x: 262, y: 300, align: 'left', fontFamily: 'Instrument Serif', fontSize: 92, lineHeight: 0.95, fill: '#151413' }),
          txt(v.body, { x: 262, y: 520, width: 540, autoWidth: false, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 31, lineHeight: 1.32, fill: '#151413' }),
        ],
      }),
    })),
  ];

  const TEXT_PRESETS = [
    { name: 'Serif headline', el: { text: 'Every shade', fontFamily: 'Instrument Serif', fontSize: 130, lineHeight: 1 } },
    { name: 'Lavender selection', el: { text: 'Shade', fontFamily: 'Instrument Serif', fontSize: 130, lineHeight: 0.92, bg: { style: 'select', color: '#cfc9f3', borderColor: '#7b6cf0', padX: 10, padY: 2, gap: 0, borderWidth: 2 } } },
    { name: 'Sage selection', el: { text: 'Attention', fontFamily: 'Instrument Serif', fontSize: 130, lineHeight: 0.92, bg: { style: 'select', color: '#b9d2c2', borderColor: '#1f5a4a', padX: 10, padY: 2, gap: 0, borderWidth: 2 } } },
    { name: 'Sticker script', el: { text: 'main character', fontFamily: 'Leckerli One', fontSize: 84, fill: '#2b2a26', bg: { style: 'sticker', color: '#fdf3a2', padX: 22 } } },
    { name: 'Line highlight', el: { text: 'Take control of\nyour story.', fontFamily: 'Young Serif', fontSize: 58, align: 'left', lineHeight: 1.05, fill: '#2b2a26', bg: { style: 'lines', color: '#9db38b', padX: 16, padY: 6, gap: 4 } } },
    { name: 'Tag box', el: { text: 'Hi, I’m Emily', fontFamily: 'Instrument Serif', fontSize: 88, fill: '#2148c0', bg: { style: 'box', color: '#ffa53c', padX: 32, padY: 20, radius: 26 } } },
    { name: 'Pill label', el: { text: 'THRIFT HAUS', fontFamily: 'Familjen Grotesk', fontWeight: 700, fontSize: 40, fill: '#101010', bg: { style: 'pill', color: '#ff9ad5', padX: 36, padY: 16 } } },
    { name: 'Oval label', el: { text: 'NEW IN', fontFamily: 'Familjen Grotesk', fontWeight: 600, fontSize: 40, fill: '#101010', bg: { style: 'oval', color: '#d7ef5a', padX: 50, padY: 30 } } },
    { name: 'Washi tape', el: { text: 'See all colors →', fontFamily: 'Instrument Serif', fontSize: 46, fill: '#2a2420', bg: { style: 'tape', color: '#d8cfba', padX: 36, padY: 14 } } },
    { name: 'Retro 3D', el: { text: 'Groovy', fontFamily: 'Shrikhand', fontSize: 120, fill: '#ff7ab6', stroke: { width: 4, color: '#1d1b18' }, echo: { on: true, color: '#1d1b18', dx: 0.06, dy: 0.06, steps: 10 } } },
    { name: 'Outline caps', el: { text: 'OUTLINE', fontFamily: 'Anton', fontSize: 130, fill: 'transparent', stroke: { width: 3, color: '#1d1b18' }, letterSpacing: 0.02 } },
    { name: 'Neon glow', dark: true, el: { text: 'neon nights', fontFamily: 'Pacifico', fontSize: 90, fill: '#fff5fd', shadow: { on: true, color: '#ff4fd8', opacity: 1, blur: 28, x: 0, y: 0 } } },
    { name: 'Marker', el: { text: 'highlight this', fontFamily: 'Caveat', fontWeight: 700, fontSize: 90, fill: '#1d1b18', bg: { style: 'marker', color: '#f7d046', padX: 14, padY: 0, gap: 0 } } },
    { name: 'Chunky rounded', dark: true, el: { text: 'everyday things', fontFamily: 'Fredoka', fontWeight: 600, fontSize: 96, lineHeight: 0.92, fill: '#f6f27a' } },
    { name: 'Mono caption', el: { text: '(to make life more fun!)', fontFamily: 'Space Mono', fontSize: 34, fill: '#1d1b18' } },
    { name: 'Speech bubble', el: { text: 'hey you!', fontFamily: 'Gochi Hand', fontSize: 70, fill: '#1d1b18', bg: { style: 'speech', color: '#ffffff', borderWidth: 4, borderColor: '#1d1b18', padX: 40, padY: 24, radius: 40 } } },
    { name: 'Scallop badge', el: { text: 'TH', fontFamily: 'Instrument Serif', italic: true, fontSize: 100, fill: '#101010', bg: { style: 'scallop', color: '#9b8cf2', padX: 48, padY: 56 } } },
    { name: 'Curved arch', el: { text: 'good things take time', fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 56, uppercase: true, letterSpacing: 0.08, curve: 38, fill: '#e4572e' } },
    { name: 'Burst sale', el: { text: '50%\nOFF', fontFamily: 'Archivo Black', fontSize: 70, lineHeight: 0.9, fill: '#ffffff', bg: { style: 'burst', color: '#f2542d', padX: 70, padY: 70 } } },
    { name: 'Ticket', el: { text: 'ADMIT ONE', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 40, letterSpacing: 0.1, fill: '#1d1b18', bg: { style: 'ticket', color: '#ffb547', padX: 50, padY: 24, radius: 10 } } },
    { name: 'Swoosh underline', el: { text: 'lovely', fontFamily: 'DM Serif Display', italic: true, fontSize: 110, fill: '#1d1b18', bg: { style: 'underline', color: '#ff5fa2', padX: 6, padY: 0, gap: 0 } } },
    { name: 'Gradient heavy', el: { text: 'SUMMER', fontFamily: 'Unbounded', fontWeight: 900, fontSize: 104, fill: '#ff8a3d', fill2: '#ff4fa0', gradient: 'linear', gradAngle: 90 } },
    { name: 'Typewriter note', el: { text: 'dear diary,', fontFamily: 'Special Elite', fontSize: 50, fill: '#1d1b18', bg: { style: 'box', color: '#fffdf7', padX: 28, padY: 16 }, shadow: { on: true, color: '#000000', opacity: 0.2, blur: 14, x: 0, y: 6 } } },
    { name: 'Condensed caps', el: { text: 'THE EDIT', fontFamily: 'Bebas Neue', fontSize: 170, letterSpacing: 0.02, fill: '#1d1b18' } },
    { name: 'Circled', el: { text: 'this one!', fontFamily: 'Caveat', fontWeight: 700, fontSize: 80, fill: '#1d1b18', bg: { style: 'scribble', color: '#ff3b30', padX: 46, padY: 34, borderWidth: 5 } } },
    { name: 'Torn note', el: { text: 'notes to self', fontFamily: 'Instrument Serif', italic: true, fontSize: 60, fill: '#1d1b18', bg: { style: 'torn', color: '#fbf8f1', padX: 38, padY: 26 }, shadow: { on: true, color: '#000000', opacity: 0.2, blur: 18, x: 0, y: 8 } } },
    { name: 'Bubble pop', el: { text: 'pop!', fontFamily: 'Rubik Bubbles', fontSize: 130, fill: '#ff7ab6' } },
    { name: 'Wet paint', el: { text: 'DRIP', fontFamily: 'Rubik Wet Paint', fontSize: 130, fill: '#5b4cf5' } },
    { name: 'Elegant script', el: { text: 'with love', fontFamily: 'Great Vibes', fontSize: 110, fill: '#1d1b18' } },
    { name: 'Blackletter-ish', el: { text: 'Cowboy Club', fontFamily: 'Rye', fontSize: 80, fill: '#8b3a1f' } },
    { name: 'Pixel', el: { text: 'LEVEL UP', fontFamily: 'Press Start 2P', fontSize: 46, fill: '#1d1b18', bg: { style: 'box', color: '#d7ef5a', padX: 24, padY: 20 } } },
    { name: 'Stacked display', el: { text: 'BIG\nNEWS', fontFamily: 'Dela Gothic One', fontSize: 120, lineHeight: 0.95, fill: '#1f3fd1' } },
    { name: 'Poster double outline', el: { text: 'POSTFÓLIO', fontFamily: 'Anton', fontSize: 150, letterSpacing: -0.01, fill: '#2a2420', bg: { style: 'sticker', color: '#fbefd9', padX: 22, borderWidth: 5, borderColor: '#2a2420' } } },
    { name: 'Bubble sticker', el: { text: 'estilos de\ndesign', fontFamily: 'Gabarito', fontWeight: 900, fontSize: 110, lineHeight: 0.85, letterSpacing: -0.03, fill: '#151413', bg: { style: 'sticker', color: '#ffffff', padX: 18, borderWidth: 6, borderColor: '#151413' } } },
    { name: 'Rounded pop', el: { text: 'design', fontFamily: 'Fredoka', fontWeight: 600, fontSize: 150, fill: '#f283b4', bg: { style: 'sticker', color: '#ffffff', padX: 20 }, shadow: { on: true, color: '#000000', opacity: 0.18, blur: 18, x: 0, y: 6 } } },
    { name: 'Blue label', el: { text: 'ferramentas de', fontFamily: 'Nunito', fontWeight: 600, fontSize: 56, fill: '#ffffff', bg: { style: 'box', color: '#2f6fed', padX: 22, padY: 6, borderWidth: 3, borderColor: '#ffffff' } } },
    { name: 'Stitched label', el: { text: 'que eu uso', fontFamily: 'Nunito', fontWeight: 600, fontSize: 56, fill: '#ffffff', bg: { style: 'box', color: '#3aa655', padX: 26, padY: 10, stitch: true, borderColor: '#ffffff', borderWidth: 2.5 } } },
    { name: 'Marker blocks', el: { text: 'HI, I’M\nKIMBERLY\nBLOOM', fontFamily: 'Permanent Marker', fontSize: 58, lineHeight: 1, fill: '#1d1b18', bg: { style: 'rough', color: '#f7d046', padX: 12, padY: 2, gap: 2 } } },
    { name: 'Wide heavy', dark: true, el: { text: 'CREATIVE\nPARTNER', fontFamily: 'Rubik Mono One', fontSize: 92, lineHeight: 0.95, fill: '#ffffff', shadow: { on: true, color: '#0b3a8f', opacity: 0.35, blur: 20, x: 0, y: 6 } } },
    { name: 'Chalk note', dark: true, el: { text: 'not a prompt\nbut a real\nconversation', fontFamily: 'Gloria Hallelujah', fontSize: 40, lineHeight: 1.05, fill: '#ffffff' } },
    { name: 'Tracked caption', el: { text: 'Ryane | Designer Gráfico 2026', fontFamily: 'Poppins', fontWeight: 600, fontSize: 30, letterSpacing: 0.12, fill: '#ffffff', shadow: { on: true, color: '#000000', opacity: 0.25, blur: 8, x: 0, y: 2 } }, dark: true },
    { name: 'Birthday 3D', el: { text: 'happy\nbirthday', fontFamily: 'Bagel Fat One', fontSize: 120, lineHeight: 0.88, fill: '#ff4f79', stroke: { width: 5, color: '#ffffff' }, echo: { on: true, color: '#7a1f3d', dx: 0.03, dy: 0.04, steps: 6 } } },
    { name: 'Chalk heading', dark: true, el: { text: 'today’s menu', fontFamily: 'Covered By Your Grace', fontSize: 100, fill: '#f6f1e7' } },
    { name: 'Italic display', el: { text: 'coming\nsoon', fontFamily: 'Instrument Serif', italic: true, fontSize: 150, lineHeight: 0.82, fill: '#1d1b18' } },
    { name: 'Wide spaced', el: { text: '★ 2000 forever ★', fontFamily: 'Syncopate', fontWeight: 700, fontSize: 40, letterSpacing: 0.1, fill: '#5b4cf5' } },
    { name: 'Light caps', el: { text: 'ONE\nJACKET FOR\nEVERY MOOD', fontFamily: 'Josefin Sans', fontWeight: 300, fontSize: 66, lineHeight: 1.22, letterSpacing: 0.02, fill: '#1d1b18' } },
  ];

  const PAPER_PRESETS = [
    { name: 'Notebook page', el: W => ({ shape: 'rounded', radius: W * 0.014, width: W * 0.56, height: W * 0.72, fill: '#fbf8f1', texture: 45, shadow: soft, pattern: { type: 'lined', color: 'rgba(70,110,160,0.28)', size: W * 0.036, thick: 1.4 } }) },
    { name: 'Graph paper', el: W => ({ shape: 'rect', width: W * 0.5, height: W * 0.62, fill: '#fbfbf6', texture: 25, shadow: soft, pattern: { type: 'graph', color: 'rgba(70,130,170,0.32)', size: W * 0.05, thick: 1.2 } }) },
    { name: 'Dot grid', el: W => ({ shape: 'rect', width: W * 0.5, height: W * 0.62, fill: '#f6f2e8', texture: 30, shadow: soft, pattern: { type: 'dots', color: 'rgba(0,0,0,0.28)', size: W * 0.03, thick: 1.6 } }) },
    { name: 'Sticky note', el: W => ({ shape: 'rect', width: W * 0.3, height: W * 0.3, fill: '#ffe680', texture: 30, shadow: lifted }) },
    { name: 'Torn scrap', el: W => ({ shape: 'torn', width: W * 0.46, height: W * 0.3, fill: '#fbf8f1', texture: 50, shadow: soft, seed: 9 }) },
    { name: 'Kraft card', el: W => ({ shape: 'rounded', radius: W * 0.02, width: W * 0.46, height: W * 0.3, fill: '#c8a97e', texture: 80, shadow: soft }) },
    { name: 'Index card', el: W => ({ shape: 'rect', width: W * 0.5, height: W * 0.32, fill: '#fffdf7', texture: 30, shadow: soft, pattern: { type: 'lined', color: 'rgba(80,130,190,0.35)', size: W * 0.028, thick: 1.2 } }) },
    { name: 'Gingham square', el: W => ({ shape: 'rect', width: W * 0.4, height: W * 0.4, fill: '#ffffff', pattern: { type: 'gingham', color: '#f29bb4', size: W * 0.03 } }) },
    { name: 'Ticket', el: W => ({ shape: 'ticket', radius: 14, width: W * 0.5, height: W * 0.22, fill: '#ff8a5c', texture: 25 }) },
    { name: 'Cutting mat', el: W => ({ shape: 'rounded', radius: W * 0.02, width: W * 0.6, height: W * 0.6, fill: '#1f5a4a', pattern: { type: 'grid', color: 'rgba(255,255,255,0.16)', size: W * 0.04, thick: 1.4 } }) },
    { name: 'Stamp sheet', el: W => ({ shape: 'stamp', width: W * 0.32, height: W * 0.4, fill: '#fbf8f1', texture: 40, shadow: lifted }) },
    { name: 'Speech card', el: W => ({ shape: 'speech', radius: W * 0.04, width: W * 0.46, height: W * 0.3, fill: '#ffffff', stroke: '#1d1b18', strokeWidth: 4 }) },
  ];

  const cal = o => Object.assign({ type: 'calendar', year: yr, month: mo, day: dy, width: 860, height: 760 }, o);
  const PLANNER_PRESETS = [
    { group: 'Calendars', name: 'Classic grid', el: cal({ marked: [dy], markStyle: 'circle', accent: '#e4572e' }) },
    { group: 'Calendars', name: 'Minimal', el: cal({ layout: 'minimal', titleAlign: 'center', marked: [dy], accent: '#1d1b18', dayFormat: 'initial', headerLine: true }) },
    { group: 'Calendars', name: 'Soft cells', el: cal({ showLines: false, cellColor: '#f1ebdd', cellRadius: 0.3, accent: '#7fa88a', marked: [dy, dy + 3 > 28 ? 2 : dy + 3], titleFont: 'Fraunces', titleWeight: 600, bodyFont: 'DM Sans' }) },
    { group: 'Calendars', name: 'Bold poster', el: cal({ bgColor: '#f7d046', radius: 34, titleFont: 'Anton', monthCase: 'upper', bodyFont: 'Space Mono', bodyWeight: 700, accent: '#f2542d', lineColor: 'rgba(29,27,24,0.35)', marked: [dy] }) },
    { group: 'Calendars', name: 'Scribbled dates', el: cal({ layout: 'minimal', titleFont: 'Caveat', titleWeight: 700, bodyFont: 'Gaegu', bodyWeight: 700, markStyle: 'scribble', accent: '#ff3b30', marked: [3, 14, dy], titleAlign: 'center' }) },
    { group: 'Calendars', name: 'Love dates', el: cal({ layout: 'minimal', titleFont: 'Great Vibes', titleAlign: 'center', bodyFont: 'Josefin Sans', markStyle: 'heart', accent: '#ff7ab6', marked: [14, dy] }) },
    { group: 'Calendars', name: 'Midnight', dark: true, el: cal({ bgColor: '#1d1b18', radius: 30, color: '#f6f1e7', accent: '#d7ef5a', accentText: '#1d1b18', lineColor: 'rgba(246,241,231,0.2)', titleFont: 'Bricolage Grotesque', titleWeight: 700, bodyFont: 'Bricolage Grotesque', weekendAccent: true, marked: [dy] }) },
    { group: 'Calendars', name: 'Week strip', el: cal({ layout: 'strip', width: 900, height: 280, accent: '#5b4cf5', titleFont: 'Instrument Serif', bodyFont: 'Instrument Sans' }) },
    { group: 'Calendars', name: 'Week pills', el: cal({ layout: 'strip', width: 900, height: 280, showTitle: false, cellColor: '#f1ebdd', accent: '#ff8a3d', titleFont: 'Bricolage Grotesque', titleWeight: 700, bodyFont: 'Bricolage Grotesque' }) },
    { group: 'Calendars', name: 'Tear-off date', el: cal({ layout: 'page', width: 420, height: 500, accent: '#e4572e', titleFont: 'Instrument Serif', bodyFont: 'Instrument Sans', monthCase: 'upper', titleSpacing: 0.12, shadow: lifted }) },
    { group: 'Calendars', name: 'Date block', el: cal({ layout: 'page', width: 420, height: 500, accent: '#1f5a4a', cellColor: '#f4f0e6', titleFont: 'Anton', bodyFont: 'Space Mono', monthCase: 'upper', shadow: lifted }) },
    { group: 'Checklists', name: 'To-do', el: { type: 'checklist', width: 620, fontFamily: 'Caveat', fontSize: 56 } },
    { group: 'Checklists', name: 'Circles', el: { type: 'checklist', width: 620, fontFamily: 'Instrument Sans', fontSize: 42, boxStyle: 'circle', fillChecked: true, boxColor: '#5b4cf5', items: '[x] Plan the shoot\n[ ] Edit photos\n[ ] Post on Friday' } },
    { group: 'Checklists', name: 'Hearts', el: { type: 'checklist', width: 620, fontFamily: 'Gaegu', fontWeight: 700, fontSize: 52, boxStyle: 'heart', fillChecked: true, boxColor: '#ff5fa2', items: '[x] Self care Sunday\n[ ] Read 20 pages\n[ ] Text my bestie' } },
    { group: 'Checklists', name: 'Ruled notes', el: { type: 'checklist', width: 700, fontFamily: 'Special Elite', fontSize: 40, ruled: true, boxStyle: 'square', items: '[ ] Groceries\n[x] Laundry\n[ ] Pay rent\n[ ] Book tickets' } },
    { group: 'Badges', name: 'Years experience', el: { type: 'badge', width: 300, height: 300, fill: '#d7ef5a', textColor: '#2148c0', ringText: '5+ years experience', ringFill: false, ringStart: -40 } },
    { group: 'Badges', name: 'New in', el: { type: 'badge', width: 300, height: 300, shape: 'scallop', fill: '#ff9ad5', textColor: '#101010', ringText: 'new in', ringRepeat: true, ringSep: '  ✦  ', center: 'text', centerText: 'NEW', centerFont: 'Instrument Serif', centerWeight: 400, centerItalic: true, centerSize: 0.3, ringFont: 'Familjen Grotesk', ringWeight: 600 } },
    { group: 'Badges', name: 'Sale', el: { type: 'badge', width: 300, height: 300, shape: 'burst', fill: '#f7d046', textColor: '#1d1b18', ringText: 'limited time only', ringRadius: 0.66, ringSize: 0.08, center: 'text', centerText: '50%', centerFont: 'Archivo Black', centerSize: 0.26, ringFont: 'Space Mono', ringWeight: 700 } },
    { group: 'Badges', name: 'Handmade', el: { type: 'badge', width: 300, height: 300, shape: 'flower', fill: '#c9b6f2', textColor: '#3b2f6b', ringText: 'handmade with love', ringFont: 'Fraunces', ringWeight: 600, center: 'heart', centerColor: '#ff5fa2' } },
    { group: 'Badges', name: 'Open daily', el: { type: 'badge', width: 300, height: 300, fill: '#1d1b18', textColor: '#f6f1e7', ringText: 'open daily · 9 to 5', ringFont: 'Space Mono', ringWeight: 400, innerRing: true, center: 'star', centerColor: '#f7d046', centerSize: 0.22 } },
    { group: 'Badges', name: 'Est. stamp', el: { type: 'badge', width: 300, height: 300, shape: 'none', textColor: '#1d1b18', ringText: 'studio · collective · ', ringRepeat: true, ringSep: '', ringFont: 'Bricolage Grotesque', ringWeight: 700, center: 'text', centerText: 'EST.\n' + yr, centerFont: 'Bricolage Grotesque', centerSize: 0.15, innerRing: true } },
  ];

  const PHOTO_LAYOUTS = [
    {
      name: 'Photo booth strip (3)',
      build: d => {
        const W = d.width, s = W / 1080, x = d.width / 2 - 150 * s, y = d.height / 2 - 450 * s;
        return [
          { type: 'shape', shape: 'rect', x, y, width: 300 * s, height: 900 * s, fill: '#f7c6cf', shadow: soft },
          ...[0, 1, 2].map(i => ({ type: 'image', x: x + 22 * s, y: y + (22 + i * 282) * s, width: 256 * s, height: 262 * s, placeholder: ['#e7e1d4', '#cfc5b1'] })),
        ];
      },
    },
    {
      name: 'Polaroid pile (3)',
      build: d => {
        const s = d.width / 1080, cx = d.width / 2, cy = d.height / 2;
        const P = (dx, dy, r, tint) => ({ type: 'image', x: cx + dx * s, y: cy + dy * s, width: 380 * s, height: 450 * s, rotation: r, placeholder: tint, frame: { style: 'polaroid', color: '#ffffff', size: 20 * s, bottom: 3.6 }, shadow: soft });
        return [
          P(-470, -330, -8, ['#f3d9d0', '#e3b4a6']), P(-40, -380, 5, ['#d8e4d2', '#b4c9aa']), P(-230, -40, -2, ['#dad6ef', '#b9b2de']),
          { type: 'sticker', stickerId: 'washi-stripes', x: cx - 120 * s, y: cy - 70 * s, width: 220 * s, height: 58 * s, rotation: -6 },
        ];
      },
    },
    {
      name: 'Grid 2 × 2',
      build: d => {
        const g = d.width * 0.03, w = (d.width - g * 3) / 2, hh = (d.height - g * 3) / 2;
        return [0, 1, 2, 3].map(i => ({ type: 'image', x: g + (i % 2) * (w + g), y: g + Math.floor(i / 2) * (hh + g), width: w, height: hh, frame: { style: 'rounded', radius: d.width * 0.02, size: 0 }, placeholder: [['#e7e1d4', '#cfc5b1'], ['#f3d9d0', '#e3b4a6'], ['#d8e4d2', '#b4c9aa'], ['#dad6ef', '#b9b2de']][i] }));
      },
    },
    {
      name: 'Stamp trio',
      build: d => {
        const s = d.width / 1080, cy = d.height / 2;
        return [-1, 0, 1].map(i => ({ type: 'image', x: d.width / 2 - 140 * s + i * 310 * s, y: cy - 170 * s + (i === 0 ? -30 : 20) * s, width: 280 * s, height: 340 * s, rotation: i * 4, frame: { style: 'stamp', color: ['#7fb2d9', '#9ab83e', '#f6a5c0'][i + 1], size: 22 * s }, shadow: lifted, placeholder: ['#f6dccf', '#e7b29f'] }));
      },
    },
    {
      name: 'Film frames (3)',
      build: d => {
        const s = d.width / 1080, w = 900 * s, x = d.width / 2 - w / 2, y = d.height / 2 - 200 * s;
        return [0, 1, 2].map(i => ({ type: 'image', x: x + i * 300 * s, y, width: 300 * s, height: 400 * s, frame: { style: 'film', color: '#1d1b18', size: 8 * s }, placeholder: ['#d3e3ee', '#a9c6db'] }));
      },
    },
  ];

  const BACKGROUNDS = [
    { name: 'Crumpled blue', bg: { color: '#2d3fd3', crumple: 70, crumpleSeed: 3 }, overlay: { grain: 10 } },
    { name: 'Crumpled red', bg: { color: '#d8402d', crumple: 70, crumpleSeed: 4 }, overlay: { grain: 10 } },
    { name: 'Crumpled yellow', bg: { color: '#f2cf3d', crumple: 65, crumpleSeed: 5 }, overlay: { grain: 10 } },
    { name: 'Crumpled pink', bg: { color: '#f27bb3', crumple: 65, crumpleSeed: 6 }, overlay: { grain: 10 } },
    { name: 'Crumpled green', bg: { color: '#1f8a4c', crumple: 70, crumpleSeed: 7 }, overlay: { grain: 10 } },
    { name: 'Crumpled orange', bg: { color: '#f07a2a', crumple: 65, crumpleSeed: 8 }, overlay: { grain: 10 } },
    { name: 'Crumpled lilac', bg: { color: '#b9a6ee', crumple: 60, crumpleSeed: 9 }, overlay: { grain: 10 } },
    { name: 'Crumpled navy', bg: { color: '#1c2a5a', crumple: 75, crumpleSeed: 10 }, overlay: { grain: 10 } },
    { name: 'Crumpled black', bg: { color: '#1a1918', crumple: 80, crumpleSeed: 11 }, overlay: { grain: 10 } },
    { name: 'Crumpled kraft', bg: { color: '#c39a6b', crumple: 70, crumpleSeed: 12 }, overlay: { grain: 10 } },
    { name: 'Crumpled cream', bg: { color: '#efe8da', crumple: 55, crumpleSeed: 13 }, overlay: { grain: 10 } },
    { name: 'Crumpled white', bg: { color: '#f7f6f2', crumple: 50, crumpleSeed: 14 }, overlay: { grain: 10 } },
    { name: 'Cutting mat', bg: { color: '#1f5a4a', pattern: grid('rgba(255,255,255,0.10)', 54), texture: 12 } },
    { name: 'Grid paper', bg: { color: '#f3f2ee', pattern: grid('rgba(40,40,40,0.13)', 108, 2) } },
    { name: 'Graph paper', bg: { color: '#f6f5ef', pattern: { type: 'graph', color: 'rgba(70,130,170,0.3)', size: 90, thick: 1.4 }, texture: 20 } },
    { name: 'Notebook', bg: { color: '#fbf8f1', pattern: { type: 'lined', color: 'rgba(70,110,160,0.28)', size: 46, thick: 1.5 }, texture: 30 } },
    { name: 'Dot journal', bg: { color: '#f3efe6', pattern: { type: 'dots', color: 'rgba(0,0,0,0.25)', size: 36, thick: 1.8 }, texture: 25 } },
    { name: 'Cream paper', bg: { color: '#f2eadb', texture: 55 } },
    { name: 'Kraft', bg: { color: '#c8a97e', texture: 85 } },
    { name: 'Gingham', bg: { color: '#ffffff', pattern: { type: 'gingham', color: '#f29bb4', size: 44 } } },
    { name: 'Checkerboard', bg: { color: '#f6f1e7', pattern: { type: 'check', color: '#1d1b18', size: 90 } } },
    { name: 'Lilac check', bg: { color: '#ece6ff', pattern: { type: 'check', color: '#c9b6f2', size: 70 } } },
    { name: 'Blueprint', bg: { color: '#1f3fd1', pattern: grid('rgba(255,255,255,0.22)', 60) } },
    { name: 'Mint stripes', bg: { color: '#dff3e9', pattern: { type: 'stripes', color: 'rgba(43,179,163,0.22)', size: 70 } } },
    { name: 'Retro waves', bg: { color: '#ffefd6', pattern: { type: 'waves', color: '#ff8a3d', size: 70, thick: 6 } } },
    { name: 'Polka', bg: { color: '#ffd6e0', pattern: { type: 'polka', color: '#ffffff', size: 90 } } },
    { name: 'Halftone', bg: { color: '#ffffff', pattern: { type: 'halftone', color: '#1d1b18', size: 26 } } },
    { name: 'Sunset', bg: { color: '#ff8a3d', color2: '#ff7ab6', gradient: 'linear', angle: 160 }, overlay: { grain: 18 } },
    { name: 'Lilac haze', bg: { color: '#f2edff', color2: '#c9b6f2', gradient: 'radial' }, overlay: { grain: 12 } },
    { name: 'Midnight film', bg: { color: '#141312' }, overlay: { grain: 35, vignette: 30 } },
    { name: 'Diagonal', bg: { color: '#f7d046', pattern: { type: 'diagonal', color: 'rgba(29,27,24,0.12)', size: 60 } } },
    { name: 'Plus grid', bg: { color: '#1d1b18', pattern: { type: 'plus', color: 'rgba(255,255,255,0.3)', size: 60, thick: 2 } } },
  ];

  // families of variations show as one card in the panel and open into all their styles
  const GROUPS = {
    'Moving grids': [], 'Photo piles': [], 'Strips & panels': [],
    'Text slides': ['ts-created', 'ts-goal', 'ts-earth', 'ts-crisis', 'ts-brands', 'ts-made', 'ts-align', 'ts-dress', 'ts-meant', 'ts-new', 'ts-visuals', 'ts-average', 'ts-cool', 'ts-iamart', 'ts-redact', 'ts-rest', 'ts-chase', 'ts-chapter', 'ts-do', 'ts-action', 'ts-where', 'ts-norest', 'ts-scribble', 'ts-feeling', 'ts-museum', 'ts-story', 'ts-justdo', 'ts-notend', 'ts-consume', 'ts-love', 'ts-now', 'ts-austen', 'ts-son', 'ts-sleep', 'ts-laziest', 'ts-gofor', 'ts-normalize', 'ts-purpose', 'ts-passion', 'ts-artflip', 'ts-exactly', 'ts-identity', 'ts-ability', 'ts-tryagain', 'ts-authentic', 'ts-happen', 'ts-memories', 'ts-now2', 'ts-hands', 'ts-messy', 'ts-start', 'ts-rushed', 'ts-develop', 'ts-addicted', 'ts-makeit', 'ts-dothis', 'ts-mostcreative', 'ts-busy', 'ts-lesscare', 'ts-chapter2', 'ts-overthink', 'ts-athletes', 'ts-curated', 'ts-outside', 'ts-done', 'ts-whatmakes', 'ts-support', 'ts-takerisk', 'ts-thinkbig'],
    'Photo effects': ['px-scribble', 'px-strips', 'px-censor', 'px-mosaic', 'px-mirror', 'px-eyes', 'px-childhood', 'px-note', 'px-words', 'px-brandfade', 'px-faceswap', 'px-ghost', 'px-phone', 'px-signed', 'px-redbar', 'px-taped', 'px-redprint', 'px-backdrop', 'px-gridpaper', 'px-letter', 'px-quote', 'px-fieldnotes', 'px-belonged', 'px-touch', 'px-margins', 'px-worthy', 'px-sketchbook'],
    'Paper & ID': ['pid-mugshot', 'pid-inquiry', 'pid-badge', 'pid-portrait', 'pid-certificate', 'pid-record', 'pid-pass', 'pid-application', 'pid-aboutme', 'pid-profile'],
    'Film looks': ['fl-gold', 'fl-portrait', 'fl-night', 'fl-super8', 'fl-expired', 'fl-disposable', 'fl-burn', 'fl-vivid', 'fl-green', 'fl-cinema', 'fl-cross', 'fl-leak', 'fl-bleach', 'fl-twostrip', 'fl-pan400', 'fl-projector'],
    'Film camera': ['fc-contact', 'fc-leader', 'fc-strip', 'fc-slides', 'fc-instant', 'fc-darkroom', 'fc-negative', 'fc-halfframe', 'fc-medium', 'fc-booth'],
    'Stop motion': ['stop-classic', 'stop-polaroid', 'stop-reel'],
    'Speed flashes': ['flash-mindset', 'flash-grind', 'flash-race', 'flash-premium'],
    'Studio portrait': ['studio-stat', 'studio-circle', 'studio-rhythm', 'studio-data'],
    'Newspaper reveal': ['news-pullback', 'news-crash', 'news-snap', 'news-cuts', 'news-push'],
    'Typing': ['type-follow', 'type-marker', 'type-crash', 'type-terminal'],
    'Match cut': ['match-highlight', 'match-dark', 'match-news'],
    'Kinetic headline': ['kinetic-news', 'kinetic-reveal', 'kinetic-pop'],
    'Sticky notes': ['sticky-cut', 'sticky-stack', 'sticky-flip'],
    'Rolling numbers': ['roll-years', 'roll-countdown', 'roll-price'],
    'Typing screen': [],
    'Smooth cam text': [],
    'Text effects': ['fx-thermal', 'fx-ink', 'fx-thermal-photo', 'fx-night', 'fx-ink-quote'],
    'Type effects': ['te-build', 'te-sweep', 'te-wall', 'te-shuffle', 'te-build-portrait', 'te-sweep-night', 'te-shuffle-cream'],
    'Screen close-up': ['sc-phrases', 'sc-thread', 'sc-phrases-story', 'sc-thread-story'],
    'Word by word': ['words-films', 'words-bold', 'words-soft'],
    'Letter bounce': ['bounce-everyone', 'bounce-hello', 'bounce-pastel'],
    'Life-sim garden': ['garden-menu', 'garden-golden', 'garden-dusk'],
    'Ribbon poster': ['ribbon-fest', 'ribbon-sounds', 'ribbon-market'],
    'Motion blur': ['first-squat', 'run-club', 'dance-studio'],
    'Camera view': ['pov-camera', 'pov-tapes', 'pov-behind'],
    'Meet the team': ['meet-women', 'meet-team', 'our-story'],
    'Grid-paper notes': ['note-blue', 'note-green', 'note-pink'],
    'Polaroid POV': ['pov-red', 'pov-blue', 'pov-green'],
    'Wall calendar': ['date-green', 'date-pink', 'date-blue'],
    'Notebook tip': ['tip-green', 'tip-pink', 'tip-lilac'],
  };
  // families made by a layout generator list themselves (one member per orientation)
  for (const t of TEMPLATES) if (t.family && GROUPS[t.family]) GROUPS[t.family].push(t.id);
  const ORDER = ['every-shade', ...Object.values(GROUPS).flat()];
  for (const [g, ids] of Object.entries(GROUPS)) for (const id of ids) { const t = TEMPLATES.find(x => x.id === id); if (t) t.group = g; }
  const rank = t => ORDER.includes(t.id) ? ORDER.indexOf(t.id) : 1000;
  TEMPLATES.sort((a, b) => rank(a) - rank(b));
  window.STUDIO_TEMPLATES = TEMPLATES;
  window.STUDIO_TEXT_PRESETS = TEXT_PRESETS;
  window.STUDIO_PAPER_PRESETS = PAPER_PRESETS;
  window.STUDIO_PLANNER_PRESETS = PLANNER_PRESETS;
  window.STUDIO_PHOTO_LAYOUTS = PHOTO_LAYOUTS;
  window.STUDIO_BACKGROUNDS = BACKGROUNDS;
})();
