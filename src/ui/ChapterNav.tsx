import { useEffect, useRef, useState } from 'react'
import { CHAPTERS } from '../content/chapters'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { scrollToChapter } from '../scroll/controls'
import { scrollState } from '../state/scroll'
import { setStyle, useTicker } from './useTicker'

const NUMERALS = ['𓏺', '𓏻', '𓏼', '𓏽', '𓏾']

/** A slim line of five marks: where you are in the story, and a way to jump. */
export function ChapterNav() {
  const { t } = useT()
  const chapter = useJourney((s) => s.chapter)
  const started = useJourney((s) => s.started)
  const fill = useRef<HTMLSpanElement>(null)
  const nav = useRef<HTMLElement>(null)
  // Each new chapter shows its name for a moment, so the marks are never anonymous.
  const [announce, setAnnounce] = useState(false)
  const settled = useRef(false)
  useEffect(() => {
    if (!started) return
    if (!settled.current) {
      settled.current = true
      return
    }
    setAnnounce(true)
    const id = window.setTimeout(() => setAnnounce(false), 2600)
    return () => window.clearTimeout(id)
  }, [chapter, started])
  useTicker(() => {
    if (fill.current) setStyle(fill.current, 'transform', `scaleY(${scrollState.progress.toFixed(4)})`)
    // On phones the opening belongs to the title; the marks arrive once the descent begins.
    const quiet = String(scrollState.progress < 0.02)
    if (nav.current && nav.current.dataset.quiet !== quiet) nav.current.dataset.quiet = quiet
  })
  return (
    <nav ref={nav} className="chapter-nav" aria-label={t.jumpTo} data-visible={started} data-announce={announce}>
      <span className="chapter-nav__track" aria-hidden="true">
        <span ref={fill} className="chapter-nav__fill" />
      </span>
      <ol>
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <button
              className="chapter-nav__mark"
              aria-current={i === chapter ? 'step' : undefined}
              onClick={() => scrollToChapter(i)}
              aria-label={`${t.jumpTo}: ${t.chapters[i]}`}
            >
              <span className="chapter-nav__num" aria-hidden="true">
                {NUMERALS[i]}
              </span>
              <span className="chapter-nav__label">{t.chapters[i]}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="chapter-nav__now" aria-hidden="true">
        {t.chapters[chapter]}
      </p>
    </nav>
  )
}
