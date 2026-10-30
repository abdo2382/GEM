// Builds src/museum-map/data/gem-complex.json from the OpenStreetMap extract (data/osm-gem.json)
// and the curated places (places.mjs).
//   node scripts/gem-map/build.mjs
// OpenStreetMap data is © OpenStreetMap contributors, available under the ODbL.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dist, nearestOnSegment, pointInPolygon, polygonArea, polygonCentroid, simplify, toLocal } from '../../src/museum-map/geo.ts'
import { INSIDE_NOTE, INTERIOR_NOT_MAPPED, PLACES, SOURCES } from './places.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', '..', 'src', 'museum-map', 'data', 'gem-complex.json')
const raw = JSON.parse(readFileSync(join(here, 'data', 'osm-gem.json'), 'utf8'))
const ORIGIN = { lat: 29.9945706, lon: 31.1192355 }

const P = (g) => toLocal(ORIGIN, g.lat, g.lon)
const r1 = (v) => Math.round(v * 10) / 10
const rp = (p) => [r1(p[0]), r1(p[1])]
const els = raw.elements
const byRef = new Map(els.map((e) => [`${e.type[0]}/${e.id}`, e]))
const refOf = (e) => `${e.type[0]}/${e.id}`

const outerRing = (rel) => {
  const outers = (rel.members ?? []).filter((m) => m.role === 'outer' && m.geometry)
  if (!outers.length) return null
  return outers.map((m) => m.geometry.map(P)).sort((a, b) => polygonArea(b) - polygonArea(a))[0]
}
const ringOf = (e) => (e.type === 'way' ? e.geometry?.map(P) : outerRing(e))
const closed = (pts) => (pts.length > 1 && dist(pts[0], pts.at(-1)) < 0.01 ? pts.slice(0, -1) : pts)

// Buildings whose inside GEM has not published: no walk may cross them (see INTERIOR_NOT_MAPPED).
const interiors = INTERIOR_NOT_MAPPED.map((ref) => {
  const e = byRef.get(ref)
  if (!e) throw new Error(`OpenStreetMap feature ${ref} is not in the extract`)
  return closed(ringOf(e))
})
const insideAnInterior = (p) => interiors.some((ring) => pointInPolygon(p, ring))

// The complex's boundary: the perimeter walls and fences, joined end to end ---------------------------
function joinRings(wayEls) {
  const open = wayEls.map((w) => ({ nodes: [...w.nodes], pts: w.geometry.map(P) }))
  const rings = []
  while (open.length) {
    let cur = open.pop()
    let grew = true
    while (grew && cur.nodes[0] !== cur.nodes.at(-1)) {
      grew = false
      for (let i = 0; i < open.length; i++) {
        const o = open[i]
        const head = cur.nodes[0]
        const tail = cur.nodes.at(-1)
        let next = null
        if (o.nodes[0] === tail) next = { nodes: [...cur.nodes, ...o.nodes.slice(1)], pts: [...cur.pts, ...o.pts.slice(1)] }
        else if (o.nodes.at(-1) === tail) next = { nodes: [...cur.nodes, ...[...o.nodes].reverse().slice(1)], pts: [...cur.pts, ...[...o.pts].reverse().slice(1)] }
        else if (o.nodes.at(-1) === head) next = { nodes: [...o.nodes, ...cur.nodes.slice(1)], pts: [...o.pts, ...cur.pts.slice(1)] }
        else if (o.nodes[0] === head) next = { nodes: [...[...o.nodes].reverse(), ...cur.nodes.slice(1)], pts: [...[...o.pts].reverse(), ...cur.pts.slice(1)] }
        if (!next) continue
        cur = next
        open.splice(i, 1)
        grew = true
        break
      }
    }
    if (cur.nodes[0] === cur.nodes.at(-1)) rings.push(cur.pts.slice(0, -1))
  }
  return rings
}

function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list) => {
    const h = []
    for (const p of list) {
      while (h.length >= 2 && cross(h.at(-2), h.at(-1), p) <= 0) h.pop()
      h.push(p)
    }
    h.pop()
    return h
  }
  return [...half(pts), ...half([...pts].reverse())]
}

const wallEls = els.filter((e) => e.type === 'way' && /^(wall|fence|retaining_wall)$/.test(e.tags?.barrier ?? '') && e.geometry)
const rings = joinRings(wallEls).sort((a, b) => polygonArea(b) - polygonArea(a))
let BOUNDARY
let boundaryHow
if (rings.length && polygonArea(rings[0]) > 150000) {
  BOUNDARY = rings[0]
  boundaryHow = `perimeter ring of ${BOUNDARY.length} points`
} else {
  BOUNDARY = convexHull(wallEls.flatMap((w) => w.geometry.map(P)))
  boundaryHow = `convex hull of the walls (${BOUNDARY.length} points)`
}
console.log(`boundary: ${boundaryHow}, ${Math.round(polygonArea(BOUNDARY)).toLocaleString()} m²`)

