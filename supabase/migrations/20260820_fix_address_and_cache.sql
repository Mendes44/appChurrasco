-- Execute uma vez no SQL Editor do Supabase.
-- O script pode ser executado novamente sem duplicar colunas.
alter table public.events add column if not exists address text;
alter table public.events add column if not exists status text not null default 'active';
alter table public.events add column if not exists updated_at timestamptz not null default now();
alter table public.invitations add column if not exists revoked_at timestamptz;
alter table public.guests add column if not exists updated_at timestamptz not null default now();

grant select, insert, update, delete on public.events to service_role;
grant select, insert, update, delete on public.invitations to service_role;
grant select, insert, update, delete on public.guests to service_role;

-- Solicita ao PostgREST que reconheça as novas colunas imediatamente.
notify pgrst, 'reload schema';
