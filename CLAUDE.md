# Collage Studio — project context

A browser-based editor for scrapbook / collage Instagram posts and short videos (Reels): layered
photos, text, stickers, frames, templates, animation, camera moves, and image / MP4 / WebM export.
Everything lives in `studio/`. There is no server, framework or build step for development: open
`studio/index.html` in Chrome. The other files at the repo root (`index.html`, `direction-1.html`,
`fillout-hero.html`) are unrelated older pages.

The repository is GitHub `saviosunny9/explorations`; work on the branch `main`. (The project moved here
from `savio-1/new-design`, branch `claude/charming-mendel-rchh9w`, with its full history.) Don't open pull
requests unless asked.

`HANDOFF.md` (repo root) has the links, history, open items and how to resume in a new chat.

## How the owner likes to work

- Requests usually come with reference screenshots or screen recordings (Pinterest / Instagram /
  CapCut). For videos: pull frames with `ffmpeg -i in.mov -vf "fps=4,scale=440:-1,tile=4x7" sheet.png`
  and look at every variation; "add all variations" means every distinct design in the reference.
- Similar templates are grouped into one **family** card that opens into all its styles.
- UI should stay calm and minimal (Figma Buzz is the reference): common controls visible, the rest
  behind "More" or a "+" list; group by user intent.
- Every place a photo goes should also accept a video.
- Video templates with words get a text box in the inspector (not on-canvas typing).
- Match reference fonts with free Google Fonts look-alikes. Never commit commercial or trial fonts
  (Helvetica Neue, Druk, Neue Montreal, etc.); users can upload their own.
