"""Bundle Collage Studio into one HTML file you can copy to any computer and double-click.

    python3 studio/tools/build_single_file.py            # writes studio/dist/collage-studio.html
    python3 studio/tools/build_single_file.py --artifact DIR   # the page for the claude.ai artifact (DIR/collage-studio.html)

Everything local (scripts, styles, bundled photos) is inlined, and so are the
libraries in studio/vendor (Konva, the MP4/WebM muxers, JSZip), so the editor and
video export work offline. Google Fonts and the background-removal model still
come from the internet when they're first used; without it, text falls back to
system fonts and background removal is unavailable.
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
OUT = os.path.join(SRC, 'dist', 'collage-studio.html')

src = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
head = src[src.index('<head>') + 6:src.index('</head>')]
body = src[src.index('<body>') + 6:src.index('</body>')]
local = re.findall(r'<script src="((?!https)[^"]+)"></script>', body)
body = re.sub(r'\s*<script src="(?!https)[^"]+"></script>', '', body)
head = re.sub(r'\s*<link rel="stylesheet" href="studio.css" />', '', head)
css = open(os.path.join(SRC, 'studio.css'), encoding='utf-8').read()
# the CDN copy of Konva is swapped for the vendored one, and the lazy-loaded libraries ride along
VENDOR = os.path.join(SRC, 'vendor')
body = re.sub(r'\s*<script src="https://cdn\.jsdelivr\.net/npm/konva@[^"]+"></script>', '', body)
vendored = ['konva.min.js', 'mp4-muxer.js', 'webm-muxer.js', 'jszip.min.js']
js = ''.join('<script>\n' + open(os.path.join(VENDOR, f), encoding='utf-8').read() + '\n</script>\n' for f in vendored)
js += ''.join('<script>\n' + open(os.path.join(SRC, f), encoding='utf-8').read() + '\n</script>\n' for f in local)

# the claude.ai artifact: the same page as a fragment (the host adds the document skeleton), with the
# background-removal model read from the artifact's own files (models/rmbg.part0.txt …) instead of Hugging Face
if '--artifact' in sys.argv:
    out = os.path.join(sys.argv[sys.argv.index('--artifact') + 1], 'collage-studio.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('<title>Savio’s editor</title>\n<meta name="description" content="A layered photo & graphic editor for scrapbook-style posts.">\n'
                '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
                f'<style>\n{css}\n</style>\n{body.strip()}\n<script>window.STUDIO_MODEL_PARTS = 5;</script>\n{js}')
    print('wrote', out, f'({os.path.getsize(out) // 1024} KB) with', ', '.join(vendored + local))
    sys.exit()

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(f'<!DOCTYPE html>\n<html lang="en">\n<head>{head}<style>\n{css}\n</style>\n</head>\n<body>{body.rstrip()}\n{js}</body>\n</html>\n')
print('wrote', os.path.relpath(OUT), f'({os.path.getsize(OUT) // 1024} KB) with', ', '.join(vendored + local))
