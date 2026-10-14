import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* =========================================================================
   LUMA — catalogue, 3D jewellery builder, viewers and page interactions.
   Every piece is modelled procedurally: gems are lathe-cut solids drawn with a
   refraction shader, metals are physical materials lit by a studio light tent.
   ========================================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const aed = n => 'AED ' + Math.round(n).toLocaleString('en-US');
function h(tag, attrs = {}, ...kids) {
  const [t, ...cls] = tag.split('.');
  const el = document.createElement(t || 'div');
  if (cls.length) el.className = cls.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
const store = {
  get(k, d) { try { const v = localStorage.getItem('luma:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('luma:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

/* ------------------------------------------------------------------ data */
const METALS = {
  yellow:   { name: '18k yellow gold', short: 'Yellow gold', color: 0xf0c987, rough: 0.14, factor: 1.0, swatch: 'linear-gradient(135deg,#f6dea4,#c9a25a)' },
  rose:     { name: '18k rose gold', short: 'Rose gold', color: 0xf2b39b, rough: 0.15, factor: 1.0, swatch: 'linear-gradient(135deg,#f7d0bf,#c98c74)' },
  white:    { name: '18k white gold', short: 'White gold', color: 0xe8e6e1, rough: 0.11, factor: 1.04, swatch: 'linear-gradient(135deg,#fbfaf7,#b9b8b3)' },
  platinum: { name: 'Platinum 950', short: 'Platinum', color: 0xd8dadb, rough: 0.09, factor: 1.32, swatch: 'linear-gradient(135deg,#f2f3f4,#9ea3a6)' },
};
const STONES = {
  diamond:   { name: 'Diamond', tint: [1, 1, 1], ior: 2.42, disp: 0.05, bright: 1.2, ppc: 21500, swatch: 'radial-gradient(circle at 35% 30%,#fff,#dfe8ec 45%,#9fb4bc)' },
  sapphire:  { name: 'Teal sapphire', tint: [0.22, 0.62, 0.66], ior: 1.77, disp: 0.02, bright: 1.15, ppc: 9800, swatch: 'radial-gradient(circle at 35% 30%,#9fd2d6,#2f7e88 50%,#123f47)' },
  emerald:   { name: 'Emerald', tint: [0.04, 0.5, 0.28], ior: 1.58, disp: 0.014, bright: 1.05, ppc: 12500, swatch: 'radial-gradient(circle at 35% 30%,#9fe0bd,#1f8a5b 50%,#0b3b28)' },
  morganite: { name: 'Morganite', tint: [1.0, 0.7, 0.66], ior: 1.59, disp: 0.014, bright: 1.15, ppc: 2900, swatch: 'radial-gradient(circle at 35% 30%,#ffe4dc,#e6a495 50%,#a8665a)' },
};
const CUTS = { round: 'Round brilliant', oval: 'Oval', emerald: 'Emerald cut', pear: 'Pear' };
const SETTINGS = { solitaire: 'Solitaire', halo: 'Halo', trilogy: 'Three stone', eternity: 'Eternity' };

const HOUSES = [
  ['Maison Verel', 'Paris'], ['Atelier Caldera', 'Valenza'], ['Orsini & Figli', 'Milan'], ['Ondel', 'Geneva'],
  ['Lindqvist', 'Copenhagen'], ['Hart & Rowe', 'London'], ['Casa Alvor', 'Lisbon'], ['Bottega Serra', 'Florence'],
  ['Van Aelst', 'Antwerp'], ['Haus Kessler', 'Vienna'], ['Winter & Sohn', 'Munich'], ['Orafa Vela', 'Arezzo'],
];

const PRODUCTS = [
  { id: 'octave', name: 'Octave emerald ring', house: 'Atelier Caldera', city: 'Valenza', cat: 'occasion', bg: 'noir', feature: true,
    spec: { type: 'ring', cut: 'emerald', stone: 'emerald', carat: 3, setting: 'halo', band: 'pave', metal: 'yellow', size: 52 },
    desc: 'A step-cut Colombian emerald in a halo of brilliants, on a pavé band of 18k yellow gold. The piece the house is known for, made in small numbers each season.' },
  { id: 'fil', name: "Fil d'or pendant", house: 'Casa Alvor', city: 'Lisbon', cat: 'everyday', bg: 'white',
    spec: { type: 'pendant', cut: 'round', stone: 'diamond', carat: 0.5, setting: 'solitaire', metal: 'yellow', chain: 42 },
    desc: 'A single brilliant on a fine cable chain. Light enough to sleep in, made to be layered.' },
  { id: 'point', name: 'Point de lumière studs', house: 'Lindqvist', city: 'Copenhagen', cat: 'everyday', bg: 'light',
    spec: { type: 'earrings', style: 'stud', cut: 'round', stone: 'diamond', carat: 0.5, setting: 'solitaire', metal: 'white' },
    desc: 'Four-claw diamond studs with screw backs. Half a carat each, matched in colour and clarity.' },
  { id: 'riviera', name: 'Riviera tennis bracelet', house: 'Orsini & Figli', city: 'Milan', cat: 'everyday', bg: 'light',
    spec: { type: 'bracelet', style: 'tennis', stone: 'diamond', metal: 'white', size: 17 },
    desc: 'Forty-four brilliants in hinged cups, so the line moves like fabric on the wrist.' },
  { id: 'ondine', name: 'Ondine drop pendant', house: 'Ondel', city: 'Geneva', cat: 'occasion', bg: 'noir',
    spec: { type: 'pendant', cut: 'oval', stone: 'sapphire', carat: 1.5, setting: 'halo', metal: 'yellow', chain: 42 },
    desc: 'A teal sapphire from Sri Lanka in a halo of diamonds, the colour of the Gulf at dusk.' },
  { id: 'aube', name: 'Aube solitaire', house: 'Maison Verel', city: 'Paris', cat: 'bridal', bg: 'light',
    spec: { type: 'ring', cut: 'round', stone: 'diamond', carat: 1.5, setting: 'solitaire', band: 'plain', metal: 'yellow', size: 52 },
    desc: 'A round brilliant raised on four claws over a slim, rounded band. The classic Paris solitaire.' },
  { id: 'goutte', name: 'Goutte drop earrings', house: 'Maison Verel', city: 'Paris', cat: 'occasion', bg: 'white',
    spec: { type: 'earrings', style: 'drop', cut: 'pear', stone: 'emerald', carat: 1, setting: 'solitaire', metal: 'yellow' },
    desc: 'Pear-cut Colombian emeralds hanging from diamond studs. They move with you.' },
  { id: 'cadence', name: 'Cadence bangle', house: 'Orsini & Figli', city: 'Milan', cat: 'everyday', bg: 'noir',
    spec: { type: 'bracelet', style: 'bangle', band: 'plain', stone: 'diamond', metal: 'yellow', size: 17 },
    desc: 'An oval bangle with ten polished studs. Opens on a hidden hinge.' },
  { id: 'trinite', name: 'Trinité three-stone', house: 'Hart & Rowe', city: 'London', cat: 'bridal', bg: 'white',
    spec: { type: 'ring', cut: 'oval', stone: 'diamond', carat: 1, setting: 'trilogy', band: 'plain', metal: 'rose', size: 52 },
    desc: 'An oval diamond between two smaller ovals, for past, present and future.' },
  { id: 'nenuphar', name: 'Nénuphar brooch', house: 'Ondel', city: 'Geneva', cat: 'occasion', bg: 'light',
    spec: { type: 'brooch', stone: 'sapphire', metal: 'yellow' },
    desc: 'A water lily of twenty teal sapphires around a round diamond. Wear it on a lapel or as a pendant.' },
  { id: 'solene', name: 'Solène eternity band', house: 'Lindqvist', city: 'Copenhagen', cat: 'bridal', bg: 'light',
    spec: { type: 'ring', setting: 'eternity', stone: 'diamond', carat: 1, cut: 'round', band: 'pave', metal: 'white', size: 52 },
    desc: 'Brilliants all the way round, set between two fine rails. Worn alone or with an engagement ring.' },
  { id: 'riviere', name: 'Grande Rivière necklace', house: 'Hart & Rowe', city: 'London', cat: 'occasion', bg: 'noir',
    spec: { type: 'necklace', stone: 'diamond', metal: 'white' },
    desc: 'A graduated line of diamonds, eleven carats in all, for the evenings that call for it.' },
];
const byId = id => PRODUCTS.find(p => p.id === id);

// Physical sizes: ring inner radius = 1 unit = 8.5 mm.
const MM = 1 / 8.5;
const caratMM = ct => 6.5 * Math.cbrt(ct);
const caratR = ct => 0.5 * caratMM(ct) * MM;

function priceOf(s) {
  const st = STONES[s.stone] || STONES.diamond, mf = (METALS[s.metal] || METALS.yellow).factor;
  const gem = ct => st.ppc * Math.pow(ct, 1.55);
  let p = 0;
  switch (s.type) {
    case 'ring':
      if (s.setting === 'eternity') p = 6400 * mf + gem(0.05) * 64 * 0.85;
      else {
        p = 4200 * mf + gem(s.carat);
        if (s.setting === 'halo') p += 6900;
        if (s.setting === 'trilogy') p += gem(s.carat * 0.45) * 2;
        if (s.band === 'pave') p += 5400;
      }
      break;
    case 'pendant': p = 2600 * mf + gem(s.carat) + (s.setting === 'halo' ? 5200 : 0) + (s.chain - 40) * 140; break;
    case 'earrings':
      p = 2 * (gem(s.carat) + (s.style === 'drop' ? 2400 + STONES.diamond.ppc * Math.pow(0.12, 1.55) : 900)) * (mf * 0.3 + 0.7);
      if (s.setting === 'halo') p += 7800;
      break;
    case 'bracelet':
      p = s.style === 'tennis' ? 9800 * mf + 44 * gem(0.093) : 16500 * mf + (s.band === 'pave' ? 60 * gem(0.03) : 0);
      break;
    case 'brooch': p = 14500 * mf + 20 * gem(0.25) + STONES.diamond.ppc * 1.1; break;
    case 'necklace': p = 22000 * mf + 46 * STONES.diamond.ppc * Math.pow(0.24, 1.55); break;
  }
  return Math.round(p / 50) * 50;
}

/* ------------------------------------------------------------ gem cutting */
const GEO = {};
const V2 = (x, y) => new THREE.Vector2(x, y);
// Plan-view shape of each cut, from the unit circle. Used for the stone and for halos and claws.
function warp(cut, x, z) {
  if (cut === 'oval') return [x * 1.32, z];
  if (cut === 'pear') {
    if (z > 0) { const k = 1 - Math.pow(z, 1.5) * 0.92; return [x * k, z * 1.7 - 0.32]; }
    return [x, z - 0.32];
  }
  if (cut === 'marquise') { const k = 1 - Math.pow(Math.abs(z), 1.5) * 0.92; return [x * k * 0.85, z * 1.85]; }
  return [x, z];
}
function outline(cut, a) {
  if (cut === 'emerald') {
    const d = ((a + Math.PI / 8) % (Math.PI / 4) + Math.PI / 4) % (Math.PI / 4) - Math.PI / 8;
    const r = Math.cos(Math.PI / 8) / Math.cos(d);
    return [Math.cos(a) * r * 1.42, Math.sin(a) * r];
  }
  return warp(cut, Math.cos(a), Math.sin(a));
}
function gemGeo(cut) {
  if (GEO[cut]) return GEO[cut];
  let g;
  if (cut === 'emerald') {
    g = new THREE.LatheGeometry([V2(0, -0.6), V2(0.5, -0.44), V2(0.8, -0.22), V2(1, -0.02), V2(1, 0.03), V2(0.91, 0.1), V2(0.81, 0.17), V2(0, 0.17)], 8, Math.PI / 8);
    g.scale(1.42, 1, 1);
  } else {
    g = new THREE.LatheGeometry([V2(0, -0.86), V2(0.44, -0.5), V2(1, -0.02), V2(1, 0.03), V2(0.85, 0.15), V2(0.6, 0.3), V2(0, 0.3)], cut === 'round' ? 16 : 24, Math.PI / 16);
    if (cut !== 'round') {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const [x, z] = warp(cut, p.getX(i), p.getZ(i)); p.setX(i, x); p.setZ(i, z); }
    }
  }
  g = g.toNonIndexed();
  g.computeVertexNormals(); // one normal per facet
  g.computeBoundingBox();
  g.computeBoundingSphere();
  const bb = g.boundingBox;
  g.userData.cut = { ext: [bb.max.x, Math.max(bb.max.z, -bb.min.z)], depth: -bb.min.y, crown: bb.max.y, sectors: cut === 'emerald' ? 8 : 8 };
  if (cut === 'pear') g.userData.cut.ext = [bb.max.x, (bb.max.z - bb.min.z) / 2];
  return (GEO[cut] = g);
}
// equal-weight sizing: an oval or pear of a given carat spreads wider than a round
const cutScale = cut => ({ round: 1, oval: 0.9, emerald: 0.88, pear: 0.86, marquise: 0.9 }[cut] || 1);

/* --------------------------------------------------------------- shaders */
const GEM_VERT = /* glsl */`
varying vec3 vPo;
varying vec3 vNo;
varying vec3 vCamO;
varying mat3 vM;
void main() {
  mat4 M = modelMatrix;
  #ifdef USE_INSTANCING
  M = modelMatrix * instanceMatrix;
  #endif
  vPo = position; vNo = normal;
  vCamO = (inverse(M) * vec4(cameraPosition, 1.0)).xyz;
  vM = mat3(M);
  gl_Position = projectionMatrix * viewMatrix * M * vec4(position, 1.0);
}`;
// Light is traced through an idealised stone: refract in, bounce off the pavilion facets
// (found by intersecting the pavilion cone and snapping to the facet's sector), refract out.
const GEM_FRAG = /* glsl */`
uniform samplerCube env;
uniform vec3 tint;
uniform float ior;
uniform float disp;
uniform float bright;
uniform vec2 ext;      // plan-view half extents of the cut
uniform float depth;   // pavilion depth below the girdle
uniform float crown;   // table height
uniform float sectors; // pavilion main facets
varying vec3 vPo;
varying vec3 vNo;
varying vec3 vCamO;
varying mat3 vM;
vec3 pavN(vec3 h) {
  float a = atan(h.z, h.x), r = length(h.xz);
  bool outer = r > 0.58;
  float sec = outer ? sectors * 2.0 : sectors;
  float q = (floor(a / 6.2831853 * sec + 0.5)) / sec * 6.2831853 + (outer ? 3.14159 / sec : 0.0);
  float k = depth * (outer ? 1.18 : 1.0);
  return normalize(vec3(cos(q) * k, -1.0, sin(q) * k));
}
vec3 trace(vec3 p, vec3 d, vec3 n, float eta) {
  vec3 r = refract(d, n, 1.0 / eta);
  if (dot(r, r) < 1e-4) return reflect(d, n);
  vec3 q = p;
  for (int b = 0; b < 4; b++) {
    float tTop = r.y > 1e-3 ? (crown - q.y) / r.y : 1e9;
    float t = 0.35;
    for (int i = 0; i < 6; i++) {
      vec3 x = q + r * t; float rr = max(length(x.xz), 1e-3);
      float f = x.y + depth * (1.0 - rr);
      float fp = r.y - depth * dot(x.xz, r.xz) / rr;
      t -= f / (abs(fp) > 1e-3 ? fp : 1e-3);
    }
    if (t <= 1e-3 || t > tTop) {
      vec3 h = q + r * tTop;
      vec3 nOut = length(h.xz) < 0.58 ? vec3(0.0, 1.0, 0.0) : normalize(vec3(h.x, 2.2, h.z));
      vec3 o = refract(r, -nOut, eta);
      if (dot(o, o) > 1e-4) return o;
      r = reflect(r, -nOut); q = h; continue;
    }
    vec3 h = q + r * t;
    r = reflect(r, pavN(h)); q = h;
  }
  return r;
}
vec3 toWorld(vec3 u) { return normalize(vM * vec3(u.x * ext.x, u.y, u.z * ext.y)); }
void main() {
  vec3 po = vec3(vPo.x / ext.x, vPo.y, vPo.z / ext.y);
  vec3 co = vec3(vCamO.x / ext.x, vCamO.y, vCamO.z / ext.y);
  vec3 d = normalize(po - co);
  vec3 n = normalize(vec3(vNo.x * ext.x, vNo.y, vNo.z * ext.y));
  if (dot(n, d) > 0.0) n = -n;
  vec3 col;
  for (int i = 0; i < 3; i++) {
    float eta = ior + (float(i) - 1.0) * disp;
    col[i] = textureCube(env, toWorld(trace(po, d, n, eta)))[i];
  }
  vec3 nw = normalize(vM * vNo);
  vec3 vw = normalize((vM * (vPo - vCamO)));
  if (dot(nw, vw) > 0.0) nw = -nw;
  float F0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
  float fr = F0 + (1.0 - F0) * pow(1.0 - max(dot(-vw, nw), 0.0), 5.0);
  vec3 refl = textureCube(env, reflect(vw, nw)).rgb;
  vec3 c = col * tint * bright + refl * fr;
  c += tint * 0.05 * (1.0 - step(0.99, tint.r * tint.g * tint.b));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/* ------------------------------------------------- light tent (env map) */
function lightTent(tone = 'studio') {
  const s = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { warm: { value: tone === 'warm' ? 1 : 0 } },
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float warm; varying vec3 d; void main(){
      float y = d.y;
      vec3 top = mix(vec3(.06,.06,.06), vec3(.34,.34,.33), warm);
      vec3 mid = mix(vec3(.36,.36,.35), vec3(.66,.66,.64), warm);
      vec3 low = vec3(.96,.95,.93);
      vec3 c = y > 0.0 ? mix(mid, top, smoothstep(0.0, .75, y)) : mix(mid, low * .8, smoothstep(0.0, -.55, y));
      gl_FragColor = vec4(c, 1.0); }`,
  }));
  s.add(sky);
  const panel = (w, hgt, pos, k, col = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(34, 12, [0, 44, 4], 5.5);
  panel(7, 46, [-44, 6, 12], 4.2);
  panel(7, 46, [44, 6, -12], 3.6);
  panel(22, 14, [14, 10, 44], 3.2);
  panel(18, 16, [-26, -6, -40], 2.6, 0xfff0d8);
  panel(26, 6, [0, -30, 30], 1.6, 0xffffff);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    panel(2.6, 2.6, [Math.cos(a) * 48, 12 + (i % 3) * 9, Math.sin(a) * 48], 9 - (i % 3) * 2);
  }
  return s;
}
// what a stone sees inside a jeweller's light box: black cards and many small, hard lights
function gemTent() {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 d; void main(){ float y = d.y; vec3 c = mix(vec3(.1,.11,.12), vec3(.85,.86,.86), smoothstep(-.35,.85,y)); c += vec3(1.5) * smoothstep(.82,.99,y); gl_FragColor = vec4(c, 1.0); }',
  })));
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const card = (k, warm) => new THREE.MeshBasicMaterial({ color: new THREE.Color(warm ? 0xffe2b8 : 0xffffff).multiplyScalar(k), side: THREE.DoubleSide });
  for (let i = 0; i < 60; i++) {
    const th = rnd() * Math.PI * 2, ph = Math.acos(lerp(-0.45, 0.98, rnd()));
    const r = 50 - i * 0.05, w = lerp(1.5, 11, rnd() ** 2), hgt = lerp(1.5, 14, rnd() ** 2);
    const dark = i % 3 === 0, warm = rnd() < 0.2;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), dark ? card(0.01) : card(lerp(3, 16, rnd()), warm));
    m.position.set(Math.sin(ph) * Math.cos(th) * r, Math.cos(ph) * r, Math.sin(ph) * Math.sin(th) * r); m.lookAt(0, 0, 0); s.add(m);
  }
  return s;
}
function makeEnv(renderer, tone) {
  const scene = lightTent(tone);
  const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const cam = new THREE.CubeCamera(0.1, 200, rt);
  cam.update(renderer, gemTent());
  const pm = new THREE.PMREMGenerator(renderer);
  const pmrem = pm.fromScene(scene, 0.03).texture;
  pm.dispose();
  return { cube: rt.texture, pmrem };
}

