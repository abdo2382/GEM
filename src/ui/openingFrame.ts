import { fitOpening } from '../three/rigPlan'

/**
 * Wide screens' opening: how the mask fits between the title block and the scroll hint.
 * The opening screen measures the free band when it lays out (load, resize, fonts) and
 * stores the fit here; the mask's rig reads it every frame without touching the DOM.
 */
export const openingFrame: { fit: { y: number; scale: number } | null } = { fit: null }

/** `top`/`bottom` in pixels from the top of a viewport `height` pixels tall. */
export function setOpeningBand(top: number, bottom: number, height: number) {
  openingFrame.fit = fitOpening({ top: top / height, bottom: bottom / height })
}
