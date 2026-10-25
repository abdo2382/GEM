/*
 * Adaptive quality: three presets, a cautious first guess from the device, and a
 * governor that watches real frame times and steps the preset down when the device
 * struggles (and, much more slowly, back up when it copes). Kept free of imports so
 * it can be unit tested in Node; the scene wiring lives in QualityGovernor.tsx.
 *
 * Only secondary effects change between tiers. The mask, the treasures, the story and
 * the scroll choreography are the same at every tier.
 */

export type Tier = 'low' | 'medium' | 'high'
export type QualityPref = 'auto' | Tier
export const TIERS: readonly Tier[] = ['low', 'medium', 'high']

export interface Preset {
  /** Cap on the device pixel ratio the scene renders at. */
  maxDpr: number
  /** Post-processing: none, a light grade (bloom at reduced resolution, vignette), or the full grade. */
  postfx: 'off' | 'lite' | 'full'
  /** Multisampling for the full grade's render target. */
  msaa: number
  /** Dust motes in the air. */
  dust: number
  /** Noise layers in the backdrop's stone (the most expensive per-pixel work). */
  backdropOctaves: number
  /** Resolution of the painted chamber backdrops, as a fraction of 2048×1024. */
  sceneTextureScale: number
  /** Frosted glass behind panels and buttons (re-blurs the moving scene every frame). */
  uiBlur: boolean
  /** Blur in the papyrus ink-in (a filter on every word). */
  wordBlur: boolean
}

export const PRESETS: Record<Tier, Preset> = {
  low: { maxDpr: 1, postfx: 'off', msaa: 0, dust: 350, backdropOctaves: 3, sceneTextureScale: 0.5, uiBlur: false, wordBlur: false },
  medium: { maxDpr: 1.35, postfx: 'lite', msaa: 0, dust: 800, backdropOctaves: 4, sceneTextureScale: 0.75, uiBlur: false, wordBlur: false },
  // The approved desktop look, unchanged.
  high: { maxDpr: 1.75, postfx: 'full', msaa: 4, dust: 1600, backdropOctaves: 5, sceneTextureScale: 1, uiBlur: true, wordBlur: true },
}

export interface DeviceHints {
  /** A coarse primary pointer (a finger). */
  touch: boolean
  /** The browser says it is a phone or tablet. */
  mobile: boolean
  cores?: number
  /** navigator.deviceMemory, in GB (Chrome reports 0.25–8). */
  memory?: number
  /** The visitor asked the browser to save data. */
  saveData?: boolean
}

/**
 * A first guess only; the governor corrects it from measured frame times. Phones and
 * tablets start on medium however strong they claim to be, because a GPU's name says
 * little about how warm it runs after a minute of 3D.
 */
export function initialTier(h: DeviceHints): Tier {
  const cores = h.cores ?? 4
  const memory = h.memory ?? 4
  if (h.saveData) return 'low'
  if (h.touch || h.mobile) return memory <= 2 || cores <= 4 ? 'low' : 'medium'
  return memory <= 2 ? 'medium' : 'high'
}

/** Thresholds, in milliseconds per frame and seconds. */
export const GOVERNOR = {
  /** Frames in the rolling window. */
  window: 90,
  /** Frames needed before judging. */
  minSamples: 30,
  /** A frame longer than this is a one-off stall (tab switch, loading), not steady speed. */
  hitchMs: 250,
  /** Step down when the median frame is slower than this (about 36 fps)... */
  downMs: 28,
  /** ...for this long. */
  downAfter: 2.5,
  /** Step up only when 90% of frames are faster than this (about 55 fps)... */
  upMs: 18,
  /** ...for this long. */
  upAfter: 15,
  /** No judgement for this long after any change: let the new tier settle. */
  cooldown: 8,
  /** Don't climb back to a tier left less than this long ago. */
  retryAfter: 45,
  /** Leaving a tier this many times rules it out for the rest of the visit. */
  maxDrops: 2,
}

export interface GovernorState {
  tier: Tier
  ceiling: Tier
  samples: number[]
  badSince: number | null
  goodSince: number | null
  lastChange: number
  leftAt: Partial<Record<Tier, number>>
  drops: Partial<Record<Tier, number>>
}

export function createGovernor(tier: Tier, ceiling: Tier): GovernorState {
  return { tier, ceiling, samples: [], badSince: null, goodSince: null, lastChange: -Infinity, leftAt: {}, drops: {} }
}

function percentile(values: number[], p: number) {
  const sorted = values.slice().sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
}

function change(s: GovernorState, to: Tier, now: number): Tier {
  if (TIERS.indexOf(to) < TIERS.indexOf(s.tier)) {
    s.drops[s.tier] = (s.drops[s.tier] ?? 0) + 1
    s.leftAt[s.tier] = now
  }
  s.tier = to
  s.samples = []
  s.badSince = null
  s.goodSince = null
  s.lastChange = now
  return to
}

/**
 * Record one frame (`ms` long, ending at `now` seconds) and return the new tier when it
 * changes, otherwise null. Mutates `s`.
 */
export function stepGovernor(s: GovernorState, ms: number, now: number): Tier | null {
  const G = GOVERNOR
  if (ms > G.hitchMs) return null
  s.samples.push(ms)
  if (s.samples.length > G.window) s.samples.shift()
  if (now - s.lastChange < G.cooldown) {
    s.badSince = null
    s.goodSince = null
    return null
  }
  if (s.samples.length < G.minSamples) return null

  const index = TIERS.indexOf(s.tier)
  if (index > 0 && percentile(s.samples, 0.5) > G.downMs) {
    s.goodSince = null
    s.badSince ??= now
    return now - s.badSince >= G.downAfter ? change(s, TIERS[index - 1], now) : null
  }
  s.badSince = null

  if (index < TIERS.indexOf(s.ceiling) && percentile(s.samples, 0.9) < G.upMs) {
    const up = TIERS[index + 1]
    const left = s.leftAt[up]
    const ruledOut = (s.drops[up] ?? 0) >= G.maxDrops
    const tooSoon = left !== undefined && now - left < G.retryAfter
    if (ruledOut || tooSoon) {
      s.goodSince = null
      return null
    }
    s.goodSince ??= now
    return now - s.goodSince >= G.upAfter ? change(s, up, now) : null
  }
  s.goodSince = null
  return null
}
