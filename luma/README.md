# LUMA — fine jewellery website

A concept site for LUMA, a Dubai-based curator of fine jewellery from European ateliers, built for women across the UAE.
Open `luma/index.html` in Chrome; it needs an internet connection for three.js (jsDelivr) and Google Fonts.

## What's on the page

- **Hero + anatomy**: a live 3D halo ring on a sticky stage. Drag to turn it. Scrolling takes it apart (stone, halo, claws, band), with a short text card for each part.
- **The edit**: 12 pieces from 12 made-up houses (Maison Verel, Atelier Caldera, Ondel…), filterable by Everyday / Occasion / Bridal. Card images are rendered from the same 3D models. Opening a card shows the piece in 3D (orbit, zoom, switch metal) with buttons for Add to bag, Home try-on, Try on and Customise.
- **Liquid light**: a full-width liquid gold shader, after the moodboard.
- **Compose**: a configurator with piece (ring / pendant / earrings / bracelet), metal, stone, setting, cut, carat, band, size and engraving. The model and the AED price update live. Engraving is drawn on the inside of the band, and *Engraving* turns the camera to show it.
- **Try on**:
  - *On your skin tone*: a bust in six skin tones wearing the necklaces and pendants.
  - *On your photo*: a sample portrait or the visitor's own upload. Drag pieces into place, size and turn them, then *Save the look*. Photos stay in the browser.
- **Luma at home**: a shortlist of up to six pieces, emirate and area, a 14-day date strip, time slots, a UAE mobile check, stylist language and preference, then a confirmation. This is front-end only: requests are not sent anywhere yet.
- **Bag**: a drawer with a running total.

## How it's built

- `src/page.html`, `src/style.css`, `src/app.js` are the sources. `python3 build.py` writes `index.html` with everything inlined. `--artifact DIR` writes the claude.ai artifact page.
- Brand: Mineral Sapphire `#356a7a`, White Gold `#B8A880`, Warm Parchment `#F2EDE5`, River Bed `#636f73`. Titles use Bodoni Moda as the free stand-in for Argesta Hairline (commercial, not bundled); body text uses Hanken Grotesk in place of Helvetica Neue.
- Every piece is modelled in code (`buildRing`, `buildPendant`, `buildEarrings`, `buildBracelet`, `buildBrooch`, `buildNecklace`) from lathe-cut gems (round, oval, emerald, pear, marquise).
- Stones use a shader that traces light through the pavilion facets, with per-channel dispersion, against a high-contrast light box. Metals are physical materials lit by a studio light tent.
- Prices come from `priceOf(spec)` (carat^1.55 per stone type, metal factor, setting extras), so the edit and Compose always agree.

## Photos

The sample try-on portrait is from Unsplash (`photo-1523529831-3b6372bedacd`, Unsplash License). No model photography is bundled. Image hosts were blocked from the build environment, so the editorial model shots in all skin tones are still to come. Product imagery is rendered live from the 3D models.
