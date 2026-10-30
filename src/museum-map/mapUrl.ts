/** What the address bar says about the map: a walk can be shared as a link. */
export interface MapUrlState {
  from: string | null
  to: string | null
  stepFree: boolean
  view: 'plan' | '3d'
}

const KEYS = ['from', 'to', 'free', 'view']

/** Reads a link. Places that do not exist are ignored. */
export function parseMapUrl(search: string, validIds: ReadonlySet<string>): MapUrlState {
  const p = new URLSearchParams(search)
  const place = (key: string) => {
    const id = p.get(key)
    return id && validIds.has(id) ? id : null
  }
  return { from: place('from'), to: place('to'), stepFree: p.get('free') === '1', view: p.get('view') === '3d' ? '3d' : 'plan' }
}

/** The query string for a state, keeping any other parameters (the language, for one). */
export function mapSearch(state: MapUrlState, current: string): string {
  const p = new URLSearchParams(current)
  for (const key of KEYS) p.delete(key)
  if (state.from) p.set('from', state.from)
  if (state.to) p.set('to', state.to)
  if (state.stepFree) p.set('free', '1')
  if (state.view === '3d') p.set('view', '3d')
  const text = p.toString()
  return text ? `?${text}` : ''
}
