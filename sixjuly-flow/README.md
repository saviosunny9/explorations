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
| Design | Lays copy out as brand slides | style (seven packs), theme (Auto follows the style), cover / closer theme, alternate rhythm, cover art (halftone orb, spiral, none) |
| Motion | Animates each element | style presets + per-element entrances, highlight, visual loop, transition, speed, easing, stagger, seconds per slide |
| Carousel post | Static output | ratio (4:5, 1:1, 3:4), 1080 / 2160, PNG / JPG |
| Reel video | 9:16 video from the Motion node | 30 / 60 fps, MP4 / WebM, quality |

Wires are typed (Topics, Copy, Brand, Slides): drag from an output dot to an input dot; double-click a wire or select it and press
Backspace to remove it; drag an input dot away to pick a wire up. Scroll pans, ⌘/Ctrl + scroll zooms. **+ Node** adds nodes; **Flows** has
starter flows, save and open (`.json`). The flow is also remembered in the browser.

### Layouts

Open **Flows → Layout showcase** and press Run to see every layout in one deck (39 slides, carousel and reel). Reels use the same slides on 1080 × 1920
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
| `index`, `principles`, `flow`, `stack` | Contents list, numbered principles, zig-zag process, layer stack | `items` |
| `spec`, `system`, `glossary` | Type specimen, Sixjuly colour / type / shape board, dictionary entry | `word`, `specs [{k, v}]`; none; `term`, `definition` … |
| `casestudy`, `release`, `metrics` | Image plus detail table, tagged changelog, big figures | `meta [{k, v}]`; `version`, `changes [{tag, text}]`; `stats [{value, label}]` |
| `matrix`, `wrapped`, `mesh` | 2 × 2 with dots, giant repeated figure, gradient hero with chips | `axes`, `dots`; `value`, `label`; `tags` |

### Style packs

