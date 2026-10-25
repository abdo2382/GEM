import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  RepeatWrapping,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Material,
} from 'three'
import { eyeTexture, hammeredRoughness, paint, rng } from '../textures'
import { GOLD, glassMaterial, goldMaterial, pbrMaterial } from '../materials'
import { clamp01, drapeStrip, gauss, gauss2, lerp, profile, smooth, spline2, surface, taperTube } from './geo'
import { marker } from './common'

/*
 * Artistic reconstruction of the gold mask of Tutankhamun (GEM no. 8), modelled in code
 * and fitted to a front photograph of the original.
 *
 * Reference frame: 1 unit = 220 px of the front reference photo; x = 0 on the nose,
 * y = 0 just under the eyes, z towards the viewer. The full width (39.3 cm on the
 * original) spans ±0.965. Proportions below are measured from that photo.
 */

const GLYPH_FONT = '"Noto Sans Egyptian Hieroglyphs"'

/* --------------------------------------------------------------------------- */
/* Face                                                                         */
/* --------------------------------------------------------------------------- */

const FACE_TOP = 0.3
const FACE_BOTTOM = -1.0

/** Half-width of the face: temples ±0.385, narrowing into the neck between the lappets. */
const halfWidth = (y: number) => 0.385 + 0.022 * gauss(y + 0.05, 0.15) - 0.025 * smooth(0.0, -0.46, y)

/** Depth of the face's centre line before features: low forehead, recessed neck. */
const centreDepth = (y: number) => 0.3 - 0.04 * smooth(0.12, 0.3, y) - 0.16 * smooth(-0.42, -0.62, y)

const EYE = { cx: 0.197, cy: 0.077, ew: 0.11, eh: 0.043 }

/** Sculpted relief. Landmarks measured from the photo (eyes, nose, lips, chin, cheeks). */
function features(x: number, y: number) {
  const ax = Math.abs(x)
  let z = 0
  z += 0.024 * gauss(ax, 0.32) * gauss(y - 0.2, 0.04) // brow ridge
  z -= 0.04 * gauss2(ax - EYE.cx, y - EYE.cy - 0.004, 0.1, 0.05) // eye sockets
  z += 0.034 * gauss2(ax - EYE.cx, y - EYE.cy, 0.085, 0.034) // eyeballs
  z += 0.03 * gauss2(ax - 0.25, y + 0.04, 0.09, 0.09) // cheekbones
  z += 0.022 * gauss2(ax - 0.21, y + 0.16, 0.11, 0.09) // full cheeks
  const bridge = smooth(0.19, -0.04, y) * (1 - smooth(-0.11, -0.16, y))
  z += 0.036 * gauss(x, 0.042 + 0.022 * smooth(0.1, -0.1, y)) * bridge // nasal ridge
  z += 0.042 * gauss2(x, y + 0.13, 0.05, 0.038) // nose tip
  z += 0.026 * gauss2(ax - 0.068, y + 0.15, 0.034, 0.026) // alae
  z -= 0.007 * gauss2(ax - 0.034, y + 0.166, 0.012, 0.007) // nostrils
  z -= 0.004 * gauss2(x, y + 0.2, 0.015, 0.016) // philtrum
  z += 0.045 * gauss2(x, y + 0.247, 0.112, 0.022) // upper lip
  z += 0.052 * gauss2(x, y + 0.296, 0.098, 0.027) // lower lip
  z -= 0.022 * gauss(y + 0.272, 0.0065) * gauss(x, 0.11) // parting of the lips
  z -= 0.012 * gauss2(ax - 0.122, y + 0.271, 0.015, 0.02) // mouth corners
  z -= 0.014 * gauss2(x, y + 0.338, 0.065, 0.017) // mentolabial groove
  z += 0.04 * gauss2(x, y + 0.4, 0.135, 0.06) // broad, rounded chin
  z -= 0.07 * smooth(-0.22, -0.46, y) * Math.pow(clamp01((ax - 0.12) / 0.24), 1.4) * (1 - smooth(-0.5, -0.62, y)) // jaw
  // Relief is softened slightly: the whole mask is deepened by DEPTH below.
  return z * 0.8
}

export function faceZ(x: number, y: number) {
  const w = halfWidth(y)
  const nx = Math.min(1, Math.abs(x) / w)
  // Full cheeks; the neck below the chin is a broad, flatter column.
  const k = lerp(0.32, 0.25, smooth(-0.45, -0.6, y))
  return centreDepth(y) * Math.pow(Math.max(0, 1 - nx * nx), k) - 0.08 * nx ** 4 + features(x, y)
}

function almond(s: number, t: number, ew: number, eh: number): [number, number] {
  const k = 1 - s * s
  const upper = eh * Math.pow(k, 0.68) + 0.005 * s
  const lower = -eh * 0.58 * Math.pow(k, 0.85) - 0.013 * Math.pow(Math.max(0, -s), 3)
  return [EYE.cx + s * ew, EYE.cy + lerp(lower, upper, t)]
}

function eyeGeometry(scaleW: number, scaleH: number, liftBase: number, bulge: number) {
  return surface(44, 16, (u, v, out) => {
    const s = u * 2 - 1
    const t = 1 - v
    const [x, y] = almond(s, t, EYE.ew * scaleW, EYE.eh * scaleH)
    out.set(x, y, faceZ(x, y) + liftBase + bulge * (1 - s * s) * Math.sin(Math.PI * t))
  })
}

