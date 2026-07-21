-- Integração Pluggy (Open Finance): tabelas de vínculo + flag de origem.
--
-- Princípio: os dados sincronizados caem no domínio financeiro EXISTENTE
-- (finance_accounts / finance_credit_cards / finance_transactions). Estas
-- tabelas só guardam o vínculo com a Pluggy para permitir re-sync, dedup,
-- reconexão e exclusão (LGPD).
--
--   pluggy_items    = uma conexão bancária (Item) do usuário.
--   pluggy_accounts = vínculo entre uma conta/cartão da Pluggy e a linha
--                     finance_accounts/finance_credit_cards correspondente.
--
-- Escrita é exclusiva do service_role (backfill/webhook); o dono só LÊ suas
-- próprias linhas via RLS. Idempotente (safe re-run).

-- Origem da conta/cartão: MANUAL (criado pelo usuário) ou PLUGGY (sincronizado).
alter table public.finance_accounts
  add column if not exists source text not null default 'MANUAL';
alter table public.finance_credit_cards
  add column if not exists source text not null default 'MANUAL';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'finance_accounts_source_check'
  ) then
    alter table public.finance_accounts
      add constraint finance_accounts_source_check check (source in ('MANUAL', 'PLUGGY'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'finance_credit_cards_source_check'
  ) then
    alter table public.finance_credit_cards
      add constraint finance_credit_cards_source_check check (source in ('MANUAL', 'PLUGGY'));
  end if;
end $$;

create table if not exists public.pluggy_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Id do Item na Pluggy (âncora de todo webhook: item/* e transactions/*).
  pluggy_item_id uuid not null unique,
  connector_id integer,
  connector_name text,
  connector_image_url text,
  status text,
  execution_status text,
  consent_expires_at timestamptz,
  last_synced_at timestamptz,
  pluggy_created_at timestamptz,
  pluggy_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pluggy_items_user_id_idx on public.pluggy_items (user_id);

create table if not exists public.pluggy_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pluggy_item_id uuid not null
    references public.pluggy_items(pluggy_item_id) on delete cascade,
  pluggy_account_id uuid not null unique,
  pluggy_type text,
  pluggy_subtype text,
  finance_account_id uuid
    references public.finance_accounts(id) on delete set null,
  finance_credit_card_id uuid
    references public.finance_credit_cards(id) on delete set null,
  last_balance numeric,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Uma conta Pluggy aponta para EXATAMENTE uma linha (conta OU cartão).
  constraint pluggy_accounts_one_target check (
    num_nonnulls(finance_account_id, finance_credit_card_id) = 1
  )
);

create index if not exists pluggy_accounts_user_id_idx on public.pluggy_accounts (user_id);
create index if not exists pluggy_accounts_item_idx on public.pluggy_accounts (pluggy_item_id);

alter table public.pluggy_items enable row level security;
alter table public.pluggy_accounts enable row level security;

-- Dono lê suas próprias conexões. Escrita (insert/update/delete) é feita só pelo
-- service_role no backend (backfill/webhook), que ignora RLS — por isso não há
-- policy de insert/update/delete: o usuário nunca escreve direto nestas tabelas.
drop policy if exists pluggy_items_select_own on public.pluggy_items;
create policy pluggy_items_select_own on public.pluggy_items
  for select using (user_id = auth.uid());

drop policy if exists pluggy_accounts_select_own on public.pluggy_accounts;
create policy pluggy_accounts_select_own on public.pluggy_accounts
  for select using (user_id = auth.uid());