/* ------------------------------------------------------------- materials */
class Mats {
  constructor(cube) { this.cube = cube; this.c = {}; }
  metal(k) {
    const key = 'm' + k;
    if (!this.c[key]) {
      const m = METALS[k] || METALS.yellow;
      this.c[key] = new THREE.MeshPhysicalMaterial({ color: m.color, metalness: 1, roughness: m.rough, envMapIntensity: 1.3 });
    }
    return this.c[key];
  }
  dark(k) { // engraving: the metal, cut into and darkened
    const key = 'e' + k;
    if (!this.c[key]) this.c[key] = new THREE.MeshPhysicalMaterial({ color: new THREE.Color((METALS[k] || METALS.yellow).color).multiplyScalar(0.35), metalness: 1, roughness: 0.45, transparent: true, side: THREE.BackSide });
    return this.c[key];
  }
  gem(k, cut = 'round') {
    const key = 'g' + k + cut;
    if (!this.c[key]) {
      const st = STONES[k] || STONES.diamond, c = gemGeo(cut).userData.cut;
      this.c[key] = new THREE.ShaderMaterial({
        uniforms: { env: { value: this.cube }, tint: { value: new THREE.Vector3(...st.tint) }, ior: { value: st.ior }, disp: { value: st.disp }, bright: { value: st.bright },
          ext: { value: new THREE.Vector2(...c.ext) }, depth: { value: c.depth }, crown: { value: c.crown }, sectors: { value: c.sectors } },
        vertexShader: GEM_VERT, fragmentShader: GEM_FRAG, side: THREE.DoubleSide,
      });
    }
    return this.c[key];
  }
}

/* ------------------------------------------------------------ jewellery */
// B = { mats, own: [] } — geometries made for one build, disposed when it is replaced.
const own = (B, g) => (B.own.push(g), g);
const UP = new THREE.Vector3(0, 1, 0), XAX = new THREE.Vector3(1, 0, 0);
function rod(B, a, b, r, mat, r2 = r) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const m = new THREE.Mesh(own(B, new THREE.CylinderGeometry(r2, r, len, 12, 1)), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}
function ball(B, p, r, mat) { const m = new THREE.Mesh(own(B, new THREE.SphereGeometry(r, 14, 10)), mat); m.position.copy(p); return m; }
function tube(B, pts, r, mat, closed = true) {
  const c = new THREE.CatmullRomCurve3(pts, closed, 'centripetal');
  return new THREE.Mesh(own(B, new THREE.TubeGeometry(c, Math.max(24, pts.length * 3), r, 8, closed)), mat);
}
function gem(B, cut, stone, s) { const m = new THREE.Mesh(gemGeo(cut), B.mats.gem(stone, cut)); m.scale.setScalar(s); m.userData.gem = true; return m; }
function gemInstances(B, cut, stone, mats4) {
  const m = new THREE.InstancedMesh(gemGeo(cut), B.mats.gem(stone, cut), mats4.length);
  mats4.forEach((mx, i) => m.setMatrixAt(i, mx));
  m.instanceMatrix.needsUpdate = true; m.computeBoundingBox(); m.computeBoundingSphere();
  m.userData.gem = true;
  return m;
}
const tmpO = new THREE.Object3D();
function mtx(pos, quat, s) { tmpO.position.copy(pos); tmpO.quaternion.copy(quat); tmpO.scale.setScalar(s); tmpO.updateMatrix(); return tmpO.matrix.clone(); }

/** A set stone: table up (+Y), girdle at y = 0. Returns group with parts { stone, claws, halo }. */
function head(B, { cut = 'round', stone = 'diamond', s = 0.4, metal = 'yellow', halo = false, claws = null }) {
  const G = new THREE.Group(), M = B.mats.metal(metal);
  const st = gem(B, cut, stone, s); G.add(st);
  const cl = new THREE.Group();
  const pr = 0.022 + 0.035 * s;
  let angs = claws || (cut === 'emerald' ? [0.62, Math.PI - 0.62, Math.PI + 0.62, -0.62]
    : cut === 'pear' ? [Math.PI / 2, Math.PI + 0.55, -0.55] : [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4]);
  const bb = gemGeo(cut).boundingBox, bot = bb.min.y * s;
  for (const a of angs) {
    const [x, z] = outline(cut, a);
    const top = new THREE.Vector3(x * s * 1.03, 0.11 * s + 0.01, z * s * 1.03);
    const base = new THREE.Vector3(x * s * 0.42, bot * 0.92, z * s * 0.42);
    cl.add(rod(B, base, top, pr, M, pr * 0.9));
    const tip = ball(B, top, pr * 1.18, M); tip.scale.y = 0.8; cl.add(tip);
  }
  // two galleries under the stone
  const ring = (k, y, r) => {
    const pts = []; for (let i = 0; i < 40; i++) { const [x, z] = outline(cut, i / 40 * Math.PI * 2); pts.push(new THREE.Vector3(x * s * k, y, z * s * k)); }
    cl.add(tube(B, pts, r, M));
  };
  ring(0.8, bot * 0.42, pr * 0.75);
  ring(0.5, bot * 0.75, pr * 0.65);
  G.add(cl);
  let hal = null;
  if (halo) {
    hal = new THREE.Group();
    const pts = [], N = 120;
    for (let i = 0; i < N; i++) {
      const a0 = i / N * Math.PI * 2, [x0, z0] = outline(cut, a0), [x1, z1] = outline(cut, a0 + 0.01);
      const nx = (z1 - z0), nz = -(x1 - x0), l = Math.hypot(nx, nz) || 1;
      pts.push({ p: new THREE.Vector3(x0 * s, 0, z0 * s), n: new THREE.Vector3(nx / l, 0, nz / l) });
    }
    // make sure normals point outward
    if (pts[0].n.dot(pts[0].p) < 0) pts.forEach(q => q.n.negate());
    const hs = 0.046, off = hs * 1.05 + 0.012;
    const path = pts.map(q => q.p.clone().addScaledVector(q.n, off));
    let per = 0; for (let i = 0; i < N; i++) per += path[i].distanceTo(path[(i + 1) % N]);
    const n = Math.max(10, Math.round(per / (hs * 2.25)));
    const mats4 = [];
    let acc = 0, next = 0, idx = 0;
    for (let i = 0; i < N && idx < n; i++) {
      const a = path[i], b = path[(i + 1) % N], d = a.distanceTo(b);
      while (next <= acc + d && idx < n) {
        const t = (next - acc) / d, p = a.clone().lerp(b, t), nn = pts[i].n;
        const q = new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(nn.x * 0.35, 1, nn.z * 0.35).normalize());
        mats4.push(mtx(p.setY(-0.015), q, hs)); idx++; next = idx * per / n;
      }
      acc += d;
    }
    hal.add(gemInstances(B, 'round', 'diamond', mats4));
    hal.add(tube(B, path.filter((_, i) => i % 3 === 0).map(p => p.clone().setY(-hs * 0.9)), hs * 0.75, M));
    hal.add(tube(B, path.filter((_, i) => i % 3 === 0).map(p => p.clone().multiplyScalar(0.93).setY(-hs * 2.2)), hs * 0.5, M));
    G.add(hal);
  }
  G.userData.parts = { stone: st, claws: cl, halo: hal };
  G.userData.depth = -bot; // culet depth below the girdle
  G.userData.reach = (halo ? 0.07 : 0.02); // extra width the halo adds
  return G;
}

function bandGeo(B, R, t, w, seg = 160, ex = 0.6, ey = 0.32) {
  const prof = [];
  for (let i = 0; i <= 48; i++) {
    const a = i / 48 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    prof.push(V2(R + t / 2 + Math.sign(c) * Math.pow(Math.abs(c), ex) * t / 2, -Math.sign(s) * Math.pow(Math.abs(s), ey) * w / 2));
  }
  const g = own(B, new THREE.LatheGeometry(prof, seg));
  g.rotateX(Math.PI / 2);
  return g;
}
function onCircle(r, a, z = 0) { return new THREE.Vector3(-Math.sin(a) * r, Math.cos(a) * r, z); }
const quatZ = a => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);