/** The viewer's-right half of the face inlays and the ear; mirrored for the other side. */
function buildHalf(mats: { lapis: Material; eye: Material; gold: Material; dark: Material; shadow: Material }) {
  const half = new Group()
  half.add(new Mesh(eyeGeometry(1.15, 1.5, 0.003, 0.008), mats.lapis))
  half.add(new Mesh(eyeGeometry(1, 1, 0.0055, 0.013), mats.eye))

  // Cosmetic line drawn back to the temple.
  const line = spline2(
    [
      [EYE.cx + EYE.ew * 0.95, EYE.cy + 0.003],
      [EYE.cx + EYE.ew + 0.05, EYE.cy + 0.008],
      [0.37, EYE.cy + 0.013],
    ],
    24,
  )
  half.add(new Mesh(drapeStrip(line, (t) => lerp(0.024, 0.016, t), faceZ, 0.005), mats.lapis))

  // Eyebrow inlay.
  const brow = spline2(
    [
      [0.08, 0.192],
      [0.15, 0.219],
      [0.23, 0.223],
      [0.31, 0.206],
      [0.375, 0.184],
    ],
    44,
  )
  half.add(new Mesh(drapeStrip(brow, (t) => lerp(0.03, 0.045, Math.sin(Math.PI * t)) * (1 - 0.38 * t), faceZ, 0.006), mats.lapis))

  // Ear: large and set forward, with a curling helix and a pierced lobe (as on the original).
  const ear = new Group()
  ear.position.set(0.43, -0.12, 0.06)
  ear.rotation.set(0, 0.34, 0.05)
  ear.scale.setScalar(1.14)
  half.add(ear)
  const outline = new Shape()
  outline.moveTo(-0.022, 0.15)
  outline.bezierCurveTo(0.04, 0.172, 0.078, 0.12, 0.072, 0.04)
  outline.bezierCurveTo(0.067, -0.03, 0.042, -0.07, 0.036, -0.11)
  outline.bezierCurveTo(0.031, -0.162, -0.012, -0.168, -0.022, -0.13)
  outline.bezierCurveTo(-0.032, -0.08, -0.036, 0.05, -0.022, 0.15)
  ear.add(
    new Mesh(
      new ExtrudeGeometry(outline, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 6, curveSegments: 36 }),
      mats.gold,
    ),
  )
  const helix = new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(-0.012, 0.13, 0.034),
      new Vector3(0.036, 0.138, 0.036),
      new Vector3(0.058, 0.07, 0.036),
      new Vector3(0.052, -0.01, 0.035),
      new Vector3(0.032, -0.07, 0.033),
    ]),
    40,
    0.012,
    10,
  )
  ear.add(new Mesh(helix, mats.gold))
  const concha = new Mesh(new SphereGeometry(1, 24, 16), mats.shadow)
  concha.scale.set(0.024, 0.05, 0.006)
  concha.position.set(0.016, 0.01, 0.03)
  ear.add(concha)
  const lobeHole = new Mesh(new CylinderGeometry(0.009, 0.009, 0.07, 16), mats.dark)
  lobeHole.rotation.x = Math.PI / 2
  lobeHole.position.set(0.006, -0.128, 0.02)
  ear.add(lobeHole)
  return half
}

/* --------------------------------------------------------------------------- */
/* Nemes headdress                                                              */
/* --------------------------------------------------------------------------- */

const NEMES_TOP = 0.695
const NEMES_BOTTOM = -0.68
const BAND = { top: 0.318, bottom: 0.25 }
const CZ = -0.2
const QUEUE_Y = -0.7

/** Front-view half-width of the headdress, traced from the front photo's outline. */
const rxAt = profile([
  [0.695, 0.0],
  [0.69, 0.15],
  [0.68, 0.22],
  [0.665, 0.27],
  [0.647, 0.3],
  [0.61, 0.385],
  [0.58, 0.436],
  [0.55, 0.484],
  [0.52, 0.545],
  [0.49, 0.598],
  [0.46, 0.636],
  [0.43, 0.649],
  [0.4, 0.667],
  [0.34, 0.69],
  [0.28, 0.716],
  [0.22, 0.733],
  [0.16, 0.754],
  [0.1, 0.774],
  [0.04, 0.794],
  [-0.05, 0.821],
  [-0.17, 0.86],
  [-0.29, 0.898],
  [-0.41, 0.929],
  [-0.5, 0.952],
  [-0.56, 0.961],
  [-0.6, 0.948],
  [-0.64, 0.915],
  [-0.68, 0.875],
])
/** Half-depth (front to back). */
const rzAt = profile([
  [0.695, 0.0],
  [0.69, 0.18],
  [0.675, 0.3],
  [0.645, 0.38],
  [0.6, 0.44],
  [0.5, 0.49],
  [0.36, 0.51],
  [0.27, 0.515],
  [0.0, 0.52],
  [-0.36, 0.5],
  [-0.68, 0.49],
])
/** Front edge of the opening that frames the face, behind the ears and lappets. */
const xeAt = profile([
  [0.262, 0.0],
  [0.252, 0.3],
  [0.24, 0.37],
  [0.2, 0.395],
  [0.12, 0.43],
  [0.05, 0.455],
  [-0.3, 0.47],
  [-0.68, 0.62],
])
const zeAt = profile([
  [0.262, 0.3],
  [0.245, 0.25],
  [0.2, 0.13],
  [0.12, 0.06],
  [0.05, 0.02],
  [-0.68, 0.0],
])

const B0 = 0.6 // share of each half spent on the back quarter-ellipse

