import { useEffect, useId } from 'react'
import { HOME_MAP } from './homeMap'
import { setLang, useLang } from './lang'
import { pageHref } from './route'
import { HOME_STRINGS } from './strings'
import './home.css'

/** The museum map's door shows the map itself: the real outlines and one real walk, drawn when the page opens. */
function MapArt() {
  const m = HOME_MAP
  return (
    <svg className="home-map" viewBox={m.viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <path className="home-map__greens" d={m.greens} />
      <path className="home-map__buildings" d={m.buildings} />
      <path className="home-map__walls" d={m.walls} />
      <path className="home-map__places" d={m.places} />
      <path className="home-map__main" d={m.main} />
      <path className="home-map__halo" d={m.route} />
      <path className="home-map__route" d={m.route} pathLength={1} />
      {m.dots.map(([x, y]) => (
        <circle key={`${x},${y}`} className="home-map__dot" cx={x} cy={y} r={8} />
      ))}
    </svg>
  )
}

const Chevron = () => (
  <svg className="door__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 5l7 7-7 7" />
  </svg>
)

export function Home() {
  const lang = useLang()
  const t = HOME_STRINGS[lang]
  const mapId = useId()
  const tombId = useId()
  useEffect(() => {
    document.title = t.docTitle
  }, [t])

  return (
    <div className="home" lang={lang}>
      <header className="home__top">
        <span className="home__brand">{t.brand}</span>
        <button type="button" className="site-chip" lang={lang === 'en' ? 'ar' : 'en'} onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
          {t.switchLang}
        </button>
      </header>

      <main className="home__main">
        <h1>{t.headline}</h1>
        <p className="home__lede">{t.lede}</p>

        <div className="home__doors">
          <a className="door door--map" href={pageHref('museum-map', lang)} aria-labelledby={`${mapId}-t`} aria-describedby={`${mapId}-d`}>
            <div className="door__view" title={t.mapPicture}>
              <MapArt />
            </div>
            <div className="door__text">
              <h2 id={`${mapId}-t`}>{t.map.title}</h2>
              <p id={`${mapId}-d`}>{t.map.text}</p>
              <span className="door__go" aria-hidden="true">
                {t.map.go}
                <Chevron />
              </span>
            </div>
          </a>

          <a className="door door--tomb" href={pageHref('lost-tomb', lang)} aria-labelledby={`${tombId}-t`} aria-describedby={`${tombId}-d`}>
            <div className="door__view">
              <img
                src="/home/mask.webp"
                srcSet="/home/mask-small.webp 480w, /home/mask.webp 800w"
                sizes="(max-width: 760px) 92vw, 46vw"
                width={800}
                height={1000}
                alt=""
                decoding="async"
              />
              <span className="door__credit">{t.reconstruction}</span>
            </div>
            <div className="door__text">
              <h2 id={`${tombId}-t`}>{t.tomb.title}</h2>
              <p id={`${tombId}-d`}>{t.tomb.text}</p>
              <span className="door__go" aria-hidden="true">
                {t.tomb.go}
                <Chevron />
              </span>
            </div>
          </a>
        </div>
      </main>

      <footer className="home__foot">
        <span>{t.notOfficial}</span>
        <a href={t.osmLink} target="_blank" rel="noopener noreferrer">
          {t.osm}
        </a>
      </footer>
    </div>
  )
}
