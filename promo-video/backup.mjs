// The deck's backup recording: the site's own captures (takes C, D and E) with no
// overlays, joined with hard cuts at 1280x720 and no sound. Plays muted on the live slide.
import { mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'

const out = join('..', 'exports', 'THE_LOST_TOMB_DEMO_BACKUP.mp4')
mkdirSync(join('..', 'exports'), { recursive: true })
const seq = (take, start = 0) => ['-framerate', '30', '-start_number', String(start), '-i', join('frames', take, '%05d.jpg')]
execFileSync(ffmpeg, [
  '-y', '-hide_banner', '-loglevel', 'error',
  ...seq('C'), ...seq('D', 20), ...seq('E'),
  '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1:a=0,scale=1280:720:flags=lanczos:in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p[v]',
  '-map', '[v]', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-profile:v', 'high', '-movflags', '+faststart', out,
], { stdio: 'inherit' })
console.log(`wrote ${out} (${(statSync(out).size / 1048576).toFixed(1)} MB)`)