- Real brand / agency names in references are replaced with made-up ones.
- Rude or religious slogans in references have been softened ("…stuff", "Trust the work of your
  hands"); mention such rewordings when reporting.
- After a change: test in the browser (Playwright, below), update `studio/README.md`, commit and
  push, rebuild the single file.

## Files (`studio/`)

| File | Role |
| --- | --- |
| `index.html` | Shell: top bar, left rail, panel, stage, inspector, dock, home overlay, script order. |
| `render.js` | `window.StudioRender` (R). Pure canvas-2D renderer used by the editor, thumbnails and export. Every element type, filters, frames, text layout, animation, camera, video sync. |
| `app.js` | `window.Studio` (S). Editor core: document state, Konva stage, selection, drag/resize, snapping, crop, path / spot editing, history, autosave + projects (IndexedDB), import, keyboard. |
| `ui.js` | All DOM UI: panels (Templates, Elements, Text, Photos, Canvas, Layers), inspector per element type, home page, export dialog, timeline, menus, toasts. |
| `vox.js` | `window.STUDIO_VOX`: Vox explainer scenes (21 kinds incl. 2.5D parallax), looks and templates, built from `doc.vox` (loaded before templates.js). |
| `templates.js` | `window.STUDIO_TEMPLATES` (+ text presets, paper / planner presets, backgrounds). `GROUPS` maps family name → template ids and sets the order. |
| `fonts.js` | Google Fonts catalogue (`[family, category, axes, weights, hasItalic]`), lazy loading (`ensure`), user-uploaded fonts (IndexedDB, packed into project files). |
| `stickers.js`, `stickers-game.js`, `outfits-*.js` | SVG sticker library (`window.STICKERS`). Hand-drawn strokes use `smooth(wob(...))`; the *Pen sketches* set uses `pl()` for wobbly straight lines with real corners. |
| `nature.js` | Painted garden / sky / flower painters (`window.StudioNature`). |
| `flashes.js` | Bundled photos as data URLs: speed-flash packs (`IMG`, `PACKS`), demo portraits (`DEMO`), text-slide backdrops. All from Unsplash (credited in README). |
| `filmphotos.js` | Film-style demo photos (`window.StudioFilm.IMG`), registered as `film-<key>` assets for the Film looks / Film camera templates. |
| `portraits.js` | Editorial portraits (`window.StudioPortraits.IMG`), registered as `ed-<key>` assets for the Photo effects / Paper & ID templates. |
| `bgremove.js` | Background removal and the "studio look" cut-out (onnxruntime-web + RMBG-1.4 from Hugging Face). |
| `tracker.js` | Motion tracking: `S.trackLayer(el, { src, region })` follows a picked point / object / edge / plane through a video and returns `el.track`; `S.detectObject`, `S.trackSources()`. |
| `video.js` | Video export: frame-by-frame render → WebCodecs → mp4-muxer / webm-muxer; MediaRecorder fallback. `encoderCandidates` lists each codec with the default (hardware) and `prefer-software` encoder; `exportVideo` retries the next candidate when an encoder errors or stalls (`err.fromEncoder`) — hardware H.264 can accept 4K and then fail. |
| `studio.css` | All styling; colour tokens on `:root`, dark mode via `prefers-color-scheme`. |
| `vendor/` | Konva, muxers, JSZip — inlined into the single-file build so it works offline. |
| `tools/build_single_file.py` | Builds `dist/collage-studio.html` (everything inlined). |
| `tools/smoke_test.js` | Playwright smoke test: loads the app, renders every template, reports errors. |
| `tools/dev/` | Dev harness: `run.js` (headless page + script), `contact_sheet.js`, `export_clips.js`, `tracking_clips.py` (exact-truth clips) + `tracking_accuracy.js`. |
| `dist/collage-studio.html` | The portable app (copy to any laptop, double-click). Rebuild after changes. |
| `README.md` | User-facing feature guide. Keep it current. |

## Document model

```js
doc = {
  width, height,
  background: { color, color2, gradient, angle, assetId, crop, filters, imageOpacity, video, pattern, texture, crumple, scene },
  overlay: { grain, vignette, tint, leak, blinds, scanlines, rgb, … },     // finish over everything
  anim: { duration, fps },                                                // video length
  camera: { move, target, zoom, start, dur, rotate, shake, blur, … } | null,
  elements: [ … ],                                                        // bottom → top
}
```

Every element: `{ id, type, x, y, width, height, rotation, opacity, blend, hidden, locked, name, shadow,
anim?, time?, lblur?, erase? }` plus type fields. Defaults live in `DEFAULTS` in `app.js`
(`S.mk(type, over)` builds one, `normalize` fills missing fields on load). Types:

- `text` — text, font, `bg` (box / pill / lines / marker / tape / … highlight styles), stroke, echo, curve, typing marks.
- `image` — `assetId`, `crop {zoom,x,y,fit}`, `filters`, `frame {style,color,size,radius,…}`, outline, studio look, `video {trim,end,speed,loop}` when the asset is a video, `seq {ids,fps,mode,jitter,still}` for stop motion.
- `sticker`, `shape` (incl. `person`, `torn`, `burst`, …), `calendar`, `badge`, `checklist`.
- `ribbon` — text on a Catmull-Rom path (also lines, arrows, marker marks).
- `camera` — phone / camcorder overlay. `nature` — painted scenery.
- `flashes` — speed-flash overlay: photo pack or own photos cut fast with motion blur.

Animation: `el.anim {enter, loop, delay, speed, amount}`; `el.time {start, end, cycle}` for cuts;
`R.hasAnim(el)` decides whether something moves. Text sequence modes (captions, roll, words) show one
piece at a time.

**Assets** are data URLs in `assets[id]` (app.js), never inside `doc`. Ids starting `demo-` and `img-`
are the bundled photos from `flashes.js`, `film-` from `filmphotos.js`, `ed-` from `portraits.js`, registered at start-up so templates can use them.
`data:video/…` assets are videos (`R.isVideoAsset`); the renderer draws them through a muted
`<video>` and `R.syncVideos` seeks frames exactly during export.

## Rendering

- `R.renderDoc(doc, { scale, canvas, time, transparent })` draws a whole frame; `time` null = the still
  editing layout. Export, thumbnails, home-page previews and the editor all share it.
- The editor wraps each element in a `Konva.Shape` whose `sceneFunc` calls `R.drawElement(ctx, el, { editor: true })`.
  Background and overlay are separate shapes. Camera moves transform the `art` / `bgCam` groups.
- Photo filters are pixel operations cached in `filteredSource` (key = asset + filter values; video
  frames use a single-slot cache, graded at 720 px while previewing and 1280 px for export). Add new
  filter keys to `FILTER_KEYS`, then show them in `adjustSection` / `filmSection` (ui.js) and, for
  presets, `R.FILTER_PRESETS` + a shelf in `R.FILTER_GROUPS`. Draw-time photo finishes (vignette, grain,
  light leak, dust) live in `overlays()` (`R.photoFinish`) and get a time only for time-varying layers.
- Film effects over the whole canvas (`doc.overlay`: grain + grainSize, dust, burn, flicker, leak) are
  painted in `drawOverlay(ctx, doc, t)`; `overlay.weave` (gate weave) is applied in `camAt` like a
  camera move. `R.hasFilmMotion(doc)` (weave / flicker) makes a design count as a video.
- Video speed: `vd.speed` (0.05–4) and `vd.smooth` ('flow' | 'blend' | 'off') on `el.video` / `background.video`.
  For slowed clips `R.syncVideos` (export only) calls `smoothFrame`: `clipFps` measures the clip's frame rate with
  `requestVideoFrameCallback`, the two real frames either side are grabbed (seeks snapped to frame centres),
  `estimateFlow` (coarse-to-fine block matching, per-direction reliability, fill from neighbours) runs both ways and
  `warpFrames` builds the in-between frame (Super-SloMo style intermediate flow). The result is stored per layer
  (`R.interpFrame`) and drawn instead of the `<video>` for that moment; `filteredSource` treats it like a video frame.
  Ground-truth test: pan a photo with ffmpeg, export at 15%, compare PSNR per frame against the exact crop.
- Text effects: `el.tfx = { style: 'thermal' | 'ink', amount, palette, move, rough, speckle, smear, angle, seed }` is a pixel pass
  (`textFx`) on the layer's cached bitmap in `drawLayered`: thermal maps a blurred alpha heat map through `R.THERMAL_PALETTES`
  (worked out at ≤420 px, crisp letters redrawn on top), ink thresholds a blurred + smeared alpha with value noise and sprays
  dots. `blurMap` (box blur ×3 on Float32 alpha) avoids canvas filters; `R.textFxPad` adds the glow / bleed margin to `bleed()`.
  `tfx.move` makes the layer time-varying (thermal shimmer). Gaussian layer blur is baked into the layer cache.
- Layer blurs for non-photo layers: `el.tblur` holds the photo blur keys (motion, ghost, zoomBlur, spinBlur, blur, tiltShift,
  motionAngle, blurX/Y, tiltY/Size, blurArea, blurPts, blurFeather). `layerBlur` in `drawLayered` runs the photo blur
  functions on the cached bitmap, rescaled from the bitmap (with its bleed) to the layer's box; `R.layerBlurPad` widens
  the bleed. ui.js `blurControls(t, base, { noun, onNone })` is shared by the photo Blur section and the Effects → Blur
  item; the spot editor (`spotBase` / `spotMap` in app.js) works on `filters` for photos and `tblur` for everything else.
  `blurSpots` mixes blurred × mask + sharp × (1 − mask) (`lighter`), so see-through layers don't show a sharp copy.
- Motion tracking: the user picks what a layer sticks to (`el.trackPick = { mode: 'point' | 'object' | 'edge' | 'plane', src, pts }`
  in canvas coords; pick mode in app.js "tracking: pick what a layer sticks to": `S.startTrackPick` / `S.endTrackPick`,
  click = default shape, in object mode `S.detectObject` (colour flood fill on a 320 px frame → box); emits `trackpick`).
  `S.trackLayer(el, { src, region })` returns `el.track = { src, mode: 'similar' | 'plane', pick, region (uv), t0, dt, pts, ref,
  scale, rotate, blur, steady }`: `pts` per frame are `[u, v, s, r]` (similar) or 8 corner uvs (plane), sampled at frame
  centres in the clip's own time (`requestVideoFrameCallback` mediaTime + dt/2). The analysis size is chosen so the picked
  target is ~170 px across (≥ 512, ≤ 1280 / the clip). Similar: Shi–Tomasi points inside the region, coarse-to-fine
  zero-mean SAD + sub-pixel parabola, least-squares similarity from reference anchors (no chaining), each point snapped back
  onto its look on the reference frame (`snapToRef` through the current fit — this is what stops slow turn / slide drift),
  then `refine` (template of the region). Plane: normalised-DLT homography with outlier rejection + `snapToRef`.
  `R.trackXform` returns `{ M }` or `{ H }` (reference quad → current quad, canvas space); `drawElement` prepends `M` or
  draws through `drawWarped` (flat buffer, 10×10 mesh of per-triangle affines). `trackSeries` smooths over time with a
  zero-lag Gaussian keyed by `steady` (default 10 — more smoothing makes text lag real shake). `R.trackRegionAt` gives the
  outline shown while selected. Test against exact paths: render push-in + shake / perspective clips in Python (PIL),
  encode VP9, compare text corners (currently ~3–4 px mean on a 1920 canvas, plane ~2 px).
- Screen close-up: `doc.screen = { on, pitch, grid, focus, dust }`. `renderDoc` renders the design once at screen resolution
  (`_panel`: no camera / finish), `drawScreen` draws it back nearest-neighbour under the camera, multiplies a sub-pixel mesh
  tile (`meshTile`, fades in once a screen pixel is ≥ ~2 px) and colour-dodges the whites back up, adds glass dust;
  `screenLens` adds lens softness (∝ pixel size) and a top / bottom depth-of-field blur. Keep camera blur at 0 with it
  (motion blur wipes out the vertical mesh lines). The editor shows it on `.screen-view` (a canvas over the artboard)
  only while playing.
- Type & cut (`camera.move: 'typecut'`, template family Typing screen / layout `typescreen`): `R.typePlan(doc)` builds one schedule
  from the target text (human keystroke rhythm `kt[]` seeded by the text, word breaks, optional clips = image layers with `cutin: true` spread evenly over the breaks, zoom rising
  after each clip, pull-back, end hold) and drives the typewriter (`charsAt`), clip visibility (`cutAt`, in `drawElement`)
  and the camera (identity during clips; caret followed through `R.caretAtChars` with fractional letters so motion blur is
  smooth; `seg` stops blur smearing across a cut). `R.applyTypePlan` writes the length and each clip's `time` slot (video
  clips start at their cut); `S.commit` calls it. `typing.pin` lays out the full text and reveals letters in place.
  Cut-ins don't listen to clicks and are hidden in the still editing view.
