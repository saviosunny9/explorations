/* Camera looks — live WebGL2 renderer.
   The editor's photo looks (reference/looks-reference.js) rebuilt as GPU passes, fast enough for a live camera:

     const fx = new LookRenderer(canvasEl);           // a <canvas> to draw into
     fx.render(videoEl, CameraLooks.LOOKS.gold.params, { time: performance.now() / 1000 });

   `render` takes anything WebGL can upload (video, image, canvas, ImageBitmap, VideoFrame). The output canvas is sized
   to the source (or opts.width). Every size in a look is relative to the frame, so it reads the same at any resolution.
   Passes, in order (each only when its parameter is on):
     colour      per-pixel colour & tone + noise                     (COLOUR_GLSL — the same maths as the reference)
     halftone    hexagonal dot screen, dots sized by tone at each dot's centre
     unsharp     sharpen (σ = max(0.8, m/1100)) and clarity (σ = max(2, 0.018 m)), m = long side in px
     bloom       highlights > threshold, blurred (σ = m(0.012 + 0.025k)), screened on
     halation    red-orange highlight glow, two halos, screened on
     chroma      red / green scaled out from the centre (colour fringe)
     motion · ghost · zoom · spin · tilt-shift · fisheye
     soft blur   σ = blur × m / 1000
     finish      light leak, vignette, film grain, dust & scratches (move with time)
   Blurs are separable Gaussians (σ in px = CSS blur radius), worked out at a reduced size when σ is large. */
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hexRgb = c => { c = String(c || '#000').replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); const n = parseInt(c.slice(0, 6), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

  const VERT = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

  // ── the colour & tone stage, in 0..255 units, unclamped between steps (exactly as the reference) ──
  const COLOUR_GLSL = `
uniform float u_br, u_cf, u_sat, u_wa, u_fade, u_gs, u_sp, u_thr, u_hl, u_shd, u_blk, u_tn, u_vib, u_st, u_tb, u_xp, u_ng;
uniform int u_twoTone, u_threshold, u_hasHue;
uniform vec3 u_dk, u_lt, u_hm0, u_hm1, u_hm2, u_tS, u_tH;
const vec3 LW = vec3(0.299, 0.587, 0.114);
float sCurve(float v) { float x = clamp(v / 255.0, 0.0, 1.0); return 255.0 * (x < 0.5 ? 2.0 * x * x : 1.0 - 2.0 * (1.0 - x) * (1.0 - x)); }
// c: 0..255 in; returns graded colour (0..255, unclamped) and, in tone, the brightness before duotone (0..1)
vec3 lookColour(vec3 c, out float tone) {
  c *= u_br;
  c = u_cf * (c - 128.0) + 128.0;
  if (u_hl != 0.0 || u_shd != 0.0 || u_blk != 0.0) {
    float L = clamp(dot(c, LW) / 255.0, 0.0, 1.0), iL = 1.0 - L;
    c += u_shd * L * iL * iL * 4.0 * 70.0 + u_hl * L * L * iL * 6.75 * 60.0 + u_blk * iL * iL * iL * 60.0;
  }
  float l = dot(c, LW);
  c = l + (c - l) * u_sat;
  if (u_vib != 0.0) {
    float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
    float k = 1.0 + u_vib * (1.0 - clamp((mx - mn) / 255.0, 0.0, 1.0)) * 1.3;
    c = l + (c - l) * k;
  }
  if (u_hasHue == 1) c = vec3(dot(c, u_hm0), dot(c, u_hm1), dot(c, u_hm2));
  c += vec3(u_wa, u_wa * 0.15, -u_wa);
  c += vec3(u_tn * 0.5, -u_tn, u_tn * 0.5);
  if (u_xp != 0.0) c += vec3((sCurve(c.r) - c.r) * u_xp * 0.8, (sCurve(c.g) * 1.04 - c.g) * u_xp * 0.6, ((c.b * 0.78 + 26.0) - c.b) * u_xp);
  if (u_st != 0.0) {
    float L = clamp(dot(c, LW) / 255.0, 0.0, 1.0);
    float a1 = clamp((u_tb - L) / u_tb, 0.0, 1.0), a2 = clamp((L - u_tb) / (1.0 - u_tb), 0.0, 1.0);
    c += u_tS * (a1 * (2.0 - a1) * u_st * 0.75) + u_tH * (a2 * (2.0 - a2) * u_st * 0.65);
  }
  if (u_gs != 0.0) { float L2 = dot(c, LW); c += (L2 - c) * u_gs; }
  if (u_sp != 0.0) {
    vec3 s = vec3(dot(c, vec3(0.393, 0.769, 0.189)), dot(c, vec3(0.349, 0.686, 0.168)), dot(c, vec3(0.272, 0.534, 0.131)));
    c += (s - c) * u_sp;
  }
  if (u_ng != 0.0) {
    c += (255.0 - 2.0 * c) * u_ng;
    c = c * vec3(1.0 - 0.12 * u_ng, 1.0 - 0.3 * u_ng, 1.0 - 0.55 * u_ng) + vec3(40.0, 12.0, 0.0) * u_ng;
  }
  if (u_fade != 0.0) c = c * (1.0 - u_fade) + 255.0 * u_fade * vec3(0.42, 0.40, 0.38);
  tone = clamp(dot(c, LW) / 255.0, 0.0, 1.0);
  if (u_twoTone == 1) {
    float t = tone;
    if (u_threshold == 1) t = t * 255.0 > u_thr ? 1.0 : 0.0;
    c = u_dk + (u_lt - u_dk) * t;
  }
  return c;
}`;

  const FRAG = {
    colour: `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src; uniform float u_noise, u_seed; uniform vec2 u_size;
${COLOUR_GLSL}
float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423) + u_seed); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
void main() {
  vec4 s = texture(src, uv); float tone;
  vec3 c = lookColour(s.rgb * 255.0, tone);
  if (u_noise > 0.0) c += (hash(floor(uv * u_size)) - 0.5) * u_noise;
  o = vec4(clamp(c / 255.0, 0.0, 1.0), s.a);
}`,
    halftone: `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src; uniform vec2 u_size; uniform float u_cell; uniform vec3 u_ink, u_paper;
${COLOUR_GLSL}
// each dot's size comes from the graded brightness right at its centre
float dotAt(vec2 c, vec2 p) {
  vec2 q = clamp(floor(c), vec2(0.0), u_size - 1.0);
  float tone; lookColour(texture(src, vec2((q.x + 0.5) / u_size.x, 1.0 - (q.y + 0.5) / u_size.y)).rgb * 255.0, tone);
  float r = u_cell * 0.56 * sqrt(1.0 - tone);
  if (r <= 0.35) return 0.0;
  return clamp(r - length(p - c) + 0.5, 0.0, 1.0);
}
void main() {
  vec2 p = vec2(uv.x, 1.0 - uv.y) * u_size; // pixel position, y down (like the reference)
  float rowH = u_cell * 0.866, row = floor((p.y - u_cell / 2.0) / rowH + 0.5), ink = 0.0;
  for (float dr = -1.0; dr <= 1.0; dr += 1.0) {
    float rr = row + dr, y = u_cell / 2.0 + rr * rowH, off = mod(rr, 2.0) * u_cell / 2.0;
    float cx = off + floor((p.x - off) / u_cell + 0.5) * u_cell;
    for (float dc = -1.0; dc <= 1.0; dc += 1.0) ink = max(ink, dotAt(vec2(cx + dc * u_cell, y), p));
  }
  o = vec4(mix(u_paper, u_ink, ink) / 255.0, texture(src, uv).a);
}`,
    // one direction of a separable Gaussian; u_dir = texel step × direction
    blur: `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src; uniform vec2 u_dir; uniform float u_sigma; uniform int u_taps;
void main() {
  vec4 acc = texture(src, uv); float wsum = 1.0;
  for (int i = 1; i <= 64; i++) {
    if (i > u_taps) break;
    float w = exp(-float(i * i) / (2.0 * u_sigma * u_sigma));
    acc += (texture(src, uv + u_dir * float(i)) + texture(src, uv - u_dir * float(i))) * w; wsum += 2.0 * w;
  }
  o = acc / wsum;
}`,
    copy: `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D src;
void main() { o = texture(src, uv); }`,
    unsharp: `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src, b1, b2; uniform float u_ks, u_kc;
void main() {
  vec4 s = texture(src, uv); vec3 a = s.rgb;
  if (u_ks != 0.0) a = clamp(a + (a - texture(b1, uv).rgb) * u_ks, 0.0, 1.0);
  if (u_kc != 0.0) { float L = dot(a, vec3(0.299, 0.587, 0.114)); float wm = 1.0 - abs(2.0 * clamp(L, 0.0, 1.0) - 1.0) * 0.7; a = clamp(a + (a - texture(b2, uv).rgb) * u_kc * wm, 0.0, 1.0); }
  o = vec4(a, s.a);
}`,
    // highlight masks for bloom (own colour) and halation (a set colour)
    bright: `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src; uniform float u_thr; uniform int u_mode; uniform vec3 u_col;
void main() {
  vec3 c = texture(src, uv).rgb * 255.0;
  if (u_mode == 0) { float l = dot(c, vec3(0.299, 0.587, 0.114)); float v = clamp((l - u_thr) / (255.0 - u_thr), 0.0, 1.0); o = vec4(c * v / 255.0, 1.0); }
  else { float l = max(c.r, max(c.g, c.b)) * 0.6 + dot(c, vec3(0.299, 0.587, 0.114)) * 0.4; float v = pow(clamp((l - u_thr) / (255.0 - u_thr), 0.0, 1.0), 0.8); o = vec4(u_col * v / 255.0, 1.0); }
}`,
    // screen a glow onto the picture: out = d + (screen(d, g·gain) − d) · alpha  (twice for bloom / halation)
    screen2: `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src, g1, g2; uniform float u_a1, u_a2, u_gain1, u_gain2;
vec3 scr(vec3 d, vec3 s, float a) { return d + (1.0 - (1.0 - d) * (1.0 - s) - d) * a; }
void main() {
  vec4 s = texture(src, uv); vec3 d = s.rgb;
  if (u_a1 > 0.0) d = scr(d, min(texture(g1, uv).rgb * u_gain1, 1.0), u_a1);
  if (u_a2 > 0.0) d = scr(d, min(texture(g2, uv).rgb * u_gain2, 1.0), u_a2);
  o = vec4(d, s.a);
}`,
    chroma: `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src; uniform float u_e;
void main() {
  vec4 s = texture(src, uv);
  float r = texture(src, 0.5 + (uv - 0.5) / (1.0 + u_e)).r, g = texture(src, 0.5 + (uv - 0.5) / (1.0 + u_e * 0.45)).g;
  o = vec4(r, g, s.b, s.a);
}`,
    // motion (u_kind 0), zoom (1), spin (2): N equal-weight samples; samples that fall off the picture don't count
    smear: `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src; uniform int u_kind, u_n; uniform vec2 u_d, u_c, u_size; uniform float u_a;
void main() {
  vec4 acc = texture(src, uv); float n = 1.0;
  vec2 p = vec2(uv.x, 1.0 - uv.y) * u_size, c = u_c * u_size;
  for (int i = 1; i < 64; i++) {
    if (i >= u_n) break;
    float t = float(i) / float(u_n - 1); vec2 q;
    if (u_kind == 0) q = p - u_d * (t - 0.5);
    else if (u_kind == 1) q = c + (p - c) / (1.0 + u_a * 0.32 * t);
    else { float th = -(t - 0.5) * u_a * 0.22; vec2 d = p - c; q = c + vec2(d.x * cos(th) - d.y * sin(th), d.x * sin(th) + d.y * cos(th)); }
    if (q.x < 0.0 || q.y < 0.0 || q.x > u_size.x || q.y > u_size.y) continue;
    acc += texture(src, vec2(q.x / u_size.x, 1.0 - q.y / u_size.y)); n += 1.0;
  }
  o = acc / n;
}`,
    ghost: `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src; uniform vec2 u_off;
vec4 at(vec2 q) { return (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) ? vec4(0.0) : texture(src, q); }
void main() {
  vec4 c = texture(src, uv), a = at(uv - u_off), b = at(uv - u_off * 2.0);
  c.rgb = mix(c.rgb, a.rgb, 0.42 * a.a); c.rgb = mix(c.rgb, b.rgb, 0.2 * b.a);
  o = c;
}`,
    tilt: `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src, blurred; uniform float u_p[6], u_al[6];
void main() {
  float y = 1.0 - uv.y, a = u_al[0];
  for (int i = 0; i < 5; i++) if (y >= u_p[i]) a = u_p[i + 1] > u_p[i] ? mix(u_al[i], u_al[i + 1], clamp((y - u_p[i]) / (u_p[i + 1] - u_p[i]), 0.0, 1.0)) : u_al[i + 1];
  o = mix(texture(blurred, uv), texture(src, uv), a);
}`,
    fisheye: `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src; uniform float u_k;
void main() {
  vec2 n = uv * 2.0 - 1.0; float f = 1.0 + u_k * (dot(n, n) - 1.0); vec2 q = (n * f + 1.0) / 2.0;
  o = (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) ? vec4(0.0, 0.0, 0.0, 1.0) : texture(src, q);
}`,
    // light leak, vignette, grain, dust
    finish: `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src; uniform vec2 u_size; uniform float u_time, u_leak, u_pulse, u_vig, u_grain, u_gcell, u_dust; uniform int u_side, u_still;
uniform vec3 u_leakCol; uniform float u_gframe, u_dframe;
float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 scr(vec3 d, vec3 s, float a) { return d + (1.0 - (1.0 - d) * (1.0 - s) - d) * a; }
// a radial gradient blob (ellipse rx × ry) with three colour stops; returns premultiplied-free colour + alpha
vec4 blob(vec2 p, vec2 c, vec2 r, vec3 c0, float a0, float p1, vec3 c1, float a1, vec3 c2, float a2) {
  float t = length((p - c) / r);
  if (t >= 1.0) return vec4(c2, a2);
  if (t < p1) { float k = t / p1; return vec4(mix(c0, c1, k), mix(a0, a1, k)); }
  float k = (t - p1) / (1.0 - p1); return vec4(mix(c1, c2, k), mix(a1, a2, k));
}
void main() {
  vec4 s = texture(src, uv); vec3 d = s.rgb;
  vec2 P = vec2(uv.x, 1.0 - uv.y) * u_size; float W = u_size.x, H = u_size.y, M = max(W, H);
  if (u_leak > 0.0) {
    // into the leak's own frame: it always comes in from the left of that frame
    vec2 q = P; float w = W, h = H;
    if (u_side == 1) q.x = W - P.x;
    else if (u_side == 2) { q = vec2(P.y, W - P.x); w = H; h = W; }
    else if (u_side == 3) { q = vec2(H - P.y, P.x); w = H; h = W; }
    float dt = u_time, y1 = h * (0.36 + sin(dt * 0.45) * 0.12), y2 = h * (0.78 + sin(dt * 0.6 + 2.0) * 0.08);
    vec3 C = u_leakCol / 255.0, pink = vec3(1.0, 40.0 / 255.0, 90.0 / 255.0);
    vec4 b1 = blob(q, vec2(-w * 0.04, y1), vec2(w * 0.62, h * 0.7), C, 0.95, 0.45, C, 0.4, C, 0.0);
    vec4 b2 = blob(q, vec2(-w * 0.02, y2), vec2(w * 0.45, h * 0.4), pink, 0.7, 0.5, pink, 0.22, pink, 0.0);
    vec4 b3 = blob(q, vec2(-w * 0.03, y1 + h * 0.04), vec2(w * 0.2, h * 0.32), vec3(1.0, 236.0 / 255.0, 190.0 / 255.0), 0.95, 0.6, vec3(1.0, 190.0 / 255.0, 120.0 / 255.0), 0.35, vec3(1.0, 190.0 / 255.0, 120.0 / 255.0), 0.0);
    float k = u_leak * u_pulse;
    d = scr(d, b1.rgb, b1.a * k); d = scr(d, b2.rgb, b2.a * k); d = scr(d, b3.rgb, b3.a * k);
  }
  if (u_vig > 0.0) {
    float r0 = min(W, H) * 0.25, r1 = length(vec2(W, H)) / 2.0, t = clamp((length(P - vec2(W, H) / 2.0) - r0) / (r1 - r0), 0.0, 1.0);
    d *= 1.0 - t * u_vig * 0.75;
  }
  if (u_grain > 0.0) {
    // grey noise in cells u_gcell px across, re-dealt every frame, laid on with an overlay blend
    float g = h2(floor(P / u_gcell) + vec2(u_gframe * 37.0, u_gframe * 91.0));
    vec3 ov = mix(2.0 * d * g, 1.0 - 2.0 * (1.0 - d) * (1.0 - g), step(0.5, d));
    d = mix(d, ov, u_grain * 0.55);
  }
  if (u_dust > 0.0) {
    // specks (new every frame) and thin scratches (kept for 9 frames)
    float n = floor(u_dust * (10.0 + 34.0 * (W * H) / (1080.0 * 1350.0)));
    for (float i = 0.0; i < 60.0; i += 1.0) {
      if (i >= n) break;
      float s0 = u_dframe * 17.0 + i * 3.1;
      vec2 c = vec2(h1(s0) * W, h1(s0 + 1.3) * H); float rr = M * (0.0007 + pow(h1(s0 + 2.7), 3.0) * 0.0045);
      float e = length((P - c) / vec2(rr, rr * (0.5 + h1(s0 + 4.1) * 0.7)));
      if (e < 1.0) { bool white = h1(s0 + 5.9) < 0.6; d = mix(d, white ? vec3(1.0, 252.0 / 255.0, 240.0 / 255.0) : vec3(14.0, 10.0, 6.0) / 255.0, white ? 0.45 + h1(s0 + 6.6) * 0.5 : 0.4 + h1(s0 + 7.3) * 0.5); }
    }
    float blk = floor(u_dframe / 9.0), lines = floor(u_dust * 2.5 + h1(blk * 5.3) * 1.2);
    for (float i = 0.0; i < 4.0; i += 1.0) {
      if (i >= lines) break;
      float s0 = blk * 31.0 + i * 7.7, x = h1(s0) * W + (h1(u_dframe + i) - 0.5) * M * 0.003, lw = M * (0.0006 + h1(s0 + 1.1) * 0.0012);
      float seg = step(0.35, h1(floor(P.y / (H * 0.2)) + s0));
      if (abs(P.x - x) < lw * 0.5 && seg > 0.0) d = mix(d, h1(s0 + 2.2) < 0.75 ? vec3(1.0, 252.0 / 255.0, 240.0 / 255.0) : vec3(10.0, 8.0, 6.0) / 255.0, 0.2 + h1(s0 + 3.3) * 0.3);
    }
  }
  o = vec4(clamp(d, 0.0, 1.0), s.a);
}`,
  };

  // the colour-stage uniforms for a look (worked out on the CPU, the same constants as the reference)
  function colourUniforms(f) {
    const cv = (f.contrast || 0) * 2.55, hue = (f.hue || 0) * Math.PI / 180, hc = Math.cos(hue), hs = Math.sin(hue);
    const hueOnly = c => { const v = hexRgb(c), L = 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]; return [v[0] - L, v[1] - L, v[2] - L]; };
    const twoTone = !!(f.duotone || f.threshold);
    return {
      u_br: (1 + (f.brightness || 0) / 100) * Math.pow(2, (f.exposure || 0) / 50), u_cf: (259 * (cv + 255)) / (255 * (259 - cv)),
      u_sat: 1 + (f.saturation || 0) / 100, u_wa: (f.warmth || 0) * 0.35, u_fade: (f.fade || 0) / 100 * 0.32,
      u_gs: (f.grayscale || 0) / 100, u_sp: (f.sepia || 0) / 100, u_thr: (f.threshold || 0) / 100 * 255,
      u_hl: (f.highlights || 0) / 100, u_shd: (f.shadows || 0) / 100, u_blk: (f.blacks || 0) / 100,
      u_tn: (f.tint || 0) / 100 * 30, u_vib: (f.vibrance || 0) / 100, u_st: (f.splitTone || 0) / 100, u_tb: 0.5 + (f.toneBalance || 0) / 200,
      u_xp: (f.cross || 0) / 100, u_ng: (f.negative || 0) / 100,
      u_twoTone: twoTone ? 1 : 0, u_threshold: f.threshold ? 1 : 0, u_hasHue: hue ? 1 : 0,
      u_dk: twoTone ? hexRgb(f.duoDark || '#111111') : [0, 0, 0], u_lt: twoTone ? hexRgb(f.duoLight || '#f4f1ea') : [0, 0, 0],
      u_hm0: [0.213 + 0.787 * hc - 0.213 * hs, 0.715 - 0.715 * hc - 0.715 * hs, 0.072 - 0.072 * hc + 0.928 * hs],
      u_hm1: [0.213 - 0.213 * hc + 0.143 * hs, 0.715 + 0.285 * hc + 0.140 * hs, 0.072 - 0.072 * hc - 0.283 * hs],
      u_hm2: [0.213 - 0.213 * hc - 0.787 * hs, 0.715 - 0.715 * hc + 0.715 * hs, 0.072 + 0.928 * hc + 0.072 * hs],
      u_tS: f.splitTone ? hueOnly(f.toneShadow || '#1d6f78') : [0, 0, 0], u_tH: f.splitTone ? hueOnly(f.toneHigh || '#ffa65c') : [0, 0, 0],
    };
  }

  class LookRenderer {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      const gl = this.gl = canvas.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: !!opts.preserve, antialias: false });
      if (!gl) throw new Error('WebGL2 is not available');
      this.progs = {};
      for (const [k, src] of Object.entries(FRAG)) this.progs[k] = this.program(src);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.src = this.tex(); this.pool = new Map(); this.frame = 0;
    }
    program(fs) {
      const gl = this.gl, sh = (type, s) => { const o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) + '\n' + s); return o; };
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      p.loc = {}; return p;
    }
    tex() { const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; }
    // a render target w × h (re-used between frames by name)
    target(name, w, h) {
      const gl = this.gl; let t = this.pool.get(name);
      if (!t || t.w !== w || t.h !== h) {
        if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }
        const tex = this.tex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        t = { tex, fb, w, h }; this.pool.set(name, t);
      }
      return t;
    }
    // run a pass: prog name, output target (null = the canvas), textures {name: tex}, uniforms {name: value}
    pass(name, out, texs, uni) {
      const gl = this.gl, p = this.progs[name];
      gl.useProgram(p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
      gl.viewport(0, 0, out ? out.w : this.canvas.width, out ? out.h : this.canvas.height);
      let unit = 0;
      for (const [k, t] of Object.entries(texs)) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(this.loc(p, k), unit++); }
      for (const [k, v] of Object.entries(uni || {})) {
        const l = this.loc(p, k); if (l == null) continue;
        if (Array.isArray(v) && /^u_(p|al)$/.test(k)) gl.uniform1fv(l, v);
        else if (Array.isArray(v)) (v.length === 2 ? gl.uniform2fv : gl.uniform3fv).call(gl, l, v);
        else if (/^u_(twoTone|threshold|hasHue|taps|kind|n|mode|side|still)$/.test(k)) gl.uniform1i(l, v);
        else gl.uniform1f(l, v);
      }
      gl.bindVertexArray(this.vao); gl.drawArrays(gl.TRIANGLES, 0, 3);
      return out;
    }
    loc(p, k) { if (!(k in p.loc)) p.loc[k] = this.gl.getUniformLocation(p, k); return p.loc[k]; }
    // a Gaussian blur of tex (w × h) with σ px, worked out at a smaller size when σ is big; returns a target
    blur(name, tex, w, h, sigma) {
      const s = Math.min(1, 5 / Math.max(sigma, 0.01)), bw = Math.max(1, Math.round(w * s)), bh = Math.max(1, Math.round(h * s)), sg = Math.max(0.3, sigma * s);
      let inTex = tex;
      if (s < 1) inTex = this.pass('copy', this.target(name + ':d', bw, bh), { src: tex }).tex;
      const taps = Math.min(64, Math.ceil(sg * 3));
      const a = this.pass('blur', this.target(name + ':h', bw, bh), { src: inTex }, { u_dir: [1 / bw, 0], u_sigma: sg, u_taps: taps });
      return this.pass('blur', this.target(name + ':v', bw, bh), { src: a.tex }, { u_dir: [0, 1 / bh], u_sigma: sg, u_taps: taps });
    }
    render(source, f, opts = {}) {
      const gl = this.gl;
      const sw = source.videoWidth || source.naturalWidth || source.displayWidth || source.width, sh = source.videoHeight || source.naturalHeight || source.displayHeight || source.height;
      if (!sw || !sh) return;
      const W = Math.round(opts.width || sw), H = Math.round(W * sh / sw), m = Math.max(W, H);
      if (this.canvas.width !== W || this.canvas.height !== H) { this.canvas.width = W; this.canvas.height = H; }
      const t = opts.time ?? null, frame = this.frame++;
      gl.bindTexture(gl.TEXTURE_2D, this.src);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      let i = 0; const next = () => this.target('pp' + (i++ % 2), W, H);
      let cur = this.pass('colour', next(), { src: this.src }, Object.assign(colourUniforms(f), { u_noise: (f.noise || 0) / 100 * 120, u_seed: t == null ? 0.37 : (frame % 997) * 0.618, u_size: [W, H] }));
      if (f.halftone) {
        const ink = f.duotone ? f.duoDark || '#111111' : '#111111', paper = f.duotone ? f.duoLight || '#f4f1ea' : '#f4f1ea';
        // dots read the graded brightness, so they sample the source through the colour stage (no duotone)
        cur = this.pass('halftone', next(), { src: this.src }, Object.assign(colourUniforms(Object.assign({}, f, { duotone: false, threshold: 0 })),
          { u_size: [W, H], u_cell: Math.max(3, Math.round(m * (0.004 + f.halftone / 100 * 0.022))), u_ink: hexRgb(ink), u_paper: hexRgb(paper) }));
      }
      if (f.sharpen || f.clarity) {
        const b1 = f.sharpen ? this.blur('s1', cur.tex, W, H, Math.max(0.8, m / 1100)) : cur, b2 = f.clarity ? this.blur('s2', cur.tex, W, H, Math.max(2, m * 0.018)) : cur;
        cur = this.pass('unsharp', next(), { src: cur.tex, b1: b1.tex, b2: b2.tex }, { u_ks: (f.sharpen || 0) / 100 * 1.6, u_kc: (f.clarity || 0) / 100 * ((f.clarity || 0) > 0 ? 0.9 : 0.75) });
      }
      const small = lim => { const s = Math.min(1, lim / m); return [Math.max(1, Math.round(W * s)), Math.max(1, Math.round(H * s)), s]; };
      if (f.bloom) {
        const k = clamp(f.bloom / 100, 0, 1), [bw, bh, s] = small(640);
        const mk = this.pass('bright', this.target('bm', bw, bh), { src: cur.tex }, { u_thr: 255 * (0.62 - k * 0.22), u_mode: 0, u_col: [0, 0, 0] });
        const g = this.blur('bg', mk.tex, bw, bh, m * (0.012 + k * 0.025) * s);
        cur = this.pass('screen2', next(), { src: cur.tex, g1: g.tex, g2: g.tex }, { u_a1: 0.5 + k * 0.5, u_a2: k > 0.5 ? (k - 0.5) * 1.2 : 0, u_gain1: 1, u_gain2: 1 });
      }
      if (f.halation) {
        const k = clamp(f.halation / 100, 0, 1), [bw, bh, s] = small(800);
        const mk = this.pass('bright', this.target('hm', bw, bh), { src: cur.tex }, { u_thr: 255 * (0.72 - k * 0.2), u_mode: 1, u_col: f.halColor ? hexRgb(f.halColor) : [255, 72, 30] });
        const g1 = this.blur('h1', mk.tex, bw, bh, m * (0.003 + k * 0.007) * s), g2 = this.blur('h2', mk.tex, bw, bh, m * (0.012 + k * 0.02) * s);
        cur = this.pass('screen2', next(), { src: cur.tex, g1: g1.tex, g2: g2.tex }, { u_a1: 0.45 + k * 0.55, u_a2: 0.35 + k * 0.4, u_gain1: Math.pow(2, 1 + Math.round(k * 2)), u_gain2: Math.pow(2, 1 + Math.round(k * 3)) });
      }
      if (f.chroma) cur = this.pass('chroma', next(), { src: cur.tex }, { u_e: f.chroma / 100 * 0.012 });
      const ang = (f.motionAngle || 0) * Math.PI / 180;
      if (f.motion) { const L = m * f.motion / 100 * 0.09; cur = this.pass('smear', next(), { src: cur.tex }, { u_kind: 0, u_n: clamp(Math.round(L / 3), 6, 40), u_d: [Math.cos(ang) * L, Math.sin(ang) * L], u_c: [0.5, 0.5], u_size: [W, H], u_a: 0 }); }
      if (f.ghost) { const L = m * f.ghost / 100 * 0.12; cur = this.pass('ghost', next(), { src: cur.tex }, { u_off: [Math.cos(ang) * L / W, -Math.sin(ang) * L / H] }); }
      for (const [key, kind] of [['zoomBlur', 1], ['spinBlur', 2]]) if (f[key]) {
        const a = f[key] / 100;
        cur = this.pass('smear', next(), { src: cur.tex }, { u_kind: kind, u_n: clamp(Math.round(10 + a * 26), 8, 36), u_d: [0, 0], u_c: [f.blurX ?? 0.5, f.blurY ?? 0.5], u_size: [W, H], u_a: a });
      }
      if (f.tiltShift) {
        const b = this.blur('tb', cur.tex, W, H, Math.max(1, f.tiltShift / 100 * m * 0.018)), c = clamp(f.tiltY ?? 0.5, 0, 1), half = clamp(f.tiltSize ?? 0.25, 0.02, 1) / 2, soft = 0.12;
        const st = [[0, c - half - soft <= 0 ? 1 : 0], [c - half - soft, 0], [c - half, 1], [c + half, 1], [c + half + soft, 0], [1, c + half + soft >= 1 ? 1 : 0]].map(([p, a]) => [clamp(p, 0, 1), a]);
        cur = this.pass('tilt', next(), { src: cur.tex, blurred: b.tex }, { u_p: st.map(s => s[0]), u_al: st.map(s => s[1]) });
      }
      if (f.fisheye) cur = this.pass('fisheye', next(), { src: cur.tex }, { u_k: f.fisheye / 100 * 0.6 });
      if (f.blur) cur = this.blur('soft', cur.tex, W, H, f.blur * m / 1000);
      // finishes straight onto the canvas
      const gs = (1 + clamp(f.grainSize || 0, 0, 100) / 100 * 3) * Math.min(W, H) / 1080;
      this.pass('finish', null, { src: cur.tex }, {
        u_size: [W, H], u_time: t ?? 0, u_leak: clamp((f.leak || 0) / 100, 0, 1), u_pulse: t != null ? 0.78 + 0.22 * Math.sin(t * 1.3) : 1,
        u_side: { left: 0, right: 1, top: 2, bottom: 3 }[f.leakSide || 'left'], u_leakCol: hexRgb(f.leakColor || '#ff5a1f'),
        u_vig: (f.vignette || 0) / 100, u_grain: clamp((f.grain || 0) / 100, 0, 1), u_gcell: Math.max(1, gs), u_gframe: t != null ? Math.floor(t * 24) : 0,
        u_dust: clamp((f.dust || 0) / 100, 0, 1), u_dframe: t != null ? Math.floor(t * 12) : 3, u_still: t == null ? 1 : 0,
      });
    }
  }
  root.LookRenderer = LookRenderer;
  root.LookShaders = { VERT, COLOUR_GLSL, FRAG, colourUniforms };
})(typeof window !== 'undefined' ? window : globalThis);
