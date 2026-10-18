# The look pipeline — exact maths

This is what `reference/looks-reference.js` does, written out. The reference file is the ground truth (it is the
editor's own code, and it reproduces the editor pixel for pixel). Wherever this text and the code disagree, the code wins.

## Conventions

- **Colour** values are gamma-encoded sRGB, 0..255, exactly as they come from the camera / a JPEG. Nothing is
  linearised. Do not convert to linear light, or every look will shift.
- **Luma** `L = 0.299 r + 0.587 g + 0.114 b`.
- **m** = the picture's long side in pixels. Every size is a fraction of `m` (or of `min(w, h)` where noted), so a
  look reads the same in a 720 px preview and a 4000 px capture.
- **y runs down** (0 = top) for every position (`blurY`, `tiltY`, leak positions).
- **σ (sigma)** = a Gaussian blur's standard deviation in px. It is the same number as a CSS `blur(σpx)` radius.
- **t** = seconds since the camera started, or `null` for a single still (then grain, leaks and dust hold one steady
  frame).
- A look is a plain object of parameters (`looks.json → looks[id].params`). A missing key means 0 / off. Ranges are
  in `parameters.json`.

## Order

1. **Colour & tone**, per pixel (one shader pass; can also be baked into a 3D LUT, see `luts/`)
2. **Noise**, per pixel
3. **Spatial passes**, in this order, each only if its key is set: halftone → sharpen + clarity → bloom → halation →
   colour fringe → motion blur → double exposure → zoom blur → spin blur → tilt-shift → fisheye
4. **Soft blur** (`blur`)
5. **Finishes**, drawn on top: light leak → vignette → film grain → dust & scratches

## 1. Colour & tone (per pixel, values stay unclamped between steps)

Precompute once per look:

```
br   = (1 + brightness/100) · 2^(exposure/50)
c    = contrast · 2.55;  cf = 259 (c + 255) / (255 (259 − c))
sat  = 1 + saturation/100
wa   = warmth · 0.35
fade = fade/100 · 0.32
gs   = grayscale/100;  sp = sepia/100
hl, shd, blk = highlights/100, shadows/100, blacks/100
tn   = tint/100 · 30;  vib = vibrance/100
hue  = hue° → radians;  HM = the luma-preserving hue-rotation matrix (see code)
st   = splitTone/100;  tS, tH = toneShadow, toneHigh minus their own luma (hue only)
tb   = 0.5 + toneBalance/200
xp   = cross/100;  ng = negative/100
```

Then for each pixel (r, g, b in 0..255):

```
rgb *= br
rgb  = cf (rgb − 128) + 128
if hl|shd|blk:  L = clamp(luma/255);  add = shd·L(1−L)²·4·70 + hl·L²(1−L)·6.75·60 + blk·(1−L)³·60;  rgb += add
l    = luma(rgb);  rgb = l + (rgb − l)·sat
if vib:  k = 1 + vib·(1 − clamp((max − min)/255))·1.3;  rgb = l + (rgb − l)·k      (l = the luma from the line above)
if hue:  rgb = HM · rgb
r += wa;  g += 0.15 wa;  b −= wa
if tn:   r += 0.5 tn;  g −= tn;  b += 0.5 tn
if xp:   S(v) = 255·(x<0.5 ? 2x² : 1 − 2(1−x)²), x = clamp(v/255)
         r += (S(r) − r)·0.8 xp;  g += (1.04 S(g) − g)·0.6 xp;  b += ((0.78 b + 26) − b)·xp
if st:   L = clamp(luma/255);  a1 = clamp((tb − L)/tb);  a2 = clamp((L − tb)/(1 − tb))
         rgb += tS·a1(2 − a1)·st·0.75 + tH·a2(2 − a2)·st·0.65
if gs:   rgb += (luma − rgb)·gs
if sp:   rgb += (sepiaMatrix·rgb − rgb)·sp         sepia rows (0.393 .769 .189) (0.349 .686 .168) (0.272 .534 .131)
if ng:   rgb += (255 − 2 rgb)·ng;  r = r(1 − 0.12ng) + 40ng;  g = g(1 − 0.3ng) + 12ng;  b = b(1 − 0.55ng)
if fade: rgb = rgb(1 − fade) + 255·fade·(0.42, 0.40, 0.38)
tone = clamp(luma/255)                             ← the halftone dots are sized by this
if duotone or threshold:
         t = tone;  if threshold: t = (t·255 > threshold/100·255) ? 1 : 0
         rgb = ink + (paper − ink)·t               ink = duoDark (#111111), paper = duoLight (#f4f1ea)
```

The final write clamps each channel to 0..255 and rounds.

## 2. Noise

For each pixel, add the same value to r, g and b: `n = (u − 0.5) · noise/100 · 120`, where u is uniform 0..1. The
reference uses one xorshift32 stream per picture. A live port can use any per-pixel hash and re-deal it every frame.

## 3. Spatial passes

`k = amount/100` below.

| key | what it does |
| --- | --- |
| `halftone` | Paper fill (`duoLight` if `duotone`, else #f4f1ea), then ink dots (`duoDark` / #111111). cell = max(3, round(m·(0.004 + 0.022k))). Rows are 0.866·cell apart, the first row at cell/2, odd rows offset by cell/2 (a hexagonal screen). Each dot's radius is 0.56·cell·√(1 − tone), with tone taken at the dot's centre pixel; dots with r ≤ 0.35 px are skipped. |
| `sharpen` | a + (a − blur(a, σ))·1.6k with σ = max(0.8, m/1100). Then clamp. |
| `clarity` | a + (a − blur(src, σ))·k′·w with σ = max(2, 0.018m), k′ = k·0.9 (or k·0.75 when negative), w = 1 − 0.7·abs(2L − 1) (strongest in the midtones). The blur is of the picture *before* sharpening. |
| `bloom` | Work at ≤ 640 px. mask = rgb·clamp((L − thr)/(255 − thr)) with thr = 255(0.62 − 0.22k). Blur the mask with σ = m(0.012 + 0.025k) in full-size px. Screen it on at alpha 0.5 + 0.5k, and again at alpha (k − 0.5)·1.2 when k > 0.5. Screen with alpha a: out = d + (1 − (1 − d)(1 − s) − d)·a. |
| `halation` | Work at ≤ 800 px. l = 0.6·max(r, g, b) + 0.4·L; v = clamp((l − thr)/(255 − thr))^0.8 with thr = 255(0.72 − 0.2k); mask = halColor·v (default 255, 72, 30). Halo 1: σ = m(0.003 + 0.007k), gain ×2^(1+round(2k)) (clamped), screened at alpha 0.45 + 0.55k. Halo 2: σ = m(0.012 + 0.02k), gain ×2^(1+round(3k)), screened at alpha 0.35 + 0.4k. |
| `chroma` | e = 0.012k. Red comes from the picture scaled by (1 + e) about the centre, green scaled by (1 + 0.45e), blue unchanged: red = src(0.5 + (uv − 0.5)/(1 + e)). |
| `motion` | L = 0.09m·k along `motionAngle` (degrees; 0 = right, 90 = down). N = clamp(round(L/3), 6, 40). Average the picture with N − 1 copies offset by (dx, dy)·(i/(N − 1) − 0.5) for i = 1…N − 1. Every sample weighs the same; samples off the picture don't count. |
| `ghost` | L = 0.12m·k along `motionAngle`. A copy at offset L mixed in at 42 %, then a copy at 2L mixed in at 20 %. |
| `zoomBlur` | N = clamp(round(10 + 26k), 8, 36) equal-weight samples. Sample i is scaled by 1 + 0.32k·(i/(N − 1)) about (blurX, blurY), default the centre. |
| `spinBlur` | The same N samples, each turned (i/(N − 1) − 0.5)·0.22k radians about (blurX, blurY). |
| `tiltShift` | Blur everything with σ = max(1, 0.018m·k). Then keep the sharp picture through a vertical mask with stops (y, alpha) = (0, edge), (c − h − 0.12, 0), (c − h, 1), (c + h, 1), (c + h + 0.12, 0), (1, edge), where c = tiltY (default 0.5) and h = tiltSize/2 (default 0.125). |
| `fisheye` | Barrel distortion. n = position in −1..1, source = (n·(1 + 0.6k(|n|² − 1)) + 1)/2. Anything sampled from outside the picture is left empty (black). |

## 4. Soft blur

A Gaussian blur over the result, σ = blur·m/1000 (`blur` runs 0..40 and can be fractional).

## 5. Finishes

- **Light leak** (`leak`, `leakColor` (default #ff5a1f), `leakSide` (left / right / top / bottom)). Work in the
  leak's own frame, where it always comes in from the left: for `right` mirror x, and for `top` / `bottom` turn the
  frame 90° (code: `lightLeak`). Three elliptical radial blobs are screened on. Each blob's alpha is multiplied by
  k·pulse, where pulse = 0.78 + 0.22·sin(1.3t) (1 for a still):
  1. centre (−0.04w, y1), radii (0.62w, 0.7h); stops 0 → colour @ 0.95, 0.45 → colour @ 0.4, 1 → colour @ 0
  2. centre (−0.02w, y2), radii (0.45w, 0.4h); stops 0 → (255, 40, 90) @ 0.7, 0.5 → @ 0.22, 1 → @ 0
  3. centre (−0.03w, y1 + 0.04h), radii (0.2w, 0.32h); stops 0 → (255, 236, 190) @ 0.95, 0.6 → (255, 190, 120) @ 0.35, 1 → @ 0

  y1 = h(0.36 + 0.12 sin(0.45t)), y2 = h(0.78 + 0.08 sin(0.6t + 2)).
- **Vignette** (`vignette`). A black radial gradient whose alpha runs from 0 at radius 0.25·min(w, h) to 0.75k at
  half the diagonal.
- **Film grain** (`grain`, `grainSize`). Grey noise g ∈ 0..1 is laid on with an *overlay* blend at alpha 0.55k.
  Overlay: d < 0.5 ? 2dg : 1 − 2(1 − d)(1 − g). One grain cell is (1 + 3·grainSize/100) px of a 1080 px picture
  (scale by min(w, h)/1080). The noise is re-dealt 24 times a second (the reference shifts a seeded 256 × 256 tile to a
  random offset each frame).
- **Dust & scratches** (`dust`). Specks are re-dealt 12 times a second. There are round(k(10 + 34·w·h/(1080·1350)))
  little ellipses, each sized m(0.0007 + 0.0045u³); 60 % are near-white at alpha 0.45–0.95, the rest near-black at
  alpha 0.4–0.9. There are also 0–3 thin curved hairs, and 0–3 long vertical scratches (white or dark, alpha 0.2–0.5)
  that keep their place for 9 dust frames and wobble sideways. The WebGL port draws specks and scratches but leaves
  out the hairs.

## Live camera notes

- Steps 1–2 form one cheap pass, and they cover the whole look for {{LUT_ONLY}} of the {{COUNT}} looks (see `looks.json → passes`).
  Everything else is a handful of extra passes. Bloom and halation already work at ≤ 640 / 800 px, and any large
  blur can run at a reduced size (the WebGL port blurs at the size where σ ≤ 5 px).
- To capture a photo, run the same parameters at full sensor resolution. Because every size is relative, the picture
  looks like the preview, only sharper.
- When recording video, pass each frame's timestamp as t so the grain, leak and dust move.
- A "strength" slider is not part of the editor. If you want one, mix(original, look, s) on the final colour is the
  simplest.
