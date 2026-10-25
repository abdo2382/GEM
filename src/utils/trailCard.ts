import type { Lang, TreasureId } from '../content/types'
import { ARTIFACT_TEXT } from '../content/story'
import { STRINGS, CARTOUCHE_GLYPHS } from '../i18n/strings'

/**
 * Renders the visitor's Discovery Trail as a 1080×1350 share card and downloads it.
 * Everything is drawn locally; nothing leaves the device.
 */
export async function downloadTrailCard(lang: Lang, items: TreasureId[], name: string) {
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const t = STRINGS[lang]
  const rtl = lang === 'ar'
  const display = rtl ? '"Reem Kufi", serif' : 'Cinzel, serif'
  const body = rtl ? 'Amiri, serif' : '"EB Garamond", serif'
  await Promise.all([
    document.fonts.load(`48px ${display}`),
    document.fonts.load(`32px ${body}`),
    document.fonts.load('64px "Noto Sans Egyptian Hieroglyphs"', CARTOUCHE_GLYPHS),
  ]).catch(() => undefined)

  const bg = ctx.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.5, H * 0.8)
  bg.addColorStop(0, '#2a1d10')
  bg.addColorStop(0.55, '#110b06')
  bg.addColorStop(1, '#050403')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = '#c49a45'
  ctx.lineWidth = 3
  ctx.strokeRect(40, 40, W - 80, H - 80)
  ctx.lineWidth = 1
  ctx.strokeRect(56, 56, W - 112, H - 112)

  // Cartouche of Nebkheperure.
  ctx.save()
  ctx.translate(W / 2, 250)
  ctx.strokeStyle = '#d4af37'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.roundRect(-70, -150, 140, 290, 70)
  ctx.stroke()
  ctx.fillStyle = '#d4af37'
  ctx.fillRect(-80, 148, 160, 8)
  ctx.font = '64px "Noto Sans Egyptian Hieroglyphs"'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ;[...CARTOUCHE_GLYPHS].forEach((g, i) => ctx.fillText(g, 0, -100 + i * 64))
  ctx.restore()

  ctx.direction = rtl ? 'rtl' : 'ltr'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#f3e8d0'
  ctx.font = `600 64px ${display}`
  ctx.fillText(t.trail, W / 2, 500)
  if (name.trim()) {
    ctx.fillStyle = '#d4af37'
    ctx.font = `italic 40px ${body}`
    ctx.fillText(name.trim().slice(0, 40), W / 2, 560)
  }

  ctx.font = `36px ${body}`
  ctx.fillStyle = '#d9c39a'
  const texts = ARTIFACT_TEXT[lang]
  const list = items.length ? items : []
  list.forEach((id, i) => {
    const y = 680 + i * 150
    ctx.fillStyle = '#d4af37'
    ctx.font = `600 44px ${display}`
    ctx.fillText(texts[id].name, W / 2, y)
    ctx.fillStyle = '#a58a60'
    ctx.font = `30px ${body}`
    ctx.fillText(texts[id].origin, W / 2, y + 50)
  })
  if (!list.length) {
    ctx.fillStyle = '#a58a60'
    ctx.font = `34px ${body}`
    ctx.fillText(t.trailEmpty, W / 2, 720, W - 200)
  }

  ctx.fillStyle = '#c49a45'
  ctx.font = `30px ${display}`
  ctx.fillText(t.cardFooter, W / 2, H - 150)
  ctx.fillStyle = '#7d6748'
  ctx.font = `24px ${body}`
  ctx.fillText(`${t.title} · GEM Hackathon 2026`, W / 2, H - 100)

  const blob: Blob | null = await new Promise((resolve) => c.toBlob(resolve, 'image/png'))
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'my-discovery-trail.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
