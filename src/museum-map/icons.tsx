import type { PlaceKind } from './types.ts'

const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const IconHome = () => (
  <svg {...base} aria-hidden="true">
    <path d="M4 11l8-6.5 8 6.5M6.5 9.5V19h11V9.5M10 19v-5h4v5" />
  </svg>
)
export const IconSwap = () => (
  <svg {...base} aria-hidden="true">
    <path d="M7 4v14M3.5 14.5L7 18l3.5-3.5M17 20V6M13.5 9.5L17 6l3.5 3.5" />
  </svg>
)
export const IconFit = () => (
  <svg {...base} aria-hidden="true">
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
)
export const IconChevron = ({ up }: { up?: boolean }) => (
  <svg {...base} aria-hidden="true">
    <path d={up ? 'M6 14l6-6 6 6' : 'M6 10l6 6 6-6'} />
  </svg>
)
export const IconExternal = () => (
  <svg {...base} width={16} height={16} aria-hidden="true">
    <path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />
  </svg>
)
export const IconSteps = () => (
  <svg {...base} aria-hidden="true">
    <path d="M4 19h4v-4h4v-4h4V7h4" />
  </svg>
)
export const IconWalk = () => (
  <svg {...base} aria-hidden="true">
    <circle cx="13" cy="4.5" r="1.8" />
    <path d="M9.5 21l2-6-2-3 1.5-4 3 1.5 2.5 3M13 11l-1 4 3 2v4" />
  </svg>
)
/** An arrow that points up the screen; rotate it to a heading. */
export const IconArrow = () => (
  <svg {...base} aria-hidden="true">
    <path d="M12 19V5M6.5 10.5L12 5l5.5 5.5" />
  </svg>
)

// Place symbols, drawn to sit inside a 28 px disc at 16 px.
const glyph = (children: React.ReactNode) => (
  <svg {...base} width={16} height={16} aria-hidden="true">
    {children}
  </svg>
)

const BY_ID: Record<string, React.ReactNode> = {
  'main-building': glyph(<path d="M3 9.5L12 4l9 5.5M5.5 10.5v7M9.8 10.5v7M14.2 10.5v7M18.5 10.5v7M3 20h18" />),
  'main-entrance': glyph(<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />),
  'ticketing-entrance': glyph(<path d="M4 8.5h16v2a2 2 0 000 4v2H4v-2a2 2 0 000-4v-2zM14 8.5v8" />),
  'hanging-obelisk': glyph(<path d="M12 3l2.4 4.4L14 17h-4l-.4-9.6L12 3zM7.5 21h9M9 17v4M15 17v4" />),
  toilets: glyph(<path d="M9 4.5a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8zM9 9v11M6.5 20v-7.5L5.5 10.5M11.5 20v-7.5l1-2M16 4.5v15.5M14 11.5h4" />),
  lockers: glyph(<path d="M5 4h14v16H5zM12 4v16M9 11h.01M15 11h.01" />),
  atm: glyph(<path d="M3.5 7h17v10h-17zM3.5 11h17M7 14.5h3" />),
  'drinking-water': glyph(<path d="M12 3.5C9 8 6.5 10.8 6.5 14a5.5 5.5 0 0011 0c0-3.2-2.5-6-5.5-10.5z" />),
  'car-park-entrance': glyph(
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M10 17V8h3a2.5 2.5 0 010 5h-3" />
    </>,
  ),
  'khufu-boats-museum': glyph(<path d="M2.5 13c3.5 3.5 15.5 3.5 19 0M7 12V9h10v3M12 9V5.5" />),
  'conservation-centre': glyph(<path d="M9 3h6M10 3v6l-5 9.2a1.5 1.5 0 001.3 2.3h11.4a1.5 1.5 0 001.3-2.3L14 9V3" />),
}
const BY_KIND: Record<PlaceKind, React.ReactNode> = {
  building: BY_ID['main-building'],
  landmark: BY_ID['hanging-obelisk'],
  entrance: BY_ID['main-entrance'],
  service: glyph(<circle cx="12" cy="12" r="3" />),
  parking: BY_ID['car-park-entrance'],
}

export const PlaceIcon = ({ id, kind }: { id: string; kind: PlaceKind }) => <>{BY_ID[id] ?? BY_KIND[kind]}</>
