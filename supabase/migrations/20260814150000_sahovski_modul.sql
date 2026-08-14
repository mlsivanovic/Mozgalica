-- Šahovske partije protiv slabijeg serverskog enginea, sa profilnim dodelama,
-- autoritativnim satom i zvezdicama koje ulaze u postojeći sistem nagrada.

create table public.chess_games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  child_profile_id uuid not null references public.child_profiles (id) on delete restrict,
  play_token text not null unique default public.fn_generate_token(24),
  assignment_request_id uuid not null unique,
  approximate_elo smallint not null check (approximate_elo in (700, 900, 1100, 1300, 1500)),
  child_color text not null check (child_color in ('white', 'black')),
  clock_seconds int check (clock_seconds is null or clock_seconds in (300, 600, 900, 1800)),
  white_remaining_ms bigint check (white_remaining_ms is null or white_remaining_ms >= 0),
  black_remaining_ms bigint check (black_remaining_ms is null or black_remaining_ms >= 0),
  turn_color text not null default 'white' check (turn_color in ('white', 'black')),
  turn_started_at timestamptz,
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'completed', 'cancelled')),
  result text check (result is null or result in ('child_win', 'draw', 'child_loss')),
  termination text check (termination is null or termination in (
    'checkmate', 'stalemate', 'threefold_repetition', 'fifty_move',
    'insufficient_material', 'timeout', 'resignation', 'draw'
  )),
  stars_awarded smallint check (stars_awarded is null or stars_awarded between 0 and 5),
  revision int not null default 0 check (revision >= 0),
  last_request_id uuid,
  notify_child_email boolean not null default false,
  engine_version text not null default 'mozgalica-1',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (clock_seconds is null and white_remaining_ms is null and black_remaining_ms is null)
    or (clock_seconds is not null and white_remaining_ms is not null and black_remaining_ms is not null)
  ),
  check (
    (status = 'completed' and result is not null and termination is not null)
    or (status <> 'completed' and result is null and termination is null and stars_awarded is null)
  )
);

create index idx_chess_games_owner_created on public.chess_games (owner_id, created_at desc);
create index idx_chess_games_child_status on public.chess_games (child_profile_id, status, created_at desc);
create index idx_chess_games_clock on public.chess_games (turn_started_at)
  where status = 'in_progress' and clock_seconds is not null;

create table public.chess_moves (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.chess_games (id) on delete cascade,
  ply int not null check (ply > 0),
  player text not null check (player in ('child', 'engine')),
  color text not null check (color in ('white', 'black')),
  uci text not null check (uci ~ '^[a-h][1-8][a-h][1-8][qrbn]?$'),
  san text not null check (length(san) between 1 and 32),
  fen_after text not null,
  moved_at timestamptz not null,
  white_remaining_ms bigint check (white_remaining_ms is null or white_remaining_ms >= 0),
  black_remaining_ms bigint check (black_remaining_ms is null or black_remaining_ms >= 0),
  unique (game_id, ply)
);

create index idx_chess_moves_game on public.chess_moves (game_id, ply);

alter table public.chess_games enable row level security;
alter table public.chess_moves enable row level security;
revoke all on public.chess_games, public.chess_moves from anon, authenticated;
grant select on public.chess_games, public.chess_moves to authenticated;

create policy chess_games_admin_select on public.chess_games
  for select to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid());

create policy chess_moves_admin_select on public.chess_moves
  for select to authenticated
  using (public.fn_is_admin() and exists (
    select 1 from public.chess_games g where g.id = game_id and g.owner_id = auth.uid()
  ));

create or replace function public.fn_chess_stars(p_elo int, p_result text)
returns smallint
language sql
immutable
as $$
  select case
    when p_result = 'child_loss' then 0
    when p_result = 'draw' then case p_elo
      when 700 then 1 when 900 then 2 when 1100 then 3 else 4 end
    when p_result = 'child_win' then case p_elo
      when 700 then 2 when 900 then 3 when 1100 then 4 else 5 end
    else 0
  end::smallint
$$;

revoke all on function public.fn_chess_stars(int, text) from public;

