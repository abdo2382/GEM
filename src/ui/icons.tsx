import type { TreasureId } from '../content/types'

const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const IconClose = () => (
  <svg {...base} aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const IconPlus = () => (
  <svg {...base} aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconMinus = () => (
  <svg {...base} aria-hidden="true">
    <path d="M5 12h14" />
  </svg>
)
export const IconInfo = () => (
  <svg {...base} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.5" />
  </svg>
)
export const IconSound = ({ on }: { on: boolean }) => (
  <svg {...base} aria-hidden="true">
    <path d="M4 10v4h4l5 4V6L8 10H4z" />
    {on ? <path d="M16 9.5a4 4 0 010 5M18.5 7a7.5 7.5 0 010 10" /> : <path d="M17 10l4 4M21 10l-4 4" />}
  </svg>
)
export const IconRotate = () => (
  <svg {...base} aria-hidden="true">
    <path d="M20 12a8 8 0 11-2.3-5.6M20 4v5h-5" />
  </svg>
)
export const IconDownload = () => (
  <svg {...base} aria-hidden="true">
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
)
export const IconEye = () => (
  <svg {...base} aria-hidden="true">
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
)

/** Cartouche-shaped seal used for the Discovery Trail. */
export const IconCartouche = ({ filled = false }: { filled?: boolean }) => (
  <svg {...base} aria-hidden="true">
    <rect x="7" y="3" width="10" height="16" rx="5" fill={filled ? 'currentColor' : 'none'} />
    <path d="M6 21h12" />
  </svg>
)

/** Ankh — used as the emblem of the experience. */
export const IconAnkh = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
    <ellipse cx="12" cy="6.5" rx="3.4" ry="4" />
    <path d="M12 10.5V22M6 12.5h12" />
  </svg>
)

/** Simple line emblems for each artifact (cards, trail, share image). */
export function ArtifactEmblem({ id, size = 44 }: { id: TreasureId; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
  if (id === 'mask')
    return (
      <svg {...common} aria-hidden="true">
        <path d="M16 8h16l3 6 7 20H6l7-20z" />
        <path d="M18 14h12v12c0 4-3 7-6 7s-6-3-6-7z" />
        <path d="M24 33v9M21 4l3 4 3-4M10 26h6M32 26h6M8 32h8M32 32h8" />
      </svg>
    )
  if (id === 'anubis')
    return (
      <svg {...common} aria-hidden="true">
        <path d="M8 30h32l-2 8H10z" />
        <path d="M12 30c0-4 3-6 8-6h6l4-6 2-8 2 7 1-7 2 9-1 5 4 2-6 1-3 3v6" />
        <path d="M6 41h36" />
      </svg>
    )
  if (id === 'throne')
    return (
      <svg {...common} aria-hidden="true">
        <path d="M14 8h20v18H14z" />
        <path d="M12 26h24v4H12zM14 30v10M34 30v10M14 40h-3M34 40h3" />
        <circle cx="24" cy="14" r="3" />
      </svg>
    )
  return (
    <svg {...common} aria-hidden="true">
      <path d="M8 10h32M10 10v28M38 10v28M7 38h34" />
      <path d="M16 18h16v20H16zM15 18l1-3h16l1 3" />
      <path d="M8 7l2 3M14 7l1 3M20 7v3M28 7v3M34 7l-1 3M40 7l-2 3" />
    </svg>
  )
}
