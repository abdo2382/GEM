import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, useCursor } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Lang } from '../content/types'
import { PRESETS } from '../quality/adaptiveQuality'
import { detectQuality, loadQualityPref, prefersReducedMotion } from '../utils/device'
import { boundsOf, type Insets } from './camera'
import { GRAPH, MAP, OVERVIEW_BOUNDS, placeById } from './mapData'
import { extrude, flat, lineSegments, mergeAll, polylinePath } from './scene3d'
import { STRINGS } from './strings'
import type { Place, WayKind } from './types'

interface Props {
  lang: Lang
  selected: string | null
  from: string | null
  to: string | null
  route: { nodes: number[]; kinds: WayKind[] } | null
  activeRange: [number, number] | null
  insets: Insets
  frameFirst?: boolean
  onSelect: (id: string | null) => void
  /** The 3D view cannot run (the context was lost): fall back to the plan. */
  onFail: () => void
}

// The same palette as the plan.
const COLOR = {
  ground: '#0d0b08',
  green: '#1c3a2f',
  water: '#1b4a63',
  building: '#4a3b26',
  place: '#8a6a2c',
  roof: '#9c7d3c',
  road: '#3a2f20',
  wall: '#6a5a40',
  path: '#b39a66',
  steps: '#cf7a4a',
  faience: '#3fd0c0',
  ivory: '#f3e8d0',
  gold: '#c7a04a',
}

/** Every shape of the complex, built once: many buildings are one geometry, so one draw call. */
function buildScene() {
  const s = MAP.scenery
  const placeBuildings = new Map<number, THREE.BufferGeometry>()
  for (const p of MAP.places) if (p.building !== undefined && !placeBuildings.has(p.building)) placeBuildings.set(p.building, extrude(s.buildings[p.building].o, s.buildings[p.building].h))
  const others = mergeAll(s.buildings.flatMap((b, i) => (placeBuildings.has(i) ? [] : [extrude(b.o, b.h)])))
  const roofs = mergeAll(s.buildings.map((b) => lineSegments([[...b.o, b.o[0]]], b.h + 0.15)))
  const greens = mergeAll(s.greens.map((g) => flat(g.o, 0.06)))
  const water = mergeAll(s.water.map((g) => flat(g.o, 0.12)))
  const minor = lineSegments(s.roads.filter((r) => r.w !== 2).map((r) => r.p), 0.02)
  const major = lineSegments(s.roads.filter((r) => r.w === 2).map((r) => r.p), 0.03)
  const walls = lineSegments(s.walls.map((w) => w.p), 0.5)
  const line = (kinds: WayKind[]) =>
    lineSegments(
      MAP.ways.filter((w) => kinds.includes(w.k)).map((w) => w.n.map((n) => MAP.nodes[n])),
      0.2,
    )
  const paths = line(['path', 'road'])
  const steps = line(['steps'])
  const all = [...placeBuildings.values(), others, roofs, greens, water, minor, major, walls, paths, steps].filter((g): g is THREE.BufferGeometry => g !== null)
  return { placeBuildings, others, roofs, greens, water, minor, major, walls, paths, steps, dispose: () => all.forEach((g) => g.dispose()) }
}

type PinState = 'idle' | 'selected' | 'from' | 'to'
interface PinLabel {
  id: string
  text: string
  state: PinState
}

const dwell = () => (prefersReducedMotion() ? 0 : 1)

