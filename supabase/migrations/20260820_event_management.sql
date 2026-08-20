-- Campos administrativos e suporte ao link geral de cadastro.
alter table public.events add column if not exists address text;
alter table public.events add column if not exists status text not null default 'active';
alter table public.events add column if not exists updated_at timestamptz not null default now();
alter table public.invitations add column if not exists revoked_at timestamptz;
alter table public.guests add column if not exists updated_at timestamptz not null default now();

-- Cadastro geral: um nome por evento, com no máximo um acompanhante.
create or replace function public.submit_general_registration(
  p_event_token uuid,
  p_name text,
  p_attending boolean,
  p_companion_name text,
  p_primary_drinks boolean,
  p_companion_drinks boolean,
  p_brings_own_drink boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare event_record public.events%rowtype; new_guest_id uuid; clean_name text; clean_companion text; calculated_party_size integer; calculated_drinkers integer;
begin
  select * into event_record from public.events where invite_token = p_event_token and status = 'active';
  if not found then raise exception 'invalid_event'; end if;
  clean_name := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  clean_companion := nullif(trim(regexp_replace(coalesce(p_companion_name, ''), '\s+', ' ', 'g')), '');
  if char_length(clean_name) < 2 or char_length(clean_name) > 80 then raise exception 'invalid_name'; end if;
  if clean_companion is not null and (char_length(clean_companion) < 2 or char_length(clean_companion) > 80) then raise exception 'invalid_companion'; end if;
  calculated_party_size := case when not p_attending then 0 when clean_companion is null then 1 else 2 end;
  calculated_drinkers := case when not p_attending then 0 else (p_primary_drinks::integer + case when clean_companion is not null then p_companion_drinks::integer else 0 end) end;
  insert into public.guests(event_id,name,companion_name,party_size,is_attending,drinks,drinkers_count,brings_own_drink)
  values(event_record.id,clean_name,clean_companion,calculated_party_size,p_attending,calculated_drinkers > 0,calculated_drinkers,p_attending and calculated_drinkers < calculated_party_size and p_brings_own_drink)
  returning id into new_guest_id;
  return new_guest_id;
exception when unique_violation then raise exception 'already_registered';
end;
$$;
revoke all on function public.submit_general_registration(uuid,text,boolean,text,boolean,boolean,boolean) from public, anon, authenticated;
grant execute on function public.submit_general_registration(uuid,text,boolean,text,boolean,boolean,boolean) to service_role;