create or replace function public.fn_guard_chess_game_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status in ('completed', 'cancelled') then
    raise exception 'Završena ili otkazana šahovska partija je nepromenjiva.';
  end if;

  if new.status = 'completed' then
    if new.result is null or new.termination is null then
      raise exception 'Završena partija mora imati rezultat i razlog završetka.';
    end if;
    new.stars_awarded := public.fn_chess_stars(new.approximate_elo, new.result);
    new.completed_at := coalesce(new.completed_at, now());
    new.turn_started_at := null;
  elsif new.status = 'cancelled' then
    new.result := null;
    new.termination := null;
    new.stars_awarded := null;
    new.completed_at := coalesce(new.completed_at, now());
    new.turn_started_at := null;
  else
    new.result := null;
    new.termination := null;
    new.stars_awarded := null;
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_chess_games_guard
  before update on public.chess_games
  for each row execute function public.fn_guard_chess_game_state();

create or replace function public.assign_chess_game(
  p_child_profile_id uuid,
  p_approximate_elo int,
  p_child_color text,
  p_clock_seconds int,
  p_send_email boolean default false,
  p_idempotency_key uuid default null
)
returns public.chess_games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
  v_game public.chess_games;
  v_key uuid := coalesce(p_idempotency_key, gen_random_uuid());
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;
  if p_approximate_elo not in (700, 900, 1100, 1300, 1500) then
    raise exception 'Nepodržan ELO nivo.';
  end if;
  if p_child_color not in ('white', 'black') then
    raise exception 'Nepodržana boja deteta.';
  end if;
  if p_clock_seconds is not null and p_clock_seconds not in (300, 600, 900, 1800) then
    raise exception 'Nepodržana vremenska kontrola.';
  end if;

  select * into v_profile
  from public.child_profiles
  where id = p_child_profile_id and owner_id = auth.uid();
  if not found then raise exception 'Profil deteta nije pronađen.'; end if;
  if p_send_email and v_profile.email is null then
    raise exception 'Profil deteta nema email adresu.';
  end if;

  select * into v_game
  from public.chess_games
  where assignment_request_id = v_key and owner_id = auth.uid();
  if found then return v_game; end if;

  insert into public.chess_games (
    owner_id, child_profile_id, assignment_request_id, approximate_elo,
    child_color, clock_seconds, white_remaining_ms, black_remaining_ms,
    notify_child_email
  ) values (
    auth.uid(), v_profile.id, v_key, p_approximate_elo,
    p_child_color, p_clock_seconds,
    case when p_clock_seconds is null then null else p_clock_seconds::bigint * 1000 end,
    case when p_clock_seconds is null then null else p_clock_seconds::bigint * 1000 end,
    p_send_email
  ) returning * into v_game;

  return v_game;
exception when unique_violation then
  select * into v_game
  from public.chess_games
  where assignment_request_id = v_key and owner_id = auth.uid();
  if not found then raise; end if;
  return v_game;
end;
$$;

revoke all on function public.assign_chess_game(uuid, int, text, int, boolean, uuid) from public;
grant execute on function public.assign_chess_game(uuid, int, text, int, boolean, uuid) to authenticated;

create or replace function public.cancel_chess_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fn_is_admin() then raise exception 'Nedozvoljena operacija.'; end if;
  update public.chess_games
  set status = 'cancelled', completed_at = now()
  where id = p_game_id and owner_id = auth.uid() and status in ('assigned', 'in_progress');
  if not found then raise exception 'Aktivna partija nije pronađena.'; end if;
end;
$$;

revoke all on function public.cancel_chess_game(uuid) from public;
grant execute on function public.cancel_chess_game(uuid) to authenticated;

