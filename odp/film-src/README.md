# Hero film

`scene.html` draws the hero film in WebGL2: a slow flight over a city of monoliths toward a gateway
of light, with light trails on the avenue and a faint orbit in the sky. It is a 24 s seamless loop
(the city repeats every 20 blocks along the flight path and the camera travels exactly that far).

Render the frames headless (Playwright + SwiftShader, about 4.5 s a frame at 1920×1080):

```bash
node render.js ./frames 1920 1080 1.25 24 0 576
```

Arguments: output dir, width, height, supersampling, fps, first frame, last frame (exclusive), step.

Encode:

```bash
ffmpeg -framerate 24 -i frames/f%04d.jpg -c:v libx264 -preset slow -crf 24 -tune film -pix_fmt yuv420p -movflags +faststart -an ../media/hero.mp4
ffmpeg -framerate 24 -i frames/f%04d.jpg -vf scale=1280:720:flags=lanczos -c:v libx264 -preset slow -crf 25 -tune film -pix_fmt yuv420p -movflags +faststart -an ../media/hero-720.mp4
ffmpeg -framerate 24 -i frames/f%04d.jpg -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -an ../media/hero.webm
cp frames/f0000.jpg ../media/hero-poster.jpg
```
