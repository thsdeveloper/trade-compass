-- Preferências do lembrete diário de vencimentos por e-mail.
-- O usuário liga/desliga o e-mail e escolhe a hora local do envio; o job diário
-- (apps/api, scheduled machine na Fly) usa estas colunas para decidir a quem e
-- quando enviar. daily_email_last_sent_on garante no máximo 1 envio por dia
-- local (idempotência) e permite catch-up quando a hora exata é perdida.

alter table public.profiles
  add column if not exists daily_email_enabled boolean not null default false;

alter table public.profiles
  add column if not exists daily_email_hour smallint not null default 8
  constraint profiles_daily_email_hour_range check (daily_email_hour between 0 and 23);

alter table public.profiles
  add column if not exists timezone text not null default 'America/Sao_Paulo';

alter table public.profiles
  add column if not exists daily_email_last_sent_on date;

comment on column public.profiles.daily_email_enabled is
  'Habilita o e-mail diário de vencimentos (atrasadas + vencem amanhã).';
comment on column public.profiles.daily_email_hour is
  'Hora local (0-23) em que o lembrete diário deve ser enviado.';
comment on column public.profiles.timezone is
  'Fuso IANA do usuário; base para calcular data/hora local do lembrete.';
comment on column public.profiles.daily_email_last_sent_on is
  'Data local (YYYY-MM-DD) do último lembrete enviado; evita reenvio no mesmo dia e permite catch-up. Escrito apenas pelo cron (service role).';

-- A varredura horária do cron filtra por daily_email_enabled = true e, na prática,
-- poucos usuários estarão habilitados: índice parcial mantém o scan barato.
create index if not exists profiles_daily_email_enabled_idx
  on public.profiles (daily_email_enabled)
  where daily_email_enabled = true;
