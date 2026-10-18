# Savio's editor

A browser editor for scrapbook / collage style posts: layered photos, stickers, styled text, calendars and planners on a snap-to-grid canvas.

Open `studio/index.html` in a browser, or serve the folder with any static server (for example `npx serve studio`). Network access is needed for Konva (jsDelivr) and the Google Fonts it uses.

| File | What it holds |
| --- | --- |
| `index.html`, `studio.css` | App shell and editor chrome |
| `fonts.js` | 150 Google Fonts (serif, display, script, handwritten, mono) and font loading |
| `stickers.js`, `stickers-game.js` | 170 recolourable SVG stickers, including glossy game-UI icons and crystals |
| `nature.js` | Procedural garden painters (lawn hills, flower beds, bushes, hedges, trees, clouds, sky) and 9 garden backdrops |
| `papers.js` | 12 real paper scans (ambientCG CC0, Wikimedia Commons public domain / CC0) used for every paper texture |
| `render.js` | Canvas renderer for every element type, used by both the editor and export |
| `styles.js` | 131 realtime image styles (dreamy motion, flash light, subject FX, datamosh, ASCII, pixel, print, geometric, distort, blur, glitch, light, glass, material) |
| `subject.js` | Finds the subject of a photo or video (people automatically, or anything you click) and follows it through every frame |
| `styles-ui.js` | The Styles panel, the Style section of the inspector and the action bar under the canvas |
| `app.js` | Editor core: stage, selection, snapping & guides, transforms, text editing, crop, history, import |
| `bgremove.js` | On-device background removal (RMBG-1.4 via ONNX Runtime Web) |
| `video.js` | Frame-by-frame video export (WebCodecs H.264 → MP4 or VP9 → WebM, with sound; MediaRecorder fallback) |
| `audio.js` | Sound: video sound and music / voice tracks — playback in step with the timeline, offline mix, AAC / Opus encoding |
| `clips.js` | Video edits: clips one after another, trimming, splitting, reordering, transitions, auto fix |
| `soundpack.js` | 142 recorded sounds (BigSoundBank, CC0), trimmed and levelled by `tools/sounds_prep.py` |
| `sfx.js` | The sound library: the recordings plus designed sounds (risers, ringtones) and 14 music beds made in the browser |
| `sounds-ui.js` | The Sounds panel (library by category, your sounds, previews, sound for every transition / entrance) |
| `timeline.js` | The video timeline under the canvas (clips, text, sound lanes) and the Clip / Sound inspector sections |
| `ui.js` | Panels, inspector, popovers, dialogs |
| `templates.js` | About 379 templates plus text, paper, planner, photo-layout and background presets |

Work is autosaved to the browser (IndexedDB). Use **Menu → Download project file** to keep a portable `.studio.json` — or a `.studio.zip` once the design holds videos, sound or full-size photos (the files ride inside it as they are).

## Video editor (several clips, music, transitions)

Start one from the home page (**Video editor** — pick or drop several videos and photos at once) or open the **Timeline** in the bar under any canvas. The new design takes the shape of the first clip, 1920 px on the long side.

- **The timeline** sits under the canvas (drag its top edge to make it taller): the **Video** track holds the clips one after another, **Text & layers** above it shows anything timed, **Sound** below holds music and voiceovers with their waveforms. Click or drag on the ruler to move the playhead; the canvas shows that moment and you can edit right there. Zoom with the slider or ⌘/Ctrl-scroll, *Fit* shows the whole video.
- **Clips**: drag a clip to put it somewhere else, drag its edges to trim (everything after it moves up — no gaps), press **S** (or ⌘B) or the scissors to split at the playhead, ⌘D / the copy button to duplicate, ⌫ to delete. Photos show for 3 s (drag the edge or set *Shows for*). Each clip keeps everything a photo or video layer has: speed (5–400 %, smooth slow motion), **Play backwards**, crop and position (*Fill* or *Fit* the frame), filters and film looks, the 131 Styles, blur, animation — plus **Auto fix**, which evens out exposure, contrast and colour from the clip itself. *Take out of the video track* turns a clip into a free layer over the video (picture in picture); a free photo or video gets *Put in the video track*.
- **Transitions**: the small square between two clips — Cut, Dissolve, Dip to black, Flash, Slide, Push, Whip pan, Wipe, Circle, Zoom, Blur, Spin and Glitch, with their length (0.1–3 s), a direction for the moving ones, *Apply to all clips* and *Preview*. A transition overlaps the two clips by its length.
- **Layers over the video**: tracks above the video track hold anything that plays over it — videos and photos (picture in picture: the *Layer* button or the **+** on *New layer* adds them at the playhead), titles, stickers and shapes. Drag a bar along to move it in time, its edges to trim (a video's left edge trims the clip itself), or up and down to another track — a higher track draws on top. Drop files onto a layer track to add them there.
- **Text**: the *Text* button adds a title at the playhead for 3 s; drag its bar to move it, its edges to change when it comes and goes. Any layer with timing shows here.
- **Sound**: every video keeps its own sound — mute it, set its volume (up to 200 %) and fades in the clip's *Sound* row. **Music** adds any sound file (mp3, m4a, wav, ogg, opus, flac…) at the playhead; drag it along, trim either end, split it, and set its volume, fade in / out and *Loop to the end of the video* when it's selected. **Voice** records a voiceover from the microphone while the video plays from the playhead. Dropping files on the timeline puts sound files on a sound lane and videos / photos into the video track where you drop them. The canvas inspector's **Sound** section lists the tracks and adds music to any design, animated or still (a still design grows to the music's length).
- **Groups (compositing)**: adding a template over a video brings all its layers in as **one group** — one bar on one track, starting at the playhead — instead of a track per layer. Click the bar for the group's settings (name, opacity, blend, hide, a **Style** for the whole group — its layers are styled together as one picture — Ungroup, Delete); double-click it (or its ›) to **open** it: the timeline then shows the group's own layers on their own tracks, which you can move and trim inside the group's window (shaded outside). *All tracks* (or Esc) goes back. Move the group to move everything in it, entrance timings included; trim its ends to cut it. Any layers can be grouped: select them and press the *Group* button or ⌘G (⇧⌘G ungroups).
- **Selecting several**: Shift- or ⌘-click clips and layers on the timeline (or on the canvas) to select more than one; the inspector then changes them together — Style, transitions, speed and play backwards, sound, look, adjustments, film effects, blur, frame and motion.
- **Scrolling**: the mouse wheel / trackpad scrolls the timeline up and down, Shift + wheel or a sideways swipe scrolls along it, and ⌘ / Ctrl + wheel zooms it — the canvas stays where it is.
- **Sound tracks**: as many as you need; drag a sound up or down to another track, mute a whole track from its label, drop files or library sounds where they should play.
- **Export** mixes all of it into the video: AAC sound in MP4 (Opus where the browser has no AAC encoder), Opus in WebM, and a `sound.wav` next to PNG frame sequences. A *Sound* switch leaves it out. Changing a clip's speed changes the pitch of its sound, the same in the preview and the file.

## Sounds (music and sound effects)

The **Sounds** tab holds about 160 sounds, free to use anywhere:

- **Real recordings** (from BigSoundBank by Joseph Sardin, CC0):
  - *Transitions*: 10 whooshes and swishes, whip crack, light and bulb flickers, neon hum, light and power switches.
  - *Phone & typing*: typewriter (and bell & return), laptop and desktop keyboards, mouse clicks, message and notification sounds, landline, old telephone, phone booth and office rings, rotary dial, phone vibrate, calling tone, desk bell.
  - *Camera & film*: shutters (incl. DSLR), burst, paparazzi, film camera click and advance lever, Super 8 and 16 mm cameras, 8 mm and cinema projectors, slide projector, film reel rewind.
  - *Everyday*: footsteps on wood, gravel, leaves, snow and stairs, high heels, creaky floor, thud and body fall, knock, doors, pencil writing and signing, page turns, book, paper tear and crumple, keys, zipper, pouring, espresso machine, match, splash, drips, applause, record scratches, needle drop, clock ticking, alarm clock.
  - *Nature & places*: dawn chorus, blackbird, robin, nightingale, owl, crows, birds in town, forest, forest stream, crickets, summer insects, countryside at night, frogs, brook, mountain stream, waterfall, rain, rain & thunder, thunder, waves, ocean beach, wind (strong, trees, whistling), fireplace, campfire, town square, café, city street. Ambiences loop seamlessly.
  - *Drums & hits*: snares, hi-hats, ride and crash cymbals, toms (the same kit plays in the music).
