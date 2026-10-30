# The Lost Tomb — A Journey Through Tutankhamun's Legacy

An immersive, scroll-driven 3D experience built for the **GEM Hackathon 2026 — Fourth Edition**
("Your GEM, Your Way"). The visitor scrolls through five story stages; the golden mask turns in
the centre, treasures emerge from the dark on one side, and an ancient papyrus tells the story on
the other. Treasures can be inspected in 360° and saved to a personal **Discovery Trail** for a
visit to the Grand Egyptian Museum.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/ (deploys as a static site, e.g. Vercel)
npm run preview    # serve the production build
```

Useful URL parameters:

| Parameter | Effect |
|---|---|
| `?autostart` | Skips the entry gate (kiosk / demo mode) |
| `?lang=ar` / `?lang=en` | Forces the language |
| `?quality=auto` / `low` / `medium` / `high` | Overrides the visitor's quality setting for this visit (Auto adapts to measured frame times; see `src/quality/`) |
| `?perf` | Shows frame rate, slowest frames, quality tier and render resolution, for checking a real phone without DevTools |
| `?nowebgl` | Shows the story edition used on devices without WebGL |

## What's in the MVP

- **Five stages** on one shared scroll timeline: Prologue → The Discovery (1922) → The Boy King →
  The Journey to Eternity → The Living Legacy (GEM).
- **Golden mask** (centre): sculpted face, striped nemes, inlaid eyes and cosmetic lines, broad
  collar, plaited beard, vulture and cobra. The camera, light and pose are choreographed per chapter.
- **Three artifacts**: Anubis shrine, Golden Throne, Canopic shrine. They dissolve in and out as
  glowing dust between chapters.
- **Inspect the mask itself** from the label under it: turn it to the back to see the queue and
  inscription panel, with GEM catalogue facts.
- **Inspect mode**: drag to rotate through 360°, or use the slider or arrow keys. Scroll, pinch or
  press +/− to zoom. Numbered gold hotspots open each detail's story.
- **Papyrus narrator**: rolled up in the prologue, unrolls for chapter I, and inks each passage in
  word by word, with "Read more" for deeper context.
- **Discovery Trail**: save treasures from anywhere. The epilogue becomes your trail, with a
  downloadable share card (rendered locally) and before/during/after visit guidance.
- **Arabic + English**, with full RTL mirroring (the papyrus and artifact columns swap sides).
- **Responsive**: three columns on desktop, compact on tablet, and a phone layout where the papyrus
  becomes a bottom sheet.
- **Accessibility and fallbacks**: keyboard chapter navigation (↑/↓, PgUp/PgDn, Space,
  Home/End), `prefers-reduced-motion` support, focus handling in dialogs, and a no-WebGL story
  edition.
- **Procedural atmosphere** instead of video: a blurred, torch-lit wall of carved signs, a light
  beam with drifting dust, and in the epilogue a lattice evoking the GEM façade. There is also
  optional procedural ambient sound (wind, drone, torch crackle).

## Provenance and accuracy

**Every 3D object is an artistic reconstruction modelled in code** from published descriptions. None
is a scan, and the UI labels each one as such. The gold mask is fitted to front and back photographs of
the original: its silhouette, stripe spacing, collar rows, eyes, ears, beard and back inscription panel
were measured from them. Open `?studio=0` (or any angle, e.g. `?studio=180`) to see it alone for
comparison. The mask's catalogue facts (GEM no. 8, Tutankhamun Galleries, materials, width 39.3 cm) and
the inscription translation come from the Grand Egyptian Museum's collection record. No openly licensed, directly downloadable scans of
these objects were found. Facts in `src/content/story.ts` list their sources: the Griffith Institute
archive, Carter & Mace (1923), Reeves, and Hawass et al. (2010).

**Gallery locations are never invented.** `gemLocation` in `src/content/artifacts.ts` stays `null`,
so the UI shows "Ask GEM staff", until verified museum data is available. The wall inscriptions are
decorative arrangements of real signs, not readable texts. The cartouche emblem correctly spells
Nebkheperure, Tutankhamun's throne name.

## Swapping in scanned models

Licensed GLB files can replace the reconstructions without code changes. Put the file in
`public/models/` and set `glb: '/models/anubis.glb'` (or the throne, canopic or `MASK` entry) in
`src/content/artifacts.ts`. The loader centres and scales it, applies the dissolve transition and
keeps the reconstruction if loading fails. Update `provenance` to `'reproduction'` and add the
licence to the credits. Hotspot dots are hidden for swapped models until marker positions are added.

## Project map

```
src/
  content/   chapters.ts (scene keyframes) · story.ts (EN/AR narrative) · artifacts.ts
  i18n/      strings.ts (UI strings EN/AR) · useT.ts
  state/     store.ts (zustand) · scroll.ts (anchors, presence, inspect state) · hotspots.ts
  scroll/    ScrollDriver.tsx (Lenis + ScrollTrigger + directional snap) · controls.ts
  three/     Stage · director.ts (scroll → interpolated scene) · CameraRig · Lights · Atmosphere
             MaskView · Artifacts · PostFX · materials.ts (PBR + dissolve) · textures.ts (canvas PBR)
             models/ mask · anubis · throne · canopic · geo/common helpers
  ui/        Loader · TopBar · Prologue · Papyrus · ArtifactCaption · ChapterNav · InspectOverlay
             Trail (drawer + epilogue) · Credits · StaticFallback
  audio/     ambience.ts (procedural WebAudio)
```

Not an official Grand Egyptian Museum product.

## Pages and the museum map

| Address | What it is |
|---|---|
| `/` | The homepage: two ways in |
| `/museum-map` | The museum map: walks between places, on a plan or in 3D (`src/museum-map/README.md`) |
| `/lost-tomb` | The scroll-driven experience, unchanged. Old links such as `/?autostart` move here |

Each page is its own page load, so the experience's styles and audio never reach the other two. Hosts need a
fallback to `index.html` for these paths (`vercel.json` does it for Vercel). The map takes `?from=`, `?to=`,
`?free=1` (avoid steps) and `?view=3d`.
