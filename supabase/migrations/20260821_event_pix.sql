-- Dados de pagamento configuráveis para cada churrasco.
alter table public.events
add column if not exists pix_key text;

alter table public.events
add column if not exists pix_holder text;
