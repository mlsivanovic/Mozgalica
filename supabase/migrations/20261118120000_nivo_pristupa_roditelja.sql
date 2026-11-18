-- Nivo pristupa za pozvane roditelje: vlasnik platforme bira kojim razredima
-- (2, 3, 4, 5) i kojim predmetima ('matematika', 'srpski', 'priroda_drustvo')
-- roditelj ima pristup. Vlasnik platforme uvek ima pun pristup.

alter table public.admin_allowlist
  add column if not exists allowed_grades smallint[] not null default array[2, 3, 4, 5]::smallint[],
  add column if not exists allowed_subjects text[] not null default array['matematika', 'srpski', 'priroda_drustvo']::text[];

alter table public.admin_allowlist
  drop constraint if exists admin_allowlist_allowed_grades_check,
  add constraint admin_allowlist_allowed_grades_check
    check (cardinality(allowed_grades) > 0 and allowed_grades <@ array[2, 3, 4, 5]::smallint[]),
  drop constraint if exists admin_allowlist_allowed_subjects_check,
  add constraint admin_allowlist_allowed_subjects_check
    check (cardinality(allowed_subjects) > 0 and allowed_subjects <@ array['matematika', 'srpski', 'priroda_drustvo']::text[]);

alter table public.admin_settings
  add column if not exists allowed_grades smallint[] not null default array[2, 3, 4, 5]::smallint[],
  add column if not exists allowed_subjects text[] not null default array['matematika', 'srpski', 'priroda_drustvo']::text[];

alter table public.admin_settings
  drop constraint if exists admin_settings_allowed_grades_check,
  add constraint admin_settings_allowed_grades_check
    check (cardinality(allowed_grades) > 0 and allowed_grades <@ array[2, 3, 4, 5]::smallint[]),
  drop constraint if exists admin_settings_allowed_subjects_check,
  add constraint admin_settings_allowed_subjects_check
    check (cardinality(allowed_subjects) > 0 and allowed_subjects <@ array['matematika', 'srpski', 'priroda_drustvo']::text[]);

-- Provera da li skup razreda i predmeta ima bar jednu važeću kombinaciju u programu.
create or replace function public.fn_pristup_je_ispravan(
  p_grades smallint[],
  p_subjects text[]
)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    coalesce(cardinality(p_grades), 0) > 0
    and coalesce(cardinality(p_subjects), 0) > 0
    and p_grades <@ array[2, 3, 4, 5]::smallint[]
    and p_subjects <@ array['matematika', 'srpski', 'priroda_drustvo']::text[]
    and exists (
      select 1
      from public.topics t
      where t.subject = any(p_subjects)
        and t.grade = any(p_grades)
    )
$$;

revoke all on function public.fn_pristup_je_ispravan(smallint[], text[]) from public, anon, authenticated;
grant execute on function public.fn_pristup_je_ispravan(smallint[], text[]) to service_role;

-- Da li trenutni administrator sme da koristi dati predmet i razred.
create or replace function public.fn_admin_ima_pristup(
  p_subject text,
  p_grade smallint
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_settings s
    where s.user_id = auth.uid()
      and (
        s.is_platform_owner
        or (
          p_subject = any(s.allowed_subjects)
          and p_grade = any(s.allowed_grades)
        )
      )
  )
$$;

revoke all on function public.fn_admin_ima_pristup(text, smallint) from public, anon;
grant execute on function public.fn_admin_ima_pristup(text, smallint) to authenticated, service_role;

-- Da li trenutni administrator sme da koristi dati razred (za kvizove bez predmeta).
create or replace function public.fn_admin_ima_pristup_razredu(p_grade smallint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_settings s
    where s.user_id = auth.uid()
      and (
        s.is_platform_owner
        or p_grade = any(s.allowed_grades)
      )
  )
$$;

revoke all on function public.fn_admin_ima_pristup_razredu(smallint) from public, anon;
grant execute on function public.fn_admin_ima_pristup_razredu(smallint) to authenticated, service_role;

-- Novi korisnik nasleđuje dozvoljene razrede i predmete sa admin_allowlist.
create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allow public.admin_allowlist;
begin
  select * into v_allow
  from public.admin_allowlist
  where lower(email) = lower(new.email)
  limit 1;

  if found then
    insert into public.admin_settings (user_id, allowed_grades, allowed_subjects)
    values (new.id, v_allow.allowed_grades, v_allow.allowed_subjects)
    on conflict (user_id) do nothing;

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

-- Aktivacija postojećeg naloga uz upis izabranog nivoa pristupa (ne menja vlasnika).
drop function if exists public.fn_aktiviraj_roditelja(uuid);

