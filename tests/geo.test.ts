import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  bearing,
  dist,
  nearestOnSegment,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  polylineLength,
  simplify,
  toGeo,
  toLocal,
  type XY,
} from '../src/museum-map/geo.ts'

const ORIGIN = { lat: 29.9945706, lon: 31.1192355 }
const near = (a: number, b: number, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`)

// Projection -----------------------------------------------------------------------

test('the origin is the point (0, 0)', () => {
  const [x, y] = toLocal(ORIGIN, ORIGIN.lat, ORIGIN.lon)
  near(x, 0)
  near(y, 0)
})

test('north is up the screen: a point north of the origin has a negative y', () => {
  const [x, y] = toLocal(ORIGIN, ORIGIN.lat + 0.001, ORIGIN.lon)
  near(x, 0)
  near(y, -111.2, 0.2)
})

test('east is to the right, and a degree of longitude is shorter than a degree of latitude at 30°N', () => {
  const [x, y] = toLocal(ORIGIN, ORIGIN.lat, ORIGIN.lon + 0.001)
  near(x, 96.3, 0.3)
  near(y, 0)
})

test('projecting and projecting back returns the same place', () => {
  const [x, y] = toLocal(ORIGIN, 29.9961, 31.1204)
  const back = toGeo(ORIGIN, x, y)
  near(back.lat, 29.9961, 1e-9)
  near(back.lon, 31.1204, 1e-9)
})

// Lengths and shapes ---------------------------------------------------------------

test('dist is straight-line distance', () => {
  near(dist([0, 0], [3, 4]), 5, 1e-9)
})

test('a path is as long as its segments added up', () => {
  near(polylineLength([[0, 0], [3, 4], [3, 10]]), 11, 1e-9)
  assert.equal(polylineLength([[1, 1]]), 0)
  assert.equal(polylineLength([]), 0)
})

test('the area of a polygon does not depend on which way round it is drawn', () => {
  const square: XY[] = [[0, 0], [10, 0], [10, 10], [0, 10]]
  near(polygonArea(square), 100, 1e-9)
  near(polygonArea([...square].reverse()), 100, 1e-9)
})

test('the centroid of a rectangle is its middle', () => {
  const [x, y] = polygonCentroid([[0, 0], [20, 0], [20, 10], [0, 10]])
  near(x, 10, 1e-9)
  near(y, 5, 1e-9)
})

test('a point is inside a polygon, outside it, or not', () => {
  const tri: XY[] = [[0, 0], [10, 0], [0, 10]]
  assert.equal(pointInPolygon([2, 2], tri), true)
  assert.equal(pointInPolygon([9, 9], tri), false)
  assert.equal(pointInPolygon([-1, 5], tri), false)
})

// Simplifying ------------------------------------------------------------------------

test('simplify drops points on a straight line and keeps the ends', () => {
  const line: XY[] = [[0, 0], [5, 0], [10, 0], [15, 0]]
  assert.deepEqual(simplify(line, 0.5), [[0, 0], [15, 0]])
})

test('simplify keeps a bend bigger than the tolerance', () => {
  const bent: XY[] = [[0, 0], [5, 3], [10, 0]]
  assert.deepEqual(simplify(bent, 1), bent)
  assert.deepEqual(simplify(bent, 5), [[0, 0], [10, 0]])
})

test('simplify never changes how a short list of points looks', () => {
  assert.deepEqual(simplify([[0, 0], [1, 1]], 10), [[0, 0], [1, 1]])
  assert.deepEqual(simplify([[2, 2]], 10), [[2, 2]])
})

// Nearest point on a segment -----------------------------------------------------------

test('the nearest point on a segment can fall in the middle of it', () => {
  const r = nearestOnSegment([5, 3], [0, 0], [10, 0])
  assert.deepEqual(r.point, [5, 0])
  near(r.dist, 3, 1e-9)
  near(r.t, 0.5, 1e-9)
})

test('the nearest point on a segment is clamped to its ends', () => {
  const r = nearestOnSegment([-4, 3], [0, 0], [10, 0])
  assert.deepEqual(r.point, [0, 0])
  near(r.dist, 5, 1e-9)
  assert.equal(r.t, 0)
  assert.equal(nearestOnSegment([14, 0], [0, 0], [10, 0]).t, 1)
})

test('a zero-length segment is just a point', () => {
  const r = nearestOnSegment([3, 4], [0, 0], [0, 0])
  near(r.dist, 5, 1e-9)
})

// Bearings -------------------------------------------------------------------------------

test('bearings are degrees clockwise from north, with north up the screen', () => {
  near(bearing([0, 0], [0, -10]), 0, 1e-9)
  near(bearing([0, 0], [10, 0]), 90, 1e-9)
  near(bearing([0, 0], [0, 10]), 180, 1e-9)
  near(bearing([0, 0], [-10, 0]), 270, 1e-9)
  near(bearing([0, 0], [10, -10]), 45, 1e-9)
})
