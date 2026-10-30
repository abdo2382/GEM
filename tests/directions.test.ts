import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildGraph, findRoute } from '../src/museum-map/astar.ts'
import { compass, describeRoute, walkMinutes, WALK_SPEED, type Step } from '../src/museum-map/directions.ts'
import type { WayKind } from '../src/museum-map/types.ts'
import type { XY } from '../src/museum-map/geo.ts'

/** A single chain of ways through the points, and the route along it. */
function walkAlong(points: XY[], kinds: WayKind[] = []) {
  const ways = points.slice(1).map((_, i) => ({ k: kinds[i] ?? ('path' as WayKind), n: [i, i + 1] }))
  const g = buildGraph({ nodes: points, ways })
  const route = findRoute(g, 0, points.length - 1)!
  assert.ok(route)
  return { g, route }
}
const near = (a: number, b: number, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`)
const steps = (points: XY[], kinds: WayKind[] = [], landmarks: { id: string; at: XY }[] = []): Step[] => {
  const { g, route } = walkAlong(points, kinds)
  return describeRoute(g, route, landmarks)
}

// Compass ---------------------------------------------------------------------------------

test('a bearing is named by the nearest of the eight compass points', () => {
  const expected = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  expected.forEach((name, i) => assert.equal(compass(i * 45), name))
  assert.equal(compass(359), 'N')
  assert.equal(compass(22.4), 'N')
  assert.equal(compass(22.6), 'NE')
  assert.equal(compass(-45), 'NW')
})

// Steps -------------------------------------------------------------------------------------

test('a straight walk is one step, as long as the walk, heading the way it goes', () => {
  const s = steps([[0, 0], [0, -50], [0, -100]])
  assert.equal(s.length, 1)
  assert.equal(s[0].type, 'walk')
  assert.equal(s[0].heading, 'N')
  near(s[0].distance, 100)
  assert.equal(s[0].turn, undefined)
  assert.equal(s[0].from, 0)
})

test('a right-angle turn to the right starts a new step that says so', () => {
  const s = steps([[0, 0], [100, 0], [100, 100]])
  assert.equal(s.length, 2)
  assert.deepEqual(s.map((x) => x.heading), ['E', 'S'])
  assert.equal(s[1].turn, 'right')
  near(s[0].distance, 100)
  near(s[1].distance, 100)
  assert.equal(s[1].from, 1)
})

test('and a turn to the left says left', () => {
  const s = steps([[0, 0], [100, 0], [100, -100]])
  assert.equal(s[1].turn, 'left')
  assert.equal(s[1].heading, 'N')
})

test('turns are slight, plain or sharp by how far they bend', () => {
  // Heading east, then 55° right (slight), 90° right (plain), 140° right (sharp).
  const turn = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return steps([[0, 0], [100, 0], [100 + 100 * Math.cos(rad), 100 * Math.sin(rad)]])[1]?.turn
  }
  assert.equal(turn(55), 'slight-right')
  assert.equal(turn(90), 'right')
  assert.equal(turn(140), 'sharp-right')
})

test('a gentle bend of under 40° does not start a new step', () => {
  const s = steps([[0, 0], [100, 0], [200, -36]])
  assert.equal(s.length, 1)
})

test('a path that wiggles a few metres either side is still one straight step', () => {
  const pts: XY[] = []
  for (let i = 0; i <= 20; i++) pts.push([i * 5, i % 2 ? 3 : -3])
  assert.equal(steps(pts).length, 1)
})

test('a curve is one turn, not a turn at every corner of it', () => {
  // A quarter circle of radius 40 m, east then curving south, in 10 short segments.
  const pts: XY[] = [[-100, 0], [0, 0]]
  for (let i = 1; i <= 10; i++) {
    const a = ((i * 9) * Math.PI) / 180
    pts.push([40 * Math.sin(a), 40 - 40 * Math.cos(a)])
  }
  pts.push([40, 140])
  const s = steps(pts)
  assert.equal(s.filter((x) => x.turn).length, 1)
})

test('steps are their own kind of step, and walking resumes after them', () => {
  const s = steps([[0, 0], [50, 0], [60, 0], [110, 0]], ['path', 'steps', 'path'])
  assert.deepEqual(s.map((x) => x.type), ['walk', 'steps', 'walk'])
  near(s[1].distance, 10)
  assert.equal(s[1].turn, undefined)
})

test('a step or two, under 4 m, is not announced as steps', () => {
  const s = steps([[0, 0], [50, 0], [52, 0], [100, 0]], ['path', 'steps', 'path'])
  assert.equal(s.length, 1)
  assert.equal(s[0].type, 'walk')
})

test('a walk that is only a short flight of steps is simply a walk', () => {
  const s = steps([[0, 0], [3, 0]], ['steps'])
  assert.deepEqual(s.map((x) => x.type), ['walk'])
})

test('the distances of the steps add up to the walk', () => {
  const { g, route } = walkAlong([[0, 0], [100, 0], [100, 100], [30, 100], [30, 40]])
  const s = describeRoute(g, route, [])
  near(s.reduce((sum, x) => sum + x.distance, 0), route.length)
})

test('a walk from a place to itself has no steps', () => {
  const g = buildGraph({ nodes: [[0, 0], [10, 0]], ways: [{ k: 'path', n: [0, 1] }] })
  assert.deepEqual(describeRoute(g, findRoute(g, 0, 0)!, []), [])
})

// Passing places ------------------------------------------------------------------------------

test('a place close to the walk is passed, on the side it lies', () => {
  const s = steps([[0, 0], [100, 0], [200, 0]], [], [
    { id: 'south', at: [50, 15] },
    { id: 'north', at: [150, -12] },
  ])
  assert.deepEqual(s[0].passes.map((p) => [p.id, p.side]), [['south', 'right'], ['north', 'left']])
})

test('a place far from the walk is not mentioned', () => {
  const s = steps([[0, 0], [100, 0]], [], [{ id: 'far', at: [50, 60] }])
  assert.deepEqual(s[0].passes, [])
})

test('a passed place is listed in the step it is passed in', () => {
  const s = steps([[0, 0], [100, 0], [100, 100]], [], [{ id: 'later', at: [115, 60] }])
  assert.deepEqual(s[0].passes, [])
  assert.deepEqual(s[1].passes.map((p) => p.id), ['later'])
})

// Time -----------------------------------------------------------------------------------------

test('walking time uses an easy pace and rounds up to whole minutes', () => {
  const at = (m: number) => walkMinutes(walkAlong([[0, 0], [m, 0]]).route)
  assert.equal(at(0.001), 1)
  assert.equal(at(WALK_SPEED * 60), 1)
  assert.equal(at(WALK_SPEED * 60 * 10), 10)
  assert.equal(at(WALK_SPEED * 60 * 10 + 1), 11)
})

test('steps slow the walk down', () => {
  const flat = walkMinutes(walkAlong([[0, 0], [300, 0]]).route)
  const stairs = walkMinutes(walkAlong([[0, 0], [300, 0]], ['steps']).route)
  assert.ok(stairs > flat)
})

test('no walk takes no time', () => {
  const g = buildGraph({ nodes: [[0, 0]], ways: [] })
  assert.equal(walkMinutes(findRoute(g, 0, 0)!), 0)
})
