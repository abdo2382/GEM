import { useRef } from 'react'
import { CHAPTERS } from '../content/chapters'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { scrollToChapter } from '../scroll/controls'
import { scrollState } from '../state/scroll'
import { useTicker } from './useTicker'

const NUMERALS = ['𓏺', '𓏻', '𓏼', '𓏽', '𓏾']

/** A slim line of five marks: where you are in the story, and a way to jump. */
export function ChapterNav() {
  const { t } = useT()
  const chapter = useJourney((s) => s.chapter)
  const started = useJourney((s) => s.started)
  const fill = useRef<HTMLSpanElement>(null)
  useTicker(() => {
    if (fill.current) fill.current.style.transform = `scaleY(${scrollState.progress.toFixed(4)})`
  })
  return (
    <nav className="chapter-nav" aria-label={t.jumpTo} data-visible={started}>
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
    </nav>
  )
}
