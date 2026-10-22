#!/usr/bin/env python3
"""Builds the single-file Sixjuly Flow.
  python3 tools/build_artifact.py            -> dist/sixjuly-flow.html   (complete page, works offline except Google Fonts)
  python3 tools/build_artifact.py --artifact DIR -> DIR/sixjuly-flow.html (page content only, for a claude.ai artifact: no doctype / html / head / body)
Everything is inlined: stylesheet, scripts and the muxers / JSZip, because an artifact can only load scripts from a few CDNs and cannot fetch files."""
import re, sys, os
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
rd = lambda p: open(os.path.join(root, p), encoding='utf-8').read()
html = rd('index.html')
art = '--artifact' in sys.argv
outdir = sys.argv[sys.argv.index('--artifact') + 1] if art else os.path.join(root, 'dist')
os.makedirs(outdir, exist_ok=True)

def js(m):
    code = rd(m.group(1))
    return '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', js, html)
# the muxers load lazily; inline them as scripts too so the page needs no vendor folder
vendor = ''.join('<script>\n%s\n</script>\n' % rd('vendor/%s' % f).replace('</script', '<\\/script') for f in ('mp4-muxer.js', 'webm-muxer.js'))
html = html.replace('<script>\n/* Sixjuly Flow — exports', vendor + '<script>\n/* Sixjuly Flow — exports', 1)
html = re.sub(r'<link rel="stylesheet" href="flow.css">', lambda m: '<style>\n' + rd('flow.css') + '\n</style>', html)
if art:
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
    head = re.sub(r'<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*|<link rel="preconnect"[^>]*>\s*', '', head)
    head = head.replace('<title>Sixjuly Flow</title>', '<title>Sixjuly Flow</title>\n<meta name="claude:viewport-fit-sides" content="cover">')
    html = head.strip() + '\n' + body.strip() + '\n'
dst = os.path.join(outdir, 'sixjuly-flow.html')
open(dst, 'w', encoding='utf-8').write(html)
print('wrote %s (%.0f KB)' % (dst, len(html.encode('utf-8')) / 1024))
