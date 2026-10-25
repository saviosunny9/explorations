# Sixjuly design language library

Sixjuly Flow has **eight style packs**, a **structured 12-column grid** under all but one of them, and **seventeen extra layouts** that take their ideas from how leading design studios and product companies lay things out. This page says where each idea came from, what we kept, and where it shows up.

## What this is, and what it is not

- It is a set of **original** styles built from Sixjuly's own colours, fonts and logo. Nothing here reproduces another company's logo, imagery, wording or typefaces.
- It borrows **principles**, not artwork: a grid, a rule weight, a type contrast, a colour strategy. Those are the shared language of design, and each source below documents them publicly.
- Each style is **our interpretation**. It is not an official template from any of these companies and is not endorsed by them.
- Research was done from public web pages and write-ups. I could not open their Instagram, Figma files or private brand guidelines, and a few sources are third-party analyses rather than the company's own words (marked *secondary*). Treat the "from" column as inspiration, not a citation of record.

## Style packs

Pick one on the **Design** node (or per post in the editor: **Style**, plus **This slide** to mix styles inside one carousel). **Theme → Auto** lets the style choose its own background colours.

| Style | Looks like | Principle borrowed from | What it changes |
| --- | --- | --- | --- |
| **Sixjuly grid** (default) | A studio publication | The Sixjuly brand file on a Swiss-style grid | 12 columns, top bar (mark, series, page), numbered section labels, hairline rules, one violet accent per slide, mono meta text. |
| **Sixjuly classic** | The earlier brand posts | The Sixjuly brand file | Dot grid, rounded cards, halftone cover art, arrow. Kept for old drafts and when you want that look. |
| **Swiss grid** | Studio notes, a printed specimen | Pentagram's editorial type work; IBM Carbon (grid and type tokens); the International Typographic Style | Flush-left bold grotesk with tight tracking, hairline rules top and bottom, mono folio (`03 / 09`), square corners, one short violet bar as the only accent. |
| **Editorial** | A magazine page | Collins and similar editorial brand work (*secondary*) | Serif display type on cream paper, running head with issue number, thin rules, softer corners. |
| **Mono terminal** | A spec sheet or developer docs | Porto Rocha's mono-led identities; Vercel's Geist system | Black field, mono headlines, hard outlines, crop marks, coordinates in the corners, tiny radii. |
| **Bento** | A product feature grid | Apple-style feature grids, Notion, Linear (*secondary* analyses) | Soft rounded tiles, calm medium-weight type, large corner radius, progress dots. |
| **Colour poster** | A campaign poster | Spotify "Wrapped"-type campaigns, bold flat-colour poster work (*secondary*) | Flat violet / orange / white fields that cycle per slide, heavy uppercase type, a giant ghost slide number. |
| **Glow** | A product landing page | Stripe and Linear dark pages (*secondary*) | Near-black with soft violet / orange light, light-weight display type, a hairline frame. |

## The grid

The structured look is a system, not a template: every slide shares the same frame so a carousel reads as one publication.

- **Grid:** 12 columns, 72 px margins, 24 px gutters on 1080 px. Content hangs off column edges; nothing is centred unless it is a single big figure.
- **Frame:** top bar (mark, series name, `03 / 07`) above a full-width rule; bottom bar (handle, site, *Next →*) below another. Reels keep the same frame inside Instagram's safe zones.
- **Hierarchy:** numbered section label (mono, 22 px) → headline (80 px, −4% tracking) → content (40–60 px) → footer (32 px). One violet highlight in the headline, one orange phrase in the footer.
- **Elements:** hairlines instead of boxes; one filled panel per slide at most (the "strong" cell is always the first); labels in Geist Mono caps; numbers as type, not decoration.
- **Covers:** *Big type* (headline fills the width), *Colour block* (a full-bleed highlight panel), *Big number* (a giant count beside the title).

## Layouts

