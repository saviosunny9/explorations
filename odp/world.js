/* Open Doors Partners — hero world.
   The planet Halcyra and its ring station ("the Loom"), adapted from halcyra_standalone.html:
   the model and textures are files in media/world/, three.js r147 (the release the scene was
   built against, the last with the examples/js scripts) loads from jsDelivr after the page,
   orbit controls, music and keyboard views are gone, the final pass adds the ODP orange grade,
   and scroll speed winds up the planet and station. Without WebGL, or if anything fails to
   load, the hero keeps its still (media/world/poster.jpg). */
(() => {
  const host = document.querySelector('[data-world]');
  if (!host) return;
  const BASE = host.dataset.world;
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.147.0/';
  const LIBS = ['build/three.min.js', 'examples/js/loaders/GLTFLoader.js', 'examples/js/shaders/CopyShader.js',
    'examples/js/shaders/LuminosityHighPassShader.js', 'examples/js/postprocessing/EffectComposer.js',
    'examples/js/postprocessing/RenderPass.js', 'examples/js/postprocessing/ShaderPass.js',
    'examples/js/postprocessing/UnrealBloomPass.js'];
  const hasGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();
  if (!hasGL) { host.classList.add('is-failed'); host.dispatchEvent(new Event('world:ready')); return; }
  const load = src => new Promise((ok, no) => {
    const el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = () => no(new Error(src));
    document.head.appendChild(el);
  });
  const go = () => LIBS.reduce((p, f) => p.then(() => load(CDN + f)), Promise.resolve())
    .then(() => startWorld(host, BASE))
    .catch(err => { console.warn('[world]', err); host.classList.add('is-failed'); host.dispatchEvent(new Event('world:ready')); });
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
})();

