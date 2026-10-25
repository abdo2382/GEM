// Frame-exact composition: render.mjs calls window.renderFrame(n) for every frame and
// captures the stage. Type runs on one paused GSAP timeline (seeked, never played);
// footage, photographs and the visitor's pointer are set directly per frame.
import { CLIPS, TEXT, DURATION } from './edit.js'

const VERTICAL = new URLSearchParams(location.search).get('format') === 'vertical'
const W = VERTICAL ? 1080 : 1920
const H = VERTICAL ? 1920 : 1080
const FPS = 30
const stage = document.getElementById('stage')
document.documentElement.style.setProperty('--w', `${W}px`)
document.documentElement.style.setProperty('--h', `${H}px`)
if (VERTICAL) stage.classList.add('v')

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const smooth = (t) => t * t * (3 - 2 * t)
const pad = (n) => String(n).padStart(5, '0')
const el = (tag, cls, parent = stage) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  parent.appendChild(e)
  return e
}

// Each take's recorded size, frame count and pointer log.
const takes = {}
for (const id of new Set(CLIPS.filter((c) => c.take).map((c) => c.take))) {
  takes[id] = await (await fetch(`../frames/${id}/take.json`)).json()
}

/** Where a take's screen sits in this frame, as a rectangle. */
function screenRect(clip) {
  const take = takes[clip.take]
  if (clip.layout === 'phone') {
    const h = VERTICAL ? 1300 : 860
    const w = (h * take.size.width) / take.size.height
    const cx = VERTICAL ? W / 2 : 590
    const cy = VERTICAL ? 130 + h / 2 + 13 : H / 2
    return { x: cx - w / 2, y: cy - h / 2, w, h }
  }
  if (clip.layout === 'full') {
    const w = VERTICAL ? 1000 : 1613
    const h = (w * 9) / 16
    return { x: (W - w) / 2, y: VERTICAL ? 660 : 40, w, h }
  }
  return { x: 0, y: 0, w: W, h: H }
}

