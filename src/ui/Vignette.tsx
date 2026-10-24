import type { ReactNode } from 'react'

/*
 * The picture that heads each chapter of the papyrus, drawn the way a Book of the Dead
 * vignette heads its spell: black ink outlines with red and yellow ochre washes.
 * `s` = inked stroke, `r` = red wash, `o` = ochre wash. Every shape uses pathLength 1
 * so the CSS can draw the line in, whatever its real length.
 */

const P = (props: { d: string; c?: string }) => <path pathLength={1} className={props.c ?? 's'} d={props.d} />

/** Four-pointed glint: the gold seen through the breach. */
const glint = (x: number, y: number, r: number) =>
  `M${x} ${y - r}L${x + r * 0.25} ${y - r * 0.25}L${x + r} ${y}L${x + r * 0.25} ${y + r * 0.25}L${x} ${y + r}L${x - r * 0.25} ${y + r * 0.25}L${x - r} ${y}L${x - r * 0.25} ${y - r * 0.25}Z`

const seals = (): ReactNode[] => {
  const out: ReactNode[] = []
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      const x = 140 + col * 13 + (row % 2) * 6
      const y = 46 + row * 9
      if (x > 206) continue
      out.push(<ellipse key={`${row}-${col}`} pathLength={1} className="s s--fine" cx={x} cy={y} rx={2.6} ry={3.4} />)
    }
  }
  return out
}

const rays = (): ReactNode[] => {
  const out: ReactNode[] = []
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (0.22 + (k / 8) * 0.56)
    const x1 = 160 + Math.cos(a) * 13
    const y1 = 18 + Math.sin(a) * 13
    const x2 = 160 + Math.cos(a) * 48
    const y2 = 18 + Math.sin(a) * 40
    out.push(<P key={`r${k}`} d={`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`} />)
    out.push(<ellipse key={`h${k}`} pathLength={1} className="s r" cx={x2} cy={y2 + 1.4} rx={2.2} ry={1.6} />)
  }
  return out
}

const SCENES: Record<number, () => ReactNode> = {
  // The horizon: the sun between two hills.
  0: () => (
    <>
      <P d="M24 86H296" />
      <P c="s o" d="M64 86C84 40 132 40 146 86Z" />
      <P c="s o" d="M174 86C188 40 236 40 256 86Z" />
      <circle pathLength={1} className="s r" cx={160} cy={66} r={14} />
    </>
  ),
  // Carter's candle at the breach in the sealed doorway, and gold glinting beyond.
  1: () => (
    <>
      <P d="M24 88H296" />
      <P c="s o o--pale" d="M132 88V26H214V88" />
      <P d="M126 88V20H220V88" />
      {seals()}
      <P c="s s--dark" d="M138 30l9-2l7 5l-1 8l-9 3l-7-5Z" />
      <path className="r glint" d={glint(146, 35, 3.4)} />
      <P d="M54 80C74 78 88 76 98 72" />
      <P d="M100 72V56H107V72" />
      <P c="s o" d="M94 74H113" />
      <P c="s r" d="M103.5 54C99 48 102 42 103.5 38C105.5 43 108 48 103.5 54Z" />
      <P c="s s--fine" d="M110 46L134 34M110 50L134 40M110 42L132 30" />
    </>
  ),
  // The Aten's rays end in hands, as on the back of the Golden Throne.
  2: () => (
    <>
      <P d="M24 88H296" />
      <circle pathLength={1} className="s r" cx={160} cy={18} r={10} />
      {rays()}
      <P c="s o" d="M140 64H190V69H140Z" />
      <P d="M146 64V38Q146 34 150 34H155V64" />
      <P d="M184 69C186 76 181 81 185 88M148 69C150 76 145 81 149 88M148 81H184" />
    </>
  ),
  // The heart weighed against the feather of Ma'at.
  3: () => (
    <>
      <P d="M40 88H280" />
      <P c="s o" d="M146 88H174L169 82H151Z" />
      <P d="M160 82V24" />
      <circle pathLength={1} className="s r" cx={160} cy={20} r={3.4} />
      <P d="M110 30L210 26" />
      <P d="M114 30L104 58M114 30L124 58M206 26L196 54M206 26L216 54" />
      <P c="s o" d="M98 58Q114 68 130 58Z" />
      <P c="s o" d="M190 54Q206 64 222 54Z" />
      <P c="s r" d="M110 56C106 54 106 47 110 45H118C122 47 122 54 118 56Z" />
      <P c="s o" d="M206 52C200 44 200 34 208 28C210 36 210 44 208 52Z" />
      <P c="s s--fine" d="M207 52L207.5 31" />
    </>
  ),
  // The pyramids of Giza behind the museum's triangular façade.
  4: () => (
    <>
      <P d="M24 86H296" />
      <circle pathLength={1} className="s r" cx={66} cy={30} r={8} />
      <P c="s o" d="M100 86L136 44L172 86Z" />
      <P c="s o o--pale" d="M150 86L180 52L210 86Z" />
      <P c="s o" d="M198 86L214 66L230 86Z" />
      <P c="s o o--pale" d="M30 86V74L290 64V86Z" />
      <P c="s s--fine" d="M30 80L42 72L54 80L66 71L78 79L90 70L102 78L114 69L126 77L138 68L150 76L162 67L174 75L186 66L198 74L210 66L222 73L234 65L246 72L258 64L270 71L290 64" />
    </>
  ),
}

/** The chapter's picture. Remount it (with a `key`) to ink it in again. */
export function Vignette({ chapter, label }: { chapter: number; label: string }) {
  return (
    <svg className="vignette" viewBox="0 0 320 96" role="img" aria-label={label}>
      {SCENES[chapter]?.()}
    </svg>
  )
}
