import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
/** Hermite smoothstep that also works with a > b (descending ramps). */
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const gauss = (d: number, s: number) => Math.exp(-(d * d) / (2 * s * s))
export const gauss2 = (dx: number, dy: number, sx: number, sy: number) =>
  Math.exp(-((dx * dx) / (2 * sx * sx) + (dy * dy) / (2 * sy * sy)))

/**
 * A parametric grid surface. `fn(u, v)` writes a point; u runs left → right,
 * v runs top → bottom. UVs are (u, 1 - v) so canvas-top maps to the surface top.
 */
export function surface(uSeg: number, vSeg: number, fn: (u: number, v: number, out: Vector3) => void, flip = false) {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const p = new Vector3()
  for (let j = 0; j <= vSeg; j++) {
    for (let i = 0; i <= uSeg; i++) {
      fn(i / uSeg, j / vSeg, p)
      pos.push(p.x, p.y, p.z)
      uv.push(i / uSeg, 1 - j / vSeg)
    }
  }
  const row = uSeg + 1
  for (let j = 0; j < vSeg; j++) {
    for (let i = 0; i < uSeg; i++) {
      const a = j * row + i
      const b = a + row
      const c = a + 1
      const d = b + 1
      if (flip) idx.push(a, c, b, b, c, d)
      else idx.push(a, b, c, b, d, c)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/**
 * A ribbon laid onto a height field z = zAt(x, y): used for inlays (eyebrows,
 * cosmetic lines) that must follow the sculpted face exactly.
 */
export function drapeStrip(
  path: [number, number][],
  width: (t: number) => number,
  zAt: (x: number, y: number) => number,
  lift: number,
  across = 4,
) {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const n = path.length
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const p0 = path[Math.max(0, i - 1)]
    const p1 = path[Math.min(n - 1, i + 1)]
    let tx = p1[0] - p0[0]
    let ty = p1[1] - p0[1]
    const len = Math.hypot(tx, ty) || 1
    tx /= len
    ty /= len
    const nx = -ty
    const ny = tx
    const w = width(t)
    for (let a = 0; a <= across; a++) {
      const o = (a / across - 0.5) * w
      const x = path[i][0] + nx * o
      const y = path[i][1] + ny * o
      pos.push(x, y, zAt(x, y) + lift)
      uv.push(t, a / across)
    }
  }
  const row = across + 1
  for (let i = 0; i < n - 1; i++) {
    for (let a = 0; a < across; a++) {
      const p = i * row + a
      idx.push(p, p + row, p + 1, p + 1, p + row, p + row + 1)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Smooth 2D path through control points (Catmull-Rom), for drapeStrip. */
export function spline2(points: [number, number][], samples: number): [number, number][] {
  const out: [number, number][] = []
  const P = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))]
  for (let s = 0; s <= samples; s++) {
    const f = (s / samples) * (points.length - 1)
    const i = Math.min(points.length - 2, Math.floor(f))
    const t = f - i
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)]
    const c = (k: 0 | 1) =>
      0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t)
    out.push([c(0), c(1)])
  }
  return out
}

/** Scale each ring of a TubeGeometry about its centreline (variable radius). */
export function taperTube(g: BufferGeometry, curvePoints: Vector3[], radial: number, scale: (t: number) => number) {
  const pos = g.attributes.position
  const rings = curvePoints.length
  const v = new Vector3()
  for (let r = 0; r < rings; r++) {
    const s = scale(r / (rings - 1))
    const c = curvePoints[r]
    for (let k = 0; k <= radial; k++) {
      const i = r * (radial + 1) + k
      v.fromBufferAttribute(pos, i).sub(c).multiplyScalar(s).add(c)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
}

/**
 * Smooth profile through measured samples [y, value] (y descending), using
 * non-uniform cubic Hermite interpolation; clamps beyond the ends.
 */
export function profile(table: [number, number][]) {
  const ys = table.map((t) => t[0])
  const vs = table.map((t) => t[1])
  const n = table.length
  const m = vs.map((_, i) => {
    if (i === 0) return (vs[1] - vs[0]) / (ys[1] - ys[0])
    if (i === n - 1) return (vs[n - 1] - vs[n - 2]) / (ys[n - 1] - ys[n - 2])
    return (vs[i + 1] - vs[i - 1]) / (ys[i + 1] - ys[i - 1])
  })
  return (y: number) => {
    if (y >= ys[0]) return vs[0]
    if (y <= ys[n - 1]) return vs[n - 1]
    let i = 0
    while (i < n - 2 && y < ys[i + 1]) i++
    const h = ys[i + 1] - ys[i]
    const t = (y - ys[i]) / h
    const t2 = t * t
    const t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * vs[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * vs[i + 1] + (t3 - t2) * h * m[i + 1]
  }
}
