import { useRef, useState } from 'react'
import { ARTIFACT_CHAPTER, CHAPTERS } from '../content/chapters'
import { ARTIFACTS } from '../content/artifacts'
import type { ArtifactId, TreasureId } from '../content/types'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { presence, scrollState } from '../state/scroll'
import { useTicker } from './useTicker'
import { IconCartouche, IconEye } from './icons'

export function TrailButton({ id, compact = false }: { id: TreasureId; compact?: boolean }) {
  const { t } = useT()
  const saved = useJourney((s) => s.trail.includes(id))
  const [pulse, setPulse] = useState(0)
  return (
    <button
      className={`btn ${saved ? 'btn--saved' : 'btn--gold'} ${compact ? 'btn--compact' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? t.inTrail : t.addTrail}
      onClick={() => {
        useJourney.getState().toggleTrail(id)
        if (!saved) setPulse((p) => p + 1)
      }}
    >
      <IconCartouche filled={saved} />
      <span>{saved ? t.inTrail : compact ? t.addTrailShort : t.addTrail}</span>
      {pulse ? <i key={pulse} className="btn__seal" aria-hidden="true" /> : null}
    </button>
  )
}

/** Name, story and actions for the artifact currently on stage. */
export function ArtifactCaption() {
  const { t, artifacts } = useT()
  const chapter = useJourney((s) => s.chapter)
  const started = useJourney((s) => s.started)
  const inspect = useJourney((s) => s.inspect)
  const current = CHAPTERS[chapter].artifact
  // Keep the last artifact mounted while it fades out between chapters.
  const last = useRef<ArtifactId | null>(current)
  if (current) last.current = current
  const shown = last.current
  const el = useRef<HTMLDivElement>(null)

  useTicker(() => {
    if (!el.current) return
    const p = shown ? presence(ARTIFACT_CHAPTER[shown], scrollState.progress) : 0
    const o = Math.max(0, (p - 0.55) / 0.45)
    el.current.style.opacity = String(inspect ? 0 : o)
    el.current.style.transform = `translateY(${((1 - o) * 18).toFixed(1)}px)`
    el.current.style.pointerEvents = o > 0.5 && !inspect ? 'auto' : 'none'
    el.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
  })

  if (!shown) return null
  const text = artifacts[shown]
  return (
    <section ref={el} className="caption" data-visible={started} aria-label={text.name}>
      <p className="caption__origin">{text.origin}</p>
      <h3 className="caption__name">{text.name}</h3>
      <p className="caption__short">{text.short}</p>
      <div className="caption__actions">
        <button className="btn btn--ghost" aria-label={`${t.inspect}: ${text.name}`} onClick={() => useJourney.getState().openInspect(shown)}>
          <IconEye /> <span>{t.inspect}</span>
        </button>
        <TrailButton id={shown} />
      </div>
      <p className="badge" title={t.provenanceNote}>
        {t.provenance[ARTIFACTS[shown].provenance]}
      </p>
    </section>
  )
}

/** Small provenance label under the mask, shown in the opening and closing chapters. */
export function MaskLabel() {
  const { t } = useT()
  const started = useJourney((s) => s.started)
  const el = useRef<HTMLParagraphElement>(null)
  useTicker(() => {
    if (!el.current) return
    const p = scrollState.progress
    // Always offered on wide screens; on phones only when the mask holds the stage alone.
    // Same rule as the 3D layout: narrow, or taller than wide.
    const phone = window.innerWidth < 760 || window.innerWidth / window.innerHeight < 0.85
    const o = phone ? Math.max(0, (Math.max(presence(0, p), presence(CHAPTERS.length - 1, p)) - 0.5) * 2) : 1
    el.current.style.opacity = String(o * 0.9)
    el.current.style.visibility = o < 0.02 ? 'hidden' : 'visible'
  })
  return (
    <p ref={el} className="mask-label" data-visible={started}>
      <button className="mask-label__btn" onClick={() => useJourney.getState().openInspect('mask')}>
        <IconEye />
        <span className="mask-label__name">{t.maskName}</span>
        <span className="mask-label__action">{t.inspect}</span>
      </button>
      <span className="mask-label__prov">{t.provenance.reconstruction}</span>
    </p>
  )
}
