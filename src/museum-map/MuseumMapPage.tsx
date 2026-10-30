import { Component, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { pageHref } from '../site/route'
import { setLang, useLang } from '../site/lang'
import { hasWebGL } from '../utils/device'
import { IconMinus, IconPlus } from '../ui/icons'
import type { Insets } from './camera'
import { formatDistance, formatMinutes } from './describe'
import { IconFit, IconHome } from './icons'
import { Map2D, type Map2DHandle } from './Map2D'
import { MAP, placeById, walkBetween } from './mapData'
import { mapSearch, parseMapUrl } from './mapUrl'
import { Panel } from './Panel'
import { STRINGS } from './strings'
import './museum-map.css'

// The 3D view is its own chunk: three.js is not downloaded unless someone asks for it.
const Map3D = lazy(() => import('./Map3D'))

const DEFAULT_FROM = 'ticketing-entrance'
const DEFAULT_TO = 'main-entrance'
const PLACE_IDS = new Set(MAP.places.map((p) => p.id))

/** The same rule as the experience: narrower than 760 px, or taller than wide. */
const PORTRAIT = '(max-width: 759.98px), (max-aspect-ratio: 85/100)'
const subscribePortrait = (notify: () => void) => {
  const query = matchMedia(PORTRAIT)
  query.addEventListener('change', notify)
  return () => query.removeEventListener('change', notify)
}
const usePortrait = () => useSyncExternalStore(subscribePortrait, () => matchMedia(PORTRAIT).matches, () => false)

/** If the 3D view fails (no WebGL, a lost context, a failed download) the plan takes over. */
class ViewBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('[map] showing the plan instead of the 3D view', error)
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function MuseumMapPage() {
  const lang = useLang()
  const t = STRINGS[lang]
  const portrait = usePortrait()
  const webgl = useMemo(hasWebGL, [])

  const initial = useMemo(() => {
    const url = parseMapUrl(location.search, PLACE_IDS)
    const asked = url.from !== null || url.to !== null
    return { ...url, asked, from: asked ? url.from : DEFAULT_FROM, to: asked ? url.to : DEFAULT_TO, view: webgl ? url.view : ('plan' as const) }
  }, [webgl])
  const [from, setFrom] = useState<string | null>(initial.from)
  const [to, setTo] = useState<string | null>(initial.to)
  const [stepFree, setStepFree] = useState(initial.stepFree)
  const [view, setView] = useState<'plan' | '3d'>(initial.view)
  const [selected, setSelected] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [sheet, setSheet] = useState<'peek' | 'open'>('peek')
  const [viewFailed, setViewFailed] = useState(false)

  const mapRef = useRef<Map2DHandle>(null)
  const panelWrap = useRef<HTMLDivElement>(null)
  const [insets, setInsets] = useState<Insets>({ top: 0, right: 0, bottom: 0, left: 0 })

  const walk = useMemo(() => walkBetween(from, to, stepFree), [from, to, stepFree])
  const routeKey = `${from}|${to}|${stepFree}|${walk ? 'walk' : 'none'}`
  useEffect(() => setActiveStep(null), [routeKey])

  // On a phone the panel is a sheet over the bottom of the map: frame the map around it.
  useLayoutEffect(() => {
    const el = panelWrap.current?.querySelector('.mm-panel')
    if (!portrait || !el) return setInsets({ top: 0, right: 0, bottom: 0, left: 0 })
    const ro = new ResizeObserver((entries) => {
      const bottom = Math.round(entries[0].borderBoxSize?.[0]?.blockSize ?? entries[0].contentRect.height) + 8
      setInsets((old) => (old.bottom === bottom ? old : { top: 0, right: 0, bottom, left: 0 }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [portrait])
  // When the sheet opens or folds, or the phone turns, frame the walk again: but not on first load.
  const layout = useRef({ sheet, portrait })
  useEffect(() => {
    if (layout.current.sheet === sheet && layout.current.portrait === portrait) return
    layout.current = { sheet, portrait }
    const id = window.setTimeout(() => mapRef.current?.frameRoute(), 60)
    return () => window.clearTimeout(id)
  }, [sheet, portrait])

  // The address bar always describes what is on screen, so a walk can be shared.
  useEffect(() => {
    history.replaceState(null, '', location.pathname + mapSearch({ from, to, stepFree, view }, location.search) + location.hash)
  }, [from, to, stepFree, view])

  useEffect(() => {
    document.title = `${t.title} — ${t.subtitle}`
  }, [t])

  const select = useCallback(
    (id: string | null) => {
      setSelected(id)
      if (id) {
        mapRef.current?.focusPlace(id)
        if (portrait) setSheet('open')
      }
    },
    [portrait],
  )
  const pickFrom = (id: string | null) => {
    setFrom(id)
    setSelected(null)
  }
  const pickTo = (id: string | null) => {
    setTo(id)
    setSelected(null)
  }
  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  const activeRange: [number, number] | null =
    walk && activeStep !== null && walk.steps[activeStep]
      ? [walk.steps[activeStep].from, activeStep + 1 < walk.steps.length ? walk.steps[activeStep + 1].from : walk.route.nodes.length - 1]
      : null

  const announce = useMemo(() => {
    const a = placeById(from)
    const b = placeById(to)
    return walk && a && b ? t.announce(a.name[lang], b.name[lang], formatDistance(walk.route.length, lang, 'total'), formatMinutes(walk.minutes, lang)) : ''
  }, [walk, from, to, lang, t])

  const routeProp = useMemo(() => (walk ? { nodes: walk.route.nodes, kinds: walk.route.legs.map((l) => l.kind) } : null), [walk])
  const showSolid = view === '3d' && !viewFailed

  return (
    <div className="mm-page" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="mm-top">
        <a className="mm-top__home" href={pageHref('home', lang)} aria-label={t.home}>
          <IconHome />
          <span>{t.home}</span>
        </a>
        <div className="mm-top__title">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="mm-top__tools">
          <div className="mm-seg" role="group" aria-label={t.viewLabel}>
            <button type="button" aria-pressed={!showSolid} onClick={() => setView('plan')}>
              {t.plan}
            </button>
            <button
              type="button"
              aria-pressed={showSolid}
              disabled={!webgl}
              title={webgl ? undefined : t.noWebgl}
              onClick={() => {
                setViewFailed(false)
                setView('3d')
              }}
            >
              {t.solid}
            </button>
          </div>
          <button type="button" className="mm-chip" lang={lang === 'en' ? 'ar' : 'en'} onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
            {t.switchLang}
          </button>
        </div>
      </header>

      <main className="mm-main">
        <div className="mm-stage" data-view={showSolid ? '3d' : 'plan'} style={{ '--sheet-h': `${insets.bottom}px` } as React.CSSProperties}>
          {showSolid ? (
            <ViewBoundary onFail={() => setViewFailed(true)}>
              <Suspense fallback={<p className="mm-loading">{t.loading3d}</p>}>
                <Map3D lang={lang} selected={selected} from={from} to={to} route={routeProp} activeRange={activeRange} insets={insets} frameFirst={initial.asked} onSelect={select} onFail={() => setViewFailed(true)} />
              </Suspense>
            </ViewBoundary>
          ) : (
            <Map2D
              ref={mapRef}
              lang={lang}
              selected={selected}
              from={from}
              to={to}
              route={routeProp}
              activeRange={activeRange}
              insets={insets}
              routeKey={routeKey}
              frameFirst={initial.asked}
              onSelect={select}
            />
          )}
          {viewFailed && view === '3d' ? (
            <p className="mm-banner" role="status">
              {t.noWebgl}
            </p>
          ) : null}
          {showSolid ? null : (
            <div className="mm-zoom" role="group" aria-label={t.mapLabel}>
              <button type="button" onClick={() => mapRef.current?.zoomBy(1.6)} aria-label={t.zoomIn} title={t.zoomIn}>
                <IconPlus />
              </button>
              <button type="button" onClick={() => mapRef.current?.zoomBy(1 / 1.6)} aria-label={t.zoomOut} title={t.zoomOut}>
                <IconMinus />
              </button>
              <button type="button" onClick={() => mapRef.current?.fitAll()} aria-label={t.fit} title={t.fit}>
                <IconFit />
              </button>
            </div>
          )}
          <p className="mm-attrib">
            <a href={MAP.meta.sources[0].url} target="_blank" rel="noopener noreferrer">
              <span>{t.attribution}</span>
            </a>
          </p>
          {showSolid ? <p className="mm-help">{t.help3d}</p> : null}
          <p className="mm-live" role="status" aria-live="polite">
            {announce}
          </p>
        </div>
        <div ref={panelWrap} className="mm-panel-wrap">
          <Panel
            lang={lang}
            from={from}
            to={to}
            stepFree={stepFree}
            walk={walk}
            selected={selected}
            activeStep={activeStep}
            sheet={sheet}
            onFrom={pickFrom}
            onTo={pickTo}
            onSwap={swap}
            onStepFree={setStepFree}
            onSelect={select}
            onActiveStep={setActiveStep}
            onSheet={setSheet}
          />
        </div>
      </main>
    </div>
  )
}
