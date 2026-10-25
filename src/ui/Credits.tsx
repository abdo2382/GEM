import { useEffect, useRef } from 'react'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { IconClose } from './icons'
import { ARCHIVE, photoCredit } from '../content/archive'

export function Credits() {
  const { t, lang } = useT()
  const open = useJourney((s) => s.creditsOpen)
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    close.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && useJourney.getState().setCreditsOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  if (!open) return null
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="credits-title">
      <div className="modal__scrim" onClick={() => useJourney.getState().setCreditsOpen(false)} />
      <div className="modal__panel" data-lenis-prevent>
        <header className="drawer__header">
          <h2 id="credits-title">{t.creditsTitle}</h2>
          <button ref={close} className="chip chip--icon" onClick={() => useJourney.getState().setCreditsOpen(false)} aria-label={t.close}>
            <IconClose />
          </button>
        </header>
        {t.creditsBody.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <h3 className="credits__subhead">{t.archiveCredits}</h3>
        <ul className="credits__archive">
          {ARCHIVE.map((p) => (
            <li key={p.id}>
              {p.caption[lang]} {photoCredit(p, lang, t.archivalPhoto, t.publicDomain)}{' '}
              <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                {t.source}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
