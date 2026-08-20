-- Extensões usadas para UUIDs e comparação de nomes sem diferenciar maiúsculas.
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Eventos pertencem ao usuário autenticado que organiza o churrasco.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  event_date timestamptz not null,
  invite_token uuid not null unique default gen_random_uuid(),
  grams_per_person integer not null default 350 check (grams_per_person between 200 and 1000),
  created_at timestamptz not null default now()
);

-- Respostas públicas guardam apenas o mínimo necessário para o planejamento.
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name citext not null check (char_length(trim(name::text)) between 2 and 80),
  normalized_name text generated always as (lower(regexp_replace(trim(name::text), '\s+', ' ', 'g'))) stored,
  is_attending boolean not null,
  drink_type text not null check (drink_type in ('none', 'draft_beer', 'can', 'bottle')),
  created_at timestamptz not null default now(),
  constraint one_answer_per_name unique (event_id, normalized_name)
);

-- Índices aceleram o painel sem expor a lista publicamente.
create index if not exists events_owner_idx on public.events(owner_id);
create index if not exists guests_event_idx on public.guests(event_id);
alter table public.events enable row level security;
alter table public.guests enable row level security;

-- Somente o organizador autenticado acessa e altera seus eventos.
create policy "owners manage events" on public.events for all
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Somente o organizador lê, altera ou remove respostas no painel.
create policy "owners read guests" on public.guests for select
using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
create policy "owners update guests" on public.guests for update
using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
create policy "owners delete guests" on public.guests for delete
using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

-- Não há INSERT público direto. Uma Edge Function deve validar token, rate
-- limit e CAPTCHA antes de inserir usando a chave exclusiva do servidor.
