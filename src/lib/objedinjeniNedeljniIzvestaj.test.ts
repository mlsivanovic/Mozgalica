import { describe, expect, it } from 'vitest'
import sql from '../../supabase/migrations/20261118140000_objedinjeni_nedeljni_izvestaj.sql?raw'
import {
  formatirajPeriodSr, formatirajProcenatSr, formatirajTrendSr,
  napraviSadrzajObjedinjenogIzvestaja, srpskiOblik,
  type SazetakObjedinjenogIzvestaja,
} from '../../supabase/functions/_shared/weekly-report-email'

describe('migracija objedinjenog nedeljnog izveštaja', () => {
  it('dodaje podešavanje na nivou roditelja i bezbedni RPC za izmenu', () => {
    expect(sql).toContain('alter table public.admin_settings')
    expect(sql).toContain('add column if not exists weekly_report_enabled boolean not null default true')
    expect(sql).toContain('function public.postavi_nedeljni_izvestaj')
    expect(sql).toContain('grant execute on function public.postavi_nedeljni_izvestaj(boolean) to authenticated')
    expect(sql).not.toContain('grant update (weekly_report_enabled')
  })

  it('čuva objedinjeni izveštaj po roditelju i sedmici uz zaključan pristup', () => {
    expect(sql).toContain('create table if not exists public.weekly_parent_reports')
    expect(sql).toContain('unique (owner_id, week_start)')
    expect(sql).toContain('alter table public.weekly_parent_reports enable row level security')
    expect(sql).toContain('revoke all on public.weekly_parent_reports from anon, authenticated')
    expect(sql).toContain('uq_notifications_parent_weekly_report')
  })

  it('obuhvata sve ocenjene kvizove i šah, zakazuje ponedeljak 08:00 i preskače praznu sedmicu', () => {
    expect(sql).toContain('function public.process_due_weekly_parent_reports')
    expect(sql).toContain("v_local_now::time >= time '08:00:00'")
    expect(sql).toContain('public.fn_child_statistics_attempts')
    expect(sql).toContain('from public.chess_games g')
    expect(sql).toContain("if jsonb_array_length(v_children) = 0 then")
    expect(sql).toContain('grant execute on function public.process_due_weekly_parent_reports(int) to service_role')
    expect(sql).not.toContain('grant execute on function public.process_due_weekly_parent_reports(int) to authenticated')
  })
})

