import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';

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

/* ---------- hero: a desert at golden hour; the edit floats in, one piece at a time ---------- */
const Noise = (() => {
  const p = new Uint8Array(512); let seed = 1337;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const G = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  function n2(xin, yin) {
    const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s), t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2, ii = i & 255, jj = j & 255;
    let n = 0, q;
    if ((q = 0.5 - x0 * x0 - y0 * y0) > 0) { const g = G[p[ii + p[jj]] & 7]; q *= q; n += q * q * (g[0] * x0 + g[1] * y0); }
    if ((q = 0.5 - x1 * x1 - y1 * y1) > 0) { const g = G[p[ii + i1 + p[jj + j1]] & 7]; q *= q; n += q * q * (g[0] * x1 + g[1] * y1); }
    if ((q = 0.5 - x2 * x2 - y2 * y2) > 0) { const g = G[p[ii + 1 + p[jj + 1]] & 7]; q *= q; n += q * q * (g[0] * x2 + g[1] * y2); }
    return 70 * n;
  }
  const fbm = (x, y, o = 4) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { v += a * n2(x * f, y * f); f *= 2.03; a *= 0.5; } return v; };
  return { n2, fbm, rnd };
})();

// dunes: a quiet floor near the viewer, crested dunes rising behind
function duneH(x, z) {
  const far = smooth(-4, -70, z);
  const warp = Noise.fbm(x * 0.006, z * 0.006, 3) * 3.2 + Noise.fbm(x * 0.02 + 5, z * 0.02, 2) * 0.35;
  const u = (z * 0.026 + x * 0.006) + warp;
  const f = u - Math.floor(u);
  const prof = f < 0.74 ? Math.pow(Math.sin(f / 0.74 * Math.PI / 2), 2) : Math.pow(Math.cos((f - 0.74) / 0.26 * Math.PI / 2), 2);
  const amp = 4 + 7 * (0.5 + 0.5 * Noise.fbm(x * 0.005 + 11, z * 0.005, 2));
  const swell = Noise.fbm(x * 0.008 + 3, z * 0.008, 3);
  const near = Noise.fbm(x * 0.03, z * 0.03, 2);
  return (prof * amp + swell * 6) * far + near * 0.45 + swell * 0.9;
}