- Word-level text entrances (`anim.enter`: `build`, `shuffle`, `sweep`, `wall`; `st.wfx` from `animState`) are drawn by
  `drawWordFx` / `drawWordWall` in render.js, which place each word themselves (`wordBoxesOf(layoutText(...))`), fill colour
  only. Build re-lays out the first n words each step (so centred lines re-centre) and lerps old positions; shuffle keeps each
  word's line and re-spaces the line K = 3 times (random gap weights), drawing words from `wordBitmap` (smeared with
  `motionBlurPx` by their speed); sweep = highlight to a character boundary + I-beam, `el.sweep { color, ink, cursor, follow, at }`,
  the line shifted so the head stays at `at` × canvas width; wall = `el.text` as a comma list, `el.wall { fontFamily, fontWeight,
  color, scale, beat, fill }`, rows reshuffled every beat, filling the whole canvas (a text box is only as tall as its lines),
  also drawn for the still view. A layer blur still applies (words drawn to a buffer first).
- Phrase typing: `camera.phrases: true` with `move: 'typecut'` → `phrasePlan` (each `\n`-separated line typed on an empty
  screen, held, hard cut; zoom per phrase); `plan.view(n)` gives the phrase on screen, `phraseEl` centres it, and the camera
  frames the whole phrase leaning toward the caret (`R.caretAtChars(el, n, P)`).
