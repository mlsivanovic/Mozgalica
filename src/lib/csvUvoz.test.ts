// Testovi CSV uvoza pitanja za srpski jezik: parser + mapiranje redova
import { describe, expect, it } from 'vitest'
import { izdvojNepoznateTeme, mapirajRedove, napraviSlugTeme, parsirajCsv } from './csvUvoz'
import type { Oblast } from '../types/db'

const OBLASTI: Oblast[] = [
  { id: 'g1', slug: 'srpski-gramatika', name: 'Gramatika', sort_order: 200, subject: 'srpski' },
  { id: 'r1', slug: 'srpski-recnik', name: 'Rečnik', sort_order: 230, subject: 'srpski' },
]

const ZAGLAVLJE = 'tema;tip;pitanje;odgovor;poeni;tezina;objasnjenje;hint'

describe('parsirajCsv', () => {
  it('parsira jednostavan CSV bez navodnika', () => {
    const r = parsirajCsv('a;b;c\n1;2;3')
    expect(r).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
  })

  it('podržava navodnike sa tačka-zapetom unutar polja', () => {
    const r = parsirajCsv('tema;pitanje\nGramatika;"Da li je ovo; tačno ili ne?"')
    expect(r[1]).toEqual(['Gramatika', 'Da li je ovo; tačno ili ne?'])
  })

  it('podržava novi red unutar navodnika', () => {
    const r = parsirajCsv('tema;pitanje\nGramatika;"Prvi red\ndrugi red"')
    expect(r[1][1]).toBe('Prvi red\ndrugi red')
  })

  it('podržava eskejpovane navodnike ("")', () => {
    const r = parsirajCsv('tema;pitanje\nGramatika;"Reč ""citat"" unutra"')
    expect(r[1][1]).toBe('Reč "citat" unutra')
  })

  it('skida BOM sa početka fajla', () => {
    const r = parsirajCsv('﻿tema;tip\nGramatika;tekst')
    expect(r[0][0]).toBe('tema')
  })

  it('radi i sa CRLF i sa LF završecima reda', () => {
    const r = parsirajCsv('a;b\r\n1;2\r\n3;4')
    expect(r).toEqual([['a', 'b'], ['1', '2'], ['3', '4']])
  })

  it('ignoriše prazan red na kraju fajla', () => {
    const r = parsirajCsv('a;b\n1;2\n')
    expect(r).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('mapirajRedove', () => {
  it('mapira tekst i tacno-netacno redove u ispravna NovoPitanje', () => {
    const csv = [
      ZAGLAVLJE,
      'Gramatika;tacno-netacno;Imenice imaju rod.;tacno;1;2;Objašnjenje;Savet',
      'Rečnik;tekst;Sinonim za "radostan"?;srećan|veseo;2;3;;',
    ].join('\n')
    const r = mapirajRedove(parsirajCsv(csv), OBLASTI)
    expect(r.greske).toEqual([])
    expect(r.validni).toHaveLength(2)

    const tf = r.validni[0]
    expect(tf.type).toBe('truefalse')
    expect(tf.correct).toEqual({ value: true })
    expect(tf.manual_review).toBe(false)
    expect(tf.topic_id).toBe('g1')
    expect(tf.points).toBe(1)
    expect(tf.difficulty).toBe(2)
    expect(tf.explanation).toBe('Objašnjenje')
    expect(tf.hint).toBe('Savet')

    const tekst = r.validni[1]
    expect(tekst.type).toBe('text')
    expect(tekst.correct).toEqual({ accept: ['srećan', 'veseo'] })
    expect(tekst.manual_review).toBe(true)
    expect(tekst.topic_id).toBe('r1')
    expect(tekst.explanation).toBeNull()
  })

  it('prepoznaje temu i po slug-u i po nazivu (bez obzira na veliko/malo slovo)', () => {
    const csv = [ZAGLAVLJE, 'SRPSKI-GRAMATIKA;tacno-netacno;Pitanje?;tacno;;;;'].join('\n')
    const r = mapirajRedove(parsirajCsv(csv), OBLASTI)
    expect(r.greske).toEqual([])
    expect(r.validni[0].topic_id).toBe('g1')
  })

  it('koristi podrazumevane vrednosti kad poeni/tezina nisu upisani', () => {
    const csv = [ZAGLAVLJE, 'Gramatika;tacno-netacno;Pitanje?;netacno;;;;'].join('\n')
    const r = mapirajRedove(parsirajCsv(csv), OBLASTI)
    expect(r.validni[0].points).toBe(1)
    expect(r.validni[0].difficulty).toBe(3)
  })

  it('odbacuje red sa nepoznatom temom', () => {
    const csv = [ZAGLAVLJE, 'Istorija;tekst;Pitanje?;;;;;'].join('\n')
    const r = mapirajRedove(parsirajCsv(csv), OBLASTI)
    expect(r.validni).toHaveLength(0)
    expect(r.greske[0].poruka).toMatch(/Nepoznata tema/)
    expect(r.pregled[0].ok).toBe(false)
  })

  it('odbacuje red sa nepoznatim tipom', () => {
    const csv = [ZAGLAVLJE, 'Gramatika;visestruki-izbor;Pitanje?;;;;;'].join('\n')
    const r = mapirajRedove(parsirajCsv(csv), OBLASTI)
    expect(r.validni).toHaveLength(0)
    expect(r.greske[0].poruka).toMatch(/Nepoznat tip/)
  })

  it('odbacuje tacno-netacno red sa nevalidnim odgovorom', () => {
    const csv = [ZAGLAVLJE, 'Gramatika;tacno-netacno;Pitanje?;možda;;;;'].join('\n')
    const r = mapirajRedove(parsirajCsv(csv), OBLASTI)
    expect(r.validni).toHaveLength(0)
    expect(r.greske[0].poruka).toMatch(/tacno.*netacno/)
  })

  it('odbacuje red sa poenima/težinom van opsega', () => {
    const csv = [
      ZAGLAVLJE,
      'Gramatika;tacno-netacno;Pitanje?;tacno;0;3;;',
      'Gramatika;tacno-netacno;Pitanje?;tacno;1;6;;',
    ].join('\n')
    const r = mapirajRedove(parsirajCsv(csv), OBLASTI)
    expect(r.validni).toHaveLength(0)
    expect(r.greske).toHaveLength(2)
  })

  it('dozvoljava prazan referentni odgovor za tekst pitanja (opcion)', () => {
    const csv = [ZAGLAVLJE, 'Rečnik;tekst;Objasni pojam.;;;;;'].join('\n')
    const r = mapirajRedove(parsirajCsv(csv), OBLASTI)
    expect(r.greske).toEqual([])
    expect(r.validni[0].correct).toEqual({ accept: [] })
  })

  it('preskače potpuno prazne redove bez greške', () => {
    const csv = [ZAGLAVLJE, ';;;;;;;', 'Gramatika;tacno-netacno;Pitanje?;tacno;;;;'].join('\n')
    const r = mapirajRedove(parsirajCsv(csv), OBLASTI)
    expect(r.validni).toHaveLength(1)
    expect(r.greske).toHaveLength(0)
  })

  it('prijavljuje grešku kad zaglavlju nedostaju obavezne kolone', () => {
    const r = mapirajRedove(parsirajCsv('tema;pitanje\nGramatika;Pitanje?'), OBLASTI)
    expect(r.validni).toHaveLength(0)
    expect(r.greske[0].poruka).toMatch(/Zaglavlje/)
  })

  it('prazan fajl prijavljuje grešku bez pucanja', () => {
    const r = mapirajRedove([], OBLASTI)
    expect(r.validni).toHaveLength(0)
    expect(r.greske[0].poruka).toMatch(/prazan/)
  })
})

describe('napraviSlugTeme', () => {
  it('foldira dijakritike, malaslovi i spaja razmake crticom, uz srpski- prefiks', () => {
    expect(napraviSlugTeme('Čitanje i razumevanje')).toBe('srpski-citanje-i-razumevanje')
    expect(napraviSlugTeme('Šala & Žargon')).toBe('srpski-sala-zargon')
  })

  it('pada nazad na "tema" kad naziv ne ostavi nijedan alfanumerički karakter', () => {
    expect(napraviSlugTeme('!!!')).toBe('srpski-tema')
  })
})

describe('izdvojNepoznateTeme', () => {
  it('vraća nepoznate teme jednom, redosledom prvog pojavljivanja', () => {
    const csv = [
      ZAGLAVLJE,
      'Istorija;tekst;Pitanje 1?;;;;;',
      'Gramatika;tacno-netacno;Pitanje 2?;tacno;;;;',
      'Geografija;tekst;Pitanje 3?;;;;;',
      'ISTORIJA;tekst;Pitanje 4?;;;;;', // isto kao red 1, samo drugo veliko/malo slovo
    ].join('\n')
    expect(izdvojNepoznateTeme(parsirajCsv(csv), OBLASTI)).toEqual(['Istorija', 'Geografija'])
  })

  it('vraća praznu listu kad su sve teme poznate ili fajl nema kolonu tema', () => {
    const csv = [ZAGLAVLJE, 'Gramatika;tekst;Pitanje?;;;;;'].join('\n')
    expect(izdvojNepoznateTeme(parsirajCsv(csv), OBLASTI)).toEqual([])
    expect(izdvojNepoznateTeme(parsirajCsv('pitanje\nBez teme?'), OBLASTI)).toEqual([])
    expect(izdvojNepoznateTeme([], OBLASTI)).toEqual([])
  })
})
