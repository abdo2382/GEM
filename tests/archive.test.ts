import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ARCHIVE, STAGE_PHOTO, ARTIFACT_PHOTOS } from '../src/content/archive.ts'

const pub = (file: string) => fileURLToPath(new URL(`../public${file}`, import.meta.url))
const STAGES = ['prologue', 'discovery', 'boyking', 'eternity', 'legacy']
const ALLOWED = ['Public domain', 'CC0', 'CC BY 4.0', 'CC BY-SA 4.0']

/** Width and height from a WebP file's VP8/VP8L/VP8X header. */
function webpSize(file: string): [number, number] {
  const b = readFileSync(file)
  assert.equal(b.toString('ascii', 0, 4), 'RIFF', `${file} is not RIFF`)
  assert.equal(b.toString('ascii', 8, 12), 'WEBP', `${file} is not WebP`)
  const chunk = b.toString('ascii', 12, 16)
  if (chunk === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21)
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1]
  }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
}

test('every archival photo records its provenance and licence', () => {
  for (const p of ARCHIVE) {
    assert.ok(p.creator.length > 3, `${p.id} creator`)
    assert.ok(p.institution.length > 3, `${p.id} institution`)
    assert.match(p.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, `${p.id} source`)
    assert.ok(ALLOWED.includes(p.license), `${p.id} licence ${p.license}`)
    assert.ok(p.attribution.length > 10, `${p.id} attribution`)
    assert.ok(p.date.length >= 4, `${p.id} date`)
    assert.ok(p.caption.en.length > 10 && p.caption.ar.length > 10, `${p.id} captions`)
  }
})

test('photo ids are unique', () => {
  assert.equal(new Set(ARCHIVE.map((p) => p.id)).size, ARCHIVE.length)
})

test('every photo ships as an optimised file of the recorded size', () => {
  for (const p of ARCHIVE) {
    assert.ok(existsSync(pub(p.file)), `${p.file} missing`)
    assert.deepEqual(webpSize(pub(p.file)), [p.width, p.height], `${p.file} size`)
  }
})

test('each of the five stages has one archival photo on its papyrus', () => {
  for (const s of STAGES) {
    const id = STAGE_PHOTO[s as keyof typeof STAGE_PHOTO]
    assert.ok(id, `${s} has no photo`)
    assert.ok(ARCHIVE.some((p) => p.id === id), `${s} points at unknown ${id}`)
  }
})

test('artifact photos point at photos in the manifest', () => {
  for (const ids of Object.values(ARTIFACT_PHOTOS)) {
    for (const id of ids ?? []) assert.ok(ARCHIVE.some((p) => p.id === id), `unknown ${id}`)
  }
})

test('no photo in the manifest goes unused', () => {
  const used = new Set([...Object.values(STAGE_PHOTO), ...Object.values(ARTIFACT_PHOTOS).flat()])
  for (const p of ARCHIVE) assert.ok(used.has(p.id), `${p.id} is never shown`)
})