- **Designed in the app**:
  - Transitions: riser, down sweep, reverse swell, impact boom, tape stop.
  - Original ringtones and notification tones played on modelled marimba and vibraphone: *Marimba*, *Morning*, *Vibraphone* and *Digital* ringtones, *Three-note chime*, *Marimba note*, *Glass tap*, *Soft vibes note*, *Pop note*, plus a *Phone keyboard* typing sound. These are original melodies, not copies of any phone maker's tones.
- **Music** — 14 loopable beds with real drums and cymbals, FM electric piano, piano, upright bass and nylon guitar, plus the music box and thumb piano, which are real recorded notes:
  - *Lo-fi*: Lo-fi afternoon, Lo-fi rain (with real rain), Lo-fi night (with crickets), Music box lo-fi.
  - *Jazz*: Slow jazz (brushes, ride, walking bass), Café jazz, Bossa evening.
  - *Others*: Ambient haze, Piano story, Boom bap, Upbeat pop, House groove, Cinematic pulse, Thumb piano.
- **Using them:**
  - Search, preview (▶), then click to add at the playhead (an effect lines its loudest moment up with the playhead) or drag one onto a sound track. *Yours* lists the sound files you've added; *Upload sound* and *Record* sit at the top.
  - In a video edit, music and ambiences loop to the end; on a still design a music bed sets the length.
  - **Sound for every transition** puts the effect that fits each cut (a whoosh for a push, a boom for a dip to black, a flicker for a glitch…); **every entrance** adds a flick, swish, thud or typing sound to each layer that animates in. Running either again replaces the ones it added before. The transition picker also has *Add a sound*.
- Library sounds aren't stored in projects or project files: they're part of the app and come back when a design opens. Older designs that used a sound since retired get the closest one.

## Finding templates

Templates are sorted by what you're making — **Photos** (looks & styles, photo effects, film, portrait & ID), **Videos** (fast cuts, motion, moving layouts), **Text** (slides, kinetic type, typing & screens, text effects), **Collage & notes** (notes & paper, posters & profiles, posts & planners) and **Explainers** — then by kind inside each, with **Any / Still / Video** to narrow it. With *All* every category shows its first families (*See all* opens it); inside a category each kind gets its own row. The same sorting is on the home page; the Templates panel also links to Styles and Sounds. Search finds templates by name, family, kind or tag.

## Sizes and limits

- **Photos** keep their original file and full resolution (up to 16384 px on a side / about 250 megapixels; bigger ones are scaled to fit). Adjustments are worked out at up to 4096 px, more than any export size needs.
- **Videos** keep their original file too, sound included — no size cap beyond what the browser can play (mp4, mov, m4v, webm, mkv). iPhone HEVC .mov files may need converting to H.264 in browsers without HEVC.
- **Length**: designs and video edits run up to 10 minutes (sliders go to a minute or the current length; type a longer value). Exports past ~400 MB are built in pieces so they don't hit the browser's single-buffer limit.
- Media is saved in the browser once (IndexedDB), not with every autosave, and media no design or template uses any more is cleared out when the app next opens. The browser is asked to keep the storage (persistent storage) so big projects aren't evicted.

## Use it on another computer

1. **Get the app**: copy `studio/dist/collage-studio.html` (one file, about 8 MB) to the other laptop — USB stick, email, Drive, AirDrop, anything. Double-click it; it opens in Chrome, Edge, Brave or Arc (Safari and Firefox mostly work, but video export and background removal are best in Chrome/Edge). Keep it in the same folder so the browser keeps its saved designs together.
2. **Move your designs**: designs are saved inside the browser, so they don't travel with the HTML file. On the home page use a design's **⋯ → Download project file** (a `.studio.json` with its photos, videos and uploaded fonts inside), copy that file across, then on the other laptop click **Open file** on the home page. It lands in *Your designs* there.
3. **Offline**: the editor, templates, your photos and videos, and image / video export all work with no internet. Only two things need a connection: Google Fonts (without it, text uses the computer's own fonts until you're online) and background removal (a one-off ~40 MB model download).

To refresh the file after changing the code: `python3 studio/tools/build_single_file.py`.

## On a phone

Open the same link on a phone and the editor switches to a phone layout on its own (and back on a laptop — nothing changes there):

- The canvas fills the screen. **Pinch** to zoom, **two fingers** to pan, drag an empty part of the canvas with one finger to move around, **tap** empty canvas to deselect, **double-tap** text to type, **long-press** a layer for its menu (duplicate, copy properties, flip, arrange, delete…).
- A **tool strip** runs along the bottom, like Snapseed or Photoshop Express. With nothing selected it has Styles, Templates, Text, Photos, Elements, Backdrop, Canvas, Layers and Animate (plus Play once something moves). Select a layer and it changes to that layer's tools — for a photo: Replace, Crop, Blend, Photo, Studio, Looks, Adjust, Film, Blur, Frame, Effects, Motion, Position, Duplicate, Delete; for text: Edit text, Font, Style, Effects…
- Each tool opens **one small sheet** with just its controls, with the canvas still in view above; ✓ closes it, and switching layers keeps the same tool open. Templates, Text, Photos and the other libraries open as tall sheets that fold away as soon as you add something.
- Menus, colour pickers and dialogs (export, canvas size…) slide up from the bottom. Handles are bigger for fingers.
- Turn the phone sideways and the sheets sit beside the canvas instead of under it.

## Styles (131 realtime looks)

The editor opens on **Styles** (first button on the left). Pick a style and it is applied at once: to the selected
layer(s) — a photo, a video, text, a sticker — or, with nothing selected, to the **whole canvas** (the line *Applies to*
under the tabs says which). Every thumbnail is the real style run on a small copy of what it would land on, so you see
your own photo in each look. **Explore** lists them by family; **Favorites** keeps the ones you star (★ on a tile);
the search finds names and tags (Mono, Retro, Glitch…).

- **Dreamy Motion** (made for videos — they drift and breathe as the clip plays): **Light Smear** / **Golden Drift** —
  bright things leave long light trails and faint ghost copies, like a slow shutter dragged across a field at golden
  hour (colour: Golden hour, As shot, Cool dusk, Rose dusk; trail length and direction, ghost copies, how much of the
  sharp picture stays, light glow, soft focus, haze at the top, dark edges, grain, a slow camera pan so the trails sweep
  even on a still photo). **Dream Glow** / **Night Bloom** —
  blown, blooming highlights, a moonlit blue (or teal, rose, amber) grade, soft focus melting into dark dreamy edges,
  grain, a hand-held drift and specks of light.
- **Flash Light** (people and things turned into glowing white light, as if lit by a flash in the dark): **Flash Light**,
  **Night Flash** (the rest goes dark and cool), **Strobe Flash** (flashes on and off to a beat), **Overexposed** (blown
  out but you can still see who it is), **Neon Flash** (coloured light on black). Settings: glow, how much light, keep
  detail, edge light, light colour, how dark the rest gets and its colour (natural, cool night, black & white, warm,
  blackout), flicker, strobe and its speed, grain. **What lights up**: put a Flash style on a photo or video and every
  person in it is found straight away (on a video, followed through every frame — a progress bar shows it; quick on
  a computer with a graphics card, up to about a second a frame without one). The Style section's **/ Subject** part shows what was found: **People** turns the automatic
  people finder on or off, **Pick objects** lets you click anything on the canvas — a stool, a car, a dog, a cup — and
  it lights up at once; click more things to add them, Alt-click a dot to take one away, then **Done** follows them all
  through the video. The bin forgets the subject. A new photo or video in the layer is looked at again by itself.