function buildRing(B, o) {
  const g = new THREE.Group(), M = B.mats.metal(o.metal);
  const R = 1, t = 0.12, w = o.setting === 'eternity' ? 0.25 : 0.19, top = R + t;
  const bandG = new THREE.Group();
  bandG.add(new THREE.Mesh(bandGeo(B, R, t, w), M));
  const parts = { band: bandG };
  const pave = (a0, a1, s, z = 0) => {
    const n = Math.max(1, Math.round(Math.abs(a1 - a0) * top / (s * 2.3)));
    const mats4 = [];
    for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); mats4.push(mtx(onCircle(top - s * 0.25, a, z), quatZ(a), s)); }
    return mats4;
  };
  if (o.setting === 'eternity') {
    bandG.add(gemInstances(B, 'round', o.stone, pave(0, Math.PI * 2 * (1 - 1 / 64), 0.05)));
    for (const z of [-0.1, 0.1]) {
      const pts = []; for (let i = 0; i < 64; i++) pts.push(onCircle(top - 0.012, i / 64 * Math.PI * 2, z));
      bandG.add(tube(B, pts, 0.018, M));
    }
    g.add(bandG);
  } else {
    const cut = o.cut || 'round';
    const s = caratR(o.carat) * cutScale(cut);
    const hd = head(B, { cut, stone: o.stone, s, metal: o.metal, halo: o.setting === 'halo' });
    const gy = top + hd.userData.depth * 0.9 + 0.02;
    hd.position.y = gy;
    if (cut === 'pear') hd.rotation.y = Math.PI / 2; // tip toward the fingertip
    g.add(hd);
    Object.assign(parts, hd.userData.parts, { head: hd });
    // cathedral shoulders rising from the band to the gallery
    const sh = new THREE.Group();
    for (const side of [-1, 1]) for (const z of [-w * 0.28, w * 0.28]) {
      const a = side * 0.42;
      const p0 = onCircle(top - 0.03, a, z), p2 = new THREE.Vector3(side * s * 0.55, gy - hd.userData.depth * 0.55, z * 0.6);
      const p1 = new THREE.Vector3(side * s * 0.75, top + 0.02, z * 0.9);
      sh.add(tube(B, [p0, p1, p2], 0.028, M, false));
    }
    g.add(sh);
    parts.shoulders = sh;
    if (o.setting === 'trilogy') {
      const s2 = s * 0.66;
      for (const side of [-1, 1]) {
        const h2 = head(B, { cut, stone: o.stone, s: s2, metal: o.metal });
        const a = side * (s + s2 + 0.06) / (top + 0.25);
        const r2 = top + h2.userData.depth * 0.9;
        h2.position.copy(onCircle(r2, a)); h2.rotation.z = a;
        g.add(h2);
      }
    }
    if (o.band === 'pave') {
      const a0 = 0.52 + (o.setting === 'trilogy' ? 0.35 : 0);
      bandG.add(gemInstances(B, 'round', 'diamond', [...pave(a0, a0 + 1.0, 0.042), ...pave(-a0, -a0 - 1.0, 0.042)]));
    }
    g.add(bandG);
  }
  if (o.engraving) {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 2048, 128);
    x.fillStyle = '#fff'; x.font = 'italic 500 96px "Playfair Display", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(o.engraving, 1024, 66);
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.y = -1; tex.offset.x = 0.5;
    const mat = B.mats.dark(o.metal).clone(); mat.alphaMap = tex; B.own.push(mat, tex);
    const cyl = own(B, new THREE.CylinderGeometry(R + 0.002, R + 0.002, w * 0.8, 128, 1, true));
    cyl.rotateX(Math.PI / 2);
    g.add(new THREE.Mesh(cyl, mat));
  }
  g.userData.parts = parts;
  return g;
}

function chainLinks(B, curve, metal, L = 0.07, r = 0.026) {
  const len = curve.getLength(), n = Math.max(4, Math.floor(len / L));
  const geo = gemLinkGeo(r);
  const m = new THREE.InstancedMesh(geo, B.mats.metal(metal), n);
  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, p = curve.getPointAt(u), tg = curve.getTangentAt(u);
    q.setFromUnitVectors(XAX, tg); q2.setFromAxisAngle(XAX, i % 2 ? Math.PI / 2 : 0); q.multiply(q2);
    m.setMatrixAt(i, mtx(p, q, 1));
  }
  m.instanceMatrix.needsUpdate = true; m.computeBoundingBox(); m.computeBoundingSphere();
  return m;
}
const LINKS = {};
function gemLinkGeo(r) {
  const k = r.toFixed(3);
  if (!LINKS[k]) { const g = new THREE.TorusGeometry(r, r * 0.28, 6, 16); g.scale(1.45, 1, 1); LINKS[k] = g; }
  return LINKS[k];
}

function buildPendant(B, o) {
  const g = new THREE.Group(), M = B.mats.metal(o.metal), cut = o.cut || 'round';
  const s = caratR(o.carat) * cutScale(cut);
  const hd = head(B, { cut, stone: o.stone, s, metal: o.metal, halo: o.setting === 'halo' });
  hd.rotation.x = Math.PI / 2; // table faces forward
  if (cut === 'oval' || cut === 'emerald') hd.rotation.y = Math.PI / 2; // long axis vertical
  g.add(hd);
  hd.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(hd);
  const topY = bb.max.y + 0.01;
  const bail = new THREE.Mesh(own(B, new THREE.TorusGeometry(0.085, 0.024, 10, 28)), M);
  bail.position.set(0, topY + 0.07, -0.02); bail.rotation.y = Math.PI / 2; g.add(bail);
  g.add(rod(B, new THREE.Vector3(0, bb.max.y - 0.04, -0.03), new THREE.Vector3(0, topY + 0.02, -0.02), 0.022, M));
  const top = new THREE.Vector3(0, topY + 0.15, -0.02);
  if (o.chainPath) g.add(chainLinks(B, o.chainPath(top), o.metal, 0.06, 0.022));
  else for (const side of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([top, new THREE.Vector3(side * 0.28, topY + 0.9, -0.12), new THREE.Vector3(side * 0.95, topY + 2.6, -0.5), new THREE.Vector3(side * 1.45, topY + 4.4, -0.9)]);
    g.add(chainLinks(B, c, o.metal));
  }
  g.userData.focus = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, (bb.min.y + topY + 0.8) / 2, 0), new THREE.Vector3(1.6, topY + 0.8 - bb.min.y, 0.4));
  return g;
}

function earring(B, o) {
  const E = new THREE.Group(), M = B.mats.metal(o.metal);
  const drop = o.style === 'drop';
  const cut = o.cut || 'round';
  const s1 = drop ? 0.17 : caratR(o.carat) * cutScale(cut) * 0.92;
  const stud = head(B, { cut: drop ? 'round' : cut, stone: drop ? 'diamond' : o.stone, s: s1, metal: o.metal, halo: !drop && o.setting === 'halo' });
  stud.rotation.x = Math.PI / 2; E.add(stud);
  E.add(rod(B, new THREE.Vector3(0, 0, -0.1), new THREE.Vector3(0, 0, -0.55), 0.022, M)); // post
  if (drop) {
    const s = caratR(o.carat) * cutScale(cut);
    const ring = new THREE.Mesh(own(B, new THREE.TorusGeometry(0.06, 0.016, 8, 24)), M);
    ring.position.set(0, -s1 - 0.06, -0.02); ring.rotation.y = Math.PI / 2; E.add(ring);
    E.add(rod(B, new THREE.Vector3(0, -s1 - 0.1, -0.02), new THREE.Vector3(0, -s1 - 0.32, -0.02), 0.02, M));
    const d = head(B, { cut, stone: o.stone, s, metal: o.metal, halo: o.setting === 'halo' });
    d.rotation.x = Math.PI / 2;
    if (cut === 'oval' || cut === 'emerald') d.rotation.y = Math.PI / 2;
    d.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(d);
    d.position.y = -s1 - 0.3 - bb.max.y;
    E.add(d);
  }
  return E;
}
function buildEarrings(B, o) {
  const g = new THREE.Group();
  if (o.single) { g.add(earring(B, o)); return g; }
  const gap = o.style === 'drop' ? 0.62 : 0.5 + caratR(o.carat);
  for (const side of [-1, 1]) { const e = earring(B, o); e.position.x = side * gap; e.rotation.y = -side * 0.22; g.add(e); }
  return g;
}

function buildBracelet(B, o) {
  const g = new THREE.Group(), M = B.mats.metal(o.metal);
  if (o.style === 'tennis') {
    const N = 44, R = 2.4, s = 0.152;
    const stones = [], cups = [], links = [];
    const cupG = own(B, new THREE.CylinderGeometry(1, 0.78, 0.9, 20, 1));
    const linkG = own(B, new THREE.BoxGeometry(0.12, 0.05, 0.09));
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const q = new THREE.Quaternion().setFromUnitVectors(UP, out);
      stones.push(mtx(out.clone().multiplyScalar(R + 0.02), q, s));
      cups.push(mtx(out.clone().multiplyScalar(R - s * 0.5), q, s * 1.08));
      const b = (i + 0.5) / N * Math.PI * 2, outb = new THREE.Vector3(Math.cos(b), 0, Math.sin(b));
      const qb = new THREE.Quaternion().setFromUnitVectors(UP, outb);
      links.push(mtx(outb.multiplyScalar(R - s * 0.75), qb, 1.4));
    }
    g.add(gemInstances(B, 'round', o.stone, stones));
    const cm = new THREE.InstancedMesh(cupG, M, N); cups.forEach((m, i) => cm.setMatrixAt(i, m)); g.add(cm);
    const lm = new THREE.InstancedMesh(linkG, M, N); links.forEach((m, i) => lm.setMatrixAt(i, m)); g.add(lm);
    [cm, lm].forEach(m => { m.computeBoundingBox(); m.computeBoundingSphere(); });
    g.rotation.x = 0.85;
  } else {
    const R = 2.2, t = 0.17, w = 0.34, top = R + t;
    const band = new THREE.Mesh(bandGeo(B, R, t, w, 220, 0.45, 0.3), M);
    g.add(band);
    if (o.band === 'pave') {
      const mats4 = [], n = 70;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; mats4.push(mtx(onCircle(top - 0.012, a), quatZ(a), 0.06)); }
      g.add(gemInstances(B, 'round', o.stone, mats4));
    } else {
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 + Math.PI / 10;
        const p = onCircle(top - 0.01, a), q = quatZ(a);
        const stud = new THREE.Mesh(own(B, new THREE.CylinderGeometry(0.07, 0.075, 0.05, 24)), M);
        stud.position.copy(p); stud.quaternion.copy(q); g.add(stud);
        const slot = new THREE.Mesh(own(B, new THREE.BoxGeometry(0.1, 0.03, 0.016)), B.mats.dark(o.metal));
        slot.position.copy(onCircle(top + 0.017, a)); slot.quaternion.copy(q); slot.rotateY(0.6); g.add(slot);
      }
    }
    g.scale.set(1.12, 1, 1);
    g.rotation.x = -0.95;
  }
  return g;
}

function buildBrooch(B, o) {
  const g = new THREE.Group(), M = B.mats.metal(o.metal);
  const face = new THREE.Group(); face.rotation.x = Math.PI / 2; // build with table +Y, then face forward
  const c = head(B, { cut: 'round', stone: 'diamond', s: 0.36, metal: o.metal, halo: true });
  c.position.y = 0.12; face.add(c);
  const petal = (r, a, s, tilt, stone) => {
    const p = new THREE.Group();
    const m = gem(B, 'marquise', stone, s);
    p.add(m);
    const rim = []; for (let i = 0; i < 36; i++) { const [x, z] = outline('marquise', i / 36 * Math.PI * 2); rim.push(new THREE.Vector3(x * s * 1.05, -0.02, z * s * 1.05)); }
    p.add(tube(B, rim, 0.02, M));
    for (const e of [-1, 1]) p.add(ball(B, new THREE.Vector3(0, 0.02, e * s * 1.85), 0.03, M));
    const holder = new THREE.Group(); holder.add(p);
    p.rotation.x = -tilt; // lift the tip
    p.position.z = r;
    holder.rotation.y = a;
    return holder;
  };
  const N1 = 8, N2 = 12;
  for (let i = 0; i < N1; i++) face.add(petal(0.78, i / N1 * Math.PI * 2, 0.24, 0.28, o.stone));
  for (let i = 0; i < N2; i++) { const p = petal(1.38, (i + 0.5) / N2 * Math.PI * 2, 0.29, 0.12, o.stone); p.position.y = -0.1; face.add(p); }
  const disc = new THREE.Mesh(own(B, new THREE.CylinderGeometry(1.25, 1.1, 0.06, 64)), M); disc.position.y = -0.3; face.add(disc);
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; face.add(ball(B, new THREE.Vector3(Math.cos(a) * 0.52, 0.0, Math.sin(a) * 0.52), 0.035, M)); }
  g.add(face);
  return g;
}

function buildNecklace(B, o) {
  const g = new THREE.Group(), M = B.mats.metal(o.metal);
  // graduated line of stones along a curve; path(u) gives point + outward normal for u in [-1, 1]
  const path = o.path || (u => {
    const a = u * 1.25;
    return { p: new THREE.Vector3(Math.sin(a) * 2.1, -Math.cos(a) * 1.75, -(1 - Math.cos(a)) * 0.9), n: new THREE.Vector3(Math.sin(a) * 0.15, -0.05, 1).normalize() };
  });
  const sizeAt = u => (o.scale || 1) * (0.07 + 0.11 * Math.pow(Math.cos(u * Math.PI / 2), 2.2));
  // walk the curve so neighbouring stones just touch
  const samples = []; for (let i = 0; i <= 400; i++) { const u = -1 + i / 200; samples.push({ u, ...path(u) }); }
  let lenAcc = [0]; for (let i = 1; i < samples.length; i++) lenAcc.push(lenAcc[i - 1] + samples[i].p.distanceTo(samples[i - 1].p));
  const at = d => { let i = lenAcc.findIndex(l => l >= d); if (i < 1) i = 1; const t = (d - lenAcc[i - 1]) / (lenAcc[i] - lenAcc[i - 1] || 1); return { p: samples[i - 1].p.clone().lerp(samples[i].p, t), n: samples[i - 1].n.clone().lerp(samples[i].n, t).normalize(), u: lerp(samples[i - 1].u, samples[i].u, t) }; };
  const total = lenAcc[lenAcc.length - 1];
  const stones = [], cups = [];
  let d = total / 2; const mid = at(d);
  const place = q => { const s = sizeAt(q.u), rot = new THREE.Quaternion().setFromUnitVectors(UP, q.n); stones.push(mtx(q.p, rot, s)); cups.push(mtx(q.p.clone().addScaledVector(q.n, -s * 0.5), rot, s * 1.15)); return s; };
  const s0 = place(mid);
  for (const dir of [-1, 1]) {
    let dd = total / 2, sPrev = s0;
    for (;;) {
      let s = sizeAt(at(dd).u);
      dd += dir * (sPrev + s + 0.012) * (o.scale ? 1 : 1);
      if (dd < 0.05 || dd > total - 0.05) break;
      const q = at(dd); s = place(q); sPrev = s;
    }
  }
  g.add(gemInstances(B, 'round', o.stone, stones));
  const cupG = own(B, new THREE.CylinderGeometry(1, 0.75, 0.85, 18, 1));
  const cm = new THREE.InstancedMesh(cupG, M, cups.length); cups.forEach((m, i) => cm.setMatrixAt(i, m)); cm.computeBoundingBox(); cm.computeBoundingSphere(); g.add(cm);
  // a spine under the stones
  const spine = []; for (let i = 0; i <= 60; i++) { const q = at(total * i / 60); spine.push(q.p.clone().addScaledVector(q.n, -0.06 * (o.scale || 1))); }
  g.add(tube(B, spine, 0.018 * (o.scale || 1), M, false));
  if (!o.path) g.userData.focus = new THREE.Box3(new THREE.Vector3(-2.3, -2.0, -1), new THREE.Vector3(2.3, 0.6, 0.5));
  return g;
}

