import { useEffect, useRef } from 'react'
import { useJourney } from '../state/store'
import { readStats } from '../quality/perfStats'

/**
 * `?perf`: a small readout of frame rate, the slowest frames, the quality tier and the
 * real rendering resolution, for checking the site on a phone without remote debugging.
 */
export function PerfHud() {
  const el = useRef<HTMLPreElement>(null)
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!el.current) return
      const { fps, p95 } = readStats()
      const s = useJourney.getState()
      const canvas = document.querySelector<HTMLCanvasElement>('.stage canvas')
      el.current.textContent = [
        `${fps.toFixed(0)} fps · p95 ${p95.toFixed(0)} ms`,
        `${s.qualityPref === 'auto' ? 'auto: ' : ''}${s.quality}`,
        canvas ? `${canvas.width}×${canvas.height}px` : 'no canvas',
      ].join('\n')
    }, 500)
    return () => window.clearInterval(id)
  }, [])
  return <pre ref={el} className="perf-hud" aria-hidden="true" />
}