/** Frames the complex, a walk or a place by moving the camera and what it looks at. */
function Rig({ props, controlsRef }: { props: Props; controlsRef: React.RefObject<React.ElementRef<typeof OrbitControls> | null> }) {
  const { camera, size, invalidate } = useThree()
  const tween = useRef<{ t: number; from: { target: THREE.Vector3; dist: number }; to: { target: THREE.Vector3; dist: number }; ms: number } | null>(null)
  const { insets, frameFirst, route, selected } = props

  // A phone's sheet covers the bottom of the screen: shift the view so the scene sits in what is left.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (insets.bottom > 0) cam.setViewOffset(size.width, size.height, 0, insets.bottom / 2, size.width, size.height)
    else cam.clearViewOffset()
    cam.updateProjectionMatrix()
    invalidate()
  }, [camera, size.width, size.height, insets.bottom, invalidate])

  const fly = useMemo(
    () => (cx: number, cz: number, extent: number, ms = 700) => {
      const controls = controlsRef.current
      if (!controls) return
      const cam = camera as THREE.PerspectiveCamera
      const vFov = THREE.MathUtils.degToRad(cam.fov)
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (size.width / Math.max(size.height, 1)))
      const dist = Math.min(2600, Math.max(90, (extent / 2 / Math.tan(Math.min(vFov, hFov) / 2)) * 1.3))
      const to = { target: new THREE.Vector3(cx, 0, cz), dist }
      if (ms <= 0 || !dwell()) {
        const dir = cam.position.clone().sub(controls.target).normalize()
        controls.target.copy(to.target)
        cam.position.copy(to.target).addScaledVector(dir, dist)
        controls.update()
        invalidate()
        return
      }
      tween.current = { t: 0, from: { target: controls.target.clone(), dist: cam.position.distanceTo(controls.target) }, to, ms }
      invalidate()
    },
    [camera, controlsRef, invalidate, size.height, size.width],
  )

  useFrame((_, delta) => {
    const tw = tween.current
    const controls = controlsRef.current
    if (!tw || !controls) return
    tw.t = Math.min(1, tw.t + (delta * 1000) / tw.ms)
    const e = 1 - Math.pow(1 - tw.t, 3)
    const cam = camera as THREE.PerspectiveCamera
    const dir = cam.position.clone().sub(controls.target).normalize()
    controls.target.lerpVectors(tw.from.target, tw.to.target, e)
    cam.position.copy(controls.target).addScaledVector(dir, tw.from.dist + (tw.to.dist - tw.from.dist) * e)
    controls.update()
    if (tw.t < 1) invalidate()
    else tween.current = null
  })

  const routeCentre = () => {
    if (!route) return null
    const b = boundsOf(route.nodes.map((n) => GRAPH.pos[n]))
    return { cx: (b.minX + b.maxX) / 2, cz: (b.minY + b.maxY) / 2, extent: Math.max(b.maxX - b.minX, b.maxY - b.minY, 300) + 120 }
  }

  // First view: the whole complex, or the walk a link asked for.
  const ready = useRef(false)
  useEffect(() => {
    if (!controlsRef.current || ready.current) return
    ready.current = true
    const o = OVERVIEW_BOUNDS
    const r = frameFirst ? routeCentre() : null
    if (r) fly(r.cx, r.cz, r.extent, 0)
    else fly((o.minX + o.maxX) / 2, (o.minY + o.maxY) / 2, Math.max(o.maxX - o.minX, o.maxY - o.minY), 0)
  })

  // A new walk, or a chosen place: bring it into view.
  const routeKey = route ? `${route.nodes[0]}-${route.nodes[route.nodes.length - 1]}-${route.nodes.length}` : ''
  const firstRoute = useRef(routeKey)
  useEffect(() => {
    if (!routeKey || (routeKey === firstRoute.current && !frameFirst)) return
    const r = routeCentre()
    if (r) fly(r.cx, r.cz, r.extent)
  }, [routeKey])
  useEffect(() => {
    const p = placeById(selected)
    if (p) fly(p.at[0], p.at[1], 420)
  }, [selected])
  return null
}

/** The walk, drawn from its start to its end. */
function Walk({ route, activeRange }: { route: NonNullable<Props['route']>; activeRange: Props['activeRange'] }) {
  const invalidate = useThree((s) => s.invalidate)
  const geometry = useMemo(() => {
    const pts = route.nodes.map((n) => GRAPH.pos[n])
    const path = polylinePath(pts, 1.6)
    return new THREE.TubeGeometry(path, Math.min(1600, Math.max(8, Math.ceil(path.getLength() / 1.4))), 1.5, 6, false)
  }, [route])
  const active = useMemo(() => {
    if (!activeRange) return null
    const pts = route.nodes.slice(activeRange[0], activeRange[1] + 1).map((n) => GRAPH.pos[n])
    if (pts.length < 2) return null
    const path = polylinePath(pts, 2.4)
    return new THREE.TubeGeometry(path, Math.min(800, Math.max(4, Math.ceil(path.getLength() / 1.4))), 1.9, 6, false)
  }, [route, activeRange])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => active?.dispose(), [active])

  const progress = useRef(prefersReducedMotion() ? 1 : 0)
  useEffect(() => {
    progress.current = prefersReducedMotion() ? 1 : 0
    geometry.setDrawRange(0, progress.current === 1 ? Infinity : 0)
    invalidate()
  }, [geometry, invalidate])
  useFrame((_, delta) => {
    if (progress.current >= 1) return
    progress.current = Math.min(1, progress.current + delta / 1.1)
    const count = geometry.getIndex()?.count ?? 0
    geometry.setDrawRange(0, Math.floor((1 - Math.pow(1 - progress.current, 3)) * count))
    invalidate()
  })
  return (
    <>
      <mesh geometry={geometry} renderOrder={5}>
        <meshBasicMaterial color={COLOR.faience} toneMapped={false} />
      </mesh>
      {active ? (
        <mesh geometry={active} renderOrder={6}>
          <meshBasicMaterial color={COLOR.ivory} toneMapped={false} />
        </mesh>
      ) : null}
    </>
  )
}

