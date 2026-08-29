import { describe, expect, it } from 'vitest'
import sql from '../supabase/migrations/20260830120000_priroda_i_drustvo.sql?raw'

describe('SQL migracija Prirode i društva', () => {
  it('proširuje oba predmetna ograničenja i dnevni RPC', () => {
    expect(sql).toContain('topics_subject_check')
    expect(sql).toContain('daily_quiz_schedules_subject_check')
    expect(sql).toContain("p_subject not in ('matematika', 'srpski', 'priroda_drustvo')")
    expect(sql).toContain("when 'priroda_drustvo' then 'Priroda i društvo'")
  })

  it('unosi tačno pet oblasti trećeg i četiri oblasti četvrtog razreda', () => {
    expect(sql.match(/'pid-[^']+'[^\n]+?'priroda_drustvo', 3\)/g)).toHaveLength(5)
    expect(sql.match(/'pid-[^']+'[^\n]+?'priroda_drustvo', 4\)/g)).toHaveLength(4)
  })

  it('primorava predmete bez nivoa težine na vrednost 5', () => {
    expect(sql.match(/p_subject in \('srpski', 'priroda_drustvo'\) then 5/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
