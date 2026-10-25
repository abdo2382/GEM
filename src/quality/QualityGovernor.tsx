import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useJourney } from '../state/store'
import { createGovernor, stepGovernor, type GovernorState } from './adaptiveQuality'
import { recordFrame } from './perfStats'

/** Seconds after Start before frames count: the opening reveal is not steady speed. */
const SETTLE = 4

/**
 * Feeds real frame times to the governor while Auto is on, and applies its tier
 * changes. Lives inside the Canvas so it measures exactly the frames the scene draws.
 */
export function QualityGovernor() {
  const governor = useRef<GovernorState | null>(null)
  const startedAt = useRef(-1)
  const pref = useJourney((s) => s.qualityPref)
  // A new choice in the settings starts a fresh watch from the tier it set.
  useEffect(() => {
    governor.current = null
  }, [pref])

  useFrame((state, delta) => {
    const ms = delta * 1000
    recordFrame(ms)
    const s = useJourney.getState()
    if (s.qualityPref !== 'auto' || !s.started || document.hidden) return
    const now = state.clock.elapsedTime
    if (startedAt.current < 0) startedAt.current = now
    if (now - startedAt.current < SETTLE) return
    // Another part of the app may have changed the tier (a restored WebGL context).
    if (governor.current && governor.current.tier !== s.quality) governor.current = null
    governor.current ??= createGovernor(s.quality, 'high')
    const next = stepGovernor(governor.current, ms, now)
    if (next) s.setQuality(next)
  })
  return null
}
