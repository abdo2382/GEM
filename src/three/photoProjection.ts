import {
  Color,
  DoubleSide,
  Euler,
  Matrix4,
  DepthTexture,
  MeshBasicMaterial,
  OrthographicCamera,
  Quaternion,
  SRGBColorSpace,
  Scene,
  TextureLoader,
  Vector3,
  WebGLRenderTarget,
  type Material,
  type Mesh,
  type MeshPhysicalMaterial,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from 'three'
import type { PhotoView } from '../content/maskPhotos'

/*
 * Projective texturing of photographs onto the mask. Each photo acts like a slide
 * projector placed where the camera stood; a depth map rendered from the same place
 * stops it painting surfaces it could not see. Photos are blended by how squarely a
 * surface faces each projector, and the procedural materials show through wherever
 * no photo reaches.
 */

const MAX = 4

export interface PhotoProjection {
  uniforms: Record<string, { value: unknown }>
  cameras: OrthographicCamera[]
  /** Renders the occlusion maps; call with the model at its rest (identity) pose. */
  bakeDepth: (gl: WebGLRenderer, model: Object3D) => void
  /** Keep the projection attached to the model as it moves. */
  update: (model: Object3D) => void
  dispose: () => void
}

function viewCamera(v: PhotoView, origin: Vector3) {
  const sy = v.scaleY ?? v.scale
  const cam = new OrthographicCamera(-v.cx / v.scale, (v.width - v.cx) / v.scale, v.cy / sy, (v.cy - v.height) / sy, 0.1, 30)
  const q = new Quaternion().setFromEuler(new Euler((v.pitch * Math.PI) / 180, (v.yaw * Math.PI) / 180, 0, 'YXZ'))
  cam.quaternion.copy(q)
  cam.position.set(0, 0, 12).applyQuaternion(q).add(origin)
  cam.updateMatrixWorld(true)
  return cam
}

/**
 * `origin` is where the model's own origin (the frame the photo fits were measured in)
 * sits inside the group the projection is attached to.
 */
export function createPhotoProjection(views: PhotoView[], origin: Vector3, onReady: () => void): PhotoProjection {
  const loader = new TextureLoader()
  const uniforms: Record<string, { value: unknown }> = {
    uRootInv: { value: new Matrix4() },
    uPhotoOn: { value: 0 },
    uPhotoMetal: { value: 0.35 },
    uPhotoRough: { value: 0.38 },
    uPhotoEmissive: { value: 0.25 },
    uPhotoTint: { value: new Color(1, 1, 1) },
    // Share of each photographed pixel shown exactly as photographed (the rest is lit live).
    uPhotoUnlit: { value: 0.97 },
  }
  const cameras: OrthographicCamera[] = []
  const targets: WebGLRenderTarget[] = []
  const textures = new Map<string, Texture>()
  let pending = 0
  const dirs: Vector3[] = []

  views.slice(0, MAX).forEach((v, i) => {
    const cam = viewCamera(v, origin)
    cameras.push(cam)
    let tex = textures.get(v.src)
    if (!tex) {
      pending++
      tex = loader.load(v.src, () => {
        pending--
        if (pending === 0) {
          uniforms.uPhotoOn.value = 1
          onReady()
        }
      })
      tex.colorSpace = SRGBColorSpace
      tex.anisotropy = 8
      textures.set(v.src, tex)
    }
    const aspect = v.height / v.width
    const w = 1024
    const h = Math.round(1024 * aspect)
    // Hardware depth: sampled directly as the occlusion map (no packing needed).
    const rt = new WebGLRenderTarget(w, h, { depthTexture: new DepthTexture(w, h) })
    targets.push(rt)
    const dir = new Vector3()
    cam.getWorldDirection(dir)
    dirs.push(dir)
    uniforms[`uPTex${i}`] = { value: tex }
    uniforms[`uPDep${i}`] = { value: rt.depthTexture }
    uniforms[`uPMat${i}`] = { value: new Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse) }
    uniforms[`uPDir${i}`] = { value: dir }
    uniforms[`uPMir${i}`] = { value: v.mirror ? -1 : 1 }
    uniforms[`uPW${i}`] = { value: v.weight }
  })
  // Unused slots are switched off.
  for (let i = views.length; i < MAX; i++) {
    uniforms[`uPTex${i}`] = { value: null }
    uniforms[`uPDep${i}`] = { value: null }
    uniforms[`uPMat${i}`] = { value: new Matrix4() }
    uniforms[`uPDir${i}`] = { value: new Vector3(0, 0, -1) }
    uniforms[`uPMir${i}`] = { value: 1 }
    uniforms[`uPW${i}`] = { value: 0 }
  }

  const depthMat = new MeshBasicMaterial({ side: DoubleSide })

  return {
    uniforms,
    cameras,
    bakeDepth(gl, model) {
      const parent = model.parent
      const saved = { p: model.position.clone(), q: model.quaternion.clone(), s: model.scale.clone() }
      const scene = new Scene()
      parent?.remove(model)
      scene.add(model)
      model.position.set(0, 0, 0)
      model.quaternion.identity()
      model.scale.set(1, 1, 1)
      model.updateMatrixWorld(true)
      scene.overrideMaterial = depthMat
      const prevTarget = gl.getRenderTarget()
      const prevColor = gl.getClearColor(new Color())
      const prevAlpha = gl.getClearAlpha()
      gl.setClearColor(0xffffff, 1)
      cameras.forEach((cam, i) => {
        // Mirrored views share their twin's occlusion (the mask is near-symmetric).
        if (views[i].mirror) {
          const twin = views.findIndex((v) => v.src === views[i].src && !v.mirror)
          if (twin >= 0) uniforms[`uPDep${i}`].value = targets[twin].depthTexture
          return
        }
        gl.setRenderTarget(targets[i])
        gl.clear(true, true, true)
        gl.render(scene, cam)
      })
      gl.setRenderTarget(prevTarget)
      gl.setClearColor(prevColor, prevAlpha)
      scene.remove(model)
      parent?.add(model)
      model.position.copy(saved.p)
      model.quaternion.copy(saved.q)
      model.scale.copy(saved.s)
      model.updateMatrixWorld(true)
    },
    update(model) {
      ;(uniforms.uRootInv.value as Matrix4).copy(model.matrixWorld).invert()
    },
    dispose() {
      targets.forEach((t) => t.dispose())
      textures.forEach((t) => t.dispose())
      depthMat.dispose()
    },
  }
}

