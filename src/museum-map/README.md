# Museum map

A walking map of the Grand Egyptian Museum complex: pick two places, see the walk (A*), on a flat
plan (SVG) or in 3D (React Three Fiber). English and Arabic. Open it at `/museum-map`.

## The data

`data/gem-complex.json` is generated, not hand-edited. Its shape is in `types.ts`.

```
node scripts/gem-map/fetch-osm.mjs   # optional, needs the network: refreshes scripts/gem-map/data/osm-gem.json
node scripts/gem-map/build.mjs       # OpenStreetMap extract + curated places (scripts/gem-map/places.mjs) -> the JSON
node scripts/gem-map/home-art.mjs    # the homepage's picture of it -> src/site/homeMap.ts
```

- Footprints, paths, gardens, entrances and facility points come from OpenStreetMap (ODbL). The credit is
  shown on the map and listed in `meta.sources`.
- GEM's own site plan (gem.eg) is used for names and for which places exist. Its image and geometry are not
  copied: its terms reserve those rights.
- Every place has an English and an Arabic name, and `arFrom` says whether the Arabic is OpenStreetMap's, GEM's
  or ours. Have a native speaker review the Arabic copy before publishing.

## Rules

- GEM has published no floor plan of the inside of the Main Building. Nothing here places a gallery or a room:
  `inside` lists the parts GEM names, with no positions, and the build drops every walkable segment inside the
  museum, the Boats Museum and the Conservation Centre (`INTERIOR_NOT_MAPPED` in `places.mjs`).
- Khufu's Boats Museum and the Conservation Centre are `match: "approximate"`: OpenStreetMap does not name them,
  so they were matched to GEM's site plan by position and shape. The interface says so.
- Routes follow only the paths OpenStreetMap maps; open squares are unmapped, so a long walk can be much longer
  than the straight line. The interface says that too, and shows the straight-line distance.
- Heights in 3D are real only where OpenStreetMap tags them (the museum: 46 m); the rest are assumed.

## Adding the real interior

Not built. It needs the official floor plan, one file per level with room names, and GEM's permission to use
it. A* already ignores levels, so the work is in the data (levels, rooms, lifts and stairs as ways) and the views.

## Address

`/museum-map?from=<place>&to=<place>&free=1&view=3d`, plus `lang=ar`. Unknown places are ignored.

## Tests

`tests/geo`, `astar`, `directions`, `describe`, `camera`, `labels`, `scene3d`, `mapUrl` and `museumData` (the
data's integrity: licence, names, connectivity, no walk through a building, size).
