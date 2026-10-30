import { bearing, nearestOnSegment, type XY } from './geo.ts'
import type { Graph, Route } from './astar.ts'

export type Compass = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'
export type Turn = 'slight-left' | 'left' | 'sharp-left' | 'slight-right' | 'right' | 'sharp-right'

export interface Pass {
  id: string
  /** Which side of the walker it lies on. */
  side: 'left' | 'right'
  /** Metres from the route. */
  distance: number
}

export interface Step {
  type: 'walk' | 'steps'
  /** The way the step sets off. */
  heading: Compass
  /** The turn that begins the step. Absent for the first step and where the way just carries on. */
  turn?: Turn
  /** Metres. */
  distance: number
  /** Index into `route.nodes` where the step begins, to find it on the map. */
  from: number
  passes: Pass[]
}

const COMPASS: Compass[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export function compass(degrees: number): Compass {
  return COMPASS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8]
}

/** An easy pace for a museum visit, in metres per second (about 4.3 km/h). */
export const WALK_SPEED = 1.2
/** Steps take half as long again. */
const STEPS_SLOWDOWN = 1.5

/** Whole minutes, rounded up. An estimate: queues, crowds and photos are not counted. */
export function walkMinutes(route: Route): number {
  const seconds = route.legs.reduce((sum, leg) => sum + (leg.len / WALK_SPEED) * (leg.kind === 'steps' ? STEPS_SLOWDOWN : 1), 0)
  return seconds === 0 ? 0 : Math.max(1, Math.ceil(seconds / 60 - 1e-9))
}

// How steps are found: a turn is a bend of at least 40°, measured over a stretch of path rather than
// at one corner, so wiggles in a footpath are ignored and a long curve counts as one turn.
const DETECT_LOOK = 25
const DETECT_MIN = 30
const MEASURE_LOOK = 15
const TURN_MIN = 40
const CLUSTER_GAP = 20
const NEAR_ENDS = 10
const PASS_RANGE = 25
const HEADING_LOOK = 30
/** A flight of steps shorter than this is a kerb, not something to announce. */
const FLIGHT_MIN = 4

/** Degrees from heading `a` to heading `b`, clockwise positive, in (-180, 180]. */
const signedTurn = (a: number, b: number) => ((b - a + 540) % 360) - 180

function classify(angle: number): Turn {
  const size = Math.abs(angle) < 70 ? 'slight-' : Math.abs(angle) > 120 ? 'sharp-' : ''
  const side = angle > 0 ? 'right' : 'left'
  return (size === '' ? side : size + side) as Turn
}

/**
 * Turns a route into steps a person can follow: set off this way, turn there, take the steps,
 * and which of the named places you pass on the left or right.
 */
export function describeRoute(g: Graph, route: Route, landmarks: { id: string; at: XY }[]): Step[] {
  const legs = route.legs
  if (legs.length === 0) return []
  const pts = route.nodes.map((i) => g.pos[i])
  const along: number[] = [0]
  for (const leg of legs) along.push(along[along.length - 1] + leg.len)
  const total = along[along.length - 1]

  const pointAt = (d: number): XY => {
    const x = Math.max(0, Math.min(total, d))
    let k = 0
    while (k < legs.length - 1 && along[k + 1] < x) k++
    const len = along[k + 1] - along[k]
    const t = len === 0 ? 0 : (x - along[k]) / len
    return [pts[k][0] + t * (pts[k + 1][0] - pts[k][0]), pts[k][1] + t * (pts[k + 1][1] - pts[k][1])]
  }

  // Which legs are a real flight of steps: a run of steps ways at least FLIGHT_MIN metres long.
  const flight: boolean[] = legs.map(() => false)
  for (let k = 0; k < legs.length; ) {
    if (legs[k].kind !== 'steps') {
      k++
      continue
    }
    let end = k
    while (end + 1 < legs.length && legs[end + 1].kind === 'steps') end++
    if (along[end + 1] - along[k] >= FLIGHT_MIN) for (let j = k; j <= end; j++) flight[j] = true
    k = end + 1
  }

  // Where a step could begin: a turn, or the point where a flight of steps starts or ends.
  const boundaries = new Map<number, Turn | undefined>()
  const candidates: { index: number; at: number; angle: number }[] = []
  for (let i = 1; i < pts.length - 1; i++) {
    if (flight[i - 1] !== flight[i]) boundaries.set(i, undefined)
    if (along[i] < NEAR_ENDS || total - along[i] < NEAR_ENDS) continue
    const angle = signedTurn(bearing(pointAt(along[i] - DETECT_LOOK), pts[i]), bearing(pts[i], pointAt(along[i] + DETECT_LOOK)))
    if (Math.abs(angle) >= DETECT_MIN) candidates.push({ index: i, at: along[i], angle })
  }
  for (let c = 0; c < candidates.length; ) {
    let end = c
    while (end + 1 < candidates.length && candidates[end + 1].at - candidates[end].at <= CLUSTER_GAP) end++
    const cluster = candidates.slice(c, end + 1)
    c = end + 1
    const start = cluster[0].at
    const stop = cluster[cluster.length - 1].at
    const angle = signedTurn(bearing(pointAt(start - MEASURE_LOOK), pointAt(start)), bearing(pointAt(stop), pointAt(stop + MEASURE_LOOK)))
    if (Math.abs(angle) < TURN_MIN) continue
    const sharpest = cluster.reduce((a, b) => (Math.abs(b.angle) > Math.abs(a.angle) ? b : a))
    boundaries.set(sharpest.index, classify(angle))
  }

  const starts = [0, ...[...boundaries.keys()].sort((a, b) => a - b)]
  const steps: Step[] = starts.map((from, k) => {
    const to = k + 1 < starts.length ? starts[k + 1] : pts.length - 1
    return {
      type: flight[from] ? 'steps' : 'walk',
      heading: compass(bearing(pts[from], pointAt(Math.min(along[from] + HEADING_LOOK, along[to])))),
      ...(k > 0 && boundaries.get(from) ? { turn: boundaries.get(from) } : {}),
      distance: along[to] - along[from],
      from,
      passes: [],
    }
  })

  // Named places within reach of the route, on the step they are passed in.
  const found: { step: number; at: number; pass: Pass }[] = []
  for (const mark of landmarks) {
    let best: { leg: number; dist: number; t: number } | null = null
    for (let k = 0; k < legs.length; k++) {
      const r = nearestOnSegment(mark.at, pts[k], pts[k + 1])
      if (!best || r.dist < best.dist) best = { leg: k, dist: r.dist, t: r.t }
    }
    if (!best || best.dist > PASS_RANGE) continue
    const a = pts[best.leg]
    const b = pts[best.leg + 1]
    const cross = (b[0] - a[0]) * (mark.at[1] - a[1]) - (b[1] - a[1]) * (mark.at[0] - a[0])
    let step = 0
    while (step + 1 < starts.length && starts[step + 1] <= best.leg) step++
    found.push({ step, at: along[best.leg] + best.t * legs[best.leg].len, pass: { id: mark.id, side: cross > 0 ? 'right' : 'left', distance: Math.round(best.dist) } })
  }
  for (const f of found.sort((x, y) => x.at - y.at)) steps[f.step].passes.push(f.pass)
  return steps
}
