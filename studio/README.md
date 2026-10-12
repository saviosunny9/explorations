# Savio's editor

A browser editor for scrapbook / collage style posts: layered photos, stickers, styled text, calendars and planners on a snap-to-grid canvas.

Open `studio/index.html` in a browser, or serve the folder with any static server (for example `npx serve studio`). Network access is needed for Konva (jsDelivr) and the Google Fonts it uses.

| File | What it holds |
| --- | --- |
| `index.html`, `studio.css` | App shell and editor chrome |
| `fonts.js` | 150 Google Fonts (serif, display, script, handwritten, mono) and font loading |
| `stickers.js`, `stickers-game.js` | 170 recolourable SVG stickers, including glossy game-UI icons and crystals |
| `nature.js` | Procedural garden painters (lawn hills, flower beds, bushes, hedges, trees, clouds, sky) and 9 garden backdrops |
| `render.js` | Canvas renderer for every element type, used by both the editor and export |
| `app.js` | Editor core: stage, selection, snapping & guides, transforms, text editing, crop, history, import |
| `bgremove.js` | On-device background removal (RMBG-1.4 via ONNX Runtime Web) |
| `video.js` | Frame-by-frame video export (WebCodecs H.264 → MP4 or VP9 → WebM, MediaRecorder fallback) |
| `ui.js` | Panels, inspector, popovers, dialogs |
| `templates.js` | About 258 templates plus text, paper, planner, photo-layout and background presets |

Work is autosaved to the browser (IndexedDB). Use **Menu → Download project file** to keep a portable `.studio.json`.

## Use it on another computer

1. **Get the app**: copy `studio/dist/collage-studio.html` (one file, about 2.4 MB) to the other laptop — USB stick, email, Drive, AirDrop, anything. Double-click it; it opens in Chrome, Edge, Brave or Arc (Safari and Firefox mostly work, but video export and background removal are best in Chrome/Edge). Keep it in the same folder so the browser keeps its saved designs together.
2. **Move your designs**: designs are saved inside the browser, so they don't travel with the HTML file. On the home page use a design's **⋯ → Download project file** (a `.studio.json` with its photos, videos and uploaded fonts inside), copy that file across, then on the other laptop click **Open file** on the home page. It lands in *Your designs* there.
3. **Offline**: the editor, templates, your photos and videos, and image / video export all work with no internet. Only two things need a connection: Google Fonts (without it, text uses the computer's own fonts until you're online) and background removal (a one-off ~40 MB model download).

To refresh the file after changing the code: `python3 studio/tools/build_single_file.py`.

## On a phone

Open the same link on a phone and the editor switches to a phone layout on its own (and back on a laptop — nothing changes there):

- The canvas fills the screen. **Pinch** to zoom, **two fingers** to pan, drag an empty part of the canvas with one finger to move around, **tap** empty canvas to deselect, **double-tap** text to type, **long-press** a layer for its menu (duplicate, copy properties, flip, arrange, delete…).
- A **tool strip** runs along the bottom, like Snapseed or Photoshop Express. With nothing selected it has Templates, Text, Photos, Elements, Backdrop, Canvas, Layers and Animate (plus Play once something moves). Select a layer and it changes to that layer's tools — for a photo: Replace, Crop, Blend, Photo, Studio, Looks, Adjust, Film, Blur, Frame, Effects, Motion, Position, Duplicate, Delete; for text: Edit text, Font, Style, Effects…
- Each tool opens **one small sheet** with just its controls, with the canvas still in view above; ✓ closes it, and switching layers keeps the same tool open. Templates, Text, Photos and the other libraries open as tall sheets that fold away as soon as you add something.
- Menus, colour pickers and dialogs (export, canvas size…) slide up from the bottom. Handles are bigger for fingers.
- Turn the phone sideways and the sheets sit beside the canvas instead of under it.

## Home page and your designs

The app opens on a home page:

