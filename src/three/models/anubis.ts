import { BoxGeometry, CapsuleGeometry, Color, CatmullRomCurve3, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from 'three'
import { blackResinMaterial, glassMaterial, goldMaterial, pbrMaterial, woodMaterial } from '../materials'
import { djedTyetTexture } from '../textures'
import { capsuleX, ellipsoid, marker, mesh, taperedBox, type ArtifactModel } from './common'

/*
 * Artistic reconstruction of the Anubis shrine (Treasury, KV62): a recumbent jackal
 * in black resin with gilded details, lying on a gilded, pylon-shaped chest decorated
 * with djed pillars and tyet knots, set on a sledge with carrying poles.
 */
export function buildAnubis(): ArtifactModel {
  const g = new Group()
  const hotspots = {}
  const gold = goldMaterial({ roughness: 0.27 })
  const resin = blackResinMaterial()
  const wood = woodMaterial()
  const silver = goldMaterial({ roughness: 0.22, color: new Color().setRGB(0.86, 0.87, 0.88) })
  const longSide = pbrMaterial(djedTyetTexture(7, 1024, 512), { bumpScale: 3 })
  const shortSide = pbrMaterial(djedTyetTexture(3, 512, 512), { bumpScale: 3 })

  const L = 0.92
  const D = 0.44
  const H = 0.44
  const base = -0.465

  // Sledge and runners.
  for (const z of [-0.17, 0.17]) mesh(new BoxGeometry(1.02, 0.035, 0.04), gold, [0, -0.4825, z], g)
  for (const x of [-0.4, 0, 0.4]) mesh(new BoxGeometry(0.04, 0.03, 0.38), gold, [x, -0.48, 0], g)

  // Pylon-shaped chest: long sides carry seven symbols, short sides three.
  const chest = mesh(taperedBox(L, H, D, 0.955, 0.93), [shortSide, shortSide, gold, gold, longSide, longSide], [0, base + H / 2, 0], g)
  chest.name = 'chest'
  // Torus moulding and cavetto cornice.
  for (const z of [-1, 1]) mesh(new CylinderGeometry(0.009, 0.009, L * 0.96, 12).rotateZ(Math.PI / 2), gold, [0, base + H, z * D * 0.465], g)
  for (const x of [-1, 1]) mesh(new CylinderGeometry(0.009, 0.009, D * 0.93, 12).rotateX(Math.PI / 2), gold, [x * L * 0.478, base + H, 0], g)
  const cornice = taperedBox(L * 0.955, 0.06, D * 0.93, 1.1, 1.16)
  mesh(cornice, gold, [0, base + H + 0.03, 0], g)
  const lidY = base + H + 0.066
  mesh(new BoxGeometry(L * 1.06, 0.014, D * 1.1), gold, [0, lidY, 0], g)

  // Carrying poles with gilded ends.
  for (const z of [-0.235, 0.235]) {
    mesh(new CylinderGeometry(0.017, 0.017, 1.78, 16).rotateZ(Math.PI / 2), wood, [0, -0.44, z], g)
    for (const x of [-0.89, 0.89]) mesh(new CylinderGeometry(0.02, 0.02, 0.05, 16).rotateZ(Math.PI / 2), gold, [x, -0.44, z], g)
  }

  // The jackal, lying on the lid, facing +x.
  const jackal = new Group()
  jackal.position.set(0.02, lidY + 0.007, 0)
  g.add(jackal)
  mesh(capsuleX(0.095, 0.32, 0.86, 0.78), resin, [-0.04, 0.1, 0], jackal)
  mesh(ellipsoid(0.1, 1.05, 1.2, 0.82), resin, [0.13, 0.13, 0], jackal)
  mesh(ellipsoid(0.11, 1.2, 1.0, 0.95), resin, [-0.22, 0.105, 0], jackal)
  for (const s of [-1, 1]) {
    mesh(ellipsoid(0.09, 1.45, 0.7, 0.45), resin, [-0.2, 0.072, s * 0.085], jackal)
    mesh(capsuleX(0.021, 0.08), resin, [-0.07, 0.021, s * 0.1], jackal)
    mesh(capsuleX(0.027, 0.22), resin, [0.3, 0.028, s * 0.056], jackal)
    mesh(ellipsoid(0.032, 1.35, 0.68, 1), resin, [0.435, 0.022, s * 0.056], jackal)
    // Silver claws, picked out as fine highlights.
    for (const k of [-1, 0, 1]) mesh(new SphereGeometry(0.006, 8, 6), silver, [0.468, 0.012, s * 0.056 + k * 0.013], jackal)
  }
  const neck = new CapsuleGeometry(0.062, 0.14, 8, 20)
  neck.rotateZ(-0.55)
  mesh(neck, resin, [0.2, 0.25, 0], jackal)
  mesh(ellipsoid(0.07, 1.15, 0.95, 0.86), resin, [0.27, 0.38, 0], jackal)
  mesh(capsuleX(0.03, 0.1, 0.9, 0.85), resin, [0.36, 0.366, 0], jackal)
  mesh(new SphereGeometry(0.02, 16, 12), resin, [0.425, 0.36, 0], jackal)

  for (const s of [-1, 1]) {
    const ear = mesh(new ConeGeometry(0.036, 0.135, 24).scale(0.42, 1, 1), resin, [0.255, 0.49, s * 0.042], jackal)
    ear.rotation.set(s * 0.14, 0, 0.08)
    const inner = mesh(new ConeGeometry(0.026, 0.1, 24).scale(0.3, 1, 1), gold, [0.0105, -0.012, 0], ear)
    inner.name = 'ear-gold'
    // Gold-rimmed calcite and obsidian eyes.
    mesh(new SphereGeometry(0.0125, 16, 12), gold, [0.33, 0.402, s * 0.05], jackal)
    mesh(new SphereGeometry(0.0095, 16, 12), glassMaterial('#ece4d4', 0.12), [0.336, 0.403, s * 0.052], jackal)
    mesh(new SphereGeometry(0.005, 12, 8), glassMaterial('#050505', 0.05), [0.344, 0.404, s * 0.053], jackal)
  }

  // Gilded collar around the neck.
  const collar = new TorusGeometry(0.066, 0.009, 10, 40)
  collar.rotateX(Math.PI / 2)
  collar.rotateZ(-0.55)
  mesh(collar, gold, [0.195, 0.245, 0], jackal)
  const collar2 = new TorusGeometry(0.06, 0.006, 10, 40)
  collar2.rotateX(Math.PI / 2)
  collar2.rotateZ(-0.55)
  mesh(collar2, gold, [0.215, 0.282, 0], jackal)

  // Tail draped over the back of the lid.
  const tail = new TubeGeometry(
    new CatmullRomCurve3([new Vector3(-0.3, 0.08, 0.02), new Vector3(-0.38, 0.03, 0.04), new Vector3(-0.43, -0.05, 0.05), new Vector3(-0.44, -0.15, 0.05)]),
    24,
    0.021,
    10,
  )
  mesh(tail, resin, undefined, jackal)

  const j = jackal.position
  marker(g, hotspots, 'ears', [j.x + 0.27, j.y + 0.57, 0.05], [0.8, 0.4, 0.4])
  marker(g, hotspots, 'eyes', [j.x + 0.35, j.y + 0.41, 0.06], [0.7, 0.2, 0.7])
  marker(g, hotspots, 'collar', [j.x + 0.2, j.y + 0.26, 0.08], [0.5, 0.3, 0.8])
  marker(g, hotspots, 'black', [j.x - 0.08, j.y + 0.2, 0.09], [0, 0.4, 1])
  marker(g, hotspots, 'shrine', [0.1, base + H * 0.5, D * 0.47], [0, 0, 1])
  marker(g, hotspots, 'poles', [0.8, -0.44, 0.255], [0.4, 0, 1])
  return { group: g, hotspots }
}
