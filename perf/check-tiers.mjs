// Functional check of the quality tiers on an emulated Android phone (dev server).
// Needs the dev server (npm run dev) on :5173.
const { chromium } = await import('playwright-core')
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'

async function open(query) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA })
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 4 })
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const t0 = Date.now()
  await page.goto('http://localhost:5173/lost-tomb' + query, { timeout: 180000 })
  await page.waitForSelector('.gate .btn--gold', { state: 'visible', timeout: 180000 })
  const ready = Date.now() - t0
  await page.tap('.gate .btn--gold')
  await page.waitForFunction(() => window.__lt && window.__r3f, null, { timeout: 60000 })
  await page.waitForTimeout(3500)
  return { ctx, page, errors, ready }
}
const passes = (page) => page.evaluate(async () => {
  const s = (window.__r3f.get ? window.__r3f.get() : window.__r3f)
  const st = s.get ? s.get() : s
  const gl = st.gl
  const orig = gl.render.bind(gl)
  let n = 0
  gl.render = (a, b) => { orig(a, b); n++ }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  n = 0
  await new Promise((r) => requestAnimationFrame(r))
  gl.render = orig
  return { passes: n, dpr: +gl.getPixelRatio().toFixed(2), buffer: `${gl.domElement.width}x${gl.domElement.height}`, tier: window.__lt.store.getState().quality, html: document.documentElement.dataset.quality, chipBlur: getComputedStyle(document.querySelector('.chip')).backdropFilter }
})

const expect = { low: { dpr: 1, passes: 1, blur: 'none' }, medium: { dpr: 1.35, blur: 'none' }, high: { dpr: 1.75, blur: 'blur(8px)' } }
for (const q of ['', '?quality=low', '?quality=medium', '?quality=high']) {
  const { ctx, page, errors, ready } = await open(q)
  const st = await passes(page)
  const tier = q ? q.split('=')[1] : 'medium'
  const tag = q || 'auto'
  check(`${tag}: tier in effect is ${tier}`, st.tier === tier && st.html === tier, JSON.stringify(st))
  check(`${tag}: pixel ratio ${expect[tier].dpr}`, Math.abs(st.dpr - expect[tier].dpr) < 0.01, `${st.dpr}, buffer ${st.buffer}`)
  if (tier === 'low') check(`${tag}: no post-processing (one render pass)`, st.passes === 1, `${st.passes} passes`)
  if (tier === 'medium') check(`${tag}: lighter grade than high`, st.passes > 1 && st.passes < 18, `${st.passes} passes`)
  if (tier === 'high') check(`${tag}: full grade as before`, st.passes === 18, `${st.passes} passes`)
  check(`${tag}: frosted glass ${expect[tier].blur === 'none' ? 'off' : 'on'}`, st.chipBlur === expect[tier].blur, st.chipBlur)
  // Inspect still opens and closes.
  await page.evaluate(() => window.__lt.scrollToChapter(2, { immediate: true }))
  await page.waitForTimeout(2500)
  await page.tap('.papyrus__inspect')
  await page.waitForTimeout(1500)
  const inspecting = await page.evaluate(() => !!document.querySelector('.inspect') && window.__lt.store.getState().inspect === 'throne')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(800)
  const closed = await page.evaluate(() => window.__lt.store.getState().inspect === null)
  check(`${tag}: Inspect opens and closes`, inspecting && closed)
  check(`${tag}: no page errors`, errors.length === 0, errors.join(' | '))
  check(`${tag}: Start shown after ${ready} ms`, true)
  await ctx.close()
}

// Switching mid-journey from the menu keeps the chapter and the trail.
{
  const { ctx, page, errors } = await open('?quality=auto')
  await page.evaluate(() => window.__lt.scrollToChapter(2, { immediate: true }))
  await page.waitForTimeout(2500)
  await page.evaluate(() => window.__lt.store.getState().toggleTrail('throne'))
  // The bar tucks away after a jump down; a short scroll up brings it back, as for a visitor.
  await page.mouse.wheel(0, -80)
  await page.waitForTimeout(900)
  await page.tap('.topbar__more')
  await page.waitForTimeout(300)
  await page.selectOption('.topbar__settings select', 'low')
  await page.waitForTimeout(1500)
  const a = await passes(page)
  const kept = await page.evaluate(() => ({ chapter: window.__lt.store.getState().chapter, trail: window.__lt.store.getState().trail.join(','), saved: localStorage.getItem('lost-tomb.quality') }))
  check('menu → Low applies at once', a.tier === 'low' && a.dpr === 1 && a.passes === 1, JSON.stringify(a))
  check('chapter and trail kept through the switch', kept.chapter === 2 && kept.trail === 'throne', JSON.stringify(kept))
  check('the choice is remembered for the next visit', kept.saved === 'low')
  await page.selectOption('.topbar__settings select', 'auto').catch(async () => { await page.tap('.topbar__more'); await page.selectOption('.topbar__settings select', 'auto') })
  check('no page errors while switching', errors.length === 0, errors.join(' | '))
  await ctx.close()
}
await browser.close()
console.log(results.join('\n'))
console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
