import { CanvasTexture, SRGBColorSpace } from 'three'
import { rng } from './textures'

/*
 * Painted backdrops, one per chamber of the story. They are illustrated evocations
 * drawn from descriptions and excavation photographs, not copies of any photograph:
 *  - the Valley of the Kings at night, under the pyramid-shaped peak of el-Qurn;
 *  - the Antechamber's north wall: the sealed doorway, stamped with seal impressions
 *    and patched where robbers broke in, between the two black-and-gold guardians;
 *  - the Antechamber's west side as Carter found it, heaped with treasures: the three
 *    animal-headed ritual couches, boxes stacked on and beneath them, and the
 *    dismantled chariots piled against the wall;
 *  - the Burial Chamber's ochre walls, the only painted room in the tomb, with the
 *    twelve baboons of the west wall and the brown spots that still mark its paint.
 * All are drawn on a 2048 × 1024 design grid and blurred by the shader, not here.
 */

const W = 2048
const H = 1024
const GLYPH_FONT = '"Noto Sans Egyptian Hieroglyphs"'
type Ctx = CanvasRenderingContext2D
type Rand = () => number

function surface(scale: number) {
  const c = document.createElement('canvas')
  c.width = Math.round(W * scale)
  c.height = Math.round(H * scale)
  const ctx = c.getContext('2d')!
  ctx.scale(scale, scale)
  return { c, ctx }
}

function done(c: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  t.needsUpdate = true
  return t
}

/** Plaster or paint that has aged unevenly: soft light and dark blotches. */
function mottle(ctx: Ctx, rand: Rand, base: string, light: string, dark: string, count: number) {
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < count; i++) {
    const x = rand() * W
    const y = rand() * H
    const r = 40 + rand() * 240
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, rand() < 0.5 ? light : dark)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.08 + rand() * 0.14
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  ctx.globalAlpha = 1
}

function speckle(ctx: Ctx, rand: Rand, n: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rand() < 0.55 ? `rgba(0,0,0,${alpha * rand()})` : `rgba(255,236,200,${alpha * rand()})`
    const s = 1 + rand() * 2
    ctx.fillRect(rand() * W, rand() * H, s, s)
  }
}

function cracks(ctx: Ctx, rand: Rand, n: number, color: string) {
  ctx.strokeStyle = color
  for (let i = 0; i < n; i++) {
    let x = rand() * W
    let y = rand() * H
    let a = rand() * Math.PI * 2
    ctx.lineWidth = 0.8 + rand() * 1.6
    ctx.beginPath()
    ctx.moveTo(x, y)
    const steps = 6 + Math.floor(rand() * 14)
    for (let k = 0; k < steps; k++) {
      a += (rand() - 0.5) * 1.1
      x += Math.cos(a) * (8 + rand() * 22)
      y += Math.sin(a) * (8 + rand() * 22)
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

function poly(ctx: Ctx, pts: number[][], fill: string) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** A jagged skyline from left to right, closed down to the bottom of the canvas. */
function ridge(ctx: Ctx, rand: Rand, pts: number[][], rough: number, fill: string | CanvasGradient) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], H)
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    const n = Math.max(2, Math.round((x1 - x0) / 18))
    for (let k = 0; k < n; k++) {
      const t = k / n
      ctx.lineTo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + (rand() - 0.5) * rough)
    }
  }
  const last = pts[pts.length - 1]
  ctx.lineTo(last[0], last[1])
  ctx.lineTo(last[0], H)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/* ------------------------------------------------------------------------- */
/* Prologue: the Valley of the Kings at night                                 */
/* ------------------------------------------------------------------------- */

