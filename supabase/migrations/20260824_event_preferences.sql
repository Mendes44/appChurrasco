-- Preferências de compra e consumo configuráveis por evento.
alter table public.events
add column if not exists beer_liters_per_drinker numeric(4,2) not null default 1.50
check (beer_liters_per_drinker between 0.10 and 5.00);

alter table public.events
add column if not exists shopping_checked text[] not null default '{}';
