import { describe, expect, it } from 'vitest'
import nova from '../supabase/migrations/20260830170000_srpski_5_razred.sql?raw'
import stara from '../supabase/migrations/20260830120000_priroda_i_drustvo.sql?raw'
const funkcija = (sql: string) => sql.match(/create or replace function public\.save_daily_quiz_schedule\([\s\S]*?\$\$;/)![0]

describe('migracija srpskog za 5. razred', () => {
  it('dodaje šest oblasti bez dodirivanja banke i istorijskih kvizova', () => {
    expect(nova.match(/'srpski', 5/g)).toHaveLength(6)
    expect(nova).not.toMatch(/\b(update|delete from|insert into) public\.(questions|quiz_questions|quizzes)\b/i)
  })

  it('menja samo validaciju razreda, uz očuvane bezbednosne i ostale provere', () => {
    expect(funkcija(nova)).toBe(funkcija(stara).replace(
      "or (p_subject in ('srpski', 'priroda_drustvo') and p_grade not in (3, 4))",
      "or (p_subject = 'priroda_drustvo' and p_grade not in (3, 4))",
    ))
  })
})
