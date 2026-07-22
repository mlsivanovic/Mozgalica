-- Sezonske titule su izvedene iz zvezdica koje je dete osvojilo na dodeljenim
-- kvizovima. Zvezdice se i dalje računaju dinamički, dok se otključane titule
-- čuvaju kao istorija da se osvojeni rang nikad ne bi spustio unutar sezone.

-- ---------------------------------------------------------------------------
-- Nivoi titula i sezone
-- ---------------------------------------------------------------------------
create table public.child_title_levels (
  level smallint primary key check (level between 1 and 12),
  threshold_stars integer not null unique check (threshold_stars > 0),
  title text not null unique check (length(title) between 1 and 80)
);

insert into public.child_title_levels (level, threshold_stars, title) values
  (1, 3, 'StarScout'),
  (2, 8, 'ShadowNinja'),
  (3, 15, 'StormFighter'),
  (4, 25, 'IronSamurai'),
  (5, 40, 'ThunderRider'),
  (6, 55, 'DragonGuardian'),
  (7, 70, 'SkyBreaker'),
  (8, 90, 'CosmicKnight'),
  (9, 110, 'PhantomCommander'),
  (10, 125, 'TitanMaster'),
  (11, 140, 'GalaxyChampion'),
  (12, 150, 'LegendPrime');

create table public.child_title_seasons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  child_name text not null check (child_name in ('Andrej', 'Filip')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Prva sezona svakog vlasnika uključuje rezultate nastale pre uvođenja titula.
  includes_existing_results boolean not null default false,
  -- Nula znači da u sezoni još nema otključane titule.
  highest_title_level smallint not null default 0 check (highest_title_level between 0 and 12),
  highest_title_unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (highest_title_level = 0 and highest_title_unlocked_at is null)
    or (highest_title_level > 0 and highest_title_unlocked_at is not null)
  ),
  check (ended_at is null or ended_at >= started_at)
);

create unique index uq_child_title_seasons_active
  on public.child_title_seasons (owner_id, child_name)
  where ended_at is null;

create index idx_child_title_seasons_owner_child
  on public.child_title_seasons (owner_id, child_name, started_at desc);

-- Svaki nivo se upisuje zasebno, pa istorija ostaje dostupna i posle reseta.
-- Veza ka pokušaju je namerno SET NULL: brisanje kviza ne sme obrisati titulu.
create table public.child_title_unlocks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.child_title_seasons (id) on delete cascade,
  title_level smallint not null references public.child_title_levels (level),
  unlocked_at timestamptz not null default now(),
  unlocked_by_attempt_id uuid references public.attempts (id) on delete set null,
  unique (season_id, title_level)
);

create index idx_child_title_unlocks_season
  on public.child_title_unlocks (season_id, title_level desc);

alter table public.child_title_levels enable row level security;
alter table public.child_title_seasons enable row level security;
alter table public.child_title_unlocks enable row level security;

revoke all on public.child_title_levels, public.child_title_seasons, public.child_title_unlocks
  from anon, authenticated;

-- Svaki novi administrator odmah dobija početnu, istorijsku sezonu za oba deteta.
create or replace function public.fn_create_initial_child_title_seasons()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.child_title_seasons (owner_id, child_name, includes_existing_results)
  values
    (new.user_id, 'Andrej', true),
    (new.user_id, 'Filip', true)
  on conflict (owner_id, child_name) where (ended_at is null) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_admin_settings_initial_child_title_seasons on public.admin_settings;
create trigger trg_admin_settings_initial_child_title_seasons
  after insert on public.admin_settings
  for each row execute function public.fn_create_initial_child_title_seasons();

-- Postojeći vlasnici dobijaju prvu sezonu bez resetovanja ranije osvojenih zvezdica.
insert into public.child_title_seasons (owner_id, child_name, includes_existing_results)
select podesavanja.user_id, dete.child_name, true
from public.admin_settings podesavanja
cross join (values ('Andrej'::text), ('Filip'::text)) as dete(child_name)
on conflict (owner_id, child_name) where (ended_at is null) do nothing;

