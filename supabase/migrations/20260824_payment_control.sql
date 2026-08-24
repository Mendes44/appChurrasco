-- Controle de pagamento do rateio por cadastro de convidado.
-- NULL significa pendente; uma data preenchida registra quando o pagamento foi marcado.
alter table public.guests
add column if not exists paid_at timestamptz;
