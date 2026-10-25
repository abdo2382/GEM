// Governor and resilience checks on an emulated Android phone (dev server).
// Needs the dev server (npm run dev) on :5173.
const { chromium } = await import('playwright-core')
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
const store = (page, f) => page.evaluate(f)

async function open(query = '', opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA, ...opts })
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 4 })
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  return { ctx, page, errors }
}
async function start(page, query = '') {
  await page.goto('http://localhost:5173/' + query, { timeout: 180000 })
  await page.waitForSelector('.gate .btn--gold', { state: 'visible', timeout: 180000 })
  await page.tap('.gate .btn--gold')
  await page.waitForFunction(() => window.__lt && window.__r3f, null, { timeout: 60000 })
  await page.waitForTimeout(2500)
}

// 1. Auto steps down under sustained slowness, without disturbing the story.
{
  const { ctx, page, errors } = await open()
  await start(page)
  await page.evaluate(() => window.__lt.scrollToChapter(1, { immediate: true }))
  await page.waitForTimeout(5000)
  const before = await store(page, () => window.__lt.store.getState().quality)
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 })
  const changes = []
  const t0 = Date.now()
  let last = before
  while (Date.now() - t0 < 40000) {
    await page.waitForTimeout(1000)
    const q = await store(page, () => window.__lt.store.getState().quality)
    if (q !== last) { changes.push(`${((Date.now() - t0) / 1000).toFixed(0)}s → ${q}`); last = q }
    if (q === 'low') break
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  const chapter = await store(page, () => window.__lt.store.getState().chapter)
  check('Auto steps down when the phone is slow', before === 'medium' && last === 'low', `${before} → ${changes.join(', ')}`)
  check('the story stays where it was while stepping down', chapter === 1, `chapter ${chapter}`)
  // Fast again: it must not jump straight back up (cooldown and retry window).
  await page.waitForTimeout(15000)
  const after = await store(page, () => window.__lt.store.getState().quality)
  check('does not bounce straight back once fast again', after === 'low', after)
  check('no page errors (governor)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// 2. WebGL context lost and restored: the scene recovers, one tier lighter.
{
  const { ctx, page, errors } = await open()
  await start(page)
  const r = await page.evaluate(async () => {
    const st = window.__r3f.get ? window.__r3f.get() : window.__r3f
    const gl = (st.get ? st.get() : st).gl.getContext()
    const ext = gl.getExtension('WEBGL_lose_context')
    const s = window.__lt.store
    const tier0 = s.getState().quality
    ext.loseContext()
    await new Promise((res) => setTimeout(res, 800))
    const lost = s.getState().contextLost
    ext.restoreContext()
    await new Promise((res) => setTimeout(res, 2500))
    return { tier0, lost, restored: !s.getState().contextLost, tier1: s.getState().quality, glLost: gl.isContextLost() }
  })
  await page.waitForTimeout(5000)
  const fallback = await page.evaluate(() => !!document.querySelector('.fallback'))
  check('context loss is noticed', r.lost, JSON.stringify(r))
  check('context restored: scene back, one tier lighter', r.restored && !r.glLost && r.tier1 === 'low' && !fallback, JSON.stringify(r))
  check('no page errors (context restore)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// 3. Context lost for good: the story edition takes over, trail intact.
{
  const { ctx, page } = await open()
  await start(page)
  await page.evaluate(() => window.__lt.store.getState().toggleTrail('anubis'))
  await page.evaluate(() => {
    const st = window.__r3f.get ? window.__r3f.get() : window.__r3f
    ;(st.get ? st.get() : st).gl.getContext().getExtension('WEBGL_lose_context').loseContext()
  })
  await page.waitForTimeout(6000)
  const s = await page.evaluate(() => ({ fallback: !!document.querySelector('.fallback'), trail: JSON.parse(localStorage.getItem('lost-tomb.trail') ?? '[]') }))
  check('a context that never returns falls back to the story edition', s.fallback && s.trail.includes('anubis'), JSON.stringify(s))
  await ctx.close()
}

// 4. Rotation: landscape and back keeps the chapter, the canvas follows.
{
  const { ctx, page, errors } = await open()
  await start(page)
  await page.evaluate(() => window.__lt.scrollToChapter(2, { immediate: true }))
  await page.waitForTimeout(2500)
  await page.setViewportSize({ width: 915, height: 412 })
  await page.waitForTimeout(2500)
  const land = await page.evaluate(() => ({ chapter: window.__lt.store.getState().chapter, w: document.querySelector('.stage canvas').clientWidth }))
  await page.setViewportSize({ width: 412, height: 915 })
  await page.waitForTimeout(2500)
  const port = await page.evaluate(() => ({ chapter: window.__lt.store.getState().chapter, w: document.querySelector('.stage canvas').clientWidth }))
  check('rotation keeps the chapter and resizes the scene', land.chapter === 2 && port.chapter === 2 && land.w === 915 && port.w === 412, `${JSON.stringify(land)} ${JSON.stringify(port)}`)
  check('no page errors (rotation)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// 5. Reduced motion: the journey and Inspect work.
{
  const { ctx, page, errors } = await open('', { reducedMotion: 'reduce' })
  await start(page)
  await page.evaluate(() => window.__lt.scrollToChapter(1))
  await page.waitForTimeout(1500)
  await page.tap('.papyrus__inspect')
  await page.waitForTimeout(1200)
  const ok = await page.evaluate(() => ({ chapter: window.__lt.store.getState().chapter, inspect: window.__lt.store.getState().inspect, reduced: window.__lt.store.getState().reducedMotion }))
  check('reduced motion: chapters and Inspect work', ok.reduced && ok.chapter === 1 && ok.inspect === 'anubis', JSON.stringify(ok))
  check('no page errors (reduced motion)', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// 6. A photograph that fails to download leaves its caption, not a broken image.
{
  const { ctx, page } = await open()
  await page.route('**/archive/*.webp', (r) => r.abort())
  await start(page)
  await page.evaluate(() => window.__lt.scrollToChapter(1, { immediate: true }))
  await page.tap('.papyrus__handle').catch(() => undefined)
  await page.waitForTimeout(2500)
  const fig = await page.evaluate(() => {
    const f = document.querySelector('.papyrus .archive')
    return f ? { img: !!f.querySelector('img'), caption: f.querySelector('.archive__caption')?.textContent?.length ?? 0 } : null
  })
  check('failed photo: caption stays, no broken image', fig && !fig.img && fig.caption > 0, JSON.stringify(fig))
  await ctx.close()
}

// 7. The 3D stage fails to download: the story edition takes over.
{
  const { ctx, page } = await open()
  await page.route(/\/src\/three\/Stage\.tsx/, (r) => r.abort())
  await page.goto('http://localhost:5173/', { timeout: 180000 })
  await page.waitForTimeout(8000)
  const fb = await page.evaluate(() => !!document.querySelector('.fallback'))
  check('failed 3D download: story edition shown', fb)
  await ctx.close()
}
await browser.close()
console.log(results.join('\n'))
console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
