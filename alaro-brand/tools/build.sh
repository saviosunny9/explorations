#!/bin/sh
# Builds the branded copy of the Alaro 3D-home site.
# Needs the original static export in alaro-brand/base/site (download it from the
# "Alaro Home Story" artifact; it is not kept in git). Output: alaro-brand/build/
set -e
D=$(cd "$(dirname "$0")/.." && pwd)
OUT="$D/build"
rm -rf "$OUT" && mkdir -p "$OUT"
cp -r "$D/base/site" "$OUT/site"
mkdir -p "$OUT/site/brand" && cp "$D"/brand/* "$OUT/site/brand/"
cp "$D/index.html" "$OUT/index.html"
python3 "$D/tools/patch_html.py" "$D/base/site/index.html" "$OUT/site/index.html"
python3 "$D/tools/patch_html.py" "$D/base/site/404.html" "$OUT/site/404.html"
echo "built $OUT"
