#!/usr/bin/env python3
"""Build variation-2.html (the "Dusk" direction) from index.html (variation 1, "Ember").

Variation 2 keeps every word, section and interaction of the homepage and changes the identity
(from the brand deck, slides 29-39): the nested-bracket door mark with an OPEN DOORS / PARTNERS
wordmark in capitals, the dusk palette (night indigo -> mauve -> lilac -> rose -> peach, plum
panels, near-black), headlines in Belleza (a free Optima-like face standing in for the deck's
flared humanist type), bracket frames as the graphic device, a centred hero, and the planet
graded to dusk.

Edit index.html, then run:  python3 odp/tools/make_variation2.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / 'index.html').read_text()
s = src


def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)


# ---------------------------------------------------------------- palette swap (every literal colour)
HEX = {
    'E0643A': 'C2A0C9',  # signal orange   -> lilac
    'C24D26': '6E5A8A',  # ember           -> deep mauve (AA with white, AA on light)
    '2C1914': '12112A',  # espresso        -> night indigo
    '3A0A0B': '320C3D',  # oxblood         -> plum
    '120B09': '08070F',  # ink             -> near-black
    'F4F0EC': 'F2EEF4',  # bone            -> lilac-white
    'BDB8B2': 'B7B2BF',  # stone
    '7A2A1E': '4A4168',  # rust glow       -> twilight
    '4A1C15': '2F2D54',  # rust deep       -> indigo
    'F5C3A0': 'FAB795',  # peach           -> dusk peach
    'F2A05E': 'E1ADAC',  # amber           -> rose
    'C9532F': '847096',  # sweep mid       -> mauve
    '6A1A12': '2F2D54',  # sweep dark      -> indigo
    '2A0E0C': '141B41',  # sweep end       -> night
    '2A1612': '1A162E',  # text on light   -> ink indigo
    'E9E7E4': 'E7E5EC',
    'E9793F': 'FAB795',
    'D9552F': 'AA8FB8',
}
RGB = {
    (18, 11, 9): (8, 7, 15),
    (224, 100, 58): (194, 160, 201),
    (42, 22, 18): (26, 22, 46),
    (44, 25, 20): (18, 17, 42),
    (245, 195, 160): (250, 183, 149),
    (255, 240, 230): (255, 238, 232),
    (255, 214, 170): (240, 200, 210),
    (242, 160, 94): (225, 173, 172),
    (122, 42, 30): (74, 65, 104),
    (106, 26, 18): (47, 45, 84),
    (28, 16, 13): (16, 15, 34),
    (194, 77, 38): (110, 90, 138),
    (201, 83, 47): (132, 112, 150),
    (255, 246, 236): (250, 244, 250),
    (255, 240, 225): (250, 236, 240),
    (255, 226, 200): (240, 214, 226),
    (255, 248, 240): (252, 246, 250),
}
s = re.sub(r'(#|%23)([0-9a-fA-F]{6})\b', lambda m: m.group(1) + HEX.get(m.group(2).upper(), m.group(2)), s)
s = re.sub(r'(rgba?\()(\d+),(\s*)(\d+),(\s*)(\d+)',
           lambda m: '{}{},{}{},{}{}'.format(m.group(1), *(lambda t: (t[0], m.group(3), t[1], m.group(5), t[2]))(
               RGB.get((int(m.group(2)), int(m.group(4)), int(m.group(6))),
                       (int(m.group(2)), int(m.group(4)), int(m.group(6)))))), s)

# ---------------------------------------------------------------- page identity
rep('<title>Open Doors Partners — Backing the Foundations of the Future</title>',
    '<title>Open Doors Partners — Variation 2 · Dusk</title>')
rep('<html lang="en">', '<html lang="en" data-variation="dusk">')
rep('family=Manrope:wght@300;400;500;600&display=swap', 'family=Belleza&family=Manrope:wght@300;400;500;600&display=swap')

# the bracket door mark (measured from the deck: two nested brackets with heavy uprights and a door panel)
MARK = '''<symbol id="odp-mark" viewBox="0 0 96 100">
      <g fill="currentColor">
        <rect x="0" y="0" width="20" height="100"/><rect x="0" y="0" width="86" height="9"/><rect x="0" y="91" width="86" height="9"/>
        <rect x="33" y="16" width="20" height="71"/><rect x="33" y="16" width="53" height="9"/><rect x="33" y="78" width="53" height="9"/>
        <rect x="76" y="31" width="20" height="41"/>
      </g>
    </symbol>'''
a = s.index('<mask id="odp-mark-cut"')
b = s.index('</symbol>', s.index('<symbol id="odp-mark"')) + len('</symbol>')
s = s[:a] + MARK + s[b:]
s = s.replace('viewBox="0 0 120 76"', 'viewBox="0 0 96 100"')
FAV = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='7.7' fill='%2311193F'/%3E"
       "%3Cg fill='%23fff' transform='translate(16 15.5) scale(.34)'%3E%3Crect width='20' height='100'/%3E%3Crect width='86' height='9'/%3E"
       "%3Crect y='91' width='86' height='9'/%3E%3Crect x='33' y='16' width='20' height='71'/%3E%3Crect x='33' y='16' width='53' height='9'/%3E"
       "%3Crect x='33' y='78' width='53' height='9'/%3E%3Crect x='76' y='31' width='20' height='41'/%3E%3C/g%3E%3C/svg%3E")
s = re.sub(r'<link rel="icon" type="image/svg\+xml" href="[^"]*">', f'<link rel="icon" type="image/svg+xml" href="{FAV}">', s)
s = s.replace('<meta name="theme-color" content="#12112A">', '<meta name="theme-color" content="#12112A">')

# the variations menu marks this page
s = s.replace('<a href="index.html" style="--i:0" aria-current="page">', '<a href="index.html" style="--i:0">')
s = s.replace('<a href="variation-2.html" style="--i:1">', '<a href="variation-2.html" style="--i:1" aria-current="page">')
s = s.replace('<a href="index.html" aria-current="page">', '<a href="index.html">')
s = s.replace('<a href="variation-2.html">Variation 2', '<a href="variation-2.html" aria-current="page">Variation 2')

# the planet, graded to dusk and sitting lower so the headline has the sky
rep('data-world="media/world/"', 'data-world="media/world/" data-grade="dusk" data-aim="34" data-station="-0.74 0.5"')
rep('src="media/world/poster.jpg"', 'src="media/world/poster-dusk.jpg"')

# bracket frames that the CSS draws
rep('<div class="horizon__ellipse" data-orbit aria-hidden="true"></div>',
    '<div class="horizon__ellipse brackets" data-orbit aria-hidden="true"></div>')

# ---------------------------------------------------------------- the Dusk layer
DUSK = r'''
/* =====================================================================
   VARIATION 2 · DUSK — identity layer over the shared homepage
   ===================================================================== */
:root {
  --dusk-night:   #141B41;
  --dusk-indigo:  #2F2D54;
  --dusk-twilight:#4A4168;
  --dusk-mauve:   #847096;
  --dusk-lilac:   #C2A0C9;
  --dusk-rose:    #E1ADAC;
  --dusk-peach:   #FAB795;
  --dusk-plum:    #320C3D;
  --dusk-navy:    #11193F;
  --dusk-black:   #0D0B10;
  --bracket:      rgba(255,255,255,0.2);
  --bracket-dark: rgba(26,22,46,0.14);

  --grad-dusk: linear-gradient(180deg, #141B41 0%, #2F2D54 14%, #4A4168 27%, #66567E 39%, #847096 50%, #AA8FB8 62%, #C2A0C9 70%, #D0A6B9 77%, #E1ADAC 86%, #F0B4A1 94%, #FAB795 100%);
  --grad-dusk-x: linear-gradient(90deg, #141B41 0%, #2F2D54 22%, #4A4168 40%, #847096 58%, #C2A0C9 76%, #E1ADAC 88%, #FAB795 100%);
  --grad-bloom: var(--grad-dusk);
  --grad-bloom-top: var(--grad-dusk);
  --grad-hero:
    radial-gradient(ellipse 70% 60% at 50% 0%, #2F2D54 0%, #1A1A3C 40%, transparent 78%),
    var(--odp-espresso);

  --font-display: "Belleza", "Optima", "Candara", "Segoe UI", sans-serif;
  --tr-display: -0.02em; --tr-h1: -0.015em; --tr-h2: -0.01em; --tr-h3: -0.005em; --tr-statement: -0.02em;

  --tab-bg: rgba(255,255,255,0.1);
  --tab-on-bg: #F2EEF4;
  --tab-sub-bg: rgba(18,17,42,0.7);
}
body { background: var(--odp-espresso); }

/* type: Belleza for display, Manrope stays for reading */
.t-display, .t-h1, .t-h2, .t-h3, .t-statement, .hero__title, .statement__text, .moment__word,
.portfolio__name, .bloom-card__title, .menu__list > li > a, .menu__group > p, .cta__text {
  font-family: var(--font-display); font-weight: 400;
}
.hero__title { letter-spacing: -0.02em; line-height: 1.02; }
.statement__text { letter-spacing: -0.02em; line-height: 1.08; }
.cta__text { letter-spacing: 0; }
.lockup__word {
  font-family: var(--font-display); font-weight: 400; text-transform: uppercase;
  letter-spacing: 0.01em; line-height: 0.95;
}
.fade-text { background: none; color: inherit; -webkit-text-fill-color: currentColor; }
.accent { color: var(--dusk-lilac); }
.sec--bone .accent, .sec--white .accent { color: #6E5A8A; }

/* buttons: white on dark, as in the deck */
.btn { --btn-bg: #FFFFFF; --btn-bg-hover: var(--dusk-lilac); --btn-fg: var(--dusk-black); border-radius: 0; }
.btn--ghost { --btn-bg: transparent; --btn-bg-hover: rgba(255,255,255,0.08); --btn-fg: #FFFFFF; }
.btn--dark { --btn-bg: var(--dusk-black); --btn-bg-hover: var(--dusk-plum); --btn-fg: #FFFFFF; }
.link-arrow:hover .arrow-circle, .has-arrow:hover .arrow-circle, .has-arrow:focus-visible .arrow-circle {
  background: #FFFFFF; border-color: #FFFFFF; color: var(--dusk-black);
}
:focus-visible { outline-color: var(--dusk-lilac); }
::selection { background: var(--dusk-lilac); color: var(--dusk-black); }

/* the mark's bracket replaces the offset squares as the small marker */
.squares { width: 0.75rem; height: 0.875rem; }
.squares::before { left: 0; top: 0; width: 100%; height: 100%; background: none; border: 2px solid currentColor; border-right: 0; }
.squares::after { right: 0; bottom: auto; top: 30%; width: 3px; height: 40%; }

/* navigation: navy logo tile, white call to action */
.nav__logo { background: var(--dusk-navy); --mark-w: 1.375rem; padding-inline: 0.875rem; }
.nav__logo:hover { background: var(--dusk-indigo); }
.nav__cta { background: #FFFFFF; color: var(--dusk-black); box-shadow: inset 0 0 0 1px rgba(26,22,46,0.14); }
.nav__cta:hover { background: var(--dusk-lilac); }
.nav.on-light .nav__cta { background: var(--dusk-black); color: #FFFFFF; }
.tab__menu a:hover { background: var(--dusk-mauve); }
.loader .mark { --mark-w: 3rem; }

/* bracket frames: a box border with the middle of its top and bottom cut away = [ ] */
.brackets {
  --arm: 18%;
  border: clamp(14px, 2.2vw, 34px) solid var(--bracket);
  -webkit-mask-image: linear-gradient(90deg, #000 0 var(--arm), transparent var(--arm) calc(100% - var(--arm)), #000 calc(100% - var(--arm)));
          mask-image: linear-gradient(90deg, #000 0 var(--arm), transparent var(--arm) calc(100% - var(--arm)), #000 calc(100% - var(--arm)));
}

/* hero: centred statement over the sky, the planet's limb below */
.hero__shade {
  background:
    radial-gradient(ellipse 60% 45% at 50% 34%, rgba(8,7,15,0.55), transparent 75%),
    linear-gradient(0deg, rgba(8,7,15,0.7) 0%, rgba(8,7,15,0) 30%),
    linear-gradient(180deg, rgba(8,7,15,0.6) 0%, rgba(8,7,15,0) 22%);
}
.hero__tint {
  background:
    linear-gradient(180deg, rgba(20,27,65,0.35) 0%, rgba(132,112,150,0.0) 45%, rgba(225,173,172,0.16) 80%, rgba(250,183,149,0.22) 100%);
  mix-blend-mode: screen;
}
.hero__content {
  grid-template-columns: minmax(0, 1fr); align-content: start; justify-items: center; text-align: center;
  padding-top: calc(var(--tab-h) + clamp(4rem, 15vh, 10rem)); padding-bottom: 0;
}
.hero__copy { display: flex; flex-direction: column; align-items: center; }
.hero__eyebrow { justify-content: center; }
.hero__title { max-width: 13em; font-size: clamp(2.75rem, 1.9rem + 3.8vw, 5.5rem); }
.hero__row { flex-direction: column; align-items: center; gap: var(--s-32); margin-top: var(--s-32); }
.hero__lead { max-width: 34rem; font-size: var(--fs-body); }
.hero__card { position: absolute; right: var(--gutter-x); bottom: clamp(var(--s-48), 9vh, var(--s-96)); text-align: left; }
@media (max-width: 1080px) { .hero__card { display: none; } }
@media (max-width: 640px) { .hero__content { padding-top: calc(var(--tab-h) + 4.5rem); } }

/* statement: the dusk gradient, white words lighting up, deep indigo text at the peach end */
.statement { background: var(--grad-dusk); }
.statement__text .fw { color: rgba(255,255,255,0.32); }
.statement__foot p, .statement__foot .link-arrow { color: #1A162E; }

/* perspective: dusk panel + plum block, brackets over the portrait */
.perspective__bloom { background: var(--grad-dusk); --mark-w: clamp(3.25rem, 6.5vw, 5.5rem); }
.js .perspective__bloom { animation: none; }
.perspective__copy { background: var(--dusk-plum); }
.perspective__copy .accent { color: var(--dusk-lilac); }
.perspective__photo::before {
  content: ""; position: absolute; z-index: 2; inset: 16% 24% 46% 24%; pointer-events: none;
  --arm: 22%;
  border: clamp(8px, 1.2vw, 16px) solid rgba(255,255,255,0.32);
  -webkit-mask-image: linear-gradient(90deg, #000 0 var(--arm), transparent var(--arm) calc(100% - var(--arm)), #000 calc(100% - var(--arm)));
          mask-image: linear-gradient(90deg, #000 0 var(--arm), transparent var(--arm) calc(100% - var(--arm)), #000 calc(100% - var(--arm)));
}

/* sector cards: indigo, dusk, plum, lilac-white, night */
.card--orange  { --card-top: var(--dusk-navy); }
.card--bloom   { --card-top: var(--grad-dusk); }
.card--oxblood { --card-top: var(--dusk-plum); }
.card--espresso { --card-top: var(--dusk-indigo); }
.card__wash { background: linear-gradient(0deg, rgba(194,160,201,0.45), transparent 70%); }

/* horizon: dusk half, the ellipse becomes a bracket frame round the hardware */
.horizon__orange { background: var(--grad-dusk); }
.horizon__ellipse.brackets {
  background: none; border-radius: 0; aspect-ratio: auto;
  width: min(60vw, 50rem); height: 64%; top: 50%;
  border-width: clamp(10px, 1.4vw, 22px);
  border-color: rgba(255,255,255,0.34);
  transform: scale(var(--sc, 1));
}
.horizon__ellipse.brackets::before { display: none; }
.horizon__b { color: #1A162E; }

/* brand moment: brackets round the window */
.moment__sticky::before {
  content: ""; position: absolute; z-index: 1; inset: 14% 20%; pointer-events: none;
  --arm: 16%;
  border: clamp(14px, 2vw, 28px) solid rgba(255,255,255,0.18);
  -webkit-mask-image: linear-gradient(90deg, #000 0 var(--arm), transparent var(--arm) calc(100% - var(--arm)), #000 calc(100% - var(--arm)));
          mask-image: linear-gradient(90deg, #000 0 var(--arm), transparent var(--arm) calc(100% - var(--arm)), #000 calc(100% - var(--arm)));
  opacity: calc(var(--m, 1) * 1.2);
}

/* evidence: the card in dusk; streaks in lilac and peach */
.bloom-card { background: var(--grad-dusk); }
.js .bloom-card { animation: none; }
.bloom-card__foot { color: #1A162E; }
.bloom-card__foot .link-arrow { color: #1A162E; }

/* closing: the horizontal dusk band from the deck */
.cta { background: var(--grad-dusk-x); }
.cta__rays { opacity: 0.35; }
.cta__beam { opacity: 0.55; }
.cta__edge { background: radial-gradient(ellipse 60% 70% at 100% 100%, rgba(20,27,65,0.6), transparent 70%); }
.cta__strip { background: var(--dusk-black); color: #FFFFFF; box-shadow: none; }
.cta__left .lockup { --mark-w: clamp(3rem, 5vw, 4.5rem); }
.cta__left .lockup__word { font-family: var(--font-display); letter-spacing: 0.01em; }
.cta__text { color: #FFFFFF; text-shadow: 0 1px 24px rgba(20,27,65,0.25); }

/* the orbit squares belong to the Ember mark */
.about__orbit .orbit-sq { display: none; }

/* footer */
.footer__legal b { color: var(--dusk-lilac); }
'''
# before the reduced-motion block so its !important rules still win
marker = '/* =====================================================================\n   20. REDUCED MOTION'
assert s.count(marker) == 1
s = s.replace(marker, DUSK + '\n' + marker)

(ROOT / 'variation-2.html').write_text(s)
print('wrote', ROOT / 'variation-2.html', len(s))
