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
| Images | Your photos and work screenshots (optional) | upload; used by collage, posters, greeting |
| Write | Topic → slide copy + caption + hashtags | engine (Auto / Claude / Patterns), model, format, layouts, slide count, voice notes |
| Design | Lays copy out as brand slides | theme, cover / closer theme, alternate rhythm, cover art (halftone orb, spiral, none) |
| Motion | Animates each element | style presets + per-element entrances, highlight, visual loop, transition, speed, easing, stagger, seconds per slide |
| Carousel post | Static output | ratio (4:5, 1:1, 3:4), 1080 / 2160, PNG / JPG |
| Reel video | 9:16 video from the Motion node | 30 / 60 fps, MP4 / WebM, quality |

Wires are typed (Topics, Copy, Brand, Slides): drag from an output dot to an input dot; double-click a wire or select it and press
Backspace to remove it; drag an input dot away to pick a wire up. Scroll pans, ⌘/Ctrl + scroll zooms. **+ Node** adds nodes; **Flows** has
starter flows, save and open (`.json`). The flow is also remembered in the browser.

### Layouts

Open **Flows → Layout showcase** and press Run to see every layout in one deck (26 slides, carousel and reel). Reels use the same slides on 1080 × 1920
with Instagram's top and bottom UI zones kept clear.

| Layout | What it is | Fields |
| --- | --- | --- |
| Cover (plain) | Huge title, orange sticker, sub-line, halftone orb or spiral art | `head`, `sub`, `foot`, `tag` |
| Cover · annotate | Title with thin orange boxes and small labels around words | `callouts [{w, label}]` |
| Cover · crt | Title over a torn-paper collage with a glitching CRT monitor | `tag`, `head` |
| Cover · ripple | Big italic serif numeral and title over yellow ripples, mono stamp | `num`, `head` (lines), `stamp` |
| `statement` | Text-only punchline | `head`, `foot` |
| `art` | Statement over an illustration: retro computer on a grid, browser window, phone | `art` |
| `collage` | Three overlapping work cards, orange / yellow handles and mono callouts | `words`, `labels` |
| `posters` | Four staggered typographic posters with hard shadows, handle bottom-right | `words` |
| `greeting` | Festival post: dashed crop frame, photo, marigold garland (auto for Diwali, Holi, Eid, Christmas …) | `label`, `title` |
| `compare` | Before → after or myth → truth cards | `a`, `b` |
| `split` | Full-bleed then / now halves | `a`, `b` |
| `stat` | One giant number | `stat {value, label}` |
| `list`, `steps`, `timeline` | Numbered rows, a dotted path, dated points | `items`, `points [{k, v}]` |
| `tiles` | 2 × 2 colour tiles | `items` |
| `checks` | Do (violet tick) and don't (orange cross) rows | `yes`, `no` |
| `poster` | One giant word, rotated, with an orange shadow | `word` |
| `chat` | Client / studio message bubbles | `chat [{who, text}]` |
| `marquee` | Three diagonal tapes of scrolling text (moves in reels) | `band` |
| `notes` | Three rotated sticky notes | `notes` |
| `quote`, `objects` | Big quote mark; jelly button, chrome toggle, clay card | `quote`, `objects` |
| `cta` | Closing line with a pill button | `btn` |

Photo slots (collage, posters, greeting) show generated artwork until you connect an **Images** node to Design: add photos or work screenshots and they are placed in order.
The Write node's **Layouts** switch picks *Rich mix* (all of the above, no kind repeated) or *Classic* (the original nine kinds).

### Motion

Entrances: fade, rise, line reveal, word by word, focus in, pop, slide, drop, wipe, typewriter. Highlight: ink fill, underline, pop.
Loops on visuals: float, pulse, wobble, sway, spin; cover art spins; the arrow nudges or draws. Transitions between slides: cut, cross-fade,
push, zoom through, wipe, slide up. Presets: Smooth, Punchy, Playful, Minimal, Editorial, Kinetic. Touching any single setting switches the style to Custom.
Hover a slide thumbnail to see its animation.

## Copy engines

- **Claude inside Claude**: when the page runs as a claude.ai artifact it asks Claude through the `sample` capability, so no key is needed (the viewer is asked for consent once).
- **Claude with a key**: Settings (⚙) → paste an Anthropic API key. It is stored only in this browser (`localStorage`) and requests go straight from the
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
| `layouts.js` | Extra layouts, illustrations and cover styles (hooks into `render.js`) |
| `tools/layout_sheet.js`, `tools/render_sheet.js` | Dev contact sheets of every slide kind |
| `tools/build_artifact.py` | Builds `dist/sixjuly-flow.html` (one file) or, with `--artifact DIR`, the page for a claude.ai artifact |
| `tools/artifact_test.js` | Loads the built file with a stubbed `window.claude` (sample + downloads) |

## Notes

- The font loads from Google Fonts (**Google Sans Flex**, the brand file's "Google Flex Sans"); offline it falls back to Inter / system sans.
- Reels have no audio; add music in Instagram. Headless Chromium has no H.264, so it exports WebM; Chrome, Edge and Safari export MP4.
- Downloads inside an artifact go through the `downloads` capability (the viewer confirms each save). Brand rules were read from the Figma file "Sixjuly <> Assets" (colours, type, logo, two carousels). The Instagram account itself could not be
  fetched; the extra layouts come from screenshots of its posts (annotated cover, CRT cover, grid-is-dead collage, Neo-Minimalism posters, festival post, numbered serif cover, retro illustration).
- Slides never draw other companies' logos: before / after cards are text only.
