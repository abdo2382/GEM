import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react'
import type { Lang } from '../content/types'
import { prefersReducedMotion } from '../utils/device'
import { boundsOf, clampView, fitView, panBy, toScreen, viewBox, zoomAt, type Insets, type Size, type View } from './camera'
import type { XY } from './geo'
import { PlaceIcon } from './icons'
import { placeLabels, type LabelInput } from './labels'
import { COMPLEX_BOUNDS, GRAPH, MAP, OVERVIEW_BOUNDS, placeById } from './mapData'
import { STRINGS } from './strings'
import type { Place, WayKind } from './types'

export interface Map2DHandle {
  fitAll: () => void
  /** Frame the current walk again, for when a panel has changed how much of the map is free. */
  frameRoute: () => void
  focusPlace: (id: string) => void
  zoomBy: (factor: number) => void
}

interface Props {
  lang: Lang
  selected: string | null
  from: string | null
  to: string | null
  route: { nodes: number[]; kinds: WayKind[] } | null
  /** Node positions within the route to light up: the step being read. */
  activeRange: [number, number] | null
  insets: Insets
  /** Changes when the walk changes, to frame it and replay its drawing. */
  routeKey: string
  /** Frame the walk on first load too. Otherwise the map opens on the whole complex. */
  frameFirst?: boolean
  onSelect: (id: string | null) => void
}

/** Which names win a crowded patch of map: the places in use, then buildings, landmarks, doors, parking, services. */
const KIND_PRIORITY: Record<Place['kind'], number> = { building: 2, landmark: 3, entrance: 4, parking: 5, service: 6 }

const pts = (points: readonly XY[]) => points.map((p) => `${p[0]},${p[1]}`).join(' ')
const MARGIN = 160 // metres the view may drift beyond the complex
const FRAME_PX = 36 // breathing room around what is framed
const MIN_SPAN = 280 // metres: a short walk is not framed closer than this

const padded = (i: Insets, px = FRAME_PX): Insets => ({ top: i.top + px, right: i.right + px, bottom: i.bottom + px, left: i.left + px })
/** `b` grown by `pad` metres, and to at least `minSpan` across, about its middle. */
function roomy(b: { minX: number; minY: number; maxX: number; maxY: number }, pad: number, minSpan = MIN_SPAN) {
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  const hw = Math.max((b.maxX - b.minX) / 2 + pad, minSpan / 2)
  const hh = Math.max((b.maxY - b.minY) / 2 + pad, minSpan / 2)
  return { minX: cx - hw, minY: cy - hh, maxX: cx + hw, maxY: cy + hh }
}

/** The map itself never changes, so it is drawn once and never re-rendered. */
const StaticLayers = memo(function StaticLayers() {
  const placeBuildings = useMemo(() => new Set(MAP.places.flatMap((p) => (p.building === undefined ? [] : [p.building]))), [])
  const s = MAP.scenery
  return (
    <>
      <g className="mm-roads">
        {s.roads.map((r, i) => (
          <polyline key={i} points={pts(r.p)} className={r.w === 2 ? 'is-major' : undefined} />
        ))}
      </g>
      <g className="mm-greens">
        {s.greens.map((g, i) => (
          <polygon key={i} points={pts(g.o)} />
        ))}
      </g>
      <g className="mm-water">
        {s.water.map((g, i) => (
          <polygon key={i} points={pts(g.o)} />
        ))}
      </g>
      <g className="mm-buildings">
        {s.buildings.map((b, i) => (
          <polygon key={i} points={pts(b.o)} className={placeBuildings.has(i) ? 'is-place' : undefined} />
        ))}
      </g>
      <g className="mm-walls">
        {s.walls.map((w, i) => (
          <polyline key={i} points={pts(w.p)} />
        ))}
      </g>
      <g className="mm-net">
        {MAP.ways.map((w, i) => (
          <polyline key={i} points={pts(w.n.map((n) => MAP.nodes[n]))} className={`is-${w.k}`} />
        ))}
      </g>
    </>
  )
})

function RouteLayer({ route, activeRange, routeKey }: { route: NonNullable<Props['route']>; activeRange: Props['activeRange']; routeKey: string }) {
  const points = route.nodes.map((n) => GRAPH.pos[n])
  const runs: { kind: 'steps' | 'link'; pts: XY[] }[] = []
  route.kinds.forEach((k, i) => {
    if (k !== 'steps' && k !== 'link') return
    const last = runs.at(-1)
    if (last && last.kind === k && last.pts.at(-1) === points[i]) last.pts.push(points[i + 1])
    else runs.push({ kind: k, pts: [points[i], points[i + 1]] })
  })
  return (
    <g className="mm-route" key={routeKey}>
      <polyline className="mm-route__halo" points={pts(points)} />
      <polyline className="mm-route__line" pathLength={1} points={pts(points)} />
      {runs.map((r, i) => (
        <polyline key={i} className={`mm-route__${r.kind}`} points={pts(r.pts)} />
      ))}
      {activeRange ? <polyline className="mm-route__active" points={pts(points.slice(activeRange[0], activeRange[1] + 1))} /> : null}
    </g>
  )
}