// Build the layers ------------------------------------------------------------
for (const c of CLIPS) {
  const layer = el('div', 'layer')
  c.layer = layer
  if (c.kind === 'backdrop') {
    layer.classList.add('backdrop')
    continue
  }
  if (c.kind === 'photo') {
    c.img = el('img', 'cover photo', layer)
    c.img.src = `/public/archive/${c.src}.webp`
    if (c.dim) layer.style.background = '#000'
    continue
  }
  const r = screenRect(c)
  c.rect = r
  if (c.layout === 'hero') {
    c.img = el('img', 'hero', layer)
  } else if (c.layout === 'full') {
    if (VERTICAL) c.bg = el('img', 'blurbg', layer)
    const frame = el('div', 'framed', layer)
    Object.assign(frame.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` })
    c.img = el('img', '', frame)
  } else {
    const phone = el('div', 'phone', layer)
    Object.assign(phone.style, { left: `${r.x - 13}px`, top: `${r.y - 13}px`, width: `${r.w + 26}px`, height: `${r.h + 26}px` })
    c.img = el('img', '', el('div', 'phone__screen', phone))
  }
  const kind = takes[c.take].size.mobile ? 'touch' : 'mouse'
  if (kind === 'touch') c.pointerEl = el('div', 'touch', layer)
  else {
    c.pointerEl = el('div', 'cursor', layer)
    c.pointerEl.innerHTML =
      '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 2l7.5 19 2.6-7.4L20.5 11z" fill="#fbf3dd" stroke="#1a120b" stroke-width="1.4" stroke-linejoin="round"/></svg><i class="ring"></i>'
  }
  c.pointerEl.style.opacity = '0'
}

const scrim = el('div', 'scrim')
// Vertical only: a band behind the question when it sits over a full-frame photograph.
const scrimMid = el('div', 'scrim scrim--mid')

// Type -------------------------------------------------------------------------
const tl = gsap.timeline({ paused: true })
const rule = el('div', 'rule')
for (const item of TEXT) {
  const t = el('div', `t t--${item.style}`)
  if (item.style === 'title') {
    t.innerHTML = [...item.text].map((ch) => `<span class="ch">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')
    const letters = t.querySelectorAll('.ch')
    tl.set(t, { opacity: 1 }, item.in)
    tl.fromTo(letters, { opacity: 0, y: 26, filter: 'blur(14px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, stagger: 0.07, ease: 'power3.out' }, item.in)
    tl.fromTo(rule, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, item.in + 0.6)
    tl.to([t, rule], { opacity: 0, duration: 0.9, ease: 'power2.inOut' }, item.out - 0.9)
    continue
  }
  t.textContent = item.text
  const centred = item.style === 'statement' || item.style === 'question' || item.style === 'sideBig'
  const base = centred ? (item.style === 'sideBig' && !VERTICAL ? { yPercent: -50 } : VERTICAL && item.style === 'sideBig' ? {} : { xPercent: -50, yPercent: -50 }) : {}
  const small = item.style === 'credit' || item.style === 'endcredit' || item.style === 'note'
  const enter = small ? 0.9 : 1.1
  tl.fromTo(t, { ...base, opacity: 0, y: 22, filter: 'blur(8px)' }, { ...base, opacity: small ? 0.8 : 1, y: 0, filter: 'blur(0px)', duration: enter, ease: 'power3.out' }, item.in)
  tl.to(t, { opacity: 0, y: -8, duration: 0.7, ease: 'power2.inOut' }, item.out - 0.7)
  if (item.style === 'caption' || (VERTICAL && item.style === 'question')) {
    // Captions over full-bleed pictures sit on a soft scrim; framed footage has its own band.
    const overPicture = CLIPS.some((c) => (c.kind === 'photo' || c.layout === 'hero') && c.start <= item.in && c.end >= item.out)
    if (overPicture) {
      const band = item.style === 'question' ? scrimMid : scrim
      tl.to(band, { opacity: 1, duration: 0.6 }, item.in - 0.2)
      tl.to(band, { opacity: 0, duration: 0.6 }, item.out)
    }
  }
}
tl.set({}, {}, DURATION)

// Per frame --------------------------------------------------------------------
function fade(c, t) {
  const a = c.fadeIn ? smooth(clamp((t - c.start) / c.fadeIn, 0, 1)) : 1
  const b = c.fadeOut ? smooth(clamp((c.end - t) / c.fadeOut, 0, 1)) : 1
  return Math.min(a, b)
}

const loads = []
function setSrc(img, src) {
  if (img.getAttribute('src') === src) return
  img.src = src
  loads.push(img.decode().catch(() => undefined))
}

window.renderFrame = async (n) => {
  const t = n / FPS
  tl.seek(t, false)
  for (const c of CLIPS) {
    const on = t >= c.start && t < c.end
    c.layer.style.visibility = on ? 'visible' : 'hidden'
    if (!on) continue
    const k = clamp((t - c.start) / (c.end - c.start), 0, 1)
    c.layer.style.opacity = String(fade(c, t))
    if (c.kind === 'photo') {
      const { s, x, y } = c.kb
      const e = smooth(k)
      c.img.style.transform = `translate(${x[0] + (x[1] - x[0]) * e}%, ${y[0] + (y[1] - y[0]) * e}%) scale(${s[0] + (s[1] - s[0]) * e})`
      if (c.dim) c.img.style.opacity = String(1 - (1 - c.dim) * smooth(clamp((t - c.start - 0.4) / 1.2, 0, 1)))
      continue
    }
    if (c.kind !== 'footage') continue
    const take = takes[c.take]
    const f = Math.min(take.frames - 1, c.from + Math.floor((t - c.start) * FPS))
    const src = `../frames/${c.take}/${pad(f)}.jpg`
    setSrc(c.img, src)
    if (c.bg) setSrc(c.bg, src)
    if (c.layout === 'hero') {
      // Lifted and feathered into black, so titles sit beneath the mask on clean ground.
      const z = (c.zoom[0] + (c.zoom[1] - c.zoom[0]) * smooth(k)) * (VERTICAL ? 1.38 : 1)
      c.img.style.transform = `translate(-50%, -50%) translateY(${VERTICAL ? -250 : -96}px) scale(${z})`
    }
    // The pointer, mapped from the take's viewport into this frame.
    const p = take.pointer[f]
    const r = c.rect
    if (p && p.visible && r) {
      const sx = r.w / take.size.width
      c.pointerEl.style.opacity = '1'
      c.pointerEl.style.left = `${r.x + p.x * sx}px`
      c.pointerEl.style.top = `${r.y + p.y * sx}px`
      if (take.size.mobile) {
        c.pointerEl.style.transform = `scale(${(p.down ? 0.85 : 1) * Math.max(0.7, sx / 2)})`
        c.pointerEl.style.background = p.down ? 'rgba(255,245,225,0.4)' : 'rgba(255,245,225,0.16)'
      } else {
        const ring = c.pointerEl.querySelector('.ring')
        ring.style.opacity = p.down ? '0.9' : '0'
        ring.style.transform = `scale(${p.down ? 1 : 0.5})`
      }
    } else {
      c.pointerEl.style.opacity = '0'
    }
  }
  await Promise.all(loads.splice(0))
}

await document.fonts.ready
await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => undefined))))
window.composeReady = { W, H, frames: Math.round(DURATION * FPS) }
