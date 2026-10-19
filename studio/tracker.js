/* Collage Studio — motion tracking.
   Pins a layer to something in a video: the clip is stepped through frame by frame, a cluster of textured points around
   the spot is followed with block matching (coarse-to-fine, sub-pixel), and a robust similarity transform (move, scale,
   turn) is fitted to them each step. The result is stored on the layer as el.track (see R.trackXform in render.js). */
(function () {
  'use strict';
  const S = window.Studio, R = window.StudioRender;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const AW = 512; // analysis width

  const seek = (v, time) => new Promise(res => {
    let done = false;
    const fin = () => { if (done) return; done = true; v.removeEventListener('seeked', fin); res(); };
    v.addEventListener('seeked', fin); setTimeout(fin, 3000);
    v.currentTime = time;
  });

  // a frame as a grey Float32 image, plus a half-size copy for the coarse search
  function grab(v, cv) {
    const x = cv.getContext('2d', { willReadFrequently: true });
    x.drawImage(v, 0, 0, cv.width, cv.height);
    const d = x.getImageData(0, 0, cv.width, cv.height).data, w = cv.width, h = cv.height, g = new Float32Array(w * h);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    return { w, h, g, half: half({ w, h, g }) };
  }
  function half(f) {
    const w = f.w >> 1, h = f.h >> 1, g = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * 2 * f.w + x * 2;
      g[y * w + x] = (f.g[i] + f.g[i + 1] + f.g[i + f.w] + f.g[i + f.w + 1]) * 0.25;
    }
    return { w, h, g };
  }
  const px = (f, x, y) => f.g[clamp(y, 0, f.h - 1) * f.w + clamp(x, 0, f.w - 1)];
  function bil(f, x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const a = px(f, x0, y0), b = px(f, x0 + 1, y0), c = px(f, x0, y0 + 1), d = px(f, x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  // the patch around a point, mean removed (so a brightness change between frames doesn't matter)
  function patch(f, x, y, r) {
    const n = (2 * r + 1) * (2 * r + 1), p = new Float32Array(n);
    let k = 0, sum = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const v = bil(f, x + dx, y + dy); p[k++] = v; sum += v; }
    const m = sum / n; let e = 0;
    for (let i = 0; i < n; i++) { p[i] -= m; e += Math.abs(p[i]); }
    p.energy = e / n;
    return p;
  }
  function sadAt(f, T, r, cx, cy, best) {
    let sum = 0, k = 0;
    for (let dy = -r; dy <= r; dy++) { const row = clamp(cy + dy, 0, f.h - 1) * f.w; for (let dx = -r; dx <= r; dx++) sum += f.g[row + clamp(cx + dx, 0, f.w - 1)]; }
    const m = sum / T.length;
    let s = 0;
    for (let dy = -r; dy <= r; dy++) {
      const row = clamp(cy + dy, 0, f.h - 1) * f.w;
      for (let dx = -r; dx <= r; dx++) { s += Math.abs(f.g[row + clamp(cx + dx, 0, f.w - 1)] - m - T[k++]); if (s > best) return s; }
    }
    return s;
  }
  // where the patch T (taken from point p in frame a) went in frame b, searched around the guess g
  function match(a, b, p, g, r) {
    // coarse: half size, wide search
    const Th = patch(a.half, p.x / 2, p.y / 2, r);
    let bx = Math.round(g.x / 2), by = Math.round(g.y / 2), best = Infinity;
    const R1 = 10, cx0 = bx, cy0 = by;
    for (let dy = -R1; dy <= R1; dy++) for (let dx = -R1; dx <= R1; dx++) {
      const s = sadAt(b.half, Th, r, cx0 + dx, cy0 + dy, best);
      if (s < best) { best = s; bx = cx0 + dx; by = cy0 + dy; }
    }
    // fine: full size, small search around the coarse answer
    const T = patch(a, p.x, p.y, r), fx0 = bx * 2, fy0 = by * 2, R0 = 3;
    let fx = fx0, fy = fy0, fb = Infinity;
    const grid = new Map();
    for (let dy = -R0; dy <= R0; dy++) for (let dx = -R0; dx <= R0; dx++) {
      const s = sadAt(b, T, r, fx0 + dx, fy0 + dy, Infinity);
      grid.set(dx + ',' + dy, s);
      if (s < fb) { fb = s; fx = fx0 + dx; fy = fy0 + dy; }
    }
    // sub-pixel: a parabola through the best score and its neighbours, in each direction
    const at = (x, y) => grid.get((x - fx0) + ',' + (y - fy0)) ?? sadAt(b, T, r, x, y, Infinity);
    const par = (l, c, rr) => { const d = l - 2 * c + rr; return d > 1e-6 ? clamp(0.5 * (l - rr) / d, -0.5, 0.5) : 0; };
    const sx = par(at(fx - 1, fy), fb, at(fx + 1, fy)), sy = par(at(fx, fy - 1), fb, at(fx, fy + 1));
    return { x: fx + sx, y: fy + sy, err: fb / T.length, energy: T.energy };
  }
  // corners worth following near (cx, cy): strong texture in both directions (Shi–Tomasi), spread out
  // `inside` (optional) limits the search to the picked region; otherwise a circle of radius rad
  function features(f, cx, cy, rad, want, keep, inside) {
    const cand = [], step = rad > 60 ? 4 : 3, w = 4;
    for (let y = Math.max(w + 1, cy - rad); y < Math.min(f.h - w - 1, cy + rad); y += step) {
      for (let x = Math.max(w + 1, cx - rad); x < Math.min(f.w - w - 1, cx + rad); x += step) {
        if (inside ? !inside(x, y) : Math.hypot(x - cx, y - cy) > rad) continue;
        let gxx = 0, gyy = 0, gxy = 0;
        for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) {
          const ix = (px(f, x + dx + 1, y + dy) - px(f, x + dx - 1, y + dy)) / 2, iy = (px(f, x + dx, y + dy + 1) - px(f, x + dx, y + dy - 1)) / 2;
          gxx += ix * ix; gyy += iy * iy; gxy += ix * iy;
        }
        const tr = gxx + gyy, det = gxx * gyy - gxy * gxy, lmin = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
        cand.push({ x, y, q: lmin });
      }
    }
    cand.sort((a, b) => b.q - a.q);
    const out = keep ? keep.slice() : [], minD = Math.max(6, rad / 5), floor = cand.length ? cand[0].q * 0.04 : 0;
    for (const c of cand) {
      if (out.length >= want) break;
      if (c.q <= floor || c.q < 20) break;
      if (out.every(o => Math.hypot(o.x - c.x, o.y - c.y) >= minD)) out.push({ x: c.x, y: c.y, vx: 0, vy: 0 });
    }
    return out;
  }
  // least-squares move / scale / turn taking anchors (positions on the reference frame) to where the points are now
  function fit(pairs) {
    let ax = 0, ay = 0, qx = 0, qy = 0;
    for (const m of pairs) { ax += m.ax; ay += m.ay; qx += m.qx; qy += m.qy; }
    const n = pairs.length; ax /= n; ay /= n; qx /= n; qy /= n;
    let sxx = 0, dot = 0, crs = 0;
    for (const m of pairs) { const px = m.ax - ax, py = m.ay - ay, X = m.qx - qx, Y = m.qy - qy; sxx += px * px + py * py; dot += px * X + py * Y; crs += px * Y - py * X; }
    const c = sxx > 1e-6 ? dot / sxx : 1, sn = sxx > 1e-6 ? crs / sxx : 0;
    return { ax, ay, qx, qy, c, s: sn, apply: (x, y) => ({ x: qx + c * (x - ax) - sn * (y - ay), y: qy + sn * (x - ax) + c * (y - ay) }) };
  }
  // one step: follow the points from frame a to b, then fit the reference → now transform to all of them (nothing is
  // chained from step to step, so scale and turn don't creep)
  function step(a, b, st, r, ref) {
    const moved = [];
    for (const p of st.pts) {
      const g = { x: p.x + p.vx, y: p.y + p.vy };
      const q = match(a, b, p, g, r);
      if (q.err > Math.max(6, q.energy * 0.85) || q.x < 2 || q.y < 2 || q.x > b.w - 3 || q.y > b.h - 3) continue;
      moved.push({ ax: p.ax, ay: p.ay, qx: q.x, qy: q.y, vx: q.x - p.x, vy: q.y - p.y });
    }
    if (moved.length < 3) { st.lost++; return; }
    let F = fit(moved), good = moved;
    for (let it = 0; it < 2; it++) {
      const res = good.map(m => { const e = F.apply(m.ax, m.ay); return Math.hypot(e.x - m.qx, e.y - m.qy); });
      const lim = Math.max(1.5, median(res) * 2.5);
      const next = good.filter((m, i) => res[i] <= lim);
      if (next.length < 3 || next.length === good.length) break;
      good = next; F = fit(good);
    }
    // drift guard, point by point: each point is pulled back onto how it looked on the reference frame (seen through
    // the current fit), so small slips don't add up into a slow turn or slide
    if (ref) {
      const Hs = [F.c, -F.s, F.qx - F.c * F.ax + F.s * F.ay, F.s, F.c, F.qy - F.s * F.ax - F.c * F.ay, 0, 0, 1];
      good = good.map(m => { const q = snapToRef(ref, b, { ax: m.ax, ay: m.ay, x: m.qx, y: m.qy }, Hs, r); return Object.assign({}, m, { qx: q.x, qy: q.y }); });
      F = fit(good);
    }
    st.T = F;
    st.c = F.apply(st.c0.x, st.c0.y);
    st.s = Math.hypot(F.c, F.s); st.r = Math.atan2(F.s, F.c) * 180 / Math.PI;
    st.rad = clamp(st.rad0 * st.s, 10, b.w / 2); st.lost = 0;
    st.pts = good.map(m => ({ x: m.qx, y: m.qy, vx: m.vx, vy: m.vy, ax: m.ax, ay: m.ay }));
  }
  // drift guard: compare how the spot looked on the reference frame (warped by the current estimate) with this frame and
  // nudge the move / scale / turn to where they line up best. Everything stays tied to the original look of the spot.
  // the reference look of the target, sampled on a grid over its region (rx × ry around c0, only inside the region)
  function refTemplate(f, c0, rx, ry, inside) {
    const N = 23, RX = clamp(rx, 12, 90), RY = clamp(ry, 12, 90), pts = [], vals = [];
    let sum = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const dx = (i / (N - 1) * 2 - 1) * RX, dy = (j / (N - 1) * 2 - 1) * RY;
      if (inside && !inside(c0.x + dx, c0.y + dy)) continue;
      const v = bil(f, c0.x + dx, c0.y + dy);
      pts.push(dx, dy); vals.push(v); sum += v;
    }
    if (vals.length < 30) return null;
    const m = sum / vals.length;
    return { pts, vals: vals.map(v => v - m) };
  }
  function refine(cur, st) {
    const RT = st.ref;
    if (!RT) return;
    const P = RT.pts, V = RT.vals, n = V.length;
    const cost = (cx, cy, sc, an, best) => {
      const ca = Math.cos(an) * sc, sa = Math.sin(an) * sc, smp = new Float32Array(n);
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const x = cx + ca * P[2 * i] - sa * P[2 * i + 1], y = cy + sa * P[2 * i] + ca * P[2 * i + 1];
        if (x < 1 || y < 1 || x > cur.w - 2 || y > cur.h - 2) return Infinity;
        smp[i] = bil(cur, x, y); sum += smp[i];
      }
      const m = sum / n;
      let e = 0;
      for (let i = 0; i < n; i++) { e += Math.abs(smp[i] - m - V[i]); if (e > best) return e; }
      return e;
    };
    let bx = st.c.x, by = st.c.y, bs = st.s, ba = st.r * Math.PI / 180, best = cost(bx, by, bs, ba, Infinity);
    if (!isFinite(best)) return;
    // two rounds, each a small search around the best so far: finer the second time
    for (const [dt, ds, da] of [[1, 0.01, 0.006], [0.4, 0.004, 0.0025]]) {
      const x0 = bx, y0 = by, s0 = bs, a0 = ba;
      for (let k = -2; k <= 2; k++) for (let q = -1; q <= 1; q++) for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
        const e = cost(x0 + i * dt, y0 + j * dt, s0 * (1 + k * ds), a0 + q * da, best);
        if (e < best) { best = e; bx = x0 + i * dt; by = y0 + j * dt; bs = s0 * (1 + k * ds); ba = a0 + q * da; }
      }
    }
    st.c = { x: bx, y: by }; st.s = bs; st.r = ba * 180 / Math.PI;
    const c = Math.cos(ba) * bs, sn = Math.sin(ba) * bs;
    st.T = { ax: st.c0.x, ay: st.c0.y, qx: bx, qy: by, c, s: sn, apply: (x, y) => ({ x: bx + c * (x - st.c0.x) - sn * (y - st.c0.y), y: by + sn * (x - st.c0.x) + c * (y - st.c0.y) }) };
  }

  // new points found on the current frame get anchors by mapping them back to the reference frame
  function anchorNew(st, list) {
    const F = st.T;
    for (const p of list) {
      if (p.ax != null) continue;
      if (!F) { p.ax = p.x; p.ay = p.y; continue; }
      const det = F.c * F.c + F.s * F.s, dx = p.x - F.qx, dy = p.y - F.qy;
      p.ax = F.ax + (F.c * dx + F.s * dy) / det; p.ay = F.ay + (-F.s * dx + F.c * dy) / det;
    }
    return list;
  }

  /* ── plane: perspective (homography) ── */
  function solve(A, b) { // Gaussian elimination with partial pivoting
    const n = b.length;
    for (let i = 0; i < n; i++) {
      let p = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
      if (Math.abs(A[i][i]) < 1e-12) return null;
      for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
    }
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
    return x;
  }
  // least-squares homography src → dst (normalised DLT, h33 = 1)
  function homography(src, dst) {
    const norm = P => {
      let cx = 0, cy = 0; for (const p of P) { cx += p.x; cy += p.y; } cx /= P.length; cy /= P.length;
      let d = 0; for (const p of P) d += Math.hypot(p.x - cx, p.y - cy); d = d / P.length || 1;
      const k = Math.SQRT2 / d; return { cx, cy, k, P: P.map(p => ({ x: (p.x - cx) * k, y: (p.y - cy) * k })) };
    };
    const S1 = norm(src), D1 = norm(dst), M = Array.from({ length: 8 }, () => new Array(8).fill(0)), v = new Array(8).fill(0);
    for (let i = 0; i < src.length; i++) {
      const { x, y } = S1.P[i], X = D1.P[i].x, Y = D1.P[i].y;
      for (const [row, rhs] of [[[x, y, 1, 0, 0, 0, -x * X, -y * X], X], [[0, 0, 0, x, y, 1, -x * Y, -y * Y], Y]]) {
        for (let r = 0; r < 8; r++) { v[r] += row[r] * rhs; for (let c = 0; c < 8; c++) M[r][c] += row[r] * row[c]; }
      }
    }
    const h = solve(M, v);
    if (!h) return null;
    // undo the normalisation: H = Td⁻¹ · Hn · Ts
    const Hn = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
    const Ts = [S1.k, 0, -S1.k * S1.cx, 0, S1.k, -S1.k * S1.cy, 0, 0, 1];
    const Tdi = [1 / D1.k, 0, D1.cx, 0, 1 / D1.k, D1.cy, 0, 0, 1];
    const H = mul3(Tdi, mul3(Hn, Ts));
    return H.map(x => x / H[8]);
  }
  function mul3(a, b) { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]; return o; }
  function inv3(m) {
    const [a, b, c, d, e, f, g, h, i] = m, A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
    if (Math.abs(det) < 1e-12) return null;
    return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
  }
  const hp = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return { x: (H[0] * x + H[1] * y + H[2]) / w, y: (H[3] * x + H[4] * y + H[5]) / w }; };
  // a point drifts a little each frame; pull it back onto how it looked on the reference frame (warped by the local
  // perspective at that spot) with a small search around where it is now
  function snapToRef(ref, cur, p, H, r) {
    const a0 = { x: p.ax, y: p.ay }, e = 0.5;
    const o = hp(H, a0.x, a0.y), ux = hp(H, a0.x + e, a0.y), uy = hp(H, a0.x, a0.y + e);
    // local affine (reference → current) and its inverse
    const j00 = (ux.x - o.x) / e, j10 = (ux.y - o.y) / e, j01 = (uy.x - o.x) / e, j11 = (uy.y - o.y) / e, det = j00 * j11 - j01 * j10;
    if (Math.abs(det) < 1e-6) return p;
    const i00 = j11 / det, i01 = -j01 / det, i10 = -j10 / det, i11 = j00 / det;
    const n = (2 * r + 1) * (2 * r + 1), T = new Float32Array(n);
    let k = 0, sum = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const v = bil(ref, a0.x + i00 * dx + i01 * dy, a0.y + i10 * dx + i11 * dy); T[k++] = v; sum += v; }
    const m = sum / n; for (let i = 0; i < n; i++) T[i] -= m;
    let bx = Math.round(p.x), by = Math.round(p.y), best = Infinity;
    const grid = new Map();
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const s = sadAt(cur, T, r, Math.round(p.x) + dx, Math.round(p.y) + dy, Infinity);
      grid.set(dx + ',' + dy, s);
      if (s < best) { best = s; bx = Math.round(p.x) + dx; by = Math.round(p.y) + dy; }
    }
    const at = (x, y) => grid.get((x - Math.round(p.x)) + ',' + (y - Math.round(p.y))) ?? sadAt(cur, T, r, x, y, Infinity);
    const par = (l, c, rr) => { const d = l - 2 * c + rr; return d > 1e-6 ? clamp(0.5 * (l - rr) / d, -0.5, 0.5) : 0; };
    const sx = par(at(bx - 1, by), best, at(bx + 1, by)), sy = par(at(bx, by - 1), best, at(bx, by + 1));
    if (best / n > 18) return p;
    return Object.assign({}, p, { x: bx + sx, y: by + sy });
  }
  function stepPlane(a, b, ref, st, r) {
    const moved = [];
    for (const p of st.pts) {
      const q = match(a, b, p, { x: p.x + p.vx, y: p.y + p.vy }, r);
      if (q.err > Math.max(6, q.energy * 0.85) || q.x < 2 || q.y < 2 || q.x > b.w - 3 || q.y > b.h - 3) continue;
      moved.push({ ax: p.ax, ay: p.ay, x: q.x, y: q.y, vx: q.x - p.x, vy: q.y - p.y });
    }
    if (moved.length < 5) { st.lost++; return; }
    const fitH = list => homography(list.map(m => ({ x: m.ax, y: m.ay })), list.map(m => ({ x: m.x, y: m.y })));
    let good = moved, H = fitH(good);
    if (!H) { st.lost++; return; }
    for (let it = 0; it < 3; it++) {
      const res = good.map(m => { const e = hp(H, m.ax, m.ay); return Math.hypot(e.x - m.x, e.y - m.y); });
      const lim = Math.max(1.2, median(res) * 2.5), next = good.filter((m, i) => res[i] <= lim);
      if (next.length < 5 || next.length === good.length) break;
      good = next; H = fitH(good) || H;
    }
    // drift guard, point by point, then the final fit
    good = good.map(m => snapToRef(ref, b, m, H, r));
    H = fitH(good) || H;
    st.H = H; st.lost = 0;
    st.pts = good;
  }

  // the picked region in analysis pixels: polygon, centre, half-size and an inside test
  function regionOf(region, map, cv) {
    const toA = p => { const q = map.fromCanvas(p.x, p.y); return { x: q.u * cv.width, y: q.v * cv.height }; };
    const P = region.pts.map(toA);
    let poly;
    if (region.mode === 'point') {
      const c = P[0], rr = Math.max(10, Math.hypot(P[1].x - c.x, P[1].y - c.y));
      poly = Array.from({ length: 20 }, (_, i) => ({ x: c.x + rr * Math.cos(i / 20 * 2 * Math.PI), y: c.y + rr * Math.sin(i / 20 * 2 * Math.PI) }));
    } else if (region.mode === 'edge') {
      const [A, B] = P, L = Math.max(1, Math.hypot(B.x - A.x, B.y - A.y)), nx = -(B.y - A.y) / L, ny = (B.x - A.x) / L, w = Math.max(8, L * 0.08);
      poly = [{ x: A.x + nx * w, y: A.y + ny * w }, { x: B.x + nx * w, y: B.y + ny * w }, { x: B.x - nx * w, y: B.y - ny * w }, { x: A.x - nx * w, y: A.y - ny * w }];
    } else poly = P; // object: the box's 4 corners, plane: the 4 corners
    let cx = 0, cy = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of poly) { cx += q.x; cy += q.y; x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
    cx /= poly.length; cy /= poly.length;
    const inside = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
    // a little room around the region helps the search
    const grow = (x, y) => inside(x, y) || inside(cx + (x - cx) * 0.85, cy + (y - cy) * 0.85);
    return { poly, P, c: { x: cx, y: cy }, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2, inside, grow };
  }

  async function openClip(map) {
    const shown = R.assetImage(map.assetId);
    if (!shown || !shown.duration) throw new Error('The video isn’t ready yet');
    // a private copy of the clip to step through, so the editor's own playback never pulls it back
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = shown.currentSrc || shown.src;
    await new Promise((res, rej) => { if (v.readyState >= 2) return res(); v.onloadeddata = res; v.onerror = () => rej(new Error('Could not read the video')); setTimeout(res, 8000); });
    return v;
  }

  // click on an object: grow a region of similar colour from that spot and return its box (canvas coordinates)
  S.detectObject = async function (src, x, y) {
    const map = R.videoSpaceMap(S.doc, src);
    if (!map) return null;
    const v = await openClip(map);
    await seek(v, R.videoTarget(map.vd || {}, null, v, map.start));
    const k = 320 / Math.max(v.videoWidth, v.videoHeight), w = Math.round(v.videoWidth * k), h = Math.round(v.videoHeight * k);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(v, 0, 0, w, h);
    const d = cx.getImageData(0, 0, w, h).data;
    v.removeAttribute('src'); v.load();
    const uv = map.fromCanvas(x, y), sx = Math.round(uv.u * w), sy = Math.round(uv.v * h);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
    const col = i => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];
    let seed = [0, 0, 0], ns = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = clamp(sx + dx, 0, w - 1), yy = clamp(sy + dy, 0, h - 1), c = col(yy * w + xx); seed[0] += c[0]; seed[1] += c[1]; seed[2] += c[2]; ns++; }
    seed = seed.map(v0 => v0 / ns);
    let box = null;
    for (const tol of [26, 38, 54]) {
      const seen = new Uint8Array(w * h), stack = [sy * w + sx];
      let n = 0, x0 = sx, y0 = sy, x1 = sx, y1 = sy;
      seen[stack[0]] = 1;
      while (stack.length && n < w * h * 0.35) {
        const i = stack.pop(), px0 = i % w, py0 = (i - px0) / w;
        n++; x0 = Math.min(x0, px0); x1 = Math.max(x1, px0); y0 = Math.min(y0, py0); y1 = Math.max(y1, py0);
        for (const j of [i - 1, i + 1, i - w, i + w]) {
          if (j < 0 || j >= w * h || seen[j] || Math.abs((j % w) - px0) > 1) continue;
          const c = col(j), dc = Math.hypot(c[0] - seed[0], c[1] - seed[1], c[2] - seed[2]);
          if (dc < tol) { seen[j] = 1; stack.push(j); }
        }
      }
      box = { x0, y0, x1, y1, n };
      if (n > w * h * 0.004) break;
    }
    if (!box || box.n > w * h * 0.34) return null;
    const mx = (box.x1 - box.x0) * 0.08 + 2, my = (box.y1 - box.y0) * 0.08 + 2;
    const corner = (u, v2) => map.toCanvas(clamp(u, 0, w) / w, clamp(v2, 0, h) / h);
    return [corner(box.x0 - mx, box.y0 - my), corner(box.x1 + mx, box.y0 - my), corner(box.x1 + mx, box.y1 + my), corner(box.x0 - mx, box.y1 + my)];
  };

  // track a picked region of a video ('bg' or a video layer id); returns el.track for the layer pinned to it.
  // region = { mode: 'point' | 'object' | 'edge' | 'plane', pts: [canvas points] } — point: [centre, edge of the circle],
  // edge: [start, end], object and plane: 4 corners. Without a region, the spot under the layer's centre is used.
  S.trackLayer = async function (el, { src, region, at, onProgress = () => {}, signal } = {}) {
    const doc = S.doc, map = R.videoSpaceMap(doc, src);
    if (!map) throw new Error('No video to track');
    const v = await openClip(map);
    const vd = map.vd || {}, dur = v.duration, end = vd.end > 0 ? Math.min(dur, vd.end) : dur, ts = clamp(vd.trim || 0, 0, Math.max(0, end - 0.05));
    const fps = Math.min(30, Math.max(10, await R.clipFps(map.assetId))), dt = 1 / fps;
    // the region is picked on the still frame — or on the frame given (masks are drawn on the frame on screen)
    const m0 = at != null ? clamp(at, ts, end) : R.videoTarget(vd, null, v, map.start);
    const vw = v.videoWidth, vh = v.videoHeight;
    const cv = document.createElement('canvas'); cv.width = vw; cv.height = vh;
    if (!region) {
      const rot = (el.rotation || 0) * Math.PI / 180;
      const c = { x: el.x + (el.width / 2) * Math.cos(rot) - (el.height / 2) * Math.sin(rot), y: el.y + (el.width / 2) * Math.sin(rot) + (el.height / 2) * Math.cos(rot) };
      region = { mode: 'point', pts: [c, { x: c.x + Math.max(el.width, el.height) * 0.6, y: c.y }] };
    }
    // analysis size: enough pixels on the picked target (≈170 px across) to read its turn and size precisely, at least
    // AW wide, never above the clip's own size or 1280
    const R0 = regionOf(region, map, cv), big = Math.max(vw, vh);
    const k = clamp(170 / Math.max(8, 2 * Math.max(R0.rx, R0.ry)), AW / big, Math.min(1, 1280 / big));
    cv.width = Math.round(vw * k); cv.height = Math.round(vh * k);
    const RG = regionOf(region, map, cv), plane = region.mode === 'plane';
    if (!(RG.c.x >= 0 && RG.c.x <= cv.width && RG.c.y >= 0 && RG.c.y <= cv.height)) throw new Error('Pick something on the video first');
    const r = 6, want = region.mode === 'point' ? 24 : 40;
    const n = Math.max(1, Math.floor((end - ts) / dt + 1e-6) + 1), i0 = clamp(Math.round((m0 - ts) / dt), 0, n - 1);
    const pts = new Array(n);
    let done = 0, refFrame = null;
    const corners = H => RG.P.slice(0, 4).map(q => hp(H, q.x, q.y));
    const sample = st => plane
      ? [].concat(...corners(st.H || [1, 0, 0, 0, 1, 0, 0, 0, 1]).map(q => [q.x / cv.width, q.y / cv.height]))
      : [st.c.x / cv.width, st.c.y / cv.height, st.s, st.r];
    const newState = f => {
      refFrame = f;
      const st = { c0: { x: RG.c.x, y: RG.c.y }, c: { x: RG.c.x, y: RG.c.y }, s: 1, r: 0, rad: Math.max(RG.rx, RG.ry), rad0: Math.max(RG.rx, RG.ry), lost: 0, T: null, H: null, pts: [],
        ref: plane ? null : refTemplate(f, RG.c, RG.rx, RG.ry, RG.inside) };
      st.pts = anchorNew(st, features(f, Math.round(RG.c.x), Math.round(RG.c.y), Math.round(Math.max(RG.rx, RG.ry) * 1.1), want, null, RG.grow));
      if (st.pts.length < 6) st.pts = anchorNew(st, features(f, Math.round(RG.c.x), Math.round(RG.c.y), Math.round(Math.max(RG.rx, RG.ry) * 1.8 + 10), want, st.pts));
      return st;
    };
    const topUp = (cur, st) => {
      if (st.pts.length >= Math.min(12, want / 2)) return;
      if (plane && st.H) {
        // new points inside the tracked quad, anchored back through the inverse perspective
        const Hi = inv3(st.H);
        if (!Hi) return;
        const quad = corners(st.H), insideNow = (x, y) => { const q = hp(Hi, x, y); return RG.grow(q.x, q.y); };
        let qx = 0, qy = 0; for (const q of quad) { qx += q.x; qy += q.y; }
        const rad = Math.max(...quad.map(q => Math.hypot(q.x - qx / 4, q.y - qy / 4)));
        const fresh = features(cur, Math.round(qx / 4), Math.round(qy / 4), Math.round(rad), want, st.pts, insideNow);
        for (const p of fresh) if (p.ax == null) { const a = hp(Hi, p.x, p.y); p.ax = a.x; p.ay = a.y; }
        st.pts = fresh;
      } else {
        const T = st.T, inside = T ? (x, y) => { const det = T.c * T.c + T.s * T.s, dx = x - T.qx, dy = y - T.qy; return RG.grow(T.ax + (T.c * dx + T.s * dy) / det, T.ay + (-T.s * dx + T.c * dy) / det); } : RG.grow;
        st.pts = anchorNew(st, features(cur, Math.round(st.c.x), Math.round(st.c.y), Math.round(st.rad * 1.1 + 6), want, st.pts, inside));
      }
    };
    const advance = (prev, cur, st) => {
      if (plane) stepPlane(prev, cur, refFrame, st, r);
      else { step(prev, cur, st, r, refFrame); refine(cur, st); }
      topUp(cur, st);
      return sample(st);
    };
    const cancelled = () => signal && signal.aborted;
    // stepping by seeking: exact but slow (each seek decodes from the last key frame)
    const runSeek = async (from, to, dir) => {
      await seek(v, ts + from * dt + dt * 0.5);
      let prev = grab(v, cv);
      const st = newState(prev);
      pts[from] = sample(st);
      for (let i = from + dir; dir > 0 ? i <= to : i >= to; i += dir) {
        if (cancelled()) throw new DOMException('Cancelled', 'AbortError');
        await seek(v, ts + i * dt + dt * 0.5);
        const cur = grab(v, cv);
        pts[i] = advance(prev, cur, st);
        prev = cur;
        onProgress(++done / Math.max(1, n - 1));
        if (done % 4 === 0) await new Promise(res => setTimeout(res, 0));
      }
    };
    // forwards by playing the clip and catching every frame as it is shown: many times faster than seeking.
    // Playback slows down if the tracking can't keep up; frames that slip by are filled in afterwards.
    const runPlay = async from => {
      await seek(v, ts + from * dt + dt * 0.5);
      let prev = grab(v, cv);
      const st = newState(prev), got = [[ts + from * dt + dt * 0.5].concat(sample(st))];
      let rate = 0.5, lastM = got[0][0];
      await new Promise((resolve, reject) => {
        const finish = () => { v.pause(); resolve(); };
        const cb = (now, meta) => {
          if (cancelled()) { v.pause(); reject(new DOMException('Cancelled', 'AbortError')); return; }
          const m = meta.mediaTime;
          if (m > lastM + 1e-4) {
            const t0 = performance.now(), cur = grab(v, cv);
            // mediaTime is when the frame starts; samples sit at frame centres (like the seeks)
            got.push([m + dt * 0.5].concat(advance(prev, cur, st)));
            prev = cur; lastM = m;
            const spent = performance.now() - t0;
            if (spent > 0.75 * dt * 1000 / rate && rate > 0.15) { rate = Math.max(0.15, rate * 0.7); v.playbackRate = rate; }
            onProgress(clamp((m - ts) / Math.max(dt, end - ts), 0, 1));
          }
          if (m >= end - dt * 0.75 || v.ended) { finish(); return; }
          v.requestVideoFrameCallback(cb);
        };
        v.onended = finish;
        v.playbackRate = rate;
        v.requestVideoFrameCallback(cb);
        v.play().catch(reject);
      });
      // resample onto the even time grid
      let j = 0;
      const W = got[0].length;
      for (let i = from; i < n; i++) {
        const tm = ts + i * dt + dt * 0.5;
        while (j < got.length - 2 && got[j + 1][0] < tm) j++;
        const A = got[j], B = got[Math.min(got.length - 1, j + 1)], kk = B[0] > A[0] ? clamp((tm - A[0]) / (B[0] - A[0]), 0, 1) : 0;
        const row = []; for (let c = 1; c < W; c++) row.push(A[c] + (B[c] - A[c]) * kk);
        pts[i] = row;
      }
    };
    if ('requestVideoFrameCallback' in v) await runPlay(i0);
    else await runSeek(i0, n - 1, 1);
    if (i0 > 0) await runSeek(i0, 0, -1);
    v.removeAttribute('src'); v.load();
    const keep = (k2, d) => el.track && el.track[k2] != null ? el.track[k2] : d;
    // the picked region is kept in the video's own picture, so it can be shown and re-tracked later
    const regionUV = region.pts.map(p => { const q = map.fromCanvas(p.x, p.y); return [q.u, q.v]; });
    return { src, mode: plane ? 'plane' : 'similar', pick: region.mode, region: regionUV, t0: ts + dt * 0.5, dt, pts, ref: pts[i0].slice(),
      scale: keep('scale', true), rotate: keep('rotate', region.mode !== 'point'), blur: keep('blur', true), steady: keep('steady', 10), at: Date.now() };
  };
  // the videos a layer could be pinned to: video layers and a video background
  S.trackSources = function () {
    const out = [];
    if (S.doc.background.assetId && R.isVideoAsset(S.doc.background.assetId)) out.push(['bg', 'Background video']);
    S.doc.elements.forEach(e => { if (e.type === 'image' && e.assetId && R.isVideoAsset(e.assetId)) out.push([e.id, S.elLabel ? S.elLabel(e) : (e.name || 'Video')]); });
    return out;
  };
})();
