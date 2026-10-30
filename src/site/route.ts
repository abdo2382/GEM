import type { Lang } from '../content/types.ts'

/**
 * The site has three pages: the homepage, the museum map and the experience. Each is its
 * own page load, so the experience's styles, audio and scroll handling never leak into the
 * other two, and the homepage stays small. Links between them are plain links.
 */
export type Page = 'home' | 'lost-tomb' | 'museum-map'

export const PAGE_PATH: Record<Page, string> = {
  home: '/',
  'lost-tomb': '/lost-tomb',
  'museum-map': '/museum-map',
}

/**
 * Parameters only the experience understands (see README). The experience used to live at
 * the root, so an old link carrying one of these still opens it, at its new address.
 * `lang` is shared by all three pages and is not listed.
 */
export const EXPERIENCE_PARAMS = ['autostart', 'studio', 'perf', 'quality', 'nowebgl', 'photo'] as const

export type Resolved = { page: Page } | { redirect: string }

export function resolvePage(pathname: string, search: string): Resolved {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/'
  if (path === '/' || path === '/index.html') {
    const params = new URLSearchParams(search)
    if (EXPERIENCE_PARAMS.some((name) => params.has(name))) return { redirect: PAGE_PATH['lost-tomb'] + search }
    return { page: 'home' }
  }
  const page = (Object.keys(PAGE_PATH) as Page[]).find((p) => PAGE_PATH[p] === path)
  return page ? { page } : { redirect: '/' }
}

/** The address of a page, carrying the visitor's language so the next page opens in it. */
export function pageHref(page: Page, lang: Lang): string {
  return `${PAGE_PATH[page]}?lang=${lang}`
}
