import { useEffect, useRef } from 'react'
import gsap from 'gsap'

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
