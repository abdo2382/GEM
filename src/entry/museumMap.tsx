// The museum map. Loads only at /museum-map.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../site/fonts'
import '../site/site.css'
import { MuseumMapPage } from '../museum-map/MuseumMapPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MuseumMapPage />
  </StrictMode>,
)
