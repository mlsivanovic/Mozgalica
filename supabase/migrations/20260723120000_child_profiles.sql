-- Profili dece, zajedničke titule i trajni pokušaji za kvizove dodeljene profilu.
-- Generički linkovi ostaju odvojeni: child_profile_id je NULL i zadržavaju limit pokušaja.

-- ---------------------------------------------------------------------------
-- Profili i titule
-- ---------------------------------------------------------------------------

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  birth_date date check (birth_date is null or birth_date <= current_date),
  avatar text not null default '🧠' check (avatar in ('🧠', '🚀', '🦊', '🦁', '🤖', '⭐')),
  public_token text not null unique default public.fn_generate_token(24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_child_profiles_owner_name
  on public.child_profiles (owner_id, lower(trim(name)));

create trigger trg_child_profiles_touch before update on public.child_profiles
  for each row execute function public.fn_touch_updated_at();

create table public.title_levels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  min_stars int not null check (min_stars >= 0),
  created_at timestamptz not null default now(),
  unique (owner_id, min_stars)
);

alter table public.child_profiles enable row level security;
alter table public.title_levels enable row level security;

revoke all on public.child_profiles, public.title_levels from anon, authenticated;

grant select, insert, update on public.child_profiles to authenticated;
grant select on public.title_levels to authenticated;

create policy child_profiles_select on public.child_profiles
  for select to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid());

create policy child_profiles_insert on public.child_profiles
  for insert to authenticated
  with check (public.fn_is_admin() and owner_id = auth.uid());

create policy child_profiles_update on public.child_profiles
  for update to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid())
  with check (public.fn_is_admin() and owner_id = auth.uid());

create policy title_levels_select on public.title_levels
  for select to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid());

-- Početni profili i titule za postojeće administratore.
insert into public.child_profiles (owner_id, name, avatar)
select s.user_id, d.name, d.avatar
from public.admin_settings s
cross join (values ('Andreja', '🚀'), ('Filip', '🤖')) as d(name, avatar)
on conflict do nothing;

insert into public.title_levels (owner_id, name, min_stars)
select s.user_id, t.name, t.min_stars
from public.admin_settings s
cross join (values
  ('Početnik', 0),
  ('Istraživač', 5),
  ('Znalac', 12),
  ('Majstor', 24),
  ('Šampion', 40)
) as t(name, min_stars)
on conflict do nothing;

-- I svež administratorski nalog dobija iste početne podatke.
create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.admin_allowlist where lower(email) = lower(new.email)) then
    insert into public.admin_settings (user_id) values (new.id)
    on conflict (user_id) do nothing;

    insert into public.child_profiles (owner_id, name, avatar) values
      (new.id, 'Andreja', '🚀'),
      (new.id, 'Filip', '🤖')
    on conflict do nothing;

    insert into public.title_levels (owner_id, name, min_stars) values
      (new.id, 'Početnik', 0),
      (new.id, 'Istraživač', 5),
      (new.id, 'Znalac', 12),
      (new.id, 'Majstor', 24),
      (new.id, 'Šampion', 40)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Veza profila sa dodelama i pokušajima
-- ---------------------------------------------------------------------------

alter table public.quiz_links
  add column child_profile_id uuid references public.child_profiles (id) on delete restrict;

alter table public.attempts
  add column child_profile_id uuid references public.child_profiles (id) on delete restrict,
  add column stars_awarded smallint check (stars_awarded between 0 and 3),
  add column remaining_seconds int check (remaining_seconds is null or remaining_seconds >= 0);

create unique index uq_quiz_links_profile_quiz
  on public.quiz_links (child_profile_id, quiz_id)
  where child_profile_id is not null;

-- Sa starim rezultatima povezujemo samo najnoviji završeni pokušaj za dete i kviz.
-- Ostali pokušaji ostaju generički i ne brišu se.
with kandidati as (
  select
    a.id,
    cp.id as child_profile_id,
    row_number() over (
      partition by cp.id, a.quiz_id
      order by a.submitted_at desc nulls last, a.started_at desc, a.id
    ) as redni_broj
  from public.attempts a
  join public.quizzes q on q.id = a.quiz_id
  join public.child_profiles cp
    on cp.owner_id = q.owner_id
   and lower(trim(cp.name)) = lower(trim(a.child_name))
  where a.status = 'submitted'
)
update public.attempts a
set child_profile_id = k.child_profile_id
from kandidati k
where a.id = k.id and k.redni_broj = 1;

