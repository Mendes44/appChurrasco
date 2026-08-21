-- Financeiro do evento, telefone dos convidados e comprovantes privados.
-- Execute este arquivo uma vez no SQL Editor antes de publicar o novo código.

alter table public.guests add column if not exists phone text;
-- NULL significa que a presença real ainda não foi conferida; nesse caso o
-- financeiro usa provisoriamente a confirmação do convite.
alter table public.guests add column if not exists attended boolean;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 2 and 120),
  category text not null check (category in ('general', 'beer')),
  amount_cents integer not null check (amount_cents > 0),
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_event_idx on public.expenses(event_id);
alter table public.expenses enable row level security;
grant select on public.expenses to authenticated;
grant select, insert, update, delete on public.expenses to service_role;

drop policy if exists "owners read expenses" on public.expenses;
create policy "owners read expenses" on public.expenses for select
using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

-- Bucket privado: arquivos são acessados somente por URLs assinadas e temporárias.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152,
allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Nova versão atômica da confirmação individual, agora incluindo telefone.
create or replace function public.submit_personal_invitation(
  p_token uuid, p_attending boolean, p_companion_name text,
  p_primary_drinks boolean, p_companion_drinks boolean,
  p_brings_own_drink boolean, p_phone text
) returns uuid language plpgsql security definer set search_path = public as $$
declare invitation_record public.invitations%rowtype; new_guest_id uuid;
clean_companion text; clean_phone text; calculated_party_size integer; calculated_drinkers integer;
begin
  select * into invitation_record from public.invitations where token = p_token for update;
  if not found then raise exception 'invalid_invitation'; end if;
  if invitation_record.responded_at is not null then raise exception 'already_answered'; end if;
  clean_companion := nullif(trim(regexp_replace(coalesce(p_companion_name, ''), '\s+', ' ', 'g')), '');
  clean_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if char_length(clean_phone) not between 10 and 13 then raise exception 'invalid_phone'; end if;
  if clean_companion is not null and char_length(clean_companion) not between 2 and 80 then raise exception 'invalid_companion'; end if;
  calculated_party_size := case when not p_attending then 0 when clean_companion is null then 1 else 2 end;
  calculated_drinkers := case when not p_attending then 0 else (p_primary_drinks::integer + case when clean_companion is not null then p_companion_drinks::integer else 0 end) end;
  insert into public.guests(event_id,invitation_id,name,phone,companion_name,party_size,is_attending,drinks,drinkers_count,brings_own_drink)
  values(invitation_record.event_id,invitation_record.id,invitation_record.guest_name,clean_phone,clean_companion,calculated_party_size,p_attending,calculated_drinkers > 0,calculated_drinkers,p_attending and calculated_drinkers < calculated_party_size and p_brings_own_drink)
  returning id into new_guest_id;
  update public.invitations set responded_at = now() where id = invitation_record.id;
  return new_guest_id;
end; $$;
revoke all on function public.submit_personal_invitation(uuid,boolean,text,boolean,boolean,boolean,text) from public, anon, authenticated;
grant execute on function public.submit_personal_invitation(uuid,boolean,text,boolean,boolean,boolean,text) to service_role;

-- Nova versão do cadastro pelo link geral, também com telefone obrigatório.
create or replace function public.submit_general_registration(
  p_event_token uuid, p_name text, p_attending boolean, p_companion_name text,
  p_primary_drinks boolean, p_companion_drinks boolean,
  p_brings_own_drink boolean, p_phone text
) returns uuid language plpgsql security definer set search_path = public as $$
declare event_record public.events%rowtype; new_guest_id uuid; clean_name text;
clean_companion text; clean_phone text; calculated_party_size integer; calculated_drinkers integer;
begin
  select * into event_record from public.events where invite_token = p_event_token and status = 'active';
  if not found then raise exception 'invalid_event'; end if;
  clean_name := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  clean_companion := nullif(trim(regexp_replace(coalesce(p_companion_name, ''), '\s+', ' ', 'g')), '');
  clean_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if char_length(clean_name) not between 2 and 80 then raise exception 'invalid_name'; end if;
  if char_length(clean_phone) not between 10 and 13 then raise exception 'invalid_phone'; end if;
  if clean_companion is not null and char_length(clean_companion) not between 2 and 80 then raise exception 'invalid_companion'; end if;
  calculated_party_size := case when not p_attending then 0 when clean_companion is null then 1 else 2 end;
  calculated_drinkers := case when not p_attending then 0 else (p_primary_drinks::integer + case when clean_companion is not null then p_companion_drinks::integer else 0 end) end;
  insert into public.guests(event_id,name,phone,companion_name,party_size,is_attending,drinks,drinkers_count,brings_own_drink)
  values(event_record.id,clean_name,clean_phone,clean_companion,calculated_party_size,p_attending,calculated_drinkers > 0,calculated_drinkers,p_attending and calculated_drinkers < calculated_party_size and p_brings_own_drink)
  returning id into new_guest_id;
  return new_guest_id;
exception when unique_violation then raise exception 'already_registered';
end; $$;
revoke all on function public.submit_general_registration(uuid,text,boolean,text,boolean,boolean,boolean,text) from public, anon, authenticated;
grant execute on function public.submit_general_registration(uuid,text,boolean,text,boolean,boolean,boolean,text) to service_role;
