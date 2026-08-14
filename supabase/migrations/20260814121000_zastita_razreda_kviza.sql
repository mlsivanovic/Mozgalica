-- Standardni i ručni kvizovi ne smeju da kombinuju oblasti različitih razreda.
-- Istovremeno uklanjamo 74 pitanja koja su prvo uneta kao 3. razred, a zatim
-- ponovo uneta u namenske oblasti 4. razreda.

create temporary table srpski_duplikati_razreda on commit drop as
select
  q3.id as pitanje_3_id,
  q4.id as pitanje_4_id,
  q4.topic_id as oblast_4_id,
  q4.type,
  q4.difficulty,
  q4.options,
  q4.correct,
  q4.explanation,
  q4.hint,
  q4.points,
  q4.source,
  q4.gen_signature,
  q4.manual_review,
  exists (
    select 1 from public.quiz_questions qq where qq.source_question_id = q3.id
  ) as pitanje_3_referencirano,
  exists (
    select 1 from public.quiz_questions qq where qq.source_question_id = q4.id
  ) as pitanje_4_referencirano
from public.questions q3
join public.topics t3 on t3.id = q3.topic_id
join public.questions q4
  on lower(regexp_replace(trim(q3.text), '\s+', ' ', 'g'))
   = lower(regexp_replace(trim(q4.text), '\s+', ' ', 'g'))
join public.topics t4 on t4.id = q4.topic_id
where t3.subject = 'srpski'
  and t3.grade = 3
  and t4.subject = 'srpski'
  and t4.grade = 4;

do $$
begin
  if exists (
    select 1
    from srpski_duplikati_razreda
    group by pitanje_3_id
    having count(*) <> 1
  ) or exists (
    select 1
    from srpski_duplikati_razreda
    group by pitanje_4_id
    having count(*) <> 1
  ) then
    raise exception 'Duplikati pitanja između razreda nisu jednoznačni.';
  end if;

  if exists (
    select 1 from srpski_duplikati_razreda where pitanje_4_referencirano
  ) then
    raise exception 'Kopija pitanja 4. razreda već je korišćena u istorijskom kvizu.';
  end if;
end;
$$;

-- Referencirani red 3. razreda čuva svoj ID zbog istorijskog FK-a, ali preuzima
-- potpunu i noviju verziju sadržaja iz banke 4. razreda. Snapshot se ne menja.
update public.questions q
set topic_id = d.oblast_4_id,
    type = d.type,
    difficulty = d.difficulty,
    options = d.options,
    correct = d.correct,
    explanation = d.explanation,
    hint = d.hint,
    points = d.points,
    source = d.source,
    gen_signature = d.gen_signature,
    manual_review = d.manual_review
from srpski_duplikati_razreda d
where q.id = d.pitanje_3_id
  and d.pitanje_3_referencirano;

-- Posle prenosa ostaje samo referencirani ID, sada pravilno svrstan u 4. razred.
delete from public.questions q
using srpski_duplikati_razreda d
where q.id = d.pitanje_4_id
  and d.pitanje_3_referencirano;

-- Kada nijedna istorijska referenca ne postoji, zadržavamo namensku kopiju
-- 4. razreda i uklanjamo raniji red iz oblasti 3. razreda.
delete from public.questions q
using srpski_duplikati_razreda d
where q.id = d.pitanje_3_id
  and not d.pitanje_3_referencirano;

create or replace function public.fn_guard_quiz_question_grade()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_razred_kviza smallint;
  v_razred_oblasti smallint;
begin
  if new.topic_id is null then
    return new;
  end if;

  select grade into v_razred_kviza from public.quizzes where id = new.quiz_id;
  select grade into v_razred_oblasti from public.topics where id = new.topic_id;

  if v_razred_kviza is not null and v_razred_oblasti is distinct from v_razred_kviza then
    raise exception 'Pitanje pripada %. razredu, a kviz %. razredu.',
      v_razred_oblasti, v_razred_kviza;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quiz_questions_grade_guard on public.quiz_questions;
create trigger trg_quiz_questions_grade_guard
  before insert or update of quiz_id, topic_id on public.quiz_questions
  for each row execute function public.fn_guard_quiz_question_grade();

create or replace function public.fn_guard_quiz_grade_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.grade is null or new.grade is not distinct from old.grade then
    return new;
  end if;

  if exists (
    select 1
    from public.quiz_questions qq
    join public.topics t on t.id = qq.topic_id
    where qq.quiz_id = new.id
      and t.grade is distinct from new.grade
  ) then
    raise exception 'Razred kviza ne odgovara razredu postojećih pitanja.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quizzes_grade_guard on public.quizzes;
create trigger trg_quizzes_grade_guard
  before update of grade on public.quizzes
  for each row execute function public.fn_guard_quiz_grade_change();
