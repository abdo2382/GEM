import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { CARTOUCHE_GLYPHS } from '../i18n/strings'
import { IconSound } from './icons'

/** The gate: a dark threshold that waits for the scene, then lets the visitor in. */
export function Loader({ webgl }: { webgl: boolean }) {
  const { t } = useT()
  const ready = useJourney((s) => s.ready) || !webgl
  const started = useJourney((s) => s.started)
  const [gone, setGone] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const enterBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!ready) return
    enterBtn.current?.focus({ preventScroll: true })
    // Kiosk / demo mode: ?autostart skips the gate.
    const q = new URLSearchParams(location.search)
    if (q.has('autostart') || q.has('studio')) enterBtn.current?.click()
  }, [ready])

  const enter = (withSound: boolean) => {
    const s = useJourney.getState()
    s.setSound(withSound)
    s.start()
    gsap.to(root.current, {
      opacity: 0,
      duration: s.reducedMotion ? 0.2 : 1.6,
      ease: 'power2.inOut',
      onComplete: () => setGone(true),
    })
  }

  if (gone) return null
  return (
    <div ref={root} className={`gate ${ready ? 'is-ready' : ''}`} role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="gate__inner">
        <div className="gate__cartouche" aria-hidden="true">
          {[...CARTOUCHE_GLYPHS].map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </div>
        <h1 id="gate-title" className="gate__title">
          {t.title}
        </h1>
        <p className="gate__subtitle">{t.subtitle}</p>
        <div className="gate__status" aria-live="polite">
          {ready ? null : (
            <>
              <span className="gate__line" />
              <span>{t.loading}</span>
            </>
          )}
        </div>
        <div className="gate__actions" hidden={!ready || started}>
          <button ref={enterBtn} className="btn btn--gold" onClick={() => enter(false)}>
            {t.enter}
          </button>
          <button className="btn btn--ghost" onClick={() => enter(true)}>
            <IconSound on /> {t.enterSound}
          </button>
        </div>
        <p className="gate__note">{t.maskNote}</p>
      </div>
    </div>
  )
}