/** u: 0 left front edge → 0.5 back centre → 1 right front edge; v: top → bottom. */
function nemesPoint(u: number, v: number, out: Vector3) {
  const y = lerp(NEMES_TOP, NEMES_BOTTOM, v)
  const rx = rxAt(y)
  const rz = rzAt(y)
  const open = smooth(0.264, 0.246, y)
  const side = u < 0.5 ? -1 : 1
  const beta = u < 0.5 ? 1 - 2 * u : 2 * u - 1
  let x: number
  let z: number
  if (beta <= B0) {
    const a = (beta / B0) * (Math.PI / 2)
    x = rx * Math.sin(a)
    z = CZ - rz * Math.cos(a)
  } else {
    const t = (beta - B0) / (1 - B0)
    // Closed (crown): carry on round the ellipse to the front centre.
    const a = (Math.PI / 2) * (1 + t)
    const xc = rx * Math.sin(a)
    const zc = CZ - rz * Math.cos(a)
    // Open: a rounded return from the widest point to the front edge.
    const xe = xeAt(y)
    const ze = zeAt(y)
    const k = 1 - t
    const xo = k * k * rx + 2 * k * t * rx + t * t * xe
    const zo = k * k * CZ + 2 * k * t * ze + t * t * ze
    x = lerp(xc, xo, open)
    z = lerp(zc, zo, open)
  }
  out.set(side * x, y, z)
}

const stripeGLSL = /* glsl */ `
uniform vec3 uGold;
uniform vec3 uBlue;
uniform float uPeriod;
uniform float uBlueFrac;
uniform float uBandTop;
uniform float uBandBottom;
uniform float uQy;
uniform float uCz;
uniform float uRays;
uniform float uRadial;
uniform float uAlwaysBorder;
uniform float uBump;
varying vec3 vObj;
varying float vEdge;

float stripeBand(float phase, out float h) {
  float f = fract(phase);
  float w = max(fwidth(phase), 1e-4) * 1.2;
  float m = smoothstep(0.0, w, f) - smoothstep(uBlueFrac - w, uBlueFrac, f);
  float g = clamp((f - uBlueFrac) / (1.0 - uBlueFrac), 0.0, 1.0);
  m = clamp(m, 0.0, 1.0);
  // Gold ribs are convex; the glass sits a little lower.
  h = mix(sin(3.14159265 * g) * 0.8, 0.1, m);
  return m;
}

float headdressMask(vec3 p, out float h) {
  float hh;
  float mh = stripeBand((uBandBottom - 0.02 - p.y) / uPeriod, hh);
  float m = mh;
  h = hh;
  float az = atan(p.x, -(p.z - uCz));
  float wb = uRadial * (1.0 - smoothstep(1.2, 1.5, abs(az)));
  if (wb > 0.001) {
    // The back pleats fan out from the queue.
    float hr;
    float ang = atan(az * 0.62, max(p.y - uQy, 0.02));
    float mr = stripeBand(ang * uRays / 3.14159265, hr);
    m = mix(mh, mr, wb);
    h = mix(hh, hr, wb);
  }
  float onBand = step(uBandBottom, p.y) * step(p.y, uBandTop) * (1.0 - smoothstep(0.34, 0.42, abs(p.x))) * (1.0 - wb);
  float open = max(uAlwaysBorder, 1.0 - smoothstep(0.246, 0.264, p.y));
  float border = (1.0 - smoothstep(0.009, 0.017, vEdge)) * open;
  float gold = max(onBand, border);
  h = mix(h, 0.9, gold);
  return m * (1.0 - gold);
}

vec3 stripePerturb(vec3 surfPos, vec3 surfNorm, float hgt, float faceDir) {
  vec2 dHdxy = vec2(dFdx(hgt), dFdy(hgt));
  vec3 sx = normalize(dFdx(surfPos));
  vec3 sy = normalize(dFdy(surfPos));
  vec3 r1 = cross(sy, surfNorm);
  vec3 r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}
`

const STRIPE_BLUE = new Color('#394176')

/**
 * Gold and blue-glass stripes computed per pixel in headdress space, so the sides read
 * as horizontal bands and the back as pleats radiating from the queue.
 */
function stripeMaterial(radial: boolean, alwaysBorder: boolean) {
  const m = new MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.2, clearcoat: 0.3, clearcoatRoughness: 0.18, side: DoubleSide })
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uGold: { value: GOLD },
      uBlue: { value: STRIPE_BLUE },
      uPeriod: { value: 0.118 },
      uBlueFrac: { value: 0.46 },
      uBandTop: { value: BAND.top },
      uBandBottom: { value: BAND.bottom },
      uQy: { value: QUEUE_Y },
      uCz: { value: CZ },
      uRays: { value: 22 },
      uRadial: { value: radial ? 1 : 0 },
      uAlwaysBorder: { value: alwaysBorder ? 1 : 0 },
      uBump: { value: 0.14 },
    })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aEdge;\nvarying vec3 vObj;\nvarying float vEdge;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;\nvEdge = aEdge;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${stripeGLSL}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat sH;\nfloat sM = headdressMask(vObj, sH);\ndiffuseColor.rgb = mix(uGold, uBlue, sM);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.3, 0.26, sM);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = 1.0 - sM;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = stripePerturb(-vViewPosition, normal, sH * uBump, faceDirection);')
  }
  m.customProgramCacheKey = () => 'mask-stripes'
  return m
}