-- Poziva je isključivo Edge Function sa service-role JWT-om. Revizija i
-- request ID sprečavaju dupli potez pri ponovljenom ili paralelnom zahtevu.
create or replace function public.commit_chess_state(
  p_game_id uuid,
  p_expected_revision int,
  p_request_id uuid,
  p_fen text,
  p_status text,
  p_result text,
  p_termination text,
  p_white_remaining_ms bigint,
  p_black_remaining_ms bigint,
  p_turn_color text,
  p_turn_started_at timestamptz,
  p_started_at timestamptz,
  p_moves jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.chess_games;
begin
  if auth.role() <> 'service_role' then raise exception 'Nedozvoljena operacija.'; end if;
  select * into v_game from public.chess_games where id = p_game_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_game.last_request_id = p_request_id then
    return jsonb_build_object('ok', true, 'duplicate', true, 'revision', v_game.revision);
  end if;
  if v_game.revision <> p_expected_revision then
    return jsonb_build_object('ok', false, 'error', 'stale', 'revision', v_game.revision);
  end if;
  if v_game.status in ('completed', 'cancelled') then
    return jsonb_build_object('ok', false, 'error', 'finished', 'revision', v_game.revision);
  end if;

  insert into public.chess_moves (
    game_id, ply, player, color, uci, san, fen_after, moved_at,
    white_remaining_ms, black_remaining_ms
  )
  select
    p_game_id, x.ply, x.player, x.color, x.uci, x.san, x.fen_after, x.moved_at,
    x.white_remaining_ms, x.black_remaining_ms
  from jsonb_to_recordset(coalesce(p_moves, '[]'::jsonb)) as x(
    ply int, player text, color text, uci text, san text, fen_after text,
    moved_at timestamptz, white_remaining_ms bigint, black_remaining_ms bigint
  );

  update public.chess_games
  set
    fen = p_fen,
    status = p_status,
    result = p_result,
    termination = p_termination,
    white_remaining_ms = p_white_remaining_ms,
    black_remaining_ms = p_black_remaining_ms,
    turn_color = p_turn_color,
    turn_started_at = p_turn_started_at,
    started_at = coalesce(started_at, p_started_at),
    revision = revision + 1,
    last_request_id = p_request_id
  where id = p_game_id;

  return jsonb_build_object('ok', true, 'duplicate', false, 'revision', v_game.revision + 1);
end;
$$;

revoke all on function public.commit_chess_state(
  uuid, int, uuid, text, text, text, text, bigint, bigint, text, timestamptz, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.commit_chess_state(
  uuid, int, uuid, text, text, text, text, bigint, bigint, text, timestamptz, timestamptz, jsonb
) to service_role;

create or replace function public.expire_chess_games()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.chess_games g
  set
    white_remaining_ms = case when turn_color = 'white' then 0 else white_remaining_ms end,
    black_remaining_ms = case when turn_color = 'black' then 0 else black_remaining_ms end,
    status = 'completed',
    result = case when turn_color = child_color then 'child_loss' else 'child_win' end,
    termination = 'timeout',
    completed_at = now()
  where status = 'in_progress'
    and clock_seconds is not null
    and turn_started_at is not null
    and case
      when turn_color = 'white' then white_remaining_ms
      else black_remaining_ms
    end <= floor(extract(epoch from (now() - turn_started_at)) * 1000)::bigint;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_chess_games() from public, anon, authenticated;

select cron.schedule(
  'expire_chess_games',
  '* * * * *',
  'select public.expire_chess_games();'
);

-- ---------------------------------------------------------------------------
-- Jedinstveni zbir zvezdica: kvizovi + završene šahovske partije.
-- ---------------------------------------------------------------------------

create or replace function public.fn_profile_total_stars(p_profile_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select
    (select coalesce(sum(stars_awarded), 0)::int
     from public.attempts
     where child_profile_id = p_profile_id and status = 'submitted' and not review_pending)
    +
    (select coalesce(sum(stars_awarded), 0)::int
     from public.chess_games
     where child_profile_id = p_profile_id and status = 'completed');
$$;

revoke all on function public.fn_profile_total_stars(uuid) from public;

create or replace function public.fn_spendable_stars(p_profile_id uuid)
returns int
language sql stable security definer set search_path = public as $$
  select public.fn_profile_total_stars(p_profile_id)
       - (select coalesce(sum(cost), 0)::int
          from public.shop_purchases
          where child_profile_id = p_profile_id
            and status in ('requested', 'consumed'));
$$;

revoke all on function public.fn_spendable_stars(uuid) from public;

create or replace function public.fn_profile_current_title(p_profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('name', tl.name, 'avatar', tl.avatar, 'minStars', tl.min_stars)
  from public.child_profiles cp
  join public.title_levels tl on tl.owner_id = cp.owner_id
  where cp.id = p_profile_id
    and tl.min_stars <= public.fn_profile_total_stars(p_profile_id)
  order by tl.min_stars desc
  limit 1;
$$;

revoke all on function public.fn_profile_current_title(uuid) from public;

create or replace function public.get_child_profile(p_profile_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_profile public.child_profiles;
  v_total_stars int;
  v_spendable_stars int;
  v_current_title jsonb;
  v_next_title jsonb;
  v_active_quizzes jsonb;
  v_history jsonb;
  v_active_chess jsonb;
  v_chess_history jsonb;
begin
  select * into v_profile from public.child_profiles where public_token = p_profile_token;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  v_total_stars := public.fn_profile_total_stars(v_profile.id);
  v_spendable_stars := public.fn_spendable_stars(v_profile.id);
  v_current_title := public.fn_profile_current_title(v_profile.id);

  select jsonb_build_object(
    'name', tl.name, 'minStars', tl.min_stars,
    'starsNeeded', tl.min_stars - v_total_stars, 'avatar', tl.avatar
  ) into v_next_title
  from public.title_levels tl
  where tl.owner_id = v_profile.owner_id and tl.min_stars > v_total_stars
  order by tl.min_stars limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'quizToken', l.token, 'title', q.title, 'description', q.description,
    'questionCount', (select count(*) from public.quiz_questions qq where qq.quiz_id = q.id),
    'attemptState', case when a.id is null then 'new' else 'in_progress' end,
    'answeredCount', coalesce((select count(*) from public.attempt_answers aa
      join public.quiz_questions qq on qq.id = aa.quiz_question_id
      where aa.attempt_id = a.id and public.fn_answer_is_filled(qq.type, aa.answer)), 0),
    'timeLimitSeconds', q.time_limit_seconds, 'remainingSeconds', a.remaining_seconds
  ) order by l.created_at desc), '[]'::jsonb) into v_active_quizzes
  from public.quiz_links l
  join public.quizzes q on q.id = l.quiz_id
  left join public.attempts a on a.child_profile_id = v_profile.id and a.quiz_id = q.id
  where l.child_profile_id = v_profile.id and l.is_active
    and (l.expires_at is null or l.expires_at >= now())
    and (a.id is null or a.status = 'in_progress');

  select coalesce(jsonb_agg(jsonb_build_object(
    'attemptId', a.id, 'title', q.title, 'submittedAt', a.submitted_at,
    'scorePct', a.score_pct, 'starsAwarded', a.stars_awarded, 'pendingReview', a.review_pending
  ) order by a.submitted_at desc), '[]'::jsonb) into v_history
  from public.attempts a join public.quizzes q on q.id = a.quiz_id
  where a.child_profile_id = v_profile.id and a.status = 'submitted';

  select coalesce(jsonb_agg(jsonb_build_object(
    'playToken', g.play_token, 'approximateElo', g.approximate_elo,
    'childColor', g.child_color, 'clockSeconds', g.clock_seconds,
    'status', g.status, 'fen', g.fen, 'turnColor', g.turn_color,
    'whiteRemainingMs', case
      when g.status = 'in_progress' and g.turn_color = 'white' and g.turn_started_at is not null
        then greatest(0, g.white_remaining_ms - floor(extract(epoch from (now() - g.turn_started_at)) * 1000)::bigint)
      else g.white_remaining_ms end,
    'blackRemainingMs', case
      when g.status = 'in_progress' and g.turn_color = 'black' and g.turn_started_at is not null
        then greatest(0, g.black_remaining_ms - floor(extract(epoch from (now() - g.turn_started_at)) * 1000)::bigint)
      else g.black_remaining_ms end,
    'createdAt', g.created_at
  ) order by g.created_at desc), '[]'::jsonb) into v_active_chess
  from public.chess_games g
  where g.child_profile_id = v_profile.id and g.status in ('assigned', 'in_progress');

  select coalesce(jsonb_agg(jsonb_build_object(
    'gameId', g.id, 'playToken', g.play_token, 'approximateElo', g.approximate_elo,
    'childColor', g.child_color, 'result', g.result, 'termination', g.termination,
    'starsAwarded', g.stars_awarded, 'completedAt', g.completed_at
  ) order by g.completed_at desc), '[]'::jsonb) into v_chess_history
  from public.chess_games g
  where g.child_profile_id = v_profile.id and g.status = 'completed';

  return jsonb_build_object(
    'ok', true, 'name', v_profile.name, 'avatar', v_profile.avatar,
    'totalStars', v_total_stars, 'spendableStars', v_spendable_stars,
    'currentTitle', v_current_title, 'nextTitle', v_next_title,
    'activeQuizzes', v_active_quizzes, 'history', v_history,
    'activeChessGames', v_active_chess, 'chessHistory', v_chess_history
  );
end;
$$;

revoke all on function public.get_child_profile(text) from public;
grant execute on function public.get_child_profile(text) to anon, authenticated;

-- Najnovija verzija prodavnice čuva i URL ikonice; menja se samo izvor zbira.
create or replace function public.get_shop(p_profile_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_profile public.child_profiles;
  v_total_stars int;
  v_balance int;
  v_items jsonb;
  v_purchases jsonb;
begin
  select * into v_profile from public.child_profiles where public_token = p_profile_token;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  v_total_stars := public.fn_profile_total_stars(v_profile.id);
  v_balance := public.fn_spendable_stars(v_profile.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'title', i.title, 'description', i.description, 'emoji', i.emoji,
    'iconUrl', i.icon_url, 'cost', i.cost, 'repeatable', i.repeatable,
    'purchased', case when i.repeatable then exists (
      select 1 from public.shop_purchases p where p.shop_item_id = i.id
        and p.child_profile_id = v_profile.id and p.status = 'requested'
    ) else exists (
      select 1 from public.shop_purchases p where p.shop_item_id = i.id
        and p.child_profile_id = v_profile.id
    ) end,
    'awaitingConsumption', i.repeatable and exists (
      select 1 from public.shop_purchases p where p.shop_item_id = i.id
        and p.child_profile_id = v_profile.id and p.status = 'requested'
    ),
    'previousCount', (select count(*) from public.shop_purchases p
      where p.shop_item_id = i.id and p.child_profile_id = v_profile.id and p.status = 'consumed')
  ) order by i.sort_order, i.created_at), '[]'::jsonb) into v_items
  from public.shop_items i where i.owner_id = v_profile.owner_id and i.is_active;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'title', p.item_title, 'emoji', p.item_emoji,
    'iconUrl', p.item_icon_url, 'cost', p.cost, 'isRepeatable', p.is_repeatable,
    'status', p.status, 'requestedAt', p.requested_at, 'consumedAt', p.consumed_at
  ) order by p.requested_at desc), '[]'::jsonb) into v_purchases
  from public.shop_purchases p where p.child_profile_id = v_profile.id;

  return jsonb_build_object(
    'ok', true, 'name', v_profile.name, 'avatar', v_profile.avatar,
    'balance', v_balance, 'totalStars', v_total_stars,
    'items', v_items, 'purchases', v_purchases
  );
