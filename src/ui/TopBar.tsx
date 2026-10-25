import { useEffect, useRef, useState } from 'react'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { IconAnkh, IconCartouche, IconGauge, IconInfo, IconMore, IconSound } from './icons'
import type { QualityPref } from '../quality/adaptiveQuality'
import { setAmbience, setAmbienceChapter } from '../audio/ambience'
import { scrollToChapter } from '../scroll/controls'
import { isPortrait } from '../utils/viewport'
import { scrollState } from '../state/scroll'
import { useTicker } from './useTicker'
import { nextBar, type BarState } from './barVisibility'

export function TopBar() {
  const { t, lang } = useT()
  const sound = useJourney((s) => s.sound)
  const started = useJourney((s) => s.started)
  const trail = useJourney((s) => s.trail)
  const chapter = useJourney((s) => s.chapter)
  const quality = useJourney((s) => s.quality)
  const qualityPref = useJourney((s) => s.qualityPref)
  // Phones fold language, sound and sources into one menu beside the trail.
  const [menu, setMenu] = useState(false)
  const header = useRef<HTMLElement>(null)
  const more = useRef<HTMLButtonElement>(null)
  const bar = useRef<BarState>({ hidden: false, anchor: 0 })

  useEffect(() => {
    if (started) setAmbience(sound)
  }, [sound, started])
  useEffect(() => setAmbienceChapter(chapter), [chapter])

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenu(false)
      more.current?.focus()
    }
    const onDown = (e: PointerEvent) => {
      if (!header.current?.contains(e.target as Node)) setMenu(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [menu])

  // On phones the bar steps aside while the visitor scrolls down, and returns on the way up.
  useTicker(() => {
    const el = header.current
    if (!el) return
    // Keyboard focus inside keeps it; a finger that tapped a button there does not.
    const focus = document.activeElement
    const pinned = !isPortrait() || menu || (!!focus && el.contains(focus) && focus.matches(':focus-visible'))
    const next = nextBar(bar.current, scrollState.y, pinned)
    if (next.hidden !== bar.current.hidden) document.documentElement.classList.toggle('bar-hidden', next.hidden)
    bar.current = next
  })

  const s = useJourney.getState
  return (
    <header ref={header} className="topbar" data-visible={started}>
      <button className="topbar__brand" onClick={() => scrollToChapter(0)} aria-label={`${t.title} — ${t.chapters[0]}`}>
        <IconAnkh />
        <span>{t.title}</span>
      </button>
      <nav className="topbar__actions" aria-label={t.settings}>
        <button ref={more} className="chip chip--icon topbar__more" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="topbar-settings" aria-label={t.settings} title={t.settings}>
          <IconMore />
        </button>
        <div id="topbar-settings" className="topbar__settings" data-open={menu}>
          <button className="chip" onClick={() => s().setLang(lang === 'en' ? 'ar' : 'en')} aria-label={t.languageLabel} lang={lang === 'en' ? 'ar' : 'en'}>
            {t.language}
          </button>
          <button className="chip chip--icon" onClick={() => s().setSound(!sound)} aria-pressed={sound} aria-label={sound ? t.soundOn : t.soundOff} title={sound ? t.soundOn : t.soundOff}>
            <IconSound on={sound} />
            <span className="chip__text">{sound ? t.soundOn : t.soundOff}</span>
          </button>
          <button
            className="chip chip--icon"
            onClick={() => {
              setMenu(false)
              s().setCreditsOpen(true)
            }}
            aria-label={t.credits}
            title={t.credits}
          >
            <IconInfo />
            <span className="chip__text">{t.credits}</span>
          </button>
          {/* Auto adapts to the device; a fixed choice is kept for the next visit. The native
              select covers the whole chip, so a tap anywhere on it opens the picker. */}
          <label className="chip chip--select" title={t.quality}>
            <IconGauge />
            <span className="chip__text">{t.quality}</span>
            <span className="chip__value" aria-hidden="true">
              {qualityPref === 'auto' ? `${t.qualityAuto} (${t.qualityLevels[quality]})` : t.qualityLevels[qualityPref]}
            </span>
            <select className="chip__native" value={qualityPref} onChange={(e) => s().setQualityPref(e.target.value as QualityPref)} aria-label={t.quality}>
              <option value="auto">{qualityPref === 'auto' ? `${t.qualityAuto} (${t.qualityLevels[quality]})` : t.qualityAuto}</option>
              <option value="low">{t.qualityLevels.low}</option>
              <option value="medium">{t.qualityLevels.medium}</option>
              <option value="high">{t.qualityLevels.high}</option>
            </select>
          </label>
        </div>
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