- **Subject FX** (effects made from the subject itself — found the same way as for Flash Light: people straight away,
  **Pick objects** for anything else, followed through every frame of a video): **ASCII Subject** (the subject rebuilt
  from characters — flickering, raining down, scrambling in or still; 15 character sets or your own, colours from the
  picture or one ink, glow), **Matrix Rain** (green katakana rain falling only inside the subject), **Neon Outline**
  (1–4 glowing lines around the subject — two colours or rainbow, pulse, marching dashes), **Hologram** (see-through
  cyan light, moving scan lines, flicker, slipping rows), **Echo Trail** (afterimages following the subject as it moves —
  rainbow, one colour or its own; on a photo the copies step away), **Glitch Subject** (slipping slices and split colour
  on the subject only), **Pixel Subject** (mosaic, dots, or dissolving into blocks that float away), **Colour Pop** (the
  subject in colour, the rest black & white), **Silhouette** (a flat colour or gradient shape, optional outline),
  **Spotlight** (the scene in the dark with a pool of light that follows the subject), **Heat Vision** (the subject hot,
  the world cold blue), **X-Ray** and **Sticker Cut-out** (a thick white border and shadow, jiggling to the beat).
  Most have a **Background** choice (as it is, darker, black & white, blurred, black or a colour), and ASCII, Hologram,
  Pixel, Colour Pop and X-Ray can be turned around with **Effect on → Everything else** (say, an ASCII world around a
  real person).
- **Datamosh** (real datamoshing on videos: each frame's motion is pushed through the *previous* broken picture instead
  of the clean one, as if the key frames were cut out of the file, so things melt and smear into each other):
  **Datamosh** (melt, block size, new detail, drift so it never sits still, a clean frame every few seconds, heal,
  colour bleed), **Bloom Mosh** (rainbow-coloured smears with bloomed highlights), **Mosh Blocks** (macroblocks from the
  wrong place and flat colour blocks, in clumps), **Pixel Drag** (rows of pixels dragged into long streaks — right, left
  or both), **Block Dropout** (patches that stop updating, slip sideways or lose their colour). On a still photo the
  motion is simulated. Jumping around the timeline starts the mosh again from that moment; exports always run from the start.
- Any style can be kept to **only the subject** or **only the background** (*Apply to* under / Subject, on photos and
  videos) — say, a dither on the background behind a sharp person.
- **ASCII & Text**: Characters (17 character sets — Standard, Classic ASCII, Blocks, Braille, Binary, Katakana… — or your
  own), ASCII Studio, Block, Dots, Mixed, Braille (real 2×4 dot characters).
- **Pixel & Blocks**: Pixel Art (Pico-8, NES, Game Boy… palettes, outline, dither), Mosaic, LEGO (real brick colours, studs),
  Voxel (isometric cubes), Hex Mosaic, LED Matrix.
- **Print & Paper**: Dither (15 algorithms — Bayer, clustered halftone, lines, blue noise, Floyd–Steinberg, Atkinson, Stucki,
  Sierra — 16 palettes, 3 chroma modes), Stippling, Risograph (two inks, grain, misregistration), Comic, Sketch, Engraving,
  Warhol, Blueprint, Halftone, Woodblock, Posterize, Mezzotint, Pointillize, Crosshatch, CMYK Drops, Cyanotype,
  Honeycomb Screen, Crumpled Print.
- **Geometric**: Cross, Diamond, Lines, Diagonal, Specimen (sample boxes with magnified insets), Low Poly, Droste,
  Truchet, Iso Extrude, Flow Field, Lattice, Topography, Forms, Schematic, Neon Grid.
- **Distort**: Smudge, Pinch, Spherize, Twirl, ZigZag, Ripple, Polar, Shear. **Blur & Focus**: Motion, Tilt-Shift,
  Gaussian, Radial.
- **Glitch & Signal**: CRT Screen, Pixel Sort, Forensics, Digital Distortion, Lofi, RGB Split, Scanline,
  Thermal (Ironbow, Rainbow, Arctic…), Beacon.
- **Light & Color**: Disco, Anaglyph 3D, Gradient Map, Prism, Dreamdust, Light Wind, Kaleidoscope, Warpbloom, Duotone,
  Edge Glow, Aberration.
- **Glass**: Frosted, Tinted (stained glass), Shatter, Vitrine, Glass Orb, Fluted, Cross Reeded, Hammered, Diamond,
  Hexagon, Ripple, Ice Crackle, Chevron Prism, Seedy Bubbles, Glass Pixel, Jello.
- **Material & Texture**: Waves, Oil Paint, Watercolor, Chrome, Thin-Film, Marble, Molten Metal, Crystallize, Emboss,
  Petrol Sheen, Heat Tint.

The inspector's **/ STYLE** section holds the style's own settings, then **/ Backdrop** (for mark styles: blurred image,
black, a colour, the original or see-through; softness, opacity, blend mode, mark opacity, invert mapping, dot grid),
**/ Intensity** (coverage, brightness, contrast — or effect strength) and **/ Motion** for styles that move in videos
(Disco, CRT flicker, Datamosh, Jello, Ripple…; *Animate in videos* and *Speed*). Change style with the picker, **Restyle**
for new random settings, **Shuffle** for another style, the bin to remove it. On a layer, *Keep the layer's outline*
keeps a cut-out or text shaped like itself. Styles work on videos frame by frame and in every export.

The bar under the canvas: tools, then **Upload**, **Inspire** (a sample photo to try styles on), **Restyle**,
**Shuffle**, **Library** (your photos) and **Export**.

The **Image styles** template family (29) shows one look each on a demo photo — Golden drift (video), Dream glow (video),
Flash light, Night flash, Neon flash, ASCII subject, Matrix rain, Neon outline, Hologram, Sticker cut-out (all video),
Colour pop, Datamosh, Bloom mosh, Mosh blocks, Pixel drag, Block dropout (all video), ASCII
portrait, 1-bit dither, Pixel art, Brick mosaic, Risograph print, Halftone poster, Cyanotype, Fluted glass, CRT screen
(video), Thermal camera, Kaleidoscope (video), Liquid chrome, Edge glow — swap in your own photo or video.

The editor's look: near-black chrome with hairline borders, white as the only accent, Geist for words, Geist Mono for
numbers and `/ SECTION` labels, Geist Pixel for display type (all free Google Fonts).

## Real paper

Every paper texture in the app — the background's *Paper texture* finish, paper on shapes and bordered photo frames, the
Vox explainer looks and the templates that use paper — is a scan or photo of real paper (no more generated tile). Pick one
in **Canvas → Real paper** or under **Finish → Paper texture**: *Natural* (the default), *Cotton*, *Vellum*, *Creased*,
*Recycled*, *Kraft*, *Laid*, and aged sheets *Aged*, *Parchment*, *Folded letter*, *Water-stained*, *Burnt edges*. The scan
is laid over your background colour (multiply), stretched once across the canvas so it never repeats, and turned to suit
landscape canvases; *Amount* sets how strong it reads. Texture boil re-crops and flips it every frame. The Vox looks use
Natural (Paper), Recycled (Newsprint), Aged (Archive) and Cotton (Clean).

Sources (free to bundle): ambientCG Paper001, Paper002, Paper003, Paper004, Paper006 (CC0, ambientcg.com); Wikimedia
Commons “Old paper1/2/6/7.jpg”, “Old Paper texture.jpg” (public domain) and “Pergament.2.jpg” (CC0). Prepared with
`tools/papers_prep.py` (normalised so the sheet is white and its fibres, folds and stains remain).

## Home page and your designs