create or replace function public.fn_aktiviraj_roditelja(
  p_user_id uuid,
  p_grades smallint[] default array[2, 3, 4, 5]::smallint[],
  p_subjects text[] default array['matematika', 'srpski', 'priroda_drustvo']::text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grades smallint[];
  v_subjects text[];
begin
  select coalesce(array_agg(distinct g order by g), array[]::smallint[])
  into v_grades
  from unnest(coalesce(p_grades, array[2, 3, 4, 5]::smallint[])) as g;

  select coalesce(array_agg(distinct s order by s), array[]::text[])
  into v_subjects
  from unnest(coalesce(p_subjects, array['matematika', 'srpski', 'priroda_drustvo']::text[])) as s;

  if not public.fn_pristup_je_ispravan(v_grades, v_subjects) then
    raise exception 'Izabrani nivo pristupa nije ispravan.';
  end if;

  insert into public.admin_settings (user_id, allowed_grades, allowed_subjects)
  values (p_user_id, v_grades, v_subjects)
  on conflict (user_id) do update
    set allowed_grades = excluded.allowed_grades,
        allowed_subjects = excluded.allowed_subjects
    where not public.admin_settings.is_platform_owner;

  update public.daily_quiz_schedules
  set is_active = false
  where owner_id = p_user_id
    and deleted_at is null
    and is_active
    and not (subject = any(v_subjects) and grade = any(v_grades))
    and exists (
      select 1 from public.admin_settings s
      where s.user_id = p_user_id and not s.is_platform_owner
    );

  insert into public.title_levels (owner_id, name, min_stars) values
    (p_user_id, 'Početnik', 0),
    (p_user_id, 'Istraživač', 5),
    (p_user_id, 'Znalac', 12),
    (p_user_id, 'Majstor', 24),
    (p_user_id, 'Šampion', 40)
  on conflict do nothing;
end;
$$;

revoke all on function public.fn_aktiviraj_roditelja(uuid, smallint[], text[]) from public, anon, authenticated;
grant execute on function public.fn_aktiviraj_roditelja(uuid, smallint[], text[]) to service_role;

-- Spisak pozvanih roditelja uključuje i nivo pristupa.
drop function if exists public.listaj_pozvane_roditelje();

create function public.listaj_pozvane_roditelje()
returns table (
  email text,
  nalog_postoji boolean,
  aktivan boolean,
  je_vlasnik boolean,
  allowed_grades smallint[],
  allowed_subjects text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.fn_is_platform_owner() then
    raise exception 'Samo vlasnik platforme može da vidi spisak roditelja.';
  end if;

  return query
  select
    a.email::text,
    (u.id is not null) as nalog_postoji,
    (u.last_sign_in_at is not null) as aktivan,
    coalesce(s.is_platform_owner, false) as je_vlasnik,
    coalesce(s.allowed_grades, a.allowed_grades) as allowed_grades,
    coalesce(s.allowed_subjects, a.allowed_subjects) as allowed_subjects
  from public.admin_allowlist a
  left join auth.users u on lower(u.email) = lower(a.email)
  left join public.admin_settings s on s.user_id = u.id
  order by a.email;
end;
$$;

revoke all on function public.listaj_pozvane_roditelje() from public, anon;
grant execute on function public.listaj_pozvane_roditelje() to authenticated;

-- Izmena nivoa pristupa postojećeg ili pozvanog roditelja (samo vlasnik platforme).
create or replace function public.azuriraj_pristup_roditelja(
  p_email text,
  p_grades smallint[],
  p_subjects text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_grades smallint[];
  v_subjects text[];
  v_user_id uuid;
  v_je_vlasnik boolean;
begin
  if not public.fn_is_platform_owner() then
    raise exception 'Samo vlasnik platforme može da menja nivo pristupa.';
  end if;

  if v_email = '' then
    raise exception 'Email adresa je obavezna.';
  end if;

  select coalesce(array_agg(distinct g order by g), array[]::smallint[])
  into v_grades
  from unnest(coalesce(p_grades, array[]::smallint[])) as g;

  select coalesce(array_agg(distinct s order by s), array[]::text[])
  into v_subjects
  from unnest(coalesce(p_subjects, array[]::text[])) as s;

  if not public.fn_pristup_je_ispravan(v_grades, v_subjects) then
    raise exception 'Izaberi bar jedan razred i najmanje jedan važeći predmet za taj razred.';
  end if;

  select u.id, coalesce(s.is_platform_owner, false)
  into v_user_id, v_je_vlasnik
  from auth.users u
  left join public.admin_settings s on s.user_id = u.id
  where lower(u.email) = v_email
  limit 1;

  if coalesce(v_je_vlasnik, false) then
    raise exception 'Pristup vlasnika platforme se ne može ograničiti.';
  end if;

  update public.admin_allowlist
  set allowed_grades = v_grades,
      allowed_subjects = v_subjects
  where lower(email) = v_email;

  if not found then
    raise exception 'Roditelj nije na listi pozvanih.';
  end if;

  if v_user_id is not null then
    update public.admin_settings
    set allowed_grades = v_grades,
        allowed_subjects = v_subjects
    where user_id = v_user_id
      and not is_platform_owner;

    -- Aktivni dnevni rasporedi za predmete/razrede van novog pristupa se pauziraju.
    update public.daily_quiz_schedules
    set is_active = false
    where owner_id = v_user_id
      and deleted_at is null
      and is_active
      and not (subject = any(v_subjects) and grade = any(v_grades));
  end if;
end;
$$;

revoke all on function public.azuriraj_pristup_roditelja(text, smallint[], text[]) from public, anon;
grant execute on function public.azuriraj_pristup_roditelja(text, smallint[], text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS politike usklađene sa dozvoljenim razredima i predmetima
-- ---------------------------------------------------------------------------

drop policy if exists topics_select on public.topics;
create policy topics_select on public.topics
  for select to authenticated
  using (
    public.fn_is_admin()
    and public.fn_admin_ima_pristup(subject, grade)
  );

drop policy if exists questions_select on public.questions;
create policy questions_select on public.questions
  for select to authenticated
  using (
    public.fn_is_admin()
    and (owner_id = auth.uid() or is_shared)
    and exists (
      select 1
      from public.topics t
      where t.id = topic_id
        and public.fn_admin_ima_pristup(t.subject, t.grade)
    )
  );

drop policy if exists questions_insert on public.questions;
create policy questions_insert on public.questions
  for insert to authenticated
  with check (
    public.fn_is_admin()
    and owner_id = auth.uid()
    and (not is_shared or public.fn_is_platform_owner())
    and exists (
      select 1
      from public.topics t
      where t.id = topic_id
        and public.fn_admin_ima_pristup(t.subject, t.grade)
    )
  );

drop policy if exists questions_update on public.questions;
create policy questions_update on public.questions
  for update to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid())
  with check (
    public.fn_is_admin()
    and owner_id = auth.uid()
    and (not is_shared or public.fn_is_platform_owner())
    and exists (
      select 1
      from public.topics t
      where t.id = topic_id
        and public.fn_admin_ima_pristup(t.subject, t.grade)
    )
  );

drop policy if exists quizzes_all on public.quizzes;
drop policy if exists quizzes_select on public.quizzes;
drop policy if exists quizzes_insert on public.quizzes;
drop policy if exists quizzes_update on public.quizzes;
drop policy if exists quizzes_delete on public.quizzes;

create policy quizzes_select on public.quizzes
  for select to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid());

create policy quizzes_insert on public.quizzes
  for insert to authenticated
  with check (
    public.fn_is_admin()
    and owner_id = auth.uid()
    and (grade is null or public.fn_admin_ima_pristup_razredu(grade))
  );

create policy quizzes_update on public.quizzes
  for update to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid())
  with check (
    public.fn_is_admin()
    and owner_id = auth.uid()
    and (grade is null or public.fn_admin_ima_pristup_razredu(grade))
  );

create policy quizzes_delete on public.quizzes
  for delete to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid());

