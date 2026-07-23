import { describe, expect, it } from 'vitest'
import sql from '../../supabase/migrations/20260723192000_five_star_scale.sql?raw'

const pragovi = [...sql.matchAll(/when p_score >= (\d+) then (\d+)/g)]
  .map(([, prag, zvezdice]) => [Number(prag), Number(zvezdice)] as const)

if (pragovi.length !== 5) throw new Error('Pragovi zvezdica nisu pronađeni u migraciji.')

function zvezdiceIzMigracije(procenat: number): number {
  return pragovi.find(([prag]) => procenat >= prag)?.[1] ?? 0
}

describe('SQL pragovi zvezdica', () => {
  it.each([
    [59.9, 0],
    [60, 1],
    [69.9, 1],
    [70, 2],
    [79.9, 2],
    [80, 3],
    [89.9, 3],
    [90, 4],
    [99.9, 4],
    [100, 5],
  ])('%s%% daje %i zvezdica', (procenat, ocekivano) => {
    expect(zvezdiceIzMigracije(procenat)).toBe(ocekivano)
  })

  it('čuva samo nagrade od nula do pet i ne nagrađuje nezavršen pokušaj', () => {
    expect(sql).toContain('check (stars_awarded between 0 and 5)')
    expect(sql).toContain("when status = 'submitted' and not review_pending")
  })
})
