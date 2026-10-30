import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extrude, flat, lineSegments, mergeAll, polylinePath, toWorld } from '../src/museum-map/scene3d.ts'
import { polygonArea, type XY } from '../src/museum-map/geo.ts'

const near = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`)
const box = (g: { boundingBox: unknown; computeBoundingBox: () => void }) => {
  g.computeBoundingBox()
  return g.boundingBox as { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }
}
const rect: XY[] = [[10, 20], [60, 20], [60, 50], [10, 50]]

test('a point on the map goes to the ground: east is x, south is z, height is y', () => {
  const v = toWorld([12, -30], 5)
  assert.deepEqual([v.x, v.y, v.z], [12, 5, -30])
})

test('a building rises from the ground to its height, standing where its outline is', () => {
  const b = box(extrude(rect, 46))
  near(b.min.y, 0)
  near(b.max.y, 46)
  near(b.min.x, 10)
  near(b.max.x, 60)
  near(b.min.z, 20)
  near(b.max.z, 50)
})

test('a building is the same whichever way its outline is wound', () => {
  const a = box(extrude(rect, 10))
  const b = box(extrude([...rect].reverse(), 10))
  near(a.max.y, b.max.y)
  near(a.min.z, b.min.z)
  near(a.max.z, b.max.z)
})

test('a flat area lies at one height and covers the area of its outline', () => {
  const g = flat(rect, 0.3)
  const b = box(g)
  near(b.min.y, 0.3)
  near(b.max.y, 0.3)
  // Add up the triangles seen from above.
  const p = g.getAttribute('position')
  const idx = g.getIndex()
  let area = 0
  const tri = (i: number, j: number, k: number) => {
    const [ax, az] = [p.getX(i), p.getZ(i)]
    const [bx, bz] = [p.getX(j), p.getZ(j)]
    const [cx, cz] = [p.getX(k), p.getZ(k)]
    area += Math.abs((bx - ax) * (cz - az) - (cx - ax) * (bz - az)) / 2
  }
  if (idx) for (let i = 0; i < idx.count; i += 3) tri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2))
  else for (let i = 0; i < p.count; i += 3) tri(i, i + 1, i + 2)
  near(area, polygonArea(rect), 1e-4)
})

test('an L-shaped area is filled without covering its notch', () => {
  const l: XY[] = [[0, 0], [40, 0], [40, 10], [10, 10], [10, 40], [0, 40]]
  const g = flat(l)
  const p = g.getAttribute('position')
  const idx = g.getIndex()!
  let area = 0
  for (let i = 0; i < idx.count; i += 3) {
    const [a, b, c] = [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)]
    area += Math.abs((p.getX(b) - p.getX(a)) * (p.getZ(c) - p.getZ(a)) - (p.getX(c) - p.getX(a)) * (p.getZ(b) - p.getZ(a))) / 2
  }
  near(area, polygonArea(l), 1e-4)
})

test('many shapes can be merged into one, which keeps all their vertices', () => {
  const a = extrude(rect, 5)
  const b = extrude([[100, 100], [120, 100], [120, 130]], 8)
  const total = a.getAttribute('position').count + b.getAttribute('position').count
  const merged = mergeAll([a, b])!
  assert.equal(merged.getAttribute('position').count, total)
  assert.equal(mergeAll([]), null)
})

test('lines become pairs of points for drawing segments', () => {
  const g = lineSegments([[[0, 0], [10, 0], [10, 10]], [[50, 50], [60, 50]]], 1)
  // 2 segments in the first line, 1 in the second: 3 segments, 6 points.
  assert.equal(g.getAttribute('position').count, 6)
  const b = box(g)
  near(b.min.y, 1)
  near(b.max.y, 1)
  near(b.max.x, 60)
})

test('a walk is a path as long as the walk, at the height asked for', () => {
  const path = polylinePath([[0, 0], [30, 0], [30, 40]], 2)
  near(path.getLength(), 70, 1e-6)
  const start = path.getPointAt(0)
  near(start.y, 2)
  near(start.x, 0)
  const end = path.getPointAt(1)
  near(end.x, 30)
  near(end.z, 40)
})
