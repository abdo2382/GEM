import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { GemMap } from '../src/museum-map/types.ts'
import { nearestOnSegment, pointInPolygon, polygonArea, type XY } from '../src/museum-map/geo.ts'

const FILE = fileURLToPath(new URL('../src/museum-map/data/gem-complex.json', import.meta.url))
const map = JSON.parse(readFileSync(FILE, 'utf8')) as GemMap
const place = (id: string) => {
  const p = map.places.find((x) => x.id === id)
  assert.ok(p, `place ${id}`)
  return p
}

// Provenance -----------------------------------------------------------------------------

test('the data says where it comes from, and carries the OpenStreetMap licence', () => {
  const osm = map.meta.sources.find((s) => /openstreetmap/i.test(s.name))
  assert.ok(osm, 'an OpenStreetMap source')
  assert.match(osm.licence ?? '', /ODbL/)
  assert.match(osm.url, /^https:\/\/www\.openstreetmap\.org\//)
  assert.ok(map.meta.sources.some((s) => /^https:\/\/gem\.eg\//.test(s.url)), 'a GEM source')
  assert.match(map.meta.osmSnapshot, /^\d{4}-\d{2}-\d{2}T/)
  assert.match(map.meta.builtOn, /^\d{4}-\d{2}-\d{2}$/)
})

test('the data states what GEM has not published, in both languages', () => {
  assert.ok(map.meta.insideNote.en.length > 20)
  assert.ok(map.meta.insideNote.ar.length > 10)
})

// Places ---------------------------------------------------------------------------------

test('every place has an id, an English and an Arabic name, and says where the Arabic came from', () => {
  const ids = new Set<string>()
  for (const p of map.places) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`)
    ids.add(p.id)
    assert.ok(p.name.en.trim().length > 1, `${p.id}: English name`)
    assert.ok(/[؀-ۿ]/.test(p.name.ar), `${p.id}: Arabic name has Arabic letters`)
    assert.ok(['osm', 'gem', 'ours'].includes(p.arFrom), `${p.id}: arFrom`)
  }
})

test('every place names the OpenStreetMap features it is drawn from', () => {
  for (const p of map.places) {
    assert.ok(p.osm.length > 0, p.id)
    for (const ref of p.osm) assert.match(ref, /^[nwr]\/\d+$/, `${p.id}: ${ref}`)
  }
})

test('a place is only "exact" when OpenStreetMap names it or tags it as what it is', () => {
  const approx = map.places.filter((p) => p.match === 'approximate').map((p) => p.id).sort()
  assert.deepEqual(approx, ['conservation-centre', 'khufu-boats-museum'])
})

test('the places a visitor looks for are all there', () => {
  for (const id of ['main-building', 'main-entrance', 'hanging-obelisk', 'ticketing-entrance', 'toilets', 'lockers', 'atm', 'drinking-water', 'car-park-entrance', 'khufu-boats-museum', 'conservation-centre']) place(id)
})

test('each place stands on a routing node: a point place beside its marker, a building at its door', () => {
  for (const p of map.places) {
    const n = map.nodes[p.node]
    assert.ok(n, `${p.id}: node ${p.node}`)
    if (p.building === undefined) {
      assert.ok(Math.hypot(n[0] - p.at[0], n[1] - p.at[1]) < 40, `${p.id}: marker and node are close`)
    } else {
      const o = map.scenery.buildings[p.building].o
      let edge = Infinity
      for (let i = 0; i < o.length; i++) edge = Math.min(edge, nearestOnSegment(n, o[i], o[(i + 1) % o.length]).dist)
      assert.ok(edge < 40, `${p.id}: its door is within 40 m of the building (${edge.toFixed(0)} m)`)
    }
  }
})

// The inside of the building --------------------------------------------------------------

test('the inside of the Main Building is named, never placed: GEM has published no floor plan', () => {
  const inside = place('main-building').inside
  assert.ok(inside && inside.length >= 4, 'inside parts')
  for (const part of inside) {
    assert.deepEqual(Object.keys(part).sort(), ['id', 'name', 'note', 'source'], `${part.id} carries no position`)
    assert.match(part.source, /^https:\/\/gem\.eg\//)
    assert.ok(part.name.en && part.name.ar && part.note.en && part.note.ar, part.id)
  }
  for (const id of ['grand-hall', 'grand-stairs', 'main-galleries', 'tutankhamun-galleries']) assert.ok(inside.some((p) => p.id === id), id)
})

test('only the Main Building has inside parts', () => {
  for (const p of map.places) if (p.id !== 'main-building') assert.equal(p.inside, undefined, p.id)
})

// The walkable network ---------------------------------------------------------------------

test('every way joins nodes that exist, in a valid kind, without repeating a node', () => {
  for (const [i, w] of map.ways.entries()) {
    assert.ok(['path', 'steps', 'road', 'link'].includes(w.k), `way ${i}: kind`)
    assert.ok(w.n.length >= 2, `way ${i}: at least two nodes`)
    for (let k = 0; k < w.n.length; k++) {
      assert.ok(map.nodes[w.n[k]], `way ${i}: node ${w.n[k]}`)
      if (k) assert.notEqual(w.n[k], w.n[k - 1], `way ${i}: repeats a node`)
    }
  }
})

test('all coordinates are finite metres inside the complex', () => {
  for (const [x, y] of map.nodes) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y))
    assert.ok(Math.abs(x) < 1000 && Math.abs(y) < 1000)
  }
})

test('a walker can get from the entrance to every place', () => {
  const adj = new Map<number, number[]>()
  const add = (a: number, b: number) => (adj.get(a) ?? adj.set(a, []).get(a)!).push(b)
  for (const w of map.ways) for (let i = 1; i < w.n.length; i++) (add(w.n[i - 1], w.n[i]), add(w.n[i], w.n[i - 1]))
  const start = place('ticketing-entrance').node
  const seen = new Set([start])
  const stack = [start]
  while (stack.length) for (const nb of adj.get(stack.pop()!) ?? []) if (!seen.has(nb)) (seen.add(nb), stack.push(nb))
  for (const p of map.places) assert.ok(seen.has(p.node), `${p.id} is not connected to the entrance`)
})

test('no walk goes through a building whose inside is not mapped: the museum, the boats museum, the conservation centre', () => {
  const insides = ['main-building', 'khufu-boats-museum', 'conservation-centre'].map((id) => map.scenery.buildings[place(id).building!].o)
  for (const [i, w] of map.ways.entries()) {
    for (let k = 1; k < w.n.length; k++) {
      const a = map.nodes[w.n[k - 1]]
      const b = map.nodes[w.n[k]]
      const mid: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      for (const o of insides) assert.ok(!pointInPolygon(mid, o), `way ${i} (${w.k}) crosses a building at ${mid.map((v) => v.toFixed(0))}`)
    }
  }
})

test('a place off the mapped paths is joined by a link, and links are short', () => {
  for (const w of map.ways.filter((x) => x.k === 'link')) {
    const [a, b] = [map.nodes[w.n[0]], map.nodes[w.n[w.n.length - 1]]]
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) <= 40, 'link length')
  }
})

// Scenery -------------------------------------------------------------------------------------

test('buildings are real polygons with a height and a note of where the height comes from', () => {
  assert.ok(map.scenery.buildings.length >= 30)
  for (const b of map.scenery.buildings) {
    assert.ok(b.o.length >= 3, b.id)
    assert.ok(polygonArea(b.o) > 15, `${b.id}: area`)
    assert.ok(b.h > 0 && b.h < 100, `${b.id}: height`)
    assert.ok(b.hf === 'osm' || b.hf === 'assumed', b.id)
  }
})

test('the Main Building is drawn at the height OpenStreetMap gives it: 46 m', () => {
  const p = place('main-building')
  const b = map.scenery.buildings[p.building!]
  assert.equal(b.h, 46)
  assert.equal(b.hf, 'osm')
  assert.ok(polygonArea(b.o) > 50000, 'the museum is over five hectares')
})

test('places that are buildings point at a building', () => {
  for (const id of ['main-building', 'khufu-boats-museum', 'conservation-centre', 'ticketing-entrance']) {
    const p = place(id)
    assert.ok(p.building !== undefined && map.scenery.buildings[p.building], `${id} has a building`)
  }
})

// Size --------------------------------------------------------------------------------------------

test('the data stays small enough to ship with the page', () => {
  assert.ok(statSync(FILE).size < 450 * 1024, `${statSync(FILE).size} bytes`)
})
