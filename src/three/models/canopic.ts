import { BoxGeometry, CapsuleGeometry, CylinderGeometry, Group, LatheGeometry, SphereGeometry, TorusGeometry, Vector2, Vector3, type Material } from 'three'
import { glassMaterial, goldMaterial, pbrMaterial } from '../materials'
import { glyphPanelTexture } from '../textures'
import { ellipsoid, linePoints, marker, mesh, taperedBox, uraeusFrieze, type ArtifactModel } from './common'

type Emblem = 'isis' | 'nephthys' | 'neith' | 'serket'

/** A slender standing goddess facing +z, arms reaching forward, head turned aside. */
function goddess(gold: Material, emblem: Emblem, turn: number) {
  const f = new Group()
  const profile = [
    [0.0, 0],
    [0.042, 0],
    [0.039, 0.06],
    [0.046, 0.15],
    [0.058, 0.24],
    [0.056, 0.3],
    [0.049, 0.34],
    [0.057, 0.38],
    [0.064, 0.405],
    [0.032, 0.425],
    [0.0, 0.43],
  ].map(([r, y]) => new Vector2(r, y))
  const body = new LatheGeometry(profile, 32)
  body.scale(1, 1, 0.62)
  mesh(body, gold, undefined, f)
  mesh(new BoxGeometry(0.05, 0.016, 0.05), gold, [0, 0.008, 0.03], f)
  mesh(new CylinderGeometry(0.016, 0.018, 0.04, 16), gold, [0, 0.44, 0], f)
  for (const s of [-1, 1]) {
    const arm = new CapsuleGeometry(0.012, 0.15, 6, 12)
    arm.rotateX(Math.PI / 2 - 0.1)
    mesh(arm, gold, [s * 0.056, 0.385, 0.085], f)
  }
  const head = new Group()
  head.position.set(0, 0.485, 0)
  head.rotation.y = turn
  f.add(head)
  mesh(ellipsoid(0.034, 0.92, 1.1, 0.95), gold, [0, 0, 0.008], head)
  mesh(ellipsoid(0.044, 1.0, 1.12, 0.95), gold, [0, 0.006, -0.012], head)
  for (const s of [-1, 1]) mesh(new BoxGeometry(0.02, 0.07, 0.03), gold, [s * 0.034, -0.045, 0.008], head)
  const top = new Group()
  top.position.y = 0.055
  head.add(top)
  if (emblem === 'isis') {
    // The throne sign.
    mesh(new BoxGeometry(0.03, 0.012, 0.024), gold, [0, 0.006, 0], top)
    mesh(new BoxGeometry(0.01, 0.034, 0.024), gold, [-0.012, 0.024, 0], top)
  } else if (emblem === 'nephthys') {
    // House and basket.
    mesh(new BoxGeometry(0.032, 0.026, 0.02), gold, [0, 0.013, 0], top)
    mesh(new SphereGeometry(0.017, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI), gold, [0, 0.042, 0], top)
  } else if (emblem === 'neith') {
    // Crossed arrows.
    for (const a of [-0.6, 0.6]) {
      const arrow = mesh(new CylinderGeometry(0.003, 0.003, 0.06, 6), gold, [0, 0.024, 0], top)
      arrow.rotation.z = a
    }
  } else {
    // Scorpion.
    mesh(ellipsoid(0.014, 1, 0.6, 1.6), gold, [0, 0.01, 0], top)
    const tail = mesh(new TorusGeometry(0.014, 0.004, 6, 16, Math.PI * 1.2), gold, [0, 0.022, -0.016], top)
    tail.rotation.y = Math.PI / 2
  }
  return f
}

/*
 * Artistic reconstruction of the gilded canopic shrine (Treasury, KV62): a shrine
 * under a canopy on a sledge, both crowned with uraei, guarded by Isis, Nephthys,
 * Neith and Serket.
 */
