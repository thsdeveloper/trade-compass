-- Renda mensal declarada pelo usuário no onboarding (BRL).
-- Base para o orçamento 50/30/20 e recursos futuros.
alter table public.profiles
  add column if not exists monthly_income numeric(12,2)
  constraint profiles_monthly_income_non_negative
  check (monthly_income is null or monthly_income >= 0);

comment on column public.profiles.monthly_income is
  'Renda mensal declarada pelo usuário no onboarding (BRL). Base para o orçamento 50/30/20 e recursos futuros.';
