import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arrivalText, formatDistance, formatMinutes, stepText } from '../src/museum-map/describe.ts'
import type { Step } from '../src/museum-map/directions.ts'

const name = (id: string) => ({ obelisk: 'The Hanging Obelisk', toilets: 'Toilets' })[id] ?? id
const nameAr = (id: string) => ({ obelisk: 'المسلة المعلقة', toilets: 'دورة المياه' })[id] ?? id
const step = (over: Partial<Step> = {}): Step => ({ type: 'walk', heading: 'NW', distance: 130, from: 0, passes: [], ...over })

// Distances ------------------------------------------------------------------------------------

test('a step is given to the nearest metre when short and the nearest 5 m when longer', () => {
  assert.equal(formatDistance(7.4, 'en'), '7 m')
  assert.equal(formatDistance(19.6, 'en'), '20 m')
  assert.equal(formatDistance(130.2, 'en'), '130 m')
  assert.equal(formatDistance(216, 'en'), '215 m')
  assert.equal(formatDistance(218, 'en'), '220 m')
})

test('a whole walk is given to the nearest 10 m, and in kilometres from a thousand', () => {
  assert.equal(formatDistance(346, 'en', 'total'), '350 m')
  assert.equal(formatDistance(4, 'en', 'total'), '10 m')
  assert.equal(formatDistance(1334, 'en', 'total'), '1.3 km')
  assert.equal(formatDistance(1334, 'en'), '1.3 km')
})

test('distances in Arabic use Arabic-Indic digits and metre and kilometre abbreviations', () => {
  assert.equal(formatDistance(130, 'ar'), '١٣٠ م')
  assert.equal(formatDistance(1334, 'ar', 'total'), '١٫٣ كم')
})

// Minutes ------------------------------------------------------------------------------------------

test('minutes read naturally in English', () => {
  assert.equal(formatMinutes(1, 'en'), '1 min')
  assert.equal(formatMinutes(19, 'en'), '19 min')
})

test('minutes take the right Arabic form for one, two, a few and many', () => {
  assert.equal(formatMinutes(1, 'ar'), 'دقيقة واحدة')
  assert.equal(formatMinutes(2, 'ar'), 'دقيقتان')
  assert.equal(formatMinutes(5, 'ar'), '٥ دقائق')
  assert.equal(formatMinutes(10, 'ar'), '١٠ دقائق')
  assert.equal(formatMinutes(19, 'ar'), '١٩ دقيقة')
})

// Steps in English ------------------------------------------------------------------------------------

test('the first step says which way to head', () => {
  assert.equal(stepText(step(), 'en', name).main, 'Head north-west for 130 m.')
})

test('a turn says which way to turn and which way to walk', () => {
  assert.equal(stepText(step({ turn: 'right', heading: 'E', distance: 216 }), 'en', name).main, 'Turn right and walk east for 215 m.')
  assert.equal(stepText(step({ turn: 'slight-left', heading: 'W', distance: 40 }), 'en', name).main, 'Bear left and walk west for 40 m.')
  assert.equal(stepText(step({ turn: 'sharp-right', heading: 'S', distance: 40 }), 'en', name).main, 'Turn sharp right and walk south for 40 m.')
})

test('steps are named as steps, with the turn first when there is one', () => {
  assert.equal(stepText(step({ type: 'steps', distance: 15 }), 'en', name).main, 'Take the steps for 15 m.')
  assert.equal(stepText(step({ type: 'steps', distance: 15, turn: 'left' }), 'en', name).main, 'Turn left, then take the steps for 15 m.')
})

test('a step that just carries on says so', () => {
  assert.equal(stepText(step({ heading: 'N', distance: 60 }), 'en', name, true).main, 'Continue north for 60 m.')
})

test('places passed along the way are listed with their side', () => {
  const t = stepText(step({ passes: [{ id: 'obelisk', side: 'left', distance: 12 }, { id: 'toilets', side: 'right', distance: 9 }] }), 'en', name)
  assert.deepEqual(t.passes, ['The Hanging Obelisk on your left.', 'Toilets on your right.'])
})

// Steps in Arabic -------------------------------------------------------------------------------------------

test('Arabic steps head, turn, climb and carry on', () => {
  assert.equal(stepText(step(), 'ar', nameAr).main, 'اتجه نحو الشمال الغربي لمسافة ١٣٠ م.')
  assert.equal(stepText(step({ turn: 'right', heading: 'E', distance: 216 }), 'ar', nameAr).main, 'انعطف يمينًا ثم امشِ نحو الشرق لمسافة ٢١٥ م.')
  assert.equal(stepText(step({ turn: 'slight-left', heading: 'W', distance: 40 }), 'ar', nameAr).main, 'انعطف قليلًا إلى اليسار ثم امشِ نحو الغرب لمسافة ٤٠ م.')
  assert.equal(stepText(step({ turn: 'sharp-right', heading: 'S', distance: 40 }), 'ar', nameAr).main, 'انعطف بحدة إلى اليمين ثم امشِ نحو الجنوب لمسافة ٤٠ م.')
  assert.equal(stepText(step({ type: 'steps', distance: 15 }), 'ar', nameAr).main, 'اصعد أو انزل الدرج لمسافة ١٥ م.')
  assert.equal(stepText(step({ heading: 'N', distance: 60 }), 'ar', nameAr, true).main, 'واصل نحو الشمال لمسافة ٦٠ م.')
})

test('Arabic lists passed places with the side', () => {
  const t = stepText(step({ passes: [{ id: 'obelisk', side: 'left', distance: 12 }, { id: 'toilets', side: 'right', distance: 9 }] }), 'ar', nameAr)
  assert.deepEqual(t.passes, ['المسلة المعلقة على يسارك.', 'دورة المياه على يمينك.'])
})

test('every turn has its own wording in both languages', () => {
  const turns = ['slight-left', 'left', 'sharp-left', 'slight-right', 'right', 'sharp-right'] as const
  for (const lang of ['en', 'ar'] as const) {
    const texts = turns.map((turn) => stepText(step({ turn, heading: 'E' }), lang, name).main)
    assert.equal(new Set(texts).size, turns.length, lang)
  }
})

// Arrival -------------------------------------------------------------------------------------------------------

test('arrival names the place', () => {
  assert.equal(arrivalText('en', 'The Hanging Obelisk'), 'You have arrived at The Hanging Obelisk.')
  assert.equal(arrivalText('ar', 'المسلة المعلقة'), 'وصلت إلى المسلة المعلقة.')
})
