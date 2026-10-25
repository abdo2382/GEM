// Behaviour check for the built deck (exports/THE_LOST_TOMB_PITCH.html), opened from disk
// as a presenter would: keys, buttons, entrances, notes, the backup video, a touch swipe
// on a phone-sized screen, reduced motion, and no console errors.
//
//   node check.mjs
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const DECK = pathToFileURL(join(fileURLToPath(new URL('.', import.meta.url)), '..', 'exports', 'THE_LOST_TOMB_PITCH.html')).href
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const results = []
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const errors = []
async function open(options, query = '') {
  const context = await browser.newContext(options)
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(DECK + query)
  await page.waitForFunction(() => window.deckReady)
  return page
}
const index = (page) => page.evaluate(() => window.deck.index)
const headingOpacity = (page) => page.evaluate(() => Number(getComputedStyle(document.querySelector('.slide.is-active .h, .slide.is-active .title')).opacity))

// Desktop, full motion -------------------------------------------------------------------
const page = await open({ viewport: { width: 1920, height: 1080 } })
check('opens on slide 1', (await index(page)) === 0)
check('12 slides', (await page.evaluate(() => window.deck.count)) === 12)
const scale = await page.evaluate(() => document.getElementById('stage').getBoundingClientRect().width)
check('stage fills a 1920 screen', Math.abs(scale - 1920) < 1, `${scale}px`)

await page.keyboard.press('ArrowRight')
await wait(250)
const mid = await headingOpacity(page)
await wait(2600)
const end = await headingOpacity(page)
check('ArrowRight goes to slide 2', (await index(page)) === 1)
check('entrance animates the heading in', mid < 0.9 && end > 0.99, `opacity ${mid.toFixed(2)} at 0.25 s, ${end.toFixed(2)} at 2.85 s`)
check('hidden slides are inert', await page.evaluate(() => document.querySelectorAll('.slide[inert]').length === 11))
check('URL hash follows', (await page.evaluate(() => location.hash)) === '#2')

await page.keyboard.press('Space')
check('Space goes forward', (await index(page)) === 2)
await page.keyboard.press('ArrowLeft')
check('ArrowLeft goes back', (await index(page)) === 1)
await page.keyboard.press('End')
check('End goes to the last slide', (await index(page)) === 11)
await page.keyboard.press('Home')
check('Home goes to the first slide', (await index(page)) === 0)
await page.click('button[aria-label="Next slide"]')
check('next button', (await index(page)) === 1)
await page.click('button[aria-label="Previous slide"]')
check('previous button', (await index(page)) === 0)
check('counter reads 1', (await page.textContent('#n')) === '1')

await page.keyboard.press('n')
const notes = await page.evaluate(() => ({ shown: !document.querySelector('.notes').hidden, same: document.querySelector('.notes').textContent === document.querySelector('.slide.is-active').dataset.notes }))
check('N shows this slide’s speaker notes', notes.shown && notes.same)
await page.keyboard.press('n')

// Fast clicking through every slide must not leave any slide half-built.
for (let i = 0; i < 11; i++) await page.keyboard.press('ArrowRight')
await wait(3500)
check('rapid navigation lands on 12', (await index(page)) === 11)
check('slide 12 fully built after rapid navigation', (await headingOpacity(page)) > 0.99)

await page.evaluate(() => window.deck.show(10))
await wait(2500)
const video = await page.evaluate(() => {
  const v = document.querySelector('.slide.is-active video')
  return { ready: v.readyState, paused: v.paused, duration: v.duration, missing: !!document.querySelector('.video-missing') }
})
check('backup recording loads from beside the file and plays', video.ready >= 2 && !video.paused && !video.missing, `readyState ${video.ready}, ${video.duration.toFixed(1)} s, paused ${video.paused}`)
await page.evaluate(() => window.deck.show(11))
check('video pauses when leaving its slide', await page.evaluate(() => document.querySelectorAll('video')[0].paused))
check('live link points at the local site', (await page.getAttribute('a.button', 'href')) === 'http://localhost:5173/')
await page.context().close()

// Phone, touch swipe -----------------------------------------------------------------------
const phone = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
const cdp = await phone.context().newCDPSession(phone)
const swipe = async (from, to) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y: 420 }] })
  for (let k = 1; k <= 6; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from + ((to - from) * k) / 6, y: 420 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
await swipe(320, 80)
check('swipe left goes forward on a phone', (await index(phone)) === 1)
await swipe(80, 320)
check('swipe right goes back on a phone', (await index(phone)) === 0)
const fit = await phone.evaluate(() => document.getElementById('stage').getBoundingClientRect())
check('stage fits a 390 px screen', fit.width <= 391 && fit.left >= -0.5, `${fit.width.toFixed(0)}×${fit.height.toFixed(0)}`)
await phone.context().close()

// Reduced motion -----------------------------------------------------------------------------
const calm = await open({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' })
await calm.keyboard.press('ArrowRight')
await wait(60)
check('reduced motion: content appears at once', (await headingOpacity(calm)) > 0.99)
check('reduced motion: video does not autoplay', await calm.evaluate(() => (window.deck.show(10), document.querySelector('.slide.is-active video').paused)))
await calm.context().close()

await browser.close()
check('no console errors', errors.length === 0, errors.join(' | '))
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`)
const failed = results.filter((r) => !r.ok).length
console.log(`${results.length - failed}/${results.length} passed`)
process.exitCode = failed ? 1 : 0
