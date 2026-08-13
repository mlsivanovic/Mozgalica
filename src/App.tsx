import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { PitanjaSekcija, RezultatiSekcija } from './components/AdminSekcijaTabovi'
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
import { StatistikaDece } from './routes/admin/StatistikaDece'
import { StatistikaDetetaDetalj } from './routes/admin/StatistikaDetetaDetalj'
import { KvizRezultat } from './routes/kviz/KvizRezultat'
import { KvizResavanje } from './routes/kviz/KvizResavanje'
import { KvizUlaz } from './routes/kviz/KvizUlaz'
import { NijePronadjeno } from './routes/NijePronadjeno'
import { Prodavnica } from './routes/dete/Prodavnica'
import { ProfilDeteta } from './routes/dete/ProfilDeteta'
import { PwaPocetakDeteta } from './routes/dete/PwaPocetakDeteta'

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/prijava" element={<Prijava />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Kontrolna />} />
            <Route path="pitanja" element={<PitanjaSekcija />}>
              <Route index element={<PitanjaLista />} />
              <Route path="generator" element={<Generator />} />
            </Route>
            <Route path="generator" element={<Navigate to="/admin/pitanja/generator" replace />} />
            <Route path="kvizovi" element={<KvizoviLista />} />
            <Route path="kvizovi/novi" element={<KvizForma />} />
            <Route path="kvizovi/:id" element={<KvizDetalj />} />
            <Route path="rezultati" element={<RezultatiSekcija />}>
              <Route index element={<Rezultati />} />
              <Route path="statistika" element={<StatistikaDece />} />
              <Route path="statistika/:profilId" element={<StatistikaDetetaDetalj />} />
              <Route path=":id" element={<RezultatDetalj />} />
            </Route>
            <Route path="statistika-dece" element={<Navigate to="/admin/rezultati/statistika" replace />} />
            <Route path="statistika-dece/:profilId" element={<PreusmeriStaruStatistiku />} />
            <Route path="podesavanja" element={<Podesavanja />} />
          </Route>

          <Route path="/kviz/:token" element={<KvizUlaz />} />
          <Route path="/kviz/:token/resi" element={<KvizResavanje />} />
          <Route path="/kviz/:token/rezultat" element={<KvizRezultat />} />
          <Route path="/dete/pocetak" element={<PwaPocetakDeteta />} />
          <Route path="/dete/:profilToken" element={<ProfilDeteta />} />
          <Route path="/prodavnica/:profilToken" element={<Prodavnica />} />

          <Route path="*" element={<NijePronadjeno />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}

function PreusmeriStaruStatistiku() {
  const { profilId } = useParams<{ profilId: string }>()
  return <Navigate to={`/admin/rezultati/statistika/${profilId ?? ''}`} replace />
}

export default App
