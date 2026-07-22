import { describe, expect, it } from 'vitest'
import sql from '../../supabase/migrations/20260720100017_sezonske_titule.sql?raw'

interface NivoTitule {
  level: number
  threshold: number
  title: string
}

const unosNivoa = sql.match(
  /insert into public\.child_title_levels \(level, threshold_stars, title\) values([\s\S]*?);/,
)

if (!unosNivoa) throw new Error('Nivoi titula nisu pronađeni u migraciji.')

const nivoi: NivoTitule[] = [...unosNivoa[1].matchAll(/\((\d+),\s*(\d+),\s*'([^']+)'\)/g)]
  .map(([, level, threshold, title]) => ({ level: Number(level), threshold: Number(threshold), title }))

function titulaZaZvezdice(zvezdice: number): string | null {
  return nivoi.filter((nivo) => nivo.threshold <= zvezdice).at(-1)?.title ?? null
}

const OCEKIVANI_NIVOI: Array<[number, number, string]> = [
  [1, 3, 'StarScout'],
  [2, 8, 'ShadowNinja'],
  [3, 15, 'StormFighter'],
  [4, 25, 'IronSamurai'],
  [5, 40, 'ThunderRider'],
  [6, 55, 'DragonGuardian'],
  [7, 70, 'SkyBreaker'],
  [8, 90, 'CosmicKnight'],
  [9, 110, 'PhantomCommander'],
  [10, 125, 'TitanMaster'],
  [11, 140, 'GalaxyChampion'],
  [12, 150, 'LegendPrime'],
]

describe('SQL nivoi sezonskih titula', () => {
  it('čuva svih 12 dogovorenih pragova i naziva', () => {
    expect(nivoi.map(({ level, threshold, title }) => [level, threshold, title]))
      .toEqual(OCEKIVANI_NIVOI)
  })

  it.each(OCEKIVANI_NIVOI)('%s. nivo se otključava tačno na %s ⭐', (level, prag, naziv) => {
    const prethodniNaziv = level === 1 ? null : OCEKIVANI_NIVOI[level - 2][2]
    expect(titulaZaZvezdice(prag - 1)).toBe(prethodniNaziv)
    expect(titulaZaZvezdice(prag)).toBe(naziv)
    expect(titulaZaZvezdice(prag + 1)).toBe(naziv)
  })

  it('računa sezonski zbir preko najboljeg pokušaja po kvizu', () => {
    expect(sql).toContain('select max(a.stars_earned)::integer as stars')
    expect(sql).toContain('group by q.id')
  })

  it('ne spušta trajno otključan nivo kada se sezonski zbir smanji', () => {
    expect(sql).toContain('if v_highest_earned_level > v_season.highest_title_level then')
  })

  it('posle reseta računa samo predaje nove sezone, bez brisanja ukupnog zbira', () => {
    expect(sql).toContain('and (s.includes_existing_results or a.submitted_at >= s.started_at)')
    expect(sql).toContain("values (v_owner_id, p_child_name, false)")
    expect(sql).toContain("'totalStars', public.fn_total_stars(v_owner_id, p_child_name)")
  })

  it('ne vraća otključavanje zatvorene sezone kao novu titulu', () => {
    expect(sql).toContain('and sezona.ended_at is null')
  })
})
