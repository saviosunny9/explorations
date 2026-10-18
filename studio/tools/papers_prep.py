# Prepares the bundled paper textures (papers.js). Sources: ambientCG Paper001/002/003/004/006 1K-JPG colour maps
# (https://ambientcg.com, CC0) unzipped into <Name>/, and Wikimedia Commons Old_paper1/2/6/7.jpg, Old_Paper_texture.jpg
# (public domain) and Pergament.2.jpg (CC0) in commons/. Writes normalised multiply maps to out/.
import numpy as np, json, os
from PIL import Image, ImageFilter
A = lambda n: f'{n}/{n}_1K-JPG_Color.jpg'
C = lambda n: f'commons/{n}'
def load(p): return Image.open(p).convert('RGB')
def detail(img, flatten=None, keep=0.5, pct=93, gain=1.0, size=1100):
    s = size / max(img.size)
    if s < 1: img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    a = np.asarray(img).astype(np.float32) / 255
    if flatten:  # take out the scanner's uneven light, keep the paper's own grain and marks
        bl = np.asarray(img.convert('L').filter(ImageFilter.GaussianBlur(flatten))).astype(np.float32) / 255
        a = a / np.maximum(bl[..., None], 0.05) * bl.mean()
    ref = np.percentile(a.reshape(-1, 3), pct, axis=0)
    a = a / ref
    L = (a * [0.299, 0.587, 0.114]).sum(-1, keepdims=True)
    a = L + (a - L) * keep
    a = 1 - (1 - np.clip(a, 0, 1)) * gain
    return np.clip(a, 0, 1)
def save(a, name):
    Image.fromarray((a * 255 + 0.5).astype(np.uint8)).save(f'out/{name}.jpg', quality=80, optimize=True, progressive=True)
specs = {}
# natural: fine fibre tooth from a clean sheet, with the soft mottle of an old page laid in (both real)
fib = detail(load(A('Paper001')), flatten=24, keep=0, gain=1.6)
mot = detail(load(C('Old_paper6.jpg')), flatten=None, keep=0, gain=0.45)
fib_i = Image.fromarray((fib * 255).astype(np.uint8)).resize((mot.shape[1], mot.shape[0]), Image.LANCZOS)
nat = np.asarray(fib_i).astype(np.float32) / 255 * mot
save(nat, 'natural')
save(detail(load(A('Paper001')), flatten=24, keep=0, gain=1.9), 'cotton')
save(detail(load(A('Paper003')), flatten=None, keep=0, gain=1.3), 'creased')
save(detail(load(A('Paper002')), flatten=30, keep=0.5, gain=1.4), 'recycled')
save(detail(load(A('Paper006')), flatten=30, keep=0.25, gain=1.5), 'kraft')
save(detail(load(A('Paper004')), flatten=30, keep=0, gain=1.2), 'laid')
save(detail(load(C('Old_paper1.jpg')), keep=0.8, gain=1.0), 'aged')
save(detail(load(C('Old_paper2.jpg')), keep=0.7, gain=1.0), 'stained')
save(detail(load(C('Old_paper7.jpg')), keep=0.6, gain=1.2), 'folded')
save(detail(load(C('Old_paper6.jpg')), keep=0.7, gain=1.0), 'parchment')
save(detail(load(C('Old_Paper_texture.jpg')), keep=0.8, gain=1.0, pct=90), 'burnt')
save(detail(load(C('Pergament.2.jpg')), keep=0.5, gain=1.5), 'vellum')
for f in sorted(os.listdir('out')): print(f, os.path.getsize('out/' + f) // 1024, 'KB', Image.open('out/' + f).size)
