import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { PitanjaSekcija } from './components/AdminSekcijaTabovi'
import { VezbanjeSekcija, NagradeSekcija } from './components/RoditeljskeSekcije'
import { RoditeljskoPreusmerenje } from './lib/roditelj'
import { AuthProvider } from './lib/auth'
import { NijePronadjeno } from './routes/NijePronadjeno'
import { Loader } from './components/Zajednicke'
import { DecjiLayout } from './components/DecjiLayout'

const Sah = lazy(() => import('./routes/admin/Sah').then((modul) => ({ default: modul.Sah })))
const SahPartija = lazy(() => import('./routes/sah/SahPartija').then((modul) => ({ default: modul.SahPartija })))
const Vezbanje = lazy(() => import('./routes/admin/Vezbanje').then(m => ({ default: m.Vezbanje })))
const Rasporedi = lazy(() => import('./routes/admin/Rasporedi').then(m => ({ default: m.Rasporedi })))
const RasporedCasova = lazy(() => import('./routes/admin/RasporedCasova').then(m => ({ default: m.RasporedCasova })))
const Napredak = lazy(() => import('./routes/admin/Napredak').then(m => ({ default: m.Napredak })))
const NapredakSekcija = lazy(() => import('./routes/admin/Napredak').then(m => ({ default: m.NapredakSekcija })))
const Zadaj = lazy(() => import('./routes/admin/Zadaj').then(m => ({ default: m.Zadaj })))
const Generator = lazy(() => import('./routes/admin/Generator').then(m => ({ default: m.Generator })))
const KvizDetalj = lazy(() => import('./routes/admin/KvizDetalj').then(m => ({ default: m.KvizDetalj })))
const KvizoviLista = lazy(() => import('./routes/admin/KvizoviLista').then(m => ({ default: m.KvizoviLista })))
const Kontrolna = lazy(() => import('./routes/admin/Kontrolna').then(m => ({ default: m.Kontrolna })))
const PitanjaLista = lazy(() => import('./routes/admin/PitanjaLista').then(m => ({ default: m.PitanjaLista })))
const Podesavanja = lazy(() => import('./routes/admin/Podesavanja').then(m => ({ default: m.Podesavanja })))
const Prijava = lazy(() => import('./routes/admin/Prijava').then(m => ({ default: m.Prijava })))
const RezultatDetalj = lazy(() => import('./routes/admin/RezultatDetalj').then(m => ({ default: m.RezultatDetalj })))
const Rezultati = lazy(() => import('./routes/admin/Rezultati').then(m => ({ default: m.Rezultati })))
const KvizRezultat = lazy(() => import('./routes/kviz/KvizRezultat').then(m => ({ default: m.KvizRezultat })))
const KvizResavanje = lazy(() => import('./routes/kviz/KvizResavanje').then(m => ({ default: m.KvizResavanje })))
const KvizUlaz = lazy(() => import('./routes/kviz/KvizUlaz').then(m => ({ default: m.KvizUlaz })))
const Prodavnica = lazy(() => import('./routes/dete/Prodavnica').then(m => ({ default: m.Prodavnica })))
const ProfilDeteta = lazy(() => import('./routes/dete/ProfilDeteta').then(m => ({ default: m.ProfilDeteta })))
const PwaPocetakDeteta = lazy(() => import('./routes/dete/PwaPocetakDeteta').then(m => ({ default: m.PwaPocetakDeteta })))

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
          <Route path="/dete/:profilToken" element={<DecjiLayout />}>
            <Route index element={<ProfilDeteta prikaz="pocetna" />} />
            <Route path="raspored" element={<ProfilDeteta prikaz="raspored" />} />
            <Route path="nagrade" element={<ProfilDeteta prikaz="nagrade" />} />
            <Route path="nagrade/prodavnica" element={<Prodavnica />} />
            <Route path="rezultati" element={<ProfilDeteta prikaz="rezultati" />} />
            <Route path="podesavanja" element={<ProfilDeteta prikaz="podesavanja" />} />
          </Route>
          <Route path="/prodavnica/:profilToken" element={<PreusmeriProdavnicu />} />
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

function PreusmeriProdavnicu() {
  const { profilToken = '' } = useParams<{ profilToken: string }>()
  return <Navigate to={`/dete/${profilToken}/nagrade/prodavnica`} replace />
}

export default App
