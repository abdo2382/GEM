// The edit: every shot and every line of text, in seconds. Footage is the real site,
// recorded take by take (capture.mjs); photographs are Harry Burton's excavation prints
// already verified for the site (public/archive, see ARCHIVE.md).
//
// Takes: A/H the approved mask (studio view), B phone start, C desktop scroll journey,
// D desktop Inspect, E desktop Arabic, F phone Inspect, G phone visitor's pace.

export const DURATION = 116

export const CLIPS = [
  // 1 · The mystery
  { kind: 'footage', take: 'A', start: 4.4, end: 12.6, from: 0, layout: 'hero', fadeIn: 1.4, fadeOut: 0.8, zoom: [0.84, 0.9] },

  // 2 · The problem: the real objects, as Burton photographed them in the tomb.
  { kind: 'photo', src: 'burton-2-009', start: 12.6, end: 17.4, fadeIn: 1, fadeOut: 0.6, kb: { s: [1.06, 1.16], x: [0, -2.5], y: [0, -1.5] } },
  { kind: 'photo', src: 'burton-4-292', start: 16.8, end: 21.4, fadeIn: 0.6, fadeOut: 0.6, kb: { s: [1.14, 1.04], x: [1.5, 0], y: [0, 0] } },
  { kind: 'photo', src: 'burton-3-163', start: 20.8, end: 25.8, fadeIn: 0.6, fadeOut: 0.8, dim: 0.55, kb: { s: [1.04, 1.14], x: [0, 0], y: [2, -1] } },

  // 3 · The solution
  { kind: 'backdrop', start: 25.8, end: 38.6, fadeIn: 0.8, fadeOut: 0.6 },
  { kind: 'footage', take: 'B', start: 26.2, end: 38.6, from: 0, layout: 'phone', fadeIn: 0.8, fadeOut: 0.6 },

  // 4 · The cinematic experience
  { kind: 'footage', take: 'C', start: 38.6, end: 62.1, from: 0, layout: 'full', fadeIn: 0.8, fadeOut: 0.5 },

  // 5 · Interactive artifacts
  { kind: 'footage', take: 'D', start: 62.1, end: 75.57, from: 20, layout: 'full', fadeIn: 0.5, fadeOut: 0.4 },
  { kind: 'footage', take: 'E', start: 75.57, end: 80.8, from: 0, layout: 'full', fadeIn: 0.4, fadeOut: 0.5 },
  { kind: 'backdrop', start: 80.8, end: 106.1, fadeIn: 0.6, fadeOut: 0.6 },
  { kind: 'footage', take: 'F', start: 80.8, end: 89.0, from: 20, layout: 'phone', fadeIn: 0.6, fadeOut: 0.5 },

  // 6 · The visitor's experience
  { kind: 'footage', take: 'G', start: 89.0, end: 106.1, from: 0, layout: 'phone', fadeIn: 0.5, fadeOut: 0.6 },

  // 7 · The vision
  { kind: 'footage', take: 'H', start: 106.1, end: 115.0, from: 0, layout: 'hero', fadeIn: 1, fadeOut: 1.6, zoom: [0.9, 0.84] },
]

// style: statement (centre), title, subtitle, caption (lower third over footage),
// side (beside the phone), note (small), credit (small, corner).
export const TEXT = [
  { style: 'statement', text: 'History is more than something we see.', in: 1.0, out: 4.4 },
  { style: 'title', text: 'THE LOST TOMB', in: 6.8, out: 12.0 },
  { style: 'subtitle', text: 'Discover history. Experience the story.', in: 8.2, out: 12.0 },

  { style: 'caption', text: 'Every object in a museum holds a story.', in: 13.2, out: 16.6 },
  { style: 'caption', text: 'But a label can only say so much.', in: 17.4, out: 20.6 },
  { style: 'question', text: 'What if every artifact could tell its own story?', in: 21.4, out: 25.2 },
  { style: 'credit', text: 'Archival photographs: Harry Burton, 1922–23. Heidelberg University Library. Public domain.', in: 13.0, out: 25.2 },

  { style: 'sideTitle', text: 'THE LOST TOMB', in: 26.8, out: 30.6 },
  { style: 'side', text: 'An interactive digital museum guide to Tutankhamun’s treasures, made for the phone in your hand.', in: 27.6, out: 30.6 },
  { style: 'sideBig', text: 'An immersive journey, controlled by you.', in: 31.2, out: 38.0 },

  { style: 'caption', text: 'Scroll, and the story moves with you.', in: 38.9, out: 42.2 },
  { style: 'caption', text: 'Each chapter is told on a papyrus.', in: 42.6, out: 46.4 },
  { style: 'caption', text: 'Harry Burton’s excavation photographs, on every chapter.', in: 46.8, out: 52.0 },
  { style: 'caption', text: 'The mask travels with you through the tomb.', in: 52.4, out: 57.4 },
  { style: 'caption', text: 'From the Valley of the Kings to the Grand Egyptian Museum.', in: 57.8, out: 61.8 },

  { style: 'caption', text: 'Open any treasure in Inspect.', in: 62.4, out: 65.2 },
  { style: 'caption', text: 'Turn it through 360°, by hand.', in: 65.6, out: 69.4 },
  { style: 'caption', text: 'Points of interest explain each detail.', in: 69.8, out: 72.6 },
  { style: 'caption', text: 'Beside Burton’s photographs of the real throne.', in: 73.0, out: 75.4 },
  { style: 'caption', text: 'In English and Arabic, right to left.', in: 75.9, out: 80.6 },

  { style: 'sideBig', text: 'Turn it with a finger, on any phone.', in: 81.2, out: 88.6 },
  { style: 'note', text: '3D objects are artistic reconstructions, and are labelled as such.', in: 82.4, out: 88.6 },

  { style: 'sideBig', text: 'Pause, and read the whole story.', in: 89.2, out: 92.6 },
  { style: 'sideBig', text: 'Scroll on when you are ready.', in: 93.0, out: 95.6 },
  { style: 'sideBig', text: 'Save the treasures that call to you.', in: 96.0, out: 99.3 },
  { style: 'sideBig', text: 'Your Discovery Trail, ready for your visit.', in: 99.7, out: 103.0 },
  { style: 'sideBig', text: 'Go back to any chapter, any time.', in: 103.4, out: 105.9 },

  { style: 'title', text: 'THE LOST TOMB', in: 107.6, out: 114.0 },
  { style: 'subtitle', text: 'Your journey into history starts here.', in: 109.2, out: 114.0 },
  { style: 'endcredit', text: 'Built for the GEM Hackathon 2026. Archival photographs: Harry Burton, public domain. 3D objects are artistic reconstructions.', in: 111.6, out: 115.2 },
]
