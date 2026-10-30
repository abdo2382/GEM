import type { XY } from './geo.ts'

/** The part of the world on screen: where it is centred (metres) and how many pixels a metre is. */
export interface View {
  cx: number
  cy: number
  k: number
}
export interface Size {
  w: number
  h: number
}
export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}
/** Pixels of the screen covered by panels, which the map should be framed around. */
export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export const toScreen = (v: View, s: Size, x: number, y: number): XY => [(x - v.cx) * v.k + s.w / 2, (y - v.cy) * v.k + s.h / 2]
export const toWorld = (v: View, s: Size, px: number, py: number): XY => [(px - s.w / 2) / v.k + v.cx, (py - s.h / 2) / v.k + v.cy]

export function boundsOf(points: readonly XY[]): Bounds {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const [x, y] of points) {
    b.minX = Math.min(b.minX, x)
    b.minY = Math.min(b.minY, y)
    b.maxX = Math.max(b.maxX, x)
    b.maxY = Math.max(b.maxY, y)
  }
  return b
}

/** The view that shows all of `b` in the part of the screen the panels leave free, centred there. */
export function fitView(b: Bounds, s: Size, insets: Partial<Insets> = {}, maxK = 6): View {
  const i = { top: 0, right: 0, bottom: 0, left: 0, ...insets }
  const freeW = Math.max(1, s.w - i.left - i.right)
  const freeH = Math.max(1, s.h - i.top - i.bottom)
  const k = Math.min(freeW / Math.max(b.maxX - b.minX, 1), freeH / Math.max(b.maxY - b.minY, 1), maxK)
  // The middle of the free area, which is where the middle of the bounds should land.
  const sx = i.left + freeW / 2
  const sy = i.top + freeH / 2
  return { cx: (b.minX + b.maxX) / 2 - (sx - s.w / 2) / k, cy: (b.minY + b.maxY) / 2 - (sy - s.h / 2) / k, k }
}

/** Zoom by `factor` about a screen point, so that the world point under it stays put. */
export function zoomAt(v: View, s: Size, factor: number, px: number, py: number, kMin: number, kMax: number): View {
  const k = Math.max(kMin, Math.min(kMax, v.k * factor))
  const [wx, wy] = toWorld(v, s, px, py)
  return { cx: wx - (px - s.w / 2) / k, cy: wy - (py - s.h / 2) / k, k }
}

/** A drag of (dx, dy) screen pixels: the world follows the finger. */
export function panBy(v: View, dx: number, dy: number): View {
  return { ...v, cx: v.cx - dx / v.k, cy: v.cy - dy / v.k }
}

/** Keep the middle of the view within `margin` metres of the map. */
export function clampView(v: View, _s: Size, b: Bounds, margin: number): View {
  return {
    ...v,
    cx: Math.max(b.minX - margin, Math.min(b.maxX + margin, v.cx)),
    cy: Math.max(b.minY - margin, Math.min(b.maxY + margin, v.cy)),
  }
}

/** The SVG `viewBox` that shows exactly what is on screen. */
export function viewBox(v: View, s: Size): string {
  const r = (n: number) => Math.round(n * 1000) / 1000
  return `${r(v.cx - s.w / (2 * v.k))} ${r(v.cy - s.h / (2 * v.k))} ${r(s.w / v.k)} ${r(s.h / v.k)}`
}
