# Brief: add these photo looks to a live camera app

You're adding a library of **{{COUNT}} photo looks** to a camera app. The user shoots live with the look on (preview), and
the captured photo or video keeps the same look. The looks come from an existing photo editor. This pack has
everything needed to reproduce them exactly on any platform.

## What's in the pack (read in this order)

| file | use it for |
| --- | --- |
| `looks.json` | **The looks.** `shelves` (Film, Colour, B&W, Print, Effects — the order to show them in) and `looks[id] = { id, name, shelf, params, passes }`. `params` *is* the look. `passes` lists the extra (non-colour) passes it needs; when it is empty, the LUT is the whole look. |
| `parameters.json` | Every parameter: key, label, group, type, range, default, stage, and what it does. Use it to build editing sliders. |
| `spec/PIPELINE.md` | The exact maths and the order of operations. |
| `reference/looks-reference.js` | **Ground truth.** The editor's own code, standalone (browser Canvas 2D, CPU). `CameraLooks.applyLook(img, id, { time })`. Port from this when the spec is unclear. |
| `web/webgl-looks.js` + `web/shaders/*.frag`, `*.vert`, `colour-stage.glsl` | A working **real-time GPU** version (WebGL2 / GLSL ES 3.00), checked against the reference (`spec/CHECKS.md`). Use it as-is on the web, or port its shaders to Metal / GLES / SkSL / AGSL. |
| `web/preview.html` | Open it in Chrome to try every look on the webcam, a photo or a video, with sliders. A live demo of the target behaviour. |
| `luts/cube/*.cube`, `luts/png/*.png` | Each look's colour stage baked into a 3D LUT (33³ `.cube` / 64³ 512 × 512 PNG). See `luts/README.md`. |
| `samples/*.jpg`, `previews/*.jpg`, `previews/check/*.jpg`, `sheet-*.jpg` | Test photos; what every look should look like; the exact images to compare a port against. |

## How a look works (short)

A look = colour & tone per pixel (one pass, or one 3D LUT) → noise → optional spatial passes (halftone, sharpen /
clarity, bloom, halation, colour fringe, motion / double / zoom / spin / tilt-shift blur, fisheye) → optional soft
blur → finishes on top (light leak, vignette, film grain, dust). Sizes are relative to the frame, so the preview and a
full-resolution capture match. Grain, dust and the light leak move over time: pass the frame's timestamp.

## Suggested implementation

1. **Load `looks.json`** and show the shelves as tabs, with the looks as a horizontal strip of thumbnails. Make the
   thumbnails by running the look on a small live frame, or ship `previews/` images.
2. **Colour stage first.** Either port `colour-stage.glsl` to your shader language (all parameters as uniforms, so
   sliders work), or sample the look's 3D LUT. Either gets {{LUT_ONLY}} looks fully right immediately.
3. **Add the spatial passes and finishes** that the looks' `passes` mention, porting from `web/webgl-looks.js` (each
   is a short fragment shader plus separable Gaussian blurs). Blurs with a large σ can run at a reduced size.
4. **Capture:** render the same params at full resolution, with the same time.
5. **Check yourself:** render `samples/portrait.jpg` with `grain`, `noise` and `dust` set to 0 for each look, and
   compare with `previews/check/<id>.jpg`. The pack's own WebGL port gets more than 40 dB PSNR on colour-only looks
   and about 23–34 dB on the halftone and big-blur looks (blur differences come from the reference's 8-bit blending).
   Aim for the same.

Platform pointers:
- **Web / PWA:** `new LookRenderer(canvas).render(videoEl, look.params, { time })`, fed from `getUserMedia`.
  Done.
- **iOS (Swift):** AVCaptureVideoDataOutput → Metal (MTKView). Port the GLSL to MSL. Or use `CIColorCubeWithColorSpace`
  (sRGB) with the `.cube` data, plus CIGaussianBlur (radius ≈ σ) and blend kernels for the rest. Keep everything in
  sRGB-encoded values.
- **Android (Kotlin):** CameraX → SurfaceTexture → OpenGL ES 3.0. The shaders port almost unchanged; use
  `samplerExternalOES` for the camera texture.
- **React Native / Expo:** react-native-vision-camera with Skia frame processors (port the GLSL to SkSL
  RuntimeEffects), or apply the PNG LUT in a shader.
- **Flutter:** `FragmentProgram` shaders (GLSL → SPIR-V) on the camera texture.

Gotchas:
- **Don't linearise colour.** The maths works on gamma-encoded sRGB 0..255. Keep the values unclamped between colour
  steps and clamp only at the end.
- **Use 8-bit RGBA intermediates.** That is what the reference uses, and it's fine.
- **Front camera:** apply the look first, then mirror the preview if you want to. That way the light leak's side
  matches the saved photo.
- **Look names** are generic ("Gold 200", "Portrait 400"…), named for a look, not a brand. Keep them that way.
