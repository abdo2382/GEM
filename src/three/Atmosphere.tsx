import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, type Mesh, type ShaderMaterial, Vector2, Vector3, Vector4 } from 'three'
import { color, num, sampleFrame } from './director'
import { rng } from './textures'
import { antechamberScene, burialScene, treasuresScene, valleyScene } from './sceneTextures'
import { plateau } from '../state/scroll'
import { useJourney } from '../state/store'

/*
 * The tomb around the visitor, generated in real time rather than streamed as video:
 * a painted scene for each chapter (the valley, the sealed doorway, the treasure-heaped
 * Antechamber, the Burial Chamber), out of focus and lit by a flickering torch; a beam of light from
 * the breach with dust drifting through it; and, in the epilogue, the triangular
 * lattice that evokes the Grand Egyptian Museum's façade.
 */

const backdropVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const backdropFrag = /* glsl */ `
uniform sampler2D uScene0;
uniform sampler2D uScene1;
uniform sampler2D uScene2;
uniform sampler2D uScene3;
uniform vec4 uSceneW;
uniform vec2 uParallax;
uniform float uFocusX;
uniform vec3 uFill;
uniform float uTime;
uniform float uAspect;
uniform float uWallLight;
uniform float uMuseum;
uniform float uIntro;
uniform float uFlicker;
uniform float uDim;
uniform vec3 uTint;
uniform vec3 uBg;
uniform vec2 uLightPos;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

// The painted chambers are 2:1; crop them to fill the screen like a cover image.
// On narrow screens the crop slides towards each scene's point of interest.
vec2 coverUv(vec2 uv) {
  vec2 c = uv - 0.5;
  float r = uAspect / 2.0;
  if (r < 1.0) c.x = c.x * r + (uFocusX - 0.5) * (1.0 - r); else c.y /= r;
  return c * 0.94 + 0.5 + uParallax;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  vec2 drift = vec2(sin(uTime * 0.045), cos(uTime * 0.037)) * 0.012;
  vec2 w = p + drift;
  float stone = fbm(w * 3.2) * 0.65 + fbm(w * 13.0) * 0.35;

  // The chamber of this chapter, out of focus (a high mip) as if beyond the lens's depth.
  vec2 suv = coverUv(vUv) + drift * 0.25;
  vec3 scene = vec3(0.0);
  // The night valley is lit by its own moon and sky, not by the torch.
  vec3 valley = vec3(0.0);
  if (uSceneW.x > 0.001) valley = texture2D(uScene0, suv, 1.7).rgb * uSceneW.x;
  if (uSceneW.y > 0.001) scene += texture2D(uScene1, suv, 1.4).rgb * uSceneW.y * 0.85;
  if (uSceneW.z > 0.001) scene += texture2D(uScene2, suv, 1.4).rgb * uSceneW.z * 0.9;
  if (uSceneW.w > 0.001) scene += texture2D(uScene3, suv, 1.4).rgb * uSceneW.w;
  vec3 wall = scene * (0.78 + stone * 0.44);

  // Torchlight: a warm pool that flickers, over each scene's own dim fill light.
  float d = length(p - uLightPos);
  vec3 torch = vec3(1.0, 0.74, 0.46) * exp(-d * d * 1.3) * uFlicker;
  vec3 fill = uFill * 0.2;
  // The mask's own shadow on the wall behind it keeps the gold separated from the paint.
  float shade = 1.0 - 0.42 * exp(-dot(p * vec2(1.6, 0.9), p * vec2(1.6, 0.9)) * 3.2);
  vec3 col = uBg + wall * (torch + fill) * uWallLight * 0.62 * shade + valley * 1.6 * (0.55 + 0.45 * shade);

  // Epilogue: soft museum light and the façade's triangular lattice.
  vec2 q = (p + vec2(0.0, uTime * 0.004)) * 5.0;
  vec2 s = vec2(q.x - q.y * 0.57735, q.y * 1.1547);
  vec2 fs = fract(s);
  float e = min(min(fs.x, fs.y), abs(1.0 - fs.x - fs.y));
  float lattice = 1.0 - smoothstep(0.0, 0.035, e);
  float tri = step(1.0, fs.x + fs.y);
  // Translucent stone panels glowing from behind, as on the GEM façade.
  float panel = fbm(floor(s) * 0.37 + tri * 3.1);
  vec3 museum = mix(vec3(0.05, 0.042, 0.034), vec3(0.2, 0.16, 0.115), smoothstep(-0.7, 0.7, p.y));
  museum += vec3(0.32, 0.24, 0.15) * exp(-p.x * p.x * 2.2) * 0.55;
  museum += vec3(0.16, 0.12, 0.08) * panel * (0.6 + 0.4 * sin(uTime * 0.3 + panel * 6.0));
  museum = mix(museum, vec3(0.75, 0.58, 0.34), lattice * 0.35);
  col = mix(col, museum, uMuseum);

  float vig = smoothstep(1.15, 0.1, length(p * vec2(0.78, 1.0)));
  col *= vig * uIntro * uDim;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

/** Where a narrow screen centres each painting: el-Qurn, a guardian statue, the couches, the walls. */
const PORTRAIT_FOCUS = [0.6, 0.66, 0.52, 0.5, 0.5]
/** Dim fill light per painting, so a chapter's cool key light never greys the paint. */
const FILL = [
  [0.5, 0.5, 0.5],
  [0.62, 0.5, 0.38],
  [0.66, 0.52, 0.36],
  [0.72, 0.56, 0.38],
  [0.5, 0.5, 0.5],
]

function Backdrop() {
  const mesh = useRef<Mesh>(null)
  const material = useRef<ShaderMaterial>(null)
  const { camera, size } = useThree()
  const quality = useJourney((s) => s.quality)
  // Chapter order: awakening, discovery, treasures, inside the tomb. The epilogue is the museum.
  const scenes = useMemo(() => {
    const s = quality === 'high' ? 1 : 0.5
    return [valleyScene(s), antechamberScene(s), treasuresScene(s), burialScene(s)]
  }, [quality])
  useEffect(() => () => scenes.forEach((t) => t.dispose()), [scenes])
  const uniforms = useMemo(
    () => ({
      uScene0: { value: scenes[0] },
      uScene1: { value: scenes[1] },
      uScene2: { value: scenes[2] },
      uScene3: { value: scenes[3] },
      uSceneW: { value: new Vector4(1, 0, 0, 0) },
      uParallax: { value: new Vector2() },
      uFocusX: { value: 0.5 },
      uFill: { value: new Color(0.5, 0.5, 0.5) },
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uWallLight: { value: 0.5 },
      uMuseum: { value: 0 },
      uIntro: { value: 0 },
      uFlicker: { value: 1 },
      uDim: { value: 1 },
      uTint: { value: new Color() },
      uBg: { value: new Color() },
      uLightPos: { value: new Vector2(-0.35, 0.1) },
    }),
    [scenes],
  )

  useFrame((state) => {
    const f = sampleFrame(state.clock.elapsedTime)
    const m = mesh.current
    if (!m) return
    // Keep the backdrop filling the view at a fixed distance behind the stage.
    const dist = 9
    const dir = new Vector3()
    camera.getWorldDirection(dir)
    m.position.copy(camera.position).addScaledVector(dir, dist)
    m.quaternion.copy(camera.quaternion)
    const h = 2 * dist * Math.tan(((camera as unknown as { fov: number }).fov * Math.PI) / 360)
    m.scale.set(h * (size.width / size.height) * 1.08, h * 1.08, 1)

    const t = f.time
    // Write through the live material: R3F copies the uniforms object it is given.
    const u = (material.current?.uniforms ?? uniforms) as typeof uniforms
    u.uTime.value = t
    u.uAspect.value = size.width / size.height
    // The chapter's own chamber, cross-fading with the next one as the visitor travels.
    const { i, j, t: segT } = f.segment
    const k = plateau(segT)
    const sw = [0, 0, 0, 0, 0]
    sw[i] += 1 - k
    sw[j] += k
    u.uSceneW.value.set(sw[0], sw[1], sw[2], sw[3])
    u.uFocusX.value = sw.reduce((acc, w, n) => acc + w * PORTRAIT_FOCUS[n], 0)
    u.uFill.value.setRGB(...([0, 1, 2].map((c) => sw.reduce((acc, w, n) => acc + w * FILL[n][c], 0)) as [number, number, number]))
    u.uScene0.value = scenes[0]
    u.uScene1.value = scenes[1]
    u.uScene2.value = scenes[2]
    u.uScene3.value = scenes[3]
    // A slight parallax against the camera's travel gives the wall depth.
    u.uParallax.value.set(-camera.position.x * 0.012, -camera.position.y * 0.012)
    u.uWallLight.value = num('wallLight')
    u.uMuseum.value = num('museum')
    u.uIntro.value = f.intro
    u.uDim.value = 1 - 0.55 * f.inspect
    u.uFlicker.value = 0.86 + 0.08 * Math.sin(t * 8.7) + 0.06 * Math.sin(t * 21.3 + 2.0)
    color('wallTint', u.uTint.value)
    color('bg', u.uBg.value)
    const rtl = useJourney.getState().lang === 'ar'
    u.uLightPos.value.set((rtl ? 0.32 : -0.32) + Math.sin(t * 0.4) * 0.02, 0.08)
  })

  return (
    <mesh ref={mesh} renderOrder={-10} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={material} vertexShader={backdropVert} fragmentShader={backdropFrag} uniforms={uniforms} depthWrite={false} depthTest={false} />
    </mesh>
  )
}

const dustVert = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uSize;
uniform float uStir;
uniform vec3 uBeamA;
uniform vec3 uBeamDir;
uniform float uBeam;
varying float vAlpha;
varying float vBeam;
void main() {
  vec3 p = position;
  float t = uTime * 0.06 + aSeed * 37.0;
  p.y = mod(p.y + 3.0 - uTime * (0.01 + aSeed * 0.025), 6.0) - 3.0;
  p.x += sin(t * 1.3 + p.y * 0.8) * 0.22 + uStir * sin(aSeed * 91.0) * 0.4;
  p.z += cos(t + p.x * 0.6) * 0.18;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vec3 ap = p - uBeamA;
  float along = dot(ap, uBeamDir);
  float rd = length(ap - uBeamDir * along);
  vBeam = exp(-rd * rd * 2.2) * uBeam;
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 1.7) + aSeed * 60.0);
  vAlpha = (0.12 + 0.88 * vBeam) * twinkle * smoothstep(-15.0, -7.0, mv.z) * smoothstep(-0.8, -2.6, mv.z);
  gl_PointSize = min(uSize * (0.5 + aSeed * 1.1) * (1.0 + vBeam * 0.5) / -mv.z, uSize * 0.32);
}`

const dustFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uDust;
varying float vAlpha;
varying float vBeam;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor * (0.5 + 1.8 * vBeam), a * vAlpha * uDust);
}`

function Dust({ count }: { count: number }) {
  const material = useRef<ShaderMaterial>(null)
  const { gl } = useThree()
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    const random = rng(42)
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (random() - 0.5) * 9
      pos[i * 3 + 1] = (random() - 0.5) * 6
      pos[i * 3 + 2] = (random() - 0.5) * 6 + 0.5
      seed[i] = random()
    }
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new Float32BufferAttribute(seed, 1))
    return g
  }, [count])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 60 },
      uStir: { value: 0 },
      uBeamA: { value: new Vector3(-1.4, 4, -0.5) },
      uBeamDir: { value: new Vector3(0.32, -1, 0.12).normalize() },
      uBeam: { value: 1 },
      uColor: { value: new Color('#ffd9a0') },
      uDust: { value: 1 },
    }),
    [],
  )

  useFrame((state) => {
    const f = sampleFrame(state.clock.elapsedTime)
    const reduced = useJourney.getState().reducedMotion
    const u = (material.current?.uniforms ?? uniforms) as typeof uniforms
    u.uTime.value = reduced ? 0 : f.time
    u.uSize.value = 46 * gl.getPixelRatio()
    u.uStir.value += (Math.min(1, Math.abs(f.velocity) * 0.8) - u.uStir.value) * 0.05
    u.uBeam.value = num('beam')
    u.uDust.value = num('dust') * f.intro * (1 - 0.4 * f.inspect)
    color('beamColor', u.uColor.value)
    const rtl = useJourney.getState().lang === 'ar'
    u.uBeamA.value.x = rtl ? 1.4 : -1.4
    u.uBeamDir.value.set(rtl ? -0.32 : 0.32, -1, 0.12).normalize()
  })

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={5}>
      <shaderMaterial
        ref={material}
        vertexShader={dustVert}
        fragmentShader={dustFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}

const beamFrag = /* glsl */ `
uniform float uTime;
uniform float uStrength;
uniform vec3 uColor;
varying vec2 vUv;
float hash(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  float x = vUv.x - 0.5;
  float width = mix(0.08, 0.32, 1.0 - vUv.y);
  float core = exp(-(x * x) / (2.0 * width * width));
  float fade = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
  float streak = 0.75 + 0.25 * sin(vUv.x * 40.0 + uTime * 0.3) * sin(vUv.x * 17.0 - uTime * 0.2);
  gl_FragColor = vec4(uColor * core * fade * streak * uStrength * 0.18, 1.0);
}`

function Beam() {
  const ref = useRef<Mesh>(null)
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uStrength: { value: 1 }, uColor: { value: new Color() } }), [])
  useFrame((state) => {
    const f = sampleFrame(state.clock.elapsedTime)
    const u = (material.current?.uniforms ?? uniforms) as typeof uniforms
    u.uTime.value = f.time
    u.uStrength.value = num('beam') * f.intro * (1 - 0.6 * f.inspect)
    color('beamColor', u.uColor.value)
    const rtl = useJourney.getState().lang === 'ar'
    if (ref.current) {
      ref.current.position.x = rtl ? 0.55 : -0.55
      ref.current.rotation.z = rtl ? -0.31 : 0.31
    }
  })
  return (
    <mesh ref={ref} position={[-0.55, 1.2, -1.2]} rotation={[0, 0, 0.31]} renderOrder={4}>
      <planeGeometry args={[3.4, 7.5]} />
      <shaderMaterial
        ref={material}
        vertexShader={backdropVert}
        fragmentShader={beamFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}

export function Atmosphere() {
  const quality = useJourney((s) => s.quality)
  return (
    <>
      <Backdrop />
      <Beam />
      <Dust count={quality === 'high' ? 1600 : 650} />
    </>
  )
}
