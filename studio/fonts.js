/* Studio — font catalogue.
   Every family here is served by Google Fonts; the axis spec after the name was
   verified against the css2 API. [family, category, axes, weights, hasItalic] */
(function () {
  const RAW = [
  ['Instrument Serif','Serif','ital@0;1',[400],1],
  ['Playfair Display','Serif','ital,wght@0,400..900;1,400..900',[400,500,600,700,800,900],1],
  ['DM Serif Display','Serif','ital@0;1',[400],1],
  ['Fraunces','Serif','ital,opsz,wght@0,9..144,100..900;1,9..144,100..900',[100,200,300,400,500,600,700,800,900],1],
  ['Gloock','Serif','',[400],0],
  ['Young Serif','Serif','',[400],0],
  ['Abril Fatface','Serif','',[400],0],
  ['Bodoni Moda','Serif','ital,opsz,wght@0,6..96,400..900;1,6..96,400..900',[400,500,600,700,800,900],1],
  ['Cormorant Garamond','Serif','ital,wght@0,300..700;1,300..700',[300,400,500,600,700],1],
  ['Libre Caslon Display','Serif','',[400],0],
  ['Yeseva One','Serif','',[400],0],
  ['Prata','Serif','',[400],0],
  ['Italiana','Serif','',[400],0],
  ['Rozha One','Serif','',[400],0],
  ['Newsreader','Serif','ital,opsz,wght@0,6..72,200..800;1,6..72,200..800',[200,300,400,500,600,700,800],1],
  ['EB Garamond','Serif','ital,wght@0,400..800;1,400..800',[400,500,600,700,800],1],
  ['Alfa Slab One','Serif','',[400],0],
  ['Ultra','Serif','',[400],0],
  ['Bebas Neue','Sans','',[400],0],
  ['Anton','Sans','',[400],0],
  ['Oswald','Sans','wght@200..700',[200,300,400,500,600,700],0],
  ['Archivo Black','Sans','',[400],0],
  ['Big Shoulders Display','Sans','wght@100..900',[100,200,300,400,500,600,700,800,900],0],
  ['Bricolage Grotesque','Sans','opsz,wght@12..96,200..800',[200,300,400,500,600,700,800],0],
  ['Syne','Sans','wght@400..800',[400,500,600,700,800],0],
  ['Space Grotesk','Sans','wght@300..700',[300,400,500,600,700],0],
  ['Unbounded','Sans','wght@200..900',[200,300,400,500,600,700,800,900],0],
  ['Familjen Grotesk','Sans','ital,wght@0,400..700;1,400..700',[400,500,600,700],1],
  ['Instrument Sans','Sans','ital,wght@0,400..700;1,400..700',[400,500,600,700],1],
  ['Arimo','Sans','ital,wght@0,400..700;1,400..700',[400,500,600,700],1],
  ['Inter Tight','Sans','ital,wght@0,100..900;1,100..900',[100,200,300,400,500,600,700,800,900],1],
  ['Noto Sans Telugu','Sans','wght@100..900',[100,200,300,400,500,600,700,800,900],0],
  ['Roboto Condensed','Sans','ital,wght@0,100..900;1,100..900',[100,200,300,400,500,600,700,800,900],1],
  ['Archivo Narrow','Sans','ital,wght@0,400..700;1,400..700',[400,500,600,700],1],
  ['Barlow Condensed','Sans','ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400',[400,500,600,700,800,900],0],
  ['League Gothic','Display','',[400],0],
  ['Antonio','Display','wght@100..700',[100,200,300,400,500,600,700],0],
  ['Inter','Sans','ital,opsz,wght@0,14..32,100..900;1,14..32,100..900',[100,200,300,400,500,600,700,800,900],1],
  ['DM Sans','Sans','ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000',[100,200,300,400,500,600,700,800,900],1],
  ['Poppins','Sans','ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700',[300,400,500,600,700,800,900],1],
  ['Montserrat','Sans','ital,wght@0,100..900;1,100..900',[100,200,300,400,500,600,700,800,900],1],
  ['League Spartan','Sans','wght@100..900',[100,200,300,400,500,600,700,800,900],0],
  ['Outfit','Sans','wght@100..900',[100,200,300,400,500,600,700,800,900],0],
  ['Archivo','Sans','ital,wdth,wght@0,62..125,100..900;1,62..125,100..900',[100,200,300,400,500,600,700,800,900],1],
  ['Rubik','Sans','ital,wght@0,300..900;1,300..900',[300,400,500,600,700,800,900],1],
  ['Fredoka','Sans','wdth,wght@75..125,300..700',[300,400,500,600,700],0],
  ['Baloo 2','Sans','wght@400..800',[400,500,600,700,800],0],
  ['Nunito','Sans','ital,wght@0,200..1000;1,200..1000',[200,300,400,500,600,700,800,900],1],
  ['Gabarito','Sans','wght@400..900',[400,500,600,700,800,900],0],
  ['Rubik Mono One','Display','',[400],0],
  ['Dela Gothic One','Display','',[400],0],
  ['Bowlby One','Display','',[400],0],
  ['Shrikhand','Display','',[400],0],
  ['Righteous','Display','',[400],0],
  ['Monoton','Display','',[400],0],
  ['Bungee','Display','',[400],0],
  ['Bungee Shade','Display','',[400],0],
  ['Titan One','Display','',[400],0],
  ['Chango','Display','',[400],0],
  ['Lilita One','Display','',[400],0],
  ['Luckiest Guy','Display','',[400],0],
  ['Bagel Fat One','Display','',[400],0],
  ['Gasoek One','Display','',[400],0],
  ['Darumadrop One','Display','',[400],0],
  ['Rubik Bubbles','Display','',[400],0],
  ['Rubik Glitch','Display','',[400],0],
  ['Rubik Wet Paint','Display','',[400],0],
  ['Rubik Doodle Shadow','Display','',[400],0],
  ['Rubik Puddles','Display','',[400],0],
  ['Sniglet','Display','wght@400;800',[400,800],0],
  ['Coiny','Display','',[400],0],
  ['Modak','Display','',[400],0],
  ['Sigmar','Display','',[400],0],
  ['Chicle','Display','',[400],0],
  ['Rampart One','Display','',[400],0],
  ['Rye','Display','',[400],0],
  ['Sonsie One','Display','',[400],0],
  ['Poiret One','Display','',[400],0],
  ['Josefin Sans','Sans','ital,wght@0,100..700;1,100..700',[100,200,300,400,500,600,700],1],
  ['Syncopate','Display','wght@400;700',[400,700],0],
  ['Michroma','Display','',[400],0],
  ['Orbitron','Display','wght@400..900',[400,500,600,700,800,900],0],
  ['Krona One','Display','',[400],0],
  ['Climate Crisis','Display','',[400],0],
  ['Mochiy Pop One','Display','',[400],0],
  ['Train One','Display','',[400],0],
  ['Caveat','Handwritten','wght@400..700',[400,500,600,700],0],
  ['Pacifico','Script','',[400],0],
  ['Yellowtail','Script','',[400],0],
  ['Lobster','Script','',[400],0],
  ['Dancing Script','Script','wght@400..700',[400,500,600,700],0],
  ['Satisfy','Script','',[400],0],
  ['Kaushan Script','Script','',[400],0],
  ['Permanent Marker','Handwritten','',[400],0],
  ['Caveat Brush','Handwritten','',[400],0],
  ['Gochi Hand','Handwritten','',[400],0],
  ['Shadows Into Light','Handwritten','',[400],0],
  ['Reenie Beanie','Handwritten','',[400],0],
  ['Nothing You Could Do','Handwritten','',[400],0],
  ['Homemade Apple','Script','',[400],0],
  ['La Belle Aurore','Script','',[400],0],
  ['Rock Salt','Handwritten','',[400],0],
  ['Sedgwick Ave','Handwritten','',[400],0],
  ['Covered By Your Grace','Handwritten','',[400],0],
  ['Gloria Hallelujah','Handwritten','',[400],0],
  ['Indie Flower','Handwritten','',[400],0],
  ['Patrick Hand','Handwritten','',[400],0],
  ['Kalam','Handwritten','wght@300;400;700',[300,400,700],0],
  ['Gaegu','Handwritten','wght@300;400;700',[300,400,700],0],
  ['Grandstander','Handwritten','ital,wght@0,100..900;1,100..900',[100,200,300,400,500,600,700,800,900],1],
  ['Cherry Bomb One','Handwritten','',[400],0],
  ['Sacramento','Script','',[400],0],
  ['Great Vibes','Script','',[400],0],
  ['Allura','Script','',[400],0],
  ['Parisienne','Script','',[400],0],
  ['Mrs Saint Delafield','Script','',[400],0],
  ['Damion','Script','',[400],0],
  ['Leckerli One','Script','',[400],0],
  ['Cookie','Script','',[400],0],
  ['Sriracha','Handwritten','',[400],0],
  ['Zeyada','Script','',[400],0],
  ['Dawning of a New Day','Script','',[400],0],
  ['Whisper','Script','',[400],0],
  ['Ms Madi','Script','',[400],0],
  ['Herr Von Muellerhoff','Script','',[400],0],
  ['Cedarville Cursive','Script','',[400],0],
  ['Marck Script','Script','',[400],0],
  ['Bad Script','Script','',[400],0],
  ['Beth Ellen','Script','',[400],0],
  ['Kristi','Script','',[400],0],
  ['Square Peg','Script','',[400],0],
  ['The Girl Next Door','Handwritten','',[400],0],
  ['Loved by the King','Handwritten','',[400],0],
  ['Just Me Again Down Here','Handwritten','',[400],0],
  ['Sue Ellen Francisco','Handwritten','',[400],0],
  ['Architects Daughter','Handwritten','',[400],0],
  ['Waiting for the Sunrise','Handwritten','',[400],0],
  ['Over the Rainbow','Handwritten','',[400],0],
  ['Nanum Pen Script','Handwritten','',[400],0],
  ['Nanum Brush Script','Handwritten','',[400],0],
  ['Mansalva','Handwritten','',[400],0],
  ['Space Mono','Mono','ital,wght@0,400;0,700;1,400;1,700',[400,700],1],
  ['IBM Plex Mono','Mono','ital,wght@0,300;0,400;0,500;0,600;0,700;1,400',[300,400,500,600,700],1],
  ['VT323','Mono','',[400],0],
  ['Press Start 2P','Mono','',[400],0],
  ['Courier Prime','Mono','ital,wght@0,400;0,700;1,400;1,700',[400,700],1],
  ['Major Mono Display','Mono','',[400],0],
  ['Silkscreen','Mono','wght@400;700',[400,700],0],
  ['DotGothic16','Mono','',[400],0],
  ['Special Elite','Mono','',[400],0],
  ['Xanh Mono','Mono','ital@0;1',[400],1],  ];

  const FONTS = RAW.map(([family, cat, axes, weights, italic]) => ({ family, cat, axes, weights, italic: !!italic }));
  const BY_NAME = Object.fromEntries(FONTS.map(f => [f.family, f]));

  // Split into a few stylesheet requests so no single URL gets unwieldy.
  function cssUrls() {
    const chunks = [];
    for (let i = 0; i < FONTS.length; i += 30) chunks.push(FONTS.slice(i, i + 30));
    return chunks.map(chunk =>
      'https://fonts.googleapis.com/css2?' +
      chunk.map(f => 'family=' + f.family.replace(/ /g, '+') + (f.axes ? ':' + f.axes : '')).join('&') +
      '&display=swap');
  }

  // Resolves once every stylesheet has arrived (or failed), so font loads
  // requested before that don't resolve against an empty @font-face list.
  let injected = null;
  function injectStylesheets() {
    if (injected) return injected;
    injected = Promise.all(cssUrls().map(href => new Promise(res => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = l.onerror = () => res();
      document.head.appendChild(l);
    })));
    return injected;
  }

  // Canvas text only renders a web font once the face is actually loaded, so
  // everything that draws text asks for it here first and redraws on resolve.
  const loaded = new Set();
  const pending = new Map();
  function fontKey(family, weight, italic) { return `${italic ? 'italic' : 'normal'} ${weight} ${family}`; }
  function nearestWeight(family, weight) {
    const f = BY_NAME[family];
    if (!f) return weight;
    return f.weights.reduce((a, b) => Math.abs(b - weight) < Math.abs(a - weight) ? b : a, f.weights[0]);
  }
  function isLoaded(family, weight = 400, italic = false) {
    return loaded.has(fontKey(family, weight, italic));
  }
  function ensure(family, weight = 400, italic = false) {
    const key = fontKey(family, weight, italic);
    if (loaded.has(key)) return Promise.resolve(true);
    if (pending.has(key)) return pending.get(key);
    const spec = `${italic ? 'italic ' : ''}${weight} 32px "${family}"`;
    const p = injectStylesheets().then(() => document.fonts.load(spec, 'AaBbg0')).then(r => {
      loaded.add(key);
      pending.delete(key);
      return r.length > 0;
    }).catch(() => { loaded.add(key); pending.delete(key); return false; });
    pending.set(key, p);
    return p;
  }

  injectStylesheets();

  /* ───────── your own fonts ─────────
     Fonts the user uploads are registered with the FontFace API and kept in
     this browser's IndexedDB; they are never uploaded anywhere. */

  const CUSTOM_CAT = 'Your fonts';
  const customFaces = []; // { id, family, weight, style, file, data }
  function idb() {
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('collage-studio-fonts', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('faces', { keyPath: 'id' });
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  }
  async function idbAll() {
    const d = await idb();
    return new Promise((res, rej) => { const q = d.transaction('faces').objectStore('faces').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); });
  }
  async function idbPut(rec) {
    const d = await idb();
    return new Promise((res, rej) => { const t = d.transaction('faces', 'readwrite'); t.objectStore('faces').put(rec); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
  }
  async function idbDelete(ids) {
    const d = await idb();
    return new Promise((res, rej) => { const t = d.transaction('faces', 'readwrite'); for (const id of ids) t.objectStore('faces').delete(id); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
  }

  // read family / weight / italic from an OpenType or TrueType file's name and OS/2 tables
  function readMeta(buf, fileName) {
    const out = { family: null, weight: null, italic: null };
    try {
      const v = new DataView(buf);
      const tag = v.getUint32(0);
      if (tag === 0x00010000 || tag === 0x4F54544F || tag === 0x74727565) {
        const n = v.getUint16(4);
        const tables = {};
        for (let i = 0; i < n; i++) {
          const o = 12 + i * 16;
          tables[String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3))] = v.getUint32(o + 8);
        }
        if (tables['OS/2'] != null) {
          const o = tables['OS/2'];
          out.weight = v.getUint16(o + 4);
          out.italic = !!(v.getUint16(o + 62) & 1);
        }
        if (tables.name != null) {
          const o = tables.name, count = v.getUint16(o + 2), strOff = o + v.getUint16(o + 4);
          const names = {};
          for (let i = 0; i < count; i++) {
            const r = o + 6 + i * 12;
            const pid = v.getUint16(r), eid = v.getUint16(r + 2), lang = v.getUint16(r + 4), nid = v.getUint16(r + 6), len = v.getUint16(r + 8), off = v.getUint16(r + 10);
            if (![1, 2, 4, 16, 17].includes(nid)) continue;
            let str = '';
            if (pid === 3 || pid === 0) { for (let k = 0; k < len; k += 2) str += String.fromCharCode(v.getUint16(strOff + off + k)); if (pid === 3 && lang !== 0x409 && names[nid]) continue; }
            else if (pid === 1 && eid === 0) { for (let k = 0; k < len; k++) str += String.fromCharCode(v.getUint8(strOff + off + k)); if (names[nid]) continue; }
            else continue;
            names[nid] = str.trim();
          }
          out.family = names[16] || names[1] || null;
          const sub = (names[17] || names[2] || '').toLowerCase();
          if (out.italic == null) out.italic = /italic|oblique/.test(sub);
          if (/italic|oblique/.test(sub)) out.italic = true;
        }
      }
    } catch (e) { /* fall back to the file name */ }
    // file name fallback: "HelveticaNeueBoldItalic.otf", "neuemontreal-bold.otf"
    const base = (fileName || 'Font').replace(/\.[^.]+$/, '');
    const low = base.toLowerCase();
    const W = [['ultralight', 200], ['extralight', 200], ['thin', 100], ['hairline', 100], ['light', 300], ['book', 400], ['regular', 400], ['roman', 400], ['medium', 500], ['semibold', 600], ['demibold', 600], ['extrabold', 800], ['ultrabold', 800], ['heavy', 800], ['bold', 700], ['black', 900]];
    if (!out.weight) { const m = W.find(([k]) => low.includes(k)); out.weight = m ? m[1] : 400; }
    if (out.italic == null) out.italic = /italic|oblique/.test(low);
    if (!out.family) {
      let f = base.replace(/[-_ ]?(ultra|extra|semi|demi)?(light|thin|hairline|book|regular|roman|medium|bold|heavy|black)?(italic|oblique)?$/i, '');
      f = f.replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
      out.family = f ? f.replace(/\b\w/g, ch => ch.toUpperCase()) : base;
    }
    // a family name that still carries the style (e.g. "Helvetica Neue Bold") is folded back to the family
    out.family = out.family.replace(/\s+(Ultra ?Light|Extra ?Light|Thin|Light|Roman|Regular|Medium|Semi ?Bold|Bold|Heavy|Black)(\s+Italic)?$/i, '').trim();
    out.weight = Math.min(900, Math.max(100, Math.round(out.weight / 100) * 100));
    return out;
  }

  function registerMeta(family) {
    const faces = customFaces.filter(f => f.family === family);
    let meta = BY_NAME[family];
    if (!faces.length) {
      if (meta && meta.custom) { FONTS.splice(FONTS.indexOf(meta), 1); delete BY_NAME[family]; }
      return;
    }
    if (!meta) { meta = { family, cat: CUSTOM_CAT, axes: '', weights: [], italic: false, custom: true }; FONTS.unshift(meta); BY_NAME[family] = meta; }
    meta.weights = [...new Set(faces.map(f => f.weight))].sort((a, b) => a - b);
    meta.italic = faces.some(f => f.style === 'italic');
  }
  async function addFace(rec) {
    const face = new FontFace(rec.family, rec.data, { weight: String(rec.weight), style: rec.style });
    await face.load();
    document.fonts.add(face);
    rec.face = face;
    customFaces.push(rec);
    loaded.add(fontKey(rec.family, rec.weight, rec.style === 'italic'));
    registerMeta(rec.family);
  }
  const FONT_EXT = /\.(otf|ttf|woff2?)$/i;
  async function expandFiles(files) {
    const out = [];
    for (const f of files) {
      if (/\.zip$/i.test(f.name)) {
        if (!window.JSZip) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = res; s.onerror = () => rej(new Error('Could not load the zip reader')); document.head.appendChild(s); });
        const zip = await window.JSZip.loadAsync(f);
        for (const entry of Object.values(zip.files)) {
          const name = entry.name.split('/').pop();
          if (entry.dir || !FONT_EXT.test(name) || name.startsWith('._')) continue;
          out.push({ name, data: await entry.async('arraybuffer') });
        }
      } else if (FONT_EXT.test(f.name)) out.push({ name: f.name, data: await f.arrayBuffer() });
    }
    return out;
  }
  // returns { families: { name: styleCount }, skipped }
  async function importFonts(files) {
    const items = await expandFiles(files);
    const families = {};
    let skipped = 0;
    for (const it of items) {
      const m = readMeta(it.data, it.name);
      const style = m.italic ? 'italic' : 'normal';
      const id = `${m.family}|${m.weight}|${style}`;
      if (customFaces.some(f => f.id === id)) { families[m.family] = (families[m.family] || 0) + 1; continue; }
      const rec = { id, family: m.family, weight: m.weight, style, file: it.name, data: it.data };
      try {
        await addFace(rec);
        try { await idbPut({ id, family: rec.family, weight: rec.weight, style, file: rec.file, data: rec.data }); } catch (e) { /* storage blocked: font works for this session */ }
        families[m.family] = (families[m.family] || 0) + 1;
      } catch (e) { skipped++; }
    }
    return { families, skipped };
  }
  async function removeFamily(family) {
    const gone = customFaces.filter(f => f.family === family);
    for (const f of gone) { try { document.fonts.delete(f.face); } catch (e) { /* ignore */ } customFaces.splice(customFaces.indexOf(f), 1); }
    registerMeta(family);
    try { await idbDelete(gone.map(f => f.id)); } catch (e) { /* ignore */ }
  }
  // fonts packed into a saved project file travel with it
  function packFamilies(names) {
    const set = new Set(names);
    return customFaces.filter(f => set.has(f.family)).map(f => {
      const u = new Uint8Array(f.data); let bin = '';
      for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return { family: f.family, weight: f.weight, style: f.style, file: f.file, b64: btoa(bin) };
    });
  }
  async function unpackFamilies(list) {
    for (const p of list || []) {
      const id = `${p.family}|${p.weight}|${p.style}`;
      if (customFaces.some(f => f.id === id)) continue;
      const bin = atob(p.b64), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const rec = { id, family: p.family, weight: p.weight, style: p.style, file: p.file, data: u.buffer };
      try { await addFace(rec); await idbPut({ id, family: rec.family, weight: rec.weight, style: rec.style, file: rec.file, data: rec.data }); } catch (e) { /* ignore */ }
    }
  }
  const customReady = idbAll().then(async recs => { for (const r of recs) { try { await addFace(r); } catch (e) { /* unreadable face */ } } }).catch(() => {});

  window.StudioFonts = {
    FONTS, BY_NAME, CATEGORIES: ['Serif', 'Sans', 'Display', 'Script', 'Handwritten', 'Mono'], CUSTOM_CAT,
    injectStylesheets, ensure, isLoaded, nearestWeight,
    importFonts, removeFamily, packFamilies, unpackFamilies, customReady,
    customFamilies: () => [...new Set(customFaces.map(f => f.family))],
  };
})();
