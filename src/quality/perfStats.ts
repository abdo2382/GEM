/** Rolling frame statistics for the `?perf` readout, so a real phone can be checked without DevTools. */
const SIZE = 120
const frames = new Float32Array(SIZE)
let index = 0
let count = 0

export function recordFrame(ms: number) {
  frames[index] = ms
  index = (index + 1) % SIZE
  count = Math.min(SIZE, count + 1)
}

/** Average frames per second and the 95th-percentile frame time over the last ~2 seconds. */
export function readStats() {
  if (!count) return { fps: 0, p95: 0 }
  const recent = Array.from(frames.subarray(0, count)).sort((a, b) => a - b)
  const mean = recent.reduce((s, v) => s + v, 0) / count
  return { fps: 1000 / mean, p95: recent[Math.floor(0.95 * (count - 1))] }
}