describe('formatiranje objedinjenog nedeljnog mejla', () => {
  it('koristi ispravne srpske oblike, decimale sa zarezom i format perioda', () => {
    expect(srpskiOblik(1, 'kviz', 'kviza', 'kvizova')).toBe('kviz')
    expect(srpskiOblik(2, 'kviz', 'kviza', 'kvizova')).toBe('kviza')
    expect(srpskiOblik(5, 'kviz', 'kviza', 'kvizova')).toBe('kvizova')
    expect(srpskiOblik(11, 'kviz', 'kviza', 'kvizova')).toBe('kvizova')
    expect(srpskiOblik(21, 'kviz', 'kviza', 'kvizova')).toBe('kviz')

    expect(formatirajProcenatSr(88.5)).toBe('88,5%')
    expect(formatirajProcenatSr(90)).toBe('90%')
    expect(formatirajProcenatSr(null)).toBe('—')

    expect(formatirajTrendSr(6.5)).toBe('+6,5 p.p. u odnosu na prethodnu sedmicu')
    expect(formatirajTrendSr(-3.2)).toBe('-3,2 p.p. u odnosu na prethodnu sedmicu')
    expect(formatirajTrendSr(0)).toBe('Isti prosek kao prethodne sedmice')
    expect(formatirajTrendSr(null)).toBeNull()

    expect(formatirajPeriodSr('2026-09-21', '2026-09-27')).toBe('21.09.–27.09.2026.')
    expect(formatirajPeriodSr('2026-12-28', '2027-01-03')).toBe('28.12.2026.–03.01.2027.')
  })

  it('spaja svu aktivnu decu, sve predmete i šah u jedan bezbedan HTML i tekst mejl', () => {
    const sazetak: SazetakObjedinjenogIzvestaja = {
      hasActivity: true,
      weekStart: '2026-09-21',
      weekEnd: '2026-09-27',
      totals: {
        activeChildren: 2,
        completedQuizzes: 8,
        questionCount: 80,
        correctCount: 68,
        avgScorePct: 85,
        chessGamesPlayed: 3,
      },
      children: [
        {
          childProfileId: 'dete-1',
          name: 'Andreja <Test>',
          avatar: '🚀',
          completedQuizzes: 8,
          activeDays: 5,
          avgScorePct: 85,
          previousAvgScorePct: 80.5,
          trendPct: 4.5,
          questionCount: 80,
          correctCount: 68,
          starsAwarded: 24,
          subjects: [
            {
              subject: 'matematika',
              completedQuizzes: 5,
              activeDays: 4,
              avgScorePct: 88.2,
              previousAvgScorePct: 82,
              trendPct: 6.2,
              questionCount: 50,
              correctCount: 44,
              strongTopics: [{ topicName: 'Razlomci', questionCount: 15, successPct: 93.3 }],
              practiceTopics: [{ topicName: 'Jednačine & tekst', questionCount: 10, successPct: 60 }],
            },
            {
              subject: 'srpski',
              completedQuizzes: 3,
              activeDays: 3,
              avgScorePct: 79.7,
              previousAvgScorePct: null,
              trendPct: null,
              questionCount: 30,
              correctCount: 24,
              strongTopics: [],
              practiceTopics: [],
            },
          ],
          chess: {
            gamesPlayed: 1,
            wins: 1,
            draws: 0,
            losses: 0,
            starsAwarded: 3,
          },
        },
        {
          childProfileId: 'dete-2',
          name: 'Filip',
          avatar: '🤖',
          completedQuizzes: 0,
          activeDays: 2,
          avgScorePct: null,
          previousAvgScorePct: null,
          trendPct: null,
          questionCount: 0,
          correctCount: 0,
          starsAwarded: 4,
          subjects: [],
          chess: {
            gamesPlayed: 2,
            wins: 1,
            draws: 1,
            losses: 0,
            starsAwarded: 4,
          },
        },
      ],
    }

    const mejl = napraviSadrzajObjedinjenogIzvestaja(sazetak, 'https://mozgalica.rs/app/')

    expect(mejl.subject).toBe('Mozgalica: nedeljni izveštaj (21.09.–27.09.2026.)')
    expect(mejl.html).toContain('Andreja &lt;Test&gt;')
    expect(mejl.html).toContain('Jednačine &amp; tekst (60%)')
    expect(mejl.html).not.toContain('class="blago"')
    expect(mejl.html).toContain('Matematika')
    expect(mejl.html).toContain('Srpski jezik')
    expect(mejl.html).toContain('Razlomci (93,3%)')
    expect(mejl.html).toContain('+6,2 p.p. u odnosu na prethodnu sedmicu')
    expect(mejl.html).toContain('1 partija (1 pobeda, 0 remija, 0 poraza)')
    expect(mejl.html).toContain('Filip')
    expect(mejl.html).toContain('2 partije (1 pobeda, 1 remi, 0 poraza)')
    expect(mejl.html).toContain('https://mozgalica.rs/app/#/admin/napredak?dete=dete-1')
    expect(mejl.html).toContain('https://mozgalica.rs/app/#/admin/napredak?dete=dete-2')
    expect(mejl.html).toContain('https://mozgalica.rs/app/#/admin/napredak"')

    expect(mejl.text).toContain('Andreja <Test>')
    expect(mejl.text).toContain('2 aktivna deteta · 8 kvizova · 68/80 tačnih odgovora · 3 šah partije')
    expect(mejl.text).toContain('Matematika: 5 kvizova · 44/50 tačnih · prosek 88,2%')
    expect(mejl.text).toContain('Šah: 2 partije (1 pobeda, 1 remi, 0 poraza) · 4 ⭐')
  })
})
