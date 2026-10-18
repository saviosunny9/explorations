# Prepares the bundled recorded sounds (soundpack.js) from BigSoundBank (https://bigsoundbank.com, Joseph Sardin, CC0 —
# every file used here has "Free and Royalty Free" on its page; see tools/../README.md for the credit).
# Usage: python3 sounds_prep.py <dir with <id>.mp3 files> [out.js]
# Each entry is trimmed to its event (one-shot), a steady window (a take: typing, steps…) or a seamless loop (ambience),
# levelled and encoded to small MP3s, then written as data URLs into window.StudioSoundpack.
import base64, json, os, subprocess, sys
import numpy as np

RAW = sys.argv[1] if len(sys.argv) > 1 else 'raw'
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'soundpack.js')
SR = 44100

# key, BigSoundBank id, name, category, mode ('shot' | 'take' | 'amb' | 'samp'), max length (s), options
S = [
    # transitions
    ('whoosh', '1795', 'Whoosh', 'transition', 'shot', 1.4, {}),
    ('whoosh-big', '1796', 'Big whoosh', 'transition', 'shot', 1.4, {}),
    ('whoosh-air', '1800', 'Air whoosh', 'transition', 'shot', 1.2, {}),
    ('whoosh-pass', '1801', 'Pass-by whoosh', 'transition', 'shot', 1.2, {}),
    ('whoosh-quick', '1797', 'Quick whoosh', 'transition', 'shot', 0.8, {}),
    ('swish', '1799', 'Swish', 'transition', 'shot', 0.8, {}),
    ('swish-snap', '1798', 'Snap swish', 'transition', 'shot', 0.7, {}),
    ('flick', '1802', 'Flick', 'transition', 'shot', 0.6, {}),
    ('whoosh-soft', '0572', 'Soft whoosh', 'transition', 'shot', 3.0, {}),
    ('whoosh-light', '0573', 'Light whoosh', 'transition', 'shot', 3.0, {}),
    ('whip', '2949', 'Whip crack', 'transition', 'shot', 1.4, {}),
    ('flicker', '2146', 'Light flicker', 'transition', 'shot', 1.6, {}),
    ('flicker-bulb', '2144', 'Bulb flicker', 'transition', 'shot', 1.0, {}),
    ('flicker-quick', '2145', 'Quick flicker', 'transition', 'shot', 0.8, {}),
    ('flicker-tiny', '2143', 'Tiny flicker', 'transition', 'shot', 0.6, {}),
    ('neon', '2118', 'Neon hum', 'transition', 'take', 4.0, {'loop': True}),
    ('switch-power', '3061', 'Power switch', 'transition', 'shot', 1.6, {}),
    ('switch', '0052', 'Light switch', 'transition', 'shot', 1.0, {}),
    # phone & typing
    ('typewriter', '2841', 'Typewriter', 'phone', 'take', 6.0, {'skip': 1.0}),
    ('typewriter-fast', '2838', 'Typewriter, fast', 'phone', 'take', 6.0, {'skip': 20.0}),
    ('typewriter-bell', '2844', 'Typewriter bell & return', 'phone', 'shot', 2.6, {'tail': 2.6}),
    ('laptop', '1728', 'Laptop keyboard', 'phone', 'take', 6.0, {'skip': 1.0}),
    ('laptop-slow', '1726', 'Laptop, slow typing', 'phone', 'take', 6.0, {'skip': 1.0}),
    ('desktop', '1724', 'Desktop keyboard', 'phone', 'take', 6.0, {'skip': 1.0}),
    ('mouse', '1736', 'Mouse double-click', 'phone', 'shot', 0.6, {'tail': 0.6}),
    ('message', '1111', 'Message received', 'phone', 'shot', 2.0, {}),
    ('message-tone', '1112', 'Message tone', 'phone', 'shot', 2.5, {}),
    ('notify-1', '2063', 'Notification 1', 'phone', 'shot', 0.6, {'tail': 0.6}),
    ('notify-2', '2064', 'Notification 2', 'phone', 'shot', 0.6, {'tail': 0.6}),
    ('notify-3', '2059', 'Notification 3', 'phone', 'shot', 0.5, {'tail': 0.5}),
    ('notify-4', '2060', 'Notification 4', 'phone', 'shot', 0.4, {'tail': 0.4}),
    ('ding-bright', '1398', 'Bright ding', 'phone', 'shot', 3.4, {'tail': 3.4}),
    ('ding-soft', '1399', 'Soft ding', 'phone', 'shot', 3.8, {'tail': 3.8}),
    ('ring-landline', '0250', 'Landline ring', 'phone', 'shot', 2.4, {'tail': 2.4}),
    ('ring-old', '0252', 'Old telephone ring', 'phone', 'shot', 1.8, {'tail': 1.8}),
    ('ring-booth', '3364', 'Phone booth ring', 'phone', 'take', 6.0, {}),
    ('ring-office', '3301', 'Office phone ring', 'phone', 'take', 6.0, {}),
    ('dial', '3306', 'Rotary dial', 'phone', 'take', 5.0, {}),
    ('vibrate', '0023', 'Phone vibrate', 'phone', 'take', 3.0, {}),
    ('ringback', '1614', 'Calling tone', 'phone', 'take', 6.0, {}),
    ('desk-bell', '0479', 'Desk bell', 'phone', 'shot', 2.2, {}),
    # camera & film
    ('shutter', '2394', 'Camera shutter', 'camera', 'shot', 0.5, {'tail': 0.5}),
    ('shutter-soft', '2395', 'Shutter, soft', 'camera', 'shot', 0.5, {'tail': 0.5}),
    ('shutter-dslr', '2544', 'DSLR shutter', 'camera', 'shot', 0.8, {'tail': 0.8}),
    ('burst', '0985', 'Burst shooting', 'camera', 'take', 3.0, {}),
    ('paparazzi', '2389', 'Paparazzi', 'camera', 'take', 4.0, {}),
    ('film-click', '2821', 'Film camera click', 'camera', 'shot', 0.5, {'tail': 0.5}),
    ('film-wind', '2817', 'Film advance lever', 'camera', 'shot', 0.9, {'tail': 0.9}),
    ('super8', '2829', 'Super 8 camera', 'camera', 'take', 5.0, {'skip': 1.0, 'loop': True}),
    ('cam16', '0939', '16mm camera', 'camera', 'take', 5.0, {'skip': 3.0, 'loop': True}),
    ('proj8', '2823', '8mm projector', 'camera', 'take', 6.0, {'skip': 4.0, 'loop': True}),
    ('proj35', '0065', 'Cinema projector', 'camera', 'take', 6.0, {'skip': 6.0, 'loop': True}),
    ('slides', '0867', 'Slide projector', 'camera', 'take', 4.0, {'skip': 2.0}),
    ('reel', '0074', 'Film reel rewind', 'camera', 'take', 4.0, {'skip': 3.0}),
    # everyday
    ('steps-wood', '1515', 'Footsteps, wood floor', 'everyday', 'take', 5.0, {'skip': 1.0}),
    ('steps-gravel', '0510', 'Footsteps, gravel', 'everyday', 'take', 5.0, {}),
    ('steps-heels', '0166', 'High heels', 'everyday', 'take', 5.0, {}),
    ('steps-leaves', '0137', 'Walking in leaves', 'everyday', 'take', 5.0, {'skip': 4.0}),
    ('steps-snow', '3363', 'Walking in snow', 'everyday', 'take', 5.0, {'skip': 2.0}),
    ('steps-stairs', '3212', 'Wooden stairs', 'everyday', 'take', 5.0, {}),
    ('steps-creak', '3440', 'Creaky floor', 'everyday', 'take', 5.0, {'skip': 2.0}),
    ('body-fall', '2452', 'Body fall', 'everyday', 'shot', 1.6, {}),
    ('thud', '1835', 'Thud', 'everyday', 'shot', 1.2, {}),
    ('thump', '0806', 'Thump', 'everyday', 'shot', 1.0, {}),
    ('knock', '0319', 'Knock knock', 'everyday', 'shot', 1.6, {'tail': 1.6}),
    ('door-open', '1702', 'Door opens', 'everyday', 'shot', 3.0, {'tail': 3.0}),
    ('door-close', '1704', 'Door closes', 'everyday', 'shot', 2.6, {'tail': 2.6}),
    ('door-creak', '0302', 'Creaky door', 'everyday', 'shot', 1.3, {'tail': 1.3}),
    ('door-slam', '0103', 'Door slam', 'everyday', 'shot', 2.2, {'post': 1.2}),
    ('pencil', '0221', 'Pencil writing', 'everyday', 'take', 5.0, {'skip': 1.0}),
    ('pencil-sketch', '3233', 'Pencil sketching', 'everyday', 'take', 4.0, {}),
    ('signature', '3236', 'Signing', 'everyday', 'shot', 3.4, {'tail': 3.4}),
    ('page', '0493', 'Page turn', 'everyday', 'shot', 1.4, {}),
    ('page-big', '0362', 'Big page turn', 'everyday', 'shot', 1.8, {'tail': 1.8}),
    ('book', '1410', 'Book closes', 'everyday', 'shot', 1.2, {'tail': 1.2}),
    ('tear', '0018', 'Paper tear', 'everyday', 'shot', 2.0, {}),
    ('crumple', '1223', 'Paper crumple', 'everyday', 'shot', 2.6, {'tail': 2.6}),
    ('keys', '0083', 'Keys dropped', 'everyday', 'shot', 2.0, {}),
    ('zipper', '0270', 'Zipper', 'everyday', 'shot', 1.0, {'tail': 1.0}),
    ('pour', '1155', 'Pouring a drink', 'everyday', 'take', 4.0, {}),
    ('espresso', '3047', 'Espresso machine', 'everyday', 'take', 6.0, {'skip': 5.0}),
    ('match', '0004', 'Match strike', 'everyday', 'shot', 3.0, {}),
    ('splash', '1529', 'Splash', 'everyday', 'shot', 2.0, {}),
    ('drips', '1384', 'Water drips', 'everyday', 'take', 5.0, {'skip': 2.0}),
    ('applause', '1765', 'Applause', 'everyday', 'take', 6.0, {'skip': 1.0}),
    ('scratch', '2858', 'Record scratch', 'everyday', 'shot', 1.3, {'tail': 1.3}),
    ('scratch-back', '2861', 'Scratch back', 'everyday', 'shot', 1.5, {'tail': 1.5}),
    ('needle', '0587', 'Needle drop', 'everyday', 'shot', 3.3, {'tail': 3.3}),
    ('clock', '1372', 'Clock ticking', 'everyday', 'take', 5.0, {'skip': 2.0, 'loop': True}),
    ('alarm', '1374', 'Alarm clock', 'everyday', 'take', 4.0, {}),
    # nature & places
    ('dawn', '0222', 'Dawn chorus', 'nature', 'amb', 12.0, {}),
    ('blackbird', '3503', 'Blackbird', 'nature', 'shot', 3.7, {'tail': 3.7}),
    ('robin', '1667', 'Robin', 'nature', 'shot', 2.3, {'tail': 2.3}),
    ('nightingale', '3087', 'Nightingale', 'nature', 'shot', 3.3, {'tail': 3.3}),
    ('owl', '1763', 'Owl', 'nature', 'take', 5.0, {}),
    ('crows', '0956', 'Crows', 'nature', 'shot', 4.3, {'tail': 4.3}),
    ('birds-town', '3575', 'Birds in town', 'nature', 'amb', 10.0, {}),
    ('forest', '1348', 'Forest', 'nature', 'amb', 12.0, {}),
    ('forest-stream', '2713', 'Forest stream', 'nature', 'amb', 12.0, {}),
    ('crickets', '3089', 'Crickets', 'nature', 'amb', 10.0, {}),
    ('insects', '1052', 'Summer insects', 'nature', 'amb', 10.0, {}),
    ('night', '0110', 'Countryside at night', 'nature', 'amb', 12.0, {}),
    ('frogs', '0997', 'Frogs', 'nature', 'amb', 10.0, {}),
    ('brook', '0213', 'Brook', 'nature', 'amb', 10.0, {}),
    ('stream', '2754', 'Mountain stream', 'nature', 'amb', 10.0, {}),
    ('waterfall', '0219', 'Waterfall', 'nature', 'amb', 10.0, {}),
    ('rain-thunder', '0124', 'Rain & thunder', 'nature', 'amb', 12.0, {'busy': True}),
    ('rain', '1297', 'Rain on a window', 'nature', 'amb', 10.0, {}),
    ('thunder', '2718', 'Thunder', 'nature', 'shot', 8.0, {'post': 6.0}),
    ('waves', '1446', 'Small waves', 'nature', 'amb', 12.0, {'busy': True}),
    ('ocean', '2564', 'Ocean beach', 'nature', 'amb', 12.0, {'busy': True}),
    ('wind', '0146', 'Strong wind', 'nature', 'amb', 10.0, {}),
    ('wind-trees', '1450', 'Wind in the trees', 'nature', 'amb', 10.0, {}),
    ('wind-whistle', '0147', 'Whistling wind', 'nature', 'amb', 10.0, {}),
    ('fireplace', '0031', 'Fireplace', 'nature', 'amb', 10.0, {}),
    ('campfire', '0987', 'Campfire', 'nature', 'amb', 10.0, {}),
    ('town', '1346', 'Town square', 'nature', 'amb', 12.0, {}),
    ('cafe', '0480', 'Café', 'nature', 'amb', 12.0, {}),
    ('street', '0643', 'City street', 'nature', 'amb', 10.0, {}),
    # drums & hits (also the drum kit of the music beds)
    ('snare', '2304', 'Snare', 'hit', 'samp', 0.9, {}),
    ('snare-2', '2305', 'Snare, tight', 'hit', 'samp', 0.9, {}),
    ('snare-3', '2306', 'Snare, soft', 'hit', 'samp', 0.9, {}),
    ('hat', '2292', 'Hi-hat', 'hit', 'samp', 0.6, {}),
    ('hat-open', '2290', 'Open hi-hat', 'hit', 'samp', 1.4, {}),
    ('ride', '2323', 'Ride cymbal', 'hit', 'samp', 3.0, {}),
    ('ride-2', '2324', 'Ride cymbal, bell', 'hit', 'samp', 3.0, {}),
    ('crash', '2311', 'Crash cymbal', 'hit', 'samp', 3.5, {}),
    ('tom-low', '2338', 'Floor tom', 'hit', 'samp', 2.0, {}),
    ('tom-mid', '2333', 'Tom', 'hit', 'samp', 1.8, {}),
    ('tom-high', '2329', 'High tom', 'hit', 'samp', 1.6, {}),
    # instrument notes for the music beds (not listed in the panel)
    ('mbox-c', '1867', '', 'samp', 'samp', 2.6, {}), ('mbox-cs', '1868', '', 'samp', 'samp', 2.6, {}),
    ('mbox-ds', '1869', '', 'samp', 'samp', 2.6, {}), ('mbox-f', '1870', '', 'samp', 'samp', 2.6, {}),
    ('mbox-g', '1871', '', 'samp', 'samp', 2.3, {}), ('mbox-gs', '1865', '', 'samp', 'samp', 2.6, {}),
    ('mbox-as', '1866', '', 'samp', 'samp', 2.6, {}),
    ('mbira-1', '2285', '', 'samp', 'samp', 2.4, {}), ('mbira-2', '2286', '', 'samp', 'samp', 2.4, {}),
    ('mbira-3', '2287', '', 'samp', 'samp', 2.4, {}), ('mbira-4', '2288', '', 'samp', 'samp', 2.4, {}),
    ('mbira-5', '2289', '', 'samp', 'samp', 2.4, {}),
]


