import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rigTarget } from '../src/three/rigPlan.ts'

// Chapters: 0 awakening, 1 discovery, 2 treasures, 3 inside the tomb, 4 legacy.
const at = (portrait: boolean, chapter: number, opts: { intro?: number; inspect?: number; side?: 1 | -1 } = {}) =>
  rigTarget(portrait, chapter, chapter, 0, opts.intro ?? 1, opts.inspect ?? 0, opts.side ?? 1)

test('discovery places the mask upper right on a phone', () => {
  const g = at(true, 1)
  assert.ok(g.x > 0.05, `x=${g.x}`)
  assert.ok(g.y >= 0, `y=${g.y}`)
})

test('treasures places the mask upper left on a phone', () => {
  const g = at(true, 2)
  assert.ok(g.x < -0.05, `x=${g.x}`)
})

test('inside the tomb moves the mask lower right', () => {
  const g = at(true, 3)
  assert.ok(g.x > 0.05 && g.y < 0, `x=${g.x} y=${g.y}`)
})

test('the legacy brings the mask back to the centre, larger', () => {
  const g = at(false, 4)
  assert.equal(g.x, 0)
  assert.ok(g.scale > 1)
})

test('right-to-left layouts mirror the horizontal offset', () => {
  assert.equal(at(true, 1, { side: -1 }).x, -at(true, 1).x)
})

test('opening Inspect hands the frame back: no offset, natural scale', () => {
  assert.deepEqual(at(true, 3, { inspect: 1 }), { x: 0, y: 0, scale: 1 })
})

test('travel between chapters blends the two compositions', () => {
  const mid = rigTarget(true, 1, 2, 0.5, 1, 0, 1)
  assert.ok(Math.abs(mid.x - (at(true, 1).x + at(true, 2).x) / 2) < 1e-9)
})

test('before the reveal finishes, the awakening starts further up and to the left', () => {
  const early = at(true, 0, { intro: 0 })
  const settled = at(true, 0)
  assert.ok(early.x < settled.x && early.y > settled.y)
})

test('desktop compositions move less than phone ones, clear of the side panels', () => {
  for (const c of [0, 1, 2, 3]) assert.ok(Math.abs(at(false, c).x) < Math.abs(at(true, c).x))
})
