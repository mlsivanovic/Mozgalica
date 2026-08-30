-- Roditeljski pregled čita samo podatke prijavljenog vlasnika; ne otkriva tokene deteta.
create or replace function public.admin_parent_tasks(p_child_profile_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_tasks jsonb;
begin
  if not public.fn_is_admin() then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if p_child_profile_id is not null and not exists (
    select 1 from public.child_profiles where id = p_child_profile_id and owner_id = auth.uid()
  ) then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  with assignments as (
    select distinct on (q.id, l.child_profile_id)
      q.id, l.child_profile_id, cp.name, cp.avatar, q.title, l.created_at,
      case when exists (select 1 from public.attempts a where a.quiz_link_id = l.id and a.status = 'in_progress')
        then 'in_progress' else 'assigned' end as state,
      false as unassigned
    from public.quizzes q join public.quiz_links l on l.quiz_id = q.id
    left join public.child_profiles cp on cp.id = l.child_profile_id and cp.owner_id = auth.uid()
    where q.owner_id = auth.uid() and q.deleted_at is null and l.is_active
      and (l.expires_at is null or l.expires_at >= now())
      and (p_child_profile_id is null or l.child_profile_id = p_child_profile_id)
      and ((l.child_profile_id is not null and cp.id is not null and not exists (
        select 1 from public.attempts a where a.quiz_id = q.id and a.child_profile_id = cp.id and a.status = 'submitted'
      )) or (l.child_profile_id is null and (
        select count(*) from public.attempts a where a.quiz_link_id = l.id and a.status = 'submitted'
      ) < l.max_attempts))
    order by q.id, l.child_profile_id, l.created_at desc
  ), tasks as (
    select id, 'quiz'::text as kind, child_profile_id, name, avatar, title, created_at, state, unassigned from assignments
    union all
    select q.id, 'quiz', null::uuid, null::text, null::text, q.title, q.created_at, 'unassigned', true
    from public.quizzes q where q.owner_id = auth.uid() and q.deleted_at is null
      and p_child_profile_id is null and not exists (select 1 from public.quiz_links l where l.quiz_id = q.id)
    union all
    select g.id, 'chess', cp.id, cp.name, cp.avatar, 'Šah · ELO ' || g.approximate_elo,
      g.created_at, g.status, false
    from public.chess_games g join public.child_profiles cp on cp.id = g.child_profile_id
    where g.owner_id = auth.uid() and cp.owner_id = auth.uid() and g.status in ('assigned', 'in_progress')
      and (p_child_profile_id is null or cp.id = p_child_profile_id)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'kind', kind, 'childProfileId', child_profile_id, 'childName', name, 'avatar', avatar,
    'title', title, 'createdAt', created_at, 'state', state, 'unassigned', unassigned
  ) order by created_at desc, id), '[]'::jsonb) into v_tasks from tasks;
  return jsonb_build_object('ok', true, 'tasks', v_tasks);
end;
$$;
revoke all on function public.admin_parent_tasks(uuid) from public, anon;
grant execute on function public.admin_parent_tasks(uuid) to authenticated;