- Camera `move: 'keys'` takes `camera.keys = [{ t, x, y, z, r, ease }]` (x / y ≤ 1 are fractions; ease '' = cubic, 'expo',
  'out', 'linear'); camera motion blur follows any path (big moves accumulate at half size, up to 64 samples).
  Entrance `focus` (Blur in) blurs, scales and fades a layer into focus (`st.gblur`).
- No background: `background.none` skips every background paint (`R.isClearBg`); the editor draws a checkerboard instead,
  `placeBackground` never moves it onto the layers' canvas, and `renderDoc` cuts the overlay finish back to the layers'
  alpha (`destination-in`). Any `S.change` to a background colour / photo / pattern clears it.
- See-through video (`S.exportVideo({ transparent: true })`, video.js): WebCodecs can't encode alpha, so `exportAlphaWebm`
  runs two VP9 encoders — the colour frame (un-premultiplied, opaque) and the alpha as a raw I420 Y plane (a canvas would
  squeeze it to 16–235) — and pairs them by timestamp into one WebM with `alpha: true`; the alpha chunk rides in each
  block's BlockAdditional via a small patch in `vendor/webm-muxer.js` (`meta.additions`, plus ReferenceBlock on delta
  frames). `format: 'png'` → `exportFrames` zips numbered PNGs (JSZip). Muxers load from `vendor/` in development.
  Check with `ffprobe` (`alpha_mode=1`) and `ffmpeg -c:v libvpx-vp9 -i x.webm -pix_fmt rgba`.
