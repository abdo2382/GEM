import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

/*
 * Procedural canvas textures. Each painter draws the same artwork three times:
 * a colour map, an ORM map (G = roughness, B = metalness, as three.js expects)
 * and a bump map, so gold cloisons, glass inlays and stone read correctly under PBR.
 */

export type Mat =
  | 'gold'
  | 'goldMatte'
  | 'goldDark'
  | 'lapis'
  | 'carnelian'
  | 'turquoise'
  | 'quartz'
  | 'obsidian'
  | 'silver'
  | 'skin'
  | 'glassBlue'
  | 'gap'
  | 'black'
  | 'white'
  | 'green'
  | 'dark'
  | 'pale'
  | 'beard'
  | 'carnDark'

const COLOR: Record<Mat, string> = {
  gold: '#f5d35e',
  goldMatte: '#dcb84e',
  goldDark: '#b78f36',
  lapis: '#1c3a8e',
  carnelian: '#b5401e',
  turquoise: '#2e9c93',
  quartz: '#efe9dc',
  obsidian: '#0b0b0f',
  silver: '#dfe2e4',
  skin: '#a5482a',
  glassBlue: '#2b55b8',
  gap: '#4f3a1c',
  black: '#14110e',
  white: '#f3efe6',
  green: '#3f8a5a',
  dark: '#383d66',
  pale: '#93a9ad',
  beard: '#6a6ea6',
  carnDark: '#743a1c',
}

// [roughness, metalness]
const ORM: Record<Mat, [number, number]> = {
  gold: [0.22, 1],
  goldMatte: [0.46, 1],
  goldDark: [0.36, 1],
  lapis: [0.12, 0],
  carnelian: [0.16, 0],
  turquoise: [0.2, 0],
  quartz: [0.1, 0],
  obsidian: [0.06, 0],
  silver: [0.28, 1],
  skin: [0.2, 0],
  glassBlue: [0.1, 0],
  gap: [0.75, 0.5],
  black: [0.3, 0],
  white: [0.24, 0],
  green: [0.2, 0],
  dark: [0.12, 0],
  pale: [0.2, 0],
  beard: [0.26, 0],
  carnDark: [0.2, 0],
}

// Height: gold cloisons stand proud, inlays sit slightly lower, gaps are grooves.
const BUMP: Record<Mat, number> = {
  gold: 225,
  goldMatte: 170,
  goldDark: 190,
  lapis: 150,
  carnelian: 150,
  turquoise: 150,
  quartz: 160,
  obsidian: 150,
  silver: 175,
  skin: 175,
  glassBlue: 150,
  gap: 40,
  black: 150,
  white: 165,
  green: 150,
  dark: 150,
  pale: 150,
  beard: 150,
  carnDark: 150,
}

type Layer = 'color' | 'orm' | 'bump'
export type Style = (m: Mat) => string
type Draw = (ctx: CanvasRenderingContext2D, s: Style, layer: Layer) => void