-- ---------------------------------------------------------------------------
-- Interni obračun sezonskog napretka
-- ---------------------------------------------------------------------------
create or replace function public.fn_ensure_active_child_title_season(
  p_owner_id uuid,
  p_child_name text
)
returns public.child_title_seasons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season public.child_title_seasons;
begin
  if p_owner_id is null or p_child_name is null or p_child_name not in ('Andrej', 'Filip') then
    raise exception 'Neispravan vlasnik ili ime deteta za sezonu titula.';
  end if;

  -- Fallback je potreban za vlasnike čiji je administratorski red nastao pre
  -- trigera ili je ručno vraćen iz bekapa.
  insert into public.child_title_seasons (owner_id, child_name, includes_existing_results)
  select
    p_owner_id,
    p_child_name,
    not exists (
      select 1
      from public.child_title_seasons
      where owner_id = p_owner_id and child_name = p_child_name
    )
  on conflict (owner_id, child_name) where (ended_at is null) do nothing;

  select * into v_season
  from public.child_title_seasons
  where owner_id = p_owner_id
    and child_name = p_child_name
    and ended_at is null;

  return v_season;
end;
$$;

-- Za prvi ciklus se vidi ceo postojeći zbir. Svaka kasnija sezona računa samo
-- pokušaje predane od njenog početka nadalje, uz najbolji rezultat po kvizu.
create or replace function public.fn_child_title_season_stars(p_season_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(najbolji.stars), 0)::integer
  from (
    select max(a.stars_earned)::integer as stars
    from public.child_title_seasons s
    join public.quizzes q
      on q.owner_id = s.owner_id
      and q.fixed_child_name = s.child_name
    join public.attempts a
      on a.quiz_id = q.id
      and a.stars_earned is not null
    where s.id = p_season_id
      and (s.includes_existing_results or a.submitted_at >= s.started_at)
    group by q.id
  ) najbolji
$$;

-- Zaključavanje reda sezone serijalizuje paralelne predaje istog deteta. Tako
-- se svaki nivo upisuje samo jednom, čak i kada dva pokušaja stignu istovremeno.
create or replace function public.fn_refresh_child_title_season(
  p_owner_id uuid,
  p_child_name text,
  p_unlocked_by_attempt_id uuid default null
)
returns public.child_title_seasons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season public.child_title_seasons;
  v_season_stars integer;
  v_highest_earned_level smallint;
  v_unlock_attempt_id uuid;
begin
  select * into v_season
  from public.fn_ensure_active_child_title_season(p_owner_id, p_child_name);

  select * into v_season
  from public.child_title_seasons
  where id = v_season.id
  for update;

  -- Interna funkcija dodatno proverava vezu pokušaja pre nego što ga zabeleži
  -- kao uzrok otključavanja, da istorija ne može dobiti tuđi identifikator.
  if p_unlocked_by_attempt_id is not null and exists (
    select 1
    from public.attempts a
    join public.quizzes q on q.id = a.quiz_id
    where a.id = p_unlocked_by_attempt_id
      and q.owner_id = p_owner_id
      and q.fixed_child_name = p_child_name
      and a.stars_earned is not null
      and (v_season.includes_existing_results or a.submitted_at >= v_season.started_at)
  ) then
    v_unlock_attempt_id := p_unlocked_by_attempt_id;
  end if;

  v_season_stars := public.fn_child_title_season_stars(v_season.id);

  select coalesce(max(level), 0)::smallint into v_highest_earned_level
  from public.child_title_levels
  where threshold_stars <= v_season_stars;

  if v_highest_earned_level > v_season.highest_title_level then
    insert into public.child_title_unlocks (season_id, title_level, unlocked_by_attempt_id)
    select v_season.id, nivo.level, v_unlock_attempt_id
    from public.child_title_levels nivo
    where nivo.level > v_season.highest_title_level
      and nivo.level <= v_highest_earned_level
    on conflict (season_id, title_level) do nothing;

    update public.child_title_seasons
    set highest_title_level = v_highest_earned_level,
        highest_title_unlocked_at = now()
    where id = v_season.id
    returning * into v_season;
  end if;

  return v_season;