function withEdge(g: BufferGeometry, edge: number[]) {
  g.setAttribute('aEdge', new Float32BufferAttribute(edge, 1))
  return g
}

function buildNemes(mat: Material) {
  const U = 200
  const V = 340
  const g = surface(U, V, nemesPoint, true)
  const edge: number[] = []
  // Distance from the front edge in parameter space (≈ world units on the front return).
  for (let j = 0; j <= V; j++) for (let i = 0; i <= U; i++) edge.push(Math.min(i / U, 1 - i / U) * 2 * 0.95)
  return new Mesh(withEdge(g, edge), mat)
}

/** Front lappets: broad striped bands hanging from below the ears over the collar. */
function buildLappet(side: number, mat: Material) {
  const x0 = 0.27
  const x1 = 0.7
  const yTop = -0.3
  const yBot = -1.6
  const r = 0.07
  const U = 24
  const V = 140
  const pos: number[] = []
  const edge: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= V; j++) {
    const y = lerp(yTop, yBot, j / V)
    const dyB = y - yBot
    const inset = dyB < r ? r - Math.sqrt(Math.max(0, r * r - (r - dyB) ** 2)) : 0
    for (let i = 0; i <= U; i++) {
      const s = i / U
      const x = lerp(x0 + inset, x1 - inset, s)
      // Wraps back round the chest towards the wing at its outer edge.
      const z = 0.205 - 0.12 * (x - x0) - 0.55 * Math.pow(Math.max(0, x - x0 - 0.12), 1.6) + 0.014 * Math.sin(Math.PI * s) - 0.03 * smooth(-0.3, -1.6, y)
      pos.push(side * x, y, z)
      edge.push(Math.min(x - x0 - inset, x1 - inset - x, dyB))
    }
  }
  const row = U + 1
  for (let j = 0; j < V; j++) {
    for (let i = 0; i < U; i++) {
      const a = j * row + i
      if (side > 0) idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1)
      else idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return new Mesh(withEdge(g, edge), mat)
}

/* --------------------------------------------------------------------------- */
/* Broad collar                                                                 */
/* --------------------------------------------------------------------------- */

const COLLAR = { cy: -0.8, inRx: 0.55, inRy: 0.19, top: -0.74, bottom: -1.91 }

/** Outer edge of the collar, traced from the front photo's outline (half-width by height). */
const outerHalf = profile([
  [-0.74, 0.863],
  [-0.8, 0.89],
  [-0.86, 0.917],
  [-0.92, 0.932],
  [-0.98, 0.942],
  [-1.04, 0.951],
  [-1.1, 0.955],
  [-1.19, 0.959],
  [-1.28, 0.959],
  [-1.34, 0.955],
  [-1.4, 0.944],
  [-1.46, 0.934],
  [-1.52, 0.915],
  [-1.58, 0.891],
  [-1.64, 0.857],
  [-1.7, 0.81],
  [-1.76, 0.748],
  [-1.79, 0.698],
  [-1.82, 0.645],
  [-1.85, 0.556],
  [-1.88, 0.42],
  [-1.9, 0.24],
  [-1.91, 0.0],
])

export function collarOuterX(y: number) {
  return y >= COLLAR.top ? outerHalf(COLLAR.top) : outerHalf(y)
}

const collarZ = (x: number, r: number) => 0.175 - 0.33 * x * x - 0.03 * r

/** Resample a polyline at `n + 1` points evenly spaced along its length. */
function resample(pts: [number, number][], n: number): [number, number][] {
  const acc = [0]
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const total = acc[acc.length - 1]
  const out: [number, number][] = []
  let j = 0
  for (let k = 0; k <= n; k++) {
    const d = (k / n) * total
    while (j < acc.length - 2 && acc[j + 1] < d) j++
    const t = (d - acc[j]) / (acc[j + 1] - acc[j] || 1)
    out.push([lerp(pts[j][0], pts[j + 1][0], t), lerp(pts[j][1], pts[j + 1][1], t)])
  }
  return out
}

const COLLAR_SAMPLES = 520
/** Inner (neck) and outer edges, both parameterised by arc length from left to right. */
const collarInner = resample(
  Array.from({ length: 401 }, (_, i): [number, number] => {
    const phi = Math.PI + (i / 400) * Math.PI
    return [COLLAR.inRx * Math.cos(phi), COLLAR.cy + COLLAR.inRy * Math.sin(phi)]
  }),
  COLLAR_SAMPLES,
)
const collarOuter = (() => {
  const left: [number, number][] = []
  for (let i = 0; i <= 600; i++) {
    // Denser sampling towards the rounded bottom.
    const t = i / 600
    const y = lerp(COLLAR.top, COLLAR.bottom, 1 - (1 - t) ** 1.6)
    left.push([-outerHalf(y), y])
  }
  const right = left.slice(0, -1).reverse().map(([x, y]): [number, number] => [-x, y])
  return resample([...left, ...right], COLLAR_SAMPLES)
})()

function collarPoint(u: number, r: number): [number, number, number] {
  const f = u * COLLAR_SAMPLES
  const i = Math.min(COLLAR_SAMPLES - 1, Math.floor(f))
  const t = f - i
  const ix = lerp(collarInner[i][0], collarInner[i + 1][0], t)
  const iy = lerp(collarInner[i][1], collarInner[i + 1][1], t)
  const ox = lerp(collarOuter[i][0], collarOuter[i + 1][0], t)
  const oy = lerp(collarOuter[i][1], collarOuter[i + 1][1], t)
  const x = lerp(ix, ox, r)
  return [x, lerp(iy, oy, r), collarZ(x, r)]
}

