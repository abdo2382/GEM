import { CHAPTERS } from '../content/chapters'

/**
 * The single shared timeline. ScrollTrigger writes `progress`; the 3D scene and
 * the DOM read it every frame without going through React.
 */
export const scrollState = {
  progress: 0,
  velocity: 0,
}

/** Mutable state for Inspect mode, written by pointer handlers, read by the scene. */
export const inspectState = {
  rotY: 0,
  rotX: 0.12,
  velY: 0,
  velX: 0,
  zoom: 1,
  targetZoom: 1,
  dragging: false,
}

export function resetInspectState() {
  Object.assign(inspectState, { rotY: -0.5, rotX: 0.12, velY: 0, velX: 0, zoom: 1, targetZoom: 1, dragging: false })
}

const weights = CHAPTERS.map((c) => c.weight)
export const TOTAL_WEIGHT = weights.reduce((a, b) => a + b, 0)

const starts: number[] = []
weights.reduce((acc, w, i) => {
  starts[i] = acc
  return acc + w
}, 0)

/**
 * Anchor = the scroll progress at which a chapter is "at rest". The prologue rests at
 * the very top, the epilogue at the very bottom, and the others at their midpoint.
 */
export const ANCHORS = CHAPTERS.map((_, i) => {
  if (i === 0) return 0
  if (i === CHAPTERS.length - 1) return 1
  return (starts[i] + weights[i] / 2) / TOTAL_WEIGHT
})

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** Which two anchors the progress lies between, and how far (0..1). */
export function locate(p: number) {
  const last = ANCHORS.length - 1
  for (let k = 0; k < last; k++) {
    if (p <= ANCHORS[k + 1]) {
      return { i: k, j: k + 1, t: clamp01((p - ANCHORS[k]) / (ANCHORS[k + 1] - ANCHORS[k])) }
    }
  }
  return { i: last - 1, j: last, t: 1 }
}

/** Fraction of each transition spent holding still around the anchors. */
export const HOLD = 0.22

/** Eased transition weight with a resting plateau at each end. */
export function plateau(t: number, hold = HOLD) {
  return smoothstep(0, 1, (t - hold) / (1 - 2 * hold))
}

export function chapterFromProgress(p: number) {
  const { i, j, t } = locate(p)
  return t < 0.5 ? i : j
}

/** How present chapter k is on stage (1 at its anchor, 0 well into a neighbour). */
export function presence(k: number, p: number) {
  const a = ANCHORS[k]
  let r: number
  if (p >= a) {
    if (k === ANCHORS.length - 1) return 1
    r = (p - a) / (ANCHORS[k + 1] - a)
  } else {
    if (k === 0) return 1
    r = (a - p) / (a - ANCHORS[k - 1])
  }
  return 1 - smoothstep(0.26, 0.62, r)
}
