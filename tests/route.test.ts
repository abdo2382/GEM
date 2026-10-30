import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolvePage, pageHref, PAGE_PATH, EXPERIENCE_PARAMS, type Page } from '../src/site/route.ts'

test('the root opens the homepage', () => {
  assert.deepEqual(resolvePage('/', ''), { page: 'home' })
})

test('the experience lives at /lost-tomb, with or without a trailing slash', () => {
  assert.deepEqual(resolvePage('/lost-tomb', ''), { page: 'lost-tomb' })
  assert.deepEqual(resolvePage('/lost-tomb/', '?lang=ar'), { page: 'lost-tomb' })
})

test('the museum map lives at /museum-map', () => {
  assert.deepEqual(resolvePage('/museum-map', ''), { page: 'museum-map' })
  assert.deepEqual(resolvePage('/museum-map/', '?lang=ar'), { page: 'museum-map' })
})

test('paths are matched without regard to case', () => {
  assert.deepEqual(resolvePage('/Museum-Map', ''), { page: 'museum-map' })
})

test('an old experience link at the root moves to /lost-tomb with its parameters intact', () => {
  assert.deepEqual(resolvePage('/', '?autostart'), { redirect: '/lost-tomb?autostart' })
  assert.deepEqual(resolvePage('/', '?studio=180&photo=0'), { redirect: '/lost-tomb?studio=180&photo=0' })
  assert.deepEqual(resolvePage('/', '?quality=low'), { redirect: '/lost-tomb?quality=low' })
})

test('every experience-only parameter triggers that move', () => {
  for (const name of EXPERIENCE_PARAMS) {
    assert.deepEqual(resolvePage('/', `?${name}`), { redirect: `/lost-tomb?${name}` }, name)
  }
})

test('a language parameter alone stays on the homepage', () => {
  assert.deepEqual(resolvePage('/', '?lang=ar'), { page: 'home' })
})

test('a language parameter travels with an old experience link', () => {
  assert.deepEqual(resolvePage('/', '?lang=ar&autostart'), { redirect: '/lost-tomb?lang=ar&autostart' })
})

test('experience-only parameters do not pull the map or the experience elsewhere', () => {
  assert.deepEqual(resolvePage('/museum-map', '?quality=low'), { page: 'museum-map' })
  assert.deepEqual(resolvePage('/lost-tomb', '?autostart'), { page: 'lost-tomb' })
})

test('an index.html request is the homepage', () => {
  assert.deepEqual(resolvePage('/index.html', ''), { page: 'home' })
})

test('an unknown path goes back to the homepage', () => {
  assert.deepEqual(resolvePage('/nowhere', ''), { redirect: '/' })
  assert.deepEqual(resolvePage('/lost-tomb/extra', ''), { redirect: '/' })
})

test('every page path resolves to its own page', () => {
  for (const page of Object.keys(PAGE_PATH) as Page[]) {
    assert.deepEqual(resolvePage(PAGE_PATH[page], ''), { page }, page)
  }
})

test('a link to another page carries the language with it', () => {
  assert.equal(pageHref('museum-map', 'ar'), '/museum-map?lang=ar')
  assert.equal(pageHref('lost-tomb', 'en'), '/lost-tomb?lang=en')
  assert.equal(pageHref('home', 'ar'), '/?lang=ar')
})

test('what pageHref writes still opens the page it names', () => {
  for (const page of Object.keys(PAGE_PATH) as Page[]) {
    const [path, search] = pageHref(page, 'ar').split('?')
    assert.deepEqual(resolvePage(path, '?' + search), { page }, page)
  }
})
