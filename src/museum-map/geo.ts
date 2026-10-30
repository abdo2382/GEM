/**
 * Plane geometry for the museum map. Coordinates are metres in a local frame around an origin:
 * x grows east and y grows south, the way a screen counts, so north is up the page.
 * Nothing here touches the DOM, so the build script and the tests use it too.
 */
export type XY = readonly [number, number]
export interface LatLon {
  lat: number
  lon: number
}

const EARTH_RADIUS = 6371000
const RAD = Math.PI / 180

/** Equirectangular projection: accurate to well under a metre across a kilometre. */
export function toLocal(origin: LatLon, lat: number, lon: number): XY {
  return [(lon - origin.lon) * RAD * EARTH_RADIUS * Math.cos(origin.lat * RAD), -(lat - origin.lat) * RAD * EARTH_RADIUS]
}

export function toGeo(origin: LatLon, x: number, y: number): LatLon {
  return {
    lat: origin.lat - y / (RAD * EARTH_RADIUS),
    lon: origin.lon + x / (RAD * EARTH_RADIUS * Math.cos(origin.lat * RAD)),
  }
}

export function dist(a: XY, b: XY): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

export function polylineLength(pts: readonly XY[]): number {
  let total = 0
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i])
  return total
}

/** Unsigned area of a simple polygon (shoelace formula). */
export function polygonArea(pts: readonly XY[]): number {
  let twice = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    twice += p[0] * q[1] - q[0] * p[1]
  }
  return Math.abs(twice) / 2
}

export function polygonCentroid(pts: readonly XY[]): XY {
  let twice = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    const cross = p[0] * q[1] - q[0] * p[1]
    twice += cross
    cx += (p[0] + q[0]) * cross
    cy += (p[1] + q[1]) * cross
  }
  if (Math.abs(twice) < 1e-9) {
    // A flat or one-point "polygon": the average of its points.
    const n = Math.max(pts.length, 1)
    return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n]
  }
  return [cx / (3 * twice), cy / (3 * twice)]
}

/** Ray casting: how many polygon edges a ray from the point crosses. */
export function pointInPolygon(p: XY, poly: readonly XY[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}

export interface Nearest {
  point: XY
  /** Where along the segment, from 0 at `a` to 1 at `b`. */
  t: number
  dist: number
}

export function nearestOnSegment(p: XY, a: XY, b: XY): Nearest {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2))
  const point: XY = t === 0 ? [a[0], a[1]] : t === 1 ? [b[0], b[1]] : [a[0] + t * dx, a[1] + t * dy]
  return { point, t, dist: dist(p, point) }
}

/** Douglas–Peucker: drop points that sit within `tolerance` metres of the line between their neighbours. */
export function simplify(pts: readonly XY[], tolerance: number): XY[] {
  if (pts.length < 3) return [...pts]
  const keep = new Uint8Array(pts.length)
  keep[0] = 1
  keep[pts.length - 1] = 1
  const stack: [number, number][] = [[0, pts.length - 1]]
  while (stack.length) {
    const [from, to] = stack.pop()!
    let worst = -1
    let worstDist = tolerance
    for (let i = from + 1; i < to; i++) {
      const d = nearestOnSegment(pts[i], pts[from], pts[to]).dist
      if (d > worstDist) {
        worst = i
        worstDist = d
      }
    }
    if (worst >= 0) {
      keep[worst] = 1
      stack.push([from, worst], [worst, to])
    }
  }
  return pts.filter((_, i) => keep[i] === 1)
}

/** Direction from `a` to `b` in degrees clockwise from north (0–360). */
export function bearing(a: XY, b: XY): number {
  const deg = Math.atan2(b[0] - a[0], -(b[1] - a[1])) / RAD
  return (deg + 360) % 360
}
