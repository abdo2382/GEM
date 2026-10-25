// Shared browser setup: the installed Chrome, driven by playwright-core, with the page
// clock frozen so every captured frame is advanced by exactly one frame of time.
import { chromium } from 'playwright-core'

export const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
export const SITE = process.env.SITE ?? 'http://localhost:5173/'
export const FPS = 30
export const FRAME_MS = 1000 / FPS

export async function launch({ width, height, mobile = false, scale = 1 }) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    // Use the real GPU through ANGLE; software rendering would take seconds per frame.
    args: ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  })
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    isMobile: mobile,
    hasTouch: mobile,
    locale: 'en-US',
    colorScheme: 'dark',
  })
  const page = await context.newPage()
  // Fresh visitor state for every take: English, empty trail unless a take sets it.
  // Keep the browser's real requestAnimationFrame before the clock is frozen: it is
  // how we let the compositor paint after each step.
  await page.addInitScript(() => {
    try {
      localStorage.clear()
    } catch {}
    window.__nativeRAF = window.requestAnimationFrame.bind(window)
  })
  await page.clock.install({ time: new Date('2026-10-24T20:00:00Z') })
  // The frozen clock fires animation frames every 16ms, i.e. two renders per video
  // frame. Fire them once per 1/30 s instead: half the GPU work, identical motion.
  await page.addInitScript((ms) => {
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), ms)
    window.cancelAnimationFrame = (id) => clearTimeout(id)
  }, 1000 / 30)
  const cdp = await context.newCDPSession(page)
  return { browser, context, page, cdp }
}

/** Advance the frozen clock by `n` frames, letting rAF, timers and Lenis run. */
export async function step(page, n = 1) {
  for (let i = 0; i < n; i++) await page.clock.runFor(FRAME_MS)
}

/**
 * Let the GPU finish the frame (a 1-pixel read-back), then grab the viewport as JPEG.
 * `scale` > 1 asks Chrome to render the capture at device resolution (phones).
 */
export async function grab(page, cdp, { quality = 92, width, height, scale = 1 } = {}) {
  const scroll = await page.evaluate(() => {
    const gl = window.__r3f?.gl?.getContext()
    if (gl) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
    return new Promise((r) => window.__nativeRAF(() => r({ x: window.scrollX, y: window.scrollY })))
  })
  const params = { format: 'jpeg', quality, optimizeForSpeed: true }
  // A clip is in page coordinates: follow the scroll so it always frames the screen.
  if (scale !== 1) params.clip = { x: scroll.x, y: scroll.y, width, height, scale }
  const { data } = await cdp.send('Page.captureScreenshot', params)
  return Buffer.from(data, 'base64')
}

/** Advance until `fn` (evaluated in the page) is truthy, up to `maxSeconds` of page time. */
export async function until(page, fn, maxSeconds = 60) {
  for (let i = 0; i < maxSeconds * FPS; i++) {
    if (await page.evaluate(fn)) return true
    await page.clock.runFor(FRAME_MS * 3)
  }
  throw new Error('timed out waiting for ' + fn.toString())
}