const distToPoly = (p, poly) => {
  let d = Infinity
  for (let i = 0; i < poly.length; i++) d = Math.min(d, nearestOnSegment(p, poly[i], poly[(i + 1) % poly.length]).dist)
  return d
}
const near = (p, margin) => pointInPolygon(p, BOUNDARY) || distToPoly(p, BOUNDARY) <= margin
const bx = BOUNDARY.map((p) => p[0])
const by = BOUNDARY.map((p) => p[1])
const BBOX = [Math.min(...bx) - 150, Math.min(...by) - 150, Math.max(...bx) + 150, Math.max(...by) + 150]
const inBox = (p) => p[0] >= BBOX[0] && p[0] <= BBOX[2] && p[1] >= BBOX[1] && p[1] <= BBOX[3]

// The walkable network -------------------------------------------------------------------------------------
const pos = new Map() // node id -> [x, y]; the same array everywhere a node is used
const walkKind = (t) => {
  const h = t.highway
  if (h === 'footway' || h === 'pedestrian' || h === 'path') return 'path'
  if (h === 'steps') return 'steps'
  if (h === 'service' && t.service !== 'parking_aisle' && t.access !== 'private' && t.access !== 'no') return 'road'
  return null
}
const walk = []
for (const e of els) {
  if (e.type !== 'way' || !e.tags?.highway || !e.geometry) continue
  const k = walkKind(e.tags)
  if (!k) continue
  e.nodes.forEach((id, i) => {
    if (!pos.has(id)) pos.set(id, P(e.geometry[i]))
  })
  let run = []
  const flush = () => {
    if (run.length >= 2) walk.push({ k, ids: run })
    run = []
  }
  for (const id of e.nodes) {
    const p = pos.get(id)
    if (!near(p, 20)) {
      flush()
      continue
    }
    if (run.length) {
      const q = pos.get(run.at(-1))
      if (insideAnInterior([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])) flush()
    }
    run.push(id)
  }
  flush()
}

// Drop shape points that sit on a straight line, but never a junction.
const use = new Map()
for (const w of walk) for (const id of w.ids) use.set(id, (use.get(id) ?? 0) + 1)
function simplifyIds(ids, tol) {
  const out = [ids[0]]
  let start = 0
  for (let i = 1; i < ids.length; i++) {
    if (i === ids.length - 1 || use.get(ids[i]) > 1) {
      const piece = ids.slice(start, i + 1)
      const pts = piece.map((id) => pos.get(id))
      const kept = new Set(simplify(pts, tol))
      for (let j = 1; j < piece.length; j++) if (kept.has(pts[j])) out.push(piece[j])
      start = i
    }
  }
  return out
}
for (const w of walk) w.ids = simplifyIds(w.ids, 0.35)

// Attaching a place: find the nearest point on the network and join to it.
let synthetic = 0
const links = []
const attachCache = new Map()
function nearestOnNetwork(at, accept = () => true) {
  let best = { d: Infinity }
  for (const w of walk) {
    for (let i = 0; i + 1 < w.ids.length; i++) {
      if (!accept(w, i)) continue
      const r = nearestOnSegment(at, pos.get(w.ids[i]), pos.get(w.ids[i + 1]))
      if (r.dist < best.d) best = { d: r.dist, w, i, r }
    }
  }
  return best
}
// For a landmark seen from its square: only the part of the network a walker reaches from the
// visitor entrance without climbing steps, so a route never ends inside a stepped platform.
function stepFreeSegments() {
  const entrance = nearestOnNetwork(featurePos('n/12300327718'))
  const adj = new Map()
  for (const w of walk) {
    if (w.k === 'steps') continue
    for (let i = 1; i < w.ids.length; i++) {
      const a = w.ids[i - 1]
      const b = w.ids[i]
      ;(adj.get(a) ?? adj.set(a, []).get(a)).push(b)
      ;(adj.get(b) ?? adj.set(b, []).get(b)).push(a)
    }
  }
  const seen = new Set([entrance.w.ids[entrance.i]])
  const stack = [...seen]
  while (stack.length) for (const nb of adj.get(stack.pop()) ?? []) if (!seen.has(nb)) (seen.add(nb), stack.push(nb))
  return (w, i) => w.k !== 'steps' && seen.has(w.ids[i]) && seen.has(w.ids[i + 1])
}
function attach(at, key, accept) {
  if (key && attachCache.has(key)) return attachCache.get(key)
  const best = nearestOnNetwork(at, accept)
  if (!(best.d < 60)) throw new Error(`nothing walkable within 60 m of ${at}`)
  const a = best.w.ids[best.i]
  const b = best.w.ids[best.i + 1]
  let joint
  if (dist(best.r.point, pos.get(a)) < 1.2) joint = a
  else if (dist(best.r.point, pos.get(b)) < 1.2) joint = b
  else {
    joint = `s${synthetic++}`
    pos.set(joint, best.r.point)
    best.w.ids.splice(best.i + 1, 0, joint)
  }
  let node = joint
  // A landmark seen from its square ends the route at the square's edge; everything else is joined by a link.
  if (best.d > 2.5 && !accept) {
    node = `s${synthetic++}`
    pos.set(node, [at[0], at[1]])
    links.push({ k: 'link', ids: [node, joint] })
  }
  if (key) attachCache.set(key, node)
  return node
}

