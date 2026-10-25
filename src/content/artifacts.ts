import type { ArtifactId, Provenance, TreasureId } from './types'

export interface ArtifactMeta {
  id: TreasureId
  /** Hotspot ids, in the order they are listed in Inspect mode. */
  hotspots: string[]
  provenance: Provenance
  /**
   * Optional licensed GLB that replaces the procedural model, e.g. '/models/anubis.glb'.
   * Leave null to use the in-code reconstruction. See README › "Swapping in scanned models".
   */
  glb: string | null
  /**
   * Gallery or location text for the museum visit. Only fill this from verified,
   * official GEM data — the UI falls back to "ask GEM staff" while it is null.
   */
  gemLocation: { en: string; ar: string } | null
}

export const ARTIFACTS: Record<ArtifactId, ArtifactMeta> = {
  anubis: {
    id: 'anubis',
    hotspots: ['ears', 'eyes', 'collar', 'black', 'shrine', 'poles'],
    provenance: 'reconstruction',
    glb: null,
    gemLocation: null,
  },
  throne: {
    id: 'throne',
    hotspots: ['aten', 'scene', 'lions', 'cobras', 'legs'],
    provenance: 'reconstruction',
    glb: null,
    gemLocation: null,
  },
  canopic: {
    id: 'canopic',
    hotspots: ['goddesses', 'uraei', 'chest', 'sledge'],
    provenance: 'reconstruction',
    glb: null,
    gemLocation: null,
  },
}

/** The mask (centre stage) is an in-code reconstruction fitted to photographs of the original. */
export const MASK: ArtifactMeta = {
  id: 'mask',
  hotspots: ['uraeus', 'eyes', 'ears', 'nemes', 'beard', 'collar', 'inscription'],
  provenance: 'reconstruction',
  glb: null,
  // From the Grand Egyptian Museum's collection record for the mask.
  gemLocation: { en: 'Tutankhamun Galleries · GEM no. 8', ar: 'قاعات توت عنخ آمون · رقم ٨ في المتحف' },
}

export const TREASURES: Record<TreasureId, ArtifactMeta> = { ...ARTIFACTS, mask: MASK }
export const TREASURE_IDS: TreasureId[] = ['mask', 'anubis', 'throne', 'canopic']
