import { Color } from 'three'
import { CHAPTERS, ARTIFACT_CHAPTER, ARTIFACT_IDS, type SceneKey } from '../content/chapters'
import { locate, plateau, presence, scrollState, smoothstep, ANCHORS } from '../state/scroll'
import { useJourney } from '../state/store'

/*
 * The director turns scroll progress into one interpolated "scene key" per frame.
 * Every keyframe is compiled into a flat Float32Array so blending is one loop,
 * and each consumer (mask, lights, atmosphere, artifacts) reads named slices.
 */

type FieldKind = 'num' | 'vec' | 'color'
const layout: Record<string, { offset: number; size: number; kind: FieldKind }> = {}
let stride = 0
const sample = CHAPTERS[0].scene
for (const [name, value] of Object.entries(sample)) {
  const kind: FieldKind = typeof value === 'number' ? 'num' : typeof value === 'string' ? 'color' : 'vec'
  const size = kind === 'num' ? 1 : 3
  layout[name] = { offset: stride, size, kind }
  stride += size
}

const tmpColor = new Color()
function compile(key: SceneKey) {
  const out = new Float32Array(stride)
  for (const [name, value] of Object.entries(key)) {
    const { offset, kind } = layout[name]
    if (kind === 'num') out[offset] = value as number
    else if (kind === 'vec') out.set(value as number[], offset)
    else {
      tmpColor.set(value as string)
      out[offset] = tmpColor.r
      out[offset + 1] = tmpColor.g
      out[offset + 2] = tmpColor.b
    }
  }
  return out
}

const compiled = CHAPTERS.map((c) => compile(c.scene))

export type SceneField = keyof SceneKey

export interface FrameState {
  time: number
  delta: number
  progress: number
  /** Raw (un-eased) position between the two surrounding anchors. */
  segment: { i: number; j: number; t: number }
  /** Distance of the progress from the nearest anchor, signed, in progress units. */
  drift: number
  values: Float32Array
  artifactPresence: Record<string, number>
  /** 0 → story view, 1 → Inspect mode. Damped. */
  inspect: number
  /** 0 → black, 1 → fully revealed. Animates after the visitor enters. */
  intro: number
  velocity: number
}

export const frame: FrameState = {
  time: -1,
  delta: 0,
  progress: 0,
  segment: { i: 0, j: 1, t: 0 },
  drift: 0,
  values: new Float32Array(stride),
  artifactPresence: Object.fromEntries(ARTIFACT_IDS.map((id) => [id, 0])),
  inspect: 0,
  intro: 0,
  velocity: 0,
}

let introStart = -1
const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt))

/** Compute the frame once per render tick; every consumer can call it freely. */
export function sampleFrame(time: number): FrameState {
  if (time === frame.time) return frame
  const delta = frame.time < 0 ? 0.016 : Math.min(0.1, time - frame.time)
  frame.time = time
  frame.delta = delta

  const state = useJourney.getState()
  const p = scrollState.progress
  frame.progress = p
  const seg = locate(p)
  frame.segment = seg
  const nearest = seg.t < 0.5 ? seg.i : seg.j
  // Fades out towards mid-transition so switching anchors never causes a jump.
  frame.drift = (p - ANCHORS[nearest]) * (1 - smoothstep(0.12, 0.5, Math.min(seg.t, 1 - seg.t)))

  const w = plateau(seg.t)
  const a = compiled[seg.i]
  const b = compiled[seg.j]
  const v = frame.values
  for (let k = 0; k < stride; k++) v[k] = a[k] + (b[k] - a[k]) * w

  for (const id of ARTIFACT_IDS) {
    frame.artifactPresence[id] = presence(ARTIFACT_CHAPTER[id], p)
  }

  frame.inspect = damp(frame.inspect, state.inspect ? 1 : 0, 4.5, delta)
  frame.velocity = damp(frame.velocity, scrollState.velocity, 3, delta)

  if (state.started) {
    if (introStart < 0) introStart = time
    const t = Math.min(1, (time - introStart) / (state.reducedMotion ? 0.6 : 4.2))
    frame.intro = 1 - Math.pow(1 - t, 3)
  }
  return frame
}

export function num(field: SceneField): number {
  return frame.values[layout[field].offset]
}

export function vec(field: SceneField): [number, number, number] {
  const o = layout[field].offset
  const v = frame.values
  return [v[o], v[o + 1], v[o + 2]]
}

export function color(field: SceneField, target: Color): Color {
  const o = layout[field].offset
  const v = frame.values
  return target.setRGB(v[o], v[o + 1], v[o + 2])
}
