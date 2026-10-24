import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CHAPTERS } from '../content/chapters'
import { ANCHORS, HOLD, TOTAL_WEIGHT, chapterFromProgress, inspectState, locate, scrollState } from '../state/scroll'
import { useJourney } from '../state/store'
import { useT } from '../i18n/useT'
import { easeInOutCubic, scrollToChapter, setLenis } from './controls'

gsap.registerPlugin(ScrollTrigger)

/**
 * Owns the one scroll timeline: Lenis smooths the input, ScrollTrigger maps it to
 * 0..1 progress, and a directional snap carries the visitor to the next chapter's
 * resting point so nobody gets stranded mid-transition.
 */
export function ScrollDriver() {
  const spacer = useRef<HTMLDivElement>(null)
  const started = useJourney((s) => s.started)
  const reducedMotion = useJourney((s) => s.reducedMotion)
  const { t } = useT()

  useEffect(() => {
    if (!started) {
      document.documentElement.classList.add('scroll-locked')
      return
    }
    document.documentElement.classList.remove('scroll-locked')
    window.scrollTo(0, 0)

    const lenis = new Lenis({
      lerp: reducedMotion ? 1 : 0.075,
      smoothWheel: !reducedMotion,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.4,
    })
    setLenis(lenis)
    lenis.scrollTo(0, { immediate: true, force: true })
    if (import.meta.env.DEV) {
      ;(window as unknown as { __lt: unknown }).__lt = { lenis, scrollToChapter, store: useJourney, inspectState }
    }

    let snapping = false
    let idle: ReturnType<typeof setTimeout> | undefined
    let direction = 1

    const trySnap = () => {
      const state = useJourney.getState()
      if (state.inspect) return
      const { i, j, t } = locate(scrollState.progress)
      let target = -1
      if (direction > 0 && t > HOLD + 0.03 && t < 1 - HOLD * 0.5) target = j
      else if (direction < 0 && t < 1 - HOLD - 0.03 && t > HOLD * 0.5) target = i
      if (target < 0) return
      snapping = true
      lenis.scrollTo(ANCHORS[target] * lenis.limit, {
        duration: reducedMotion ? 0 : 1.5,
        immediate: reducedMotion,
        easing: easeInOutCubic,
        onComplete: () => {
          snapping = false
        },
      })
      // A user scroll during the snap interrupts it; never leave the flag stuck.
      setTimeout(() => (snapping = false), 1800)
    }

    lenis.on('scroll', (l: Lenis) => {
      ScrollTrigger.update()
      if (l.direction) direction = l.direction
      if (snapping) return
      clearTimeout(idle)
      idle = setTimeout(trySnap, 240)
    })

    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const trigger = ScrollTrigger.create({
      trigger: spacer.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        scrollState.progress = self.progress
        scrollState.velocity = self.getVelocity() / 1000
        useJourney.getState().setChapter(chapterFromProgress(self.progress))
      },
    })

    const onKey = (e: KeyboardEvent) => {
      const state = useJourney.getState()
      const target = e.target as HTMLElement
      if (state.inspect || state.trailOpen || state.creditsOpen) return
      if (target.closest('input, textarea, [contenteditable], button, a, [role="slider"]') && e.key === ' ') return
      if (target.closest('input, textarea')) return
      const p = scrollState.progress
      const next = ANCHORS.findIndex((a) => a > p + 0.002)
      const prev = [...ANCHORS].reverse().findIndex((a) => a < p - 0.002)
      const prevIndex = prev < 0 ? 0 : ANCHORS.length - 1 - prev
      let go = -1
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) go = next < 0 ? ANCHORS.length - 1 : next
      else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) go = prevIndex
      else if (e.key === 'Home') go = 0
      else if (e.key === 'End') go = ANCHORS.length - 1
      if (go >= 0) {
        e.preventDefault()
        scrollToChapter(go)
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(idle)
      trigger.kill()
      gsap.ticker.remove(tick)
      lenis.destroy()
      setLenis(null)
    }
  }, [started, reducedMotion])

  return (
    <div ref={spacer} className="scroll-spacer" style={{ height: `${(TOTAL_WEIGHT + 1) * 100}vh` }} aria-hidden="true">
      {CHAPTERS.map((c, i) => (
        <section key={c.id} className="scroll-section" style={{ height: `${c.weight * 100}vh` }} data-chapter={c.id}>
          <span className="sr-only">{t.chapters[i]}</span>
        </section>
      ))}
    </div>
  )
}