function startWorld(host, BASE) {
  const fail = err => { console.warn('[world]', err); host.classList.add('is-failed'); host.dispatchEvent(new Event('world:ready')); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // Scene constants carried over from the Blender build (scene units, Y-up).
  const R = 100, RS = 112, H = 0.80, H2 = 2.4, DENS = 0.085, DENS2 = 0.006;
  const SUN = new THREE.Vector3(0.2996, 0.9488, -0.0999).normalize();   // Blender (0.30, 0.10, 0.95)

  const EXPOSURE = 0.8;
  const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, matchMedia('(max-width: 760px)').matches ? 1.25 : 1.5));
  renderer.setClearColor(0x020306, 1);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  // HDR pipeline: scene -> bloom -> ACES tone map + sRGB in a final pass. Falls back to
  // the renderer's own tone mapping if the post-processing scripts fail to load.
  const POST = !!(THREE.EffectComposer && THREE.UnrealBloomPass && THREE.ShaderPass);
  if (POST) {
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputEncoding = THREE.LinearEncoding;
  } else {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = EXPOSURE;
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(25, 16 / 9, 0.02, 6000);
  let composer = null, bloom = null;
  const flareScene = new THREE.Scene();
  const flareCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  if (POST) {
    composer = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
    composer.addPass(new THREE.RenderPass(scene, camera));
    const flarePass = new THREE.RenderPass(flareScene, flareCam);
    flarePass.clear = false;
    composer.addPass(flarePass);
    bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.38, 0.22, 1.0);
    composer.addPass(bloom);
    composer.addPass(new THREE.ShaderPass({
      uniforms: { tDiffuse: { value: null }, uExposure: { value: EXPOSURE }, uWarm: { value: 0.82 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float uExposure; uniform float uWarm; varying vec2 vUv;
        vec3 fit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
        vec3 aces(vec3 c) {
          const mat3 inM = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
          const mat3 outM = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
          c = outM * fit(inM * (c * uExposure / 0.6));
          return clamp(c, 0.0, 1.0);
        }
        vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
        // ODP grade: luminance mapped through espresso -> rust -> signal orange -> peach -> warm white
        vec3 ramp(float l) {
          vec3 c = mix(vec3(0.030, 0.016, 0.013), vec3(0.290, 0.080, 0.045), smoothstep(0.00, 0.22, l));
          c = mix(c, vec3(0.878, 0.392, 0.227), smoothstep(0.18, 0.55, l));
          c = mix(c, vec3(0.960, 0.765, 0.627), smoothstep(0.50, 0.82, l));
          return mix(c, vec3(1.0, 0.972, 0.945), smoothstep(0.80, 1.00, l));
        }
        void main() {
          vec3 c = srgb(aces(texture2D(tDiffuse, vUv).rgb));
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          gl_FragColor = vec4(mix(c, ramp(l), uWarm), 1.0);
        }`
    }));
  }
  const controls = { target: new THREE.Vector3(), update() { camera.lookAt(this.target); } };

  // Lighting: one hard sun; a faint cool fill so the hardware keeps its form.
  const sun = new THREE.DirectionalLight(0xfffbf4, 1.6);
  sun.position.copy(SUN).multiplyScalar(1000);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x8ea4c8, 0.11));

  // Stars: sparse, dim and varied.
  (() => {
    let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const n = 7000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      pos.set([r * Math.cos(t) * 4000, u * 4000, r * Math.sin(t) * 4000], i * 3);
      const b = Math.pow(rnd(), 6) * 0.9 + 0.06, warm = rnd();
      col.set([b * (0.78 + 0.22 * warm), b * (0.84 + 0.06 * warm), b * (1.0 - 0.25 * warm)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, toneMapped: false, depthWrite: false });
    scene.add(new THREE.Points(g, m));
  })();

  // ---------------------------------------------------------------- sky
  // Milky Way: a faint galactic band with star clouds, a warmer bulge and dark dust lanes.
  const GAL_N = new THREE.Vector3(0.32, -0.42, 0.85).normalize();      // galactic pole
  const GAL_C = new THREE.Vector3(0.88, 0.47, 0.0).normalize();         // toward the bulge (in the plane)
  GAL_C.sub(GAL_N.clone().multiplyScalar(GAL_C.dot(GAL_N))).normalize();
  const NOISE_GLSL = `
    float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vnoise(vec3 x) {
      vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`;
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
    uniforms: { uN: { value: GAL_N }, uC: { value: GAL_C } },
    vertexShader: `varying vec3 vDir;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `uniform vec3 uN; uniform vec3 uC; varying vec3 vDir;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      ${NOISE_GLSL}
      void main() {
        #include <logdepthbuf_fragment>
        vec3 d = normalize(vDir);
        float lat = dot(d, uN);
        float warp = (fbm(d * 3.0) - 0.5) * 0.10;
        float band = exp(-pow((lat + warp) / 0.13, 2.0));
        float core = exp(-pow((lat + warp) / 0.05, 2.0));
        float bulge = pow(max(dot(d, uC), 0.0), 6.0);
        float clouds = smoothstep(0.35, 0.85, fbm(d * 7.0 + 3.1));
        float fine = fbm(d * 26.0);
        float dust = smoothstep(0.42, 0.72, fbm(d * 11.0 + 7.7)) * core;
        float lum = band * (0.25 + 0.75 * clouds) * (0.6 + 0.6 * fine) + bulge * band * 1.6;
        lum *= 1.0 - 0.85 * dust;
        vec3 col = mix(vec3(0.62, 0.70, 0.95), vec3(0.98, 0.90, 0.78), clamp(bulge * 1.4 + core * 0.3, 0.0, 1.0));
        gl_FragColor = vec4(col * lum * 0.024, 1.0);
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5200, 64, 32), skyMat);
  sky.renderOrder = -2;
  scene.add(sky);

  // Extra stars concentrated along the galactic band.
  (() => {
    let s = 91;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const pos = [], col = [];
    while (pos.length < 6000 * 3) {
      const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const d = new THREE.Vector3(r * Math.cos(t), u, r * Math.sin(t));
      const lat = d.dot(GAL_N);
      if (rnd() > Math.exp(-Math.pow(lat / 0.11, 2))) continue;
      d.multiplyScalar(4100);
      pos.push(d.x, d.y, d.z);
      const b = Math.pow(rnd(), 7) * 0.7 + 0.04, warm = rnd();
      col.push(b * (0.8 + 0.2 * warm), b * (0.84 + 0.08 * warm), b * (1.0 - 0.22 * warm));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.2, sizeAttenuation: false, vertexColors: true,
      toneMapped: false, depthWrite: false })));
  })();

  // ---------------------------------------------------------------- the Sun
  // A G-type disc at its true angular size (~0.53 deg), limb-darkened, with a corona glow.
  // It sits exactly along the key light's direction and is occluded by the planet naturally.
  const SUN_DIST = 3000, SUN_R = SUN_DIST * Math.tan(THREE.MathUtils.degToRad(0.265));
  const sunPos = SUN.clone().multiplyScalar(SUN_DIST);
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 48, 24), new THREE.ShaderMaterial({
    toneMapped: false,
    vertexShader: `varying vec3 vN; varying vec3 vV;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main() {
        #include <logdepthbuf_fragment>
        float mu = clamp(dot(vN, vV), 0.0, 1.0);
        float limb = 1.0 - 0.6 * (1.0 - mu) - 0.2 * (1.0 - mu) * (1.0 - mu);   // solar limb darkening
        gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * 90.0 * limb, 1.0);
      }`
  }));
  sunDisc.position.copy(sunPos);
  scene.add(sunDisc);

  function radialTexture(stops, size = 256) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([p, col]) => gr.addColorStop(p, col));
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(255,250,235,1)'], [0.06, 'rgba(255,240,215,0.85)'], [0.18, 'rgba(255,225,190,0.28)'],
                        [0.45, 'rgba(200,215,255,0.06)'], [1, 'rgba(0,0,0,0)']]),
    color: new THREE.Color(5.0, 4.6, 4.0), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
  corona.scale.set(SUN_R * 26, SUN_R * 26, 1);
  corona.position.copy(sunPos);
  scene.add(corona);

  // Lens flare in screen space: a six-blade diffraction starburst plus faint ghosts on the flare axis.
  function starburstTexture() {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'); g.translate(S / 2, S / 2); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 6; k++) {
      g.save(); g.rotate(k * Math.PI / 6 + 0.26);
      const gr = g.createLinearGradient(-S / 2, 0, S / 2, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.42, 'rgba(255,248,235,0.06)'); gr.addColorStop(0.5, 'rgba(255,248,235,0.5)');
      gr.addColorStop(0.58, 'rgba(255,248,235,0.06)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.filter = 'blur(1.2px)'; g.fillRect(-S / 2, -1.5, S, 3); g.restore();
    }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  const burst = new THREE.Sprite(new THREE.SpriteMaterial({ map: starburstTexture(), color: new THREE.Color(1.1, 1.05, 0.95),
    blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  flareScene.add(burst);
  const ghostTex = radialTexture([[0, 'rgba(255,255,255,0.0)'], [0.55, 'rgba(255,255,255,0.10)'], [0.82, 'rgba(255,255,255,0.45)'],
                                  [0.9, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']], 128);
  const GHOSTS = [[0.35, 0.035, [0.5, 0.9, 1.0]], [0.62, 0.07, [0.6, 1.0, 0.7]], [0.95, 0.045, [1.0, 0.7, 0.5]],
                  [1.25, 0.10, [0.55, 0.65, 1.0]], [1.6, 0.03, [1.0, 0.85, 0.6]]];
  const ghosts = GHOSTS.map(([t, size, rgb]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ghostTex, color: new THREE.Color(...rgb).multiplyScalar(0.07),
      blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    sp.userData = { t, size }; flareScene.add(sp); return sp;
  });
  const _sp = new THREE.Vector3();
  function sunVisibility() {
    // Fraction of the disc visible past the planet (with a soft band for the atmosphere).
    const c = camera.position, tca = -c.dot(SUN);
    if (tca < 0) return 1;
    const d = c.clone().add(SUN.clone().multiplyScalar(tca)).length();
    return THREE.MathUtils.smoothstep(d, R + 0.4, R + 3.5);
  }
  function updateFlare() {
    _sp.copy(sunPos).project(camera);
    const behind = _sp.z > 1 || camera.getWorldDirection(new THREE.Vector3()).dot(SUN) < 0;
    const edge = 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(_sp.x), Math.abs(_sp.y)), 0.9, 1.35);
    const vis = behind ? 0 : sunVisibility() * edge;
    const a = camera.aspect;
    burst.visible = vis > 0.001;
    burst.position.set(_sp.x * a, _sp.y, 0);
    burst.scale.set(0.42, 0.42, 1);
    burst.material.opacity = vis;
    ghosts.forEach(g => {
      g.visible = vis > 0.001;
      const t = g.userData.t;
      g.position.set(_sp.x * a * (1 - 2 * t), _sp.y * (1 - 2 * t), 0);
      g.scale.set(g.userData.size * 2, g.userData.size * 2, 1);
      g.material.opacity = vis;
    });
  }

  // ---------------------------------------------------------------- particles
  // Interplanetary dust around the viewer: sunlit grains that forward-scatter
  // (bright when you look toward the Sun) and vanish in the planet's shadow.
  const DUST_BOX = 70;
  const dust = (() => {
    const n = 900, pos = new Float32Array(n * 3), sz = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos.set([Math.random(), Math.random(), Math.random()], i * 3); sz[i] = 0.5 + Math.pow(Math.random(), 3) * 2.5; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { uCam: { value: new THREE.Vector3() }, uSun: { value: SUN }, uBox: { value: DUST_BOX }, uTime: { value: 0 },
                  uScale: { value: 1 } },
      vertexShader: `uniform vec3 uCam; uniform vec3 uSun; uniform float uBox; uniform float uTime; uniform float uScale;
        attribute float aSize; varying float vB;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main() {
          vec3 p = position * uBox + vec3(uTime * 0.15, uTime * 0.05, -uTime * 0.08);
          vec3 w = uCam + mod(p - uCam, uBox) - 0.5 * uBox;
          vec3 v = normalize(w - uCam);
          float c = dot(v, uSun), g = 0.8;
          float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * c, 1.5);
          float along = dot(w, uSun);
          float shadow = (along < 0.0 && length(w - uSun * along) < ${R.toFixed(1)}) ? 0.0 : 1.0;
          float dist = length(w - uCam);
          float fade = smoothstep(1.0, 5.0, dist) * (1.0 - smoothstep(uBox * 0.3, uBox * 0.5, dist));
          vB = (0.03 + 0.05 * hg) * shadow * fade;
          vec4 mv = viewMatrix * vec4(w, 1.0);
          gl_PointSize = clamp(aSize * uScale * 60.0 / -mv.z, 1.0, 6.0);
          gl_Position = projectionMatrix * mv;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `varying float vB;
        #include <common>
        #include <logdepthbuf_pars_fragment>
        void main() {
          #include <logdepthbuf_fragment>
          float r = length(gl_PointCoord - 0.5) * 2.0;
          float k = exp(-r * r * 4.0);
          gl_FragColor = vec4(vec3(1.0, 0.93, 0.82) * vB * k, 1.0);
        }`
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    scene.add(pts);
    return m;
  })();

  // A sparse ring of tumbling rock and ice fragments in high orbit: matte basalt with
  // regolith variation, lit only by the Sun and the faint ambient term.
  const rocks = (() => {
    const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
    const vnoise = (x, y, z) => {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
      const L = (a, b, t) => a + (b - a) * t;
      return L(L(L(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), L(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
               L(L(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), L(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
    };
    const list = [];
    const group = new THREE.Group();
    for (let k = 0; k < 11; k++) {
      const geo = new THREE.IcosahedronGeometry(1, 5);
      const p = geo.attributes.position, col = new Float32Array(p.count * 3), seed = k * 9.13;
      const stretch = [0.7 + Math.random() * 0.6, 0.6 + Math.random() * 0.5, 0.8 + Math.random() * 0.5];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        let n = 0, a = 0.5, f = 1.6;
        for (let o = 0; o < 5; o++) { n += a * vnoise(x * f + seed, y * f, z * f - seed); a *= 0.5; f *= 2.1; }
        const crater = Math.max(0, 0.55 - vnoise(x * 3 + seed, y * 3, z * 3)) * 0.35;
        const r = 0.72 + 0.55 * n - crater;
        p.setXYZ(i, x * r * stretch[0], y * r * stretch[1], z * r * stretch[2]);
        const tone = 0.07 + 0.06 * vnoise(x * 6 + seed, y * 6, z * 6) + (n > 0.62 ? 0.05 : 0);
        col.set([tone * 1.05, tone, tone * 0.93], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0.0 }));
      const ang = (k / 11) * Math.PI * 2 + Math.random() * 0.4, rad = 175 + Math.random() * 90, h = -10 + Math.random() * 70;
      const sc = 0.5 + Math.pow(Math.random(), 2) * 2.4;
      mesh.scale.setScalar(sc);
      mesh.userData = { ang, rad, h, w: 0.0016 + Math.random() * 0.0012,
                        spin: new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(),
                        spinRate: 0.05 + Math.random() * 0.15 };
      group.add(mesh); list.push(mesh);
    }
    group.rotation.set(0.35, 0.0, -0.22);
    scene.add(group);
    return list;
  })();
  function updateRocks(dt) {
    rocks.forEach(m => {
      const u = m.userData;
      u.ang += dt * u.w;
      m.position.set(Math.cos(u.ang) * u.rad, u.h, Math.sin(u.ang) * u.rad);
      m.rotateOnAxis(u.spin, dt * u.spinRate);
    });
  }

  // Atmosphere: the same Chapman-column single-scattering model as the Blender shader.
  const atmoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: { uSun: { value: SUN } },
    vertexShader: `
      varying vec3 vWorld;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uSun;
      varying vec3 vWorld;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      const float R = ${R.toFixed(1)}, RS = ${RS.toFixed(1)}, H = ${H}, H2 = ${H2}, D1 = ${DENS}, D2 = ${DENS2};
      float hitsG; float altG; float muG;
      float column(float Hs, float d) {
        float lg = sqrt(2.0 * PI * R * Hs);
        float cap = mix(lg, 0.5 * lg, hitsG);
        float cl = min(cap, Hs / max(muG, 1e-4));
        return exp(-altG / Hs) * cl * d;
      }
      void main() {
        #include <logdepthbuf_fragment>
        vec3 N = normalize(vWorld);
        vec3 V = normalize(cameraPosition - vWorld);
        muG = abs(dot(N, V));
        float rmin = RS * sqrt(max(1.0 - muG * muG, 0.0));
        altG = max(rmin - R, 0.0);
        hitsG = rmin < R ? 1.0 : 0.0;
        float tauLow = column(H, D1);
        float edge = 1.0 - smoothstep((RS - R) * 0.55, (RS - R) * 0.92, altG);
        float tau = (tauLow + column(H2, D2)) * edge;
        vec3 beta = vec3(0.19, 0.46, 1.0);
        vec3 scat = 1.0 - exp(-beta * tau);
        float ns = dot(N, uSun);
        float lit = smoothstep(-0.11, 0.10, ns);
        float lgLow = sqrt(2.0 * PI * R * H);
        vec3 sunT = exp(-beta * min(lgLow, H / max(ns, 1e-3)) * D1 * 0.9);
        float c = -dot(V, uSun);
        float ray = 0.75 * (1.0 + c * c);
        float g = 0.72;
        float mie = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * c, 1.5);
        float mieAmt = (1.0 - exp(-tauLow * 0.35)) * mie * 0.16;
        vec3 rad = (scat * ray + mieAmt) * sunT;
        rad *= lit * mix(1.0, 0.30, hitsG) * 4.2;
        float ag = exp(-pow((altG - 1.05) / 0.22, 2.0)) * (1.0 - hitsG) * (1.0 - lit) * 0.035;
        rad += vec3(0.30, 0.78, 0.55) * ag;
        gl_FragColor = vec4(rad, 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(RS, 160, 80), atmoMat);
  atmo.renderOrder = 2;
  scene.add(atmo);

  const sunView = new THREE.Vector3();
  const views = {};
  let planetMesh = null, cloudMesh = null, spin = true, orbiting = true;
  let rig = null, rigParts = null, follow = false;
  const orbit = { theta: -0.035, omega: 0.011, spin: 0 };
  const PLANET_START_ROT = 3.0;      // turn of the globe in the default horizon view

  const texLoader = new THREE.TextureLoader();
  const loadTex = (url, srgb) => new Promise((ok, fail) => texLoader.load(url, t => {
    t.flipY = false;                                     // glTF UV convention
    t.encoding = srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    ok(t);
  }, undefined, fail));
  // The model ships as base64 text (the host serves .txt, not .glb); decode and parse it here.
  const loadGlb = url => fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.arrayBuffer(); })
    .then(buf => new Promise((ok, no) => new THREE.GLTFLoader().parse(buf, '', ok, no)));

  Promise.all([loadGlb(BASE + 'halcyra.glb'), loadTex(BASE + 'albedo.jpg', true), loadTex(BASE + 'clouds.jpg'),
               loadTex(BASE + 'night.jpg'), loadTex(BASE + 'rough.jpg')])
  .then(([gltf, albedo, clouds, night, rough]) => {
    const root = gltf.scene;
    scene.add(root);
    root.updateMatrixWorld(true);
    const loomBox = new THREE.Box3();
    root.traverse(o => {
      if (!o.isMesh) return;
      if (o.name.startsWith('Halcyra_Planet')) planetMesh = o;
      else if (o.name.startsWith('Halcyra_Clouds')) cloudMesh = o;
      else loomBox.expandByObject(o);
    });

    const pm = new THREE.MeshStandardMaterial({ map: albedo, roughnessMap: rough, roughness: 1.0, metalness: 0.0,
      emissiveMap: night, emissive: new THREE.Color(1.0, 0.62, 0.32), emissiveIntensity: 3.0 });
    pm.onBeforeCompile = sh => {
      sh.uniforms.uSunView = { value: sunView };
      sh.uniforms.uClouds = { value: clouds };
      sh.fragmentShader = 'uniform vec3 uSunView;\nuniform sampler2D uClouds;\n' + sh.fragmentShader
        .replace('#include <map_fragment>',
          '#include <map_fragment>\n  diffuseColor.rgb *= 1.0 - 0.35 * texture2D(uClouds, vUv).g;')
        .replace('#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n  totalEmissiveRadiance *= smoothstep(0.03, -0.10, dot(normalize(vNormal), uSunView));');
    };
    planetMesh.material = pm;
    cloudMesh.material = new THREE.MeshStandardMaterial({ color: 0xe4e6ea, alphaMap: clouds, transparent: true,
      depthWrite: false, roughness: 1.0, metalness: 0.0 });
    cloudMesh.renderOrder = 1;
    planetMesh.rotateY(PLANET_START_ROT);
    cloudMesh.rotateY(PLANET_START_ROT);
    buildLoom(root);

    // Hero camera straight from the Blender export; keep its horizontal field of view.
    const cam = gltf.cameras[0];
    cam.updateMatrixWorld(true);
    const heroPos = new THREE.Vector3(), heroQuat = new THREE.Quaternion();
    cam.getWorldPosition(heroPos);
    cam.getWorldQuaternion(heroQuat);
    const hFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * (16 / 9));
    camera.userData.hFov = hFov;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(heroQuat);
    views.hero = { pos: heroPos.clone(), target: heroPos.clone().add(fwd.multiplyScalar(heroPos.length())) };
    views.planet = { pos: new THREE.Vector3(0, 120, 330), target: new THREE.Vector3() };
    views.loom = { dynamic: loomView };
    // Default: the horizon view chosen from the viewer (planet only, night side at lower left).
    views.horizon = { pos: new THREE.Vector3(-243.5, -13.9, 138.7), target: new THREE.Vector3(0, 88, 9.23) };
    setView('horizon', true);
    resize();
    setupOrbit();
    updateEnv();
    homeTheta = orbit.theta;
    if (reduce.matches) { frame(performance.now()); frame(performance.now() + 16); }
    else watchVisibility();
    requestAnimationFrame(() => { host.classList.add('is-ready'); host.dispatchEvent(new Event('world:ready')); });
  })
  .catch(fail);

  // ---------------------------------------------------------------- the Loom
  // The baked hardware is re-rigged under one group so it can orbit and spin, then
  // dressed with real-time parts: a reactor core, a counter-rotating light ring and
  // an ion drive. Rig-local units are metres (the wheel is about 230 m across).
  const RIG_SCALE = 2.4;
  const loomMats = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  function glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(170,225,255,0.55)');
    gr.addColorStop(0.6, 'rgba(80,160,255,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function buildLoom(root) {
    const meshes = [];
    root.traverse(o => { if (o.isMesh && !o.name.startsWith('Halcyra_')) meshes.push(o); });
    const p0 = V(), q0 = new THREE.Quaternion(), s0 = V();
    meshes[0].matrixWorld.decompose(p0, q0, s0);
    rig = new THREE.Group();
    scene.add(rig);
    rig.position.copy(p0); rig.quaternion.copy(q0); rig.scale.copy(s0);
    rig.updateMatrixWorld(true);
    meshes.forEach(m => rig.attach(m));
    rig.userData.baseScale = s0.x;

    // Physically based upgrades of the exported materials.
    const done = new Map();
    const upgrade = (m, mesh) => {
      const key = m.uuid + (mesh.name.startsWith('Loom_Tension') ? 'c' : '');
      if (done.has(key)) return done.get(key);
      const nm = m.name || '';
      let n;
      if (/MLI/.test(nm)) n = new THREE.MeshPhysicalMaterial({ color: m.color, metalness: 1, roughness: 0.3, clearcoat: 0.25, clearcoatRoughness: 0.25 });
      else if (/Membrane/.test(nm)) n = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.045, 0.055, 0.10), metalness: 0.6,
        roughness: 0.2, iridescence: 1.0, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520], side: THREE.DoubleSide });
      else if (/Glass/.test(nm)) n = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.02, 0.03, 0.04), metalness: 0,
        roughness: 0.03, clearcoat: 1, emissive: new THREE.Color(0.3, 0.8, 1.0), emissiveIntensity: 1.6 });
      else if (/Nav_Light/.test(nm)) { n = m.clone(); n.emissive = new THREE.Color(1.0, 0.9, 0.8); n.userData.pulse = 1; }
      else if (mesh.name.startsWith('Loom_Tension')) { n = m.clone(); n.emissive = new THREE.Color(0.25, 0.65, 1.0); n.emissiveIntensity = 0.22; n.userData.flow = 1; }
      else n = m.clone();
      n.envMapIntensity = 1.0;
      done.set(key, n); loomMats.push(n);
      return n;
    };
    meshes.forEach(o => { o.material = upgrade(o.material, o); });

    const titanium = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.42, 0.405, 0.385), metalness: 1, roughness: 0.36 });
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.05, 0.05, 0.055), metalness: 0.4, roughness: 0.45 });
    loomMats.push(titanium, dark);
    const parts = {};

    // Reactor core: a hot plasma torus held between two containment rings.
    const core = new THREE.Group();
    const plasmaMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 4.0, 6.0), toneMapped: false });
    const plasma = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.85, 24, 128), plasmaMat);
    plasma.rotation.x = Math.PI / 2;
    core.add(plasma);
    [-1.9, 1.9].forEach(y => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(8.4, 0.45, 16, 128), titanium);
      ring.rotation.x = Math.PI / 2; ring.position.y = y; core.add(ring);
    });
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2, strut = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.2, 0.5), titanium);
      strut.position.set(Math.cos(a) * 8.4, 0, Math.sin(a) * 8.4); core.add(strut);
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(0.5, 0.8, 1.0),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, toneMapped: false }));
    halo.scale.set(46, 46, 1);
    core.add(halo);
    const coreLight = new THREE.PointLight(0x8fd8ff, 2.2, 3.2, 1.6);
    core.add(coreLight);
    rig.add(core);
    parts.plasmaMat = plasmaMat; parts.halo = halo; parts.coreLight = coreLight;

    // Counter-rotating outer ring with light pods.
    const outer = new THREE.Group();
    const band = new THREE.Mesh(new THREE.TorusGeometry(121, 0.6, 10, 360), titanium);
    band.rotation.x = Math.PI / 2; outer.add(band);
    const podGeo = new THREE.BoxGeometry(2.6, 1.3, 1.3);
    const podMats = [new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 3.2, 5.0), toneMapped: false }),
                     new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 3.6, 3.0), toneMapped: false })];
    for (let k = 0; k < 36; k++) {
      const a = k / 36 * Math.PI * 2, pod = new THREE.Mesh(podGeo, podMats[k % 3 === 0 ? 1 : 0]);
      pod.position.set(Math.cos(a) * 121, 0, Math.sin(a) * 121); pod.rotation.y = -a; outer.add(pod);
      const housing = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 2.0), dark);
      housing.position.set(Math.cos(a) * 121, 0.95, Math.sin(a) * 121); housing.rotation.y = -a; outer.add(housing);
    }
    rig.add(outer);
    parts.outer = outer; parts.podMats = podMats;

    // Ion drive under the radiator crown: nozzle bell plus an additive exhaust plume.
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 3.8, 6, 32, 1, true), dark);
    nozzle.position.y = -47; nozzle.material.side = THREE.DoubleSide; rig.add(nozzle);
    const plumeMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        #include <common>
        #include <logdepthbuf_pars_fragment>
        void main() {
          #include <logdepthbuf_fragment>
          float along = vUv.y;                                   // 1 at the nozzle, 0 at the tip
          float edge = pow(abs(dot(vN, vV)), 1.5);
          float flick = 0.85 + 0.15 * sin(uTime * 23.0 + along * 40.0);
          float k = pow(along, 2.2) * edge * flick;
          gl_FragColor = vec4(vec3(0.55, 0.85, 1.6) * k * 3.0, 1.0);
        }`
    });
    const plume = new THREE.Mesh(new THREE.ConeGeometry(3.4, 48, 48, 1, true), plumeMat);
    plume.rotation.x = Math.PI; plume.position.y = -50 - 24; rig.add(plume);
    parts.plumeMat = plumeMat;

    rigParts = parts;
    rig.scale.multiplyScalar(RIG_SCALE);
  }

  function setupOrbit() {
    // Place the orbit so the Loom crosses the default view above the horizon,
    // moving left to right, and later swings behind the planet.
    const cam = camera.clone();
    cam.position.copy(views.horizon.pos); cam.lookAt(views.horizon.target);
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const dir = V(-0.12, 1 - 2 * 0.24, 0.5).unproject(cam).sub(cam.position).normalize();
    const P = cam.position.clone().add(dir.multiplyScalar(95));
    orbit.r = P.length();
    orbit.u = P.clone().normalize();
    const right = V(1, 0, 0).applyQuaternion(cam.quaternion);
    orbit.w = right.sub(orbit.u.clone().multiplyScalar(right.dot(orbit.u))).normalize();
    orbit.n = V().crossVectors(orbit.u, orbit.w).normalize();
    if (orbit.n.dot(cam.position.clone().sub(P)) < 0) orbit.n.negate();
    // A spinning wheel this size is gyroscopically stable, so its axis stays fixed in
    // space while it orbits. Fix it roughly toward the default viewpoint, tilted so the
    // disc reads as a generous ellipse.
    const toCam = cam.position.clone().sub(P).normalize();
    const up = V(0, 1, 0).applyQuaternion(cam.quaternion);
    orbit.axis = toCam.multiplyScalar(Math.cos(0.75)).add(up.multiplyScalar(Math.sin(0.75) * 0.85))
      .add(right.clone().multiplyScalar(0.22)).normalize();
    orbit.X = V(1, 0, 0).applyQuaternion(cam.quaternion);
    orbit.X.sub(orbit.axis.clone().multiplyScalar(orbit.X.dot(orbit.axis))).normalize();
    orbit.Z = V().crossVectors(orbit.X, orbit.axis);
    placeRig(0);
  }

  const _q = new THREE.Quaternion(), _qs = new THREE.Quaternion(), _m = new THREE.Matrix4();
  function placeRig(dt) {
    if (!rig || !orbit.u) return;
    if (orbiting) orbit.theta += dt * orbit.omega;
    orbit.spin += dt * 0.045;
    const c = Math.cos(orbit.theta), s = Math.sin(orbit.theta);
    const pos = orbit.u.clone().multiplyScalar(c).add(orbit.w.clone().multiplyScalar(s)).multiplyScalar(orbit.r);
    _q.setFromRotationMatrix(_m.makeBasis(orbit.X, orbit.axis, orbit.Z));
    _qs.setFromAxisAngle(V(0, 1, 0), orbit.spin);
    const before = rig.position.clone();
    rig.position.copy(pos);
    rig.quaternion.copy(_q).multiply(_qs);
    if (follow) { const d = rig.position.clone().sub(before); camera.position.add(d); controls.target.add(d); }
  }

  function loomView() {
    const size = 230 * rig.userData.baseScale * RIG_SCALE;
    const radial = rig.position.clone().normalize();
    const off = orbit.axis.clone().multiplyScalar(0.85).add(radial.multiplyScalar(0.3)).add(orbit.w.clone().multiplyScalar(-0.3))
      .normalize().multiplyScalar(size * 2.2);
    return { pos: rig.position.clone().add(off), target: rig.position.clone() };
  }

  // Environment reflections: a cube capture of the real scene from the Loom's position.
  let cubeRT, cubeCam, pmrem, envRT = null;
  function updateEnv() {
    if (!rig) return;
    if (!cubeCam) {
      cubeRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
      cubeCam = new THREE.CubeCamera(0.5, 6000, cubeRT);
      pmrem = new THREE.PMREMGenerator(renderer);
    }
    rig.visible = false;
    cubeCam.position.copy(rig.position);
    cubeCam.update(renderer, scene);
    rig.visible = true;
    const next = pmrem.fromCubemap(cubeRT.texture);
    const first = !envRT;
    loomMats.forEach(m => { m.envMap = next.texture; if (first) m.needsUpdate = true; });
    if (envRT) envRT.dispose();
    envRT = next;
  }

  // ---------------------------------------------------------------- views
  let tween = null;
  function setView(name, instant) {
    let v = views[name];
    if (!v) return;
    if (v.dynamic) v = v.dynamic();
    follow = name === 'loom';
    if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(v.pos); controls.target.copy(v.target); controls.update(); return;
    }
    tween = { t: 0, p0: camera.position.clone(), q0: controls.target.clone(), v, name };
  }
  function resize() {
    const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight, a = w / h;
    renderer.setSize(w, h, false);
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
    flareCam.left = -a; flareCam.right = a; flareCam.updateProjectionMatrix();
    dust.uniforms.uScale.value = h / 900;
    camera.aspect = a;
    const hFov = camera.userData.hFov || THREE.MathUtils.degToRad(28.8);
    // Keep the hero's horizontal framing on wide screens; on tall screens hold the 16:9 vertical FOV.
    const vFov = a >= 16 / 9 ? 2 * Math.atan(Math.tan(hFov / 2) / a) : 2 * Math.atan(Math.tan(hFov / 2) / (16 / 9));
    camera.fov = THREE.MathUtils.radToDeg(vFov);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(() => { resize(); if (reduce.matches && planetMesh) frame(performance.now()); }).observe(host);

  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let last = performance.now(), envClock = 0, time = 0;

  // Scroll drives the speed: everything drifts slowly, and scrolling winds it up
  // (planet, clouds, the station's orbit and its wheel), easing back once the page rests.
  let boost = 0, lastY = scrollY, homeTheta = 0, running = false, paused = false;
  // the hero's pause button calls this
  host.setPaused = p => {
    paused = p;
    if (p) renderer.setAnimationLoop(null);
    else if (running) { last = performance.now(); renderer.setAnimationLoop(frame); }
  };
  const BASE_SPIN = 0.012;
  function watchVisibility() {
    const io = new IntersectionObserver(([e]) => {
      const on = e.isIntersecting && !document.hidden;
      if (on === running) return;
      running = on;
      if (on) {
        // the station never wanders off for good: if it has left the frame, bring it back round
        if (orbit.theta > homeTheta + 0.32) orbit.theta = homeTheta - 0.06;
        last = performance.now(); lastY = scrollY;
        if (!paused) renderer.setAnimationLoop(frame);
      } else renderer.setAnimationLoop(null);
    });
    io.observe(host);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { running = false; renderer.setAnimationLoop(null); }
      else { io.unobserve(host); io.observe(host); }
    });
  }

  function frame(now) {
    const raw = Math.max(0, (now - last) / 1000), real = Math.min(0.05, raw); last = now;
    const y = scrollY, vel = Math.abs(y - lastY) / Math.max(real, 1 / 120); lastY = y;
    const want = reduce.matches ? 0 : Math.min(1, vel / 1400);
    boost += (want - boost) * Math.min(1, real * (want > boost ? 6 : 1.4));
    const dt = real * (1 + 9 * boost);
    time += real;
    // drift toward the planet a touch as the hero scrolls away
    const hp = Math.min(1, Math.max(0, scrollY / (host.clientHeight || innerHeight)));
    if (!tween && views.horizon) {
      camera.position.copy(views.horizon.pos).lerp(views.horizon.target, hp * 0.12);
      controls.target.copy(views.horizon.target);
    }
    const wasFollowing = follow;
    if (tween) follow = false;                    // the tween itself tracks the moving target
    placeRig(dt);
    updateRocks(dt);
    dust.uniforms.uTime.value = time;
    follow = wasFollowing;
    if (tween) {
      tween.t = Math.min(1, tween.t + raw / 1.6);   // real time, so slow devices still arrive
      const k = ease(tween.t);
      const v = tween.name === 'loom' ? views.loom.dynamic() : tween.v;
      camera.position.lerpVectors(tween.p0, v.pos, k);
      controls.target.lerpVectors(tween.q0, v.target, k);
      if (tween.t >= 1) tween = null;
    }
    if (spin && planetMesh) { planetMesh.rotateY(dt * BASE_SPIN); cloudMesh.rotateY(dt * BASE_SPIN * 1.25); }
    if (rigParts) {
      const pulse = 0.85 + 0.15 * Math.sin(time * 1.7) + 0.05 * Math.sin(time * 7.3);
      rigParts.plasmaMat.color.setRGB(2.2 * pulse, 4.0 * pulse, 6.0 * pulse);
      rigParts.halo.material.opacity = 0.45 + 0.12 * pulse;
      rigParts.coreLight.intensity = 2.0 * pulse;
      rigParts.outer.rotation.y = -orbit.spin * 2.6;
      rigParts.plumeMat.uniforms.uTime.value = time;
      loomMats.forEach(m => {
        if (m.userData.pulse) m.emissiveIntensity = 4 + 4 * Math.max(0, Math.sin(time * 2.4));
        if (m.userData.flow) m.emissiveIntensity = 0.2 + 0.08 * Math.sin(time * 1.3);
      });
    }
    envClock += dt;
    if (envClock > 3.0) { envClock = 0; updateEnv(); }
    controls.update();
    sunView.copy(SUN).transformDirection(camera.matrixWorldInverse);
    dust.uniforms.uCam.value.copy(camera.position);
    updateFlare();
    if (composer) composer.render();
    else { renderer.autoClear = true; renderer.render(scene, camera); renderer.autoClear = false; renderer.render(flareScene, flareCam); }
  }
}
