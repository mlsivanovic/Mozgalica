import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  OznakaRangaTitule,
  TitleAvatar,
  type RangTitule,
} from './TitleAvatar'

const FABRICKE_TITULE = [
  'ShadowNoob',
  'StarScout',
  'SolarKnight',
  'CosmicPaladin',
  'VortexChampion',
  'GalacticTitan',
  'SupernovaDragon',
  'CelestialPhoenix',
]
const RANGOVI: RangTitule[] = ['Awakened', 'Empowered', 'Unbound']

describe('TitleAvatar', () => {
  it('prepoznaje svih osam fabričkih titula bez obzira na velika slova i razmake', () => {
    expect(FABRICKE_TITULE).toHaveLength(8)

    for (const titula of FABRICKE_TITULE) {
      const markup = renderToStaticMarkup(createElement(TitleAvatar, { name: ' ' + titula.toLowerCase() + ' ' }))
      expect(markup).toContain('data-title-badge="' + titula + '"')
    }
  })

  it('prikazuje odgovarajući bedž za svaku titulu i svaki rang', () => {
    for (const titula of FABRICKE_TITULE) {
      for (const rang of RANGOVI) {
        const markup = renderToStaticMarkup(createElement(TitleAvatar, { name: titula + ' ' + rang }))
        expect(markup).toContain('data-title-badge="' + titula + '"')
        expect(markup).toContain('data-title-rank="' + rang.toLowerCase() + '"')
        expect(markup).toContain('aria-label="' + titula + ' ' + rang + '"')
      }
    }
  })

  it('koristi generički bedž za buduću titulu i Awakened rang kada nema sufiksa', () => {
    const markup = renderToStaticMarkup(createElement(TitleAvatar, { name: 'Mesečev čuvar' }))

    expect(markup).toContain('data-title-badge="generic"')
    expect(markup).toContain('data-title-rank="awakened"')
  })

  it('zadržava prioritet emoji-ja i prilagođene slike nad fabričkim bedžem', () => {
    const emoji = renderToStaticMarkup(createElement(TitleAvatar, { name: 'ShadowNoob Unbound', avatar: '🦊' }))
    const slika = renderToStaticMarkup(createElement(TitleAvatar, {
      name: 'StarScout Empowered',
      avatar: 'https://example.com/avatar.png',
    }))

    expect(emoji).toContain('🦊')
    expect(emoji).not.toContain('data-title-badge=')
    expect(slika).toContain('src="https://example.com/avatar.png"')
    expect(slika).not.toContain('data-title-badge=')
  })

  it('prikazuje usklađenu oznaku za svaki rang', () => {
    for (const rang of RANGOVI) {
      const markup = renderToStaticMarkup(createElement(OznakaRangaTitule, { rang }))
      expect(markup).toContain('data-rank-mark="' + rang.toLowerCase() + '"')
    }
  })
})