/** Rows measured from the photo, inner → outer, with a fringe of drop beads. */
function collarTexture() {
  const W = 2048
  const H = 1024
  const rows = ['d', 'c', 'd', 'p', 'd', 'c', 'd', 'p', 'd', 'c', 'd'] as const
  const cells = 150
  return paint(W, H, (ctx, s) => {
    const ry = (r: number) => (1 - r) * H
    ctx.fillStyle = s('gold')
    ctx.fillRect(0, 0, W, H)
    const r0 = 0.04
    const r1 = 0.845
    const step = (r1 - r0) / rows.length
    const sep = step * 0.2
    rows.forEach((kind, i) => {
      const a = r0 + i * step + sep / 2
      const b = a + step - sep
      const mat = kind === 'd' ? 'dark' : kind === 'c' ? 'carnDark' : 'pale'
      ctx.fillStyle = s('gap')
      ctx.fillRect(0, ry(b) - 1, W, ry(a) - ry(b) + 2)
      for (let c = 0; c < cells; c++) {
        const x0 = (c / cells) * W
        const cw = W / cells
        ctx.fillStyle = s(mat)
        ctx.fillRect(x0 + 1.5, ry(b) + 1.5, cw - 3, ry(a) - ry(b) - 3)
      }
    })
    // Drop beads pointing outwards.
    const d0 = 0.86
    const d1 = 0.965
    const drops = 90
    const dropMats = ['dark', 'pale', 'dark', 'carnDark'] as const
    for (let c = 0; c < drops; c++) {
      const cx = ((c + 0.5) / drops) * W
      const w = (W / drops) * 0.36
      const top = ry(d0)
      const bot = ry(d1)
      ctx.beginPath()
      ctx.moveTo(cx - w, top)
      ctx.lineTo(cx + w, top)
      ctx.quadraticCurveTo(cx + w, bot - (bot - top) * 0.1, cx, bot)
      ctx.quadraticCurveTo(cx - w, bot - (bot - top) * 0.1, cx - w, top)
      ctx.fillStyle = s('gap')
      ctx.fill()
      ctx.save()
      ctx.translate(cx, top)
      ctx.scale(0.8, 0.86)
      ctx.translate(-cx, -top)
      ctx.fillStyle = s(dropMats[c % dropMats.length])
      ctx.fill()
      ctx.restore()
    }
  })
}

function buildCollar() {
  const U = 260
  const R = 40
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= R; j++) {
    for (let i = 0; i <= U; i++) {
      const [x, y, z] = collarPoint(i / U, j / R)
      pos.push(x, y, z)
      uv.push(i / U, j / R)
    }
  }
  const row = U + 1
  for (let j = 0; j < R; j++) {
    for (let i = 0; i < U; i++) {
      const a = j * row + i
      idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return new Mesh(g, pbrMaterial(collarTexture(), { side: DoubleSide, bumpScale: 1.6, clearcoat: 0.25 }))
}

/** Falcon-head terminals where the collar meets the shoulders. */
function buildFalcon(side: number, gold: Material, lapis: Material) {
  const g = new Group()
  const plate = new Shape()
  plate.moveTo(-0.13, -0.1)
  plate.lineTo(0.12, -0.1)
  plate.quadraticCurveTo(0.15, -0.1, 0.15, -0.06)
  plate.lineTo(0.15, 0.08)
  plate.quadraticCurveTo(0.15, 0.11, 0.12, 0.11)
  plate.lineTo(-0.13, 0.11)
  plate.closePath()
  g.add(new Mesh(new ExtrudeGeometry(plate, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3 }), gold))
  // Falcon head in relief, facing outwards.
  const head = new Shape()
  head.absarc(0.03, 0.02, 0.055, 0, Math.PI * 2, false)
  const beak = new Shape()
  beak.moveTo(0.075, 0.035)
  beak.quadraticCurveTo(0.13, 0.03, 0.12, -0.02)
  beak.lineTo(0.08, -0.005)
  beak.closePath()
  for (const sh of [head, beak]) {
    const m = new Mesh(new ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 2 }), gold)
    m.position.z = 0.045
    g.add(m)
  }
  const eye = new Mesh(new SphereGeometry(0.013, 12, 10), lapis)
  eye.position.set(0.05, 0.035, 0.072)
  g.add(eye)
  const mark = new Mesh(new CylinderGeometry(0.006, 0.006, 0.05, 8), lapis)
  mark.position.set(0.045, 0.002, 0.07)
  g.add(mark)
  g.scale.set(side * 0.78, 0.78, 0.78)
  g.position.set(side * 0.84, -0.86, collarZ(0.84, 0.5) - 0.02)
  g.rotation.y = -side * 0.55
  return g
}

/* --------------------------------------------------------------------------- */
/* Beard, queue, back plate                                                     */
/* --------------------------------------------------------------------------- */

function beardTexture() {
  const W = 512
  const H = 1024
  return paint(W, H, (ctx, s) => {
    ctx.fillStyle = s('beard')
    ctx.fillRect(0, 0, W, H)
    const rows = 30
    const rowH = (H * 0.94) / rows
    const top = H * 0.02
    ctx.lineCap = 'round'
    for (let r = 0; r <= rows; r++) {
      const y = top + r * rowH
      for (let rep = 0; rep < 2; rep++) {
        const x0 = rep * (W / 2)
        for (const [style, width] of [
          ['gap', rowH * 0.3],
          ['gold', rowH * 0.16],
        ] as const) {
          ctx.lineWidth = width
          ctx.strokeStyle = s(style)
          ctx.beginPath()
          ctx.moveTo(x0, y)
          ctx.lineTo(x0 + W / 4, y + rowH * 0.8)
          ctx.lineTo(x0 + W / 2, y)
          ctx.stroke()
        }
      }
    }
    // Gold edging at the chin.
    ctx.fillStyle = s('gold')
    ctx.fillRect(0, 0, W, top)
  })
}

