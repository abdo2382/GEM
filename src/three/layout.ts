import { useJourney } from '../state/store'

/** Layout facts the 3D scene needs: phone-style stacking and RTL mirroring. */
export function sceneLayout(width: number, height: number) {
  const portrait = width < 760 || width / height < 0.85
  const tablet = !portrait && width < 1100
  const rtl = useJourney.getState().lang === 'ar'
  // The artifact column sits opposite the papyrus: right in LTR, left in RTL.
  const side = rtl ? -1 : 1
  return { portrait, tablet, side }
}
