// Fetches the OpenStreetMap extract the museum map is built from and saves it to data/osm-gem.json.
//   node scripts/gem-map/fetch-osm.mjs
// Then run build.mjs. The extract is committed, so building does not need the network.
// OpenStreetMap data is © OpenStreetMap contributors, available under the ODbL.
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, 'data', 'osm-gem.json')

// Centre of the Grand Egyptian Museum relation (r/16783121), and a radius that covers the whole complex.
const AROUND = '(around:900,29.9945706,31.1192355)'
const QUERY = `[out:json][timeout:180];
(
  way${AROUND}["building"];
  relation${AROUND}["building"];
  way${AROUND}["highway"];
  way${AROUND}["area:highway"];
  way${AROUND}["landuse"];
  way${AROUND}["natural"];
  way${AROUND}["leisure"];
  way${AROUND}["amenity"];
  relation${AROUND}["amenity"];
  relation${AROUND}["leisure"];
  relation${AROUND}["landuse"];
  way${AROUND}["man_made"];
  way${AROUND}["barrier"~"^(wall|fence|retaining_wall)$"];
  way${AROUND}["tourism"];
  way${AROUND}["railway"];
  node${AROUND}["entrance"];
  node${AROUND}["barrier"="gate"];
  node${AROUND}["amenity"];
  node${AROUND}["man_made"];
  node${AROUND}["historic"];
  node${AROUND}["tourism"];
  node${AROUND}["public_transport"];
  node${AROUND}["railway"];
  node${AROUND}["highway"~"^(elevator|steps|crossing|bus_stop)$"];
);
out geom;`

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const HEADERS = {
  'content-type': 'application/x-www-form-urlencoded',
  'user-agent': 'TheLostTombMapBuilder/1.0 (hackathon project; non-commercial)',
  accept: 'application/json',
}

for (let attempt = 1; attempt <= 3; attempt++) {
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, { method: 'POST', headers: HEADERS, body: 'data=' + encodeURIComponent(QUERY) })
      const text = await res.text()
      if (!res.ok || !text.startsWith('{')) throw new Error(`${res.status} ${text.slice(0, 80).replace(/\s+/g, ' ')}`)
      const json = JSON.parse(text)
      mkdirSync(dirname(OUT), { recursive: true })
      writeFileSync(OUT + '.tmp', text)
      renameSync(OUT + '.tmp', OUT)
      console.log(`saved ${json.elements.length} elements from ${url}; OpenStreetMap data as of ${json.osm3s?.timestamp_osm_base}`)
      process.exit(0)
    } catch (err) {
      console.warn(`${url}: ${err.message}`)
    }
  }
}
console.error('Every Overpass server failed; try again later.')
process.exit(1)
