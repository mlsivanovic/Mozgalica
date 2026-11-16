-- Zajednička banka pitanja: pitanja vlasnika platforme postaju vidljiva svim
-- administratorima (is_shared = true). Sopstvena pitanja i dalje menja samo vlasnik,
-- a objavljivanje u zajedničku banku sme samo vlasnik platforme.

-- Backup pre masovne izmene. Šema private nije izložena API-ju.
create table private.questions_backup_20261117_deljena as
select * from public.questions;

alter table public.questions
  add column if not exists is_shared boolean not null default false;

-- Masovna izmena bez pomeranja updated_at: touch trigger bi inače postavio sadašnji trenutak.
alter table public.questions disable trigger trg_questions_touch;

update public.questions
set is_shared = true
where owner_id in (select user_id from public.admin_settings where is_platform_owner);

alter table public.questions enable trigger trg_questions_touch;

-- Grantovi za authenticated na questions već postoje (20260720100002_rls.sql), pa se
-- ovde ne menjaju. Ograničenja određuju isključivo politike ispod.
drop policy if exists questions_all on public.questions;

create policy questions_select on public.questions
  for select to authenticated
  using (public.fn_is_admin() and (owner_id = auth.uid() or is_shared));

-- is_shared = true sme da postavi samo vlasnik platforme, pa običan roditelj ne može
-- da objavi pitanje u zajedničku banku.
create policy questions_insert on public.questions
  for insert to authenticated
  with check (
    public.fn_is_admin() and owner_id = auth.uid()
    and (not is_shared or public.fn_is_platform_owner())
  );

create policy questions_update on public.questions
  for update to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid())
  with check (
    public.fn_is_admin() and owner_id = auth.uid()
    and (not is_shared or public.fn_is_platform_owner())
  );

create policy questions_delete on public.questions
  for delete to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid());