interface MarkerProps {
  place: Place
  lang: Lang
  state: 'idle' | 'selected' | 'from' | 'to'
  badge: string | null
  register: (id: string, el: HTMLButtonElement | null) => void
  onSelect: (id: string) => void
}

const Marker = memo(function Marker({ place, lang, state, badge, register, onSelect }: MarkerProps) {
  const name = place.name[lang]
  return (
    <button
      ref={(el) => register(place.id, el)}
      type="button"
      className="mm-marker"
      data-state={state}
      data-kind={place.kind}
      data-approx={place.match === 'approximate' ? '' : undefined}
      aria-label={place.match === 'approximate' ? `${name} (${STRINGS[lang].approx})` : name}
      aria-pressed={state !== 'idle'}
      onClick={() => onSelect(place.id)}
    >
      <span className="mm-marker__disc">
        <PlaceIcon id={place.id} kind={place.kind} />
      </span>
      {badge ? (
        <span className="mm-marker__badge" aria-hidden="true">
          {badge}
        </span>
      ) : null}
      <span className="mm-marker__label" aria-hidden="true">
        {name}
      </span>
    </button>
  )
})

export const Map2D = memo(
  forwardRef<Map2DHandle, Props>(function Map2D({ lang, selected, from, to, route, activeRange, insets, routeKey, frameFirst = false, onSelect }, ref) {
    const t = STRINGS[lang]
    const rootRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const markerEls = useRef(new Map<string, HTMLButtonElement>())
    const sizeRef = useRef<Size>({ w: 0, h: 0 })
    const viewRef = useRef<View>({ cx: 0, cy: 0, k: 0.5 })
    const fitK = useRef(0.5)
    const insetsRef = useRef(insets)
    insetsRef.current = insets
    const routeRef = useRef(route)
    routeRef.current = route
    const rtlRef = useRef(lang === 'ar')
    rtlRef.current = lang === 'ar'
    const raf = useRef(0)
    const inUse = useRef({ from, to, selected })
    inUse.current = { from, to, selected }
    const labelWidth = useRef(new Map<string, number>())

    /** Writes the view straight to the DOM: panning never re-renders React. */
    const apply = useCallback((v: View) => {
      viewRef.current = v
      const s = sizeRef.current
      if (s.w === 0) return
      svgRef.current?.setAttribute('viewBox', viewBox(v, s))
      svgRef.current?.style.setProperty('--u', String(1 / v.k))
      const { from: a, to: b, selected: c } = inUse.current
      const items: LabelInput[] = []
      for (const [id, el] of markerEls.current) {
        const place = placeById(id)!
        const [x, y] = toScreen(v, s, place.at[0], place.at[1])
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
        // Off screen: hidden, and skipped by Tab.
        el.style.visibility = x > -30 && x < s.w + 30 && y > -30 && y < s.h + 30 ? '' : 'hidden'
        const chosen = id === a || id === b || id === c
        items.push({ id, x, y, width: labelWidth.current.get(id) ?? 150, priority: id === a || id === b ? 0 : id === c ? 1 : KIND_PRIORITY[place.kind], force: chosen })
      }
      const placement = placeLabels(items, s, rtlRef.current)
      for (const [id, el] of markerEls.current) {
        const p = placement.get(id)!
        if (p.show !== el.hasAttribute('data-label')) el.toggleAttribute('data-label', p.show)
        if (p.flip !== el.hasAttribute('data-flip')) el.toggleAttribute('data-flip', p.flip)
      }
    }, [])

    /** Label widths, measured once per language and font load, never per frame. */
    const measureLabels = useCallback(() => {
      for (const [id, el] of markerEls.current) {
        const label = el.querySelector<HTMLElement>('.mm-marker__label')
        if (label) labelWidth.current.set(id, label.offsetWidth + 2)
      }
      apply(viewRef.current)
    }, [apply])
    useLayoutEffect(() => {
      measureLabels()
      document.fonts?.ready.then(measureLabels)
    }, [lang, measureLabels])
    // The places in use change who wins a crowded patch.
    useLayoutEffect(() => apply(viewRef.current), [from, to, selected, apply])

    const limits = () => ({ kMin: fitK.current * 0.7, kMax: fitK.current * 40 })

    const animateTo = useCallback(
      (target: View, ms = 520) => {
        cancelAnimationFrame(raf.current)
        if (prefersReducedMotion() || ms <= 0) return apply(target)
        const start = viewRef.current
        const t0 = performance.now()
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / ms)
          const e = 1 - Math.pow(1 - p, 3)
          apply({ cx: start.cx + (target.cx - start.cx) * e, cy: start.cy + (target.cy - start.cy) * e, k: start.k * Math.pow(target.k / start.k, e) })
          if (p < 1) raf.current = requestAnimationFrame(step)
        }
        raf.current = requestAnimationFrame(step)
      },
      [apply],
    )

    const fitAll = useCallback(() => {
      const s = sizeRef.current
      if (s.w) animateTo(fitView(OVERVIEW_BOUNDS, s, padded(insetsRef.current, 12), 4))
    }, [animateTo])

    /** The view that frames the current walk, or null when there is none or the map has no size yet. */
    const routeView = useCallback((): View | null => {
      const s = sizeRef.current
      const r = routeRef.current
      if (!r || !s.w) return null
      return fitView(roomy(boundsOf(r.nodes.map((n) => GRAPH.pos[n])), 40), s, padded(insetsRef.current), 8)
    }, [])
    const routeViewRef = useRef(routeView)
    routeViewRef.current = routeView
    const frameFirstRef = useRef(frameFirst)
    frameFirstRef.current = frameFirst

    const frameRoute = useCallback(() => {
      const v = routeView()
      if (v) animateTo(v)
    }, [animateTo, routeView])

    const zoomBy = useCallback(
      (factor: number) => {
        const s = sizeRef.current
        const { kMin, kMax } = limits()
        animateTo(clampView(zoomAt(viewRef.current, s, factor, s.w / 2, s.h / 2, kMin, kMax), s, COMPLEX_BOUNDS, MARGIN), 240)
      },
      [animateTo],
    )

    useImperativeHandle(
      ref,
      () => ({
        fitAll,
        frameRoute,
        zoomBy,
        focusPlace(id) {
          const p = placeById(id)
          const s = sizeRef.current
          if (!p || !s.w) return
          const target = fitView(roomy({ minX: p.at[0], minY: p.at[1], maxX: p.at[0], maxY: p.at[1] }, 0, 380), s, padded(insetsRef.current))
          animateTo({ ...target, k: Math.max(target.k, Math.min(viewRef.current.k, target.k * 3)) })
        },
      }),
      [animateTo, fitAll, frameRoute, zoomBy],
    )

    // Size, and the first framing of the complex.
    useLayoutEffect(() => {
      const el = rootRef.current!
      const ro = new ResizeObserver((entries) => {
        const box = entries[0].contentRect
        const next = { w: Math.round(box.width), h: Math.round(box.height) }
        if (next.w === sizeRef.current.w && next.h === sizeRef.current.h) return
        const first = sizeRef.current.w === 0
        sizeRef.current = next
        if (first) {
          const v = fitView(OVERVIEW_BOUNDS, next, padded(insetsRef.current, 12), 4)
          fitK.current = v.k
          el.dataset.ready = ''
          apply(v)
          // A link that asked for a walk opens on it; otherwise the map opens on the whole complex.
          const walkView = frameFirstRef.current ? routeViewRef.current() : null
          if (walkView) apply(walkView)
        } else apply(viewRef.current)
      })
      ro.observe(el)
      return () => ro.disconnect()
    }, [apply])

    // A new walk: frame it.
    const firstKey = useRef(routeKey)
    useEffect(() => {
      if (!frameFirst && routeKey === firstKey.current) return
      frameRoute()
    }, [routeKey, frameFirst, frameRoute])

    // The step being read: bring it into view.
    useEffect(() => {
      const s = sizeRef.current
      if (!route || !activeRange || !s.w) return
      const b = boundsOf(route.nodes.slice(activeRange[0], activeRange[1] + 1).map((n) => GRAPH.pos[n]))
      const target = fitView(roomy(b, 45, 160), s, padded(insetsRef.current), 8)
      animateTo({ ...target, k: Math.min(Math.max(target.k, viewRef.current.k), target.k * 2) })
    }, [activeRange?.[0], activeRange?.[1], animateTo])

    useEffect(() => () => cancelAnimationFrame(raf.current), [])

    // Gestures: one finger drags, two pinch, the wheel zooms about the pointer.
    const touches = useRef(new Map<number, { x: number; y: number }>())
    const gesture = useRef({ moved: false, startX: 0, startY: 0, originX: 0, originY: 0 })
    const local = (e: { clientX: number; clientY: number }) => {
      const r = rootRef.current!.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onPointerDown = (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      cancelAnimationFrame(raf.current)
      const p = local(e)
      touches.current.set(e.pointerId, p)
      if (touches.current.size === 1) gesture.current = { moved: false, startX: p.x, startY: p.y, originX: p.x, originY: p.y }
      else gesture.current.moved = true
    }
    const onPointerMove = (e: React.PointerEvent) => {
      const prev = touches.current.get(e.pointerId)
      if (!prev) return
      const cur = local(e)
      const g = gesture.current
      const s = sizeRef.current
      const { kMin, kMax } = limits()
      if (touches.current.size === 1) {
        if (!g.moved && Math.hypot(cur.x - g.startX, cur.y - g.startY) < 5) return
        if (!g.moved) {
          g.moved = true
          rootRef.current!.setPointerCapture(e.pointerId)
        }
        apply(clampView(panBy(viewRef.current, cur.x - prev.x, cur.y - prev.y), s, COMPLEX_BOUNDS, MARGIN))
      } else if (touches.current.size === 2) {
        const others = [...touches.current.entries()].filter(([id]) => id !== e.pointerId)[0][1]
        const before = Math.hypot(prev.x - others.x, prev.y - others.y)
        const after = Math.hypot(cur.x - others.x, cur.y - others.y)
        const mid = { x: (cur.x + others.x) / 2, y: (cur.y + others.y) / 2 }
        const midBefore = { x: (prev.x + others.x) / 2, y: (prev.y + others.y) / 2 }
        let v = panBy(viewRef.current, mid.x - midBefore.x, mid.y - midBefore.y)
        if (before > 0) v = zoomAt(v, s, after / before, mid.x, mid.y, kMin, kMax)
        apply(clampView(v, s, COMPLEX_BOUNDS, MARGIN))
      }
      touches.current.set(e.pointerId, cur)
    }
    const onPointerEnd = (e: React.PointerEvent) => {
      if (!touches.current.has(e.pointerId)) return
      touches.current.delete(e.pointerId)
      const g = gesture.current
      if (e.type === 'pointerup' && !g.moved && touches.current.size === 0 && !(e.target as HTMLElement).closest('.mm-marker')) onSelect(null)
    }
    useEffect(() => {
      const el = rootRef.current!
      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        cancelAnimationFrame(raf.current)
        const r = el.getBoundingClientRect()
        const { kMin, kMax } = limits()
        const s = sizeRef.current
        apply(clampView(zoomAt(viewRef.current, s, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)), e.clientX - r.left, e.clientY - r.top, kMin, kMax), s, COMPLEX_BOUNDS, MARGIN))
      }
      el.addEventListener('wheel', onWheel, { passive: false })
      return () => el.removeEventListener('wheel', onWheel)
    }, [apply])

    const onKeyDown = (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return
      const s = sizeRef.current
      const step = 70
      const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }
      if (moves[e.key]) {
        e.preventDefault()
        animateTo(clampView(panBy(viewRef.current, ...moves[e.key]), s, COMPLEX_BOUNDS, MARGIN), 140)
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        zoomBy(1.5)
      } else if (e.key === '-') {
        e.preventDefault()
        zoomBy(1 / 1.5)
      } else if (e.key === '0' || e.key === 'Home') {
        e.preventDefault()
        fitAll()
      }
    }

    const register = useCallback((id: string, el: HTMLButtonElement | null) => {
      if (el) {
        markerEls.current.set(id, el)
      } else markerEls.current.delete(id)
    }, [])

    const highlight = [selected, from, to].flatMap((id) => {
      const b = placeById(id)?.building
      return b === undefined ? [] : [b]
    })

    return (
      <div
        ref={rootRef}
        className="mm-map"
        role="region"
        aria-label={t.mapLabel}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      >
        <svg ref={svgRef} className="mm-svg" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <StaticLayers />
          {highlight.map((b) => (
            <polygon key={b} className="mm-hl" points={pts(MAP.scenery.buildings[b].o)} />
          ))}
          {route ? <RouteLayer route={route} activeRange={activeRange} routeKey={routeKey} /> : null}
        </svg>
        <div className="mm-markers">
          {MAP.places.map((p) => {
            const state = p.id === from ? 'from' : p.id === to ? 'to' : p.id === selected ? 'selected' : 'idle'
            return (
              <Marker
                key={p.id}
                place={p}
                lang={lang}
                state={state}
                badge={state === 'from' ? t.badgeFrom : state === 'to' ? t.badgeTo : null}
                register={register}
                onSelect={onSelect}
              />
            )
          })}
        </div>
      </div>
    )
  }),
)