- Canvas blur: `doc.blur` holds the photo blur keys (motion, ghost, zoomBlur, spinBlur, blur, tiltShift + their settings and
  spots). `frameBlur` runs them over the finished frame in `renderDoc` (after the camera blur, before the finish; drawn over
  the sharp frame so edges stay filled, or replacing it on a see-through canvas). In the editor `R.frameBlurCtx` does the same
  to the artboard region of the layers' canvas (≤ 1200 px), called first in `overlayShape`; `placeBackground` moves the
  background onto that canvas while a canvas blur is on. UI: `canvasBlurSection` reuses `blurControls('doc', 'blur')`.
- Paper relief: `background.relief` with `background.crumple` skips the crumple in `drawBackground` and draws it once above
  the layers, inside the camera (`renderDoc`; `reliefCam` in app.js), so print follows the folds. `overlay.light` is a soft
  window-light falloff in `drawOverlay`.
- Frames: add a case to `frameGeometry` (returns `outer`, `inner` clip, `rect`, optional `extra` painter; starting size and colour in `FRAME_START`, ui.js)
  and a label in `R.FRAMES`. Cut-up frames (`strips`, `mosaic`, `mirror`) set `g.paint(ctx, draw)` and place the
  photo piece by piece by calling `draw(rect)`.
- Flip: images, stickers and shapes flip their own content; `drawCore` mirrors every other type as a whole.
- Blend: `el.blend` is any canvas composite op. In the editor, `placeBackground()` moves the background
  onto the layers' canvas while any layer blends, so blends mix with it there too.
- New element type: `DEFAULTS` + `S.elLabel` (app.js), a `drawCore` case and `bleedCore` (render.js),
  an inspector in the `fn` map in `renderInspector` (ui.js), an Elements panel entry if users add it.

## Editor (app.js) essentials

- State: `doc`, `sel` (ids), `elMap`, `nodes`. Change things with `S.change(target, path, value, live)`
  (`target` = `'doc'` or `'sel'`), `S.changeEl(el, fn)`, then `S.commit()` for history.
- Events (`S.on`): `selection`, `values`, `doc`, `history`, `change`, `time`, `playstate`, `projects`,
  `project`, `name`, `templates`, `view`, `uploads`, `replaced`, `spotedit`, `pathedit`, `fonts`, `toast`.
- Import: `S.pickImages(opts)` / `S.importFiles(files, opts)` (photos and videos; `replaceId`,
  `asBackground`, `uploadOnly`+`onAdded`, `startFromPhoto`, `imagesOnly`).
- Projects: each design is a project in IndexedDB (`project:<id>` + a `projects` index with thumbnails,
  status draft / saved). `S.projects.*`, `S.saveNow()`. Opening the app shows the home page.
