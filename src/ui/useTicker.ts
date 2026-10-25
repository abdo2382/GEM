import { useEffect, useRef } from 'react'
import gsap from 'gsap'

const written = new WeakMap<HTMLElement, Record<string, string>>()

/**
 * Per-frame style writes go through here: a write is skipped when the value hasn't
 * changed, so a still page costs the browser no style work at all.
 */
export function setStyle(el: HTMLElement, prop: 'opacity' | 'transform' | 'visibility' | 'pointerEvents', value: string) {
  let last = written.get(el)
  if (!last) written.set(el, (last = {}))
  if (last[prop] === value) return
  last[prop] = value
  el.style[prop] = value
}

/** Run `fn` on every GSAP tick (shared with Lenis) for imperative per-frame DOM updates. */
export function useTicker(fn: () => void) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const tick = () => ref.current()
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])
}
