-- Objedinjeni nedeljni izveštaj za roditelja: jedan mejl (i inbox/push obaveštenje)
-- ponedeljkom od 08:00 po vremenu Srbije, za svu decu, sve predmete (dnevne i ručno
-- dodeljene ocenjene kvizove) i završene šahovske partije iz prethodne sedmice.
-- Ako nijedno dete nije imalo aktivnost prethodne nedelje, slanje se preskače.

alter table public.admin_settings
  add column if not exists weekly_report_enabled boolean not null default true,
  add column if not exists weekly_report_enabled_at timestamptz default now();

create table if not exists public.weekly_parent_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  summary jsonb not null,
  created_at timestamptz not null default now(),
  unique (owner_id, week_start),
  check (week_end = week_start + 6),
  check (jsonb_typeof(summary) = 'object')
);

alter table public.weekly_parent_reports enable row level security;
revoke all on public.weekly_parent_reports from anon, authenticated;

alter table public.notifications
  add column if not exists parent_weekly_report_id uuid
    references public.weekly_parent_reports (id) on delete cascade;

create unique index if not exists uq_notifications_parent_weekly_report
  on public.notifications (parent_weekly_report_id, recipient_type)
  where event_type = 'weekly_report' and parent_weekly_report_id is not null;

-- Podešavanje nedeljnog izveštaja na nivou roditelja (admin_settings ima column-level
-- update samo na email_notifications, pa se ova kolona menja kroz RPC).
create or replace function public.postavi_nedeljni_izvestaj(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean := coalesce(p_enabled, false);
  v_result boolean;
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;

  update public.admin_settings
  set weekly_report_enabled = v_enabled,
      weekly_report_enabled_at = case
        when v_enabled and not weekly_report_enabled then now()
        when v_enabled then coalesce(weekly_report_enabled_at, now())
        else null
      end
  where user_id = auth.uid()
  returning weekly_report_enabled into v_result;

  return coalesce(v_result, v_enabled);
end;
$$;

revoke all on function public.postavi_nedeljni_izvestaj(boolean) from public, anon;
grant execute on function public.postavi_nedeljni_izvestaj(boolean) to authenticated;

create or replace function public.fn_srpski_oblik(
  p_broj int,
  p_jedan text,
  p_dva text,
  p_pet text
)
returns text
language sql
immutable
as $$
  select case
    when abs(coalesce(p_broj, 0)) % 100 between 11 and 14 then p_pet
    when abs(coalesce(p_broj, 0)) % 10 = 1 then p_jedan
    when abs(coalesce(p_broj, 0)) % 10 between 2 and 4 then p_dva
    else p_pet
  end
$$;

revoke all on function public.fn_srpski_oblik(int, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_srpski_oblik(int, text, text, text) to service_role;

-- Zastarali nedeljni izveštaj po pojedinačnom rasporedu više ne šalje obaveštenja;
-- objedinjeni izveštaj obrađuje process_due_weekly_parent_reports.
create or replace function public.process_due_smart_weekly_reports(p_limit int default 50)
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Nedozvoljena operacija.';
  end if;
  return 0;
end;
$$;

revoke all on function public.process_due_smart_weekly_reports(int) from public, anon, authenticated;
grant execute on function public.process_due_smart_weekly_reports(int) to service_role;

-- Objedinjeni nedeljni izveštaj za sve roditelje kojima je opcija uključena.
-- Pokreće se ponedeljkom od 08:00 (Europe/Belgrade) i obuhvata prethodnu sedmicu
-- (ponedeljak–nedelja). Idempotentno po (owner_id, week_start).
create or replace function public.process_due_weekly_parent_reports(p_limit int default 50)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.admin_settings;
  v_profile public.child_profiles;
  v_local_now timestamp := now() at time zone 'Europe/Belgrade';
  v_current_week_start date := date_trunc('week', now() at time zone 'Europe/Belgrade')::date;
  v_week_start date := v_current_week_start - 7;
  v_week_end date := v_current_week_start - 1;
  v_prev_week_start date := v_week_start - 7;
  v_prev_week_end date := v_week_start - 1;
  v_window_start timestamptz := v_week_start::timestamp at time zone 'Europe/Belgrade';
  v_window_end timestamptz := (v_week_end + 1)::timestamp at time zone 'Europe/Belgrade';

  v_children jsonb;
  v_child_subjects jsonb;
  v_child_chess jsonb;
  v_child_quizzes int;
  v_child_questions int;
  v_child_correct int;
  v_child_avg_pct numeric;
  v_child_prev_avg_pct numeric;
  v_child_quiz_stars int;
  v_child_score_sum numeric;
  v_child_active_days int;
  v_chess_games int;
  v_chess_wins int;
  v_chess_draws int;
  v_chess_losses int;
  v_chess_stars int;

  v_total_quizzes int;
  v_total_questions int;
  v_total_correct int;
  v_total_chess int;
  v_total_score_sum numeric;
  v_body_parts text[];
  v_child_part text;

  v_summary jsonb;
  v_report_id uuid;
  v_notification_id uuid;
  v_notif_title text;
  v_notif_body text;
  v_processed int := 0;
  v_sent int := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Nedozvoljena operacija.';
  end if;

  for v_admin in
    select s.*
    from public.admin_settings s
    where s.weekly_report_enabled
      and s.weekly_report_enabled_at is not null
      and s.weekly_report_enabled_at < (v_current_week_start::timestamp at time zone 'Europe/Belgrade')
      and (v_local_now::date > v_current_week_start or v_local_now::time >= time '08:00:00')
      and not exists (
        select 1 from public.weekly_parent_reports r
        where r.owner_id = s.user_id and r.week_start = v_week_start
      )
    order by s.created_at
    for update of s skip locked
  loop
    exit when v_processed >= greatest(1, least(coalesce(p_limit, 50), 100));

    v_children := '[]'::jsonb;
    v_total_quizzes := 0;
    v_total_questions := 0;
    v_total_correct := 0;
    v_total_chess := 0;
    v_total_score_sum := 0;
    v_body_parts := '{}'::text[];

    for v_profile in
      select cp.*
      from public.child_profiles cp
      where cp.owner_id = v_admin.user_id
      order by lower(cp.name), cp.id
    loop
      with relevant as (
        select a.*
        from public.fn_child_statistics_attempts(
          v_profile.id, v_admin.user_id, v_profile.name, v_week_start, v_week_end
        ) a
      ),
      prev_relevant as (
        select a.*
        from public.fn_child_statistics_attempts(
          v_profile.id, v_admin.user_id, v_profile.name, v_prev_week_start, v_prev_week_end
        ) a
      ),
      attempt_questions as (
        select
          r.id as attempt_id,
          r.submitted_at,
          r.score_pct as attempt_score_pct,
          coalesce(t.subject, ds.subject, 'ostalo') as subject,
          qq.topic_name,
          qq.points,
          coalesce(aa.is_correct, false) as is_correct,
          coalesce(aa.awarded_points, 0) as awarded_points
        from relevant r
        join public.quizzes q on q.id = r.quiz_id
        left join public.daily_quiz_schedules ds on ds.id = q.daily_schedule_id
        join public.quiz_questions qq on qq.quiz_id = r.quiz_id
        left join public.topics t on t.id = qq.topic_id
        left join public.attempt_answers aa
          on aa.attempt_id = r.id and aa.quiz_question_id = qq.id
      ),
      attempt_subject_counts as (
        select attempt_id, count(distinct subject)::int as subject_count
        from attempt_questions
        group by attempt_id
      ),
      attempt_subject_scores as (
        select
          aq.attempt_id,
          aq.subject,
          aq.submitted_at,
          count(*)::int as question_count,
          count(*) filter (where aq.is_correct)::int as correct_count,
          case
            when ascnt.subject_count = 1 then max(aq.attempt_score_pct)
            else round(100.0 * sum(aq.awarded_points) / nullif(sum(aq.points), 0), 1)
          end as subject_score_pct
        from attempt_questions aq
        join attempt_subject_counts ascnt on ascnt.attempt_id = aq.attempt_id
        group by aq.attempt_id, aq.subject, aq.submitted_at, ascnt.subject_count
      ),
      subject_totals as (
        select
          subject,
          count(distinct attempt_id)::int as completed_quizzes,
          count(distinct (submitted_at at time zone 'Europe/Belgrade')::date)::int as active_days,
          round(avg(subject_score_pct), 1) as avg_score_pct,
          sum(question_count)::int as question_count,
          sum(correct_count)::int as correct_count
        from attempt_subject_scores
        group by subject
      ),
      prev_attempt_questions as (
        select
          pr.id as attempt_id,
          pr.score_pct as attempt_score_pct,
          coalesce(t.subject, ds.subject, 'ostalo') as subject,
          qq.points,
          coalesce(aa.awarded_points, 0) as awarded_points
        from prev_relevant pr
        join public.quizzes q on q.id = pr.quiz_id
        left join public.daily_quiz_schedules ds on ds.id = q.daily_schedule_id
        join public.quiz_questions qq on qq.quiz_id = pr.quiz_id
        left join public.topics t on t.id = qq.topic_id
        left join public.attempt_answers aa
          on aa.attempt_id = pr.id and aa.quiz_question_id = qq.id
      ),
      prev_attempt_subject_counts as (
        select attempt_id, count(distinct subject)::int as subject_count
        from prev_attempt_questions
        group by attempt_id
      ),
      prev_subject_totals as (
        select
          subject,
          round(avg(subject_score_pct), 1) as prev_avg_score_pct
        from (
          select
            paq.attempt_id,
            paq.subject,
            case
              when pasc.subject_count = 1 then max(paq.attempt_score_pct)
              else round(100.0 * sum(paq.awarded_points) / nullif(sum(paq.points), 0), 1)
            end as subject_score_pct
          from prev_attempt_questions paq
          join prev_attempt_subject_counts pasc on pasc.attempt_id = paq.attempt_id
          group by paq.attempt_id, paq.subject, pasc.subject_count
        ) sub
        group by subject
      ),
      topic_grouped as (
        select
          subject,
          topic_name,
          count(*)::int as question_count,
          round(100.0 * count(*) filter (where is_correct) / nullif(count(*), 0), 1) as success_pct
        from attempt_questions
        group by subject, topic_name
      )
      select
        coalesce((
          select jsonb_agg(jsonb_build_object(
            'subject', st.subject,
            'completedQuizzes', st.completed_quizzes,
            'activeDays', st.active_days,
            'avgScorePct', st.avg_score_pct,
            'previousAvgScorePct', pst.prev_avg_score_pct,
            'trendPct', case
              when st.avg_score_pct is null or pst.prev_avg_score_pct is null then null
              else round(st.avg_score_pct - pst.prev_avg_score_pct, 1)
            end,
            'questionCount', st.question_count,
            'correctCount', st.correct_count,
            'strongTopics', coalesce((
              select jsonb_agg(jsonb_build_object(
                'topicName', s.topic_name,
                'questionCount', s.question_count,
                'successPct', s.success_pct
              ) order by s.success_pct desc, s.question_count desc, s.topic_name)
              from (
                select * from topic_grouped tg
                where tg.subject = st.subject
                  and tg.question_count >= 2
                  and tg.success_pct >= 80
                order by tg.success_pct desc, tg.question_count desc, tg.topic_name
                limit 3
              ) s
            ), '[]'::jsonb),
            'practiceTopics', coalesce((
              select jsonb_agg(jsonb_build_object(
                'topicName', p.topic_name,
                'questionCount', p.question_count,
                'successPct', p.success_pct
              ) order by p.success_pct, p.question_count desc, p.topic_name)
              from (
                select * from topic_grouped tg
                where tg.subject = st.subject
                  and tg.question_count >= 2
                  and tg.success_pct < 70
                order by tg.success_pct, tg.question_count desc, tg.topic_name
                limit 3
              ) p
            ), '[]'::jsonb)
          ) order by case st.subject
            when 'matematika' then 1
            when 'srpski' then 2
            when 'priroda_drustvo' then 3
            else 4
          end, st.subject)
          from subject_totals st
          left join prev_subject_totals pst on pst.subject = st.subject
        ), '[]'::jsonb),
        (select count(*)::int from relevant),
        coalesce((select count(*)::int from attempt_questions), 0),
        coalesce((select count(*) filter (where is_correct)::int from attempt_questions), 0),
        (select round(avg(score_pct), 1) from relevant),
        coalesce((select sum(score_pct) from relevant), 0),
        coalesce((select sum(stars_awarded)::int from relevant), 0),
        (select round(avg(score_pct), 1) from prev_relevant)
      into
        v_child_subjects,
        v_child_quizzes,
        v_child_questions,
        v_child_correct,
        v_child_avg_pct,
        v_child_score_sum,
        v_child_quiz_stars,
        v_child_prev_avg_pct;

      select
        count(*)::int,
        count(*) filter (where g.result = 'child_win')::int,
        count(*) filter (where g.result = 'draw')::int,
        count(*) filter (where g.result = 'child_loss')::int,
        coalesce(sum(g.stars_awarded), 0)::int
      into
        v_chess_games,
        v_chess_wins,
        v_chess_draws,
        v_chess_losses,
        v_chess_stars
      from public.chess_games g
      where g.owner_id = v_admin.user_id
        and g.child_profile_id = v_profile.id
        and g.status = 'completed'
        and g.completed_at >= v_window_start
        and g.completed_at < v_window_end;

      if coalesce(v_child_quizzes, 0) = 0 and coalesce(v_chess_games, 0) = 0 then
        continue;
      end if;

      select count(distinct d)::int
      into v_child_active_days
      from (
        select (a.submitted_at at time zone 'Europe/Belgrade')::date as d
        from public.fn_child_statistics_attempts(
          v_profile.id, v_admin.user_id, v_profile.name, v_week_start, v_week_end
        ) a
        union
        select (g.completed_at at time zone 'Europe/Belgrade')::date as d
        from public.chess_games g
        where g.owner_id = v_admin.user_id
          and g.child_profile_id = v_profile.id
          and g.status = 'completed'
          and g.completed_at >= v_window_start
          and g.completed_at < v_window_end
      ) dani;

      v_child_chess := case
        when v_chess_games > 0 then jsonb_build_object(
          'gamesPlayed', v_chess_games,
          'wins', v_chess_wins,
          'draws', v_chess_draws,
          'losses', v_chess_losses,
          'starsAwarded', v_chess_stars
        )
        else null
      end;

      v_children := v_children || jsonb_build_array(jsonb_build_object(
        'childProfileId', v_profile.id,
        'name', v_profile.name,
        'avatar', v_profile.avatar,
        'completedQuizzes', v_child_quizzes,
        'activeDays', coalesce(v_child_active_days, 0),
        'avgScorePct', v_child_avg_pct,
        'previousAvgScorePct', v_child_prev_avg_pct,
        'trendPct', case
          when v_child_avg_pct is null or v_child_prev_avg_pct is null then null
          else round(v_child_avg_pct - v_child_prev_avg_pct, 1)
        end,
        'questionCount', v_child_questions,
        'correctCount', v_child_correct,
        'starsAwarded', v_child_quiz_stars + v_chess_stars,
        'subjects', v_child_subjects,
        'chess', v_child_chess
      ));

      v_total_quizzes := v_total_quizzes + v_child_quizzes;
      v_total_questions := v_total_questions + v_child_questions;
      v_total_correct := v_total_correct + v_child_correct;
      v_total_chess := v_total_chess + v_chess_games;
      v_total_score_sum := v_total_score_sum + v_child_score_sum;

      v_child_part := v_profile.name || ': ';
      if v_child_quizzes > 0 and v_chess_games > 0 then
        v_child_part := v_child_part
          || v_child_quizzes || ' ' || public.fn_srpski_oblik(v_child_quizzes, 'kviz', 'kviza', 'kvizova')
          || ' (' || replace(coalesce(v_child_avg_pct::text, '0'), '.', ',') || '%), '
          || v_chess_games || ' ' || public.fn_srpski_oblik(v_chess_games, 'šah partija', 'šah partije', 'šah partija');
      elsif v_child_quizzes > 0 then
        v_child_part := v_child_part
          || v_child_quizzes || ' ' || public.fn_srpski_oblik(v_child_quizzes, 'kviz', 'kviza', 'kvizova')
          || ' (' || replace(coalesce(v_child_avg_pct::text, '0'), '.', ',') || '%)';
      else
        v_child_part := v_child_part
          || v_chess_games || ' ' || public.fn_srpski_oblik(v_chess_games, 'šah partija', 'šah partije', 'šah partija');
      end if;
      v_body_parts := array_append(v_body_parts, v_child_part);
    end loop;

    if jsonb_array_length(v_children) = 0 then
      -- Zabeleži praznu sedmicu bez pravljenja obaveštenja i bez slanja mejla.
      insert into public.weekly_parent_reports (owner_id, week_start, week_end, summary)
      values (
        v_admin.user_id,
        v_week_start,
        v_week_end,
        jsonb_build_object(
          'hasActivity', false,
          'weekStart', v_week_start,
          'weekEnd', v_week_end,
          'children', '[]'::jsonb
        )
      )
      on conflict (owner_id, week_start) do nothing;

      v_processed := v_processed + 1;
      continue;
    end if;

    v_summary := jsonb_build_object(
      'hasActivity', true,
      'weekStart', v_week_start,
      'weekEnd', v_week_end,
      'totals', jsonb_build_object(
        'activeChildren', jsonb_array_length(v_children),
        'completedQuizzes', v_total_quizzes,
        'questionCount', v_total_questions,
        'correctCount', v_total_correct,
        'avgScorePct', case
          when v_total_quizzes > 0 then round(v_total_score_sum / v_total_quizzes, 1)
          else null
        end,
        'chessGamesPlayed', v_total_chess
      ),
      'children', v_children
    );

    insert into public.weekly_parent_reports (owner_id, week_start, week_end, summary)
    values (v_admin.user_id, v_week_start, v_week_end, v_summary)
    on conflict (owner_id, week_start) do nothing
    returning id into v_report_id;

    if v_report_id is not null then
      v_notif_title := 'Nedeljni izveštaj ('
        || to_char(v_week_start, 'DD.MM.') || '–' || to_char(v_week_end, 'DD.MM.') || ')';
      v_notif_body := left(array_to_string(v_body_parts, '; '), 990);

      insert into public.notifications (
        owner_id, recipient_type, event_type, parent_weekly_report_id,
        title, body, target_url
      ) values (
        v_admin.user_id,
        'admin',
        'weekly_report',
        v_report_id,
        v_notif_title,
        v_notif_body,
        '/admin/napredak'
      )
      on conflict do nothing
      returning id into v_notification_id;

      if v_notification_id is not null then
        perform public.fn_enqueue_push_deliveries(
          v_notification_id, 'admin', v_admin.user_id, null
        );
        insert into public.notification_deliveries (notification_id, channel)
        values (v_notification_id, 'email')
        on conflict do nothing;
      end if;

      v_sent := v_sent + 1;
    end if;

    v_processed := v_processed + 1;
  end loop;

  return v_sent;
end;
$$;

revoke all on function public.process_due_weekly_parent_reports(int) from public, anon, authenticated;
grant execute on function public.process_due_weekly_parent_reports(int) to service_role;