// Scenery --------------------------------------------------------------------------------------------------

// Member ways of building relations are drawn through the relation.
const memberWays = new Set()
for (const e of els) if (e.type === 'relation' && e.tags?.building) for (const m of e.members ?? []) if (m.type === 'way') memberWays.add(m.ref)

const buildings = []
const buildingIndex = new Map()
const parseHeight = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}
for (const e of els) {
  if (!e.tags?.building || (e.type !== 'way' && e.type !== 'relation')) continue
  if (e.type === 'way' && memberWays.has(e.id)) continue
  const ring = ringOf(e)
  if (!ring || ring.length < 3) continue
  const o = closed(ring)
  const c = polygonCentroid(o)
  const area = polygonArea(o)
  if (area < 15 || !near(c, 20)) continue
  const tagged = parseHeight(e.tags.height)
  const levels = parseHeight(e.tags['building:levels'])
  const assumed = e.tags.building === 'construction' ? 8 : levels ? levels * 3.6 : area < 400 ? 5 : area < 2500 ? 9 : 14
  buildingIndex.set(refOf(e), buildings.length)
  buildings.push({ o: simplify(o, 0.3).map(rp), h: tagged ?? r1(assumed), hf: tagged ? 'osm' : 'assumed', id: refOf(e) })
}

const isGreen = (t) => t.landuse === 'grass' || t.leisure === 'garden' || t.leisure === 'park' || t.natural === 'grassland' || t.natural === 'scrub'
const greens = []
const water = []
for (const e of els) {
  if ((e.type !== 'way' && e.type !== 'relation') || !e.tags || e.tags.building) continue
  const ring = ringOf(e)
  if (!ring || ring.length < 3) continue
  const o = closed(ring)
  const area = polygonArea(o)
  if (area < 8 || !near(polygonCentroid(o), 20)) continue
  if (e.tags.amenity === 'fountain') water.push({ o: simplify(o, 0.3).map(rp), id: refOf(e) })
  else if (isGreen(e.tags)) greens.push({ o: simplify(o, 0.4).map(rp), id: refOf(e) })
}

const clipRuns = (pts, keep) => {
  const runs = []
  let run = []
  for (const p of pts) {
    if (keep(p)) run.push(p)
    else {
      if (run.length > 1) runs.push(run)
      run = []
    }
  }
  if (run.length > 1) runs.push(run)
  return runs
}

const walls = []
for (const e of wallEls) for (const run of clipRuns(e.geometry.map(P), (p) => near(p, 30))) walls.push({ p: simplify(run, 0.5).map(rp), id: refOf(e) })

const MAJOR = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link', 'secondary', 'secondary_link', 'tertiary', 'unclassified'])
const roads = []
const walkIds = new Set()
for (const e of els) if (e.type === 'way' && e.tags?.highway && walkKind(e.tags)) walkIds.add(e.id)
for (const e of els) {
  if (e.type !== 'way' || !e.tags?.highway || !e.geometry || walkIds.has(e.id)) continue
  if (e.tags.highway === 'construction' || e.tags.highway === 'proposed') continue
  for (const run of clipRuns(e.geometry.map(P), inBox)) {
    const p = simplify(run, 0.8).map(rp)
    if (p.length > 1) roads.push({ p, id: refOf(e), w: MAJOR.has(e.tags.highway) ? 2 : 1 })
  }
}