drop policy if exists quiz_questions_all on public.quiz_questions;
drop policy if exists quiz_questions_select on public.quiz_questions;
drop policy if exists quiz_questions_insert on public.quiz_questions;
drop policy if exists quiz_questions_update on public.quiz_questions;
drop policy if exists quiz_questions_delete on public.quiz_questions;

create policy quiz_questions_select on public.quiz_questions
  for select to authenticated
  using (
    public.fn_is_admin()
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
  );

create policy quiz_questions_insert on public.quiz_questions
  for insert to authenticated
  with check (
    public.fn_is_admin()
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
    and (
      topic_id is null
      or exists (
        select 1
        from public.topics t
        where t.id = topic_id
          and public.fn_admin_ima_pristup(t.subject, t.grade)
      )
    )
  );

create policy quiz_questions_update on public.quiz_questions
  for update to authenticated
  using (
    public.fn_is_admin()
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
  )
  with check (
    public.fn_is_admin()
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
    and (
      topic_id is null
      or exists (
        select 1
        from public.topics t
        where t.id = topic_id
          and public.fn_admin_ima_pristup(t.subject, t.grade)
      )
    )
  );

create policy quiz_questions_delete on public.quiz_questions
  for delete to authenticated
  using (
    public.fn_is_admin()
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
  );

