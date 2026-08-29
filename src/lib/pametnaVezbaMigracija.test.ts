import { describe, expect, it } from 'vitest'
import sql from '../../supabase/migrations/20260829162124_pametna_dnevna_vezba.sql?raw'

describe('migracija pametne dnevne vežbe', () => {
  it('čuva režim i nedeljni izveštaj na dnevnom rasporedu', () => {
    expect(sql).toContain('add column smart_mode boolean not null default false')
    expect(sql).toContain('add column weekly_report_enabled boolean not null default false')
    expect(sql).toContain('check (not weekly_report_enabled or smart_mode)')
  })

  it('statistiku pametnog plana daje samo servisnoj ulozi', () => {
    expect(sql).toContain('function public.get_smart_daily_quiz_topics')
    expect(sql).toContain("coalesce(auth.jwt() ->> 'role', '') <> 'service_role'")
    expect(sql).toContain('grant execute on function public.get_smart_daily_quiz_topics(uuid) to service_role')
    expect(sql).not.toContain('grant execute on function public.get_smart_daily_quiz_topics(uuid) to authenticated')
  })

  it('nedeljni izveštaj je idempotentan po rasporedu i sedmici', () => {
    expect(sql).toContain('unique (schedule_id, week_start)')
    expect(sql).toContain("'weekly_report'")
    expect(sql).toContain('function public.process_due_smart_weekly_reports')
    expect(sql).toContain("insert into public.notification_deliveries (notification_id, channel)")
  })
})
