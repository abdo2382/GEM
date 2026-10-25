import { useRef, useState } from 'react'
import { ARTIFACT_CHAPTER, CHAPTERS } from '../content/chapters'
import { ARTIFACTS } from '../content/artifacts'
import type { ArtifactId, TreasureId } from '../content/types'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { presence, scrollState } from '../state/scroll'
import { setStyle, useTicker } from './useTicker'
import { isPortrait } from '../utils/viewport'
import { IconCartouche, IconEye } from './icons'

/** Save to the trail. `quiet`: an outline beside the gold Inspect, the second action. */
export function TrailButton({ id, compact = false, quiet = false }: { id: TreasureId; compact?: boolean; quiet?: boolean }) {
  const { t } = useT()
  const saved = useJourney((s) => s.trail.includes(id))
  const [pulse, setPulse] = useState(0)
  const tone = saved ? 'btn--saved' : quiet ? 'btn--quiet' : 'btn--gold'
  return (
    <button
      className={`btn ${tone} ${compact ? 'btn--compact' : ''}`}
      aria-pressed={saved}
      onClick={() => {
        useJourney.getState().toggleTrail(id)
        if (!saved) setPulse((p) => p + 1)
      }}
    >
      <IconCartouche filled={saved} />
      {saved ? (
        <span>{t.inTrail}</span>
      ) : compact ? (
        // The spoken name starts with the visible word, so voice control finds "Save".
        <span>
          {t.addTrailShort}
          <span className="sr-only">{t.saveSuffix}</span>
        </span>
      ) : (
        <span>{t.addTrail}</span>
      )}
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
    setStyle(el.current, 'opacity', String(inspect ? 0 : o))
    setStyle(el.current, 'transform', `translateY(${((1 - o) * 18).toFixed(1)}px)`)
    setStyle(el.current, 'pointerEvents', o > 0.5 && !inspect ? 'auto' : 'none')
    setStyle(el.current, 'visibility', o < 0.01 ? 'hidden' : 'visible')
  })

  if (!shown) return null
  const text = artifacts[shown]
  return (
    <section ref={el} className="caption" data-visible={started} aria-label={text.name}>
      <p className="caption__origin">{text.origin}</p>
      <h3 className="caption__name">{text.name}</h3>
      <p className="badge" title={t.provenanceNote}>
        {t.provenance[ARTIFACTS[shown].provenance]}
      </p>
      <p className="caption__short">{text.short}</p>
      {/* One main action: Inspect in gold; saving is the quieter second choice. */}
      <div className="caption__actions">
        <button className="btn btn--gold" aria-label={`${t.inspect}: ${text.name}`} onClick={() => useJourney.getState().openInspect(shown)}>
          <IconEye /> <span>{t.inspect}</span>
        </button>
        <TrailButton id={shown} compact quiet />
      </div>
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
    // Always offered on wide screens; on phones only in the opening, where the mask holds
    // the stage alone (in the epilogue the story sheet's trail row takes its place).
    // Same rule as the 3D layout: narrow, or taller than wide.
    const phone = isPortrait()
    const o = phone ? Math.max(0, (presence(0, p) - 0.5) * 2) : 1
    setStyle(el.current, 'opacity', String(o * 0.9))
    setStyle(el.current, 'visibility', o < 0.02 ? 'hidden' : 'visible')
    // While another treasure holds the stage, the mask's label steps back (hover restores it).
    let other = 0
    if (!phone) for (let i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].artifact) other = Math.max(other, presence(i, p))
    const quiet = other.toFixed(2)
    if (el.current.style.getPropertyValue('--quiet') !== quiet) el.current.style.setProperty('--quiet', quiet)
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
