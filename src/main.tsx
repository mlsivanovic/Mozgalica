import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { adresaDecjeAplikacije } from './lib/decjaAplikacija'
import { pokreniProveruAzuriranja } from './pwa'
import { jeAuthHash, obradiAuthPovratak } from './lib/authPovratak'

const adresaOmotaca = adresaDecjeAplikacije(window.location)
if (adresaOmotaca) window.location.replace(adresaOmotaca)
else obradiAuthPovratak(window.location, window.history, sessionStorage)

// Link iz mejla otvoren u već učitanoj strani menja samo hash; supabase-js ga čita samo pri pokretanju.
window.addEventListener('hashchange', () => {
  if (jeAuthHash(window.location.hash)) window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

pokreniProveruAzuriranja()
