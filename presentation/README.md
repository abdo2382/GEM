# Pitch deck

Twelve animated slides at 1920×1080, scaled to any screen. Separate from the site: nothing
here is imported by the app.

```bash
npm install
python prepare-assets.py   # deck images from promo-video/frames, stills and public/archive
node build.mjs             # exports/THE_LOST_TOMB_PITCH.html, one offline file
node export.mjs            # exports/THE_LOST_TOMB_PITCH.pdf and .pptx
node check.mjs             # keys, buttons, swipe, notes, video, reduced motion
```

`prepare-assets.py` needs Pillow and the frames recorded in `promo-video/`. `export.mjs`
and `check.mjs` need Google Chrome installed.

## Presenting

Open `exports/THE_LOST_TOMB_PITCH.html` in Chrome or Edge, with
`THE_LOST_TOMB_DEMO_BACKUP.mp4` beside it.

| Action | Keys |
| --- | --- |
| Next | → ↓ Space PageDown, or swipe left |
| Previous | ← ↑ PageUp, or swipe right |
| First, last | Home, End |
| Full screen | F |
| Speaker notes | N |

Add `?slide=5` to open on a slide. The deck follows the system's reduced-motion setting.
`?static` shows slides without motion and `?print` lays them out for the PDF.

## Sources

- `src/index.html`: the slides. Each slide's speaker notes are in its `data-notes`, and
  entrances are declared on elements as `data-a` (kind) and `data-d` (delay in seconds).
- `src/deck.css`: layout and type, with the site's palette and typefaces.
- `src/deck.js`: fitting, navigation and the GSAP entrances.

The PowerPoint file shows each slide as a picture of the deck, because the site's typefaces
are not installed with Office. Speaker notes, alt text with each slide's full text, the
team line (editable), the live link and the embedded backup recording are native.
