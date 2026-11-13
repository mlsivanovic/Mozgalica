import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { adresaDecjeAplikacije } from './lib/decjaAplikacija'
import { pokreniProveruAzuriranja } from './pwa'

const adresaOmotaca = adresaDecjeAplikacije(window.location)
if (adresaOmotaca) window.location.replace(adresaOmotaca)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

pokreniProveruAzuriranja()