end;
$$;

-- JSON oblik je zajednički ugovor za ulazni i izlazni dečji ekran.
create or replace function public.fn_child_title_progress(
  p_owner_id uuid,
  p_child_name text,
  p_unlocked_by_attempt_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season public.child_title_seasons;
  v_season_stars integer;
  v_current_title text;
  v_next_title text;
  v_next_threshold integer;
begin
  select * into v_season
  from public.fn_refresh_child_title_season(
    p_owner_id,
    p_child_name,
    p_unlocked_by_attempt_id
  );

  v_season_stars := public.fn_child_title_season_stars(v_season.id);

  select title into v_current_title
  from public.child_title_levels
  where level = v_season.highest_title_level;

  select title, threshold_stars into v_next_title, v_next_threshold
  from public.child_title_levels
  where level > v_season.highest_title_level
  order by level
  limit 1;

  return jsonb_build_object(
    'seasonStars', v_season_stars,
    'currentTitle', v_current_title,
    'nextTitle', v_next_title,
    'starsToNextTitle', case
      when v_next_threshold is null then null
      else greatest(v_next_threshold - v_season_stars, 0)
    end
  );
end;
$$;

-- Prva sezona postojećih vlasnika odmah dobija istorijski zarađene titule.
-- Nema vezu sa konkretnim pokušajem, pa se stari rezultat neće predstaviti kao
-- novo otključavanje kada ga dete naknadno ponovo otvori.
do $$
declare
  v_season record;
begin
  for v_season in
    select owner_id, child_name
    from public.child_title_seasons
    where ended_at is null
  loop
    perform public.fn_refresh_child_title_season(v_season.owner_id, v_season.child_name);
  end loop;
end;
$$;

revoke all on function public.fn_ensure_active_child_title_season(uuid, text) from public;
revoke all on function public.fn_child_title_season_stars(uuid) from public;
revoke all on function public.fn_refresh_child_title_season(uuid, text, uuid) from public;
revoke all on function public.fn_child_title_progress(uuid, text, uuid) from public;

-- ---------------------------------------------------------------------------
-- Admin RPC-ovi za pregled i početak nove sezone
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_child_title_statuses()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_child_name text;
  v_season public.child_title_seasons;
  v_progress jsonb;
  v_children jsonb := '[]'::jsonb;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  foreach v_child_name in array array['Andrej'::text, 'Filip'::text]
  loop
    v_progress := public.fn_child_title_progress(v_owner_id, v_child_name);

    select * into v_season
    from public.child_title_seasons
    where owner_id = v_owner_id
      and child_name = v_child_name
      and ended_at is null;

    v_children := v_children || jsonb_build_array(jsonb_build_object(
      'childName', v_child_name,
      'totalStars', public.fn_total_stars(v_owner_id, v_child_name),
      'seasonStartedAt', v_season.started_at,
      'titleProgress', v_progress
    ));
  end loop;

  return jsonb_build_object('ok', true, 'children', v_children);
end;
$$;

create or replace function public.admin_start_new_title_season(p_child_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_old_season public.child_title_seasons;
  v_new_season public.child_title_seasons;
  v_progress jsonb;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_child_name is null or p_child_name not in ('Andrej', 'Filip') then
    return jsonb_build_object('ok', false, 'error', 'invalid_child');
  end if;

  -- Garantuje da reset zatvara i slučajno nedostajuću početnu sezonu.
  select * into v_old_season
  from public.fn_ensure_active_child_title_season(v_owner_id, p_child_name);

  select * into v_old_season
  from public.child_title_seasons
  where id = v_old_season.id
  for update;

  update public.child_title_seasons
  set ended_at = now()
  where id = v_old_season.id;

  insert into public.child_title_seasons (owner_id, child_name, includes_existing_results)
  values (v_owner_id, p_child_name, false)
  returning * into v_new_season;

  v_progress := public.fn_child_title_progress(v_owner_id, p_child_name);

  return jsonb_build_object(
    'ok', true,
    'childName', p_child_name,
    'totalStars', public.fn_total_stars(v_owner_id, p_child_name),
    'seasonStartedAt', v_new_season.started_at,
    'titleProgress', v_progress
  );
end;
$$;

revoke all on function public.admin_get_child_title_statuses() from public;
grant execute on function public.admin_get_child_title_statuses() to authenticated;
revoke all on function public.admin_start_new_title_season(text) from public;
grant execute on function public.admin_start_new_title_season(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Obračun rezultata sada osvežava trajno otključani rang.
-- ---------------------------------------------------------------------------
create or replace function public.fn_recompute_attempt(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_max int;
  v_correct int;
  v_incorrect int;
  v_pct numeric;
  v_quiz public.quizzes;
begin
  select q.* into v_quiz
  from public.attempts a join public.quizzes q on q.id = a.quiz_id
  where a.id = p_attempt_id;

  select
    coalesce(sum(aa.awarded_points), 0),
    coalesce(sum(qq.points), 0),
    count(*) filter (where aa.is_correct),
    count(*) filter (where not aa.is_correct)
  into v_total, v_max, v_correct, v_incorrect
  from public.quiz_questions qq
  left join public.attempt_answers aa on aa.quiz_question_id = qq.id and aa.attempt_id = p_attempt_id
  where qq.quiz_id = v_quiz.id;

  v_pct := case when v_max > 0 then round(100.0 * v_total / v_max, 1) else 0 end;

  update public.attempts set
    total_points = v_total,
    max_points = v_max,
    correct_count = v_correct,
    incorrect_count = v_incorrect,
    score_pct = v_pct,
    passed = v_pct >= v_quiz.pass_threshold_pct,
    review_pending = exists (
      select 1 from public.attempt_answers
      where attempt_id = p_attempt_id and is_correct is null
    )
  where id = p_attempt_id;

  -- Ovo pokriva automatsko i ručno ocenjivanje, kao i preračun posle brisanja
  -- pitanja. Slabiji rezultat ne spušta highest_title_level postojeće sezone.
  if v_quiz.fixed_child_name is not null then
    perform public.fn_refresh_child_title_season(
      v_quiz.owner_id,
      v_quiz.fixed_child_name,
      p_attempt_id
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Dečji RPC payload-i: napredak titula pre početka i posle predaje
-- ---------------------------------------------------------------------------
create or replace function public.get_quiz_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.quiz_links;
  v_quiz public.quizzes;
  v_attempts_count int;
  v_total_stars int;
  v_title_progress jsonb;
begin
  select * into v_link from public.quiz_links where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_quiz from public.quizzes where id = v_link.quiz_id;

  if not v_link.is_active then
    return jsonb_build_object('ok', false, 'error', 'inactive');
  end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select count(*) into v_attempts_count
  from public.attempts
  where quiz_link_id = v_link.id and status = 'submitted';

  if v_attempts_count >= v_link.max_attempts then
    return jsonb_build_object('ok', false, 'error', 'no_attempts_left');
  end if;

  if v_quiz.fixed_child_name is not null then
    v_total_stars := public.fn_total_stars(v_quiz.owner_id, v_quiz.fixed_child_name);
    v_title_progress := public.fn_child_title_progress(
      v_quiz.owner_id,
      v_quiz.fixed_child_name
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'title', v_quiz.title,
    'description', v_quiz.description,
    'questionCount', (select count(*) from public.quiz_questions where quiz_id = v_quiz.id),
    'totalPoints', (select coalesce(sum(points), 0) from public.quiz_questions where quiz_id = v_quiz.id),
    'timeLimitSeconds', v_quiz.time_limit_seconds,
    'requireName', v_quiz.fixed_child_name is null,
    'fixedChildName', v_quiz.fixed_child_name,
    'totalStars', v_total_stars,
    'titleProgress', v_title_progress,
    'requireLabel', v_quiz.require_label,
    'labelName', v_quiz.label_name,
    'attemptsLeft', v_link.max_attempts - v_attempts_count,
    'maxAttempts', v_link.max_attempts
  );
end;
$$;

revoke all on function public.get_quiz_by_token(text) from public;
grant execute on function public.get_quiz_by_token(text) to anon, authenticated;

create or replace function public.fn_build_result(p_attempt_id uuid, p_quiz public.quizzes)
returns jsonb
language plpgsql
volatile
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_questions jsonb;
  v_attempts_left int;
  v_total_stars int;
  v_title_progress jsonb;
  v_newly_unlocked_title text;
begin
  select * into v_attempt from public.attempts where id = p_attempt_id;

  select v_link.max_attempts - count(*) filter (where a2.status = 'submitted')
  into v_attempts_left
  from public.quiz_links v_link
  left join public.attempts a2 on a2.quiz_link_id = v_link.id
  where v_link.id = v_attempt.quiz_link_id
  group by v_link.max_attempts;

  if p_quiz.fixed_child_name is not null then
    v_total_stars := public.fn_total_stars(p_quiz.owner_id, p_quiz.fixed_child_name);
    v_title_progress := public.fn_child_title_progress(
      p_quiz.owner_id,
      p_quiz.fixed_child_name,
      p_attempt_id
    );

    -- Isti pokušaj vraća istu novootključanu titulu i pri idempotentnoj predaji.
    -- Red je jedinstven po nivou, pa ponavljanje nikad ne upisuje novu titulu.
    select nivo.title into v_newly_unlocked_title
    from public.child_title_unlocks otkljucavanje
    join public.child_title_levels nivo on nivo.level = otkljucavanje.title_level
    join public.child_title_seasons sezona on sezona.id = otkljucavanje.season_id
    where otkljucavanje.unlocked_by_attempt_id = p_attempt_id
      and sezona.owner_id = p_quiz.owner_id
      and sezona.child_name = p_quiz.fixed_child_name
      and sezona.ended_at is null
    order by otkljucavanje.title_level desc
    limit 1;
  end if;

  if not p_quiz.show_result then
    return jsonb_build_object(
      'showResult', false,
      'childName', v_attempt.child_name,
      'starsEarned', v_attempt.stars_earned,
      'totalStars', v_total_stars,
      'titleProgress', v_title_progress,
      'newlyUnlockedTitle', v_newly_unlocked_title,
      'attemptsLeft', v_attempts_left,
      'pendingReview', coalesce(v_attempt.review_pending, false)
    );
  end if;

  select jsonb_agg(jsonb_build_object(
    'id', qq.id,
    'type', qq.type,
    'text', qq.text,
    'options', qq.options,
    'points', qq.points,
    'answer', aa.answer,
    'isCorrect', coalesce(aa.is_correct, false),
    'awardedPoints', coalesce(aa.awarded_points, 0),
    'correct', case when p_quiz.show_correct then qq.correct else null end,
    'explanation', case when p_quiz.show_correct then qq.explanation else null end
  ) order by qq.position)
  into v_questions
  from public.quiz_questions qq
  left join public.attempt_answers aa on aa.quiz_question_id = qq.id and aa.attempt_id = p_attempt_id
  where qq.quiz_id = p_quiz.id;

  return jsonb_build_object(
    'showResult', true,
    'showCorrect', p_quiz.show_correct,
    'childName', v_attempt.child_name,
    'starsEarned', v_attempt.stars_earned,
    'totalStars', v_total_stars,
    'titleProgress', v_title_progress,
    'newlyUnlockedTitle', v_newly_unlocked_title,
    'totalPoints', v_attempt.total_points,
    'maxPoints', v_attempt.max_points,
    'scorePct', v_attempt.score_pct,
    'correctCount', v_attempt.correct_count,
    'incorrectCount', v_attempt.incorrect_count,
    'passed', v_attempt.passed,
    'passThresholdPct', p_quiz.pass_threshold_pct,
    'attemptsLeft', v_attempts_left,
    'pendingReview', coalesce(v_attempt.review_pending, false),
    'questions', v_questions
  );
end;
$$;
