import { initialTier, type QualityPref, type Tier } from '../quality/adaptiveQuality'

export type Quality = Tier
const QUALITY_KEY = 'lost-tomb.quality'

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function hasWebGL(): boolean {
  if (new URLSearchParams(location.search).has('nowebgl')) return false
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}

export function isTouchDevice(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}

/** What the browser says about this device: only a starting point for Auto. */
export function deviceHints() {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean }; userAgentData?: { mobile?: boolean } }
  return {
    touch: isTouchDevice(),
    mobile: nav.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent),
    cores: nav.hardwareConcurrency,
    memory: nav.deviceMemory,
    saveData: nav.connection?.saveData === true,
  }
}

/** The visitor's setting: Auto (adaptive) or a fixed tier. `?quality=` overrides it for testing. */
export function loadQualityPref(): QualityPref {
  const param = new URLSearchParams(location.search).get('quality')
  if (param === 'auto' || param === 'low' || param === 'medium' || param === 'high') return param
  const saved = safeGet(QUALITY_KEY)
  return saved === 'low' || saved === 'medium' || saved === 'high' ? saved : 'auto'
}

export function saveQualityPref(pref: QualityPref) {
  safeSet(QUALITY_KEY, pref)
}

/** The tier to start with: the visitor's fixed choice, or a cautious guess for Auto. */
export function detectQuality(pref: QualityPref = loadQualityPref()): Quality {
  return pref === 'auto' ? initialTier(deviceHints()) : pref
}

export function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable (private mode, blocked) — the trail still works for this visit */
  }
}
