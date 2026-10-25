import type { ArtifactId, ChapterId, Vec3 } from './types'

/**
 * One "camera + light + atmosphere" keyframe. The director interpolates between
 * these as the visitor scrolls, holding still around each chapter's anchor so
 * the text can be read.
 */
export interface SceneKey {
  maskRot: Vec3
  maskPos: Vec3
  maskScale: number
  camPos: Vec3
  camTarget: Vec3
  keyColor: string
  keyIntensity: number
  keyPos: Vec3
  rimColor: string
  rimIntensity: number
  rimPos: Vec3
  torchColor: string
  torchIntensity: number
  torchPos: Vec3
  ambientColor: string
  ambient: number
  env: number
  bg: string
  wallTint: string
  wallLight: number
  glyphs: number
  museum: number
  beam: number
  beamColor: string
  dust: number
  bloom: number
}

export interface ChapterDef {
  id: ChapterId
  /** Scroll length of the chapter, in screen heights. */
  weight: number
  artifact: ArtifactId | null
  scene: SceneKey
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'prologue',
    weight: 1.2,
    artifact: null,
    scene: {
      maskRot: [0.03, 0, 0],
      maskPos: [0, -0.04, 0],
      maskScale: 1.1,
      camPos: [0, 0, 6.4],
      camTarget: [0, 0, 0],
      keyColor: '#ffd59a',
      keyIntensity: 3.6,
      keyPos: [0.4, 4.6, 2.6],
      rimColor: '#ffb26a',
      rimIntensity: 2.6,
      rimPos: [-3, 2, -3],
      torchColor: '#ff9440',
      torchIntensity: 0.4,
      torchPos: [-2.6, -0.6, 2.2],
      ambientColor: '#ffdcb0',
      ambient: 0.05,
      env: 0.55,
      bg: '#040302',
      wallTint: '#6b4a2a',
      wallLight: 0.38,
      glyphs: 0.55,
      museum: 0,
      beam: 1,
      beamColor: '#ffd9a0',
      dust: 1,
      bloom: 0.75,
    },
  },
  {
    id: 'discovery',
    weight: 1.8,
    artifact: 'anubis',
    scene: {
      maskRot: [0.02, -0.62, 0],
      maskPos: [0, -0.06, 0.12],
      maskScale: 1.14,
      camPos: [0.15, 0.08, 6.1],
      camTarget: [0, 0, 0],
      keyColor: '#ffc078',
      keyIntensity: 3.4,
      keyPos: [-3.6, 1.6, 3],
      rimColor: '#ff9b4c',
      rimIntensity: 3.2,
      rimPos: [3, 2.2, -2.6],
      torchColor: '#ff8f3a',
      torchIntensity: 2.4,
      torchPos: [-2.2, -0.3, 2.3],
      ambientColor: '#ffc890',
      ambient: 0.05,
      env: 0.6,
      bg: '#060403',
      wallTint: '#7c5733',
      wallLight: 0.8,
      glyphs: 0.9,
      museum: 0,
      beam: 0.55,
      beamColor: '#ffcf8a',
      dust: 1,
      bloom: 0.65,
    },
  },
  {
    id: 'boyking',
    weight: 1.8,
    artifact: 'throne',
    scene: {
      maskRot: [0.02, 1.02, 0],
      maskPos: [0, -0.02, 0.22],
      maskScale: 1.18,
      camPos: [-0.1, 0.05, 5.9],
      camTarget: [0, 0, 0],
      keyColor: '#ffe2ad',
      keyIntensity: 4.2,
      keyPos: [3.2, 2.6, 3.4],
      rimColor: '#ffcf86',
      rimIntensity: 3.2,
      rimPos: [-3, 2.2, -2.6],
      torchColor: '#ffa858',
      torchIntensity: 1.1,
      torchPos: [2.6, 0, 2],
      ambientColor: '#ffe0b4',
      ambient: 0.08,
      env: 0.85,
      bg: '#090603',
      wallTint: '#8c6537',
      wallLight: 0.92,
      glyphs: 0.7,
      museum: 0,
      beam: 0.4,
      beamColor: '#ffe0a8',
      dust: 0.75,
      bloom: 0.75,
    },
  },
  {
    id: 'eternity',
    weight: 1.8,
    artifact: 'canopic',
    scene: {
      maskRot: [-0.42, -0.22, 0.02],
      maskPos: [0, -0.12, 0.08],
      maskScale: 1.16,
      camPos: [0, 0.55, 6.1],
      camTarget: [0, -0.08, 0],
      keyColor: '#aebcff',
      keyIntensity: 2.6,
      keyPos: [0.2, 4.4, 1.2],
      rimColor: '#ffae4e',
      rimIntensity: 4.2,
      rimPos: [2.6, 1, -3],
      torchColor: '#ff8434',
      torchIntensity: 1.7,
      torchPos: [-2, -1, 1.6],
      ambientColor: '#9fb0ff',
      ambient: 0.04,
      env: 0.5,
      bg: '#020309',
      wallTint: '#36435f',
      wallLight: 0.55,
      glyphs: 1,
      museum: 0,
      beam: 0.85,
      beamColor: '#aebcff',
      dust: 0.6,
      bloom: 0.85,
    },
  },
  {
    id: 'legacy',
    weight: 1.6,
    artifact: null,
    scene: {
      maskRot: [0, 0, 0],
      maskPos: [0, 0, 0],
      maskScale: 1.04,
      camPos: [0, 0, 6.6],
      camTarget: [0, 0, 0],
      keyColor: '#fff1dc',
      keyIntensity: 3.2,
      keyPos: [1.4, 3.2, 4],
      rimColor: '#ffe2b0',
      rimIntensity: 2.2,
      rimPos: [-2, 2.6, -3],
      torchColor: '#ffb070',
      torchIntensity: 0,
      torchPos: [-2, 0, 2],
      ambientColor: '#fff3e2',
      ambient: 0.12,
      env: 1.1,
      bg: '#0b0907',
      wallTint: '#5c4b3a',
      wallLight: 0.6,
      glyphs: 0.1,
      museum: 1,
      beam: 0.25,
      beamColor: '#fff3e0',
      dust: 0.3,
      bloom: 0.55,
    },
  },
]

export const CHAPTER_COUNT = CHAPTERS.length
export const ARTIFACT_CHAPTER: Record<ArtifactId, number> = {
  anubis: 1,
  throne: 2,
  canopic: 3,
}
export const ARTIFACT_IDS: ArtifactId[] = ['anubis', 'throne', 'canopic']
