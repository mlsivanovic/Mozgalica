-- Administratorska statistika po detetu. Obrazovni pokazatelji uključuju i
-- istorijske generičke pokušaje istog imena, dok nagrade ostaju vezane isključivo
-- za trajno povezani profil.

-- Upiti statistike uvek čitaju završene i konačno ocenjene pokušaje. Dva parcijalna
-- indeksa pokrivaju profilne i starije generičke rezultate bez usporavanja ostalih
-- tokova rada sa pokušajima.
create index if not exists idx_attempts_statistics_profile_submitted
  on public.attempts (child_profile_id, submitted_at desc)
  where child_profile_id is not null
    and status = 'submitted'
    and not review_pending;

create index if not exists idx_attempts_statistics_name_submitted
  on public.attempts (public.fn_normalize_text(child_name), submitted_at desc)
  where child_profile_id is null
    and status = 'submitted'
    and not review_pending;

-- Interni skup pokušaja za statistiku jednog profila. Generički pokušaji se vezuju
-- samo kada pripadaju istom administratoru i njihovo normalizovano ime odgovara
-- imenu profila. Funkcija nema javni grant; koriste je isključivo admin RPC-ovi ispod.
create or replace function public.fn_child_statistics_attempts(
  p_profile_id uuid,
  p_owner_id uuid,
  p_profile_name text,
  p_from_date date default null,
  p_to_date date default null
)
returns table (
  id uuid,
  quiz_id uuid,
  title text,
  submitted_at timestamptz,
  score_pct numeric,
  passed boolean,
  duration_sec int,
  stars_awarded smallint,
  correct_count int,
  is_profile_linked boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.quiz_id,
    q.title,
    a.submitted_at,
    a.score_pct,
    a.passed,
    a.duration_sec,
    a.stars_awarded,
    a.correct_count,
    a.child_profile_id = p_profile_id as is_profile_linked
  from public.attempts a
  join public.quizzes q on q.id = a.quiz_id
  where q.owner_id = p_owner_id
    and a.status = 'submitted'
    and not a.review_pending
    and (
      a.child_profile_id = p_profile_id
      or (
        a.child_profile_id is null
        and public.fn_normalize_text(a.child_name) = public.fn_normalize_text(p_profile_name)
      )
    )
    and (
      p_from_date is null
      or a.submitted_at >= (p_from_date::timestamp at time zone 'Europe/Belgrade')
    )
    and (
      p_to_date is null
      or a.submitted_at < ((p_to_date + 1)::timestamp at time zone 'Europe/Belgrade')
    );
$$;

revoke all on function public.fn_child_statistics_attempts(uuid, uuid, text, date, date) from public;
revoke all on function public.fn_child_statistics_attempts(uuid, uuid, text, date, date) from anon;
revoke all on function public.fn_child_statistics_attempts(uuid, uuid, text, date, date) from authenticated;

-- Sažet pregled svih profila za kartice na administratorskoj strani.
create or replace function public.admin_get_child_statistics_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_profile public.child_profiles;
  v_children jsonb := '[]'::jsonb;
  v_completed_attempts int;
  v_avg_score_pct numeric;
  v_pass_rate_pct numeric;
  v_last_activity_at timestamptz;
  v_recent_trend_pct numeric;
  v_total_stars int;
  v_spent_stars int;
  v_spendable_stars int;
  v_requested_purchases int;
  v_consumed_purchases int;
  v_cancelled_purchases int;
  v_current_title jsonb;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  for v_profile in
    select *
    from public.child_profiles
    where owner_id = v_owner_id
    order by lower(name), id
  loop
    with relevant as (
      select *
      from public.fn_child_statistics_attempts(
        v_profile.id, v_profile.owner_id, v_profile.name, null, null
      )
    ), ranked as (
      select
        relevant.*,
        row_number() over (order by submitted_at desc, id desc) as redni_broj
      from relevant
    )
    select
      count(*)::int,
      round(avg(score_pct), 1),
      round(100.0 * count(*) filter (where passed) / nullif(count(*), 0), 1),
      max(submitted_at),
      case
        when count(*) filter (where redni_broj <= 6) = 6 then round(
          avg(score_pct) filter (where redni_broj <= 3)
          - avg(score_pct) filter (where redni_broj between 4 and 6),
          1
        )
        else null
      end
    into
      v_completed_attempts,
      v_avg_score_pct,
      v_pass_rate_pct,
      v_last_activity_at,
      v_recent_trend_pct
    from ranked;

    select coalesce(sum(a.stars_awarded), 0)::int
    into v_total_stars
    from public.attempts a
    join public.quizzes q on q.id = a.quiz_id
    where a.child_profile_id = v_profile.id
      and q.owner_id = v_profile.owner_id
      and a.status = 'submitted'
      and not a.review_pending;

    select
      coalesce(sum(cost) filter (where status in ('requested', 'consumed')), 0)::int,
      count(*) filter (where status = 'requested')::int,
      count(*) filter (where status = 'consumed')::int,
      count(*) filter (where status = 'cancelled')::int
    into
      v_spent_stars,
      v_requested_purchases,
      v_consumed_purchases,
      v_cancelled_purchases
    from public.shop_purchases
    where child_profile_id = v_profile.id
      and owner_id = v_profile.owner_id;

    v_spendable_stars := v_total_stars - v_spent_stars;

    v_current_title := null;
    select jsonb_build_object(
      'name', tl.name,
      'avatar', tl.avatar,
      'minStars', tl.min_stars
    )
    into v_current_title
    from public.title_levels tl
    where tl.owner_id = v_profile.owner_id
      and tl.min_stars <= v_total_stars
    order by tl.min_stars desc
    limit 1;

    v_children := v_children || jsonb_build_array(jsonb_build_object(
      'profileId', v_profile.id,
      'name', v_profile.name,
      'avatar', v_profile.avatar,
      'completedAttempts', coalesce(v_completed_attempts, 0),
      'avgScorePct', v_avg_score_pct,
      'passRatePct', v_pass_rate_pct,
      'lastActivityAt', v_last_activity_at,
      'recentTrendPct', v_recent_trend_pct,
      'rewards', jsonb_build_object(
        'totalStars', v_total_stars,
        'spendableStars', v_spendable_stars,
        'spentStars', v_spent_stars,
        'currentTitle', v_current_title,
        'purchaseStatus', jsonb_build_object(
          'requestedCount', coalesce(v_requested_purchases, 0),
          'consumedCount', coalesce(v_consumed_purchases, 0),
          'cancelledCount', coalesce(v_cancelled_purchases, 0)
        )
      )
    ));
  end loop;

  return jsonb_build_object('ok', true, 'children', v_children);
end;
$$;

revoke all on function public.admin_get_child_statistics_overview() from public;
revoke all on function public.admin_get_child_statistics_overview() from anon;
grant execute on function public.admin_get_child_statistics_overview() to authenticated;

-- Detaljan prikaz statistike jednog profila. Datumi su inkluzivni lokalni datumi
-- u zoni Europe/Belgrade; SQL ih pretvara u početak dana i početak narednog dana.
create or replace function public.admin_get_child_statistics_detail(
  p_profile_id uuid,
  p_from_date date default null,
  p_to_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_profile public.child_profiles;
  v_summary jsonb;
  v_timeline jsonb;
  v_topic_data jsonb;
  v_difficult_questions jsonb;
  v_recent_attempts jsonb;
  v_total_stars int;
  v_spent_stars int;
  v_spendable_stars int;
  v_requested_purchases int;
  v_consumed_purchases int;
  v_cancelled_purchases int;
  v_current_title jsonb;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if (p_from_date is null) <> (p_to_date is null)
    or (p_from_date is not null and p_to_date is not null and p_from_date > p_to_date)
  then
    return jsonb_build_object('ok', false, 'error', 'invalid_period');
  end if;

  select *
  into v_profile
  from public.child_profiles
  where id = p_profile_id
    and owner_id = v_owner_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  with relevant as (
    select *
    from public.fn_child_statistics_attempts(
      v_profile.id, v_profile.owner_id, v_profile.name, p_from_date, p_to_date
    )
  ), attempt_question_counts as (
    select
      r.id,
      count(qq.id)::int as question_count
    from relevant r
    left join public.quiz_questions qq on qq.quiz_id = r.quiz_id
    group by r.id
  ), question_totals as (
    select
      count(qq.id)::int as question_count,
      count(qq.id) filter (where aa.is_correct)::int as correct_count
    from relevant r
    left join public.quiz_questions qq on qq.quiz_id = r.quiz_id
    left join public.attempt_answers aa
      on aa.attempt_id = r.id
      and aa.quiz_question_id = qq.id
  ), ranked as (
    select
      relevant.*,
      row_number() over (order by submitted_at desc, id desc) as redni_broj
    from relevant
  )
  select jsonb_build_object(
    'completedAttempts', (select count(*)::int from relevant),
    'avgScorePct', (select round(avg(score_pct), 1) from relevant),
    'passRatePct', (
      select round(100.0 * count(*) filter (where passed) / nullif(count(*), 0), 1)
      from relevant
    ),
    'correctAnswers', coalesce((select correct_count from question_totals), 0),
    'questionCount', coalesce((select question_count from question_totals), 0),
    'avgTimePerQuestionSec', (
      select round(
        (sum(r.duration_sec) filter (where r.duration_sec is not null))::numeric
        / nullif(sum(aqc.question_count) filter (where r.duration_sec is not null), 0),
        1
      )
      from relevant r
      join attempt_question_counts aqc on aqc.id = r.id
    ),
    'activeDays', (
      select count(distinct (submitted_at at time zone 'Europe/Belgrade')::date)::int
      from relevant
    ),
    'recentTrendPct', (
      select case
        when count(*) filter (where redni_broj <= 6) = 6 then round(
          avg(score_pct) filter (where redni_broj <= 3)
          - avg(score_pct) filter (where redni_broj between 4 and 6),
          1
        )
        else null
      end
      from ranked
    )
  )
  into v_summary;

  with relevant as (
    select *
    from public.fn_child_statistics_attempts(
      v_profile.id, v_profile.owner_id, v_profile.name, p_from_date, p_to_date
    )
  ), daily as (
    select
      (submitted_at at time zone 'Europe/Belgrade')::date as day,
      round(avg(score_pct), 1) as avg_score_pct,
      count(*)::int as attempts_count
    from relevant
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', day,
    'avgScorePct', avg_score_pct,
    'attemptsCount', attempts_count
  ) order by day), '[]'::jsonb)
  into v_timeline
  from daily;

  with relevant as (
    select *
    from public.fn_child_statistics_attempts(
      v_profile.id, v_profile.owner_id, v_profile.name, p_from_date, p_to_date
    )
  ), grouped as (
    select
      qq.topic_name,
      count(*)::int as question_count,
      count(*) filter (where aa.is_correct)::int as correct_count,
      count(*) filter (where aa.is_correct is not true)::int as incorrect_count,
      round(
        100.0 * count(*) filter (where aa.is_correct) / nullif(count(*), 0),
        1
      ) as success_pct
    from relevant r
    join public.quiz_questions qq on qq.quiz_id = r.quiz_id
    left join public.attempt_answers aa
      on aa.attempt_id = r.id
      and aa.quiz_question_id = qq.id
    group by qq.topic_name
  )
  select jsonb_build_object(
    'all', coalesce(jsonb_agg(jsonb_build_object(
      'topicName', topic_name,
      'questionCount', question_count,
      'correctCount', correct_count,
      'incorrectCount', incorrect_count,
      'successPct', success_pct
    ) order by success_pct desc, question_count desc, topic_name), '[]'::jsonb),
    'strong', coalesce(jsonb_agg(jsonb_build_object(
      'topicName', topic_name,
      'questionCount', question_count,
      'correctCount', correct_count,
      'incorrectCount', incorrect_count,
      'successPct', success_pct
    ) order by success_pct desc, question_count desc, topic_name)
      filter (where question_count >= 3 and success_pct >= 80), '[]'::jsonb),
    'practice', coalesce(jsonb_agg(jsonb_build_object(
      'topicName', topic_name,
      'questionCount', question_count,
      'correctCount', correct_count,
      'incorrectCount', incorrect_count,
      'successPct', success_pct
    ) order by success_pct, question_count desc, topic_name)
      filter (where question_count >= 3 and success_pct < 60), '[]'::jsonb)
  )
  into v_topic_data
  from grouped;

  with relevant as (
    select *
    from public.fn_child_statistics_attempts(
      v_profile.id, v_profile.owner_id, v_profile.name, p_from_date, p_to_date
    )
  ), grouped as (
    select
      coalesce(
        qq.source_question_id::text,
        'snapshot:' || public.fn_normalize_text(qq.text)
      ) as question_key,
      (array_agg(qq.text order by r.submitted_at desc, r.id desc))[1] as question_text,
      (array_agg(qq.topic_name order by r.submitted_at desc, r.id desc))[1] as topic_name,
      count(*)::int as answers_count,
      count(*) filter (where aa.is_correct)::int as correct_count,
      count(*) filter (where aa.is_correct is not true)::int as wrong_count,
      round(
        100.0 * count(*) filter (where aa.is_correct) / nullif(count(*), 0),
        1
      ) as success_pct,
      (array_agg(r.id order by r.submitted_at desc, r.id desc))[1] as last_attempt_id
    from relevant r
    join public.quiz_questions qq on qq.quiz_id = r.quiz_id
    left join public.attempt_answers aa
      on aa.attempt_id = r.id
      and aa.quiz_question_id = qq.id
    group by coalesce(
      qq.source_question_id::text,
      'snapshot:' || public.fn_normalize_text(qq.text)
    )
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'questionKey', question_key,
    'text', question_text,
    'topicName', topic_name,
    'answersCount', answers_count,
    'correctCount', correct_count,
    'wrongCount', wrong_count,
    'successPct', success_pct,
    'lastAttemptId', last_attempt_id
  )), '[]'::jsonb)
  into v_difficult_questions
  from (
    select *
    from grouped
    order by wrong_count desc, success_pct, answers_count desc, question_text
    limit 5
  ) hardest;

  with relevant as (
    select *
    from public.fn_child_statistics_attempts(
      v_profile.id, v_profile.owner_id, v_profile.name, p_from_date, p_to_date
    )
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'attemptId', id,
    'title', title,
    'submittedAt', submitted_at,
    'scorePct', score_pct,
    'durationSec', duration_sec,
    'starsAwarded', stars_awarded,
    'correctCount', correct_count,
    'questionCount', (
      select count(*)::int
      from public.quiz_questions qq
      where qq.quiz_id = recent.quiz_id
    ),
    'source', case when is_profile_linked then 'profile' else 'history' end
  ) order by submitted_at desc, id desc), '[]'::jsonb)
  into v_recent_attempts
  from (
    select *
    from relevant
    order by submitted_at desc, id desc
    limit 10
  ) recent;

  select coalesce(sum(a.stars_awarded), 0)::int
  into v_total_stars
  from public.attempts a
  join public.quizzes q on q.id = a.quiz_id
  where a.child_profile_id = v_profile.id
    and q.owner_id = v_profile.owner_id
    and a.status = 'submitted'
    and not a.review_pending;

  select
    coalesce(sum(cost) filter (where status in ('requested', 'consumed')), 0)::int,
    count(*) filter (where status = 'requested')::int,
    count(*) filter (where status = 'consumed')::int,
    count(*) filter (where status = 'cancelled')::int
  into
    v_spent_stars,
    v_requested_purchases,
    v_consumed_purchases,
    v_cancelled_purchases
  from public.shop_purchases
  where child_profile_id = v_profile.id
    and owner_id = v_profile.owner_id;

  v_spendable_stars := v_total_stars - v_spent_stars;

  v_current_title := null;
  select jsonb_build_object(
    'name', tl.name,
    'avatar', tl.avatar,
    'minStars', tl.min_stars
  )
  into v_current_title
  from public.title_levels tl
  where tl.owner_id = v_profile.owner_id
    and tl.min_stars <= v_total_stars
  order by tl.min_stars desc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'profileId', v_profile.id,
    'name', v_profile.name,
    'avatar', v_profile.avatar,
    'period', jsonb_build_object('from', p_from_date, 'to', p_to_date),
    'summary', v_summary,
    'timeline', v_timeline,
    'topics', coalesce(v_topic_data->'all', '[]'::jsonb),
    'strongTopics', coalesce(v_topic_data->'strong', '[]'::jsonb),
    'practiceTopics', coalesce(v_topic_data->'practice', '[]'::jsonb),
    'difficultQuestions', v_difficult_questions,
    'recentAttempts', v_recent_attempts,
    'rewards', jsonb_build_object(
      'totalStars', v_total_stars,
      'spendableStars', v_spendable_stars,
      'spentStars', v_spent_stars,
      'currentTitle', v_current_title,
      'purchaseStatus', jsonb_build_object(
        'requestedCount', coalesce(v_requested_purchases, 0),
        'consumedCount', coalesce(v_consumed_purchases, 0),
        'cancelledCount', coalesce(v_cancelled_purchases, 0)
      )
    )
  );
end;
$$;

revoke all on function public.admin_get_child_statistics_detail(uuid, date, date) from public;
revoke all on function public.admin_get_child_statistics_detail(uuid, date, date) from anon;
grant execute on function public.admin_get_child_statistics_detail(uuid, date, date) to authenticated;
