# Collage Studio — handoff

Everything needed to pick this project up in a new chat. Read this first, then `CLAUDE.md` (the technical map of the
code), then `studio/README.md` (every feature, as the user sees it).

## Where things are

| What | Where |
| --- | --- |
| Source code | GitHub `saviosunny9/explorations`, branch **`main`**, folder `studio/` (moved from `savio-1/new-design` with full history) |
| Portable app (one file, works offline) | `studio/dist/collage-studio.html` — copy anywhere, double-click, opens in Chrome |
| Online copy (private claude.ai artifact) | https://claude.ai/artifact/3H6nGJsMhFKchUekuoSQAC (only the owner can open it) |
| Technical context for Claude | `CLAUDE.md` (repo root) |
| Feature guide | `studio/README.md` |
| Dev / test harness | `studio/tools/smoke_test.js`, `studio/tools/dev/` (see below) |

No pull request has been opened; work goes straight to `main`.

Moving to a different Claude / GitHub account? Follow `PASTE-THIS-FIRST.md` (no terminal: you click, Claude restores
the repo) or `SETUP-NEW-ACCOUNT.md` (manual, with git).

## How to continue in a new chat

**Claude Code (recommended — it can run the app, test and push):** start a session on the repo `saviosunny9/explorations`,
branch `main`. `CLAUDE.md` loads automatically. A good first message:

> This is Collage Studio. Read HANDOFF.md, CLAUDE.md and studio/README.md, then: <your request>.
> Keep working on branch main; after each change test with Playwright, update
> studio/README.md and CLAUDE.md, rebuild the single file, commit and push, and republish the artifact
> (link in CLAUDE.md) with `python3 studio/tools/build_single_file.py --artifact <dir>`.

**A plain chat (no repo access):** upload this zip and say "unzip it, read HANDOFF.md and CLAUDE.md first". Claude can
edit the files and hand them back; you then replace the files in `studio/` and run the build yourself
(`python3 studio/tools/build_single_file.py`), or paste the changes into a Claude Code session to commit.

**Republishing the online copy** only works from a chat that can publish to that artifact (the same claude.ai account).
From another account, publish `dist/collage-studio.html` as a new artifact instead.

## What the studio is

A browser editor for scrapbook / collage Instagram posts and Reels: layered photos (and videos anywhere a photo goes),
text, stickers, shapes, frames, ~381 templates grouped into families, animation and camera moves, film looks, and export
to PNG / JPG / MP4 / WebM with sound (including see-through PNG, WebM with alpha and PNG frame sequences). Pure HTML + JS + canvas
(Konva for the editor stage), no build step, designs saved in the browser (IndexedDB), with a home page, projects,
"My templates", and a phone layout.

## How the owner likes to work (summary — details in CLAUDE.md)

- Requests come with screenshots or screen recordings (Pinterest / Instagram / CapCut). Pull frames from videos and
  study every variation; "add all variations" means every distinct design in the reference.
- Similar templates go into one **family** card. Calm, minimal UI (Figma Buzz as the reference): common controls
  visible, the rest behind "More" or a "+" list.
- Fonts: free Google Fonts look-alikes only (never commercial / trial fonts; users can upload their own).
- Real brand names → made-up ones; rude or religious slogans softened — always say so when reporting.
- After every change: test in a real browser (Playwright), update README + CLAUDE.md, rebuild the single file, commit,
  push, republish the artifact, and send a demo (video or contact sheet).

## History (what was built, in order)

- **Oct 9** — the editor: layers, photos, text, stickers, background removal (on-device), eraser, animation and 4K video
  export, print effects, templates you can add or pick apart, own-font upload, crumpled paper, outfit figures.
- **Oct 10** — ribbons (text on a path), camera overlays, motion blur, fisheye, cast shadows; editor redesign; video
  templates and camera moves; kinetic headline, sticky notes, rolling numbers, word-by-word, letter bounce; photo blur
  types and blur spots; studio portrait look; home page with saved designs; speed flashes; 69 text-slide posters; film
  gate + halation; selection gestures (Shift / Alt / Cmd) and Alt distance lines; stop motion; single-file offline
  build; film looks + film camera families; My templates; photo effects + Paper & ID families; blend modes, multi-text
  editing, copy/paste properties, flips; moving layouts in every orientation; phone layout.
- **Oct 11** — video speed with smooth slow motion (optical flow); handwritten journal layouts + pen-sketch stickers;
  thermal blur and ink bleed text effects; smooth-cam text template; no-background canvas and transparent export; blur
  effects for text/other layers; Typing screen (real close-up screen look, human typing rhythm); text tracking v1 then
  v2 (you pick a point / object / edge / plane on the video; steady, accurate tracking with perspective for planes);
  video-export encoder fallback (4K H.264); fix for video export in the online copy (muxers bundled); Type effects
  (word build, blur shuffle, select sweep, word wall) and Screen close-up (phrase typing, comment thread) families.
- **Oct 12–17** — templates pruned, moving layouts combined (type → ratio), renamed to Savio's editor; Match cut with one
  word; canvas blur; Vox explainer (26 types, built-in scene editor, parallax, focus hunting, procedural textures); Depth
  vision thermal look (Rerun-style) + melted thermal edges; the dark effects-studio UI and 105 realtime Styles
  (styles.js / styles-ui.js, on any layer or the whole canvas) with the Image styles template family. Generative
  (AI image-to-image) looks were skipped on request.