function buildPiece(B, spec) {
  switch (spec.type) {
    case 'ring': return buildRing(B, spec);
    case 'pendant': return buildPendant(B, spec);
    case 'earrings': return buildEarrings(B, spec);
    case 'bracelet': return buildBracelet(B, spec);
    case 'brooch': return buildBrooch(B, spec);
    case 'necklace': return buildNecklace(B, spec);
  }
  return new THREE.Group();
}

/* ------------------------------------------------------------- sparkles */
let STAR = null;
function starTex() {
  if (STAR) return STAR;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,.5)'); g.addColorStop(0.4, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.globalCompositeOperation = 'lighter';
  for (const [w, hgt, r] of [[2.2, 62, 0], [2.2, 62, Math.PI / 2], [1.2, 30, Math.PI / 4], [1.2, 30, -Math.PI / 4]]) {
    x.save(); x.translate(64, 64); x.rotate(r);
    const lg = x.createLinearGradient(0, -hgt, 0, hgt);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = lg; x.fillRect(-w, -hgt, w * 2, hgt * 2); x.restore();
  }
  return (STAR = c);
}
function addSparkles(viewer, piece, count = 22, size = 1) {
  piece.updateMatrixWorld(true);
  const inv = piece.matrixWorld.clone().invert();
  const srcs = []; piece.traverse(o => { if (o.userData.gem) srcs.push(o); });
  if (!srcs.length) return;
  const pos = [], ph = [], v = new THREE.Vector3(), m4 = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const o = srcs[i % srcs.length], p = o.geometry.attributes.position;
    v.fromBufferAttribute(p, Math.floor(Math.random() * p.count));
    if (o.isInstancedMesh) { o.getMatrixAt(Math.floor(Math.random() * o.count), m4); v.applyMatrix4(m4); }
    v.applyMatrix4(o.matrixWorld).applyMatrix4(inv);
    pos.push(v.x, v.y, v.z); ph.push(Math.random());
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('ph', new THREE.Float32BufferAttribute(ph, 1));
  const tex = new THREE.CanvasTexture(starTex());
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, map: { value: tex }, px: { value: 26 * size * viewer.renderer.getPixelRatio() } },
    vertexShader: 'attribute float ph; uniform float t; uniform float px; varying float a; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); a = pow(max(sin(t * (0.9 + ph) + ph * 6.2831), 0.0), 14.0); gl_PointSize = px * a * (6.0 / -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; varying float a; void main(){ vec4 c = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(1.0, .98, .94) * c.a * a, c.a * a); }',
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat); pts.renderOrder = 10;
  pts.userData.sparkle = true;
  piece.add(pts);
  viewer.sparkles.push(mat); viewer.extra.push(geo, tex, mat);
}

/* --------------------------------------------------------------- viewers */
const viewers = new Set();
class Viewer {
  constructor(canvas, opt = {}) {
    this.canvas = canvas; this.opt = opt;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opt.preserve });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, opt.maxDpr || 2));
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = opt.exposure ?? 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(opt.fov || 28, 1, 0.05, 200);
    const env = makeEnv(r, opt.tone);
    this.scene.environment = env.pmrem;
    this.mats = new Mats(env.cube);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.sparkles = []; this.extra = []; this.own = [];
    if (opt.controls) {
      const c = this.controls = new OrbitControls(this.camera, canvas);
      c.enableDamping = true; c.dampingFactor = 0.08; c.enablePan = false; c.rotateSpeed = 0.75; c.zoomSpeed = 0.7;
      c.autoRotate = !!opt.autoRotate && !reduced; c.autoRotateSpeed = 0.9;
      c.addEventListener('start', () => { c.autoRotate = false; this.camGoal = null; });
    }
    this.visible = !!opt.offscreen;
    if (!opt.offscreen) {
      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { rootMargin: '120px' }).observe(canvas);
      viewers.add(this);
    }
    this.resize();
  }
  resize(w = this.canvas.clientWidth, hgt = this.canvas.clientHeight) {
    if (!w || !hgt) return;
    this.renderer.setSize(w, hgt, false);
    this.camera.aspect = w / hgt; this.camera.updateProjectionMatrix();
  }
  clear() {
    if (this.piece) this.root.remove(this.piece);
    this.own.forEach(o => o.dispose?.()); this.extra.forEach(o => o.dispose?.());
    this.own = []; this.extra = []; this.sparkles = [];
    this.piece = null;
  }
  setPiece(spec, { sparkle = 22, sparkleSize = 1 } = {}) {
    this.clear();
    const B = { mats: this.mats, own: [] };
    const obj = buildPiece(B, spec);
    this.own = B.own; this.piece = obj; this.root.add(obj);
    if (sparkle && !reduced) addSparkles(this, obj, sparkle, sparkleSize);
    return obj;
  }
  frame(obj = this.piece, { pad = 1.15, dir = [0, 0.2, 1], instant = true } = {}) {
    obj.updateMatrixWorld(true);
    let box = obj.userData.focus ? obj.userData.focus.clone().applyMatrix4(obj.matrixWorld) : null;
    if (!box) { box = new THREE.Box3(); obj.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && !o.userData.sparkle) box.expandByObject(o); }); }
    const sph = box.getBoundingSphere(new THREE.Sphere());
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fit = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect));
    const dist = sph.radius / Math.sin(fit / 2) * pad;
    const d = new THREE.Vector3(...dir).normalize();
    this.center = sph.center.clone(); this.dist = dist;
    const pos = sph.center.clone().addScaledVector(d, dist);
    if (instant) this.camera.position.copy(pos); else this.camGoal = pos;
    this.camera.lookAt(sph.center);
    if (this.controls) { this.controls.target.copy(sph.center); this.controls.minDistance = dist * 0.35; this.controls.maxDistance = dist * 2.4; this.controls.update(); }
  }
  render(t) {
    if (this.camGoal) {
      this.camera.position.lerp(this.camGoal, 0.08);
      if (this.camera.position.distanceTo(this.camGoal) < 0.002) this.camGoal = null;
      if (this.controls) this.camera.lookAt(this.controls.target);
    }
    this.sparkles.forEach(m => { m.uniforms.t.value = t; });
    this.onFrame?.(t);
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  }
}
function loop(ms) {
  const t = ms / 1000;
  if (!document.hidden) for (const v of viewers) if (v.visible) v.render(t);
  requestAnimationFrame(loop);
}

