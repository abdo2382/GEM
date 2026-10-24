/**
 * DOM hotspot buttons register here; the 3D scene positions them every frame
 * (projected from markers on the inspected artifact) without React re-renders.
 */
export const hotspotEls = new Map<string, HTMLElement>()
