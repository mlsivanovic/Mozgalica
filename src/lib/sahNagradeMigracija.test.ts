import { describe, expect, it } from 'vitest'
import sql from '../../supabase/migrations/20260814221000_sah_nagrade.sql?raw'

function skalaZa(rezultat: 'draw' | 'child_win'): Array<[number, number]> {
  const blok = sql.match(new RegExp(`when p_result = '${rezultat}' then case p_elo([\\s\\S]*?)\\n    end`))
  if (!blok) throw new Error(`Skala za rezultat ${rezultat} nije pronađena.`)
  return [...blok[1].matchAll(/when (\d+) then (\d+)/g)]
    .map(([, elo, zvezdice]) => [Number(elo), Number(zvezdice)])
}

describe('SQL skala šahovskih nagrada', () => {
  it('dodeljuje dogovorene zvezdice za pobedu', () => {
    expect(skalaZa('child_win')).toEqual([
      [700, 1], [900, 2], [1100, 3], [1300, 4], [1500, 5],
    ])
  })

  it('dodeljuje dogovorene zvezdice za remi', () => {
    expect(skalaZa('draw')).toEqual([
      [700, 0], [900, 1], [1100, 1], [1300, 2], [1500, 3],
    ])
  })

  it('ne dodeljuje zvezdice za poraz', () => {
    expect(sql).toContain("when p_result = 'child_loss' then 0")
  })
})