Every layout works in every style and in both formats (carousel 4:5 and reel 9:16), animates with the existing motion engine, and exports to PNG / PDF / editable SVG like any other slide.

| Layout | Pattern it comes from | Good for |
| --- | --- | --- |
| **Contents list** (`index`) | Contents pages and agency "work" indexes | Chapters, what's inside |
| **Type specimen** (`spec`) | Type foundry and design-system specimen sheets | Fonts, tokens, brand rules |
| **Case study** (`casestudy`) | Agency project pages: image plus a Client / Role / Year table | Showing a piece of work |
| **Principles** (`principles`) | Dieter Rams' "ten principles" style of numbered statements | Values, rules |
| **Metrics** (`metrics`) | Annual-report and product-metrics pages | Results. Only use figures you supply. |
| **Release notes** (`release`) | Product changelogs with tagged entries (Linear-style, *secondary*) | Updates, "what's new" |
| **2 × 2 matrix** (`matrix`) | Consulting and strategy diagrams | Effort vs impact, comparisons |
| **Design system** (`system`) | Brand and design-system overview boards | Showing Sixjuly's own tokens |
| **Glossary** (`glossary`) | Dictionary entries | Explaining one term |
| **Layer stack** (`stack`) | Layered "how it fits together" diagrams | Systems, stacks |
| **Process flow** (`flow`) | Zig-zag process diagrams | How-tos |
| **Giant figure** (`wrapped`) | Year-in-review campaign posters | One big number |
| **Gradient hero** (`mesh`) | Soft gradient product heroes | Openers and closers |
| **Bento** (`bento`) | Modular product feature grids | An overview, one highlighted point |
| **Table** (`table`) | Comparison tables in product and consulting decks | Two ways of doing something |
| **Feature** (`feature`) | Editorial figure + caption + text column | One idea with a picture |
| **Columns** (`columns`) | Case-study problem / approach / result | A short story in three parts |

## How it fits the product

- **Write node → Format → "Style packs"** makes one deck that shows every style. Under **Examples** there are also *Style packs*, *Swiss grid carousel* and *Colour poster reels*.
- The offline pattern engine now mixes `index`, `principles`, `flow`, `stack` and `glossary` into decks. Claude is told about all thirteen new layouts and is told to use `metrics` and `wrapped` **only with figures you gave it**, so it does not invent numbers.
- A style is stored on the deck (`design.style`) and can be overridden on any slide (`slide.style`). Old drafts have no style and look exactly as before.

## Adding another style

1. Add an entry to `R.STYLES` in `layouts2.js`: name, source note, default theme, corner scale `rs`, and a type profile (`head`, `foot`, `sub`: family, weight, tracking, line height, scale, upper-case, alignment).
2. Optional: a chrome painter in `R.CHROME` for rules, frames and backgrounds. Chrome is never selectable in the editor.
3. Add its key to `R.STYLE_ORDER`. It then appears on the Design node, in the editor, and in the Style packs deck.

If you want a brand's *actual* look (their own colours and typeface), that needs their written permission and licensed fonts. These packs deliberately stop short of that.

## Sources

Public pages the ideas were drawn from. Where the company does not publish its own rationale, the principle comes from third-party analysis and may be off.

- Pentagram: https://www.pentagram.com (editorial type, grids, restraint)
- IBM Carbon Design System: https://carbondesignsystem.com (grid and type tokens, mono labels)
- Vercel Geist: https://vercel.com/geist (mono-led, hard-edged developer look)
- Linear: https://linear.app (dark UI, changelog format; design rationale is *secondary*)
- Collins: https://www.wearecollins.com (editorial identity work; *secondary*)
- Koto: https://koto.studio (modular systems; *secondary*)
- Dieter Rams, "Ten principles for good design" (numbered principles format)
- International Typographic (Swiss) Style: grid, flush-left sans, hairline rules
- Spotify and Stripe: public marketing pages and write-ups (*secondary*); Apple and Material pages could not be read in this environment, so no claims are based on them.
