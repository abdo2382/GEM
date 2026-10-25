import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GOVERNOR, PRESETS, createGovernor, initialTier, stepGovernor, type GovernorState } from '../src/quality/adaptiveQuality.ts'

// Starting estimate ---------------------------------------------------------------

test('a desktop with plenty of memory starts high', () => {
  assert.equal(initialTier({ touch: false, mobile: false, cores: 8, memory: 8 }), 'high')
})

test('phones start conservatively on medium, however many cores they report', () => {
  assert.equal(initialTier({ touch: true, mobile: true, cores: 8, memory: 8 }), 'medium')
})

test('weak phones start low', () => {
  assert.equal(initialTier({ touch: true, mobile: true, cores: 4, memory: 4 }), 'low')
  assert.equal(initialTier({ touch: true, mobile: true, cores: 8, memory: 2 }), 'low')
})

test('a data-saving visitor starts low', () => {
  assert.equal(initialTier({ touch: false, mobile: false, cores: 8, memory: 8, saveData: true }), 'low')
})

test('a desktop with little memory starts on medium', () => {
  assert.equal(initialTier({ touch: false, mobile: false, cores: 8, memory: 2 }), 'medium')
})

// The governor --------------------------------------------------------------------

/** Feed `seconds` of frames of `ms` each, starting at `t` (seconds); returns tier changes. */
function run(state: GovernorState, ms: number, seconds: number, t = 0) {
  const changes: string[] = []
  let now = t
  const end = t + seconds
  while (now < end) {
    now += ms / 1000
    const c = stepGovernor(state, ms, now)
    if (c) changes.push(c)
  }
  return { changes, now }
}

test('steps down one tier after sustained slow frames', () => {
  const s = createGovernor('high', 'high')
  const { changes } = run(s, 45, GOVERNOR.downAfter + 3)
  assert.deepEqual(changes, ['medium'])
})

test('a short burst of slow frames changes nothing', () => {
  const s = createGovernor('high', 'high')
  let r = run(s, 16, 4)
  r = run(s, 60, 0.6, r.now)
  r = run(s, 16, 4, r.now)
  assert.equal(s.tier, 'high')
})

test('single long hitches (a tab switch, a page load) are ignored', () => {
  const s = createGovernor('high', 'high')
  let r = run(s, 16, 4)
  for (let i = 0; i < 6; i++) {
    stepGovernor(s, 900, r.now + 0.9)
    r = run(s, 16, 1, r.now + 0.9)
  }
  assert.equal(s.tier, 'high')
})

test('waits out a cooldown before stepping down again', () => {
  const s = createGovernor('high', 'high')
  const r = run(s, 60, GOVERNOR.downAfter + 2)
  assert.equal(s.tier, 'medium')
  // Still slow, but inside the cooldown: no second drop yet.
  run(s, 60, GOVERNOR.cooldown - 1, r.now)
  assert.equal(s.tier, 'medium')
})

test('keeps stepping down while it stays slow, but never below low', () => {
  const s = createGovernor('high', 'high')
  run(s, 70, 120)
  assert.equal(s.tier, 'low')
})

test('steps up only after a long stretch of fast frames, one tier at a time', () => {
  const s = createGovernor('low', 'high')
  let r = run(s, 12, GOVERNOR.upAfter - 2)
  assert.equal(s.tier, 'low', 'not yet: needs a longer good stretch')
  r = run(s, 12, 5, r.now)
  assert.equal(s.tier, 'medium')
})

test('never climbs above its ceiling', () => {
  const s = createGovernor('medium', 'medium')
  run(s, 10, 120)
  assert.equal(s.tier, 'medium')
})

test('does not bounce straight back to a tier it just left', () => {
  const s = createGovernor('high', 'high')
  let r = run(s, 50, GOVERNOR.downAfter + 2)
  assert.equal(s.tier, 'medium')
  // Medium is fast, but high was too slow moments ago: stay put for a while.
  r = run(s, 12, GOVERNOR.upAfter + GOVERNOR.cooldown + 2, r.now)
  assert.equal(s.tier, 'medium')
})

test('after leaving a tier twice, it stops trying that tier for the visit', () => {
  const s = createGovernor('high', 'high')
  let r = { now: 0 }
  for (let round = 0; round < 2; round++) {
    r = run(s, 50, GOVERNOR.downAfter + GOVERNOR.cooldown + 1, r.now)
    assert.equal(s.tier, 'medium', `round ${round}: dropped to medium`)
    r = run(s, 12, GOVERNOR.retryAfter + GOVERNOR.upAfter + GOVERNOR.cooldown + 2, r.now)
  }
  // Two drops from high: high is now off the table, however good medium looks.
  assert.equal(s.tier, 'medium')
  run(s, 12, 600, r.now)
  assert.equal(s.tier, 'medium')
})

// Presets -------------------------------------------------------------------------

test('each tier costs less than the one above it', () => {
  const [low, medium, high] = [PRESETS.low, PRESETS.medium, PRESETS.high]
  assert.ok(low.maxDpr <= medium.maxDpr && medium.maxDpr <= high.maxDpr)
  assert.ok(low.dust <= medium.dust && medium.dust <= high.dust)
  assert.ok(low.backdropOctaves <= medium.backdropOctaves && medium.backdropOctaves <= high.backdropOctaves)
  const fx = { off: 0, lite: 1, full: 2 }
  assert.ok(fx[low.postfx] <= fx[medium.postfx] && fx[medium.postfx] <= fx[high.postfx])
})

test('high keeps the approved desktop look: full grade, 1.75 density cap, every particle', () => {
  assert.equal(PRESETS.high.postfx, 'full')
  assert.equal(PRESETS.high.maxDpr, 1.75)
  assert.equal(PRESETS.high.dust, 1600)
  assert.equal(PRESETS.high.backdropOctaves, 5)
})