const tapGLSL = (i: number) => `
  {
    vec3 p = vRootPos; vec3 n = nR;
    p.x *= uPMir${i}; n.x *= uPMir${i};
    vec4 c = uPMat${i} * vec4(p, 1.0);
    vec3 ndc = c.xyz / c.w;
    vec2 uv = ndc.xy * 0.5 + 0.5;
    if (uPW${i} > 0.0 && uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
      float stored = texture2D(uPDep${i}, uv).r;
      float vis = step(ndc.z * 0.5 + 0.5 - 0.003, stored);
      float facing = clamp(dot(n, -uPDir${i}), 0.0, 1.0);
      vec4 t = texture2D(uPTex${i}, uv);
      // Near winner-takes-all: each surface is coloured by the photo that sees it most squarely.
      float f2 = facing * facing; float f4 = f2 * f2; float f8 = f4 * f4;
      float f16 = f8 * f8;
      float w = f16 * f16 * vis * uPW${i} * t.a;
      phAcc += vec4(t.rgb * w, w);
      // Unsharpened weights: a fallback for surfaces seen only edge-on.
      float wl = facing * vis * uPW${i} * t.a;
      phLin += vec4(t.rgb * wl, wl);
      phSeen = max(phSeen, vis * t.a * step(0.001, facing));${
        i === 0
          ? `
      // The first view is the primary (front) photo: it wins wherever it sees the surface
      // within ~60°, so the front of the mask reproduces that photograph exactly.
      phPrimary = t.rgb;
      phPrimaryW = smoothstep(0.42, 0.62, facing) * vis * t.a;`
          : ''
      }
    }
  }`

