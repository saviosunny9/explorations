# LUTs — each look's colour stage as a 3D lookup table

A LUT holds steps 1 of the pipeline (colour & tone, including duotone / photocopy) for one look, with noise left
out. For looks whose `passes` list in `looks.json` is empty, the LUT *is* the whole look. For the others, run the LUT
first, then the passes listed (see `spec/PIPELINE.md`).

Values are gamma-encoded sRGB in and out. Apply the LUT to the camera's sRGB values directly, without linearising.

## `cube/<id>.cube` — the standard 3D LUT format

`LUT_3D_SIZE 33`, domain 0..1, red changes fastest, then green, then blue. These load in:
- iOS / macOS: `CIColorCubeWithColorSpace`. Parse the file into RGBA floats (alpha 1) in file order, set
  `inputCubeDimension` to 33 and `inputColorSpace` to sRGB.
- Android / GLES: upload as a 33 × 33 × 33 `GL_TEXTURE_3D` (RGB) and sample it with trilinear filtering.
- ffmpeg (`lut3d=file=gold.cube`), DaVinci Resolve, Premiere, Final Cut, Lightroom profiles, OBS, Photoshop…

## `png/<id>.png` — 512 × 512 "64³" LUT image (GPUImage / mobile layout)

8 × 8 tiles of 64 × 64 px. Blue picks the tile (row-major: tile x = b mod 8, tile y = b div 8). Within a tile, red
runs left → right and green top → bottom. `png/identity.png` is the unchanged grid. Sample it in a shader like this:

```glsl
vec3 applyLut(sampler2D lut, vec3 c) {            // c in 0..1 (sRGB)
  float b = c.b * 63.0;
  vec2 t0 = vec2(mod(floor(b), 8.0), floor(floor(b) / 8.0));
  vec2 t1 = vec2(mod(ceil(b), 8.0), floor(ceil(b) / 8.0));
  vec2 rg = c.rg * 63.0 / 512.0 + 0.5 / 512.0;     // inside a tile, texel centres
  vec3 a = texture(lut, t0 / 8.0 + rg).rgb;
  vec3 d = texture(lut, t1 / 8.0 + rg).rgb;
  return mix(a, d, fract(b));
}
```

(The y axis is as stored in the PNG, top row first. If your texture upload flips images, flip `uv.y` to match.)
