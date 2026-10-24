import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Box3, Vector3, type Group, type PerspectiveCamera } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { buildMask, MASK_EXTENT } from './models/mask'
import { num, sampleFrame, vec } from './director'
import { sceneLayout } from './layout'
import { projectHotspots } from './hotspotProjection'
import { useJourney } from '../state/store'
import { inspectState } from '../state/scroll'
import { MASK } from '../content/artifacts'
import { MASK_PHOTOS } from '../content/maskPhotos'
import { applyPhotoProjection, createPhotoProjection } from './photoProjection'

/** Fit the measured model (≈2.74 units tall) to the framing the chapter keys were tuned for. */
const FIT = 2.25 / (MASK_EXTENT.top - MASK_EXTENT.bottom)

/** `?studio=<degrees>` poses the mask alone, front-on (or turned), for reference shots. */
const STUDIO = new URLSearchParams(location.search).get('studio')

const damp = (a: number, b: number, l: number, dt: number) => a + (b - a) * (1 - Math.exp(-l * dt))
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** The golden mask: the centrepiece, choreographed by scroll, and inspectable in 360°. */
export function MaskView() {
  // Built together so each model instance owns exactly one projection (StrictMode-safe).
  const { model, photos } = useMemo(() => {
    const model = buildMask()
    if (!MASK_PHOTOS.enabled) return { model, photos: null }
    const photos = createPhotoProjection(MASK_PHOTOS.views, model.group.children[0].position.clone(), () => undefined)
    applyPhotoProjection(model.group, photos.uniforms)
    return { model, photos }
  }, [])
  const ref = useRef<Group>(null)
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const gl = useThree((s) => s.gl)

  // Photographs of the original, projected onto the model for its true colours and inlays.
  useEffect(() => {
    if (!photos) return
    photos.bakeDepth(gl, model.group)
    if (import.meta.env.DEV) (window as unknown as { __photo: unknown }).__photo = photos
  }, [photos, gl, model])

  // A licensed scan can replace the reconstruction (see MASK.glb in content/artifacts.ts).
  useEffect(() => {
    if (!MASK.glb) return
    new GLTFLoader()
      .loadAsync(MASK.glb)
      .then((gltf) => {
        const root = model.group.children[0]
        const box = new Box3().setFromObject(gltf.scene)
        const sizeV = box.getSize(new Vector3())
        gltf.scene.position.sub(box.getCenter(new Vector3()))
        gltf.scene.scale.setScalar((MASK_EXTENT.top - MASK_EXTENT.bottom) / sizeV.y)
        root.visible = false
        model.group.add(gltf.scene)
        model.hotspots = {}
      })
      .catch((err) => console.warn('[mask] could not load scan; keeping the reconstruction', err))
  }, [model])

  // The projection must use this frame's transform, not last frame's, or photos would swim.
  const syncPhotos = (g: Group) => {
    if (!photos) return
    g.updateWorldMatrix(true, false)
    photos.update(g)
    // Exact photo colours in studio and Inspect; in the story, chapter lighting tints it a little.
    const exact = STUDIO !== null || useJourney.getState().inspect === 'mask'
    photos.uniforms.uPhotoUnlit.value = exact ? 0.97 : 0.86
  }

  useFrame((state) => {
    const g = ref.current
    if (!g) return
    const f = sampleFrame(state.clock.elapsedTime)
    const dt = f.delta
    const store = useJourney.getState()
    const L = sceneLayout(size.width, size.height)
    const idle = store.reducedMotion ? 0 : 1
    const t = f.time
    const artifact = Math.max(...Object.values(f.artifactPresence))

    if (STUDIO !== null) {
      g.position.set(0, -0.05, 0.4)
      const w = window as unknown as { __studioAngle?: number; __studioPitch?: number }
      const deg = w.__studioAngle ?? (Number(STUDIO) || 0)
      g.rotation.set(((w.__studioPitch ?? 0) * Math.PI) / 180, (deg * Math.PI) / 180, 0)
      g.scale.setScalar(1.12 * FIT)
      syncPhotos(g)
      return
    }

    const [rx, ry, rz] = vec('maskRot')
    const [x, y, z] = vec('maskPos')
    let s = num('maskScale') * FIT
    let tx = x
    let ty = y + Math.sin(t * 0.6) * 0.022 * idle - (1 - f.intro) * 0.16
    let tz = z
    const vel = Math.max(-1, Math.min(1, f.velocity * 0.6))
    let rotY = ry + f.drift * 2.4 + Math.sin(t * 0.23) * 0.05 * idle + vel * 0.08
    let rotX = rx + Math.sin(t * 0.31 + 0.7) * 0.015 * idle
    let rotZ = rz + Math.sin(t * 0.19) * 0.01 * idle

    if (L.portrait) {
      // Phones: the mask presides from above while an artifact takes the stage.
      s *= 0.66 * (1 - 0.45 * artifact)
      ty = ty * 0.5 + 0.38 + 0.6 * artifact
      tx = 0
    } else if (L.tablet) {
      s *= 0.86
    }
    s *= 0.95 + 0.05 * f.intro

    const self = store.inspect === 'mask'
    if (self) {
      // Inspect the mask: it comes forward beside the panel and turns in the visitor's hands.
      const b = f.inspect
      if (!inspectState.dragging) {
        inspectState.rotY += inspectState.velY * dt * 60
        inspectState.rotX += inspectState.velX * dt * 60
        inspectState.velY *= Math.exp(-3.2 * dt)
        inspectState.velX *= Math.exp(-3.2 * dt)
      }
      inspectState.rotX = Math.max(-0.5, Math.min(0.6, inspectState.rotX))
      inspectState.zoom += (inspectState.targetZoom - inspectState.zoom) * (1 - Math.exp(-8 * dt))
      const ix = L.portrait ? 0 : L.side * 0.62
      const iy = L.portrait ? 0.45 : 0.02
      tx += (ix - tx) * b
      ty += (iy - ty) * b
      tz += (0.9 - tz) * b
      s = s * (1 - b) + (L.portrait ? 0.66 : 1.02) * FIT * inspectState.zoom * b
      rotY = inspectState.rotY + 0.5
      rotX = inspectState.rotX - 0.12
      rotZ = 0
    } else {
      // Inspecting an artifact: the mask withdraws into the dark behind it.
      tz -= 2.8 * f.inspect
      ty += 0.2 * f.inspect
      s *= 1 - 0.12 * f.inspect
      // Unwind any turns left over from Inspect so it never spins back the long way.
      g.rotation.y = rotY + wrap(g.rotation.y - rotY)
    }

    const k = self ? 6 : 3.6
    g.position.set(damp(g.position.x, tx, k, dt), damp(g.position.y, ty, k, dt), damp(g.position.z, tz, k, dt))
    g.rotation.set(damp(g.rotation.x, rotX, k, dt), damp(g.rotation.y, rotY, self ? 10 : 2.8, dt), damp(g.rotation.z, rotZ, k, dt))
    g.scale.setScalar(damp(g.scale.x, s, k, dt))
    syncPhotos(g)

    if (self && f.inspect > 0.6) projectHotspots(model.hotspots, camera, size.width, size.height, Math.min(1, (f.inspect - 0.6) * 4))
  })

  return <primitive ref={ref} object={model.group} />
}