- My templates: `S.myTemplates.*` (save / add / rename / remove / restore) stores a snapshot of the canvas
  under `template:<id>` + a `templates` index (thumbnail, size, video). Bundled `demo-/img-/film-` photos are
  left out of the snapshot. ui.js turns them into template-like objects (`myTpls`, `t.mine`) so
  `templateCard`, `useTemplate` and pieces work unchanged; a file with `kind: 'template'` opened through
  *Open file* is added to My templates instead of opening as a design. Event: `templates`.
- Multi-select: `S.change('sel', …)` writes to every selected layer, so the inspector reuses `textInspector`
  (`{ multi: true }`) / `shapeInspector` when all selected layers are text / shapes. Blend + opacity sit in
  `layerRow()` under the inspector title.
- Copy / paste properties: `S.copyStyle()` / `S.pasteStyle()` (⌘⌥C / ⌘⌥V, matched on `e.code`); `NOT_STYLE`
  lists geometry and content keys that never copy, `SHARED_STYLE` what carries between different types.
  ⇧H / ⇧V → `S.flip('x' | 'y')`.
- Selection gestures: Shift adds (click or box), Alt removes, Cmd/Ctrl toggles; Alt-drag duplicates;
  holding Alt shows distance lines (`updateDistances`). Selection gestures set `noDrag`.
- Full-canvas `flashes` layers don't listen to clicks so the photo under them stays reachable.

## UI (ui.js) building blocks

`h('tag.class', attrs, ...children)` makes DOM. Controls: `num`, `colorCtl`, `selectCtl`, `seg`,
`toggle`, `textCtl`, `inputCtl`, `fontCtl`. Layout: `sec(title, kids, open, {key, collapsible})`,
`more(key, kids, label)` for hidden extras, `addSec(title, items)` for the "+" lists, `row(label, ctl)`,
`full(node)`, `label(text)`. Panels use `shelf`, `elTile`, `templateCard`. Call `renderInspector()` /
`renderPanel()` after structural changes; `toast(msg, {label, run})` for feedback with an action.

## Phone layout

`app.js` sets `S.mobile` and `body.mobile` from `matchMedia('(max-width: 760px), (pointer: coarse) and (max-height: 520px)')`
and emits `mobile` when it flips. Touch gestures live in the "touch: phones & tablets" block (pinch / two-finger pan,
one-finger pan on empty canvas via `touchPan`, long-press → `contextmenu`); the transformer gets bigger handles.
In `ui.js` the "phone layout" block adds the bottom tool strip (`#mtools`, `mToolbar`) and turns the inspector into a
one-section sheet: every `sec()` carries `data-key` / `data-title`, `mobileSheet()` shows only the section whose key is
`mTool` (or all of them for the canvas, `'all'`), and `M_SEC` maps section titles to strip icons and short labels — so a
new inspector section shows up as a phone tool automatically. Panels are tall sheets (`.panel.open`). All phone CSS
is scoped under `body.mobile` at the end of `studio.css` (landscape phones: sheets beside the canvas). Test with
Playwright `devices['iPhone 13']`, `'Pixel 7'`, `'iPhone 13 landscape'`; multi-touch through CDP
`Input.dispatchTouchEvent`.

## Templates (templates.js)