// soft contact shadow under a floating piece
function shadowPlane(size = 4, opacity = 0.35, col = '14,35,41') {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `rgba(${col},1)`); g.addColorStop(0.45, `rgba(${col},.35)`); g.addColorStop(1, `rgba(${col},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

/* ------------------------------------------------------------ thumbnails */
const VIEW = {
  ring: [0.55, 0.42, 1], pendant: [0, 0.05, 1], earrings: [0.25, 0.1, 1], bracelet: [0, 0.35, 1], brooch: [0.12, 0.12, 1], necklace: [0, 0.1, 1],
};
let thumbV = null;
const thumbCache = new Map();
function thumbnail(spec, { w = 720, hgt = 900, dir, pad } = {}) {
  const key = JSON.stringify([spec, w, hgt, dir, pad]);
  if (thumbCache.has(key)) return thumbCache.get(key);
  if (!thumbV) thumbV = new Viewer(document.createElement('canvas'), { offscreen: true, preserve: true, maxDpr: 1 });
  thumbV.resize(w, hgt);
  thumbV.setPiece(spec, { sparkle: 0 });
  thumbV.frame(thumbV.piece, { dir: dir || VIEW[spec.type], pad: pad || (spec.type === 'pendant' ? 1.0 : 1.2) });
  thumbV.renderer.render(thumbV.scene, thumbV.camera);
  const url = thumbV.renderer.domElement.toDataURL('image/png');
  thumbCache.set(key, url);
  return url;
}
const idle = fn => new Promise(res => (window.requestIdleCallback || (f => setTimeout(f, 16)))(() => res(fn()), { timeout: 400 }));

/* =====================================================================
   PAGE
   ===================================================================== */
const state = {
  bag: store.get('bag', []),
  shortlist: store.get('shortlist', ['octave', 'ondine', 'goutte']),
};
function saveState() { store.set('bag', state.bag); store.set('shortlist', state.shortlist); }

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- nav ---------- */
const nav = $('#nav');
$('#menuBtn').addEventListener('click', () => {
  const open = !nav.classList.contains('menu-open');
  nav.classList.toggle('menu-open', open); $('#menuBtn').setAttribute('aria-expanded', open);
  updateNav();
});
$$('#navLinks a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('menu-open'); $('#menuBtn').setAttribute('aria-expanded', false); updateNav(); }));
function updateNav() {
  const story = $('#story').getBoundingClientRect();
  nav.classList.toggle('solid', story.bottom < 70 || nav.classList.contains('menu-open'));
}

/* ---------- hero: real desert photographs brought to life; the edit floats in front ---------- */
// Each piece is paired with a photograph. The plate gets a slow push-in, heat shimmer at the
// horizon, a slow drift in the sky and wind-blown sand; a noise dissolve carries one scene into the next.
const HERO_SLIDES = [
  { id: 'octave', plate: 'img/hero/dunes-clouds.jpg', tone: 'light', horizon: 0.52, fx: 0.5, at: [0.7, 0.32], line: 'A Colombian emerald, step cut, framed in brilliants on a pavé band of yellow gold.' },
  { id: 'goutte', plate: 'img/hero/camels-sunset.jpg', tone: 'light', horizon: 0.27, fx: 0.55, at: [0.87, 0.2], line: 'Pear-cut emeralds that swing from diamond studs, made in Paris.' },
  { id: 'nenuphar', plate: 'img/hero/dune-crest.jpg', tone: 'light', horizon: 0.45, fx: 0.6, at: [0.72, 0.3], line: 'A water lily of twenty teal sapphires, worn on a lapel or as a pendant.' },
  { id: 'ondine', plate: 'img/hero/pink-dunes.jpg', tone: 'dark', horizon: 0.5, fx: 0.55, at: [0.7, 0.3], line: 'A teal sapphire from Sri Lanka, haloed in diamonds, the colour of the Gulf at dusk.' },
  { id: 'aube', plate: 'img/hero/caravan.jpg', tone: 'dark', horizon: 0.48, fx: 0.66, at: [0.7, 0.27], line: 'The Paris solitaire: one round brilliant raised on four fine claws.' },
];
const SLIDE_MS = 7500;

const PLATE_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const PLATE_FRAG = /* glsl */`
uniform sampler2D texA, texB;
uniform vec2 sizeA, sizeB;      // image pixel sizes
uniform vec4 metaA, metaB;      // focal x, horizon, zoom, pan
uniform vec2 screen;
uniform float t, wipe, look;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }
vec3 plate(sampler2D tex, vec2 size, vec4 m){
  vec2 uv = vUv;
  float s = screen.x / screen.y, a = size.x / size.y;
  // cover-fit around the focal point
  if (s > a) uv.y = 0.5 + (uv.y - 0.5) * a / s;
  else uv.x = clamp(m.x, 0.5 * s / a, 1.0 - 0.5 * s / a) + (uv.x - 0.5) * s / a;
  // slow push-in and pan, plus a touch of parallax from the pointer
  vec2 c = vec2(0.5 + m.w * 0.02, 1.0 - m.y);
  uv = c + (uv - c) / m.z;
  uv.x += look * 0.006;
  float hy = 1.0 - m.y;              // horizon in uv space (uv.y grows upward)
  // heat shimmer just above and below the horizon
  float band = exp(-pow((uv.y - hy) * 22.0, 2.0));
  uv.x += (noise(vec2(uv.y * 260.0, t * 2.2)) - 0.5) * 0.0016 * band;
  uv.y += (noise(vec2(uv.x * 180.0, t * 1.7)) - 0.5) * 0.0010 * band;
  // the sky drifts very slowly
  float sky = smoothstep(hy + 0.02, hy + 0.2, uv.y);
  uv.x += sky * sin(t * 0.06) * 0.006;
  vec3 col = texture2D(tex, clamp(uv, 0.001, 0.999)).rgb;
  // wind-blown sand: faint streaks travelling low over the ground
  float ground = smoothstep(hy - 0.05, hy - 0.45, uv.y);
  float streak = fbm(vec2(uv.x * 7.0 - t * 0.55, uv.y * 70.0 + t * 0.2));
  col += vec3(1.0, 0.86, 0.68) * smoothstep(0.58, 0.85, streak) * 0.09 * ground;
  return col;
}
void main(){
  vec3 a = plate(texA, sizeA, metaA);
  vec3 b = plate(texB, sizeB, metaB);
  // organic dissolve, sweeping from right to left like wind over sand
  float n = fbm(vUv * 3.5 + 4.0) * 0.6 + (1.0 - vUv.x) * 0.55;
  float k = 1.0 - smoothstep(wipe * 1.3 - 0.15, wipe * 1.3, n);
  vec3 col = mix(b, a, k);
  // a soft lens vignette
  vec2 q = vUv - 0.5; col *= 1.0 - dot(q * vec2(1.0, 1.25), q * vec2(1.0, 1.25)) * 0.55;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function desertHero() {
  const canvas = $('#heroCanvas');
  const section = $('#story');
  const mobileQ = matchMedia('(max-width: 760px)');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;

  // background plate
  const loader = new THREE.TextureLoader();
  const plates = HERO_SLIDES.map(() => null);
  const blank = new THREE.DataTexture(new Uint8Array([233, 205, 175, 255]), 1, 1); blank.needsUpdate = true;
  const pu = {
    texA: { value: blank }, texB: { value: blank }, sizeA: { value: new THREE.Vector2(1, 1) }, sizeB: { value: new THREE.Vector2(1, 1) },
    metaA: { value: new THREE.Vector4(0.5, 0.5, 1, 0) }, metaB: { value: new THREE.Vector4(0.5, 0.5, 1, 0) },
    screen: { value: new THREE.Vector2(1, 1) }, t: { value: 0 }, wipe: { value: 1 }, look: { value: 0 },
  };
  const bgScene = new THREE.Scene(), bgCam = new THREE.Camera();
  const bgMat = new THREE.ShaderMaterial({ uniforms: pu, vertexShader: PLATE_VERT, fragmentShader: PLATE_FRAG, depthTest: false, depthWrite: false, toneMapped: false });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));
  const envs = [];
  const pm = new THREE.PMREMGenerator(renderer);
  function loadPlate(i) {
    if (plates[i]) return plates[i];
    plates[i] = new Promise(res => loader.load(HERO_SLIDES[i].plate, tex => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.minFilter = THREE.LinearMipmapLinearFilter;
      const env = tex.clone(); env.mapping = THREE.EquirectangularReflectionMapping; env.needsUpdate = true;
      envs[i] = pm.fromEquirectangular(env).texture; // the jewellery reflects its own scene
      res(tex);
    }, undefined, () => res(blank)));
    return plates[i];
  }

  // jewellery
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
  camera.position.set(0, 0, 0);
  const key = new THREE.DirectionalLight(0xfff1dc, 1.6); key.position.set(-2, 3, 2); scene.add(key);
  const mats = new Mats(makeEnv(renderer, 'warm').cube);
  const stand = new THREE.Group(); scene.add(stand);
  const heroSparkles = [];
  // drifting sand motes in front of the plate
  const NP = 500, pp = [], ps = [];
  for (let i = 0; i < NP; i++) { pp.push((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 7, -2 - Math.random() * 12); ps.push(Math.random()); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); pg.setAttribute('seed', new THREE.Float32BufferAttribute(ps, 1));
  const motes = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: { t: pu.t, px: { value: renderer.getPixelRatio() } }, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: `attribute float seed; uniform float t; uniform float px; varying float a;
      void main(){ vec3 p = position; float sp = 0.25 + seed * 0.6;
        p.x = mod(p.x + 8.0 + t * sp, 16.0) - 8.0; p.y += sin(t * 0.7 + seed * 30.0) * 0.15 - 1.2 * seed * seed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        a = (0.25 + 0.5 * seed) * smoothstep(-14.0, -3.0, mv.z) * (0.6 + 0.4 * sin(t * 1.3 + seed * 50.0));
        gl_PointSize = px * (1.0 + seed * 2.4) * (5.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float a; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.93, 0.82, a * smoothstep(0.5, 0.0, d)); }`,
  }));
  motes.frustumCulled = false; scene.add(motes);

  let current = null, leaving = null, idx = 0, tStart = 0, spin = 0, spinV = 0, wipeStart = -1;
  const target = new THREE.Vector3(), place = new THREE.Vector3();
  let placed = false;
  function buildSlide(i) {
    const p = byId(HERO_SLIDES[i].id), B = { mats, own: [] };
    const obj = buildPiece(B, p.spec);
    const holder = new THREE.Group(); holder.add(obj);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3(); obj.traverse(o => { if (o.isMesh || o.isInstancedMesh) box.expandByObject(o); });
    if (obj.userData.focus) box.copy(obj.userData.focus);
    const sph = box.getBoundingSphere(new THREE.Sphere());
    obj.position.sub(sph.center);
    holder.userData = { k: 1 / sph.radius, own: B.own, born: performance.now() / 1000, base: p.spec.type === 'ring' ? 0.3 : 0 };
    holder.scale.setScalar(0.001);
    if (!reduced) addSparkles({ renderer, sparkles: heroSparkles, extra: [] }, obj, 20, 0.9);
    stand.add(holder);
    return holder;
  }
  async function show(i, dir = 1) {
    const n = HERO_SLIDES.length; idx = (i + n) % n;
    const my = idx, s = HERO_SLIDES[my];
    heroText(my);
    const tex = await loadPlate(my);
    loadPlate((my + 1) % n); // warm the next one
    if (my !== idx) return;  // the visitor moved on while it loaded
    // the old plate becomes B, the new one A; the wipe reveals A
    pu.texB.value = pu.texA.value; pu.sizeB.value.copy(pu.sizeA.value); pu.metaB.value.copy(pu.metaA.value);
    pu.texA.value = tex; pu.sizeA.value.set(tex.image.width, tex.image.height);
    pu.metaA.value.set(s.fx, s.horizon, 1.0, dir);
    wipeStart = pu.texB.value === blank ? -1 : performance.now(); if (wipeStart < 0) pu.wipe.value = 1; else pu.wipe.value = 0;
    scene.environment = envs[my] || null; scene.environmentIntensity = 1.0;
    if (leaving) { stand.remove(leaving); leaving.userData.own.forEach(o => o.dispose?.()); }
    leaving = current; if (leaving) leaving.userData.leftAt = performance.now() / 1000, leaving.userData.dir = dir;
    current = buildSlide(my); current.userData.dir = dir;
    heroSparkles.splice(0, Math.max(0, heroSparkles.length - 2));
    tStart = 0; spin = 0;
    section.dataset.tone = s.tone;
    nav.dataset.tone = s.tone;
  }

  // words
  const els = { eyebrow: $('#hEyebrow'), name: $('#hName'), desc: $('#hDesc'), price: $('#hPrice'), idx: $('#hIdx'), bars: $('#hBars'), text: $('#heroText') };
  $('#hTotal').textContent = String(HERO_SLIDES.length).padStart(2, '0');
  HERO_SLIDES.forEach((s, i) => els.bars.append(h('button', { 'aria-label': `Show ${byId(s.id).name}`, onclick: () => go(i) }, h('i'))));
  let textT, firstText = true;
  function heroText(i) {
    const s = HERO_SLIDES[i], p = byId(s.id);
    const fill = () => {
      els.eyebrow.textContent = `${p.house} · ${p.city}`;
      els.name.textContent = p.name;
      els.desc.textContent = s.line;
      els.price.textContent = aed(priceOf(p.spec));
      els.text.classList.remove('out');
    };
    clearTimeout(textT);
    if (firstText) { firstText = false; fill(); } else { els.text.classList.add('out'); textT = setTimeout(fill, 420); }
    els.idx.textContent = String(i + 1).padStart(2, '0');
    [...els.bars.children].forEach((b, j) => { b.classList.toggle('on', j === i); b.classList.toggle('done', j < i); b.style.setProperty('--dur', SLIDE_MS + 'ms'); });
    // restart the progress bar animation
    const on = els.bars.children[i]?.querySelector('i'); if (on) { on.style.animation = 'none'; void on.offsetWidth; on.style.animation = ''; }
  }
  function go(i, dir) { show(i, dir ?? (i >= idx ? 1 : -1)); }
  $('#hPrev').addEventListener('click', () => go(idx - 1, -1));
  $('#hNext').addEventListener('click', () => go(idx + 1, 1));
  $('#hOpen').addEventListener('click', () => openProduct(HERO_SLIDES[idx].id));
  $('#hHome').addEventListener('click', () => addShortlist(HERO_SLIDES[idx].id));
  let paused = false;
  els.text.addEventListener('pointerenter', () => { paused = true; section.classList.add('paused'); });
  els.text.addEventListener('pointerleave', () => { paused = false; section.classList.remove('paused'); });

  let down = false, lx = 0;
  canvas.addEventListener('pointerdown', e => { down = true; lx = e.clientX; });
  addEventListener('pointermove', e => { if (!down) return; spinV = (e.clientX - lx) * 0.01; spin += spinV; lx = e.clientX; });
  addEventListener('pointerup', () => { down = false; });
  const look = { x: 0, tx: 0, y: 0, ty: 0 };
  addEventListener('pointermove', e => { look.tx = e.clientX / innerWidth - 0.5; look.ty = e.clientY / innerHeight - 0.5; });

  const ease = x => 1 - Math.pow(1 - clamp(x), 3), easeIn = x => Math.pow(clamp(x), 3);
  let lastNow = performance.now();
  const v = {
    canvas, renderer, visible: true,
    render(t) {
      const now = performance.now(), dtMs = now - lastNow; lastNow = now;
      const w = canvas.clientWidth, hh = canvas.clientHeight;
      const sz = renderer.getSize(new THREE.Vector2());
      if (w && hh && (sz.x !== w || sz.y !== hh)) { renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); }
      pu.screen.value.set(w || 1, hh || 1);
      pu.t.value = reduced ? 0 : t;
      look.x += (look.tx - look.x) * 0.04; look.y += (look.ty - look.y) * 0.04;
      pu.look.value = reduced ? 0 : look.x;
      if (!tStart) tStart = now;
      if (paused || document.hidden || reduced) tStart += dtMs;
      const prog = clamp((now - tStart) / SLIDE_MS);
      pu.metaA.value.z = 1.0 + (reduced ? 0 : 0.07 * ease(prog * 0.85 + 0.15)); // push-in
      if (wipeStart > 0) { pu.wipe.value = ease((now - wipeStart) / 1600); if (pu.wipe.value >= 1) wipeStart = -1; }
      if (now - tStart > SLIDE_MS) go(idx + 1, 1);
      heroSparkles.forEach(m => { m.uniforms.t.value = t; });
      // where the piece floats, in screen terms, then at a fixed depth
      const s = HERO_SLIDES[idx], mobile = mobileQ.matches || camera.aspect < 0.9;
      const at = mobile ? [0.5, 0.3] : s.at, D = 6;
      const halfH = D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), halfW = halfH * camera.aspect;
      target.set((at[0] * 2 - 1) * halfW, (1 - at[1] * 2) * halfH, -D);
      if (!placed) { place.copy(target); placed = true; } else place.lerp(target, 0.05);
      stand.position.copy(place);
      const R = Math.min(halfH * 0.36, halfW * 0.42);
      if (!down) { spinV *= 0.94; spin += spinV; }
      const nowS = now / 1000;
      if (current) {
        const u = current.userData, a = ease((nowS - u.born) / 1.4);
        current.scale.setScalar(R * u.k * lerp(0.25, 1, a) + 1e-4);
        current.position.y = lerp(-0.6, 0, a) + (reduced ? 0 : Math.sin(t * 0.9) * 0.05);
        current.rotation.set(u.base + (reduced ? 0 : Math.sin(t * 0.5) * 0.08) + look.y * 0.2, (1 - a) * -2.2 * u.dir + (reduced ? 0 : t * 0.3) + spin + look.x * 0.4, 0);
      }
      if (leaving) {
        const u = leaving.userData, a = easeIn((nowS - u.leftAt) / 0.8);
        leaving.scale.setScalar(R * u.k * (1 - a) + 1e-4);
        leaving.position.y = a * 0.7;
        leaving.rotation.y += 0.06 * u.dir;
        if (a >= 1) { stand.remove(leaving); u.own.forEach(o => o.dispose?.()); leaving = null; }
      }
      renderer.clear();
      renderer.render(bgScene, bgCam);
      renderer.clearDepth();
      renderer.render(scene, camera);
    },
  };
  new IntersectionObserver(([e]) => { v.visible = e.isIntersecting; }).observe(canvas);
  viewers.add(v);
  show(0);
  return v;
}
const hero = desertHero();



/* ---------- houses marquee ---------- */
const track = $('#marquee');
const houseRow = () => HOUSES.map(([n, c]) => h('div.house', {}, h('span.n', { text: n }), h('span.c', { text: c })));
track.append(...houseRow(), ...houseRow());
let mq = 0, mqLast = performance.now();
function marquee(now) {
  const dt = Math.min(64, now - mqLast); mqLast = now;
  if (!reduced) mq -= dt * 0.025;
  const half = track.scrollWidth / 2;
  const off = ((mq - scrollY * 0.35) % half + half) % half;
  track.style.transform = `translateX(${-off}px)`;
}

/* ---------- the edit ---------- */
let cat = 'all';
const cardImgs = new Map();
function productCard(p, i) {
  const feature = cat === 'all' && p.feature;
  const img = h('img', { alt: p.name + ' in ' + METALS[p.spec.metal].short.toLowerCase(), loading: 'lazy' });
  if (cardImgs.has(p.id)) img.src = cardImgs.get(p.id);
  else img.dataset.pending = p.id;
  return h('button.card-p.rv' + (feature ? '.feature' : ''), { 'data-id': p.id, onclick: () => openProduct(p.id), 'aria-label': `${p.name} by ${p.house}, ${aed(priceOf(p.spec))}. View in 3D` },
    h('div.ph.' + p.bg, {}, img, h('span.tag', { text: p.cat === 'bridal' ? 'Bridal' : p.cat === 'occasion' ? 'Occasion' : 'Everyday' }), h('span.view3d', { text: 'View in 3D ↻' })),
    h('div.meta', {}, h('span.house-n', { text: `${p.house} · ${p.city}` }), h('span.name', { text: p.name }), h('span.price.num', { text: aed(priceOf(p.spec)) })));
}
function renderGrid() {
  const g = $('#grid'); g.textContent = '';
  PRODUCTS.filter(p => cat === 'all' || p.cat === cat).forEach((p, i) => {
    if (cat === 'all' && i === 5) g.append(h('a.tile-photo.rv', { href: '#tryon', 'aria-label': 'Try earrings on your own photo' },
      h('img', { src: 'img/edit-earring.jpg', alt: 'A woman in a gold earring and chain, looking away', loading: 'lazy' }),
      h('span', {}, h('small', { text: 'Virtual try-on' }), h('b', { text: 'See it on you, before it arrives' }))));
    g.append(productCard(p, i));
  });
  observeReveals(g);
}
function setCat(c) { cat = c; $$('#tabs .tab').forEach(x => x.setAttribute('aria-selected', x.dataset.cat === c)); renderGrid(); }
$$('#tabs .tab').forEach(b => b.addEventListener('click', () => setCat(b.dataset.cat)));
$$('[data-cat-link]').forEach(a => a.addEventListener('click', () => setCat(a.dataset.catLink)));
async function renderThumbs() {
  for (const p of PRODUCTS) {
    const url = await idle(() => thumbnail(p.spec, p.feature ? { w: 900, hgt: 1000 } : {}));
    cardImgs.set(p.id, url);
    $$(`img[data-pending="${p.id}"]`).forEach(im => { im.src = url; im.removeAttribute('data-pending'); });
    $$(`img[data-thumb="${p.id}"]`).forEach(im => { im.src = smallThumb(p); });
  }
}
const smallThumb = p => thumbnail(p.spec, { w: 320, hgt: 320, pad: 1.15 });

