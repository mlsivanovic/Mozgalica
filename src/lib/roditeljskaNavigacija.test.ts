import { describe, expect, it } from 'vitest'
import { sacuvajKontekstPutanje, saDetetom, glavnaSekcija, zajednickaStranica, uredjivanjeAktivnosti } from './roditeljskePutanje'
import { procitajPeriod } from './periodNapretka'

describe('roditeljski kontekst u URL-u', () => {
  it('čuva izbor deteta kroz sva odredišta i njihove postojeće filtere', () => {
    for (const putanja of ['/admin', '/admin/vezbanje?vrsta=quiz', '/admin/napredak?period=7d', '/admin/nagrade', '/admin/pitanja', '/admin/nagrade/katalog']) {
      const rezultat = new URL(saDetetom(putanja, 'dete-1'), 'https://test.invalid')
      expect(rezultat.searchParams.get('dete')).toBe('dete-1')
      const pre = new URL(putanja, 'https://test.invalid')
      pre.searchParams.forEach((v,k) => expect(rezultat.searchParams.get(k)).toBe(v))
    }
  })
  it('poštuje eksplicitan drugi profil i izbor sve dece, bez menjanja dečjih linkova', () => {
    expect(saDetetom('/admin?dete=drugo', 'prvo')).toBe('/admin?dete=drugo')
    expect(saDetetom('/admin?dete=', 'prvo')).toBe('/admin?dete=')
    expect(saDetetom('/kviz/token', 'prvo')).toBe('/kviz/token')
    expect(saDetetom('/admin/vezbanje', '')).toBe('/admin/vezbanje')
  })
  it('zajedničke alate i stare linkove vezuje za pravo odredište', () => {
    expect(zajednickaStranica('/admin/pitanja/generator')).toBe(true)
    expect(zajednickaStranica('/admin/nagrade/katalog')).toBe(true)
    expect(zajednickaStranica('/admin/nagrade')).toBe(false)
    expect(uredjivanjeAktivnosti('/admin/kvizovi/neki-kviz')).toBe(true)
    expect(glavnaSekcija('/admin/rezultati/nekakav-id')).toBe('napredak')
    expect(glavnaSekcija('/admin/sah')).toBe('vezbanje')
  })
})

describe('period napretka iz deljivog URL-a', () => {
  it('podrazumeva 30 dana i prepoznaje novi dan u Beogradu', () => {
    const sada = new Date('2026-08-30T22:01:00Z')
    expect(procitajPeriod(new URLSearchParams(), sada)).toMatchObject({period:'30d',from:'2026-08-02',to:'2026-08-31',greska:null})
    expect(procitajPeriod(new URLSearchParams('period=today'), sada)).toMatchObject({from:'2026-08-31',to:'2026-08-31'})
    expect(procitajPeriod(new URLSearchParams('period=today'), new Date('2026-10-25T23:01:00Z'))).toMatchObject({from:'2026-10-26',to:'2026-10-26'})
  })
  it('ne pretvara neispravan prilagođeni period u prazan uspešan rezultat', () => {
    expect(procitajPeriod(new URLSearchParams('period=custom&od=2026-02-30&do=2026-03-01')).greska).toBeTruthy()
    expect(procitajPeriod(new URLSearchParams('period=custom&od=2026-08-31&do=2026-08-01')).greska).toBeTruthy()
    expect(procitajPeriod(new URLSearchParams('period=all'))).toMatchObject({from:null,to:null})
  })
})

it('vraća filtere rezultata i arhivu posle otvaranja detalja', () => {
  const detalj = sacuvajKontekstPutanje('/admin/rezultati/pokusaj-1', 'dete-1', '/admin/napredak/rezultati', '?period=custom&od=2026-08-01&do=2026-08-31&status=review_pending&predmet=srpski')
  const nazad = sacuvajKontekstPutanje('/admin/napredak/rezultati', 'dete-1', '/admin/rezultati/pokusaj-1', detalj.split('?')[1])
  expect(new URLSearchParams(nazad.split('?')[1]).get('status')).toBe('review_pending')
  expect(new URLSearchParams(nazad.split('?')[1]).get('od')).toBe('2026-08-01')
  expect(sacuvajKontekstPutanje('/admin/kvizovi/kviz-1', '', '/admin/kvizovi', '?prikaz=arhiva')).toBe('/admin/kvizovi/kviz-1?prikaz=arhiva')
  expect(sacuvajKontekstPutanje('/admin/napredak?period=30d', '', '/admin/napredak/rezultati', '?period=7d')).toBe('/admin/napredak?period=30d')
})