Seven looks that sit on top of every layout (Design node → **Style**, or the editor's **Style** / **This slide**): *Sixjuly house* (default), *Swiss grid*, *Editorial*,
*Mono terminal*, *Bento*, *Colour poster*, *Glow*. A style sets the type profile, the rules / folio / frame around the slide, corner roundness and, with **Theme → Auto**,
its own background colours. **Write → Format → Style packs** (or *Flows → Style packs*) makes a deck that shows all seven. Where each idea comes from, what it
does and does not copy, and how to add a style: see [`DESIGN-LANGUAGE.md`](DESIGN-LANGUAGE.md).

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

## Focus view and post editor

Press **⤢ Maximize posts** (or **Edit ⤢** on a card, or click a thumbnail) to open the posts full screen. Nothing in the flow changes: **← Flow** returns to it exactly as you left it.

- **Filmstrip** (left): click a slide, drag to reorder, hover for duplicate / delete, **+ Slide** adds any layout.
- **Stage** (middle): *One slide* or *All slides*, zoom − / Fit / +, and a **Reel** tab with a large player. Click an element to select it, drag to move (it snaps to the centre and page margins), drag a corner to resize, double-click text (or press Enter) to type. Arrow keys nudge, Delete removes, ⌘/Ctrl + Z undoes, ⇧⌘Z redoes, ⌘/Ctrl + D duplicates.
- **Inspector** (right): **Add** text, heading, sticker, rectangle, circle, pill, line, arrow or a photo; **Selected** options (font, weight, size, colour, alignment, line height, letter spacing, box colour, corners, rotation, order, align to slide); photo options (replace, crop with zoom and pan, brightness, contrast, saturation, corners, outline); **Slide** options (layout, cover style, theme, background colour, duplicate, delete, move); **Content** fields for every piece of copy on the slide plus the caption.
- Brand fonts, colours, themes and layouts stay one click away; edits sit on top of the layout, so *Reset my edits on this slide* brings the original back and hidden layout elements can be restored from a list.
- Edits are saved automatically as a **draft** (in this browser, photos included) and are listed under **Drafts**. **Approve post** marks the finished post as approved for export. Nothing is ever published for you.

## Exports and the Figma hand-off

From the editor's **Export** menu (or **Drafts → Download**):

| Export | What you get |
| --- | --- |
| PNG / JPG | One slide at 2×, or every slide in a zip with the caption |
| PDF | One page per slide (images, not selectable text) |
| Editable SVG | One `.svg` per slide with real `<text>`, shapes and photos, grouped by layer name (Background, Headline, Footer text, Visual …) |
| Figma pack | The SVG slides, `caption.txt` and a `README.txt` with the three import steps |
| Copy this slide’s SVG | Puts the SVG on the clipboard; click in Figma and paste |
| Everything (zip) | PNG, JPG, SVG, PDF, caption, `sources.txt`, the Figma pack and `post.json` |

Figma cannot be written to from outside and has no way to open a `.fig` file produced elsewhere, so the supported route is SVG import (drag the files onto the canvas or paste). Fonts used are Google Fonts, which Figma includes; if a text layer shows a missing-font warning, pick the font by name (Google Sans Flex, Anton, Instrument Serif, Space Mono). Photo brightness / contrast edits travel as an image filter that Figma ignores.

## Topics: sources, links and approval

The **Topics** page turns the list of sources in your tracker workbook into reviewable topic ideas. The first version ships with the 74 sources from `design_intelligence_source_tracker.xlsx` and its 17-topic taxonomy (plus Typography and Motion).

1. **Sources**: follow, pause, edit, add and remove sources, grouped by kind (studios, people, blogs and publications, news, newsletters, research, platforms). Each row shows how it is checked and when it was last checked, and whether that worked, with the error in plain words.
2. **Check sources** reads each followed source that has a feed address (RSS / Atom). The browser can only read feeds that allow it; the rest need the **Google Sheet collector** (below) or **Add link**. Social profiles and newsletters are never read: their links open in a new tab for manual review. Nothing is scraped, no hidden browser, no logins.
3. **Found links** shows title, source, date, link and a short plain note (at most 280 characters) for each new link, with a subject from the taxonomy and a relevance score from source priority, recency and keyword match. Search and filter by source, subject, status and date; add links by hand or import a CSV.
4. **Suggested topics** groups links by subject and shared phrases and shows the links behind every idea. **Improve wording** (optional) asks Claude to rewrite titles using only what is on screen.
5. **Approve / Save for later / Reject** each idea. Only an approved topic offers **Create draft**: it runs the existing flow (your Write, Design and Carousel nodes) with the topic and its subtopics, saves the result as a draft with the supporting links as references (they travel into `caption.txt` and the zip), and opens it in the editor. Approving the finished post is a second, separate step.

No full articles or other people’s images are stored, and generated copy is written fresh by the writing engine (the reference titles are given to Claude as background with an instruction not to copy wording).

### Google Sheet

Optional. Connect one Sheet and the same data lives in four tabs: **Sources**, **Found links**, **Topics**, **Content drafts**, with statuses *New, Needs review, Approved, Rejected, Saved for later, Draft ready*. A small Apps Script (copy it from the app, or `apps-script/Code.gs`) runs in *your* Google account, reads the feeds on Google’s side (so there is no browser restriction), skips pages that robots.txt asks tools to avoid, and can check sources every morning. Setup takes about five minutes: see **[SETUP-GOOGLE-SHEET.md](SETUP-GOOGLE-SHEET.md)**. Without a Sheet the app says so and keeps everything in the browser; **Download CSV files** gives you the same four tabs as files.

The Sheet connection and live feed checks need the downloaded app (`dist/sixjuly-flow.html`) opened in a normal browser. The copy running inside Claude cannot contact other websites.

### Cost and AI

Everything in Topics works without any paid service: feeds, Apps Script and Sheets are free for personal use, and suggestions use local keyword matching. Claude is used only when you press **Improve wording** or run a Write node on *Auto / Claude*. Inside Claude that uses Claude itself; in the downloaded app it needs your own API key in ⚙ (billed by Anthropic per use) and is otherwise skipped. The app never switches to paid calls on its own.

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
| `app.js` | Toolbar, results cards, copy editor, downloads, draft creation, `SixjulyFlow.api` |
| `editor.js`, `player.js` | Focus view, post editor, reel player |
| `drafts.js` | Drafts and tracker storage (IndexedDB) |
| `svgctx.js` | Records the renderer's canvas calls as SVG (editable export) |
| `tracker.js`, `sheet.js`, `dashboard.js` | Sources, links, topics, Google Sheet client, Topics and Drafts pages |
| `apps-script/Code.gs`, `sheet-script.js` | The Google Apps Script collector (and the copy the app offers) |
| `starter-data.js` | The 74 starter sources and topic taxonomy from your workbook |
| `logo.js` | The spiral mark, traced from the brand file |
| `vendor/` | JSZip, mp4-muxer, webm-muxer (same copies as `studio/vendor`) |
| `tools/smoke_test.js` | Playwright test: run, rewire, presets, mocked Claude call, API export, video |
| `tools/generate.js` | Headless batch generator |
| `layouts.js` | Extra layouts, illustrations and cover styles (hooks into `render.js`) |
| `layouts2.js` | Design-language library: style packs (`R.STYLES`), their chrome painters, and thirteen more layouts |
| `DESIGN-LANGUAGE.md` | Where the styles and layouts come from, limits, how to add one |
| `tools/style_sheet.js`, `tools/styles_test.js` | Contact sheet of the new layouts in a style; test of every style × every layout, the styles deck and the copy engine |
| `tools/layout_sheet.js`, `tools/render_sheet.js` | Dev contact sheets of every slide kind |
| `tools/build_artifact.py` | Builds `dist/sixjuly-flow.html` (one file) or, with `--artifact DIR`, the page for a claude.ai artifact |
| `tools/artifact_test.js` | Loads the built file with a stubbed `window.claude` (sample + downloads) |
| `tools/editor_test.js`, `tools/tracker_test.js` | Drive the editor and the Topics dashboard like a person (mocked feeds and Sheet) |
| `tools/apps_script_test.js` | Runs `Code.gs` against in-memory stand-ins for Google services |
| `tools/svg_check.js` | Compares canvas and SVG renders of every layout |

## Notes

- The font loads from Google Fonts (**Google Sans Flex**, the brand file's "Google Flex Sans"); offline it falls back to Inter / system sans.
- Reels have no audio; add music in Instagram. Headless Chromium has no H.264, so it exports WebM; Chrome, Edge and Safari export MP4.
- Downloads inside an artifact go through the `downloads` capability (the viewer confirms each save). Brand rules were read from the Figma file "Sixjuly <> Assets" (colours, type, logo, two carousels). The Instagram account itself could not be
  fetched; the extra layouts come from screenshots of its posts (annotated cover, CRT cover, grid-is-dead collage, Neo-Minimalism posters, festival post, numbered serif cover, retro illustration).
- Slides never draw other companies' logos: before / after cards are text only.
