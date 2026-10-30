import { resolvePage } from './site/route'

// Three pages share one build but not one page load: the homepage, the museum map and the
// experience each load only their own code and styles (see site/route.ts).
const target = resolvePage(location.pathname, location.search)

if ('redirect' in target) {
  location.replace(target.redirect + location.hash)
} else {
  const entries = {
    home: () => import('./entry/home'),
    'museum-map': () => import('./entry/museumMap'),
    'lost-tomb': () => import('./entry/lostTomb'),
  }
  entries[target.page]().catch(() => {
    // A failed download (offline, or a stale tab after an update): say so, in both languages.
    const root = document.getElementById('root')
    if (root) root.textContent = 'This page could not load. Check your connection and reload. · تعذّر تحميل الصفحة. تحقق من الاتصال ثم أعد التحميل.'
  })
}
