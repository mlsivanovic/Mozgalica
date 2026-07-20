-- Mozgalica: osnovna šema
-- Ekstenzije: pgcrypto za tokene, pg_net (kasnije) za slanje mejlova
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Pomoćne funkcije
-- ---------------------------------------------------------------------------

-- Teško pogodiv token: n nasumičnih bajtova → base64url (bez +, /, =)
create or replace function public.fn_generate_token(n int default 24)
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select translate(encode(extensions.gen_random_bytes(n), 'base64'), '+/=', '-_')
$$;

-- Automatsko ažuriranje updated_at kolone
create or replace function public.fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Administratori
-- ---------------------------------------------------------------------------

-- Spisak email adresa kojima je dozvoljena administratorska uloga.
-- Registracija nepoznatih adresa ne dobija nikakva prava.
create table public.admin_allowlist (
  email text primary key
);

-- Podešavanja po administratoru; postojanje reda = administratorska prava
create table public.admin_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_notifications boolean not null default true,
  created_at timestamptz not null default now()
);

-- Da li je trenutni korisnik administrator
create or replace function public.fn_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_settings where user_id = auth.uid())
$$;

-- Posle registracije: ako je email na spisku, korisnik postaje administrator
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
  end if;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();

-- ---------------------------------------------------------------------------
-- Oblasti i pitanja
-- ---------------------------------------------------------------------------

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id uuid not null references public.topics (id),
  type text not null check (type in ('single', 'multi', 'numeric', 'text', 'truefalse', 'matching')),
  difficulty smallint not null check (difficulty between 1 and 3),
  text text not null check (length(text) between 1 and 2000),
  options jsonb,
  correct jsonb not null,
  explanation text,
  hint text,
  points int not null default 1 check (points > 0 and points <= 100),
  source text not null default 'manual' check (source in ('manual', 'generated')),
  gen_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_questions_topic on public.questions (topic_id);
create index idx_questions_difficulty on public.questions (difficulty);
create index idx_questions_type on public.questions (type);
-- Duplikat generisanog zadatka za istog vlasnika se tiho odbija
create unique index uq_questions_signature
  on public.questions (owner_id, gen_signature) where gen_signature is not null;

create trigger trg_questions_touch before update on public.questions
  for each row execute function public.fn_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Kvizovi
-- ---------------------------------------------------------------------------

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  description text,
  time_limit_seconds int check (time_limit_seconds is null or time_limit_seconds between 30 and 14400),
  default_max_attempts int not null default 1 check (default_max_attempts between 1 and 20),
  shuffle_questions boolean not null default true,
  shuffle_answers boolean not null default true,
  show_result boolean not null default true,
  show_correct boolean not null default true,
  pass_threshold_pct int not null default 50 check (pass_threshold_pct between 0 and 100),
  require_name boolean not null default true,
  require_label boolean not null default false,
  label_name text not null default 'Odeljenje',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_quizzes_touch before update on public.quizzes
  for each row execute function public.fn_touch_updated_at();

-- Snapshot pitanja u kvizu: puna kopija u trenutku dodavanja.
-- Kasnija izmena pitanja u banci NE menja poslati kviz.
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  source_question_id uuid references public.questions (id) on delete set null,
  position int not null,
  topic_id uuid references public.topics (id) on delete set null,
  topic_name text not null,
  type text not null check (type in ('single', 'multi', 'numeric', 'text', 'truefalse', 'matching')),
  text text not null,
  options jsonb,
  correct jsonb not null,
  explanation text,
  hint text,
  points int not null default 1 check (points > 0),
  unique (quiz_id, position)
);

create index idx_quiz_questions_quiz on public.quiz_questions (quiz_id);

-- Linkovi za pristup kvizu (dete pristupa preko tokena iz linka)
create table public.quiz_links (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  token text not null unique default public.fn_generate_token(24),
  label text,
  is_active boolean not null default true,
  expires_at timestamptz,
  max_attempts int not null default 1 check (max_attempts between 1 and 20),
  created_at timestamptz not null default now()
);

create index idx_quiz_links_quiz on public.quiz_links (quiz_id);

-- ---------------------------------------------------------------------------
-- Pokušaji i odgovori
-- ---------------------------------------------------------------------------

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_link_id uuid not null references public.quiz_links (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  attempt_no int not null,
  child_name text not null check (length(child_name) between 1 and 60),
  child_label text check (child_label is null or length(child_label) <= 60),
  attempt_token text not null unique default public.fn_generate_token(24),
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'expired')),
  -- Redosled pitanja i opcija serviran detetu: [{"qq": "<uuid>", "opts": ["o3","o1"]}]
  layout jsonb not null,
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  submitted_at timestamptz,
  duration_sec int,
  total_points int,
  max_points int,
  score_pct numeric(5, 1),
  correct_count int,
  incorrect_count int,
  passed boolean,
  unique (quiz_link_id, attempt_no)
);

create index idx_attempts_quiz on public.attempts (quiz_id);
create index idx_attempts_status on public.attempts (status);
create index idx_attempts_submitted on public.attempts (submitted_at desc);

create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  quiz_question_id uuid not null references public.quiz_questions (id) on delete cascade,
  answer jsonb,
  answered_at timestamptz,
  is_correct boolean,
  awarded_points int,
  graded_by text not null default 'auto' check (graded_by in ('auto', 'manual')),
  unique (attempt_id, quiz_question_id)
);

create index idx_attempt_answers_attempt on public.attempt_answers (attempt_id);

-- Snapshot kviza je zamrznut čim postoji ijedan pokušaj
create or replace function public.fn_guard_quiz_snapshot()
returns trigger
language plpgsql
as $$
declare
  v_quiz_id uuid := coalesce(old.quiz_id, new.quiz_id);
begin
  if exists (select 1 from public.attempts where quiz_id = v_quiz_id) then
    raise exception 'Kviz već ima pokušaje — pitanja se više ne mogu menjati. Napravi novi kviz.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_quiz_questions_guard
  before insert or update or delete on public.quiz_questions
  for each row execute function public.fn_guard_quiz_snapshot();

-- ---------------------------------------------------------------------------
-- Konfiguracija i evidencija mejlova
-- ---------------------------------------------------------------------------

-- Interna konfiguracija (URL edge funkcija, tajna za webhook) — nedostupna klijentima
create table public.app_config (
  key text primary key,
  value text not null
);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.attempts (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);
