import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import { useJourney } from '../state/store'
import { CameraRig } from './CameraRig'
import { Lights } from './Lights'
import { Atmosphere } from './Atmosphere'
import { MaskView } from './MaskView'
import { MaskRig } from './MaskRig'
import { Artifacts } from './Artifacts'
import { InspectVeil } from './InspectVeil'
import { PostFX } from './PostFX'

/** Tells the UI the scene has compiled and drawn its first frames. */
function ReadySignal() {
  const frames = useRef(0)
  useFrame(() => {
    frames.current++
    if (frames.current === 4) useJourney.getState().setReady()
  })
  return null
}

/** One canvas, one scene: mask, artifacts and atmosphere share the same light and grade. */
export function Stage() {
  const quality = useJourney((s) => s.quality)
  const high = quality === 'high'
  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        dpr={high ? [1, 1.75] : [1, 1.25]}
        gl={{ antialias: !high, powerPreference: 'high-performance', stencil: false, toneMapping: ACESFilmicToneMapping }}
        camera={{ fov: 35, position: [0, 0, 7.2], near: 0.1, far: 60 }}
        onCreated={(state) => {
          if (import.meta.env.DEV) (window as unknown as { __r3f: unknown }).__r3f = state
        }}
      >
        <color attach="background" args={['#030201']} />
        <Suspense fallback={null}>
          <CameraRig />
          <Lights />
          <Atmosphere />
          {/* The approved mask, moved around the frame only by its parent rig. */}
          <MaskRig>
            <MaskView />
          </MaskRig>
          <InspectVeil />
          <Artifacts />
          {high ? <PostFX multisampling={4} /> : null}
          <ReadySignal />
        </Suspense>
      </Canvas>
    </div>
  )
}
