import { create } from 'zustand'
import type { Lang, TreasureId } from '../content/types'
import { TREASURE_IDS } from '../content/artifacts'
import { detectQuality, loadQualityPref, prefersReducedMotion, safeGet, safeSet, saveQualityPref, type Quality } from '../utils/device'
import type { QualityPref } from '../quality/adaptiveQuality'

const TRAIL_KEY = 'lost-tomb.trail'
const LANG_KEY = 'lost-tomb.lang'

function loadTrail(): TreasureId[] {
  try {
    const raw = JSON.parse(safeGet(TRAIL_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((id): id is TreasureId => TREASURE_IDS.includes(id)) : []
  } catch {
    return []
  }
}

const QUALITY_PREF = loadQualityPref()
const START_TIER = detectQuality(QUALITY_PREF)

function loadLang(): Lang {
  const param = new URLSearchParams(location.search).get('lang')
  if (param === 'ar' || param === 'en') return param
  const saved = safeGet(LANG_KEY)
  if (saved === 'ar' || saved === 'en') return saved
  return navigator.language?.startsWith('ar') ? 'ar' : 'en'
}

interface JourneyState {
  lang: Lang
  setLang: (lang: Lang) => void
  ready: boolean
  setReady: () => void
  started: boolean
  start: () => void
  chapter: number
  setChapter: (i: number) => void
  inspect: TreasureId | null
  openInspect: (id: TreasureId) => void
  closeInspect: () => void
  hotspot: string | null
  setHotspot: (id: string | null) => void
  trail: TreasureId[]
  toggleTrail: (id: TreasureId) => void
  trailOpen: boolean
  setTrailOpen: (open: boolean) => void
  creditsOpen: boolean
  setCreditsOpen: (open: boolean) => void
  sound: boolean
  setSound: (on: boolean) => void
  /** The quality tier in effect (Auto's governor or the visitor's choice). */
  quality: Quality
  /** The visitor's setting: Auto, or a fixed tier. */
  qualityPref: QualityPref
  /** The tier the painted backdrops were drawn for. It follows only the visitor's own
      choices, so Auto never stops the story to repaint them. */
  detail: Quality
  setQuality: (quality: Quality) => void
  setQualityPref: (pref: QualityPref) => void
  contextLost: boolean
  setContextLost: (lost: boolean) => void
  reducedMotion: boolean
}

export const useJourney = create<JourneyState>((set, get) => ({
  lang: loadLang(),
  setLang: (lang) => {
    safeSet(LANG_KEY, lang)
    set({ lang })
  },
  ready: false,
  setReady: () => set({ ready: true }),
  started: false,
  start: () => set({ started: true }),
  chapter: 0,
  setChapter: (chapter) => {
    if (get().chapter !== chapter) set({ chapter })
  },
  inspect: null,
  openInspect: (inspect) => set({ inspect, hotspot: null, trailOpen: false }),
  closeInspect: () => set({ inspect: null, hotspot: null }),
  hotspot: null,
  setHotspot: (hotspot) => set({ hotspot }),
  trail: loadTrail(),
  toggleTrail: (id) => {
    const trail = get().trail.includes(id) ? get().trail.filter((t) => t !== id) : [...get().trail, id]
    safeSet(TRAIL_KEY, JSON.stringify(trail))
    set({ trail })
  },
  trailOpen: false,
  setTrailOpen: (trailOpen) => set({ trailOpen }),
  creditsOpen: false,
  setCreditsOpen: (creditsOpen) => set({ creditsOpen }),
  sound: false,
  setSound: (sound) => set({ sound }),
  quality: START_TIER,
  qualityPref: QUALITY_PREF,
  detail: START_TIER,
  setQuality: (quality) => {
    if (get().quality !== quality) set({ quality })
  },
  setQualityPref: (qualityPref) => {
    saveQualityPref(qualityPref)
    const quality = detectQuality(qualityPref)
    set({ qualityPref, quality, detail: quality })
  },
  contextLost: false,
  setContextLost: (contextLost) => set({ contextLost }),
  reducedMotion: prefersReducedMotion(),
}))
