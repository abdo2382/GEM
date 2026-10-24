import { useJourney } from '../state/store'
import { STRINGS } from './strings'
import { ARTIFACT_TEXT, STORY } from '../content/story'

export function useT() {
  const lang = useJourney((s) => s.lang)
  return { lang, t: STRINGS[lang], story: STORY[lang], artifacts: ARTIFACT_TEXT[lang] }
}
