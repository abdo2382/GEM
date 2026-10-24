export type Lang = 'en' | 'ar'
export type ChapterId = 'prologue' | 'discovery' | 'boyking' | 'eternity' | 'legacy'
export type ArtifactId = 'anubis' | 'throne' | 'canopic'
/** Anything a visitor can inspect and save: the three artifacts and the mask itself. */
export type TreasureId = ArtifactId | 'mask'
export type Vec3 = [number, number, number]

/**
 * Where a digital asset comes from. Every 3D object in the experience carries
 * one of these so visitors can tell reproductions from reconstructions.
 */
export type Provenance = 'reproduction' | 'reconstruction' | 'illustrative'
