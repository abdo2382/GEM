import { photoById, photoCredit } from '../content/archive'
import { useT } from '../i18n/useT'

/**
 * An original excavation photograph, set like a print laid on the page, with its
 * caption and a credit that names it as a photograph (never a reconstruction).
 */
export function ArchivePhoto({ id, className = '' }: { id: string; className?: string }) {
  const { t, lang } = useT()
  const p = photoById(id)
  if (!p) return null
  return (
    <figure className={`archive ${className}`}>
      <div className="archive__print">
        <div className="archive__crop">
          <img src={p.file} width={p.width} height={p.height} alt={p.caption[lang]} loading="lazy" decoding="async" />
        </div>
      </div>
      <figcaption>
        <span className="archive__caption">{p.caption[lang]}</span>
        <span className="archive__credit">
          {photoCredit(p, lang, t.archivalPhoto, t.publicDomain)}{' '}
          <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
            {t.source}
          </a>
        </span>
      </figcaption>
    </figure>
  )
}
