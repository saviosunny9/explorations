# Sixjuly Flow

Node-based automation for Sixjuly brand posts and reels. Put a topic in, get a carousel (4:5 PNGs), a reel (9:16 MP4 / WebM)
and a caption out, in the Sixjuly look (white pages, Google Sans Flex, violet highlight, orange footer accent, dot-grid
cover, arrow). Everything runs in the browser: open `index.html` in Chrome. No server, no build step.

```
Topics ─▶ Write ─▶ Design ─┬─▶ Carousel post
(Brand ──────────▶ Design) └─▶ Motion ─▶ Reel video
```

## Using it

1. Edit the **Topics** node: one topic per line. Add specifics after `::`, separated by `;`
   (`Pricing pages :: anchor the middle tier -> the default; hide the toggle -> show the price`). `old -> new` pairs become
   before / after cards. Lines starting with `#` are skipped.
2. Press **Run** (⌘/Ctrl + Enter). Every topic becomes a card on the right with its slides, a playable reel and an editable caption.
3. Change any node and run again. Turn **Auto-run** on to re-run on every change; Claude copy is cached per topic + settings,
   so tweaking Design or Motion never calls the API again. **↻ New angle** on the Write node asks for a different take.
4. **Download slides** (zip of PNG / JPG + caption), **Download video**, or **Download all** (one zip: a folder per topic).
   **Edit copy & caption** under a card fixes wording by hand: `[[words]]` = violet highlight, `{{words}}` = orange accent.

## Nodes

| Node | Does | Main settings |
| --- | --- | --- |
| Topics | The list of things to post about | text |
| Brand | Colours, font, handle, site (defaults are the Sixjuly brand file) | font, violet, orange, more colours |
| Write | Topic → slide copy + caption + hashtags | engine (Auto / Claude / Patterns), model, format, slide count, voice notes |
| Design | Lays copy out as brand slides | theme, cover / closer theme, alternate rhythm, cover art (halftone orb, spiral, none) |
| Motion | Animates each element | style presets + per-element entrances, highlight, visual loop, transition, speed, easing, stagger, seconds per slide |
| Carousel post | Static output | ratio (4:5, 1:1, 3:4), 1080 / 2160, PNG / JPG |
| Reel video | 9:16 video from the Motion node | 30 / 60 fps, MP4 / WebM, quality |

Wires are typed (Topics, Copy, Brand, Slides): drag from an output dot to an input dot; double-click a wire or select it and press
Backspace to remove it; drag an input dot away to pick a wire up. Scroll pans, ⌘/Ctrl + scroll zooms. **+ Node** adds nodes; **Flows** has
starter flows, save and open (`.json`). The flow is also remembered in the browser.

### Slide kinds

`cover` (huge title, optional orange sticker, sub-line), `statement`, `compare` (before → after, myth → truth), `stat` (one big number),
`list`, `steps`, `quote`, `objects` (jelly button / chrome toggle / clay card), `cta` (closing line + pill button). Reels use the same
slides on 1080 × 1920 with Instagram's top and bottom UI zones kept clear.

### Motion

Entrances: fade, rise, line reveal, word by word, focus in, pop, slide, drop, wipe, typewriter. Highlight: ink fill, underline, pop.
Loops on visuals: float, pulse, wobble, sway, spin; cover art spins; the arrow nudges or draws. Transitions between slides: cut, cross-fade,
push, zoom through, wipe, slide up. Presets: Smooth, Punchy, Playful, Minimal, Editorial, Kinetic. Touching any single setting switches the style to Custom.
Hover a slide thumbnail to see its animation.

## Copy engines

- **Claude**: Settings (⚙) → paste an Anthropic API key. It is stored only in this browser (`localStorage`) and requests go straight from the
  browser to `api.anthropic.com` (`anthropic-dangerous-direct-browser-access`). The system prompt in `copy.js` carries the Sixjuly voice from the brand
  file (expert, empathy, direct; short punchy beats; one violet idea per headline). Replies are validated and repaired (`normalizeStory`) before
  drawing. Default model `claude-sonnet-5-5`; Opus 5.5 and Haiku 5.5 are in the Write node.
- **Patterns**: offline banks in `copy.js` (hot take, before → after, list of rules, myth vs truth, how-to, big number), seeded by the topic so a run is repeatable.
  Without specifics after `::` the copy is a sound skeleton, not finished writing: add points, edit the copy under the card, or use Claude.
- **Auto** (default) uses Claude when a key is set and falls back to patterns if the call fails (the card says so).

## Run it without the UI

```bash
echo "Why great rebrands feel familiar" > topics.txt
NODE_PATH=$(npm root -g) node tools/generate.js --topics topics.txt --out out/ --reel --motion punchy --theme dark
```

Writes `out/<topic>/carousel/slide-01.png …`, `reel.mp4|webm` and `caption.txt` per topic. `ANTHROPIC_API_KEY` in the environment turns Claude on. Flags are listed at the top of
`tools/generate.js`. Put it in cron or CI for a daily batch.

## Files

| File | Role |
| --- | --- |
| `index.html`, `flow.css` | Shell and styling (dark mode follows the system) |
| `graph.js` | Node editor: pan / zoom, nodes, typed ports, wires |
| `nodes.js` | Node types and the flow runner (`SixjulyFlow.run`) |
| `copy.js` | Topic parsing, pattern banks, Claude call, story validation |
| `render.js` | Slide renderer: layouts, brand themes, motion engine, reel timeline and transitions |
| `export.js` | PNG / zip, WebCodecs video (H.264 MP4, VP9 / VP8 WebM), MediaRecorder fallback |
| `app.js` | Toolbar, results cards, reel player, copy editor, downloads, `SixjulyFlow.api` |
| `logo.js` | The spiral mark, traced from the brand file |
| `vendor/` | JSZip, mp4-muxer, webm-muxer (same copies as `studio/vendor`) |
| `tools/smoke_test.js` | Playwright test: run, rewire, presets, mocked Claude call, API export, video |
| `tools/generate.js` | Headless batch generator |
| `tools/render_sheet.js` | Dev contact sheet of every slide kind |

## Notes

- The font loads from Google Fonts (**Google Sans Flex**, the brand file's "Google Flex Sans"); offline it falls back to Inter / system sans.
- Reels have no audio; add music in Instagram. Headless Chromium has no H.264, so it exports WebM; Chrome, Edge and Safari export MP4.
- Brand rules were read from the Figma file "Sixjuly <> Assets" (colours, type, logo, two carousels). The Instagram account itself could not be
  fetched, so reel ideas beyond that file are not in here yet.
- Slides never draw other companies' logos: before / after cards are text only.
