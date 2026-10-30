import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placeLabels, type LabelInput } from '../src/museum-map/labels.ts'

const size = { w: 800, h: 600 }
const item = (id: string, x: number, y: number, over: Partial<LabelInput> = {}): LabelInput => ({ id, x, y, width: 100, priority: 1, ...over })

test('a lone marker puts its label on the side the language reads towards', () => {
  assert.deepEqual(placeLabels([item('a', 400, 300)], size, false).get('a'), { show: true, flip: false })
  assert.deepEqual(placeLabels([item('a', 400, 300)], size, true).get('a'), { show: true, flip: false })
})

test('near the edge the label goes to the other side of its marker', () => {
  assert.deepEqual(placeLabels([item('a', 740, 300, { width: 150 })], size, false).get('a'), { show: true, flip: true })
  assert.deepEqual(placeLabels([item('a', 60, 300, { width: 150 })], size, true).get('a'), { show: true, flip: true })
})

test('a label that fits on neither side is not shown', () => {
  assert.equal(placeLabels([item('a', 400, 300, { width: 900 })], size, false).get('a')?.show, false)
})

test('of markers too close together, the more important keeps its label and the others make way', () => {
  const r = placeLabels([item('a', 400, 300, { priority: 1 }), item('b', 430, 300, { priority: 2 }), item('c', 460, 300, { priority: 3 })], size, false)
  assert.equal(r.get('a')?.show, true)
  assert.equal(r.get('c')?.show, true)
  assert.equal(r.get('b')?.show, false)
})

test('priority, not the order in the list, decides who keeps a label', () => {
  const r = placeLabels([item('b', 430, 300, { priority: 2 }), item('c', 460, 300, { priority: 3 }), item('a', 400, 300, { priority: 1 })], size, false)
  assert.equal(r.get('a')?.show, true)
  assert.equal(r.get('b')?.show, false)
})

test('a label never covers another marker', () => {
  // b sits just right of a: a's label must go left, not over b.
  const r = placeLabels([item('a', 400, 300, { priority: 1 }), item('b', 430, 300, { priority: 2 })], size, false)
  assert.deepEqual(r.get('a'), { show: true, flip: true })
})

test('two labels do not overlap each other', () => {
  const r = placeLabels([item('a', 400, 300), item('b', 400, 312, { priority: 2 })], size, false)
  assert.ok(!(r.get('a')?.show && r.get('b')?.show && r.get('a')?.flip === r.get('b')?.flip), 'same side and both shown would overlap')
})

test('a chosen marker always keeps its label, even where it must overlap', () => {
  const r = placeLabels(
    [item('a', 400, 300, { priority: 1 }), item('b', 430, 300, { priority: 2 }), item('c', 460, 300, { priority: 3, force: true })],
    size,
    false,
  )
  assert.equal(r.get('c')?.show, true)
})

test('a chosen marker with no clean side takes the side that stays on screen', () => {
  // a is at the right edge with a cluster of markers on its left: its label must overlap something,
  // but it should overlap them on the left, not run off the screen on the right.
  const r = placeLabels([item('a', 740, 300, { width: 150, priority: 0, force: true }), item('b', 700, 300, { priority: 2 }), item('c', 670, 300, { priority: 3 })], size, false)
  assert.deepEqual(r.get('a'), { show: true, flip: true })
})

test('markers far apart all keep their labels', () => {
  const r = placeLabels([item('a', 100, 100), item('b', 400, 300), item('c', 700, 500, { width: 60 })], size, false)
  for (const id of ['a', 'b', 'c']) assert.equal(r.get(id)?.show, true, id)
})

test('a marker off the screen has no label', () => {
  assert.equal(placeLabels([item('a', -100, 300)], size, false).get('a')?.show, false)
  assert.equal(placeLabels([item('a', 400, 900)], size, false).get('a')?.show, false)
})
