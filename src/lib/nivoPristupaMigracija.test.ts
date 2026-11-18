import { describe, expect, it } from 'vitest'
import sql from '../../supabase/migrations/20261118120000_nivo_pristupa_roditelja.sql?raw'

describe('migracija nivoa pristupa roditelja', () => {
  it('dodaje kolone allowed_grades i allowed_subjects sa ograničenjima na allowlist i podešavanja', () => {
    expect(sql).toContain('alter table public.admin_allowlist')
    expect(sql).toContain('alter table public.admin_settings')
    expect(sql).toContain('add column if not exists allowed_grades smallint[]')
    expect(sql).toContain('add column if not exists allowed_subjects text[]')
    expect(sql).toContain('admin_allowlist_allowed_grades_check')
    expect(sql).toContain('admin_settings_allowed_subjects_check')
  })

  it('štiti vlasnika platforme i pauzira rasporede van novog opsega pri izmeni pristupa', () => {
    expect(sql).toContain('function public.azuriraj_pristup_roditelja')
    expect(sql).toContain('if not public.fn_is_platform_owner()')
    expect(sql).toContain('where not public.admin_settings.is_platform_owner')
    expect(sql).toContain('and not is_platform_owner')
    expect(sql).toContain('update public.daily_quiz_schedules')
    expect(sql).toContain('set is_active = false')
  })

  it('primenjuje nivo pristupa kroz RLS i RPC za dnevne rasporede', () => {
    expect(sql).toContain('create policy topics_select on public.topics')
    expect(sql).toContain('create policy questions_select on public.questions')
    expect(sql).toContain('create policy questions_insert on public.questions')
    expect(sql).toContain('create policy quizzes_insert on public.quizzes')
    expect(sql).toContain('create policy quiz_questions_insert on public.quiz_questions')
    expect(sql).toContain('public.fn_admin_ima_pristup(p_subject, p_grade)')
    expect(sql).toContain('public.fn_admin_ima_pristup_razredu(grade)')
  })
})
