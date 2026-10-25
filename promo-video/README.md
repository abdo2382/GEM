# Promo film

Makes `exports/THE_LOST_TOMB_PROMO.mp4` (16:9), `exports/THE_LOST_TOMB_PROMO_VERTICAL.mp4`
(9:16) and the deck's backup recording from real recordings of the site. Separate from
the site: nothing here is imported by the app, and the app's files are only read.

Needs Google Chrome installed and the site running (`npm run dev` in the project root,
port 5173). Then, in this folder:

```bash
npm install
node capture.mjs                    # record the site: frames/<take>/NNNNN.jpg + take.json
node stills.mjs                     # Inspect stills of the four treasures (for the deck)
node render.mjs                     # compose and encode the 16:9 film
node render.mjs --format vertical   # the 9:16 cut
node backup.mjs                     # the deck's silent backup recording
```

## How it works

- `lib/browser.mjs` drives Chrome with a frozen clock: each step advances the page by
  exactly 1/30 s and captures one frame, so the recordings are smooth whatever the
  machine's speed. Phone takes are recorded at 390×844 and captured at 1080 px wide.
- `capture.mjs` records eight takes (A–H): the studio mask, the phone start, the
  desktop journey, Inspect on the throne, the Arabic switch, and three phone takes. The
  visitor's pointer is logged with each frame and drawn back in by the composition.
- `compose/` is the edit as a web page. `edit.js` holds the shot list and the on-screen
  text with their timings. `compose.js` sets every layer for a given frame, and the type
  runs on a paused GSAP timeline that is seeked, never played.
- `render.mjs` captures the composition frame by frame, synthesises the ambience with
  ffmpeg and encodes H.264 (BT.709) with AAC. Options: `--stills 8,22` (check a few
  moments), `--range 12.5,26` (re-render part of the film), `--encode-only`.

`frames/` and `out/` are generated (several GB) and are not kept in git.