The app opens on a home page:

- **Start something new**: one click for a portrait post, square post, story/reel or landscape canvas, start from a photo (click or drop), start a **Video editor** project from several clips, or pick any custom size and colour. Templates sit below, grouped into families, with the same tag filters as the editor.
- **Your designs**: every design you start is kept as its own project in this browser, with a thumbnail, its size and when it was last edited. Tabs split them into **Drafts** (everything autosaves as a draft) and **Saved** (press ⌘S / Ctrl+S, click the *Draft* chip next to the design name, or use *Mark as saved*). Sort by last edited, newest or name, and search by name.
- Each card's **⋯** menu opens, renames (or double-click the name), duplicates, moves between drafts and saved, downloads the project file or deletes — with an Undo right after deleting.
- **Menu → Home — all designs** (or *Back to editor* on the home page) moves between the two. Opening a `.studio.json` or `.studio.zip` file adds it to your designs.

Designs live in this browser's storage, so clearing site data removes them — download project files for anything you want to keep elsewhere.

## My templates

- **Save as template** (⋯ menu → *Save as template…*, or the *Save this design* tile at the top of the Templates panel): keeps the whole canvas — every layer, its photos and videos, the background, finish, camera move and animation — under **My templates**. The design you're working on isn't changed.
- My templates show first in the Templates panel and on the home page. Clicking one starts from it like any built-in template (on an empty canvas it loads straight away; otherwise you can replace, add its layers, pick pieces or take its background). Every photo slot can then be replaced as usual.
- Each card's ⋯ menu: *Rename*, *Replace with this design* (update the template with what's on the canvas now), *Download template file*, *Delete* (with Undo). *Save as* in the save dialog can also overwrite an existing template.
- **On another computer**: *Download template file* gives a `.template.studio.json`; *Open file* on the home page (or ⋯ → *Open project file…*) adds it to My templates there. Uploaded fonts used in the template travel inside the file.
- Templates live in this browser's storage, like your designs.

## Layout of the editor

- **Top bar**: menu (new, open, save, canvas size, shortcuts), name, undo/redo, **Animate** and **Export**.
- **Left rail**: Templates, Elements (garden, ribbons, lines, shapes, paper, calendars, camera overlays, stickers), Text, Photos, Canvas, and Layers at the bottom. Each panel shows a short shelf per category with **See all**; click the active tab again to fold the panel away.
- **Inspector**: shows the common settings for the selected layer first. Less-used controls sit behind **More options**, and Effects, Motion and canvas Finish start empty with a **+** to add only what you need.
- **Dock** (bottom centre): select, hand (`H`), add text, shapes, photos, eraser. Zoom and grid/snapping live bottom right.

## Ribbons, garden and camera looks

- **Ribbons**: bands or thin lines with text running along a path (wave, loop, swoosh, arc, S-curve, spiral, circle…). Double-click one to drag its points, add points from the midpoints, or double-click a point to remove it. *Text flow* makes the words travel along the ribbon; *Draw on* grows lines and arrows in.
- **Garden**: painted lawns, flower beds and clouds are layers you can stack behind a cut-out photo; add a **Ground shadow** to the photo to stand it on the grass.
- **Photo looks**: Noise, Fisheye, plus presets such as Gym grit, Ghost, Haze and Lens.
- **Studio look** (on any photo): the person is cut out once (with the background-removal model) and re-lit on a seamless studio backdrop — presets Ember, Spotlight, Blue hour, Clay, Studio grey, Lime, Noir and Blush, with light type (soft key, spotlight, side, top, flat), backdrop/shadow/light colours, brightness, how much the person takes on the backdrop colour, rim light and a soft wall shadow. It never changes the original photo and can be switched off. The *Studio portrait* templates use it.
- **Blur** (its own section on any photo): None, Motion, Zoom, Spin, Soft, Tilt-shift or Double, with an amount slider and the controls that type needs — direction, the centre point, or the sharp focus band.
- **Film gate frame** (Frame → *Film gate*): a projected-film border — dark gate, rounded corners and a soft burnt-in edge. Set its colour and border width, and under *More options* the corner roundness and how soft the edge is.
- **Halation** (Look → *Halation*, or the slider under *Film effects*): the red-orange glow that bleeds around highlights on film — city lights, sun, white skies. Works on photos, videos and the canvas background; its colour can be changed under *More film effects*.
- **Blur spots**: under Blur → *Where*, choose *Everywhere*, *On spots* (blur only around chosen points) or *Off spots* (keep those points sharp and blur the rest). *Place on photo* lets you click the photo to drop spots, drag a spot to move it, drag its ring handle to resize and double-click to remove (Esc when done). Each spot also has a size slider, *Softness* sets how gently the blur fades, and background photos get position sliders instead.
- **Camera overlays**: phone camera interface, camcorder and viewfinder, with an optional wide-lens black edge and editable labels.

## Film

- **Looks** (Look section on any photo, video or background photo): presets in shelves — *Film*, *Colour*, *B&W*, *Print*, *Effects*. The Film shelf has film stocks and processes named for the look: Gold 200, Portrait 400, Vivid 100, Green 400, Tungsten 800, Halation, Slide 50, Expired, Disposable, Instant, Super 8, Cinema (teal & orange), Two-strip, Cross process, Bleach bypass, Overexposed, Pushed, Light leak, Negative and Vintage. B&W adds Pan 400 and Soft B&W.
- **Adjust**: Exposure, Contrast, Highlights, Shadows, Temperature, Tint, Saturation and Vibrance up front; *More adjustments* has Brightness, Blacks, Fade, Hue, Sharpen, Clarity, Noise, Fisheye and the print effects (Mono, Sepia, Halftone, Photocopy, Duotone).
- **Film effects**: Halation, Bloom, Film grain, Vignette, Light leak and Dust up front; *More film effects* has grain size, halation and leak colours, which edge the leak comes from, Colour fringe (chromatic aberration), Cross process and Split tone (a colour for the shadows, another for the highlights, and the balance between them). On a video, grain and dust change every frame.
- **Film frames** (Frame section): *Negative scan* — a 35 mm strip with lit sprocket holes, amber edge print and frame numbers (edit the print, number and colour); *Slide mount* — a card slide mount with a printed label and number; *Filed edge* — the rough black border of a filed-out negative carrier (roughness and *New edge*); and *Film gate*.
- **Canvas → Finish** adds film over the whole design: Film grain (with size), Dust & scratches, Film burn, Flicker, Gate weave (the picture hops slightly every frame, like film in a projector), Light leak, Vignette and more. Flicker and gate weave turn a design into a video; grain, dust, light leaks and burns move while it plays. **Crumpled paper** has *Creases over the layers too*, so folds and shading run over text and photos and they look printed on the sheet; **Window light** adds soft light falling across the frame.
- **Canvas → Canvas blur** blurs the whole finished frame — every layer and the background: Motion, Zoom, Spin, Soft, Tilt-shift or Double, with amount, direction or centre, and *Where* (everywhere, on spots, off spots). It shows live in the editor and in every export.
- **Film looks** template family (16): Gold 200, Portrait 400, Night 800T, Super 8, Expired roll, Disposable, Film burn, Vivid 100, Green 400, Widescreen, Cross process, Light leak, Bleach bypass, Two-strip, Pan 400 and Projector reel (9:16). Each is one photo-or-video slot with the look already on, plus date stamps, captions or a projector gate.
- **Film camera** template family (10): Contact sheet (strips of negatives with grease-pencil marks), Countdown leader (3-2-1 film leader into your clip), Film strip, Light table (slide mounts), Instant stack, Darkroom (prints drying under the safelight), Negative scan, Half frame (two pictures in one frame), Medium format and Photo booth.
- Heavy looks on a video (bloom, halation, sharpen) are graded at a smaller size while previewing so playback keeps up; the export uses full size.

## No background (see-through exports)

