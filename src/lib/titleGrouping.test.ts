import { describe, expect, it } from 'vitest'
import { groupTitleLevels, flattenTitleGroups, validateTitleGroups, type TitleGroup } from '../routes/admin/Podesavanja'
import type { NivoTitule } from '../types/db'

describe('Title Grouping, Flattening and Validation', () => {
  it('ispravno migriše stare, jednostavne nivoe u struktuirane grupe sa tri ranga', () => {
    const stariNivoi: NivoTitule[] = [
      { id: '1', owner_id: 'owner', name: 'Početnik', min_stars: 0, created_at: '' },
      { id: '2', owner_id: 'owner', name: 'Istraživač', min_stars: 5, created_at: '' },
      { id: '3', owner_id: 'owner', name: 'Znalac', min_stars: 12, created_at: '' },
    ]

    const grupe = groupTitleLevels(stariNivoi)

    expect(grupe).toHaveLength(3)

    // Provera prve grupe (Početnik)
    expect(grupe[0].baseName).toBe('Početnik')
    expect(grupe[0].awakenedStars).toBe(0)
    expect(grupe[0].empoweredStars).toBe(1) // opseg 0 do 5, raspoređeno
    expect(grupe[0].unboundStars).toBe(3)

    // Provera druge grupe (Istraživač)
    expect(grupe[1].baseName).toBe('Istraživač')
    expect(grupe[1].awakenedStars).toBe(5)
    expect(grupe[1].empoweredStars).toBe(7) // opseg 5 do 12, raspoređeno (start + 7/3 = 7)
    expect(grupe[1].unboundStars).toBe(9)   // start + 14/3 = 9

    // Provera treće grupe (Znalac)
    expect(grupe[2].baseName).toBe('Znalac')
    expect(grupe[2].awakenedStars).toBe(12)
    expect(grupe[2].empoweredStars).toBe(17) // opseg do +15 po defaultu, pa je start + 15/3 = 17
    expect(grupe[2].unboundStars).toBe(22)
  })

  it('ispravno grupiše već migrirane nivoe sa Awakened, Empowered i Unbound sufiksima', () => {
    const migriraniNivoi: NivoTitule[] = [
      { id: '1', owner_id: 'owner', name: 'Početnik Awakened', min_stars: 0, created_at: '' },
      { id: '2', owner_id: 'owner', name: 'Početnik Empowered', min_stars: 2, created_at: '' },
      { id: '3', owner_id: 'owner', name: 'Početnik Unbound', min_stars: 4, created_at: '' },
      { id: '4', owner_id: 'owner', name: 'Istraživač Awakened', min_stars: 5, created_at: '' },
      { id: '5', owner_id: 'owner', name: 'Istraživač Empowered', min_stars: 7, created_at: '' },
      { id: '6', owner_id: 'owner', name: 'Istraživač Unbound', min_stars: 10, created_at: '' },
    ]

    const grupe = groupTitleLevels(migriraniNivoi)

    expect(grupe).toHaveLength(2)

    expect(grupe[0].baseName).toBe('Početnik')
    expect(grupe[0].awakenedStars).toBe(0)
    expect(grupe[0].empoweredStars).toBe(2)
    expect(grupe[0].unboundStars).toBe(4)

    expect(grupe[1].baseName).toBe('Istraživač')
    expect(grupe[1].awakenedStars).toBe(5)
    expect(grupe[1].empoweredStars).toBe(7)
    expect(grupe[1].unboundStars).toBe(10)
  })

  it('ispravno ravna grupe nazad u format pogodan za slanje API-ju', () => {
    const grupe: TitleGroup[] = [
      { id: 'g1', baseName: 'Početnik', isExpanded: false, awakenedStars: 0, empoweredStars: 2, unboundStars: 4 },
      { id: 'g2', baseName: 'Istraživač', isExpanded: false, awakenedStars: 5, empoweredStars: 7, unboundStars: 10 },
    ]

    const ravno = flattenTitleGroups(grupe)

    expect(ravno).toHaveLength(6)
    expect(ravno).toEqual([
      { name: 'Početnik Awakened', min_stars: 0 },
      { name: 'Početnik Empowered', min_stars: 2 },
      { name: 'Početnik Unbound', min_stars: 4 },
      { name: 'Istraživač Awakened', min_stars: 5 },
      { name: 'Istraživač Empowered', min_stars: 7 },
      { name: 'Istraživač Unbound', min_stars: 10 },
    ])
  })

  it('uspešno validira ispravan skup grupa', () => {
    const ispravneGrupe: TitleGroup[] = [
      { id: '1', baseName: 'Početnik', isExpanded: false, awakenedStars: 0, empoweredStars: 2, unboundStars: 4 },
      { id: '2', baseName: 'Istraživač', isExpanded: false, awakenedStars: 5, empoweredStars: 7, unboundStars: 10 },
    ]

    const greska = validateTitleGroups(ispravneGrupe)
    expect(greska).toBeNull()
  })

  it('vraća grešku ako prva titula ne kreće od 0 zvezdica', () => {
    const neispravneGrupe: TitleGroup[] = [
      { id: '1', baseName: 'Početnik', isExpanded: false, awakenedStars: 1, empoweredStars: 3, unboundStars: 5 },
    ]

    const greska = validateTitleGroups(neispravneGrupe)
    expect(greska).toBe('Početna titula (prvi rang prve titule) mora kretati od 0 zvezdica.')
  })

  it('vraća grešku ako su zvezdice unutar grupe neispravno poređane', () => {
    const neispravneGrupe1: TitleGroup[] = [
      { id: '1', baseName: 'Početnik', isExpanded: false, awakenedStars: 0, empoweredStars: 0, unboundStars: 4 },
    ]
    expect(validateTitleGroups(neispravneGrupe1)).toContain('Empowered rang (0⭐) mora zahtevati više zvezdica od Awakened ranga (0⭐)')

    const neispravneGrupe2: TitleGroup[] = [
      { id: '1', baseName: 'Početnik', isExpanded: false, awakenedStars: 0, empoweredStars: 2, unboundStars: 1 },
    ]
    expect(validateTitleGroups(neispravneGrupe2)).toContain('Unbound rang (1⭐) mora zahtevati više zvezdica od Empowered ranga (2⭐)')
  })

  it('vraća grešku ako se susedne titule preklapaju', () => {
    const preklapajuceGrupe: TitleGroup[] = [
      { id: '1', baseName: 'Početnik', isExpanded: false, awakenedStars: 0, empoweredStars: 2, unboundStars: 5 },
      { id: '2', baseName: 'Istraživač', isExpanded: false, awakenedStars: 5, empoweredStars: 7, unboundStars: 9 },
    ]

    const greska = validateTitleGroups(preklapajuceGrupe)
    expect(greska).toBe('Sledeća titula „Istraživač” mora početi sa više zvezdica nego što zahteva prethodni Unbound rang titule „Početnik” (5⭐).')
  })
})
