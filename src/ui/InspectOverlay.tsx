import { ArchivePhoto } from './ArchivePhoto'
import { ARTIFACT_PHOTOS } from '../content/archive'
import { useEffect, useRef } from 'react'
import { TREASURES } from '../content/artifacts'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { inspectState, resetInspectState } from '../state/scroll'
import { hotspotEls } from '../state/hotspots'
import { pauseScroll, resumeScroll } from '../scroll/controls'
import { useTicker } from './useTicker'
import { TrailButton } from './ArtifactCaption'
import { IconClose, IconMinus, IconPlus, IconRotate } from './icons'

const TAU = Math.PI * 2
const clampZoom = (z: number) => Math.min(2.3, Math.max(0.7, z))

/**
 * Inspect mode: the chosen treasure comes forward. Drag to turn it a full 360°,
 * pinch or scroll to zoom, and open gold points of interest to read their story.
 */
export function InspectOverlay() {
  const { t, artifacts, lang } = useT()
  const id = useJourney((s) => s.inspect)
  const hotspot = useJourney((s) => s.hotspot)
  const surface = useRef<HTMLDivElement>(null)
  const slider = useRef<HTMLInputElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef(0)
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    if (!id) return
    opener.current = document.activeElement
    resetInspectState()
    pauseScroll()
    closeBtn.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.target instanceof HTMLInputElement) return
      if (e.key === 'Escape') useJourney.getState().closeInspect()
      else if (e.key === 'ArrowLeft') inspectState.velY = (lang === 'ar' ? 1 : -1) * 0.03
      else if (e.key === 'ArrowRight') inspectState.velY = (lang === 'ar' ? -1 : 1) * 0.03
      else if (e.key === 'ArrowUp') inspectState.rotX -= 0.1
      else if (e.key === 'ArrowDown') inspectState.rotX += 0.1
      else if (e.key === '+' || e.key === '=') inspectState.targetZoom = clampZoom(inspectState.targetZoom * 1.2)
      else if (e.key === '-') inspectState.targetZoom = clampZoom(inspectState.targetZoom / 1.2)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      resumeScroll()
      ;(opener.current as HTMLElement | null)?.focus?.({ preventScroll: true })
    }
  }, [id, lang])

  // Keep the 360° slider in step with dragging and inertia.
  useTicker(() => {
    if (!id || !slider.current || document.activeElement === slider.current) return
    const deg = ((((inspectState.rotY % TAU) + TAU) % TAU) / TAU) * 360
    slider.current.value = String(Math.round(deg))
  })

  useEffect(() => {
    const el = surface.current
    if (!el || !id) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      inspectState.targetZoom = clampZoom(inspectState.targetZoom * (1 - e.deltaY * 0.0012))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [id])

  if (!id) return null
  const text = artifacts[id]
  const meta = TREASURES[id]
  const dir = lang === 'ar' ? -1 : 1

  const onDown = (e: React.PointerEvent) => {
    surface.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    inspectState.dragging = true
    inspectState.velX = inspectState.velY = 0
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const dx = e.clientX - prev.x
    const dy = e.clientY - prev.y
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch.current) inspectState.targetZoom = clampZoom(inspectState.targetZoom * (d / pinch.current))
      pinch.current = d
      return
    }
    inspectState.rotY += dx * 0.0085
    inspectState.rotX += dy * 0.005
    inspectState.velY = dx * 0.0085 * 0.6
    inspectState.velX = dy * 0.005 * 0.3
  }
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = 0
    if (pointers.current.size === 0) inspectState.dragging = false
  }

  return (
    <div className="inspect" role="dialog" aria-modal="true" aria-labelledby="inspect-title">
      <div
        ref={surface}
        className="inspect__surface"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-hidden="true"
      />
      <div className="inspect__hotspots">
        {meta.hotspots.map((h, i) => (
          <button
            key={h}
            ref={(el) => {
              if (el) hotspotEls.set(h, el)
              else hotspotEls.delete(h)
            }}
            className={`hotspot ${hotspot === h ? 'is-active' : ''}`}
            onClick={() => useJourney.getState().setHotspot(hotspot === h ? null : h)}
            aria-label={text.hotspots[h].title}
            style={{ opacity: 0 }}
          >
            <span className="hotspot__dot">{i + 1}</span>
            {hotspot === h ? <span className="hotspot__tip">{text.hotspots[h].title}</span> : null}
          </button>
        ))}
      </div>

      <aside className="inspect__panel" data-lenis-prevent>
        <button ref={closeBtn} className="inspect__close chip chip--icon" onClick={() => useJourney.getState().closeInspect()} aria-label={t.close}>
          <IconClose />
        </button>
        <p className="caption__origin">{text.origin}</p>
        <h2 id="inspect-title" className="inspect__title">
          {text.name}
        </h2>
        <p className="badge">{t.provenance[meta.provenance]}</p>
        <p className="inspect__long">{text.long}</p>
        {text.facts ? (
          <dl className="inspect__facts">
            {text.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {ARTIFACT_PHOTOS[id]?.length ? (
          <section className="inspect__archive" aria-label={t.fromArchive}>
            <h3 className="inspect__subhead">{t.fromArchive}</h3>
            {ARTIFACT_PHOTOS[id]!.map((photo) => (
              <ArchivePhoto key={photo} id={photo} />
            ))}
          </section>
        ) : null}
        <h3 className="inspect__subhead">{t.hotspotsLabel}</h3>
        <ol className="inspect__list">
          {meta.hotspots.map((h, i) => (
            <li key={h}>
              <button className={`inspect__item ${hotspot === h ? 'is-active' : ''}`} aria-expanded={hotspot === h} onClick={() => useJourney.getState().setHotspot(hotspot === h ? null : h)}>
                <span className="inspect__num">{i + 1}</span>
                <span>{text.hotspots[h].title}</span>
              </button>
              {hotspot === h ? <p className="inspect__detail">{text.hotspots[h].text}</p> : null}
            </li>
          ))}
        </ol>
        <TrailButton id={id} />
        <p className="inspect__note">
          {t.provenanceNote}
          {text.note ? ` ${text.note}` : null}
        </p>
      </aside>

      <div className="inspect__controls">
        <p className="inspect__hint">{t.rotateHint}</p>
        <div className="inspect__row">
          <button className="chip chip--icon" onClick={() => (inspectState.targetZoom = clampZoom(inspectState.targetZoom / 1.25))} aria-label={t.zoomOut}>
            <IconMinus />
          </button>
          <label className="inspect__rotate">
            <IconRotate />
            <span className="sr-only">{t.rotate}</span>
            <input
              ref={slider}
              type="range"
              min={0}
              max={360}
              step={1}
              defaultValue={0}
              aria-label={`${t.rotate} (°)`}
              onChange={(e) => {
                inspectState.velY = 0
                inspectState.rotY = (Number(e.target.value) / 360) * TAU * dir
              }}
            />
          </label>
          <button className="chip chip--icon" onClick={() => (inspectState.targetZoom = clampZoom(inspectState.targetZoom * 1.25))} aria-label={t.zoomIn}>
            <IconPlus />
          </button>
        </div>
      </div>
    </div>
  )
}