end;
$$;

revoke all on function public.get_shop(text) from public;
grant execute on function public.get_shop(text) to anon, authenticated;

-- Postojeće obrazovne statistike ostaju kvizovske; omotači koriguju njihov
-- nagradni deo tako da prikazuje zajednički saldo i titulu.
alter function public.admin_get_child_statistics_overview()
  rename to admin_get_child_statistics_overview_quiz_only;
revoke all on function public.admin_get_child_statistics_overview_quiz_only() from public, anon, authenticated;

create or replace function public.admin_get_child_statistics_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
  v_child jsonb;
  v_children jsonb := '[]'::jsonb;
  v_profile_id uuid;
  v_total int;
  v_spent int;
  v_last_chess timestamptz;
  v_last_existing timestamptz;
begin
  if not public.fn_is_admin() then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  v_payload := public.admin_get_child_statistics_overview_quiz_only();
  for v_child in select value from jsonb_array_elements(coalesce(v_payload->'children', '[]'::jsonb))
  loop
    v_profile_id := (v_child->>'profileId')::uuid;
    v_total := public.fn_profile_total_stars(v_profile_id);
    v_spent := coalesce((v_child#>>'{rewards,spentStars}')::int, 0);
    select max(coalesce(completed_at, started_at, created_at)) into v_last_chess
    from public.chess_games where child_profile_id = v_profile_id and status = 'completed';
    v_last_existing := nullif(v_child->>'lastActivityAt', '')::timestamptz;
    v_child := jsonb_set(v_child, '{rewards,totalStars}', to_jsonb(v_total), true);
    v_child := jsonb_set(v_child, '{rewards,spendableStars}', to_jsonb(v_total - v_spent), true);
    v_child := jsonb_set(v_child, '{rewards,currentTitle}', coalesce(public.fn_profile_current_title(v_profile_id), 'null'::jsonb), true);
    if v_last_chess is not null and (v_last_existing is null or v_last_chess > v_last_existing) then
      v_child := jsonb_set(v_child, '{lastActivityAt}', to_jsonb(v_last_chess), true);
    end if;
    v_children := v_children || jsonb_build_array(v_child);
  end loop;
  return jsonb_set(v_payload, '{children}', v_children, true);
end;
$$;

revoke all on function public.admin_get_child_statistics_overview() from public, anon;
grant execute on function public.admin_get_child_statistics_overview() to authenticated;

alter function public.admin_get_child_statistics_detail(uuid, date, date)
  rename to admin_get_child_statistics_detail_quiz_only;
revoke all on function public.admin_get_child_statistics_detail_quiz_only(uuid, date, date) from public, anon, authenticated;

create or replace function public.admin_get_child_statistics_detail(
  p_child_profile_id uuid, p_from_date date default null, p_to_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
  v_total int;
  v_spent int;
begin
  if not public.fn_is_admin() then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  v_payload := public.admin_get_child_statistics_detail_quiz_only(p_child_profile_id, p_from_date, p_to_date);
  if coalesce((v_payload->>'ok')::boolean, false) is false then return v_payload; end if;
  v_total := public.fn_profile_total_stars(p_child_profile_id);
  v_spent := coalesce((v_payload#>>'{rewards,spentStars}')::int, 0);
  v_payload := jsonb_set(v_payload, '{rewards,totalStars}', to_jsonb(v_total), true);
  v_payload := jsonb_set(v_payload, '{rewards,spendableStars}', to_jsonb(v_total - v_spent), true);
  v_payload := jsonb_set(v_payload, '{rewards,currentTitle}', coalesce(public.fn_profile_current_title(p_child_profile_id), 'null'::jsonb), true);
  return v_payload;
end;
$$;

revoke all on function public.admin_get_child_statistics_detail(uuid, date, date) from public, anon;
grant execute on function public.admin_get_child_statistics_detail(uuid, date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Inbox, push i mejl događaji za šah.
-- ---------------------------------------------------------------------------

alter table public.notifications
  add column chess_game_id uuid references public.chess_games (id) on delete cascade;

alter table public.notifications
  drop constraint notifications_event_type_check,
  add constraint notifications_event_type_check
    check (event_type in ('new_quiz', 'quiz_completed', 'new_chess_game', 'chess_game_completed'));

create unique index uq_notifications_new_chess_game
  on public.notifications (chess_game_id, recipient_type)
  where event_type = 'new_chess_game';
create unique index uq_notifications_chess_completed
  on public.notifications (chess_game_id, recipient_type)
  where event_type = 'chess_game_completed';

create or replace function public.fn_create_new_chess_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
  v_notification_id uuid;
begin
  select * into v_profile from public.child_profiles where id = new.child_profile_id;
  insert into public.notifications (
    owner_id, child_profile_id, recipient_type, event_type, chess_game_id,
    title, body, target_url
  ) values (
    new.owner_id, new.child_profile_id, 'child', 'new_chess_game', new.id,
    'Nova šahovska partija',
    v_profile.name || ', čeka te partija protiv računara jačine ELO ' || new.approximate_elo || '.',
    '/sah/' || new.play_token
  )
  on conflict (chess_game_id, recipient_type) where event_type = 'new_chess_game'
  do nothing returning id into v_notification_id;
  if v_notification_id is null then return new; end if;
  perform public.fn_enqueue_push_deliveries(v_notification_id, 'child', new.owner_id, new.child_profile_id);
  if new.notify_child_email then
    insert into public.notification_deliveries (notification_id, channel, recipient_email)
    values (v_notification_id, 'email', v_profile.email) on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_chess_games_new_notification
  after insert on public.chess_games
  for each row execute function public.fn_create_new_chess_notification();

create or replace function public.fn_create_chess_completion_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
  v_notification_id uuid;
  v_result_text text;
  v_email boolean;
begin
  if old.status = 'completed' or new.status <> 'completed' then return new; end if;
  select * into v_profile from public.child_profiles where id = new.child_profile_id;
  v_result_text := case new.result
    when 'child_win' then 'pobeda' when 'draw' then 'remi' else 'poraz' end;
  insert into public.notifications (
    owner_id, recipient_type, event_type, chess_game_id, title, body, target_url
  ) values (
    new.owner_id, 'admin', 'chess_game_completed', new.id,
    'Šahovska partija je završena',
    v_profile.name || ': ' || v_result_text || ' protiv ELO ' || new.approximate_elo
      || ' — ' || new.stars_awarded || ' zvezdica.',
    '/admin/sah'
  )
  on conflict (chess_game_id, recipient_type) where event_type = 'chess_game_completed'
  do nothing returning id into v_notification_id;
  if v_notification_id is null then return new; end if;
  perform public.fn_enqueue_push_deliveries(v_notification_id, 'admin', new.owner_id, null);
  select coalesce(email_notifications, true) into v_email
  from public.admin_settings where user_id = new.owner_id;
  if coalesce(v_email, true) then
    insert into public.notification_deliveries (notification_id, channel)
    values (v_notification_id, 'email') on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_chess_games_completion_notification
  after update of status on public.chess_games
  for each row execute function public.fn_create_chess_completion_notification();
