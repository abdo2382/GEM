import raw from './data/gem-complex.json'
import { buildGraph, findRoute, type Route } from './astar.ts'
import { boundsOf } from './camera.ts'
import { dist } from './geo.ts'
import { describeRoute, walkMinutes, type Step } from './directions.ts'
import type { GemMap, Place } from './types.ts'

/** The curated map of the GEM complex, built from OpenStreetMap (see scripts/gem-map). */
export const MAP = raw as unknown as GemMap
export const GRAPH = buildGraph(MAP)

const byId = new Map(MAP.places.map((p) => [p.id, p]))
export const placeById = (id: string | null | undefined): Place | undefined => (id ? byId.get(id) : undefined)

/** Everything inside the perimeter: what "show the whole complex" frames. */
export const COMPLEX_BOUNDS = boundsOf([
  ...MAP.scenery.walls.flatMap((w) => w.p),
  ...MAP.scenery.buildings.flatMap((b) => b.o),
  ...MAP.nodes,
])

/** What the opening view and "show the whole complex" frame: every place and its building, without the empty ring road. */
export const OVERVIEW_BOUNDS = (() => {
  const b = boundsOf([...MAP.places.map((p) => p.at), ...MAP.places.flatMap((p) => (p.building === undefined ? [] : MAP.scenery.buildings[p.building].o))])
  const m = 60
  return { minX: b.minX - m, minY: b.minY - m, maxX: b.maxX + m, maxY: b.maxY + m }
})()

export interface Walk {
  route: Route
  steps: Step[]
  minutes: number
  /** Metres as the crow flies between where the walk starts and ends. */
  straight: number
  /** Step-free was asked for but no such route is mapped, so this walk uses steps. */
  usesStepsAnyway: boolean
}

/** The walk between two places, or null when none is mapped. */
export function walkBetween(fromId: string | null, toId: string | null, stepFree: boolean): Walk | null {
  const from = placeById(fromId)
  const to = placeById(toId)
  if (!from || !to || from.id === to.id) return null
  let route = stepFree ? findRoute(GRAPH, from.node, to.node, { stepFree: true }) : null
  let usesStepsAnyway = false
  if (!route) {
    route = findRoute(GRAPH, from.node, to.node)
    usesStepsAnyway = stepFree && route !== null && route.legs.some((l) => l.kind === 'steps')
  }
  if (!route) return null
  // Named places beside the way, other than where it starts and ends.
  const marks = MAP.places.filter((p) => p.id !== from.id && p.id !== to.id && !shares(p, from) && !shares(p, to)).map((p) => ({ id: p.id, at: p.at }))
  return {
    route,
    steps: describeRoute(GRAPH, route, marks),
    minutes: walkMinutes(route),
    straight: dist(GRAPH.pos[route.nodes[0]], GRAPH.pos[route.nodes[route.nodes.length - 1]]),
    usesStepsAnyway,
  }
}

/** The Main Building and its entrance are one door; do not tell a walker they pass the place they are at. */
const shares = (a: Place, b: Place) => a.node === b.node