const fragHeader = `
uniform float uPhotoOn;
uniform float uPhotoMetal;
uniform float uPhotoRough;
uniform float uPhotoEmissive;
uniform vec3 uPhotoTint;
uniform float uPhotoUnlit;
// Inverse of three's ACESFilmicToneMapping, so a photographed pixel survives tone mapping unchanged.
vec3 phInvRRT(vec3 y) {
  y = clamp(y, 0.0, 0.975);
  vec3 a = 1.0 - 0.983729 * y;
  vec3 b = 0.0245786 - 0.432951 * y;
  vec3 c = -(0.000090537 + 0.238081 * y);
  return (-b + sqrt(max(b * b - 4.0 * a * c, 0.0))) / (2.0 * a);
}
vec3 phInvACES(vec3 y) {
  const mat3 invOut = mat3(vec3(0.643038, 0.059269, 0.005962), vec3(0.311187, 0.931436, 0.063929), vec3(0.045775, 0.009295, 0.930118));
  const mat3 invIn = mat3(vec3(1.764741, -0.147028, -0.036337), vec3(-0.675778, 1.160252, -0.162436), vec3(-0.088963, -0.013224, 1.198773));
  return max(invIn * phInvRRT(invOut * y) * 0.6, 0.0);
}
${Array.from({ length: MAX }, (_, i) => `uniform sampler2D uPTex${i};\nuniform sampler2D uPDep${i};\nuniform mat4 uPMat${i};\nuniform vec3 uPDir${i};\nuniform float uPMir${i};\nuniform float uPW${i};`).join('\n')}
varying vec3 vRootPos;
varying vec3 vRootNormal;
`

const fragBlend = `
  vec3 nR = normalize(vRootNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec4 phAcc = vec4(0.0);
  vec4 phLin = vec4(0.0);
  float phSeen = 0.0;
  vec3 phPrimary = vec3(0.0);
  float phPrimaryW = 0.0;
  if (uPhotoOn > 0.5) {
    ${Array.from({ length: MAX }, (_, i) => tapGLSL(i)).join('\n')}
  }
  vec3 phColor = phAcc.a > 1e-7 ? phAcc.rgb / phAcc.a : (phLin.a > 1e-5 ? phLin.rgb / phLin.a : vec3(0.0));
  phColor = mix(phColor, phPrimary, phPrimaryW) * uPhotoTint;
  // Any surface a photo actually sees takes the photo; the procedural material only fills
  // what no camera saw.
  float phCover = phSeen * uPhotoOn;
  diffuseColor.rgb = mix(diffuseColor.rgb, phColor, phCover);
  metalnessFactor = mix(metalnessFactor, uPhotoMetal, phCover);
  roughnessFactor = mix(roughnessFactor, uPhotoRough, phCover);
`

/** Inject the projection into every lit material under `root` (chaining existing hooks). */
export function applyPhotoProjection(root: Object3D, uniforms: Record<string, { value: unknown }>) {
  const seen = new Set<Material>()
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as MeshPhysicalMaterial[]
    for (const m of mats) {
      if (seen.has(m) || !('metalness' in m)) continue
      seen.add(m)
      const prev = m.onBeforeCompile.bind(m)
      const prevKey = m.customProgramCacheKey.bind(m)
      m.onBeforeCompile = (shader, renderer) => {
        prev(shader, renderer)
        Object.assign(shader.uniforms, uniforms)
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nuniform mat4 uRootInv;\nvarying vec3 vRootPos;\nvarying vec3 vRootNormal;')
          .replace(
            '#include <project_vertex>',
            `#include <project_vertex>
            vec4 rp = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
              rp = instanceMatrix * rp;
            #endif
            vRootPos = (uRootInv * modelMatrix * rp).xyz;
            vRootNormal = normalize((uRootInv * vec4(inverseTransformDirection(transformedNormal, viewMatrix), 0.0)).xyz);`,
          )
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${fragHeader}`)
          .replace('#include <normal_fragment_begin>', `${fragBlend}\n#include <normal_fragment_begin>`)
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += phColor * phCover * uPhotoEmissive;')
          .replace(
            '#include <opaque_fragment>',
            // Every path ends in ACES (the renderer on screen, the post-process stack otherwise),
            // so the photographed colour is pre-compensated in both cases.
            `outgoingLight = mix(outgoingLight, phInvACES(phColor), phCover * uPhotoUnlit);
            #include <opaque_fragment>`,
          )
      }
      m.customProgramCacheKey = () => `${prevKey()}|photo`
      m.needsUpdate = true
    }
  })
}
