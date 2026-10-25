// Records the real website, take by take, as numbered JPEG frames at 30 fps.
// Every take drives the running app (npm run dev in the app folder) through its own
// controls: the Start button, the chapter scroll, Inspect, the trail, the language
// switch. A log of the pointer (mouse or finger) is saved beside each take so the
// edit can draw it where the real input happened.
//
//   node capture.mjs            all takes
//   node capture.mjs C D        selected takes
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { launch, step, until, grab, SITE } from './lib/browser.mjs'

const DESKTOP = { width: 1920, height: 1080 }
const PHONE = { width: 390, height: 844, mobile: true, scale: 1080 / 390 }
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

class Take {
  constructor(name, size) {
    this.name = name
    this.size = size
    this.dir = `frames/${name}`
    this.f = 0
    this.log = []
    this.pointer = { x: size.width / 2, y: size.height / 2, down: false, visible: false, kind: size.mobile ? 'touch' : 'mouse' }
  }

  async open(query = '') {
    rmSync(this.dir, { recursive: true, force: true })
    mkdirSync(this.dir, { recursive: true })
    const s = this.size
    Object.assign(this, await launch({ width: s.width, height: s.height, mobile: !!s.mobile, scale: 1 }))
    this.page.on('pageerror', (e) => console.log(`[${this.name}] pageerror`, e.message))
    await this.page.goto(SITE + query, { waitUntil: 'domcontentloaded' })
  }

  /** Wait (without recording) for the gate, press Start, and let the opening play. */
  async start(settleFrames = 130) {
    await until(this.page, () => !!document.querySelector('.gate .btn--gold'), 120)
    await step(this.page, 20)
    await this.page.click('.gate .btn--gold')
    await until(this.page, () => !!(window.__lt && window.__r3f), 60)
    await step(this.page, settleFrames)
  }

  async rect(selector) {
    const box = await this.page.locator(selector).first().boundingBox()
    if (!box) throw new Error(`[${this.name}] not visible: ${selector}`)
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }

  /** Record `n` frames; `each(i)` may act before each frame is advanced. */
  async rec(n, each) {
    const s = this.size
    for (let i = 0; i < n; i++) {
      if (each) await each(i)
      await step(this.page, 1)
      const jpg = await grab(this.page, this.cdp, { width: s.width, height: s.height, scale: s.scale ?? 1 })
      writeFileSync(`${this.dir}/${String(this.f).padStart(5, '0')}.jpg`, jpg)
      this.log.push({ ...this.pointer })
      this.f++
    }
  }

  /** Glide the visible pointer to (x, y) over `n` recorded frames. */
  async glide(x, y, n = 20) {
    const p = this.pointer
    const x0 = p.x
    const y0 = p.y
    p.visible = true
    await this.rec(n, async (i) => {
      const t = ease((i + 1) / n)
      p.x = x0 + (x - x0) * t
      p.y = y0 + (y - y0) * t
      await this.page.mouse.move(p.x, p.y)
    })
  }

  /** Press and release at the pointer, recording the press. */
  async tap(holdFrames = 5) {
    const p = this.pointer
    await this.page.mouse.move(p.x, p.y)
    await this.page.mouse.down()
    p.down = true
    await this.rec(holdFrames)
    await this.page.mouse.up()
    p.down = false
  }

  /** Drag from the pointer to (x, y) over `n` frames, button held. */
  async drag(x, y, n) {
    const p = this.pointer
    await this.page.mouse.move(p.x, p.y)
    await this.page.mouse.down()
    p.down = true
    const x0 = p.x
    const y0 = p.y
    await this.rec(n, async (i) => {
      const t = ease((i + 1) / n)
      p.x = x0 + (x - x0) * t
      p.y = y0 + (y - y0) * t
      await this.page.mouse.move(p.x, p.y)
    })
    await this.page.mouse.up()
    p.down = false
  }

  hide() {
    this.pointer.visible = false
  }

