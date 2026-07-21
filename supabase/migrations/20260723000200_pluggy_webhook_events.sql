-- Durabilidade + idempotência dos webhooks da Pluggy.
--
-- A Pluggy NÃO assina os webhooks (sem HMAC): a autenticidade vem de (a) header
-- secreto estático, (b) IP de origem e (c) re-fetch GET /items/{id}. A entrega
-- pode repetir até 9x — por isso event_id é PK (dedup natural via ON CONFLICT).
--
-- Fluxo: a rota pública POST /webhooks/pluggy só INSERE o evento aqui e responde
-- 200 em <5s; um dreno (drainPendingWebhookEvents) processa depois. Como a linha
-- é persistida ANTES do 200, um suspend do Fly no meio do processamento não perde
-- o evento — ele fica PENDING/PROCESSING e é retomado no próximo dreno.
--
-- Só o service_role acessa (sem policies). Idempotente (safe re-run).

create table if not exists public.pluggy_webhook_events (
  event_id text primary key,
  event text not null,
  item_id text,
  account_id text,
  client_user_id text,
  payload jsonb,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'PROCESSING', 'DONE', 'ERROR')),
  attempts integer not null default 0,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create index if not exists pluggy_webhook_events_status_idx
  on public.pluggy_webhook_events (status);

alter table public.pluggy_webhook_events enable row level security;
-- Sem policies: tabela interna, acessada apenas pelo service_role.
