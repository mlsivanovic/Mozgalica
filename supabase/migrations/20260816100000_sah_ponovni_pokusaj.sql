-- Ponovni pokušaj izgubljene šahovske partije: posle poraza ili predaje dete
-- može ukupno 3 puta da odigra novu partiju protiv istog ili slabijeg ELO
-- protivnika. Pokušaji formiraju lanac (retry_of_game_id ka poraženoj partiji),
-- a granica i ELO se proveravaju isključivo server-side.

alter table public.chess_games
  add column retry_of_game_id uuid references public.chess_games (id) on delete set null;

comment on column public.chess_games.retry_of_game_id is
  'Partija čiji je ovo ponovni pokušaj (poraz/predaja koja se ponavlja).';

-- Svaka partija se ponavlja najviše jednom — sledeći pokušaj ide na novu partiju.
-- Jedinstveni indeks atomično sprečava dva paralelna pokušaja iste partije.
create unique index uq_chess_games_retry_of on public.chess_games (retry_of_game_id);

-- Dubina čvora u lancu pokušaja: 0 za originalnu partiju, 3 za poslednji dozvoljeni.
create or replace function public.fn_chess_retries_used(p_game_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  with recursive lanac as (
    select g.id, g.retry_of_game_id, 0 as dubina
    from public.chess_games g
    where g.id = p_game_id
    union all
    select r.id, r.retry_of_game_id, l.dubina + 1
    from public.chess_games r
    join lanac l on r.id = l.retry_of_game_id
  )
  select coalesce(max(dubina), 0)::int from lanac
$$;

revoke all on function public.fn_chess_retries_used(uuid) from public;

create or replace function public.fn_chess_retry_state(p_game_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'retriesUsed', public.fn_chess_retries_used(p_game_id),
    'available', coalesce((
      select g.status = 'completed' and g.result = 'child_loss'
      from public.chess_games g
      where g.id = p_game_id
    ), false)
    and public.fn_chess_retries_used(p_game_id) < 3
    and not exists (
      select 1 from public.chess_games r where r.retry_of_game_id = p_game_id
    )
  )
$$;

revoke all on function public.fn_chess_retry_state(uuid) from public, anon, authenticated;
grant execute on function public.fn_chess_retry_state(uuid) to service_role;

-- Poziva je isključivo Edge Function sa service-role JWT-om. Nova partija
-- nasleđuje dete, boju i sat, a ELO mora biti jednak ili slabiji od poraženog.
create or replace function public.retry_chess_game(
  p_play_token text,
  p_elo int,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_igra public.chess_games;
  v_postojeca public.chess_games;
  v_nova public.chess_games;
begin
  if auth.role() <> 'service_role' then raise exception 'Nedozvoljena operacija.'; end if;

  select * into v_igra from public.chess_games where play_token = p_play_token;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  select * into v_postojeca from public.chess_games where retry_of_game_id = v_igra.id;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'playToken', v_postojeca.play_token);
  end if;

  if v_igra.status <> 'completed' or v_igra.result <> 'child_loss' then
    return jsonb_build_object('ok', false, 'error', 'retry_not_allowed');
  end if;
  if p_elo not in (700, 900, 1100, 1300, 1500) then
    return jsonb_build_object('ok', false, 'error', 'invalid_elo');
  end if;
  if p_elo > v_igra.approximate_elo then
    return jsonb_build_object('ok', false, 'error', 'elo_too_high');
  end if;
  if public.fn_chess_retries_used(v_igra.id) >= 3 then
    return jsonb_build_object('ok', false, 'error', 'retries_exhausted');
  end if;

  insert into public.chess_games (
    owner_id, child_profile_id, assignment_request_id, approximate_elo,
    child_color, clock_seconds, white_remaining_ms, black_remaining_ms,
    retry_of_game_id
  ) values (
    v_igra.owner_id, v_igra.child_profile_id, p_request_id, p_elo,
    v_igra.child_color, v_igra.clock_seconds,
    case when v_igra.clock_seconds is null then null else v_igra.clock_seconds::bigint * 1000 end,
    case when v_igra.clock_seconds is null then null else v_igra.clock_seconds::bigint * 1000 end,
    v_igra.id
  ) returning * into v_nova;

  return jsonb_build_object('ok', true, 'duplicate', false, 'playToken', v_nova.play_token);
exception when unique_violation then
  select * into v_nova from public.chess_games
  where retry_of_game_id = v_igra.id or assignment_request_id = p_request_id;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'playToken', v_nova.play_token);
  end if;
  raise;
end;
$$;

revoke all on function public.retry_chess_game(text, int, uuid) from public, anon, authenticated;
grant execute on function public.retry_chess_game(text, int, uuid) to service_role;