// wind ripples: a tileable normal map
function rippleNormals(size = 512) {
  const H = new Float32Array(size * size), TAU = Math.PI * 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const warp = 0.55 * Math.sin(TAU * (2 * v + 0.3)) + 0.35 * Math.sin(TAU * (3 * u + 2 * v)) + 0.2 * Math.sin(TAU * (5 * v - u));
    const ph = TAU * (22 * u + 3 * v) + warp * 2.2;
    const s = 0.5 + 0.5 * Math.sin(ph);
    H[y * size + x] = Math.pow(s, 1.8) + 0.15 * Math.sin(TAU * (60 * u + 9 * v) + warp);
  }
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x2 = c.getContext('2d'), img = x2.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const l = H[y * size + (x - 1 + size) % size], r = H[y * size + (x + 1) % size];
    const d = H[((y - 1 + size) % size) * size + x], u = H[((y + 1) % size) * size + x];
    let nx = (l - r) * 1.6, ny = (d - u) * 1.6, nz = 1; const k = Math.hypot(nx, ny, nz);
    const i = (y * size + x) * 4;
    img.data[i] = (nx / k * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / k * 0.5 + 0.5) * 255; img.data[i + 2] = (nz / k * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  x2.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function barkTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#7d6247'; x.fillRect(0, 0, 256, 512);
  for (let row = 0; row < 24; row++) {
    const y = row * 22, off = (row % 2) * 16;
    for (let k = -1; k < 9; k++) {
      const cx = k * 32 + off;
      const g = x.createLinearGradient(cx, y, cx, y + 26);
      g.addColorStop(0, '#9b7c5b'); g.addColorStop(0.55, '#6e5239'); g.addColorStop(1, '#3d2c1d');
      x.fillStyle = g;
      x.beginPath(); x.moveTo(cx - 17, y); x.quadraticCurveTo(cx, y + 30, cx + 17, y); x.lineTo(cx + 15, y + 6); x.quadraticCurveTo(cx, y + 22, cx - 15, y + 6); x.closePath(); x.fill();
    }
  }
  for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '30,20,10' : '200,170,130'},${Math.random() * 0.12})`; x.fillRect(Math.random() * 256, Math.random() * 512, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function frondTexture(dead) {
  const W = 192, Hh = 768, c = document.createElement('canvas'); c.width = W; c.height = Hh;
  const x = c.getContext('2d'), mid = W / 2;
  const greens = dead ? ['#8a6a3f', '#a07c4b', '#7a5a33', '#b08d5a'] : ['#5d7040', '#6b7d47', '#76874f', '#53663a', '#839260', '#4a5d34'];
  x.lineCap = 'round';
  const N = 96;
  for (let i = 0; i < N; i++) {
    const t = i / N, y = Hh * (1 - t) - 6;
    const len = (dead ? 70 : 88) * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)), 0.7) * (t < 0.1 ? 0.35 : 1);
    for (const side of [-1, 1]) {
      const a = (32 + Math.random() * 10) * Math.PI / 180, droop = dead ? 0.35 : 0.12;
      const ex = mid + side * Math.cos(a) * len, ey = y - Math.sin(a) * len * (1 - droop);
      x.strokeStyle = greens[(Math.random() * greens.length) | 0];
      for (let w = 4.4; w > 0.8; w -= 1.2) { // tapered leaflet in a few passes
        x.lineWidth = w; x.beginPath(); x.moveTo(mid + side * 2, y);
        x.quadraticCurveTo(mid + side * len * 0.55, y - len * 0.18, ex - side * (4.4 - w) * 2, ey + (4.4 - w) * 1.5); x.stroke();
      }
    }
  }
  x.strokeStyle = dead ? '#6b4f2c' : '#7b8a3e'; x.lineWidth = 4; x.beginPath(); x.moveTo(mid, Hh); x.lineTo(mid, 4); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function frondGeo(L, theta0, droop, W = 1.5, segs = 22) {
  const pos = [], uv = [], idx = [];
  let px = 0, py = 0, pz = 0;
  const ds = L / segs;
  for (let i = 0; i <= segs; i++) {
    const v = i / segs, th = theta0 - droop * Math.pow(v, 1.5);
    if (i) { pz += Math.cos(th) * ds; py += Math.sin(th) * ds; }
    const fold = 0.32 * (1 - v * 0.5), w = W * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, v * 1.15 + 0.05)));
    for (let j = 0; j <= 2; j++) {
      const s = (j - 1);
      pos.push(px + s * w / 2, py + Math.abs(s) * w * fold * 0.5, pz);
      uv.push(j / 2, v);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < 2; j++) {
    const a = i * 3 + j, b = a + 1, c2 = a + 3, d = a + 4;
    idx.push(a, c2, b, b, c2, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

const wind = { value: 0 };
const WIND_GLSL = `
  float wv = pow(uv.y, 1.6);
  vec3 wo = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float ph = dot(modelMatrix[2].xyz, vec3(3.1, 1.7, 2.3)) + wo.x * 0.37 + wo.z * 0.21;
  float gust = 0.55 + 0.45 * sin(uTime * 0.31 + wo.x * 0.05) * sin(uTime * 0.17 + 1.3);
  transformed.y += sin(uTime * 1.2 + ph) * 0.24 * wv * gust;
  transformed.x += sin(uTime * 0.85 + ph * 1.7) * 0.18 * wv * gust;
  transformed.y += sin(uTime * 6.5 + uv.y * 9.0 + ph) * 0.03 * wv * gust;