-- Dnevni rasporedi kvizova takođe proveravaju dozvoljeni predmet i razred.
create or replace function public.save_daily_quiz_schedule(
  p_schedule_id uuid,
  p_child_profile_id uuid,
  p_subject text,
  p_grade smallint,
  p_source text,
  p_topic_ids uuid[],
  p_difficulty smallint,
  p_question_type text,
  p_question_count int,
  p_time_limit_seconds int,
  p_shuffle_questions boolean,
  p_shuffle_answers boolean,
  p_pass_threshold_pct int,
  p_daily_time time,
  p_smart_mode boolean default false,
  p_weekly_report_enabled boolean default false
)
returns public.daily_quiz_schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.daily_quiz_schedules;
  v_next_run_on date;
  v_local_now timestamp := now() at time zone 'Europe/Belgrade';
  v_weekly_enabled boolean := coalesce(p_smart_mode, false) and coalesce(p_weekly_report_enabled, false);
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;

  if p_source not in ('generator', 'bank', 'combined')
    or p_subject not in ('matematika', 'srpski', 'priroda_drustvo')
    or (p_subject = 'matematika' and p_grade not in (2, 3, 4, 5))
    or (p_subject = 'srpski' and p_grade not in (2, 3, 4, 5))
    or (p_subject = 'priroda_drustvo' and p_grade not in (3, 4))
  then
    raise exception 'Neispravna podešavanja izvora pitanja.';
  end if;

  if not public.fn_admin_ima_pristup(p_subject, p_grade) then
    raise exception 'Nemaš pristup izabranom predmetu ili razredu.';
  end if;

  if coalesce(cardinality(p_topic_ids), 0) = 0 then
    raise exception 'Izaberi najmanje jednu oblast.';
  end if;

  if exists (
    select 1
    from unnest(p_topic_ids) as izabrana(topic_id)
    left join public.topics t on t.id = izabrana.topic_id
    where t.id is null or t.subject <> p_subject or t.grade <> p_grade
  ) then
    raise exception 'Sve oblasti moraju pripadati izabranom predmetu i razredu.';
  end if;

  if not exists (
    select 1 from public.child_profiles
    where id = p_child_profile_id and owner_id = auth.uid()
  ) then
    raise exception 'Profil deteta nije pronađen.';
  end if;

  if p_schedule_id is null then
    v_next_run_on := v_local_now::date
      + case when p_daily_time <= v_local_now::time then 1 else 0 end;

    insert into public.daily_quiz_schedules (
      owner_id, child_profile_id, subject, grade, source, difficulty, question_type,
      question_count, time_limit_seconds, shuffle_questions, shuffle_answers,
      pass_threshold_pct, daily_time, next_run_on, smart_mode,
      weekly_report_enabled, weekly_report_enabled_at
    ) values (
      auth.uid(), p_child_profile_id, p_subject, p_grade, p_source,
      case when p_subject in ('srpski', 'priroda_drustvo') then 5 else p_difficulty end,
      nullif(p_question_type, 'auto'), p_question_count, p_time_limit_seconds,
      p_shuffle_questions, p_shuffle_answers, p_pass_threshold_pct, p_daily_time,
      v_next_run_on, coalesce(p_smart_mode, false), v_weekly_enabled,
      case when v_weekly_enabled then now() else null end
    ) returning * into v_schedule;
  else
    select * into v_schedule
    from public.daily_quiz_schedules
    where id = p_schedule_id and owner_id = auth.uid() and deleted_at is null
    for update;

    if v_schedule.id is null then
      raise exception 'Raspored nije pronađen.';
    end if;

    update public.daily_quiz_schedules
    set child_profile_id = p_child_profile_id,
        subject = p_subject,
        grade = p_grade,
        source = p_source,
        difficulty = case when p_subject in ('srpski', 'priroda_drustvo') then 5 else p_difficulty end,
        question_type = nullif(p_question_type, 'auto'),
        question_count = p_question_count,
        time_limit_seconds = p_time_limit_seconds,
        shuffle_questions = p_shuffle_questions,
        shuffle_answers = p_shuffle_answers,
        pass_threshold_pct = p_pass_threshold_pct,
        daily_time = p_daily_time,
        smart_mode = coalesce(p_smart_mode, false),
        weekly_report_enabled = v_weekly_enabled,
        weekly_report_enabled_at = case
          when v_weekly_enabled and not v_schedule.weekly_report_enabled then now()
          when v_weekly_enabled then v_schedule.weekly_report_enabled_at
          else null
        end
    where id = v_schedule.id
    returning * into v_schedule;

    delete from public.daily_quiz_schedule_topics where schedule_id = v_schedule.id;
  end if;

  insert into public.daily_quiz_schedule_topics (schedule_id, topic_id)
  select v_schedule.id, izabrana.topic_id
  from unnest(p_topic_ids) as izabrana(topic_id);

  return v_schedule;
end;
$$;
