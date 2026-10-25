import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping, HalfFloatType, type Object3D, WebGLRenderTarget } from 'three'
import { useJourney } from '../state/store'
import { CameraRig } from './CameraRig'
import { Lights } from './Lights'
import { Atmosphere } from './Atmosphere'
import { MaskView } from './MaskView'
import { MaskRig } from './MaskRig'
import { Artifacts } from './Artifacts'
import { InspectVeil } from './InspectVeil'
import { PostFX } from './PostFX'
import { PRESETS } from '../quality/adaptiveQuality'
import { QualityGovernor } from '../quality/QualityGovernor'

/** Tells the UI the scene has compiled and drawn its first frames. */
function ReadySignal() {
  const frames = useRef(0)
  useFrame(() => {
    frames.current++
    if (frames.current === 4) useJourney.getState().setReady()
  })
  return null
}

/**
 * Compiles every material before the first frame is drawn. Compiling on first use
 * froze the page for seconds on phones (the gate's Start button included); here the
 * driver compiles in parallel where it can, and the scene starts once it is done.
 */
function Precompile({ onDone, offscreen }: { onDone: () => void; offscreen: boolean }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      onDone()
    }
    // With post-processing the scene is drawn into an off-screen target, whose shaders
    // differ (no tone mapping, linear output): compile against the same kind of target,
    // or every material would compile a second time on first use.
    const target = offscreen ? new WebGLRenderTarget(1, 1, { type: HalfFloatType }) : null
    const previous = gl.getRenderTarget()
    gl.setRenderTarget(target)
    const ready = gl.compileAsync(scene, camera)
    gl.setRenderTarget(previous)
    target?.dispose()
    ready.then(finish, finish)
    // Never hold the journey back on a driver that doesn't report completion.
    const id = window.setTimeout(finish, 12000)
    return () => window.clearTimeout(id)
    // A later switch to or from the low tier (no off-screen target) compiles the
    // variants it needs in the background too.
  }, [gl, scene, camera, onDone, offscreen])
  return null
}

/**
 * Once the opening has settled, compiles the shader variants the other tiers draw with
 * (straight to the screen, or into the post-processing target), treasures included, so
 * a tier change mid-story doesn't stall the frame on compilation.
 */
function PrecompileOther({ offscreen }: { offscreen: boolean }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const started = useJourney((s) => s.started)
  const done = useRef(false)
  useEffect(() => {
    if (!started || done.current) return
    const id = window.setTimeout(() => {
      done.current = true
      // Treasures off stage are hidden; show them for the call only (no frame runs in between).
      const shown: Object3D[] = []
      scene.traverse((o) => {
        if (!o.name.startsWith('artifact-')) return
        for (let p: Object3D | null = o; p; p = p.parent) {
          if (!p.visible) {
            p.visible = true
            shown.push(p)
          }
        }
      })
      const target = offscreen ? null : new WebGLRenderTarget(1, 1, { type: HalfFloatType })
      const previous = gl.getRenderTarget()
      // The post-processing chain turns the renderer's tone mapping off while it is
      // mounted; the low tier draws with it on, and that is part of each shader's key.
      const toneMapping = gl.toneMapping
      if (offscreen) gl.toneMapping = ACESFilmicToneMapping
      gl.setRenderTarget(target)
      gl.compileAsync(scene, camera).catch(() => undefined)
      gl.setRenderTarget(previous)
      gl.toneMapping = toneMapping
      target?.dispose()
      for (const o of shown) o.visible = false
    }, 6000)
    return () => window.clearTimeout(id)
  }, [started, gl, scene, camera, offscreen])
  return null
}

/** One canvas, one scene: mask, artifacts and atmosphere share the same light and grade. */
export function Stage() {
  const quality = useJourney((s) => s.quality)
  const preset = PRESETS[quality]
  // Fixed when the context is made: the full grade antialiases inside its own render target.
  const [antialias] = useState(() => PRESETS[useJourney.getState().quality].postfx !== 'full')
  const [compiled, setCompiled] = useState(false)
  const onCompiled = useCallback(() => setCompiled(true), [])
  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        dpr={[1, preset.maxDpr]}
        frameloop={compiled ? 'always' : 'never'}
        gl={{ antialias, powerPreference: 'high-performance', stencil: false, toneMapping: ACESFilmicToneMapping }}
        camera={{ fov: 35, position: [0, 0, 7.2], near: 0.1, far: 60 }}
        onCreated={(state) => {
          if (import.meta.env.DEV) (window as unknown as { __r3f: unknown }).__r3f = state
          // Three.js keeps the context restorable; the app shows the story edition if it
          // doesn't come back, and returns one tier lighter (memory pressure) if it does.
          const canvas = state.gl.domElement
          canvas.addEventListener('webglcontextlost', () => useJourney.getState().setContextLost(true))
          canvas.addEventListener('webglcontextrestored', () => {
            const s = useJourney.getState()
            s.setContextLost(false)
            if (s.qualityPref === 'auto') s.setQuality(s.quality === 'high' ? 'medium' : 'low')
          })
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
          {preset.postfx !== 'off' ? <PostFX mode={preset.postfx} multisampling={preset.msaa} /> : null}
          <QualityGovernor />
          <ReadySignal />
          <Precompile onDone={onCompiled} offscreen={preset.postfx !== 'off'} />
          <PrecompileOther offscreen={preset.postfx !== 'off'} />
        </Suspense>
      </Canvas>
    </div>
  )
}