- **Canvas → No background (see-through)**: nothing is painted behind your layers; the canvas shows a checkerboard while you edit. Choosing a colour, photo, pattern or preset brings a background back.
- **Images**: PNG and WEBP export see-through (the export switch starts on). JPG can't hold transparency, so it gets white behind it.
- **Videos** (Export → Video → *Transparent background*): **WEBM** keeps the transparency — it plays see-through in Chrome, Edge and Firefox and in editors that read WEBM. **PNG frames** saves a .zip of numbered see-through PNGs to import as an image sequence (Premiere, After Effects, DaVinci Resolve, Final Cut). MP4 can't hold transparency, so it isn't offered while the switch is on.
- Grain, vignette and the other canvas finishes only touch the layers, never the empty parts.

## Video speed and smooth slow motion

Select a video (a layer or the canvas background) and the **Playback** section has:

- **Super slow 15% · Slow 40% · Normal · Fast 200%**, and a **Speed** slider for any percentage from 5% to 400%.
- Slowing a clip down lengthens the design so the whole slowed clip plays (up to 10 minutes; *Fit length to clip* does the same by hand).
- **Smooth frames** (for anything slower than 100%):
  - **Flow** (default) — new in-between frames follow the motion in the clip, like a phone's slow-mo. The clip's frame rate is measured, the two real frames either side of each moment are taken, the motion between them is worked out both ways, and each in-between frame is drawn by moving the pixels part of the way. On a test pan it scored 35–39 dB against the true in-between frames, about as good as the real frames.
  - **Blend** — in-between frames cross-fade from one real frame to the next: soft, no warping, quicker to export.
  - **Off** — the clip's own frames, held: it steps, the classic choppy slow-mo.
- The smooth frames are made when you **export**; while you edit, the preview plays the plain clip at the chosen speed. Flow takes longer to export than Blend (roughly a tenth of a second per frame at 720p on a laptop).

## Vox explainer (with its own editor)

Explainer videos in the Vox style: everything sits on textured paper, key words get a yellow highlighter swipe, a red
marker circles a word or draws an arrow, archival photos are halftone black-and-white cut-outs with torn white edges and
tape, graphics move in held steps at 12 frames a second ("on twos"), the paper texture boils, every beat has its own
camera move — and the lens hunts for focus while it moves — and beats hard-cut into each other.

- **Templates → Vox explainer** has 26 types, each in Story 9:16, Portrait 4:5, Square 1:1, Landscape 16:9 or your canvas
  size. Five complete stories — *Full explainer*, *Parallax story*, *Data story*, *Investigation*, *Internet moment* —
  and 21 single beats:
  - **Parallax**: *Cut-out parallax* (2.5D: your photo far back, big words in the middle, the subject cut out in front
    with a white paper edge — each layer glides and swells at its own speed; press *Cut out the subject (2.5D)*),
    *Photo wall parallax* (prints in three depths, far ones small and soft, near ones big and sharp), *Paper layers
    parallax* (a paper diorama: a sun disc and torn bands rising at different speeds).
  - **Type**: *Title card*, *Chapter card* (big number under a torn paper band), *Pull quote*, *Dictionary entry*.
  - **Paper**: *Highlighted document* (camera pushes into the line, red circle round a word), *Headline montage*
    (clippings cut in one after another), *Declassified page* (lines blacked out bar by bar, one lifted and highlighted, a
    stamp).
  - **Photo**: *Archival photo*, *Then vs now* (two photos side by side or stacked), *Photo callouts* (dots, leader lines
    and labels on details).
  - **Data**: *Big number* (rolls up), *Bar chart* (bars grow from the baseline, one highlighted), *Line graph* (draws
    itself, end value pops), *Timeline*, *Ranked list*.
  - **Screen**: *Map route*, *Search bar* (typed question, suggestions drop down; made-up search site), *Social post*
    (made-up app, key phrase highlighted).
- **Canvas → Vox editor** builds the video beat by beat: each scene has its own fields, photo slots (photos or videos),
  a **Length** slider and up / down / remove; **+ Add a scene** lists every type by group. Clicking into a scene jumps
  the preview to it. **Look**: Paper, Newsprint, Archive (aged, grungy) or Clean. **Stepped motion**, **Focus hunting**
  and **Texture boil** are sliders/toggles for the whole video.
- The layers are written from the editor, so they can't be dragged on the canvas. While paused, the canvas shows the
  first scene. Resizing the canvas re-flows every scene.

**Camera → Focus hunting** (any camera move, any design): as a push-in or pull-out gets going the lens drifts soft, sharp,
soft again and locks focus about 40% in, with a touch of focus breathing (the framing swells with the focus).

**Canvas → Finish** adds **Grunge** (ink stains, dry-brush streaks, specks, scuffs; *New grunge* reshuffles), **Texture
boil** (paper, grunge and your texture are dealt again every frame — the hand-made shimmer) and **Your texture**: any image
(a paper scan, a texture you downloaded from a free texture site) laid over the frame with Multiply, Screen, Overlay, Soft
light, Hard light or Luminosity. The textures in the app are generated in code; downloaded textures are yours to add per
design because sites like Texture Labs don't allow bundling theirs into an app or its templates.

## Moving layouts (any orientation)

Eight moving layouts, grouped into three families: **Moving grids** (Scrolling wall, Card trail, Grid build, Zoom wall), **Photo piles** (Photo drop, Fan stack) and **Strips & panels** (Strip conveyor, Slide-in panels). Each family card lists its types; choosing a type then asks for the ratio — **Story 9:16, Portrait 4:5, Square 1:1 or Landscape 16:9** — and the one that fits your canvas comes first, plus a **Your canvas** option built for any other size (Pinterest pin, A4, custom…). **Resize the canvas later and the layout re-flows** to the new shape, keeping the photos and videos you added and any text or stickers on top.

- **Scrolling wall** — rows (or more rows on tall canvases) of rounded, slightly bulging screens gliding sideways.
- **Card trail** — cards pop up one after another along a winding path (across on wide canvases, down on tall ones); the oldest drop away as it moves on.
- **Grid build** — a mixed-size grid fills one photo at a time, a few cells left dark.
- **Photo drop** — white-bordered prints tossed onto a pile one by one.
- **Fan stack** — a fan of prints opens out from the middle, then more land on top.
- **Strip conveyor** — video strips of different widths slide past, some split into stacked tiles; on tall canvases they run as bands going up.
- **Zoom wall** — a wall of photos fades in, then the camera pushes in to the one in the middle.
- **Slide-in panels** — panels slide in from alternating sides (columns, rows or a 2×2 grid depending on the shape).

**Fill photo slots** (Canvas inspector, when nothing is selected): pick several photos or videos at once and they go into the slots in the order they appear; with fewer files than slots they repeat. Select several photos and *Replace these with your photos* does the same for just those.

New motion: **Drift across** (Motion → Loop) glides a layer steadily over the whole video by a set distance across and down; **Toss in** (Motion → Entrance) drops a layer in big and turned, settling flat like a print landing on a pile.

## Photo effects and Paper & ID