/** Bands along a tube's length (TubeGeometry runs u along the tube). */
function ringTexture(rings: number) {
  return paint(1024, 64, (ctx, s) => {
    ctx.fillStyle = s('gold')
    ctx.fillRect(0, 0, 1024, 64)
    const w = 1024 / rings
    for (let i = 0; i < rings; i++) {
      ctx.fillStyle = s('gap')
      ctx.fillRect(i * w + w * 0.5 - 2, 0, w * 0.44 + 4, 64)
      ctx.fillStyle = s('dark')
      ctx.fillRect(i * w + w * 0.5, 0, w * 0.44, 64)
    }
  })
}

/** Gold shoulder plate with columns of signs. Decorative arrangement, not the actual spell. */
function plateTexture() {
  const W = 2048
  const H = 1152
  const rand = rng(151)
  const glyphs = '𓇋𓏠𓈖𓏏𓅱𓋹𓂋𓊪𓈎𓅓𓆑𓇳𓊃𓋴𓍿𓎛𓃀𓄿𓂝𓐍𓆓𓊖𓉐𓂧𓇯𓅃𓁹𓃭𓋞𓌳'.match(/./gu)!
  return paint(W, H, (ctx, s) => {
    ctx.fillStyle = s('goldMatte')
    ctx.fillRect(0, 0, W, H)
    const cols = 26
    const cw = W / cols
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let c = 0; c < cols; c++) {
      if (c === cols / 2 - 1 || c === cols / 2) continue // the queue runs down the middle
      const x = (c + 0.5) * cw
      ctx.fillStyle = s('gap')
      ctx.fillRect(c * cw, 40, 2, H - 80)
      let y = 80
      while (y < H - 70) {
        const size = cw * (0.5 + rand() * 0.22)
        ctx.font = `${size}px ${GLYPH_FONT}`
        ctx.fillStyle = s('gap')
        ctx.fillText(glyphs[Math.floor(rand() * glyphs.length)], x, y)
        y += size * (1.0 + rand() * 0.2)
      }
    }
  })
}

const PLATE = { top: -0.64, bottom: -1.9, cz: -0.18, rz: 0.42, backRx: 0.86 }

function buildPlate() {
  const g = surface(
    120,
    60,
    (u, v, out) => {
      const y = lerp(PLATE.top, PLATE.bottom, v)
      const a = lerp(-Math.PI / 2, Math.PI / 2, u)
      // Narrower across the back (as photographed), widening to meet the collar at the sides.
      const sa = Math.sin(a)
      const outer = collarOuterX(y) - 0.005
      const rx = Math.min(PLATE.backRx, outer) + (outer - Math.min(PLATE.backRx, outer)) * sa ** 4
      out.set(rx * sa, y, PLATE.cz - PLATE.rz * Math.cos(a))
    },
    true,
  )
  return new Mesh(g, pbrMaterial(plateTexture(), { side: DoubleSide, bumpScale: 2.2, clearcoat: 0.15 }))
}

/* --------------------------------------------------------------------------- */
/* Vulture and cobra                                                            */
/* --------------------------------------------------------------------------- */

/** Cobra hood front: a pale-blue band at the base, small inlay cells, gold towards the head. */
function hoodTexture() {
  return paint(256, 512, (ctx, s) => {
    ctx.fillStyle = s('gold')
    ctx.fillRect(0, 0, 256, 512)
    const yFor = (v: number) => (1 - v) * 512
    ctx.fillStyle = s('gap')
    ctx.fillRect(0, yFor(0.16), 256, yFor(0.03) - yFor(0.16))
    ctx.fillStyle = s('pale')
    ctx.fillRect(4, yFor(0.15), 248, yFor(0.04) - yFor(0.15))
    const mats = ['carnDark', 'gold', 'carnDark', 'pale', 'goldDark'] as const
    for (let r = 0; r < 6; r++) {
      const v0 = 0.19 + r * 0.055
      const cells = 6
      for (let c = 0; c < cells; c++) {
        const w = (256 - 70) / cells
        const x0 = 35 + w * c + (r % 2 ? w / 2 - 8 : 0)
        ctx.fillStyle = s('gap')
        ctx.beginPath()
        ctx.roundRect(x0, yFor(v0 + 0.05), w - 4, yFor(v0) - yFor(v0 + 0.05), [0, 0, 9, 9])
        ctx.fill()
        ctx.fillStyle = s(mats[(r + c) % mats.length])
        ctx.beginPath()
        ctx.roundRect(x0 + 3, yFor(v0 + 0.046), w - 10, yFor(v0) - yFor(v0 + 0.046) - 3, [0, 0, 7, 7])
        ctx.fill()
      }
    }
  })
}

