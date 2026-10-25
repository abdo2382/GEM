/**
 * When the phone's top bar steps aside: scrolling down past a threshold hides it so the
 * mask has the top of the screen; a short scroll back up brings it back. Distances are
 * measured from where the visitor last turned (`anchor`), so jitters don't flicker it.
 */
export interface BarState {
  hidden: boolean
  anchor: number
}

export const BAR = {
  /** Always shown this close to the top of the page (px). */
  top: 80,
  /** Downward travel that hides it (px). */
  hideAfter: 56,
  /** Upward travel that brings it back (px). */
  showAfter: 24,
}

/** `pinned`: the menu is open or focus is inside the bar, so it must stay. */
export function nextBar(state: BarState, y: number, pinned: boolean): BarState {
  if (pinned || y < BAR.top) return { hidden: false, anchor: y }
  if (state.hidden) {
    if (y > state.anchor) return { hidden: true, anchor: y }
    return state.anchor - y > BAR.showAfter ? { hidden: false, anchor: y } : state
  }
  if (y < state.anchor) return { hidden: false, anchor: y }
  return y - state.anchor > BAR.hideAfter ? { hidden: true, anchor: y } : state
}
