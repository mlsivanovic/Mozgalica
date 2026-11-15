-- Brisanje zadataka iz roditeljskog prikaza „Vežbanje”.
-- Jedna dodela kviza se uklanja bez gubitka istorije: link bez pokušaja se briše,
-- a link sa pokušajima se deaktivira (attempts.quiz_link_id je „on delete cascade”).
create or replace function public.admin_delete_parent_tasks(p_tasks jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task jsonb;
  v_kind text;
  v_id uuid;
  v_child uuid;
  v_affected int;
  v_removed int := 0;
  v_archived int := 0;
  v_preserved int := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_tasks is null or jsonb_typeof(p_tasks) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  for v_task in select value from jsonb_array_elements(p_tasks) loop
    begin
      v_kind := v_task->>'kind';
      v_id := (v_task->>'id')::uuid;
      v_child := nullif(v_task->>'childProfileId', '')::uuid;

      if v_kind = 'chess' then
        if not exists (
          select 1 from public.chess_games g
          where g.id = v_id and g.owner_id = auth.uid()
            and (v_child is null or g.child_profile_id = v_child)
        ) then
          raise exception 'Partija nije pronađena.';
        end if;
        update public.chess_games g
        set status = 'cancelled', completed_at = now()
        where g.id = v_id and g.owner_id = auth.uid() and g.status in ('assigned', 'in_progress');
        get diagnostics v_affected = row_count;
        v_removed := v_removed + v_affected;

      elsif v_kind = 'quiz' then
        if not exists (select 1 from public.quizzes q where q.id = v_id and q.owner_id = auth.uid()) then
          raise exception 'Kviz nije pronađen.';
        end if;

        if v_child is not null then
          if not exists (select 1 from public.child_profiles cp where cp.id = v_child and cp.owner_id = auth.uid()) then
            raise exception 'Profil deteta nije pronađen.';
          end if;

          update public.quiz_links l
          set is_active = false, expires_at = now()
          where l.quiz_id = v_id and l.child_profile_id = v_child and l.is_active
            and exists (select 1 from public.attempts a where a.quiz_link_id = l.id);
          get diagnostics v_affected = row_count;
          v_preserved := v_preserved + v_affected;

          delete from public.quiz_links l
          where l.quiz_id = v_id and l.child_profile_id = v_child
            and not exists (select 1 from public.attempts a where a.quiz_link_id = l.id);
          get diagnostics v_affected = row_count;
          v_removed := v_removed + v_affected;

        elsif exists (select 1 from public.quiz_links l where l.quiz_id = v_id) then
          update public.quiz_links l
          set is_active = false, expires_at = now()
          where l.quiz_id = v_id and l.child_profile_id is null and l.is_active
            and exists (select 1 from public.attempts a where a.quiz_link_id = l.id);
          get diagnostics v_affected = row_count;
          v_preserved := v_preserved + v_affected;

          delete from public.quiz_links l
          where l.quiz_id = v_id and l.child_profile_id is null
            and not exists (select 1 from public.attempts a where a.quiz_link_id = l.id);
          get diagnostics v_affected = row_count;
          v_removed := v_removed + v_affected;

        else
          -- Kviz bez ijedne dodele je pripremljen, pa ide u arhivu (kao i na listi kvizova).
          if (public.soft_delete_quiz(v_id)->>'ok')::boolean then
            v_archived := v_archived + 1;
          else
            raise exception 'Kviz ne može da se obriše.';
          end if;
        end if;

      else
        raise exception 'Nepoznata vrsta zadatka.';
      end if;
    exception when others then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'id', coalesce(v_task->>'id', ''), 'message', sqlerrm
      ));
    end;
  end loop;

  return jsonb_build_object(
    'ok', true, 'removed', v_removed, 'archived', v_archived,
    'preserved', v_preserved, 'errors', v_errors
  );
end;
$$;
revoke all on function public.admin_delete_parent_tasks(jsonb) from public, anon;
grant execute on function public.admin_delete_parent_tasks(jsonb) to authenticated;
