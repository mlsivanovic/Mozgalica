import { beforeEach, describe, expect, it } from 'vitest'
import {
  izdvojiProfilniToken, poveziProfilSaPwa, ucitajPovezaniProfil,
  ucitajProfilZaInstalaciju, zaboraviPovezaniProfil, zapamtiProfilZaInstalaciju,
} from './profilPwa'

const TOKEN = 's6x6i9AdsRRuadngZOWYI_OEpi95grqI'
const skladiste = new Map<string, string>()

beforeEach(() => {
  skladiste.clear()
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (kljuc: string) => skladiste.get(kljuc) ?? null,
        setItem: (kljuc: string, vrednost: string) => skladiste.set(kljuc, vrednost),
        removeItem: (kljuc: string) => skladiste.delete(kljuc),
      },
    },
  })
})

describe('PWA profil deteta', () => {
  it('izdvaja token iz punog profilnog linka', () => {
    expect(izdvojiProfilniToken(
      `https://mlsivanovic.github.io/Mozgalica/#/dete/${TOKEN}`,
    )).toBe(TOKEN)
  })

  it('prihvata sam token, a odbija neispravan unos', () => {
    expect(izdvojiProfilniToken(TOKEN)).toBe(TOKEN)
    expect(izdvojiProfilniToken('kratak-token')).toBeNull()
    expect(izdvojiProfilniToken('https://primer.rs/#/admin')).toBeNull()
  })

  it('čuva kandidata za instalaciju i pretvara ga u povezani profil', () => {
    zapamtiProfilZaInstalaciju(TOKEN)
    expect(ucitajProfilZaInstalaciju()).toBe(TOKEN)

    poveziProfilSaPwa(TOKEN)
    expect(ucitajPovezaniProfil()).toBe(TOKEN)
    expect(ucitajProfilZaInstalaciju()).toBeNull()

    zaboraviPovezaniProfil()
    expect(ucitajPovezaniProfil()).toBeNull()
  })
})