- **Start something new**: one click for a portrait post, square post, story/reel or landscape canvas, start from a photo (click or drop), or pick any custom size and colour. Templates sit below, grouped into families, with the same tag filters as the editor.
- **Your designs**: every design you start is kept as its own project in this browser, with a thumbnail, its size and when it was last edited. Tabs split them into **Drafts** (everything autosaves as a draft) and **Saved** (press ⌘S / Ctrl+S, click the *Draft* chip next to the design name, or use *Mark as saved*). Sort by last edited, newest or name, and search by name.
- Each card's **⋯** menu opens, renames (or double-click the name), duplicates, moves between drafts and saved, downloads the project file or deletes — with an Undo right after deleting.
- **Menu → Home — all designs** (or *Back to editor* on the home page) moves between the two. Opening a `.studio.json` file adds it to your designs.

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
- **Canvas → Finish** adds film over the whole design: Film grain (with size), Dust & scratches, Film burn, Flicker, Gate weave (the picture hops slightly every frame, like film in a projector), Light leak, Vignette and more. Flicker and gate weave turn a design into a video; grain, dust, light leaks and burns move while it plays.
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
- Slowing a clip down lengthens the design so the whole slowed clip plays (up to a minute; *Fit length to clip* does the same by hand).
- **Smooth frames** (for anything slower than 100%):
  - **Flow** (default) — new in-between frames follow the motion in the clip, like a phone's slow-mo. The clip's frame rate is measured, the two real frames either side of each moment are taken, the motion between them is worked out both ways, and each in-between frame is drawn by moving the pixels part of the way. On a test pan it scored 35–39 dB against the true in-between frames, about as good as the real frames.
  - **Blend** — in-between frames cross-fade from one real frame to the next: soft, no warping, quicker to export.
  - **Off** — the clip's own frames, held: it steps, the classic choppy slow-mo.
- The smooth frames are made when you **export**; while you edit, the preview plays the plain clip at the chosen speed. Flow takes longer to export than Blend (roughly a tenth of a second per frame at 720p on a laptop).

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
- **Videos as photos**: anywhere a photo goes — a photo layer's *Replace*, the Photos panel, drag and drop, or the canvas background — you can drop in a video (mp4 / mov / webm, up to 120 MB). It plays with the design when you preview, and video export seeks it frame by frame so it stays in sync. *Playback* sets where it starts, its speed and whether it loops; the design's length grows to match the clip (up to 30 s). Videos play muted and export without sound. Your browser has to be able to play the file (iPhone HEVC .mov files may need converting to H.264 first).

