import type Lenis from 'lenis'
import { CHAPTERS } from '../content/chapters'
import { ANCHORS } from '../state/scroll'
import { useJourney } from '../state/store'

/* Imperative scroll controls shared by the UI (chapter jumps, Inspect pausing). */

let lenis: Lenis | null = null

export function setLenis(l: Lenis | null) {
  lenis = l
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function maxScroll() {
  return lenis ? lenis.limit : document.documentElement.scrollHeight - window.innerHeight
}

export function scrollToChapter(index: number, opts: { immediate?: boolean } = {}) {
  const i = Math.max(0, Math.min(CHAPTERS.length - 1, index))
  const target = ANCHORS[i] * maxScroll()
  const reduced = useJourney.getState().reducedMotion
  const immediate = opts.immediate || reduced
  if (lenis) {
    lenis.scrollTo(target, { duration: immediate ? 0 : 1.9, immediate, easing: easeInOutCubic, force: true })
  } else {
    window.scrollTo({ top: target, behavior: immediate ? 'auto' : 'smooth' })
  }
}

export function pauseScroll() {
  lenis?.stop()
  document.documentElement.classList.add('scroll-locked')
}

export function resumeScroll() {
  document.documentElement.classList.remove('scroll-locked')
  lenis?.start()
}