export function buildCanopic(): ArtifactModel {
  const g = new Group()
  const hotspots = {}
  const gold = goldMaterial({ roughness: 0.26 })
  const goldSoft = goldMaterial({ roughness: 0.44 })
  const carnelian = glassMaterial('#a83a1e', 0.12)
  const panelA = pbrMaterial(glyphPanelTexture(11), { bumpScale: 2.6 })
  const panelB = pbrMaterial(glyphPanelTexture(29), { bumpScale: 2.6 })

  // Sledge.
  mesh(new BoxGeometry(1.0, 0.05, 0.82), goldSoft, [0, 0.025, 0], g)
  for (const z of [-0.36, 0.36]) mesh(new BoxGeometry(1.04, 0.04, 0.05), gold, [0, -0.015, z], g)

  // Inner shrine.
  const shrineH = 0.6
  mesh(taperedBox(0.5, shrineH, 0.4, 0.97, 0.96), [panelB, panelB, gold, gold, panelA, panelA], [0, 0.05 + shrineH / 2, 0], g)
  mesh(taperedBox(0.49, 0.05, 0.39, 1.12, 1.15), gold, [0, 0.675, 0], g)
  mesh(new BoxGeometry(0.57, 0.012, 0.46), goldSoft, [0, 0.706, 0], g)
  const shrineTop = 0.712
  g.add(
    uraeusFrieze(linePoints(new Vector3(-0.25, shrineTop, 0.21), new Vector3(0.25, shrineTop, 0.21), 12), new Vector3(0, 0, 1), 0.016, gold, carnelian),
    uraeusFrieze(linePoints(new Vector3(-0.25, shrineTop, -0.21), new Vector3(0.25, shrineTop, -0.21), 12), new Vector3(0, 0, -1), 0.016, gold, carnelian),
  )

  // Canopy: four posts, beams, a flared cornice and a crowning frieze of uraei.
  for (const x of [-0.46, 0.46]) for (const z of [-0.37, 0.37]) mesh(new BoxGeometry(0.035, 0.95, 0.035), gold, [x, 0.525, z], g)
  for (const z of [-0.37, 0.37]) {
    mesh(new BoxGeometry(0.97, 0.06, 0.05), goldSoft, [0, 1.0, z], g)
    mesh(taperedBox(0.97, 0.04, 0.05, 1.03, 1.6), gold, [0, 1.05, z], g)
  }
  for (const x of [-0.46, 0.46]) {
    mesh(new BoxGeometry(0.05, 0.06, 0.79), goldSoft, [x, 1.0, 0], g)
    mesh(taperedBox(0.05, 0.04, 0.79, 1.6, 1.03), gold, [x, 1.05, 0], g)
  }
  const roofY = 1.072
  g.add(
    uraeusFrieze(linePoints(new Vector3(-0.45, roofY, 0.38), new Vector3(0.45, roofY, 0.38), 21), new Vector3(0, 0, 1), 0.02, gold, carnelian),
    uraeusFrieze(linePoints(new Vector3(-0.45, roofY, -0.38), new Vector3(0.45, roofY, -0.38), 21), new Vector3(0, 0, -1), 0.02, gold, carnelian),
    uraeusFrieze(linePoints(new Vector3(0.47, roofY, -0.33), new Vector3(0.47, roofY, 0.33), 16), new Vector3(1, 0, 0), 0.02, gold, carnelian),
    uraeusFrieze(linePoints(new Vector3(-0.47, roofY, -0.33), new Vector3(-0.47, roofY, 0.33), 16), new Vector3(-1, 0, 0), 0.02, gold, carnelian),
  )

  // The four goddesses face the shrine, arms outstretched, heads turned aside.
  const placements: [Emblem, number, number, number][] = [
    ['isis', 0, 0.315, Math.PI],
    ['nephthys', 0, -0.315, 0],
    ['neith', -0.37, 0, Math.PI / 2],
    ['serket', 0.37, 0, -Math.PI / 2],
  ]
  placements.forEach(([emblem, x, z, rot], i) => {
    const fig = goddess(gold, emblem, i % 2 ? -0.45 : 0.45)
    fig.position.set(x, 0.05, z)
    fig.rotation.y = rot
    fig.scale.setScalar(1.1)
    g.add(fig)
  })

  marker(g, hotspots, 'goddesses', [0, 0.62, 0.33], [0, 0.2, 1])
  marker(g, hotspots, 'uraei', [0.2, 1.1, 0.39], [0, 0.5, 1])
  marker(g, hotspots, 'chest', [0.17, 0.45, 0.21], [0, 0, 1])
  marker(g, hotspots, 'sledge', [0.46, 0.03, 0.42], [0.6, 0.2, 1])
  return { group: g, hotspots }
}
