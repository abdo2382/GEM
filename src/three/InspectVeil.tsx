import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type Mesh, type MeshBasicMaterial, type PerspectiveCamera } from 'three'
import { sampleFrame } from './director'
import { useJourney } from '../state/store'

/** Between the inspected artifact (3.9 from the camera) and the withdrawn mask (beyond 7). */
const DIST = 5.6
const tmp = new Vector3()

/**
 * Inspecting an artifact: a veil of tomb darkness falls behind it, so the mask (lit
 * mostly by its photographs, and so barely touched by the dimmed lights) recedes.
 */
export function InspectVeil() {
  const ref = useRef<Mesh>(null)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  // The store clears `inspect` at once on close; remember what is still fading out.
  const artifact = useRef(false)

  useFrame((state) => {
    const m = ref.current
    if (!m) return
    const f = sampleFrame(state.clock.elapsedTime)
    const inspect = useJourney.getState().inspect
    if (inspect) artifact.current = inspect !== 'mask'
    const o = artifact.current ? 0.82 * f.inspect : 0
    m.visible = o > 0.002
    if (!m.visible) return
    ;(m.material as MeshBasicMaterial).opacity = o
    const halfH = DIST * Math.tan((camera.fov * Math.PI) / 360)
    m.position.copy(camera.localToWorld(tmp.set(0, 0, -DIST)))
    m.quaternion.copy(camera.quaternion)
    m.scale.set(halfH * (size.width / size.height) * 2.4, halfH * 2.4, 1)
  })

  return (
    <mesh ref={ref} visible={false}>
      <planeGeometry />
      <meshBasicMaterial color="#030201" transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
