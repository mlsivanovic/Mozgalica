-- Raspored može biti pauziran ili obrisan u kratkom periodu između preuzimanja
-- posla i njegovog dovršavanja. Tada se dnevni kviz ne sme ipak napraviti.
create or replace function public.fn_guard_daily_quiz_schedule_active()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.daily_schedule_id is not null and not exists (
    select 1
    from public.daily_quiz_schedules s
    where s.id = new.daily_schedule_id
      and s.is_active
      and s.deleted_at is null
  ) then
    raise exception 'Pauziran ili obrisan dnevni raspored ne može poslati kviz.';
  end if;
  return new;
end;
$$;

create trigger trg_quizzes_daily_schedule_active_guard
  before insert or update of daily_schedule_id on public.quizzes
  for each row execute function public.fn_guard_daily_quiz_schedule_active();
