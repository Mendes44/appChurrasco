-- Evolução operacional: prazo, fechamento, despesas detalhadas, compras extras e auditoria.
alter table public.events add column if not exists rsvp_deadline timestamptz;
alter table public.events add column if not exists closed_at timestamptz;

alter table public.expenses add column if not exists payer_name text;
alter table public.expenses add column if not exists payment_method text;
alter table public.expenses add column if not exists purchased_at date;
alter table public.expenses add column if not exists included_in_split boolean not null default true;
alter table public.expenses add column if not exists expense_group text;

create table if not exists public.event_shopping_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  quantity text not null default '',
  checked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists event_shopping_items_event_idx on public.event_shopping_items(event_id);
alter table public.event_shopping_items enable row level security;
grant select on public.event_shopping_items to authenticated;
grant select, insert, update, delete on public.event_shopping_items to service_role;
drop policy if exists "owners read custom shopping" on public.event_shopping_items;
create policy "owners read custom shopping" on public.event_shopping_items for select
using (exists(select 1 from public.events where events.id=event_shopping_items.event_id and events.owner_id=auth.uid()));

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  actor_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_event_idx on public.audit_logs(event_id,created_at desc);
alter table public.audit_logs enable row level security;
grant select on public.audit_logs to authenticated;
grant select, insert on public.audit_logs to service_role;
drop policy if exists "owners read audit logs" on public.audit_logs;
create policy "owners read audit logs" on public.audit_logs for select
using (exists(select 1 from public.events where events.id=audit_logs.event_id and events.owner_id=auth.uid()));
