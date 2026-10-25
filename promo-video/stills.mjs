// Still captures of the real site for the pitch deck: each treasure in Inspect.
import { mkdirSync, writeFileSync } from 'node:fs'
import { launch, step, until, grab, SITE } from './lib/browser.mjs'

mkdirSync('stills', { recursive: true })
const size = { width: 1920, height: 1080 }
const { browser, page, cdp } = await launch(size)
page.on('pageerror', (e) => console.log('pageerror', e.message))
await page.goto(SITE, { waitUntil: 'domcontentloaded' })
await until(page, () => !!document.querySelector('.gate .btn--gold'), 120)
await step(page, 20)
await page.click('.gate .btn--gold')
await until(page, () => !!(window.__lt && window.__r3f), 60)
await step(page, 160)
for (const [id, chapter, turn] of [['mask', 0, 0.35], ['anubis', 1, 0.5], ['throne', 2, 0.45], ['canopic', 3, 0.4]]) {
  await page.evaluate((c) => window.__lt.scrollToChapter(c, { immediate: true }), chapter)
  await step(page, 90)
  await page.evaluate((i) => window.__lt.store.getState().openInspect(i), id)
  await step(page, 70)
  // A gentle three-quarter turn, as a visitor would leave it.
  await page.evaluate((r) => (window.__lt.inspectState.rotY = r), turn)
  await step(page, 60)
  writeFileSync(`stills/inspect-${id}.jpg`, await grab(page, cdp, { ...size, quality: 94 }))
  await page.evaluate(() => window.__lt.store.getState().closeInspect())
  await step(page, 60)
  console.log('captured', id)
}
await browser.close()
