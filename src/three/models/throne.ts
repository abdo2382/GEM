import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, LatheGeometry, Shape, SphereGeometry, Vector2, Vector3 } from 'three'
import { glassMaterial, goldMaterial, pbrMaterial } from '../materials'
import { featherTexture, throneSceneTexture } from '../textures'
import { ellipsoid, linePoints, marker, mesh, uraeusFrieze, type ArtifactModel } from './common'

/*
 * Artistic reconstruction of the Golden Throne (Antechamber, KV62): lion legs on
 * drums, lion heads at the front of the seat, winged-cobra arms, and a backrest
 * showing the royal couple beneath the Aten, crowned by a frieze of uraei.
 */
export function buildThrone(): ArtifactModel {
  const g = new Group()
  const hotspots = {}
  const gold = goldMaterial({ roughness: 0.25 })
  const goldSoft = goldMaterial({ roughness: 0.42 })
  const lapis = glassMaterial('#1a3794')
  const carnelian = glassMaterial('#a83a1e', 0.12)
  const white = glassMaterial('#ece7dc', 0.18)
  const scene = pbrMaterial(throneSceneTexture(), { bumpScale: 2.4 })
  const feathers = pbrMaterial(featherTexture(), { bumpScale: 2.4 })

  // Lion legs: a turned, muscular profile ending in paws on small drums.
  const legProfile = [
    [0.027, 0],
    [0.025, 0.06],
    [0.029, 0.14],
    [0.035, 0.23],
    [0.042, 0.31],
    [0.039, 0.37],
    [0.033, 0.41],
  ].map(([r, y]) => new Vector2(r, y))
  const legGeo = new LatheGeometry(legProfile, 28)
  for (const x of [-0.22, 0.22]) {
    for (const z of [-0.19, 0.19]) {
      mesh(legGeo, gold, [x, 0.08, z], g)
      mesh(new CylinderGeometry(0.044, 0.046, 0.04, 28), goldSoft, [x, 0.02, z + 0.01], g)
      mesh(ellipsoid(0.045, 1.1, 0.55, 1.35), gold, [x, 0.065, z + 0.014], g)
      for (let k = 0; k < 4; k++) {
        const a = -0.6 + k * 0.4
        mesh(new SphereGeometry(0.014, 12, 8), gold, [x + Math.sin(a) * 0.032, 0.058, z + 0.05 + Math.cos(a) * 0.006], g)
      }
    }
  }
  // Stretchers.
  for (const z of [-0.19, 0.19]) mesh(new CylinderGeometry(0.012, 0.012, 0.44, 12).rotateZ(Math.PI / 2), goldSoft, [0, 0.16, z], g)
  for (const x of [-0.22, 0.22]) mesh(new CylinderGeometry(0.012, 0.012, 0.38, 12).rotateX(Math.PI / 2), goldSoft, [x, 0.16, 0], g)

  // Seat with a front apron.
  const seat = new BoxGeometry(0.52, 0.045, 0.46, 8, 1, 8)
  const sp = seat.attributes.position
  for (let i = 0; i < sp.count; i++) {
    if (sp.getY(i) > 0) sp.setY(i, sp.getY(i) - 0.012 * (1 - (sp.getX(i) / 0.26) ** 2) * (1 - (sp.getZ(i) / 0.23) ** 2))
  }
  seat.computeVertexNormals()
  mesh(seat, gold, [0, 0.49, 0], g)
  mesh(new BoxGeometry(0.5, 0.05, 0.02), goldSoft, [0, 0.45, 0.225], g)

  // Lion heads at the front corners of the seat.
  for (const s of [-1, 1]) {
    const head = new Group()
    head.position.set(s * 0.235, 0.565, 0.235)
    g.add(head)
    mesh(ellipsoid(0.07, 1, 1, 0.62), goldSoft, [0, 0, -0.02], head)
    mesh(new SphereGeometry(0.05, 24, 16), gold, [0, 0, 0.012], head)
    mesh(ellipsoid(0.03, 1.1, 0.85, 1), gold, [0, -0.015, 0.05], head)
    for (const e of [-1, 1]) {
      mesh(new SphereGeometry(0.015, 12, 8), gold, [e * 0.036, 0.042, -0.002], head)
      mesh(new SphereGeometry(0.0075, 10, 8), lapis, [e * 0.019, 0.012, 0.052], head)
    }
  }

  // Winged-cobra arms: a feathered wing rising to the backrest, a cobra at the front.
  const wing = new Shape()
  wing.moveTo(0, 0)
  wing.lineTo(1, 0)
  wing.lineTo(1, 1)
  wing.bezierCurveTo(0.75, 0.86, 0.45, 0.6, 0.12, 0.44)
  wing.lineTo(0, 0.38)
  wing.closePath()
  const wingGeo = new ExtrudeGeometry(wing, { depth: 1, bevelEnabled: false, curveSegments: 24 })
  for (const s of [-1, 1]) {
    const arm = mesh(wingGeo, feathers, [s > 0 ? 0.245 : -0.27, 0.512, 0.215], g)
    arm.rotation.y = Math.PI / 2
    arm.scale.set(0.43, 0.28, 0.025)
    const cobra = new Group()
    cobra.position.set(s * 0.258, 0.63, 0.205)
    g.add(cobra)
    mesh(ellipsoid(0.032, 0.5, 1.3, 0.9), gold, [0, 0, 0], cobra)
    mesh(ellipsoid(0.022, 0.4, 1.0, 0.5), lapis, [0, -0.004, 0.014], cobra)
    mesh(new SphereGeometry(0.014, 12, 10), gold, [0, 0.046, 0.01], cobra)
    // Double Crown: the red crown and the white crown.
    mesh(new CylinderGeometry(0.017, 0.015, 0.026, 16), carnelian, [0, 0.07, 0.006], cobra)
    mesh(new ConeGeometry(0.011, 0.05, 16), white, [0, 0.102, 0.006], cobra)
  }

  // Backrest with the royal scene, leaning slightly back.
  const back = new Group()
  back.position.set(0, 0.8, -0.21)
  back.rotation.x = -0.09
  g.add(back)
  const panel = new BoxGeometry(0.52, 0.58, 0.035)
  mesh(panel, [goldSoft, goldSoft, goldSoft, goldSoft, scene, goldSoft], undefined, back)
  for (const x of [-0.272, 0.272]) mesh(new BoxGeometry(0.03, 0.62, 0.05), gold, [x, -0.01, 0], back)
  mesh(new BoxGeometry(0.58, 0.035, 0.07), gold, [0, 0.305, 0.004], back)
  mesh(new BoxGeometry(0.6, 0.02, 0.085), goldSoft, [0, 0.33, 0.004], back)
  back.add(
    uraeusFrieze(linePoints(new Vector3(-0.26, 0.34, 0.02), new Vector3(0.26, 0.34, 0.02), 13), new Vector3(0, 0, 1), 0.018, gold, carnelian),
  )

  marker(back, hotspots, 'aten', [0, 0.16, 0.03])
  marker(back, hotspots, 'scene', [0.08, -0.04, 0.03])
  marker(g, hotspots, 'lions', [0.235, 0.6, 0.3], [0.2, 0.3, 1])
  marker(g, hotspots, 'cobras', [-0.27, 0.66, 0.1], [-0.7, 0.4, 0.5])
  marker(g, hotspots, 'legs', [0.22, 0.1, 0.25], [0.3, 0, 1])
  return { group: g, hotspots }
}
