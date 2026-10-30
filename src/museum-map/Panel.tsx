import { useId } from 'react'
import type { Lang } from '../content/types'
import { pageHref } from '../site/route'
import { arrivalText, formatDistance, formatMinutes, stepText } from './describe'
import { IconArrow, IconChevron, IconExternal, IconSteps, IconSwap, PlaceIcon } from './icons'
import { MAP, placeById, type Walk } from './mapData'
import { STRINGS } from './strings'
import type { Place, PlaceKind } from './types'

const KIND_ORDER: PlaceKind[] = ['building', 'landmark', 'entrance', 'service', 'parking']
const HEADING_DEGREES = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 } as const

export interface PanelProps {
  lang: Lang
  from: string | null
  to: string | null
  stepFree: boolean
  walk: Walk | null
  selected: string | null
  activeStep: number | null
  sheet: 'peek' | 'open'
  onFrom: (id: string | null) => void
  onTo: (id: string | null) => void
  onSwap: () => void
  onStepFree: (on: boolean) => void
  onSelect: (id: string | null) => void
  onActiveStep: (index: number | null) => void
  onSheet: (state: 'peek' | 'open') => void
}

const name = (lang: Lang) => (id: string) => placeById(id)?.name[lang] ?? id

function PlaceSelect({ lang, label, value, onChange }: { lang: Lang; label: string; value: string | null; onChange: (id: string | null) => void }) {
  const t = STRINGS[lang]
  const id = useId()
  return (
    <div className="mm-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{t.pick}</option>
        {KIND_ORDER.map((kind) => (
          <optgroup key={kind} label={t.kinds[kind]}>
            {MAP.places
              .filter((p) => p.kind === kind)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name[lang]}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

function Planner(p: PanelProps) {
  const t = STRINGS[p.lang]
  const headingId = useId()
  const hintId = useId()
  return (
    <section className="mm-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{t.planner}</h2>
      <div className="mm-fields">
        <PlaceSelect lang={p.lang} label={t.from} value={p.from} onChange={p.onFrom} />
        <button type="button" className="mm-swap" onClick={p.onSwap} aria-label={t.swap} title={t.swap}>
          <IconSwap />
        </button>
        <PlaceSelect lang={p.lang} label={t.to} value={p.to} onChange={p.onTo} />
      </div>
      <label className="mm-check">
        <input type="checkbox" checked={p.stepFree} onChange={(e) => p.onStepFree(e.target.checked)} aria-describedby={hintId} />
        <span className="mm-check__box" aria-hidden="true" />
        <span className="mm-check__text">
          {t.avoidSteps}
          <small id={hintId}>{t.avoidStepsHint}</small>
        </span>
      </label>
    </section>
  )
}

function InsideParts({ lang }: { lang: Lang }) {
  const t = STRINGS[lang]
  const parts = placeById('main-building')?.inside ?? []
  return (
    <div className="mm-inside">
      <h3>{t.inside}</h3>
      <p>{MAP.meta.insideNote[lang]}</p>
      <ul>
        {parts.map((part) => (
          <li key={part.id}>
            <a href={part.source} target="_blank" rel="noopener noreferrer">
              {part.name[lang]}
            </a>
            <span>{part.note[lang]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RouteResult(p: PanelProps) {
  const t = STRINGS[p.lang]
  const headingId = useId()
  const from = placeById(p.from)
  const to = placeById(p.to)
  const nameOf = name(p.lang)
  let body: React.ReactNode
  if (!from || !to) body = <p className="mm-quiet">{t.pickTwo}</p>
  else if (from.id === to.id) body = <p className="mm-quiet">{t.samePlace}</p>
  else if (!p.walk) body = <p className="mm-quiet">{t.noRoute}</p>
  else {
    const w = p.walk
    body = (
      <>
        <p className="mm-summary">{t.summary(formatDistance(w.route.length, p.lang, 'total'), formatMinutes(w.minutes, p.lang))}</p>
        {w.route.length > w.straight * 1.5 && w.route.length - w.straight > 150 ? <p className="mm-note">{t.crow(formatDistance(w.straight, p.lang, 'total'))}</p> : null}
        {w.usesStepsAnyway ? (
          <p className="mm-warning" role="status">
            {t.stepsAnyway}
          </p>
        ) : null}
        <ol className="mm-steps">
          <li className="mm-step mm-step--edge">
            <span className="mm-step__icon" aria-hidden="true">
              <PlaceIcon id={from.id} kind={from.kind} />
            </span>
            <span className="mm-step__text">{t.start(from.name[p.lang])}</span>
          </li>
          {w.steps.map((s, i) => {
            const text = stepText(s, p.lang, nameOf, i > 0)
            const end = i + 1 < w.steps.length ? w.steps[i + 1].from : w.route.nodes.length - 1
            const on = p.activeStep === i
            return (
              <li key={i} className="mm-step">
                <button
                  type="button"
                  className="mm-step__btn"
                  aria-pressed={on}
                  aria-label={`${text.main} ${t.showStep}`}
                  onClick={() => p.onActiveStep(on ? null : i)}
                  data-from={s.from}
                  data-to={end}
                >
                  <span className="mm-step__icon" aria-hidden="true">
                    {s.type === 'steps' ? <IconSteps /> : <span style={{ display: 'inline-flex', transform: `rotate(${HEADING_DEGREES[s.heading]}deg)` }}><IconArrow /></span>}
                  </span>
                  <span className="mm-step__text">
                    <span>{text.main}</span>
                    {text.passes.map((line) => (
                      <span key={line} className="mm-step__pass">
                        {line}
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            )
          })}
          <li className="mm-step mm-step--edge">
            <span className="mm-step__icon" aria-hidden="true">
              <PlaceIcon id={to.id} kind={to.kind} />
            </span>
            <span className="mm-step__text">{arrivalText(p.lang, to.name[p.lang])}</span>
          </li>
        </ol>
        <p className="mm-note">{t.routeNote}</p>
        {to.id === 'main-building' || to.id === 'main-entrance' ? <InsideParts lang={p.lang} /> : null}
      </>
    )
  }
  return (
    <section className="mm-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{t.directions}</h2>
      {body}
    </section>
  )
}

function PlaceCard({ place, ...p }: PanelProps & { place: Place }) {
  const t = STRINGS[p.lang]
  const headingId = useId()
  return (
    <section className="mm-section mm-card" aria-labelledby={headingId}>
      <div className="mm-card__head">
        <span className="mm-card__icon" aria-hidden="true">
          <PlaceIcon id={place.id} kind={place.kind} />
        </span>
        <div>
          <h2 id={headingId}>{place.name[p.lang]}</h2>
          <p className="mm-card__kind">{t.kinds[place.kind]}</p>
        </div>
        <button type="button" className="mm-icon-btn" onClick={() => p.onSelect(null)} aria-label={t.close}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {place.match === 'approximate' ? (
        <p className="mm-tag" title={t.approxLong}>
          <strong>{t.approx}.</strong> {t.approxLong}
        </p>
      ) : null}
      {place.about ? <p>{place.about[p.lang]}</p> : null}
      <div className="mm-card__actions">
        <button type="button" className="mm-btn" onClick={() => p.onFrom(place.id)} disabled={p.from === place.id}>
          {t.fromHere}
        </button>
        <button type="button" className="mm-btn mm-btn--primary" onClick={() => p.onTo(place.id)} disabled={p.to === place.id}>
          {t.toHere}
        </button>
      </div>
      {place.page ? (
        <a className="mm-link" href={place.page} target="_blank" rel="noopener noreferrer">
          {t.official} <IconExternal />
        </a>
      ) : null}
      {place.id === 'main-building' ? <InsideParts lang={p.lang} /> : null}
    </section>
  )
}

function PlaceList(p: PanelProps) {
  const t = STRINGS[p.lang]
  const headingId = useId()
  return (
    <section className="mm-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{t.places}</h2>
      {KIND_ORDER.map((kind) => (
        <div key={kind} className="mm-group">
          <h3>{t.kinds[kind]}</h3>
          <ul>
            {MAP.places
              .filter((pl) => pl.kind === kind)
              .map((pl) => (
                <li key={pl.id}>
                  <button type="button" className="mm-place" aria-current={p.selected === pl.id ? 'true' : undefined} onClick={() => p.onSelect(pl.id)}>
                    <span className="mm-place__icon" aria-hidden="true">
                      <PlaceIcon id={pl.id} kind={pl.kind} />
                    </span>
                    <span>{pl.name[p.lang]}</span>
                    {pl.match === 'approximate' ? <span className="mm-place__tag">{t.approx}</span> : null}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

function About({ lang }: { lang: Lang }) {
  const t = STRINGS[lang]
  const date = MAP.meta.osmSnapshot.slice(0, 10)
  return (
    <details className="mm-section mm-about">
      <summary>{t.aboutHeading}</summary>
      <p>{t.attribution}. {t.dataDate(date)}</p>
      <p>{MAP.meta.insideNote[lang]}</p>
      <p>{t.routeNote}</p>
      <p>{t.heights}</p>
      <ul>
        {MAP.meta.sources.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.name}
            </a>
            {s.licence ? ` · ${s.licence}` : null}
          </li>
        ))}
      </ul>
      <p>{t.notOfficial}</p>
    </details>
  )
}

export function Panel(p: PanelProps) {
  const t = STRINGS[p.lang]
  const from = placeById(p.from)
  const to = placeById(p.to)
  const selected = placeById(p.selected)
  const nameOf = name(p.lang)
  const summaryLine =
    from && to && p.walk && from.id !== to.id
      ? `${nameOf(from.id)} ${p.lang === 'ar' ? '←' : '→'} ${nameOf(to.id)}`
      : from && to && from.id === to.id
        ? t.samePlace
        : t.pickTwo
  const sub = p.walk && from && to && from.id !== to.id ? t.summary(formatDistance(p.walk.route.length, p.lang, 'total'), formatMinutes(p.walk.minutes, p.lang)) : ''
  return (
    <aside className="mm-panel" data-sheet={p.sheet} aria-label={t.planner}>
      <button
        type="button"
        className="mm-sheet__bar"
        aria-expanded={p.sheet === 'open'}
        aria-controls="mm-panel-body"
        onClick={() => p.onSheet(p.sheet === 'open' ? 'peek' : 'open')}
      >
        <span className="mm-sheet__grip" aria-hidden="true" />
        <span className="mm-sheet__line">
          <strong>{summaryLine}</strong>
          {sub ? <span>{sub}</span> : null}
        </span>
        <span className="mm-sheet__toggle">
          {p.sheet === 'open' ? t.hide : t.details}
          <IconChevron up={p.sheet !== 'open'} />
        </span>
      </button>
      <div className="mm-panel__body" id="mm-panel-body">
        {selected ? <PlaceCard {...p} place={selected} /> : null}
        <Planner {...p} />
        <RouteResult {...p} />
        <PlaceList {...p} />
        <About lang={p.lang} />
        <p className="mm-more">
          <a className="mm-link" href={pageHref('lost-tomb', p.lang)}>
            {t.explore}
          </a>
        </p>
      </div>
    </aside>
  )
}
