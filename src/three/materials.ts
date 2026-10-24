import { Color, DoubleSide, MeshPhysicalMaterial, Vector3, type Material, type Texture } from 'three'
import type { PBRSet } from './textures'

/** Gold F0 in linear space, matched to the yellow of the mask's high-carat gold. */
export const GOLD = new Color().setRGB(1.0, 0.79, 0.28)

export function goldMaterial(opts: { roughness?: number; roughnessMap?: Texture; clearcoat?: number; color?: Color; side?: typeof DoubleSide } = {}) {
  return new MeshPhysicalMaterial({
    color: opts.color ?? GOLD,
    metalness: 1,
    roughness: opts.roughness ?? 0.24,
    roughnessMap: opts.roughnessMap ?? null,
    clearcoat: opts.clearcoat ?? 0.2,
    clearcoatRoughness: 0.25,
    side: opts.side,
  })
}

export function pbrMaterial(set: PBRSet, opts: { bumpScale?: number; side?: typeof DoubleSide; clearcoat?: number } = {}) {
  return new MeshPhysicalMaterial({
    map: set.map,
    metalnessMap: set.orm,
    roughnessMap: set.orm,
    bumpMap: set.bump,
    bumpScale: opts.bumpScale ?? 2.2,
    metalness: 1,
    roughness: 1,
    clearcoat: opts.clearcoat ?? 0.35,
    clearcoatRoughness: 0.18,
    side: opts.side,
  })
}

export function glassMaterial(color: string, roughness = 0.08) {
  return new MeshPhysicalMaterial({
    color: new Color(color),
    metalness: 0,
    roughness,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    ior: 1.55,
    specularIntensity: 1,
  })
}

/** Black resin over wood, as on the Anubis figure: deep, glossy, slightly warm. */
export function blackResinMaterial() {
  return new MeshPhysicalMaterial({
    color: new Color('#0d0b0a'),
    metalness: 0,
    roughness: 0.32,
    clearcoat: 0.9,
    clearcoatRoughness: 0.22,
    sheen: 0.3,
    sheenColor: new Color('#3a2a1c'),
  })
}

export function woodMaterial() {
  return new MeshPhysicalMaterial({ color: new Color('#3b2414'), roughness: 0.7, metalness: 0 })
}

/* ------------------------------------------------------------------------- */
/* Dissolve: artifacts emerge from (and return to) the dark as glowing dust.  */
/* ------------------------------------------------------------------------- */

export interface Dissolve {
  uDissolve: { value: number }
  uEdge: { value: Color }
  uOrigin: { value: Vector3 }
  uScale: { value: number }
}

export function createDissolve(edge = '#ffb347'): Dissolve {
  return {
    uDissolve: { value: 1 },
    uEdge: { value: new Color(edge).multiplyScalar(2.2) },
    uOrigin: { value: new Vector3() },
    uScale: { value: 1 },
  }
}

const noiseGLSL = /* glsl */ `
uniform float uDissolve;
uniform vec3 uEdge;
uniform vec3 uOrigin;
uniform float uScale;
varying vec3 vDPos;
float dHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float dNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(dHash(i), dHash(i + vec3(1, 0, 0)), f.x), mix(dHash(i + vec3(0, 1, 0)), dHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(dHash(i + vec3(0, 0, 1)), dHash(i + vec3(1, 0, 1)), f.x), mix(dHash(i + vec3(0, 1, 1)), dHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
`

export function applyDissolve(material: Material, d: Dissolve) {
  const m = material as MeshPhysicalMaterial
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uDissolve = d.uDissolve
    shader.uniforms.uEdge = d.uEdge
    shader.uniforms.uOrigin = d.uOrigin
    shader.uniforms.uScale = d.uScale
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDPos;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 dWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          dWorld = instanceMatrix * dWorld;
        #endif
        vDPos = (modelMatrix * dWorld).xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${noiseGLSL}`)
      .replace(
        '#include <clipping_planes_fragment>',
        `vec3 dLocal = (vDPos - uOrigin) / uScale;
        float dN = dNoise(dLocal * 5.0) * 0.65 + dNoise(dLocal * 17.0) * 0.35;
        float dH = clamp(dLocal.y * 0.45 + 0.5, 0.0, 1.0);
        float dVal = mix(dN, dH, 0.4);
        if (dVal < uDissolve) discard;
        float dEdge = (1.0 - smoothstep(0.0, 0.035, dVal - uDissolve)) * smoothstep(0.0, 0.08, uDissolve);
        #include <clipping_planes_fragment>`,
      )
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEdge * dEdge;')
  }
  m.customProgramCacheKey = () => 'dissolve'
  m.needsUpdate = true
}
