-- Execute este arquivo uma vez no SQL Editor do Supabase.
create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  event_date timestamptz not null,
  invite_token uuid not null unique default gen_random_uuid(),
  grams_per_person integer not null default 350 check (grams_per_person between 200 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name citext not null check (char_length(trim(name::text)) between 2 and 80),
  normalized_name text generated always as (lower(regexp_replace(trim(name::text), '\s+', ' ', 'g'))) stored,
  is_attending boolean not null,
  drinks boolean not null default false,
  brings_own_drink boolean not null default false,
  created_at timestamptz not null default now(),
  constraint one_answer_per_name unique (event_id, normalized_name)
);

-- Contador sem dados pessoais usado para limitar abuso no formulário público.
create table if not exists public.confirmation_attempts (
  request_key text primary key,
  attempts integer not null default 1,
  expires_at timestamptz not null
);

create index if not exists events_owner_idx on public.events(owner_id);
create index if not exists guests_event_idx on public.guests(event_id);
alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.confirmation_attempts enable row level security;

-- Como a exposição automática está desativada, os privilégios são explícitos.
-- Usuários autenticados ainda dependem das políticas RLS definidas abaixo.
grant usage on schema public to authenticated, service_role;
grant select on public.events, public.guests to authenticated;
grant select, insert, update, delete on public.events, public.guests to service_role;
grant select, insert, update, delete on public.confirmation_attempts to service_role;

-- Recriar as políticas torna o script seguro para projetos que usaram a versão anterior.
drop policy if exists "owners manage events" on public.events;
drop policy if exists "owners read guests" on public.guests;
drop policy if exists "owners update guests" on public.guests;
drop policy if exists "owners delete guests" on public.guests;

-- O banco limita cada usuário às próprias linhas. A lista de administradores é
-- validada novamente no servidor pela variável ADMIN_EMAIL.
create policy "owners manage events" on public.events for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
create policy "owners read guests" on public.guests for select
using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
create policy "owners update guests" on public.guests for update
using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
create policy "owners delete guests" on public.guests for delete
using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

-- Chamada apenas pelo servidor: permite no máximo 10 tentativas por IP/convite/hora.
create or replace function public.allow_confirmation(p_key text)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_attempts integer;
begin
  delete from public.confirmation_attempts where expires_at < now();
  insert into public.confirmation_attempts(request_key, attempts, expires_at)
  values (p_key, 1, now() + interval '1 hour')
  on conflict (request_key) do update set attempts = confirmation_attempts.attempts + 1
  returning attempts into current_attempts;
  return current_attempts <= 10;
end;
$$;
revoke all on function public.allow_confirmation(text) from public, anon, authenticated;
grant execute on function public.allow_confirmation(text) to service_role;

-- A evolução para convites individuais fica isolada em uma migração idempotente.
-- Execute também: supabase/migrations/20260820_personalized_invites.sql

-- Crie o primeiro evento depois de entrar uma vez com Google e copiar seu user id.
-- insert into public.events(owner_id,title,event_date)
-- values ('SEU_AUTH_USER_ID','Churrasco de sábado','2026-08-23 13:00:00-03');
