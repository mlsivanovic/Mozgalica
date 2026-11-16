import { describe, expect, it } from 'vitest'
import {
  porukaZaGreskuBrisanja, porukaZaGreskuPoziva, porukaZaStatusPoziva,
  potvrdaBrisanjaJeIspravna, pozivniEmailJeIspravan,
} from './nalog'

describe('poziv roditelja', () => {
  it('poruka za oba ishoda poziva jasno kaže šta se desilo', () => {
    expect(porukaZaStatusPoziva('pozivnica_poslata')).toContain('Pozivnica je poslata')
    expect(porukaZaStatusPoziva('vec_postoji')).toContain('već postoji')
  })

  it('greške Edge funkcije se prevode u srpske poruke, sa podrazumevanom za nepoznat kod', () => {
    expect(porukaZaGreskuPoziva('forbidden')).toContain('vlasnik platforme')
    expect(porukaZaGreskuPoziva('invalid_email')).toContain('ispravnu email')
    expect(porukaZaGreskuPoziva('nepoznato')).toBe('Poziv nije uspeo. Pokušaj ponovo.')
    expect(porukaZaGreskuPoziva(null)).toBe('Poziv nije uspeo. Pokušaj ponovo.')
  })

  it('validacija emaila za poziv prihvata razumnu adresu i odbija prazan ili pokvaren unos', () => {
    expect(pozivniEmailJeIspravan('roditelj@example.com')).toBe(true)
    expect(pozivniEmailJeIspravan('  Roditelj@Example.COM ')).toBe(true)
    expect(pozivniEmailJeIspravan('roditelj@')).toBe(false)
    expect(pozivniEmailJeIspravan('bez-znaka-at.com')).toBe(false)
    expect(pozivniEmailJeIspravan('')).toBe(false)
  })
})

describe('brisanje naloga', () => {
  it('potvrda traži tačnu email adresu naloga, bez obzira na velika slova i razmake', () => {
    expect(potvrdaBrisanjaJeIspravna('Roditelj@Example.com ', 'roditelj@example.com')).toBe(true)
    expect(potvrdaBrisanjaJeIspravna('drugi@example.com', 'roditelj@example.com')).toBe(false)
    expect(potvrdaBrisanjaJeIspravna('', 'roditelj@example.com')).toBe(false)
    expect(potvrdaBrisanjaJeIspravna('roditelj@example.com', null)).toBe(false)
  })

  it('poruke za kodove brisanja pokrivaju vlasnika, zavisnost i delimičan neuspeh', () => {
    expect(porukaZaGreskuBrisanja('platform_owner')).toContain('zajednička banka')
    expect(porukaZaGreskuBrisanja('shared_dependency')).toContain('tuđi kviz')
    expect(porukaZaGreskuBrisanja('auth_delete_failed')).toContain('Podaci su obrisani')
    expect(porukaZaGreskuBrisanja(undefined)).toBe('Nalog nije obrisan. Pokušaj ponovo.')
  })
})
