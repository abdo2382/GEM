/*
 * Where the mask sits in the frame at each chapter, as offsets from the centre in
 * fractions of the screen (x across, y up) plus a scale, and where the treasure sits
 * on phones. Phones stack the two in the middle of the screen: the mask in a band at
 * the top, the treasure beneath it, both clear of the story sheet. Wide screens keep
 * their columns, because the papyrus and the artifact card own the sides there.
 * Kept free of imports so it can be unit tested in Node.
 */

type Spot = readonly [x: number, y: number, scale: number]

// Chapters: awakening, discovery, treasures, inside the tomb, legacy.
// Phones: centred. The small x offsets only cancel the sideways reach of the mask's own
// turn in each chapter (its headcloth swings out behind it), so its outline stays
// centred; y and scale fit it into the band above the treasure. Measured on 375–460px
// wide phones against the real model's outline.
const PHONE: Spot[] = [
  [0, -0.01, 1],
  [-0.027, 0.067, 0.894],
  [0.051, 0.069, 0.808],
  [0, 0.091, 0.8],
  [0, 0, 1.04],
]
// The treasures pose turns the mask in profile towards the artifact, so its headcloth
// reaches back over the papyrus column: on wide screens it rises and steps back instead.
const WIDE: Spot[] = [
  [-0.04, 0.03, 1],
  [0.045, 0.03, 1],
  [0, 0.03, 0.95],
  [0.04, -0.04, 1],
  [0, 0, 1.06],
]
/** While the opening reveal plays, the mask drifts in from further up and to the left. */
const REVEAL_FROM = [-0.05, 0.04] as const

export interface RigGoal {
  x: number
  y: number
  scale: number
}

/**
 * The rig's goal between chapters `i` and `j` (blend `k`), given how far the opening
 * reveal has run (`intro`, 0–1) and how far Inspect has opened (`inspect`, 0–1).
 * `side` is -1 in right-to-left layouts, which mirror the composition.
 */
export function rigTarget(
  portrait: boolean,
  i: number,
  j: number,
  k: number,
  intro: number,
  inspect: number,
  side: number,
  opening?: { y: number; scale: number } | null,
): RigGoal {
  const plan = portrait ? PHONE : WIDE
  // Wide screens' opening is fitted to the page around it (fitOpening), centred.
  const spot = (n: number): Spot => (!portrait && n === 0 && opening ? [0, opening.y, opening.scale] : plan[n])
  const a = spot(i)
  const b = spot(j)
  const free = 1 - inspect
  const late = 1 - intro
  // Wide layouts mirror their columns right to left; on phones the offsets correct the
  // mask's own turn, which is the same in both languages.
  const mirror = portrait ? 1 : side
  const x = (a[0] + (b[0] - a[0]) * k + REVEAL_FROM[0] * late) * free * mirror
  const y = (a[1] + (b[1] - a[1]) * k + REVEAL_FROM[1] * late) * free
  const scale = 1 + (a[2] + (b[2] - a[2]) * k - 1) * free
  // `+ 0` turns -0 into 0, so a centred goal compares equal to zero.
  return { x: x + 0, y: y + 0, scale }
}

/**
 * The mask's outline at the wide opening with no rig offset or scale, in fractions of
 * the screen height from the top (the locked mask's opening pose and camera, measured;
 * the same at every desktop size because the view's height sets its scale).
 */
export const OPENING_NATURAL = { top: 0.185, bottom: 0.83 }

/**
 * Wide screens' opening: fit the mask into the free band between the title block and
 * the scroll hint (fractions of the height from the top). Returns the rig's offset (up,
 * in screen fractions) and scale. It never enlarges the mask, and never shrinks it below
 * 72%: on a very short window a little overlap beats a tiny mask.
 */
export function fitOpening(band: { top: number; bottom: number }) {
  const n = OPENING_NATURAL
  const scale = Math.max(0.72, Math.min(1, (band.bottom - band.top) / (n.bottom - n.top)))
  // Centres above the screen's middle: the mask's own (it scales with the rig) and the band's.
  const natural = 0.5 - (n.top + n.bottom) / 2
  const wanted = 0.5 - (band.top + band.bottom) / 2
  return { y: wanted - natural * scale, scale }
}

/**
 * Phone bands, in fractions of the screen height from the top. The story sheet's peek
 * is 38vh (papyrus.css), so the sheet starts at 62%.
 */
export const PHONE_BANDS = { treasureTop: 0.34, treasureBottom: 0.595, sheetTop: 0.62 }

/**
 * The treasure's place on a phone, at a camera distance where the screen is `halfW` by
 * `halfH` world units from the centre: `y` (up from the centre) and the `scale` its
 * model (longest side 1) is drawn at. `dims` are the model's height and the widest
 * sweep of its slow turn, as fractions of that longest side. It fills its band's height,
 * leaving a margin for perspective, and never takes more than 80% of the width.
 */
export function phoneTreasure(halfW: number, halfH: number, dims = { h: 1, w: 1 }) {
  const { treasureTop, treasureBottom } = PHONE_BANDS
  const centre = (treasureTop + treasureBottom) / 2
  return { y: (0.5 - centre) * 2 * halfH, scale: Math.min((halfH * 0.48) / dims.h, (halfW * 1.6) / dims.w) }
}
