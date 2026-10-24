import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { sampleFrame, vec } from './director'
import { useJourney } from '../state/store'

const target = new Vector3()
const look = new Vector3()
const lookCurrent = new Vector3()

/** Scroll-choreographed camera with a faint handheld drift and pointer parallax. */
export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 })

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((state) => {
    const f = sampleFrame(state.clock.elapsedTime)
    const reduced = useJourney.getState().reducedMotion
    const pr = pointer.current
    const k = 1 - Math.exp(-2.5 * f.delta)
    pr.sx += (pr.x - pr.sx) * k
    pr.sy += (pr.y - pr.sy) * k

    const [px, py, pz] = vec('camPos')
    const [tx, ty, tz] = vec('camTarget')
    const t = f.time
    const hand = reduced ? 0 : 1
    const story = 1 - f.inspect
    target.set(
      px * story + (Math.sin(t * 0.21) * 0.035 + pr.sx * 0.16) * hand * story,
      py * story + (Math.sin(t * 0.17 + 1.3) * 0.025 - pr.sy * 0.1) * hand * story,
      pz * story + 6.4 * f.inspect + (1 - f.intro) * 0.9,
    )
    look.set(tx * story, ty * story, tz * story)

    const lambda = 1 - Math.exp(-3.2 * f.delta)
    camera.position.lerp(target, lambda)
    lookCurrent.lerp(look, lambda)
    camera.lookAt(lookCurrent)
  })
  return null
}