- **Template families**: variations of one idea show as a single card with a style count; click it to see every style. Video templates carry a *Video* badge and play when you hover them.
- **Newspaper reveal** (pull-back, crash zoom, snap zoom, hard cuts, slow push-in), **Typing** (type & follow, typed note, crash zoom, terminal), **Match cut** (keyword, night edition, newsprint flicker), **Kinetic headline** (good news, big reveal, pop words), **Sticky notes** (colour cut, stack, flip-book) with photos printed onto the notes, **Rolling numbers** (years, countdown, price drop), **Word by word** (italic VHS, bold statement, soft whisper) and **Letter bounce** (everyone, glitch hello, pastel).
- **Text entrances**: letters slam / rise / drop / fade in one by one; slide-ins get motion blur automatically; *Captions* shows one line of a text layer at a time for subtitles; *Roll through lines* rolls them up like a counter (optionally speeding up); *Word by word* pops one word at a time; *Letters bounce in* types with each letter landing low and snapping up.
- **Sticky note frame** prints a photo onto the note like ink; **Window-blind shadows**, **VHS scanlines** and **RGB split** are canvas finishes.
- **Camera** (Canvas panel on the right with nothing selected, or Animate → Camera): push-in, pull-back reveal, whip, snap, crash in & out, follow the typing, hard cuts, handheld drift, pan, Dutch tilt, jolt cuts and spiral. Pick what it focuses on, zoom, timing, tilt, handheld shake and motion blur. The camera only frames the layout; it never moves your layers.
- **Typing** (Motion → Typing on a text layer): types at a steady pace with a cursor; tap words to highlight them as a text selection, marker or underline.
- **Text in videos** is typed in the side panel: select a text layer (or double-click it) to get its text box, or, with nothing selected, edit every piece of text in the video under *Text in this video*.
- **Show / hide timing** (Motion): make a layer appear and leave at set times. Layers that take turns create match cuts.
- **Layer blur** (Effects): Gaussian and directional blur on any layer.
- **Blur for text, stickers, shapes and lines** (Effects → Blur): the same blurs as photos — Soft, Motion, Zoom, Spin, Tilt-shift and Double — with amount, direction, centre or focus band. *Where* blurs the whole layer, only around spots (*On spots*), or everything except them (*Off spots*); *Place on text* lets you click the layer to drop spots, drag them and resize them with the ring handle. (The older plain *Layer blur* stays for photos and for designs that already use it.)
- **Thermal blur** (Effects → Thermal blur, on text, stickers, shapes and lines): the layer turns white-hot and glows through yellow, orange and pink to blue, like a heat camera. *Heat* sets how far it glows; colours: Thermal, Infrared, Night vision, Ice or Sunset; *Shimmer in videos* makes the heat breathe over time.
- **Ink bleed** (Effects → Ink bleed): letters soak into the paper — rough spreading edges, a spray of ink dots around them and an optional smear in one direction. *Bleed*, *Speckle*, *Rough edge*, *Smear* and *Smear angle*; *New pattern* reshuffles the specks. The ink takes the text colour.
- **Type entrances** (Motion → Entrance, on text): **Word build** adds the words one at a time — each pops up from below and the line re-centres as it grows; **Blur shuffle** re-spaces the words along their lines a few times (ragged, wide gaps), each sliding with motion blur, then settles into the paragraph; **Select sweep** drags a text selection across the words (highlight, selected-text colour and an I-beam cursor) and slides the line so the cursor stays in view — set *Highlight*, *Selected text*, *Show the cursor*, *Follow the cursor*; **Word wall** fills the canvas with rows of your words (type them with commas between) and lights one up at a time in a second font — *Lit word* font, *Lit colour*, *Lit size*, *Each word* (seconds per word).
- **Type effects** template family (7, video): Word build (heavy caps on deep green, phrase after phrase, the last word swapping, a light ending), Select sweep (yellow selection on brown), Word wall (lead-in line → a blue wall of words lighting up one by one → "You build it with *trust*."), Blur shuffle (electric blue), plus Word build — portrait, Select sweep — night (story) and Blur shuffle — cream.
- **Screen close-up** template family (4, video): *Phrase typing* — each line of the text is typed on an empty teal screen, held a beat, then hard-cut to the next line, framed closer for short phrases (Camera → Screen typing → *One phrase at a time*); *Comment thread* — two comments on a made-up forum app (threadly), filmed through the pixel mesh with a cut between them. Landscape and story sizes. The **Interface icons** sticker set (vote arrows, comment, share, search, like, more, bell) builds this kind of on-screen UI.
- **Text effects** template family (5): Thermal word (video, the heat shimmers while the camera creeps in), Thermal over photo, Night vision, Ink bleed poster (video, slow push-in on photocopied paper) and Ink on paper.
- **Text tracking** (Motion → + → *Pin to video (tracking)*, on any text, sticker, shape or photo): you choose what the layer sticks to, then press **Track**. *Stick to*: **Point** (click a spot; drag to make the area bigger), **Object** (click a thing and the app finds its outline, or drag a box around it), **Edge** (drag along a table edge, a door frame…), **Plane** (drag a box over a flat surface and move its four corners onto the surface's corners: the layer then follows its perspective too, like text printed on it). The app follows the target through the clip — move, size and turn, even with a handheld camera pushing in fast — and the layer keeps its place relative to it; a dashed outline shows the target while the layer is selected. *Adjust pick* / *Track again* to change it; *Steady* smooths the path (keep it low so the layer stays glued to real shake); *Follow size*, *Follow turn* (off for Point — a single spot can't tell turn reliably), *Motion blur on fast moves*. Works with a video background or a video layer (moved, scaled or turned). Tracking runs in the browser while the clip plays at half speed, so a 10-second clip takes about 20–40 seconds.
- **Typing screen** template family (video, 4 orientations — landscape, story, portrait, square — plus *Your canvas*): a question typed on a white display, filmed close up — you see the screen's pixel mesh, letters made of real screen pixels, soft lens focus, a shallow depth of field and a speck or two of dust. It types with a human rhythm (quicker inside words, a beat at spaces, longer after punctuation) while the camera rides the caret by hand, then pulls back to show the whole line with the cursor blinking. Type **any number of words** in *Text in this video*: the typing, camera and video length follow, and long text wraps onto more lines. Camera → *Screen typing*: typing speed, zoom, end hold (and, optionally, photos or videos to cut to between words).
- **Screen close-up** (Canvas → Finish → +): put any design on a "real screen" — pixel size, pixel grid, depth of field and dust. The pixels show when the camera is zoomed in; press play to see the look in the editor.
- **Smooth cam text** template family (video, 4 orientations: story, portrait, square, landscape — plus *Your canvas* for any size): words pull into focus one after another (*you’ve* · *probably* · *seen those*), the camera whips up to the headline with motion blur and a tilt, settles and pushes in slowly, the headline changes into italic with new word sizes, and the exposure flashes at the end. Resize the canvas and it re-flows, keeping the words you typed. New pieces it uses: a **Blur in (focus)** entrance for any layer and a **Smooth cam (keyframes)** camera path.

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
