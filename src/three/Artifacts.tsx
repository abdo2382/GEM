import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  Box3,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  type PerspectiveCamera,
  type SpotLight,
  Vector3,
  type Material,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ARTIFACT_IDS } from '../content/chapters'
import { ARTIFACTS } from '../content/artifacts'
import type { ArtifactId } from '../content/types'
import { applyDissolve, createDissolve, type Dissolve } from './materials'
import { buildAnubis } from './models/anubis'
import { buildThrone } from './models/throne'
import { buildCanopic } from './models/canopic'
import type { ArtifactModel } from './models/common'
import { radialGlowTexture } from './textures'
import { sampleFrame } from './director'
import { sceneLayout } from './layout'
import { useJourney } from '../state/store'
import { inspectState } from '../state/scroll'
import { projectHotspots } from './hotspotProjection'

const BUILDERS: Record<ArtifactId, () => ArtifactModel> = {
  anubis: buildAnubis,
  throne: buildThrone,
  canopic: buildCanopic,
}

/** A resting three-quarter view for each artifact. */
const BASE_YAW: Record<ArtifactId, number> = { anubis: -0.75, throne: 0.55, canopic: 0.62 }

interface Item {
  id: ArtifactId
  rig: Group
  spin: Group
  norm: Group
  model: ArtifactModel
  dissolve: Dissolve
  glow: Mesh
  vis: number
  lastRotY: number
}

function dissolveAll(root: Object3D, d: Dissolve) {
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as Material[]
    mats.forEach((mat) => applyDissolve(mat, d))
  })
}

/** Centre the model on its bounding box and fit it into a unit cube. */
function normalise(norm: Group, content: Object3D) {
  norm.clear()
  norm.add(content)
  content.position.set(0, 0, 0)
  content.updateMatrixWorld(true)
  const box = new Box3().setFromObject(content)
  const size = box.getSize(new Vector3())
  const centre = box.getCenter(new Vector3())
  content.position.sub(centre)
  norm.scale.setScalar(1 / Math.max(size.x, size.y, size.z))
}

