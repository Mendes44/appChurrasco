-- Rateio por despesa e cadastro administrativo de convidados posteriores.
alter table public.expenses add column if not exists split_mode text;
update public.expenses set split_mode=category where split_mode is null;
alter table public.expenses alter column split_mode set default 'general';
alter table public.expenses alter column split_mode set not null;
alter table public.expenses drop constraint if exists expenses_split_mode_check;
alter table public.expenses add constraint expenses_split_mode_check
check (split_mode in ('general','beer','selected'));

create table if not exists public.expense_participants (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  primary key (expense_id,guest_id)
);
create index if not exists expense_participants_guest_idx on public.expense_participants(guest_id);
alter table public.expense_participants enable row level security;
grant select on public.expense_participants to authenticated;
grant select,insert,update,delete on public.expense_participants to service_role;
drop policy if exists "owners read expense participants" on public.expense_participants;
create policy "owners read expense participants" on public.expense_participants for select
using (exists(
  select 1 from public.expenses x join public.events e on e.id=x.event_id
  where x.id=expense_id and e.owner_id=auth.uid()
));

alter table public.guests add column if not exists added_by_admin boolean not null default false;
alter table public.guests add column if not exists participation_notes text;
notify pgrst, 'reload schema';