A template is `{ id, name, tags, width, height, video?, build: () => doc }`. Helpers: `txt`, `img`,
`stk`, `shp`, `rib`, `nat`, `cam`. Text can be placed by centre (`cx`, `cy`); widths are measured on
load. Put a new family's ids in `GROUPS` (order = display order); `video: true` adds the badge and hover
preview. Families so far: Typing screen (layout `typescreen`, 4 orientations), Type effects (7: word build, select sweep, word wall, blur shuffle), Screen close-up (4: phrase typing, comment thread), Smooth cam text (layout `smoothcam`, 4 orientations, words carried across re-flows by `key`), Text effects (5), eight moving-layout families (Scrolling wall, Card trail, Grid build, Photo drop, Fan stack, Strip conveyor, Zoom wall, Slide-in panels — 4 orientations each), Text slides (69), Photo effects (27, incl. eight handwritten journal layouts), Paper & ID (10), Film looks (16), Film camera (10), Stop motion, Speed flashes, Studio portrait, Newspaper
reveal, Typing, Match cut, Kinetic headline, Sticky notes, Rolling numbers, Word by word, Letter
bounce, Life-sim garden, Ribbon poster, Motion blur, Camera view, Meet the team, Grid-paper notes,
Polaroid POV, Wall calendar, Notebook tip — about 362 templates (104 of them Vox explainer). Removed on request (Oct 12): Everyday things, Film club ticket, Café chalkboard,
Happy birthday, Y2K vibes, This week, Review card, Coming soon, Halftone duo, Postfólio, Tools I use, Creative partner,
Meet the agent, the Outfit line-up family, Quote card, Retro event, Photo dump, Mood board, New post story, Save the date and Big sale; their fonts are kept as Text styles and their stickers stay in Elements. Film templates build
filters with `LOOK('<preset>', overrides)` so they stay in step with the presets.

