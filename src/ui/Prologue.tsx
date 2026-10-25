import { Fragment, useEffect, useRef } from 'react'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { scrollState, smoothstep } from '../state/scroll'
import { setStyle, useTicker } from './useTicker'
import { setOpeningBand } from './openingFrame'

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

  // The free band between the title block and the scroll hint, for fitting the mask on
  // wide screens. Measured when the layout changes (never per frame).
  useEffect(() => {
    const measure = () => {
      const wrap = el.current
      const cue = hint.current
      if (!wrap || !cue) return
      setOpeningBand(wrap.offsetTop + wrap.offsetHeight + 12, cue.offsetTop - 16, window.innerHeight)
    }
    measure()
    void document.fonts?.ready.then(measure)
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [lang])

  useTicker(() => {
    const p = scrollState.progress
    const o = 1 - smoothstep(0.0, 0.05, p)
    if (el.current) {
      setStyle(el.current, 'opacity', String(o))
      setStyle(el.current, 'transform', `translateY(${(-p * 600).toFixed(1)}px)`)
      setStyle(el.current, 'visibility', o < 0.01 ? 'hidden' : 'visible')
    }
    if (hint.current) setStyle(hint.current, 'opacity', String(1 - smoothstep(0, 0.02, p)))
    if (lede.current) {
      setStyle(lede.current, 'opacity', String(o))
      setStyle(lede.current, 'visibility', o < 0.01 ? 'hidden' : 'visible')
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
