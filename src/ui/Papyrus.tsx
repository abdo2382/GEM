import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { CHAPTERS } from '../content/chapters'
import { ARTIFACTS } from '../content/artifacts'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { CARTOUCHE_GLYPHS } from '../i18n/strings'
import { TrailButton } from './ArtifactCaption'
import { IconCartouche, IconEye } from './icons'
import { Vignette } from './Vignette'
import { ArchivePhoto } from './ArchivePhoto'
import { STAGE_PHOTO } from '../content/archive'
import { PRESETS } from '../quality/adaptiveQuality'

/* Decorative signs for the margin of each chapter (not a readable inscription). */
const MARGIN_GLYPHS = ['𓂀𓇳𓋹', '𓉐𓏏𓊃', '𓋹𓌀𓊽', '𓆣𓋴𓂀', '𓊽𓋹𓇳']

function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span className="word" key={i}>
          {w}
        </span>
      ))}
    </>
  )
}

/**
 * The narrator: an aged papyrus whose text is inked in word by word as each
 * chapter arrives, with an optional deeper reading for the curious.
 */
export function Papyrus() {
  const { t, story, lang, artifacts } = useT()
  const chapter = useJourney((s) => s.chapter)
  const started = useJourney((s) => s.started)
  const reduced = useJourney((s) => s.reducedMotion)
  const trail = useJourney((s) => s.trail)
  const [shown, setShown] = useState(chapter)
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const root = useRef<HTMLElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)

  // Fade the current passage out before the next chapter is written in.
  useEffect(() => {
    if (chapter === shown) return
    const el = content.current
    if (!el || reduced) {
      setShown(chapter)
      return
    }
    const tween = gsap.to(el, {
      opacity: 0,
      y: -8,
      filter: 'blur(4px)',
      duration: 0.32,
      ease: 'power2.in',
      onComplete: () => {
        setShown(chapter)
        setExpanded(false)
      },
    })
    return () => {
      tween.kill()
    }
  }, [chapter, shown, reduced])

  // Ink the words in.
  useLayoutEffect(() => {
    const el = content.current
    if (!el) return
    gsap.set(el, { opacity: 1, y: 0, filter: 'none' })
    // The opening's sheet is rolled up: nobody sees its words, so don't spend the load inking them.
    if (reduced || shown === 0) return
    const words = el.querySelectorAll('.papyrus__body .word')
    // A blur filter on every word is costly on phones; lower tiers ink in with fade and rise only.
    const blur = PRESETS[useJourney.getState().quality].wordBlur
    const soft = (px: number) => (blur ? { filter: `blur(${px}px)` } : {})
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('.papyrus__kicker, .papyrus__title'),
        { opacity: 0, y: 10, ...soft(6) },
        { opacity: 1, y: 0, ...soft(0), duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.05 },
      )
      gsap.fromTo(
        words,
        { opacity: 0, y: 6, ...soft(5) },
        { opacity: 1, y: 0, ...soft(0), duration: 0.7, stagger: 0.022, ease: 'power2.out', delay: 0.35 },
      )
      gsap.fromTo(el.querySelectorAll('.papyrus__margin span'), { opacity: 0, scale: 0.8 }, { opacity: 0.7, scale: 1, duration: 1.2, stagger: 0.2, delay: 0.5 })
    }, el)
    return () => ctx.revert()
  }, [shown, lang, reduced])

  // Rolled up during the prologue; it unrolls as the first chapter begins.
  const unrolled = started && chapter > 0
  const text = story[CHAPTERS[shown].id]
  // The object this chapter's story leads to, one tap from the text.
  const object = CHAPTERS[shown].artifact
  return (
    <main
      ref={root}
      id="story"
      tabIndex={-1}
      className={`papyrus ${mobileOpen ? 'is-open' : ''} ${unrolled ? 'is-unrolled' : ''}`}
      aria-live="polite"
      aria-label={t.chapters[shown]}
      data-visible={started}
    >
      <div className="papyrus__curl papyrus__curl--top" aria-hidden="true" />
      <div className="papyrus__roll">
      <div ref={sheet} className="papyrus__sheet" inert={!unrolled}>
        <div className="papyrus__frieze" aria-hidden="true" />
        <button className="papyrus__handle" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} aria-label={mobileOpen ? t.readLess : t.readMore}>
          <span />
        </button>
        <div ref={content} className="papyrus__content" data-lenis-prevent>
          <div className="papyrus__margin" aria-hidden="true">
            {[...MARGIN_GLYPHS[shown]].map((g, i) => (
              <span key={`${shown}-${i}`}>{g}</span>
            ))}
          </div>
          <Vignette key={`${shown}-${unrolled}`} chapter={shown} label={t.vignettes[shown]} />
          <header className="papyrus__header">
            <p className="papyrus__kicker">{text.kicker}</p>
            <h2 className="papyrus__title">{text.title}</h2>
          </header>
          <div className="papyrus__body">
            {text.paragraphs.map((p, i) => (
              <p key={`${shown}-${lang}-${i}`}>
                <Words text={p} />
              </p>
            ))}
          </div>
          {/* The real thing: one of Harry Burton's excavation photographs for this chapter. */}
          <ArchivePhoto key={`photo-${shown}`} id={STAGE_PHOTO[CHAPTERS[shown].id]} className="archive--papyrus" />
          {expanded ? (
            <div className="papyrus__more">
              {text.more.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : null}
          <button className="papyrus__toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
            {expanded ? t.readLess : t.readMore}
          </button>
          <div className="papyrus__seal" aria-hidden="true">
            {CARTOUCHE_GLYPHS}
          </div>
        </div>
        {object ? (
          <div key={object} className="papyrus__object">
            <button className="papyrus__inspect" onClick={() => useJourney.getState().openInspect(object)}>
              <IconEye />
              <span>{t.inspectNamed.replace('{name}', artifacts[object].name)}</span>
            </button>
            <div className="papyrus__object-extra">
              <span className="papyrus__prov" title={t.provenanceNote}>
                {t.provenance[ARTIFACTS[object].provenance]}
              </span>
              <TrailButton id={object} compact quiet />
            </div>
          </div>
        ) : shown === CHAPTERS.length - 1 ? (
          // The epilogue has no object; on phones its trail summary takes the row, so
          // nothing floats over the mask (wide screens keep the side panel).
          <div key="trail" className="papyrus__object papyrus__trail">
            <p className="papyrus__trail-name">{t.trail}</p>
            <p className="papyrus__trail-count">{t.trailCount(trail.length)}</p>
            <button className="btn btn--gold btn--compact" onClick={() => useJourney.getState().setTrailOpen(true)}>
              <IconCartouche filled={trail.length > 0} />
              <span>{t.openTrail}</span>
            </button>
          </div>
        ) : null}
      </div>
      </div>
      <div className="papyrus__curl papyrus__curl--bottom" aria-hidden="true" />
    </main>
  )
}
