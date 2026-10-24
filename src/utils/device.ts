export type Quality = 'high' | 'low'

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

export function detectQuality(): Quality {
  const param = new URLSearchParams(location.search).get('quality')
  if (param === 'low' || param === 'high') return param
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 8
  if (memory < 4 || cores <= 2) return 'low'
  if (isTouchDevice() && cores <= 4) return 'low'
  return 'high'
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
