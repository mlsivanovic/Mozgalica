-- Mozgalica: RLS pravila
-- Podrazumevano: SVE zabranjeno. Dete nikad ne dodiruje tabele direktno —
-- isključivo kroz SECURITY DEFINER RPC funkcije definisane u kasnijim migracijama.

alter table public.admin_allowlist enable row level security;
alter table public.admin_settings enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_links enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.app_config enable row level security;
alter table public.email_log enable row level security;

-- Ukloni podrazumevana prava PostgREST rola; pristup se vraća samo kroz politike ispod
revoke all on public.admin_allowlist, public.admin_settings, public.topics, public.questions,
  public.quizzes, public.quiz_questions, public.quiz_links, public.attempts,
  public.attempt_answers, public.app_config, public.email_log
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- admin_allowlist, app_config — nedostupni svima osim service role (bez politika = deny)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- admin_settings — admin vidi/menja samo svoj red
-- ---------------------------------------------------------------------------
grant select, update on public.admin_settings to authenticated;

create policy admin_settings_select on public.admin_settings
  for select to authenticated using (user_id = auth.uid());

create policy admin_settings_update on public.admin_settings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- topics — admin ima puni CRUD
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.topics to authenticated;

create policy topics_all on public.topics
  for all to authenticated using (public.fn_is_admin()) with check (public.fn_is_admin());

-- ---------------------------------------------------------------------------
-- questions — admin CRUD nad sopstvenim pitanjima
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.questions to authenticated;

create policy questions_all on public.questions
  for all to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid())
  with check (public.fn_is_admin() and owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- quizzes — admin CRUD nad sopstvenim kvizovima
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.quizzes to authenticated;

create policy quizzes_all on public.quizzes
  for all to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid())
  with check (public.fn_is_admin() and owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- quiz_questions — admin CRUD, ograničeno na kvizove koje poseduje
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.quiz_questions to authenticated;

create policy quiz_questions_all on public.quiz_questions
  for all to authenticated
  using (
    public.fn_is_admin()
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
  )
  with check (
    public.fn_is_admin()
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- quiz_links — admin CRUD, ograničeno na kvizove koje poseduje
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.quiz_links to authenticated;

create policy quiz_links_all on public.quiz_links
  for all to authenticated
  using (
    public.fn_is_admin()
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
  )
  with check (
    public.fn_is_admin()
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- attempts, attempt_answers — admin SAMO čitanje (izmene idu kroz RPC-ove)
-- ---------------------------------------------------------------------------
grant select, delete on public.attempts to authenticated;
grant select on public.attempt_answers to authenticated;

create policy attempts_select on public.attempts
  for select to authenticated
  using (
    public.fn_is_admin()
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
  );

-- Admin sme da obriše pokušaj (pravo na brisanje podataka iz zahteva) — ali ne da ga menja mimo RPC-a
create policy attempts_delete on public.attempts
  for delete to authenticated
  using (
    public.fn_is_admin()
    and exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
  );

create policy attempt_answers_select on public.attempt_answers
  for select to authenticated
  using (
    public.fn_is_admin()
    and exists (
      select 1 from public.attempts a
      join public.quizzes q on q.id = a.quiz_id
      where a.id = attempt_id and q.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- email_log — admin SAMO čitanje (dijagnostika slanja mejlova)
-- ---------------------------------------------------------------------------
grant select on public.email_log to authenticated;

create policy email_log_select on public.email_log
  for select to authenticated
  using (
    public.fn_is_admin()
    and exists (
      select 1 from public.attempts a
      join public.quizzes q on q.id = a.quiz_id
      where a.id = attempt_id and q.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Statistički view-ovi (security_invoker: poštuju RLS baznih tabela)
-- ---------------------------------------------------------------------------

create view public.v_link_status
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
left join public.attempts a on a.quiz_link_id = l.id
group by l.id;

create view public.v_quiz_stats
  with (security_invoker = true) as
select
  q.id as quiz_id,
  q.title,
  count(a.id) filter (where a.status = 'submitted') as attempts_count,
  round(avg(a.score_pct) filter (where a.status = 'submitted'), 1) as avg_pct,
  count(a.id) filter (where a.status = 'submitted' and a.passed) as passed_count
from public.quizzes q
left join public.attempts a on a.quiz_id = q.id
group by q.id;

create view public.v_question_stats
  with (security_invoker = true) as
select
  qq.id as quiz_question_id,
  qq.quiz_id,
  qq.text,
  qq.topic_name,
  count(aa.id) as answers_count,
  count(aa.id) filter (where aa.is_correct = false) as wrong_count
from public.quiz_questions qq
join public.attempt_answers aa on aa.quiz_question_id = qq.id
join public.attempts a on a.id = aa.attempt_id and a.status = 'submitted'
group by qq.id;

create view public.v_topic_stats
  with (security_invoker = true) as
select
  qq.topic_name,
  count(aa.id) as answers_count,
  count(aa.id) filter (where aa.is_correct) as correct_count,
  round(100.0 * count(aa.id) filter (where aa.is_correct) / nullif(count(aa.id), 0), 1) as success_pct
from public.quiz_questions qq
join public.attempt_answers aa on aa.quiz_question_id = qq.id
join public.attempts a on a.id = aa.attempt_id and a.status = 'submitted'
group by qq.topic_name;

grant select on public.v_link_status, public.v_quiz_stats, public.v_question_stats, public.v_topic_stats
  to authenticated;
