import { useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group, PerspectiveCamera } from 'three'
import { sampleFrame } from './director'
import { sceneLayout } from './layout'
import { plateau } from '../state/scroll'
import { useJourney } from '../state/store'
import { rigTarget } from './rigPlan'
import { openingFrame } from '../ui/openingFrame'

const STUDIO = new URLSearchParams(location.search).get('studio') !== null
const damp = (a: number, b: number, l: number, dt: number) => a + (b - a) * (1 - Math.exp(-l * dt))

/**
 * The mask's choreography layer. The approved mask (MaskView) is left exactly as it
 * is; this parent group moves it around the frame from chapter to chapter, following
 * the scroll, and hands the frame back to Inspect when the visitor opens it.
 */
export function MaskRig({ children }: { children: ReactNode }) {
  const rig = useRef<Group>(null)
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as PerspectiveCamera

  // Runs before the mask's own frame (priority -1), so the photo projection it syncs
  // always sees this frame's rig transform.
  useFrame((state) => {
    const g = rig.current
    if (!g) return
    if (STUDIO) {
      g.position.set(0, 0, 0)
      g.scale.setScalar(1)
      return
    }
    const f = sampleFrame(state.clock.elapsedTime)
    const L = sceneLayout(size.width, size.height)
    const { i, j, t } = f.segment
    const goal = rigTarget(L.portrait, i, j, plateau(t), f.intro, f.inspect, L.side, openingFrame.fit)
    // Offsets are fractions of the screen; turn them into world units at the mask.
    const halfH = camera.position.z * Math.tan((camera.fov * Math.PI) / 360)
    const halfW = halfH * (size.width / size.height)
    const k = useJourney.getState().reducedMotion ? 30 : 4.5
    const dt = f.delta
    g.position.x = damp(g.position.x, goal.x * 2 * halfW, k, dt)
    g.position.y = damp(g.position.y, goal.y * 2 * halfH, k, dt)
    g.scale.setScalar(damp(g.scale.x, goal.scale, k, dt))
  }, -1)

  return (
    <group ref={rig} name="mask-rig">
      {children}
    </group>
  )
}
