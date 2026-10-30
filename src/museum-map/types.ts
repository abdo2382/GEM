import type { XY } from './geo.ts'

export interface LocalText {
  en: string
  ar: string
}

export interface MapSource {
  id: string
  name: string
  url: string
  /** The licence the data comes under, or null for facts read from a page and not copied. */
  licence: string | null
  used: string
}

export interface MapMeta {
  id: string
  version: number
  /** The day this file was generated. */
  builtOn: string
  /** When the OpenStreetMap extract it came from was current. */
  osmSnapshot: string
  /** The point (0, 0) of the local frame. */
  origin: { lat: number; lon: number }
  frame: string
  sources: MapSource[]
  /** What GEM has not published: stated on the map wherever the inside of the building comes up. */
  insideNote: LocalText
}

/**
 * Kinds of walkable way. A 'link' joins a place to the nearest path where OpenStreetMap has no
 * connecting path: a straight line, drawn dashed, never a verified route.
 */
export type WayKind = 'path' | 'steps' | 'road' | 'link'

export interface Way {
  k: WayKind
  /** Indices into `nodes`, in walking order. */
  n: number[]
}

export type PlaceKind = 'building' | 'landmark' | 'entrance' | 'service' | 'parking'

/** A part of the Main Building that GEM names, with no position: GEM has not published a floor plan. */
export interface InsidePart {
  id: string
  name: LocalText
  note: LocalText
  /** The GEM page that says so. */
  source: string
}

export interface Place {
  id: string
  kind: PlaceKind
  name: LocalText
  /** Where the Arabic name comes from: OpenStreetMap's name:ar, GEM's own Arabic pages, or our translation. */
  arFrom: 'osm' | 'gem' | 'ours'
  about?: LocalText
  /** Where its marker stands. */
  at: XY
  /** The routing node a route starts or ends at. */
  node: number
  /** The OpenStreetMap features it is drawn from, as "w/123", "n/456" or "r/789". */
  osm: string[]
  /** 'approximate' means matched to GEM's own site plan by position and shape, not named in OpenStreetMap. */
  match: 'exact' | 'approximate'
  inside?: InsidePart[]
  /** The official GEM page about it. */
  page?: string
  /** Index into `scenery.buildings` of the building it is, if any. */
  building?: number
}

export interface Building {
  /** Outline, closed implicitly. */
  o: XY[]
  /** Metres. */
  h: number
  /** 'osm' when the height is tagged in OpenStreetMap; 'assumed' otherwise, for the 3D view only. */
  hf: 'osm' | 'assumed'
  id: string
}

export interface Area {
  o: XY[]
  id: string
}

export interface Line {
  p: XY[]
  id: string
  /** For roads: 2 for the main roads around the complex, 1 for the rest. */
  w?: 1 | 2
}

export interface GemMap {
  meta: MapMeta
  places: Place[]
  nodes: XY[]
  ways: Way[]
  scenery: {
    buildings: Building[]
    greens: Area[]
    water: Area[]
    walls: Line[]
    /** Roads for context: not walkable routes. */
    roads: Line[]
  }
}
