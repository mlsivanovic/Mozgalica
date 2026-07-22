import { describe, expect, it } from 'vitest'
import sql from '../../supabase/migrations/20260720100016_zvezdice_i_fiksno_dete.sql?raw'

const pragovi = sql.match(
  /add column stars_earned[\s\S]*?when score_pct < (\d+) then (\d+)[\s\S]*?when score_pct <= (\d+) then (\d+)[\s\S]*?when score_pct <= (\d+) then (\d+)[\s\S]*?else (\d+)[\s\S]*?end/,
)

if (!pragovi) throw new Error('Pragovi zvezdica nisu pronađeni u migraciji.')

const [, prviPrag, ispodPrvog, drugiPrag, doDrugog, treciPrag, doTreceg, prekoTreceg] = pragovi.map(Number)

function zvezdiceIzMigracije(procenat: number): number {
  if (procenat < prviPrag) return ispodPrvog
  if (procenat <= drugiPrag) return doDrugog
  if (procenat <= treciPrag) return doTreceg
  return prekoTreceg
}

describe('SQL pragovi zvezdica', () => {
  it.each([
    [59.9, 0],
    [60, 1],
    [75, 1],
    [75.1, 2],
    [90, 2],
    [90.1, 3],
    [100, 3],
  ])('%s%% daje %i zvezdica', (procenat, ocekivano) => {
    expect(zvezdiceIzMigracije(procenat)).toBe(ocekivano)
  })

  it('ne dodeljuje zvezdice nezavršenom pokušaju ili dok traje pregled', () => {
    expect(sql).toContain("when status <> 'submitted' or review_pending or score_pct is null then null")
  })
})
