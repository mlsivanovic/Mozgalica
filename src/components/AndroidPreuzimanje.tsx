import { useState } from 'react'
import {
  ANDROID_APK_URL, KLJUC_SKRIVEN_ANDROID_BANER, prikaziAndroidBaner, prikaziAndroidPreuzimanje,
} from '../lib/decjaAplikacija'
import { Ikona } from './Ikona'

function ulazPregledaca() {
  return {
    userAgent: navigator.userAgent,
    referrer: document.referrer,
    search: window.location.search,
  }
}

function bannerSkriven(): boolean {
  try {
    return localStorage.getItem(KLJUC_SKRIVEN_ANDROID_BANER) === '1'
  } catch {
    return false
  }
}

export function AndroidPreuzimanjeKartica() {
  if (!prikaziAndroidPreuzimanje(ulazPregledaca())) return null

  return (
    <section className="kartica profil-android">
      <h2>Android aplikacija</h2>
      <p className="blago">
        Aplikacija je odvojena od Chrome-a. U Family Link-u je stavi na neograničeno vreme,
        pa se ne računa u dnevni limit. Ovo ne važi u Google Kids Space-u.
      </p>
      <a className="dugme dugme--akcenat" href={ANDROID_APK_URL} target="_blank" rel="noopener noreferrer">
        <Ikona ime="preuzmi" velicina={18} /> Preuzmi Android aplikaciju
      </a>
      <p className="malo">
        Preuzmi fajl i otvori ga. Dozvoli instalaciju nepoznatih aplikacija samo za pregledač
        ili Files, pa tu dozvolu posle instalacije isključi. U Family Link-u: dete, pa Vreme
        ispred ekrana → Ograničenja → Ograničenja za aplikacije → Moja Mozgalica → Neograničeno vreme.
      </p>
    </section>
  )
}

/** Istaknut poziv na Početnoj u Android pregledaču; zatvaranje se pamti na uređaju. */
export function AndroidBaner() {
  const [skriven, setSkriven] = useState(bannerSkriven)
  if (!prikaziAndroidBaner({ ...ulazPregledaca(), skriven })) return null

  function sakrij() {
    try {
      localStorage.setItem(KLJUC_SKRIVEN_ANDROID_BANER, '1')
    } catch {
      // Privatni režim: baner se samo sakrije do sledećeg otvaranja.
    }
    setSkriven(true)
  }

  return (
    <section className="kartica profil-android-baner" aria-label="Android aplikacija">
      <div className="profil-android-baner__tekst">
        <strong>Moja Mozgalica za Android</strong>
        <span className="malo blago">Brža aplikacija sa obaveštenjima i šahom — instaliraj je na telefon.</span>
      </div>
      <a className="dugme dugme--akcenat dugme--malo" href={ANDROID_APK_URL} target="_blank" rel="noopener noreferrer">
        <Ikona ime="preuzmi" velicina={16} /> Preuzmi
      </a>
      <button type="button" className="ui-ikona-dugme" aria-label="Zatvori" onClick={sakrij}>
        <Ikona ime="zatvori" velicina={18} />
      </button>
    </section>
  )
}
