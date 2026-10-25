import { CHAPTERS } from '../content/chapters'
import { useT } from '../i18n/useT'
import { ArtifactEmblem } from './icons'
import { TrailButton } from './ArtifactCaption'
import { useJourney } from '../state/store'

/** Story edition for devices without WebGL: the same narrative and trail, no 3D. */
export function StaticFallback() {
  const { t, story, artifacts, lang } = useT()
  return (
    <main className="fallback">
      <header className="fallback__hero">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
        <p className="fallback__note">{t.noWebgl}</p>
        <button className="chip" onClick={() => useJourney.getState().setLang(lang === 'en' ? 'ar' : 'en')}>
          {t.language}
        </button>
      </header>
      {CHAPTERS.map((c) => {
        const s = story[c.id]
        return (
          <section key={c.id} className="fallback__chapter">
            <p className="papyrus__kicker">{s.kicker}</p>
            <h2>{s.title}</h2>
            {[...s.paragraphs, ...s.more].map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {c.artifact ? (
              <div className="fallback__artifact">
                <ArtifactEmblem id={c.artifact} size={56} />
                <div>
                  <h3>{artifacts[c.artifact].name}</h3>
                  <p>{artifacts[c.artifact].long}</p>
                  <TrailButton id={c.artifact} />
                </div>
              </div>
            ) : null}
          </section>
        )
      })}
    </main>
  )
}
