import { useRef } from 'react'
import { useJourney } from '../state/store'
import { locate, scrollState, smoothstep } from '../state/scroll'
import { useTicker } from './useTicker'

/**
 * Cinema bars that close in while the visitor travels between chapters and open
 * again on arrival. Tied to the scroll position itself, so they never lag the hand.
 */
export function Letterbox() {
  const top = useRef<HTMLElement>(null)
  const bottom = useRef<HTMLElement>(null)
  useTicker(() => {
    const { t } = locate(scrollState.progress)
    const s = useJourney.getState()
    const k = s.reducedMotion || s.inspect || !s.started ? 0 : smoothstep(0.06, 0.34, Math.min(t, 1 - t))
    const v = `scaleY(${k.toFixed(3)})`
    if (top.current) top.current.style.transform = v
    if (bottom.current) bottom.current.style.transform = v
  })
  return (
    <div className="letterbox" aria-hidden="true">
      <i ref={top} className="letterbox__bar letterbox__bar--top" />
      <i ref={bottom} className="letterbox__bar letterbox__bar--bottom" />
    </div>
  )
}
