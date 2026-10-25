// Renders the promo from the composition (compose/) to MP4.
//
//   node render.mjs                          16:9, 1920x1080
//   node render.mjs --format vertical        9:16, 1080x1920
//   node render.mjs --stills 8,22,50         check frames only (seconds), no encode
//   node render.mjs --encode-only            audio and MP4 from frames already in out/
//   node render.mjs --range 12.5,26          re-render only these seconds, then encode
//
// The project folder is served locally so the composition can read the captured
// frames, the site's fonts and the archive photographs. Audio is synthesised here
// (an original drone and desert wind, no third-party recordings).
import { createServer } from 'node:http'
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import ffmpeg from 'ffmpeg-static'
import { CHROME } from './lib/browser.mjs'

const args = process.argv.slice(2)
const opt = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const FORMAT = opt('format') ?? 'landscape'
const STILLS = opt('stills')?.split(',').map(Number)
const ENCODE_ONLY = args.includes('--encode-only')
const RANGE = opt('range')?.split(',').map(Number)
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT = join('out', FORMAT)
const EXPORTS = join(ROOT, 'exports')
const NAME = FORMAT === 'vertical' ? 'THE_LOST_TOMB_PROMO_VERTICAL' : 'THE_LOST_TOMB_PROMO'

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' }
const server = createServer((req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)))
  if (!path.startsWith(normalize(ROOT)) || !existsSync(path) || statSync(path).isDirectory()) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
  createReadStream(path).pipe(res)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

const vertical = FORMAT === 'vertical'
const W = vertical ? 1080 : 1920
const H = vertical ? 1920 : 1080
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=d3d11'] })
const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage()
page.on('pageerror', (e) => console.log('pageerror', e.message))
await page.goto(`${base}/promo-video/compose/index.html?format=${FORMAT}`)
await page.waitForFunction(() => window.composeReady, null, { timeout: 60000 })
const { frames } = await page.evaluate(() => window.composeReady)
const cdp = await page.context().newCDPSession(page)

async function capture(n, path) {
  await page.evaluate((i) => window.renderFrame(i), n)
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95 })
  writeFileSync(path, Buffer.from(data, 'base64'))
}

if (STILLS) {
  mkdirSync('out/stills', { recursive: true })
  for (const s of STILLS) await capture(Math.round(s * 30), `out/stills/${FORMAT}-${String(s).replace('.', '_')}s.jpg`)
  console.log('stills written to out/stills')
} else {
  const t0 = Date.now()
  if (!ENCODE_ONLY) {
    if (!RANGE) rmSync(OUT, { recursive: true, force: true })
    mkdirSync(OUT, { recursive: true })
    const [a, b] = RANGE ? [Math.floor(RANGE[0] * 30), Math.min(frames, Math.ceil(RANGE[1] * 30))] : [0, frames]
    for (let n = a; n < b; n++) {
      await capture(n, join(OUT, `${String(n).padStart(5, '0')}.jpg`))
      if (n % 300 === 0) console.log(`frame ${n}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
    }
  }
  if (!existsSync(join(OUT, `${String(frames - 1).padStart(5, '0')}.jpg`))) throw new Error(`encoding needs all ${frames} frames in ${OUT}`)
  // Original ambience: a low drone, filtered desert wind, and two soft swells at the
  // title reveals. Synthesised, so there is nothing to license.
  const seconds = frames / 30
  const wav = join('out', `ambience-${FORMAT}.wav`)
  execFileSync(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', `aevalsrc=exprs='0.30*sin(2*PI*55*t)*(0.75+0.25*sin(2*PI*0.07*t))+0.16*sin(2*PI*82.5*t)*(0.7+0.3*sin(2*PI*0.05*t+1))+0.07*sin(2*PI*110*t)':s=48000:d=${seconds}`,
    '-f', 'lavfi', '-i', `anoisesrc=color=brown:amplitude=0.5:d=${seconds}:r=48000`,
    '-f', 'lavfi', '-i', `aevalsrc=exprs='0.8*sin(2*PI*46*t)*exp(-1.8*(t-6.8))*gte(t,6.8)+0.5*sin(2*PI*60*t)*exp(-2.4*(t-21.4))*gte(t,21.4)+0.8*sin(2*PI*46*t)*exp(-1.8*(t-107.6))*gte(t,107.6)':s=48000:d=${seconds}`,
    '-filter_complex',
    `[1:a]bandpass=f=420:w=500,tremolo=f=0.1:d=0.5,volume=0.55[wind];[0:a][wind][2:a]amix=inputs=3:normalize=0,lowpass=f=2600,afade=t=in:st=0:d=3,afade=t=out:st=${seconds - 5}:d=5,loudnorm=I=-22:TP=-2:LRA=7,aformat=channel_layouts=stereo[a]`,
    '-map', '[a]', '-ar', '48000', wav,
  ], { stdio: 'inherit' })
  mkdirSync(EXPORTS, { recursive: true })
  const mp4 = join(EXPORTS, `${NAME}.mp4`)
  execFileSync(ffmpeg, [
    '-y', '-framerate', '30', '-i', join(OUT, '%05d.jpg'), '-i', wav,
    // Frames are full-range JPEG (BT.601); convert to limited-range BT.709 and tag it, as players expect for HD.
    '-vf', 'scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level', '4.2',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4,
  ], { stdio: 'inherit' })
  console.log(`wrote ${mp4} in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
}

await browser.close()
server.close()
