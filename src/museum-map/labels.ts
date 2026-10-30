import type { Size } from './camera.ts'

/**
 * Which place names to write on the map at the current zoom. Names compete for room: the most
 * important keep theirs, and the rest wait until there is space. Pure geometry, so the map can
 * re-run it on every frame of a pan or a zoom.
 */
export interface LabelInput {
  id: string
  /** Where the marker is on screen, in pixels. */
  x: number
  y: number
  /** Width of its label in pixels. */
  width: number
  /** Lower wins. */
  priority: number
  /** Always shown, even where it has to overlap (the places in use). */
  force?: boolean
}

export interface LabelPlacement {
  show: boolean
  /** On the side opposite to the way the language reads. */
  flip: boolean
}

const DISC = 15 // half a marker's disc
const LABEL_H = 24
const GAP = 19 // from a marker's centre to the start of its label
const EDGE = 4

interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}
const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0

export function placeLabels(items: LabelInput[], size: Size, rtl: boolean): Map<string, LabelPlacement> {
  const out = new Map<string, LabelPlacement>()
  const visible = items.filter((i) => i.x > -DISC && i.x < size.w + DISC && i.y > -DISC && i.y < size.h + DISC)
  for (const i of items) if (!visible.includes(i)) out.set(i.id, { show: false, flip: false })
  const discs = visible.map((i) => ({ id: i.id, rect: { x0: i.x - DISC, y0: i.y - DISC, x1: i.x + DISC, y1: i.y + DISC } }))
  const placed: Rect[] = []
  const defaultRight = !rtl

  for (const item of [...visible].sort((a, b) => a.priority - b.priority)) {
    const rect = (right: boolean): Rect =>
      right
        ? { x0: item.x + GAP, x1: item.x + GAP + item.width, y0: item.y - LABEL_H / 2, y1: item.y + LABEL_H / 2 }
        : { x0: item.x - GAP - item.width, x1: item.x - GAP, y0: item.y - LABEL_H / 2, y1: item.y + LABEL_H / 2 }
    const onScreen = (r: Rect) => r.x0 >= EDGE && r.x1 <= size.w - EDGE
    const fits = (r: Rect) => onScreen(r) && !placed.some((p) => overlaps(p, r)) && !discs.some((d) => d.id !== item.id && overlaps(d.rect, r))
    let side: boolean | null = [defaultRight, !defaultRight].find((right) => fits(rect(right))) ?? null
    // A chosen place keeps its label even with no clean side: the side that stays on screen.
    if (side === null && item.force) side = [defaultRight, !defaultRight].find((right) => onScreen(rect(right))) ?? defaultRight
    if (side === null) out.set(item.id, { show: false, flip: false })
    else {
      placed.push(rect(side))
      out.set(item.id, { show: true, flip: side !== defaultRight })
    }
  }
  return out
}
