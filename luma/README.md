# LUMA — fine jewellery website

A concept site for LUMA, a Dubai-based curator of fine jewellery from European ateliers, built for women across the UAE.
Open `luma/index.html` in Chrome; it needs an internet connection for three.js (jsDelivr) and Google Fonts.

## What's on the page

- **Hero**: two styles, chosen with the small *Campaign · 3D sets* switch at the top right. The choice is remembered; `?hero=3d` or `?hero=campaign` in the address picks one directly.
  - **Campaign** (default): the four campaign photographs play one after another. Each new photograph is uncovered by a slow wipe with a gold hairline at its edge, while the one before slides away and darkens. Every photograph pushes in gently towards its jewel.
    - One brand headline stays for every photograph: *Made for the golden hour*, with the CTA **Discover luxury**, which goes to the edit.
    - On each photograph, a small pin sits beside the jewel, with a hairline out to the piece's house, name, price and a **Buy** button. *Buy* adds the piece to the bag and opens it.
    - Arrows, progress bars and swipe on phones. The slideshow pauses while the pointer rests on the headline or the piece name. On phones the crop keeps the jewel above the headline.
    - Pieces: *Lagune collar* (Maison Verel), *Octave emerald ring* (the same piece as in the edit), *Rosace ruby necklace* (Orsini & Figli) and *Zahra emerald necklace* (Atelier Caldera).
  - **3D sets**: five 3D desert sets in the light of an editorial shoot, one per curated piece. Each piece floats at the centre above a sculptural plinth. The 3D scene is only built and drawn while this style is chosen.
    - Sets: a drum plinth before a sun on the horizon with fluted towers and curved terraces; a raised runway between monoliths under a low side sun; fluted columns, buried blocks and a dome at dusk; pale dunes with a stepped plinth and an oasis; a cube between monoliths with a row of backlit palms.
    - Look: sky, sun disk, light, fog and sand colours sampled from the reference shoot; smooth sand with fine wind ripples; matte plaster forms with a faint mottle; long shadows; palms whose leaves move in the wind; drifting sand motes.
    - Motion: a slow push-in on each set. A warm sand haze carries one set into the next every 8 seconds. Arrows, progress bars and pause on hover; drag to turn the piece.
- **The edit**: 12 pieces from 12 made-up houses (Maison Verel, Atelier Caldera, Ondel…), filterable by Everyday / Occasion / Bridal. Card images are rendered from the same 3D models. Opening a card shows the piece in 3D (orbit, zoom, switch metal) with buttons for Add to bag, Home try-on, Try on and Customise.
- **Black satin band**: a full-width moving black satin shader with a faint gold glint, behind the brand promise.
- **Compose**: a configurator with piece (ring / pendant / earrings / bracelet), metal, stone, setting, cut, carat, band, size and engraving. The model and the AED price update live. Engraving is drawn on the inside of the band, and *Engraving* turns the camera to show it.
- **Try on**:
  - *On your skin tone*: a bust in six skin tones wearing the necklaces and pendants.
  - *On your photo*: a sample portrait or the visitor's own upload. Drag pieces into place, size and turn them, then *Save the look*. Photos stay in the browser.
- **Luma at home**: a shortlist of up to six pieces, emirate and area, a 14-day date strip, time slots, a UAE mobile check, stylist language and preference, then a confirmation. This is front-end only: requests are not sent anywhere yet.
- **Bag**: a drawer with a running total.

## How it's built

- `src/page.html`, `src/style.css`, `src/app.js` are the sources. `python3 build.py` writes `index.html` with everything inlined. `--artifact DIR` writes the claude.ai artifact page.
- Look: black and white first. Gold (`#B8A880`) appears only in small labels and hairlines; emerald (`#0f6b50`) only in the drag control, status dots, focus rings and one inlay on the rotunda steps. The configurator and product views follow a jeweller's layout: piece on a light grey studio ground beside a white card, square swatches, a black price-and-buy button. Headings use Playfair Display; body and labels use Outfit (both Google Fonts).
- Every piece is modelled in code (`buildRing`, `buildPendant`, `buildEarrings`, `buildBracelet`, `buildBrooch`, `buildNecklace`) from lathe-cut gems (round, oval, emerald, pear, marquise).
- Stones use a shader that traces light through the pavilion facets, with per-channel dispersion, against a high-contrast light box. Metals are physical materials lit by a studio light tent.
- Prices come from `priceOf(spec)` (carat^1.55 per stone type, metal factor, setting extras), so the edit and Compose always agree.

## 3D models

Downloaded through the Sketchfab API and optimised with gltf-transform (meshopt geometry, WebP textures) into `models/`. All are CC BY 4.0 and credited in the site footer. The plinths, monoliths, columns, terraces, sky and sand are modelled in code.

| File | Model | Author |
| --- | --- | --- |
| `models/datepalm.glb` | [Date Palm](https://sketchfab.com/3d-models/11acf710e6c149daa8d6fb8cdc5d087f) | evolveduk |
| `models/palmcluster.glb` | [Date palm and vegetation](https://sketchfab.com/3d-models/734c4537ca8547209a54df49f134824a) | borsh_and |
| `models/sanddunes.glb` | [Sand Dunes](https://sketchfab.com/3d-models/6bd9a0d96ef4463a8efd45af2be595ac) | Helindu |

## Photos

`img/campaign/` holds the four campaign photographs supplied for the hero (JPEG, 1672 × 941). Two of them, `octave.jpg` and `rosace.jpg`, are mirrored so the model sits to the right of the headline. Each has a square `-thumb.jpg` crop around the jewel, which is used in the bag.

Editorial photographs are from [Pexels](https://www.pexels.com) under the Pexels License (free to use, no attribution required), resized and compressed into `img/`:

| File | Pexels photo |
| --- | --- |
| `img/worn-gold-necklace.jpg` | https://www.pexels.com/photo/10507114/ |
| `img/worn-hoop.jpg` | https://www.pexels.com/photo/12194346/ |
| `img/worn-ring.jpg` | https://www.pexels.com/photo/16689780/ |
| `img/worn-emerald.jpg` | https://www.pexels.com/photo/17298688/ |
| `img/edit-earring.jpg` | https://www.pexels.com/photo/7615245/ |
| `img/home-portrait.jpg` | https://www.pexels.com/photo/9509032/ |

The sample try-on portrait is from Unsplash (`photo-1523529831-3b6372bedacd`, Unsplash License).
For a real launch, replace these with LUMA's own shoot: stock models must not appear to endorse the brand.
Product imagery is rendered live from the 3D models.
