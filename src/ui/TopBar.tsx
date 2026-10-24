import { useEffect } from 'react'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { IconAnkh, IconCartouche, IconInfo, IconSound } from './icons'
import { setAmbience, setAmbienceChapter } from '../audio/ambience'
import { scrollToChapter } from '../scroll/controls'

export function TopBar() {
  const { t, lang } = useT()
  const sound = useJourney((s) => s.sound)
  const started = useJourney((s) => s.started)
  const trail = useJourney((s) => s.trail)
  const chapter = useJourney((s) => s.chapter)

  useEffect(() => {
    if (started) setAmbience(sound)
  }, [sound, started])
  useEffect(() => setAmbienceChapter(chapter), [chapter])

  const s = useJourney.getState
  return (
    <header className="topbar" data-visible={started}>
      <button className="topbar__brand" onClick={() => scrollToChapter(0)} aria-label={`${t.title} — ${t.chapters[0]}`}>
        <IconAnkh />
        <span>{t.title}</span>
      </button>
      <nav className="topbar__actions" aria-label="Settings">
        <button className="chip" onClick={() => s().setLang(lang === 'en' ? 'ar' : 'en')} aria-label={t.languageLabel} lang={lang === 'en' ? 'ar' : 'en'}>
          {t.language}
        </button>
        <button className="chip chip--icon" onClick={() => s().setSound(!sound)} aria-pressed={sound} aria-label={sound ? t.soundOn : t.soundOff} title={sound ? t.soundOn : t.soundOff}>
          <IconSound on={sound} />
        </button>
        <button className="chip chip--icon" onClick={() => s().setCreditsOpen(true)} aria-label={t.credits} title={t.credits}>
          <IconInfo />
        </button>
        <button className="chip chip--trail" onClick={() => s().setTrailOpen(true)} aria-label={`${t.trail}: ${t.trailCount(trail.length)}`}>
          <IconCartouche filled={trail.length > 0} />
          <span className="chip__label">{t.trail}</span>
          <span className="chip__count" key={trail.length}>
            {trail.length}
          </span>
        </button>
      </nav>
    </header>
  )
}
