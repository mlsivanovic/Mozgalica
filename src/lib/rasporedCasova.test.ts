import { describe, expect, it } from 'vitest'
import {
  aktivnaSmena, bojaPredmeta, casoviDana, csvRasporedaCasova, danUNedelji, dodajDane, imaPretcas,
  kljucPredmeta, mapaBojaPredmeta, nastavniDan, nazivCasa, oznaciCasove, periodiNedelje,
  ponedeljakNedelje, postaviPretcas, PREDLOZI_PREDMETA, predmetiZaKnjige, PRETCAS_POPODNE,
  satnicaPreseta, sledeciCas,
} from './rasporedCasova'

describe('kalendar rasporeda', () => {
  it('računa ISO dan i ponedeljak u Beogradu', () => {
    expect(danUNedelji('2026-08-31')).toBe(1)
    expect(danUNedelji('2026-09-06')).toBe(7)
    expect(ponedeljakNedelje('2026-09-02')).toBe('2026-08-31')
    expect(ponedeljakNedelje('2026-08-31')).toBe('2026-08-31')
    expect(dodajDane('2026-08-31', 1)).toBe('2026-09-01')
    expect(nastavniDan(6, false)).toBe(false)
    expect(nastavniDan(6, true)).toBe(true)
    expect(nastavniDan(7, true)).toBe(false)
  })
})

describe('rotacija smena', () => {
  it('fiksna smena ignoriše sidro, osim ručnog override-a', () => {
    expect(aktivnaSmena({
      rotationMode: 'fixed', defaultShift: 'morning',
      anchorMonday: '2026-08-31', weekMonday: '2026-09-07',
    })).toBe('morning')
    expect(aktivnaSmena({
      rotationMode: 'fixed', defaultShift: 'afternoon',
      anchorMonday: '2026-08-31', weekMonday: '2026-09-07', override: 'morning',
    })).toBe('morning')
  })

  it('naizmenična smena menja nedelju za nedeljom oko sidra', () => {
    const osnova = {
      rotationMode: 'alternating' as const, defaultShift: 'afternoon' as const,
      anchorMonday: '2026-08-31',
    }
    expect(aktivnaSmena({ ...osnova, weekMonday: '2026-08-31' })).toBe('afternoon')
    expect(aktivnaSmena({ ...osnova, weekMonday: '2026-09-07' })).toBe('morning')
    expect(aktivnaSmena({ ...osnova, weekMonday: '2026-09-14' })).toBe('afternoon')
    expect(aktivnaSmena({ ...osnova, weekMonday: '2026-08-24' })).toBe('morning')
  })
})

