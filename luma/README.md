# LUMA — fine jewellery website

A concept site for LUMA, a Dubai-based curator of fine jewellery from European ateliers, built for women across the UAE.
Open `luma/index.html` in Chrome; it needs an internet connection for three.js (jsDelivr) and Google Fonts.

## What's on the page

- **Hero**: real desert photographs, each paired with one of five curated pieces. The 3D piece floats in front and reflects its scene.
  - Life in the photographs: a slow push-in, heat shimmer at the horizon, a slow drift in the sky, wind-blown sand streaks and drifting motes. A noise dissolve carries one scene into the next every 7.5 seconds.
  - Controls and tone: text switches between light and dark to suit each photograph. Arrows, progress bars and pause on hover; drag to turn the piece.
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

## Photos

Editorial photographs are from [Pexels](https://www.pexels.com) under the Pexels License (free to use, no attribution required), resized and compressed into `img/`:

| File | Pexels photo |
| --- | --- |
| `img/worn-gold-necklace.jpg` | https://www.pexels.com/photo/10507114/ |
| `img/worn-hoop.jpg` | https://www.pexels.com/photo/12194346/ |
| `img/worn-ring.jpg` | https://www.pexels.com/photo/16689780/ |
| `img/worn-emerald.jpg` | https://www.pexels.com/photo/17298688/ |
| `img/edit-earring.jpg` | https://www.pexels.com/photo/7615245/ |
| `img/home-portrait.jpg` | https://www.pexels.com/photo/9509032/ |
| `img/hero/dunes-clouds.jpg` | https://www.pexels.com/photo/35650512/ |
| `img/hero/camels-sunset.jpg` | https://www.pexels.com/photo/17887613/ |
| `img/hero/dune-crest.jpg` | https://www.pexels.com/photo/2403629/ |
| `img/hero/pink-dunes.jpg` | https://www.pexels.com/photo/18672830/ |
| `img/hero/caravan.jpg` | https://www.pexels.com/photo/3121285/ |

The sample try-on portrait is from Unsplash (`photo-1523529831-3b6372bedacd`, Unsplash License).
For a real launch, replace these with LUMA's own shoot: stock models must not appear to endorse the brand.
Product imagery is rendered live from the 3D models.
