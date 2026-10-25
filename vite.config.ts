import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), shotSaver()],
})
