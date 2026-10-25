// Exports the built deck (exports/THE_LOST_TOMB_PITCH.html) to PDF and PowerPoint.
//
//   node build.mjs && node export.mjs
//
// PDF: Chrome prints the deck's ?print layout, one 1920x1080 page per slide, text as text.
// PPTX: each slide is a picture of the deck at its final state (the site's typefaces are
// not shipped with Office, so this keeps the slides exactly as designed), with speaker
// notes and alt text. Three parts stay native: the team line on the last slide is an
// editable text box, the live slide's button is a real link, and the backup recording
// is embedded as a video.
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import pptxgen from 'pptxgenjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const EXPORTS = join(HERE, '..', 'exports')
const DECK = pathToFileURL(join(EXPORTS, 'THE_LOST_TOMB_PITCH.html')).href
const VIDEO = join(EXPORTS, 'THE_LOST_TOMB_DEMO_BACKUP.mp4')
const SHOTS = join(HERE, 'out', 'slides')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PX = 1 / 144 // 1920 px across a 13.333 in slide

mkdirSync(SHOTS, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

async function open(query) {
  await page.goto(`${DECK}${query}`)
  await page.waitForFunction(() => window.deckReady)
  // The on-screen controls belong to the live deck, not to the exported slides.
  await page.addStyleTag({ content: '.controls, .progress, .notes { display: none !important; }' })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((i) => i.decode().catch(() => undefined)))
  })
}

// Slide pictures and what each slide carries -----------------------------------------
const slides = []
for (let n = 1; ; n++) {
  await open(`?static&slide=${n}`)
  const info = await page.evaluate(() => {
    const s = document.querySelector('.slide.is-active')
    const rect = (sel) => {
      const el = s.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    const team = s.querySelector('.team')
    return {
      count: window.deck.count,
      label: s.getAttribute('aria-label'),
      notes: s.dataset.notes ?? '',
      alt: s.innerText.replace(/\s+/g, ' ').trim(),
      link: s.querySelector('a.button') && { ...rect('a.button'), url: s.querySelector('a.button').href },
      video: rect('video'),
      team: team && { ...rect('.team'), size: parseFloat(getComputedStyle(team).fontSize) },
    }
  })
  // The full slide, for review and the PDF check.
  writeFileSync(join(SHOTS, `slide-${String(n).padStart(2, '0')}.png`), await page.screenshot())
  // The PowerPoint picture leaves out what PowerPoint draws natively on top.
  if (info.team) await page.evaluate(() => (document.querySelector('.slide.is-active .team').style.visibility = 'hidden'))
  info.picture = join(SHOTS, `pptx-${String(n).padStart(2, '0')}.jpg`)
  writeFileSync(info.picture, await page.screenshot({ type: 'jpeg', quality: 95 }))
  if (info.link) {
    const { x, y, w, h } = info.link
    info.linkPicture = join(SHOTS, `pptx-${n}-link.png`)
    writeFileSync(info.linkPicture, await page.screenshot({ clip: { x, y, width: w, height: h } }))
  }
  if (info.video) info.poster = await page.evaluate(() => document.querySelector('.slide.is-active video').poster)
  slides.push(info)
  if (n === info.count) break
}
console.log(`captured ${slides.length} slides`)

// PDF ---------------------------------------------------------------------------------
await open('?print')
const pdf = join(EXPORTS, 'THE_LOST_TOMB_PITCH.pdf')
await page.pdf({ path: pdf, printBackground: true, preferCSSPageSize: true })
console.log(`wrote ${pdf} (${(statSync(pdf).size / 1048576).toFixed(1)} MB)`)
await browser.close()

// PowerPoint ----------------------------------------------------------------------------
const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE'
pres.title = 'The Lost Tomb'
pres.subject = 'Pitch presentation, GEM Hackathon 2026'
pres.theme = { headFontFace: 'Garamond', bodyFontFace: 'Garamond' }

const SECTIONS = { 1: 'Opening', 2: 'Problem and solution', 5: 'The experience', 9: 'How and why', 11: 'Live and close' }
let section = ''
const inches = (r) => ({ x: r.x * PX, y: r.y * PX, w: r.w * PX, h: r.h * PX })

for (const [i, s] of slides.entries()) {
  const n = i + 1
  if (SECTIONS[n]) {
    section = SECTIONS[n]
    pres.addSection({ title: section })
  }
  const slide = pres.addSlide({ sectionTitle: section })
  slide.background = { color: '0A0907' }
  slide.addImage({ path: s.picture, x: 0, y: 0, w: 13.333, h: 7.5, altText: `Slide ${n}, ${s.label}: ${s.alt}`, objectName: `Slide ${n} picture` })
  if (s.link) {
    slide.addImage({ path: s.linkPicture, ...inches(s.link), hyperlink: { url: s.link.url, tooltip: 'Opens the site running locally (npm run dev)' }, altText: 'Open The Lost Tomb', objectName: 'Live site link' })
  }
  if (s.video) {
    slide.addMedia({ type: 'video', path: VIDEO, ...inches(s.video), cover: s.poster.replace(/^data:/, ''), objectName: 'Backup recording' })
  }
  if (s.team) {
    slide.addText(
      [
        { text: 'Team: ' },
        { text: 'name and members to be added', options: { underline: { style: 'dash', color: 'C7A04A' } } },
      ],
      { ...inches(s.team), fontFace: 'Garamond', fontSize: Math.round(s.team.size * PX * 72), color: 'AD9D7B', align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Team (edit me)' },
    )
  }
  slide.addNotes(s.notes)
}
const pptx = join(EXPORTS, 'THE_LOST_TOMB_PITCH.pptx')
await pres.writeFile({ fileName: pptx })
console.log(`wrote ${pptx} (${(statSync(pptx).size / 1048576).toFixed(1)} MB)`)

if (errors.length) {
  console.log('page errors:\n' + errors.join('\n'))
  process.exitCode = 1
}
