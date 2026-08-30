import { describe, expect, it } from 'vitest'
import nova from '../supabase/migrations/20260830190000_srpski_2_razred.sql?raw'
import stara from '../supabase/migrations/20260830180000_matematika_2_razred.sql?raw'
const funkcija = (sql: string) => sql.match(/create or replace function public\.save_daily_quiz_schedule\([\s\S]*?\$\$;/)![0]

describe('migracija srpskog za 2. razred', () => {
  it('dodaje sedam oblasti bez dodirivanja banke i istorijskih kvizova', () => {
    expect(nova.match(/'srpski', 2/g)).toHaveLength(7)
    expect(nova).not.toMatch(/\b(update|delete from|insert into) public\.(questions|quiz_questions|quizzes)\b/i)
  })

  it('menja samo validaciju razreda, uz očuvane bezbednosne i ostale provere', () => {
    expect(funkcija(nova)).toBe(funkcija(stara).replace(
      "or (p_subject = 'srpski' and p_grade not in (3, 4, 5))",
      "or (p_subject = 'srpski' and p_grade not in (2, 3, 4, 5))",
    ))
  })
})