/* ---------- reveals ---------- */
const rvObs = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.remove('pre'); rvObs.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' }) : null;
function observeReveals(root = document) {
  if (!rvObs || reduced) return;
  $$('.rv', root).forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top > innerHeight) { el.classList.add('pre'); rvObs.observe(el); }
  });
}

/* ---------- liquid light ---------- */
function liquid() {
  const canvas = $('#liquidCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, res: { value: new THREE.Vector2(1, 1) }, sc: { value: 0 } },
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float t; uniform vec2 res; uniform float sc;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 4; i++){ v += a * noise(p); p = m * p; a *= 0.5; } return v; }
      float H(vec2 p){
        float tt = t * 0.05 + sc;
        vec2 q = vec2(fbm(p + vec2(0.0, tt)), fbm(p + vec2(5.2, 1.3) - tt));
        vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + tt * 0.7), fbm(p + 2.6 * q + vec2(8.3, 2.8)));
        return fbm(p + 2.2 * r);
      }
      void main(){
        vec2 uv = gl_FragCoord.xy / res.y;
        vec2 p = vec2(uv.x * 0.55 + uv.y * 0.2, uv.y * 1.25);
        float e = 0.0035;
        float h0 = H(p), hx = H(p + vec2(e, 0.0)), hy = H(p + vec2(0.0, e));
        vec3 n = normalize(vec3((h0 - hx) / e * 0.05, (h0 - hy) / e * 0.05, 1.0));
        vec3 l = normalize(vec3(-0.4, 0.6, 0.7)), v = vec3(0.0, 0.0, 1.0);
        float diff = max(dot(n, l), 0.0);
        float spec = pow(max(dot(reflect(-l, n), v), 0.0), 28.0);
        float spec2 = pow(max(dot(reflect(-normalize(vec3(0.6, -0.2, 0.8)), n), v), 0.0), 60.0);
        vec3 deep = vec3(0.012), satin = vec3(0.42, 0.42, 0.41), pale = vec3(0.95, 0.95, 0.93);
        vec3 col = mix(deep, satin, smoothstep(0.35, 1.0, diff) * 0.55);
        col = mix(col, pale, smoothstep(0.86, 1.0, diff) * 0.35);
        col += spec * vec3(0.9) * 0.55;
        col += spec2 * vec3(0.72, 0.62, 0.40) * 0.55; // a gold glint where the cloth turns
        vec2 q = gl_FragCoord.xy / res - 0.5;
        col *= 1.0 - dot(q, q) * 0.9;
        col *= 1.0 - 0.32 * exp(-dot(q * vec2(1.6, 2.6), q * vec2(1.6, 2.6)) * 3.0); // quieter behind the words
        gl_FragColor = vec4(pow(col, vec3(0.92)), 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const v = { canvas, renderer, visible: false, render(t) {
    const w = canvas.clientWidth, hgt = canvas.clientHeight;
    const s = renderer.getSize(new THREE.Vector2());
    if (s.x !== w || s.y !== hgt) renderer.setSize(w, hgt, false);
    mat.uniforms.res.value.set(w * renderer.getPixelRatio(), hgt * renderer.getPixelRatio());
    mat.uniforms.t.value = reduced ? 20 : t;
    mat.uniforms.sc.value = canvas.getBoundingClientRect().top * 0.0012;
    renderer.render(scene, cam);
  } };
  new IntersectionObserver(([e]) => { v.visible = e.isIntersecting; }).observe(canvas);
  viewers.add(v);
}

/* ---------- product overlay ---------- */
let pdV = null, pdCurrent = null;
function openProduct(id, metal) {
  const p = byId(id); if (!p) return;
  pdCurrent = { p, spec: { ...p.spec, metal: metal || p.spec.metal } };
  const pd = $('#pd');
  pd.classList.add('open'); pd.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  $('#pdBg').style.background = p.bg === 'noir' ? 'radial-gradient(80% 70% at 50% 45%, #262625, #0d0d0d 72%, #050505)' : 'var(--paper)';
  $('.pd-stage .hint2').style.color = p.bg === 'noir' ? '#fff' : 'var(--ink)';
  $('#pdMetals').style.color = p.bg === 'noir' ? '#fff' : 'var(--ink)';
  if (!pdV) pdV = new Viewer($('#pdCanvas'), { controls: true, autoRotate: true, fov: 26 });
  requestAnimationFrame(() => { pdV.resize(); pdRebuild(); });
  $('#pdHouse').textContent = `${p.house} · ${p.city}`;
  $('#pdName').textContent = p.name;
  $('#pdDesc').textContent = p.desc;
  $('#pdTry').hidden = !TRYABLE.includes(p.id);
  pdInfo();
  $('#pdClose').focus({ preventScroll: true });
}
function pdRebuild() {
  pdV.setPiece(pdCurrent.spec, { sparkle: 26 });
  pdV.controls.autoRotate = !reduced;
  pdV.frame(pdV.piece, { dir: VIEW[pdCurrent.spec.type], pad: pdCurrent.spec.type === 'pendant' ? 1.05 : 1.25 });
}
function specRows(s) {
  const rows = [['Metal', METALS[s.metal].name]];
  if (s.type === 'ring' && s.setting !== 'eternity') rows.push(['Centre stone', `${s.carat.toFixed(2)} ct ${CUTS[s.cut].toLowerCase()} ${STONES[s.stone].name.toLowerCase()}`], ['Setting', SETTINGS[s.setting] + (s.band === 'pave' ? ', pavé band' : '')]);
  if (s.type === 'ring' && s.setting === 'eternity') rows.push(['Stones', `64 round brilliants, ${STONES[s.stone].name.toLowerCase()}`]);
  if (s.type === 'ring') rows.push(['Size', `EU ${s.size || 52}, free resizing`]);
  if (s.type === 'pendant') rows.push(['Stone', `${s.carat.toFixed(2)} ct ${CUTS[s.cut].toLowerCase()} ${STONES[s.stone].name.toLowerCase()}`], ['Chain', `${s.chain} cm cable chain`]);
  if (s.type === 'earrings') rows.push(['Stones', `2 × ${s.carat.toFixed(2)} ct ${CUTS[s.cut].toLowerCase()} ${STONES[s.stone].name.toLowerCase()}`], ['Fastening', s.style === 'drop' ? 'Post and butterfly, diamond stud' : 'Screw back']);
  if (s.type === 'bracelet') rows.push(['Style', s.style === 'tennis' ? '44 round brilliants, 4.1 ct total' : (s.band === 'pave' ? 'Oval bangle, 70 pavé brilliants' : 'Oval bangle, 10 polished studs')], ['Wrist', `${s.size || 17} cm`]);
  if (s.type === 'brooch') rows.push(['Stones', '20 marquise teal sapphires, 0.9 ct diamond centre']);
  if (s.type === 'necklace') rows.push(['Stones', 'Graduated round brilliants, 11.2 ct total'], ['Length', '42 cm, box clasp']);
  rows.push(['Certificate', s.type === 'bracelet' || s.type === 'necklace' || s.setting === 'eternity' ? 'IGI' : 'GIA']);
  return rows;
}
function pdInfo() {
  const { spec } = pdCurrent;
  $('#pdPrice').textContent = aed(priceOf(spec)) + ' · VAT included';
  $('#pdBag').textContent = `${aed(priceOf(spec))} — Add to bag`;
  $('#pdSpecs').replaceChildren(...specRows(spec).flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]));
  const m = $('#pdMetals'); m.textContent = '';
  for (const [k, mt] of Object.entries(METALS)) {
    m.append(h('button.chip', { 'aria-pressed': spec.metal === k, style: 'color:inherit', onclick: () => { pdCurrent.spec.metal = k; pdRebuild(); pdInfo(); } }, mt.short));
  }
}
function closeProduct() {
  const pd = $('#pd'); pd.classList.remove('open'); pd.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
  if (pdV) pdV.visible = false;
}
$('#pdClose').addEventListener('click', closeProduct);
addEventListener('keydown', e => { if (e.key === 'Escape') { closeProduct(); closeBag(); } });
$('#pdBag').addEventListener('click', () => addToBag({ id: pdCurrent.p.id, name: pdCurrent.p.name, spec: pdCurrent.spec }));
$('#pdHome').addEventListener('click', () => addShortlist(pdCurrent.p.id));
$('#pdCustom').addEventListener('click', () => { const s = pdCurrent.spec; closeProduct(); loadConfig(s); location.hash = ''; $('#compose').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); });
$('#pdTry').addEventListener('click', () => { const id = pdCurrent.p.id; closeProduct(); selectTry(id, true); $('#tryon').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); });
$$('[data-open]').forEach(b => b.addEventListener('click', () => openProduct(b.dataset.open)));

/* ---------- bag ---------- */
function addToBag(item) {
  state.bag.push({ ...item, price: priceOf(item.spec) }); saveState(); renderBag();
  toast(`${item.name} added to your bag`);
}
function renderBag() {
  $('#bagCount').textContent = state.bag.length;
  const list = $('#bagItems'); list.textContent = '';
  if (!state.bag.length) list.append(h('p.note', { text: 'Your bag is empty. Pieces you add from the edit or from Compose appear here.' }));
  state.bag.forEach((it, i) => list.append(h('div.it', {},
    h('img', { src: thumbnail(it.spec, { w: 280, hgt: 280, pad: 1.15 }), alt: '' }),
    h('div', {}, h('div', { text: it.name }), h('div.note', { text: `${METALS[it.spec.metal].short}${it.spec.engraving ? ' · “' + it.spec.engraving + '”' : ''}` }), h('div.num', { text: aed(it.price) })),
    h('button', { text: 'Remove', onclick: () => { state.bag.splice(i, 1); saveState(); renderBag(); } }))));
  $('#bagTotal').textContent = aed(state.bag.reduce((a, b) => a + b.price, 0));
}
function openBag() { renderBag(); $('#bag').classList.add('open'); $('#scrim').classList.add('open'); $('#bag').setAttribute('aria-hidden', 'false'); $('#bagClose').focus(); }
function closeBag() { $('#bag').classList.remove('open'); $('#scrim').classList.remove('open'); $('#bag').setAttribute('aria-hidden', 'true'); }
$('#bagBtn').addEventListener('click', openBag);
$('#bagClose').addEventListener('click', closeBag);
$('#scrim').addEventListener('click', closeBag);
$('#bagHome').addEventListener('click', () => {
  state.bag.forEach(it => { if (byId(it.id) && !state.shortlist.includes(it.id) && state.shortlist.length < 6) state.shortlist.push(it.id); });
  saveState(); renderShortlist(); closeBag(); $('#athome').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
});

