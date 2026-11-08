import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pageFolders, writePageFolders } from '../scripts/pageFolders.ts'
import { PAGE_PATH } from '../src/site/route.ts'
import config from '../vite.config.ts'

// What `vite build` leaves behind: one index.html whose scripts have absolute addresses.
const BUILT =
  '<!doctype html><html><head><script type="module" src="/assets/index-abc123.js"></script></head><body><div id="root"></div></body></html>'

function inTempBuild(run: (outDir: string) => void, withIndex = true) {
  const outDir = mkdtempSync(join(tmpdir(), 'lost-tomb-build-'))
  try {
    if (withIndex) writeFileSync(join(outDir, 'index.html'), BUILT)
    run(outDir)
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
}

test('every page except the homepage gets a folder, named after its address', () => {
  assert.deepEqual(pageFolders(), ['lost-tomb', 'museum-map'])
})

test('every address the router knows is a real file in the build, so a host with no rewrite rules opens it', () => {
  inTempBuild((outDir) => {
    writePageFolders(outDir)
    for (const path of Object.values(PAGE_PATH)) {
      const file = join(outDir, path.replace(/^\//, ''), 'index.html')
      assert.ok(existsSync(file), `${path} has no ${file}`)
      assert.equal(readFileSync(file, 'utf8'), BUILT, `${path} is not a copy of the built page`)
    }
  })
})

test('it reports the files it wrote, and running it twice changes nothing', () => {
  inTempBuild((outDir) => {
    const expected = ['lost-tomb/index.html', 'museum-map/index.html']
    assert.deepEqual(writePageFolders(outDir), expected)
    assert.deepEqual(writePageFolders(outDir), expected)
    assert.equal(readFileSync(join(outDir, 'museum-map', 'index.html'), 'utf8'), BUILT)
  })
})

test('a build with no index.html is an error, not a site where every page quietly 404s', () => {
  inTempBuild((outDir) => {
    assert.throws(() => writePageFolders(outDir), /index\.html/)
  }, false)
})

test('the Vite config runs it on every production build', () => {
  const plugins = (config.plugins ?? []).flat(Infinity) as Array<{ name?: string; apply?: unknown } | null | false>
  const found = plugins.find((p) => p && p.name === 'page-folders')
  assert.ok(found, 'vite.config.ts does not register the page-folders plugin')
  assert.equal(found.apply, 'build')
})
