# Alaro — brand variation of the 3D-home site

A copy of the Alaro website with the 3D home hero (artifact *Alaro Home Story*), restyled in the
brand-board design language. Published as the private artifact **Alaro Home Brand**:
https://claude.ai/artifact/RZ34x6e3jyBhDSdn3AQGtx

The site itself is a compiled Next.js export, so the variation is a skin layered on top of it. Nothing in
the JavaScript changes, so the 3D home scroll story, the three.js product views and every interaction
work as before.

| File | Role |
| --- | --- |
| `brand/alaro-brand.css` | The whole skin: colour tokens (brand green `#00dc6c`, deep teal `#063a33`, cream, blush, mint, butter), grid-paper backgrounds, pill buttons and tags, stadium / capsule photo shapes with the green inner-glow ring, glowing halo "tracks" behind products, pastel icon tiles, chat bubbles as glowing pills, the rounded `alaro` wordmark (Fredoka, Google Fonts) and the per-section treatment. |
| `brand/links-*.svg` | The chain-of-outlined-pills line pattern from the boards (`tools/make_links.py` draws them). |
| `tools/patch_html.py` | Adds the Fredoka font and the skin stylesheet to the export's `index.html` / `404.html`. |
| `tools/build.sh` | `base/site` (original export) + skin → `build/`. |
| `index.html` | The artifact page: a full-screen frame around `site/index.html`. |

Where the brand shows up: loader (green app icon on the teal grid), hero (glowing green detection boxes,
pill chips, rounded moment cards, teal-tinted shading, green rail and viewfinder), design / privacy panel
(blush, cream and teal grids with a halo behind the camera), moments (arch and rounded tiles with the green
glow, green call-out card with link chains), app (halo behind the phone, pastel number tiles), colours (pastel
grid cards with halos), placement and at-home galleries (stadium and capsule photos), the "background of your
life" banner (wide stadium, centred words), the teal intelligence block (oval photo, capsule thumbnails,
glowing marquee pills), Ask Alaro (pink and mint glowing chat pills on a blush grid), buy (halo behind the 3D
camera), FAQ, the final call to action (blush grid with a halo ring) and the footer (teal grid, big green wordmark).
