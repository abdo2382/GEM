import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildGraph, findRoute, KIND_COST, type Graph } from '../src/museum-map/astar.ts'
import type { GemMap, WayKind } from '../src/museum-map/types.ts'
import type { XY } from '../src/museum-map/geo.ts'

type Mini = Pick<GemMap, 'nodes' | 'ways'>
const mini = (nodes: XY[], ways: [WayKind, number[]][]): Mini => ({ nodes, ways: ways.map(([k, n]) => ({ k, n })) })
const near = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`)

// Basics -----------------------------------------------------------------------------

test('a route from a place to itself is just that place', () => {
  const g = buildGraph(mini([[0, 0], [10, 0]], [['path', [0, 1]]]))
  const r = findRoute(g, 0, 0)
  assert.deepEqual(r?.nodes, [0])
  assert.equal(r?.length, 0)
  assert.deepEqual(r?.legs, [])
})

test('a route along a line of paths is as long as the paths added up', () => {
  const g = buildGraph(mini([[0, 0], [30, 0], [30, 40]], [['path', [0, 1, 2]]]))
  const r = findRoute(g, 0, 2)
  assert.deepEqual(r?.nodes, [0, 1, 2])
  near(r!.length, 70)
  near(r!.cost, 70)
  assert.deepEqual(r?.legs.map((l) => [l.from, l.to, l.kind]), [[0, 1, 'path'], [1, 2, 'path']])
})

test('a route can be walked in either direction', () => {
  const g = buildGraph(mini([[0, 0], [30, 0], [30, 40]], [['path', [0, 1, 2]]]))
  assert.deepEqual(findRoute(g, 2, 0)?.nodes, [2, 1, 0])
})

test('with two ways between two places, the shorter one is taken', () => {
  // A long way round through node 2, and a short one through node 3.
  const g = buildGraph(mini([[0, 0], [100, 0], [50, 90], [50, 10]], [['path', [0, 2, 1]], ['path', [0, 3, 1]]]))
  assert.deepEqual(findRoute(g, 0, 1)?.nodes, [0, 3, 1])
})

test('places with no walkable connection have no route', () => {
  const g = buildGraph(mini([[0, 0], [10, 0], [50, 50], [60, 50]], [['path', [0, 1]], ['path', [2, 3]]]))
  assert.equal(findRoute(g, 0, 3), null)
})

// Kinds of way ------------------------------------------------------------------------

test('every kind of way costs at least its length, so the straight-line guess never overestimates', () => {
  for (const kind of Object.keys(KIND_COST) as WayKind[]) assert.ok(KIND_COST[kind] >= 1, kind)
})

test('a footpath is preferred to a slightly shorter service road', () => {
  // Path: 0 -> 1 straight, 100 m. Road: 0 -> 2 -> 1 around a small bend, about 82 m but costs more.
  const g = buildGraph(mini([[0, 0], [100, 0], [50, 8]], [['path', [0, 1]], ['road', [0, 2, 1]]]))
  const r = findRoute(g, 0, 1)
  assert.deepEqual(r?.nodes, [0, 1])
})

test('a service road is used when it saves a lot of walking', () => {
  const g = buildGraph(mini([[0, 0], [100, 0], [50, 100]], [['path', [0, 2, 1]], ['road', [0, 1]]]))
  assert.deepEqual(findRoute(g, 0, 1)?.nodes, [0, 1])
})

test('step-free routes avoid steps, even when that means a long way round', () => {
  const g = buildGraph(mini([[0, 0], [100, 0], [50, 300]], [['steps', [0, 1]], ['path', [0, 2, 1]]]))
  assert.deepEqual(findRoute(g, 0, 1)?.nodes, [0, 1], 'steps are fine by default')
  const r = findRoute(g, 0, 1, { stepFree: true })
  assert.deepEqual(r?.nodes, [0, 2, 1])
  assert.ok(r!.legs.every((l) => l.kind !== 'steps'))
})

test('when steps are the only way, a step-free route does not exist', () => {
  const g = buildGraph(mini([[0, 0], [10, 0]], [['steps', [0, 1]]]))
  assert.equal(findRoute(g, 0, 1, { stepFree: true }), null)
  assert.ok(findRoute(g, 0, 1))
})

test('the route reports how many steps it climbs or descends', () => {
  const g = buildGraph(mini([[0, 0], [10, 0], [20, 0]], [['path', [0, 1]], ['steps', [1, 2]]]))
  const r = findRoute(g, 0, 2)!
  assert.equal(r.legs.filter((l) => l.kind === 'steps').length, 1)
  near(r.cost, 10 + 10 * KIND_COST.steps)
  near(r.length, 20)
})

// Optimal against a plain Dijkstra on many random networks -------------------------------

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function dijkstra(g: Graph, from: number, to: number, stepFree: boolean): number {
  const best = new Array<number>(g.count).fill(Infinity)
  const done = new Array<boolean>(g.count).fill(false)
  best[from] = 0
  for (;;) {
    let u = -1
    for (let i = 0; i < g.count; i++) if (!done[i] && best[i] < Infinity && (u < 0 || best[i] < best[u])) u = i
    if (u < 0) return Infinity
    if (u === to) return best[u]
    done[u] = true
    for (const e of g.adj[u]) {
      if (stepFree && e.kind === 'steps') continue
      best[e.to] = Math.min(best[e.to], best[u] + e.len * KIND_COST[e.kind])
    }
  }
}

test('A* finds the cheapest route, the same as Dijkstra, on 40 random networks', () => {
  const kinds: WayKind[] = ['path', 'path', 'road', 'steps', 'link']
  let checked = 0
  for (let seed = 1; seed <= 40; seed++) {
    const rnd = mulberry32(seed)
    const n = 45
    const nodes: XY[] = Array.from({ length: n }, () => [Math.round(rnd() * 1000), Math.round(rnd() * 1000)])
    const ways: [WayKind, number[]][] = []
    for (let i = 0; i < n; i++) {
      // Join each node to its three nearest neighbours.
      const nearest = nodes.map((p, j) => [j, Math.hypot(p[0] - nodes[i][0], p[1] - nodes[i][1])] as const).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 3)
      for (const [j] of nearest) ways.push([kinds[Math.floor(rnd() * kinds.length)], [i, j]])
    }
    const g = buildGraph(mini(nodes, ways))
    for (let q = 0; q < 12; q++) {
      const a = Math.floor(rnd() * n)
      const b = Math.floor(rnd() * n)
      for (const stepFree of [false, true]) {
        const expected = dijkstra(g, a, b, stepFree)
        const got = findRoute(g, a, b, { stepFree })
        if (expected === Infinity) assert.equal(got, null, `seed ${seed}: ${a}->${b} should have no route`)
        else {
          assert.ok(got, `seed ${seed}: ${a}->${b} should have a route`)
          near(got.cost, expected, 1e-6)
          assert.equal(got.nodes[0], a)
          assert.equal(got.nodes.at(-1), b)
        }
        checked++
      }
    }
  }
  assert.ok(checked >= 900)
})

test('A* looks at fewer places than there are, when the goal is straight ahead', () => {
  // A 40 x 40 grid of paths: a route along the top row should not search the whole grid.
  const size = 40
  const nodes: XY[] = []
  const ways: [WayKind, number[]][] = []
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) nodes.push([x * 10, y * 10])
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (x + 1 < size) ways.push(['path', [y * size + x, y * size + x + 1]])
    if (y + 1 < size) ways.push(['path', [y * size + x, (y + 1) * size + x]])
  }
  const g = buildGraph(mini(nodes, ways))
  const r = findRoute(g, 0, size - 1)!
  near(r.length, 390)
  assert.ok(r.visited < g.count / 4, `${r.visited} of ${g.count} places searched`)
})

// The real map --------------------------------------------------------------------------------

const map = JSON.parse(readFileSync(fileURLToPath(new URL('../src/museum-map/data/gem-complex.json', import.meta.url)), 'utf8')) as GemMap
const place = (id: string) => map.places.find((p) => p.id === id)!

test('the walk from the entrance to the Main Building is a real walk, a little longer than as the crow flies', () => {
  const g = buildGraph(map)
  const a = place('ticketing-entrance')
  const b = place('main-entrance')
  const r = findRoute(g, a.node, b.node)!
  const crow = Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1])
  assert.ok(r.length >= crow, 'never shorter than a straight line')
  assert.ok(r.length < crow * 2.5, `${r.length.toFixed(0)} m is not absurdly long for ${crow.toFixed(0)} m as the crow flies`)
})

test('every place can be reached from every other, and the walk is the same both ways', () => {
  const g = buildGraph(map)
  for (const a of map.places) {
    for (const b of map.places) {
      const ab = findRoute(g, a.node, b.node)
      const ba = findRoute(g, b.node, a.node)
      assert.ok(ab && ba, `${a.id} <-> ${b.id}`)
      near(ab.cost, ba.cost, 1e-6)
    }
  }
})

test('the Hanging Obelisk is reached from its square, not from inside its stepped platform', () => {
  const g = buildGraph(map)
  const r = findRoute(g, place('ticketing-entrance').node, place('hanging-obelisk').node, { stepFree: true })
  assert.ok(r, 'a step-free walk to the obelisk exists')
  assert.ok(r.length < 500)
})

test('a step-free walk is never shorter than the walk that may use steps', () => {
  const g = buildGraph(map)
  for (const a of map.places) {
    for (const b of map.places) {
      const free = findRoute(g, a.node, b.node, { stepFree: true })
      if (!free) continue
      assert.ok(free.cost >= findRoute(g, a.node, b.node)!.cost - 1e-6, `${a.id} -> ${b.id}`)
    }
  }
})

test('on the real map, every way is at least as long as the straight line between its ends', () => {
  const g = buildGraph(map)
  for (let u = 0; u < g.count; u++) {
    for (const e of g.adj[u]) {
      const crow = Math.hypot(g.pos[u][0] - g.pos[e.to][0], g.pos[u][1] - g.pos[e.to][1])
      assert.ok(e.len >= crow - 1e-9, `edge ${u}-${e.to}`)
    }
  }
})
