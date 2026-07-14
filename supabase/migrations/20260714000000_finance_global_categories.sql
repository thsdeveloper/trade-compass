-- Catálogo global de categorias (compartilhado entre todos os usuários),
-- com hierarquia mãe/filha. Escrita apenas via service_role (CRUD admin futuro).
-- Aplicada no projeto remoto em 2026-07-14 via MCP (create_finance_global_categories
-- + seed_finance_global_categories).

create table public.finance_global_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.finance_global_categories(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  type text not null check (type in ('DESPESA', 'RECEITA')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_global_categories is 'Catálogo global de categorias (compartilhado entre todos os usuários), com hierarquia mãe/filha';

create index finance_global_categories_parent_id_idx
  on public.finance_global_categories (parent_id);

create unique index finance_global_categories_unique_name_per_parent
  on public.finance_global_categories (name, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.finance_global_categories enable row level security;

create policy "Authenticated users can read global categories"
  on public.finance_global_categories
  for select
  to authenticated
  using (true);
