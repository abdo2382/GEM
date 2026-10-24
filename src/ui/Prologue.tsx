import { Fragment, useRef } from 'react'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { scrollState, smoothstep } from '../state/scroll'
import { useTicker } from './useTicker'

/** Latin title, letter by letter; words stay whole so narrow screens wrap between them. */
function letters(title: string) {
  let start = 0
  return title.split(' ').map((word, w, all) => {
    const first = start
    start += word.length + 1 // the space keeps its beat in the cascade
    return (
      <Fragment key={`${title}-${w}`}>
        <span className="prologue__word">
          {[...word].map((ch, i) => (
            <span key={i} style={{ animationDelay: `${1.4 + (first + i) * 0.07}s` }}>
              {ch}
            </span>
          ))}
        </span>
        {w < all.length - 1 ? ' ' : null}
      </Fragment>
    )
  })
}

/** Opening title over the mask; dissolves as the visitor starts to descend. */
export function Prologue() {
  const { t, lang, story } = useT()
  const started = useJourney((s) => s.started)
  const el = useRef<HTMLDivElement>(null)
  const hint = useRef<HTMLDivElement>(null)
  const lede = useRef<HTMLDivElement>(null)

  useTicker(() => {
    const p = scrollState.progress
    const o = 1 - smoothstep(0.0, 0.05, p)
    if (el.current) {
      el.current.style.opacity = String(o)
      el.current.style.transform = `translateY(${(-p * 600).toFixed(1)}px)`
      el.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
    }
    if (hint.current) hint.current.style.opacity = String(1 - smoothstep(0, 0.02, p))
    if (lede.current) {
      lede.current.style.opacity = String(o)
      lede.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
    }
  })

  return (
    <div className="prologue" data-visible={started}>
      <div ref={el} className="prologue__title-wrap">
        <h1 className="prologue__title">
          {/* Latin letters arrive one by one; Arabic arrives by word so letters stay joined. */}
          {lang === 'ar'
            ? t.title.split(' ').map((w, i, all) => (
                <span key={`${t.title}-${i}`} style={{ animationDelay: `${1.4 + i * 0.25}s` }}>
                  {w}
                  {i < all.length - 1 ? ' ' : null}
                </span>
              ))
            : letters(t.title)}
        </h1>
        <p className="prologue__subtitle">{t.subtitle}</p>
      </div>
      <div ref={lede}>
        <p className="prologue__lede">{story.prologue.paragraphs[0]}</p>
      </div>
      <div ref={hint} className="scroll-hint" aria-hidden="true">
        <span>{t.scrollHint}</span>
        <i />
      </div>
    </div>
  )
}
