-- Observações opcionais ajudam a documentar despesas sem expor dados no convite.
alter table public.expenses
add column if not exists notes text;

