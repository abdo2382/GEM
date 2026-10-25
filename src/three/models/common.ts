import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Material,
} from 'three'

export interface ArtifactModel {
  group: Group
  hotspots: Record<string, Object3D>
}

/** A point of interest; `normal` (local space) says which way its surface faces. */
export function marker(parent: Object3D, hotspots: Record<string, Object3D>, id: string, pos: [number, number, number], normal: [number, number, number] = [0, 0, 1]) {
  const o = new Object3D()
  o.name = `hotspot:${id}`
  o.position.set(...pos)
  o.userData.normal = new Vector3(...normal).normalize()
  parent.add(o)
  hotspots[id] = o
}

export function mesh(geo: BufferGeometry, mat: Material | Material[], pos?: [number, number, number], parent?: Object3D) {
  const m = new Mesh(geo, mat)
  if (pos) m.position.set(...pos)
  parent?.add(m)
  return m
}

/** Box whose top face is scaled by (tx, tz): pylon walls, cornices, bases. */
export function taperedBox(w: number, h: number, d: number, tx: number, tz: number) {
  const g = new BoxGeometry(w, h, d, 1, 1, 1)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * tx, p.getY(i), p.getZ(i) * tz)
  }
  g.computeVertexNormals()
  return g
}

/** Capsule lying along +x, with its cross-section scaled (height, width). */
export function capsuleX(radius: number, length: number, sy = 1, sz = 1) {
  const g = new CapsuleGeometry(radius, length, 8, 20)
  g.rotateZ(Math.PI / 2)
  g.scale(1, sy, sz)
  return g
}

export function ellipsoid(r: number, sx: number, sy: number, sz: number, seg = 28) {
  const g = new SphereGeometry(r, seg, Math.round(seg * 0.7))
  g.scale(sx, sy, sz)
  return g
}

/**
 * A row of rearing cobras (uraei), each crowned with a sun disc, as instanced meshes.
 * `points` are base positions; each cobra faces along `normal`.
 */
export function uraeusFrieze(points: Vector3[], normal: Vector3, size: number, hoodMat: Material, discMat: Material) {
  const group = new Group()
  const hood = ellipsoid(size, 0.62, 1.45, 0.42, 16)
  const disc = new SphereGeometry(size * 0.48, 12, 8)
  const hoods = new InstancedMesh(hood, hoodMat, points.length)
  const discs = new InstancedMesh(disc, discMat, points.length)
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal)
  const m = new Matrix4()
  const s = new Vector3(1, 1, 1)
  points.forEach((p, i) => {
    m.compose(new Vector3(p.x, p.y + size * 1.3, p.z), q, s)
    hoods.setMatrixAt(i, m)
    m.compose(new Vector3(p.x, p.y + size * 3.1, p.z).addScaledVector(normal, size * 0.15), q, s)
    discs.setMatrixAt(i, m)
  })
  group.add(hoods, discs)
  return group
}

export function linePoints(a: Vector3, b: Vector3, n: number) {
  return Array.from({ length: n }, (_, i) => a.clone().lerp(b, n === 1 ? 0.5 : i / (n - 1)))
}