- **Photo effects** template family (27): Halftone scribble (halftone portrait with yellow marker scribbles), Shredded (photo cut into offset strips), How much can you see (red block with a scattered sentence), Mosaic grid, Mirror repeat (with a mirrored name), Eye strip, Then & now (childhood photos across the eyes), Note over face, Word grid (a sentence laid out word by word over a tinted photo), Brand fade, Face swap, Ghost blur, Retro phone screen, Signed booth (portraits with signatures), Red bar, Taped to the wall, Print on red, Studio backdrop and Grid paper portrait.
- **Handwritten layouts** (in Photo effects): Ink letter (a scrawled letter with a photo laid over the middle lines), Quote & booth strip (blue pen script with a tilted photo-booth strip), Field notes (pen capitals, a circled word, underlined notes and pen guide lines running past the photo), Red marker notes (two polaroids with red marker writing), Stay in touch (a polaroid with blue pen capitals), Margin scribbles (a portrait with writing running up and down its edges), Worthy (a big red word and a strike line) and Sketchbook story (pen drawings of a lamp, a vase and a clock around a photo). Every word is a normal text layer.
- **Handwriting fonts** picked to match ink, pen and marker writing (all free Google Fonts): Zeyada, Dawning of a New Day, Whisper, Ms Madi, Herr Von Muellerhoff, Cedarville Cursive, Marck Script, Bad Script, Beth Ellen, Kristi, Square Peg, The Girl Next Door, Loved by the King, Just Me Again Down Here, Sue Ellen Francisco, Architects Daughter, Waiting for the Sunrise, Over the Rainbow, Nanum Pen Script, Nanum Brush Script and Mansalva. They're under Script and Handwritten in the font picker.
- **Pen sketches** stickers (Elements → Pen sketches): thin fine-liner drawings of a pendant lamp, a vase of stems, a wall clock, a potted plant, a mug, a chair, a stack of books and a window, plus a pen mark, corner lines, an underline and a circle. Recolour them like any sticker.
- **Paper & ID** template family (10): Mugshot record (height chart, fingerprints, rubber stamps), Inquiry stamp, ID badge, A portrait of you, Certificate, Personal record, Pass card, Friendship application, About me note and Profile card. Field text, names and numbers are ordinary text layers.
- New photo frames that cut the picture up: **Shredded strips** (number of strips, gap, how far they slide, *Shuffle*), **Mosaic grid** (tiles across, gap, how many tiles get a flat colour or slip out of line, *Shuffle*) and **Mirror repeat** (washed-out mirrored copies either side of the photo).
- Rewordings from the reference board: “born to die” became “born to create”, the mugshot's charge reads “Stealing the show”, and real agency and brand names were replaced with made-up ones.

## Selecting layers

- **Shift** + click adds a layer to the selection; **Shift** + drag draws a box that adds every layer it touches — even when you start the drag on top of a photo. A layer that surrounds the whole box (like a full-bleed background photo) is left out.
- **Alt / Option** + click removes a layer from the selection; **Alt** + drag from an empty part of the canvas removes everything the box touches. Alt-dragging a selected layer still drops a copy.
- **Measure distances**: with a layer selected — or while dragging it — hold **Alt / Option** to see red measurement lines with the distance in pixels to each canvas edge. Point at another layer while holding Alt to measure the gaps to that layer instead.
- **⌘ / Ctrl** + click toggles a layer. The same Shift / Alt / ⌘ rules work in the Layers panel.
- **Several text layers at once**: select them (Shift-click or box) and the inspector shows the text controls — font, weight, size, alignment, colour, spacing, background — which change all of them. Several shapes work the same way.
- **Blend mode**: every layer (and every multi-selection) has a blend menu next to opacity at the top of the inspector — Normal, Darken, Multiply, Colour burn, Lighten, Screen, Colour dodge, Overlay, Soft light, Hard light, Difference, Exclusion, Hue, Saturation, Colour and Luminosity. Blends mix with the canvas background while you edit, not only in the export.
- **Copy / paste properties**: **⌘⌥C** (Ctrl+Alt+C) copies a layer's whole look — font, size, weight, colours, background, effects, frame, filters, animation — and **⌘⌥V** (Ctrl+Alt+V) pastes it onto the selected layers. Between different kinds of layer, opacity, blend, shadow, blur, animation and fill colour carry over. Also in the right-click menu.
- **Flip**: **⇧H** flips the selected layers horizontally, **⇧V** vertically — text, stickers, shapes, photos and everything else.

## Stop motion

- **Stop motion** (template family: *Stop motion*, *Polaroid flip-book*, *Film reel*): a photo layer that holds a sequence of photos and plays them frame by frame. *Choose photos* picks them all at once (they play in file-name order), *Add* appends more; the frame strip lets you reorder (← →) or remove frames. Set the speed (1–24 fps), *Loop*, *Back & forth* or *Play once*, and *Jiggle* — each frame sits a hair off like it was placed by hand. Frames, filters, crop and outline apply to every frame. Any photo can become one with *Make it a stop motion*.
- **Videos in every photo slot**: every template's photo slot (and the canvas background) takes a video too — *Replace* / *Add photo or video*. *Crop & position* drags and zooms which part shows, *Show the whole video (fit)* letterboxes it instead, *Start at* / *End at* trim it, and *Fit length to clip* sets the design's length.

## Text slides

One **Text slides** family holds 69 typographic quote posters in the style of Pinterest/Instagram carousel slides — every layout from the reference board: staggered Helvetica-style lines on electric blue, words with photo chips set inline, zigzag lines on denim, red reminder notes on lined paper, a redacted paragraph with one phrase left un-struck, grey line highlights (“Chapter : 1”), tape-label slogans, blurred repeated words, a duotone eye in a square, a photo clipped into a star, a pen-scribble page, a text silhouette beside a typewriter quote, embossed serif titles and more. Every word is an ordinary text layer and every photo is a replaceable photo layer. New building blocks they use: a **Pen scribbles** background pattern and a **Person** silhouette shape. The second set (laziest designer, Go for it, Things we should normalize, The time is NOW, Let it happen, All we have are memories, Think big and more) uses free typefaces picked to match the originals: Arimo (Helvetica/Arial metrics), Inter Tight, Roboto Condensed and Archivo Narrow for condensed grotesks, Anton, Antonio and League Gothic for compressed poster type, Covered By Your Grace, Caveat Brush and Permanent Marker for hand lettering, Young Serif, Fraunces, Gloock and Newsreader for the serifs, Silkscreen for pixel type, Yellowtail for the script. Commercial originals (Helvetica Neue, Druk, Cooper and similar) aren't bundled.

## Video templates and camera

- **Speed flashes** (template family + an element): fast, motion-blurred action shots cut over your own photo or video, like the hustle-edit reels. Four templates — *Against the world* (serif quote over a side profile), *No days off* (mono gym flashes with a white pop on every cut), *Run your race* (orange-tinted running shots, word by word) and *Built different* (supercars and city lights, letterboxed). Add flashes to any design from **Elements → Speed flashes**. A background photo or video can be removed from the Canvas panel (the bin next to *Replace*, or *Remove photo* under the background photo), from the left Canvas tab, or from the flashes *Underneath* card — with Undo right after. Clicks on the canvas pass through the flashes to your photo or video underneath (select the flashes from Layers, or *Edit the speed flashes on top* in the photo panel); the flashes panel opens with an **Underneath** card to replace that photo or video. Pick a photo pack (Hustle mix, Run, Gym, Fight, Drive, Play, Rise) or add your own photos, then set cuts per second, blur amount and direction, strength and blend (Light, Punchy, Soft, Solid), colour / mono / tint, and under *More*: drift, push-in, overlap (two photos at once), flash on cut, gaps that let your shot breathe, contrast and shuffle.
- **Videos as photos**: anywhere a photo goes — a photo layer's *Replace*, the Photos panel, drag and drop, or the canvas background — you can drop in a video (mp4 / mov / webm / mkv, any size the browser can play). It plays with the design when you preview, and video export seeks it frame by frame so it stays in sync. *Playback* sets where it starts and ends, its speed, whether it loops or plays backwards, and its sound (volume, mute, fades); the design's length grows to match the clip (up to 10 minutes). The sound plays in the preview and goes into the exported video. Your browser has to be able to play the file (iPhone HEVC .mov files may need converting to H.264 first).

