-- Šahovske nagrade prate jasnu progresiju od jednog do pet nivoa.
create or replace function public.fn_chess_stars(p_elo int, p_result text)
returns smallint
language sql
immutable
as $$
  select case
    when p_result = 'child_loss' then 0
    when p_result = 'draw' then case p_elo
      when 700 then 0
      when 900 then 1
      when 1100 then 1
      when 1300 then 2
      when 1500 then 3
      else 0
    end
    when p_result = 'child_win' then case p_elo
      when 700 then 1
      when 900 then 2
      when 1100 then 3
      when 1300 then 4
      when 1500 then 5
      else 0
    end
    else 0
  end::smallint
$$;

revoke all on function public.fn_chess_stars(int, text) from public;