function makeItem(id: ArtifactId, glowTex: ReturnType<typeof radialGlowTexture>): Item {
  const model = BUILDERS[id]()
  const dissolve = createDissolve()
  dissolveAll(model.group, dissolve)
  const rig = new Group()
  const spin = new Group()
  const norm = new Group()
  rig.add(spin)
  spin.add(norm)
  normalise(norm, model.group)
  const glow = new Mesh(
    new PlaneGeometry(1.5, 1.5),
    new MeshBasicMaterial({ map: glowTex, color: new Color('#ffb062'), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
  )
  // A pool of lamplight just behind and beneath the object.
  glow.rotation.x = -1.05
  glow.position.set(0, -0.42, -0.25)
  rig.add(glow)
  rig.visible = false
  return { id, rig, spin, norm, model, dissolve, glow, vis: 0, lastRotY: BASE_YAW[id] }
}

/** Studio reference mode shows the mask alone. */
const STUDIO = new URLSearchParams(location.search).has('studio')

const tmp = new Vector3()
const lightOffset = new Vector3()

export function Artifacts() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const items = useMemo(() => {
    const glowTex = radialGlowTexture()
    return ARTIFACT_IDS.map((id) => makeItem(id, glowTex))
  }, [])
  const spot = useRef<SpotLight>(null)
  const fill = useRef<SpotLight>(null)
  const target = useMemo(() => new Object3D(), [])

  // Optional licensed scans replace the procedural reconstructions when configured.
  useEffect(() => {
    const loader = new GLTFLoader()
    for (const item of items) {
      const url = ARTIFACTS[item.id].glb
      if (!url) continue
      loader
        .loadAsync(url)
        .then((gltf) => {
          dissolveAll(gltf.scene, item.dissolve)
          normalise(item.norm, gltf.scene)
          item.model.hotspots = {}
        })
        .catch((err) => console.warn(`[artifacts] could not load ${url}; keeping the reconstruction`, err))
    }
  }, [items])

  useFrame((state) => {
    const f = sampleFrame(state.clock.elapsedTime)
    const dt = f.delta
    const store = useJourney.getState()
    const L = sceneLayout(size.width, size.height)
    const aspect = size.width / size.height
    const halfFov = (camera.fov * Math.PI) / 360
    let lead: Item | null = null

    for (const item of items) {
      const inspected = store.inspect === item.id
      const blend = inspected ? f.inspect : 0
      const targetVis = STUDIO ? 0 : inspected ? 1 : f.artifactPresence[item.id] * (1 - f.inspect) * f.intro
      item.vis += (targetVis - item.vis) * (1 - Math.exp(-(store.reducedMotion ? 14 : 6) * dt))
      const vis = item.vis
      item.rig.visible = vis > 0.004
      if (!item.rig.visible) continue
      if (!lead || vis > lead.vis) lead = item

      // Placement in camera space, so the artifact column holds its place on screen.
      const dist = 5.4 - 1.5 * blend
      const halfH = dist * Math.tan(halfFov)
      const halfW = halfH * aspect
      let sx: number, sy: number, scale: number
      if (L.portrait) {
        sx = 0
        sy = -halfH * 0.06
        scale = Math.min(halfW * 1.35, halfH * 0.9)
      } else {
        // Above the caption card, in the column opposite the papyrus.
        sx = L.side * halfW * (L.tablet ? 0.6 : 0.585)
        sy = halfH * 0.2
        scale = Math.min(halfH * 0.74, halfW * 0.42)
      }
      const ix = L.portrait ? 0 : L.side * halfW * 0.2
      const iy = L.portrait ? halfH * 0.2 : halfH * 0.04
      const iscale = L.portrait ? Math.min(halfW * 1.5, halfH * 0.85) : Math.min(halfH * 0.98, halfW * 0.72)
      const sink = (1 - vis) * halfH * 0.22
      tmp.set(sx + (ix - sx) * blend, sy + (iy - sy) * blend - sink, -dist)
      item.rig.position.copy(camera.localToWorld(tmp))
      item.rig.quaternion.copy(camera.quaternion)
      const s = (scale + (iscale - scale) * blend) * (0.92 + 0.08 * vis) * (inspected ? inspectState.zoom : 1)
      item.rig.scale.setScalar(s)

      // Rotation: a slow showcase sway in the story; the visitor's hands in Inspect.
      if (inspected) {
        if (!inspectState.dragging) {
          inspectState.rotY += inspectState.velY * dt * 60
          inspectState.rotX += inspectState.velX * dt * 60
          inspectState.velY *= Math.exp(-3.2 * dt)
          inspectState.velX *= Math.exp(-3.2 * dt)
        }
        inspectState.rotX = Math.max(-0.6, Math.min(0.9, inspectState.rotX))
        inspectState.zoom += (inspectState.targetZoom - inspectState.zoom) * (1 - Math.exp(-8 * dt))
        const ty = BASE_YAW[item.id] + inspectState.rotY
        item.spin.rotation.y += (ty - item.spin.rotation.y) * (1 - Math.exp(-10 * dt))
        item.spin.rotation.x += (inspectState.rotX - item.spin.rotation.x) * (1 - Math.exp(-10 * dt))
      } else {
        const idle = store.reducedMotion ? 0 : 1
        const ty = BASE_YAW[item.id] + Math.sin(f.time * 0.21) * 0.55 * idle + f.drift * 3.2 + (1 - vis) * 0.9
        item.spin.rotation.y += (ty - item.spin.rotation.y) * (1 - Math.exp(-3 * dt))
        item.spin.rotation.x += (0.1 - item.spin.rotation.x) * (1 - Math.exp(-3 * dt))
      }

      item.dissolve.uDissolve.value = Math.min(1.05, (1 - vis) * 1.1)
      item.dissolve.uOrigin.value.copy(item.rig.position)
      item.dissolve.uScale.value = s
      ;(item.glow.material as MeshBasicMaterial).opacity = vis * vis * 0.32 * (1 - 0.5 * blend)

      // Inspect hotspots: project markers to the screen and hide those facing away.
      if (inspected && blend > 0.6) {
        projectHotspots(item.model.hotspots, camera, size.width, size.height, Math.min(1, (blend - 0.6) * 4))
      }
    }

    // A warm key that follows whichever artifact holds the stage.
    if (spot.current && fill.current) {
      const l = lead as Item | null
      const v = l ? l.vis : 0
      if (l) {
        target.position.copy(l.rig.position)
        lightOffset.set(L.side * -1.4, 2.6, 2.4).applyQuaternion(camera.quaternion)
        spot.current.position.copy(l.rig.position).add(lightOffset)
        lightOffset.set(L.side * 2.2, 0.4, -1.8).applyQuaternion(camera.quaternion)
        fill.current.position.copy(l.rig.position).add(lightOffset)
      }
      spot.current.intensity = v * 5.5 * f.intro
      fill.current.intensity = v * 3.2 * f.intro
    }
  })

  return (
    <>
      {items.map((it) => (
        <primitive key={it.id} object={it.rig} />
      ))}
      <primitive object={target} />
      <spotLight ref={spot} target={target} angle={0.6} penumbra={1} decay={0} color="#ffd7a0" intensity={0} />
      <spotLight ref={fill} target={target} angle={0.7} penumbra={1} decay={0} color="#ff9d52" intensity={0} />
    </>
  )
}
