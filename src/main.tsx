import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/500.css'
import '@fontsource/amiri/400.css'
import '@fontsource/amiri/700.css'
import '@fontsource/reem-kufi/500.css'
import '@fontsource/reem-kufi/600.css'
import '@fontsource/noto-sans-egyptian-hieroglyphs/400.css'
import 'lenis/dist/lenis.css'
import './styles/global.css'
import './styles/papyrus.css'
import './styles/panels.css'
import App from './App'

// The journey always begins at the top of the tomb.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
// Studio mode: the mask alone, without interface, for reference and presentation shots.
if (new URLSearchParams(location.search).has('studio')) document.documentElement.classList.add('studio')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
