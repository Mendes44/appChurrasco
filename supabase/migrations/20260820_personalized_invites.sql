-- Convites individuais: cada token identifica um titular e aceita uma resposta.
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_name citext not null check (char_length(trim(guest_name::text)) between 2 and 80),
  token uuid not null unique default gen_random_uuid(),
  max_party_size integer not null default 2 check (max_party_size between 1 and 2),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, guest_name)
);

alter table public.guests add column if not exists invitation_id uuid references public.invitations(id) on delete set null;
alter table public.guests add column if not exists companion_name text;
alter table public.guests add column if not exists party_size integer not null default 1;
alter table public.guests add column if not exists drinkers_count integer not null default 0;

create unique index if not exists guests_invitation_unique_idx on public.guests(invitation_id) where invitation_id is not null;
create index if not exists invitations_event_idx on public.invitations(event_id);
alter table public.invitations enable row level security;

grant select on public.invitations to authenticated;
grant select, insert, update, delete on public.invitations to service_role;

drop policy if exists "owners read invitations" on public.invitations;
create policy "owners read invitations" on public.invitations for select
using (
  exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
);

-- A trava FOR UPDATE evita duas respostas simultâneas para o mesmo convite.
create or replace function public.submit_personal_invitation(
  p_token uuid,
  p_attending boolean,
  p_companion_name text,
  p_primary_drinks boolean,
  p_companion_drinks boolean,
  p_brings_own_drink boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_record public.invitations%rowtype;
  new_guest_id uuid;
  clean_companion text;
  calculated_party_size integer;
  calculated_drinkers integer;
begin
  select * into invitation_record
  from public.invitations
  where token = p_token
  for update;

  if not found then raise exception 'invalid_invitation'; end if;
  if invitation_record.responded_at is not null then raise exception 'already_answered'; end if;

  clean_companion := nullif(trim(regexp_replace(coalesce(p_companion_name, ''), '\s+', ' ', 'g')), '');
  if clean_companion is not null and (char_length(clean_companion) < 2 or char_length(clean_companion) > 80) then
    raise exception 'invalid_companion';
  end if;

  calculated_party_size := case when not p_attending then 0 when clean_companion is null then 1 else 2 end;
  calculated_drinkers := case when not p_attending then 0 else (p_primary_drinks::integer + case when clean_companion is not null then p_companion_drinks::integer else 0 end) end;

  insert into public.guests (
    event_id, invitation_id, name, companion_name, party_size,
    is_attending, drinks, drinkers_count, brings_own_drink
  ) values (
    invitation_record.event_id, invitation_record.id, invitation_record.guest_name,
    clean_companion, calculated_party_size, p_attending,
    calculated_drinkers > 0, calculated_drinkers,
    p_attending and calculated_drinkers < calculated_party_size and p_brings_own_drink
  ) returning id into new_guest_id;

  update public.invitations set responded_at = now() where id = invitation_record.id;
  return new_guest_id;
end;
$$;

revoke all on function public.submit_personal_invitation(uuid,boolean,text,boolean,boolean,boolean) from public, anon, authenticated;
grant execute on function public.submit_personal_invitation(uuid,boolean,text,boolean,boolean,boolean) to service_role;