def load(sid):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(RAW, sid + '.mp3'), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True)
    return np.frombuffer(p.stdout, np.float32).reshape(-1, 2).copy()


def env(x, hop=441):
    m = np.abs(x).max(1)
    n = len(m) // hop
    return np.sqrt((m[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9


def db(v): return 20 * np.log10(v + 1e-12)


def fade(x, a, b):
    x = x.copy()
    if a: x[:a] *= np.linspace(0, 1, a)[:, None]
    if b: x[-b:] *= np.linspace(1, 0, b)[:, None] ** 2
    return x


def shot(x, mx, o):
    # the event around the loudest moment: back to where it rises out of the quiet, on until it has died away
    e = env(x); pk = e.max(); k = int(np.argmax(e))
    # 'quiet' = well under the peak, and clearly down near the recording's own noise floor
    thr = max(db(pk) - 45, db(np.percentile(e, 10)) + 8)
    if o.get('tail'):
        on = np.where(db(e[:k + 1]) > db(pk) - 26)[0][0]
        start = max(0, on * 441 - int(0.01 * SR))
        end = min(len(x), start + int(o['tail'] * SR))
    else:
        i = k
        while i > 0 and not (db(e[max(0, i - 15):i]) < thr).all(): i -= 1
        start = max(0, i * 441 - int(0.012 * SR))
        j = k
        while j < len(e) - 1 and not (db(e[j:j + 25]) < thr).all(): j += 1
        end = min(len(x), max(j * 441 + int(0.1 * SR), k * 441 + int(o.get('post', 0) * SR)), start + int(mx * SR))
    return fade(x[start:end], int(0.004 * SR), min(int(0.12 * SR), (end - start) // 4))


def take(x, mx, o):
    e = env(x); pk = e.max()
    on = np.where(db(e) > db(pk) - 30)[0][0] * 441
    start = min(max(on, int(o.get('skip', 0) * SR)), max(0, len(x) - int(mx * SR)))
    L = min(int(mx * SR), len(x) - start)
    seg = x[start:start + L]
    if o.get('loop'): return loopify(x, start, L)
    return fade(seg, int(0.02 * SR), int(0.35 * SR))


def loopify(x, start, L, xf=None):
    xf = xf or int(min(1.0, L / SR / 6) * SR)
    if start + L + xf > len(x): start = max(0, len(x) - L - xf)
    seg = x[start:start + L + xf].copy()
    head, tail = seg[:xf], seg[L:L + xf]
    w = np.sin(np.linspace(0, np.pi / 2, xf))[:, None]
    out = seg[:L].copy()
    out[:xf] = head * w + tail * np.cos(np.linspace(0, np.pi / 2, xf))[:, None]
    return out


def amb(x, mx, o):
    # the steadiest stretch (no dropouts, no single event towards one end), made to loop
    L = int(mx * SR)
    if len(x) < L + SR: return loopify(x, 0, max(SR, len(x) - SR))
    e = db(env(x, 4410)); w = int(mx * 10)
    best, bi = 1e9, 0
    for i in range(1, len(e) - w - 10, 3):
        s = e[i:i + w]
        score = s.std() + max(0, np.median(e) - 18 - s.min()) * 2
        if o.get('busy'): score = s.std() * 0.5 + abs(s.mean() - np.median(e))
        if score < best: best, bi = score, i
    return loopify(x, bi * 4410, L)


def samp(x, mx, o):
    e = env(x, 110); pk = e.max()
    on = np.where(db(e) > db(pk) - 30)[0][0] * 110
    start = max(0, on - int(0.002 * SR))
    seg = x[start:start + int(mx * SR)]
    return fade(seg, int(0.001 * SR), len(seg) // 4)


def limit(y, c=0.86):
    a = np.abs(y)
    return np.where(a > c, np.sign(y) * (c + (0.99 - c) * np.tanh((a - c) / (0.99 - c))), y)


def level(x, mode):
    # one-shots by their peak (a lone click doesn't count), the rest by loudness; a soft limiter catches what's left
    a = np.abs(x).max(1)
    if mode in ('shot', 'samp'):
        return limit(x * (10 ** (-1.5 / 20) / (np.percentile(a, 99.97) + 1e-9)))
    rms = np.sqrt((x.mean(1) ** 2).mean()) + 1e-9
    g = min(10 ** (-19 / 20) / rms, 10 ** (-1 / 20) / (np.percentile(a, 99.9) + 1e-9))
    return limit(x * g)


def encode(x, mode, stereo):
    br = {'shot': '64k', 'take': '48k', 'amb': '48k', 'samp': '80k'}[mode]
    ch = '2' if (stereo and mode == 'amb') else '1'
    ar = '32000' if mode == 'amb' else '44100'
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-ac', ch, '-ar', ar, '-c:a', 'libmp3lame', '-b:a', br, '-f', 'mp3', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True)
    return p.stdout


items, total = {}, 0
for key, sid, name, cat, mode, mx, o in S:
    x = load(sid)
    stereo = np.abs(x[:, 0] - x[:, 1]).mean() > 1e-4
    y = {'shot': shot, 'take': take, 'amb': amb, 'samp': samp}[mode](x, mx, o)
    y = level(y, mode)
    mp3 = encode(y, mode, stereo)
    total += len(mp3)
    it = {'src': 'data:audio/mpeg;base64,' + base64.b64encode(mp3).decode(), 'dur': round(len(y) / SR, 3), 'bsb': sid, 'peak': round(int(np.argmax(env(y))) * 441 / SR, 3)}
    if name: it.update(name=name, cat=cat, loop=bool(o.get('loop')) or mode == 'amb')
    items[key] = it
    print(f'{key:16} {sid} {mode:4} {len(y) / SR:5.2f}s {len(mp3) / 1024:6.1f} KB')
print(f'total {total / 1024 / 1024:.2f} MB ({len(items)} sounds)')
with open(OUT, 'w') as f:
    f.write('/* Recorded sounds for the Sounds library — BigSoundBank (bigsoundbank.com, Joseph Sardin), CC0 / royalty free.\n'
            '   Made by tools/sounds_prep.py: trimmed, levelled, MP3. key → { src, dur, peak (s, loudest moment), bsb (source id), name?, cat?, loop? }. */\n')
    f.write('window.StudioSoundpack = ' + json.dumps({'credit': 'Joseph Sardin — BigSoundBank.com (CC0)', 'items': items}, separators=(',', ':')) + ';\n')
