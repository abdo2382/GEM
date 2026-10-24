/**
 * Photographs projected onto the mask model so it carries the real object's colours
 * and inlay patterns. Each view records how the photo lines up with the model:
 * the camera direction (yaw/pitch, degrees) and an orthographic fit (pixels per model
 * unit and the pixel where the model origin falls). Fits were measured from landmarks
 * (eyes, ears, beard tip, collar, silhouette) on each photo.
 *
 * Image rights: these photographs belong to their photographers. Before publishing,
 * confirm the licence of each and fill in `attribution` (it is shown in the credits).
 * Set `enabled: false` to fall back to the fully procedural materials.
 */
export interface PhotoView {
  src: string
  width: number
  height: number
  yaw: number
  pitch: number
  scale: number
  scaleY?: number
  cx: number
  cy: number
  /** Re-use the photo for the opposite side of the (near-symmetric) mask. */
  mirror?: boolean
  weight: number
}

export const MASK_PHOTOS: {
  enabled: boolean
  attribution: { en: string; ar: string } | null
  views: PhotoView[]
} = {
  enabled: new URLSearchParams(location.search).get('photo') !== '0',
  attribution: null,
  views: [
    // Taken ~3.5° off-axis: the face sits right of the headdress outline's centre.
    { src: '/textures/mask/front.webp', width: 1499, height: 2000, yaw: -3.5, pitch: 0, scale: 630, cx: 766, cy: 617.6, weight: 3 },
    { src: '/textures/mask/back.webp', width: 1333, height: 2000, yaw: 180, pitch: 0, scale: 588, cx: 655, cy: 643, weight: 1.3 },
    { src: '/textures/mask/side.webp', width: 1559, height: 2000, yaw: 30.5, pitch: -21, scale: 681.8, cx: 698.2, cy: 470.2, weight: 1 },
    { src: '/textures/mask/side.webp', width: 1559, height: 2000, yaw: 30.5, pitch: -21, scale: 681.8, cx: 698.2, cy: 470.2, weight: 1, mirror: true },
  ],
}
