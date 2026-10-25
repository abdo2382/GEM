// Builds exports/THE_LOST_TOMB_PITCH.html: one file that works offline, with the deck's
// CSS, GSAP, script, fonts and images inlined. The backup recording stays a separate
// file beside it (exports/THE_LOST_TOMB_DEMO_BACKUP.mp4).
//
//   node build.mjs
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(HERE, '..')
const OUT = join(ROOT, 'exports', 'THE_LOST_TOMB_PITCH.html')
const text = (p) => readFileSync(p, 'utf8')
const dataUri = (p, type) => `data:${type};base64,${readFileSync(p).toString('base64')}`

// The site's own typefaces, from its @fontsource packages.
const FONTS = {
  'font-cinzel': 'cinzel/files/cinzel-latin-500-normal.woff2',
  'font-cormorant': 'cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2',
  'font-garamond': 'eb-garamond/files/eb-garamond-latin-400-normal.woff2',
  'font-garamond-500': 'eb-garamond/files/eb-garamond-latin-500-normal.woff2',
}

let css = text(join(HERE, 'src', 'deck.css'))
for (const [key, file] of Object.entries(FONTS)) {
  css = css.replaceAll(`{{${key}}}`, dataUri(join(ROOT, 'node_modules', '@fontsource', file), 'font/woff2'))
}

// Images first, while the template holds nothing but its own {{name}} tokens.
let html = text(join(HERE, 'src', 'index.html')).replace(/\{\{([\w-]+)\}\}/g, (_, name) => {
  const file = join(HERE, 'assets', `${name}.webp`)
  if (!existsSync(file)) throw new Error(`missing image assets/${name}.webp`)
  return dataUri(file, 'image/webp')
})

const gsap = text(join(ROOT, 'node_modules', 'gsap', 'dist', 'gsap.min.js'))
const parts = { 'deck.css': css, gsap, 'deck.js': text(join(HERE, 'src', 'deck.js')) }
for (const [key, body] of Object.entries(parts)) {
  const token = `/*@${key}*/`
  if (!html.includes(token)) throw new Error(`template is missing ${token}`)
  html = html.replace(token, () => body.replaceAll('</script', '<\\/script'))
}
if (/\{\{[\w-]+\}\}/.test(css)) throw new Error('a font placeholder was left unfilled')

mkdirSync(join(ROOT, 'exports'), { recursive: true })
writeFileSync(OUT, html)
console.log(`wrote ${OUT} (${(statSync(OUT).size / 1048576).toFixed(2)} MB)`)