**Vox explainer** (`vox.js`, family *Vox explainer*, `vox-<type>-<orientation>`, 26 types × 4 sizes: 5 stories + 21 single
beats): `doc.vox = { theme, step, hunt, boil, scenes: [{ id, kind, dur, text, word, sub, note, assetId, assetId2, cutId }] }`
is the recipe; `STUDIO_VOX.build(spec, W, H)` writes background, finish (`overlay.boil` from the recipe), `anim` (length =
sum of scene lengths, `step` 12), `camera` (`move: 'keys'`, two keys per scene = hard cut + one move, `hunt`) and every layer
(`vox: true`, `time` = the scene's window — or `_from` / `_to` inside it for cut-ins and lifted bars — anim delays absolute).
`KINDS` lists each kind's group, fields, photo slots (`photos`), `cutout` and demo text; themes paper / newsprint / archive /
clean. Group-safe entrances pass `anim.dist` (every layer of a card moves the same px); rotated cards place children with
`group()`. Parallax layers use `loop: 'drift'` with `span: [s0, s1]` (only during their scene) and `ds` (swell; nearer =
more); 2.5D uses `cutId` (a full-size cut-out from `S.cutoutAsset(assetId)` in bgremove.js, same crop as the photo, white
image outline) over the softened photo with words in between. Highlights / red circle are text marks found at draw time
(`typing.marks`, `typing.wipe`, `typing.style: 'circle'`). `S.setVox(fn, live)` rebuilds the vox layers in place (new theme
swaps background / overlay; boil always synced); `S.resizeCanvas` re-flows. ui.js `voxSection` (scene cards, photo slots,
cut-out button, grouped add-scene, Look, stepped / hunting / boil). Vox layers take no clicks; still view = first scene
(`R.visibleAt`). Templates carry `buildAt(W, H)` → "Your canvas". Bar charts wipe with `anim.dir: 'up'`.

Camera focus hunting: `camera.hunt` 0–100 → `huntAt(doc, t)` (render.js) over each camera move (keys segments with a real
zoom / pan; pushin, pullback… from start / dur): soft-sharp-soft, locked by 40% of the move (≤ 1.6 s); `R.huntBlurPx` blurs
the finished frame in `renderDoc` and in the editor via `R.frameBlurCtx` while playing; `camAt` adds focus breathing
(z × 1 + 0.014·hunt). Textures: `overlay.grunge` (+ `grungeSeed`, procedural `grungeTexture`), `overlay.boil` (paper /
crumple / grunge / user texture re-dealt per stepped frame: `boilAt`, `boilJit`), `overlay.userTex` + `userTexAmount` +
`userTexBlend` (an uploaded image over the frame; counted in `usedAssets` / `docAssets`). Don't bundle third-party
textures (Texture Labs' terms forbid use in apps / templates); textures in the app are generated in code.

**Match cut** (`match-highlight`, `match-dark`, `match-news`): the user only edits `doc.matchcut = { style, word, seed, color }`.
`window.STUDIO_MATCHCUT.build(mc)` writes six articles (titles, keyword lines, follow-on lines, body) from phrase banks with
`{w}` / `{W}` filled by the word, picked by `seed`; every generated layer has `mcut: true` (no clicks, not in marquee, not
listed in *Text in this video*). `S.setMatchCut(patch, live)` rebuilds them in place; ui.js `matchCutControls` shows the word
field, highlight colour and *Shuffle sentences*.

**Moving layouts** (`mv-<layout>-<orientation>`): generator functions in the "LAYOUTS IN MOTION" block of
templates.js build a layout for any `(W, H)`; the eight layouts share three families in `GROUPS` (Moving grids, Photo piles,
Strips & panels) via `t.family`; each member keeps its layout name in `t.style` and has one member per orientation
(story / portrait / square / wide). ui.js shows a family as its types (`combinedPanel`, `typesModal`), then a type's ratios (`stylePanel`, `ratiosModal`). Built docs carry `doc.layout = { key }`, the images get
`layoutSlot: true`, and `window.STUDIO_LAYOUTS[key].build(W, H)` lets `S.relayout()` re-flow the layout when the
canvas is resized (photos carry over in slot order, layout text by `key`; other layers stay). `orientationMembers` (ui.js) sorts a
family by closeness to the canvas and adds a "Your canvas" member. `S.photoSlots()` / `S.fillSlots()` fill many
slots at once (`importFiles` `fillIds`). Motions: loop `drift` (`anim.dx`, `anim.dy` over the whole video) and
entrance `land` (`anim.spin`).

Handwritten layouts (`px-letter`, `px-quote`, `px-fieldnotes`, …, built in `handwritten()` inside the Photo effects block)
use fonts matched to the reference handwriting: Zeyada (ink scrawl), Whisper (pen script), Marck Script (marker),
Covered By Your Grace / The Girl Next Door (pen capitals), Reenie Beanie / Kristi (margin scribbles), Nanum Brush Script,
Dawning of a New Day. To compare candidates, render a specimen sheet straight from the Google Fonts css2 API.
Element rotation turns around the top-left corner (`x`, `y`); `turn()` places pieces inside a rotated group.

When lining up words with inline photo chips, measure text widths first (create a text with `S.mk`,
`S.autosize`, read `width` after fonts load) and hard-code positions.

## Testing

Playwright with the pre-installed Chromium works well:

```bash
node studio/tools/smoke_test.js            # loads the app, renders every template, prints errors
```

For features, script the real UI: `page.click(...)`, file choosers via `page.waitForEvent('filechooser')`,
read state with `page.evaluate(() => window.Studio…)`, render frames with
`window.StudioRender.renderDoc(doc, { time })` into a contact sheet and look at it. Headless
Chromium exports WebM (no H.264); real Chrome exports MP4.

## Shipping

1. Commit with a clear message; push to the working branch.
2. `python3 studio/tools/build_single_file.py` → `studio/dist/collage-studio.html` (commit it too).
3. A private claude.ai artifact of the app (https://claude.ai/artifact/3H6nGJsMhFKchUekuoSQAC, declares the `downloads` capability for exports).
   Build its page with
   `python3 studio/tools/build_single_file.py --artifact <dir>` (same inlined scripts as dist, incl. the muxers and
   JSZip, plus `STUDIO_MODEL_PARTS` so background removal can read model parts published under `models/`)
   and publish `<dir>/collage-studio.html` to that URL. Published next to it: `vendor/ort-wasm-simd.wasm`
   (onnxruntime-web 1.16.3, from npm). Still missing: `models/rmbg.part0–4.txt` and `models/ultraface.txt` —
   huggingface.co was blocked from this cloud environment, so background removal in the artifact only works if the
   viewer's browser can reach Hugging Face directly (it tries that first). Add them once the host is allowed. The artifact has no `vendor/` scripts, so anything loaded
   lazily from `vendor/` must be inlined: a build without the muxers broke every video export there.

## Moving to another computer

Copy `studio/dist/collage-studio.html` and double-click it. Designs live in the browser, so move them
with **⋯ → Download project file** (`.studio.json`, photos / videos / fonts inside) and **Open file** on
the home page. Offline, everything works except Google Fonts (system fallback) and background removal.