-- Jedan profil ima tačno jedan pokušaj datog kviza, bez obzira na status.
create unique index uq_attempts_profile_quiz
  on public.attempts (child_profile_id, quiz_id)
  where child_profile_id is not null;

create or replace function public.fn_guard_profile_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_quiz_owner uuid;
  v_profile_owner uuid;
begin
  if new.child_profile_id is null then
    return new;
  end if;

  select owner_id into v_quiz_owner from public.quizzes where id = new.quiz_id;
  select owner_id into v_profile_owner from public.child_profiles where id = new.child_profile_id;

  if v_quiz_owner is null or v_profile_owner is null or v_quiz_owner <> v_profile_owner then
    raise exception 'Profil i kviz moraju pripadati istom administratoru.';
  end if;

  new.max_attempts := 1;
  new.label := null;
  return new;
end;
$$;

create trigger trg_quiz_links_profile_guard
  before insert or update of child_profile_id, quiz_id on public.quiz_links
  for each row execute function public.fn_guard_profile_assignment();

create or replace function public.fn_profile_attempt_duration()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_time_limit int;
begin
  if old.child_profile_id is not null
    and old.remaining_seconds is not null
    and old.status = 'in_progress'
    and new.status = 'submitted'
  then
    select time_limit_seconds into v_time_limit
    from public.quizzes where id = old.quiz_id;
    new.duration_sec := greatest(0, coalesce(v_time_limit, 0) - old.remaining_seconds);
  end if;
  return new;
end;
$$;

create trigger trg_profile_attempt_duration
  before update of status on public.attempts
  for each row execute function public.fn_profile_attempt_duration();

create or replace view public.v_link_status
  with (security_invoker = true) as
select
  l.id as link_id,
  l.quiz_id,
  l.token,
  l.label,
  l.is_active,
  l.expires_at,
  l.max_attempts,
  count(a.id) as attempts_count,
  count(a.id) filter (where a.status = 'in_progress') as in_progress_count,
  count(a.id) filter (where a.status = 'submitted') as submitted_count,
  max(a.submitted_at) as last_submitted_at
from public.quiz_links l
left join public.attempts a on
  (l.child_profile_id is null and a.quiz_link_id = l.id)
  or (
    l.child_profile_id is not null
    and a.child_profile_id = l.child_profile_id
    and a.quiz_id = l.quiz_id
  )
group by l.id;

-- ---------------------------------------------------------------------------
-- Pomoćne funkcije za zvezdice i titule
-- ---------------------------------------------------------------------------

create or replace function public.fn_stars_for_score(p_score numeric)
returns smallint
language sql
immutable
as $$
  select case
    when p_score is null then 0
    when p_score >= 90 then 3
    when p_score >= 70 then 2
    when p_score >= 50 then 1
    else 0
  end::smallint
$$;

create or replace function public.fn_answer_is_filled(p_type text, p_answer jsonb)
returns boolean
language sql
immutable
as $$
  select case
    when p_answer is null or p_answer = 'null'::jsonb then false
    when p_type = 'single' then coalesce(trim(p_answer->>'optionId'), '') <> ''
    when p_type = 'multi' then case
      when jsonb_typeof(p_answer->'optionIds') = 'array'
        then jsonb_array_length(p_answer->'optionIds') > 0
      else false
    end
    when p_type = 'numeric' then coalesce(trim(p_answer->>'value'), '') <> ''
    when p_type = 'text' then coalesce(trim(p_answer->>'text'), '') <> ''
    when p_type = 'truefalse' then p_answer ? 'value' and p_answer->'value' <> 'null'::jsonb
    when p_type = 'matching' then
      jsonb_typeof(p_answer->'pairs') = 'object' and p_answer->'pairs' <> '{}'::jsonb
    else false
  end
$$;

update public.attempts
set stars_awarded = case
  when status = 'submitted' and not review_pending then public.fn_stars_for_score(score_pct)
  else null
end;

