import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextBar, BAR } from '../src/ui/barVisibility.ts'

// Feed a run of scroll positions through the rule, as the frame ticker would, starting
// with the bar shown where the visitor already is.
const run = (ys: number[], pinned = false) => ys.reduce((s, y) => nextBar(s, y, pinned), { hidden: false, anchor: ys[0] })

test('stays visible near the top of the page', () => {
  assert.equal(run([0, 30, BAR.top - 1]).hidden, false)
})

test('hides once the visitor has scrolled down past the threshold', () => {
  assert.equal(run([200, 200 + BAR.hideAfter + 1]).hidden, true)
})

test('ignores small downward jitters', () => {
  assert.equal(run([200, 200 + BAR.hideAfter - 10]).hidden, false)
})

test('stays hidden while the visitor keeps scrolling down', () => {
  assert.equal(run([200, 400, 800, 1600]).hidden, true)
})

test('comes back after a short scroll up, measured from the lowest point', () => {
  const s = run([200, 400, 800, 800 - BAR.showAfter - 1])
  assert.equal(s.hidden, false)
})

test('a tiny scroll up does not bring it back', () => {
  assert.equal(run([200, 400, 800, 800 - BAR.showAfter + 5]).hidden, true)
})

test('returns at the top even straight after hiding', () => {
  assert.equal(run([200, 600, 20]).hidden, false)
})

test('never hides while pinned (menu open or focus inside the bar)', () => {
  assert.equal(run([200, 600, 1200], true).hidden, false)
})

test('a shown bar measures the next hide from where the visitor turned', () => {
  // Down, then up a little (shown, anchor moves up), then down less than the threshold.
  const s = run([200, 230, 180, 180 + BAR.hideAfter - 5])
  assert.equal(s.hidden, false)
})
