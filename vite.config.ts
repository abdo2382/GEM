import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { writePageFolders } from './scripts/pageFolders.ts'

/**
 * Dev-only: POST a canvas data URL to /__shot?name=x to save it under .shots/.
 * Used to compare renders of the mask against reference photographs.
 */
function shotSaver(): Plugin {
  return {
    name: 'shot-saver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        const name = (new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? 'shot').replace(/[^\w-]/g, '')
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', () => {
          const body = Buffer.concat(chunks).toString()
          const b64 = body.slice(body.indexOf(',') + 1)
          const dir = resolve(__dirname, '.shots')
          mkdirSync(dir, { recursive: true })
          writeFileSync(resolve(dir, `${name}.jpg`), Buffer.from(b64, 'base64'))
          res.end('ok')
        })
      })
    },
  }
}

/**
 * Build only: gives each page its own folder (dist/museum-map/index.html, dist/lost-tomb/index.html),
 * a copy of the built index.html. The site picks its page from the address, so without these files
 * /museum-map and /lost-tomb exist only on hosts set up to answer them with index.html; on any other
 * static host they were "page not found" while the homepage loaded.
 */
function pageFolders(): Plugin {
  let outDir = ''
  let log: (message: string) => void = console.log
  return {
    name: 'page-folders',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
      log = (message) => config.logger.info(message)
    },
    closeBundle() {
      log(`page folders: ${writePageFolders(outDir).join(', ')}`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), shotSaver(), pageFolders()],
})
