import type { Lang } from '../content/types.ts'
import type { Compass, Step, Turn } from './directions.ts'

/** Plain words for a route, in English and Arabic. The numbers are rounded the way people say them. */

const numbers = (lang: Lang, digits = 0) =>
  new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false })

/**
 * A step is given to the nearest metre when short and the nearest 5 m when longer; a whole walk to
 * the nearest 10 m. From 1,000 m, kilometres with one decimal.
 */
export function formatDistance(meters: number, lang: Lang, mode: 'step' | 'total' = 'step'): string {
  const value =
    mode === 'total' ? Math.max(10, Math.round(meters / 10) * 10) : meters < 20 ? Math.max(1, Math.round(meters)) : Math.round(meters / 5) * 5
  if (value >= 1000) return `${numbers(lang, 1).format(Math.round(value / 100) / 10)} ${lang === 'ar' ? 'كم' : 'km'}`
  return `${numbers(lang).format(value)} ${lang === 'ar' ? 'م' : 'm'}`
}

export function formatMinutes(minutes: number, lang: Lang): string {
  if (lang === 'en') return `${minutes} min`
  const n = numbers('ar').format(minutes)
  switch (new Intl.PluralRules('ar').select(minutes)) {
    case 'one':
      return 'دقيقة واحدة'
    case 'two':
      return 'دقيقتان'
    case 'few':
      return `${n} دقائق`
    default:
      return `${n} دقيقة`
  }
}

const COMPASS_EN: Record<Compass, string> = {
  N: 'north',
  NE: 'north-east',
  E: 'east',
  SE: 'south-east',
  S: 'south',
  SW: 'south-west',
  W: 'west',
  NW: 'north-west',
}
const COMPASS_AR: Record<Compass, string> = {
  N: 'الشمال',
  NE: 'الشمال الشرقي',
  E: 'الشرق',
  SE: 'الجنوب الشرقي',
  S: 'الجنوب',
  SW: 'الجنوب الغربي',
  W: 'الغرب',
  NW: 'الشمال الغربي',
}
const TURN_EN: Record<Turn, string> = {
  'slight-left': 'Bear left',
  left: 'Turn left',
  'sharp-left': 'Turn sharp left',
  'slight-right': 'Bear right',
  right: 'Turn right',
  'sharp-right': 'Turn sharp right',
}
const TURN_AR: Record<Turn, string> = {
  'slight-left': 'انعطف قليلًا إلى اليسار',
  left: 'انعطف يسارًا',
  'sharp-left': 'انعطف بحدة إلى اليسار',
  'slight-right': 'انعطف قليلًا إلى اليمين',
  right: 'انعطف يمينًا',
  'sharp-right': 'انعطف بحدة إلى اليمين',
}

export interface StepText {
  main: string
  /** Named places passed on the way, each already a sentence. */
  passes: string[]
}

/**
 * The words for one step. `continuing` is for a step after the first that makes no turn: it just
 * carries on, usually after a flight of steps.
 */
export function stepText(step: Step, lang: Lang, nameOf: (id: string) => string, continuing = false): StepText {
  const distance = formatDistance(step.distance, lang)
  let main: string
  if (lang === 'en') {
    const way = COMPASS_EN[step.heading]
    if (step.type === 'steps') main = step.turn ? `${TURN_EN[step.turn]}, then take the steps for ${distance}.` : `Take the steps for ${distance}.`
    else if (step.turn) main = `${TURN_EN[step.turn]} and walk ${way} for ${distance}.`
    else main = continuing ? `Continue ${way} for ${distance}.` : `Head ${way} for ${distance}.`
  } else {
    const way = COMPASS_AR[step.heading]
    if (step.type === 'steps') main = step.turn ? `${TURN_AR[step.turn]}، ثم اصعد أو انزل الدرج لمسافة ${distance}.` : `اصعد أو انزل الدرج لمسافة ${distance}.`
    else if (step.turn) main = `${TURN_AR[step.turn]} ثم امشِ نحو ${way} لمسافة ${distance}.`
    else main = continuing ? `واصل نحو ${way} لمسافة ${distance}.` : `اتجه نحو ${way} لمسافة ${distance}.`
  }
  const passes = step.passes.map((p) =>
    lang === 'en' ? `${nameOf(p.id)} on your ${p.side}.` : `${nameOf(p.id)} على ${p.side === 'left' ? 'يسارك' : 'يمينك'}.`,
  )
  return { main, passes }
}

export function arrivalText(lang: Lang, name: string): string {
  return lang === 'en' ? `You have arrived at ${name}.` : `وصلت إلى ${name}.`
}
