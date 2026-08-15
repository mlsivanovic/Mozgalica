-- Jedno poništavanje poslednjeg dečjeg poteza, dostupno pre odgovora računara.

alter table public.chess_games
  add column undo_used boolean not null default false;

create or replace function public.undo_last_child_chess_move(
  p_game_id uuid,
  p_expected_revision int,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.chess_games;
  v_last_move public.chess_moves;
  v_previous_fen text;
begin
  if auth.role() <> 'service_role' then raise exception 'Nedozvoljena operacija.'; end if;

  select * into v_game
  from public.chess_games
  where id = p_game_id
  for update;

  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_game.last_request_id = p_request_id then
    return jsonb_build_object('ok', true, 'duplicate', true, 'revision', v_game.revision);
  end if;
  if v_game.revision <> p_expected_revision then
    return jsonb_build_object('ok', false, 'error', 'stale', 'revision', v_game.revision);
  end if;
  if v_game.status <> 'in_progress' or v_game.undo_used or v_game.turn_color = v_game.child_color then
    return jsonb_build_object('ok', false, 'error', 'undo_unavailable', 'revision', v_game.revision);
  end if;

  select * into v_last_move
  from public.chess_moves
  where game_id = p_game_id
  order by ply desc
  limit 1;

  if not found or v_last_move.player <> 'child' or v_last_move.color <> v_game.child_color then
    return jsonb_build_object('ok', false, 'error', 'undo_unavailable', 'revision', v_game.revision);
  end if;

  select fen_after into v_previous_fen
  from public.chess_moves
  where game_id = p_game_id and ply = v_last_move.ply - 1;

  v_previous_fen := coalesce(
    v_previous_fen,
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  );

  delete from public.chess_moves
  where game_id = p_game_id and ply = v_last_move.ply;

  update public.chess_games
  set
    fen = v_previous_fen,
    turn_color = child_color,
    turn_started_at = now(),
    undo_used = true,
    revision = revision + 1,
    last_request_id = p_request_id
  where id = p_game_id;

  return jsonb_build_object('ok', true, 'duplicate', false, 'revision', v_game.revision + 1);
end;
$$;

revoke all on function public.undo_last_child_chess_move(uuid, int, uuid)
  from public, anon, authenticated;
grant execute on function public.undo_last_child_chess_move(uuid, int, uuid)
  to service_role;