  /** Smoothly scroll an element's own scroll area (the papyrus, the Inspect panel). */
  async scrollWithin(selector, to, n) {
    const from = await this.page.$eval(selector, (e) => e.scrollTop)
    const target = to === 'end' ? await this.page.$eval(selector, (e) => e.scrollHeight - e.clientHeight) : to
    await this.rec(n, async (i) => {
      const y = from + (target - from) * ease((i + 1) / n)
      await this.page.$eval(selector, (e, v) => (e.scrollTop = v), y)
    })
  }

  async chapter(i, opts) {
    await this.page.evaluate(([c, o]) => window.__lt.scrollToChapter(c, o), [i, opts ?? {}])
  }

  async close() {
    writeFileSync(`${this.dir}/take.json`, JSON.stringify({ name: this.name, size: this.size, frames: this.f, pointer: this.log }))
    await this.browser.close()
    console.log(`[${this.name}] ${this.f} frames`)
  }
}

const TAKES = {
  // The approved mask alone (studio view, interface hidden), turning slowly: the opening.
  async A() {
    const t = new Take('A', DESKTOP)
    await t.open('?studio=0')
    await until(t.page, () => !!(window.__r3f && window.__photo), 120)
    await step(t.page, 60)
    await t.rec(240, async (i) => {
      const k = ease(i / 239)
      await t.page.evaluate(([a, p]) => ((window.__studioAngle = a), (window.__studioPitch = p)), [-20 + 28 * k, -5 + 5 * k])
    })
    await t.close()
  },

  // The mask again for the closing, turning to face the viewer.
  async H() {
    const t = new Take('H', DESKTOP)
    await t.open('?studio=0')
    await until(t.page, () => !!(window.__r3f && window.__photo), 120)
    await step(t.page, 60)
    await t.rec(220, async (i) => {
      const k = ease(i / 219)
      await t.page.evaluate(([a, p]) => ((window.__studioAngle = a), (window.__studioPitch = p)), [32 - 32 * k, -8 + 8 * k])
    })
    await t.close()
  },

  // Phone: the gate, a tap on Start journey, and the opening reveal.
  async B() {
    const t = new Take('B', PHONE)
    await t.open()
    await until(t.page, () => !!document.querySelector('.gate .btn--gold'), 120)
    await step(t.page, 40)
    await t.rec(40)
    const b = await t.rect('.gate .btn--gold')
    t.pointer.x = b.x
    t.pointer.y = b.y
    t.pointer.visible = true
    await t.tap(6)
    t.hide()
    await t.rec(270)
    await t.close()
  },

  // Desktop: the scroll journey through the chapters, papyrus scrolled to each photograph.
  async C() {
    const t = new Take('C', DESKTOP)
    await t.open()
    await t.start(140)
    await t.rec(60)
    for (const c of [1, 2, 3]) {
      await t.chapter(c)
      await t.rec(95)
      await t.scrollWithin('.papyrus__content', 'end', 50)
      await t.rec(30)
    }
    await t.chapter(4)
    await t.rec(120)
    await t.close()
  },

  // Desktop: Inspect the Golden Throne, turn it by hand, open a point of interest,
  // and read down to the excavation photographs.
  async D() {
    const t = new Take('D', DESKTOP)
    await t.open()
    await t.start(130)
    await t.chapter(2, { immediate: true })
    await step(t.page, 110)
    t.pointer.x = 1100
    t.pointer.y = 420
    await t.rec(20)
    const inspect = await t.rect('.caption .btn')
    await t.glide(inspect.x, inspect.y, 24)
    await t.tap(5)
    await t.rec(55)
    await t.glide(1000, 520, 18)
    await t.drag(1520, 540, 110)
    await t.rec(40)
    const hot = await t.rect('.hotspot')
    await t.glide(hot.x, hot.y, 22)
    await t.tap(5)
    await t.rec(30)
    t.hide()
    await t.scrollWithin('.inspect__panel', await t.page.$eval('.inspect__archive', (e) => e.offsetTop - 24), 45)
    await t.rec(50)
    await t.close()
  },

  // Desktop: switching the whole experience to Arabic, right to left.
  async E() {
    const t = new Take('E', DESKTOP)
    await t.open()
    await t.start(130)
    await t.chapter(1, { immediate: true })
    await step(t.page, 120)
    t.pointer.x = 1300
    t.pointer.y = 300
    await t.rec(20)
    const lang = await t.rect('button[aria-label="Switch to Arabic"]')
    await t.glide(lang.x, lang.y, 22)
    await t.tap(5)
    t.hide()
    await t.rec(110)
    await t.close()
  },

  // Phone: Inspect the Anubis shrine from the story sheet and turn it with a finger.
  async F() {
    const t = new Take('F', PHONE)
    await t.open()
    await t.start(130)
    await t.chapter(1, { immediate: true })
    await step(t.page, 120)
    await t.rec(25)
    const link = await t.rect('.papyrus__inspect')
    t.pointer.x = link.x
    t.pointer.y = link.y
    t.pointer.visible = true
    await t.tap(6)
    t.hide()
    await t.rec(45)
    t.pointer.x = 90
    t.pointer.y = 300
    t.pointer.visible = true
    await t.drag(310, 320, 70)
    t.hide()
    await t.rec(30)
    t.pointer.x = 300
    t.pointer.y = 330
    t.pointer.visible = true
    await t.drag(120, 300, 55)
    t.hide()
    await t.rec(35)
    await t.close()
  },

  // Phone: the visitor's own pace: read, open the story sheet, save a treasure, open the
  // trail, and go back to an earlier chapter.
  async G() {
    const t = new Take('G', PHONE)
    await t.open()
    await t.start(130)
    await t.chapter(1, { immediate: true })
    await step(t.page, 120)
    await t.rec(45)
    const tapOn = async (selector, hold = 6) => {
      const r = await t.rect(selector)
      t.pointer.x = r.x
      t.pointer.y = r.y
      t.pointer.visible = true
      await t.tap(hold)
      t.hide()
    }
    await tapOn('.papyrus__handle')
    await t.rec(55)
    await tapOn('.papyrus__handle')
    await t.rec(25)
    // A swipe up: the finger travels while the story scrolls to the next chapter.
    t.pointer.x = 200
    t.pointer.y = 600
    t.pointer.visible = true
    t.pointer.down = true
    await t.chapter(2)
    await t.rec(16, (i) => ((t.pointer.y = 600 - 280 * ease((i + 1) / 16)), undefined))
    t.pointer.down = false
    t.hide()
    await t.rec(60)
    await tapOn('.papyrus__object .btn')
    await t.rec(35)
    t.pointer.x = 200
    t.pointer.y = 600
    t.pointer.visible = true
    t.pointer.down = true
    await t.chapter(3)
    await t.rec(16, (i) => ((t.pointer.y = 600 - 280 * ease((i + 1) / 16)), undefined))
    t.pointer.down = false
    t.hide()
    await t.rec(60)
    await tapOn('.chip--trail')
    await t.rec(75)
    await tapOn('.drawer .chip--icon')
    await t.rec(20)
    // A swipe down: back to an earlier chapter.
    t.pointer.x = 200
    t.pointer.y = 300
    t.pointer.visible = true
    t.pointer.down = true
    await t.chapter(1)
    await t.rec(16, (i) => ((t.pointer.y = 300 + 280 * ease((i + 1) / 16)), undefined))
    t.pointer.down = false
    t.hide()
    await t.rec(60)
    await t.close()
  },
}

const wanted = process.argv.slice(2)
for (const name of wanted.length ? wanted : Object.keys(TAKES)) {
  const a = Date.now()
  await TAKES[name]()
  console.log(`[${name}] done in ${((Date.now() - a) / 1000).toFixed(0)} s`)
}
