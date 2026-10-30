import { test } from 'node:test'
import assert from 'node:assert/strict'
import { boundsOf, clampView, fitView, panBy, toScreen, toWorld, viewBox, zoomAt, type Bounds, type Size, type View } from '../src/museum-map/camera.ts'

const size: Size = { w: 800, h: 600 }
const near = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`)

test('the centre of the view is the centre of the screen', () => {
  const v: View = { cx: 120, cy: -40, k: 2 }
  assert.deepEqual(toScreen(v, size, 120, -40), [400, 300])
})

test('a place 10 m east is 10 × zoom pixels to the right', () => {
  const v: View = { cx: 0, cy: 0, k: 3 }
  assert.deepEqual(toScreen(v, size, 10, 0), [430, 300])
  assert.deepEqual(toScreen(v, size, 0, 10), [400, 330])
})

test('screen and world coordinates convert back and forth', () => {
  const v: View = { cx: 33.3, cy: -71.2, k: 1.7 }
  const [px, py] = toScreen(v, size, 250, 90)
  const [x, y] = toWorld(v, size, px, py)
  near(x, 250)
  near(y, 90)
})

test('zooming keeps the point under the finger where it is', () => {
  const v: View = { cx: 0, cy: 0, k: 1 }
  const anchor = [650, 120] as const
  const before = toWorld(v, size, anchor[0], anchor[1])
  const z = zoomAt(v, size, 2.5, anchor[0], anchor[1], 0.1, 50)
  near(z.k, 2.5)
  const after = toWorld(z, size, anchor[0], anchor[1])
  near(after[0], before[0])
  near(after[1], before[1])
})

test('zoom stays within its limits', () => {
  const v: View = { cx: 0, cy: 0, k: 1 }
  assert.equal(zoomAt(v, size, 100, 400, 300, 0.5, 8).k, 8)
  assert.equal(zoomAt(v, size, 0.001, 400, 300, 0.5, 8).k, 0.5)
})

test('dragging moves the world with the finger', () => {
  const v: View = { cx: 0, cy: 0, k: 2 }
  const p = panBy(v, 40, -20)
  // The finger moved right and up, so the view's centre moves left and down in the world.
  near(p.cx, -20)
  near(p.cy, 10)
})

test('fitting puts all of the bounds inside the screen, centred', () => {
  const b: Bounds = { minX: -500, minY: -300, maxX: 500, maxY: 300 }
  const v = fitView(b, size)
  const [x0, y0] = toScreen(v, size, b.minX, b.minY)
  const [x1, y1] = toScreen(v, size, b.maxX, b.maxY)
  assert.ok(x0 >= 0 && y0 >= 0 && x1 <= size.w && y1 <= size.h)
  near((x0 + x1) / 2, size.w / 2, 1e-6)
  near((y0 + y1) / 2, size.h / 2, 1e-6)
})

test('fitting leaves room for a panel over one side of the map', () => {
  const b: Bounds = { minX: -500, minY: -300, maxX: 500, maxY: 300 }
  const v = fitView(b, size, { top: 0, right: 0, bottom: 200, left: 0 })
  const [, y1] = toScreen(v, size, 0, b.maxY)
  assert.ok(y1 <= size.h - 200 + 1e-6, 'the bottom of the bounds clears the panel')
})

test('fitting a single point gives a usable zoom', () => {
  const v = fitView({ minX: 10, minY: 10, maxX: 10, maxY: 10 }, size)
  assert.ok(Number.isFinite(v.k) && v.k > 0)
})

test('a view cannot be dragged far from the map', () => {
  const b: Bounds = { minX: -500, minY: -500, maxX: 500, maxY: 500 }
  const far = clampView({ cx: 5000, cy: -5000, k: 1 }, size, b, 100)
  assert.equal(far.cx, 600)
  assert.equal(far.cy, -600)
  const ok = clampView({ cx: 10, cy: 20, k: 1 }, size, b, 100)
  assert.deepEqual([ok.cx, ok.cy], [10, 20])
})

test('the SVG view box shows exactly the part of the world on screen', () => {
  assert.equal(viewBox({ cx: 100, cy: 50, k: 2 }, size), '-100 -100 400 300')
})

test('the bounds of some points', () => {
  assert.deepEqual(boundsOf([[3, 4], [-2, 9], [7, -1]]), { minX: -2, minY: -1, maxX: 7, maxY: 9 })
})