`;
function windy(mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = wind;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND_GLSL);
  };
  return mat;
}

function taperTube(curve, segs, radial, rfn) {
  const fr = curve.computeFrenetFrames(segs, false), pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, P = curve.getPointAt(t), r = rfn(t), N = fr.normals[i], Bn = fr.binormals[i];
    for (let k = 0; k <= radial; k++) {
      const a = k / radial * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pos.push(P.x + r * (c * N.x + s * Bn.x), P.y + r * (c * N.y + s * Bn.y), P.z + r * (c * N.z + s * Bn.z));
      uv.push(k / radial, t);
    }
  }
  for (let i = 0; i < segs; i++) for (let k = 0; k < radial; k++) {
    const a = i * (radial + 1) + k, b = a + radial + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function makePalms() {
  const bark = barkTexture();
  const trunkMat = new THREE.MeshStandardMaterial({ map: bark, bumpMap: bark, bumpScale: 4, roughness: 0.95, color: 0xf0dcc0 });
  const mk = dead => {
    const tex = frondTexture(dead);
    const m = windy(new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.92, envMapIntensity: 0.25, color: dead ? 0xcdb48c : 0xf4f4ea }));
    const d = windy(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.4 }));
    return { m, d };
  };
  const live = mk(false), dead = mk(true);
  const tiers = [
    { n: 7, g: frondGeo(4.2, 1.2, 1.25), mat: live, tilt: 0 },
    { n: 9, g: frondGeo(4.8, 0.55, 1.35), mat: live, tilt: 0 },
    { n: 8, g: frondGeo(4.6, 0.05, 1.05), mat: live, tilt: 0 },
    { n: 5, g: frondGeo(3.6, -1.0, 0.35, 1.2), mat: dead, tilt: 0 },
  ];
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x6d5236, roughness: 1 });
  const dateMat = new THREE.MeshStandardMaterial({ color: 0x9a5a1e, roughness: 0.6 });
  const dateGeo = new THREE.SphereGeometry(0.05, 8, 6);
  return function palm(x, z, H, lean, seed) {
    const g = new THREE.Group();
    let s = seed * 9301 + 49297; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.15, H * 0.35, 0), new THREE.Vector3(lean * 0.55, H * 0.72, 0), new THREE.Vector3(lean, H, 0)]);
    const trunk = new THREE.Mesh(taperTube(curve, 40, 16, t => 0.36 * (1 - 0.3 * t) + 0.22 * (1 - smooth(0, 0.07, t))), trunkMat);
    trunk.material.map.repeat.set(1, H / 2.4);
    trunk.castShadow = trunk.receiveShadow = true; g.add(trunk);
    const top = curve.getPointAt(1);
    const crown = new THREE.Group(); crown.position.copy(top); g.add(crown);
    const shaft = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), bootMat); shaft.scale.set(1, 1.3, 1); shaft.castShadow = true; crown.add(shaft);
    for (let k = 0; k < 10; k++) { // frond bases
      const b = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 6), bootMat); const a = k / 10 * Math.PI * 2;
      b.position.set(Math.cos(a) * 0.3, -0.35, Math.sin(a) * 0.3); b.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); crown.add(b);
    }
    let az = r() * 6;
    for (const tier of tiers) for (let k = 0; k < tier.n; k++) {
      az += 2.39996; // golden angle
      const f = new THREE.Mesh(tier.g, tier.mat.m); f.customDepthMaterial = tier.mat.d;
      f.rotation.set(0, az, (r() - 0.5) * 0.35); f.position.y = 0.1 + (r() - 0.5) * 0.2;
      f.scale.setScalar(0.85 + r() * 0.3);
      f.castShadow = true; crown.add(f);
    }
    for (let c = 0; c < 3; c++) { // date clusters
      const a = r() * 6.28, im = new THREE.InstancedMesh(dateGeo, dateMat, 40);
      for (let i = 0; i < 40; i++) {
        const t = i / 40; tmpO.position.set(Math.cos(a) * (0.45 + t * 0.25) + (r() - 0.5) * 0.25, -0.4 - t * 1.0, Math.sin(a) * (0.45 + t * 0.25) + (r() - 0.5) * 0.25);
        tmpO.rotation.set(0, 0, 0); tmpO.scale.set(1, 1.35, 1); tmpO.updateMatrix(); im.setMatrixAt(i, tmpO.matrix);
      }
      im.castShadow = true; crown.add(im);
    }
    g.position.set(x, duneH(x, z) - 0.25, z); g.rotation.y = r() * 6.28;
    return g;
  };
}

function makeCamel() {
  const fur = new THREE.MeshStandardMaterial({ color: 0xa88a66, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x5e4630, roughness: 1 });
  const g = new THREE.Group();
  const ell = (c, r, m = fur, rz = 0) => { const e = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), m); e.position.set(...c); e.scale.set(...r); e.rotation.z = rz; e.castShadow = true; g.add(e); return e; };
  const limb = (pts, r0, r1, parent = g, m = fur) => { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))); const t = new THREE.Mesh(taperTube(c, 16, 10, t => lerp(r0, r1, t)), m); t.castShadow = true; parent.add(t); return t; };
  ell([0, 1.78, 0], [1.2, 0.42, 0.38]);
  ell([-0.08, 2.18, 0], [0.55, 0.42, 0.3]);
  ell([0.82, 1.66, 0], [0.42, 0.42, 0.33]);
  ell([-0.82, 1.62, 0], [0.38, 0.4, 0.32]);
  for (const zz of [-0.2, 0.2]) {
    limb([[0.74, 1.55, zz], [0.8, 0.85, zz], [0.74, 0.1, zz]], 0.12, 0.06);
    limb([[-0.82, 1.45, zz], [-0.7, 0.82, zz], [-0.8, 0.1, zz]], 0.15, 0.06);
    ell([0.76, 0.06, zz], [0.15, 0.05, 0.12], dark); ell([-0.78, 0.06, zz], [0.15, 0.05, 0.12], dark);
    ell([0.79, 0.84, zz], [0.075, 0.075, 0.075]); ell([-0.71, 0.82, zz], [0.075, 0.075, 0.075]);
  }
  const neck = new THREE.Group(); neck.position.set(1.0, 1.78, 0); g.add(neck);
  limb([[0, 0, 0], [0.4, -0.16, 0], [0.7, 0.1, 0], [0.86, 0.5, 0], [0.98, 0.72, 0]], 0.17, 0.09, neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), fur); head.scale.set(0.3, 0.13, 0.12); head.position.set(1.15, 0.68, 0); head.rotation.z = -0.3; head.castShadow = true; neck.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), dark); muzzle.scale.set(0.11, 0.09, 0.1); muzzle.position.set(1.38, 0.6, 0); neck.add(muzzle);
  for (const zz of [-0.07, 0.07]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 6), fur); e.position.set(0.98, 0.82, zz); neck.add(e); }
  const tail = new THREE.Group(); tail.position.set(-1.18, 1.85, 0); g.add(tail);
  limb([[0, 0, 0], [-0.08, -0.35, 0], [-0.04, -0.7, 0]], 0.045, 0.03, tail, dark);
  g.userData = { neck, tail };
  return g;
}

function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  for (let i = 0; i < 60; i++) {
    const cx = 80 + Math.random() * 350, cy = 150 - Math.random() * 70 * Math.sin((cx - 80) / 350 * Math.PI), r = 25 + Math.random() * 55;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const HERO_SLIDES = [
  { id: 'octave', line: 'A Colombian emerald, step cut, framed in brilliants on a pavé band of yellow gold.' },
  { id: 'goutte', line: 'Pear-cut emeralds that swing from diamond studs, made in Paris.' },
  { id: 'nenuphar', line: 'A water lily of twenty teal sapphires, worn on a lapel or as a pendant.' },
  { id: 'ondine', line: 'A teal sapphire from Sri Lanka, haloed in diamonds, the colour of the Gulf at dusk.' },
  { id: 'aube', line: 'The Paris solitaire: one round brilliant raised on four fine claws.' },
];
const SLIDE_MS = 7000;

function desertHero() {
  const canvas = $('#heroCanvas');
  const mobile = matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.68;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20000);

  // sky: physical scattering, sun low ahead and to the right
  const sky = new Sky(); sky.scale.setScalar(10000); scene.add(sky);
  const su = sky.material.uniforms;
  su.turbidity.value = 2.2; su.rayleigh.value = 3.0; su.mieCoefficient.value = 0.0035; su.mieDirectionalG.value = 0.85;
  const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 21), THREE.MathUtils.degToRad(112));
  su.sunPosition.value.copy(sun);
  scene.fog = new THREE.FogExp2(0xf0d3b2, 0.0032);

  // the light jewellery sees: this sky over warm sand
  const envScene = new THREE.Scene();
  const sky2 = new Sky(); sky2.scale.setScalar(1000); Object.entries(su).forEach(([k, v]) => { sky2.material.uniforms[k].value = v.value; }); envScene.add(sky2);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(900, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd9a26b).multiplyScalar(2.2) }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -40; envScene.add(floor);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(envScene, 0.04).texture; pm.dispose();
  scene.environmentIntensity = 0.7;

  const sunLight = new THREE.DirectionalLight(0xffd6a4, 3.6);
  sunLight.position.copy(sun).multiplyScalar(120); sunLight.target.position.set(-2, 0, -20);
  sunLight.castShadow = true; sunLight.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sunLight.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 400 });
  sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.04;
  scene.add(sunLight, sunLight.target);
  scene.add(new THREE.HemisphereLight(0xa9c8e8, 0xd88f55, 0.42));

  // dunes
  const SEG = mobile ? 200 : 320;
  const tg = new THREE.PlaneGeometry(700, 700, SEG, SEG); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -250);
  const tp = tg.attributes.position, cols = [];
  const c1 = new THREE.Color(0xb8622e), c2 = new THREE.Color(0xe39456), c3 = new THREE.Color(0xf4b77e), tmpC = new THREE.Color();
  for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), z = tp.getZ(i); tp.setY(i, duneH(x, z)); }
  tg.computeVertexNormals();
  const tn = tg.attributes.normal;
  for (let i = 0; i < tp.count; i++) {
    const y = tp.getY(i), ny = tn.getY(i);
    tmpC.copy(c1).lerp(c2, clamp(0.35 + y * 0.05)).lerp(c3, clamp((ny - 0.9) * 4) * 0.4);
    tmpC.offsetHSL(0, 0, Noise.n2(tp.getX(i) * 0.05, tp.getZ(i) * 0.05) * 0.025);
    cols.push(tmpC.r, tmpC.g, tmpC.b);
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const ripples = rippleNormals(); ripples.repeat.set(170, 170); ripples.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const sand = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0, normalMap: ripples, normalScale: new THREE.Vector2(0.32, 0.32), envMapIntensity: 0.45 });
  const ground = new THREE.Mesh(tg, sand); ground.receiveShadow = true; scene.add(ground);

  // palms, a camel, clouds, drifting sand
  const palm = makePalms();
  [[15, -17, 11.5, 0.9, 1], [-17, -27, 10.5, -0.7, 2], [-25, -40, 9.2, 0.6, 3], [-12, -48, 7.8, -0.4, 4], [-33, -52, 8.6, 0.5, 5], [46, -150, 9, 0.4, 6], [60, -168, 7.5, -0.5, 7]]
    .forEach(a => scene.add(palm(...a)));
  const camel = makeCamel(); camel.scale.setScalar(1.25);
  camel.position.set(-8, duneH(-8, -30) - 0.05, -30); camel.rotation.y = 0.25; scene.add(camel);
  const cloudTex = cloudTexture(), clouds = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.5 + Math.random() * 0.3 }));
    s.material.color.setRGB(2.6, 2.5, 2.4);
    const w = 500 + Math.random() * 700; s.scale.set(w, w * 0.45, 1);
    s.position.set(-2200 + i * 650 + Math.random() * 300, 260 + Math.random() * 380, -2600 - Math.random() * 800); s.userData.v = 4 + Math.random() * 5;
    scene.add(s); clouds.push(s);
  }
  const NP = mobile ? 900 : 2200, pp = [], ps = [];
  for (let i = 0; i < NP; i++) { pp.push((Math.random() - 0.5) * 90, Math.random(), -Math.random() * 70 + 12); ps.push(Math.random()); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); pg.setAttribute('seed', new THREE.Float32BufferAttribute(ps, 1));
  const dust = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: { t: wind, px: { value: renderer.getPixelRatio() } }, transparent: true, depthWrite: false,
    vertexShader: `attribute float seed; uniform float t; uniform float px; varying float a;
      void main(){ vec3 p = position; float sp = 2.0 + seed * 3.5;
        p.x = mod(p.x + 45.0 + t * sp, 90.0) - 45.0;
        float h = 0.05 + pow(fract(seed * 7.13 + t * 0.05), 3.0) * 1.6;
        p.y = h + sin(t * 2.0 + seed * 40.0) * 0.08;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        a = (1.0 - h / 1.7) * 0.75 * smoothstep(60.0, 6.0, -mv.z);
        gl_PointSize = px * (1.6 + seed * 2.2) * (16.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float a; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(0.96, 0.82, 0.64, a * smoothstep(0.5, 0.0, d)); }`,
  }));
  dust.frustumCulled = false; scene.add(dust);

  // the jewellery
  const mats = new Mats(makeEnv(renderer, 'warm').cube);
  const stand = new THREE.Group(); scene.add(stand);
  let current = null, leaving = null, idx = 0, tStart = 0, tChange = -1, spin = 0, spinV = 0;
  const anchor = new THREE.Vector3(), tmpV1 = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpV3 = new THREE.Vector3();
  function buildSlide(i) {
    const p = byId(HERO_SLIDES[i].id), B = { mats, own: [] };
    const obj = buildPiece(B, p.spec);
    obj.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const holder = new THREE.Group(); holder.add(obj);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3(); obj.traverse(o => { if (o.isMesh || o.isInstancedMesh) box.expandByObject(o); });
    if (obj.userData.focus) box.copy(obj.userData.focus);
    const sph = box.getBoundingSphere(new THREE.Sphere());
    obj.position.sub(sph.center);
    holder.userData = { k: 0.82 / sph.radius, own: B.own, born: performance.now() / 1000, base: p.spec.type === 'ring' ? [0.25, 0] : [0, 0] };
    holder.scale.setScalar(0.001);
    if (!reduced) addSparkles({ renderer, sparkles: heroSparkles, extra: [] }, obj, 20, 1.1);
    stand.add(holder);
    return holder;
  }
  const heroSparkles = [];
  function show(i, dir = 1) {
    idx = (i + HERO_SLIDES.length) % HERO_SLIDES.length;
    if (leaving) { stand.remove(leaving); leaving.userData.own.forEach(o => o.dispose?.()); }
    leaving = current; if (leaving) leaving.userData.leftAt = performance.now() / 1000, leaving.userData.dir = dir;
    current = buildSlide(idx); current.userData.dir = dir;
    tStart = 0; spin = 0;
    heroText(idx);
  }

  // text
  const els = { eyebrow: $('#hEyebrow'), name: $('#hName'), desc: $('#hDesc'), price: $('#hPrice'), idx: $('#hIdx'), bars: $('#hBars'), text: $('#heroText') };
  $('#hTotal').textContent = String(HERO_SLIDES.length).padStart(2, '0');
  HERO_SLIDES.forEach((s, i) => els.bars.append(h('button', { 'aria-label': `Show ${byId(s.id).name}`, onclick: () => go(i) }, h('i'))));
  let textT;
  function heroText(i) {
    const s = HERO_SLIDES[i], p = byId(s.id);
    els.text.classList.add('out');
    clearTimeout(textT);
    textT = setTimeout(() => {
      els.eyebrow.textContent = `${p.house} · ${p.city}`;
      els.name.textContent = p.name;
      els.desc.textContent = s.line;
      els.price.textContent = aed(priceOf(p.spec));
      els.text.classList.remove('out');
    }, current && leaving ? 380 : 0);
    els.idx.textContent = String(i + 1).padStart(2, '0');
    [...els.bars.children].forEach((b, j) => { b.classList.toggle('on', j === i); b.classList.toggle('done', j < i); b.style.setProperty('--dur', SLIDE_MS + 'ms'); });
  }
  function go(i, dir) { show(i, dir ?? (i >= idx ? 1 : -1)); }
  $('#hPrev').addEventListener('click', () => go(idx - 1, -1));
  $('#hNext').addEventListener('click', () => go(idx + 1, 1));
  $('#hOpen').addEventListener('click', () => openProduct(HERO_SLIDES[idx].id));
  $('#hHome').addEventListener('click', () => addShortlist(HERO_SLIDES[idx].id));
  let paused = false;
  $('#heroText').addEventListener('pointerenter', () => { paused = true; $('#story').classList.add('paused'); });
  $('#heroText').addEventListener('pointerleave', () => { paused = false; $('#story').classList.remove('paused'); });

  // drag turns the piece
  let down = false, lx = 0;
  canvas.addEventListener('pointerdown', e => { down = true; lx = e.clientX; });
  addEventListener('pointermove', e => { if (!down) return; spinV = (e.clientX - lx) * 0.01; spin += spinV; lx = e.clientX; tStart += 16; });
  addEventListener('pointerup', () => { down = false; });
  // the view leans a little toward the pointer
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { look.tx = e.clientX / innerWidth - 0.5; look.ty = e.clientY / innerHeight - 0.5; });

  const ease = t => 1 - Math.pow(1 - clamp(t), 3), easeIn = t => Math.pow(clamp(t), 3);
  let elapsedPause = 0, lastNow = performance.now();
  const v = {
    canvas, renderer, visible: true,
    render(t) {
      const now = performance.now(), dtMs = now - lastNow; lastNow = now;
      const w = canvas.clientWidth, hh = canvas.clientHeight;
      const sz = renderer.getSize(new THREE.Vector2());
      if (w && hh && (sz.x !== w || sz.y !== hh)) { renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); }
      wind.value = reduced ? 0 : t;
      heroSparkles.forEach(m => { m.uniforms.t.value = t; });
      const wide = camera.aspect > 1;
      // camera: a slow drift with a little parallax
      look.x += (look.tx - look.x) * 0.03; look.y += (look.ty - look.y) * 0.03;
      const drift = reduced ? 0 : Math.sin(t * 0.045);
      if (wide) {
        camera.position.set(drift * 1.4 + look.x * 1.2, 2.5 - look.y * 0.5, 16);
        camera.lookAt(drift * 0.6 + look.x * 2.0, 4.6, -30);
      } else { // phones: turn toward the palms and the camel
        camera.position.set(-1.5 + drift * 0.6, 3.0, 16);
        camera.lookAt(-9 + drift * 0.8, 5.0, -30);
      }
      // the piece keeps its place in the frame while the desert drifts behind it
      camera.updateMatrixWorld();
      const fwd = camera.getWorldDirection(tmpV1), right = tmpV2.setFromMatrixColumn(camera.matrixWorld, 0), up = tmpV3.setFromMatrixColumn(camera.matrixWorld, 1);
      anchor.copy(camera.position).addScaledVector(fwd, 7.6).addScaledVector(right, wide ? 1.45 : 0).addScaledVector(up, wide ? -0.15 : 0.85);
      stand.position.copy(anchor);
      stand.scale.setScalar(wide ? 1 : 0.62);
      if (!down) { spinV *= 0.94; spin += spinV; }
      const nowS = now / 1000;
      if (current) {
        const u = current.userData, a = ease((nowS - u.born) / 1.3);
        current.scale.setScalar(u.k * lerp(0.2, 1, a) + 1e-4);
        current.position.y = lerp(-0.8, 0, a) + (reduced ? 0 : Math.sin(t * 0.9) * 0.06);
        current.rotation.set(u.base[0] + (reduced ? 0 : Math.sin(t * 0.5) * 0.08), (1 - a) * -2.4 * u.dir + (reduced ? 0 : t * 0.35) + spin, 0);
        current.visible = a > 0.01;
      }
      if (leaving) {
        const u = leaving.userData, a = easeIn((nowS - u.leftAt) / 0.8);
        leaving.scale.setScalar(u.k * (1 - a) + 1e-4);
        leaving.position.y = a * 0.9;
        leaving.rotation.y += 0.06 * u.dir;
        if (a >= 1) { stand.remove(leaving); u.own.forEach(o => o.dispose?.()); leaving = null; }
      }
      if (!tStart) tStart = now;
      if (paused || document.hidden || reduced) tStart += dtMs;
      if (now - tStart > SLIDE_MS) go(idx + 1, 1);
      // the camel shifts its weight; clouds drift
      const cu = camel.userData;
      cu.neck.rotation.z = Math.sin(t * 0.4) * 0.06 + Math.sin(t * 0.13) * 0.08;
      cu.tail.rotation.z = Math.sin(t * 1.7) * 0.15;
      clouds.forEach(c => { c.position.x += c.userData.v * dtMs / 1000; if (c.position.x > 2600) c.position.x = -2600; });
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
