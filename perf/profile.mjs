// Performance profile of a PRODUCTION build under Android phone emulation.
//   npm run build                                (in the project root: builds dist/)
//   node profile.mjs ../dist <label> [cpuRates=4,6] [query]      (in perf/)
//   e.g. node profile.mjs ../dist auto 4,6 ""   |   node profile.mjs ../dist low 4 "?quality=low"
// Optional: TRACE=<phase> records a browser trace of one phase; PROFILE=<phase> a CPU
// profile; PROFILE_LOAD=1 profiles loading up to the Start button. Results land in results/.
// Serves <distDir> on a local port, drives the real journey with touch gestures and
// records: load-to-ready time, frame times (avg FPS, p50/p95/p99, janky share, worst),
// long tasks, tap response (Event Timing), JS heap, and the canvas's real resolution.
// Emulation only: CPU throttling models a slower processor, not a phone GPU or memory.
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { extname, join, normalize, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const { chromium } = await import('playwright-core')
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const [dist, label = 'run', ratesArg = '4,6', query = ''] = process.argv.slice(2)
const rates = ratesArg.split(',').map(Number)
const outDir = join(dirname(fileURLToPath(import.meta.url)), 'results')
mkdirSync(outDir, { recursive: true })

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' }
const server = createServer((req, res) => {
  let p = normalize(join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname)))
  if (!p.startsWith(normalize(dist))) return res.writeHead(403).end()
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(dist, 'index.html')
  res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' })
  createReadStream(p).pipe(res)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${server.address().port}/lost-tomb${query}`

const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
const pct = (a, p) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : 0
const summary = (gaps) => {
  const total = gaps.reduce((s, g) => s + g, 0)
  return {
    fps: +(gaps.length / (total / 1000)).toFixed(1),
    p50: +pct(gaps, 50).toFixed(1),
    p95: +pct(gaps, 95).toFixed(1),
    p99: +pct(gaps, 99).toFixed(1),
    worst: +Math.max(0, ...gaps).toFixed(0),
    janky: +((gaps.filter((g) => g > 33.4).length / Math.max(1, gaps.length)) * 100).toFixed(1),
    frames: gaps.length,
  }
}

const browser = await chromium.launch({ executablePath: CHROME, headless: false, args: ['--window-size=440,960', '--use-angle=d3d11'] })
const report = { label, url: query, runs: [] }
for (const rate of rates) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA })
  await ctx.addInitScript(() => {
    // A typical mid-range Android phone as the site's own detection sees it.
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 4 })
    window.__perf = { long: [], events: [] }
    try {
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__perf.long.push({ t: e.startTime, d: e.duration }))).observe({ type: 'longtask', buffered: true })
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__perf.events.push({ name: e.name, d: e.duration }))).observe({ type: 'event', durationThreshold: 16, buffered: true })
    } catch {}
    window.__frames = (ms) => new Promise((resolve) => {
      const gaps = []
      let last = performance.now()
      const end = last + ms
      const tick = (t) => { gaps.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); else resolve(gaps) }
      requestAnimationFrame(tick)
    })
  })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  const t0 = Date.now()
  if (process.env.PROFILE_LOAD) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await cdp.send('Profiler.start') }
  await page.goto(url, { timeout: 240000 })
  await page.waitForSelector('.gate .btn--gold', { timeout: 240000, state: 'visible' })
  const loadMs = Date.now() - t0
  await page.waitForTimeout(1500)
  let loadProfile = null
  if (process.env.PROFILE_LOAD) {
    const { profile } = await cdp.send('Profiler.stop')
    const byId = new Map(profile.nodes.map((n) => [n.id, n]))
    const parent = new Map()
    for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id)
    // Inclusive time per named function (a function counted once per sample).
    const incl = new Map()
    profile.samples.forEach((id, i) => {
      const seen = new Set()
      for (let x = id; x; x = parent.get(x)) {
        const f = byId.get(x).callFrame
        if (!f.functionName) continue
        const key = `${f.functionName} ${(f.url.split('/').pop() || '').slice(0, 30)}`
        if (seen.has(key)) continue
        seen.add(key)
        incl.set(key, (incl.get(key) ?? 0) + (profile.timeDeltas[i] ?? 0) / 1000)
      }
    })
    loadProfile = [...incl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 120).map(([k, v]) => `${v.toFixed(0)}ms ${k}`)
  }
  const run = { cpu: rate, loadToStartMs: loadMs, phases: {}, loadProfile }
  if (process.env.PROFILE_LOAD) { console.log(JSON.stringify({ loadMs, loadProfile })); await ctx.close(); continue }
  const marks = [{ name: 'load', t: 0 }]
  const profileOf = process.env.PROFILE
  const measure = async (name, ms, during) => {
    marks.push({ name, t: await page.evaluate(() => performance.now()) })
    const traceOf = process.env.TRACE
    if (traceOf === name) await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink', 'cc', 'gpu', 'toplevel', 'v8'] })
    if (profileOf === name) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start') }
    const p = page.evaluate((m) => window.__frames(m), ms)
    if (during) await during()
    run.phases[name] = summary(await p)
    if (traceOf === name) {
      const trace = JSON.parse((await browser.stopTracing()).toString())
      const ev = trace.traceEvents ?? trace
      const threads = new Map()
      for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') threads.set(`${e.pid}:${e.tid}`, e.args.name)
      const agg = new Map()
      const paints = new Map()
      for (const e of ev) {
        if (e.ph !== 'X' || !e.dur) continue
        const th = threads.get(`${e.pid}:${e.tid}`) ?? '?'
        if (!/CrRendererMain|Compositor|GpuMain|CrGpuMain|VizCompositor|Raster/i.test(th)) continue
        const key = `${th.replace(/Thread.*$/, '')} ${e.name}`
        agg.set(key, (agg.get(key) ?? 0) + e.dur / 1000)
        if (e.name === 'Paint' && e.args?.data) {
          const k = `${e.args.data.nodeName ?? e.args.data.layerId ?? 'layer'} ${Math.round(e.args.data.clip?.[2] - e.args.data.clip?.[0] || 0)}w`
          paints.set(k, (paints.get(k) ?? 0) + 1)
        }
      }
      run.trace = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28).map(([k, v]) => `${v.toFixed(0)}ms ${k}`)
      run.paints = [...paints.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${v}x ${k}`)
    }
    if (profileOf === name) {
      const { profile } = await cdp.send('Profiler.stop')
      const self = new Map()
      const byId = new Map(profile.nodes.map((n) => [n.id, n]))
      const dt = profile.timeDeltas
      profile.samples.forEach((id, i) => {
        const n = byId.get(id)
        const f = n.callFrame
        const key = `${f.functionName || '(anon)'} ${(f.url.split('/').pop() || f.url).slice(0, 40)}:${f.lineNumber}`
        self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0) / 1000)
      })
      run.profile = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22).map(([k, v]) => `${v.toFixed(0)}ms ${k}`)
    }
  }
  await page.tap('.gate .btn--gold')
  await measure('opening', 5000)
  const swipe = (dy) => cdp.send('Input.synthesizeScrollGesture', { x: 206, y: 640, yDistance: -dy, speed: 1400, gestureSourceType: 'touch', repeatCount: 1 })
  // Scroll through the story one screen-ish at a time, as a thumb would.
  await measure('scroll-through-chapters', 9000, async () => {
    for (let i = 0; i < 8; i++) { await swipe(520); await page.waitForTimeout(250) }
  })
  await measure('settled-in-chapter', 3000)
  const canvas = await page.evaluate(() => { const c = document.querySelector('canvas'); return c ? { w: c.width, h: c.height, css: `${c.clientWidth}x${c.clientHeight}` } : null })
  run.canvas = canvas
  // Inspect: tap the sheet's Inspect link if an object is on stage, drag to turn, close.
  const inspect = await page.$('.papyrus__inspect')
  if (inspect && await inspect.isVisible()) {
    await measure('open-inspect', 2500, async () => { await inspect.tap() })
    await measure('drag-rotate', 2500, async () => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 330 }] })
      for (let k = 1; k <= 20; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120 + k * 9, y: 330 }] }); await page.waitForTimeout(30) }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    })
    await measure('close-inspect', 2000, async () => { await page.keyboard.press('Escape') })
  }
  const perf = await page.evaluate(() => ({
    long: window.__perf.long,
    events: window.__perf.events,
    heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
  }))
  run.longTasks = { count: perf.long.length, totalMs: Math.round(perf.long.reduce((s, e) => s + e.d, 0)), worstMs: Math.round(Math.max(0, ...perf.long.map((e) => e.d))) }
  // Long tasks per phase: which part of the journey blocks the main thread.
  const per = {}
  for (const e of perf.long) {
    let ph = 'load'
    for (const m of marks) if (e.t >= m.t) ph = m.name
    per[ph] = per[ph] ?? { n: 0, ms: 0, worst: 0 }
    per[ph].n++; per[ph].ms += Math.round(e.d); per[ph].worst = Math.max(per[ph].worst, Math.round(e.d))
  }
  run.longByPhase = per
  const taps = perf.events.filter((e) => /pointer|click|touch|key/.test(e.name))
  run.input = { slowEvents: taps.length, worstMs: Math.round(Math.max(0, ...taps.map((e) => e.d))) }
  run.jsHeapMB = perf.heap
  report.runs.push(run)
  console.log(JSON.stringify(run))
  await ctx.close()
}
await browser.close()
server.close()
writeFileSync(join(outDir, `${label}.json`), JSON.stringify(report, null, 2))
