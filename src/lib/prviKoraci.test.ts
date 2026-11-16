import { describe, expect, it } from 'vitest'
import {
  prviKorakiZavrseni, stavkePrvihKoraka, type StanjePrvihKoraka,
} from './prviKoraci'
import { MEJL_DETETU_ZA_NOVI_KVIZ, MEJL_RODITELJU_POSLE_KVIZA } from './funkcije'

const prazno: StanjePrvihKoraka = {
  brojDece: 0,
  imaDnevniRaspored: false,
  imaDodeljenKviz: false,
  pushUkljucen: false,
  imaRezultatDeteta: false,
  linkOznacenPoslat: false,
}

function gotove(stavke: ReturnType<typeof stavkePrvihKoraka>): string[] {
  return stavke.filter((s) => s.gotovo).map((s) => s.id)
}

describe('prvi koraci', () => {
  it('za novog roditelja nijedna stavka nije gotova i kartica nije završena', () => {
    const stavke = stavkePrvihKoraka(prazno)
    expect(stavke.map((s) => s.id)).toEqual(['dete', 'link', 'vezba', 'push'])
    expect(gotove(stavke)).toEqual([])
    expect(prviKorakiZavrseni(stavke)).toBe(false)
  })

  it('dodato dete štiklira prvi korak, a ne i ostale', () => {
    expect(gotove(stavkePrvihKoraka({ ...prazno, brojDece: 1 }))).toEqual(['dete'])
  })

  it('link je gotov kad dete ima rezultat ili kad roditelj označi da je poslat', () => {
    expect(gotove(stavkePrvihKoraka({ ...prazno, imaRezultatDeteta: true }))).toEqual(['link'])
    expect(gotove(stavkePrvihKoraka({ ...prazno, linkOznacenPoslat: true }))).toEqual(['link'])
  })

  it('vežba je gotova ili kad postoji dnevni raspored ili kad je zadat kviz', () => {
    expect(gotove(stavkePrvihKoraka({ ...prazno, imaDnevniRaspored: true }))).toEqual(['vezba'])
    expect(gotove(stavkePrvihKoraka({ ...prazno, imaDodeljenKviz: true }))).toEqual(['vezba'])
  })

  it('kartica je završena tek kad su sva četiri koraka gotova', () => {
    const sve: StanjePrvihKoraka = {
      brojDece: 2,
      imaDnevniRaspored: false,
      imaDodeljenKviz: true,
      pushUkljucen: true,
      imaRezultatDeteta: true,
      linkOznacenPoslat: false,
    }
    const stavke = stavkePrvihKoraka(sve)
    expect(prviKorakiZavrseni(stavke)).toBe(true)
    expect(prviKorakiZavrseni(stavkePrvihKoraka({ ...sve, pushUkljucen: false }))).toBe(false)
  })

  it('stavka sa linkom vodi na profile dece, a stavka sa pushom na podešavanja', () => {
    const stavke = stavkePrvihKoraka(prazno)
    expect(stavke.find((s) => s.id === 'link')?.putanja).toBe('/admin/deca')
    expect(stavke.find((s) => s.id === 'push')?.putanja).toBe('/admin/podesavanja')
  })
})

describe('prekidači mejlova', () => {
  it('oba mejla obaveštenja su privremeno isključena', () => {
    expect(MEJL_DETETU_ZA_NOVI_KVIZ).toBe(false)
    expect(MEJL_RODITELJU_POSLE_KVIZA).toBe(false)
  })
})