function buildUraeus(gold: Material, goldSatin: Material, obsidian: Material) {
  const g = new Group()
  const zf = 0.315

  // Cobra (Wadjet), viewer's right: a spade-shaped hood rising from the brow band.
  const hood = new Shape()
  hood.moveTo(-0.032, 0)
  hood.bezierCurveTo(-0.05, 0.08, -0.105, 0.16, -0.1, 0.24)
  hood.bezierCurveTo(-0.096, 0.3, -0.05, 0.33, -0.03, 0.35)
  hood.lineTo(-0.027, 0.38)
  hood.bezierCurveTo(-0.046, 0.4, -0.042, 0.465, 0, 0.475)
  hood.bezierCurveTo(0.042, 0.465, 0.046, 0.4, 0.027, 0.38)
  hood.lineTo(0.03, 0.35)
  hood.bezierCurveTo(0.05, 0.33, 0.096, 0.3, 0.1, 0.24)
  hood.bezierCurveTo(0.105, 0.16, 0.05, 0.08, 0.032, 0)
  hood.closePath()
  const set = hoodTexture()
  for (const t of [set.map, set.orm, set.bump]) {
    t.repeat.set(1 / 0.21, 1 / 0.475)
    t.offset.set(0.5, 0)
  }
  const cobra = new Mesh(
    new ExtrudeGeometry(hood, { depth: 0.024, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 4, curveSegments: 28 }),
    pbrMaterial(set, { bumpScale: 1.6 }),
  )
  cobra.position.set(0.07, BAND.top - 0.01, zf + 0.012)
  cobra.rotation.x = -0.14
  g.add(cobra)
  for (const s of [-1, 1]) {
    const e = new Mesh(new SphereGeometry(0.008, 10, 8), obsidian)
    e.position.set(0.07 + s * 0.02, BAND.top + 0.43, zf + 0.045)
    g.add(e)
  }
  const coil = new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(0.09, 0.36, zf - 0.01),
      new Vector3(0.19, 0.42, zf - 0.04),
      new Vector3(0.23, 0.5, zf - 0.04),
      new Vector3(0.19, 0.57, zf - 0.1),
      new Vector3(0.1, 0.6, 0.04),
      new Vector3(0.04, 0.62, -0.2),
    ]),
    48,
    0.024,
    12,
  )
  g.add(new Mesh(coil, gold))

  // Vulture (Nekhbet), viewer's left: a tall, rounded head with a heavy hooked beak.
  const vx = -0.122
  const vBase = new Mesh(new SphereGeometry(1, 32, 24), goldSatin)
  vBase.scale.set(0.062, 0.11, 0.058)
  vBase.position.set(vx, BAND.top + 0.1, zf + 0.025)
  g.add(vBase)
  const vHead = new Mesh(new SphereGeometry(1, 32, 24), goldSatin)
  vHead.scale.set(0.058, 0.07, 0.07)
  vHead.position.set(vx, BAND.top + 0.255, zf + 0.055)
  g.add(vHead)
  const beakCurve = new CatmullRomCurve3([
    new Vector3(vx, BAND.top + 0.28, zf + 0.1),
    new Vector3(vx, BAND.top + 0.295, zf + 0.15),
    new Vector3(vx, BAND.top + 0.265, zf + 0.195),
    new Vector3(vx, BAND.top + 0.215, zf + 0.195),
  ])
  const beakGeo = new TubeGeometry(beakCurve, 24, 0.03, 14, false)
  taperTube(
    beakGeo,
    Array.from({ length: 25 }, (_, i) => beakCurve.getPointAt(i / 24)),
    14,
    (t) => 1 - 0.72 * t,
  )
  g.add(new Mesh(beakGeo, goldSatin))
  for (const s of [-1, 1]) {
    const e = new Mesh(new SphereGeometry(0.011, 10, 8), obsidian)
    e.position.set(vx + s * 0.042, BAND.top + 0.275, zf + 0.09)
    g.add(e)
  }
  return g
}

/* --------------------------------------------------------------------------- */

export interface MaskModel {
  group: Group
  hotspots: Record<string, Object3D>
}

/** Vertical extent of the full model, cobra tip to collar edge. */
export const MASK_EXTENT = { top: 0.82, bottom: -1.92 }
/** Front-to-back stretch applied to the whole model (see buildMask). */
export const MASK_DEPTH = 1.65

