import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { PitanjaSekcija } from './components/AdminSekcijaTabovi'
import { VezbanjeSekcija, NagradeSekcija } from './components/RoditeljskeSekcije'
import { Vezbanje } from './routes/admin/Vezbanje'
import { Rasporedi } from './routes/admin/Rasporedi'
import { RasporedCasova } from './routes/admin/RasporedCasova'
import { Napredak, NapredakSekcija } from './routes/admin/Napredak'
import { Zadaj } from './routes/admin/Zadaj'
import { RoditeljskoPreusmerenje } from './lib/roditelj'
import { AuthProvider } from './lib/auth'
import { Generator } from './routes/admin/Generator'
import { KvizDetalj } from './routes/admin/KvizDetalj'
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
import { Prodavnica } from './routes/dete/Prodavnica'
import { ProfilDeteta } from './routes/dete/ProfilDeteta'
import { PwaPocetakDeteta } from './routes/dete/PwaPocetakDeteta'
import { Loader } from './components/Zajednicke'

const Sah = lazy(() => import('./routes/admin/Sah').then((modul) => ({ default: modul.Sah })))
const SahPartija = lazy(() => import('./routes/sah/SahPartija').then((modul) => ({ default: modul.SahPartija })))

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Suspense fallback={<Loader />}>
          <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/prijava" element={<Prijava />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Kontrolna />} />
            <Route path="raspored-casova" element={<RasporedCasova />} />
            <Route element={<VezbanjeSekcija />}>
              <Route path="vezbanje" element={<Vezbanje />} />
              <Route path="vezbanje/rasporedi" element={<Rasporedi />} />
              <Route path="pitanja" element={<PitanjaSekcija />}>
                <Route index element={<PitanjaLista />} />
                <Route path="generator" element={<Generator />} />
              </Route>
              <Route path="kvizovi" element={<KvizoviLista />} />
            </Route>
            <Route path="generator" element={<RoditeljskoPreusmerenje to="/admin/pitanja/generator" />} />
            <Route path="zadaj" element={<Zadaj />} />
            <Route path="kvizovi/novi" element={<RoditeljskoPreusmerenje to="/admin/zadaj" />} />
            <Route path="kvizovi/:id" element={<KvizDetalj />} />
            <Route path="sah" element={<Sah />} />
            <Route path="napredak" element={<NapredakSekcija />}>
              <Route index element={<Napredak />} />
              <Route path="rezultati" element={<Rezultati />} />
            </Route>
            <Route path="rezultati" element={<RoditeljskoPreusmerenje to="/admin/napredak/rezultati" />} />
            <Route path="rezultati/statistika" element={<RoditeljskoPreusmerenje to="/admin/napredak" />} />
            <Route path="rezultati/statistika/:profilId" element={<PreusmeriStaruStatistiku />} />
            <Route path="rezultati/:id" element={<RezultatDetalj />} />
            <Route path="statistika-dece" element={<RoditeljskoPreusmerenje to="/admin/napredak" />} />
            <Route path="statistika-dece/:profilId" element={<PreusmeriStaruStatistiku />} />
            <Route path="nagrade" element={<NagradeSekcija />}>
              <Route index element={<Podesavanja key="isporuka" sekcija="isporuka" />} />
              <Route path="istorija" element={<Podesavanja key="istorija" sekcija="istorija" />} />
              <Route path="katalog" element={<Podesavanja key="katalog" sekcija="katalog" />} />
              <Route path="pravila" element={<Podesavanja key="pravila" sekcija="pravila" />} />
            </Route>
            <Route path="deca" element={<Podesavanja key="profili" sekcija="profili" />} />
            <Route path="podesavanja" element={<Podesavanja key="obavestenja" />} />
          </Route>

          <Route path="/kviz/:token" element={<KvizUlaz />} />
          <Route path="/kviz/:token/resi" element={<KvizResavanje />} />
          <Route path="/kviz/:token/rezultat" element={<KvizRezultat />} />
          <Route path="/dete/pocetak" element={<PwaPocetakDeteta />} />
          <Route path="/dete/:profilToken" element={<ProfilDeteta />} />
          <Route path="/prodavnica/:profilToken" element={<Prodavnica />} />
          <Route path="/sah/:token" element={<SahPartija />} />

          <Route path="*" element={<NijePronadjeno />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </HashRouter>
  )
}

function PreusmeriStaruStatistiku() {
  const { profilId } = useParams<{ profilId: string }>()
  return <RoditeljskoPreusmerenje to={`/admin/napredak?dete=${profilId ?? ''}`} />
}

export default App
