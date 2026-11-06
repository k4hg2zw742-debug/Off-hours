import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/instrument-sans'
import './index.css'
import App from './App.tsx'

// Normal builds use clean paths. The hosted-preview build (`npm run build:artifact`) runs inside a
// frame that cannot use path-based URLs, so it routes on the hash instead.
const useHash = import.meta.env.VITE_ROUTER === 'hash'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {useHash ? (
      <HashRouter>
        <App />
      </HashRouter>
    ) : (
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
)
