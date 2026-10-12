# Moving Collage Studio to a new Claude account and a new GitHub account

**No terminal? Use `PASTE-THIS-FIRST.md` instead** — you only click, and Claude restores the repo itself.
This file is the manual route.

You need: the handoff zip, a computer with **git** installed (https://git-scm.com/downloads) — or GitHub Desktop
(https://desktop.github.com) if you'd rather not use a terminal — and the new GitHub + Claude accounts.

## 0. Before you leave the old account: save your designs

Designs live inside the browser, per copy of the app — the old online copy's designs will **not** appear in a new one.

1. Open the online copy (link in `HANDOFF.md`) or whichever copy you used.
2. On the home page, for each design you want to keep: the card's **⋯ → Download project file** (a `.studio.json`
   with its photos, videos and fonts inside; inside the editor it's **⋯ → Download project file** too). For each of
   **My templates** you saved: the template card's **⋯ → Download template file**.
3. Keep these files with the zip. You'll open them in the new copy in step 6.

## 1. Create the new GitHub repository

1. Sign in to the **new** GitHub account → **New repository**.
2. Name it (e.g. `collage-studio`), choose **Private**, and **don't** add a README, .gitignore or licence (it must be
   empty). Create it and copy its URL, e.g. `https://github.com/NEW-USER/collage-studio.git`.

## 2. Put the code (with its full history) into it

Unzip `collage-studio-handoff.zip`, open a terminal in the unzipped `collage-studio-handoff` folder, and run:

```bash
git clone -b claude/charming-mendel-rchh9w new-design.bundle collage-studio
cd collage-studio
git branch -m main                      # use "main" as the branch from now on
git remote remove origin                # the clone points at the bundle file; forget it
git remote add origin https://github.com/NEW-USER/collage-studio.git
git push -u origin main
```

When git asks you to sign in, use the new GitHub account (a browser window or a personal access token from
GitHub → Settings → Developer settings → Personal access tokens).

*Without a terminal:* create the repo as in step 1, then on its page choose **uploading an existing file** and drag in
the contents of the zip's `studio/` folder plus `CLAUDE.md`, `HANDOFF.md` and `SETUP-NEW-ACCOUNT.md` (keep the
`studio/` folder structure). This works but drops the change history.

Optional tidy-up: the repo root also has three unrelated older pages (`index.html`, `direction-1.html`,
`fillout-hero.html`) — delete them if you don't want them.

## 3. Connect the new GitHub to the new Claude account

1. Sign in to claude.ai with the **new** account.
2. Connect GitHub: https://claude.ai/connect-github (sign in with the new GitHub account when asked).
3. Install the **Claude GitHub App** on the new repo: https://github.com/apps/claude/installations/select_target →
   pick the new account → *Only select repositories* → `collage-studio`.

## 4. Start Claude Code on the web with the repo

1. Go to https://claude.ai/code and start a new session; choose the repo `NEW-USER/collage-studio`.
2. Create (or edit) the **cloud environment** for it. Under **Network access**, make sure these hosts are allowed
   (a broader level, or add them under *Allowed domains*, keeping *Allow package managers* ticked):
   - `fonts.googleapis.com`, `fonts.gstatic.com` — the Google Fonts the templates use
   - `cdn.jsdelivr.net`, `cdnjs.cloudflare.com` — onnxruntime for background removal
   - `huggingface.co` (and its CDN `cdn-lfs.huggingface.co`) — the background-removal model
   Steps: https://code.claude.com/docs/en/cloud-environments#network-access
3. Nothing else needs installing: the cloud container already has Chromium, Playwright, Python and ffmpeg.

## 5. Your first message in the new session

Paste this (fill in your repo name):

> This is Collage Studio, moved from another account. Read HANDOFF.md, CLAUDE.md and studio/README.md first.
> Then update CLAUDE.md and HANDOFF.md for the new home: the repo is NEW-USER/collage-studio, work on the branch
> `main` (or tell me if you need a separate working branch), and the old artifact link no longer applies.
> Run `node studio/tools/smoke_test.js` to check everything works, then publish the app as a new private artifact
> with `python3 studio/tools/build_single_file.py --artifact <dir>` and record the new artifact link in CLAUDE.md and
> HANDOFF.md. Background removal in the artifact needs the model shipped alongside it: download RMBG-1.4
> (`briaai/RMBG-1.4`, `onnx/model_quantized.onnx`) from Hugging Face, base64-encode it and publish it as 5 parts
> `models/rmbg.part0.txt … part4.txt`, plus `models/ultraface.txt` (base64 of onnxmodelzoo `version-RFB-320.onnx`)
> and `vendor/ort-wasm-simd.wasm` (onnxruntime-web 1.16.3) — see bgremove.js. Commit and push.

After that, ask for changes as before — the working rules (test in the browser, update README + CLAUDE.md, rebuild the
single file, commit, push, republish, send a demo) are in CLAUDE.md, so the new chat follows them.

## 6. Bring your designs back

Open the new online copy (the link Claude gives you in step 5), or `studio/dist/collage-studio.html` on your computer,
→ home page → **Open file** → pick each `.studio.json` from step 0. Template files go back into My templates.

## Quick reference

- Run locally without Claude: double-click `studio/dist/collage-studio.html` (Chrome). Offline everything works except
  Google Fonts (falls back to system fonts) and background removal.
- Develop locally: open `studio/index.html` in Chrome; no build step. Rebuild the single file with
  `python3 studio/tools/build_single_file.py`.
- Tests: `node studio/tools/smoke_test.js` (needs `npm i playwright` + `npx playwright install chromium` on your own
  computer; already set up in Claude's cloud container).