function Pin({ place, state, onSelect }: { place: Place; state: PinState; onSelect: (id: string) => void }) {
  const [hover, setHover] = useState(false)
  useCursor(hover)
  const colour = state === 'from' || state === 'to' ? COLOR.faience : state === 'selected' ? COLOR.ivory : place.match === 'approximate' ? '#e4c477' : COLOR.gold
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return // a drag, not a tap
    e.stopPropagation()
    onSelect(place.id)
  }
  return (
    <group position={[place.at[0], 0, place.at[1]]}>
      <mesh position={[0, 11, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 22, 6]} />
        <meshBasicMaterial color={colour} toneMapped={false} />
      </mesh>
      <mesh position={[0, 24, 0]}>
        <sphereGeometry args={[state === 'idle' ? 4 : 5.5, 16, 12]} />
        <meshBasicMaterial color={colour} toneMapped={false} />
      </mesh>
      {/* A larger invisible target, so a fingertip can find it. */}
      <mesh position={[0, 20, 0]} onClick={onClick} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
        <sphereGeometry args={[16, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Puts each name over its pin: projects the pin to the screen on every frame that is drawn. */
function LabelProjector({ labels, els }: { labels: PinLabel[]; els: React.RefObject<Map<string, HTMLElement>> }) {
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    for (const label of labels) {
      const el = els.current.get(label.id)
      const place = placeById(label.id)
      if (!el || !place) continue
      v.set(place.at[0], 40, place.at[1]).project(camera)
      const visible = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15
      el.style.visibility = visible ? 'visible' : 'hidden'
      el.style.transform = `translate(${((v.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * size.height).toFixed(1)}px) translate(-50%, -100%)`
    }
  })
  return null
}

function Scene({ props, controlsRef, labels, labelEls }: { props: Props; controlsRef: React.RefObject<React.ElementRef<typeof OrbitControls> | null>; labels: PinLabel[]; labelEls: React.RefObject<Map<string, HTMLElement>> }) {
  const { lang, selected, from, to, route, activeRange, onSelect } = props
  const built = useMemo(buildScene, [])
  useEffect(() => () => built.dispose(), [built])
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [invalidate, selected, from, to, route, activeRange, lang, labels])

  const stateOf = (id: string): PinState => (id === from ? 'from' : id === to ? 'to' : id === selected ? 'selected' : 'idle')
  const buildingState = new Map<number, string>()
  for (const p of MAP.places) if (p.building !== undefined) {
    const st = stateOf(p.id)
    if (st !== 'idle' || !buildingState.has(p.building)) buildingState.set(p.building, st)
  }
  const tint = (st: string | undefined) => (st === 'from' || st === 'to' ? '#2f9d92' : st === 'selected' ? '#b99447' : COLOR.place)

  return (
    <>
      <ambientLight intensity={1.15} />
      <hemisphereLight args={['#fff1d0', '#1a120b', 0.7]} />
      <directionalLight position={[-260, 520, 420]} intensity={2.3} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <planeGeometry args={[4000, 4000]} />
        <meshBasicMaterial color={COLOR.ground} />
      </mesh>
      {built.minor ? <lineSegments geometry={built.minor}><lineBasicMaterial color={COLOR.road} /></lineSegments> : null}
      {built.major ? <lineSegments geometry={built.major}><lineBasicMaterial color="#4b3d29" /></lineSegments> : null}
      {built.greens ? <mesh geometry={built.greens}><meshBasicMaterial color={COLOR.green} side={THREE.DoubleSide} /></mesh> : null}
      {built.water ? <mesh geometry={built.water}><meshBasicMaterial color={COLOR.water} side={THREE.DoubleSide} /></mesh> : null}
      {built.paths ? <lineSegments geometry={built.paths}><lineBasicMaterial color={COLOR.path} transparent opacity={0.55} /></lineSegments> : null}
      {built.steps ? <lineSegments geometry={built.steps}><lineBasicMaterial color={COLOR.steps} /></lineSegments> : null}
      {built.walls ? <lineSegments geometry={built.walls}><lineBasicMaterial color={COLOR.wall} /></lineSegments> : null}
      {built.others ? <mesh geometry={built.others}><meshStandardMaterial color={COLOR.building} roughness={0.9} flatShading /></mesh> : null}
      {[...built.placeBuildings].map(([index, geometry]) => (
        <mesh key={index} geometry={geometry}>
          <meshStandardMaterial color={tint(buildingState.get(index))} roughness={0.8} flatShading />
        </mesh>
      ))}
      {built.roofs ? <lineSegments geometry={built.roofs}><lineBasicMaterial color={COLOR.roof} /></lineSegments> : null}

      {route ? <Walk route={route} activeRange={activeRange} /> : null}
      {MAP.places.map((p) => (
        <Pin key={p.id} place={p} state={stateOf(p.id)} onSelect={onSelect} />
      ))}
      <LabelProjector labels={labels} els={labelEls} />
      <Rig props={props} controlsRef={controlsRef} />
    </>
  )
}