// Places -------------------------------------------------------------------------------------------------
const featurePos = (ref) => {
  const e = byRef.get(ref)
  if (!e) throw new Error(`OpenStreetMap feature ${ref} is not in the extract`)
  return e.type === 'node' ? P(e) : polygonCentroid(closed(ringOf(e)))
}
const places = []
for (const cfg of PLACES) {
  for (const ref of cfg.osm) featurePos(ref) // every cited feature must exist
  const at = cfg.at === 'centroid' ? featurePos(cfg.osm[0]) : Array.isArray(cfg.at) ? cfg.at : featurePos(cfg.at)
  let accessAt = cfg.access && cfg.access !== 'outline' ? featurePos(cfg.access) : at
  if (cfg.access === 'outline') {
    // No door is mapped: end the route where the building's outline comes closest to a path.
    const ring = closed(ringOf(byRef.get(cfg.building)))
    const candidates = ring.flatMap((p, i) => [p, [(p[0] + ring[(i + 1) % ring.length][0]) / 2, (p[1] + ring[(i + 1) % ring.length][1]) / 2]])
    accessAt = candidates.map((c) => [c, nearestOnNetwork(c).d]).sort((a, b) => a[1] - b[1])[0][0]
  }
  const node = attach(accessAt, cfg.access && cfg.access !== 'outline' ? cfg.access : `${cfg.id}-door`, cfg.approach === 'step-free' ? stepFreeSegments() : undefined)
  let building
  if (cfg.building) {
    building = buildingIndex.get(cfg.building)
    if (building === undefined) throw new Error(`${cfg.id}: building ${cfg.building} was not drawn`)
  }
  places.push({ cfg, at: rp(at), node, building })
}

// Keep only what a walker can reach from the visitor entrance -------------------------------------------------
const all = [...walk, ...links]
const adj = new Map()
for (const w of all) for (let i = 1; i < w.ids.length; i++) for (const [x, y] of [[w.ids[i - 1], w.ids[i]], [w.ids[i], w.ids[i - 1]]]) (adj.get(x) ?? adj.set(x, []).get(x)).push(y)
const start = places.find((p) => p.cfg.id === 'ticketing-entrance').node
const reach = new Set([start])
const stack = [start]
while (stack.length) for (const nb of adj.get(stack.pop()) ?? []) if (!reach.has(nb)) (reach.add(nb), stack.push(nb))
const kept = all.filter((w) => w.ids.every((id) => reach.has(id)))
console.log(`walkable: ${walk.length} ways (${kept.length} reachable incl. ${links.length} links); ${all.length - kept.length} unreachable ways dropped`)
for (const p of places) if (!reach.has(p.node)) throw new Error(`${p.cfg.id} cannot be reached from the entrance`)

// Final indices ------------------------------------------------------------------------------------------------
const index = new Map()
const nodes = []
const ix = (id) => {
  if (!index.has(id)) {
    index.set(id, nodes.length)
    nodes.push(rp(pos.get(id)))
  }
  return index.get(id)
}
const outWays = kept.map((w) => ({ k: w.k, n: w.ids.map(ix) }))
const outPlaces = places.map(({ cfg, at, node, building }) => {
  const p = { id: cfg.id, kind: cfg.kind, name: cfg.name, arFrom: cfg.arFrom }
  if (cfg.about) p.about = cfg.about
  p.at = at
  p.node = ix(node)
  p.osm = cfg.osm
  p.match = cfg.match
  if (cfg.inside) p.inside = cfg.inside
  if (cfg.page) p.page = cfg.page
  if (building !== undefined) p.building = building
  return p
})

const today = new Date().toISOString().slice(0, 10)
const meta = {
  id: 'gem-complex',
  version: 1,
  builtOn: today,
  osmSnapshot: raw.osm3s?.timestamp_osm_base ?? '',
  origin: ORIGIN,
  frame: 'Metres from the origin: x grows east and y grows south, so north is up the page.',
  sources: SOURCES,
  insideNote: INSIDE_NOTE,
}

// One record per line keeps diffs readable.
const lines = (items, indent = '  ') => items.map((i) => indent + JSON.stringify(i)).join(',\n')
const rows = (items, per) => {
  const out = []
  for (let i = 0; i < items.length; i += per) out.push('  ' + items.slice(i, i + per).map((n) => JSON.stringify(n)).join(','))
  return out.join(',\n')
}
const json = `{
"meta": ${JSON.stringify(meta, null, 2)},
"places": [
${lines(outPlaces)}
],
"nodes": [
${rows(nodes, 8)}
],
"ways": [
${lines(outWays)}
],
"scenery": {
  "buildings": [
${lines(buildings, '    ')}
  ],
  "greens": [
${lines(greens, '    ')}
  ],
  "water": [
${lines(water, '    ')}
  ],
  "walls": [
${lines(walls, '    ')}
  ],
  "roads": [
${lines(roads, '    ')}
  ]
}
}
`
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, json)
console.log(`wrote ${OUT}`)
console.log(`  ${outPlaces.length} places, ${nodes.length} nodes, ${outWays.length} ways, ${buildings.length} buildings, ${greens.length} greens, ${water.length} water, ${walls.length} walls, ${roads.length} roads`)
console.log(`  ${(Buffer.byteLength(json) / 1024).toFixed(0)} KB`)
