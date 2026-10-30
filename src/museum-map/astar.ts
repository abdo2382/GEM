import { dist, type XY } from './geo.ts'
import type { GemMap, WayKind } from './types.ts'

/**
 * What a metre of each kind of way costs a walker. Every cost is at least 1, so a straight line
 * to the goal never overestimates what is left: that is what keeps A* exact.
 */
export const KIND_COST: Record<WayKind, number> = { path: 1, link: 1.2, road: 1.4, steps: 1.6 }

export interface Edge {
  to: number
  /** Metres. */
  len: number
  kind: WayKind
}

export interface Graph {
  count: number
  pos: readonly XY[]
  adj: readonly (readonly Edge[])[]
}

export interface Leg {
  from: number
  to: number
  len: number
  kind: WayKind
}

export interface Route {
  nodes: number[]
  legs: Leg[]
  /** Metres walked. */
  length: number
  /** What the search minimised: length weighted by the kind of way. */
  cost: number
  /** How many places the search looked at before it found the goal. */
  visited: number
}

export interface RouteOptions {
  /** Leave out steps. */
  stepFree?: boolean
}

/** Every way is a chain of nodes; every link in the chain can be walked both ways. */
export function buildGraph(map: Pick<GemMap, 'nodes' | 'ways'>): Graph {
  const adj: Edge[][] = map.nodes.map(() => [])
  for (const way of map.ways) {
    for (let i = 1; i < way.n.length; i++) {
      const a = way.n[i - 1]
      const b = way.n[i]
      const len = dist(map.nodes[a], map.nodes[b])
      adj[a].push({ to: b, len, kind: way.k })
      adj[b].push({ to: a, len, kind: way.k })
    }
  }
  return { count: map.nodes.length, pos: map.nodes, adj }
}

/** A binary min-heap of node ids ordered by estimated total cost. */
class MinHeap {
  private f: number[] = []
  private id: number[] = []

  get size() {
    return this.f.length
  }

  push(f: number, id: number) {
    let i = this.f.length
    this.f.push(f)
    this.id.push(id)
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.f[parent] <= f) break
      this.swap(i, parent)
      i = parent
    }
  }

  pop(): number {
    const top = this.id[0]
    const lastF = this.f.pop()!
    const lastId = this.id.pop()!
    if (this.f.length) {
      this.f[0] = lastF
      this.id[0] = lastId
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < this.f.length && this.f[l] < this.f[m]) m = l
        if (r < this.f.length && this.f[r] < this.f[m]) m = r
        if (m === i) break
        this.swap(i, m)
        i = m
      }
    }
    return top
  }

  private swap(a: number, b: number) {
    ;[this.f[a], this.f[b]] = [this.f[b], this.f[a]]
    ;[this.id[a], this.id[b]] = [this.id[b], this.id[a]]
  }
}

/**
 * A*: the cheapest walk from one node to another, or null when there is none. The guess for what
 * is left is the straight-line distance to the goal.
 */
export function findRoute(g: Graph, from: number, to: number, options: RouteOptions = {}): Route | null {
  if (from === to) return { nodes: [from], legs: [], length: 0, cost: 0, visited: 0 }
  const stepFree = options.stepFree === true
  const goal = g.pos[to]
  const best = new Float64Array(g.count).fill(Infinity)
  const cameFrom = new Int32Array(g.count).fill(-1)
  const cameBy: (Edge | undefined)[] = new Array(g.count)
  const closed = new Uint8Array(g.count)
  const open = new MinHeap()
  best[from] = 0
  open.push(dist(g.pos[from], goal), from)
  let visited = 0

  while (open.size) {
    const u = open.pop()
    if (closed[u]) continue // a stale entry: the node was already reached more cheaply
    closed[u] = 1
    visited++
    if (u === to) {
      const nodes = [to]
      const legs: Leg[] = []
      let length = 0
      for (let at = to; cameFrom[at] >= 0; at = cameFrom[at]) {
        const edge = cameBy[at]!
        legs.unshift({ from: cameFrom[at], to: at, len: edge.len, kind: edge.kind })
        nodes.unshift(cameFrom[at])
        length += edge.len
      }
      return { nodes, legs, length, cost: best[to], visited }
    }
    for (const edge of g.adj[u]) {
      if (stepFree && edge.kind === 'steps') continue
      const cost = best[u] + edge.len * KIND_COST[edge.kind]
      if (cost < best[edge.to]) {
        best[edge.to] = cost
        cameFrom[edge.to] = u
        cameBy[edge.to] = edge
        open.push(cost + dist(g.pos[edge.to], goal), edge.to)
      }
    }
  }
  return null
}
