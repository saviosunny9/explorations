# Open Doors Partners — homepage

Two design directions for the same homepage, switchable from the **Variations** tab in the top navigation.

| Page | Direction |
| --- | --- |
| `index.html` | **Variation 1 · Ember** — offset-squares mark, espresso / signal orange palette, Manrope throughout. |
| `variation-2.html` | **Variation 2 · Dusk** — nested-bracket mark, dusk palette (night indigo → mauve → lilac → rose → peach, plum panels), Belleza headlines, bracket frames, centred hero. From the brand deck, slides 29–39. |

`variation-2.html` is generated — don't edit it by hand. Edit `index.html` (content, layout, behaviour), then run:

```bash
python3 odp/tools/make_variation2.py
```

The script swaps every colour for its dusk counterpart, replaces the logo and favicon, adds the Dusk style layer
(type, buttons, brackets, hero layout) and sets the world's grade, aim and station position.

## Hero world

`world.js` draws the planet Halcyra and its ring station (from the client's `halcyra_standalone.html`) with three.js
r147, loaded from jsDelivr after the page. The model and textures are in `media/world/`; `poster.jpg` /
`poster-dusk.jpg` are the stills shown while it loads or when WebGL isn't available. Attributes on
`[data-world]`: `data-grade` (`ember` | `dusk`), `data-aim` (lifts the camera target, scene units),
`data-station` (where the station first appears, screen coordinates `x y` in −1…1), `data-glb` (model file name,
e.g. base64 text for hosts that won't serve `.glb`). Motion is slow by default and speeds up while the page
scrolls; it pauses off screen, with the pause button, and for reduced motion.

## Preview

The world loads its model with `fetch`, so serve the folder rather than opening the file:

```bash
cd odp && python3 -m http.server 8000   # then open http://localhost:8000
```