describe('pretčas', () => {
  it('popodnevni preset podrazumevano uključuje pretčas u 13:10', () => {
    const satnica = satnicaPreseta('afternoon', 6, true)
    expect(imaPretcas(satnica)).toBe(true)
    expect(satnica[0]).toEqual(PRETCAS_POPODNE)
    expect(satnica.map((p) => p.periodNo)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('dodaje i skida pretčas bez diranja redovnih časova', () => {
    const bez = satnicaPreseta('morning', 5, false)
    expect(imaPretcas(bez)).toBe(false)
    expect(bez).toHaveLength(5)
    const sa = postaviPretcas(bez, 'morning', true)
    expect(sa[0]).toMatchObject({ periodNo: 0, startsAt: '07:10' })
    expect(postaviPretcas(sa, 'morning', false).map((p) => p.periodNo)).toEqual([1, 2, 3, 4, 5])
  })

  it('imenuje nulti čas kao pretčas', () => {
    expect(nazivCasa(0)).toBe('Pretčas')
    expect(nazivCasa(1)).toBe('1. čas')
  })
})

describe('časovi u danu', () => {
  const periodi = satnicaPreseta('afternoon', 4, true)
  const slotovi = [
    { shift: null, weekday: 2, periodNo: 0, subject: 'Srpski jezik', teacher: null, room: '12', color: null, note: null },
    { shift: null, weekday: 2, periodNo: 1, subject: 'Matematika', teacher: null, room: null, color: null, note: null },
    { shift: null, weekday: 2, periodNo: 2, subject: 'Engleski jezik', teacher: null, room: null, color: null, note: null },
  ]

  it('spaja satnicu i predmete i označava trenutni/sledeći čas', () => {
    const casovi = casoviDana(periodi, slotovi, 2, 'afternoon', true, '14:10')
    expect(casovi.map((c) => c.subject)).toEqual(['Srpski jezik', 'Matematika', 'Engleski jezik'])
    expect(casovi.find((c) => c.isCurrent)?.subject).toBe('Matematika')
    expect(casovi.find((c) => c.isNext)?.subject).toBe('Engleski jezik')
    expect(sledeciCas(casovi)?.subject).toBe('Matematika')
  })

  it('pre početka nastave označava pretčas kao sledeći', () => {
    const casovi = oznaciCasove(casoviDana(periodi, slotovi, 2, 'afternoon', true, null), '12:00')
    expect(casovi.every((c) => !c.isCurrent)).toBe(true)
    expect(casovi.find((c) => c.isNext)?.periodNo).toBe(0)
  })

  it('skuplja jedinstvene predmete za pakovanje knjiga', () => {
    expect(predmetiZaKnjige(casoviDana(periodi, slotovi, 2, 'afternoon', true, null)))
      .toEqual(['Srpski jezik', 'Matematika', 'Engleski jezik'])
  })

  it('ista imena predmeta dobijaju istu boju', () => {
    expect(bojaPredmeta('Matematika')).toBe(bojaPredmeta('matematika'))
    expect(bojaPredmeta('Matematika', '#123456')).toBe('#123456')
  })

  it('ČOS i srpski imaju različite boje', () => {
    expect(bojaPredmeta('ČOS')).not.toBe(bojaPredmeta('Srpski jezik'))
    expect(bojaPredmeta('COS')).toBe(bojaPredmeta('ČOS'))
  })

  it('matematika i fizičko nisu iste nijanse', () => {
    expect(bojaPredmeta('Matematika')).not.toBe(bojaPredmeta('Fizičko vaspitanje'))
    expect(bojaPredmeta('Fizičko')).toBe(bojaPredmeta('Fizičko vaspitanje'))
  })

  it('nudi dopunsku i dodatnu nastavu kao predmete', () => {
    expect(PREDLOZI_PREDMETA).toContain('Dopunska nastava')
    expect(PREDLOZI_PREDMETA).toContain('Dodatna nastava')
    expect(bojaPredmeta('Dopunska nastava')).not.toBe(bojaPredmeta('Dodatna nastava'))
  })

  it('predlozi predmeta u jednom rasporedu ne dele boju', () => {
    const mapa = mapaBojaPredmeta(PREDLOZI_PREDMETA)
    const boje = PREDLOZI_PREDMETA.map((ime) => mapa.get(kljucPredmeta(ime)))
    expect(new Set(boje).size).toBe(PREDLOZI_PREDMETA.length)
  })

  it('sprema CSV mrežu nedeljnog rasporeda', () => {
    const week = [
      { weekday: 1, lessons: casoviDana(periodi, [
        { shift: null, weekday: 1, periodNo: 1, subject: 'Matematika', teacher: 'Ana', room: '12', color: null, note: null },
      ], 1, 'afternoon', true, null) },
      { weekday: 2, lessons: casoviDana(periodi, slotovi, 2, 'afternoon', true, null) },
    ]
    expect(periodiNedelje(week)).toEqual([0, 1, 2])
    const csv = csvRasporedaCasova(week)
    expect(csv.zaglavlja).toEqual(['Čas', 'Vreme', 'Ponedeljak', 'Utorak'])
    expect(csv.redovi[0]?.[0]).toBe('Pretčas')
    expect(csv.redovi.find((r) => r[0] === '1. čas')?.[2]).toBe('Matematika (Ana, uč. 12)')
    expect(csv.redovi.find((r) => r[0] === '1. čas')?.[3]).toBe('Matematika')
  })
})
