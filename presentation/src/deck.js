// The Lost Tomb pitch deck. One 1920×1080 stage, scaled to the screen. Each slide's
// entrances are declared on the markup (data-a = kind, data-d = delay in seconds) and
// played by GSAP when the slide opens.
//
//   ?slide=N   open on slide N (also #N)
//   ?static    no motion (used to capture the slide images for the PowerPoint)
//   ?print     every slide stacked at its final state, one per page (for the PDF)
//
// Keys: → ↓ Space PageDown next · ← ↑ PageUp previous · Home/End · F full screen ·
// N speaker notes. Touch: swipe left or right.
;(() => {
  const q = new URLSearchParams(location.search)
  const PRINT = q.has('print')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const still = () => PRINT || q.has('static') || reduced.matches || !window.gsap
  const stage = document.getElementById('stage')
  const slides = [...stage.querySelectorAll('.slide')]
  const N = slides.length
  const $ = (id) => document.getElementById(id)

  // Letter titles are split so each letter carries the gold gradient; words stay whole when
  // a title wraps. Screen readers get the plain text.
  for (const el of document.querySelectorAll('[data-a="letters"]')) {
    const text = el.textContent.trim()
    el.setAttribute('aria-label', text)
    el.innerHTML = text
      .split(' ')
      .map((word) => `<span class="word" aria-hidden="true">${[...word].map((c) => `<span class="ch">${c}</span>`).join('')}</span>`)
      .join(' ')
  }

  // The backup recording sits beside the deck file; say so plainly if it is missing.
  for (const v of document.querySelectorAll('video')) {
    v.addEventListener('error', () => {
      const note = document.createElement('figcaption')
      note.className = 'video-missing'
      note.textContent = 'Backup recording not found. Keep THE_LOST_TOMB_DEMO_BACKUP.mp4 in the same folder as this file.'
      v.after(note)
    })
  }

  if (PRINT) {
    document.documentElement.classList.add('print')
    // A printed page shows the recording's poster frame.
    for (const v of document.querySelectorAll('video')) {
      const img = new Image()
      img.src = v.poster
      img.alt = v.getAttribute('aria-label') ?? ''
      v.replaceWith(img)
    }
    window.deckReady = true
    return
  }

  $('total').textContent = String(N)
  // Decode every picture up front, so no slide stalls on its first appearance.
  for (const img of document.images) img.decode().catch(() => undefined)

  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080)
    stage.style.transform = `translate(-50%, -50%) scale(${s})`
  }
  addEventListener('resize', fit)
  fit()

  // Entrances ------------------------------------------------------------------------
  function blurIn(tl, targets, px, vars, at) {
    tl.fromTo(targets, { filter: `blur(${px}px)` }, { filter: 'blur(0px)', ...vars }, at)
  }

  function entrance(slide) {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    for (const el of slide.querySelectorAll('[data-a]')) {
      const at = 0.15 + Number(el.dataset.d ?? 0)
      switch (el.dataset.a) {
        case 'mask':
          // Fade and settle only: blurring a picture this large repaints it every frame.
          tl.from(el, { opacity: 0, scale: 1.08, duration: 2.4, ease: 'power2.out' }, at)
          break
        case 'letters': {
          const letters = el.querySelectorAll('.ch')
          tl.from(letters, { opacity: 0, y: 26, duration: 1.3, stagger: 0.06 }, at)
          break
        }
        case 'up':
          tl.from(el, { opacity: 0, y: '+=30', duration: 1.1 }, at)
          blurIn(tl, el, 6, { duration: 1 }, at)
          break
        case 'line':
          tl.from(el, { scaleX: 0, duration: 1.2, ease: 'power2.inOut' }, at)
          break
        case 'scale':
          tl.from(el, { opacity: 0, scale: 0.94, duration: 1.2 }, at)
          break
        case 'reveal': {
          // The photograph uncovers left to right, like a print lifted from its sleeve.
          tl.from(el.querySelector('img'), { clipPath: 'inset(0% 100% 0% 0%)', duration: 1.5, ease: 'power3.inOut' }, at)
          const cap = el.querySelector('figcaption')
          if (cap) tl.from(cap, { opacity: 0, y: '+=12', duration: 0.9 }, at + 1)
          break
        }
        case 'stagger':
        case 'flow':
          tl.from(el.children, { opacity: 0, y: '+=30', duration: 0.9, stagger: 0.12 }, at)
          break
      }
    }
    // How it works: the line through the five steps draws itself as they arrive.
    const flowLine = slide.querySelector('.flow__line i')
    if (flowLine) tl.from(flowLine, { scaleX: 0, duration: 1.9, ease: 'power2.inOut' }, 0.6)
    // The journey: the timeline under the chapters draws itself from the first to the last.
    const nodes = slide.querySelectorAll('.stages .node')
    if (nodes.length) tl.from(nodes, { scaleX: 0, duration: 0.45, stagger: 0.38, ease: 'power1.inOut' }, 1.1)
    return tl
  }

  // Navigation -----------------------------------------------------------------------
  const contexts = []
  let cur = -1

  function show(i) {
    i = Math.max(0, Math.min(N - 1, i))
    if (i === cur) return
    const prev = cur >= 0 ? slides[cur] : null
    const next = slides[i]
    const p = cur
    cur = i
    const calm = still()

    contexts[i]?.revert()
    for (const [k, s] of slides.entries()) {
      s.toggleAttribute('inert', k !== i)
      s.setAttribute('aria-hidden', String(k !== i))
      s.classList.toggle('is-active', k === i)
    }

    if (window.gsap) {
      gsap.killTweensOf([prev, next].filter(Boolean))
      if (calm) {
        if (prev) gsap.set(prev, { autoAlpha: 0 })
        gsap.set(next, { autoAlpha: 1 })
      } else {
        if (prev) gsap.to(prev, { autoAlpha: 0, duration: 0.5, ease: 'power2.inOut', onComplete: () => p !== cur && contexts[p]?.revert() })
        gsap.fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' })
        contexts[i] = gsap.context(() => entrance(next))
      }
    } else {
      if (prev) prev.style.visibility = 'hidden'
      next.style.visibility = 'visible'
    }

    for (const v of prev?.querySelectorAll('video') ?? []) v.pause()
    if (!calm) for (const v of next.querySelectorAll('video')) v.play().catch(() => undefined)

    $('n').textContent = String(i + 1)
    $('bar').style.transform = `scaleX(${(i + 1) / N})`
    notes.textContent = next.dataset.notes ?? ''
    history.replaceState(null, '', `${location.pathname}${location.search}#${i + 1}`)
  }
  const go = (d) => show(cur + d)

  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.().catch(() => undefined)
  }
  document.addEventListener('fullscreenchange', () => {
    $('fs').setAttribute('aria-label', document.fullscreenElement ? 'Exit full screen' : 'Full screen')
  })

  // Speaker notes, toggled with N.
  const notes = document.createElement('aside')
  notes.className = 'notes'
  notes.setAttribute('aria-label', 'Speaker notes')
  notes.hidden = true
  document.body.appendChild(notes)

  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const t = e.target instanceof Element ? e.target : null
    if (t?.closest('video')) return
    const control = t?.closest('a, button')
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        go(1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        go(-1)
        break
      case ' ':
      case 'Enter':
        if (control) return
        go(e.shiftKey ? -1 : 1)
        break
      case 'Home':
        show(0)
        break
      case 'End':
        show(N - 1)
        break
      case 'f':
      case 'F':
        fullscreen()
        break
      case 'n':
      case 'N':
        notes.hidden = !notes.hidden
        break
      default:
        return
    }
    e.preventDefault()
  })

  for (const b of document.querySelectorAll('[data-go]')) b.addEventListener('click', () => go(Number(b.dataset.go)))
  $('fs').addEventListener('click', fullscreen)

  // Swipe on touch screens; a mouse uses the buttons, keys or wheel.
  let touch = null
  const viewport = document.querySelector('.viewport')
  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.target.closest('a, button, video')) return
    touch = { x: e.clientX, y: e.clientY }
  })
  viewport.addEventListener('pointerup', (e) => {
    if (!touch) return
    const dx = e.clientX - touch.x
    const dy = e.clientY - touch.y
    touch = null
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1)
  })
  viewport.addEventListener('pointercancel', () => (touch = null))

  let wheelAt = 0
  viewport.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaY) < 30 || performance.now() - wheelAt < 700) return
      wheelAt = performance.now()
      go(e.deltaY > 0 ? 1 : -1)
    },
    { passive: true },
  )

  addEventListener('hashchange', () => show(Number(location.hash.slice(1)) - 1))

  const first = Number(q.get('slide') ?? location.hash.slice(1)) || 1
  show(first - 1)
  window.deck = { show, get index() { return cur }, count: N }
  window.deckReady = true
})()