/* ---------- compose (configurator) ---------- */
const cfg = store.get('cfg', null) || { type: 'ring', cut: 'oval', stone: 'diamond', carat: 1.5, setting: 'halo', band: 'pave', metal: 'yellow', size: 52, engraving: 'A & L · 2026', style: 'drop', chain: 42 };
const cfgV = new Viewer($('#cfgCanvas'), { controls: true, autoRotate: false, fov: 26, tone: 'warm', exposure: 1.0 });
const cfgShadow = shadowPlane(4, 0.16, '0,0,0'); cfgV.scene.add(cfgShadow);
let cfgView = 'front';
const CFG_DIRS = { front: null, side: [1, 0.2, 0.05], top: [0.05, 1, 0.25], inside: [0.02, 0.62, 1] };
function cfgSpec() {
  const s = { type: cfg.type, metal: cfg.metal, stone: cfg.stone, cut: cfg.cut, carat: cfg.carat, setting: cfg.setting, band: cfg.band, size: cfg.size, chain: cfg.chain, style: cfg.style };
  if (cfg.type === 'ring' && cfg.engraving.trim()) s.engraving = cfg.engraving.trim();
  if (cfg.type === 'pendant' && !['solitaire', 'halo'].includes(s.setting)) s.setting = 'solitaire';
  if (cfg.type === 'earrings' && !['solitaire', 'halo'].includes(s.setting)) s.setting = 'solitaire';
  if (cfg.type === 'bracelet') { s.style = ['tennis', 'bangle'].includes(cfg.style) ? cfg.style : 'tennis'; s.size = cfg.wrist || 17; }
  if (cfg.type === 'earrings') s.style = ['stud', 'drop'].includes(cfg.style) ? cfg.style : 'drop';
  return s;
}
let cfgFramed = '';
function cfgRebuild(reframe) {
  const s = cfgSpec();
  const piece = cfgV.setPiece(s, { sparkle: 24 });
  piece.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(piece);
  cfgShadow.position.set(0, bb.min.y - 0.06, 0);
  const key = s.type + (s.style || '');
  if (reframe || key !== cfgFramed) { cfgFramed = key; setCfgView('front', true); }
  store.set('cfg', cfg);
  cfgSummary();
}
function setCfgView(v, instant) {
  cfgView = v;
  $$('#cfgViews .chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.view === v));
  const s = cfgSpec();
  cfgV.frame(cfgV.piece, { dir: CFG_DIRS[v] || VIEW[s.type], pad: s.type === 'pendant' ? 1.1 : 1.3, instant: !!instant });
  if (v === 'inside' && cfgV.controls) { cfgV.controls.target.set(0, -0.3, 0); cfgV.camGoal = new THREE.Vector3(0, 5.4, 6.2); }
}
$$('#cfgViews .chip').forEach(c => c.addEventListener('click', () => setCfgView(c.dataset.view)));

const optLab = (label, value) => h('div.lab', {}, h('span', { text: label + ':' }), h('span', { text: value || '' }));
function choiceRow(label, value, items, key, onPick) {
  const cur = items.find(([k]) => cfg[key] === k);
  return h('div.opt', {},
    optLab(label, value || (cur ? cur[1] : '')),
    h('div.choices', {}, ...items.map(([k, txt]) => h('button.choice', { 'aria-pressed': cfg[key] === k, text: txt, onclick: () => { cfg[key] = k; onPick?.(k); renderCfg(); cfgRebuild(); } }))));
}
function renderCfg() {
  const s = cfgSpec(), panel = $('#cfgPanel'); panel.textContent = '';
  panel.append(choiceRow('Piece', '', [['ring', 'Ring'], ['pendant', 'Pendant'], ['earrings', 'Earrings'], ['bracelet', 'Bracelet']], 'type', k => {
    if (k === 'ring' && !SETTINGS[cfg.setting]) cfg.setting = 'halo';
    if (k === 'pendant' || k === 'earrings') { if (!['solitaire', 'halo'].includes(cfg.setting)) cfg.setting = 'solitaire'; }
    if (k === 'bracelet' && !['tennis', 'bangle'].includes(cfg.style)) cfg.style = 'tennis';
    if (k === 'earrings' && !['stud', 'drop'].includes(cfg.style)) cfg.style = 'drop';
  }));
  // metal
  panel.append(h('div.opt', {}, optLab('Metal', METALS[cfg.metal].name),
    h('div.choices', {}, ...Object.entries(METALS).map(([k, m]) => h('button.swatch', { 'aria-pressed': cfg.metal === k, 'aria-label': m.name, title: m.name, onclick: () => { cfg.metal = k; renderCfg(); cfgRebuild(); } }, h('i', { style: `background:${m.swatch}` }))))));
  if (s.type === 'bracelet') {
    panel.append(choiceRow('Style', '', [['tennis', 'Tennis'], ['bangle', 'Bangle']], 'style'));
    if (s.style === 'bangle') panel.append(choiceRow('Finish', '', [['plain', 'Polished studs'], ['pave', 'Pavé']], 'band'));
  }
  // stone
  if (!(s.type === 'bracelet' && s.style === 'bangle' && cfg.band !== 'pave')) {
    panel.append(h('div.opt', {}, optLab('Stone', STONES[cfg.stone].name),
      h('div.choices', {}, ...Object.entries(STONES).map(([k, m]) => h('button.swatch', { 'aria-pressed': cfg.stone === k, 'aria-label': m.name, title: m.name, onclick: () => { cfg.stone = k; renderCfg(); cfgRebuild(); } }, h('i', { style: `background:${m.swatch}` }))))));
  }
  if (s.type === 'earrings') panel.append(choiceRow('Style', '', [['stud', 'Studs'], ['drop', 'Drops']], 'style'));
  const hasCentre = s.type !== 'bracelet' && !(s.type === 'ring' && s.setting === 'eternity');
  if (s.type === 'ring') panel.append(choiceRow('Setting', '', Object.entries(SETTINGS), 'setting'));
  if (s.type === 'pendant' || s.type === 'earrings') panel.append(choiceRow('Setting', '', [['solitaire', 'Claws'], ['halo', 'Halo']], 'setting'));
  if (hasCentre) {
    panel.append(choiceRow('Cut', '', Object.entries(CUTS), 'cut'));
    const read = () => `${cfg.carat.toFixed(2)} ct · ${caratMM(cfg.carat * cutScale(cfg.cut) ** 3).toFixed(1)} mm`;
    const lab = h('span', { text: read() });
    const rng = h('input.range', { type: 'range', id: 'cfgCarat', min: 0.3, max: 3, step: 0.05, value: cfg.carat, 'aria-label': 'Carat weight' });
    rng.addEventListener('input', () => { cfg.carat = +rng.value; lab.textContent = read(); cfgRebuild(); });
    panel.append(h('div.opt', {}, h('div.lab', {}, h('span', { text: (s.type === 'earrings' ? 'Carat, each' : 'Carat') + ':' }), lab), rng));
  }
  if (s.type === 'ring' && s.setting !== 'eternity') panel.append(choiceRow('Band', '', [['plain', 'Polished'], ['pave', 'Pavé']], 'band'));
  if (s.type === 'ring') {
    const sel = h('select.field', { id: 'cfgSize', 'aria-label': 'Ring size' }, ...Array.from({ length: 17 }, (_, i) => 46 + i).map(n => h('option', { value: n, selected: cfg.size === n, text: `EU ${n} · ${(n / Math.PI).toFixed(1)} mm` })));
    sel.addEventListener('change', () => { cfg.size = +sel.value; cfgSummary(); store.set('cfg', cfg); });
    const eng = h('input.field', { id: 'cfgEngrave', maxlength: 18, value: cfg.engraving, placeholder: 'Up to 18 characters', 'aria-label': 'Engraving text' });
    let et; eng.addEventListener('input', () => { cfg.engraving = eng.value; clearTimeout(et); et = setTimeout(() => { cfgRebuild(); if (cfg.engraving.trim()) setCfgView('inside'); }, 250); });
    panel.append(h('div.two', { style: 'display:grid;grid-template-columns:1fr 1.4fr;gap:12px' },
      h('div.opt', {}, optLab('Size'), sel),
      h('div.opt', {}, optLab('Engraving'), eng)));
  }
  if (s.type === 'pendant') panel.append(choiceRow('Chain', '', [[40, '40 cm'], [42, '42 cm'], [45, '45 cm']].map(([a, b]) => [a, b]), 'chain'));
  if (s.type === 'bracelet') {
    const sel = h('select.field', { id: 'cfgWrist', 'aria-label': 'Wrist size' }, ...[15, 16, 17, 18, 19].map(n => h('option', { value: n, selected: (cfg.wrist || 17) === n, text: `${n} cm wrist` })));
    sel.addEventListener('change', () => { cfg.wrist = +sel.value; store.set('cfg', cfg); });
    panel.append(h('div.opt', {}, optLab('Wrist'), sel));
  }
  panel.append(h('div.cfg-sum', {},
    h('div.btns', {},
      h('button.btn.solid.full', { id: 'cfgBuy', onclick: () => addToBag({ id: 'custom', name: cfgName(), spec: cfgSpec() }) }),
      h('button.btn.full', { text: 'Try it at home first', onclick: () => { addShortlist('custom'); } })),
    h('p.note', {}, h('span.dot'), 'Made to order in Europe in four to six weeks. Engraving and sizing are free.')));
  $('#insideBtn').hidden = !(s.type === 'ring' && cfg.engraving.trim());
  cfgSummary();
}
function cfgName() {
  const s = cfgSpec();
  const st = STONES[s.stone].name.toLowerCase();
  if (s.type === 'ring') return s.setting === 'eternity' ? `Your ${st} eternity band` : `Your ${CUTS[s.cut].toLowerCase()} ${SETTINGS[s.setting].toLowerCase()} ring`;
  if (s.type === 'pendant') return `Your ${CUTS[s.cut].toLowerCase()} ${st} pendant`;
  if (s.type === 'earrings') return `Your ${st} ${s.style === 'drop' ? 'drop earrings' : 'studs'}`;
  return s.style === 'tennis' ? `Your ${st} tennis bracelet` : 'Your bangle';
}
function cfgSummary() {
  const s = cfgSpec();
  const el = $('#cfgBuy'); if (el) el.textContent = `${aed(priceOf(s))} — Add to bag`;
  $('#cfgRead').textContent = `${cfgName()} · ${METALS[s.metal].short}`;
}
function loadConfig(spec) {
  Object.assign(cfg, spec);
  if (spec.type === 'bracelet') cfg.wrist = spec.size;
  if (!['ring', 'pendant', 'earrings', 'bracelet'].includes(cfg.type)) { cfg.type = 'pendant'; cfg.cut = 'round'; cfg.carat = 1; cfg.setting = 'halo'; }
  if (!spec.engraving) cfg.engraving = '';
  renderCfg(); cfgRebuild(true);
}

/* ---------- try on ---------- */
const TRYABLE = ['ondine', 'fil', 'riviere', 'goutte', 'point', 'nenuphar'];
const ON_BUST = ['ondine', 'fil', 'riviere'];
const TONES = [
  ['Porcelain', '#f3d9c6'], ['Sand', '#e3b896'], ['Honey', '#c99068'], ['Caramel', '#a86f48'], ['Cocoa', '#7a4d31'], ['Ebony', '#4a2e20'],
];
let tryMode = 'tone', tryId = 'ondine', toneIdx = store.get('tone', 2), toneV = null, bust = null, bustPiece = null;
// The bust is a lathe profile, spread into shoulders; the same functions place jewellery on its skin.
const BUST_PROF = [[-1.5, 0.0], [-1.5, 0.92], [-1.3, 1.04], [-0.95, 1.07], [-0.6, 1.04], [-0.38, 0.95], [-0.18, 0.74], [-0.02, 0.5], [0.12, 0.37], [0.3, 0.335], [0.62, 0.33], [0.78, 0.31], [0.84, 0.22], [0.86, 0.0]];
function bustR(y) {
  const P = BUST_PROF;
  if (y <= P[1][0]) return P[1][1];
  for (let i = 1; i < P.length - 1; i++) if (y <= P[i + 1][0]) { const t = (y - P[i][0]) / (P[i + 1][0] - P[i][0]); return lerp(P[i][1], P[i + 1][1], t * t * (3 - 2 * t)); }
  return 0;
}
const bustK = y => smooth(0.12, -0.5, y);
function bustAt(a, y, off = 0) { // a = 0 faces the viewer
  const r = bustR(y), k = bustK(y);
  const fx = 1 + 0.9 * k, fz = (1 - 0.34 * k) * (Math.cos(a) > 0 ? 1 + 0.1 * smooth(-0.2, -1.1, y) : 1);
  const lean = 0.05 * smooth(0.05, 0.5, y);
  const p = new THREE.Vector3(Math.sin(a) * r * fx, y, Math.cos(a) * r * fz + lean);
  const n = new THREE.Vector3(Math.sin(a) / fx, 0, Math.cos(a) / fz);
  const dr = (bustR(y + 0.01) - bustR(y - 0.01)) / 0.02; // slope: the skin faces up where the bust widens below
  n.normalize(); n.y = -dr * 0.6; n.normalize();
  return { p: p.addScaledVector(n, off), n };
}
function bustGeo() {
  const g = new THREE.LatheGeometry(BUST_PROF.map(([y, r]) => V2(r, y)), 120, Math.PI);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(x, z), r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const q = bustAt(a, y).p, rr = bustR(y) || 1;
    p.setXYZ(i, q.x * r / rr, y, (q.z - 0.05 * smooth(0.05, 0.5, y)) * r / rr + 0.05 * smooth(0.05, 0.5, y));
  }
  g.computeVertexNormals();
  return g;
}
// where a necklace rests: round the base of the neck, dropping toward the collarbones at the front
function bustPath(drop, lift = 0, off = 0.02) {
  return u => {
    const a = u * Math.PI, front = Math.pow(Math.cos(a / 2), 2);
    const y = 0.14 + lift - drop * Math.pow(front, 1.8);
    return bustAt(a, y, off);
  };
}
function setupTone() {
  toneV = new Viewer($('#toneCanvas'), { controls: true, fov: 24, tone: 'warm', exposure: 0.95 });
  const c = toneV.controls; c.minPolarAngle = 0.9; c.maxPolarAngle = 1.75; c.minAzimuthAngle = -1.0; c.maxAzimuthAngle = 1.0; c.enableZoom = true;
  toneV.scene.add(new THREE.HemisphereLight(0xfff4e6, 0x6b5a48, 1.1));
  const key = new THREE.DirectionalLight(0xfff1de, 2.2); key.position.set(-2, 3, 4); toneV.scene.add(key);
  const rim = new THREE.DirectionalLight(0xcfe6ee, 1.0); rim.position.set(3, 1, -2); toneV.scene.add(rim);
  bust = new THREE.Mesh(bustGeo(), new THREE.MeshPhysicalMaterial({ color: TONES[toneIdx][1], roughness: 0.6, sheen: 0.6, sheenRoughness: 0.45, sheenColor: 0xffe2cf, envMapIntensity: 0.35, clearcoat: 0.08 }));
  toneV.root.add(bust);
  toneV.camera.position.set(0, 0.25, 6.6); c.target.set(0, -0.22, 0); c.minDistance = 2.2; c.maxDistance = 11;
  toneV.onFrame = t => { if (bust && !reduced) bust.rotation.y = Math.sin(t * 0.25) * 0.05; if (bustPiece) bustPiece.rotation.y = bust.rotation.y; };
}
function tonePiece() {
  const p = byId(ON_BUST.includes(tryId) ? tryId : 'ondine');
  const s = { ...p.spec };
  toneV.clear();
  const B = { mats: toneV.mats, own: [] };
  const obj = new THREE.Group();
  if (s.type === 'pendant') {
    const path = bustPath(0.42, 0, 0.012);
    const front = path(0);
    // the pendant, life size (bust: 1 unit ≈ 14 cm) and a touch larger so it reads on screen
    const pend = buildPendant(B, s);
    pend.children.filter(o => o.isInstancedMesh).forEach(o => pend.remove(o));
    pend.scale.setScalar(0.15);
    pend.updateMatrixWorld(true);
    const pb = new THREE.Box3().setFromObject(pend);
    pend.position.set(0, front.p.y - pb.max.y + 0.005, front.p.z + 0.02);
    pend.rotation.x = -Math.atan2(front.n.y, front.n.z) * 0.8;
    obj.add(pend);
    const chain = new THREE.CatmullRomCurve3(Array.from({ length: 72 }, (_, i) => path(-1 + (i + 0.5) / 36).p), true);
    obj.add(chainLinks(B, chain, s.metal, 0.014, 0.0058));
    toneV.own = B.own; toneV.piece = obj; toneV.root.add(obj);
    if (!reduced) addSparkles(toneV, pend, 8, 0.45);
  } else {
    const path = bustPath(0.3, 0.02, 0.022);
    obj.add(buildNecklace(B, { ...s, scale: 0.25, path: u => path(u * 0.62) }));
    const chain = new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => path(0.6 + i / 39 * 0.4).p), false);
    obj.add(chainLinks(B, chain, s.metal, 0.011, 0.0045));
    const chain2 = new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => path(-0.6 - i / 39 * 0.4).p), false);
    obj.add(chainLinks(B, chain2, s.metal, 0.011, 0.0045));
    toneV.own = B.own; toneV.piece = obj; toneV.root.add(obj);
    if (!reduced) addSparkles(toneV, obj, 14, 0.5);
  }
  bustPiece = obj;
}
function renderTones() {
  const w = $('#tones'); w.textContent = '';
  TONES.forEach(([n, c], i) => w.append(h('button.tone', { 'aria-pressed': i === toneIdx, 'aria-label': n + ' skin tone', onclick: () => { toneIdx = i; store.set('tone', i); bust.material.color.set(c); renderTones(); } }, h('i', { style: `background:${c}` }), n)));
  $('#toneName').textContent = TONES[toneIdx][0];
}
function renderPieces() {
  const w = $('#pieces'); w.textContent = '';
  TRYABLE.forEach(id => {
    const p = byId(id);
    const disabled = tryMode === 'tone' && !ON_BUST.includes(id);
    const img = h('img', { alt: '', 'data-thumb': id });
    if (cardImgs.has(id)) img.src = smallThumb(p);
    w.append(h('button.piece', { 'aria-pressed': id === tryId, disabled, style: disabled ? 'opacity:.4;cursor:not-allowed' : '', title: disabled ? 'Earrings and brooches: use On your photo' : p.name, onclick: () => selectTry(id) }, img, h('span', { text: p.name })));
  });
  $('#pieceName').textContent = byId(tryId).name;
}
function selectTry(id, fromProduct) {
  tryId = id;
  if (fromProduct && !ON_BUST.includes(id) && tryMode === 'tone') return setMode('photo');
  if (tryMode === 'tone' && !ON_BUST.includes(id)) tryId = 'ondine';
  renderPieces();
  if (tryMode === 'tone') tonePiece(); else photoLayers(true);
}
function setMode(m) {
  tryMode = m;
  $('#modeTone').setAttribute('aria-selected', m === 'tone'); $('#modePhoto').setAttribute('aria-selected', m === 'photo');
  $('#toneCanvas').hidden = m !== 'tone'; $('#photoCanvas').hidden = m !== 'photo';
  $('#toneSide').hidden = m !== 'tone'; $('#photoSide').hidden = m !== 'photo';
  if (m === 'tone') { if (!ON_BUST.includes(tryId)) tryId = 'ondine'; tonePiece(); toneV.resize(); }
  else photoLayers(true);
  renderPieces();
}
$('#modeTone').addEventListener('click', () => setMode('tone'));
$('#modePhoto').addEventListener('click', () => setMode('photo'));
$('#tryAddHome').addEventListener('click', () => addShortlist(tryId));
$('#tryView').addEventListener('click', () => openProduct(tryId));

