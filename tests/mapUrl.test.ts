import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapSearch, parseMapUrl } from '../src/museum-map/mapUrl.ts'

const ids = new Set(['ticketing-entrance', 'main-entrance', 'hanging-obelisk'])

test('a link with nothing in it asks for nothing', () => {
  assert.deepEqual(parseMapUrl('', ids), { from: null, to: null, stepFree: false, view: 'plan' })
})

test('a link can name where from, where to, step-free and the 3D view', () => {
  assert.deepEqual(parseMapUrl('?from=ticketing-entrance&to=hanging-obelisk&free=1&view=3d', ids), {
    from: 'ticketing-entrance',
    to: 'hanging-obelisk',
    stepFree: true,
    view: '3d',
  })
})

test('places that do not exist are ignored, not trusted', () => {
  const s = parseMapUrl('?from=nowhere&to=<script>', ids)
  assert.equal(s.from, null)
  assert.equal(s.to, null)
})

test('only 1 means step-free, and only 3d means 3D', () => {
  assert.equal(parseMapUrl('?free=0', ids).stepFree, false)
  assert.equal(parseMapUrl('?free=true', ids).stepFree, false)
  assert.equal(parseMapUrl('?view=wireframe', ids).view, 'plan')
})

test('the search string for a state leaves out what is not set', () => {
  assert.equal(mapSearch({ from: null, to: null, stepFree: false, view: 'plan' }, ''), '')
  assert.equal(mapSearch({ from: 'main-entrance', to: 'hanging-obelisk', stepFree: false, view: 'plan' }, ''), '?from=main-entrance&to=hanging-obelisk')
  assert.equal(mapSearch({ from: 'main-entrance', to: null, stepFree: true, view: '3d' }, ''), '?from=main-entrance&free=1&view=3d')
})

test('other parameters, like the language, are kept', () => {
  assert.equal(mapSearch({ from: 'main-entrance', to: null, stepFree: false, view: 'plan' }, '?lang=ar&perf'), '?lang=ar&perf=&from=main-entrance')
})

test('what is written can be read back', () => {
  const state = { from: 'ticketing-entrance', to: 'hanging-obelisk', stepFree: true, view: '3d' } as const
  assert.deepEqual(parseMapUrl(mapSearch(state, ''), ids), state)
})

test('writing a state replaces an older one rather than adding to it', () => {
  const next = mapSearch({ from: 'main-entrance', to: null, stepFree: false, view: 'plan' }, '?from=ticketing-entrance&to=hanging-obelisk&free=1&view=3d&lang=ar')
  assert.equal(next, '?lang=ar&from=main-entrance')
})