export function valleyScene(scale: number): CanvasTexture {
  const { c, ctx } = surface(scale)
  const rand = rng(301)
  const sky = ctx.createLinearGradient(0, 0, 0, 820)
  sky.addColorStop(0, '#060912')
  sky.addColorStop(0.6, '#121524')
  sky.addColorStop(1, '#2c2126')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // Moonlight from the upper left gives the rock its rim.
  const moon = ctx.createRadialGradient(330, 150, 0, 330, 150, 520)
  moon.addColorStop(0, 'rgba(220,214,190,0.35)')
  moon.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = moon
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 1300; i++) {
    const y = Math.pow(rand(), 1.7) * 760
    const r = 0.5 + Math.pow(rand(), 3) * 1.9
    ctx.fillStyle = `rgba(255,244,222,${0.25 + rand() * 0.7})`
    ctx.beginPath()
    ctx.arc(rand() * W, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  ridge(ctx, rand, [[0, 660], [420, 610], [900, 650], [1500, 600], [2048, 640]], 10, '#191418')
  // el-Qurn, the peak shaped like a pyramid by nature, with its bands of limestone.
  const rock = ctx.createLinearGradient(600, 0, 2000, 0)
  rock.addColorStop(0, '#3a2c22')
  rock.addColorStop(0.42, '#2c221a')
  rock.addColorStop(1, '#17110d')
  const peak = [
    [560, 830], [700, 760], [820, 702], [905, 655], [962, 602], [1012, 560], [1056, 516], [1104, 468], [1152, 410], [1200, 352],
    [1240, 324], [1272, 318], [1300, 334], [1342, 376], [1398, 418], [1452, 436], [1522, 468], [1584, 520], [1664, 578],
    [1764, 638], [1884, 698], [2048, 756],
  ]
  ridge(ctx, rand, peak, 18, rock)
  ctx.save()
  ctx.clip()
  // Broken bands of limestone and the gullies that rain has cut down the slopes.
  for (let i = 0; i < 70; i++) {
    const y = 340 + rand() * 480
    const x = 560 + rand() * 1400
    ctx.strokeStyle = rand() < 0.5 ? 'rgba(130,104,78,0.22)' : 'rgba(6,4,3,0.32)'
    ctx.lineWidth = 2 + rand() * 4
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 1; k < 6; k++) ctx.lineTo(x + k * (30 + rand() * 30), y + (rand() - 0.5) * 8)
    ctx.stroke()
  }
  for (let i = 0; i < 26; i++) {
    let x = 820 + rand() * 1000
    let y = 380 + rand() * 200
    ctx.strokeStyle = 'rgba(4,3,2,0.35)'
    ctx.lineWidth = 3 + rand() * 6
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < 8; k++) {
      x += (rand() - 0.5) * 30
      y += 30 + rand() * 30
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()
  // Moonlight catching only the western ridge.
  ctx.strokeStyle = 'rgba(214,196,160,0.35)'
  ctx.lineWidth = 3
  ctx.beginPath()
  peak.slice(0, 12).forEach(([x, y], k) => (k ? ctx.lineTo(x, y + 2) : ctx.moveTo(x, y + 2)))
  ctx.stroke()
  // Nearer cliffs, darker, framing the valley floor.
  ridge(ctx, rand, [[0, 500], [240, 540], [520, 620], [820, 760], [1000, 860]], 22, '#110c0a')
  ridge(ctx, rand, [[1180, 880], [1450, 780], [1700, 640], [1900, 560], [2048, 520]], 22, '#130e0b')
  const floor = ctx.createLinearGradient(0, 840, 0, H)
  floor.addColorStop(0, '#16100c')
  floor.addColorStop(1, '#0a0705')
  ctx.fillStyle = floor
  ctx.fillRect(0, 860, W, H - 860)

  // The cutting where sixteen steps lead down: lamplight rising from below ground.
  const lamp = ctx.createRadialGradient(570, 905, 0, 570, 880, 220)
  lamp.addColorStop(0, 'rgba(255,186,96,0.6)')
  lamp.addColorStop(0.35, 'rgba(255,150,70,0.16)')
  lamp.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = lamp
  ctx.fillRect(350, 680, 440, 344)
  poly(ctx, [[478, 902], [662, 902], [650, 918], [490, 918]], '#050302')
  ctx.fillStyle = 'rgba(255,196,120,0.55)'
  ctx.fillRect(478, 899, 184, 3)
  speckle(ctx, rand, 9000, 0.12)
  return done(c)
}

/* ------------------------------------------------------------------------- */
/* Chapter I: the Antechamber's north wall                                    */
/* ------------------------------------------------------------------------- */

const GOLD = '#c9a04a'
const GOLD_HI = '#ecca78'
const BLACK = '#0c0907'

/** One of the two life-size guardian statues: black resin, gilded kilt, collar and headcloth. */
function guardian(ctx: Ctx, cx: number, base: number, u: number, flip: 1 | -1) {
  const X = (x: number) => cx + x * u * flip
  const Y = (y: number) => base - y * u
  poly(ctx, [[X(-0.17), Y(0)], [X(0.19), Y(0)], [X(0.19), Y(0.035)], [X(-0.17), Y(0.035)]], BLACK)
  // Striding legs, the left foot forward.
  poly(ctx, [[X(-0.075), Y(0.45)], [X(-0.012), Y(0.45)], [X(-0.03), Y(0.05)], [X(-0.085), Y(0.05)]], BLACK)
  poly(ctx, [[X(0.012), Y(0.45)], [X(0.075), Y(0.45)], [X(0.085), Y(0.035)], [X(0.03), Y(0.035)]], BLACK)
  poly(ctx, [[X(-0.09), Y(0.06)], [X(-0.02), Y(0.06)], [X(-0.02), Y(0.035)], [X(-0.095), Y(0.035)]], GOLD)
  poly(ctx, [[X(0.025), Y(0.05)], [X(0.095), Y(0.05)], [X(0.1), Y(0.035)], [X(0.02), Y(0.035)]], GOLD)
  // Torso and arms.
  poly(ctx, [[X(-0.085), Y(0.6)], [X(0.085), Y(0.6)], [X(0.13), Y(0.79)], [X(0.1), Y(0.81)], [X(-0.1), Y(0.81)], [X(-0.13), Y(0.79)]], BLACK)
  poly(ctx, [[X(-0.13), Y(0.79)], [X(-0.1), Y(0.79)], [X(-0.12), Y(0.55)], [X(-0.155), Y(0.55)]], BLACK)
  poly(ctx, [[X(0.1), Y(0.79)], [X(0.13), Y(0.79)], [X(0.17), Y(0.6)], [X(0.14), Y(0.58)]], BLACK)
  // Staff in the forward hand, mace in the other.
  poly(ctx, [[X(0.15), Y(0.02)], [X(0.165), Y(0.02)], [X(0.165), Y(1.02)], [X(0.15), Y(1.02)]], GOLD)
  poly(ctx, [[X(-0.142), Y(0.56)], [X(-0.13), Y(0.56)], [X(-0.15), Y(0.42)], [X(-0.162), Y(0.42)]], GOLD)
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.ellipse(X(-0.158), Y(0.4), 0.022 * u, 0.03 * u, 0, 0, Math.PI * 2)
  ctx.fill()
  // Kilt with its projecting front panel.
  poly(ctx, [[X(-0.09), Y(0.61)], [X(0.09), Y(0.61)], [X(0.11), Y(0.42)], [X(-0.105), Y(0.42)]], GOLD)
  poly(ctx, [[X(-0.035), Y(0.6)], [X(0.035), Y(0.6)], [X(0.06), Y(0.39)], [X(-0.04), Y(0.39)]], GOLD_HI)
  ctx.strokeStyle = 'rgba(80,52,16,0.6)'
  ctx.lineWidth = 2
  for (let k = 0; k < 7; k++) {
    ctx.beginPath()
    ctx.moveTo(X(-0.08 + k * 0.026), Y(0.6))
    ctx.lineTo(X(-0.095 + k * 0.032), Y(0.43))
    ctx.stroke()
  }
  // Broad collar, bracelets, headcloth, face.
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.ellipse(cx, Y(0.8), 0.115 * u, 0.065 * u, 0, 0, Math.PI)
  ctx.fill()
  poly(ctx, [[X(-0.157), Y(0.6)], [X(-0.12), Y(0.6)], [X(-0.12), Y(0.58)], [X(-0.158), Y(0.58)]], GOLD)
  poly(ctx, [[X(0.135), Y(0.62)], [X(0.17), Y(0.62)], [X(0.172), Y(0.6)], [X(0.14), Y(0.6)]], GOLD)
  poly(ctx, [[X(-0.06), Y(0.96)], [X(0.06), Y(0.96)], [X(0.095), Y(0.8)], [X(-0.095), Y(0.8)]], GOLD)
  poly(ctx, [[X(-0.025), Y(0.84)], [X(0.025), Y(0.84)], [X(0.022), Y(0.8)], [X(-0.022), Y(0.8)]], BLACK)
  ctx.fillStyle = BLACK
  ctx.beginPath()
  ctx.ellipse(cx, Y(0.875), 0.042 * u, 0.055 * u, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = GOLD_HI
  for (const e of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(X(e * 0.017), Y(0.885), 0.009 * u, 0.005 * u, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  poly(ctx, [[X(-0.006), Y(0.97)], [X(0.006), Y(0.97)], [X(0.004), Y(0.93)], [X(-0.004), Y(0.93)]], GOLD_HI)
  // Lamplight catching the resin on the side nearer the doorway.
  ctx.strokeStyle = 'rgba(255,214,150,0.22)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(X(-0.13), Y(0.79))
  ctx.lineTo(X(-0.155), Y(0.55))
  ctx.moveTo(X(-0.085), Y(0.45))
  ctx.lineTo(X(-0.095), Y(0.06))
  ctx.stroke()
}

type CouchHead = 'lion' | 'cow' | 'hippo'

/** A gilded ritual couch whose frame is a long-bodied animal: lion, cow or hippopotamus. */
function couch(ctx: Ctx, x0: number, x1: number, base: number, head: CouchHead = 'lion') {
  const top = base - 150
  poly(ctx, [[x0, top], [x1 - 40, top], [x1 - 40, top + 26], [x0, top + 26]], GOLD)
  poly(ctx, [[x0 + 10, top + 26], [x1 - 50, top + 26], [x1 - 50, top + 34], [x0 + 10, top + 34]], '#7a5a22')
  for (const lx of [x0 + 20, x1 - 90]) {
    poly(ctx, [[lx, top + 26], [lx + 34, top + 26], [lx + 28, base - 12], [lx + 6, base - 12]], GOLD)
    poly(ctx, [[lx - 6, base - 14], [lx + 40, base - 14], [lx + 40, base], [lx - 6, base]], GOLD_HI)
  }
  // Neck and head rising at the foot end.
  poly(ctx, [[x1 - 70, top + 26], [x1 - 30, top + 26], [x1 - 10, top - 150], [x1 - 60, top - 150]], GOLD)
  ctx.fillStyle = GOLD_HI
  ctx.beginPath()
  if (head === 'cow') ctx.ellipse(x1 - 30, top - 180, 30, 52, 0.2, 0, Math.PI * 2)
  else ctx.ellipse(x1 - 30, top - 175, 46, 40, 0, 0, Math.PI * 2)
  ctx.fill()
  if (head === 'lion') {
    poly(ctx, [[x1 + 4, top - 190], [x1 + 44, top - 172], [x1 + 4, top - 152]], GOLD)
  } else if (head === 'cow') {
    // Lyre-shaped horns holding the sun disc, spotted with blue inlay on the body.
    ctx.strokeStyle = GOLD
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(x1 - 52, top - 220)
    ctx.quadraticCurveTo(x1 - 80, top - 280, x1 - 40, top - 300)
    ctx.moveTo(x1 - 10, top - 220)
    ctx.quadraticCurveTo(x1 + 18, top - 280, x1 - 20, top - 300)
    ctx.stroke()
    ctx.fillStyle = '#d68a3a'
    ctx.beginPath()
    ctx.arc(x1 - 30, top - 268, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2f4f7a'
    for (let k = 0; k < 6; k++) {
      ctx.beginPath()
      ctx.ellipse(x0 + 60 + k * ((x1 - x0 - 140) / 5), top + 12, 9, 6, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    // The hippopotamus head, jaws open on a row of teeth.
    poly(ctx, [[x1 - 10, top - 196], [x1 + 70, top - 186], [x1 + 66, top - 166], [x1 - 10, top - 168]], GOLD_HI)
    poly(ctx, [[x1 - 10, top - 156], [x1 + 60, top - 150], [x1 + 54, top - 132], [x1 - 14, top - 140]], GOLD)
    ctx.fillStyle = '#efe4c8'
    for (let k = 0; k < 6; k++) ctx.fillRect(x1 + 2 + k * 10, top - 166, 5, 8)
  }
  ctx.fillStyle = BLACK
  ctx.beginPath()
  ctx.ellipse(x1 - 8, top - 182, 7, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  // A tail curling up at the head end.
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.moveTo(x0 + 6, top + 8)
  ctx.quadraticCurveTo(x0 - 40, top - 30, x0 - 4, top - 80)
  ctx.stroke()
}

export function antechamberScene(scale: number): CanvasTexture {
  const { c, ctx } = surface(scale)
  const rand = rng(77)
  mottle(ctx, rand, '#a58b69', '#cdb48c', '#6a5236', 170)
  cracks(ctx, rand, 46, 'rgba(60,40,22,0.45)')
  const ceiling = ctx.createLinearGradient(0, 0, 0, 180)
  ceiling.addColorStop(0, 'rgba(0,0,0,0.6)')
  ceiling.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = ceiling
  ctx.fillRect(0, 0, W, 180)

  // The blocked doorway to the Burial Chamber, plastered and stamped all over.
  const dx0 = 790
  const dx1 = 1258
  const dy0 = 170
  const dy1 = 896
  ctx.fillStyle = '#3e2f20'
  ctx.fillRect(dx0 - 26, dy0 - 26, dx1 - dx0 + 52, dy1 - dy0 + 26)
  ctx.fillStyle = '#8f7a59'
  ctx.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0)
  ctx.strokeStyle = 'rgba(52,34,18,0.5)'
  ctx.lineWidth = 3
  let row = 0
  for (let y = dy0 + 34; y < dy1 - 20; y += 44, row++) {
    for (let x = dx0 + 26 + (row % 2) * 26; x < dx1 - 20; x += 52) {
      ctx.save()
      ctx.translate(x + (rand() - 0.5) * 8, y + (rand() - 0.5) * 8)
      ctx.rotate((rand() - 0.5) * 0.5)
      ctx.beginPath()
      ctx.ellipse(0, 0, 15, 20, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(72,48,26,0.4)'
      ctx.fillRect(-7, -4, 14, 3)
      ctx.fillRect(-5, 3, 10, 2)
      ctx.restore()
    }
  }
  // Where robbers broke through in antiquity, the hole was filled and resealed.
  ctx.fillStyle = 'rgba(190,170,132,0.45)'
  ctx.beginPath()
  ctx.moveTo(dx0 + 40, dy1)
  ctx.quadraticCurveTo(dx0 + 30, dy1 - 210, dx0 + 150, dy1 - 230)
  ctx.quadraticCurveTo(dx0 + 260, dy1 - 220, dx0 + 250, dy1)
  ctx.fill()

  const floor = ctx.createLinearGradient(0, 880, 0, H)
  floor.addColorStop(0, '#3a2b1d')
  floor.addColorStop(1, '#1a120b')
  ctx.fillStyle = floor
  ctx.fillRect(0, 896, W, H - 896)

  guardian(ctx, 640, 905, 700, 1)
  guardian(ctx, 1408, 905, 700, -1)
  couch(ctx, 60, 520, 905)
  // Stacked white food boxes and a chest along the east side.
  ctx.lineWidth = 3
  for (const [x, y, rx, ry] of [
    [1640, 860, 60, 36],
    [1760, 866, 58, 34],
    [1880, 862, 62, 36],
    [1700, 800, 56, 32],
    [1822, 804, 58, 33],
    [1760, 744, 52, 30],
  ]) {
    ctx.fillStyle = '#d4c8ad'
    ctx.strokeStyle = 'rgba(60,44,26,0.7)'
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  poly(ctx, [[1930, 905], [2048, 905], [2048, 760], [1930, 760]], '#2a1c10')
  poly(ctx, [[1924, 770], [2048, 770], [2048, 744], [1936, 744]], GOLD)
  speckle(ctx, rand, 20000, 0.14)
  return done(c)
}

/* ------------------------------------------------------------------------- */
/* Chapter II: the Antechamber heaped with treasures                          */
/* ------------------------------------------------------------------------- */

/** A six-spoked chariot wheel, gilded, seen face on. */
function wheel(ctx: Ctx, x: number, y: number, r: number, tilt: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(Math.cos(tilt), 1)
  ctx.strokeStyle = GOLD
  ctx.lineWidth = r * 0.12
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = r * 0.07
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    ctx.stroke()
  }
  ctx.fillStyle = GOLD_HI
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function treasuresScene(scale: number): CanvasTexture {
  const { c, ctx } = surface(scale)
  const rand = rng(1923)
  mottle(ctx, rand, '#9c8262', '#c4aa82', '#5f4a31', 160)
  cracks(ctx, rand, 40, 'rgba(60,40,22,0.45)')
  const ceiling = ctx.createLinearGradient(0, 0, 0, 200)
  ceiling.addColorStop(0, 'rgba(0,0,0,0.62)')
  ceiling.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = ceiling
  ctx.fillRect(0, 0, W, 200)
  const floor = ctx.createLinearGradient(0, 880, 0, H)
  floor.addColorStop(0, '#3a2b1d')
  floor.addColorStop(1, '#1a120b')
  ctx.fillStyle = floor
  ctx.fillRect(0, 900, W, H - 900)

  // The dismantled chariots: wheels and gilded bodies piled against the wall.
  wheel(ctx, 150, 660, 120, 0.5)
  wheel(ctx, 260, 700, 120, 0.25)
  wheel(ctx, 110, 800, 100, 0.65)
  poly(ctx, [[300, 905], [560, 905], [520, 760], [330, 780]], '#7a5a22')
  poly(ctx, [[318, 892], [548, 892], [512, 772], [340, 790]], GOLD)
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.moveTo(420, 780)
  ctx.lineTo(640, 520)
  ctx.stroke()

  // The three ritual couches in a row, boxes stacked on and beneath them.
  couch(ctx, 620, 1020, 905, 'cow')
  couch(ctx, 1080, 1480, 905, 'lion')
  couch(ctx, 1540, 1900, 905, 'hippo')
  ctx.lineWidth = 3
  for (const [x, y, w, h] of [
    [660, 690, 150, 70],
    [830, 700, 120, 60],
    [700, 630, 110, 60],
    [1120, 690, 140, 70],
    [1280, 700, 130, 60],
    [1580, 690, 130, 64],
    [1720, 700, 110, 58],
    [680, 830, 120, 60],
    [1150, 830, 140, 60],
  ]) {
    ctx.fillStyle = rand() < 0.5 ? '#d4c8ad' : '#3a2616'
    ctx.strokeStyle = 'rgba(60,44,26,0.7)'
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, rand() < 0.5 ? 30 : 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = GOLD
    ctx.fillRect(x + 6, y + 6, w - 12, 5)
  }
  // Gold catching the lamplight among the heap.
  for (let i = 0; i < 70; i++) {
    const x = 300 + rand() * 1650
    const y = 600 + rand() * 300
    const g = ctx.createRadialGradient(x, y, 0, x, y, 10 + rand() * 18)
    g.addColorStop(0, 'rgba(255,226,150,0.55)')
    g.addColorStop(1, 'rgba(255,226,150,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - 30, y - 30, 60, 60)
  }
  speckle(ctx, rand, 18000, 0.14)
  return done(c)
}

/* ------------------------------------------------------------------------- */
/* Chapter III: the painted Burial Chamber                                    */
/* ------------------------------------------------------------------------- */

const KHEKER = ['#9c3a22', '#2f4f7a', '#4e6b3c']

function glyph(ctx: Ctx, cp: number, x: number, y: number, size: number, fill: string) {
  ctx.font = `${size}px ${GLYPH_FONT}`
  ctx.fillStyle = fill
  ctx.fillText(String.fromCodePoint(cp), x, y)
}

export function burialScene(scale: number): CanvasTexture {
  const { c, ctx } = surface(scale)
  const rand = rng(1922)
  mottle(ctx, rand, '#c8993f', '#dfba63', '#97702d', 190)

  // Sky band and kheker frieze along the top.
  ctx.fillStyle = '#23324f'
  ctx.fillRect(0, 34, W, 34)
  for (let x = 0, k = 0; x < W; x += 34, k++) {
    ctx.fillStyle = KHEKER[k % 3]
    ctx.beginPath()
    ctx.moveTo(x + 6, 150)
    ctx.lineTo(x + 6, 96)
    ctx.quadraticCurveTo(x + 17, 66, x + 28, 96)
    ctx.lineTo(x + 28, 150)
    ctx.fill()
    ctx.fillStyle = '#1b130b'
    ctx.fillRect(x + 12, 108, 10, 4)
  }
  ctx.fillStyle = '#7d2d18'
  ctx.fillRect(0, 152, W, 14)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  // The twelve baboons of the first hour of the night, as on the west wall.
  for (let i = 0; i < 12; i++) {
    const x = 330 + i * 126
    glyph(ctx, 0x130fb, x, 316, 112, '#5b2314')
    ctx.fillStyle = 'rgba(40,24,12,0.45)'
    ctx.fillRect(x + 60, 186, 3, 132)
  }
  ctx.fillStyle = '#1e160d'
  ctx.fillRect(0, 330, W, 10)

  // Deities and the columns of text that name them.
  const gods = [0x13060, 0x1305a, 0x13056, 0x13039]
  const godX = [250, 620, 1430, 1800]
  gods.forEach((g, i) => glyph(ctx, g, godX[i], 820, 330, '#6a2816'))
  const signs = [0x13000, 0x1309d, 0x133cf, 0x13216, 0x132f9, 0x13283, 0x131cb, 0x130c0, 0x13171, 0x133e1, 0x13379, 0x132aa]
  for (let x = 820; x <= 1230; x += 46) {
    ctx.fillStyle = 'rgba(30,22,12,0.5)'
    ctx.fillRect(x - 23, 360, 2, 500)
    for (let y = 410; y < 860; y += 52) glyph(ctx, signs[Math.floor(rand() * signs.length)], x, y, 40, rand() < 0.6 ? '#253247' : '#2a1d12')
  }
  for (const gx of godX) {
    for (let x = gx + 120; x < gx + 220 && x < W - 30; x += 44) {
      for (let y = 400; y < 640; y += 50) glyph(ctx, signs[Math.floor(rand() * signs.length)], x, y, 36, '#253247')
    }
  }

  // Red-brown dado along the floor.
  ctx.fillStyle = '#16100a'
  ctx.fillRect(0, 870, W, 8)
  ctx.fillStyle = '#d9b45a'
  ctx.fillRect(0, 878, W, 6)
  ctx.fillStyle = '#6f3218'
  ctx.fillRect(0, 884, W, H - 884)

  // The brown spots of old microbial growth that pepper the paint.
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(84,52,24,${0.2 + rand() * 0.35})`
    ctx.beginPath()
    ctx.arc(rand() * W, rand() * 880, 1 + Math.pow(rand(), 2) * 5, 0, Math.PI * 2)
    ctx.fill()
  }
  speckle(ctx, rand, 16000, 0.12)
  const grime = ctx.createLinearGradient(0, 600, 0, H)
  grime.addColorStop(0, 'rgba(0,0,0,0)')
  grime.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = grime
  ctx.fillRect(0, 600, W, H - 600)
  return done(c)
}