export function buildMask(): MaskModel {
  const root = new Group()
  root.name = 'tutankhamun-mask'
  const hotspots: Record<string, Object3D> = {}
  const hammered = hammeredRoughness()
  hammered.wrapS = hammered.wrapT = RepeatWrapping
  const gold = goldMaterial({ roughness: 1, roughnessMap: hammered, clearcoat: 0.3 })
  const goldPlain = goldMaterial({ roughness: 0.24 })
  const goldSatin = goldMaterial({ roughness: 0.4, clearcoat: 0 })
  const lapis = glassMaterial('#26347e', 0.16)
  const obsidian = glassMaterial('#060608', 0.05)
  const dark = new MeshPhysicalMaterial({ color: '#120c06', roughness: 0.9 })
  const eye = new MeshPhysicalMaterial({ map: eyeTexture(), roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 })

  // Face and neck.
  root.add(
    new Mesh(
      surface(190, 300, (u, v, out) => {
        const y = lerp(FACE_TOP, FACE_BOTTOM, v)
        const x = (u * 2 - 1) * halfWidth(y)
        out.set(x, y, faceZ(x, y))
      }),
      gold,
    ),
  )
  const inner = new Mesh(new SphereGeometry(0.5, 40, 28), goldMaterial({ roughness: 0.4 }))
  inner.scale.set(1.0, 1.3, 0.75)
  inner.position.set(0, -0.05, -0.25)
  root.add(inner)

  const shadow = goldMaterial({ roughness: 0.55, color: new Color().setRGB(0.45, 0.3, 0.06) })
  const right = buildHalf({ lapis, eye, gold: goldPlain, dark, shadow })
  const left = buildHalf({ lapis, eye, gold: goldPlain, dark, shadow })
  left.scale.x = -1
  root.add(right, left)

  // Headdress, lappets and their gold rims.
  root.add(buildNemes(stripeMaterial(true, false)))
  const lapStripes = stripeMaterial(false, true)
  root.add(buildLappet(1, lapStripes), buildLappet(-1, lapStripes))

  const p = new Vector3()
  const rimPts: Vector3[] = []
  const vOpen = (NEMES_TOP - 0.2615) / (NEMES_TOP - NEMES_BOTTOM)
  for (let k = 0; k <= 70; k++) {
    nemesPoint(0, lerp(1, vOpen, k / 70), p)
    rimPts.push(p.clone())
  }
  for (let k = 1; k <= 70; k++) {
    nemesPoint(1, lerp(vOpen, 1, k / 70), p)
    rimPts.push(p.clone())
  }
  root.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(rimPts), 280, 0.013, 10), goldPlain))
  const hemPts: Vector3[] = []
  for (let k = 0; k <= 80; k++) {
    nemesPoint(k / 80, 1, p)
    hemPts.push(p.clone())
  }
  root.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(hemPts), 200, 0.012, 8), goldPlain))

  // Collar, falcon terminals, back plate.
  root.add(buildCollar())
  root.add(buildFalcon(1, goldSatin, lapis), buildFalcon(-1, goldSatin, lapis))
  const collarRim: Vector3[] = []
  for (let k = 0; k <= 120; k++) collarRim.push(new Vector3(...collarPoint(k / 120, 1)))
  root.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(collarRim), 240, 0.012, 8), goldPlain))
  root.add(buildPlate())

  // Beard: long, plaited, curving forward to a rounded tip.
  const chinZ = faceZ(0, -0.42)
  const curve = new CatmullRomCurve3([
    new Vector3(0, -0.43, chinZ - 0.075),
    new Vector3(0, -0.62, chinZ - 0.05),
    new Vector3(0, -0.88, chinZ - 0.02),
    new Vector3(0, -1.1, chinZ + 0.01),
    new Vector3(0, -1.2, chinZ + 0.045),
  ])
  const tubular = 72
  const radial = 22
  const beardGeo = new TubeGeometry(curve, tubular, 0.088, radial, false)
  taperTube(
    beardGeo,
    Array.from({ length: tubular + 1 }, (_, i) => curve.getPointAt(i / tubular)),
    radial,
    (t) => 1 + 0.12 * t,
  )
  root.add(new Mesh(beardGeo, pbrMaterial(beardTexture(), { bumpScale: 1.8 })))
  const tip = new Mesh(new SphereGeometry(0.1, 28, 20), glassMaterial('#4a3f52', 0.25))
  tip.position.copy(curve.getPointAt(1))
  tip.scale.set(1, 0.85, 1)
  root.add(tip)

  // Queue at the back, bound in gold and blue.
  const qCurve = new CatmullRomCurve3([new Vector3(0, -0.64, -0.74), new Vector3(0, -0.9, -0.72), new Vector3(0, -1.35, -0.71), new Vector3(0, -1.8, -0.71)])
  const qGeo = new TubeGeometry(qCurve, 80, 0.135, 24, false)
  taperTube(
    qGeo,
    Array.from({ length: 81 }, (_, i) => qCurve.getPointAt(i / 80)),
    24,
    (t) => 1 - 0.25 * t,
  )
  root.add(new Mesh(qGeo, pbrMaterial(ringTexture(24), { bumpScale: 2.4 })))
  const qTop = new Mesh(new SphereGeometry(0.135, 24, 16), goldPlain)
  qTop.position.set(0, -0.64, -0.74)
  qTop.scale.set(1, 0.55, 1)
  root.add(qTop)
  const qEnd = new Mesh(new SphereGeometry(0.1, 20, 14), goldPlain)
  qEnd.position.set(0, -1.8, -0.71)
  qEnd.scale.set(1, 0.6, 1)
  root.add(qEnd)

  root.add(buildUraeus(goldPlain, goldSatin, obsidian))

  // Points of interest for Inspect mode.
  marker(root, hotspots, 'uraeus', [-0.03, 0.56, 0.4], [0, 0.2, 1])
  marker(root, hotspots, 'eyes', [EYE.cx, EYE.cy + 0.01, 0.33], [0, 0, 1])
  marker(root, hotspots, 'ears', [-0.46, -0.14, 0.1], [-0.8, 0, 0.6])
  marker(root, hotspots, 'nemes', [0.82, -0.25, 0.0], [0.5, 0, 0.9])
  marker(root, hotspots, 'beard', [0, -0.95, chinZ + 0.1], [0, 0, 1])
  marker(root, hotspots, 'collar', [-0.12, -1.55, 0.16], [0, -0.1, 1])
  marker(root, hotspots, 'inscription', [0.45, -1.25, -0.56], [0, 0, -1])

  // Centre the mask on its own height so the director can pose it.
  const holder = new Group()
  root.position.y = -(MASK_EXTENT.top + MASK_EXTENT.bottom) / 2
  // The original is 49 cm deep for 39.3 cm wide; the profile was modelled at ~60% depth.
  root.scale.z = MASK_DEPTH
  holder.add(root)
  return { group: holder, hotspots }
}
