import { Quaternion, Vector3, type Camera, type Object3D } from 'three'
import { hotspotEls } from '../state/hotspots'

const pos = new Vector3()
const normal = new Vector3()
const toCam = new Vector3()
const quat = new Quaternion()

/**
 * Place the DOM hotspot buttons over their 3D markers, fading out those whose
 * surface faces away from the camera. `reveal` (0..1) fades them all in.
 */
export function projectHotspots(hotspots: Record<string, Object3D>, camera: Camera, width: number, height: number, reveal: number) {
  for (const [id, marker] of Object.entries(hotspots)) {
    const el = hotspotEls.get(id)
    if (!el) continue
    marker.getWorldPosition(pos)
    marker.getWorldQuaternion(quat)
    normal.copy(marker.userData.normal as Vector3).applyQuaternion(quat)
    toCam.copy(camera.position).sub(pos).normalize()
    const facing = normal.dot(toCam)
    pos.project(camera)
    const x = (pos.x * 0.5 + 0.5) * width
    const y = (-pos.y * 0.5 + 0.5) * height
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
    const visible = facing > -0.15
    el.style.opacity = visible ? String(Math.min(1, (facing + 0.15) * 3) * reveal) : '0'
    el.style.pointerEvents = visible && reveal > 0.5 ? 'auto' : 'none'
  }
}