const styleFor: Record<Layer, Style> = {
  color: (m) => COLOR[m],
  orm: (m) => `rgb(255,${Math.round(ORM[m][0] * 255)},${Math.round(ORM[m][1] * 255)})`,
  bump: (m) => {
    const v = BUMP[m]
    return `rgb(${v},${v},${v})`
  },
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function tex(c: HTMLCanvasElement, srgb: boolean): CanvasTexture {
  const t = new CanvasTexture(c)
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}

export interface PBRSet {
  map: CanvasTexture
  orm: CanvasTexture
  bump: CanvasTexture
}

export function paint(w: number, h: number, draw: Draw): PBRSet {
  const out = {} as Record<Layer, CanvasTexture>
  for (const layer of ['color', 'orm', 'bump'] as Layer[]) {
    const c = canvas(w, h)
    const ctx = c.getContext('2d')!
    draw(ctx, styleFor[layer], layer)
    out[layer] = tex(c, layer === 'color')
  }
  return { map: out.color, orm: out.orm, bump: out.bump }
}

/** Deterministic PRNG so textures are identical on every load. */
export function rng(seed = 1) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const GLYPH_FONT = '"Noto Sans Egyptian Hieroglyphs"'
// Decorative signs only — arranged for texture, not as readable text.
const GLYPHS = '𓀀𓁐𓂀𓂝𓃀𓃭𓄿𓅓𓅱𓆣𓆑𓇋𓇳𓈖𓉐𓊃𓊪𓋹𓌀𓍯𓎛𓏏𓐍𓊽𓋴𓆓𓇯𓅃𓃾𓂧𓁹𓄤𓆄𓇓𓈙𓉔𓊖𓋞𓌳𓍿𓎟𓏤'.match(/./gu)!

/* ------------------------------------------------------------------------- */
/* Mask                                                                       */
/* ------------------------------------------------------------------------- */

/** Horizontal gold / lapis stripes of the nemes headdress; v maps to height. */
export function nemesTexture(yTop: number, yBottom: number, band: number): PBRSet {
  const W = 64
  const H = 2048
  const toY = (y: number) => ((yTop - y) / (yTop - yBottom)) * H
  return paint(W, H, (ctx, s) => {
    ctx.fillStyle = s('gold')
    ctx.fillRect(0, 0, W, H)
    const bandTop = band + 0.065
    const bandBottom = band - 0.025
    const period = 0.1
    const blue = 0.5
    const stripe = (y0: number) => {
      const a = toY(y0)
      const b = toY(y0 - period * blue)
      ctx.fillStyle = s('gap')
      ctx.fillRect(0, a - 1.5, W, b - a + 3)
      ctx.fillStyle = s('glassBlue')
      ctx.fillRect(0, a + 1.5, W, b - a - 3)
    }
    for (let y = bandBottom - 0.03; y > yBottom - period; y -= period) stripe(y)
    for (let y = bandTop + period * 0.85; y < yTop + period; y += period) stripe(y)
    // Headband: a raised gold fillet across the brow.
    ctx.fillStyle = s('gap')
    ctx.fillRect(0, toY(bandTop) - 2, W, 2)
    ctx.fillRect(0, toY(bandBottom), W, 2)
  })
}

/** Concentric cloisonné rows of the broad (usekh) collar, for planar ring UVs. */
export function collarTexture(inner: number, outer: number): PBRSet {
  const S = 1024
  const c = S / 2
  const k = c / outer
  const rand = rng(7)
  return paint(S, S, (ctx, s) => {
    ctx.fillStyle = s('gold')
    ctx.fillRect(0, 0, S, S)
    const span = outer - inner
    const at = (f: number) => (inner + span * f) * k
    const rows: [number, number, Mat][] = [
      [0.04, 0.13, 'lapis'],
      [0.155, 0.245, 'turquoise'],
      [0.27, 0.36, 'carnelian'],
      [0.385, 0.475, 'glassBlue'],
      [0.5, 0.59, 'turquoise'],
      [0.615, 0.705, 'lapis'],
    ]
    for (const [f0, f1, mat] of rows) {
      const r0 = at(f0)
      const r1 = at(f1)
      const rm = (r0 + r1) / 2
      const n = Math.round((Math.PI * 2 * rm) / ((r1 - r0) * 0.62))
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2
        const a1 = ((i + 1) / n) * Math.PI * 2
        const g = 0.012
        ctx.beginPath()
        ctx.arc(c, c, r1 - 2, a0 + g, a1 - g)
        ctx.arc(c, c, r0 + 2, a1 - g, a0 + g, true)
        ctx.closePath()
        ctx.fillStyle = s('gap')
        ctx.fill()
        ctx.beginPath()
        ctx.arc(c, c, r1 - 4, a0 + g * 1.6, a1 - g * 1.6)
        ctx.arc(c, c, r0 + 4, a1 - g * 1.6, a0 + g * 1.6, true)
        ctx.closePath()
        ctx.fillStyle = s(mat)
        ctx.fill()
      }
    }
    // Outer row of teardrop pendants.
    const r0 = at(0.74)
    const r1 = at(0.95)
    const drops = 120
    const dropMats: Mat[] = ['carnelian', 'lapis', 'turquoise', 'lapis']
    for (let i = 0; i < drops; i++) {
      const a = (i / drops) * Math.PI * 2
      const cos = Math.cos(a)
      const sin = Math.sin(a)
      const w = ((Math.PI * 2 * r1) / drops) * 0.36
      ctx.save()
      ctx.translate(c + cos * r0, c + sin * r0)
      ctx.rotate(a - Math.PI / 2)
      const len = r1 - r0
      ctx.beginPath()
      ctx.moveTo(0, 2)
      ctx.bezierCurveTo(w * 1.1, len * 0.35, w * 1.15, len * 0.85, 0, len)
      ctx.bezierCurveTo(-w * 1.15, len * 0.85, -w * 1.1, len * 0.35, 0, 2)
      ctx.fillStyle = s('gap')
      ctx.fill()
      ctx.scale(0.8, 0.9)
      ctx.translate(0, len * 0.06)
      ctx.fillStyle = s(dropMats[i % dropMats.length])
      ctx.fill()
      ctx.restore()
    }
    // Faint hammer marks on the gold.
    ctx.globalAlpha = 0.08
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = s(rand() > 0.5 ? 'goldMatte' : 'gold')
      ctx.beginPath()
      ctx.arc(rand() * S, rand() * S, 2 + rand() * 6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  })
}

/** Plaited beard: lapis chevrons in gold, along the tube. */
export function beardTexture(): PBRSet {
  const W = 512
  const H = 1024
  return paint(W, H, (ctx, s) => {
    ctx.fillStyle = s('gold')
    ctx.fillRect(0, 0, W, H)
    const rows = 22
    const rowH = (H * 0.86) / rows
    const top = H * 0.07
    ctx.lineWidth = rowH * 0.42
    ctx.lineCap = 'butt'
    for (let r = 0; r < rows; r++) {
      const y = top + r * rowH
      for (let rep = 0; rep < 2; rep++) {
        const x0 = rep * (W / 2)
        for (const [style, width] of [
          ['gap', rowH * 0.56],
          ['lapis', rowH * 0.4],
        ] as [Mat, number][]) {
          ctx.lineWidth = width
          ctx.strokeStyle = s(style)
          ctx.beginPath()
          ctx.moveTo(x0, y)
          ctx.lineTo(x0 + W / 4, y + rowH * 0.7)
          ctx.lineTo(x0 + W / 2, y)
          ctx.stroke()
        }
      }
    }
  })
}

/** Almond eye inlay: quartz white, obsidian iris, carnelian-tinted corners. */
export function eyeTexture(): CanvasTexture {
  const c = canvas(256, 128)
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 256, 0)
  g.addColorStop(0, '#b8604a')
  g.addColorStop(0.14, '#e9dfcc')
  g.addColorStop(0.86, '#e9dfcc')
  g.addColorStop(1, '#b45c46')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 128)
  ctx.fillStyle = '#08080b'
  ctx.beginPath()
  ctx.arc(128, 54, 40, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  ctx.beginPath()
  ctx.arc(116, 40, 8, 0, Math.PI * 2)
  ctx.fill()
  return tex(c, true)
}

