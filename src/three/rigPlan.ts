/*
 * Where the mask sits in the frame at each chapter, as offsets from the centre in
 * fractions of the screen (x across, y up) plus a scale. Phones follow the storyboard
 * closely; wide screens move less, because the papyrus and the artifact card own the
 * side columns there. Kept free of imports so it can be unit tested in Node.
 */

type Spot = readonly [x: number, y: number, scale: number]

// Chapters: awakening, discovery, treasures, inside the tomb, legacy.
// Measured at 375px wide: every pose keeps at least ~24px clear of the screen edges.
const PHONE: Spot[] = [
  [-0.05, -0.01, 1],
  [0.1, 0.01, 1],
  [-0.085, 0.01, 1],
  [0.09, -0.03, 1],
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
export function rigTarget(portrait: boolean, i: number, j: number, k: number, intro: number, inspect: number, side: number): RigGoal {
  const plan = portrait ? PHONE : WIDE
  const a = plan[i]
  const b = plan[j]
  const free = 1 - inspect
  const late = 1 - intro
  const x = (a[0] + (b[0] - a[0]) * k + REVEAL_FROM[0] * late) * free * side
  const y = (a[1] + (b[1] - a[1]) * k + REVEAL_FROM[1] * late) * free
  const scale = 1 + (a[2] + (b[2] - a[2]) * k - 1) * free
  // `+ 0` turns -0 into 0, so a centred goal compares equal to zero.
  return { x: x + 0, y: y + 0, scale }
}