create or replace function public.save_title_levels(p_levels jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_distinct_count int;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if jsonb_typeof(p_levels) <> 'array' or jsonb_array_length(p_levels) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_levels');
  end if;

  select count(*), count(distinct min_stars)
  into v_count, v_distinct_count
  from jsonb_to_recordset(p_levels) as x(name text, min_stars int);

  if v_count <> v_distinct_count
    or exists (
      select 1
      from jsonb_to_recordset(p_levels) as x(name text, min_stars int)
      where coalesce(length(trim(name)), 0) = 0
         or length(trim(name)) > 60
         or min_stars is null
         or min_stars < 0
    )
    or not exists (
      select 1
      from jsonb_to_recordset(p_levels) as x(name text, min_stars int)
      where min_stars = 0
    )
  then
    return jsonb_build_object('ok', false, 'error', 'invalid_levels');
  end if;

  delete from public.title_levels where owner_id = auth.uid();

  insert into public.title_levels (owner_id, name, min_stars)
  select auth.uid(), trim(name), min_stars
  from jsonb_to_recordset(p_levels) as x(name text, min_stars int)
  order by min_stars;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.save_title_levels(jsonb) from public;
grant execute on function public.save_title_levels(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Meta podaci kviza
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
  v_profile public.child_profiles;
  v_attempt public.attempts;
  v_attempts_count int;
  v_answered_count int;
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

  if v_link.child_profile_id is not null then
    select * into v_profile from public.child_profiles where id = v_link.child_profile_id;
    select * into v_attempt
    from public.attempts
    where child_profile_id = v_link.child_profile_id and quiz_id = v_link.quiz_id;

    if found and v_attempt.status = 'submitted' then
      return jsonb_build_object(
        'ok', false,
        'error', 'already_completed',
        'accessMode', 'profile',
        'profileToken', v_profile.public_token
      );
    end if;

    if v_attempt.id is not null then
      select count(*) into v_answered_count
      from public.attempt_answers aa
      join public.quiz_questions qq on qq.id = aa.quiz_question_id
      where aa.attempt_id = v_attempt.id
        and public.fn_answer_is_filled(qq.type, aa.answer);
    else
      v_answered_count := 0;
    end if;

    return jsonb_build_object(
      'ok', true,
      'accessMode', 'profile',
      'profileToken', v_profile.public_token,
      'childName', v_profile.name,
      'childAvatar', v_profile.avatar,
      'attemptState', case when v_attempt.id is null then 'new' else 'in_progress' end,
      'answeredCount', v_answered_count,
      'title', v_quiz.title,
      'description', v_quiz.description,
      'questionCount', (select count(*) from public.quiz_questions where quiz_id = v_quiz.id),
      'totalPoints', (select coalesce(sum(points), 0) from public.quiz_questions where quiz_id = v_quiz.id),
      'timeLimitSeconds', v_quiz.time_limit_seconds,
      'remainingSeconds', v_attempt.remaining_seconds,
      'requireName', false,
      'requireLabel', false,
      'attemptsLeft', 1,
      'maxAttempts', 1
    );
  end if;

  select count(*) into v_attempts_count
  from public.attempts
  where quiz_link_id = v_link.id and status = 'submitted';

  if v_attempts_count >= v_link.max_attempts then
    return jsonb_build_object('ok', false, 'error', 'no_attempts_left');
  end if;

  return jsonb_build_object(
    'ok', true,
    'accessMode', 'generic',
    'attemptState', 'new',
    'title', v_quiz.title,
    'description', v_quiz.description,
    'questionCount', (select count(*) from public.quiz_questions where quiz_id = v_quiz.id),
    'totalPoints', (select coalesce(sum(points), 0) from public.quiz_questions where quiz_id = v_quiz.id),
    'timeLimitSeconds', v_quiz.time_limit_seconds,
    'requireName', v_quiz.require_name,
    'requireLabel', v_quiz.require_label,
    'labelName', v_quiz.label_name,
    'attemptsLeft', v_link.max_attempts - v_attempts_count,
    'maxAttempts', v_link.max_attempts
  );
end;
$$;

revoke all on function public.get_quiz_by_token(text) from public;
grant execute on function public.get_quiz_by_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Pokretanje i nastavak pokušaja
-- ---------------------------------------------------------------------------

create or replace function public.start_attempt(
  p_token text,
  p_child_name text,
  p_child_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.quiz_links;
  v_quiz public.quizzes;
  v_profile public.child_profiles;
  v_attempts_count int;
  v_next_no int;
  v_layout jsonb;
  v_attempt public.attempts;
  v_deadline timestamptz;
  v_saved jsonb;
  v_profile_token text;
begin
  select * into v_link from public.quiz_links where token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if not v_link.is_active then
    return jsonb_build_object('ok', false, 'error', 'inactive');
  end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select * into v_quiz from public.quizzes where id = v_link.quiz_id;

  if v_link.child_profile_id is not null then
    select * into v_profile from public.child_profiles where id = v_link.child_profile_id;
    v_profile_token := v_profile.public_token;
    select * into v_attempt
    from public.attempts
    where child_profile_id = v_link.child_profile_id and quiz_id = v_link.quiz_id;

    if found then
      if v_attempt.status = 'submitted' then
        return jsonb_build_object('ok', false, 'error', 'already_completed');
      end if;
      if v_attempt.status <> 'in_progress' then
        return jsonb_build_object('ok', false, 'error', 'not_in_progress');
      end if;

      select coalesce(jsonb_object_agg(quiz_question_id, answer), '{}'::jsonb)
      into v_saved
      from public.attempt_answers
      where attempt_id = v_attempt.id;

      return jsonb_build_object(
        'ok', true,
        'resumed', true,
        'accessMode', 'profile',
        'profileToken', v_profile_token,
        'attemptToken', v_attempt.attempt_token,
        'attemptId', v_attempt.id,
        'attemptNo', v_attempt.attempt_no,
        'childName', v_profile.name,
        'deadlineAt', null,
        'remainingSeconds', v_attempt.remaining_seconds,
        'serverNow', now(),
        'questions', public.fn_questions_for_layout(v_attempt.layout, v_attempt.hints_unlocked),
        'savedAnswers', v_saved,
        'hintsUsed', v_attempt.hints_used,
        'hintsUnlocked', v_attempt.hints_unlocked
      );
    end if;
  elsif v_quiz.require_name and coalesce(trim(p_child_name), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;

  if v_link.child_profile_id is null then
    update public.attempts
    set status = 'expired'
    where quiz_link_id = v_link.id
      and status = 'in_progress'
      and (
        (deadline_at is not null and deadline_at < now() - interval '1 hour')
        or (deadline_at is null and started_at < now() - interval '24 hours')
      );

    select count(*) into v_attempts_count
    from public.attempts
    where quiz_link_id = v_link.id and status = 'submitted';

    if v_attempts_count >= v_link.max_attempts then
      return jsonb_build_object('ok', false, 'error', 'no_attempts_left');
    end if;

    select count(*) into v_attempts_count
    from public.attempts where quiz_link_id = v_link.id;
    if v_attempts_count >= public.fn_link_sanity_cap() then
      return jsonb_build_object('ok', false, 'error', 'too_many_tries');
    end if;
  end if;

  select coalesce(max(attempt_no), 0) + 1 into v_next_no
  from public.attempts where quiz_link_id = v_link.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'qq', qq.id,
    'opts', case
      when qq.type in ('single', 'multi') and v_quiz.shuffle_answers then (
        select jsonb_agg(o->>'id' order by random())
        from jsonb_array_elements(qq.options) o
      )
      when qq.type in ('single', 'multi') then (
        select jsonb_agg(o->>'id' order by ord)
        from jsonb_array_elements(qq.options) with ordinality as t(o, ord)
      )
      else null
    end
  ) order by case when v_quiz.shuffle_questions then random() else qq.position end),
  '[]'::jsonb)
  into v_layout
  from public.quiz_questions qq
  where qq.quiz_id = v_quiz.id;

  if v_layout = '[]'::jsonb then
    return jsonb_build_object('ok', false, 'error', 'no_questions');
  end if;

  v_deadline := case
    when v_link.child_profile_id is null and v_quiz.time_limit_seconds is not null
      then now() + (v_quiz.time_limit_seconds || ' seconds')::interval
    else null
  end;

  insert into public.attempts (
    quiz_link_id, quiz_id, child_profile_id, attempt_no, child_name, child_label,
    layout, deadline_at, remaining_seconds
  ) values (
    v_link.id,
    v_quiz.id,
    v_link.child_profile_id,
    v_next_no,
    case when v_link.child_profile_id is not null then v_profile.name else nullif(trim(p_child_name), '') end,
    case when v_link.child_profile_id is not null then null else nullif(trim(p_child_label), '') end,
    v_layout,
    v_deadline,
    case when v_link.child_profile_id is not null then v_quiz.time_limit_seconds else null end
  )
  returning * into v_attempt;

  return jsonb_build_object(
    'ok', true,
    'resumed', false,
    'accessMode', case when v_link.child_profile_id is null then 'generic' else 'profile' end,
    'profileToken', v_profile_token,
    'attemptToken', v_attempt.attempt_token,
    'attemptId', v_attempt.id,
    'attemptNo', v_attempt.attempt_no,
    'childName', v_attempt.child_name,
    'deadlineAt', v_attempt.deadline_at,
    'remainingSeconds', v_attempt.remaining_seconds,
    'serverNow', now(),
    'questions', public.fn_questions_for_layout(v_layout, '[]'::jsonb),
    'savedAnswers', '{}'::jsonb,
    'hintsUsed', 0,
    'hintsUnlocked', '[]'::jsonb
  );
end;
$$;

revoke all on function public.start_attempt(text, text, text) from public;
grant execute on function public.start_attempt(text, text, text) to anon, authenticated;

create or replace function public.resume_attempt(p_attempt_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_profile public.child_profiles;
  v_saved jsonb;
  v_profile_token text;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'not_in_progress');
  end if;

  if v_attempt.child_profile_id is not null then
    select * into v_profile from public.child_profiles where id = v_attempt.child_profile_id;
    v_profile_token := v_profile.public_token;
  end if;

  select coalesce(jsonb_object_agg(quiz_question_id, answer), '{}'::jsonb)
  into v_saved
  from public.attempt_answers
  where attempt_id = v_attempt.id;

  return jsonb_build_object(
    'ok', true,
    'accessMode', case when v_attempt.child_profile_id is null then 'generic' else 'profile' end,
    'profileToken', v_profile_token,
    'attemptToken', v_attempt.attempt_token,
    'attemptId', v_attempt.id,
    'attemptNo', v_attempt.attempt_no,
    'childName', case
      when v_attempt.child_profile_id is not null then v_profile.name
      else v_attempt.child_name
    end,
    'deadlineAt', v_attempt.deadline_at,
    'remainingSeconds', v_attempt.remaining_seconds,
    'serverNow', now(),
    'questions', public.fn_questions_for_layout(v_attempt.layout, v_attempt.hints_unlocked),
    'savedAnswers', v_saved,
    'hintsUsed', v_attempt.hints_used,
    'hintsUnlocked', v_attempt.hints_unlocked
  );
end;
$$;

revoke all on function public.resume_attempt(text) from public;
grant execute on function public.resume_attempt(text) to anon, authenticated;

create or replace function public.checkpoint_attempt_timer(
  p_attempt_token text,
  p_remaining_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_remaining int;
begin
  select * into v_attempt
  from public.attempts
  where attempt_token = p_attempt_token
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'not_in_progress');
  end if;
  if v_attempt.child_profile_id is null or v_attempt.remaining_seconds is null then
    return jsonb_build_object('ok', false, 'error', 'not_profile_timer');
  end if;

  v_remaining := greatest(0, least(v_attempt.remaining_seconds, coalesce(p_remaining_seconds, 0)));
  update public.attempts
  set remaining_seconds = v_remaining
  where id = v_attempt.id;

  return jsonb_build_object('ok', true, 'remainingSeconds', v_remaining, 'serverNow', now());
end;
$$;

revoke all on function public.checkpoint_attempt_timer(text, int) from public;
grant execute on function public.checkpoint_attempt_timer(text, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ocenjivanje i rezultat
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
  v_pending boolean;
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
  left join public.attempt_answers aa
    on aa.quiz_question_id = qq.id and aa.attempt_id = p_attempt_id
  where qq.quiz_id = v_quiz.id;

  v_pct := case when v_max > 0 then round(100.0 * v_total / v_max, 1) else 0 end;
  v_pending := exists (
    select 1 from public.attempt_answers
    where attempt_id = p_attempt_id and is_correct is null
  );

  update public.attempts set
    total_points = v_total,
    max_points = v_max,
    correct_count = v_correct,
    incorrect_count = v_incorrect,
    score_pct = v_pct,
    passed = v_pct >= v_quiz.pass_threshold_pct,
    review_pending = v_pending,
    stars_awarded = case when v_pending then null else public.fn_stars_for_score(v_pct) end
  where id = p_attempt_id;
end;
$$;

create or replace function public.fn_build_result(p_attempt_id uuid, p_quiz public.quizzes)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_questions jsonb;
  v_attempts_left int;
  v_profile_token text;
begin
  select * into v_attempt from public.attempts where id = p_attempt_id;

  if v_attempt.child_profile_id is not null then
    select public_token into v_profile_token
    from public.child_profiles where id = v_attempt.child_profile_id;
    v_attempts_left := 0;
  else
    select v_link.max_attempts - count(*) filter (where a2.status = 'submitted')
    into v_attempts_left
    from public.quiz_links v_link
    left join public.attempts a2 on a2.quiz_link_id = v_link.id
    where v_link.id = v_attempt.quiz_link_id
    group by v_link.max_attempts;
  end if;

  if not p_quiz.show_result then
    return jsonb_build_object(
      'showResult', false,
      'accessMode', case when v_attempt.child_profile_id is null then 'generic' else 'profile' end,
      'profileToken', v_profile_token,
      'starsAwarded', v_attempt.stars_awarded,
      'attemptsLeft', v_attempts_left
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
  left join public.attempt_answers aa
    on aa.quiz_question_id = qq.id and aa.attempt_id = p_attempt_id
  where qq.quiz_id = p_quiz.id;

  return jsonb_build_object(
    'showResult', true,
    'showCorrect', p_quiz.show_correct,
    'accessMode', case when v_attempt.child_profile_id is null then 'generic' else 'profile' end,
    'profileToken', v_profile_token,
    'totalPoints', v_attempt.total_points,
    'maxPoints', v_attempt.max_points,
    'scorePct', v_attempt.score_pct,
    'correctCount', v_attempt.correct_count,
    'incorrectCount', v_attempt.incorrect_count,
    'passed', v_attempt.passed,
    'passThresholdPct', p_quiz.pass_threshold_pct,
    'attemptsLeft', v_attempts_left,
    'pendingReview', coalesce(v_attempt.review_pending, false),
    'starsAwarded', v_attempt.stars_awarded,
    'questions', v_questions
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Javni profil deteta
-- ---------------------------------------------------------------------------

create or replace function public.get_child_profile(p_profile_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
  v_total_stars int;
  v_current_title jsonb;
  v_next_title jsonb;
  v_active_quizzes jsonb;
  v_history jsonb;
begin
  select * into v_profile
  from public.child_profiles
  where public_token = p_profile_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select coalesce(sum(stars_awarded), 0)::int
  into v_total_stars
  from public.attempts
  where child_profile_id = v_profile.id
    and status = 'submitted'
    and not review_pending;

  select jsonb_build_object('name', tl.name, 'minStars', tl.min_stars)
  into v_current_title
  from public.title_levels tl
  where tl.owner_id = v_profile.owner_id and tl.min_stars <= v_total_stars
  order by tl.min_stars desc
  limit 1;

  select jsonb_build_object(
    'name', tl.name,
    'minStars', tl.min_stars,
    'starsNeeded', tl.min_stars - v_total_stars
  )
  into v_next_title
  from public.title_levels tl
  where tl.owner_id = v_profile.owner_id and tl.min_stars > v_total_stars
  order by tl.min_stars
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'quizToken', l.token,
    'title', q.title,
    'description', q.description,
    'questionCount', (select count(*) from public.quiz_questions qq where qq.quiz_id = q.id),
    'attemptState', case when a.id is null then 'new' else 'in_progress' end,
    'answeredCount', coalesce((
      select count(*)
      from public.attempt_answers aa
      join public.quiz_questions qq on qq.id = aa.quiz_question_id
      where aa.attempt_id = a.id
        and public.fn_answer_is_filled(qq.type, aa.answer)
    ), 0),
    'timeLimitSeconds', q.time_limit_seconds,
    'remainingSeconds', a.remaining_seconds
  ) order by l.created_at desc), '[]'::jsonb)
  into v_active_quizzes
  from public.quiz_links l
  join public.quizzes q on q.id = l.quiz_id
  left join public.attempts a
    on a.child_profile_id = v_profile.id and a.quiz_id = q.id
  where l.child_profile_id = v_profile.id
    and l.is_active
    and (l.expires_at is null or l.expires_at >= now())
    and (a.id is null or a.status = 'in_progress');

  select coalesce(jsonb_agg(jsonb_build_object(
    'attemptId', a.id,
    'title', q.title,
    'submittedAt', a.submitted_at,
    'scorePct', a.score_pct,
    'starsAwarded', a.stars_awarded,
    'pendingReview', a.review_pending
  ) order by a.submitted_at desc), '[]'::jsonb)
  into v_history
  from public.attempts a
  join public.quizzes q on q.id = a.quiz_id
  where a.child_profile_id = v_profile.id and a.status = 'submitted';

  return jsonb_build_object(
    'ok', true,
    'name', v_profile.name,
    'avatar', v_profile.avatar,
    'totalStars', v_total_stars,
    'currentTitle', v_current_title,
    'nextTitle', v_next_title,
    'activeQuizzes', v_active_quizzes,
    'history', v_history
  );
end;
$$;

revoke all on function public.get_child_profile(text) from public;
grant execute on function public.get_child_profile(text) to anon, authenticated;
