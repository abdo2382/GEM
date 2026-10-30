import { useEffect, useSyncExternalStore } from 'react'
import type { Lang } from '../content/types'
import { safeGet, safeSet } from '../utils/device'

/** Same key and rules as the experience's store (state/store.ts), so a visitor's choice follows them. */
export const LANG_KEY = 'lost-tomb.lang'

export function loadLang(): Lang {
  const param = new URLSearchParams(location.search).get('lang')
  if (param === 'ar' || param === 'en') return param
  const saved = safeGet(LANG_KEY)
  if (saved === 'ar' || saved === 'en') return saved
  return navigator.language?.startsWith('ar') ? 'ar' : 'en'
}

let current: Lang | null = null
const listeners = new Set<() => void>()

function snapshot(): Lang {
  return (current ??= loadLang())
}

export function setLang(lang: Lang) {
  safeSet(LANG_KEY, lang)
  current = lang
  listeners.forEach((fn) => fn())
}

/** The visitor's language, shared by everything on the page. Also keeps <html lang dir> in step. */
export function useLang(): Lang {
  const lang = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    snapshot,
    snapshot,
  )
  useEffect(() => {
    const html = document.documentElement
    html.lang = lang
    html.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])
  return lang
}
