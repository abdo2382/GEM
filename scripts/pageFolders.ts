import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PAGE_PATH } from '../src/site/route.ts'

/**
 * The site is one build whose index.html picks its page from the address, so /museum-map and
 * /lost-tomb only exist on hosts set up to answer them with index.html. Many are not (a plain
 * static server, Netlify's drag-and-drop, GitHub Pages): there the homepage loads and both
 * other pages are "page not found". A folder per page, holding a copy of index.html, makes the
 * build work on any static host without rewrite rules.
 */

/** The folder each page other than the homepage needs: 'lost-tomb', 'museum-map'. */
export function pageFolders(): string[] {
  return Object.values(PAGE_PATH)
    .map((path) => path.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
}

/** Copies the built index.html into each page's folder. Returns the files written, relative to outDir. */
export function writePageFolders(outDir: string): string[] {
  const indexFile = join(outDir, 'index.html')
  if (!existsSync(indexFile)) {
    throw new Error(`${indexFile} is missing, so the museum map and the experience would be "page not found" on a static host`)
  }
  const html = readFileSync(indexFile)
  return pageFolders().map((folder) => {
    mkdirSync(join(outDir, folder), { recursive: true })
    writeFileSync(join(outDir, folder, 'index.html'), html)
    return `${folder}/index.html`
  })
}
