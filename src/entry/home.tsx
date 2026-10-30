// The homepage: the two ways in. Loads only at /.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../site/fonts'
import '../site/site.css'
import { Home } from '../site/Home'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
)
