// Testovi offline reda: lokalni upis, sinhronizacija, otpornost na pokvareno skladište
import { describe, expect, it } from 'vitest'
import {
  belezkeZaSinhronizaciju, brojNesinhronizovanihBelezki, nesinhronizovani, obrisiStanje,
  oznaciBelezkeSinhronizovane, oznaciSinhronizovane, sveSinhronizovano,
  ucitajStanje, upisiBelezku, upisiHint, upisiOdgovor, zapocniStanje, type Skladiste,
} from './offlineQueue'

function memorijskoSkladiste(): Skladiste {
  const mapa = new Map<string, string>()
  return {
    getItem: (k) => mapa.get(k) ?? null,
    setItem: (k, v) => void mapa.set(k, v),
    removeItem: (k) => void mapa.delete(k),
  }
}

describe('offline red', () => {
  it('upisuje i učitava stanje pokušaja', () => {
    const s = memorijskoSkladiste()
    zapocniStanje(s, 'kviz1', 'token-abc', 'Lena')
    const ucitano = ucitajStanje(s, 'kviz1')
    expect(ucitano?.attemptToken).toBe('token-abc')
    expect(ucitano?.childName).toBe('Lena')
  })

  it('novi odgovor je nesinhronizovan dok server ne potvrdi', () => {
    const s = memorijskoSkladiste()
    let stanje = zapocniStanje(s, 'kviz1', 't', 'Vuk')
    stanje = upisiOdgovor(s, 'kviz1', stanje, 'q1', { value: '42' })
    expect(sveSinhronizovano(stanje)).toBe(false)
    expect(Object.keys(nesinhronizovani(stanje))).toEqual(['q1'])

    stanje = oznaciSinhronizovane(s, 'kviz1', stanje, { q1: { value: '42' } }, Date.now() + 1)
    expect(sveSinhronizovano(stanje)).toBe(true)
    expect(nesinhronizovani(stanje)).toEqual({})
  })

  it('odgovor promenjen POSLE slanja ostaje nesinhronizovan', () => {
    const s = memorijskoSkladiste()
    let stanje = zapocniStanje(s, 'kviz1', 't', 'Iva')
    stanje = upisiOdgovor(s, 'kviz1', stanje, 'q1', { value: '1' })
    const vremeSlanja = Date.now() - 1000 // slanje je počelo pre promene
    stanje = oznaciSinhronizovane(s, 'kviz1', stanje, { q1: { value: '1' } }, vremeSlanja)
    expect(sveSinhronizovano(stanje)).toBe(false)
  })

  it('stanje preživljava ponovno učitavanje (refresh stranice)', () => {
    const s = memorijskoSkladiste()
    let stanje = zapocniStanje(s, 'kvizX', 'tajni', 'Maša')
    stanje = upisiOdgovor(s, 'kvizX', stanje, 'q7', { optionId: 'o2' })
    const posleRefresha = ucitajStanje(s, 'kvizX')
    expect(posleRefresha?.answers.q7.answer).toEqual({ optionId: 'o2' })
    expect(posleRefresha?.answers.q7.synced).toBe(false)
  })

  it('pokvaren JSON u skladištu ne ruši aplikaciju', () => {
    const s = memorijskoSkladiste()
    s.setItem('mozgalica:pokusaj:los', '{nije json')
    expect(ucitajStanje(s, 'los')).toBeNull()
  })

  it('skladište koje baca izuzetke ne ruši aplikaciju', () => {
    const eksplozivno: Skladiste = {
      getItem: () => { throw new Error('kvota') },
      setItem: () => { throw new Error('kvota') },
      removeItem: () => { throw new Error('kvota') },
    }
    expect(ucitajStanje(eksplozivno, 'x')).toBeNull()
    expect(() => zapocniStanje(eksplozivno, 'x', 't', 'A')).not.toThrow()
    expect(() => obrisiStanje(eksplozivno, 'x')).not.toThrow()
  })

  it('brisanje stanja čisti skladište', () => {
    const s = memorijskoSkladiste()
    zapocniStanje(s, 'kviz1', 't', 'Vuk')
    obrisiStanje(s, 'kviz1')
    expect(ucitajStanje(s, 'kviz1')).toBeNull()
  })

  it('čuva podatke potrebne za povratak na profil deteta', () => {
    const s = memorijskoSkladiste()
    zapocniStanje(s, 'profilni-kviz', 'attempt-token', 'Andreja', {
      accessMode: 'profile',
      profileToken: 'profil-token',
    })

    expect(ucitajStanje(s, 'profilni-kviz')).toMatchObject({
      attemptToken: 'attempt-token',
      childName: 'Andreja',
      accessMode: 'profile',
      profileToken: 'profil-token',
    })
  })

  it('otključan savet se čuva lokalno i preživljava ponovno učitavanje', () => {
    const s = memorijskoSkladiste()
    let stanje = zapocniStanje(s, 'kvizH', 't', 'Nina')
    stanje = upisiHint(s, 'kvizH', stanje, 'q1', 'Seti se tablice množenja.', 1)
    expect(stanje.hintsUsed).toBe(1)
    expect(stanje.hintovi?.q1).toBe('Seti se tablice množenja.')

    const posleRefresha = ucitajStanje(s, 'kvizH')
    expect(posleRefresha?.hintsUsed).toBe(1)
    expect(posleRefresha?.hintovi?.q1).toBe('Seti se tablice množenja.')
  })

  it('drugi otključan savet se dodaje uz prvi, ne zamenjuje ga', () => {
    const s = memorijskoSkladiste()
    let stanje = zapocniStanje(s, 'kvizH2', 't', 'Filip')
    stanje = upisiHint(s, 'kvizH2', stanje, 'q1', 'Savet 1', 1)
    stanje = upisiHint(s, 'kvizH2', stanje, 'q2', 'Savet 2', 2)
    expect(stanje.hintsUsed).toBe(2)
    expect(stanje.hintovi).toEqual({ q1: 'Savet 1', q2: 'Savet 2' })
  })

  it('radni listić se čuva lokalno i čeka slanje kao celina', () => {
    const s = memorijskoSkladiste()
    let stanje = zapocniStanje(s, 'kvizR', 't', 'Miloš')
    stanje = upisiBelezku(s, 'kvizR', stanje, 'q1', '24 + 17 = 41')
    expect(brojNesinhronizovanihBelezki(stanje)).toBe(1)
    expect(belezkeZaSinhronizaciju(stanje)).toEqual({ q1: '24 + 17 = 41' })

    stanje = upisiBelezku(s, 'kvizR', stanje, 'q2', '7 · 8 = 56')
    expect(belezkeZaSinhronizaciju(stanje)).toEqual({ q1: '24 + 17 = 41', q2: '7 · 8 = 56' })

    stanje = oznaciBelezkeSinhronizovane(s, 'kvizR', stanje, Date.now() + 1)
    expect(brojNesinhronizovanihBelezki(stanje)).toBe(0)
    expect(belezkeZaSinhronizaciju(stanje)).toBeNull()
  })

  it('beležka promenjena POSLE slanja ostaje nesinhronizovana', () => {
    const s = memorijskoSkladiste()
    let stanje = zapocniStanje(s, 'kvizR2', 't', 'Ana')
    stanje = upisiBelezku(s, 'kvizR2', stanje, 'q1', 'prvi korak')
    stanje = oznaciBelezkeSinhronizovane(s, 'kvizR2', stanje, Date.now() - 1000)
    expect(brojNesinhronizovanihBelezki(stanje)).toBe(1)
  })

  it('radni listić preživljava ponovno učitavanje, a staro stanje bez njega se čita', () => {
    const s = memorijskoSkladiste()
    let stanje = zapocniStanje(s, 'kvizR3', 't', 'Ana')
    stanje = upisiBelezku(s, 'kvizR3', stanje, 'q5', '5 + 5 = 10')
    expect(ucitajStanje(s, 'kvizR3')?.belezke?.q5.tekst).toBe('5 + 5 = 10')

    s.setItem('mozgalica:pokusaj:bezradnog', JSON.stringify({ attemptToken: 't', childName: 'A', answers: {} }))
    expect(ucitajStanje(s, 'bezradnog')?.belezke).toBeUndefined()
  })

  it('staro sačuvano stanje bez polja za savete se i dalje ispravno učitava', () => {
    const s = memorijskoSkladiste()
    s.setItem('mozgalica:pokusaj:star', JSON.stringify({ attemptToken: 't', childName: 'A', answers: {} }))
    const ucitano = ucitajStanje(s, 'star')
    expect(ucitano?.attemptToken).toBe('t')
    expect(ucitano?.hintsUsed).toBeUndefined()
    expect(ucitano?.hintovi).toBeUndefined()
  })
})
