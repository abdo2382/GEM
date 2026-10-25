import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
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
import { PerfHud } from './ui/PerfHud'

// The 3D engine ships as its own chunk so the gate paints immediately.
const Stage = lazy(() => import('./three/Stage').then((m) => ({ default: m.Stage })))
const PERF = new URLSearchParams(location.search).has('perf')

/** If the 3D scene can't load (a failed download) or crashes, the story edition takes over. */
class SceneBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('[scene] showing the story edition instead', error)
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

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
  const quality = useJourney((s) => s.quality)
  const contextLost = useJourney((s) => s.contextLost)
  const [sceneFailed, setSceneFailed] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.quality = quality
  }, [quality])

  // A lost WebGL context usually returns within moments; if it doesn't, the story
  // edition takes over, with the visitor's trail intact.
  useEffect(() => {
    if (!contextLost) return
    const id = window.setTimeout(() => setSceneFailed(true), 4000)
    return () => window.clearTimeout(id)
  }, [contextLost])

  useEffect(() => {
    const html = document.documentElement
    html.lang = lang
    html.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.title = `${STRINGS[lang].title} — ${STRINGS[lang].subtitle}`
  }, [lang])

  if (!webgl || sceneFailed) {
    return (
      <>
        <StaticFallback />
        <TrailDrawer />
        {PERF ? <PerfHud /> : null}
      </>
    )
  }

  return (
    <>
      <SceneBoundary onFail={() => setSceneFailed(true)}>
        <Suspense fallback={null}>{fontsReady ? <Stage /> : null}</Suspense>
      </SceneBoundary>
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
      {PERF ? <PerfHud /> : null}
    </>
  )
}
