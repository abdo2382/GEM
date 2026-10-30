import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { XY } from './geo.ts'

/**
 * Geometry for the 3D view. The map's frame carries over unchanged: east is x, south is z, and
 * height is y, so seen from above with north up the page it is the plan, standing up.
 */
export const toWorld = (p: XY, y = 0) => new THREE.Vector3(p[0], y, p[1])

/** A map outline as a shape. Standing a shape up turns its y into -z, so y changes sign here. */
const shapeOf = (outline: readonly XY[]) => new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, -y)))

/** A building: its outline raised from the ground to `height` metres. */
export function extrude(outline: readonly XY[], height: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shapeOf(outline), { depth: height, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  return g
}

/** An area lying flat at height `y`: a garden, a pool. */
export function flat(outline: readonly XY[], y = 0): THREE.BufferGeometry {
  const g = new THREE.ShapeGeometry(shapeOf(outline))
  g.rotateX(-Math.PI / 2)
  g.translate(0, y, 0)
  return g
}

/** Many shapes of one kind as a single geometry, so they cost one draw call. */
export function mergeAll(list: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  return list.length ? mergeGeometries(list, false) : null
}

/** Lines as pairs of points, for `LineSegments`. */
export function lineSegments(lines: readonly (readonly XY[])[], y = 0): THREE.BufferGeometry {
  const positions: number[] = []
  for (const line of lines) for (let i = 1; i < line.length; i++) positions.push(line[i - 1][0], y, line[i - 1][1], line[i][0], y, line[i][1])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return g
}

/** A walk as a path that follows its corners exactly, raised to height `y`. */
export function polylinePath(points: readonly XY[], y: number): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>()
  for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(toWorld(points[i - 1], y), toWorld(points[i], y)))
  return path
}