create or replace function public.admin_parent_overview(p_child_profile_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_tasks jsonb;
  v_children jsonb;
  v_events jsonb;
  v_schedules jsonb;
  v_review int;
  v_rewards int;
  v_day date := (now() at time zone 'Europe/Belgrade')::date;
begin
  v_tasks := public.admin_parent_tasks(p_child_profile_id);
  if not coalesce((v_tasks->>'ok')::boolean, false) then return v_tasks; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', cp.id, 'name', cp.name, 'avatar', cp.avatar,
    'completedToday', (select count(distinct a.quiz_id) from public.attempts a join public.quizzes q on q.id = a.quiz_id
      where a.child_profile_id = cp.id and q.owner_id = auth.uid() and a.status = 'submitted'
        and (a.submitted_at at time zone 'Europe/Belgrade')::date = v_day)
      + (select count(*) from public.chess_games g where g.child_profile_id = cp.id and g.owner_id = auth.uid()
        and g.status = 'completed' and (g.completed_at at time zone 'Europe/Belgrade')::date = v_day),
    'quizCount', (select count(*) from jsonb_array_elements(v_tasks->'tasks') t where t->>'childProfileId' = cp.id::text and t->>'kind' = 'quiz'),
    'chessCount', (select count(*) from jsonb_array_elements(v_tasks->'tasks') t where t->>'childProfileId' = cp.id::text and t->>'kind' = 'chess'),
    'lastResult', (select jsonb_build_object('id', a.id, 'score', a.score_pct, 'pending', a.review_pending, 'at', a.submitted_at)
      from public.attempts a join public.quizzes q on q.id = a.quiz_id
      where a.child_profile_id = cp.id and q.owner_id = auth.uid() and a.status = 'submitted'
      order by a.submitted_at desc limit 1)
  ) order by cp.created_at, cp.id), '[]'::jsonb) into v_children
  from public.child_profiles cp where cp.owner_id = auth.uid() and (p_child_profile_id is null or cp.id = p_child_profile_id);

  with schedules as (
    select s.id, 'quiz'::text as kind, s.child_profile_id, cp.name, s.subject as title,
      s.is_active, (s.next_run_on + s.daily_time) at time zone s.timezone as next_at,
      (select case when r.status = 'failed' then r.error end from public.daily_quiz_runs r
        where r.schedule_id = s.id and r.status in ('failed', 'succeeded') order by r.local_date desc, r.updated_at desc limit 1) as error
    from public.daily_quiz_schedules s join public.child_profiles cp on cp.id = s.child_profile_id
    where s.owner_id = auth.uid() and cp.owner_id = auth.uid() and s.deleted_at is null
      and (p_child_profile_id is null or cp.id = p_child_profile_id)
    union all
    select s.id, 'chess', s.child_profile_id, cp.name, 'Šah', s.is_active,
      (s.next_run_on + s.daily_time) at time zone s.timezone,
      (select case when r.status = 'failed' then r.error end from public.daily_chess_runs r
        where r.schedule_id = s.id and r.status in ('failed', 'succeeded') order by r.local_date desc, r.updated_at desc limit 1)
    from public.daily_chess_schedules s join public.child_profiles cp on cp.id = s.child_profile_id
    where s.owner_id = auth.uid() and cp.owner_id = auth.uid() and s.deleted_at is null
      and (p_child_profile_id is null or cp.id = p_child_profile_id)
  ) select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'childProfileId', child_profile_id,
      'childName', name, 'title', title, 'active', is_active, 'nextAt', next_at, 'error', error)
      order by next_at, id), '[]'::jsonb) into v_schedules from schedules;

  select count(*) into v_review from public.attempts a join public.quizzes q on q.id = a.quiz_id
    where q.owner_id = auth.uid() and a.status = 'submitted' and a.review_pending
      and (p_child_profile_id is null or a.child_profile_id = p_child_profile_id);
  select count(*) into v_rewards from public.shop_purchases p where p.owner_id = auth.uid() and p.status = 'requested'
    and (p_child_profile_id is null or p.child_profile_id = p_child_profile_id);

  with events as (
    select a.id, 'quiz'::text as kind, a.child_profile_id, coalesce(cp.name, a.child_name) as name,
      q.title, a.submitted_at as at, a.score_pct as score, a.review_pending as pending,
      coalesce(a.stars_awarded, a.stars_earned) as stars, null::text as result
    from public.attempts a join public.quizzes q on q.id = a.quiz_id left join public.child_profiles cp on cp.id = a.child_profile_id
    where q.owner_id = auth.uid() and a.status = 'submitted' and (p_child_profile_id is null or a.child_profile_id = p_child_profile_id)
    union all
    select g.id, 'chess', g.child_profile_id, cp.name, 'Šah · ELO ' || g.approximate_elo, g.completed_at,
      null, false, g.stars_awarded, g.result
    from public.chess_games g join public.child_profiles cp on cp.id = g.child_profile_id
    where g.owner_id = auth.uid() and cp.owner_id = auth.uid() and g.status = 'completed'
      and (p_child_profile_id is null or cp.id = p_child_profile_id)
  ), recent as (select * from events order by at desc, id limit 5)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'childProfileId', child_profile_id,
    'childName', name, 'title', title, 'at', at, 'score', score, 'pending', pending, 'stars', stars, 'result', result)
    order by at desc, id), '[]'::jsonb) into v_events from recent;
  return jsonb_build_object('ok', true, 'date', v_day, 'updatedAt', now(), 'children', v_children,
    'schedules', v_schedules, 'reviewCount', v_review, 'rewardCount', v_rewards, 'events', v_events);
end;
$$;
revoke all on function public.admin_parent_overview(uuid) from public, anon;
grant execute on function public.admin_parent_overview(uuid) to authenticated;

create or replace function public.admin_list_shop_purchases()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'childProfileId', cp.id,
    'childName', cp.name,
    'childAvatar', cp.avatar,
    'title', p.item_title,
    'emoji', p.item_emoji,
    'iconUrl', p.item_icon_url,
    'cost', p.cost,
    'isRepeatable', p.is_repeatable,
    'status', p.status,
    'requestedAt', p.requested_at,
    'consumedAt', p.consumed_at,
    'note', p.note
  ) order by p.requested_at desc), '[]'::jsonb)
  into v_result
  from public.shop_purchases p
  join public.child_profiles cp on cp.id = p.child_profile_id
  where p.owner_id = auth.uid();

  return jsonb_build_object('ok', true, 'purchases', v_result);
end;
$$;

revoke all on function public.admin_list_shop_purchases() from public;
grant execute on function public.admin_list_shop_purchases() to authenticated;

revoke all on function public.admin_list_shop_purchases() from anon;
