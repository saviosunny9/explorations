# Camera Looks

The {{COUNT}} photo looks from the editor (the Film, Colour, B&W, Print and Effects shelves), packaged for a live
camera app.

**To build them into your app:** give this whole folder (or the zip) to Claude together with your app's code, and say
something like:

> "Add the looks in this pack to my camera app so I can shoot live with them on. Start with CLAUDE_BRIEF.md."

`CLAUDE_BRIEF.md` explains the rest to Claude.

**To try them now:** open `web/preview.html` in Chrome. Allow the camera, or pick a photo or video, then tap through
the shelves. The sliders on the right show what each look is made of.

## What's inside

- `looks.json`: every look, grouped by shelf, with its exact settings
- `parameters.json`: every setting a look can use, with its range and what it does
- `spec/PIPELINE.md`: the exact maths and order; `spec/CHECKS.md`: how closely each version matches
- `reference/looks-reference.js`: the editor's own code for the looks (the ground truth)
- `web/`: a real-time GPU (WebGL2) version, its shaders, and the live preview page
- `luts/`: each look's colour part as a 3D LUT (`.cube` and PNG)
- `samples/`, `previews/`, `sheet-*.jpg`: test photos and what each look should look like on them

## The looks

{{TABLE}}
