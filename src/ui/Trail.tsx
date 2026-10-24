import { useEffect, useRef, useState } from 'react'
import { ARTIFACT_CHAPTER, CHAPTERS } from '../content/chapters'
import { TREASURES, TREASURE_IDS } from '../content/artifacts'
import type { ArtifactId, TreasureId } from '../content/types'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { presence, scrollState } from '../state/scroll'
import { scrollToChapter } from '../scroll/controls'
import { downloadTrailCard } from '../utils/trailCard'
import { useTicker } from './useTicker'
import { ArtifactEmblem, IconClose, IconDownload, IconEye } from './icons'

/** Inspect where the visitor stands: closing it returns them to the same place in the story. */
function goInspect(id: TreasureId) {
  const s = useJourney.getState()
  s.setTrailOpen(false)
  s.openInspect(id)
}

/** Every treasure of the journey, each a tap away from Inspect. */
function TreasureGallery() {
  const { t, artifacts } = useT()
  const trail = useJourney((s) => s.trail)
  return (
    <section className="gallery" aria-labelledby="gallery-title">
      <h3 id="gallery-title" className="gallery__title">
        {t.galleryTitle}
      </h3>
      <ul className="gallery__grid">
        {TREASURE_IDS.map((id) => (
          <li key={id}>
            <button className="gallery__item" onClick={() => goInspect(id)} aria-label={`${t.inspect}: ${artifacts[id].name}`}>
              <ArtifactEmblem id={id} size={34} />
              <span className="gallery__name">{artifacts[id].name}</span>
              {trail.includes(id) ? <span className="gallery__saved">{t.inTrail}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TrailList({ withRemove }: { withRemove: boolean }) {
  const { t, artifacts, lang } = useT()
  const trail = useJourney((s) => s.trail)
  if (!trail.length) return <p className="trail__empty">{t.trailEmpty}</p>
  return (
    <ul className="trail__list">
      {trail.map((id) => {
        const loc = TREASURES[id].gemLocation
        return (
          <li key={id} className="trail__item">
            <span className="trail__emblem">
              <ArtifactEmblem id={id} size={40} />
            </span>
            <div className="trail__text">
              <h4>{artifacts[id].name}</h4>
              <p className="trail__origin">{artifacts[id].origin}</p>
              <p className="trail__where">
                <strong>{t.whereToFind}:</strong> {loc ? loc[lang] : t.locationUnverified}
              </p>
              <div className="trail__actions">
                <button className="link-btn" onClick={() => goInspect(id)}>
                  <IconEye /> {t.inspect}
                </button>
                {withRemove ? (
                  <button className="link-btn link-btn--muted" onClick={() => useJourney.getState().toggleTrail(id)}>
                    {t.removeTrail}
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function CardDownload() {
  const { t, lang } = useT()
  const trail = useJourney((s) => s.trail)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="trail__card">
      <label className="field">
        <span>{t.yourName}</span>
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </label>
      <button
        className="btn btn--gold"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await downloadTrailCard(lang, trail, name)
          setBusy(false)
        }}
      >
        <IconDownload /> {t.downloadCard}
      </button>
    </div>
  )
}

/** Side drawer with the visitor's saved treasures — reachable from anywhere. */
export function TrailDrawer() {
  const { t } = useT()
  const open = useJourney((s) => s.trailOpen)
  const trail = useJourney((s) => s.trail)
  const close = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    close.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && useJourney.getState().setTrailOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className={`drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="drawer__scrim" onClick={() => useJourney.getState().setTrailOpen(false)} />
      <aside className="drawer__panel" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="trail-title" inert={!open}>
        <header className="drawer__header">
          <h2 id="trail-title">{t.trail}</h2>
          <button ref={close} className="chip chip--icon" onClick={() => useJourney.getState().setTrailOpen(false)} aria-label={t.close}>
            <IconClose />
          </button>
        </header>
        <TreasureGallery />
        <p className="drawer__intro">{trail.length ? t.trailIntro : null}</p>
        <TrailList withRemove />
        {trail.length ? <CardDownload /> : null}
        <div className="visit">
          <h3>{t.visitTitle}</h3>
          <p>{t.visitBefore}</p>
          <p>{t.visitDuring}</p>
          <p>{t.visitAfter}</p>
        </div>
      </aside>
    </div>
  )
}

/** The epilogue's right-hand column: the trail becomes the bridge to the real museum. */
export function LegacyPanel() {
  const { t } = useT()
  const trail = useJourney((s) => s.trail)
  const started = useJourney((s) => s.started)
  const el = useRef<HTMLElement>(null)
  const last = CHAPTERS.length - 1
  useTicker(() => {
    if (!el.current) return
    const o = Math.max(0, (presence(last, scrollState.progress) - 0.5) * 2)
    el.current.style.opacity = String(o)
    el.current.style.transform = `translateY(${((1 - o) * 24).toFixed(1)}px)`
    el.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
    el.current.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
  })
  return (
    <section ref={el} className="legacy" data-lenis-prevent data-visible={started} aria-labelledby="legacy-title">
      <h2 id="legacy-title" className="legacy__title">
        {t.trail}
      </h2>
      <p className="legacy__count">{t.trailCount(trail.length)}</p>
      {/* Phones show this summary and open the full trail in its drawer. */}
      <button className="btn btn--gold btn--compact legacy__open" onClick={() => useJourney.getState().setTrailOpen(true)}>
        {t.openTrail}
      </button>
      <TreasureGallery />
      {trail.length ? <p className="legacy__intro">{t.trailIntro}</p> : null}
      <TrailList withRemove={false} />
      {trail.length ? (
        <CardDownload />
      ) : (
        <div className="legacy__jump">
          {(['anubis', 'throne', 'canopic'] as ArtifactId[]).map((id) => (
            <button key={id} className="link-btn" onClick={() => scrollToChapter(ARTIFACT_CHAPTER[id])}>
              {t.chapters[ARTIFACT_CHAPTER[id]]}
            </button>
          ))}
        </div>
      )}
      <button className="link-btn link-btn--muted legacy__again" onClick={() => scrollToChapter(0)}>
        {t.startAgain}
      </button>
    </section>
  )
}