- **Oct 18** — real paper scans; big-media storage (photos at full resolution, videos of any size kept as files in
  IndexedDB, designs up to 10 minutes, `.studio.zip` project files); sound (video sound, music, voiceover, mixed into
  exports); the Video editor (several clips on a timeline: trim, split, reorder, 13 transitions, auto fix, titles).
  Then: layer tracks on the timeline (video / photo / text layers over the video, several sound tracks), a synthesized
  Sounds library (49 effects, 9 music beds, sound for every transition / entrance) and templates sorted by category
  (Photos / Videos / Text / Collage & notes / Explainers → kinds, Any / Still / Video).
  Then: real recorded sounds (142 CC0 recordings from BigSoundBank: typing, phones, cameras, film, foley, nature,
  places, a drum kit), original marimba / vibraphone ringtones, 14 music beds incl. lo-fi, slow jazz, café jazz, bossa
  (real drums); timeline groups (a template over a video = one bar that opens into its layers, a Style on the whole group),
  Shift-click multi-select with shared settings, native timeline scrolling.
  Then: Flash Light (5 looks — people / clicked objects as glowing white light) with a subject finder (MediaPipe people
  segmentation + click-to-pick, followed through every video frame, saved as mask sheets; any style can be kept to the
  subject or the background) and Datamosh (5 looks — real frame-to-frame motion moshing, bloom mosh, mosh blocks, pixel
  drag, block dropout), 7 new Image styles templates.
  Then: Subject FX (13 looks on the found / picked subject: ASCII Subject, Matrix Rain, Neon Outline, Hologram, Echo
  Trail, Glitch Subject, Pixel Subject, Colour Pop, Silhouette, Spotlight, Heat Vision, X-Ray, Sticker Cut-out) with a
  background treatment and "Effect on → Everything else", 6 more Image styles templates.

Full list: `git log --reverse --format='%ad %s' --date=short`.

## Wording changes made from references (for the record)

Brand names replaced: Wise → "NOVA", reddit → "threadly" (made-up forum app), "peanut M&M'S taste OFF!" → "my iced
coffee tastes OFF!", "TO MAKE USING MONEY" → "TO MAKE MONEY SIMPLE". Earlier softened slogans include "…stuff" and
"Trust the work of your hands".

## Known limitations / open items

- Subject finding needs a connection (MediaPipe from jsDelivr + Google storage, ~23 MB of models). In headless Chromium
  it ran on the CPU at ~0.9 s a frame (every frame of the clip is analysed, ≤ 30 fps — a 4 s clip ≈ 2 minutes); a real graphics card should be far quicker (the GPU is
  used when a test frame takes < 90 ms) — check the speed on the owner's laptop. Picked objects are followed by
  patch matching + re-prompting each frame; fast or hidden objects can be lost for a few frames.
- Datamosh needs the frames in order: the editor shows a fresh (simulated) mosh after every jump on the timeline; the
  export always runs from the start, so it matches playback from the start.
- Word-level entrances (Word build, Blur shuffle, Select sweep, Word wall) draw words in the fill colour only — a text
  box, outline or shadow on that layer doesn't show while they play (layer blur does).
- In the still editing view, layers that are cut in and out over time are all visible at once.
- Tracking was measured on synthetic clips (≈3–4 px average error on a 1920 canvas through a fast push-in with hand
  shake, ≈2 px for planes), not on real footage. While scrubbing, the selection handles stay at the layer's still
  position (the dashed target outline does follow).
- The 4K H.264 encoder fallback was tested with a simulated failing encoder; headless Chromium has no H.264, so real
  Chrome MP4 export should be checked on the owner's machine.
- Sound and the video timeline were tested in headless Chromium (WebM / Opus export, mixing, trimming, reordering,
  project zip round trip). AAC-in-MP4 export needs real Chrome; if a browser has no AAC encoder the MP4 gets Opus sound.
  Speed changes shift a clip's pitch; a reversed clip is silent in the preview (its reversed sound is in the export).
- A design with sound plays it in the preview only while playing (scrubbing is silent).
- Recorded sounds are real (BigSoundBank); the designed ones (ringtones, risers) and the music beds are synthesized around
  real drum / cymbal / music-box samples — they were checked by level and spectrum only, not by ear, so the owner's listen
  is the real test. Music beds take 1–5 s to make the first time (the preview button pulses meanwhile).
- The single-file build is ~13 MB (sounds ~5 MB); the artifact page limit is 16 MB.
- The online copy is meant to read the background-removal model from parts published with it
  (`models/rmbg.part0–4.txt`, `models/ultraface.txt`), but those aren't published yet: huggingface.co was blocked
  from the cloud environment when the project moved. Until they are, background removal there depends on the
  browser reaching Hugging Face directly. Republishing only the page keeps any files already published.

## Testing

```bash
node studio/tools/smoke_test.js                                   # loads the app, renders every template, prints errors
IDS=te-build,sc-phrases node studio/tools/dev/run.js studio/tools/dev/contact_sheet.js   # contact sheets → dev-out/
IDS=te-wall node studio/tools/dev/run.js studio/tools/dev/export_clips.js                # WebM exports → dev-out/
python3 studio/tools/dev/tracking_clips.py photo.jpg dev-out      # exact-truth tracking clips (push-in, plane)
CLIPS=dev-out CLIP=push MODE=object node studio/tools/dev/run.js studio/tools/dev/tracking_accuracy.js
```

`run.js` uses Playwright (`npm i playwright` locally, or the pre-installed copy in Claude's cloud container) and opens
`studio/index.html`. Headless Chromium exports WebM; real Chrome exports MP4.
