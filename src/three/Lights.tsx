import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import type { AmbientLight, DirectionalLight, PointLight, SpotLight } from 'three'
import { color, num, sampleFrame, vec } from './director'
import { useJourney } from '../state/store'

/**
 * Lighting: a procedural studio of warm light panels for gold reflections, plus a
 * key spot, a rim light and a flickering torch. Everything fades up from black
 * during the intro and is driven by the chapter keyframes.
 */
export function Lights() {
  const ambient = useRef<AmbientLight>(null)
  const key = useRef<SpotLight>(null)
  const rim = useRef<DirectionalLight>(null)
  const torch = useRef<PointLight>(null)
  const scene = useThree((s) => s.scene)

  useFrame((state) => {
    const f = sampleFrame(state.clock.elapsedTime)
    const t = f.time
    const intro = f.intro
    const store = useJourney.getState()
    const dim = store.inspect && store.inspect !== 'mask' ? 1 - 0.45 * f.inspect : 1 + 0.15 * f.inspect
    if (ambient.current) {
      color('ambientColor', ambient.current.color)
      ambient.current.intensity = num('ambient') * intro
    }
    if (key.current) {
      color('keyColor', key.current.color)
      key.current.position.set(...vec('keyPos'))
      key.current.intensity = num('keyIntensity') * intro * dim
    }
    if (rim.current) {
      color('rimColor', rim.current.color)
      rim.current.position.set(...vec('rimPos'))
      rim.current.intensity = num('rimIntensity') * intro * dim
    }
    if (torch.current) {
      const flicker = 0.82 + 0.1 * Math.sin(t * 9.3) + 0.06 * Math.sin(t * 23.7 + 1.1) + 0.04 * Math.sin(t * 4.1)
      color('torchColor', torch.current.color)
      const [x, y, z] = vec('torchPos')
      torch.current.position.set(x + Math.sin(t * 3.1) * 0.03, y + Math.sin(t * 5.3) * 0.02, z)
      torch.current.intensity = num('torchIntensity') * flicker * intro
    }
    scene.environmentIntensity = num('env') * (0.15 + 0.85 * intro)
  })

  return (
    <>
      <ambientLight ref={ambient} intensity={0} />
      <spotLight ref={key} angle={0.55} penumbra={0.9} decay={0} distance={0} intensity={0} position={[0, 4, 3]} />
      <directionalLight ref={rim} intensity={0} position={[-3, 2, -3]} />
      <pointLight ref={torch} decay={0} distance={0} intensity={0} />
      <Environment resolution={256} frames={1} background={false}>
        <Lightformer form="rect" intensity={1.1} color="#ffd9a6" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        {/* Broad soft panel behind the camera: lets forward-facing gold read as gold. */}
        <Lightformer form="rect" intensity={1.25} color="#fff0d2" position={[0, 0.8, 9]} scale={[14, 7, 1]} />
        <Lightformer form="rect" intensity={3} color="#ffc47a" position={[-5, 1, 3]} scale={[3, 7, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#ffad5c" position={[5, 2, -2]} scale={[2, 7, 1]} />
        <Lightformer form="ring" intensity={2} color="#ff9a50" position={[0, 0, -6]} scale={3} />
        <Lightformer form="rect" intensity={2.2} color="#fff0d8" position={[-1.6, 0, 5]} scale={[0.25, 9, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffe2b8" position={[2.2, 0.5, 5]} scale={[0.18, 9, 1]} />
        <Lightformer form="rect" intensity={0.35} color="#5a3212" position={[0, -5, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
    </>
  )
}
