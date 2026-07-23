import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { AuthProvider } from './lib/auth'
import { Generator } from './routes/admin/Generator'
import { KvizDetalj } from './routes/admin/KvizDetalj'
import { KvizForma } from './routes/admin/KvizForma'
import { KvizoviLista } from './routes/admin/KvizoviLista'
import { Kontrolna } from './routes/admin/Kontrolna'
import { PitanjaLista } from './routes/admin/PitanjaLista'
import { Podesavanja } from './routes/admin/Podesavanja'
import { Prijava } from './routes/admin/Prijava'
import { RezultatDetalj } from './routes/admin/RezultatDetalj'
import { Rezultati } from './routes/admin/Rezultati'
import { KvizRezultat } from './routes/kviz/KvizRezultat'
import { KvizResavanje } from './routes/kviz/KvizResavanje'
import { KvizUlaz } from './routes/kviz/KvizUlaz'
import { NijePronadjeno } from './routes/NijePronadjeno'
import { ProfilDeteta } from './routes/dete/ProfilDeteta'

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/prijava" element={<Prijava />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Kontrolna />} />
            <Route path="pitanja" element={<PitanjaLista />} />
            <Route path="generator" element={<Generator />} />
            <Route path="kvizovi" element={<KvizoviLista />} />
            <Route path="kvizovi/novi" element={<KvizForma />} />
            <Route path="kvizovi/:id" element={<KvizDetalj />} />
            <Route path="rezultati" element={<Rezultati />} />
            <Route path="rezultati/:id" element={<RezultatDetalj />} />
            <Route path="podesavanja" element={<Podesavanja />} />
          </Route>

          <Route path="/kviz/:token" element={<KvizUlaz />} />
          <Route path="/kviz/:token/resi" element={<KvizResavanje />} />
          <Route path="/kviz/:token/rezultat" element={<KvizRezultat />} />
          <Route path="/dete/:profilToken" element={<ProfilDeteta />} />

          <Route path="*" element={<NijePronadjeno />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
