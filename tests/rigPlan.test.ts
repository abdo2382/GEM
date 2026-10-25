import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rigTarget, phoneTreasure, PHONE_BANDS, fitOpening, OPENING_NATURAL } from '../src/three/rigPlan.ts'

// Chapters: 0 awakening, 1 discovery, 2 treasures, 3 inside the tomb, 4 legacy.
const at = (portrait: boolean, chapter: number, opts: { intro?: number; inspect?: number; side?: 1 | -1 } = {}) =>
  rigTarget(portrait, chapter, chapter, 0, opts.intro ?? 1, opts.inspect ?? 0, opts.side ?? 1)

// Phones ------------------------------------------------------------------------

test('on a phone the mask opens in the centre of the screen', () => {
  assert.equal(at(true, 0).x, 0)
})

test('on a phone the mask stays near the centre in every chapter (offsets only counter its own turn)', () => {
  for (const c of [0, 1, 2, 3, 4]) assert.ok(Math.abs(at(true, c).x) <= 0.07, `chapter ${c}: x=${at(true, c).x}`)
})

test('on a phone the treasure chapters lift the mask and make it a little smaller', () => {
  for (const c of [1, 2, 3]) {
    const g = at(true, c)
    assert.ok(g.y > 0, `chapter ${c}: y=${g.y}`)
    assert.ok(g.scale < 1, `chapter ${c}: scale=${g.scale}`)
  }
})

test('on a phone the turn correction is not mirrored right to left, because the turn is not', () => {
  assert.equal(at(true, 2, { side: -1 }).x, at(true, 2).x)
})

// A unit-tall treasure, in fractions of the screen from the top.
function treasureBand(aspect: number) {
  const halfH = 1.7
  const halfW = halfH * aspect
  const { y, scale } = phoneTreasure(halfW, halfH)
  const centre = 0.5 - y / (2 * halfH)
  const height = scale / (2 * halfH)
  return { top: centre - height / 2, bottom: centre + height / 2, height, width: scale / (2 * halfW) }
}

test('on a phone the treasure sits between the mask and the story sheet', () => {
  for (const aspect of [0.45, 0.5, 0.56, 0.75]) {
    const b = treasureBand(aspect)
    assert.ok(b.top >= PHONE_BANDS.treasureTop, `aspect ${aspect}: top ${b.top}`)
    assert.ok(b.bottom <= PHONE_BANDS.sheetTop - 0.02, `aspect ${aspect}: bottom ${b.bottom}`)
    assert.ok(b.width <= 0.86, `aspect ${aspect}: width ${b.width}`)
  }
})

test('on a phone the treasure stays large: at least a fifth of the screen height', () => {
  for (const aspect of [0.45, 0.5, 0.56, 0.75]) assert.ok(treasureBand(aspect).height >= 0.2, `aspect ${aspect}`)
})

test('on a phone a long, low treasure grows to fill the band, within the width', () => {
  // The Anubis shrine: about half as tall as it is long, its sweep about 1.06 long.
  for (const aspect of [0.45, 0.5, 0.56, 0.75]) {
    const halfH = 1.7
    const halfW = halfH * aspect
    const { y, scale } = phoneTreasure(halfW, halfH, { h: 0.55, w: 1.06 })
    const height = (scale * 0.55) / (2 * halfH)
    const centre = 0.5 - y / (2 * halfH)
    assert.ok(height >= 0.17, `aspect ${aspect}: height ${height}`)
    assert.ok(centre + height / 2 <= PHONE_BANDS.sheetTop - 0.02, `aspect ${aspect}: bottom`)
    assert.ok((scale * 1.06) / (2 * halfW) <= 0.86, `aspect ${aspect}: width`)
  }
})

// Wide screens -------------------------------------------------------------------

test('wide-screen compositions are unchanged', () => {
  assert.deepEqual(at(false, 1), { x: 0.045, y: 0.03, scale: 1 })
  assert.deepEqual(at(false, 2), { x: 0, y: 0.03, scale: 0.95 })
  assert.deepEqual(at(false, 3), { x: 0.04, y: -0.04, scale: 1 })
})

test('the legacy brings the mask back to the centre, larger', () => {
  const g = at(false, 4)
  assert.equal(g.x, 0)
  assert.ok(g.scale > 1)
})

test('right-to-left wide layouts mirror the horizontal offset', () => {
  assert.equal(at(false, 1, { side: -1 }).x, -at(false, 1).x)
})

// Both ----------------------------------------------------------------------------

test('opening Inspect hands the frame back: no offset, natural scale', () => {
  assert.deepEqual(at(true, 3, { inspect: 1 }), { x: 0, y: 0, scale: 1 })
})

test('travel between chapters blends the two compositions', () => {
  const mid = rigTarget(true, 1, 2, 0.5, 1, 0, 1)
  assert.ok(Math.abs(mid.x - (at(true, 1).x + at(true, 2).x) / 2) < 1e-9)
  assert.ok(Math.abs(mid.y - (at(true, 1).y + at(true, 2).y) / 2) < 1e-9)
  assert.ok(Math.abs(mid.scale - (at(true, 1).scale + at(true, 2).scale) / 2) < 1e-9)
})

test('before the reveal finishes, the awakening starts further up and to the left', () => {
  const early = at(true, 0, { intro: 0 })
  const settled = at(true, 0)
  assert.ok(early.x < settled.x && early.y > settled.y)
})

// Wide screens' opening ---------------------------------------------------------------

/** Where the fitted mask lands, in fractions of the screen height from the top. */
function openingBox(band: { top: number; bottom: number }) {
  const { y, scale } = fitOpening(band)
  const n = OPENING_NATURAL
  const centre = 0.5 - ((0.5 - (n.top + n.bottom) / 2) * scale + y)
  const height = (n.bottom - n.top) * scale
  return { top: centre - height / 2, bottom: centre + height / 2, scale }
}

test('the opening mask fits between the title and the scroll hint', () => {
  for (const band of [{ top: 0.2165, bottom: 0.818 }, { top: 0.208, bottom: 0.838 }, { top: 0.255, bottom: 0.774 }]) {
    const b = openingBox(band)
    assert.ok(b.top >= band.top - 1e-9, `top ${b.top} vs ${band.top}`)
    assert.ok(b.bottom <= band.bottom + 1e-9, `bottom ${b.bottom} vs ${band.bottom}`)
  }
})

test('the opening mask is never enlarged, and never shrunk below 72%', () => {
  assert.ok(fitOpening({ top: 0.05, bottom: 0.98 }).scale <= 1)
  assert.ok(fitOpening({ top: 0.4, bottom: 0.6 }).scale >= 0.72)
})

test('the wide opening is centred across the screen', () => {
  const opening = fitOpening({ top: 0.21, bottom: 0.82 })
  const g = rigTarget(false, 0, 0, 0, 1, 0, 1, opening)
  assert.equal(g.x, 0)
})
