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
| `papers.js` | `window.StudioPapers`: 12 real paper scans as multiply maps (`{ id, name, kind: 'clean' \| 'aged', credit, src }`, `DEFAULT` 'natural'), made by `tools/papers_prep.py` from ambientCG (CC0) and Wikimedia Commons (PD / CC0). |
| `render.js` | `window.StudioRender` (R). Pure canvas-2D renderer used by the editor, thumbnails and export. Every element type, filters, frames, text layout, animation, camera, video sync. |
| `app.js` | `window.Studio` (S). Editor core: document state, Konva stage, selection, drag/resize, snapping, crop, path / spot editing, history, autosave + projects (IndexedDB), import, keyboard. |
| `styles.js` | `window.StudioStyles` (ST): 131 realtime image styles in 14 families (`ST.CATS`), each `{ id, name, cat, tags, kind: 'cells' \| 'filter', anim, animIf, params, fn }`; `ST.apply(src, sfx, { t, mask, lim })` returns a restyled canvas. |
| `styles-ui.js` | Styles panel (`S.ui.registerPanel('styles')`), the inspector's Style section (`S.ui.addSection`), the action bar (Upload / Inspire / Restyle / Shuffle / Library / Export). |
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
| `subject.js` | Subject masks: `S.findSubject(el, { people, pts }, { quick })` runs MediaPipe Tasks (lazy `import()` of `@mediapipe/tasks-vision@0.10.14` from jsDelivr; models from storage.googleapis.com: `selfie_multiclass_256x256` → 1 − background for people, `magic_touch` InteractiveSegmenter for clicked points; GPU delegate kept only if a test frame takes < 90 ms, else CPU) on every frame of the layer's clip (seek to frame centres, 512 px, the clip's fps ≤ 30, ≤ 2400 frames; `R.subjectMask` uses the nearest mask when ≥ 24 fps, else blends two), follows clicked spots from the frame they were clicked on (`what.at` → `i0`, forwards then backwards) with `follow` (zero-mean SAD patch match frame to frame) and re-prompts there (one keypoint — a scribble made the model spread onto touching things); each mask is gated to the last mask moved with the spot and grown by 18% (`grow`), people are cut out of it when the click wasn't on a person (`cutPeople`), and it must `fits`: hold the spot, keep its area within ×0.45–2.2 and match the clicked frame's colours (`hist` 4×4×4, intersection ≥ 0.5); otherwise it retries at `nextPrompt` / the centroid and, failing that, coasts the last mask along with the spot (≤ 15 frames), guided-filters each mask against the frame, median-of-3 over time, packs them into PNG sprite sheets (`S.addMedia`, white + alpha) and writes `el.subj = { of, people, pts, sheets, per, cols, cw, ch, n, fps, t0, cover }` (`quick` = only the frame on screen, `preview: true`). Pick mode: `S.startSubjectPick(el)` / `S.endSubjectPick(keep)` (DOM overlay `.subj-pick` over `#stage-area`, dots in uv, a quick preview per click, Done runs the whole clip). `S.autoSubject(el, { force })` finds people for a layer with a subject style (`d.subject`) or `sfx.region`, once per picture (on `doc` / `replaced` / `history`); `S.forgetSubject`. Events `subject`, `subjectprogress`, `subjectpick`. |
| `tracker.js` | Motion tracking: `S.trackLayer(el, { src, region })` follows a picked point / object / edge / plane through a video and returns `el.track`; `S.detectObject`, `S.trackSources()`. |
| `audio.js` | `window.StudioAudio` (A): sound. `A.sources(doc)` lists every sound (video layers / background video with `video.{volume, mute, fadeIn, fadeOut}`, and `doc.audio` tracks); `A.tick(t)` (= `S.audioTick`, called from the play loop) plays them through Web Audio (media elements → gain), muting what's out of its window; `A.mix(doc, dur)` renders an OfflineAudioContext mix (speed = playbackRate, reverse, loops, fades, soft limiter), `A.encode(buf, 'mp4'\|'webm')` → AudioEncoder chunks (AAC `mp4a.40.2`, else Opus), `A.wav`, `A.peaks` (waveforms), `A.record` / `A.stopRecording` (voiceover via MediaRecorder). Track helpers `S.addSound`, `S.changeSound`, `S.splitSound`, `S.removeSound`, `S.soundById`. |
| `clips.js` | Video edits: image layers with `el.clip` form the main track. `S.layoutClips()` (run in every `S.commit`) lays them end to end in layer order, sets each `el.time`, overlaps transitions (`clip._in` / `clip._out`), aliases repeated video assets and sets `doc.anim.duration` to the total. `S.addClips`, `S.splitClip`, `S.moveClip`, `S.setTransition`, `S.setAllTransitions`, `S.placeClip` (fill / fit), `S.makeClip`, `S.clipAt`, `S.clipLen`, `S.autoFix`. |
| `soundpack.js` | `window.StudioSoundpack.items[key] = { src (MP3 data URL), dur, peak, bsb (BigSoundBank id), name?, cat?, loop? }` — 142 CC0 recordings made by `tools/sounds_prep.py <dir of BigSoundBank mp3s>` (manifest `S` in the script: key, id, name, category, mode `shot` (event around the loudest moment) / `take` (a steady window) / `amb` (steadiest stretch, crossfaded into a loop) / `samp` (an instrument hit or note), max length, options `skip` / `tail` / `post` / `loop` / `busy`; loudness-levelled with a soft limiter). Items without `name` are music samples only (music box, mbira). Download a sound: `https://bigsoundbank.com/UPLOAD/mp3/<id>.mp3`, but only use files whose page says "Free and Royalty Free" (`fetch` check). Single-file build is ~13 MB — the artifact page limit is 16 MB, so keep new recordings small. |
| `sfx.js` | `window.StudioSfx` (X): the sound library — every named soundpack item (`rec: true`, rendered as its MP3) plus designed sounds and music beds rendered offline to WAV. `X.CATS` = music, transition, phone, camera, everyday, nature, hit; `X.LIST` ({ id, name, cat, dur, peak, loop, bpm, tags, fn, rec, samples }), `X.get(id)` (follows `X.ALIAS` for retired ids), `X.render(id)`. Building blocks: `desk` (compressor + reverb send, `lofi` = saturation + low-pass), `tone`, `hiss`, `shape`, `samp(k, key, t, o)` / `note(k, set, midi, t)` (recorded samples as AudioBuffers via `sample()`; `samples: true` loads the kit), synth `kick`, `clap`, `pluck`, `pad`, `bass`, `stab`, models `epiano` (FM Rhodes), `piano` (FM), `ubass` (upright), `nylon`, `swirl` / `tap` (brushes), `marimba`, `vibes`; `song(bars, bpm, fn, { bed, crackle })`; `level()` evens loudness. `X.FOR_TRANSITION` / `X.FOR_ENTRANCE` pick the effect for a transition / entrance. Asset ids `sfx-<id>`: `S.ensureSound(id)` (app.js) renders on first use; `sfx-` is in `BUILT_IN`, so never saved — `loadDoc` re-ensures them. A new designed sound: `def(id, name, cat, dur, k => …, { peak, tags })`; a new recording: add it to the manifest and re-run the prep script. |
| `sounds-ui.js` | Sounds panel (`registerPanel('sounds')`, rail tab): categories, search, preview, click / drag to add (`S.addLibrarySound(s, at)`), Yours, `S.soundTransitions()` / `S.soundEntrances()` (tracks tagged `auto: 'trans' \| 'enter'`, replaced on re-run). |
| `timeline.js` | The video timeline (`.vtl`, bottom of `#stage-area`; `S.setStageInset` shrinks the Konva stage): ruler, layer tracks (`overlayItems`: timed layers, or every non-clip layer in a video edit; `el.lane` / `a.lane` 0 = nearest the video, `pack` keeps lanes, bumps overlaps and closes up gaps; vertical drag → `laneAt`, `restack` moves the layer in the stack so higher tracks draw on top; media bars get filmstrips, a video's left edge trims `video.trim`; `S.addOverlays` in clips.js adds picture-in-picture layers at the playhead), Video track (filmstrips, trim handles, drag to reorder, transition chips + picker), Sound lanes (waveforms, move / trim), playhead, toolbar (split S / ⌘B, duplicate, delete, Clips, Music, Voice, Text, zoom). Also the inspector's Clip section and the canvas inspector's Sound section; a selected sound track or group fills the inspector through `S.ui.setInspectorOverride(fn)` (ui.js `renderInspector` uses it while no layer is selected). Groups: `overlayItems` turns each group into one bar (`groupBar`: thumbnail, name · count, style badge, › open); `inGroup` shows the group's members (breadcrumb `.vtl-crumb`, shaded outside its window), `selGroup` / `S.groupTarget()` is what the Styles panel and inspector work on (styles-ui `target()` kind `group`, params at `groups.<gid>.sfx`), group drag = move / trim / change track (`restack(els, lane)` keeps the stack in track order); double-click detection lives in `startDrag` (`lastTap`) because a click re-renders the bar. Shift / ⌘-click adds to the selection; ⌘G groups, ⇧⌘G ungroups, Esc leaves a group. app.js's canvas wheel handler ignores events inside `.vtl`, so the timeline scrolls natively. `S.openTimeline()`, `S.vtlOpen`. |
| `video.js` | Video export: frame-by-frame render → WebCodecs → mp4-muxer / webm-muxer; MediaRecorder fallback. `encoderCandidates` lists each codec with the default (hardware) and `prefer-software` encoder; `exportVideo` retries the next candidate when an encoder errors or stalls (`err.fromEncoder`) — hardware H.264 can accept 4K and then fail. Sound (`sound: true`): `S.exportAudio` mixes + encodes first, `audioFeeder` adds audio chunks just ahead of each video chunk; alpha WebM carries it too, PNG frames get `sound.wav`. Files estimated over 400 MB use `pieceTarget` (StreamTarget, chunked; recent pieces stay patchable, older ones become Blobs; MP4 then `fastStart: false`). |
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
  audio: [{ id, assetId, name, start, trim, end, dur, volume, fadeIn, fadeOut, loop, mute, voice }],  // music / voice tracks
}
```

Every element: `{ id, type, x, y, width, height, rotation, opacity, blend, hidden, locked, name, shadow,
anim?, time?, lblur?, erase? }` plus type fields. Defaults live in `DEFAULTS` in `app.js`
(`S.mk(type, over)` builds one, `normalize` fills missing fields on load). Types:

- `text` — text, font, `bg` (box / pill / lines / marker / tape / … highlight styles), stroke, echo, curve, typing marks.
- Any element can carry `lane` (its timeline track). Sound tracks: `doc.audio[].lane`, `.sfx` (library id), `.auto`.
- Groups: `doc.groups[gid] = { id, name, origin, start, end, lane, hidden, sfx, opacity, blend }`; members carry `el.grp` and `el.gt = [start, end | null]` relative to `origin`. `syncGroups()` (app.js, every commit) writes each member's `el.time` from `gt`, cut to `[start, end]` (empty → parked at 1e6), and drops empty groups. `S.makeGroup(ids, { name, start, origin, len, lane })` (members made contiguous in the stack), `S.changeGroup`, `S.moveGroup` (shifts `anim.delay` of members too — entrance delays are absolute times), `S.ungroup`, `S.removeGroup`, `S.groupMembers`, `S.groupById`. Rendering: `R.groupComposite(g)` (a style, opacity < 1 or a blend) → `R.drawGroup` paints the members into a buffer, applies `g.sfx` with `ST.apply`, composites with opacity / blend; `renderDoc` draws it at the first member, and in the editor the first member's `sceneFunc` draws it (undoing its own node transform) while the others draw nothing (all stay clickable). ui.js `addTemplateLayers` makes a group at the playhead whenever the timeline is open or the design is a video edit (template times and delays shifted by the playhead; length = the template's for video templates, else 4 s).
- `image` — `assetId`, `crop {zoom,x,y,fit}`, `filters`, `frame {style,color,size,radius,…}`, outline, studio look, `video {trim,end,speed,loop,reverse,volume,mute,fadeIn,fadeOut}` when the asset is a video, `seq {ids,fps,mode,jitter,still}` for stop motion, `clip {len,src,fit,trans:{type,dur,dir},_in,_out}` when it's on the main video track (clips.js).
- `sticker`, `shape` (incl. `person`, `torn`, `burst`, …), `calendar`, `badge`, `checklist`.
- `ribbon` — text on a Catmull-Rom path (also lines, arrows, marker marks).
- `camera` — phone / camcorder overlay. `nature` — painted scenery.
- `flashes` — speed-flash overlay: photo pack or own photos cut fast with motion blur.

Animation: `el.anim {enter, loop, delay, speed, amount}`; `el.time {start, end, cycle}` for cuts;
`R.hasAnim(el)` decides whether something moves. Text sequence modes (captions, roll, words) show one
piece at a time.

**Assets** are URLs in `assets[id]` (app.js), never inside `doc`. Imported photos (original file, ≤ 16384 px), videos and sound files are Blobs: `assets[id]` is a `blob:` URL, `kinds[id]` ('image' | 'video' | 'audio', shared with the renderer via `R.setAssetKinds`, so use `R.isVideoAsset` / `R.isAudioAsset`, never the URL prefix), `S.assetBlob(id)`, `S.addMedia(blob, kind)`; `S.aliasAsset(id)` is a second id for the same file (split clips each need their own `<video>`). Persistence: `saveNow` / My templates store `media: [ids]` and write each asset once to IndexedDB `media:<id>` (`{kind, blob}` | `{kind, url}` | `{kind, alias}`); `S.projects.get` / `S.myTemplates.get` restore them (`loadMedia`; older records with inline `assets` still load); `collectMedia` deletes unreferenced `media:*` 20 s after start-up. Project files: `S.packFile(data)` → JSON, or a zip (`project.json` + `media/<id>.<ext>`, JSZip STORE) when it holds Blobs; `S.readFile(file)` reads either. Length cap `S.MAX_LEN` = 600 s (ui.js sliders use `lenMax()` + `soft`). Ids starting `demo-` and `img-`
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
- Paper texture (`background.texture`, `overlay.paper`, shape `texture`, `frame.texture`, amounts 0–100) draws a real scan
  from papers.js: `fillTexture(ctx, 'paper', amount, w, h, scale, frame, paperId)` → `drawPaper` (multiply, cover-fitted once,
  turned 90° when the orientation differs, boil = new crop + flip per frame); ids in `background.paperId`, `overlay.paperId`
  (falls back to the background's), `el.paperId`, `frame.paperId`; default 'natural'. The old procedural `paper()` tile is
  only a fallback while a scan decodes; `R.preload` waits for the scans. UI: `paperPick(t, path, amountPath)` swatches
  (Finish → Paper texture, shape Texture, bordered frames) and the *Real paper* shelf in the Canvas panel.
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
- Depth vision (`tfx.style: 'vision'`, the default look of Effects → Thermal, on any layer incl. photos / videos; learned from
  studiogruhl.com/projects/rerun): `visionFx(c, el, s, t, b)` in render.js. Subject mask = alpha (text, shapes, cut-outs) or, for
  photos, `visionSubject` (difference from the border-median backdrop; `tfx.subject` 'auto' | 'bright' | 'dark'). A two-radius
  blurred glow field at ≤300 px (radius from font size for text, box size for photos; gain-normalised), noise displacement,
  a radial wave (`wave`, `waveLen`, centre `cx`/`cy`, `speed`) and flow noise give V = 0.25 + 0.72·F + wave + noise outside;
  inside the subject 1.02 + core·normalised luma. V wraps (`fract`) through a cyclic 1024-entry LUT (`visionLut`:
  `R.VISION_PALETTES` depth / jet / turbo / dusk / mono, or `palette: 'custom'` + `stops`), plus grain. `field: true` fills the
  whole box (photos); otherwise alpha = max(subject, glow). Detail ≤720 px (≤440 while playing), ~200 ms a frame.
  `R.textFxPad` widens the bleed for the glow; moves unless `move === false`. Classic thermal on photos uses luma × alpha as heat.
- Melted edges: `tfx.melt` 0–100 (non-image layers, both thermal and vision): `meltMask(a, w, h, fs, m, seed, z)` displaces
  the alpha by two octaves of value noise (computed at ¼ size; amp = fs·0.12·m), blurs and re-thresholds it (smoothstep 0.36–0.62)
  for round, bulging edges, and returns `glow` (pushed 2.2× further) as the glow source. Thermal with melt skips the crisp-letter
  overlay and works at ≤760 px (480 while playing); `z` follows `move`, so the edges morph over time.
- Realtime styles (`styles.js`): `el.sfx = { id, ...params, seed, keepShape }` on any layer runs in `drawLayered` on the cached
  layer bitmap (after the eraser, before `tfx`; `mask` keeps the layer's alpha unless `keepShape === false`); `doc.sfx` runs
  over the finished frame in `renderDoc` (after the canvas blur, before the finish) and in the editor through
  `frameStyleCtx` (inside `R.frameBlurCtx`: artboard read back at ≤ 900 px, result reused while a pixel fingerprint, the
  settings and the time match; `placeBackground` moves the background onto the layers' canvas). `R.styleOn(sfx)`.
  Sizes are in units of the picture (`k = min(W, H) / 500`), so thumbnails, the editor and a 4K export look alike; per-pixel
  work runs at ≤ 960 px (560 while playing). Kind `cells` = marks over a backdrop with the shared Backdrop + Intensity
  params (`cells(e, cw, ch)` → per-cell colour + mapped brightness, `drawGlyphs` from a glyph `atlas`, `colorize` tints
  white marks with the cell grid); kind `filter` = pixel work with an Effect strength (`mix`). Helpers: `pix`, `remap`
  (bilinear per-pixel distortion), `glass(e, lens)` (refraction + light from a lens function), `voro`, `ditherPix`
  (ordered maps + error-diffusion kernels, palettes in `ST.PALETTES`), `kuwahara`, `edgeMask`, `inkLayer`, `paper`.
  `ST.moves(sfx)` (anim and not switched off; `animIf` for Characters / Mixed = only with *Randomize*) feeds `R.hasAnim`
  and `R.hasFilmMotion`; `ST.defaults(id)`, `ST.params(sfx)`, `ST.restyle(sfx)`. A new style: `def(id, { … })` in its
  family block; the panel, inspector, search and Shuffle pick it up.
  Subject masks reach styles as `o.subject` (a canvas the size of the layer bitmap): `drawLayered` calls `subjectLayerMask`
  (render.js: `R.subjectMask(el, st)` picks / blends the sheet cells for the clip's own time — `v.currentTime` in the editor,
  `R.videoTarget` in export — drawn through `frameGeometry` + `drawCover` so it lines up with the photo; `R.hasSubject(el)`
  ignores a mask made for another file (`subj.of`, compared by URL so split-clip aliases still match); `R.subjectReady` in
  `isComplete`, sheets in `R.preload` and `refIds`). Styles with `subject: true` use it themselves (Flash Light family:
  `flashLight` — subject filled with the light colour, rim from the mask's edge band, two-radius bloom screened over
  everything, background dimmed + graded, flicker / strobe; without a mask `guessSubject` = border-median difference × centre
  prior, Otsu); for any other style `sfx.region` 'subject' | 'background' composites the styled picture through the mask
  (`region()` in `ST.apply`). ST.apply also gets `o.sid` (layer id) and `o.tr` (real time) for temporal styles.
  Subject FX family (`cat: 'subj'`, `SFX({...})` sets `subject: true`): `subjectOf(e)` → `{ M (work size, flipped for
  `apply: 'background'`), mc (full-size alpha mask), cx, cy, bw, bh }`, `backdrop(e, x, bg, amt, col)` paints the rest
  (keep / dim / mono / blur / black / color via `BG_P`), `cut(fx, mc)` keeps a picture to the subject, `glowOver` screens a
  blurred copy. Looks: `asciiSubject` (ASCII Subject / Matrix Rain — `cells` + `atlas` per cell with alpha, motion flicker /
  rain heads / scramble / still, `colorize`), `neonOutline` (level sets of a blurred mask = rings, dashes by angle round the
  centre), `hologram`, `echoTrail` (per-layer `ECHO` history of small subject cut-outs; stills step copies by `angle`),
  `glitchSubject`, `pixelSubject`, `colourPop`, `silhouette`, `spotlight` (radial dark pool at the mask's centre),
  `heatSubject` (`IRON` / `COLD` ramps), `xray` (inverted luma + sobel), `sticker` (dilated mask border, shadow, jiggle).
  Datamosh family: `moshMelt` keeps per-layer state in `MOSH` (`moshState(e, tag)`: reset on a size change, time going back
  or a jump > 0.6 s; a cold start begins from the simulated still mosh): `motion()` = 8 px block matching on a 128 px grey
  frame (±6 px, zero-motion bias) → each work block (block size × k) copies the previous *moshed* buffer from its exaggerated
  vector (+ fbm drift) and adds `residual` × (frame − previous frame at the same offset); `heal` re-draws badly matched
  blocks, `refresh` = clean frame every N s, colour bleed turns chroma along motion (Bloom Mosh: `hue`, `bloomPost`). Mosh
  Blocks (quadtree partitions, clumped by fbm: foreign / stale / flat colour), Pixel Drag (bands of held-colour streaks),
  Block Dropout (fbm patches that hold an old frame, slip or go grey) are per-beat.
  Dreamy Motion (first family, from screen recordings): `lightSmear` (Light Smear / Golden Drift — split-tone `GRADES`,
  one-sided `smearCopies` trail, drifting ghost copies, highlights streaked and *screened* on so darks stay dark, top haze,
  vignette, grain) and `dreamGlow` (Dream Glow / Night Bloom — floating camera, desaturate then grade through `DREAMS`
  ramps, blown highlights, soft focus, blurrier darker edges, double screened bloom, light specks, grain). Two tiles per
  engine = the same `fn` with different `defaults`.
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
- Clip transitions: `drawElement` wraps `drawElementCore`; for an `el.clip` inside its `_in` / `_out` window `clipFx` applies its half of `R.TRANSITIONS` (fade, black / white dips, slide, push, whip with motion blur, wipe, iris, zoom, blur, spin, glitch; `R.TRANS_DIRS` take `dir`). Still view (`t == null`) shows only the first clip. Hidden-at-this-moment layers don't catch clicks (`hitFunc`), `R.syncVideos` / `R.liveSyncVideos` skip users outside their window (and park the next clip on its first frame); `vd.reverse` steps by seeking.
- Frames: add a case to `frameGeometry` (returns `outer`, `inner` clip, `rect`, optional `extra` painter; starting size and colour in `FRAME_START`, ui.js)
  and a label in `R.FRAMES`. Cut-up frames (`strips`, `mosaic`, `mirror`) set `g.paint(ctx, draw)` and place the
  photo piece by piece by calling `draw(rect)`.
- Flip: images, stickers and shapes flip their own content; `drawCore` mirrors every other type as a whole.
- Blend: `el.blend` is any canvas composite op. In the editor, `placeBackground()` moves the background
  onto the layers' canvas while any layer blends, so blends mix with it there too.
- New element type: `DEFAULTS` + `S.elLabel` (app.js), a `drawCore` case and `bleedCore` (render.js),
  an inspector in the `fn` map in `renderInspector` (ui.js), an Elements panel entry if users add it.

## Look of the editor

Dark effects-studio chrome (tokens on `:root` in `studio.css`; a light set under `[data-theme="light"]`): near-black
backgrounds, white-alpha hairlines, white as the only accent (`--accent`), `--sel` (#4d9fff) for selection handles in app.js.
Fonts: `--ui-font` Geist, `--mono` Geist Mono (numbers, `/ SECTION` labels), `--pixel` Geist Pixel (display), loaded by
`@import` at the top of studio.css. The "studio look" block before the phone layout squares off controls; sliders show
label + value on one line with a 3 px track filled to `--p` (set in `num()`); primary buttons are white with a detached
stripe (`box-shadow`). Zoom and undo / redo sit in the top bar centre (`.tb-center`); the dock under the canvas carries the
tools plus the styles action bar. The app opens on the Styles panel (`tab = 'styles'`).

## Editor (app.js) essentials

- State: `doc`, `sel` (ids), `elMap`, `nodes`. Change things with `S.change(target, path, value, live)`
  (`target` = `'doc'` or `'sel'`), `S.changeEl(el, fn)`, then `S.commit()` for history.
- Events (`S.on`): `selection`, `values`, `doc`, `history`, `change`, `time`, `playstate`, `projects`,
  `project`, `name`, `templates`, `view`, `uploads`, `replaced`, `spotedit`, `pathedit`, `fonts`, `toast`, `recording`.
- Import: `S.pickImages(opts)` / `S.importFiles(files, opts)` (photos, videos and sound files; `replaceId`,
  `asBackground`, `uploadOnly`+`onAdded`, `startFromPhoto`, `imagesOnly`, `asClips` (+ `newProject`, `clipIndex`), `soundAt`).
- Projects: each design is a project in IndexedDB (`project:<id>` + a `projects` index with thumbnails,
  status draft / saved). `S.projects.*`, `S.saveNow()`. Opening the app shows the home page.
- My templates: `S.myTemplates.*` (save / add / rename / remove / restore) stores a snapshot of the canvas
  under `template:<id>` + a `templates` index (thumbnail, size, video). Bundled `demo-/img-/film-` photos are
  left out of the snapshot. ui.js turns them into template-like objects (`myTpls`, `t.mine`) so
  `templateCard`, `useTemplate` and pieces work unchanged; a file with `kind: 'template'` opened through
  *Open file* is added to My templates instead of opening as a design. Event: `templates`.
- Multi-select: `S.change('sel', …)` writes to every selected layer, so the inspector reuses `textInspector`
  (`{ multi: true }`) / `shapeInspector` when all selected layers are text / shapes, and `multiMediaSections` when they are all
  photos / videos / clips (Style via `S.ui.styleSection('sel')`, transitions, speed + backwards + sound, `imageLookSections`). Blend + opacity sit in
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

A template is `{ id, name, tags, width, height, video?, build: () => doc }`. `CATEGORIES` (end of templates.js, exported as `STUDIO_TEMPLATE_CATS`) sorts every family into a category (photo / video / text / collage / explainer) and a kind (`subs`); each template gets `t.cat` and `t.sub` (ungrouped templates: family key `''` → Collage › Posts & planners). **A new family must be added to a sub there** (otherwise it warns and lands in Posts & planners). ui.js `catBar(state, redraw)` (category chips with family counts, kind chips, Any / Still / Video) + `tplSections(list, state, q, famCard, oneCard, o)` (sections per category or kind) drive both the Templates panel (`tplState`) and the home page (`hs`). Helpers: `txt`, `img`,
`stk`, `shp`, `rib`, `nat`, `cam`. Text can be placed by centre (`cx`, `cy`); widths are measured on
load. Put a new family's ids in `GROUPS` (order = display order); `video: true` adds the badge and hover
preview. Families so far: Image styles (29, one realtime style each, first in `GROUPS`), Typing screen (layout `typescreen`, 4 orientations), Type effects (7: word build, select sweep, word wall, blur shuffle), Screen close-up (4: phrase typing, comment thread), Smooth cam text (layout `smoothcam`, 4 orientations, words carried across re-flows by `key`), Text effects (8, incl. three Depth vision), eight moving-layout families (Scrolling wall, Card trail, Grid build, Photo drop, Fan stack, Strip conveyor, Zoom wall, Slide-in panels — 4 orientations each), Text slides (69), Photo effects (27, incl. eight handwritten journal layouts), Paper & ID (10), Film looks (16), Film camera (10), Stop motion, Speed flashes, Studio portrait, Newspaper
reveal, Typing, Match cut, Kinetic headline, Sticky notes, Rolling numbers, Word by word, Letter
bounce, Life-sim garden, Ribbon poster, Motion blur, Camera view, Meet the team, Grid-paper notes,
Polaroid POV, Wall calendar, Notebook tip — about 381 templates (104 of them Vox explainer). Removed on request (Oct 12): Everyday things, Film club ticket, Café chalkboard,
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
   (onnxruntime-web 1.16.3, from npm), and for subject.js's fallback `vendor/vision_bundle.mjs` + `vendor/vision_wasm_internal.{js,wasm}`
   (@mediapipe/tasks-vision 0.10.14 from jsDelivr) and `models/subject-people.part0–1.txt` / `models/subject-pick.part0.txt`
   (base64 of the selfie multiclass / magic touch .tflite from storage.googleapis.com, split to stay under the 16 MB file limit). Still missing: `models/rmbg.part0–4.txt` and `models/ultraface.txt` —
   huggingface.co was blocked from this cloud environment, so background removal in the artifact only works if the
   viewer's browser can reach Hugging Face directly (it tries that first). Add them once the host is allowed. The artifact has no `vendor/` scripts, so anything loaded
   lazily from `vendor/` must be inlined: a build without the muxers broke every video export there.

## Moving to another computer

Copy `studio/dist/collage-studio.html` and double-click it. Designs live in the browser, so move them
with **⋯ → Download project file** (`.studio.json`, or `.studio.zip` when it holds whole videos / sound / full-size photos; fonts inside) and **Open file** on
the home page. Offline, everything works except Google Fonts (system fallback) and background removal.
