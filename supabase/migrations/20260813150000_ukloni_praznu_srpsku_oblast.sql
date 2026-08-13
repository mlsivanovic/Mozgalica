-- Uklanja praznu oblast „Radna sveska“ iz srpskog jezika za 3. razred.
-- Istorijski snapshot-i ostaju sačuvani; topic_id se pri brisanju postavlja na NULL.
do $$
declare
  v_topic_id uuid;
begin
  select id into v_topic_id
  from public.topics
  where slug = 'srpski-radna-sveska'
    and subject = 'srpski'
    and grade = 3;

  if v_topic_id is null then
    return;
  end if;

  if exists (select 1 from public.questions where topic_id = v_topic_id) then
    raise exception 'Oblast „Radna sveska“ nije prazna — brisanje je obustavljeno.';
  end if;

  delete from public.daily_quiz_schedule_topics
  where topic_id = v_topic_id;

  delete from public.topics
  where id = v_topic_id;
end;
$$;
