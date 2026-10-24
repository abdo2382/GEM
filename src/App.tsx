import { lazy, Suspense, useEffect, useState } from 'react'
import { useJourney } from './state/store'
import { hasWebGL } from './utils/device'
import { CARTOUCHE_GLYPHS, STRINGS } from './i18n/strings'
import { ScrollDriver } from './scroll/ScrollDriver'
import { TopBar } from './ui/TopBar'
import { Prologue } from './ui/Prologue'
import { Papyrus } from './ui/Papyrus'
import { ArtifactCaption, MaskLabel } from './ui/ArtifactCaption'
import { ChapterNav } from './ui/ChapterNav'
import { InspectOverlay } from './ui/InspectOverlay'
import { LegacyPanel, TrailDrawer } from './ui/Trail'
import { Credits } from './ui/Credits'
import { Loader } from './ui/Loader'
import { Letterbox } from './ui/Letterbox'
import { StaticFallback } from './ui/StaticFallback'

// The 3D engine ships as its own chunk so the gate paints immediately.
const Stage = lazy(() => import('./three/Stage').then((m) => ({ default: m.Stage })))

/** Canvas textures draw hieroglyphs, so the sign font must be ready before the scene builds. */
function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const fonts = Promise.all([
      document.fonts.load('64px "Noto Sans Egyptian Hieroglyphs"', `${CARTOUCHE_GLYPHS}𓋹𓂀𓆣𓊽𓀀𓃭`),
      document.fonts.load('48px Cinzel'),
      document.fonts.load('20px "EB Garamond"'),
      document.fonts.load('20px Amiri', 'عربي'),
    ])
    const timeout = new Promise((r) => setTimeout(r, 5000))
    Promise.race([fonts, timeout])
      .catch(() => undefined)
      .then(() => setReady(true))
  }, [])
  return ready
}

export default function App() {
  const lang = useJourney((s) => s.lang)
  const inspect = useJourney((s) => s.inspect)
  const [webgl] = useState(hasWebGL)
  const fontsReady = useFontsReady()

  useEffect(() => {
    const html = document.documentElement
    html.lang = lang
    html.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.title = `${STRINGS[lang].title} — ${STRINGS[lang].subtitle}`
  }, [lang])

  if (!webgl) {
    return (
      <>
        <StaticFallback />
        <TrailDrawer />
      </>
    )
  }

  return (
    <>
      <Suspense fallback={null}>{fontsReady ? <Stage /> : null}</Suspense>
      <ScrollDriver />
      <Letterbox />
      <div className={`ui ${inspect ? 'is-inspecting' : ''}`}>
        <a className="skip-link" href="#story">
          {STRINGS[lang].skipToStory}
        </a>
        <TopBar />
        <Prologue />
        <Papyrus />
        <MaskLabel />
        <ArtifactCaption />
        <LegacyPanel />
        <ChapterNav />
      </div>
      <InspectOverlay />
      <TrailDrawer />
      <Credits />
      <Loader webgl={webgl} />
    </>
  )
}