/** Fine hammered-metal roughness variation for plain gold surfaces. */
export function hammeredRoughness(): CanvasTexture {
  const S = 512
  const c = canvas(S, S)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = 'rgb(255,66,255)'
  ctx.fillRect(0, 0, S, S)
  const rand = rng(3)
  ctx.filter = 'blur(6px)'
  for (let i = 0; i < 700; i++) {
    const v = 52 + rand() * 30
    ctx.fillStyle = `rgba(255,${v | 0},255,0.25)`
    ctx.beginPath()
    ctx.arc(rand() * S, rand() * S, 10 + rand() * 26, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.filter = 'none'
  const t = tex(c, false)
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/* ------------------------------------------------------------------------- */
/* Artifacts                                                                  */
/* ------------------------------------------------------------------------- */

function djed(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const shaft = w * 0.36
  ctx.fillRect(x - shaft / 2, y + h * 0.3, shaft, h * 0.62)
  ctx.fillRect(x - w * 0.48, y + h * 0.92, w * 0.96, h * 0.08)
  for (let i = 0; i < 4; i++) ctx.fillRect(x - w / 2, y + h * (0.06 + i * 0.065), w, h * 0.04)
  ctx.beginPath()
  ctx.moveTo(x - w * 0.42, y + h * 0.31)
  ctx.lineTo(x + w * 0.42, y + h * 0.31)
  ctx.lineTo(x + shaft / 2, y + h * 0.36)
  ctx.lineTo(x - shaft / 2, y + h * 0.36)
  ctx.fill()
  ctx.fillRect(x - shaft * 0.7, y, shaft * 1.4, h * 0.05)
}

function tyet(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath()
  ctx.ellipse(x, y + h * 0.14, w * 0.22, h * 0.13, 0, 0, Math.PI * 2)
  ctx.ellipse(x, y + h * 0.15, w * 0.1, h * 0.07, 0, 0, Math.PI * 2, true)
  ctx.fill('evenodd')
  ctx.beginPath()
  ctx.moveTo(x - w * 0.5, y + h * 0.3)
  ctx.lineTo(x + w * 0.5, y + h * 0.3)
  ctx.lineTo(x + w * 0.42, y + h * 0.48)
  ctx.lineTo(x + w * 0.3, y + h * 0.37)
  ctx.lineTo(x + w * 0.12, y + h * 0.37)
  ctx.lineTo(x + w * 0.3, y + h)
  ctx.lineTo(x - w * 0.3, y + h)
  ctx.lineTo(x - w * 0.12, y + h * 0.37)
  ctx.lineTo(x - w * 0.3, y + h * 0.37)
  ctx.lineTo(x - w * 0.42, y + h * 0.48)
  ctx.closePath()
  ctx.fill()
}

/** Gilded panel with alternating djed pillars and tyet knots (Anubis shrine). */
export function djedTyetTexture(count: number, w = 1024, h = 512): PBRSet {
  return paint(w, h, (ctx, s) => {
    ctx.fillStyle = s('goldMatte')
    ctx.fillRect(0, 0, w, h)
    const m = h * 0.07
    ctx.strokeStyle = s('gold')
    ctx.lineWidth = h * 0.05
    ctx.strokeRect(m, m, w - 2 * m, h - 2 * m)
    ctx.strokeStyle = s('gap')
    ctx.lineWidth = 2
    ctx.strokeRect(m * 1.5, m * 1.5, w - 3 * m, h - 3 * m)
    const cw = (w - 4 * m) / count
    for (let i = 0; i < count; i++) {
      const x = 2 * m + cw * (i + 0.5)
      const sw = cw * 0.62
      const sh = h - 5.2 * m
      ctx.fillStyle = s('gap')
      ctx.save()
      ctx.translate(2, 2)
      if (i % 2 === 0) djed(ctx, x, 2.6 * m, sw, sh)
      else tyet(ctx, x, 2.6 * m, sw, sh)
      ctx.restore()
      ctx.fillStyle = s('gold')
      if (i % 2 === 0) djed(ctx, x, 2.6 * m, sw, sh)
      else tyet(ctx, x, 2.6 * m, sw, sh)
    }
  })
}

/** Gilded panel with raised columns of decorative signs (canopic shrine walls). */
export function glyphPanelTexture(seed = 11, w = 512, h = 640): PBRSet {
  const rand = rng(seed)
  const picks = Array.from({ length: 80 }, () => GLYPHS[Math.floor(rand() * GLYPHS.length)])
  return paint(w, h, (ctx, s) => {
    ctx.fillStyle = s('goldMatte')
    ctx.fillRect(0, 0, w, h)
    const m = 26
    ctx.strokeStyle = s('gold')
    ctx.lineWidth = 14
    ctx.strokeRect(m, m, w - 2 * m, h - 2 * m)
    const cols = 6
    const cw = (w - 2 * m - 20) / cols
    ctx.font = `${cw * 0.62}px ${GLYPH_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let k = 0
    for (let c = 0; c < cols; c++) {
      const x = m + 10 + cw * (c + 0.5)
      ctx.fillStyle = s('gap')
      ctx.fillRect(x + cw / 2 - 1, m + 18, 2, h - 2 * m - 36)
      for (let r = 0; r < 7; r++) {
        const y = m + 50 + r * ((h - 2 * m - 80) / 6.4)
        const g = picks[k++ % picks.length]
        ctx.fillStyle = s('gap')
        ctx.fillText(g, x + 2, y + 2)
        ctx.fillStyle = s('gold')
        ctx.fillText(g, x, y)
      }
    }
  })
}

/** Rows of feathers for the winged-cobra arms of the throne. */
export function featherTexture(): PBRSet {
  const W = 512
  const H = 512
  return paint(W, H, (ctx, s) => {
    ctx.fillStyle = s('gold')
    ctx.fillRect(0, 0, W, H)
    const mats: Mat[] = ['lapis', 'turquoise', 'carnelian']
    const rows = 5
    for (let r = 0; r < rows; r++) {
      const y0 = 20 + r * 52
      const n = 14
      for (let i = 0; i < n; i++) {
        const x = 10 + i * (W / n)
        ctx.fillStyle = s('gap')
        ctx.beginPath()
        ctx.roundRect(x, y0, W / n - 6, 46, [0, 0, 18, 18])
        ctx.fill()
        ctx.fillStyle = s(mats[(r + i) % 3])
        ctx.beginPath()
        ctx.roundRect(x + 3, y0 + 3, W / n - 12, 40, [0, 0, 15, 15])
        ctx.fill()
      }
    }
    // Long flight feathers.
    for (let i = 0; i < 22; i++) {
      const x = 8 + i * (W / 22)
      ctx.fillStyle = s('gap')
      ctx.fillRect(x, 290, W / 22 - 5, 210)
      ctx.fillStyle = s(i % 2 ? 'lapis' : 'turquoise')
      ctx.beginPath()
      ctx.roundRect(x + 2, 292, W / 22 - 9, 204, [0, 0, 10, 10])
      ctx.fill()
    }
  })
}

function figureCollar(ctx: CanvasRenderingContext2D, s: Style, x: number, y: number, r: number) {
  const bands: Mat[] = ['turquoise', 'gold', 'carnelian', 'gold', 'lapis', 'gold']
  bands.forEach((m, i) => {
    ctx.fillStyle = s(m)
    ctx.beginPath()
    ctx.ellipse(x, y, r * (1 - i * 0.12), r * 0.62 * (1 - i * 0.12), 0, 0, Math.PI)
    ctx.fill()
  })
}

/**
 * The throne backrest scene: Ankhesenamun touching Tutankhamun's shoulder under
 * the Aten's rays. An illustrative rendering of the composition, not a copy.
 */
export function throneSceneTexture(): PBRSet {
  const W = 1024
  const H = 1152
  return paint(W, H, (ctx, s) => {
    ctx.fillStyle = s('gold')
    ctx.fillRect(0, 0, W, H)
    // Inlaid frame.
    const f = 36
    const cells: Mat[] = ['lapis', 'carnelian', 'turquoise', 'carnelian']
    const cell = 40
    for (let i = 0, x = 0; x < W; i++, x += cell) {
      for (const y of [0, H - f]) {
        ctx.fillStyle = s('gap')
        ctx.fillRect(x, y, cell, f)
        ctx.fillStyle = s(cells[i % 4])
        ctx.fillRect(x + 4, y + 4, cell - 8, f - 8)
      }
    }
    for (let i = 0, y = 0; y < H; i++, y += cell) {
      for (const x of [0, W - f]) {
        ctx.fillStyle = s('gap')
        ctx.fillRect(x, y, f, cell)
        ctx.fillStyle = s(cells[(i + 1) % 4])
        ctx.fillRect(x + 4, y + 4, f - 8, cell - 8)
      }
    }
    // Frieze of rearing cobras.
    for (let i = 0; i < 18; i++) {
      const x = f + 28 + i * ((W - 2 * f - 56) / 17)
      ctx.fillStyle = s('gap')
      ctx.beginPath()
      ctx.ellipse(x, 92, 15, 30, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = s(i % 2 ? 'lapis' : 'turquoise')
      ctx.beginPath()
      ctx.ellipse(x, 94, 11, 25, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = s('carnelian')
      ctx.beginPath()
      ctx.arc(x, 52, 9, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = s('gap')
    ctx.fillRect(f, 130, W - 2 * f, 4)

    // The Aten and its rays.
    const ax = 512
    const ay = 250
    ctx.strokeStyle = s('goldDark')
    ctx.lineCap = 'round'
    for (let i = 0; i < 15; i++) {
      const a = Math.PI * (0.16 + (i / 14) * 0.68)
      const len = 300 + Math.sin(i * 1.7) * 30 + (i % 2) * 60
      const x2 = ax + Math.cos(a) * len
      const y2 = ay + Math.sin(a) * len
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(ax + Math.cos(a) * 70, ay + Math.sin(a) * 70)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.fillStyle = s('goldDark')
      ctx.beginPath()
      ctx.ellipse(x2, y2, 9, 13, a - Math.PI / 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = s('gap')
    ctx.beginPath()
    ctx.arc(ax, ay, 74, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = s('carnelian')
    ctx.beginPath()
    ctx.arc(ax, ay, 66, 0, Math.PI * 2)
    ctx.fill()

    // Cartouches: Nebkheperure, the throne name.
    for (const cx of [300, 724]) {
      ctx.strokeStyle = s('gap')
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.roundRect(cx - 34, 170, 68, 190, 34)
      ctx.stroke()
      ctx.fillRect(cx - 40, 362, 80, 7)
      ctx.fillStyle = s('lapis')
      ctx.font = `46px ${GLYPH_FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ;['𓇳', '𓆣', '𓏥', '𓎟'].forEach((g, i) => ctx.fillText(g, cx, 202 + i * 42))
    }

    const ground = 1060
    ctx.fillStyle = s('gap')
    ctx.fillRect(f, ground, W - 2 * f, 6)

    // --- The king, seated, facing right ---
    const kx = 330
    ctx.fillStyle = s('goldDark')
    ctx.fillRect(kx - 110, 760, 22, ground - 760) // chair leg
    ctx.fillRect(kx + 60, 800, 22, ground - 800)
    ctx.fillRect(kx - 120, 560, 24, 220) // chair back
    ctx.fillStyle = s('lapis')
    ctx.beginPath()
    ctx.roundRect(kx - 120, 755, 210, 40, 18)
    ctx.fill()
    // legs
    ctx.fillStyle = s('skin')
    ctx.beginPath()
    ctx.roundRect(kx + 92, 830, 34, ground - 840, 12)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(kx + 130, ground - 12, 34, 11, 0, 0, Math.PI * 2)
    ctx.fill()
    // kilt over the lap
    ctx.fillStyle = s('silver')
    ctx.beginPath()
    ctx.moveTo(kx - 70, 690)
    ctx.lineTo(kx + 20, 690)
    ctx.lineTo(kx + 140, 770)
    ctx.lineTo(kx + 140, 845)
    ctx.lineTo(kx - 80, 820)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = s('gap')
    ctx.lineWidth = 2
    for (let i = 0; i < 6; i++) {
      ctx.beginPath()
      ctx.moveTo(kx - 60 + i * 30, 700)
      ctx.lineTo(kx - 30 + i * 32, 830)
      ctx.stroke()
    }
    // torso
    ctx.fillStyle = s('skin')
    ctx.beginPath()
    ctx.moveTo(kx - 62, 548)
    ctx.lineTo(kx + 46, 548)
    ctx.lineTo(kx + 22, 700)
    ctx.lineTo(kx - 58, 700)
    ctx.closePath()
    ctx.fill()
    // arm resting forward on the lap
    ctx.beginPath()
    ctx.roundRect(kx + 10, 580, 26, 120, 12)
    ctx.fill()
    ctx.beginPath()
    ctx.roundRect(kx + 14, 680, 110, 24, 12)
    ctx.fill()
    figureCollar(ctx, s, kx - 8, 552, 62)
    // head
    ctx.fillStyle = s('skin')
    ctx.beginPath()
    ctx.ellipse(kx - 2, 492, 40, 48, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(kx + 34, 480)
    ctx.lineTo(kx + 50, 500)
    ctx.lineTo(kx + 34, 508)
    ctx.fill()
    // crown: ram horns, cobras and plumes (simplified)
    ctx.fillStyle = s('lapis')
    ctx.beginPath()
    ctx.ellipse(kx - 12, 470, 46, 34, 0, Math.PI, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = s('goldDark')
    ctx.fillRect(kx - 70, 430, 116, 8)
    ctx.beginPath()
    ctx.moveTo(kx - 30, 430)
    ctx.lineTo(kx - 18, 330)
    ctx.lineTo(kx - 4, 430)
    ctx.moveTo(kx, 430)
    ctx.lineTo(kx + 12, 330)
    ctx.lineTo(kx + 26, 430)
    ctx.fill()
    ctx.fillStyle = s('carnelian')
    ctx.beginPath()
    ctx.arc(kx - 3, 410, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = s('white')
    ctx.beginPath()
    ctx.ellipse(kx + 18, 486, 8, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    // --- The queen, standing, facing left ---
    const qx = 690
    ctx.fillStyle = s('skin')
    ctx.beginPath()
    ctx.ellipse(qx - 26, ground - 10, 30, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = s('silver')
    ctx.beginPath()
    ctx.moveTo(qx - 42, 560)
    ctx.lineTo(qx + 44, 560)
    ctx.lineTo(qx + 66, ground - 14)
    ctx.lineTo(qx - 70, ground - 14)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = s('gap')
    ctx.lineWidth = 2
    for (let i = 0; i < 7; i++) {
      ctx.beginPath()
      ctx.moveTo(qx - 30 + i * 11, 640)
      ctx.lineTo(qx - 64 + i * 21, ground - 20)
      ctx.stroke()
    }
    ctx.fillStyle = s('skin')
    // extended arm towards the king's shoulder
    ctx.save()
    ctx.translate(qx - 30, 585)
    ctx.rotate(Math.PI + 0.28)
    ctx.beginPath()
    ctx.roundRect(0, -12, 300, 24, 12)
    ctx.fill()
    ctx.restore()
    // other arm holding an unguent cup
    ctx.beginPath()
    ctx.roundRect(qx + 18, 590, 24, 110, 12)
    ctx.fill()
    ctx.fillStyle = s('goldDark')
    ctx.beginPath()
    ctx.ellipse(qx + 6, 700, 26, 12, 0, 0, Math.PI)
    ctx.fill()
    figureCollar(ctx, s, qx, 562, 58)
    ctx.fillStyle = s('skin')
    ctx.beginPath()
    ctx.ellipse(qx, 500, 36, 44, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(qx - 32, 492)
    ctx.lineTo(qx - 46, 510)
    ctx.lineTo(qx - 32, 516)
    ctx.fill()
    ctx.fillStyle = s('lapis')
    ctx.beginPath()
    ctx.moveTo(qx - 26, 462)
    ctx.quadraticCurveTo(qx + 10, 440, qx + 46, 470)
    ctx.lineTo(qx + 50, 590)
    ctx.lineTo(qx + 14, 590)
    ctx.lineTo(qx + 8, 520)
    ctx.closePath()
    ctx.fill()
    // crown: twin plumes, sun disc and horns
    ctx.fillStyle = s('goldDark')
    ctx.fillRect(qx - 40, 450, 90, 8)
    ctx.beginPath()
    ctx.moveTo(qx - 4, 450)
    ctx.lineTo(qx + 2, 300)
    ctx.lineTo(qx + 16, 300)
    ctx.lineTo(qx + 16, 450)
    ctx.moveTo(qx + 18, 450)
    ctx.lineTo(qx + 22, 300)
    ctx.lineTo(qx + 36, 300)
    ctx.lineTo(qx + 34, 450)
    ctx.fill()
    ctx.fillStyle = s('carnelian')
    ctx.beginPath()
    ctx.arc(qx + 17, 426, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = s('white')
    ctx.beginPath()
    ctx.ellipse(qx - 16, 494, 7, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    // Papyrus stalks at either side.
    for (const px of [f + 40, W - f - 40]) {
      ctx.strokeStyle = s('green')
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(px, ground)
      ctx.lineTo(px, 520)
      ctx.stroke()
      ctx.fillStyle = s('green')
      ctx.beginPath()
      ctx.moveTo(px, 525)
      ctx.lineTo(px - 32, 450)
      ctx.quadraticCurveTo(px, 430, px + 32, 450)
      ctx.closePath()
      ctx.fill()
    }
  })
}

/* ------------------------------------------------------------------------- */
/* Atmosphere                                                                 */
/* ------------------------------------------------------------------------- */

/** Columns of carved signs for the tomb wall (decorative arrangement). */
export function hieroglyphWallTexture(): Texture {
  const W = 2048
  const H = 1024
  const c = canvas(W, H)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  const rand = rng(21)
  const cols = 30
  const cw = W / cols
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 3
  // Soft focus baked in, so the wall reads as distant and out of focus.
  ctx.filter = 'blur(5px)'
  // Upper register border.
  ctx.fillRect(0, 60, W, 6)
  ctx.fillRect(0, H - 66, W, 6)
  for (let i = 0; i < cols; i++) {
    const x = cw * (i + 0.5)
    ctx.beginPath()
    ctx.moveTo(cw * i, 80)
    ctx.lineTo(cw * i, H - 80)
    ctx.stroke()
    let y = 120
    while (y < H - 120) {
      const size = cw * (0.5 + rand() * 0.25)
      ctx.font = `${size}px ${GLYPH_FONT}`
      ctx.fillText(GLYPHS[Math.floor(rand() * GLYPHS.length)], x, y)
      y += size * (0.95 + rand() * 0.3)
    }
  }
  ctx.filter = 'none'
  const t = tex(c, false)
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/** Soft radial glow used for the light pools under the artifacts. */
export function radialGlowTexture(): CanvasTexture {
  const c = canvas(256, 256)
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return tex(c, true)
}