// ---- photo try-on: a 2D composition of the photo and rendered pieces
const photo = { img: null, sample: true, layers: [], sel: 0 };
const pc = $('#photoCanvas');
function loadPhoto(src, sample) {
  const im = new Image();
  im.onload = () => { photo.img = im; photo.sample = sample; photoLayers(true); };
  im.src = src;
}
// where pieces go on the sample portrait (image pixels)
const SAMPLE_SPOTS = { neck: [312, 600, 210], earL: [189, 338, 46], earR: [425, 338, 46], lapel: [430, 690, 150] };
function photoFit() {
  const W = pc.width, H = pc.height, im = photo.img;
  const s = Math.max(W / im.width, H / im.height);
  return { s, ox: (W - im.width * s) / 2, oy: (H - im.height * s) / 2 };
}
function photoLayers(reset) {
  if (!photo.img) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  pc.width = Math.round(pc.clientWidth * dpr) || 800; pc.height = Math.round(pc.clientHeight * dpr) || 1000;
  if (reset) {
    const p = byId(tryId), s = p.spec, f = photoFit();
    const spot = k => { const [x, y, w] = photo.sample ? SAMPLE_SPOTS[k] : { neck: [photo.img.width / 2, photo.img.height * 0.68, photo.img.width * 0.34], earL: [photo.img.width * 0.33, photo.img.height * 0.4, photo.img.width * 0.07], earR: [photo.img.width * 0.67, photo.img.height * 0.4, photo.img.width * 0.07], lapel: [photo.img.width * 0.7, photo.img.height * 0.8, photo.img.width * 0.24] }[k]; return { x: f.ox + x * f.s, y: f.oy + y * f.s, w: w * f.s }; };
    const layer = (spec, at, anchor = 'top', dir = [0, 0, 1]) => {
      const img = new Image(); img.src = thumbnail(spec, { w: 640, hgt: 640, dir, pad: 1.05 });
      return { img, x: at.x, y: at.y, w: at.w, rot: 0, scale: 1, anchor };
    };
    photo.layers = [];
    if (s.type === 'earrings') {
      const one = { ...s, single: true };
      photo.layers.push(layer(one, spot('earL')), layer(one, spot('earR')));
    } else if (s.type === 'brooch') photo.layers.push(layer(s, spot('lapel'), 'center'));
    else if (s.type === 'pendant') photo.layers.push(layer({ ...s }, { ...spot('neck'), w: spot('neck').w * 1.25 }, 'neck'));
    else photo.layers.push(layer(s, spot('neck'), 'neck'));
    photo.sel = 0; syncSliders();
    photo.layers.forEach(l => { l.img.onload = drawPhoto; });
  }
  drawPhoto();
}
function layerRect(l) {
  const w = l.w * l.scale * (l.anchor === 'top' ? 1.6 : 1.15), hgt = w; // thumbnails are square with padding
  const cy = l.anchor === 'top' ? l.y + hgt * 0.36 : l.anchor === 'neck' ? l.y + hgt * 0.12 : l.y;
  return { cx: l.x, cy, w, h: hgt };
}
function drawPhoto() {
  const x = pc.getContext('2d'), W = pc.width, H = pc.height;
  x.clearRect(0, 0, W, H);
  if (!photo.img) return;
  const f = photoFit();
  x.drawImage(photo.img, f.ox, f.oy, photo.img.width * f.s, photo.img.height * f.s);
  photo.layers.forEach((l, i) => {
    if (!l.img.complete) return;
    const r = layerRect(l);
    x.save(); x.translate(r.cx, r.cy); x.rotate(l.rot * Math.PI / 180);
    x.shadowColor = 'rgba(40,25,10,.35)'; x.shadowBlur = 6 * (W / 800); x.shadowOffsetY = 3 * (W / 800);
    x.drawImage(l.img, -r.w / 2, -r.h / 2, r.w, r.h);
    x.restore();
    if (i === photo.sel && photo.dragging) { x.strokeStyle = 'rgba(242,237,229,.8)'; x.setLineDash([6, 6]); x.strokeRect(r.cx - r.w / 2, r.cy - r.h / 2, r.w, r.h); x.setLineDash([]); }
  });
  if (photo.sample) {
    x.fillStyle = 'rgba(242,237,229,.85)'; x.font = `500 ${11 * (W / 600)}px "Hanken Grotesk", sans-serif`;
    x.fillText('SAMPLE PHOTO', 18 * (W / 600), H - 18 * (W / 600));
  }
}
function syncSliders() { const l = photo.layers[photo.sel]; if (!l) return; $('#sScale').value = l.scale; $('#sRot').value = l.rot; }
$('#sScale').addEventListener('input', e => { const l = photo.layers[photo.sel]; if (l) { l.scale = +e.target.value; drawPhoto(); } });
$('#sRot').addEventListener('input', e => { const l = photo.layers[photo.sel]; if (l) { l.rot = +e.target.value; drawPhoto(); } });
{
  let start = null;
  const pt = e => { const r = pc.getBoundingClientRect(); return [(e.clientX - r.left) * pc.width / r.width, (e.clientY - r.top) * pc.height / r.height]; };
  pc.addEventListener('pointerdown', e => {
    const [x, y] = pt(e);
    let hit = -1, best = 1e9;
    photo.layers.forEach((l, i) => { const r = layerRect(l), d = Math.hypot(r.cx - x, r.cy - y); if (d < Math.max(r.w, r.h) * 0.6 && d < best) { best = d; hit = i; } });
    if (hit < 0) return;
    photo.sel = hit; syncSliders(); photo.dragging = true;
    start = { x, y, lx: photo.layers[hit].x, ly: photo.layers[hit].y };
    pc.setPointerCapture(e.pointerId); drawPhoto();
  });
  pc.addEventListener('pointermove', e => {
    if (!start) return;
    const [x, y] = pt(e), l = photo.layers[photo.sel];
    l.x = start.lx + x - start.x; l.y = start.ly + y - start.y; drawPhoto();
  });
  const end = () => { start = null; photo.dragging = false; drawPhoto(); };
  pc.addEventListener('pointerup', end); pc.addEventListener('pointercancel', end);
  pc.addEventListener('wheel', e => { const l = photo.layers[photo.sel]; if (!l) return; e.preventDefault(); l.scale = clamp(l.scale * (e.deltaY < 0 ? 1.05 : 0.95), 0.3, 2.5); syncSliders(); drawPhoto(); }, { passive: false });
}
function readFile(file) {
  if (!file || !file.type.startsWith('image/')) { toast('Choose a photo (JPG, PNG or HEIC exported as JPG).'); return; }
  const r = new FileReader(); r.onload = () => { loadPhoto(r.result, false); toast('Photo added. Drag the pieces into place.'); }; r.readAsDataURL(file);
}
$('#photoInput').addEventListener('change', e => readFile(e.target.files[0]));
{
  const st = $('#trStage');
  st.addEventListener('dragover', e => { if (tryMode !== 'photo') return; e.preventDefault(); st.classList.add('dragover'); });
  st.addEventListener('dragleave', () => st.classList.remove('dragover'));
  st.addEventListener('drop', e => { if (tryMode !== 'photo') return; e.preventDefault(); st.classList.remove('dragover'); readFile(e.dataTransfer.files[0]); });
}
$('#saveLook').addEventListener('click', async () => {
  const blob = await new Promise(res => pc.toBlob(res, 'image/jpeg', 0.92));
  const filename = `luma-${tryId}-try-on.jpg`;
  let dl = null;
  try { dl = await window.claude?.use?.('downloads'); } catch { dl = null; }
  if (dl) {
    try { await dl.save({ filename, data: blob }); toast('Look saved'); } catch { toast('The look was not saved.'); }
    return;
  }
  const a = h('a', { href: URL.createObjectURL(blob), download: filename }); document.body.append(a); a.click(); a.remove();
});
new ResizeObserver(() => { if (tryMode === 'photo') photoLayers(false); }).observe(pc);

/* ---------- luma at home ---------- */
function addShortlist(id) {
  if (id === 'custom') {
    const spec = cfgSpec();
    state.customs = state.customs || [];
    const cid = 'custom-' + Date.now();
    PRODUCTS.push({ id: cid, name: cfgName(), house: 'LUMA Compose', city: 'Dubai', cat: 'custom', bg: 'white', spec, desc: 'Your own design, composed in 3D.' });
    id = cid; store.set('customs', PRODUCTS.filter(p => p.cat === 'custom'));
  }
  if (state.shortlist.includes(id)) { toast('Already on your home try-on list'); return; }
  if (state.shortlist.length >= 6) { toast('Your home try-on list holds six pieces. Remove one to add another.'); return; }
  state.shortlist.push(id); saveState(); renderShortlist();
  toast(`${byId(id).name} added to your home try-on`);
}
function renderShortlist() {
  const w = $('#shortlist'); w.textContent = '';
  state.shortlist = state.shortlist.filter(id => byId(id));
  state.shortlist.forEach(id => {
    const p = byId(id);
    w.append(h('div.sl', {}, h('img', { src: thumbnail(p.spec, { w: 200, hgt: 200, pad: 1.15 }), alt: '' }), h('span', { text: p.name }),
      h('button', { 'aria-label': 'Remove ' + p.name, text: '×', type: 'button', onclick: () => { state.shortlist = state.shortlist.filter(x => x !== id); saveState(); renderShortlist(); } })));
  });
  if (state.shortlist.length < 6) w.append(h('div.sl.add', {}, h('a', { href: '#edit', 'aria-label': 'Add pieces from the edit', text: '+' }), h('span', { text: 'Add pieces' })));
  $('#slCount').textContent = `${state.shortlist.length} of 6`;
}
const booking = { day: 1, slot: '18:00 – 19:00' };
const SLOTS = ['10:00 – 11:00', '12:00 – 13:00', '14:00 – 15:00', '16:00 – 17:00', '18:00 – 19:00', '20:00 – 21:00'];
function renderDays() {
  const w = $('#days'); w.textContent = '';
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    w.append(h('button.day', { type: 'button', 'aria-pressed': i === booking.day, onclick: () => { booking.day = i; renderDays(); } },
      h('small', { text: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-GB', { weekday: 'short' }) }), h('b', { text: d.getDate() }), h('small', { text: d.toLocaleDateString('en-GB', { month: 'short' }) })));
  }
  const d = new Date(now); d.setDate(now.getDate() + booking.day);
  $('#dayLabel').textContent = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const s = $('#slots'); s.textContent = '';
  const hourNow = now.getHours();
  SLOTS.forEach(t => {
    const past = booking.day === 0 && parseInt(t) <= hourNow + 2;
    s.append(h('button.slot', { type: 'button', disabled: past, style: past ? 'opacity:.35' : '', 'aria-pressed': booking.slot === t && !past, text: t, onclick: () => { booking.slot = t; renderDays(); } }));
  });
}
$('#homeForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#hName').value.trim(), phone = $('#hPhone').value.replace(/[\s-]/g, ''), area = $('#hArea').value.trim();
  const err = $('#hErr');
  if (!state.shortlist.length) return (err.textContent = 'Add at least one piece to your shortlist.');
  if (!area) { $('#hArea').focus(); return (err.textContent = 'Tell us the area, so we can send the nearest stylist.'); }
  if (!name) { $('#hName').focus(); return (err.textContent = 'Add your name.'); }
  if (!/^(\+971|00971|0)?5[024568]\d{7}$/.test(phone)) { $('#hPhone').focus(); return (err.textContent = 'Enter a UAE mobile number, for example +971 50 123 4567.'); }
  const slotFree = !(booking.day === 0 && parseInt(booking.slot) <= new Date().getHours() + 2);
  if (!slotFree) return (err.textContent = 'Choose a time at least two hours from now.');
  err.textContent = '';
  const d = new Date(); d.setDate(d.getDate() + booking.day);
  const ref = 'LM-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  $('#homeRef').textContent = ref;
  $('#homeSummary').textContent = `${state.shortlist.length} piece${state.shortlist.length > 1 ? 's' : ''} · ${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, ${booking.slot} · ${area}, ${$('#hEmirate').value}. ${$('#hStylist').value === 'Female stylist' ? 'A female stylist' : 'A stylist'} speaking ${$('#hLang').value}.`;
  $('#homeForm').hidden = true; $('#homeDone').hidden = false;
});
$('#homeAgain').addEventListener('click', () => { $('#homeForm').hidden = false; $('#homeDone').hidden = true; });

/* ---------- scroll ---------- */
function onScroll() { updateNav(); }
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
function tick(now) { marquee(now); requestAnimationFrame(tick); }

/* ---------- boot ---------- */
store.get('customs', []).forEach(p => PRODUCTS.push(p));
renderGrid(); renderBag(); renderShortlist(); renderDays();
observeReveals();
renderCfg(); cfgRebuild(true);
setupTone(); renderTones(); tonePiece(); renderPieces();
loadPhoto('sample-portrait.jpg', true);
liquid();
onScroll();
requestAnimationFrame(loop); requestAnimationFrame(tick);
(document.fonts?.ready || Promise.resolve()).then(async () => {
  await renderThumbs();
  renderPieces(); renderShortlist();
  if (cfg.engraving) cfgRebuild();
});
window.LUMA = { PRODUCTS, priceOf, hero, cfgV, viewers, thumbnail, openProduct, setMode, selectTry };
