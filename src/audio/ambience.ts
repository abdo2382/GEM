/*
 * Procedural tomb ambience (no audio files): desert wind through the corridor,
 * a low drone, and the occasional crackle of a torch. Muted until the visitor asks.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let windFilter: BiquadFilterNode | null = null
let droneGain: GainNode | null = null
let crackleTimer: ReturnType<typeof setTimeout> | undefined
let running = false

function noiseBuffer(ac: AudioContext, seconds: number) {
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    // Brown-ish noise: integrated white noise, gently leaky.
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.5
  }
  return buf
}

function build() {
  const ac = new AudioContext()
  ctx = ac
  master = ac.createGain()
  master.gain.value = 0
  master.connect(ac.destination)

  const wind = ac.createBufferSource()
  wind.buffer = noiseBuffer(ac, 6)
  wind.loop = true
  windFilter = ac.createBiquadFilter()
  windFilter.type = 'bandpass'
  windFilter.frequency.value = 420
  windFilter.Q.value = 0.6
  const windGain = ac.createGain()
  windGain.gain.value = 0.55
  const lfo = ac.createOscillator()
  lfo.frequency.value = 0.07
  const lfoGain = ac.createGain()
  lfoGain.gain.value = 0.3
  lfo.connect(lfoGain).connect(windGain.gain)
  wind.connect(windFilter).connect(windGain).connect(master)
  wind.start()
  lfo.start()

  droneGain = ac.createGain()
  droneGain.gain.value = 0.05
  const droneFilter = ac.createBiquadFilter()
  droneFilter.type = 'lowpass'
  droneFilter.frequency.value = 260
  for (const [f, detune] of [
    [55, 0],
    [82.41, 4],
    [110, -6],
  ]) {
    const o = ac.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    o.detune.value = detune
    const g = ac.createGain()
    g.gain.value = f === 55 ? 0.5 : 0.25
    o.connect(g).connect(droneFilter)
    o.start()
  }
  droneFilter.connect(droneGain).connect(master)
}

function crackle() {
  if (!ctx || !master || !running) return
  const ac = ctx
  const len = 0.02 + Math.random() * 0.05
  const buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3)
  const src = ac.createBufferSource()
  src.buffer = buf
  const hp = ac.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 1800 + Math.random() * 2000
  const g = ac.createGain()
  g.gain.value = 0.05 + Math.random() * 0.08
  src.connect(hp).connect(g).connect(master)
  src.start()
  crackleTimer = setTimeout(crackle, 120 + Math.random() * (Math.random() < 0.2 ? 2400 : 700))
}

export function setAmbience(on: boolean) {
  try {
    if (on) {
      if (!ctx) build()
      void ctx!.resume()
      running = true
      master!.gain.cancelScheduledValues(ctx!.currentTime)
      master!.gain.setTargetAtTime(0.32, ctx!.currentTime, 0.8)
      clearTimeout(crackleTimer)
      crackle()
    } else if (ctx && master) {
      running = false
      clearTimeout(crackleTimer)
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
    }
  } catch (err) {
    console.warn('[ambience] audio unavailable', err)
  }
}

/** Shift the soundscape per chapter: warmer wind in the tomb, airier in the museum. */
export function setAmbienceChapter(chapter: number) {
  if (!ctx || !windFilter || !droneGain) return
  const t = ctx.currentTime
  const freq = [380, 420, 520, 300, 760][chapter] ?? 420
  const drone = [0.06, 0.05, 0.045, 0.075, 0.02][chapter] ?? 0.05
  windFilter.frequency.setTargetAtTime(freq, t, 1.5)
  droneGain.gain.setTargetAtTime(drone, t, 1.5)
}
