-- Nova skala nagrade: od 0 do najviše 5 zvezdica.
alter table public.attempts
  drop constraint if exists attempts_stars_awarded_check;

alter table public.attempts
  add constraint attempts_stars_awarded_check
  check (stars_awarded between 0 and 5);

create or replace function public.fn_stars_for_score(p_score numeric)
returns smallint
language sql
immutable
as $$
  select case
    when p_score is null then 0
    when p_score >= 100 then 5
    when p_score >= 90 then 4
    when p_score >= 80 then 3
    when p_score >= 70 then 2
    when p_score >= 60 then 1
    else 0
  end::smallint
$$;

update public.attempts
set stars_awarded = case
  when status = 'submitted' and not review_pending
    then public.fn_stars_for_score(score_pct)
  else null
end;

-- Stariji sezonski obračun i administratorski pregled prelaze na isti,
-- noviji izvor zvezdica kao profili dece.
create or replace function public.fn_total_stars(p_owner_id uuid, p_child_name text)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(sum(najbolji.stars), 0)::integer
  from (
    select max(a.stars_awarded)::integer as stars
    from public.quizzes q
    join public.attempts a on a.quiz_id = q.id
    where p_child_name in ('Andrej', 'Filip')
      and q.owner_id = p_owner_id
      and q.fixed_child_name = p_child_name
      and a.stars_awarded is not null
    group by q.id
  ) najbolji
$$;

revoke all on function public.fn_total_stars(uuid, text) from public;

create or replace view public.v_child_star_totals
  with (security_invoker = true) as
select
  dete.child_name,
  coalesce(sum(najbolji.best_stars), 0)::integer as total_stars
from public.admin_settings podesavanja
cross join (values ('Andrej'::text), ('Filip'::text)) as dete(child_name)
left join (
  select
    q.owner_id,
    q.id as quiz_id,
    q.fixed_child_name as child_name,
    max(a.stars_awarded)::integer as best_stars
  from public.quizzes q
  left join public.attempts a
    on a.quiz_id = q.id and a.stars_awarded is not null
  where q.fixed_child_name is not null
  group by q.owner_id, q.id, q.fixed_child_name
) najbolji
  on najbolji.owner_id = podesavanja.user_id
  and najbolji.child_name = dete.child_name
group by podesavanja.user_id, dete.child_name;

grant select on public.v_child_star_totals to authenticated;

create or replace function public.fn_child_title_season_stars(p_season_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(najbolji.stars), 0)::integer
  from (
    select max(a.stars_awarded)::integer as stars
    from public.child_title_seasons s
    join public.quizzes q
      on q.owner_id = s.owner_id
      and q.fixed_child_name = s.child_name
    join public.attempts a
      on a.quiz_id = q.id
      and a.stars_awarded is not null
    where s.id = p_season_id
      and (s.includes_existing_results or a.submitted_at >= s.started_at)
    group by q.id
  ) najbolji
$$;

do $$
declare
  v_season public.child_title_seasons;
begin
  for v_season in
    select *
    from public.child_title_seasons
    where ended_at is null
  loop
    perform public.fn_refresh_child_title_season(
      v_season.owner_id,
      v_season.child_name,
      null
    );
  end loop;
end;
$$;
