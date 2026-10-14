#!/usr/bin/env python3
"""Builds the LUMA site from src/: index.html (a full page) and, with --artifact DIR, the claude.ai artifact page."""
import pathlib, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
THREE = 'https://cdn.jsdelivr.net/npm/three@0.169.0/'

def head():
    return f'''<title>LUMA Fine Jewellery</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Fine jewellery from twelve European ateliers, curated in Dubai. View every piece in 3D, compose your own, try it on, or book a home try-on.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Outfit:wght@300;400;500;600&display=swap">
<script type="importmap">{{"imports":{{"three":"{THREE}build/three.module.js","three/addons/":"{THREE}examples/jsm/"}}}}</script>
<style>
{(SRC / 'style.css').read_text()}
</style>'''

def body():
    return (SRC / 'page.html').read_text() + '\n<script type="module">\n' + (SRC / 'app.js').read_text() + '\n</script>\n'

full = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + head() + '\n</head>\n<body>\n' + body() + '</body>\n</html>\n')
(ROOT / 'index.html').write_text(full)
print('wrote', ROOT / 'index.html', len(full) // 1024, 'KB')

if '--artifact' in sys.argv:
    out = pathlib.Path(sys.argv[sys.argv.index('--artifact') + 1]); out.mkdir(parents=True, exist_ok=True)
    (out / 'luma.html').write_text(head() + '\n' + body())
    (out / 'sample-portrait.jpg').write_bytes((ROOT / 'sample-portrait.jpg').read_bytes())
    (out / 'img').mkdir(exist_ok=True)
    for f in (ROOT / 'img').glob('*.jpg'): (out / 'img' / f.name).write_bytes(f.read_bytes())
    print('wrote', out / 'luma.html')
