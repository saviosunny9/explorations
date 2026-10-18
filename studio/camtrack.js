/* Savio's editor — camera tracking for clones (window.StudioCamTrack).
   How the camera moved through a clip: for every frame, the homography that maps it onto a reference view of the scene
   (the first frame; a later key frame takes over once the first has left the picture). Corners of the background are
   followed with block matching on a three-level pyramid — each patch is compared through the current estimate of the
   camera, so turning and zooming don't throw it — and a homography is fitted to them robustly (RANSAC, then least squares on
   the inliers). Whatever is marked as the subject is left out, so a moving person never drags the camera with them.
     const T = StudioCamTrack.create(w, h);  H = T.step(grey, subject)   // grey: Float32 w×h (0..255), subject: 0..1 or null
   H (9 numbers, row-major) maps this frame's pixels to the reference view's. */
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const I3 = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
  function mul(a, b) { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]; return o; }
  function inv(m) {
    const [a, b, c, d, e, f, g, h, i] = m, A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
    if (!det) return I3();
    return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
  }
  const norm = m => { const k = m[8] || 1; return m.map(x => x / k); };
  const apply = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };

  /* ── images ── */
  function down(g, w, h) {
    const W = w >> 1, H = h >> 1, o = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * 2 * w + x * 2; o[y * W + x] = (g[i] + g[i + 1] + g[i + w] + g[i + w + 1]) * 0.25; }
    return { g: o, w: W, h: H };
  }
  function blur3(g, w, h) {
    const t = new Float32Array(g.length), o = new Float32Array(g.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; t[i] = (g[y * w + Math.max(0, x - 1)] + 2 * g[i] + g[y * w + Math.min(w - 1, x + 1)]) * 0.25; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; o[i] = (t[Math.max(0, y - 1) * w + x] + 2 * t[i] + t[Math.min(h - 1, y + 1) * w + x]) * 0.25; }
    return o;
  }
  function pyramid(g, w, h) { const L0 = { g: blur3(g, w, h), w, h }, L1 = down(L0.g, w, h), L2 = down(L1.g, L1.w, L1.h); return [L0, L1, L2]; }
  function bil(L, x, y) {
    if (x < 0 || y < 0 || x > L.w - 1.001 || y > L.h - 1.001) return NaN;
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * L.w + x0, g = L.g;
    return (g[i] * (1 - fx) + g[i + 1] * fx) * (1 - fy) + (g[i + L.w] * (1 - fx) + g[i + L.w + 1] * fx) * fy;
  }

  /* ── corners worth following: Shi–Tomasi, one (the best) per grid cell, none on the subject ── */
  function corners(L, mask, want) {
    const { g, w, h } = L, gx = new Float32Array(w * h), gy = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; gx[i] = (g[i + 1] - g[i - 1]) * 0.5; gy[i] = (g[i + w] - g[i - w]) * 0.5; }
    const cols = Math.max(4, Math.round(Math.sqrt(want * w / h))), rows = Math.max(3, Math.round(want / cols)), out = [], R = 3, edge = 14;
    const scores = [];
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      const xa = Math.max(edge, (cx * w / cols) | 0), xb = Math.min(w - edge, ((cx + 1) * w / cols) | 0), ya = Math.max(edge, (cy * h / rows) | 0), yb = Math.min(h - edge, ((cy + 1) * h / rows) | 0);
      let best = 0, bx = -1, by = -1;
      for (let y = ya; y < yb; y += 2) for (let x = xa; x < xb; x += 2) {
        if (mask && mask[y * w + x] > 0.2) continue;
        let a = 0, b = 0, c = 0;
        for (let v = -R; v <= R; v++) for (let u = -R; u <= R; u++) { const k = (y + v) * w + x + u, p = gx[k], q = gy[k]; a += p * p; b += p * q; c += q * q; }
        const tr = a + c, s = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - (a * c - b * b)));
        if (s > best) { best = s; bx = x; by = y; }
      }
      if (bx >= 0) scores.push([best, bx, by]);
    }
    if (!scores.length) return out;
    const sorted = scores.map(s => s[0]).sort((a, b) => a - b), floor = Math.max(30, sorted[Math.floor(sorted.length * 0.2)] * 0.5);
    for (const [s, x, y] of scores) if (s >= floor) out.push([x, y]);
    return out;
  }

  /* ── one patch: the reference's look at p, searched for in the frame (seen through the estimate G: ref → frame) ── */
  function matchPatch(RL, FL, p, G, r, S) {
    const n = 2 * r + 1, T = new Float32Array(n * n);
    let mt = 0;
    for (let v = -r, k = 0; v <= r; v++) for (let u = -r; u <= r; u++, k++) { const a = bil(RL, p[0] + u, p[1] + v); if (a !== a) return null; T[k] = a; mt += a; }
    mt /= n * n;
    let tv = 0; for (let k = 0; k < T.length; k++) { T[k] -= mt; tv += Math.abs(T[k]); }
    if (tv < n * n * 1.2) return null;   // too flat to place
    const m = n + 2 * S, Wn = new Float32Array(m * m);
    for (let v = -r - S, k = 0; v <= r + S; v++) for (let u = -r - S; u <= r + S; u++, k++) { const q = apply(G, p[0] + u, p[1] + v), a = bil(FL, q[0], q[1]); if (a !== a) return null; Wn[k] = a; }
    const cost = (dx, dy) => {
      let mw = 0; for (let v = 0; v < n; v++) { const row = (v + S + dy) * m + S + dx; for (let u = 0; u < n; u++) mw += Wn[row + u]; }
      mw /= n * n;
      let s = 0; for (let v = 0, k = 0; v < n; v++) { const row = (v + S + dy) * m + S + dx; for (let u = 0; u < n; u++, k++) s += Math.abs(T[k] - (Wn[row + u] - mw)); }
      return s;
    };
    let best = Infinity, bx = 0, by = 0;
    const C = new Float32Array((2 * S + 1) * (2 * S + 1));
    for (let dy = -S; dy <= S; dy++) for (let dx = -S; dx <= S; dx++) { const c = cost(dx, dy); C[(dy + S) * (2 * S + 1) + dx + S] = c; if (c < best) { best = c; bx = dx; by = dy; } }
    // a clear winner only (not one of many lookalikes along an edge)
    let second = Infinity;
    for (let dy = -S; dy <= S; dy++) for (let dx = -S; dx <= S; dx++) if (Math.abs(dx - bx) > 1 || Math.abs(dy - by) > 1) second = Math.min(second, C[(dy + S) * (2 * S + 1) + dx + S]);
    if (second < best * 1.08) return null;
    // sub-pixel: a parabola through the neighbours
    const at = (dx, dy) => (Math.abs(dx) <= S && Math.abs(dy) <= S ? C[(dy + S) * (2 * S + 1) + dx + S] : NaN);
    const sub = (a, b, c) => { const d = a - 2 * b + c; return a === a && c === c && d > 0 ? clamp(0.5 * (a - c) / d, -0.5, 0.5) : 0; };
    const fx = sub(at(bx - 1, by), best, at(bx + 1, by)), fy = sub(at(bx, by - 1), best, at(bx, by + 1));
    return [bx + fx, by + fy, best / (n * n)];
  }

  /* ── fitting ── */
  function solve(A, b) {
    const n = b.length, M = A.map((r, i) => r.concat(b[i]));
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-12) return null;
      [M[c], M[piv]] = [M[piv], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  }
  // least-squares homography src → dst (normalised so the numbers stay well conditioned)
  function fitH(src, dst) {
    const n = src.length; if (n < 4) return null;
    const nm = pts => { let mx = 0, my = 0; for (const p of pts) { mx += p[0]; my += p[1]; } mx /= pts.length; my /= pts.length; let d = 0; for (const p of pts) d += Math.hypot(p[0] - mx, p[1] - my); const s = Math.SQRT2 / (d / pts.length || 1); return [s, 0, -s * mx, 0, s, -s * my, 0, 0, 1]; };
    const Ts = nm(src), Td = nm(dst), AtA = Array.from({ length: 8 }, () => new Array(8).fill(0)), Atb = new Array(8).fill(0);
    for (let k = 0; k < n; k++) {
      const [x, y] = apply(Ts, src[k][0], src[k][1]), [u, v] = apply(Td, dst[k][0], dst[k][1]);
      const rows = [[x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]];
      for (const r of rows) for (let i = 0; i < 8; i++) { Atb[i] += r[i] * r[8]; for (let j = 0; j < 8; j++) AtA[i][j] += r[i] * r[j]; }
    }
    const h = solve(AtA, Atb); if (!h) return null;
    return norm(mul(inv(Td), mul(h.concat(1), Ts)));
  }
  function fitAffine(src, dst) {
    const n = src.length; if (n < 3) return null;
    const AtA = Array.from({ length: 3 }, () => new Array(3).fill(0)), bx = [0, 0, 0], by = [0, 0, 0];
    for (let k = 0; k < n; k++) { const r = [src[k][0], src[k][1], 1]; for (let i = 0; i < 3; i++) { bx[i] += r[i] * dst[k][0]; by[i] += r[i] * dst[k][1]; for (let j = 0; j < 3; j++) AtA[i][j] += r[i] * r[j]; } }
    const a = solve(AtA, bx), b = solve(AtA.map(r => r.slice()), by);
    return a && b ? [a[0], a[1], a[2], b[0], b[1], b[2], 0, 0, 1] : null;
  }
  // a camera can't flip, squash or bend the picture wildly between frames
  function sane(H, w, h) {
    if (!H || H.some(x => !isFinite(x))) return false;
    const det = H[0] * H[4] - H[1] * H[3];
    if (det < 0.4 || det > 2.5) return false;
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) { const ww = H[6] * x + H[7] * y + H[8]; if (ww < 0.5 || ww > 2) return false; }
    return true;
  }
  let seed = 12345;
  const rand = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  // RANSAC over 4-point homographies, then least squares on everything that agrees
  function robust(src, dst, tol, w, h) {
    const n = src.length; if (n < 8) return null;
    let best = null, bestN = 0;
    for (let it = 0; it < 160; it++) {
      const idx = new Set(); while (idx.size < 4) idx.add(rand(n));
      const s = [...idx].map(i => src[i]), d = [...idx].map(i => dst[i]), H = fitH(s, d);
      if (!sane(H, w, h)) continue;
      let c = 0; for (let k = 0; k < n; k++) { const q = apply(H, src[k][0], src[k][1]); if (Math.hypot(q[0] - dst[k][0], q[1] - dst[k][1]) < tol) c++; }
      if (c > bestN) { bestN = c; best = H; if (c > n * 0.92) break; }
    }
    if (!best) return null;
    let H = best;
    for (let pass = 0; pass < 2; pass++) {
      const s = [], d = [];
      for (let k = 0; k < n; k++) { const q = apply(H, src[k][0], src[k][1]); if (Math.hypot(q[0] - dst[k][0], q[1] - dst[k][1]) < tol * (pass ? 0.75 : 1)) { s.push(src[k]); d.push(dst[k]); } }
      const H2 = s.length >= 8 ? fitH(s, d) : null;
      if (sane(H2, w, h)) H = H2; else { const A = fitAffine(s, d); if (sane(A, w, h)) H = A; }
      bestN = s.length;
    }
    return { H, inliers: bestN, n };
  }

  /* ── the tracker ── */
  function create(w, h, o = {}) {
    const want = o.points || 240;
    let kf = null, prev = I3(), prev2 = null, frames = 0;
    // a key frame: its pyramid, its corners and where it sits in the reference view
    const key = (pyr, mask, Hk) => ({ pyr, Hk, pts: corners(pyr[0], mask, want), n0: 0 });
    function track(pyr, mask, G0) {
      // G: key frame → this frame (the inverse of what's returned), refined level by level
      let G = G0, res = null;
      const LV = [[2, 4, 5], [1, 3, 6], [0, 2, 7]];
      for (const [lv, S, r] of LV) {
        const s = 1 << lv, RL = kf.pyr[lv], FL = pyr[lv];
        const Gl = [G[0], G[1], G[2] / s, G[3], G[4], G[5] / s, G[6] * s, G[7] * s, G[8]];
        const src = [], dst = [];
        for (const p0 of kf.pts) {
          const p = [p0[0] / s, p0[1] / s], m = matchPatch(RL, FL, p, Gl, r, S);
          if (!m) continue;
          const q = apply(Gl, p[0] + m[0], p[1] + m[1]);
          if (mask) { const qi = Math.round(q[1] * s) * w + Math.round(q[0] * s); if (mask[qi] > 0.3) continue; }
          src.push(p); dst.push(q);
        }
        const fit = robust(src, dst, lv === 0 ? 1.4 : 1.0, FL.w, FL.h);
        if (!fit) { if (lv === 2) continue; break; }
        const Hl = fit.H;
        G = [Hl[0], Hl[1], Hl[2] * s, Hl[3], Hl[4], Hl[5] * s, Hl[6] / s, Hl[7] / s, Hl[8]];
        res = { G, inliers: fit.inliers, n: kf.pts.length };
      }
      return res;
    }
    return {
      step(grey, mask) {
        const pyr = pyramid(grey, w, h);
        frames++;
        if (!kf) { kf = key(pyr, mask, I3()); kf.n0 = kf.pts.length; prev = I3(); return prev.slice(); }
        // where this frame probably is: the last one, moved on as much again (the camera keeps going)
        let guess = prev;
        if (prev2) { const step = mul(inv(prev2), prev); guess = norm(mul(prev, step)); if (!sane(mul(inv(kf.Hk), guess), w, h)) guess = prev; }
        const G0 = inv(mul(inv(kf.Hk), guess));
        let r = track(pyr, mask, norm(G0));
        if ((!r || r.inliers < 20) && guess !== prev) r = track(pyr, mask, norm(inv(mul(inv(kf.Hk), prev))));
        let H = prev;
        if (r) H = norm(mul(kf.Hk, inv(r.G)));
        prev2 = prev; prev = H;
        // most of the key frame has left the picture (or it no longer matches): this frame becomes the key frame
        if (!r || r.inliers < Math.max(40, kf.n0 * 0.45)) { kf = key(pyr, mask, H); kf.n0 = kf.pts.length; }
        return H.slice();
      },
    };
  }
  window.StudioCamTrack = { create, mul, inv, apply, fitH, norm };
})();
