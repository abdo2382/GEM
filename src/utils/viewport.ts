/**
 * The window's size, read once per resize or rotation. Per-frame code reads this
 * instead of window.innerWidth/innerHeight: those force the browser to recalculate
 * style and layout on the spot when read after a style write, which every frame
 * loop here does.
 */
export const viewport = { width: window.innerWidth, height: window.innerHeight }

function update() {
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
}
window.addEventListener('resize', update, { passive: true })
window.addEventListener('orientationchange', update, { passive: true })

/** Same rule as the 3D layout (three/layout.ts): narrow, or taller than wide. */
export function isPortrait() {
  return viewport.width < 760 || viewport.width / viewport.height < 0.85
}
