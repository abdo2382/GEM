// Writes ARCHIVE.md from src/content/archive.ts, the single source of truth.
// Run: node scripts/archive-manifest.ts
import { writeFileSync } from 'node:fs'
import { ARCHIVE, ARTIFACT_PHOTOS, STAGE_PHOTO } from '../src/content/archive.ts'

const STAGE_NAMES: Record<string, string> = {
  prologue: 'The Awakening',
  discovery: 'The Discovery',
  boyking: 'The Treasures',
  eternity: 'Inside the Tomb',
  legacy: 'The Living Legacy',
}

const rows = ARCHIVE.map((p) => {
  const where = p.stage ? `Papyrus, ${STAGE_NAMES[p.stage]}` : `Inspect, ${p.artifact}`
  return [
    `### ${p.id}`,
    '',
    `- Description: ${p.caption.en}`,
    `- Historical event: ${p.event}`,
    `- Creator: ${p.creator}`,
    `- Date: ${p.date}`,
    `- Holding institution: ${p.institution} (${p.institutionUrl})`,
    `- Source: ${p.sourceUrl}`,
    `- Licence: ${p.license}. ${p.licenseNote}`,
    `- Attribution: ${p.attribution}`,
    `- Used in: ${where}`,
    `- Local file: public${p.file} (${p.width} × ${p.height}, WebP)`,
    '',
  ].join('\n')
})

const missing = ['anubis', 'canopic', 'mask'].filter((id) => !ARTIFACT_PHOTOS[id as keyof typeof ARTIFACT_PHOTOS])

const md = `# Archival photograph manifest

Generated from \`src/content/archive.ts\` by \`node scripts/archive-manifest.ts\`.
Do not edit by hand. \`npm test\` checks every entry.

All photographs are Harry Burton's excavation prints from the five albums
"Tutankhamun tomb photographs: a photographic record ... 490 original photographic
prints", digitised by Heidelberg University Library and published on Wikimedia Commons
as public domain (PD-old: Burton died in 1940). Captions describe what each print
shows; people in them are not named because the source records do not name them.

Stage photos: ${Object.entries(STAGE_PHOTO)
  .map(([s, id]) => `${STAGE_NAMES[s]} → ${id}`)
  .join('; ')}.

${rows.join('\n')}
## Not available

No verified public-domain photograph was found for: ${missing.join(', ')}. The Treasury
(Anubis shrine, canopic shrine) was cleared in later seasons not covered by these
albums, and Burton's photographs of the mask are not in them. These objects show no
archival photograph rather than an unverified or unrelated one.
`

writeFileSync(new URL('../ARCHIVE.md', import.meta.url), md)
console.log(`ARCHIVE.md: ${ARCHIVE.length} photographs`)