- **Template families**: variations of one idea show as a single card with a style count; click it to see every style. Video templates carry a *Video* badge and play when you hover them.
- **Newspaper reveal** (pull-back, crash zoom, snap zoom, hard cuts, slow push-in), **Typing** (type & follow, typed note, crash zoom, terminal), **Match cut** (keyword, night edition, newsprint flicker — you type only the **highlighted word** under *Text in this video*; the headlines and sentences around it are written from it, *Shuffle sentences* picks new ones, and the highlight colour is one swatch), **Kinetic headline** (good news, big reveal, pop words), **Sticky notes** (colour cut, stack, flip-book) with photos printed onto the notes, **Rolling numbers** (years, countdown, price drop), **Word by word** (italic VHS, bold statement, soft whisper) and **Letter bounce** (everyone, glitch hello, pastel).
- **Text entrances**: letters slam / rise / drop / fade in one by one; slide-ins get motion blur automatically; *Captions* shows one line of a text layer at a time for subtitles; *Roll through lines* rolls them up like a counter (optionally speeding up); *Word by word* pops one word at a time; *Letters bounce in* types with each letter landing low and snapping up.
- **Sticky note frame** prints a photo onto the note like ink; **Window-blind shadows**, **VHS scanlines** and **RGB split** are canvas finishes.
- **Camera** (Canvas panel on the right with nothing selected, or Animate → Camera): push-in, pull-back reveal, whip, snap, crash in & out, follow the typing, hard cuts, handheld drift, pan, Dutch tilt, jolt cuts and spiral. Pick what it focuses on, zoom, timing, tilt, handheld shake and motion blur. The camera only frames the layout; it never moves your layers.
- **Typing** (Motion → Typing on a text layer): types at a steady pace with a cursor; tap words to highlight them as a text selection, marker or underline.
- **Text in videos** is typed in the side panel: select a text layer (or double-click it) to get its text box, or, with nothing selected, edit every piece of text in the video under *Text in this video*.
- **Show / hide timing** (Motion): make a layer appear and leave at set times. Layers that take turns create match cuts.
- **Layer blur** (Effects): Gaussian and directional blur on any layer.
- **Blur for text, stickers, shapes and lines** (Effects → Blur): the same blurs as photos — Soft, Motion, Zoom, Spin, Tilt-shift and Double — with amount, direction, centre or focus band. *Where* blurs the whole layer, only around spots (*On spots*), or everything except them (*Off spots*); *Place on text* lets you click the layer to drop spots, drag them and resize them with the ring handle. (The older plain *Layer blur* stays for photos and for designs that already use it.)
- **Thermal** (Effects → Thermal, on text, stickers, shapes, lines, photos and videos) has two looks:
  - **Depth vision** (the default) — the "how robots see" depth-map look of the Rerun artwork visualizer: the subject turns deep blue with its own shading in lighter blue, and a glow spreads out from it through red and yellow into a pale blue field, with slow waves rolling across from one corner, a little noise flow and film grain. On a photo or video the app finds the subject itself (whatever stands out from the backdrop; or choose *Bright parts* / *Dark parts* under More → Subject) and paints the field over the whole box; on text it glows around the letters. *Colours*: Depth (blue · light blue · yellow · red), Jet, Turbo, Dusk, Mono or Custom (five colours of your own). *Glow*, *Melt* (text and shapes), *Waves*, *Flow*, *Moves* (animates in videos); under More: speed, wave length, wave centre, shading inside, grain, *Fill the box with the field* and *New pattern*.
  - **Heat camera** — the layer turns white-hot and glows through yellow, orange and pink to blue. *Heat* sets how far it glows; *Melt* (text, stickers, shapes, lines) warps the letters' edges into soft, bulging blobs instead of keeping the crisp outline — with *Shimmer in videos* on, the edges keep morphing; colours: Thermal, Infrared, Night vision, Ice or Sunset; *Shimmer in videos* makes the heat breathe over time. On a photo or video the brightness becomes the heat.
- **Ink bleed** (Effects → Ink bleed): letters soak into the paper — rough spreading edges, a spray of ink dots around them and an optional smear in one direction. *Bleed*, *Speckle*, *Rough edge*, *Smear* and *Smear angle*; *New pattern* reshuffles the specks. The ink takes the text colour.
- **Type entrances** (Motion → Entrance, on text): **Word build** adds the words one at a time — each pops up from below and the line re-centres as it grows; **Blur shuffle** re-spaces the words along their lines a few times (ragged, wide gaps), each sliding with motion blur, then settles into the paragraph; **Select sweep** drags a text selection across the words (highlight, selected-text colour and an I-beam cursor) and slides the line so the cursor stays in view — set *Highlight*, *Selected text*, *Show the cursor*, *Follow the cursor*; **Word wall** fills the canvas with rows of your words (type them with commas between) and lights one up at a time in a second font — *Lit word* font, *Lit colour*, *Lit size*, *Each word* (seconds per word).
- **Type effects** template family (7, video): Word build (heavy caps on deep green, phrase after phrase, the last word swapping, a light ending), Select sweep (yellow selection on brown), Word wall (lead-in line → a blue wall of words lighting up one by one → "You build it with *trust*."), Blur shuffle (electric blue), plus Word build — portrait, Select sweep — night (story) and Blur shuffle — cream.
- **Screen close-up** template family (4, video): *Phrase typing* — each line of the text is typed on an empty teal screen, held a beat, then hard-cut to the next line, framed closer for short phrases (Camera → Screen typing → *One phrase at a time*); *Comment thread* — two comments on a made-up forum app (threadly), filmed through the pixel mesh with a cut between them. Landscape and story sizes. The **Interface icons** sticker set (vote arrows, comment, share, search, like, more, bell) builds this kind of on-screen UI.
- **Text effects** template family (8): Depth vision photo, Depth vision type and Jet colormap (videos with the Depth vision look — swap in your own photo or video), Thermal word (video, the heat shimmers while the camera creeps in), Thermal over photo, Night vision, Ink bleed poster (video, slow push-in on photocopied paper) and Ink on paper.
- **Text tracking** (Motion → + → *Pin to video (tracking)*, on any text, sticker, shape or photo): you choose what the layer sticks to, then press **Track**. *Stick to*: **Point** (click a spot; drag to make the area bigger), **Object** (click a thing and the app finds its outline, or drag a box around it), **Edge** (drag along a table edge, a door frame…), **Plane** (drag a box over a flat surface and move its four corners onto the surface's corners: the layer then follows its perspective too, like text printed on it). The app follows the target through the clip — move, size and turn, even with a handheld camera pushing in fast — and the layer keeps its place relative to it; a dashed outline shows the target while the layer is selected. *Adjust pick* / *Track again* to change it; *Steady* smooths the path (keep it low so the layer stays glued to real shake); *Follow size*, *Follow turn* (off for Point — a single spot can't tell turn reliably), *Motion blur on fast moves*. Works with a video background or a video layer (moved, scaled or turned). Tracking runs in the browser while the clip plays at half speed, so a 10-second clip takes about 20–40 seconds.
- **Typing screen** template family (video, 4 orientations — landscape, story, portrait, square — plus *Your canvas*): a question typed on a white display, filmed close up — you see the screen's pixel mesh, letters made of real screen pixels, soft lens focus, a shallow depth of field and a speck or two of dust. It types with a human rhythm (quicker inside words, a beat at spaces, longer after punctuation) while the camera rides the caret by hand, then pulls back to show the whole line with the cursor blinking. Type **any number of words** in *Text in this video*: the typing, camera and video length follow, and long text wraps onto more lines. Camera → *Screen typing*: typing speed, zoom, end hold (and, optionally, photos or videos to cut to between words).
- **Screen close-up** (Canvas → Finish → +): put any design on a "real screen" — pixel size, pixel grid, depth of field and dust. The pixels show when the camera is zoomed in; press play to see the look in the editor.
- **Smooth cam text** template family (video, 4 orientations: story, portrait, square, landscape — plus *Your canvas* for any size): words pull into focus one after another (*you’ve* · *probably* · *seen those*), the camera whips up to the headline with motion blur and a tilt, settles and pushes in slowly, the headline changes into italic with new word sizes, and the exposure flashes at the end. Resize the canvas and it re-flows, keeping the words you typed. New pieces it uses: a **Blur in (focus)** entrance for any layer and a **Smooth cam (keyframes)** camera path.

