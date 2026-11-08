# The Lost Tomb — working notes

Scroll-driven 3D museum experience about Tutankhamun for the GEM Hackathon 2026.
React 19 + Vite + TypeScript, React Three Fiber, GSAP ScrollTrigger + Lenis, zustand.
See README.md for features, URL parameters and the project map.

## Commands

- `npm run dev` — dev server on http://localhost:5173
- `npx tsc -b` — type-check (run after every change)
- `npm test` — unit tests (`node --test`, no extra dependencies): the mask's
  choreography plan and the archival photo manifest
- `npm run build` — production build; must pass before a task is called done
- `npx oxlint src` — lint (R3F's per-frame mutation warnings are expected)

## Rules for this project

- Preserve existing features and files. Extend, don't rebuild.
- Historical accuracy first: every fact in `src/content/story.ts` cites a source; never
  invent gallery locations (`gemLocation` stays null without official GEM data).
- Every 3D object is labelled with its provenance; don't present reconstructions as scans.
- Photos projected onto the mask (`src/content/maskPhotos.ts`) belong to their
  photographers. Licences must be confirmed and attributed before publishing; never
  use or alter watermarked images.
- Arabic and English ship together; layouts mirror in RTL via logical CSS properties.
- Respect `prefers-reduced-motion` and keep the no-WebGL story edition working.
- Mobile first. The interface's portrait layout uses the same rule as the 3D layout
  (`three/layout.ts`): narrower than 760px, or taller than wide (aspect < 0.85).
  Touch targets are 44px on coarse pointers.

## The approved mask is locked

The 3D mask was approved by the owner on 2026-10-24. Don't change its geometry,
materials, photo projection, lighting response, poses or animation. Integration fixes
go in surrounding code (UI, layout, other scene objects such as `InspectVeil.tsx`).
Locked files and a byte-exact copy live in `backups/mask-approved-2026-10-24/`
(`src/three/models/mask.ts`, `photoProjection.ts`, `MaskView.tsx`,
`content/maskPhotos.ts`, `public/textures/mask/*`, plus the files they depend on).
Check them with:
`(cd backups/mask-approved-2026-10-24 && cat SHA256SUMS) | sha256sum -c -`
These differ on purpose, without changing the mask itself: `Stage.tsx` (mounts
`InspectVeil`, `MaskRig`, the quality tiers and the shader precompile), `Atmosphere.tsx`
(chapter backgrounds, per-tier dust and stone detail), `PostFX.tsx` (adds the lighter
medium-tier grade; the full grade is unchanged), `state/store.ts` (quality settings),
`state/scroll.ts` (scroll position for the phone bar) and `package.json` (test script).

The mask moves around the frame only through its parent group, `three/MaskRig.tsx`,
driven by `three/rigPlan.ts` (tested). The rig runs before the mask's own frame
(`useFrame` priority -1) so the photo projection never lags. In `?studio` it is inert.

## Performance and quality tiers

Phones were lagging and freezing; the fixes and their measurements are in
`PERFORMANCE.md`. Keep them working:

- `src/quality/adaptiveQuality.ts` (tested) defines the LOW / MEDIUM / HIGH presets, the
  cautious first guess (phones start on medium) and the governor that steps the tier
  down on sustained slow frames and, slowly, back up. HIGH is the approved desktop look:
  don't make it cheaper, and give any new effect a per-tier cost in `PRESETS`.
- The visitor's setting (Auto / Low / Medium / High) is in the top bar and is stored.
  Auto never repaints the backdrops mid-story (`detail` follows explicit choices only).
- Never read layout in a frame loop (`window.innerWidth`, `scrollY`, `getBoundingClientRect`):
  use `utils/viewport.ts` and `scrollState.y`. Write per-frame styles with `setStyle`
  (`ui/useTicker.ts`), which skips unchanged values.
- `Stage.tsx` compiles every material before the first frame, against an off-screen
  target when post-processing is on. New scene objects must exist (and be visible) at
  mount to be included, or they compile on first use and freeze the frame.
- `?perf` shows frame rate, tier and resolution on a real phone.

## Archival photographs

Only verified, licensed photographs: every one is listed in `src/content/archive.ts`
with creator, holding institution, source page, licence and bilingual caption, and
`tests/archive.test.ts` fails if an entry is incomplete, a file is missing or unused.
Current photos are Harry Burton's excavation prints (Heidelberg University Library,
public domain via Wikimedia Commons). Never use AI-generated or unrelated images to
illustrate a historical event; if no verified photo exists, show none.

## Verifying 3D work

- `?studio=<deg>` shows the mask alone at a yaw angle (`window.__studioAngle` and
  `window.__studioPitch` change it live). `?photo=0` turns the photo projection off.
- Dev-only `POST /__shot?name=x` saves a canvas data URL to `.shots/x.jpg`; the
  scripts in `.shots/` put renders beside the reference photos.
- `window.__r3f`, `window.__lt` and `window.__photo` expose the scene, scroll/store and
  projection in dev builds. A hidden browser pane pauses rendering: show it before
  measuring, or step frames with `__r3f.advance()`.

## Skills: pick the relevant ones per task

Read the skill's SKILL.md before applying it. Use only the skills that fit the task;
when they conflict, mask protection, historical accuracy, accessibility and
performance win.

| Task | Skills |
| --- | --- |
| Page layout, typography, visual polish, "looks generic" | `design-taste-frontend`, `frontend-design`, `ui-ux-pro-max` |
| Component craft, interaction details, UI review | `emil-design-eng`, `ui-ux-pro-max` |
| Adding new motion or transitions | `animate` |
| Reviewing or fixing existing motion across the app | `improve-animations`, `review-animations` |
| Jank, dropped frames, choosing what property to animate | `animation-performance` |
| R3F scene structure, camera and rig work | `threejs-r3f`, `r3f-animation` |
| glTF/GLB models, texture compression, loading budgets | `three-gltf-pipeline-optimization` |
| Accessibility, touch targets, contrast, keyboard | `a11y-audit` |
| New features and bug fixes | `test-driven-development` |
| Visitor-facing copy, README, reports to the user | `humanizer` |

3D modelling, shaders and photo projection fall outside these skills; use the studio
view and `.shots/` comparisons instead.

## Pages and the museum map

- Three pages, three page loads (`site/route.ts`, `entry/*`): `/` homepage, `/museum-map`, `/lost-tomb` (the
  experience, loaded exactly as before). Links between them are plain links built with `pageHref`, which carries
  the language. Old root links with experience-only parameters redirect to `/lost-tomb`.
- `vite build` writes `dist/museum-map/index.html` and `dist/lost-tomb/index.html`, copies of `index.html`
  (`scripts/pageFolders.ts`, tested), so a host with no rewrite rules still opens every page. Without them only the
  homepage opened there. A new page needs only its entry in `PAGE_PATH`; `vercel.json` stays as a fallback.
- The museum map lives in `src/museum-map/` (read its README). Its data is generated from OpenStreetMap by
  `scripts/gem-map/`; never invent where anything is inside the Main Building, never copy GEM's map image, keep the
  OpenStreetMap credit, and keep `match: "approximate"` places flagged.
- Pure map logic is test-first (`geo`, `astar`, `directions`, `describe`, `camera`, `labels`, `scene3d`,
  `mapUrl`, `museumData`). The 3D view is its own chunk and renders on demand.
- The perf and promo scripts now open `/lost-tomb`. The exported deck still links to the root, which is now the homepage.