export default function Map3D(props: Props) {
  const t = STRINGS[props.lang]
  const tier = useMemo(() => detectQuality(loadQualityPref()), [])
  const preset = PRESETS[tier]
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls> | null>(null)
  const down = useRef<{ x: number; y: number } | null>(null)
  const o = OVERVIEW_BOUNDS
  const labelEls = useRef(new Map<string, HTMLElement>())
  const { from, to, selected, lang } = props
  const labels = useMemo<PinLabel[]>(() => {
    const one = (id: string | null, state: PinState): PinLabel[] => {
      const p = placeById(id)
      if (!p) return []
      const text = state === 'from' ? `${t.badgeFrom} · ${p.name[lang]}` : state === 'to' ? `${t.badgeTo} · ${p.name[lang]}` : p.name[lang]
      return [{ id: p.id, text, state }]
    }
    const all = [...one(from, 'from'), ...one(to, 'to'), ...one(selected, 'selected')]
    return all.filter((l, i) => all.findIndex((m) => m.id === l.id) === i)
  }, [from, to, selected, lang, t])
  return (
    <div className="mm-map3d" role="img" aria-label={t.label3d}>
      <Canvas
        frameloop="demand"
        dpr={[1, preset.maxDpr]}
        gl={{ antialias: tier !== 'low', powerPreference: 'high-performance', alpha: false }}
        camera={{ fov: 38, near: 4, far: 7000, position: [(o.minX + o.maxX) / 2 + 300, 1150, (o.minY + o.maxY) / 2 + 900] }}
        onCreated={({ gl }) => {
          gl.setClearColor(COLOR.ground)
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            props.onFail()
          })
        }}
        onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
        onPointerMissed={(e) => {
          const d = down.current
          if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) props.onSelect(null)
        }}
      >
        <color attach="background" args={[COLOR.ground]} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.12}
          screenSpacePanning={false}
          minDistance={70}
          maxDistance={2600}
          maxPolarAngle={THREE.MathUtils.degToRad(80)}
          minPolarAngle={THREE.MathUtils.degToRad(8)}
        />
        <Scene props={props} controlsRef={controlsRef} labels={labels} labelEls={labelEls} />
      </Canvas>
      <div className="mm-pins" aria-hidden="true" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {labels.map((l) => (
          <div
            key={l.id}
            ref={(el) => {
              if (el) labelEls.current.set(l.id, el)
              else labelEls.current.delete(l.id)
            }}
            className="mm-pin"
            data-state={l.state}
          >
            {l.text}
          </div>
        ))}
      </div>
    </div>
  )
}