## Finding the subject (Flash Light, *Apply to* subject / background)

Runs in the browser with Google's MediaPipe Tasks (`@mediapipe/tasks-vision` from jsDelivr): the *selfie multiclass*
segmenter finds people, *magic touch* finds whatever you click. The models download on first use (16 MB for people, 6 MB for
picking, plus the runtime, from storage.googleapis.com and jsDelivr — so it needs a connection) and run on the graphics card when that is quicker,
otherwise on the processor. Every frame of a video is looked at (up to 30 a second; fewer for clips over 80 s), each mask is
sharpened along the picture's own edges and steadied against its neighbours; a clicked spot is followed forwards and
backwards from the frame you clicked on by matching the picture around it, and the model is asked again there — kept
near where the thing just was, looking like it did when you clicked, and with any person touching it cut out (so a
picked chair doesn't slide onto the person sitting on it). The masks are saved with the design (small PNG sheets), so they're found only once.

## Background removal

Select a photo and choose **Remove background** (or **Cut out to layer** to keep the original underneath). The background photo can also have its subject cut out onto its own layer, which makes text-behind-the-subject layouts easy. It runs entirely in the browser with BRIA's [RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4) model: the first use downloads about 44 MB from Hugging Face, which is then cached in IndexedDB. RMBG-1.4 is licensed for non-commercial use; check BRIA's terms before using it commercially. Face slots on outfit figures also use the 1.3 MB [UltraFace](https://github.com/onnx/models/tree/main/validated/vision/body_analysis/ultraface) detector (MIT) to keep just the head.

## Erasing, animation and video

- **Eraser** (`E`): paint over any layer with a round or square brush to erase it; switch to *Restore* to paint it back. Erasing is stored per layer, so it survives moving and resizing and can be reset.
- **Copy & paste**: `⌘/Ctrl C` and `⌘/Ctrl V` copy layers (also through the system clipboard), pasted images become photo layers and pasted text becomes a text layer. **Alt-drag** leaves a copy behind; hold **Ctrl** while dragging to skip snapping.
- **Animation**: every layer can have a loop (stop-motion wiggle, float, jiggle, sway, swing, spin, pulse, bounce, shake, orbit, blink) and an entrance (pop, fade, slide, drop, zoom, spin, typewriter, wipe). **Animate** in the top bar applies a look to every layer at once. Loops fit a whole number of cycles into the video length so exports loop seamlessly.
- **Export**: images and videos at 720p, 1080p, 1440p or 4K (2160 px on the short side). Video is MP4 (H.264) where the browser can encode it, otherwise WebM. If the computer's fast (hardware) encoder gives up at a big size such as 4K, the export starts again with the browser's software encoder (slower, same file type), then VP9 WebM; a failed export says why.

## Fonts and outfits

- **Your fonts**: upload `.otf`, `.ttf`, `.woff`, `.woff2` files or a `.zip` from the font picker or the Text tab. They are registered with the FontFace API, kept in this browser only, and packed into saved project files. Commercial fonts are deliberately not bundled in this repo.
- **Outfits** (`outfits-girls.js`, `outfits-boys.js`): neck-down outfit bodies plus shoes, bags and accessories. Adding one also adds an oversized face slot; a selfie dropped into it is cut out and trimmed to the head automatically for the "big head" look. They're in **Elements → Outfits · Girls / Outfits · Boys / Shoes & Bags**.
- **Text → Styles** keeps the type looks of retired templates (Happy birthday, Café chalkboard, Coming soon, Y2K vibes, Outfit line-up, Halftone duo, Tools I use, Creative partner, Meet the agent…): *Birthday 3D*, *Chalk heading*, *Italic display*, *Wide spaced*, *Light caps*, *Bubble sticker*, *Stitched label*, *Marker blocks*, *Wide heavy*, *Chalk note* and more. Their stickers, shapes, calendars and checklists are all in Elements.

## Sound credits

Recorded sounds: Joseph Sardin — [BigSoundBank.com](https://bigsoundbank.com) (CC0 / royalty free; credit appreciated, not required). Every sound used was marked "Free and Royalty Free" on its page; `tools/sounds_prep.py` lists each one with its BigSoundBank id. Designed sounds and music are made in the app.

## Photo credits

The speed-flash photo packs and the demo portraits in `flashes.js`, the film photos in `filmphotos.js` and the portraits in `portraits.js` are from [Unsplash](https://unsplash.com) and used under the [Unsplash License](https://unsplash.com/license) (free to use, attribution not required). Image ids, for credit — each one is `https://images.unsplash.com/photo-<id>`:
`1461896836934-ffe607ba8211`,
`1526676317768-d9b14f15615a`,
`1696536823512-79d724454616`,
`1698671823406-035c77ff6fcd`,
`1758922769578-68c5ba000d87`,
`1766970096346-937852c7d350`,
`1517836357463-d25dfeac3438`,
`1521804906057-1df8fdb718b7`,
`1526506118085-60ce8714f8c5`,
`1541534741688-6078c6bfb5c5`,
`1581009146145-b5ef050c2e1e`,
`1599058917212-d750089bc07e`,
`1605296867304-46d5465a13f1`,
`1509563268479-0f004cf3f58b`,
`1517438322307-e67111335449`,
`1622599511051-16f55a1234d0`,
`1506719040632-7d586470c936`,
`1555532686-d0fccaccadcf`,
`1589240508375-8ad32cfcfcf4`,
`1690984651796-6bbb102fbf30`,
`1505811210036-052144988918`,
`1611416457332-946853cc75d6`,
`1452573992436-6d508f200b30`,
`1508087625439-de3978963553`,
`1560272564-c83b66b1ad12`,
`1715900677967-fb67cee16359`,
`1574629810360-7efbbe195018`,
`1634040843188-5ca36cf26cc1`,
`1639938794001-bcc9e3770fd4`,
`1761027436967-63584b301a77`,
`1607017137021-5dc7e8cd4317`,
`1633106485777-eaa336fb40df`,
`1770664612860-1f69b26b1682`,
`1614010966237-74489a16848b`,
`1603437873662-dc1f44901825`,
`1774031476314-7284990b1424`,
`1652995023370-15f2fe166652`,
`1765710307817-db7fd96602d4`,
`1636137351259-fbe4b2a94244`,
`1463947628408-f8581a2f4aca`,
`1447798084910-4d1dfb81b657`,
`1585933654851-820691b3740f`,
`1553670440-f4fa1dfeabf4`,
`1602069758330-4779463aeae4`,
`1633355419307-28c05d752002`,
`1645513115508-131c8dd9a744`,
`1642553214777-1ec5a8aae87f`,
`1720662199662-a5c25d1e87b5`,
`1729200656377-2b0eb28ea65d`,
`1669846691726-1c0a23a6a31a`,
`1646776186375-5263873b144b`,
`1638632675309-eb183635f496`,
`1628487536919-58ddf0766be4`,
`1733161214175-2108df3bf210`,
`1552619809-37d77db7dffe`,
`1709746242257-e7035f6b3c73`,
`1636990536225-2eb22dfc12bc`,
`1681097561932-36d0df02b379`,
`1518611540400-6b85a0704342`,
`1512521743077-a42eeaaa963c`,
`1587397845856-e6cf49176c70`,
`1777969382035-88ff5ad401d2`,
`1567186937675-a5131c8a89ea`,
`1719603785926-84d214438120`,
`1542909168-82c3e7fdca5c`,
`1734830203034-a73cd8a8fd22`,
`1783715209382-5a3ba8ea9eae`,
`1734830268394-6c4a1f165af1`,
`1523529831-3b6372bedacd`,
`1719603785926-fa6c6e10fb90`,
`1764069415137-756fbca30a17`,
`1589220286904-3dcef62c68ee`,
`1593183230686-69876b0cb240`,
`1690237604597-d170faa1e40f`,
`1662122071926-9dfd4e518dec`.
